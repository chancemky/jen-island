// JEN Island — boot, main loop and the glue between systems.

import { Renderer, cam, fx, lightingFor } from './world/render.js';
import { Island, areaAt, BUILDINGS } from './world/island.js';
import { buildInteriors } from './world/interiors.js';
import { buildRestaurant, updateRestaurant, initRestaurantRuntime, restRT, guestNeedingOrder, playerTakeOrder, playerServed, playerCookFailed, nextTicketForPlayer, ticketCooked, playerDeliver, collectRegister } from './systems/restaurant.js';
import { Player } from './systems/player.js';
import { Actor } from './world/actor.js';
import { initInput, input, moveVector, releaseJoystick } from './core/input.js';
import { unlockAudio, sfx, musicTick, setAudio, suspendAudio, setMood } from './core/audio.js';
import { G, defaultState, bizOf, markDirty, flag, setFlag, hasMats, canAfford } from './systems/state.js';
import { scenes, setScene, enterBuilding, exitBuilding, updateDoors, isTransitioning, fadeOut, fadeIn } from './systems/scenes.js';
import { cs, updateFollow, say, ask, wait, camTo } from './systems/cutscene.js';
import { updateDialogue, dialogue, closeDialog } from './ui/dialogue.js';
import { initHud, updateHud, showHud, setAction, setBizButton, triggerAction, toast, updatePointer, showArea, resetArea, renderStars } from './ui/hud.js';
import { isUiOpen, openSheet, h, btn } from './ui/sheets.js';
import { openIngredientShop, openMaterialShop, openFurnitureShop, openBag, openBizMenu, openRequirement, openRecipeBook, openJournal, availableRecipes } from './ui/shops.js';
import { openService, updateService, isServiceOpen, closeService } from './ui/service.js';
import { openPrep, updatePrep, isPrepOpen } from './ui/prep.js';
import { showSummary } from './ui/summary.js';
import { startDecorate, isDecorating, rebuildHouseFurniture } from './ui/decorate.js';
import { openStaffBoard } from './ui/staff.js';
import { openMenu } from './ui/menu.js';
import { showAuth } from './ui/auth.js';
import { updateBusinesses, openBiz, closeBiz, rt as bizRT } from './systems/business.js';
import { initNPCs, updateNPCs, npcDrawables, drawSkyLife, npcs } from './systems/npc.js';
import { updateClock, endDay, specialsInit, timePaused } from './systems/time.js';
import { runArrival, runTour, refreshQuest, checkStory, setStep, repairScene, upgradeScene, buyScene, discoverRecipe, talkToMeo, updateMeo, morningHooks, restoreNightMarket, statueReady, buildStatue, currentStep } from './systems/story.js';
import { talkToResident, talkToMerchant, talkToStaff, talkToVisitor } from './systems/talk.js';
import { loadGame, saveLocal, saveCloudNow, tickSave, initSaveHooks, saveStatus } from './systems/save.js';
import * as cloud from './systems/cloud.js';
import { BUSINESSES, NIGHT_MARKET_RESTORE, STATUE_COST, RECIPES, MATERIALS } from './data/game.js';
import { MERCHANTS, playerLook } from './data/looks.js';
import { bus, dist, clamp, sleep, choice, money } from './core/util.js';
import { LIGHT } from './gfx/props.js';

const $ = id => document.getElementById(id);
const bootBar = $('bootBar'), bootMsg = $('bootMsg');
const progress = (k, m) => { bootBar.style.width = Math.round(k * 100) + '%'; if (m) bootMsg.textContent = m; };

G.runtime = { pause: 0, biz: {}, boatBoost: 0, timeScale: 1 };
G.markDirty = markDirty;

// ---------------------------------------------------------------- boot
async function boot() {
  progress(0.1, 'Đang tải phông chữ…');
  try { await Promise.race([document.fonts.load('900 16px Nunito'), document.fonts.load('800 16px Nunito'), sleep(2500)]); } catch {}
  progress(0.3, 'Đang dựng đảo…');
  const renderer = new Renderer($('game'));
  G.renderer = renderer;
  initInput($('touch'), $('joyBase'), $('joyKnob'));
  input.onAction = () => { if (!dialogue.active) triggerAction(); };
  window.addEventListener('resize', () => renderer.resize());
  window.visualViewport?.addEventListener('resize', () => renderer.resize());
  // one-time audio unlock on the first touch (iOS requirement)
  const unlock = () => { unlockAudio(); window.removeEventListener('pointerdown', unlock, true); };
  window.addEventListener('pointerdown', unlock, true);
  await sleep(10);
  scenes.island = new Island();
  progress(0.55, 'Đang trang trí nhà cửa…');
  Object.assign(scenes, buildInteriors());
  scenes.restaurant = buildRestaurant();
  G.scenes = scenes;
  progress(0.7, 'Đang tìm Mèo Mây…');
  // pre-warm the ground chunks near the dock
  scenes.island.cache.get(2, 6, Math.min(2.5, renderer.dpr * cam.baseZoom));
  initHud(); initSaveHooks();
  progress(0.85, 'Đang kết nối…');
  let user = null;
  const dev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('dev');
  if (dev) user = { id: 'dev-' + (new URLSearchParams(location.search).get('dev') || 'local'), email: 'dev@localhost', local: true };
  else user = await cloud.resume();
  progress(1, 'Sẵn sàng!');
  $('boot').classList.add('gone');
  if (!user) user = await showAuth();
  G.user = user;
  $('boot').classList.remove('gone'); progress(0.9, 'Đang tải hành trình của bạn…');
  G.state = await loadGame(user);
  if (dev && new URLSearchParams(location.search).has('fresh')) G.state = defaultState();
  $('boot').classList.add('gone');
  startGame();
}

function startGame() {
  const s = G.state;
  setAudio({ music: s.settings.music, sfx: s.settings.sfx });
  const look = s.player.look || playerLook(s.player.lookOpt || {});
  G.player = new Player(look);
  G.player.name = s.player.name;
  G.meo = new Actor({ id: 'meo', kind: 'cat', look: { cat: true }, name: 'Mèo Mây', speed: 66, data: { meo: true } });
  G.meo.talkable = true;
  scenes.island.add(G.meo); G.meo.x = 970; G.meo.y = 1650;
  initNPCs(scenes.island);
  spawnMerchants();
  rebuildHouseFurniture();
  scenes.restaurant.applyLevel();
  if (bizOf('restaurant').owned) initRestaurantRuntime();
  specialsInit();
  if (s.today.repStart === null) s.today.repStart = s.reputation;
  renderStars();
  requestAnimationFrame(loop);
  window.done = true;
  if (s.story.step === 'intro' || !s.player.name) { runArrival(); return; }
  if (s.story.step === 'tour') { setScene('island', 900, 2440, 'up'); showHud(true); runTour(); return; }
  // resume where we left off
  const pos = s.pos && scenes[s.pos.scene] ? s.pos : { scene: 'house', x: 135, y: 170 };
  let { x, y } = pos;
  if (!scenes[pos.scene].canStand(x, y, 5)) { const sc = scenes[pos.scene]; x = sc.spawn?.x ?? sc.entry?.x ?? 900; y = sc.entry?.y - 16 || 1700; }
  setScene(pos.scene, x, y, 'down');
  if (!flag('freeRoam')) setFlag('freeRoam');
  showHud(true);
  refreshQuest();
  resetArea();
  toast({ text: `Chào mừng trở lại, ${s.player.name}!`, sub: `${s.island.name} · Ngày ${s.day}`, icon: 'heart' });
}

function spawnMerchants() {
  for (const id of ['supermarket', 'materials', 'furniture']) {
    const sc = scenes[id], mp = sc.merchantPos;
    const def = MERCHANTS[mp.id];
    const a = new Actor({ kind: 'human', look: def.look, name: def.name, x: mp.x, y: mp.y, data: { mid: mp.id, merchant: true } });
    a.talkable = true;
    sc.add(a);
    sc.merchant = a;
  }
  // a shopper browsing the supermarket
  const shopper = new Actor({ kind: 'human', look: { skin: '#f1c6a4', hair: '#6e4430', hairStyle: 'pony', top: '#c9b6e8', topStyle: 'tee', bottom: '#556b8a', bottomLen: 5, shoe: '#fff', lashes: true }, x: 150, y: 210, speed: 30, data: { shopper: true } });
  scenes.supermarket.add(shopper);
  scenes.supermarket.shopper = shopper;
}
function updateInteriorLife(dt) {
  const sc = G.scene;
  if (sc.merchant) {
    const m = sc.merchant; m.data.t = (m.data.t || 0) - dt;
    if (m.data.t <= 0) { m.data.t = 2 + Math.random() * 4; const d = dist(m.x, m.y, G.player.x, G.player.y); if (d < 90) m.face('down'); else m.face(choice(['down', 'left', 'right'])); if (Math.random() < 0.2) { m.setAct('write'); setTimeout(() => m.setAct(null), 1500); } }
  }
  const sh = sc.shopper;
  if (sh && !sh.path) { sh.data.t = (sh.data.t || 0) - dt; if (sh.data.t <= 0) { sh.data.t = 3 + Math.random() * 4; const spots = [[64, 196], [236, 196], [240, 110], [60, 110], [150, 150]]; const p = choice(spots); sh.walkTo([[p[0], p[1]]]).then(() => sh.face('up')); } }
}
bus.on('enter', id => {
  const sc = scenes[id];
  showArea(sc.name, { house: 'Home sweet home', supermarket: 'Supermarket', materials: 'Material shop', furniture: 'Furniture shop', meo: 'Mèo Mây\'s home', shed1: 'Your drink stand', shed2: 'Your bánh mì shed', truck: 'Your food truck', restaurant: 'Your restaurant' }[id] || '');
  if (sc.merchant) { sc.merchant.face('down'); sc.merchant.setAct('wave'); sc.merchant.showEmote('happy', 1.4); setTimeout(() => sc.merchant.setAct(null), 1300); }
  if (id === 'meo' && !sc.actors.includes(G.meo)) setTimeout(() => toast({ text: 'Mèo Mây đang đi dạo', sub: 'Mèo Mây is out — usually home for a nap at noon and at night.', icon: 'notebook' }), 400);
});
bus.on('leave', () => resetArea());
bus.on('late', () => toast({ text: 'Khuya rồi!', sub: 'It\'s very late — head home and sleep.', icon: 'sleep_moon', ms: 4000 }));
bus.on('passout', () => passOut());
bus.on('regular', c => toast({ text: `${c.name} đã thành khách quen!`, sub: 'A new regular customer ♥', icon: 'heart' }));
bus.on('ferry', n => { if (G.scene === scenes.island && flag('freeRoam') && !cs.active && G.state.story.chapter >= 2) toast({ text: 'Tàu khách đã cập bến', sub: `The ferry brought ${n} visitor${n > 1 ? 's' : ''}!`, icon: 'photo', ms: 2200 }); });
bus.on('achievement', () => { if (Math.random() < 0.5) setTimeout(() => toast({ text: 'Mèo Mây: "' + choice(['Wow! I\'m telling everyone!', 'My tail is doing the happy thing!', 'Hehe, I knew you could.', 'That deserves a nap. For me. In your honour.']) + '"', icon: 'heart', ms: 2400 }), 1400); });
bus.on('biz:open', id => { if (currentStep()) checkStory(); });
bus.on('biz:close', (id, why) => { if (why === 'hours') toast({ text: `${BUSINESSES[id].name} đã đóng cửa`, sub: 'Closing time!' }); });

// ---------------------------------------------------------------- main loop
let last = performance.now(), storyT = 0, areaT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1;
  if (document.hidden) return;
  G.t += dt;
  const t = G.t;
  musicTick();
  if (G.runtime.cinematic) return; // the opening cinematic owns the canvas
  if (!G.scene) return;
  const gm = updateClock(dt);
  const pl = G.player, sc = G.scene;
  const busyUi = isUiOpen() || isServiceOpen() || isPrepOpen() || dialogue.active || isDecorating();
  if (!busyUi && !isTransitioning()) pl.drive(dt, sc, sfx); else if (!pl.path) pl.moving = Math.max(0, pl.moving - dt * 6);
  updateFollow(dt);
  sc.update(dt, t);
  if (sc !== scenes.island) scenes.island.update(dt, t);
  if (sc.kind === 'interior') updateInteriorLife(dt);
  updateNPCs(dt);
  updateBusinesses(dt, gm);
  updateRestaurant(dt, gm);
  updateMeo(dt);
  updateDoors(dt);
  fx.update(dt);
  LIGHT.minutes = G.state.time;
  if (!busyUi && !cs.active && !isTransitioning()) updateInteraction(dt); else setAction('', null);
  updateBizButton();
  cam.update(dt, sc, G.renderer.w, G.renderer.h);
  const light = lightingFor(G.state.time, sc.kind !== 'island');
  G.renderer.render(sc, t, {
    player: pl, light,
    worldExtra: sc === scenes.island ? npcDrawables() : null,
    overlay: (c, tt) => { drawSkyLife(c, tt); G.runtime.decoOverlay?.(c, tt); },
  });
  updateHud(dt);
  updateDialogue(dt, t);
  updateService(dt, t);
  updatePrep(dt, t);
  updatePointer(G.renderer);
  // area names on the island
  areaT -= dt;
  if (areaT <= 0 && sc === scenes.island && flag('freeRoam') && !cs.active) { areaT = 0.5; const a = areaAt(pl.x, pl.y); showArea(a.name, a.en); }
  storyT -= dt;
  if (storyT <= 0) { storyT = 1; checkStory(); refreshQuest(); }
  tickSave();
}

// ---------------------------------------------------------------- interactions
function bizIdOfScene(sc) { return { shed1: 'shed1', shed2: 'shed2', truck: 'truck', restaurant: 'restaurant' }[sc.id] || null; }
let doorPeek = null;
function updateInteraction(dt) {
  const pl = G.player, sc = G.scene;
  if (!pl.control) { setAction('', null); return; }
  const [mx, my, mm] = moveVector();
  const tr = sc.triggerAt(pl.x, pl.y, 8);
  // doors swing a little as you approach
  if (sc === scenes.island) {
    const near = sc.triggers.find(t => t.kind === 'door' && dist(pl.x, pl.y, t.doorX, t.doorY) < 34);
    if (doorPeek && doorPeek !== near) { const b = sc.buildings[doorPeek.building]; if (b.doorTarget < 0.9) b.doorTarget = 0; }
    if (near && enterable(near.building)) { const b = sc.buildings[near.building]; if (b.doorTarget < 0.9) b.doorTarget = 0.25; }
    doorPeek = near;
  }
  // walking into a doorway enters; walking out the door leaves
  if (tr?.kind === 'door' && enterable(tr.building) && my < -0.45 && mm > 0.3) { enterBuilding(tr); return; }
  if (tr?.kind === 'exit' && my > 0.45 && mm > 0.3) { exitBuilding(); return; }
  // pick the best context action
  // 1) restaurant guest who wants to order
  if (sc.id === 'restaurant') {
    const g = guestNeedingOrder(pl.x, pl.y);
    const hasServer = [...restRT().staff.values()].some(a => a.data.emp.role === 'server');
    if (g && !hasServer) { setAction('Nhận order', () => takeRestaurantOrder(g), RECIPES[g.recipe].icon); return; }
  }
  // 2) talkable actors right in front of you
  const talk = nearestTalkable(sc, pl);
  if (talk && (!tr || tr.kind === 'door' || dist(talk.x, talk.y, pl.x, pl.y) < 22)) { setAction('Nói chuyện', () => talkTo(talk), 'talk'); return; }
  if (tr) {
    if (tr.kind === 'door') return doorAction(tr);
    if (tr.kind === 'exit') { setAction('Ra ngoài', () => exitBuilding(), 'door'); return; }
    if (tr.kind === 'front') return frontAction(tr);
    if (tr.kind === 'act') return actAction(tr);
  }
  // statue pedestal
  if (sc === scenes.island && dist(pl.x, pl.y, 900, 1600) < 50 && G.state.story.step === 'destination') {
    setAction('Tượng đài', () => statueSheet(), 'star'); return;
  }
  setAction('', null);
}
function nearestTalkable(sc, pl) {
  let best = null, bd = 30;
  const [fx0, fy0] = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[pl.dir];
  for (const a of sc.actors) {
    if (a === pl || !a.visible || !(a.talkable || a.data?.tourist) || a.data?.state === 'busy' || (a === G.meo && a.data.busy)) continue;
    const dx = a.x - pl.x, dy = a.y - pl.y, d = Math.hypot(dx, dy);
    const facing = (dx * fx0 + dy * fy0) / (d || 1);
    const score = d - facing * 10;
    if (d < 34 && score < bd) { bd = score; best = a; }
  }
  return best;
}
async function talkTo(a) {
  releaseJoystick();
  if (a === G.meo) return talkToMeo();
  await cs.run('talk', async () => {
    if (a.data?.rid) await talkToResident(a);
    else if (a.data?.mid) await talkToMerchant(a);
    else if (a.data?.emp) await talkToStaff(a);
    else if (a.data?.tourist) await talkToVisitor(a);
    else await say(a, 'Xin chào!');
  }, { bars: false, keepHud: true });
}
function enterable(bid) {
  const b = BUILDINGS.find(x => x.id === bid);
  if (!b?.interior) return false;
  if (b.biz) { const z = bizOf(b.biz); return z.owned && z.repair >= 1 || (b.biz === 'truck' && z.owned); }
  return true;
}
function doorAction(tr) {
  const bid = tr.building, b = BUILDINGS.find(x => x.id === bid);
  if (b.biz) {
    const z = bizOf(b.biz), def = BUSINESSES[b.biz];
    if (b.biz === 'truck' && !z.owned) {
      if (G.state.story.chapter < 4) return setAction('Xem', () => say(null, 'Một chiếc xe cũ, có tấm bảng "BÁN". An old truck with a FOR SALE sign. Maybe later…'), 'talk');
      return setAction('Mua xe', () => openRequirement({ title: 'Xe Cuốn', sub: 'Food truck · for sale', cost: def.buy, action: () => buyScene('truck'), actionLabel: `Mua · Buy ${def.buy}k`, note: 'A food truck is a business you run in person, like the sheds. No staff here!' }), 'coin');
    }
    if (b.biz === 'restaurant' && !z.owned) {
      if (G.state.story.chapter < 6) return setAction('Xem', () => say(null, 'Nhà hàng cũ trên đồi. The windows are boarded up. A faded sign says "BÁN — FOR SALE".'), 'talk');
      return setAction('Mua', () => openRequirement({ title: 'Nhà hàng trên đồi', sub: 'The old restaurant · for sale', cost: def.buy, action: () => buyScene('restaurant'), actionLabel: `Mua · Buy ${money(def.buy)}` }), 'coin');
    }
    if (z.repair < 1) {
      if (!z.owned || !z.unlocked) return setAction('Xem', () => say(null, 'Một căn chòi cũ, mái tôn thủng. An old shed with a leaky roof. Mèo Mây might know who it belongs to.'), 'talk');
      G.runtime.materialNeed = () => ({ label: def.name, mats: def.repair });
      return setAction('Sửa', () => openRequirement({ title: `Sửa ${def.name}`, sub: 'Repair', mats: def.repair, action: () => repairScene(b.biz), actionLabel: 'Sửa ngay · Repair!', note: b.biz === 'shed1' ? 'Wood for the walls, metal for the roof, paint to make it pretty.' : '' }), 'hammer');
    }
  }
  setAction('Vào', () => enterBuilding(tr), 'door');
}
function frontAction(tr) {
  const bizId = tr.biz, z = bizOf(bizId);
  if (bizId === 'night') {
    if (!G.state.nightMarket.restored) {
      if (G.state.story.step !== 'restoreNM') return setAction('Xem', () => say(null, 'Quầy hàng bỏ hoang, lồng đèn rách. An abandoned stall with torn lanterns.'), 'talk');
      const r = NIGHT_MARKET_RESTORE;
      G.runtime.materialNeed = () => ({ label: 'Chợ Đêm', mats: r.mats });
      return setAction('Khôi phục', () => openRequirement({ title: 'Khôi phục Chợ Đêm', sub: 'Restore the Night Market', cost: r.cost, mats: r.mats, action: () => restoreNightMarket(), actionLabel: 'Thắp đèn! · Light the lanterns!' }), 'lantern');
    }
    return setAction('Sạp đêm', () => stallSheet(), 'banh_trang_nuong');
  }
  if (z.repair < 1 && bizId !== 'truck') {
    const trig = scenes.island.triggers.find(t => t.kind === 'door' && t.building === tr.building);
    return doorAction(trig);
  }
  if (bizId === 'truck' && !z.owned) return doorAction(scenes.island.triggers.find(t => t.kind === 'door' && t.building === 'truck'));
  setAction('', null);
}
// Night stall is operated from outside.
function stallSheet() {
  const z = bizOf('night');
  openSheet({ title: 'Sạp Đêm của bạn', sub: 'Your night stall · 17:00–24:00', build: (body, api) => {
    const list = h('div', 'list'); body.appendChild(list);
    const row = (label, fn, cls = 'btn big') => { const b = btn(label, () => { api.close(true); fn(); }, cls); list.appendChild(b); };
    row(z.open ? 'Đóng sạp · Close' : 'Mở sạp · Open', () => toggleBiz('night'), 'btn big ' + (z.open ? 'coral' : 'gold'));
    row('Bán hàng · Serve', () => openService('night'), 'btn big pink');
    row('Sơ chế · Prep', () => openPrep('night'), 'btn big ghost');
    row('Thực đơn · Menu', () => openBizMenu('night'), 'btn big ghost');
  } });
}
function actAction(tr) {
  const sc = G.scene, bizId = bizIdOfScene(sc);
  const a = tr.action;
  const L = (tr.label || '');
  const map = {
    sleep: () => sleepFlow(),
    homeSnack: () => homeSnack(),
    'shop:ingredients': () => openIngredientShop(),
    'shop:materials': () => { const st = G.state.story.step; if (st === 'materials') G.runtime.materialNeed = () => ({ label: 'Quán Nước', mats: BUSINESSES.shed1.repair }); openMaterialShop(); },
    'shop:furniture': () => openFurnitureShop(),
    serve: () => serveAtCounter(bizId),
    prep: () => openPrep(bizId),
    menu: () => openBizMenu(bizId, { onUpgrade: lv => upgradeScene(bizId, lv) }),
    recipeBook: () => openRecipeBook({ onDiscover: id => discoverRecipe(id) }),
    journal: () => openJournal(),
    collectRegister: () => { const k = collectRegister(); if (k) { toast({ text: `Thu được ${k}k`, sub: 'Collected the restaurant takings', icon: 'coin' }); fx.float(G.player.x, G.player.y - 50, '+' + k + 'k', '#ffe07a'); } },
    staff: () => openStaffBoard(),
    cookTicket: () => cookTicket(),
    deliverDish: () => playerDeliver(),
  };
  if (!map[a]) { setAction('', null); return; }
  setAction(L, map[a], tr.icon);
}
async function serveAtCounter(bizId) {
  const pl = G.player, sc = G.scene;
  pl.control = false;
  await pl.walkTo([[sc.serveSpot.x, sc.serveSpot.y]], { speed: 90 });
  pl.face('down'); pl.control = true;
  if (!bizOf(bizId).open && !bizRT(bizId).queue.length) {
    const r = openBiz(bizId);
    if (!r.ok) { toast({ text: r.why.split('\n')[0], sub: r.why.split('\n')[1] || '', bad: true, ms: 3200 }); return; }
  }
  openService(bizId, { tutorial: G.state.story.chapter <= 2 && G.state.stats.served < 3 });
}
function takeRestaurantOrder(g) {
  const res = playerTakeOrder(g);
  if (!res) return;
  const single = cookSingle(g, q => { if (q === 'wrong') playerCookFailed(g); else playerServed(g, q); });
  openService('restaurant', { single });
}
function cookTicket() {
  const tk = nextTicketForPlayer();
  if (!tk) return;
  openService('restaurant', { single: cookSingle(tk.guest, q => ticketCooked(tk, q)) });
}
function cookSingle(g, onResult) {
  const R = RECIPES[g.recipe];
  return {
    id: 'rg', actor: g.actor, name: 'Bàn ' + (g.table.i + 1), key: 'rest', personality: g.personality, state: 'ordering',
    order: { recipe: g.recipe, opts: {}, price: g.price, text: `Cho mình 1 phần *${R.vi}* nhé!`, chips: [R.en], special: bizOf('restaurant').special === g.recipe },
    get patienceRatio() { return clamp(g.patience / g.patienceMax, 0, 1); },
    gone: () => g.state === 'leaving' || g.state === 'gone',
    onResult,
  };
}
function toggleBiz(bizId) {
  const z = bizOf(bizId);
  if (z.open) { closeBiz(bizId); sfx('back'); toast({ text: `${BUSINESSES[bizId].name} đã đóng cửa`, sub: 'Closed for now' }); return; }
  const r = openBiz(bizId);
  if (!r.ok) { toast({ text: r.why.split('\n')[0], sub: r.why.split('\n')[1] || '', bad: true, ms: 3400 }); return; }
  toast({ text: `${BUSINESSES[bizId].name} mở cửa!`, sub: 'Open for business — customers are on the way', icon: 'sign_open' });
  fx.burst('spark', G.player.x, G.player.y - 40, 10, { up: 40, col: '#ffd35a' });
}
function updateBizButton() {
  const sc = G.scene;
  if (!sc || cs.active || isUiOpen() || isServiceOpen() || isPrepOpen() || dialogue.active || isDecorating()) { setBizButton(null, null); return; }
  const bizId = bizIdOfScene(sc);
  if (bizId) {
    const z = bizOf(bizId);
    if (z.owned && z.repair >= 1) { setBizButton(z.open ? 'Đóng cửa' : 'MỞ CỬA · Open', () => toggleBiz(bizId), z.open); return; }
  }
  if (sc.id === 'house') { setBizButton('Trang trí · Decorate', () => startDecorate()); return; }
  setBizButton(null, null);
}
function statueSheet() {
  const c = STATUE_COST;
  if (!statueReady()) { say('meo', 'Not yet! We need 300 reputation and at least one fully upgraded shop. Then we build the statue!'); return; }
  openRequirement({ title: 'Tượng Người Sáng Lập', sub: 'The founder statue', cost: c.cost, mats: c.mats, action: () => buildStatue(), actionLabel: 'Dựng tượng · Unveil!', who: 'meo' });
}
async function homeSnack() {
  const pl = G.player;
  await cs.run('snack', async () => {
    pl.face('up'); pl.setAct('stir'); sfx('pour'); await wait(1.2);
    pl.face('down'); pl.setAct('drink', 'cup'); pl.setEmo('happy', 2); await wait(1.8); pl.setAct(null);
    fx.burst('heart', pl.x, pl.y - 40, 3, { up: 40, col: '#f36d86' });
  }, { bars: false, keepHud: true });
}

// ---------------------------------------------------------------- sleeping / new day
async function sleepFlow() {
  const early = G.state.time < 12 * 60;
  const pick = await ask(null, early ? 'Mới sáng mà… Ngủ đến sáng mai? (It\'s still early!) Sleep until tomorrow?' : 'Ngủ đến sáng mai? · Sleep until tomorrow?', ['Ngủ thôi · Sleep', 'Chưa · Not yet']);
  closeDialog();
  if (pick !== 0) return;
  await doSleep(false);
}
async function passOut() {
  if (G.runtime.sleeping || cs.active) return;
  await doSleep(true);
}
async function doSleep(passedOut) {
  if (G.runtime.sleeping) return;
  G.runtime.sleeping = true;
  closeService();
  const pl = G.player;
  try {
    await cs.run('sleep', async () => {
      G.runtime.inCutscene = true;
      if (passedOut) {
        pl.setEmo('sleepy', 3); pl.showEmote('zzz', 2); await wait(1.2);
        await fadeOut(1000, true);
        document.getElementById('caption').innerHTML = 'Bạn ngủ gục mất rồi…<small>You dozed off and someone walked you home.</small>';
        document.getElementById('caption').classList.add('on');
        await wait(1.8); document.getElementById('caption').classList.remove('on');
        setScene('house', 135, 170, 'down');
      } else {
        const bed = scenes.house.bedPos;
        await pl.walkTo([[70, 130], [bed.x + 30, bed.y + 34]], { speed: 70 });
        pl.x = bed.x; pl.y = bed.y; pl.face('down'); pl.visible = false; G.runtime.sleeper = { look: pl.look, seed: 1 };
        fx.float(bed.x - 10, bed.y - 40, 'z z z', '#7e8fc9', { life: 2.4, size: 8 });
        await camTo(bed.x + 20, bed.y - 10, { zoom: 1.35, rate: 2.2 });
        sfx('page');
        await wait(0.9);
        await fadeOut(1100, true);
      }
      const sum = endDay();
      saveLocal(); saveCloudNow();
      if (cloud.hasSession()) cloud.saveDailySummary(sum.day, sum).catch(() => {});
      setMood('day');
      await showSummary(sum);
      // morning in the bedroom
      pl.setAct(null); pl.setEmo('happy', 2); pl.emote = null; pl.visible = true; G.runtime.sleeper = null;
      const bed = scenes.house.bedPos;
      setScene('house', bed.x + 34, bed.y + 40, 'down');
      cam.snap(pl.x, pl.y - 18);
      await wait(0.3);
      await fadeIn(900);
      sfx('bell');
      pl.doHop(); pl.setAct('cheer'); await wait(0.9); pl.setAct(null);
      toast({ text: `Ngày ${G.state.day} · Chào buổi sáng!`, sub: specialLine(), icon: 'star', ms: 3600 });
    });
  } finally { G.runtime.inCutscene = false; G.runtime.sleeping = false; }
  await checkStory();
  await morningHooks();
  refreshQuest();
}
function specialLine() {
  const parts = [];
  for (const id of Object.keys(BUSINESSES)) { const z = bizOf(id); if (z.owned && z.special && (z.repair >= 1 || !BUSINESSES[id].repair)) parts.push(`${BUSINESSES[id].name}: ${RECIPES[z.special].vi}`); }
  return parts.length ? 'Món đặc biệt hôm nay · Today\'s specials — ' + parts.join(' · ') : 'A brand new day on the island.';
}

// ---------------------------------------------------------------- HUD buttons
$('bagBtn').addEventListener('click', () => { if (cs.active || isServiceOpen() || isPrepOpen()) return; sfx('ui'); openBag(); });
$('menuBtn').addEventListener('click', () => { if (cs.active || isServiceOpen() || isPrepOpen()) return; sfx('ui'); openMenu({ onLogout: logout }); });
$('questPill').addEventListener('click', () => { if (cs.active) return; const st = currentStep(); if (st?.text) toast({ text: 'Mục tiêu · Objective', sub: st.text(), icon: 'star', ms: 4000 }); });
$('repChip').addEventListener('click', () => toast({ text: `Danh tiếng: ${Math.floor(G.state.reputation)}`, sub: 'Reputation grows with every happy customer. More reputation, more visitors!', icon: 'star' }));
$('clockChip').addEventListener('click', () => toast({ text: `Ngày ${G.state.day}`, sub: 'Shops close at 22:00. Sleep in your bed to start a new day.', icon: 'sleep_moon' }));

async function logout() {
  saveLocal(); await saveCloudNow();
  await cloud.signOut();
  location.reload();
}

// pause audio when hidden (and time stops by itself)
document.addEventListener('visibilitychange', () => suspendAudio(document.hidden));

// Test hooks on localhost only.
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__jen = { G, scenes, cam, cs, setStep, checkStory, openBiz, bizRT, npcs, restRT, sleepFlow, doSleep, toggleBiz, discoverRecipe, triggerAction };

boot().catch(e => { console.error(e); $('bootMsg').textContent = 'Lỗi khởi động · Something went wrong. Please reload.'; });

// Offline support + "Add to Home Screen" (skip on localhost so tests always get fresh files).
if ('serviceWorker' in navigator && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) navigator.serviceWorker.register('./sw.js').catch(() => {});
