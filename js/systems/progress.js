// Progression: uncapped levels (XP from every order, repair, recipe and
// chapter), a level-up celebration, tiered milestones with rewards, the
// pay-Mèo-Mây store unlocks, and the global leaderboard sync.

import { G, T, markDirty, addMoney } from './state.js';
import { bus, money } from '../core/util.js';
import { BUSINESSES, FURNITURE, RECIPES, ACHIEVEMENTS } from '../data/game.js';
import { CLOTHES, FREE_CLOTHES } from '../data/wardrobe.js';
import { RESIDENTS } from '../data/looks.js';
import { friendLevel, CLOSE_FRIEND } from './friends.js';

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
    const reward = levelReward(s.level);
    addMoney(reward, 'level');
    // every fifth level: a keepsake for your home as well
    const gift = LEVEL_GIFTS[s.level];
    if (gift && FURNITURE[gift]) (s.home.owned ||= []).push(gift);
    queue.push({ lv: s.level, reward, gift, unlocks: unlocksAt(s.level) });
    bus.emit('levelup', s.level);
  }
  bus.emit('xp', n, why);
  markDirty();
}
// Grows with the level (so it stays worth celebrating), but never outpaces what your shops earn.
export const levelReward = lv => Math.round((25 + lv * 12 + lv * lv * 1.5) / 5) * 5;
export const LEVEL_GIFTS = { 5: 'plant_bonsai', 10: 'record_player', 15: 'rocking_chair', 20: 'aquarium_big', 25: 'piano', 30: 'bamboo_screen', 40: 'fishtank', 50: 'sofa' };
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
// One price per business: the key costs what BUSINESSES[id].buy says.
export const GATES = {
  shed2: { level: 4, en: 'the Bánh Mì Corner', vi: 'Bánh Mì Góc Phố' },
  truck: { level: 8, en: 'the Roll Truck', vi: 'Xe Cuốn' },
  night: { level: 12, en: 'the Night Market stall', vi: 'Sạp Chợ Đêm' },
  restaurant: { level: 18, en: 'the Restaurant on the Hill', vi: 'Nhà Hàng trên đồi' },
};
for (const [id, g] of Object.entries(GATES)) Object.defineProperty(g, 'cost', { get: () => BUSINESSES[id].buy, enumerable: true });
export function gateText(id) {
  const g = GATES[id], lv = level();
  return T(`Lv ${Math.min(lv, g.level)}/${g.level} · money ${money(Math.floor(G.state.money))}/${money(g.cost)}`, `Cấp ${Math.min(lv, g.level)}/${g.level} · tiền ${money(Math.floor(G.state.money))}/${money(g.cost)}`);
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
// Milestones are counters that keep growing (customers served, money earned…);
// achievements are one-off special moments. A milestone about something that
// runs out (recipes, chapters, stalls…) ends at exactly how many exist and then
// shows COMPLETED instead of asking for the impossible.
// Some tiers carry a unique keepsake (furniture or clothing) besides money and XP.
export const COUNTS = {};                          // filled in by systems that own the lists (areas, quests, pets)
const doubleOn = tiers => i => i < tiers.length ? tiers[i] : tiers[tiers.length - 1] * Math.pow(2, i - tiers.length + 1);
const upTo = (tiers, max) => i => { const m = max(), t = [...tiers.filter(v => v < m), m]; return i < t.length ? t[i] : Infinity; };
const finite = (tr, tiers, max) => ({ ...tr, finite: true, max, tiers: () => [...tiers.filter(v => v < max()), max()], tier: upTo(tiers, max) });
const residentIds = () => Object.keys(RESIDENTS);
const nRecipes = () => Object.keys(RECIPES).length;
const upgradeSlots = () => Object.values(BUSINESSES).reduce((a, b) => a + Math.max(0, (b.upgrades?.length || 2) - 2), 0);
const bizKinds = s => new Set(Object.entries(s.biz).filter(([id, b]) => b.owned && (b.stats?.served || 0) > 0).map(([id]) => BUSINESSES[id]?.biz)).size;
export const TRACKS = [
  { id: 'served', icon: 'star', en: 'Customers served', vi: 'Khách đã phục vụ', get: s => s.stats.served, tier: doubleOn([10, 50, 100, 250, 500, 1000, 2500, 5000]), gifts: { 3: { furniture: 'lamp_floor' }, 6: { clothes: 'cafe' } } },
  { id: 'perfect', icon: 'star', en: 'Perfect orders', vi: 'Món hoàn hảo', get: s => s.stats.perfect, tier: doubleOn([5, 25, 75, 200, 500, 1000, 2500]), gifts: { 4: { clothes: 'chef_hat' } } },
  { id: 'earned', icon: 'coin', en: 'Money earned', vi: 'Tiền đã kiếm', money: true, get: s => Math.floor(s.lifetime || 0), tier: doubleOn([500, 2000, 5000, 15000, 40000, 100000, 250000]), gifts: { 5: { clothes: 'tycoon' } } },
  { id: 'tips', icon: 'coin', en: 'Tips collected', vi: 'Tiền boa', money: true, get: s => Math.floor(s.stats.tipsTotal || 0), tier: doubleOn([50, 250, 1000, 4000, 12000, 40000]) },
  { id: 'days', icon: 'sleep_moon', en: 'Days on the island', vi: 'Ngày trên đảo', get: s => s.day, tier: doubleOn([3, 7, 14, 30, 60, 100, 200, 365]), gifts: { 3: { furniture: 'clock' } } },
  { id: 'level', icon: 'trophy', en: 'Island level', vi: 'Cấp độ', get: s => s.level || 1, tier: doubleOn([5, 10, 15, 20, 30, 40, 50, 75, 100]) },
  { id: 'regulars', icon: 'heart', en: 'Regular customers', vi: 'Khách quen', get: s => Object.values(s.regulars || {}).filter(r => r.visits >= 3).length, tier: doubleOn([1, 3, 6, 10, 20, 35, 50]), gifts: { 4: { furniture: 'table_low' } } },
  finite({ id: 'recipes', icon: 'notebook', en: 'Recipes learned', vi: 'Công thức đã học', get: s => s.recipes.length, gifts: { last: { clothes: 'chef' } } }, [2, 4, 6, 8, 10, 14, 18], nRecipes),
  finite({ id: 'mastery', icon: 'notebook', en: 'Signature recipes (Lv 3)', vi: 'Món đặc sắc (Lv 3)', get: s => Object.values(s.recipeLevels || {}).filter(l => l >= 3).length, gifts: { last: { furniture: 'vase_ceramic' } } }, [1, 3, 6, 10, 15], nRecipes),
  { id: 'friends', icon: 'heart', en: 'Friendship points', vi: 'Điểm tình bạn', get: s => Object.values(s.friends || {}).reduce((a, b) => a + b, 0), tier: doubleOn([5, 15, 30, 60, 100, 200]) },
  finite({ id: 'closefriends', icon: 'heart', en: 'Close friends', vi: 'Bạn thân', get: () => residentIds().filter(r => friendLevel(r) >= CLOSE_FRIEND).length, gifts: { last: { clothes: 'pearls' } } }, [1, 3, 6, 10], () => residentIds().length),
  finite({ id: 'outfits', icon: 'shirt', en: 'Wardrobe collection', vi: 'Bộ sưu tập tủ đồ', get: s => (s.wardrobe?.owned || []).filter(id => !FREE_CLOTHES.includes(id)).length, gifts: { last: { clothes: 'crown' } } }, [2, 5, 10, 15, 25, 40, 60], () => Object.keys(CLOTHES).filter(id => !FREE_CLOTHES.includes(id)).length),
  finite({ id: 'chapters', icon: 'notebook', en: 'Chapters reached', vi: 'Chương đã đạt', get: s => s.story.chapter, gifts: { last: { furniture: 'painting' } } }, [2, 4, 6, 8, 10, 12, 14, 16, 18], () => 20),
  finite({ id: 'shops', icon: 'sign_open', en: 'Shops you own', vi: 'Quán sở hữu', get: s => Object.values(s.biz).filter(b => b.owned).length, gifts: { last: { clothes: 'gold_shoes' } } }, [2, 3, 5, 7, 9, 11], () => Object.keys(BUSINESSES).length),
  finite({ id: 'kinds', icon: 'sign_open', en: 'Kinds of business run', vi: 'Loại hình kinh doanh', get: s => bizKinds(s) }, [2, 3, 4, 5, 6], () => new Set(Object.values(BUSINESSES).map(b => b.biz)).size),
  { id: 'keepers', icon: 'person', en: 'Staff employed', vi: 'Nhân sự đã thuê', get: s => Object.keys(s.keepers || {}).length + (s.biz.restaurant?.employees?.length || 0), tier: doubleOn([1, 2, 4, 6, 9, 12, 16]) },
  finite({ id: 'property', icon: 'key', en: 'Properties owned', vi: 'Bất động sản', get: s => Object.keys(s.property || {}).length, gifts: { last: { furniture: 'bamboo_screen' } } }, [1, 3, 5, 8, 11], () => COUNTS.places || 14),
  finite({ id: 'stalls', icon: 'lantern', en: 'Night Market stalls', vi: 'Sạp Chợ Đêm', get: s => ['night', 'nm1', 'nm2', 'nm3', 'nm5', 'nm6'].filter(id => s.biz[id]?.owned).length, gifts: { last: { furniture: 'lantern_red' } } }, [1, 2, 4], () => 6),
  finite({ id: 'pets', icon: 'paw', en: 'Pets adopted', vi: 'Thú cưng nhận nuôi', get: s => (s.pets || []).length, gifts: { last: { furniture: 'cat_bed' } } }, [1, 2, 4, 6], () => COUNTS.pets || 9),
  { id: 'petlove', icon: 'heart', en: 'Pet affection', vi: 'Tình cảm thú cưng', get: s => (s.pets || []).reduce((a, p) => a + (p.love || 0), 0), tier: doubleOn([5, 20, 50, 120, 300]) },
  { id: 'furniture', icon: 'sofa', en: 'Home decorated (pieces)', vi: 'Trang trí nhà (món)', get: s => Math.max(s.stats.furnMax || 0, (s.home?.furniture || []).length), tier: doubleOn([3, 8, 15, 25, 40]) },
  finite({ id: 'quests', icon: 'star', en: 'Neighbours helped', vi: 'Giúp hàng xóm', get: s => Object.values(s.sideQuests || {}).filter(v => v === 'done').length, gifts: { last: { clothes: 'flower_crown' } } }, [1, 3, 6, 9, 15, 20], () => COUNTS.quests || 9),
  finite({ id: 'explore', icon: 'map', en: 'Places explored', vi: 'Nơi đã khám phá', get: s => Object.keys(s.explored || {}).length, gifts: { last: { clothes: 'camera' } } }, [3, 6, 10], () => COUNTS.areas || 15),
  finite({ id: 'homes', icon: 'heart', en: 'Homes visited', vi: 'Nhà đã ghé thăm', get: s => Object.keys(s.homesVisited || {}).length }, [1, 3, 6], () => COUNTS.homes || 8),
  { id: 'haircuts', icon: 'scissors', en: 'Haircuts & colours', vi: 'Lần làm tóc', get: s => s.stats.haircuts || 0, tier: doubleOn([1, 3, 8, 15, 30]) },
  { id: 'treats', icon: 'icecream', en: 'Street treats eaten', vi: 'Món vặt đã ăn', get: s => s.stats.treats || 0, tier: doubleOn([1, 5, 15, 40, 100]) },
  finite({ id: 'upgrades', icon: 'hammer', en: 'Shop upgrades', vi: 'Nâng cấp quán', get: s => Object.values(s.biz).reduce((a, b) => a + Math.max(0, (b.level || 1) - 1), 0), gifts: { last: { furniture: 'aquarium_big' } } }, [1, 3, 6, 10, 16, 24, 32], upgradeSlots),
  finite({ id: 'discoveries', icon: 'star', en: 'Things tried', vi: 'Điều đã thử', get: s => Object.keys(s.discovered || {}).length, gifts: { last: { furniture: 'record_player' } } }, [3, 8, 14, 20], () => COUNTS.discoveries || 26),
  finite({ id: 'secrets', icon: 'star', en: 'Island secrets', vi: 'Bí mật của đảo', get: s => (s.achievements || []).filter(id => ACHIEVEMENTS[id]?.hidden).length, gifts: { last: { clothes: 'cat_ears' } } }, [1, 2, 3, 4], () => Object.values(ACHIEVEMENTS).filter(a => a.hidden).length),
];
for (const tr of TRACKS) if (!tr.max) tr.max = null;
export const milestoneReward = i => ({ money: Math.round(60 * Math.pow(1.6, i) / 5) * 5, xp: 40 + i * 35 });
export function trackState(tr) {
  const s = G.state, claimed = s.milestones?.[tr.id] || 0, val = tr.get(s), target = tr.tier(claimed);
  const completed = target === Infinity;
  return { claimed, val, target, completed, ready: !completed && val >= target, prev: claimed ? tr.tier(claimed - 1) : 0, total: tr.finite ? tr.tiers().length : null };
}
// the keepsake for claiming tier i (if any)
export function trackGift(tr, i) {
  const g = tr.gifts; if (!g) return null;
  if (tr.finite && i === tr.tiers().length - 1 && g.last) return g.last;
  return g[i] || null;
}
function giveGift(gift) {
  const s = G.state;
  if (gift.furniture && FURNITURE[gift.furniture]) { (s.home.owned ||= []).push(gift.furniture); return T(FURNITURE[gift.furniture].en, FURNITURE[gift.furniture].vi); }
  if (gift.clothes && CLOTHES[gift.clothes]) {
    const w = s.wardrobe; if (w.owned.includes(gift.clothes)) { addMoney(Math.round(CLOTHES[gift.clothes].price / 2), 'milestone'); return null; }
    w.owned.push(gift.clothes); return T(CLOTHES[gift.clothes].en || gift.clothes, CLOTHES[gift.clothes].vi || gift.clothes);
  }
  return null;
}
export function claimMilestone(id) {
  const tr = TRACKS.find(t => t.id === id), st = trackState(tr);
  if (!st.ready) return null;
  (G.state.milestones ||= {})[id] = st.claimed + 1;
  const r = { ...milestoneReward(st.claimed) };
  addMoney(r.money, 'milestone'); addXP(r.xp, 'milestone');
  const gift = trackGift(tr, st.claimed); if (gift) r.gift = giveGift(gift);
  r.completed = trackState(tr).completed;
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
function celebrate({ lv, reward, gift, unlocks }) {
  return new Promise(res => {
    G.runtime.pause++;
    bus.emit('sfx', 'fanfare');
    const el = document.createElement('div'); el.className = 'levelup';
    const confetti = Array.from({ length: 36 }, (_, i) => `<i style="--x:${(Math.random() * 2 - 1).toFixed(2)};--d:${(0.6 + Math.random() * 0.9).toFixed(2)}s;--r:${Math.floor(Math.random() * 360)}deg;--c:${['#ffd35a', '#f36d86', '#6fbfb0', '#8fb7e0', '#b9e07a'][i % 5]}"></i>`).join('');
    el.innerHTML = `<div class="lu-rays"></div><div class="lu-confetti">${confetti}</div>
      <div class="lu-card"><small>${T('LEVEL UP!', 'LÊN CẤP!')}</small><div class="lu-num"><span>${lv - 1}</span><b>${lv}</b></div>
      <div class="lu-reward"><span class="coin"></span>+${money(reward)}</div>
      ${gift && FURNITURE[gift] ? `<div class="lu-reward">🎁 ${T(`A gift for your home: ${FURNITURE[gift].en}`, `Quà cho ngôi nhà: ${FURNITURE[gift].vi}`)}</div>` : ''}
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
