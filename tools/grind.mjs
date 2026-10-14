// Grinder play-test: node tools/grind.mjs <out.json> [scenario …]
// A bot that plays the way a money grinder does: up at 6:00, runs to the supermarket, buys stock,
// preps it all, runs to the shop and serves every customer as fast as a quick thumb can until the
// shop closes at 23:00, restocking on the run when something runs out — then straight to bed.
// The world runs fast-forwarded (G.runtime.turbo), but every customer, price, tip, wage and bill
// is the game's own. Logs each day's money, levels, achievements and milestones for each scenario.
//   scenarios: early · mid · late · lateAfk · lateCasual (default: all)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium, devices } from 'playwright';

const ROOT = process.cwd(), [OUT = 'grind.json', ...ARGS] = process.argv.slice(2);
const SCEN = {
  early: { step: 'settle', money: 120, days: +(process.env.DAYS || 12), mode: 'grind' },                 // a new player, only the drink stand
  earlyCasual: { step: 'settle', money: 120, days: +(process.env.DAYS || 12), mode: 'casual' },   // the same start, serving one hour in three
  mid: { step: 'truck', money: 3000, days: 8, mode: 'grind' },
  midCasual: { step: 'truck', money: 3000, days: 8, mode: 'casual' },                    // chapter 7: two sheds and a keeper
  late: { step: 'free', money: 40000, days: 8, mode: 'grind' },                   // everything owned and staffed
  lateAfk: { step: 'free', money: 40000, days: 8, mode: 'afk' },                  // the same island, never serving
  lateAfkSupply: { step: 'free', money: 40000, days: 6, mode: 'afk', supply: true }, // …with a supply runner at every shop (a real "runs itself" island)
  lateCasual: { step: 'free', money: 40000, days: 8, mode: 'casual' },            // serves now and then (a third of the day)
  soak: { step: 'free', money: 40000, days: +(process.env.DAYS || 60), mode: 'grind' },   // two months of island days: leaks, save growth, slowdowns
};
const list = ARGS.length ? ARGS : Object.keys(SCEN);
const TYPES = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
const results = {};

// the bot itself, run inside the page every simulation step
const BOT = String(function install(cfg) {
  const J = window.__jen, G = J.G;
  return Promise.all([import('/js/systems/business.js'), import('/js/systems/time.js'), import('/js/ui/shops.js'), import('/js/data/game.js'), import('/js/systems/state.js'), import('/js/systems/progress.js'), import('/js/systems/economy.js')]).then(([B, Tm, Sh, D, St, Pr, Ec]) => {
    const log = window.__grind = { days: [], events: [], cfg };
    const S = () => G.state;
    // the shop to grind: the one whose menu sells for the most per order
    const owned = Object.keys(D.BUSINESSES).filter(id => D.BUSINESSES[id].kind !== 'restaurant' && S().biz[id]?.owned && (S().biz[id].repair >= 1 || !D.BUSINESSES[id].repair) && B.bizRecipes(id).length);
    const avgPrice = id => { const r = B.bizRecipes(id); return r.reduce((a, x) => a + B.recipePrice(id, x), 0) / r.length; };
    const shop = owned.sort((a, b) => avgPrice(b) - avgPrice(a))[0];
    log.shop = shop; log.shopPrice = Math.round(avgPrice(shop));
    const PREPS = Object.entries(D.INGREDIENTS).filter(([, g]) => g.prep).map(([k]) => k);
    let phase = 'wake', t = 0, serveT = 0, dayStart = null, youServed = 0, restocks = 0, achBefore = new Set(S().achievements || []);
    const startDay = () => { dayStart = { money: S().money, lifetime: S().lifetime, level: S().level, rep: S().reputation, xp: S().xpTotal || 0 }; youServed = 0; restocks = 0; };
    startDay();
    // buy what the stock-up button offers, then top up the grind shop's own ingredients to 40 portions
    function shopRun() {
      let spent = 0;
      for (const [k, n] of Sh.shoppingNeeds()) { const c = D.INGREDIENTS[k].price * n; if (!St.canAfford(c)) continue; St.addMoney(-c, 'ingredients'); St.addPantry(k, D.INGREDIENTS[k].pack * n); spent += c; }
      for (const k of B.ingredientsForBiz(shop)) { const g = D.INGREDIENTS[k]; let have = St.pantry(k) + Sh.preppedOf(k); while (have < 40 && St.canAfford(g.price)) { St.addMoney(-g.price, 'ingredients'); St.addPantry(k, g.pack); have += g.pack; spent += g.price; } }
      return spent;
    }
    function prepAll() { for (const k of PREPS) { const n = St.pantry(k); if (n > 0) { St.addPantry(k, -n); const to = D.INGREDIENTS[k].prep.to; S().prepped[to] = (S().prepped[to] || 0) + n; } } }
    function serveOne(c) {
      const o = c.order, R = D.RECIPES[o.recipe];
      if (!B.canMake(shop, o.recipe, o.opts)) return false;
      for (const st of R.steps) { const u = D.STATION[st].uses; if (u) B.takeStock(shop, u); }
      if (R.options.includes('sugar') && o.opts.sugar) B.takeStock(shop, 'sugar');
      if (R.options.includes('ice') && o.opts.ice && o.opts.ice !== 'không đá') B.takeStock(shop, 'ice');
      if (o.opts.topping && o.opts.topping !== 'none') B.takeStock(shop, o.opts.topping);
      if (o.opts.chili === 'có ớt') B.takeStock(shop, 'chili');
      B.completeOrder(c, 'perfect'); youServed++; return true;
    }
    function endOfDay() {
      if (G.runtime.serviceOpen) G.runtime.serviceOpen = null;
      const claimed = [];
      for (const tr of Pr.TRACKS) while (Pr.trackState(tr).ready) { const r = Pr.claimMilestone(tr.id); if (!r) break; claimed.push(tr.id); }
      const sum = Tm.endDay();
      const now = S(), ach = (now.achievements || []).filter(a => !achBefore.has(a)); achBefore = new Set(now.achievements || []);
      log.days.push({ day: sum.day, chapter: now.story.chapter, step: now.story.step, start: dayStart.money, end: now.money, earnedGross: now.lifetime - dayStart.lifetime,
        revenue: sum.revenue, served: sum.served, youServed, lost: sum.lost, tips: sum.tips, rent: sum.rent, wages: (sum.wages || 0) + (sum.keeperWages || 0), net: sum.net,
        level: now.level, levelsGained: now.level - dayStart.level, heapMB: Math.round((performance.memory?.usedJSHeapSize || 0) / 1e6), actors: G.scenes.island.actors.length, saveKB: Math.round(JSON.stringify(now).length / 1000), rep: Math.round(now.reputation), xp: (now.xpTotal || 0) - dayStart.xp, restocks, spend: sum.books?.spending, income: sum.books?.income, achievements: ach, milestonesClaimed: claimed, milestoneLines: sum.milestones.length });
      S().time = Tm.DAY_START; startDay();
      phase = 'wake'; t = 0;
    }
    const TRIP = 14, BUY = 4, PREP = 3;          // real seconds: a run across the island, the till, the prep table
    G.runtime.simHook = dt => {
      if (log.done) return;
      const s = S(), m = s.time;
      if (s.day >= cfg.lastDay) { log.done = true; G.runtime.turbo = 1; return; }
      t += dt;
      if (cfg.mode === 'afk') { if (m >= 23 * 60 + 5) endOfDay(); return; }
      const casualOff = cfg.mode === 'casual' && Math.floor(m / 60) % 3 !== 0;     // a casual player serves one hour in three
      switch (phase) {
        case 'wake': if (t > 3) { phase = 'toMarket'; t = 0; } break;
        case 'toMarket': if (t > TRIP) { phase = 'buy'; t = 0; } break;
        case 'buy': if (t > BUY) { log.events.push(['buy', s.day, Math.round(m), shopRun()]); prepAll(); phase = 'prep'; t = 0; } break;
        case 'prep': if (t > PREP) { phase = 'toShop'; t = 0; } break;
        case 'toShop': if (t > TRIP) { phase = 'serve'; t = 0; serveT = 0; } break;
        case 'serve': {
          if (!s.biz[shop].open) { const r = B.openBiz(shop); if (!r.ok) { if (m >= 23 * 60) { endOfDay(); return; } if (!B.makeableRecipes(shop).length) { restocks++; phase = 'toMarket'; t = 0; G.runtime.serviceOpen = null; } return; } }
          if (casualOff) { if (G.runtime.serviceOpen === shop) G.runtime.serviceOpen = null; if (m >= 23 * 60) endOfDay(); return; }
          G.runtime.serviceOpen = shop;
          const q = B.rt(shop).queue, c = q.find(x => x.slot === 0 && (x.state === 'waiting' || x.state === 'ordering') && !x.actor.path);
          for (const x of q) { x._age = (x._age || 0) + dt; if (x._age > 90 && !x._flag) { x._flag = true; log.events.push(['stuck', s.day, Math.round(m), x.state, x.slot, Math.round(x.actor.x), Math.round(x.actor.y), !!x.actor.path]); } }
          if (!c) { serveT = 0; if (m >= 23 * 60 && (!q.length || m >= 23 * 60 + 40)) endOfDay(); return; }
          serveT += dt;
          if (serveT < cfg.serve) return;
          serveT = 0;
          if (!serveOne(c)) { restocks++; phase = 'toMarket'; t = 0; G.runtime.serviceOpen = null; }
          break;
        }
      }
    };
    G.runtime.turbo = cfg.turbo;
    return shop;
  });
});

for (const name of list) {
  const sc = SCEN[name];
  const ctx = await browser.newContext({ ...devices['iPhone 13'] }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route(/supabase\.co/, r => r.fulfill({ json: [] }));
  const base = `http://127.0.0.1:${server.address().port}/?dev=grind${name}${Date.now()}`;
  await p.goto(base + '&fresh'); await p.waitForFunction(() => window.done, null, { timeout: 30000 });
  if (sc.supply) await p.evaluate(() => { window.__supplyAll = true; });
  await p.evaluate(async ([step, money]) => { const d = await import('/js/dev/devtools.js'); d.jumpTo(step); const st = window.__jen.G.state; st.player.name = 'Grinder'; st.island.name = 'Test Isle'; st.money = money; st.settings.lowPower = true; if (window.__supplyAll) for (const id of Object.keys(st.biz)) if (st.biz[id].owned && id !== 'restaurant') (st.supply ||= {})[id] = { on: true }; (await import('/js/systems/save.js')).saveLocal(); }, [sc.step, sc.money]);
  await p.goto(base); await p.waitForFunction(() => window.done, null, { timeout: 30000 });
  // click through whatever the game puts up, like a player tapping past it (dialogue: the first choice)
  const clear = async () => {
    const dlg = await p.evaluate(() => { document.querySelector('#skipBtn:not(.hidden)')?.click(); for (const b of document.querySelectorAll('.modal .btn, .reward button, .levelup button, .summary .btn, .wn-wrap .btn, .sheet-wrap:not(.out) .x')) b.click?.(); const d = document.getElementById('dialog'); return d && !d.classList.contains('hidden') && !d.classList.contains('out') ? (document.querySelector('.dlg-choices button') ? 'choice' : 'text') : ''; }).catch(() => '');
    if (dlg === 'text') await p.keyboard.press('e').catch(() => {});
    if (dlg === 'choice') await p.click('.dlg-choices button', { timeout: 500 }).catch(() => {});
  };
  for (let i = 0; i < 20; i++) { await clear(); await p.waitForTimeout(300); }
  const startDay = await p.evaluate(() => window.__jen.G.state.day);
  const shop = await p.evaluate(`(${BOT})(${JSON.stringify({ ...sc, serve: +(process.env.SERVE || 4.5), turbo: +(process.env.TURBO || 12), lastDay: 0 })})`);
  await p.evaluate(n => { window.__grind.cfg.lastDay = window.__jen.G.state.day + n; }, sc.days);
  console.log(`${name}: grinding ${shop} from day ${startDay} for ${sc.days} days`);
  const t0 = Date.now(); let shown = 0;
  while (!(await p.evaluate(() => window.__grind.done))) {
    await clear(); await p.waitForTimeout(400);
    const nd = await p.evaluate(n => (window.__grind?.days || []).slice(n), shown).catch(() => []);   // print each day as it finishes
    for (const d of nd) { shown++; console.log(`  · day ${d.day}: ${d.start}→${d.end} served ${d.youServed}/${d.served} lv${d.level} rep ${d.rep} heap ${d.heapMB}MB actors ${d.actors} save ${d.saveKB}KB`); }
    if ((Date.now() - t0) % 60000 < 450) console.log('  …', await p.evaluate(() => { const s = window.__jen.G.state; return `day ${s.day} ${Math.floor(s.time / 60)}:${String(Math.floor(s.time % 60)).padStart(2, '0')} ch${s.story.chapter} ${s.story.step} money ${Math.round(s.money)} cs ${!!window.__jen.G.runtime.inCutscene}`; }).catch(() => '?'));
    if (Date.now() - t0 > (+process.env.MAXMIN || 40) * 60 * 1000) { console.log('  timed out'); break; }
  }
  const g = await p.evaluate(() => ({ shop: window.__grind.shop, shopPrice: window.__grind.shopPrice, days: window.__grind.days, events: window.__grind.events, final: { money: window.__jen.G.state.money, level: window.__jen.G.state.level, rep: window.__jen.G.state.reputation, chapter: window.__jen.G.state.story.chapter, ach: window.__jen.G.state.achievements.length } }));
  g.errors = errs; results[name] = g;
  console.log(`  ${((Date.now() - t0) / 60000).toFixed(1)} min · ${errs.length} errors`);
  for (const e of g.events.filter(e => e[0] === 'stuck')) console.log('  STUCK customer', JSON.stringify(e));
  for (const d of g.days) console.log(`  day ${d.day} ch${d.chapter} ${d.step}: ${d.start}→${d.end} (net ${d.net}) served ${d.youServed}/${d.served} lost ${d.lost} lv${d.level}(+${d.levelsGained}) rep ${d.rep} restocks ${d.restocks} heap ${d.heapMB}MB actors ${d.actors} save ${d.saveKB}KB ach [${d.achievements.join(',')}] ms ${d.milestonesClaimed.length}`);
  await ctx.close();
}
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
await browser.close(); server.close();
