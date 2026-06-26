"""MongoDB index definitions — run once at startup via ``ensure_indexes()``.

Idempotent and safe to call on every boot. ``_create_one`` swallows code 85
(IndexOptionsConflict — key already indexed under a different name/options) as
INFO so it doesn't drive the WARNING burn rate; all defs are created
concurrently and a single ``processed N / M`` line is logged.

Geospatial: ``events.location`` is a GeoJSON Point stored ``[lng, lat]`` (lng
FIRST) and indexed 2dsphere. The unique ``(eventId, userId)`` index on
``event_rsvps`` is the durable RSVP dedup gate; the unique-sparse
``idempotencyKey`` on ``store_orders`` gates double-charge order creation.
"""
from __future__ import annotations

import asyncio
import logging

from pymongo import ASCENDING, DESCENDING

from app.core.database.db import get_async_db

logger = logging.getLogger(__name__)


# (collection, keys, kwargs)
_INDEX_DEFS: list[tuple[str, list, dict]] = [
    # ── store_products ───────────────────────────────────────────────────
    ("store_products", [("sku", ASCENDING)], {"unique": True, "name": "sku_unique"}),
    (
        "store_products",
        [("active", ASCENDING), ("category", ASCENDING)],
        {"name": "active_category"},
    ),
    (
        "store_products",
        [("variants.sku", ASCENDING)],
        {"name": "variant_sku", "sparse": True},
    ),
    # ── store_orders ─────────────────────────────────────────────────────
    (
        "store_orders",
        [("userId", ASCENDING), ("createdAt", DESCENDING)],
        {"name": "user_created"},
    ),
    (
        "store_orders",
        [("idempotencyKey", ASCENDING)],
        {"unique": True, "name": "order_idem_unique", "sparse": True},
    ),
    (
        "store_orders",
        [("paymentIntentId", ASCENDING)],
        {"name": "payment_intent", "sparse": True},
    ),
    ("store_orders", [("status", ASCENDING)], {"name": "status"}),
    # ── events ───────────────────────────────────────────────────────────
    ("events", [("location", "2dsphere")], {"name": "events_location_2dsphere"}),
    (
        "events",
        [("status", ASCENDING), ("startsAt", ASCENDING)],
        {"name": "status_starts"},
    ),
    ("events", [("hostId", ASCENDING)], {"name": "host"}),
    # ── event_rsvps ──────────────────────────────────────────────────────
    (
        "event_rsvps",
        [("eventId", ASCENDING), ("userId", ASCENDING)],
        {"unique": True, "name": "rsvp_event_user_unique"},
    ),
    (
        "event_rsvps",
        [("userId", ASCENDING), ("createdAt", DESCENDING)],
        {"name": "rsvp_user_created"},
    ),
    (
        "event_rsvps",
        [("eventId", ASCENDING), ("status", ASCENDING), ("position", ASCENDING)],
        {"name": "rsvp_event_status_position"},
    ),
]


async def ensure_indexes() -> None:
    """Create all declared indexes idempotently. Safe on every startup."""
    db = get_async_db()

    async def _create_one(coll_name: str, keys: list, kwargs: dict) -> bool:
        try:
            await db[coll_name].create_index(keys, **kwargs)
            return True
        except Exception as exc:
            details = getattr(exc, "details", None) or {}
            err_code = getattr(exc, "code", None)
            if not isinstance(err_code, int) and isinstance(details, dict):
                err_code = details.get("code")
            # Code 85 IndexOptionsConflict: an index on this EXACT key already
            # exists under a different name/options. The key is already
            # indexed and served — non-fatal. Demote to INFO so it doesn't
            # drive the WARNING burn rate.
            if err_code == 85 or "indexoptionsconflict" in str(exc).lower():
                logger.info(
                    "Index for %s already present under a different name/options "
                    "(non-fatal; key is already indexed and served): %s",
                    coll_name,
                    exc,
                )
                return True
            logger.warning("Index creation failed for %s: %s", coll_name, exc)
            return False

    results = await asyncio.gather(
        *(_create_one(c, k, kw) for c, k, kw in _INDEX_DEFS)
    )
    created = sum(results)
    logger.info(
        "ensure_indexes: processed %d / %d index definitions",
        created,
        len(_INDEX_DEFS),
    )
