"""Stripe Tax calculation (live tax in integer cents).

Wraps Stripe Tax's Calculation API to compute sales tax server-side over the
order subtotal + selected shipping. Returns tax as an integer-cents amount —
never a float. In development with ``stripe_tax_enabled=False`` (or no Stripe
key) we graceful-degrade to ``tax_cents=0``; in production a tax-engine failure
fails closed with ``AppError(503, TAX_UNAVAILABLE)`` rather than silently
undercharging.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

import stripe

from app.core.config import settings
from app.core.logging import AppError, TAX_UNAVAILABLE, _logfmt
from app.core.observability import record

logger = logging.getLogger(__name__)


def _address_to_stripe(addr: dict[str, Any]) -> dict[str, Any]:
    """Map our Address dict to Stripe's customer_details.address shape."""
    return {
        "line1": addr.get("street1") or "",
        "line2": addr.get("street2") or None,
        "city": addr.get("city") or "",
        "state": addr.get("state") or "",
        "postal_code": addr.get("postal_code") or "",
        "country": (addr.get("country") or "US"),
    }


def _build_line_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Stripe Tax line items: integer-cents amounts + optional tax_code."""
    out: list[dict[str, Any]] = []
    for idx, it in enumerate(items):
        amount = int(it.get("line_subtotal_cents", 0))
        if amount <= 0:
            continue
        li: dict[str, Any] = {
            "amount": amount,
            "reference": str(it.get("sku") or it.get("product_id") or f"line_{idx}"),
        }
        tax_code = it.get("tax_code")
        if tax_code:
            li["tax_code"] = tax_code
        if it.get("taxable") is False:
            # Non-taxable goods use Stripe's non-taxable code.
            li["tax_code"] = "txcd_00000000"
        out.append(li)
    return out


def _calculate_sync(
    *,
    items: list[dict[str, Any]],
    ship_to: dict[str, Any],
    shipping_cents: int,
) -> int:
    """Blocking Stripe Tax call; returns total tax in integer cents."""
    stripe.api_key = settings.stripe_secret_key
    line_items = _build_line_items(items)
    if not line_items:
        return 0

    params: dict[str, Any] = {
        "currency": "usd",
        "line_items": line_items,
        "customer_details": {
            "address": _address_to_stripe(ship_to),
            "address_source": "shipping",
        },
    }
    if int(shipping_cents) > 0:
        params["shipping_cost"] = {"amount": int(shipping_cents)}

    calc = stripe.tax.Calculation.create(**params)
    return int(getattr(calc, "tax_amount_exclusive", 0) or 0)


async def calculate(
    *,
    items: list[dict[str, Any]],
    ship_to: dict[str, Any] | None,
    shipping_cents: int = 0,
) -> int:
    """Compute tax in integer cents over ``items`` + ``shipping_cents``.

    Dev/degrade path returns 0; production fails closed (503) on any engine
    error or missing config so we never undercharge a real customer.
    """
    if not settings.stripe_tax_enabled or not settings.stripe_secret_key:
        if settings.is_production:
            logger.error(
                "%s",
                _logfmt(
                    {
                        "event": "store.tax.unconfigured",
                        "stripe_tax_enabled": settings.stripe_tax_enabled,
                        "has_key": bool(settings.stripe_secret_key),
                    }
                ),
            )
            raise AppError(503, TAX_UNAVAILABLE, "Tax calculation is unavailable")
        logger.info("%s", _logfmt({"event": "store.tax.degraded_zero"}))
        return 0

    if not ship_to:
        if settings.is_production:
            raise AppError(
                503,
                TAX_UNAVAILABLE,
                "A shipping address is required to compute tax",
            )
        return 0

    try:
        tax_cents = await asyncio.to_thread(
            _calculate_sync,
            items=items,
            ship_to=ship_to,
            shipping_cents=int(shipping_cents),
        )
    except AppError:
        raise
    except Exception as exc:  # noqa: BLE001 — dependency failure boundary
        record("citigrove.stripe_tax.unreachable", 1)
        logger.error(
            "%s",
            _logfmt(
                {
                    "event": "store.tax.unreachable",
                    "error": type(exc).__name__,
                    "detail": str(exc),
                }
            ),
        )
        if settings.is_production:
            raise AppError(503, TAX_UNAVAILABLE, "Tax calculation failed") from exc
        return 0

    logger.info(
        "%s",
        _logfmt(
            {
                "event": "store.tax.calculated",
                "tax_cents": tax_cents,
                "shipping_cents": int(shipping_cents),
            }
        ),
    )
    return int(tax_cents)
