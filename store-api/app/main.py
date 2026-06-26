"""citigrove-store-api — FastAPI application entrypoint.

Wires the app: lifespan (``ensure_indexes`` on startup, non-fatal), CORS +
GZip + a timing-header middleware, the ``AppError`` exception handler, and all
routers in spec order (health, store_products, store_orders, store_shipping,
events, admin, webhooks, internal_tasks). ``/docs`` is gated off in production.
Responses go through ``ORJSONResponse``; handlers just return dicts/models.
"""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse
from starlette.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.logging import AppError, _logfmt

logger = logging.getLogger(__name__)

app_version = "1.00"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown. Ensures Mongo indexes (non-fatal) before serving."""
    try:
        from app.core.database.indexes import ensure_indexes
        await ensure_indexes()
    except Exception as exc:
        # Index creation is best-effort at boot — a transient Mongo blip must
        # not wedge the whole service. Queries still run; the next boot retries.
        logger.warning("%s", _logfmt({"event": "store.startup.ensure_indexes_failed", "error": str(exc)}))
    logger.info("%s", _logfmt({"event": "store.startup.ready", "service": settings.service_name, "version": app_version}))
    yield


# Docs gated OFF in production (mirror Grovli main.py).
_docs_kwargs: dict[str, object] = (
    {"docs_url": None, "redoc_url": None, "openapi_url": None}
    if settings.is_production
    else {}
)

app = FastAPI(
    title="citigrove-store-api",
    version=app_version,
    lifespan=lifespan,
    default_response_class=ORJSONResponse,
    **_docs_kwargs,
)


# ── Middleware ───────────────────────────────────────────────────────────────
#
# Order matters: GZip outermost-of-these so it compresses the final body; the
# timing header wraps the handler to measure full in-app latency.
app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://grovli.citigrove.com",
        "https://citigrove.com",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def _timing_header(request: Request, call_next):
    """Attach an ``X-Process-Time`` (ms) header to every response."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000.0
    response.headers["X-Process-Time"] = f"{elapsed_ms:.2f}"
    return response


# ── Exception handlers ───────────────────────────────────────────────────────
@app.exception_handler(AppError)
async def _app_error_handler(request: Request, exc: AppError) -> ORJSONResponse:
    """Render an ``AppError`` as ``{"detail": {"code", "message", ...}}``.

    Race/conflict/capacity codes are logged at WARNING; everything else INFO,
    per the severity rubric (handled failures are expected/INFO).
    """
    warn_codes = {
        "INVENTORY_CONFLICT",
        "OUT_OF_STOCK",
        "AMOUNT_MISMATCH",
        "EVENT_FULL",
        "ALREADY_RSVPD",
        "PAYMENTS_UNAVAILABLE",
        "SHIPPING_UNAVAILABLE",
        "TAX_UNAVAILABLE",
    }
    line = _logfmt(
        {
            "event": "store.app_error",
            "code": exc.code,
            "status": exc.status_code,
            "path": request.url.path,
        }
    )
    if exc.code in warn_codes:
        logger.warning("%s", line)
    else:
        logger.info("%s", line)
    return ORJSONResponse(status_code=exc.status_code, content={"detail": exc.detail()})


# ── Routers ──────────────────────────────────────────────────────────────────
#
# Imported here (not at top) so a heavy transitive import in any router module
# doesn't slow cold boot before the app object exists. Registration order
# follows the spec.
from app.api.health import router as health_router  # noqa: E402
from app.api.store_products import router as store_products_router  # noqa: E402
from app.api.store_orders import router as store_orders_router  # noqa: E402
from app.api.store_shipping import router as store_shipping_router  # noqa: E402
from app.api.events import router as events_router  # noqa: E402
from app.api.admin import router as admin_router  # noqa: E402
from app.api.webhooks import router as webhooks_router  # noqa: E402
from app.api.internal_tasks import router as internal_tasks_router  # noqa: E402

app.include_router(health_router)
app.include_router(store_products_router)
app.include_router(store_orders_router)
app.include_router(store_shipping_router)
app.include_router(events_router)
app.include_router(admin_router)
app.include_router(webhooks_router)
app.include_router(internal_tasks_router)


@app.get("/")
async def root() -> dict:
    """Liveness/identity root."""
    return {"status": "ok", "service": settings.service_name, "version": app_version}
