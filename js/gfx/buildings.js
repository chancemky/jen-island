// Buildings, drawn in a soft 3/4 top-down view: the front wall faces the
// camera (south) and the roof covers the footprint behind it.
// Every building takes a state object so it can look broken, get repaired
// piece by piece, level up, open for business and swing its door.

import { TAU, shade, mix, clamp, rng } from '../core/util.js';
import { INK, ell, circ, box, poly, line, limb, shadow, text, rrect } from './draw.js';
import { LIGHT, glows, lanternShape } from './props.js';
import { G, T, tr } from '../systems/state.js';

const glow = (b, x, y, r, col) => glows.push([b.x + x, b.y + y, r, col]);
const nightA = () => LIGHT.night;
const winLit = () => mix('#fff4c8', '#ffd27a', 0.5);

// ---------------------------------------------------------------- pieces
function wallFace(c, w, h, col, opt = {}) {
  const x = -w / 2;
  box(c, x, -h, w, h, 3, col);
  c.save(); rrect(c, x, -h, w, h, 3); c.clip();
  if (opt.planks) { c.strokeStyle = shade(col, -26); c.lineWidth = 0.8; for (let y = -h + 7; y < 0; y += 7) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke(); } for (let i = 0; i < 12; i++) { const px = x + ((i * 37) % w), py = -h + (i * 7) % h; line(c, px, py, px, py + 7, shade(col, -26), 0.6); } }
  if (opt.bricks) { c.strokeStyle = shade(col, -14); c.lineWidth = 0.6; for (let y = -h + 6, r = 0; y < 0; y += 6, r++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.stroke(); } }
  // soft top shadow under the eave + base trim
  c.fillStyle = 'rgba(80,50,40,.14)'; c.fillRect(x, -h, w, 5);
  c.fillStyle = shade(col, -18); c.fillRect(x, -6, w, 6);
  if (opt.stains) { c.fillStyle = 'rgba(90,80,70,.18)'; for (let i = 0; i < 6; i++) { const R = rng(i + 9); ell(c, x + R() * w, -R() * h, 5 + R() * 9, 3 + R() * 5, 'rgba(90,80,70,.14)', null); } }
  c.restore();
  box(c, x, -h, w, h, 3, null);
}

// Vietnamese tile roof: rows of curved terracotta tiles, upturned eaves and a ridge.
function tileRoof(c, w, h, wallH, col, opt = {}) {
  const ov = opt.overhang ?? 10, y0 = -wallH + 2, top = y0 - h;
  const L = -w / 2 - ov, R = w / 2 + ov;
  c.beginPath();
  c.moveTo(L - 6, y0 - 8);
  c.quadraticCurveTo(L, y0 + 2, L + 12, y0 + 1);
  c.lineTo(R - 12, y0 + 1);
  c.quadraticCurveTo(R, y0 + 2, R + 6, y0 - 8);
  c.lineTo(R - 4, top + 6);
  c.lineTo(L + 4, top + 6);
  c.closePath();
  c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
  c.save(); c.clip();
  const rows = Math.max(3, Math.round(h / 8));
  for (let r = 0; r < rows; r++) {
    const y = top + 8 + (r + 1) * ((y0 - top - 6) / rows);
    c.strokeStyle = shade(col, -30); c.lineWidth = 0.8;
    c.beginPath();
    for (let x = L; x < R; x += 9) { c.moveTo(x, y); c.quadraticCurveTo(x + 4.5, y - 4, x + 9, y); }
    c.stroke();
    if (opt.missing) { const Rn = rng(r * 13 + 5); for (let k = 0; k < 3; k++) { if (Rn() < 0.5) ell(c, L + Rn() * (R - L), y - 3, 5 + Rn() * 5, 3, '#4a3a34', null); } }
  }
  c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(L, top, R - L, (y0 - top) * 0.35);
  c.restore();
  // ridge with curled ends
  box(c, L + 8, top + 1, R - L - 16, 7, 3, shade(col, -22));
  for (const s of [-1, 1]) { const ex = s < 0 ? L + 8 : R - 8; c.beginPath(); c.moveTo(ex, top + 4); c.quadraticCurveTo(ex + s * 9, top + 2, ex + s * 8, top - 6); c.strokeStyle = INK; c.lineWidth = 3.6; c.stroke(); c.strokeStyle = shade(col, -22); c.lineWidth = 2; c.stroke(); }
  if (opt.ridgeOrnament) { circ(c, 0, top - 2, 4, '#f2c14e'); }
}
function tinRoof(c, w, h, wallH, col, opt = {}) {
  const ov = opt.overhang ?? 7, y0 = -wallH + 2, top = y0 - h;
  const L = -w / 2 - ov, R = w / 2 + ov;
  const tilt = opt.tilt || 0;
  c.save(); c.rotate(tilt);
  poly(c, [L, y0, R, y0, R - 3, top, L + 3, top], col, INK, 1.2);
  c.save(); c.beginPath(); c.moveTo(L, y0); c.lineTo(R, y0); c.lineTo(R - 3, top); c.lineTo(L + 3, top); c.closePath(); c.clip();
  for (let x = L; x < R; x += 6) { c.fillStyle = shade(col, x % 12 < 6 ? -14 : 8); c.fillRect(x, top, 3, y0 - top); }
  if (opt.rust) { for (let i = 0; i < 9; i++) { const Rn = rng(i + 3); ell(c, L + Rn() * (R - L), top + Rn() * (y0 - top), 5 + Rn() * 8, 3 + Rn() * 3, 'rgba(170,90,50,.45)', null); } }
  if (opt.holes) { for (const [hx, hy] of opt.holes) { ell(c, hx, top + hy, 7, 4, '#3a2c28', INK, 0.8); } }
  c.restore();
  line(c, L, y0, R, y0, INK, 2);
  c.restore();
}
function clothRoof(c, w, h, wallH, cols, opt = {}) {
  const y0 = -wallH, top = y0 - h, L = -w / 2 - 6, R = w / 2 + 6;
  poly(c, [L, y0, R, y0, R - 8, top, L + 8, top], cols[0], INK, 1.1);
  c.save(); c.beginPath(); c.moveTo(L, y0); c.lineTo(R, y0); c.lineTo(R - 8, top); c.lineTo(L + 8, top); c.closePath(); c.clip();
  const n = Math.round(w / 12);
  for (let i = 0; i < n; i += 2) { c.fillStyle = cols[1]; c.beginPath(); c.moveTo(L + (i / n) * (R - L), y0); c.lineTo(L + ((i + 1) / n) * (R - L), y0); c.lineTo(L + 8 + ((i + 1) / n) * (R - L - 16), top); c.lineTo(L + 8 + (i / n) * (R - L - 16), top); c.fill(); }
  c.restore();
  // scalloped valance
  c.beginPath(); c.moveTo(L, y0);
  const sc = (R - L) / Math.round((R - L) / 11);
  for (let x = L; x < R - 0.1; x += sc) c.quadraticCurveTo(x + sc / 2, y0 + 7 + (opt.torn && (x | 0) % 3 === 0 ? 6 : 0), x + sc, y0);
  c.fillStyle = cols[opt.torn ? 0 : 1]; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
}
function door(c, x, w, h, col, open = 0, opt = {}) {
  const y = -h;
  box(c, x - w / 2 - 2, y - 2, w + 4, h + 2, 3, shade(col, -30));
  // dark doorway behind the door
  box(c, x - w / 2, y, w, h, 2, opt.inside || '#3d2c26', null);
  if (open > 0.02) { const g = c.createLinearGradient(0, y, 0, 0); g.addColorStop(0, 'rgba(255,220,150,.5)'); g.addColorStop(1, 'rgba(255,220,150,.1)'); c.fillStyle = g; c.fillRect(x - w / 2, y, w, h); }
  // door leaf swings inward (narrows)
  const lw = w * (1 - open * 0.82);
  if (opt.double) {
    const hw = lw / 2;
    box(c, x - w / 2, y, hw, h, 2, col); box(c, x + w / 2 - hw, y, hw, h, 2, col);
    if (open < 0.5) { circ(c, x - 2, y + h * 0.55, 1, '#f2c14e', INK, 0.5); circ(c, x + 2, y + h * 0.55, 1, '#f2c14e', INK, 0.5); }
  } else {
    box(c, x - w / 2, y, lw, h, 2, col);
    if (lw > 5) { box(c, x - w / 2 + 2.5, y + 3, lw - 5, h * 0.36, 1.5, shade(col, 14), INK, 0.6); circ(c, x - w / 2 + lw - 3, y + h * 0.56, 1.1, '#f2c14e', INK, 0.5); }
  }
  if (opt.mat !== false) ell(c, x, 2, w / 2 + 2, 2.4, opt.matCol || '#c9955e', INK, 0.7);
}
function windowBox(c, x, y, w, h, opt = {}) {
  const lit = nightA() > 0.05 && !opt.broken;
  box(c, x - w / 2, y, w, h, 2, lit ? winLit() : opt.glass || '#a9dcee');
  if (!lit && !opt.broken) { c.save(); rrect(c, x - w / 2, y, w, h, 2); c.clip(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(x - w / 2, y + h * 0.6); c.lineTo(x - w / 2 + w * 0.5, y); c.lineTo(x - w / 2 + w * 0.75, y); c.lineTo(x - w / 2, y + h); c.fill(); c.restore(); }
  line(c, x, y, x, y + h, INK, 0.8); line(c, x - w / 2, y + h / 2, x + w / 2, y + h / 2, INK, 0.8);
  if (opt.shutter) { for (const s of [-1, 1]) { const sx = x + s * (w / 2 + 4); box(c, sx - 4, y - 1, 8, h + 2, 1.5, opt.shutter); for (let k = 1; k < 5; k++) line(c, sx - 3, y + (h + 2) * k / 5, sx + 3, y + (h + 2) * k / 5, shade(opt.shutter, -30), 0.6); } }
  if (opt.box) { box(c, x - w / 2 - 3, y + h, w + 6, 5, 1.5, '#b9905a'); for (let i = 0; i < 4; i++) circ(c, x - w / 2 + 2 + i * (w - 4) / 3, y + h - 1, 2.2, ['#ff8fb0', '#ffd35a', '#fff', '#ff8fb0'][i], INK, 0.5); }
  if (opt.broken) { line(c, x - w / 2 - 2, y - 1, x + w / 2 + 2, y + h + 1, '#a07a50', 3.4); line(c, x + w / 2 + 2, y - 1, x - w / 2 - 2, y + h + 1, '#a07a50', 3.4); }
  if (lit) glow(opt.b, x, y + h / 2, 26 + w * 0.4, 'rgba(255,210,130,.5)');
}
function signBoard(c, x, y, w, h, label, bg, fg = '#fff', opt = {}) {
  c.save(); c.translate(x, y); if (opt.tilt) c.rotate(opt.tilt);
  box(c, -w / 2, -h / 2, w, h, 3, bg);
  box(c, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 2, null, shade(bg, 30), 0.8);
  const fs = Math.min(h * 0.55, (w - 8) / Math.max(4, label.length) * 1.7);
  text(c, label, 0, 0.6, fs, fg, 900, 'center', opt.outline || null, 2);
  c.restore();
}
function awning(c, x, y, w, cols, depth = 12, opt = {}) {
  const L = x - w / 2, R = x + w / 2, ext = depth * (opt.extend ?? 1);
  poly(c, [L, y, R, y, R + 3, y + ext, L - 3, y + ext], cols[0], INK, 1);
  c.save(); c.beginPath(); c.moveTo(L, y); c.lineTo(R, y); c.lineTo(R + 3, y + ext); c.lineTo(L - 3, y + ext); c.closePath(); c.clip();
  const n = Math.max(4, Math.round(w / 10));
  for (let i = 0; i < n; i += 2) { c.fillStyle = cols[1]; c.beginPath(); c.moveTo(L + (i / n) * w, y); c.lineTo(L + ((i + 1) / n) * w, y); c.lineTo(L - 3 + ((i + 1) / n) * (w + 6), y + ext); c.lineTo(L - 3 + (i / n) * (w + 6), y + ext); c.fill(); }
  c.restore();
  c.beginPath(); c.moveTo(L - 3, y + ext);
  const sc = (w + 6) / n;
  for (let i = 0; i < n; i++) c.quadraticCurveTo(L - 3 + (i + 0.5) * sc, y + ext + 5, L - 3 + (i + 1) * sc, y + ext);
  c.fillStyle = cols[1]; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
}
function weeds(c, w, t) { for (let i = 0; i < 7; i++) { const x = -w / 2 + 4 + ((i * 29) % (w - 8)), sw = Math.sin(t * 2 + i) * 1.2; c.strokeStyle = '#7fae4d'; c.lineWidth = 1.3; c.lineCap = 'round'; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * 2, 0); c.quadraticCurveTo(x + k * 3, -5, x + k * 3.5 + sw, -9); c.stroke(); } } }
function cobweb(c, x, y, s = 1) { c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.5; for (let i = 0; i < 5; i++) { const a = i / 4 * Math.PI / 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 12 * s, y + Math.sin(a) * 12 * s); c.stroke(); } for (let r = 4; r <= 12; r += 4) { c.beginPath(); c.arc(x, y, r * s, 0, Math.PI / 2); c.stroke(); } }
function stringLights(c, w, y, t, b) {
  c.beginPath(); c.moveTo(-w / 2, y); c.quadraticCurveTo(0, y + 8, w / 2, y); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
  const cols = ['#ffd35a', '#ff8a8a', '#8ad0ff', '#b9f08a', '#ffb3e0'];
  for (let i = 1; i < 10; i++) { const k = i / 10, x = -w / 2 + w * k, yy = y + Math.sin(k * Math.PI) * 8 * 0.5 * 2 * (1 - Math.abs(0.5 - k)); const on = nightA() > 0.05 ? 1 : 0.55 + 0.45 * Math.sin(t * 3 + i); circ(c, x, yy + 2, 1.8, cols[i % 5], INK, 0.4); if (nightA() > 0.05) glow(b, x, yy + 2, 10, `rgba(255,220,150,${0.35 * on})`); }
}

// ---------------------------------------------------------------- building types
// b = { x,y (door threshold), type, state:{repair,level,open,door,sign,...}, ... }

export function drawShed(c, t, b) {
  const s = b.state(), w = b.w || 100, h = 44;
  const k = clamp(s.repair ?? 1, 0, 1), broken = k < 0.02;
  const wallCol = mix('#a39286', s.color || '#f7e3c0', clamp(k * 1.4 - 0.4, 0, 1));
  shadow(c, 0, 2, w * 0.62, 10, 0.2);
  if (broken || k < 0.5) weeds(c, w, t);
  wallFace(c, w, h, wallCol, { planks: true, stains: k < 0.6 });
  // missing planks (holes) patch up during repair
  if (k < 0.34) { const holes = [[-30, -30], [22, -20], [-8, -14], [34, -34]]; holes.forEach(([hx, hy], i) => { if (k * 12 < i + 1) box(c, hx - 6, hy, 12, 6, 1, '#3a2c28', INK, 0.6); }); }
  // service hatch
  const hx = -14, hw = 50, hy = -h + 9, hh = 20;
  if (broken) { box(c, hx - hw / 2, hy, hw, hh, 2, '#6e5a4e'); line(c, hx - hw / 2 - 3, hy + 3, hx + hw / 2 + 3, hy + hh - 3, '#a07a50', 4); line(c, hx - hw / 2 - 3, hy + hh - 4, hx + hw / 2 + 3, hy + 4, '#a07a50', 4); }
  else {
    const lit = s.open || nightA() > 0.05;
    box(c, hx - hw / 2, hy, hw, hh, 2, s.open ? '#ffe9b8' : lit ? '#8a6a52' : '#6e5a4e');
    if (s.open) { glow(b, hx, hy + 10, 40, 'rgba(255,210,130,.5)'); for (let i = 0; i < 3; i++) { box(c, hx - 16 + i * 12, hy + 6, 6, 9, 1.4, ['#f0b04a', '#6b4431', '#f7a868'][i], INK, 0.5); } }
    // counter ledge
    box(c, hx - hw / 2 - 4, hy + hh - 1, hw + 8, 5, 2, shade(s.color || '#f7e3c0', -40));
    // hatch flap: closed = covers window, open = propped up as an awning
    const flap = s.flapOpen ?? (s.open ? 1 : 0);
    if (flap < 0.98) { const hgt = hh * (1 - flap); box(c, hx - hw / 2, hy, hw, hgt, 2, shade(wallCol, -14)); for (let y = hy + 5; y < hy + hgt - 2; y += 5) line(c, hx - hw / 2 + 2, y, hx + hw / 2 - 2, y, shade(wallCol, -34), 0.6); }
    if (flap > 0.02) {
      if ((s.level || 1) >= 2) awning(c, hx, hy - 2, hw + 10, [s.awning?.[0] || '#fff5df', s.awning?.[1] || '#f28f7c'], 13 * flap);
      else poly(c, [hx - hw / 2 - 2, hy, hx + hw / 2 + 2, hy, hx + hw / 2 + 6, hy - 10 * flap, hx - hw / 2 - 6, hy - 10 * flap], shade(wallCol, -10), INK, 1);
    }
  }
  // side door
  door(c, 32, 18, 32, broken ? '#8a7a6e' : s.doorCol || '#c98f5a', b.doorOpen || 0, { matCol: broken ? '#9a8a7a' : '#e8c47a' });
  if (broken) { line(c, 22, -30, 42, -6, '#a07a50', 3); }
  // roof: rusty with holes → fresh tin → tiled at level 3
  if (k < 0.66) tinRoof(c, w, 30, h, mix('#8a8a86', s.roof || '#6fbfb0', clamp((k - 0.34) * 3, 0, 1)), { rust: k < 0.5, holes: k < 0.4 ? [[-30, 12], [18, 8], [36, 18]].slice(0, 3 - Math.floor(k * 7)) : null, tilt: k < 0.34 ? -0.025 : 0 });
  else if ((s.level || 1) >= 3) tileRoof(c, w, 30, h, '#d9784f', { overhang: 8 });
  else tinRoof(c, w, 30, h, s.roof || '#6fbfb0');
  if (broken) { cobweb(c, -w / 2 + 2, -h + 2); cobweb(c, w / 2 - 14, -h + 3, 0.7); }
  // sign on the roof edge
  const label = s.sign || '???';
  if (k < 0.8) signBoard(c, -8, -h - 20, 56, 13, broken ? T('SHOP...', 'QUÁN...') : label, '#b8a898', '#6e5a4e', { tilt: broken ? 0.18 : 0.18 * (1 - k) });
  else signBoard(c, -8, -h - 22, 66, 15, label, s.signCol || '#e8584e', '#fff5df');
  if (!broken && (s.level || 1) >= 3) stringLights(c, w + 6, -h + 2, t, b);
  if (!broken && s.open) {
    // OPEN sign flips on the door
    const f = s.signFlip ?? 1;
    c.save(); c.translate(32, -h + 12); c.scale(1, Math.abs(Math.cos((1 - f) * Math.PI / 2)) * 0.9 + 0.1);
    box(c, -9, -4, 18, 8, 2, f > 0.5 ? '#6fbf73' : '#e8584e'); text(c, f > 0.5 ? T('OPEN', 'MỞ CỬA') : T('CLOSED', 'ĐÓNG'), 0, 0.3, 4.2, '#fff', 900); c.restore();
    // steam from the hatch
    for (let i = 0; i < 3; i++) { const kk = (t * 0.6 + i / 3) % 1; c.globalAlpha = 0.5 * (1 - kk); c.strokeStyle = '#fff'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(hx - 10 + i * 10, hy - 2 - kk * 14); c.quadraticCurveTo(hx - 7 + i * 10, hy - 6 - kk * 14, hx - 10 + i * 10, hy - 10 - kk * 14); c.stroke(); } c.globalAlpha = 1;
  } else if (!broken && k >= 1) { c.save(); c.translate(32, -h + 12); box(c, -9, -4, 18, 8, 2, '#b8a898'); text(c, T('CLOSED', 'ĐÓNG'), 0, 0.3, 4.4, '#fff', 900); c.restore(); }
  if (!broken && (s.level || 1) >= 2) lanternShape(c, -w / 2 + 4, -h + 2, 0.7, '#ea5a4f', t, b.x);
  if (!broken && (s.level || 1) >= 2 && nightA() > 0.05) glow(b, -w / 2 + 4, -h + 10, 26, 'rgba(255,190,110,.5)');
}

// What makes each home recognisable from the path.
function houseExtras(c, t, b, w, h) {
  switch (b.style) {
    case 'player': { // flower boxes, a dormer and a name plate with your name
      for (const x of [-Math.min(32, w * 0.5 - 20), Math.min(32, w * 0.5 - 20)]) { box(c, x - 13, -h + 31, 26, 5, 2, '#b77a4f', INK, 0.8); for (let i = 0; i < 4; i++) circ(c, x - 9 + i * 6, -h + 30, 2.2, ['#ff8fb0', '#ffd35a', '#fff', '#f36d86'][i], INK, 0.4); }
      box(c, -12, -h - 34, 24, 18, 3, b.wall || '#f7dd8a', INK, 1); box(c, -7, -h - 30, 14, 11, 2, '#bfe6ef', INK, 0.8); poly(c, [-15, -h - 34, 0, -h - 44, 15, -h - 34], b.roof || '#d9784f', INK, 1);
      const nm = (G.state?.player?.name || '').slice(0, 10);
      if (nm) signBoard(c, -w / 2 + 14, -18, 26, 7, nm, '#fff5df', INK);
      break;
    }
    case 'wood': { // Bà Tư: kumquat pots and a rocking chair on the porch
      for (const x of [-w / 2 - 6, w / 2 + 6]) { poly(c, [x - 6, 0, x + 6, 0, x + 5, -9, x - 5, -9], '#d9784f', INK, 0.8); circ(c, x, -16, 8, '#6fb356', INK, 0.8); for (let i = 0; i < 5; i++) circ(c, x - 5 + (i * 3.1) % 10, -20 + (i * 5) % 9, 1.6, '#ffa53a', null); }
      const rk = Math.sin(t * 1.4) * 0.08; c.save(); c.translate(-32, -2); c.rotate(rk); box(c, -7, -12, 14, 3, 1, '#a8763f', INK, 0.6); box(c, -7, -22, 3, 11, 1, '#a8763f', INK, 0.6); c.beginPath(); c.arc(0, 0, 9, Math.PI * 1.1, Math.PI * 1.9); c.strokeStyle = '#8a5f3e'; c.lineWidth = 1.6; c.stroke(); c.restore();
      break;
    }
    case 'student': { // Linh: bicycle, a balcony with books drying and a tiny satellite dish
      box(c, -w / 2 + 6, -h - 2, 40, 4, 1, '#8f9aa3', INK, 0.7); for (let i = 0; i < 6; i++) line(c, -w / 2 + 8 + i * 7, -h - 2, -w / 2 + 8 + i * 7, -h + 8, '#8f9aa3', 0.8);
      c.save(); c.translate(w / 2 + 14, 0); for (const x of [-7, 7]) { c.beginPath(); c.arc(x, -5, 5, 0, TAU); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke(); } line(c, -7, -5, 0, -12, '#6fbfb0', 1.6); line(c, 0, -12, 7, -5, '#6fbfb0', 1.6); line(c, 0, -12, 3, -15, INK, 1); box(c, -6, -16, 7, 3, 1, '#6fbfb0', INK, 0.5); c.restore();
      break;
    }
    case 'flowers': { // Cô Lan: flower buckets out front and a striped awning
      awning(c, 0, -h + 8, w - 20, ['#fff5df', '#f4a9b8'], 9);
      for (let i = 0; i < 5; i++) { const x = -w / 2 + 8 + i * 12; if (Math.abs(x) < 20) continue; box(c, x - 5, -8, 10, 8, 2, '#8fb7e0', INK, 0.7); for (let k = 0; k < 4; k++) circ(c, x - 3 + k * 2, -11 - (k % 2) * 2 + Math.sin(t * 2 + i + k) * 0.4, 2, ['#ff8fb0', '#ffd35a', '#fff', '#e97ad0'][(i + k) % 4], INK, 0.3); }
      break;
    }
    case 'garage': { // Anh Tuấn: a roll-up garage door and his taxi scooter sign
      // one wide garage door on the right (no window there), well clear of the front door
      const gx0 = 16, gx1 = w / 2 - 4;
      box(c, gx0 - 2, -h + 10, gx1 - gx0 + 4, h - 10, 2, shade(b.wall || '#d6e6f5', -22), INK, 0.8);
      box(c, gx0, -h + 13, gx1 - gx0, h - 13, 1.5, '#b9c3cb', INK, 0.8); for (let y = -h + 17; y < -2; y += 4) line(c, gx0 + 1, y, gx1 - 1, y, '#8a96a0', 0.6);
      box(c, (gx0 + gx1) / 2 - 4, -6, 8, 2.4, 1, '#6b737c', INK, 0.5);
      signBoard(c, -w / 2 + 18, -h - 4, 30, 8, 'TAXI', '#f7de8c', INK);
      break;
    }
    case 'clinic': { // Dr. Mai's clinic: white and mint, a glowing green cross, a ramp, a bench and opening hours
      box(c, -w / 2 + 1, -14, w - 2, 5, 1, '#6fbfb0', null);                                   // mint stripe
      // green cross light box on the roof edge
      box(c, -11, -h - 30, 22, 22, 4, '#fff', INK, 1); box(c, -3, -h - 27, 6, 16, 1, '#3fae5c', null); box(c, -8, -h - 22, 16, 6, 1, '#3fae5c', null);
      if (nightA() > 0.05) glow(b, 0, -h - 19, 30, 'rgba(120,230,150,.45)');
      signBoard(c, 0, -h + 4, 50, 8, T('DR. MAI\'S CLINIC', 'PHÒNG KHÁM BS. MAI'), '#3fae5c', '#fff');
      // blinds in the windows
      for (const x of [-Math.min(32, w * 0.5 - 20), Math.min(32, w * 0.5 - 20)]) for (let i = 0; i < 4; i++) line(c, x - 10, -h + 15 + i * 4, x + 10, -h + 15 + i * 4, 'rgba(255,255,255,.75)', 0.9);
      // ramp with a rail, opening hours plate, a bench and a first-aid box by the door
      poly(c, [12, 0, 30, 0, 30, -3, 12, -1], '#d8d2c8', INK, 0.7); line(c, 12, -9, 30, -12, '#9aa3ad', 1.2); line(c, 30, -12, 30, -3, '#9aa3ad', 1.2);
      box(c, -22, -26, 10, 12, 1.5, '#fffaf0', INK, 0.6); for (let i = 0; i < 3; i++) line(c, -20, -23 + i * 3, -14, -23 + i * 3, '#8a96a0', 0.6);
      box(c, -w / 2 - 14, -9, 20, 4, 1.5, '#8fb7e0', INK, 0.7); for (const x of [-w / 2 - 12, -w / 2 + 4]) line(c, x, -5, x, 0, INK, 1.2);
      limb(c, [w / 2 + 8, 0, w / 2 + 8, -16], 2, '#8a5f3e'); box(c, w / 2 + 2, -24, 12, 9, 3, '#e8584e'); box(c, w / 2 + 6.5, -22.5, 3, 6, 0.4, '#fff', null); box(c, w / 2 + 5, -21, 6, 3, 0.4, '#fff', null);
      break;
    }
    case 'painter': { // Vy: paint splotches and a sun-bleached canvas awning
      awning(c, 0, -h + 8, w - 24, ['#fffaf0', '#8fb7e0'], 9);
      for (let i = 0; i < 7; i++) circ(c, -w / 2 + 10 + (i * 37) % (w - 20), -8 - (i * 13) % 26, 2.2, ['#f28f7c', '#ffd35a', '#6fbfb0', '#c9b6e8'][i % 4], null);
      break;
    }
    case 'fisher': { // Chú Hải: nets drying and a paddle by the door
      c.save(); c.translate(-w / 2 - 10, 0); for (const x of [0, 26]) limb(c, [x, 0, x, -30], 1.6, '#8a5f3e'); c.strokeStyle = 'rgba(91,63,54,.6)'; c.lineWidth = 0.5; for (let i = 0; i <= 6; i++) { c.beginPath(); c.moveTo(i * 4.3, -28); c.quadraticCurveTo(i * 4.3 + Math.sin(t * 1.5) * 1.5, -16, i * 4.3, -6); c.stroke(); } for (let y = -26; y < -6; y += 4) { c.beginPath(); c.moveTo(0, y); c.lineTo(26, y + Math.sin(t + y) * 0.6); c.stroke(); } c.restore();
      c.save(); c.translate(w / 2 + 8, 0); c.rotate(0.2); limb(c, [0, 0, 0, -28], 1.6, '#b77a4f'); ell(c, 0, -30, 3, 7, '#c9975f', INK, 0.7); c.restore();
      break;
    }
  }
}

export function drawHouse(c, t, b) {
  const s = b.state?.() || {}, w = b.w || 118, h = 50, col = b.wall || '#f7dd8a';
  shadow(c, 0, 2, w * 0.62, 11, 0.2);
  wallFace(c, w, h, col, { bricks: false });
  // windows sit clear of the door and inside the wall (shutters included)
  const st = b.style, wx = Math.min(32, w * 0.5 - 20);
  windowBox(c, -wx, -h + 12, 22, 18, { shutter: b.shutter || '#6fae7c', box: true, b });
  if (st !== 'garage') windowBox(c, wx, -h + 12, 22, 18, { shutter: b.shutter || '#6fae7c', box: true, b });
  if (st === 'wood') for (let y = -h + 4; y < -2; y += 6) line(c, -w / 2 + 2, y, w / 2 - 2, y, 'rgba(120,80,50,.28)', 1);
  if (st === 'clinic') { box(c, -w / 2 + 2, -12, w - 4, 10, 2, '#dfeef7', null); }
  door(c, 0, 20, 32, b.doorCol || '#b77a4f', b.doorOpen || 0, { matCol: '#e89a8a' });
  if (st === 'tin') tinRoof(c, w, 34, h, b.roof || '#6f9fc8'); else tileRoof(c, w, 44, h, b.roof || '#d9784f', { overhang: 10 });
  houseExtras(c, t, b.fisher ? { ...b, style: 'fisher' } : b, w, h);
  if (b.label) signBoard(c, 0, -h + 4, 30, 7, tr(b.label), '#fff5df', INK);
  if (b.chimney) { box(c, 24, -h - 44, 10, 16, 2, '#c9b8a8'); for (let i = 0; i < 3; i++) { const k = (t * 0.3 + i / 3) % 1; c.globalAlpha = 0.45 * (1 - k); circ(c, 29 + Math.sin(k * 6) * 3, -h - 48 - k * 20, 3 + k * 4, '#fff', null); } c.globalAlpha = 1; }
  if (s.mailbox !== false && b.mailbox) { limb(c, [w / 2 + 8, 0, w / 2 + 8, -16], 2, '#8a5f3e'); box(c, w / 2 + 2, -24, 12, 9, 3, '#e8584e'); }
}

export function drawMeoHouse(c, t, b) {
  const w = 110, h = 48;
  shadow(c, 0, 2, 70, 11, 0.2);
  wallFace(c, w, h, '#fff1dc');
  // round window with a cat silhouette
  circ(c, -30, -h + 22, 10, nightA() > 0.05 ? winLit() : '#a9dcee');
  if (nightA() > 0.05) glow(b, -30, -h + 22, 30, 'rgba(255,210,130,.5)');
  c.strokeStyle = INK; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-40, -h + 22); c.lineTo(-20, -h + 22); c.moveTo(-30, -h + 12); c.lineTo(-30, -h + 32); c.stroke();
  windowBox(c, 32, -h + 13, 20, 16, { shutter: '#9fb4dc', box: true, b });
  door(c, 0, 20, 30, '#9fb4dc', b.doorOpen || 0, { matCol: '#f7a6b4' });
  // paw print on the door
  if ((b.doorOpen || 0) < 0.4) { circ(c, 0, -14, 2.2, '#fff5df', null); for (const [x, y] of [[-3, -18], [0, -19.5], [3, -18]]) circ(c, x, y, 1, '#fff5df', null); }
  // roof with two cat-ear gables
  const y0 = -h + 2, top = y0 - 40, col = '#9fb4dc';
  c.beginPath();
  c.moveTo(-w / 2 - 12, y0 - 4); c.quadraticCurveTo(-w / 2 - 8, y0 + 2, -w / 2, y0 + 1); c.lineTo(w / 2, y0 + 1); c.quadraticCurveTo(w / 2 + 8, y0 + 2, w / 2 + 12, y0 - 4);
  c.lineTo(w / 2 - 4, top + 10); c.lineTo(w / 2 - 16, top - 8); c.lineTo(w / 2 - 34, top + 6); c.lineTo(-w / 2 + 34, top + 6); c.lineTo(-w / 2 + 16, top - 8); c.lineTo(-w / 2 + 4, top + 10); c.closePath();
  c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
  c.save(); c.clip(); c.strokeStyle = shade(col, -24); c.lineWidth = 0.8;
  for (let y = top + 12; y < y0; y += 8) { c.beginPath(); for (let x = -w / 2 - 12; x < w / 2 + 12; x += 9) { c.moveTo(x, y); c.quadraticCurveTo(x + 4.5, y - 4, x + 9, y); } c.stroke(); }
  c.restore();
  for (const s of [-1, 1]) { poly(c, [s * (w / 2 - 22), top + 4, s * (w / 2 - 16), top - 3, s * (w / 2 - 10), top + 6], '#f7a6b4', null); }
  // fish weathervane
  const sw = Math.sin(t * 0.8) * 0.3;
  limb(c, [0, top + 6, 0, top - 10], 1.4, '#8a5f3e');
  c.save(); c.translate(0, top - 12); c.rotate(sw); ell(c, 0, 0, 7, 3, '#f2c14e'); poly(c, [6, 0, 10, -3, 10, 3], '#f2c14e', INK, 0.8); circ(c, -4, -0.5, 0.8, INK, null); c.restore();
  signBoard(c, 0, -h + 5, 44, 8, T('Mèo Mây\'s', 'Nhà Mèo Mây'), '#f7a6b4', '#fff');
  // cat bed + fish bowl by the door
  ell(c, -48, -2, 9, 4, '#f08a78');
}

export function drawShop(c, t, b) {
  const s = b.state?.() || {}, w = b.w || 146, h = b.h || 56, kind = b.kind;
  shadow(c, 0, 2, w * 0.6, 12, 0.2);
  const col = b.wall || '#fff1dc';
  wallFace(c, w, h, col, { bricks: kind === 'materials' });
  if (kind === 'supermarket') {
    // glass front with shelves behind
    const lit = true;
    box(c, -w / 2 + 10, -h + 16, w - 56, h - 18, 3, lit ? '#d9f1f6' : '#a9dcee');
    for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) box(c, -w / 2 + 14 + i * 10.5, -h + 22 + r * 14, 8, 8, 1.5, ['#f28f7c', '#f7de8c', '#9fd8c8', '#a9cf9a', '#f4a9b8'][(i + r) % 5], INK, 0.5);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(-w / 2 + 10, -8); c.lineTo(-w / 2 + 40, -h + 16); c.lineTo(-w / 2 + 52, -h + 16); c.lineTo(-w / 2 + 22, -8); c.fill();
    door(c, w / 2 - 24, 26, 38, '#bfe6ef', b.doorOpen || 0, { double: true, inside: '#f7f0dc', matCol: '#6fbf73' });
    awning(c, -14, -h + 12, w - 32, ['#fff5df', '#6fbf73'], 12);
    box(c, -w / 2 - 4, -h - 22, w + 8, 24, 4, '#6fbf73');
    text(c, T('CÔ HOA\'S MARKET', 'SIÊU THỊ CÔ HOA'), 0, -h - 10, 11, '#fff', 900, 'center', INK, 2.4);
    circ(c, -w / 2 + 10, -h - 10, 7, '#fff5df');
    poly(c, [-w / 2 + 6, -h - 12, -w / 2 + 14, -h - 12, -w / 2 + 13, -h - 7, -w / 2 + 7, -h - 7], '#f28f7c', INK, 0.7);
  } else if (kind === 'materials') {
    // roll-up shutter half open, lumber inside
    box(c, -w / 2 + 12, -h + 14, w - 56, h - 14, 2, '#5a4a44');
    for (let i = 0; i < 5; i++) box(c, -w / 2 + 16, -18 + i * -5, w - 64, 4, 1, i % 2 ? '#c88a52' : '#d9a064', INK, 0.5);
    const sh = 18;
    box(c, -w / 2 + 12, -h + 14, w - 56, sh, 1, '#b9c3cb');
    for (let y = -h + 17; y < -h + 14 + sh; y += 3) line(c, -w / 2 + 13, y, w / 2 - 45, y, '#8a96a0', 0.6);
    door(c, w / 2 - 22, 22, 36, '#8f9aa3', b.doorOpen || 0, { matCol: '#e9c46f' });
    tinRoof(c, w, 26, h, '#5f8fb8');
    box(c, -w / 2 + 6, -h - 34, w - 12, 20, 3, '#f7de8c');
    text(c, T('CHÚ BẢY\'S MATERIALS', 'VẬT LIỆU CHÚ BẢY'), 0, -h - 23.5, 10, '#6e4430', 900);
  } else if (kind === 'furniture') {
    box(c, -w / 2 + 10, -h + 14, 52, h - 20, 3, nightA() > 0.05 ? winLit() : '#d9f1f6');
    // display: a chair and a lamp
    box(c, -w / 2 + 18, -18, 16, 4, 1, '#c88a52', INK, 0.6); limb(c, [-w / 2 + 20, -14, -w / 2 + 20, -8], 1.6, '#8a5f3e'); limb(c, [-w / 2 + 32, -14, -w / 2 + 32, -8], 1.6, '#8a5f3e'); box(c, -w / 2 + 18, -32, 4, 14, 1, '#c88a52', INK, 0.6);
    limb(c, [-w / 2 + 50, -8, -w / 2 + 50, -30], 1.2, '#5a4a48'); poly(c, [-w / 2 + 43, -30, -w / 2 + 57, -30, -w / 2 + 54, -38, -w / 2 + 46, -38], '#f7de8c', INK, 0.7);
    if (nightA() > 0.05) glow(b, -w / 2 + 36, -h + 30, 40, 'rgba(255,210,130,.5)');
    windowBox(c, 8, -h + 14, 22, 18, { shutter: '#c98f5a', b });
    door(c, w / 2 - 22, 22, 34, '#c98f5a', b.doorOpen || 0, { matCol: '#9fd8c8' });
    tileRoof(c, w, 40, h, '#c9674a', { overhang: 8 });
    signBoard(c, 0, -h - 8, 96, 16, T('ANH KHOA\'S FURNITURE', 'NỘI THẤT ANH KHOA'), '#fff5df', '#8a5f3e');
  }
  else if (kind === 'boutique') {
    // big display window with two mannequins, striped pink awning, scalloped sign
    box(c, -w / 2 + 10, -h + 14, w - 60, h - 18, 4, nightA() > 0.05 ? winLit() : '#e6f5fb');
    const dm = (x, col, hat) => { limb(c, [x, -6, x, -14], 1, '#8a5f3e'); poly(c, [x - 5, -30, x + 5, -30, x + 7, -14, x - 7, -14], col, INK, 0.7); circ(c, x, -35, 3.4, '#f3e6d6', INK, 0.7); if (hat) { ell(c, x, -38, 6.4, 1.8, hat, INK, 0.6); ell(c, x, -40, 3.2, 2.2, hat, INK, 0.6); } };
    dm(-w / 2 + 26, '#f4a9b8', '#f3dcae'); dm(-w / 2 + 50, '#8fb7e0', null); dm(-w / 2 + 70, '#f7de8c', null);
    c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(-w / 2 + 12, -10); c.lineTo(-w / 2 + 36, -h + 16); c.lineTo(-w / 2 + 44, -h + 16); c.lineTo(-w / 2 + 20, -10); c.fill();
    if (nightA() > 0.05) glow(b, -w / 2 + 40, -h + 30, 46, 'rgba(255,200,210,.5)');
    door(c, w / 2 - 24, 24, 36, '#f4a9b8', b.doorOpen || 0, { matCol: '#f4a9b8', inside: '#fff3f5' });
    awning(c, -14, -h + 12, w - 32, ['#fff5f7', '#f28fa3'], 12);
    box(c, -w / 2 - 2, -h - 22, w + 4, 22, 10, '#f28fa3');
    for (let i = 0; i < 9; i++) circ(c, -w / 2 + 6 + i * (w - 8) / 8, -h, 3.2, '#f28fa3', null);
    text(c, T('CÔ BA\'S BOUTIQUE', 'TIỆM ÁO CÔ BA'), 0, -h - 11, 10.5, '#fff', 900, 'center', INK, 2.4);
    // a little hanger icon
    { const hx = w / 2 - 6, hy = -h - 11; c.strokeStyle = '#fff'; c.lineWidth = 1.4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx, hy - 2.5); c.arc(hx + 2, hy - 2.5, 2, Math.PI, Math.PI * 2.1); c.stroke();          // the hook
      c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx - 6, hy + 3, hx - 8.5, hy + 6); c.lineTo(hx + 8.5, hy + 6); c.quadraticCurveTo(hx + 6, hy + 3, hx, hy); c.stroke(); }
  }
  else if (kind === 'salon') {
    // mint salon: big window with a styling chair and mirror, spinning barber pole, scissors sign
    box(c, -w / 2 + 10, -h + 14, w - 60, h - 18, 4, nightA() > 0.05 ? winLit() : '#e6f5fb');
    const wx = -w / 2 + 38;
    ell(c, wx, -h + 30, 10, 12, '#fffaf0', INK, 0.8); ell(c, wx, -h + 30, 7.5, 9.5, '#cfeaf5', null);
    c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(wx - 4, -h + 24, 2, 8);
    box(c, wx - 8, -18, 16, 8, 3, '#e56b8b', INK, 0.7); box(c, wx - 7, -30, 14, 12, 4, '#e56b8b', INK, 0.7); limb(c, [wx, -10, wx, -5], 2, '#9aa3ad'); ell(c, wx, -5, 6, 1.6, '#9aa3ad', INK, 0.6);
    box(c, -w / 2 + 58, -26, 8, 20, 2, '#f7de8c', INK, 0.6); circ(c, -w / 2 + 62, -30, 4, '#c9b6e8', INK, 0.6);
    if (nightA() > 0.05) glow(b, -w / 2 + 40, -h + 30, 46, 'rgba(200,255,240,.5)');
    door(c, w / 2 - 24, 24, 36, '#6fbfb0', b.doorOpen || 0, { matCol: '#c9b6e8', inside: '#effaf6' });
    // barber pole (stripes scroll)
    const px = w / 2 - 6, py = -h + 6;
    box(c, px - 3.6, py, 7.2, 30, 3, '#fff', INK, 0.8);
    c.save(); c.beginPath(); c.rect(px - 3, py + 1, 6, 28); c.clip();
    const off = (t * 10) % 8; c.strokeStyle = '#e8584e'; c.lineWidth = 2;
    for (let y = -8; y < 36; y += 8) { c.beginPath(); c.moveTo(px - 4, py + y + off); c.lineTo(px + 4, py + y + off - 5); c.stroke(); }
    c.strokeStyle = '#6f9fc8'; for (let y = -4; y < 36; y += 8) { c.beginPath(); c.moveTo(px - 4, py + y + off); c.lineTo(px + 4, py + y + off - 5); c.stroke(); }
    c.restore();
    circ(c, px, py - 1, 3.4, '#f2c14e', INK, 0.8); circ(c, px, py + 31, 3, '#f2c14e', INK, 0.8);
    awning(c, -14, -h + 12, w - 32, ['#effaf6', '#6fbfb0'], 12);
    box(c, -w / 2 - 2, -h - 22, w + 4, 22, 10, '#6fbfb0');
    text(c, T('SALON TÓC XINH', 'SALON TÓC XINH'), -6, -h - 11, 10.5, '#fff', 900, 'center', INK, 2.4);
    // scissors icon
    c.strokeStyle = '#fff'; c.lineWidth = 1.3; circ(c, w / 2 - 12, -h - 7, 2, null, '#fff', 1.3); circ(c, w / 2 - 6, -h - 7, 2, null, '#fff', 1.3);
    c.beginPath(); c.moveTo(w / 2 - 11, -h - 9); c.lineTo(w / 2 - 4, -h - 16); c.moveTo(w / 2 - 7, -h - 9); c.lineTo(w / 2 - 14, -h - 16); c.stroke();
  }
  else if (kind === 'petshop') {
    // warm yellow pet shop: a paw-print awning, a fish tank and a sleepy puppy in the window
    box(c, -w / 2 + 10, -h + 14, w - 60, h - 18, 4, nightA() > 0.05 ? winLit() : '#e6f5fb');
    const wx = -w / 2 + 30;
    box(c, wx - 12, -26, 24, 16, 2, '#bfe6ef', INK, 0.8); ell(c, wx - 4 + Math.sin(t * 1.5) * 4, -18, 3, 1.8, '#f2a14e', null); ell(c, wx + 5 - Math.sin(t * 1.3) * 3, -21, 2.4, 1.4, '#e8584e', null);
    ell(c, wx + 30, -16, 10, 5, '#e3b07a', INK, 0.8); circ(c, wx + 38, -20, 5, '#e3b07a', INK, 0.8); ell(c, wx + 41, -24, 2, 3.2, '#b98049', INK, 0.5);
    for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; c.globalAlpha = 1 - k; text(c, 'z', wx + 44 + k * 6, -30 - k * 10, 5, '#5b3f36', 900); } c.globalAlpha = 1;
    if (nightA() > 0.05) glow(b, -w / 2 + 40, -h + 30, 46, 'rgba(255,230,160,.5)');
    door(c, w / 2 - 24, 24, 36, '#f2c14e', b.doorOpen || 0, { matCol: '#f08ca0', inside: '#fff8e8' });
    awning(c, -14, -h + 12, w - 32, ['#fff8e8', '#f2a14e'], 12);
    box(c, -w / 2 - 2, -h - 22, w + 4, 22, 10, '#f2a14e');
    text(c, T('BÉ BÔNG\'S PETS', 'THÚ CƯNG BÉ BÔNG'), -4, -h - 11, 10, '#fff', 900, 'center', INK, 2.4);
    // paw print badge
    const px = w / 2 - 10, py = -h - 11; circ(c, px, py + 1.5, 3, '#fff', null); for (const [dx, dy] of [[-3, -3], [0, -4.4], [3, -3]]) circ(c, px + dx, py + dy, 1.3, '#fff', null);
  }
  if (kind === 'supermarket') { /* flat roof edge */ }
}

export function drawRestaurant(c, t, b) {
  const s = b.state(), w = 232, h = 86;
  const k = clamp(s.repair ?? 0, 0, 1), broken = k < 0.02;
  const col = mix('#b3a79a', '#f7d77a', clamp(k * 1.3 - 0.2, 0, 1));
  shadow(c, 0, 3, w * 0.62, 14, 0.2);
  if (k < 0.5) weeds(c, w, t);
  wallFace(c, w, h, col, { stains: k < 0.6 });
  // floor line / balcony
  box(c, -w / 2 - 4, -h / 2 - 3, w + 8, 6, 2, shade(col, -30));
  for (let i = 0; i < 4; i++) {
    const x = -w / 2 + 32 + i * 56;
    windowBox(c, x, -h + 8, 22, 26, { shutter: broken ? '#8a8a7a' : '#5f9f7a', broken: broken && i % 2 === 0, b });
  }
  // balcony rail with flower pots once restored
  if (!broken) { for (let x = -w / 2 + 6; x < w / 2 - 4; x += 8) line(c, x, -h / 2 - 3, x, -h / 2 - 12, INK, 1); line(c, -w / 2 + 4, -h / 2 - 12, w / 2 - 4, -h / 2 - 12, INK, 1.6); if ((s.level || 1) >= 2) for (let i = 0; i < 6; i++) { circ(c, -w / 2 + 20 + i * 38, -h / 2 - 14, 4, ['#ff8fb0', '#ffd35a', '#fff'][i % 3], INK, 0.6); } }
  // ground floor: arched windows + double doors
  for (const x of [-78, -38, 38, 78]) {
    const lit = !broken && (s.open || nightA() > 0.05);
    c.beginPath(); c.moveTo(x - 13, -8); c.lineTo(x - 13, -30); c.arc(x, -30, 13, Math.PI, TAU); c.lineTo(x + 13, -8); c.closePath();
    c.fillStyle = broken ? '#6e5a4e' : lit ? winLit() : '#a9dcee'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    if (lit) glow(b, x, -24, 34, 'rgba(255,210,130,.5)');
    if (broken) { line(c, x - 14, -34, x + 14, -10, '#a07a50', 3.6); line(c, x - 14, -14, x + 14, -38, '#a07a50', 3.6); }
    else { line(c, x, -43, x, -8, INK, 0.8); }
  }
  door(c, 0, 30, 40, broken ? '#8a7a6e' : '#a8563f', b.doorOpen || 0, { double: true, matCol: '#e8584e' });
  if (broken) { line(c, -18, -40, 18, -4, '#a07a50', 4); signBoard(c, 0, -52, 44, 12, T('FOR SALE', 'BÁN'), '#fff5df', '#e8584e', { tilt: -0.08 }); }
  tileRoof(c, w, 50, h, mix('#8a7f78', '#d9784f', clamp(k * 2 - 0.5, 0, 1)), { overhang: 12, missing: k < 0.5, ridgeOrnament: !broken });
  const name = s.sign || T('RESTAURANT', 'NHÀ HÀNG');
  if (!broken) { signBoard(c, 0, -h - 12, 128, 20, name, '#a8563f', '#ffe7a8'); }
  if (!broken) {
    awning(c, 0, -h / 2 + 8, 150, ['#fff5df', '#e8584e'], 10);
    for (const x of [-w / 2 + 10, w / 2 - 10]) { lanternShape(c, x, -h / 2 + 2, 0.9, '#ea5a4f', t, x); if (nightA() > 0.05) glow(b, x, -h / 2 + 12, 34, 'rgba(255,190,110,.55)'); }
    if ((s.level || 1) >= 3) stringLights(c, w + 10, -h + 4, t, b);
  }
  if (broken) { cobweb(c, -w / 2 + 2, -h + 2, 1.2); cobweb(c, w / 2 - 16, -h / 2 + 2, 0.9); }
}

export function drawFoodTruck(c, t, b) {
  const s = b.state(), owned = s.owned, open = s.open;
  const col = owned ? '#9fd8c8' : '#b9b3a8';
  const bob = open ? Math.sin(t * 3) * 0.2 : 0;
  shadow(c, 0, 2, 58, 10, 0.2);
  for (const x of [-30, 32]) { circ(c, x, -8, 9, '#3d3a42'); circ(c, x, -8, 3.6, '#b9c3cb', INK, 0.7); }
  c.save(); c.translate(0, bob);
  // body
  c.beginPath(); c.moveTo(-50, -12); c.lineTo(-50, -60); c.quadraticCurveTo(-50, -66, -44, -66); c.lineTo(28, -66); c.quadraticCurveTo(36, -66, 40, -56); c.lineTo(52, -36); c.lineTo(52, -12); c.closePath();
  c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
  box(c, -50, -24, 102, 10, 2, shade(col, -18));
  // cab window
  poly(c, [30, -58, 38, -56, 48, -38, 30, -38], '#a9dcee', INK, 1);
  // serving window
  box(c, -40, -54, 60, 24, 2, open ? '#ffe9b8' : '#6e6a70');
  if (open) { for (let i = 0; i < 4; i++) box(c, -34 + i * 14, -46, 8, 10, 1.5, ['#f0b04a', '#ff9a7a', '#e0a052', '#9fd67a'][i], INK, 0.5); glow(b, -10, -42, 46, 'rgba(255,210,130,.5)'); }
  const flap = s.flapOpen ?? (open ? 1 : 0);
  if (flap < 0.98) box(c, -40, -54, 60, 24 * (1 - flap), 2, shade(col, -8));
  if (flap > 0.02) awning(c, -10, -56, 66, ['#fff5df', '#f28f7c'], 14 * flap);
  box(c, -44, -32, 68, 5, 2, '#c9955e');
  c.restore();
  if (!owned) { signBoard(c, -10, -76, 60, 14, T('FOR SALE', 'BÁN'), '#fff5df', '#e8584e', { tilt: 0.05 }); ell(c, 0, -30, 40, 14, 'rgba(160,150,140,.12)', null); }
  else signBoard(c, -10, -76, 76, 14, s.sign || T('FOOD TRUCK', 'XE BÁNH'), '#f28f7c', '#fff5df');
  if (open && nightA() > 0.05) stringLights(c, 90, -68, t, b);
}

export function drawNightStall(c, t, b) {
  const s = b.state(), k = clamp(s.repair ?? 0, 0, 1), broken = k < 0.02, w = b.w || 66, h = 30;
  shadow(c, 0, 2, w * 0.6, 8, 0.2);
  // counter
  box(c, -w / 2, -h, w, h, 3, mix('#9a8a7e', '#c9955e', k));
  for (let x = -w / 2 + 6; x < w / 2; x += 9) line(c, x, -h + 3, x, -2, shade(mix('#9a8a7e', '#c9955e', k), -26), 0.7);
  box(c, -w / 2 - 3, -h - 4, w + 6, 6, 2, mix('#8a7a6e', '#e9c9a0', k));
  // goods on the counter when open
  if (!broken && s.open) { for (let i = 0; i < 4; i++) ell(c, -w / 2 + 10 + i * (w - 20) / 3, -h - 5, 6, 3, b.goods?.[i % b.goods.length] || '#f2c46b'); }
  // posts
  for (const x of [-w / 2 + 2, w / 2 - 2]) limb(c, [x, -h, x, -h - 34], 2.6, broken ? '#7a6a5e' : '#8a5f3e');
  const cols = broken ? ['#9d8a80', '#b3a79a'] : b.cloth || ['#e8584e', '#fff5df'];
  clothRoof(c, w, 18, h + 34, cols, { torn: broken });
  if (!broken && (s.label || b.label)) signBoard(c, 0, -h - 30, w - 12, 10, tr(s.label || b.label), s.owned ? '#f08ca0' : '#fff5df', s.owned ? '#fff' : '#a8563f');
  if (!broken && nightA() > 0.05) { lanternShape(c, 0, -h - 34, 0.8, '#ea5a4f', t, b.x); glow(b, 0, -h - 20, 50, 'rgba(255,190,110,.6)'); }
  if (broken) { poly(c, [-w / 2 + 6, -h - 2, w / 2 - 10, -h - 2, w / 2 - 14, -h + 10, -w / 2 + 10, -h + 12], 'rgba(90,70,60,.35)', null); }
}

export function drawDinh(c, t, b) {
  // Đình làng — the village communal house, with sweeping curved roof ends
  const w = 150, h = 40;
  shadow(c, 0, 3, 100, 14, 0.2);
  box(c, -w / 2 - 10, -8, w + 20, 10, 2, '#c9c0b0');
  for (let i = 0; i < 6; i++) { const x = -w / 2 + 8 + i * (w - 16) / 5; limb(c, [x, -8, x, -h - 6], 5, '#b8433a'); }
  box(c, -w / 2 + 16, -h + 4, w - 32, h - 12, 2, '#8a5f3e');
  for (let i = 0; i < 3; i++) box(c, -36 + i * 26, -h + 8, 20, h - 20, 1.5, '#a8763f', INK, 0.7);
  const y0 = -h - 4, top = y0 - 46;
  c.beginPath(); c.moveTo(-w / 2 - 34, y0 - 22); c.quadraticCurveTo(-w / 2 - 22, y0 + 4, -w / 2, y0 + 2); c.lineTo(w / 2, y0 + 2); c.quadraticCurveTo(w / 2 + 22, y0 + 4, w / 2 + 34, y0 - 22); c.lineTo(w / 2 - 6, top); c.lineTo(-w / 2 + 6, top); c.closePath();
  c.fillStyle = '#b8603f'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
  c.save(); c.clip(); c.strokeStyle = '#8f4530'; c.lineWidth = 0.8; for (let y = top + 8; y < y0; y += 7) { c.beginPath(); for (let x = -w / 2 - 34; x < w / 2 + 34; x += 8) { c.moveTo(x, y); c.quadraticCurveTo(x + 4, y - 3.5, x + 8, y); } c.stroke(); } c.restore();
  box(c, -w / 2 + 2, top - 5, w - 4, 7, 3, '#8f4530');
  // twin dragons-inspired curls & pearl on the ridge
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * (w / 2 - 4), top - 1); c.quadraticCurveTo(s * (w / 2 + 12), top - 4, s * (w / 2 + 6), top - 18); c.strokeStyle = INK; c.lineWidth = 4; c.stroke(); c.strokeStyle = '#6fbfa0'; c.lineWidth = 2.4; c.stroke(); }
  circ(c, 0, top - 8, 5, '#f2c14e');
  signBoard(c, 0, -h - 12, 50, 10, T('VILLAGE HALL', 'ĐÌNH LÀNG'), '#f2c14e', '#8f2f24');
}

// Little outdoor kiosks you can buy and run from the counter: the Harbour Café
// and the Coconut Cove grill. Shuttered with a FOR SALE board until you own them.
export function drawKiosk(c, t, b) {
  const s = b.state?.() || {}, w = b.w || 112, h = 46, own = s.owned, open = s.open;
  const cafe = b.style === 'cafe';
  const wall = cafe ? '#f6ecdc' : '#e9d3ae', trim = cafe ? '#6b4431' : '#c9674a';
  shadow(c, 0, 2, w * 0.6, 10, 0.2);
  box(c, -w / 2, -h, w, h, 4, wall, INK, 1.2);
  if (!cafe) for (let x = -w / 2 + 6; x < w / 2; x += 8) line(c, x, -h + 2, x, -2, 'rgba(120,80,40,.25)', 1);   // bamboo slats
  // serving hatch
  const hx = 0, hy = -h + 8, hw = w - 30, hh = 24;
  box(c, hx - hw / 2, hy, hw, hh, 2, open ? (cafe ? '#fff1d6' : '#ffe2c0') : '#6e5a4e');
  if (open) {
    if (cafe) { for (let i = 0; i < 3; i++) box(c, -24 + i * 16, hy + 12, 8, 10, 2, ['#6b4431', '#f3e2c4', '#e9a24a'][i], INK, 0.6); line(c, 18, hy + 4, 18, hy + 20, '#8f9aa3', 1.4); ell(c, 18, hy + 4, 4, 2, '#8f9aa3', INK, 0.5); }
    else { box(c, -26, hy + 16, 52, 7, 2, '#4a4550', INK, 0.8); for (let i = 0; i < 5; i++) { circ(c, -20 + i * 10, hy + 15, 2.4, i % 2 ? '#f0b04a' : '#e8e2d8', INK, 0.5); } steamPuffs(c, t, 0, hy + 8); }
    glow(b, 0, hy + 12, 40, 'rgba(255,210,130,.45)');
  } else { for (let y = hy + 3; y < hy + hh; y += 4) line(c, hx - hw / 2 + 2, y, hx + hw / 2 - 2, y, 'rgba(255,255,255,.18)', 1); }
  box(c, hx - hw / 2 - 4, hy + hh - 1, hw + 8, 5, 2, shade(wall, -40));
  // roof: a café awning or a thatched palm roof
  if (cafe) awning(c, 0, -h - 2, w + 12, ['#fff8ea', trim], 14);
  else { c.beginPath(); c.moveTo(-w / 2 - 10, -h + 2); c.quadraticCurveTo(0, -h - 36, w / 2 + 10, -h + 2); c.closePath(); c.fillStyle = '#d9b36a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.1; c.stroke(); c.strokeStyle = '#b98a4a'; c.lineWidth = 0.8; for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(i * 9, -h - 14 + Math.abs(i) * 2); c.lineTo(i * 11, -h + 1); c.stroke(); } }
  // sign
  const label = cafe ? T('HARBOUR CAFÉ', 'CÀ PHÊ BẾN CẢNG') : T('COVE GRILL', 'QUÁN NƯỚNG VỊNH DỪA');
  signBoard(c, 0, cafe ? -h - 26 : -h - 30, cafe ? 78 : 88, 13, label, trim, '#fff');
  if (cafe) { // coffee cup icon and two little bistro tables
    for (const x of [-w / 2 - 20, w / 2 + 20]) { ell(c, x, -14, 9, 3, '#fff8ea', INK, 0.8); limb(c, [x, -13, x, 0], 1.4, '#6b4431'); }
  } else { // tiki torches
    for (const x of [-w / 2 - 12, w / 2 + 12]) { limb(c, [x, 0, x, -30], 2, '#8a5f3e'); const k = Math.sin(t * 8 + x) * 1.2; c.beginPath(); c.moveTo(x - 3, -30); c.quadraticCurveTo(x + k, -42, x + 3, -30); c.fillStyle = '#ff9a3a'; c.fill(); if (nightA() > 0.05) glow(b, x, -34, 26, 'rgba(255,170,90,.5)'); }
  }
  if (!own) { // for sale board
    c.save(); c.translate(w / 2 - 12, -h + 26); c.rotate(0.12); box(c, -16, -7, 32, 14, 2, '#fffaf0', INK, 0.9); text(c, T('FOR SALE', 'CẦN BÁN'), 0, 0.5, 5.6, '#e8584e', 900); c.restore();
  }
}
function steamPuffs(c, t, x, y) { for (let i = 0; i < 3; i++) { const k = (t * 0.8 + i / 3) % 1; c.globalAlpha = 0.6 * (1 - k); circ(c, x - 8 + i * 8 + Math.sin(k * 5) * 2, y - k * 14, 2 + k * 3, '#fff', null); } c.globalAlpha = 1; }
