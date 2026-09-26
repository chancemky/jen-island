// Street-cart grandmas. Each little cart has a friendly bà behind it selling
// one cheap treat. Buying it doesn't go in any bag: you eat or drink it right
// there with a happy little animation.

import { G, T, addMoney, canAfford } from './state.js';
import { Actor } from '../world/actor.js';
import { say, ask } from '../ui/dialogue.js';
import { sfx } from '../core/audio.js';
import { sleep, choice, money } from '../core/util.js';
import { addXP } from './progress.js';
import { fx } from '../world/render.js';

const GRANNY = (top, apron, hair = '#d8d2d6', hat = null) => ({ skin: '#f1c6a4', eyeCol: '#8a5a40', hair, hairStyle: 'granny', top, topStyle: 'shirt', apron, bottom: '#3f4a5e', bottomLen: 5, shoe: '#7a5040', scale: 0.93, glasses: '#8a6a5a', hat, hatColor: '#efd69a' });

export const VENDORS = {
  icecream: {
    name: 'Bà Năm', x: 990, y: 1810, look: GRANNY('#f4a9b8', '#fffaf0'),
    hi: [['Kem đây, kem đây! Cold and sweet, just for you, cháu.', 'Kem đây, kem đây! Mát lạnh ngọt lịm nè cháu.'], ['Hot day? Bà Năm has the cure.', 'Trời nóng hả? Có Bà Năm lo.']],
    menu: [{ id: 'icecream', en: 'Strawberry & vanilla', vi: 'Kem dâu vani', price: 5 }, { id: 'icecream_b', en: 'Pandan & coconut', vi: 'Kem lá dứa dừa', price: 5 }, { id: 'icecream_c', en: 'Chocolate & durian', vi: 'Kem sô-cô-la sầu riêng', price: 6 }],
    act: 'eat', done: [['Mmm! Brain freeze… worth it!', 'Ưm! Tê cả óc… mà đáng lắm!'], ['So cold, so good!', 'Lạnh buốt mà ngon ghê!']],
  },
  sugarcane: {
    name: 'Bà Hai', x: 992, y: 2096, look: GRANNY('#b9d7a0', '#f7de8c', '#c9c2c6', 'nonla'),
    hi: [['Nước mía! Pressed fresh while you wait.', 'Nước mía đây! Ép tươi liền tay nè.'], ['A cup of sugarcane juice keeps the heat away, con.', 'Một ly nước mía là hết nóng liền con ơi.']],
    menu: [{ id: 'sugarcane', en: 'Sugarcane juice', vi: 'Nước mía', price: 4 }, { id: 'sugarcane', en: 'With kumquat', vi: 'Nước mía tắc', price: 5 }],
    act: 'drink', done: [['Ahh, so refreshing!', 'Aaa, mát cả người!'], ['Sweet and zesty!', 'Ngọt thanh luôn!']],
  },
  banhtrang: {
    name: 'Bà Út', x: 868, y: 1928, look: GRANNY('#f7de8c', '#e9c9a2', '#b9b3ba'),
    hi: [['Bánh tráng trộn! Rice paper salad with mango, quail egg and a little chili.', 'Bánh tráng trộn đây! Có xoài, trứng cút với chút ớt nè.'], ['The schoolkids line up for this every afternoon. Try it, cháu!', 'Chiều nào học trò cũng xếp hàng mua. Ăn thử đi cháu!']],
    menu: [{ id: 'banhtrang', en: 'Rice paper salad', vi: 'Bánh tráng trộn', price: 5 }, { id: 'banhtrang', en: 'Extra spicy', vi: 'Cay thật cay', price: 6 }],
    act: 'eat', done: [['Sweet, sour, crunchy… so good!', 'Chua chua, ngọt ngọt, giòn giòn… ngon quá!'], ['Whoa, spicy! In a good way!', 'Oa, cay! Mà cay ngon!']],
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
export function updateVendors(dt) {
  for (const v of Object.values(VENDORS)) {
    const a = v.actor; if (!a || a.data.busy) continue;
    a.data.t = (a.data.t || 1 + Math.random() * 3) - dt;
    if (a.data.t > 0) continue;
    a.data.t = 3 + Math.random() * 5;
    const pl = G.player, near = pl && Math.hypot(pl.x - a.x, pl.y - a.y) < 70;
    if (near && Math.random() < 0.5) { a.face('down'); a.setAct('wave'); a.showEmote('happy', 1.2); setTimeout(() => a.setAct(null), 1100); }
    else if (Math.random() < 0.35) { a.setAct(v === VENDORS.sugarcane ? 'stir' : 'clean'); setTimeout(() => a.setAct(null), 1600); }
    else a.face(choice(['down', 'down', 'left', 'right']));
  }
}

// a treat, eaten on the spot: a few bites over ~3 seconds
async function consume(v, item) {
  const pl = G.player;
  pl.control = false;
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
  } finally { pl.control = true; pl.bites = 0; }
}

export async function talkToVendor(a) {
  const v = VENDORS[a.data.cart]; if (!v) return;
  a.data.busy = true;
  try {
    a.face('down'); a.setEmo('happy', 2); a.showEmote('happy', 1.2);
    const opts = [...v.menu.map(m => `${T(m.en, m.vi)} · ${money(m.price)}`), T('Just saying hi', 'Chào bà thôi ạ')];
    const pick = await ask(a, tt(choice(v.hi)), opts, { emo: 'happy' });
    const item = v.menu[pick];
    if (!item) { await say(a, T('Ah, such a polite child! Come back when you\'re hungry.', 'Ôi, ngoan quá! Đói thì ghé bà nha.')); return; }
    if (!canAfford(item.price)) { sfx('error'); await say(a, T('Short on coins? Next time, dear.', 'Hết tiền hả? Lần sau nha cháu.')); return; }
    addMoney(-item.price, 'snack'); sfx('coin');
    a.setAct('hold', item.id); await sleep(500); a.setAct('wave'); setTimeout(() => a.setAct(null), 800);
    await say(a, T('Here you go! Enjoy it while it\'s fresh.', 'Của con đây! Ăn liền cho ngon nha.'));
    return item;
  } finally { a.data.busy = false; }
}
export async function buyFromVendor(a) {
  const item = await talkToVendor(a);
  if (item) await consume(VENDORS[a.data.cart], item);
}
