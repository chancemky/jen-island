// The Island Board: a cork noticeboard on Wind Plaza where neighbours pin small requests.
// Three fresh notes every island day (the same three for the whole day, picked from the
// day number), a fourth once you have lots of friends. Take a note, do it, and the
// neighbour thanks you: money that grows with the story, friendship, now and then a
// little present. Bring-notes are handed in at the board; counting notes finish on their own.

import { G, T, addMoney, addMat, addPantry, pantry, mats, markDirty } from './state.js';
import { RESIDENTS } from '../data/looks.js';
import { INGREDIENTS, MATERIALS, RECIPES, BUSINESSES, recipeName } from '../data/game.js';
import { befriend, FRIEND_LEVELS, friendLevel } from './friends.js';
import { ingredientsForBiz, bizRecipes } from './business.js';
import { FISH } from './fishing.js';
import { bus, rng } from '../core/util.js';
import { addXP } from './progress.js';
import { track } from './telemetry.js';

export { BOARD } from '../world/island.js';
export const boardOpen = () => !!G.state?.story?.flags?.freeRoam;

// what neighbours say on their notes ({n} {item})
const LINES = {
  bring: [
    ['Could someone spare {n} {item}? Mine ran out mid-recipe!', 'Ai cho mình xin {n} {item} với? Đang nấu dở thì hết mất!'],
    ['Looking for {n} {item} for a family dinner. Will pay well!', 'Cần {n} {item} cho bữa cơm gia đình. Trả hậu hĩnh!'],
    ['{n} {item}, please. Don\'t ask why. (It\'s for a surprise.)', 'Xin {n} {item}. Đừng hỏi tại sao. (Bí mật bất ngờ đó.)'],
  ],
  mats: [
    ['My fence fell over in the wind. {n} {item} would fix it.', 'Gió thổi đổ hàng rào rồi. Có {n} {item} là sửa được.'],
    ['Building a little shelf for my plants. Need {n} {item}!', 'Đóng cái kệ nhỏ cho mấy chậu cây. Cần {n} {item}!'],
  ],
  serve: [
    ['The island looks hungry today. Serve {n} customers anywhere?', 'Hôm nay cả đảo đói bụng. Phục vụ {n} vị khách ở đâu cũng được nha?'],
    ['My cousins are visiting! Please keep {n} customers happy today.', 'Họ hàng mình ra chơi! Giúp phục vụ {n} vị khách hôm nay nha.'],
  ],
  perfect: [
    ['A food critic is in town, shh! Make {n} perfect orders today.', 'Có nhà phê bình ẩm thực trên đảo, suỵt! Làm {n} món hoàn hảo hôm nay nha.'],
  ],
  dish: [
    ['I\'m craving {item}. Could you sell {n} of them today?', 'Thèm {item} quá. Hôm nay bán {n} phần được không?'],
    ['Telling everyone about your {item}! Serve {n} today?', 'Mình kể với cả xóm về món {item} của bạn! Hôm nay bán {n} phần nha?'],
  ],
  fish: [
    ['Mèo Mây keeps staring at me. Catch {n} fish for the poor cat?', 'Mèo Mây cứ nhìn mình hoài. Câu giúp {n} con cá cho bé mèo nha?'],
  ],
};
const PRESENTS = [
  ['lantern', 1, 'mat'], ['paint', 2, 'mat'], ['wood', 3, 'mat'],
];

// neighbours who can post: the main village, plus the far shores once their bridge is built
function posters() {
  const f = G.state.story.flags;
  return Object.keys(RESIDENTS).filter(id => !RESIDENTS[id].region || f[RESIDENTS[id].region]);
}
const ownedBiz = () => Object.keys(BUSINESSES).filter(id => G.state.biz[id]?.owned);
const chapterPay = base => Math.round(base * (1 + 0.12 * Math.max(0, (G.state.story.chapter || 1) - 1)) / 5) * 5;

function makeNote(kind, r, giver, i) {
  const s = G.state, line = LINES[kind][Math.floor(r() * LINES[kind].length)];
  const note = { id: `${s.day}:${i}`, kind, giver, line, n: 1, item: null, got: 0, state: 'open' };
  if (kind === 'bring') {
    const pool = [...new Set(ownedBiz().flatMap(ingredientsForBiz))].filter(k => INGREDIENTS[k].cost >= 1);
    if (!pool.length) return null;
    note.item = pool[Math.floor(r() * pool.length)]; note.n = 4 + Math.floor(r() * 6);
    note.pay = chapterPay(Math.max(30, INGREDIENTS[note.item].cost * note.n * 2.2));
  } else if (kind === 'mats') {
    const pool = ['wood', 'paint', 'metal'].filter(k => MATERIALS[k]);
    note.item = pool[Math.floor(r() * pool.length)]; note.n = 2 + Math.floor(r() * 3);
    note.pay = chapterPay(MATERIALS[note.item].price * note.n * 2 + 20);
  } else if (kind === 'serve') { note.n = 10 + Math.floor(r() * 3) * 5; note.pay = chapterPay(25 + note.n * 3); }
  else if (kind === 'perfect') { note.n = 4 + Math.floor(r() * 4); note.pay = chapterPay(30 + note.n * 7); }
  else if (kind === 'dish') {
    const pool = [...new Set(ownedBiz().flatMap(bizRecipes))].filter(id => s.recipes?.includes(id) && RECIPES[id]);
    if (!pool.length) return null;
    note.item = pool[Math.floor(r() * pool.length)]; note.n = 3 + Math.floor(r() * 4);
    note.pay = chapterPay(20 + RECIPES[note.item].price * note.n * 0.8);
  } else if (kind === 'fish') {
    if (!s.story.flags.fishing) return null;
    note.n = 2 + Math.floor(r() * 2); note.pay = chapterPay(45 + note.n * 10);
  }
  if (r() < 0.25) note.present = PRESENTS[Math.floor(r() * PRESENTS.length)];
  return note;
}
// today's notes (made once per island day and kept in the save, so taking one sticks)
export function todaysNotes() {
  const s = G.state, b = (s.board ||= { day: 0, notes: [] });
  if (b.day === s.day) return b.notes;
  const r = rng(s.day * 7919 + (s.island.name || '').length * 31 + 17), people = posters(), close = people.filter(id => friendLevel(id) >= 3).length;
  const kinds = ['bring', 'serve', 'dish', 'mats', 'perfect', 'fish', 'bring', 'serve'];
  const want = close >= 4 ? 4 : 3, notes = [], used = new Set();
  for (let tries = 0; notes.length < want && tries < 30; tries++) {
    const kind = kinds[Math.floor(r() * kinds.length)];
    if (notes.some(n => n.kind === kind)) continue;
    const giver = people.filter(p => !used.has(p))[Math.floor(r() * (people.length - used.size))];
    if (!giver) break;
    const n = makeNote(kind, r, giver, notes.length);
    if (n) { notes.push(n); used.add(giver); }
  }
  b.day = s.day; b.notes = notes; markDirty();
  return notes;
}
export const freshNotes = () => boardOpen() && todaysNotes().some(n => n.state === 'open');

// ---------------------------------------------------------------- text
export const giverName = n => RESIDENTS[n.giver]?.name || '';
export function itemName(n) {
  if (n.kind === 'bring') return T(INGREDIENTS[n.item].en, INGREDIENTS[n.item].vi).toLowerCase();
  if (n.kind === 'mats') return T(MATERIALS[n.item].en, MATERIALS[n.item].vi).toLowerCase();
  if (n.kind === 'dish') return recipeName(n.item);
  return '';
}
export const noteText = n => T(n.line[0], n.line[1]).replace('{n}', n.n).replace('{item}', itemName(n));
export function have(n) { return n.kind === 'bring' ? pantry(n.item) : n.kind === 'mats' ? mats(n.item) : n.got; }
export const canHandIn = n => n.state === 'taken' && (n.kind === 'bring' || n.kind === 'mats') && have(n) >= n.n;

// ---------------------------------------------------------------- doing them
export function takeNote(n) {
  if (n.state !== 'open') return false;
  n.state = 'taken'; n.got = 0; markDirty(true); track('board_take', { kind: n.kind });
  bus.emit('sfx', 'page');
  return true;
}
// changed your mind: the note goes back on the board for someone else (no hard feelings)
export function dropNote(n) { if (n.state !== 'taken') return false; n.state = 'open'; n.got = 0; markDirty(true); bus.emit('sfx', 'page'); return true; }
export function handIn(n) {
  if (!canHandIn(n)) return null;
  if (n.kind === 'bring') addPantry(n.item, -n.n); else addMat(n.item, -n.n);
  return finish(n);
}
function finish(n) {
  const s = G.state;
  n.state = 'done'; s.stats.boardDone = (s.stats.boardDone || 0) + 1;
  addMoney(n.pay, 'quest'); addXP(25, 'board');
  const up = befriend(n.giver, 2);
  let extra = '';
  if (n.present) { const [id, k] = n.present; addMat(id, k); extra = ` · +${k} ${T(MATERIALS[id]?.en || id, MATERIALS[id]?.vi || id).toLowerCase()}`; }
  markDirty(true); track('board_done', { kind: n.kind });
  bus.emit('sfx', 'success'); if (up) bus.emit('stinger', 'friend');
  bus.emit('toast', { text: T(`${giverName(n)}: "Thank you so much!"`, `${giverName(n)}: "Cảm ơn nhiều nha!"`), sub: `+${n.pay}k${extra}${up ? T(` · now ${FRIEND_LEVELS[up].en}`, ` · giờ là ${FRIEND_LEVELS[up].vi}`) : ''}`, icon: 'heart', ms: 3600 });
  bus.emit('boardDone', n);
  return n;
}
function bump(kind, k = 1, pred = () => true) {
  const s = G.state; if (!s?.board || s.board.day !== s.day) return;
  for (const n of s.board.notes) if (n.state === 'taken' && n.kind === kind && pred(n)) { n.got = Math.min(n.n, n.got + k); markDirty(); if (n.got >= n.n) finish(n); }
}
export function initBoard() {
  G.runtime.boardFresh = freshNotes;           // (the board prop's "!": the island can't import this module)
  bus.on('served', (c, quality) => { bump('serve'); if (quality === 'perfect') bump('perfect'); bump('dish', 1, n => n.item === c?.order?.recipe); });
  bus.on('fish', id => { if (!FISH[id]?.junk) bump('fish'); });
}
