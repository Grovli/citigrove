"""Events HTTP router — geo discovery, detail, RSVP join/leave, and the caller's RSVPs.

Public reads (`/nearby`, `/{id}`) need no auth; RSVP mutations and `/mine` are
user-self-scoped via the verified `sub`. All capacity/waitlist/counter logic is
server-owned in `events_service`; handlers just shape requests and render results.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, Field

from app.core.auth import require_user
from app.services import events_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["events"])


class RsvpJoinBody(BaseModel):
    guests: int = Field(default=0, ge=0)


@router.get("/nearby")
async def get_nearby(
    lng: float = Query(..., ge=-180.0, le=180.0),
    lat: float = Query(..., ge=-90.0, le=90.0),
    radius_m: float = Query(50_000.0, gt=0.0, le=200_000.0),
    limit: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    """Published, upcoming events near a point, nearest-first (with distance_meters)."""
    events = await events_service.nearby(
        lng=lng, lat=lat, radius_meters=radius_m, limit=limit
    )
    return {"events": events}


@router.get("/mine")
async def get_mine(request: Request) -> dict[str, Any]:
    """The caller's RSVPs (any non-cancelled status), newest-first."""
    sub = require_user(request)
    rsvps = await events_service.list_mine(sub)
    return {"rsvps": rsvps}


@router.get("/{event_id}")
async def get_event(event_id: str) -> dict[str, Any]:
    """A single event by id (server-owned counts + capacityFull)."""
    return await events_service.get_event(event_id)


@router.post("/{event_id}/rsvp")
async def join_event(
    event_id: str, request: Request, body: Optional[RsvpJoinBody] = None
) -> dict[str, Any]:
    """RSVP to an event — confirmed or waitlisted, decided server-side."""
    sub = require_user(request)
    guests = body.guests if body is not None else 0
    return await events_service.rsvp_join(event_id, sub, guests=guests)


@router.delete("/{event_id}/rsvp")
async def leave_event(event_id: str, request: Request) -> dict[str, Any]:
    """Leave an event — promotes the head of the waitlist if a seat frees."""
    sub = require_user(request)
    return await events_service.rsvp_leave(event_id, sub)
