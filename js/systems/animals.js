// Island animals: chickens peck around the village, dogs trot about and wag,
// village cats nap and stretch, crabs scuttle sideways on the beach, pigeons
// flock on the plaza and scatter when you run through, fish jump in the sea.
// Each wanders on its own little home range and reacts to the player.

import { G } from './state.js';
import { rand, choice, dist, TAU } from '../core/util.js';
import { INK, ell, circ, shadow, poly, box } from '../gfx/draw.js';
import { sfx } from '../core/audio.js';

const A = [];
let fish = [];

const HOMES = {
  chicken: [[1560, 1860], [1600, 1900], [540, 1650], [1180, 1240], [1480, 1200]],
  dog: [[900, 1600], [1300, 1790], [620, 1560], [900, 2200]],
  cat: [[760, 1200], [1350, 1700], [420, 1580], [1120, 1760]],
  crab: [[640, 2330], [760, 2360], [1100, 2350], [1250, 2320], [420, 2230], [1420, 2250]],
  pigeon: [[860, 1500], [940, 1590], [880, 1610], [960, 1490], [900, 1470], [840, 1580]],
  goat: [[1660, 1180], [1360, 1120]],
};

export function initAnimals(island) {
  A.length = 0;
  const add = (kind, x, y, o = {}) => A.push({ kind, x, y, hx: x, hy: y, vx: 0, vy: 0, t: rand(0, 10), state: 'idle', until: rand(1, 4), face: choice([-1, 1]), seed: Math.random() * 99, ...o });
  for (const [x, y] of HOMES.chicken) { add('chicken', x, y, { col: choice(['#fffaf0', '#f3c27a', '#c98f5a']) }); add('chicken', x + 14, y + 8, { col: '#fffaf0', chick: true }); }
  for (const [x, y] of HOMES.dog) add('dog', x, y, { col: choice(['#e8c08a', '#fff4e0', '#8a6a52', '#d9a066']) });
  for (const [x, y] of HOMES.cat) add('cat', x, y, { col: choice(['#f4a24a', '#555259', '#fff8ee', '#b3a79a']) });
  for (const [x, y] of HOMES.crab) add('crab', x, y);
  for (const [x, y] of HOMES.pigeon) add('pigeon', x, y);
  for (const [x, y] of HOMES.goat) add('goat', x, y);
  fish = Array.from({ length: 5 }, () => ({ x: rand(200, 1600), y: rand(2480, 2580), t: rand(0, 8), next: rand(3, 9) }));
  G.animals = A;
  void island;
}

const SPEED = { chicken: 26, dog: 58, cat: 30, crab: 30, pigeon: 22, goat: 20 };
const RANGE = { chicken: 60, dog: 150, cat: 80, crab: 70, pigeon: 60, goat: 70 };

export function updateAnimals(dt) {
  const island = G.scenes?.island; if (!island) return;
  const pl = G.player, here = G.scene === island;
  for (const a of A) {
    a.t += dt; a.until -= dt;
    const pd = here && pl ? dist(pl.x, pl.y, a.x, a.y) : 999;
    const running = pl?.moving > 0.8;
    // reactions
    if (a.kind === 'pigeon' && pd < 46 && running && a.state !== 'fly') { a.state = 'fly'; a.until = rand(2, 3.5); const an = Math.atan2(a.y - pl.y, a.x - pl.x) + rand(-0.6, 0.6); a.vx = Math.cos(an) * 70; a.vy = Math.sin(an) * 40; if (Math.random() < 0.4) sfx('whoosh'); }
    if (a.kind === 'crab' && pd < 40 && a.state !== 'flee') { a.state = 'flee'; a.until = 1.6; a.vx = Math.sign(a.x - pl.x || 1) * 60; a.vy = 0; }
    if (a.kind === 'chicken' && pd < 30 && a.state !== 'flee') { a.state = 'flee'; a.until = 1.1; const an = Math.atan2(a.y - pl.y, a.x - pl.x); a.vx = Math.cos(an) * 70; a.vy = Math.sin(an) * 50; if (Math.random() < 0.3) sfx('pop'); }
    if (a.kind === 'dog' && pd < 60 && a.state !== 'greet' && a.state !== 'flee' && Math.random() < dt * 0.8) { a.state = 'greet'; a.until = rand(3, 5); }
    if (a.state === 'greet' && pd < 999) { const dx = pl.x - a.x, dy = pl.y - a.y, d = Math.hypot(dx, dy) || 1; if (d > 22) { a.vx = dx / d * 64; a.vy = dy / d * 64; } else { a.vx = a.vy = 0; } }
    // wandering
    if (a.until <= 0) {
      if (a.state === 'fly') { a.state = 'land'; a.until = 0.6; }
      else {
        const r = Math.random();
        if (r < 0.45) { a.state = 'idle'; a.vx = a.vy = 0; a.until = rand(1.5, 5); a.idle = choice(a.kind === 'cat' ? ['sit', 'nap', 'groom', 'stretch'] : a.kind === 'dog' ? ['sit', 'wag', 'scratch', 'sniff'] : ['peck', 'look', 'peck']); }
        else {
          a.state = 'walk';
          const R = RANGE[a.kind];
          let tx = a.hx + rand(-R, R), ty = a.hy + rand(-R * 0.6, R * 0.6);
          if (a.kind === 'crab') ty = a.hy + rand(-8, 8);
          const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy) || 1, sp = SPEED[a.kind] * rand(0.7, 1.2);
          a.vx = dx / d * sp; a.vy = dy / d * sp; a.until = Math.min(4, d / sp);
        }
      }
    }
    if (a.state === 'idle' || a.state === 'land') { a.vx *= 0.8; a.vy *= 0.8; }
    const nx = a.x + a.vx * dt, ny = a.y + a.vy * dt;
    if (a.state === 'fly' || island.canStand(nx, ny, 3)) { a.x = nx; a.y = ny; } else { a.vx = -a.vx; a.vy = -a.vy; a.until = Math.min(a.until, 0.4); }
    if (Math.abs(a.vx) > 3) a.face = a.vx < 0 ? -1 : 1;
  }
  for (const f of fish) { f.t += dt; if (f.t > f.next) { f.t = 0; f.next = rand(4, 11); f.x = rand(200, 1600); f.y = rand(2470, 2590); if (!island.terrain(f.x, f.y)) f.jump = 0.001; } if (f.jump) { f.jump += dt / 0.9; if (f.jump >= 1) f.jump = 0; } }
}

// ---------------------------------------------------------------- drawing
function chicken(c, t, a) {
  const walk = Math.hypot(a.vx, a.vy) > 3, peck = a.state === 'idle' && a.idle === 'peck' && Math.sin(a.t * 7) > 0.2;
  const s = a.chick ? 0.6 : 1, bob = walk ? Math.abs(Math.sin(a.t * 14)) * 1.2 : 0;
  shadow(c, 0, 0.5, 6 * s, 2, 0.16);
  c.save(); c.scale(a.face * s, s); c.translate(0, -bob);
  for (const k of [-1, 1]) { const st = walk ? Math.sin(a.t * 14 + k) * 1.6 : 0; c.strokeStyle = '#e39a3a'; c.lineWidth = 1; c.beginPath(); c.moveTo(k * 1.6, -3); c.lineTo(k * 1.6 + st, 0); c.stroke(); }
  ell(c, 0, -7, 6.5, 5, a.col, INK, 0.9);
  poly(c, [-6, -8, -10, -12, -9, -6], a.col, INK, 0.8); // tail
  c.save(); c.translate(4, peck ? -5 : -11); c.rotate(peck ? 0.8 : 0);
  circ(c, 0, 0, 3.6, a.col, INK, 0.8);
  if (!a.chick) { circ(c, -0.6, -3.6, 1.3, '#e8584e', null); circ(c, 0.8, -3.4, 1.1, '#e8584e', null); }
  poly(c, [3, -0.6, 5.6, 0.4, 3, 1.2], '#f2b33d', null);
  circ(c, 1.4, -0.8, 0.7, INK, null);
  c.restore(); c.restore();
}
function dog(c, t, a) {
  const walk = Math.hypot(a.vx, a.vy) > 5, sit = a.state === 'idle' && (a.idle === 'sit' || a.idle === 'wag');
  const wag = Math.sin(a.t * (a.state === 'greet' || a.idle === 'wag' ? 22 : 6)) * (a.state === 'greet' || a.idle === 'wag' ? 0.7 : 0.25);
  const bob = walk ? Math.abs(Math.sin(a.t * 12)) * 1.4 : 0, scr = a.idle === 'scratch' && a.state === 'idle';
  shadow(c, 0, 0.5, 11, 3, 0.18);
  c.save(); c.scale(a.face, 1); c.translate(0, -bob);
  const dk = a.col === '#8a6a52' ? '#5e4636' : '#b98a5a';
  // legs
  for (const [x, k] of [[-6, 0], [-3, 1], [4, 2], [7, 3]]) { const st = walk ? Math.sin(a.t * 12 + k * 1.6) * 2 : 0; if (sit && x < 0) continue; c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(x, -5); c.lineTo(x + st, 0); c.stroke(); c.strokeStyle = a.col; c.lineWidth = 1.8; c.stroke(); }
  // tail
  c.save(); c.translate(-9, sit ? -4 : -9); c.rotate(-0.9 + wag); c.strokeStyle = INK; c.lineWidth = 3.2; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-3, -4, -1, -8); c.stroke(); c.strokeStyle = a.col; c.lineWidth = 1.8; c.stroke(); c.restore();
  // body
  c.save(); if (sit) { c.translate(-2, 0); c.rotate(-0.45); }
  ell(c, 0, -8, 10, 5.4, a.col, INK, 0.9);
  c.restore();
  if (scr) { c.save(); c.translate(-4, -6); c.rotate(Math.sin(a.t * 30) * 0.5); c.strokeStyle = a.col; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(3, -5); c.stroke(); c.restore(); }
  // head
  c.save(); c.translate(9, sit ? -17 : -14); c.rotate(a.idle === 'sniff' && a.state === 'idle' ? 0.5 : Math.sin(a.t * 2) * 0.08);
  ell(c, 0, 0, 6.2, 5.4, a.col, INK, 0.9);
  ell(c, 5, 1.6, 3.2, 2.4, a.col === '#fff4e0' ? '#f7e6cc' : shadeLight(a.col), INK, 0.7);
  circ(c, 7.6, 0.8, 1.1, INK, null);
  circ(c, 1.8, -1.4, 0.9, INK, null);
  c.save(); c.translate(-3, -3); c.rotate(-0.5 + Math.sin(a.t * 3) * 0.1); ell(c, 0, 3, 2.2, 4.4, dk, INK, 0.7); c.restore();
  if (a.state === 'greet') { c.fillStyle = '#f07c8c'; c.beginPath(); c.ellipse(6.4, 4.4, 1.1, 1.8 + Math.sin(a.t * 14) * 0.3, 0, 0, TAU); c.fill(); }
  c.restore();
  c.restore();
}
const shadeLight = col => col === '#8a6a52' ? '#b39480' : '#f3dcb5';
function vcat(c, t, a) {
  const walk = Math.hypot(a.vx, a.vy) > 4, id = a.state === 'idle' ? a.idle : null;
  shadow(c, 0, 0.5, 8, 2.4, 0.16);
  c.save(); c.scale(a.face, 1);
  const stripe = a.col === '#f4a24a' ? '#d9822b' : a.col === '#555259' ? '#3e3b42' : a.col === '#b3a79a' ? '#8f8377' : null;
  if (id === 'nap') {
    ell(c, 0, -4, 8, 4.4, a.col, INK, 0.9);
    circ(c, 6, -5, 3.8, a.col, INK, 0.9);
    c.strokeStyle = INK; c.lineWidth = 0.7; c.beginPath(); c.moveTo(5, -5); c.quadraticCurveTo(6, -4, 7, -5); c.stroke();
    c.beginPath(); c.moveTo(-8, -3); c.quadraticCurveTo(-10, 2, -2, 1); c.strokeStyle = INK; c.lineWidth = 2.6; c.stroke(); c.strokeStyle = a.col; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = 'rgba(126,143,201,.8)'; c.font = '900 5px Nunito, sans-serif'; const k = (a.t * 0.5) % 1; c.globalAlpha = 1 - k; c.fillText('z', 8 + k * 4, -10 - k * 6); c.globalAlpha = 1;
    c.restore(); return;
  }
  const sit = id === 'sit' || id === 'groom', str = id === 'stretch' ? Math.max(0, Math.sin(a.t * 1.4)) : 0;
  for (const [x, k] of [[-4, 0], [-2, 1], [3, 2], [5, 3]]) { const st = walk ? Math.sin(a.t * 12 + k * 1.6) * 1.6 : 0; if (sit && x < 0) continue; c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath(); c.moveTo(x - (x > 0 ? str * 3 : 0), -4); c.lineTo(x + st - (x > 0 ? str * 4 : 0), 0); c.stroke(); c.strokeStyle = a.col; c.lineWidth = 1.3; c.stroke(); }
  c.save(); c.translate(-7, sit ? -3 : -7); c.rotate(-1.2 + Math.sin(a.t * 2.4) * 0.3); c.strokeStyle = INK; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-2, -5, 1, -9); c.stroke(); c.strokeStyle = a.col; c.lineWidth = 1.4; c.stroke(); c.restore();
  c.save(); if (sit) { c.translate(-1, 0); c.rotate(-0.55); } if (str) c.rotate(str * 0.18);
  ell(c, 0, -6.4, 7.4, 4, a.col, INK, 0.9);
  if (stripe) for (let i = -1; i <= 1; i++) { c.strokeStyle = stripe; c.lineWidth = 1; c.beginPath(); c.moveTo(i * 2.6, -10); c.lineTo(i * 2.6 + 0.6, -7.4); c.stroke(); }
  c.restore();
  c.save(); c.translate(6 + str * 2, (sit ? -13 : -10) + str * 3); if (id === 'groom') c.rotate(Math.sin(a.t * 6) * 0.25 + 0.4);
  circ(c, 0, 0, 4.4, a.col, INK, 0.9);
  poly(c, [-3.6, -2, -3, -6.4, -0.6, -3.6], a.col, INK, 0.8); poly(c, [3.6, -2, 3, -6.4, 0.6, -3.6], a.col, INK, 0.8);
  const bl = (Math.sin(a.t * 0.8 + a.seed) > 0.96);
  if (bl || id === 'groom') { c.strokeStyle = INK; c.lineWidth = 0.7; c.beginPath(); c.moveTo(0.4, -0.6); c.lineTo(1.8, -0.6); c.moveTo(-1.8, -0.6); c.lineTo(-0.4, -0.6); c.stroke(); }
  else { circ(c, 1.4, -0.6, 0.8, INK, null); circ(c, -1.2, -0.6, 0.8, INK, null); }
  circ(c, 3.4, 1, 0.6, '#f07c8c', null);
  c.restore();
  c.restore();
}
function crab(c, t, a) {
  const walk = Math.hypot(a.vx, a.vy) > 3;
  shadow(c, 0, 0.5, 6, 1.8, 0.16);
  c.save(); c.translate(0, walk ? -Math.abs(Math.sin(a.t * 20)) * 0.6 : 0);
  for (let k = -1; k <= 1; k += 2) for (let i = 0; i < 3; i++) { const st = walk ? Math.sin(a.t * 20 + i * 2 + k) * 1.2 : 0; c.strokeStyle = '#c9493a'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(k * 3, -2.4 + i * 0.6); c.lineTo(k * 6.4, -0.4 + i * 0.6 + st * 0.3); c.stroke(); }
  const snap = Math.sin(a.t * (a.state === 'flee' ? 16 : 3)) > 0.6 ? 0.4 : 0;
  for (const k of [-1, 1]) { c.save(); c.translate(k * 5, -5.6); c.rotate(k * (0.4 + snap)); ell(c, 0, 0, 2.2, 1.6, '#ef6a4f', INK, 0.6); c.restore(); }
  ell(c, 0, -3, 4.6, 3, '#ef6a4f', INK, 0.8);
  for (const k of [-1, 1]) { c.strokeStyle = INK; c.lineWidth = 0.6; c.beginPath(); c.moveTo(k * 1.4, -5.4); c.lineTo(k * 1.8, -7.4); c.stroke(); circ(c, k * 1.8, -7.8, 0.9, '#fff', INK, 0.5); circ(c, k * 1.8, -7.8, 0.4, INK, null); }
  c.restore();
}
function pigeon(c, t, a) {
  const fly = a.state === 'fly', h = fly ? 10 + Math.sin(a.t * 3) * 3 : 0;
  shadow(c, 0, 0.5, 4.4, 1.5, fly ? 0.08 : 0.15);
  c.save(); c.translate(0, -h); c.scale(a.face, 1);
  const peck = !fly && a.state === 'idle' && a.idle === 'peck' && Math.sin(a.t * 8 + a.seed) > 0.3;
  const bob = Math.hypot(a.vx, a.vy) > 3 && !fly ? Math.sin(a.t * 12) * 1.4 : 0;
  ell(c, 0, -4, 4.8, 3.2, '#9aa3b4', INK, 0.8);
  if (fly) { const f = Math.sin(a.t * 26); for (const k of [-1, 1]) { c.save(); c.translate(-0.5, -5); c.rotate(k * (0.5 + f * 0.6)); ell(c, 0, -3, 2, 4, '#b7bfcc', INK, 0.6); c.restore(); } }
  else { ell(c, -1, -4.4, 3, 1.8, '#b7bfcc', null); }
  c.save(); c.translate(3.4 + bob * 0.4, peck ? -3 : -7);
  circ(c, 0, 0, 2.3, '#7f889c', INK, 0.7); circ(c, 0.8, -0.4, 0.5, INK, null); poly(c, [2, -0.2, 3.6, 0.3, 2, 0.8], '#e6a55a', null);
  c.fillStyle = 'rgba(120,200,160,.8)'; c.fillRect(-1.6, 1.6, 2.4, 1);
  c.restore(); c.restore();
}
function goat(c, t, a) {
  const walk = Math.hypot(a.vx, a.vy) > 3, chew = a.state === 'idle';
  shadow(c, 0, 0.5, 10, 3, 0.18);
  c.save(); c.scale(a.face, 1);
  for (const [x, k] of [[-6, 0], [-3, 1], [4, 2], [7, 3]]) { const st = walk ? Math.sin(a.t * 10 + k * 1.6) * 1.6 : 0; c.strokeStyle = INK; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x, -6); c.lineTo(x + st, 0); c.stroke(); c.strokeStyle = '#f4efe6'; c.lineWidth = 1.4; c.stroke(); }
  ell(c, 0, -10, 10, 5.6, '#f4efe6', INK, 0.9);
  c.save(); c.translate(10, -16); c.rotate(chew ? Math.sin(a.t * 5) * 0.06 : 0);
  ell(c, 0, 0, 4.4, 3.8, '#f4efe6', INK, 0.9);
  poly(c, [-2, -3, -5, -8, -1, -4], '#c9b79a', INK, 0.6); poly(c, [1, -3, 0, -8, 3, -3.6], '#c9b79a', INK, 0.6);
  circ(c, 1.8, -0.8, 0.8, INK, null);
  c.strokeStyle = '#d8cdbd'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(2, 3); c.lineTo(2.6, 6 + (chew ? Math.sin(a.t * 5) * 0.6 : 0)); c.stroke();
  c.restore();
  c.save(); c.translate(-10, -12); c.rotate(-0.5 + Math.sin(a.t * 8) * 0.2); ell(c, 0, -2, 1.6, 2.6, '#f4efe6', INK, 0.7); c.restore();
  c.restore();
}
const DRAW = { chicken, dog, cat: vcat, crab, pigeon, goat };

export function animalDrawables() {
  const out = [];
  const SC = { chicken: 1.4, pigeon: 1.3, crab: 1.35, cat: 1.2, dog: 1.15, goat: 1.05 };
  for (const a of A) out.push({ x: a.x, y: a.y, sortY: a.state === 'fly' ? a.y + 20 : a.y, draw: (c, t) => { c.save(); c.scale(SC[a.kind], SC[a.kind]); DRAW[a.kind](c, t, a); c.restore(); } });
  for (const f of fish) if (f.jump) {
    const k = f.jump, h = Math.sin(k * Math.PI) * 18;
    out.push({ x: f.x, y: f.y, draw: (c) => {
      c.save(); c.globalAlpha = 0.6 * (1 - Math.abs(k - 0.5) * 2); ell(c, 0, 0, 6 + k * 6, 2 + k, null, '#fff', 1); c.restore();
      c.save(); c.translate((k - 0.5) * 16, -h); c.rotate((k - 0.5) * 2.2);
      ell(c, 0, 0, 5, 2.2, '#8fb7e0', INK, 0.8); poly(c, [-4.6, 0, -8, -2.6, -8, 2.6], '#8fb7e0', INK, 0.7); circ(c, 3, -0.5, 0.6, INK, null);
      c.restore();
      if (k < 0.08 || k > 0.92) { for (let i = 0; i < 4; i++) circ(c, (i - 1.5) * 3, -2 - Math.random() * 3, 0.8, 'rgba(255,255,255,.9)', null); }
    } });
  }
  return out;
}
export { box };
