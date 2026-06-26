"""Live shipping rate quotes for a cart.

Returns Shippo-backed shipping options (amounts converted to integer cents) for
a user's cart + destination address. The server computes rates — clients render
the returned options and never fabricate shipping cost.
"""
from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.core.auth import require_user
from app.core.logging import _logfmt, _user_tag
from app.models.orders import Address
from app.services import pricing, shipping_shippo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/store", tags=["store-shipping"])


class _ShippingItem(BaseModel):
    sku: str
    quantity: int


class ShippingRatesBody(BaseModel):
    items: list[_ShippingItem]
    ship_to: Address


@router.post("/shipping/rates")
async def shipping_rates(body: ShippingRatesBody, request: Request) -> dict[str, Any]:
    """Live Shippo rates for ``items`` shipped to ``ship_to`` (amounts in cents).

    Re-prices the cart first so parcel weights come from the authoritative
    catalog snapshot rather than client-supplied values.
    """
    uid = require_user(request)

    line_items, _ = await pricing.price_line_items(
        [{"sku": i.sku, "quantity": i.quantity} for i in body.items]
    )
    item_dicts = [li.model_dump() for li in line_items]
    rates = await shipping_shippo.rates(items=item_dicts, ship_to=body.ship_to.model_dump())

    logger.info(
        "%s",
        _logfmt(
            {
                "event": "store.shipping.rates_request",
                "user_tag": _user_tag(uid),
                "count": len(rates),
            }
        ),
    )
    return {"rates": rates}
