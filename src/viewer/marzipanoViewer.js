/**
 * Marzipano 360° Viewer Engine
 * Uses window.Marzipano loaded from CDN (not npm import - ESM not supported)
 */

let viewerInstance = null;
let currentScene = null;
let currentView = null;
let currentViewParams = { yaw: 0, pitch: 0, fov: Math.PI / 4 };
let isEditorMode = false;
let selectedHotspotId = null;

let onAngleChangeCallback = null;
let onCanvasClickCallback = null;
let onSelectHotspotCallback = null;
let onNavigateRoomCallback = null;

function getMarzipano() {
  if (typeof window.Marzipano === 'undefined') {
    console.error('Marzipano CDN script not yet loaded!');
    return null;
  }
  return window.Marzipano;
}

/**
 * Initializes Marzipano viewer inside DOM container
 */
export function initMarzipanoViewer(domContainer) {
  if (!domContainer) return null;

  // Destroy old instance
  if (viewerInstance) {
    try { viewerInstance.destroy(); } catch (_) {}
    viewerInstance = null;
    currentScene = null;
    currentView = null;
  }

  const Marzipano = getMarzipano();
  if (!Marzipano) return null;

  viewerInstance = new Marzipano.Viewer(domContainer, {
    controls: {
      mouseViewMode: 'drag',
      touchViewMode: 'drag'
    }
  });

  // Canvas click handler for Hotspot Editor mode
  domContainer.addEventListener('click', (e) => {
    if (!isEditorMode || !viewerInstance || !currentScene) return;
    if (e.target.closest('.custom-hotspot')) return;

    try {
      const rect = domContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const coords = currentView.screenToCoordinates({ x, y });
      if (coords && onCanvasClickCallback) {
        onCanvasClickCallback(
          parseFloat(coords.yaw.toFixed(3)),
          parseFloat(coords.pitch.toFixed(3))
        );
      }
    } catch (err) {
      console.warn('Could not compute coords from click:', err);
    }
  });

  return viewerInstance;
}

/**
 * Set Viewer/Editor mode
 */
export function setViewerMode(editorModeActive = false) {
  isEditorMode = editorModeActive;
  const container = document.getElementById('pano-container');
  if (container) {
    container.classList.toggle('editor-mode-active', isEditorMode);
  }
}

/**
 * Register callbacks from main app
 */
export function setViewerCallbacks({ onAngleChange, onCanvasClick, onSelectHotspot, onNavigateRoom }) {
  if (onAngleChange) onAngleChangeCallback = onAngleChange;
  if (onCanvasClick) onCanvasClickCallback = onCanvasClick;
  if (onSelectHotspot) onSelectHotspotCallback = onSelectHotspot;
  if (onNavigateRoom) onNavigateRoomCallback = onNavigateRoom;
}

/**
 * Load a room's 360° equirectangular image into the Marzipano viewer
 */
export function loadRoomScene(roomData, hotspotsList = [], activeSelectedHotspotId = null) {
  if (!viewerInstance || !roomData || !roomData.imageUrl) return;

  const Marzipano = getMarzipano();
  if (!Marzipano) return;

  selectedHotspotId = activeSelectedHotspotId;

  const initialViewParams = roomData.initialView || { yaw: 0, pitch: 0, fov: Math.PI / 4 };

  // Source: single equirectangular image URL
  const source = Marzipano.ImageUrlSource.fromString(roomData.imageUrl);

  // Equirectangular geometry
  const geometry = new Marzipano.EquirectGeometry([{ width: 4096 }]);

  // View with 120° max FOV limiter (prevents over-zoom on mobile)
  const limiter = Marzipano.RectilinearView.limit.traditional(
    4096,
    (120 * Math.PI) / 180
  );

  currentView = new Marzipano.RectilinearView(initialViewParams, limiter);

  // Create and switch scene
  currentScene = viewerInstance.createScene({
    source,
    geometry,
    view: currentView,
    pinFirstLevel: true
  });

  currentScene.switchTo();

  // Track live camera angle changes
  currentView.addEventListener('change', () => {
    currentViewParams = {
      yaw: parseFloat(currentView.yaw().toFixed(3)),
      pitch: parseFloat(currentView.pitch().toFixed(3)),
      fov: parseFloat(currentView.fov().toFixed(3))
    };
    if (onAngleChangeCallback) {
      onAngleChangeCallback(currentViewParams);
    }
  });

  // Render hotspot markers into the scene
  if (hotspotsList && hotspotsList.length > 0) {
    renderHotspotMarkers(currentScene, hotspotsList);
  }
}

/**
 * Render interactive hotspot DOM elements inside the 360° scene space
 */
function renderHotspotMarkers(scene, hotspotsList) {
  const container = scene.hotspotContainer();

  hotspotsList.forEach((hs) => {
    if (hs.visible === false && !isEditorMode) return;

    const el = document.createElement('div');
    const isSelected = selectedHotspotId === hs.id;
    const animCls = hs.animation && hs.animation !== 'none' ? `animation-${hs.animation}` : '';

    el.className = ['custom-hotspot', animCls, isSelected ? 'selected-hotspot' : ''].filter(Boolean).join(' ');

    const iconClass = hs.icon || 'bi-door-open-fill';
    const bgColor = hs.color || '#6366f1';

    el.innerHTML = `
      <div class="hotspot-icon-wrapper" style="background-color:${bgColor};">
        <i class="bi ${iconClass}"></i>
      </div>
      <div class="hotspot-tooltip">${hs.tooltip || hs.name || 'Hotspot'}</div>
    `;

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isEditorMode) {
        selectedHotspotId = hs.id;
        if (onSelectHotspotCallback) onSelectHotspotCallback(hs);
      } else {
        if (hs.targetRoomId && onNavigateRoomCallback) onNavigateRoomCallback(hs.targetRoomId);
      }
    });

    container.createHotspot(el, { yaw: hs.yaw || 0, pitch: hs.pitch || 0 });
  });
}

export function getCurrentCameraAngle() {
  return currentViewParams;
}

export function setAutorotate(enabled = true) {
  if (!viewerInstance) return;
  const Marzipano = getMarzipano();
  if (!Marzipano) return;

  if (enabled) {
    const autorotate = Marzipano.autorotate({
      yawSpeed: 0.03,
      targetPitch: 0,
      targetFov: Math.PI / 4
    });
    viewerInstance.startAutorotate(autorotate);
  } else {
    viewerInstance.stopAutorotate();
  }
}
