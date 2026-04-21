@echo off
setlocal EnableDelayedExpansion
title Comic Platform API - Start

:: =========================================================
::  start.bat -- Menjalankan Comic Platform API
::  Mode  : LOCAL (Node.js)  |  DOCKER (docker-compose)
::  Cara  : start.bat [local|docker] [port]
::  Contoh: start.bat
::           start.bat docker
::           start.bat local 5001
:: =========================================================

:: --- Konfigurasi Default ---------------------------------
set "APP_NAME=Comic Platform API"
set "DEFAULT_PORT=5000"
set "PORT_RANGE_MAX=5020"
set "PRJ_ROOT=%~dp0..\..\"
set "PID_FILE=%PRJ_ROOT%.app.pid"
set "LOG_DIR=%PRJ_ROOT%logs"
set "LOG_FILE=%LOG_DIR%\combined.log"
set "ENV_FILE=%PRJ_ROOT%.env"
set "ENV_EXAMPLE=%PRJ_ROOT%.env.example"
set "MODE=local"
set "CUSTOM_PORT="

cd /d "%SCRIPT_DIR%"

:: --- Baca Argumen ----------------------------------------
if not "%1"=="" (
  if /I "%1"=="docker" set "MODE=docker"
  if /I "%1"=="local"  set "MODE=local"
)
if not "%2"=="" set "CUSTOM_PORT=%2"

:: --- Banner ----------------------------------------------
echo.
echo  ++++++++++++++++++++++++++++++++++++++++++++++++
echo   %APP_NAME%  -  START
echo   Mode : !MODE!
echo  ++++++++++++++++++++++++++++++++++++++++++++++++
echo.

:: --- Cek apakah sudah berjalan ---------------------------
if exist "%PID_FILE%" (
  set /p EXISTING_PID=<"%PID_FILE%"
  if not "!EXISTING_PID!"=="" (
    tasklist /FI "PID eq !EXISTING_PID!" 2>nul | findstr /I "node.exe" >nul 2>&1
    if !ERRORLEVEL!==0 (
      echo [WARN]  Aplikasi sudah berjalan dengan PID !EXISTING_PID!
      echo [WARN]  Jalankan stop.bat atau restart.bat
      echo.
      pause
      exit /b 1
    )
  )
  del /F /Q "%PID_FILE%" >nul 2>&1
)

:: --- Buat folder logs ------------------------------------
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: --- Validasi .env ---------------------------------------
echo [1/5] Cek konfigurasi .env ...
if exist "%ENV_FILE%" goto :ENV_OK

if not exist "%ENV_EXAMPLE%" (
  echo [ERROR] File .env dan .env.example tidak ditemukan!
  echo         Cek path: %SCRIPT_DIR%
  pause
  exit /b 1
)

echo [WARN]  File .env tidak ditemukan. Menyalin dari .env.example ...
copy /Y "%ENV_EXAMPLE%" "%ENV_FILE%" >nul
if !ERRORLEVEL! NEQ 0 (
  echo [ERROR] Gagal menyalin .env.example ke .env
  echo         Source: %ENV_EXAMPLE%
  echo         Target: %ENV_FILE%
  pause
  exit /b 1
)

echo [OK]    .env telah dibuat: %ENV_FILE%
echo.
echo [INFO]  Edit .env dan atur minimal:
echo          - MONGO_URI
echo          - JWT_ACCESS_SECRET   (min 32 karakter)
echo          - JWT_REFRESH_SECRET  (min 32 karakter)
echo.
set "CONTINUE="
set /p CONTINUE= Lanjutkan dengan konfigurasi default? [Y/N]: 
if /I "!CONTINUE!" EQU "Y" goto :ENV_OK
if /I "!CONTINUE!" EQU "YES" goto :ENV_OK

echo [INFO]  Edit .env lalu jalankan start.bat kembali.
pause
exit /b 0

:ENV_OK
echo [OK]    File .env ditemukan.

:: --- Baca PORT dari .env ---------------------------------
set "ENV_PORT=%DEFAULT_PORT%"
for /F "usebackq tokens=1,* delims==" %%A in ("%ENV_FILE%") do (
  set "_K=%%A"
  set "_V=%%B"
  if "!_K:~0,1!" NEQ "#" (
    if /I "!_K!"=="PORT" (
      set "_V=!_V: =!"
      if not "!_V!"=="" set "ENV_PORT=!_V!"
    )
  )
)

:: Port: prioritas argumen > .env > default
if defined CUSTOM_PORT (
  set "USE_PORT=!CUSTOM_PORT!"
) else (
  set "USE_PORT=!ENV_PORT!"
)

:: --- Pilih Mode ------------------------------------------
if /I "!MODE!"=="docker" goto :DOCKER_MODE

:: =========================================================
::  MODE LOCAL NODE.JS
:: =========================================================

:: -- Cek Node.js --
echo [2/5] Cek Node.js ...
where node >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
  echo [ERROR] Node.js tidak ditemukan! Install: https://nodejs.org/
  pause
  exit /b 1
)
for /F "tokens=*" %%V in ('node --version 2^>nul') do set "NODE_VER=%%V"
echo [OK]    Node.js !NODE_VER! ditemukan.

:: -- Cek node_modules --
echo [3/5] Cek dependencies ...
if not exist "%SCRIPT_DIR%node_modules" (
  echo [INFO]  Menjalankan npm install ...
  cd /d "%SCRIPT_DIR%"
  call npm install
  if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] npm install gagal!
    pause
    exit /b 1
  )
) else (
  echo [OK]    Dependencies terinstall.
)

:: -- Deteksi Port Bentrok --
echo [4/5] Cek ketersediaan port !USE_PORT! ...
set "FINAL_PORT=!USE_PORT!"
call :CHECK_PORT !USE_PORT!
if "!PORT_BUSY!"=="1" (
  echo [WARN]  Port !USE_PORT! sudah digunakan. Mencari port lain ...
  set /a "TRY=!USE_PORT!+1"
  :FIND_PORT
    if !TRY! GTR !PORT_RANGE_MAX! (
      echo [ERROR] Tidak ada port bebas di range !USE_PORT!-!PORT_RANGE_MAX!
      pause
      exit /b 1
    )
    call :CHECK_PORT !TRY!
    if "!PORT_BUSY!"=="1" (
      set /a "TRY=!TRY!+1"
      goto :FIND_PORT
    )
  set "FINAL_PORT=!TRY!"
  echo [OK]    Menggunakan port alternatif: !FINAL_PORT!
) else (
  echo [OK]    Port !FINAL_PORT! tersedia.
)

:: -- Cek MongoDB --
echo [5/5] Cek MongoDB (port 27017) ...
netstat -ano 2>nul | findstr ":27017 " | findstr "LISTENING" >nul 2>&1
if !ERRORLEVEL!==0 (
  echo [OK]    MongoDB terdeteksi.
) else (
  echo [WARN]  MongoDB tidak terdeteksi di localhost:27017
  echo         API berjalan, tapi endpoint DB akan error.
  echo         Gunakan 'start.bat docker' untuk auto-start MongoDB.
)

:: -- Jalankan Server --
echo.
echo  +--------------------------------------------------+
echo   URL    : http://localhost:!FINAL_PORT!
echo   API    : http://localhost:!FINAL_PORT!/api/v1
echo   Docs   : http://localhost:!FINAL_PORT!/api-docs
echo   Health : http://localhost:!FINAL_PORT!/health
echo   Log    : !LOG_FILE!
echo  +--------------------------------------------------+
echo.

cd /d "%PRJ_ROOT%"
start "Comic API Server" /B cmd /C "set PORT=!FINAL_PORT!&& node server.js"
timeout /T 2 /NOBREAK >nul

:: Ambil PID node terbaru
set "NEW_PID="
for /F "skip=3 tokens=2" %%P in ('tasklist /FI "IMAGENAME eq node.exe" /FO TABLE 2^>nul') do (
  if not defined NEW_PID set "NEW_PID=%%P"
)
if defined NEW_PID (
  echo !NEW_PID!> "%PID_FILE%"
  echo [OK]    Server berjalan. PID: !NEW_PID!
  echo [INFO]  PID disimpan di: %PID_FILE%
) else (
  echo [WARN]  Tidak dapat baca PID. Periksa log: !LOG_FILE!
)
echo.
echo Server berjalan di background.
echo Gunakan stop.bat untuk menghentikan.
echo.
pause >nul
exit /b 0

:: =========================================================
::  MODE DOCKER
:: =========================================================
:DOCKER_MODE

:: -- Cek Docker --
echo [2/5] Cek Docker Engine ...
where docker >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
  echo [ERROR] Docker tidak ditemukan! Install: https://www.docker.com/
  pause
  exit /b 1
)
docker info >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
  echo [ERROR] Docker daemon tidak berjalan! Buka Docker Desktop.
  pause
  exit /b 1
)
for /F "tokens=*" %%V in ('docker --version 2^>nul') do set "DOCKER_VER=%%V"
echo [OK]    !DOCKER_VER!

echo [3/5] Cek docker-compose.yml ...
if not exist "%SCRIPT_DIR%docker-compose.yml" (
  echo [ERROR] docker-compose.yml tidak ditemukan!
  pause
  exit /b 1
)
echo [OK]    docker-compose.yml ditemukan.

:: -- Port Check Docker --
echo [4/5] Cek ketersediaan port !USE_PORT! ...
set "FINAL_PORT=!USE_PORT!"
call :CHECK_PORT !USE_PORT!
if "!PORT_BUSY!"=="1" (
  echo [WARN]  Port !USE_PORT! digunakan. Mencari port lain ...
  set /a "TRY=!USE_PORT!+1"
  :FIND_PORT_D
    if !TRY! GTR !PORT_RANGE_MAX! (
      echo [ERROR] Tidak ada port bebas.
      pause
      exit /b 1
    )
    call :CHECK_PORT !TRY!
    if "!PORT_BUSY!"=="1" (
      set /a "TRY=!TRY!+1"
      goto :FIND_PORT_D
    )
  set "FINAL_PORT=!TRY!"
  echo [OK]    Menggunakan port: !FINAL_PORT!
) else (
  echo [OK]    Port !FINAL_PORT! tersedia.
)

echo [5/5] Membangun dan menjalankan container ...
echo.
echo  +--------------------------------------------------+
echo   URL    : http://localhost:!FINAL_PORT!
echo   API    : http://localhost:!FINAL_PORT!/api/v1
echo   Docs   : http://localhost:!FINAL_PORT!/api-docs
echo   Health : http://localhost:!FINAL_PORT!/health
echo  +--------------------------------------------------+
echo.

cd /d "%SCRIPT_DIR%"
set "APP_PORT=!FINAL_PORT!"
docker compose up -d --build 2>&1
if !ERRORLEVEL! NEQ 0 (
  echo [ERROR] Docker compose gagal! Cek: docker compose logs
  pause
  exit /b 1
)

echo.
echo [OK]    Container berhasil dijalankan.
echo.
docker compose ps 2>&1
echo.
echo Perintah berguna:
echo   docker compose logs -f      (log real-time)
echo   docker compose ps           (status container)
echo   stop.bat docker             (hentikan container)
echo.
pause
exit /b 0

:: =========================================================
::  SUBROUTINE: Cek apakah port sedang digunakan
::  Input  : %1 = port number
::  Output : PORT_BUSY = 0 (bebas) | 1 (dipakai)
:: =========================================================
:CHECK_PORT
set "PORT_BUSY=0"
netstat -ano 2>nul | findstr ":%1 " | findstr "LISTENING" >nul 2>&1
if !ERRORLEVEL!==0 set "PORT_BUSY=1"
goto :eof
