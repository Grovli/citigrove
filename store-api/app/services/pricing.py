"""Server-authoritative, integer-cents pricing for the store.

Re-prices every cart line from the catalog (client sends only ``sku`` + ``qty``),
snapshots titles at order time, and folds in live Stripe Tax + Shippo shipping to
produce an OrderQuote whose ``*_cents`` keys match the Order model exactly so the
quote and the eventual charge can never disagree. All money math is pure ``int``.
"""
from __future__ import annotations

import logging
import time
from typing import Any

from app.core.database.db import async_db
from app.core.logging import AppError, PRICING_ERROR, _logfmt
from app.core.observability import record
from app.models.orders import OrderLineItem
from app.services import shipping_shippo, tax

logger = logging.getLogger(__name__)


def _resolve_variant(product: dict[str, Any], sku: str) -> dict[str, Any] | None:
    """Return the matching active variant by sku, or None."""
    for v in product.get("variants", []) or []:
        if v.get("sku") == sku and v.get("active", True):
            return v
    return None


async def price_line_items(cart: list[dict[str, Any]]) -> tuple[list[OrderLineItem], int]:
    """Re-price a cart of ``{sku, quantity}`` against the catalog.

    Resolves each sku to a product (and variant, if the sku is a variant sku),
    snapshots the title, resolves ``unit_price_cents`` (variant override else
    product ``base_price_cents``), and computes ``line_subtotal_cents`` as pure
    int math. Unknown/inactive skus fail closed (422 PRICING_ERROR).
    """
    line_items: list[OrderLineItem] = []
    subtotal_cents = 0

    for raw in cart:
        sku = raw.get("sku")
        quantity = int(raw.get("quantity", 0) or 0)
        if not sku or quantity < 1:
            raise AppError(
                422,
                PRICING_ERROR,
                "Each cart line requires a sku and quantity >= 1",
                sku=sku,
                quantity=quantity,
            )

        # The sku may be a product-level sku OR a variant sku.
        product = await async_db.store_products.find_one(
            {"$or": [{"sku": sku}, {"variants.sku": sku}], "active": True}
        )
        if not product:
            raise AppError(
                422,
                PRICING_ERROR,
                "Unknown or inactive product",
                sku=sku,
            )

        product_id = str(product.get("_id"))
        variant = _resolve_variant(product, sku)

        if variant is not None:
            unit_price_cents = int(variant.get("price_cents", 0))
            title = variant.get("title") or product.get("title", "")
            variant_sku = variant.get("sku")
            weight_grams = variant.get("weight_grams") or product.get("weight_grams")
            settle_sku = variant_sku
        else:
            # sku matched the product-level sku and the product has no variants.
            if product.get("variants"):
                raise AppError(
                    422,
                    PRICING_ERROR,
                    "A variant sku is required for this product",
                    sku=sku,
                )
            unit_price_cents = int(product.get("base_price_cents", 0))
            title = product.get("title", "")
            variant_sku = None
            weight_grams = product.get("weight_grams")
            settle_sku = product.get("sku")

        if unit_price_cents < 0:
            raise AppError(422, PRICING_ERROR, "Invalid price for product", sku=sku)

        line_subtotal_cents = unit_price_cents * quantity
        subtotal_cents += line_subtotal_cents

        line_items.append(
            OrderLineItem(
                sku=settle_sku,
                product_id=product_id,
                variant_sku=variant_sku,
                title=title,
                quantity=quantity,
                unit_price_cents=unit_price_cents,
                line_subtotal_cents=line_subtotal_cents,
                weight_grams=weight_grams,
            )
        )

    return line_items, int(subtotal_cents)


async def quote_order_totals(
    *,
    subtotal_cents: int,
    shipping_cents: int = 0,
    tax_cents: int = 0,
    discount_cents: int = 0,
) -> dict[str, int | str]:
    """Combine cents components into the canonical totals dict.

    Returns keys that match the Order ``*_cents`` fields exactly so the quote and
    the charge can never disagree. ``total_cents`` is clamped at 0.
    """
    subtotal_cents = int(subtotal_cents)
    shipping_cents = int(shipping_cents)
    tax_cents = int(tax_cents)
    discount_cents = int(discount_cents)
    total_cents = max(0, subtotal_cents + shipping_cents + tax_cents - discount_cents)
    return {
        "subtotal_cents": subtotal_cents,
        "shipping_cents": shipping_cents,
        "tax_cents": tax_cents,
        "discount_cents": discount_cents,
        "total_cents": total_cents,
        "currency": "usd",
    }


async def quote_cart(
    *,
    cart: list[dict[str, Any]],
    ship_to: dict[str, Any] | None,
    shipping_rate_id: str | None = None,
    discount_cents: int = 0,
) -> dict[str, Any]:
    """Full authoritative quote: re-price → live shipping rates → tax → totals.

    Returns a dict carrying the OrderLineItem list, the available shipping
    options, the selected shipping cents (if the client passed a rate id), tax,
    and the canonical totals — ready to hydrate an OrderQuote or persist an Order.
    """
    started = time.perf_counter()

    line_items, subtotal_cents = await price_line_items(cart)
    item_dicts = [li.model_dump() for li in line_items]
    # Carry product-level tax flags onto the tax line items.
    for it in item_dicts:
        it.setdefault("taxable", True)

    shipping_options = await shipping_shippo.rates(items=item_dicts, ship_to=ship_to)

    selected_shipping_cents = 0
    selected_rate: dict[str, Any] | None = None
    if shipping_rate_id:
        for r in shipping_options:
            if r.get("rate_id") == shipping_rate_id:
                selected_rate = r
                selected_shipping_cents = int(r.get("amount_cents", 0))
                break
        if selected_rate is None:
            raise AppError(
                422,
                "SHIPPING_UNAVAILABLE",
                "The selected shipping rate is no longer available",
                shipping_rate_id=shipping_rate_id,
            )

    tax_cents = await tax.calculate(
        items=item_dicts,
        ship_to=ship_to,
        shipping_cents=selected_shipping_cents,
    )

    totals = await quote_order_totals(
        subtotal_cents=subtotal_cents,
        shipping_cents=selected_shipping_cents,
        tax_cents=tax_cents,
        discount_cents=int(discount_cents),
    )

    duration_ms = (time.perf_counter() - started) * 1000.0
    record("citigrove.store.pricing.duration_ms", duration_ms)
    logger.info(
        "%s",
        _logfmt(
            {
                "event": "store.pricing.quoted",
                "lines": len(line_items),
                "subtotal_cents": subtotal_cents,
                "shipping_cents": selected_shipping_cents,
                "tax_cents": tax_cents,
                "total_cents": totals["total_cents"],
                "duration_ms": round(duration_ms, 2),
            }
        ),
    )

    return {
        "line_items": line_items,
        "shipping_options": shipping_options,
        "selected_shipping_cents": selected_shipping_cents,
        "selected_rate": selected_rate,
        **totals,
    }
