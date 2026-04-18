@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Comic Platform API - Full Import Daily Reset

:: =========================================================
:: full-import-daily.bat -- Reset checkpoint lalu jalankan full import
:: Cara: full-import-daily.bat
:: Cocok dipakai sebagai action di Windows Task Scheduler.
:: =========================================================

cd /d "%~dp0"

set "LOG_DIR=%~dp0logs"
set "CHECKPOINT_FILE=%LOG_DIR%\full-import.checkpoint.json"
set "PROGRESS_LOG=%LOG_DIR%\full-import.progress.log"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo.
echo ================================================
echo  FULL IMPORT DAILY RESET
echo ================================================
echo.
echo [INFO]  Checkpoint : %CHECKPOINT_FILE%
echo [INFO]  Log        : %PROGRESS_LOG%
echo [INFO]  Mode       : reset + resume-safe full import
echo.

call npm run import:full -- --reset-checkpoint --checkpoint "%CHECKPOINT_FILE%" --progress-log "%PROGRESS_LOG%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo [OK]    Full import harian selesai.
) else (
  echo [ERROR] Full import harian gagal dengan exit code %EXIT_CODE%.
)
echo.
exit /b %EXIT_CODE%