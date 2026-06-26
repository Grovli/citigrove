"""Cloud Tasks enqueue helper — delayed-task dispatcher (RSVP reminders).

STUB in v1: callers gate on `settings.task_invoker_sa_email` (unset → they never
reach here and treat reminders as a no-op). When wired, this creates a delayed
HTTP task targeting `handler_path` with an OIDC token signed by the invoker SA.
Until then it logs intent and returns a synthetic task name. Designed to be
wrapped in try/except by callers — a reminder enqueue must never fail a request.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from app.core.config import settings
from app.core.logging import _logfmt

logger = logging.getLogger(__name__)


async def enqueue(
    *,
    queue: str,
    handler_path: str,
    payload: dict[str, Any],
    schedule_delay_seconds: int = 0,
) -> Optional[str]:
    """Enqueue a delayed Cloud Tasks HTTP task hitting `handler_path`.

    STUB: logs and returns a synthetic task name. Replace the body with a real
    `google.cloud.tasks_v2` `CreateTask` (HTTP target + OIDC token + schedule
    time) when the invoker SA is provisioned.
    """
    base = (getattr(settings, "service_base_url", "") or "").rstrip("/")
    target = f"{base}{handler_path}" if base else handler_path
    logger.info(
        "%s",
        _logfmt(
            {
                "event": "cloud_tasks.enqueue_stub",
                "queue": queue,
                "target": target,
                "delay_seconds": schedule_delay_seconds,
                "payload_keys": ",".join(sorted(payload.keys())),
            }
        ),
    )
    return f"stub:{queue}:{handler_path}"
