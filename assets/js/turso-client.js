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
    // TEMPELKAN TOKEN TURSO (READ-ONLY) ANDA DI BAWAH INI (Di dalam tanda petik '')
    // Contoh: const DEFAULT_TURSO_TOKEN = 'eyJhbGciOi...';
    // =========================================================================
    const DEFAULT_TURSO_TOKEN = '';

    function getStoredConfig() {
        let url = '';
        let token = '';
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                url = window.localStorage.getItem('disarpus_turso_url') || '';
                token = window.localStorage.getItem('disarpus_turso_token') || '';
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

        if (!url || !token) {
            throw new Error('Kredensial Turso Database belum disetel (URL atau Auth Token kosong).');
        }

        const endpoint = `${url}/v2/pipeline`;
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

        const data = await res.json();
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
