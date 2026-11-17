const fs = require('fs');
const path = require('path');

const dump = JSON.parse(fs.readFileSync(path.join(__dirname, 'supabase_dump.json'), 'utf8'));

function sqlVal(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  return "'" + String(val).replace(/'/g, "''") + "'";
}

// -------------------------------------------------------------
// 1. GENERATE turso-schema.sql (SQLite / libSQL / Turso)
// -------------------------------------------------------------
let tursoSql = `-- ====================================================================
-- SKRIP DATABASE TURSO (libSQL / SQLite)
-- SISTEM INFORMASI DENAH INTERAKTIF DAN TUR PANORAMA FASILITAS
-- DINAS KEARSIPAN DAN PERPUSTAKAAN KABUPATEN CIREBON
-- Data diekspor langsung dari Supabase Cloud PostgreSQL
-- ====================================================================

PRAGMA foreign_keys = ON;

-- 1. PEMBUATAN TABEL RELASIONAL (SQLite / Turso)
DROP TABLE IF EXISTS rack_books;
DROP TABLE IF EXISTS racks;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS floors;

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

-- 2.1 Data Lantai (Floors)
INSERT INTO floors (id, building, name, floor_number, map_image_url, blueprint_image_url, description, created_at) VALUES
`;

tursoSql += dump.floors.map(f => 
  `(${f.id}, ${sqlVal(f.building)}, ${sqlVal(f.name)}, ${f.floor_number}, ${sqlVal(f.map_image_url)}, ${sqlVal(f.blueprint_image_url)}, ${sqlVal(f.description)}, ${sqlVal(f.created_at)})`
).join(',\n') + ';\n\n';

tursoSql += `-- 2.2 Data Ruangan (Rooms - Total ${dump.rooms.length} Ruangan)\n`;
tursoSql += `INSERT INTO rooms (id, floor_id, name, nearby_notes, services_info, room_photo_url, panorama_image_url, map_x, map_y, created_at) VALUES\n`;
tursoSql += dump.rooms.map(r => 
  `(${r.id}, ${r.floor_id}, ${sqlVal(r.name)}, ${sqlVal(r.nearby_notes)}, ${sqlVal(r.services_info)}, ${sqlVal(r.room_photo_url)}, ${sqlVal(r.panorama_image_url)}, ${r.map_x}, ${r.map_y}, ${sqlVal(r.created_at)})`
).join(',\n') + ';\n\n';

if (dump.racks && dump.racks.length > 0) {
  tursoSql += `-- 2.3 Data Titik Hotspot & Rak Arsip (Racks - Total ${dump.racks.length} Titik)\n`;
  tursoSql += `INSERT INTO racks (id, room_id, title, category_code, location_notes, rack_photo_url, pitch, yaw, map_x, map_y, search_tags, created_at) VALUES\n`;
  tursoSql += dump.racks.map(rk => 
    `(${rk.id}, ${rk.room_id}, ${sqlVal(rk.title)}, ${sqlVal(rk.category_code)}, ${sqlVal(rk.location_notes)}, ${sqlVal(rk.rack_photo_url)}, ${rk.pitch}, ${rk.yaw}, ${sqlVal(rk.map_x)}, ${sqlVal(rk.map_y)}, ${sqlVal(rk.search_tags)}, ${sqlVal(rk.created_at)})`
  ).join(',\n') + ';\n\n';
}

if (dump.rack_books && dump.rack_books.length > 0) {
  tursoSql += `-- 2.4 Data Boks / Buku Arsip (Rack Books)\n`;
  tursoSql += `INSERT INTO rack_books (id, rack_id, title, author, publish_year, copies, status, created_at) VALUES\n`;
  tursoSql += dump.rack_books.map(b => 
    `(${b.id}, ${b.rack_id}, ${sqlVal(b.title)}, ${sqlVal(b.author)}, ${sqlVal(b.publish_year)}, ${b.copies}, ${sqlVal(b.status)}, ${sqlVal(b.created_at)})`
  ).join(',\n') + ';\n\n';
}

fs.writeFileSync(path.join(__dirname, 'turso-schema.sql'), tursoSql, 'utf8');
console.log('✅ Berhasil membuat turso-schema.sql');


// -------------------------------------------------------------
// 2. GENERATE supabase-schema.sql (PostgreSQL Supabase)
// -------------------------------------------------------------
let supaSql = `-- ====================================================================
-- SKRIP SQL DDL, ROW LEVEL SECURITY (RLS), DAN DATA SUPABASE
-- SISTEM INFORMASI DENAH INTERAKTIF DAN TUR PANORAMA FASILITAS
-- DINAS KEARSIPAN DAN PERPUSTAKAAN KABUPATEN CIREBON
-- Data disinkronkan langsung dari Supabase Cloud PostgreSQL
-- ====================================================================

-- 1. PEMBUATAN EMPAT TABEL UTAMA RELASIONAL (3NF)
DROP TABLE IF EXISTS rack_books CASCADE;
DROP TABLE IF EXISTS racks CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS floors CASCADE;

-- Master Gedung & Denah Lantai
CREATE TABLE floors (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    building VARCHAR(50) NOT NULL, -- 'Perpustakaan' atau 'Kearsipan'
    name VARCHAR(100) NOT NULL,
    floor_number INT NOT NULL,     -- 1 atau 2
    map_image_url TEXT NOT NULL,
    blueprint_image_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Ruangan, Patokan Lokasi, dan Panorama
CREATE TABLE rooms (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    floor_id BIGINT REFERENCES floors(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(150) NOT NULL,
    nearby_notes TEXT NOT NULL,
    services_info TEXT,
    room_photo_url TEXT,
    panorama_image_url TEXT NOT NULL,
    map_x DOUBLE PRECISION NOT NULL, -- Koordinat persentase X pada denah 2D (%)
    map_y DOUBLE PRECISION NOT NULL, -- Koordinat persentase Y pada denah 2D (%)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Titik Fasilitas & Rak Buku (Hotspot)
CREATE TABLE racks (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    room_id BIGINT REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(150) NOT NULL,
    category_code VARCHAR(50),
    location_notes TEXT,
    rack_photo_url TEXT,
    pitch DOUBLE PRECISION NOT NULL, -- Sudut vertikal pada panorama viewer (°)
    yaw DOUBLE PRECISION NOT NULL,   -- Sudut horizontal pada panorama viewer (°)
    map_x DOUBLE PRECISION,          -- Koordinat X pada denah 2D jika ingin pin spesifik
    map_y DOUBLE PRECISION,          -- Koordinat Y pada denah 2D jika ingin pin spesifik
    search_tags TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dokumentasi Katalog Buku / Arsip di Dalam Rak
CREATE TABLE rack_books (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    rack_id BIGINT REFERENCES racks(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(150),
    publish_year VARCHAR(20),
    copies INT DEFAULT 1 NOT NULL,
    status VARCHAR(50) DEFAULT 'Arsip Terbuka' NOT NULL, -- 'Arsip Terbuka', 'Akses Terbatas', atau 'Sedang Dipinjam'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 2. PENGATURAN ROW LEVEL SECURITY (RLS)
-- ====================================================================
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE racks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rack_books ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Baca Publik (SELECT) Tanpa Login
CREATE POLICY "Public Read Floors" ON floors FOR SELECT USING (true);
CREATE POLICY "Public Read Rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Public Read Racks" ON racks FOR SELECT USING (true);
CREATE POLICY "Public Read Rack Books" ON rack_books FOR SELECT USING (true);

-- Kebijakan Akses Kelola Penuh (INSERT, UPDATE, DELETE) Khusus Sesi Admin Dinas
CREATE POLICY "Admin All Floors" ON floors FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin All Rooms" ON rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin All Racks" ON racks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admin All Rack Books" ON rack_books FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ====================================================================
-- 3. DATA LENGKAP GEDUNG KEARSIPAN DISARPUS KABUPATEN CIREBON
-- ====================================================================

-- 3.1 Data Lantai (Gedung Kearsipan: Lantai 1 & Lantai 2)
INSERT INTO floors (id, building, name, floor_number, map_image_url, blueprint_image_url, description, created_at) VALUES
`;

supaSql += dump.floors.map(f => 
  `(${f.id}, ${sqlVal(f.building)}, ${sqlVal(f.name)}, ${f.floor_number}, ${sqlVal(f.map_image_url)}, ${sqlVal(f.blueprint_image_url)}, ${sqlVal(f.description)}, ${sqlVal(f.created_at)})`
).join(',\n') + ';\n\n';

supaSql += `-- 3.2 Data Ruangan Gedung Kearsipan (Total ${dump.rooms.length} Ruangan)\n`;
supaSql += `INSERT INTO rooms (id, floor_id, name, nearby_notes, services_info, room_photo_url, panorama_image_url, map_x, map_y, created_at) VALUES\n`;
supaSql += dump.rooms.map(r => 
  `(${r.id}, ${r.floor_id}, ${sqlVal(r.name)}, ${sqlVal(r.nearby_notes)}, ${sqlVal(r.services_info)}, ${sqlVal(r.room_photo_url)}, ${sqlVal(r.panorama_image_url)}, ${r.map_x}, ${r.map_y}, ${sqlVal(r.created_at)})`
).join(',\n') + ';\n\n';

if (dump.racks && dump.racks.length > 0) {
  supaSql += `-- 3.3 Data Lemari / Rak Depo Arsip (Hotspots - Total ${dump.racks.length} Titik)\n`;
  supaSql += `INSERT INTO racks (id, room_id, title, category_code, location_notes, rack_photo_url, pitch, yaw, map_x, map_y, search_tags, created_at) VALUES\n`;
  supaSql += dump.racks.map(rk => 
    `(${rk.id}, ${rk.room_id}, ${sqlVal(rk.title)}, ${sqlVal(rk.category_code)}, ${sqlVal(rk.location_notes)}, ${sqlVal(rk.rack_photo_url)}, ${rk.pitch}, ${rk.yaw}, ${sqlVal(rk.map_x)}, ${sqlVal(rk.map_y)}, ${sqlVal(rk.search_tags)}, ${sqlVal(rk.created_at)})`
  ).join(',\n') + ';\n\n';
}

if (dump.rack_books && dump.rack_books.length > 0) {
  supaSql += `-- 3.4 Data Boks / Buku Arsip (Rack Books)\n`;
  supaSql += `INSERT INTO rack_books (id, rack_id, title, author, publish_year, copies, status, created_at) VALUES\n`;
  supaSql += dump.rack_books.map(b => 
    `(${b.id}, ${b.rack_id}, ${sqlVal(b.title)}, ${sqlVal(b.author)}, ${sqlVal(b.publish_year)}, ${b.copies}, ${sqlVal(b.status)}, ${sqlVal(b.created_at)})`
  ).join(',\n') + ';\n\n';
}

supaSql += `-- Sinkronisasi sequence ID agar INSERT berikutnya dari Admin tidak bentrok
SELECT setval(pg_get_serial_sequence('floors', 'id'), COALESCE((SELECT MAX(id) FROM floors), 1));
SELECT setval(pg_get_serial_sequence('rooms', 'id'), COALESCE((SELECT MAX(id) FROM rooms), 1));
SELECT setval(pg_get_serial_sequence('racks', 'id'), COALESCE((SELECT MAX(id) FROM racks), 1));
SELECT setval(pg_get_serial_sequence('rack_books', 'id'), COALESCE((SELECT MAX(id) FROM rack_books), 1));
`;

fs.writeFileSync(path.join(__dirname, 'supabase-schema.sql'), supaSql, 'utf8');
console.log('✅ Berhasil memperbarui supabase-schema.sql');
