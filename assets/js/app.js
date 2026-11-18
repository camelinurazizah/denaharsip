/**
 * LOGIKA UTAMA APLIKASI WEB PENGUNJUNG / PEMUSTAKA
 * Sistem Informasi Denah Interaktif dan Tur Panorama Fasilitas
 * Dinas Kearsipan dan Perpustakaan Kabupaten Cirebon
 * 
 * Sesuai Dokumen SRS & Makalah Perancangan Sistem:
 * - SRS-FR-01: Pemilihan Gedung (Perpustakaan / Kearsipan)
 * - SRS-FR-02: Pemilihan Lantai (Lantai 1 / Lantai 2)
 * - SRS-FR-03: Render Pin Denah 2D Interaktif
 * - SRS-FR-04 & SRS-FR-05: Pencarian Cepat Multi-Entitas & Navigasi Otomatis
 * - SRS-FR-06: Modal Dokumentasi Ruangan (Ruang PA)
 * - SRS-FR-07: Modal Dokumentasi & Katalog Rak Buku (Rak 03 Babad)
 * - SRS-FR-08 & SRS-FR-09: Tur Panorama Silinder Pannellum JS
 * - SRS-FR-10: Autentikasi Admin Satu Pintu
 */

document.addEventListener('DOMContentLoaded', async () => {
    // State Aplikasi (Fokus Khusus Gedung Kearsipan: Lantai 1 & Lantai 2)
    const appState = {
        currentBuilding: 'Kearsipan',
        currentFloorNumber: 1,           // 1 atau 2
        currentFloor: null,
        currentRoom: null,
        floors: [],
        rooms: [],
        racks: [],
        activePinId: null,
        mapZoom: 1,
        mapPanX: 0,
        mapPanY: 0,
        isDraggingMap: false,
        dragStartX: 0,
        dragStartY: 0,
        viewMode: 'split', // 'split', 'map-only', 'pano-only'
        mapLayer: 'vector' // 'vector' atau 'blueprint'
    };

    // Objek Pannellum Viewer Instance
    let pannellumViewer = null;

    // Elemen DOM
    const elFloor1Btn = document.getElementById('btn-floor-1');
    const elFloor2Btn = document.getElementById('btn-floor-2');
    const elMapLocationTitle = document.getElementById('map-location-title');
    const elMapLocationSub = document.getElementById('map-location-sub');
    const elSubbarLocation = document.getElementById('subbar-location');
    const elMapImage = document.getElementById('map-image');
    const elMapPinsLayer = document.getElementById('map-pins-layer');
    const elMapStage = document.getElementById('map-stage');
    const elMapContainer = document.getElementById('map-container');
    const elSearchInput = document.getElementById('search-input');
    const elSearchClearBtn = document.getElementById('search-clear-btn');
    const elSearchResultsDropdown = document.getElementById('search-results-dropdown');
    const elViewModeSplit = document.getElementById('view-mode-split');
    const elViewModeMap = document.getElementById('view-mode-map');
    const elViewModePano = document.getElementById('view-mode-pano');
    const elMainWorkspace = document.getElementById('main-workspace');
    const elPanoTitle = document.getElementById('pano-title');
    const elPanoSubtitle = document.getElementById('pano-subtitle');
    const elBtnLayerVector = document.getElementById('btn-layer-vector');
    const elBtnLayerBlueprint = document.getElementById('btn-layer-blueprint');

    // Modal Elemen
    const modalRoom = document.getElementById('modal-room');
    const modalRack = document.getElementById('modal-rack');
    const modalLogin = document.getElementById('modal-login');
    const modalQr = document.getElementById('modal-qr');
    const btnAksesPetugas = document.getElementById('btn-akses-petugas');

    // Inisialisasi awal
    await initApplication();

    async function initApplication() {
        try {
            // Ambil seluruh data lantai Gedung Kearsipan (Lantai 1 & Lantai 2)
            appState.floors = await DataService.getFloors('Kearsipan');

            // Cek URL params untuk deeplinking / kiosk
            const urlParams = new URLSearchParams(window.location.search);
            const initialBuilding = 'Kearsipan';
            const initialFloor = parseInt(urlParams.get('floor') || '1', 10);
            const initialLayer = urlParams.get('layer') || 'vector';

            if (initialLayer === 'blueprint') {
                appState.mapLayer = 'blueprint';
                elBtnLayerBlueprint?.classList.add('active');
                elBtnLayerVector?.classList.remove('active');
            }
            
            // Set default view sesuai URL atau Gedung Kearsipan - Lantai 1
            await switchBuildingAndFloor(initialBuilding, initialFloor, false);

            // Pasang event listeners navigasi
            setupEventListeners();

            // Cek status sesi login admin untuk tombol
            updateAdminButtonState();

            // Cek apakah ada target room dari URL
            const roomId = urlParams.get('room');
            if (roomId) {
                const targetRoom = appState.rooms.find(r => Number(r.id) === Number(roomId));
                if (targetRoom) {
                    loadRoomPanorama(targetRoom);
                    highlightPin('room', targetRoom.id);
                }
            }

            // Atur mode tampilan bawaan khusus layar HP (Denah 2D Penuh, ramah sentuhan)
            if (window.innerWidth <= 768) {
                setViewMode('map-only');
            }

            showToast('Selamat Datang di Visual Archive Locator — Gedung Kearsipan Disarpus Kab. Cirebon', 'success');
        } catch (err) {
            console.error('Error saat inisialisasi aplikasi:', err);
        }
    }

    // =========================================================================
    // NAVIGASI LANTAI GEDUNG KEARSIPAN (SRS-FR-02)
    // =========================================================================
    async function switchBuildingAndFloor(building, floorNumber, autoOpenFirstRoom = true, autoLoadPano = true) {
        appState.currentBuilding = 'Kearsipan';
        appState.currentFloorNumber = Number(floorNumber) === 2 ? 2 : 1;

        // Update tombol UI Lantai
        if (appState.currentFloorNumber === 1) {
            elFloor1Btn?.classList.add('active');
            elFloor2Btn?.classList.remove('active');
        } else {
            elFloor2Btn?.classList.add('active');
            elFloor1Btn?.classList.remove('active');
        }

        // Cari data lantai yang cocok di Gedung Kearsipan
        const floor = appState.floors.find(f => 
            Number(f.floor_number) === appState.currentFloorNumber
        ) || appState.floors[0];

        if (!floor) return;
        appState.currentFloor = floor;

        // Perbarui teks keterangan denah & subbar (ringkas & informatif agar header ramping)
        elMapLocationTitle.textContent = `GEDUNG KEARSIPAN — LANTAI ${appState.currentFloorNumber}`;
        const shortDesc = floor.name ? floor.name.replace(/^Lantai \d+\s*[-–—]\s*/, '') : (floor.description || `Peta tata ruang lantai ${appState.currentFloorNumber}`);
        elMapLocationSub.textContent = shortDesc;
        elMapLocationSub.title = floor.description || shortDesc;
        if (elSubbarLocation) {
            elSubbarLocation.textContent = `Gedung Kearsipan — Lantai ${appState.currentFloorNumber}`;
        }

        // Muat gambar denah 2D
        const targetMapSrc = (appState.mapLayer === 'blueprint' && floor.blueprint_image_url) ? floor.blueprint_image_url : floor.map_image_url;
        elMapImage.onload = fitMapStageToContainer;
        elMapImage.src = targetMapSrc;
        if (elMapImage.complete) fitMapStageToContainer();

        // Reset zoom & pan denah
        resetMapTransform();

        // Muat ruangan dan rak pada lantai ini
        appState.rooms = await DataService.getRoomsByFloor(floor.id);
        
        // Ambil rak untuk semua ruangan di lantai ini
        const racksPromises = appState.rooms.map(r => DataService.getRacksByRoom(r.id));
        const racksArrays = await Promise.all(racksPromises);
        appState.racks = racksArrays.flat();

        // Render pin merah interaktif pada denah 2D (SRS-FR-03)
        renderMapPins();

        // Muat panorama ruangan pertama pada lantai ini (atau ruangan yang aktif)
        if (autoLoadPano && appState.rooms.length > 0) {
            const targetRoom = autoOpenFirstRoom ? appState.rooms[0] : (appState.currentRoom || appState.rooms[0]);
            loadRoomPanorama(targetRoom);
        }
    }

    function createMapPinElement({ id, type, x, y, title, label, onClick }) {
        const pin = document.createElement('div');
        pin.className = `map-pin pin-${type}`;
        pin.id = `pin-${type}-${id}`;
        pin.style.left = `${x}%`;
        pin.style.top = `${y}%`;
        pin.setAttribute('data-id', id);
        pin.setAttribute('data-type', type);
        pin.title = title;

        const badge = document.createElement('div');
        badge.className = 'map-pin-badge';

        const beacon = document.createElement('span');
        beacon.className = 'map-pin-beacon';
        const pulse = document.createElement('span');
        pulse.className = 'map-pin-pulse';
        beacon.appendChild(pulse);

        const textSpan = document.createElement('span');
        textSpan.className = 'map-pin-label';
        textSpan.textContent = label;

        badge.appendChild(beacon);
        badge.appendChild(textSpan);
        pin.appendChild(badge);

        pin.addEventListener('click', (e) => {
            e.stopPropagation();
            onClick();
        });

        return pin;
    }

    // =========================================================================
    // RENDER PIN MERAH & EMAS PADA DENAH 2D (SRS-FR-03)
    // =========================================================================
    function renderMapPins() {
        elMapPinsLayer.innerHTML = '';

        // 1. Render Pin Ruangan (Merah Pill Badge Estetik)
        appState.rooms.forEach(room => {
            const pin = createMapPinElement({
                id: room.id,
                type: 'room',
                x: room.map_x,
                y: room.map_y,
                title: room.name,
                label: room.short_name || room.name,
                onClick: () => {
                    loadRoomPanorama(room);
                    openRoomModal(room);
                }
            });
            elMapPinsLayer.appendChild(pin);
        });

        // 2. Render Pin Rak Spesifik (Emas Pill Badge) jika memiliki koordinat map_x & map_y
        appState.racks.forEach(rack => {
            if (rack.map_x && rack.map_y) {
                const pin = createMapPinElement({
                    id: rack.id,
                    type: 'rack',
                    x: rack.map_x,
                    y: rack.map_y,
                    title: rack.title,
                    label: rack.short_title || rack.title,
                    onClick: () => {
                        const parentRoom = appState.rooms.find(r => Number(r.id) === Number(rack.room_id));
                        if (parentRoom && (!appState.currentRoom || Number(appState.currentRoom.id) !== Number(parentRoom.id))) {
                            loadRoomPanorama(parentRoom, rack.pitch, rack.yaw);
                        } else if (pannellumViewer) {
                            try { pannellumViewer.lookAt(rack.pitch, rack.yaw, 90, 800); } catch (err) {}
                        }
                        openRackModal(rack);
                    }
                });
                elMapPinsLayer.appendChild(pin);
            }
        });
    }

    // Sorot Pin tertentu dengan efek visual
    function highlightPin(type, id) {
        document.querySelectorAll('.map-pin').forEach(p => p.classList.remove('active-highlight'));
        const targetPin = document.getElementById(`pin-${type}-${id}`);
        if (targetPin) {
            targetPin.classList.add('active-highlight');
            targetPin.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            setTimeout(() => {
                targetPin.classList.remove('active-highlight');
            }, 5000);
        }
    }

    // =========================================================================
    // TUR PANORAMA SILINDER INTERAKTIF PANNELLUM JS (SRS-FR-08 & SRS-FR-09)
    // =========================================================================
    function loadRoomPanorama(room, targetPitch = 0, targetYaw = 0) {
        if (!room) return;
        appState.currentRoom = room;

        // Update teks info bar panorama & sub-header
        elPanoTitle.textContent = room.name;
        elPanoSubtitle.textContent = `Gedung Kearsipan — Lantai ${appState.currentFloorNumber}`;
        if (elSubbarLocation) {
            elSubbarLocation.textContent = `Gedung Kearsipan — Lantai ${appState.currentFloorNumber} (${room.name})`;
        }

        // Tentukan URL Panorama (Prioritaskan foto kustom hasil upload admin, fallback ke PANORAMA_DATA bebas CORS)
        let panoUrl = typeof resolvePanoramaUrl === 'function'
            ? resolvePanoramaUrl(room.panorama_image_url)
            : room.panorama_image_url;

        // Siapkan daftar hotspots lemari/rak depo arsip untuk ruangan ini
        DataService.getRacksByRoom(room.id).then(racks => {
            const hotspots = racks.map(rack => ({
                pitch: Number(rack.pitch) || 0,
                yaw: Number(rack.yaw) || 0,
                cssClass: 'pnlm-custom-hotspot',
                createTooltipFunc: (hotSpotDiv, args) => {
                    const pill = document.createElement('div');
                    pill.className = 'hotspot-marker-pill';
                    pill.title = args.fullText;
                    const icon = document.createElement('span');
                    icon.textContent = '🗄️';
                    const label = document.createElement('span');
                    label.textContent = args.label;
                    pill.appendChild(icon);
                    pill.appendChild(label);
                    hotSpotDiv.appendChild(pill);
                },
                createTooltipArgs: {
                    label: rack.short_title || rack.title,
                    fullText: `${rack.title}${rack.category_code ? ` (${rack.category_code})` : ''}`
                },
                clickHandlerFunc: () => {
                    openRackModal(rack);
                }
            }));

            // Hancurkan viewer lama jika ada
            if (pannellumViewer) {
                try { pannellumViewer.destroy(); } catch (e) {}
            }

            // Inisialisasi Pannellum Viewer Baru (Mode Equirectangular Panorama sesuai SRS)
            let isPannellumLoaded = false;
            try {
                if (typeof pannellum !== 'undefined' && pannellum.viewer) {
                    pannellumViewer = pannellum.viewer('panorama-viewer', {
                        type: 'equirectangular',
                        panorama: panoUrl,
                        autoLoad: true,
                        autoRotate: (targetPitch !== 0 || targetYaw !== 0) ? 0 : -1,
                        compass: false,
                        showZoomCtrl: true,
                        showFullscreenCtrl: true,
                        mouseZoom: true,
                        pitch: targetPitch,
                        yaw: targetYaw,
                        hfov: 100,
                        minHfov: 50,
                        maxHfov: 120,
                        hotSpots: hotspots
                    });

                    pannellumViewer.on('load', () => {
                        isPannellumLoaded = true;
                    });

                    pannellumViewer.on('error', (err) => {
                        console.warn('Pannellum error, aktifkan Fallback Panorama 360:', err);
                        renderFallbackPanorama(room, panoUrl, racks, targetPitch, targetYaw);
                    });

                    // Set focus ke pitch dan yaw jika diarahkan dari pencarian
                    if (targetPitch !== 0 || targetYaw !== 0) {
                        setTimeout(() => {
                            if (pannellumViewer && isPannellumLoaded) {
                                try { pannellumViewer.lookAt(targetPitch, targetYaw, 90, 800); } catch (e) {}
                            }
                        }, 500);
                    }
                } else {
                    renderFallbackPanorama(room, panoUrl, racks, targetPitch, targetYaw);
                }
            } catch (err) {
                console.warn('Pannellum init exception, beralih ke Fallback Panorama 360:', err);
                renderFallbackPanorama(room, panoUrl, racks, targetPitch, targetYaw);
            }
        });
    }

    
    // =========================================================================
    // FALLBACK TUR PANORAMA 360 INTERAKTIF (HTML5 / CSS 360 PAN ENGINE)
    // Berfungsi 100% tanpa WebGL, aman dari batasan CORS file:/// & offline
    // =========================================================================
    let fallbackAnimFrame = null;
    function renderFallbackPanorama(room, panoUrl, racks, targetPitch = 0, targetYaw = 0) {
        if (fallbackAnimFrame) {
            cancelAnimationFrame(fallbackAnimFrame);
            fallbackAnimFrame = null;
        }

        const container = document.getElementById('panorama-viewer');
        if (!container) return;

        container.innerHTML = `
            <div id="fallback-pano-wrapper" class="fallback-pano-wrapper">
                <div id="fallback-pano-canvas" class="fallback-pano-canvas" style="background-image: url('${panoUrl}');"></div>
                <div id="fallback-hotspots-layer" class="fallback-hotspots-layer"></div>
                <div class="fallback-pano-badge"><span>🌐</span> Tur 360° Interaktif</div>
            </div>
        `;

        const wrapper = document.getElementById('fallback-pano-wrapper');
        const canvas = document.getElementById('fallback-pano-canvas');
        const hotspotsLayer = document.getElementById('fallback-hotspots-layer');

        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let currentYaw = targetYaw || 0;
        let currentPitch = targetPitch || 0;
        let autoRotate = true;

        function updatePanoView() {
            if (!wrapper || !canvas) return;
            const w = wrapper.clientWidth || 600;
            const pxPerDeg = w / 90;
            const bgX = (currentYaw * pxPerDeg);
            const bgY = Math.max(15, Math.min(85, 50 + (currentPitch * 0.8)));

            canvas.style.backgroundPosition = `${bgX}px ${bgY}%`;

            // Posisi titik hotspot rak
            if (hotspotsLayer) {
                hotspotsLayer.innerHTML = '';
                if (racks && racks.length > 0) {
                    racks.forEach(rack => {
                        let relAngle = (rack.yaw - currentYaw) % 360;
                        if (relAngle < -180) relAngle += 360;
                        if (relAngle > 180) relAngle -= 360;

                        if (Math.abs(relAngle) <= 50) {
                            const posX = ((relAngle + 50) / 100) * 100;
                            const posY = Math.max(20, Math.min(80, 50 - (rack.pitch || 0) * 2 - (currentPitch * 0.5)));

                            const btn = document.createElement('button');
                            btn.className = 'fallback-hotspot-btn';
                            btn.style.left = `${posX}%`;
                            btn.style.top = `${posY}%`;
                            btn.title = rack.title;
                            btn.innerHTML = `<span class="hotspot-pulse"></span><span class="hotspot-label">🗄️ ${rack.title}</span>`;
                            btn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                openRackModal(rack);
                            });
                            hotspotsLayer.appendChild(btn);
                        }
                    });
                }
            }
        }

        updatePanoView();

        function step() {
            if (autoRotate && !isDragging) {
                currentYaw = (currentYaw - 0.08) % 360;
                updatePanoView();
            }
            fallbackAnimFrame = requestAnimationFrame(step);
        }
        fallbackAnimFrame = requestAnimationFrame(step);

        wrapper.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            wrapper.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            startX = e.clientX;
            startY = e.clientY;

            currentYaw -= dx * 0.25;
            currentPitch = Math.max(-25, Math.min(25, currentPitch + dy * 0.2));
            updatePanoView();
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                if (wrapper) wrapper.style.cursor = 'grab';
            }
        });

        // Touch support
        wrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }
        }, { passive: true });

        wrapper.addEventListener('touchmove', (e) => {
            if (!isDragging || e.touches.length !== 1) return;
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;

            currentYaw -= dx * 0.35;
            currentPitch = Math.max(-25, Math.min(25, currentPitch + dy * 0.25));
            updatePanoView();
        }, { passive: true });

        wrapper.addEventListener('touchend', () => {
            isDragging = false;
        });

        // Tombol Hadap Depan fallback
        const btnFront = document.getElementById('btn-pano-front');
        if (btnFront) {
            btnFront.onclick = () => {
                currentYaw = 0;
                currentPitch = 0;
                updatePanoView();
                if (pannellumViewer) {
                    try { pannellumViewer.setPitch(0); pannellumViewer.setYaw(0); } catch (e) {}
                }
            };
        }
    }

    // =========================================================================
    // MODAL DOKUMENTASI RUANGAN (SRS-FR-06: Ruang PA)
    // =========================================================================
    function openRoomModal(room) {
        const roomPhotoSrc = room.room_photo_url || (typeof resolvePanoramaUrl === 'function' ? resolvePanoramaUrl(room.panorama_image_url) : room.panorama_image_url);
        document.getElementById('modal-room-title').textContent = room.name;
        document.getElementById('modal-room-location').textContent = `Gedung Kearsipan — Lantai ${appState.currentFloorNumber}`;
        document.getElementById('modal-room-image').src = roomPhotoSrc;
        document.getElementById('modal-room-nearby').textContent = room.nearby_notes || 'Informasi patokan posisi belum diisi.';
        document.getElementById('modal-room-services').textContent = room.services_info || 'Layanan administrasi tersedia sesuai jam operasional dinas.';

        const roomHeroEl = document.getElementById('room-modal-hero');
        if (roomHeroEl) {
            roomHeroEl.onclick = (e) => {
                if (e.target.closest('.modal-close-btn')) return;
                openPhotoLightbox(roomPhotoSrc, room.name);
            };
        }

        // Tombol Buka Tur Panorama Ruangan
        const btnOpenPano = document.getElementById('btn-modal-open-pano');
        btnOpenPano.onclick = () => {
            closeModal(modalRoom);
            if (window.innerWidth <= 768) {
                setViewMode('pano-only');
            } else if (appState.viewMode === 'map-only') {
                setViewMode('split');
            }
            loadRoomPanorama(room);
            highlightPin('room', room.id);
        };

        // Muat daftar titik rak / lemari arsip di dalam ruangan ini
        const racksBlock = document.getElementById('modal-room-racks-block');
        const racksListEl = document.getElementById('modal-room-racks-list');
        if (racksBlock && racksListEl) {
            racksBlock.style.display = 'none';
            racksListEl.innerHTML = '';
            DataService.getRacksByRoom(room.id).then(racks => {
                if (!racks || racks.length === 0) return;
                racksBlock.style.display = 'flex';
                racks.forEach(rack => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'room-rack-item-btn';

                    const leftDiv = document.createElement('div');
                    leftDiv.style.display = 'flex';
                    leftDiv.style.flexDirection = 'column';
                    leftDiv.style.gap = '2px';

                    const titleSpan = document.createElement('span');
                    titleSpan.style.fontWeight = '700';
                    titleSpan.style.fontSize = '0.84rem';
                    titleSpan.style.color = '#92400e';
                    titleSpan.textContent = `🗄️ ${rack.title}`;

                    const noteSpan = document.createElement('span');
                    noteSpan.style.fontSize = '0.74rem';
                    noteSpan.style.color = '#64748b';
                    noteSpan.textContent = rack.location_notes || (rack.category_code ? `Kode Klasifikasi: ${rack.category_code}` : 'Klik untuk lihat daftar boks arsip & arahkan kamera 360°');

                    leftDiv.appendChild(titleSpan);
                    leftDiv.appendChild(noteSpan);

                    const rightSpan = document.createElement('span');
                    rightSpan.style.fontSize = '0.75rem';
                    rightSpan.style.fontWeight = '700';
                    rightSpan.style.color = '#d97706';
                    rightSpan.textContent = 'Lihat Boks →';

                    btn.appendChild(leftDiv);
                    btn.appendChild(rightSpan);

                    btn.addEventListener('click', () => {
                        closeModal(modalRoom);
                        loadRoomPanorama(room, rack.pitch, rack.yaw);
                        openRackModal(rack);
                    });

                    racksListEl.appendChild(btn);
                });
            });
        }

        openModal(modalRoom);
        highlightPin('room', room.id);
    }

    // =========================================================================
    // MODAL DOKUMENTASI & INVENTARIS LEMARI / RAK DEPO ARSIP (SRS-FR-07)
    // =========================================================================
    function getArchiveStatusClass(status) {
        const s = (status || '').toLowerCase();
        if (s.includes('dipinjam')) return 'status-borrowed';
        if (s.includes('terbatas') || s.includes('baca di tempat')) return 'status-restricted';
        return 'status-open';
    }

    async function openRackModal(rack) {
        const rackPhotoSrc = rack.rack_photo_url || 'assets/images/depo-arsip-front.jpg';
        document.getElementById('modal-rack-title').textContent = rack.title;
        document.getElementById('modal-rack-ddc').textContent = rack.category_code || 'ARS-Umum';
        document.getElementById('modal-rack-image').src = rackPhotoSrc;
        document.getElementById('modal-rack-location').textContent = rack.location_notes || 'Patokan lorong & baris/shaf pada ruang depo arsip.';

        const rackHeroEl = document.getElementById('rack-modal-hero');
        if (rackHeroEl) {
            rackHeroEl.onclick = (e) => {
                if (e.target.closest('.modal-close-btn')) return;
                openPhotoLightbox(rackPhotoSrc, rack.title);
            };
        }

        // Muat daftar inventaris boks & surat arsip di lemari / rak ini
        const books = await DataService.getBooksByRack(rack.id);
        const tbody = document.getElementById('modal-rack-books-tbody');
        const emptyAlert = document.getElementById('modal-rack-books-empty');

        tbody.innerHTML = '';
        if (books.length === 0) {
            emptyAlert.style.display = 'block';
        } else {
            emptyAlert.style.display = 'none';
            books.forEach((book, idx) => {
                const tr = document.createElement('tr');
                const statusText = book.status || 'Arsip Terbuka';
                const statusClass = getArchiveStatusClass(statusText);
                tr.innerHTML = `
                    <td style="font-weight:700;color:#0f172a;">${idx + 1}. ${book.title}</td>
                    <td>${book.author || '-'}</td>
                    <td style="text-align:center;">${book.publish_year || '-'}</td>
                    <td style="text-align:center;font-weight:700;">${book.copies} Boks</td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Search filter di dalam modal rak
        const filterInput = document.getElementById('modal-rack-search-books');
        if (filterInput) {
            filterInput.value = '';
            filterInput.oninput = (e) => {
                const term = e.target.value.toLowerCase();
                const rows = tbody.querySelectorAll('tr');
                rows.forEach(r => {
                    const text = r.textContent.toLowerCase();
                    r.style.display = text.includes(term) ? '' : 'none';
                });
            };
        }

        // Tombol Lihat dalam Panorama
        const btnViewInPano = document.getElementById('btn-modal-rack-in-pano');
        btnViewInPano.onclick = () => {
            closeModal(modalRack);
            if (window.innerWidth <= 768) {
                setViewMode('pano-only');
            } else if (appState.viewMode === 'map-only') {
                setViewMode('split');
            }
            const parentRoom = appState.rooms.find(r => Number(r.id) === Number(rack.room_id)) || appState.currentRoom;
            loadRoomPanorama(parentRoom, rack.pitch, rack.yaw);
            highlightPin('rack', rack.id);
        };

        openModal(modalRack);
        highlightPin('rack', rack.id);
    }

    // =========================================================================
    // PENCARIAN CEPAT LINTAS GEDUNG (LIVE SEARCH SRS-FR-04 & SRS-FR-05)
    // =========================================================================
    let searchDebounceTimer = null;

    elSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length > 0) {
            elSearchClearBtn.style.display = 'block';
        } else {
            elSearchClearBtn.style.display = 'none';
            elSearchResultsDropdown.style.display = 'none';
            return;
        }

        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(async () => {
            const results = await DataService.searchAll(query);
            renderSearchResults(results);
        }, 200);
    });

    elSearchClearBtn.addEventListener('click', () => {
        elSearchInput.value = '';
        elSearchClearBtn.style.display = 'none';
        elSearchResultsDropdown.style.display = 'none';
    });

    function renderSearchResults(results) {
        elSearchResultsDropdown.innerHTML = '';
        if (results.length === 0) {
            elSearchResultsDropdown.innerHTML = `
                <div class="search-no-results">
                    <p>Tidak ditemukan ruangan, lemari/rak depo arsip, atau nomor boks/surat arsip dengan kata kunci tersebut.</p>
                </div>
            `;
            elSearchResultsDropdown.style.display = 'block';
            return;
        }

        // Kelompokkan hasil
        const rooms = results.filter(r => r.type === 'room');
        const racks = results.filter(r => r.type === 'rack');
        const books = results.filter(r => r.type === 'book');

        if (rooms.length > 0) {
            appendSearchGroup('Ruangan Gedung Kearsipan', rooms);
        }
        if (racks.length > 0) {
            appendSearchGroup('Lemari / Rak Depo Arsip', racks);
        }
        if (books.length > 0) {
            appendSearchGroup('Daftar Inventaris Boks & Surat Arsip', books);
        }

        elSearchResultsDropdown.style.display = 'block';
    }

    function appendSearchGroup(title, items) {
        const groupTitle = document.createElement('div');
        groupTitle.className = 'search-result-group-title';
        groupTitle.textContent = title;
        elSearchResultsDropdown.appendChild(groupTitle);

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-result-item';

            let badgeClass = 'badge-room';
            let badgeText = 'Ruangan';
            if (item.type === 'rack') { badgeClass = 'badge-rack'; badgeText = 'Lemari/Rak'; }
            if (item.type === 'book') { badgeClass = 'badge-book'; badgeText = 'Boks/Arsip'; }

            div.innerHTML = `
                <div class="search-result-header">
                    <span class="search-result-title">${item.title}</span>
                    <span class="search-result-badge ${badgeClass}">${badgeText}</span>
                </div>
                <div class="search-result-sub">${item.subtitle}</div>
                <div style="font-size:0.7rem;color:#64748b;margin-top:2px;">${item.description}</div>
            `;

            div.addEventListener('click', async () => {
                elSearchResultsDropdown.style.display = 'none';
                await navigateToSearchResult(item);
            });

            elSearchResultsDropdown.appendChild(div);
        });
    }

    // SRS-FR-05: Navigasi Otomatis dari Hasil Pencarian
    async function navigateToSearchResult(item) {
        const floor = await DataService.getFloorById(item.floor_id);
        if (!floor) return;

        // 1. Pindah ke lantai terkait tanpa memicu loadRoomPanorama ganda
        if (appState.currentFloorNumber !== Number(floor.floor_number)) {
            await switchBuildingAndFloor('Kearsipan', floor.floor_number, false, false);
        }

        // 2. Sorot pin pada denah 2D
        if (item.type === 'room') {
            highlightPin('room', item.id);
            openRoomModal(item.room);
            loadRoomPanorama(item.room);
        } else if (item.type === 'rack') {
            highlightPin('rack', item.id);
            const parentRoom = item.room || appState.rooms.find(r => Number(r.id) === Number(item.rack.room_id));
            loadRoomPanorama(parentRoom, item.pitch || 0, item.yaw || 0);
            openRackModal(item.rack);
        } else if (item.type === 'book') {
            const rack = item.rack;
            if (rack) {
                highlightPin('rack', rack.id);
                const parentRoom = item.room || appState.rooms.find(r => Number(r.id) === Number(rack.room_id));
                loadRoomPanorama(parentRoom, item.pitch || 0, item.yaw || 0);
                openRackModal(rack);
            }
        }

        showToast(`Navigasi ke: ${item.title}`, 'info');
    }

    // Tutup dropdown jika klik di luar
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            elSearchResultsDropdown.style.display = 'none';
        }
    });

    // =========================================================================
    // ZOOM & PAN DENAH 2D (TOUCH & MOUSE FRIENDLY UNTUK DIGITAL KIOSK)
    // =========================================================================
    function updateMapTransform() {
        if (elMapStage) {
            elMapStage.style.transform = `translate(${appState.mapPanX}px, ${appState.mapPanY}px) scale(${appState.mapZoom})`;
        }
    }

    function resetMapTransform() {
        appState.mapZoom = 1;
        appState.mapPanX = 0;
        appState.mapPanY = 0;
        updateMapTransform();
    }

    document.getElementById('btn-map-zoom-in')?.addEventListener('click', () => {
        appState.mapZoom = Math.min(appState.mapZoom + 0.25, 3.0);
        updateMapTransform();
    });

    document.getElementById('btn-map-zoom-out')?.addEventListener('click', () => {
        appState.mapZoom = Math.max(appState.mapZoom - 0.25, 0.75);
        updateMapTransform();
    });

    document.getElementById('btn-map-reset')?.addEventListener('click', resetMapTransform);

    // Mouse Drag untuk Pan Denah
    elMapContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('.map-pin')) return;
        appState.isDraggingMap = true;
        appState.dragStartX = e.clientX - appState.mapPanX;
        appState.dragStartY = e.clientY - appState.mapPanY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!appState.isDraggingMap) return;
        appState.mapPanX = e.clientX - appState.dragStartX;
        appState.mapPanY = e.clientY - appState.dragStartY;
        updateMapTransform();
    });

    window.addEventListener('mouseup', () => {
        appState.isDraggingMap = false;
    });

    // Touch Drag (Pan) & Pinch-to-Zoom untuk Denah di HP / Tablet
    let initialPinchDistance = null;
    let initialZoomOnPinch = 1;

    elMapContainer.addEventListener('touchstart', (e) => {
        if (e.target.closest('.map-pin')) return;
        if (e.touches.length === 1) {
            appState.isDraggingMap = true;
            appState.dragStartX = e.touches[0].clientX - appState.mapPanX;
            appState.dragStartY = e.touches[0].clientY - appState.mapPanY;
            initialPinchDistance = null;
        } else if (e.touches.length === 2) {
            appState.isDraggingMap = false;
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            initialPinchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            initialZoomOnPinch = appState.mapZoom;
        }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && appState.isDraggingMap) {
            e.preventDefault(); // Mencegah scrolling browser saat menggeser denah
            appState.mapPanX = e.touches[0].clientX - appState.dragStartX;
            appState.mapPanY = e.touches[0].clientY - appState.dragStartY;
            updateMapTransform();
        } else if (e.touches.length === 2 && initialPinchDistance) {
            e.preventDefault(); // Mencegah pinch browser bawaan
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
            const scaleFactor = currentDist / initialPinchDistance;
            appState.mapZoom = Math.min(Math.max(initialZoomOnPinch * scaleFactor, 0.75), 3.0);
            updateMapTransform();
        }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            appState.isDraggingMap = false;
            initialPinchDistance = null;
        } else if (e.touches.length === 1) {
            appState.isDraggingMap = true;
            appState.dragStartX = e.touches[0].clientX - appState.mapPanX;
            appState.dragStartY = e.touches[0].clientY - appState.mapPanY;
            initialPinchDistance = null;
        }
    });

    window.addEventListener('touchcancel', () => {
        appState.isDraggingMap = false;
        initialPinchDistance = null;
    });

    // =========================================================================
    // VIEW MODE SWITCHER (SPLIT / DENAH ONLY / PANORAMA ONLY)
    // =========================================================================
    elViewModeSplit?.addEventListener('click', () => setViewMode('split'));
    elViewModeMap?.addEventListener('click', () => setViewMode('map-only'));
    elViewModePano?.addEventListener('click', () => setViewMode('pano-only'));

    function fitMapStageToContainer() {
        if (!elMapStage || !elMapImage || !elMapContainer) return;
        const nw = elMapImage.naturalWidth || 1024;
        const nh = elMapImage.naturalHeight || 764;
        const cw = Math.max(200, elMapContainer.clientWidth - 16);
        const ch = Math.max(200, elMapContainer.clientHeight - 16);
        const ratio = nw / nh;
        let w = cw;
        let h = w / ratio;
        if (h > ch) {
            h = ch;
            w = h * ratio;
        }
        elMapStage.style.width = `${Math.floor(w)}px`;
        elMapStage.style.height = `${Math.floor(h)}px`;
        elMapStage.style.aspectRatio = `${nw} / ${nh}`;
    }

    let lastWindowWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        fitMapStageToContainer();
        const currentWidth = window.innerWidth;
        if (lastWindowWidth > 768 && currentWidth <= 768) {
            // Transisi Desktop -> Mobile
            if (appState.viewMode === 'split') {
                setViewMode('map-only');
            }
        } else if (lastWindowWidth <= 768 && currentWidth > 768) {
            // Transisi Mobile -> Desktop
            if (appState.viewMode === 'map-only' || appState.viewMode === 'pano-only') {
                setViewMode('split');
            }
        }
        lastWindowWidth = currentWidth;
    });

    function setViewMode(mode) {
        appState.viewMode = mode;
        elViewModeSplit.classList.toggle('active', mode === 'split');
        elViewModeMap.classList.toggle('active', mode === 'map-only');
        elViewModePano.classList.toggle('active', mode === 'pano-only');

        elMainWorkspace.classList.remove('mode-map-only', 'mode-pano-only');
        if (mode === 'map-only') {
            elMainWorkspace.classList.add('mode-map-only');
        } else if (mode === 'pano-only') {
            elMainWorkspace.classList.add('mode-pano-only');
        }

        // Sesuaikan ukuran stage denah & pannellum jika beralih mode
        setTimeout(() => {
            fitMapStageToContainer();
            if (pannellumViewer) {
                try { pannellumViewer.resize(); } catch (e) {}
            }
        }, 320);
    }

    // =========================================================================
    // MODAL LOGIN PETUGAS DINAS (SRS-FR-10: DENGAN LOGO CIREBON)
    // =========================================================================
    btnAksesPetugas.addEventListener('click', () => {
        if (DataService.isAdminLoggedIn()) {
            window.location.href = 'admin.html';
        } else {
            openModal(modalLogin);
        }
    });

    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const btnToggleLoginPassword = document.getElementById('btn-toggle-login-password');
    const loginPasswordInput = document.getElementById('login-password');

    btnToggleLoginPassword?.addEventListener('click', () => {
        if (!loginPasswordInput) return;
        const show = loginPasswordInput.type === 'password';
        loginPasswordInput.type = show ? 'text' : 'password';
        btnToggleLoginPassword.title = show ? 'Sembunyikan Sandi' : 'Tampilkan Sandi';
        btnToggleLoginPassword.setAttribute('aria-pressed', String(show));
    });

    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        loginError.style.display = 'none';
        try {
            const result = await DataService.signIn(email, password);
            if (result.success) {
                closeModal(modalLogin);
                showToast('Login Petugas Berhasil! Mengalihkan ke Panel Admin...', 'success');
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1000);
            } else {
                loginError.textContent = result.error || 'Autentikasi gagal. Periksa kembali surel dan sandi.';
                loginError.style.display = 'block';
            }
        } catch (err) {
            console.error('Error saat login:', err);
            loginError.textContent = 'Terjadi kesalahan sistem: ' + (err.message || 'Silakan coba lagi');
            loginError.style.display = 'block';
        }
    });

    function updateAdminButtonState() {
        if (DataService.isAdminLoggedIn()) {
            btnAksesPetugas.innerHTML = '<span>⚙️</span> <span class="btn-text-desktop">Dashboard Petugas</span><span class="btn-text-mobile">Petugas</span>';
            btnAksesPetugas.classList.add('gold-flavor');
            btnAksesPetugas.title = 'Buka Dashboard Petugas Kearsipan';
        } else {
            btnAksesPetugas.innerHTML = '<span>🔐</span> <span class="btn-text-desktop">Akses Petugas</span><span class="btn-text-mobile">Petugas</span>';
            btnAksesPetugas.classList.remove('gold-flavor');
            btnAksesPetugas.title = 'Portal Pengelolaan Petugas Dinas';
        }
    }

    // =========================================================================
    // HELPER MODAL & TOAST
    // =========================================================================
    function openModal(modalEl) {
        if (modalEl) modalEl.classList.add('active');
    }

    function closeModal(modalEl) {
        if (modalEl) modalEl.classList.remove('active');
    }

    function openPhotoLightbox(imgSrc, titleText = 'Foto Ruangan') {
        const lightboxEl = document.getElementById('modal-photo-lightbox');
        const lightboxImg = document.getElementById('lightbox-photo-img');
        const lightboxTitle = document.getElementById('lightbox-photo-title');
        if (!lightboxEl || !lightboxImg) return;
        lightboxImg.src = imgSrc || '';
        if (lightboxTitle) lightboxTitle.textContent = titleText || 'Foto Ruangan';
        openModal(lightboxEl);
    }

    document.getElementById('lightbox-image-frame')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeModal(document.getElementById('modal-photo-lightbox'));
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const lightboxEl = document.getElementById('modal-photo-lightbox');
        if (lightboxEl?.classList.contains('active')) {
            closeModal(lightboxEl);
            return;
        }
        document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m));
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal(overlay);
        });
        const closeBtn = overlay.querySelector('.modal-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(overlay));
        }
    });

    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Event listeners tombol tab & kontrol panorama
    function setupEventListeners() {

        // Layer Switcher: Denah Digital vs Cetak Biru Asli (Skala 1:150)
        elBtnLayerVector?.addEventListener('click', () => {
            appState.mapLayer = 'vector';
            elBtnLayerVector.classList.add('active');
            elBtnLayerBlueprint?.classList.remove('active');
            if (appState.currentFloor) {
                elMapImage.src = appState.currentFloor.map_image_url;
            }
        });

        elBtnLayerBlueprint?.addEventListener('click', () => {
            appState.mapLayer = 'blueprint';
            elBtnLayerBlueprint.classList.add('active');
            elBtnLayerVector?.classList.remove('active');
            if (appState.currentFloor) {
                elMapImage.src = appState.currentFloor.blueprint_image_url || appState.currentFloor.map_image_url;
            }
        });

        elFloor1Btn?.addEventListener('click', () => {
            switchBuildingAndFloor('Kearsipan', 1);
        });
        elFloor2Btn?.addEventListener('click', () => {
            switchBuildingAndFloor('Kearsipan', 2);
        });

        // Kontrol Panorama
        document.getElementById('btn-pano-front')?.addEventListener('click', () => {
            if (pannellumViewer) {
                pannellumViewer.setPitch(0);
                pannellumViewer.setYaw(0);
            }
        });
        document.getElementById('btn-pano-fullscreen')?.addEventListener('click', () => {
            if (pannellumViewer) {
                pannellumViewer.toggleFullscreen();
            }
        });
    }
});

