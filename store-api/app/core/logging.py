"""Structured logging (logfmt), non-PII user tags, and the domain error model.

Two concerns share this module per the build spec §6:

  * ``_logfmt`` / ``_user_tag`` — render structured ``event=<dotted.name>``
    log lines that Loki parses with ``| logfmt``. Every structured log MUST
    carry an ``event=`` token. Shape matches Grovli's dedup observability so
    the same dashboard convention keeps working.
  * ``AppError`` + stable ``code`` constants — domain errors carrying an HTTP
    status + structured detail. ``main.py`` registers an exception handler
    that renders these as ``{"detail": {"code", "message", ...}}``.
"""
from __future__ import annotations

import hashlib
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


# ── Structured logging helpers ───────────────────────────────────────────────


def _user_tag(user_id: Optional[str]) -> str:
    """Low-cardinality, non-PII user tag (8-char SHA1 prefix); "anon" if None.

    The full Auth0 ``sub`` is never emitted in logs — only this hashed prefix —
    so Loki series cardinality stays bounded and no PII leaks.
    """
    if not user_id:
        return "anon"
    return hashlib.sha1(user_id.encode("utf-8")).hexdigest()[:8]


def _logfmt(payload: dict[str, Any]) -> str:
    """Render a payload dict as logfmt — ``key=value key="quoted"`` pairs.

    Loki's ``| logfmt`` parser reads ``key=value`` from each line and exposes
    every key as a queryable label. Values are coerced: bools -> ``true``/
    ``false``, None -> empty string, ints/floats -> ``str``. Any value
    containing whitespace, ``=``, ``"``, newline, or tab is double-quoted with
    inner quotes/backslashes escaped so the parser never chokes.
    """
    parts: list[str] = []
    for k, v in payload.items():
        if v is None:
            sv = ""
        elif isinstance(v, bool):
            sv = "true" if v else "false"
        elif isinstance(v, (int, float)):
            sv = str(v)
        else:
            sv = str(v)
        if any(ch in sv for ch in (" ", "=", '"', "\n", "\t")):
            sv = '"' + sv.replace("\\", "\\\\").replace('"', '\\"') + '"'
        parts.append(f"{k}={sv}")
    return " ".join(parts)


# ── Domain error model ───────────────────────────────────────────────────────
#
# Stable error codes (UPPER_SNAKE). Clients branch on these; never reword the
# string values once shipped. Generators raise ``AppError`` and ``main.py``
# renders ``{"detail": {"code", "message", ...extra}}`` with the carried status.

PRICING_ERROR = "PRICING_ERROR"
OUT_OF_STOCK = "OUT_OF_STOCK"
INVENTORY_CONFLICT = "INVENTORY_CONFLICT"
PAYMENT_NOT_SETTLED = "PAYMENT_NOT_SETTLED"
AMOUNT_MISMATCH = "AMOUNT_MISMATCH"
PAYMENTS_UNAVAILABLE = "PAYMENTS_UNAVAILABLE"
SHIPPING_UNAVAILABLE = "SHIPPING_UNAVAILABLE"
TAX_UNAVAILABLE = "TAX_UNAVAILABLE"
EVENT_FULL = "EVENT_FULL"
ALREADY_RSVPD = "ALREADY_RSVPD"
NOT_FOUND = "NOT_FOUND"
FORBIDDEN = "FORBIDDEN"
INVALID_BODY = "INVALID_BODY"


class AppError(Exception):
    """Domain error carrying an HTTP status + structured detail.

    ``code`` is one of the stable UPPER_SNAKE constants above; ``message`` is a
    human-readable string; ``extra`` carries any additional structured fields
    (e.g. ``sku``, ``expected_cents``). The ``main.py`` handler converts this to
    ``HTTPException(status_code, detail={"code", "message", **extra})``.
    """

    def __init__(self, status_code: int, code: str, message: str, **extra: Any) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.extra = extra
        super().__init__(f"{code}: {message}")

    def detail(self) -> dict[str, Any]:
        """Structured ``detail`` body: ``{code, message, **extra}``."""
        return {"code": self.code, "message": self.message, **self.extra}
