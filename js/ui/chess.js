// The chess corner on Wind Plaza: most mornings (7:00–11:00) Ông Lộc and Bà Tư play cờ tướng
// at a little table west of the fountain. Ông Lộc sets you a puzzle — red to move and checkmate
// in one. Every puzzle has exactly one winning move (checked by the rules engine,
// core/xiangqi.js, and by the test suite). One new puzzle a day; solve them all for his old
// chess set.
import { G, T, markDirty, addMoney } from '../systems/state.js';
import { setup, legal, move, mated, key, matesInOne } from '../core/xiangqi.js';
import { present } from './sheets.js';
import { sfx } from '../core/audio.js';
import { bus, dist, jstDayNum } from '../core/util.js';
import { addXP } from '../systems/progress.js';
import { befriend } from '../systems/friends.js';
import { RESIDENTS } from '../data/looks.js';
import { drawHuman } from '../gfx/character.js';

export const CHESS_SPOT = { x: 720, y: 1560 };
export const PUZZLES = [
  ['G4,0 b', 'G3,9 r', 'R0,1 r', 'R8,5 r'],
  ['G3,0 b', 'A4,1 b', 'G5,9 r', 'R0,1 r', 'H2,3 r'],
  ['G4,0 b', 'A3,0 b', 'A5,0 b', 'G3,9 r', 'C4,5 r', 'C1,7 r', 'R6,2 r'],
  ['G4,0 b', 'G4,8 r', 'A3,2 b', 'A4,1 b', 'C2,4 r', 'R8,4 r'],
  ['G3,0 b', 'G4,8 r', 'A3,2 b', 'H7,1 r', 'R3,4 r'],
  ['G5,1 b', 'G4,8 r', 'A5,2 b', 'A4,1 b', 'C4,5 r', 'H2,3 r'],
  ['G3,0 b', 'G4,8 r', 'H3,5 r', 'C8,3 r', 'H5,0 r'],
  ['G5,0 b', 'G4,9 r', 'R4,1 r', 'S3,2 r', 'R3,6 r'],
];
const GLYPH = { G: ['帥', '將'], A: ['仕', '士'], E: ['相', '象'], H: ['傌', '馬'], R: ['俥', '車'], C: ['炮', '砲'], S: ['兵', '卒'] };
const NAME = { G: ['General', 'Tướng'], A: ['Advisor', 'Sĩ'], E: ['Elephant', 'Tượng'], H: ['Horse', 'Mã'], R: ['Chariot', 'Xe'], C: ['Cannon', 'Pháo'], S: ['Soldier', 'Tốt'] };
const hour = () => G.state.time / 60;
export const chessOpen = () => hour() >= 7 && hour() < 11 && !!G.state.story?.flags?.freeRoam;
const C = () => (G.state.chess ||= { solved: 0, day: -1 });

export function chessAction(pl) {
  if (G.scene !== G.scenes.island || !chessOpen() || dist(pl.x, pl.y, CHESS_SPOT.x, CHESS_SPOT.y + 16) > 46) return null;
  const c = C();
  if (c.solved >= PUZZLES.length) return { label: T('Watch the game', 'Xem cờ'), icon: 'star', run: () => present(() => card(null)) };
  if (c.day === jstDayNum()) return { label: T('Watch the game', 'Xem cờ'), icon: 'star', run: () => bus.emit('toast', { text: T('Ông Lộc: "One puzzle a day. Tomorrow, another!"', 'Ông Lộc: “Mỗi ngày một thế cờ. Mai có thế khác!”'), icon: 'star', now: true }) };
  return { label: T('Cờ tướng puzzle', 'Giải thế cờ tướng'), icon: 'star', run: () => present(() => card(c.solved)) };
}

function card(n) {
  return new Promise(done => {
    const el = document.createElement('div'); el.className = 'modal chess';
    const B0 = n == null ? null : setup(PUZZLES[n]);
    el.innerHTML = `<div class="card"><div class="kicker">♟️ ${T('Ông Lộc\'s chess corner', 'Góc cờ của Ông Lộc')}</div>
      <p class="ch-msg">${n == null ? T('"You\'ve solved every puzzle I know. Now you set me one!"', '“Con giải hết các thế cờ ông biết rồi. Giờ con ra đề cho ông đi!”') : T(`Puzzle ${n + 1} of ${PUZZLES.length}: red to move — checkmate in one.`, `Thế cờ ${n + 1}/${PUZZLES.length}: đỏ đi — chiếu bí trong một nước.`)}</p>
      ${B0 ? '<canvas width="540" height="600"></canvas>' : ''}<button class="btn ghost" type="button">${T('Close', 'Đóng')}</button></div>`;
    (document.getElementById('app') || document.body).appendChild(el);
    const close = () => { el.remove(); done(); };
    el.querySelector('.btn').onclick = close;
    if (!B0) return;
    const cv = el.querySelector('canvas'), c = cv.getContext('2d'), msg = el.querySelector('.ch-msg');
    const S = 56, OX = 46, OY = 48;              // spacing and margins (in canvas pixels)
    let B = B0, sel = null, moves = [], tries = 0, won = false;
    const solution = matesInOne(B0)[0];
    const draw = () => {
      c.clearRect(0, 0, cv.width, cv.height);
      c.fillStyle = '#f3d9a4'; c.fillRect(0, 0, cv.width, cv.height);
      c.strokeStyle = '#8a4a2a'; c.lineWidth = 2;
      for (let y = 0; y < 10; y++) { c.beginPath(); c.moveTo(OX, OY + y * S); c.lineTo(OX + 8 * S, OY + y * S); c.stroke(); }
      for (let x = 0; x < 9; x++) for (const [a, b] of [[0, 4], [5, 9]]) { if ((x === 0 || x === 8) && a === 0) { c.beginPath(); c.moveTo(OX + x * S, OY); c.lineTo(OX + x * S, OY + 9 * S); c.stroke(); continue; } if (x === 0 || x === 8) continue; c.beginPath(); c.moveTo(OX + x * S, OY + a * S); c.lineTo(OX + x * S, OY + b * S); c.stroke(); }
      for (const [y0, y1] of [[0, 2], [7, 9]]) { c.beginPath(); c.moveTo(OX + 3 * S, OY + y0 * S); c.lineTo(OX + 5 * S, OY + y1 * S); c.moveTo(OX + 5 * S, OY + y0 * S); c.lineTo(OX + 3 * S, OY + y1 * S); c.stroke(); }
      c.fillStyle = 'rgba(138,74,42,.55)'; c.font = '900 22px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(T('river', 'sông'), OX + 4 * S, OY + 4.5 * S);
      for (const [x, y] of moves) { c.fillStyle = 'rgba(79,174,90,.55)'; c.beginPath(); c.arc(OX + x * S, OY + y * S, 11, 0, Math.PI * 2); c.fill(); }
      for (const [k, p] of Object.entries(B)) {
        const [x, y] = k.split(',').map(Number), px = OX + x * S, py = OY + y * S, on = sel && sel[0] === x && sel[1] === y;
        c.fillStyle = on ? '#fff3c4' : '#fbf1dc'; c.strokeStyle = p.red ? '#c0392b' : '#2f2a30'; c.lineWidth = on ? 4 : 3;
        c.beginPath(); c.arc(px, py, 23, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.arc(px, py, 18, 0, Math.PI * 2); c.lineWidth = 1.2; c.stroke();
        c.fillStyle = p.red ? '#c0392b' : '#2f2a30'; c.font = '900 24px serif'; c.fillText(GLYPH[p.t][p.red ? 0 : 1], px, py + 1);
      }
    };
    draw();
    cv.addEventListener('pointerdown', e => {
      if (won) return;
      const r = cv.getBoundingClientRect(), x = Math.round(((e.clientX - r.left) * cv.width / r.width - OX) / S), y = Math.round(((e.clientY - r.top) * cv.height / r.height - OY) / S);
      if (x < 0 || x > 8 || y < 0 || y > 9) return;
      const p = B[key(x, y)];
      if (p?.red) { sel = [x, y]; moves = legal(B, x, y); sfx('tap'); msg.textContent = T(`${NAME[p.t][0]} — where to?`, `${NAME[p.t][1]} — đi đâu?`); draw(); return; }
      if (sel && moves.some(([a, b]) => a === x && b === y)) {
        const N = move(B, sel, [x, y]);
        if (mated(N, false)) {
          B = N; won = true; moves = []; draw(); sfx('fanfare');
          const ch = C(); ch.solved = (n || 0) + 1; ch.day = jstDayNum(); befriend('ong_loc', 2); addXP(40, 'chess'); addMoney(30, 'game'); markDirty(true);
          if (ch.solved >= PUZZLES.length) (G.state.home.owned ||= []).push('co_tuong_table');
          msg.textContent = ch.solved >= PUZZLES.length ? T('"Checkmate! You\'ve solved them all — take my old chess table home."', '“Chiếu bí! Con giải hết rồi — mang bàn cờ cũ của ông về nhà đi.”') : T(`"Checkmate! ${tries ? 'Got there in the end.' : 'First try — impressive!'}" (+30k)`, `“Chiếu bí! ${tries ? 'Cuối cùng cũng ra.' : 'Một lần là trúng — giỏi!'}” (+30k)`);
          bus.emit('chessSolved', n);
        } else {
          tries++; sfx('error'); sel = null; moves = [];
          const hint = tries >= 2 && solution ? T(` Hint: use your ${NAME[B[key(...solution[0])].t][0].toLowerCase()}.`, ` Gợi ý: dùng con ${NAME[B[key(...solution[0])].t][1].toLowerCase()}.`) : '';
          msg.textContent = T('"Not quite — the general can still escape."', '“Chưa được — tướng vẫn còn đường chạy.”') + hint; draw();
        }
      }
    });
  });
}
// the table, two stools, and the two old friends bent over the board
export function chessDrawables(add, P) {
  if (G.scene !== G.scenes.island || !chessOpen()) return;
  const { x, y } = CHESS_SPOT;
  add(x, y, y, (c, t) => {
    P.ell(c, x, y + 1, 18, 4, 'rgba(0,0,0,.14)', null);
    for (const s of [-1, 1]) P.line(c, x + s * 10, y - 2, x + s * 10, y - 12, '#8a5f3e', 2);
    P.box(c, x - 14, y - 16, 28, 5, 2, '#d9b27a', P.INK, 0.9); P.box(c, x - 10, y - 21, 20, 6, 1, '#f3d9a4', P.INK, 0.6);
    for (const [dx, col] of [[-6, '#c0392b'], [-2, '#2f2a30'], [3, '#c0392b'], [7, '#2f2a30']]) P.circ(c, x + dx, y - 18 + (dx % 3) * 0.6, 1.3, col, null);
    void t;
  });
  for (const [rid, dx, face] of [['ong_loc', -24, 'right'], ['ba_tu', 24, 'left']]) {
    const look = RESIDENTS[rid]?.look; if (!look) continue;
    const px = x + dx, py = y + 2;
    add(px, py, py, (c, t) => { P.box(c, px - 6, py - 7, 12, 4, 1.5, '#c98f5a', P.INK, 0.7); c.save(); c.translate(px, py - 4); drawHuman(c, { look, dir: face, moving: 0, seed: rid.length, sit: true, seatH: 4, act: Math.sin(t * 0.7 + dx) > 0.6 ? 'think' : null, actT: t, emo: 'happy', blinkAmt: 0 }, t); c.restore(); });
  }
}
