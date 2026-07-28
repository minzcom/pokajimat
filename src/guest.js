/**
 * guest.js — Guest page bootstrap
 * Auto-loads entry room, no admin code ever imported here.
 */

import { getViews, getRoomsByViewId, getHotspotsByRoomId, getCommentsByRoomId, addComment } from './data/firestore.js';
import { initViewer, loadScene, setCallbacks, setAutorotate } from './components/PanoramaViewer.js';
import { renderRoomList } from './components/RoomList.js';

// State
let rooms        = [];
let activeRoomId = null;
let autorotating = false;
let comments     = [];

const panoContainer    = document.getElementById('pano-container');
const loadingOverlay   = document.getElementById('guest-loading');
const roomBadge        = document.getElementById('current-room-badge');
const roomNavEl        = document.getElementById('guest-room-nav');
const btnToggleRooms   = document.getElementById('btn-toggle-rooms');
const btnAutorotate    = document.getElementById('btn-guest-autorotate');

const btnToggleComments = document.getElementById('btn-guest-comments');
const btnCloseComments  = document.getElementById('btn-close-comments');
const commentsPanel     = document.getElementById('guest-comments-panel');
const commentsListEl    = document.getElementById('comments-list');
const formPostComment   = document.getElementById('form-post-comment');

const btnAudio          = document.getElementById('btn-guest-audio');
const audioEl           = document.getElementById('guest-audio');

function waitForMarzipano(cb, tries = 40) {
  if (typeof window.Marzipano !== 'undefined') { cb(); return; }
  if (tries > 0) setTimeout(() => waitForMarzipano(cb, tries - 1), 100);
  else console.error('[Guest] Marzipano CDN failed to load');
}

function hideLoading() {
  loadingOverlay.classList.add('fade-out');
  setTimeout(() => loadingOverlay.remove(), 500);
}

function initAudio(audioUrl) {
  if (!audioUrl) return;
  audioEl.src = audioUrl;
  btnAudio.classList.remove('d-none');

  const startPlay = e => {
    if (e && e.target && e.target.closest('#btn-guest-audio')) {
      cleanupListeners();
      return;
    }
    cleanupListeners();
    audioEl.play().then(() => {
      btnAudio.classList.add('playing');
      btnAudio.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
    }).catch(() => {
      // Re-enable listeners if play was blocked by browser
      document.addEventListener('click', startPlay);
      document.addEventListener('touchstart', startPlay, { passive: true });
    });
  };

  const cleanupListeners = () => {
    document.removeEventListener('click', startPlay);
    document.removeEventListener('touchstart', startPlay);
  };

  // Attempt to play immediately on load
  audioEl.play().then(() => {
    btnAudio.classList.add('playing');
    btnAudio.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
  }).catch(() => {
    // If blocked by browser autoplay policy, wait for user interaction
    document.addEventListener('click', startPlay);
    document.addEventListener('touchstart', startPlay, { passive: true });
  });
}

async function refreshComments() {
  if (!activeRoomId) return;
  comments = await getCommentsByRoomId(activeRoomId);
  renderComments();
}

function renderComments() {
  if (!comments || comments.length === 0) {
    commentsListEl.innerHTML = `<div class="text-center py-4" style="color: #6b5a48; font-size: 0.85rem;">No comments yet. Be the first!</div>`;
    return;
  }

  commentsListEl.innerHTML = comments.map(c => {
    let timeStr = '';
    if (c.createdAt) {
      const d = new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt);
      timeStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return `
      <div class="comment-item">
        <div class="comment-meta">
          <span class="comment-author">${escapeHTML(c.author)}</span>
          <span class="comment-time">${timeStr}</span>
        </div>
        <div class="comment-content" style="color: var(--ink); word-break: break-word;">${escapeHTML(c.content)}</div>
      </div>
    `;
  }).join('');
}

function escapeHTML(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function switchRoom(roomId) {
  const room = rooms.find(r => r.id === roomId);
  if (!room) return;
  activeRoomId = roomId;

  const hotspots = await getHotspotsByRoomId(roomId);
  loadScene(room, hotspots, null);

  // Update badge
  roomBadge.textContent = room.title;

  // Update nav list active state
  roomNavEl.querySelectorAll('.guest-room-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-room-id') === roomId);
  });

  // Load comments
  await refreshComments();
}

function renderNav() {
  renderRoomList({
    mode: 'nav',
    container: roomNavEl,
    rooms,
    activeRoomId,
    onSelectRoom: id => {
      switchRoom(id);
      roomNavEl.classList.remove('open'); // Close menu after picking
    }
  });
}

async function boot() {
  // Init viewer first
  initViewer(panoContainer);

  // Set callbacks — guest mode: no editor, hotspot click = navigate
  setCallbacks({
    onNavigateRoom: id => switchRoom(id)
  });

  // Load first available view
  const views = await getViews();
  if (views.length === 0) {
    hideLoading();
    roomBadge.textContent = 'No tour data found.';
    return;
  }

  const activeView = views[0];
  rooms = await getRoomsByViewId(activeView.id);

  if (rooms.length === 0) {
    hideLoading();
    roomBadge.textContent = 'No rooms in this tour.';
    return;
  }

  // Auto-load entry room (defaultRoomId or first room)
  const entryId = activeView.defaultRoomId && rooms.some(r => r.id === activeView.defaultRoomId)
    ? activeView.defaultRoomId
    : rooms[0].id;

  initAudio(activeView.audioUrl);
  renderNav();
  await switchRoom(entryId);
  hideLoading();
}

// ── Event listeners ────────────────────────────────────────
btnToggleRooms.addEventListener('click', () => {
  roomNavEl.classList.toggle('open');
  commentsPanel.classList.remove('open');
  btnToggleComments.classList.remove('active');
});

btnToggleComments.addEventListener('click', () => {
  commentsPanel.classList.toggle('open');
  btnToggleComments.classList.toggle('active', commentsPanel.classList.contains('open'));
  roomNavEl.classList.remove('open');
});

btnCloseComments.addEventListener('click', () => {
  commentsPanel.classList.remove('open');
  btnToggleComments.classList.remove('active');
});

btnAudio.addEventListener('click', e => {
  e.stopPropagation();
  if (audioEl.paused) {
    audioEl.play().then(() => {
      btnAudio.classList.add('playing');
      btnAudio.innerHTML = '<i class="bi bi-volume-up-fill"></i>';
    }).catch(() => {});
  } else {
    audioEl.pause();
    btnAudio.classList.remove('playing');
    btnAudio.innerHTML = '<i class="bi bi-volume-mute-fill"></i>';
  }
});

formPostComment.addEventListener('submit', async e => {
  e.preventDefault();
  if (!activeRoomId) return;

  const authorEl = document.getElementById('comment-author');
  const textEl = document.getElementById('comment-text');

  const author = authorEl.value.trim() || 'Anonymous Guest';
  const content = textEl.value.trim();

  if (!content) return;

  try {
    await addComment({ roomId: activeRoomId, author, content });
    textEl.value = '';
    await refreshComments();
  } catch (err) {
    console.error('Failed to post comment:', err);
  }
});

// Close room nav if clicking outside
document.addEventListener('click', e => {
  if (!e.target.closest('#room-nav-container') && !e.target.closest('#guest-comments-panel') && !e.target.closest('#btn-guest-comments') && !e.target.closest('#btn-guest-audio')) {
    roomNavEl.classList.remove('open');
  }
});

btnAutorotate.addEventListener('click', () => {
  autorotating = !autorotating;
  setAutorotate(autorotating);
  btnAutorotate.classList.toggle('active', autorotating);
});

// ── Start ──────────────────────────────────────────────────
waitForMarzipano(boot);
