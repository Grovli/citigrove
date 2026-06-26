"""Shippo integration — live shipping rates, label purchase, and tracking.

Quotes live carrier rates for a cart's parcel(s), buys a label from a chosen
rate, and reads tracking. Shippo returns money as decimal-dollar strings; we
convert to integer cents at the boundary so the rest of the system only ever
sees ``*_cents`` ints. Unconfigured Shippo degrades to empty rates in dev and
fails closed (503 SHIPPING_UNAVAILABLE) in production.
"""
from __future__ import annotations

import asyncio
import logging
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from typing import Any

import shippo
from shippo.models import components

from app.core.config import settings
from app.core.logging import AppError, SHIPPING_UNAVAILABLE, _logfmt
from app.core.observability import record

logger = logging.getLogger(__name__)

_DEFAULT_PARCEL_WEIGHT_GRAMS = 500


def _to_cents(amount: Any) -> int:
    """Convert a Shippo decimal-dollar string/number to integer cents."""
    try:
        dollars = Decimal(str(amount))
    except (InvalidOperation, TypeError, ValueError):
        return 0
    cents = (dollars * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(cents)


def _client() -> shippo.Shippo:
    return shippo.Shippo(api_key_header=settings.shippo_api_token)


def _address_from(ship_to: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": ship_to.get("name") or "",
        "street1": ship_to.get("street1") or "",
        "street2": ship_to.get("street2") or "",
        "city": ship_to.get("city") or "",
        "state": ship_to.get("state") or "",
        "zip": ship_to.get("postal_code") or "",
        "country": ship_to.get("country") or "US",
        "phone": ship_to.get("phone") or "",
        "email": ship_to.get("email") or "",
    }


def _address_from_settings() -> dict[str, Any]:
    return {
        "name": settings.ship_from_name,
        "street1": settings.ship_from_street1,
        "city": settings.ship_from_city,
        "state": settings.ship_from_state,
        "zip": settings.ship_from_zip,
        "country": settings.ship_from_country,
    }


def _parcel_for(items: list[dict[str, Any]]) -> dict[str, Any]:
    """Aggregate cart weight into a single parcel (grams)."""
    total_grams = 0
    for it in items:
        per = it.get("weight_grams") or _DEFAULT_PARCEL_WEIGHT_GRAMS
        qty = int(it.get("quantity", 1) or 1)
        total_grams += int(per) * qty
    total_grams = max(total_grams, _DEFAULT_PARCEL_WEIGHT_GRAMS)
    return {
        "length": "10",
        "width": "8",
        "height": "4",
        "distance_unit": components.DistanceUnitEnum.IN,
        "weight": str(total_grams),
        "mass_unit": components.WeightUnitEnum.G,
    }


def _rates_sync(items: list[dict[str, Any]], ship_to: dict[str, Any]) -> list[dict[str, Any]]:
    """Blocking Shippo shipment create → normalized ShippingRate dicts (cents)."""
    client = _client()
    shipment = client.shipments.create(
        components.ShipmentCreateRequest(
            address_from=components.AddressCreateRequest(**_address_from_settings()),
            address_to=components.AddressCreateRequest(**_address_from(ship_to)),
            parcels=[components.ParcelCreateRequest(**_parcel_for(items))],
            async_=False,
        )
    )

    rates: list[dict[str, Any]] = []
    for r in getattr(shipment, "rates", None) or []:
        days = getattr(r, "estimated_days", None)
        rates.append(
            {
                "rate_id": getattr(r, "object_id", "") or "",
                "carrier": getattr(r, "provider", "") or "",
                "service": getattr(r, "servicelevel", None)
                and getattr(r.servicelevel, "name", "")
                or "",
                "amount_cents": _to_cents(getattr(r, "amount", "0")),
                "currency": "usd",
                "estimated_days": int(days) if days is not None else None,
                "provider_token": getattr(r, "object_id", "") or "",
            }
        )
    rates.sort(key=lambda x: x["amount_cents"])
    return rates


async def rates(
    *,
    items: list[dict[str, Any]],
    ship_to: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    """Live shipping options for ``items`` → list of ShippingRate dicts (cents).

    Dev/degrade returns []; production fails closed (503) on engine error or
    missing config. Each dict matches the ShippingRate model field names.
    """
    if not settings.shippo_api_token or not ship_to:
        if settings.is_production:
            logger.error("%s", _logfmt({"event": "store.shipping.unconfigured"}))
            raise AppError(503, SHIPPING_UNAVAILABLE, "Shipping rates are unavailable")
        logger.info("%s", _logfmt({"event": "store.shipping.degraded_empty"}))
        return []

    try:
        out = await asyncio.to_thread(_rates_sync, items, ship_to)
    except AppError:
        raise
    except Exception as exc:  # noqa: BLE001 — dependency failure boundary
        record("citigrove.shippo.unreachable", 1)
        logger.error(
            "%s",
            _logfmt(
                {
                    "event": "store.shipping.unreachable",
                    "error": type(exc).__name__,
                    "detail": str(exc),
                }
            ),
        )
        if settings.is_production:
            raise AppError(503, SHIPPING_UNAVAILABLE, "Shipping rate lookup failed") from exc
        return []

    logger.info(
        "%s",
        _logfmt({"event": "store.shipping.rates", "count": len(out)}),
    )
    return out


def _buy_label_sync(provider_token: str) -> dict[str, Any]:
    """Blocking Shippo transaction (label purchase) from a rate token."""
    client = _client()
    txn = client.transactions.create(
        components.TransactionCreateRequest(
            rate=provider_token,
            label_file_type=components.LabelFileTypeEnum.PDF,
            async_=False,
        )
    )
    status = (getattr(txn, "status", "") or "").upper()
    if status != "SUCCESS":
        messages = getattr(txn, "messages", None) or []
        detail = "; ".join(str(getattr(m, "text", m)) for m in messages) or "label purchase failed"
        raise RuntimeError(detail)
    return {
        "tracking_number": getattr(txn, "tracking_number", None),
        "tracking_url": getattr(txn, "tracking_url_provider", None),
        "label_url": getattr(txn, "label_url", None),
    }


async def buy_label(*, provider_token: str) -> dict[str, Any]:
    """Purchase a label from a chosen rate token → tracking_* + label_url.

    Production fails closed (503) on error; dev returns an empty tracking dict
    so an order can still settle without a label provider configured.
    """
    if not settings.shippo_api_token or not provider_token:
        if settings.is_production:
            raise AppError(503, SHIPPING_UNAVAILABLE, "Label purchase is unavailable")
        logger.info("%s", _logfmt({"event": "store.shipping.label_degraded"}))
        return {"tracking_number": None, "tracking_url": None, "label_url": None}

    try:
        out = await asyncio.to_thread(_buy_label_sync, provider_token)
    except AppError:
        raise
    except Exception as exc:  # noqa: BLE001 — dependency failure boundary
        record("citigrove.shippo.unreachable", 1)
        logger.error(
            "%s",
            _logfmt(
                {
                    "event": "store.shipping.label_failed",
                    "error": type(exc).__name__,
                    "detail": str(exc),
                }
            ),
        )
        if settings.is_production:
            raise AppError(503, SHIPPING_UNAVAILABLE, "Label purchase failed") from exc
        return {"tracking_number": None, "tracking_url": None, "label_url": None}

    logger.info(
        "%s",
        _logfmt(
            {
                "event": "store.shipping.label_bought",
                "has_tracking": bool(out.get("tracking_number")),
            }
        ),
    )
    return out


def _track_sync(carrier: str, tracking_number: str) -> dict[str, Any]:
    client = _client()
    track = client.tracking_status.get(tracking_number, carrier)
    status = getattr(track, "tracking_status", None)
    return {
        "status": getattr(status, "status", None) if status else None,
        "tracking_url": getattr(track, "tracking_url", None),
    }


async def track(*, carrier: str, tracking_number: str) -> dict[str, Any]:
    """Read current tracking status for a shipment (best-effort)."""
    if not settings.shippo_api_token or not tracking_number:
        return {"status": None, "tracking_url": None}
    try:
        return await asyncio.to_thread(_track_sync, carrier, tracking_number)
    except Exception as exc:  # noqa: BLE001
        record("citigrove.shippo.unreachable", 1)
        logger.warning(
            "%s",
            _logfmt(
                {
                    "event": "store.shipping.track_failed",
                    "error": type(exc).__name__,
                }
            ),
        )
        return {"status": None, "tracking_url": None}
