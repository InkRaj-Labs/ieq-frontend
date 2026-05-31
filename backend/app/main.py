"""
IEQ Command Center — FastAPI Backend
Zero-cost, self-hosted, GPU-accelerated AI command center.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import init_db
from app.core.events import event_bus
from app.routers import health, services, chat, generate, documents, agents, models, system

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ieq")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("IEQ Backend starting up...")
    await init_db()
    await event_bus.startup()
    yield
    logger.info("IEQ Backend shutting down...")
    await event_bus.shutdown()


app = FastAPI(
    title="IEQ Command Center API",
    description="Zero-cost, self-hosted AI orchestration backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(health.router,    prefix="/ieq", tags=["Health"])
app.include_router(services.router,  prefix="/ieq", tags=["Services"])
app.include_router(chat.router,      prefix="/ieq", tags=["Chat"])
app.include_router(generate.router,  prefix="/ieq", tags=["Images"])
app.include_router(documents.router, prefix="/ieq", tags=["Documents"])
app.include_router(agents.router,    prefix="/ieq", tags=["Agents"])
app.include_router(models.router,    prefix="/ieq", tags=["Models"])
app.include_router(system.router,    prefix="/ieq", tags=["System"])


@app.get("/")
async def root():
    return {"message": "IEQ Command Center API", "version": "1.0.0", "docs": "/docs"}
