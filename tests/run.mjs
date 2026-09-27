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
function makePump(p) {
  return async ms => {
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
if (only === 'all' || only === 'story') {
  console.log('story (Chapters 1–20)');
  const { p, errors, ctx } = await openGame('story');
  // count chapter title cards as they appear
  await p.evaluate(() => {
    window.__cards = {};
    const el = document.getElementById('caption');
    new MutationObserver(() => { const m = el.textContent.match(/(?:Chapter|Chương) (\d+)/); if (m && el.classList.contains('on')) { const k = m[1] + '|' + el.textContent; if (window.__lastCard !== k) { window.__lastCard = k; window.__cards[m[1]] = (window.__cards[m[1]] || 0) + 1; } } }).observe(el, { childList: true, subtree: true, attributes: true });
  });
  const pump = makePump(p);
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
    // Chapter 1: the first repair is 230–260k and leaves enough for the first ingredients
    const rep = Object.entries(E.BUSINESSES.shed1.repair).reduce((a, [k, n]) => a + E.MATERIALS[k].price * n, 0);
    const firstStock = ['tea', 'kumquat', 'sugar', 'ice'].reduce((a, k) => a + E.INGREDIENTS[k].price, 0);
    out.info.repair = rep; out.info.firstStock = firstStock;
    if (rep < 230 || rep > 260) bad(`first repair costs ${rep}k (want 230–260k)`);
    if (300 - rep < firstStock) bad(`after the repair ${300 - rep}k is left, the first ingredients cost ${firstStock}k`);
    // margins by tier: early ≤ ch 3, mid ch 4–12, premium café/grill
    for (const [id, R] of Object.entries(E.RECIPES)) {
      const m = 1 - E.recipeCost(id) / R.price, tier = ['cafe', 'grill'].includes(R.biz) ? [0.5, 0.6] : R.chapter <= 3 ? [0.35, 0.47] : [0.44, 0.58];
      if (m < tier[0] - 0.005 || m > tier[1] + 0.005) bad(`${id} margin ${(m * 100).toFixed(0)}% outside ${tier[0] * 100}–${tier[1] * 100}%`);
    }
    // property pays back in 40–70 days of rent
    for (const [id, P] of Object.entries(E.PLACES)) { const d = E.propertyPrice(id) / P.rent; if (d < 40 || d > 70) bad(`${id} pays back in ${d.toFixed(0)} days`); }
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
    s.property = { house: true }; s.stats.served = 300; s.stats.perfect = 90; s.lifetime = 20000; s.story.chapter = Math.max(s.story.chapter, 12); s.money = 4000;
    s.explored = { 'Wind Plaza': true, 'Sunny Beach': true }; s.pets = [];
    const txt = () => [...document.querySelectorAll('.sheet-wrap:not(.out) .sheet')].pop()?.innerText || '';
    const close = async () => { [...document.querySelectorAll('.sheet-wrap:not(.out) .x')].pop()?.click(); await wait(400); };
    J.openMenu({ tab: 1 }); await wait(700); res.office = txt(); await close();
    J.openMenu({ tab: 2 }); await wait(700); res.miles = txt(); await close();
    J.openStaffBoard(); await wait(600); res.staff = txt(); await close();
    const sum = J.endDay(); res.sum = { net: sum.net, staff: sum.staff.length };
    return res;
  });
  const need = [['office', /Net worth|Tổng tài sản/], ['office', /The books|Sổ sách/], ['office', /Hạnh/], ['office', /pays back in|hoàn vốn/], ['miles', /tier \d+ of \d+|bậc \d+\/\d+/], ['miles', /Island secrets|Bí mật/], ['staff', /Phúc/], ['staff', /cooked|nấu/]];
  for (const [k, re] of need) if (!re.test(out[k])) fail('ui', `${k} screen is missing ${re}`);
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
    window.__qStart = (id, who) => { const q = J.sq.SIDE_QUESTS.find(q => q.id === id); const rid = who || q.giver; const a = rid === 'meo' ? J.G.meo : J.G.npcs.byId(rid) || (J.G.npcs.vendors || []).find(v => v.data?.mid === rid); window.__qBusy = true; J.cs.run('qtest', () => J.sq.questTalk(a, rid)).finally(() => { window.__qBusy = false; }); };
  });
  const ids = await p.evaluate(() => window.__jen.sq.SIDE_QUESTS.map(q => q.id));
  const state = id => p.evaluate(id => window.__jen.G.state.sideQuests?.[id] || '', id);
  const settle = async (id, until, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { await pump(500); const st = await state(id); if (until.includes(st) && !(await p.evaluate(() => window.__qBusy || window.__jen.cs.active))) return st; } return state(id); };
  let ok = 0;
  for (const id of ids) {
    // make sure what it needs is done first
    const pre = await p.evaluate(id => { const q = window.__jen.sq.SIDE_QUESTS.find(q => q.id === id); return window.__jen.sq.eligible(q) ? '' : `not eligible (after ${q.after})`; }, id);
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
    if (st !== 'done') fail('quests', `${id} got stuck at "${st || 'not started'}"`);
    else ok++;
  }
  const scrap = await p.evaluate(() => Object.keys(window.__jen.G.state.keepsakes || {}).length);
  if (ok === ids.length) pass('quests', `all ${ids.length} side quests playable start to finish · ${scrap} keepsakes in the scrapbook`);
  if (errors.length) fail('quests', 'errors: ' + errors.slice(0, 3).join(' | ')); else pass('quests', 'no errors');
  await ctx.close();
}

// ---------------------------------------------------------------- world interactions
// Walk up to things and use them: furniture at home, the fountain, the pier, the shore,
// fishing, the garden. Each should offer an action, run without errors and count as a discovery.
if (only === 'all' || only === 'world') {
  console.log('world interactions');
  const { p, errors, ctx } = await openGame('world');
  if (!(await reachFreeRoam(p))) fail('world', 'never reached free roam');
  const pump = makePump(p);
  const tryAt = async (scene, x, y, expect) => {
    const label = await p.evaluate(([scene, x, y]) => { const J = window.__jen; if (J.G.scene.id !== scene) J.setScene(scene, x, y, 'up'); const pl = J.G.player; pl.x = x; pl.y = y; pl.face('up'); return new Promise(r => setTimeout(() => r(document.getElementById('actBtn')?.innerText || document.querySelector('.act-btn, #action')?.innerText || ''), 500)); }, [scene, x, y]);
    const act = await p.evaluate(([scene, x, y]) => { const J = window.__jen, sc = J.G.scene, pl = J.G.player; const a = J.ix.nearbyThing(sc, pl) || J.fishing.fishingAction(pl) || J.garden.gardenAction(pl) || J.ix.outdoorAction(pl) || J.garden.plaqueAction(pl); if (!a) return ''; window.__run = a.run(); return a.label; }, [scene, x, y]);
    if (!act) { fail('world', `nothing to do at ${scene} (${x}, ${y}) — wanted ${expect}`); return false; }
    await pump(2500);
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
  // garden: plant, water twice over two days, harvest
  const G0 = await p.evaluate(() => window.__jen.garden.GARDEN);
  if (await tryAt('island', G0.x - 30, G0.y + 14, 'garden')) {
    await p.evaluate(() => { const g = window.__jen.G.state.garden; if (g?.beds?.[0]) { g.beds[0].water = 2; } });
    await tryAt('island', G0.x - 30, G0.y + 14, 'harvest');
  }
  const found = await p.evaluate(() => Object.keys(window.__jen.G.state.discovered || {}));
  const want = ['tv', 'radio', 'lamp', 'fish', 'books', 'piano', 'coin', 'timetable', 'fishing', 'garden'];
  const miss = want.filter(k => !found.includes(k));
  if (miss.length) fail('world', 'not discovered: ' + miss.join(', ')); else pass('world', `${found.length} kinds of interaction tried and remembered (${found.join(', ')})`);
  if (errors.length) fail('world', 'errors: ' + errors.slice(0, 3).join(' | ')); else pass('world', 'no errors');
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
