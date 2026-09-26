// JEN Island — boot, main loop and the glue between systems.

import { Renderer, cam, fx, lightingFor } from './world/render.js';
import { Island, areaAt, BUILDINGS } from './world/island.js';
import { buildInteriors } from './world/interiors.js';
import { buildRestaurant, updateRestaurant, initRestaurantRuntime, restRT, guestNeedingOrder, playerTakeOrder, playerServed, playerCookFailed, nextTicketForPlayer, ticketCooked, playerDeliver, collectRegister } from './systems/restaurant.js';
import { Player } from './systems/player.js';
import { Actor } from './world/actor.js';
import { initInput, input, moveVector, releaseJoystick } from './core/input.js';
import { unlockAudio, sfx, musicTick, setAudio, suspendAudio, setMood } from './core/audio.js';
import { G, T, setLang, defaultState, bizOf, markDirty, flag, setFlag, hasMats, canAfford } from './systems/state.js';
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
import { repairBridge } from './systems/story.js';
import { runArrival, runTour, refreshQuest, checkStory, setStep, repairScene, upgradeScene, buyScene, discoverRecipe, talkToMeo, updateMeo, morningHooks, restoreNightMarket, statueReady, buildStatue, currentStep } from './systems/story.js';
import { talkToResident, talkToMerchant, talkToStaff, talkToVisitor } from './systems/talk.js';
import { loadGame, saveLocal, saveCloudNow, tickSave, initSaveHooks, saveStatus } from './systems/save.js';
import * as cloud from './systems/cloud.js';
import { BUSINESSES, NIGHT_MARKET_RESTORE, STATUE_COST, RECIPES, MATERIALS, bizName, recipeName } from './data/game.js';
import { applyStaticText, bootText } from './ui/statictext.js';
import { MERCHANTS, RESIDENTS, playerLook } from './data/looks.js';
import { tapAnimals, react as reactAnimal } from './systems/animals.js';
import { nearestSeat, sitDown, standUp, updateSeat } from './systems/seats.js';
import { feedDucks, nearPond } from './systems/npc.js';
import { meoAntic } from './systems/fun.js';
import { GATES, gateText, gatePaid, addXP, seedLevel, tickCelebrations, readyMilestones } from './systems/progress.js';
import { BRIDGE_REPAIR } from './data/game.js';
import { ensureLatest, watchForUpdates } from './systems/version.js';
import { showWhatsNew } from './ui/whatsnew.js';
import { openBoutique, openWardrobe, currentLook, refreshPlayerLook } from './ui/clothes.js';
import { bus, dist, clamp, sleep, choice, money } from './core/util.js';
import { LIGHT } from './gfx/props.js';

const $ = id => document.getElementById(id);
const bootBar = $('bootBar'), bootMsg = $('bootMsg');
const progress = (k, m) => { bootBar.style.width = Math.round(k * 100) + '%'; if (m) bootMsg.textContent = m; };

G.runtime = { pause: 0, biz: {}, boatBoost: 0, timeScale: 1 };
G.markDirty = markDirty;

// ---------------------------------------------------------------- boot
async function boot() {
  applyStaticText();
  if (await ensureLatest()) return; // an update is live: reload once onto it
  progress(0.1, bootText('fonts'));
  try { await Promise.race([document.fonts.load('900 16px Nunito'), document.fonts.load('800 16px Nunito'), sleep(2500)]); } catch {}
  progress(0.3, bootText('build'));
  const renderer = new Renderer($('game'));
  G.renderer = renderer;
  initInput($('touch'), $('joyBase'), $('joyKnob'));
  input.onAction = () => { if (!dialogue.active) triggerAction(); };
  input.onTap = (cx, cy) => onWorldTap(cx, cy);
  window.addEventListener('resize', () => renderer.resize());
  window.visualViewport?.addEventListener('resize', () => renderer.resize());
  // one-time audio unlock on the first touch (iOS requirement)
  const unlock = () => { unlockAudio(); window.removeEventListener('pointerdown', unlock, true); };
  window.addEventListener('pointerdown', unlock, true);
  await sleep(10);
  scenes.island = new Island();
  progress(0.55, bootText('decor'));
  Object.assign(scenes, buildInteriors());
  scenes.restaurant = buildRestaurant();
  G.scenes = scenes;
  progress(0.7, bootText('meo'));
  // pre-warm the ground chunks near the dock
  scenes.island.cache.get(2, 6, Math.min(2.5, renderer.dpr * cam.baseZoom));
  initHud(); initSaveHooks();
  progress(0.85, bootText('net'));
  let user = null;
  const dev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('dev');
  if (dev) user = { id: 'dev-' + (new URLSearchParams(location.search).get('dev') || 'local'), email: 'dev@localhost', local: true };
  else user = await cloud.resume();
  progress(1, bootText('ready'));
  $('boot').classList.add('gone');
  if (!user) user = await showAuth();
  G.user = user;
  $('boot').classList.remove('gone'); progress(0.9, bootText('load'));
  G.state = await loadGame(user);
  seedLevel(G.state);
  if (dev && new URLSearchParams(location.search).has('fresh')) G.state = defaultState();
  $('boot').classList.add('gone');
  startGame();
}

function startGame() {
  const s = G.state;
  setAudio({ music: s.settings.music, sfx: s.settings.sfx });
  const look = currentLook(); // base look + clothes from the wardrobe
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
  watchForUpdates(toast);
  window.done = true;
  if (s.story.step === 'intro' || !s.player.name) { runArrival(); return; }
  if (s.story.step === 'tour') { setScene('island', 900, 2440, 'up'); showHud(true); runTour(); return; }
  // resume where we left off
  const pos = s.pos && scenes[s.pos.scene] ? s.pos : { scene: 'house', x: 135, y: 170 };
  let { x, y } = pos;
  if (!scenes[pos.scene].canStand(x, y, 5)) { const sc = scenes[pos.scene]; x = sc.spawn?.x ?? sc.entry?.x ?? 900; y = sc.entry?.y - 16 || 1700; }
  setScene(pos.scene, x, y, 'down');
  if (!flag('freeRoam')) setFlag('freeRoam');
  if (s.story.step === 'free' && !flag('keeper')) setStep('rest7'); // new chapters 8–10 for finished saves
  showHud(true);
  refreshQuest();
  resetArea();
  toast({ text: T(`Welcome back, ${s.player.name}!`, `Chào mừng trở lại, ${s.player.name}!`), sub: T(`${s.island.name} · Day ${s.day}`, `${s.island.name} · Ngày ${s.day}`), icon: 'heart' });
  setTimeout(() => showWhatsNew(), 1400);
}

function spawnMerchants() {
  for (const id of ['supermarket', 'materials', 'furniture', 'boutique']) {
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
  if (id.startsWith('home_')) { const rid = id.slice(5); const nm = RESIDENTS[rid]?.name || ''; showArea(T(`${nm}'s Home`, `Nhà ${nm}`), ''); } else showArea(T({ house: 'Your Home', supermarket: 'Cô Hoa\'s Supermarket', materials: 'Chú Bảy\'s Materials', furniture: 'Anh Khoa\'s Furniture', boutique: 'Cô Ba\'s Boutique', meo: 'Mèo Mây\'s Home', shed1: 'Your Drink Stand', shed2: 'Your Bánh Mì Shed', truck: 'Your Food Truck', restaurant: 'Your Restaurant' }[id] || '', { house: 'Nhà của bạn', supermarket: 'Siêu thị Cô Hoa', materials: 'Vật liệu Chú Bảy', furniture: 'Nội thất Anh Khoa', boutique: 'Tiệm Áo Cô Ba', meo: 'Nhà Mèo Mây', shed1: 'Quán Nước', shed2: 'Bánh Mì Góc Phố', truck: 'Xe Cuốn', restaurant: 'Nhà hàng' }[id] || ''), '');
  if (sc.merchant) { sc.merchant.face('down'); sc.merchant.setAct('wave'); sc.merchant.showEmote('happy', 1.4); setTimeout(() => sc.merchant.setAct(null), 1300); }
  if (id === 'meo' && !sc.actors.includes(G.meo)) setTimeout(() => toast({ text: T('Mèo Mây is out for a walk', 'Mèo Mây đang đi dạo'), sub: T('It\'s usually home for a nap at noon and at night.', 'Mèo Mây thường về nhà ngủ trưa và ngủ tối.'), icon: 'notebook' }), 400);
});
bus.on('leave', () => resetArea());
bus.on('lang', () => { applyStaticText(); refreshQuest(); resetArea(); });
bus.on('late', () => {
  for (const id of Object.keys(BUSINESSES)) if (bizOf(id).open) closeBiz(id, 'midnight');
  toast({ text: T('It\'s past midnight!', 'Đã quá nửa đêm!'), sub: T('Shops are closed. You\'re getting sleepy — sleep in your bed to start fresh.', 'Các quán đã đóng cửa. Bạn buồn ngủ rồi — về giường ngủ để bắt đầu ngày mới nhé.'), icon: 'sleep_moon', ms: 5000 });
});
bus.on('regular', c => toast({ text: T(`${c.name} is now a regular!`, `${c.name} đã thành khách quen!`), sub: '♥', icon: 'heart' }));
bus.on('ferry', n => { if (G.scene === scenes.island && flag('freeRoam') && !cs.active && G.state.story.chapter >= 2) toast({ text: T('The ferry has arrived', 'Tàu khách đã cập bến'), sub: T(`It brought ${n} visitor${n > 1 ? 's' : ''}!`, `Tàu chở ${n} du khách tới!`), icon: 'photo', ms: 2200 }); });
bus.on('achievement', () => { if (Math.random() < 0.5) setTimeout(() => toast({ text: 'Mèo Mây: “' + choice(T(['Wow! I\'m telling everyone!', 'My tail is doing the happy thing!', 'Hehe, I knew you could.', 'That deserves a nap. For me. In your honour.'], ['Oa! Mình sẽ kể cho cả đảo!', 'Đuôi mình đang vẫy vui lắm nè!', 'Hì hì, mình biết bạn làm được mà.', 'Chuyện này đáng một giấc ngủ trưa. Của mình. Để mừng bạn.'])) + '”', icon: 'heart', ms: 2400 }), 1400); });
bus.on('biz:open', id => { if (currentStep()) checkStory(); });
bus.on('biz:close', (id, why) => { if (why === 'hours') toast({ text: T(`${bizName(id)} is closed`, `${bizName(id)} đã đóng cửa`), sub: T('Closing time!', 'Hết giờ bán rồi!') }); });

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
  if (G.runtime.paused) { // frozen world: just keep drawing it under the pause card
    G.renderer.render(G.scene, t, { player: G.player, light: lightingFor(G.state.time, G.scene.kind !== 'island'), worldExtra: G.scene === scenes.island ? npcDrawables() : null, overlay: (c, tt) => drawSkyLife(c, tt) });
    return;
  }
  const gm = updateClock(dt);
  const pl = G.player, sc = G.scene;
  const busyUi = isUiOpen() || isServiceOpen() || isPrepOpen() || dialogue.active || isDecorating();
  if (!busyUi && !isTransitioning()) pl.drive(dt, sc, sfx); else if (!pl.path) pl.moving = Math.max(0, pl.moving - dt * 6);
  if (!busyUi && !cs.active) updateSeat(moveVector()[2]);
  updateFollow(dt);
  if (G.runtime.sleepy && !pl.act) { if (pl.emo !== 'sleepy') pl.setEmo('sleepy', 0); G.runtime.yawnT = (G.runtime.yawnT ?? 4) - dt; if (G.runtime.yawnT <= 0) { G.runtime.yawnT = 7 + Math.random() * 5; pl.showEmote('zzz', 2); } }
  else if (!G.runtime.sleepy && pl.emo === 'sleepy' && !G.runtime.sleeping) pl.setEmo('neutral', 0);
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
  tickCelebrations(() => !cs.active && !isUiOpen() && !isServiceOpen() && !isPrepOpen() && !dialogue.active && !isDecorating() && !G.runtime.paused);
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
  if (pl.seat) { setAction(T('Stand', 'Đứng dậy'), () => standUp(), 'sofa'); return; }
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
    if (g && !hasServer) { setAction(T('Take order', 'Nhận order'), () => takeRestaurantOrder(g), RECIPES[g.recipe].icon); return; }
  }
  // 2) talkable actors right in front of you
  const talk = nearestTalkable(sc, pl);
  if (talk && (!tr || tr.kind === 'door' || dist(talk.x, talk.y, pl.x, pl.y) < 22)) { setAction(T('Talk', 'Nói chuyện'), () => talkTo(talk), 'talk'); return; }
  if (tr) {
    if (tr.kind === 'door') return doorAction(tr);
    if (tr.kind === 'exit') { setAction(T('Leave', 'Ra ngoài'), () => exitBuilding(), 'door'); return; }
    if (tr.kind === 'front') return frontAction(tr);
    if (tr.kind === 'act') return actAction(tr);
  }
  // benches, chairs, stools, sofas, cushions
  const seat = nearestSeat(sc, pl.x, pl.y, 18);
  if (seat) { setAction(T('Sit', 'Ngồi'), () => sitDown(seat), 'sofa'); return; }
  // the lotus pond: feed the ducks
  if (sc === scenes.island && nearPond(pl.x, pl.y)) { setAction(T('Feed ducks', 'Cho vịt ăn'), () => feedDucks(), 'bread_split'); return; }
  // the Long Bridge repair spot
  if (sc === scenes.island && G.state.story.step === 'bridge' && dist(pl.x, pl.y, 1690, 1530) < 60) {
    G.runtime.materialNeed = () => ({ label: T('the Long Bridge', 'Cây Cầu Dài'), mats: BRIDGE_REPAIR.mats });
    setAction(T('Repair', 'Sửa cầu'), () => openRequirement({ title: T('Repair the Long Bridge', 'Sửa Cây Cầu Dài'), cost: BRIDGE_REPAIR.cost, mats: BRIDGE_REPAIR.mats, action: () => repairBridge(), actionLabel: T('Fix it!', 'Sửa thôi!'), note: T('Chú Bảy sells wood, metal and paint.', 'Chú Bảy có bán gỗ, tôn và sơn.') }), 'hammer'); return;
  }
  // statue pedestal
  if (sc === scenes.island && dist(pl.x, pl.y, 900, 1600) < 50 && G.state.story.step === 'destination') {
    setAction(T('Statue', 'Tượng đài'), () => statueSheet(), 'star'); return;
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
    else await say(a, T('Hello!', 'Xin chào!'));
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
      if (G.state.story.chapter < 4) return setAction(T('Look', 'Xem'), () => say(null, T('An old truck with a FOR SALE sign. Maybe later…', 'Một chiếc xe cũ có tấm bảng “BÁN”. Để sau vậy…')), 'talk');
      return setAction(T('Look', 'Xem'), () => say(null, T(`Locked. Mèo Mây has the keys (${gateText('truck')}).`, `Đang khóa. Mèo Mây giữ chìa khóa (${gateText('truck')}).`)), 'key');
    }
    if (b.biz === 'restaurant' && !z.owned) {
      if (G.state.story.chapter < 6) return setAction(T('Look', 'Xem'), () => say(null, T('The old restaurant on the hill. The windows are boarded up and a faded sign says “FOR SALE”.', 'Nhà hàng cũ trên đồi. Cửa sổ bị đóng ván, tấm bảng đã phai màu ghi “BÁN”.')), 'talk');
      return setAction(T('Look', 'Xem'), () => say(null, T(`Boarded up. Mèo Mây has the key (${gateText('restaurant')}).`, `Cửa đóng ván. Mèo Mây giữ chìa khóa (${gateText('restaurant')}).`)), 'key');
    }
    if (z.repair < 1) {
      if (!z.owned || !z.unlocked) return setAction(T('Look', 'Xem'), () => say(null, GATES[b.biz] && G.state.story.flags.ch3intro ? T(`Locked. Mèo Mây has the key (${gateText(b.biz)}).`, `Đang khóa. Mèo Mây giữ chìa khóa (${gateText(b.biz)}).`) : T('An old shed with a leaky roof. Mèo Mây might know who it belongs to.', 'Một căn chòi cũ, mái tôn thủng. Biết đâu Mèo Mây biết nó là của ai.')), 'talk');
      G.runtime.materialNeed = () => ({ label: bizName(b.biz), mats: def.repair });
      return setAction(T('Repair', 'Sửa'), () => openRequirement({ title: T(`Repair ${bizName(b.biz)}`, `Sửa ${bizName(b.biz)}`), mats: def.repair, action: () => repairScene(b.biz), actionLabel: T('Repair it!', 'Sửa ngay!'), note: b.biz === 'shed1' ? T('Wood for the walls, metal for the roof, paint to make it pretty.', 'Gỗ cho tường, tôn cho mái, sơn cho đẹp.') : '' }), 'hammer');
    }
  }
  setAction(T('Enter', 'Vào'), () => enterBuilding(tr), 'door');
}
function frontAction(tr) {
  const bizId = tr.biz, z = bizOf(bizId);
  if (bizId === 'night') {
    if (!G.state.nightMarket.restored) {
      if (G.state.story.step === 'restoreNM' && !gatePaid('night')) return setAction(T('Look', 'Xem'), () => say(null, T(`The market gate is locked. Mèo Mây has the key (${gateText('night')}).`, `Cổng chợ đang khóa. Mèo Mây giữ chìa khóa (${gateText('night')}).`)), 'key');
      if (G.state.story.step !== 'restoreNM') return setAction(T('Look', 'Xem'), () => say(null, T('An abandoned stall with torn lanterns.', 'Quầy hàng bỏ hoang, lồng đèn rách nát.')), 'talk');
      const r = NIGHT_MARKET_RESTORE;
      G.runtime.materialNeed = () => ({ label: T('the Night Market', 'Chợ Đêm'), mats: r.mats });
      return setAction(T('Restore', 'Khôi phục'), () => openRequirement({ title: T('Restore the Night Market', 'Khôi phục Chợ Đêm'), cost: r.cost, mats: r.mats, action: () => restoreNightMarket(), actionLabel: T('Light the lanterns!', 'Thắp đèn thôi!') }), 'lantern');
    }
    return setAction(T('Your stall', 'Sạp đêm'), () => stallSheet(), 'banh_trang_nuong');
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
  openSheet({ title: T('Your Night Stall', 'Sạp Đêm của bạn'), sub: T('Open 17:00–24:00', 'Mở cửa 17:00–24:00'), build: (body, api) => {
    const list = h('div', 'list'); body.appendChild(list);
    const row = (label, fn, cls = 'btn big') => { const b = btn(label, () => { api.close(true); fn(); }, cls); list.appendChild(b); };
    row(z.open ? T('Close the stall', 'Đóng sạp') : T('Open the stall', 'Mở sạp'), () => toggleBiz('night'), 'btn big ' + (z.open ? 'coral' : 'gold'));
    row(T('Serve', 'Bán hàng'), () => openService('night'), 'btn big pink');
    row(T('Prep', 'Sơ chế'), () => openPrep('night'), 'btn big ghost');
    row(T('Menu', 'Thực đơn'), () => openBizMenu('night'), 'btn big ghost');
  } });
}
function actAction(tr) {
  const sc = G.scene, bizId = bizIdOfScene(sc);
  const a = tr.action;
  const L = T(tr.en || tr.label || '', tr.label || '');
  const map = {
    sleep: () => sleepFlow(),
    look: () => say(null, T(tr.text[0], tr.text[1])),
    homeSnack: () => homeSnack(),
    'shop:ingredients': () => openIngredientShop(),
    'shop:materials': () => { const st = G.state.story.step; if (st === 'materials') G.runtime.materialNeed = () => ({ label: bizName('shed1'), mats: BUSINESSES.shed1.repair }); openMaterialShop(); },
    'shop:furniture': () => openFurnitureShop(),
    'shop:boutique': () => openBoutique(),
    wardrobe: () => openWardrobe(),
    serve: () => serveAtCounter(bizId),
    prep: () => openPrep(bizId),
    menu: () => openBizMenu(bizId, { onUpgrade: lv => upgradeScene(bizId, lv) }),
    recipeBook: () => openRecipeBook({ onDiscover: id => discoverRecipe(id) }),
    journal: () => openJournal(),
    collectRegister: () => { const k = collectRegister(); if (k) { toast({ text: T(`Collected ${k}k`, `Thu được ${k}k`), sub: T('The restaurant\'s takings', 'Tiền bán hàng của nhà hàng'), icon: 'coin' }); fx.float(G.player.x, G.player.y - 50, '+' + k + 'k', '#ffe07a'); } },
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
    id: 'rg', actor: g.actor, name: T('Table ', 'Bàn ') + (g.table.i + 1), key: 'rest', personality: g.personality, state: 'ordering',
    order: { recipe: g.recipe, opts: {}, price: g.price, special: bizOf('restaurant').special === g.recipe },
    get patienceRatio() { return clamp(g.patience / g.patienceMax, 0, 1); },
    gone: () => g.state === 'leaving' || g.state === 'gone',
    onResult,
  };
}
function toggleBiz(bizId) {
  const z = bizOf(bizId);
  if (z.open) { closeBiz(bizId); sfx('back'); toast({ text: T(`${bizName(bizId)} is closed`, `${bizName(bizId)} đã đóng cửa`) }); return; }
  const r = openBiz(bizId);
  if (!r.ok) { toast({ text: r.why.split('\n')[0], sub: r.why.split('\n')[1] || '', bad: true, ms: 3400 }); return; }
  toast({ text: T(`${bizName(bizId)} is open!`, `${bizName(bizId)} mở cửa!`), sub: T('Customers are on the way', 'Khách đang tới'), icon: 'sign_open' });
  fx.burst('spark', G.player.x, G.player.y - 40, 10, { up: 40, col: '#ffd35a' });
}
function updateBizButton() {
  const sc = G.scene;
  if (!sc || cs.active || isUiOpen() || isServiceOpen() || isPrepOpen() || dialogue.active || isDecorating()) { setBizButton(null, null); return; }
  const bizId = bizIdOfScene(sc);
  if (bizId) {
    const z = bizOf(bizId);
    if (z.owned && z.repair >= 1) { setBizButton(z.open ? T('Close', 'Đóng cửa') : T('OPEN', 'MỞ CỬA'), () => toggleBiz(bizId), z.open); return; }
  }
  if (sc.id === 'house') { setBizButton(T('Decorate', 'Trang trí'), () => startDecorate()); return; }
  setBizButton(null, null);
}
function statueSheet() {
  const c = STATUE_COST;
  if (!statueReady()) { say('meo', T('Not yet! We need 300 reputation and at least one fully upgraded shop. Then we build the statue!', 'Chưa được đâu! Cần 300 danh tiếng và ít nhất một quán nâng cấp tối đa. Rồi mình dựng tượng!')); return; }
  openRequirement({ title: T('The Founder Statue', 'Tượng Người Sáng Lập'), cost: c.cost, mats: c.mats, action: () => buildStatue(), actionLabel: T('Unveil it!', 'Khánh thành!'), who: 'meo' });
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
  const pick = await ask(null, early ? T('It\'s still early… Sleep until tomorrow?', 'Mới sáng mà… Ngủ đến sáng mai?') : T('Sleep until tomorrow?', 'Ngủ đến sáng mai?'), [T('Sleep', 'Ngủ thôi'), T('Not yet', 'Chưa')]);
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
        document.getElementById('caption').innerHTML = T('You dozed off…', 'Bạn ngủ gục mất rồi…');
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
      toast({ text: T(`Day ${G.state.day} · Good morning!`, `Ngày ${G.state.day} · Chào buổi sáng!`), sub: specialLine(), icon: 'star', ms: 3600 });
    });
  } finally { G.runtime.inCutscene = false; G.runtime.sleeping = false; }
  await checkStory();
  await morningHooks();
  refreshQuest();
}
function specialLine() {
  const parts = [];
  for (const id of Object.keys(BUSINESSES)) { const z = bizOf(id); if (z.owned && z.special && (z.repair >= 1 || !BUSINESSES[id].repair)) parts.push(`${bizName(id)}: ${recipeName(z.special)}`); }
  return parts.length ? T('Today\'s specials — ', 'Món đặc biệt hôm nay — ') + parts.join(' · ') : T('A brand new day on the island.', 'Một ngày mới trên đảo.');
}

// ---------------------------------------------------------------- HUD buttons
$('bagBtn').addEventListener('click', () => { if (cs.active || isServiceOpen() || isPrepOpen()) return; sfx('ui'); openBag(); });
$('mapBtn').addEventListener('click', () => { if (cs.active || isServiceOpen() || isPrepOpen()) return; sfx('ui'); openMenu({ onLogout: logout }); });
$('menuBtn').addEventListener('click', () => { if (cs.active || isServiceOpen() || isPrepOpen()) return; sfx('ui'); openMenu({ onLogout: logout }); });
$('questPill').addEventListener('click', () => { if (cs.active) return; const st = currentStep(); if (st?.text) toast({ text: T('Objective', 'Mục tiêu'), sub: st.text(), icon: 'star', ms: 4000 }); });
$('repChip').addEventListener('click', () => { const s = G.state, need = Math.round(90 * Math.pow(s.level || 1, 1.5)); toast({ text: T(`Level ${s.level || 1} · ${Math.floor(s.xp || 0)}/${need} XP`, `Cấp ${s.level || 1} · ${Math.floor(s.xp || 0)}/${need} KN`), sub: T(`Reputation ${Math.floor(s.reputation)}. Serve customers, repair and upgrade to level up!`, `Danh tiếng ${Math.floor(s.reputation)}. Phục vụ khách, sửa và nâng cấp quán để lên cấp!`), icon: 'trophy' }); });
$('clockChip').addEventListener('click', () => toast({ text: T(`Day ${G.state.day}`, `Ngày ${G.state.day}`), sub: T('Shops close at midnight. Sleep in your bed to start a new day.', 'Các quán đóng cửa lúc nửa đêm. Ngủ trên giường để sang ngày mới.'), icon: 'sleep_moon' }));

// tapping animals on the island makes them squeak, hop and show hearts
function onWorldTap(cx, cy) {
  if (G.scene !== scenes.island || cs.active || isUiOpen() || dialogue.active) return;
  const r = $('game').getBoundingClientRect();
  const [wx, wy] = G.renderer.toWorld(cx - r.left, cy - r.top);
  if (tapAnimals(wx, wy)) return;
  for (const d of npcs.ducks || []) if (dist(d.x, d.y - 6, wx, wy) < 18) { reactAnimal(d, 'duck'); return; }
  const m = G.meo;
  if (m && scenes.island.actors.includes(m) && !m.data.busy && dist(m.x, m.y - 16, wx, wy) < 22) { if (m.act === 'sleep') { m.setAct(null); m.data.napping = false; } sfx('meow'); m.doHop(90); m.showEmote('heart', 1.4); if (!m.act) meoAntic(m); }
}
bus.on('xp:add', n => addXP(n));
bus.on('scene', () => { const pl = G.player; if (pl?.seat) { pl.seat = null; pl.sit = false; pl.seatH = undefined; pl.control = true; } });

// ---------------------------------------------------------------- visiting neighbours
// The owner is sometimes home to greet you; at night they're asleep in bed.
const HOST_HI = [['Oh! Come in, come in! Mind the shoes.', 'Ơ! Vào đi, vào đi! Coi chừng mấy đôi dép.'], ['A visitor! Let me hide the mess… too late.', 'Có khách! Để tui dọn… trễ rồi.'], ['Welcome! Sit anywhere. Except on the cat. There is no cat. Sit anywhere.', 'Chào mừng! Ngồi đâu cũng được. Trừ chỗ con mèo. Không có mèo. Ngồi đâu cũng được.'], ['You came to visit me? That makes my day!', 'Bạn tới thăm mình hả? Vui quá trời!']];
bus.on('enter', id => {
  if (!id.startsWith('home_')) return;
  const sc = scenes[id], rid = sc.owner, a = npcs.residents.find(r => r.data.rid === rid);
  sc.bedSleeper = null;
  if (!a) return;
  const name = a.name;
  if (a.data.state === 'home') { sc.bedSleeper = { look: a.look, seed: 1 }; setTimeout(() => toast({ text: T(`Shh… ${name} is asleep.`, `Suỵt… ${name} đang ngủ.`), sub: T('Tiptoe!', 'Đi nhẹ thôi!'), icon: 'zzz' }), 500); return; }
  if (a.data.state === 'busy' || a.data.state === 'going-home') return;
  if (Math.random() < 0.7) {
    scenes.island.remove(a); sc.add(a); a.stop(); a.sit = false; a.setAct(null);
    a.x = sc.host.x; a.y = sc.host.y; a.visible = true; delete a.alpha; a.fadeIn = false;
    a.data.state = 'busy'; a.data.hosting = id; a.face('down');
    setTimeout(() => { if (G.scene === sc && !cs.active) { a.setAct('wave'); a.showEmote('happy', 1.4); say(a, T(...choice(HOST_HI))).then(() => a.setAct(null)); } }, 650);
  } else setTimeout(() => toast({ text: T(`${name} is out right now.`, `${name} đang đi vắng.`), sub: T('Doors are always open on this island.', 'Trên đảo này cửa lúc nào cũng mở.'), icon: 'door' }), 500);
});
bus.on('leave', id => {
  if (!id.startsWith('home_')) return;
  const sc = scenes[id];
  for (const a of [...sc.actors]) if (a.data?.hosting === id) {
    sc.remove(a); scenes.island.add(a);
    const b = scenes.island.buildings[sc.building];
    a.x = b.x + 18; a.y = b.y + 22; a.data.state = 'idle'; a.data.until = G.state.time + 5; a.data.hosting = null;
  }
});

// progression hooks
bus.on('sfx', k => sfx(k));
bus.on('recipe', () => addXP(30, 'recipe'));
bus.on('achievement', () => addXP(40, 'achievement'));
let msSeen = 0;
bus.on('xp', () => { const n = readyMilestones(); if (n > msSeen) toast({ text: T('Milestone reached!', 'Đạt cột mốc mới!'), sub: T('Claim your reward in Menu → Milestones', 'Nhận thưởng ở Menu → Cột mốc'), icon: 'trophy', ms: 3200 }); msSeen = n; });

// ---------------------------------------------------------------- pause
function setPaused(on) {
  if (!!G.runtime.paused === on) return;
  G.runtime.paused = on;
  document.getElementById('pauseCard')?.remove();
  if (!on) { sfx('ui'); return; }
  releaseJoystick();
  sfx('page');
  const el = document.createElement('div'); el.id = 'pauseCard'; el.className = 'pause-card';
  el.innerHTML = `<div class="pc-in"><div class="pc-cat"></div><h2>${T('Paused', 'Tạm dừng')}</h2><p>${T('Mèo Mây is taking a little nap too.', 'Mèo Mây cũng đang chợp mắt.')}</p><button class="btn big pink" type="button" data-a="go">${T('Resume', 'Tiếp tục')}</button><button class="btn ghost" type="button" data-a="menu">${T('Settings', 'Cài đặt')}</button></div>`;
  el.addEventListener('click', e => {
    const a = e.target.closest('button')?.dataset.a;
    if (a === 'go') setPaused(false);
    else if (a === 'menu') { setPaused(false); openMenu({ onLogout: logout }); }
  });
  document.getElementById('app').appendChild(el);
}
$('pauseBtn').addEventListener('click', () => { if (cs.active || isServiceOpen() || isPrepOpen() || isUiOpen()) return; setPaused(true); });
window.addEventListener('keydown', e => { if ((e.key === 'p' || e.key === 'Escape') && G.runtime.paused) setPaused(false); else if (e.key === 'p' && !cs.active && !isUiOpen()) setPaused(true); });

async function logout() {
  saveLocal(); await saveCloudNow();
  await cloud.signOut();
  location.reload();
}

// pause audio when hidden (and time stops by itself)
document.addEventListener('visibilitychange', () => suspendAudio(document.hidden));

// Test hooks on localhost only.
if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__jen = { G, scenes, cam, cs, setStep, checkStory, openBiz, bizRT, npcs, restRT, sleepFlow, doSleep, toggleBiz, discoverRecipe, triggerAction };

boot().catch(e => { console.error(e); $('bootMsg').textContent = bootText('err'); });

// Offline support + "Add to Home Screen" (skip on localhost so tests always get fresh files).
if ('serviceWorker' in navigator && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) navigator.serviceWorker.register('./sw.js').catch(() => {});
