// Island clock: 1 real second = 1 game minute while playing. Time pauses in
// menus, dialogue and cutscenes. Sleeping ends the day with a summary.

import { G, T, freshDay, addMoney, markDirty, unlockAchievement } from './state.js';
import { bus, choice } from '../core/util.js';
import { BUSINESSES, RECIPES } from '../data/game.js';
import { closeBiz, bizRecipes } from './business.js';
import { dailyWages, resetRestaurantDay } from './restaurant.js';
import { resetFerryForNewDay } from './npc.js';
import { setMood } from '../core/audio.js';

// 6:00 → 24:00 lasts 20 real minutes. After midnight you get sleepy (and clumsy)
// until you go to bed; the clock never forces a new day.
export const DAY_START = 6 * 60, LATE = 24 * 60, NIGHT_HOLD = 29 * 60 + 30, TIME_SCALE = 1080 / (20 * 60);

export function timePaused() {
  return G.runtime.pause > 0 || G.runtime.inCutscene || document.hidden || !G.state.story.flags.freeRoam;
}
let lastHour = -1, warned = false;
export function updateClock(dt) {
  if (timePaused()) return 0;
  const s = G.state;
  const gm = s.time >= NIGHT_HOLD ? 0 : dt * TIME_SCALE;
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
  const wages = s.biz.restaurant.owned ? dailyWages() : 0;
  if (wages) addMoney(-wages, 'wages');
  const t = s.today;
  const sum = {
    day: s.day, island: s.island.name, chapter: s.story.chapter,
    revenue: Math.round(t.revenue), served: t.served, perfect: t.perfect, tips: Math.round(t.tips), lost: t.lost, wages,
    repDelta: Math.round(s.reputation - (t.repStart ?? s.reputation)),
    biz: t.biz, milestones: [...t.milestones], achievements: [...t.milestones],
    meoLine: meoNightLine(t),
  };
  s.history.push({ day: s.day, revenue: sum.revenue, served: sum.served });
  if (s.history.length > 30) s.history.shift();
  s.stats.daysPlayed++;
  s.day++;
  s.time = DAY_START;
  s.today = freshDay();
  s.today.repStart = s.reputation;
  // fresh daily specials
  for (const id of Object.keys(BUSINESSES)) { const recs = bizRecipes(id); s.biz[id].special = recs.length > 1 ? choice(recs) : recs[0] || null; }
  if (s.day >= 7) unlockAchievement('day_7');
  resetWarnings();
  resetRestaurantDay();
  resetFerryForNewDay();
  for (const r of Object.values(G.runtime.biz || {})) r.first = false;
  markDirty(true);
  return sum;
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
