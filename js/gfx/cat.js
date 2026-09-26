// Mèo Mây — the island's cloud cat.
//
// A small upright cat with a huge soft head, cloud-shaped blue-grey patches
// (mây = cloud), a coral scarf and a long expressive tail. Every part moves:
// ears twitch, the tail sways and curls, the head tilts, the mouth opens while
// talking and the whole body squashes on hops.

import { TAU, shade } from '../core/util.js';
import { anticTransform } from '../systems/fun.js';
import { INK, ell, circ, shadow, limb } from './draw.js';
import { viewOf } from './character.js';

const FUR = '#fffaf1', FUR_S = '#efe1cf', PATCH = '#a9bcdc', PATCH_S = '#8ea3c8', PINK = '#f7a6b4', SCARF = '#f08a78', SCARF2 = '#ffd27a';
const HY = -21.5, HR = 12.6, HRY = 10.4;

function cloud(c, x, y, s, col) {
  c.beginPath();
  c.arc(x - s * 0.9, y + s * 0.2, s * 0.62, Math.PI * 0.5, Math.PI * 1.5);
  c.arc(x - s * 0.2, y - s * 0.35, s * 0.72, Math.PI, TAU);
  c.arc(x + s * 0.75, y + s * 0.05, s * 0.58, Math.PI * 1.3, Math.PI * 0.5);
  c.closePath();
  c.fillStyle = col; c.fill();
}

function headPath(c) {
  c.beginPath();
  c.moveTo(-HR + 0.4, HY - 3);
  c.bezierCurveTo(-HR + 0.4, HY - HRY - 2.6, HR - 0.4, HY - HRY - 2.6, HR - 0.4, HY - 3);
  c.quadraticCurveTo(HR + 1.4, HY + 2.2, HR + 0.2, HY + 3.4);
  c.lineTo(HR + 1.8, HY + 5); c.quadraticCurveTo(HR - 1, HY + 5.4, HR - 2, HY + 7);
  c.quadraticCurveTo(0, HY + HRY + 1.4, -HR + 2, HY + 7);
  c.quadraticCurveTo(-HR + 1, HY + 5.4, -HR - 1.8, HY + 5); c.lineTo(-HR - 0.2, HY + 3.4);
  c.quadraticCurveTo(-HR - 1.4, HY + 2.2, -HR + 0.4, HY - 3);
  c.closePath();
}

function tail(c, a, t, view) {
  const sway = Math.sin(t * 2.1 + (a.seed || 0)) * 0.35 + (a.emo === 'happy' ? Math.sin(t * 9) * 0.4 : 0) + (a.moving ? Math.sin(a.walkPh * 0.5) * 0.25 : 0);
  const bx = view === 'side' ? -5.5 : view === 'back' ? 0 : 6, by = -4;
  const dir = view === 'side' ? -0.7 : 1;
  const x1 = bx + dir * (6 + Math.sin(sway) * 3), y1 = by - 5;
  const x2 = bx + dir * (9 + Math.sin(sway * 1.4) * 5), y2 = by - 15 - Math.cos(sway) * 2;
  const x3 = x2 + dir * (3 + Math.sin(sway * 2 + 1) * 3), y3 = y2 - 5;
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(bx, by); c.bezierCurveTo(x1, y1, x2, y2 + 4, x2, y2); c.quadraticCurveTo(x2 + dir * 1, y3 + 1, x3, y3);
  c.strokeStyle = INK; c.lineWidth = 5.6; c.stroke();
  c.strokeStyle = FUR; c.lineWidth = 3.8; c.stroke();
  // cloud-coloured tip
  c.beginPath(); c.moveTo(x2, y2); c.quadraticCurveTo(x2 + dir * 1, y3 + 1, x3, y3);
  c.strokeStyle = PATCH; c.lineWidth = 3.8; c.stroke();
}

function ears(c, a, t, view) {
  // occasional twitch: a quick flick of one ear
  const tw = a.earTwitch || 0;
  const alert = a.emo === 'surprised' ? -1.5 : a.emo === 'sad' ? 3 : 0;
  const ear = (s, flick) => {
    c.save();
    c.translate(s * 7.6, HY - HRY + 2.6);
    c.rotate(s * (0.18 + flick * 0.35) + (a.emo === 'sad' ? s * 0.5 : 0));
    c.beginPath(); c.moveTo(-4.4, 2.4); c.quadraticCurveTo(-2.4, -8 + alert, 0.8, -9.4 + alert); c.quadraticCurveTo(3.4, -5, 4.4, 2.4); c.closePath();
    c.fillStyle = s < 0 ? PATCH : FUR; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.05; c.stroke();
    if (view !== 'back') { c.beginPath(); c.moveTo(-2.2, 1.6); c.quadraticCurveTo(-1, -5 + alert, 0.8, -6.4 + alert); c.quadraticCurveTo(2.2, -3.4, 2.5, 1.6); c.closePath(); c.fillStyle = PINK; c.fill(); }
    c.restore();
  };
  if (view === 'side') { ear(-0.4, tw); ear(0.9, 0); }
  else { ear(-1, tw); ear(1, 0); }
}

function face(c, a, t, view) {
  const emo = a.act === 'sleep' || a.act === 'faint' ? 'sleepy' : a.act === 'dance' || a.act === 'roll' ? 'happy' : (a.emo || 'neutral'), blink = a.act === 'sneeze' ? 1 : a.blinkAmt || 0;
  const lx = (a.lookX || 0) * 0.6, ly = (a.lookY || 0) * 0.5;
  const eyesX = view === 'side' ? [6.2] : [-5, 5];
  const ey = HY + 1.2;
  for (const ex0 of eyesX) {
    const ex = ex0 + lx;
    if (emo === 'happy' || emo === 'love') {
      c.beginPath(); c.moveTo(ex - 2.5, ey + 0.8); c.quadraticCurveTo(ex, ey - 2.8, ex + 2.5, ey + 0.8);
      c.strokeStyle = INK; c.lineWidth = 1.4; c.lineCap = 'round'; c.stroke(); continue;
    }
    if (blink > 0.55 || emo === 'sleepy') {
      c.beginPath(); c.moveTo(ex - 2.3, ey + 0.2); c.quadraticCurveTo(ex, ey + 1.8, ex + 2.3, ey + 0.2);
      c.strokeStyle = INK; c.lineWidth = 1.3; c.lineCap = 'round'; c.stroke(); continue;
    }
    const big = emo === 'surprised' ? 1.25 : 1;
    const rx = 2.35 * big, ry = 2.9 * big * (1 - blink * 0.7), yy = ey + ly;
    c.beginPath(); c.ellipse(ex, yy, rx, ry, 0, 0, TAU);
    const g = c.createLinearGradient(0, yy - ry, 0, yy + ry);
    g.addColorStop(0, '#2f2a3a'); g.addColorStop(0.6, '#3a3550'); g.addColorStop(1, '#6f8fc8');
    c.fillStyle = g; c.fill();
    circ(c, ex - 0.8, yy - ry * 0.4, 1.05 * big, '#fff', null);
    circ(c, ex + 0.9, yy + ry * 0.4, 0.48 * big, 'rgba(255,255,255,.85)', null);
    if (emo === 'sad') { c.strokeStyle = INK; c.lineWidth = 0.9; const o = ex0 < 0 ? 1 : -1; c.beginPath(); c.moveTo(ex - o * 2.6, yy - ry + 0.6); c.lineTo(ex + o * 2.6, yy - ry - 0.9); c.stroke(); }
  }
  // blush
  for (const x of view === 'side' ? [7.8] : [-8, 8]) ell(c, x, HY + 4.4, 2.3, 1.3, 'rgba(247,140,160,.55)', null);
  // nose + ω mouth (opens while talking)
  const nx = view === 'side' ? 9.6 : 0, ny = HY + 3.6;
  c.beginPath(); c.moveTo(nx - 1.1, ny - 0.6); c.lineTo(nx + 1.1, ny - 0.6); c.lineTo(nx, ny + 0.6); c.closePath(); c.fillStyle = '#f08a9a'; c.fill();
  let open = 0;
  if (a.talking) open = 0.3 + 0.7 * Math.abs(Math.sin(t * 16 + Math.sin(t * 4.3) * 1.5));
  if (emo === 'surprised') open = Math.max(open, 0.7);
  c.strokeStyle = INK; c.lineWidth = 0.85; c.lineCap = 'round';
  if (open > 0.2 || emo === 'happy') {
    const h = Math.max(open, emo === 'happy' ? 0.7 : 0) * 2.4;
    c.beginPath(); c.moveTo(nx - 1.8, ny + 1.2); c.quadraticCurveTo(nx, ny + 1.2 + h * 1.5, nx + 1.8, ny + 1.2); c.closePath();
    c.fillStyle = '#9a4450'; c.fill(); c.stroke();
    if (h > 1.2) ell(c, nx, ny + 1.4 + h * 0.8, 1, h * 0.28, '#f59aa8', null);
  } else {
    c.beginPath();
    if (emo === 'sad') { c.moveTo(nx - 2, ny + 2.2); c.quadraticCurveTo(nx, ny + 0.8, nx + 2, ny + 2.2); }
    else { c.moveTo(nx - 2.2, ny + 0.9); c.quadraticCurveTo(nx - 1.1, ny + 2.4, nx, ny + 0.8); c.quadraticCurveTo(nx + 1.1, ny + 2.4, nx + 2.2, ny + 0.9); }
    c.stroke();
  }
  // whiskers
  c.strokeStyle = 'rgba(91,63,54,.55)'; c.lineWidth = 0.55;
  const wx = view === 'side' ? [1] : [-1, 1];
  for (const s of wx) {
    const ox = view === 'side' ? 7 : s * 9.2;
    for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(ox, HY + 3.4 + i * 1.1); c.lineTo(ox + s * 4.6, HY + 2.8 + i * 1.9 + Math.sin(t * 3 + i) * 0.2); c.stroke(); }
  }
}

// Curled up asleep: a round loaf with the tail wrapped around, head on paws.
function drawCatSleeping(c, a, t) {
  const br = Math.sin(t * 1.7) * 0.5 + 0.5;
  const sc = a.look?.scale || 1;
  c.save(); c.scale(sc, sc);
  shadow(c, 0, 0.5, 11, 3.2, 0.18);
  // tail wrapped around the front
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(9, -4); c.quadraticCurveTo(12, 1, 4, 1.6); c.quadraticCurveTo(-4, 2.4, -9, -0.5);
  c.strokeStyle = INK; c.lineWidth = 5.4; c.stroke(); c.strokeStyle = FUR; c.lineWidth = 3.6; c.stroke();
  c.beginPath(); c.moveTo(-4, 2.2); c.quadraticCurveTo(-7, 1.4, -9, -0.5); c.strokeStyle = PATCH; c.lineWidth = 3.6; c.stroke();
  // body loaf (rises and falls with breath)
  c.beginPath(); c.ellipse(1, -5.5 - br * 0.5, 11, 6 + br * 0.5, 0, 0, TAU); c.fillStyle = FUR; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  c.save(); c.beginPath(); c.ellipse(1, -5.5 - br * 0.5, 11, 6 + br * 0.5, 0, 0, TAU); c.clip(); cloud(c, 5, -9, 4, PATCH); c.restore();
  // head resting on the left, eyes closed
  c.save(); c.translate(-6, -3); c.scale(0.62, 0.62); c.translate(0, -HY - 4); c.rotate(-0.25);
  ears(c, { ...a, emo: 'sleepy' }, t, 'front');
  headPath(c); c.fillStyle = FUR; c.fill();
  c.save(); c.clip(); cloud(c, -6.8, HY - 5.8, 4.4, PATCH); c.restore();
  headPath(c); c.strokeStyle = INK; c.lineWidth = 1.4; c.stroke();
  face(c, { ...a, emo: 'sleepy', talking: false }, t, 'front');
  c.restore();
  // front paws tucked under the chin
  ell(c, -1, -1.6, 2.4, 1.7, FUR, INK, 0.9); ell(c, 3.5, -1.4, 2.4, 1.7, FUR, INK, 0.9);
  c.restore();
}

export function drawCat(c, a, t) {
  if (a.act === 'sleep') return drawCatSleeping(c, a, t);
  const view = viewOf(a.dir || 'down');
  const flip = a.dir === 'left' ? -1 : 1;
  const m = a.moving || 0, ph = a.walkPh || 0;
  const bob = Math.abs(Math.sin(ph)) * 1.6 * m;
  const breathe = Math.sin(t * 2.6 + (a.seed || 0)) * (1 - m);
  let sx = 1, sy = 1 + breathe * 0.015;
  if (a.turnT > 0) { const k = a.turnT / 0.14; sx = 1 - 0.12 * k; sy = 1 + 0.07 * k; }
  if (a.squash) { sy *= 1 - a.squash * 0.2; sx *= 1 + a.squash * 0.16; }
  const hop = a.hop || 0;
  const sc = a.look?.scale || 1;

  c.save();
  shadow(c, 0, 0.4, (8.5 - hop * 0.12) * sc, 3 * sc, 0.2 - Math.min(0.08, hop * 0.006));
  c.scale(flip * sc, sc);
  c.translate(0, -bob - hop + breathe * 0.2);
  anticTransform(c, a);
  c.scale(sx, sy);

  if (view !== 'back') tail(c, a, t, view);
  // feet
  const lift = (s) => -Math.max(0, Math.sin(ph) * s) * 2 * m;
  if (view === 'side') {
    const swing = Math.sin(ph) * 2.6 * m;
    ell(c, -1.6 - swing, -1.4 + lift(-1), 3, 1.9, FUR_S); ell(c, 1.8 + swing, -1.4 + lift(1), 3, 1.9, FUR);
  } else {
    ell(c, -3.4, -1.5 + lift(1), 2.9, 2, FUR); ell(c, 3.4, -1.5 + lift(-1), 2.9, 2, FUR);
    if (view === 'front') { for (const x of [-3.4, 3.4]) { c.strokeStyle = 'rgba(91,63,54,.4)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x - 0.8, -0.6); c.lineTo(x - 0.8, -1.6); c.moveTo(x + 0.8, -0.6); c.lineTo(x + 0.8, -1.6); c.stroke(); } }
  }
  // body: little pear
  c.beginPath();
  c.moveTo(-5.4, -11.2); c.quadraticCurveTo(-7.6, -2.2, -5.4, -1.8); c.lineTo(5.4, -1.8); c.quadraticCurveTo(7.6, -2.2, 5.4, -11.2); c.closePath();
  c.fillStyle = FUR; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  if (view === 'front') ell(c, 0, -5.8, 3.4, 3.6, '#fffdf8', null);
  if (view === 'back') { c.save(); c.beginPath(); c.moveTo(-5.4, -11.2); c.quadraticCurveTo(-7.6, -2.2, -5.4, -1.8); c.lineTo(5.4, -1.8); c.quadraticCurveTo(7.6, -2.2, 5.4, -11.2); c.closePath(); c.clip(); cloud(c, 1, -6.5, 3.4, PATCH); c.restore(); }
  // paws / arms
  const act = a.act, at = a.actT || 0;
  let pL = [-6.2, -5.4], pR = [6.2, -5.4];
  if (view === 'side') { const sw = Math.sin(ph) * 2.4 * m; pL = [-1.4 - sw, -5.6]; pR = [2.4 + sw, -5.6]; }
  if (act === 'wave') pR = [8.4, -14 + Math.sin(t * 12) * 1.6];
  if (act === 'cheer') { const k = Math.abs(Math.sin(t * 9)); pL = [-8, -15 - k * 2]; pR = [8, -15 - k * 2]; }
  if (act === 'point') pR = [10.6, -10.5];
  if (act === 'think') pR = [3, -12.4];
  if (act === 'hold') pR = [4, -8.6];
  const paw = (p, shadeIt) => {
    const col = shadeIt ? FUR_S : FUR;
    if (p[1] < -8.5 || Math.abs(p[0]) > 6.6) limb(c, [view === 'side' ? 0.4 : Math.sign(p[0]) * 4.6, -9.4, p[0], p[1]], 2.9, col);
    ell(c, p[0], p[1], 2.1, 1.9, col, INK, 0.9);
  };
  paw(pL, view === 'side');
  // scarf
  if (view !== 'back') {
    c.beginPath(); c.ellipse(0, -11.2, 6.6, 2.2, 0, 0, TAU); c.fillStyle = SCARF; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
    c.strokeStyle = SCARF2; c.lineWidth = 0.8; c.beginPath(); c.ellipse(0, -11.2, 5.2, 1.1, 0, 0.2, Math.PI - 0.2); c.stroke();
    const flap = Math.sin(t * 5 + m * ph) * 0.8 + m * 1.2;
    const kx = view === 'side' ? -4.4 : 3;
    c.beginPath(); c.moveTo(kx, -10.6); c.quadraticCurveTo(kx + 1.8 + (view === 'side' ? -flap : flap * 0.3), -7.4, kx + (view === 'side' ? -2.4 - flap : 1.6), -5.6); c.lineTo(kx - 1.2, -6.4); c.closePath();
    c.fillStyle = SCARF; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
  } else {
    c.beginPath(); c.ellipse(0, -11.2, 6.6, 2.2, 0, 0, TAU); c.fillStyle = SCARF; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
  }
  if (view === 'back') tail(c, a, t, view);

  // head
  c.save();
  const tilt = (a.headTilt || 0) + (a.talking ? Math.sin(t * 2.4) * 0.05 : 0);
  c.translate(0, HY + 7); c.rotate(tilt); c.translate(0, -HY - 7);
  ears(c, a, t, view);
  // head with cheek fluff
  headPath(c);
  c.fillStyle = FUR; c.fill();
  c.save(); c.clip();
  // cloud patches
  if (view === 'back') { cloud(c, -3, HY - 3, 5.4, PATCH); cloud(c, 6, HY + 2, 3.2, PATCH); }
  else if (view === 'side') cloud(c, -5, HY - 5, 4.6, PATCH);
  else cloud(c, -6.8, HY - 5.8, 4.4, PATCH);
  c.fillStyle = 'rgba(230,200,180,.18)'; c.beginPath(); c.ellipse(0, HY + HRY + 1, HR + 2, 4, 0, 0, TAU); c.fill();
  c.restore();
  headPath(c); c.strokeStyle = INK; c.lineWidth = 1.05; c.stroke();
  if (view !== 'back') face(c, a, t, view);
  // little leaf sprout on the head (the island's luck charm)
  if (a.look?.sprout !== false) {
    const sw = Math.sin(t * 3 + 1) * 0.25;
    c.save(); c.translate(view === 'side' ? 1 : 1.5, HY - HRY - 1.6); c.rotate(sw);
    c.strokeStyle = INK; c.lineWidth = 0.9; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(0.5, -2.4, 0, -3.6); c.stroke();
    c.beginPath(); c.moveTo(0, -3.4); c.quadraticCurveTo(3.6, -6.2, 5.4, -3.8); c.quadraticCurveTo(2.6, -1.8, 0, -3.4); c.fillStyle = '#8fd070'; c.fill(); c.stroke();
    c.restore();
  }
  c.restore();
  paw(pR, false);
  if (act === 'hold' && a.held) { void 0; }
  c.restore();
}
