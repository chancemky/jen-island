// Launch audit: node tools/audit.mjs <mode> <outDir> [lang] [only]
// Plays the game the way a player meets it, in four modes, and saves a numbered screenshot of
// every screen plus a report (errors, layout problems, untranslated text):
//   safari     WebKit, iPhone 13, a Safari tab (browser bars, so a shorter page)
//   webapp     WebKit, iPhone 13 full screen, "Add to Home Screen" (standalone, notch + home bar)
//   ios        WebKit, iPhone 13, the App Store build (Capacitor ios, no service worker)
//   android    Chromium, Pixel 7, the Google Play build (Capacitor android)
// Supabase calls answer [] so nothing touches the live database.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium, webkit, devices } from 'playwright';

const [mode = 'safari', OUT = 'audit-out', lang = 'en', only = ''] = process.argv.slice(2);
const ROOT = process.cwd();
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const MODES = {
  safari: { engine: webkit, device: { ...devices['iPhone 13'], viewport: { width: 390, height: 664 } } },
  webapp: { engine: webkit, device: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }, standalone: true, notch: true },
  ios: { engine: webkit, device: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }, native: 'ios', notch: true },
  android: { engine: chromium, device: { ...devices['Pixel 7'] }, native: 'android' },
  ipad: { engine: webkit, device: { ...devices['iPad (gen 7)'] } },
};
const M = MODES[mode]; if (!M) { console.error('mode?', Object.keys(MODES)); process.exit(1); }
// Playwright's WebKit is frozen (and crashes) on macOS 14: fall back to Chromium with the same iPhone
// screen, so the iPhone-only layout and app paths are still covered (Safari itself: tools/safari.mjs)
let engine = M.engine; try { const t = await engine.launch(); await t.close(); } catch { console.log(`(${mode}: WebKit unavailable — using Chromium with the iPhone screen)`); engine = chromium; }
const b = await engine.launch(), ctx = await b.newContext({ ...M.device, locale: lang === 'vi' ? 'vi-VN' : 'en-US' });
await ctx.addInitScript(({ native, standalone, notch }) => {
  if (native) window.Capacitor = { isNativePlatform: () => true, getPlatform: () => native, Plugins: {} };
  if (standalone) { Object.defineProperty(navigator, 'standalone', { get: () => true }); const mm = window.matchMedia.bind(window); window.matchMedia = q => /display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} } : mm(q); }
  if (notch) document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = ':root{--sat:47px!important;--sab:34px!important}'; document.head.appendChild(st); });
}, { native: M.native || null, standalone: !!M.standalone, notch: !!M.notch });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(`[${cur}] pageerror ${e.message}`));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(`[${cur}] ${m.text().slice(0, 300)}`); if (m.type() === 'warning' && /validate|content issue/.test(m.text())) errs.push(`[${cur}] ${m.text().slice(0, 2000)}`); });
p.on('requestfailed', r => { if (!/supabase|stripe|revenuecat/.test(r.url())) errs.push(`[${cur}] request failed ${r.url()}`); });
await p.route(/supabase\.co|stripe\.com|revenuecat/, r => r.fulfill({ json: [] }));

let cur = 'boot', n = 0;
const report = [];
const seen = new Set();
const note = (...a) => { const t = a.join(' '), k = cur.replace(/-.*/, '') + t.replace(/\d+/g, '#'); if (seen.has(k)) return; seen.add(k); report.push(`[${cur}] ` + t); };
const wait = ms => p.waitForTimeout(ms);
// layout checks on whatever is on screen right now
async function checks() {
  const r = await p.evaluate(lang => {
    const out = [], W = innerWidth, H = innerHeight;
    const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const lbl = e => (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '"';
    const covered = e => { const b = e.getBoundingClientRect(); const x = Math.min(W - 1, Math.max(0, b.left + b.width / 2)), y = Math.min(H - 1, Math.max(0, b.top + b.height / 2)); const t = document.elementFromPoint(x, y); return t && t !== e && !e.contains(t) && !t.contains(e) ? t : null; };
    for (const e of document.querySelectorAll('button, a.btn, [role=button], input, select')) {
      if (!vis(e) || e.closest('.hidden, [hidden], #boot.gone')) continue;
      const b = e.getBoundingClientRect();
      const hs = (() => { for (let a = e.parentElement; a; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true; } return false; })();
      if (!hs && (b.right > W + 1 || b.left < -1) || b.bottom > H + 1 && !e.closest('.scroll, .list, .sheet-body, [style*=overflow]')) out.push(`off-screen: ${lbl(e)} (${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}×${Math.round(b.height)})`);
      if ((b.width < 30 || b.height < 30) && b.top < H && b.bottom > 0) out.push(`small tap target ${Math.round(b.width)}×${Math.round(b.height)}: ${lbl(e)}`);
      if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible') out.push(`text cut off: ${lbl(e)}`);
      const layer = [...document.querySelectorAll('.sheet-wrap:not(.out), .summary, .modal, .wn-wrap:not(.out), .album-view')].pop();
      if ((!layer || layer.contains(e)) && b.top >= 0 && b.bottom <= H && b.left >= 0 && b.right <= W) { const c = covered(e); if (c && !c.closest('.toast, .toasts, #toasts')) out.push(`covered: ${lbl(e)} under ${lbl(c)}`); }
    }
    for (const e of document.querySelectorAll('b, small, span, p, div, h1, h2, h3, li, label')) {
      if (e.children.length || !vis(e)) continue;
      const b = e.getBoundingClientRect(); if (b.top > H || b.bottom < 0) continue;
      const s = getComputedStyle(e);
      if (e.scrollWidth > e.clientWidth + 2 && (s.overflow === 'hidden' || s.textOverflow === 'ellipsis') && s.whiteSpace === 'nowrap') out.push(`ellipsised: ${lbl(e)}`);
      if (b.right > W + 2 && !e.closest('[style*=overflow], .scroll, .tabs, .hscroll')) out.push(`text past the edge: ${lbl(e)}`);
      const t = (e.textContent || '').trim();
      if (/undefined|NaN|\[object|null\b|\$\{/.test(t)) out.push(`bad text: ${lbl(e)}`);
      if (lang === 'vi' && t.length > 12 && /^[A-Za-z ,.'!?:-]+$/.test(t) && /\b(the|and|your|you|with|from|tap|open|buy|shop|day|level)\b/i.test(t)) out.push(`English in Vietnamese mode: "${t.slice(0, 70)}"`);
    }
    for (const im of document.images) if (vis(im) && im.complete && !im.naturalWidth) out.push(`broken image ${im.src.slice(0, 80)}`);
    if (document.documentElement.scrollWidth > W + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth}px)`);
    return [...new Set(out)].slice(0, 40);
  }, lang).catch(e => ['checks failed ' + e.message]);
  for (const x of r) note(x);
}
async function shot(name, { full = false } = {}) {
  n++; const f = path.join(OUT, `${String(n).padStart(3, '0')}-${name}.png`);
  await p.screenshot({ path: f, fullPage: full }).catch(e => note('screenshot failed', e.message));
  await checks();
}
const ev = (fn, arg) => p.evaluate(fn, arg).catch(e => { note('eval failed:', e.message.slice(0, 200)); return null; });
const imp = '(u => import(u))';
async function clear(times = 12) {
  for (let i = 0; i < times; i++) {
    const left = await ev(() => { const c = document.querySelector('.modal [data-a=no], #skipBtn:not(.hidden), .modal .btn.ghost, .modal .btn, .reward button, .wn-wrap .btn, .levelup .btn, .summary .btn, .card-wrap .btn'); if (c) { c.click(); return true; } return false; });
    if (!left) break; await wait(500);
  }
}
async function closeModes() { await ev(async () => { (await import('/js/ui/decorate.js')).stopDecorate?.(); (await import('/js/ui/photo.js')).closePhotoMode?.(); document.querySelector('.ph-top .ph-x')?.click(); }); await new Promise(r => setTimeout(r, 400)); }
async function closeSheets() { await closeModes(); await ev(() => { for (let i = 0; i < 4; i++) document.querySelector('.sheet-wrap:not(.out) .sheet-x, .sheet-wrap:not(.out) .close, .av-x, .sheet-wrap:not(.out) [aria-label="Close"], .sheet-wrap:not(.out) [aria-label="Đóng"]')?.click(); }); await wait(500); }
// a sheet: screenshot it, then scroll its body to the end and screenshot again
async function sheetShots(name) {
  await wait(700); await shot(name);
  const more = await ev(() => { const el = [...document.querySelectorAll('.sheet-wrap:not(.out) .scroll, .sheet-wrap:not(.out) .sheet-body, .sheet-wrap:not(.out) .list, .sheet-wrap:not(.out) .pane')].find(e => e.scrollHeight > e.clientHeight + 40); if (!el) return false; el.scrollTop = el.scrollHeight; return true; });
  if (more) { await wait(400); await shot(name + '-end'); }
}
const G = () => ev(async () => (await import('/js/systems/state.js')).G.state.story.step);

const want = s => !only || only.split(',').includes(s);
try {
  // ------------------------------------------------------------ 1. first run
  cur = 'first-run';
  await p.goto(BASE); await wait(2500); await shot('boot');
  await p.waitForSelector('#auth:not(.hidden)', { timeout: 20000 }).catch(() => note('no sign-in screen'));
  if (lang === 'vi') { await ev(() => document.querySelector('[data-lang=vi], .lang-vi, button[lang=vi]')?.click()); await wait(400); }
  await shot('sign-in');
  // the sign-up / sign-in / reset tabs, then play as a guest
  for (const lab of [/create|sign up|tạo/i, /sign in|đăng nhập/i, /forgot|quên/i]) {
    const ok = await ev(src => { const re = new RegExp(src, 'i'); const b = [...document.querySelectorAll('#auth button, #auth a')].find(e => re.test(e.textContent) && e.offsetParent); if (b) { b.click(); return true; } return false; }, lab.source);
    if (ok) { await wait(400); await shot('auth-' + lab.source.split('|')[0].replace(/\W/g, '')); }
  }
  const guest = await ev(() => { const b = [...document.querySelectorAll('#auth button, #auth a')].find(e => /play now|chơi ngay|guest|khách|without|không cần/i.test(e.textContent) && e.offsetParent); if (b) { b.click(); return true; } return false; });
  if (!guest) note('no guest button found');
  await wait(1500); await shot('after-guest');
  // naming / intro: answer whatever it asks, screenshot every few seconds
  for (let i = 0; i < 14; i++) {
    await ev(() => { const inp = document.querySelector('input:not([type=hidden]):not(.hidden)'); if (inp && inp.offsetParent && !inp.value) { inp.value = 'Lan'; inp.dispatchEvent(new Event('input', { bubbles: true })); } });
    await shot('intro-' + i);
    await ev(() => { const b = document.querySelector('#dialog:not(.hidden), .naming .btn, .modal .btn, .cs-next, #skipBtn:not(.hidden)'); (b?.querySelector?.('.btn, button') || b)?.click(); const c = [...document.querySelectorAll('.naming button, .modal button, .card button')].find(x => x.offsetParent); c?.click(); });
    await wait(1600);
    const done = await ev(async () => { const { G } = await import('/js/systems/state.js'); return !!G.player && !G.runtime.inCutscene && !document.querySelector('.naming:not(.hidden), .modal, #dialog:not(.hidden)'); });
    if (done) break;
  }
  await clear(); await shot('first-objective');
  // the first chapter, played by hand for a bit: tap the objective, open the bag
  await ev(() => document.querySelector('#questBox, .quest, .objective')?.click()); await wait(600); await shot('objective-tap');
  await closeSheets();

  // ------------------------------------------------------------ 2. free play
  cur = 'free-play';
  await ev(async () => {
    const d = await import('/js/dev/devtools.js'), { G } = await import('/js/systems/state.js'), s = await import('/js/systems/save.js');
    d.jumpTo('free'); const st = G.state; st.player.name = 'Lan'; st.island.name = 'Đảo Nhỏ'; st.money = Math.max(st.money, 5_000_000); st.level = Math.max(st.level, 30);
    st.settings.lang = document.documentElement.lang === 'vi' ? 'vi' : st.settings.lang; s.saveLocal();
  });
  if (lang === 'vi') await ev(async () => { const { G } = await import('/js/systems/state.js'); G.state.settings.lang = 'vi'; (await import('/js/systems/save.js')).saveLocal(); });
  await p.reload(); await wait(4000); await clear(20); await shot('free-play-start');
  const step = await G(); note('story step after jump:', step);

  const setTime = (min) => ev(async m => { const { G } = await import('/js/systems/state.js'); G.state.time = m; }, min);
  const go = async (scene, x, y) => { await clear(3); return ev(async ([sc, x, y]) => { const { setScene } = await import('/js/systems/scenes.js'); setScene(sc, x, y); }, [scene, x, y]); };

  if (want('island')) {
    cur = 'island';
    const spots = [['dock', 900, 2440], ['plaza', 900, 1660], ['home-street', 1260, 1780], ['market-street', 900, 1210], ['drink-stand', 600, 2240], ['banh-mi', 560, 1610], ['truck', 1420, 2200], ['night-market', 440, 700], ['restaurant-hill', 1500, 1000], ['beach', 300, 2300], ['cove', 1900, 2300], ['lighthouse', 1950, 600], ['islet', 2300, 1500], ['bridges', 1200, 1400]];
    for (const t of [10 * 60, 18 * 60 + 40, 22 * 60]) {
      await setTime(t);
      for (const [nm, x, y] of spots) { await go('island', x, y); await wait(900); await shot(`island-${nm}-${Math.floor(t / 60)}h`); }
    }
    // rain
    await setTime(15 * 60); await ev(async () => { const w = await import('/js/systems/weather.js'); (w.forceWeather || w.setWeather || (() => {}))('rain'); });
    await go('island', 900, 1660); await wait(1500); await shot('island-plaza-rain');
    await ev(async () => { const w = await import('/js/systems/weather.js'); (w.forceWeather || w.setWeather || (() => {}))('clear'); });
    // the map
    await setTime(11 * 60); await go('island', 900, 1660);
    await ev(() => document.getElementById('mapBtn')?.click()); await wait(1200); await shot('world-map'); await closeSheets();
  }
  if (want('interiors')) {
    cur = 'interiors';
    const ids = await ev(async () => { const { scenes } = await import('/js/world/render.js').catch(() => ({})); const sc = (await import('/js/systems/scenes.js')).scenes || scenes; return Object.keys(sc || {}).filter(k => k !== 'island'); });
    note('scenes:', (ids || []).join(' '));
    for (const id of ids || []) {
      await setTime(12 * 60);
      const ok = await ev(async id => { const m = await import('/js/systems/scenes.js'); const sc = m.scenes[id]; const st = sc.spawn || sc.door || { x: (sc.w || 300) / 2, y: (sc.h || 300) - 40 }; m.setScene(id, st.x, st.y - 10, 'up'); return true; }, id);
      if (!ok) continue; await wait(1200); await shot('room-' + id);
    }
  }
  if (want('home')) {
    cur = 'home';
    await setTime(20 * 60);
    for (const id of ['house', 'house_up', 'house_down', 'upstairs', 'basement']) {
      const ok = await ev(async id => { const m = await import('/js/systems/scenes.js'); if (!m.scenes[id]) return false; const sc = m.scenes[id]; m.setScene(id, (sc.w || 270) / 2, (sc.h || 300) - 50, 'up'); return true; }, id);
      if (!ok) continue; await wait(1000); await shot('home-' + id);
      const dec = await ev(async () => { const d = await import('/js/ui/decorate.js'); (d.openDecorate || d.startDecorate || d.enterDecorate)?.(); return !!(d.openDecorate || d.startDecorate || d.enterDecorate); });
      if (dec) { await wait(900); await shot('decorate-' + id); await closeModes(); }
    }
  }
  if (want('menus')) {
    cur = 'menus';
    await go('island', 900, 1660); await setTime(11 * 60); await wait(600);
    const tabs = await ev(async () => { (window.__jen?.openMenu || (await import('/js/ui/menu.js')).openMenu)({}); await new Promise(r => setTimeout(r, 700)); return document.querySelectorAll('.sheet-wrap:not(.out) .tabs button, .sheet-wrap:not(.out) .tab').length; });
    note('menu tabs:', tabs);
    for (let i = 0; i < (tabs || 0); i++) {
      await ev(i => document.querySelectorAll('.sheet-wrap:not(.out) .tabs button, .sheet-wrap:not(.out) .tab')[i]?.click(), i);
      const nm = await ev(i => document.querySelectorAll('.sheet-wrap:not(.out) .tabs button, .sheet-wrap:not(.out) .tab')[i]?.textContent.trim().replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase(), i);
      await sheetShots(`menu-${i}-${nm}`);
    }
    await closeSheets();
    const sheets = [
      ['journal', async () => (await import('/js/ui/shops.js')).openJournal()],
      ['bag', async () => (await import('/js/ui/shops.js')).openBag()],
      ['supermarket', async () => (await import('/js/ui/shops.js')).openIngredientShop()],
      ['materials', async () => (await import('/js/ui/shops.js')).openMaterialShop()],
      ['furniture-shop', async () => (await import('/js/ui/shops.js')).openFurnitureShop()],
      ['recipe-book', async () => (await import('/js/ui/shops.js')).openRecipeBook()],
      ['story-journal', async () => (await import('/js/ui/shops.js')).openJournal()],
      ['staff-board', async () => (await import('/js/ui/staff.js')).openStaffBoard()],
      ['biz-menu-shed1', async () => (await import('/js/ui/shops.js')).openBizMenu('shed1')],
      ['clothes', async () => { const m = await import('/js/ui/clothes.js'); (m.openWardrobe || m.openClothes || Object.values(m).find(f => typeof f === 'function'))?.(); }],
      ['salon', async () => { const m = await import('/js/ui/salon.js'); Object.values(m).find(f => typeof f === 'function' && /open/i.test(f.name))?.(); }],
      ['pet-shop', async () => { const m = await import('/js/ui/petshop.js'); Object.values(m).find(f => typeof f === 'function' && /open/i.test(f.name))?.(); }],
      ['chess', async () => { const { G } = await import('/js/systems/state.js'); G.state.time = 8 * 60; const m = await import('/js/ui/chess.js'); m.chessAction(G.player); }],
      ['museum', async () => { const m = await import('/js/systems/museum.js'); Object.values(m).find(f => typeof f === 'function' && /open/i.test(f.name))?.(); }],
      ['storefront', async () => { const m = await import('/js/ui/storefront.js'); Object.values(m).find(f => typeof f === 'function' && /open/i.test(f.name))?.('shed1'); }],
      ['uniform', async () => { (await import('/js/ui/uniform.js')).openUniform('shed1'); }],
      ['lab', async () => { const m = await import('/js/ui/lab.js'); Object.values(m).find(f => typeof f === 'function' && /open/i.test(f.name))?.(); }],
      ['board', async () => { const m = await import('/js/ui/board.js'); Object.values(m).find(f => typeof f === 'function' && /open/i.test(f.name))?.(); }],
      ['lookout', async () => { const m = await import('/js/ui/lookout.js'); m.enterLighthouse(); setTimeout(() => m.leaveLighthouse(), 5000); }],
      ['whats-new', async () => { const { G } = await import('/js/systems/state.js'); G.state.lastSeenVersion = '5.15.0'; G.state.createdAt = 0; (await import('/js/ui/whatsnew.js')).showWhatsNew(); }],
    ];
    for (const [nm, fn] of sheets) {
      cur = 'sheet-' + nm;
      await p.evaluate(`(${fn.toString()})()`).catch(e => note('open failed', e.message.slice(0, 160)));
      await sheetShots('sheet-' + nm); await closeSheets(); await clear(4);
    }
  }
  if (want('play')) {
    cur = 'play';
    // run the drink stand: open it, a customer, the service screen
    await setTime(10 * 60); await go('island', 600, 2260); await wait(600);
    await ev(async () => { window.__jen?.toggleBiz?.('shed1', true); window.__jen?.openBiz?.('shed1'); }); await wait(1200); await shot('shop-open');
    await ev(async () => { for (let i = 0; i < 3; i++) window.__jen?.spawnCustomer?.('shed1'); }); await wait(5000); await shot('customers');
    await ev(async () => { const m = await import('/js/ui/service.js'); Object.values(m).find(f => typeof f === 'function' && /open|start/i.test(f.name))?.('shed1'); }); await wait(1200); await shot('service');
    await closeSheets(); await clear(4);
    // the photo mode and album viewer
    await ev(async () => { const m = await import('/js/ui/photo.js'); Object.values(m).find(f => typeof f === 'function' && /open|start|enter/i.test(f.name))?.(); }); await wait(1000); await shot('photo-mode');
    await ev(() => document.querySelector('.ph-x, .ph-top button')?.click()); await wait(500);
    // a night: sleep flow and the day summary
    await setTime(23 * 60 + 50); await wait(1200); await shot('late-night');
    // stay up: the 5 am doze-off and waking in Mèo Mây's cat bed, then the day summary
    await setTime(30 * 60 - 2); for (let i = 0; i < 8; i++) { await wait(1500); await shot('dawn-' + i); }
    await clear(10); await shot('next-morning');
  }
} catch (e) { note('script error', e.stack?.slice(0, 500)); }
fs.writeFileSync(path.join(OUT, 'report.txt'), `mode ${mode} · lang ${lang} · ${n} screenshots\n\nERRORS (${errs.length})\n${[...new Set(errs)].join('\n')}\n\nFINDINGS (${report.length})\n${report.join('\n')}\n`);
console.log(`${mode}/${lang}: ${n} shots, ${errs.length} errors, ${report.length} findings → ${OUT}`);
await b.close(); server.close();
