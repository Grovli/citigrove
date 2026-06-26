"""Admin HTTP router — product upserts + host-curated event creation.

Router-level `require_admin` gate: every route here demands a verified, email-verified
`@citigrove.com` principal. Admins are the only writers of price/inventory (products)
and the only event hosts in v1. Money stays integer cents; events store GeoJSON
[lng, lat]; all server-owned counters are initialized here, never client-supplied.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.core.auth import require_admin
from app.core.database.db import async_db
from app.core.logging import AppError, _logfmt, _user_tag
from app.core.timeutils import utc_now
from app.models.orders import Address
from app.services import products_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ── Request bodies ──────────────────────────────────────────────────────────


class ProductVariantIn(BaseModel):
    sku: str
    title: str
    price_cents: int = Field(ge=0)
    currency: str = "usd"
    options: dict[str, str] = {}
    inventory_quantity: int = Field(default=0, ge=0)
    inventory_version: int = Field(default=0, ge=0)
    weight_grams: Optional[int] = Field(default=None, ge=0)
    image_url: Optional[str] = None
    active: bool = True


class ProductIn(BaseModel):
    sku: str
    title: str
    description: str = ""
    category: Optional[str] = None
    base_price_cents: int = Field(ge=0)
    currency: str = "usd"
    images: list[str] = []
    variants: list[ProductVariantIn] = []
    weight_grams: Optional[int] = Field(default=None, ge=0)
    taxable: bool = True
    tax_code: Optional[str] = None
    active: bool = True
    metadata: dict[str, Any] = {}


class EventAddressIn(BaseModel):
    name: str
    street1: str
    street2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "US"
    phone: Optional[str] = None
    email: Optional[str] = None


class EventIn(BaseModel):
    title: str
    description: str = ""
    venue_name: Optional[str] = None
    address: Optional[EventAddressIn] = None
    lng: float = Field(ge=-180.0, le=180.0)
    lat: float = Field(ge=-90.0, le=90.0)
    startsAt: Any  # ISO-8601 datetime (Pydantic coerces; stored tz-aware)
    endsAt: Optional[Any] = None
    timezone: str = "America/New_York"
    capacity: int = Field(default=0, ge=0)  # 0 == unlimited
    cover_image_url: Optional[str] = None
    price_cents: int = Field(default=0, ge=0)
    status: str = "published"  # draft|published|cancelled


# ── Product admin ───────────────────────────────────────────────────────────


@router.post("/products")
async def create_product(body: ProductIn, request: Request) -> dict[str, Any]:
    """Create (or upsert by SKU) a product — admin sets price + inventory."""
    claims = require_admin(request)
    product = await products_service.upsert_product(body.model_dump())
    logger.info(
        "%s",
        _logfmt(
            {
                "event": "admin.product.created",
                "user_tag": _user_tag(claims.get("sub")),
                "sku": body.sku,
            }
        ),
    )
    return {"product": product}


@router.put("/products/{product_id}")
async def update_product(
    product_id: str, body: ProductIn, request: Request
) -> dict[str, Any]:
    """Update a product's catalog/variants/inventory by id."""
    claims = require_admin(request)
    product = await products_service.update_product(product_id, body.model_dump())
    logger.info(
        "%s",
        _logfmt(
            {
                "event": "admin.product.updated",
                "user_tag": _user_tag(claims.get("sub")),
                "product_id": product_id,
            }
        ),
    )
    return {"product": product}


# ── Event admin ─────────────────────────────────────────────────────────────


@router.post("/events")
async def create_event(body: EventIn, request: Request) -> dict[str, Any]:
    """Create a host-curated event — hostId = admin sub; stores GeoJSON [lng, lat]."""
    claims = require_admin(request)
    host_id = claims.get("sub")
    if not host_id:
        raise AppError(403, "FORBIDDEN", "Admin principal is missing a subject")

    now = utc_now()
    address = Address(**body.address.model_dump()).model_dump() if body.address else None

    doc: dict[str, Any] = {
        "title": body.title,
        "description": body.description,
        "hostId": host_id,
        "venue_name": body.venue_name,
        "address": address,
        # GeoJSON Point — longitude FIRST, then latitude (2dsphere convention).
        "location": {"type": "Point", "coordinates": [float(body.lng), float(body.lat)]},
        "startsAt": body.startsAt,
        "endsAt": body.endsAt,
        "timezone": body.timezone,
        "capacity": int(body.capacity),
        # Server-owned derived counters — always initialized here, never client-set.
        "rsvpCount": 0,
        "waitlistCount": 0,
        "capacityFull": False,
        "cover_image_url": body.cover_image_url,
        "price_cents": int(body.price_cents),
        "status": body.status,
        "createdAt": now,
        "updatedAt": now,
    }

    res = await async_db.events.insert_one(doc)
    event_id = str(res.inserted_id)
    doc["id"] = event_id
    doc.pop("_id", None)

    logger.info(
        "%s",
        _logfmt(
            {
                "event": "admin.event.created",
                "user_tag": _user_tag(host_id),
                "event_id": event_id,
                "capacity": int(body.capacity),
            }
        ),
    )
    return {"event": doc}
