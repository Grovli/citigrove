"""Shared pytest fixtures for citigrove-store-api.

Provides a default test environment (so importing app modules that read
``settings`` does not blow up) and an ASGI transport client bound to the
FastAPI app. Mongo/Stripe/Shippo/payments network calls are NOT made by
the unit tests here — those are integration-tier and run against the
live deploy.
"""
from __future__ import annotations

import os

import pytest

# Ensure a deterministic test environment before any app import reads it.
os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("MONGO_URI", "mongodb://localhost:27017/citigrove_test")
os.environ.setdefault("MONGO_DB", "citigrove_test")
os.environ.setdefault("AUTH0_DOMAIN", "dev-rw8ff6vxgb7t0i4c.us.auth0.com")
os.environ.setdefault("AUTH0_AUDIENCE", "https://grovli.citigrove.com/audience")
os.environ.setdefault("ALLOWED_ADMIN_DOMAIN", "citigrove.com")
os.environ.setdefault("STRIPE_TAX_ENABLED", "false")


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture()
def app():
    """Import and return the FastAPI app lazily (after env is seeded)."""
    from app.main import app as fastapi_app

    return fastapi_app


@pytest.fixture()
async def client(app):
    """httpx AsyncClient bound to the app via ASGITransport (no network)."""
    import httpx

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as ac:
        yield ac
