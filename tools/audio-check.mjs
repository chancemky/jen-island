// Audio check: node tools/audio-check.mjs — plays every effect and stinger (tests/audio.html)
// and lists any that are silent, clipping or throwing.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright';
const T = { '.js': 'text/javascript', '.html': 'text/html' };
const server = http.createServer((q, r) => { const f = path.join(process.cwd(), decodeURIComponent(q.url.split('?')[0])); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'text/plain' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }), p = await b.newPage();
p.on('pageerror', e => console.log('pageerror', e.message));
await p.goto(`http://127.0.0.1:${server.address().port}/tests/audio.html`);
await p.waitForFunction(() => window.__ready, null, { timeout: 120000 });
const r = await p.evaluate(() => window.__result);
console.log(Object.entries(r.out).map(([k, v]) => `${k}=${v.peak}${v.err ? ' ERR ' + v.err : ''}`).join('  '));
console.log('problems:', JSON.stringify(r.bad));
await b.close(); server.close();
