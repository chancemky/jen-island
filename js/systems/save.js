// Save manager: fast local saves (every ~1.5s when something changed, and
// immediately for important events) plus cloud saves to Supabase. On load the
// newer of the two wins, so a Safari refresh never loses progress.

import { G, migrate, defaultState } from './state.js';
import * as cloud from './cloud.js';
import { bus } from '../core/util.js';

const localKey = uid => 'jenisland.save.' + uid;
let lastLocal = 0, lastCloud = 0, cloudDirty = false, cloudBusy = false;
export const saveStatus = { cloudAt: 0, localAt: 0, offline: false, error: '' };

function snapshot() {
  const s = G.state;
  s.savedAt = Date.now();
  if (G.scene && G.player && !G.runtime.inCutscene) s.pos = { scene: G.scene.id, x: Math.round(G.player.x), y: Math.round(G.player.y) };
  s.money = Math.round(s.money * 100) / 100;
  return s;
}

export function saveLocal() {
  if (!G.user) return;
  try { localStorage.setItem(localKey(G.user.id), JSON.stringify(snapshot())); saveStatus.localAt = Date.now(); }
  catch (e) { console.warn('local save failed', e); }
  G.dirty = false; cloudDirty = true;
}
export async function saveCloudNow({ keepalive = false } = {}) {
  if (!G.user || G.user.local || cloudBusy || !cloud.hasSession()) return;
  cloudBusy = true;
  try { await cloud.saveCloud(snapshot(), { keepalive }); saveStatus.cloudAt = Date.now(); saveStatus.offline = false; saveStatus.error = ''; cloudDirty = false; }
  catch (e) { saveStatus.offline = true; saveStatus.error = e.message; console.warn('cloud save failed', e); }
  finally { cloudBusy = false; lastCloud = performance.now(); }
}

export function tickSave() {
  const now = performance.now();
  if (G.dirty && now - lastLocal > 1500) { lastLocal = now; saveLocal(); }
  if (cloudDirty && now - lastCloud > 8000) saveCloudNow();
}
export function initSaveHooks() {
  bus.on('save:now', () => { saveLocal(); if (performance.now() - lastCloud > 2000) saveCloudNow(); });
  const flush = () => { if (!G.user || !G.state.player.name) return; saveLocal(); saveCloudNow({ keepalive: true }); };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  window.addEventListener('pagehide', flush);
}

export async function loadGame(user) {
  let local = null;
  try { local = JSON.parse(localStorage.getItem(localKey(user.id)) || 'null'); } catch {}
  let remote = null;
  if (!user.local) {
    try { remote = await cloud.loadCloud(); saveStatus.offline = false; }
    catch (e) { saveStatus.offline = true; saveStatus.error = e.message; console.warn('cloud load failed', e); }
  }
  const pick = !remote ? local : !local ? remote : ((remote.savedAt || 0) >= (local.savedAt || 0) ? remote : local);
  return pick ? migrate(pick) : defaultState();
}
export function wipeLocal(user) { try { localStorage.removeItem(localKey(user.id)); } catch {} }
export { defaultState };
