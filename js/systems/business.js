// Small businesses (sheds, food truck, night stall): opening/closing,
// customers walking up and queueing, order generation, stock, and results.
// The restaurant has its own simulation in restaurant.js.

import { G, T, addMoney, addRep, markDirty, pantry, addPantry, unlockAchievement, bizOf } from './state.js';
import { EQUIPMENT, BUSINESSES, RECIPES, STATION, OPTIONS, PERSONALITIES, INGREDIENTS, PREPPED, RECIPE_UPGRADES, recipeName, bizName } from '../data/game.js';
import { RESIDENTS, visitorLook } from '../data/looks.js';
import { addXP } from './progress.js';
import { Actor } from '../world/actor.js';
import { QUEUES } from '../world/island.js';
import { bus, rand, randi, choice, chance, clamp, dist } from '../core/util.js';
import { sfx } from '../core/audio.js';
import { applyPronouns, customerProfile } from './pronouns.js';
import { fx } from '../world/render.js';

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
export function bizRecipes(bizId) {
  const kind = BUSINESSES[bizId].biz;
  return G.state.recipes.filter(r => RECIPES[r].biz === kind);
}
export function makeableRecipes(bizId) { return bizRecipes(bizId).filter(r => canMake(bizId, r)); }
export function recipePrice(bizId, id, size = 'M') {
  const lv = RECIPE_UPGRADES[G.state.recipeLevels[id] || 1];
  const up = BUSINESSES[bizId].upgrades?.[bizOf(bizId).level];
  const special = bizOf(bizId).special === id ? 1.1 : 1;
  const sz = RECIPES[id].options.includes('size') ? OPTIONS.size.price[size] : 1;
  return Math.round(RECIPES[id].price * sz * (lv?.price || 1) * (up?.price || 1) * special * priceMul(id) * eq(bizId, 'price'));
}
// the price the player set (1 = the fair price)
export const priceMul = id => G.state.prices?.[id] || 1;
// how customers feel about a price: <1 means fewer people want it
export const priceAppeal = id => Math.pow(priceMul(id), -1.6);
// equipment effect multiplier for a shop
export function eq(bizId, key) {
  const own = bizOf(bizId)?.equip; if (!own) return 1;
  let k = 1; for (const e of EQUIPMENT) if (own[e.id] && e[key]) k *= e[key];
  return k;
}

// ---------------------------------------------------------------- open / close
export function isOpenHours(bizId, minutes = G.state.time) {
  const h = BUSINESSES[bizId].hours;
  if (h) return minutes >= h[0] && minutes < h[1];
  return minutes >= 6 * 60 && minutes < 24 * 60;
}
export function openBiz(bizId) {
  const b = bizOf(bizId);
  if (b.open) return { ok: true };
  if (!isOpenHours(bizId)) return { ok: false, why: bizId === 'night' && G.state.time < 17 * 60 ? T('The night market opens at 17:00.', 'Chợ đêm mở lúc 17:00.') : T('It\'s after midnight — everything is closed until 6:00.', 'Quá nửa đêm rồi — mọi quán đóng cửa tới 6:00.') };
  if (!bizRecipes(bizId).length) return { ok: false, why: T('You don\'t know a recipe for this shop yet.', 'Bạn chưa biết món nào cho quán này.') };
  if (!makeableRecipes(bizId).length) return { ok: false, why: T('Not enough ingredients!\nBuy supplies and prep them first.', 'Hết nguyên liệu!\nMua và sơ chế nguyên liệu trước nhé.') };
  b.open = true;
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
  if (!opts.tourist && chance(residentChance)) resident = G.npcs.borrowResident(bizId);
  if (resident) {
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
  const c = new Customer({ bizId, actor, key, name, personality, resident: !!resident, patience: base, patienceMax: base });
  c.order = makeOrder(bizId, c);
  if (!c.order) { if (!resident) island.remove(actor); else G.npcs.returnResident(resident); return null; }
  r.queue.push(c);
  c.slot = r.queue.length - 1;
  walkToSlot(c);
  bus.emit('customer:new', c);
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
  c.actor.walkTo(pts).then(ok => { if (ok && c.state === 'walking') { c.state = 'waiting'; c.actor.face('up'); if (c.slot === 0) c.actor.showEmote(c.order.special ? 'heart' : '...', 1.4); } else if (ok) c.actor.face('up'); });
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
  else if (why === 'happy') { a.setEmo('happy', 3); }
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
  else id = wpick(pool.map(r => [r, priceAppeal(r)])); // cheaper items get picked more often
  const R = RECIPES[id], opts = {};
  if (R.options.includes('size')) opts.size = wpick(SIZE_W);
  if (R.options.includes('sugar')) opts.sugar = choice([30, 50, 70, 70, 100]);
  if (R.options.includes('ice')) opts.ice = wpick([['không đá', 1], ['ít đá', 2], ['đá bình thường', 4]]);
  if (R.options.includes('topping')) opts.topping = wpick([['none', 2], ['tapioca', 3], ['jelly', 2], ['cheese_foam', 2]]);
  if (R.options.includes('chili')) opts.chili = chance(0.55) ? 'có ớt' : 'không ớt';
  // make sure the options can be made with current stock; relax if not
  if (!canMake(bizId, id, opts)) { if (opts.topping) opts.topping = 'none'; if (opts.chili) opts.chili = 'không ớt'; if (!canMake(bizId, id, opts) && opts.ice) opts.ice = 'không đá'; }
  const price = recipePrice(bizId, id, opts.size);
  return { recipe: id, opts, price, special: b.special === id };
}
// Order lines are built in the current language whenever they're shown.
export function orderText(order, cust) {
  const id = order.recipe, o = order.opts, R = RECIPES[id];
  const pn = G.state.player.name || T('friend', 'bạn');
  const reg = G.state.regulars[cust.key]?.visits >= 3;
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
    if (cust.personality === 'tourist') return [`Xin chào! Cho tôi 1 ${v} ${name}${tail}, cảm ơn!`, `Chào bạn! Mình muốn 1 ${v} ${name}${tail} nhé!`, `Cho mình thử 1 ${v} ${name}${tail} nha!`][k];
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
function pickLine(cust, n) { return (cust._line ??= Math.floor(Math.random() * n)) % n; }
export function orderChips(order) {
  const id = order.recipe, o = order.opts, R = RECIPES[id], chips = [recipeName(id)];
  if (o.size) chips.push('Size ' + o.size);
  if (o.sugar !== undefined) chips.push(T(`${o.sugar}% sugar`, `${o.sugar}% đường`));
  if (o.ice) chips.push(T(OPTIONS.ice.say[o.ice][0], OPTIONS.ice.say[o.ice][1]).replace(/^./, c => c.toUpperCase()));
  if (o.topping) chips.push(T(OPTIONS.topping.say[o.topping][0], OPTIONS.topping.say[o.topping][1]).replace(/^./, c => c.toUpperCase()));
  if (o.chili) chips.push(T(OPTIONS.chili.say[o.chili][0], OPTIONS.chili.say[o.chili][1]).replace(/^./, c => c.toUpperCase()));
  void R;
  return chips;
}

// ---------------------------------------------------------------- results
export function evaluate(order, made) {
  const R = RECIPES[order.recipe];
  const need = R.steps, got = made.steps;
  const sameSet = need.length === got.length && [...need].sort().join() === [...got].sort().join();
  const exact = sameSet && need.every((s, i) => got[i] === s);
  const mism = [];
  for (const k of R.options) {
    const want = order.opts[k], have = made[k];
    if (k === 'topping' && (want || 'none') !== (have || 'none')) mism.push(k);
    else if (k !== 'topping' && want !== undefined && want !== have) mism.push(k);
  }
  if (!sameSet) return { q: 'wrong', why: 'recipe', mism };
  if (mism.length) return { q: 'wrong', why: 'options', mism };
  return { q: exact ? 'perfect' : 'good', why: exact ? '' : 'order' };
}

export function completeOrder(c, quality) {
  const s = G.state, P = PERSONALITIES[c.personality];
  const order = c.order, lv = RECIPE_UPGRADES[s.recipeLevels[order.recipe] || 1];
  const price = order.price;
  const speed = c.patienceRatio;
  let tipRate = quality === 'perfect' ? 0.08 + speed * 0.22 : 0.02 + speed * 0.06;
  tipRate *= P.tip * (lv?.tip || 1) * (order.special ? 1.25 : 1);
  if (G.state.regulars[c.key]?.visits >= 3) tipRate *= 1.15 * eq(c.bizId, 'regTip');
  tipRate *= eq(c.bizId, 'tip') * Math.min(1.5, Math.pow(priceMul(order.recipe), -1.5)); // pricey food, smaller tips
  const tip = Math.round(price * tipRate);
  addXP(quality === 'perfect' ? 12 + (order.special ? 3 : 0) : 7, 'serve');
  addMoney(price, 'sale');
  if (tip > 0) { addMoney(tip, 'tip'); s.today.tips += tip; s.stats.tipsTotal += tip; }
  const rep = quality === 'perfect' ? 2 + (order.special ? 1 : 0) : 1;
  addRep(rep);
  s.stats.served++; s.today.served++;
  if (quality === 'perfect') { s.stats.perfect++; s.today.perfect++; }
  const b = bizOf(c.bizId);
  b.stats.served++; b.stats.revenue += price + tip;
  const tb = (s.today.biz[c.bizId] ||= { served: 0, revenue: 0, perfect: 0 });
  tb.served++; tb.revenue += price + tip; if (quality === 'perfect') tb.perfect++;
  // regular tracking
  if (!c.key.startsWith('tour:')) {
    const reg = (s.regulars[c.key] ||= { name: c.name, visits: 0, fav: order.recipe });
    reg.visits++; reg.name = c.name;
    if (quality === 'perfect') reg.fav = order.recipe;
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
    r.flap += ((b.open ? 1 : 0) - r.flap) * Math.min(1, dt * 5);
    r.signFlip += ((b.open ? 1 : 0) - r.signFlip) * Math.min(1, dt * 4);
    if (!b.open) continue;
    if (!isOpenHours(id)) { closeBiz(id, 'hours'); continue; }
    // spawn
    r.spawnT -= dt;   // real seconds, so the day's length doesn't change customer flow
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
      const k = 1;
      c.patience -= dt * k * (G.runtime.serviceOpen === id ? 1 : 0.85);
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
function nextSpawnDelay(id) {
  const s = G.state, def = BUSINESSES[id], b = s.biz[id];
  const attract = def.upgrades?.[b.level]?.attract || 1;
  const rep = 1 + Math.min(3, s.reputation / 45);
  const h = s.time / 60;
  let tf = 1;
  if (h < 8) tf = 0.7; else if (h >= 11 && h < 13.5) tf = 1.45; else if (h >= 17 && h < 19.5) tf = 1.3; else if (h >= 21) tf = 0.6;
  if (id === 'night') tf = h >= 19 && h < 22 ? 1.5 : 1;
  const boat = G.runtime.boatBoost > 0 ? 1.5 : 1;
  const special = b.special ? 1.12 : 1;
  const early = s.story.chapter <= 2 ? 1.35 : 1;
  const recs = bizRecipes(id);
  const appeal = recs.length ? recs.reduce((a, r) => a + priceAppeal(r), 0) / recs.length : 1;
  const gear = eq(id, 'attract') * (h >= 18 ? eq(id, 'night') : 1);
  const rate = attract * rep * tf * boat * special * early * appeal * gear; // customers per ~34 game-minutes baseline
  return clamp(rand(15, 28) / (rate * 1.25), 3, 34);   // quicker arrivals
}

export function stationStock(bizId, key) { return stockOf(bizId, key); }
export function ingredientsForBiz(bizId) {
  const set = new Set();
  for (const r of bizRecipes(bizId)) for (const s of RECIPES[r].steps) { const u = STATION[s].uses; if (u) set.add(PREPPED[u] ? PREPPED[u].from : u); }
  for (const r of bizRecipes(bizId)) { const R = RECIPES[r]; if (R.options.includes('sugar')) set.add('sugar'); if (R.options.includes('ice')) set.add('ice'); if (R.options.includes('topping')) { set.add('tapioca'); set.add('jelly'); set.add('cheese_foam'); } if (R.options.includes('chili')) set.add('chili'); }
  return [...set].filter(k => INGREDIENTS[k]);
}
