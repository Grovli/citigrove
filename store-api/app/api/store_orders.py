"""Store order lifecycle: quote -> create(PaymentIntent) -> settle -> get/mine/refund.

Every monetary value is re-derived server-side; the client supplies only
``sku`` + ``quantity`` + the ship-to address + a per-checkout idempotency nonce.
Settlement is verified against grovli-payments (never a client 'paid' claim) and
the charged amount must match the order total (anti-underpay) before inventory is
decremented and a label is purchased. Orders are owner-scoped by the verified
``sub`` (IDOR-safe).
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.clients import payments_client
from app.core.auth import require_user
from app.core.database.db import async_db
from app.core.logging import (
    AppError,
    AMOUNT_MISMATCH,
    PAYMENT_NOT_SETTLED,
    _logfmt,
    _user_tag,
)
from app.core.observability import record
from app.core.timeutils import utc_now
from app.models.common import OrderStatus, PaymentState
from app.models.orders import Address
from app.services import inventory, pricing

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/store", tags=["store-orders"])

_SETTLED_STATES = {"captured", "succeeded", "paid"}


# ── Request bodies ──────────────────────────────────────────────────────────
class _CartItem(BaseModel):
    sku: str
    quantity: int = Field(ge=1)


class QuoteBody(BaseModel):
    items: list[_CartItem]
    ship_to: Address
    shipping_rate_id: Optional[str] = None
    tip_cents: int = 0


class CreateOrderBody(BaseModel):
    items: list[_CartItem]
    ship_to: Address
    shipping_rate_id: Optional[str] = None
    idempotency_key: str


class SettleApplePayBody(BaseModel):
    payment_data: dict[str, Any]
    instrument_name: Optional[str] = None
    payment_network: Optional[str] = None
    transaction_id: Optional[str] = None


class RefundBody(BaseModel):
    amount_cents: Optional[int] = None
    reason: Optional[str] = None


# ── Helpers ─────────────────────────────────────────────────────────────────
def _bearer(request: Request) -> Optional[str]:
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth and auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


def _serialize_order(doc: dict[str, Any]) -> dict[str, Any]:
    out = dict(doc)
    _id = out.pop("_id", None)
    if _id is not None:
        out["id"] = str(_id)
    # clientSecret is transient — never persisted, never re-served from storage.
    out.pop("clientSecret", None)
    return out


async def _load_owned_order(order_id: str, uid: str) -> dict[str, Any]:
    try:
        oid = ObjectId(order_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Order not found")
    doc = await async_db.store_orders.find_one({"_id": oid})
    if not doc or doc.get("userId") != uid:
        # 404 (not 403) to avoid leaking existence to non-owners (IDOR rule).
        raise HTTPException(status_code=404, detail="Order not found")
    return doc


# ── Routes ──────────────────────────────────────────────────────────────────
@router.post("/quote")
async def quote(body: QuoteBody, request: Request) -> dict[str, Any]:
    """Authoritatively re-price a cart -> OrderQuote (shipping options + tax + total)."""
    uid = require_user(request)
    discount_cents = max(0, -int(body.tip_cents)) if body.tip_cents < 0 else 0
    quoted = await pricing.quote_cart(
        cart=[{"sku": i.sku, "quantity": i.quantity} for i in body.items],
        ship_to=body.ship_to.model_dump(),
        shipping_rate_id=body.shipping_rate_id,
        discount_cents=discount_cents,
    )
    line_items = quoted["line_items"]
    logger.info(
        "%s",
        _logfmt(
            {
                "event": "store.order.quoted",
                "user_tag": _user_tag(uid),
                "total_cents": quoted["total_cents"],
            }
        ),
    )
    return {
        "items": [li.model_dump() for li in line_items],
        "subtotal_cents": quoted["subtotal_cents"],
        "shipping_options": quoted["shipping_options"],
        "selected_shipping_cents": quoted["selected_shipping_cents"],
        "tax_cents": quoted["tax_cents"],
        "discount_cents": quoted["discount_cents"],
        "total_cents": quoted["total_cents"],
        "currency": "usd",
        "ship_to": body.ship_to.model_dump(),
    }


@router.post("/orders")
async def create_order(body: CreateOrderBody, request: Request) -> dict[str, Any]:
    """Re-price, mint a PaymentIntent via grovli-payments, persist pending order."""
    uid = require_user(request)
    bearer = _bearer(request)

    quoted = await pricing.quote_cart(
        cart=[{"sku": i.sku, "quantity": i.quantity} for i in body.items],
        ship_to=body.ship_to.model_dump(),
        shipping_rate_id=body.shipping_rate_id,
    )
    line_items = quoted["line_items"]
    total_cents = int(quoted["total_cents"])

    # Idempotency: fold the authoritative total into the client nonce so a
    # replayed nonce against a changed cart can't reuse a stale PaymentIntent.
    pi_idem = f"{body.idempotency_key}:{total_cents}"
    pi = await payments_client.create_payment_intent(
        amount_cents=total_cents,
        currency="usd",
        idempotency_key=pi_idem,
        description=f"CitiGrove order ({len(line_items)} items)",
        metadata={"user_tag": _user_tag(uid)},
        bearer=bearer,
    )
    payment_intent_id = pi.get("payment_intent_id")
    client_secret = pi.get("client_secret")

    now = utc_now()
    selected_rate = quoted.get("selected_rate")
    order_doc: dict[str, Any] = {
        "userId": uid,
        "items": [li.model_dump() for li in line_items],
        "subtotal_cents": quoted["subtotal_cents"],
        "shipping_cents": quoted["selected_shipping_cents"],
        "shipping_rate": selected_rate,
        "tax_cents": quoted["tax_cents"],
        "discount_cents": quoted["discount_cents"],
        "total_cents": total_cents,
        "currency": "usd",
        "ship_to": body.ship_to.model_dump(),
        "status": OrderStatus.PENDING_PAYMENT.value,
        "payment_state": PaymentState.REQUIRES_PAYMENT.value,
        "paymentIntentId": payment_intent_id,
        # One settled PaymentIntent => exactly one order (unique-sparse index).
        "idempotencyKey": f"pi_{payment_intent_id}" if payment_intent_id else None,
        "refunded_cents": 0,
        "tracking_number": None,
        "tracking_url": None,
        "label_url": None,
        "created_at": now,
        "updated_at": now,
    }
    res = await async_db.store_orders.insert_one(order_doc)
    order_doc["_id"] = res.inserted_id

    record("citigrove.store.order.created", 1)
    logger.info(
        "%s",
        _logfmt(
            {
                "event": "store.order.created",
                "user_tag": _user_tag(uid),
                "order_id": str(res.inserted_id),
                "total_cents": total_cents,
                "payment_intent_id": payment_intent_id,
            }
        ),
    )
    return {
        "order": _serialize_order(order_doc),
        "client_secret": client_secret,
        "idempotency_key": pi_idem,
    }


@router.post("/orders/{order_id}/settle-apple-pay")
async def settle_apple_pay(
    order_id: str, body: SettleApplePayBody, request: Request
) -> dict[str, Any]:
    """Settle via Apple Pay, verify server-side, then finalize the order."""
    uid = require_user(request)
    bearer = _bearer(request)
    order = await _load_owned_order(order_id, uid)
    payment_intent_id = order.get("paymentIntentId")
    if not payment_intent_id:
        raise AppError(409, PAYMENT_NOT_SETTLED, "Order has no associated payment")

    await payments_client.settle_apple_pay(
        payment_intent_id=payment_intent_id,
        payment_data=body.payment_data,
        instrument_name=body.instrument_name,
        payment_network=body.payment_network,
        transaction_id=body.transaction_id,
        bearer=bearer,
    )

    # NEVER trust the settle response's optimistic state — verify server-side.
    verify = await payments_client.verify_payment(
        payment_intent_id=payment_intent_id,
        idempotency_key=order.get("idempotencyKey"),
        bearer=bearer,
    )
    state = str(verify.get("payment_state") or verify.get("status") or "").lower()
    charged_cents = int(verify.get("amount_cents", 0) or 0)
    currency = str(verify.get("currency", "usd")).lower()
    order_total = int(order.get("total_cents", 0))

    if state not in _SETTLED_STATES:
        logger.warning(
            "%s",
            _logfmt(
                {
                    "event": "store.order.not_settled",
                    "order_id": order_id,
                    "payment_state": state,
                }
            ),
        )
        raise AppError(402, PAYMENT_NOT_SETTLED, "Payment is not settled", payment_state=state)

    if charged_cents != order_total or currency != "usd":
        logger.warning(
            "%s",
            _logfmt(
                {
                    "event": "store.order.amount_mismatch",
                    "order_id": order_id,
                    "charged_cents": charged_cents,
                    "order_total_cents": order_total,
                    "currency": currency,
                }
            ),
        )
        raise AppError(
            402,
            AMOUNT_MISMATCH,
            "Charged amount does not match the order total",
            charged_cents=charged_cents,
            order_total_cents=order_total,
        )

    # Atomic, oversell-safe inventory decrement per line.
    for li in order.get("items", []):
        product = await async_db.store_products.find_one(
            {"_id": ObjectId(li["product_id"])}, {"variants": 1}
        )
        if not product:
            continue
        variant_sku = li.get("variant_sku") or li.get("sku")
        expected_version = 0
        for v in product.get("variants", []) or []:
            if v.get("sku") == variant_sku:
                expected_version = int(v.get("inventory_version", 0))
                break
        await inventory.decrement(
            li["product_id"], variant_sku, int(li["quantity"]), expected_version
        )

    now = utc_now()
    await async_db.store_orders.update_one(
        {"_id": order["_id"]},
        {
            "$set": {
                "status": OrderStatus.PAID.value,
                "payment_state": PaymentState.SUCCEEDED.value,
                "updated_at": now,
            }
        },
    )
    order["status"] = OrderStatus.PAID.value
    order["payment_state"] = PaymentState.SUCCEEDED.value
    order["updated_at"] = now

    record("citigrove.store.order.settled", 1)
    logger.info(
        "%s",
        _logfmt(
            {
                "event": "store.order.settled",
                "user_tag": _user_tag(uid),
                "order_id": order_id,
                "total_cents": order_total,
            }
        ),
    )
    return {"order": _serialize_order(order)}


@router.get("/orders/mine")
async def my_orders(request: Request) -> dict[str, Any]:
    """List the caller's orders (owner-scoped by verified sub)."""
    uid = require_user(request)
    docs = (
        await async_db.store_orders.find({"userId": uid})
        .sort("createdAt", -1)
        .sort("created_at", -1)
        .limit(100)
        .to_list(length=100)
    )
    return {"orders": [_serialize_order(d) for d in docs]}


@router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request) -> dict[str, Any]:
    """Fetch a single owned order (404 to non-owners)."""
    uid = require_user(request)
    order = await _load_owned_order(order_id, uid)
    return {"order": _serialize_order(order)}


@router.post("/orders/{order_id}/refund")
async def refund_order(
    order_id: str, body: RefundBody, request: Request
) -> dict[str, Any]:
    """Owner-gated refund -> grovli-payments refund + inventory restore."""
    uid = require_user(request)
    bearer = _bearer(request)
    order = await _load_owned_order(order_id, uid)
    payment_intent_id = order.get("paymentIntentId")
    if not payment_intent_id:
        raise AppError(409, PAYMENT_NOT_SETTLED, "Order has no settled payment to refund")

    result = await payments_client.refund(
        payment_intent_id=payment_intent_id,
        amount_cents=body.amount_cents,
        reason=body.reason,
        idempotency_key=f"refund:{payment_intent_id}",
        bearer=bearer,
    )
    refunded_cents = int(result.get("refunded_cents", 0) or 0)
    order_total = int(order.get("total_cents", 0))
    is_full = refunded_cents >= order_total
    new_status = (
        OrderStatus.REFUNDED.value if is_full else OrderStatus.PARTIALLY_REFUNDED.value
    )

    now = utc_now()
    await async_db.store_orders.update_one(
        {"_id": order["_id"]},
        {
            "$set": {
                "refunded_cents": refunded_cents,
                "status": new_status,
                "payment_state": PaymentState.REFUNDED.value if is_full else order.get(
                    "payment_state"
                ),
                "updated_at": now,
            }
        },
    )

    # Restore inventory only on a full refund (partials keep the goods committed).
    if is_full:
        for li in order.get("items", []):
            await inventory.restore(
                li["product_id"],
                li.get("variant_sku") or li.get("sku"),
                int(li["quantity"]),
            )

    order["refunded_cents"] = refunded_cents
    order["status"] = new_status
    order["updated_at"] = now

    record("citigrove.store.order.refunded", 1)
    logger.info(
        "%s",
        _logfmt(
            {
                "event": "store.order.refunded",
                "user_tag": _user_tag(uid),
                "order_id": order_id,
                "refunded_cents": refunded_cents,
                "full": is_full,
            }
        ),
    )
    return {"order": _serialize_order(order)}
