/**
 * Left Sidebar: Views & Rooms Manager Component
 */

export function renderLeftSidebar({
  activeView,
  roomsList,
  activeRoomId,
  onSelectRoom,
  onOpenUploadModal,
  onRenameView,
  onDuplicateView,
  onDeleteView,
  onMoveRoomUp,
  onMoveRoomDown,
  onDuplicateRoom,
  onDeleteRoom
}) {
  const container = document.getElementById('studio-left-sidebar');
  if (!container) return;

  container.innerHTML = `
    <div class="sidebar-header">
      <div class="overflow-hidden me-2">
        <div class="sidebar-title d-flex align-items-center gap-1">
          <i class="bi bi-diagram-3-fill text-warning" style="font-size:0.9rem;"></i>
          <span class="text-truncate">${activeView ? activeView.name : 'No Tour Loaded'}</span>
        </div>
        <div class="extra-small" style="color:var(--text-muted);margin-top:1px;">${roomsList.length} room${roomsList.length !== 1 ? 's' : ''}</div>
      </div>

      ${activeView ? `
      <div class="dropdown flex-shrink-0">
        <button class="btn btn-xs btn-outline-secondary" type="button" data-bs-toggle="dropdown" title="Tour options">
          <i class="bi bi-three-dots-vertical"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end border-secondary shadow small">
          <li><a class="dropdown-item" href="#" id="btn-view-rename"><i class="bi bi-pencil me-2 text-info"></i>Rename Tour</a></li>
          <li><a class="dropdown-item" href="#" id="btn-view-duplicate"><i class="bi bi-copy me-2 text-success"></i>Duplicate Tour</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" id="btn-view-delete"><i class="bi bi-trash me-2"></i>Delete Tour</a></li>
        </ul>
      </div>
      ` : ''}
    </div>

    <div class="sidebar-content">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <span class="sidebar-section-label">Rooms</span>
        <button class="btn btn-xs btn-success" id="btn-open-upload-modal">
          <i class="bi bi-plus-lg me-1"></i>Add Room
        </button>
      </div>

      ${roomsList.length === 0 ? `
        <div class="empty-state-box">
          <i class="bi bi-card-image"></i>
          No rooms yet.<br/>
          <span style="color:var(--text-placeholder);">Click <strong style="color:var(--text-muted);">+ Add Room</strong> to upload a 360° photo.</span>
        </div>
      ` : `
        <div class="rooms-tree-list">
          ${roomsList.map((room, idx) => `
            <div class="room-item-card ${room.id === activeRoomId ? 'active-room' : ''}" data-room-id="${room.id}">
              <img src="${room.imageUrl}" class="room-thumb" alt="" onerror="this.style.opacity='0.3'" />
              <div class="flex-grow-1 overflow-hidden">
                <div class="room-title">${room.title}</div>
                <div class="room-desc">${room.description || '360° Panorama'}</div>
              </div>

              <div class="d-flex flex-column gap-1 flex-shrink-0">
                <button class="btn btn-xs btn-outline-secondary p-0 px-1 btn-move-up" data-room-id="${room.id}" title="Move Up" ${idx === 0 ? 'disabled' : ''} style="line-height:1.2;">
                  <i class="bi bi-chevron-up" style="font-size:0.65rem;"></i>
                </button>
                <button class="btn btn-xs btn-outline-secondary p-0 px-1 btn-move-down" data-room-id="${room.id}" title="Move Down" ${idx === roomsList.length - 1 ? 'disabled' : ''} style="line-height:1.2;">
                  <i class="bi bi-chevron-down" style="font-size:0.65rem;"></i>
                </button>
              </div>

              <div class="dropdown flex-shrink-0">
                <button class="btn btn-xs btn-link p-0 ms-1" type="button" data-bs-toggle="dropdown" title="Room options">
                  <i class="bi bi-three-dots-vertical" style="font-size:0.75rem;"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end border-secondary shadow extra-small">
                  <li><a class="dropdown-item btn-room-duplicate" href="#" data-room-id="${room.id}"><i class="bi bi-copy me-2 text-success"></i>Duplicate</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item text-danger btn-room-delete" href="#" data-room-id="${room.id}"><i class="bi bi-trash me-2"></i>Delete</a></li>
                </ul>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;

  // Event Listeners
  if (activeView) {
    container.querySelector('#btn-view-rename')?.addEventListener('click', (e) => { e.preventDefault(); onRenameView(); });
    container.querySelector('#btn-view-duplicate')?.addEventListener('click', (e) => { e.preventDefault(); onDuplicateView(); });
    container.querySelector('#btn-view-delete')?.addEventListener('click', (e) => { e.preventDefault(); onDeleteView(); });
  }

  container.querySelector('#btn-open-upload-modal')?.addEventListener('click', onOpenUploadModal);

  container.querySelectorAll('.room-item-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-move-up') || e.target.closest('.btn-move-down') || e.target.closest('.dropdown')) return;
      onSelectRoom(card.getAttribute('data-room-id'));
    });
  });

  container.querySelectorAll('.btn-move-up').forEach(btn =>
    btn.addEventListener('click', () => onMoveRoomUp(btn.getAttribute('data-room-id')))
  );
  container.querySelectorAll('.btn-move-down').forEach(btn =>
    btn.addEventListener('click', () => onMoveRoomDown(btn.getAttribute('data-room-id')))
  );
  container.querySelectorAll('.btn-room-duplicate').forEach(btn =>
    btn.addEventListener('click', (e) => { e.preventDefault(); onDuplicateRoom(btn.getAttribute('data-room-id')); })
  );
  container.querySelectorAll('.btn-room-delete').forEach(btn =>
    btn.addEventListener('click', (e) => { e.preventDefault(); onDeleteRoom(btn.getAttribute('data-room-id')); })
  );
}
