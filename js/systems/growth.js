// The island visibly comes back to life as the story goes on: bunting over Market
// Street once word spreads, flower planters by your shops, lanterns strung over the
// plaza after the Lantern Festival, a "welcome back" banner on the ferry gate, boats
// in the water, Minh's photos on the plaza notice board. Purely decoration — drawn
// from the story state, nothing to save.

import { G, T } from './state.js';
import { INK, ell, circ, box, line, poly } from '../gfx/draw.js';
import { PLAZA } from '../world/island.js';

const ch = () => G.state.story.chapter || 1;
const flag = k => !!G.state.story.flags[k];
const ach = k => (G.state.achievements || []).includes(k);
const night = () => { const m = G.state.time; return m >= 18.5 * 60 || m < 6 * 60; };

// a string of little flags between two posts (overhead)
function bunting(c, t, x1, y1, x2, y2, h, cols) {
  const sag = 14, n = Math.max(6, Math.round(Math.hypot(x2 - x1, y2 - y1) / 16));
  for (const [x, y] of [[x1, y1], [x2, y2]]) { line(c, x, y, x, y - h, '#8a5f3e', 2.2); circ(c, x, y - h, 2, '#8a5f3e', null); }
  c.strokeStyle = '#5b3f36'; c.lineWidth = 0.8; c.beginPath();
  const pt = u => [x1 + (x2 - x1) * u, y1 - h + (y2 - y1) * u + Math.sin(u * Math.PI) * sag];
  for (let i = 0; i <= 20; i++) { const [x, y] = pt(i / 20); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  for (let i = 1; i < n; i++) { const [x, y] = pt(i / n), sw = Math.sin(t * 2 + i) * 1.2; poly(c, [x - 4, y, x + 4, y, x + sw, y + 9], cols[i % cols.length], INK, 0.6); }
}
function lanternString(c, t, x1, y1, x2, y2, h) {
  const n = 7, pt = u => [x1 + (x2 - x1) * u, y1 - h + (y2 - y1) * u + Math.sin(u * Math.PI) * 12];
  c.strokeStyle = '#5b3f36'; c.lineWidth = 0.8; c.beginPath(); for (let i = 0; i <= 20; i++) { const [x, y] = pt(i / 20); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  for (let i = 1; i < n; i++) {
    const [x, y] = pt(i / n), col = ['#ea5a4f', '#f2c14e', '#f08ca0'][i % 3];
    if (night()) { c.fillStyle = 'rgba(255,200,120,.25)'; c.beginPath(); c.arc(x, y + 7, 12, 0, Math.PI * 2); c.fill(); }
    line(c, x, y, x, y + 2, INK, 0.6); ell(c, x, y + 7, 4.6, 5.4, col, INK, 0.7); line(c, x - 3, y + 3, x + 3, y + 3, '#8a5f3e', 1); line(c, x, y + 12, x, y + 15, '#f2c14e', 1);
  }
}
function planter(c, x, y, col) {
  box(c, x - 9, y - 9, 18, 9, 2, '#b87a4f', INK, 0.8);
  for (let i = -1; i <= 1; i++) { circ(c, x + i * 5, y - 12, 3.2, '#6fbf4a', INK, 0.5); circ(c, x + i * 5, y - 14, 1.8, col, null); }
}
function boat(c, t, x, y, col) {
  const bob = Math.sin(t * 1.2 + x) * 1.2;
  c.save(); c.translate(x, y + bob);
  ell(c, 0, 4, 22, 4, 'rgba(0,40,60,.15)', null);
  poly(c, [-20, -4, 20, -4, 14, 4, -14, 4], col, INK, 1); line(c, -18, -2, 18, -2, '#fff5df', 1.2);
  line(c, 0, -4, 0, -26, '#8a5f3e', 1.4); poly(c, [1, -25, 1, -8, 13, -8], '#fffaf0', INK, 0.8);
  c.restore();
}

export function growthDrawables() {
  const isl = G.scenes?.island; if (G.scene !== isl) return [];
  const out = [], add = (x, y, sortY, draw) => out.push({ x, y, sortY, draw: (c, t) => { c.save(); c.translate(-x, -y); draw(c, t); c.restore(); } });
  // Chapter 3: word is spreading — bunting over Market Street
  if (ch() >= 3) add(900, 1100, 1300, (c, t) => { bunting(c, t, 700, 1098, 1100, 1098, 58, ['#f28f7c', '#fff5df', '#6fbfb0', '#f2c14e']); });
  // Chapter 5: planters beside your first shops
  if (ch() >= 5) add(600, 2240, 2240, c => { planter(c, 520, 2236, '#f4a9b8'); planter(c, 686, 2232, '#f2c14e'); if (G.state.biz.shed2?.repair >= 1) { planter(c, 486, 1602, '#f08ca0'); planter(c, 640, 1606, '#fff5df'); } });
  // Chapter 11: the island is a destination — bunting around Wind Plaza
  if (ch() >= 11) add(PLAZA.x, PLAZA.y - 60, PLAZA.y + 150, (c, t) => { bunting(c, t, PLAZA.x - 120, PLAZA.y - 70, PLAZA.x + 120, PLAZA.y - 70, 64, ['#e8584e', '#fff5df', '#f2c14e']); });
  // after the Lantern Festival: lanterns stay strung over the plaza for good
  if (ach('lantern_festival')) add(PLAZA.x, PLAZA.y + 90, PLAZA.y + 200, (c, t) => { lanternString(c, t, PLAZA.x - 124, PLAZA.y + 96, PLAZA.x + 124, PLAZA.y + 96, 60); });
  // Chapter 12+: more boats in the water off the pier
  if (ch() >= 12) add(760, 2520, 2380, (c, t) => { boat(c, t, 760, 2500, '#8fb7e0'); if (ch() >= 17) boat(c, t, 1080, 2560, '#f7de8c'); });
  // Chapter 19+: a banner on the ferry gate
  if (ch() >= 19) add(900, 2370, 2420, c => { box(c, 852, 2322, 96, 12, 3, '#fff5df', INK, 0.9); c.fillStyle = '#e8584e'; c.font = '900 7px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText(T('WELCOME BACK!', 'CHÀO MỪNG TRỞ LẠI!'), 900, 2331); });
  // Minh's exhibition: photos pinned on a board at the plaza
  if (flag('minh_exhibit')) add(PLAZA.x + 150, PLAZA.y + 40, PLAZA.y + 40, c => { const x = PLAZA.x + 150, y = PLAZA.y + 40; line(c, x - 18, y, x - 18, y - 30, '#8a5f3e', 2); line(c, x + 18, y, x + 18, y - 30, '#8a5f3e', 2); box(c, x - 22, y - 44, 44, 22, 2, '#c9955e', INK, 0.9); for (let i = 0; i < 3; i++) box(c, x - 18 + i * 13, y - 41, 10, 8 + (i % 2) * 2, 0.8, ['#aee4ed', '#f7de8c', '#f4a9b8'][i], INK, 0.5); });
  return out;
}
