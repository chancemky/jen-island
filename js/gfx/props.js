// Scenery: trees, Vietnamese street furniture, boats, lanterns.
// Each draw function is called with the context translated to the prop's base
// point (where it touches the ground) and receives (c, t, p) so it can animate.

import { TAU, shade, rng } from '../core/util.js';
import { INK, ell, circ, box, poly, line, limb, shadow, glow, text } from './draw.js';

// Shared night-light factor (0 day … 1 night), set by the time system each frame.
export const LIGHT = { night: 0, dusk: 0, wind: 1 };

// ---------------------------------------------------------------- vegetation
function frond(c, len, ang, droop, col, w = 7) {
  c.save(); c.rotate(ang);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.5, -w - droop * 0.2, len, droop);
  c.quadraticCurveTo(len * 0.5, w * 0.35 + droop * 0.3, 0, 0);
  c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  c.strokeStyle = shade(col, -30); c.lineWidth = 0.7;
  c.beginPath(); c.moveTo(2, 0); c.quadraticCurveTo(len * 0.5, -w * 0.35 - droop * 0.1, len - 2, droop); c.stroke();
  // leaflet notches
  for (let i = 1; i < 5; i++) { const k = i / 5, x = len * k, y = droop * k * k - w * 0.5 * Math.sin(k * Math.PI); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3, y + 3.5); c.stroke(); }
  c.restore();
}
export function palm(c, t, p) {
  const h = p.h || 86, lean = p.lean ?? 0.12, sw = Math.sin(t * 1.1 + p.x * 0.01) * 0.04 * LIGHT.wind;
  shadow(c, 14 + lean * 40, 2, 26, 7, 0.14);
  // trunk: stacked rings along a curve
  const tx = lean * h, ty = -h;
  c.lineCap = 'round';
  const pts = [];
  for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push([tx * k * k + Math.sin(k * 3) * 2, ty * k]); }
  for (let i = 0; i < 10; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    limb(c, [x1, y1, x2, y2], 8.5 - i * 0.35, i % 2 ? '#b58352' : '#c49060');
  }
  c.save(); c.translate(tx, ty); c.rotate(sw);
  const cols = ['#6fbf5a', '#5eae4e', '#7fcc66'];
  const fr = [[-2.6, 40, 16], [-2.1, 44, 12], [-1.4, 38, 4], [-0.5, 40, 10], [0.2, 44, 16], [-3.2, 34, 20], [0.8, 36, 22]];
  fr.forEach(([a, l, d], i) => frond(c, l, a + Math.sin(t * 1.6 + i) * 0.035 * LIGHT.wind, d, cols[i % 3]));
  for (const [x, y] of [[-4, 4], [3, 5], [0, 7]]) circ(c, x, y, 3.6, '#8a5a32');
  c.restore();
}
function blob(c, x, y, r, col, seed = 1) {
  c.beginPath();
  const n = 9, R = rng(seed);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU, rr = r * (0.86 + R() * 0.2);
    const a2 = ((i + 0.5) / n) * TAU, rr2 = r * (1.02 + R() * 0.12);
    if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.88);
    else c.quadraticCurveTo(x + Math.cos(a2 - TAU / n) * rr2, y + Math.sin(a2 - TAU / n) * rr2 * 0.88, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.88);
  }
  c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
}
export function tree(c, t, p) {
  const s = p.s || 1, col = p.col || '#7cc463', sw = Math.sin(t * 1.3 + p.x * 0.02) * 1.2 * LIGHT.wind;
  shadow(c, 4, 1, 26 * s, 8 * s, 0.16);
  limb(c, [0, 0, 0, -26 * s], 8 * s, '#a8764a');
  limb(c, [0, -18 * s, -8 * s, -28 * s], 4 * s, '#a8764a');
  c.save(); c.translate(sw, 0);
  blob(c, -12 * s, -38 * s, 17 * s, shade(col, -12), p.x | 0);
  blob(c, 12 * s, -40 * s, 18 * s, shade(col, -6), (p.x | 0) + 3);
  blob(c, 0, -52 * s, 21 * s, col, (p.x | 0) + 7);
  ell(c, -5 * s, -60 * s, 8 * s, 4 * s, shade(col, 26), null);
  if (p.flowers) { const R = rng(p.x | 0); for (let i = 0; i < 16; i++) { circ(c, (R() - 0.5) * 50 * s, -34 * s - R() * 34 * s, 2.3 * s, p.flowers, INK, 0.5); } }
  if (p.fruit) { const R = rng((p.x | 0) + 1); for (let i = 0; i < 6; i++) circ(c, (R() - 0.5) * 40 * s, -32 * s - R() * 24 * s, 2.8 * s, p.fruit, INK, 0.6); }
  c.restore();
}
// Hoa phượng — the red flame tree of Vietnamese summers.
export function flameTree(c, t, p) { tree(c, t, { ...p, col: '#8ccf6a', flowers: '#f0553f', s: p.s || 1.15 }); }
export function banyan(c, t, p) {
  const s = p.s || 1, sw = Math.sin(t * 0.9) * 0.8 * LIGHT.wind;
  shadow(c, 0, 4, 80 * s, 20 * s, 0.18);
  // aerial roots
  for (let i = -3; i <= 3; i++) { if (!i) continue; c.strokeStyle = '#9c6c44'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(i * 14 * s, -54 * s); c.quadraticCurveTo(i * 16 * s + Math.sin(t + i) * 1.5, -24 * s, i * 15 * s, 0); c.stroke(); }
  poly(c, [-14 * s, 0, -9 * s, -50 * s, 9 * s, -50 * s, 14 * s, 0], '#a8764a');
  limb(c, [-6 * s, -40 * s, -30 * s, -62 * s], 6 * s, '#a8764a'); limb(c, [6 * s, -44 * s, 34 * s, -64 * s], 6 * s, '#a8764a');
  c.save(); c.translate(sw, 0);
  const cols = ['#5da24f', '#6db55a', '#79c262'];
  const blobs = [[-46, -72, 30], [46, -74, 30], [-20, -90, 34], [22, -94, 34], [0, -112, 30], [-58, -92, 22], [58, -94, 22]];
  blobs.forEach(([x, y, r], i) => blob(c, x * s, y * s, r * s, cols[i % 3], 90 + i));
  for (let i = 0; i < 5; i++) ell(c, (-30 + i * 16) * s, (-110 + (i % 2) * 8) * s, 7 * s, 3.4 * s, 'rgba(255,255,220,.35)', null);
  c.restore();
}
export function bush(c, t, p) {
  const s = p.s || 1, col = p.col || '#76bf5f', sw = Math.sin(t * 1.7 + p.x) * 0.6 * LIGHT.wind;
  shadow(c, 0, 1, 16 * s, 5 * s, 0.14);
  c.save(); c.translate(sw, 0);
  blob(c, -7 * s, -8 * s, 9 * s, shade(col, -10), p.x | 0);
  blob(c, 7 * s, -8 * s, 9 * s, shade(col, -4), (p.x | 0) + 1);
  blob(c, 0, -14 * s, 10 * s, col, (p.x | 0) + 2);
  if (p.flowers) { const R = rng(p.x | 0); for (let i = 0; i < 7; i++) { const x = (R() - 0.5) * 26 * s, y = -6 * s - R() * 16 * s; flower5(c, x, y, 2.4 * s, p.flowers); } }
  c.restore();
}
function flower5(c, x, y, r, col) {
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; circ(c, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.6, col, INK, 0.45); }
  circ(c, x, y, r * 0.4, '#ffd35a', null);
}
export function bamboo(c, t, p) {
  shadow(c, 0, 1, 22, 6, 0.14);
  const R = rng(p.x | 0), n = p.n || 6;
  for (let i = 0; i < n; i++) {
    const bx = (R() - 0.5) * 30, h = 70 + R() * 40, sw = Math.sin(t * 1.4 + i) * 3 * LIGHT.wind;
    c.strokeStyle = INK; c.lineWidth = 5.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, 0); c.quadraticCurveTo(bx, -h / 2, bx + sw, -h); c.stroke();
    c.strokeStyle = i % 2 ? '#9fcf6a' : '#8cc15c'; c.lineWidth = 3.8; c.stroke();
    for (let k = 1; k < 5; k++) { const y = -h * k / 5; line(c, bx - 2 + sw * k / 5, y, bx + 2 + sw * k / 5, y, '#5f8f3d', 0.9); }
    for (let k = 0; k < 3; k++) { const y = -h * (0.55 + k * 0.17); c.save(); c.translate(bx + sw * (0.55 + k * 0.17), y); c.rotate((k % 2 ? 0.9 : -0.9) + Math.sin(t * 2 + i + k) * 0.08); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(7, -3, 15, 0); c.quadraticCurveTo(7, 2, 0, 0); c.fillStyle = '#7cbd57'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke(); c.restore(); }
  }
}
export function banana(c, t, p) {
  shadow(c, 0, 1, 18, 5, 0.14);
  limb(c, [0, 0, 1, -30], 6, '#b4c77a');
  const leaves = [[-2.4, 30], [-1.9, 34], [-1.2, 30], [-0.7, 34], [-0.2, 28]];
  c.save(); c.translate(1, -30);
  leaves.forEach(([a, l], i) => { c.save(); c.rotate(a + Math.sin(t * 1.3 + i) * 0.05 * LIGHT.wind); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(l * 0.5, -11, l, 3); c.quadraticCurveTo(l * 0.5, 7, 0, 0); c.fillStyle = i % 2 ? '#7ecb5e' : '#6dba50'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); line(c, 1, 0, l - 2, 2, '#5f9f45', 0.8); c.restore(); });
  c.restore();
}
export function grassTuft(c, t, p) {
  const sw = Math.sin(t * 2.2 + p.x * 0.07 + p.y * 0.03) * 1.8 * LIGHT.wind;
  const col = p.col || '#6fb356';
  c.strokeStyle = col; c.lineWidth = 1.4; c.lineCap = 'round';
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 1.8, 0); c.quadraticCurveTo(i * 2.2, -4, i * 2.6 + sw * (1 + Math.abs(i) * 0.2), -7 - (2 - Math.abs(i)) * 1.5); c.stroke(); }
}
export function flowerPatch(c, t, p) {
  const R = rng((p.x * 7 + p.y) | 0), n = p.n || 5;
  for (let i = 0; i < n; i++) {
    const x = (R() - 0.5) * 22, y = (R() - 0.5) * 8, sw = Math.sin(t * 2 + i + p.x) * 1.2 * LIGHT.wind;
    line(c, x, y, x + sw, y - 6, '#5f9f45', 0.9);
    flower5(c, x + sw, y - 7, 2.2, p.col || ['#ff8fb0', '#fff', '#ffd35a', '#c9a8ff'][i % 4]);
  }
}
export function rock(c, t, p) {
  const s = p.s || 1;
  shadow(c, 0, 1, 12 * s, 4 * s, 0.14);
  c.beginPath(); c.moveTo(-12 * s, 0); c.quadraticCurveTo(-13 * s, -9 * s, -4 * s, -12 * s); c.quadraticCurveTo(8 * s, -14 * s, 12 * s, -4 * s); c.quadraticCurveTo(13 * s, 1, 0, 1); c.closePath();
  c.fillStyle = p.col || '#b9b3a8'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  ell(c, -3 * s, -9 * s, 4 * s, 2 * s, 'rgba(255,255,255,.35)', null);
}
export function lotus(c, t, p) {
  const bob = Math.sin(t * 1.4 + p.x) * 0.8;
  c.save(); c.translate(0, bob);
  c.beginPath(); c.ellipse(0, 0, 9, 5, 0, 0.3, TAU - 0.1); c.lineTo(0, 0); c.closePath(); c.fillStyle = '#6fb356'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
  if (p.flower) { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; c.save(); c.translate(2, -2); c.rotate(a + Math.PI / 2); c.beginPath(); c.ellipse(0, -4, 2, 4.5, 0, 0, TAU); c.fillStyle = i % 2 ? '#ffb6c9' : '#ff9ab5'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.6; c.stroke(); c.restore(); } circ(c, 2, -3, 1.3, '#ffd35a', null); }
  c.restore();
}

// ---------------------------------------------------------------- street furniture
export function lampPost(c, t, p) {
  shadow(c, 0, 1, 6, 2, 0.18);
  limb(c, [0, 0, 0, -40], 2.6, '#4d5a57');
  limb(c, [0, -40, 6, -44], 2, '#4d5a57');
  if (p.broken) { lanternDead(c, 7, -40); return; }
  lanternShape(c, 7, -40, 1, p.col || '#ea5a4f', t, p.x);
  if (LIGHT.night > 0.05) glowLater(p, 7, -34, 46, 'rgba(255,200,120,.55)');
}
// Glows are collected and drawn in an additive pass after the world.
export const glows = [];
function glowLater(p, dx, dy, r, col) { glows.push([p.x + dx, p.y + dy, r, col]); }
export function lanternShape(c, x, y, s, col, t, seed = 0) {
  const sw = Math.sin(t * 1.8 + seed) * 0.12;
  c.save(); c.translate(x, y); c.rotate(sw); c.scale(s, s);
  line(c, 0, 0, 0, 3, INK, 0.8);
  const lit = LIGHT.night > 0.05 && !(LIGHT.broken);
  ell(c, 0, 9, 6, 6.6, lit ? shade(col, 30) : col);
  for (const k of [2.8, 0]) { c.beginPath(); c.ellipse(0, 9, k + 0.3, 6.6, 0, 0, TAU); c.strokeStyle = shade(col, -40); c.lineWidth = 0.5; c.stroke(); }
  box(c, -3.2, 2.2, 6.4, 1.8, 0.6, '#f2c14e', INK, 0.6);
  box(c, -3.2, 14.8, 6.4, 1.8, 0.6, '#f2c14e', INK, 0.6);
  line(c, 0, 16.6, 0, 20 + Math.sin(t * 3 + seed) * 0.6, '#f2c14e', 1.2);
  if (lit) ell(c, -1.6, 7.4, 1.8, 2.6, 'rgba(255,255,220,.6)', null);
  c.restore();
}
// A string of lanterns between two poles. p: {x,y (left pole base), x2, y2, h, cols, broken}
export function lanternString(c, t, p) {
  const x2 = p.x2 - p.x, y2 = (p.y2 ?? p.y) - p.y, h = p.h || 46;
  for (const [px, py] of [[0, 0], [x2, y2]]) { shadow(c, px, py + 1, 5, 2, 0.16); limb(c, [px, py, px, py - h], 3, '#8a5f3e'); circ(c, px, py - h, 2.2, '#f2c14e'); }
  const sag = p.sag || 16, n = p.n || Math.max(3, Math.round(Math.abs(x2) / 26));
  const at = k => [x2 * k, y2 * k - h + Math.sin(k * Math.PI) * sag + Math.sin(t * 1.2 + p.x) * Math.sin(k * Math.PI) * 1.2];
  c.beginPath(); for (let i = 0; i <= 20; i++) { const [x, y] = at(i / 20); i ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
  const cols = p.cols || ['#ea5a4f', '#f2c14e', '#f08ca0', '#6fbfb0'];
  for (let i = 1; i < n; i++) {
    const k = i / n, [x, y] = at(k);
    if (p.broken && i % 2) { c.save(); c.translate(x, y); c.rotate(0.6); lanternDead(c); c.restore(); continue; }
    if (p.broken) { lanternDead(c, x, y); continue; }
    lanternShape(c, x, y, 0.72, cols[i % cols.length], t, i + p.x);
    if (LIGHT.night > 0.05) glowLater(p, x, y + 8, 30, 'rgba(255,190,110,.5)');
  }
}
function lanternDead(c, x = 0, y = 0) {
  c.save(); c.translate(x, y);
  line(c, 0, 0, 0, 2.5, INK, 0.7);
  c.beginPath(); c.moveTo(-3, 3); c.lineTo(3, 3); c.lineTo(4, 9); c.lineTo(-1, 12); c.lineTo(-4, 8); c.closePath();
  c.fillStyle = '#9d8a80'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
  line(c, -2, 5, 2, 9, 'rgba(60,40,30,.5)', 0.6);
  c.restore();
}
export function bench(c, t, p) {
  shadow(c, 0, 1, 20, 5, 0.16);
  box(c, -18, -12, 36, 5, 2, '#c88a52');
  box(c, -18, -20, 36, 5, 2, '#d9a064');
  for (const x of [-14, 14]) limb(c, [x, -8, x, 0], 2.4, '#7a5a40');
}
// Ghế nhựa — the iconic low plastic stool.
export function stool(c, t, p) {
  const col = p.col || '#e8584e';
  shadow(c, 0, 1, 6, 2, 0.16);
  poly(c, [-5, 0, -4, -7, 4, -7, 5, 0], shade(col, -20));
  ell(c, 0, -7.5, 5.4, 2.2, col);
  ell(c, 0, -7.6, 2.4, 0.9, shade(col, -30), null);
}
export function lowTable(c, t, p) {
  shadow(c, 0, 1, 14, 4, 0.16);
  for (const x of [-10, 10]) limb(c, [x, -9, x, 0], 2, '#8f96a0');
  box(c, -14, -13, 28, 5, 2, p.col || '#e9eef2');
}
export function scooter(c, t, p) {
  const col = p.col || '#f28f7c', f = p.flip ? -1 : 1;
  c.save(); c.scale(f, 1);
  shadow(c, 0, 1, 22, 5, 0.2);
  // wheels
  for (const x of [-14, 14]) { circ(c, x, -6, 6, '#3d3a42'); circ(c, x, -6, 2.4, '#b9c3cb', INK, 0.6); }
  // body
  c.beginPath(); c.moveTo(-18, -8); c.quadraticCurveTo(-20, -20, -8, -20); c.lineTo(4, -20); c.lineTo(10, -8); c.closePath();
  c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  box(c, -16, -25, 18, 5, 2.5, '#5a4a48');
  limb(c, [8, -9, 14, -32], 2.4, shade(col, -20));
  limb(c, [11, -32, 19, -33], 2, '#3d3a42');
  circ(c, 16, -26, 2.4, '#fff5c8');
  if (p.basket) box(c, 12, -30, 9, 6, 1.5, '#e9c46f');
  if (p.rider) { c.save(); c.translate(-4, -18); p.rider(c, t); c.restore(); }
  c.restore();
}
// Thuyền thúng — the round basket boat.
export function basketBoat(c, t, p) {
  const bob = p.water ? Math.sin(t * 1.6 + p.x) * 1.4 : 0;
  c.save(); c.translate(0, bob);
  if (p.water) { ell(c, 0, 2, 22, 6, 'rgba(255,255,255,.35)', null); }
  else shadow(c, 0, 1, 20, 5, 0.16);
  c.beginPath(); c.ellipse(0, -6, 19, 8, 0, 0, Math.PI); c.lineTo(-19, -6); c.fillStyle = '#9c7048'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  ell(c, 0, -6, 19, 6, '#7a5236');
  c.strokeStyle = '#c49a6a'; c.lineWidth = 0.7;
  for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 5, -12); c.lineTo(i * 5.2, 1); c.stroke(); }
  ell(c, 0, -6, 19, 6, null, INK, 1.2);
  if (p.oar) limb(c, [6, -8, 20, -20], 1.6, '#c49a6a');
  c.restore();
}
export function fishingBoat(c, t, p) {
  const bob = Math.sin(t * 1.3 + p.x * 0.1) * 1.8, rock = Math.sin(t * 1.1 + p.x) * 0.03;
  c.save(); c.translate(0, bob); c.rotate(rock); c.scale(p.flip ? -1 : 1, 1);
  ell(c, 0, 3, 46, 7, 'rgba(255,255,255,.3)', null);
  c.beginPath(); c.moveTo(-44, -14); c.quadraticCurveTo(-30, 4, 0, 4); c.quadraticCurveTo(34, 4, 46, -18); c.lineTo(38, -12); c.lineTo(-40, -12); c.closePath();
  c.fillStyle = p.col || '#4f8fc9'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
  c.fillStyle = '#e8584e'; c.fillRect(-38, -8, 76, 3);
  // painted eye on the bow, a Vietnamese fishing-boat tradition
  ell(c, 34, -9, 3.4, 2.2, '#fff', INK, 0.7); circ(c, 34.5, -9, 1.2, '#2a2a2a', null);
  box(c, -16, -30, 22, 18, 3, '#fff5df');
  poly(c, [-20, -30, 10, -30, 6, -36, -16, -36], '#e8584e');
  limb(c, [14, -12, 14, -46], 1.6, '#8a5f3e');
  c.beginPath(); c.moveTo(14, -46); c.lineTo(34, -30); c.lineTo(14, -30); c.closePath(); c.fillStyle = '#fff8e8'; c.fill(); c.stroke();
  c.fillStyle = '#e8584e'; poly(c, [14, -46, 24, -50, 14, -52], '#e8584e', INK, 0.6);
  c.restore();
}
export function umbrella(c, t, p) {
  const col = p.col || '#f28f7c', col2 = p.col2 || '#fff5df', sw = Math.sin(t * 1.2 + p.x) * 0.03;
  shadow(c, 10, 2, 30, 8, 0.12);
  limb(c, [0, 0, -3, -44], 1.8, '#d9c9b4');
  c.save(); c.translate(-3, -44); c.rotate(-0.12 + sw);
  // dome canopy with alternating panels
  const R = 30, H = 15;
  for (let i = 0; i < 6; i++) {
    const a1 = i / 6, a2 = (i + 1) / 6;
    c.beginPath(); c.moveTo(0, -H);
    c.quadraticCurveTo(-R + a1 * 2 * R, -H * 0.9, -R + a1 * 2 * R, 2);
    c.quadraticCurveTo(-R + (a1 + a2) * R, 6, -R + a2 * 2 * R, 2);
    c.quadraticCurveTo(-R + a2 * 2 * R, -H * 0.9, 0, -H);
    c.closePath(); c.fillStyle = i % 2 ? col : col2; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  }
  circ(c, 0, -H - 1, 2.2, col);
  c.restore();
}
export function lounger(c, t, p) {
  shadow(c, 0, 1, 20, 5, 0.12);
  poly(c, [-18, -3, 10, -3, 12, -6, -16, -6], '#fff5df');
  poly(c, [10, -6, 12, -6, 20, -16, 17, -18], '#fff5df');
  c.fillStyle = p.col || '#6fbfb0'; for (let i = 0; i < 4; i++) c.fillRect(-14 + i * 7, -6, 3, 3);
  for (const x of [-14, 8]) line(c, x, -3, x, 0, INK, 1);
}
export function crate(c, t, p) {
  const s = p.s || 1;
  shadow(c, 0, 1, 11 * s, 3 * s, 0.16);
  box(c, -10 * s, -18 * s, 20 * s, 18 * s, 2, p.col || '#c9955e');
  line(c, -9 * s, -17 * s, 9 * s, -1 * s, shade(p.col || '#c9955e', -30), 1);
  line(c, -10 * s, -9 * s, 10 * s, -9 * s, shade(p.col || '#c9955e', -30), 1);
  if (p.fruit) for (let i = 0; i < 4; i++) circ(c, (-6 + i * 4) * s, -18 * s, 3 * s, p.fruit);
}
export function pot(c, t, p) {
  const s = p.s || 1;
  shadow(c, 0, 1, 9 * s, 3 * s, 0.16);
  c.beginPath(); c.moveTo(-6 * s, -12 * s); c.quadraticCurveTo(-11 * s, -6 * s, -6 * s, 0); c.lineTo(6 * s, 0); c.quadraticCurveTo(11 * s, -6 * s, 6 * s, -12 * s); c.closePath();
  c.fillStyle = p.col || '#d9784f'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  ell(c, 0, -12 * s, 6.5 * s, 2 * s, shade(p.col || '#d9784f', -20));
  if (p.plant !== false) { const sw = Math.sin(t * 2 + p.x) * 0.8; for (let i = -2; i <= 2; i++) { c.save(); c.translate(i * 2 * s, -13 * s); c.rotate(i * 0.35 + sw * 0.05); c.beginPath(); c.ellipse(0, -6 * s, 2.4 * s, 6 * s, 0, 0, TAU); c.fillStyle = i % 2 ? '#76bf5f' : '#6aae52'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke(); c.restore(); } if (p.flowers) flower5(c, 2 * s, -22 * s, 2.6 * s, p.flowers); }
}
export function signpost(c, t, p) {
  shadow(c, 0, 1, 6, 2, 0.16);
  limb(c, [0, 0, 0, -44], 3, '#8a5f3e');
  (p.signs || []).forEach((s, i) => {
    const y = -40 + i * 11, dir = s.dir || 1;
    c.save(); c.translate(0, y);
    poly(c, dir > 0 ? [-2, -4.5, 34, -4.5, 40, 0, 34, 4.5, -2, 4.5] : [2, -4.5, -34, -4.5, -40, 0, -34, 4.5, 2, 4.5], s.col || '#f3dcae', INK, 0.9);
    text(c, s.label, dir * 17, 0.4, 5.6, INK, 900);
    c.restore();
  });
}
export function fence(c, t, p) {
  const w = p.w || 60;
  for (let x = 0; x <= w; x += 10) limb(c, [x, 0, x, -14], 2.6, '#c9a26a');
  line(c, -1, -10, w + 1, -10, INK, 3.4); line(c, -1, -10, w + 1, -10, '#b9905a', 2);
  line(c, -1, -4, w + 1, -4, INK, 3.4); line(c, -1, -4, w + 1, -4, '#b9905a', 2);
}
export function clothesline(c, t, p) {
  const w = p.w || 50;
  for (const x of [0, w]) limb(c, [x, 0, x, -34], 2, '#8a5f3e');
  c.beginPath(); c.moveTo(0, -32); c.quadraticCurveTo(w / 2, -26, w, -32); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
  const cols = ['#f4a9b8', '#a9d4f0', '#fff5df', '#f7de8c'];
  for (let i = 0; i < 4; i++) { const x = 6 + i * (w - 12) / 3, y = -30 + Math.sin((x / w) * Math.PI) * 5, sw = Math.sin(t * 2.4 + i) * 1.4 * LIGHT.wind; c.save(); c.translate(x, y); c.rotate(sw * 0.05); poly(c, [-4, 0, 4, 0, 5 + sw * 0.3, 10, -5 + sw * 0.3, 10], cols[i], INK, 0.7); c.restore(); }
}
export function foodCart(c, t, p) {
  // xe đẩy — a street-food push cart
  shadow(c, 0, 1, 22, 5, 0.18);
  for (const x of [-14, 12]) { circ(c, x, -5, 5, '#3d3a42'); circ(c, x, -5, 1.8, '#b9c3cb', null); }
  box(c, -20, -26, 40, 20, 3, '#fff5df');
  box(c, -20, -30, 40, 5, 2, '#6fbfb0');
  box(c, -16, -44, 32, 14, 2, 'rgba(210,240,250,.55)');
  for (let i = 0; i < 3; i++) ell(c, -10 + i * 10, -34, 4, 2, ['#e0a052', '#f7de8c', '#ff9a7a'][i]);
  limb(c, [20, -18, 30, -24], 2, '#8f96a0');
  text(c, p.label || 'BÁNH MÌ', 0, -16, 5.4, '#e8584e', 900);
  if (LIGHT.night > 0.05) glowLater(p, 0, -30, 40, 'rgba(255,210,140,.45)');
}
export function fountain(c, t, p) {
  shadow(c, 0, 3, 44, 12, 0.14);
  ell(c, 0, -4, 42, 14, '#d9d2c4');
  ell(c, 0, -6, 36, 11, '#7fcfe0', INK, 1);
  // ripples
  for (let i = 0; i < 3; i++) { const k = ((t * 0.5 + i / 3) % 1); c.globalAlpha = 1 - k; ell(c, 0, -6, 6 + k * 28, 2 + k * 9, null, 'rgba(255,255,255,.9)', 1); } c.globalAlpha = 1;
  box(c, -5, -30, 10, 24, 3, '#e9e2d4');
  ell(c, 0, -30, 12, 4, '#d9d2c4');
  // water arcs
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + t * 0.2, dx = Math.cos(a) * 16, dy = Math.sin(a) * 5; c.strokeStyle = 'rgba(200,240,255,.85)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -34); c.quadraticCurveTo(dx * 0.6, -46, dx, -8 + dy); c.stroke(); }
  for (let i = 0; i < 5; i++) { const k = (t * 1.3 + i * 0.2) % 1; circ(c, Math.sin(i * 3) * 10 * k, -34 - Math.sin(k * Math.PI) * 10, 1.1, 'rgba(255,255,255,.9)', null); }
}
// Cổng chào — the welcome gate at the dock, showing the island's name.
export function welcomeGate(c, t, p) {
  const w = p.w || 110;
  for (const x of [-w / 2, w / 2]) { shadow(c, x, 1, 7, 2.4, 0.18); box(c, x - 5, -66, 10, 66, 2, '#e8584e'); box(c, x - 7, -6, 14, 6, 1.5, '#c9433a'); }
  // curved roof beam
  c.beginPath(); c.moveTo(-w / 2 - 18, -70); c.quadraticCurveTo(0, -80, w / 2 + 18, -70); c.lineTo(w / 2 + 22, -76); c.quadraticCurveTo(0, -90, -w / 2 - 22, -76); c.closePath();
  c.fillStyle = '#d9784f'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
  box(c, -w / 2 + 2, -64, w - 4, 16, 3, '#f2c14e');
  text(c, p.label?.() || 'JEN ISLAND', 0, -55.6, Math.min(9, 150 / Math.max(6, (p.label?.() || '').length)), '#9a3a2e', 900);
  text(c, 'Chào mừng', 0, -42, 5.5, '#fff5df', 900, 'center', INK, 2);
  lanternShape(c, -w / 2 + 12, -48, 0.7, '#ea5a4f', t, 1); lanternShape(c, w / 2 - 12, -48, 0.7, '#ea5a4f', t, 2);
  if (LIGHT.night > 0.05) { glowLater(p, -w / 2 + 12, -40, 30, 'rgba(255,190,110,.55)'); glowLater(p, w / 2 - 12, -40, 30, 'rgba(255,190,110,.55)'); }
}
export function lighthouse(c, t, p) {
  shadow(c, 0, 2, 26, 8, 0.18);
  poly(c, [-16, 0, -10, -110, 10, -110, 16, 0], '#fff8ee');
  c.save(); c.beginPath(); c.moveTo(-16, 0); c.lineTo(-10, -110); c.lineTo(10, -110); c.lineTo(16, 0); c.closePath(); c.clip();
  c.fillStyle = '#e8584e'; for (let y = -20; y > -110; y -= 34) c.fillRect(-20, y - 14, 40, 14);
  c.restore();
  poly(c, [-16, 0, -10, -110, 10, -110, 16, 0], null);
  box(c, -14, -116, 28, 6, 2, '#5a4a48');
  box(c, -9, -134, 18, 18, 3, 'rgba(255,245,200,.9)');
  poly(c, [-12, -134, 12, -134, 0, -146], '#e8584e');
  box(c, -4, -18, 8, 18, 3, '#8a5f3e');
  const beam = (Math.sin(t * 1.2) + 1) / 2;
  if (LIGHT.night > 0.05) { glowLater(p, 0, -126, 60 + beam * 20, 'rgba(255,240,180,.65)'); }
}
export function shrine(c, t, p) {
  // miếu — a tiny roadside shrine with incense
  shadow(c, 0, 1, 10, 3, 0.16);
  limb(c, [0, 0, 0, -18], 3, '#9a8a7a');
  box(c, -9, -30, 18, 13, 2, '#f7e3b5');
  poly(c, [-12, -30, 12, -30, 8, -37, -8, -37], '#e8584e');
  box(c, -4, -27, 8, 8, 1.5, '#c9433a', INK, 0.6);
  for (let i = -1; i <= 1; i++) { line(c, i * 2, -18, i * 2, -24, '#c9433a', 0.8); const k = (t * 0.4 + i * 0.3) % 1; c.globalAlpha = 0.6 * (1 - k); c.strokeStyle = '#ddd'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(i * 2, -24 - k * 2); c.quadraticCurveTo(i * 2 + 2, -28 - k * 8, i * 2, -32 - k * 10); c.stroke(); c.globalAlpha = 1; }
}
export function statue(c, t, p) {
  shadow(c, 0, 2, 30, 9, 0.18);
  box(c, -24, -18, 48, 18, 3, '#d9d2c4');
  box(c, -18, -30, 36, 12, 3, '#e9e2d4');
  text(c, p.label?.() || 'FOUNDER', 0, -9, 5, '#8a7a6a', 900);
  if (p.drawFigure) { c.save(); c.translate(0, -30); c.scale(1.6, 1.6); p.drawFigure(c, t); c.restore(); }
}
export function buoy(c, t, p) { const b = Math.sin(t * 2 + p.x) * 1.5; c.save(); c.translate(0, b); ell(c, 0, 1, 7, 2.4, 'rgba(255,255,255,.4)', null); poly(c, [-5, 0, 5, 0, 3, -10, -3, -10], '#e8584e'); box(c, -3, -10, 6, 3, 1, '#fff'); c.restore(); }
export function haystack(c, t, p) { shadow(c, 0, 1, 16, 5, 0.14); c.beginPath(); c.moveTo(-16, 0); c.quadraticCurveTo(-16, -26, 0, -30); c.quadraticCurveTo(16, -26, 16, 0); c.closePath(); c.fillStyle = '#e9c46f'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); for (let i = 0; i < 5; i++) line(c, -12 + i * 6, -3, -10 + i * 5, -20, '#c9a24f', 0.8); }
export function buffalo(c, t, p) {
  // a friendly water buffalo lying in the paddy
  const br = Math.sin(t * 1.5) * 0.4;
  shadow(c, 0, 1, 20, 5, 0.16);
  ell(c, 0, -9 + br * 0.3, 18, 9, '#6f6a72');
  ell(c, 16, -12, 7, 6, '#7a757e');
  c.beginPath(); c.moveTo(12, -17); c.quadraticCurveTo(6, -26, 14, -26); c.moveTo(20, -17); c.quadraticCurveTo(26, -26, 18, -26); c.strokeStyle = '#e9e2d4'; c.lineWidth = 2.4; c.stroke();
  circ(c, 18, -12, 1, '#2a2a2a', null); ell(c, 20, -9, 3, 2, '#8a858e', INK, 0.6);
  const tail = Math.sin(t * 3) * 3; line(c, -17, -10, -21, -4 + tail * 0.3, INK, 1);
}
export function seagull(c, t, p) {
  const f = Math.sin(t * 9 + p.seed) * 0.5;
  c.strokeStyle = INK; c.lineWidth = 1.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-7, -f * 6); c.quadraticCurveTo(-3, -4, 0, 0); c.quadraticCurveTo(3, -4, 7, -f * 6); c.stroke();
  c.strokeStyle = '#fff'; c.lineWidth = 0.7; c.stroke();
}
