@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Comic Platform API - Dev Local (Docker DB)

:: =========================================================
:: dev-local.bat -- Local app (port 3000) + Mongo/Redis Docker
:: Cara: dev-local.bat
:: =========================================================

cd /d "%~dp0"

set "MONGO_ROOT_USER=admin"
set "MONGO_ROOT_PASS=change_me"
set "REDIS_HOST_PORT=6379"

if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        if /I "%%A"=="MONGO_ROOT_USER" set "MONGO_ROOT_USER=%%B"
        if /I "%%A"=="MONGO_ROOT_PASS" set "MONGO_ROOT_PASS=%%B"
        if /I "%%A"=="REDIS_HOST_PORT" set "REDIS_HOST_PORT=%%B"
    )
)

if "%MONGO_ROOT_USER%"=="" set "MONGO_ROOT_USER=admin"
if "%MONGO_ROOT_PASS%"=="" set "MONGO_ROOT_PASS=change_me"
if "%REDIS_HOST_PORT%"=="" set "REDIS_HOST_PORT=6379"

set "MONGO_URI=mongodb://%MONGO_ROOT_USER%:%MONGO_ROOT_PASS%@localhost:27017/comic_platform?authSource=admin"
set "REDIS_URL=redis://localhost:%REDIS_HOST_PORT%"

echo.
echo ================================================
echo  DEV MODE: Local App + Docker Mongo/Redis
echo ================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker tidak ditemukan. Install/start Docker Desktop dulu.
    pause
    exit /b 1
)

echo [1/3] Menyalakan MongoDB + Redis di Docker...
docker compose up -d mongo redis
if errorlevel 1 (
    echo [ERROR] Gagal menyalakan service mongo/redis.
    pause
    exit /b 1
)

call :waitHealthy comic-mongo
if errorlevel 1 (
    echo [ERROR] MongoDB tidak healthy dalam batas waktu.
    pause
    exit /b 1
)

call :waitHealthy comic-redis
if errorlevel 1 (
    echo [ERROR] Redis tidak healthy dalam batas waktu.
    pause
    exit /b 1
)

echo [2/3] Cek Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js tidak ditemukan.
    pause
    exit /b 1
)

echo [3/3] Menjalankan app lokal di port 3000...
echo [INFO] API local: http://localhost:3000
echo [INFO] API docker: http://localhost:5000
echo [INFO] MONGO_URI: %MONGO_URI%
echo [INFO] REDIS_URL: %REDIS_URL%
echo.

set "NODE_ENV=development"
set "PORT=3000"
set "MONGO_URI=%MONGO_URI%"
set "REDIS_URL=%REDIS_URL%"
call npm run dev:dockerdb
exit /b %ERRORLEVEL%

:waitHealthy
set "TARGET_CONTAINER=%~1"
set /a RETRY=0
:healthLoop
set /a RETRY+=1
for /f "usebackq delims=" %%S in (`docker inspect --format "{{.State.Health.Status}}" %TARGET_CONTAINER% 2^>nul`) do set "HSTATUS=%%S"
if /I "%HSTATUS%"=="healthy" exit /b 0
if %RETRY% GEQ 90 exit /b 1
timeout /t 1 /nobreak >nul
goto :healthLoop
