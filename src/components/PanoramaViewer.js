/**
 * PanoramaViewer — Shared 360° viewer component
 *
 * Props:
 *   container  {HTMLElement}  The DOM element to render into
 *   editable   {boolean}      true = admin editor mode, false = guest view mode
 *   callbacks  {object}       { onAngleChange, onCanvasClick, onSelectHotspot, onNavigateRoom }
 */

let viewerInstance   = null;
let currentScene     = null;
let currentView      = null;
let currentAngle     = { yaw: 0, pitch: 0, fov: Math.PI / 4 };
let editorMode       = false;
let selectedHotspotId = null;

let cb = {};  // callbacks

function getMz() {
  if (typeof window.Marzipano === 'undefined') {
    console.error('[PanoramaViewer] window.Marzipano not loaded');
    return null;
  }
  return window.Marzipano;
}

/** Initialise or re-initialise the Marzipano viewer */
export function initViewer(container, opts = {}) {
  const Mz = getMz();
  if (!Mz || !container) return;

  if (viewerInstance) { try { viewerInstance.destroy(); } catch {} }
  viewerInstance = null; currentScene = null; currentView = null;

  viewerInstance = new Mz.Viewer(container, {
    controls: { mouseViewMode: 'drag', touchViewMode: 'drag' }
  });

  let startX = 0;
  let startY = 0;
  let startTime = 0;

  // Track pointer start to differentiate between drag vs tap/click
  container.addEventListener('mousedown', e => {
    startX = e.clientX;
    startY = e.clientY;
    startTime = Date.now();
  });

  // Also support touch start for mobile device drag checks
  container.addEventListener('touchstart', e => {
    if (e.touches && e.touches[0]) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
    }
  }, { passive: true });

  // Canvas click — only fires if editorMode is on and it is a true click/tap (not drag)
  container.addEventListener('click', e => {
    if (!editorMode || !currentScene) return;
    if (e.target.closest('.hs-marker')) return;

    // Check click duration and distance
    const timeElapsed = Date.now() - startTime;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If user dragged more than 8px or held press for > 250ms, treat it as panning/rotation
    if (dist > 8 || timeElapsed > 250) {
      return;
    }

    try {
      const rect = container.getBoundingClientRect();
      const coords = currentView.screenToCoordinates({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (coords && cb.onCanvasClick) cb.onCanvasClick(+coords.yaw.toFixed(3), +coords.pitch.toFixed(3));
    } catch {}
  });
}

/** Set editor vs viewer mode */
export function setEditorMode(active) {
  editorMode = active;
  const el = document.getElementById('pano-container');
  if (el) el.classList.toggle('editor-mode-active', active);
}

/** Register event callbacks */
export function setCallbacks(handlers) { cb = { ...cb, ...handlers }; }

/** Load a panorama room scene */
export function loadScene(roomData, hotspots = [], activeHotspotId = null) {
  const Mz = getMz();
  if (!Mz || !viewerInstance || !roomData?.imageUrl) return;
  selectedHotspotId = activeHotspotId;

  const view = roomData.initialView || { yaw: 0, pitch: 0, fov: Math.PI / 4 };
  const source   = Mz.ImageUrlSource.fromString(roomData.imageUrl);
  const geometry = new Mz.EquirectGeometry([{ width: 4096 }]);
  const limiter  = Mz.RectilinearView.limit.traditional(4096, (120 * Math.PI) / 180);
  currentView    = new Mz.RectilinearView(view, limiter);

  currentScene = viewerInstance.createScene({ source, geometry, view: currentView, pinFirstLevel: true });
  currentScene.switchTo();

  currentView.addEventListener('change', () => {
    currentAngle = {
      yaw:   +currentView.yaw().toFixed(3),
      pitch: +currentView.pitch().toFixed(3),
      fov:   +currentView.fov().toFixed(3)
    };
    if (cb.onAngleChange) cb.onAngleChange(currentAngle);
  });

  renderHotspots(currentScene, hotspots);
}

/** Render hotspot DOM markers into the 360 space */
function renderHotspots(scene, hotspots) {
  const container = scene.hotspotContainer();
  hotspots.forEach(hs => {
    if (hs.visible === false && !editorMode) return;

    const el  = document.createElement('div');
    const sel = selectedHotspotId === hs.id;
    const animCls = hs.animation && hs.animation !== 'none' ? `animation-${hs.animation}` : '';
    el.className = ['hs-marker', animCls, sel ? 'selected-hotspot' : ''].filter(Boolean).join(' ');

    el.innerHTML = `
      <div class="hotspot-icon-wrapper" style="background:${hs.color||'#6366f1'};">
        <i class="bi ${hs.icon||'bi-door-open-fill'}"></i>
      </div>
      <div class="hotspot-tooltip">${hs.tooltip||hs.name||'Hotspot'}</div>
    `;

    el.addEventListener('click', e => {
      e.stopPropagation();
      if (editorMode) {
        selectedHotspotId = hs.id;
        if (cb.onSelectHotspot) cb.onSelectHotspot(hs);
      } else {
        if (hs.targetRoomId && cb.onNavigateRoom) cb.onNavigateRoom(hs.targetRoomId);
      }
    });

    container.createHotspot(el, { yaw: hs.yaw || 0, pitch: hs.pitch || 0 });
  });
}

export function getCurrentAngle() { return currentAngle; }

export function setAutorotate(enabled) {
  const Mz = getMz();
  if (!viewerInstance || !Mz) return;
  if (enabled) {
    viewerInstance.startAutorotate(Mz.autorotate({ yawSpeed: 0.03, targetPitch: 0, targetFov: Math.PI/4 }));
  } else {
    viewerInstance.stopAutorotate();
  }
}
