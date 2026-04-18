@echo off
setlocal EnableDelayedExpansion
title Comic Platform API - Restart

:: =========================================================
::  restart.bat -- Restart Comic Platform API
::  Cara  : restart.bat [local|docker] [port]
::  Contoh: restart.bat
::           restart.bat docker
::           restart.bat local 5002
:: =========================================================

set "APP_NAME=Comic Platform API"
set "SCRIPT_DIR=%~dp0"
set "PID_FILE=%SCRIPT_DIR%.app.pid"
set "LOG_DIR=%SCRIPT_DIR%logs"
set "LOG_FILE=%LOG_DIR%\app.log"
set "ENV_FILE=%SCRIPT_DIR%.env"
set "DEFAULT_PORT=5000"
set "PORT_RANGE_MAX=5020"
set "MODE=local"
set "CUSTOM_PORT="

if not "%1"=="" (
  if /I "%1"=="docker" set "MODE=docker"
  if /I "%1"=="local"  set "MODE=local"
)
if not "%2"=="" set "CUSTOM_PORT=%2"

echo.
echo  ++++++++++++++++++++++++++++++++++++++++++++++++
echo   %APP_NAME%  -  RESTART
echo   Mode : !MODE!
if defined CUSTOM_PORT echo   Port : !CUSTOM_PORT!
echo  ++++++++++++++++++++++++++++++++++++++++++++++++
echo.

:: =========================================================
::  LANGKAH 1: STOP
:: =========================================================
echo  [1/3] Menghentikan server ...
echo  -------------------------------------------------

if /I "!MODE!"=="docker" (
  where docker >nul 2>&1
  if !ERRORLEVEL!==0 (
    cd /d "%SCRIPT_DIR%"
    docker compose down 2>&1
    echo [OK]    Container dihentikan.
  ) else (
    echo [WARN]  Docker tidak ditemukan. Skip.
  )
  goto :STEP2
)

:: Stop local
set "STOPPED_L=0"
if exist "%PID_FILE%" (
  set /p SAVED_PID=<"%PID_FILE%"
  if not "!SAVED_PID!"=="" (
    tasklist /FI "PID eq !SAVED_PID!" 2>nul | findstr /I "node.exe" >nul 2>&1
    if !ERRORLEVEL!==0 (
      taskkill /PID !SAVED_PID! /F >nul 2>&1
      if !ERRORLEVEL!==0 (
        echo [OK]    Proses PID !SAVED_PID! dihentikan.
        set "STOPPED_L=1"
      )
    ) else (
      set "STOPPED_L=1"
    )
  )
  del /F /Q "%PID_FILE%" >nul 2>&1
)

if "!STOPPED_L!"=="0" (
  :: Fallback: kill via wmic
  for /F "tokens=2" %%P in ('wmic process where "name='node.exe' and commandline like '%%server.js%%'" get processid 2^>nul ^| findstr /R "[0-9][0-9]*"') do (
    taskkill /PID %%P /F >nul 2>&1
    echo [OK]    node.exe PID %%P dihentikan.
    set "STOPPED_L=1"
  )
)

:: Fallback-2: via port
if "!STOPPED_L!"=="0" (
  for /L %%I in (5000,1,5020) do (
    for /F "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":%%I " ^| findstr "LISTENING"') do (
      if not "%%P"=="" (
        tasklist /FI "PID eq %%P" 2>nul | findstr /I "node.exe" >nul 2>&1
        if !ERRORLEVEL!==0 (
          taskkill /PID %%P /F >nul 2>&1
          echo [OK]    node.exe PID %%P di port %%I dihentikan.
        )
      )
    )
  )
)

:: =========================================================
::  LANGKAH 2: TUNGGU
:: =========================================================
:STEP2
echo.
echo  [2/3] Menunggu proses berhenti ...
echo  -------------------------------------------------

set "WAIT=0"
:WAIT_LOOP
  timeout /T 1 /NOBREAK >nul
  set /a "WAIT=!WAIT!+1"
  set "STILL_UP=0"
  for /L %%I in (5000,1,5020) do (
    netstat -ano 2>nul | findstr ":%%I " | findstr "LISTENING" >nul 2>&1
    if !ERRORLEVEL!==0 set "STILL_UP=1"
  )
  if "!STILL_UP!"=="1" (
    if !WAIT! LSS 8 (
      echo  [INFO]  Menunggu ... (!WAIT!/8)
      goto :WAIT_LOOP
    ) else (
      echo [WARN]  Paksa hentikan proses yang tersisa ...
      for /L %%I in (5000,1,5020) do (
        for /F "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":%%I " ^| findstr "LISTENING"') do (
          if not "%%P"=="" (
            tasklist /FI "PID eq %%P" 2>nul | findstr /I "node.exe" >nul 2>&1
            if !ERRORLEVEL!==0 (
              taskkill /PID %%P /F >nul 2>&1
              echo [OK]    Port %%I: PID %%P dihentikan paksa.
            )
          )
        )
      )
      timeout /T 2 /NOBREAK >nul
    )
  ) else (
    echo [OK]    Semua proses berhenti.
  )

:: =========================================================
::  LANGKAH 3: START
:: =========================================================
echo.
echo  [3/3] Menjalankan kembali server ...
echo  -------------------------------------------------

if /I "!MODE!"=="docker" (
  where docker >nul 2>&1
  if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Docker tidak tersedia!
    pause
    exit /b 1
  )
  cd /d "%SCRIPT_DIR%"
  docker compose up -d --build 2>&1
  if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Docker compose gagal!
    pause
    exit /b 1
  )
  echo.
  echo [OK]    Container berhasil dijalankan kembali.
  docker compose ps 2>&1
  echo.
  pause
  exit /b 0
)

:: -- Start Local --
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: Baca PORT dari .env
set "ENV_PORT=%DEFAULT_PORT%"
if exist "%ENV_FILE%" (
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
)

if defined CUSTOM_PORT (
  set "USE_PORT=!CUSTOM_PORT!"
) else (
  set "USE_PORT=!ENV_PORT!"
)

:: Temukan port bebas
set "FINAL_PORT=!USE_PORT!"
call :CHECK_PORT !USE_PORT!
if "!PORT_BUSY!"=="1" (
  echo [WARN]  Port !USE_PORT! masih terpakai. Mencari port lain ...
  set /a "TRY=!USE_PORT!+1"
  :FIND_PORT_R
    if !TRY! GTR !PORT_RANGE_MAX! (
      echo [ERROR] Tidak ada port bebas!
      pause
      exit /b 1
    )
    call :CHECK_PORT !TRY!
    if "!PORT_BUSY!"=="1" (
      set /a "TRY=!TRY!+1"
      goto :FIND_PORT_R
    )
  set "FINAL_PORT=!TRY!"
  echo [INFO]  Menggunakan port: !FINAL_PORT!
) else (
  echo [INFO]  Menggunakan port: !FINAL_PORT!
)

echo.
echo  +--------------------------------------------------+
echo   URL    : http://localhost:!FINAL_PORT!
echo   API    : http://localhost:!FINAL_PORT!/api/v1
echo   Docs   : http://localhost:!FINAL_PORT!/api-docs
echo   Health : http://localhost:!FINAL_PORT!/health
echo   Log    : !LOG_FILE!
echo  +--------------------------------------------------+
echo.

cd /d "%SCRIPT_DIR%"
start "Comic API Server" /B cmd /C "set PORT=!FINAL_PORT!&& node server.js >> "!LOG_FILE!" 2>&1"
timeout /T 2 /NOBREAK >nul

set "NEW_PID="
for /F "skip=3 tokens=2" %%P in ('tasklist /FI "IMAGENAME eq node.exe" /FO TABLE 2^>nul') do (
  if not defined NEW_PID set "NEW_PID=%%P"
)
if defined NEW_PID (
  echo !NEW_PID!> "%PID_FILE%"
  echo [OK]    Server direstart. PID: !NEW_PID!
) else (
  echo [WARN]  Tidak dapat baca PID. Periksa log: !LOG_FILE!
)

echo.
echo [OK]    %APP_NAME% berhasil di-restart!
echo.
pause
exit /b 0

:: =========================================================
::  SUBROUTINE: Cek Port
:: =========================================================
:CHECK_PORT
set "PORT_BUSY=0"
netstat -ano 2>nul | findstr ":%1 " | findstr "LISTENING" >nul 2>&1
if !ERRORLEVEL!==0 set "PORT_BUSY=1"
goto :eof
