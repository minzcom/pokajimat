/**
 * Right Sidebar: Hotspot & Room Inspector Component
 */

const ICON_PRESETS = [
  { class: 'bi-door-open-fill',   label: 'Door' },
  { class: 'bi-arrow-up-circle-fill', label: 'Arrow' },
  { class: 'bi-info-circle-fill', label: 'Info' },
  { class: 'bi-star-fill',        label: 'Star' },
  { class: 'bi-geo-alt-fill',     label: 'Location' },
  { class: 'bi-lightbulb-fill',   label: 'Idea' },
  { class: 'bi-camera-fill',      label: 'Camera' },
  { class: 'bi-compass-fill',     label: 'Compass' }
];

const COLOR_PRESETS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6'
];

export function renderRightInspector({
  activeRoom,
  selectedHotspot,
  allRoomsInView,
  isEditorMode,
  onUpdateHotspot,
  onDeleteHotspot,
  onUpdateHotspotPosition,
  onSetRoomInitialView,
  onDeselectHotspot,
  onUpdateRoom,
  isStartRoom,
  onSetStartRoom
}) {
  const container = document.getElementById('studio-right-sidebar');
  if (!container) return;

  // ── HOTSPOT INSPECTOR ──
  if (selectedHotspot) {
    container.innerHTML = `
      <div class="sidebar-header">
        <div class="d-flex align-items-center gap-2 overflow-hidden">
          <span class="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style="width:28px;height:28px;background:${selectedHotspot.color || '#6366f1'};">
            <i class="bi ${selectedHotspot.icon || 'bi-door-open-fill'}" style="color:#fff;font-size:0.8rem;"></i>
          </span>
          <div class="sidebar-title text-truncate">${selectedHotspot.name || 'Hotspot'}</div>
        </div>
        <div class="d-flex align-items-center gap-1 flex-shrink-0">
          <button class="btn btn-xs btn-outline-secondary" id="btn-close-inspector" title="Close inspector">
            <i class="bi bi-x-lg"></i>
          </button>
          <button class="btn btn-xs btn-outline-danger d-lg-none" id="btn-close-right-sidebar" title="Close Sidebar">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <div class="sidebar-content">
        <form id="form-hotspot-properties" novalidate>

          <!-- Name -->
          <div class="mb-3">
            <label class="form-label">Hotspot Name</label>
            <input type="text" id="hs-prop-name" class="form-control form-control-sm"
              value="${selectedHotspot.name || ''}" placeholder="e.g. Go to Kitchen" />
          </div>

          <!-- Target Room -->
          <div class="mb-3">
            <label class="form-label">Navigate To (Target Room)</label>
            <select id="hs-prop-target" class="form-select form-select-sm">
              <option value="">— Info only (no navigation) —</option>
              ${allRoomsInView.filter(r => r.id !== activeRoom?.id).map(r => `
                <option value="${r.id}" ${r.id === selectedHotspot.targetRoomId ? 'selected' : ''}>${r.title}</option>
              `).join('')}
            </select>
          </div>

          <!-- Icon Grid -->
          <div class="mb-3">
            <label class="form-label">Icon</label>
            <div class="d-flex flex-wrap gap-2">
              ${ICON_PRESETS.map(icon => `
                <button type="button" title="${icon.label}"
                  class="btn-icon-choice btn-icon-choice ${selectedHotspot.icon === icon.class ? 'selected' : ''}"
                  data-icon="${icon.class}">
                  <i class="bi ${icon.class}"></i>
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Color Palette -->
          <div class="mb-3">
            <label class="form-label">Hotspot Color</label>
            <div class="d-flex flex-wrap gap-2 align-items-center">
              ${COLOR_PRESETS.map(c => `
                <button type="button"
                  class="btn-color-choice ${selectedHotspot.color === c ? 'selected' : ''}"
                  data-color="${c}"
                  style="background:${c};" title="${c}">
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Tooltip -->
          <div class="mb-3">
            <label class="form-label">Hover Tooltip Text</label>
            <input type="text" id="hs-prop-tooltip" class="form-control form-control-sm"
              value="${selectedHotspot.tooltip || ''}" placeholder="e.g. Enter Kitchen" />
          </div>

          <!-- Description -->
          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea id="hs-prop-desc" class="form-control form-control-sm" rows="2"
              placeholder="Optional extra info…">${selectedHotspot.description || ''}</textarea>
          </div>

          <!-- Animation -->
          <div class="mb-3">
            <label class="form-label">Animation Style</label>
            <select id="hs-prop-anim" class="form-select form-select-sm">
              <option value="pulse"  ${selectedHotspot.animation === 'pulse'  ? 'selected' : ''}>Pulse Ring</option>
              <option value="bounce" ${selectedHotspot.animation === 'bounce' ? 'selected' : ''}>Bounce</option>
              <option value="none"   ${selectedHotspot.animation === 'none'   ? 'selected' : ''}>Static (None)</option>
            </select>
          </div>

          <!-- Position Readout -->
          <div class="mb-4">
            <label class="form-label">360° Position</label>
            <div class="inspector-card" style="margin-bottom:0;">
              <div class="inspector-card-body py-2">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="angle-readout">
                    Yaw&nbsp;<strong style="color:var(--text-primary);">${selectedHotspot.yaw}</strong>
                    &nbsp;·&nbsp;
                    Pitch&nbsp;<strong style="color:var(--text-primary);">${selectedHotspot.pitch}</strong>
                  </span>
                  <button type="button" id="btn-update-hs-pos" class="btn btn-xs btn-outline-warning ms-2" title="Snap to current camera angle">
                    <i class="bi bi-crosshair me-1"></i>Snap Here
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="d-grid gap-2">
            <button type="submit" class="btn btn-sm btn-primary">
              <i class="bi bi-check-lg me-1"></i>Save Changes
            </button>
            <button type="button" id="btn-delete-hotspot" class="btn btn-sm btn-outline-danger">
              <i class="bi bi-trash me-1"></i>Delete Hotspot
            </button>
          </div>
        </form>
      </div>
    `;

    // Close inspector
    container.querySelector('#btn-close-inspector').addEventListener('click', onDeselectHotspot);

    // Mutable selection state
    let selectedIcon  = selectedHotspot.icon  || 'bi-door-open-fill';
    let selectedColor = selectedHotspot.color || '#6366f1';

    // Icon grid selection
    container.querySelectorAll('.btn-icon-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.btn-icon-choice').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedIcon = btn.getAttribute('data-icon');
      });
    });

    // Color palette selection
    container.querySelectorAll('.btn-color-choice').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.btn-color-choice').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedColor = btn.getAttribute('data-color');
      });
    });

    // Snap position to current camera angle
    container.querySelector('#btn-update-hs-pos').addEventListener('click', onUpdateHotspotPosition);

    // Save form
    container.querySelector('#form-hotspot-properties').addEventListener('submit', (e) => {
      e.preventDefault();
      onUpdateHotspot(selectedHotspot.id, {
        name:         document.getElementById('hs-prop-name').value.trim(),
        targetRoomId: document.getElementById('hs-prop-target').value,
        icon:         selectedIcon,
        color:        selectedColor,
        tooltip:      document.getElementById('hs-prop-tooltip').value.trim(),
        description:  document.getElementById('hs-prop-desc').value.trim(),
        animation:    document.getElementById('hs-prop-anim').value
      });
    });

    // Delete
    container.querySelector('#btn-delete-hotspot').addEventListener('click', () => {
      onDeleteHotspot(selectedHotspot.id);
    });

    return;
  }

  // ── ROOM INSPECTOR (No Hotspot Selected) ──
  container.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-title d-flex align-items-center gap-2">
        <i class="bi bi-sliders" style="color:var(--accent);"></i>
        <span>Room Properties</span>
      </div>
      <button class="btn btn-xs btn-outline-danger d-lg-none" id="btn-close-right-sidebar" title="Close Sidebar">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>

    <div class="sidebar-content">
      ${activeRoom ? `

        <!-- Room Info Card -->
        <div class="inspector-card mb-3">
          <div class="inspector-card-header">Active Panorama</div>
          <div class="inspector-card-body">
            <form id="form-room-properties" novalidate>
              <div class="mb-3">
                <label class="form-label">Room Title</label>
                <input type="text" id="room-prop-title" class="form-control form-control-sm"
                  value="${activeRoom.title || ''}" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Description</label>
                <input type="text" id="room-prop-desc" class="form-control form-control-sm"
                  value="${activeRoom.description || ''}" placeholder="e.g. Living Room Area" />
              </div>
              <div class="stat-row"><span>Original size</span><span>${activeRoom.originalSizeMB || '—'} MB</span></div>
              <div class="stat-row"><span>Compressed</span><span>${activeRoom.compressedSizeMB || '—'} MB</span></div>
              <button type="submit" class="btn btn-xs btn-primary w-100 mt-2">
                <i class="bi bi-check-lg me-1"></i>Save Info
              </button>
            </form>
          </div>
        </div>

        <!-- Tour Entry Settings Card -->
        <div class="inspector-card mb-3">
          <div class="inspector-card-header">Tour Entry Settings</div>
          <div class="inspector-card-body">
            ${isStartRoom ? `
              <div class="alert alert-success py-2 mb-0" style="font-size: 0.8rem; border-color: var(--green) !important;">
                <i class="bi bi-star-fill me-1" style="color: var(--gold);"></i>
                This is the <strong>Starting Room</strong> when visitors open the tour.
              </div>
            ` : `
              <p style="color:var(--text-muted);font-size:0.75rem;margin-bottom:0.65rem;">
                Make this room the first panorama visitors see when they enter the website.
              </p>
              <button class="btn btn-sm btn-outline-secondary w-100" id="btn-set-start-room">
                <i class="bi bi-house-door-fill me-1"></i>Set as Tour Starting Room
              </button>
            `}
          </div>
        </div>

        <!-- Default Camera View Card -->
        <div class="inspector-card mb-3">
          <div class="inspector-card-header">Default Starting View</div>
          <div class="inspector-card-body">
            <p style="color:var(--text-muted);font-size:0.75rem;margin-bottom:0.65rem;">
              Set the camera angle visitors see when they first enter this room.
            </p>
            <button class="btn btn-sm btn-outline-primary w-100" id="btn-save-room-initial-view">
              <i class="bi bi-pin-angle-fill me-1"></i>Save Current Camera as Default
            </button>
          </div>
        </div>

        <!-- Hotspot Editor Hint -->
        ${isEditorMode ? `
          <div class="alert alert-warning py-2" role="alert" style="font-size:0.75rem;">
            <i class="bi bi-mouse-fill me-1"></i>
            <strong>Editor Active —</strong> Click anywhere inside the 360° scene to place a new hotspot.
          </div>
        ` : `
          <div class="alert alert-info py-2" role="alert" style="font-size:0.75rem;">
            <i class="bi bi-info-circle-fill me-1"></i>
            Switch to <strong>Hotspot Editor</strong> mode (top toolbar) to add door hotspots.
          </div>
        `}

      ` : `
        <div class="empty-state-box mt-3">
          <i class="bi bi-layout-three-columns"></i>
          No room selected.<br/>
          <span style="color:var(--text-placeholder);">Select a room from the left sidebar.</span>
        </div>
      `}
    </div>
  `;

  if (activeRoom) {
    container.querySelector('#btn-save-room-initial-view')?.addEventListener('click', onSetRoomInitialView);
    container.querySelector('#btn-set-start-room')?.addEventListener('click', () => {
      if (onSetStartRoom) onSetStartRoom(activeRoom.id);
    });
    container.querySelector('#form-room-properties')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = document.getElementById('room-prop-title').value.trim();
      const description = document.getElementById('room-prop-desc').value.trim();
      if (title && onUpdateRoom) {
        onUpdateRoom(activeRoom.id, { title, description });
      }
    });
  }

  // Universal Mobile Close handler
  container.querySelector('#btn-close-right-sidebar')?.addEventListener('click', () => {
    container.classList.remove('active-mobile');
  });
}
