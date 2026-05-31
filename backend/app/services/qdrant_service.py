"""
IEQ Qdrant Service — local vector database for RAG.
"""

import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("ieq.qdrant")


class QdrantService:
    """Manages document vectors in local Qdrant instance."""

    def __init__(self):
        self._client = None
        self._collection = settings.QDRANT_COLLECTION

    def _get_client(self):
        if self._client is None:
            try:
                from qdrant_client import QdrantClient
                self._client = QdrantClient(
                    host=settings.QDRANT_HOST,
                    port=settings.QDRANT_PORT,
                )
                self._ensure_collection()
            except Exception as e:
                logger.warning(f"Qdrant unavailable: {e}")
                self._client = None
        return self._client

    def _ensure_collection(self):
        """Create collection if it doesn't exist."""
        try:
            from qdrant_client.models import Distance, VectorParams
            client = self._client
            existing = [c.name for c in client.get_collections().collections]
            if self._collection not in existing:
                client.create_collection(
                    collection_name=self._collection,
                    vectors_config=VectorParams(
                        size=settings.EMBEDDING_DIM,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info(f"Created Qdrant collection: {self._collection}")
        except Exception as e:
            logger.warning(f"Could not ensure Qdrant collection: {e}")

    async def is_healthy(self) -> bool:
        try:
            client = self._get_client()
            if client is None:
                return False
            client.get_collections()
            return True
        except Exception:
            return False

    async def upsert_chunks(
        self,
        document_id: int,
        chunks: List[str],
        embeddings: List[List[float]],
        metadata: Optional[Dict] = None,
    ) -> bool:
        """Store document chunks with embeddings."""
        try:
            from qdrant_client.models import PointStruct
            client = self._get_client()
            if client is None:
                return False

            points = []
            for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                point_id = document_id * 10000 + i
                points.append(PointStruct(
                    id=point_id,
                    vector=emb,
                    payload={
                        "document_id": document_id,
                        "chunk_index": i,
                        "text": chunk,
                        **(metadata or {}),
                    },
                ))

            client.upsert(collection_name=self._collection, points=points)
            logger.info(f"Upserted {len(points)} chunks for document {document_id}")
            return True
        except Exception as e:
            logger.error(f"Qdrant upsert failed: {e}")
            return False

    async def search(
        self,
        query_embedding: List[float],
        limit: int = 5,
        document_ids: Optional[List[int]] = None,
    ) -> List[Dict[str, Any]]:
        """Search for similar chunks."""
        try:
            from qdrant_client.models import Filter, FieldCondition, MatchAny
            client = self._get_client()
            if client is None:
                return []

            query_filter = None
            if document_ids:
                query_filter = Filter(
                    must=[FieldCondition(
                        key="document_id",
                        match=MatchAny(any=document_ids),
                    )]
                )

            results = client.search(
                collection_name=self._collection,
                query_vector=query_embedding,
                limit=limit,
                query_filter=query_filter,
                with_payload=True,
            )

            return [
                {
                    "score": r.score,
                    "text": r.payload.get("text", ""),
                    "document_id": r.payload.get("document_id"),
                    "chunk_index": r.payload.get("chunk_index"),
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Qdrant search failed: {e}")
            return []

    async def delete_document(self, document_id: int) -> bool:
        """Remove all chunks for a document."""
        try:
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            client = self._get_client()
            if client is None:
                return False

            client.delete(
                collection_name=self._collection,
                points_selector=Filter(
                    must=[FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )]
                ),
            )
            return True
        except Exception as e:
            logger.error(f"Qdrant delete failed: {e}")
            return False

    async def count(self) -> int:
        """Get total vector count."""
        try:
            client = self._get_client()
            if client is None:
                return 0
            result = client.count(collection_name=self._collection)
            return result.count
        except Exception:
            return 0


qdrant_service = QdrantService()
