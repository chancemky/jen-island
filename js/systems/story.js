// Story: seven chapters with Mèo Mây at the heart of every one.
// Each chapter is a list of steps; every step has an objective line for the
// quest pill, a pointer target, a completion test, and optionally a cutscene
// that plays when it completes. Progress is saved after every step, and every
// cutscene can be safely re-entered after a reload.

import { G, flag, setFlag, hasMats, spendMats, addMoney, canAfford, learnRecipe, unlockAchievement, markDirty, bizOf, pantry, mats, addRep } from './state.js';
import { BUSINESSES, RECIPES, CHAPTERS, NIGHT_MARKET_RESTORE, STATUE_COST, STATION } from '../data/game.js';
import { cs, wait, say, ask, camTo, camFollow, walk, face, emote, hop, startFollow, stopFollow, caption } from './cutscene.js';
import { scenes, setScene, fadeOut, fadeIn } from './scenes.js';
import { cam, fx } from '../world/render.js';
import { setQuest, toast, showHud } from '../ui/hud.js';
import { showReward } from '../ui/sheets.js';
import { askText, chooseLook } from '../ui/naming.js';
import { playerLook, RESIDENTS, MERCHANTS } from '../data/looks.js';
import { Actor } from '../world/actor.js';
import { sfx, setMood } from '../core/audio.js';
import { bus, rand, choice, dist, sleep, clamp } from '../core/util.js';
import { rt as bizRT, bizRecipes } from './business.js';
import { availableRecipes } from '../ui/shops.js';
import { npcs } from './npc.js';
import { playCinematic, drawBoatTop } from './cinematic.js';
import * as cloud from './cloud.js';

const S = () => G.state.story;
const island = () => scenes.island;
const B = id => island().buildings[id];
const doorOf = id => { const b = B(id); return { scene: 'island', x: b.x + (b.door?.[0] || 0), y: b.y }; };
const frontOf = id => { const b = B(id); return { scene: 'island', x: b.x - 14, y: b.y + 26 }; };

// ---------------------------------------------------------------- steps
// count(n): how many customers served since this step began
const since = key => G.state.stats.served - (S().flags['served@' + key] ?? G.state.stats.served);
const bizServedSince = (biz, key) => (bizOf(biz).stats.served) - (S().flags['bs@' + key] ?? bizOf(biz).stats.served);

export const STEPS = {
  // ---- Chapter 1
  tour: { ch: 1 },
  materials: { ch: 1, text: () => { const r = BUSINESSES.shed1.repair; return `Mua ${r.wood} gỗ, ${r.metal} tôn, ${r.paint} sơn ở Vật liệu Chú Bảy (${mats('wood')}/${r.wood} · ${mats('metal')}/${r.metal} · ${mats('paint')}/${r.paint})`; }, target: () => G.scene?.id === 'materials' ? null : doorOf('materials'), done: () => hasMats(BUSINESSES.shed1.repair) || bizOf('shed1').repair >= 1, next: 'repair' },
  repair: { ch: 1, text: () => 'Sửa quán nhỏ ở bãi biển · Repair the beach shed', target: () => frontOf('shed1'), done: () => bizOf('shed1').repair >= 1, next: 'ingredients', scene: () => afterFirstRepair() },
  // ---- Chapter 2
  ingredients: { ch: 2, text: () => { const need = ['tea', 'kumquat', 'sugar', 'ice'].filter(k => !hasStockFor(k)); return need.length ? `Mua nguyên liệu trà tắc ở Siêu thị Cô Hoa (còn thiếu: ${need.map(k => ({ tea: 'trà', kumquat: 'tắc', sugar: 'đường', ice: 'đá' })[k]).join(', ')})` : 'Đủ nguyên liệu rồi!'; }, target: () => G.scene?.id === 'supermarket' ? null : doorOf('supermarket'), done: () => ['tea', 'kumquat', 'sugar', 'ice'].every(hasStockFor), next: 'prep' },
  prep: { ch: 2, text: () => 'Sơ chế tắc ở bàn sơ chế trong quán · Slice kumquats at the shed', target: () => G.scene?.id === 'shed1' ? { scene: 'shed1', x: 194, y: 108 } : doorOf('shed1'), done: () => (bizOf('shed1').prepped.kumquat_cut || 0) > 0 || flag('firstServed3'), next: 'open' },
  open: { ch: 2, text: () => 'Mở cửa quán! · Press OPEN to start serving', target: () => G.scene?.id === 'shed1' ? null : doorOf('shed1'), done: () => bizOf('shed1').open || flag('firstServed3'), next: 'serve' },
  serve: { ch: 2, text: () => `Phục vụ khách đầu tiên (${Math.min(3, since('serve'))}/3) · Serve customers at the counter`, target: () => G.scene?.id === 'shed1' ? { scene: 'shed1', x: 80, y: 128 } : doorOf('shed1'), done: () => since('serve') >= 3, next: 'sleep', scene: () => afterFirstCustomers() },
  sleep: { ch: 2, text: () => G.state.time < 17 * 60 ? 'Bán thêm, rồi về nhà ngủ · Keep selling, then sleep at home' : 'Về nhà và đi ngủ · Go home and sleep', target: () => G.scene?.id === 'house' ? { scene: 'house', x: 48, y: 124 } : doorOf('house'), done: () => G.state.day >= 2, next: 'grow' },
  // ---- Chapter 3
  grow: { ch: 3, text: () => `Tiếng lành đồn xa: phục vụ ${Math.min(12, since('grow'))}/12 khách · danh tiếng ${Math.floor(G.state.reputation)}/20`, target: () => G.scene?.id === 'shed1' ? null : doorOf('shed1'), done: () => since('grow') >= 12 && G.state.reputation >= 20, next: 'repair2', scene: () => introShed2() },
  repair2: { ch: 3, text: () => { const r = BUSINESSES.shed2.repair; return `Sửa quán Bánh Mì ở Xóm Tây (gỗ ${mats('wood')}/${r.wood} · tôn ${mats('metal')}/${r.metal} · sơn ${mats('paint')}/${r.paint})`; }, target: () => frontOf('shed2'), done: () => bizOf('shed2').repair >= 1, next: 'banhmi', scene: () => afterShed2() },
  banhmi: { ch: 3, text: () => `Bán ${Math.min(5, bizServedSince('shed2', 'banhmi'))}/5 ổ bánh mì · Sell bánh mì`, target: () => G.scene?.id === 'shed2' ? null : doorOf('shed2'), done: () => bizServedSince('shed2', 'banhmi') >= 5, next: 'truck', scene: () => chapter4Intro() },
  // ---- Chapter 4
  truck: { ch: 4, text: () => `Mua xe cuốn ở bãi biển phía đông (${Math.floor(G.state.money)}/${BUSINESSES.truck.buy}k)`, target: () => frontOf('truck'), done: () => bizOf('truck').owned, next: 'truckServe', scene: () => afterTruck() },
  truckServe: { ch: 4, text: () => `Bán ${Math.min(6, bizServedSince('truck', 'truckServe'))}/6 phần ở xe cuốn · danh tiếng ${Math.floor(G.state.reputation)}/60`, target: () => G.scene?.id === 'truck' ? null : doorOf('truck'), done: () => bizServedSince('truck', 'truckServe') >= 6 && G.state.reputation >= 60, next: 'nightIntro', scene: () => chapter5Intro() },
  // ---- Chapter 5
  nightIntro: { ch: 5 },
  restoreNM: { ch: 5, text: () => { const r = NIGHT_MARKET_RESTORE; return `Khôi phục Chợ Đêm: ${r.cost}k, gỗ ${mats('wood')}/${r.mats.wood}, tôn ${mats('metal')}/${r.mats.metal}, sơn ${mats('paint')}/${r.mats.paint}, lồng đèn ${mats('lantern')}/${r.mats.lantern}, dây đèn ${mats('cable')}/${r.mats.cable}`; }, target: () => ({ scene: 'island', x: 430, y: 780 }), done: () => G.state.nightMarket.restored, next: 'nightServe' },
  nightServe: { ch: 5, text: () => `Bán ${Math.min(8, bizServedSince('night', 'nightServe'))}/8 món ở Sạp Đêm (mở 17:00–24:00)`, target: () => ({ scene: 'island', x: 520, y: 700 }), done: () => bizServedSince('night', 'nightServe') >= 8, next: 'restoIntro', scene: () => chapter6Intro() },
  // ---- Chapter 6
  restoIntro: { ch: 6 },
  buyResto: { ch: 6, text: () => `Mua nhà hàng trên đồi (${Math.floor(G.state.money)}/${BUSINESSES.restaurant.buy}k)`, target: () => frontOf('restaurant'), done: () => bizOf('restaurant').owned, next: 'repairResto' },
  repairResto: { ch: 6, text: () => { const r = BUSINESSES.restaurant.repair; return `Sửa nhà hàng: gỗ ${mats('wood')}/${r.wood}, tôn ${mats('metal')}/${r.metal}, sơn ${mats('paint')}/${r.paint}, ngói ${mats('tile')}/${r.tile}`; }, target: () => frontOf('restaurant'), done: () => bizOf('restaurant').repair >= 1, next: 'hire', scene: () => grandOpening() },
  hire: { ch: 6, text: () => 'Thuê nhân viên đầu tiên ở bảng Nhân viên trong nhà hàng · Hire your first employee', target: () => G.scene?.id === 'restaurant' ? { scene: 'restaurant', x: 356, y: 330 } : doorOf('restaurant'), done: () => bizOf('restaurant').employees.length > 0, next: 'restoServe' },
  restoServe: { ch: 6, text: () => `Phục vụ ${Math.min(12, bizServedSince('restaurant', 'restoServe'))}/12 khách ở nhà hàng`, target: () => G.scene?.id === 'restaurant' ? null : doorOf('restaurant'), done: () => bizServedSince('restaurant', 'restoServe') >= 12, next: 'team' },
  team: { ch: 6, text: () => 'Thuê đủ đầu bếp + phục vụ để nhà hàng tự vận hành · Hire a cook and a server', target: () => G.scene?.id === 'restaurant' ? { scene: 'restaurant', x: 356, y: 330 } : doorOf('restaurant'), done: () => { const roles = new Set(bizOf('restaurant').employees.map(e => e.role)); return roles.has('cook') && roles.has('server'); }, next: 'destination', scene: () => chapter7Intro() },
  // ---- Chapter 7
  destination: { ch: 7, text: () => { const lv3 = Object.values(G.state.biz).some(b => b.level >= 3); return `Điểm đến: danh tiếng ${Math.floor(G.state.reputation)}/300 · 1 quán cấp 3 ${lv3 ? '✓' : '✗'} · rồi dựng tượng ở Quảng Trường`; }, target: () => ({ scene: 'island', x: 900, y: 1600 }), done: () => G.state.statue, next: 'free', scene: () => finale() },
  free: { ch: 7, text: () => freeText(), target: () => null, done: () => false },
};
function freeText() {
  const av = availableRecipes();
  if (av.length) return 'Mèo Mây có công thức mới! Ghé nhà Mèo Mây · New recipe waiting';
  const up = Object.entries(G.state.biz).find(([id, b]) => b.owned && b.level < 3 && BUSINESSES[id].upgrades);
  if (up) return `Nâng cấp ${BUSINESSES[up[0]].name} · Keep growing your island`;
  return `Ngày ${G.state.day}: đảo ${G.state.island.name} đang rộn ràng!`;
}
function hasStockFor(k) {
  if (pantry(k) > 0) return true;
  if (k === 'kumquat') return (bizOf('shed1').prepped.kumquat_cut || 0) > 0;
  return false;
}

// ---------------------------------------------------------------- engine
let checking = false;
export function currentStep() { return STEPS[S().step]; }
export function setStep(id) {
  const st = S();
  st.step = id;
  st.flags['served@' + id] = G.state.stats.served;
  const bizFor = { banhmi: 'shed2', truckServe: 'truck', nightServe: 'night', restoServe: 'restaurant' }[id];
  if (bizFor) st.flags['bs@' + id] = bizOf(bizFor).stats.served;
  const ch = STEPS[id]?.ch;
  if (ch && ch > st.chapter) st.chapter = ch;
  markDirty(true);
  refreshQuest();
}
export function refreshQuest() {
  const st = currentStep();
  if (!st || !st.text || !flag('freeRoam')) { setQuest(null); return; }
  setQuest(st.text(), () => st.target?.());
}
export async function checkStory() {
  if (checking || cs.active || !flag('freeRoam')) return;
  const st = currentStep();
  if (!st?.done) return;
  if (!st.done()) { refreshQuest(); return; }
  checking = true;
  try {
    const next = st.next;
    if (st.scene) { await st.scene(); }
    if (next && S().step !== next && STEPS[S().step] === st) setStep(next);
  } finally { checking = false; }
}

// ---------------------------------------------------------------- Mèo Mây helpers
export function meo() { return G.meo; }
function placeMeo(sceneId, x, y) {
  const m = G.meo;
  const cur = Object.values(scenes).find(sc => sc.actors.includes(m));
  if (cur && cur.id !== sceneId) cur.remove(m);
  scenes[sceneId].add(m);
  m.x = x; m.y = y; m.visible = true; m.stop(); m.sit = false; m.setAct(null); m.data.home = false;
}
// Bring Mèo Mây to the player: it comes running from off-screen.
async function summonMeo(offset = 34) {
  const m = G.meo, pl = G.player, sc = G.scene;
  m.data.busy = true;
  if (!sc.actors.includes(m) || dist(m.x, m.y, pl.x, pl.y) > 360) {
    if (sc.kind === 'island') {
      const nodes = sc.nav.nodes.filter(n => { const d = dist(n.x, n.y, pl.x, pl.y); return d > 200 && d < 300; });
      const n = nodes.length ? choice(nodes) : sc.nav.nearest(pl.x + 200, pl.y);
      placeMeo(sc.id, n.x, n.y);
    } else placeMeo(sc.id, sc.door.x, sc.h + 8);
  }
  emote(m, '!');
  const tx = pl.x + (pl.x > (sc.w / 2) ? -offset : offset), ty = pl.y + 6;
  if (sc.kind === 'island') await walk(m, tx, ty, { speed: 105 }); else await m.walkTo(sc.grid ? sc.grid.path(m.x, m.y, tx, ty) : [[sc.door.x, sc.h - 20], [tx, ty]], { speed: 90 });
  face(m, pl); face(pl, m);
}
function releaseMeo(to = 'plaza') {
  const m = G.meo;
  m.data.busy = false; m.data.until = 0; m.data.goal = to;
}
function titleCard(n) {
  const ch = CHAPTERS[n];
  caption(`Chương ${n}: ${ch.vi}`, ch.title);
  sfx('bell');
  return wait(2.4).then(() => caption(null));
}

// ---------------------------------------------------------------- Chapter 1: arrival
export async function runArrival() {
  const pl = G.player, sc = island();
  G.runtime.introBoat = true;
  G.runtime.inCutscene = true;
  showHud(false);
  document.body.classList.add('hide-controls', 'cutscene');
  // 1) the crossing
  const skip = { skip: false };
  const skipBtn = document.getElementById('skipBtn'), cinema = document.getElementById('cinema');
  cinema.classList.remove('hidden'); requestAnimationFrame(() => cinema.classList.add('on'));
  skipBtn.classList.remove('hidden');
  skipBtn.onclick = () => { skip.skip = true; sfx('ui'); };
  G.runtime.cinematic = true;
  await playCinematic(document.getElementById('game'), { onCaption: (a, b) => caption(a, b), skipSignal: skip });
  caption(null);
  skipBtn.classList.add('hidden');
  G.runtime.cinematic = false;
  // 2) docking, top-down
  setScene('island', 1004, 2584, 'up');
  pl.visible = false;
  const f = npcs.ferry;
  f.state = 'arriving'; f.x = 1004; f.y = 2860; f.speed = 80;
  cam.override = { x: 960, y: 2700, zoom: 1.05, rate: 2 };
  document.getElementById('fade').classList.remove('on');
  const m = G.meo;
  placeMeo('island', 900, 2372); m.face('down');
  await cs.run('arrival', async () => {
    G.runtime.inCutscene = true;
    cam.override = { x: 970, y: 2700, zoom: 1.05, rate: 1.4 };
    while (f.state !== 'docked') { cam.override.y = Math.max(2560, f.y - 40); await sleep(30); }
    sfx('horn');
    await wait(0.5);
    // hop off the boat onto the pier
    pl.x = 990; pl.y = 2582; pl.visible = true; pl.face('left');
    pl.doHop(120); await wait(0.1);
    await pl.walkTo([[958, 2583]], { speed: 90 });
    fx.burst('dust', pl.x, pl.y, 6, { up: 20, speed: 30 });
    await wait(0.3);
    pl.face('up');
    await camTo(930, 2530, { zoom: 1.1, rate: 2.2 });
    // Mèo Mây spots the newcomer and comes trotting down the pier
    emote(m, '!'); m.doHop(); sfx('meow');
    await wait(0.6);
    await m.walkTo([[900, 2450], [900, 2560], [930, 2580]], { speed: 78 });
    face(m, pl); face(pl, m); pl.setEmo('surprised', 1.4); emote(pl, '?');
    await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.35, rate: 2.5 });
    m.tiltTarget = 0.18;
    await say('meo', 'Ơ! Một người mới! A new face on the island!', { emo: 'surprised' });
    m.tiltTarget = 0; await hop(m, 2);
    await say('meo', 'Chào bạn, chào bạn! Welcome! I\'m *Mèo Mây* — the island\'s official greeter, lantern-counter and nap expert.', { emo: 'happy' });
    await say('meo', 'Hmm… you don\'t look like a fisherman. And you\'re definitely not a tourist — you packed way too much.', { tilt: 0.15 });
    m.tiltTarget = 0.2;
    await say('meo', 'What should I call you?');
    m.tiltTarget = 0;
    const name = await askText({ title: 'Bạn tên gì?', sub: 'What\'s your name?', placeholder: 'Tên của bạn', max: 14 });
    G.state.player.name = name;
    pl.name = name;
    await say('meo', `*${name}*! What a lovely name. Let me get a good look at you…`, { emo: 'happy' });
    const look = await chooseLook(G.state.player.lookOpt || {});
    G.state.player.lookOpt = look; G.state.player.look = playerLook(look); pl.look = G.state.player.look;
    pl.doHop(); fx.burst('spark', pl.x, pl.y - 30, 8, { up: 40, col: '#ffd35a' }); sfx('sparkle');
    await say('meo', 'Perfect. Very island-chic.', { emo: 'happy' });
    await say('meo', 'Now… this island has had a lot of names. The old folks just call it "the island". That\'s a little sad, isn\'t it?', { emo: 'sad' });
    m.tiltTarget = 0.2;
    await say('meo', 'Since you\'re staying, would you give it a name?');
    m.tiltTarget = 0;
    const isl = await askText({ title: 'Đặt tên cho hòn đảo', sub: 'Name your island', placeholder: 'Đảo …', max: 16, value: 'Đảo Mây' });
    G.state.island.name = isl;
    markDirty(true);
    cloud.hasSession() && cloud.saveProfile(name, isl).catch(() => {});
    await camTo(900, 2370, { zoom: 1.1, rate: 2, hold: 0.5 });
    sfx('sparkle'); fx.burst('confetti', 900, 2330, 24, { up: 90, speed: 70, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 60, life: 1.6 });
    await say('meo', `*${isl}*… Hehe. The welcome gate already likes it.`, { emo: 'happy' });
    await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.25 });
    await say('meo', 'Okay! Follow me — I\'ll show you around. Stay close, the gulls here steal hats.', { emo: 'happy', act: 'point' });
    S().step = 'tour'; markDirty(true);
  });
  G.runtime.introBoat = false;
  f.state = 'docked'; f.dockUntil = G.state.time + 5;
  await runTour();
}

export async function runTour() {
  const pl = G.player, m = G.meo, sc = island();
  if (G.scene !== sc) setScene('island', 900, 2420, 'up');
  if (!sc.actors.includes(m) || dist(m.x, m.y, pl.x, pl.y) > 80) placeMeo('island', pl.x + 26, pl.y - 6);
  S().step = 'tour';
  G.runtime.inCutscene = true;
  await cs.run('tour', async () => {
    showHud(true);
    document.body.classList.add('hide-controls');
    camFollow(pl, 1.1);
    startFollow(m, 30);
    m.data.busy = true;
    // down the pier, under the gate, west along the beach to the shed
    await walk(m, 900, 2330, { speed: 72 });
    await walk(m, 640, 2242, { speed: 72 });
    await walk(m, 604, 2240, { speed: 60 });
    stopFollow();
    await pl.walkTo([[574, 2250]], { speed: 60 });
    face(m, { x: 600, y: 2150 }); face(pl, { x: 600, y: 2150 });
    await camTo(600, 2160, { zoom: 1.28, rate: 2.4 });
    await say('meo', 'This little shed doesn\'t look like much right now…', { emo: 'sad' });
    // Mèo Mây looks up at the broken roof
    m.lookY = -1; m.tiltTarget = -0.22;
    await camTo(600, 2120, { zoom: 1.34, rate: 2 });
    await wait(0.6);
    await say('meo', 'But sometimes all a place needs is someone willing to believe in it.');
    await wait(0.8);
    m.tiltTarget = 0.2; m.lookY = 0; face(m, pl);
    await say('meo', 'And, uh… about *12 pieces of wood*.', { tilt: 0.2 });
    m.tiltTarget = 0;
    await say('meo', 'It was Bà Tư\'s tea stand once. If you fix it up, it can be your very first business. Chú Bảy\'s material shop on Market Street sells wood, metal and paint.', { emo: 'happy' });
    await say('meo', 'But first — your house! This way!', { emo: 'happy' });
    camFollow(pl, 1.05);
    startFollow(m, 30);
    await walk(m, 900, 2240, { speed: 76 });
    await walk(m, 904, 1690, { speed: 80 });
    // a quick stop at the plaza
    stopFollow();
    await pl.walkTo([[880, 1705]], { speed: 70 });
    face(m, { x: 900, y: 1540 }); face(pl, { x: 900, y: 1540 });
    await camTo(900, 1560, { zoom: 1.0, rate: 2 });
    await say('meo', 'Banyan Plaza. Everyone meets here — for gossip, for chess, for pretending not to gossip.', { emo: 'happy' });
    await say('meo', 'Market Street is just north of here: *Cô Hoa\'s supermarket* for ingredients, *Chú Bảy* for materials, *Anh Khoa* for furniture.', { act: 'point' });
    camFollow(pl, 1.05);
    startFollow(m, 30);
    await walk(m, 1000, 1590, { speed: 80 });
    await walk(m, 1262, 1772, { speed: 80 });
    stopFollow();
    await pl.walkTo([[1236, 1780]], { speed: 60 });
    face(m, { x: 1260, y: 1700 }); face(pl, { x: 1260, y: 1700 });
    B('house').doorTarget = 0.4;
    await camTo(1262, 1700, { zoom: 1.25, rate: 2.2 });
    await say('meo', 'And this… is *your home*! Yellow walls, green shutters, a roof that only leaks when it rains.', { emo: 'happy' });
    face(m, pl);
    await say('meo', 'It\'s a bit empty inside. Anh Khoa sells furniture — you can arrange it however you like.');
    await say('meo', 'When you\'re tired, *sleep in your bed*. That ends the day, and I\'ll tell you how it went. I\'m very good at counting coins.', { emo: 'happy' });
    B('house').doorTarget = 0;
    face(m, { x: 1480, y: 1700 }); m.setAct('point');
    await camTo(1370, 1700, { zoom: 1.1 });
    await say('meo', 'Oh — and my house is right next door. The one with the ears. Come visit anytime!', { act: 'point' });
    m.setAct(null); face(m, pl);
    await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.3 });
    await say('meo', `Good luck, ${G.state.player.name}. I believe in you — and in that shed.`, { emo: 'happy' });
    m.setAct('wave'); await hop(m, 1); await wait(0.5); m.setAct(null);
    // Mèo Mây trots off toward the plaza, not vanishing
    camFollow(pl, 1);
    walk(m, 970, 1650, { speed: 70 }).then(() => { m.sit = true; releaseMeo('plaza'); });
    await wait(1.2);
  });
  G.runtime.inCutscene = false;
  setFlag('freeRoam');
  setStep('materials');
  toast({ text: 'Chương 1: Người Mới Đến', sub: 'A New Arrival — explore freely!', icon: 'lantern' });
  document.body.classList.add('show-joy-hint');
  showHud(true);
}

// ---------------------------------------------------------------- repairs / building
export async function repairScene(bizId) {
  const def = BUSINESSES[bizId], b = bizOf(bizId), bld = B(bizId);
  const r = bizRT(bizId);
  await cs.run('repair:' + bizId, async () => {
    G.runtime.inCutscene = true;
    spendMats(def.repair);
    const pl = G.player;
    await walk(pl, bld.x - 30, bld.y + 30, { direct: true, speed: 80 });
    face(pl, { x: bld.x, y: bld.y - 30 });
    await camTo(bld.x, bld.y - 50, { zoom: 1.3, rate: 2.4 });
    r.repairAnim = 0;
    pl.setAct('hammer');
    const dur = 4.2, t0 = performance.now();
    let lastHit = 0;
    while (true) {
      const k = (performance.now() - t0) / 1000 / dur;
      if (k >= 1) break;
      r.repairAnim = k * 0.999;
      if (performance.now() - lastHit > 300) {
        lastHit = performance.now(); sfx('hammer'); cam.shake = 0.25;
        const x = bld.x + rand(-bld.w / 2, bld.w / 2), y = bld.y - rand(10, 70);
        fx.burst('dust', x, y, 5, { up: 30, speed: 40, life: 0.8 });
        fx.burst('chip', x, y, 3, { up: 80, speed: 60, col: ['#c88a52', '#d9a064', '#b9c3cb'], size: 3 });
      }
      await sleep(30);
    }
    pl.setAct(null);
    r.repairAnim = null;
    b.repair = 1; b.unlocked = true;
    markDirty(true);
    fx.burst('spark', bld.x, bld.y - 50, 18, { up: 60, speed: 80, col: '#ffd35a', life: 1.2 });
    fx.burst('confetti', bld.x, bld.y - 60, 26, { up: 110, speed: 90, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 70, life: 1.6 });
    sfx('fanfare');
    await camTo(bld.x, bld.y - 50, { zoom: 1.45, rate: 3 });
    pl.setEmo('happy', 2); pl.doHop(); pl.setAct('cheer');
    await wait(1.4); pl.setAct(null);
    unlockAchievement('first_repair');
    if (Object.values(G.state.biz).filter(x => x.owned && x.repair >= 1).length >= 2) unlockAchievement('two_biz');
  });
  G.runtime.inCutscene = false;
  checkStory();
}
export async function upgradeScene(bizId, lv) {
  const def = BUSINESSES[bizId], b = bizOf(bizId), u = def.upgrades[lv];
  const isResto = bizId === 'restaurant';
  const inside = G.scene.id !== 'island';
  await cs.run('upgrade', async () => {
    G.runtime.inCutscene = true;
    addMoney(-u.cost, 'upgrade'); spendMats(u.mats);
    if (inside) { await fadeOut(300); }
    const bld = B(bizId), pl = G.player;
    const back = inside ? { id: G.scene.id, x: pl.x, y: pl.y } : null;
    if (inside) { setScene('island', bld.x - 30, bld.y + 34, 'up'); await fadeIn(300); }
    face(pl, { x: bld.x, y: bld.y - 30 });
    await camTo(bld.x, bld.y - 50, { zoom: isResto ? 1 : 1.3, rate: 2.5 });
    pl.setAct('hammer');
    for (let i = 0; i < 8; i++) { sfx('hammer'); fx.burst('dust', bld.x + rand(-bld.w / 2, bld.w / 2), bld.y - rand(10, 70), 4, { up: 30, speed: 40 }); await wait(0.28); }
    pl.setAct(null);
    b.level = lv;
    if (isResto) scenes.restaurant.applyLevel();
    fx.burst('confetti', bld.x, bld.y - 60, 30, { up: 110, speed: 90, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 70, life: 1.6 });
    sfx('fanfare'); pl.setEmo('happy', 2); pl.doHop();
    await wait(1.4);
    if (lv >= 3) unlockAchievement('max_level');
    markDirty(true);
    if (back) { await fadeOut(300); setScene(back.id, back.x, back.y, 'down'); await fadeIn(300); }
  });
  G.runtime.inCutscene = false;
  toast({ text: `${def.name} lên cấp ${lv}!`, sub: u.label, icon: 'lantern' });
  checkStory();
}
export async function discoverRecipe(id, { from = 'meo' } = {}) {
  if (!learnRecipe(id)) return;
  const R = RECIPES[id];
  await showReward({ kicker: 'Công thức mới · New recipe', title: R.vi, sub: R.en, icon: R.icon, steps: R.steps.map(s => STATION[s].icon), text: R.blurb, button: 'Học xong!' });
  if (G.state.recipes.length >= 5) unlockAchievement('recipes_5');
  if (G.state.recipes.length >= Object.keys(RECIPES).length) unlockAchievement('recipes_all');
  // give this business a daily special if it has none yet
  const bizId = Object.keys(BUSINESSES).find(b => BUSINESSES[b].biz === R.biz);
  if (bizId && !bizOf(bizId).special) bizOf(bizId).special = id;
}

// ---------------------------------------------------------------- Chapter 1 → 2
async function afterFirstRepair() {
  const m = G.meo;
  await cs.run('afterRepair', async () => {
    G.runtime.inCutscene = true;
    await summonMeo(34);
    await camTo((m.x + G.player.x) / 2, G.player.y - 30, { zoom: 1.3 });
    m.setEmo('surprised', 1.2);
    await say('meo', 'Waaa! Look at it! Is that the same shed? It looks so proud now!', { emo: 'surprised' });
    await hop(m, 2);
    await say('meo', 'A shop needs a menu, though. Here — this is the very first recipe Bà Tư ever taught me.', { emo: 'happy' });
    await discoverRecipe('tra_tac');
    await say('meo', 'Trà tắc: *tea*, then *kumquat*. The customer tells you the size, sugar and ice.');
    await titleCard(2);
    await say('meo', 'Buy *tea, kumquats, sugar and ice* at Cô Hoa\'s supermarket. Slice the kumquats at the prep table inside the shed. Then — open up!', { emo: 'happy' });
    await say('meo', 'I\'ll be nearby. I have very important napping to do.', { tilt: 0.15 });
    walk(m, 700, 2296, { speed: 70 }).then(() => { m.sit = true; releaseMeo('beach'); });
    await wait(0.8);
  });
  G.runtime.inCutscene = false;
  bizOf('shed1').special = 'tra_tac';
}
async function afterFirstCustomers() {
  setFlag('firstServed3');
  const m = G.meo;
  await cs.run('first3', async () => {
    G.runtime.inCutscene = true;
    await summonMeo(30);
    await say('meo', 'Your first customers! Did you see their faces? That\'s the face of someone who just had a *really* good trà tắc.', { emo: 'happy' });
    await say('meo', 'Keep going as long as you like. Shops close at 22:00.');
    await say('meo', 'When you\'re tired, go home and sleep in your bed. Tomorrow the ferry brings new visitors — word travels fast here.', { emo: 'happy' });
    m.setAct('wave'); await wait(0.6); m.setAct(null);
    if (G.scene.kind === 'island') walk(m, 700, 2296, { speed: 70 }).then(() => releaseMeo('beach'));
    else m.walkTo([[G.scene.door.x, G.scene.h + 14]], { speed: 70 }).then(() => { placeMeo('island', 700, 2296); releaseMeo('beach'); });
    await wait(0.6);
  });
  G.runtime.inCutscene = false;
}

// ---------------------------------------------------------------- morning after day 1 → Chapter 3
export async function morningHooks() {
  const s = G.state;
  if (S().step === 'grow' && !flag('ch3intro')) await chapter3Intro();
  else if (availableRecipes().length && !flag('recipeNote' + s.day)) { setFlag('recipeNote' + s.day); toast({ text: 'Mèo Mây có công thức mới!', sub: 'Visit Mèo Mây\'s house to learn it.', icon: 'notebook' }); }
}
async function chapter3Intro() {
  setFlag('ch3intro');
  const m = G.meo, pl = G.player;
  // Mèo Mây is waiting outside the front door
  await cs.run('ch3', async () => {
    G.runtime.inCutscene = true;
    await wait(0.4);
    if (G.scene.id === 'house') {
      await say('meo', `(Knock knock!) ${s().player.name}! Are you up? Come outside!`, {});
      await pl.walkTo([[135, 220]], { speed: 80 });
      await fadeOut(250);
      setScene('island', 1260, 1760, 'down');
      placeMeo('island', 1290, 1784); face(m, pl);
      await fadeIn(300);
    } else await summonMeo();
    face(pl, m);
    await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.3 });
    await say('meo', 'Good morning! Guess what — people on the mainland are talking about a tiny tea stand with *very* good trà tắc.', { emo: 'happy' });
    await titleCard(3);
    await say('meo', 'More visitors are coming by ferry now. And they\'ll want something to wake them up…');
    await discoverRecipe('ca_phe_sua_da');
    await say('meo', 'Cà phê sữa đá! Condensed milk first, *then* coffee. Never the other way. That\'s the law.', { emo: 'happy', tilt: 0.15 });
    await say('meo', 'Serve lots of customers and grow your reputation. If the island starts believing in you, I have… another shed in mind.');
    releaseMeo('plaza'); walk(m, 970, 1650, { speed: 70 });
    await wait(0.6);
  });
  G.runtime.inCutscene = false;
  setStep('grow');
}
const s = () => G.state;
async function introShed2() {
  const m = G.meo, pl = G.player;
  bizOf('shed2').unlocked = true; bizOf('shed2').owned = true;
  await cs.run('shed2', async () => {
    G.runtime.inCutscene = true;
    if (G.scene.id !== 'island') {
      await say('meo', '(Mèo Mây\'s voice outside) Pssst! Come out here, I want to show you something!', {});
      await fadeOut(250); const t = island().triggers.find(t => t.kind === 'door' && t.building === G.scene.building); setScene('island', t.doorX, t.doorY + 16, 'down'); await fadeIn(300);
    }
    await summonMeo();
    await say('meo', 'The whole island is talking about you! Bà Tư even put on her good shoes to visit your stand.', { emo: 'happy' });
    await say('meo', 'Follow me — there\'s another shed in West Village. It used to sell the best bánh mì on the island.');
    startFollow(m, 30); camFollow(pl, 1.05);
    await walk(m, 540, 1612, { speed: 82 });
    stopFollow(); await pl.walkTo([[512, 1618]], { speed: 60 });
    face(m, { x: 560, y: 1520 }); face(pl, { x: 560, y: 1520 });
    await camTo(560, 1530, { zoom: 1.3 });
    await say('meo', 'Ta-da. It\'s even more broken than the first one! Isn\'t that exciting?', { emo: 'happy', tilt: 0.2 });
    await say('meo', 'Repair it and I\'ll teach you bánh mì. Two shops means twice the running around — but I think you can handle it.');
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
}
async function afterShed2() {
  await cs.run('shed2done', async () => {
    G.runtime.inCutscene = true;
    await summonMeo();
    await say('meo', 'Crackly bread, a little pâté, grilled pork, pickles, cucumber, cilantro. Say it with me!', { emo: 'happy' });
    await discoverRecipe('banh_mi_thit');
    await say('meo', 'The grill is inside. Prep the bread and pork before you open.');
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
  bizOf('shed2').special = 'banh_mi_thit';
}

// ---------------------------------------------------------------- Chapter 4
async function chapter4Intro() {
  await cs.run('ch4', async () => {
    G.runtime.inCutscene = true;
    await summonMeo();
    const m = G.meo;
    await say('meo', 'You\'ve been running back and forth all day! Your legs must be tired. Mine are, and I just watched.', { emo: 'sad', tilt: 0.15 });
    await titleCard(4);
    await say('meo', 'Here\'s a secret about little shops: sheds and food trucks need *you* behind the counter. They\'re too small for staff.');
    await say('meo', 'Only a real *restaurant* can have a team. Cooks, servers, cleaners… One day, maybe!');
    await say('meo', 'For now — there\'s an old food truck on the east beach. Chú Hải wants to sell it. Rolls on wheels! Think of the possibilities!', { emo: 'happy' });
    releaseMeo('beach');
  });
  G.runtime.inCutscene = false;
}
export async function buyScene(bizId) {
  const def = BUSINESSES[bizId], b = bizOf(bizId), bld = B(bizId);
  await cs.run('buy:' + bizId, async () => {
    G.runtime.inCutscene = true;
    addMoney(-def.buy, 'buy');
    b.owned = true; b.unlocked = true; if (!def.repair) b.repair = 1;
    markDirty(true);
    await camTo(bld.x, bld.y - 50, { zoom: bizId === 'restaurant' ? 0.95 : 1.3, rate: 2.4 });
    sfx('cash'); await wait(0.4);
    fx.burst('spark', bld.x, bld.y - 50, 20, { up: 60, speed: 80, col: '#ffd35a', life: 1.2 });
    fx.burst('dust', bld.x, bld.y - 20, 12, { up: 30, speed: 60 });
    sfx('fanfare');
    G.player.setEmo('happy', 2); G.player.doHop();
    await wait(1.2);
    if (bizId === 'truck') unlockAchievement('truck');
  });
  G.runtime.inCutscene = false;
  checkStory();
}
async function afterTruck() {
  await cs.run('truckdone', async () => {
    G.runtime.inCutscene = true;
    await summonMeo();
    await say('meo', 'Beep beep! It\'s yours! Chú Hải cried a little. Happy tears. Mostly.', { emo: 'happy' });
    await discoverRecipe('goi_cuon');
    await say('meo', 'Gỏi cuốn: rice paper, noodles, herbs, shrimp — then roll it up nice and snug, like a cat in a blanket.', { tilt: 0.15 });
    releaseMeo('beach');
  });
  G.runtime.inCutscene = false;
  bizOf('truck').special = 'goi_cuon';
}

// ---------------------------------------------------------------- Chapter 5: the Night Market
async function chapter5Intro() {
  const m = G.meo, pl = G.player;
  await cs.run('ch5', async () => {
    G.runtime.inCutscene = true;
    if (G.scene.id !== 'island') { await fadeOut(250); const t = island().triggers.find(t => t.kind === 'door' && t.building === G.scene.building); setScene('island', t.doorX, t.doorY + 16, 'down'); await fadeIn(300); }
    await summonMeo();
    await say('meo', `${G.state.player.name}… can I show you a place that\'s very important to me?`, {});
    await titleCard(5);
    startFollow(m, 30); camFollow(pl, 1);
    await walk(m, 452, 900, { speed: 86 });
    await walk(m, 440, 790, { speed: 70 });
    stopFollow(); await pl.walkTo([[416, 800]], { speed: 60 });
    face(m, { x: 430, y: 600 }); face(pl, { x: 430, y: 600 });
    setMood('night');
    await camTo(430, 660, { zoom: 0.95, rate: 1.6, hold: 0.6 });
    await say('meo', 'This was the Night Market. Every evening, the whole island came here. Lanterns everywhere. Music. Grilled rice paper…', { emo: 'sad' });
    // Bà Sáu shuffles in
    const ba = new Actor({ kind: 'human', look: MERCHANTS.ba_sau.look, name: 'Bà Sáu', x: 300, y: 700, speed: 38 });
    island().add(ba); G.runtime.baSau = ba;
    await ba.walkTo([[360, 760], [392, 790]]);
    face(ba, pl); face(pl, ba); face(m, ba);
    await say(ba, 'Mèo Mây? Is this the young one everyone talks about? The one with the tea?', {});
    await say(ba, 'My mother made these lanterns. When the visitors stopped coming, we stopped lighting them. It felt silly to light lanterns for nobody.', { emo: 'sad' });
    face(m, pl);
    await say('meo', 'But people *are* coming back now. Because of you!', { emo: 'happy' });
    await say(ba, 'Then let\'s light them again. Bring wood, metal, paint, new silk lanterns and light strings — Chú Bảy has them now. And a little money for the vendors.', {});
    await say('meo', 'I\'ll help! I\'m excellent at holding one end of things.', { emo: 'happy', tilt: 0.2 });
    releaseMeo('nightmarket');
    ba.walkTo([[340, 620]]).then(() => ba.face('down'));
  });
  G.runtime.inCutscene = false;
  setMood(G.state.time >= 18.5 * 60 ? 'night' : 'day');
  setStep('restoreNM');
}
export async function restoreNightMarket() {
  const r = NIGHT_MARKET_RESTORE, m = G.meo, pl = G.player;
  await cs.run('nm', async () => {
    G.runtime.inCutscene = true;
    addMoney(-r.cost, 'restore'); spendMats(r.mats);
    if (G.state.time < 19 * 60 + 30) {
      await fadeOut(900, true);
      caption('Tối hôm đó…', 'That evening…');
      G.state.time = 19 * 60 + 40;
      pl.x = 430; pl.y = 800; pl.face('up');
      await wait(1.8); caption(null);
      await fadeIn(900);
    }
    setMood('night');
    const rtm = (G.runtime.nm = { restoreAnim: 0 });
    placeMeo('island', 456, 806); face(m, { x: 430, y: 600 });
    const ba = G.runtime.baSau || new Actor({ kind: 'human', look: MERCHANTS.ba_sau.look, name: 'Bà Sáu', x: 404, y: 812 });
    if (!island().actors.includes(ba)) island().add(ba);
    ba.x = 404; ba.y = 814; face(ba, { x: 430, y: 600 });
    await camTo(430, 700, { zoom: 0.9, rate: 1.4, hold: 0.4 });
    await say(ba, 'Ready? On three. Một… hai… ba!', {});
    sfx('bell');
    // lanterns and stalls come alive one after another
    const t0 = performance.now();
    while (true) {
      const k = (performance.now() - t0) / 5200;
      if (k >= 1) break;
      rtm.restoreAnim = k;
      if (Math.random() < 0.18) { const st = choice(['nm1', 'nm2', 'nm3', 'night', 'nm5', 'nm6']); const b = B(st); fx.burst('spark', b.x + rand(-30, 30), b.y - rand(40, 70), 3, { up: 30, col: '#ffd35a' }); sfx('sparkle'); }
      cam.override.y = 700 - Math.sin(k * Math.PI) * 60;
      await sleep(30);
    }
    rtm.restoreAnim = 1;
    G.state.nightMarket.restored = true; bizOf('night').owned = true; bizOf('night').unlocked = true; bizOf('night').repair = 1;
    markDirty(true);
    fx.burst('confetti', 430, 640, 50, { up: 140, speed: 110, col: ['#f08ca0', '#ffd35a', '#e8584e', '#fff'], g: 60, life: 2 });
    sfx('fanfare');
    // a crowd drifts in across the bridge
    for (let i = 0; i < 10; i++) setTimeout(() => npcs.spawnVisitorAt?.(454, 960, 'nightmarket'), i * 350);
    await wait(1.6);
    m.setEmo('happy', 3); await hop(m, 2);
    await camTo(430, 760, { zoom: 1.2, rate: 2 });
    await say(ba, 'Look at that… It\'s just like when I was a girl.', { emo: 'happy' });
    await say('meo', 'The Night Market is open! And one of these stalls is *yours*, partner.', { emo: 'happy' });
    await discoverRecipe('banh_trang_nuong');
    await discoverRecipe('che_ba_mau');
    await say('meo', 'Your stall opens from 17:00 to midnight. Bánh tráng nướng and chè — the two best smells in Việt Nam.');
    unlockAchievement('night_market');
    releaseMeo('nightmarket');
    ba.walkTo([[340, 610]]).then(() => ba.face('down'));
  });
  G.runtime.inCutscene = false;
  bizOf('night').special = 'banh_trang_nuong';
  G.runtime.nm = null;
  checkStory();
}

// ---------------------------------------------------------------- Chapter 6: the restaurant
async function chapter6Intro() {
  const m = G.meo, pl = G.player;
  await cs.run('ch6', async () => {
    G.runtime.inCutscene = true;
    if (G.scene.id !== 'island') { await fadeOut(250); setScene('island', 520, 760, 'down'); await fadeIn(300); }
    await summonMeo();
    await say('meo', 'Remember what I said about restaurants? Come with me, up the hill.', {});
    await titleCard(6);
    startFollow(m, 30); camFollow(pl, 1);
    await walk(m, 1180, 790, { speed: 90 });
    stopFollow(); await pl.walkTo([[1150, 800]], { speed: 60 });
    face(m, { x: 1200, y: 680 }); face(pl, { x: 1200, y: 680 });
    await camTo(1200, 680, { zoom: 0.95, rate: 1.8, hold: 0.4 });
    await say('meo', 'The old restaurant. It cooked for every wedding on the island. The kitchen still smells a little of star anise.', {});
    m.tiltTarget = 0.2;
    await say('meo', 'It\'s for sale. And it\'s big enough for a *team*. You could hire cooks and servers, and it would keep running even while you\'re at your other shops!', { emo: 'happy' });
    m.tiltTarget = 0;
    await say('meo', 'It\'ll cost a lot. And it needs a *lot* of fixing. But… I have a feeling.', { tilt: 0.15 });
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
  setStep('buyResto');
}
async function grandOpening() {
  const m = G.meo, pl = G.player, bld = B('restaurant');
  await cs.run('grand', async () => {
    G.runtime.inCutscene = true;
    placeMeo('island', bld.x + 30, bld.y + 34);
    for (const [rid, dx] of [['ba_tu', -60], ['linh', -30], ['chu_hai', 60], ['be_na', 90]]) { const a = npcs.byId(rid); if (a) { a.data.state = 'busy'; a.stop(); a.visible = true; a.x = bld.x + dx; a.y = bld.y + 56; a.face('up'); } }
    pl.x = bld.x; pl.y = bld.y + 34; pl.face('up');
    await camTo(bld.x, bld.y - 30, { zoom: 0.95, rate: 2 });
    caption('Khai trương!', 'Grand opening!');
    sfx('fanfare');
    fx.burst('confetti', bld.x, bld.y - 80, 60, { up: 150, speed: 120, col: ['#f08ca0', '#ffd35a', '#e8584e', '#9fd8c8', '#fff'], g: 60, life: 2.2 });
    for (const a of npcs.residents) if (a.data.state === 'busy') { a.setAct('cheer'); a.setEmo('happy', 3); }
    await wait(2.2); caption(null);
    for (const a of npcs.residents) if (a.data.state === 'busy') { a.setAct(null); npcs.returnResident(a); }
    face(m, pl); face(pl, m);
    await say('meo', `Nhà Hàng ${G.state.island.name}! Say it slowly. Doesn\'t it sound delicious?`, { emo: 'happy' });
    await discoverRecipe('pho_bo');
    await discoverRecipe('com_tam');
    await say('meo', 'Inside there\'s a *Staff* board by the break corner. Hire people, give them roles, and watch them work. They each have their own quirks!');
    await say('meo', 'A cook and a server is the start of a real team. Then it can run while you\'re away.', { emo: 'happy' });
    unlockAchievement('restaurant');
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
  bizOf('restaurant').special = 'pho_bo';
}

// ---------------------------------------------------------------- Chapter 7
async function chapter7Intro() {
  await cs.run('ch7', async () => {
    G.runtime.inCutscene = true;
    await summonMeo();
    await say('meo', 'Do you hear that? That\'s the sound of a ferry that\'s *full*. People come from the mainland just for your island now.', { emo: 'happy' });
    await titleCard(7);
    await say('meo', 'I\'ve been thinking. The fountain in the plaza has an empty pedestal. Every island needs a founder… and ours washed up with too much luggage.', { tilt: 0.2 });
    await say('meo', 'Make the island a real destination — lots of reputation, one shop fully upgraded — and let\'s put *you* up there.', { emo: 'happy' });
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
}
export function statueReady() { return G.state.reputation >= 300 && Object.values(G.state.biz).some(b => b.level >= 3); }
export async function buildStatue() {
  const c = STATUE_COST;
  await cs.run('statue', async () => {
    G.runtime.inCutscene = true;
    addMoney(-c.cost, 'statue'); spendMats(c.mats);
    await fadeOut(900, true);
    caption('Đêm hôm ấy, cả đảo tụ họp…', 'That night, the whole island gathered…');
    G.state.time = Math.max(G.state.time, 20 * 60);
    setMood('night');
    const pl = G.player, m = G.meo;
    pl.x = 900; pl.y = 1660; pl.face('up');
    placeMeo('island', 930, 1664);
    for (const [i, a] of npcs.residents.entries()) { a.data.state = 'busy'; a.stop(); a.visible = true; a.sit = false; a.x = 820 + (i % 4) * 50; a.y = 1680 + Math.floor(i / 4) * 24; a.face('up'); }
    await wait(1.8); caption(null);
    await fadeIn(900);
    await camTo(900, 1500, { zoom: 1, rate: 1.5, hold: 0.4 });
    G.state.statue = true; markDirty(true);
    sfx('fanfare');
    for (let i = 0; i < 10; i++) { setTimeout(() => { const x = 900 + rand(-140, 140), y = 1560 + rand(-30, 30); fx.burst('spark', x, y, 28, { up: 30, g: 18, speed: 150, col: choice(['#ffd35a', '#f08ca0', '#9fd8c8', '#fff', '#ff9a4a']), life: 1.5, z: 170 + rand(0, 60), jitter: 4 }); sfx('pop'); }, i * 380); }
    for (const a of npcs.residents) { a.setAct('cheer'); a.setEmo('happy', 5); }
    await wait(3.5);
    for (const a of npcs.residents) { a.setAct(null); npcs.returnResident(a); }
    face(m, pl); face(pl, m);
    await camTo((m.x + pl.x) / 2, pl.y - 20, { zoom: 1.3 });
    await say('meo', `You know… I\'ve been waiting a long time for someone who would stay.`, { tilt: 0.12 });
    await say('meo', 'Someone who\'d see a broken shed and think "hmm, 12 pieces of wood".', { emo: 'happy', tilt: 0.2 });
    await say('meo', `Thank you, ${G.state.player.name}. ${G.state.island.name} is home again.`, { emo: 'love' });
    await hop(m, 3);
    unlockAchievement('statue');
    await say('meo', 'Now! Tomorrow is a new day, and there are still recipes in my notebook. Shall we keep going?', { emo: 'happy' });
    releaseMeo('plaza');
  });
  G.runtime.inCutscene = false;
  checkStory();
}
async function finale() { /* the statue scene itself is the finale */ }

// ---------------------------------------------------------------- talking to Mèo Mây
const MEO_LINES = [
  'Did you know the banyan tree is older than the lighthouse? It told me. Trees talk if you nap near them long enough.',
  'Chú Hải says it\'s going to rain. Chú Hải always says it\'s going to rain.',
  'Bé Na asked me if cats like chè. I said yes. I have never tried chè.',
  'Regular customers remember how you treat them. So do cats. Just so you know.',
  'The best time to visit the beach is when the ferry leaves. So quiet. So many dropped snacks.',
  'If a customer is in a hurry, their patience bar drops faster. Rushed people tip better, though!',
  'Daily specials are 10% pricier and people love them. Check the menu board in each shop.',
  'Tourists love it when you do everything perfectly. They tip like they\'re on holiday — because they are.',
];
export async function talkToMeo() {
  const m = G.meo, pl = G.player;
  if (cs.active) return;
  await cs.run('talk:meo', async () => {
    m.stop(); m.sit = false; face(m, pl); face(pl, m); m.data.busy = true;
    m.doHop(60); sfx('meow');
    const st = currentStep();
    const avail = availableRecipes();
    const opts = ['Mình nên làm gì tiếp? · What should I do?', 'Kể chuyện đi · Tell me something', 'Tạm biệt · Bye!'];
    const pick = await ask('meo', choice([`Hi ${G.state.player.name}! Need something?`, 'Mew? Oh, it\'s you! Hello!', 'I was *definitely* not asleep. What\'s up?']), opts, { emo: 'happy' });
    if (pick === 0) {
      if (avail.length) await say('meo', 'I wrote a new recipe in my notebook! Come to my house and have a look.', { emo: 'happy' });
      if (st?.text) await say('meo', hintFor(S().step));
      else await say('meo', 'Upgrade your shops, try new recipes, make everyone a regular. And visit me!');
    } else if (pick === 1) await say('meo', choice(MEO_LINES), { tilt: 0.15 });
    else { m.setAct('wave'); await say('meo', 'Hẹn gặp lại! See you around!', { emo: 'happy' }); m.setAct(null); }
    m.data.busy = false;
  }, { bars: false, keepHud: true });
}
function hintFor(step) {
  return ({
    materials: 'Chú Bảy\'s material shop is on Market Street, north of the plaza. There\'s a button that buys exactly what the shed needs!',
    repair: 'You have the materials! Walk up to the beach shed and tap the button to repair it.',
    ingredients: 'Cô Hoa\'s supermarket is the green one on Market Street. Tea, kumquats, sugar and ice!',
    prep: 'Inside the shed, the prep table is on the right. Tap a kumquat, tap the board, tap the bowl.',
    open: 'Press the green OPEN button inside your shed. Then stand at the counter.',
    serve: 'Stand behind the counter and tap Serve. Pick the size, add the ingredients in order, set sugar and ice, then serve!',
    sleep: 'Your bed is in your house, top-left corner. Sleep whenever you\'re ready for tomorrow.',
    grow: 'Serve customers well — perfect orders give the most reputation. Daily specials help too!',
    repair2: 'The bánh mì shed is in West Village, west of the plaza. Chú Bảy has the materials.',
    banhmi: 'Buy bread, pâté, pork, pickles, cucumber and cilantro, prep them, and open the bánh mì shop.',
    truck: 'The food truck is on the east beach. Save up and tap it to buy!',
    truckServe: 'Stock rice paper, noodles, herbs and shrimp for the truck. Tourists love gỏi cuốn!',
    restoreNM: 'Chú Bảy sells lanterns and light strings now. Bring everything to the Night Market across the river.',
    nightServe: 'Your night stall opens at 17:00. Rice paper, eggs and scallions for bánh tráng nướng!',
    buyResto: 'The restaurant is on the hill in the north-east. It\'s expensive — the restaurant takes patience!',
    repairResto: 'The restaurant needs roof tiles as well as wood, metal and paint.',
    hire: 'Inside the restaurant, the Staff board is in the bottom-right corner.',
    restoServe: 'Open the restaurant and look after the guests. Staff will help with whatever they\'re assigned.',
    team: 'Hire a cook and a server, and the restaurant runs itself while you\'re away.',
    destination: 'Grow your reputation and fully upgrade a shop. Then come see me at the plaza!',
  })[step] || 'Just enjoy the island for a bit!';
}

// ---------------------------------------------------------------- Mèo Mây's routine
const MEO_SPOTS = {
  plaza: [[970, 1650], [830, 1650], [900, 1650]], beach: [[700, 2296], [1120, 2330]], dock: [[880, 2560]], market: [[900, 1250]],
  nightmarket: [[456, 700]], shop: null, home: [[1480, 1748]],
};
export function updateMeo(dt) {
  const m = G.meo;
  if (!m || !flag('freeRoam') || cs.active || m.data.busy) return;
  const st = G.state, h = st.time / 60;
  const homeTime = (h >= (st.nightMarket.restored ? 22.5 : 20.5)) || h < 7 || (h >= 12.5 && h < 13.5);
  const inHome = scenes.meo.actors.includes(m);
  if (homeTime) {
    if (inHome) { if (!m.data.napping) { m.data.napping = true; m.x = scenes.meo.meoSpot.x; m.y = scenes.meo.meoSpot.y; m.face('down'); m.setAct('sleep'); m.showEmote('zzz', 60); } return; }
    if (m.data.goal !== 'home-walk') {
      m.data.goal = 'home-walk'; m.sit = false;
      if (G.scene !== island()) { placeMeo('meo', scenes.meo.meoSpot.x, scenes.meo.meoSpot.y); m.data.napping = false; return; }
      walk(m, 1480, 1740, { speed: 64 }).then(() => { if (m.data.goal === 'home-walk') { placeMeo('meo', scenes.meo.meoSpot.x, scenes.meo.meoSpot.y); m.data.napping = false; } });
    }
    return;
  }
  if (inHome) { m.setAct(null); m.emote = null; m.data.napping = false; placeMeo('island', 1480, 1752); m.data.until = 0; m.data.goal = null; }
  if (m.path) return;
  if (st.time < (m.data.until || 0)) {
    // idle: look at the player when near, occasionally hop or sit
    if (G.scene === island() && dist(m.x, m.y, G.player.x, G.player.y) < 70) { m.face(G.player); if (!m.data.waved) { m.data.waved = true; m.setAct('wave'); setTimeout(() => m.act === 'wave' && m.setAct(null), 1200); } }
    else m.data.waved = false;
    return;
  }
  // choose a new hangout
  let spot = null;
  const openBiz = Object.keys(BUSINESSES).filter(id => bizOf(id).open && id !== 'restaurant' && id !== 'night');
  const r = Math.random();
  if (openBiz.length && r < 0.35) { const id = choice(openBiz); const bld = B(id); spot = [bld.x + 50, bld.y + 30]; }
  else if (npcs.ferry?.state === 'docked' || npcs.ferry?.state === 'arriving') spot = choice(MEO_SPOTS.dock);
  else if (st.nightMarket.restored && h >= 17.5) spot = choice(MEO_SPOTS.nightmarket);
  else spot = choice([...MEO_SPOTS.plaza, ...MEO_SPOTS.beach, ...MEO_SPOTS.market]);
  m.sit = false;
  m.data.goal = 'walk';
  walk(m, spot[0] + rand(-8, 8), spot[1] + rand(-4, 4), { speed: 62 }).then(ok => {
    if (!ok) return;
    m.data.until = st.time + rand(25, 60);
    m.face('down');
    if (Math.random() < 0.5) m.sit = true;
  });
}
