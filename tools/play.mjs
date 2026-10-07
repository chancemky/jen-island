// Scratch play-tests: node tools/play.mjs <steps.mjs> <out-prefix>. Opens a fresh dev island,
// jumps it to free play (chapter 20), dismisses the start-up popups, then runs the default
// export of steps.mjs as (page, shot). Supabase calls answer [] unless the steps route them.
// scratch play-test harness: node tools/_play.mjs <script.js> <outprefix>
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium, devices } from 'playwright';
const ROOT = process.cwd(), [scriptFile, OUT] = process.argv.slice(2);
const T = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const b = await chromium.launch(), ctx = await b.newContext({ ...devices['iPhone 13'] }), p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text().slice(0, 300)));
await p.route(/supabase\.co/, r => r.fulfill({ json: [] }));
const tag = 'play' + Date.now(), base = `http://127.0.0.1:${server.address().port}/?dev=${tag}`;
await p.goto(base + '&fresh');
await p.waitForFunction(() => window.done, null, { timeout: 30000 });
// jump this test island to free play (chapter 20), save, and reload into it: no intro
await p.evaluate(async () => { const d = await import('/js/dev/devtools.js'); d.jumpTo('free'); const st = window.__jen.G.state; st.player.name = 'Tester'; st.island.name = 'Test Isle'; const s = await import('/js/systems/save.js'); s.saveLocal(); });
await p.goto(base); await p.waitForFunction(() => window.done, null, { timeout: 30000 });
for (let i = 0; i < 24; i++) {         // clear the start-of-day popups and any cutscene
  await p.evaluate(() => { document.querySelector('#skipBtn:not(.hidden)')?.click(); document.querySelector('.modal .btn, .reward button')?.click(); }).catch(() => {});
  await p.waitForTimeout(400);
}
console.log('state', await p.evaluate(() => { const s = window.__jen.G.state; return `ch ${s.story.chapter} step ${s.story.step} scene ${window.__jen.G.scene?.id} cs ${!!window.__jen.G.runtime.inCutscene}`; }));
const shot = async (name, clip) => p.screenshot({ path: `${OUT}-${name}.png`, clip });
const steps = (await import(path.resolve(scriptFile))).default;
try { await steps(p, shot); } catch (e) { console.log('script error', e.message); }
console.log(errs.length ? 'errors:\n' + errs.join('\n') : 'no errors');
await b.close(); server.close();
