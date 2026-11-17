/**
 * Server Web Lokal Otomatis - Disarpus Kab. Cirebon
 * Berbasis JavaScript / Node.js (Murni tanpa dependensi eksternal)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const ROOT_DIR = __dirname;
const DEFAULT_PORT = 8000;
const MAX_ATTEMPTS = 10;

function getLanIpAddresses() {
  const interfaces = os.networkInterfaces();
  const candidates = [];
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!Array.isArray(addrs)) continue;
    for (const info of addrs) {
      if (info.family !== 'IPv4' || info.internal) continue;
      if (info.address.startsWith('169.254.')) continue;

      const isVirtualName = /vethernet|wsl|virtualbox|vbox|vmware|docker|hyper-v|loopback|tailscale|zerotier/i.test(name);
      const isVirtualSubnet = /^192\.168\.56\./.test(info.address);
      const isVirtual = isVirtualName || isVirtualSubnet;

      let priority = 0;
      if (isVirtual) priority -= 100;
      else if (/^wi-?fi|wlan|wireless/i.test(name)) priority += 50;
      else if (/^ethernet/i.test(name)) priority += 20;

      candidates.push({ address: info.address, name, isVirtual, priority });
    }
  }
  candidates.sort((a, b) => b.priority - a.priority);
  const realAdapters = candidates.filter(c => !c.isVirtual);
  return (realAdapters.length > 0 ? realAdapters : candidates).map(c => c.address);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.sql': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function startServer(port, attempt = 0) {
  if (attempt >= MAX_ATTEMPTS) {
    console.error(`[ERROR] Port ${DEFAULT_PORT} sampai ${DEFAULT_PORT + MAX_ATTEMPTS} sedang terpakai.`);
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    // Bersihkan query string dan decode URL
    let safeUrl = decodeURI(req.url.split('?')[0]);
    if (safeUrl === '/api/network-info') {
      const lanIps = getLanIpAddresses();
      const lanUrls = lanIps.map(ip => `http://${ip}:${port}/index.html`);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify({
        port,
        primaryLanIp: lanIps[0] || null,
        primaryLanUrl: lanUrls[0] || null,
        lanUrls
      }));
      return;
    }

    if (safeUrl === '/' || safeUrl === '') {
      safeUrl = '/index.html';
    }

    const filePath = path.normalize(path.join(ROOT_DIR, safeUrl));

    // Cegah path traversal ke luar root direktori
    if (!filePath.startsWith(ROOT_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Akses Ditolak');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Berkas tidak ditemukan: ' + safeUrl);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });

      fs.createReadStream(filePath).pipe(res);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      startServer(port + 1, attempt + 1);
    } else {
      console.error('[ERROR]', err.message);
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}/index.html`;
    const lanIps = getLanIpAddresses();
    const lanUrl = lanIps[0] ? `http://${lanIps[0]}:${port}/index.html` : null;
    console.log('='.repeat(70));
    console.log('   SISTEM INFORMASI DENAH INTERAKTIF & TUR PANORAMA FASILITAS');
    console.log('   Dinas Kearsipan dan Perpustakaan Kabupaten Cirebon');
    console.log('='.repeat(70));
    console.log(`\n[OK] Server aktif di   : http://localhost:${port}`);
    console.log(`[OK] Membuka peramban : ${url}`);
    if (lanUrl) {
      console.log(`[OK] Akses HP (1 Wi-Fi): ${lanUrl}`);
    }
    console.log('\nPetunjuk:');
    console.log(' - Halaman Publik : ' + url);
    if (lanUrl) {
      console.log(' - QR / HP (LAN)  : ' + lanUrl);
    }
    console.log(` - Panel Admin    : http://localhost:${port}/admin.html`);
    console.log(' - Tekan Ctrl + C di terminal ini untuk mematikan server.\n');

    // Buka browser otomatis di Windows
    const startCmd = process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${startCmd} "" "${url}"`);
  });
}

// Tangani penutupan bersih dengan Ctrl+C
process.on('SIGINT', () => {
  console.log('\n[INFO] Server dimatikan dengan aman. Sampai jumpa!');
  process.exit(0);
});

startServer(DEFAULT_PORT);

