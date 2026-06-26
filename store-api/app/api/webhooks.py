"""Provider webhooks — `POST /webhook/stripe`, `POST /webhook/shippo`.

Signature-verified, JWT-LESS provider callbacks (mirror Grovli's webhook
exclusion from the auth deps — webhooks authenticate by signature, never by a
bearer JWT). Fail-closed: a missing webhook secret returns 503 and an unsigned
or bad-signature payload returns 400 — we NEVER apply an unverified event.

Stripe `payment_intent.succeeded` reconciles the matching order to PAID and
atomically COMMITS inventory (single aggregation-pipeline decrement with an
`inventory_version` filter; an oversell/version conflict emits a WARNING +
`citigrove.store.inventory.oversell_blocked` and is surfaced, never silently
swallowed). `charge.refunded` flips the order to REFUNDED / PARTIALLY_REFUNDED
and restores inventory. Shippo `track_updated` writes server-owned
`tracking_number` / `tracking_url` / `status`. All reconciliation is idempotent
on the provider event id / current order state so a redelivered webhook is a
no-op.
"""
from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Any

from fastapi import APIRouter, Request, Response

from app.core.config import settings
from app.core.database.db import async_db
from app.core.logging import _logfmt, _user_tag
from app.core.observability import record
from app.core.timeutils import utc_now
from app.models.common import OrderStatus, PaymentState
from app.services import inventory

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhook", tags=["webhooks"])

# Shippo tracking-status → terminal order status mapping. Anything else (e.g.
# "PRE_TRANSIT", "UNKNOWN") leaves the order status untouched but still records
# the latest tracking number/url.
_SHIPPO_STATUS_TO_ORDER = {
    "TRANSIT": OrderStatus.SHIPPED.value,
    "DELIVERED": OrderStatus.DELIVERED.value,
    "RETURNED": OrderStatus.SHIPPED.value,
    "FAILURE": OrderStatus.SHIPPED.value,
}


# ────────────────────────────────────────────────────────────────────
# Stripe — POST /webhook/stripe
# ────────────────────────────────────────────────────────────────────
@router.post("/stripe")
async def stripe_webhook(request: Request) -> Response:
    """Verify the Stripe signature, then reconcile the order (idempotent).

    Fail-closed: `stripe_webhook_secret` unset → 503 (never accept unsigned).
    Bad signature → 400. Handles `payment_intent.succeeded` (→ PAID + inventory
    commit) and `charge.refunded` (→ REFUNDED/PARTIALLY_REFUNDED + restore).
    Always returns 200 on a verified-but-unhandled event so Stripe stops
    redelivering.
    """
    if not settings.stripe_webhook_secret:
        logger.error("%s", _logfmt({"event": "store.webhook.stripe.no_secret", "outcome": "fail_closed"}))
        return Response(content='{"detail":"webhook not configured"}', status_code=503,
                        media_type="application/json")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature") or request.headers.get("Stripe-Signature")
    if not sig_header:
        logger.warning("%s", _logfmt({"event": "store.webhook.stripe.missing_signature"}))
        return Response(content='{"detail":"missing signature"}', status_code=400,
                        media_type="application/json")

    try:
        import stripe  # local import: only the webhook path needs the SDK.

        event = stripe.Webhook.construct_event(payload, sig_header, settings.stripe_webhook_secret)
    except Exception as exc:  # noqa: BLE001 — bad signature / malformed payload.
        logger.warning(
            "%s",
            _logfmt({"event": "store.webhook.stripe.bad_signature", "error": str(exc)}),
        )
        return Response(content='{"detail":"signature verification failed"}', status_code=400,
                        media_type="application/json")

    event_type = _event_get(event, "type") or ""
    event_id = _event_get(event, "id") or ""
    data_object = _event_get(_event_get(event, "data") or {}, "object") or {}

    logger.info(
        "%s",
        _logfmt({"event": "store.webhook.stripe.received", "stripe_event": event_type, "stripe_event_id": event_id}),
    )

    if event_type == "payment_intent.succeeded":
        await _apply_payment_succeeded(data_object, event_id)
    elif event_type == "charge.refunded":
        await _apply_charge_refunded(data_object, event_id)
    else:
        logger.info(
            "%s",
            _logfmt({"event": "store.webhook.stripe.unhandled", "stripe_event": event_type}),
        )

    return Response(content='{"received":true}', status_code=200, media_type="application/json")


async def _apply_payment_succeeded(pi: dict[str, Any], event_id: str) -> None:
    """Reconcile the order for a settled PaymentIntent → PAID + commit inventory.

    Idempotent: an order already PAID (or refunded) short-circuits — a
    redelivered `payment_intent.succeeded` neither double-commits inventory nor
    re-flips state. Inventory commit is the atomic version-filter decrement; an
    oversell/version conflict is a WARNING-paired anomaly (the charge already
    settled, so we record but do NOT roll back state — the discrepancy is paged
    on the `oversell_blocked` counter for operator reconciliation).
    """
    payment_intent_id = pi.get("id")
    if not payment_intent_id:
        logger.warning("%s", _logfmt({"event": "store.webhook.stripe.pi_no_id", "stripe_event_id": event_id}))
        return

    order = await async_db.store_orders.find_one({"paymentIntentId": payment_intent_id})
    if not order:
        # The order create persists `paymentIntentId` before the client confirms,
        # so a missing order means an out-of-band/foreign PI — record, don't apply.
        logger.warning(
            "%s",
            _logfmt({
                "event": "store.webhook.stripe.order_not_found",
                "payment_intent_id": payment_intent_id,
                "stripe_event_id": event_id,
            }),
        )
        return

    current_status = order.get("status")
    if current_status in {
        OrderStatus.PAID.value,
        OrderStatus.FULFILLING.value,
        OrderStatus.SHIPPED.value,
        OrderStatus.DELIVERED.value,
        OrderStatus.REFUNDED.value,
        OrderStatus.PARTIALLY_REFUNDED.value,
    }:
        # Already reconciled — redelivered webhook is a no-op (idempotent).
        logger.info(
            "%s",
            _logfmt({
                "event": "store.webhook.stripe.already_reconciled",
                "order_id": str(order.get("_id")),
                "status": current_status,
            }),
        )
        return

    uid = order.get("userId")

    # Commit inventory atomically per line item BEFORE flipping to PAID. The
    # decrement is the version-filter aggregation-pipeline update; a conflict is
    # surfaced (WARNING + counter) but does not block the state transition — the
    # money already moved, so the order must reach PAID for fulfilment.
    await _commit_inventory(order, uid)

    await async_db.store_orders.update_one(
        {"_id": order["_id"], "status": current_status},
        {"$set": {
            "status": OrderStatus.PAID.value,
            "payment_state": PaymentState.SUCCEEDED.value,
            "updated_at": utc_now(),
        }},
    )
    record("citigrove.store.order.settled", 1)
    logger.info(
        "%s",
        _logfmt({
            "event": "store.order.settled",
            "user_tag": _user_tag(uid),
            "order_id": str(order.get("_id")),
            "payment_intent_id": payment_intent_id,
            "total_cents": int(order.get("total_cents") or 0),
        }),
    )


async def _commit_inventory(order: dict[str, Any], uid: Any) -> None:
    """Atomically decrement stock for each line item; surface conflicts.

    `inventory.decrement` performs the single aggregation-pipeline update with
    an `inventory_version` filter (oversell-safe) and raises on an unrecoverable
    conflict/out-of-stock. We catch per-item so a conflict on one line is logged
    + counted (WARNING-paired) without aborting the others — the settled charge
    means the order proceeds and the discrepancy is reconciled by an operator off
    the `oversell_blocked` signal.
    """
    for item in order.get("items") or []:
        product_id = item.get("product_id")
        variant_sku = item.get("variant_sku") or item.get("sku")
        qty = int(item.get("quantity") or 0)
        if not product_id or not variant_sku or qty <= 0:
            continue
        try:
            await inventory.decrement(product_id, variant_sku, qty, expected_version=None)
        except Exception as exc:  # noqa: BLE001 — surface, do not silently swallow.
            record("citigrove.store.inventory.oversell_blocked", 1, phase="webhook_commit")
            logger.warning(
                "%s",
                _logfmt({
                    "event": "store.inventory.conflict",
                    "phase": "webhook_commit",
                    "user_tag": _user_tag(uid),
                    "order_id": str(order.get("_id")),
                    "product_id": str(product_id),
                    "variant_sku": str(variant_sku),
                    "qty": qty,
                    "error": str(exc),
                }),
            )


async def _apply_charge_refunded(charge: dict[str, Any], event_id: str) -> None:
    """Reconcile a refunded charge → REFUNDED / PARTIALLY_REFUNDED + restore stock.

    Stripe's `charge.refunded` carries `payment_intent`, `amount` (charged) and
    `amount_refunded` (cumulative). Full refund (amount_refunded >= amount) →
    REFUNDED + restore inventory; partial → PARTIALLY_REFUNDED. Idempotent on the
    persisted `refunded_cents` (a redelivery for the same cumulative amount is a
    no-op, and inventory is restored only on the full-refund transition).
    """
    payment_intent_id = charge.get("payment_intent")
    if not payment_intent_id:
        logger.warning("%s", _logfmt({"event": "store.webhook.stripe.refund_no_pi", "stripe_event_id": event_id}))
        return

    order = await async_db.store_orders.find_one({"paymentIntentId": payment_intent_id})
    if not order:
        logger.warning(
            "%s",
            _logfmt({
                "event": "store.webhook.stripe.refund_order_not_found",
                "payment_intent_id": payment_intent_id,
                "stripe_event_id": event_id,
            }),
        )
        return

    amount_charged = int(charge.get("amount") or order.get("total_cents") or 0)
    amount_refunded = int(charge.get("amount_refunded") or 0)
    already_refunded = int(order.get("refunded_cents") or 0)

    if amount_refunded <= already_refunded:
        logger.info(
            "%s",
            _logfmt({
                "event": "store.webhook.stripe.refund_noop",
                "order_id": str(order.get("_id")),
                "refunded_cents": already_refunded,
            }),
        )
        return

    is_full = amount_refunded >= amount_charged and amount_charged > 0
    new_status = OrderStatus.REFUNDED.value if is_full else OrderStatus.PARTIALLY_REFUNDED.value
    uid = order.get("userId")

    await async_db.store_orders.update_one(
        {"_id": order["_id"]},
        {"$set": {
            "status": new_status,
            "payment_state": PaymentState.REFUNDED.value if is_full else order.get("payment_state"),
            "refunded_cents": amount_refunded,
            "updated_at": utc_now(),
        }},
    )

    # Restore inventory only on a FULL refund — a partial refund does not return
    # goods to stock (the order still ships). The restore is the inverse atomic
    # version-bumping update.
    if is_full:
        await _restore_inventory(order, uid)

    record("citigrove.store.order.refunded", 1)
    logger.info(
        "%s",
        _logfmt({
            "event": "store.order.refunded",
            "user_tag": _user_tag(uid),
            "order_id": str(order.get("_id")),
            "payment_intent_id": payment_intent_id,
            "refunded_cents": amount_refunded,
            "full": is_full,
        }),
    )


async def _restore_inventory(order: dict[str, Any], uid: Any) -> None:
    """Inverse of `_commit_inventory` — restore each line item's stock (best-effort)."""
    for item in order.get("items") or []:
        product_id = item.get("product_id")
        variant_sku = item.get("variant_sku") or item.get("sku")
        qty = int(item.get("quantity") or 0)
        if not product_id or not variant_sku or qty <= 0:
            continue
        try:
            await inventory.restore(product_id, variant_sku, qty)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "%s",
                _logfmt({
                    "event": "store.inventory.restore_failed",
                    "user_tag": _user_tag(uid),
                    "order_id": str(order.get("_id")),
                    "product_id": str(product_id),
                    "variant_sku": str(variant_sku),
                    "qty": qty,
                    "error": str(exc),
                }),
            )


# ────────────────────────────────────────────────────────────────────
# Shippo — POST /webhook/shippo
# ────────────────────────────────────────────────────────────────────
@router.post("/shippo")
async def shippo_webhook(request: Request) -> Response:
    """Verify the Shippo signature, then apply `track_updated` to the order.

    Fail-closed: `shippo_webhook_secret` unset → 503. Shippo signs the raw body
    with HMAC-SHA256 (hex digest) delivered in `X-Shippo-Signature`; a constant-
    time compare rejects a bad signature with 400. `track_updated` writes
    server-owned `tracking_number` / `tracking_url` and maps the tracking status
    to the order `status`.
    """
    if not settings.shippo_webhook_secret:
        logger.error("%s", _logfmt({"event": "store.webhook.shippo.no_secret", "outcome": "fail_closed"}))
        return Response(content='{"detail":"webhook not configured"}', status_code=503,
                        media_type="application/json")

    payload = await request.body()
    sig_header = (
        request.headers.get("x-shippo-signature")
        or request.headers.get("X-Shippo-Signature")
        or ""
    )
    expected = hmac.new(
        settings.shippo_webhook_secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    if not sig_header or not hmac.compare_digest(sig_header.strip(), expected):
        logger.warning("%s", _logfmt({"event": "store.webhook.shippo.bad_signature"}))
        return Response(content='{"detail":"signature verification failed"}', status_code=400,
                        media_type="application/json")

    try:
        import json

        body = json.loads(payload.decode("utf-8")) if payload else {}
    except Exception as exc:  # noqa: BLE001
        logger.warning("%s", _logfmt({"event": "store.webhook.shippo.bad_body", "error": str(exc)}))
        return Response(content='{"detail":"invalid body"}', status_code=400,
                        media_type="application/json")

    event_name = (body.get("event") or "").strip()
    data = body.get("data") if isinstance(body.get("data"), dict) else body

    logger.info("%s", _logfmt({"event": "store.webhook.shippo.received", "shippo_event": event_name}))

    if event_name == "track_updated":
        await _apply_track_updated(data)
    else:
        logger.info("%s", _logfmt({"event": "store.webhook.shippo.unhandled", "shippo_event": event_name}))

    return Response(content='{"received":true}', status_code=200, media_type="application/json")


async def _apply_track_updated(data: dict[str, Any]) -> None:
    """Write tracking number/url + map tracking status to the order status.

    Locates the order by `tracking_number` (set when the label is bought) or by
    the `metadata.order_id` Shippo carries on the shipment. Idempotent: re-writing
    the same tracking status is harmless; a status that doesn't map leaves the
    order status untouched.
    """
    tracking_number = data.get("tracking_number") or (data.get("tracking_status") or {}).get("tracking_number")
    status_obj = data.get("tracking_status") if isinstance(data.get("tracking_status"), dict) else {}
    tracking_status = (status_obj.get("status") or data.get("status") or "").strip().upper()
    tracking_url = data.get("tracking_url_provider") or data.get("tracking_url")
    metadata = data.get("metadata") if isinstance(data.get("metadata"), str) else None

    query: dict[str, Any]
    if tracking_number:
        query = {"tracking_number": tracking_number}
    elif metadata:
        query = {"_id": metadata}
    else:
        logger.warning("%s", _logfmt({"event": "store.webhook.shippo.no_locator"}))
        return

    order = await async_db.store_orders.find_one(query)
    if not order:
        logger.warning(
            "%s",
            _logfmt({
                "event": "store.webhook.shippo.order_not_found",
                "tracking_number": str(tracking_number or ""),
            }),
        )
        return

    update: dict[str, Any] = {"updated_at": utc_now()}
    if tracking_number:
        update["tracking_number"] = tracking_number
    if tracking_url:
        update["tracking_url"] = tracking_url
    mapped_status = _SHIPPO_STATUS_TO_ORDER.get(tracking_status)
    # Never regress a terminal lifecycle (don't flip DELIVERED back to SHIPPED).
    if mapped_status and order.get("status") not in {
        OrderStatus.DELIVERED.value,
        OrderStatus.REFUNDED.value,
        OrderStatus.PARTIALLY_REFUNDED.value,
        OrderStatus.CANCELLED.value,
    }:
        update["status"] = mapped_status

    await async_db.store_orders.update_one({"_id": order["_id"]}, {"$set": update})
    logger.info(
        "%s",
        _logfmt({
            "event": "store.order.tracking_updated",
            "order_id": str(order.get("_id")),
            "tracking_status": tracking_status,
            "order_status": update.get("status", order.get("status")),
        }),
    )


def _event_get(obj: Any, key: str) -> Any:
    """Read a key from a Stripe SDK event object OR a plain dict (SDK objects
    support both attribute and subscript access; this normalises both shapes so
    the handler works against the real SDK and against a dict in tests)."""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return obj.get(key)
    try:
        return obj[key]
    except (KeyError, TypeError):
        return getattr(obj, key, None)
