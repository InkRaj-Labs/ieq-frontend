"""
IEQ Image Generation Router
POST /ieq/generate
GET  /ieq/generate/{id}
POST /ieq/generate/{id}/cancel
GET  /ieq/images/{id}
"""

import asyncio
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db, Generation
from app.core.events import event_bus
from app.services.image_service import image_backend

router = APIRouter()
logger = logging.getLogger("ieq.generate")

# In-memory job cancellation flags
_cancel_flags: dict = {}


class GenerateRequest(BaseModel):
    model_key: str
    prompt: str
    negative_prompt: Optional[str] = ""
    width: int = 512
    height: int = 512
    steps: int = 20
    seed: Optional[int] = None
    loras: Optional[str] = None


@router.post("/generate")
async def create_generation(
    req: GenerateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Queue an image generation job."""
    gen = Generation(
        model_key=req.model_key,
        prompt=req.prompt,
        negative_prompt=req.negative_prompt,
        width=req.width,
        height=req.height,
        steps=req.steps,
        seed=req.seed,
        loras=req.loras,
        status="queued",
    )
    db.add(gen)
    await db.flush()
    await db.refresh(gen)
    gen_id = gen.id

    background_tasks.add_task(_run_generation, gen_id, req)

    await event_bus.emit(
        event_type="generate",
        service_id="image_gen",
        title=f"Generation queued: {req.prompt[:50]}",
        db=db,
    )

    return {"generation_id": gen_id, "status": "queued"}


@router.get("/generate/{generation_id}")
async def get_generation(generation_id: int, db: AsyncSession = Depends(get_db)):
    """Poll generation status."""
    result = await db.execute(select(Generation).where(Generation.id == generation_id))
    gen = result.scalar_one_or_none()
    if not gen:
        raise HTTPException(status_code=404, detail="Generation not found")

    return {
        "id": gen.id,
        "status": gen.status,
        "prompt": gen.prompt,
        "width": gen.width,
        "height": gen.height,
        "image_url": f"/ieq/images/{gen.id}" if gen.status == "done" else None,
        "error": gen.error,
        "created_at": gen.created_at.isoformat() if gen.created_at else None,
        "completed_at": gen.completed_at.isoformat() if gen.completed_at else None,
    }


@router.post("/generate/{generation_id}/cancel")
async def cancel_generation(generation_id: int, db: AsyncSession = Depends(get_db)):
    """Cancel a pending/running generation."""
    _cancel_flags[generation_id] = True

    result = await db.execute(select(Generation).where(Generation.id == generation_id))
    gen = result.scalar_one_or_none()
    if gen and gen.status in ("queued", "running"):
        gen.status = "cancelled"
        await db.flush()

    return {"status": "cancelled", "id": generation_id}


@router.get("/images/{generation_id}")
async def get_image(generation_id: int, db: AsyncSession = Depends(get_db)):
    """Serve the generated image file."""
    result = await db.execute(select(Generation).where(Generation.id == generation_id))
    gen = result.scalar_one_or_none()
    if not gen or gen.status != "done":
        raise HTTPException(status_code=404, detail="Image not ready")

    image_path = Path(gen.image_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found")

    return FileResponse(str(image_path), media_type="image/png")


async def _run_generation(generation_id: int, req: GenerateRequest):
    """Background task: run the image generation."""
    from app.core.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Generation).where(Generation.id == generation_id))
        gen = result.scalar_one_or_none()
        if not gen:
            return

        # Check if cancelled before starting
        if _cancel_flags.get(generation_id):
            gen.status = "cancelled"
            await db.commit()
            return

        gen.status = "running"
        await db.commit()

        try:
            # Run actual generation
            image_bytes = await image_backend.generate(
                prompt=req.prompt,
                negative_prompt=req.negative_prompt or "",
                width=req.width,
                height=req.height,
                steps=req.steps,
                seed=req.seed or -1,
            )

            # Save to disk
            upload_dir = Path(settings.UPLOAD_DIR) / "images"
            upload_dir.mkdir(parents=True, exist_ok=True)
            image_path = upload_dir / f"gen_{generation_id}.png"
            image_path.write_bytes(image_bytes)

            # Check if cancelled during generation
            if _cancel_flags.get(generation_id):
                gen.status = "cancelled"
            else:
                gen.status = "done"
                gen.image_path = str(image_path)
                gen.completed_at = datetime.now(timezone.utc)

            await db.commit()

            await event_bus.emit(
                event_type="generate",
                service_id="image_gen",
                title=f"Generation complete: #{generation_id}",
            )

        except Exception as e:
            logger.error(f"Generation {generation_id} failed: {e}")
            gen.status = "failed"
            gen.error = str(e)
            await db.commit()
        finally:
            _cancel_flags.pop(generation_id, None)
