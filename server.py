"""
Server Web Lokal Otomatis - Disarpus Kab. Cirebon
Mendukung port fallback otomatis jika port 8000 sedang terpakai,
sehingga terminal tidak menampilkan error WinError 10048 / port in use.
"""

import http.server
import socketserver
import webbrowser
import sys
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

DEFAULT_PORT = 8000
MAX_PORT_ATTEMPTS = 10

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    """Handler HTTP sederhana dengan pesan log bersih tanpa error 404 berlebih"""
    def log_message(self, format, *args):
        # Sembunyikan log normal agar terminal tetap bersih dan rapi
        if args and len(args) >= 2 and str(args[1]) in ('200', '304'):
            return
        super().log_message(format, *args)

def find_open_port(start_port):
    import socket
    for port in range(start_port, start_port + MAX_PORT_ATTEMPTS):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('0.0.0.0', port))
                return port
            except OSError:
                continue
    return None

def main():
    port = find_open_port(DEFAULT_PORT)
    if not port:
        print(f"[ERROR] Port {DEFAULT_PORT} sampai {DEFAULT_PORT + MAX_PORT_ATTEMPTS} sedang digunakan.")
        sys.exit(1)

    url = f"http://localhost:{port}/index.html"
    print("=" * 70)
    print("   SISTEM INFORMASI DENAH INTERAKTIF & TUR PANORAMA FASILITAS")
    print("   Dinas Kearsipan dan Perpustakaan Kabupaten Cirebon")
    print("=" * 70)
    print(f"\n[OK] Server aktif di: http://localhost:{port}")
    print(f"[OK] Membuka peramban ke: {url}")
    print("\nPetunjuk Admin:")
    print("  - Email    : admin@disarpus.cirebonkab.go.id")
    print("  - Password : admin123")
    print("\nTekan Ctrl + C di terminal ini untuk menghentikan server.\n" + "-" * 70)

    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        with socketserver.TCPServer(("", port), QuietHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[OK] Server dihentikan dengan aman. Sampai jumpa!")
    except Exception as e:
        print(f"\n[ERROR] Server berhenti: {e}")

if __name__ == "__main__":
    main()
