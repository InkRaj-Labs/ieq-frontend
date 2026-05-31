# IEQ Command Center — Deployment Guide

## Architecture Overview

```
[Vercel Frontend] ←→ [Your Backend URL] ←→ [Local Docker Stack]
                                               ├── FastAPI (8000)
                                               ├── PostgreSQL (5432)
                                               ├── Redis (6379)
                                               ├── Qdrant (6333)
                                               └── Nginx (80/443)
                                           ↕
                                     [LM Studio / A1111 / ComfyUI]
                                     (running on Windows host)
```

---

## Step 1: Prerequisites

### Windows (Primary)
```
- Docker Desktop: https://www.docker.com/products/docker-desktop
- Enable WSL2 backend in Docker Desktop settings
- LM Studio: https://lmstudio.ai (load at least one model)
```

### LM Studio Configuration
```
1. Open LM Studio
2. Go to Settings → Local Server
3. Enable server: ON
4. Port: 1234 (default)
5. CORS: Allow all origins
6. Load a model (e.g., Llama 3, Mistral, Phi-3)
```

---

## Step 2: Clone Backend to Your Machine

```bash
git clone https://github.com/InkRaj-Labs/ieq-frontend.git
cd ieq-frontend/backend
```

OR download and extract the backend ZIP.

---

## Step 3: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit with your values
notepad .env      # Windows
nano .env         # Linux/Mac
```

**Required settings:**
```env
SECRET_KEY=<run: openssl rand -hex 32>
POSTGRES_PASSWORD=<strong password>
```

**LM Studio model name:**
```env
# Check LM Studio → Local Server → Model name shown there
DEFAULT_MODEL=lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF
```

**Image generation (optional):**
```env
IMAGE_BACKEND=a1111   # if using Automatic1111
IMAGE_BACKEND=comfyui # if using ComfyUI
IMAGE_BACKEND=mock    # default (returns placeholder)
```

---

## Step 4: Start the Stack

### Windows (double-click or terminal):
```
run-local.bat
```

### Linux/Mac:
```bash
bash run-local.sh
```

### Manual:
```bash
docker compose up -d --build
docker compose logs -f backend
```

---

## Step 5: Verify Backend

```bash
# Health check
curl http://localhost:8000/ieq/health

# Expected response:
{
  "status": "ok",
  "services": {
    "lm_studio": "online",
    "qdrant": "online",
    "postgres": "online"
  }
}

# View API docs
open http://localhost:8000/docs
```

---

## Step 6: Expose Backend to Vercel Frontend

You need a **public HTTPS URL** that the Vercel frontend can reach.

### Option A: Cloudflare Tunnel ⭐ RECOMMENDED (Free, Secure)

**Why:** No open ports, no port forwarding, HTTPS automatic, free.

```bash
# Install cloudflared
# Windows: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# Create tunnel (one-time)
cloudflared tunnel login
cloudflared tunnel create ieq-backend

# Run tunnel
cloudflared tunnel --url http://localhost:80 run ieq-backend
```

This gives you a URL like: `https://ieq-backend.your-account.cfargotunnel.com`

### Option B: Tailscale (Free, VPN-based)

**Why:** Access from your devices anywhere, no public exposure.

```bash
# Install Tailscale on all devices
# Windows: https://tailscale.com/download

# After install, your machine gets a Tailscale IP
# Backend accessible at: http://100.x.x.x:8000

# Enable Tailscale Funnel for public HTTPS:
tailscale funnel 80
```

### Option C: Local Network Only (No external access)

```
- Frontend communicates with backend ONLY from same WiFi network
- NEXT_PUBLIC_API_URL=http://192.168.1.x:80
- Works for personal/home use only
```

### Comparison

| Option | Cost | Security | Setup | Public |
|--------|------|----------|-------|--------|
| Cloudflare Tunnel | Free | ★★★★★ | Medium | Yes |
| Tailscale | Free | ★★★★★ | Easy | Optional |
| Local Network | Free | ★★★☆☆ | Easy | No |

**Recommendation:** Cloudflare Tunnel for production use.

---

## Step 7: Update Vercel Frontend

```
1. Go to: https://vercel.com/dashboard
2. Select your ieq-frontend project
3. Settings → Environment Variables
4. Add: NEXT_PUBLIC_API_URL = <your public backend URL>
5. Redeploy (trigger via push or manual)
```

Example:
```
NEXT_PUBLIC_API_URL=https://ieq-backend.yourdomain.cfargotunnel.com
```

---

## Troubleshooting

### Backend won't start
```bash
docker compose logs backend
# Look for: "Application startup complete"
```

### LM Studio "offline"
```
- Ensure LM Studio is running with server enabled
- Check LM Studio → Local Server tab
- Verify port 1234 is correct
- On Docker Desktop: host.docker.internal resolves to your Windows machine
```

### Database errors
```bash
# Reset database
docker compose down -v
docker compose up -d
```

### CORS errors in browser
```
- Add your frontend URL to .env VERCEL_URL
- Restart: docker compose restart backend
```

---

## Maintenance

```bash
# View all service status
docker compose ps

# View logs
docker compose logs -f backend
docker compose logs -f postgres

# Restart a service
docker compose restart backend

# Stop everything
docker compose down

# Stop and remove all data (CAUTION: deletes DB, uploads)
docker compose down -v

# Update backend code
docker compose up -d --build backend
```

---

## Repository Structure

```
ieq-frontend/              (GitHub repo root)
├── src/                   Frontend Next.js source
├── public/                PWA assets
├── package.json           Frontend deps
├── next.config.js         Next.js config
│
└── backend/               ← This backend folder
    ├── app/
    │   ├── main.py        FastAPI app
    │   ├── core/          Config, DB, Events
    │   ├── routers/       All API endpoints
    │   └── services/      LM Studio, Qdrant, Embeddings
    ├── infrastructure/
    │   └── nginx/         Nginx config
    ├── Dockerfile
    ├── docker-compose.yml
    ├── requirements.txt
    ├── .env.example
    ├── run-local.bat      Windows startup
    └── run-local.sh       Linux/Mac startup
```
