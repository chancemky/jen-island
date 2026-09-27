// Automated test suite: `npm test` (all), `npm run test:story`, `npm run test:render`.
//
//   content  — the in-game content validator (js/dev/validate.js) + source scans
//              (achievement ids used in code exist, every file the service worker
//              caches exists)
//   story    — plays Chapters 1→20 in a real browser from a fresh save, satisfying
//              each objective, and checks: every transition follows the step table,
//              chapters never go backwards, each chapter title card shows once,
//              chapter/finale achievements unlock, rewards are paid, no errors,
//              no soft locks (every step advances), and it ends in free play
//   render   — draws every look × pose × direction and checks pixels were drawn
//              (catches invisible / missing characters)
//
// Needs: npm i (playwright). Starts its own static server.

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium, devices } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv[2] || 'all';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;
let failures = 0;
const fail = (suite, msg) => { failures++; console.log(`  ✗ ${suite}: ${msg}`); };
const pass = (suite, msg) => console.log(`  ✓ ${suite}: ${msg}`);
const browser = await chromium.launch();

async function openGame(tag) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
  await p.goto(`${BASE}/?dev=${tag}${Date.now()}&fresh`);
  await p.waitForFunction(() => window.done, null, { timeout: 30000 });
  return { p, errors, ctx };
}

// ---------------------------------------------------------------- content
if (only === 'all' || only === 'content') {
  console.log('content');
  const { p, errors, ctx } = await openGame('content');
  await p.waitForFunction(() => window.__jen?.validate, null, { timeout: 20000 });
  const issues = await p.evaluate(() => window.__jen.validate());
  if (issues.length) issues.forEach(i => fail('content', i)); else pass('content', 'validator found no broken references');
  // achievement ids used anywhere in the code must exist
  const gameSrc = fs.readFileSync(path.join(ROOT, 'js/data/game.js'), 'utf8');
  const achBlock = gameSrc.slice(gameSrc.indexOf('export const ACHIEVEMENTS'), gameSrc.indexOf('};', gameSrc.indexOf('export const ACHIEVEMENTS')));
  const achIds = new Set([...achBlock.matchAll(/^\s+([a-z0-9_]+):\s*\{/gm)].map(m => m[1]));
  const used = new Set();
  const walk = d => { for (const f of fs.readdirSync(d)) { const fp = path.join(d, f); if (fs.statSync(fp).isDirectory()) walk(fp); else if (f.endsWith('.js')) for (const m of fs.readFileSync(fp, 'utf8').matchAll(/unlockAchievement\('([a-z0-9_]+)'\)/g)) used.add(m[1]); } };
  walk(path.join(ROOT, 'js'));
  const missing = [...used].filter(id => !achIds.has(id));
  if (missing.length) fail('content', 'unknown achievement ids used in code: ' + missing.join(', ')); else pass('content', `${used.size} achievement ids used in code all exist`);
  // every file the service worker caches must exist
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const shell = JSON.parse(sw.match(/const SHELL = (\[[^\]]*\])/)[1]);
  const gone = shell.filter(f => f !== './' && !fs.existsSync(path.join(ROOT, f)));
  if (gone.length) fail('content', 'service worker lists missing files: ' + gone.join(', ')); else pass('content', `all ${shell.length} cached files exist`);
  // every module under js/ that the game imports is cached for offline play
  const mods = []; const walk2 = d => { for (const f of fs.readdirSync(d)) { const fp = path.join(d, f); if (fs.statSync(fp).isDirectory()) { if (f !== 'dev') walk2(fp); } else if (f.endsWith('.js')) mods.push('./' + path.relative(ROOT, fp)); } };
  walk2(path.join(ROOT, 'js'));
  const uncached = mods.filter(m => !shell.includes(m));
  if (uncached.length) fail('content', 'modules missing from the service worker cache: ' + uncached.join(', ')); else pass('content', 'every game module is cached for offline play');
  if (errors.length) errors.forEach(e => fail('content', e));
  await ctx.close();
}

// ---------------------------------------------------------------- save recovery
if (only === 'all' || only === 'save') {
  console.log('save recovery');
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const p = await ctx.newPage();
  const uid = 'saverec' + Date.now();
  await p.goto(`${BASE}/?dev=${uid}&fresh`); await p.waitForFunction(() => window.done, null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  const key = await p.evaluate(async () => {
    const S = await import('/js/systems/save.js'), G = window.__jen.G;
    G.state.player.name = 'Tester'; G.state.day = 5; G.state.story.chapter = 3; G.state.story.step = 'grow';
    S.saveLocal(); S.backupNow('night');
    return Object.keys(localStorage).find(k => /^jenisland\.save\d+\.dev-/.test(k) && !k.includes('.backups') && !k.includes('.corrupt'));
  });
  await p.evaluate(k => { window.__jen.G.user = null; localStorage.setItem(k, '{"broken": tru'); }, key);   // simulate an interrupted / damaged write (and stop this page saving over it on unload)
  await p.goto(`${BASE}/?dev=${uid}`); await p.waitForFunction(() => window.done, null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(async k => { const S = await import('/js/systems/save.js'); return { day: window.__jen.G.state.day, name: window.__jen.G.state.player.name, note: S.saveStatus.recovered, corrupt: !!localStorage.getItem(k + '.corrupt') }; }, key);
  if (r.day === 5 && r.name === 'Tester') pass('save', `damaged save recovered from backup (${r.note})`); else fail('save', `damaged save not recovered: ${JSON.stringify(r)}`);
  if (r.corrupt) pass('save', 'the damaged copy was kept aside, not deleted'); else fail('save', 'the damaged copy was not kept');
  await ctx.close();
}

// ---------------------------------------------------------------- story
if (only === 'all' || only === 'story') {
  console.log('story (Chapters 1–20)');
  const { p, errors, ctx } = await openGame('story');
  // count chapter title cards as they appear
  await p.evaluate(() => {
    window.__cards = {};
    const el = document.getElementById('caption');
    new MutationObserver(() => { const m = el.textContent.match(/(?:Chapter|Chương) (\d+)/); if (m && el.classList.contains('on')) { const k = m[1] + '|' + el.textContent; if (window.__lastCard !== k) { window.__lastCard = k; window.__cards[m[1]] = (window.__cards[m[1]] || 0) + 1; } } }).observe(el, { childList: true, subtree: true, attributes: true });
  });
  const pump = async ms => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await p.evaluate(() => {
        const m = document.querySelector('.modal'); if (m) { const i = m.querySelector('input'); if (i && !i.value) i.value = 'Test'; m.querySelector('.btn')?.click(); }
        document.querySelector('#skipBtn:not(.hidden)')?.click();
        const r = document.querySelector('.reward button'); if (r) r.click();
        for (const b of document.querySelectorAll('button')) if (/^(Yay!|Tuyệt!|Next day ☀|Ngày mới ☀|Let.s play!?|Chơi thôi!?)$/.test(b.textContent.trim())) b.click();
        document.querySelector('.cs-continue')?.click();
      }).catch(() => {});
      const dlg = await p.evaluate(() => { const d = document.getElementById('dialog'); return d && !d.classList.contains('hidden') && !d.classList.contains('out') ? (document.querySelector('.dlg-choices button') ? 'choice' : 'text') : ''; }).catch(() => '');
      if (dlg === 'text') await p.keyboard.press('e');
      if (dlg === 'choice') await p.click('.dlg-choices button', { timeout: 500 }).catch(() => {});
      await p.waitForTimeout(220);
    }
  };
  // reach free roam (arrival + tour)
  for (let i = 0; i < 60; i++) { await pump(2000); if (await p.evaluate(() => window.__jen?.G?.state?.story?.flags?.freeRoam)) break; }
  if (!(await p.evaluate(() => window.__jen.G.state.story.flags.freeRoam))) fail('story', 'never reached free roam after the tour');
  const expected = await p.evaluate(() => { const S = window.__jen.STEPS; const out = []; let c = 'materials', g = 0; while (c && g++ < 100) { out.push(c); c = S[c].next; } return out; });
  const seen = [];
  let lastCh = 1, soft = false;
  for (let i = 0; i < 90; i++) {
    const before = await p.evaluate(() => window.__jen.G.state.story.step);
    seen.push(before);
    if (before === 'free') break;
    const xp0 = await p.evaluate(() => window.__jen.G.state.xpTotal || 0);
    const res = await p.evaluate(step => {
      const J = window.__jen, G = J.G, s = G.state, B = id => s.biz[id], own = id => { B(id).owned = true; B(id).unlocked = true; B(id).repair = 1; s.keys[id] = true; };
      const reg = n => { for (let k = 0; k < n; k++) s.regulars['r' + k] = { name: 'R' + k, visits: 5 }; };
      const K = id => { (s.keepers ||= {})[id] = { name: 'Test', seed: 1, trait: 'quick', served: 30 }; };
      const staffResto = () => { B('restaurant').employees = ['cook', 'server', 'cleaner'].map((role, i) => ({ id: 'e' + i, role, name: 'E' + i, trait: 'steady', stats: { speed: 3, cooking: 3, service: 3, reliability: 3 } })); };
      const sat = {
        materials: () => { s.materials = { ...s.materials, wood: 99, metal: 99, paint: 99 }; },
        repair: () => { B('shed1').repair = 1; },
        ingredients: () => { for (const k of ['tea', 'kumquat', 'sugar', 'ice']) s.pantry[k] = 40; },
        prep: () => { B('shed1').prepped.kumquat_cut = 10; }, open: () => { s.story.flags.firstServed3 = true; },
        serve: () => { s.stats.served += 3; }, sleep: () => { s.day = Math.max(s.day, 2); },
        settle: () => { s.stats.served += 40; s.stats.perfect += 12; s.lifetime += 900; s.reputation = Math.max(s.reputation, 15); s.day = Math.max(s.day, 5); },
        regulars: () => { reg(3); for (const r of ['tra_tac', 'tra_dao']) if (!s.recipes.includes(r)) s.recipes.push(r); B('shed1').level = 2; s.stats.served += 45; s.day = Math.max(s.day, 8); },
        grow: () => { s.stats.served += 50; s.reputation = Math.max(s.reputation, 40); s.home.furniture = [{ id: 'plant_big', x: 60, y: 200 }, { id: 'fan', x: 100, y: 200 }, { id: 'radio', x: 140, y: 200 }]; s.money = Math.max(s.money, 1000); },
        key2: () => { s.keys.shed2 = true; B('shed2').owned = true; B('shed2').unlocked = true; },
        repair2: () => { B('shed2').repair = 1; }, banhmi: () => { B('shed2').stats.served += 15; },
        hireKeeper: () => K('shed1'), keeperRun: () => { K('shed1'); s.keepers.shed1.served = 25; B('shed2').stats.served += 20; },
        supplies: () => { (s.supply ||= {}).shed1 = { on: true }; B('shed2').level = 2; s.money = Math.max(s.money, 1800); s.day = Math.max(s.day, 15); },
        truck: () => own('truck'), truckServe: () => { B('truck').stats.served += 25; s.reputation = Math.max(s.reputation, 120); },
        restoreNM: () => { s.keys.night = true; const R = J.NIGHT_MARKET_RESTORE; s.money = Math.max(s.money, R.cost + 100); for (const [k, n] of Object.entries(R.mats)) s.materials[k] = (s.materials[k] || 0) + n; J.restoreNightMarket(); }, nightServe: () => { B('night').stats.served += 20; },
        buyStall: () => own('nm2'), stallServe: () => { B('nm2').stats.served += 15; K('nm2'); },
        buyResto: () => { s.keys.restaurant = true; B('restaurant').owned = true; B('restaurant').unlocked = true; }, repairResto: () => { B('restaurant').repair = 1; },
        hire: () => { B('restaurant').employees = [{ id: 'e0', role: 'cook', name: 'A', trait: 'steady' }]; }, restoServe: () => { B('restaurant').stats.served += 30; },
        team: () => staffResto(),
        destination: () => { s.reputation = Math.max(s.reputation, 400); B('shed1').level = 3; const C = J.STATUE_COST; s.money = Math.max(s.money, C.cost + 100); for (const [k, n] of Object.entries(C.mats)) s.materials[k] = (s.materials[k] || 0) + n; J.buildStatue(); },
        harbour: () => { s.story.flags.harbourBridge = true; }, adopt: () => { s.pets = [{ uid: 'x1', id: 'shiba', name: 'Mochi', love: 0 }]; s.petFollow = 'x1'; },
        cafe: () => own('cafe'), cafeServe: () => { B('cafe').stats.served += 25; }, rest7: () => { s.level = Math.max(s.level, 16); if (!s.recipes.includes('ca_phe_trung')) s.recipes.push('ca_phe_trung'); K('cafe'); B('cafe').stats.served += 80; },
        bridge: () => { s.story.flags.bridgeFixed = true; }, islet: () => { s.story.flags.metVy = true; }, vyViews: () => { for (const v of ['lookout', 'firefly', 'lighthouse']) s.story.flags['view:' + v] = true; },
        landlord: () => { s.property = { house: true, shed1: true, shed2: true }; for (const id of ['shed1', 'shed2', 'truck', 'cafe']) K(id); s.money = Math.max(s.money, 15000); },
        festival: () => { const F = J.FESTIVAL_REQ; s.level = Math.max(s.level, F.level); s.materials.lantern = F.lanterns + 4; s.today.served = F.served; },
        cove: () => { s.story.flags.coveBridge = true; }, grill: () => own('grill'), grillServe: () => { B('grill').stats.served += 25; },
        allStalls: () => { for (const id of ['night', 'nm1', 'nm2', 'nm3', 'nm5', 'nm6']) own(id); },
        allStaff: () => { for (const id of Object.keys(s.biz)) { own(id); if (id !== 'restaurant') K(id); } staffResto(); },
        keeper: () => { const R = J.KEEPER_REQ; s.level = Math.max(s.level, R.level); reg(R.regulars + 1); },
      };
      if (!sat[step]) return 'no satisfier for ' + step;
      sat[step](); J.checkStory(); return 'ok';
    }, before).catch(e => 'ERR ' + e.message);
    if (res !== 'ok') { fail('story', `${before}: ${res}`); break; }
    await pump(6000);
    let after = await p.evaluate(() => window.__jen.G.state.story.step);
    for (let k = 0; k < 12 && after === before; k++) { if (!(await p.evaluate(() => window.__jen.cs.active))) await p.evaluate(() => window.__jen.checkStory()); await pump(4000); after = await p.evaluate(() => window.__jen.G.state.story.step); }
    if (after === before) { fail('story', `soft lock: step "${before}" never advanced`); soft = true; break; }
    let want = expected[expected.indexOf(before) + 1];
    if (['nightIntro', 'restoIntro'].includes(want)) want = expected[expected.indexOf(want) + 1];   // intro steps hand straight on from their cutscene
    if (after !== want) fail('story', `"${before}" went to "${after}", the step table says "${want}"`);
    const ch = await p.evaluate(() => window.__jen.G.state.story.chapter);
    const stepCh = await p.evaluate(id => window.__jen.STEPS[id].ch, after);
    if (ch < lastCh) fail('story', `chapter went backwards ${lastCh} → ${ch} at ${after}`);
    if (ch !== Math.max(lastCh, stepCh)) fail('story', `at ${after} the chapter is ${ch}, expected ${Math.max(lastCh, stepCh)}`);
    if (ch > lastCh) { const xp1 = await p.evaluate(() => window.__jen.G.state.xpTotal || 0); if (xp1 <= xp0) fail('story', `no XP reward when chapter ${ch} began`); }
    lastCh = Math.max(lastCh, ch);
  }
  if (!soft) {
    const final = await p.evaluate(() => window.__jen.G.state.story.step);
    if (final === 'free') pass('story', `reached free play through ${seen.length} steps, chapters 1→${lastCh}`); else fail('story', `ended at "${final}", not free play`);
    const cards = await p.evaluate(() => window.__cards);
    const dup = Object.entries(cards).filter(([, n]) => n > 1).map(([c]) => c);
    if (dup.length) fail('story', 'title cards shown more than once for chapters ' + dup.join(', ')); else pass('story', `every chapter title card appeared at most once (${Object.keys(cards).length} cards)`);
    const miss = []; for (let c = 2; c <= 20; c++) if (!(await p.evaluate(n => window.__jen.G.state.story.flags['card:' + n], c))) miss.push(c);
    if (miss.length) fail('story', 'chapters that never showed their title card: ' + miss.join(', ')); else pass('story', 'chapters 2–20 each introduced with a title card');
    const ach = await p.evaluate(() => window.__jen.G.state.achievements);
    for (const id of ['first_keeper', 'night_market', 'restaurant', 'statue', 'lantern_festival', 'keeper_island']) if (!ach.includes(id)) fail('story', `achievement ${id} was not unlocked`);
    pass('story', `story achievements unlocked: ${ach.filter(a => ['first_keeper', 'night_market', 'restaurant', 'statue', 'lantern_festival', 'keeper_island'].includes(a)).join(', ')}`);
    const flags = await p.evaluate(() => ({ keeper: !!window.__jen.G.state.story.flags.keeper, festival: !!window.__jen.G.state.story.flags.festival, statue: !!window.__jen.G.state.statue }));
    for (const [k, v] of Object.entries(flags)) if (!v) fail('story', `flag ${k} missing at the end`);
  }
  if (errors.length) errors.slice(0, 10).forEach(e => fail('story', e)); else pass('story', 'no errors');
  await ctx.close();
}

// ---------------------------------------------------------------- render
if (only === 'all' || only === 'render') {
  console.log('render');
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${BASE}/tests/render.html`);
  await p.waitForFunction(() => window.done, null, { timeout: 60000 });
  const r = await p.evaluate(() => window.result);
  if (r.blank.length) r.blank.slice(0, 20).forEach(b => fail('render', 'nothing drawn for ' + b)); else pass('render', `${r.count} character renders all drew pixels`);
  if (r.thin.length) r.thin.slice(0, 10).forEach(b => fail('render', 'suspiciously little drawn for ' + b));
  if (errors.length) errors.forEach(e => fail('render', e)); else pass('render', 'no errors');
  await ctx.close();
}

await browser.close(); server.close();
console.log(failures ? `\n${failures} problem(s)` : '\nall good');
process.exit(failures ? 1 : 0);
