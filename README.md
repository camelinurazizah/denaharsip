# Visual Archive Locator — Denah Interaktif & Tur Panorama Gedung Kearsipan
### Dinas Kearsipan dan Perpustakaan Kabupaten Cirebon

Aplikasi web pemandu mandiri (*indoor wayfinding, visual archive locator & virtual facility tour*) yang difokuskan khusus untuk **Gedung Kearsipan (Lantai 1 & Lantai 2)** Dinas Kearsipan dan Perpustakaan Kabupaten Cirebon. Memadukan **Peta Denah 2D Interaktif Berbasis Cetak Biru Arsitektur Asli** dengan **Penampil Citra Tur Panorama 360°** (*Interactive 360° Panorama Viewer*), dilengkapi patokan posisi fisik antar-ruangan, rincian layanan kearsipan, serta pencarian fisik **Boks & Surat Arsip** per lemari/rak depo arsip.

---

## 🏛️ Identitas Visual & Branding
- **Logo Resmi**: Menggunakan Lambang Resmi **Dinas Kearsipan dan Perpustakaan Kabupaten Cirebon (Disarpus)**.
- **Sub-judul Portal**: *"Sistem Informasi Denah Interaktif, Tur Panorama & Pencarian Lokasi Boks Arsip - Gedung Kearsipan"*.

---

## 🚀 Fitur Utama & Cakupan Gedung Kearsipan

| Kode Kebutuhan | Fitur Utama | Implementasi Teknis |
| :--- | :--- | :--- |
| **SRS-FR-02** | Pemilih Lantai Gedung Kearsipan | Beralih instan antara **Lantai 1 - Layanan & Tata Usaha Arsip** dan **Lantai 2 - Depo & Restorasi Arsip**. |
| **SRS-FR-03** | Denah 2D Berbasis Blueprint Asli | Dibuat presisi berdasarkan **Denah Rencana Kusen Gedung Arsip Lantai 1 (Skala 1:150) & Lantai 2 (Skala 1:100)**. Dilengkapi tombol **Toggle Layer**: **"🎨 Denah Digital"** dan **"📐 Cetak Biru Asli"**. |
| **SRS-FR-04 & FR-05** | Live Search Boks, Surat & Ruangan | Pencarian real-time nama ruangan, jenis layanan, kode klasifikasi/nomor rak, unit pencipta, tahun arsip, dan nomor boks/surat (cth: *"Boks B-04"*, *"SK"*, *"Restorasi"*). |
| **SRS-FR-06** | Modal Dokumentasi Ruangan | Memuat foto depan ruangan, patokan posisi fisik (*nearby notes*), rincian fungsi/layanan kearsipan, daftar lemari/rak di dalam ruangan, serta tombol *"Buka Tur Panorama Ruangan"*. |
| **SRS-FR-07** | Modal Inventaris Lemari / Rak Depo Arsip | Memuat foto fisik lemari/rak, Kode Klasifikasi / Nomor Rak (cth: `ARS-900 / Rak Besi 02`), Patokan Lorong & Baris/Shaf Rak, serta **Daftar Inventaris Boks & Surat Arsip** (Nomor Boks & Nama Berkas, Unit Pencipta, Kurun Waktu/Tahun, Jumlah Boks, Status Akses: `Arsip Terbuka`, `Akses Terbatas`, `Sedang Dipinjam`). |
| **SRS-FR-08 & FR-09** | Tur Panorama 360° (Dual Engine) | Rendering panorama **Pannellum JS** dengan **Fallback 360° Pan Engine Bawaan** agar tetap berjalan lancar secara offline maupun lewat `file:///`. |
| **SRS-FR-10 – FR-14** | Panel Petugas (Admin) Terstruktur | Urutan alur terstruktur: (1) **Denah & Lantai**, (2) **Registrasi Ruangan**, (3) **Visual Hotspot Mapper**, (4) **Kelola Data & Hapus**, (5) **Akun Petugas Dinas**, (6) **Database Turso**. Dilengkapi opsi upload gambar langsung dari perangkat (`<input type="file" accept="image/*">`) berdampingan dengan input teks URL. |
| **SRS-NFR-04** | Fallback Seed Data Otomatis | Berjalan langsung secara lokal/offline dengan data bawaan Gedung Kearsipan 2 Lantai dan persistensi `safeStorage`. |
| **Kiosk QR** | Scan QR Kiosk & Deteksi IP Wi-Fi | Generator QR Code standar offline (`qrcode-gen.js`) dengan deteksi IP Wi-Fi LAN otomatis via `server.js` (`/api/network-info`), edit tautan manual, salin link, dan unduh PNG. |

---

## ⚡ Cara Menjalankan Aplikasi

### CARA 1: Klik Dua Kali `Jalankan_Aplikasi.bat`
👉 **Klik dua kali pada file `Jalankan_Aplikasi.bat`** untuk menyalakan server lokal dan membuka `http://localhost:8000/index.html`.

### CARA 2: Melalui Terminal / Command Prompt
```bash
node server.js
# atau
npm start
```
Lalu buka:
- **`http://localhost:8000`** (Portal Pengunjung Publik)
- **`http://localhost:8000/admin.html`** (Panel Petugas Gedung Kearsipan)

---

## 🔑 Kredensial Akun Petugas Demo
Klik tombol **"🔐 Akses Petugas"** pada portal publik:
- **Alamat Surel**: `admin@disarpus.cirebonkab.go.id`
- **Kata Sandi**: `cirebon2026` *(atau sandi alternatif: `cirebon123` / `admin123`)*
- Atau masukkan langsung di formulir login petugas.

---

## 📂 Struktur Direktori Proyek

```text
projek_pkl_amel/
├── Jalankan_Aplikasi.bat       # Peluncur otomatis 1-klik server lokal & peramban
├── server.js                   # Server lokal Node.js + deteksi IP Wi-Fi LAN (/api/network-info)
├── index.html                  # Antarmuka Utama Pengunjung / Pemustaka
├── admin.html                  # Antarmuka Pengelolaan Petugas Dinas (Wajib Login)
├── assets/
│   ├── css/
│   │   ├── style.css           # Styling portal publik, layout responsif & animasi pin
│   │   └── admin.css           # Styling dashboard petugas & kanvas visual hotspot mapper
│   ├── js/
│   │   ├── qrcode-gen.js       # Generator QR Code offline standar ISO/IEC 18004 (SVG & PNG)
│   │   ├── turso-client.js     # Klien Resmi Turso Database libSQL / SQLite Edge Cloud
│   │   ├── data-service.js     # Pengelola DataService, Turso Sync & SafeStorage Bawaan (SRS-NFR-04)
│   │   ├── app.js              # Logika denah 2 lantai, live search, modal & Dual 360 Engine
│   │   ├── admin.js            # Logika auth petugas, kanvas klik denah & visual hotspot mapper
│   │   └── panorama-data.js    # Citra panorama 360 derajat resolusi tinggi
│   └── images/
│       ├── logo-disarpus.png              # Logo Resmi Disarpus Kab. Cirebon
│       ├── blueprint-arsip-lt1.jpg        # Cetak Biru Asli Lantai 1 Gedung Kearsipan (1024x764)
│       ├── blueprint-arsip-lt2.jpg        # Cetak Biru Asli Lantai 2 Gedung Kearsipan (1024x764)
│       ├── gedung-kearsipan-lantai-1.svg  # Denah Digital Interaktif Lt 1 Kearsipan
│       ├── gedung-kearsipan-lantai-2.svg  # Denah Digital Interaktif Lt 2 Kearsipan
│       ├── ruang-pa-pano.jpg              # Citra Panorama Ruang Pelayanan & Tamu (PA)
│       ├── ruang-restorasi-pano.jpg       # Citra Panorama Ruang Restorasi & Preservasi Arsip
│       └── depo-arsip-pano.jpg            # Citra Panorama Depo Roll O'Pack & Rak Besi
└── README.md                   # Dokumentasi instalasi dan panduan pengoperasian
```
