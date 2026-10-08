// The island visibly comes back to life as the story goes on: bunting over Market
// Street once word spreads, flower planters by your shops, lanterns strung over the
// plaza after the Lantern Festival, a "welcome back" banner on the ferry gate, boats
// in the water, Minh's photos on the plaza notice board. Purely decoration — drawn
// from the story state, nothing to save.

import { G, T } from './state.js';
import { INK, ell, circ, box, line, poly } from '../gfx/draw.js';
import { PLAZA, QUEUES } from '../world/island.js';
import { drawIcon } from '../gfx/food.js';
import { RECIPES, BUSINESSES } from '../data/game.js';
import { glows } from '../gfx/props.js';
import * as PR from '../gfx/props.js';
import { DECOR } from './storefront.js';
import { partyDrawables } from './parties.js';
import { nightlifeDrawables } from './nightlife.js';
import { eventOn } from './interact.js';
import { npcs } from './npc.js';
import { RESIDENTS } from '../data/looks.js';
import { rand, bus } from '../core/util.js';

const ch = () => G.state.story.chapter || 1;
const OVERHEAD = 99990;            // strings of flags and lanterns hang above everyone's heads: drawn last
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
  for (const [x, y] of [[x1, y1], [x2, y2]]) { ell(c, x, y + 1, 4, 1.6, 'rgba(0,0,0,.15)', null); line(c, x, y, x, y - h, '#8a5f3e', 2.2); circ(c, x, y - h, 2, '#f2c14e', null); }   // tied to two poles
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

// a carved pumpkin lantern, for Pumpkin Nights
function pumpkin(c, t, x, y) {
  if (night()) { c.fillStyle = 'rgba(255,170,80,.28)'; c.beginPath(); c.arc(x, y - 6, 15, 0, Math.PI * 2); c.fill(); }
  for (const dx of [-4, 4]) ell(c, x + dx, y - 6, 6, 6.5, '#f08a2c', INK, 0.8);
  ell(c, x, y - 6, 6.5, 7, '#f7a03c', INK, 0.8); line(c, x, y - 13, x + 1.5, y - 17, '#6b8a3a', 1.6);
  const glow = night() ? '#fff1a8' : '#5b3f36';
  poly(c, [x - 4, y - 8, x - 2, y - 10, x - 1, y - 7], glow, null); poly(c, [x + 4, y - 8, x + 2, y - 10, x + 1, y - 7], glow, null);
  poly(c, [x - 4, y - 4, x + 4, y - 4, x + 2, y - 2, x - 2, y - 2], glow, null);
}
// a bunch of balloons on strings, bobbing in the breeze
function balloons(c, t, x, y, cols, heart = false) {
  cols.forEach((col, i) => {
    const bx = x + (i - (cols.length - 1) / 2) * 7 + Math.sin(t * 1.4 + i) * 1.5, by = y - 40 - (i % 2) * 7 + Math.sin(t * 1.8 + i * 2) * 1.2;
    c.strokeStyle = 'rgba(91,63,54,.6)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x, y - 2); c.quadraticCurveTo(x + (bx - x) * 0.3, y - 20, bx, by + 6); c.stroke();
    if (heart) { c.beginPath(); c.moveTo(bx, by + 6); c.bezierCurveTo(bx - 8, by, bx - 6, by - 7, bx, by - 3.5); c.bezierCurveTo(bx + 6, by - 7, bx + 8, by, bx, by + 6); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke(); }
    else { ell(c, bx, by, 5, 6.2, col, INK, 0.7); poly(c, [bx - 1.2, by + 6.6, bx + 1.2, by + 6.6, bx, by + 5.6], col, INK, 0.4); }
    ell(c, bx - 1.8, by - 2.4, 1.2, 1.8, 'rgba(255,255,255,.55)', null);
  });
  box(c, x - 2.5, y - 3, 5, 3, 1, '#c9955e', INK, 0.5);
}
// a flag on a pole, waving (red with a gold star for National Day)
function flagPole(c, t, x, y) {
  line(c, x, y, x, y - 46, '#8a7a6a', 1.6); circ(c, x, y - 47, 1.6, '#ffd35a', INK, 0.4);
  const w = 20, h = 13, pts = [];
  for (let i = 0; i <= 8; i++) pts.push([x + w * i / 8, y - 44 + Math.sin(t * 4 - i * 0.6) * 1.4 * i / 8]);
  c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); for (let i = 8; i >= 0; i--) c.lineTo(pts[i][0], pts[i][1] + h); c.closePath(); c.fillStyle = '#d9433a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.6; c.stroke();
  const [sx, sy] = pts[4], st = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.6 : 4; st.push(sx + Math.cos(a) * r, sy + h / 2 + Math.sin(a) * r); } poly(c, st, '#ffd35a', null);
}
// a flower stand, piled with bouquets (Women's Day)
function flowerStand(c, t, x, y) {
  box(c, x - 14, y - 12, 28, 12, 2, '#c9955e', INK, 0.8);
  for (let i = 0; i < 9; i++) { const fx2 = x - 11 + (i % 5) * 5.5, fy = y - 15 - Math.floor(i / 5) * 5; line(c, fx2, fy + 4, fx2, fy + 1, '#6b8a3a', 0.8); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; circ(c, fx2 + Math.cos(a) * 1.4, fy + Math.sin(a) * 1.4, 1.2, ['#ff8fb0', '#fff', '#f36d86', '#ffd35a', '#c9a8ff'][i % 5], null); } circ(c, fx2, fy, 0.8, '#ffd35a', null); }
}
// the Grand Opening arch over the road to the plaza
function openingArch(c, t, x, y) {
  for (const s of [-1, 1]) { box(c, x + s * 56 - 4, y - 50, 8, 50, 2, '#f7de8c', INK, 0.9); balloons(c, t, x + s * 56, y - 44, ['#f36d86', '#ffd35a', '#6fbfb0']); }
  c.beginPath(); c.moveTo(x - 60, y - 52); c.quadraticCurveTo(x, y - 76, x + 60, y - 52); c.lineTo(x + 60, y - 40); c.quadraticCurveTo(x, y - 62, x - 60, y - 40); c.closePath(); c.fillStyle = '#f36d86'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  c.save(); c.fillStyle = '#fffaf0'; c.font = '900 8px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText(T('GRAND OPENING!', 'KHAI TRƯƠNG!'), x, y - 54); c.restore();
  for (let i = 0; i < 9; i++) { const u = i / 8, px = x - 56 + u * 112, py = y - 50 - Math.sin(u * Math.PI) * 20; circ(c, px, py + 3, 1.3, Math.sin(t * 6 + i) > 0 ? '#fff6b0' : '#ffd35a', null); }
}
const boomed = [];
const hexA = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, a).toFixed(2)})`;
// fireworks over a spot, after dark: rockets rise, burst into rings of sparks and fade
function fireworks(c, t, x, y) {
  if (!night()) return;
  const P = 2.6;
  for (let k = 0; k < 3; k++) {
    const tt = t + k * (P / 3), cyc = Math.floor(tt / P), u = (tt % P) / P, seed = Math.sin(cyc * 12.9898 + k * 78.233) * 43758.5453, r1 = seed - Math.floor(seed), r2 = (r1 * 7.13) % 1;
    const fx2 = x + (r1 - 0.5) * 300, top = y - 60 - r2 * 90, col = ['#ffd35a', '#f36d86', '#8fd3f0', '#b7f28a', '#c9a8ff'][Math.floor(r1 * 5)];
    if (u < 0.28) { const v = u / 0.28, py = y - 20 + (top - y + 20) * (1 - Math.pow(1 - v, 2)); circ(c, fx2, py, 1.4, '#fff6d8', null); c.strokeStyle = 'rgba(255,230,170,.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(fx2, py); c.lineTo(fx2, py + 10); c.stroke(); continue; }
    if (boomed[k] !== cyc && u < 0.4) { boomed[k] = cyc; bus.emit('sfx', 'firework'); }
    const v = (u - 0.28) / 0.72, R = 10 + 46 * (1 - Math.pow(1 - v, 3)), fade = 1 - v;
    c.save(); c.globalAlpha = Math.max(0, fade); c.globalCompositeOperation = 'lighter';
    c.fillStyle = col; c.beginPath(); c.arc(fx2, top, R * 0.5, 0, Math.PI * 2); c.globalAlpha = Math.max(0, fade * 0.12); c.fill(); c.globalAlpha = Math.max(0, fade);
    for (let i = 0; i < 22; i++) { const a = i / 22 * Math.PI * 2, px = fx2 + Math.cos(a) * R, py = top + Math.sin(a) * R + v * v * 18; circ(c, px, py, 1.5 * (1 - v * 0.5), i % 2 ? col : '#fff6d8', null); if (i % 3 === 0) glows.push([px, py, 9 * fade + 3, hexA(col, 0.9 * fade)]); }
    glows.push([fx2, top, R * 1.3, hexA(col, 0.35 * fade)]);
    c.restore();
  }
}
// at night the lighthouse sweeps its beam across the sea (drawn over the night tint)
export function drawBeam(c, t) {
  if (!night() || G.scene !== G.scenes.island) return;
  const x = 900, y = 300 - 132, a = t * 0.55, L = 1100;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const off of [0, Math.PI]) { const ang = a + off, w = 0.11;
    const g2 = c.createLinearGradient(x, y, x + Math.cos(ang) * L, y + Math.sin(ang) * L * 0.45); g2.addColorStop(0, 'rgba(255,240,180,.34)'); g2.addColorStop(1, 'rgba(255,240,180,0)');
    c.fillStyle = g2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang - w) * L, y + Math.sin(ang - w) * L * 0.45); c.lineTo(x + Math.cos(ang + w) * L, y + Math.sin(ang + w) * L * 0.45); c.closePath(); c.fill(); }
  const k = (Math.sin(t * 3) + 1) / 2; c.fillStyle = `rgba(255,245,200,${0.5 + k * 0.3})`; c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill();
  c.restore();
}
// one piece of shop-front decor at (x, y)
export function drawDecor(c, t, k, x, y) {
  const d = DECOR[k]; if (!d) return;
  c.save(); c.translate(x, y);
  const p = { x, y, ...d.o };
  if (d.fn === 'lanternPole') { line(c, 0, 0, 0, -38, '#8a5f3e', 1.8); line(c, 0, -36, 8, -36, '#8a5f3e', 1.2); const sw = Math.sin(t * 2 + x) * 0.1; c.save(); c.translate(8, -36); c.rotate(sw); line(c, 0, 0, 0, 4, INK, 0.5); ell(c, 0, 9, 4.5, 5.5, '#e8453a', INK, 0.7); box(c, -2.5, 3.5, 5, 1.6, 0.5, '#ffd35a', null); box(c, -2.5, 13.5, 5, 1.6, 0.5, '#ffd35a', null); c.restore(); if (night()) glows.push([x + 8, y - 27, 26, 'rgba(255,170,100,.55)']); }
  else if (d.fn === 'surfboard') { ell(c, 0, -20, 5, 20, '#6fbfb0', INK, 0.9); line(c, 0, -39, 0, -1, '#fff', 0.8); ell(c, 4, 0, 6, 1.6, 'rgba(0,0,0,.12)', null); }
  else if (d.fn === 'flagPole') { c.translate(-x, -y); flagPole(c, t, x, y); }
  else if (d.fn === 'picketFence') { line(c, -16, -6, 16, -6, '#e8dccb', 2); line(c, -16, -11, 16, -11, '#e8dccb', 2); for (let i = 0; i < 5; i++) { const px = -14 + i * 7; poly(c, [px - 2.2, 0, px + 2.2, 0, px + 2.2, -14, px, -17, px - 2.2, -14], '#fffaf0', INK, 0.7); } }
  else if (d.fn === 'veggiePatch') { box(c, -17, -9, 34, 9, 2, '#8a5a3a', INK, 0.8); for (let i = 0; i < 4; i++) { const px = -12 + i * 8, sw = Math.sin(t * 1.5 + i) * 0.6; for (const a of [-0.5, 0, 0.5]) line(c, px, -8, px + a * 5 + sw, -15 - (i % 2) * 2, '#6fae4c', 1.4); if (i % 2) circ(c, px, -8, 2, '#e8584e', INK, 0.4); } }
  else if (d.fn === 'sunflowerRow') { for (let i = 0; i < 3; i++) { const px = -9 + i * 9, top = -24 - (i % 2) * 5, sw = Math.sin(t * 1.2 + i) * 0.8; line(c, px, 0, px + sw, top, '#6fae4c', 1.3); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ell(c, px + sw + Math.cos(a) * 3.2, top + Math.sin(a) * 3.2, 1.8, 1.8, '#f2c14e', null); } circ(c, px + sw, top, 2, '#8a5a3a', INK, 0.4); } }
  else if (PR[d.fn]) PR[d.fn](c, t, p);
  if (d.light && d.fn === 'lampPost' && night()) glows.push([x, y - 40, 34, 'rgba(255,220,150,.55)']);
  c.restore();
}
function ribbon(c, t, x, y, kind) {
  const col = { gold: '#f2c14e', silver: '#c9d3dc', bronze: '#d38b52' }[kind], sw = Math.sin(t * 2) * 0.08;
  c.save(); c.translate(x, y); c.rotate(sw);
  poly(c, [-3, 2, -6, 14, -2, 11, 0, 14, 0, 2], '#e8584e', INK, 0.5); poly(c, [3, 2, 6, 14, 2, 11, 0, 14, 0, 2], '#3f6fb5', INK, 0.5);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; circ(c, Math.cos(a) * 4.8, Math.sin(a) * 4.8, 2, col, INK, 0.3); }
  circ(c, 0, 0, 4.2, col, INK, 0.6); circ(c, 0, 0, 2.4, '#fffaf0', null); c.restore();
}
// where each shop's special easel stands: beside the start of its queue
export function specialEasels() {
  const out = [];
  for (const [id, z] of Object.entries(G.state.biz || {})) if (z.owned && (z.repair ?? 1) >= 1 && QUEUES[id] && id !== 'restaurant' && BUSINESSES[id]?.biz !== 'night') {   /* (Night Market stalls each sell one speciality) */ const [qx, qy] = QUEUES[id][0]; out.push({ id, x: qx + 30, y: qy + 6, recipe: RECIPES[z.special] ? z.special : null }); }
  return out;
}
function easel(c, t, x, y, recipe) {
  for (const [a, b2] of [[-7, 0], [7, 0], [0, -2]]) line(c, x, y - 26, x + a, y + b2, '#8a5f3e', 1.4);
  box(c, x - 10, y - 30, 20, 18, 1.5, '#2f3a34', '#8a5f3e', 1.4);
  c.save(); c.fillStyle = '#fffaf0'; c.font = '900 3.6px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText(T('TODAY', 'HÔM NAY'), x, y - 25.5); c.restore();
  c.save(); c.translate(x, y - 18.5); c.scale(0.45, 0.45); if (recipe) drawIcon(c, RECIPES[recipe].icon, t); c.restore();
  if (!recipe) { c.save(); c.fillStyle = '#fffaf0'; c.font = '900 9px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('?', x, y - 15); c.restore(); }
  const k = (Math.sin(t * 2) + 1) / 2; c.fillStyle = `rgba(255,211,90,${0.4 + k * 0.6})`; c.fillRect(x - 8, y - 14.5, 16, 0.8);
}
// a little decorated tree with twinkling lights, for Christmas
function xmasTree(c, t, x, y) {
  box(c, x - 3, y - 6, 6, 6, 1, '#8a5f3e', INK, 0.7);
  for (const [w, top, base] of [[22, -30, -6], [17, -42, -22], [11, -52, -36]]) poly(c, [x - w, y + base, x + w, y + base, x, y + top], '#3f8f5a', INK, 0.9);
  for (let i = 0; i < 12; i++) { const k = (i * 37) % 11, px = x + (k - 5) * 3.2, py = y - 12 - (i % 6) * 6; circ(c, px, py, 1.4, ['#ffd35a', '#f08ca0', '#8fd3f0'][i % 3] + ((Math.sin(t * 3 + i) > 0 || !night()) ? '' : '66'), null); }
  poly(c, [x, y - 58, x + 2, y - 53, x + 6, y - 53, x + 3, y - 50, x + 4, y - 45, x, y - 48, x - 4, y - 45, x - 3, y - 50, x - 6, y - 53, x - 2, y - 53], '#ffd35a', INK, 0.6);
}
// apricot blossom (hoa mai) in a pot, for Tết
function maiPot(c, t, x, y) {
  box(c, x - 8, y - 10, 16, 10, 2, '#c9674a', INK, 0.9);
  for (let i = -2; i <= 2; i++) line(c, x, y - 10, x + i * 6, y - 30 - Math.abs(i) * 2, '#6b4a36', 1.2);
  for (let i = 0; i < 12; i++) { const a = i * 2.4, r = 6 + (i % 4) * 3; circ(c, x + Math.cos(a) * r, y - 28 + Math.sin(a) * r * 0.6, 1.8, '#ffd35a', INK, 0.3); }
}
function starLantern(c, t, x, y) {
  const sw = Math.sin(t * 2 + x) * 0.1; c.save(); c.translate(x, y); c.rotate(sw);
  line(c, 0, -14, 0, -26, '#8a5f3e', 1); const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.2 : 7.5; pts.push(Math.cos(a) * r, Math.sin(a) * r); }
  if (night()) { c.fillStyle = 'rgba(255,200,120,.3)'; c.beginPath(); c.arc(0, 0, 13, 0, Math.PI * 2); c.fill(); }
  poly(c, pts, '#e8584e', INK, 0.8); c.restore();
}
function beachUmbrella(c, t, x, y, col) {
  ell(c, x + 6, y + 2, 16, 5, 'rgba(0,0,0,.08)', null); box(c, x - 14, y - 4, 26, 8, 2, col === '#f28f7c' ? '#fff5df' : '#f7de8c', INK, 0.6);
  line(c, x, y, x, y - 30, '#c9b89e', 1.4); c.beginPath(); c.moveTo(x - 18, y - 28); c.quadraticCurveTo(x, y - 44, x + 18, y - 28); c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
}

export function growthDrawables() {
  const isl = G.scenes?.island; if (G.scene !== isl) return [];
  const out = [], add = (x, y, sortY, draw) => out.push({ x, y, sortY, draw: (c, t) => { c.save(); c.translate(-x, -y); draw(c, t); c.restore(); } });
  // Chapter 3: word is spreading — bunting over Market Street
  if (ch() >= 3) add(900, 1100, OVERHEAD, (c, t) => { bunting(c, t, 700, 1098, 1100, 1098, 58, ['#f28f7c', '#fff5df', '#6fbfb0', '#f2c14e']); });
  // Chapter 5: planters beside your first shops
  if (ch() >= 5) add(600, 2240, 2240, c => { planter(c, 520, 2236, '#f4a9b8'); planter(c, 686, 2232, '#f2c14e'); if (G.state.biz.shed2?.repair >= 1) { planter(c, 486, 1602, '#f08ca0'); planter(c, 640, 1606, '#fff5df'); } });
  // Chapter 11: the island is a destination — bunting around Wind Plaza
  if (ch() >= 11) add(PLAZA.x, PLAZA.y - 60, OVERHEAD, (c, t) => { bunting(c, t, PLAZA.x - 120, PLAZA.y - 70, PLAZA.x + 120, PLAZA.y - 70, 64, ['#e8584e', '#fff5df', '#f2c14e']); });
  // after the Lantern Festival: lanterns stay strung over the plaza for good
  if (ach('lantern_festival')) add(PLAZA.x, PLAZA.y + 90, OVERHEAD, (c, t) => { lanternString(c, t, PLAZA.x - 124, PLAZA.y + 96, PLAZA.x + 124, PLAZA.y + 96, 60); });
  // Chapter 12+: more boats in the water off the pier
  if (ch() >= 12) add(760, 2520, 2380, (c, t) => { boat(c, t, 760, 2500, '#8fb7e0'); if (ch() >= 17) boat(c, t, 1080, 2560, '#f7de8c'); });
  // Chapter 19+: a banner on the ferry gate
  if (ch() >= 19) add(900, 2370, 2420, c => { box(c, 852, 2322, 96, 12, 3, '#fff5df', INK, 0.9); c.fillStyle = '#e8584e'; c.font = '900 7px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText(T('WELCOME BACK!', 'CHÀO MỪNG TRỞ LẠI!'), 900, 2331); });
  // after the Keeper's Harbour Day: bunting along the quay for good
  if (flag('harbour_day')) add(2600, 700, OVERHEAD, (c, t) => { bunting(c, t, 2470, 740, 2730, 740, 56, ['#8fb7e0', '#fff5df', '#e8584e', '#f2c14e']); });
  // the island dinner: a long table set at the plaza every evening
  if (flag('community_dinner') && G.state.time >= 17 * 60 && G.state.time < 22 * 60) add(PLAZA.x, PLAZA.y + 70, PLAZA.y + 70, c => { const x = PLAZA.x, y = PLAZA.y + 70; box(c, x - 60, y - 14, 120, 14, 3, '#fff5df', INK, 0.9); for (let i = 0; i < 6; i++) { ell(c, x - 48 + i * 19, y - 12, 5, 2, ['#f2c14e', '#e8584e', '#9fd67a'][i % 3], INK, 0.4); } });
  // ---- the island calendar, made visible
  const ev = eventOn();
  if (ev?.id === 'tet') {
    add(PLAZA.x, PLAZA.y - 64, OVERHEAD, (c, t) => { bunting(c, t, PLAZA.x - 124, PLAZA.y + 100, PLAZA.x + 124, PLAZA.y + 100, 60, ['#d9433a', '#f2c14e']); });
    add(900, 1140, 1320, c => { box(c, 820, 1072, 160, 16, 3, '#d9433a', INK, 1); c.fillStyle = '#ffd35a'; c.font = '900 8px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('CHÚC MỪNG NĂM MỚI', 900, 1083); });
    for (const [x, y] of [[PLAZA.x - 118, PLAZA.y + 40], [PLAZA.x + 118, PLAZA.y + 40], [PLAZA.x - 38, PLAZA.y + 168], [PLAZA.x + 38, PLAZA.y + 168]]) add(x, y, y, (c, t) => maiPot(c, t, x, y));
  }
  if (ev?.id === 'midautumn') {
    for (const [x, y] of [[PLAZA.x - 100, PLAZA.y - 50], [PLAZA.x + 100, PLAZA.y - 50], [PLAZA.x - 110, PLAZA.y + 60], [PLAZA.x + 110, PLAZA.y + 60], [380, 610], [480, 610], [380, 720], [480, 720]]) add(x, y, y + 40, (c, t) => starLantern(c, t, x, y - 40));
    add(430, 560, OVERHEAD, (c, t) => { lanternString(c, t, 300, 580, 560, 580, 64); });
  }
  if (ev?.id === 'halloween') {
    for (const [x, y] of [[PLAZA.x - 110, PLAZA.y + 50], [PLAZA.x + 110, PLAZA.y + 50], [PLAZA.x - 40, PLAZA.y + 170], [PLAZA.x + 40, PLAZA.y + 170], [380, 640], [480, 640], [560, 2240], [700, 2240]]) add(x, y, y, (c, t) => pumpkin(c, t, x, y));
    add(PLAZA.x, PLAZA.y - 64, OVERHEAD, (c, t) => { bunting(c, t, PLAZA.x - 124, PLAZA.y + 100, PLAZA.x + 124, PLAZA.y + 100, 60, ['#f08a2c', '#4a3a60', '#f7de8c']); });
  }
  if (ev?.id === 'christmas') {
    add(PLAZA.x, PLAZA.y - 64, OVERHEAD, (c, t) => { bunting(c, t, PLAZA.x - 124, PLAZA.y + 100, PLAZA.x + 124, PLAZA.y + 100, 60, ['#d9433a', '#3f8f5a', '#fff5df']); });
    add(900, 1100, OVERHEAD, (c, t) => { bunting(c, t, 700, 1098, 1100, 1098, 58, ['#d9433a', '#3f8f5a', '#fff5df', '#f2c14e']); });
    add(PLAZA.x + 150, PLAZA.y + 120, PLAZA.y + 120, (c, t) => xmasTree(c, t, PLAZA.x + 150, PLAZA.y + 120));
  }
  if (ev?.id === 'valentine') {
    add(PLAZA.x, PLAZA.y - 64, OVERHEAD, (c, t) => { bunting(c, t, PLAZA.x - 124, PLAZA.y + 100, PLAZA.x + 124, PLAZA.y + 100, 60, ['#f36d86', '#fff5df', '#ffb3c6']); });
    for (const [x, y] of [[PLAZA.x - 116, PLAZA.y + 44], [PLAZA.x + 116, PLAZA.y + 44], [PLAZA.x - 40, PLAZA.y + 168], [PLAZA.x + 40, PLAZA.y + 168]]) add(x, y, y, (c, t) => balloons(c, t, x, y, ['#f36d86', '#ff8fb0', '#e8584e'], true));
  }
  if (ev?.id === 'womensday') {
    add(PLAZA.x, PLAZA.y - 64, OVERHEAD, (c, t) => { bunting(c, t, PLAZA.x - 124, PLAZA.y + 100, PLAZA.x + 124, PLAZA.y + 100, 60, ['#ff8fb0', '#fff5df', '#c9a8ff']); });
    for (const [x, y] of [[PLAZA.x - 120, PLAZA.y + 50], [PLAZA.x + 120, PLAZA.y + 50], [900, 1240]]) add(x, y, y, (c, t) => flowerStand(c, t, x, y));
  }
  if (ev?.id === 'childrensday') {
    for (const [x, y] of [[PLAZA.x - 116, PLAZA.y + 44], [PLAZA.x + 116, PLAZA.y + 44], [PLAZA.x - 40, PLAZA.y + 168], [PLAZA.x + 40, PLAZA.y + 168], [640, 2300], [1180, 2300]]) add(x, y, y, (c, t) => balloons(c, t, x, y, ['#ffd35a', '#6fbfb0', '#f36d86', '#8fb7e0']));
    add(PLAZA.x, PLAZA.y - 64, OVERHEAD, (c, t) => { bunting(c, t, PLAZA.x - 124, PLAZA.y + 100, PLAZA.x + 124, PLAZA.y + 100, 60, ['#ffd35a', '#6fbfb0', '#f36d86', '#8fb7e0']); });
  }
  if (ev?.id === 'nationalday') {
    for (const [x, y] of [[PLAZA.x - 120, PLAZA.y + 40], [PLAZA.x + 120, PLAZA.y + 40], [PLAZA.x - 40, PLAZA.y + 170], [PLAZA.x + 40, PLAZA.y + 170], [700, 1240], [1100, 1240], [860, 2330], [940, 2330]]) add(x, y, y, (c, t) => flagPole(c, t, x, y));
    add(900, 1100, OVERHEAD, (c, t) => { bunting(c, t, 700, 1098, 1100, 1098, 58, ['#d9433a', '#ffd35a']); });
  }
  if (ev?.id === 'newyear') {
    add(PLAZA.x, PLAZA.y - 64, OVERHEAD, (c, t) => { bunting(c, t, PLAZA.x - 124, PLAZA.y + 100, PLAZA.x + 124, PLAZA.y + 100, 60, ['#8f7fd0', '#ffd35a', '#fff5df']); });
  }
  if (ev?.id === 'launch') {
    add(900, 1780, 1780, (c, t) => openingArch(c, t, 900, 1780));
    add(PLAZA.x, PLAZA.y - 64, OVERHEAD, (c, t) => { bunting(c, t, PLAZA.x - 124, PLAZA.y + 100, PLAZA.x + 124, PLAZA.y + 100, 60, ['#f36d86', '#ffd35a', '#6fbfb0', '#8fb7e0']); });
    for (const [x, y] of [[PLAZA.x - 116, PLAZA.y + 44], [PLAZA.x + 116, PLAZA.y + 44], [PLAZA.x - 40, PLAZA.y + 168], [PLAZA.x + 40, PLAZA.y + 168], [880, 2380], [920, 2380]]) add(x, y, y, (c, t) => balloons(c, t, x, y, ['#f36d86', '#ffd35a', '#6fbfb0', '#c9a8ff']));
  }
  if (ev?.fireworks) add(PLAZA.x, PLAZA.y, 99999, (c, t) => fireworks(c, t, PLAZA.x, PLAZA.y + 60));
  if (ev?.id === 'summer') {
    for (const [x, y, col] of [[640, 2330, '#f28f7c'], [760, 2350, '#8fcfc0'], [1180, 2360, '#f2c14e'], [1300, 2320, '#f28f7c'], [2420, 2330, '#8fcfc0'], [2540, 2300, '#f2c14e']]) add(x, y, y, (c, t) => beachUmbrella(c, t, x, y, col));
  }
  if (ev?.id === 'nmnight' || ev?.id === 'midautumn') {
    add(430, 640, OVERHEAD, (c, t) => { lanternString(c, t, 300, 660, 560, 660, 70); lanternString(c, t, 300, 760, 560, 760, 70); });
  }
  // shop-front decor you placed (systems/storefront.js), and contest ribbons
  { const b = G.scenes.island?.buildings?.house; if (b) for (const d of G.state.home?.yard || []) { const x = b.x + d.dx, y = b.y + d.dy; add(x, y, y, (c, t) => drawDecor(c, t, d.k, x, y)); } }   // your garden
  for (const [id, z] of Object.entries(G.state.biz || {})) {
    const b = G.scenes.island?.buildings?.[id]; if (!b || !z.owned) continue;
    for (const d of z.decor || []) { const x = b.x + d.dx, y = b.y + d.dy; add(x, y, y, (c, t) => drawDecor(c, t, d.k, x, y)); }
    const rib = G.state.contest?.ribbons?.[id]; if (rib) { const x = b.x + (b.w || 100) / 2 - 8, y = b.y - 50; add(x, y, b.y + 1, (c, t) => ribbon(c, t, x, y, rib)); }
  }
  // Chú Hải's boat, moored at the end of the pier once he takes you out to Turtle Cove
  if (flag('fishing')) add(992, 2600, 2600, (c, t) => { const bob = Math.sin(t * 1.6) * 1.2; c.save(); c.translate(992, 2600 + bob); poly(c, [-22, -6, 22, -6, 16, 4, -16, 4], '#3f8f9a', INK, 1); box(c, -16, -9, 32, 4, 1, '#fffaf0', INK, 0.6); line(c, 2, -9, 2, -30, '#8a5f3e', 1.4); poly(c, [3, -29, 3, -12, 16, -12], '#fff5df', INK, 0.7); c.restore(); });
  partyDrawables(add, { box, line, circ, ell, INK });
  nightlifeDrawables(add, { box, line, circ, ell, poly, INK, glows });
  // today's special on a chalkboard easel by each of your shops (tap it to change)
  for (const sp of specialEasels()) add(sp.x, sp.y, sp.y, (c, t) => easel(c, t, sp.x, sp.y, sp.recipe));
  // Minh's exhibition: photos pinned on a board at the plaza
  if (flag('minh_exhibit')) add(PLAZA.x + 150, PLAZA.y + 40, PLAZA.y + 40, c => { const x = PLAZA.x + 150, y = PLAZA.y + 40; line(c, x - 18, y, x - 18, y - 30, '#8a5f3e', 2); line(c, x + 18, y, x + 18, y - 30, '#8a5f3e', 2); box(c, x - 22, y - 44, 44, 22, 2, '#c9955e', INK, 0.9); for (let i = 0; i < 3; i++) box(c, x - 18 + i * 13, y - 41, 10, 8 + (i % 2) * 2, 0.8, ['#aee4ed', '#f7de8c', '#f4a9b8'][i], INK, 0.5); });
  return out;
}


// ---------------------------------------------------------------- seasonal crowds and outfits
// On special days more people come out: families at the plaza for Tết, children with
// lanterns at Mid-Autumn, beachgoers in summer, a packed Night Market on Saturdays.
let crowdT = 5;
export function updateSeasonal(dt) {
  const s = G.state; if (!s.story.flags.freeRoam || G.scene !== G.scenes?.island || G.runtime.inCutscene) return;
  crowdT -= dt; if (crowdT > 0) return; crowdT = 12;
  const ev = eventOn(), h = s.time / 60;
  dressResidents(ev?.id === 'tet');
  if (!ev || (npcs.tourists || []).length >= 22) return;
  const spawn = (x, y, tag, n) => { for (let i = 0; i < n; i++) npcs.spawnVisitorAt?.(x + rand(-20, 20), y + rand(-10, 10), tag); };
  if (ev.id === 'tet' && h >= 8 && h < 20) spawn(900, 2400, 'plaza', 2);
  if (ev.id === 'midautumn' && h >= 17.5 && h < 22.5) { spawn(430, 820, 'nightmarket', 2); spawn(900, 1760, 'plaza', 1); }
  if (ev.id === 'summer' && h >= 9 && h < 18) spawn(900, 2400, 'beach', 2);
  if (ev.id === 'nmnight' && h >= 18 && h < 23) spawn(430, 820, 'nightmarket', 3);
  if ((ev.id === 'launch' || ev.id === 'nationalday' || ev.id === 'newyear') && h >= 9 && h < 23) spawn(900, 2400, 'plaza', 2);
  if ((ev.id === 'valentine' || ev.id === 'womensday' || ev.id === 'childrensday') && h >= 8 && h < 21) spawn(900, 2400, 'plaza', 1);
}
// Tết best: some neighbours wear red and gold
function dressResidents(on) {
  for (const a of npcs.residents || []) {
    const def = RESIDENTS[a.data?.rid]; if (!def) continue;
    const want = on && (a.data.rid.length % 2 === 0);
    if (want && !a.data.tet) { a.data.tet = true; a.look = { ...def.look, top: '#d9433a', top2: '#f2c14e', topStyle: def.look.topStyle === 'aodai' || /co_|ba_|chi_/.test(a.data.rid) ? 'aodai' : 'shirt' }; }
    else if (!want && a.data.tet) { a.data.tet = false; a.look = def.look; }
  }
}
