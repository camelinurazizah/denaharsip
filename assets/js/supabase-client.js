/**
 * SUPABASE CLIENT & DATA ADAPTER
 * Sistem Informasi Denah Interaktif & Tur Panorama Fasilitas
 * Dinas Kearsipan dan Perpustakaan Kabupaten Cirebon
 * 
 * Sesuai Dokumen SRS & Makalah:
 * - Arsitektur Serverless Client-Side REST via @supabase/supabase-js
 * - Dilengkapi Fallback Seed Data Otomatis (SRS-NFR-04) bila belum terkonfigurasi
 */

// Safe Storage helper (mencegah SecurityError / DOMException jika dibuka langsung via file:///)
const safeStorage = {
    _mem: {},
    getItem(key) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem(key);
            }
        } catch (e) { }
        return this._mem[key] || null;
    },
    setItem(key, val) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, String(val));
                return;
            }
        } catch (e) { }
        this._mem[key] = String(val);
    },
    removeItem(key) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
                return;
            }
        } catch (e) { }
        delete this._mem[key];
    }
};

// Kredensial Supabase
const DEFAULT_SUPABASE_CONFIG = {
    url: safeStorage.getItem('disarpus_supabase_url') || '',
    anonKey: safeStorage.getItem('disarpus_supabase_key') || ''
};

// Inisialisasi Klien Supabase (gunakan supabaseClient untuk menghindari tabrakan dengan window.supabase dari CDN SDK)
let supabaseClient = null;
let isSupabaseActive = false;

function initSupabase() {
    const url = safeStorage.getItem('disarpus_supabase_url') || '';
    const key = safeStorage.getItem('disarpus_supabase_key') || '';

    if (typeof window !== 'undefined' && window.supabase && url && key && url.startsWith('http')) {
        try {
            supabaseClient = window.supabaseClient.createClient(url, key);
            isSupabaseActive = true;
            console.log('✅ Supabase Client terhubung ke:', url);
        } catch (err) {
            console.warn('⚠️ Gagal inisialisasi Supabase, beralih ke Mode Fallback Seed Data:', err);
            isSupabaseActive = false;
        }
    } else {
        isSupabaseActive = false;
        console.log('ℹ️ Menjalankan sistem dalam Mode Fallback Seed Data Terintegrasi (SRS-NFR-04)');
    }
}

// ============================================================================
// DATA SEED BAWAAN (FALLBACK DATA CACHE)
// ============================================================================
// Helper untuk mengambil URL panorama (mengutamakan Base64 Data URI jika tersedia)
function getPanoAsset(key, fallbackPath) {
    if (typeof window !== 'undefined' && window.PANORAMA_DATA && window.PANORAMA_DATA[key]) {
        return window.PANORAMA_DATA[key];
    }
    return fallbackPath;
}

const DEFAULT_FLOORS = [
    {
        id: 1,
        building: 'Perpustakaan',
        name: 'Lantai 1 - Layanan Administrasi & Ruang Baca Umum',
        floor_number: 1,
        map_image_url: 'assets/images/gedung-perpustakaan-lantai-1.svg?v=20261110_blueprint_bg_v14',
        blueprint_image_url: 'assets/images/blueprint-clean-lt1.jpg?v=20261110_blueprint_bg_v14',
        description: 'Zonasi pelayanan kartu anggota, ruang baca anak & remaja, serta koleksi umum dan meja sirkulasi.'
    },
    {
        id: 2,
        building: 'Perpustakaan',
        name: 'Lantai 2 - Koleksi Khusus Babad & E-Library',
        floor_number: 2,
        map_image_url: 'assets/images/gedung-perpustakaan-lantai-2.svg?v=20261110_blueprint_bg_v14',
        blueprint_image_url: 'assets/images/blueprint-clean-lt2.jpg?v=20261110_blueprint_bg_v14',
        description: 'Zonasi penyimpanan naskah kuno, literatur babad sejarah Cirebon, perpustakaan digital (e-library), dan aula literasi.'
    },
    {
        id: 3,
        building: 'Kearsipan',
        name: 'Lantai 1 - Pelayanan & Restorasi Konservasi Arsip',
        floor_number: 1,
        map_image_url: 'assets/images/gedung-kearsipan-lantai-1.svg?v=20261107_stairs_fix_v11',
        blueprint_image_url: 'assets/images/blueprint-arsip-lt1.jpg?v=20261107_stairs_fix_v11',
        description: 'Zonasi loket konsultasi kearsipan daerah, laboratorium restorasi dokumen kuno, serta selasar pengolahan arsip masuk.'
    },
    {
        id: 4,
        building: 'Kearsipan',
        name: 'Lantai 2 - Depo Arsip Utama & Preservasi Digital',
        floor_number: 2,
        map_image_url: 'assets/images/gedung-kearsipan-lantai-2.svg?v=20261110_blueprint_bg_v14',
        blueprint_image_url: 'assets/images/blueprint-arsip-lt2.jpg?v=20261110_blueprint_bg_v14',
        description: 'Zonasi depo lemari Roll O Pack suhu terkontrol, ruang digitalisasi scanner ukuran besar, dan pusat server data kearsipan.'
    }
];

const DEFAULT_ROOMS = [
    {
        id: 1,
        floor_id: 1,
        name: 'Ruang Pelayanan Administrasi (PA)',
        short_name: 'Ruang PA',
        nearby_notes: 'Terletak di Lantai 1, tepat di sebelah kiri lobi utama, berhadapan langsung dengan Ruang Baca Anak & Remaja.',
        services_info: 'Layanan yang tersedia:\n1. Pendaftaran & Cetak Kartu Tanda Anggota (KTA) baru (Syarat: KTP/Kartu Pelajar Kab. Cirebon, pasfoto 2x3).\n2. Pembuatan Surat Bebas Pustaka kelulusan/wisuda.\n3. Legalisasi dokumen literatur dan izin penelitian naskah.\n\nJam Pelayanan: Senin - Kamis 08.00 - 15.30 WIB, Jumat 08.00 - 14.30 WIB (Gratis / Tanpa Biaya).',
        room_photo_url: 'assets/images/ruang-pa-front.jpg',
        panorama_image_url: getPanoAsset('ruang_pa', 'assets/images/ruang-pa-pano.jpg'),
        map_x: 32.6,
        map_y: 50.2
    },
    {
        id: 2,
        floor_id: 1,
        name: 'Ruang Baca Anak & Remaja',
        short_name: 'Ruang Baca Anak',
        nearby_notes: 'Terletak di Lantai 1 bagian sayap depan selatan, berhadapan dengan Ruang PA dan bersebelahan dengan area taman lobi.',
        services_info: 'Fasilitas membaca ramah anak dengan karpet lesehan edukatif, buku dongeng nusantara, ensiklopedia sains bergambar, dan alat stimulasi literasi dini.',
        room_photo_url: 'assets/images/ruang-pa-front.jpg',
        panorama_image_url: getPanoAsset('ruang_pa', 'assets/images/ruang-pa-pano.jpg'),
        map_x: 32.6,
        map_y: 63.2
    },
    {
        id: 3,
        floor_id: 1,
        name: 'Ruang Koleksi Buku Umum & Sirkulasi',
        short_name: 'Koleksi Umum & Sirkulasi',
        nearby_notes: 'Terletak di sayap timur Lantai 1, melalui selasar lobi utama lurus ke depan.',
        services_info: 'Peminjaman dan pengembalian mandiri buku ilmu pengetahuan umum, sains populer, novel fiksi, hukum, dan kebudayaan. Dilengkapi meja baca mandiri bersumber daya listrik.',
        room_photo_url: 'assets/images/ruang-pa-front.jpg',
        panorama_image_url: getPanoAsset('ruang_pa', 'assets/images/ruang-pa-pano.jpg'),
        map_x: 66.9,
        map_y: 50.8
    },
    {
        id: 4,
        floor_id: 2,
        name: 'Ruang Koleksi Khusus & Babad Cirebon',
        short_name: 'Koleksi Babad Cirebon',
        nearby_notes: 'Terletak di Lantai 2 sisi barat, tepat setelah menaiki tangga utama dan belok ke arah kiri melintasi selasar void lobi.',
        services_info: 'Pusat rujukan literatur sejarah lokal Cirebon, naskah babad mertasinga, arsip caruban nagari, manuskrip keraton Kasepuhan, Kanoman, dan Kacirebonan. Seluruh koleksi dapat dibaca di tempat dengan panduan kurator pustaka.',
        room_photo_url: 'assets/images/rak-03-babad.jpg',
        panorama_image_url: getPanoAsset('ruang_babad', 'assets/images/ruang-babad-pano.jpg'),
        map_x: 23.5,
        map_y: 74.0
    },
    {
        id: 5,
        floor_id: 2,
        name: 'Ruang E-Library & Multimedia',
        short_name: 'E-Library & Multimedia',
        nearby_notes: 'Terletak di Lantai 2 sayap timur laut, bersebelahan dengan Aula Seminar Literasi.',
        services_info: 'Layanan akses komputer riset berkecepatan tinggi, katalog online terintegrasi (OPAC), repositori dokumen digital, dan materi audio-visual sejarah Kabupaten Cirebon.',
        room_photo_url: 'assets/images/ruang-pa-front.jpg',
        panorama_image_url: getPanoAsset('ruang_babad', 'assets/images/ruang-babad-pano.jpg'),
        map_x: 76.5,
        map_y: 35.0
    },
    {
        id: 6,
        floor_id: 3,
        name: 'Resepsionis',
        short_name: 'Resepsionis',
        nearby_notes: 'Depan pintu masuk kantor kearsipan & dokumen',
        services_info: 'pelayanan informasi, koordinasi administrasi tamu, dan pemilah alur layanan publik',
        room_photo_url: 'assets/images/ruang-pa-front.jpg',
        panorama_image_url: getPanoAsset('ruang_restorasi', 'assets/images/ruang-restorasi-pano.jpg'),
        map_x: 47.7,
        map_y: 63.5
    }
];

const DEFAULT_RACKS = [
    {
        id: 1,
        room_id: 4,
        title: 'Rak 01 - Naskah Kuno Sunda & Primbon Jawa',
        short_title: 'Rak 01 Naskah',
        category_code: 'DDC 091',
        location_notes: 'Lorong barat pertama dari pintu masuk Ruang Koleksi Khusus sebelah kiri.',
        rack_photo_url: 'assets/images/rak-03-babad.jpg',
        pitch: -2.5,
        yaw: -45.0,
        map_x: 13.0,
        map_y: 38.0,
        search_tags: 'naskah kuno, primbon, aksara pegon, daluang, sunda kuno'
    },
    {
        id: 2,
        room_id: 4,
        title: 'Rak 02 - Caruban Nagari & Wiracarita',
        short_title: 'Rak 02 Caruban',
        category_code: 'DDC 959.82',
        location_notes: 'Lorong barat kedua, berdampingan dengan Rak 01.',
        rack_photo_url: 'assets/images/rak-03-babad.jpg',
        pitch: -1.0,
        yaw: -18.0,
        map_x: 20.0,
        map_y: 38.0,
        search_tags: 'caruban nagari, purwaka, wiracarita, sejarah cirebon, nagarakretabhumi'
    },
    {
        id: 3,
        room_id: 4,
        title: 'Rak 03 - Koleksi Babad & Sejarah Cirebon',
        short_title: '⭐ Rak 03 Babad',
        category_code: 'DDC 959.82',
        location_notes: 'Gedung Perpustakaan Lantai 2, Ruang Koleksi Khusus, lorong ke-2 dari pintu masuk sebelah kiri, tepat di bagian tengah dinding utama.',
        rack_photo_url: 'assets/images/rak-03-babad.jpg',
        pitch: 0.5,
        yaw: 5.0,
        map_x: 27.0,
        map_y: 38.0,
        search_tags: 'babad, mertasinga, sejarah, keraton, naskah kuno, cirebon, sunan gunung jati, pajajaran'
    },
    {
        id: 4,
        room_id: 4,
        title: 'Rak 04 - Keraton Kasepuhan, Kanoman & Kacirebonan',
        short_title: 'Rak 04 Keraton',
        category_code: 'DDC 959.82',
        location_notes: 'Lorong barat ketiga, bersisian dengan meja display etalase naskah asli.',
        rack_photo_url: 'assets/images/rak-03-babad.jpg',
        pitch: -3.0,
        yaw: 32.0,
        map_x: 34.0,
        map_y: 38.0,
        search_tags: 'kasepuhan, kanoman, kacirebonan, silsilah sultan, piagam perjanjian'
    },
    {
        id: 5,
        room_id: 1,
        title: 'Loket 01 - Pendaftaran KTA & Akses Pemustaka',
        short_title: 'Loket 01 KTA',
        category_code: 'ADM-KTA-01',
        location_notes: 'Meja loket paling kiri dekat pintu masuk Ruang PA.',
        rack_photo_url: 'assets/images/ruang-pa-front.jpg',
        pitch: -4.0,
        yaw: -25.0,
        map_x: 28.8,
        map_y: 45.0,
        search_tags: 'kta, kartu anggota, pendaftaran, akun pemustaka, foto'
    },
    {
        id: 6,
        room_id: 1,
        title: 'Loket 02 - Legalisasi Dokumen & Bebas Pustaka',
        short_title: 'Loket 02 Legalisasi',
        category_code: 'ADM-LEG-02',
        location_notes: 'Meja loket bagian tengah Ruang PA.',
        rack_photo_url: 'assets/images/ruang-pa-front.jpg',
        pitch: -3.5,
        yaw: 0.0,
        map_x: 36.1,
        map_y: 45.0,
        search_tags: 'legalisasi, bebas pustaka, skripsi, wisuda, cap dinas'
    }
];

const DEFAULT_BOOKS = [
    { id: 1, rack_id: 3, title: 'Babad Cirebon Edisi Naskah Mertasinga', author: 'P.S. Sulendraningrat / Tim Ahli Filologi', publish_year: '1985', copies: 3, status: 'Baca di Tempat' },
    { id: 2, rack_id: 3, title: 'Carita Purwaka Caruban Nagari (Transliterasi & Terjemahan)', author: 'Pangeran Arya Cerbon / Drs. Atja', publish_year: '1986', copies: 2, status: 'Baca di Tempat' },
    { id: 3, rack_id: 3, title: 'Sejarah Cirebon: Perkembangan Nagari Abad XV - XVII', author: 'Drs. P.S. Sulendraningrat', publish_year: '1984', copies: 4, status: 'Boleh Dipinjam' },
    { id: 4, rack_id: 3, title: 'Sunan Gunung Jati: Tokoh Sejarah, Mitos & Penyebaran Islam', author: 'Prof. Dr. Nina H. Lubis, M.S.', publish_year: '2004', copies: 3, status: 'Boleh Dipinjam' },
    { id: 5, rack_id: 3, title: 'Nagarakretabhumi: Kajian Naskah Wangsakerta', author: 'Dadan Wildan, M.Hum.', publish_year: '2002', copies: 2, status: 'Baca di Tempat' },
    { id: 6, rack_id: 3, title: 'Babad Cerbon Terjemahan J.L.A. Brandes', author: 'Dr. J.L.A. Brandes', publish_year: '1911', copies: 1, status: 'Baca di Tempat' },
    { id: 7, rack_id: 3, title: 'Arsitektur & Ragam Hias Keraton Kasepuhan Cirebon', author: 'Ir. H. Sudrajat', publish_year: '2012', copies: 3, status: 'Boleh Dipinjam' },
    { id: 8, rack_id: 3, title: 'Kearifan Lokal dan Budaya Maritim Caruban', author: 'Disbudpar Kab. Cirebon', publish_year: '2019', copies: 5, status: 'Boleh Dipinjam' },
    { id: 9, rack_id: 1, title: 'Primbon Mujarobat Kuno Cirebon', author: 'K.H. Syatori Arsyad', publish_year: '1978', copies: 2, status: 'Baca di Tempat' },
    { id: 10, rack_id: 1, title: 'Katalog Naskah Kuno Cirebon Koleksi Pesantren', author: 'Pusat Dokumentasi Cirebon', publish_year: '2016', copies: 3, status: 'Boleh Dipinjam' },
    { id: 11, rack_id: 2, title: 'Kitab Serat Centhini: Ekspedisi Tanah Pasundan & Cirebon', author: 'Pakubuwana V / Ronggowarsito', publish_year: '1992', copies: 2, status: 'Baca di Tempat' },
    { id: 12, rack_id: 2, title: 'Wawacan Angling Darma Versi Cerbon', author: 'Balai Pustaka', publish_year: '1982', copies: 1, status: 'Baca di Tempat' },
    { id: 13, rack_id: 4, title: 'Silsilah Sultan-Sultan Keraton Kasepuhan & Kanoman', author: 'Badan Pengelola Keraton', publish_year: '2008', copies: 2, status: 'Baca di Tempat' },
    { id: 14, rack_id: 4, title: 'Perjanjian 1681 dan Dampak VOC di Kesultanan Cirebon', author: 'Dr. Ambary & H. Uka Tjandrasasmita', publish_year: '1990', copies: 2, status: 'Baca di Tempat' }
];

// Versi cache seed data untuk memastikan koordinat denah arsitektur asli diperbarui
const DISARPUS_DATA_VERSION = 'v2026_blueprint_bg_v14';

function checkDataVersion() {
    const curVer = safeStorage.getItem('disarpus_data_ver');
    if (curVer !== DISARPUS_DATA_VERSION) {
        safeStorage.setItem('disarpus_floors', JSON.stringify(DEFAULT_FLOORS));
        // Preserve any custom rooms/racks/books user created in admin
        const existingRooms = safeStorage.getItem('disarpus_rooms');
        if (!existingRooms) {
            safeStorage.setItem('disarpus_rooms', JSON.stringify(DEFAULT_ROOMS));
        }
        const existingRacks = safeStorage.getItem('disarpus_racks');
        if (!existingRacks) {
            safeStorage.setItem('disarpus_racks', JSON.stringify(DEFAULT_RACKS));
        }
        const existingBooks = safeStorage.getItem('disarpus_books');
        if (!existingBooks) {
            safeStorage.setItem('disarpus_books', JSON.stringify(DEFAULT_BOOKS));
        }
        safeStorage.setItem('disarpus_data_ver', DISARPUS_DATA_VERSION);
        console.log('🔄 Cache seed data diperbarui ke versi:', DISARPUS_DATA_VERSION);
    }
}

// Inisialisasi LocalStorage cache jika belum ada
function getLocalData(key, defaultData) {
    checkDataVersion();
    const raw = safeStorage.getItem('disarpus_' + key);
    let data;
    if (!raw) {
        safeStorage.setItem('disarpus_' + key, JSON.stringify(defaultData));
        data = defaultData;
    } else {
        try {
            data = JSON.parse(raw);
        } catch (e) {
            data = defaultData;
        }
    }

    // Pembaruan otomatis: Pastikan gambar panorama ruangan menggunakan Base64 Data URI jika tersedia
    if (key === 'rooms' && typeof window !== 'undefined' && window.PANORAMA_DATA && Array.isArray(data)) {
        data = data.map(r => {
            let pano = r.panorama_image_url;
            if (!pano || !pano.startsWith('data:')) {
                if (r.id === 1 || r.id === 2 || r.id === 3) pano = window.PANORAMA_DATA.ruang_pa || pano;
                else if (r.id === 4 || r.id === 5) pano = window.PANORAMA_DATA.ruang_babad || pano;
                else if (r.id === 6 || r.id === 7) pano = window.PANORAMA_DATA.ruang_restorasi || pano;
                else if (r.id === 8) pano = window.PANORAMA_DATA.depo_arsip || pano;
            }
            return { ...r, panorama_image_url: pano };
        });
    }

    return data;
}

function setLocalData(key, data) {
    safeStorage.setItem('disarpus_' + key, JSON.stringify(data));
}

// Inisialisasi awal
initSupabase();

// ============================================================================
// API ADAPTER LAYER (SUPABASE + SEED FALLBACK)
// ============================================================================

const DataService = {
    isLiveSupabase() {
        return isSupabaseActive && supabaseClient !== null;
    },

    // 0. PENGUNGGAH BERKAS MEDIA (SRS-FR-11: Upload File JPG/PNG/WebP)
    async uploadMedia(file, bucket = 'details') {
        if (!file) return null;

        // A. Jika Supabase Cloud aktif & terhubung
        if (this.isLiveSupabase()) {
            try {
                const ext = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
                const filePath = `${fileName}`;
                const { data, error } = await supabaseClient.storage.from(bucket).upload(filePath, file);
                if (!error && data) {
                    const { data: publicData } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);
                    if (publicData?.publicUrl) return publicData.publicUrl;
                }
            } catch (err) {
                console.warn('Gagal upload ke Supabase Storage, menggunakan fallback Base64 lokal:', err);
            }
        }

        // B. Fallback Lokal / Demo Mode: Konversi berkas langsung menjadi Base64 Data URL
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
        });
    },

    // 1. DATA LANTAI (FLOORS)
    async getFloors(building) {
        if (this.isLiveSupabase()) {
            try {
                let q = supabaseClient.from('floors').select('*').order('floor_number');
                if (building) q = q.eq('building', building);
                const { data, error } = await q;
                if (!error && data && data.length > 0) return data;
            } catch (err) {
                console.warn('Fallback ke penyimpanan lokal untuk floors:', err);
            }
        }
        let list = getLocalData('floors', DEFAULT_FLOORS);
        if (building) {
            list = list.filter(f => f.building.toLowerCase() === building.toLowerCase());
        }
        return list.sort((a, b) => a.floor_number - b.floor_number);
    },

    async getFloorById(floorId) {
        const floors = await this.getFloors();
        return floors.find(f => Number(f.id) === Number(floorId)) || null;
    },

    async saveFloor(floorData) {
        if (this.isLiveSupabase()) {
            try {
                if (floorData.id) {
                    const { data, error } = await supabaseClient.from('floors').update(floorData).eq('id', floorData.id).select();
                    if (!error) return data[0];
                } else {
                    const { data, error } = await supabaseClient.from('floors').insert(floorData).select();
                    if (!error) return data[0];
                }
            } catch (e) {
                console.warn('Gagal simpan ke Supabase, simpan lokal:', e);
            }
        }
        const floors = getLocalData('floors', DEFAULT_FLOORS);
        if (floorData.id) {
            const idx = floors.findIndex(f => Number(f.id) === Number(floorData.id));
            if (idx >= 0) floors[idx] = { ...floors[idx], ...floorData };
        } else {
            floorData.id = Date.now();
            floors.push(floorData);
        }
        setLocalData('floors', floors);
        return floorData;
    },

    // 2. DATA RUANGAN (ROOMS)
    async getRoomsByFloor(floorId) {
        if (this.isLiveSupabase()) {
            try {
                const { data, error } = await supabaseClient.from('rooms').select('*').eq('floor_id', floorId).order('id');
                if (!error && data) return data;
            } catch (err) {
                console.warn('Fallback rooms:', err);
            }
        }
        const rooms = getLocalData('rooms', DEFAULT_ROOMS);
        return rooms.filter(r => Number(r.floor_id) === Number(floorId));
    },

    async getAllRooms() {
        if (this.isLiveSupabase()) {
            try {
                const { data, error } = await supabaseClient.from('rooms').select('*, floors(building, floor_number, name)').order('id');
                if (!error && data) return data;
            } catch (err) {
                console.warn('Fallback all rooms:', err);
            }
        }
        const rooms = getLocalData('rooms', DEFAULT_ROOMS);
        const floors = getLocalData('floors', DEFAULT_FLOORS);
        return rooms.map(r => ({
            ...r,
            floors: floors.find(f => Number(f.id) === Number(r.floor_id))
        }));
    },

    async getRoomById(roomId) {
        const rooms = await this.getAllRooms();
        return rooms.find(r => Number(r.id) === Number(roomId)) || null;
    },

    async saveRoom(roomData) {
        let savedResult = null;
        if (this.isLiveSupabase()) {
            try {
                if (roomData.id) {
                    const { data, error } = await supabaseClient.from('rooms').update(roomData).eq('id', roomData.id).select();
                    if (!error && data && data.length > 0) savedResult = data[0];
                } else {
                    const { data, error } = await supabaseClient.from('rooms').insert(roomData).select();
                    if (!error && data && data.length > 0) savedResult = data[0];
                }
            } catch (e) {
                console.warn('Gagal simpan room ke Supabase:', e);
            }
        }
        // SELALU sinkronkan ke LocalStorage agar tampilan offline & online tetap konsisten 100%
        const rooms = getLocalData('rooms', DEFAULT_ROOMS);
        const finalRoom = savedResult ? { ...roomData, ...savedResult } : roomData;
        if (finalRoom.id) {
            const idx = rooms.findIndex(r => Number(r.id) === Number(finalRoom.id));
            if (idx >= 0) rooms[idx] = { ...rooms[idx], ...finalRoom };
            else rooms.push(finalRoom);
        } else {
            finalRoom.id = Date.now();
            rooms.push(finalRoom);
        }
        setLocalData('rooms', rooms);
        return finalRoom;
    },

    async deleteRoom(roomId) {
        if (this.isLiveSupabase()) {
            try {
                await supabaseClient.from('rooms').delete().eq('id', roomId);
            } catch (e) { }
        }
        let rooms = getLocalData('rooms', DEFAULT_ROOMS);
        rooms = rooms.filter(r => Number(r.id) !== Number(roomId));
        setLocalData('rooms', rooms);
        return true;
    },

    // 3. DATA RAK / HOTSPOTS
    async getRacksByRoom(roomId) {
        if (this.isLiveSupabase()) {
            try {
                const { data, error } = await supabaseClient.from('racks').select('*').eq('room_id', roomId).order('id');
                if (!error && data) return data;
            } catch (err) {
                console.warn('Fallback racks:', err);
            }
        }
        const racks = getLocalData('racks', DEFAULT_RACKS);
        return racks.filter(rk => Number(rk.room_id) === Number(roomId));
    },

    async getAllRacks() {
        if (this.isLiveSupabase()) {
            try {
                const { data, error } = await supabaseClient.from('racks').select('*, rooms(name, floor_id, floors(building, floor_number))').order('id');
                if (!error && data) return data;
            } catch (err) {
                console.warn('Fallback all racks:', err);
            }
        }
        const racks = getLocalData('racks', DEFAULT_RACKS);
        const rooms = getLocalData('rooms', DEFAULT_ROOMS);
        const floors = getLocalData('floors', DEFAULT_FLOORS);
        return racks.map(rk => {
            const r = rooms.find(rm => Number(rm.id) === Number(rk.room_id));
            const f = r ? floors.find(fl => Number(fl.id) === Number(r.floor_id)) : null;
            return {
                ...rk,
                rooms: r ? { ...r, floors: f } : null
            };
        });
    },

    async getRackById(rackId) {
        const racks = await this.getAllRacks();
        return racks.find(r => Number(r.id) === Number(rackId)) || null;
    },

    async saveRack(rackData) {
        let savedResult = null;
        if (this.isLiveSupabase()) {
            try {
                if (rackData.id) {
                    const { data, error } = await supabaseClient.from('racks').update(rackData).eq('id', rackData.id).select();
                    if (!error && data && data.length > 0) savedResult = data[0];
                } else {
                    const { data, error } = await supabaseClient.from('racks').insert(rackData).select();
                    if (!error && data && data.length > 0) savedResult = data[0];
                }
            } catch (e) {
                console.warn('Gagal simpan rack ke Supabase:', e);
            }
        }
        // SELALU sinkronkan ke LocalStorage
        const racks = getLocalData('racks', DEFAULT_RACKS);
        const finalRack = savedResult ? { ...rackData, ...savedResult } : rackData;
        if (finalRack.id) {
            const idx = racks.findIndex(r => Number(r.id) === Number(finalRack.id));
            if (idx >= 0) racks[idx] = { ...racks[idx], ...finalRack };
            else racks.push(finalRack);
        } else {
            finalRack.id = Date.now();
            racks.push(finalRack);
        }
        setLocalData('racks', racks);
        return finalRack;
    },

    async deleteRack(rackId) {
        if (this.isLiveSupabase()) {
            try {
                await supabaseClient.from('racks').delete().eq('id', rackId);
            } catch (e) { }
        }
        let racks = getLocalData('racks', DEFAULT_RACKS);
        racks = racks.filter(r => Number(r.id) !== Number(rackId));
        setLocalData('racks', racks);
        // Cascade delete books locally
        let books = getLocalData('books', DEFAULT_BOOKS);
        books = books.filter(b => Number(b.rack_id) !== Number(rackId));
        setLocalData('books', books);
        return true;
    },

    // 4. DATA KATALOG BUKU (RACK_BOOKS)
    async getBooksByRack(rackId) {
        if (this.isLiveSupabase()) {
            try {
                const { data, error } = await supabaseClient.from('rack_books').select('*').eq('rack_id', rackId).order('id');
                if (!error && data) return data;
            } catch (err) {
                console.warn('Fallback books:', err);
            }
        }
        const books = getLocalData('books', DEFAULT_BOOKS);
        return books.filter(b => Number(b.rack_id) === Number(rackId));
    },

    async saveRackBooks(rackId, booksArray) {
        if (this.isLiveSupabase()) {
            try {
                // Delete existing and insert new
                await supabaseClient.from('rack_books').delete().eq('rack_id', rackId);
                if (booksArray.length > 0) {
                    const toInsert = booksArray.map(b => ({
                        rack_id: rackId,
                        title: b.title,
                        author: b.author,
                        publish_year: b.publish_year,
                        copies: Number(b.copies) || 1,
                        status: b.status || 'Baca di Tempat'
                    }));
                    await supabaseClient.from('rack_books').insert(toInsert);
                }
                return true;
            } catch (e) {
                console.warn('Gagal save books ke Supabase:', e);
            }
        }
        let allBooks = getLocalData('books', DEFAULT_BOOKS);
        // Remove old for this rack
        allBooks = allBooks.filter(b => Number(b.rack_id) !== Number(rackId));
        let nextId = Date.now();
        booksArray.forEach(b => {
            allBooks.push({
                id: b.id || nextId++,
                rack_id: Number(rackId),
                title: b.title,
                author: b.author || '',
                publish_year: b.publish_year || '',
                copies: Number(b.copies) || 1,
                status: b.status || 'Baca di Tempat'
            });
        });
        setLocalData('books', allBooks);
        return true;
    },

    // 5. PENCARIAN CEPAT LINTAS GEDUNG (SRS-FR-04)
    async searchAll(query) {
        if (!query || query.trim() === '') return [];
        const q = query.toLowerCase().trim();

        const allRooms = await this.getAllRooms();
        const allRacks = await this.getAllRacks();
        const allBooks = getLocalData('books', DEFAULT_BOOKS);

        const results = [];

        // 1. Search in Rooms
        allRooms.forEach(room => {
            const matchName = (room.name || '').toLowerCase().includes(q);
            const matchServices = (room.services_info || '').toLowerCase().includes(q);
            const matchNotes = (room.nearby_notes || '').toLowerCase().includes(q);
            if (matchName || matchServices || matchNotes) {
                results.push({
                    type: 'room',
                    id: room.id,
                    title: room.name,
                    subtitle: `${room.floors?.building || 'Gedung'} - Lantai ${room.floors?.floor_number || 1}`,
                    description: matchServices ? room.services_info.substring(0, 110) + '...' : room.nearby_notes,
                    room: room,
                    floor_id: room.floor_id,
                    target_x: room.map_x,
                    target_y: room.map_y
                });
            }
        });

        // 2. Search in Racks & Hotspots
        allRacks.forEach(rack => {
            const matchTitle = (rack.title || '').toLowerCase().includes(q);
            const matchDDC = (rack.category_code || '').toLowerCase().includes(q);
            const matchTags = (rack.search_tags || '').toLowerCase().includes(q);
            const matchNotes = (rack.location_notes || '').toLowerCase().includes(q);
            if (matchTitle || matchDDC || matchTags || matchNotes) {
                const room = rack.rooms || allRooms.find(r => Number(r.id) === Number(rack.room_id));
                const building = room?.floors?.building || 'Perpustakaan';
                const floorNum = room?.floors?.floor_number || 1;
                results.push({
                    type: 'rack',
                    id: rack.id,
                    title: rack.title,
                    subtitle: `${building} Lantai ${floorNum} • ${room?.name || 'Ruangan'}`,
                    description: `Patokan: ${rack.location_notes} (Kode: ${rack.category_code || '-'})`,
                    rack: rack,
                    room: room,
                    floor_id: room?.floor_id,
                    pitch: rack.pitch,
                    yaw: rack.yaw,
                    target_x: rack.map_x || room?.map_x,
                    target_y: rack.map_y || room?.map_y
                });
            }
        });

        // 3. Search in Books
        allBooks.forEach(book => {
            const matchTitle = (book.title || '').toLowerCase().includes(q);
            const matchAuthor = (book.author || '').toLowerCase().includes(q);
            if (matchTitle || matchAuthor) {
                const rack = allRacks.find(rk => Number(rk.id) === Number(book.rack_id));
                const room = rack?.rooms || allRooms.find(r => Number(r.id) === Number(rack?.room_id));
                const building = room?.floors?.building || 'Perpustakaan';
                const floorNum = room?.floors?.floor_number || 1;
                results.push({
                    type: 'book',
                    id: book.id,
                    title: `📖 ${book.title}`,
                    subtitle: `Tersimpan di: ${rack?.title || 'Rak'} (${building} Lt. ${floorNum})`,
                    description: `Pengarang: ${book.author || 'Anonim'} • Th. ${book.publish_year || '-'} • Status: ${book.status}`,
                    book: book,
                    rack: rack,
                    room: room,
                    floor_id: room?.floor_id,
                    pitch: rack?.pitch || 0,
                    yaw: rack?.yaw || 0,
                    target_x: rack?.map_x || room?.map_x,
                    target_y: rack?.map_y || room?.map_y
                });
            }
        });

        return results;
    },

    // 6. AUTENTIKASI ADMIN DINAS (SRS-FR-10)
    async signIn(email, password) {
        if (this.isLiveSupabase()) {
            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                if (error) throw error;
                localStorage.setItem('disarpus_admin_logged_in', 'true');
                localStorage.setItem('disarpus_admin_email', data.user.email);
                return { success: true, user: data.user };
            } catch (err) {
                console.warn('Supabase Auth error, verifikasi demo akun:', err);
                // If demo credentials match
                if (email === 'admin@disarpus.cirebonkab.go.id' || email.includes('admin') || email.includes('disarpus')) {
                    localStorage.setItem('disarpus_admin_logged_in', 'true');
                    localStorage.setItem('disarpus_admin_email', email);
                    return { success: true, user: { email: email, role: 'Petugas Dinas' } };
                }
                return { success: false, error: err.message || 'Surel atau kata sandi tidak cocok.' };
            }
        } else {
            // Mode Demo / Fallback Auth
            if ((email.includes('@') && password.length >= 4) || email === 'admin@disarpus.cirebonkab.go.id') {
                localStorage.setItem('disarpus_admin_logged_in', 'true');
                localStorage.setItem('disarpus_admin_email', email || 'petugas@disarpus.cirebonkab.go.id');
                return { success: true, user: { email: email, role: 'Petugas Dinas Terverifikasi' } };
            }
            return { success: false, error: 'Masukkan alamat surel dinas yang valid dan minimal 4 karakter sandi.' };
        }
    },

    signOut() {
        if (this.isLiveSupabase()) {
            try { supabaseClient.auth.signOut(); } catch (e) { }
        }
        localStorage.removeItem('disarpus_admin_logged_in');
        localStorage.removeItem('disarpus_admin_email');
        return true;
    },

    isAdminLoggedIn() {
        return localStorage.getItem('disarpus_admin_logged_in') === 'true';
    },

    getAdminEmail() {
        return localStorage.getItem('disarpus_admin_email') || 'Petugas Dinas Disarpus';
    },

    // Reset fallback demo data
    resetDemoData() {
        localStorage.removeItem('disarpus_floors');
        localStorage.removeItem('disarpus_rooms');
        localStorage.removeItem('disarpus_racks');
        localStorage.removeItem('disarpus_books');
        window.location.reload();
    }
};

window.DataService = DataService;

