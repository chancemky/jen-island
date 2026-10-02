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

// click through dialogue, cutscenes, rewards and prompts like a very patient player
function makePump(p, chaos = false) {
  return async ms => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (chaos) {
        // an impatient player: taps everywhere, mashes the action key, pokes the menu around transitions
        const r = Math.random();
        // (random taps only on the game itself — inside a menu they could hit Settings → Reset game)
        const menuUp = await p.evaluate(() => !!document.querySelector('.sheet-wrap:not(.out)')).catch(() => true);
        if (r < 0.35) { if (!menuUp) await p.mouse.click(40 + Math.random() * 310, 150 + Math.random() * 560).catch(() => {}); }
        else if (r < 0.55) { for (let k = 0; k < 4; k++) await p.keyboard.press('e'); }
        else if (r < 0.63) await p.evaluate(() => document.getElementById('menuBtn')?.click()).catch(() => {});
        else if (r < 0.72) await p.evaluate(() => [...document.querySelectorAll('.sheet-wrap:not(.out) .x')].pop()?.click()).catch(() => {});
        else if (r < 0.78) await p.evaluate(() => document.getElementById('actBtn')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))).catch(() => {});
      }
      await p.evaluate(() => {
        const m = document.querySelector('.modal'); if (m) { const i = m.querySelector('input'); if (i && !i.value) i.value = 'Test'; m.querySelector('.btn')?.click(); }
        document.querySelector('#skipBtn:not(.hidden)')?.click();
        const r = document.querySelector('.reward button'); if (r) r.click();
        for (const b of document.querySelectorAll('button')) if (/^(Yay!|Tuyệt!|Next day ☀|Ngày mới ☀|Let.s play!?|Chơi thôi!?)$/.test(b.textContent.trim())) b.click();
      }).catch(() => {});
      const dlg = await p.evaluate(() => { const d = document.getElementById('dialog'); return d && !d.classList.contains('hidden') && !d.classList.contains('out') ? (document.querySelector('.dlg-choices button') ? 'choice' : 'text') : ''; }).catch(() => '');
      if (dlg === 'text') await p.keyboard.press('e');
      if (dlg === 'choice') await p.click('.dlg-choices button', { timeout: 500 }).catch(() => {});
      await p.waitForTimeout(220);
    }
  };
}
async function reachFreeRoam(p, pump = makePump(p)) {
  for (let i = 0; i < 60; i++) { await pump(2000); if (await p.evaluate(() => window.__jen?.G?.state?.story?.flags?.freeRoam)) return true; }
  return false;
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
if (only === 'all' || only === 'story' || only === 'chaos') {
  const chaos = only === 'chaos';
  console.log(chaos ? 'story with an impatient player (Chapters 1–20)' : 'story (Chapters 1–20)');
  const { p, errors, ctx } = await openGame('story');
  // count chapter title cards as they appear
  await p.evaluate(() => {
    window.__cards = {};
    const el = document.getElementById('caption');
    new MutationObserver(() => { const m = el.textContent.match(/(?:Chapter|Chương) (\d+)/); if (m && el.classList.contains('on')) { const k = m[1] + '|' + el.textContent; if (window.__lastCard !== k) { window.__lastCard = k; window.__cards[m[1]] = (window.__cards[m[1]] || 0) + 1; } } }).observe(el, { childList: true, subtree: true, attributes: true });
  });
  const pump = makePump(p, chaos);
  // reach free roam (arrival + tour)
  for (let i = 0; i < 60; i++) { await pump(2000); if (await p.evaluate(() => window.__jen?.G?.state?.story?.flags?.freeRoam)) break; }
  if (!(await p.evaluate(() => window.__jen.G.state.story.flags.freeRoam))) fail('story', 'never reached free roam after the tour');
  const expected = await p.evaluate(() => { const S = window.__jen.STEPS; const out = []; let c = 'materials', g = 0; while (c && g++ < 100) { out.push(c); c = S[c].next; } return out; });
  const seen = [];
  let lastCh = 1, soft = false; const stuckAfter = [];
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
    for (let k = 0; k < 20 && after === before; k++) { if (!(await p.evaluate(() => window.__jen.cs.active))) await p.evaluate(() => window.__jen.checkStory()); await pump(4000); after = await p.evaluate(() => window.__jen.G.state.story.step); }
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
    // after every scene the island must be fully free again
    let h = null;
    for (let k = 0; k < 10; k++) { h = await p.evaluate(() => window.__jen.health()); if (!h.cs && !h.dialog && !h.overlays.length && !h.presenting) break; await pump(800); }
    if (!h.cs && !h.dialog) {
      // (in the impatient run, a menu the bot just opened is fine — but only if the pause count matches what's open)
      const menus = h.overlays.filter(o => /sheet-wrap/.test(o) && !/out/.test(o)).length, others = h.overlays.filter(o => !/sheet-wrap/.test(o));
      const bad = [h.inCutscene && 'inCutscene', h.pause > (chaos ? menus : 0) && `pause ${h.pause}`, h.locks.length && `locks ${h.locks}`, (chaos ? others.length : h.overlays.length) && `overlays ${chaos ? others : h.overlays}`, h.fade && 'fade'].filter(Boolean);
      if (bad.length) stuckAfter.push(`${after}: ${bad.join(', ')}`);
    }
  }
  if (stuckAfter.length) fail('story', 'state not clean after scenes: ' + stuckAfter.slice(0, 5).join(' · ')); else pass('story', 'after every scene: controls back, no cutscene flag, no pause, no overlays');
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

// ---------------------------------------------------------------- economy
// The rules the economy promises, checked against the real data and a real day of trade.
if (only === 'all' || only === 'economy') {
  console.log('economy');
  const { p, errors, ctx } = await openGame('econ');
  await p.waitForFunction(() => window.__jen?.econ, null, { timeout: 20000 });
  if (!(await reachFreeRoam(p))) fail('economy', 'never reached free roam');
  const r = await p.evaluate(async () => {
    const J = window.__jen, E = J.econ, G = J.G, s = G.state, out = { bad: [], info: {} };
    const bad = m => out.bad.push(m);
    // Chapter 1: the first repair is 230–260k and leaves enough for the first ingredients,
    // with a 40–100k cushion so one mistake doesn't leave you soft-broke (but no windfall either)
    const rep = Object.entries(E.BUSINESSES.shed1.repair).reduce((a, [k, n]) => a + E.MATERIALS[k].price * n, 0);
    const firstStock = ['tea', 'kumquat', 'sugar', 'ice'].reduce((a, k) => a + E.INGREDIENTS[k].price, 0);
    out.info.repair = rep; out.info.firstStock = firstStock;
    if (rep < 230 || rep > 260) bad(`first repair costs ${rep}k (want 230–260k)`);
    const start = (await import('/js/systems/state.js')).defaultState().money, spare = start - rep - firstStock;
    if (spare < 40 || spare > 100) bad(`after the repair and the first ingredients ${spare}k is left (want 40–100k)`);
    // toppings are never sold at a loss
    for (const [k, sur] of Object.entries(E.OPTIONS.topping.surcharge)) if (sur < E.INGREDIENTS[k].cost) bad(`${k} topping adds ${sur}k but costs ${E.INGREDIENTS[k].cost}k`);
    // margins by tier (v5.3: thinner than before): early ≤ ch 3, mid ch 4+, premium café/grill
    // (keep in sync with the pricing philosophy comment in js/data/game.js)
    for (const [id, R] of Object.entries(E.RECIPES)) {
      const m = 1 - E.recipeCost(id) / R.price, tier = ['cafe', 'grill'].includes(R.biz) ? [0.37, 0.5] : R.chapter <= 3 ? [0.18, 0.35] : [0.3, 0.48];
      if (m < tier[0] - 0.005 || m > tier[1] + 0.005) bad(`${id} margin ${(m * 100).toFixed(0)}% outside ${tier[0] * 100}–${tier[1] * 100}%`);
    }
    // property pays back in 85–140 days of rent (v5.3: a long-term investment)
    for (const [id, P] of Object.entries(E.PLACES)) { const d = E.propertyPrice(id) / P.rent; if (d < 85 || d > 140) bad(`${id} pays back in ${d.toFixed(0)} days`); }
    // one price per business: Mèo Mây's key costs what the business costs
    for (const [id, g] of Object.entries(E.GATES)) if (g.cost !== E.BUSINESSES[id].buy) bad(`${id} key ${g.cost} ≠ business price ${E.BUSINESSES[id].buy}`);
    // price bonuses never stack past the cap
    s.recipes = ['tra_tac', 'tra_dao']; s.recipeLevels.tra_tac = 3; s.biz.shed1.level = 5; s.biz.shed1.special = 'tra_tac'; s.biz.shed1.equip = { register: true };
    if (E.priceBonus('shed1', 'tra_tac') > E.BONUS_CAP + 1e-9) bad('price bonuses stack past the cap');
    s.recipeLevels = {}; s.biz.shed1.level = 1; s.biz.shed1.equip = {};
    // toppings are charged; size L is a little more
    s.recipes.push('tra_sua');
    const plain = E.recipePrice('drinks' in s.biz ? 'shed1' : 'shed1', 'tra_sua', { size: 'M', topping: 'none' }), topped = E.recipePrice('shed1', 'tra_sua', { size: 'M', topping: 'cheese_foam' });
    if (topped <= plain) bad('toppings add nothing to the price');
    // demand curve is gentle: 130% price keeps at least 60% of the custom, 80% brings at most +40%
    const a13 = Math.pow(1.3, -1.3), a08 = Math.pow(0.8, -1.3);
    if (a13 < 0.6 || a08 > 1.4) bad('demand curve too steep');
    // a real day of trade: a shopkeeper serves the drink stand; the books must add up
    s.biz.shed1.owned = true; s.biz.shed1.repair = 1; s.recipes = ['tra_tac'];
    for (const k of ['tea', 'kumquat', 'sugar', 'ice']) s.pantry[k] = 60;
    s.story.chapter = Math.max(s.story.chapter, 6); s.time = 10 * 60; s.money = 5000;
    s.keepers = { shed1: { name: 'Test', seed: 3, trait: 'careful', skill: 2, served: 0, today: 0 } };
    J.openBiz('shed1');
    const t0 = performance.now();
    while (performance.now() - t0 < 25000 && (s.today.pnl.shed1?.sales || 0) < 60) { J.spawnCustomer('shed1'); await new Promise(r => setTimeout(r, 300)); }
    const p0 = s.today.pnl.shed1 || {};
    out.info.pnl = { ...p0 };
    if (!(p0.sales > 0)) bad('no sales were recorded for the shop');
    if (!(p0.cogs > 0) || p0.cogs >= p0.sales) bad(`cost of goods looks wrong: ${p0.cogs} for ${p0.sales} of sales`);
    const sum = J.endDay();
    out.info.sum = { net: sum.net, sales: sum.sales, tips: sum.tips, staff: sum.staff, spending: sum.books.spending };
    if (!sum.books || typeof sum.net !== 'number') bad('the day summary has no books');
    if (!sum.staff?.some(x => x.name === 'Test' && x.served > 0)) bad('the shopkeeper\'s contribution is missing from the summary');
    if (!(sum.books.spending.wages > 0)) bad('shopkeeper wages were not filed under wages');
    if (!s.usage?.shed1?.tea) bad('ingredient usage was not remembered for the supply runner');
    const nw = E.netWorth(E.propertyPrice);
    if (!(nw.total > nw.cash)) bad('net worth does not count what you own');
    // stalls sell their own speciality only
    s.recipes.push('banh_trang_nuong', 'che_ba_mau', 'oc_luoc');
    const menu = id => J.bizRecipes(id).join(',');
    if (menu('nm3') !== 'oc_luoc') bad('the snail stall sells ' + menu('nm3'));
    if (menu('night').includes('oc_luoc')) bad('your first stall sells the snail family\'s speciality');
    return out;
  });
  r.bad.forEach(m => fail('economy', m));
  if (!r.bad.length) pass('economy', `first repair ${r.info.repair}k, first stock ${r.info.firstStock}k; a keeper's day: sales ${r.info.pnl.sales}k, food ${Math.round(r.info.pnl.cogs)}k, net today ${r.info.sum.net}k`);
  if (errors.length) fail('economy', 'errors: ' + errors.slice(0, 3).join(' | ')); else pass('economy', 'no errors during a day of trade');
  await ctx.close();
}

// ---------------------------------------------------------------- screens
// Open every screen the economy and milestones feed, on a well-developed island, and make sure they draw.
if (only === 'all' || only === 'ui') {
  console.log('screens');
  const { p, errors, ctx } = await openGame('ui');
  if (!(await reachFreeRoam(p))) fail('ui', 'never reached free roam');
  const out = await p.evaluate(async () => {
    const J = window.__jen, s = J.G.state, res = {};
    const wait = ms => new Promise(r => setTimeout(r, ms));
    for (const id of ['shed1', 'shed2', 'truck', 'nm3', 'restaurant']) { s.biz[id].owned = true; s.biz[id].unlocked = true; s.biz[id].repair = 1; }
    s.recipes = ['tra_tac', 'banh_mi_thit', 'goi_cuon', 'oc_luoc', 'pho_bo']; s.recipeLevels = { tra_tac: 3 };
    s.keepers = { shed2: { name: 'Hạnh', seed: 5, trait: 'quick', skill: 3, served: 420, today: 34 } };
    s.biz.restaurant.employees = [{ id: 'e1', seed: 9, name: 'Phúc', role: 'cook', trait: 'steady', stats: { speed: 3, cooking: 4, service: 2, reliability: 3 }, today: { cooked: 12 }, work: 40 }];
    s.property = { house: true }; s.stats.served = 300; s.stats.perfect = 90; s.lifetime = 20000; s.story.chapter = Math.max(s.story.chapter, 12); s.money = 0;
    s.explored = { 'Wind Plaza': true, 'Sunny Beach': true }; s.pets = [];
    const txt = () => [...document.querySelectorAll('.sheet-wrap:not(.out) .sheet')].pop()?.innerText || '';
    const close = async () => { [...document.querySelectorAll('.sheet-wrap:not(.out) .x')].pop()?.click(); await wait(400); };
    s.biz.shed1.open = false; s.time = 5 * 60 + 30; res.preDawn = J.openBiz('shed1').why;
    s.time = 23 * 60; res.afterClose = J.openBiz('shed1').why; s.time = 10 * 60;
    res.recipeChapters = [(await import('/js/data/game.js')).RECIPES.tra_tac.chapter, (await import('/js/data/game.js')).RECIPES.tra_dao.chapter];
    J.setScene('island', 900, 1650, 'up');
    J.openMenu({ tab: 1 }); await wait(700); res.office = txt();
    const propertyBtn = [...document.querySelectorAll('.sheet-wrap:not(.out) button')].find(b => /Buy property|Mua đứt/.test(b.textContent));
    res.propertyDisabled = !!propertyBtn?.disabled;
    const hireBtn = [...document.querySelectorAll('.sheet-wrap:not(.out) button')].find(b => /Hire shopkeeper|Thuê người trông/.test(b.textContent));
    hireBtn?.click(); await wait(100); res.shortfallToast = document.getElementById('toasts').innerText;
    const more = [...document.querySelectorAll('.office-card')].find(e => /More places you could run|Những nơi bạn có thể mở thêm/.test(e.textContent));
    res.moreButton = more?.querySelector('button')?.textContent || ''; more?.querySelector('button')?.click(); await wait(700);
    res.waypointToast = document.getElementById('toasts').innerText; res.pointerVisible = document.getElementById('pointer').style.opacity === '1';
    J.openMenu({ tab: 2 }); await wait(700); res.miles = txt(); await close();
    J.openStaffBoard(); await wait(600); res.staff = txt(); await close();
    const sum = J.endDay(); res.sum = { net: sum.net, staff: sum.staff.length };
    return res;
  });
  const need = [['office', /Net worth|Tổng tài sản/], ['office', /The books|Sổ sách/], ['office', /Hạnh/], ['office', /pays back in|hoàn vốn/], ['miles', /tier \d+ of \d+|bậc \d+\/\d+/], ['miles', /Island secrets|Bí mật/], ['staff', /Phúc/], ['staff', /cooked|nấu/]];
  for (const [k, re] of need) if (!re.test(out[k])) fail('ui', `${k} screen is missing ${re}`);
  if (!/Opens at 6:00|Mở cửa lúc 6:00/.test(out.preDawn) || /past 11 pm|quá 23 giờ/.test(out.preDawn)) fail('ui', `wrong pre-dawn opening message: ${out.preDawn}`);
  if (!/past 11 pm|quá 23 giờ/.test(out.afterClose)) fail('ui', `wrong after-close message: ${out.afterClose}`);
  if (!/35%/.test(out.office)) fail('ui', 'the supply-runner copy does not show its 35% fee');
  if (!/Island level unlocks features|Cấp đảo mở khóa tính năng/.test(out.office)) fail('ui', 'island level and shop level are not explained');
  if (!/You have .*short|Bạn có .*thiếu/.test(out.office) || !out.propertyDisabled) fail('ui', 'an unaffordable property is not disabled with its shortfall shown');
  if (!/Need .*Have .*Short|Cần .*Có .*Thiếu/.test(out.shortfallToast)) fail('ui', 'the insufficient-funds toast does not show need, have and shortfall');
  if (out.recipeChapters.some(ch => ch !== 1)) fail('ui', `starter recipe chapters are ${out.recipeChapters.join(', ')}, not Chapter 1`);
  if (!/Next goal|Mục tiêu kế tiếp/.test(out.miles)) fail('ui', 'milestones do not label the next goal');
  if (!out.moreButton || !/Waypoint:|Điểm đến:/.test(out.waypointToast) || !out.pointerVisible) fail('ui', 'the future-business button did not set a visible waypoint');
  if (out.sum.staff < 2) fail('ui', 'the day summary lost the team report');
  if (!need.some(([k, re]) => !re.test(out[k]))) pass('ui', 'business, milestones and staff screens draw their new content');
  if (errors.length) fail('ui', 'errors: ' + errors.slice(0, 3).join(' | ')); else pass('ui', 'no errors on the screens');
  await ctx.close();
}

// ---------------------------------------------------------------- side quests
// Play every side quest from start to finish: accept it, find / meet / solve it,
// deliver it (every stop of a route), and check it ends in the scrapbook.
if (only === 'all' || only === 'quests') {
  console.log('side quests');
  const { p, errors, ctx } = await openGame('quests');
  if (!(await reachFreeRoam(p))) fail('quests', 'never reached free roam');
  const pump = makePump(p);
  await p.evaluate(() => {
    const J = window.__jen, s = J.G.state;
    s.story.chapter = 20; Object.assign(s.story.flags, { harbourBridge: true, coveBridge: true, bridgeFixed: true, keeper: true });
    s.nightMarket.restored = true; s.pets = [{ uid: 'p1', id: 'mutt', name: 'Bông', love: 3 }];
    for (const r of ['ba_tu', 'chu_hai', 'linh', 'minh', 'co_lan', 'be_na', 'anh_tuan', 'chi_mai', 'vy', 'ong_loc', 'chi_ngoc', 'co_dua']) s.friends[r] = 80;
    s.recipes = [...new Set([...s.recipes, 'banh_mi_thit'])];
    J.G.npcs.spawnIsletResidents();
    window.__qStart = (id, who) => { const q = J.sq.SIDE_QUESTS.find(q => q.id === id); const rid = who || q.giver; const a = rid === 'meo' ? J.G.meo : J.G.npcs.byId(rid) || (J.G.npcs.vendors || []).find(v => v.data?.mid === rid); window.__qBusy = true; J.cs.run('qtest-' + id + '-' + (window.__qN = (window.__qN || 0) + 1), () => J.sq.questTalk(a, rid)).finally(() => { window.__qBusy = false; }); };
  });
  const ids = await p.evaluate(() => window.__jen.sq.SIDE_QUESTS.map(q => q.id));
  const state = id => p.evaluate(id => window.__jen.G.state.sideQuests?.[id] || '', id);
  const settle = async (id, until, ms = 45000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await pump(500); const st = await state(id); if (until.includes(st) && !(await p.evaluate(() => window.__qBusy || window.__jen.cs.active))) return st; } return state(id); };
  let ok = 0;
  for (const id of ids) {
    // make sure what it needs is done first
    const pre = await p.evaluate(id => { window.__jen.G.state.story.flags.lastPostDay = -999; const q = window.__jen.sq.SIDE_QUESTS.find(q => q.id === id); return window.__jen.sq.eligible(q) ? '' : `not eligible (after ${q.after})`; }, id);
    if (pre) { fail('quests', `${id}: ${pre}`); continue; }
    await p.evaluate(id => window.__qStart(id), id);
    let st = await settle(id, ['active', 'found']);
    if (st === 'active') {
      await p.evaluate(async id => {
        const J = window.__jen, q = J.sq.SIDE_QUESTS.find(q => q.id === id), pl = J.G.player, s = J.G.state, wait = ms => new Promise(r => setTimeout(r, ms));
        if (J.G.scene !== J.scenes.island) J.setScene('island', q.x, q.y + 40, 'up');
        if (q.time) s.time = Math.round((q.time[0] + 0.3) * 60);
        if (q.type === 'puzzle') {
          pl.x = q.x; pl.y = q.y + 60; await wait(400);
          const r = J.sq.__rt(q), STONES = [[-26, 6], [0, -10], [26, 6]];
          const log = [JSON.stringify(r.order)];
          for (const i of r.order) { pl.x = q.x + STONES[i][0]; pl.y = q.y + STONES[i][1]; await wait(1200); log.push(`${i}:${Math.round(pl.x)},${Math.round(pl.y)} step${r.step}`); pl.x = q.x; pl.y = q.y + 30; await wait(800); }
          return log.join(' ');
        }
        const r = J.sq.__rt(q); if (r) { r.flee = 2; r.pages = [true, true, true]; }
        pl.x = q.x + (r?.dx || 0); pl.y = q.y + (r?.dy || 0) + 4;
      }, id);
      st = await settle(id, ['found', 'done'], 25000);
    }
    // deliver it — to each person on the route in turn
    for (let leg = 0; leg < 4 && st === 'found'; leg++) {
      const who = await p.evaluate(id => { const J = window.__jen, q = J.sq.SIDE_QUESTS.find(q => q.id === id); if (q.time && q.type === 'deliver') J.G.state.time = Math.round((q.time[0] + 0.3) * 60); return J.sq.deliverTarget(q); }, id);
      await p.evaluate(([id, who]) => window.__qStart(id, who), [id, who]);
      await pump(1500);
      st = await settle(id, ['found', 'done'], 20000);
    }
    if (st !== 'done') { const dbg = await p.evaluate(() => [document.getElementById('dlgText')?.innerText, document.getElementById('dlgName')?.innerText, [...document.querySelectorAll('.dlg-choices button')].map(b => b.innerText).join('|'), JSON.stringify(window.__jen.health())]); fail('quests', `${id} got stuck at "${st || 'not started'}" — ${dbg.join(' / ')}`); }
    else ok++;
  }
  await pump(3000);
  const hq = await p.evaluate(() => window.__jen.health());
  const badq = [hq.cs && `cutscene ${hq.csName}`, hq.inCutscene && 'inCutscene', hq.pause && `pause ${hq.pause}`, hq.locks.length && `locks ${hq.locks}`, hq.overlays.length && `overlays ${hq.overlays}`, hq.dialog && 'dialogue'].filter(Boolean);
  if (badq.length) fail('quests', 'after all quests (incl. postgame scenes) the game is not free: ' + badq.join(', ')); else pass('quests', 'after every quest, reward and postgame scene the game is back to free roam');
  const scrap = await p.evaluate(() => Object.keys(window.__jen.G.state.keepsakes || {}).length);
  if (ok === ids.length) pass('quests', `all ${ids.length} side quests playable start to finish · ${scrap} keepsakes in the scrapbook`);
  if (errors.length) fail('quests', 'errors: ' + errors.slice(0, 3).join(' | ')); else pass('quests', 'no errors');
  await ctx.close();
}

// ---------------------------------------------------------------- world interactions
// Walk up to things and use them: furniture at home, the fountain, the pier, the shore,
// fishing. Each should offer an action, run without errors and count as a discovery.
if (only === 'all' || only === 'world') {
  console.log('world interactions');
  const { p, errors, ctx } = await openGame('world');
  if (!(await reachFreeRoam(p))) fail('world', 'never reached free roam');
  const pump = makePump(p);
  const tryAt = async (scene, x, y, expect) => {
    const label = await p.evaluate(([scene, x, y]) => { const J = window.__jen; if (J.G.scene.id !== scene) J.setScene(scene, x, y, 'up'); const pl = J.G.player; pl.x = x; pl.y = y; pl.face('up'); return new Promise(r => setTimeout(() => r(document.getElementById('actBtn')?.innerText || document.querySelector('.act-btn, #action')?.innerText || ''), 500)); }, [scene, x, y]);
    const act = await p.evaluate(([scene, x, y]) => { const J = window.__jen, sc = J.G.scene, pl = J.G.player; const a = J.ix.nearbyThing(sc, pl) || J.fishing.fishingAction(pl) || J.ix.outdoorAction(pl) || J.garden.plaqueAction(pl); if (!a) return ''; window.__run = a.run(); return a.label; }, [scene, x, y]);
    if (!act) { fail('world', `nothing to do at ${scene} (${x}, ${y}) — wanted ${expect}`); return false; }
    await pump(1500);
    for (let k = 0; k < 12 && await p.evaluate(() => window.__jen.dialogue.active || window.__jen.isUiOpen()); k++) await pump(700);
    return true;
  };
  await p.evaluate(() => {
    const J = window.__jen, s = J.G.state;
    s.money = 500; s.story.chapter = Math.max(s.story.chapter, 8); s.story.flags.fishing = true;
    s.home.furniture = [{ id: 'tv', x: 90, y: 150 }, { id: 'radio', x: 150, y: 150 }, { id: 'piano', x: 210, y: 150 }, { id: 'fishtank', x: 90, y: 230 }, { id: 'lamp_floor', x: 150, y: 230 }, { id: 'bookshelf', x: 210, y: 230 }];
    J.setScene('house', 120, 250, 'up'); J.decorate.rebuildHouseFurniture();
  });
  for (const [x, y, what] of [[90, 164, 'tv'], [150, 164, 'radio'], [150, 244, 'lamp'], [90, 244, 'fish'], [210, 244, 'books']]) await tryAt('house', x, y, what);
  // the piano opens a keyboard: play a note and close it
  if (await tryAt('house', 210, 164, 'piano')) { await p.evaluate(() => { document.querySelector('.pkey')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); [...document.querySelectorAll('.sheet-wrap:not(.out) .x')].pop()?.click(); }); await pump(600); }
  await p.evaluate(() => window.__jen.setScene('island', 900, 1650, 'up'));
  await tryAt('island', 900, 1586, 'fountain');
  await tryAt('island', 900, 2420, 'timetable');
  // fishing: wait for the bite, then reel in
  if (await tryAt('island', 880, 2580, 'fishing')) {
    await p.waitForSelector('.fs-bob.dip', { timeout: 8000 }).catch(() => {});
    await p.evaluate(() => document.querySelector('.fishing button')?.click());
    await pump(1500);
    if (!(await p.evaluate(() => Object.keys(window.__jen.G.state.fishBag || {}).length))) fail('world', 'caught nothing while fishing');
  }
  const found = await p.evaluate(() => Object.keys(window.__jen.G.state.discovered || {}));
  const want = ['tv', 'radio', 'lamp', 'fish', 'books', 'piano', 'coin', 'timetable', 'fishing'];
  const miss = want.filter(k => !found.includes(k));
  if (miss.length) fail('world', 'not discovered: ' + miss.join(', ')); else pass('world', `${found.length} kinds of interaction tried and remembered (${found.join(', ')})`);
  // decorating: add from the tray, drag to the very bottom of the room, turn, undo, Done keeps it
  {
    await p.evaluate(async () => { const J = window.__jen, hm = J.G.state.home; for (const f of hm.furniture) hm.owned.push(f.id); hm.furniture = []; hm.owned.push('table_low'); J.setScene('house', 135, 270, 'up'); J.decorate.rebuildHouseFurniture(); (await import('/js/ui/decorate.js')).startDecorate(); });
    await p.waitForTimeout(900);
    const bad = [];
    const item = await p.evaluateHandle(() => [...document.querySelectorAll('.deco-item')].find(e => /Tea table|Bàn trà/.test(e.textContent)));
    if (!item.asElement()) bad.push('the tea table is not in the tray');
    else {
      await item.asElement().click(); await p.waitForTimeout(400);
      const scr = (x, y) => p.evaluate(([x, y]) => { const v = window.__jen.cam.view, z = window.__jen.cam.zoom, r = document.getElementById('game').getBoundingClientRect(); return [r.left + (x - v.x) * z, r.top + (y - v.y) * z]; }, [x, y]);
      const f = await p.evaluate(() => { const f = window.__jen.G.state.home.furniture.find(f => f.id === 'table_low'); return f && { x: f.x, y: f.y }; });
      if (!f) bad.push('tapping it in the tray did not put it in the room');
      else {
        const H = await p.evaluate(() => window.__jen.G.scenes.house.h);
        await p.mouse.click(...(await scr(230, 250))); await p.waitForTimeout(150);            // tap empty floor (deselect)
        const [ax, ay] = await scr(f.x, f.y - 6), [bx, by] = await scr(80, H - 20);
        await p.mouse.move(ax, ay); await p.mouse.down(); for (let i = 1; i <= 10; i++) { await p.mouse.move(ax + (bx - ax) * i / 10, ay + (by - ay) * i / 10); await p.waitForTimeout(25); } await p.mouse.up(); await p.waitForTimeout(300);
        const g = await p.evaluate(() => window.__jen.G.state.home.furniture.find(f => f.id === 'table_low'));
        if (g.y < H - 30) bad.push(`dragging to the bottom of the room left it at y ${g.y} (room is ${H} tall)`);
        const turn = await p.evaluateHandle(() => [...document.querySelectorAll('.deco-tools .btn')].find(b => b.textContent === '↻'));
        if (!turn.asElement()) bad.push('no turn button on the selected piece'); else { await turn.asElement().click(); await p.waitForTimeout(200); if ((await p.evaluate(() => window.__jen.G.state.home.furniture.find(f => f.id === 'table_low').rot)) !== 1) bad.push('turning did nothing'); }
        await (await p.evaluateHandle(() => document.querySelector('.deco-actions .btn'))).asElement().click(); await p.waitForTimeout(200);
        if ((await p.evaluate(() => window.__jen.G.state.home.furniture.find(f => f.id === 'table_low')?.rot)) !== 0) bad.push('undo did not undo the turn');
        await (await p.evaluateHandle(() => [...document.querySelectorAll('.deco-actions .btn')].find(b => /Done|Xong/.test(b.textContent)))).asElement().click(); await p.waitForTimeout(300);
        const h = await p.evaluate(() => ({ f: window.__jen.G.state.home.furniture.find(f => f.id === 'table_low'), open: !!document.querySelector('.deco-bar') }));
        if (h.open) bad.push('Done did not close decorating'); if (!h.f || h.f.y !== g.y) bad.push('Done moved the furniture');
      }
    }
    if (bad.length) bad.forEach(b => fail('world', 'decorate: ' + b)); else pass('world', 'decorating: add from the tray, drag anywhere (even the bottom of the room), turn, undo; Done keeps everything');
    await p.evaluate(() => window.__jen.setScene('island', 900, 1700, 'down'));
  }
  // crowds: a busy evening — nobody shares a standing spot or walks through anyone
  {
    await p.evaluate(async () => {
      const J = window.__jen, G = J.G, s = G.state; if (G.scene !== G.scenes.island) J.setScene('island');
      s.story.chapter = Math.max(s.story.chapter, 5); (s.achievements ||= []).push('lantern_festival'); s.time = 18 * 60;
      for (let i = 0; i < 14; i++) G.npcs.spawnVisitorAt(880 + (i % 5) * 26, 1720 + Math.floor(i / 5) * 26, i % 2 ? 'plaza' : 'stroll');
      for (const a of G.npcs.residents) if (a.data.state === 'idle') a.data.until = 0;
    });
    let stand = 0, through = 0, spots = 0, standInfo = '';
    for (let k = 0; k < 40; k++) {
      await p.waitForTimeout(1000);
      const r = await p.evaluate(() => {
        const G = window.__jen.G, A = G.scenes.island.actors.filter(a => a.visible !== false && (a.data?.npc || a.data?.tourist) && a.data.state !== 'disembark');
        const who = a => `${a.name || 'visitor'} (${a.data.state}${a.sit ? ', seated' : ''}${a.data.stand ? ', spot ' + [...a.data.stand.tags].join('/') + (a.data.stand.owner === a ? '' : ' NOT theirs') : ', no spot'} at ${Math.round(a.x)},${Math.round(a.y)})`;
        let st = 0, th = 0, info = ''; for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) { const d = Math.hypot(A[i].x - A[j].x, A[i].y - A[j].y); if (!A[i].path && !A[j].path && d < 26) { st++; info = `${who(A[i])} & ${who(A[j])}, ${Math.round(d)} px apart`; } else if (d < 9) th++; }
        const owners = new Map(); let dup = 0; for (const a of A) { const sp = a.data.stand; if (!sp) continue; if (owners.has(sp) && owners.get(sp) !== a) dup++; owners.set(sp, a); }
        return { st, th, dup, info };
      });
      if (r.st > stand) standInfo = r.info; stand = Math.max(stand, r.st); through += r.th; spots = Math.max(spots, r.dup);
    }
    if (stand) fail('world', `${stand} pair(s) of people standing on top of each other — e.g. ${standInfo}`); else pass('world', 'on a busy evening nobody stands on top of anyone (40 s)');
    if (spots) fail('world', `${spots} standing spot(s) given to two people`); else pass('world', 'every standing spot belongs to one person');
    if (through > 3) fail('world', `people walked through each other ${through} times`); else pass('world', `people walk round each other (${through} close brush${through === 1 ? '' : 'es'} in 40 s)`);
  }
  // the ferry shuttle: comes back 10 s after leaving, takes everyone in line, waits 3 s once 5 are aboard, leaves empty if nobody's there
  {
    const r = await p.evaluate(async () => {
      const G = window.__jen.G, f = G.npcs.ferry, wait = ms => new Promise(r => setTimeout(r, ms)), out = [];
      const until = async (fn, ms) => { const t0 = performance.now(); while (!fn() && performance.now() - t0 < ms) await wait(100); return fn() ? (performance.now() - t0) / 1000 : null; };
      G.state.time = 10 * 60; f.pax = 0; f.next = 99999;
      for (const t of G.npcs.tourists) { t.data.leaveAt = 99999; if (['queue', 'to-pier'].includes(t.data.state)) t.data.state = 'idle'; }
      // an empty boat: leaves by itself, the next one ties up about 10 s later
      if (await until(() => f.state === 'docked', 40000) == null) return ['the ferry never came in'];
      const left = await until(() => f.state === 'leaving', 15000); if (left == null) out.push('an empty ferry never left'); else if (left > 6) out.push(`an empty ferry waited ${left.toFixed(1)} s`);
      const back = await until(() => f.state === 'docked', 20000); if (back == null || back < 8.5 || back > 12) out.push(`the next boat tied up ${back?.toFixed(1)} s after the last left (want about 10)`);
      await until(() => f.state === 'leaving', 15000); await until(() => f.state === 'away', 15000);
      // seven waiting: all of them board, then it goes 3 s after the last
      const who = []; for (let i = 0; i < 7; i++) who.push(G.npcs.spawnVisitorAt(880 + i * 30, 2380, 'beach'));
      await wait(1500); for (const t of who) { t.stop(); t.data.state = 'idle'; t.data.leaveAt = 0; }
      if (await until(() => f.state === 'docked', 30000) == null) return [...out, 'the ferry never came back for the line'];
      const gone = await until(() => f.state === 'leaving', 60000);
      if (gone == null) out.push('the ferry never left with its passengers');
      else { if (f.boarded < 7) out.push(`only ${f.boarded} of 7 got on`); if (f.sinceBoard < 2.8 || f.sinceBoard > 4) out.push(`left ${f.sinceBoard.toFixed(1)} s after the last boarded (want 3)`); }
      if (who.some(t => G.npcs.tourists.includes(t))) out.push('somebody was left on the pier');
      return out;
    });
    if (r.length) r.forEach(x => fail('world', 'ferry: ' + x)); else pass('world', 'ferry shuttle: back 10 s after leaving, everyone in line boards, leaves 3 s later; an empty boat just goes');
  }
  if (errors.length) fail('world', 'errors: ' + errors.slice(0, 3).join(' | ')); else pass('world', 'no errors');
  await ctx.close();
}

// ---------------------------------------------------------------- stability (stuck screens)
// Everything that can hold the screen or the player, triggered on purpose — often all at
// once — and then: is the island exactly as free as before?
if (only === 'all' || only === 'stability') {
  console.log('stability');
  // 0) the pause menu before the boat: typing names with a "p" in them must never pause the game
  {
    const g = await openGame('stabpause'), q = g.p;
    let named = 0;
    for (let i = 0; i < 120 && named < 2; i++) {
      const inp = await q.$('.modal input');
      if (inp) { await inp.click(); await q.keyboard.type(named ? 'Pine Point' : 'Pippa P', { delay: 30 }); await q.keyboard.press('Escape'); await q.keyboard.press('p');
        const bad = await q.evaluate(() => window.__jen.G.runtime.paused || !!document.getElementById('pauseCard'));
        if (bad) fail('stability', `typing into the ${named ? 'island' : 'player'} name prompt paused the game`);
        await q.evaluate(() => document.querySelector('.modal .btn')?.click()); named++; }
      else { await q.evaluate(() => { document.querySelector('#skipBtn:not(.hidden)')?.click(); const d = document.getElementById('dialog'); if (d && !d.classList.contains('hidden')) d.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); document.querySelector('.dlg-choices button')?.click(); }); await q.keyboard.press('p'); }
      await q.waitForTimeout(250);
    }
    const hp = await q.evaluate(() => ({ paused: !!window.__jen.G.runtime.paused, card: !!document.getElementById('pauseCard'), name: window.__jen.G.state.player.name }));
    if (hp.paused || hp.card) fail('stability', 'the game ended up paused during the opening'); else pass('stability', `no pause during sign-in, naming and the boat, even pressing P (named "${hp.name}")`);
    await g.ctx.close();
  }
  const { p, errors, ctx } = await openGame('stab');
  if (!(await reachFreeRoam(p))) fail('stability', 'never reached free roam');
  const pump = makePump(p);
  const health = () => p.evaluate(() => window.__jen.health());
  // play like a person until nothing is going on any more
  const settle = async (ms = 60000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await pump(700);
      const h = await health();
      if (!h.cs && !h.dialog && !h.ui && !h.presenting && !h.overlays.length && !h.transitioning && !h.queued.length) { await pump(600); const h2 = await health(); if (!h2.cs && !h2.dialog && !h2.overlays.length) return h2; }
    }
    return health();
  };
  const clean = async (label) => {
    const h = await settle();
    const bad = [];
    if (h.cs) bad.push(`cutscene "${h.csName}" still running`);
    if (h.inCutscene) bad.push('inCutscene is still true');
    if (h.pause) bad.push(`pause count is ${h.pause}`);
    if (h.locks.length) bad.push('input locked by ' + h.locks.join(', '));
    if (h.dialog) bad.push('dialogue still open');
    if (h.overlays.length) bad.push('overlays left: ' + h.overlays.join(' | '));
    if (h.fade) bad.push('screen still faded');
    if (!/touch|joy|CANVAS/i.test(h.topAtCentre)) bad.push(`something blocks taps at the centre (${h.topAtCentre})`);
    // can the player walk?
    await p.evaluate(() => { const J = window.__jen; if (J.G.scene.id !== 'island') J.setScene('island', 900, 1700, 'up'); J.G.player.x = 900; J.G.player.y = 1700; });
    const a = await p.evaluate(() => [window.__jen.G.player.x, window.__jen.G.player.y]);
    await p.keyboard.down('ArrowUp'); await p.waitForTimeout(500); await p.keyboard.up('ArrowUp');
    const b = await p.evaluate(() => [window.__jen.G.player.x, window.__jen.G.player.y]);
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 5) bad.push('the player cannot move');
    if (bad.length) fail('stability', `${label}: ${bad.join('; ')}`); else pass('stability', `${label}: back to free roam, controls work`);
    return !bad.length;
  };
  const actionWorks = async (label) => {
    const m0 = await p.evaluate(() => { const J = window.__jen; J.G.state.money = Math.max(50, J.G.state.money); J.setScene('island', 900, 1586, 'up'); J.G.player.x = 900; J.G.player.y = 1586; return J.G.state.money; });
    await p.waitForTimeout(700);
    const lab = await p.evaluate(() => [document.getElementById('actBtn').innerText, document.getElementById('actBtn').className, window.__jen.G.player.x, window.__jen.G.player.y, JSON.stringify(window.__jen.health())]);
    const r = await p.evaluate(() => { const b = document.getElementById('actBtn').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
    await p.mouse.click(r[0], r[1]);
    await p.waitForTimeout(700);
    const ok = await p.evaluate(m0 => window.__jen.G.state.money < m0 || window.__jen.dialogue.active, m0);
    await settle(8000);
    if (!ok) fail('stability', `${label}: the action button did nothing (${lab.join(' / ')})`); else pass('stability', `${label}: the action button works`);
  };

  // 1) many rewards at once → one card at a time
  await p.evaluate(() => { const J = window.__jen; window.__maxCards = 0; window.__cardWatch = setInterval(() => { window.__maxCards = Math.max(window.__maxCards, document.querySelectorAll('.reward:not(.out), .levelup:not(.out)').length); }, 50);
    for (let i = 0; i < 3; i++) J.showReward({ title: 'Reward ' + i, text: 'test' }); for (const a of ['perfect_10', 'served_100', 'tip_big']) J.unlockAchievement(a); J.addXP?.(5000); });
  await clean('three rewards + three achievements + a level-up');
  const maxCards = await p.evaluate(() => { clearInterval(window.__cardWatch); return window.__maxCards; });
  if (maxCards > 1) fail('stability', `${maxCards} blocking cards were open at the same time`); else pass('stability', 'blocking cards queued one at a time');

  // 2) the big stress test: a chapter completes (two cutscenes + a title card) while achievements,
  //    a quest reward and a milestone reward arrive, and the player taps like mad
  await p.evaluate(() => {
    const J = window.__jen, s = J.G.state;
    s.nightMarket.restored = true; for (const id of ['night', 'nm1', 'nm2', 'nm3', 'nm5', 'nm6']) { s.biz[id].owned = true; s.biz[id].unlocked = true; }
    s.story.chapter = 18; J.setStep('allStalls'); J.checkStory();
    setTimeout(() => { J.unlockAchievement('regulars_5'); J.showReward({ title: 'Side quest complete!', text: 'test' }); }, 400);
    setTimeout(() => { s.stats.served = Math.max(s.stats.served, 60); const r = J.claimMilestone('served'); if (r) J.showReward({ title: 'Milestone!', text: 'test' }); J.unlockAchievement('recipes_5'); }, 900);
  });
  for (let i = 0; i < 25; i++) { await p.mouse.click(195, 420).catch(() => {}); await p.keyboard.press('e'); await p.waitForTimeout(60); }
  await clean('cutscene + chapter card + achievements + quest reward + milestone (with rapid tapping)');
  if ((await p.evaluate(() => window.__jen.G.state.story.chapter)) < 19) fail('stability', 'the chapter did not advance during the stress test');
  await actionWorks('after the stress test');

  // 3) a scene asked for twice starts once
  const runs = await p.evaluate(async () => { const J = window.__jen; let n = 0; const f = () => J.cs.run('dup-test', async () => { n++; await new Promise(r => setTimeout(r, 300)); }); await Promise.all([f(), f(), f()]); return n; });
  if (runs !== 1) fail('stability', `the same scene ran ${runs} times`); else pass('stability', 'rapid duplicate scene requests start it once');

  // 4) a line spoken while another is on screen waits its turn (nobody is left hanging)
  const both = await p.evaluate(async () => { const J = window.__jen; const a = J.say(null, 'first line'); const b = J.cs.run('two-lines', () => J.say('meo', 'second line')); const t0 = performance.now(); let done = [false, false]; a.then(() => done[0] = true); b.then(() => done[1] = true);
    while (performance.now() - t0 < 8000 && !(done[0] && done[1])) { document.getElementById('dialog').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await new Promise(r => setTimeout(r, 250)); } return done; });
  if (!both[0] || !both[1]) fail('stability', `overlapping dialogue left a script waiting (${both})`); else pass('stability', 'overlapping dialogue lines both finish');
  await clean('after overlapping dialogue');

  // 5) sleeping with an achievement pending
  await p.evaluate(() => { const J = window.__jen; J.setScene('house', 120, 200, 'up'); J.unlockAchievement('day_7'); J.showReward({ title: 'Pending reward', text: 'test' }); J.doSleep(false); });
  const day0 = await p.evaluate(() => window.__jen.G.state.day);
  await clean('sleep + pending achievement + reward');
  if ((await p.evaluate(() => window.__jen.G.state.day)) <= day0 - 1) fail('stability', 'the day did not advance');

  // 6) doors right after a cutscene
  await p.evaluate(() => { const J = window.__jen; J.cs.run('short', () => new Promise(r => setTimeout(r, 400))); });
  await settle(5000);
  const door = await p.evaluate(async () => { const J = window.__jen; J.setScene('island', 1260, 1790, 'up'); const t = J.scenes.island.triggers.find(t => t.kind === 'door' && t.building === 'house'); J.G.player.x = t.doorX; J.G.player.y = t.doorY + 20; return [t.doorX, t.doorY]; });
  await p.keyboard.down('ArrowUp'); await p.waitForTimeout(1600); await p.keyboard.up('ArrowUp');
  await settle(6000);
  const inside = await p.evaluate(() => window.__jen.G.scene.id);
  if (inside !== 'house') fail('stability', `walking into the door after a cutscene went to "${inside}"`);
  await p.keyboard.down('ArrowDown'); await p.waitForTimeout(1800); await p.keyboard.up('ArrowDown');
  await settle(6000);
  const outside = await p.evaluate(() => window.__jen.G.scene.id);
  if (outside !== 'island') fail('stability', `leaving the house went to "${outside}"`); else if (inside === 'house') pass('stability', 'doors work right after a cutscene (in and out)');
  void door;
  await clean('after doors');

  // 6b) pause in free roam: freezes, resumes from a tap outside the card; a scene takes over from it; a card-less pause is released
  await settle(5000);
  await p.evaluate(() => { const J = window.__jen; J.setScene('island', 900, 1700, 'up'); });
  await p.waitForTimeout(400);
  await p.keyboard.press('p');
  const paused1 = await p.evaluate(() => [window.__jen.G.runtime.paused, !!document.getElementById('pauseCard')]);
  await p.mouse.click(20, 400);
  await p.waitForTimeout(300);
  const paused2 = await p.evaluate(() => window.__jen.G.runtime.paused);
  if (!paused1[0] || !paused1[1]) fail('stability', 'P did not pause in free roam'); else if (paused2) fail('stability', 'tapping outside the pause card did not resume'); else pass('stability', 'pause and resume work in free roam');
  await p.keyboard.press('p');
  await p.evaluate(() => window.__jen.cs.run('after-pause', () => new Promise(r => setTimeout(r, 300))));
  if (await p.evaluate(() => window.__jen.G.runtime.paused)) fail('stability', 'a scene started while paused and stayed frozen'); else pass('stability', 'a scene starting while paused takes over from the pause card');
  await p.evaluate(() => { window.__jen.G.runtime.paused = true; });
  await p.waitForTimeout(1500);
  if (await p.evaluate(() => window.__jen.G.runtime.paused)) fail('stability', 'a pause with no pause card stayed stuck'); else pass('stability', 'a pause with no way to resume is released');
  await clean('after pausing');

  // 7) fail-safes (defensive only): a scene that never finishes, a leaked pause, a leaked lock
  await p.evaluate(() => { const J = window.__jen; J.cs.run('never-ends', () => new Promise(() => {})); });
  await p.waitForTimeout(17500);
  const h7 = await health();
  if (h7.cs) fail('stability', 'a hung cutscene was never given up'); else pass('stability', 'a hung cutscene hands control back (and logs a warning)');
  await p.evaluate(() => { const J = window.__jen; J.G.runtime.pause += 2; J.lockInput('door'); });
  await p.waitForTimeout(9500);
  const h8 = await health();
  if (h8.pause || h8.locks.length) fail('stability', `leaked pause ${h8.pause} / locks ${h8.locks} were not recovered`); else pass('stability', 'a leaked pause count and input lock are recovered');
  await clean('after the fail-safes');

  // real finger taps (not scripted clicks): the level-up "Yay!", a reward card and dialogue
  // must answer a touch — and still do when the phone drops the click (iOS does that)
  {
    const tapEl = async sel => { const c = await p.evaluate(sel => { const e = [...document.querySelectorAll(sel)].pop(); if (!e) return null; const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y); return { x, y, hit: !!t && e.contains(t) }; }, sel); if (c) await p.touchscreen.tap(c.x, c.y); return c; };
    const until = async (fn, ms) => { for (let t = 0; t < ms; t += 100) { if (await p.evaluate(fn)) return true; await p.waitForTimeout(100); } return false; };
    const bad = [];
    await p.evaluate(() => { window.addEventListener('click', e => { if (window.__dropClicks && e.isTrusted) e.stopImmediatePropagation(); }, true); });
    for (const drop of [false, true]) {
      const how = drop ? ' (click dropped)' : '';
      await p.evaluate(d => { window.__dropClicks = d; }, drop);
      // level up
      await p.evaluate(() => { const s = window.__jen.G.state; window.__jen.addXP(Math.round(90 * Math.pow(s.level || 1, 1.5)) - (s.xp || 0) + 1, 'test'); });
      if (!(await until(() => !!document.querySelector('.levelup:not(.out) button'), 6000))) bad.push('level-up card never showed' + how);
      else { await p.waitForTimeout(700); const c = await tapEl('.levelup:not(.out) button'); if (!c.hit) bad.push('something covers the level-up "Yay!"' + how);
        if (!(await until(() => !document.querySelector('.levelup'), 2500))) bad.push('a tap on "Yay!" did not close the level-up card' + how); }
      // reward card
      await p.evaluate(() => { window.__jen.showReward({ title: 'Test', text: 'tap me' }); });
      if (await until(() => !!document.querySelector('.reward:not(.out) button'), 3000)) { await p.waitForTimeout(400); await tapEl('.reward:not(.out) button');
        if (!(await until(() => !document.querySelector('.reward'), 2500))) bad.push('a tap did not close a reward card' + how); } else bad.push('reward card never showed' + how);
      // dialogue: a line (tap the box), then a choice (tap the second answer)
      await p.evaluate(() => { window.__said = 0; window.__jen.say(null, 'A test line.').then(() => { window.__said = 1; }); });
      for (let k = 0; k < 4 && !(await p.evaluate(() => window.__said)); k++) { await p.waitForTimeout(300); await tapEl('#dialog'); }
      if (!(await until(() => window.__said, 1500))) bad.push('tapping the dialogue box did not move the chat on' + how);
      await p.evaluate(() => { window.__pick = -1; window.__jen.ask(null, 'Pick one?', ['First', 'Second']).then(i => { window.__pick = i; }); });
      if (await until(() => !!document.querySelector('.dlg-choices button'), 3000)) { await p.waitForTimeout(500); await tapEl('.dlg-choices button:last-child');
        if (!(await until(() => window.__pick === 1, 2500))) bad.push(`tapping a dialogue answer did nothing (got ${await p.evaluate(() => window.__pick)})` + how); } else bad.push('dialogue choices never showed' + how);
      await until(() => !window.__jen.dialogue.active, 2000);
    }
    await p.evaluate(() => { window.__dropClicks = false; });
    if (bad.length) bad.forEach(b => fail('stability', b)); else pass('stability', 'real taps work on "Yay!", reward cards and dialogue — even when the phone drops the click');
    await clean('after the tap checks');
  }
  // a scene that starts while you lie in a hammock (or are still settling into it) stands you up
  {
    const r = await p.evaluate(async () => {
      const J = window.__jen, G = J.G, pl = G.player, wait = ms => new Promise(r => setTimeout(r, ms)), m = await import('/js/systems/seats.js');
      if (G.scene !== G.scenes.island) J.setScene('island');
      const out = [];
      for (const early of [false, true]) {
        pl.x = 980; pl.y = 2352; await wait(300);
        const s = m.nearestSeat(G.scene, pl.x, pl.y, 40); if (!s) return ['no hammock seat found'];
        m.sitDown(s); await wait(early ? 520 : 1600);                  // (early: still hopping in / settling back)
        if (!early && !pl.lie) out.push('never lay down in the hammock');
        J.cs.run('hammock-test' + early, async () => { await wait(400); });
        await wait(1200);
        if (pl.lie || pl.seat || pl.sit) out.push(`still ${pl.lie ? 'lying' : 'seated'} after a scene started${early ? ' mid-lie-down' : ''}`);
        if ((await import('/js/gfx/hammock.js')).hammockLoad(s.prop)) out.push('the hammock still sags with nobody in it');
      }
      return out;
    });
    if (r.length) r.forEach(x => fail('stability', x)); else pass('stability', 'a scene starting while you lie in a hammock (or settle into it) stands you up cleanly');
    await clean('after the hammock scene');
  }

  const real = errors.filter(e => !/\[watchdog\]|\[cutscene\]|\[input\]/.test(e));
  if (real.length) fail('stability', 'errors: ' + real.slice(0, 3).join(' | ')); else pass('stability', 'no errors');
  await ctx.close();
}

// ---------------------------------------------------------------- clock, bed, reload, action button
if (only === 'all' || only === 'clock') {
  console.log('clock & saves');
  const { p, errors, ctx } = await openGame('clock');
  if (!(await reachFreeRoam(p))) fail('clock', 'never reached free roam');
  const pump = makePump(p);
  const J = fn => p.evaluate(fn);
  await J(() => { const s = window.__jen.G.state; for (const id of ['shed1']) { s.biz[id].owned = true; s.biz[id].unlocked = true; s.biz[id].repair = 1; s.biz[id].open = false; } });
  // 1) up all night in a closed stand: the clock runs past 5:30 to 6:00 and a new day starts right there
  const day0 = await J(() => { const j = window.__jen; j.setScene('shed1', 150, 200, 'up'); j.G.state.time = 29 * 60 + 20; j.G.runtime.devClock = 30; return j.G.state.day; });
  let dawn = null;
  for (let i = 0; i < 30 && !dawn; i++) { await pump(1000); dawn = await J(() => { const j = window.__jen, s = j.G.state; return s.day > 0 && !j.G.runtime.sleeping && !j.cs.active && s.time < 7 * 60 ? { day: s.day, time: s.time, scene: j.G.scene.id } : null; }); }
  await J(() => { window.__jen.G.runtime.devClock = 1; });
  if (!dawn || dawn.day !== day0 + 1) fail('clock', `staying up all night never reached a new morning: ${JSON.stringify(dawn)} (day was ${day0})`);
  else if (dawn.scene !== 'shed1') fail('clock', `woke up in ${dawn.scene} instead of where you nodded off`);
  else pass('clock', `stayed up past 5:30 in a closed stand → day ${dawn.day} at ${Math.floor(dawn.time / 60)}:${String(Math.floor(dawn.time % 60)).padStart(2, '0')}, still in the stand`);
  const opens = await J(() => window.__jen.G.state.time >= 6 * 60);
  if (!opens) fail('clock', 'the new morning starts before opening time');
  // 2) the bed offers Sleep at night from the foot and from the side, and a pet doesn't steal it
  const bed = await J(async () => {
    const j = window.__jen, s = j.G.state, pl = j.G.player, wait = ms => new Promise(r => setTimeout(r, ms));
    j.setScene('house', 135, 170, 'down'); s.time = 23 * 60 + 30;
    const b = s.home.builtins.bed, sc = j.scenes.house, out = {};
    const at = async (x, y) => { pl.x = x; pl.y = y; await wait(450); return { label: document.getElementById('actLabel').textContent, ready: document.getElementById('actBtn').classList.contains('ready') }; };
    out.foot = await at(b.x, b.y + 8);
    out.side = sc.canStand(b.x + 40, b.y - 10, 5) ? await at(b.x + 40, b.y - 10) : { label: 'Sleep', ready: true, skipped: true };
    const { Actor } = await import('/js/world/actor.js');
    const pet = new Actor({ kind: 'pet', name: 'Mít', x: b.x + 6, y: b.y + 14, data: {} }); pet.talkable = true; sc.add(pet);
    out.pet = await at(b.x, b.y + 8); sc.remove(pet);
    return out;
  });
  for (const [k, v] of Object.entries(bed)) if (!v.ready || !/Sleep|Ngủ/.test(v.label)) fail('clock', `bed (${k}) offers "${v.label}" (ready: ${v.ready}) instead of Sleep`);
  if (Object.values(bed).every(v => v.ready && /Sleep|Ngủ/.test(v.label))) pass('clock', 'at night the bed offers Sleep from the foot and the side, even with a pet nearby');
  // 3) the action button holds steady a little past a trigger's edge
  const edge = await J(async () => {
    const j = window.__jen, pl = j.G.player, sc = j.scenes.house, wait = ms => new Promise(r => setTimeout(r, ms));
    const ex = sc.triggers.find(t => t.kind === 'exit'); if (!ex) return null;
    pl.x = ex.x + ex.w / 2; pl.y = ex.y + ex.h / 2; await wait(400);
    const a = document.getElementById('actLabel').textContent;
    pl.y = ex.y - 12; await wait(400);
    return { a, b: document.getElementById('actLabel').textContent, ready: document.getElementById('actBtn').classList.contains('ready') };
  });
  if (!edge) fail('clock', 'the house has no exit trigger');
  else if (!edge.ready || edge.a !== edge.b) fail('clock', `the action button changed from "${edge.a}" to "${edge.b}" just past the trigger edge`);
  else pass('clock', `"${edge.a}" stays offered just past the trigger edge`);
  // 4) the local save keeps up with walking and the clock without anything else changing
  const uid = await J(() => window.__jen.G.user.id);
  const drift = await J(async () => {
    const j = window.__jen, s = j.G.state, pl = j.G.player, wait = ms => new Promise(r => setTimeout(r, ms));
    j.setScene('supermarket', 150, 230, 'up'); s.time = 26 * 60 + 40; j.G.dirty = false;
    await wait(1800); pl.x = 110; pl.y = 250; j.G.dirty = false;
    await wait(6500);
    const key = Object.keys(localStorage).find(k => k.endsWith('.' + j.G.user.id));
    const saved = JSON.parse(localStorage.getItem(key));
    return { pos: saved.pos, time: saved.time };
  });
  if (drift.pos?.scene !== 'supermarket' || Math.abs(drift.pos.x - 110) > 6 || Math.abs(drift.time - (26 * 60 + 40)) > 10) fail('clock', `the local save fell behind: ${JSON.stringify(drift)}`);
  else pass('clock', 'walking and the clock are saved locally without any other change');
  // 5) reload: same clock (even after 2 am) and same place
  await p.goto(`${BASE}/?dev=${uid.replace(/^dev-/, '')}`); await p.waitForFunction(() => window.done, null, { timeout: 30000 });
  await p.waitForTimeout(2500);
  const back = await J(() => { const j = window.__jen; return { time: j.G.state.time, scene: j.G.scene?.id, x: Math.round(j.G.player.x), y: Math.round(j.G.player.y) }; });
  if (Math.abs(back.time - (26 * 60 + 40)) > 10) fail('clock', `reload moved the clock to ${(back.time / 60).toFixed(2)} h (saved at 26.67 h)`);
  else if (back.scene !== 'supermarket' || Math.hypot(back.x - 110, back.y - 250) > 24) fail('clock', `reload moved you to ${back.scene} ${back.x},${back.y}`);
  else pass('clock', 'reload keeps the clock (after 2 am) and your place');
  if (errors.length) fail('clock', 'errors: ' + errors.slice(0, 3).join(' | ')); else pass('clock', 'no errors');
  await ctx.close();
}

// ---------------------------------------------------------------- render
if (only === 'all' || only === 'render') {
  console.log('render');
  const ctx = await browser.newContext({ viewport: { width: 900, height: 700 } });
  const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(`${BASE}/tests/render.html`, { timeout: 120000 });
  await p.waitForFunction(() => window.done, null, { timeout: 240000 });
  const r = await p.evaluate(() => window.result);
  if (r.blank.length) r.blank.slice(0, 20).forEach(b => fail('render', 'nothing drawn for ' + b)); else pass('render', `${r.count} character renders all drew pixels`);
  if (r.thin.length) r.thin.slice(0, 10).forEach(b => fail('render', 'suspiciously little drawn for ' + b));
  if (r.headless?.length) r.headless.slice(0, 10).forEach(b => fail('render', 'head missing or tiny: ' + b)); else pass('render', 'every figure has its big chibi head in every pose');
  if (errors.length) errors.forEach(e => fail('render', e)); else pass('render', 'no errors');
  await ctx.close();
}

await browser.close(); server.close();
console.log(failures ? `\n${failures} problem(s)` : '\nall good');
process.exit(failures ? 1 : 0);
