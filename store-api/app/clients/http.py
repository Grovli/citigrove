"""Shared httpx helpers — service-to-service timeouts + internal Google OIDC.

`shared_timeout()` is the standard timeout for internal-ingress calls.
`internal_oidc_headers(audience)` mints a Google-signed OIDC identity token for
calling a private Cloud Run service (audience = the callee's URL). Best-effort:
returns {} on any failure (fail-open on OIDC — the X-Internal-Key remains the
primary credential at the callee).

NOTE (Phase 2 TODO): the payments client currently sets the user JWT on
`Authorization` and then merges these OIDC headers, which would overwrite it.
When wiring real internal-ingress auth, forward the user JWT on a distinct header
(e.g. `X-Forwarded-Authorization`) and reserve `Authorization` for the OIDC token.
"""
from __future__ import annotations

import logging

import httpx

from app.core.logging import _logfmt

logger = logging.getLogger(__name__)


def shared_timeout() -> httpx.Timeout:
    """Standard connect/read/write/pool timeout for internal calls."""
    return httpx.Timeout(connect=5.0, read=20.0, write=10.0, pool=5.0)


def internal_oidc_headers(audience: str) -> dict[str, str]:
    """Google-signed OIDC identity-token header for a private Cloud Run callee.

    Returns `{"Authorization": "Bearer <id_token>"}` on success, or `{}` on any
    failure (fail-open on OIDC). The audience MUST be the callee's base URL.
    """
    try:
        import google.auth.transport.requests
        import google.oauth2.id_token

        request = google.auth.transport.requests.Request()
        token = google.oauth2.id_token.fetch_id_token(request, audience)
        return {"Authorization": f"Bearer {token}"} if token else {}
    except Exception as exc:  # noqa: BLE001 — fail-open on OIDC mint failure
        logger.info(
            "%s",
            _logfmt({"event": "http.oidc.mint_failed", "audience": audience, "error": str(exc)}),
        )
        return {}
