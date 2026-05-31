# IEQ Command Center

> Zero-cost, self-hosted AI command center — chat, image generation, RAG, agents.

**Frontend:** Live on Vercel → https://ieq-frontend-kc0cdpit3-ink-raj-labs-projects.vercel.app/
**Backend:** Self-hosted FastAPI on your GPU workstation

---

## Quick Start

### 1. Start Backend (Windows)
```
cd backend
run-local.bat
```

### 2. Start Backend (Linux/Mac)
```bash
cd backend
bash run-local.sh
```

### 3. Connect Frontend
Set in Vercel → Settings → Environment Variables:
```
NEXT_PUBLIC_API_URL=<your public backend URL>
```

---

## Repository Structure

```
ieq-frontend/
├── src/                   Next.js frontend source
├── public/                PWA assets
├── package.json           Frontend dependencies
├── next.config.js
│
└── backend/               FastAPI backend
    ├── app/
    │   ├── main.py        Entry point
    │   ├── core/          Config, DB, Events
    │   ├── routers/       All API endpoints (11 routers)
    │   └── services/      LM Studio, Qdrant, Embeddings
    ├── infrastructure/
    │   └── nginx/         Reverse proxy config
    ├── docker-compose.yml  Full stack (API + PG + Redis + Qdrant + Nginx)
    ├── Dockerfile
    ├── requirements.txt
    ├── .env.example
    ├── run-local.bat      Windows one-click start
    ├── run-local.sh       Linux/Mac start
    └── DEPLOYMENT.md      Full deployment guide
```

---

## Backend API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ieq/health` | System health |
| GET | `/ieq/services` | AI service status |
| GET | `/ieq/capabilities` | Capability registry |
| GET | `/ieq/activity` | Recent events |
| GET | `/ieq/models` | Available models |
| POST | `/ieq/chat` | Streaming chat (SSE) |
| POST | `/ieq/generate` | Image generation |
| POST | `/ieq/documents/upload` | RAG document upload |
| GET | `/ieq/rag/search` | Semantic search |
| POST | `/ieq/agents/run` | Run AI agent |
| GET | `/ieq/system` | Hardware stats |

Full docs at: `http://localhost:8000/docs`

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | FastAPI, Python 3.11 |
| Database | PostgreSQL 16 |
| Vector DB | Qdrant (local Docker) |
| Cache | Redis 7 |
| Proxy | Nginx |
| AI Runtime | LM Studio (local GPU) |
| Embeddings | sentence-transformers (local) |
| Deployment | Vercel (frontend) + Docker (backend) |

---

## License

Private — Ink & Equity / Ink Raj Labs
