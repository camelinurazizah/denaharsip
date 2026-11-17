/**
 * LOGIKA DASHBOARD PENGELOLA / ADMIN DISARPUS KABUPATEN CIREBON
 * Sistem Informasi Denah Interaktif dan Tur Panorama Fasilitas
 * 
 * Sesuai Dokumen SRS & Makalah Perancangan Sistem:
 * - SRS-FR-10: Autentikasi Admin Terproteksi
 * - SRS-FR-11: Manajemen Data Gedung, Denah & Ruangan (CRUD)
 * - SRS-FR-12: Pemetaan Koordinat Denah 2D Otomatis (Klik Kanvas Peta)
 * - SRS-FR-13: Visual Hotspot Mapper pada Panorama (Klik Lemari/Rak)
 * - SRS-FR-14: Manajemen Katalog Buku per Rak
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cek Sesi Autentikasi (SRS-FR-10)
    if (!DataService.isAdminLoggedIn()) {
        alert('Akses Terbatas: Silakan login terlebih dahulu sebagai Petugas Dinas.');
        window.location.href = 'index.html';
        return;
    }

    // Tampilkan email petugas yang sedang login
    const elAdminEmail = document.getElementById('admin-logged-email');
    if (elAdminEmail) {
        elAdminEmail.textContent = DataService.getAdminEmail();
    }

    // Tombol Logout
    document.getElementById('btn-admin-logout')?.addEventListener('click', () => {
        if (confirm('Apakah Anda yakin ingin keluar dari Sesi Petugas?')) {
            DataService.signOut();
            window.location.href = 'index.html';
        }
    });

    // Inisialisasi Tab Navigasi Sidebar
    setupAdminNavigation();

    // =========================================================================
    // NAVIGASI TAB SIDEBAR ADMIN
    // =========================================================================
    function setupAdminNavigation() {
        const navItems = document.querySelectorAll('.admin-nav-item');
        const tabPanes = document.querySelectorAll('.tab-pane');

        navItems.forEach(item => {
            const activateTab = () => {
                const targetTab = item.getAttribute('data-tab');
                navItems.forEach(n => n.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));

                item.classList.add('active');
                const targetPane = document.getElementById(targetTab);
                if (targetPane) {
                    targetPane.classList.add('active');
                    if (window.innerWidth <= 768) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                    // Jika tab Hotspot Mapper diaktifkan, resize atau inisialisasi ulang kanvas pannellum
                    if (targetTab === 'tab-hotspot-mapper') {
                        setTimeout(() => {
                            if (adminPanoViewer && !isMapperFallbackMode) {
                                try { adminPanoViewer.resize(); } catch (e) {}
                            }
                        }, 150);
                    }
                }
            };
            item.addEventListener('click', activateTab);
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activateTab();
                }
            });
        });

        // Buka tab berdasarkan hash URL jika ada (misal: admin.html#tab-ruangan)
        const currentHash = window.location.hash.replace('#', '');
        if (currentHash) {
            const hashItem = document.querySelector(`.admin-nav-item[data-tab="${currentHash}"]`);
            if (hashItem) hashItem.click();
        }
    }

    // =========================================================================
    // HELPER GLOBAL: WIDGET UPLOAD BERKAS & INPUT URL BERDAMPINGAN
    // =========================================================================
    function formatMediaLabel(src, fallback = 'Berkas Terpilih') {
        if (!src) return fallback;
        if (src.startsWith('data:')) return '📷 Gambar dari Perangkat (Data URL)';
        return src.split('?')[0].split('/').pop() || fallback;
    }

    function setupImageUploader({
        fileInputId,
        dropzoneId,
        previewCardId,
        previewImgId,
        previewNameId,
        btnChangeId,
        hiddenInputId,
        manualInputId,
        btnToggleId,
        urlGroupId,
        bucket = 'details',
        onChange = null
    }) {
        const fileInput = document.getElementById(fileInputId);
        const dropzone = document.getElementById(dropzoneId);
        const previewCard = document.getElementById(previewCardId);
        const previewImg = document.getElementById(previewImgId);
        const previewName = document.getElementById(previewNameId);
        const btnChange = document.getElementById(btnChangeId);
        const hiddenInput = document.getElementById(hiddenInputId);
        const manualInput = document.getElementById(manualInputId);
        const btnToggle = document.getElementById(btnToggleId);
        const urlGroup = document.getElementById(urlGroupId);

        if (!fileInput && !manualInput) return { showPreview: () => {}, hidePreview: () => {} };

        // Klik dropzone atau tombol ganti jika ada
        dropzone?.addEventListener('click', (e) => {
            if (e.target !== fileInput) fileInput?.click();
        });
        btnChange?.addEventListener('click', () => fileInput?.click());

        // Toggle input manual (jika memakai mode toggle lama)
        btnToggle?.addEventListener('click', (e) => {
            e.preventDefault();
            if (urlGroup) {
                const isHidden = urlGroup.style.display === 'none';
                urlGroup.style.display = isHidden ? 'block' : 'none';
                if (isHidden && manualInput) manualInput.focus();
            }
        });

        // Saat file dipilih dari perangkat (laptop/komputer)
        fileInput?.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            showAdminToast(`⏳ Membaca & mengoptimalkan gambar "${file.name}"...`, 'info');
            try {
                const mediaUrl = await DataService.uploadMedia(file, bucket);
                if (mediaUrl) {
                    if (hiddenInput) hiddenInput.value = mediaUrl;
                    showPreview(mediaUrl, file.name, true);
                    showAdminToast(`✅ Gambar "${file.name}" berhasil dimuat!`, 'success');
                    if (typeof onChange === 'function') onChange(mediaUrl);
                }
            } catch (err) {
                console.error('Upload media error:', err);
                showAdminToast('⚠️ Gagal memuat berkas gambar.', 'error');
            } finally {
                fileInput.value = '';
            }
        });

        // Drag & Drop ke area upload
        const dragTarget = dropzone || fileInput?.closest('.upload-file-col');
        if (dragTarget && fileInput) {
            ['dragenter', 'dragover'].forEach(eventName => {
                dragTarget.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dragTarget.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dragTarget.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dragTarget.classList.remove('dragover');
                });
            });

            dragTarget.addEventListener('drop', (e) => {
                const file = e.dataTransfer?.files?.[0];
                if (!file) return;
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
                fileInput.dispatchEvent(new Event('change'));
            });
        }

        // Sinkronisasi input teks URL berdampingan
        if (manualInput) {
            manualInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                if (hiddenInput) hiddenInput.value = val;
                if (val) {
                    showPreview(val, 'Tautan URL / Path', false);
                } else {
                    hidePreview(false);
                }
                if (typeof onChange === 'function') onChange(val);
            });
        }

        function showPreview(src, name = 'Berkas Dipilih', syncManual = true) {
            if (!src) {
                hidePreview(syncManual);
                return;
            }
            if (previewImg) previewImg.src = src;
            if (previewName) previewName.textContent = formatMediaLabel(src, name);
            if (previewCard) previewCard.style.display = 'flex';
            if (syncManual && manualInput) {
                if (src.startsWith('data:')) {
                    manualInput.value = '';
                    manualInput.placeholder = '✅ Data URL perangkat aktif (ketik URL untuk ganti)';
                } else {
                    manualInput.value = src;
                    manualInput.placeholder = 'Atau input teks URL / path gambar...';
                }
            }
        }

        function hidePreview(clearManual = true) {
            if (previewImg) previewImg.src = '';
            if (previewCard) previewCard.style.display = 'none';
            if (fileInput) fileInput.value = '';
            if (clearManual && manualInput) {
                manualInput.value = '';
                manualInput.placeholder = 'Atau input teks URL / path gambar...';
            }
        }

        return { showPreview, hidePreview };
    }

    // =========================================================================
    // TAB 2: MANAJEMEN DENAH & LANTAI (SRS-FR-11)
    // =========================================================================
    const floorSelectBuilding = document.getElementById('floor-select-building');
    const floorSelectNumber = document.getElementById('floor-select-number');
    const floorInputName = document.getElementById('floor-input-name');
    const floorInputDesc = document.getElementById('floor-input-desc');
    const floorInputMapUrl = document.getElementById('floor-input-map-url');
    const floorInputBlueprintUrl = document.getElementById('floor-input-blueprint-url');
    const floorMapPreview = document.getElementById('floor-map-preview');
    const formFloor = document.getElementById('form-floor');
    const btnPreviewDigital = document.getElementById('btn-preview-mode-digital');
    const btnPreviewBlueprint = document.getElementById('btn-preview-mode-blueprint');

    let currentFloorPreviewMode = 'digital'; // 'digital' atau 'blueprint'

    function updateFloorPreview() {
        if (!floorMapPreview) return;
        if (currentFloorPreviewMode === 'digital') {
            floorMapPreview.src = floorInputMapUrl?.value || '';
            if (btnPreviewDigital) {
                btnPreviewDigital.style.background = '#0284c7';
                btnPreviewDigital.style.color = '#fff';
                btnPreviewDigital.style.borderColor = '#0284c7';
            }
            if (btnPreviewBlueprint) {
                btnPreviewBlueprint.style.background = '#f8fafc';
                btnPreviewBlueprint.style.color = '#475569';
                btnPreviewBlueprint.style.borderColor = '#cbd5e1';
            }
        } else {
            floorMapPreview.src = floorInputBlueprintUrl?.value || floorInputMapUrl?.value || '';
            if (btnPreviewBlueprint) {
                btnPreviewBlueprint.style.background = '#0284c7';
                btnPreviewBlueprint.style.color = '#fff';
                btnPreviewBlueprint.style.borderColor = '#0284c7';
            }
            if (btnPreviewDigital) {
                btnPreviewDigital.style.background = '#f8fafc';
                btnPreviewDigital.style.color = '#475569';
                btnPreviewDigital.style.borderColor = '#cbd5e1';
            }
        }
    }

    btnPreviewDigital?.addEventListener('click', () => {
        currentFloorPreviewMode = 'digital';
        updateFloorPreview();
    });

    btnPreviewBlueprint?.addEventListener('click', () => {
        currentFloorPreviewMode = 'blueprint';
        updateFloorPreview();
    });

    const uploaderFloorMap = setupImageUploader({
        fileInputId: 'floor-file-map',
        dropzoneId: 'dropzone-floor-map',
        previewCardId: 'preview-floor-map-card',
        previewImgId: 'preview-floor-map-img',
        previewNameId: 'preview-floor-map-name',
        btnChangeId: 'btn-change-floor-map',
        hiddenInputId: 'floor-input-map-url',
        manualInputId: 'floor-input-map-manual',
        btnToggleId: 'btn-toggle-url-floor-map',
        urlGroupId: 'url-group-floor-map',
        bucket: 'blueprints',
        onChange: () => {
            currentFloorPreviewMode = 'digital';
            updateFloorPreview();
        }
    });

    const uploaderFloorBlueprint = setupImageUploader({
        fileInputId: 'floor-file-blueprint',
        dropzoneId: 'dropzone-floor-blueprint',
        previewCardId: 'preview-floor-blueprint-card',
        previewImgId: 'preview-floor-blueprint-img',
        previewNameId: 'preview-floor-blueprint-name',
        btnChangeId: 'btn-change-floor-blueprint',
        hiddenInputId: 'floor-input-blueprint-url',
        manualInputId: 'floor-input-blueprint-manual',
        btnToggleId: 'btn-toggle-url-floor-blueprint',
        urlGroupId: 'url-group-floor-blueprint',
        bucket: 'blueprints',
        onChange: () => {
            currentFloorPreviewMode = 'blueprint';
            updateFloorPreview();
        }
    });

    async function loadFloorFormData() {
        const building = floorSelectBuilding?.value || 'Kearsipan';
        const floorNum = Number(floorSelectNumber?.value || 1);
        const floors = await DataService.getFloors('Kearsipan');
        const floor = floors.find(f => Number(f.floor_number) === floorNum) || floors[0];

        if (floor) {
            floorInputName.value = floor.name || '';
            floorInputDesc.value = floor.description || '';
            floorInputMapUrl.value = floor.map_image_url || '';
            if (floorInputBlueprintUrl) {
                floorInputBlueprintUrl.value = floor.blueprint_image_url || floor.map_image_url || '';
            }
            formFloor.setAttribute('data-id', floor.id);

            if (floor.map_image_url) {
                uploaderFloorMap.showPreview(floor.map_image_url, formatMediaLabel(floor.map_image_url, 'denah.svg'), true);
            } else {
                uploaderFloorMap.hidePreview();
            }

            if (floor.blueprint_image_url) {
                uploaderFloorBlueprint.showPreview(floor.blueprint_image_url, formatMediaLabel(floor.blueprint_image_url, 'blueprint.jpg'), true);
            } else {
                uploaderFloorBlueprint.hidePreview();
            }

            updateFloorPreview();
        }
    }

    floorSelectBuilding?.addEventListener('change', loadFloorFormData);
    floorSelectNumber?.addEventListener('change', loadFloorFormData);

    formFloor?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!floorInputMapUrl.value.trim()) {
            showAdminToast('⚠️ Silakan pilih gambar denah atau masukkan URL denah digital 2D.', 'warning');
            return;
        }
        const floorId = formFloor.getAttribute('data-id');
        const updated = {
            id: floorId ? Number(floorId) : undefined,
            building: 'Kearsipan',
            floor_number: Number(floorSelectNumber.value),
            name: floorInputName.value.trim(),
            description: floorInputDesc.value.trim(),
            map_image_url: floorInputMapUrl.value.trim(),
            blueprint_image_url: floorInputBlueprintUrl?.value?.trim() || floorInputMapUrl.value.trim()
        };
        try {
            await DataService.saveFloor(updated);
            showAdminToast('Data Denah & Cetak Biru Lantai Gedung Kearsipan berhasil disimpan!', 'success');
            await loadInitialAdminData();
        } catch (err) {
            console.error('Gagal menyimpan lantai:', err);
            showAdminToast(`❌ ${err.message || 'Gagal menyimpan data lantai.'}`, 'error');
        }
    });

    // =========================================================================
    // TAB 3: REGISTRASI RUANGAN (MODAL POPUP & TABEL DATA RUANGAN)
    // =========================================================================
    const modalAdminRoom = document.getElementById('modal-admin-room');
    const btnOpenRoomModal = document.getElementById('btn-open-room-modal') || document.getElementById('btn-room-reset');
    const btnCloseRoomModal = document.getElementById('btn-close-room-modal');
    const btnCancelRoomModal = document.getElementById('btn-cancel-room-modal');
    const modalRoomHeading = document.getElementById('modal-room-heading');
    const modalRoomIcon = document.getElementById('modal-room-icon');
    const filterRoomSearch = document.getElementById('filter-room-search');
    const filterKelolaSearch = document.getElementById('filter-kelola-search');
    const btnClearKelolaSearch = document.getElementById('btn-clear-kelola-search');
    const btnSearchKelola = document.getElementById('btn-search-kelola');

    const roomSelectFloor = document.getElementById('room-select-floor');
    const roomInputName = document.getElementById('room-input-name');
    const roomInputNearby = document.getElementById('room-input-nearby');
    const roomInputServices = document.getElementById('room-input-services');
    const roomInputPhoto = document.getElementById('room-input-photo');
    const roomInputPano = document.getElementById('room-input-pano');
    const roomInputMapX = document.getElementById('room-input-map-x');

    const uploaderRoomPhoto = setupImageUploader({
        fileInputId: 'room-file-photo',
        dropzoneId: 'dropzone-room-photo',
        previewCardId: 'preview-room-photo-card',
        previewImgId: 'preview-room-photo-img',
        previewNameId: 'preview-room-photo-name',
        btnChangeId: 'btn-change-room-photo',
        hiddenInputId: 'room-input-photo',
        manualInputId: 'room-input-photo-manual',
        btnToggleId: 'btn-toggle-url-room-photo',
        urlGroupId: 'url-group-room-photo',
        bucket: 'details'
    });

    const uploaderRoomPano = setupImageUploader({
        fileInputId: 'room-file-pano',
        dropzoneId: 'dropzone-room-pano',
        previewCardId: 'preview-room-pano-card',
        previewImgId: 'preview-room-pano-img',
        previewNameId: 'preview-room-pano-name',
        btnChangeId: 'btn-change-room-pano',
        hiddenInputId: 'room-input-pano',
        manualInputId: 'room-input-pano-manual',
        btnToggleId: 'btn-toggle-url-room-pano',
        urlGroupId: 'url-group-room-pano',
        bucket: 'panoramas'
    });
    const roomInputMapY = document.getElementById('room-input-map-y');
    const roomPickerImage = document.getElementById('room-picker-image');
    const roomPickerStage = document.getElementById('room-picker-stage');
    const roomPickerContainer = document.getElementById('room-picker-container') || document.getElementById('room-picker-wrapper');
    const roomPickerCrosshair = document.getElementById('room-picker-crosshair');
    const roomPickerLabel = document.getElementById('room-picker-label');
    const formRoom = document.getElementById('form-room');
    const btnRoomSubmit = document.getElementById('btn-room-submit');

    // Sinkronkan posisi visual crosshair pin di kanvas denah modal
    function syncRoomPickerCrosshair() {
        if (!roomPickerCrosshair || !roomInputMapX || !roomInputMapY) return;
        const x = parseFloat(roomInputMapX.value);
        const y = parseFloat(roomInputMapY.value);
        if (!isNaN(x) && !isNaN(y) && x >= 0 && y >= 0) {
            roomPickerCrosshair.style.display = 'block';
            roomPickerCrosshair.style.left = `${x}%`;
            roomPickerCrosshair.style.top = `${y}%`;
            if (roomPickerLabel) {
                roomPickerLabel.textContent = roomInputName?.value?.trim() || 'Pin Ruangan';
            }
        } else {
            roomPickerCrosshair.style.display = 'none';
        if (roomPickerLabel) roomPickerLabel.textContent = 'Pin Ruangan';
        }
    }

    // Buka Modal Registrasi Ruangan
    function openRoomModal(mode = 'create', room = null) {
        if (!modalAdminRoom) return;

        if (mode === 'create') {
            resetRoomForm();
            if (modalRoomHeading) modalRoomHeading.textContent = 'Registrasi Ruangan Pelayanan Baru';
            if (modalRoomIcon) modalRoomIcon.textContent = '➕';
            if (btnRoomSubmit) btnRoomSubmit.innerHTML = '<span>💾</span> Simpan &amp; Tambahkan Ruangan';
        } else if (mode === 'edit' && room) {
            formRoom.setAttribute('data-id', room.id);
            if (roomSelectFloor) roomSelectFloor.value = room.floor_id;
            roomInputName.value = room.name || '';
            roomInputNearby.value = room.nearby_notes || '';
            roomInputServices.value = room.services_info || '';
            roomInputPhoto.value = room.room_photo_url || 'assets/images/ruang-pa-front.jpg';
            roomInputPano.value = room.panorama_image_url || 'assets/images/ruang-pa-pano.jpg';
            if (room.room_photo_url) {
                uploaderRoomPhoto.showPreview(room.room_photo_url, formatMediaLabel(room.room_photo_url, 'ruang-pa-front.jpg'), true);
            } else {
                uploaderRoomPhoto.hidePreview();
            }
            if (room.panorama_image_url) {
                uploaderRoomPano.showPreview(room.panorama_image_url, formatMediaLabel(room.panorama_image_url, 'ruang-pa-pano.jpg'), true);
            } else {
                uploaderRoomPano.hidePreview();
            }
            roomInputMapX.value = room.map_x || 25.0;
            roomInputMapY.value = room.map_y || 30.0;

            if (modalRoomHeading) modalRoomHeading.textContent = `Edit Ruangan: ${room.name}`;
            if (modalRoomIcon) modalRoomIcon.textContent = '✏️';
            if (btnRoomSubmit) btnRoomSubmit.innerHTML = '<span>💾</span> Perbarui Data Ruangan';
        }

        // Perbarui gambar denah lantai pada modal lalu sinkronkan pin crosshair
        updateRoomPickerFloorMap().then(() => {
            syncRoomPickerCrosshair();
        });

        modalAdminRoom.classList.add('active');
        setTimeout(() => roomInputName?.focus?.(), 150);
    }

    function closeRoomModal() {
        if (modalAdminRoom) {
            modalAdminRoom.classList.remove('active');
        }
    }

    // Pasang tombol buka & tutup modal (dukung semua tombol .btn-open-room-modal & id)
    document.querySelectorAll('.btn-open-room-modal, #btn-open-room-modal, #btn-room-reset').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openRoomModal('create');
        });
    });

    btnCloseRoomModal?.addEventListener('click', closeRoomModal);
    btnCancelRoomModal?.addEventListener('click', closeRoomModal);

    modalAdminRoom?.addEventListener('click', (e) => {
        if (e.target === modalAdminRoom) {
            closeRoomModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalAdminRoom?.classList.contains('active')) {
            closeRoomModal();
        }
    });

    async function updateRoomPickerFloorMap() {
        if (!roomSelectFloor || !roomPickerImage) return;
        const floorId = roomSelectFloor.value;
        const floor = await DataService.getFloorById(floorId);
        if (floor) {
            roomPickerImage.src = floor.map_image_url;
        }
    }

    roomSelectFloor?.addEventListener('change', () => {
        updateRoomPickerFloorMap();
        roomPickerCrosshair.style.display = 'none';
        if (roomPickerLabel) roomPickerLabel.textContent = 'Pin Ruangan';
        roomInputMapX.value = '';
        roomInputMapY.value = '';
    });

    // SRS-FR-12: Klik Kanvas Denah 2D untuk Menghitung Persentase map_x dan map_y Otomatis Murni 1:1!
    function handleRoomPickerMapClick(e) {
        if (!roomPickerImage) return;
        const rect = roomPickerImage.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        // Hitung posisi klik relatif langsung terhadap dimensi gambar denah SVG aktual
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Batasi rentang [0, rect.width] dan [0, rect.height]
        const clampedX = Math.max(0, Math.min(rect.width, clickX));
        const clampedY = Math.max(0, Math.min(rect.height, clickY));

        const percentX = parseFloat(((clampedX / rect.width) * 100).toFixed(1));
        const percentY = parseFloat(((clampedY / rect.height) * 100).toFixed(1));

        roomInputMapX.value = percentX;
        roomInputMapY.value = percentY;

        syncRoomPickerCrosshair();

        showAdminToast(`🎯 Koordinat Denah Dikunci: (${percentX}%, ${percentY}%)`, 'info');
    }

    roomPickerStage?.addEventListener('click', handleRoomPickerMapClick);
    roomPickerContainer?.addEventListener('click', (e) => {
        if (e.target === roomPickerContainer) {
            handleRoomPickerMapClick(e);
        }
    });

    roomInputMapX?.addEventListener('input', syncRoomPickerCrosshair);
    roomInputMapY?.addEventListener('input', syncRoomPickerCrosshair);
    roomInputName?.addEventListener('input', () => {
        if (roomPickerLabel) {
            roomPickerLabel.textContent = roomInputName.value.trim() || 'Pin Ruangan';
        }
    });

    // Submit formulir ruangan
    formRoom?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const roomId = formRoom.getAttribute('data-id');
        const nameVal = roomInputName.value.trim();

        if (!roomInputMapX.value || !roomInputMapY.value) {
            showAdminToast('⚠️ Silakan klik pada gambar denah di sebelah kanan untuk mengunci koordinat ruangan!', 'warning');
            return;
        }

        const roomData = {
            id: roomId ? Number(roomId) : undefined,
            floor_id: Number(roomSelectFloor.value),
            name: nameVal,
            short_name: nameVal.length > 22 ? nameVal.substring(0, 20) + '...' : nameVal,
            nearby_notes: roomInputNearby.value.trim(),
            services_info: roomInputServices.value.trim(),
            room_photo_url: roomInputPhoto.value.trim() || 'assets/images/ruang-pa-front.jpg',
            panorama_image_url: roomInputPano.value.trim() || 'assets/images/ruang-pa-pano.jpg',
            map_x: parseFloat(roomInputMapX.value) || 25.0,
            map_y: parseFloat(roomInputMapY.value) || 30.0
        };

        try {
            await DataService.saveRoom(roomData);
            closeRoomModal();
            showAdminToast(`✅ Data Ruangan "${nameVal}" berhasil disimpan!`, 'success');
            resetRoomForm();
            await loadInitialAdminData();
            refreshRecordsTable();
        } catch (err) {
            console.error('Simpan ruangan gagal:', err);
            showAdminToast(`❌ Gagal menyimpan ruangan: ${err.message || 'Penyimpanan penuh'}`, 'error');
        }
    });

    function resetRoomForm() {
        formRoom.removeAttribute('data-id');
        roomInputName.value = '';
        roomInputNearby.value = '';
        roomInputServices.value = '';
        roomInputMapX.value = '';
        roomInputMapY.value = '';
        roomPickerCrosshair.style.display = 'none';
        if (roomPickerLabel) roomPickerLabel.textContent = 'Pin Ruangan';
        if (roomSelectFloor && roomSelectFloor.options.length > 0) {
            roomSelectFloor.selectedIndex = 0;
        }
        if (roomInputPhoto) roomInputPhoto.value = 'assets/images/ruang-pa-front.jpg';
        if (roomInputPano) roomInputPano.value = 'assets/images/ruang-pa-pano.jpg';
        uploaderRoomPhoto?.showPreview('assets/images/ruang-pa-front.jpg', 'ruang-pa-front.jpg (Bawaan)', true);
        uploaderRoomPano?.showPreview('assets/images/ruang-pa-pano.jpg', 'ruang-pa-pano.jpg (Bawaan)', true);
    }

    // Filter live search di tabel ruangan
    const btnClearRoomSearch = document.getElementById('btn-clear-room-search');

    function applyRoomSearchFilter() {
        if (!filterRoomSearch) return;
        const query = filterRoomSearch.value.toLowerCase().trim();
        if (btnClearRoomSearch) {
            btnClearRoomSearch.style.display = query.length > 0 ? 'inline-block' : 'none';
        }
        document.querySelectorAll('#table-tab-rooms-tbody tr').forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    }

    filterRoomSearch?.addEventListener('input', applyRoomSearchFilter);
    filterRoomSearch?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            filterRoomSearch.value = '';
            applyRoomSearchFilter();
        }
    });

    btnClearRoomSearch?.addEventListener('click', () => {
        if (filterRoomSearch) {
            filterRoomSearch.value = '';
            filterRoomSearch.focus();
        }
        applyRoomSearchFilter();
    });

    // Fitur Refresh / Segarkan Data dari Supabase
    const btnRefreshRooms = document.getElementById('btn-refresh-rooms');
    const btnRefreshKelola = document.getElementById('btn-refresh-kelola');

    async function handleDataRefresh(btn = null, label = 'ruangan') {
        if (btn) {
            btn.classList.add('is-spinning');
            btn.disabled = true;
        }

        // 1. Bersihkan filter dan input pencarian agar seluruh data langsung tampil
        if (filterRoomSearch) {
            filterRoomSearch.value = '';
        }
        if (btnClearRoomSearch) {
            btnClearRoomSearch.style.display = 'none';
        }
        if (filterKelolaSearch) {
            filterKelolaSearch.value = '';
        }
        if (btnClearKelolaSearch) {
            btnClearKelolaSearch.style.display = 'none';
        }

        showAdminToast(`⏳ Menyegarkan data ${label} dari database Supabase...`, 'info');
        try {
            // 2. Tarik data live langsung dari Supabase & sinkronkan cache lokal
            const result = await DataService.refreshAllData();

            // 3. Render ulang tabel dan kartu statistik
            await refreshRecordsTable();

            // 4. Perbarui dropdown form ruangan jika ada
            if (mapperSelectRoom && result.rooms && result.rooms.length > 0) {
                const prevId = mapperSelectRoom.value;
                mapperSelectRoom.innerHTML = '';
                result.rooms.forEach(r => {
                    const floorNum = r.floors?.floor_number || (Number(r.floor_id) === 1 ? 1 : 2);
                    const opt = document.createElement('option');
                    opt.value = r.id;
                    opt.textContent = `${r.name} (Lantai ${floorNum})`;
                    mapperSelectRoom.appendChild(opt);
                });
                if (prevId && result.rooms.some(r => String(r.id) === String(prevId))) {
                    mapperSelectRoom.value = prevId;
                }
            }

            const count = result.rooms ? result.rooms.length : 0;
            const source = result.isLive ? 'Supabase Cloud' : 'Penyimpanan Lokal';
            showAdminToast(`✅ Data ${label} berhasil diperbarui dari ${source}! (${count} Ruangan)`, 'success');
        } catch (err) {
            console.error('Gagal menyegarkan data:', err);
            showAdminToast(`❌ Gagal menyegarkan data: ${err.message || 'Koneksi terganggu'}`, 'error');
        } finally {
            if (btn) {
                setTimeout(() => {
                    btn.classList.remove('is-spinning');
                    btn.disabled = false;
                }, 400);
            }
        }
    }

    btnRefreshRooms?.addEventListener('click', () => handleDataRefresh(btnRefreshRooms, 'ruangan'));
    btnRefreshKelola?.addEventListener('click', () => handleDataRefresh(btnRefreshKelola, 'ruangan & rak'));

    // Filter live search di tabel Kelola Data & Hapus (Tabel Ruangan & Tabel Rak Depo)
    function applyKelolaSearchFilter() {
        if (!filterKelolaSearch) return;
        const query = filterKelolaSearch.value.toLowerCase().trim();
        if (btnClearKelolaSearch) {
            btnClearKelolaSearch.style.display = query.length > 0 ? 'inline-block' : 'none';
        }

        // 1. Filter Tabel Ruangan di Tab Kelola (#table-rooms-tbody)
        let visibleRooms = 0;
        const roomRows = document.querySelectorAll('#table-rooms-tbody tr:not(.empty-search-row)');
        roomRows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matches = text.includes(query);
            row.style.display = matches ? '' : 'none';
            if (matches) visibleRooms++;
        });

        const roomsTbody = document.getElementById('table-rooms-tbody');
        const existingEmptyRoom = roomsTbody?.querySelector('.empty-search-row');
        if (query.length > 0 && visibleRooms === 0 && roomRows.length > 0) {
            if (!existingEmptyRoom && roomsTbody) {
                const tr = document.createElement('tr');
                tr.className = 'empty-search-row';
                tr.innerHTML = `<td colspan="5" style="text-align:center; color:#64748b; padding:1.25rem; font-style:italic; background:#f8fafc;">Tidak ada ruangan yang cocok dengan pencarian "<strong>${filterKelolaSearch.value}</strong>".</td>`;
                roomsTbody.appendChild(tr);
            }
        } else if (existingEmptyRoom) {
            existingEmptyRoom.remove();
        }

        // 2. Filter Tabel Titik Lemari / Rak Depo Arsip (#table-racks-tbody)
        let visibleRacks = 0;
        const rackRows = document.querySelectorAll('#table-racks-tbody tr:not(.empty-search-row)');
        rackRows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const matches = text.includes(query);
            row.style.display = matches ? '' : 'none';
            if (matches) visibleRacks++;
        });

        const racksTbody = document.getElementById('table-racks-tbody');
        const existingEmptyRack = racksTbody?.querySelector('.empty-search-row');
        if (query.length > 0 && visibleRacks === 0 && rackRows.length > 0) {
            if (!existingEmptyRack && racksTbody) {
                const tr = document.createElement('tr');
                tr.className = 'empty-search-row';
                tr.innerHTML = `<td colspan="5" style="text-align:center; color:#64748b; padding:1.25rem; font-style:italic; background:#f8fafc;">Tidak ada lemari / rak yang cocok dengan pencarian "<strong>${filterKelolaSearch.value}</strong>".</td>`;
                racksTbody.appendChild(tr);
            }
        } else if (existingEmptyRack) {
            existingEmptyRack.remove();
        }
    }

    filterKelolaSearch?.addEventListener('input', applyKelolaSearchFilter);
    filterKelolaSearch?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyKelolaSearchFilter();
        } else if (e.key === 'Escape') {
            filterKelolaSearch.value = '';
            applyKelolaSearchFilter();
        }
    });
    btnSearchKelola?.addEventListener('click', () => {
        applyKelolaSearchFilter();
        if (filterKelolaSearch) filterKelolaSearch.focus();
    });
    btnClearKelolaSearch?.addEventListener('click', () => {
        if (filterKelolaSearch) {
            filterKelolaSearch.value = '';
            filterKelolaSearch.focus();
        }
        applyKelolaSearchFilter();
    });

    // =========================================================================
    // TAB 3: VISUAL HOTSPOT MAPPER & INPUT KATALOG BUKU (SRS-FR-13 & SRS-FR-14)
    // =========================================================================
    let adminPanoViewer = null;
    let isMapperFallbackMode = false;
    const mapperSelectRoom = document.getElementById('mapper-select-room');
    const mapperPanoStatus = document.getElementById('mapper-pano-status');
    const rackInputTitle = document.getElementById('rack-input-title');
    const rackInputDDC = document.getElementById('rack-input-ddc');
    const rackInputLocation = document.getElementById('rack-input-location');
    const rackInputPitch = document.getElementById('rack-input-pitch');
    const rackInputYaw = document.getElementById('rack-input-yaw');
    const rackInputTags = document.getElementById('rack-input-tags');
    const rackInputPhoto = document.getElementById('rack-input-photo');
    const rackBooksTbody = document.getElementById('rack-books-tbody');
    const btnAddBookRow = document.getElementById('btn-add-book-row');
    const formRack = document.getElementById('form-rack');
    const viewerEl = document.getElementById('admin-mapper-viewer');

    const uploaderRackPhoto = setupImageUploader({
        fileInputId: 'rack-file-photo',
        previewCardId: 'preview-rack-photo-card',
        previewImgId: 'preview-rack-photo-img',
        previewNameId: 'preview-rack-photo-name',
        hiddenInputId: 'rack-input-photo',
        manualInputId: 'rack-input-photo-manual',
        bucket: 'details'
    });
    uploaderRackPhoto?.showPreview('assets/images/depo-arsip-front.jpg', 'depo-arsip-front.jpg (Bawaan)', true);

    // =========================================================================
    // KONTROL TAMPILAN INTERAKTIF MAPPER KHUSUS LAYAR HP (MOBILE)
    // =========================================================================
    const btnMapperViewCanvas = document.getElementById('btn-mapper-view-canvas');
    const btnMapperViewForm = document.getElementById('btn-mapper-view-form');
    const mapperGridContainer = document.getElementById('mapper-grid-container');
    const btnFloatingGotoForm = document.getElementById('btn-floating-goto-form');
    const btnBackToCanvas = document.getElementById('btn-back-to-canvas');
    const btnDismissMapperHelp = document.getElementById('btn-dismiss-mapper-help');
    const mapperInstructionBox = document.getElementById('mapper-instruction-box');

    function setMapperMobileView(mode) {
        if (!mapperGridContainer) return;
        if (mode === 'canvas') {
            mapperGridContainer.classList.remove('mapper-show-form');
            mapperGridContainer.classList.add('mapper-show-canvas');
            btnMapperViewCanvas?.classList.add('active');
            btnMapperViewForm?.classList.remove('active');
            setTimeout(() => {
                if (adminPanoViewer && !isMapperFallbackMode) {
                    try { adminPanoViewer.resize(); } catch (e) {}
                }
            }, 100);
        } else {
            mapperGridContainer.classList.remove('mapper-show-canvas');
            mapperGridContainer.classList.add('mapper-show-form');
            btnMapperViewForm?.classList.add('active');
            btnMapperViewCanvas?.classList.remove('active');
            if (window.innerWidth <= 768) {
                const formEl = document.getElementById('form-rack');
                if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    btnMapperViewCanvas?.addEventListener('click', () => setMapperMobileView('canvas'));
    btnMapperViewForm?.addEventListener('click', () => setMapperMobileView('form'));
    btnFloatingGotoForm?.addEventListener('click', () => {
        setMapperMobileView('form');
        setTimeout(() => {
            const inputTitle = document.getElementById('rack-input-title');
            if (inputTitle) inputTitle.focus();
        }, 220);
    });
    btnBackToCanvas?.addEventListener('click', () => setMapperMobileView('canvas'));

    btnDismissMapperHelp?.addEventListener('click', () => {
        if (mapperInstructionBox) mapperInstructionBox.classList.add('dismissed');
    });

    // Indikator Pin Hotspot Sementara saat Titik Diklik / Disentuh di Kanvas
    let tempHotspotId = 'temp-selected-hotspot';
    function updateTemporaryHotspotMarker(pitch, yaw) {
        if (!adminPanoViewer || isMapperFallbackMode) return;
        try {
            adminPanoViewer.removeHotSpot(tempHotspotId);
        } catch(e) {}
        try {
            adminPanoViewer.addHotSpot({
                id: tempHotspotId,
                pitch: Number(pitch),
                yaw: Number(yaw),
                cssClass: 'pnlm-temp-target-hotspot',
                createTooltipFunc: (hotSpotDiv) => {
                    hotSpotDiv.innerHTML = '<div class="temp-target-pin"><span class="temp-target-beacon"></span><span class="temp-target-label">Titik Terpilih</span></div>';
                }
            });
        } catch (e) {
            console.log('Temp hotspot error:', e);
        }
    }

    function handleMapperCoordsSelected(coords) {
        if (!coords || coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) return;
        const pitch = Number(coords[0]).toFixed(2);
        const yaw = Number(coords[1]).toFixed(2);
        if (rackInputPitch) rackInputPitch.value = pitch;
        if (rackInputYaw) rackInputYaw.value = yaw;

        showAdminToast(`🎯 Hotspot Terkunci! Pitch: ${pitch}°, Yaw: ${yaw}°`, 'info');

        const floatingBar = document.getElementById('mapper-floating-bar');
        const floatingText = document.getElementById('floating-coord-text');
        const badge = document.getElementById('mapper-coord-badge');
        const coordPreview = document.getElementById('form-coord-preview');

        if (floatingText) floatingText.textContent = `Pitch: ${pitch}° | Yaw: ${yaw}°`;
        if (floatingBar) floatingBar.style.display = 'flex';
        if (badge) {
            badge.style.display = 'inline-block';
            badge.textContent = `${pitch}°, ${yaw}°`;
        }
        if (coordPreview) {
            coordPreview.textContent = `Pitch: ${pitch}° | Yaw: ${yaw}°`;
        }

        updateTemporaryHotspotMarker(pitch, yaw);
    }

    // Klik langsung pada viewer Pannellum (Mouse Drag & Click)
    let mapperMouseDownPos = null;
    viewerEl?.addEventListener('mousedown', (ev) => {
        mapperMouseDownPos = { x: ev.clientX, y: ev.clientY };
    });
    viewerEl?.addEventListener('mouseup', (event) => {
        if (isMapperFallbackMode || !adminPanoViewer) return;
        if (mapperMouseDownPos) {
            const dist = Math.hypot(event.clientX - mapperMouseDownPos.x, event.clientY - mapperMouseDownPos.y);
            if (dist > 6) return;
        }
        try {
            const coords = adminPanoViewer.mouseEventToCoords(event);
            handleMapperCoordsSelected(coords);
        } catch (err) {
            console.log('Coords calculation:', err);
        }
    });

    // Sentuhan Langsung pada Layar HP / Touchscreen (Touch Drag & Tap)
    let mapperTouchStartPos = null;
    let mapperTouchStartTime = 0;
    viewerEl?.addEventListener('touchstart', (ev) => {
        if (ev.touches.length === 1) {
            mapperTouchStartPos = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
            mapperTouchStartTime = Date.now();
        }
    }, { passive: true });

    viewerEl?.addEventListener('touchend', (ev) => {
        if (isMapperFallbackMode || !adminPanoViewer) return;
        if (!mapperTouchStartPos || ev.changedTouches.length !== 1) return;
        const touch = ev.changedTouches[0];
        const dist = Math.hypot(touch.clientX - mapperTouchStartPos.x, touch.clientY - mapperTouchStartPos.y);
        const timeDiff = Date.now() - mapperTouchStartTime;
        // Hanya tangkap tap jika jari tidak digeser jauh (< 12px) dan durasi sentuh singkat (< 400ms)
        if (dist > 12 || timeDiff > 400) return;

        try {
            const coords = adminPanoViewer.mouseEventToCoords(touch);
            handleMapperCoordsSelected(coords);
        } catch (err) {
            console.log('Touch coords calculation:', err);
        }
    });

    // Fallback Viewer 360 untuk Admin jika WebGL / file:/// memblokir Pannellum
    function renderAdminFallbackPanorama(container, panoUrl) {
        if (!container) return;
        isMapperFallbackMode = true;
        container.innerHTML = `
            <div id="admin-fallback-pano" style="position:relative;width:100%;height:100%;min-height:360px;overflow:hidden;cursor:crosshair;background:#0f172a;">
                <div id="admin-fallback-canvas" style="width:100%;height:100%;background-image:url('${panoUrl}');background-size:auto 120%;background-repeat:repeat-x;background-position:0px 50%;transition:background-position 0.03s linear;"></div>
                <div style="position:absolute;bottom:10px;left:12px;background:rgba(15,23,42,0.8);color:#fff;padding:4px 10px;border-radius:6px;font-size:0.75rem;font-weight:700;pointer-events:none;">
                    🌐 Mode Kompatibel: Geser layar untuk memutar, klik titik rak untuk ambil koordinat
                </div>
            </div>
        `;
        const wrap = document.getElementById('admin-fallback-pano');
        const canvas = document.getElementById('admin-fallback-canvas');
        let dragging = false;
        let downX = 0, downY = 0, lastX = 0, lastY = 0;
        let yaw = 0, pitch = 0;

        function updatePos() {
            const w = wrap.clientWidth || 600;
            const bgX = yaw * (w / 90);
            const bgY = Math.max(10, Math.min(90, 50 + pitch * 0.8));
            canvas.style.backgroundPosition = `${bgX}px ${bgY}%`;
        }

        wrap.addEventListener('mousedown', (e) => {
            dragging = true;
            downX = lastX = e.clientX;
            downY = lastY = e.clientY;
        });
        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            yaw -= (e.clientX - lastX) * 0.25;
            pitch = Math.max(-35, Math.min(35, pitch + (e.clientY - lastY) * 0.2));
            lastX = e.clientX;
            lastY = e.clientY;
            updatePos();
        });
        window.addEventListener('mouseup', (e) => {
            if (!dragging) return;
            dragging = false;
            const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
            if (moved <= 6 && wrap.contains(e.target)) {
                const rect = wrap.getBoundingClientRect();
                const relX = (e.clientX - rect.left) / rect.width - 0.5;
                const relY = 0.5 - (e.clientY - rect.top) / rect.height;
                const calcYaw = (((yaw + relX * 90) % 360) + 540) % 360 - 180;
                const calcPitch = Math.max(-45, Math.min(45, pitch + relY * 60));
                handleMapperCoordsSelected([calcPitch, calcYaw]);
            }
        });

        // Touch support di mode fallback
        wrap.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                dragging = true;
                downX = lastX = e.touches[0].clientX;
                downY = lastY = e.touches[0].clientY;
            }
        }, { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (!dragging || e.touches.length !== 1) return;
            yaw -= (e.touches[0].clientX - lastX) * 0.25;
            pitch = Math.max(-35, Math.min(35, pitch + (e.touches[0].clientY - lastY) * 0.2));
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
            updatePos();
        }, { passive: true });
        window.addEventListener('touchend', (e) => {
            if (!dragging) return;
            dragging = false;
            if (e.changedTouches.length === 1) {
                const touch = e.changedTouches[0];
                const moved = Math.hypot(touch.clientX - downX, touch.clientY - downY);
                if (moved <= 10 && wrap.contains(e.target)) {
                    const rect = wrap.getBoundingClientRect();
                    const relX = (touch.clientX - rect.left) / rect.width - 0.5;
                    const relY = 0.5 - (touch.clientY - rect.top) / rect.height;
                    const calcYaw = (((yaw + relX * 90) % 360) + 540) % 360 - 180;
                    const calcPitch = Math.max(-45, Math.min(45, pitch + relY * 60));
                    handleMapperCoordsSelected([calcPitch, calcYaw]);
                }
            }
        });
    }

    async function initHotspotMapperRoom() {
        if (!mapperSelectRoom) return;
        const roomId = mapperSelectRoom.value;
        const room = await DataService.getRoomById(roomId);
        if (!room) return;

        // Perbarui badge status foto panorama ruangan ini
        if (mapperPanoStatus) {
            const rawUrl = (room.panorama_image_url || '').trim();
            if (rawUrl.startsWith('data:') || rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
                mapperPanoStatus.textContent = '✅ Foto panorama kustom ruangan ini telah aktif';
                mapperPanoStatus.style.color = '#16a34a';
            } else {
                mapperPanoStatus.textContent = 'ℹ️ Memakai panorama bawaan — foto dapat diganti di menu Registrasi Ruangan';
                mapperPanoStatus.style.color = '#64748b';
            }
        }

        // Muat semua titik rak yang sudah tersimpan di ruangan ini agar tampil langsung di kanvas 360 & tabel
        const roomRacks = await DataService.getRacksByRoom(roomId);
        renderMapperRoomRacksList(roomRacks);

        const hotspots = (roomRacks || []).map(rack => ({
            pitch: Number(rack.pitch) || 0,
            yaw: Number(rack.yaw) || 0,
            cssClass: 'pnlm-custom-hotspot',
            createTooltipFunc: (hotSpotDiv, args) => {
                const pill = document.createElement('div');
                pill.className = 'hotspot-marker-pill';
                pill.title = args.title;
                const icon = document.createElement('span');
                icon.textContent = '🗄️';
                const label = document.createElement('span');
                label.textContent = args.title;
                pill.appendChild(icon);
                pill.appendChild(label);
                hotSpotDiv.appendChild(pill);
            },
            createTooltipArgs: { title: rack.short_title || rack.title },
            clickHandlerFunc: () => loadRackIntoMapperForm(rack.id)
        }));

        // Hancurkan viewer lama jika ada
        if (adminPanoViewer) {
            try { adminPanoViewer.destroy(); } catch (e) {}
            adminPanoViewer = null;
        }
        isMapperFallbackMode = false;

        const panoUrl = typeof resolvePanoramaUrl === 'function'
            ? resolvePanoramaUrl(room.panorama_image_url)
            : room.panorama_image_url;

        try {
            if (typeof pannellum !== 'undefined' && pannellum.viewer) {
                adminPanoViewer = pannellum.viewer('admin-mapper-viewer', {
                    type: 'equirectangular',
                    panorama: panoUrl,
                    autoLoad: true,
                    autoRotate: 0,
                    compass: false,
                    showZoomCtrl: true,
                    showFullscreenCtrl: true,
                    mouseZoom: true,
                    hfov: 100,
                    hotSpots: hotspots
                });
                adminPanoViewer.on('error', () => {
                    renderAdminFallbackPanorama(viewerEl, panoUrl);
                });
            } else {
                renderAdminFallbackPanorama(viewerEl, panoUrl);
            }
        } catch (e) {
            console.error('Mapper panorama error:', e);
            renderAdminFallbackPanorama(viewerEl, panoUrl);
        }
    }

    async function loadRackIntoMapperForm(rackId) {
        const rack = await DataService.getRackById(rackId);
        if (!rack) return;
        formRack.setAttribute('data-id', rack.id);
        mapperSelectRoom.value = rack.room_id;
        rackInputTitle.value = rack.title || '';
        rackInputDDC.value = rack.category_code || '';
        rackInputLocation.value = rack.location_notes || '';
        rackInputPitch.value = rack.pitch;
        rackInputYaw.value = rack.yaw;
        rackInputTags.value = rack.search_tags || '';
        const rackPhotoUrl = rack.rack_photo_url || 'assets/images/depo-arsip-front.jpg';
        rackInputPhoto.value = rackPhotoUrl;
        uploaderRackPhoto?.showPreview(rackPhotoUrl, formatMediaLabel(rackPhotoUrl, 'depo-arsip-front.jpg'), true);

        const submitBtn = document.getElementById('btn-rack-submit');
        if (submitBtn) submitBtn.innerHTML = '<span>💾</span> Perbarui Lemari / Rak &amp; Boks Arsip';

        const books = await DataService.getBooksByRack(rack.id);
        rackBooksTbody.innerHTML = '';
        if (books.length > 0) {
            books.forEach(b => addBookTableRow(b.title, b.author, b.publish_year, b.copies, b.status));
        } else {
            addBookTableRow('', '', '', 1, 'Arsip Terbuka');
        }
        if (adminPanoViewer && !isMapperFallbackMode) {
            try { adminPanoViewer.lookAt(Number(rack.pitch) || 0, Number(rack.yaw) || 0, 100, 600); } catch (e) {}
        }
        updateTemporaryHotspotMarker(rack.pitch, rack.yaw);

        const coordPreview = document.getElementById('form-coord-preview');
        const badge = document.getElementById('mapper-coord-badge');
        if (coordPreview) coordPreview.textContent = `Pitch: ${rack.pitch}° | Yaw: ${rack.yaw}°`;
        if (badge) {
            badge.style.display = 'inline-block';
            badge.textContent = `${rack.pitch}°, ${rack.yaw}°`;
        }

        if (window.innerWidth <= 768 && typeof setMapperMobileView === 'function') {
            setMapperMobileView('form');
        }

        showAdminToast(`✏️ Memuat "${rack.title}" untuk disunting.`, 'info');
    }

    function renderMapperRoomRacksList(racks) {
        const tbody = document.getElementById('mapper-room-racks-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!racks || racks.length === 0) {
            const emptyTr = document.createElement('tr');
            emptyTr.innerHTML = '<td colspan="5" style="text-align:center;color:#64748b;padding:1.25rem;">Belum ada titik lemari / rak depo arsip yang ditandai di ruangan ini. Klik objek pada panorama di atas lalu isi formulir di sebelah kanan untuk menambahkannya.</td>';
            tbody.appendChild(emptyTr);
            return;
        }
        racks.forEach(rk => {
            const tr = document.createElement('tr');

            const tdTitle = document.createElement('td');
            tdTitle.style.fontWeight = '700';
            tdTitle.textContent = rk.title;

            const tdDdc = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'badge-instansi';
            badge.style.cssText = 'background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;';
            badge.textContent = rk.category_code || '-';
            tdDdc.appendChild(badge);

            const tdLoc = document.createElement('td');
            tdLoc.style.cssText = 'color:#64748b;font-size:0.78rem;';
            tdLoc.textContent = rk.location_notes || '-';

            const tdCoord = document.createElement('td');
            tdCoord.textContent = `Pitch: ${rk.pitch}° | Yaw: ${rk.yaw}°`;

            const tdAction = document.createElement('td');
            tdAction.style.textAlign = 'center';
            const actBox = document.createElement('div');
            actBox.className = 'action-buttons-cell';
            actBox.style.justifyContent = 'center';

            const btnEdit = document.createElement('button');
            btnEdit.type = 'button';
            btnEdit.className = 'btn-table-edit';
            btnEdit.textContent = '✏️ Edit';
            btnEdit.addEventListener('click', () => loadRackIntoMapperForm(rk.id));

            const btnDel = document.createElement('button');
            btnDel.type = 'button';
            btnDel.className = 'btn-table-delete';
            btnDel.textContent = '🗑️ Hapus';
            btnDel.addEventListener('click', async () => {
                if (confirm(`Apakah Anda yakin ingin menghapus "${rk.title}" beserta daftar inventaris boks & surat arsipnya?`)) {
                    try {
                        await DataService.deleteRack(rk.id);
                        showAdminToast('Titik lemari / rak depo arsip berhasil dihapus.', 'info');
                        await initHotspotMapperRoom();
                        refreshRecordsTable();
                    } catch (err) {
                        console.error('Gagal menghapus rak:', err);
                        showAdminToast(`❌ ${err.message || 'Gagal menghapus rak di database.'}`, 'error');
                    }
                }
            });

            actBox.appendChild(btnEdit);
            actBox.appendChild(btnDel);
            tdAction.appendChild(actBox);

            tr.appendChild(tdTitle);
            tr.appendChild(tdDdc);
            tr.appendChild(tdLoc);
            tr.appendChild(tdCoord);
            tr.appendChild(tdAction);
            tbody.appendChild(tr);
        });
    }

    mapperSelectRoom?.addEventListener('change', initHotspotMapperRoom);

    // SRS-FR-14: Manajemen Baris Inventaris Boks & Surat Arsip Dinamis
    btnAddBookRow?.addEventListener('click', () => {
        addBookTableRow('', '', '', 1, 'Arsip Terbuka');
    });

    function addBookTableRow(title = '', author = '', year = '', copies = 1, status = 'Arsip Terbuka') {
        const normalizedStatus = ['Arsip Terbuka', 'Akses Terbatas', 'Sedang Dipinjam'].includes(status)
            ? status
            : (status === 'Baca di Tempat' ? 'Akses Terbatas' : 'Arsip Terbuka');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="book-row-title" placeholder="cth: Boks B-04: SK Bupati & Kepegawaian"></td>
            <td><input type="text" class="book-row-author" placeholder="cth: Sekretariat Daerah / Bidang Umum"></td>
            <td style="width:110px;"><input type="text" class="book-row-year" placeholder="2019 - 2021"></td>
            <td style="width:76px;"><input type="number" class="book-row-copies" min="1" title="Jumlah Boks / Sampul"></td>
            <td style="width:150px;">
                <select class="book-row-status">
                    <option value="Arsip Terbuka">Arsip Terbuka</option>
                    <option value="Akses Terbatas">Akses Terbatas</option>
                    <option value="Sedang Dipinjam">Sedang Dipinjam</option>
                </select>
            </td>
            <td style="width:38px;text-align:center;">
                <button type="button" class="btn-remove-row" title="Hapus Baris">✕</button>
            </td>
        `;

        tr.querySelector('.book-row-title').value = title || '';
        tr.querySelector('.book-row-author').value = author || '';
        tr.querySelector('.book-row-year').value = year || '';
        tr.querySelector('.book-row-copies').value = Number(copies) || 1;
        tr.querySelector('.book-row-status').value = normalizedStatus;

        tr.querySelector('.btn-remove-row')?.addEventListener('click', () => {
            tr.remove();
        });

        rackBooksTbody?.appendChild(tr);
    }

    formRack?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const roomId = Number(mapperSelectRoom.value);
        const rackId = formRack.getAttribute('data-id');

        if (!rackInputPitch.value || !rackInputYaw.value) {
            showAdminToast('⚠️ Klik tepat di posisi lemari / rak pada foto panorama sebelah kiri untuk mengunci koordinat Pitch & Yaw!', 'warning');
            return;
        }

        const rackData = {
            id: rackId ? Number(rackId) : undefined,
            room_id: roomId,
            title: rackInputTitle.value.trim(),
            category_code: rackInputDDC.value.trim(),
            location_notes: rackInputLocation.value.trim(),
            pitch: parseFloat(rackInputPitch.value) || 0.0,
            yaw: parseFloat(rackInputYaw.value) || 0.0,
            search_tags: rackInputTags.value.trim(),
            rack_photo_url: rackInputPhoto.value.trim() || 'assets/images/depo-arsip-front.jpg'
        };

        try {
            const savedRack = await DataService.saveRack(rackData);

            // Ambil daftar boks & surat arsip dari baris tabel (baris kosong otomatis dilewati)
            const bookRows = rackBooksTbody.querySelectorAll('tr');
            const booksList = [];
            bookRows.forEach(row => {
                const title = row.querySelector('.book-row-title').value.trim();
                if (title) {
                    booksList.push({
                        title: title,
                        author: row.querySelector('.book-row-author').value.trim(),
                        publish_year: row.querySelector('.book-row-year').value.trim(),
                        copies: Number(row.querySelector('.book-row-copies').value) || 1,
                        status: row.querySelector('.book-row-status').value
                    });
                }
            });

            // Simpan inventaris boks & surat arsip ke database
            await DataService.saveRackBooks(savedRack.id, booksList);

            showAdminToast(`✅ Titik "${rackData.title}" berhasil disimpan ke ruangan ini!`, 'success');
            resetRackForm();
            await initHotspotMapperRoom();
            refreshRecordsTable();
        } catch (err) {
            console.error('Gagal menyimpan titik lemari / rak:', err);
            showAdminToast(`❌ Gagal menyimpan rak: ${err.message || 'Periksa ukuran foto atau koneksi.'}`, 'error');
        }
    });

    const btnRackReset = document.getElementById('btn-rack-reset');

    function resetRackForm(showToast = false) {
        formRack.removeAttribute('data-id');
        rackInputTitle.value = '';
        rackInputDDC.value = '';
        rackInputLocation.value = '';
        rackInputPitch.value = '';
        rackInputYaw.value = '';
        rackInputTags.value = '';
        if (rackInputPhoto) rackInputPhoto.value = 'assets/images/depo-arsip-front.jpg';
        uploaderRackPhoto?.showPreview('assets/images/depo-arsip-front.jpg', 'depo-arsip-front.jpg (Bawaan)', true);
        rackBooksTbody.innerHTML = '';
        addBookTableRow('', '', '', 1, 'Arsip Terbuka');
        
        const submitBtn = document.getElementById('btn-rack-submit');
        if (submitBtn) {
            submitBtn.innerHTML = '<span>💾</span> Simpan Lemari / Rak &amp; Daftar Boks Arsip';
        }
        if (btnRackReset) {
            btnRackReset.innerHTML = '<span>➕</span> Lemari / Rak Baru';
        }

        if (adminPanoViewer && !isMapperFallbackMode) {
            try { adminPanoViewer.removeHotSpot(tempHotspotId); } catch(e) {}
        }
        const floatingBar = document.getElementById('mapper-floating-bar');
        const badge = document.getElementById('mapper-coord-badge');
        const coordPreview = document.getElementById('form-coord-preview');
        if (floatingBar) floatingBar.style.display = 'none';
        if (badge) badge.style.display = 'none';
        if (coordPreview) coordPreview.textContent = 'Belum ada titik dipilih';

        if (window.innerWidth <= 768 && typeof setMapperMobileView === 'function') {
            setMapperMobileView('canvas');
        }

        if (showToast) {
            showAdminToast('✨ Formulir Tambah Lemari / Rak Depo Arsip siap. Silakan klik foto panorama untuk menangkap sudut Pitch & Yaw.', 'info');
        }
    }

    btnRackReset?.addEventListener('click', () => {
        if (rackInputTitle.value.trim() !== '') {
            if (!rackInputPitch.value || !rackInputYaw.value) {
                showAdminToast('⚠️ Silakan klik pada gambar panorama di sebelah kiri untuk mengunci koordinat Pitch & Yaw lemari/rak!', 'warning');
                document.getElementById('admin-mapper-viewer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (formRack.reportValidity()) {
                formRack.requestSubmit();
                return;
            }
        }

        resetRackForm(true);
        formRack.classList.add('admin-card-highlight');
        setTimeout(() => formRack.classList.remove('admin-card-highlight'), 1200);
        formRack.scrollIntoView({ behavior: 'smooth', block: 'center' });
        rackInputTitle.focus();
    });

    // =========================================================================
    // TAB 4: KELOLA DATA TABLES (EDIT & DELETE)
    // =========================================================================
    async function refreshRecordsTable() {
        const floors = await DataService.getFloors('Kearsipan');
        const rooms = await DataService.getAllRooms();
        const racks = await DataService.getAllRacks();

        const getRoomFloorNum = (r) => {
            if (r.floors?.floor_number) return Number(r.floors.floor_number);
            const matchedFloor = floors.find(f => Number(f.id) === Number(r.floor_id));
            return matchedFloor ? Number(matchedFloor.floor_number) : (Number(r.floor_id) % 2 === 1 ? 1 : 2);
        };

        // Update Statistik di Menu Registrasi Ruangan Gedung Kearsipan
        const statTotal = document.getElementById('stat-total-rooms');
        const statFloor1 = document.getElementById('stat-floor1-rooms');
        const statFloor2 = document.getElementById('stat-floor2-rooms');
        if (statTotal) statTotal.textContent = `${rooms.length} Ruangan`;
        if (statFloor1) statFloor1.textContent = `${rooms.filter(r => getRoomFloorNum(r) === 1).length} Ruangan`;
        if (statFloor2) statFloor2.textContent = `${rooms.filter(r => getRoomFloorNum(r) === 2).length} Ruangan`;

        // 1. Render Tabel Ruangan di Tab Registrasi Ruangan (#table-tab-rooms-tbody)
        const tabRoomsTbody = document.getElementById('table-tab-rooms-tbody');
        if (tabRoomsTbody) {
            tabRoomsTbody.innerHTML = '';
            rooms.forEach((r, idx) => {
                const floorNum = getRoomFloorNum(r);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:700; color:var(--admin-muted); text-align:center;">${idx + 1}</td>
                    <td>
                        <strong style="color:var(--admin-navy);">${r.name}</strong>
                    </td>
                    <td>
                        <span class="badge-instansi" style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:700;">
                            Lantai ${floorNum} — Gedung Kearsipan
                        </span>
                    </td>
                    <td style="color:#64748b; font-size:0.78rem;">${(r.nearby_notes || '-').substring(0, 55)}${(r.nearby_notes || '').length > 55 ? '...' : ''}</td>
                    <td>
                        <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:0.75rem; color:#0f172a; border:1px solid #e2e8f0;">X: ${r.map_x}% | Y: ${r.map_y}%</code>
                    </td>
                    <td style="text-align:center;">
                        <div class="action-buttons-cell" style="justify-content:center;">
                            <button type="button" class="btn-table-edit" data-id="${r.id}" data-type="room" title="Ubah data ruangan">✏️ Edit</button>
                            <button type="button" class="btn-table-delete" data-id="${r.id}" data-type="room" title="Hapus ruangan">🗑️ Hapus</button>
                        </div>
                    </td>
                `;
                tabRoomsTbody.appendChild(tr);
            });
            applyRoomSearchFilter();
        }

        // 2. Render Tabel Ruangan di Tab Kelola Data (#table-rooms-tbody)
        const roomsTbody = document.getElementById('table-rooms-tbody');
        if (roomsTbody) {
            roomsTbody.innerHTML = '';
            rooms.forEach(r => {
                const floorNum = getRoomFloorNum(r);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:700;">${r.name}</td>
                    <td>Lantai ${floorNum} — Gedung Kearsipan</td>
                    <td>${(r.nearby_notes || '').substring(0, 50)}...</td>
                    <td>X: ${r.map_x}% | Y: ${r.map_y}%</td>
                    <td>
                        <div class="action-buttons-cell">
                            <button type="button" class="btn-table-edit" data-id="${r.id}" data-type="room">Ubah</button>
                            <button type="button" class="btn-table-delete" data-id="${r.id}" data-type="room">Hapus</button>
                        </div>
                    </td>
                `;
                roomsTbody.appendChild(tr);
            });
        }

        // 3. Render Tabel Lemari / Rak di Tab Kelola Data (#table-racks-tbody)
        const racksTbody = document.getElementById('table-racks-tbody');
        if (racksTbody) {
            racksTbody.innerHTML = '';
            racks.forEach(rk => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:700;">${rk.title}</td>
                    <td>${rk.rooms?.name || 'Ruangan'}</td>
                    <td><span class="badge-instansi" style="background:#e0f2fe;color:#0369a1;padding:2px 6px;border-radius:4px;">${rk.category_code || '-'}</span></td>
                    <td>Pitch: ${rk.pitch}° | Yaw: ${rk.yaw}°</td>
                    <td>
                        <div class="action-buttons-cell">
                            <button type="button" class="btn-table-edit" data-id="${rk.id}" data-type="rack">Ubah</button>
                            <button type="button" class="btn-table-delete" data-id="${rk.id}" data-type="rack">Hapus</button>
                        </div>
                    </td>
                `;
                racksTbody.appendChild(tr);
            });
        }

        // Terapkan filter pencarian di Tab Kelola jika sedang ada kata kunci
        applyKelolaSearchFilter();

        // Event listener Edit & Delete
        attachTableActionListeners();
    }

    function attachTableActionListeners() {
        // Edit Room (Membuka Modal Registrasi Ruangan dalam mode Edit)
        document.querySelectorAll('.btn-table-edit[data-type="room"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const room = await DataService.getRoomById(id);
                if (room) {
                    openRoomModal('edit', room);
                }
            });
        });

        // Delete Room
        document.querySelectorAll('.btn-table-delete[data-type="room"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Apakah Anda yakin ingin menghapus ruangan ini beserta seluruh titik lemari/rak dan daftar boks arsipnya?')) {
                    try {
                        await DataService.deleteRoom(id);
                        showAdminToast('Ruangan berhasil dihapus.', 'info');
                        await loadInitialAdminData();
                        refreshRecordsTable();
                    } catch (err) {
                        console.error('Gagal menghapus ruangan:', err);
                        showAdminToast(`❌ ${err.message || 'Gagal menghapus ruangan di database.'}`, 'error');
                    }
                }
            });
        });

        // Edit Rack
        document.querySelectorAll('.btn-table-edit[data-type="rack"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const rack = await DataService.getRackById(id);
                if (rack) {
                    document.querySelector('.admin-nav-item[data-tab="tab-hotspot-mapper"]').click();
                    mapperSelectRoom.value = rack.room_id;
                    await initHotspotMapperRoom();
                    await loadRackIntoMapperForm(rack.id);
                }
            });
        });

        // Delete Rack
        document.querySelectorAll('.btn-table-delete[data-type="rack"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Apakah Anda yakin ingin menghapus lemari / rak depo arsip ini beserta daftar boks surat arsipnya?')) {
                    try {
                        await DataService.deleteRack(id);
                        showAdminToast('Lemari / rak depo arsip berhasil dihapus.', 'info');
                        await initHotspotMapperRoom();
                        refreshRecordsTable();
                    } catch (err) {
                        console.error('Gagal menghapus rak:', err);
                        showAdminToast(`❌ ${err.message || 'Gagal menghapus rak di database.'}`, 'error');
                    }
                }
            });
        });
    }

    // =========================================================================
    // =========================================================================
    // TAB 5: KONFIGURASI BACKEND & DATABASE (TURSO / SUPABASE)
    // =========================================================================
    const providerTursoRadio = document.getElementById('provider-turso');
    const providerSupabaseRadio = document.getElementById('provider-supabase');
    const inputTursoUrl = document.getElementById('config-turso-url');
    const inputTursoToken = document.getElementById('config-turso-token');
    const formTursoConfig = document.getElementById('form-turso-config');
    const btnTestTurso = document.getElementById('btn-test-turso');

    const inputSupabaseUrl = document.getElementById('config-supabase-url');
    const inputSupabaseKey = document.getElementById('config-supabase-key');
    const formSupabaseConfig = document.getElementById('form-supabase-config');
    const btnResetSeedData = document.getElementById('btn-reset-seed-data');

    const elSupabaseStatus = document.getElementById('supabase-connection-status');

    async function refreshDatabaseStatusBanner() {
        if (!elSupabaseStatus || typeof DataService.getConnectionStatus !== 'function') return;
        const st = await DataService.getConnectionStatus();
        if (st.provider === 'turso') {
            if (!st.url || !st.hasKey) {
                elSupabaseStatus.style.cssText = 'margin-bottom:1.15rem;padding:0.85rem 1rem;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;font-size:0.82rem;color:#475569;';
                elSupabaseStatus.innerHTML = '⚡ <strong>Mode Turso Database:</strong> Database URL &amp; Auth Token belum dikonfigurasi. Masukkan kredensial Turso Anda di bawah untuk mengaktifkan sinkronisasi.';
            } else if (!st.connected) {
                elSupabaseStatus.style.cssText = 'margin-bottom:1.15rem;padding:0.85rem 1rem;border-radius:10px;border:1px solid #fecaca;background:#fef2f2;font-size:0.82rem;color:#991b1b;';
                elSupabaseStatus.textContent = `🔴 Gagal terhubung ke Turso Database (${st.error || 'Periksa Database URL & Auth Token'}).`;
            } else {
                elSupabaseStatus.style.cssText = 'margin-bottom:1.15rem;padding:0.85rem 1rem;border-radius:10px;border:1px solid #a7f3d0;background:#ecfdf5;font-size:0.82rem;color:#065f46;';
                elSupabaseStatus.innerHTML = `🟢 <strong>Terhubung penuh ke Turso Database (libSQL / SQLite):</strong> <code>${st.url}</code>. Seluruh data denah, ruangan, dan rak aktif tersinkronisasi.`;
            }
            return;
        }

        // Supabase status
        if (!st.url || !st.hasKey) {
            elSupabaseStatus.style.cssText = 'margin-bottom:1.15rem;padding:0.85rem 1rem;border-radius:10px;border:1px solid #cbd5e1;background:#f8fafc;font-size:0.82rem;color:#475569;';
            elSupabaseStatus.innerHTML = '⚪ <strong>Mode Penyimpanan Lokal (Browser Cache):</strong> Project URL &amp; Anon Key belum disimpan. Perubahan/hapus data saat ini hanya tersimpan di browser ini dan belum masuk ke database Supabase.';
        } else if (!st.connected) {
            elSupabaseStatus.style.cssText = 'margin-bottom:1.15rem;padding:0.85rem 1rem;border-radius:10px;border:1px solid #fecaca;background:#fef2f2;font-size:0.82rem;color:#991b1b;';
            elSupabaseStatus.textContent = `🔴 Gagal terhubung ke Supabase (${st.error || 'Periksa Project URL / Anon Key / tabel SQL'}).`;
        } else if (!st.hasAuthSession) {
            elSupabaseStatus.style.cssText = 'margin-bottom:1.15rem;padding:0.85rem 1rem;border-radius:10px;border:1px solid #fde68a;background:#fffbeb;font-size:0.82rem;color:#92400e;';
            elSupabaseStatus.innerHTML = '🟠 <strong>Terhubung ke Supabase (Mode Baca Saja):</strong> Sesi login Supabase Auth belum aktif sehingga simpan/hapus ke database akan ditolak RLS. Klik <strong>Keluar</strong> di kanan atas lalu login ulang memakai akun yang sudah dibuat di <em>Authentication → Users</em> Supabase.';
        } else {
            elSupabaseStatus.style.cssText = 'margin-bottom:1.15rem;padding:0.85rem 1rem;border-radius:10px;border:1px solid #a7f3d0;background:#ecfdf5;font-size:0.82rem;color:#065f46;';
            elSupabaseStatus.textContent = `🟢 Terhubung penuh ke Supabase Cloud (${st.authEmail || 'Authenticated'}). Semua aksi Simpan & Hapus langsung tersinkron ke database.`;
        }
    }

    const currentActiveProvider = typeof DataService.getProvider === 'function' ? DataService.getProvider() : 'supabase';
    if (currentActiveProvider === 'turso' && providerTursoRadio) {
        providerTursoRadio.checked = true;
    } else if (providerSupabaseRadio) {
        providerSupabaseRadio.checked = true;
    }

    providerTursoRadio?.addEventListener('change', () => {
        if (providerTursoRadio.checked) {
            DataService.setProvider('turso');
            showAdminToast('Provider dialihkan ke Turso Database', 'info');
            refreshDatabaseStatusBanner();
        }
    });

    providerSupabaseRadio?.addEventListener('change', () => {
        if (providerSupabaseRadio.checked) {
            DataService.setProvider('supabase');
            showAdminToast('Provider dialihkan ke Supabase Cloud', 'info');
            refreshDatabaseStatusBanner();
        }
    });

    if (inputTursoUrl && window.TursoClient) {
        const tConf = window.TursoClient.getConfig();
        inputTursoUrl.value = tConf.url || '';
        inputTursoToken.value = tConf.token || '';
    }

    formTursoConfig?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = inputTursoUrl.value.trim();
        const token = inputTursoToken.value.trim();
        if (!url || !token) {
            showAdminToast('Masukkan Database URL dan Auth Token Turso terlebih dahulu!', 'warning');
            return;
        }
        window.TursoClient.saveConfig(url, token);
        DataService.setProvider('turso');
        if (providerTursoRadio) providerTursoRadio.checked = true;
        showAdminToast('Koneksi Turso disimpan! Menguji koneksi...', 'info');
        const test = await window.TursoClient.testConnection(url, token);
        if (test.connected) {
            showAdminToast('✅ Sukses terhubung ke Turso Database!', 'success');
            setTimeout(() => window.location.reload(), 1200);
        } else {
            showAdminToast('⚠️ ' + test.message, 'error');
            refreshDatabaseStatusBanner();
        }
    });

    btnTestTurso?.addEventListener('click', async () => {
        const url = inputTursoUrl.value.trim();
        const token = inputTursoToken.value.trim();
        if (!url || !token) {
            showAdminToast('Isi Database URL dan Token untuk menguji koneksi.', 'warning');
            return;
        }
        btnTestTurso.textContent = '⏳ Menguji...';
        btnTestTurso.disabled = true;
        const test = await window.TursoClient.testConnection(url, token);
        btnTestTurso.textContent = '🔍 Tes Koneksi';
        btnTestTurso.disabled = false;
        if (test.connected) {
            alert('✅ Berhasil terhubung ke Turso Database!\nWaktu Server: ' + test.serverTime);
        } else {
            alert('❌ Gagal terhubung ke Turso Database:\n' + test.message);
        }
    });

    if (inputSupabaseUrl) {
        const cfg = typeof DataService.getActiveConfig === 'function'
            ? DataService.getActiveConfig()
            : { url: safeStorage.getItem('disarpus_supabase_url') || '', anonKey: safeStorage.getItem('disarpus_supabase_key') || '' };
        inputSupabaseUrl.value = cfg.url || '';
        inputSupabaseKey.value = cfg.anonKey || '';
        refreshDatabaseStatusBanner();
    }

    formSupabaseConfig?.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawUrl = inputSupabaseUrl.value.trim();
        const url = typeof DataService.normalizeSupabaseUrl === 'function'
            ? DataService.normalizeSupabaseUrl(rawUrl)
            : rawUrl;
        const key = inputSupabaseKey.value.trim();

        inputSupabaseUrl.value = url;
        safeStorage.setItem('disarpus_supabase_url', url);
        safeStorage.setItem('disarpus_supabase_key', key);
        DataService.setProvider('supabase');
        if (providerSupabaseRadio) providerSupabaseRadio.checked = true;

        showAdminToast('Konfigurasi Supabase disimpan & diaktifkan! Sistem dimuat ulang...', 'success');
        setTimeout(() => window.location.reload(), 1200);
    });

    btnResetSeedData?.addEventListener('click', () => {
        if (confirm('Kembalikan seluruh data denah Lantai 1 & Lantai 2 Gedung Kearsipan, ruangan, lemari/rak depo arsip, dan daftar boks surat arsip ke kondisi bawaan?')) {
            DataService.resetDemoData();
        }
    });

    // =========================================================================
    // LOAD INITIAL DATA DROPDOWNS
    // =========================================================================
    async function loadInitialAdminData() {
        const floors = await DataService.getFloors('Kearsipan');
        const rooms = await DataService.getAllRooms();

        // 1. Isi dropdown Lantai pada form Ruangan (Khusus Gedung Kearsipan)
        if (roomSelectFloor) {
            roomSelectFloor.innerHTML = '';
            floors.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = f.name || `Lantai ${f.floor_number} - Gedung Kearsipan`;
                roomSelectFloor.appendChild(opt);
            });
            updateRoomPickerFloorMap();
        }

        // 2. Isi dropdown Ruangan pada form Hotspot Mapper
        if (mapperSelectRoom) {
            const prevRoomId = mapperSelectRoom.value;
            mapperSelectRoom.innerHTML = '';
            rooms.forEach(r => {
                const floorNum = r.floors?.floor_number || (Number(r.floor_id) === 1 ? 1 : 2);
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = `${r.name} (Lantai ${floorNum})`;
                mapperSelectRoom.appendChild(opt);
            });

            if (prevRoomId && rooms.some(r => String(r.id) === String(prevRoomId))) {
                mapperSelectRoom.value = prevRoomId;
            } else {
                const depoRoom = rooms.find(r => r.name.toLowerCase().includes('depo'));
                if (depoRoom) mapperSelectRoom.value = depoRoom.id;
            }

            initHotspotMapperRoom();
        }

        // 3. Muat data denah default
        loadFloorFormData();

        // 4. Baris inventaris boks default pada form lemari/rak
        if (rackBooksTbody && rackBooksTbody.children.length === 0) {
            addBookTableRow('', '', '', 1, 'Arsip Terbuka');
        }

        // 5. Muat tabel data kelola
        await refreshRecordsTable();
    }

    // =========================================================================
    // MODAL GENERATOR & CETAK QR CODE KIOSK / AKSES PENGUNJUNG
    // =========================================================================
    const modalAdminQr = document.getElementById('modal-admin-qr');
    const btnAdminQr = document.getElementById('btn-admin-qr');
    const btnAdminQrClose = document.getElementById('btn-admin-qr-close');
    const btnAdminQrFooterClose = document.getElementById('btn-admin-qr-footer-close');
    const btnAdminQrReset = document.getElementById('btn-admin-qr-reset');
    const btnAdminQrCopy = document.getElementById('btn-admin-qr-copy');
    const btnAdminQrDownload = document.getElementById('btn-admin-qr-download');
    const btnAdminQrPrint = document.getElementById('btn-admin-qr-print');
    const adminQrRenderEl = document.getElementById('admin-qr-code-render');
    const adminQrUrlInput = document.getElementById('admin-qr-url-input');
    const adminQrHintEl = document.getElementById('admin-qr-network-hint');
    let adminLastAutoQrUrl = '';

    function renderAdminQr(rawUrl) {
        if (!adminQrRenderEl) return;
        const cleanUrl = (rawUrl || '').trim();
        if (!cleanUrl) {
            adminQrRenderEl.innerHTML = '<div style="font-size:0.75rem;color:#64748b;padding:1rem;">Masukkan alamat URL untuk membuat QR Code.</div>';
            return;
        }
        try {
            if (!window.QRCodeGenerator) throw new Error('Generator QR belum dimuat.');
            adminQrRenderEl.innerHTML = window.QRCodeGenerator.toSvgString(cleanUrl, {
                displaySize: 196,
                quietZone: 4,
                darkColor: '#0f172a',
                lightColor: '#ffffff'
            });
        } catch (err) {
            adminQrRenderEl.textContent = err.message || 'URL terlalu panjang untuk QR Code.';
        }
    }

    function setAdminQrHint(message, variant) {
        if (!adminQrHintEl) return;
        adminQrHintEl.textContent = message;
        adminQrHintEl.classList.remove('is-ready', 'is-warning');
        if (variant === 'ready') adminQrHintEl.classList.add('is-ready');
        else if (variant === 'warning') adminQrHintEl.classList.add('is-warning');
    }

    async function resolveBestAdminQrUrl() {
        const proto = window.location.protocol;
        const host = window.location.hostname;
        
        // Tautan pengunjung selalu mengarah ke index.html
        let pathname = window.location.pathname || '';
        if (pathname.endsWith('admin.html')) {
            pathname = pathname.replace(/admin\.html$/, 'index.html');
        } else if (pathname.endsWith('/admin') || pathname === 'admin') {
            pathname = pathname.replace(/\/?admin$/, '/index.html');
        } else if (!pathname.endsWith('index.html')) {
            pathname = pathname.replace(/\/$/, '') + '/index.html';
        }

        if (proto === 'file:') {
            setAdminQrHint('Aplikasi dibuka lewat file://. Agar pengunjung bisa scan lewat HP, jalankan lewat server lokal atau masukkan domain hosting resmi Anda di bawah.', 'warning');
            return 'https://disarpus.cirebonkab.go.id/index.html';
        }

        const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '::1';
        if (isLoopback) {
            try {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), 1200);
                const resp = await fetch('/api/network-info', { signal: controller.signal });
                clearTimeout(timer);
                if (resp.ok) {
                    const info = await resp.json();
                    if (info.primaryLanIp) {
                        const portPart = window.location.port ? `:${window.location.port}` : '';
                        const lanUrl = `${proto}//${info.primaryLanIp}${portPart}${pathname}`;
                        setAdminQrHint(`IP Wi-Fi server terdeteksi (${info.primaryLanIp}). Cetak QR ini agar pengunjung yang terhubung ke Wi-Fi kantor dapat langsung scan.`, 'ready');
                        return lanUrl;
                    }
                }
            } catch (err) {
                // Abaikan bila server.js tidak menyediakan /api/network-info
            }
            setAdminQrHint('Sedang berjalan di localhost. Ganti localhost dengan IP Wi-Fi laptop (contoh: 192.168.1.xxx) atau domain hosting Anda agar HP pengunjung bisa membuka.', 'warning');
            return window.location.origin + pathname;
        }

        setAdminQrHint('QR siap dicetak! Mengarah langsung ke halaman publik peta Gedung Kearsipan.', 'ready');
        return window.location.origin + pathname;
    }

    async function openAdminQrModal() {
        if (!modalAdminQr) return;
        modalAdminQr.classList.add('active');
        const autoUrl = await resolveBestAdminQrUrl();
        adminLastAutoQrUrl = autoUrl;
        if (adminQrUrlInput) adminQrUrlInput.value = autoUrl;
        renderAdminQr(autoUrl);
    }

    function closeAdminQrModal() {
        if (modalAdminQr) modalAdminQr.classList.remove('active');
    }

    btnAdminQr?.addEventListener('click', openAdminQrModal);
    btnAdminQrClose?.addEventListener('click', closeAdminQrModal);
    btnAdminQrFooterClose?.addEventListener('click', closeAdminQrModal);

    modalAdminQr?.addEventListener('click', (e) => {
        if (e.target === modalAdminQr) closeAdminQrModal();
    });

    adminQrUrlInput?.addEventListener('input', () => {
        renderAdminQr(adminQrUrlInput.value);
    });

    btnAdminQrReset?.addEventListener('click', async () => {
        const autoUrl = await resolveBestAdminQrUrl();
        adminLastAutoQrUrl = autoUrl;
        if (adminQrUrlInput) adminQrUrlInput.value = autoUrl;
        renderAdminQr(autoUrl);
    });

    btnAdminQrCopy?.addEventListener('click', async () => {
        const urlToCopy = (adminQrUrlInput?.value || adminLastAutoQrUrl || '').trim();
        if (!urlToCopy) return;
        try {
            await navigator.clipboard.writeText(urlToCopy);
            showAdminToast('Tautan QR berhasil disalin ke clipboard!', 'success');
        } catch (err) {
            adminQrUrlInput?.select?.();
            document.execCommand('copy');
            showAdminToast('Tautan QR berhasil disalin.', 'success');
        }
    });

    btnAdminQrDownload?.addEventListener('click', () => {
        const urlToEncode = (adminQrUrlInput?.value || adminLastAutoQrUrl || '').trim();
        if (!urlToEncode || !window.QRCodeGenerator) return;
        try {
            const canvas = document.createElement('canvas');
            window.QRCodeGenerator.renderToCanvas(canvas, urlToEncode, {
                pixelSize: 640,
                quietZone: 4,
                darkColor: '#0f172a',
                lightColor: '#ffffff'
            });
            const link = document.createElement('a');
            link.download = 'QR-Akses-Gedung-Kearsipan-Disarpus.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            showAdminToast('Gambar QR (PNG Resolusi Tinggi) berhasil diunduh.', 'success');
        } catch (err) {
            showAdminToast(err.message || 'Gagal mengunduh gambar QR.', 'error');
        }
    });

    btnAdminQrPrint?.addEventListener('click', () => {
        const urlToEncode = (adminQrUrlInput?.value || adminLastAutoQrUrl || '').trim();
        if (!urlToEncode || !window.QRCodeGenerator) return;
        printAdminQrStandee(urlToEncode);
    });

    function printAdminQrStandee(urlToEncode) {
        if (!urlToEncode || !window.QRCodeGenerator) return;
        const canvas = document.createElement('canvas');
        window.QRCodeGenerator.renderToCanvas(canvas, urlToEncode, {
            pixelSize: 800,
            quietZone: 4,
            darkColor: '#0f172a',
            lightColor: '#ffffff'
        });
        const qrDataUrl = canvas.toDataURL('image/png');

        const printWin = window.open('', '_blank', 'width=750,height=900');
        if (!printWin) {
            showAdminToast('Izin jendela cetak terblokir. Izinkan pop-up di browser Anda.', 'warning');
            return;
        }

        printWin.document.write(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Cetak Standee QR Akses — Gedung Kearsipan Disarpus Cirebon</title>
  <style>
    @page { size: A4 portrait; margin: 1.5cm; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 2rem;
      color: #0f172a;
      text-align: center;
      background: #ffffff;
    }
    .print-card {
      border: 3px solid #0284c7;
      border-radius: 20px;
      padding: 2.5rem 2rem;
      max-width: 580px;
      margin: 0 auto;
      box-sizing: border-box;
    }
    .print-logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
      margin-bottom: 0.75rem;
    }
    .print-instansi {
      font-size: 1.1rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin: 0;
    }
    .print-sub-instansi {
      font-size: 0.95rem;
      font-weight: 700;
      color: #0284c7;
      text-transform: uppercase;
      margin: 0.2rem 0 1.25rem;
    }
    .divider {
      height: 2px;
      background: #e2e8f0;
      margin: 1rem auto 1.5rem;
      width: 80%;
    }
    .print-title {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 0.5rem;
    }
    .print-desc {
      font-size: 0.88rem;
      color: #475569;
      line-height: 1.5;
      margin: 0 auto 1.5rem;
      max-width: 440px;
    }
    .qr-container {
      display: inline-block;
      padding: 1rem;
      background: #ffffff;
      border: 2px dashed #0284c7;
      border-radius: 16px;
      margin-bottom: 1.25rem;
    }
    .qr-img {
      width: 260px;
      height: 260px;
      display: block;
    }
    .print-instruction {
      font-size: 0.92rem;
      font-weight: 700;
      color: #0284c7;
      margin: 0 0 0.5rem;
    }
    .print-url {
      font-size: 0.75rem;
      color: #64748b;
      word-break: break-all;
      background: #f1f5f9;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      display: inline-block;
    }
    .print-footer {
      margin-top: 1.75rem;
      font-size: 0.75rem;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="print-card">
    <img src="assets/images/logo-disarpus.png" alt="Logo Disarpus" class="print-logo">
    <h2 class="print-instansi">Pemerintah Kabupaten Cirebon</h2>
    <div class="print-sub-instansi">Dinas Kearsipan dan Perpustakaan</div>
    <div class="divider"></div>
    <h1 class="print-title">📱 Panduan Mandiri Gedung Kearsipan</h1>
    <p class="print-desc">Sistem Informasi Denah Digital 2D, Tur Panorama 360°, dan Pencarian Cepat Lokasi Lemari / Boks Arsip.</p>
    
    <div class="qr-container">
      <img src="${qrDataUrl}" alt="QR Code Gedung Kearsipan" class="qr-img">
    </div>

    <div class="print-instruction">📸 Buka Kamera HP Anda &amp; Pindai QR Code di Atas</div>
    <div class="print-url">${urlToEncode}</div>

    <div class="print-footer">
      Gedung Kearsipan Disarpus Kabupaten Cirebon • Jl. Sunan Drajat No. 10, Sumber
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
        `);
        printWin.document.close();
    }

    function showAdminToast(msg, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.position = 'fixed';
        toast.style.bottom = '2rem';
        toast.style.right = '2rem';
        toast.style.zIndex = '9999';
        toast.innerHTML = `<span>${msg}</span>`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // Inisialisasi Seluruh Data Dropdown, Form & Tabel setelah semua elemen dan listener siap
    try {
        await loadInitialAdminData();
    } catch (err) {
        console.error("Gagal memuat inisialisasi awal data admin:", err);
    }
});

