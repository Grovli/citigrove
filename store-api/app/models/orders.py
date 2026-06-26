"""Order, shipping, and address models for citigrove-store-api.

The order is server-authoritative: every monetary field is an integer number of
cents re-priced server-side, and status / payment_state / tracking_* are owned
by the server. Clients supply only sku + quantity + ship_to + an idempotency
nonce; they render the rest. Payments flow through grovli-payments /direct/*
(Apple Pay / Stripe only — NEVER IAP).
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.common import CURRENCY_USD, OrderStatus, PaymentState


class Address(BaseModel):
    """A shipping/billing address. 2-letter state for US."""

    name: str
    street1: str
    street2: str | None = None
    city: str
    state: str  # 2-letter for US
    postal_code: str
    country: str = "US"
    phone: str | None = None
    email: str | None = None


class OrderLineItem(BaseModel):
    """A single re-priced line. Client value for prices is ignored — server re-prices."""

    sku: str  # variant sku (or product sku if no variants)
    product_id: str
    variant_sku: str | None = None
    title: str  # snapshot at order time (server-resolved)
    quantity: int = Field(ge=1)
    unit_price_cents: int = Field(ge=0)  # server-re-priced; client value ignored
    line_subtotal_cents: int = Field(ge=0)  # = unit_price_cents * quantity (server-computed)
    weight_grams: int | None = None


class ShippingRate(BaseModel):
    """A live Shippo rate, amount converted to integer cents server-side."""

    rate_id: str  # Shippo object id (used to buy the label)
    carrier: str  # "USPS","UPS",...
    service: str  # "Priority","Ground",...
    amount_cents: int = Field(ge=0)  # server-converted from Shippo's decimal dollars
    currency: str = CURRENCY_USD
    estimated_days: int | None = None
    provider_token: str | None = None  # opaque Shippo rate token to purchase


class OrderQuote(BaseModel):
    """The priced draft returned by POST /store/quote. All totals server-computed."""

    items: list[OrderLineItem]
    subtotal_cents: int = Field(ge=0)
    shipping_options: list[ShippingRate] = Field(default_factory=list)
    selected_shipping_cents: int = 0  # 0 until the client picks an option
    tax_cents: int = 0  # Stripe Tax (computed on subtotal+shipping per Stripe rules)
    discount_cents: int = 0
    total_cents: int = Field(ge=0)  # subtotal + selected_shipping + tax - discount (>= 0)
    currency: str = CURRENCY_USD
    ship_to: Address | None = None


class Order(BaseModel):
    """A persisted order. Owner key is userId (= verified Auth0 `sub`)."""

    id: str
    userId: str  # = verified `sub` (server-set, owner key)
    items: list[OrderLineItem]
    subtotal_cents: int = Field(ge=0)
    shipping_cents: int = 0
    shipping_rate: ShippingRate | None = None
    tax_cents: int = 0
    discount_cents: int = 0
    total_cents: int = Field(ge=0)
    currency: str = CURRENCY_USD
    ship_to: Address
    status: OrderStatus = OrderStatus.PENDING_PAYMENT
    payment_state: PaymentState = PaymentState.REQUIRES_PAYMENT
    paymentIntentId: str | None = None  # from grovli-payments
    clientSecret: str | None = None  # transient on create response; NOT persisted long-term
    idempotencyKey: str | None = None  # server-minted; unique-sparse index
    refunded_cents: int = 0
    tracking_number: str | None = None  # from Shippo label/webhook
    tracking_url: str | None = None
    label_url: str | None = None
    created_at: datetime
    updated_at: datetime
