// Island clock: 1 real second = 1 game minute while playing. Time pauses in
// menus, dialogue and cutscenes. Sleeping ends the day with a summary.

import { dailyCosts, morningDeliveries, rollUsage } from './economy.js';
import { recordCost, daySheet } from './ledger.js';
import { pantry, addPantry } from './state.js';
import { G, T, freshDay, addMoney, markDirty, unlockAchievement } from './state.js';
import { bus, choice } from '../core/util.js';
import { BUSINESSES, RECIPES } from '../data/game.js';
import { closeBiz, bizRecipes } from './business.js';
import { dailyWages, resetRestaurantDay, staffReport } from './restaurant.js';
import { resetFerryForNewDay } from './npc.js';
import { setMood } from '../core/audio.js';

// 6:00 → 24:00 lasts 20 real minutes (TIME_SCALE = 0.9 game min per real second; a full
// 6:00 → 6:00 all-nighter is ~27 real minutes). After midnight you get sleepy (and clumsy)
// until you go to bed. If you stay up all night, the clock runs on to DAWN (6:00 the next
// morning) and stops there: main.js then lets you nod off where you stand and wake to a
// new day, so waiting up for opening time never leaves the clock stuck before 6:00.
export const DAY_START = 6 * 60, LATE = 24 * 60, DAWN = 30 * 60, TIME_SCALE = 1080 / (20 * 60);

export function timePaused() {
  return G.runtime.pause > 0 || G.runtime.inCutscene || document.hidden || !G.state.story.flags.freeRoam;
}
let lastHour = -1, warned = false;
export function updateClock(dt) {
  if (timePaused()) return 0;
  const s = G.state;
  const gm = Math.max(0, Math.min(DAWN - s.time, dt * TIME_SCALE * (G.runtime.devClock || 1)));   // (devClock: the dev tab's clock speed)
  s.time += gm;
  G.runtime.sleepy = s.time >= LATE;
  const hr = Math.floor(s.time / 60);
  if (hr !== lastHour) { lastHour = hr; bus.emit('hour', hr); setMood(s.time >= 18.5 * 60 || s.time < 6 * 60 ? 'night' : 'day'); }
  if (s.time >= LATE && !warned) { warned = true; bus.emit('late'); }
  return gm;
}
export function resetWarnings() { warned = false; lastHour = -1; }

// Build the day's summary and roll everything over to the next morning.
export function endDay() {
  const s = G.state;
  for (const id of Object.keys(BUSINESSES)) if (s.biz[id].open) closeBiz(id, 'sleep');
  const walletStart = s.money;                         // the night's bills come out of this (shown on the card)
  const wages = s.biz.restaurant.owned ? dailyWages() : 0;
  if (wages) { addMoney(-wages, 'wages'); recordCost('restaurant', 'wages', wages); }
  const costs = dailyCosts();                          // rent + shopkeeper wages
  const t = s.today;
  const books = daySheet();
  const staff = [...(costs.staff || []), ...(s.biz.restaurant.owned ? staffReport() : [])];
  const prev = s.history[s.history.length - 1];
  rollUsage(t);
  const sum = {
    day: s.day, island: s.island.name, chapter: s.story.chapter,
    revenue: Math.round(t.revenue), served: t.served, perfect: t.perfect, tips: Math.round(t.tips), lost: t.lost, wages, rent: costs.rent, keeperWages: costs.keeperWages,
    repDelta: Math.round(s.reputation - (t.repStart ?? s.reputation)),
    biz: t.biz, milestones: [...t.milestones], achievements: [...t.milestones],
    meoLine: meoNightLine(t),
    books, staff, sales: Math.round(t.revenue - t.tips), net: books.totalIn - books.totalOut, prev: prev || null,
  };
  s.history.push({ day: s.day, revenue: sum.revenue, served: sum.served, tips: sum.tips, spent: books.totalOut, net: sum.net, chapter: s.story.chapter, biz: Object.fromEntries(Object.entries(books.biz).map(([id, p]) => [id, p.net])) });
  if (s.history.length > 30) s.history.shift();
  s.stats.daysPlayed++;
  s.day++;
  s.time = DAY_START;
  s.today = freshDay();
  s.today.repStart = s.reputation;
  // fresh daily specials
  // a daily special only makes sense when there's more than one thing on the menu
  for (const id of Object.keys(BUSINESSES)) { const recs = bizRecipes(id); s.biz[id].special = recs.length > 1 ? choice(recs) : null; }
  const del = morningDeliveries(); sum.deliveries = del.total;
  sum.wallet = { start: Math.round(walletStart), end: Math.round(s.money), bills: Math.round(wages + costs.rent + costs.keeperWages + del.total) };
  sum.gift = starterHelp();
  // how long each chapter takes (for pacing)
  const cd = (s.chapterDays ||= {}); cd[s.story.chapter] = (cd[s.story.chapter] || 0) + 1;
  if (s.day >= 7) unlockAchievement('day_7');
  resetWarnings();
  resetRestaurantDay();
  resetFerryForNewDay();
  for (const r of Object.values(G.runtime.biz || {})) r.first = false;
  markDirty(true);
  bus.emit('dayEnd', sum);                             // (save.js takes a backup snapshot)
  return sum;
}
// Safety net for a rough start: if you're broke with nothing to sell in the first days,
// Bà Tư (the retired fruit seller) leaves a little tea and kumquats at your door. A few times at most.
function starterHelp() {
  const s = G.state, f = s.story.flags;
  if (s.story.chapter > 3 || s.day > 8 || (f.starterGifts || 0) >= 3 || !s.biz.shed1?.owned || s.biz.shed1.repair < 1) return null;
  const canSell = ['tea', 'kumquat'].every(k => pantry(k) > 0) || (s.biz.shed1.prepped?.kumquat_cut || 0) > 0 && pantry('tea') > 0;
  if (canSell || s.money >= 60) return null;
  f.starterGifts = (f.starterGifts || 0) + 1;
  addPantry('tea', 8); addPantry('kumquat', 6); addPantry('sugar', 6); addPantry('ice', 6);
  return T('Bà Tư left a basket at your door: tea, kumquats, sugar and ice. "Everyone needs a little help at the start, con."', 'Bà Tư để một giỏ trước cửa: trà, tắc, đường và đá. "Ai mới bắt đầu cũng cần giúp một chút, con à."');
}
function meoNightLine(t) {
  const q = s => 'Mèo Mây: “' + s + '”';
  if (t.served === 0) return q(T('Quiet day? That\'s okay. Islands are patient.', 'Một ngày yên ả? Không sao. Hòn đảo kiên nhẫn lắm.'));
  if (t.perfect >= 10) return q(T('Ten perfect orders! My whiskers are still tingling.', 'Mười món hoàn hảo! Râu mình vẫn còn rung rinh nè.'));
  if (t.lost > 3) return q(T('A few people left hungry… tomorrow, a little faster, okay?', 'Có vài người bỏ về vì đói… mai nhanh tay hơn chút nha?'));
  return q(choice(T(['Sleep well. The island is a little brighter tonight.', 'I counted the lanterns tonight. There were more than yesterday.', 'Rest well. Big dreams need small naps.'], ['Ngủ ngon nhé. Tối nay hòn đảo sáng hơn một chút.', 'Tối nay mình đếm lồng đèn. Nhiều hơn hôm qua đó.', 'Nghỉ ngơi đi. Giấc mơ lớn cần những giấc ngủ nhỏ.'])));
}
export function specialsInit() {
  const s = G.state;
  for (const id of Object.keys(BUSINESSES)) if (!s.biz[id].special) { const recs = bizRecipes(id); s.biz[id].special = recs.length > 1 ? choice(recs) : null; }
}
export { RECIPES };
