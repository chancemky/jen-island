import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium, devices } from 'playwright';
const ROOT = process.cwd(), OUT = process.argv[2];
const T = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const b = await chromium.launch(), ctx = await b.newContext({ ...devices['iPhone 13'] }), p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.route(/supabase\.co/, r => r.fulfill({ json: [] }));
await p.goto(`http://127.0.0.1:${server.address().port}/?dev=fresh${Date.now()}&fresh`);
await p.waitForFunction(() => window.done, null, { timeout: 30000 });
const snaps = [];
for (let i = 0; i < 70; i++) {
  await p.waitForTimeout(1500);
  if (i % 6 === 0) { await p.screenshot({ path: `${OUT}-${String(i).padStart(2, '0')}.png` }); snaps.push(i); }
  const st = await p.evaluate(() => { const s = window.__jen?.G?.state; return s ? `${s.story.step} ch${s.story.chapter} ${document.querySelector('#dialog:not(.hidden) .dlg-text, #dialog:not(.hidden)')?.innerText?.slice(0, 80).replace(/\n/g, ' ') || ''}` : ''; });
  console.log(i, st);
  await p.evaluate(() => { const m = document.querySelector('.modal'); if (m) { const inp = m.querySelector('input'); if (inp && !inp.value) inp.value = 'Mai'; m.querySelector('.btn')?.click(); } document.querySelector('.reward button')?.click(); });
  const dlg = await p.evaluate(() => { const d = document.getElementById('dialog'); return d && !d.classList.contains('hidden') ? (document.querySelector('.dlg-choices button') ? 'choice' : 'text') : ''; });
  if (dlg === 'text') await p.keyboard.press('e'); if (dlg === 'choice') await p.click('.dlg-choices button').catch(() => {});
}
console.log('errors', errs.join(' | ') || 'none'); await b.close(); server.close();
