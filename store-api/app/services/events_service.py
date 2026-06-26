"""Events domain service — geo discovery, atomic RSVP/waitlist, reminder enqueue.

Owns every server-authoritative invariant for events: $geoNear discovery,
atomic capacity-vs-waitlist RSVP transitions, FIFO waitlist promotion on leave,
and the (stubbed) 24h APNs RSVP-reminder enqueue via Cloud Tasks. Counters
(``rsvpCount``/``waitlistCount``/``capacityFull``) and RSVP ``status``/``position``
are recomputed and persisted here on every mutation — clients render, never recompute.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
from app.core.cloud_tasks import enqueue
from app.core.database.db import async_db
from app.core.logging import AppError, _logfmt, _user_tag
from app.core.observability import record
from app.core.timeutils import utc_now

logger = logging.getLogger(__name__)

# Reminder lead time before an event starts.
_REMINDER_LEAD = timedelta(hours=24)


def _oid(value: str) -> ObjectId:
    """Parse a string id into an ObjectId, raising a clean NOT_FOUND on garbage."""
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise AppError(404, "NOT_FOUND", "Event not found")


def _serialize_event(doc: dict[str, Any], *, distance_meters: Optional[float] = None) -> dict[str, Any]:
    """Render a stored event document at the serve boundary (never leak ObjectId)."""
    out = dict(doc)
    _id = out.pop("_id", None)
    if _id is not None:
        out["id"] = str(_id)
    if distance_meters is not None:
        out["distance_meters"] = distance_meters
    capacity = int(out.get("capacity") or 0)
    rsvp_count = int(out.get("rsvpCount") or 0)
    out["capacityFull"] = bool(capacity > 0 and rsvp_count >= capacity)
    return out


def _serialize_rsvp(doc: dict[str, Any]) -> dict[str, Any]:
    """Render a stored rsvp document at the serve boundary."""
    out = dict(doc)
    _id = out.pop("_id", None)
    if _id is not None:
        out["id"] = str(_id)
    return out


async def get_event(event_id: str) -> dict[str, Any]:
    """Fetch a single published/visible event by id, or raise NOT_FOUND."""
    doc = await async_db.events.find_one({"_id": _oid(event_id)})
    if not doc:
        raise AppError(404, "NOT_FOUND", "Event not found")
    return _serialize_event(doc)


async def nearby(
    *,
    lng: float,
    lat: float,
    radius_meters: float = 50_000.0,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """Discover published, upcoming events near a point, nearest-first.

    Uses $geoNear on the 2dsphere ``events.location`` ([lng, lat]); projects the
    geodesic ``distance_meters``. Filters to ``status='published'`` and
    ``startsAt >= now`` so past/draft events never surface.
    """
    now = utc_now()
    pipeline: list[dict[str, Any]] = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [float(lng), float(lat)]},
                "distanceField": "distance_meters",
                "maxDistance": float(radius_meters),
                "spherical": True,
                "query": {"status": "published", "startsAt": {"$gte": now}},
            }
        },
        {"$sort": {"distance_meters": ASCENDING}},
        {"$limit": int(limit)},
    ]
    cursor = await async_db.events.aggregate(pipeline)
    docs = await cursor.to_list(length=int(limit))
    out: list[dict[str, Any]] = []
    for doc in docs:
        out.append(_serialize_event(doc, distance_meters=doc.get("distance_meters")))
    return out


async def list_mine(user_id: str) -> list[dict[str, Any]]:
    """Return the caller's RSVPs (any non-cancelled status), newest-first."""
    cursor = async_db.event_rsvps.find(
        {"userId": user_id, "status": {"$ne": "cancelled"}}
    ).sort("createdAt", -1)
    docs = await cursor.to_list(length=500)
    return [_serialize_rsvp(d) for d in docs]


async def _next_waitlist_position(event_id: str) -> int:
    """FIFO ordinal for the next waitlisted seat (max existing position + 1)."""
    cursor = (
        async_db.event_rsvps.find(
            {"eventId": event_id, "status": "waitlisted"},
            {"position": 1},
        )
        .sort("position", -1)
        .limit(1)
    )
    docs = await cursor.to_list(length=1)
    if docs and docs[0].get("position") is not None:
        return int(docs[0]["position"]) + 1
    return 0


async def rsvp_join(event_id: str, user_id: str, guests: int = 0) -> dict[str, Any]:
    """Join an event — atomically confirmed-or-waitlisted, capacity-safe.

    The unique ``(eventId, userId)`` index is the durable dedup gate: a redelivered
    or double-tapped insert raises DuplicateKey, handled idempotently as ALREADY_RSVPD.
    Confirmation vs waitlist is decided by a single ``find_one_and_update`` that
    increments ``rsvpCount`` ONLY while ``rsvpCount < capacity`` (capacity > 0); on a
    full event we increment ``waitlistCount`` and assign a FIFO ``position``.
    """
    guests = max(0, int(guests))
    party_size = 1 + guests
    now = utc_now()

    event = await async_db.events.find_one({"_id": _oid(event_id)})
    if not event:
        raise AppError(404, "NOT_FOUND", "Event not found")
    if event.get("status") != "published":
        raise AppError(404, "NOT_FOUND", "Event not found")

    capacity = int(event.get("capacity") or 0)

    # Seed the rsvp row first; the unique index makes the double-RSVP a hard conflict.
    rsvp_doc = {
        "eventId": event_id,
        "userId": user_id,
        "status": "confirmed",  # provisional; corrected below per the atomic counter result
        "position": None,
        "guests": guests,
        "party_size": party_size,
        "createdAt": now,
        "updatedAt": now,
    }
    try:
        insert_res = await async_db.event_rsvps.insert_one(rsvp_doc)
    except DuplicateKeyError:
        logger.warning(
            "%s",
            _logfmt(
                {
                    "event": "events.rsvp.conflict",
                    "reason": "already_rsvpd",
                    "user_tag": _user_tag(user_id),
                    "event_id": event_id,
                }
            ),
        )
        record("citigrove.events.rsvp.conflict")
        raise AppError(409, "ALREADY_RSVPD", "You have already RSVP'd to this event")

    rsvp_id = insert_res.inserted_id

    try:
        if capacity > 0:
            # Confirm only while a seat remains.
            updated = await async_db.events.find_one_and_update(
                {"_id": _oid(event_id), "rsvpCount": {"$lt": capacity}},
                {"$inc": {"rsvpCount": 1}, "$set": {"updatedAt": now}},
                return_document=ReturnDocument.AFTER,
            )
        else:
            # Unlimited capacity — always confirm.
            updated = await async_db.events.find_one_and_update(
                {"_id": _oid(event_id)},
                {"$inc": {"rsvpCount": 1}, "$set": {"updatedAt": now}},
                return_document=ReturnDocument.AFTER,
            )
    except Exception:
        # Roll back the orphaned rsvp row so a retry can re-join cleanly.
        await async_db.event_rsvps.delete_one({"_id": rsvp_id})
        raise

    if updated is not None:
        # Confirmed seat secured.
        new_count = int(updated.get("rsvpCount") or 0)
        capacity_full = bool(capacity > 0 and new_count >= capacity)
        await async_db.events.update_one(
            {"_id": _oid(event_id)}, {"$set": {"capacityFull": capacity_full}}
        )
        await async_db.event_rsvps.update_one(
            {"_id": rsvp_id},
            {"$set": {"status": "confirmed", "position": None, "updatedAt": now}},
        )
        record("citigrove.events.rsvp.confirmed")
        logger.info(
            "%s",
            _logfmt(
                {
                    "event": "events.rsvp.confirmed",
                    "user_tag": _user_tag(user_id),
                    "event_id": event_id,
                    "rsvp_count": new_count,
                    "party_size": party_size,
                }
            ),
        )
        event_doc = updated
    else:
        # Capacity full → waitlist this RSVP with a FIFO position.
        position = await _next_waitlist_position(event_id)
        updated_wl = await async_db.events.find_one_and_update(
            {"_id": _oid(event_id)},
            {
                "$inc": {"waitlistCount": 1},
                "$set": {"capacityFull": True, "updatedAt": now},
            },
            return_document=ReturnDocument.AFTER,
        )
        await async_db.event_rsvps.update_one(
            {"_id": rsvp_id},
            {"$set": {"status": "waitlisted", "position": position, "updatedAt": now}},
        )
        record("citigrove.events.rsvp.waitlisted")
        logger.warning(
            "%s",
            _logfmt(
                {
                    "event": "events.rsvp.capacity_full",
                    "user_tag": _user_tag(user_id),
                    "event_id": event_id,
                    "position": position,
                    "waitlist_count": int((updated_wl or {}).get("waitlistCount") or 0),
                }
            ),
        )
        event_doc = updated_wl or event

    # Best-effort 24h reminder enqueue (stub until Cloud Tasks SA is wired).
    starts_at = event_doc.get("startsAt") if event_doc else event.get("startsAt")
    if isinstance(starts_at, datetime):
        await enqueue_rsvp_reminder(event_id, user_id, starts_at - _REMINDER_LEAD)

    rsvp_out = await async_db.event_rsvps.find_one({"_id": rsvp_id})
    return {
        "rsvp": _serialize_rsvp(rsvp_out or rsvp_doc),
        "event": _serialize_event(event_doc or event),
    }


async def rsvp_leave(event_id: str, user_id: str) -> dict[str, Any]:
    """Leave an event — cancel the RSVP, decrement the right counter, promote waitlist.

    If a *confirmed* seat is freed and a waitlist exists, the lowest-``position``
    waitlisted RSVP is promoted to CONFIRMED atomically and the counters move in
    lock-step. Idempotent: leaving when not joined is a clean no-op returning the event.
    """
    now = utc_now()
    _oid(event_id)  # validate shape early

    rsvp = await async_db.event_rsvps.find_one(
        {"eventId": event_id, "userId": user_id, "status": {"$ne": "cancelled"}}
    )
    if not rsvp:
        # Not joined (or already left) — render current event state idempotently.
        event = await async_db.events.find_one({"_id": _oid(event_id)})
        if not event:
            raise AppError(404, "NOT_FOUND", "Event not found")
        return {"event": _serialize_event(event)}

    was_confirmed = rsvp.get("status") == "confirmed"

    # Cancel the caller's RSVP.
    await async_db.event_rsvps.update_one(
        {"_id": rsvp["_id"]},
        {"$set": {"status": "cancelled", "position": None, "updatedAt": now}},
    )

    if was_confirmed:
        await async_db.events.update_one(
            {"_id": _oid(event_id), "rsvpCount": {"$gt": 0}},
            {"$inc": {"rsvpCount": -1}, "$set": {"updatedAt": now}},
        )
    else:
        await async_db.events.update_one(
            {"_id": _oid(event_id), "waitlistCount": {"$gt": 0}},
            {"$inc": {"waitlistCount": -1}, "$set": {"updatedAt": now}},
        )

    record("citigrove.events.rsvp.left")
    logger.info(
        "%s",
        _logfmt(
            {
                "event": "events.rsvp.left",
                "user_tag": _user_tag(user_id),
                "event_id": event_id,
                "was_confirmed": was_confirmed,
            }
        ),
    )

    # Promote the head of the waitlist into the freed confirmed seat.
    if was_confirmed:
        promoted = await async_db.event_rsvps.find_one_and_update(
            {"eventId": event_id, "status": "waitlisted"},
            {"$set": {"status": "confirmed", "position": None, "updatedAt": now}},
            sort=[("position", ASCENDING)],
            return_document=ReturnDocument.AFTER,
        )
        if promoted is not None:
            await async_db.events.update_one(
                {"_id": _oid(event_id)},
                {
                    "$inc": {"rsvpCount": 1, "waitlistCount": -1},
                    "$set": {"updatedAt": now},
                },
            )
            logger.info(
                "%s",
                _logfmt(
                    {
                        "event": "events.rsvp.promoted",
                        "user_tag": _user_tag(promoted.get("userId")),
                        "event_id": event_id,
                    }
                ),
            )

    # Recompute and persist capacityFull from the authoritative post-mutation counts.
    event = await async_db.events.find_one({"_id": _oid(event_id)})
    if not event:
        raise AppError(404, "NOT_FOUND", "Event not found")
    capacity = int(event.get("capacity") or 0)
    rsvp_count = int(event.get("rsvpCount") or 0)
    capacity_full = bool(capacity > 0 and rsvp_count >= capacity)
    if capacity_full != bool(event.get("capacityFull")):
        await async_db.events.update_one(
            {"_id": _oid(event_id)}, {"$set": {"capacityFull": capacity_full}}
        )
        event["capacityFull"] = capacity_full

    return {"event": _serialize_event(event)}


async def enqueue_rsvp_reminder(
    event_id: str, user_id: str, send_at: datetime
) -> Optional[str]:
    """Enqueue a 24h-before APNs reminder via Cloud Tasks — STUB in v1.

    When ``task_invoker_sa_email`` is unset (no OIDC signer), this is a logged no-op
    (INFO ``event=events.reminder.enqueue_stub``) and returns None — never raises, so a
    missing reminder can never fail an RSVP. When wired, it dispatches a delayed task to
    ``/internal/tasks/rsvp-reminder``; the handler is also a stub that validates the
    Cloud Tasks OIDC invoker, logs, and 200s.
    """
    now = utc_now()
    delay_seconds = max(0, int((send_at - now).total_seconds()))

    if not settings.task_invoker_sa_email:
        logger.info(
            "%s",
            _logfmt(
                {
                    "event": "events.reminder.enqueue_stub",
                    "user_tag": _user_tag(user_id),
                    "event_id": event_id,
                    "delay_seconds": delay_seconds,
                }
            ),
        )
        return None

    try:
        task_name = await enqueue(
            queue=settings.rsvp_reminder_queue,
            handler_path="/internal/tasks/rsvp-reminder",
            payload={
                "event_id": event_id,
                "user_id": user_id,
                "send_at": send_at.isoformat(),
            },
            schedule_delay_seconds=delay_seconds,
        )
    except Exception as exc:  # never let a reminder enqueue break the request path
        logger.warning(
            "%s",
            _logfmt(
                {
                    "event": "events.reminder.enqueue_failed",
                    "user_tag": _user_tag(user_id),
                    "event_id": event_id,
                    "error": str(exc),
                }
            ),
        )
        return None

    logger.info(
        "%s",
        _logfmt(
            {
                "event": "events.reminder.enqueued",
                "user_tag": _user_tag(user_id),
                "event_id": event_id,
                "task": str(task_name),
                "delay_seconds": delay_seconds,
            }
        ),
    )
    return str(task_name) if task_name else None
