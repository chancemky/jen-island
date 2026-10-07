// Store screenshots: node tools/store-shots.mjs [en|vi]
// Plays a test island to six scenes and saves captioned screenshots for the App Store
// (6.7" iPhone 1290×2796, 12.9" iPad 2048×2732) and Google Play (1080×2400) in docs/store/.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright';
const lang = process.argv[2] || 'en', ROOT = process.cwd(), OUT = path.join(ROOT, 'docs/store', lang);
fs.mkdirSync(OUT, { recursive: true });
const T = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
// (the iOS app is iPhone-only for now, so no iPad set: add ['ipad129', { width: 1024, height: 1366 }, 2] once iPad has its own layout)
const SIZES = [['iphone67', { width: 430, height: 932 }, 3], ['play', { width: 412, height: 915 }, 2.625]];
const CAP = {
  en: ['Run your own little café', 'Make every order by hand', 'Grow a whole island of shops', 'Festivals on the real dates', 'Decorate your dream home', 'Make friends, top the board'],
  vi: ['Mở quán nhỏ của riêng bạn', 'Tự tay làm từng món', 'Cả hòn đảo đầy quán xá', 'Lễ hội đúng ngày thật', 'Trang trí ngôi nhà mơ ước', 'Kết bạn, lên bảng xếp hạng'],
}[lang];
const b = await chromium.launch();
for (const [name, viewport, dpr] of SIZES) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: dpr, isMobile: name !== 'ipad129', hasTouch: true }), p = await ctx.newPage();
  const look = { skin: '#f8d6bd', hair: '#4a322b', hairStyle: 'bob', top: '#a9cf9a', topStyle: 'hoodie', sleeve: 0.9, bottom: '#6d7fa8', bottomLen: 1.5, shoe: '#f0e6da', lashes: true, eyeCol: '#4f9f7a' };
  const rows = ['Mai', 'Bảo', 'Linh', 'Kenji', 'An', 'Vy', 'Huy'].map((n, i) => ({ rank: i + 1, player_name: n, island_name: ['Sunny Isle', 'Đảo Mây', 'Coral Bay', 'Mochi Isle', 'Lotus Key', 'Firefly', 'Palm Cove'][i], level: 31 - i * 2, score: 940 - i * 87, money: 99000 - i * 7000, served: 3100 - i * 240, day: 60 - i * 4, badge: ['week_champ', 'founder', 'crowd', null, 'fashion', null, 'angler'][i], look: { ...look, hairStyle: ['bob', 'long', 'spiky', 'bun', 'braids', 'messy', 'crew'][i], hair: ['#4a322b', '#c98f5a', '#2b2b3a', '#e9c46f', '#3d3550', '#9a6443', '#2f2a30'][i], top: ['#a9cf9a', '#f28f7c', '#8fb7e0', '#f7de8c', '#c9b6e8', '#6fbfb0', '#f4a9b8'][i] }, is_me: i === 0 }));
  await p.route(/supabase\.co/, r => /week_top|leaderboard_top/.test(r.request().url()) ? r.fulfill({ json: rows }) : r.fulfill({ json: [] }));
  await p.addInitScript(() => localStorage.setItem('jenisland.session', JSON.stringify({ access_token: 'a.b.c', refresh_token: 'r', expires_at: Date.now() + 9e6, user: { id: '00000000-0000-0000-0000-000000000009' } })));
  const tag = 'shots' + Date.now();
  await p.addInitScript(l => { try { localStorage.setItem('jenisland.lang', l); } catch {} }, lang);
  await p.goto(`${BASE}/?dev=${tag}&fresh`); await p.waitForFunction(() => window.done, null, { timeout: 30000 });
  await p.evaluate(async l => { const d = await import('/js/dev/devtools.js'); d.jumpTo('free'); const s = window.__jen.G.state; s.player.name = 'Mai'; s.island.name = 'Sunny Isle'; s.settings.lang = l; (await import('/js/systems/save.js')).saveLocal(); }, lang);
  await p.goto(`${BASE}/?dev=${tag}`); await p.waitForFunction(() => window.done, null, { timeout: 30000 });
  for (let i = 0; i < 20; i++) { await p.evaluate(() => { document.querySelector('#skipBtn:not(.hidden)')?.click(); document.querySelector('.modal .btn, .reward button')?.click(); }); await p.waitForTimeout(300); }
  // the game, scaled into a rounded frame under a caption band
  const caption = async (i, text) => {
    await p.evaluate(() => { document.getElementById('toasts').style.display = 'none'; document.getElementById('questPill').style.display = 'none'; });
    await p.waitForTimeout(400);
    const raw = (await p.screenshot()).toString('base64');
    const cp = await ctx.newPage();
    await cp.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;width:${viewport.width}px;height:${viewport.height}px;overflow:hidden;background:linear-gradient(170deg,#ffe2ea,#fff3d6 45%,#d8f1ea);font-family:Nunito,system-ui,sans-serif">
      <div style="height:19%;display:flex;align-items:center;justify-content:center;padding:0 22px;text-align:center;font-weight:900;font-size:${name === 'ipad129' ? 52 : 31}px;line-height:1.1;color:#5b3f36;letter-spacing:.01em">${text}</div>
      <div style="position:absolute;left:${name === 'ipad129' ? 28 : 7}%;right:${name === 'ipad129' ? 28 : 7}%;top:19%;bottom:3%;border:5px solid #5b3f36;border-radius:34px;overflow:hidden;box-shadow:0 10px 0 rgba(91,63,54,.25);background:#000"><img src="data:image/png;base64,${raw}" style="width:100%;height:100%;object-fit:cover;object-position:top center"></div></body></html>`);
    await cp.waitForTimeout(150); await cp.screenshot({ path: path.join(OUT, `${name}-${i + 1}.png`) }); await cp.close();
  };
  const at = (x, y, time, dir = 'down') => p.evaluate(([x, y, time, dir]) => { const J = window.__jen; J.G.state.time = time * 60; J.setScene('island', x, y, dir); J.G.player.x = x; J.G.player.y = y; }, [x, y, time, dir]);
  const stock = () => p.evaluate(() => { const s = window.__jen.G.state; for (const id of ['shed1', 'smoothie']) { s.biz[id].owned = true; s.biz[id].repair = 1; } s.biz.smoothie.prepped = { mango_cut: 40, coconut_water: 40, passion_pulp: 40, lime_cut: 40 }; s.biz.shed1.prepped = { kumquat_cut: 40, peach_cut: 40 }; for (const k of ['tea', 'kumquat', 'sugar', 'ice', 'condensed_milk', 'peach_syrup', 'coffee', 'milk']) s.pantry[k] = 60; for (const id of ['sinh_to_xoai', 'nuoc_dua', 'chanh_day']) if (!s.recipes.includes(id)) s.recipes.push(id); });
  await stock();
  // 1. the drink stand, open with a line
  await at(590, 2300, 10, 'up'); await p.evaluate(() => { const J = window.__jen; J.openBiz('shed1'); for (let i = 0; i < 4; i++) J.spawnCustomer('shed1'); }); await p.waitForTimeout(3500); await caption(0, CAP[0]);
  // 2. making a drink
  await at(780, 2330, 12, 'up'); await p.evaluate(() => { const J = window.__jen; J.G.state.keepers = {}; J.openBiz('smoothie'); for (let i = 0; i < 3; i++) J.spawnCustomer('smoothie'); }); await p.waitForTimeout(6000);
  await p.evaluate(async () => { (await import('/js/ui/service.js')).openService('smoothie'); });
  for (let k = 0; k < 20 && await p.evaluate(() => /on the way|đang tới|đang đến/i.test(document.body.innerText)); k++) await p.waitForTimeout(500);
  await p.waitForTimeout(800); await caption(1, CAP[1]);
  await p.evaluate(async () => (await import('/js/ui/service.js')).closeService?.()); await p.waitForTimeout(600);
  // 3. the beach smoothie bar, busy
  await at(780, 2330, 12, 'up'); await p.waitForTimeout(2500); await caption(2, CAP[2]);
  // 4. Grand Opening fireworks
  await p.evaluate(async () => (await import('/js/core/util.js')).learnServerTime('Sat, 31 Oct 2026 05:00:00 GMT')); await at(900, 1600, 20.7); await p.waitForTimeout(2600); await caption(3, CAP[3]);
  await p.evaluate(async () => (await import('/js/core/util.js')).learnServerTime(new Date().toUTCString()));
  // 5. home, decorated
  await p.evaluate(async () => { const J = window.__jen, s = J.G.state; s.time = 16 * 60; s.home.furniture = [{ id: 'rug_round', x: 150, y: 196, rot: 0 }, { id: 'sofa', x: 130, y: 128, rot: 0 }, { id: 'trophy_gold', x: 220, y: 110, rot: 0 }, { id: 'opening_balloons', x: 60, y: 150, rot: 0 }, { id: 'plant_big', x: 40, y: 230, rot: 0 }, { id: 'piano', x: 230, y: 200, rot: 0 }, { id: 'lamp_floor', x: 90, y: 110, rot: 0 }, { id: 'meo_plush', x: 175, y: 140, rot: 0 }]; (await import('/js/ui/decorate.js')).rebuildHouseFurniture(); J.setScene('house', 150, 250, 'up'); }); await p.waitForTimeout(1500); await caption(4, CAP[4]);
  // 6. the weekly leaderboard
  await at(1000, 1600, 11); await p.evaluate(async () => { await (await import('/js/systems/cloud.js')).resume(); window.__jen.openMenu({ tab: 3 }); }); await p.waitForTimeout(2200); await caption(5, CAP[5]);
  console.log('saved', name); await ctx.close();
}
await b.close(); server.close();
