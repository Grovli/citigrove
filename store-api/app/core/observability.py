"""Lazy, fail-open OpenTelemetry metric factories.

Mirrors Grovli's dedup-observability idiom: meter/counter/histogram creation
and every emit are wrapped so a telemetry failure NEVER breaks a request. If
OTel isn't wired, all factories return None and ``record_*`` helpers no-op.

Auto-instrumentation (fastapi/httpx/pymongo spans) is installed by
``opentelemetry-bootstrap -a install`` at image build + granian ``OTEL_*`` env
— there is no in-code SDK init beyond these lazy meters.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def _meter():
    """Lazy OTel meter for the store/events fleet; None when otel is absent."""
    try:
        from opentelemetry import metrics
        return metrics.get_meter("citigrove.store")
    except Exception:
        return None


@lru_cache(maxsize=32)
def _counter(name: str, description: str, unit: str = "1"):
    """Lazily create (and memoize) an OTel counter; None on any failure."""
    meter = _meter()
    if meter is None:
        return None
    try:
        return meter.create_counter(name=name, description=description, unit=unit)
    except Exception:
        return None


@lru_cache(maxsize=16)
def _histogram(name: str, description: str, unit: str = "ms"):
    """Lazily create (and memoize) an OTel histogram; None on any failure."""
    meter = _meter()
    if meter is None:
        return None
    try:
        return meter.create_histogram(name=name, description=description, unit=unit)
    except Exception:
        return None


def record_count(
    name: str,
    description: str = "",
    *,
    amount: int = 1,
    attributes: Optional[dict] = None,
    unit: str = "1",
) -> None:
    """Add to a counter. Best-effort — never raises into the request path."""
    c = _counter(name, description or name, unit)
    if c is None:
        return
    try:
        c.add(amount, attributes or {})
    except Exception:
        pass


def record_duration(
    name: str,
    value_ms: float,
    description: str = "",
    *,
    attributes: Optional[dict] = None,
) -> None:
    """Record a duration sample (ms). Best-effort — never raises."""
    h = _histogram(name, description or name, "ms")
    if h is None:
        return
    try:
        h.record(float(value_ms), attributes or {})
    except Exception:
        pass


def record(name: str, amount: float = 1, **attributes: object) -> None:
    """Convenience counter: `record("metric", value, label=...)` -> record_count.
    Unifies the call sites across services/routers. Best-effort (never raises)."""
    record_count(name, amount=int(amount), attributes=attributes or None)
