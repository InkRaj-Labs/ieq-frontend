"""
IEQ Embedding Service — local sentence-transformers (zero API cost).
"""

import logging
import asyncio
from typing import List, Optional
from functools import lru_cache

logger = logging.getLogger("ieq.embeddings")

_model = None
_model_lock = asyncio.Lock()


async def get_embedding_model():
    """Lazy-load the embedding model (thread-safe)."""
    global _model
    if _model is None:
        async with _model_lock:
            if _model is None:
                try:
                    from sentence_transformers import SentenceTransformer
                    from app.core.config import settings
                    logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
                    loop = asyncio.get_event_loop()
                    _model = await loop.run_in_executor(
                        None,
                        lambda: SentenceTransformer(settings.EMBEDDING_MODEL)
                    )
                    logger.info("Embedding model loaded.")
                except ImportError:
                    logger.warning("sentence-transformers not installed — embeddings disabled.")
                    _model = None
    return _model


async def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts. Falls back to zero vectors if model unavailable."""
    from app.core.config import settings

    model = await get_embedding_model()
    if model is None:
        logger.warning("Embedding model unavailable, returning zero vectors.")
        return [[0.0] * settings.EMBEDDING_DIM for _ in texts]

    try:
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None,
            lambda: model.encode(texts, show_progress_bar=False).tolist()
        )
        return embeddings
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        return [[0.0] * settings.EMBEDDING_DIM for _ in texts]


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks for RAG."""
    words = text.split()
    if not words:
        return []

    chunks = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += chunk_size - overlap

    return chunks
