// Characters: every person is drawn by the villager model (gfx/villager.js).
// This module keeps the shared entry point plus emotes and sparkles.

import { TAU } from '../core/util.js';
import { INK, ell, circ, heart } from './draw.js';
import { drawVillager } from './villager.js';

export const EL = 2.4;                  // portrait framing offset (used to centre faces in UI canvases)
export function viewOf(dir) { return dir === 'up' ? 'back' : dir === 'left' || dir === 'right' ? 'side' : 'front'; }
export function drawHuman(c, a, t) {
  if (!a.umbrella || a.sit || a.act === 'sleep') return drawVillager(c, a, t);
  // a rainy day: the umbrella is held up in the right hand, the canopy drawn over the head
  const sc = a.look?.scale || 1, side = a.dir === 'left' ? -1 : 1, sway = Math.sin(t * 2 + (a.seed || 0)) * 0.05;
  drawVillager(c, a, t);
  c.save(); c.scale(sc, sc); c.translate(side * 13, 0); c.rotate(sway - side * 0.12);
  c.strokeStyle = '#5b3f36'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(0, -26); c.lineTo(0, -66); c.stroke();
  c.beginPath(); c.moveTo(0, -26); c.quadraticCurveTo(2.5, -23, 3, -25.5); c.stroke();
  const col = a.umbrella, R = 21;
  c.beginPath(); c.moveTo(-R, -58); c.quadraticCurveTo(-R, -76, 0, -78); c.quadraticCurveTo(R, -76, R, -58);
  for (let i = 4; i >= 0; i--) { const x0 = -R + i * (2 * R / 5), x1 = x0 + 2 * R / 5; c.quadraticCurveTo((x0 + x1) / 2 + 0, -61, x0, -58); }
  c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = '#5b3f36'; c.lineWidth = 1; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(-R * 0.6, -61); c.quadraticCurveTo(-R * 0.5, -73, -2, -75); c.quadraticCurveTo(-R * 0.25, -70, -R * 0.2, -60); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(91,63,54,.35)'; c.lineWidth = 0.6; for (const x of [-R * 0.6, -R * 0.2, R * 0.2, R * 0.6]) { c.beginPath(); c.moveTo(0, -78); c.quadraticCurveTo(x * 0.6, -70, x, -59.5); c.stroke(); }
  c.fillStyle = '#5b3f36'; c.beginPath(); c.arc(0, -79, 1.2, 0, TAU); c.fill();
  c.restore();
}

// Emotes float above a character's head. `k` is 0..1 lifetime progress.
export function drawEmote(c, type, x, y, k, t) {
  const pop = k < 0.15 ? (k / 0.15) : 1;
  const s = 0.6 + 0.4 * Math.min(1, pop * 1.25);
  const fade = k > 0.85 ? 1 - (k - 0.85) / 0.15 : 1;
  c.save(); c.translate(x, y - 4 * Math.min(1, k * 4)); c.scale(s, s); c.globalAlpha = fade;
  const bubble = () => { c.beginPath(); c.ellipse(0, 0, 8.5, 7.5, 0, 0, TAU); c.fillStyle = '#fffaf0'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); c.beginPath(); c.moveTo(-2, 6.6); c.lineTo(0, 10.5); c.lineTo(2.6, 6.4); c.fillStyle = '#fffaf0'; c.fill(); c.stroke(); c.fillStyle = '#fffaf0'; c.fillRect(-1.6, 5.2, 3.8, 2); };
  switch (type) {
    case '!': bubble(); c.fillStyle = '#ef6b6b'; c.beginPath(); c.roundRect ? c.roundRect(-1.3, -5, 2.6, 6.6, 1.3) : c.rect(-1.3, -5, 2.6, 6.6); c.fill(); circ(c, 0, 3.6, 1.4, '#ef6b6b', null); break;
    case '?': bubble(); c.font = '900 11px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#6c8fd6'; c.fillText('?', 0, 0.6); break;
    case '...': bubble(); for (let i = -1; i <= 1; i++) circ(c, i * 3.3, 0, 1.2 + 0.4 * Math.max(0, Math.sin(t * 6 - i)), INK, null); break;
    case 'heart': heart(c, 0, 2, 6.5 + Math.sin(t * 8) * 0.6, '#f36d86'); break;
    case 'note': c.fillStyle = '#7a5cc8'; c.strokeStyle = INK; c.lineWidth = 0.8; ell(c, -2, 3, 2.6, 2, '#8e6ee0'); c.fillRect(0, -6, 1.3, 9); c.beginPath(); c.moveTo(1, -6); c.quadraticCurveTo(5, -4, 4, -1); c.stroke(); break;
    case 'sweat': c.beginPath(); c.moveTo(0, -5); c.quadraticCurveTo(4.5, 1, 0, 3.6); c.quadraticCurveTo(-4.5, 1, 0, -5); c.fillStyle = '#9fd4f5'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); break;
    case 'angry': c.strokeStyle = '#e25a5a'; c.lineWidth = 1.8; c.lineCap = 'round'; for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.moveTo(sx * 1.4, sy * 4.6); c.quadraticCurveTo(sx * 1.4, sy * 1.4, sx * 4.6, sy * 1.4); c.stroke(); } break;
    case 'sparkle': for (let i = 0; i < 3; i++) { const an = t * 2 + i * 2.1; drawSpark(c, Math.cos(an) * 6, Math.sin(an) * 4, 2.6 + Math.sin(t * 7 + i), '#ffd84d'); } break;
    case 'zzz': c.font = '900 8px Nunito, sans-serif'; c.fillStyle = '#7e8fc9'; c.textAlign = 'center'; for (let i = 0; i < 3; i++) { const kk = (t * 0.6 + i / 3) % 1; c.globalAlpha = fade * (1 - kk); c.fillText('z', 2 + kk * 7, -kk * 12); } break;
    case 'coin': circ(c, 0, 0, 5, '#ffd35a'); circ(c, 0, 0, 3.2, null, '#e3a52c', 0.9); break;
    case 'think': bubble(); circ(c, -2.4, 0, 1.2, INK, null); circ(c, 2.4, 0, 1.2, INK, null); break;
    case 'happy': bubble(); c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.arc(-2.6, 0, 1.4, Math.PI, TAU); c.moveTo(3.9, 0); c.arc(2.6, 0, 1.4, Math.PI, TAU); c.moveTo(-2.4, 2.4); c.quadraticCurveTo(0, 4.4, 2.4, 2.4); c.stroke(); break;
    case 'sad': bubble(); c.strokeStyle = INK; c.lineWidth = 1; c.beginPath(); c.moveTo(-3.6, -0.6); c.lineTo(-1.4, -0.6); c.moveTo(1.4, -0.6); c.lineTo(3.6, -0.6); c.moveTo(-2.4, 3.4); c.quadraticCurveTo(0, 1.6, 2.4, 3.4); c.stroke(); break;
  }
  c.restore();
}
export function drawSpark(c, x, y, r, col) {
  c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r);
  c.fillStyle = col; c.fill();
}
