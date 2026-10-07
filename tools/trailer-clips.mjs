// Trailer clips: node tools/trailer-clips.mjs — records short gameplay clips (WebM, phone
// portrait 430×932) into docs/trailer/: a busy stand, making a smoothie by hand, the
// Grand Opening fireworks, a friend visit with emotes, and photo mode. Cut them together in
// any editor (App Store previews need H.264 .mp4/.mov: convert with any video tool).
import { execFileSync } from 'node:child_process'; import os from 'node:os';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright';
const ROOT = process.cwd(), OUT = path.join(ROOT, 'docs/trailer'); fs.mkdirSync(OUT, { recursive: true });
const T = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`, VIEW = { width: 430, height: 932 };
const b = await chromium.launch();
// one prepared island (free play), reused by every clip through its local save
const tag = 'trailer' + Date.now();
{
  const ctx = await b.newContext({ viewport: VIEW }), p = await ctx.newPage(); await p.route(/supabase\.co/, r => r.fulfill({ json: [] }));
  await p.goto(`${BASE}/?dev=${tag}&fresh`); await p.waitForFunction(() => window.done, null, { timeout: 30000 });
  await p.evaluate(async () => { const d = await import('/js/dev/devtools.js'); d.jumpTo('free'); const s = window.__jen.G.state; s.player.name = 'Mai'; s.island.name = 'Sunny Isle'; (await import('/js/systems/save.js')).saveLocal(); });
  const state = await ctx.storageState(); await ctx.close(); fs.writeFileSync(path.join(OUT, '.state.json'), JSON.stringify(state));
}
async function clip(name, seconds, setup, act) {
  const ctx = await b.newContext({ viewport: VIEW, deviceScaleFactor: 2, storageState: path.join(OUT, '.state.json'), hasTouch: true });
  const p = await ctx.newPage(); await p.route(/supabase\.co/, r => r.fulfill({ json: [] }));
  await p.goto(`${BASE}/?dev=${tag}`); await p.waitForFunction(() => window.done, null, { timeout: 30000 });
  for (let i = 0; i < 16; i++) { await p.evaluate(() => { document.querySelector('#skipBtn:not(.hidden)')?.click(); document.querySelector('.modal .btn, .reward button')?.click(); }); await p.waitForTimeout(250); }
  await p.evaluate(() => { document.getElementById('toasts').style.display = 'none'; document.getElementById('questPill').style.display = 'none'; });
  await setup(p); await p.waitForTimeout(1200);
  // record only the scene itself: a fresh page sharing the state would reload; instead record with a CDP screencast
  const cdp = await ctx.newCDPSession(p), frames = [];
  cdp.on('Page.screencastFrame', async f => { frames.push(f.data); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 860, maxHeight: 1864, everyNthFrame: 1 });
  const t0 = Date.now(); await act(p); const left = seconds * 1000 - (Date.now() - t0); if (left > 0) await p.waitForTimeout(left);
  await cdp.send('Page.stopScreencast');
  const secs = (Date.now() - t0) / 1000, dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  frames.forEach((d, i) => fs.writeFileSync(path.join(dir, `${String(i).padStart(4, '0')}.jpg`), Buffer.from(d, 'base64')));
  // encode at the real capture rate (H.264, 30 fps out) when ffmpeg is around, then drop the frames
  const ff = [process.env.FFMPEG, path.join(os.homedir(), '.jen-island-tools/ffmpeg'), 'ffmpeg'].find(f => { try { execFileSync(f, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } });
  if (ff) { execFileSync(ff, ['-y', '-loglevel', 'error', '-framerate', (frames.length / secs).toFixed(2), '-i', path.join(dir, '%04d.jpg'), '-vf', 'scale=860:-2', '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.join(OUT, name + '.mp4')]); fs.rmSync(dir, { recursive: true }); }
  console.log(name, frames.length, 'frames', ff ? '→ ' + name + '.mp4' : '(no ffmpeg: frames kept)'); await ctx.close();
}
const at = (p, x, y, time, dir = 'down') => p.evaluate(([x, y, time, dir]) => { const J = window.__jen; J.G.state.time = time * 60; J.setScene('island', x, y, dir); J.G.player.x = x; J.G.player.y = y; }, [x, y, time, dir]);
const stock = p => p.evaluate(() => { const s = window.__jen.G.state; s.keepers = {}; for (const id of ['shed1', 'smoothie']) { s.biz[id].owned = true; s.biz[id].repair = 1; } s.biz.smoothie.prepped = { mango_cut: 40, coconut_water: 40, passion_pulp: 40, lime_cut: 40 }; s.biz.shed1.prepped = { kumquat_cut: 40, peach_cut: 40 }; for (const k of ['tea', 'kumquat', 'sugar', 'ice', 'condensed_milk', 'peach_syrup']) s.pantry[k] = 60; for (const id of ['sinh_to_xoai', 'nuoc_dua', 'chanh_day']) if (!s.recipes.includes(id)) s.recipes.push(id); });

await clip('1-busy-stand', 8, async p => { await stock(p); await at(p, 560, 2330, 10, 'up'); await p.evaluate(() => { const J = window.__jen; J.openBiz('shed1'); for (let i = 0; i < 4; i++) J.spawnCustomer('shed1'); }); },
  async p => { for (let i = 0; i < 6; i++) { await p.keyboard.down('ArrowUp'); await p.waitForTimeout(220); await p.keyboard.up('ArrowUp'); await p.waitForTimeout(400); } });
await clip('2-make-a-smoothie', 10, async p => { await stock(p); await at(p, 780, 2330, 12, 'up'); await p.evaluate(() => { const J = window.__jen; J.openBiz('smoothie'); for (let i = 0; i < 3; i++) J.spawnCustomer('smoothie'); }); await p.waitForTimeout(6000); await p.evaluate(async () => (await import('/js/ui/service.js')).openService('smoothie')); await p.waitForTimeout(1500); },
  async p => {
    for (let n = 0; n < 2; n++) {
      const o = await p.evaluate(async () => { const B = await import('/js/systems/business.js'), G = window.__jen.G; const c = B.rt('smoothie').queue[0]; const R = (await import('/js/data/game.js')).RECIPES; return c ? { steps: R[c.order.recipe].steps, opts: c.order.opts } : null; });
      if (!o) break;
      for (const [k, v] of Object.entries(o.opts || {})) {
        await p.evaluate(async ([k, v]) => { const { OPTIONS } = await import('/js/data/game.js'), o = OPTIONS[k]; const i = Math.max(o.values.indexOf(v), (o.short || []).indexOf(v)); [...document.querySelectorAll(`.seg[data-k="${k}"] button`)].find(b => b.dataset.v === String(v) || b.dataset.v === String(o.values[i]))?.click(); }, [k, v]);
        await p.waitForTimeout(350);
      }
      for (const k of o.steps) { await p.click(`[data-k="${k}"]`).catch(() => {}); await p.waitForTimeout(650); }
      await p.click('.serve').catch(() => {}); await p.waitForTimeout(1600);
    }
  });
await clip('3-grand-opening', 9, async p => { await p.evaluate(async () => (await import('/js/core/util.js')).learnServerTime('Sat, 31 Oct 2026 05:00:00 GMT')); await at(p, 900, 1600, 20.6); }, async p => { await p.waitForTimeout(500); });
await clip('4-photo-mode', 8, async p => { await at(p, 900, 1660, 17.4); },
  async p => { await p.click('#camBtn'); await p.waitForTimeout(800); for (const sel of ['[data-f="warm"]', '[data-p="cheer"]', '[data-fr="polaroid"]', '[data-f="dreamy"]', '[data-p="dance"]']) { await p.click(sel); await p.waitForTimeout(900); } });
await clip('5-island-board', 7, async p => { await at(p, 1030, 1610, 9.5, 'up'); },
  async p => { await p.waitForTimeout(1200); await p.evaluate(async () => (await import('/js/ui/board.js')).openBoard()); await p.waitForTimeout(1800); await p.click('.note .note-btn').catch(() => {}); });
fs.rmSync(path.join(OUT, '.state.json'));
await b.close(); server.close();
console.log('done: docs/trailer/');
