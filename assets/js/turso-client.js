/**
 * TURSO / LIBSQL CLIENT & DATA ADAPTER
 * Sistem Informasi Denah Interaktif & Tur Panorama Fasilitas
 * Dinas Kearsipan dan Perpustakaan Kabupaten Cirebon
 * 
 * Berjalan langsung di peramban via protokol resmi Turso / Hrana HTTP (v2/pipeline).
 * Mendukung pembacaan & penyimpanan data relasional instan ke SQLite Edge Turso.
 */

const TursoClient = (() => {
    const DEFAULT_TURSO_URL = 'libsql://denaharsip-camelinurazizah.aws-ap-southeast-1.turso.io';

    // =========================================================================
    // TEMPELKAN TOKEN TURSO (FULL ACCESS READ & WRITE) DI BAWAH INI
    // =========================================================================
    const DEFAULT_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTUzMjA1OTEsImlkIjoiMDFhMWU4OTEtNDgwMS03OTc5LThlZjItODU1YjZjMGZkOTkxIiwia2lkIjoiaFBuOFloLV9QZHU4d3B5LUFZdUdNZ3RDVnVJT2gzWlRTa0JQMTVDeVpxWSIsInJpZCI6IjdhODk1NTQ1LTc3NTctNDFjMy04ZmNmLTdlZDJlM2JiNzRjYiJ9.HO8j2VEXSXBDvk8eijqfMVl4JmuPBvtNhMu7MF3I2qpajs17nhiOhd1mllriGnlnm88spzrwlnkTDMgnDlpKCQ';

    function getStoredConfig() {
        let url = '';
        let token = '';
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                url = window.localStorage.getItem('disarpus_turso_url') || '';
                token = window.localStorage.getItem('disarpus_turso_token') || '';
                // Jika token di localStorage ternyata sisa token lama yang read-only ("ro"), bersihkan otomatis
                if (token && token.includes('eyJhIjoicm8i')) {
                    window.localStorage.removeItem('disarpus_turso_token');
                    token = '';
                }
            }
        } catch (e) { }
        return {
            url: (url || DEFAULT_TURSO_URL).trim(),
            token: (token || DEFAULT_TURSO_TOKEN).trim()
        };
    }

    function saveConfig(url, token) {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('disarpus_turso_url', (url || '').trim());
                window.localStorage.setItem('disarpus_turso_token', (token || '').trim());
            }
        } catch (e) { }
    }

    function normalizeUrl(rawUrl) {
        if (!rawUrl) return '';
        let clean = String(rawUrl).trim();
        if (clean.startsWith('libsql://')) {
            clean = 'https://' + clean.slice('libsql://'.length);
        }
        return clean.replace(/\/+$/, '');
    }

    function isConfigured() {
        const { url, token } = getStoredConfig();
        return Boolean(url && token);
    }

    function formatArg(val) {
        if (val === null || val === undefined) return { type: 'null' };
        if (typeof val === 'number') {
            if (Number.isInteger(val)) return { type: 'integer', value: String(val) };
            return { type: 'float', value: val };
        }
        if (typeof val === 'boolean') return { type: 'integer', value: val ? '1' : '0' };
        return { type: 'text', value: String(val) };
    }

    function parseResult(result) {
        if (!result || !result.cols || !result.rows) return [];
        const colNames = result.cols.map(c => c.name);
        return result.rows.map(row => {
            const obj = {};
            row.forEach((cell, idx) => {
                const col = colNames[idx];
                if (!cell || cell.type === 'null') {
                    obj[col] = null;
                } else if (cell.type === 'integer') {
                    obj[col] = parseInt(cell.value, 10);
                } else if (cell.type === 'float') {
                    obj[col] = parseFloat(cell.value);
                } else {
                    obj[col] = cell.value;
                }
            });
            return obj;
        });
    }

    async function execute(sql, args = [], customConfig = null) {
        const conf = customConfig || getStoredConfig();
        const url = normalizeUrl(conf.url);
        const token = conf.token;

        const payload = {
            requests: [
                {
                    type: 'execute',
                    stmt: {
                        sql: sql,
                        args: args.map(formatArg)
                    }
                },
                { type: 'close' }
            ]
        };

        let data = null;
        let usedServerless = false;

        // 1. Jalur Utama: Serverless API Vercel (/api/turso) jika online di web/Vercel
        if (!customConfig && typeof window !== 'undefined' && window.location && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
            try {
                const apiRes = await fetch('/api/turso', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (apiRes.ok) {
                    data = await apiRes.json();
                    usedServerless = true;
                }
            } catch (proxyErr) {
                // Abaikan jika endpoint serverless tidak aktif di live server lokal
            }
        }

        // 2. Jalur Cadangan: Pemanggilan langsung Turso HTTP pipeline (untuk localhost & offline support)
        if (!usedServerless) {
            if (!url || !token) {
                throw new Error('Kredensial Turso Database belum disetel (URL atau Auth Token kosong).');
            }

            const endpoint = `${url}/v2/pipeline`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Turso HTTP ${res.status}: ${errText}`);
            }

            data = await res.json();
        }

        const first = data.results && data.results[0];
        if (first && first.type === 'error') {
            throw new Error(`Turso SQL Error: ${first.error?.message || JSON.stringify(first.error)}`);
        }

        const execResult = first?.response?.result;
        return {
            rows: parseResult(execResult),
            affectedRowCount: execResult?.affected_row_count || 0,
            lastInsertRowid: execResult?.last_insert_rowid || null
        };
    }

    async function testConnection(url, token) {
        try {
            const targetUrl = normalizeUrl(url || getStoredConfig().url);
            const targetToken = (token || getStoredConfig().token).trim();
            if (!targetUrl || !targetToken) {
                return { connected: false, message: 'URL atau Token masih kosong.' };
            }
            const res = await execute('SELECT 1 as ping, datetime(\'now\') as server_time;', [], { url: targetUrl, token: targetToken });
            return {
                connected: true,
                serverTime: res.rows[0]?.server_time,
                message: 'Koneksi ke Turso Database berhasil aktif!'
            };
        } catch (err) {
            return {
                connected: false,
                message: err.message
            };
        }
    }

    return {
        getConfig: getStoredConfig,
        saveConfig,
        normalizeUrl,
        isConfigured,
        execute,
        testConnection
    };
})();

if (typeof window !== 'undefined') {
    window.TursoClient = TursoClient;
}
