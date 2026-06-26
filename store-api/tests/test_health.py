"""Health endpoint smoke test.

Verifies GET /health returns 200 with the service-name + version shape
the spec mandates. Runs in CI (3.13); skips cleanly if the app cannot be
imported in a minimal environment (e.g. an optional dep absent locally).
"""
from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_health_ok(client):
    resp = await client.get("/health")
    assert resp.status_code == 200

    body = resp.json()
    assert body.get("status") == "ok"
    assert body.get("service") == "citigrove-store-api"
    # version is a lowercase string literal app_version; presence is enough.
    assert isinstance(body.get("version"), str)
    assert body["version"]
