"""
IEQ Configuration — all settings loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────────
    APP_NAME: str = "IEQ Command Center"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    API_KEY: str = "ieq-local-dev-key"

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://ieq-frontend-kc0cdpit3-ink-raj-labs-projects.vercel.app",
        "https://*.vercel.app",
    ]

    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://ieq:ieqpassword@postgres:5432/ieqdb"

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://redis:6379/0"

    # ── Qdrant ────────────────────────────────────────────────────────────────
    QDRANT_HOST: str = "qdrant"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "ieq_documents"

    # ── LM Studio ────────────────────────────────────────────────────────────
    LM_STUDIO_BASE_URL: str = "http://host.docker.internal:1234/v1"
    LM_STUDIO_API_KEY: str = "lm-studio"
    DEFAULT_MODEL: str = "local-model"
    DEFAULT_TEMPERATURE: float = 0.7

    # ── Image Generation ─────────────────────────────────────────────────────
    # ComfyUI
    COMFYUI_BASE_URL: str = "http://host.docker.internal:8188"
    # Automatic1111 / SDAPI
    A1111_BASE_URL: str = "http://host.docker.internal:7860"
    # Which backend to use: "comfyui" | "a1111" | "mock"
    IMAGE_BACKEND: str = "mock"

    # ── File Storage ──────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "/app/uploads"
    MAX_UPLOAD_SIZE_MB: int = 50

    # ── Embeddings ────────────────────────────────────────────────────────────
    # Local sentence-transformers model (no API cost)
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384

    # ── Rate Limiting ─────────────────────────────────────────────────────────
    RATE_LIMIT_CHAT: str = "30/minute"
    RATE_LIMIT_GENERATE: str = "10/minute"
    RATE_LIMIT_UPLOAD: str = "20/minute"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
