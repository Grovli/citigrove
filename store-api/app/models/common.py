"""Shared models, enums, and money helpers for citigrove-store-api.

Defines the server-owned lifecycle enums (order status, payment state, RSVP
status), pagination metadata, and integer-cents money helpers. Money is ALWAYS
an integer number of cents in USD — never a float. The server is the pricing
authority; clients render these values and never recompute them.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field

CURRENCY_USD = "usd"


class OrderStatus(str, Enum):
    """Server-owned order lifecycle. Clients render; never recompute."""

    PENDING_PAYMENT = "pending_payment"
    PAID = "paid"
    FULFILLING = "fulfilling"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class PaymentState(str, Enum):
    """Server-verified payment state. Settlement is confirmed server-side."""

    REQUIRES_PAYMENT = "requires_payment"
    SUCCEEDED = "succeeded"  # accept {captured, succeeded, paid} on verify
    FAILED = "failed"
    REFUNDED = "refunded"


class RsvpStatus(str, Enum):
    """Server-owned RSVP state. Confirmed vs waitlisted is decided server-side."""

    CONFIRMED = "confirmed"
    WAITLISTED = "waitlisted"
    CANCELLED = "cancelled"


# ── Settlement acceptance sets (server-side verify; never trust client) ──
SETTLED_PAYMENT_STATES: frozenset[str] = frozenset({"captured", "succeeded", "paid"})


class PageMeta(BaseModel):
    """Cursor-based pagination metadata returned alongside list payloads."""

    limit: int = 50
    next_cursor: Optional[str] = None
    has_more: bool = False


# ── Money helpers (integer cents, USD) ───────────────────────────────────────
def line_subtotal_cents(unit_price_cents: int, quantity: int) -> int:
    """Pure integer line subtotal = unit_price_cents * quantity (>= 0)."""

    return int(unit_price_cents) * int(quantity)


def order_total_cents(
    *,
    subtotal_cents: int,
    shipping_cents: int = 0,
    tax_cents: int = 0,
    discount_cents: int = 0,
) -> int:
    """Authoritative order total, clamped to >= 0. All integer cents.

    total = subtotal + shipping + tax - discount, floored at 0.
    Mirrors pricing.quote_order_totals so a quote and a charge can never disagree.
    """

    total = int(subtotal_cents) + int(shipping_cents) + int(tax_cents) - int(discount_cents)
    return max(0, total)


def dollars_to_cents(amount: float | str) -> int:
    """Convert a provider's decimal-dollar string/float to integer cents.

    Used for Shippo/Stripe amounts that arrive as decimal dollars. Rounds to
    the nearest cent via Decimal to avoid binary float drift.
    """

    from decimal import ROUND_HALF_UP, Decimal

    cents = (Decimal(str(amount)) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(cents)


class Money(BaseModel):
    """A render-only money value object: integer cents + lowercase currency."""

    amount_cents: int = Field(ge=0)
    currency: str = CURRENCY_USD
