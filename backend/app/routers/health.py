"""
IEQ Health & Status Endpoints
GET /ieq/health
GET /ieq/services
GET /ieq/capabilities
GET /ieq/activity
"""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from datetime import datetime, timezone
from typing import Any, Dict, List

from app.core.database import get_db, ActivityEvent
from app.core.events import event_bus
from app.core.config import settings
from app.services.lm_studio import lm_studio
from app.services.qdrant_service import qdrant_service

router = APIRouter()


# ── /ieq/health ───────────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    """System health check."""
    lm_ok = await lm_studio.is_healthy()
    qdrant_ok = await qdrant_service.is_healthy()

    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "lm_studio": "online" if lm_ok else "offline",
            "qdrant": "online" if qdrant_ok else "offline",
            "postgres": "online",
            "redis": "unknown",
        },
    }


# ── /ieq/services ─────────────────────────────────────────────────────────────

@router.get("/services")
async def get_services():
    """Get all registered AI services and their status."""
    lm_ok = await lm_studio.is_healthy()
    qdrant_ok = await qdrant_service.is_healthy()
    raw_models = await lm_studio.list_models()

    # Build model resources
    lm_models = [
        {
            "key": m.get("id", m.get("model", "unknown")),
            "display_name": m.get("id", m.get("model", "Unknown Model")),
            "loaded": True,
            "capabilities": ["chat", "completion"],
        }
        for m in raw_models
    ]

    services = [
        {
            "service_id": "lm_studio",
            "display_name": "LM Studio",
            "status": "online" if lm_ok else "offline",
            "models": lm_models,
            "loras": [],
            "capabilities": {
                "chat": True,
                "streaming": True,
                "embeddings": False,
            },
        },
        {
            "service_id": "qdrant",
            "display_name": "Qdrant Vector DB",
            "status": "online" if qdrant_ok else "offline",
            "models": [],
            "loras": [],
            "capabilities": {
                "rag": True,
                "semantic_search": True,
            },
        },
        {
            "service_id": "image_gen",
            "display_name": f"Image Generation ({settings.IMAGE_BACKEND})",
            "status": "online" if settings.IMAGE_BACKEND == "mock" else "offline",
            "models": [],
            "loras": [],
            "capabilities": {
                "txt2img": True,
                "img2img": False,
            },
        },
    ]

    return {"services": services}


# ── /ieq/capabilities ─────────────────────────────────────────────────────────

@router.get("/capabilities")
async def get_capabilities():
    """Get capability summary — same shape as /services (frontend expects it)."""
    return await get_services()


# ── /ieq/activity ─────────────────────────────────────────────────────────────

@router.get("/activity")
async def get_activity(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Get recent activity events."""
    try:
        result = await db.execute(
            select(ActivityEvent)
            .order_by(desc(ActivityEvent.created_at))
            .limit(limit)
        )
        rows = result.scalars().all()
        events = [
            {
                "id": r.id,
                "event_type": r.event_type,
                "service_id": r.service_id,
                "title": r.title,
                "detail": r.detail,
                "metadata": r.metadata,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]
    except Exception:
        # Fallback to in-memory buffer if DB unavailable
        events = event_bus.recent(limit)

    return {"events": events}
