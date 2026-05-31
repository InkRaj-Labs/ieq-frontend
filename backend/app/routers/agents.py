"""
IEQ Agents Router
POST /ieq/agents/run
POST /ieq/agents/research
POST /ieq/agents/analyze-document
GET  /ieq/agents/task/{job_id}
"""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db, AgentJob
from app.core.events import event_bus

router = APIRouter()
logger = logging.getLogger("ieq.agents")


# ── Agent Registry ────────────────────────────────────────────────────────────

AGENT_REGISTRY = {
    "research": {
        "display_name": "Research Agent",
        "description": "Deep research with web search and document analysis",
        "system_prompt": (
            "You are an expert research agent. When given a query, you:\n"
            "1. Analyze the question thoroughly\n"
            "2. Identify key concepts and sub-questions\n"
            "3. Synthesize information from available context\n"
            "4. Provide a well-structured, cited response\n"
            "Be thorough, accurate, and cite sources when possible."
        ),
    },
    "legal": {
        "display_name": "Legal Agent",
        "description": "Legal document review and analysis",
        "system_prompt": (
            "You are an expert legal analysis agent. You assist with:\n"
            "1. Contract review and red-flagging\n"
            "2. Legal document summarization\n"
            "3. Identifying key obligations and risks\n"
            "4. Clause-by-clause analysis\n"
            "Always note that this is AI analysis, not legal advice."
        ),
    },
    "real_estate": {
        "display_name": "Real Estate Agent",
        "description": "Property analysis and market research",
        "system_prompt": (
            "You are an expert real estate analysis agent. You assist with:\n"
            "1. Property valuation and comparison\n"
            "2. Market trend analysis\n"
            "3. Investment potential assessment\n"
            "4. Due diligence checklists\n"
            "Base analysis on provided data and general market knowledge."
        ),
    },
    "operations": {
        "display_name": "Operations Agent",
        "description": "Business operations and process optimization",
        "system_prompt": (
            "You are an expert operations optimization agent. You assist with:\n"
            "1. Process analysis and improvement\n"
            "2. Workflow optimization\n"
            "3. KPI identification and tracking\n"
            "4. Resource allocation recommendations\n"
            "Focus on practical, implementable solutions."
        ),
    },
}


# ── Schemas ───────────────────────────────────────────────────────────────────

class AgentRunRequest(BaseModel):
    agent_type: str
    query: str
    document_ids: Optional[List[int]] = None
    model_key: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None


class ResearchRequest(BaseModel):
    query: str
    document_ids: Optional[List[int]] = None
    model_key: Optional[str] = None


class DocumentAnalysisRequest(BaseModel):
    document_id: int
    model_key: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/agents/run")
async def run_agent(
    req: AgentRunRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Run any registered agent by type."""
    if req.agent_type not in AGENT_REGISTRY:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown agent: {req.agent_type}. Available: {list(AGENT_REGISTRY.keys())}",
        )

    job_id = str(uuid.uuid4())
    job = AgentJob(
        id=job_id,
        agent_type=req.agent_type,
        status="pending",
        input_data={
            "query": req.query,
            "document_ids": req.document_ids,
            "model_key": req.model_key,
        },
    )
    db.add(job)
    await db.flush()

    background_tasks.add_task(
        _run_agent_task,
        job_id=job_id,
        agent_type=req.agent_type,
        query=req.query,
        document_ids=req.document_ids,
        model_key=req.model_key or settings.DEFAULT_MODEL,
    )

    await event_bus.emit(
        event_type="agent",
        service_id=req.agent_type,
        title=f"Agent task started: {req.agent_type}",
        db=db,
    )

    return {"job_id": job_id, "status": "pending", "agent_type": req.agent_type}


@router.post("/agents/research")
async def research_agent(
    req: ResearchRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Shortcut for research agent."""
    return await run_agent(
        AgentRunRequest(
            agent_type="research",
            query=req.query,
            document_ids=req.document_ids,
            model_key=req.model_key,
        ),
        background_tasks,
        db,
    )


@router.post("/agents/analyze-document")
async def analyze_document(
    req: DocumentAnalysisRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Analyze a specific document."""
    return await run_agent(
        AgentRunRequest(
            agent_type="legal",
            query=f"Provide a comprehensive analysis of document ID {req.document_id}",
            document_ids=[req.document_id],
            model_key=req.model_key,
        ),
        background_tasks,
        db,
    )


@router.get("/agents/task/{job_id}")
async def get_agent_task(job_id: str, db: AsyncSession = Depends(get_db)):
    """Poll agent job status and result."""
    result = await db.execute(select(AgentJob).where(AgentJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "id": job.id,
        "agent_type": job.agent_type,
        "status": job.status,
        "input_data": job.input_data,
        "result": job.result,
        "error": job.error,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


# ── Jobs (generic) ────────────────────────────────────────────────────────────

@router.get("/jobs/{job_id}")
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    return await get_agent_task(job_id, db)


@router.get("/jobs/{job_id}/result")
async def get_job_result(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentJob).where(AgentJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "done":
        raise HTTPException(status_code=202, detail=f"Job not complete yet: {job.status}")
    return {"result": job.result}


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentJob).where(AgentJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status in ("pending", "running"):
        job.status = "cancelled"
        await db.flush()
    return {"status": job.status, "id": job_id}


# ── Background Agent Execution ────────────────────────────────────────────────

async def _run_agent_task(
    job_id: str,
    agent_type: str,
    query: str,
    document_ids: Optional[List[int]],
    model_key: str,
):
    """Execute an agent job in the background."""
    from app.core.database import AsyncSessionLocal
    from app.services.lm_studio import lm_studio
    from app.services.embeddings import embed_texts
    from app.services.qdrant_service import qdrant_service

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AgentJob).where(AgentJob.id == job_id))
        job = result.scalar_one_or_none()
        if not job:
            return

        job.status = "running"
        await db.commit()

        try:
            agent_config = AGENT_REGISTRY[agent_type]
            system_prompt = agent_config["system_prompt"]

            # Build context from documents if provided
            context = ""
            if document_ids:
                embeddings = await embed_texts([query])
                chunks = await qdrant_service.search(
                    embeddings[0],
                    limit=8,
                    document_ids=document_ids,
                )
                if chunks:
                    context = "\n\nRELEVANT CONTEXT:\n" + "\n---\n".join(c["text"] for c in chunks)

            messages = [
                {"role": "system", "content": system_prompt + context},
                {"role": "user", "content": query},
            ]

            full_response = ""
            async for token in lm_studio.chat_complete(
                messages=messages,
                model=model_key,
                temperature=0.3,
                max_tokens=2048,
                stream=False,
            ):
                full_response += token

            job.status = "done"
            job.result = {
                "answer": full_response,
                "agent_type": agent_type,
                "model": model_key,
            }
            job.completed_at = datetime.now(timezone.utc)

            await event_bus.emit(
                event_type="agent",
                service_id=agent_type,
                title=f"Agent task complete: {agent_type}",
            )

        except Exception as e:
            logger.error(f"Agent job {job_id} failed: {e}")
            job.status = "failed"
            job.error = str(e)
            job.completed_at = datetime.now(timezone.utc)

        await db.commit()
