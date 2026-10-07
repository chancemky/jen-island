// The weekly leaderboard's prizes. Every Monday (island time) the server writes the top 10
// of last week's three boards (migration 012). On start, and now and then while playing,
// we read your placings: each one gives its badge (checked by the server too) and, once
// per placing, a trophy for your home and some coins. Claimed placings live in the save.

import { G, T, addMoney, markDirty } from './state.js';
import * as cloud from './cloud.js';
import { bus, islandNow, money } from '../core/util.js';
import { grantServerBadge } from './badges.js';
import { FURNITURE } from '../data/game.js';
import { track } from './telemetry.js';

export const BOARDS = {
  served: { en: 'Most served', vi: 'Phục vụ nhiều nhất', unit: ['served', 'khách'] },
  earned: { en: 'Most earned', vi: 'Kiếm nhiều nhất', unit: ['earned', 'kiếm được'] },
  xp: { en: 'Most XP', vi: 'Nhiều XP nhất', unit: ['XP', 'XP'] },
};
export function prizeFor(rank) {
  if (rank === 1) return { coins: 5000, trophy: 'trophy_gold', badges: ['week_champ', 'week_podium', 'week_top10'] };
  if (rank <= 3) return { coins: 2500, trophy: 'trophy_silver', badges: ['week_podium', 'week_top10'] };
  return { coins: 1000, trophy: 'trophy_bronze', badges: ['week_top10'] };
}
// when this week's board closes: next Monday 00:00 in Vietnam (UTC+7)
export function weekEndsAt(now = islandNow()) {
  const vn = new Date(now + 7 * 3600e3), dow = (vn.getUTCDay() + 6) % 7;      // 0 = Monday
  return Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate() + 7 - dow) - 7 * 3600e3;
}
export function timeLeftText(now = islandNow()) {
  const ms = Math.max(0, weekEndsAt(now) - now), d = Math.floor(ms / 864e5), hr = Math.floor(ms % 864e5 / 3600e3);
  return d ? T(`${d}d ${hr}h left`, `còn ${d} ngày ${hr} giờ`) : T(`${hr}h ${Math.floor(ms % 3600e3 / 60e3)}m left`, `còn ${hr} giờ ${Math.floor(ms % 3600e3 / 60e3)} phút`);
}

export async function syncAwards() {
  if (!cloud.hasSession() || !G.user || G.user.local || !G.state) return [];
  let rows; try { rows = await cloud.myAwards(); } catch { return []; }
  const s = G.state, got = (s.weekAwards ||= {}), fresh = [];
  for (const r of rows || []) {
    const p = prizeFor(r.rank);
    p.badges.forEach(grantServerBadge);
    const key = `${r.week}:${r.board}`;
    if (got[key]) continue;
    got[key] = r.rank; fresh.push({ ...r, ...p });
    addMoney(p.coins, 'award');
    if (FURNITURE[p.trophy]) (s.home.owned ||= []).push(p.trophy);
    track('week_award', { board: r.board, rank: r.rank });
  }
  if (fresh.length) { markDirty(true); celebrate(fresh); }
  return fresh;
}
function celebrate(list) {
  const best = list.reduce((a, b) => (b.rank < a.rank ? b : a));
  const el = document.createElement('div'); el.className = 'modal';
  el.innerHTML = `<div class="card week-prize"><div class="wp-cup r${Math.min(best.rank, 4)}">${best.rank === 1 ? '🏆' : best.rank <= 3 ? '🥈' : '🎖️'}</div>
    <h2>${T('Last week, you made the top 10!', 'Tuần trước bạn lọt top 10!')}</h2>
    ${list.map(r => `<p><b>#${r.rank}</b> · ${T(BOARDS[r.board].en, BOARDS[r.board].vi)} <small>+${money(r.coins)} · ${T(FURNITURE[r.trophy].en, FURNITURE[r.trophy].vi)}</small></p>`).join('')}
    <p class="note">${T('The trophies are waiting in your home (Decorate). Your new badge can be shown on the leaderboard.', 'Cúp đã được gửi về nhà (Trang trí). Bạn có thể khoe huy hiệu mới trên bảng xếp hạng.')}</p>
    <button class="btn primary" type="button">${T('Wonderful!', 'Tuyệt quá!')}</button></div>`;
  (document.getElementById('app') || document.body).appendChild(el);
  bus.emit('stinger', 'award'); bus.emit('weekAward');
  el.querySelector('button').onclick = () => { bus.emit('sfx', 'ui'); el.remove(); };
}
export function initWeekBoard() {
  syncAwards();
  setInterval(syncAwards, 30 * 60 * 1000);       // a board can close while you play (Monday 00:10)
}
