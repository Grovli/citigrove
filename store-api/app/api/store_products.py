"""Public store catalog reads.

Serves the active product catalog and single-product lookups. Reads are public
(no auth); the server renders only catalog-safe fields and never leaks Mongo
ObjectId — ids are rendered as strings at the serve boundary.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException, Query

from app.core.database.db import async_db
from app.core.logging import _logfmt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/store", tags=["store-products"])


def _serialize(doc: dict[str, Any]) -> dict[str, Any]:
    """Render a stored product doc with a string ``id`` (never ObjectId)."""
    out = dict(doc)
    _id = out.pop("_id", None)
    if _id is not None:
        out["id"] = str(_id)
    return out


@router.get("/products")
async def list_products(
    category: Optional[str] = Query(default=None),
    active: bool = Query(default=True),
    limit: int = Query(default=50, ge=1, le=100),
    cursor: Optional[str] = Query(default=None),
) -> dict[str, Any]:
    """List catalog products. Cursor is the last seen product id (forward paging)."""
    query: dict[str, Any] = {"active": active}
    if category:
        query["category"] = category
    if cursor:
        try:
            query["_id"] = {"$gt": ObjectId(cursor)}
        except (InvalidId, TypeError):
            raise HTTPException(status_code=400, detail="Invalid cursor")

    docs = await async_db.store_products.find(query).sort("_id", 1).limit(limit + 1).to_list(
        length=limit + 1
    )
    has_more = len(docs) > limit
    page = docs[:limit]
    products = [_serialize(d) for d in page]
    next_cursor = products[-1]["id"] if (has_more and products) else None

    return {"products": products, "next_cursor": next_cursor, "has_more": has_more}


@router.get("/products/{product_id}")
async def get_product(product_id: str) -> dict[str, Any]:
    """Fetch a single product by id."""
    try:
        oid = ObjectId(product_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=404, detail="Product not found")

    doc = await async_db.store_products.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"product": _serialize(doc)}
