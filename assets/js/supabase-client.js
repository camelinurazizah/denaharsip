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
                return true;
            }
        } catch (e) {
            console.warn('⚠️ Penyimpanan browser penuh atau tidak tersedia untuk key:', key, e);
        }
        this._mem[key] = String(val);
        return false;
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

// Kredensial Supabase Bawaan Proyek (Disarpus Kab. Cirebon - Gedung Kearsipan)
const DEFAULT_SUPABASE_CONFIG = {
    url: 'https://gydqaikvdftwemsnkdrv.supabase.co',
    anonKey: 'sb_publishable_xG9GCtxElFIfto87xP1DvQ_zdtvq1MU'
};

function normalizeSupabaseUrl(rawUrl) {
    const trimmed = String(rawUrl || '').trim();
    if (!trimmed) return '';
    try {
        const parsed = new URL(trimmed);
        return parsed.origin;
    } catch (e) {
        return trimmed.replace(/\/rest\/v1\/?.*$/i, '').replace(/\/+$/, '');
    }
}

function getEffectiveSupabaseConfig() {
    const storedRawUrl = safeStorage.getItem('disarpus_supabase_url') || '';
    const storedUrl = normalizeSupabaseUrl(storedRawUrl);
    if (storedRawUrl && storedUrl && storedRawUrl !== storedUrl) {
        safeStorage.setItem('disarpus_supabase_url', storedUrl);
    }
    const storedKey = (safeStorage.getItem('disarpus_supabase_key') || '').trim();
    return {
        url: storedUrl || DEFAULT_SUPABASE_CONFIG.url,
        anonKey: storedKey || DEFAULT_SUPABASE_CONFIG.anonKey
    };
}

// Inisialisasi Klien Supabase (gunakan supabaseClient untuk menghindari tabrakan dengan window.supabase dari CDN SDK)
let supabaseClient = null;
let isSupabaseActive = false;

function initSupabase() {
    const { url, anonKey: key } = getEffectiveSupabaseConfig();

    if (typeof window !== 'undefined' && window.supabase && url && key && url.startsWith('http')) {
        try {
            supabaseClient = window.supabase.createClient(url, key);
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

// Helper global: Memastikan URL panorama kustom (upload Base64 / HTTPS) selalu diprioritaskan,
// sedangkan jalur relatif bawaan otomatis dialihkan ke PANORAMA_DATA agar bebas error CORS file:///
function resolvePanoramaUrl(panoUrl) {
    const url = (panoUrl || '').trim();
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
        return url;
    }
    if (typeof window !== 'undefined' && window.PANORAMA_DATA) {
        if (url.includes('ruang-babad-pano')) return window.PANORAMA_DATA.ruang_babad || url;
        if (url.includes('ruang-restorasi-pano')) return window.PANORAMA_DATA.ruang_restorasi || url;
        if (url.includes('depo-arsip-pano')) return window.PANORAMA_DATA.depo_arsip || url;
        if (url.includes('ruang-pa-pano') || !url) return window.PANORAMA_DATA.ruang_pa || url;
    }
    return url || 'assets/images/ruang-pa-pano.jpg';
}

const DEFAULT_FLOORS = [
    {
        id: 1,
        building: 'Kearsipan',
        name: 'Lantai 1 - Layanan & Tata Usaha Arsip',
        floor_number: 1,
        map_image_url: 'assets/images/gedung-kearsipan-lantai-1.svg?v=20261111_kearsipan_v3',
        blueprint_image_url: 'assets/images/blueprint-arsip-lt1.jpg?v=20261111_kearsipan_v3',
        description: 'Zonasi layanan konsultasi kearsipan, peminjaman arsip, penerimaan surat & tamu, serta ruang pengolahan, pemberkasan & alih media arsip.'
    },
    {
        id: 2,
        building: 'Kearsipan',
        name: 'Lantai 2 - Depo & Restorasi Arsip',
        floor_number: 2,
        map_image_url: 'assets/images/gedung-kearsipan-lantai-2.svg?v=20261111_kearsipan_v3',
        blueprint_image_url: 'assets/images/blueprint-arsip-lt2.jpg?v=20261111_kearsipan_v3',
        description: 'Zonasi Depo Arsip Dinamis & Statis (lemari Roll O\'Pack & rak besi suhu terkontrol) serta Ruang Restorasi & Preservasi Arsip kertas kuno.'
    }
];

const DEFAULT_ROOMS = [
    // Lantai 1 Gedung Kearsipan
    {
        id: 1,
        floor_id: 1,
        name: 'Ruang Pelayanan Kearsipan & Tamu (PA)',
        short_name: 'Pelayanan & Tamu (PA)',
        nearby_notes: 'Terletak di Lantai 1 Gedung Kearsipan, tepat di area lobi utama setelah melewati Pintu Masuk Utama sisi selatan, berhadapan langsung dengan meja penerima tamu.',
        services_info: 'Layanan yang tersedia:\n1. Konsultasi kearsipan daerah & pendampingan tata naskah dinas OPD.\n2. Layanan peminjaman, penelusuran, dan akses baca arsip dinamis/statis.\n3. Penerimaan surat masuk, registrasi tamu dinas, dan permohonan informasi arsip.\n\nJam Pelayanan Loket: Senin - Kamis 08.00 - 15.30 WIB, Jumat 08.00 - 14.30 WIB.',
        room_photo_url: 'assets/images/ruang-pa-front.jpg',
        panorama_image_url: getPanoAsset('ruang_pa', 'assets/images/ruang-pa-pano.jpg'),
        map_x: 47.0,
        map_y: 66.0
    },
    {
        id: 2,
        floor_id: 1,
        name: 'Ruang Pengolahan & Alih Media Arsip',
        short_name: 'Pengolahan & Alih Media',
        nearby_notes: 'Terletak di Lantai 1 Gedung Kearsipan sayap utara-tengah, tepat di belakang tangga sentral menuju Lantai 2.',
        services_info: 'Kegiatan & layanan teknis pengolahan arsip:\n1. Pemilahan, deskripsi berkas, dan pemberkasan arsip dinamis inaktif.\n2. Penomoran, pelabelan kode klasifikasi, dan pengemasan ke dalam boks arsip standar ANRI.\n3. Alih media & digitalisasi (scanning) dokumen/surat arsip bersejarah maupun berkas OPD.\n\nAkses Ruang: Area kerja teknis arsiparis & koordinasi alih media.',
        room_photo_url: 'assets/images/depo-arsip-front.jpg',
        panorama_image_url: getPanoAsset('ruang_pa', 'assets/images/ruang-pa-pano.jpg'),
        map_x: 44.5,
        map_y: 25.0
    },

    // Lantai 2 Gedung Kearsipan
    {
        id: 3,
        floor_id: 2,
        name: 'Ruang Depo Arsip Dinamis & Statis',
        short_name: 'Depo Arsip Dinamis & Statis',
        nearby_notes: 'Terletak di Lantai 2 Gedung Kearsipan sepanjang sayap utara, diakses dari selasar penghubung setelah menaiki tangga dari Lantai 1.',
        services_info: 'Pusat penyimpanan fisik boks arsip dinamis inaktif dan arsip statis Kabupaten Cirebon menggunakan lemari gerak (Roll O\'Pack) dan rak besi standar ANRI.\n\nFasilitas & Standar Penyimpanan:\n1. Pengatur suhu ruangan terkontrol (18-20°C) dan kelembaban (50-60% RH).\n2. Penataan boks arsip terindeks berdasarkan Kode Klasifikasi, Unit Pencipta, dan Kurun Waktu.\n3. Penelusuran fisik boks & surat arsip didampingi oleh petugas arsiparis.',
        room_photo_url: 'assets/images/depo-arsip-front.jpg',
        panorama_image_url: getPanoAsset('depo_arsip', 'assets/images/depo-arsip-pano.jpg'),
        map_x: 49.0,
        map_y: 47.0
    },
    {
        id: 4,
        floor_id: 2,
        name: 'Ruang Restorasi & Preservasi Arsip',
        short_name: 'Restorasi & Preservasi',
        nearby_notes: 'Terletak di Lantai 2 Gedung Kearsipan sayap tenggara (kanan bawah), tepat di samping tangga timur menuju Lantai 1.',
        services_info: 'Laboratorium perawatan, restorasi, dan preservasi fisik dokumen arsip kertas kuno yang rusak, rapuh, sobek, atau bernoda asam.\n\nLayanan & Proses Konservasi:\n1. Pembersihan fisik dokumen & netralisasi keasaman kertas (deasidifikasi).\n2. Penambalan serat kertas Jepang (tissue mending) dan laminasi arsip.\n3. Enkapsulasi pelindung film poliester serta penjilidan ulang bundel arsip kuno.',
        room_photo_url: 'assets/images/ruang-restorasi-front.jpg',
        panorama_image_url: getPanoAsset('ruang_restorasi', 'assets/images/ruang-restorasi-pano.jpg'),
        map_x: 72.8,
        map_y: 80.1
    }
];

const DEFAULT_RACKS = [
    // Hotspots di Ruang Depo Arsip Dinamis & Statis (Room 3)
    {
        id: 1,
        room_id: 3,
        title: "Rak Roll O'Pack 01 - Arsip Sejarah & Naskah Daerah",
        short_title: "Roll O'Pack 01",
        category_code: "ARS-000 / Roll O'Pack 01",
        location_notes: "Lorong 1 sebelah kanan, Rak Roll O'Pack 01, Baris/Shaf ke-2 dari atas",
        rack_photo_url: 'assets/images/depo-arsip-front.jpg',
        pitch: -2.0,
        yaw: -38.0,
        map_x: 27.5,
        map_y: 34.5,
        search_tags: "roll opack 01, arsip sejarah, naskah daerah, boks a-01, peta kadaster, statis, cirebon"
    },
    {
        id: 2,
        room_id: 3,
        title: 'Rak Besi 02 - Arsip SK Bupati & Peraturan Daerah',
        short_title: 'Rak Besi 02',
        category_code: 'ARS-900 / Rak Besi 02',
        location_notes: 'Lorong 2 sebelah kiri, Rak Besi 02, Baris/Shaf ke-3 dari atas',
        rack_photo_url: 'assets/images/depo-arsip-front.jpg',
        pitch: 0.0,
        yaw: 12.0,
        map_x: 48.5,
        map_y: 34.5,
        search_tags: 'rak besi 02, boks b-04, sk bupati, kepegawaian, peraturan daerah, perda, surat keputusan'
    },
    {
        id: 3,
        room_id: 3,
        title: "Rak Roll O'Pack 03 - Arsip Perizinan & Pertanahan",
        short_title: "Roll O'Pack 03",
        category_code: "ARS-500 / Roll O'Pack 03",
        location_notes: "Lorong 3 bagian tengah, Rak Roll O'Pack 03, Baris/Shaf ke-1 dari atas",
        rack_photo_url: 'assets/images/depo-arsip-front.jpg',
        pitch: -1.5,
        yaw: 50.0,
        map_x: 68.5,
        map_y: 34.5,
        search_tags: "roll opack 03, boks c-12, perizinan, pertanahan, imb, pbg, aset daerah"
    },
    // Hotspot di Ruang Restorasi & Preservasi Arsip (Room 4)
    {
        id: 4,
        room_id: 4,
        title: 'Meja Restorasi 01 - Laminasi & Deasidifikasi Dokumen',
        short_title: 'Meja Restorasi 01',
        category_code: 'ARS-RST-01',
        location_notes: 'Area laboratorium konservasi sisi tengah Ruang Restorasi & Preservasi Arsip',
        rack_photo_url: 'assets/images/ruang-restorasi-front.jpg',
        pitch: -2.0,
        yaw: 0.0,
        map_x: null,
        map_y: null,
        search_tags: 'restorasi, laminasi, deasidifikasi, preservasi, kertas kuno, tissue mending'
    },
    // Hotspot di Ruang Pelayanan Kearsipan & Tamu (Room 1)
    {
        id: 5,
        room_id: 1,
        title: 'Loket Layanan Kearsipan, Peminjaman & Penerimaan Surat',
        short_title: 'Loket Layanan Arsip',
        category_code: 'ARS-LAY-01',
        location_notes: 'Meja loket pelayanan utama tepat di depan pintu masuk Ruang Pelayanan Kearsipan & Tamu (PA)',
        rack_photo_url: 'assets/images/ruang-pa-front.jpg',
        pitch: -3.5,
        yaw: 0.0,
        map_x: null,
        map_y: null,
        search_tags: 'loket, konsultasi kearsipan, peminjaman arsip, penerimaan surat, tamu'
    }
];

const DEFAULT_BOOKS = [
    // Boks & Surat Arsip di Rak Roll O'Pack 01 (rack_id: 1)
    { id: 1, rack_id: 1, title: 'Boks A-01: Arsip Sejarah & Naskah Daerah', author: 'Bagian Umum & Kearsipan Daerah Kab. Cirebon', publish_year: '1975 - 1998', copies: 2, status: 'Akses Terbatas' },
    { id: 2, rack_id: 1, title: 'Boks A-02: Peta Kadaster & Dokumen Batas Wilayah Kabupaten', author: 'Dinas Tata Ruang & Agraria Kab. Cirebon', publish_year: '1980 - 2005', copies: 3, status: 'Arsip Terbuka' },
    { id: 3, rack_id: 1, title: 'Boks A-03: Album Dokumentasi Pembangunan Daerah Cirebon', author: 'Humas & Protokol Setda Kab. Cirebon', publish_year: '1990 - 2010', copies: 2, status: 'Arsip Terbuka' },

    // Boks & Surat Arsip di Rak Besi 02 (rack_id: 2)
    { id: 4, rack_id: 2, title: 'Boks B-04: SK Bupati & Arsip Kepegawaian', author: 'Sekretariat Daerah / Bidang Umum', publish_year: '2019 - 2021', copies: 3, status: 'Arsip Terbuka' },
    { id: 5, rack_id: 2, title: 'Boks B-05: Surat Keputusan & Peraturan Daerah (Perda)', author: 'Bagian Hukum Setda & DPRD Kab. Cirebon', publish_year: '2015 - 2020', copies: 4, status: 'Arsip Terbuka' },
    { id: 6, rack_id: 2, title: 'Boks B-06: Berkas Mutasi & Kenaikan Pangkat ASN Daerah', author: 'BKPSDM Kabupaten Cirebon', publish_year: '2018 - 2022', copies: 2, status: 'Akses Terbatas' },
    { id: 7, rack_id: 2, title: 'Boks B-07: Bundel Nota Dinas & Surat Perintah Tugas', author: 'Disarpus / Tata Usaha Kepegawaian', publish_year: '2020 - 2023', copies: 3, status: 'Sedang Dipinjam' },

    // Boks & Surat Arsip di Rak Roll O'Pack 03 (rack_id: 3)
    { id: 8, rack_id: 3, title: 'Boks C-12: Berkas Perizinan & Pertanahan', author: 'DPMPTSP & Dinas Pertanahan Kab. Cirebon', publish_year: '2016 - 2021', copies: 5, status: 'Akses Terbatas' },
    { id: 9, rack_id: 3, title: 'Boks C-14: Surat Izin Mendirikan Bangunan (IMB) & PBG', author: 'Dinas Pekerjaan Umum & Penataan Ruang', publish_year: '2018 - 2022', copies: 4, status: 'Arsip Terbuka' },
    { id: 10, rack_id: 3, title: 'Boks C-15: Dokumen Sertifikat Aset Tanah Pemerintah Daerah', author: 'BKAD Bidang Aset Kab. Cirebon', publish_year: '2010 - 2020', copies: 2, status: 'Sedang Dipinjam' }
];

// Versi cache seed data khusus Gedung Kearsipan (Visual Archive Locator)
const DISARPUS_DATA_VERSION = 'v2026_kearsipan_locator_v3';

function checkDataVersion() {
    const curVer = safeStorage.getItem('disarpus_data_ver');
    if (curVer !== DISARPUS_DATA_VERSION) {
        safeStorage.setItem('disarpus_floors', JSON.stringify(DEFAULT_FLOORS));
        safeStorage.setItem('disarpus_rooms', JSON.stringify(DEFAULT_ROOMS));
        safeStorage.setItem('disarpus_racks', JSON.stringify(DEFAULT_RACKS));
        safeStorage.setItem('disarpus_books', JSON.stringify(DEFAULT_BOOKS));
        safeStorage.setItem('disarpus_data_ver', DISARPUS_DATA_VERSION);
        console.log('🔄 Seed data Gedung Kearsipan diperbarui ke versi:', DISARPUS_DATA_VERSION);
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

    // Pastikan setiap ruangan memiliki path/URL panorama (tanpa menimpa upload kustom)
    if (key === 'rooms' && Array.isArray(data)) {
        data = data.map(r => ({
            ...r,
            panorama_image_url: r.panorama_image_url || 'assets/images/ruang-pa-pano.jpg'
        }));
    }

    return data;
}

function setLocalData(key, data) {
    const ok = safeStorage.setItem('disarpus_' + key, JSON.stringify(data));
    if (!ok) {
        throw new Error('Kapasitas penyimpanan lokal browser penuh. Gunakan gambar berukuran lebih kecil atau hubungkan ke Supabase.');
    }
    return true;
}

// Helper kompresi gambar otomatis di sisi klien agar aman disimpan di LocalStorage
function compressImageToDataUrl(file, bucket = 'details') {
    return new Promise((resolve, reject) => {
        if (file.type === 'image/svg+xml') {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (err) => reject(err);
            reader.readAsDataURL(file);
            return;
        }

        const reader = new FileReader();
        reader.onerror = (err) => reject(err);
        reader.onload = (e) => {
            const rawDataUrl = e.target.result;
            const img = new Image();
            img.onerror = () => resolve(rawDataUrl);
            img.onload = () => {
                try {
                    const maxWidth = bucket === 'panoramas' ? 2048 : 1280;
                    const quality = bucket === 'panoramas' ? 0.78 : 0.80;
                    let width = img.naturalWidth || img.width;
                    let height = img.naturalHeight || img.height;

                    if (width > maxWidth) {
                        height = Math.round(height * (maxWidth / width));
                        width = maxWidth;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressedUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedUrl.length < rawDataUrl.length ? compressedUrl : rawDataUrl);
                } catch (convErr) {
                    resolve(rawDataUrl);
                }
            };
            img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
    });
}

// Inisialisasi awal
initSupabase();

// ============================================================================
// API ADAPTER LAYER (SUPABASE + SEED FALLBACK)
// ============================================================================

const DataService = {
    normalizeSupabaseUrl,

    getActiveConfig() {
        return getEffectiveSupabaseConfig();
    },

    isLiveSupabase() {
        return isSupabaseActive && supabaseClient !== null;
    },

    async getConnectionStatus() {
        const { url, anonKey: key } = getEffectiveSupabaseConfig();
        if (!this.isLiveSupabase()) {
            return { connected: false, hasAuthSession: false, url, hasKey: Boolean(key), authEmail: null, error: null };
        }
        try {
            const { data: sessionData } = await supabaseClient.auth.getSession();
            const session = sessionData?.session || null;
            const { error: pingErr } = await supabaseClient.from('floors').select('id').limit(1);
            return {
                connected: !pingErr,
                hasAuthSession: Boolean(session),
                authEmail: session?.user?.email || null,
                url,
                hasKey: Boolean(key),
                error: pingErr ? pingErr.message : null
            };
        } catch (err) {
            return { connected: false, hasAuthSession: false, authEmail: null, url, hasKey: Boolean(key), error: err.message };
        }
    },

    async ensureSupabaseWriteSession() {
        if (!this.isLiveSupabase()) return false;
        const { data } = await supabaseClient.auth.getSession();
        if (!data?.session) {
            throw new Error('Sesi login Supabase Auth belum aktif (masih login demo lokal). Klik "Keluar" lalu login ulang dengan akun dari Authentication -> Users Supabase agar perubahan masuk ke database.');
        }
        return true;
    },

    // Sinkronisasi & Muat Ulang Penuh dari Database Supabase Cloud (Refresh)
    async refreshAllData() {
        const result = {
            isLive: this.isLiveSupabase(),
            rooms: [],
            racks: [],
            floors: []
        };

        if (this.isLiveSupabase()) {
            try {
                // Tarik data lantai terbaru
                const { data: fData, error: fErr } = await supabaseClient.from('floors').select('*').order('floor_number');
                if (!fErr && fData && fData.length > 0) {
                    setLocalData('floors', fData);
                    result.floors = fData;
                }

                // Tarik data ruangan terbaru langsung dari Supabase
                const { data: rData, error: rErr } = await supabaseClient.from('rooms').select('*, floors(building, floor_number, name)').order('id');
                if (!rErr && rData) {
                    const filteredRooms = rData.filter(r => !r.floors || (r.floors.building || '').toLowerCase() === 'kearsipan');
                    setLocalData('rooms', filteredRooms);
                    result.rooms = filteredRooms;
                } else if (rErr) {
                    throw rErr;
                }

                // Tarik data rak terbaru langsung dari Supabase
                const { data: rkData, error: rkErr } = await supabaseClient.from('racks').select('*, rooms(name, floor_id, floors(building, floor_number))').order('id');
                if (!rkErr && rkData) {
                    const filteredRacks = rkData.filter(rk => !rk.rooms?.floors || (rk.rooms.floors.building || '').toLowerCase() === 'kearsipan');
                    setLocalData('racks', filteredRacks);
                    result.racks = filteredRacks;
                }
            } catch (err) {
                console.warn('Gagal sinkronisasi data langsung Supabase, menggunakan data cache lokal:', err);
                result.isLive = false;
                result.error = err.message;
            }
        }

        if (!result.rooms || result.rooms.length === 0) {
            result.rooms = await this.getAllRooms();
        }
        if (!result.floors || result.floors.length === 0) {
            result.floors = await this.getFloors('Kearsipan');
        }
        if (!result.racks || result.racks.length === 0) {
            result.racks = await this.getAllRacks();
        }

        return result;
    },

    // 0. PENGUNGGAH BERKAS MEDIA (SRS-FR-11: Upload File JPG/PNG/WebP)
    async uploadMedia(file, bucket = 'details') {
        if (!file) return null;

        // A. Jika Supabase Cloud aktif & terhubung
        if (this.isLiveSupabase()) {
            try {
                const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
                const filePath = `${fileName}`;
                const { data, error } = await supabaseClient.storage.from(bucket).upload(filePath, file, {
                    upsert: true,
                    contentType: file.type || undefined
                });
                if (error) {
                    console.warn(`Supabase Storage (${bucket}) error:`, error.message);
                } else if (data) {
                    const { data: publicData } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);
                    if (publicData?.publicUrl) return publicData.publicUrl;
                }
            } catch (err) {
                console.warn('Gagal upload ke Supabase Storage, menggunakan fallback terkompresi lokal:', err);
            }
        }

        // B. Fallback Lokal / Demo Mode: Kompres gambar & konversi ke Base64 Data URL agar hemat memori
        return compressImageToDataUrl(file, bucket);
    },

    // 1. DATA LANTAI (FLOORS) - Fokus Gedung Kearsipan
    async getFloors(building = 'Kearsipan') {
        if (this.isLiveSupabase()) {
            try {
                let q = supabaseClient.from('floors').select('*').order('floor_number');
                if (building) q = q.eq('building', building);
                const { data, error } = await q;
                if (!error && data && data.length > 0) {
                    const localFloors = getLocalData('floors', DEFAULT_FLOORS);
                    return data.map(row => {
                        const localMatch = localFloors.find(f => Number(f.id) === Number(row.id) || Number(f.floor_number) === Number(row.floor_number));
                        const defMatch = DEFAULT_FLOORS.find(f => Number(f.id) === Number(row.id) || Number(f.floor_number) === Number(row.floor_number));
                        return {
                            ...row,
                            blueprint_image_url: row.blueprint_image_url || localMatch?.blueprint_image_url || defMatch?.blueprint_image_url || row.map_image_url
                        };
                    });
                }
            } catch (err) {
                console.warn('Fallback ke penyimpanan lokal untuk floors:', err);
            }
        }
        let list = getLocalData('floors', DEFAULT_FLOORS);
        if (building) {
            list = list.filter(f => (f.building || '').toLowerCase() === building.toLowerCase());
        }
        return list.sort((a, b) => a.floor_number - b.floor_number);
    },

    async getFloorById(floorId) {
        const floors = await this.getFloors();
        return floors.find(f => Number(f.id) === Number(floorId)) || null;
    },

    async saveFloor(floorData) {
        let savedResult = null;
        if (this.isLiveSupabase()) {
            await this.ensureSupabaseWriteSession();
            const dbFloorBase = {
                building: floorData.building || 'Kearsipan',
                name: floorData.name,
                floor_number: floorData.floor_number,
                map_image_url: floorData.map_image_url,
                description: floorData.description
            };
            const dbFloorWithBlueprint = {
                ...dbFloorBase,
                blueprint_image_url: floorData.blueprint_image_url || floorData.map_image_url
            };

            let res = floorData.id
                ? await supabaseClient.from('floors').update(dbFloorWithBlueprint).eq('id', floorData.id).select()
                : await supabaseClient.from('floors').insert(dbFloorWithBlueprint).select();

            // Jika kolom blueprint_image_url belum ditambahkan di Supabase, simpan kolom standar saja
            if (res.error && /blueprint_image_url|PGRST204|column/i.test(res.error.message || '')) {
                res = floorData.id
                    ? await supabaseClient.from('floors').update(dbFloorBase).eq('id', floorData.id).select()
                    : await supabaseClient.from('floors').insert(dbFloorBase).select();
            }

            if (res.error) throw new Error(`Gagal menyimpan lantai ke Supabase: ${res.error.message}`);
            if (!res.data || res.data.length === 0) throw new Error('Data lantai tidak berubah di Supabase (periksa izin RLS / ID lantai).');
            savedResult = res.data[0];
        }
        const floors = getLocalData('floors', DEFAULT_FLOORS);
        const finalFloor = savedResult
            ? {
                ...floorData,
                ...savedResult,
                blueprint_image_url: savedResult.blueprint_image_url || floorData.blueprint_image_url || savedResult.map_image_url
            }
            : floorData;
        if (finalFloor.id) {
            const idx = floors.findIndex(f => Number(f.id) === Number(finalFloor.id));
            if (idx >= 0) floors[idx] = { ...floors[idx], ...finalFloor };
            else floors.push(finalFloor);
        } else {
            finalFloor.id = Date.now();
            floors.push(finalFloor);
        }
        try {
            setLocalData('floors', floors);
        } catch (localErr) {
            if (!savedResult) throw localErr;
            console.warn('Cache lokal penuh, data utama tetap tersimpan di Supabase:', localErr);
        }
        return finalFloor;
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
                if (!error && data) {
                    const filtered = data.filter(r => !r.floors || (r.floors.building || '').toLowerCase() === 'kearsipan');
                    setLocalData('rooms', filtered);
                    return filtered;
                }
            } catch (err) {
                console.warn('Fallback all rooms:', err);
            }
        }
        const rooms = getLocalData('rooms', DEFAULT_ROOMS);
        const floors = getLocalData('floors', DEFAULT_FLOORS);
        return rooms
            .map(r => ({
                ...r,
                floors: floors.find(f => Number(f.id) === Number(r.floor_id))
            }))
            .filter(r => !r.floors || (r.floors.building || '').toLowerCase() === 'kearsipan');
    },

    async getRoomById(roomId) {
        const rooms = await this.getAllRooms();
        return rooms.find(r => Number(r.id) === Number(roomId)) || null;
    },

    async saveRoom(roomData) {
        let savedResult = null;
        if (this.isLiveSupabase()) {
            await this.ensureSupabaseWriteSession();
            const dbRoom = {
                floor_id: roomData.floor_id,
                name: roomData.name,
                nearby_notes: roomData.nearby_notes,
                services_info: roomData.services_info,
                room_photo_url: roomData.room_photo_url,
                panorama_image_url: roomData.panorama_image_url,
                map_x: roomData.map_x,
                map_y: roomData.map_y
            };
            const { data, error } = roomData.id
                ? await supabaseClient.from('rooms').update(dbRoom).eq('id', roomData.id).select()
                : await supabaseClient.from('rooms').insert(dbRoom).select();
            if (error) throw new Error(`Gagal menyimpan ruangan ke Supabase: ${error.message}`);
            if (!data || data.length === 0) throw new Error('Ruangan tidak tersimpan di Supabase (periksa izin RLS).');
            savedResult = data[0];
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
            await this.ensureSupabaseWriteSession();
            const { error } = await supabaseClient.from('rooms').delete().eq('id', roomId).select();
            if (error) throw new Error(`Gagal menghapus ruangan di Supabase: ${error.message}`);
        }
        let rooms = getLocalData('rooms', DEFAULT_ROOMS);
        rooms = rooms.filter(r => Number(r.id) !== Number(roomId));
        setLocalData('rooms', rooms);
        return true;
    },

    // 3. DATA LEMARI / RAK DEPO ARSIP (HOTSPOTS)
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
                if (!error && data) {
                    const filtered = data.filter(rk => !rk.rooms?.floors || (rk.rooms.floors.building || '').toLowerCase() === 'kearsipan');
                    setLocalData('racks', filtered);
                    return filtered;
                }
            } catch (err) {
                console.warn('Fallback all racks:', err);
            }
        }
        const racks = getLocalData('racks', DEFAULT_RACKS);
        const rooms = getLocalData('rooms', DEFAULT_ROOMS);
        const floors = getLocalData('floors', DEFAULT_FLOORS);
        return racks
            .map(rk => {
                const r = rooms.find(rm => Number(rm.id) === Number(rk.room_id));
                const f = r ? floors.find(fl => Number(fl.id) === Number(r.floor_id)) : null;
                return {
                    ...rk,
                    rooms: r ? { ...r, floors: f } : null
                };
            })
            .filter(rk => !rk.rooms?.floors || (rk.rooms.floors.building || '').toLowerCase() === 'kearsipan');
    },

    async getRackById(rackId) {
        const racks = await this.getAllRacks();
        return racks.find(r => Number(r.id) === Number(rackId)) || null;
    },

    async saveRack(rackData) {
        let savedResult = null;
        if (this.isLiveSupabase()) {
            await this.ensureSupabaseWriteSession();
            const dbRack = {
                room_id: rackData.room_id,
                title: rackData.title,
                category_code: rackData.category_code,
                location_notes: rackData.location_notes,
                rack_photo_url: rackData.rack_photo_url,
                pitch: rackData.pitch,
                yaw: rackData.yaw,
                map_x: rackData.map_x ?? null,
                map_y: rackData.map_y ?? null,
                search_tags: rackData.search_tags
            };
            const { data, error } = rackData.id
                ? await supabaseClient.from('racks').update(dbRack).eq('id', rackData.id).select()
                : await supabaseClient.from('racks').insert(dbRack).select();
            if (error) throw new Error(`Gagal menyimpan rak ke Supabase: ${error.message}`);
            if (!data || data.length === 0) throw new Error('Rak tidak tersimpan di Supabase (periksa izin RLS).');
            savedResult = data[0];
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
            await this.ensureSupabaseWriteSession();
            const { error } = await supabaseClient.from('racks').delete().eq('id', rackId).select();
            if (error) throw new Error(`Gagal menghapus rak di Supabase: ${error.message}`);
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

    // 4. DATA INVENTARIS BOKS & SURAT ARSIP (RACK_BOOKS)
    async getBooksByRack(rackId) {
        if (this.isLiveSupabase()) {
            try {
                const { data, error } = await supabaseClient.from('rack_books').select('*').eq('rack_id', rackId).order('id');
                if (!error && data) return data;
            } catch (err) {
                console.warn('Fallback rack_books:', err);
            }
        }
        const books = getLocalData('books', DEFAULT_BOOKS);
        return books.filter(b => Number(b.rack_id) === Number(rackId));
    },

    async getAllRackBooks() {
        if (this.isLiveSupabase()) {
            try {
                const { data, error } = await supabaseClient.from('rack_books').select('*').order('id');
                if (!error && data) return data;
            } catch (err) {
                console.warn('Fallback all rack_books:', err);
            }
        }
        return getLocalData('books', DEFAULT_BOOKS);
    },

    async saveRackBooks(rackId, booksArray) {
        if (this.isLiveSupabase()) {
            await this.ensureSupabaseWriteSession();
            const { error: delErr } = await supabaseClient.from('rack_books').delete().eq('rack_id', rackId);
            if (delErr) throw new Error(`Gagal memperbarui daftar boks di Supabase: ${delErr.message}`);
            if (booksArray.length > 0) {
                const toInsert = booksArray.map(b => ({
                    rack_id: rackId,
                    title: b.title,
                    author: b.author,
                    publish_year: b.publish_year,
                    copies: Number(b.copies) || 1,
                    status: b.status || 'Arsip Terbuka'
                }));
                const { error: insErr } = await supabaseClient.from('rack_books').insert(toInsert);
                if (insErr) throw new Error(`Gagal menyimpan daftar boks ke Supabase: ${insErr.message}`);
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
                status: b.status || 'Arsip Terbuka'
            });
        });
        setLocalData('books', allBooks);
        return true;
    },

    // 5. PENCARIAN CEPAT GEDUNG KEARSIPAN (SRS-FR-04)
    async searchAll(query) {
        if (!query || query.trim() === '') return [];
        const q = query.toLowerCase().trim();

        const allRooms = await this.getAllRooms();
        const allRacks = await this.getAllRacks();
        const allBooks = await this.getAllRackBooks();

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
                    subtitle: `Gedung Kearsipan - Lantai ${room.floors?.floor_number || 1}`,
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
            const matchCode = (rack.category_code || '').toLowerCase().includes(q);
            const matchTags = (rack.search_tags || '').toLowerCase().includes(q);
            const matchNotes = (rack.location_notes || '').toLowerCase().includes(q);
            if (matchTitle || matchCode || matchTags || matchNotes) {
                const room = rack.rooms || allRooms.find(r => Number(r.id) === Number(rack.room_id));
                const floorNum = room?.floors?.floor_number || 2;
                results.push({
                    type: 'rack',
                    id: rack.id,
                    title: rack.title,
                    subtitle: `Gedung Kearsipan Lantai ${floorNum} • ${room?.name || 'Ruangan'}`,
                    description: `Patokan: ${rack.location_notes || '-'} (Kode: ${rack.category_code || '-'})`,
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

        // 3. Search in Archive Boxes / Letters (rack_books)
        allBooks.forEach(book => {
            const matchTitle = (book.title || '').toLowerCase().includes(q);
            const matchAuthor = (book.author || '').toLowerCase().includes(q);
            const matchYear = (book.publish_year || '').toLowerCase().includes(q);
            if (matchTitle || matchAuthor || matchYear) {
                const rack = allRacks.find(rk => Number(rk.id) === Number(book.rack_id));
                if (!rack) return;
                const room = rack.rooms || allRooms.find(r => Number(r.id) === Number(rack.room_id));
                const floorNum = room?.floors?.floor_number || 2;
                results.push({
                    type: 'book',
                    id: book.id,
                    title: `🗂️ ${book.title}`,
                    subtitle: `Tersimpan di: ${rack.title} (Gedung Kearsipan Lt. ${floorNum})`,
                    description: `Unit Pencipta: ${book.author || '-'} • Kurun Waktu: ${book.publish_year || '-'} • ${book.copies || 1} Boks • Status: ${book.status}`,
                    book: book,
                    rack: rack,
                    room: room,
                    floor_id: room?.floor_id,
                    pitch: rack.pitch || 0,
                    yaw: rack.yaw || 0,
                    target_x: rack.map_x || room?.map_x,
                    target_y: rack.map_y || room?.map_y
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
                return {
                    success: false,
                    error: `Login Supabase Auth gagal: ${err.message || 'Surel atau kata sandi tidak terdaftar di Authentication -> Users Supabase.'}`
                };
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
        safeStorage.removeItem('disarpus_floors');
        safeStorage.removeItem('disarpus_rooms');
        safeStorage.removeItem('disarpus_racks');
        safeStorage.removeItem('disarpus_books');
        safeStorage.removeItem('disarpus_data_ver');
        window.location.reload();
    }
};

window.DataService = DataService;

