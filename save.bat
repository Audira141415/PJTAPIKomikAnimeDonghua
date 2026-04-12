@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Save ^& Push ke GitHub

:: =========================================================
:: save.bat -- commit semua perubahan lalu push ke GitHub
:: Cara  : save.bat
::         save.bat "pesan commit kustom"
:: Contoh: save.bat
::         save.bat "feat: tambah module samehadaku"
:: =========================================================

set "REMOTE=origin"
set "BRANCH="
set "MSG=%~1"

:: --- Pastikan ini repo Git --------------------------------
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Folder ini bukan git repository.
    pause
    exit /b 1
)

:: --- Ambil branch aktif -----------------------------------
for /f "usebackq delims=" %%i in (`git branch --show-current`) do set "BRANCH=%%i"
if not defined BRANCH (
    echo [ERROR] Tidak bisa menentukan branch aktif. Repository mungkin sedang detached HEAD.
    pause
    exit /b 1
)

:: --- Cek remote -------------------------------------------
git remote get-url %REMOTE% >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Remote "%REMOTE%" tidak ditemukan.
    pause
    exit /b 1
)

:: --- Commit message default ------------------------------
if "%MSG%"=="" (
    for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "Get-Date -Format ''yyyy-MM-dd HH:mm''"`) do set "STAMP=%%i"
    call set "MSG=chore: update %%STAMP%%"
)

echo.
echo ============================================
echo  SAVE ^& PUSH KE GITHUB
echo  Remote : %REMOTE%
echo  Branch : %BRANCH%
echo  Commit : %MSG%
echo ============================================
echo.

echo [1/4] Mengecek perubahan...
git status --short
echo.

echo [2/4] Menambahkan semua file...
git add -A
if errorlevel 1 (
    echo [ERROR] git add gagal.
    pause
    exit /b 1
)

git diff --cached --quiet
if not errorlevel 1 (
    echo [INFO] Tidak ada perubahan untuk di-commit.
    pause
    exit /b 0
)

echo [3/4] Membuat commit: "%MSG%"
git commit -m "%MSG%"
if errorlevel 1 (
    echo [ERROR] git commit gagal.
    pause
    exit /b 1
)

echo [4/4] Push ke %REMOTE%/%BRANCH%...
git push -u %REMOTE% "%BRANCH%"
if errorlevel 1 (
    echo.
    echo [ERROR] Push gagal.
    echo [INFO] Coba jalankan: git pull --rebase %REMOTE% "%BRANCH%"
    pause
    exit /b 1
)

echo.
echo ============================================
echo  BERHASIL! Perubahan sudah di-push ke GitHub.
echo ============================================
echo.
pause
