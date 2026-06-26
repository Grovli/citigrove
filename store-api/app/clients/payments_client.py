"""Grovli-Direct payments client — forwards to grovli-payments `/direct/*`.

Thin async httpx client that mints / settles / verifies / refunds Stripe
PaymentIntents through the internal-ingress grovli-payments service. Mirrors
Grovli's `checkout._payments_post` / `payments_proxy._proxy` forwarding: the
caller's bearer JWT is passed through so payments resolves the customer, and an
internal credential (`X-Internal-Key` + an optional Google OIDC identity token,
audience = `payments_oidc_audience` or the payments base URL) authenticates the
service-to-service call. Fail-closed: an empty `payments_internal_key` raises
`AppError(503, PAYMENTS_UNAVAILABLE)` WITHOUT calling anonymously. Every call
logs `event=store.payments.<op>`; transport failures emit the
`citigrove.payments.unreachable` counter and raise the same fail-closed error.
Money is integer cents end-to-end; currency is always `"usd"`.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from app.clients.http import internal_oidc_headers, shared_timeout
from app.core.config import settings
from app.core.logging import AppError, _logfmt
from app.core.observability import record

logger = logging.getLogger(__name__)

# Payments-service `/direct/*` routes (Stripe PaymentIntents — physical-good /
# event charges; NEVER Apple IAP). Mirror Grovli `checkout` path constants.
_CREATE_PATH = "/direct/create-payment"
_SETTLE_APPLE_PAY_PATH = "/direct/settle-apple-pay"
_VERIFY_PATH = "/direct/verify-payment"
_REFUND_PATH = "/direct/refund"

# Settled-state allowlist. "authorized" (an uncaptured auth) is REJECTED — nothing
# in this flow captures it, so accepting it would fulfil against an authorization
# that can expire/cancel. Apple Pay uses automatic capture → "succeeded".
_SETTLED_STATES = {"captured", "succeeded", "paid"}


def _base_url() -> str:
    return settings.payments_base_url.rstrip("/")


def _internal_headers(bearer: Optional[str]) -> dict[str, str]:
    """Build the service-to-service headers for an internal-ingress payments call.

    Fail-closed on the internal key: an empty `payments_internal_key` means we
    NEVER call payments anonymously (mirror Grovli's `direct_internal_key`
    doctrine) — the caller raises `PAYMENTS_UNAVAILABLE` before reaching here.
    Attaches:
      * `Content-Type: application/json`
      * the user's bearer JWT pass-through (so payments resolves the customer),
      * `X-Internal-Key` (the fail-closed shared secret),
      * a Google-signed OIDC identity token when `payments_use_oidc` (audience =
        `payments_oidc_audience` or the payments base URL), via the shared
        `internal_oidc_headers` helper (best-effort; omitted on failure).
    """
    headers: dict[str, str] = {
        "Content-Type": "application/json",
        "X-Internal-Key": settings.payments_internal_key,
    }
    if bearer:
        headers["Authorization"] = f"Bearer {bearer}"
    if settings.payments_use_oidc:
        audience = settings.payments_oidc_audience or settings.payments_base_url
        # Best-effort: an OIDC mint failure must not strand the call — the
        # X-Internal-Key is the primary credential. `internal_oidc_headers`
        # returns {} on failure (fail-open on OIDC, fail-closed on the key).
        headers.update(internal_oidc_headers(audience))
    return headers


async def _post(op: str, path: str, body: dict[str, Any], bearer: Optional[str]) -> dict:
    """POST `body` to `{payments_base_url}{path}` with internal+bearer auth.

    Fail-closed when `payments_internal_key` is empty (503 PAYMENTS_UNAVAILABLE,
    no anonymous call). On transport failure: emit `citigrove.payments.unreachable`,
    log ERROR `event=store.payments.<op>` (page-eligible: an unreachable hard
    dependency), and raise 503. On a >=300 response: raise `AppError(<status>,
    PAYMENTS_UNAVAILABLE, ...)` surfacing the upstream code+detail.
    """
    if not settings.payments_internal_key:
        logger.error(
            "%s",
            _logfmt({"event": f"store.payments.{op}", "outcome": "fail_closed_no_internal_key"}),
        )
        record("citigrove.payments.unreachable", 1, op=op, reason="no_internal_key")
        raise AppError(
            503,
            "PAYMENTS_UNAVAILABLE",
            "Payment service is not configured.",
            op=op,
        )

    url = _base_url() + path
    try:
        async with httpx.AsyncClient(timeout=shared_timeout()) as client:
            resp = await client.post(url, json=body, headers=_internal_headers(bearer))
    except Exception as exc:  # noqa: BLE001 — any transport failure is page-eligible.
        logger.error(
            "%s",
            _logfmt({"event": f"store.payments.{op}", "outcome": "unreachable", "error": str(exc)}),
        )
        record("citigrove.payments.unreachable", 1, op=op, reason="transport")
        raise AppError(
            503,
            "PAYMENTS_UNAVAILABLE",
            "Payment service is temporarily unavailable.",
            op=op,
        ) from exc

    if resp.status_code >= 300:
        detail = _safe_detail(resp)
        logger.warning(
            "%s",
            _logfmt({
                "event": f"store.payments.{op}",
                "outcome": "upstream_error",
                "status": resp.status_code,
                "detail": detail,
            }),
        )
        raise AppError(
            resp.status_code,
            "PAYMENTS_UNAVAILABLE",
            f"Payment service returned {resp.status_code}.",
            op=op,
            upstream_detail=detail,
        )

    logger.info("%s", _logfmt({"event": f"store.payments.{op}", "outcome": "ok"}))
    return _safe_json(resp)


def _safe_json(resp: httpx.Response) -> dict:
    try:
        body = resp.json()
    except Exception:  # noqa: BLE001
        return {}
    return body if isinstance(body, dict) else {}


def _safe_detail(resp: httpx.Response) -> str:
    """Extract a short upstream detail string for logging without leaking a blob."""
    try:
        body = resp.json()
    except Exception:  # noqa: BLE001
        return (resp.text or "")[:200]
    if isinstance(body, dict):
        detail = body.get("detail")
        if isinstance(detail, dict):
            return str(detail.get("message") or detail.get("code") or detail)[:200]
        if detail is not None:
            return str(detail)[:200]
    return str(body)[:200]


async def create_payment_intent(
    *,
    amount_cents: int,
    currency: str = "usd",
    idempotency_key: str,
    description: str,
    metadata: dict[str, str] | None = None,
    bearer: str | None = None,
) -> dict:
    """POST `{payments_base_url}/direct/create-payment`.

    Body: `{amount_cents, currency, idempotency_key, description, metadata}`.
    Returns: `{payment_intent_id, client_secret, status, amount_cents, currency}`.
    Raises `AppError(503, PAYMENTS_UNAVAILABLE)` on transport failure;
    `AppError(<status>, ...)` on a >=300 upstream response.
    """
    body: dict[str, Any] = {
        "amount_cents": int(amount_cents),
        "currency": currency,
        "idempotency_key": idempotency_key,
        "description": description,
        "metadata": metadata or {},
    }
    return await _post("create_payment", _CREATE_PATH, body, bearer)


async def settle_apple_pay(
    *,
    payment_intent_id: str,
    payment_data: dict,
    instrument_name: str | None = None,
    payment_network: str | None = None,
    transaction_id: str | None = None,
    bearer: str | None = None,
) -> dict:
    """POST `{payments_base_url}/direct/settle-apple-pay`.

    Passes the PassKit token fields through verbatim. Returns:
    `{payment_intent_id, payment_state, status, amount_cents, currency}`.
    """
    body: dict[str, Any] = {
        "payment_intent_id": payment_intent_id,
        "payment_data": payment_data,
        "instrument_name": instrument_name,
        "payment_network": payment_network,
        "transaction_id": transaction_id,
    }
    return await _post("settle_apple_pay", _SETTLE_APPLE_PAY_PATH, body, bearer)


async def verify_payment(
    *,
    payment_intent_id: str,
    idempotency_key: str | None = None,
    bearer: str | None = None,
) -> dict:
    """POST `{payments_base_url}/direct/verify-payment`.

    Server-side settlement check — NEVER trust a client "paid" claim. Returns
    `{payment_state|status, amount_cents, currency, payment_intent_id}`. Accept
    settled iff state in {captured, succeeded, paid}; reject 'authorized'.
    """
    body: dict[str, Any] = {"payment_intent_id": payment_intent_id}
    if idempotency_key:
        body["idempotency_key"] = idempotency_key
    return await _post("verify_payment", _VERIFY_PATH, body, bearer)


async def refund(
    *,
    payment_intent_id: str,
    amount_cents: int | None = None,  # None == full refund
    reason: str | None = None,
    idempotency_key: str | None = None,
    bearer: str | None = None,
) -> dict:
    """POST `{payments_base_url}/direct/refund`.

    Returns `{refund_id, refunded_cents, payment_state, payment_intent_id}`.
    Idempotent on `idempotency_key` (recommend `'refund:'+payment_intent_id`).
    """
    body: dict[str, Any] = {"payment_intent_id": payment_intent_id}
    if amount_cents is not None:
        body["amount_cents"] = int(amount_cents)
    if reason:
        body["reason"] = reason
    body["idempotency_key"] = idempotency_key or f"refund:{payment_intent_id}"
    return await _post("refund", _REFUND_PATH, body, bearer)


def is_settled(state: Any) -> bool:
    """True iff `state` is a settled payment state ({captured, succeeded, paid}).

    Shared so the verify-payment caller and the Stripe webhook reconciler agree
    on what "settled" means — `authorized` is NOT settled.
    """
    return isinstance(state, str) and state.strip().lower() in _SETTLED_STATES
