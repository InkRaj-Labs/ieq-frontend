"""
IEQ System Router
GET /ieq/system
GET /ieq/events  (SSE stream)
"""

import asyncio
import json
import logging
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.services.system_monitor import get_system_stats
from app.core.events import event_bus

router = APIRouter()
logger = logging.getLogger("ieq.system")


@router.get("/system")
async def system_stats():
    """Real-time hardware monitoring."""
    stats = await get_system_stats()
    return stats


@router.get("/events")
async def sse_events():
    """SSE stream of real-time activity events."""

    async def generate():
        q = event_bus.subscribe()
        try:
            # Send recent history first
            for event in reversed(event_bus.recent(10)):
                yield f"data: {json.dumps(event)}\n\n"

            # Stream new events
            while True:
                try:
                    event = await asyncio.wait_for(q.get(), timeout=30.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        finally:
            event_bus.unsubscribe(q)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
