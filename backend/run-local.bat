@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM IEQ Command Center — Windows Startup Script
REM ─────────────────────────────────────────────────────────────────────────────
TITLE IEQ Command Center

echo.
echo  ██╗███████╗ ██████╗
echo  ██║██╔════╝██╔═══██╗
echo  ██║█████╗  ██║   ██║
echo  ██║██╔══╝  ██║▄▄ ██║
echo  ██║███████╗╚██████╔╝
echo  ╚═╝╚══════╝ ╚══▀▀═╝  Command Center
echo.
echo Starting IEQ Backend Stack...
echo.

REM Check Docker is running
docker info >nul 2>&1
IF ERRORLEVEL 1 (
    echo ERROR: Docker Desktop is not running.
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

REM Copy .env.example to .env if it doesn't exist
IF NOT EXIST .env (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo IMPORTANT: Edit .env with your settings before proceeding.
    echo Especially: SECRET_KEY, POSTGRES_PASSWORD
    pause
)

REM Pull images (skip if already present)
echo Pulling Docker images...
docker compose pull

echo.
echo Starting services...
docker compose up -d --build

echo.
echo Waiting for services to be healthy...
timeout /t 15 /nobreak >nul

REM Check status
docker compose ps

echo.
echo ─────────────────────────────────────────────────────
echo  IEQ Backend is running!
echo ─────────────────────────────────────────────────────
echo  API:        http://localhost:8000
echo  API Docs:   http://localhost:8000/docs
echo  Health:     http://localhost:8000/ieq/health
echo  Qdrant UI:  http://localhost:6333/dashboard
echo ─────────────────────────────────────────────────────
echo.
echo Next step: Set NEXT_PUBLIC_API_URL in your Vercel project
echo to your public backend URL.
echo.
echo Press any key to view live logs (Ctrl+C to exit logs)
pause >nul
docker compose logs -f backend
