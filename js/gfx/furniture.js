// Interior furniture and fixtures. Base point = front-centre of the footprint.

import { TAU, shade, rng } from '../core/util.js';
import { INK, ell, circ, box, poly, line, limb, shadow, text, heart } from './draw.js';
import { LIGHT, glows, lanternShape } from './props.js';
import { ICONS, drawIcon } from './food.js';
import { drawHuman } from './character.js';

const g = (p, x, y, r, col) => glows.push([p.x + x, p.y + y, r, col]);

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
  hammock(c, t, p) { const sw = Math.sin(t * 1.4) * 2; for (const x of [-28, 28]) limb(c, [x, 0, x, -30], 2.4, '#8a5f3e'); c.beginPath(); c.moveTo(-28, -24); c.quadraticCurveTo(sw, -2, 28, -24); c.quadraticCurveTo(sw, -12, -28, -24); c.fillStyle = '#f28f7c'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); c.strokeStyle = '#fff5df'; for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(-28 + i * 11, -22 + Math.abs(i - 2.5) * 2); c.lineTo(-26 + i * 11 + sw * 0.3, -9 + Math.abs(i - 2.5) * 2); c.stroke(); } },
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
  prepTable(c, t, p) {
    counterBox(c, p.w || 60, 28, 14, '#c98f5a', '#e6bc85');
    box(c, -20, -40, 28, 10, 2, '#efc893', INK, 0.8); // cutting board
    c.save(); c.translate(16, -36); c.rotate(-0.4); poly(c, [0, 0, 2, 0, 2, -9, 0, -8], '#e6ecef', INK, 0.5); c.restore();
    for (let i = 0; i < 3; i++) { ell(c, -22 + i * 9, -30, 4, 2, '#fff', INK, 0.6); }
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
  photoWall(c, t, p) { for (let i = 0; i < 4; i++) { const x = -24 + i * 16, y = -62 + (i % 2) * 6; box(c, x - 6, y, 12, 14, 1, '#fff'); box(c, x - 4.5, y + 1.5, 9, 8, 0.6, ['#aee4ed', '#f7de8c', '#f4a9b8', '#9fd8c8'][i], null); } line(c, -32, -63, 32, -63, INK, 0.6); },
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
  aisleSign(c, t, p) {
    line(c, -10, -60, -10, -52, INK, 0.8); line(c, 10, -60, 10, -52, INK, 0.8);
    c.save(); c.translate(0, -46); c.rotate(Math.sin(t * 1.3 + p.x) * 0.03);
    box(c, -18, -6, 36, 12, 3, p.col || '#6fbf73', INK, 0.8); text(c, p.label || '', 0, 0.5, 5.6, '#fff', 900);
    c.restore();
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
export { ICONS, drawIcon };

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
    if (!p.bare) { box(c, -2.5, -25, 5, 7, 2, '#9fd8c8', INK, 0.6); for (let i = 0; i < 3; i++) circ(c, -2 + i * 2, -26.5 - (i % 2) * 1.5, 1.4, ['#ff8fb0', '#ffd35a', '#fff'][i], INK, 0.3); }
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
    if (LIGHT.night > 0.2) { c.fillStyle = 'rgba(255,230,160,.25)'; c.beginPath(); c.moveTo(-8, -36); c.lineTo(8, -36); c.lineTo(16, -8); c.lineTo(-16, -8); c.closePath(); c.fill(); }
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
    const hue = (t * 30) % 360; c.save(); c.beginPath(); c.roundRect ? c.roundRect(-10, -27, 17, 14, 3) : c.rect(-10, -27, 17, 14); c.clip();
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
