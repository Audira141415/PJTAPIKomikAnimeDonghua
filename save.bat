@echo off
setlocal EnableDelayedExpansion
title Save & Push ke GitHub

:: =========================================================
::  save.bat -- Commit semua perubahan dan push ke GitHub
::  Cara  : save.bat
::           save.bat "pesan commit kustom"
::  Contoh: save.bat
::           save.bat "feat: tambah module samehadaku"
:: =========================================================

set "BRANCH=main"
set "REMOTE=origin"

:: --- Ambil pesan commit dari argumen atau default --------
if not "%~1"=="" (
    set "MSG=%~1"
) else (
    :: Default: pakai timestamp + status singkat
    for /f "tokens=1-3 delims=/ " %%a in ("%DATE%") do set "D=%%c-%%b-%%a"
    for /f "tokens=1-2 delims=: " %%a in ("%TIME%") do set "T=%%a:%%b"
    set "T=!T: =0!"
    set "MSG=chore: update !D! !T!"
)

echo.
echo  ============================================
echo   SAVE ^& PUSH KE GITHUB
echo   Remote : %REMOTE%
echo   Branch : %BRANCH%
echo   Commit : !MSG!
echo  ============================================
echo.

:: --- Cek apakah ini git repo ----------------------------
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Bukan git repository!
    pause & exit /b 1
)

:: --- Status perubahan -----------------------------------
echo  [1/4] Mengecek perubahan...
git status --short
echo.

:: --- Apakah ada perubahan? ------------------------------
for /f %%i in ('git status --porcelain') do set "HAS_CHANGES=1"
if not defined HAS_CHANGES (
    echo  [INFO] Tidak ada perubahan. Tidak ada yang di-push.
    pause & exit /b 0
)

:: --- Add semua perubahan --------------------------------
echo  [2/4] Menambahkan semua file...
git add -A
if errorlevel 1 (
    echo  [ERROR] git add gagal!
    pause & exit /b 1
)

:: --- Commit ---------------------------------------------
echo  [3/4] Membuat commit: "!MSG!"
git commit -m "!MSG!"
if errorlevel 1 (
    echo  [ERROR] git commit gagal!
    pause & exit /b 1
)

:: --- Push -----------------------------------------------
echo  [4/4] Pushing ke %REMOTE%/%BRANCH%...
git push %REMOTE% %BRANCH%
if errorlevel 1 (
    echo.
    echo  [ERROR] Push gagal! Coba jalankan: git pull origin %BRANCH% --rebase
    pause & exit /b 1
)

echo.
echo  ============================================
echo   BERHASIL! Kode sudah di-push ke GitHub.
echo   https://github.com/Audira141415/PJTAPIKomikAnimeDonghua
echo  ============================================
echo.
pause
