@echo off
REM CodePulse — Quick start script for Windows
REM Run from the codepulse/ root directory

echo.
echo ====================================================
echo  CodePulse Dev Environment Setup
echo ====================================================
echo.

echo [1/4] Starting Docker containers (Postgres + Redis)...
docker compose up -d
if %errorlevel% neq 0 (
    echo ERROR: Docker failed. Make sure Docker Desktop is running.
    echo Open Docker Desktop from Start Menu, wait for it to start, then re-run this script.
    pause
    exit /b 1
)

echo.
echo [2/4] Waiting 5 seconds for containers to be healthy...
timeout /t 5 /nobreak > nul

echo.
echo [3/4] Running Prisma migrations...
call pnpm db:migrate
if %errorlevel% neq 0 (
    echo ERROR: Migration failed. Check DATABASE_URL in .env
    pause
    exit /b 1
)

echo.
echo [4/4] Seeding database...
call pnpm db:seed
if %errorlevel% neq 0 (
    echo ERROR: Seed failed.
    pause
    exit /b 1
)

echo.
echo ====================================================
echo  Setup complete!
echo.
echo  Next steps:
echo    Terminal 1: pnpm dev:web    (opens http://localhost:3000)
echo    Terminal 2: pnpm dev:worker (starts background job processor)
echo ====================================================
echo.
pause
