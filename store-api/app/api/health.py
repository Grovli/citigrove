"""Health probe — GET /health (no prefix)."""
from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    """Liveness probe. Cheap + dependency-free so the Cloud Run health check
    never depends on Mongo/Stripe being reachable."""
    return {"status": "ok", "service": settings.service_name}
