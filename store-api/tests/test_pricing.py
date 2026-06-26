"""Unit tests for the server-authoritative pricing math (integer cents).

These exercise ``quote_order_totals`` purely — the totals invariant must
hold without any DB/network. They assert: (1) every monetary field is an
``int``, (2) the total is the exact sum subtotal+shipping+tax-discount
clamped at zero, and (3) currency is always lowercase ``"usd"``.

If the pricing service grows DB-bound branches, keep ``quote_order_totals``
pure so this stays a fast unit test.
"""
from __future__ import annotations

import pytest

from app.services.pricing import quote_order_totals


@pytest.mark.asyncio
async def test_totals_are_integer_cents_and_sum_exactly():
    totals = await quote_order_totals(
        subtotal_cents=4500,
        shipping_cents=799,
        tax_cents=412,
        discount_cents=300,
    )

    # Every monetary field is a plain int (never a float).
    for key in (
        "subtotal_cents",
        "shipping_cents",
        "tax_cents",
        "discount_cents",
        "total_cents",
    ):
        assert key in totals, f"missing {key}"
        assert isinstance(totals[key], int), f"{key} must be int"
        assert not isinstance(totals[key], bool)

    assert totals["total_cents"] == 4500 + 799 + 412 - 300
    assert totals["currency"] == "usd"


@pytest.mark.asyncio
async def test_total_clamps_at_zero_when_discount_exceeds():
    totals = await quote_order_totals(
        subtotal_cents=1000,
        shipping_cents=0,
        tax_cents=0,
        discount_cents=5000,
    )
    # max(0, ...) — a total can never go negative.
    assert totals["total_cents"] == 0
    assert isinstance(totals["total_cents"], int)


@pytest.mark.asyncio
async def test_zero_cart_is_zero_total():
    totals = await quote_order_totals(subtotal_cents=0)
    assert totals["total_cents"] == 0
    assert totals["subtotal_cents"] == 0
    assert totals["shipping_cents"] == 0
    assert totals["tax_cents"] == 0
    assert totals["discount_cents"] == 0
    assert totals["currency"] == "usd"
