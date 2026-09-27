// Friendship levels with the islanders. Points come from chatting (once a day),
// games, gifts, side quests and serving them. Levels unlock deeper conversations
// and each resident's own story chain.

import { G, T } from './state.js';

export const FRIEND_LEVELS = [
  { at: 0, en: 'Stranger', vi: 'Người lạ' },
  { at: 4, en: 'Acquaintance', vi: 'Người quen' },
  { at: 10, en: 'Friendly', vi: 'Thân thiện' },
  { at: 20, en: 'Friend', vi: 'Bạn bè' },
  { at: 34, en: 'Close friend', vi: 'Bạn thân' },
  { at: 52, en: 'Best friend', vi: 'Tri kỷ' },
];
export const CLOSE_FRIEND = 4;
export const friendPoints = rid => G.state.friends?.[rid] || 0;
export function friendLevel(rid) {
  const p = friendPoints(rid);
  let lv = 0; FRIEND_LEVELS.forEach((l, i) => { if (p >= l.at) lv = i; });
  return lv;
}
export const friendLevelName = rid => { const l = FRIEND_LEVELS[friendLevel(rid)]; return T(l.en, l.vi); };
export function nextFriendLevel(rid) {
  const lv = friendLevel(rid), n = FRIEND_LEVELS[lv + 1];
  return n ? { need: n.at - friendPoints(rid), name: T(n.en, n.vi) } : null;
}
// add points; returns the new level when it went up (for a little celebration)
export function befriend(rid, n = 1) {
  const before = friendLevel(rid);
  G.state.friends[rid] = friendPoints(rid) + n;
  const after = friendLevel(rid);
  return after > before ? after : 0;
}
