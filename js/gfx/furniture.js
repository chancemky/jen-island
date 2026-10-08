// Interior furniture and fixtures. Base point = front-centre of the footprint.

import { TAU, shade, rng } from '../core/util.js';
import { tr, T } from '../systems/state.js';
import { INK, ell, circ, box, poly, line, limb, shadow, text, heart, flower, stext } from './draw.js';
import { LIGHT, glows, lanternShape } from './props.js';
import { drawHammock } from './hammock.js';

const g = (p, x, y, r, col) => { if (!p.off) glows.push([p.x + x, p.y + y, r, col]); };   // lamps you switched off don't glow

// Generic counter-like box with a top surface.
export function counterBox(c, w, h, d, col, top) {
  box(c, -w / 2, -h, w, h, 3, col);
  box(c, -w / 2 - 2, -h - d, w + 4, d + 2, 3, top || shade(col, 22));
  c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(-w / 2 + 2, -h + 2, w - 4, 3);
}

export const F = {
  bed(c, t, p) {
    shadow(c, 0, 1, 34, 6, 0.18);
    box(c, -30, -54, 60, 14, 4, '#b77a4f');           // headboard
    box(c, -30, -44, 60, 44, 4, '#fff8ea');            // mattress
    box(c, -26, -42, 22, 11, 5, '#fff');               // pillow
    const sl = p.sleeper?.();
    if (sl) { // the sleeper lies on the pillow, blanket pulled up
      // lying on their back: head on the pillow, the body tucked under the blanket
      const br = Math.sin(t * 1.6) * 0.25, k = 0.82;
      c.save(); c.translate(-15, -37 + 26.8 * k + br); c.scale(k, k);
      p.drawSleeper(c, { ...sl, dir: 'down', moving: 0, act: 'sleep', emo: 'sleepy', blinkAmt: 1, sit: false, hop: 0 }, t);
      c.restore();
    }
    box(c, -30, -26 - (sl ? 4 : 0), 60, 26 + (sl ? 4 : 0), 4, p.col || '#f4a9b8');   // blanket
    if (sl) { const br = Math.sin(t * 1.6) * 0.8; ell(c, 4, -22 + br * 0.3, 20, 5 + br, shade(p.col || '#f4a9b8', 10), null); }
    c.strokeStyle = shade(p.col || '#f4a9b8', -25); c.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-26 + i * 12, -24); c.lineTo(-22 + i * 12, -2); c.stroke(); }
    if (p.sleeper) { /* drawn by actor */ }
  },
  wardrobe(c, t, p) { shadow(c, 0, 1, 22, 4, 0.18); box(c, -20, -62, 40, 62, 3, '#c98f5a'); line(c, 0, -60, 0, -4, INK, 1); circ(c, -3, -32, 1.4, '#f2c14e', INK, 0.5); circ(c, 3, -32, 1.4, '#f2c14e', INK, 0.5); box(c, -22, -66, 44, 6, 2, '#b77a4f'); },
  kitchen(c, t, p) {
    counterBox(c, 70, 30, 12, '#9fd8c8', '#fff8ea');
    box(c, -30, -40, 22, 7, 2, '#b9c3cb'); circ(c, 16, -36, 6, '#5b5660', INK, 0.8); circ(c, 16, -36, 3, '#e8584e', null);
    box(c, -8, -38, 10, 4, 1, '#b9c3cb', INK, 0.6);
    for (let i = 0; i < 3; i++) box(c, -32 + i * 22, -26, 18, 20, 2, shade('#9fd8c8', -8), INK, 0.7);
  },
  table(c, t, p) { shadow(c, 0, 1, (p.w || 34) / 2 + 2, 4, 0.18); const w = p.w || 34; for (const x of [-w / 2 + 4, w / 2 - 4]) limb(c, [x, -12, x, 0], 2.2, '#8a5f3e'); box(c, -w / 2, -18, w, 7, 3, p.col || '#d19a62'); if (p.cloth) { box(c, -w / 2 + 2, -18, w - 4, 5, 2, p.cloth, null); } },
  chair(c, t, p) { shadow(c, 0, 1, 7, 2.4, 0.16); for (const x of [-5, 5]) limb(c, [x, -8, x, 0], 1.6, '#8a5f3e'); box(c, -7, -11, 14, 4, 1.5, p.col || '#c88a52'); if (!p.noBack) box(c, -7, -24, 14, 13, 2, p.col || '#c88a52'); },
  stool(c, t, p) { const col = p.col || '#e8584e'; shadow(c, 0, 1, 6, 2, 0.16); poly(c, [-5, 0, -4, -7, 4, -7, 5, 0], shade(col, -20)); ell(c, 0, -7.5, 5.4, 2.2, col); },
  rug(c, t, p) { const w = p.w || 44, h = p.h || 26; ell(c, 0, -h / 2, w / 2, h / 2, p.col || '#f4a9b8', 'rgba(91,63,54,.5)', 1); ell(c, 0, -h / 2, w / 2 - 5, h / 2 - 4, null, 'rgba(255,255,255,.7)', 1.4); ell(c, 0, -h / 2, w / 4, h / 4, shade(p.col || '#f4a9b8', 14), null); },
  mat(c, t, p) { const w = p.w || 60, h = p.h || 30; box(c, -w / 2, -h, w, h, 3, p.col || '#e9c46f', 'rgba(91,63,54,.5)', 1); c.strokeStyle = shade(p.col || '#e9c46f', -25); c.lineWidth = 0.7; for (let x = -w / 2 + 5; x < w / 2; x += 5) { c.beginPath(); c.moveTo(x, -h + 2); c.lineTo(x, -2); c.stroke(); } },
  plant(c, t, p) { const s = p.s || 1; shadow(c, 0, 1, 8 * s, 3, 0.16); poly(c, [-6 * s, -12 * s, 6 * s, -12 * s, 4.5 * s, 0, -4.5 * s, 0], p.pot || '#d9784f'); const sw = Math.sin(t * 1.5 + p.x) * 0.04; for (let i = -3; i <= 3; i++) { c.save(); c.translate(0, -12 * s); c.rotate(i * 0.32 + sw); c.beginPath(); c.ellipse(0, -11 * s, 3 * s, 11 * s, 0, 0, TAU); c.fillStyle = i % 2 ? '#6fb356' : '#7fc062'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); c.restore(); } },
  bonsai(c, t, p) { shadow(c, 0, 1, 9, 3, 0.16); box(c, -9, -7, 18, 7, 2, '#5f7fa8'); limb(c, [0, -7, -3, -14, 3, -20], 2.4, '#8a5f3e'); for (const [x, y, r] of [[-6, -18, 6], [6, -22, 6], [0, -27, 5]]) circ(c, x, y, r, '#6fb356', INK, 0.9); },
  lamp(c, t, p) { shadow(c, 0, 1, 6, 2, 0.16); limb(c, [0, 0, 0, -36], 1.6, '#5a4a48'); ell(c, 0, 0, 5, 2, '#5a4a48'); poly(c, [-8, -36, 8, -36, 5, -46, -5, -46], '#f7de8c', INK, 0.9); g(p, 0, -38, 44, 'rgba(255,220,150,.6)'); },
  lantern(c, t, p) { limb(c, [0, -62, 0, -54], 0.8, INK); lanternShape(c, 0, -54, 1, p.col || '#ea5a4f', t, p.x); g(p, 0, -44, 36, 'rgba(255,190,110,.55)'); },
  sofa(c, t, p) { shadow(c, 0, 1, 30, 5, 0.18); box(c, -28, -26, 56, 14, 5, '#c9a26a'); box(c, -28, -14, 56, 14, 4, '#d9b27a'); for (const x of [-30, 22]) box(c, x, -22, 8, 22, 4, '#b9905a'); for (const x of [-20, 2]) box(c, x, -24, 18, 10, 4, '#f4a9b8', INK, 0.8); c.strokeStyle = '#a07a50'; c.lineWidth = 0.6; for (let x = -26; x < 26; x += 4) { c.beginPath(); c.moveTo(x, -12); c.lineTo(x + 2, -2); c.stroke(); } },
  bookshelf(c, t, p) { shadow(c, 0, 1, 20, 4, 0.18); box(c, -18, -56, 36, 56, 3, '#b77a4f'); const R = rng(p.x | 0); for (let r = 0; r < 3; r++) { box(c, -15, -52 + r * 17, 30, 14, 1, '#8a5a3a', null); let x = -14; while (x < 13) { const w = 3 + R() * 3, h = 9 + R() * 4; box(c, x, -52 + r * 17 + 14 - h, w, h, 0.8, ['#f28f7c', '#9fd8c8', '#f7de8c', '#a9d4f0', '#c9b6e8'][Math.floor(R() * 5)], INK, 0.5); x += w + 0.6; } } },
  fan(c, t, p) { shadow(c, 0, 1, 7, 2, 0.16); limb(c, [0, 0, 0, -26], 1.6, '#9fd8c8'); ell(c, 0, 0, 7, 2.4, '#9fd8c8'); circ(c, 0, -30, 9, 'rgba(255,255,255,.55)', INK, 1); const a = t * 18; for (let i = 0; i < 3; i++) { c.save(); c.translate(0, -30); c.rotate(a + i * TAU / 3); ell(c, 0, -4.5, 2.4, 4.4, 'rgba(159,216,200,.8)', null); c.restore(); } circ(c, 0, -30, 1.8, '#5a4a48', null); },
  fishtank(c, t, p) { shadow(c, 0, 1, 18, 4, 0.18); box(c, -16, -16, 32, 16, 2, '#8a5f3e'); box(c, -16, -40, 32, 24, 3, 'rgba(150,215,240,.75)'); for (let i = 0; i < 2; i++) { const x = Math.sin(t * 0.9 + i * 2) * 10, y = -28 + i * 6; c.save(); c.translate(x, y); c.scale(Math.cos(t * 0.9 + i * 2) > 0 ? 1 : -1, 1); ell(c, 0, 0, 3.4, 2, i ? '#ff9a4a' : '#f36d86', INK, 0.5); poly(c, [-3, 0, -6, -2, -6, 2], i ? '#ff9a4a' : '#f36d86', INK, 0.4); c.restore(); } for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; circ(c, 10, -18 - k * 20, 1, 'rgba(255,255,255,.8)', null); } limb(c, [-10, -17, -10, -26], 1.2, '#6fb356'); },
  tv(c, t, p) { shadow(c, 0, 1, 16, 3, 0.16); box(c, -14, -8, 28, 8, 2, '#8a5f3e'); box(c, -14, -30, 28, 22, 4, '#6e6a70'); const on = true; box(c, -11, -27, 19, 16, 3, on ? `hsl(${(t * 40) % 360},55%,75%)` : '#3d3a42'); circ(c, 11, -24, 1.4, '#e8584e', null); circ(c, 11, -19, 1.4, '#f2c14e', null); limb(c, [-4, -30, -9, -38], 0.8, INK); limb(c, [4, -30, 9, -38], 0.8, INK); },
  hammock(c, t, p) { drawHammock(c, t, p, 'hammock'); },
  painting(c, t, p) { box(c, -13, -62, 26, 20, 2, '#b77a4f'); box(c, -11, -60, 22, 16, 1, '#fff5df', null); circ(c, -3, -53, 4, '#f28f7c', INK, 0.6); ell(c, 4, -50, 5, 3, '#9fd8c8', INK, 0.6); line(c, -9, -46, 9, -46, '#6fb356', 1.2); },
  clock(c, t, p) { circ(c, 0, -58, 7, '#fff8ea', INK, 1.2); const m = (LIGHT.minutes || 0); line(c, 0, -58, Math.sin(m / 720 * TAU) * 3.6, -58 - Math.cos(m / 720 * TAU) * 3.6, INK, 1.2); line(c, 0, -58, Math.sin(m / 60 * TAU) * 5.4, -58 - Math.cos(m / 60 * TAU) * 5.4, INK, 0.8); },
  radio(c, t, p) { shadow(c, 0, 1, 10, 3, 0.16); box(c, -10, -14, 20, 14, 3, '#f28f7c'); circ(c, -4, -7, 4, '#5a4a48', INK, 0.7); box(c, 2, -11, 6, 3, 1, '#fff5df', null); limb(c, [6, -14, 10, -24], 0.8, INK); if (Math.sin(t * 3) > 0) { c.fillStyle = '#7a5cc8'; c.font = '900 7px Nunito'; c.fillText('♪', 8 + Math.sin(t) * 3, -20 - (t * 8) % 8); } },
  cat_bed(c, t, p) { shadow(c, 0, 1, 12, 3, 0.16); ell(c, 0, -4, 12, 5, '#f08a78'); ell(c, 0, -5, 8, 3, '#fff5df', null); },
  piano(c, t, p) { shadow(c, 0, 1, 24, 4, 0.18); box(c, -22, -40, 44, 28, 3, '#3d3a42'); box(c, -22, -16, 44, 5, 1, '#fff'); for (let x = -20; x < 22; x += 4) line(c, x, -16, x, -11, INK, 0.5); for (const x of [-18, 18]) limb(c, [x, -11, x, 0], 2, '#3d3a42'); },
  koi(c, t, p) { shadow(c, 0, 1, 24, 5, 0.18); ell(c, 0, -10, 24, 11, '#c7c0b4'); ell(c, 0, -11, 20, 8.5, '#6cc3cf', INK, 0.8); for (let i = 0; i < 3; i++) { const a = t * 0.6 + i * 2.1; c.save(); c.translate(Math.cos(a) * 12, -11 + Math.sin(a) * 5); c.rotate(a + Math.PI / 2); ell(c, 0, 0, 1.6, 3.6, ['#ff9a4a', '#fff', '#f36d86'][i], INK, 0.4); c.restore(); } },
  cat_tree(c, t, p) { shadow(c, 0, 1, 14, 3, 0.18); box(c, -12, -6, 24, 6, 2, '#c9a26a'); limb(c, [0, -6, 0, -50], 5, '#e9d8bf'); c.strokeStyle = 'rgba(160,120,80,.5)'; c.lineWidth = 0.6; for (let y = -46; y < -8; y += 3) { c.beginPath(); c.moveTo(-2.4, y); c.lineTo(2.4, y + 1.5); c.stroke(); } box(c, -14, -34, 22, 5, 2, '#9fb4dc'); box(c, -8, -56, 22, 6, 2, '#9fb4dc'); circ(c, 12, -30, 2.4, '#f2c14e'); limb(c, [12, -31, 12, -34], 0.6, INK); },
  cushion(c, t, p) { ell(c, 0, -4, 11, 5, p.col || '#f7a6b4'); ell(c, 0, -5, 6, 2.4, shade(p.col || '#f7a6b4', 16), null); },
  shelfJars(c, t, p) {
    const w = p.w || 80;
    box(c, -w / 2, -58, w, 58, 3, '#c98f5a');
    for (let r = 0; r < 2; r++) {
      box(c, -w / 2 + 3, -54 + r * 26, w - 6, 22, 1, '#a8703f', null);
      const n = Math.floor((w - 10) / 14);
      for (let i = 0; i < n; i++) { const x = -w / 2 + 7 + i * 14; box(c, x, -52 + r * 26 + 6, 11, 14, 3, 'rgba(255,255,255,.75)', INK, 0.7); box(c, x + 1, -52 + r * 26 + 11, 9, 8, 2, (p.cols || ['#e9a24a', '#5e3a28', '#f7a868', '#9fd67a', '#f4ead2'])[(i + r) % 5], null); box(c, x - 1, -52 + r * 26 + 4, 13, 3, 1, '#f28f7c', INK, 0.5); }
    }
  },
  produce(c, t, p) {
    const w = p.w || 80;
    box(c, -w / 2, -26, w, 26, 3, '#c98f5a');
    const cols = p.cols || ['#ffa53a', '#79b85c', '#ff9a7a', '#f7de8c', '#9fd67a', '#e8584e'];
    const n = Math.floor(w / 20);
    for (let i = 0; i < n; i++) { const x = -w / 2 + 4 + i * (w - 8) / n, ww = (w - 8) / n - 3; box(c, x, -30, ww, 10, 2, '#e3c08d', INK, 0.8); for (let k = 0; k < 4; k++) circ(c, x + 3 + (k % 2) * (ww - 6) + (k > 1 ? 2 : 0), -33 + (k > 1 ? -3 : 0), 3.4, cols[i % cols.length], INK, 0.6); }
  },
  fridge(c, t, p) { shadow(c, 0, 1, 20, 4, 0.18); box(c, -18, -60, 36, 60, 4, '#e9eef2'); box(c, -15, -56, 30, 50, 3, 'rgba(180,225,240,.7)'); for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) box(c, -13 + i * 7, -52 + r * 16, 5, 11, 1.5, ['#f28f7c', '#9fd8c8', '#fff', '#f7de8c'][(i + r) % 4], INK, 0.4); g(p, 0, -30, 30, 'rgba(200,240,255,.4)'); },
  register(c, t, p) { box(c, -8, -12, 16, 12, 2, '#6e6a70'); box(c, -6, -18, 12, 7, 2, '#9ad2f0'); box(c, -9, -3, 18, 3, 1, '#5a5660', null); },
  lumber(c, t, p) { const w = p.w || 80; for (const x of [-w / 2 + 3, w / 2 - 3]) limb(c, [x, 0, x, -50], 3, '#6e6a70'); for (let i = 0; i < 5; i++) box(c, -w / 2, -12 - i * 9, w, 6, 1.5, i % 2 ? '#c88a52' : '#d9a064', INK, 0.8); },
  paintShelf(c, t, p) { const w = p.w || 70; box(c, -w / 2, -50, w, 50, 3, '#b9c3cb'); for (let r = 0; r < 2; r++) for (let i = 0; i < 5; i++) { const x = -w / 2 + 6 + i * (w - 10) / 5; box(c, x, -44 + r * 22, 10, 13, 2, '#f7f4ef', INK, 0.6); ell(c, x + 5, -44 + r * 22, 5, 1.6, ['#f28f7c', '#9fd8c8', '#f7de8c', '#a9d4f0', '#c9b6e8'][(i + r * 2) % 5], INK, 0.5); } },
  sheetStack(c, t, p) { for (let i = 0; i < 6; i++) box(c, -24, -4 - i * 3, 48, 4, 1, i % 2 ? '#b9c3cb' : '#d3dbe1', INK, 0.6); },
  stove(c, t, p) {
    counterBox(c, p.w || 50, 30, 12, '#8f9aa3', '#5b5660');
    const n = Math.max(1, Math.floor((p.w || 50) / 24));
    for (let i = 0; i < n; i++) { const x = -((n - 1) * 24) / 2 + i * 24; circ(c, x, -36, 7, '#3d3a42', INK, 0.8); if (p.on?.(i)) { for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + t * 3; circ(c, x + Math.cos(a) * 4, -36 + Math.sin(a) * 2, 1.4, '#4aa3ff', null); } g(p, x, -38, 18, 'rgba(255,160,90,.35)'); } }
  },
  sink(c, t, p) { counterBox(c, p.w || 40, 30, 12, '#9fd8c8', '#fff8ea'); box(c, -12, -40, 24, 8, 3, '#b9dcee', INK, 0.8); limb(c, [8, -42, 8, -48, 3, -48], 1.4, '#b9c3cb'); },
  // the prep station: a butcher-block table with a big board, a cleaver, things half
  // chopped, a bowl of prepped food, baskets underneath and a utensil rail
  prepTable(c, t, p) {
    const w = p.w || 60, top = -30;
    shadow(c, 0, 1, w / 2 + 3, 5, 0.2);
    // utensil rail behind (ladle, whisk, strainer)
    line(c, -w / 2 + 6, top - 30, w / 2 - 6, top - 30, '#8f9aa3', 1.4);
    for (const [x, k] of [[-14, 0], [-4, 1], [8, 2]]) {
      line(c, x, top - 30, x, top - 26, '#8f9aa3', 0.7);
      if (k === 0) { line(c, x, top - 26, x, top - 15, '#b9c3cb', 1); ell(c, x, top - 14, 2.8, 1.8, '#b9c3cb', INK, 0.5); }
      if (k === 1) { line(c, x, top - 26, x, top - 20, '#b77a4f', 1.2); ell(c, x, top - 15, 2.2, 5, null, '#8f9aa3', 0.7); }
      if (k === 2) { line(c, x, top - 26, x, top - 22, '#b77a4f', 1.2); circ(c, x, top - 18, 3.6, 'rgba(200,210,215,.6)', INK, 0.6); }
    }
    // legs and the lower shelf with baskets of produce
    for (const x of [-w / 2 + 3, w / 2 - 6]) box(c, x, top + 6, 3.5, -top - 6, 1, '#a8763f', INK, 0.7);
    box(c, -w / 2 + 2, -9, w - 4, 3, 1, '#b98450', INK, 0.7);
    ell(c, -w / 4, -10, 9, 3.6, '#c9975f', INK, 0.7); for (let i = 0; i < 4; i++) circ(c, -w / 4 - 5 + i * 3.4, -12 - (i % 2), 1.8, '#ffa53a', INK, 0.4);
    ell(c, w / 4, -10, 9, 3.6, '#c9975f', INK, 0.7); for (let i = 0; i < 4; i++) ell(c, w / 4 - 5 + i * 3.2, -12.4, 1.2, 2.6, '#6fb356', INK, 0.4, 0.3 * (i - 1.5));
    // thick butcher-block top with end grain
    box(c, -w / 2 - 2, top, w + 4, 8, 2, '#d9a466', INK, 1);
    c.strokeStyle = 'rgba(140,90,40,.45)'; c.lineWidth = 0.6; for (let x = -w / 2 + 3; x < w / 2; x += 5) { c.beginPath(); c.moveTo(x, top + 1); c.lineTo(x, top + 7); c.stroke(); }
    box(c, -w / 2 - 2, top - 4, w + 4, 5, 2, '#e6bc85', INK, 0.9);
    // a big cutting board: sliced cucumber and halved kumquats, a cleaver
    box(c, -w / 2 + 3, top - 9, 30, 7, 2, '#f3d6a4', INK, 0.8);
    for (let i = 0; i < 4; i++) { ell(c, -w / 2 + 8 + i * 3, top - 6, 2, 2, '#b9e08a', '#5f9f45', 0.5); }
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-w / 2 + 22 + i * 3.4, top - 5, 1.8, Math.PI, 0); c.fillStyle = '#ffa53a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.4; c.stroke(); }
    c.save(); c.translate(-w / 2 + 29, top - 9); c.rotate(-0.15); box(c, 0, -5, 9, 5, 0.8, '#dfe6ea', INK, 0.6); box(c, 8.5, -3.5, 5, 2, 0.8, '#6b4431', INK, 0.5); c.restore();
    // a bowl of prepped food, ready for orders
    c.beginPath(); c.moveTo(w / 2 - 20, top - 7); c.quadraticCurveTo(w / 2 - 12, top + 1, w / 2 - 4, top - 7); c.closePath(); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
    for (let i = 0; i < 4; i++) circ(c, w / 2 - 17 + i * 3.4, top - 8, 1.5, ['#ffa53a', '#b9e08a', '#ffa53a', '#f28f7c'][i], INK, 0.3);
    // name plate on the front edge
    box(c, -9, top + 1.2, 18, 5.6, 1, '#fff5df', INK, 0.5); stext(c, T('PREP', 'SƠ CHẾ'), 0, top + 4.1, 3.4, '#8a5f3e', 900);
  },
  drinkStation(c, t, p) {
    const w = p.w || 110;
    counterBox(c, w, 30, 14, '#f7e3c0', '#fff8ea');
    for (let i = 0; i < 4; i++) { const x = -w / 2 + 12 + i * 16; box(c, x, -58, 12, 18, 3, 'rgba(255,255,255,.8)', INK, 0.8); box(c, x + 1, -50, 10, 9, 2, ['#e9a24a', '#5e3a28', '#f7a868', '#f3e7d6'][i], null); box(c, x - 1, -61, 14, 4, 1.5, '#b9c3cb', INK, 0.6); limb(c, [x + 6, -40, x + 6, -37], 1.5, '#8f9aa3', null); }
    // cup stacks
    for (let i = 0; i < 2; i++) for (let k = 0; k < 4; k++) poly(c, [w / 2 - 34 + i * 12 - 4, -42 - k * 3, w / 2 - 34 + i * 12 + 4, -42 - k * 3, w / 2 - 34 + i * 12 + 3, -38 - k * 3, w / 2 - 34 + i * 12 - 3, -38 - k * 3], 'rgba(255,255,255,.85)', INK, 0.5);
    box(c, -w / 2 + 6, -26, w - 12, 18, 2, shade('#f7e3c0', -12), INK, 0.6);
  },
  grill(c, t, p) {
    counterBox(c, p.w || 60, 28, 12, '#6e6a70', '#3d3a42');
    for (let x = -24; x <= 24; x += 5) line(c, x, -39, x, -30, '#8f9aa3', 1);
    for (let i = 0; i < 5; i++) { const k = (t * 0.7 + i * 0.2) % 1; c.globalAlpha = 0.5 * (1 - k); circ(c, -18 + i * 9, -40 - k * 16, 2 + k * 3, '#fff', null); c.globalAlpha = 1; }
    g(p, 0, -34, 30, 'rgba(255,140,70,.4)');
  },
  breadBasket(c, t, p) { ell(c, 0, -6, 16, 6, '#c9955e'); for (let i = 0; i < 3; i++) { c.save(); c.translate(-8 + i * 8, -10); c.rotate(-0.6 + i * 0.3); ell(c, 0, 0, 3, 9, '#e6a95a', INK, 0.8); c.restore(); } box(c, -16, -8, 32, 8, 3, '#b58352'); },
  menuBoard(c, t, p) { limb(c, [-10, 0, -6, -30], 1.8, '#8a5f3e'); limb(c, [10, 0, 6, -30], 1.8, '#8a5f3e'); box(c, -14, -40, 28, 26, 3, '#3d4a44'); for (let i = 0; i < 4; i++) line(c, -9, -34 + i * 5, 5 - (i % 2) * 5, -34 + i * 5, 'rgba(255,255,255,.8)', 1); circ(c, 8, -20, 2, '#f7de8c', null); },
  sacks(c, t, p) { for (let i = 0; i < 3; i++) { c.save(); c.translate(-12 + i * 12, 0); c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-8, -14, -3, -18); c.lineTo(3, -18); c.quadraticCurveTo(8, -14, 6, 0); c.closePath(); c.fillStyle = '#e9d8bf'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); c.restore(); } },
  window(c, t, p) {
    // wall window that shows the time-of-day sky
    const w = p.w || 40, h = p.h || 26, y = -p.hgt || -60;
    const n = LIGHT.night;
    const sky = n > 0.5 ? '#3b3f7a' : n > 0.1 ? '#f5a86a' : '#aee4ed';
    box(c, -w / 2 - 3, y - 3, w + 6, h + 6, 3, '#fff8ea');
    box(c, -w / 2, y, w, h, 2, sky);
    if (n < 0.3) { circ(c, w / 4, y + h / 3, 4, '#fff4c8', null); ell(c, -w / 5, y + h / 2, 7, 3, 'rgba(255,255,255,.9)', null); }
    else { for (let i = 0; i < 4; i++) circ(c, -w / 2 + 6 + i * 9, y + 5 + (i % 2) * 7, 0.9, '#fff', null); circ(c, w / 3, y + 7, 3, '#fff4c8', null); }
    line(c, 0, y, 0, y + h, '#fff8ea', 2.4); line(c, -w / 2, y + h / 2, w / 2, y + h / 2, '#fff8ea', 2.4);
    box(c, -w / 2 - 4, y + h + 2, w + 8, 4, 1.5, '#e9d8bf');
    if (p.curtain) { poly(c, [-w / 2 - 5, y - 4, -w / 2 + 6, y - 4, -w / 2 + 2, y + h, -w / 2 - 5, y + h + 2], p.curtain, INK, 0.8); poly(c, [w / 2 + 5, y - 4, w / 2 - 6, y - 4, w / 2 - 2, y + h, w / 2 + 5, y + h + 2], p.curtain, INK, 0.8); }
  },
  calendar(c, t, p) { box(c, -9, -62, 18, 20, 2, '#fff'); box(c, -9, -62, 18, 6, 2, '#e8584e'); text(c, String(p.day?.() ?? 1), 0, -49, 8, INK, 900); },
  altarShelf(c, t, p) { box(c, -18, -50, 36, 6, 2, '#a8563f'); for (const x of [-10, 0, 10]) circ(c, x, -54, 3, ['#ffb74a', '#9fd67a', '#f36d86'][(x / 10 + 1) | 0], INK, 0.6); },
  crateStack(c, t, p) { for (const [x, y] of [[-10, 0], [10, 0], [0, -16]]) { box(c, x - 9, y - 16, 18, 16, 2, '#c9955e'); line(c, x - 8, y - 15, x + 8, y - 1, '#a8763f', 0.8); } },
  photoWall(c, t, p) {
    // Mèo Mây's memory wall grows with every keepsake you collect: little frames fill the wall around the main ones
    const extra = Math.min(10, p.grow ? p.grow() : 0);
    for (let i = 0; i < extra; i++) { const x = -44 + (i % 5) * 22, y = -84 + Math.floor(i / 5) * 42 + (i % 2) * 3; if (Math.abs(x) < 34 && y > -70) continue; box(c, x - 4, y, 8, 9, 0.8, '#fff'); box(c, x - 3, y + 1, 6, 5, 0.4, ['#f7de8c', '#9fd8c8', '#f4a9b8', '#aee4ed', '#c9b6e8'][i % 5], null); }
    for (let i = 0; i < 4; i++) { const x = -24 + i * 16, y = -62 + (i % 2) * 6; box(c, x - 6, y, 12, 14, 1, '#fff'); box(c, x - 4.5, y + 1.5, 9, 8, 0.6, ['#aee4ed', '#f7de8c', '#f4a9b8', '#9fd8c8'][i], null); } line(c, -32, -63, 32, -63, INK, 0.6); },
  cashBox(c, t, p) { box(c, -9, -10, 18, 10, 2, '#f2c14e'); box(c, -6, -13, 12, 3, 1, '#d9a032'); if ((p.amount?.() || 0) > 0) { for (let i = 0; i < 3; i++) circ(c, -4 + i * 4, -15 - (i % 2) * 2, 2.4, '#ffd35a', INK, 0.6); } },
  pass(c, t, p) { counterBox(c, p.w || 60, 30, 10, p.col || '#e9d8bf', p.top || '#fffdf6'); },
  // ---- boutique
  clothesRack(c, t, p) {
    const w = p.w || 60, cols = p.cols || ['#f4a9b8', '#9fd8c8', '#f7de8c', '#c9b6e8', '#8fb7e0', '#f8c0a0'];
    shadow(c, 0, 1, w / 2 + 2, 3, 0.16);
    for (const x of [-w / 2, w / 2]) limb(c, [x, 0, x, -46], 2.2, '#b9c3cb');
    line(c, -w / 2, -45, w / 2, -45, '#8f9aa3', 2);
    const n = Math.floor(w / 9);
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 6 + i * (w - 12) / Math.max(1, n - 1), sw = Math.sin(t * 1.2 + i + p.x) * 0.03;
      c.save(); c.translate(x, -45); c.rotate(sw);
      c.strokeStyle = '#8f9aa3'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 3); c.moveTo(-4, 5); c.lineTo(0, 3); c.lineTo(4, 5); c.stroke();
      const col = cols[i % cols.length], dress = i % 3 === 1;
      if (dress) poly(c, [-4, 5, 4, 5, 6.5, 26, -6.5, 26], col, INK, 0.7);
      else { poly(c, [-4.6, 5, 4.6, 5, 5, 20, -5, 20], col, INK, 0.7); poly(c, [-4.6, 5, -7.4, 11, -5.4, 12.4, -4, 9], col, INK, 0.6); poly(c, [4.6, 5, 7.4, 11, 5.4, 12.4, 4, 9], col, INK, 0.6); }
      c.restore();
    }
  },
  mirror(c, t, p) {
    shadow(c, 0, 1, 12, 3, 0.16);
    box(c, -11, -52, 22, 50, 10, '#e3b86a', INK, 1);
    const gr = c.createLinearGradient(-8, -48, 8, -6); gr.addColorStop(0, '#dff4ff'); gr.addColorStop(1, '#a9cfe6');
    box(c, -8, -49, 16, 44, 8, gr, 'rgba(91,63,54,.4)', 0.6);
    c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-4, -40); c.lineTo(2, -46); c.moveTo(-5, -32); c.lineTo(4, -41); c.stroke();
    limb(c, [-6, -2, -9, 0], 1.6, '#c9975f'); limb(c, [6, -2, 9, 0], 1.6, '#c9975f');
  },
  mannequin(c, t, p) {
    const col = p.col || '#f4a9b8';
    shadow(c, 0, 1, 8, 2.4, 0.16);
    limb(c, [0, 0, 0, -14], 1.6, '#8a5f3e'); ell(c, 0, 0, 6, 1.6, '#8a5f3e', INK, 0.6);
    poly(c, [-6, -32, 6, -32, 8, -12, -8, -12], col, INK, 0.8);
    ell(c, 0, -34, 5, 2.4, '#f3e6d6', INK, 0.7); circ(c, 0, -40, 3.6, '#f3e6d6', INK, 0.8);
    if (p.hat) { ell(c, 0, -43, 7, 2, p.hat, INK, 0.7); ell(c, 0, -45, 3.6, 2.4, p.hat, INK, 0.7); }
  },
  fittingRoom(c, t, p) {
    shadow(c, 0, 1, 22, 4, 0.16);
    box(c, -22, -62, 44, 62, 3, '#fbe3ea', INK, 1);
    line(c, -20, -58, 20, -58, '#b9c3cb', 1.6);
    const sw = Math.sin(t * 0.8) * 1.2;
    c.fillStyle = p.col || '#e56b8b';
    for (let i = 0; i < 6; i++) { const x = -19 + i * 6.4; c.beginPath(); c.moveTo(x, -57); c.lineTo(x + 6.4, -57); c.lineTo(x + 6.4 + sw * (i / 6), -2); c.lineTo(x + sw * (i / 6), -2); c.closePath(); c.fillStyle = i % 2 ? shade(p.col || '#e56b8b', -12) : (p.col || '#e56b8b'); c.fill(); }
    c.strokeStyle = INK; c.lineWidth = 0.8; c.strokeRect(-19, -57, 38, 55);
    if (p.occupied) { ell(c, -4, -1, 3.2, 1.6, '#5a4a48', null); ell(c, 4, -1, 3.2, 1.6, '#5a4a48', null); }   // someone's changing
    text(c, 'FITTING', 0, -66, 5, INK, 900);
  },
  shoeShelf(c, t, p) {
    const w = p.w || 44;
    counterBox(c, w, 26, 6, '#e3c29a', '#f3dcb8');
    const cols = ['#e9848f', '#fff', '#5f6b86', '#f5d06a', '#7a5040', '#9fd8c8'];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) { const x = -w / 2 + 8 + i * (w - 16) / 2, y = -24 + r * 11; ell(c, x - 2, y + 6, 3.2, 1.8, cols[(i + r * 3) % 6], INK, 0.6); ell(c, x + 2.6, y + 6, 3.2, 1.8, cols[(i + r * 3) % 6], INK, 0.6); }
  },
  hatStand(c, t, p) {
    shadow(c, 0, 1, 7, 2, 0.16);
    limb(c, [0, 0, 0, -40], 2, '#8a5f3e'); ell(c, 0, 0, 7, 1.8, '#8a5f3e', INK, 0.6);
    for (const [x, y, col, k] of [[-6, -36, '#f3dcae', 'sun'], [6, -30, '#9fd8c8', 'b'], [-5, -24, '#f28f7c', 'b']]) { limb(c, [0, y + 4, x, y + 2], 1, '#8a5f3e'); if (k === 'sun') { ell(c, x, y, 9, 2.6, col, INK, 0.7); ell(c, x, y - 2.4, 4.6, 3, col, INK, 0.7); line(c, x - 4.4, y - 1, x + 4.4, y - 1, '#f28f7c', 1.2); } else { ell(c, x, y, 6, 2, col, INK, 0.7); ell(c, x, y - 2.4, 4, 3, col, INK, 0.7); } }
  },
  // ---- shop details
  pegboard(c, t, p) {
    const w = p.w || 60;
    box(c, -w / 2, -44, w, 30, 2, '#d8b98a', INK, 1);
    c.fillStyle = 'rgba(91,63,54,.35)'; for (let y = -40; y < -16; y += 5) for (let x = -w / 2 + 4; x < w / 2; x += 5) c.fillRect(x, y, 1, 1);
    limb(c, [-w / 2 + 10, -38, -w / 2 + 10, -22], 1.4, '#8f9aa3'); box(c, -w / 2 + 6, -40, 8, 3, 1, '#8f9aa3');
    limb(c, [-4, -38, 2, -24], 1.4, '#b27b4c'); box(c, -7, -40, 8, 3.4, 1, '#8f9aa3');
    c.strokeStyle = '#e8584e'; c.lineWidth = 1.6; c.beginPath(); c.arc(w / 2 - 12, -30, 5, 0, TAU); c.stroke();
    limb(c, [w / 2 - 22, -38, w / 2 - 22, -22], 1.2, '#f2c14e');
  },
  bunting(c, t, p) {
    const w = p.w || 120, cols = p.cols || ['#f28f7c', '#f7de8c', '#9fd8c8', '#f4a9b8', '#8fb7e0'];
    c.strokeStyle = INK; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-w / 2, -54); c.quadraticCurveTo(0, -44, w / 2, -54); c.stroke();
    const n = Math.floor(w / 12);
    for (let i = 0; i <= n; i++) { const k = i / n, x = -w / 2 + k * w, y = -54 + Math.sin(k * Math.PI) * 5; poly(c, [x - 4, y, x + 4, y, x, y + 7 + Math.sin(t * 2 + i) * 0.4], cols[i % cols.length], INK, 0.5); }
  },
  // a standing aisle sign: weighted base, chrome pole, a board on top
  aisleSign(c, t, p) {
    shadow(c, 0, 1, 9, 2.4, 0.18);
    ell(c, 0, -1, 8, 2.4, '#8f9aa3', INK, 0.8);
    limb(c, [0, -2, 0, -38], 1.8, '#b9c3cb');
    const lab = Array.isArray(p.label) ? tr(p.label) : (p.label || '');
    box(c, -19, -50, 38, 13, 3, p.col || '#6fbf73', INK, 0.9); box(c, -17, -48, 34, 9, 2, null, 'rgba(255,255,255,.55)', 0.6);
    text(c, lab, 0, -43.2, 5.4, '#fff', 900);
    if (p.icon) { circ(c, 15, -52, 4, '#fffaf0', INK, 0.6); }
  },
  wallShelf(c, t, p) {
    box(c, -18, -40, 36, 4, 1, '#b77a4f', INK, 0.8);
    poly(c, [-14, -40, -10, -40, -9, -46, -15, -46], '#d9784f', INK, 0.6); ell(c, -12, -49, 4, 4, '#7fc062', INK, 0.6);
    box(c, -4, -50, 6, 10, 1, '#9fb4dc', INK, 0.6); box(c, 3, -48, 5, 8, 1, '#f4a9b8', INK, 0.6);
    circ(c, 13, -44, 3.4, '#f7de8c', INK, 0.6);
  },
  familyPhoto(c, t, p) { box(c, -10, -52, 20, 16, 2, '#b77a4f', INK, 0.8); box(c, -8, -50, 16, 12, 1, '#dff4ff', null); circ(c, -3, -45, 2.6, '#f8d6bd', INK, 0.4); circ(c, 3, -44, 2.2, '#fffaf2', INK, 0.4); ell(c, 0, -39, 7, 2, '#8fcf6f', null); },
  floorLamp(c, t, p) { shadow(c, 0, 1, 6, 2, 0.14); limb(c, [0, 0, 0, -42], 1.4, '#8f9aa3'); ell(c, 0, 0, 5, 1.4, '#8f9aa3', INK, 0.6); poly(c, [-7, -40, 7, -40, 5, -50, -5, -50], '#fff1c8', INK, 0.8); if (LIGHT.night > 0.2) g(p, 0, -44, 40, 'rgba(255,220,150,.45)'); },
  deskNook(c, t, p) { counterBox(c, 40, 24, 8, '#c9955e', '#e3b77f'); box(c, -12, -38, 14, 9, 1, '#fffaf0', INK, 0.6); line(c, -10, -35, 0, -35, '#b8a88f', 0.6); line(c, -10, -32, -2, -32, '#b8a88f', 0.6); circ(c, 11, -35, 3, '#f28f7c', INK, 0.6); limb(c, [11, -38, 13, -44], 0.8, '#8a5f3e'); },
  wardrobeBig(c, t, p) {
    shadow(c, 0, 1, 26, 4, 0.18);
    box(c, -24, -64, 48, 64, 4, p.col || '#e3b77f', INK, 1);
    box(c, -26, -68, 52, 7, 2, shade(p.col || '#e3b77f', -16), INK, 1);
    line(c, 0, -62, 0, -4, INK, 1);
    for (const x of [-12, 12]) box(c, x - 9, -58, 18, 50, 3, shade(p.col || '#e3b77f', 10), 'rgba(91,63,54,.4)', 0.7);
    circ(c, -3, -32, 1.5, '#f2c14e', INK, 0.5); circ(c, 3, -32, 1.5, '#f2c14e', INK, 0.5);
    // a sleeve peeking out
    poly(c, [0, -44, 5, -40, 3, -36, 0, -38], '#f4a9b8', INK, 0.5);
  },
};

// Small furniture preview for the decorate bar (draws into a canvas).
export function drawFurniturePreview(cv, id, def) {
  const c = cv.getContext('2d'), w = cv.width, h = cv.height;
  c.clearRect(0, 0, w, h);
  c.save(); c.translate(w / 2, h * 0.92); const s = Math.min(w / ((def.w || 30) + 16), h / 70) * 1; c.scale(s, s);
  const fn = FURN_DRAW[id];
  if (fn) fn(c, 0, { x: 0, y: 0, ...def, preview: true });
  c.restore();
}
export const FURN_DRAW = {
  rug_round: (c, t, p) => F.rug(c, t, { ...p, w: 44, h: 26, col: '#f4a9b8' }),
  rug_long: (c, t, p) => F.mat(c, t, { ...p, w: 60, h: 30, col: '#e9c46f' }),
  plant_big: (c, t, p) => F.plant(c, t, p),
  plant_bonsai: (c, t, p) => F.bonsai(c, t, p),
  lamp_floor: (c, t, p) => F.lamp(c, t, p),
  lantern_red: (c, t, p) => { c.save(); c.translate(0, p.preview ? 50 : 0); F.lantern(c, t, p); c.restore(); },
  table_low: (c, t, p) => F.table(c, t, { ...p, w: 34, col: '#b77a4f' }),
  chair_wood: (c, t, p) => F.chair(c, t, p),
  sofa: (c, t, p) => F.sofa(c, t, p),
  bookshelf: (c, t, p) => F.bookshelf(c, t, p),
  fan: (c, t, p) => F.fan(c, t, p),
  fishtank: (c, t, p) => F.fishtank(c, t, p),
  tv: (c, t, p) => F.tv(c, t, p),
  hammock: (c, t, p) => F.hammock(c, t, p),
  painting: (c, t, p) => { c.save(); c.translate(0, p.preview ? 44 : 0); F.painting(c, t, p); c.restore(); },
  clock: (c, t, p) => { c.save(); c.translate(0, p.preview ? 44 : 0); F.clock(c, t, p); c.restore(); },
  radio: (c, t, p) => F.radio(c, t, p),
  cat_bed: (c, t, p) => F.cat_bed(c, t, p),
  piano: (c, t, p) => F.piano(c, t, p),
  aquarium_big: (c, t, p) => F.koi(c, t, p),
};

// ---------------------------------------------------------------- quality pass
// Richer versions of the everyday pieces: wood grain, bevels, soft highlights,
// stitched fabric and little props on top. Same footprints as before.
const grain = (c, x, y, w, h, col, n = 3) => { c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.strokeStyle = shade(col, -18); c.globalAlpha = 0.5; c.lineWidth = 0.5; for (let i = 1; i <= n; i++) { const yy = y + h * i / (n + 1); c.beginPath(); c.moveTo(x, yy); c.bezierCurveTo(x + w * 0.3, yy - 1, x + w * 0.6, yy + 1, x + w, yy); c.stroke(); } c.restore(); };
const wood = (c, x, y, w, h, r, col, lw = 1) => { box(c, x, y, w, h, r, col, INK, lw); grain(c, x + 1, y + 1, w - 2, h - 2, col, Math.max(1, Math.round(h / 5))); c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x + 1.5, y + 1, w - 3, 1); c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(x + 1.5, y + h - 2, w - 3, 1.2); };
const fabric = (c, x, y, w, h, r, col) => { box(c, x, y, w, h, r, col, INK, 0.9); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.ellipse(x + w * 0.35, y + h * 0.3, w * 0.25, h * 0.18, 0, 0, TAU); c.fill(); };
const stitch = (c, x, y, w, h, col) => { c.save(); c.setLineDash([1.4, 1.2]); c.strokeStyle = col; c.lineWidth = 0.5; c.strokeRect(x, y, w, h); c.restore(); };
function counterBox2(c, w, h, d, col, top) {
  wood(c, -w / 2, -h, w, h, 3, col);
  box(c, -w / 2 - 2, -h - d, w + 4, d + 2, 3, top || shade(col, 22), INK, 1);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-w / 2, -h - d + 1.2, w, 1.2);
  c.fillStyle = 'rgba(0,0,0,.1)'; c.fillRect(-w / 2 + 2, -h + 2, w - 4, 3);
  // cupboard doors with knobs
  const n = Math.max(1, Math.floor(w / 22));
  for (let i = 0; i < n; i++) { const dw = (w - 6) / n, x = -w / 2 + 3 + i * dw; box(c, x + 1, -h + 6, dw - 2, h - 9, 2, null, shade(col, -22), 0.7); circ(c, x + dw - 4, -h / 2 + 1, 0.9, '#f2c14e', INK, 0.4); }
}
Object.assign(F, {
  bed(c, t, p) {
    const col = p.col || '#f4a9b8', sl = p.sleeper?.();
    shadow(c, 0, 1, 34, 6, 0.2);
    // carved headboard with posts
    c.beginPath(); c.moveTo(-31, -40); c.lineTo(-31, -52); c.quadraticCurveTo(0, -62, 31, -52); c.lineTo(31, -40); c.closePath();
    c.fillStyle = '#b77a4f'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.1; c.stroke(); grain(c, -30, -58, 60, 18, '#b77a4f', 3);
    heart(c, 0, -51, 2.4, shade(col, -10), INK, 0.5);
    for (const x of [-31, 31]) { box(c, x - 2.6, -56, 5.2, 56, 2, '#a26a42', INK, 0.9); circ(c, x, -57, 2.8, '#c98f5a', INK, 0.8); }
    // mattress + sheet
    box(c, -29, -44, 58, 44, 4, '#fffaf0', INK, 1);
    c.fillStyle = 'rgba(200,190,170,.25)'; c.fillRect(-28, -6, 56, 5);
    // pillows (with a crease)
    for (const x of [-15, 14]) { fabric(c, x - 11, -42, 22, 11, 5, x < 0 ? '#ffffff' : '#fff4f6'); c.strokeStyle = 'rgba(160,140,130,.4)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x - 6, -36); c.quadraticCurveTo(x, -34.5, x + 6, -36); c.stroke(); }
    if (sl) { // lying on their back, head on the pillow
      const br = Math.sin(t * 1.6) * 0.25, k = 0.82;
      c.save(); c.translate(-15, -37 + 26.8 * k + br); c.scale(k, k);
      p.drawSleeper(c, { ...sl, dir: 'down', moving: 0, act: 'sleep', emo: 'sleepy', blinkAmt: 1, sit: false, hop: 0 }, t);
      c.restore();
    }
    // patchwork quilt, folded down at the top
    const qTop = sl ? -30 : -27;
    box(c, -29, qTop, 58, -qTop, 4, col, INK, 1);
    c.save(); c.beginPath(); c.rect(-28, qTop + 1, 56, -qTop - 2); c.clip();
    const alt = shade(col, 14), dk = shade(col, -10);
    for (let yy = qTop + 6, r = 0; yy < 0; yy += 7, r++) for (let xx = -28, k = 0; xx < 28; xx += 8, k++) if ((r + k) % 2) { c.fillStyle = alt; c.fillRect(xx, yy, 8, 7); } else if ((r * 3 + k) % 5 === 0) { c.fillStyle = dk; c.fillRect(xx, yy, 8, 7); }
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 0.5; c.setLineDash([1.2, 1.2]);
    for (let yy = qTop + 6; yy < 0; yy += 7) { c.beginPath(); c.moveTo(-28, yy); c.lineTo(28, yy); c.stroke(); }
    c.restore();
    box(c, -29, qTop, 58, 6, 3, '#fffaf0', INK, 0.9);                                  // turned-down sheet
    if (sl) { const br = Math.sin(t * 1.6) * 0.8; ell(c, -12, qTop + 12 + br * 0.3, 14, 6 + br, 'rgba(255,255,255,.18)', null); } // the sleeper's shape breathing under the quilt
  },
  wardrobe(c, t, p) {
    shadow(c, 0, 1, 22, 4, 0.18);
    wood(c, -20, -62, 40, 62, 3, '#c98f5a');
    for (const x of [-18, 1]) { box(c, x, -59, 17, 50, 2, shade('#c98f5a', 8), 'rgba(91,63,54,.5)', 0.7); box(c, x + 3, -55, 11, 20, 2, null, shade('#c98f5a', -18), 0.6); box(c, x + 3, -31, 11, 18, 2, null, shade('#c98f5a', -18), 0.6); }
    circ(c, -3, -34, 1.4, '#f2c14e', INK, 0.5); circ(c, 3, -34, 1.4, '#f2c14e', INK, 0.5);
    wood(c, -22, -66, 44, 6, 2, '#b77a4f'); box(c, -18, -8, 36, 6, 1, shade('#c98f5a', -14), INK, 0.7);
  },
  kitchen(c, t, p) {
    counterBox2(c, 70, 30, 12, '#9fd8c8', '#fff8ea');
    // stovetop with a steaming kettle, a cutting board and a jar of utensils
    box(c, -32, -41, 24, 8, 2, '#b9c3cb', INK, 0.8); circ(c, -26, -37, 2.6, '#5b5660', null); circ(c, -14, -37, 2.6, '#5b5660', null);
    ell(c, -26, -41, 4.6, 2, '#f28f7c', INK, 0.8); c.beginPath(); c.moveTo(-30, -41); c.quadraticCurveTo(-26, -48, -22, -41); c.fillStyle = '#f28f7c'; c.fill(); c.stroke(); limb(c, [-22, -43, -18, -46], 1, INK);
    for (let i = 0; i < 2; i++) { const k = (t * 0.6 + i / 2) % 1; c.globalAlpha = 0.5 * (1 - k); circ(c, -17 + k * 3, -48 - k * 9, 1.4 + k * 2, '#fff', null); } c.globalAlpha = 1;
    box(c, -4, -40, 14, 6, 1.5, '#e6bc85', INK, 0.7); ell(c, 2, -40, 2.4, 1, '#f28f7c', null);
    box(c, 16, -46, 7, 8, 1.5, '#fff8ea', INK, 0.6); for (const [x, h, cl] of [[17.5, 6, '#c98f5a'], [19.5, 7, '#b9c3cb'], [21.5, 5, '#c98f5a']]) limb(c, [x, -46, x, -46 - h], 0.8, cl);
    circ(c, 29, -40, 3.4, '#f7de8c', INK, 0.6);
  },
  table(c, t, p) {
    const w = p.w || 34, col = p.col || '#d19a62';
    shadow(c, 0, 1, w / 2 + 2, 4, 0.18);
    for (const x of [-w / 2 + 4, w / 2 - 4]) { c.beginPath(); c.moveTo(x - 1.6, -12); c.lineTo(x + 1.6, -12); c.lineTo(x + 0.9, 0); c.lineTo(x - 0.9, 0); c.closePath(); c.fillStyle = shade(col, -20); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); }
    wood(c, -w / 2, -18, w, 7, 3, col);
    if (p.cloth) { box(c, -w / 2 + 2, -18.5, w - 4, 6, 2, p.cloth, INK, 0.6); c.strokeStyle = shade(p.cloth, -20); c.lineWidth = 0.5; for (let x = -w / 2 + 4; x < w / 2 - 2; x += 2.2) { c.beginPath(); c.moveTo(x, -12.5); c.lineTo(x, -11.5); c.stroke(); } }
    if (!p.bare) { box(c, -2.5, -25, 5, 7, 2, '#9fd8c8', INK, 0.6); for (let i = 0; i < 3; i++) flower(c, -2 + i * 2, -26.5 - (i % 2) * 1.5, 1.5, ['#ff8fb0', '#ffd35a', '#fff'][i], i === 2 ? 1 : 0); }
  },
  chair(c, t, p) {
    const col = p.col || '#c88a52';
    shadow(c, 0, 1, 7, 2.4, 0.16);
    for (const x of [-5, 5]) limb(c, [x, -8, x, 0], 1.6, shade(col, -22));
    if (!p.noBack) { for (const x of [-6, 6]) limb(c, [x, -10, x, -24], 1.6, shade(col, -10)); wood(c, -7, -26, 14, 5, 2, col, 0.8); for (const x of [-2.4, 0, 2.4]) limb(c, [x, -21, x, -12], 0.8, shade(col, -10)); }
    wood(c, -7.5, -11.5, 15, 4.5, 1.5, col, 0.9);
  },
  stool(c, t, p) {
    const col = p.col || '#e8584e';
    shadow(c, 0, 1, 6, 2, 0.16);
    poly(c, [-5, 0, -4, -7, 4, -7, 5, 0], shade(col, -20)); c.fillStyle = 'rgba(0,0,0,.12)'; c.beginPath(); c.moveTo(-2, -1); c.lineTo(0, -5); c.lineTo(2, -1); c.fill();
    ell(c, 0, -7.5, 5.4, 2.2, col); ell(c, -1.4, -8, 2.4, 0.8, 'rgba(255,255,255,.35)', null);
  },
  rug(c, t, p) {
    const w = p.w || 44, h = p.h || 26, col = p.col || '#f4a9b8';
    // fringe
    c.strokeStyle = shade(col, -20); c.lineWidth = 0.6; for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, x = Math.cos(a) * (w / 2 + 1.5), y = -h / 2 + Math.sin(a) * (h / 2 + 1.5); c.beginPath(); c.moveTo(x * 0.96, y); c.lineTo(x * 1.04, -h / 2 + (y + h / 2) * 1.06); c.stroke(); }
    ell(c, 0, -h / 2, w / 2, h / 2, col, 'rgba(91,63,54,.5)', 1);
    ell(c, 0, -h / 2, w / 2 - 4, h / 2 - 3, shade(col, 10), null);
    ell(c, 0, -h / 2, w / 2 - 6, h / 2 - 5, null, 'rgba(255,255,255,.75)', 1.2);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; circ(c, Math.cos(a) * (w / 2 - 9), -h / 2 + Math.sin(a) * (h / 2 - 7), 1.2, shade(col, -18), null); }
    ell(c, 0, -h / 2, w / 5, h / 5, shade(col, -8), 'rgba(255,255,255,.6)', 0.8);
  },
  mat(c, t, p) {
    const w = p.w || 60, h = p.h || 30, col = p.col || '#e9c46f';
    box(c, -w / 2, -h, w, h, 3, col, 'rgba(91,63,54,.5)', 1);
    c.save(); c.beginPath(); c.rect(-w / 2 + 1, -h + 1, w - 2, h - 2); c.clip();
    for (let y = -h; y < 0; y += 4) for (let x = -w / 2 + ((y / 4) % 2 ? 0 : 2); x < w / 2; x += 4) { c.fillStyle = shade(col, ((x + y) / 4) % 2 ? -10 : 6); c.fillRect(x, y, 2.2, 3.4); }
    c.restore();
    box(c, -w / 2 + 3, -h + 3, w - 6, h - 6, 2, null, shade(col, -28), 0.8);
  },
  plant(c, t, p) {
    const s = p.s || 1, pot = p.pot || '#d9784f';
    shadow(c, 0, 1, 8 * s, 3, 0.16);
    const sw = Math.sin(t * 1.5 + p.x) * 0.05;
    for (let i = -3; i <= 3; i++) { c.save(); c.translate(0, -12 * s); c.rotate(i * 0.34 + sw * (1 + Math.abs(i) * 0.3)); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-3.6 * s, -11 * s, 0, -22 * s + Math.abs(i) * 2 * s); c.quadraticCurveTo(3.6 * s, -11 * s, 0, 0); c.fillStyle = i % 2 ? '#6fb356' : '#7fc062'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); c.strokeStyle = 'rgba(40,90,40,.5)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(0, -1); c.lineTo(0, -19 * s + Math.abs(i) * 2 * s); c.stroke(); c.restore(); }
    poly(c, [-6.4 * s, -12 * s, 6.4 * s, -12 * s, 4.6 * s, 0, -4.6 * s, 0], pot); box(c, -7 * s, -14 * s, 14 * s, 3.2 * s, 1.2, shade(pot, -12), INK, 0.8);
    c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-4 * s, -10 * s, 1.4 * s, 8 * s);
  },
  lamp(c, t, p) {
    shadow(c, 0, 1, 6, 2, 0.16);
    limb(c, [0, 0, 0, -36], 1.6, '#5a4a48'); ell(c, 0, 0, 5.4, 2, '#5a4a48');
    poly(c, [-8.5, -36, 8.5, -36, 5, -47, -5, -47], '#f7de8c', INK, 0.9);
    c.strokeStyle = '#e3b64a'; c.lineWidth = 0.6; for (const x of [-4, 0, 4]) { c.beginPath(); c.moveTo(x * 1.4, -36.5); c.lineTo(x, -46.5); c.stroke(); }
    if (LIGHT.night > 0.2 && !p.off) { c.fillStyle = 'rgba(255,230,160,.25)'; c.beginPath(); c.moveTo(-8, -36); c.lineTo(8, -36); c.lineTo(16, -8); c.lineTo(-16, -8); c.closePath(); c.fill(); }
    g(p, 0, -38, 44, 'rgba(255,220,150,.6)');
  },
  sofa(c, t, p) {
    const base = '#c9a26a';
    shadow(c, 0, 1, 30, 5, 0.2);
    // woven rattan frame
    box(c, -28, -27, 56, 15, 6, base, INK, 1);
    c.save(); c.beginPath(); c.rect(-27, -26, 54, 13); c.clip(); c.strokeStyle = shade(base, -18); c.lineWidth = 0.5; for (let x = -30; x < 30; x += 3) { c.beginPath(); c.moveTo(x, -26); c.lineTo(x + 3, -13); c.moveTo(x + 3, -26); c.lineTo(x, -13); c.stroke(); } c.restore();
    box(c, -28, -14, 56, 14, 4, shade(base, 8), INK, 1);
    for (const x of [-31, 23]) { box(c, x, -23, 8, 23, 4, shade(base, -12), INK, 1); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(x + 1.5, -21, 5, 1.2); }
    // plump seat cushions with piping and throw pillows
    for (const x of [-23, 0.5]) { fabric(c, x, -17, 22.5, 7, 3, '#f7ead8'); stitch(c, x + 1.5, -15.8, 19.5, 4.6, 'rgba(160,120,90,.5)'); }
    fabric(c, -21, -26, 12, 10, 4, '#f4a9b8'); circ(c, -15, -21, 0.8, shade('#f4a9b8', -25), null);
    fabric(c, 9, -25, 12, 9, 4, '#9fd8c8'); circ(c, 15, -20.5, 0.8, shade('#9fd8c8', -25), null);
    for (const x of [-24, 22]) limb(c, [x, 0, x, 2], 1.6, '#8a5f3e');
  },
  bookshelf(c, t, p) {
    shadow(c, 0, 1, 20, 4, 0.18);
    wood(c, -18, -56, 36, 56, 3, '#b77a4f');
    const R = rng(p.x | 0);
    for (let r = 0; r < 3; r++) {
      const y0 = -52 + r * 17;
      box(c, -15, y0, 30, 14, 1, '#7e4f33', null); c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(-15, y0, 30, 2);
      let x = -14;
      while (x < 12) {
        if (R() < 0.12 && x < 6) { circ(c, x + 3, y0 + 10.5, 3, ['#9fd67a', '#f7de8c', '#f4a9b8'][Math.floor(R() * 3)], INK, 0.5); x += 7; continue; } // a little trinket
        const w = 2.8 + R() * 2.6, h = 8.5 + R() * 4.5, lean = R() < 0.12 ? 0.25 : 0;
        const bc = ['#f28f7c', '#9fd8c8', '#f7de8c', '#a9d4f0', '#c9b6e8', '#e9a24a', '#8fb7e0'][Math.floor(R() * 7)];
        c.save(); c.translate(x + w / 2, y0 + 14); c.rotate(lean); box(c, -w / 2, -h, w, h, 0.8, bc, INK, 0.5); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-w / 2 + 0.6, -h + 2, w - 1.2, 0.8); c.fillRect(-w / 2 + 0.6, -3, w - 1.2, 0.6); c.restore();
        x += w + 0.5 + lean * 4;
      }
    }
    // a plant on top
    poly(c, [-12, -56, -6, -56, -7, -60, -11, -60], '#d9784f', INK, 0.6); circ(c, -9, -63, 3.4, '#7fc062', INK, 0.6);
  },
  tv(c, t, p) {
    shadow(c, 0, 1, 16, 3, 0.16);
    wood(c, -15, -9, 30, 9, 2, '#8a5f3e');
    box(c, -14, -31, 28, 22, 5, '#7c7680', INK, 1); box(c, -11, -28, 19, 16, 4, '#3d3a42', INK, 0.6);
    const hue = (t * 30 + (p.ch || 0) * 90) % 360; c.save(); c.beginPath(); c.roundRect ? c.roundRect(-10, -27, 17, 14, 3) : c.rect(-10, -27, 17, 14); c.clip();
    if (p.off) { c.fillStyle = '#2f2c34'; c.fillRect(-10, -27, 17, 14); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(-9, -26, 6, 3); c.restore(); circ(c, 11, -24, 1.4, '#5a4a48', INK, 0.4); circ(c, 11, -19, 1.4, '#5a4a48', INK, 0.4); limb(c, [-4, -31, -9, -39], 0.8, INK); limb(c, [4, -31, 9, -39], 0.8, INK); return; }
    c.fillStyle = `hsl(${hue},60%,78%)`; c.fillRect(-10, -27, 17, 14); c.fillStyle = `hsl(${(hue + 90) % 360},60%,65%)`; c.beginPath(); c.arc(-1.5 + Math.sin(t) * 3, -20, 3.5, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(-10, -27, 17, 3); c.restore();
    circ(c, 11, -24, 1.4, '#e8584e', INK, 0.4); circ(c, 11, -19, 1.4, '#f2c14e', INK, 0.4);
    limb(c, [-4, -31, -9, -39], 0.8, INK); limb(c, [4, -31, 9, -39], 0.8, INK); circ(c, -9, -39, 0.9, '#b9c3cb', null); circ(c, 9, -39, 0.9, '#b9c3cb', null);
  },
  painting(c, t, p) {
    wood(c, -14, -63, 28, 22, 2, '#b77a4f');
    box(c, -11.5, -60.5, 23, 17, 1, '#fff5df', null);
    const sky = c.createLinearGradient(0, -60, 0, -48); sky.addColorStop(0, '#aee4ed'); sky.addColorStop(1, '#fff1d6'); c.fillStyle = sky; c.fillRect(-11, -60, 22, 11);
    circ(c, 5, -55, 2.6, '#ffd35a', null);
    poly(c, [-11, -49, -4, -56, 2, -49], '#8fb466', null); poly(c, [-2, -49, 5, -54, 11, -49], '#7fa35a', null);
    c.fillStyle = '#6cc3cf'; c.fillRect(-11, -49, 22, 5.5); c.strokeStyle = '#fff'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(-8, -47); c.lineTo(-4, -47); c.moveTo(2, -46); c.lineTo(6, -46); c.stroke();
    line(c, 0, -64, -5, -70, INK, 0.5); line(c, 0, -64, 5, -70, INK, 0.5);
  },
  clock(c, t, p) {
    circ(c, 0, -58, 7.6, '#c98f5a', INK, 1.2); circ(c, 0, -58, 6, '#fff8ea', INK, 0.6);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; circ(c, Math.sin(a) * 4.8, -58 - Math.cos(a) * 4.8, i % 3 ? 0.35 : 0.6, INK, null); }
    const m = (LIGHT.minutes || 0);
    line(c, 0, -58, Math.sin(m / 720 * TAU) * 3.2, -58 - Math.cos(m / 720 * TAU) * 3.2, INK, 1.2);
    line(c, 0, -58, Math.sin(m / 60 * TAU) * 4.8, -58 - Math.cos(m / 60 * TAU) * 4.8, INK, 0.8);
    circ(c, 0, -58, 0.8, '#e8584e', null);
  },
  fridge(c, t, p) {
    shadow(c, 0, 1, 20, 4, 0.18);
    box(c, -18, -60, 36, 60, 5, '#eef2f5', INK, 1);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(-16, -58, 3, 54);
    box(c, -15, -56, 30, 50, 3, 'rgba(180,225,240,.7)', INK, 0.7);
    for (let r = 0; r < 3; r++) { line(c, -15, -40 + r * 16, 15, -40 + r * 16, 'rgba(255,255,255,.8)', 1); for (let i = 0; i < 4; i++) { const cl = ['#f28f7c', '#9fd8c8', '#fff', '#f7de8c'][(i + r) % 4]; box(c, -13 + i * 7, -52 + r * 16, 5, 11, 1.5, cl, INK, 0.4); box(c, -12.3 + i * 7, -54 + r * 16, 3.6, 2.4, 0.6, shade(cl, -20), INK, 0.3); } }
    limb(c, [15.5, -40, 15.5, -24], 1.4, '#b9c3cb');
    circ(c, -10, -58, 1.3, '#f36d86', null); box(c, 6, -59, 5, 4, 0.6, '#ffd35a', null);
    g(p, 0, -30, 30, 'rgba(200,240,255,.4)');
  },
  cushion(c, t, p) {
    const col = p.col || '#f7a6b4';
    ell(c, 0, -3.4, 11.5, 5.6, 'rgba(0,0,0,.08)', null);
    ell(c, 0, -4.4, 11, 5, col); ell(c, 0, -4.4, 9.4, 3.8, null, shade(col, -18), 0.6);
    c.save(); c.setLineDash([1, 1]); ell(c, 0, -4.4, 9.4, 3.8, null, 'rgba(255,255,255,.7)', 0.5); c.restore();
    ell(c, -3, -6, 3.4, 1.4, 'rgba(255,255,255,.35)', null); circ(c, 0, -4.4, 0.9, shade(col, -30), null);
    for (const x of [-11, 11]) circ(c, x, -4.4, 1, shade(col, -10), INK, 0.4);
  },
  cat_bed(c, t, p) {
    shadow(c, 0, 1, 13, 3.4, 0.16);
    ell(c, 0, -4, 12.5, 5.6, '#f08a78'); ell(c, 0, -5, 9, 3.4, '#fff5df', 'rgba(91,63,54,.4)', 0.6);
    c.strokeStyle = shade('#f08a78', -20); c.lineWidth = 0.5; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * 10, -4 + Math.sin(a) * 4.4); c.lineTo(Math.cos(a) * 12, -4 + Math.sin(a) * 5.2); c.stroke(); }
    circ(c, 7, -6, 1.6, '#ffd35a', INK, 0.4);
  },
  window(c, t, p) {
    const w = p.w || 40, h = p.h || 26, y = -p.hgt || -60;
    const n = LIGHT.night;
    const g2 = c.createLinearGradient(0, y, 0, y + h);
    if (n > 0.5) { g2.addColorStop(0, '#2d315f'); g2.addColorStop(1, '#4d4f8f'); } else if (n > 0.1) { g2.addColorStop(0, '#f08a6a'); g2.addColorStop(1, '#ffd49a'); } else { g2.addColorStop(0, '#8fd4ea'); g2.addColorStop(1, '#dff6fb'); }
    wood(c, -w / 2 - 3.5, y - 3.5, w + 7, h + 7, 3, '#fff8ea', 1);
    box(c, -w / 2, y, w, h, 2, g2, INK, 0.8);
    if (n < 0.3) { circ(c, w / 4, y + h / 3, 3.6, '#fff4c8', null); ell(c, -w / 5 + Math.sin(t * 0.1) * 3, y + h / 2, 7, 2.8, 'rgba(255,255,255,.9)', null); ell(c, -w / 5 + 4 + Math.sin(t * 0.1) * 3, y + h / 2 - 1.5, 4, 2.2, 'rgba(255,255,255,.9)', null); }
    else { for (let i = 0; i < 5; i++) circ(c, -w / 2 + 5 + i * 8, y + 4 + (i % 2) * 7, 0.7 + 0.3 * Math.sin(t * 3 + i), '#fff', null); circ(c, w / 3, y + 7, 3, '#fff4c8', null); circ(c, w / 3 + 1.4, y + 6, 2.6, g2 === null ? '#2d315f' : (n > 0.5 ? '#3a3e72' : '#f2a07a'), null); }
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(-w / 2 + 3, y + h); c.lineTo(-w / 2 + 9, y); c.lineTo(-w / 2 + 12, y); c.lineTo(-w / 2 + 6, y + h); c.fill();
    line(c, 0, y, 0, y + h, '#fff8ea', 2.4); line(c, -w / 2, y + h / 2, w / 2, y + h / 2, '#fff8ea', 2.4);
    wood(c, -w / 2 - 5, y + h + 2, w + 10, 4, 1.5, '#e9d8bf', 0.8);
    // a little potted plant on the sill
    poly(c, [w / 2 - 9, y + h + 2, w / 2 - 3, y + h + 2, w / 2 - 4, y + h - 3, w / 2 - 8, y + h - 3], '#d9784f', INK, 0.5); circ(c, w / 2 - 6, y + h - 5.5, 2.6, '#7fc062', INK, 0.5);
    if (p.curtain) {
      const sw = Math.sin(t * 1.2) * 0.8;
      for (const sd of [-1, 1]) { const x0 = sd * (w / 2 + 5), x1 = sd * (w / 2 - 7); c.beginPath(); c.moveTo(x0, y - 4); c.lineTo(x1, y - 4); c.quadraticCurveTo(x1 + sd * 2 + sw, y + h * 0.5, x1 + sd * 3, y + h + 2); c.lineTo(x0, y + h + 3); c.closePath(); c.fillStyle = p.curtain; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); c.strokeStyle = shade(p.curtain, -18); c.lineWidth = 0.5; c.beginPath(); c.moveTo((x0 + x1) / 2, y - 3); c.lineTo((x0 + x1) / 2 + sd, y + h + 2); c.stroke(); }
      box(c, -w / 2 - 7, y - 6, w + 14, 2.4, 1, '#b77a4f', INK, 0.6);
    }
  },
  shelfJars(c, t, p) {
    const w = p.w || 80;
    wood(c, -w / 2, -58, w, 58, 3, '#c98f5a');
    for (let r = 0; r < 2; r++) {
      box(c, -w / 2 + 3, -54 + r * 26, w - 6, 22, 1, '#8a5a36', null); c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(-w / 2 + 3, -54 + r * 26, w - 6, 2);
      const n = Math.floor((w - 10) / 14);
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + 7 + i * 14, cl = (p.cols || ['#e9a24a', '#5e3a28', '#f7a868', '#9fd67a', '#f4ead2'])[(i + r) % 5];
        box(c, x, -46 + r * 26, 11, 14, 3, 'rgba(255,255,255,.75)', INK, 0.7); box(c, x + 1, -41 + r * 26, 9, 8, 2, cl, null);
        c.fillStyle = 'rgba(255,255,255,.6)'; c.fillRect(x + 2, -44 + r * 26, 1.2, 9);
        box(c, x - 1, -49 + r * 26, 13, 3.4, 1, ['#f28f7c', '#9fd8c8', '#f7de8c'][(i + r) % 3], INK, 0.5);
        box(c, x + 2.5, -38 + r * 26, 6, 3.4, 0.6, '#fffaf0', 'rgba(91,63,54,.4)', 0.4);
      }
    }
  },
  produce(c, t, p) {
    const w = p.w || 80, cols = p.cols || ['#ffa53a', '#79b85c', '#ff9a7a', '#f7de8c', '#9fd67a', '#e8584e'];
    wood(c, -w / 2, -26, w, 26, 3, '#c98f5a');
    const n = Math.floor(w / 20);
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 4 + i * (w - 8) / n, ww = (w - 8) / n - 3, cl = cols[i % cols.length];
      wood(c, x, -30, ww, 10, 2, '#e3c08d', 0.8);
      for (let k = 0; k < 5; k++) { const fx = x + 3 + (k % 3) * (ww - 6) / 2, fy = -32 - (k > 2 ? 3 : 0); circ(c, fx, fy, 3.2, cl, INK, 0.6); circ(c, fx - 1, fy - 1.1, 0.9, 'rgba(255,255,255,.6)', null); }
      box(c, x + ww / 2 - 5, -22, 10, 5, 1, '#fffaf0', INK, 0.5); line(c, x + ww / 2 - 3, -19.5, x + ww / 2 + 3, -19.5, '#e8584e', 0.8);
    }
  },
});
F.pass = (c, t, p) => counterBox2(c, p.w || 60, 30, 10, p.col || '#e9d8bf', p.top || '#fffdf6');

// ---------------------------------------------------------------- v3.7 pieces + salon fixtures
Object.assign(F, {
  armchair(c, t, p) {
    const col = p.col || '#8fb7e0';
    shadow(c, 0, 1, 16, 4, 0.18);
    for (const x of [-11, 11]) limb(c, [x, -4, x, 0], 1.8, '#8a5f3e');
    fabric(c, -14, -30, 28, 20, 8, col); stitch(c, -11, -27, 22, 13, shade(col, -25));
    fabric(c, -14, -14, 28, 10, 4, shade(col, 8));
    for (const x of [-17, 11]) fabric(c, x, -22, 6, 17, 3, shade(col, -10));
    box(c, -8, -13, 16, 5, 2, '#fffaf0', INK, 0.6);
  },
  bean_bag(c, t, p) {
    const col = p.col || '#f7a868', sq = Math.sin(t * 1.5) * 0.3;
    shadow(c, 0, 1, 15, 4, 0.18);
    c.beginPath(); c.moveTo(-15, -2); c.quadraticCurveTo(-17, -20 + sq, -4, -22); c.quadraticCurveTo(10, -24, 14, -12); c.quadraticCurveTo(17, -3, 12, 0); c.quadraticCurveTo(0, 2, -15, -2);
    c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.moveTo(-10, -8); c.quadraticCurveTo(0, -12, 11, -8); c.strokeStyle = shade(col, -25); c.lineWidth = 0.8; c.stroke();
    ell(c, -6, -16, 4, 2.4, 'rgba(255,255,255,.3)', null);
  },
  rocking_chair(c, t, p) {
    const r = Math.sin(t * 1.3) * 0.06;
    shadow(c, 0, 1, 12, 3, 0.16);
    c.save(); c.rotate(r);
    c.beginPath(); c.moveTo(-13, -1); c.quadraticCurveTo(0, 3, 13, -1); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); c.strokeStyle = '#a8763f'; c.lineWidth = 1.6; c.stroke();
    for (const x of [-7, 7]) limb(c, [x, 0, x, -10], 1.5, '#8a5f3e');
    wood(c, -9, -13, 18, 4, 1.5, '#c98f5a', 0.8);
    for (const x of [-8, 8]) limb(c, [x, -12, x + (x < 0 ? -1 : 1), -30], 1.5, '#8a5f3e');
    for (let y = -28; y < -14; y += 4) line(c, -8, y, 8, y, '#a8763f', 1.2);
    box(c, -7, -22, 14, 9, 3, '#f4a9b8', INK, 0.6);
    c.restore();
  },
  dresser(c, t, p) {
    shadow(c, 0, 1, 20, 4, 0.18);
    wood(c, -19, -34, 38, 32, 3, '#d9a36a');
    for (let i = 0; i < 3; i++) { wood(c, -16, -31 + i * 10, 32, 8, 1.5, '#e8b87e', 0.7); circ(c, -6, -27 + i * 10, 1, '#8a5f3e', null); circ(c, 6, -27 + i * 10, 1, '#8a5f3e', null); }
    for (const x of [-16, 16]) limb(c, [x, -2, x, 0], 2, '#8a5f3e');
    // things on top: a little mirror and a jewelry box
    box(c, -12, -46, 11, 12, 5, '#e3b86a', INK, 0.8); box(c, -10, -44, 7, 8, 3, '#cfeaf5', null);
    box(c, 4, -39, 9, 5, 1.5, '#e56b8b', INK, 0.6);
  },
  record_player(c, t, p) {
    shadow(c, 0, 1, 12, 3, 0.16);
    wood(c, -11, -20, 22, 20, 2, '#b77a4f');
    for (const x of [-9, 9]) limb(c, [x, -1, x, 0], 1.4, '#5a3a24');
    box(c, -12, -26, 24, 7, 2, '#8a5f3e', INK, 0.8);
    ell(c, -1, -24.5, 8, 2.4, '#2f2a30', INK, 0.6); ell(c, -1, -24.5, 2.4, 0.8, '#e8584e', null);
    const a = Math.sin(t * 6) * 0.3; c.strokeStyle = '#fff'; c.globalAlpha = 0.5; c.lineWidth = 0.5; c.beginPath(); c.ellipse(-1, -24.5, 5, 1.5, a, 0.3, 1.4); c.stroke(); c.globalAlpha = 1;
    line(c, 9, -26, 4, -24, '#cfd6da', 1);
    // floating notes
    for (let i = 0; i < 2; i++) { const k = (t * 0.5 + i * 0.5) % 1; c.globalAlpha = 1 - k; text(c, '♪', 6 + i * 4, -32 - k * 14, 7, '#5b3f36', 900); } c.globalAlpha = 1;
  },
  vase_ceramic(c, t, p) {
    shadow(c, 0, 1, 7, 2, 0.16);
    c.beginPath(); c.moveTo(-3, -24); c.quadraticCurveTo(-9, -16, -6, -2); c.quadraticCurveTo(0, 1, 6, -2); c.quadraticCurveTo(9, -16, 3, -24); c.closePath();
    c.fillStyle = '#f4f7fb'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
    c.strokeStyle = '#4f7fc8'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-6, -12); c.quadraticCurveTo(0, -16, 6, -12); c.stroke(); circ(c, 0, -8, 1.8, null, '#4f7fc8', 0.8); c.beginPath(); c.moveTo(-5, -4); c.quadraticCurveTo(0, -1, 5, -4); c.stroke();
    // lotus stems
    for (const [x, h, col] of [[-3, 36, '#f4a9b8'], [2, 40, '#fff'], [4, 32, '#f4a9b8']]) { line(c, x * 0.3, -24, x, -h, '#6fae5c', 1); circ(c, x, -h, 2.6, col, INK, 0.6); }
    ell(c, -6, -30, 4, 2, '#7fc062', INK, 0.5);
  },
  hanging_plant(c, t, p) {
    const sw = Math.sin(t * 1.1 + (p.x || 0)) * 1.2;
    line(c, 0, -74, sw * 0.5, -60, '#a8763f', 0.8); line(c, -4, -60 + 0.2, 0, -74, '#a8763f', 0.6); line(c, 4, -60, 0, -74, '#a8763f', 0.6);
    c.save(); c.translate(sw, 0);
    poly(c, [-6, -60, 6, -60, 4, -52, -4, -52], '#d9784f', INK, 0.7);
    for (let i = 0; i < 5; i++) { const x = -6 + i * 3; c.beginPath(); c.moveTo(x, -58); c.quadraticCurveTo(x + (i - 2) * 2, -50, x + (i - 2) * 1.5, -40 - (i % 2) * 4); c.strokeStyle = '#5f9e4c'; c.lineWidth = 1; c.stroke(); circ(c, x + (i - 2) * 1.5, -40 - (i % 2) * 4, 1.6, '#7fc062', INK, 0.4); circ(c, x + (i - 2) * 1.8, -48, 1.4, '#9fd67a', null); }
    for (let i = 0; i < 4; i++) circ(c, -5 + i * 3.4, -61, 2.6, '#7fc062', INK, 0.5);
    c.restore();
  },
  wall_mirror(c, t, p) {
    ell(c, 0, -56, 11, 13, '#e3b86a', INK, 1);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; circ(c, Math.cos(a) * 11.5, -56 + Math.sin(a) * 13.5, 1.6, '#f2c14e', INK, 0.4); }
    const gr = c.createLinearGradient(-8, -66, 8, -46); gr.addColorStop(0, '#e6f7ff'); gr.addColorStop(1, '#a9cfe6');
    ell(c, 0, -56, 8, 10, gr, 'rgba(91,63,54,.4)', 0.6);
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-4, -58); c.lineTo(1, -63); c.moveTo(-3, -52); c.lineTo(3, -58); c.stroke();
  },
  lamp_table(c, t, p) {
    shadow(c, 0, 1, 10, 3, 0.16);
    for (const x of [-7, 7]) limb(c, [x, -14, x, 0], 1.4, '#8a5f3e');
    wood(c, -10, -17, 20, 4, 1.5, '#c98f5a', 0.8); line(c, -7, -6, 7, -6, '#8a5f3e', 1);
    ell(c, -1, -18, 3.6, 1.2, '#9fd8c8', INK, 0.6); c.beginPath(); c.moveTo(-3, -18); c.quadraticCurveTo(-5, -24, -1, -26); c.quadraticCurveTo(3, -24, 1, -18); c.fillStyle = '#9fd8c8'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.6; c.stroke();
    poly(c, [-8, -26, 6, -26, 3, -35, -5, -35], '#fff1dc', INK, 0.8);
    box(c, 5, -20, 5, 3, 0.5, '#e8584e', INK, 0.4);
    g(p, -1, -30, 34, 'rgba(255,220,150,.55)');
  },
  bamboo_screen(c, t, p) {
    shadow(c, 0, 1, 24, 4, 0.16);
    for (let panel = 0; panel < 3; panel++) {
      const x = -24 + panel * 16, dy = panel === 1 ? 2 : 0;
      box(c, x, -50 + dy, 16, 50, 1, '#e9c98a', INK, 0.9);
      for (let i = 1; i < 4; i++) line(c, x + i * 4, -49 + dy, x + i * 4, -1 + dy, '#c9a25e', 0.7);
      for (const y of [-38, -20]) line(c, x + 1, y + dy, x + 15, y + dy, '#a8763f', 1.2);
      if (panel === 1) { circ(c, x + 8, -30, 4, '#f36d86', null); c.globalAlpha = 0.9; ell(c, x + 5, -24, 3, 1.2, '#6fae5c', null); c.globalAlpha = 1; }
    }
  },
  // ---- salon
  salonChair(c, t, p) {
    const col = p.col || '#e56b8b';
    shadow(c, 0, 1, 11, 3, 0.18);
    ell(c, 0, -1, 9, 2.6, '#9aa3ad', INK, 0.8); limb(c, [0, -2, 0, -9], 2.4, '#9aa3ad');
    fabric(c, -10, -16, 20, 7, 3, col);
    fabric(c, -9, -32, 18, 17, 5, col); stitch(c, -6, -29, 12, 11, shade(col, -25));
    for (const x of [-12, 8]) box(c, x, -20, 4, 3, 1, '#2f2a30', INK, 0.6);
    line(c, 0, -3, 6, -3, '#6b737c', 1.4);
  },
  salonStation(c, t, p) {
    shadow(c, 0, 1, 18, 3, 0.16);
    wood(c, -18, -20, 36, 12, 2, '#fffaf0');
    box(c, -14, -64, 28, 42, 6, '#f2c14e', INK, 1);
    const gr = c.createLinearGradient(-10, -60, 10, -26); gr.addColorStop(0, '#e6f7ff'); gr.addColorStop(1, '#a9cfe6');
    box(c, -11, -61, 22, 36, 4, gr, 'rgba(91,63,54,.4)', 0.6);
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6, -50); c.lineTo(0, -57); c.moveTo(-7, -42); c.lineTo(3, -52); c.stroke();
    for (let i = 0; i < 4; i++) circ(c, -12 + i * 8, -66, 1.6, '#fff4c8', INK, 0.4);
    // bottles, comb and scissors
    for (const [x, col] of [[-13, '#c9b6e8'], [-9, '#9fd8c8'], [12, '#f4a9b8']]) { box(c, x - 1.6, -26, 3.2, 6, 1, col, INK, 0.5); }
    box(c, 2, -22, 7, 1.6, 0.5, '#2f2a30', null);
  },
  hairWash(c, t, p) {
    shadow(c, 0, 1, 16, 4, 0.16);
    fabric(c, -16, -12, 26, 10, 3, '#3f4a5e');
    box(c, 8, -24, 10, 22, 3, '#fffaf0', INK, 0.9);
    ell(c, 13, -24, 8, 3.4, '#fffaf0', INK, 0.9); ell(c, 13, -24, 5.5, 2, '#bfe3ef', null);
    limb(c, [15, -30, 15, -26], 1.2, '#b9c3cb'); line(c, 15, -30, 11, -30, '#b9c3cb', 1.2);
    const k = (t * 1.5) % 1; circ(c, 13 + Math.sin(t * 3) * 2, -30 - k * 8, 1.2 * (1 - k) + 0.3, 'rgba(255,255,255,.9)', 'rgba(111,159,200,.6)', 0.4);
  },
  hoodDryer(c, t, p) {
    shadow(c, 0, 1, 12, 3, 0.16);
    ell(c, 0, -1, 8, 2.4, '#9aa3ad', INK, 0.8); limb(c, [0, -2, 0, -34], 1.8, '#9aa3ad');
    c.beginPath(); c.moveTo(-9, -36); c.quadraticCurveTo(-11, -52, 0, -54); c.quadraticCurveTo(11, -52, 9, -36); c.quadraticCurveTo(0, -32, -9, -36);
    c.fillStyle = '#c9b6e8'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    ell(c, 0, -36, 8, 2.4, '#8f7fb0', INK, 0.6); ell(c, -3, -47, 3, 2, 'rgba(255,255,255,.4)', null);
    circ(c, 7, -44, 1.2, Math.sin(t * 4) > 0 ? '#9fd67a' : '#6f9f5a', null);
  },
  productShelf(c, t, p) {
    const w = p.w || 50;
    wood(c, -w / 2, -52, w, 50, 2, '#fffaf0');
    for (let r = 0; r < 3; r++) {
      line(c, -w / 2 + 2, -36 + r * 15, w / 2 - 2, -36 + r * 15, '#c9a25e', 1.4);
      const n = Math.floor((w - 6) / 7);
      for (let i = 0; i < n; i++) { const x = -w / 2 + 5 + i * 7, col = ['#f4a9b8', '#9fd8c8', '#c9b6e8', '#f7de8c', '#8fb7e0'][(i + r) % 5], hh = 7 + ((i * 3 + r) % 3) * 1.5; box(c, x - 2.2, -37 + r * 15 - hh, 4.4, hh, 1.2, col, INK, 0.5); box(c, x - 1, -39 + r * 15 - hh, 2, 2, 0.5, '#fffaf0', INK, 0.3); }
    }
  },
  barberPole(c, t, p) {
    box(c, -3.5, -62, 7, 28, 3, '#fff', INK, 0.8);
    c.save(); c.beginPath(); c.rect(-3, -61, 6, 26); c.clip(); const off = (t * 10) % 8;
    for (let y = -70; y < -30; y += 8) { line(c, -4, y + off, 4, y + off - 5, '#e8584e', 2); line(c, -4, y + 4 + off, 4, y + off - 1, '#6f9fc8', 2); }
    c.restore(); circ(c, 0, -63, 3, '#f2c14e', INK, 0.7); circ(c, 0, -33, 2.6, '#f2c14e', INK, 0.7);
  },
});
Object.assign(F, {
  // Mèo Mây's recipe desk: a big recipe book lying open, a pen, a cup of tea
  recipeDesk(c, t, p) {
    const w = p.w || 48;
    shadow(c, 0, 1, w / 2 + 2, 4, 0.18);
    for (const x of [-w / 2 + 3, w / 2 - 3]) limb(c, [x, -14, x, 0], 2, '#8a5f3e');
    wood(c, -w / 2, -18, w, 6, 2, '#c98f5a', 0.9);
    // the open book (two pages with a spine and a ribbon)
    const bw = 34, by = -26;
    c.save(); c.translate(-3, 0);
    box(c, -bw / 2 - 2, by + 2, bw + 4, 8, 2, '#8a4a3a', INK, 0.8);                 // cover under the pages
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(0, by + 6); c.quadraticCurveTo(sd * bw * 0.25, by + 1, sd * bw / 2, by + 3); c.lineTo(sd * bw / 2, by + 9); c.quadraticCurveTo(sd * bw * 0.25, by + 7, 0, by + 10); c.closePath(); c.fillStyle = '#fffaf0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); }
    line(c, 0, by + 6, 0, by + 10, 'rgba(91,63,54,.5)', 0.8);
    // a little dish sketch and lines of writing
    circ(c, -9, by + 5.6, 2.2, '#f2c46b', 'rgba(91,63,54,.6)', 0.4); line(c, -5, by + 4.8, -2, by + 5, 'rgba(91,63,54,.45)', 0.5); line(c, -5, by + 6.4, -2, by + 6.8, 'rgba(91,63,54,.45)', 0.5);
    for (let i = 0; i < 3; i++) line(c, 3, by + 4.4 + i * 1.6, 14, by + 4 + i * 1.6, 'rgba(91,63,54,.45)', 0.5);
    poly(c, [1, by + 9, 3, by + 9, 3, by + 14, 2, by + 12.8, 1, by + 14], '#e8584e', null);       // ribbon bookmark
    // pages turning gently
    const k = (Math.sin(t * 0.7) + 1) / 2; if (k > 0.8) { c.globalAlpha = (k - 0.8) * 5; c.beginPath(); c.moveTo(0, by + 6); c.quadraticCurveTo(6, by - 4, 12, by + 2); c.lineTo(12, by + 7); c.quadraticCurveTo(6, by + 1, 0, by + 10); c.fillStyle = '#fffdf8'; c.fill(); c.stroke(); c.globalAlpha = 1; }
    c.restore();
    // pen and tea
    line(c, 16, -21, 22, -25, '#3d3550', 1.4); circ(c, 22, -25, 0.8, '#f2c14e', null);
    box(c, -w / 2 + 2, -24, 6, 6, 1.5, '#fffaf0', INK, 0.6); ell(c, -w / 2 + 5, -24, 3, 1, '#c9955e', null);
    for (let i = 0; i < 2; i++) { const kk = (t * 0.6 + i / 2) % 1; c.globalAlpha = 0.5 * (1 - kk); circ(c, -w / 2 + 5 + Math.sin(kk * 6) * 1.5, -28 - kk * 8, 1.2 + kk, '#fff', null); } c.globalAlpha = 1;
  },
});
Object.assign(FURN_DRAW, {
  armchair: (c, t, p) => F.armchair(c, t, p),
  bean_bag: (c, t, p) => F.bean_bag(c, t, p),
  rocking_chair: (c, t, p) => F.rocking_chair(c, t, p),
  dresser: (c, t, p) => F.dresser(c, t, p),
  record_player: (c, t, p) => F.record_player(c, t, p),
  vase_ceramic: (c, t, p) => F.vase_ceramic(c, t, p),
  hanging_plant: (c, t, p) => { c.save(); c.translate(0, p.preview ? 60 : 0); F.hanging_plant(c, t, p); c.restore(); },
  wall_mirror: (c, t, p) => { c.save(); c.translate(0, p.preview ? 46 : 0); F.wall_mirror(c, t, p); c.restore(); },
  lamp_table: (c, t, p) => F.lamp_table(c, t, p),
  bamboo_screen: (c, t, p) => F.bamboo_screen(c, t, p),
});

// ---------------------------------------------------------------- side views
// Furniture turned 90°: each piece is described as a few boxes and drawn from
// the side (its front facing right; turned left is the mirror image). Axes:
// x = the piece's depth (back −, front +), h = height, z = along its width,
// running away from you (up the screen). Round pieces (plants, lamps, vases,
// bean bags, cat beds) look the same from every side and have no model.
const WOODC = '#b77a4f';
const B = (x0, x1, h0, h1, z0, z1, col, o = {}) => ({ x0, x1, h0, h1, z0, z1, col, ...o });
const legs = (d, L, hgt, col, inset = 2) => [B(-d / 2 + inset, -d / 2 + inset + 2.4, 0, hgt, inset, inset + 2.4, col), B(d / 2 - inset - 2.4, d / 2 - inset, 0, hgt, inset, inset + 2.4, col), B(-d / 2 + inset, -d / 2 + inset + 2.4, 0, hgt, L - inset - 2.4, L - inset, col), B(d / 2 - inset - 2.4, d / 2 - inset, 0, hgt, L - inset - 2.4, L - inset, col)];
export const SIDE = {
  table_low: () => [...legs(20, 34, 11, shade(WOODC, -20)), B(-10, 10, 11, 17, 0, 34, WOODC, { grain: 1 })],
  chair_wood: () => [...legs(12, 14, 8, shade('#c88a52', -22), 1), B(-6, 6, 8, 11.5, 0, 14, '#c88a52'), B(-6, -3.6, 11.5, 26, 0, 14, shade('#c88a52', -10))],
  sofa: () => [B(-11, 11, 0, 9, 0, 54, '#c9955e', { weave: 1 }), B(-11, -5, 9, 25, 0, 54, '#c9955e', { weave: 1 }), B(-5, 11, 9, 13, 4, 50, '#f7d6c0', { cushion: 3 }), B(-11, 11, 9, 18, 0, 4, '#b98450'), B(-11, 11, 9, 18, 50, 54, '#b98450')],
  armchair: () => [B(-7, 7, 0, 9, 0, 30, '#e8a88f'), B(-7, -3, 9, 23, 0, 30, '#d98f76'), B(-3, 7, 9, 12, 5, 25, '#f7d6c0', { cushion: 1 }), B(-7, 7, 9, 16, 0, 5, '#d98f76'), B(-7, 7, 9, 16, 25, 30, '#d98f76')],
  rocking_chair: () => [B(-8, 8, 0, 2, 2, 4, '#8a5f3e', { rocker: 1 }), B(-8, 8, 0, 2, 22, 24, '#8a5f3e', { rocker: 1 }), B(-6, 6, 9, 12, 2, 24, '#c98f5a'), B(-6, -3.6, 12, 30, 2, 24, shade('#c98f5a', -8)), ...legs(12, 26, 9, '#a8763f', 2).map(b => ({ ...b, h0: 2 }))],
  bookshelf: () => [B(-7, 7, 0, 42, 0, 36, '#b77a4f', { grain: 1 }), B(-7, 7, 42, 44, -1, 37, '#a26a42')],
  dresser: () => [B(-7, 7, 0, 26, 0, 38, '#d9a066', { grain: 1 }), B(-7.5, 7.5, 26, 28, -1, 39, '#c98f5a'), B(-3, 3, 28, 36, 26, 32, '#9fd8c8')],
  fishtank: () => [B(-8, 8, 0, 12, 0, 34, '#8a5f3e'), B(-8, 8, 12, 30, 1, 33, 'rgba(160,220,240,.7)', { water: 1 })],
  aquarium_big: () => [B(-13, 13, 0, 10, 0, 46, '#b9b2a6', { stone: 1 }), B(-10, 10, 10, 10.4, 3, 43, '#6fbfd0', { water: 1 })],
  tv: () => [B(-8, 8, 0, 10, 0, 30, '#8a5f3e'), B(-8, 4, 10, 26, 5, 25, '#6b5a50'), B(4, 6, 12, 24, 7, 23, '#3d3a42')],
  radio: () => [B(-6, 6, 0, 10, 0, 18, '#e8584e'), B(-1, 1, 10, 13, 2, 16, '#5a4a48')],
  record_player: () => [...legs(12, 24, 12, '#8a5f3e', 1), B(-6, 6, 12, 16, 0, 24, '#c98f5a'), B(-4, 4, 16, 17, 4, 16, '#2f2a30'), B(-1, 1, 17, 30, 14, 18, '#f2c14e')],
  lamp_table: () => [...legs(12, 20, 12, '#8a5f3e', 1), B(-6, 6, 12, 15, 0, 20, '#c98f5a'), B(-1, 1, 15, 24, 9, 11, '#5a4a48'), B(-5, 5, 24, 32, 6, 14, '#f7de8c', { glow: 1 })],
  piano: () => [B(-9, 9, 0, 28, 0, 46, '#3d3440'), B(9, 14, 14, 17, 2, 44, '#f5f0e6'), B(-9.5, 9.5, 28, 30, -1, 47, '#2f2a30')],
  hammock: () => [B(-2, 2, 0, 34, 0, 3, '#8a5f3e'), B(-2, 2, 0, 34, 57, 60, '#8a5f3e'), B(-6, 6, 12, 15, 6, 54, '#f28f7c', { sag: 1 })],
  bamboo_screen: () => [B(-2, 2, 0, 40, 0, 48, '#d9b27a', { slats: 1 })],
  fan: () => [B(-5, 5, 0, 2, 3, 11, '#6b737c'), B(-1, 1, 2, 22, 6, 8, '#8f9aa3'), B(-3, 1, 20, 32, 1, 13, '#cfe8f2', { cage: 1 })],
  // the built-ins
  bed: () => [B(-25, 25, 0, 8, 0, 60, '#b77a4f', { grain: 1 }), B(-24, 24, 8, 14, 1, 59, '#fffaf0'), B(-8, 24, 14, 16, 2, 58, '#f4a9b8', { cushion: 2 }), B(-22, -10, 14, 18, 8, 52, '#fff'), B(-28, -24, 0, 30, -1, 61, '#a26a42', { grain: 1 })],
  wardrobe: () => [B(-5, 5, 0, 62, 0, 48, '#c98f5a', { grain: 1 }), B(-6, 6, 62, 66, -1, 49, '#b77a4f')],
  wardrobeBig: () => SIDE.wardrobe(),
  kitchen: () => [B(-16, 16, 0, 30, 0, 70, '#9fd8c8'), B(-17, 17, 30, 33, -1, 71, '#fff8ea'), B(-10, 2, 33, 34, 6, 30, '#b9c3cb'), B(-8, -2, 34, 40, 10, 18, '#f28f7c')],
};
// draw a box model: far boxes first, then lower before higher
export function drawSide(c, key, t) { const m = SIDE[key]?.(); return m ? drawModel(c, m, t) : false; }
// seen from behind: the same boxes, looking along the piece's depth (its back is nearest you,
// its width runs across the screen)
export function drawBack(c, key, t) {
  const m = SIDE[key]?.(); if (!m) return false;
  const W = Math.max(...m.map(b => b.z1)), X0 = Math.min(...m.map(b => b.x0));
  return drawModel(c, m.map(b => ({ ...b, x0: b.z0 - W / 2, x1: b.z1 - W / 2, z0: b.x0 - X0, z1: b.x1 - X0 })), t);
}
function drawModel(c, m, t) {
  const K = 0.62;                                     // depth foreshortening (z runs up the screen)
  const L = Math.max(...m.map(b => b.z1));
  shadow(c, 0, 1 - L * K * 0.5, Math.max(...m.map(b => b.x1)) + 4, L * K * 0.5 + 3, 0.16);
  m.sort((a, b) => (b.z0 + b.z1) / 2 - (a.z0 + a.z1) / 2 || a.h1 - b.h1);
  for (const b of m) {
    const w = b.x1 - b.x0, ys = -b.h1 - b.z0 * K, yt = -b.h1 - b.z1 * K, top = shade(b.col, 12), side = b.col;
    // top face
    box(c, b.x0, yt, w, b.z1 * K - b.z0 * K, Math.min(2, w / 3), top, INK, 0.8);
    // south face (the end nearest you)
    box(c, b.x0, ys, w, b.h1 - b.h0, Math.min(2, w / 3), side, INK, 0.9);
    if (b.grain) { c.strokeStyle = shade(side, -18); c.lineWidth = 0.5; for (let y = ys + 3; y < ys + b.h1 - b.h0 - 1; y += 4) { c.beginPath(); c.moveTo(b.x0 + 1.5, y); c.lineTo(b.x1 - 1.5, y + 0.4); c.stroke(); } }
    if (b.weave) { c.strokeStyle = shade(side, -22); c.lineWidth = 0.5; for (let x = b.x0 + 2; x < b.x1 - 1; x += 3) { c.beginPath(); c.moveTo(x, ys + 1); c.lineTo(x, ys + b.h1 - b.h0 - 1); c.stroke(); } }
    if (b.cushion) { c.strokeStyle = shade(top, -18); c.lineWidth = 0.7; const n = b.cushion + 1; for (let k = 1; k < n; k++) { const y = yt + (b.z1 - b.z0) * K * k / n; c.beginPath(); c.moveTo(b.x0 + 1, y); c.lineTo(b.x1 - 1, y); c.stroke(); } }
    if (b.water) { c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(b.x0 + 1, yt + 1.5, w - 2, 1.2); ell(c, b.x0 + w * 0.6, (yt + ys) / 2 + 2, 2, 1, '#f28f7c', null); }
    if (b.slats) { c.strokeStyle = shade(top, -20); c.lineWidth = 0.6; for (let k = 1; k < 8; k++) { const y = yt + (b.z1 - b.z0) * K * k / 8; c.beginPath(); c.moveTo(b.x0, y); c.lineTo(b.x1, y); c.stroke(); } }
    if (b.cage) { c.strokeStyle = 'rgba(91,63,54,.5)'; c.lineWidth = 0.5; for (let k = 1; k < 4; k++) { const y = yt + (b.z1 - b.z0) * K * k / 4; c.beginPath(); c.moveTo(b.x0, y); c.lineTo(b.x1, y); c.stroke(); } }
  }
  return true;
}

// ---------------------------------------------------------------- the florist (Cô Lan)
const PETALS = ['#ff8fb0', '#ffd35a', '#fff', '#e97ad0', '#f36d86', '#c9b6e8', '#ffa53a', '#ff5a5a'];
function bunch(c, x, y, n, r, seed, t = 0, spread = 7) {
  // a bunch of cut flowers with stems and a few leaves
  for (let i = 0; i < n; i++) {
    const a = (i / Math.max(1, n - 1) - 0.5) * 1.2, fx = x + Math.sin(a) * spread, fy = y - 8 - Math.cos(a) * 4 - (i % 2) * 2.4 + Math.sin(t * 1.4 + i + seed) * 0.3;
    line(c, x + Math.sin(a) * 1.5, y, fx, fy, '#5f9f45', 0.8);
    if (i % 2) ell(c, (x + fx) / 2 + 1.5, (y + fy) / 2, 2, 0.9, '#6fb356', null, 0, a);
    flower(c, fx, fy, r, PETALS[(i * 3 + seed) % PETALS.length], (i + seed) % 5 === 0 ? 2 : (i + seed) % 4 === 0 ? 1 : 0);
  }
}
Object.assign(F, {
  // tiered stand of metal buckets full of cut flowers
  flowerBuckets(c, t, p) {
    const w = p.w || 52;
    shadow(c, 0, 1, w / 2 + 2, 4, 0.18);
    for (const x of [-w / 2 + 2, w / 2 - 4]) box(c, x, -26, 2.5, 26, 0.6, '#8a5f3e', INK, 0.5);
    box(c, -w / 2 + 4, -26, w - 8, 3, 1, '#a8763f', INK, 0.7);          // top shelf (set back)
    box(c, -w / 2, -12, w, 3, 1, '#a8763f', INK, 0.7);                  // bottom shelf
    const cols = ['#b9c3cb', '#8fb7e0', '#f4a9b8', '#b9c3cb'];
    const n1 = Math.max(2, Math.floor((w - 8) / 13));
    for (let i = 0; i < n1; i++) { const x = -w / 2 + 10 + i * ((w - 20) / Math.max(1, n1 - 1)); poly(c, [x - 4.5, -26, x + 4.5, -26, x + 3.6, -33, x - 3.6, -33], cols[i % 4], INK, 0.6); bunch(c, x, -32, 5, 2.1, i * 2 + 1, t, 5); }
    const n2 = Math.max(2, Math.floor(w / 12));
    for (let i = 0; i < n2; i++) { const x = -w / 2 + 6 + i * ((w - 12) / Math.max(1, n2 - 1)); poly(c, [x - 5, -12, x + 5, -12, x + 4, -20, x - 4, -20], cols[(i + 1) % 4], INK, 0.6); bunch(c, x, -19, 5, 2.3, i * 3, t, 5.5); }
    // price tags
    for (let i = 0; i < n2; i++) { const x = -w / 2 + 6 + i * ((w - 12) / Math.max(1, n2 - 1)); box(c, x - 2.5, -10.5, 5, 2.6, 0.5, '#fff', INK, 0.3); }
  },
  // a tall glass flower cooler (tủ mát hoa) with bouquets on three shelves
  flowerCooler(c, t, p) {
    shadow(c, 0, 1, 20, 4, 0.18);
    box(c, -19, -64, 38, 64, 3, '#e9eef2', INK, 1.1);
    box(c, -16, -60, 32, 52, 2, 'rgba(190,230,245,.55)', INK, 0.8);
    for (const y of [-44, -28]) line(c, -16, y, 16, y, '#b9c3cb', 1);
    for (const [y, s] of [[-45, 1], [-29, 2], [-9, 3]]) for (let i = 0; i < 3; i++) { const x = -10 + i * 10; box(c, x - 3, y - 4, 6, 4, 1, '#fff', INK, 0.4); bunch(c, x, y - 4, 4, 1.9, s * 3 + i, t, 3.5); }
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(-14, -58); c.lineTo(-8, -58); c.lineTo(-14, -40); c.closePath(); c.fill();
    box(c, 12, -40, 2, 10, 1, '#8f9aa3', INK, 0.5);
    box(c, -12, -69, 24, 6, 2, '#f28fb0', INK, 0.8); stext(c, T('FRESH', 'HOA TƯƠI'), 0, -66, 3.6, '#fff', 900);
  },
  // the shop counter: wrapping paper roll, ribbons, a bouquet being tied and a till
  flowerCounter(c, t, p) {
    const w = p.w || 60;
    shadow(c, 0, 1, w / 2 + 2, 5, 0.18);
    box(c, -w / 2, -24, w, 24, 3, '#f7e3ec', INK, 1);
    for (let x = -w / 2 + 6; x < w / 2 - 4; x += 8) line(c, x, -20, x, -3, 'rgba(200,140,160,.35)', 1);
    box(c, -w / 2 - 2, -28, w + 4, 5, 2, '#e3b77f', INK, 0.9);
    // roll of kraft paper and its stand
    box(c, -w / 2 + 2, -34, 14, 6, 3, '#d9b27a', INK, 0.7); line(c, -w / 2 + 3, -31, -w / 2 + 15, -31, '#b9905a', 0.5);
    // ribbon spools
    for (let i = 0; i < 3; i++) { circ(c, -w / 2 + 22 + i * 5, -31, 2.4, ['#f36d86', '#ffd35a', '#9fd8c8'][i], INK, 0.5); circ(c, -w / 2 + 22 + i * 5, -31, 0.8, '#fff', null); }
    // a bouquet wrapped in paper, lying on the counter
    c.save(); c.translate(6, -29); c.rotate(-0.25); poly(c, [-2, 0, 2, 0, 9, -9, -9, -9], '#fff5df', INK, 0.6); bunch(c, 0, -7, 6, 2.2, 5, t, 6); c.restore();
    // till with a little screen
    box(c, w / 2 - 14, -38, 11, 10, 2, '#fff', INK, 0.8); box(c, w / 2 - 12.5, -36.6, 8, 3.4, 0.6, '#9fd8c8', INK, 0.4);
    stext(c, T('Thank you!', 'Cảm ơn!'), 0, -13, 3.4, '#e56b8b', 900);
  },
  // dried bouquets hanging upside down from a wooden rail on the wall
  hangingBouquets(c, t, p) {
    const w = p.w || 70;
    box(c, -w / 2, -58, w, 3, 1.5, '#a8763f', INK, 0.7);
    for (let i = 0; i < 6; i++) {
      const x = -w / 2 + 6 + i * (w - 12) / 5, sw = Math.sin(t * 1.2 + i) * 0.04;
      c.save(); c.translate(x, -55); c.rotate(sw);
      line(c, 0, 0, 0, 5, '#8a5f3e', 0.6); box(c, -1.4, 4, 2.8, 2, 0.5, ['#f36d86', '#9fd8c8', '#ffd35a'][i % 3], null);
      c.scale(1, -1); bunch(c, 0, -6, 4, 1.8, i * 2, 0, 3.5); c.restore();
    }
  },
  // a price board on an easel
  priceBoard(c, t, p) {
    shadow(c, 0, 1, 8, 2, 0.14);
    line(c, -6, 0, -3, -26, '#8a5f3e', 1.4); line(c, 6, 0, 3, -26, '#8a5f3e', 1.4);
    box(c, -9, -30, 18, 20, 2, '#3e4a45', INK, 1);
    stext(c, T('BOUQUETS', 'BÓ HOA'), 0, -26, 3.2, '#fff', 900);
    stext(c, '50k', 0, -21, 3.4, '#ffd35a', 900); flower(c, -4.5, -15, 1.6, '#ff8fb0'); flower(c, 0, -15, 1.6, '#fff', 1); flower(c, 4.5, -15, 1.6, '#ffd35a');
  },
});

// ---------------------------------------------------------------- collector's pieces (luxury)
Object.assign(FURN_DRAW, {
  meo_plush: (c, t, p) => { shadow(c, 0, 1, 10, 3, 0.16); ell(c, 0, -8, 9, 8, '#fffaf0', INK, 1); circ(c, 0, -20, 8, '#fffaf0', INK, 1); poly(c, [-7, -24, -5, -32, -1, -26], '#fffaf0', INK, 0.9); poly(c, [7, -24, 5, -32, 1, -26], '#fffaf0', INK, 0.9); ell(c, 3, -23, 4, 3, '#9fb4dc', null); circ(c, -3, -20, 1, INK, null); circ(c, 3, -20, 1, INK, null); ell(c, 0, -17, 1.4, 0.9, '#f08ca0', null); line(c, 0, -14, 0, -10, '#e8584e', 1.4); circ(c, 0, -10, 1.6, '#f2c14e', INK, 0.5); },
  meo_statue: (c, t, p) => { shadow(c, 0, 1, 16, 4, 0.2); box(c, -14, -14, 28, 14, 2, '#d9cfc0', INK, 1); box(c, -16, -17, 32, 4, 1.5, '#e9e1d4', INK, 0.8); const gold = '#e9b949', k = (Math.sin(t * 2) + 1) / 2;
    ell(c, 0, -26, 10, 9, gold, INK, 1); circ(c, 0, -40, 9, gold, INK, 1); poly(c, [-8, -44, -6, -54, -1, -47], gold, INK, 0.9); poly(c, [8, -44, 6, -54, 1, -47], gold, INK, 0.9);
    c.strokeStyle = gold; c.lineWidth = 3; c.beginPath(); c.moveTo(9, -22); c.quadraticCurveTo(20, -30, 14, -40); c.stroke(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
    circ(c, -3, -40, 1, INK, null); circ(c, 3, -40, 1, INK, null); c.fillStyle = `rgba(255,255,255,${0.35 + k * 0.4})`; c.beginPath(); c.arc(-4, -44, 2, 0, TAU); c.fill(); },
  ship_model: (c, t, p) => { shadow(c, 0, 1, 16, 3, 0.16); box(c, -14, -8, 28, 8, 2, '#8a5f3e', INK, 0.9); line(c, -8, -8, -8, -14, '#5a4a48', 1.4); line(c, 8, -8, 8, -14, '#5a4a48', 1.4);
    poly(c, [-18, -18, 18, -18, 12, -12, -12, -12], '#c9674a', INK, 0.9); line(c, 0, -18, 0, -46, '#8a5f3e', 1.2); poly(c, [1, -44, 1, -22, 15, -22], '#fffaf0', INK, 0.8); poly(c, [-1, -40, -1, -24, -12, -24], '#fffaf0', INK, 0.8); poly(c, [0, -46, 7, -44, 0, -42], '#e8584e', null); },
  art_commission: (c, t, p) => { c.save(); c.translate(0, p.preview ? 50 : 0);
    box(c, -24, -70, 48, 32, 2, '#c99a4a', INK, 1); box(c, -21, -67, 42, 26, 1, '#aee4ed', null);
    ell(c, 0, -48, 16, 5, '#f2dca8', null); ell(c, -2, -51, 11, 5, '#8fcf6a', null); box(c, -6, -58, 5, 5, 1, '#f28f7c', INK, 0.5); box(c, 2, -57, 5, 4, 1, '#6fbfb0', INK, 0.5);
    for (let i = 0; i < 5; i++) circ(c, -16 + i * 8, -62 + (i % 2) * 2, 1.2, '#ffd35a', null); circ(c, 14, -63, 2.6, '#fff6b0', null);
    c.fillStyle = INK; c.font = '900 3px Nunito, sans-serif'; c.textAlign = 'right'; c.fillText('Vy', 19, -43); c.restore(); },
  lantern_wall: (c, t, p) => { c.save(); c.translate(0, p.preview ? 50 : 0); line(c, -24, -66, 24, -66, '#5b3f36', 0.8);
    ['#ea5a4f', '#f2c14e', '#f08ca0', '#6fbfb0', '#b39ddb', '#ffae3a'].forEach((col, i) => { const x = -20 + i * 8, y = -62 + (i % 2) * 3; line(c, x, -66, x, y - 5, INK, 0.5); ell(c, x, y, 3.2, 4, col, INK, 0.6); }); c.restore(); },
});

// ---------------------------------------------------------------- weekly board trophies
// A polished cup on a wooden plinth: twin handles, a star medallion, an engraved plate
// and a glint that sweeps across the bowl. Gold also glows softly at night.
const CUPS = { trophy_gold: ['#f2c14e', '#ffe48a', '#b8860b', '1'], trophy_silver: ['#c9d3dc', '#f4f8fb', '#7d8a96', '2'], trophy_bronze: ['#d38b52', '#f2b98a', '#8a4f26', '3'] };
function trophy(c, t, p, [col, hi, dk, num]) {
  shadow(c, 0, 1, 17, 4.5, 0.2);
  c.save(); c.scale(1.35, 1.35);
  // plinth with an engraved plate
  box(c, -11, -9, 22, 9, 2, '#7a4e33', INK, 1); grain(c, -10, -8, 20, 7, '#7a4e33', 2);
  box(c, -6, -7, 12, 4.5, 1, hi, dk, 0.5); stext(c, num === '1' ? '★ 1 ★' : '★ ' + num + ' ★', 0, -3.6, 2.6, dk, 900);
  box(c, -8, -12, 16, 3.5, 1.2, dk, INK, 0.8);
  // stem and knot
  poly(c, [-2.2, -12, 2.2, -12, 1.3, -19, -1.3, -19], col, INK, 0.8); ell(c, 0, -19.5, 3.2, 1.6, hi, INK, 0.7);
  // handles
  c.lineWidth = 2.6; c.strokeStyle = INK;
  for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 8, -33); c.bezierCurveTo(sx * 16, -34, sx * 15, -24, sx * 5, -23); c.stroke(); }
  c.lineWidth = 1.5; c.strokeStyle = col;
  for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 8, -33); c.bezierCurveTo(sx * 16, -34, sx * 15, -24, sx * 5, -23); c.stroke(); }
  // bowl
  c.beginPath(); c.moveTo(-10, -36); c.lineTo(10, -36); c.bezierCurveTo(10, -26, 6, -21, 0, -21); c.bezierCurveTo(-6, -21, -10, -26, -10, -36); c.closePath();
  c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  ell(c, 0, -36, 10, 2.2, dk, INK, 0.8); ell(c, 0, -36.3, 8, 1.3, shade(dk, -15), null);
  // star medallion
  const sp = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.6 : 3.6; sp.push(Math.cos(a) * r, -29 + Math.sin(a) * r); }
  poly(c, sp, hi, dk, 0.6);
  // moving glint, clipped to the bowl
  c.save(); c.beginPath(); c.moveTo(-10, -36); c.lineTo(10, -36); c.bezierCurveTo(10, -26, 6, -21, 0, -21); c.bezierCurveTo(-6, -21, -10, -26, -10, -36); c.clip();
  const gx = -16 + ((t * 0.45) % 1.6) * 24; c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(gx, -38); c.lineTo(gx + 3, -38); c.lineTo(gx - 3, -20); c.lineTo(gx - 6, -20); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-8, -34, 2, 8); c.restore();
  // sparkles
  const k = (Math.sin(t * 3) + 1) / 2;
  c.fillStyle = `rgba(255,255,255,${0.4 + k * 0.6})`;
  for (const [x, y, r] of [[-12, -38, 1.4 + k], [11, -27, 1 + (1 - k)]]) { c.beginPath(); c.moveTo(x, y - r * 2); c.lineTo(x + r * 0.5, y); c.lineTo(x, y + r * 2); c.lineTo(x - r * 0.5, y); c.closePath(); c.fill(); c.fillRect(x - r * 2, y - 0.3, r * 4, 0.6); }
  c.restore();
  if (num === '1') g(p, 0, -38, 26, 'rgba(255,214,90,.35)');
}
for (const [id, cols] of Object.entries(CUPS)) FURN_DRAW[id] = (c, t, p) => trophy(c, t, p, cols);

// the Grand Opening keepsake (31 October 2026): a bunch of balloons tied to a little weight
FURN_DRAW.opening_balloons = (c, t, p) => {
  shadow(c, 0, 1, 8, 2.5, 0.18);
  const cols = ['#f36d86', '#ffd35a', '#6fbfb0', '#c9a8ff', '#8fb7e0'];
  cols.forEach((col, i) => {
    const bx = (i - 2) * 6.5 + Math.sin(t * 1.4 + i) * 1.4, by = -46 - (i % 2) * 8 + Math.sin(t * 1.8 + i * 2) * 1.2;
    c.strokeStyle = 'rgba(91,63,54,.6)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(0, -5); c.quadraticCurveTo(bx * 0.3, -24, bx, by + 7); c.stroke();
    ell(c, bx, by, 5.6, 7, col, INK, 0.8); poly(c, [bx - 1.2, by + 7.4, bx + 1.2, by + 7.4, bx, by + 6.4], col, INK, 0.4); ell(c, bx - 2, by - 2.6, 1.3, 2, 'rgba(255,255,255,.55)', null);
  });
  box(c, -5, -6, 10, 6, 2, '#f2c14e', INK, 0.8); stext(c, '31·10', 0, -2.3, 2.6, INK, 900);
};

// ---------------------------------------------------------------- premium pass (5.12)
// The plain pieces redrawn with real craft, and a new line of cosy, collectable pieces.
// Each has a little life to it (a swaying tassel, a pendulum, steam, a bird, falling petals).
const gold = (c, x, y, w, h) => { const gr = c.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#fff1a8'); gr.addColorStop(0.45, '#f2c14e'); gr.addColorStop(1, '#c98a1e'); return gr; };
const sparkle = (c, x, y, r, a) => { c.save(); c.globalAlpha = a; c.fillStyle = '#fffbe0'; c.beginPath(); c.moveTo(x, y - r * 2); c.lineTo(x + r * 0.5, y); c.lineTo(x, y + r * 2); c.lineTo(x - r * 0.5, y); c.closePath(); c.fill(); c.fillRect(x - r * 2, y - 0.3, r * 4, 0.6); c.restore(); };
const onWall = (c, p, fn) => { c.save(); c.translate(0, p.preview ? 52 : 0); fn(); c.restore(); };
Object.assign(FURN_DRAW, {
  // an upright piano in warm walnut: sheet music, a candle, real black-key groups
  piano: (c, t, p) => {
    shadow(c, 0, 1, 25, 4, 0.2);
    wood(c, -23, -44, 46, 33, 3, '#6b4431'); box(c, -25, -47, 50, 5, 2, '#7d523c', INK, 1); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-21, -42, 2, 26);
    box(c, -8, -55, 16, 9, 1, '#fffaf0', INK, 0.7); for (let i = 0; i < 4; i++) line(c, -6, -53 + i * 2, 6, -53 + i * 2, 'rgba(91,63,54,.4)', 0.4); circ(c, -2, -51, 0.7, INK, null); line(c, -1.3, -51, -1.3, -54, INK, 0.4);
    box(c, 15, -51, 3, 5, 0.6, '#fffaf0', INK, 0.5); const fl = Math.sin(t * 9) * 0.4; poly(c, [16.5 - 1, -51.2, 16.5 + fl, -55, 16.5 + 1, -51.2], '#ffd35a', null); if (!p.preview) g(p, 16, -53, 16, 'rgba(255,210,130,.5)');
    box(c, -23, -15, 46, 6, 1, '#fffdf6', INK, 0.8); for (let x = -21; x < 23; x += 3.6) line(c, x, -15, x, -9, 'rgba(91,63,54,.35)', 0.4);
    for (let i = 0, x = -20; x < 21; i++, x += 3.6) if ([0, 1, 3, 4, 5].includes(i % 7)) box(c, x + 1.8, -15, 2, 3.6, 0.4, '#2f2a30', null);
    for (const x of [-20, 20]) { limb(c, [x, -9, x, 0], 2.4, '#5b3a2e'); circ(c, x, 0, 1.3, '#f2c14e', INK, 0.4); }
  },
  // Mèo Mây cast in gold on a marble plinth, with a name plate and a slow shine
  meo_statue: (c, t, p) => {
    shadow(c, 0, 1, 17, 4, 0.22);
    box(c, -15, -15, 30, 15, 2, '#efe8de', INK, 1); c.strokeStyle = 'rgba(150,140,130,.35)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(-12, -12); c.quadraticCurveTo(-4, -6, 2, -11); c.quadraticCurveTo(7, -14, 12, -5); c.stroke();
    box(c, -17, -18, 34, 4, 1.5, '#f7f2ea', INK, 0.8); box(c, -7, -10, 14, 5, 1, gold(c, -7, -10, 14, 5), INK, 0.5); stext(c, 'MÈO MÂY', 0, -7.3, 2.4, '#7a4e12', 900);
    const G2 = gold(c, -12, -54, 24, 36);
    ell(c, 0, -27, 11, 9.5, G2, INK, 1); circ(c, 0, -41, 9.5, G2, INK, 1);
    poly(c, [-8, -45, -6.5, -55, -1.5, -48], G2, INK, 0.9); poly(c, [8, -45, 6.5, -55, 1.5, -48], G2, INK, 0.9);
    c.strokeStyle = G2; c.lineWidth = 3; c.beginPath(); c.moveTo(9, -22); c.quadraticCurveTo(21, -30, 14, -42); c.stroke(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
    ell(c, 0, -33, 7, 2, '#e8a92e', INK, 0.6);                                                     // the scarf
    c.strokeStyle = INK; c.lineWidth = 0.8; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 3.2, -41, 1.3, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    ell(c, 0, -38.5, 1.2, 0.7, '#b8761a', null);
    c.save(); c.beginPath(); c.arc(0, -41, 9.5, 0, TAU); c.ellipse(0, -27, 11, 9.5, 0, 0, TAU); c.clip(); const gx = -16 + ((t * 0.3) % 1.6) * 22; c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(gx, -56); c.lineTo(gx + 4, -56); c.lineTo(gx - 6, -16); c.lineTo(gx - 10, -16); c.fill(); c.restore();
    const k = (Math.sin(t * 2) + 1) / 2; sparkle(c, -13, -48, 1.3, 0.4 + k * 0.6); sparkle(c, 14, -34, 1, 1 - k);
    g(p, 0, -32, 30, 'rgba(255,214,90,.35)');
  },
  // a plush round pet bed: scalloped rim, a cushion with a paw print and a toy mouse
  cat_bed: (c, t, p) => {
    shadow(c, 0, 1, 14, 3.5, 0.18);
    ell(c, 0, -5, 14, 6.5, '#f08a9a', INK, 1); for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; circ(c, Math.cos(a) * 12, -5 + Math.sin(a) * 5, 2.6, '#f6a3b1', INK, 0.5); }
    ell(c, 0, -5, 9.5, 4, '#fff4f6', INK, 0.7); circ(c, 0, -5.2, 1.3, '#f6a3b1', null); for (const [dx, dy] of [[-1.6, -1.8], [0, -2.3], [1.6, -1.8]]) circ(c, dx, -5.2 + dy, 0.6, '#f6a3b1', null);
    ell(c, 10, -2, 3, 1.8, '#b9b3ba', INK, 0.5); circ(c, 12.3, -3, 0.8, '#f6a3b1', null); c.strokeStyle = INK; c.lineWidth = 0.4; c.beginPath(); c.moveTo(7.2, -2); c.quadraticCurveTo(5, -1 + Math.sin(t * 3), 3.5, -2); c.stroke();
  },
  // a squashy bean bag with folds, a stitched panel and a little cushion
  bean_bag: (c, t, p) => {
    shadow(c, 0, 1, 16, 4, 0.18);
    c.beginPath(); c.moveTo(-15, -2); c.quadraticCurveTo(-18, -16, -6, -22); c.quadraticCurveTo(4, -26, 12, -18); c.quadraticCurveTo(18, -10, 15, -2); c.quadraticCurveTo(0, 2, -15, -2); c.closePath();
    c.fillStyle = '#f2a65a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.strokeStyle = 'rgba(160,90,40,.5)'; c.lineWidth = 0.6; for (const [a, b, d] of [[-8, -6, -14], [3, -5, -16], [9, -8, -13]]) { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo(a + 2, b - 4, a + d * 0.1, d); c.stroke(); }
    c.save(); c.setLineDash([1.2, 1]); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(-12, -6); c.quadraticCurveTo(0, -3, 12, -6); c.stroke(); c.restore();
    ell(c, -5, -17, 5, 2.5, 'rgba(255,255,255,.3)', null);
    box(c, 4, -14, 9, 7, 2.5, '#fff4e0', INK, 0.7); heart(c, 8.5, -10.6, 1.4, '#f28fa3', null);
  },
  // a retro wooden radio: cloth grille, glowing dial, antenna — notes when it's playing
  radio: (c, t, p) => {
    shadow(c, 0, 1, 11, 3, 0.16);
    c.beginPath(); c.moveTo(-11, 0); c.lineTo(-11, -12); c.quadraticCurveTo(-11, -17, 0, -17); c.quadraticCurveTo(11, -17, 11, -12); c.lineTo(11, 0); c.closePath(); c.fillStyle = '#9b6a45'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    box(c, -8.5, -12.5, 9, 10, 2, '#e9d8bf', INK, 0.6); c.strokeStyle = 'rgba(120,90,60,.45)'; c.lineWidth = 0.4; for (let x = -7.5; x < 0; x += 1.4) line(c, x, -12, x, -3, 'rgba(120,90,60,.4)', 0.4);
    box(c, 2, -12, 7, 4, 1, '#ffe7a0', INK, 0.5); line(c, 4 + Math.sin(t * 0.5) * 2, -12, 4 + Math.sin(t * 0.5) * 2, -8, '#e8584e', 0.5);
    for (const x of [3.5, 7.5]) circ(c, x, -4.5, 1.6, '#5b3f36', INK, 0.4);
    limb(c, [8, -16, 13, -26], 0.7, '#8a8f99'); circ(c, 13, -26, 0.9, '#e8584e', null);
    if (p.on !== false && Math.sin(t * 3) > -0.3) { c.fillStyle = '#7a5cc8'; c.font = '900 7px Nunito'; c.fillText('♪', 10 + Math.sin(t) * 3, -20 - (t * 8) % 8); }
    if (!p.preview) g(p, 5.5, -10, 10, 'rgba(255,220,140,.45)');
  },
  // a wall clock with a swinging pendulum in a little wooden case
  clock: (c, t, p) => onWall(c, p, () => {
    wood(c, -7, -70, 14, 30, 4, '#8a5a3a'); poly(c, [-9, -70, 0, -76, 9, -70], '#7a4e33', INK, 0.9);
    circ(c, 0, -63, 5.6, '#fff8ea', INK, 0.9); const m = LIGHT.minutes || 0;
    line(c, 0, -63, Math.sin(m / 720 * TAU) * 3, -63 - Math.cos(m / 720 * TAU) * 3, INK, 1); line(c, 0, -63, Math.sin(m / 60 * TAU) * 4.4, -63 - Math.cos(m / 60 * TAU) * 4.4, INK, 0.6);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; circ(c, Math.sin(a) * 4.6, -63 - Math.cos(a) * 4.6, 0.3, INK, null); }
    box(c, -4.5, -56, 9, 14, 1.5, '#5b3a2e', null); const sw = Math.sin(t * 3.1) * 0.35;
    c.save(); c.translate(0, -56); c.rotate(sw); line(c, 0, 0, 0, 10, '#f2c14e', 0.8); circ(c, 0, 11, 2, gold(c, -2, 9, 4, 4), INK, 0.5); c.restore();
  }),
  // a big silk lantern with a gold cap and a swaying tassel
  lantern_red: (c, t, p) => onWall(c, p, () => {
    const sw = Math.sin(t * 1.8 + (p.x || 0)) * 0.08;
    c.save(); c.translate(0, -76); c.rotate(sw);
    line(c, 0, 0, 0, 6, INK, 0.7); box(c, -4, 5, 8, 2.5, 1, gold(c, -4, 5, 8, 3), INK, 0.6);
    ell(c, 0, 16, 9, 9, '#e8453a', INK, 1); for (const dx of [-5, 0, 5]) { c.strokeStyle = 'rgba(120,20,20,.35)'; c.lineWidth = 0.6; c.beginPath(); c.ellipse(0, 16, Math.abs(dx) + 1, 9, 0, 0, TAU); c.stroke(); }
    stext(c, 'Phúc', 0, 17.5, 4, '#ffd35a', 900);
    box(c, -4, 24.5, 8, 2.5, 1, gold(c, -4, 24, 8, 3), INK, 0.6);
    const ts = Math.sin(t * 2.4) * 1.2; for (let i = -1; i <= 1; i++) line(c, i * 0.8, 27, i * 1.2 + ts, 35, '#f2c14e', 0.7);
    c.restore();
    if (!p.preview) g(p, 0, -60, 30, 'rgba(255,170,100,.55)');
  }),
  // Mèo Mây plush: stitched seams, button eyes, a scarf and a sewn-on tag
  meo_plush: (c, t, p) => {
    const sq = 1 + Math.sin(t * 1.2) * 0.015;
    shadow(c, 0, 1, 11, 3, 0.16); c.save(); c.scale(1, sq);
    ell(c, 0, -8, 9.5, 8, '#fffaf0', INK, 1); circ(c, 0, -20, 8.6, '#fffaf0', INK, 1);
    poly(c, [-7, -24, -5.5, -33, -1, -26], '#fffaf0', INK, 0.9); poly(c, [7, -24, 5.5, -33, 1, -26], '#fffaf0', INK, 0.9);
    poly(c, [-6.2, -25.5, -5.3, -31, -2.4, -26.5], '#ffc0d0', null); poly(c, [6.2, -25.5, 5.3, -31, 2.4, -26.5], '#ffc0d0', null);
    ell(c, 3.5, -23.5, 4, 2.6, '#a9bcdc', null); ell(c, -4, -7, 3, 2.2, '#a9bcdc', null);
    c.save(); c.setLineDash([0.9, 0.8]); c.strokeStyle = 'rgba(91,63,54,.45)'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(0, -28.5); c.lineTo(0, -12); c.stroke(); c.restore();
    for (const x of [-3, 3]) { circ(c, x, -20, 1.4, '#2f2a30', null); circ(c, x - 0.4, -20.5, 0.4, '#fff', null); }
    ell(c, 0, -17, 1.3, 0.8, '#f08ca0', null); circ(c, -5.5, -18, 1.2, 'rgba(255,150,170,.45)', null); circ(c, 5.5, -18, 1.2, 'rgba(255,150,170,.45)', null);
    ell(c, 0, -13.2, 6.5, 1.8, '#f08a78', INK, 0.6); poly(c, [3, -13, 6, -8, 3.5, -8.5], '#f08a78', INK, 0.5);
    box(c, 7, -6, 3.5, 4, 0.6, '#ffd35a', INK, 0.4);
    c.restore();
  },
  // ---- the new line
  neon_sign: (c, t, p) => onWall(c, p, () => {
    const on = !p.off, fl = on && Math.sin(t * 23) > 0.96 ? 0.5 : 1;
    box(c, -24, -78, 48, 22, 3, '#2f2a30', INK, 1); for (const x of [-21, 21]) circ(c, x, -75, 0.8, '#8a8f99', null);
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    const col = on ? '#ff6fae' : '#7a5a6a';
    if (on) { c.shadowColor = '#ff6fae'; c.shadowBlur = 6 * fl; }
    c.strokeStyle = col; c.lineWidth = 1.4; c.globalAlpha = fl;
    c.font = 'italic 900 9px "Segoe Script", "Brush Script MT", cursive'; c.textAlign = 'center'; c.strokeText('Bistro', 2, -64);
    heart(c, -16, -67, 2.2, null, col, 1.1); c.restore();
    if (on && !p.preview) g(p, 0, -67, 34, 'rgba(255,110,174,.55)');
  }),
  moon_lamp: (c, t, p) => {
    const on = !p.off;
    shadow(c, 0, 1, 8, 2.5, 0.16); box(c, -6, -5, 12, 5, 2, '#c9955e', INK, 0.8); line(c, 0, -5, 0, -9, '#8a5a3a', 1.4);
    circ(c, 0, -19, 10, on ? '#fff6d8' : '#e9e1d4', INK, 1);
    for (const [x, y, r] of [[-3, -22, 2.2], [4, -16, 1.6], [2, -24, 1], [-4, -14, 1.3]]) circ(c, x, y, r, on ? 'rgba(220,190,120,.45)' : 'rgba(150,140,130,.4)', null);
    c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.arc(-3, -23, 4, Math.PI, Math.PI * 1.6); c.lineTo(-3, -23); c.fill();
    if (on) { const k = (Math.sin(t * 1.5) + 1) / 2; c.globalAlpha = 0.25 + k * 0.15; circ(c, 0, -19, 14, '#fff3c0', null); c.globalAlpha = 1; if (!p.preview) g(p, 0, -19, 46, 'rgba(255,240,190,.6)'); }
  },
  mai_tree: (c, t, p) => {
    shadow(c, 0, 1, 15, 4, 0.18);
    c.beginPath(); c.moveTo(-12, -14); c.lineTo(12, -14); c.lineTo(9, 0); c.lineTo(-9, 0); c.closePath(); c.fillStyle = '#f5f8fb'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.strokeStyle = '#3f6fb5'; c.lineWidth = 0.6; c.beginPath(); for (let x = -9; x <= 9; x += 3) { c.moveTo(x, -11); c.quadraticCurveTo(x + 1.5, -9, x, -6); } c.stroke(); box(c, -13, -16, 26, 3, 1, '#3f6fb5', INK, 0.6);
    c.strokeStyle = '#6b4a36'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, -16); c.quadraticCurveTo(-2, -30, -8, -42); c.moveTo(-1, -26); c.quadraticCurveTo(6, -34, 10, -46); c.moveTo(-5, -36); c.lineTo(-14, -44); c.moveTo(4, -38); c.lineTo(0, -52); c.stroke();
    const R = rng(77); for (let i = 0; i < 26; i++) { const x = (R() - 0.5) * 30, y = -38 - R() * 18, sw = Math.sin(t * 1.4 + i) * 0.4; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; circ(c, x + sw + Math.cos(a) * 1.2, y + Math.sin(a) * 1.2, 0.9, '#ffd35a', null); } circ(c, x + sw, y, 0.5, '#e8892e', null); }
    for (let i = 0; i < 4; i++) { const k = ((t * 0.25 + i / 4) % 1), x = -12 + i * 8 + Math.sin(t + i) * 3, y = -40 + k * 40; c.globalAlpha = 1 - k; circ(c, x, y, 0.9, '#ffd35a', null); c.globalAlpha = 1; }
    box(c, -3, -30, 6, 4, 0.6, '#e8453a', INK, 0.4);                                                   // a red lì xì envelope hanging in the branches
  },
  arcade_cabinet: (c, t, p) => {
    shadow(c, 0, 1, 14, 4, 0.2);
    c.beginPath(); c.moveTo(-12, 0); c.lineTo(-12, -46); c.lineTo(-8, -54); c.lineTo(10, -54); c.lineTo(12, -46); c.lineTo(12, 0); c.closePath(); c.fillStyle = '#6f4cc8'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    box(c, -10, -53, 20, 6, 1, '#ffd35a', INK, 0.6); stext(c, 'ISLAND', 0, -49.6, 3.2, '#e8584e', 900);
    box(c, -9, -45, 18, 15, 1.5, '#1d2340', INK, 0.8);
    const k = Math.floor(t * 4) % 8; for (let i = 0; i < 5; i++) box(c, -7 + i * 3.2, -42 + ((i + k) % 4) * 2, 2, 1.2, 0.3, ['#ff6fae', '#6fe0ff', '#ffd35a', '#8fe07a', '#ff9f43'][i], null);
    circ(c, -3 + Math.sin(t * 3) * 4, -34, 1, '#ffd35a', null);
    box(c, -11, -29, 22, 6, 1, '#5a3cb0', INK, 0.8); circ(c, -5, -27, 1.6, '#e8584e', INK, 0.4); line(c, -5, -27, -5, -30, INK, 0.6); circ(c, 2, -26.5, 1.3, '#ffd35a', INK, 0.4); circ(c, 6, -26.5, 1.3, '#6fe0ff', INK, 0.4);
    for (const s of [-1, 1]) { c.fillStyle = s < 0 ? '#ff6fae' : '#6fe0ff'; c.fillRect(s * 11 - (s < 0 ? 0 : 1.2), -44, 1.2, 38); }
    if (!p.preview) g(p, 0, -38, 26, 'rgba(120,140,255,.45)');
  },
  tea_set: (c, t, p) => {
    shadow(c, 0, 1, 18, 4, 0.18); wood(c, -17, -10, 34, 5, 2, '#8a5a3a'); for (const x of [-14, 14]) limb(c, [x, -6, x, 0], 1.8, '#6b4431');
    ell(c, -3, -14, 7, 5, '#f5f8fb', INK, 0.9); c.strokeStyle = '#3f6fb5'; c.lineWidth = 0.6; c.beginPath(); c.arc(-3, -14, 3.5, 0.3, 2.8); c.stroke();
    poly(c, [3, -15, 9, -19, 8, -17.5, 4, -13], '#f5f8fb', INK, 0.7); c.strokeStyle = INK; c.lineWidth = 0.8; c.beginPath(); c.arc(-10.5, -14, 2.5, Math.PI * 0.5, Math.PI * 1.5); c.stroke();
    ell(c, -3, -18.6, 3, 1, '#f5f8fb', INK, 0.6); circ(c, -3, -20, 0.9, '#3f6fb5', INK, 0.4);
    for (const x of [10, 15]) { ell(c, x, -11.5, 2.2, 1.6, '#f5f8fb', INK, 0.6); ell(c, x, -12.6, 1.6, 0.5, '#c9883a', null); }
    for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i / 3) % 1; c.globalAlpha = 0.6 * (1 - k); c.strokeStyle = '#fff'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(9 + i * 0.5, -20 - k * 10); c.quadraticCurveTo(11 + Math.sin(k * 6) * 2, -24 - k * 10, 9, -28 - k * 10); c.stroke(); c.globalAlpha = 1; }
  },
  bird_cage: (c, t, p) => {
    shadow(c, 0, 1, 10, 3, 0.16); box(c, -10, -4, 20, 4, 1.5, '#c9955e', INK, 0.8);
    c.strokeStyle = '#a8763e'; c.lineWidth = 0.7; for (let i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(i * 2.2, -4); c.quadraticCurveTo(i * 2.2, -26, i * 0.8, -34); c.stroke(); }
    c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, -4); c.quadraticCurveTo(-10, -28, 0, -36); c.quadraticCurveTo(10, -28, 9, -4); c.stroke(); circ(c, 0, -37, 1.6, '#f2c14e', INK, 0.5);
    line(c, -6, -14, 6, -14, '#8a5a3a', 1);
    const hop = Math.abs(Math.sin(t * 2.2)) > 0.92 ? -2 : 0, f = Math.sin(t * 0.7) > 0 ? 1 : -1;
    c.save(); c.translate(0, -16 + hop); c.scale(f, 1); ell(c, 0, 0, 3.2, 2.6, '#ffd84a', INK, 0.6); circ(c, 2.2, -2.4, 1.9, '#ffd84a', INK, 0.6); circ(c, 2.8, -2.8, 0.45, INK, null); poly(c, [3.9, -2.4, 5.4, -2, 3.9, -1.6], '#f08a3a', null); poly(c, [-2.4, 0, -5, -1.2, -4.4, 1.2], '#f2b43a', INK, 0.4); c.restore();
    if (Math.sin(t * 1.3) > 0.6) { c.fillStyle = '#7a5cc8'; c.font = '900 6px Nunito'; c.fillText('♪', 8, -28 - ((t * 6) % 6)); }
  },
  telescope: (c, t, p) => {
    shadow(c, 0, 1, 12, 3, 0.16);
    for (const [x2, y2] of [[-10, 0], [10, 0], [0, 2]]) limb(c, [0, -18, x2, y2], 1.2, '#6b4431');
    c.save(); c.translate(0, -20); c.rotate(-0.55);
    box(c, -10, -3.2, 26, 6.4, 3, gold(c, -10, -3, 26, 6), INK, 0.9); box(c, 14, -4, 5, 8, 2, '#c98a1e', INK, 0.8); box(c, -14, -2, 5, 4, 1.5, '#8a5a3a', INK, 0.7);
    c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(-8, -2.4, 20, 1); c.restore();
    circ(c, 0, -20, 1.8, '#5b3f36', INK, 0.5);
    if (LIGHT.night > 0.2) sparkle(c, 14, -44, 1.3, (Math.sin(t * 3) + 1) / 2);
  },
  cat_tower: (c, t, p) => {
    shadow(c, 0, 1, 16, 4, 0.18); box(c, -15, -5, 30, 5, 2, '#d9b38a', INK, 0.8);
    for (const x of [-8, 7]) { box(c, x - 2.5, -40, 5, 36, 1, '#e9d2a8', INK, 0.7); c.strokeStyle = 'rgba(150,110,70,.45)'; c.lineWidth = 0.5; for (let y = -38; y < -6; y += 2) { c.beginPath(); c.moveTo(x - 2.5, y); c.lineTo(x + 2.5, y + 1.2); c.stroke(); } }
    box(c, -14, -24, 18, 4, 2, '#f6a3b1', INK, 0.7); box(c, -2, -44, 16, 4, 2, '#a9bcdc', INK, 0.7);
    c.beginPath(); c.arc(-6, -30, 6, Math.PI, 0); c.lineTo(0, -24); c.lineTo(-12, -24); c.closePath(); c.fillStyle = '#f6a3b1'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke(); circ(c, -6, -28, 2.6, '#5b3f36', null);
    const sw = Math.sin(t * 2.2) * 2; line(c, 12, -42, 12 + sw, -32, INK, 0.4); circ(c, 12 + sw, -31, 1.6, '#ffd35a', INK, 0.4);
  },
  fairy_lights: (c, t, p) => onWall(c, p, () => {
    const n = 9, on = !p.off;
    c.strokeStyle = '#5b6b4a'; c.lineWidth = 0.6; c.beginPath(); for (let i = 0; i <= 20; i++) { const u = i / 20, x = -26 + u * 52, y = -74 + Math.sin(u * Math.PI) * 6; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, x = -26 + u * 52, y = -73 + Math.sin(u * Math.PI) * 6, k = (Math.sin(t * 2.5 + i * 1.3) + 1) / 2;
      circ(c, x, y + 1.6, 1.4, on ? `rgba(255,${200 + k * 40},${110 + k * 60},1)` : '#d9cfc0', INK, 0.4); if (on) { c.globalAlpha = 0.3 + k * 0.4; circ(c, x, y + 1.6, 3.2, '#ffe7a0', null); c.globalAlpha = 1; if (!p.preview && i % 2 === 0) g(p, x, y, 16, 'rgba(255,220,150,.5)'); } }
  }),
  surfboard_rack: (c, t, p) => {
    shadow(c, 0, 1, 16, 3, 0.16); box(c, -16, -4, 32, 4, 1, '#8a5a3a', INK, 0.8);
    [['#6fbfb0', -9, -0.15], ['#ff8fb0', 0, 0], ['#ffd35a', 9, 0.15]].forEach(([col, x, r]) => { c.save(); c.translate(x, -4); c.rotate(r); ell(c, 0, -20, 4.5, 20, col, INK, 0.9); line(c, 0, -39, 0, -1, '#fff', 0.8); poly(c, [-1.5, -6, 1.5, -6, 0, -2], INK, null); c.restore(); });
    for (const x of [-15, 15]) limb(c, [x, -4, x, -30], 1.6, '#8a5a3a');
  },
});

// lanterns you made at Bà Sáu's class: a star lantern in your colour
for (const [id, col] of [['lantern_hand_pink', '#f36d86'], ['lantern_hand_teal', '#2f9e8f'], ['lantern_hand_gold', '#f2c14e']]) FURN_DRAW[id] = (c, t, p) => onWall(c, p, () => {
  const sw = Math.sin(t * 1.6 + (p.x || 0)) * 0.08; c.save(); c.translate(0, -70); c.rotate(sw);
  line(c, 0, 0, 0, 8, INK, 0.6); const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 4 : 9; pts.push(Math.cos(a) * r, 17 + Math.sin(a) * r); }
  poly(c, pts, col, INK, 0.9); circ(c, 0, 17, 2.2, '#fff6c8', null); line(c, -1, 26, -2 + Math.sin(t * 2), 33, col, 0.8); line(c, 1, 26, 2 + Math.sin(t * 2 + 1), 33, col, 0.8);
  c.restore(); if (!p.preview) g(p, 0, -53, 26, 'rgba(255,200,140,.5)');
});

// Turtle Cove finds (systems/trip.js)
FURN_DRAW.giant_shell = (c, t, p) => {
  shadow(c, 0, 1, 14, 4, 0.18);
  c.beginPath(); c.moveTo(-14, -2); c.quadraticCurveTo(-16, -20, 0, -24); c.quadraticCurveTo(14, -22, 15, -6); c.quadraticCurveTo(8, 0, -14, -2); c.closePath();
  c.fillStyle = '#f7d6c4'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(4 - i * 3, -12 + i, 9 - i * 2, Math.PI * 0.9, Math.PI * 1.9); c.strokeStyle = 'rgba(200,120,110,.55)'; c.lineWidth = 0.8; c.stroke(); }
  c.beginPath(); c.ellipse(-6, -8, 5, 3.5, -0.4, 0, Math.PI * 2); c.fillStyle = '#f2a6a0'; c.fill();
  const k = (Math.sin(t * 2) + 1) / 2; c.fillStyle = `rgba(255,255,255,${0.3 + k * 0.4})`; c.beginPath(); c.ellipse(4, -18, 4, 1.4, -0.4, 0, Math.PI * 2); c.fill();
};
FURN_DRAW.bottle_ship = (c, t, p) => {
  shadow(c, 0, 1, 14, 3, 0.16); box(c, -12, -3, 24, 3, 1, '#8a5a3a', INK, 0.7);
  c.beginPath(); c.ellipse(0, -10, 13, 7, 0, 0, Math.PI * 2); c.fillStyle = 'rgba(190,230,240,.55)'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
  box(c, 12, -12, 5, 4, 1, '#c9955e', INK, 0.6);
  poly(c, [-7, -7, 6, -7, 4, -4, -5, -4], '#a8563f', INK, 0.5); line(c, 0, -7, 0, -15, '#5b3f36', 0.7); poly(c, [0.5, -15, 0.5, -8, 5, -8], '#fffaf0', INK, 0.4); poly(c, [-0.5, -14, -0.5, -8, -4, -8], '#fffaf0', INK, 0.4);
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.beginPath(); c.ellipse(-4, -13, 5, 1.5, -0.2, Math.PI, Math.PI * 1.7); c.stroke();
};

// the Lantern Lounge bundle (systems/store.js)
FURN_DRAW.lounge_sofa = (c, t, p) => {
  shadow(c, 0, 1, 24, 4, 0.2);
  box(c, -23, -26, 46, 16, 7, '#7a2f4f', INK, 1);                          // velvet back
  for (let i = -2; i <= 2; i++) { c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(i * 9 - 0.4, -24, 0.8, 12); }
  box(c, -24, -14, 48, 11, 4, '#93395e', INK, 1); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-21, -13, 42, 1.4);
  for (const s of [-1, 1]) box(c, s * 22 - 4, -20, 8, 15, 4, '#7a2f4f', INK, 0.9);
  for (const x of [-20, 20]) box(c, x - 1, -3, 2, 3, 0.5, '#c99a52', null);
  // lantern cushions
  for (const [x, col] of [[-10, '#f2c14e'], [10, '#f36d86']]) { ell(c, x, -18, 6, 5, col, INK, 0.8); line(c, x - 5, -18, x + 5, -18, 'rgba(0,0,0,.25)', 0.6); box(c, x - 2, -24, 4, 1.6, 0.5, '#c99a52', null); }
};
FURN_DRAW.lantern_tree = (c, t, p) => {
  shadow(c, 0, 1, 10, 3, 0.18); box(c, -7, -8, 14, 8, 2, '#b8643f', INK, 0.9);
  limb(c, [0, -8, -1, -26, 1, -40], 2, '#6b4a36'); limb(c, [0, -24, -10, -32], 1.2, '#6b4a36'); limb(c, [0, -30, 10, -38], 1.2, '#6b4a36'); limb(c, [0, -36, -7, -44], 1, '#6b4a36');
  const L = [[-10, -32, '#f36d86'], [10, -38, '#f2c14e'], [-7, -44, '#ff8f5a'], [2, -46, '#f36d86'], [-3, -22, '#f2c14e']];
  L.forEach(([x, y, col], i) => { const sw = Math.sin(t * 1.5 + i) * 0.8; line(c, x, y, x + sw, y + 3, INK, 0.4); ell(c, x + sw, y + 6, 2.6, 3.2, col, INK, 0.5); circ(c, x + sw, y + 6, 1, '#fff6c8', null); });
  if (!p.preview) g(p, 0, -36, 34, 'rgba(255,190,120,.45)');
};
FURN_DRAW.koi_lamp = (c, t, p) => {
  shadow(c, 0, 1, 7, 2, 0.16); box(c, -6, -4, 12, 4, 1.5, '#3a3a3a', INK, 0.8);
  const k = Math.sin(t * 1.2) * 0.12; c.save(); c.translate(0, -14); c.rotate(k);
  c.beginPath(); c.moveTo(-9, 0); c.quadraticCurveTo(-2, -8, 7, -2); c.quadraticCurveTo(9, 0, 7, 2); c.quadraticCurveTo(-2, 8, -9, 0); c.closePath();
  c.fillStyle = '#fff1e0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
  poly(c, [-9, 0, -14, -5, -13, 0, -14, 5], '#f36d4f', INK, 0.6);
  for (const [x, y, r] of [[-3, -2, 2.4], [2, 2, 1.8], [4, -2, 1.4]]) circ(c, x, y, r, '#f36d4f', null);
  circ(c, 5, -0.5, 0.8, INK, null); c.restore();
  line(c, 0, -4, 0, -9, '#3a3a3a', 1);
  if (!p.preview) g(p, 0, -14, 22, 'rgba(255,170,120,.45)');
};

// ---------------------------------------------------------------- the upstairs & basement collection (5.18)
// Bedrooms and a study for the floor above; a games room, a workshop and a laundry corner
// for the basement; and a few traditional pieces for any floor. Each has a side model
// (SIDE, below) so it looks right however it's turned.
Object.assign(FURN_DRAW, {
  bed_double: (c, t, p) => {
    shadow(c, 0, 1, 33, 6, 0.2);
    wood(c, -32, -50, 64, 22, 5, '#b77a4f');                                    // headboard
    for (const x of [-20, 0, 20]) box(c, x - 6, -46, 12, 14, 4, shade('#b77a4f', 10), INK, 0.6);
    box(c, -31, -30, 62, 28, 5, '#fffaf0', INK, 1);                             // mattress
    for (const x of [-16, 16]) { box(c, x - 12, -33, 24, 9, 4, '#fff', INK, 0.8); line(c, x - 9, -29, x + 9, -29, 'rgba(91,63,54,.18)', 0.6); }
    box(c, -31, -22, 62, 20, 5, '#9fc4e8', INK, 1);                             // quilt
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 0.8; for (let x = -26; x < 30; x += 10) { c.beginPath(); c.moveTo(x, -21); c.lineTo(x, -3); c.stroke(); }
    box(c, -31, -22, 62, 5, 3, '#7faad8', null);
    for (const x of [-30, 30]) limb(c, [x, -3, x, 0], 2.4, '#8a5f3e');
  },
  bunk_bed: (c, t, p) => {
    shadow(c, 0, 1, 21, 5, 0.2);
    for (const x of [-19, 19]) wood(c, x - 2, -70, 4, 70, 1.5, '#c98f5a', 0.9);
    for (const y of [-58, -24]) { box(c, -18, y, 36, 9, 3, '#fffaf0', INK, 0.9); box(c, -18, y + 3, 36, 6, 3, y < -40 ? '#f4a9b8' : '#9fd8c8', INK, 0.7); box(c, -16, y - 3, 10, 5, 2, '#fff', INK, 0.6); }
    wood(c, -19, -50, 38, 3, 1, '#b77a4f', 0.7); wood(c, -19, -16, 38, 3, 1, '#b77a4f', 0.7);
    for (let i = 0; i < 4; i++) line(c, 12, -48 + i * 8, 18, -48 + i * 8, '#8a5f3e', 1.2);          // ladder rungs
    line(c, 12, -50, 12, -18, '#8a5f3e', 1.4);
    star(c, -8, -64, 2.2, '#ffd35a');
  },
  nightstand: (c, t, p) => {
    shadow(c, 0, 1, 10, 3, 0.16);
    wood(c, -9, -18, 18, 17, 2, '#d9a36a'); wood(c, -7, -15, 14, 6, 1, '#e8b87e', 0.6); circ(c, 0, -12, 0.9, '#8a5f3e', null);
    for (const x of [-7, 7]) limb(c, [x, -2, x, 0], 1.6, '#8a5f3e');
    line(c, -2, -18, -2, -28, '#5a4a48', 1); poly(c, [-7, -28, 3, -28, 1, -35, -5, -35], p.off ? '#e6d9b8' : '#f7de8c', INK, 0.7);
    box(c, 3, -21, 5, 3, 1, '#7aa38a', INK, 0.5);                                // a little book
    if (!p.off && !p.preview) g(p, -2, -30, 30, 'rgba(255,214,140,.5)');
  },
  vanity: (c, t, p) => {
    shadow(c, 0, 1, 18, 4, 0.18);
    for (const x of [-15, 15]) limb(c, [x, -16, x, 0], 1.8, '#a26a42');
    wood(c, -18, -20, 36, 6, 2, '#e3b98a'); wood(c, -16, -15, 14, 5, 1, '#ecc79c', 0.6);
    ell(c, 0, -38, 11, 14, '#e3b98a', INK, 1); ell(c, 0, -38, 8.5, 11.5, '#d6eef7', null);
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-3, -42, 2, 5, -0.3, 0, TAU); c.fill();
    box(c, 8, -26, 4, 6, 1, '#f36d86', INK, 0.5); circ(c, 13, -22, 2, '#c9b6e8', INK, 0.5);  // perfume and powder
    for (const x of [-14, -10]) flower(c, x, -25, 1.8, '#f4a9b8');
  },
  study_desk: (c, t, p) => {
    shadow(c, 0, 1, 23, 4, 0.18);
    for (const x of [-20, 20]) limb(c, [x, -18, x, 0], 2, '#8a5f3e');
    wood(c, -22, -22, 44, 6, 2, '#c98f5a'); wood(c, 8, -17, 13, 15, 1.5, '#b77a4f', 0.8); for (const y of [-14, -8]) circ(c, 14.5, y, 0.8, '#5a3a24', null);
    box(c, -12, -34, 18, 11, 1.5, '#3d3a42', INK, 0.8); box(c, -10.5, -32.5, 15, 8, 1, `hsl(${200 + Math.sin(t) * 10},60%,72%)`, null);  // laptop
    poly(c, [-14, -23, 8, -23, 10, -21, -16, -21], '#8f9aa3', INK, 0.5);
    line(c, 16, -22, 16, -34, '#5a4a48', 1); line(c, 16, -34, 10, -38, '#5a4a48', 1); poly(c, [7, -40, 14, -38, 11, -34], '#f2c14e', INK, 0.5);
    box(c, -20, -27, 6, 5, 1, '#fff8ea', INK, 0.5);                              // a mug
  },
  desk_chair: (c, t, p) => {
    shadow(c, 0, 1, 9, 3, 0.16);
    for (const a of [-1, 0, 1]) line(c, 0, -3, a * 8, 0, '#5a5f66', 1.4); line(c, 0, -10, 0, -3, '#5a5f66', 1.6);
    fabric(c, -8, -15, 16, 6, 3, '#6f9fc8'); fabric(c, -7, -31, 14, 16, 5, '#6f9fc8');
  },
  floor_cushions: (c, t, p) => {
    shadow(c, 0, 1, 18, 5, 0.16);
    [['#f28f7c', -9, -4], ['#f7de8c', 8, -6], ['#9fd8c8', 0, -12]].forEach(([col, x, y]) => { ell(c, x, y, 10, 5, col, INK, 0.8); ell(c, x, y - 1.5, 7, 2.6, shade(col, 14), null); circ(c, x, y - 1, 1, shade(col, -30), null); });
  },
  clothes_rack: (c, t, p) => {
    shadow(c, 0, 1, 20, 3, 0.14);
    for (const x of [-19, 19]) { line(c, x, -2, x, -46, '#5a4a48', 1.6); line(c, x - 4, 0, x + 4, 0, '#5a4a48', 1.6); }
    line(c, -19, -46, 19, -46, '#5a4a48', 1.6);
    ['#f4a9b8', '#6fbfb0', '#f7de8c', '#c9b6e8', '#f28f7c'].forEach((col, i) => { const x = -14 + i * 7, sw = Math.sin(t * 1.3 + i) * 0.6; line(c, x, -46, x + sw, -42, '#8f9aa3', 0.7); poly(c, [x - 4 + sw, -41, x + 4 + sw, -41, x + 5 + sw, -24, x - 5 + sw, -24], col, INK, 0.6); });
  },
  sewing_table: (c, t, p) => {
    shadow(c, 0, 1, 17, 4, 0.18);
    for (const x of [-14, 14]) limb(c, [x, -16, x, 0], 1.8, '#3d3a42');
    line(c, -14, -6, 14, -6, '#3d3a42', 1.2); circ(c, 9, -6, 3, null, '#3d3a42', 1);    // treadle wheel
    wood(c, -17, -20, 34, 5, 2, '#b77a4f');
    box(c, -12, -32, 20, 9, 3, '#3d3a42', INK, 0.8); box(c, -12, -38, 7, 8, 2, '#3d3a42', INK, 0.8); line(c, -9, -23, -9, -20, '#c9ccd2', 1);
    stext(c, 'SINGER', -2, -27, 3.2, '#f2c14e');
    circ(c, 12, -23, 2.4, '#f36d86', INK, 0.5); line(c, 12, -23, 15, -21, '#f36d86', 0.5);
  },
  floor_mirror: (c, t, p) => {
    shadow(c, 0, 1, 9, 3, 0.14);
    for (const x of [-6, 6]) limb(c, [x, -6, x * 1.4, 0], 1.4, '#a26a42');
    box(c, -8, -54, 16, 50, 7, '#e3b86a', INK, 1); box(c, -6, -52, 12, 46, 5, '#d6eef7', null);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(-4, -48); c.lineTo(-1, -48); c.lineTo(-4, -30); c.closePath(); c.fill();
  },
  pool_table: (c, t, p) => {
    shadow(c, 0, 1, 31, 6, 0.2);
    for (const x of [-26, 26]) limb(c, [x, -14, x, 0], 3, '#5a3a24');
    wood(c, -30, -36, 60, 24, 5, '#8a4a2a');
    box(c, -26, -33, 52, 18, 3, '#2f8f5f', INK, 0.8);
    for (const [x, y] of [[-26, -33], [0, -33], [26, -33], [-26, -15], [0, -15], [26, -15]]) circ(c, x, y, 1.8, '#1f1a1c', null);
    [[8, -24, '#fff'], [-10, -26, '#ffd35a'], [-13, -23, '#e8584e'], [-13, -28, '#6f9fc8'], [-16, -25, '#3d3550'], [-16, -21, '#f28f7c']].forEach(([x, y, col]) => circ(c, x, y, 1.6, col, INK, 0.4));
    line(c, 10, -23, 28, -18, '#d9b27a', 1.2);
  },
  foosball: (c, t, p) => {
    shadow(c, 0, 1, 21, 5, 0.18);
    for (const x of [-16, 16]) limb(c, [x, -12, x, 0], 2.2, '#3d3a42');
    wood(c, -20, -28, 40, 16, 3, '#c98f5a'); box(c, -17, -26, 34, 12, 2, '#5fb070', INK, 0.6);
    line(c, 0, -26, 0, -14, 'rgba(255,255,255,.7)', 0.6); box(c, -17, -22, 2, 4, 0, '#fff', null); box(c, 15, -22, 2, 4, 0, '#fff', null);
    for (let i = 0; i < 4; i++) { const x = -12 + i * 8, k = Math.sin(t * 3 + i) * 1.5; line(c, x, -30, x, -10, '#c9ccd2', 0.9); circ(c, x, -30, 1.4, '#3d3a42', null); box(c, x - 1.2, -22 + k, 2.4, 4, 1, i < 2 ? '#e8584e' : '#6f9fc8', INK, 0.3); }
    circ(c, Math.sin(t * 1.7) * 10, -20, 1, '#fff', INK, 0.3);
  },
  ping_pong: (c, t, p) => {
    shadow(c, 0, 1, 29, 5, 0.18);
    for (const x of [-24, 24]) limb(c, [x, -12, x, 0], 2, '#5a5f66');
    box(c, -28, -26, 56, 14, 3, '#2f6f9f', INK, 1); line(c, -26, -19, 26, -19, 'rgba(255,255,255,.6)', 0.6); box(c, -27, -26, 54, 1.2, 0, '#fff', null);
    box(c, -1, -32, 2, 7, 0.5, '#fffaf0', INK, 0.5); c.save(); c.strokeStyle = 'rgba(91,63,54,.35)'; c.lineWidth = 0.4; for (let y = -31; y < -26; y += 1.5) { c.beginPath(); c.moveTo(-1, y); c.lineTo(1, y); c.stroke(); } c.restore();
    for (const s of [-1, 1]) { circ(c, s * 18, -29, 3, '#e8584e', INK, 0.5); line(c, s * 18, -26, s * 18, -23, '#8a5f3e', 1.2); }
  },
  jukebox: (c, t, p) => {
    const on = !p.off;
    shadow(c, 0, 1, 13, 4, 0.18);
    c.beginPath(); c.moveTo(-12, 0); c.lineTo(-12, -34); c.arc(0, -34, 12, Math.PI, 0); c.lineTo(12, 0); c.closePath(); c.fillStyle = '#b8603f'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.arc(0, -34, 9, Math.PI, 0); c.lineTo(9, -26); c.lineTo(-9, -26); c.closePath(); c.fillStyle = on ? `hsl(${(t * 60) % 360},80%,72%)` : '#e3d6c6'; c.fill();
    box(c, -8, -24, 16, 8, 2, '#fff1d0', INK, 0.6); for (let i = 0; i < 4; i++) line(c, -6, -22 + i * 1.6, 6, -22 + i * 1.6, 'rgba(91,63,54,.4)', 0.5);
    box(c, -9, -13, 18, 10, 2, '#3d3a42', INK, 0.6); for (let i = 0; i < 4; i++) line(c, -7 + i * 4.6, -12, -7 + i * 4.6, -4, '#5a5f66', 1);
    if (on && !p.preview) { g(p, 0, -30, 34, 'rgba(255,170,120,.45)'); for (let i = 0; i < 2; i++) { const k = (t * 0.6 + i / 2) % 1; c.globalAlpha = 1 - k; c.fillStyle = '#ff6fae'; c.font = '900 7px Nunito'; c.fillText('♪', -8 + i * 12, -50 - k * 12); c.globalAlpha = 1; } }
  },
  karaoke_set: (c, t, p) => {
    const on = !p.off;
    shadow(c, 0, 1, 21, 4, 0.18);
    wood(c, -14, -12, 28, 11, 2, '#5a3a24');
    box(c, -12, -32, 24, 18, 2, '#2f2a30', INK, 1); box(c, -10.5, -30.5, 21, 15, 1, on ? '#3f5f9f' : '#24222a', null);
    if (on) { c.fillStyle = '#fff'; c.font = '900 3.6px Nunito'; c.textAlign = 'center'; c.fillText('♪ Hello Việt Nam ♪', 0, -24); c.fillStyle = '#ffd35a'; c.fillRect(-8, -21, 16 * ((t * 0.15) % 1), 1.2); c.textAlign = 'start'; }
    for (const s of [-1, 1]) { box(c, s * 18 - 4, -26, 8, 26, 2, '#3d3a42', INK, 0.8); circ(c, s * 18, -18, 2.8, '#6b6b6b', INK, 0.4); circ(c, s * 18, -8, 2.2, '#6b6b6b', INK, 0.4); }
    line(c, 6, -12, 10, -6, '#3d3a42', 1); circ(c, 6, -13, 1.4, '#c9ccd2', INK, 0.4);   // microphone
    if (on && !p.preview) g(p, 0, -24, 28, 'rgba(120,150,255,.35)');
  },
  workbench: (c, t, p) => {
    shadow(c, 0, 1, 26, 5, 0.18);
    for (const x of [-22, 22]) limb(c, [x, -18, x, 0], 2.4, '#8a5f3e');
    line(c, -22, -6, 22, -6, '#8a5f3e', 1.6);
    wood(c, -25, -22, 50, 6, 2, '#c99a5e');
    box(c, -20, -5, 12, 5, 1, '#e8584e', INK, 0.6);                              // toolbox under
    box(c, 10, -30, 10, 8, 1, '#7aa38a', INK, 0.6); circ(c, 15, -26, 1.4, '#3d3a42', null);    // vice
    line(c, -16, -24, -6, -27, '#8f9aa3', 1.6); line(c, -6, -27, -4, -24, '#5a3a24', 2);        // hammer
    line(c, -2, -23, 6, -24, '#c9ccd2', 0.8); box(c, -18, -26, 6, 3, 0.6, '#f2c14e', INK, 0.4);
  },
  washing_machine: (c, t, p) => {
    shadow(c, 0, 1, 12, 4, 0.18);
    box(c, -11, -28, 22, 28, 3, '#f4f8fb', INK, 1); box(c, -11, -28, 22, 5, 2, '#dfe8ee', INK, 0.6);
    circ(c, 6, -25.5, 1.2, '#6fbf73', null); box(c, -8, -26.5, 7, 2, 0.5, '#3d3a42', null);
    circ(c, 0, -12, 8, '#c9d3dc', INK, 0.9); c.save(); c.beginPath(); c.arc(0, -12, 6.4, 0, TAU); c.clip();
    c.fillStyle = '#9fd4f5'; c.fillRect(-7, -18, 14, 13); const a = t * 4;
    for (let i = 0; i < 3; i++) { const an = a + i * 2.1; ell(c, Math.cos(an) * 3, -12 + Math.sin(an) * 3, 2.4, 1.6, ['#f4a9b8', '#f7de8c', '#6fbfb0'][i], null); }
    c.restore(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(-2, -14, 3, Math.PI, Math.PI * 1.5); c.lineTo(-2, -14); c.fill();
  },
  pantry_shelf: (c, t, p) => {
    shadow(c, 0, 1, 20, 4, 0.16);
    wood(c, -19, -52, 38, 50, 2, '#b77a4f');
    for (let r = 0; r < 3; r++) { const y = -48 + r * 16; box(c, -17, y + 12, 34, 2, 0.5, '#8a5a3a', null);
      for (let i = 0; i < 4; i++) { const x = -14 + i * 8.6, col = ['#f2c14e', '#e8584e', '#9fd67a', '#f28f7c', '#c9b6e8', '#e9a24a'][(r * 4 + i) % 6]; box(c, x, y + 3, 6, 9, 1.5, 'rgba(230,240,245,.85)', INK, 0.5); box(c, x + 0.8, y + 6, 4.4, 5.6, 1, col, null); box(c, x - 0.3, y + 1.6, 6.6, 2, 0.6, '#c9955e', INK, 0.3); } }
  },
  fish_sauce_barrels: (c, t, p) => {
    shadow(c, 0, 1, 19, 5, 0.18);
    for (const [x, s] of [[-9, 1], [9, 0.9]]) { c.save(); c.translate(x, 0); c.scale(s, s);
      ell(c, 0, -2, 9, 3, '#8a5a3a', INK, 0.8); box(c, -9, -26, 18, 24, 4, '#a8703f', INK, 1); ell(c, 0, -26, 9, 3, '#c98f5a', INK, 0.8);
      for (const y of [-21, -7]) box(c, -9.4, y, 18.8, 2.4, 0.5, '#5a5f66', null);
      c.restore(); }
    box(c, -15, -18, 12, 7, 1, '#fff1d0', INK, 0.5); stext(c, 'NƯỚC MẮM', -9, -14.2, 2.4, '#a8563f');
  },
  weights_rack: (c, t, p) => {
    shadow(c, 0, 1, 19, 4, 0.16);
    for (const x of [-16, 16]) { line(c, x, 0, x, -30, '#3d3a42', 2); line(c, x - 4, 0, x + 4, 0, '#3d3a42', 1.6); }
    line(c, -18, -26, 18, -26, '#c9ccd2', 1.6); for (const s of [-1, 1]) { box(c, s * 13 - 2, -31, 4, 10, 1, '#e8584e', INK, 0.6); box(c, s * 10 - 1.5, -30, 3, 8, 1, '#e8584e', INK, 0.6); }
    line(c, -14, -12, 14, -12, '#5a5f66', 1.4); for (let i = 0; i < 3; i++) { const x = -9 + i * 9; box(c, x - 3, -11, 6, 4, 1.5, '#3d3a42', INK, 0.5); box(c, x - 1, -10, 2, 2, 0.5, '#8f9aa3', null); }
  },
  treadmill: (c, t, p) => {
    shadow(c, 0, 1, 12, 6, 0.16);
    box(c, -10, -12, 20, 12, 3, '#3d3a42', INK, 0.9); c.save(); c.beginPath(); c.rect(-8, -11, 16, 9); c.clip(); for (let y = -11 + ((t * 18) % 3); y < -1; y += 3) line(c, -8, y, 8, y, '#5a5f66', 0.6); c.restore();
    for (const x of [-9, 9]) line(c, x, -10, x, -34, '#8f9aa3', 1.4);
    box(c, -10, -38, 20, 6, 2, '#5a5f66', INK, 0.8); box(c, -5, -37, 10, 4, 1, '#9fd4f5', null);
  },
  co_tuong_table: (c, t, p) => {
    shadow(c, 0, 1, 18, 6, 0.18);
    for (const x of [-20, 20]) { box(c, x - 4, -10, 8, 3, 1.5, '#c98f5a', INK, 0.6); line(c, x - 3, -7, x - 3, 0, '#8a5f3e', 1.2); line(c, x + 3, -7, x + 3, 0, '#8a5f3e', 1.2); }
    for (const x of [-11, 11]) limb(c, [x, -14, x, 0], 2, '#8a5f3e');
    wood(c, -14, -20, 28, 6, 2, '#d9b27a');
    box(c, -11, -28, 22, 10, 1, '#f3d9a4', INK, 0.6); c.strokeStyle = 'rgba(138,74,42,.6)'; c.lineWidth = 0.4;
    for (let i = 1; i < 8; i++) { c.beginPath(); c.moveTo(-11 + i * 2.75, -28); c.lineTo(-11 + i * 2.75, -18); c.stroke(); } for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-11, -28 + i * 2.5); c.lineTo(11, -28 + i * 2.5); c.stroke(); }
    [[-8, -26, '#e8584e'], [-3, -26, '#e8584e'], [4, -21, '#3d3550'], [8, -21, '#3d3550'], [0, -23, '#e8584e']].forEach(([x, y, col]) => { circ(c, x, y, 1.5, '#fff8ea', col, 0.6); });
  },
  sap_go: (c, t, p) => {
    shadow(c, 0, 1, 29, 6, 0.2);
    box(c, -28, -14, 56, 12, 2, '#6b3a2a', INK, 1);
    c.strokeStyle = '#4a2418'; c.lineWidth = 0.7; for (let x = -24; x < 26; x += 12) { c.beginPath(); c.moveTo(x, -12); c.quadraticCurveTo(x + 3, -6, x + 6, -12); c.stroke(); }
    for (const x of [-26, 26]) { c.beginPath(); c.moveTo(x - 2, -2); c.quadraticCurveTo(x, 2, x + (x < 0 ? 3 : -3), 0); c.strokeStyle = '#4a2418'; c.lineWidth = 1.6; c.stroke(); }
    box(c, -29, -22, 58, 9, 2, '#8a4a32', INK, 1); c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(-27, -21, 54, 1.5);
    box(c, -6, -28, 18, 6, 2, '#e9c46f', INK, 0.6);                               // a tray with tea
    circ(c, 0, -29, 2.6, '#6f9fc8', INK, 0.5); for (const x of [6, 10]) circ(c, x, -27.5, 1.3, '#fff', INK, 0.4);
  },
  altar_cabinet: (c, t, p) => {
    shadow(c, 0, 1, 23, 4, 0.18);
    wood(c, -22, -30, 44, 28, 3, '#7a3a26'); for (const x of [-20, 20]) limb(c, [x, -3, x, 0], 2.2, '#5a2a1c');
    for (const x of [-13, 13]) { box(c, x - 7, -26, 14, 20, 2, '#8a4a32', INK, 0.6); circ(c, x + (x < 0 ? 5 : -5), -16, 0.9, '#f2c14e', null); }
    box(c, -24, -33, 48, 4, 1.5, '#5a2a1c', INK, 0.8);
    // offerings: a fruit plate, an incense bowl with three sticks, two candles
    ell(c, -12, -35, 6, 2, '#fff1d0', INK, 0.5); for (const [x, col] of [[-15, '#f2c14e'], [-12, '#f28f7c'], [-9, '#9fd67a'], [-12, '#ffb38a']]) circ(c, x, x === -12 && col === '#ffb38a' ? -40 : -37.5, 2, col, INK, 0.4);
    box(c, -1, -40, 8, 6, 2, '#c9a15a', INK, 0.6); for (const x of [1, 3, 5]) { line(c, x, -40, x - 0.5, -50, '#a8563f', 0.6); circ(c, x - 0.5, -50.5, 0.6, '#ff8f5a', null); const k = (t * 0.5 + x / 6) % 1; c.globalAlpha = 0.4 * (1 - k); circ(c, x - 0.5 + Math.sin(k * 5) * 2, -53 - k * 10, 0.8 + k, '#e6e6e6', null); c.globalAlpha = 1; }
    for (const x of [13, 18]) { box(c, x - 1, -42, 2, 8, 0.5, '#e8584e', INK, 0.4); ell(c, x, -44, 1, 1.6, '#ffd35a', null); }
    if (!p.preview) g(p, 8, -42, 22, 'rgba(255,190,110,.45)');
  },
  bonsai_rock: (c, t, p) => {
    shadow(c, 0, 1, 21, 6, 0.18);
    ell(c, 0, -6, 20, 7, '#8fa3ad', INK, 1); ell(c, 0, -7, 17, 5, '#6fb4c8', null);
    c.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - k; c.beginPath(); c.ellipse(-4, -6, 3 + k * 8, 1 + k * 2.4, 0, 0, TAU); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 0.5; c.stroke(); } c.globalAlpha = 1;
    poly(c, [-10, -8, -6, -30, 0, -38, 4, -26, 8, -32, 12, -8], '#9a9488', INK, 0.9); poly(c, [-6, -30, 0, -38, 2, -30], '#b2ac9f', null);
    ell(c, -2, -36, 5, 2.6, '#6fae5c', INK, 0.5); ell(c, 7, -30, 4, 2.2, '#7fbe6a', INK, 0.5); line(c, -2, -34, -1, -31, '#5a3a24', 0.7);
    box(c, 3, -20, 3, 3, 0.6, '#e8584e', INK, 0.4); poly(c, [2, -20, 4.5, -23, 7, -20], '#a8563f', null);                         // a tiny pagoda
    const k = Math.sin(t * 6) * 0.5; line(c, 9, -16, 12 + k, -8, 'rgba(160,215,235,.9)', 1);                                         // the little waterfall
  },
  spinning_lantern: (c, t, p) => {
    const on = !p.off;
    shadow(c, 0, 1, 8, 3, 0.14); line(c, 0, 0, 0, -18, '#8a5a3a', 1.4); line(c, -5, 0, 5, 0, '#8a5a3a', 1.4);
    box(c, -9, -40, 18, 22, 3, on ? '#ffe7a8' : '#f2dcae', INK, 0.9); box(c, -10, -42, 20, 3, 1, '#e8584e', INK, 0.6); box(c, -10, -19, 20, 3, 1, '#e8584e', INK, 0.6);
    c.save(); c.beginPath(); c.rect(-8, -39, 16, 19); c.clip(); const off = on ? (t * 6) % 32 : 0;           // đèn kéo quân: shadows of riders and fish go round
    c.fillStyle = 'rgba(90,50,40,.55)'; for (let i = -1; i < 2; i++) { const x = -16 + i * 16 + off; c.beginPath(); c.ellipse(x, -28, 3, 1.6, 0, 0, TAU); c.fill(); poly(c, [x - 3, -28, x - 6, -31, x - 6, -25], 'rgba(90,50,40,.55)', null); circ(c, x + 8, -32, 1.6, 'rgba(90,50,40,.55)', null); line(c, x + 8, -31, x + 8, -26, 'rgba(90,50,40,.55)', 1.4); }
    c.restore(); line(c, -3, -19, -3 + Math.sin(t * 2), -14, '#e8584e', 0.6); line(c, 3, -19, 3 + Math.sin(t * 2 + 1), -14, '#e8584e', 0.6);
    if (on && !p.preview) g(p, 0, -30, 30, 'rgba(255,200,120,.5)');
  },
  egg_chair: (c, t, p) => {
    const sw = Math.sin(t * 1.1) * 0.05;
    shadow(c, 0, 1, 14, 4, 0.16); ell(c, -6, -1, 8, 2.4, '#5a3a24', INK, 0.7);
    c.beginPath(); c.moveTo(-8, -1); c.quadraticCurveTo(-16, -40, -6, -60); c.quadraticCurveTo(0, -68, 6, -66);         // an arched stand
    c.strokeStyle = INK; c.lineWidth = 3.2; c.stroke(); c.strokeStyle = '#6b4a36'; c.lineWidth = 2; c.stroke();
    for (let i = 0; i < 4; i++) circ(c, 5.4 - i * 0.3, -63 + i * 3.4, 0.9, null, '#8f9aa3', 0.6);                          // the chain
    c.save(); c.translate(4, -50); c.rotate(sw);
    ell(c, 0, 22, 13, 20, '#d9b27a', INK, 1);                                           // the woven shell
    c.save(); c.beginPath(); c.ellipse(0, 22, 12.4, 19.4, 0, 0, TAU); c.clip();
    c.strokeStyle = 'rgba(138,95,62,.5)'; c.lineWidth = 0.5; for (let i = -12; i <= 12; i += 3) { c.beginPath(); c.moveTo(i, 2); c.lineTo(i * 0.8, 42); c.stroke(); }
    c.restore();
    ell(c, 0, 26, 9, 12, '#b98a52', INK, 0.7);                                         // the opening
    ell(c, 0, 33, 8, 4, '#f4a9b8', INK, 0.6); ell(c, -2, 24, 4, 4.4, '#fff8ea', INK, 0.5);
    c.restore();
  },
  bamboo_bench: (c, t, p) => {
    shadow(c, 0, 1, 23, 4, 0.16);
    for (const x of [-19, 19]) { limb(c, [x - 2, -12, x - 2, 0], 1.8, '#b99a52'); limb(c, [x + 2, -12, x + 2, 0], 1.8, '#b99a52'); }
    for (let i = 0; i < 4; i++) { box(c, -23, -15 + i * 1.6 - 2, 46, 2.4, 1.2, i % 2 ? '#d9c27a' : '#cdb46a', INK, 0.4); }
    for (const x of [-15, 0, 15]) { c.strokeStyle = 'rgba(120,95,40,.6)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x, -17); c.lineTo(x, -11); c.stroke(); }
  },
});
// a tiny star (the bunk bed's glow sticker)
function star(c, x, y, r, col) { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } poly(c, pts, col, INK, 0.4); }
Object.assign(FURN_DRAW, {
  dartboard: (c, t, p) => onWall(c, p, () => {
    for (const [r, col] of [[11, '#2f2a30'], [9, '#f3e3c0'], [7, '#e8584e'], [5, '#f3e3c0'], [3, '#3f9f6f'], [1.2, '#e8584e']]) circ(c, 0, -44, r, col, r === 11 ? INK : null, 0.9);
    c.strokeStyle = 'rgba(47,42,48,.6)'; c.lineWidth = 0.4; for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; c.beginPath(); c.moveTo(0, -44); c.lineTo(Math.cos(a) * 9, -44 + Math.sin(a) * 9); c.stroke(); }
    for (const [x, y] of [[2, -46], [-4, -40]]) { line(c, x, y, x + 5, y - 3, '#3d3a42', 0.8); poly(c, [x + 5, y - 3, x + 8, y - 5, x + 7, y - 2], '#f2c14e', null); }
  }),
  tool_wall: (c, t, p) => onWall(c, p, () => {
    box(c, -22, -58, 44, 26, 2, '#c9a87a', INK, 1); c.fillStyle = 'rgba(91,63,54,.35)'; for (let x = -19; x < 21; x += 4) for (let y = -55; y < -34; y += 4) c.fillRect(x, y, 0.8, 0.8);
    line(c, -16, -54, -16, -38, '#8f9aa3', 1.6); box(c, -19, -56, 6, 4, 1, '#3d3a42', INK, 0.4);   // hammer
    line(c, -7, -54, -7, -38, '#e8584e', 1.6); line(c, -7, -54, -4, -51, '#c9ccd2', 0.9);             // screwdriver
    c.beginPath(); c.arc(6, -46, 5, 0, TAU); c.strokeStyle = '#f2c14e'; c.lineWidth = 1.4; c.stroke();     // tape
    line(c, 15, -54, 15, -36, '#c9ccd2', 1.4); poly(c, [13, -54, 17, -54, 15, -57], '#c9ccd2', null);       // saw
  }),
  projector_screen: (c, t, p) => onWall(c, p, () => {
    box(c, -32, -62, 64, 4, 2, '#5a5f66', INK, 0.8);
    box(c, -30, -58, 60, 30, 1, '#f8f6f0', INK, 0.8);
    if (!p.off) { const k = (t * 0.2) % 1; c.fillStyle = `hsla(${190 + k * 80},55%,70%,.6)`; c.fillRect(-27, -55, 54, 24); c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.arc(-14 + k * 28, -47, 4, 0, TAU); c.fill(); poly(c, [-27, -31, -10, -40, 6, -34, 27, -42, 27, -31], 'rgba(80,140,90,.6)', null); }
    line(c, 0, -28, 0, -25, '#5a5f66', 0.8); circ(c, 0, -24, 1, '#5a5f66', null);
  }),
});
// side models for the new pieces and the ones that only mirrored before
Object.assign(SIDE, {
  bed_double: () => [B(-22, 22, 0, 8, 0, 64, '#b77a4f', { grain: 1 }), B(-21, 21, 8, 14, 1, 63, '#fffaf0'), B(-4, 21, 14, 16, 2, 62, '#9fc4e8', { cushion: 2 }), B(-20, -8, 14, 18, 6, 58, '#fff'), B(-25, -21, 0, 32, -1, 65, '#a26a42', { grain: 1 })],
  bunk_bed: () => [B(-15, -12, 0, 70, 0, 3, '#c98f5a'), B(-15, -12, 0, 70, 37, 40, '#c98f5a'), B(12, 15, 0, 70, 0, 3, '#c98f5a'), B(12, 15, 0, 70, 37, 40, '#c98f5a'), B(-14, 14, 14, 22, 2, 38, '#9fd8c8'), B(-14, 14, 48, 56, 2, 38, '#f4a9b8')],
  nightstand: () => [B(-6, 6, 0, 18, 0, 18, '#d9a36a', { grain: 1 }), B(-1, 1, 18, 28, 8, 10, '#5a4a48'), B(-4, 4, 28, 35, 5, 13, '#f7de8c', { glow: 1 })],
  vanity: () => [...legs(14, 36, 16, '#a26a42', 1), B(-7, 7, 16, 20, 0, 36, '#e3b98a'), B(-7, -4, 20, 52, 6, 30, '#e3b98a'), B(-4, -3.6, 24, 50, 8, 28, '#d6eef7')],
  study_desk: () => [...legs(18, 44, 18, '#8a5f3e', 1), B(-9, 9, 18, 22, 0, 44, '#c98f5a', { grain: 1 }), B(-9, 9, 2, 18, 30, 43, '#b77a4f'), B(-5, 5, 22, 23, 14, 30, '#8f9aa3'), B(-5, -4, 23, 34, 14, 30, '#3d3a42')],
  desk_chair: () => [B(-6, 6, 0, 3, 2, 14, '#5a5f66'), B(-1, 1, 3, 10, 7, 9, '#5a5f66'), B(-6, 6, 10, 15, 1, 15, '#6f9fc8', { cushion: 1 }), B(-7, -4, 15, 31, 2, 14, '#6f9fc8')],
  clothes_rack: () => [B(-5, 5, 0, 2, 0, 3, '#5a4a48'), B(-5, 5, 0, 2, 37, 40, '#5a4a48'), B(-1, 1, 0, 46, 1, 3, '#5a4a48'), B(-1, 1, 0, 46, 37, 39, '#5a4a48'), B(-1, 1, 45, 47, 1, 39, '#5a4a48'), B(-4, 4, 22, 42, 4, 36, '#c9b6e8', { slats: 1 })],
  sewing_table: () => [...legs(14, 34, 16, '#3d3a42', 1), B(-7, 7, 16, 20, 0, 34, '#b77a4f'), B(-4, 4, 20, 30, 8, 28, '#3d3a42'), B(-4, 4, 30, 38, 8, 14, '#3d3a42')],
  floor_mirror: () => [B(-1.5, 1.5, 0, 54, 0, 16, '#e3b86a'), B(-4, 4, 0, 2, 2, 14, '#a26a42')],
  pool_table: () => [...legs(34, 60, 14, '#5a3a24', 3), B(-17, 17, 14, 24, 0, 60, '#8a4a2a', { grain: 1 }), B(-14, 14, 24, 25, 3, 57, '#2f8f5f')],
  foosball: () => [...legs(20, 40, 12, '#3d3a42', 2), B(-10, 10, 12, 28, 0, 40, '#c98f5a'), B(-8, 8, 28, 28.5, 2, 38, '#5fb070'), B(-12, 12, 26, 27.5, 8, 9, '#c9ccd2'), B(-12, 12, 26, 27.5, 30, 31, '#c9ccd2')],
  ping_pong: () => [...legs(30, 56, 12, '#5a5f66', 3), B(-15, 15, 12, 14, 0, 56, '#2f6f9f'), B(-15, 15, 14, 20, 27.5, 28.5, '#fffaf0')],
  jukebox: () => [B(-7, 7, 0, 34, 0, 24, '#b8603f'), B(-6, 6, 34, 44, 2, 22, '#b8603f'), B(6, 7.5, 16, 36, 3, 21, '#fff1d0', { glow: 1 })],
  karaoke_set: () => [B(-7, 7, 0, 12, 6, 34, '#5a3a24'), B(-3, 3, 12, 32, 8, 32, '#2f2a30'), B(-6, 6, 0, 26, 0, 6, '#3d3a42'), B(-6, 6, 0, 26, 34, 40, '#3d3a42')],
  workbench: () => [...legs(18, 50, 18, '#8a5f3e', 2), B(-9, 9, 18, 22, 0, 50, '#c99a5e', { grain: 1 }), B(-6, 6, 0, 5, 6, 18, '#e8584e'), B(-4, 4, 22, 30, 36, 46, '#7aa38a')],
  washing_machine: () => [B(-9, 9, 0, 28, 0, 22, '#f4f8fb'), B(-9, 9, 23, 28, 0, 22, '#dfe8ee'), B(9, 10, 6, 18, 5, 17, '#c9d3dc')],
  pantry_shelf: () => [B(-7, 7, 0, 52, 0, 38, '#b77a4f', { grain: 1 }), B(-6, 6, 4, 50, 1, 37, '#f2c14e', { slats: 1 })],
  fish_sauce_barrels: () => [B(-9, 9, 0, 26, 0, 18, '#a8703f', { slats: 1 }), B(-8, 8, 0, 23, 19, 35, '#a8703f', { slats: 1 })],
  weights_rack: () => [B(-1, 1, 0, 30, 1, 3, '#3d3a42'), B(-1, 1, 0, 30, 33, 35, '#3d3a42'), B(-5, 5, 0, 2, 0, 36, '#3d3a42'), B(-2, 2, 21, 31, 0, 36, '#e8584e'), B(-3, 3, 8, 12, 4, 32, '#3d3a42')],
  treadmill: () => [B(-20, 20, 0, 6, 1, 21, '#3d3a42'), B(14, 17, 6, 34, 1, 3, '#8f9aa3'), B(14, 17, 6, 34, 19, 21, '#8f9aa3'), B(14, 20, 34, 38, 1, 21, '#5a5f66')],
  co_tuong_table: () => [...legs(16, 28, 14, '#8a5f3e', 2).map(q => ({ ...q, z0: q.z0 + 10, z1: q.z1 + 10 })), B(-8, 8, 14, 20, 10, 38, '#d9b27a'), B(-6, 6, 20, 21, 13, 35, '#f3d9a4'), B(-4, 4, 0, 10, 0, 8, '#c98f5a'), B(-4, 4, 0, 10, 40, 48, '#c98f5a')],
  sap_go: () => [B(-15, 15, 0, 14, 0, 56, '#6b3a2a', { grain: 1 }), B(-15, 15, 14, 22, -1, 57, '#8a4a32'), B(-4, 4, 22, 28, 18, 36, '#e9c46f')],
  altar_cabinet: () => [B(-8, 8, 0, 30, 0, 44, '#7a3a26', { grain: 1 }), B(-9, 9, 30, 33, -2, 46, '#5a2a1c'), B(-3, 3, 33, 40, 24, 32, '#c9a15a'), B(-2, 2, 33, 42, 4, 8, '#e8584e', { glow: 1 })],
  bamboo_bench: () => [...legs(14, 46, 12, '#b99a52', 1), B(-7, 7, 12, 15, 0, 46, '#d9c27a', { slats: 1 })],
  lounge_sofa: () => [B(-7, 7, 0, 10, 0, 46, '#93395e'), B(-7, -2, 10, 26, 0, 46, '#7a2f4f'), B(-2, 7, 10, 13, 4, 42, '#93395e', { cushion: 2 }), B(-7, 7, 10, 20, 0, 4, '#7a2f4f'), B(-7, 7, 10, 20, 42, 46, '#7a2f4f')],
  arcade_cabinet: () => [B(-7, 7, 0, 46, 0, 26, '#6f5fc8'), B(2, 8, 22, 28, 2, 24, '#3d3a42'), B(-7, 4, 46, 52, 0, 26, '#f36d86')],
  tea_set: () => [...legs(14, 36, 6, '#8a5f3e', 2), B(-7, 7, 6, 10, 0, 36, '#c98f5a'), B(-3, 3, 10, 18, 6, 14, '#6f9fc8'), B(-2, 2, 10, 13, 20, 24, '#fff'), B(-2, 2, 10, 13, 26, 30, '#fff')],
  cat_tower: () => [B(-7, 7, 0, 4, 0, 32, '#c9b6a0'), B(-2, 2, 4, 40, 6, 10, '#d9b27a', { slats: 1 }), B(-2, 2, 4, 28, 22, 26, '#d9b27a', { slats: 1 }), B(-6, 6, 26, 30, 16, 32, '#c9b6a0'), B(-6, 6, 40, 44, 0, 16, '#c9b6a0')],
  surfboard_rack: () => [B(-5, 5, 0, 4, 0, 32, '#8a5a3a'), B(-1.5, 1.5, 4, 44, 4, 8, '#6fbfb0'), B(-1.5, 1.5, 4, 44, 14, 18, '#ff8fb0'), B(-1.5, 1.5, 4, 44, 24, 28, '#ffd35a')],
  ship_model: () => [B(-5, 5, 0, 4, 0, 36, '#8a5a3a'), B(-3, 3, 4, 12, 4, 32, '#a8563f'), B(-0.6, 0.6, 12, 34, 17, 19, '#5b3f36'), B(-0.4, 0.4, 16, 30, 8, 28, '#fffaf0')],
  bottle_ship: () => [B(-5, 5, 0, 3, 0, 22, '#8a5a3a'), B(-6, 6, 3, 17, 1, 21, 'rgba(190,230,240,.6)', { water: 1 })],
});

// nature finds (systems/nature.js): a jar of fireflies; the fishing tournament's mounted fish
FURN_DRAW.firefly_jar = (c, t, p) => {
  shadow(c, 0, 1, 7, 2, 0.14);
  c.beginPath(); c.moveTo(-6, -2); c.lineTo(-6, -16); c.quadraticCurveTo(-6, -19, -3, -19); c.lineTo(3, -19); c.quadraticCurveTo(6, -19, 6, -16); c.lineTo(6, -2); c.quadraticCurveTo(6, 0, 3, 0); c.lineTo(-3, 0); c.quadraticCurveTo(-6, 0, -6, -2);
  c.fillStyle = 'rgba(200,235,245,.45)'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
  box(c, -4.5, -22, 9, 3.5, 1, '#c9955e', INK, 0.6); line(c, -3, -20.5, 3, -20.5, 'rgba(91,63,54,.4)', 0.5);
  for (let i = 0; i < 6; i++) { const a = t * (0.8 + i * 0.13) + i * 2.1, x = Math.cos(a) * 3.4, y = -9 + Math.sin(a * 1.3) * 5.5, k = (Math.sin(t * 3 + i * 1.7) + 1) / 2;
    c.fillStyle = `rgba(255,245,150,${0.35 + k * 0.65})`; c.beginPath(); c.arc(x, y, 0.9 + k * 0.5, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(-4.6, -16, 1.2, 12);
  if (!p.preview) g(p, 0, -10, 24, 'rgba(255,240,140,.45)');
};
FURN_DRAW.fish_plaque = (c, t, p) => onWall(c, p, () => {
  box(c, -17, -56, 34, 22, 4, '#8a5a3a', INK, 1); box(c, -15, -54, 30, 18, 3, '#b77a4f', null);
  c.beginPath(); c.ellipse(-1, -45, 10, 4.6, 0, 0, TAU); c.fillStyle = '#7fb3d0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
  poly(c, [8, -45, 14, -49, 14, -41], '#6a9fbf', INK, 0.7); poly(c, [-4, -49, 0, -53, 3, -49], '#6a9fbf', INK, 0.5);
  circ(c, -8, -46, 1, INK, null); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-2, -47, 5, 1.2, 0, 0, TAU); c.fill();
  box(c, -6, -38.5, 12, 3, 1, '#f2c14e', INK, 0.4);
});
