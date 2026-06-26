"""Canonical UTC datetime helpers.

Single source of truth for "current time". All code needing a timezone-aware
UTC datetime imports ``utc_now`` from here rather than constructing
``datetime.now(timezone.utc)`` inline — keeps tz-awareness consistent and
makes tests easy to monkey-patch. MongoDB stores datetimes as UTC and we rely
on that invariant everywhere.
"""
from __future__ import annotations

import datetime


def utc_now() -> datetime.datetime:
    """Timezone-aware current UTC datetime."""
    return datetime.datetime.now(datetime.timezone.utc)


def utc_today() -> datetime.date:
    """Current UTC calendar date."""
    return utc_now().date()
