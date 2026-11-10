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
            item.addEventListener('click', () => {
                const targetTab = item.getAttribute('data-tab');
                navItems.forEach(n => n.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));

                item.classList.add('active');
                const targetPane = document.getElementById(targetTab);
                if (targetPane) {
                    targetPane.classList.add('active');
                    // Jika tab Hotspot Mapper diaktifkan, resize canvas pannellum
                    if (targetTab === 'tab-hotspot-mapper' && adminPanoViewer) {
                        setTimeout(() => {
                            try { adminPanoViewer.resize(); } catch (e) {}
                        }, 200);
                    }
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
    // HELPER GLOBAL: WIDGET UPLOAD BERKAS & PREVIEW (SVG / JPG / PNG / WEBP)
    // =========================================================================
    function formatMediaLabel(src, fallback = 'Berkas Terpilih') {
        if (!src) return fallback;
        if (src.startsWith('data:')) return '📷 Foto Terunggah (Tersimpan di Sistem)';
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

        if (!fileInput) return { showPreview: () => {}, hidePreview: () => {} };

        // Klik dropzone atau tombol ganti
        dropzone?.addEventListener('click', () => fileInput.click());
        btnChange?.addEventListener('click', () => fileInput.click());

        // Toggle input manual
        btnToggle?.addEventListener('click', (e) => {
            e.preventDefault();
            if (urlGroup) {
                const isHidden = urlGroup.style.display === 'none';
                urlGroup.style.display = isHidden ? 'block' : 'none';
                if (isHidden && manualInput) manualInput.focus();
            }
        });

        // Saat file dipilih dari file explorer
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            showAdminToast(`⏳ Mengoptimalkan & memuat berkas ${file.name}...`, 'info');
            try {
                const mediaUrl = await DataService.uploadMedia(file, bucket);
                if (mediaUrl) {
                    if (hiddenInput) hiddenInput.value = mediaUrl;
                    if (manualInput) manualInput.value = mediaUrl.startsWith('data:') ? '' : mediaUrl;
                    showPreview(mediaUrl, file.name);
                    showAdminToast(`✅ Berkas "${file.name}" berhasil dimuat!`, 'success');
                    if (typeof onChange === 'function') onChange(mediaUrl);
                }
            } catch (err) {
                console.error('Upload media error:', err);
                showAdminToast('⚠️ Gagal memuat berkas gambar.', 'error');
            } finally {
                fileInput.value = '';
            }
        });

        // Drag & Drop
        if (dropzone) {
            ['dragenter', 'dragover'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach(eventName => {
                dropzone.addEventListener(eventName, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dropzone.classList.remove('dragover');
                });
            });

            dropzone.addEventListener('drop', (e) => {
                const file = e.dataTransfer?.files?.[0];
                if (!file) return;
                fileInput.files = e.dataTransfer.files;
                fileInput.dispatchEvent(new Event('change'));
            });
        }

        // Sinkronisasi input manual
        if (manualInput) {
            manualInput.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                if (hiddenInput) hiddenInput.value = val;
                if (val) {
                    showPreview(val, 'Tautan URL / Path');
                } else {
                    hidePreview();
                }
                if (typeof onChange === 'function') onChange(val);
            });
        }

        function showPreview(src, name = 'Berkas Dipilih') {
            if (previewImg) previewImg.src = src;
            if (previewName) previewName.textContent = name;
            if (dropzone) dropzone.style.display = 'none';
            if (previewCard) previewCard.style.display = 'flex';
        }

        function hidePreview() {
            if (previewImg) previewImg.src = '';
            if (dropzone) dropzone.style.display = 'flex';
            if (previewCard) previewCard.style.display = 'none';
            if (fileInput) fileInput.value = '';
            if (urlGroup) urlGroup.style.display = 'none';
            if (manualInput) manualInput.value = '';
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
        const building = floorSelectBuilding.value;
        const floorNum = Number(floorSelectNumber.value);
        const floors = await DataService.getFloors();
        const floor = floors.find(f => f.building === building && Number(f.floor_number) === floorNum);

        if (floor) {
            floorInputName.value = floor.name || '';
            floorInputDesc.value = floor.description || '';
            floorInputMapUrl.value = floor.map_image_url || '';
            if (floorInputBlueprintUrl) {
                floorInputBlueprintUrl.value = floor.blueprint_image_url || floor.map_image_url || '';
            }
            formFloor.setAttribute('data-id', floor.id);

            if (floor.map_image_url) {
                uploaderFloorMap.showPreview(floor.map_image_url, floor.map_image_url.split('?')[0].split('/').pop());
            } else {
                uploaderFloorMap.hidePreview();
            }

            if (floor.blueprint_image_url) {
                uploaderFloorBlueprint.showPreview(floor.blueprint_image_url, floor.blueprint_image_url.split('?')[0].split('/').pop());
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
        const floorId = formFloor.getAttribute('data-id');
        const updated = {
            id: floorId ? Number(floorId) : undefined,
            building: floorSelectBuilding.value,
            floor_number: Number(floorSelectNumber.value),
            name: floorInputName.value.trim(),
            description: floorInputDesc.value.trim(),
            map_image_url: floorInputMapUrl.value.trim(),
            blueprint_image_url: floorInputBlueprintUrl?.value?.trim() || floorInputMapUrl.value.trim()
        };
        await DataService.saveFloor(updated);
        showAdminToast('Data Denah & Cetak Biru Lantai berhasil disimpan!', 'success');
        refreshRecordsTable();
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
                uploaderRoomPhoto.showPreview(room.room_photo_url, formatMediaLabel(room.room_photo_url, 'ruang-pa-front.jpg'));
            } else {
                uploaderRoomPhoto.hidePreview();
            }
            if (room.panorama_image_url) {
                uploaderRoomPano.showPreview(room.panorama_image_url, formatMediaLabel(room.panorama_image_url, 'ruang-pa-pano.jpg'));
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
            short_name: nameVal.length > 20 ? nameVal.substring(0, 18) + '...' : nameVal,
            nearby_notes: roomInputNearby.value.trim(),
            services_info: roomInputServices.value.trim(),
            room_photo_url: roomInputPhoto.value.trim() || 'assets/images/ruang-pa-front.jpg',
            panorama_image_url: roomInputPano.value.trim() || 'assets/images/ruang-babad-pano.jpg',
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
        uploaderRoomPhoto?.showPreview('assets/images/ruang-pa-front.jpg', 'ruang-pa-front.jpg (Bawaan)');
        uploaderRoomPano?.showPreview('assets/images/ruang-pa-pano.jpg', 'ruang-pa-pano.jpg (Bawaan)');
    }

    // Filter live search di tabel ruangan
    filterRoomSearch?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        document.querySelectorAll('#table-tab-rooms-tbody tr').forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(query) ? '' : 'none';
        });
    });

    // =========================================================================
    // TAB 3: VISUAL HOTSPOT MAPPER & INPUT KATALOG BUKU (SRS-FR-13 & SRS-FR-14)
    // =========================================================================
    let adminPanoViewer = null;
    let isMapperFallbackMode = false;
    const mapperSelectRoom = document.getElementById('mapper-select-room');
    const mapperFilePano = document.getElementById('mapper-file-pano');
    const btnMapperUploadPano = document.getElementById('btn-mapper-upload-pano');
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

    // Klik langsung pada viewer Pannellum (didaftarkan sekali)
    let mapperMouseDownPos = null;
    viewerEl?.addEventListener('mousedown', (ev) => {
        mapperMouseDownPos = { x: ev.clientX, y: ev.clientY };
    });
    viewerEl?.addEventListener('mouseup', (event) => {
        if (isMapperFallbackMode || !adminPanoViewer) return;
        // Abaikan jika admin sedang menggeser (drag) kamera, hanya tangkap klik titik
        if (mapperMouseDownPos) {
            const dist = Math.hypot(event.clientX - mapperMouseDownPos.x, event.clientY - mapperMouseDownPos.y);
            if (dist > 6) return;
        }
        try {
            const coords = adminPanoViewer.mouseEventToCoords(event);
            if (coords && coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                const pitch = coords[0].toFixed(2);
                const yaw = coords[1].toFixed(2);
                if (rackInputPitch) rackInputPitch.value = pitch;
                if (rackInputYaw) rackInputYaw.value = yaw;
                showAdminToast(`🎯 Hotspot Terkunci! Pitch: ${pitch}°, Yaw: ${yaw}°`, 'info');
            }
        } catch (err) {
            console.log('Coords calculation:', err);
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
                if (rackInputPitch) rackInputPitch.value = calcPitch.toFixed(2);
                if (rackInputYaw) rackInputYaw.value = calcYaw.toFixed(2);
                showAdminToast(`🎯 Hotspot Terkunci! Pitch: ${calcPitch.toFixed(2)}°, Yaw: ${calcYaw.toFixed(2)}°`, 'info');
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
                mapperPanoStatus.textContent = '✅ Foto panorama ruangan ini sudah kustom';
                mapperPanoStatus.style.color = '#16a34a';
            } else {
                mapperPanoStatus.textContent = 'ℹ️ Masih memakai foto panorama bawaan — klik tombol di kanan untuk upload foto asli ruangan';
                mapperPanoStatus.style.color = '#d97706';
            }
        }

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
                    hfov: 100
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

    // Upload / ganti panorama langsung dari tab Visual Hotspot Mapper
    btnMapperUploadPano?.addEventListener('click', () => {
        if (!mapperSelectRoom?.value) {
            showAdminToast('⚠️ Pilih ruangan terlebih dahulu.', 'warning');
            return;
        }
        mapperFilePano?.click();
    });

    mapperFilePano?.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file || !mapperSelectRoom?.value) return;

        const roomId = mapperSelectRoom.value;
        showAdminToast(`⏳ Mengunggah & mengoptimalkan panorama "${file.name}"...`, 'info');
        try {
            const room = await DataService.getRoomById(roomId);
            if (!room) throw new Error('Ruangan tidak ditemukan.');

            const mediaUrl = await DataService.uploadMedia(file, 'panoramas');
            await DataService.saveRoom({ ...room, panorama_image_url: mediaUrl });

            showAdminToast(`✅ Foto panorama untuk "${room.name}" berhasil diperbarui!`, 'success');
            await initHotspotMapperRoom();
            refreshRecordsTable();
        } catch (err) {
            console.error('Upload panorama langsung gagal:', err);
            showAdminToast(`❌ Gagal menyimpan panorama: ${err.message || 'Cek ukuran foto'}`, 'error');
        } finally {
            mapperFilePano.value = '';
        }
    });

    mapperSelectRoom?.addEventListener('change', initHotspotMapperRoom);

    // SRS-FR-14: Manajemen Baris Buku Dinamis (+ Tambah Buku)
    btnAddBookRow?.addEventListener('click', () => {
        addBookTableRow('', '', '', 1, 'Baca di Tempat');
    });

    function addBookTableRow(title = '', author = '', year = '', copies = 1, status = 'Baca di Tempat') {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="book-row-title" placeholder="Judul Buku / Naskah" value="${title}" required></td>
            <td><input type="text" class="book-row-author" placeholder="Nama Pengarang" value="${author}"></td>
            <td style="width:100px;"><input type="text" class="book-row-year" placeholder="Tahun" value="${year}"></td>
            <td style="width:70px;"><input type="number" class="book-row-copies" min="1" value="${copies}"></td>
            <td style="width:140px;">
                <select class="book-row-status">
                    <option value="Baca di Tempat" ${status === 'Baca di Tempat' ? 'selected' : ''}>Baca di Tempat</option>
                    <option value="Boleh Dipinjam" ${status === 'Boleh Dipinjam' ? 'selected' : ''}>Boleh Dipinjam</option>
                </select>
            </td>
            <td style="width:40px;text-align:center;">
                <button type="button" class="btn-remove-row" title="Hapus Buku">✕</button>
            </td>
        `;

        tr.querySelector?.('.btn-remove-row')?.addEventListener('click', () => {
            tr.remove();
        });

        rackBooksTbody?.appendChild(tr);
    }

    formRack?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const roomId = Number(mapperSelectRoom.value);
        const rackId = formRack.getAttribute('data-id');

        const rackData = {
            id: rackId ? Number(rackId) : undefined,
            room_id: roomId,
            title: rackInputTitle.value.trim(),
            category_code: rackInputDDC.value.trim(),
            location_notes: rackInputLocation.value.trim(),
            pitch: parseFloat(rackInputPitch.value) || 0.0,
            yaw: parseFloat(rackInputYaw.value) || 0.0,
            search_tags: rackInputTags.value.trim(),
            rack_photo_url: rackInputPhoto.value.trim() || 'assets/images/rak-03-babad.jpg'
        };

        const savedRack = await DataService.saveRack(rackData);

        // Ambil daftar buku dari baris tabel
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

        // Simpan katalog buku ke database
        await DataService.saveRackBooks(savedRack.id, booksList);

        showAdminToast('Data Titik Rak & Katalog Buku berhasil disimpan!', 'success');
        resetRackForm();
        refreshRecordsTable();
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
        rackBooksTbody.innerHTML = '';
        addBookTableRow('', '', '', 1, 'Baca di Tempat');
        
        const submitBtn = document.getElementById('btn-rack-submit');
        if (submitBtn) {
            submitBtn.innerHTML = '<span>➕</span> Simpan &amp; Tambahkan Lemari Rak';
        }
        if (btnRackReset) {
            btnRackReset.innerHTML = '<span>➕</span> Tambah Rak Baru';
        }

        if (showToast) {
            showAdminToast('✨ Formulir Tambah Rak Baru siap. Silakan klik foto panorama untuk menangkap sudut Pitch & Yaw.', 'info');
        }
    }

    btnRackReset?.addEventListener('click', () => {
        if (rackInputTitle.value.trim() !== '') {
            if (!rackInputPitch.value || !rackInputYaw.value) {
                showAdminToast('⚠️ Silakan klik pada gambar panorama di sebelah kanan untuk mengunci koordinat Pitch & Yaw rak!', 'warning');
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
        const rooms = await DataService.getAllRooms();
        const racks = await DataService.getAllRacks();

        // Update Statistik di Menu Registrasi Ruangan
        const statTotal = document.getElementById('stat-total-rooms');
        const statPerpus = document.getElementById('stat-perpus-rooms');
        const statArsip = document.getElementById('stat-arsip-rooms');
        if (statTotal) statTotal.textContent = `${rooms.length} Ruangan`;
        if (statPerpus) statPerpus.textContent = `${rooms.filter(r => Number(r.floor_id) === 1 || Number(r.floor_id) === 2).length} Ruangan`;
        if (statArsip) statArsip.textContent = `${rooms.filter(r => Number(r.floor_id) === 3 || Number(r.floor_id) === 4).length} Ruangan`;

        // 1. Render Tabel Ruangan di Tab Registrasi Ruangan (#table-tab-rooms-tbody)
        const tabRoomsTbody = document.getElementById('table-tab-rooms-tbody');
        if (tabRoomsTbody) {
            tabRoomsTbody.innerHTML = '';
            rooms.forEach((r, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:700; color:var(--admin-muted); text-align:center;">${idx + 1}</td>
                    <td>
                        <strong style="color:var(--admin-navy);">${r.name}</strong>
                    </td>
                    <td>
                        <span class="badge-instansi" style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:700;">
                            ${r.floors?.building || (Number(r.floor_id) <= 2 ? 'Perpustakaan' : 'Kearsipan')} Lt. ${r.floors?.floor_number || (Number(r.floor_id) % 2 === 1 ? 1 : 2)}
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
        }

        // 2. Render Tabel Ruangan di Tab Kelola Data (#table-rooms-tbody)
        const roomsTbody = document.getElementById('table-rooms-tbody');
        if (roomsTbody) {
            roomsTbody.innerHTML = '';
            rooms.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:700;">${r.name}</td>
                    <td>${r.floors?.building || (Number(r.floor_id) <= 2 ? 'Perpustakaan' : 'Kearsipan')} Lt. ${r.floors?.floor_number || (Number(r.floor_id) % 2 === 1 ? 1 : 2)}</td>
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

        // 3. Render Tabel Rak di Tab Kelola Data (#table-racks-tbody)
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
                if (confirm('Apakah Anda yakin ingin menghapus ruangan ini beserta seluruh titik rak dan bukunya?')) {
                    await DataService.deleteRoom(id);
                    showAdminToast('Ruangan berhasil dihapus.', 'info');
                    await loadInitialAdminData();
                    refreshRecordsTable();
                }
            });
        });

        // Edit Rack
        document.querySelectorAll('.btn-table-edit[data-type="rack"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const rack = await DataService.getRackById(id);
                if (rack) {
                    // Pindah ke tab Hotspot Mapper
                    document.querySelector('.admin-nav-item[data-tab="tab-hotspot-mapper"]').click();
                    formRack.setAttribute('data-id', rack.id);
                    mapperSelectRoom.value = rack.room_id;
                    rackInputTitle.value = rack.title;
                    rackInputDDC.value = rack.category_code || '';
                    rackInputLocation.value = rack.location_notes || '';
                    rackInputPitch.value = rack.pitch;
                    rackInputYaw.value = rack.yaw;
                    rackInputTags.value = rack.search_tags || '';
                    rackInputPhoto.value = rack.rack_photo_url || '';
                    document.getElementById('btn-rack-submit').innerHTML = '<span>💾</span> Perbarui Titik Rak &amp; Buku';

                    // Muat buku
                    const books = await DataService.getBooksByRack(rack.id);
                    rackBooksTbody.innerHTML = '';
                    if (books.length > 0) {
                        books.forEach(b => addBookTableRow(b.title, b.author, b.publish_year, b.copies, b.status));
                    } else {
                        addBookTableRow('', '', '', 1, 'Baca di Tempat');
                    }

                    await initHotspotMapperRoom();
                }
            });
        });

        // Delete Rack
        document.querySelectorAll('.btn-table-delete[data-type="rack"]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Apakah Anda yakin ingin menghapus lemari rak ini beserta daftar bukunya?')) {
                    await DataService.deleteRack(id);
                    showAdminToast('Rak buku berhasil dihapus.', 'info');
                    refreshRecordsTable();
                }
            });
        });
    }

    // =========================================================================
    // TAB 5: KONFIGURASI SUPABASE CLOUD
    // =========================================================================
    const inputSupabaseUrl = document.getElementById('config-supabase-url');
    const inputSupabaseKey = document.getElementById('config-supabase-key');
    const formSupabaseConfig = document.getElementById('form-supabase-config');
    const btnResetSeedData = document.getElementById('btn-reset-seed-data');

    if (inputSupabaseUrl) {
        inputSupabaseUrl.value = safeStorage.getItem('disarpus_supabase_url') || '';
        inputSupabaseKey.value = safeStorage.getItem('disarpus_supabase_key') || '';
    }

    formSupabaseConfig?.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = inputSupabaseUrl.value.trim();
        const key = inputSupabaseKey.value.trim();

        safeStorage.setItem('disarpus_supabase_url', url);
        safeStorage.setItem('disarpus_supabase_key', key);

        showAdminToast('Konfigurasi Supabase disimpan! Sistem dimuat ulang...', 'success');
        setTimeout(() => window.location.reload(), 1200);
    });

    btnResetSeedData?.addEventListener('click', () => {
        if (confirm('Kembalikan seluruh data ruangan, denah, dan buku ke kondisi bawaan Disarpus Kab. Cirebon?')) {
            DataService.resetDemoData();
        }
    });

    // =========================================================================
    // LOAD INITIAL DATA DROPDOWNS
    // =========================================================================
    async function loadInitialAdminData() {
        const floors = await DataService.getFloors();
        const rooms = await DataService.getAllRooms();

        // 1. Isi dropdown Lantai pada form Ruangan
        if (roomSelectFloor) {
            roomSelectFloor.innerHTML = '';
            floors.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.id;
                opt.textContent = `${f.building} - Lantai ${f.floor_number} (${f.name})`;
                roomSelectFloor.appendChild(opt);
            });
            updateRoomPickerFloorMap();
        }

        // 2. Isi dropdown Ruangan pada form Hotspot Mapper
        if (mapperSelectRoom) {
            const prevRoomId = mapperSelectRoom.value;
            mapperSelectRoom.innerHTML = '';
            rooms.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.textContent = `${r.name} (${r.floors?.building || 'Gedung'} Lt. ${r.floors?.floor_number || 1})`;
                mapperSelectRoom.appendChild(opt);
            });

            if (prevRoomId && rooms.some(r => String(r.id) === String(prevRoomId))) {
                mapperSelectRoom.value = prevRoomId;
            } else {
                const babadRoom = rooms.find(r => r.name.toLowerCase().includes('babad'));
                if (babadRoom) mapperSelectRoom.value = babadRoom.id;
            }

            initHotspotMapperRoom();
        }

        // 3. Muat data denah default
        loadFloorFormData();

        // 4. Baris buku default pada form rak
        if (rackBooksTbody && rackBooksTbody.children.length === 0) {
            addBookTableRow('', '', '', 1, 'Baca di Tempat');
        }

        // 5. Muat tabel data kelola
        refreshRecordsTable();
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

