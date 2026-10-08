// Street-cart grandmas. Each little cart has a friendly bà behind it selling
// one cheap treat. Buying it doesn't go in any bag: you eat or drink it right
// there with a happy little animation.

import { lockInput, releaseInput } from '../core/locks.js';
import { G, T, addMoney, canAfford } from './state.js';
import { Actor } from '../world/actor.js';
import { say, ask } from '../ui/dialogue.js';
import { sfx } from '../core/audio.js';
import { sleep, choice, money } from '../core/util.js';
import { addXP } from './progress.js';
import { fx } from '../world/render.js';
import { CART_CLOSED } from '../gfx/props.js';
import { BUILDINGS } from '../world/island.js';

const GRANNY = (top, apron, hair = '#d8d2d6', hat = null) => ({ skin: '#f1c6a4', eyeCol: '#8a5a40', hair, hairStyle: 'granny', top, topStyle: 'shirt', apron, bottom: '#3f4a5e', bottomLen: 5, shoe: '#7a5040', scale: 0.93, glasses: '#8a6a5a', hat, hatColor: '#efd69a' });

export const VENDORS = {
  icecream: {
    name: 'Bà Năm', x: 990, y: 1810, look: GRANNY('#f4a9b8', '#fffaf0'),
    hi: [['Kem đây, kem đây! Cold and sweet, just for you, cháu.', 'Kem đây, kem đây! Mát lạnh ngọt lịm nè cháu.'], ['Hot day? Bà Năm has the cure.', 'Trời nóng hả? Có Bà Năm lo.']],
    menu: [{ id: 'icecream', en: 'Strawberry & vanilla', vi: 'Kem dâu vani', price: 5 }, { id: 'icecream_b', en: 'Pandan & coconut', vi: 'Kem lá dứa dừa', price: 5 }, { id: 'icecream_c', en: 'Chocolate & durian', vi: 'Kem sô-cô-la sầu riêng', price: 6 }],
    act: 'eat', done: [['Mmm! Brain freeze… worth it!', 'Ưm! Tê cả óc… mà đáng lắm!'], ['So cold, so good!', 'Lạnh buốt mà ngon ghê!']],
  },
  corn: {
    name: 'Bà Hai', x: 992, y: 2096, look: GRANNY('#b9d7a0', '#f7de8c', '#c9c2c6', 'nonla'),
    hi: [['Bắp nướng! Grilled corn with scallion oil, hot off the coals.', 'Bắp nướng mỡ hành đây! Nóng hổi vừa thổi vừa ăn.'], ['Smell that? That\'s the best corn on the island, con.', 'Thơm chưa? Bắp ngon nhất đảo đó con.']],
    menu: [{ id: 'corn', en: 'Grilled corn', vi: 'Bắp nướng', price: 4 }, { id: 'corn', en: 'With scallion oil', vi: 'Bắp nướng mỡ hành', price: 5 }],
    act: 'eat', done: [['Smoky and sweet!', 'Thơm khói mà ngọt ghê!'], ['Butter… scallions… perfect.', 'Mỡ hành… ngon hết sảy.']],
  },
  xoi: {
    name: 'Bà Út', x: 868, y: 1928, look: GRANNY('#f7de8c', '#e9c9a2', '#b9b3ba'),
    hi: [['Xôi đây! Sticky rice — gấc, mung bean or pandan, wrapped in a banana leaf.', 'Xôi đây! Xôi gấc, xôi đậu xanh, xôi lá dứa, gói lá chuối nè.'], ['A handful of xôi keeps you going till lunch, cháu.', 'Một gói xôi là no tới trưa đó cháu.']],
    menu: [{ id: 'xoi', en: 'Mung bean sticky rice', vi: 'Xôi đậu xanh', price: 5 }, { id: 'xoi', en: 'Red gấc sticky rice', vi: 'Xôi gấc', price: 6 }],
    act: 'eat', done: [['Soft, warm and filling!', 'Dẻo, ấm, no bụng!'], ['Just like grandma makes.', 'Y như bà nấu.']],
  },
};
const tt = p => T(p[0], p[1]);

export function spawnVendors(island) {
  for (const [id, v] of Object.entries(VENDORS)) {
    const a = new Actor({ kind: 'human', look: v.look, name: v.name, x: v.x, y: v.y, data: { cart: id } });
    a.talkable = true; a.face('down');
    island.add(a); v.actor = a;
  }
}
// The carts close at 11 pm: each grandma covers her cart and walks home to the
// nearest house, then comes back to open up in the morning.
const OPEN_H = 6.5, CLOSE_H = 23;
function homeDoor(v) {
  if (v.home) return v.home;
  let best = null, bd = Infinity;
  for (const b of BUILDINGS) if (b.type === 'house' && !b.region && b.id !== 'house') { const d = Math.hypot(b.x - v.x, b.y - v.y); if (d < bd) { bd = d; best = b; } }
  return (v.home = best ? { x: best.x, y: best.y + 12 } : { x: v.x, y: v.y + 200 });
}
function vendorHours(v, a) {
  const h = G.state.time / 60, open = h >= OPEN_H && h < CLOSE_H, island = G.scenes?.island, d = a.data;
  if (!island) return false;
  if (!open && !d.away && !d.walking) {
    CART_CLOSED[a.data.cart] = true;
    if (a.sit) { a.sit = false; a.seatH = undefined; }
    a.setAct(null); a.talkable = false; d.walking = true;
    const door = homeDoor(v);
    a.walkTo(island.nav.path(a.x, a.y, door.x, door.y)).then(() => { a.visible = false; d.away = true; d.walking = false; });
    return true;
  }
  if (open && d.away && !d.walking) {
    const door = homeDoor(v);
    a.x = door.x; a.y = door.y; a.visible = true; a.alpha = 0; a.fadeIn = true; d.walking = true;
    a.walkTo(island.nav.path(a.x, a.y, v.x, v.y)).then(() => { a.x = v.x; a.y = v.y; a.face('down'); d.away = false; d.walking = false; a.talkable = true; CART_CLOSED[a.data.cart] = false; });
    return true;
  }
  return d.away || d.walking;
}
export function updateVendors(dt) {
  for (const v of Object.values(VENDORS)) {
    const a = v.actor; if (!a) continue;
    if (a.data.busy) continue;
    if (vendorHours(v, a)) continue;
    a.data.t = (a.data.t || 1 + Math.random() * 3) - dt;
    if (a.data.t > 0) continue;
    a.data.t = 3 + Math.random() * 5;
    const pl = G.player, near = pl && Math.hypot(pl.x - a.x, pl.y - a.y) < 70;
    if (near && Math.random() < 0.5) { a.face('down'); a.setAct('wave'); a.showEmote('happy', 1.2); setTimeout(() => a.setAct(null), 1100); }
    else if (Math.random() < 0.35) { a.setAct(v === VENDORS.corn ? 'stir' : 'clean'); setTimeout(() => a.setAct(null), 1600); }
    else a.face(choice(['down', 'down', 'left', 'right']));
  }
}

// a treat, eaten on the spot: a few bites over ~3 seconds
async function consume(v, item) {
  const pl = G.player;
  lockInput('snack');
  try {
    pl.face('down'); pl.bites = 0;
    pl.setAct(v.act, item.id);
    const n = 4;
    for (let i = 0; i < n; i++) {
      await sleep(700);
      pl.bites = Math.min(3, i + 1);
      sfx(v.act === 'drink' ? 'slurp' : 'munch');
      if (v.act === 'eat') fx.burst('spark', pl.x + 4, pl.y - 30, 3, { up: 14, col: '#fff3d6' });
    }
    pl.setAct(null); pl.bites = 0;
    pl.setEmo('happy', 2); pl.showEmote('heart', 1.4); pl.doHop(60);
    sfx('pop'); addXP(2, 'snack'); G.state.stats.treats = (G.state.stats.treats || 0) + 1;
    await say(pl, tt(choice(v.done)), { emo: 'happy' });
  } finally { releaseInput('snack'); pl.bites = 0; }
}

export async function talkToVendor(a) {
  const v = VENDORS[a.data.cart]; if (!v) return;
  a.data.busy = true;
  try {
    a.face('down'); a.setEmo('happy', 2); a.showEmote('happy', 1.2);
    // they remember your favourite: after a few, it's "the usual" and a coin off
    const sn = (G.state.snacks ||= {}), favId = Object.keys(sn).filter(k => v.menu.some(m => m.id === k)).sort((x, y) => sn[y] - sn[x])[0], fav = favId && sn[favId] >= 4 ? favId : null;
    const priceOf = m => Math.max(1, m.price - (m.id === fav ? 1 : 0));
    const opts = [...v.menu.map(m => `${T(m.en, m.vi)} · ${money(priceOf(m))}${m.id === fav ? ' ♥' : ''}`), T('Just saying hi', 'Chào bà thôi ạ')];
    const pick = await ask(a, fav ? T(`Ah, it's you! The usual ${T(v.menu.find(m => m.id === fav).en, '')}? A coin off for my favourite customer.`, `A, con đó hả! Như mọi khi — ${v.menu.find(m => m.id === fav).vi}? Bớt con một đồng nha.`) : tt(choice(v.hi)), opts, { emo: 'happy' });
    const item = v.menu[pick];
    if (!item) { await say(a, T('Ah, such a polite child! Come back when you\'re hungry.', 'Ôi, ngoan quá! Đói thì ghé bà nha.')); return; }
    const price = priceOf(item);
    if (!canAfford(price)) { sfx('error'); await say(a, T('Short on coins? Next time, dear.', 'Hết tiền hả? Lần sau nha cháu.')); return; }
    addMoney(-price, 'snack'); sfx('coin');
    sn[item.id] = (sn[item.id] || 0) + 1; if (sn[item.id] === 4) import('./interact.js').then(m => m.discover('snack'));
    a.setAct('hold', item.id); await sleep(500); a.setAct('wave'); setTimeout(() => a.setAct(null), 800);
    await say(a, v.act === 'drink' ? T('Here you go! Drink it while it\'s nice and cold.', 'Của con đây! Uống liền cho mát nha.') : T('Here you go! Enjoy it while it\'s fresh.', 'Của con đây! Ăn liền cho ngon nha.'));
    return item;
  } finally { a.data.busy = false; }
}
export async function buyFromVendor(a) {
  const item = await talkToVendor(a);
  if (item) await consume(VENDORS[a.data.cart], item);
}
