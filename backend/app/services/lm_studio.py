"""
IEQ LM Studio Service — OpenAI-compatible local AI runtime client.
"""

import httpx
import asyncio
import logging
from typing import AsyncGenerator, List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("ieq.lmstudio")


class LMStudioClient:
    """Async client for LM Studio's OpenAI-compatible API."""

    def __init__(self):
        self.base_url = settings.LM_STUDIO_BASE_URL
        self.api_key = settings.LM_STUDIO_API_KEY
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                timeout=httpx.Timeout(120.0, connect=10.0),
            )
        return self._client

    async def list_models(self) -> List[Dict[str, Any]]:
        """Fetch available models from LM Studio."""
        try:
            client = self._get_client()
            resp = await client.get("/models")
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", [])
        except Exception as e:
            logger.warning(f"LM Studio unreachable: {e}")
            return []

    async def is_healthy(self) -> bool:
        """Check if LM Studio is running."""
        try:
            models = await self.list_models()
            return True
        except Exception:
            return False

    async def chat_complete(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        stream: bool = False,
    ) -> AsyncGenerator[str, None]:
        """Streaming or non-streaming chat completion."""
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": stream,
        }

        client = self._get_client()

        if stream:
            async with client.stream("POST", "/chat/completions", json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:].strip()
                        if data == "[DONE]":
                            return
                        try:
                            import json
                            obj = json.loads(data)
                            token = (
                                obj.get("choices", [{}])[0]
                                .get("delta", {})
                                .get("content", "")
                            )
                            if token:
                                yield token
                        except Exception:
                            pass
        else:
            resp = await client.post("/chat/completions", json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )
            yield content

    async def embed(self, texts: List[str], model: str = "text-embedding-ada-002") -> List[List[float]]:
        """Get embeddings from LM Studio (if embedding model loaded)."""
        try:
            client = self._get_client()
            resp = await client.post("/embeddings", json={"input": texts, "model": model})
            resp.raise_for_status()
            data = resp.json()
            return [item["embedding"] for item in data.get("data", [])]
        except Exception as e:
            logger.warning(f"LM Studio embeddings failed: {e}")
            return []


lm_studio = LMStudioClient()
