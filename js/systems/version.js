// Keeps players on the newest build. version.json is fetched uncached at boot
// and every few minutes; if the running code is older, the service worker
// caches are cleared and the page reloads once (at boot) or offers a refresh
// (mid-game), so a normal refresh always shows the latest update.

import { APP_VERSION } from '../data/changelog.js';
import { T } from './state.js';

const KEY = 'jenisland.reloadedFor';

async function latest() {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    return (await r.json()).v || null;
  } catch { return null; }
}
async function hardRefresh(v) {
  try { sessionStorage.setItem(KEY, v); } catch {}
  try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch {}
  try { const reg = await navigator.serviceWorker?.getRegistration(); await reg?.update(); } catch {}
  location.reload();
}

// At boot: returns true if a reload is under way (caller should stop booting).
export async function ensureLatest() {
  const v = await latest();
  if (!v || v === APP_VERSION) return false;
  let tried = null; try { tried = sessionStorage.getItem(KEY); } catch {}
  if (tried === v) return false; // already reloaded once for this version; don't loop
  await hardRefresh(v);
  return true;
}

// While playing: check now and then; when a new build is live, show a toast
// that refreshes on tap.
export function watchForUpdates(toast) {
  let shown = false;
  const check = async () => {
    if (shown || document.hidden) return;
    const v = await latest();
    if (v && v !== APP_VERSION) {
      shown = true;
      toast({ text: T('A new update is ready!', 'Có bản cập nhật mới!'), sub: T('Tap here to refresh — your progress is saved.', 'Chạm vào đây để tải lại — tiến trình đã được lưu.'), icon: 'star', ms: 20000, onClick: () => hardRefresh(v) });
    }
  };
  setInterval(check, 4 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
}
