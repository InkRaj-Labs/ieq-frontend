"""
IEQ Services Router
POST /ieq/services/{service_id}/rediscover
"""

from fastapi import APIRouter
from app.services.lm_studio import lm_studio

router = APIRouter()


@router.post("/services/{service_id}/rediscover")
async def rediscover_service(service_id: str):
    """Trigger service rediscovery."""
    if service_id == "lm_studio":
        healthy = await lm_studio.is_healthy()
        return {"status": "online" if healthy else "offline", "service_id": service_id}
    return {"status": "unknown", "service_id": service_id}
