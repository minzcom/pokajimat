import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || import.meta.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || import.meta.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || import.meta.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || import.meta.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID|| import.meta.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || import.meta.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const ADMIN_UID = import.meta.env.VITE_ADMIN_UID || import.meta.env.NEXT_PUBLIC_ADMIN_UID;

let app, db, auth;
let isFirebaseReady = false;

try {
  app = initializeApp(firebaseConfig);
  db   = getFirestore(app);
  auth = getAuth(app);
  isFirebaseReady = true;
} catch (err) {
  console.warn('[Firebase] init failed:', err.message);
}

// ── localStorage fallback persistence ──────────────────────
const LS = {
  VIEWS:    'tour_studio_views',
  ROOMS:    'tour_studio_rooms',
  HOTSPOTS: 'tour_studio_hotspots',
  COMMENTS: 'tour_studio_comments',
  MUSIC:    'tour_studio_music'
};
const load  = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };
const save  = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

const DEFAULT_VIEW_ID  = 'view_main_house';
const DEFAULT_ROOM1_ID = 'room_living_room';
const DEFAULT_ROOM2_ID = 'room_kitchen';

let memViews    = load(LS.VIEWS, [{ id: DEFAULT_VIEW_ID, name: 'Main House Virtual Tour', description: 'Full 360° walk-through', defaultRoomId: DEFAULT_ROOM1_ID }]);
let memRooms    = load(LS.ROOMS, [
  { id: DEFAULT_ROOM1_ID, viewId: DEFAULT_VIEW_ID, title: 'Living Room',   description: 'Spacious living room', imageUrl: 'https://www.marzipano.net/media/equirect/angolo.jpg',                         orderIndex: 0, initialView: { yaw:0, pitch:0, fov: Math.PI/4 } },
  { id: DEFAULT_ROOM2_ID, viewId: DEFAULT_VIEW_ID, title: 'Kitchen & Dining', description: 'Modern kitchen',   imageUrl: 'https://www.marzipano.net/media/equirect/santa-maria-dei-servi-viterbo.jpg', orderIndex: 1, initialView: { yaw:0, pitch:0, fov: Math.PI/4 } }
]);
let memHotspots = load(LS.HOTSPOTS, [
  { id: 'hs_demo', roomId: DEFAULT_ROOM1_ID, viewId: DEFAULT_VIEW_ID, targetRoomId: DEFAULT_ROOM2_ID, name: 'Go to Kitchen', icon: 'bi-door-open-fill', color: '#6366f1', yaw: 0.5, pitch: 0, tooltip: 'Enter Kitchen', animation: 'pulse', visible: true }
]);

// ── Helpers ─────────────────────────────────────────────────
async function fsGet(col) {
  if (!isFirebaseReady) return null;
  try { return await getDocs(collection(db, col)); } catch { return null; }
}
async function fsQuery(col, field, val) {
  if (!isFirebaseReady) return null;
  try { return await getDocs(query(collection(db, col), where(field, '==', val))); } catch { return null; }
}
async function fsAdd(col, payload) {
  if (!isFirebaseReady) throw new Error('Firebase not ready');
  return await addDoc(collection(db, col), payload);
}
async function fsUpdate(col, id, data) {
  if (!isFirebaseReady) return;
  try { await updateDoc(doc(db, col, id), data); } catch {}
}
async function fsDelete(col, id) {
  if (!isFirebaseReady) return;
  try { await deleteDoc(doc(db, col, id)); } catch {}
}

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════

export function getFirebaseAuth() { return auth; }

export function signIn(email, password) {
  if (!auth) return Promise.reject(new Error('Firebase Auth not available'));
  return signInWithEmailAndPassword(auth, email, password);
}

export function signOut() {
  if (!auth) return Promise.resolve();
  return firebaseSignOut(auth);
}

export function onAuthChange(callback) {
  if (!auth) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, callback);
}

export function isAdmin(user) {
  return !!(user && user.uid === ADMIN_UID);
}

// ══════════════════════════════════════════
// VIEWS (TOUR PROJECTS)
// ══════════════════════════════════════════

export async function getViews() {
  const snap = await fsGet('views');
  if (snap && !snap.empty) {
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
  }
  return [...memViews];
}

export async function addView(data) {
  const payload = { name: data.name || 'New Tour', description: data.description || '', defaultRoomId: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
  try {
    const ref = await fsAdd('views', payload);
    return { id: ref.id, ...payload };
  } catch {
    const local = { id: `view_${Date.now()}`, ...payload, createdAt: Date.now() };
    memViews.unshift(local); save(LS.VIEWS, memViews);
    return local;
  }
}

export async function updateView(id, data) {
  await fsUpdate('views', id, { ...data, updatedAt: serverTimestamp() });
  const i = memViews.findIndex(v => v.id === id);
  if (i !== -1) { memViews[i] = { ...memViews[i], ...data }; save(LS.VIEWS, memViews); }
  return true;
}

export async function deleteView(id) {
  const rooms = await getRoomsByViewId(id);
  for (const r of rooms) await deleteRoom(r.id);
  await fsDelete('views', id);
  memViews = memViews.filter(v => v.id !== id); save(LS.VIEWS, memViews);
  return true;
}

export async function duplicateView(id) {
  const views = await getViews();
  const src = views.find(v => v.id === id); if (!src) return null;
  const nv = await addView({ name: `${src.name} (Copy)`, description: src.description });
  const rooms = await getRoomsByViewId(id); const map = {};
  for (const r of rooms) { const nr = await addRoom({ ...r, viewId: nv.id, title: r.title }); map[r.id] = nr.id; }
  if (src.defaultRoomId && map[src.defaultRoomId]) await updateView(nv.id, { defaultRoomId: map[src.defaultRoomId] });
  for (const r of rooms) { const hs = await getHotspotsByRoomId(r.id); for (const h of hs) await addHotspot({ ...h, roomId: map[r.id], viewId: nv.id, targetRoomId: map[h.targetRoomId]||h.targetRoomId }); }
  return nv;
}

// ══════════════════════════════════════════
// ROOMS
// ══════════════════════════════════════════

export async function getRoomsByViewId(viewId) {
  if (!viewId) return [];
  const snap = await fsQuery('panorama_rooms', 'viewId', viewId);
  if (snap && !snap.empty) {
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.orderIndex||0)-(b.orderIndex||0));
  }
  return memRooms.filter(r => r.viewId === viewId).sort((a,b) => (a.orderIndex||0)-(b.orderIndex||0));
}

export async function addRoom(data) {
  const payload = {
    viewId: data.viewId, title: data.title || 'Untitled Room', description: data.description || '',
    imageUrl: data.imageUrl, originalSizeMB: data.originalSizeMB || '0', compressedSizeMB: data.compressedSizeMB || '0',
    orderIndex: data.orderIndex || 0, initialView: data.initialView || { yaw:0, pitch:0, fov: Math.PI/4 }, createdAt: serverTimestamp()
  };
  try {
    const ref = await fsAdd('panorama_rooms', payload);
    return { id: ref.id, ...payload };
  } catch {
    const local = { id: `room_${Date.now()}`, ...payload, createdAt: Date.now() };
    memRooms.push(local); save(LS.ROOMS, memRooms);
    return local;
  }
}

export async function updateRoom(id, data) {
  await fsUpdate('panorama_rooms', id, data);
  const i = memRooms.findIndex(r => r.id === id);
  if (i !== -1) { memRooms[i] = { ...memRooms[i], ...data }; save(LS.ROOMS, memRooms); }
  return true;
}

export async function deleteRoom(id) {
  const hs = await getHotspotsByRoomId(id);
  for (const h of hs) await deleteHotspot(h.id);
  await fsDelete('panorama_rooms', id);
  memRooms = memRooms.filter(r => r.id !== id); save(LS.ROOMS, memRooms);
  return true;
}

export async function duplicateRoom(id) {
  const src = memRooms.find(r => r.id === id);
  let srcData = src;
  if (!srcData && isFirebaseReady) {
    try { const snap = await getDocs(query(collection(db,'panorama_rooms'))); const d = snap.docs.find(x=>x.id===id); if(d) srcData=d.data(); } catch {}
  }
  if (!srcData) return null;
  const nr = await addRoom({ ...srcData, title: `${srcData.title} (Copy)`, orderIndex: (srcData.orderIndex||0)+1 });
  const hs = await getHotspotsByRoomId(id);
  for (const h of hs) await addHotspot({ ...h, roomId: nr.id });
  return nr;
}

// ══════════════════════════════════════════
// HOTSPOTS
// ══════════════════════════════════════════

export async function getHotspotsByRoomId(roomId) {
  if (!roomId) return [];
  const snap = await fsQuery('hotspots', 'roomId', roomId);
  if (snap && !snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return memHotspots.filter(h => h.roomId === roomId);
}

export async function addHotspot(data) {
  const payload = {
    roomId: data.roomId, viewId: data.viewId, targetRoomId: data.targetRoomId || '',
    name: data.name || 'Hotspot', icon: data.icon || 'bi-door-open-fill', color: data.color || '#6366f1',
    yaw: parseFloat(data.yaw)||0, pitch: parseFloat(data.pitch)||0,
    tooltip: data.tooltip || data.name || 'Hotspot', description: data.description || '',
    animation: data.animation || 'pulse', visible: data.visible !== false, createdAt: serverTimestamp()
  };
  try {
    const ref = await fsAdd('hotspots', payload);
    return { id: ref.id, ...payload };
  } catch {
    const local = { id: `hs_${Date.now()}`, ...payload, createdAt: Date.now() };
    memHotspots.push(local); save(LS.HOTSPOTS, memHotspots);
    return local;
  }
}

export async function updateHotspot(id, data) {
  await fsUpdate('hotspots', id, data);
  const i = memHotspots.findIndex(h => h.id === id);
  if (i !== -1) { memHotspots[i] = { ...memHotspots[i], ...data }; save(LS.HOTSPOTS, memHotspots); }
  return true;
}

export async function deleteHotspot(id) {
  await fsDelete('hotspots', id);
  memHotspots = memHotspots.filter(h => h.id !== id); save(LS.HOTSPOTS, memHotspots);
  return true;
}

// ══════════════════════════════════════════
// COMMENTS (PUBLIC GUEST REVIEWS)
// ══════════════════════════════════════════

export async function getCommentsByRoomId(roomId) {
  if (!roomId) return [];
  const snap = await fsQuery('comments', 'roomId', roomId);
  if (snap && !snap.empty) {
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }
  return (load(LS.COMMENTS, [])).filter(c => c.roomId === roomId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function addComment(data) {
  const payload = {
    roomId: data.roomId,
    author: data.author || 'Anonymous Guest',
    content: data.content,
    createdAt: Date.now() // Standard number timestamp for universal sorting
  };
  try {
    const ref = await fsAdd('comments', { ...payload, createdAt: serverTimestamp() });
    return { id: ref.id, ...payload };
  } catch {
    const local = { id: `cmt_${Date.now()}`, ...payload };
    const all = load(LS.COMMENTS, []);
    all.push(local);
    save(LS.COMMENTS, all);
    return local;
  }
}

// ══════════════════════════════════════════
// MUSIC LIBRARY CRUD
// ══════════════════════════════════════════

export async function getMusicByViewId(viewId) {
  if (!viewId) return [];
  const snap = await fsQuery('music', 'viewId', viewId);
  if (snap && !snap.empty) {
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }
  return (load(LS.MUSIC, [])).filter(m => m.viewId === viewId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function addMusic(data) {
  const payload = {
    viewId: data.viewId,
    title: data.title || 'Untitled Track',
    url: data.url,
    createdAt: Date.now()
  };
  try {
    const ref = await fsAdd('music', { ...payload, createdAt: serverTimestamp() });
    return { id: ref.id, ...payload };
  } catch {
    const local = { id: `mus_${Date.now()}`, ...payload };
    const all = load(LS.MUSIC, []);
    all.push(local);
    save(LS.MUSIC, all);
    return local;
  }
}

export async function deleteMusic(id) {
  await fsDelete('music', id);
  let all = load(LS.MUSIC, []);
  all = all.filter(m => m.id !== id);
  save(LS.MUSIC, all);
  return true;
}

export { isFirebaseReady };
