/**
 * RoomList component — two modes
 *  mode='nav'   Guest: compact floating list, click to navigate
 *  mode='crud'  Admin: full sidebar tree with thumbnails + CRUD actions
 */

export function renderRoomList({ mode = 'nav', container, rooms, activeRoomId, onSelectRoom, onOpenUploadModal, onMoveUp, onMoveDown, onRename, onDuplicate, onDelete }) {
  if (!container) return;

  if (mode === 'nav') {
    renderNavList(container, rooms, activeRoomId, onSelectRoom);
  } else {
    renderCrudList(container, rooms, activeRoomId, onSelectRoom, onOpenUploadModal, onMoveUp, onMoveDown, onRename, onDuplicate, onDelete);
  }
}

// ── GUEST NAV LIST ──────────────────────────────────────────
function renderNavList(container, rooms, activeRoomId, onSelectRoom) {
  container.innerHTML = rooms.map(r => `
    <button class="guest-room-btn ${r.id === activeRoomId ? 'active' : ''}" data-room-id="${r.id}">
      <i class="bi bi-camera-fill"></i>
      <span>${r.title}</span>
    </button>
  `).join('');

  container.querySelectorAll('.guest-room-btn').forEach(btn => {
    btn.addEventListener('click', () => onSelectRoom(btn.getAttribute('data-room-id')));
  });
}

// ── ADMIN CRUD LIST ─────────────────────────────────────────
function renderCrudList(container, rooms, activeRoomId, onSelectRoom, onOpenUploadModal, onMoveUp, onMoveDown, onRename, onDuplicate, onDelete) {
  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <span class="sidebar-section-label">Rooms</span>
      <button class="btn btn-xs btn-success" id="btn-add-room">
        <i class="bi bi-plus-lg me-1"></i>Add Room
      </button>
    </div>

    ${rooms.length === 0 ? `
      <div class="empty-state-box">
        <i class="bi bi-card-image"></i>
        No rooms yet.<br/>
        <span style="color:var(--text-placeholder);">Click <strong style="color:var(--text-muted);">+ Add Room</strong> to upload.</span>
      </div>
    ` : `
      <div class="rooms-tree-list">
        ${rooms.map((room, idx) => `
          <div class="room-item-card ${room.id === activeRoomId ? 'active-room' : ''}" data-room-id="${room.id}">
            <img src="${room.imageUrl}" class="room-thumb" alt="" onerror="this.style.opacity='0.3'" />
            <div class="flex-grow-1 overflow-hidden">
              <div class="room-title">${room.title}</div>
              <div class="room-desc">${room.description || '360° Panorama'}</div>
            </div>
            <div class="d-flex flex-column gap-1 flex-shrink-0">
              <button class="btn btn-xs btn-outline-secondary p-0 px-1 btn-move-up" data-room-id="${room.id}" ${idx===0?'disabled':''} style="line-height:1.2"><i class="bi bi-chevron-up" style="font-size:.65rem"></i></button>
              <button class="btn btn-xs btn-outline-secondary p-0 px-1 btn-move-down" data-room-id="${room.id}" ${idx===rooms.length-1?'disabled':''} style="line-height:1.2"><i class="bi bi-chevron-down" style="font-size:.65rem"></i></button>
            </div>
            <div class="dropdown flex-shrink-0">
              <button class="btn btn-xs btn-link p-0 ms-1" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical" style="font-size:.75rem"></i></button>
              <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end border-secondary shadow extra-small">
                <li><a class="dropdown-item btn-room-rename" href="#" data-room-id="${room.id}"><i class="bi bi-pencil me-2 text-info"></i>Rename</a></li>
                <li><a class="dropdown-item btn-room-dup" href="#" data-room-id="${room.id}"><i class="bi bi-copy me-2 text-success"></i>Duplicate</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger btn-room-del" href="#" data-room-id="${room.id}"><i class="bi bi-trash me-2"></i>Delete</a></li>
              </ul>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;

  container.querySelector('#btn-add-room')?.addEventListener('click', onOpenUploadModal);

  container.querySelectorAll('.room-item-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.btn-move-up,.btn-move-down,.dropdown')) return;
      onSelectRoom(card.getAttribute('data-room-id'));
    });
  });
  container.querySelectorAll('.btn-move-up').forEach(b => b.addEventListener('click', () => onMoveUp?.(b.getAttribute('data-room-id'))));
  container.querySelectorAll('.btn-move-down').forEach(b => b.addEventListener('click', () => onMoveDown?.(b.getAttribute('data-room-id'))));
  container.querySelectorAll('.btn-room-rename').forEach(b => b.addEventListener('click', e => { e.preventDefault(); onRename?.(b.getAttribute('data-room-id')); }));
  container.querySelectorAll('.btn-room-dup').forEach(b => b.addEventListener('click', e => { e.preventDefault(); onDuplicate?.(b.getAttribute('data-room-id')); }));
  container.querySelectorAll('.btn-room-del').forEach(b => b.addEventListener('click', e => { e.preventDefault(); onDelete?.(b.getAttribute('data-room-id')); }));
}
