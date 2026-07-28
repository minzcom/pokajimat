/**
 * Top Navbar Controls — Admin only
 */export function renderTopBar({
  viewsList,
  activeViewId,
  isEditorMode,
  onSelectView,
  onCreateView,
  onSignOut,
  onToggleMode,
  onToggleFullscreen,
  onToggleAutorotate,
  onToggleLeftSidebar,
  onToggleRightSidebar
}) {
  const container = document.getElementById('studio-top-navbar');
  if (!container) return;

  const activeView = viewsList.find(v => v.id === activeViewId) || null;

  container.innerHTML = `
    <div class="d-flex align-items-center gap-2">
      <!-- Mobile Left Sidebar Toggle -->
      <button class="btn btn-sm btn-outline-secondary d-lg-none" id="btn-toggle-left-sidebar" title="Rooms list">
        <i class="bi bi-list" style="font-size: 1rem;"></i>
      </button>

      <!-- Brand -->
      <div class="d-flex align-items-center gap-2">
        <img src="/assets/logo.png" alt="Pok Aji Mat logo" style="width: 38px; height: 38px; object-fit: contain;">
        <span class="navbar-brand-text d-none d-md-block">Pok Aji <span style="color: var(--gold-deep); -webkit-text-stroke: .5px var(--ink);">Mat</span></span>
      </div>

      <!-- Tour Selector -->
      <div class="dropdown">
        <button class="btn btn-sm dropdown-toggle d-flex align-items-center gap-2"
                type="button" data-bs-toggle="dropdown"
                style="background:var(--bg-surface-2);border:1px solid var(--border);color:var(--text-primary);font-weight:600;font-size:.82rem;">
          <i class="bi bi-folder-fill" style="color:var(--warning);"></i>
          <span>${activeView ? activeView.name : 'Select a Tour'}</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-dark shadow" style="border-color:var(--border);">
          <li><span class="dropdown-header" style="font-size:.68rem;letter-spacing:.08em;">VIRTUAL TOUR PROJECTS</span></li>
          ${viewsList.length === 0 ? `<li><span class="dropdown-item disabled" style="color:var(--text-muted);font-size:.8rem;">No tours yet</span></li>` : ''}
          ${viewsList.map(v => `
            <li>
              <a class="dropdown-item d-flex justify-content-between align-items-center ${v.id === activeViewId ? 'active' : ''}"
                 href="#" data-view-id="${v.id}" style="font-size:.82rem;">
                 <span>${v.name}</span>
                 ${v.id === activeViewId ? '<i class="bi bi-check2"></i>' : ''}
              </a>
            </li>
          `).join('')}
          <li><hr class="dropdown-divider" /></li>
          <li>
            <a class="dropdown-item" href="#" id="btn-navbar-new-view"
               style="color:var(--success);font-size:.82rem;font-weight:600;">
              <i class="bi bi-plus-circle me-2"></i>New Virtual Tour
            </a>
          </li>
        </ul>
      </div>

      <!-- Sync badge -->
      <span class="badge d-none d-lg-inline-flex align-items-center gap-1"
            style="background:var(--bg-surface-2);border:1px solid var(--border);color:var(--success);font-size:.68rem;">
        <i class="bi bi-cloud-check-fill"></i> Synced
      </span>
    </div>

    <!-- Right controls -->
    <div class="d-flex align-items-center gap-2">
      <!-- Mode buttons -->
      <div class="btn-group btn-group-sm" role="group">
        <button type="button" class="btn ${!isEditorMode ? 'btn-primary' : 'btn-outline-secondary'}" id="btn-mode-viewer">
          <i class="bi bi-eye-fill me-1"></i><span class="d-none d-md-inline">Viewer</span>
        </button>
        <button type="button" class="btn ${isEditorMode ? 'btn-warning text-dark fw-bold' : 'btn-outline-secondary'}" id="btn-mode-editor">
          <i class="bi bi-pencil-square me-1"></i><span class="d-none d-md-inline">Editor</span>
        </button>
      </div>

      <!-- Utility buttons -->
      <button class="btn btn-sm btn-outline-secondary" id="btn-top-autorotate" title="Auto-rotate">
        <i class="bi bi-arrow-repeat"></i>
      </button>
      <button class="btn btn-sm btn-outline-secondary" id="btn-top-fullscreen" title="Fullscreen">
        <i class="bi bi-arrows-fullscreen"></i>
      </button>

      <!-- Guest tour link -->
      <a href="/" target="_blank" class="btn btn-sm btn-outline-secondary" title="Open Guest Tour">
        <i class="bi bi-box-arrow-up-right"></i>
      </a>

      <!-- Mobile Right Sidebar Toggle -->
      <button class="btn btn-sm btn-outline-secondary d-lg-none" id="btn-toggle-right-sidebar" title="Properties">
        <i class="bi bi-gear-fill"></i>
      </button>

      <!-- Sign Out -->
      ${onSignOut ? `
      <button class="btn btn-sm btn-outline-danger" id="btn-sign-out" title="Sign out">
        <i class="bi bi-box-arrow-right"></i>
      </button>` : ''}
    </div>
  `;

  // Events
  container.querySelectorAll('[data-view-id]').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); onSelectView(el.getAttribute('data-view-id')); });
  });

  container.querySelector('#btn-navbar-new-view')?.addEventListener('click', e => { e.preventDefault(); onCreateView(); });
  container.querySelector('#btn-toggle-left-sidebar')?.addEventListener('click', onToggleLeftSidebar);
  container.querySelector('#btn-toggle-right-sidebar')?.addEventListener('click', onToggleRightSidebar);
  container.querySelector('#btn-mode-viewer')?.addEventListener('click', () => onToggleMode(false));
  container.querySelector('#btn-mode-editor')?.addEventListener('click', () => onToggleMode(true));
  container.querySelector('#btn-top-autorotate')?.addEventListener('click', onToggleAutorotate);
  container.querySelector('#btn-top-fullscreen')?.addEventListener('click', onToggleFullscreen);
  container.querySelector('#btn-sign-out')?.addEventListener('click', onSignOut);
}
