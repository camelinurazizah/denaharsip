@echo off
chcp 65001 >nul
title Sistem Denah Interaktif & Tur Panorama - Disarpus Kab. Cirebon
color 0B

echo ===============================================================================
echo     DINAS KEARSIPAN DAN PERPUSTAKAAN KABUPATEN CIREBON
echo     SISTEM INFORMASI DENAH INTERAKTIF DAN TUR PANORAMA FASILITAS
echo ===============================================================================
echo.
echo [1/2] Menyiapkan Server Web Lokal...

cd /d "%~dp0"

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [2/2] Node.js terdeteksi. Memulai server web JavaScript...
    node server.js
    goto end
)

echo [PERINGATAN] Node.js tidak ditemukan di PATH sistem.
echo Membuka aplikasi langsung di peramban (Mode Berkas Lokal)...
start "" "%~dp0index.html"

:end
pause
