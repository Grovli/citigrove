"""Auth0 RS256 JWT verification + FastAPI auth dependencies.

Every user/admin route resolves identity from a verified Auth0 Bearer token —
never a client-supplied ``user-id`` header (forgeable; IDOR). The store/events
surfaces are user-self-scoped: the verified ``sub`` is the canonical owner key
on orders and RSVPs.

Webhook endpoints (Stripe, Shippo) and ``/internal/*`` (Cloud Tasks) do NOT use
these helpers — they use signature / OIDC validators instead.
"""
from __future__ import annotations

import logging
from typing import Optional

import jwt
from jwt import PyJWKClient, PyJWKClientError, PyJWTError
from fastapi import Depends, HTTPException, Request

from app.core.config import settings

logger = logging.getLogger(__name__)


# ── JWKS client — module-level lazy singleton ────────────────────────────────
#
# PyJWKClient caches signing keys in-process; an unknown ``kid`` triggers a
# fresh JWKS fetch automatically. ``timeout=5`` is MANDATORY: without it
# ``fetch_data()`` uses urllib with no socket timeout and can hang ~75s on a
# briefly-unreachable JWKS endpoint — long enough to trip the worker timeout
# and SIGABRT the process.
_jwks_client: Optional[PyJWKClient] = None


def _get_jwks_client() -> PyJWKClient:
    """Lazy-init the JWKS client; fail-closed 500 if AUTH0_DOMAIN is unset."""
    global _jwks_client
    if _jwks_client is None:
        domain = (settings.auth0_domain or "").strip()
        if not domain:
            raise HTTPException(
                status_code=500,
                detail="AUTH0_DOMAIN not configured — auth verification disabled",
            )
        url = f"https://{domain}/.well-known/jwks.json"
        _jwks_client = PyJWKClient(
            url,
            cache_keys=True,
            lifespan=86400,
            timeout=5,
        )
    return _jwks_client


def verify_jwt(token: str) -> dict:
    """Verify an Auth0-issued JWT and return its claims.

    Validates the RS256 signature against JWKS, ``aud == AUTH0_AUDIENCE``,
    ``iss == https://{domain}/``, and ``exp`` in the future. Raises 401 on any
    verification failure (the specific reason is logged, never leaked in the
    response). Raises 500 when AUTH0_* is unconfigured (deploy fault).
    """
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    audience = (settings.auth0_audience or "").strip()
    issuer = settings.auth0_issuer
    if not audience or issuer == "https:///":
        raise HTTPException(
            status_code=500,
            detail="AUTH0_AUDIENCE / AUTH0_DOMAIN not configured",
        )

    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=audience,
            issuer=issuer,
        )
    except PyJWKClientError as exc:
        # Unknown kid / JWKS unreachable / malformed key.
        logger.warning("JWKS lookup failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid token (jwks)") from exc
    except PyJWTError as exc:
        # Signature / exp / aud / iss mismatch — log for us, opaque to client.
        logger.info("JWT verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    return claims


def _bearer_from_request(request: Request) -> Optional[str]:
    """Pull a normalized bearer token off the request; None if absent/malformed."""
    raw = request.headers.get("authorization") or request.headers.get("Authorization")
    if not raw:
        return None
    parts = raw.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip() or None


def get_principal(request: Request) -> dict:
    """Return the full verified claim set; 401 on missing/invalid bearer."""
    token = _bearer_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return verify_jwt(token)


def require_user(request: Request) -> str:
    """Return the verified Auth0 ``sub`` (the canonical user id); 401 if unauth'd.

    This service's primary user dependency. NEVER trusts a ``user-id`` header —
    identity is strictly the token's verified ``sub``.
    """
    token = _bearer_from_request(request)
    if not token:
        raise HTTPException(status_code=401, detail="Missing or invalid bearer token")
    claims = verify_jwt(token)
    sub = claims.get("sub")
    if not isinstance(sub, str) or not sub:
        raise HTTPException(status_code=401, detail="Missing or invalid bearer token")
    return sub


def require_admin(request: Request) -> dict:
    """Verify the JWT, then assert a verified ``@citigrove.com`` email; else 403.

    Fail-closed: requires ``email_verified is True`` AND the email's domain in
    ``settings.allowed_admin_domains``. Returns the full claim set on success.
    """
    claims = get_principal(request)
    if claims.get("email_verified") is not True:
        raise HTTPException(status_code=403, detail="Admin access requires a verified email")
    email = (claims.get("email") or "").lower()
    domain = email.rsplit("@", 1)[-1] if "@" in email else ""
    if not email or domain not in settings.allowed_admin_domains:
        raise HTTPException(
            status_code=403,
            detail="Admin access requires a @citigrove.com email",
        )
    return claims


# ── Convenience Depends exports for routers ──────────────────────────────────
RequireUser = Depends(require_user)
RequirePrincipal = Depends(get_principal)
RequireAdmin = Depends(require_admin)
