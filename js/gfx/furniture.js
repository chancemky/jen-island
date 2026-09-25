// Interior furniture and fixtures. Base point = front-centre of the footprint.

import { TAU, shade, rng } from '../core/util.js';
import { INK, ell, circ, box, poly, line, limb, shadow, text } from './draw.js';
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
      c.save(); c.translate(-6, -30); c.rotate(-Math.PI / 2 + 0.05); c.scale(0.95, 0.95);
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
  pass(c, t, p) { counterBox(c, p.w || 60, 30, 10, '#e9d8bf', '#fffdf6'); },
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
