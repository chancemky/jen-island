// Rare visitors: now and then (about one island day in four, from Chapter 5) someone or
// something special turns up for the day.
//   · the food critic joins a queue at one of your open shops — a perfect order earns a
//     glowing review: reputation, a big tip and, the first time, the Critic's Choice badge
//   · the travel vlogger films at a shop — serve them and the video brings a stream of
//     tourists to that shop for the rest of the day
//   · a busker plays by the fountain — tip them a song for lucky tips for a few hours
//   · the golden cat naps somewhere on the island — find it and pet it for luck all day
// Meeting all four earns the Rare Spotter badge. What you've met lives in s.rare.

import { G, T, addMoney, addRep, markDirty } from './state.js';
import { bus, rand, choice, chance } from '../core/util.js';
import { BUSINESSES } from '../data/game.js';
import { visitorLook } from '../data/looks.js';
import { Actor } from '../world/actor.js';
import { PLAZA } from '../world/island.js';
import { spawnCustomer, rt } from './business.js';
import { addAnimal, removeAnimal } from './animals.js';
import { addXP } from './progress.js';
import { track } from './telemetry.js';
import { say } from '../ui/dialogue.js';
import { cam } from '../world/render.js';

const R = () => (G.state.rare ||= { seen: {}, day: 0, today: null, critics: 0 });
const say2 = (a, en, vi) => bus.emit('toast', { text: T(en, vi), icon: 'star', cls: 'ach', ms: 4200 });
export const RARE = {
  critic:  { en: 'the food critic', vi: 'nhà phê bình ẩm thực' },
  vlogger: { en: 'the travel vlogger', vi: 'vlogger du lịch' },
  busker:  { en: 'the busker', vi: 'nghệ sĩ đường phố' },
  goldcat: { en: 'the golden cat', vi: 'chú mèo vàng' },
};
const openShops = () => Object.keys(BUSINESSES).filter(id => G.state.biz[id]?.open && BUSINESSES[id].kind !== 'restaurant' && rt(id));
function met(id) {
  const r = R(); if (!r.seen[id]) { r.seen[id] = true; bus.emit('stinger', 'rare'); bus.emit('rareMet', id); }
  r.seen[id] = true; markDirty(true); track('rare_met', { id });
}

// ---------------------------------------------------------------- the critic and the vlogger
const LOOKS = {
  critic: () => ({ ...visitorLook(424242, 'picky'), top: '#3f4a5e', topStyle: 'shirt', coat: '#2f2a30', glasses: '#2f2a30', hat: 'beret', hatColor: '#8a2f3a', bottom: '#2f2a30', bottomLen: 5, backpack: null, camera: null, tote: '#c9955e' }),
  vlogger: () => ({ ...visitorLook(777001, 'tourist'), top: '#ff8fb0', topStyle: 'hoodie', camera: true, hat: 'cap', hatColor: '#ffd35a', bottom: '#6fbfb0', bottomLen: 2, backpack: null }),
};
function bringCustomer(id) {
  const shops = openShops(); if (!shops.length) return false;
  const biz = choice(shops), name = id === 'critic' ? T('Ms. Hạnh, food critic', 'Cô Hạnh, nhà phê bình') : T('Kenji, travel vlogger', 'Kenji, vlogger du lịch');
  const c = spawnCustomer(biz, { special: { id, name, look: LOOKS[id](), personality: id === 'critic' ? 'picky' : 'excited' } });
  if (!c) return false;
  R().today = { id, biz };
  const sparkle = setInterval(() => { if (!c.actor || c.state === 'done' || c.state === 'gone') return clearInterval(sparkle); c.actor.showEmote?.('sparkle', 1); }, 2600);
  bus.emit('toast', id === 'critic'
    ? { text: T(`A food critic is in line at ${BUSINESSES[biz].en}!`, `Có nhà phê bình ẩm thực đang xếp hàng ở ${BUSINESSES[biz].name}!`), sub: T('Make her order perfect…', 'Làm món thật hoàn hảo nhé…'), icon: 'star', ms: 5200 }
    : { text: T(`A travel vlogger is filming at ${BUSINESSES[biz].en}!`, `Một vlogger du lịch đang quay ở ${BUSINESSES[biz].name}!`), sub: T('Serve him and the whole internet hears about it.', 'Phục vụ tốt là cả mạng xã hội biết.'), icon: 'photo', ms: 5200 });
  bus.emit('sfx', 'sparkle');
  return true;
}
function onServed(c, quality, price) {
  if (!c?.special) return;
  const r = R();
  if (c.special === 'critic') {
    met('critic');
    if (quality === 'perfect') {
      r.critics = (r.critics || 0) + 1; addRep(25); addMoney(price * 3, 'tip'); addXP(120, 'critic');
      c.actor?.showEmote?.('heart', 2); bus.emit('stinger', 'award');
      say2(null, '★★★★★ "The best thing I ate all year." — the critic', '★★★★★ "Món ngon nhất năm của tôi." — nhà phê bình');
    } else { addRep(6); say2(null, '★★★☆☆ "Pleasant. Room to grow." — the critic', '★★★☆☆ "Dễ chịu. Còn có thể tốt hơn." — nhà phê bình'); }
  }
  if (c.special === 'vlogger') {
    met('vlogger'); addXP(80, 'vlogger');
    r.trend = { biz: c.bizId, day: G.state.day, until: G.state.time + 5 * 60 };
    say2(null, 'Kenji posted his video — tourists are on their way!', 'Kenji đã đăng video — du khách đang kéo đến!');
  }
  markDirty(true);
}
// the vlogger's video: extra tourists at that shop for a few hours
function trendTick() {
  const t = R().trend, s = G.state;
  if (!t || t.day !== s.day || s.time > t.until || !s.biz[t.biz]?.open || !chance(0.7)) return;
  spawnCustomer(t.biz, { tourist: true });
}

// ---------------------------------------------------------------- the busker by the fountain
let busker = null;
function bringBusker() {
  const isl = G.scenes.island; if (!isl || busker) return false;
  const look = { ...visitorLook(31337, 'tourist'), guitar: true, hat: 'bucket', hatColor: '#6fbfb0', top: '#f7de8c', topStyle: 'tee', backpack: null, camera: null };
  // walks in from out of sight (the ferry path), then sets up by the fountain
  const spot = [PLAZA.x - 70, PLAZA.y + 76], v = cam.view, from = [[PLAZA.x, PLAZA.y + 520], [PLAZA.x - 520, PLAZA.y + 60], [PLAZA.x + 520, PLAZA.y]].find(([x, y]) => !v || x < v.x || x > v.x + v.w || y < v.y || y > v.y + v.h) || [PLAZA.x, PLAZA.y + 520];
  busker = new Actor({ kind: 'human', look, name: T('Busker', 'Nghệ sĩ đường phố'), x: from[0], y: from[1], data: { onTalk: tipBusker, special: 'busker' } });
  busker.talkable = true; isl.add(busker);
  busker.walkTo(isl.nav.path(from[0], from[1], spot[0], spot[1]).concat([spot])).then(() => busker?.face('down'));
  busker.tune = setInterval(() => { if (!busker) return; busker.showEmote('note', 1.4); busker.setAct(chance(0.5) ? 'dance' : null); }, 3000);
  R().today = { id: 'busker' };
  bus.emit('toast', { cat: 'island', text: T('A busker is playing by the fountain', 'Có nghệ sĩ đường phố đang đàn bên đài phun nước'), sub: T('Wind Plaza, today only.', 'Quảng trường gió, chỉ hôm nay.'), icon: 'note', ms: 4600 });
  return true;
}
async function tipBusker(a) {
  const s = G.state, r = R();
  if (r.buskerTip === s.day) { await say(a, T('♪ Thank you, friend! This next one\'s for you too. ♪', '♪ Cảm ơn bạn nhé! Bài tiếp theo cũng tặng bạn. ♪')); return; }
  if (s.money < 5) { await say(a, T('♪ Just listen — music is free! ♪', '♪ Cứ nghe thôi — âm nhạc là miễn phí! ♪')); return; }
  addMoney(-5, 'gift'); r.buskerTip = s.day; met('busker');
  G.runtime.luck = { day: s.day, until: s.time + 4 * 60, tip: 1.2 };
  a.setAct('cheer'); setTimeout(() => a?.setAct(null), 1500); bus.emit('stinger', 'friend');
  await say(a, T('♪ A song for the island\'s best cook! May your tip jar overflow. ♪', '♪ Một bài cho đầu bếp giỏi nhất đảo! Chúc hũ tiền tip của bạn đầy ắp. ♪'));
  say2(null, 'Lucky tune: tips +20% for 4 hours', 'Giai điệu may mắn: tiền tip +20% trong 4 giờ');
}
function dropBusker() { if (!busker) return; clearInterval(busker.tune); G.scenes.island?.remove(busker); busker = null; }

// ---------------------------------------------------------------- the golden cat
const CAT_SPOTS = [[700, 1700], [1180, 1320], [520, 760], [1500, 2180], [880, 380], [1300, 1950], [360, 1900]];
let cat = null;
function bringCat() {
  if (cat) return false;
  const [x, y] = choice(CAT_SPOTS);
  cat = addAnimal('cat', x, y, { col: '#f2c14e', golden: true, idle: 'nap', state: 'idle', until: 9999, hx: x, hy: y });
  R().today = { id: 'goldcat' };
  bus.emit('toast', { cat: 'island', text: T('Someone saw a golden cat on the island…', 'Có người thấy một chú mèo vàng trên đảo…'), sub: T('They say petting it brings luck. Look around!', 'Nghe nói vuốt ve nó sẽ gặp may. Tìm thử xem!'), icon: 'paw', ms: 5200 });
  return true;
}
export function rareAction(pl) {
  if (!cat || G.scene !== G.scenes.island || Math.hypot(cat.x - pl.x, cat.y - pl.y) > 34) return null;
  return { label: T('Pet the golden cat', 'Vuốt ve mèo vàng'), icon: 'paw', run: petCat };
}
function petCat() {
  const s = G.state, c = cat; if (!c) return;
  met('goldcat'); addXP(60, 'goldcat');
  G.runtime.luck = { day: s.day, until: 30 * 60, tip: 1.25 };
  c.react = { t: 0, text: T('Purrrr ✨', 'Rừ rừ ✨') }; bus.emit('sfx', 'mew');
  say2(null, 'The golden cat purrs. Lucky day: tips +25% until tomorrow!', 'Mèo vàng rừ rừ. Ngày may mắn: tiền tip +25% tới mai!');
  setTimeout(() => { if (cat === c) { removeAnimal(c); cat = null; } }, 2500);       // …and off it goes
}

// ---------------------------------------------------------------- once a day
function rollToday() {
  const s = G.state, r = R();
  if (r.day === s.day || !s.story.flags.freeRoam || (s.story.chapter || 1) < 5) return;
  const h = s.time / 60; if (h < 9 || h > 17) return;
  r.day = s.day; r.today = null; markDirty();
  if (!chance(0.26)) return;
  const order = ['critic', 'vlogger', 'busker', 'goldcat'].sort(() => Math.random() - 0.5).sort((a, b) => !!r.seen[a] - !!r.seen[b]);   // someone new first
  for (const id of order) if ({ critic: () => bringCustomer('critic'), vlogger: () => bringCustomer('vlogger'), busker: bringBusker, goldcat: bringCat }[id]()) return;
}
export const rareSeen = () => Object.keys(RARE).filter(id => R().seen[id]);
// (tests and the dev tools) bring one now
export function bringRare(id) { R().day = G.state.day; return { critic: () => bringCustomer('critic'), vlogger: () => bringCustomer('vlogger'), busker: bringBusker, goldcat: bringCat }[id]?.(); }
export function initRare() {
  bus.on('hour', () => { rollToday(); trendTick(); });
  bus.on('served', onServed);
  bus.on('dayEnd', () => { dropBusker(); if (cat) { removeAnimal(cat); cat = null; } });
  setInterval(trendTick, 9000);
}
