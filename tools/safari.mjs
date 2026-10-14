// Real Safari pass: node tools/safari.mjs <outDir>
// Drives the Mac's own Safari through safaridriver (Safari → Develop → Allow Remote Automation),
// at an iPhone-sized window, through the first run and every main screen. Saves a screenshot of
// each and a report of the page errors Safari raised. Supabase calls are answered locally.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { spawn } from 'node:child_process';

const OUT = process.argv[2] || 'safari-out', ROOT = process.cwd(), PORT = 4790;
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://localhost:${server.address().port}/`;

const drv = spawn('safaridriver', ['-p', String(PORT)]); await new Promise(r => setTimeout(r, 1500));
const wd = async (method, p, body) => { const res = await fetch(`http://localhost:${PORT}${p}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const j = await res.json(); if (j.value?.error) throw new Error(j.value.error + ': ' + j.value.message); return j.value; };
const { sessionId: sid } = await wd('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'safari' } } });
const S = p => `/session/${sid}${p}`;
const run = (script, args = []) => wd('POST', S('/execute/sync'), { script, args });
const runAsync = (script, args = []) => wd('POST', S('/execute/async'), { script, args });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let n = 0; const report = [];
async function shot(name) { n++; const b64 = await wd('GET', S('/screenshot')); fs.writeFileSync(path.join(OUT, `${String(n).padStart(3, '0')}-${name}.png`), Buffer.from(b64, 'base64')); }
async function errors(where) { const e = await run('const e = window.__errs || []; window.__errs = []; return e;'); for (const x of e) report.push(`[${where}] ${x}`); }
// a hook for errors and a stub for Supabase, installed before the game's scripts run on each load
const HOOK = `window.__errs = []; addEventListener('error', e => window.__errs.push((e.message || (e.target && (e.target.src || e.target.href)) || 'error') + ''), true); addEventListener('unhandledrejection', e => window.__errs.push('rejection ' + (e.reason && e.reason.message || e.reason)));
  const of = window.fetch; window.fetch = (u, o) => /supabase\\.co/.test(String(u)) ? Promise.resolve(new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })) : of(u, o);`;
async function load(url) { await wd('POST', S('/url'), { url }); await run(HOOK); }
const imp = (mod, body) => runAsync(`const done = arguments[arguments.length - 1]; import(${JSON.stringify(mod)}).then(async m => { try { const r = await (async () => { ${body} })(); done(r ?? null); } catch (e) { done('ERR ' + e.message); } });`);

try {
  await wd('POST', S('/window/rect'), { width: 390, height: 844, x: 40, y: 40 });
  await load(BASE + '?dev=safari&fresh'); await sleep(5000); await errors('boot');
  await shot('boot');
  // free play island
  await imp('/js/dev/devtools.js', `m.jumpTo('free'); const { G } = await import('/js/systems/state.js'); G.state.player.name = 'Lan'; G.state.island.name = 'Đảo Nhỏ'; (await import('/js/systems/save.js')).saveLocal();`);
  await load(BASE + '?dev=safari'); await sleep(5000);
  for (let i = 0; i < 12; i++) { await run(`document.querySelector('.modal [data-a=no], #skipBtn:not(.hidden), .modal .btn, .reward button, .wn-wrap .btn, .summary .btn')?.click()`); await sleep(400); }
  await errors('free play'); await shot('free-play');
  const spots = [['plaza', 900, 1660, 11], ['market', 900, 1210, 19], ['night-market', 440, 700, 20.5], ['beach', 470, 2290, 13], ['dock', 900, 2300, 22]];
  for (const [nm, x, y, h] of spots) {
    await imp('/js/systems/scenes.js', `const { G } = await import('/js/systems/state.js'); G.state.time = ${Math.round(h * 60)}; m.setScene('island', ${x}, ${y});`);
    await sleep(2200); await errors(nm); await shot('island-' + nm);
  }
  for (const id of ['house', 'shed1', 'supermarket', 'restaurant', 'meo']) {
    await imp('/js/systems/scenes.js', `const sc = m.scenes['${id}']; m.setScene('${id}', (sc.w || 270) / 2, (sc.h || 300) - 50, 'up');`);
    await sleep(1500); await errors(id); await shot('room-' + id);
  }
  await imp('/js/ui/decorate.js', 'm.startDecorate();'); await sleep(1200); await errors('decorate'); await shot('decorate'); await imp('/js/ui/decorate.js', 'm.stopDecorate();');
  const sheets = [['menu', "(await import('/js/ui/menu.js')).openMenu({})"], ['journal', "(await import('/js/ui/shops.js')).openJournal()"], ['bag', "(await import('/js/ui/shops.js')).openBag()"],
    ['supermarket', "(await import('/js/ui/shops.js')).openIngredientShop()"], ['furniture', "(await import('/js/ui/shops.js')).openFurnitureShop()"], ['boutique', "(await import('/js/ui/clothes.js')).openBoutique()"],
    ['projects', "(await import('/js/ui/board.js')).openProjects()"], ['staff', "(await import('/js/ui/staff.js')).openStaffBoard()"]];
  for (const [nm, call] of sheets) {
    await imp('/js/systems/state.js', `${call};`); await sleep(1200); await errors(nm); await shot('sheet-' + nm);
    await run(`for (let i = 0; i < 3; i++) document.querySelector('.sheet-wrap:not(.out) .sheet-x, .sheet-wrap:not(.out) .x')?.click()`); await sleep(500);
  }
  // serve a customer at the drink stand
  await imp('/js/systems/scenes.js', `const { G } = await import('/js/systems/state.js'); G.state.time = 10 * 60; m.setScene('island', 600, 2260); window.__jen?.openBiz?.('shed1'); for (let i = 0; i < 3; i++) window.__jen?.spawnCustomer?.('shed1');`);
  await sleep(5000); await errors('shop'); await shot('shop-open');
  // stay up: the dawn doze-off
  await imp('/js/systems/state.js', 'm.G.state.time = 30 * 60 - 1;'); await sleep(7000); await errors('dawn'); await shot('dawn');
} catch (e) { report.push('script error: ' + e.message); }
fs.writeFileSync(path.join(OUT, 'report.txt'), `Safari ${await run('return navigator.userAgent').catch(() => '?')}\n${n} screenshots\n\nERRORS (${report.length})\n${report.join('\n')}\n`);
console.log(`safari: ${n} shots, ${report.length} errors → ${OUT}`);
await wd('DELETE', S('')).catch(() => {}); drv.kill(); server.close();
