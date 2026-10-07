// Anonymous gameplay stats and error reports, sent to this game's own database
// (jen_island_events / jen_island_errors) — never to a third party. A random device id
// links a device's sessions; no email or name is ever sent. Settings → "Share anonymous
// stats" turns it off.

import { G } from './state.js';
import { CLOUD } from './cloud.js';
import { APP_VERSION } from '../data/changelog.js';
import { devHost } from '../core/util.js';

const DEVICE_KEY = 'jenisland.device';
const rand = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
let device = 'unknown';
try { device = localStorage.getItem(DEVICE_KEY) || (localStorage.setItem(DEVICE_KEY, rand()), localStorage.getItem(DEVICE_KEY)) || rand(); } catch { device = rand(); }
const session = rand();
export { device as deviceId };
const local = devHost();     // (tests and local copies never send anything)
const on = () => !local && G.state?.settings?.stats !== false;
let queue = [], timer = 0, errors = 0;
const seenErrors = new Set();

function post(table, rows, keepalive = false) {
  return fetch(`${CLOUD.url}/rest/v1/${table}`, { method: 'POST', keepalive, headers: { apikey: CLOUD.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(rows) }).catch(() => {});
}
function flush(keepalive = false) {
  clearTimeout(timer); timer = 0;
  if (!queue.length) return;
  const rows = queue; queue = [];
  if (on()) post('jen_island_events', rows, keepalive);
}
// track('chapter', { chapter: 3 }) — small, batched, sent every 20 s and when the page hides
export function track(name, props = {}) {
  if (!on()) return;
  queue.push({ device, session, version: APP_VERSION, name, props });
  if (queue.length >= 20) flush(); else if (!timer) timer = setTimeout(flush, 20000);
}
export function reportError(e, context = {}) { report(e?.message || String(e), e?.stack, context); }
function report(message, stack, context = {}) {
  message = String(message || 'unknown error').slice(0, 500);
  if (!on() || errors >= 10 || seenErrors.has(message)) return;
  errors++; seenErrors.add(message);
  const s = G.state;
  post('jen_island_errors', [{ device, version: APP_VERSION, message, stack: String(stack || '').slice(0, 4000), context: { ...context, scene: G.scene?.id, step: s?.story?.step, chapter: s?.story?.chapter, day: s?.day, lang: G.lang, ua: navigator.userAgent.slice(0, 160) } }]);
}
export function initTelemetry() {
  addEventListener('error', e => report(e.message, e.error?.stack, { src: (e.filename || '').split('/').slice(-2).join('/'), line: e.lineno }));
  addEventListener('unhandledrejection', e => report(e.reason?.message || e.reason, e.reason?.stack, { kind: 'promise' }));
  addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(true); });
}
