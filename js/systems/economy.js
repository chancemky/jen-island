// The business side of island life:
//  • Shopkeepers: hire someone to open, prep and serve at a shop while you're elsewhere.
//  • Supply runners: a paid delivery that restocks a shop's ingredients every morning.
//  • Rent: every place you use costs a little each day, until you buy the property.
// The final goal of the game is an island where every shop runs itself.

import { G, T, addMoney, canAfford, markDirty, bizOf, pantry, addPantry } from './state.js';
import { BUSINESSES, INGREDIENTS, PREPPED, RECIPES, STATION, bizName } from '../data/game.js';
import { rt, openBiz, makeableRecipes, canMake, completeOrder, customerLeave, isOpenHours, ingredientsForBiz, recipeUses, bizRecipes } from './business.js';
import { LOCAL_NAMES } from './business.js';
import { visitorLook } from '../data/looks.js';
import { Actor } from '../world/actor.js';
import { bus, rand, choice, chance, money } from '../core/util.js';
import { addXP } from './progress.js';
import { fx } from '../world/render.js';

// ---------------------------------------------------------------- places, rent & property
export const PLACES = {
  house: { en: 'Your home', vi: 'Nhà của bạn', rent: 18 },
  shed1: { rent: 22 }, shed2: { rent: 30 }, truck: { rent: 40, en2: 'Parking spot', vi2: 'Chỗ đậu xe' }, night: { rent: 28 },
  nm1: { rent: 28 }, nm2: { rent: 28 }, nm3: { rent: 28 }, nm5: { rent: 28 }, nm6: { rent: 28 },
  restaurant: { rent: 110 }, cafe: { rent: 70 }, grill: { rent: 90 },
};
export const propertyPrice = id => Math.round(PLACES[id].rent * 70 / 10) * 10;
export const placeName = id => id === 'house' ? T(PLACES.house.en, PLACES.house.vi) : bizName(id);
const RENT_FROM_DAY = 3;                                     // a couple of rent-free days to settle in
export function usedPlaces() {
  const s = G.state, out = ['house'];
  for (const id of Object.keys(PLACES)) if (id !== 'house' && s.biz[id]?.owned && (s.biz[id].repair >= 1 || !BUSINESSES[id].repair)) out.push(id);
  return out;
}
export const ownsProperty = id => !!G.state.property?.[id];
export function rentToday() {
  if (G.state.day < RENT_FROM_DAY) return 0;
  return usedPlaces().filter(id => !ownsProperty(id)).reduce((a, id) => a + PLACES[id].rent, 0);
}
export function buyProperty(id) {
  const price = propertyPrice(id);
  if (ownsProperty(id) || !canAfford(price)) return false;
  addMoney(-price, 'property'); (G.state.property ||= {})[id] = true; addXP(80, 'property');
  markDirty(true); bus.emit('property', id);
  return true;
}

// ---------------------------------------------------------------- shopkeepers
export const KEEPER_WAGE = { shed: 45, truck: 60, stall: 50 };
export const keeperWage = id => KEEPER_WAGE[BUSINESSES[id].kind] || 60;
export const keeperOf = id => G.state.keepers?.[id] || null;
export const canHaveKeeper = id => BUSINESSES[id].kind !== 'restaurant';
export const keeperUnlocked = () => G.state.story.chapter >= 5;
const TRAIT = [{ id: 'quick', en: 'Quick hands', vi: 'Nhanh tay', speed: 0.75, perfect: 0.55 }, { id: 'careful', en: 'Careful', vi: 'Cẩn thận', speed: 1, perfect: 0.85 }, { id: 'friendly', en: 'Friendly', vi: 'Thân thiện', speed: 0.9, perfect: 0.65, tip: true }];
export const keeperTrait = k => TRAIT.find(t => t.id === k.trait) || TRAIT[0];
export function candidate(id) {
  // the same person applies until you hire them (new one each day)
  let h = 7; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  const seed = (G.state.day * 977 + h * 131) % 100000;
  const r = n => ((seed * 9301 + 49297 * n) % 233280) / 233280;
  return { name: LOCAL_NAMES[Math.floor(r(1) * LOCAL_NAMES.length)], seed, trait: TRAIT[Math.floor(r(2) * TRAIT.length)].id };
}
export function hireKeeper(id) {
  const k = candidate(id), fee = keeperWage(id) * 2;             // first two days up front
  if (keeperOf(id) || !canAfford(fee)) return false;
  addMoney(-fee, 'hire');
  (G.state.keepers ||= {})[id] = { ...k, hiredDay: G.state.day, served: 0 };
  markDirty(true); bus.emit('keeper', id); addXP(40, 'hire');
  spawnKeeperActor(id);
  return true;
}
export function fireKeeper(id) {
  const a = actors[id]; if (a) { G.scenes.island.remove(a); delete actors[id]; }
  delete G.state.keepers[id]; markDirty(true);
}
// the keeper stands at the counter on the island
const actors = {};
function keeperSpot(id) {
  const isl = G.scenes.island, b = isl.buildings[id] || isl.buildings[{ night: 'night' }[id]] || Object.values(isl.buildings).find(x => x.biz === id);
  if (!b) return null;
  if (b.type === 'stall') return { x: b.x + 12, y: b.y - 34 };       // behind the open counter
  return { x: b.x + (b.w || 100) / 2 - 12, y: b.y + 12 };             // beside the service window
}
function spawnKeeperActor(id) {
  const k = keeperOf(id), sp = keeperSpot(id); if (!k || !sp || actors[id]) return;
  const look = { ...visitorLook(k.seed + 7, 'regular'), apron: '#fff6e6', scale: 1 };
  delete look.backpack; delete look.camera; delete look.tote;
  const a = new Actor({ kind: 'human', look, name: k.name, x: sp.x, y: sp.y, data: { emp: { role: 'keeper', trait: 'steady' }, keeper: id } });
  a.talkable = true; a.face('down'); a.noCollide = true;
  G.scenes.island.add(a); actors[id] = a;
}
export function spawnKeepers() { for (const id of Object.keys(G.state.keepers || {})) spawnKeeperActor(id); }

// every frame: keepers open their shop, prep, and serve the customer at the counter
export function updateKeepers(dt) {
  const s = G.state;
  for (const [id, k] of Object.entries(s.keepers || {})) {
    if (!BUSINESSES[id] || !s.biz[id]?.owned) continue;
    const b = s.biz[id], r = rt(id), a = actors[id];
    if (a) a.visible = isOpenHours(id);
    // open up during opening hours (unless you're serving there yourself)
    if (!b.open && isOpenHours(id) && G.runtime.serviceOpen !== id) {
      r.kT = (r.kT ?? 2) - dt;
      if (r.kT <= 0) { r.kT = 20; autoPrep(id); if (makeableRecipes(id).length) openBiz(id); }
      continue;
    }
    if (!b.open || G.runtime.serviceOpen === id) continue;
    // keep a few portions prepped
    r.kPrep = (r.kPrep ?? 5) - dt; if (r.kPrep <= 0) { r.kPrep = 12; autoPrep(id); }
    const c = r.queue.find(q => q.slot === 0 && q.state !== 'walking' && !q.actor.path);
    if (!c) { r.kServe = null; if (a && a.act === 'work') a.setAct(null); continue; }
    if (r.kServe !== c.id) { r.kServe = c.id; r.kT2 = rand(4.5, 7) * keeperTrait(k).speed; a?.setAct('work'); }
    r.kT2 -= dt;
    if (r.kT2 > 0) continue;
    r.kServe = null; a?.setAct(null);
    const o = c.order;
    if (!o || !canMake(id, o.recipe, o.opts)) { a?.showEmote('sweat', 1.2); customerLeave(c, 'sad'); continue; }
    useStock(id, o);
    const q = chance(keeperTrait(k).perfect) ? 'perfect' : 'good';
    k.served = (k.served || 0) + 1;
    completeOrder(c, q);
    a?.doHop(50); a?.showEmote(q === 'perfect' ? 'heart' : 'happy', 1);
  }
}
function useStock(id, o) {
  const R = RECIPES[o.recipe], need = [...recipeUses(o.recipe)];
  if (R.options.includes('sugar') && o.opts.sugar) need.push('sugar');
  if (R.options.includes('ice') && o.opts.ice && o.opts.ice !== 'không đá') need.push('ice');
  if (o.opts.topping && o.opts.topping !== 'none') need.push(o.opts.topping);
  if (o.opts.chili === 'có ớt') need.push('chili');
  for (const k of need) {
    if (PREPPED[k]) { const b = bizOf(id); b.prepped[k] = Math.max(0, (b.prepped[k] || 0) - 1); }
    else addPantry(k, -1);
  }
  markDirty();
}
// prep up to 6 portions of each cut ingredient the menu needs
function autoPrep(id) {
  const b = bizOf(id);
  for (const r of bizRecipes(id)) for (const st of RECIPES[r].steps) {
    const u = STATION[st]?.uses; if (!u || !PREPPED[u]) continue;
    const from = PREPPED[u].from, have = b.prepped[u] || 0, want = 6 - have;
    if (want > 0 && pantry(from) > 0) { const n = Math.min(want, pantry(from)); addPantry(from, -n); b.prepped[u] = have + n; }
  }
}

// ---------------------------------------------------------------- supply runners
export const SUPPLY = { price: id => Math.round(({ shed: 450, truck: 700, stall: 520, restaurant: 1400 })[BUSINESSES[id].kind] || 600), fee: 1.15, packs: 2 };
export const hasSupply = id => !!G.state.supply?.[id];
export const supplyUnlocked = () => G.state.story.chapter >= 6;
export function buySupply(id) {
  const p = SUPPLY.price(id);
  if (hasSupply(id) || !canAfford(p)) return false;
  addMoney(-p, 'supply'); (G.state.supply ||= {})[id] = { on: true };
  markDirty(true); bus.emit('supply', id); addXP(40, 'supply');
  runSupply(id);
  return true;
}
export function toggleSupply(id) { const s = G.state.supply?.[id]; if (s) { s.on = !s.on; markDirty(true); } }
// each morning: top every ingredient this shop uses up to a couple of packs (at shop price + delivery)
export function runSupply(id) {
  const out = []; let cost = 0;
  for (const k of ingredientsForBiz(id)) {
    const g = INGREDIENTS[k]; if (!g) continue;
    const want = g.pack * SUPPLY.packs, have = pantry(k);
    if (have >= want) continue;
    const packs = Math.ceil((want - have) / g.pack), c = Math.round(packs * g.price * SUPPLY.fee);
    if (!canAfford(c)) continue;
    addMoney(-c, 'delivery'); addPantry(k, packs * g.pack); cost += c; out.push(k);
  }
  return { cost, items: out };
}
export function morningDeliveries() {
  let total = 0; const shops = [];
  for (const [id, sp] of Object.entries(G.state.supply || {})) if (sp.on && G.state.biz[id]?.owned) { const r = runSupply(id); if (r.cost) { total += r.cost; shops.push(id); } }
  return { total, shops };
}

// ---------------------------------------------------------------- the nightly bill
export function dailyCosts() {
  const s = G.state;
  const rent = rentToday();
  let wages = 0;
  for (const id of Object.keys(s.keepers || {})) if (s.biz[id]?.owned) wages += keeperWage(id);
  if (rent) addMoney(-rent, 'rent');
  if (wages) addMoney(-wages, 'wages');
  return { rent, keeperWages: wages };
}
// how close the island is to running itself (end goal)
export function staffedCount() {
  const s = G.state, list = Object.keys(BUSINESSES).filter(id => s.biz[id]?.owned);
  const staffed = list.filter(id => BUSINESSES[id].kind === 'restaurant' ? new Set(s.biz.restaurant.employees.map(e => e.role)).size >= 3 : !!keeperOf(id));
  return { staffed: staffed.length, total: list.length, list, missing: list.filter(id => !staffed.includes(id)) };
}
export { money };
