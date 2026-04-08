@echo off
setlocal EnableDelayedExpansion
title Comic Platform API - Stop

:: =========================================================
::  stop.bat -- Menghentikan Comic Platform API
::  Cara  : stop.bat [local|docker]
::  Contoh: stop.bat
::           stop.bat docker
:: =========================================================

set "APP_NAME=Comic Platform API"
set "SCRIPT_DIR=%~dp0"
set "PID_FILE=%SCRIPT_DIR%.app.pid"
set "MODE=local"

if not "%1"=="" (
  if /I "%1"=="docker" set "MODE=docker"
  if /I "%1"=="local"  set "MODE=local"
)

echo.
echo  ++++++++++++++++++++++++++++++++++++++++++++++++
echo   %APP_NAME%  -  STOP
echo   Mode : !MODE!
echo  ++++++++++++++++++++++++++++++++++++++++++++++++
echo.

if /I "!MODE!"=="docker" goto :DOCKER_STOP

:: =========================================================
::  MODE LOCAL NODE.JS
:: =========================================================

set "STOPPED=0"

:: -- Coba via PID file --
if exist "%PID_FILE%" (
  set /p SAVED_PID=<"%PID_FILE%"
  if not "!SAVED_PID!"=="" (
    echo [INFO]  PID tersimpan: !SAVED_PID!
    tasklist /FI "PID eq !SAVED_PID!" 2>nul | findstr /I "node.exe" >nul 2>&1
    if !ERRORLEVEL!==0 (
      echo [INFO]  Menghentikan proses PID !SAVED_PID! ...
      taskkill /PID !SAVED_PID! /F >nul 2>&1
      if !ERRORLEVEL!==0 (
        echo [OK]    Server dihentikan (PID !SAVED_PID!)
        set "STOPPED=1"
      ) else (
        echo [WARN]  Gagal menghentikan PID !SAVED_PID!. Coba metode lain ...
      )
    ) else (
      echo [INFO]  Proses !SAVED_PID! tidak ditemukan (sudah berhenti).
      set "STOPPED=1"
    )
  )
  del /F /Q "%PID_FILE%" >nul 2>&1
  echo [OK]    PID file dihapus.
)

:: -- Fallback: cari node.exe yang jalankan server.js --
if "!STOPPED!"=="0" (
  echo [INFO]  Mencari proses node server.js ...
  set "FOUND=0"
  for /F "tokens=2" %%P in ('wmic process where "name='node.exe' and commandline like '%%server.js%%'" get processid 2^>nul ^| findstr /R "[0-9][0-9]*"') do (
    echo [INFO]  Menghentikan node.exe PID %%P ...
    taskkill /PID %%P /F >nul 2>&1
    if !ERRORLEVEL!==0 (
      echo [OK]    Proses %%P dihentikan.
      set "FOUND=1"
      set "STOPPED=1"
    )
  )
  :: -- Fallback 2: cari via port yang digunakan --
  if "!FOUND!"=="0" (
    echo [INFO]  Mencari node.exe via port 5000-5020 ...
    for /L %%I in (5000,1,5020) do (
      for /F "tokens=5" %%P in ('netstat -ano 2^>nul ^| findstr ":%%I " ^| findstr "LISTENING"') do (
        if not "%%P"=="" (
          tasklist /FI "PID eq %%P" 2>nul | findstr /I "node.exe" >nul 2>&1
          if !ERRORLEVEL!==0 (
            echo [INFO]  Port %%I: node.exe PID %%P -- menghentikan ...
            taskkill /PID %%P /F >nul 2>&1
            if !ERRORLEVEL!==0 (
              echo [OK]    Proses %%P di port %%I dihentikan.
              set "STOPPED=1"
            )
          )
        )
      )
    )
  )
)

if "!STOPPED!"=="0" (
  echo [INFO]  Tidak ada proses server yang berjalan.
) else (
  echo.
  echo [OK]    %APP_NAME% telah dihentikan.
)

echo.
pause
exit /b 0

:: =========================================================
::  MODE DOCKER
:: =========================================================
:DOCKER_STOP

where docker >nul 2>&1
if !ERRORLEVEL! NEQ 0 (
  echo [ERROR] Docker tidak ditemukan!
  pause
  exit /b 1
)

if not exist "%SCRIPT_DIR%docker-compose.yml" (
  echo [ERROR] docker-compose.yml tidak ditemukan!
  pause
  exit /b 1
)

cd /d "%SCRIPT_DIR%"
echo [INFO]  Menghentikan container Docker ...
echo.
docker compose down 2>&1
if !ERRORLEVEL! NEQ 0 (
  echo [WARN]  docker compose down gagal. Coba paksa hentikan?
  set /p FORCE= Paksa hentikan? [Y/N]: 
  if /I "!FORCE!"=="Y" (
    docker compose kill 2>&1
    docker compose rm -f 2>&1
  )
) else (
  echo.
  echo [OK]    Semua container dihentikan.
)
echo.
pause
exit /b 0
