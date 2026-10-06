// Island goals: three fresh goals every real-world week, sized to your level, so there is
// always something to aim for — before and long after the story ends. Each goal pays out
// when claimed; finishing all three earns a weekly chest, and weeks completed count
// towards badges.

import { G, T, addMoney, markDirty } from './state.js';
import { addXP } from './progress.js';
import { FURNITURE } from '../data/game.js';
import { rng } from '../core/util.js';

const regulars = s => Object.values(s.regulars || {}).filter(r => r.visits >= 3).length;
// counters each goal measures from the start of the week
const POOL = {
  serve:   { icon: 'person', count: s => s.stats.served, target: lv => 60 + lv * 5, en: n => `Serve ${n} customers`, vi: n => `Phục vụ ${n} khách` },
  perfect: { icon: 'star', count: s => s.stats.perfect, target: lv => 20 + lv * 2, en: n => `Make ${n} perfect orders`, vi: n => `Làm ${n} món hoàn hảo` },
  earn:    { icon: 'coin', count: s => s.lifetime || 0, target: lv => 1500 + lv * 250, money: true, en: n => `Earn ${n}`, vi: n => `Kiếm ${n}` },
  tips:    { icon: 'heart', count: s => s.stats.tipsTotal || 0, target: lv => 200 + lv * 25, money: true, en: n => `Collect ${n} in tips`, vi: n => `Nhận ${n} tiền boa` },
  fish:    { icon: 'fish', count: s => s.stats.fishCaught || 0, target: () => 12, en: n => `Catch ${n} fish`, vi: n => `Câu ${n} con cá` },
  regular: { icon: 'person', count: regulars, target: () => 3, en: n => `Win ${n} new regulars`, vi: n => `Có thêm ${n} khách quen` },
  days:    { icon: 'sleep_moon', count: s => s.stats.daysPlayed || 0, target: () => 5, en: n => `Finish ${n} island days`, vi: n => `Trải qua ${n} ngày trên đảo` },
};
// ISO week, e.g. "2026-W41"
export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
export function weeklyGoals() {
  const s = G.state, wk = weekKey();
  if (s.weekly?.week !== wk) {
    const R = rng([...wk].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0), ids = Object.keys(POOL).sort(() => R() - 0.5).slice(0, 3), lv = s.level || 1;
    s.weekly = { week: wk, champ: s.weekly?.champ || 0, chest: false, goals: ids.map(id => ({ id, base: POOL[id].count(s), target: POOL[id].target(lv), claimed: false })) };
    markDirty(true);
  }
  return s.weekly.goals.map(g => {
    const P = POOL[g.id], have = Math.max(0, P.count(s) - g.base);
    return { ...g, icon: P.icon, money: P.money, have: Math.min(have, g.target), done: have >= g.target, label: n => T(P.en(n), P.vi(n)) };
  });
}
const reward = g => ({ money: 80 + (G.state.level || 1) * 20, xp: 80 });
export const goalReward = reward;
export function claimGoal(id) {
  const s = G.state, g = s.weekly?.goals.find(x => x.id === id), v = weeklyGoals().find(x => x.id === id);
  if (!g || g.claimed || !v?.done) return null;
  g.claimed = true;
  const r = reward(g); addMoney(r.money, 'goal'); addXP(r.xp, 'goal');
  let chest = null;
  if (s.weekly.goals.every(x => x.claimed) && !s.weekly.chest) {
    s.weekly.chest = true; s.weekly.champ = (s.weekly.champ || 0) + 1;
    const pick = ['vase_ceramic', 'wall_mirror', 'lamp_table', 'plant_bonsai', 'bean_bag', 'radio'].filter(f => FURNITURE[f]);
    const f = pick[s.weekly.champ % pick.length]; (s.home.owned ||= []).push(f);
    addMoney(250 + (s.level || 1) * 40, 'goal');
    chest = T(`Weekly chest: ${FURNITURE[f].en} and a bonus!`, `Rương tuần: ${FURNITURE[f].vi} và tiền thưởng!`);
  }
  markDirty(true);
  return { ...r, chest };
}
