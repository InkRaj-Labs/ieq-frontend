"""
IEQ Chat Router
GET  /ieq/conversations
POST /ieq/conversations
GET  /ieq/conversations/{id}
POST /ieq/chat  (streaming SSE)
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db, Conversation, Message
from app.core.events import event_bus
from app.core.config import settings
from app.services.lm_studio import lm_studio

router = APIRouter()
logger = logging.getLogger("ieq.chat")


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateConversationRequest(BaseModel):
    title: str = "New Conversation"
    connector_id: Optional[str] = None
    model_key: Optional[str] = None


class ChatRequest(BaseModel):
    model_key: str
    message: str
    conversation_id: Optional[int] = None
    temperature: float = 0.7
    stream: bool = True
    system_prompt: Optional[str] = None


# ── Conversations ─────────────────────────────────────────────────────────────

@router.get("/conversations")
async def list_conversations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).order_by(desc(Conversation.updated_at)).limit(50)
    )
    convos = result.scalars().all()
    return {
        "conversations": [
            {
                "id": c.id,
                "title": c.title,
                "connector_id": c.connector_id,
                "model_key": c.model_key,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            }
            for c in convos
        ]
    }


@router.post("/conversations")
async def create_conversation(req: CreateConversationRequest, db: AsyncSession = Depends(get_db)):
    convo = Conversation(
        title=req.title,
        connector_id=req.connector_id,
        model_key=req.model_key,
    )
    db.add(convo)
    await db.flush()
    await db.refresh(convo)
    return {
        "id": convo.id,
        "title": convo.title,
        "connector_id": convo.connector_id,
        "model_key": convo.model_key,
        "created_at": convo.created_at.isoformat() if convo.created_at else None,
    }


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    convo = result.scalar_one_or_none()
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
    )
    messages = msgs_result.scalars().all()

    return {
        "id": convo.id,
        "title": convo.title,
        "model_key": convo.model_key,
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ],
    }


# ── Streaming Chat ────────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Streaming chat endpoint.
    Returns SSE stream when req.stream=True, otherwise JSON.
    """
    # Fetch conversation history
    messages = []
    if req.system_prompt:
        messages.append({"role": "system", "content": req.system_prompt})
    elif req.conversation_id is None:
        messages.append({
            "role": "system",
            "content": "You are IEQ Assistant, a helpful AI running locally on the user's hardware. Be concise and helpful.",
        })

    if req.conversation_id:
        hist_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == req.conversation_id)
            .order_by(Message.created_at)
            .limit(20)  # last 20 messages for context
        )
        history = hist_result.scalars().all()
        for m in history:
            messages.append({"role": m.role, "content": m.content})

    messages.append({"role": "user", "content": req.message})

    # Save user message
    if req.conversation_id:
        user_msg = Message(
            conversation_id=req.conversation_id,
            role="user",
            content=req.message,
            model_key=req.model_key,
        )
        db.add(user_msg)
        await db.flush()

    if req.stream:
        return StreamingResponse(
            _stream_chat(req, messages, db),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        # Non-streaming: collect all tokens
        full_response = ""
        async for token in lm_studio.chat_complete(
            messages=messages,
            model=req.model_key,
            temperature=req.temperature,
            stream=False,
        ):
            full_response += token

        if req.conversation_id:
            ai_msg = Message(
                conversation_id=req.conversation_id,
                role="assistant",
                content=full_response,
                model_key=req.model_key,
            )
            db.add(ai_msg)
            await db.flush()

        await event_bus.emit(
            event_type="chat",
            service_id="lm_studio",
            title=f"Chat: {req.message[:50]}...",
            db=db,
        )

        return {"response": full_response, "model_key": req.model_key}


async def _stream_chat(req: ChatRequest, messages: list, db: AsyncSession):
    """SSE generator for streaming chat responses."""
    full_response = ""
    try:
        async for token in lm_studio.chat_complete(
            messages=messages,
            model=req.model_key,
            temperature=req.temperature,
            stream=True,
        ):
            full_response += token
            payload = json.dumps({
                "choices": [{"delta": {"content": token}}],
                "model": req.model_key,
            })
            yield f"data: {payload}\n\n"

        yield "data: [DONE]\n\n"

        # Persist assistant reply
        if req.conversation_id and full_response:
            async with db:
                ai_msg = Message(
                    conversation_id=req.conversation_id,
                    role="assistant",
                    content=full_response,
                    model_key=req.model_key,
                )
                db.add(ai_msg)
                await db.commit()

        await event_bus.emit(
            event_type="chat",
            service_id="lm_studio",
            title=f"Chat completed ({len(full_response)} chars)",
        )

    except Exception as e:
        logger.error(f"Streaming chat error: {e}")
        error_payload = json.dumps({"error": str(e)})
        yield f"data: {error_payload}\n\n"
        yield "data: [DONE]\n\n"
