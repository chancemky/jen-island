// Friends: your showcase (names, level, badge, look and home layout) is published under
// a friend code; friends can visit each other's homes and send one gift a day.

import { G, T, addPantry, addMat, markDirty } from './state.js';
import * as cloud from './cloud.js';
import { bus } from '../core/util.js';
import { showcaseBadge, earnedBadges } from './badges.js';
import { currentLook } from '../ui/clothes.js';
import { rebuildHouseFurniture } from '../ui/decorate.js';
import { scenes, setScene } from './scenes.js';
import { Actor } from '../world/actor.js';
import { FURNITURE } from '../data/game.js';
import { track } from './telemetry.js';

export const GIFTS = {
  basket: { icon: 'bag', label: ['Basket', 'Giỏ quà'], en: 'a gift basket', vi: 'một giỏ quà', give: () => { addPantry('tea', 6); addPantry('kumquat', 6); addPantry('sugar', 6); addPantry('ice', 6); return T('tea, kumquats, sugar and ice', 'trà, tắc, đường và đá'); } },
  flowers: { icon: 'heart', label: ['Flowers', 'Hoa'], en: 'a pot of flowers', vi: 'một chậu hoa', give: () => { (G.state.home.owned ||= []).push(FURNITURE.plant_big ? 'plant_big' : 'plant'); return T('a potted plant for your home', 'một chậu cây cho nhà bạn'); } },
  lanterns: { icon: 'lantern', label: ['Lanterns', 'Lồng đèn'], en: 'silk lanterns', vi: 'lồng đèn lụa', give: () => { addMat('lantern', 2); return T('2 silk lanterns', '2 lồng đèn lụa'); } },
};
export const myCode = () => G.runtime.friendCode || null;
const online = () => cloud.hasSession() && G.user && !G.user.local;

// publish what friends see (on start, and every few minutes while playing)
export async function publishShowcase() {
  if (!online() || !G.state.player.name) return;
  const s = G.state;
  try {
    G.runtime.friendCode = await cloud.publishShowcase({ player_name: s.player.name, island_name: s.island.name, level: s.level || 1, day: s.day, chapter: s.story.chapter, badge: showcaseBadge(), look: currentLook(), home: { furniture: s.home.furniture, builtins: s.home.builtins, island: { shops: Object.entries(s.biz).filter(([, b]) => b.owned).map(([id, b]) => [id, b.level || 1]), badges: earnedBadges(), served: s.stats.served, regulars: Object.values(s.regulars || {}).filter(r => r.visits >= 3).length, streak: s.streak?.best || 0 } } });
  } catch (e) { console.warn('showcase', e.message); }
}
// gifts friends sent: open them all at once
export async function openGifts() {
  if (!online()) return;
  let waiting = [];
  try { waiting = await cloud.giftsWaiting(); } catch { return; }
  for (const g of waiting) {
    if (!GIFTS[g.kind] || !(await cloud.claimGift(g.id).catch(() => false))) continue;
    const what = GIFTS[g.kind].give();
    bus.emit('toast', { text: T(`${g.from} sent you ${GIFTS[g.kind].en}!`, `${g.from} gửi bạn ${GIFTS[g.kind].vi}!`), sub: what, icon: GIFTS[g.kind].icon, ms: 4200 });
  }
  if (waiting.length) markDirty(true);
}
export async function sendGift(friend, kind) {
  await cloud.sendGift(friend, kind); track('gift_sent', { kind });
}
// an invite link (…?friend=CODE): add them once you're signed in (a guest keeps it for later)
const INVITE_KEY = 'jenisland.invite';
async function acceptInvite() {
  const q = new URLSearchParams(location.search).get('friend');
  if (q) { try { localStorage.setItem(INVITE_KEY, q.toUpperCase()); } catch {} history.replaceState(null, '', location.pathname); }
  let code = null; try { code = localStorage.getItem(INVITE_KEY); } catch {}
  if (!code || !online()) return;
  try { localStorage.removeItem(INVITE_KEY); } catch {}
  if (await cloud.addFriend(code).catch(() => null)) { bus.emit('toast', { text: T('New friend added!', 'Đã thêm bạn mới!'), sub: T('Menu → Friends to visit them.', 'Menu → Bạn bè để ghé thăm.'), icon: 'heart' }); track('invite_accepted', {}); }
}
export function initSocial() {
  publishShowcase(); openGifts(); acceptInvite();
  setInterval(() => { publishShowcase(); openGifts(); }, 5 * 60 * 1000);
  bus.on('scene', id => { if (G.runtime.visit && id !== 'house') endVisit(); });
}

// ---- visiting a friend's home: their furniture in the house, and them, waiting inside
let host = null;
export async function visitFriend(id) {
  const f = await cloud.friendHome(id); if (!f) return false;
  G.runtime.visit = { id, name: f.player_name, island: f.island_name };
  rebuildHouseFurniture(f.home || { furniture: [] });
  const sc = scenes.house;
  host = new Actor({ kind: 'human', look: f.look || {}, name: f.player_name, x: sc.bedPos?.x ?? 150, y: 200, data: { host: true } });
  host.talkable = false; sc.add(host); host.face('down');
  setScene('house', 135, 250, 'up');
  host.x = 150; host.y = 190; host.setAct('wave'); setTimeout(() => host?.setAct(null), 1500);
  bus.emit('toast', { text: T(`Visiting ${f.player_name}'s home`, `Đang thăm nhà ${f.player_name}`), sub: T(f.island_name ? `on ${f.island_name}` : 'Walk out the door to go home.', f.island_name ? `trên ${f.island_name}` : 'Ra cửa để về nhà.'), icon: 'heart', ms: 3600 });
  track('visit', {});
  return true;
}
function endVisit() {
  if (host) { scenes.house.remove(host); host = null; }
  G.runtime.visit = null;
  rebuildHouseFurniture();
}
