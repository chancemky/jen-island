// Awards badges (data/badges.js) as you play, keeps your daily play streak, and holds the
// two the server grants: Supporter (a real purchase) and Founder (an account made before
// the official launch).

import { G, T, markDirty } from './state.js';
import { bus } from '../core/util.js';
import { BADGES, TIER_ORDER } from '../data/badges.js';

// Accounts created before this date are Founding Islanders. Set it to the launch day.
export const FOUNDER_BEFORE = Date.parse('2027-01-01T00:00:00Z');
const server = new Set();
export function grantServerBadge(id) { if (BADGES[id]?.server) { server.add(id); pickShowcase(); } }
export const hasBadge = id => server.has(id) || !!G.state.badges?.includes(id);
export const earnedBadges = () => Object.keys(BADGES).filter(hasBadge).sort((a, b) => TIER_ORDER.indexOf(BADGES[a].tier) - TIER_ORDER.indexOf(BADGES[b].tier));
// the badge shown beside your name: your pick, or your rarest
export function showcaseBadge() { const s = G.state; return s.showBadge && hasBadge(s.showBadge) ? s.showBadge : earnedBadges()[0] || null; }
function pickShowcase() { const s = G.state; if (!s.showBadge || !hasBadge(s.showBadge)) s.showBadge = earnedBadges()[0] || null; }
export function setShowcase(id) { if (hasBadge(id)) { G.state.showBadge = id; markDirty(true); } }

export function checkBadges() {
  const s = G.state; if (!s?.story?.flags?.freeRoam) return;
  const got = (s.badges ||= []), fresh = [];
  for (const [id, b] of Object.entries(BADGES)) if (!b.server && !got.includes(id) && b.got(s)) { got.push(id); fresh.push(id); }
  if (!fresh.length) return;
  pickShowcase(); markDirty(true);
  for (const id of fresh) bus.emit('toast', { text: T(`Badge earned: ${BADGES[id].en}`, `Nhận huy hiệu: ${BADGES[id].vi}`), sub: T(BADGES[id].need[0], BADGES[id].need[1]), icon: 'star', cls: 'ach', ms: 4200 });
  bus.emit('badges', fresh);
}
// consecutive real-world days you've opened the game
export function touchStreak() {
  const s = G.state, day = d => new Date(d).toLocaleDateString('en-CA');
  const today = day(Date.now()), yesterday = day(Date.now() - 864e5), st = (s.streak ||= { last: null, cur: 0, best: 0 });
  if (st.last === today) return st;
  st.cur = st.last === yesterday ? st.cur + 1 : 1; st.last = today; st.best = Math.max(st.best, st.cur);
  markDirty(true); return st;
}
export function initBadges() {
  touchStreak(); checkBadges();
  setInterval(checkBadges, 15000);
  bus.on('dayEnd', checkBadges);
}
