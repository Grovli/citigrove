"""Event + RSVP models for citigrove-store-api.

Events store their location as a GeoJSON Point with [lng, lat] order (lng FIRST)
for the 2dsphere index and $geoNear discovery. Capacity, waitlist, RSVP counts,
and waitlist positions are all server-owned and recomputed on every join/leave —
clients render them and never recompute capacity-full or waitlist locally.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models.common import RsvpStatus
from app.models.orders import Address


class GeoPoint(BaseModel):
    """GeoJSON Point. coordinates are [lng, lat] — longitude FIRST."""

    type: str = "Point"
    coordinates: list[float]  # [lng, lat] — lng FIRST (GeoJSON)


class Event(BaseModel):
    """A host-curated event. Capacity/waitlist/count fields are server-owned."""

    id: str
    title: str
    description: str = ""
    hostId: str  # admin `sub` who created it (host-curated v1)
    venue_name: str | None = None
    address: Address | None = None
    location: GeoPoint  # 2dsphere-indexed
    startsAt: datetime
    endsAt: datetime | None = None
    timezone: str = "America/New_York"
    capacity: int = Field(ge=0)  # >= 0; 0 == unlimited
    rsvpCount: int = 0  # SERVER-OWNED derived (confirmed count)
    waitlistCount: int = 0  # SERVER-OWNED derived
    capacityFull: bool = False  # SERVER-OWNED derived (rsvpCount >= capacity, capacity>0)
    cover_image_url: str | None = None
    price_cents: int = 0  # 0 == free RSVP (paid events out of v1 scope; field reserved)
    status: str = "published"  # draft|published|cancelled
    distance_meters: float | None = None  # populated ONLY on /events/nearby ($geoNear)
    created_at: datetime
    updated_at: datetime


class Rsvp(BaseModel):
    """A user's RSVP to an event. Owner key userId is unique with eventId."""

    id: str
    eventId: str
    userId: str  # verified `sub` (owner key; unique with eventId)
    status: RsvpStatus  # SERVER-OWNED (confirmed vs waitlisted)
    position: int | None = None  # waitlist FIFO ordinal; None when confirmed
    guests: int = 0  # additional guests (>= 0); counts toward capacity if used
    party_size: int = 1  # 1 + guests (server-computed)
    created_at: datetime
    updated_at: datetime
