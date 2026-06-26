"""Products domain service — admin writes to the SKU catalog.

Reads live in the store_products router; the price + inventory authority writes
(create/upsert/update) live here, admin-only. Money is integer cents; ids render
as string `id` at the serve boundary (mirrors the router's `_serialize`).
"""
from __future__ import annotations

import logging
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId

from app.core.database.db import async_db
from app.core.logging import AppError, _logfmt
from app.core.timeutils import utc_now

logger = logging.getLogger(__name__)


def _serialize(doc: dict[str, Any]) -> dict[str, Any]:
    """Render a stored product with a string `id` (never a raw ObjectId)."""
    out = dict(doc)
    _id = out.pop("_id", None)
    if _id is not None:
        out["id"] = str(_id)
    return out


async def upsert_product(data: dict[str, Any]) -> dict[str, Any]:
    """Create or update a product by SKU. Admin sets price + inventory; the
    server stamps timestamps. Returns the persisted, serialized product."""
    sku = (data.get("sku") or "").strip()
    if not sku:
        raise AppError(422, "INVALID_PRODUCT", "Product sku is required")

    now = utc_now()
    payload = dict(data)
    payload["updatedAt"] = now

    await async_db.store_products.update_one(
        {"sku": sku},
        {"$set": payload, "$setOnInsert": {"createdAt": now}},
        upsert=True,
    )
    doc = await async_db.store_products.find_one({"sku": sku})
    if not doc:
        raise AppError(500, "PRODUCT_PERSIST_FAILED", "Product was not persisted")

    logger.info("%s", _logfmt({"event": "store.product.upserted", "sku": sku}))
    return _serialize(doc)


async def update_product(product_id: str, data: dict[str, Any]) -> dict[str, Any]:
    """Update a product by id. Raises `AppError(404)` if it doesn't exist."""
    try:
        oid = ObjectId(product_id)
    except (InvalidId, TypeError):
        raise AppError(404, "PRODUCT_NOT_FOUND", "Unknown product id")

    payload = dict(data)
    payload["updatedAt"] = utc_now()
    payload.pop("createdAt", None)  # never overwrite the original creation time

    updated = await async_db.store_products.find_one_and_update(
        {"_id": oid},
        {"$set": payload},
        return_document=True,
    )
    if not updated:
        raise AppError(404, "PRODUCT_NOT_FOUND", "Unknown product id")

    logger.info("%s", _logfmt({"event": "store.product.updated", "product_id": product_id}))
    return _serialize(updated)
