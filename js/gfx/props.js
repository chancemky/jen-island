// Scenery: trees, Vietnamese street furniture, boats, lanterns.
// Each draw function is called with the context translated to the prop's base
// point (where it touches the ground) and receives (c, t, p) so it can animate.

import { TAU, shade, rng } from '../core/util.js';
import { T, tr } from '../systems/state.js';
import { INK, ell, circ, box, poly, line, limb, shadow, glow, text } from './draw.js';

// Shared night-light factor (0 day … 1 night), set by the time system each frame.
export const LIGHT = { night: 0, dusk: 0, wind: 1 };

// ---------------------------------------------------------------- wind
// A gust field that travels across the island from west to east, so trees
// sway in waves rather than in unison.
export function wind(x, t, y = 0) {
  const gust = 0.55 + 0.45 * Math.sin(t * 0.19 + 0.6) * Math.sin(t * 0.07 + 2);
  return (Math.sin(t * 1.05 - x * 0.0042 - y * 0.0015) * 0.7 + Math.sin(t * 2.4 - x * 0.013 + 1.7) * 0.3) * gust * LIGHT.wind;
}

// ---------------------------------------------------------------- vegetation
// Scalloped "leaf cluster": a ring of little arcs gives the soft, bumpy
// canopy edge that matches the rounded character art.
function leafBlob(c, x, y, r, col, seed = 0, bumps = 9) {
  c.beginPath();
  for (let i = 0; i < bumps; i++) {
    const a = (i + 0.5) / bumps * TAU + seed;
    const rr = r * (0.9 + ((i * 7 + seed * 13) % 5) * 0.025);
    c.arc(x + Math.cos(a) * rr * 0.78, y + Math.sin(a) * rr * 0.7, r * 0.36, a - 1.35, a + 1.35);
  }
  c.closePath();
  c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
}
function leafMarks(c, x, y, r, col, seed) {
  c.strokeStyle = col; c.lineWidth = 1.2; c.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = seed + i * 1.7, rr = r * (0.25 + (i % 3) * 0.18);
    const lx = x + Math.cos(a) * rr - r * 0.15, ly = y + Math.sin(a) * rr * 0.6 - r * 0.2;
    c.beginPath(); c.moveTo(lx - 2.4, ly + 0.8); c.quadraticCurveTo(lx, ly - 1.6, lx + 2.4, ly + 0.8); c.stroke();
  }
}
function frond(c, len, ang, droop, col, w = 7, flutter = 0) {
  c.save(); c.rotate(ang);
  // midrib
  const mid = k => [len * k, droop * k * k - w * 0.4 * Math.sin(k * Math.PI)];
  // leaflets fanning off both sides, fluttering in the wind
  for (let i = 1; i <= 9; i++) {
    const k = i / 10, [x, y] = mid(k), l = w * (1.3 - k * 0.7);
    for (const s of [-1, 1]) {
      const f = Math.sin(flutter + i * 0.9 + s) * 0.18;
      c.beginPath(); c.moveTo(x, y);
      c.quadraticCurveTo(x + l * 0.35, y + s * l * 0.35, x + l * 0.55 + f * l, y + s * l * (0.95 + f));
      c.quadraticCurveTo(x + l * 0.15, y + s * l * 0.2, x, y);
      c.fillStyle = s < 0 ? col : shade(col, -14); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
    }
  }
  c.beginPath(); c.moveTo(0, 0); for (let i = 1; i <= 10; i++) { const [x, y] = mid(i / 10); c.lineTo(x, y); }
  c.strokeStyle = INK; c.lineWidth = 2.2; c.stroke(); c.strokeStyle = shade(col, -30); c.lineWidth = 1; c.stroke();
  c.restore();
}
export function palm(c, t, p) {
  const h = p.h || 86, lean = p.lean ?? 0.12, w = wind(p.x, t, p.y);
  shadow(c, 14 + lean * 40 + w * 3, 2, 26, 7, 0.14);
  const bend = w * 5;
  const tx = lean * h + bend, ty = -h;
  const pts = [];
  for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push([lean * h * k * k + bend * k * k * k + Math.sin(k * 3) * 2, ty * k]); }
  for (let i = 0; i < 10; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    limb(c, [x1, y1, x2, y2], 8.5 - i * 0.35, i % 2 ? '#b58352' : '#c49060');
    if (i % 2 === 0) line(c, x1 - 3, y1 - 1, x1 + 3, y1 - 2, 'rgba(91,63,54,.35)', 0.7);
  }
  c.save(); c.translate(tx, ty); c.rotate(w * 0.05);
  const cols = ['#6fbf5a', '#5eae4e', '#7fcc66'];
  const fr = [[-2.6, 40, 16], [-2.1, 44, 12], [-1.4, 38, 4], [-0.5, 40, 10], [0.2, 44, 16], [-3.2, 34, 20], [0.8, 36, 22]];
  fr.forEach(([a, l, d], i) => frond(c, l, a + w * 0.12 * (a > -1.6 ? 1 : -0.6) + Math.sin(t * 1.6 + i) * 0.02, d + w * 3, cols[i % 3], 7, t * 3 + i + w));
  for (const [x, y] of [[-4, 4], [3, 5], [0, 7], [-1, 2]]) { circ(c, x, y, 3.6, '#8a5a32'); circ(c, x - 1, y - 1.2, 1, 'rgba(255,255,255,.35)', null); }
  c.restore();
}
export function tree(c, t, p) {
  const s = p.s || 1, col = p.col || '#7cc463', w = wind(p.x, t, p.y);
  const seed = (p.x * 0.37) % 6;
  shadow(c, 4 + w * 2, 1, 28 * s, 8.5 * s, 0.16);
  // trunk with a root flare, slight bend in the wind
  const top = -30 * s, bx = w * 2.2 * s;
  c.beginPath();
  c.moveTo(-6.5 * s, 0); c.quadraticCurveTo(-3.2 * s, -6 * s, -3.4 * s + bx * 0.6, top);
  c.lineTo(3.4 * s + bx * 0.6, top); c.quadraticCurveTo(3.2 * s, -6 * s, 6.5 * s, 0);
  c.quadraticCurveTo(0, 2 * s, -6.5 * s, 0); c.closePath();
  c.fillStyle = '#a8764a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  c.strokeStyle = 'rgba(91,63,54,.35)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-1 * s, -4 * s); c.quadraticCurveTo(-1.8 * s, -14 * s, -0.6 * s + bx * 0.3, -24 * s); c.moveTo(1.6 * s, -8 * s); c.lineTo(1.2 * s + bx * 0.4, -18 * s); c.stroke();
  limb(c, [0 + bx * 0.5, -22 * s, -9 * s + bx, -30 * s], 3.4 * s, '#a8764a');
  limb(c, [1 + bx * 0.5, -24 * s, 9 * s + bx, -33 * s], 3 * s, '#a8764a');
  // canopy clusters: each sways a little differently, higher ones more
  const dark = shade(col, -20), mid = shade(col, -8), light = shade(col, 18), hl = shade(col, 42);
  const clusters = [[-15, -38, 16, dark], [15, -40, 16, dark], [0, -36, 15, dark], [-9, -50, 17, mid], [11, -52, 17, mid], [0, -62, 17, col], [-4, -44, 12, light]];
  for (const [i, [x, y, r, cc]] of clusters.entries()) {
    const sw = w * (2 + (-y / 60) * 3.2) * s + Math.sin(t * 2.2 + i + seed) * 0.35;
    leafBlob(c, x * s + sw, y * s, r * s, cc, seed + i, 9);
    if (cc === col || cc === light) leafMarks(c, x * s + sw, y * s, r * s, hl, seed + i * 2);
  }
  // soft top highlight
  ell(c, -5 * s + w * 5 * s, -68 * s, 7 * s, 3.2 * s, 'rgba(255,255,230,.35)', null);
  if (p.flowers) { const R = rng(p.x | 0); for (let i = 0; i < 18; i++) { const fx0 = (R() - 0.5) * 50 * s, fy = -34 * s - R() * 36 * s; flower5(c, fx0 + w * (2 + -fy / 60 * 3) * s, fy, 2.1 * s, p.flowers); } }
  if (p.fruit) { const R = rng((p.x | 0) + 1); for (let i = 0; i < 7; i++) { const fx0 = (R() - 0.5) * 40 * s, fy = -32 * s - R() * 24 * s; circ(c, fx0 + w * 3 * s, fy, 2.8 * s, p.fruit, INK, 0.6); circ(c, fx0 + w * 3 * s - 0.8, fy - 0.9, 0.8, 'rgba(255,255,255,.6)', null); } }
}
// Hoa phượng — the red flame tree of Vietnamese summers.
export function flameTree(c, t, p) { tree(c, t, { ...p, col: '#8ccf6a', flowers: '#f0553f', s: p.s || 1.15 }); }
// Hoa sứ — frangipani, with white-and-yellow blossoms.
export function frangipani(c, t, p) {
  const s = p.s || 1, w = wind(p.x, t, p.y);
  shadow(c, 2, 1, 18 * s, 5 * s, 0.15);
  for (const [a, l] of [[-0.5, 26], [0.1, 30], [0.6, 24]]) { const ex = Math.sin(a) * l * s + w * 2, ey = -Math.cos(a) * l * s; limb(c, [0, 0, ex * 0.5, ey * 0.6, ex, ey], 3.2 * s, '#b7926e'); }
  const tips = [[-12, -24], [4, -30], [14, -22]];
  for (const [i, [x, y]] of tips.entries()) {
    const sw = w * 3 * s;
    for (let k = 0; k < 5; k++) { c.save(); c.translate(x * s + sw, y * s); c.rotate(k / 5 * TAU + w * 0.2); c.beginPath(); c.ellipse(0, -6 * s, 2.6 * s, 7 * s, 0, 0, TAU); c.fillStyle = k % 2 ? '#6fb356' : '#7fc062'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); c.restore(); }
    for (let k = 0; k < 3; k++) { const fx0 = x * s + sw + (k - 1) * 4 * s, fy = y * s - 2 * s - (k % 2) * 3 * s; for (let q = 0; q < 5; q++) { const a = q / 5 * TAU + i; c.beginPath(); c.ellipse(fx0 + Math.cos(a) * 1.8 * s, fy + Math.sin(a) * 1.8 * s, 1.6 * s, 1.1 * s, a, 0, TAU); c.fillStyle = '#fffdf2'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.4; c.stroke(); } circ(c, fx0, fy, 1 * s, '#ffd35a', null); }
  }
}
function blob(c, x, y, r, col, seed = 1) { leafBlob(c, x, y, r, col, seed % 6, 8); }
export function banyan(c, t, p) {
  const s = p.s || 1, w = wind(p.x, t, p.y);
  shadow(c, 0, 4, 80 * s, 20 * s, 0.18);
  for (let i = -3; i <= 3; i++) { if (!i) continue; c.strokeStyle = '#9c6c44'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(i * 14 * s, -54 * s); c.quadraticCurveTo(i * 16 * s + w * 3, -24 * s, i * 15 * s + w * 1.5, 0); c.stroke(); }
  poly(c, [-14 * s, 0, -9 * s, -50 * s, 9 * s, -50 * s, 14 * s, 0], '#a8764a');
  c.strokeStyle = 'rgba(91,63,54,.35)'; c.lineWidth = 1; for (const x of [-5, 0, 5]) { c.beginPath(); c.moveTo(x * s, -4 * s); c.quadraticCurveTo(x * s - 2, -26 * s, x * s * 0.8, -48 * s); c.stroke(); }
  limb(c, [-6 * s, -40 * s, -30 * s, -62 * s], 6 * s, '#a8764a'); limb(c, [6 * s, -44 * s, 34 * s, -64 * s], 6 * s, '#a8764a');
  const cols = ['#5da24f', '#6db55a', '#79c262', '#86cc6c'];
  const blobs = [[-46, -72, 30, 0], [46, -74, 30, 0], [0, -76, 30, 0], [-20, -92, 34, 1], [22, -96, 34, 1], [-58, -92, 22, 2], [58, -94, 22, 2], [0, -114, 30, 3]];
  blobs.forEach(([x, y, r, ci], i) => { const sw = w * (2 + -y / 60 * 2.4) * s; leafBlob(c, x * s + sw, y * s, r * s, cols[ci], i, 11); if (ci >= 2) leafMarks(c, x * s + sw, y * s, r * s, shade(cols[ci], 40), i); });
  if (p.fireflies && LIGHT.night > 0.2) for (let i = 0; i < 16; i++) { const a = t * (0.3 + (i % 5) * 0.08) + i * 1.7, x = Math.cos(a) * (30 + (i * 13) % 50), y = -40 - Math.sin(a * 1.3) * 30 - (i * 7) % 50; const k = (Math.sin(t * 3 + i * 2.3) + 1) / 2; circ(c, x, y, 1.2 + k, `rgba(255,245,150,${0.4 + k * 0.6})`, null); glows.push([p.x + x, p.y + y, 10, 'rgba(255,240,140,.35)']); }
}
export function bush(c, t, p) {
  const s = p.s || 1, col = p.col || '#76bf5f', w = wind(p.x, t, p.y) * 0.8;
  shadow(c, 0, 1, 16 * s, 5 * s, 0.14);
  const seed = (p.x | 0) % 6;
  leafBlob(c, -7 * s + w * 0.6, -8 * s, 9 * s, shade(col, -14), seed, 7);
  leafBlob(c, 7 * s + w * 0.6, -8 * s, 9 * s, shade(col, -6), seed + 1, 7);
  leafBlob(c, 0 + w, -14 * s, 10 * s, col, seed + 2, 8);
  leafMarks(c, w, -14 * s, 10 * s, shade(col, 40), seed);
  if (p.flowers) { const R = rng(p.x | 0); for (let i = 0; i < 8; i++) { const x = (R() - 0.5) * 26 * s + w, y = -6 * s - R() * 16 * s; flower5(c, x, y, 2.4 * s, p.flowers); } }
}
function flower5(c, x, y, r, col) {
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; circ(c, x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, r * 0.6, col, INK, 0.45); }
  circ(c, x, y, r * 0.4, '#ffd35a', null);
}
export function bamboo(c, t, p) {
  shadow(c, 0, 1, 22, 6, 0.14);
  const R = rng(p.x | 0), n = p.n || 6;
  for (let i = 0; i < n; i++) {
    const bx = (R() - 0.5) * 30, h = 70 + R() * 40, sw = wind(p.x + bx, t, p.y) * 6 + Math.sin(t * 1.4 + i) * 0.8;
    c.strokeStyle = INK; c.lineWidth = 5.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx, 0); c.quadraticCurveTo(bx, -h / 2, bx + sw, -h); c.stroke();
    c.strokeStyle = i % 2 ? '#9fcf6a' : '#8cc15c'; c.lineWidth = 3.8; c.stroke();
    for (let k = 1; k < 5; k++) { const y = -h * k / 5, ox = sw * (k / 5) * (k / 5); line(c, bx - 2 + ox, y, bx + 2 + ox, y, '#5f8f3d', 0.9); }
    for (let k = 0; k < 4; k++) { const kk = 0.5 + k * 0.14, y = -h * kk; c.save(); c.translate(bx + sw * kk * kk, y); c.rotate((k % 2 ? 0.9 : -0.9) + sw * 0.05 + Math.sin(t * 3 + i + k) * 0.08); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(7, -3, 16, 0); c.quadraticCurveTo(7, 2, 0, 0); c.fillStyle = k % 2 ? '#7cbd57' : '#8cc966'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke(); c.restore(); }
  }
}
export function banana(c, t, p) {
  const w = wind(p.x, t, p.y);
  shadow(c, 0, 1, 18, 5, 0.14);
  limb(c, [0, 0, 1 + w, -30], 6, '#b4c77a');
  const leaves = [[-2.4, 30], [-1.9, 34], [-1.2, 30], [-0.7, 34], [-0.2, 28]];
  c.save(); c.translate(1 + w, -30);
  leaves.forEach(([a, l], i) => { c.save(); c.rotate(a + w * 0.1 + Math.sin(t * 2.3 + i) * 0.04); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(l * 0.5, -11, l, 3); c.quadraticCurveTo(l * 0.5, 7, 0, 0); c.fillStyle = i % 2 ? '#7ecb5e' : '#6dba50'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); line(c, 1, 0, l - 2, 2, '#5f9f45', 0.8); for (let k = 1; k < 4; k++) line(c, l * k / 4, -2 + k * 0.4, l * k / 4 + 2, 3, 'rgba(95,159,69,.6)', 0.6); c.restore(); });
  c.restore();
}
export function grassTuft(c, t, p) {
  const sw = wind(p.x, t, p.y) * 2.6 + Math.sin(t * 3 + p.x) * 0.4;
  const col = p.col || '#6fb356';
  c.strokeStyle = col; c.lineWidth = 1.5; c.lineCap = 'round';
  for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 1.8, 0); c.quadraticCurveTo(i * 2.2 + sw * 0.3, -4, i * 2.6 + sw * (1 + Math.abs(i) * 0.2), -7 - (2 - Math.abs(i)) * 1.5); c.stroke(); }
  c.strokeStyle = shade(col, 30); c.lineWidth = 0.8; c.beginPath(); c.moveTo(0.4, 0); c.quadraticCurveTo(0.6 + sw * 0.3, -4, sw + 0.8, -9.5); c.stroke();
}
export function flowerPatch(c, t, p) {
  const R = rng((p.x * 7 + p.y) | 0), n = p.n || 5;
  for (let i = 0; i < n; i++) {
    const x = (R() - 0.5) * 22, y = (R() - 0.5) * 8, sw = wind(p.x + x, t, p.y) * 2 + Math.sin(t * 2.4 + i + p.x) * 0.5;
    c.strokeStyle = '#5f9f45'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x, y - 3, x + sw, y - 6); c.stroke();
    ell(c, x + sw * 0.5 - 1.5, y - 3, 1.6, 0.8, '#6fb356', null, 0, -0.5);
    flower5(c, x + sw, y - 7, 2.2, p.col || ['#ff8fb0', '#fff', '#ffd35a', '#c9a8ff'][i % 4]);
  }
}
// Reeds along the river bank.
export function reeds(c, t, p) {
  const R = rng(p.x | 0);
  for (let i = 0; i < 7; i++) {
    const x = (R() - 0.5) * 18, h = 16 + R() * 12, sw = wind(p.x + x, t, p.y) * 4;
    c.strokeStyle = '#7aa84e'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x, -h / 2, x + sw, -h); c.stroke();
    if (i % 2) ell(c, x + sw, -h - 2, 1.4, 3.6, '#a8764a', INK, 0.5);
  }
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
  // rider sits on the seat; drawn before the handlebar so the hands wrap the grips
  if (p.rider) { c.save(); c.translate(-6, -19); p.rider(c, t); c.restore(); }
  limb(c, [9, -9, 12, -31], 2.4, shade(col, -20));
  limb(c, [7, -31, 14, -31.5], 2.2, '#3d3a42');
  circ(c, 6.2, -31, 1.4, '#3d3a42', null);
  circ(c, 15, -25, 2.4, '#fff5c8');
  if (p.basket) box(c, 13, -27, 8, 5, 1.5, '#e9c46f');
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
    // each board points at its real destination; a round badge shows the exact heading
    const dx = s.to ? s.to[0] - p.x : (s.dir || 1), dy = s.to ? s.to[1] - p.y : 0;
    const y = -40 + i * 11, dir = dx >= 0 ? 1 : -1, ang = Math.atan2(dy, dx);
    c.save(); c.translate(0, y);
    poly(c, dir > 0 ? [-2, -4.5, 38, -4.5, 44, 0, 38, 4.5, -2, 4.5] : [2, -4.5, -38, -4.5, -44, 0, -38, 4.5, 2, 4.5], s.col || '#f3dcae', INK, 0.9);
    text(c, tr(s.label), dir * 17, 0.4, 5.4, INK, 900);
    c.save(); c.translate(dir * 36, 0);
    circ(c, 0, 0, 3.6, '#fff8ea', INK, 0.6);
    c.rotate(ang); c.fillStyle = '#e56b4e';
    c.beginPath(); c.moveTo(2.6, 0); c.lineTo(-1.2, -2); c.lineTo(-0.4, 0); c.lineTo(-1.2, 2); c.closePath(); c.fill();
    c.restore();
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
  text(c, tr(p.label) || 'BÁNH MÌ', 0, -16, 5.4, '#e8584e', 900);
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
  text(c, T('Welcome', 'Chào mừng'), 0, -42, 5.5, '#fff5df', 900, 'center', INK, 2);
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

// ---------------------------------------------------------------- more island decorations
// Wooden utility pole; wires sag to the next pole (p.to = [dx, dy]).
export function powerPole(c, t, p) {
  shadow(c, 0, 1, 5, 2, 0.16);
  limb(c, [0, 0, 0, -78], 3.4, '#8a6a4e');
  box(c, -12, -72, 24, 3, 1, '#8a6a4e', INK, 0.8);
  for (const x of [-10, 0, 10]) circ(c, x, -73, 1.2, '#dfe6ea', INK, 0.5);
  box(c, -3, -46, 6, 7, 1.5, '#9aa4ab', INK, 0.7);
  if (p.to) {
    const [dx, dy] = p.to, sw = wind(p.x, t, p.y) * 1.5;
    c.strokeStyle = 'rgba(60,52,50,.85)'; c.lineWidth = 0.7;
    for (const [ox, sag] of [[-10, 14], [0, 18], [10, 12]]) { c.beginPath(); c.moveTo(ox, -73); c.quadraticCurveTo(dx / 2 + ox + sw, dy / 2 - 73 + sag, dx + ox, dy - 73); c.stroke(); }
    // a little knot of cables, very Việt Nam
    c.beginPath(); c.moveTo(0, -60); for (let i = 0; i < 6; i++) c.quadraticCurveTo(i % 2 ? 6 : -6, -60 + i * 2, 0, -58 + i * 2); c.stroke();
  }
}
// Hanging bird cage with a hopping songbird.
export function birdCage(c, t, p) {
  shadow(c, 0, 1, 6, 2, 0.16);
  limb(c, [0, 0, 0, -44], 2, '#8a5f3e'); limb(c, [0, -44, 10, -46], 1.6, '#8a5f3e');
  const sw = Math.sin(t * 1.4 + p.x) * 0.06 + wind(p.x, t) * 0.04;
  c.save(); c.translate(10, -46); c.rotate(sw);
  line(c, 0, 0, 0, 4, INK, 0.8);
  c.beginPath(); c.moveTo(-7, 20); c.lineTo(-7, 10); c.quadraticCurveTo(-7, 4, 0, 4); c.quadraticCurveTo(7, 4, 7, 10); c.lineTo(7, 20); c.closePath();
  c.fillStyle = 'rgba(255,248,230,.25)'; c.fill(); c.strokeStyle = '#c9955e'; c.lineWidth = 1; c.stroke();
  for (let x = -5; x <= 5; x += 2.5) line(c, x, 6, x, 20, '#c9955e', 0.6);
  box(c, -8, 19, 16, 3, 1, '#b77a4f', INK, 0.6);
  const hop = Math.max(0, Math.sin(t * 5 + p.x)) * 2;
  ell(c, 0, 15 - hop, 3, 2.4, '#ffd35a', INK, 0.6); circ(c, 2, 13 - hop, 1.6, '#ffd35a', INK, 0.5); poly(c, [3.4, 13 - hop, 5, 13.4 - hop, 3.4, 14 - hop], '#f28f7c', null); circ(c, 2.4, 12.6 - hop, 0.4, INK, null);
  c.restore();
}
// Bougainvillea arch over a path.
export function flowerArch(c, t, p) {
  const w = p.w || 44, sw = wind(p.x, t, p.y);
  for (const x of [-w / 2, w / 2]) { shadow(c, x, 1, 5, 2, 0.16); limb(c, [x, 0, x, -46], 3, '#8a6a4e'); }
  c.beginPath(); c.moveTo(-w / 2, -46); c.quadraticCurveTo(0, -66, w / 2, -46); c.strokeStyle = INK; c.lineWidth = 5; c.stroke(); c.strokeStyle = '#8a6a4e'; c.lineWidth = 3.2; c.stroke();
  const R = rng(p.x | 0);
  for (let i = 0; i < 26; i++) { const k = i / 25, x = -w / 2 + w * k + (R() - 0.5) * 6, y = -46 - Math.sin(k * Math.PI) * 18 + (R() - 0.5) * 8 + (i % 5 === 0 ? 14 : 0); circ(c, x + sw * 1.2, y, 3.2 + R() * 1.4, ['#e97ad0', '#f36d9e', '#6fb356', '#e97ad0'][i % 4], INK, 0.5); }
}
export function fruitStand(c, t, p) {
  shadow(c, 0, 2, 30, 7, 0.18);
  for (const x of [-24, 24]) limb(c, [x, 0, x, -44], 2, '#8a5f3e');
  box(c, -26, -18, 52, 18, 3, '#c9955e');
  const fruit = [['#e8457a', 'dragon'], ['#ffb74a', 'mango'], ['#6fbf73', 'melon'], ['#ffd35a', 'banana']];
  fruit.forEach(([col, k], i) => { const x = -19 + i * 12.5; ell(c, x, -19, 6, 2.6, '#b58352'); for (let j = 0; j < 3; j++) { if (k === 'banana') { c.save(); c.translate(x - 2 + j * 2, -22); c.rotate(0.6); ell(c, 0, 0, 4.4, 1.5, col, INK, 0.5); c.restore(); } else { circ(c, x - 2.5 + j * 2.5, -22 - (j === 1 ? 2 : 0), 3, col, INK, 0.6); if (k === 'dragon') line(c, x - 2.5 + j * 2.5, -25, x - 1.5 + j * 2.5, -26.5, '#8fcf6a', 0.8); if (k === 'melon') line(c, x - 4 + j * 2.5, -22, x - 1 + j * 2.5, -22, '#3f8f5f', 0.6); } } });
  c.save(); c.translate(0, -44);
  for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(0, -8); const a1 = -Math.PI + i * Math.PI / 6, a2 = a1 + Math.PI / 6; c.lineTo(Math.cos(a1) * 34, Math.sin(a1) * 8 + 4); c.lineTo(Math.cos(a2) * 34, Math.sin(a2) * 8 + 4); c.closePath(); c.fillStyle = i % 2 ? '#6fbfb0' : '#fff5df'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); }
  c.restore();
}
export function sugarcaneCart(c, t, p) {
  shadow(c, 0, 1, 22, 5, 0.18);
  for (const x of [-14, 12]) { circ(c, x, -5, 5, '#3d3a42'); circ(c, x, -5, 1.8, '#b9c3cb', null); }
  box(c, -20, -24, 40, 18, 3, '#6fbf73');
  for (let i = 0; i < 6; i++) { c.save(); c.translate(-16 + i * 3.4, -24); c.rotate(-0.25 + i * 0.05); box(c, -1.2, -24, 2.4, 24, 1, '#b8c86a', INK, 0.5); for (let k = 1; k < 4; k++) line(c, -1.2, -k * 6, 1.2, -k * 6, '#8a9a4a', 0.5); c.restore(); }
  box(c, 4, -36, 14, 12, 2, '#b9c3cb'); circ(c, 11, -30, 3.5, '#8f9aa3', INK, 0.7);
  c.save(); c.translate(11, -30); c.rotate(t * 3); line(c, -3, 0, 3, 0, '#5a4a48', 1); c.restore();
  text(c, tr(p.label) || T('SUGARCANE', 'NƯỚC MÍA'), 0, -14, 5, '#fff', 900, 'center', INK, 1.6);
}
export function rattanSet(c, t, p) {
  shadow(c, 0, 1, 22, 5, 0.16);
  for (const x of [-16, 16]) { box(c, x - 6, -11, 12, 5, 2, '#d9b27a'); c.strokeStyle = '#b9905a'; c.lineWidth = 0.6; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x - 5 + k * 3, -11); c.lineTo(x - 4 + k * 3, -6); c.stroke(); } box(c, x - 6, -22, 12, 11, 4, '#d9b27a'); for (const lx of [x - 5, x + 5]) limb(c, [lx, -6, lx, 0], 1.4, '#b9905a'); }
  limb(c, [0, -2, 0, -12], 2, '#8a5f3e'); ell(c, 0, -13, 9, 3.4, '#b77a4f');
  miniCupAt(c, -3, -16, '#6b4431'); miniCupAt(c, 3, -16, '#e8a54a');
}
function miniCupAt(c, x, y, liq) { poly(c, [x - 2, y - 3, x + 2, y - 3, x + 1.6, y + 1.6, x - 1.6, y + 1.6], 'rgba(255,255,255,.85)', INK, 0.6); poly(c, [x - 1.8, y - 1.4, x + 1.8, y - 1.4, x + 1.5, y + 1.4, x - 1.5, y + 1.4], liq, null); }
export function fishingNet(c, t, p) {
  const sw = wind(p.x, t, p.y) * 2;
  for (const x of [-22, 22]) { shadow(c, x, 1, 4, 1.6, 0.16); limb(c, [x, 0, x, -36], 2.4, '#8a6a4e'); }
  c.beginPath(); c.moveTo(-22, -34); c.quadraticCurveTo(sw, -30, 22, -34); c.lineTo(22, -10); c.quadraticCurveTo(sw * 1.5, -2, -22, -10); c.closePath();
  c.fillStyle = 'rgba(111,150,160,.25)'; c.fill(); c.strokeStyle = '#5f8f9a'; c.lineWidth = 1; c.stroke();
  c.save(); c.clip(); c.strokeStyle = 'rgba(80,110,120,.55)'; c.lineWidth = 0.5;
  for (let i = -30; i < 30; i += 4) { c.beginPath(); c.moveTo(i + sw, -36); c.lineTo(i + 14 + sw * 1.4, 0); c.moveTo(i + sw, -36); c.lineTo(i - 14 + sw * 1.4, 0); c.stroke(); }
  c.restore();
  for (const x of [-12, 0, 12]) circ(c, x + sw * 1.2, -8 + Math.abs(x) * 0.1, 2, '#f2c14e', INK, 0.5);
}
export function coconutPile(c, t, p) { shadow(c, 0, 1, 12, 3.5, 0.16); for (const [x, y] of [[-6, -3], [4, -3], [-1, -8], [9, -2], [-10, -2]]) { circ(c, x, y, 4.2, '#8a5a32'); circ(c, x - 1.2, y - 1.4, 1, 'rgba(255,255,255,.3)', null); } ell(c, 13, -2, 4, 2.4, '#fffaf0', INK, 0.6); line(c, 13, -4, 16, -9, '#f08ca0', 1); }
export function sandcastle(c, t, p) {
  shadow(c, 0, 1, 14, 3.5, 0.12);
  box(c, -12, -8, 24, 8, 1.5, '#e8cf95'); for (const x of [-9, 9]) { box(c, x - 3.5, -16, 7, 10, 1, '#e8cf95'); for (let k = -1; k <= 1; k++) box(c, x + k * 2.4 - 1, -18, 2, 2.4, 0.4, '#e8cf95'); }
  box(c, -4.5, -20, 9, 14, 1, '#efd8a6'); poly(c, [0, -30, 0, -24, 5, -27], '#f28f7c', INK, 0.6); line(c, 0, -30, 0, -20, INK, 0.7);
  box(c, 16, -9, 7, 9, 1.5, '#6fbfb0'); c.beginPath(); c.arc(19.5, -9, 3.5, Math.PI, TAU); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
}
export function beachHammock(c, t, p) {
  const sw = Math.sin(t * 1.2 + p.x) * 3 + wind(p.x, t) * 2;
  const w = p.w || 64;
  for (const x of [-w / 2, w / 2]) { shadow(c, x, 1, 4, 1.6, 0.16); limb(c, [x, 0, x, -38], 3, '#a8764a'); }
  c.beginPath(); c.moveTo(-w / 2, -30); c.quadraticCurveTo(sw, -6, w / 2, -30); c.quadraticCurveTo(sw, -16, -w / 2, -30);
  c.fillStyle = '#f28f7c'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  c.strokeStyle = '#fff5df'; c.lineWidth = 1.2; for (let i = 1; i < 6; i++) { const x = -w / 2 + i * w / 6; c.beginPath(); c.moveTo(x, -28 + Math.sin(i / 6 * Math.PI) * 14 - 2); c.lineTo(x + sw * 0.2, -26 + Math.sin(i / 6 * Math.PI) * 14 + 4); c.stroke(); }
  shadow(c, sw * 0.5, 4, 24, 5, 0.12);
}
export function boatShore(c, t, p) {
  shadow(c, 0, 2, 34, 7, 0.16);
  c.save(); c.rotate(-0.08); c.scale(p.flip ? -1 : 1, 1);
  c.beginPath(); c.moveTo(-32, -12); c.quadraticCurveTo(-22, 2, 0, 2); c.quadraticCurveTo(24, 2, 34, -14); c.lineTo(28, -10); c.lineTo(-28, -10); c.closePath();
  c.fillStyle = p.col || '#6fbfb0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.1; c.stroke();
  c.fillStyle = '#fff5df'; c.fillRect(-28, -8, 56, 2.5);
  ell(c, 26, -8, 2.6, 1.8, '#fff', INK, 0.6); circ(c, 26.4, -8, 0.9, '#2a2a2a', null);
  limb(c, [-10, -10, 8, -18], 1.4, '#c49a6a'); ell(c, 9, -18.5, 3, 1.4, '#c49a6a', INK, 0.5);
  c.restore();
}
export function well(c, t, p) {
  shadow(c, 0, 2, 16, 5, 0.18);
  ell(c, 0, -10, 14, 5, '#b9b3a8'); c.beginPath(); c.moveTo(-14, -10); c.lineTo(-14, -2); c.quadraticCurveTo(0, 4, 14, -2); c.lineTo(14, -10); c.fillStyle = '#c7c0b4'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  for (let i = -2; i <= 2; i++) line(c, i * 6, -6, i * 6 + 2, 0, 'rgba(91,63,54,.35)', 0.8);
  ell(c, 0, -10, 11, 3.6, '#3a4a50', null);
  for (const x of [-11, 11]) limb(c, [x, -10, x, -34], 2, '#8a5f3e');
  poly(c, [-16, -34, 16, -34, 10, -42, -10, -42], '#d9784f', INK, 1);
  line(c, 0, -34, 0, -20 + Math.sin(t) * 1, INK, 0.7); box(c, -3, -20 + Math.sin(t), 6, 5, 1, '#b77a4f', INK, 0.6);
}
export function bicycle(c, t, p) {
  shadow(c, 0, 1, 16, 3.5, 0.16);
  c.save(); c.scale(p.flip ? -1 : 1, 1);
  for (const x of [-11, 11]) { circ(c, x, -7, 6.5, null, INK, 1.6); circ(c, x, -7, 6.5, null, '#4a4a54', 0.8); circ(c, x, -7, 1, '#8f9aa3', null); }
  c.strokeStyle = p.col || '#f28f7c'; c.lineWidth = 1.8; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-11, -7); c.lineTo(-3, -16); c.lineTo(7, -16); c.lineTo(11, -7); c.moveTo(-3, -16); c.lineTo(0, -7); c.lineTo(-11, -7); c.moveTo(7, -16); c.lineTo(8, -21); c.stroke();
  line(c, 5, -21, 11, -21, INK, 1.4); box(c, -6, -19, 6, 2, 1, '#5a4a48', null);
  box(c, 10, -24, 9, 6, 1.5, '#e9c46f', INK, 0.7); for (let i = 0; i < 3; i++) circ(c, 12 + i * 2.6, -25, 1.6, ['#ff8fb0', '#fff', '#ffd35a'][i], INK, 0.4);
  c.restore();
}
export function veggieGarden(c, t, p) {
  const w = p.w || 60, rows = 3;
  box(c, -w / 2, -26, w, 26, 3, '#a8764a', 'rgba(91,63,54,.6)', 1);
  for (let r = 0; r < rows; r++) { const y = -21 + r * 8; box(c, -w / 2 + 3, y - 2, w - 6, 5, 2, '#8a5a3a', null); for (let x = -w / 2 + 7; x < w / 2 - 4; x += 7) { const sw = wind(p.x + x, t, p.y) * 0.8; for (const a of [-0.6, 0, 0.6]) { c.save(); c.translate(x, y); c.rotate(a + sw * 0.1); c.beginPath(); c.ellipse(0, -3, 1.6, 3.4, 0, 0, TAU); c.fillStyle = r === 1 ? '#8fd070' : '#6fb356'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.5; c.stroke(); c.restore(); } if (r === 2 && (x | 0) % 3 === 0) circ(c, x + 2, y, 1.8, '#e8584e', INK, 0.4); } }
  // watering can
  c.save(); c.translate(w / 2 + 6, 0); box(c, -4, -8, 8, 8, 2, '#6fbfb0'); line(c, 4, -6, 9, -10, INK, 1.4); c.beginPath(); c.arc(0, -8, 3, Math.PI, TAU); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); c.restore();
}
export function duck(c, t, p) {
  // drawn relative; p.phase animates bobbing
  const b = Math.sin(t * 2 + p.seed) * 0.6;
  ell(c, 0, 2, 8, 2.4, 'rgba(255,255,255,.35)', null);
  c.save(); c.translate(0, b); c.scale(p.flip ? -1 : 1, 1);
  ell(c, 0, -2, 6, 3.6, p.col || '#fffaf0'); ell(c, 4, -6.4, 2.8, 2.6, p.col || '#fffaf0');
  poly(c, [6.4, -6.6, 9.4, -6, 6.4, -5.2], '#f2a33a', INK, 0.5); circ(c, 5, -7.2, 0.5, INK, null);
  c.beginPath(); c.moveTo(-5, -3); c.quadraticCurveTo(-7.5, -5.5, -5, -5.6); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
  c.restore();
}
export function rock(c, t, p) {
  const s = p.s || 1;
  shadow(c, 0, 1, 12 * s, 4 * s, 0.14);
  c.beginPath(); c.moveTo(-12 * s, 0); c.quadraticCurveTo(-13 * s, -9 * s, -4 * s, -12 * s); c.quadraticCurveTo(8 * s, -14 * s, 12 * s, -4 * s); c.quadraticCurveTo(13 * s, 1, 0, 1); c.closePath();
  c.fillStyle = p.col || '#b9b3a8'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  ell(c, -3 * s, -9 * s, 4 * s, 2 * s, 'rgba(255,255,255,.35)', null);
  // a little moss
  ell(c, 5 * s, -9 * s, 3.4 * s, 1.6 * s, 'rgba(120,180,90,.55)', null);
}

// The long bridge to Firefly Islet: a wooden deck on posts with rope rails.
// Until it's repaired the middle is missing (a few planks dangle from the rope).
export function seaBridge(c, t, p) {
  const w = 262, h = 38, fixed = p.fixed?.();
  c.save(); c.translate(0, -h);
  const plank = (x0, x1) => {
    c.fillStyle = 'rgba(40,80,90,.25)'; c.fillRect(x0 + 3, 5, x1 - x0, h);
    box(c, x0, 0, x1 - x0, h, 3, '#d19a62', INK, 1.1);
    c.strokeStyle = '#a8763f'; c.lineWidth = 1; for (let x = x0 + 6; x < x1; x += 6) { c.beginPath(); c.moveTo(x, 1); c.lineTo(x, h - 1); c.stroke(); }
  };
  const posts = x => { for (const y of [-2, h - 2]) box(c, x - 3, y - 4, 6, 10, 2, '#8a5f3e', INK, 0.8); };
  if (fixed) plank(0, w);
  else {
    plank(0, 70); plank(w - 70, w);
    // dangling planks and a sagging rope over the gap
    for (let i = 0; i < 4; i++) { const x = 84 + i * 30, sw = Math.sin(t * 1.4 + i) * 0.12; c.save(); c.translate(x, 6 + (i % 2) * 20); c.rotate(0.4 + sw + i * 0.3); box(c, -3, -2, 6, 16, 1, '#b98a5a', INK, 0.7); c.restore(); }
    c.strokeStyle = '#c9a26a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(70, 0); c.quadraticCurveTo(w / 2, 26 + Math.sin(t) * 2, w - 70, 0); c.stroke();
    text(c, T('BROKEN', 'HƯ'), w / 2, h / 2 + 2, 7, '#fff', 900, 'center', INK, 2);
  }
  for (let x = 0; x <= w; x += fixed ? 44 : 70) if (fixed || x <= 70 || x >= w - 70) posts(Math.min(w - 2, Math.max(2, x)));
  c.strokeStyle = '#c9a26a'; c.lineWidth = 1.4;
  for (const y of [-2, h - 2]) { c.beginPath(); c.moveTo(0, y - 6); if (fixed) c.lineTo(w, y - 6); else { c.lineTo(70, y - 6); c.moveTo(w - 70, y - 6); c.lineTo(w, y - 6); } c.stroke(); }
  c.restore();
}
export function lookout(c, t, p) {
  shadow(c, 0, 2, 20, 6, 0.18);
  for (const [x0, x1] of [[-14, -8], [14, 8]]) limb(c, [x0, 0, x1, -70], 2.6, '#8a5f3e');
  for (const y of [-20, -45]) line(c, -13, y, 13, y, '#8a5f3e', 2);
  line(c, -12, -8, 10, -55, '#a8763f', 1.4);
  box(c, -16, -84, 32, 16, 2, '#d19a62', INK, 1);
  poly(c, [-20, -84, 0, -104, 20, -84], '#e8584e', INK, 1);
  // a brass telescope poking out
  c.save(); c.translate(10, -80); c.rotate(-0.4 + Math.sin(t * 0.3) * 0.1); box(c, 0, -2, 14, 4, 1.5, '#e3a52c', INK, 0.7); c.restore();
  const fl = Math.sin(t * 3) * 2; poly(c, [0, -104, 0, -118, 10 + fl * 0.3, -114, 0, -110], '#ffd35a', INK, 0.6);
}
export function easel(c, t, p) {
  shadow(c, 0, 1, 9, 2.4, 0.16);
  limb(c, [-7, 0, 0, -34], 1.6, '#8a5f3e'); limb(c, [7, 0, 0, -34], 1.6, '#8a5f3e'); limb(c, [0, 0, 0, -30], 1.2, '#8a5f3e');
  box(c, -11, -32, 22, 18, 1.5, '#fffaf0', INK, 0.8);
  c.fillStyle = '#8fb7e0'; c.fillRect(-9, -30, 18, 7); c.fillStyle = '#a3d68a'; c.fillRect(-9, -23, 18, 7);
  circ(c, 5, -27, 2, '#ffd35a', null); poly(c, [-9, -23, -4, -27, 1, -23], '#6fb356', null);
}
