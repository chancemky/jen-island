// Shared canvas primitives. Everything in the game is drawn with a soft warm
// outline so characters, props and buildings read as one art style.

import { TAU } from '../core/util.js';

export const INK = '#5b3f36';
export const INK_SOFT = 'rgba(91,63,54,.55)';

export function ell(c, x, y, rx, ry, fill, stroke = INK, lw = 1, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
export function circ(c, x, y, r, fill, stroke = INK, lw = 1) { ell(c, x, y, r, r, fill, stroke, lw); }

export function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
export function box(c, x, y, w, h, r, fill, stroke = INK, lw = 1) {
  rrect(c, x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
export function poly(c, pts, fill, stroke = INK, lw = 1, close = true) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  if (close) c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
export function line(c, x1, y1, x2, y2, color = INK, lw = 1) {
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
  c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'round'; c.stroke();
}
// Stroke with an outline underneath: a thick "limb".
export function limb(c, pts, w, color, outline = INK) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
  if (outline) { c.strokeStyle = outline; c.lineWidth = w + 2; c.stroke(); }
  c.strokeStyle = color; c.lineWidth = w; c.stroke();
}
export function shadow(c, x, y, rx, ry, a = 0.2) {
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU);
  c.fillStyle = `rgba(60,40,30,${a})`; c.fill();
}
export function glow(c, x, y, r, color, a = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,220,150,0)');
  c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1;
}
export function heart(c, x, y, s, fill, stroke = INK, lw = 1) {
  c.beginPath();
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
  c.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
export function star(c, x, y, r, fill, stroke = INK, lw = 1, points = 5, inner = 0.48) {
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points, rr = i % 2 ? r * inner : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
}
export function text(c, str, x, y, size, color = INK, weight = 900, align = 'center', outline = null, ow = 3) {
  c.font = `${weight} ${size}px Nunito, ui-rounded, system-ui, sans-serif`;
  c.textAlign = align; c.textBaseline = 'middle';
  if (outline) { c.lineJoin = 'round'; c.strokeStyle = outline; c.lineWidth = ow; c.strokeText(str, x, y); }
  c.fillStyle = color; c.fillText(str, x, y);
}
