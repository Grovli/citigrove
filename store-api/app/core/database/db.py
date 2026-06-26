"""MongoDB async client singleton + collection accessors.

One ``AsyncMongoClient`` per event loop (FastAPI runs a single loop; threadpool
and task workers may create others). Collections are reached via the
``async_db`` singleton, e.g. ``async_db.store_products``. A NEW collection
AttributeErrors unless its ``@property`` accessor is added below — that is the
durable Grovli rule, mirrored here.
"""
from __future__ import annotations

import asyncio
import logging

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings

logger = logging.getLogger(__name__)


# ── Async client (per-event-loop cache) ──────────────────────────────────────
#
# AsyncMongoClient is bound to the event loop it was created on. We cache one
# client per loop id so threadpool-run / task-runner loops never reuse a client
# bound to a different loop.
_async_clients: dict[int, AsyncMongoClient] = {}


def _async_client() -> AsyncMongoClient:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    loop_id = id(loop) if loop else 0

    if loop_id not in _async_clients:
        logger.debug("Creating async MongoDB connection for event loop %s", loop_id)
        _async_clients[loop_id] = AsyncMongoClient(
            settings.mongo_uri, maxPoolSize=100, minPoolSize=10
        )
    return _async_clients[loop_id]


def get_async_db() -> AsyncDatabase:
    """Return the async citigrove database."""
    return _async_client()[settings.mongo_db]


def get_async_collection(name: str):
    """Async collection helper."""
    return get_async_db()[name]


class AsyncCollections:
    """Lazy async collection references.

    Subscript (``async_db["name"]``) reaches any collection; the ``@property``
    accessors are the canonical, typo-proof handles for the four v1
    collections. ADDING A NEW COLLECTION REQUIRES ITS ``@property`` HERE.
    """

    def __getitem__(self, name: str):
        return get_async_collection(name)

    @property
    def store_products(self):
        return get_async_collection("store_products")

    @property
    def store_orders(self):
        return get_async_collection("store_orders")

    @property
    def events(self):
        return get_async_collection("events")

    @property
    def event_rsvps(self):
        return get_async_collection("event_rsvps")


async_db = AsyncCollections()
