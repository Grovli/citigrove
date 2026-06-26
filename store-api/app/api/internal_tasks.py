"""Internal Cloud Tasks handlers — /internal/tasks/*.

STUB in v1: the rsvp-reminder handler logs + 200s. The Cloud Tasks OIDC-invoker
validation and the actual APNs send are wired with the push pipeline (Phase 2+).
Until then `enqueue` is gated on `task_invoker_sa_email` so this is unreachable
in normal operation.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Request

from app.core.logging import _logfmt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/tasks", tags=["internal"])


@router.post("/rsvp-reminder")
async def rsvp_reminder(request: Request) -> dict:
    """Delayed APNs RSVP reminder target. STUB — validates the Cloud Tasks OIDC
    invoker + sends the push once the pipeline lands; for now logs and 200s so a
    retrying queue drains cleanly."""
    try:
        body = await request.json()
    except Exception:  # noqa: BLE001
        body = {}
    logger.info(
        "%s",
        _logfmt(
            {
                "event": "internal.rsvp_reminder.received",
                "event_id": body.get("event_id"),
                "has_user": bool(body.get("user_id")),
            }
        ),
    )
    return {"status": "ok"}
