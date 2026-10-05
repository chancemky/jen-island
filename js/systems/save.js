// Save manager: fast local saves (every ~1.5s when something changed, and
// immediately for important events) plus cloud saves to Supabase.
//
// Protection against losing an island:
//  • local backups — a small ring of snapshots (each night, and every 10 minutes of play), used
//    only to recover a damaged save automatically: players can't pick one to roll back to
//  • cloud snapshots — one per in-game day, the last 7 kept (jen_island_save_snapshots)
//  • malformed / unreadable saves are never overwritten silently: the bad copy is
//    kept aside (…corrupt) and the newest good backup is used instead
//  • migration is wrapped: if an old save can't be upgraded, fall back to a backup
//  • conflicts: the newer save normally wins, but a save that is newer yet *behind*
//    in the story (another device that missed progress) doesn't overwrite a more
//    advanced one unless it was an intentional reset — and the other copy is kept
//    as a backup either way
//  • quota errors: old backups are dropped to make room, then the save is retried

import { G, T, migrate, defaultState, SAVE_VERSION } from './state.js';
import * as cloud from './cloud.js';
import { bus } from '../core/util.js';
import { leaderboardRow, shouldPushLeaderboard } from './progress.js';
import { toast } from '../ui/hud.js';

// saves from before the current SAVE_VERSION are not loaded — everyone starts fresh after a reset
const localKey = uid => `jenisland.save${SAVE_VERSION}.${uid}`;
const bakKey = uid => localKey(uid) + '.backups';
const BACKUPS = 4;
let lastLocal = 0, lastCloud = 0, lastBackup = 0, cloudDirty = false, cloudBusy = false;
let keptAt = null;     // the clock and position in the last local save (see tickSave)
export const saveStatus = { cloudAt: 0, localAt: 0, offline: false, error: '', recovered: '' };

function snapshot() {
  const s = G.state;
  s.savedAt = Date.now();
  if (G.scene && G.player && !G.runtime.inCutscene) {
    // never keep a spot nobody can stand on (a roof, inside a bush or a cart): save the nearest free floor instead, or keep the last good place
    const sc = G.scene, r = G.player.radius || 5, x = Math.round(G.player.x), y = Math.round(G.player.y);
    const q = sc.canStand?.(x, y, r) ? [x, y] : sc.nearestStand?.(x, y, r);
    if (q) s.pos = { scene: sc.id, x: Math.round(q[0]), y: Math.round(q[1]) };
  }
  s.money = Math.round(s.money * 100) / 100;
  // a cutscene that shows other hours of the day (the automation montage) saves the real clock
  return G.runtime.realTime != null ? { ...s, time: G.runtime.realTime } : s;
}
// a save must at least look like an island before we trust it
export function validSave(s) {
  return !!(s && typeof s === 'object' && s.player && typeof s.player === 'object' && s.story && typeof s.story.step === 'string' && s.story.flags && typeof s.story.flags === 'object'
    && s.biz && typeof s.biz === 'object' && Number.isFinite(+s.day) && Number.isFinite(+s.money) && (s.v || 0) >= SAVE_VERSION);
}
const progressOf = s => (s?.story?.chapter || 0) * 1e6 + (s?.day || 0) * 1e3 + Math.min(999, Math.floor((s?.lifetime || 0) / 1000));
function readJSON(key) {
  let txt = null;
  try { txt = localStorage.getItem(key); } catch { return { ok: false }; }
  if (txt == null) return { ok: true, data: null };
  try { return { ok: true, data: JSON.parse(txt), txt }; } catch { return { ok: false, txt }; }
}
export function peekLocalLanguage(user) {
  if (!user?.id) return null;
  const r = readJSON(localKey(user.id)), lang = r.ok && r.data?.settings?.lang;
  return lang === 'en' || lang === 'vi' ? lang : null;
}
function writeRaw(key, txt) {
  try { localStorage.setItem(key, txt); return true; }
  catch (e) {
    // out of space: drop our oldest backups and try once more
    try { const b = readBackups(); while (b.length > 1) b.pop(); localStorage.setItem(bakKey(G.user.id), JSON.stringify(b)); localStorage.setItem(key, txt); return true; } catch { console.warn('local save failed', e); return false; }
  }
}

// ---------------------------------------------------------------- backups
export function readBackups(uid = G.user?.id) {
  if (!uid) return [];
  const r = readJSON(bakKey(uid));
  return r.ok && Array.isArray(r.data) ? r.data.filter(b => b && validSave(b.data)) : [];
}
export function backupNow(reason = 'auto', data = G.state) {
  if (!G.user || !validSave(data) || !data.player?.name) return;
  const list = readBackups();
  const last = list[0];
  if (last && last.data.savedAt === data.savedAt && last.reason === reason) return;
  list.unshift({ at: Date.now(), reason, day: data.day, chapter: data.story.chapter, data: JSON.parse(JSON.stringify(data)) });
  while (list.length > BACKUPS) list.pop();
  writeRaw(bakKey(G.user.id), JSON.stringify(list));
  lastBackup = performance.now();
}
function writeLocal() {
  const snap = snapshot();
  if (writeRaw(localKey(G.user.id), JSON.stringify(snap))) { saveStatus.localAt = Date.now(); keptAt = { time: snap.time, pos: snap.pos }; }
}
export function saveLocal() {
  if (!G.user) return;
  writeLocal();
  G.dirty = false; cloudDirty = true;
}
// Walking around and the clock ticking don't mark the save dirty, so a reload could put you
// back where (and when) something last changed. Every few seconds of play, if you've moved
// or the clock has run on, the local copy is refreshed (local only: no extra cloud traffic).
function drifted() {
  const s = G.state, p = G.player, k = keptAt;
  if (!s.player?.name || !s.story?.flags?.freeRoam) return false;
  if (!k) return true;
  if (Math.abs((s.time || 0) - (k.time || 0)) >= 5) return true;
  if (!G.scene || !p || G.runtime.inCutscene) return false;
  return !k.pos || k.pos.scene !== G.scene.id || Math.hypot(p.x - k.pos.x, p.y - k.pos.y) > 24;
}
export async function saveCloudNow({ keepalive = false } = {}) {
  if (!G.user || G.user.local || cloudBusy || !cloud.hasSession()) return;
  cloudBusy = true;
  try {
    await cloud.saveCloud(snapshot(), { keepalive }); saveStatus.cloudAt = Date.now(); saveStatus.offline = false; saveStatus.error = ''; cloudDirty = false;
    if (G.state.player.name && (keepalive || shouldPushLeaderboard())) cloud.pushLeaderboard(leaderboardRow(G.state)).catch(e => console.warn('leaderboard', e.message));
  }
  catch (e) {
    // say so once per outage while you're playing (it retries quietly; the game is still saved on this device)
    if (!saveStatus.offline && !keepalive && G.state?.player?.name) toast({ text: T('Cloud save failed', 'Lưu đám mây thất bại'), sub: T('Saved on this device · retrying', 'Đã lưu trên máy · đang thử lại'), bad: true });
    saveStatus.offline = true; saveStatus.error = e.message; console.warn('cloud save failed', e);
  }
  finally { cloudBusy = false; lastCloud = performance.now(); }
}

export function tickSave() {
  const now = performance.now();
  if (G.dirty && now - lastLocal > 1500) { lastLocal = now; saveLocal(); }
  else if (G.user && now - lastLocal > 5000 && drifted()) { lastLocal = now; writeLocal(); }
  if (cloudDirty && now - lastCloud > 8000) saveCloudNow();
  if (now - lastBackup > 10 * 60 * 1000 && G.state.player?.name) backupNow('auto');
}
export function initSaveHooks() {
  bus.on('save:now', () => { saveLocal(); if (performance.now() - lastCloud > 2000) saveCloudNow(); });
  // every night: a local backup and a cloud snapshot of the new morning
  bus.on('dayEnd', () => {
    saveLocal(); backupNow('night');
    if (G.user && !G.user.local && cloud.hasSession()) cloud.saveSnapshot(G.state).catch(e => console.warn('snapshot', e.message));
  });
  const flush = () => { if (!G.user || !G.state.player.name) return; saveLocal(); saveCloudNow({ keepalive: true }); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
}

// ---------------------------------------------------------------- loading
function tryMigrate(s) { try { const m = migrate(s); return validSave(m) ? m : null; } catch (e) { console.warn('migrate failed', e); return null; } }
export async function loadGame(user) {
  G.user ||= user;
  const note = [];
  // local copy (keep an unreadable one aside instead of losing it)
  const L = readJSON(localKey(user.id));
  let local = L.ok ? L.data : null;
  if (!L.ok || (local && !validSave(local))) {
    if (L.txt && (local?.v || SAVE_VERSION) >= SAVE_VERSION) { try { localStorage.setItem(localKey(user.id) + '.corrupt', L.txt); } catch {} note.push('local save was damaged'); }
    local = null;
  }
  // cloud copy, or the newest valid cloud snapshot if the main row is damaged
  let remote = null;
  if (!user.local) {
    try {
      remote = await cloud.loadCloud(); saveStatus.offline = false;
      if (remote && !validSave(remote) && (remote.v || 0) >= SAVE_VERSION) { note.push('cloud save was damaged'); remote = null; for (const snap of await cloud.loadSnapshots().catch(() => [])) if (validSave(snap)) { remote = snap; note.push('used a cloud snapshot'); break; } }
      else if (remote && !validSave(remote)) remote = null;                // older version: not loaded (reset)
    } catch (e) { saveStatus.offline = true; saveStatus.error = e.message; console.warn('cloud load failed', e); }
  }
  // pick: newer wins, unless it is behind in the story without having been reset on purpose
  let pick = null, other = null;
  if (local && remote) {
    const [newer, older] = (remote.savedAt || 0) >= (local.savedAt || 0) ? [remote, local] : [local, remote];
    const intentional = (newer.resetAt || 0) > (older.savedAt || 0);
    if (!intentional && progressOf(newer) < progressOf(older) && (older.story?.chapter || 0) > (newer.story?.chapter || 0)) { pick = older; other = newer; note.push('kept the save that was further along'); }
    else { pick = newer; other = older; }
  } else pick = local || remote;
  let state = pick ? tryMigrate(pick) : null;
  if (!state && other) { state = tryMigrate(other); note.push('fell back to the other copy'); }
  if (!state) { for (const b of readBackups(user.id)) { state = tryMigrate(b.data); if (state) { note.push('restored a local backup'); break; } } }
  if (!state) state = defaultState();
  // the copy that lost the conflict is kept as a backup, never thrown away
  if (other && other !== pick && validSave(other) && other.player?.name) { const prevState = G.state; G.state = state; backupNow('other-device', other); G.state = prevState; }
  saveStatus.recovered = note.join(' · ');
  if (note.length) console.info('[save]', saveStatus.recovered);
  return state;
}
// Settings → Reset game: a brand-new island (back on the boat), keeping only your settings
export async function resetGame() {
  backupNow('before-reset');
  const keep = { ...G.state.settings };
  G.state = defaultState(); G.state.settings = { ...G.state.settings, ...keep };
  G.state.savedAt = Date.now(); G.state.resetAt = Date.now();
  if (G.user) writeRaw(localKey(G.user.id), JSON.stringify(G.state));
  if (G.user && !G.user.local && cloud.hasSession()) { try { await cloud.saveCloud(G.state, { keepalive: true }); } catch (e) { console.warn('reset cloud save failed', e); } }
}
