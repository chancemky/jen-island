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
import { FURNITURE, RECIPES, BUSINESSES } from '../data/game.js';
import { lendAHand, buySpeciality, checkInbox } from './together.js';
import { track } from './telemetry.js';
import { present } from '../ui/sheets.js';
import { visitHouse, restoreHome } from './home.js';

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
    G.runtime.friendCode = await cloud.publishShowcase({ player_name: s.player.name, island_name: s.island.name, level: s.level || 1, day: s.day, chapter: s.story.chapter, badge: showcaseBadge(), look: currentLook(), home: { size: s.home.size || 0, style: s.home.style?.house || null, furniture: s.home.furniture, builtins: s.home.builtins, island: { shops: Object.entries(s.biz).filter(([, b]) => b.owned).map(([id, b]) => [id, b.level || 1]), badges: earnedBadges(), served: s.stats.served, regulars: Object.values(s.regulars || {}).filter(r => r.visits >= 3).length, streak: s.streak?.best || 0 } } });
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
    bus.emit('toast', { cat: 'friends', text: T(`${g.from} sent you ${GIFTS[g.kind].en}!`, `${g.from} gửi bạn ${GIFTS[g.kind].vi}!`), sub: what, icon: GIFTS[g.kind].icon, ms: 4200 });
  }
  if (waiting.length) markDirty(true);
}
export async function sendGift(friend, kind) {
  await cloud.sendGift(friend, kind); track('gift_sent', { kind });
  social().giftsSent++; markDirty(true);
}
// counters for the friendship badges (data/badges.js)
export const social = () => (G.state.social ||= { friends: 0, giftsSent: 0, visitsMade: 0, visitorsGot: 0, emotes: 0 });
export function noteFriendCount(n) { if (social().friends !== n) { social().friends = n; markDirty(); } }
// an invite link (…?friend=CODE): add them once you're signed in (a guest keeps it for later)
const INVITE_KEY = 'jenisland.invite';
export async function acceptInvite() {
  const q = new URLSearchParams(location.search).get('friend');
  if (q) { try { localStorage.setItem(INVITE_KEY, q.toUpperCase()); } catch {} history.replaceState(null, '', location.pathname); }
  let code = null; try { code = localStorage.getItem(INVITE_KEY); } catch {}
  if (!code || !online()) return;
  try { localStorage.removeItem(INVITE_KEY); } catch {}
  if (await cloud.addFriend(code).catch(() => null)) { bus.emit('toast', { text: T('New friend added!', 'Đã thêm bạn mới!'), sub: T('Menu → Friends to visit them.', 'Menu → Bạn bè để ghé thăm.'), icon: 'heart' }); track('invite_accepted', {}); }
}
export function initSocial() {
  publishShowcase(); openGifts(); acceptInvite(); setTimeout(showVisitors, 6000); setTimeout(checkInbox, 9000);
  setInterval(() => { publishShowcase(); openGifts(); }, 5 * 60 * 1000);
  bus.on('scene', id => { if (G.runtime.visit && id !== 'house') endVisit(); });
}

// ---- visiting a friend's home: their furniture in the house, and them, waiting inside
let host = null;
export async function visitFriend(id) {
  const f = await cloud.friendHome(id); if (!f) return false;
  G.runtime.visit = { id, name: f.player_name, island: f.island_name, shops: (f.home?.island?.shops || []).map(x => x[0]) };
  visitHouse(f.home?.size || 0, f.home?.style || null);                    // their house, at its own size (no stairs: you visit the ground floor)
  rebuildHouseFurniture(f.home || { furniture: [] });
  const sc = scenes.house;
  host = new Actor({ kind: 'human', look: f.look || {}, name: f.player_name, x: sc.bedPos?.x ?? 150, y: 200, data: { host: true } });
  host.talkable = false; sc.add(host); host.face('down');
  setScene('house', 135, 250, 'up');
  host.x = 150; host.y = 190; host.setAct('wave'); setTimeout(() => host?.setAct(null), 1500);
  bus.emit('toast', { text: T(`Visiting ${f.player_name}'s home`, `Đang thăm nhà ${f.player_name}`), sub: T(f.island_name ? `on ${f.island_name}` : 'Walk out the door to go home.', f.island_name ? `trên ${f.island_name}` : 'Ra cửa để về nhà.'), icon: 'heart', ms: 3600 });
  track('visit', {});
  social().visitsMade++; markDirty(true);
  cloud.leaveVisit(id, 'wave').catch(() => {});
  showEmoteBar();
  return true;
}
function endVisit() {
  if (host) { scenes.house.remove(host); host = null; }
  G.runtime.visit = null;
  bar?.remove(); bar = null; G.runtime.visitHelped = G.runtime.visitBought = false;
  restoreHome();
}

// ---- emotes while visiting: you do it, your friend answers, and they'll see the last one you left
export const EMOTES = {
  wave:    { glyph: '👋', en: 'Wave', vi: 'Vẫy tay', act: 'wave', bubble: 'happy', reply: 'wave' },
  heart:   { glyph: '💖', en: 'Love it', vi: 'Thích quá', emo: 'love', bubble: 'heart', reply: 'heart' },
  laugh:   { glyph: '😆', en: 'Laugh', vi: 'Cười', act: 'laugh', bubble: 'happy', reply: 'laugh' },
  clap:    { glyph: '👏', en: 'Clap', vi: 'Vỗ tay', act: 'clap', bubble: 'sparkle', reply: 'bow' },
  dance:   { glyph: '💃', en: 'Dance', vi: 'Nhảy', act: 'dance', bubble: 'note', reply: 'dance' },
  wow:     { glyph: '😮', en: 'Wow', vi: 'Wow', emo: 'surprised', hop: true, bubble: 'sparkle', reply: 'cheer' },
  yum:     { glyph: '😋', en: 'Yum', vi: 'Ngon', act: 'drink', bubble: 'heart', reply: 'clap' },
  sparkle: { glyph: '✨', en: 'Cheer', vi: 'Cổ vũ', act: 'cheer', bubble: 'sparkle', reply: 'cheer' },
};
function perform(a, id, ms = 1600) {
  const e = EMOTES[id] || { act: id, bubble: 'happy' };
  if (!a) return;
  if (e.act) { a.setAct(e.act); setTimeout(() => a.act === e.act && a.setAct(null), ms); }
  if (e.emo) a.setEmo?.(e.emo, 2);
  if (e.hop) a.doHop?.();
  a.showEmote(e.bubble || 'happy', 1.4);
}
let bar = null, lastSent = 0;
function showEmoteBar() {
  bar?.remove();
  bar = document.createElement('div'); bar.className = 'emote-bar';
  bar.innerHTML = Object.entries(EMOTES).map(([id, e]) => `<button type="button" data-e="${id}" aria-label="${T(e.en, e.vi)}">${e.glyph}</button>`).join('');
  bar.onclick = ev => {
    const id = ev.target.closest('button')?.dataset.e; if (!id || !G.runtime.visit) return;
    bus.emit('sfx', 'pop');
    G.player.face(host && host.x < G.player.x ? 'left' : 'right');
    perform(G.player, id);
    const reply = EMOTES[id].reply;
    setTimeout(() => { if (host) { host.face(G.player.x < host.x ? 'left' : 'right'); perform(host, reply, 1500); } }, 650);
    social().emotes++; markDirty();
    if (Date.now() - lastSent > 3000) { lastSent = Date.now(); cloud.leaveVisit(G.runtime.visit.id, id).catch(() => {}); }
  };
  // lend a hand at their counter, or buy their speciality (they accept it later)
  const v = G.runtime.visit, menu = Object.keys(RECIPES).filter(r => (v.shops || []).some(sid => BUSINESSES[sid]?.biz === RECIPES[r].biz) && RECIPES[r].icon?.startsWith('drink:'));
  const help = document.createElement('button'); help.type = 'button'; help.className = 'eb-wide'; help.textContent = T('🤝 Help out', '🤝 Phụ quán');
  help.onclick = e => { e.stopPropagation(); if (G.runtime.visitHelped) return; G.runtime.visitHelped = true; help.disabled = true; lendAHand(v.id, v.name, menu); };
  const buy = document.createElement('button'); buy.type = 'button'; buy.className = 'eb-wide'; buy.textContent = T('🧋 Their special', '🧋 Món của bạn');
  buy.onclick = async e => { e.stopPropagation(); if (G.runtime.visitBought) return; const r = menu[0] || 'tra_tac'; if (await buySpeciality(v.id, v.name, r)) { G.runtime.visitBought = true; buy.disabled = true; } else bus.emit('toast', { text: T('Not today — maybe tomorrow', 'Hôm nay không được — mai thử lại nhé'), icon: 'heart' }); };
  bar.append(help, buy);
  (document.getElementById('app') || document.body).appendChild(bar);
}
// friends who came by while you were away
async function showVisitors() {
  if (!online()) return;
  let rows = []; try { rows = await cloud.myVisitors(); } catch { return; }
  rows = (rows || []).filter(r => r.player_name);
  if (!rows.length) return;
  cloud.visitsSeen().catch(() => {});
  social().visitorsGot += rows.length; markDirty(true);
  const names = [...new Map(rows.map(r => [r.from_id, r])).values()];
  present(() => new Promise(done => {
  const el = document.createElement('div'); el.className = 'modal';
  el.innerHTML = `<div class="card visitors"><div class="kicker">${T('While you were away', 'Khi bạn vắng nhà')}</div><h2>${T(names.length === 1 ? 'A friend came by!' : `${names.length} friends came by!`, names.length === 1 ? 'Có bạn ghé chơi!' : `${names.length} người bạn ghé chơi!`)}</h2>
    <div class="vis-list">${names.slice(0, 6).map(r => `<div class="vis"><span class="vis-e">${EMOTES[r.emote]?.glyph || '👋'}</span><b>${r.player_name.replace(/[<>&]/g, '')}</b><small>${T(`left a ${EMOTES[r.emote]?.en.toLowerCase() || 'wave'}`, `để lại: ${EMOTES[r.emote]?.vi.toLowerCase() || 'vẫy tay'}`)}</small></div>`).join('')}</div>
    <button class="btn primary" type="button">${T('Aww, thanks!', 'Dễ thương quá!')}</button></div>`;
  (document.getElementById('app') || document.body).appendChild(el);
  bus.emit('sfx', 'sparkle');
  el.querySelector('button').onclick = () => { bus.emit('sfx', 'ui'); el.remove(); done(); };
  }));
}
