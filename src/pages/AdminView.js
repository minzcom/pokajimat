/**
 * AdminView.js — Full 3-column admin studio
 * Dynamically imported only after authentication succeeds.
 * Never included in guest bundle.
 */

import { compress360Image } from '../utils/imageCompressor.js';
import { uploadToCloudinary } from '../data/cloudinary.js';
import { showToast, confirmDialog } from '../utils/notification.js';

import {
  getViews, addView, updateView, deleteView, duplicateView,
  getRoomsByViewId, addRoom, updateRoom, deleteRoom, duplicateRoom,
  getHotspotsByRoomId, addHotspot, updateHotspot, deleteHotspot,
  getMusicByViewId, addMusic, deleteMusic,
  signOut
} from '../data/firestore.js';

import {
  initViewer, loadScene, setEditorMode,
  setCallbacks, getCurrentAngle, setAutorotate
} from '../components/PanoramaViewer.js';

import { renderRoomList } from '../components/RoomList.js';

// ── UI sub-modules (admin-only) ─────────────────────────────
import { renderTopBar }        from '../ui/topBarUI.js';
import { renderRightInspector } from '../ui/hotspotInspectorUI.js';

// ── State ───────────────────────────────────────────────────
let viewsList       = [];
let activeViewId    = null;
let roomsList       = [];
let activeRoomId    = null;
let hotspotsList    = [];
let selectedHotspotId = null;
let isEditorMode    = false;
let isAutorotating  = false;

let bsModalNewView    = null;
let bsModalUploadRoom = null;
let bsModalBgMusic    = null;

// ── DOM refs ────────────────────────────────────────────────
const panoContainer   = document.getElementById('pano-container');
const canvasModeBadge = document.getElementById('canvas-mode-badge');
const canvasRoomTitle = document.getElementById('canvas-room-title');
const canvasCoordsInfo= document.getElementById('canvas-coords-info');

// ── Toast helper ─────────────────────────────────────────────
function waitForMarzipano(cb, tries = 40) {
  if (typeof window.Marzipano !== 'undefined') { cb(); return; }
  if (tries > 0) setTimeout(() => waitForMarzipano(cb, tries - 1), 100);
  else { console.error('[Admin] Marzipano CDN failed to load'); showToast('360° engine failed to load', 'danger'); }
}

// ══════════════════════════════════════════
// ENTRY — called from admin.js after auth
// ══════════════════════════════════════════
export function mountAdminView(user) {
  bsModalNewView    = new window.bootstrap.Modal(document.getElementById('modal-new-view'));
  bsModalUploadRoom = new window.bootstrap.Modal(document.getElementById('modal-upload-room'));
  bsModalBgMusic    = new window.bootstrap.Modal(document.getElementById('modal-bg-music'));

  setupUploadModal();
  setupCreateViewModal();
  setupMusicModal();

  waitForMarzipano(async () => {
    initViewer(panoContainer);

    setCallbacks({
      onAngleChange: params => {
        if (canvasCoordsInfo) {
          canvasCoordsInfo.style.display = '';
          canvasCoordsInfo.innerText = `Yaw: ${params.yaw} | Pitch: ${params.pitch} | FOV: ${params.fov}`;
        }
      },
      onCanvasClick: async (yaw, pitch) => {
        if (!isEditorMode || !activeRoomId || !activeViewId) return;
        try {
          const defaultTarget = roomsList.find(r => r.id !== activeRoomId);
          const newHs = await addHotspot({
            roomId: activeRoomId, viewId: activeViewId,
            targetRoomId: defaultTarget?.id || '',
            name: 'New Hotspot', icon: 'bi-door-open-fill', color: '#6366f1',
            yaw, pitch,
            tooltip: defaultTarget ? `Go to ${defaultTarget.title}` : 'Hotspot',
            animation: 'pulse', visible: true
          });
          selectedHotspotId = newHs.id;
          showToast(`Hotspot placed at Yaw ${yaw}`, 'success');
          await refreshHotspots();
        } catch (err) { showToast('Error: ' + err.message, 'danger'); }
      },
      onSelectHotspot: hs => { selectedHotspotId = hs.id; renderUI(); },
      onNavigateRoom: id => {
        const t = roomsList.find(r => r.id === id);
        if (t) { switchRoom(id); showToast(`→ ${t.title}`, 'info'); }
        else showToast('Target room not found', 'warning');
      }
    });

    await refreshViews();
  });
}

// ══════════════════════════════════════════
// DATA REFRESH
// ══════════════════════════════════════════
async function refreshViews(preserveId = null) {
  viewsList = await getViews();
  if (viewsList.length > 0) {
    activeViewId = (preserveId && viewsList.some(v => v.id === preserveId))
      ? preserveId : (!activeViewId || !viewsList.some(v => v.id === activeViewId))
      ? viewsList[0].id : activeViewId;
  } else { activeViewId = null; }
  await refreshRooms();
}

async function refreshRooms(preserveId = null) {
  if (activeViewId) {
    roomsList = await getRoomsByViewId(activeViewId);
    if (roomsList.length > 0) {
      const view = viewsList.find(v => v.id === activeViewId);
      activeRoomId = (preserveId && roomsList.some(r => r.id === preserveId)) ? preserveId
        : (!activeRoomId || !roomsList.some(r => r.id === activeRoomId))
        ? (view?.defaultRoomId && roomsList.some(r => r.id === view.defaultRoomId) ? view.defaultRoomId : roomsList[0].id)
        : activeRoomId;
    } else { activeRoomId = null; }
  } else { roomsList = []; activeRoomId = null; }
  await refreshHotspots();
}

async function refreshHotspots() {
  hotspotsList = activeRoomId ? await getHotspotsByRoomId(activeRoomId) : [];
  if (selectedHotspotId && !hotspotsList.some(h => h.id === selectedHotspotId)) selectedHotspotId = null;
  renderUI();
  updateScene();
}

function switchView(id) { activeViewId = id; activeRoomId = null; selectedHotspotId = null; refreshRooms(); }
function switchRoom(id) { activeRoomId = id; selectedHotspotId = null; refreshHotspots(); }

function updateScene() {
  const room = roomsList.find(r => r.id === activeRoomId);
  if (room) {
    if (canvasRoomTitle) canvasRoomTitle.innerText = room.title;
    loadScene(room, hotspotsList, selectedHotspotId);
  }
}

// ══════════════════════════════════════════
// RENDER UI
// ══════════════════════════════════════════
function renderUI() {
  const activeView    = viewsList.find(v => v.id === activeViewId);
  const activeRoom    = roomsList.find(r => r.id === activeRoomId);
  const selectedHotspot = hotspotsList.find(h => h.id === selectedHotspotId);

  // Top Navbar
  renderTopBar({
    viewsList, activeViewId, isEditorMode,
    onSelectView: id => switchView(id),
    onCreateView: () => bsModalNewView.show(),
    onSignOut: async () => { await signOut(); location.reload(); },
    onToggleMode: active => {
      isEditorMode = active;
      setEditorMode(active);
      if (canvasModeBadge) {
        canvasModeBadge.className = active
          ? 'badge bg-warning text-dark d-flex align-items-center gap-1'
          : 'badge bg-primary d-flex align-items-center gap-1';
        canvasModeBadge.innerHTML = active
          ? '<i class="bi bi-pencil-square"></i> Hotspot Editor'
          : '<i class="bi bi-eye-fill"></i> Viewer Mode';
      }
      renderUI();
      showToast(active ? 'Hotspot Editor active — click scene to place hotspots' : 'Viewer Mode', 'info');
    },
    onToggleFullscreen: () => {
      if (!document.fullscreenElement) panoContainer.requestFullscreen().catch(() => {});
      else document.exitFullscreen();
    },
    onToggleAutorotate: () => {
      isAutorotating = !isAutorotating;
      setAutorotate(isAutorotating);
      showToast(isAutorotating ? 'Auto-rotate ON' : 'Auto-rotate OFF', 'info');
    },
    onToggleLeftSidebar: () => {
      const left = document.getElementById('studio-left-sidebar');
      const right = document.getElementById('studio-right-sidebar');
      left?.classList.toggle('active-mobile');
      right?.classList.remove('active-mobile');
    },
    onToggleRightSidebar: () => {
      const left = document.getElementById('studio-left-sidebar');
      const right = document.getElementById('studio-right-sidebar');
      right?.classList.toggle('active-mobile');
      left?.classList.remove('active-mobile');
    }
  });

  // Left Sidebar — Room CRUD list
  const leftContainer = document.getElementById('studio-left-sidebar');
  if (leftContainer) {
    // Header section
    leftContainer.innerHTML = `
      <div class="sidebar-header">
        <div class="overflow-hidden me-2">
          <div class="sidebar-title d-flex align-items-center gap-1">
            <i class="bi bi-diagram-3-fill text-warning" style="font-size:.9rem;"></i>
            <span class="text-truncate">${activeView ? activeView.name : 'No Tour Selected'}</span>
          </div>
          <div class="extra-small" style="color:var(--text-muted);margin-top:1px;">${roomsList.length} room${roomsList.length!==1?'s':''}</div>
        </div>
        <div class="d-flex align-items-center gap-1 flex-shrink-0">
          ${activeView ? `
          <div class="dropdown">
            <button class="btn btn-xs btn-outline-secondary" data-bs-toggle="dropdown" title="Tour options">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end border-secondary shadow small">
              <li><a class="dropdown-item" href="#" id="btn-view-rename"><i class="bi bi-pencil me-2 text-info"></i>Rename Tour</a></li>
              <li><a class="dropdown-item" href="#" id="btn-view-duplicate"><i class="bi bi-copy me-2 text-success"></i>Duplicate Tour</a></li>
              <li><a class="dropdown-item" href="#" id="btn-view-music"><i class="bi bi-music-note-beamed me-2 text-primary"></i>Background Music</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger" href="#" id="btn-view-delete"><i class="bi bi-trash me-2"></i>Delete Tour</a></li>
            </ul>
          </div>` : ''}
          <button class="btn btn-xs btn-outline-danger d-lg-none" id="btn-close-left-sidebar" title="Close"><i class="bi bi-x-lg"></i></button>
        </div>
      </div>
      <div class="sidebar-content" id="room-list-wrap"></div>
    `;

    leftContainer.querySelector('#btn-close-left-sidebar')?.addEventListener('click', () => {
      leftContainer.classList.remove('active-mobile');
    });

    if (activeView) {
      leftContainer.querySelector('#btn-view-rename')?.addEventListener('click', async e => {
        e.preventDefault();
        const n = prompt('New tour name:', activeView.name);
        if (n?.trim()) { await updateView(activeView.id, { name: n.trim() }); showToast('Tour renamed', 'success'); await refreshViews(activeView.id); }
      });
      leftContainer.querySelector('#btn-view-duplicate')?.addEventListener('click', async e => {
        e.preventDefault(); showToast('Duplicating…', 'info');
        const dup = await duplicateView(activeView.id);
        if (dup) { showToast('Tour duplicated!', 'success'); await refreshViews(dup.id); }
      });
      leftContainer.querySelector('#btn-view-music')?.addEventListener('click', e => {
        e.preventDefault();
        openMusicModal();
      });
      leftContainer.querySelector('#btn-view-delete')?.addEventListener('click', async e => {
        e.preventDefault();
        if (await confirmDialog('Delete Tour', `Delete "${activeView.name}" and all its rooms?`)) {
          await deleteView(activeView.id); showToast('Tour deleted', 'success'); await refreshViews();
        }
      });
    }

    renderRoomList({
      mode: 'crud',
      container: document.getElementById('room-list-wrap'),
      rooms: roomsList,
      activeRoomId,
      onSelectRoom: id => switchRoom(id),
      onOpenUploadModal: () => {
        if (!activeViewId) { showToast('Select or create a tour first.', 'warning'); return; }
        bsModalUploadRoom.show();
      },
      onMoveUp: async id => {
        const i = roomsList.findIndex(r => r.id === id);
        if (i > 0) { await updateRoom(id, {orderIndex: i-1}); await updateRoom(roomsList[i-1].id, {orderIndex: i}); await refreshRooms(id); }
      },
      onMoveDown: async id => {
        const i = roomsList.findIndex(r => r.id === id);
        if (i < roomsList.length-1) { await updateRoom(id, {orderIndex: i+1}); await updateRoom(roomsList[i+1].id, {orderIndex: i}); await refreshRooms(id); }
      },
      onRename: async id => {
        const target = roomsList.find(r => r.id === id);
        const newTitle = prompt('Rename Room Title:', target?.title);
        if (newTitle && newTitle.trim()) {
          await updateRoom(id, { title: newTitle.trim() });
          showToast('Room renamed successfully!', 'success');
          await refreshRooms(id);
        }
      },
      onDuplicate: async id => {
        showToast('Duplicating room…', 'info');
        const dup = await duplicateRoom(id);
        if (dup) { showToast('Room duplicated', 'success'); await refreshRooms(dup.id); }
      },
      onDelete: async id => {
        const room = roomsList.find(r => r.id === id);
        if (await confirmDialog('Delete Room', `Delete "${room?.title}"?`)) {
          await deleteRoom(id); showToast('Room deleted', 'success'); await refreshRooms();
        }
      }
    });
  }

  // Right Inspector
  renderRightInspector({
    activeRoom, selectedHotspot,
    allRoomsInView: roomsList,
    isEditorMode,
    onUpdateHotspot: async (id, data) => {
      await updateHotspot(id, data); showToast('Hotspot saved!', 'success'); await refreshHotspots();
    },
    onDeleteHotspot: async id => {
      if (await confirmDialog('Delete Hotspot', 'Remove this hotspot?')) {
        await deleteHotspot(id); selectedHotspotId = null; showToast('Hotspot deleted', 'success'); await refreshHotspots();
      }
    },
    onUpdateHotspotPosition: async () => {
      if (!selectedHotspotId) return;
      const a = getCurrentAngle();
      await updateHotspot(selectedHotspotId, { yaw: a.yaw, pitch: a.pitch });
      showToast(`Position set — Yaw ${a.yaw}, Pitch ${a.pitch}`, 'success');
      await refreshHotspots();
    },
    onSetRoomInitialView: async () => {
      if (!activeRoomId) return;
      const a = getCurrentAngle();
      await updateRoom(activeRoomId, { initialView: a });
      showToast('Default camera angle saved', 'success');
      await refreshRooms(activeRoomId);
    },
    onDeselectHotspot: () => { selectedHotspotId = null; renderUI(); updateScene(); },
    onUpdateRoom: async (id, data) => {
      await updateRoom(id, data);
      showToast('Room info saved!', 'success');
      await refreshRooms(id);
    },
    isStartRoom: activeRoom && activeView && activeRoom.id === activeView.defaultRoomId,
    onSetStartRoom: async (roomId) => {
      if (!activeViewId) return;
      await updateView(activeViewId, { defaultRoomId: roomId });
      showToast('Starting room successfully saved!', 'success');
      await refreshViews(activeViewId);
    }
  });
}

// ══════════════════════════════════════════
// MODAL SETUP
// ══════════════════════════════════════════
function setupCreateViewModal() {
  document.getElementById('form-create-view')?.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('new-view-name').value.trim();
    const desc = document.getElementById('new-view-desc').value.trim();
    if (!name) return;
    try {
      const v = await addView({ name, description: desc });
      e.target.reset();
      bsModalNewView.hide();
      showToast(`Created "${name}"`, 'success');
      await refreshViews(v.id);
    } catch (err) { showToast('Failed: ' + err.message, 'danger'); }
  });
}

function setupUploadModal() {
  const form          = document.getElementById('form-upload-room');
  const fileInput     = document.getElementById('upload-room-file');
  const titleContainer= document.getElementById('upload-room-title-container');
  const titleInput    = document.getElementById('upload-room-title');
  const compStats     = document.getElementById('comp-stats');
  const compOrig      = document.getElementById('comp-orig');
  const compResult    = document.getElementById('comp-result');
  const compSavings   = document.getElementById('comp-savings');
  const progBox       = document.getElementById('upload-progress-box');
  const progLabel     = document.getElementById('upload-progress-label');
  const progBar       = document.getElementById('upload-progress-bar');
  const btnUpload     = document.getElementById('btn-do-upload');

  let cached = null;

  fileInput?.addEventListener('change', async e => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      cached = null;
      compStats.classList.add('d-none');
      titleContainer.style.display = '';
      titleInput.required = true;
      return;
    }

    if (files.length > 1) {
      // Multiple files mode
      titleContainer.style.display = 'none';
      titleInput.required = false;
      compStats.classList.remove('d-none');
      compOrig.textContent = `${files.length} files`;
      compResult.textContent = 'Ready to batch upload';
      compSavings.textContent = '—';
      cached = null; // No pre-comp cache for multi-upload
      return;
    }

    // Single file mode
    titleContainer.style.display = '';
    titleInput.required = true;
    const file = files[0];
    const origMB = (file.size / 1048576).toFixed(2);
    compOrig.textContent = `${origMB} MB`;
    compResult.textContent = 'Compressing…';
    compSavings.textContent = '…';
    compStats.classList.remove('d-none');
    try {
      cached = await compress360Image(file, {}, pct => { compResult.textContent = `${pct}%`; });
      compOrig.textContent    = `${cached.originalSizeMB} MB`;
      compResult.textContent  = `${cached.compressedSizeMB} MB`;
      compSavings.textContent = `${cached.reductionRatio} smaller`;
    } catch { compResult.textContent = 'Ready'; cached = null; }
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!activeViewId) { showToast('Select a tour first', 'warning'); return; }
    const files = fileInput.files;
    if (!files || files.length === 0) return;

    const desc = document.getElementById('upload-room-desc').value.trim();
    btnUpload.disabled = true;
    progBox.classList.remove('d-none');

    let uploadedCount = 0;
    let firstRoomId = null;

    try {
      if (files.length === 1) {
        // Single file upload
        const file = files[0];
        const title = titleInput.value.trim() || file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        
        let res = cached;
        if (!res) {
          progLabel.textContent = 'Step 1/2: Compressing image…';
          progBar.style.width = '20%';
          res = await compress360Image(file, {}, pct => { progBar.style.width = `${20 + pct * 0.3}%`; });
        }

        progLabel.textContent = 'Step 2/2: Uploading to Cloudinary…';
        const cloud = await uploadToCloudinary(res.compressedFile, pct => {
          progBar.style.width = `${50 + pct * 0.48}%`;
        });

        progBar.style.width = '100%';

        const room = await addRoom({
          viewId: activeViewId, title, description: desc,
          imageUrl: cloud.url || URL.createObjectURL(res.compressedFile),
          originalSizeMB: res.originalSizeMB, compressedSizeMB: res.compressedSizeMB,
          orderIndex: roomsList.length, initialView: { yaw:0, pitch:0, fov: Math.PI/4 }
        });

        firstRoomId = room.id;
        uploadedCount = 1;
        showToast(`Uploaded "${title}" — saved ${res.reductionRatio}`, 'success');
      } else {
        // Multiple files upload
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const title = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          const progressPrefix = `[Room ${i + 1} of ${files.length}] `;

          progLabel.textContent = `${progressPrefix}Compressing "${title}"…`;
          progBar.style.width = `${Math.round((i / files.length) * 100)}%`;

          const res = await compress360Image(file, {}, pct => {
            const stepPct = Math.round((i / files.length) * 100) + Math.round((pct * 0.4) / files.length);
            progBar.style.width = `${stepPct}%`;
          });

          progLabel.textContent = `${progressPrefix}Uploading "${title}"…`;
          const cloud = await uploadToCloudinary(res.compressedFile, pct => {
            const stepPct = Math.round((i / files.length) * 100) + 40/files.length + Math.round((pct * 0.5) / files.length);
            progBar.style.width = `${stepPct}%`;
          });

          const room = await addRoom({
            viewId: activeViewId, title, description: desc,
            imageUrl: cloud.url || URL.createObjectURL(res.compressedFile),
            originalSizeMB: res.originalSizeMB, compressedSizeMB: res.compressedSizeMB,
            orderIndex: roomsList.length + i, initialView: { yaw:0, pitch:0, fov: Math.PI/4 }
          });

          if (i === 0) firstRoomId = room.id;
          uploadedCount++;
        }
        showToast(`Successfully uploaded ${uploadedCount} rooms!`, 'success');
      }

      // If activeViewId had no rooms before, set default room to the first uploaded room
      if (roomsList.length === 0 && firstRoomId) {
        await updateView(activeViewId, { defaultRoomId: firstRoomId });
      }

      form.reset();
      cached = null;
      compStats.classList.add('d-none');
      progBox.classList.add('d-none');
      bsModalUploadRoom.hide();
      titleContainer.style.display = '';
      titleInput.required = true;

      await refreshRooms(firstRoomId);
    } catch (err) {
      showToast('Upload failed: ' + err.message, 'danger');
    } finally {
      btnUpload.disabled = false;
    }
  });
}

// ══════════════════════════════════════════
// MUSIC SETTINGS
// ══════════════════════════════════════════
let activePreviewMusicId = null;

async function openMusicModal() {
  const activeView = viewsList.find(v => v.id === activeViewId);
  if (!activeView) return;

  const btnMute = document.getElementById('btn-clear-active-music');
  if (activeView.audioUrl) {
    btnMute.classList.remove('d-none');
  } else {
    btnMute.classList.add('d-none');
  }

  // Stop any active previews
  const previewAudio = document.getElementById('modal-audio-preview');
  if (previewAudio) {
    previewAudio.pause();
    previewAudio.src = '';
  }
  activePreviewMusicId = null;

  await renderMusicLibraryList();
  bsModalBgMusic.show();
}

async function renderMusicLibraryList() {
  const container = document.getElementById('music-library-list');
  if (!container) return;

  const activeView = viewsList.find(v => v.id === activeViewId);
  if (!activeView) return;

  try {
    let tracks = await getMusicByViewId(activeViewId);
    
    // Auto-detect and synthesize legacy active track uploaded in previous version
    const activeUrl = activeView.audioUrl;
    if (activeUrl && !tracks.some(t => t.url === activeUrl)) {
      const filename = activeUrl.substring(activeUrl.lastIndexOf('/') + 1);
      tracks.unshift({
        id: 'legacy_active',
        title: `Active Track: ${decodeURIComponent(filename)}`,
        url: activeUrl,
        isLegacy: true
      });
    }
    
    if (tracks.length === 0) {
      container.innerHTML = `
        <div class="text-center py-5 text-secondary small">
          <i class="bi bi-music-note-beamed d-block fs-3 mb-2 text-secondary"></i>
          No tracks uploaded to this tour yet.<br>Add one on the left to start!
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="list-group list-group-flush border border-secondary rounded overflow-hidden">
        ${tracks.map(t => {
          const isActive = activeView.audioUrl === t.url;
          const isPlaying = activePreviewMusicId === t.id;
          return `
            <div class="list-group-item bg-dark text-white border-secondary d-flex align-items-center py-2 px-3 justify-content-between gap-2">
              <div class="d-flex align-items-center gap-2 text-truncate flex-grow-1" style="min-width: 0;">
                <button type="button" class="btn btn-xs btn-outline-light rounded-circle btn-preview-track flex-shrink-0 d-flex align-items-center justify-content-center" data-track-id="${t.id}" data-url="${t.url}" style="width:28px;height:28px;padding:0;border-width:1.5px;font-family:var(--font-body);">
                  <i class="bi ${isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}"></i>
                </button>
                <div class="text-truncate small" title="${escapeHTML(t.title)}">
                  <span class="fw-bold" style="font-family: var(--font-body);">${escapeHTML(t.title)}</span>
                </div>
              </div>
              
              <div class="d-flex align-items-center gap-2 flex-shrink-0">
                ${isActive ? `
                  <span class="badge bg-warning text-dark px-2 py-1" style="font-size:0.7rem;font-family:var(--font-body);font-weight:bold;border-width:1.5px;"><i class="bi bi-star-fill me-1"></i>Active</span>
                ` : `
                  <button type="button" class="btn btn-xs btn-outline-warning btn-activate-track py-1 px-2" data-track-id="${t.id}" data-url="${t.url}" style="font-family:var(--font-body);font-weight:bold;border-width:1.5px;">Select</button>
                `}
                <button type="button" class="btn btn-xs btn-outline-danger btn-delete-track p-1 d-flex align-items-center justify-content-center" data-track-id="${t.id}" style="width:26px;height:26px;border-width:1.5px;font-family:var(--font-body);">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Add list interaction listeners
    bindMusicLibraryEvents();
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger py-2 small">Error loading library: ${err.message}</div>`;
  }
}

function bindMusicLibraryEvents() {
  const list = document.getElementById('music-library-list');
  const previewAudio = document.getElementById('modal-audio-preview');

  // Preview track
  list.querySelectorAll('.btn-preview-track').forEach(btn => {
    btn.addEventListener('click', () => {
      const trackId = btn.getAttribute('data-track-id');
      const url = btn.getAttribute('data-url');

      if (activePreviewMusicId === trackId) {
        // Pause
        previewAudio.pause();
        activePreviewMusicId = null;
        renderMusicLibraryList();
      } else {
        // Play new preview
        previewAudio.src = url;
        previewAudio.play().then(() => {
          activePreviewMusicId = trackId;
          renderMusicLibraryList();
        }).catch(err => {
          showToast('Failed to play preview: ' + err.message, 'danger');
        });
      }
    });
  });

  // Activate track
  list.querySelectorAll('.btn-activate-track').forEach(btn => {
    btn.addEventListener('click', async () => {
      const url = btn.getAttribute('data-url');
      if (!activeViewId) return;

      try {
        await updateView(activeViewId, { audioUrl: url });
        showToast('Background music selected as active!', 'success');
        await refreshViews(activeViewId);
        
        // Show/hide mute button
        const btnMute = document.getElementById('btn-clear-active-music');
        if (btnMute) btnMute.classList.remove('d-none');
        
        await renderMusicLibraryList();
      } catch (err) {
        showToast('Failed to activate track: ' + err.message, 'danger');
      }
    });
  });

  // Delete track
  list.querySelectorAll('.btn-delete-track').forEach(btn => {
    btn.addEventListener('click', async () => {
      const trackId = btn.getAttribute('data-track-id');
      const activeView = viewsList.find(v => v.id === activeViewId);

      if (await confirmDialog('Delete Track', 'Are you sure you want to delete this track from your library?')) {
        try {
          if (trackId === 'legacy_active') {
            await updateView(activeViewId, { audioUrl: null });
            await refreshViews(activeViewId);
            const btnMute = document.getElementById('btn-clear-active-music');
            if (btnMute) btnMute.classList.add('d-none');
            showToast('Track removed from tour', 'success');
            await renderMusicLibraryList();
            return;
          }

          // If deleted track was active, mute the tour first
          const tracks = await getMusicByViewId(activeViewId);
          const track = tracks.find(t => t.id === trackId);
          if (track && activeView && activeView.audioUrl === track.url) {
            await updateView(activeViewId, { audioUrl: null });
            await refreshViews(activeViewId);
            const btnMute = document.getElementById('btn-clear-active-music');
            if (btnMute) btnMute.classList.add('d-none');
          }

          // If playing preview, stop it
          if (activePreviewMusicId === trackId) {
            previewAudio.pause();
            previewAudio.src = '';
            activePreviewMusicId = null;
          }

          await deleteMusic(trackId);
          showToast('Track deleted successfully', 'success');
          await renderMusicLibraryList();
        } catch (err) {
          showToast('Failed to delete track: ' + err.message, 'danger');
        }
      }
    });
  });
}

function setupMusicModal() {
  const form      = document.getElementById('form-bg-music');
  const titleInput= document.getElementById('music-title-input');
  const fileInput = document.getElementById('music-file-input');
  const btnMute   = document.getElementById('btn-clear-active-music');
  const progBox   = document.getElementById('music-progress-box');
  const progBar   = document.getElementById('music-progress-bar');
  const btnSave   = document.getElementById('btn-save-music');

  // Auto-populate title input when file selected
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file) {
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      titleInput.value = baseName;
    }
  });

  btnMute?.addEventListener('click', async () => {
    if (!activeViewId) return;
    if (await confirmDialog('Mute Background Music', 'Mute background music for this virtual tour?')) {
      try {
        await updateView(activeViewId, { audioUrl: null });
        showToast('Virtual tour muted.', 'success');
        await refreshViews(activeViewId);
        btnMute.classList.add('d-none');
        await renderMusicLibraryList();
      } catch (err) {
        showToast('Failed to mute tour: ' + err.message, 'danger');
      }
    }
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    if (!activeViewId) { showToast('Select a tour first', 'warning'); return; }
    
    const file = fileInput.files[0];
    const title = titleInput.value.trim();
    if (!file || !title) return;

    if (!file.type.startsWith('audio/')) {
      showToast('Please upload a valid audio file (e.g. .mp3, .wav, .m4a)', 'warning');
      return;
    }

    btnSave.disabled = true;
    progBox.classList.remove('d-none');
    progBar.style.width = '10%';

    try {
      const cloud = await uploadToCloudinary(file, pct => {
        progBar.style.width = `${10 + pct * 0.9}%`;
      });

      // Save to music list
      await addMusic({
        viewId: activeViewId,
        title: title,
        url: cloud.url
      });
      
      form.reset();
      progBox.classList.add('d-none');
      showToast('New track successfully uploaded to library!', 'success');
      await renderMusicLibraryList();
    } catch (err) {
      showToast('Track upload failed: ' + err.message, 'danger');
    } finally {
      btnSave.disabled = false;
      progBox.classList.add('d-none');
    }
  });
}

function escapeHTML(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
