"""Atomic, oversell-safe inventory mutation for store product variants.

Decrements/restores variant stock via a single MongoDB aggregation-pipeline
update guarded by an ``inventory_version`` optimistic-concurrency filter, so a
concurrent buyer can never read-modify-write past available stock. A losing
update (out of stock OR a concurrent version bump) emits a WARNING + an
oversell-blocked counter and retries on a fresh version read; exhausted retries
fail closed with a 409.
"""
from __future__ import annotations

import logging

from bson import ObjectId
from bson.errors import InvalidId

from app.core.database.db import async_db
from app.core.logging import AppError, INVENTORY_CONFLICT, OUT_OF_STOCK, _logfmt
from app.core.observability import record
from app.core.timeutils import utc_now

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3


def _oid(value: str) -> ObjectId:
    """Coerce a string product id to ObjectId, failing closed on bad input."""
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise AppError(404, "NOT_FOUND", "Product not found", product_id=str(value))


async def _variant_state(product_id: str, variant_sku: str) -> tuple[int, int] | None:
    """Return (inventory_quantity, inventory_version) for a variant, or None."""
    doc = await async_db.store_products.find_one(
        {"_id": _oid(product_id), "variants.sku": variant_sku},
        {"variants": 1},
    )
    if not doc:
        return None
    for v in doc.get("variants", []) or []:
        if v.get("sku") == variant_sku:
            return int(v.get("inventory_quantity", 0)), int(v.get("inventory_version", 0))
    return None


async def _apply_delta(
    product_id: str,
    variant_sku: str,
    qty: int,
    expected_version: int,
    *,
    sign: int,
) -> int:
    """Atomic version-filtered variant mutation. Returns modified_count (0 or 1).

    ``sign`` is -1 for a decrement (with a ``$gte qty`` stock guard) and +1 for a
    restore (no stock guard). The version is always bumped by 1 on success so a
    racing writer's expected_version no longer matches.
    """
    elem_match: dict = {"sku": variant_sku, "inventory_version": expected_version}
    if sign < 0:
        elem_match["inventory_quantity"] = {"$gte": qty}

    delta_expr = (
        {"$subtract": ["$$v.inventory_quantity", qty]}
        if sign < 0
        else {"$add": ["$$v.inventory_quantity", qty]}
    )

    res = await async_db.store_products.update_one(
        {"_id": _oid(product_id), "variants": {"$elemMatch": elem_match}},
        [
            {
                "$set": {
                    "variants": {
                        "$map": {
                            "input": "$variants",
                            "as": "v",
                            "in": {
                                "$cond": [
                                    {"$eq": ["$$v.sku", variant_sku]},
                                    {
                                        "$mergeObjects": [
                                            "$$v",
                                            {
                                                "inventory_quantity": delta_expr,
                                                "inventory_version": {
                                                    "$add": ["$$v.inventory_version", 1]
                                                },
                                            },
                                        ]
                                    },
                                    "$$v",
                                ]
                            },
                        }
                    },
                    "updated_at": utc_now(),
                }
            }
        ],
    )
    return int(res.modified_count or 0)


async def decrement(
    product_id: str,
    variant_sku: str,
    qty: int,
    expected_version: int,
) -> bool:
    """Atomically decrement variant stock by ``qty`` under a version filter.

    Returns True on success. On a losing update, re-reads the live version and
    retries while stock remains; exhausted retries fail closed (409). Oversell
    (stock < qty) is a hard 409 OUT_OF_STOCK.
    """
    if qty <= 0:
        return True

    version = expected_version
    for attempt in range(_MAX_RETRIES):
        modified = await _apply_delta(product_id, variant_sku, qty, version, sign=-1)
        if modified == 1:
            return True

        # Lost the race or insufficient stock — observe + decide.
        record("citigrove.store.inventory.oversell_blocked", 1)
        state = await _variant_state(product_id, variant_sku)
        if state is None:
            logger.warning(
                "%s",
                _logfmt(
                    {
                        "event": "store.inventory.conflict",
                        "reason": "variant_missing",
                        "product_id": product_id,
                        "variant_sku": variant_sku,
                        "qty": qty,
                        "attempt": attempt,
                    }
                ),
            )
            raise AppError(
                404,
                "NOT_FOUND",
                "Product variant not found",
                product_id=product_id,
                variant_sku=variant_sku,
            )

        live_qty, live_version = state
        if live_qty < qty:
            logger.warning(
                "%s",
                _logfmt(
                    {
                        "event": "store.inventory.conflict",
                        "reason": "out_of_stock",
                        "product_id": product_id,
                        "variant_sku": variant_sku,
                        "qty": qty,
                        "available": live_qty,
                        "attempt": attempt,
                    }
                ),
            )
            raise AppError(
                409,
                OUT_OF_STOCK,
                "Requested quantity exceeds available stock",
                product_id=product_id,
                variant_sku=variant_sku,
                available=live_qty,
                requested=qty,
            )

        # Stock is available but the version moved under us — retry on the fresh version.
        logger.warning(
            "%s",
            _logfmt(
                {
                    "event": "store.inventory.conflict",
                    "reason": "version_bump",
                    "product_id": product_id,
                    "variant_sku": variant_sku,
                    "qty": qty,
                    "expected_version": version,
                    "live_version": live_version,
                    "attempt": attempt,
                }
            ),
        )
        version = live_version

    raise AppError(
        409,
        INVENTORY_CONFLICT,
        "Inventory update conflicted under concurrency; please retry",
        product_id=product_id,
        variant_sku=variant_sku,
    )


async def restore(product_id: str, variant_sku: str, qty: int) -> bool:
    """Inverse of decrement — add ``qty`` back on refund/cancel (bumps version).

    Restore must not fail the calling refund flow, so a missing variant or a
    transient race is logged as a WARNING and reported as non-fatal (False).
    """
    if qty <= 0:
        return True

    state = await _variant_state(product_id, variant_sku)
    if state is None:
        logger.warning(
            "%s",
            _logfmt(
                {
                    "event": "store.inventory.restore_skip",
                    "reason": "variant_missing",
                    "product_id": product_id,
                    "variant_sku": variant_sku,
                    "qty": qty,
                }
            ),
        )
        return False

    _, version = state
    for attempt in range(_MAX_RETRIES):
        modified = await _apply_delta(product_id, variant_sku, qty, version, sign=1)
        if modified == 1:
            return True

        refreshed = await _variant_state(product_id, variant_sku)
        if refreshed is None:
            return False
        _, version = refreshed
        logger.warning(
            "%s",
            _logfmt(
                {
                    "event": "store.inventory.conflict",
                    "reason": "restore_version_bump",
                    "product_id": product_id,
                    "variant_sku": variant_sku,
                    "qty": qty,
                    "attempt": attempt,
                }
            ),
        )

    logger.warning(
        "%s",
        _logfmt(
            {
                "event": "store.inventory.restore_exhausted",
                "product_id": product_id,
                "variant_sku": variant_sku,
                "qty": qty,
            }
        ),
    )
    return False
