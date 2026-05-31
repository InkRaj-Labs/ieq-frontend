"""
IEQ Models Router
GET  /ieq/models
POST /ieq/models/select
"""

from fastapi import APIRouter
from pydantic import BaseModel
from app.services.lm_studio import lm_studio

router = APIRouter()


class ModelSelectRequest(BaseModel):
    task: str


@router.get("/models")
async def list_models():
    """List all available models from LM Studio."""
    raw = await lm_studio.list_models()
    models = [
        {
            "key": m.get("id", m.get("model", "unknown")),
            "display_name": m.get("id", "Unknown"),
            "loaded": True,
            "capabilities": ["chat", "completion"],
        }
        for m in raw
    ]
    return {"models": models}


@router.post("/models/select")
async def select_model(req: ModelSelectRequest):
    """Auto-select best model for a task (returns first available)."""
    raw = await lm_studio.list_models()
    if not raw:
        return {
            "model": {"key": "no-model", "display_name": "No Model Loaded", "loaded": False, "capabilities": []},
            "score": 0.0,
        }

    best = raw[0]
    model_key = best.get("id", best.get("model", "unknown"))
    return {
        "model": {
            "key": model_key,
            "display_name": model_key,
            "loaded": True,
            "capabilities": ["chat", "completion"],
        },
        "score": 1.0,
    }
