// Screenshot a test page: node tools/shot.mjs tests/furniture.html?ids=a,b out.png [width]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright';
const [page0, out, width = 900] = process.argv.slice(2);
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => { const f = path.join(process.cwd(), decodeURIComponent(req.url.split('?')[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(d); }); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const b = await chromium.launch(), p = await b.newPage({ viewport: { width: +width, height: 600 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
await p.goto(`http://127.0.0.1:${server.address().port}/${page0}`); await p.waitForFunction(() => window.__ready, null, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(400); await p.screenshot({ path: out, fullPage: true });
if (errs.length) console.log('errors:', errs.join('\n'));
await b.close(); server.close();
