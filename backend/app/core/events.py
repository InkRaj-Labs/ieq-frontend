"""
IEQ Event Bus — in-memory activity event system with DB persistence.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from collections import deque

logger = logging.getLogger("ieq.events")


class EventBus:
    """Simple async event bus with in-memory buffer + DB persistence."""

    def __init__(self, maxlen: int = 500):
        self._buffer: deque = deque(maxlen=maxlen)
        self._subscribers: List[asyncio.Queue] = []
        self._lock = asyncio.Lock()

    async def startup(self):
        logger.info("Event bus started.")

    async def shutdown(self):
        logger.info("Event bus stopped.")

    async def emit(
        self,
        event_type: str,
        title: str,
        service_id: str = "system",
        detail: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        db=None,
    ):
        """Emit an event to all subscribers and persist to DB if available."""
        event = {
            "id": len(self._buffer) + 1,
            "event_type": event_type,
            "service_id": service_id,
            "title": title,
            "detail": detail,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        async with self._lock:
            self._buffer.appendleft(event)

        # Persist to DB
        if db is not None:
            try:
                from app.core.database import ActivityEvent
                row = ActivityEvent(
                    event_type=event_type,
                    service_id=service_id,
                    title=title,
                    detail=detail,
                    metadata=metadata,
                )
                db.add(row)
                await db.flush()
                event["id"] = row.id
            except Exception as e:
                logger.warning(f"Could not persist event: {e}")

        # Notify SSE subscribers
        dead = []
        for q in self._subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self._subscribers.remove(q)

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        try:
            self._subscribers.remove(q)
        except ValueError:
            pass

    def recent(self, limit: int = 50) -> List[Dict]:
        return list(self._buffer)[:limit]


event_bus = EventBus()
