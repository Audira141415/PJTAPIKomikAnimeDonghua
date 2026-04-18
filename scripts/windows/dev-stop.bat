@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Comic Platform API - Dev Stop

:: =========================================================
:: dev-stop.bat -- Stop local dev app + optional Docker DB
:: Cara  : dev-stop.bat
::         dev-stop.bat docker
:: =========================================================

cd /d "%~dp0"

set "STOP_DOCKER=0"
if /I "%~1"=="docker" set "STOP_DOCKER=1"

echo.
echo ================================================
echo  DEV STOP: Local App + Optional Docker DB
echo ================================================
echo.

set "STOPPED=0"

echo [1/2] Menghentikan local app (nodemon/node) ...
powershell -NoProfile -Command "$repo = [regex]::Escape(((Resolve-Path '.').Path)); $killed = @(); try { Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -and $_.CommandLine -match $repo -and $_.CommandLine -match 'nodemon|server.js' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $killed += $_.ProcessId }; $listeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($id in $listeners) { $proc = Get-CimInstance Win32_Process -Filter \"ProcessId=$id\" -ErrorAction SilentlyContinue; if ($proc -and $proc.CommandLine -and $proc.CommandLine -match $repo) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue; $killed += $id } }; $uniq = $killed | Sort-Object -Unique; if ($uniq.Count -eq 0) { Write-Host '[INFO]  Tidak ada proses local dev yang aktif.'; exit 2 } else { foreach ($id in $uniq) { Write-Host ('[OK]    Proses PID {0} dihentikan.' -f $id) }; exit 0 } } catch { Write-Host ('[ERROR]  Gagal stop local dev: {0}' -f $_.Exception.Message); exit 3 }"
if "%ERRORLEVEL%"=="0" set "STOPPED=1"
if not "%ERRORLEVEL%"=="0" if not "%ERRORLEVEL%"=="2" (
    echo [WARN]  Terjadi error saat menghentikan local dev process.
)

if "%STOPPED%"=="0" (
    rem status already printed by PowerShell
)

if "%STOP_DOCKER%"=="0" (
    set "ANS="
    set /p ANS= [2/2] Stop Mongo/Redis Docker juga? [Y/N]: 
    if /I "%ANS%"=="Y" set "STOP_DOCKER=1"
    if /I "%ANS%"=="YES" set "STOP_DOCKER=1"
)

if "%STOP_DOCKER%"=="1" (
    where docker >nul 2>&1
    if errorlevel 1 (
        echo [WARN]  Docker tidak tersedia. Lewati stop Mongo/Redis.
    ) else (
        docker compose version >nul 2>&1
        if errorlevel 1 (
            echo [WARN]  Docker Compose tidak tersedia. Lewati stop Mongo/Redis.
            goto :done
        )
        echo [2/2] Menghentikan Mongo/Redis Docker ...
        docker compose stop mongo redis >nul 2>&1
        if errorlevel 1 (
            echo [WARN]  Gagal stop service mongo/redis.
        ) else (
            echo [OK]    Mongo/Redis Docker dihentikan.
        )
    )
) else (
    echo [2/2] Docker Mongo/Redis tetap berjalan.
)

:done
echo.
echo Selesai.
exit /b 0
