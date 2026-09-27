// Hammocks and lying in them. The hammock pieces (home furniture and the beach ones)
// and the person lying in one share the same shape, so the body rests *in* the
// fabric, sways with it, and the fabric sags under the weight.
//
// Lying down: legs together, hands folded on the tummy, the body in a gentle banana
// curve along the fabric — head and shoulders propped up at one end, hips lowest,
// feet a little up at the other — with the front edge of the fabric wrapping over
// the hips and back.

import { INK, shadow } from './draw.js';
import { wind } from './props.js';
import { drawHuman } from './character.js';

const FABRIC = '#f28f7c', STRIPE = '#fff5df';
// How far someone's weight pulls each hammock down (0 empty … 1 someone lying in it), by position.
const load = new Map();
const key = (x, y) => `${Math.round(x)},${Math.round(y)}`;
export const hammockLoad = p => load.get(key(p.x, p.y)) || 0;

// The fabric: both ends tied at yEnd, the underside a curve through (sw, bot), the top
// edge through (sw, top). Heavier → deeper and the top edge pulled open.
export function hammockGeom(kind, p, t) {
  const L = hammockLoad(p);
  const g = kind === 'beachHammock'
    ? { w: p.w || 64, post: -38, yEnd: -30, bot: -6, top: -16, sw: Math.sin(t * 1.2 + p.x) * 3 + wind(p.x, t) * 2 }
    : { w: 56, post: -30, yEnd: -24, bot: -2, top: -12, sw: Math.sin(t * 1.4) * 2 };
  g.bot += 4.5 * L; g.top += 1.5 * L; g.sw *= 1 - 0.55 * L;          // (a hammock with someone in it swings slower and lower)
  g.L = L;
  return g;
}
const bez = (a, b, c2, u) => (1 - u) * (1 - u) * a + 2 * u * (1 - u) * b + u * u * c2;
function fabricPath(c, g, topCtrl) {
  c.beginPath(); c.moveTo(-g.w / 2, g.yEnd);
  c.quadraticCurveTo(g.sw, g.bot, g.w / 2, g.yEnd);
  c.quadraticCurveTo(g.sw, topCtrl, -g.w / 2, g.yEnd);
}
function stripes(c, g, topCtrl, n, lw) {
  c.strokeStyle = STRIPE; c.lineWidth = lw;
  for (let i = 1; i < n; i++) {
    const u = i / n, x = bez(-g.w / 2, g.sw, g.w / 2, u), yb = bez(g.yEnd, g.bot, g.yEnd, u), yt = bez(g.yEnd, topCtrl, g.yEnd, u);
    c.beginPath(); c.moveTo(x, yt + 0.8); c.lineTo(x + g.sw * 0.15, yb - 1); c.stroke();
  }
}

// The hammock itself (called by the furniture and the beach prop)
export function drawHammock(c, t, p, kind) {
  const g = hammockGeom(kind, p, t);
  for (const x of [-g.w / 2, g.w / 2]) {
    if (kind === 'beachHammock') shadow(c, x, 1, 4, 1.6, 0.16);
    c.lineCap = 'round'; c.strokeStyle = INK; c.lineWidth = (kind === 'beachHammock' ? 3 : 2.4) + 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, g.post); c.stroke();
    c.strokeStyle = kind === 'beachHammock' ? '#a8764a' : '#8a5f3e'; c.lineWidth = kind === 'beachHammock' ? 3 : 2.4; c.stroke();
  }
  fabricPath(c, g, g.top);
  c.fillStyle = FABRIC; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  c.save(); fabricPath(c, g, g.top); c.clip(); stripes(c, g, g.top, kind === 'beachHammock' ? 6 : 5, kind === 'beachHammock' ? 1.2 : 1); c.restore();
  if (kind === 'beachHammock') shadow(c, g.sw * 0.5, 4, 24, 5, 0.12 + 0.06 * g.L);
}

// ---------------------------------------------------------------- lying in it
const ease = k => k * k * (3 - 2 * k);
// the player, lying: a.lie = { k (0 sitting … 1 lying), h (seat height), kind, prop, rot, dx, dy }
export function drawLying(c, a, t) {
  const lie = a.lie, e = ease(lie.k), sc = a.look?.scale || 1;
  load.set(key(lie.prop.x, lie.prop.y), e);
  const body = { ...a, sit: false, seatH: undefined, moving: 0, dir: 'down', yawOverride: 0, lying: true, hop: 0, squash: 0, turnT: 0,
    emo: e > 0.8 ? 'happy' : a.emo, blinkAmt: e > 0.9 ? 1 : a.blinkAmt, act: null, held: null };
  const hipPx = 8.6 * 0.96 * 1.15 * sc;                       // the hips, measured up from the feet
  c.save();
  c.translate(-(lie.dx || 0), -(lie.dy || 0));                 // work in the hammock's own space
  if (lie.rot % 2) {
    // a hammock turned side-on runs away from you: lying head-away, seen from the feet
    // (foreshortened), resting on the fabric
    // head and shoulders poke out of the fabric, which wraps round the rest of you like a cocoon
    c.save(); c.translate(0, -9 * e - (1 - e) * lie.h * 0.96 * 1.15 * sc);
    drawHuman(c, body, t);
    c.restore();
    if (e > 0.05) {
      const sway = Math.sin(t * 1.4) * 0.8, top = -27.5 * sc;
      c.save(); c.globalAlpha = Math.min(1, e * 1.6); c.translate(sway, 0);
      const cocoon = () => { c.beginPath(); c.moveTo(-12.5, top); c.quadraticCurveTo(-14, -14, 0, -13); c.quadraticCurveTo(14, -14, 12.5, top); c.quadraticCurveTo(0, top + 4.5, -12.5, top); c.closePath(); };
      cocoon(); c.fillStyle = FABRIC; c.fill();
      c.save(); cocoon(); c.clip(); c.strokeStyle = STRIPE; c.lineWidth = 1.1;
      for (const x of [-7, 0, 7]) { c.beginPath(); c.moveTo(x, top + 2 + Math.abs(x) * -0.2); c.quadraticCurveTo(x * 1.1, -20, x * 0.8, -12); c.stroke(); }
      c.strokeStyle = 'rgba(120,50,40,.3)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-12.5, top + 0.8); c.quadraticCurveTo(0, top + 5.3, 12.5, top + 0.8); c.stroke(); c.restore();
      cocoon(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
      c.restore();
    }
    c.restore(); return;
  }
  const g = hammockGeom(lie.kind, lie.prop, t);
  // the hips sit in the lowest part of the fabric, a little toward the feet end
  const u = 0.64, hipX = bez(-g.w / 2, g.sw, g.w / 2, u), hipY = bez(g.yEnd, g.bot, g.yEnd, u) - 5.6 * sc;
  const hx = hipX * e, hy = hipY * e + (1 - e) * (-(lie.h + 0.2) * 0.96 * 1.15 * sc);
  const rock = Math.sin(t * 1.2 + lie.prop.x) * 0.025 * e;
  const up = (27 * Math.PI / 180), down = (9 * Math.PI / 180);   // head end propped up 27°, feet end raised 9°
  const thUpper = Math.atan2(-Math.cos(up), Math.sin(up)) * e + rock, thLegs = Math.atan2(-Math.cos(down), -Math.sin(down)) * e + rock;
  // legs, then the upper body (each turned about the hips; the fabric hides the join)
  // (in the figure's own space the feet are at 0 and the hips at −hipPx)
  for (const [th, legs] of [[thLegs, true], [thUpper, false]]) {
    c.save(); c.translate(hx, hy); c.rotate(th); c.translate(0, hipPx);
    c.beginPath(); if (legs) c.rect(-60, -hipPx - 1.4, 120, 90); else c.rect(-60, -hipPx - 90, 120, 90 + 1.2);
    c.clip(); drawHuman(c, body, t); c.restore();
  }
  // the front edge of the fabric wraps over the hips and back: you're *in* the hammock
  if (e > 0.05) {
    const lip = g.bot - 8.5 * sc;
    c.save(); c.globalAlpha = Math.min(1, e * 1.6);
    fabricPath(c, g, lip); c.fillStyle = FABRIC; c.fill();
    c.save(); c.clip(); stripes(c, g, lip, lie.kind === 'beachHammock' ? 6 : 5, 1.1);
    c.strokeStyle = 'rgba(120,50,40,.28)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-g.w / 2, g.yEnd); c.quadraticCurveTo(g.sw, lip + 1.2, g.w / 2, g.yEnd); c.stroke(); c.restore();
    c.beginPath(); c.moveTo(-g.w / 2, g.yEnd); c.quadraticCurveTo(g.sw, lip, g.w / 2, g.yEnd); c.moveTo(-g.w / 2, g.yEnd); c.quadraticCurveTo(g.sw, g.bot, g.w / 2, g.yEnd);
    c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.restore();
  }
  c.restore();
}
export function clearLoad(p) { load.delete(key(p.x, p.y)); }
