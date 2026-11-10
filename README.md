# Sistem Informasi Denah Interaktif dan Tur Panorama Fasilitas
### Dinas Kearsipan dan Perpustakaan Kabupaten Cirebon

Aplikasi web pemandu mandiri satu pintu (*indoor wayfinding & virtual facility tour*) yang memadukan **Peta Denah 2D Interaktif Berbasis Cetak Biru Arsitektur Asli** dengan **Penampil Citra Tur Panorama 360°** (*Interactive 360° Panorama Viewer*) untuk 2 unit gedung operasional (Gedung Perpustakaan & Gedung Kearsipan) masing-masing 2 lantai pelayanan (total 4 lantai), dilengkapi patokan posisi fisik antar-ruangan, informasi layanan administrasi, dan katalog buku per rak.

Dibangun murni berdasarkan dokumen **Makalah Perancangan Sistem**, **Product Requirements Document (PRD)**, dan **Software Requirements Specification (SRS)**.

---

## 🏛️ Identitas Visual & Branding
- **Logo Resmi**: Menggunakan Foto & Lambang Resmi **Dinas Kearsipan dan Perpustakaan Kabupaten Cirebon (Disarpus)** dengan simbol segitiga buku warna-warni yang estetik dan tulisan *"Disarpus"*.
- Logo disematkan secara proporsional dan elegan pada:
  1. *Favicon* peramban web
  2. *Header Navbar* portal publik
  3. *Dialog Modal Login Petugas*
  4. *Dashboard Pengelola Petugas (Admin)*

---

## 🚀 Fitur Utama & Kepatuhan Spesifikasi (SRS & PRD)

| Kode Kebutuhan | Fitur Utama | Implementasi Teknis |
| :--- | :--- | :--- |
| **SRS-FR-01 & FR-02** | Pemilih Gedung & Lantai | Beralih instan antara Gedung Perpustakaan dan Gedung Kearsipan (Lantai 1 & 2). |
| **SRS-FR-03** | Denah 2D Berbasis Blueprint Asli | Dibuat presisi berdasarkan **Cetak Biru Denah Rencana Kusen Skala 1:150** Gedung Perpustakaan Lantai 1 & 2. Dilengkapi tombol **Toggle Layer**: **"🎨 Denah Digital"** (Vektor SVG estetik) dan **"📐 Cetak Biru Asli"** (Arsitektural teknis). |
| **SRS-FR-04 & FR-05** | Live Search Lintas Gedung | Pencarian real-time nama ruangan, rincian layanan, kode DDC, dan judul buku (cth: *"PA"*, *"Babad"*, *"Restorasi"*). Otomatis berpindah lantai, menyorot pin, dan mengarahkan sudut kamera panorama. |
| **SRS-FR-06** | Modal Dokumentasi Ruangan | Jendela informasi pop-up memuat foto fisik, patokan lokasi sekitar (*nearby notes*), rincian layanan & syarat berkas, jam buka, serta tombol *"Jelajahi Tur 360°"*. |
| **SRS-FR-07** | Modal Katalog Rak Buku | Kartu detail rak memuat foto fisik, kode klasifikasi DDC (cth: `959.82`), patokan lorong, serta tabel daftar buku lengkap (Judul, Penulis, Tahun, Eksemplar, Status) dan tombol arahkan kamera ke rak. |
| **SRS-FR-08 & FR-09** | Tur Panorama 360° (Dual Engine) | Rendering WebGL panorama menggunakan **Pannellum JS** (`type: "equirectangular"`). Dilengkapi **Fallback 360° Pan Engine Bawaan** (HTML5 Canvas / CSS) sehingga 100% dijamin **TIDAK AKAN PERNAH LAYAR HITAM** meskipun dibuka secara offline atau lewat protokol `file:///`. |
| **SRS-FR-10** | Autentikasi Admin Satu Pintu | Tombol *"🔐 Akses Petugas"* dengan modal login berlogo resmi Disarpus. Terintegrasi Supabase Auth & tombol 1-Klik Demo Petugas. |
| **SRS-FR-11** | Manajemen Denah & Unggah Media | Tambah, ubah, dan perbarui data lantai serta berkas arsitektur denah di Dashboard Admin. |
| **SRS-FR-12** | Pemetaan Koordinat Denah Otomatis | Cukup klik pada kanvas denah 2D di Dashboard Admin, sistem otomatis menghitung persentase `map_x` dan `map_y` tanpa mengetik angka manual. |
| **SRS-FR-13** | Visual Hotspot Mapper | Klik langsung pada gambar lemari rak di foto panorama 360° untuk menangkap sudut `pitch` dan `yaw` secara otomatis. |
| **SRS-FR-14** | Manajemen Buku per Rak | Penambahan baris dinamis (*dynamic table rows*) judul buku, pengarang, tahun terbit, dan status peminjaman. |
| **SRS-NFR-04** | Fallback Seed Data Otomatis | Sistem langsung dapat berjalan dan diuji secara offline/lokal tanpa konfigurasi awal Supabase, dengan persistensi aman `safeStorage`. |

---

## ⚡ Cara Menjalankan Aplikasi (Sangat Mudah!)

### CARA 1: Cukup Klik Dua Kali `Jalankan_Aplikasi.bat` (PALING MUDAH ⭐⭐⭐⭐⭐)
Di dalam folder proyek, telah disediakan berkas peluncur otomatis:
👉 **Klik dua kali pada file `Jalankan_Aplikasi.bat`**

File ini akan otomatis:
1. Menyalakan server web lokal di komputer Anda.
2. Membuka peramban (Google Chrome/Edge/Firefox) langsung ke alamat aplikasi **`http://localhost:8000/index.html`**.
3. Menampilkan petunjuk penggunaan dan kredensial login.

---

### CARA 2: Melalui Terminal / Command Prompt (Manual)
Jika Anda ingin menjalankannya lewat terminal:
```bash
# Menggunakan Node.js:
node server.js
# atau:
npm start
```
Lalu buka peramban di:
👉 **`http://localhost:8000`** (Portal Pengunjung Publik)
👉 **`http://localhost:8000/admin.html`** (Panel Petugas Dinas)

---

### CARA 3: Buka Langsung Berkas `index.html` (Double-Click)
Jika tidak ingin menggunakan server, Anda juga dapat langsung mengklik dua kali (*double click*) berkas `index.html` dari File Explorer. Sistem telah dilengkapi mesin render fallback otomatis sehingga peta denah dan panorama 360° tetap tampil mulus tanpa terkendala pembatasan CORS peramban.

---

## 🔑 Kredensial Akun Petugas Dinas (Untuk Pengujian & Demo)

Pada portal publik (`index.html`), klik tombol **"🔐 Akses Petugas"** pada sudut kanan atas:
- **Alamat Surel Petugas**: `admin@disarpus.cirebonkab.go.id`
- **Kata Sandi**: `admin123`
- *Tips*: Anda juga dapat mengklik tombol **"⚡ 1-Klik Masuk Demo Petugas"** di dalam jendela login untuk langsung masuk tanpa mengetik manual!

---

## 📂 Struktur Direktori Proyek

```text
projek_pkl_amel/
├── Jalankan_Aplikasi.bat       # Peluncur otomatis 1-klik server lokal & peramban
├── index.html                  # Antarmuka Utama Pengunjung / Pemustaka
├── admin.html                  # Antarmuka Pengelolaan Petugas Dinas (Wajib Login)
├── assets/
│   ├── css/
│   │   ├── style.css           # Styling portal publik, layout responsif & animasi pin
│   │   └── admin.css           # Styling dashboard petugas & kanvas visual hotspot mapper
│   ├── js/
│   │   ├── supabase-client.js  # Klien Supabase + SafeStorage & Data Seed Bawaan (SRS-NFR-04)
│   │   ├── app.js              # Logika denah 2 lantai, live search, modal & Dual 360 Engine
│   │   ├── admin.js            # Logika auth petugas, kanvas klik denah & visual hotspot mapper
│   │   └── panorama-data.js    # Citra panorama 360 derajat resolusi tinggi
│   └── images/
│       ├── logo-disarpus.png   # Logo Resmi Dinas Kearsipan & Perpustakaan Kab. Cirebon
│       ├── blueprint-clean-lt1.jpg # Cetak Biru Asli Denah Rencana Kusen Lantai 1 (Skala 1:150)
│       ├── blueprint-clean-lt2.jpg # Cetak Biru Asli Denah Rencana Kusen Lantai 2 (Skala 1:150)
│       ├── gedung-perpustakaan-lantai-1.svg # Denah Vektor Estetik Lantai 1 (Sesuai Blueprint)
│       ├── gedung-perpustakaan-lantai-2.svg # Denah Vektor Estetik Lantai 2 (Sesuai Blueprint)
│       ├── gedung-kearsipan-lantai-1.svg    # Denah Arsitektur Lt 1 Kearsipan
│       ├── gedung-kearsipan-lantai-2.svg    # Denah Arsitektur Lt 2 Kearsipan
│       ├── ruang-pa-pano.jpg        # Citra Panorama Ruang PA
│       ├── ruang-babad-pano.jpg     # Citra Panorama Ruang Babad (Rak 03)
│       ├── ruang-restorasi-pano.jpg # Citra Panorama Ruang Restorasi Arsip
│       └── depo-arsip-pano.jpg      # Citra Panorama Depo Roll O Pack
└── README.md                   # Dokumentasi instalasi dan panduan pengoperasian
```
