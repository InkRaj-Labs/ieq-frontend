#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# IEQ Command Center — Linux/Mac Startup Script
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo " ██╗███████╗ ██████╗ "
echo " ██║██╔════╝██╔═══██╗"
echo " ██║█████╗  ██║   ██║"
echo " ██║██╔══╝  ██║▄▄ ██║"
echo " ██║███████╗╚██████╔╝"
echo " ╚═╝╚══════╝ ╚══▀▀═╝  Command Center"
echo -e "${NC}"

# ── Checks ────────────────────────────────────────────────────────────────────

if ! command -v docker &>/dev/null; then
    echo -e "${RED}ERROR: Docker is not installed.${NC}"
    echo "Install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! docker info &>/dev/null; then
    echo -e "${RED}ERROR: Docker daemon is not running.${NC}"
    exit 1
fi

# ── .env Setup ────────────────────────────────────────────────────────────────

if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}IMPORTANT: Edit .env with your actual settings.${NC}"
    echo -e "${YELLOW}Especially: SECRET_KEY and POSTGRES_PASSWORD${NC}"
    read -p "Press Enter to continue after editing .env..."
fi

# ── Start Services ────────────────────────────────────────────────────────────

echo -e "${GREEN}Pulling latest images...${NC}"
docker compose pull --quiet

echo -e "${GREEN}Building and starting IEQ services...${NC}"
docker compose up -d --build

echo -e "${GREEN}Waiting for services...${NC}"
sleep 15

# Health check
if curl -sf http://localhost:8000/ieq/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is healthy!${NC}"
else
    echo -e "${YELLOW}Backend may still be starting up. Check logs with:${NC}"
    echo "  docker compose logs -f backend"
fi

echo ""
echo -e "${CYAN}─────────────────────────────────────────────────────${NC}"
echo -e "${GREEN} IEQ Backend is running!${NC}"
echo -e "${CYAN}─────────────────────────────────────────────────────${NC}"
echo " API:        http://localhost:8000"
echo " API Docs:   http://localhost:8000/docs"
echo " Health:     http://localhost:8000/ieq/health"
echo " Qdrant UI:  http://localhost:6333/dashboard"
echo -e "${CYAN}─────────────────────────────────────────────────────${NC}"
echo ""
echo "Next step: Set NEXT_PUBLIC_API_URL in your Vercel project"
echo "to your public backend URL (Cloudflare Tunnel or local)."
echo ""

read -p "Press Enter to follow backend logs (Ctrl+C to exit)..."
docker compose logs -f backend
