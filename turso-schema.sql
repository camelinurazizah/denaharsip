-- ====================================================================
-- SKRIP DATABASE TURSO (libSQL / SQLite)
-- SISTEM INFORMASI DENAH INTERAKTIF DAN TUR PANORAMA FASILITAS
-- DINAS KEARSIPAN DAN PERPUSTAKAAN KABUPATEN CIREBON
-- Data diekspor langsung dari Supabase Cloud PostgreSQL
-- ====================================================================

PRAGMA foreign_keys = ON;

-- 1. PEMBUATAN TABEL RELASIONAL (SQLite / Turso)
DROP TABLE IF EXISTS admin_users;
DROP TABLE IF EXISTS rack_books;
DROP TABLE IF EXISTS racks;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS floors;

-- Master Akun Petugas & Admin Dinas (Autentikasi Aplikasi)
CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nama_petugas TEXT NOT NULL,
    role TEXT DEFAULT 'Admin',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Master Gedung & Denah Lantai
CREATE TABLE floors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    building TEXT NOT NULL,
    name TEXT NOT NULL,
    floor_number INTEGER NOT NULL,
    map_image_url TEXT NOT NULL,
    blueprint_image_url TEXT,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Data Ruangan, Patokan Lokasi, dan Panorama
CREATE TABLE rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    nearby_notes TEXT NOT NULL,
    services_info TEXT,
    room_photo_url TEXT,
    panorama_image_url TEXT NOT NULL,
    map_x REAL NOT NULL,
    map_y REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Data Titik Fasilitas & Rak Buku / Depo Arsip (Hotspot 360 & Peta 2D)
CREATE TABLE racks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category_code TEXT,
    location_notes TEXT,
    rack_photo_url TEXT,
    pitch REAL NOT NULL,
    yaw REAL NOT NULL,
    map_x REAL,
    map_y REAL,
    search_tags TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Dokumentasi Katalog Boks / Surat Arsip di Dalam Rak
CREATE TABLE rack_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rack_id INTEGER NOT NULL REFERENCES racks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    author TEXT,
    publish_year TEXT,
    copies INTEGER DEFAULT 1 NOT NULL,
    status TEXT DEFAULT 'Arsip Terbuka' NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indeks Performa Relasi
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_racks_room ON racks(room_id);
CREATE INDEX IF NOT EXISTS idx_rack_books_rack ON rack_books(rack_id);

-- ====================================================================
-- 2. INSERT DATA LENGKAP DARI SUPABASE DATABASE
-- ====================================================================

-- 2.0 Data Akun Petugas Dinas (Admin Users)
INSERT INTO admin_users (email, password, nama_petugas, role) VALUES
('admin@disarpus.cirebonkab.go.id', 'admin123', 'Camelia Nur Azizah', 'Admin');

-- 2.1 Data Lantai (Floors)
INSERT INTO floors (id, building, name, floor_number, map_image_url, blueprint_image_url, description, created_at) VALUES
(1, 'Kearsipan', 'Lantai 1 - Layanan & Tata Usaha Arsip', 1, 'assets/images/gedung-kearsipan-lantai-1.svg', 'assets/images/blueprint-arsip-lt1.jpg', 'Zonasi layanan konsultasi kearsipan, peminjaman arsip, penerimaan surat & tamu, serta ruang pengolahan, pemberkasan & alih media arsip.', '2026-11-12T09:36:52.434407+00:00'),
(2, 'Kearsipan', 'Lantai 2 - Depo & Restorasi Arsip', 2, 'assets/images/gedung-kearsipan-lantai-2.svg', 'assets/images/blueprint-arsip-lt2.jpg', 'Zonasi Depo Arsip Dinamis & Statis (lemari Roll O''Pack & rak besi suhu terkontrol) serta Ruang Restorasi & Preservasi Arsip kertas kuno.', '2026-11-12T09:36:52.434407+00:00');

-- 2.2 Data Ruangan (Rooms - Total 24 Ruangan)
INSERT INTO rooms (id, floor_id, name, nearby_notes, services_info, room_photo_url, panorama_image_url, map_x, map_y, created_at) VALUES
(5, 1, 'Resepsionis', 'Tepat di depan pintu masuk kantor dinas Kearsipan', '- Menyambut dan Mengarahkan Tamu
- Mengelola Komunikasi Telepon
- Pengelola Administrasi dan Persuratan
- Penjaga Keamanan dan Kontrol Akses
- Mendukung Koordinasi dan Penjadwalan
- Membangun Citra Perusahaan', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794487534623_totvph.jpg', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/panoramas/1794487655366_kr763l.jpg', 48.2, 62.6, '2026-11-12T12:47:58.153594+00:00'),
(6, 1, 'Ruang Pamer', 'Dari Pintu masuk kantor dinas arsip belok ke kiri', 'ruang display/galeri:
- Sarana Penyebarluasan Informasi dan Edukasi
- Media Pemanfaatan Memori Kolektif Daerah
- Sarana Apresiasi dan Rekreasi Publik
- Mendukung Budaya Literasi', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794489252100_h63oto.jpg', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/panoramas/1794489280866_dsk98j.jpg', 41.8, 73.6, '2026-11-12T13:15:03.457395+00:00'),
(7, 1, 'Ruang Tunggu Tamu', 'Dari pintu masuk kantor dinas kearsipan  belok ke arah kanan', '- Menjaga ketertiban alur keluar-masuk tamu serta menciptakan kesan pertama yang profesional dan ramah dari instansi pemerintah.
- Tempat transit sementara bagi tamu yang memiliki janji temu dengan pejabat atau pegawai dinas.
-  Sebagai pusat interaksi literasi tempat masyarakat membaca, mencari referensi, dan memanfaatkan koleksi bahan pustaka secara langsung di lokasi.', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794489757387_a299qc.jpg', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/panoramas/1794489674686_nwtod5.jpg', 56, 74.1, '2026-11-12T13:23:04.423665+00:00'),
(8, 1, 'WC', 'Dari resepsionis  belok ke arah kanan sedikit tepat di bawah tangga', 'Kamar Mandi Umum', 'assets/images/ruang-pa-front.jpg', 'assets/images/ruang-pa-pano.jpg', 66, 67.2, '2026-11-12T18:08:40.312917+00:00'),
(10, 1, 'Ruang Depo C', 'Dari area lobi resepsionis lurus ke belakang sampai menemukan  pintu, setelah itu belok ke arah kanan', 'Ruang penyimpanan arsip statis seperti SKPD yang sudah dibubarkan/diganti nama, dan pemekaran daerah kecamatan,desa atau kelurahan', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794508225811_g2ics0.jpg', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/panoramas/1794508234087_jxsoub.jpg', 80.4, 51.2, '2026-11-12T18:31:01.859396+00:00'),
(11, 1, 'Ruang Pelayanan', 'Dari area pintu masuk  kantor dinas arsip maju terus sampai melewati resepsionis dan  menemukan pintu , kemudian belok ke arah kiri ruangan pertama', 'Ruang Pelayanan izin Pengguna arsip yang bersifat tertutup', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794529255499_hrrdrk.jpg', 'assets/images/ruang-pa-pano.jpg', 47.9, 54.5, '2026-11-13T00:21:54.955557+00:00'),
(12, 1, 'Ruang P2A', 'Dari area pintu masuk  kantor dinas arsip maju terus melewati resepsionis dan  menemukan pintu , kemudian belok ke arah kiri ruangan paling pojok/terakhir', '- perumusan bahan perencanaan pada bidang perlindungan, penyelamatan, autentikasi dan perizinan pengguna arsip.
- perumusan kebijakan teknis di bidang perlindungan, penyelamatan, autentikasi dan perizinan penggunaan arsip.
- pemusnahan arsip di lingkungan pemerintah daerah yang memiliki  retensi di bawah 10 (sepuluh) tahun.
- perlindungan dan penyelamatan arsip akibat bencana yang berskala kabupaten.
- penyelamatan arsip perangkat daerah kabupaten yang digabung dan / atau dibubarkan, dan pemekaran daerah kecamaan dan desa / kelurahan.
- pencarian arsip statis kabupaten yang dinyatakan hilang.
- Pelayanan izin penggunaan arsip yang besifat tertutup di kabupaten', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794529440504_8sufo2.jpg', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/panoramas/1794529450611_pc8s5s.jpg', 29.6, 54.5, '2026-11-13T00:24:27.152508+00:00'),
(13, 1, 'Ruang Record Center', 'Dari area pintu masuk  kantor dinas arsip maju terus sampai melewati resepsionis dan  menemukan pintu , kemudian belok ke arah kiri ruangan Kedua (tengah)', 'Tempat Penyimpanan arsip in aktif yang di bawah 10 tahun', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794529677095_bqx39z.jpg', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/panoramas/1794529743774_1t6fbl.jpg', 42.5, 55.8, '2026-11-13T00:29:13.588363+00:00'),
(14, 1, 'Mushola', 'Dari Pintu yang ada di belakang Resepsionis lurus mewati tangga belakang sampai ketemu ruang Depo B belok ke arah kanan', 'Tempat Beribadah', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794545618901_th271a.jpg', 'assets/images/ruang-pa-pano.jpg', 82.8, 25.5, '2026-11-13T04:54:59.306904+00:00'),
(15, 1, 'Ruang Depo D', 'Dari Pintu yang ada di belakang resepsionis lurus saja ruangan nya tepat di sebelah Ruang Depo B', 'Penyimpanan arsip sertifikat tanah, dan BPKB kendaraan dinas plat merah', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794546157581_5wz3sl.jpg', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/panoramas/1794813269691_2gsvsb.jpg', 74.5, 25.2, '2026-11-13T05:03:19.674993+00:00'),
(16, 1, 'Ruang Arsip Depo B', 'Dari Pintu yang ada di belakang resepsionis lurus sampai melewati tangga', 'Penyimpanan arsip IMB (izin mendirikan bangunan) dari nilai perseorangan sampai dengan perusahaan dari tahun 2010 kebawah', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794546981417_dbuocp.jpg', 'assets/images/ruang-pa-pano.jpg', 65.7, 23.9, '2026-11-13T05:16:36.745935+00:00'),
(17, 1, 'Dapur', 'Dari pintu belakang yang ada di resepsionis lurus sampai melewati tangga kemudian belok ke kiri', 'Tempat Memasak Pegawai kantor dinas kearsipan dan perpustakaan', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794547594976_4zfrhr.jpg', 'assets/images/ruang-pa-pano.jpg', 35.5, 22.6, '2026-11-13T05:26:46.891697+00:00'),
(18, 1, 'Kamar Mandi', 'Dari  pintu belakang yang ada di resepsionis belok ke arah kiri,  letaknya ada pada pinggir dapur dan depan ruang P2A', 'Sarana Kebersihan Diri', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794547894506_m99xsn.jpg', 'assets/images/ruang-pa-pano.jpg', 28.6, 24.2, '2026-11-13T05:31:48.040952+00:00'),
(19, 1, 'Gudang', 'Dari pintu belakang resepsionis belok kiri letak gudang tapt di depan ruang P2A dan juga WC', 'tempat penyimpanan barang operasional logistik serta manajemen rantai pasokan', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794564152442_rufyj3.jpg', 'assets/images/ruang-pa-pano.jpg', 16.9, 22.6, '2026-11-13T10:11:32.777973+00:00'),
(20, 2, 'Ruang Sekretariat', 'Dari  pintu atas lantai 2 belok ke arah kanan', '- koordinasi kegiatan
- koordinasi dan penyusunan rencana program dan
anggaran;
-  pengumpulan dan data serta
pemantauan, evaluasi, dan pelaporan;
-  pembinaan dan pemberian dukungan administrasi
yang meliputi ketatausahaan, kepegawaian,
keuangan, kerumahtanggaan, kerja sama, hukum,
organisasi, hubungan masyarakat, serta kearsipan
dan dokumentasi;
- penyelenggaraan pengelolaan barang milik negara
dan pengadaan barang/ jasa; dan', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794567407382_6qsgww.jpg', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/panoramas/1794567416546_09v40l.jpg', 73.6, 79.2, '2026-11-13T10:57:24.177168+00:00'),
(21, 2, 'Ruang PA', 'Dari tangga dalam  lurus sedikit tepat di depan tangga dalam ruangan', '- perumusan bahan perencanaan pada Bidang
Pengelolaan Arsip
- pembinaan dan pengendalian penyelenggaraan
kegiatan pengelolaan arsip dinamis
- Pembinaan dan pengendalian  penyelenggaraan kegiatan mengelolaan  arsip statis
- pelayanan informasi publik di daerah bidang pengelolaan arsip
-  pengolahan data analisis bidang arsip
- pengevaluasian dan pelaporan pelaksanaan kegiatan Bidang Pengelolaan Arsip', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794583757171_pn3usc.jpg', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/panoramas/1794583765271_wf77nc.jpg', 36.9, 81.5, '2026-11-13T11:09:28.29224+00:00'),
(22, 2, 'WC', 'Dari Pintu  lantai 2 belok ke arah kanan lurus terus sampai mentok tepat dekat ruang sekretariat', 'Kamar mandi Umum (Pegawai)', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794568540167_ns37xb.jpg', 'assets/images/ruang-pa-pano.jpg', 82.3, 68.8, '2026-11-13T11:30:19.14175+00:00'),
(23, 2, 'Ruang Aula', 'Dari area pintu lantai 2 di atas  belok ke arah kiri lurus ruangan ke 3 dari sebelah kiri paling pojok', 'Ruang Rapat Eksternal', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794570529162_muggtw.jpg', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/panoramas/1794575822833_8f7wzf.jpg', 19.6, 80.2, '2026-11-13T12:10:24.12222+00:00'),
(24, 2, 'Ruang Kerja Sekretaris Dinas', 'Dari pintu lntai 2 belok ke kiri ruangan nya sebelah ruang PA', 'menyelenggarakan pelaksanaan tugas,
pembinaan, dan pemberian dukungan administrasi
kepada seluruh unit organisasi.', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794582452623_aklopf.jpg', 'assets/images/ruang-pa-pano.jpg', 28.1, 78.6, '2026-11-13T15:07:57.433803+00:00'),
(25, 2, 'Ruang Rapat Internal Dinas', 'Dari ujung Tangga lantai 2 belok ke arah kiri ,terletak dekat ruang PA dan RUang Server', 'Ruang Khusus Rapat Atasan  atau Pimpinan Dengan Bawahan', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794582860301_vy7irf.jpg', 'assets/images/ruang-pa-pano.jpg', 49.9, 91, '2026-11-13T15:14:42.562631+00:00'),
(26, 2, 'Ruang Kerja Kepala Dinas', 'Dari arah tangga belok ke kiri, titik ruangan nya terletak pada dalam ruangan  rapat internal.', 'membantu Bupati
dalam melaksanakan urusan pemerintahan bidang kearsipan dan bidang yang menjadi
kewenangan Daerah dan tugas pembantuan yang
diberikan kepada Daerah.', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794583067398_46pqrz.jpg', 'assets/images/ruang-pa-pano.jpg', 43.3, 92.7, '2026-11-13T15:20:30.29618+00:00'),
(27, 2, 'Ruang Server', 'Dari  Tangga atas lantai 2 tepat di samping tangga letak ruangan nya', 'menempatkan, mengelola, dan mengamankan infrastruktur teknologi informasi (TI)', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794583702558_orz920.jpg', 'assets/images/ruang-pa-pano.jpg', 57.7, 85.8, '2026-11-13T15:28:46.217235+00:00'),
(28, 2, 'Ruang Arsip Depo A', 'Dari pintu dalam Lantai 2 lurus sampai melewati tangga luar', 'Arsip  in aktif dengan referensi diatas 10 tahun (arsip dinasmis)', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794584053329_yhmst4.jpg', 'assets/images/ruang-pa-pano.jpg', 45.7, 34.1, '2026-11-13T15:35:12.223746+00:00'),
(29, 2, 'WC', 'Dari pintu dalam lantai 2 lurus sedikit kemudian belok ke kiri , wc ny terletak di sebelah ruangan aula', 'Kamar Mandi Umum', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794584244896_5dep4n.jpg', 'assets/images/ruang-pa-pano.jpg', 12.7, 69.7, '2026-11-13T15:37:37.022428+00:00');

-- 2.3 Data Titik Hotspot & Rak Arsip (Racks - Total 3 Titik)
INSERT INTO racks (id, room_id, title, category_code, location_notes, rack_photo_url, pitch, yaw, map_x, map_y, search_tags, created_at) VALUES
(6, 15, 'Roll Opack 01 - Arsip BPKB Plat Merah Se-Kabupaten Cirebon', 'roll-opack 1 &2', 'Dari Pintu Masuk Ruang Depo D, belok ke arah kiri paling pojok letak roll opack arsip nya paling pojok yang pertama', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794813607494_kmnbfh.jpg', 11.28, -99.69, NULL, NULL, 'BPKB', '2026-11-16T07:22:20.298505+00:00'),
(7, 15, 'Roll opack 02 - Sertifikat Antar Desa Se-Kabupaten Cirebon', 'Roll Opack 2&3', 'Dari Pintu Masuk Ruang Depo D, belok ke arah kiri paling pojok letak roll opack arsip nya berasa paling pojok yang kedua dari roll opack', 'assets/images/depo-arsip-front.jpg', 4.38, -93.49, NULL, NULL, 'Sertifikat antar desa', '2026-11-16T07:42:55.763625+00:00'),
(8, 15, 'Roll Opack 03 - Arsip Peraturan - Peraturan Bupati', 'roll opack 3&4', 'Dari Pintu Masuk Ruang Depo D, belok ke arah kiri paling pojok letak roll opack arsip nya paling pojok yang  ke tiga', 'https://gydqaikvdftwemsnkdrv.supabase.co/storage/v1/object/public/details/1794815321798_4r3k7c.jpg', -4.52, -85.33, NULL, NULL, 'Peraturan bupati', '2026-11-16T07:52:10.320472+00:00');

-- 2.4 Data Inventaris Boks & Surat Arsip (Rack Books - Total 6 Boks)
INSERT INTO rack_books (id, rack_id, title, author, publish_year, copies, status) VALUES
(1, 6, 'Boks BPKB-01: Arsip BPKB Plat Merah Kecamatan', 'Bagian Aset & Perlengkapan Daerah', '2015 - 2020', 4, 'Arsip Terbuka'),
(2, 6, 'Boks BPKB-02: BPKB Kendaraan Operasional Dinas', 'Setda & Dinas Teknis Kab. Cirebon', '2010 - 2022', 6, 'Akses Terbatas'),
(3, 7, 'Boks SD-01: Dokumen Sertifikat Antar Desa Wilayah Timur', 'Dinas Pemberdayaan Masyarakat & Desa', '2005 - 2018', 3, 'Arsip Terbuka'),
(4, 7, 'Boks SD-02: Sertifikat Aset Tanah Kas Desa', 'DPMD & Badan Keuangan Aset Daerah', '2012 - 2021', 5, 'Akses Terbatas'),
(5, 8, 'Boks PB-01: Peraturan Bupati Cirebon Bidang Tata Kelola', 'Bagian Hukum Setda Kab. Cirebon', '2018 - 2022', 4, 'Arsip Terbuka'),
(6, 8, 'Boks PB-02: Peraturan Bupati Cirebon Bidang Pengelolaan Arsip', 'Disarpus Kabupaten Cirebon', '2020 - 2024', 2, 'Arsip Terbuka');


