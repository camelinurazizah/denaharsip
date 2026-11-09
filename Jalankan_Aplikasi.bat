@echo off
chcp 65001 >nul
title Sistem Denah Interaktif & Tur Panorama - Disarpus Kab. Cirebon
color 0B

echo ===============================================================================
echo     DINAS KEARSIPAN DAN PERPUSTAKAAN KABUPATEN CIREBON
echo     SISTEM INFORMASI DENAH INTERAKTIF DAN TUR PANORAMA FASILITAS
echo ===============================================================================
echo.
echo [1/3] Menyiapkan Server Web Lokal...

cd /d "%~dp0"

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [2/3] Python terdeteksi. Memulai server...
    if exist server.py (
        python server.py
        goto end
    ) else (
        start "" http://localhost:8000/index.html
        python -m http.server 8000
        goto end
    )
)

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [2/3] Node.js terdeteksi. Membuka browser...
    start "" http://localhost:8000/index.html
    echo.
    npx -y serve -p 8000 .
    goto end
)

echo [PERINGATAN] Python / Node.js tidak ditemukan di PATH.
echo Membuka aplikasi langsung di peramban (Mode Offline / Berkas Lokal)...
start "" "%~dp0index.html"

:end
pause
