// Progression: uncapped levels (XP from every order, repair, recipe and
// chapter), a level-up celebration, tiered milestones with rewards, the
// pay-Mèo-Mây store unlocks, and the global leaderboard sync.

import { G, T, markDirty, addMoney } from './state.js';
import { bus, money } from '../core/util.js';

// ---------------------------------------------------------------- levels
export const xpNeed = lv => Math.round(90 * Math.pow(lv, 1.5));   // XP to go from lv to lv+1
export const level = () => G.state.level || 1;

const queue = [];
export function addXP(n, why = '') {
  const s = G.state; if (!n || !s) return;
  n = Math.round(n);
  s.xp = (s.xp || 0) + n; s.xpTotal = (s.xpTotal || 0) + n;
  while (s.xp >= xpNeed(s.level || 1)) {
    s.xp -= xpNeed(s.level || 1);
    s.level = (s.level || 1) + 1;
    const reward = 20 + s.level * 15;
    addMoney(reward, 'level');
    queue.push({ lv: s.level, reward, unlocks: unlocksAt(s.level) });
    bus.emit('levelup', s.level);
  }
  bus.emit('xp', n, why);
  markDirty();
}
// XP for an existing save that predates levels, so veterans don't restart at 1.
export function seedLevel(s) {
  if (s.level) return;
  let xp = (s.stats?.served || 0) * 8 + (s.stats?.perfect || 0) * 3 + Math.max(0, (s.story?.chapter || 1) - 1) * 120 + (s.recipes?.length || 0) * 30;
  s.level = 1; s.xp = 0; s.xpTotal = xp;
  while (xp >= xpNeed(s.level)) { xp -= xpNeed(s.level); s.level++; }
  s.xp = xp;
}

// ---------------------------------------------------------------- store gates
// Only the first stand is free. Every other shop's key belongs to Mèo Mây.
export const GATES = {
  shed2: { level: 4, cost: 800, en: 'the Bánh Mì Corner', vi: 'Bánh Mì Góc Phố' },
  truck: { level: 8, cost: 2500, en: 'the Roll Truck', vi: 'Xe Cuốn' },
  night: { level: 12, cost: 3000, en: 'the Night Market stall', vi: 'Sạp Chợ Đêm' },
  restaurant: { level: 18, cost: 12000, en: 'the Restaurant on the Hill', vi: 'Nhà Hàng trên đồi' },
};
export function gateText(id) {
  const g = GATES[id], lv = level();
  return T(`Lv ${Math.min(lv, g.level)}/${g.level} · ${money(Math.floor(G.state.money))}/${money(g.cost)}`, `Cấp ${Math.min(lv, g.level)}/${g.level} · ${money(Math.floor(G.state.money))}/${money(g.cost)}`);
}
export const gateReady = id => level() >= GATES[id].level && G.state.money >= GATES[id].cost;
export const gatePaid = id => !!G.state.keys?.[id];
export function payGate(id) {
  const g = GATES[id];
  if (!gateReady(id)) return false;
  addMoney(-g.cost, 'key');
  (G.state.keys ||= {})[id] = true;
  markDirty(true);
  bus.emit('key', id);
  return true;
}
function unlocksAt(lv) {
  const out = [];
  for (const [id, g] of Object.entries(GATES)) if (g.level === lv) out.push(T(`Mèo Mây will sell you the key to ${g.en}`, `Mèo Mây sẽ bán chìa khóa ${g.vi}`));
  for (const u of LEVEL_UNLOCKS) if (u.lv === lv) out.push(T(u.en, u.vi));
  return out;
}
export const LEVEL_UNLOCKS = [
  { lv: 2, en: 'Price setting on your menu board', vi: 'Tự đặt giá trên bảng thực đơn' },
  { lv: 3, en: 'Shop upgrades up to level 3', vi: 'Nâng cấp quán tới cấp 3' },
  { lv: 5, en: 'The clothing shop has new outfits', vi: 'Tiệm quần áo có đồ mới' },
  { lv: 6, en: 'Equipment upgrades for your shops', vi: 'Nâng cấp dụng cụ cho quán' },
  { lv: 10, en: 'Shop upgrades up to level 4', vi: 'Nâng cấp quán tới cấp 4' },
  { lv: 15, en: 'Shop upgrades up to level 5', vi: 'Nâng cấp quán tới cấp 5' },
];

// ---------------------------------------------------------------- milestones
const doubleOn = tiers => i => i < tiers.length ? tiers[i] : tiers[tiers.length - 1] * Math.pow(2, i - tiers.length + 1);
export const TRACKS = [
  { id: 'served', icon: 'star', en: 'Customers served', vi: 'Khách đã phục vụ', get: s => s.stats.served, tier: doubleOn([10, 50, 100, 250, 500, 1000, 2500, 5000]) },
  { id: 'perfect', icon: 'star', en: 'Perfect orders', vi: 'Món hoàn hảo', get: s => s.stats.perfect, tier: doubleOn([5, 25, 75, 200, 500, 1000, 2500]) },
  { id: 'earned', icon: 'coin', en: 'Money earned', vi: 'Tiền đã kiếm', money: true, get: s => Math.floor(s.lifetime || 0), tier: doubleOn([500, 2000, 5000, 15000, 40000, 100000, 250000]) },
  { id: 'tips', icon: 'coin', en: 'Tips collected', vi: 'Tiền boa', money: true, get: s => Math.floor(s.stats.tipsTotal || 0), tier: doubleOn([50, 250, 1000, 4000, 12000, 40000]) },
  { id: 'days', icon: 'sleep_moon', en: 'Days on the island', vi: 'Ngày trên đảo', get: s => s.day, tier: doubleOn([3, 7, 14, 30, 60, 100, 200, 365]) },
  { id: 'level', icon: 'trophy', en: 'Island level', vi: 'Cấp độ', get: s => s.level || 1, tier: doubleOn([5, 10, 15, 20, 30, 40, 50, 75, 100]) },
  { id: 'regulars', icon: 'heart', en: 'Regular customers', vi: 'Khách quen', get: s => Object.values(s.regulars || {}).filter(r => r.visits >= 3).length, tier: doubleOn([1, 3, 6, 10, 20, 35, 50]) },
  { id: 'recipes', icon: 'notebook', en: 'Recipes learned', vi: 'Công thức đã học', get: s => s.recipes.length, tier: doubleOn([2, 4, 6, 8, 10, 12, 14]) },
  { id: 'friends', icon: 'heart', en: 'Friendship with neighbours', vi: 'Tình bạn với hàng xóm', get: s => Object.values(s.friends || {}).reduce((a, b) => a + b, 0), tier: doubleOn([5, 15, 30, 60, 100, 200]) },
  { id: 'outfits', icon: 'shirt', en: 'Outfits collected', vi: 'Trang phục sưu tầm', get: s => (s.wardrobe?.owned || []).length, tier: doubleOn([2, 5, 10, 15, 25, 40]) },
  { id: 'chapters', icon: 'notebook', en: 'Chapters reached', vi: 'Chương đã đạt', get: s => s.story.chapter, tier: doubleOn([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]) },
  { id: 'shops', icon: 'sign_open', en: 'Shops you own', vi: 'Quán sở hữu', get: s => Object.values(s.biz).filter(b => b.owned).length, tier: doubleOn([2, 3, 5, 7, 9, 11, 13]) },
  { id: 'keepers', icon: 'person', en: 'Shopkeepers hired', vi: 'Người trông quán', get: s => Object.keys(s.keepers || {}).length, tier: doubleOn([1, 2, 4, 6, 9, 12]) },
  { id: 'property', icon: 'key', en: 'Properties owned', vi: 'Bất động sản', get: s => Object.keys(s.property || {}).length, tier: doubleOn([1, 3, 5, 8, 11, 14]) },
  { id: 'stalls', icon: 'lantern', en: 'Night Market stalls', vi: 'Sạp Chợ Đêm', get: s => ['night', 'nm1', 'nm2', 'nm3', 'nm5', 'nm6'].filter(id => s.biz[id]?.owned).length, tier: doubleOn([1, 2, 4, 6]) },
  { id: 'pets', icon: 'paw', en: 'Pets adopted', vi: 'Thú cưng nhận nuôi', get: s => (s.pets || []).length, tier: doubleOn([1, 2, 4, 6, 9]) },
  { id: 'petlove', icon: 'heart', en: 'Pet cuddles', vi: 'Âu yếm thú cưng', get: s => (s.pets || []).reduce((a, p) => a + (p.love || 0), 0), tier: doubleOn([5, 20, 50, 120, 300]) },
  { id: 'furniture', icon: 'sofa', en: 'Furniture placed', vi: 'Nội thất đã đặt', get: s => (s.home?.furniture || []).length, tier: doubleOn([3, 8, 15, 25, 40]) },
  { id: 'quests', icon: 'star', en: 'Neighbours helped', vi: 'Giúp hàng xóm', get: s => Object.values(s.sideQuests || {}).filter(v => v === 'done').length, tier: doubleOn([1, 3, 6, 9]) },
  { id: 'haircuts', icon: 'scissors', en: 'Haircuts & colours', vi: 'Lần làm tóc', get: s => s.stats.haircuts || 0, tier: doubleOn([1, 3, 8, 15, 30]) },
  { id: 'treats', icon: 'icecream', en: 'Street treats eaten', vi: 'Món vặt đã ăn', get: s => s.stats.treats || 0, tier: doubleOn([1, 5, 15, 40, 100]) },
  { id: 'upgrades', icon: 'hammer', en: 'Shop upgrades', vi: 'Nâng cấp quán', get: s => Object.values(s.biz).reduce((a, b) => a + Math.max(0, (b.level || 1) - 1), 0), tier: doubleOn([1, 3, 6, 10, 16, 24, 32]) },
];
export const milestoneReward = i => ({ money: Math.round(30 + Math.pow(i + 1, 1.7) * 45), xp: 40 + i * 35 });
export function trackState(tr) {
  const s = G.state, claimed = s.milestones?.[tr.id] || 0, val = tr.get(s), target = tr.tier(claimed);
  return { claimed, val, target, ready: val >= target, prev: claimed ? tr.tier(claimed - 1) : 0 };
}
export function claimMilestone(id) {
  const tr = TRACKS.find(t => t.id === id), st = trackState(tr);
  if (!st.ready) return null;
  (G.state.milestones ||= {})[id] = st.claimed + 1;
  const r = milestoneReward(st.claimed);
  addMoney(r.money, 'milestone'); addXP(r.xp, 'milestone');
  G.state.today.milestones.push([`${tr.en}: ${tr.money ? money(st.target) : st.target}`, `${tr.vi}: ${tr.money ? money(st.target) : st.target}`]);
  markDirty(true);
  return r;
}
export const readyMilestones = () => TRACKS.filter(t => trackState(t).ready).length;

// ---------------------------------------------------------------- level-up celebration
let showing = false;
export function tickCelebrations(canShow) {
  if (showing || !queue.length || !canShow()) return;
  showing = true;
  const q = queue.shift();
  celebrate(q).then(() => { showing = false; });
}
function celebrate({ lv, reward, unlocks }) {
  return new Promise(res => {
    G.runtime.pause++;
    bus.emit('sfx', 'fanfare');
    const el = document.createElement('div'); el.className = 'levelup';
    const confetti = Array.from({ length: 36 }, (_, i) => `<i style="--x:${(Math.random() * 2 - 1).toFixed(2)};--d:${(0.6 + Math.random() * 0.9).toFixed(2)}s;--r:${Math.floor(Math.random() * 360)}deg;--c:${['#ffd35a', '#f36d86', '#6fbfb0', '#8fb7e0', '#b9e07a'][i % 5]}"></i>`).join('');
    el.innerHTML = `<div class="lu-rays"></div><div class="lu-confetti">${confetti}</div>
      <div class="lu-card"><small>${T('LEVEL UP!', 'LÊN CẤP!')}</small><div class="lu-num"><span>${lv - 1}</span><b>${lv}</b></div>
      <div class="lu-reward"><span class="coin"></span>+${money(reward)}</div>
      ${unlocks.length ? `<ul>${unlocks.map(u => `<li>★ ${u}</li>`).join('')}</ul>` : ''}
      <button class="btn big pink" type="button">${T('Yay!', 'Tuyệt!')}</button></div>`;
    document.getElementById('app').appendChild(el);
    const done = () => { G.runtime.pause--; el.classList.add('out'); setTimeout(() => { el.remove(); res(); }, 350); };
    el.querySelector('button').onclick = () => { bus.emit('sfx', 'success'); done(); };
  });
}

// ---------------------------------------------------------------- leaderboard
let lastPush = 0;
export function leaderboardRow(s) {
  return { player_name: (s.player.name || '').slice(0, 40), island_name: (s.island.name || '').slice(0, 40), level: s.level || 1, xp: Math.floor(s.xpTotal || 0), money: Math.floor(s.money), lifetime: Math.floor(s.lifetime || 0), served: s.stats.served, day: s.day };
}
export function shouldPushLeaderboard() { const now = Date.now(); if (now - lastPush < 60_000) return false; lastPush = now; return true; }
