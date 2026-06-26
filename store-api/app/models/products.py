"""Product catalog models for citigrove-store-api.

Product + ProductVariant carry server-owned pricing and inventory. Inventory
is decremented atomically via an aggregation-pipeline update guarded by
inventory_version (optimistic concurrency). All money is integer *_cents.
Clients NEVER send price or inventory on a quote — only sku + qty.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.common import CURRENCY_USD


class ProductVariant(BaseModel):
    """A purchasable variant of a Product (size/color/etc.).

    inventory_quantity / inventory_version are server-owned: the version token
    guards the atomic version-filter decrement against oversell races.
    """

    sku: str
    title: str  # e.g. "Large / Green"
    price_cents: int = Field(ge=0)  # variant price override (>= 0)
    currency: str = CURRENCY_USD
    options: dict[str, str] = Field(default_factory=dict)  # {"size":"L","color":"green"}
    inventory_quantity: int = 0  # server-owned; decremented atomically
    inventory_version: int = 0  # optimistic-concurrency token for version-filter update
    weight_grams: int | None = None  # for Shippo parcel
    image_url: str | None = None
    active: bool = True


class Product(BaseModel):
    """A storefront product. base_price_cents is used when a variant has no override."""

    id: str
    sku: str  # product-level SKU (unique)
    title: str
    description: str = ""
    category: str | None = None
    base_price_cents: int = Field(ge=0)  # used when a variant has no override (>= 0)
    currency: str = CURRENCY_USD
    images: list[str] = Field(default_factory=list)
    variants: list[ProductVariant] = Field(default_factory=list)
    weight_grams: int | None = None  # default parcel weight if variant lacks one
    taxable: bool = True  # feeds Stripe Tax
    tax_code: str | None = None  # Stripe Tax product tax code (e.g. "txcd_99999999")
    active: bool = True
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class ProductInventory(BaseModel):
    """Server-owned inventory view for a single variant (render-only snapshot)."""

    product_id: str
    variant_sku: str
    inventory_quantity: int = 0
    inventory_version: int = 0
