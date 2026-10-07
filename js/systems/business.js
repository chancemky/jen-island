// Small businesses (sheds, food truck, night stall): opening/closing,
// customers walking up and queueing, order generation, stock, and results.
// The restaurant has its own simulation in restaurant.js.

import { G, T, addMoney, addRep, markDirty, pantry, addPantry, unlockAchievement, bizOf } from './state.js';
import { EQUIPMENT, BUSINESSES, RECIPES, STATION, OPTIONS, PERSONALITIES, INGREDIENTS, PREPPED, RECIPE_UPGRADES, PRICE_RANGE, bizName, recipeCost } from '../data/game.js';
import { RESIDENTS, visitorLook } from '../data/looks.js';
import { addXP } from './progress.js';
import { Actor } from '../world/actor.js';
import { QUEUES, TRUCK_SPOTS } from '../world/island.js';
import { bus, rand, randi, choice, chance, clamp, dist, clock } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { applyPronouns, customerProfile } from './pronouns.js';
import { fx } from '../world/render.js';
import { recordSale } from './ledger.js';
import { recordUse } from './economy.js';
import { eventBoost } from './interact.js';
import { seasonServed } from './store.js';

export const LOCAL_NAMES = ['Chị Thu', 'Anh Nam', 'Cô Ba', 'Bác Tâm', 'Em Bi', 'Chú Lộc', 'Chị Hằng', 'Anh Khôi', 'Cô Duyên', 'Bác Hòa', 'Em Tí', 'Chị Loan', 'Anh Phong', 'Cô Mận', 'Chú Tư', 'Chị Vân', 'Anh Hùng', 'Em Su', 'Cô Nga', 'Bác Sang', 'Chị Ánh', 'Anh Tín', 'Em Cốm', 'Cô Liên'];
const TOURIST_NAMES = ['Emma', 'Kenji', 'Lucas', 'Aiko', 'Mia', 'Noah', 'Hana', 'Leo', 'Sofia', 'Min-jun', 'Ava', 'Oliver', 'Chloé', 'Mateo', 'Yuki', 'Sam'];

export function rt(id) {
  G.runtime.biz[id] ||= { queue: [], spawnT: 4, flap: 0, signFlip: 0, repairAnim: null, noStockWarned: false, first: true };
  return G.runtime.biz[id];
}

// ---------------------------------------------------------------- stock
// Station buttons consume prepared stock at this business or raw pantry stock.
export function stockOf(bizId, key) {
  if (PREPPED[key]) return bizOf(bizId).prepped[key] || 0;
  return pantry(key);
}
export function takeStock(bizId, key, n = 1) {
  if (stockOf(bizId, key) < n) return false;
  if (PREPPED[key]) { const b = bizOf(bizId); b.prepped[key] -= n; markDirty(); }
  else addPantry(key, -n);
  return true;
}
export function returnStock(bizId, key, n = 1) {
  if (PREPPED[key]) { const b = bizOf(bizId); b.prepped[key] = (b.prepped[key] || 0) + n; markDirty(); }
  else addPantry(key, n);
}
function optionUses(recipe, opts) {
  const u = [];
  if (recipe.options.includes('sugar') && opts.sugar) u.push('sugar');
  if (recipe.options.includes('ice') && opts.ice && opts.ice !== 'không đá') u.push('ice');
  if (opts.topping && opts.topping !== 'none') u.push(opts.topping);
  if (opts.chili === 'có ớt') u.push('chili');
  return u;
}
export function recipeUses(id) { return RECIPES[id].steps.map(s => STATION[s]).filter(s => s.uses).map(s => s.uses); }
export function canMake(bizId, id, opts = {}) {
  const r = RECIPES[id];
  const need = {};
  for (const u of recipeUses(id)) need[u] = (need[u] || 0) + 1;
  for (const u of optionUses(r, opts)) need[u] = (need[u] || 0) + 1;
  return Object.entries(need).every(([k, n]) => stockOf(bizId, k) >= n);
}
// a shop sells the recipes you know for its kind — or, for a stall with its own menu, only that menu
export function bizRecipes(bizId) {
  const def = BUSINESSES[bizId], kind = def.biz;
  if (def.menu) return def.menu.filter(r => G.state.recipes.includes(r));
  return G.state.recipes.filter(r => RECIPES[r].biz === kind && !RECIPES[r].stallOnly);
}
export function makeableRecipes(bizId) { return bizRecipes(bizId).filter(r => canMake(bizId, r)); }
// What a customer pays. opts may be an order's options, or just a size letter.
// The bonuses the game gives (better recipe, shop level, daily special, cash register)
// stack, but never past +28% — only your own price setting (PRICE_RANGE) goes beyond that.
export const BONUS_CAP = 1.28;
export function priceBonus(bizId, id) {
  const lv = RECIPE_UPGRADES[G.state.recipeLevels[id] || 1];
  const up = BUSINESSES[bizId].upgrades?.[bizOf(bizId).level];
  const special = bizOf(bizId).special === id ? 1.1 : 1;
  return Math.min(BONUS_CAP, (lv?.price || 1) * (up?.price || 1) * special * eq(bizId, 'price'));
}
export function recipePrice(bizId, id, opts = 'M') {
  if (typeof opts === 'string') opts = { size: opts };
  const R = RECIPES[id];
  const sz = R.options.includes('size') ? OPTIONS.size.price[opts.size || 'M'] : 1;
  const extra = opts.topping ? OPTIONS.topping.surcharge[opts.topping] || 0 : 0;     // toppings are paid for
  return Math.round(R.price * sz * priceBonus(bizId, id) * priceMul(id) + extra);
}
// cost of goods for one order (ingredients at supermarket price)
export const orderCost = order => recipeCost(order.recipe, order.opts);
// the price the player set (1 = the fair price); saves from before the range shrank are clamped
export const priceMul = id => clamp(G.state.prices?.[id] || 1, PRICE_RANGE[0], PRICE_RANGE[1]);
// Better food feels worth more: an upgraded recipe in a nicer shop can charge more
// before anyone minds.
export function perceivedValue(bizId, id) {
  const rl = G.state.recipeLevels?.[id] || 1, sl = bizId ? bizOf(bizId)?.level || 1 : 1;
  return 1 + 0.06 * (rl - 1) + 0.04 * (sl - 1);
}
// how a kind of customer feels about price (tourists shrug, picky ones notice)
export const PRICE_TOLERANCE = { tourist: 1.35, regular: 1.15, picky: 0.9, rushed: 1.05, excited: 1.05, patient: 1 };
export function tolerance(bizId, personality, perfectShop = false) {
  let t = PRICE_TOLERANCE[personality] ?? 1;
  if (personality === 'picky' && perfectShop) t = 1.1;           // picky people pay for quality
  return t * (bizId === 'truck' ? TRUCK_SPOTS[G.state.truckSpot || 'beach'].tolerance || BUSINESSES.truck.tolerance || 1 : BUSINESSES[bizId]?.tolerance || 1);
}
// how customers feel about a price: <1 means fewer people want it. A gentle curve —
// cheap, fair and pricey menus are all workable; they just attract different crowds.
export const PRICE_ELASTICITY = 1.5;
export const priceAppeal = (id, bizId = null, tol = 1) => Math.pow(priceMul(id) / (perceivedValue(bizId, id) * tol), -PRICE_ELASTICITY);
// equipment effect multiplier for a shop
export function eq(bizId, key) {
  const own = bizOf(bizId)?.equip; if (!own) return 1;
  let k = 1; for (const e of EQUIPMENT) if (own[e.id] && e[key]) k *= e[key];
  return k;
}

// ---------------------------------------------------------------- open / close
// your shops close at 11 pm (islanders' own shops keep their own hours)
export const CLOSE_TIME = 23 * 60;
export function isOpenHours(bizId, minutes = G.state.time) {
  const h = BUSINESSES[bizId].hours;
  if (h) return minutes >= h[0] && minutes < Math.min(h[1], CLOSE_TIME);
  return minutes >= 6 * 60 && minutes < CLOSE_TIME;
}
export function openBiz(bizId) {
  const b = bizOf(bizId);
  if (b.open) return { ok: true };
  if (!isOpenHours(bizId)) {
    const opens = BUSINESSES[bizId].hours?.[0] ?? 6 * 60;
    const openTime = clock(opens).replace(/^0/, '');
    // (the clock doesn't wrap at midnight: 00:00–dawn is 24:00–30:00, which is before opening, not after 11 pm)
    const why = G.state.time >= 24 * 60 || G.state.time < opens
      ? T(`Opens at ${openTime}.`, `Mở cửa lúc ${openTime}.`)
      : T('It\'s past 11 pm — your shops are closed until 6:00. (Islanders\' own shops keep their own hours.)', 'Đã quá 23 giờ — các quán của bạn đóng cửa tới 6:00. (Quán của người dân trên đảo có giờ riêng.)');
    return { ok: false, why };
  }
  if (!bizRecipes(bizId).length) return { ok: false, why: T('You don\'t know a recipe for this shop yet.', 'Bạn chưa biết món nào cho quán này.') };
  if (!makeableRecipes(bizId).length) return { ok: false, why: T('Not enough ingredients!\nBuy supplies and prep them first.', 'Hết nguyên liệu!\nMua và sơ chế nguyên liệu trước nhé.') };
  b.open = true;
  (G.state.today.opened ||= {})[bizId] = true;      // (restaurant staff are paid in full only on days it opens)
  const r = rt(bizId);
  r.spawnT = r.first ? 1 : rand(2, 5);
  r.noStockWarned = false;
  sfx('bell');
  bus.emit('biz:open', bizId);
  markDirty(true);
  return { ok: true };
}
export function closeBiz(bizId, reason = '') {
  const b = bizOf(bizId);
  if (!b.open) return;
  b.open = false;
  const r = rt(bizId);
  // customers still waiting leave politely
  for (const c of [...r.queue]) customerLeave(c, 'closed');
  bus.emit('biz:close', bizId, reason);
  markDirty(true);
}

// ---------------------------------------------------------------- customers
let custSeq = 1;
export class Customer {
  constructor(o) {
    Object.assign(this, o);
    this.id = 'c' + custSeq++;
    this.state = 'walking';   // walking → waiting → ordering → done → leaving
    this.slot = -1;
    this.waitT = 0;
  }
  get patienceRatio() { return clamp(this.patience / this.patienceMax, 0, 1); }
}

function pickPersonality(fromBoat) {
  if (fromBoat && chance(0.6)) return 'tourist';
  const list = Object.entries(PERSONALITIES).filter(([k]) => k !== 'regular' && k !== 'tourist');
  const total = list.reduce((s, [, p]) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const [k, p] of list) { r -= p.weight; if (r <= 0) return k; }
  return 'patient';
}

export function spawnCustomer(bizId, opts = {}) {
  const island = G.scenes.island, r = rt(bizId);
  const q = QUEUES[bizId];
  const maxQ = Math.min(q.length, bizMaxQueue(bizId));
  if (r.queue.length >= maxQ) return null;
  // who is coming?
  let resident = null, key, name, look, personality;
  const residentChance = G.npcs?.freeResidents?.().length ? 0.28 : 0;
  if (!opts.tourist && !opts.special && chance(residentChance)) resident = G.npcs.borrowResident(bizId);
  if (opts.special) { const sp = opts.special; key = 'rare:' + sp.id; name = sp.name; personality = sp.personality || 'picky'; look = sp.look; }
  else if (resident) {
    key = 'res:' + resident.data.rid; name = RESIDENTS[resident.data.rid].name; personality = RESIDENTS[resident.data.rid].personality;
  } else if (opts.tourist || chance(G.runtime.boatBoost > 0 ? 0.5 : 0.28)) {
    const seed = randi(1000, 999999); key = 'tour:' + seed; name = choice(TOURIST_NAMES); personality = 'tourist'; look = visitorLook(seed, 'tourist');
  } else {
    const n = randi(0, LOCAL_NAMES.length - 1); key = 'local:' + n; name = LOCAL_NAMES[n];
    personality = G.state.regulars[key]?.visits >= 3 ? 'regular' : pickPersonality(false);
    look = visitorLook(n * 31 + 7, personality);
  }
  let actor = resident;
  if (!actor) {
    // appear somewhere a little way off along the paths, then walk over
    const qx = q[0][0], qy = q[0][1];
    const [lo, hi] = r.first ? [70, 140] : [100, 210];
    const nodes = island.nav.nodes.filter(n => n.tags.has('path') && dist(n.x, n.y, qx, qy) > lo && dist(n.x, n.y, qx, qy) < hi);
    const start = opts.from || (nodes.length ? choice(nodes) : island.nav.nearest(qx, qy));
    actor = new Actor({ kind: 'human', look, x: start.x, y: start.y, speed: personality === 'rushed' ? 90 : rand(72, 82), data: { customer: true } });
    island.add(actor);
    actor.alpha = 0; actor.fadeIn = true;
  }
  const P = PERSONALITIES[personality];
  const recipeLv = 1;
  const base = 52 * P.patience * (G.state.story.chapter <= 2 ? 1.4 : 1) * recipeLv * eq(bizId, 'patience');
  const c = new Customer({ bizId, actor, key, name, personality, resident: !!resident, patience: base * (opts.special ? 1.6 : 1), patienceMax: base * (opts.special ? 1.6 : 1), friendOf: opts.friendOf || null });
  if (opts.special) { c.special = opts.special.id; actor.data.special = opts.special.id; }
  c.order = makeOrder(bizId, c);
  if (c.order?.walk) { G.state.today.priceWalk = (G.state.today.priceWalk || 0) + 1; bus.emit('customer:pricey', bizId); if (!resident) { actor.showEmote?.('sweat', 1.2); setTimeout(() => { actor.fadeOut = true; }, 900); } else G.npcs.returnResident(resident); return null; }
  if (!c.order) { if (!resident) island.remove(actor); else G.npcs.returnResident(resident); return null; }
  r.queue.push(c);
  c.slot = r.queue.length - 1;
  walkToSlot(c);
  bus.emit('customer:new', c);
  // now and then a regular brings someone along
  if (!opts.friendOf && G.state.regulars[key]?.visits >= 4 && chance(0.15)) setTimeout(() => { const f = spawnCustomer(bizId, { friendOf: name, from: { x: actor.x + 14, y: actor.y + 6 } }); if (f) f.actor.showEmote?.('happy', 1.2); }, 700);
  return c;
}
export function bizMaxQueue(bizId) {
  const b = bizOf(bizId), def = BUSINESSES[bizId];
  return def.upgrades?.[b.level]?.queue || def.queueMax || 3;
}
function walkToSlot(c) {
  const q = QUEUES[c.bizId], [x, y] = q[Math.min(c.slot, q.length - 1)];
  const island = G.scenes.island;
  const pts = c.state === 'walking' && dist(c.actor.x, c.actor.y, x, y) > 60 ? island.nav.path(c.actor.x, c.actor.y, x, y) : [[x, y]];
  c.actor.walkTo(pts).then(ok => { if (ok && c.state === 'walking') { c.state = 'waiting'; c.actor.face('up'); if (c.slot === 0) c.actor.showEmote(c.order.special ? 'heart' : '...', 1.4); if (c.slot === 0 && G.state.regulars[c.key]?.visits >= 3 && !c._named) { c._named = true; import('./fun.js').then(m => m.bark(c.actor, `♥ ${c.name}`, 2.2)); } } else if (ok) c.actor.face('up'); });
}
function shiftQueue(bizId) {
  const r = rt(bizId);
  r.queue.forEach((c, i) => { if (c.slot !== i) { c.slot = i; walkToSlot(c); } });
}

export function customerLeave(c, why) {
  const r = rt(c.bizId);
  const i = r.queue.indexOf(c);
  if (i >= 0) r.queue.splice(i, 1);
  c.state = 'leaving';
  const a = c.actor;
  if (why === 'angry') { a.setEmo('angry', 3); a.showEmote('angry', 1.8); sfx('sad'); }
  else if (why === 'happy') {
    a.setEmo('happy', 3);
    // they walk off with what they ordered, and take a sip or a bite on the way
    const v = RECIPES[c.order?.recipe]?.vessel, held = v === 'cup' || v === 'glass' ? 'cup' : v === 'bread' ? 'banh_mi' : 'bowl', act = held === 'cup' ? 'drink' : 'eat';
    if (!c.resident) { a.held = held; let n = 0; const sip = () => { if (a.fadeOut || a.alpha === 0 || n++ > 4) return; a.setAct(act); setTimeout(() => { if (a.act === act) a.setAct(null); setTimeout(sip, rand(1600, 2800)); }, 1300); }; setTimeout(sip, 1200); }
  }
  else if (why === 'closed') { a.showEmote('sad', 1.4); a.setEmo('sad', 2); }
  const island = G.scenes.island;
  setTimeout(() => {
    if (c.resident) { G.npcs.returnResident(a); return; }
    const nodes = island.nav.nodes.filter(n => n.tags.has('path') && dist(n.x, n.y, a.x, a.y) > 260 && dist(n.x, n.y, a.x, a.y) < 600);
    const dest = nodes.length ? choice(nodes) : island.nav.nodes[0];
    a.walkTo(island.nav.path(a.x, a.y, dest.x, dest.y)).then(() => { a.fadeOut = true; });
  }, why === 'happy' ? 900 : 500);
  shiftQueue(c.bizId);
  bus.emit('customer:leave', c, why);
}

// ---------------------------------------------------------------- orders
const SIZE_W = [['S', 2], ['M', 5], ['L', 3]];
const wpick = arr => { const t = arr.reduce((s, a) => s + a[1], 0); let r = Math.random() * t; for (const [v, w] of arr) { r -= w; if (r <= 0) return v; } return arr[0][0]; };
export function makeOrder(bizId, cust) {
  const b = bizOf(bizId);
  let pool = makeableRecipes(bizId);
  if (!pool.length) return null;
  let id;
  const reg = G.state.regulars[cust.key];
  if (reg?.fav && pool.includes(reg.fav) && chance(0.6)) id = reg.fav;
  else if (b.special && pool.includes(b.special) && chance(0.5)) id = b.special;
  else id = wpick(pool.map(r => [r, priceAppeal(r, bizId, tolerance(bizId, cust.personality))])); // cheaper items get picked more often
  const R = RECIPES[id], opts = {};
  if (R.options.includes('size')) opts.size = wpick(SIZE_W);
  if (R.options.includes('sugar')) opts.sugar = choice([30, 50, 70, 70, 100]);
  if (R.options.includes('ice')) opts.ice = wpick([['không đá', 1], ['ít đá', 2], ['đá bình thường', 4]]);
  if (R.options.includes('topping')) opts.topping = wpick([['none', 2], ['tapioca', 3], ['jelly', 2], ['cheese_foam', 2]]);
  if (R.options.includes('chili')) opts.chili = chance(0.55) ? 'có ớt' : 'không ớt';
  // make sure the options can be made with current stock; relax if not
  if (!canMake(bizId, id, opts)) { if (opts.topping) opts.topping = 'none'; if (opts.chili) opts.chili = 'không ớt'; if (!canMake(bizId, id, opts) && opts.ice) opts.ice = 'không đá'; }
  const price = recipePrice(bizId, id, opts);
  // someone who finds it far too expensive for them looks at the board and walks on
  const over = priceMul(id) / (perceivedValue(bizId, id) * tolerance(bizId, cust.personality, (b.stats?.perfectRate || 0) > 0.8));
  const walk = over > 1.2 && chance(Math.min(0.7, (over - 1.2) * 1.6));
  return { recipe: id, opts, price, special: b.special === id, walk };
}
// Order lines are built in the current language whenever they're shown.
export function orderText(order, cust) {
  const id = order.recipe, o = order.opts, R = RECIPES[id];
  const pn = G.state.player.name || T('friend', 'bạn');
  const regRec = G.state.regulars[cust.key], reg = regRec?.visits >= 3;
  // regulars sound like people who come back: the longer they've been coming, the warmer;
  // now and then they notice the shop, the island, or order "the usual"
  if (reg) { const line = regularLine(order, cust, regRec, pn); if (line) return line; }
  if (cust.friendOf) return cust.friendOf && T(`${cust.friendOf} brought me! They said to order the ${R.en}.`, applyPronouns(`${cust.friendOf} dẫn {me} tới đó! Bảo phải gọi ${R.vi}.`, customerProfile(cust)));
  if (G.lang === 'vi') {
    const prof = customerProfile(cust), P = x => applyPronouns(x, prof);
    const name = `*${R.vi}*`, parts = [];
    if (o.size) parts.push(`size *${o.size}*`);
    if (o.topping && o.topping !== 'none') parts.push(OPTIONS.topping.say[o.topping][1]);
    if (o.sugar !== undefined) parts.push(`${o.sugar}% đường`);
    if (o.ice) parts.push(OPTIONS.ice.say[o.ice][1]);
    if (o.chili) parts.push(OPTIONS.chili.say[o.chili][1]);
    const tail = parts.length ? ', ' + parts.join(', ') : '';
    const v = R.vessel === 'cup' || R.vessel === 'glass' ? 'ly' : R.vessel === 'bowl' ? 'tô' : R.vessel === 'bread' ? 'ổ' : 'phần';
    const k = pickLine(cust, 3);
    if (reg) return P([`Chào ${pn}! Như mọi khi nha: 1 ${v} ${name}${tail}!`, `Lại là {me} nè ${pn}! Cho {me} 1 ${v} ${name}${tail} nhé!`, `${pn} ơi, món quen: 1 ${v} ${name}${tail}!`][k]);
    if (cust.personality === 'tourist') return P([`Xin chào {you}! Cho {me} 1 ${v} ${name}${tail}, cảm ơn nha!`, `Chào {you}! {Me} muốn 1 ${v} ${name}${tail} nhé!`, `Cho {me} thử 1 ${v} ${name}${tail} nha {you}!`][k]);
    if (cust.personality === 'rushed') return P(`{You} ơi, nhanh giúp {me} nha! 1 ${v} ${name}${tail}!`);
    if (cust.personality === 'picky') return P(`Làm kỹ giúp {me} nhé {you}: 1 ${v} ${name}${tail}. Đúng y vậy nha.`);
    if (cust.personality === 'excited') return P([`Oa, thơm quá! {You} cho {me} 1 ${v} ${name}${tail} đi!`, `{Me} nghe đồn quán ngon lắm! 1 ${v} ${name}${tail} nha {you}!`, `Hôm nay {me} thèm 1 ${v} ${name}${tail} ghê!`][k]);
    return P([`{You} ơi, cho {me} 1 ${v} ${name}${tail} nha!`, `1 ${v} ${name}${tail} nhé {you}!`, `Cho {me} 1 ${v} ${name}${tail} với!`][k]);
  }
  // English
  const sizeW = { S: 'small', M: 'medium', L: 'large' }[o.size];
  let item = `${sizeW ? sizeW + ' ' : ''}*${R.en}*`;
  const withs = [];
  if (o.topping && o.topping !== 'none') withs.push(OPTIONS.topping.say[o.topping][0]);
  if (o.chili === 'có ớt') withs.push('chili');
  if (withs.length) item += ' with ' + withs.join(' and ');
  const mods = [];
  if (o.sugar !== undefined) mods.push(`${o.sugar}% sugar`);
  if (o.ice) mods.push(OPTIONS.ice.say[o.ice][0]);
  if (o.chili === 'không ớt') mods.push('no chili');
  const tail = mods.length ? ', ' + (mods.length > 1 ? mods.slice(0, -1).join(', ') + ' and ' + mods[mods.length - 1] : mods[0]) : '';
  const art = /^[aeiou]/i.test(item.replace('*', '')) ? 'an' : 'a';
  const k = pickLine(cust, 3);
  if (reg) return [`Hi ${pn}! The usual, please: ${art} ${item}${tail}!`, `It's me again, ${pn}! ${cap(art)} ${item}${tail}, like always.`, `${pn}! My favourite: ${art} ${item}${tail}!`][k];
  if (cust.personality === 'tourist') return [`Hello! Could I try ${art} ${item}${tail}, please?`, `Hi there! One ${item}${tail}, please!`, `Everyone says I have to try this: ${art} ${item}${tail}!`][k];
  if (cust.personality === 'rushed') return `Quick, please! ${cap(art)} ${item}${tail}!`;
  if (cust.personality === 'picky') return `Carefully, please: ${art} ${item}${tail}. Exactly like that.`;
  if (cust.personality === 'excited') return [`Ooh, it smells amazing! ${cap(art)} ${item}${tail}, please!`, `I heard this place is the best! ${cap(art)} ${item}${tail}!`, `I've been craving this all day: ${art} ${item}${tail}!`][k];
  return [`Can I get ${art} ${item}${tail}, please?`, `One ${item}${tail}, please!`, `I'd like ${art} ${item}${tail}.`][k];
}
const cap = w => w[0].toUpperCase() + w.slice(1);
// what a regular says, by how well you know each other and what they notice
function regularLine(order, cust, rec, pn) {
  const R = RECIPES[order.recipe], s = G.state, v = rec.visits, k = pickLine(cust, 7);
  const lvl = bizOf(cust.bizId)?.level || 1, ch = s.story.chapter, usual = rec.fav === order.recipe;
  const vi = x => applyPronouns(x, customerProfile(cust));
  const lines = [];
  if (usual && v >= 6) lines.push([`${pn}! The usual — you know how I like it.`, vi(`${pn} ơi! Như cũ nha — {you} biết {me} thích sao mà.`)]);
  if (v >= 12) lines.push([`Visit number ${v}! I should have a stool with my name on it.`, vi(`Lần thứ ${v} rồi đó! Chắc phải có cái ghế khắc tên {me}.`)]);
  else if (v >= 6) lines.push([`Morning, ${pn}! I told my whole street about your ${R.en}.`, vi(`Chào ${pn}! {Me} kể cả xóm nghe về ${R.vi} của {you} rồi.`)]);
  else lines.push([`Hi ${pn}! I'm starting to feel like a regular. ${R.en}, please!`, vi(`Chào ${pn}! {Me} bắt đầu thấy mình là khách quen rồi. Cho {me} ${R.vi} nha!`)]);
  if (lvl >= 3) lines.push([`Look at this place now! Lanterns and everything. One ${R.en}, please.`, vi(`Nhìn quán giờ đẹp ghê! Có cả lồng đèn nữa. Cho {me} một ${R.vi} nha.`)]);
  if (ch >= 8) lines.push([`Did you see the Night Market last night? The island feels alive again. ${R.en} for me!`, vi(`Tối qua {you} thấy Chợ Đêm chưa? Hòn đảo sống lại rồi. Cho {me} ${R.vi}!`)]);
  if (ch >= 12) lines.push([`More boats at the harbour every week. And still, I come here. ${R.en}, please.`, vi(`Tuần nào bến cảng cũng thêm thuyền. Vậy mà {me} vẫn ghé đây. Cho {me} ${R.vi} nha.`)]);
  if (cust.personality === 'rushed') return T(`${pn}, the usual, quick! I'm late again!`, vi(`${pn} ơi, như cũ, nhanh nha! {Me} lại trễ rồi!`));
  if (cust.personality === 'picky' && usual) return T(`Exactly like last time, ${pn}. It was perfect.`, vi(`Y như lần trước nha ${pn}. Lần đó hoàn hảo.`));
  if (k >= lines.length + 2) return null;                       // sometimes they just order normally
  const [en, viLine] = lines[k % lines.length];
  return T(en, viLine);
}
function pickLine(cust, n) { return (cust._line ??= Math.floor(Math.random() * n)) % n; }

// ---------------------------------------------------------------- results
export function evaluate(order, made, patience = 1) {
  const R = RECIPES[order.recipe];
  const need = R.steps, got = made.steps;
  const sameSet = need.length === got.length && [...need].sort().join() === [...got].sort().join();
  const mism = [];
  for (const k of R.options) {
    const want = order.opts[k], have = made[k];
    if (k === 'topping' && (want || 'none') !== (have || 'none')) mism.push(k);
    else if (k !== 'topping' && want !== undefined && want !== have) mism.push(k);
  }
  if (!sameSet) return { q: 'wrong', why: 'recipe', mism };
  if (mism.length) return { q: 'wrong', why: 'options', mism };
  // perfect = everything in it is right (the order you add things in doesn't matter);
  // only a customer who was left waiting until nearly the end calls it just "good"
  return { q: patience < 0.2 ? 'good' : 'perfect', why: '' };
}

export function completeOrder(c, quality) {
  const s = G.state, P = PERSONALITIES[c.personality];
  const order = c.order, lv = RECIPE_UPGRADES[s.recipeLevels[order.recipe] || 1];
  const price = order.price;
  const speed = c.patienceRatio;
  let tipRate = quality === 'perfect' ? 0.05 + speed * 0.12 : 0.01 + speed * 0.04;
  tipRate *= P.tip * (lv?.tip || 1) * (order.special ? 1.25 : 1);
  if (G.state.regulars[c.key]?.visits >= 3) tipRate *= 1.15 * eq(c.bizId, 'regTip');
  tipRate *= eq(c.bizId, 'tip') * Math.min(1.4, Math.pow(priceMul(order.recipe), -1.2)); // pricey food, smaller tips
  const L = G.runtime.luck, luck = L && L.day === G.state.day && G.state.time < L.until ? L.tip : 1;   // a busker's song, the golden cat (systems/rare.js)
  const tip = Math.round(price * tipRate * luck);
  addXP(quality === 'perfect' ? 12 + (order.special ? 3 : 0) : 7, 'serve');
  addMoney(price, 'sale');
  if (tip > 0) { addMoney(tip, 'tip'); s.today.tips += tip; s.stats.tipsTotal += tip; }
  // a bargain gets talked about
  const rep = (quality === 'perfect' ? 2 + (order.special ? 1 : 0) : 1) + (priceMul(order.recipe) < 0.95 && chance(0.5) ? 1 : 0);
  addRep(rep);
  s.stats.served++; s.today.served++; seasonServed();
  if (quality === 'perfect') { s.stats.perfect++; s.today.perfect++; }
  const b = bizOf(c.bizId);
  b.stats.served++; b.stats.revenue += price + tip;
  const tb = (s.today.biz[c.bizId] ||= { served: 0, revenue: 0, perfect: 0 });
  tb.served++; tb.revenue += price + tip; if (quality === 'perfect') tb.perfect++;
  recordSale(c.bizId, price, tip, orderCost(order)); recordUse(c.bizId, order.recipe, order.opts);
  b.stats.perfectRate = ((b.stats.perfectRate || 0) * 0.95) + (quality === 'perfect' ? 0.05 : 0);
  // regular tracking
  if (!c.key.startsWith('tour:')) {
    const reg = (s.regulars[c.key] ||= { name: c.name, visits: 0, fav: order.recipe });
    reg.visits++; reg.name = c.name;
    if (quality === 'perfect') reg.fav = order.recipe;
    if (priceMul(order.recipe) < 0.9 && reg.visits < 3 && chance(0.25)) reg.visits++;   // cheap and good: they come back sooner
    if (reg.visits === 3) { bus.emit('regular', c); unlockAchievement('first_regular'); if (Object.values(s.regulars).filter(r => r.visits >= 3).length >= 5) unlockAchievement('regulars_5'); }
  }
  if (c.resident) G.npcs?.befriend?.(c.key.slice(4), 2);
  // effects in the world
  const a = c.actor;
  a.setEmo(quality === 'perfect' ? 'love' : 'happy', 2.5); a.doHop(); a.showEmote(quality === 'perfect' ? 'heart' : 'happy', 1.6);
  fx.burst('coin', a.x, a.y - 30, 5, { up: 70, speed: 30, life: 0.9 });
  fx.float(a.x, a.y - 52, '+' + (price + tip) + 'k', '#ffe07a', { size: 10 });
  unlockAchievement('first_sale');
  if (s.stats.perfect >= 10) unlockAchievement('perfect_10');
  if (s.stats.perfect >= 50) unlockAchievement('perfect_50');
  if (s.stats.served >= 100) unlockAchievement('served_100');
  if (tip >= 20) unlockAchievement('tip_big');
  if (s.lifetime >= 1000) unlockAchievement('money_1000');
  if (s.lifetime >= 10000) unlockAchievement('money_10000');
  bus.emit('served', c, quality, price, tip);
  c.state = 'done';
  customerLeave(c, 'happy');
  markDirty(true);
  return { price, tip, rep };
}

export function failOrder(c) {
  c.patience -= c.patienceMax * 0.28;
  c.actor.setEmo('sad', 2); c.actor.showEmote('sweat', 1.4);
  if (c.patience <= 0) timeoutCustomer(c);
}
function timeoutCustomer(c) {
  G.state.today.lost++;
  addRep(-1);
  customerLeave(c, 'angry');
  bus.emit('customer:timeout', c);
}

// ---------------------------------------------------------------- per-frame
export function updateBusinesses(dt, gameMin) {
  const s = G.state;
  for (const [id, def] of Object.entries(BUSINESSES)) {
    if (def.kind === 'restaurant') continue;
    const b = s.biz[id], r = rt(id);
    const shown = b.open || !!G.runtime.showOpen?.has(id);        // (a cutscene can show a shop open)
    r.flap += ((shown ? 1 : 0) - r.flap) * Math.min(1, dt * 5);
    r.signFlip += ((shown ? 1 : 0) - r.signFlip) * Math.min(1, dt * 4);
    if (!b.open) continue;
    // closing time: no one new joins the line. If you're behind the counter you can
    // finish serving whoever is still waiting; otherwise they leave right away.
    const lastCall = !isOpenHours(id);
    if (lastCall && !(G.runtime.serviceOpen === id && r.queue.length)) { closeBiz(id, 'hours'); continue; }
    if (lastCall && !r.lastCall) { r.lastCall = true; bus.emit('toast', { text: T('Last orders!', 'Phục vụ lượt cuối!'), sub: T('The shop is closing — serve the customers still in line.', 'Quán sắp đóng — phục vụ nốt khách đang xếp hàng nhé.'), icon: 'sleep_moon' }); }
    if (!lastCall) r.lastCall = false;
    // spawn
    r.spawnT -= lastCall ? 0 : dt * (G.runtime.devCustomers || 1);   // real seconds, so the day's length doesn't change customer flow (devCustomers: the dev tab's speed-up)
    if (r.spawnT <= 0) {
      const made = makeableRecipes(id).length;
      if (!made) { if (!r.noStockWarned) { r.noStockWarned = true; bus.emit('toast', { text: T('Out of ingredients!', 'Hết nguyên liệu!'), sub: T(`${bizName(id)}: restock or prep more.`, `${bizName(id)}: mua thêm hoặc sơ chế nhé.`), bad: true }); } r.spawnT = 6; }
      else {
        spawnCustomer(id);
        r.spawnT = nextSpawnDelay(id);
        if (r.first) { r.first = false; }
      }
    }
    // patience: front customer drains fully, others slower
    for (const c of [...r.queue]) {
      // the timer only runs once they've reached the counter (slot 0 and standing there)
      if (c.state === 'walking' || c.slot !== 0 || c.actor.path) continue;
      c.patience -= dt * (G.runtime.serviceOpen === id ? 1 : 0.85);
      if (c.patienceRatio < 0.35 && !c._warned) { c._warned = true; c.actor.showEmote('sweat', 1.2); c.actor.setAct('wait'); }
      if (c.patience <= 0) timeoutCustomer(c);
    }
  }
  // fade customers in/out
  const island = G.scenes.island;
  for (const a of [...island.actors]) {
    if (a.fadeIn) { a.alpha = Math.min(1, (a.alpha ?? 0) + dt * 3); if (a.alpha >= 1) { a.fadeIn = false; delete a.alpha; } }
    if (a.fadeOut) { a.alpha = (a.alpha ?? 1) - dt * 2.5; if (a.alpha <= 0) island.remove(a); }
  }
}
// When people want what: each kind of business has its own day.
const DEMAND = {
  drinks:  [[6, 0.7], [8, 1.2], [11, 1.25], [13.5, 1.45], [17, 1.15], [19.5, 0.8], [21, 0.6]],   // hot afternoons
  banhmi:  [[6, 1.55], [9, 1.0], [11, 1.4], [13.5, 0.8], [17, 1.1], [19.5, 0.7], [21, 0.5]],    // breakfast & lunch
  truck:   [[6, 0.6], [9, 0.9], [11, 1.5], [14, 1.3], [17, 1.1], [19.5, 0.7], [21, 0.5]],     // beach lunch & afternoon
  cafe:    [[6, 1.6], [10, 1.15], [12, 0.9], [14, 1.2], [17, 0.9], [20, 0.6]],                 // morning coffee
  grill:   [[10, 0.6], [12, 0.9], [15, 0.8], [17, 1.55], [21, 1.2], [22.5, 0.8]],              // sunset seafood
  night:   [[17, 0.9], [19, 1.5], [22, 1.0]],
};
export function demandAt(id, h = G.state.time / 60) {
  const def = BUSINESSES[id], curve = DEMAND[def.biz] || [[0, 1]];
  let k = curve[0][1]; for (const [from, v] of curve) if (h >= from) k = v;
  if (def.late) k = h >= 20 ? 1.7 : h >= 19 ? 1.2 : 0.8;          // skewers: the later the busier
  if (id === 'truck') { const sp = TRUCK_SPOTS[G.state.truckSpot || 'beach']; if (sp.steady) k = (k + 1) / 2 * sp.steady; if (sp.ferry && G.runtime.boatBoost > 0) k *= sp.ferry; }
  return k * (def.pace || 1);
}
function nextSpawnDelay(id) {
  const s = G.state, def = BUSINESSES[id], b = s.biz[id];
  const attract = def.upgrades?.[b.level]?.attract || 1;
  const rep = 1 + Math.min(1.6, s.reputation / 90);
  const h = s.time / 60;
  const tf = demandAt(id, h);
  const boat = G.runtime.boatBoost > 0 ? 1.5 : 1;
  const special = b.special ? 1.12 : 1;
  const early = s.story.chapter <= 2 ? 1.15 : 1;            // a gentler head start
  const owned = s.property?.[id] ? 1.05 : 1;                      // your own place: you can put a sign out front
  const festive = eventBoost(def.biz);                            // Tết, summer beach days, Mid-Autumn…
  const recs = bizRecipes(id);
  const appeal = recs.length ? recs.reduce((a, r) => a + priceAppeal(r, id), 0) / recs.length : 1;
  const gear = eq(id, 'attract') * (h >= 18 ? eq(id, 'night') : 1);
  const rate = attract * rep * tf * boat * special * early * appeal * gear * owned * festive; // customers per ~34 game-minutes baseline
  return clamp(rand(32, 52) / rate, 7, 70);                 // a steady trickle, not a flood
}

export function ingredientsForBiz(bizId) {
  const set = new Set();
  for (const r of bizRecipes(bizId)) for (const s of RECIPES[r].steps) { const u = STATION[s].uses; if (u) set.add(PREPPED[u] ? PREPPED[u].from : u); }
  for (const r of bizRecipes(bizId)) { const R = RECIPES[r]; if (R.options.includes('sugar')) set.add('sugar'); if (R.options.includes('ice')) set.add('ice'); if (R.options.includes('topping')) { set.add('tapioca'); set.add('jelly'); set.add('cheese_foam'); } if (R.options.includes('chili')) set.add('chili'); }
  return [...set].filter(k => INGREDIENTS[k]);
}
