// Procedural chibi humans.
//
// Proportions follow the reference art: an oversized soft head (about half the
// height), big glossy brown eyes with two highlights, pink blush, a tiny mouth,
// hair that frames the face, and a small rounded body with stubby limbs.
// Everything is drawn with vector paths so it stays crisp at any zoom and
// renders identically on Safari (no image assets that can fail to load).
//
// Coordinate frame: feet at (0,0), y grows downward, so the body is at negative y.
// The renderer only *reads* the actor; animation state is advanced in world/actor.js.

import { TAU, shade } from '../core/util.js';
import { INK, ell, circ, limb, poly, shadow, heart } from './draw.js';
import { drawHeld } from './food.js';

const HY = -25.2, HR = 11.8, HRY = 10.8; // head centre / radii
const SH = -14.2, HEM = -5.6;           // shoulder and hem lines
const EYE = '#3d2723', EYE2 = '#8a5540', BLUSH = 'rgba(247,140,150,.5)', MOUTH = '#8e3f3e';

// ---------------------------------------------------------------- helpers
function cols(L) {
  if (L._c) return L._c;
  L._c = {
    skinS: shade(L.skin, -22), hairS: shade(L.hair, -26), hairH: shade(L.hair, 30),
    topS: shade(L.top, -24), topH: shade(L.top, 22), botS: shade(L.bottom, -20), shoeH: shade(L.shoe, 34),
  };
  return L._c;
}

export function viewOf(dir) { return dir === 'up' ? 'back' : dir === 'left' || dir === 'right' ? 'side' : 'front'; }

// Pose: body offsets and hand targets computed from animation state.
function pose(a, view, t) {
  const m = a.moving || 0, ph = a.walkPh || 0, act = a.act, at = a.actT || 0;
  const sw = Math.sin(ph) * m;
  const bob = Math.abs(Math.sin(ph)) * 1.7 * m;
  const breathe = Math.sin(t * 2.3 + (a.seed || 0)) * (1 - m);
  const P = {
    dy: -bob + breathe * 0.25 - (a.hop || 0), sx: 1, sy: 1 + breathe * 0.012,
    tilt: sw * 0.035 + (a.tilt || 0), headTilt: a.headTilt || 0, headDy: breathe * 0.35,
    legL: 0, legR: 0, legLx: 0, legRx: 0,
    hL: [-7.4, -7.9], hR: [7.4, -7.9], held: null, heldHand: 'R',
  };
  // squash on turns and landings
  if (a.turnT > 0) { const k = a.turnT / 0.14; P.sx = 1 - 0.1 * k; P.sy = 1 + 0.06 * k; }
  if (a.squash) { P.sy *= 1 - a.squash * 0.18; P.sx *= 1 + a.squash * 0.14; }

  if (view === 'side') {
    P.legLx = sw * 2.8; P.legRx = -sw * 2.8;
    P.legL = -Math.max(0, Math.sin(ph)) * 1.4 * m; P.legR = -Math.max(0, -Math.sin(ph)) * 1.4 * m;
    P.hL = [-sw * 4.2 - 0.5, -8.2]; P.hR = [sw * 4.2 + 0.5, -8.2];
  } else {
    P.legL = -Math.max(0, Math.sin(ph)) * 2.2 * m; P.legR = -Math.max(0, -Math.sin(ph)) * 2.2 * m;
    P.hL = [-7.2 - Math.abs(sw) * 0.4, -7.8 - sw * 1.6]; P.hR = [7.2 + Math.abs(sw) * 0.4, -7.8 + sw * 1.6];
  }

  switch (act) {
    case 'wave': P.hR = [9.5, -20 + Math.sin(t * 12) * 1.6]; break;
    case 'cheer': { const k = Math.abs(Math.sin(t * 9)); P.hL = [-8.6, -21 - k * 2]; P.hR = [8.6, -21 - k * 2]; break; }
    case 'think': P.hR = [3.2, -18.4]; P.headTilt += 0.09; break;
    case 'carry': P.hL = [-4.2, -11]; P.hR = [4.2, -11]; P.held = a.held; P.heldHand = 'both'; break;
    case 'drink': case 'eat': {
      const k = (Math.sin(at * 2.2) + 1) / 2, up = k > 0.72 ? 1 : 0;
      P.hR = up ? [2.4, -18.2] : [5.2, -10.5]; P.held = a.held || (act === 'drink' ? 'cup' : 'bowl');
      if (up && act === 'eat') P.chew = true;
      if (a.sit) P.hL = [-4.8, -10];
      break;
    }
    case 'hold': P.hR = [5.4, -10.6]; P.held = a.held; break;
    case 'chop': case 'work': P.hR = [4.6, -10.8 - Math.abs(Math.sin(at * 14)) * 3]; P.hL = [-4.2, -10.2]; P.held = act === 'chop' ? 'knife' : a.held; break;
    case 'stir': P.hR = [3 + Math.cos(at * 8) * 2, -10.6 + Math.sin(at * 8) * 1]; P.hL = [-4.6, -10]; P.held = 'ladle'; break;
    case 'hammer': { const k = (at * 3.4) % 1, s = k < 0.7 ? k / 0.7 : 1 - (k - 0.7) / 0.3; P.hR = [6.5, -10 - s * 9]; P.held = 'hammer'; P.hL = [-4.4, -8.6]; break; }
    case 'write': P.hL = [-3.8, -11.2]; P.hR = [2.6 + Math.sin(at * 9) * 0.8, -11.8]; P.held = 'notebook'; break;
    case 'clean': P.hR = [5.2 + Math.sin(at * 7) * 3.6, -9]; P.held = 'cloth'; break;
    case 'sweep': P.hR = [4.8, -11]; P.hL = [2, -9]; P.held = 'broom'; P.sweep = Math.sin(at * 5); break;
    case 'phone': P.hR = [3, -13.4]; P.hL = [-1.6, -12.6]; P.held = 'phone'; break;
    case 'photo': P.hR = [3.2, -19.2]; P.hL = [-3.2, -19.2]; P.held = 'camera'; break;
    case 'sit': break;
    case 'wait': {
      const tap = Math.max(0, Math.sin(at * 6)) * (Math.sin(at * 0.7) > 0.3 ? 1 : 0);
      P.legR = -tap * 1.2; P.hL = [-5, -9.2]; P.hR = [5, -9.2];
      break;
    }
    case 'sleep': P.headTilt += 0.16; P.headDy += 1.2; break;
  }
  if (a.sit) { P.dy += 3.2; P.legL = P.legR = 0; }
  return P;
}

// ---------------------------------------------------------------- face
function eyes(c, a, L, view, t, s) {
  const emo = a.emo || 'neutral';
  const blink = a.blinkAmt || 0;
  const lx = (a.lookX || 0) * 0.7, ly = (a.lookY || 0) * 0.6;
  const pos = view === 'side' ? [[5.6, 0]] : [[-4.5, 0], [4.5, 0]];
  const ey = HY + 1.4;
  for (const [ex0] of pos) {
    const ex = ex0 + lx * (view === 'side' ? 0.4 : 1);
    if (emo === 'happy' || emo === 'love' && blink > 0.5) {
      c.beginPath(); c.moveTo(ex - 2.2, ey + 0.8); c.quadraticCurveTo(ex, ey - 2.4, ex + 2.2, ey + 0.8);
      c.strokeStyle = EYE; c.lineWidth = 1.35; c.lineCap = 'round'; c.stroke();
      continue;
    }
    if (emo === 'love') { heart(c, ex, ey + 0.4, 2.3, '#f0607a', shade('#f0607a', -40), 0.6); continue; }
    if (blink > 0.55 || emo === 'sleepy') {
      c.beginPath(); c.moveTo(ex - 2.1, ey + 0.3); c.quadraticCurveTo(ex, ey + 1.6, ex + 2.1, ey + 0.3);
      c.strokeStyle = EYE; c.lineWidth = 1.2; c.lineCap = 'round'; c.stroke();
      continue;
    }
    const big = emo === 'surprised' ? 1.2 : 1;
    const rx = 2.05 * big, ry = 2.75 * big * (1 - blink * 0.7);
    const yy = ey + ly;
    // iris with a warm lower gradient like the reference
    c.beginPath(); c.ellipse(ex, yy, rx, ry, 0, 0, TAU);
    const g = c.createLinearGradient(0, yy - ry, 0, yy + ry);
    g.addColorStop(0, L.eye || EYE); g.addColorStop(0.55, L.eye || EYE); g.addColorStop(1, L.eye2 || EYE2);
    c.fillStyle = g; c.fill();
    // highlights
    const hx = emo === 'think' ? 0.6 : -0.7;
    circ(c, ex + hx, yy - ry * 0.42, 0.95 * big, '#fff', null);
    circ(c, ex + 0.8, yy + ry * 0.38, 0.42 * big, 'rgba(255,255,255,.85)', null);
    // lashes / upper lid
    if (L.lashes) {
      const o = view === 'side' ? 1 : Math.sign(ex0);
      c.beginPath(); c.moveTo(ex - rx * 1.05, yy - ry * 0.35); c.quadraticCurveTo(ex, yy - ry * 1.28, ex + rx * 1.05, yy - ry * 0.35);
      c.strokeStyle = EYE; c.lineWidth = 0.9; c.stroke();
      c.beginPath(); c.moveTo(ex + o * rx * 0.95, yy - ry * 0.5); c.lineTo(ex + o * (rx + 1.1), yy - ry * 0.95); c.stroke();
    }
    if (emo === 'sad') {
      const o = ex0 < 0 ? 1 : -1; // inner corner raised = sad (lowered would read as angry)
      c.beginPath(); c.moveTo(ex - o * 2.3, yy - ry * 0.9 + 0.5); c.lineTo(ex + o * 2.3, yy - ry * 0.9 - 0.9);
      c.strokeStyle = EYE; c.lineWidth = 0.9; c.stroke();
    }
  }
  // brows: only for strong emotions, drawn later over bangs
  s.brows = emo === 'angry' || emo === 'sad' || emo === 'surprised' || emo === 'think';
}

function blushAndMouth(c, a, L, view, t, P) {
  const emo = a.emo || 'neutral';
  const bx = view === 'side' ? [7.6] : [-7.3, 7.3];
  for (const x of bx) ell(c, x, HY + 4.6, view === 'side' ? 1.8 : 2.4, 1.35, emo === 'angry' ? 'rgba(240,110,110,.65)' : BLUSH, null);
  if (emo !== 'angry' && view !== 'side') for (const x of bx) { // tiny blush lines like the reference
    c.strokeStyle = 'rgba(230,110,120,.45)'; c.lineWidth = 0.45;
    c.beginPath(); c.moveTo(x - 1, HY + 4.1); c.lineTo(x - 1.6, HY + 5.1); c.moveTo(x + 0.3, HY + 4.1); c.lineTo(x - 0.3, HY + 5.1); c.stroke();
  }
  const mx = view === 'side' ? 8.4 : 0, my = HY + 6.4;
  let open = 0;
  if (a.talking) open = 0.35 + 0.65 * Math.abs(Math.sin(t * 17 + Math.sin(t * 5)));
  if (P.chew) open = 0.5;
  c.lineCap = 'round';
  if (emo === 'surprised') { ell(c, mx, my + 0.4, 1.3, 1.6 + open * 0.4, MOUTH, INK, 0.6); return; }
  if (open > 0.15 || emo === 'happy' || emo === 'love') {
    const w = view === 'side' ? 1.3 : 1.9, h = emo === 'happy' || emo === 'love' ? Math.max(open, 0.8) * 1.9 : open * 1.8;
    c.beginPath(); c.moveTo(mx - w, my - 0.3); c.quadraticCurveTo(mx, my + h * 1.4, mx + w, my - 0.3); c.closePath();
    c.fillStyle = MOUTH; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.6; c.stroke();
    if (h > 1) ell(c, mx, my + h * 0.55, w * 0.55, h * 0.3, '#f28b95', null);
    return;
  }
  c.beginPath();
  if (emo === 'sad') { c.moveTo(mx - 1.3, my + 0.7); c.quadraticCurveTo(mx, my - 0.5, mx + 1.3, my + 0.7); }
  else if (emo === 'angry') { c.moveTo(mx - 1.2, my + 0.2); c.lineTo(mx + 1.2, my); }
  else if (emo === 'think') { c.moveTo(mx - 0.9, my + 0.3); c.quadraticCurveTo(mx + 0.3, my + 0.1, mx + 1.3, my - 0.4); }
  else { c.moveTo(mx - 1.2, my - 0.2); c.quadraticCurveTo(mx, my + 1, mx + 1.2, my - 0.2); }
  c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
}

function brows(c, a, L, view) {
  const emo = a.emo, C = cols(L);
  const xs = view === 'side' ? [5.8] : [-4.6, 4.6];
  c.strokeStyle = C.hairS; c.lineWidth = 0.9; c.lineCap = 'round';
  for (const x of xs) {
    const inner = view === 'side' ? -1 : -Math.sign(x);
    const y = HY - 3.4;
    c.beginPath();
    if (emo === 'angry') { c.moveTo(x - inner * 1.8, y - 0.8); c.lineTo(x + inner * 1.6, y + 0.5); }
    else if (emo === 'sad') { c.moveTo(x - inner * 1.8, y + 0.5); c.lineTo(x + inner * 1.6, y - 0.6); }
    else if (emo === 'surprised') { c.moveTo(x - 1.6, y - 0.8); c.quadraticCurveTo(x, y - 2, x + 1.6, y - 0.8); }
    else { c.moveTo(x - 1.5, y - 0.4); c.quadraticCurveTo(x, y - 1.2, x + 1.5, y - 0.2); }
    c.stroke();
  }
}

// ---------------------------------------------------------------- hair
// Back layer: drawn before the head (behind it, and for long hair behind the body).
function hairBack(c, L, view) {
  const C = cols(L), st = L.hairStyle;
  c.fillStyle = L.hair; c.strokeStyle = INK; c.lineWidth = 1;
  if (st === 'long' || st === 'bob' || st === 'twin' || st === 'pony' || st === 'wavy') {
    const len = st === 'long' || st === 'wavy' ? 15 : st === 'bob' ? 7.5 : 3;
    if (view !== 'side' || st !== 'pony') {
      c.beginPath();
      const w = HR + 1.8;
      if (view === 'side') { c.moveTo(-w, HY - 2); c.lineTo(-w - 0.6, HY + len); c.quadraticCurveTo(-w / 2, HY + len + 3, 1.5, HY + len - 1); c.lineTo(0, HY - 2); c.closePath(); c.fill(); c.stroke(); }
      else {
        c.moveTo(-w, HY - 2);
        c.lineTo(-w - (st === 'wavy' ? 0.8 : 0), HY + len);
        if (st === 'wavy') { for (let i = 0; i < 4; i++) { const x = -w + (i + 0.5) * (w * 2 / 4); c.quadraticCurveTo(x - w / 8, HY + len + 3, x + w / 4, HY + len); } }
        else c.quadraticCurveTo(0, HY + len + 3.2, w, HY + len);
        c.lineTo(w, HY - 2);
        c.closePath(); c.fill(); c.stroke();
      }
    }
  }
  if (st === 'twin') {
    for (const s of view === 'side' ? [-1] : [-1, 1]) {
      const x = view === 'side' ? -HR + 1 : s * (HR + 1.2);
      c.beginPath(); c.moveTo(x - 2.4, HY - 3); c.quadraticCurveTo(x + s * 5.5, HY + 6, x + s * 1.5, HY + 15); c.quadraticCurveTo(x - s * 2, HY + 8, x - 2.4 * -s, HY - 3);
      c.fill(); c.stroke();
    }
  }
  if (st === 'pony' && view !== 'front') {
    const x = view === 'side' ? -HR + 1 : 0;
    c.beginPath(); c.moveTo(x - 2.4, HY - 5); c.quadraticCurveTo(x - 7.5, HY + 2, x - 3.2, HY + 12); c.quadraticCurveTo(x + 0.5, HY + 4, x + 2.4, HY - 5);
    c.fill(); c.stroke();
  }
}

function hairFront(c, L, view, t) {
  const C = cols(L), st = L.hairStyle;
  c.fillStyle = L.hair; c.strokeStyle = INK; c.lineWidth = 1;
  const top = HY - HRY - 1.6;
  if (view === 'back') {
    c.beginPath(); c.ellipse(0, HY - 0.6, HR + 1.3, HRY + 1.2, 0, 0, TAU); c.fill(); c.stroke();
    // hair part / strands
    c.strokeStyle = C.hairS; c.lineWidth = 0.7;
    c.beginPath(); c.moveTo(0, top + 1); c.quadraticCurveTo(-1, HY, -0.5, HY + 8); c.stroke();
    c.beginPath(); c.moveTo(-5, top + 3); c.quadraticCurveTo(-7, HY, -6, HY + 7); c.moveTo(5, top + 3); c.quadraticCurveTo(7, HY, 6, HY + 7); c.stroke();
    if (st === 'short' || st === 'spiky') {
      c.fillStyle = L.skin; ell(c, 0, HY + HRY - 0.4, 5, 2, L.skin, null);
    }
  } else if (view === 'side') {
    // back of head fully hair, face at front-lower
    c.beginPath();
    c.moveTo(HR - 1.5, HY - 2.6);
    c.quadraticCurveTo(HR + 0.6, top + 1.5, 2, top);
    c.quadraticCurveTo(-HR - 2.2, top + 0.2, -HR - 1.4, HY + 2);
    c.quadraticCurveTo(-HR - 0.4, HY + HRY * 0.8, -3.6, HY + HRY * 0.55);
    c.quadraticCurveTo(-1, HY + 1, 1.2, HY - 1.8);
    c.quadraticCurveTo(5, HY - 3.8, HR - 1.5, HY - 2.6);
    c.closePath(); c.fill(); c.stroke();
    if (st === 'bob' || st === 'long' || st === 'wavy') { // side lock over the ear
      c.beginPath(); c.moveTo(-1.2, HY - 1.5); c.quadraticCurveTo(1.6, HY + 4, 0, HY + (st === 'bob' ? 8 : 10)); c.quadraticCurveTo(-3.4, HY + 6, -3.2, HY); c.closePath(); c.fill(); c.stroke();
    }
    // sheen
    c.strokeStyle = C.hairH; c.lineWidth = 1.2; c.globalAlpha = 0.7;
    c.beginPath(); c.arc(-1, HY - 2, HR - 2.5, -2.4, -1.4); c.stroke(); c.globalAlpha = 1;
  } else {
    // front view: crown + bangs with three soft tips
    c.beginPath();
    c.moveTo(-HR - 0.9, HY + 3);
    c.bezierCurveTo(-HR - 2.2, top - 1, HR + 2.2, top - 1, HR + 0.9, HY + 3);
    if (st === 'short' || st === 'spiky') {
      c.lineTo(HR - 1, HY - 1.6);
      const tips = st === 'spiky' ? [[7, -4.2], [5.5, -1.4], [2.2, -4.6], [0, -1.6], [-2.6, -4.6], [-5.5, -1.6], [-7.4, -4]] : [[6.5, -4.2], [3.8, -2], [0.5, -4.4], [-3, -2.2], [-6.5, -4.4]];
      for (const [x, y] of tips) c.lineTo(x, HY + y);
      c.lineTo(-HR + 1, HY - 1.6);
    } else if (st === 'bald') {
      c.lineTo(HR - 1, HY - 3); c.quadraticCurveTo(0, HY - 7, -HR + 1, HY - 3);
    } else {
      c.quadraticCurveTo(HR - 0.4, HY - 2.2, HR - 2.6, HY - 2.9);
      c.quadraticCurveTo(7, HY - 1.4, 5.2, HY - 3.9);
      c.quadraticCurveTo(3.4, HY - 1.6, 1.2, HY - 4.4);
      c.quadraticCurveTo(-1.2, HY - 1.8, -3.3, HY - 4.2);
      c.quadraticCurveTo(-5.8, HY - 1.2, -7.6, HY - 3.6);
      c.quadraticCurveTo(-HR + 0.6, HY - 2, -HR - 0.9, HY + 3);
    }
    c.closePath(); c.fill(); c.stroke();
    // face-framing locks
    if (st === 'bob' || st === 'long' || st === 'twin' || st === 'wavy' || st === 'buns' || st === 'pony') {
      const len = st === 'long' || st === 'wavy' ? 10 : st === 'buns' || st === 'pony' ? 5 : 8;
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(s * (HR - 3), HY - 3.4);
        c.quadraticCurveTo(s * (HR + 1.8), HY + 1, s * (HR + 0.6), HY + len);
        c.quadraticCurveTo(s * (HR - 1.6), HY + len - 2, s * (HR - 2.4), HY + 1.6);
        c.closePath(); c.fill(); c.stroke();
      }
    }
    // sheen arc
    c.strokeStyle = C.hairH; c.lineWidth = 1.3; c.globalAlpha = 0.75;
    c.beginPath(); c.ellipse(-1.5, HY - 3.2, HR - 4.2, HRY - 4.6, 0, -2.6, -1.7); c.stroke(); c.globalAlpha = 1;
  }
  // buns on top (all views)
  if (st === 'buns') {
    for (const s of view === 'side' ? [-0.3] : [-1, 1]) { circ(c, s * 7.2, top + 3, 3.9, L.hair); c.strokeStyle = C.hairH; c.lineWidth = 0.8; c.beginPath(); c.arc(s * 7.2 - 0.8, top + 2.2, 2.2, 3.4, 4.6); c.stroke(); }
  }
  if (st === 'granny') { circ(c, view === 'side' ? -4 : 0, top + 0.6, 4.4, L.hair); circ(c, view === 'side' ? -4 : 0, top + 0.6, 1.4, null, C.hairS, 0.6); }
  if (st === 'pony' && view === 'front') { ell(c, 0, top + 0.2, 2.6, 1.6, L.accent || '#f28fa3'); }
}

function hat(c, L, view, t) {
  const h = L.hat; if (!h) return;
  const top = HY - HRY - 1.6;
  const col = L.hatColor || '#f2d894';
  if (h === 'nonla') {
    // Vietnamese conical leaf hat
    const by = HY - 4.6;
    ell(c, 0, by + 0.6, 17, 3.2, shade(col, -26), INK, 1);
    c.beginPath(); c.moveTo(-16.5, by); c.quadraticCurveTo(-6, by - 8, 0, top - 7.5); c.quadraticCurveTo(6, by - 8, 16.5, by); c.quadraticCurveTo(0, by + 3.4, -16.5, by);
    c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.strokeStyle = shade(col, -30); c.lineWidth = 0.55;
    for (let i = 1; i < 4; i++) { const k = i / 4; c.beginPath(); c.moveTo(-16.5 * (1 - k) + 0, by - (by - top + 7.5) * k); c.quadraticCurveTo(0, by - (by - top + 7.5) * k + 2.2 * (1 - k), 16.5 * (1 - k), by - (by - top + 7.5) * k); c.stroke(); }
    if (L.hatRibbon) { c.strokeStyle = L.hatRibbon; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-9, by + 1.5); c.quadraticCurveTo(0, by + 4.5, 9, by + 1.5); c.stroke(); }
  } else if (h === 'cap') {
    c.beginPath(); c.ellipse(0, HY - 5, HR + 0.8, HRY - 0.5, 0, Math.PI, TAU); c.closePath();
    c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    if (view === 'front') ell(c, 0, HY - 4.4, HR + 2, 2.4, shade(col, -18));
    else if (view === 'side') { c.beginPath(); c.moveTo(HR - 3, HY - 5.2); c.quadraticCurveTo(HR + 5, HY - 5, HR + 5.6, HY - 3); c.lineTo(HR - 2.5, HY - 3.6); c.closePath(); c.fillStyle = shade(col, -18); c.fill(); c.stroke(); }
    circ(c, 0, top + 1, 1.2, shade(col, -30), null);
  } else if (h === 'bucket') {
    c.beginPath(); c.moveTo(-HR + 1, HY - 3.5); c.quadraticCurveTo(-HR + 1, top - 2.5, 0, top - 2.8); c.quadraticCurveTo(HR - 1, top - 2.5, HR - 1, HY - 3.5); c.closePath();
    c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    ell(c, 0, HY - 3.2, HR + 3.6, 2.8, shade(col, -14));
    c.strokeStyle = L.hatRibbon || shade(col, -40); c.lineWidth = 1.4; c.beginPath(); c.moveTo(-HR + 1.4, HY - 5.2); c.lineTo(HR - 1.4, HY - 5.2); c.stroke();
  } else if (h === 'bandana') {
    c.beginPath(); c.ellipse(0, HY - 4.2, HR + 0.9, HRY - 1.4, 0, Math.PI * 1.02, TAU * 0.99); c.closePath();
    c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) circ(c, i * 3.6, HY - 8 + Math.abs(i) * 0.8, 0.55, 'rgba(255,255,255,.9)', null);
    if (view !== 'front') { c.beginPath(); c.moveTo(-HR, HY - 5); c.lineTo(-HR - 4, HY - 2 + Math.sin(t * 5) * 0.8); c.lineTo(-HR - 2.5, HY - 6); c.fillStyle = col; c.fill(); c.stroke(); }
  } else if (h === 'chef') {
    box(c, -6.8, top - 3, 13.6, 7, 1.5, '#fffdf8');
    for (const x of [-4.6, 0, 4.6]) circ(c, x, top - 4.6, 4.2, '#fffdf8');
  } else if (h === 'flower') {
    for (let i = 0; i < 5; i++) { const an = i / 5 * TAU; circ(c, 8.4 + Math.cos(an) * 1.7, HY - 7.6 + Math.sin(an) * 1.7, 1.45, col, INK, 0.5); }
    circ(c, 8.4, HY - 7.6, 1.1, '#ffd35a', INK, 0.5);
  }
}
function box(c, x, y, w, h, r, fill) {
  c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h);
  c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
}

// ---------------------------------------------------------------- body
function legs(c, L, P, view) {
  const C = cols(L);
  const lh = L.kid ? 4.8 : 6.2;
  const draw = (x, lift) => {
    const top = HEM + 0.2, foot = -1.4 + lift;
    limb(c, [x, top, x, foot], 3.8, L.legs || L.skin);
    if (L.bottomLen) limb(c, [x, top, x, top + Math.min(L.bottomLen, foot - top)], 4.2, L.bottom);
    const fx = view === 'side' ? x + 1 : x;
    ell(c, fx, foot + 0.4, view === 'side' ? 2.9 : 2.5, 1.7, L.shoe);
    ell(c, fx - 0.5, foot - 0.2, 1, 0.5, C.shoeH, null);
  };
  if (P.sitHide) return;
  if (view === 'side') { draw(P.legRx - 0.6, P.legR); draw(P.legLx + 0.6, P.legL); }
  else { draw(-2.9, P.legL); draw(2.9, P.legR); }
  void lh;
}

function torso(c, L, P, view, t) {
  const C = cols(L), st = L.topStyle || 'tee';
  const w1 = 5.2, w2 = st === 'dress' || st === 'aodai' ? 7.8 : 6.6;
  const hem = st === 'dress' ? HEM + 2.4 : st === 'aodai' ? HEM + 3.6 : HEM;
  // bottoms (shorts/skirt) peeking below top
  if (st !== 'dress' && st !== 'aodai') {
    c.beginPath(); c.moveTo(-6.2, HEM - 1.5); c.lineTo(6.2, HEM - 1.5); c.lineTo(6.6, HEM + 1.9); c.lineTo(-6.6, HEM + 1.9); c.closePath();
    c.fillStyle = L.bottom; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    if (view === 'front') { c.strokeStyle = C.botS; c.lineWidth = 0.6; c.beginPath(); c.moveTo(0, HEM); c.lineTo(0, HEM + 1.9); c.stroke(); }
  }
  c.beginPath();
  c.moveTo(-w1, SH + 0.8);
  c.quadraticCurveTo(-w1 - 0.2, SH - 0.8, -w1 + 2, SH - 0.9);
  c.lineTo(w1 - 2, SH - 0.9);
  c.quadraticCurveTo(w1 + 0.2, SH - 0.8, w1, SH + 0.8);
  c.lineTo(w2, hem);
  c.quadraticCurveTo(0, hem + 1.3, -w2, hem);
  c.closePath();
  c.fillStyle = L.top; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  // shading on the side away from light
  c.save(); c.clip();
  c.fillStyle = C.topS; c.globalAlpha = 0.35; c.fillRect(view === 'side' ? -8 : 2.8, SH - 2, 6, 12); c.globalAlpha = 1;
  if (st === 'stripe') { c.fillStyle = L.top2 || '#fff'; for (let y = SH + 1.2; y < hem; y += 2.6) c.fillRect(-8, y, 16, 1.1); }
  if (st === 'floral') { for (let i = 0; i < 7; i++) { const x = ((i * 37) % 11) - 5.5, y = SH + 1 + ((i * 23) % 8); circ(c, x, y, 0.9, L.top2 || '#fff4b8', null); } }
  if (st === 'aodai' && view === 'front') { c.strokeStyle = C.topH; c.lineWidth = 0.7; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-2 + i * 1.5, SH + 5 + i * 1.6, 1.1, 0, TAU); c.stroke(); } }
  c.restore();
  if (view !== 'back') {
    if (st === 'hoodie') {
      // hood bunched behind neck + strings + pocket
      c.fillStyle = C.topH; c.beginPath(); c.moveTo(-5.2, SH - 0.6); c.quadraticCurveTo(0, SH + 3.2, 5.2, SH - 0.6); c.quadraticCurveTo(0, SH + 1.2, -5.2, SH - 0.6); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
      if (view === 'front') {
        c.strokeStyle = '#fff'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-1.4, SH + 1.4); c.lineTo(-1.6, SH + 4.4); c.moveTo(1.4, SH + 1.4); c.lineTo(1.6, SH + 4.4); c.stroke();
        c.strokeStyle = C.topS; c.lineWidth = 0.7; c.beginPath(); c.moveTo(-3.6, HEM - 2.6); c.quadraticCurveTo(0, HEM - 3.4, 3.6, HEM - 2.6); c.stroke();
      }
    } else if (st === 'shirt' || st === 'aodai') {
      c.fillStyle = st === 'aodai' ? L.top : '#fffdf6'; c.strokeStyle = INK; c.lineWidth = 0.7;
      if (view === 'front') {
        if (st === 'aodai') { c.beginPath(); c.moveTo(-2.4, SH - 0.8); c.lineTo(2.4, SH - 0.8); c.lineTo(2.2, SH + 0.4); c.lineTo(-2.2, SH + 0.4); c.closePath(); c.fillStyle = C.topH; c.fill(); c.stroke(); }
        else { poly(c, [-3.4, SH - 0.8, 0, SH + 2.2, -1.2, SH - 0.8], '#fffdf6', INK, 0.6); poly(c, [3.4, SH - 0.8, 0, SH + 2.2, 1.2, SH - 0.8], '#fffdf6', INK, 0.6); for (let i = 0; i < 3; i++) circ(c, 0, SH + 3.3 + i * 2.2, 0.4, C.topS, null); }
      }
    } else {
      c.strokeStyle = C.topS; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-2.6, SH - 0.7); c.quadraticCurveTo(0, SH + 1.4, 2.6, SH - 0.7); c.stroke();
    }
    if (L.apron) {
      c.beginPath(); c.moveTo(-3.8, SH + 2.2); c.lineTo(3.8, SH + 2.2); c.lineTo(5.2, hem + 0.8); c.quadraticCurveTo(0, hem + 1.9, -5.2, hem + 0.8); c.closePath();
      c.fillStyle = L.apron; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
      if (view === 'front') { c.strokeStyle = shade(L.apron, -30); c.lineWidth = 0.6; c.beginPath(); c.moveTo(-2.2, SH - 0.6); c.lineTo(-3.4, SH + 2.2); c.moveTo(2.2, SH - 0.6); c.lineTo(3.4, SH + 2.2); c.stroke(); box(c, -2, HEM - 3.2, 4, 2.4, 0.6, shade(L.apron, 12)); }
    }
    if (L.scarf) {
      c.fillStyle = L.scarf; c.beginPath(); c.ellipse(0, SH - 0.2, 5.6, 1.9, 0, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
      if (view === 'front') { c.beginPath(); c.moveTo(2, SH + 0.8); c.lineTo(3.4, SH + 5 + Math.sin(t * 4) * 0.4); c.lineTo(1.2, SH + 4.8); c.closePath(); c.fill(); c.stroke(); }
    }
    if (L.lanyard && view === 'front') { c.strokeStyle = L.lanyard; c.lineWidth = 0.6; c.beginPath(); c.moveTo(-2.2, SH - 0.4); c.lineTo(0, SH + 5); c.lineTo(2.2, SH - 0.4); c.stroke(); box(c, -1.4, SH + 4.6, 2.8, 3.3, 0.5, '#fff'); }
  }
  if (L.backpack) {
    if (view === 'back') { box(c, -5, SH + 0.4, 10, 9.4, 3, L.backpack); box(c, -3.4, SH + 5, 6.8, 3.6, 1.4, shade(L.backpack, -18)); }
    else if (view === 'front') { c.strokeStyle = shade(L.backpack, -25); c.lineWidth = 1.2; c.beginPath(); c.moveTo(-4, SH - 0.2); c.lineTo(-4.6, SH + 6); c.moveTo(4, SH - 0.2); c.lineTo(4.6, SH + 6); c.stroke(); }
    else { box(c, -8.4, SH + 0.8, 4.2, 8.6, 1.8, L.backpack); }
  }
  if (L.camera && view === 'front') { c.strokeStyle = '#3d3d44'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(-3, SH); c.lineTo(0, SH + 5); c.lineTo(3, SH); c.stroke(); box(c, -2.2, SH + 4.4, 4.4, 3, 0.8, '#4a4a54'); circ(c, 0, SH + 5.9, 1, '#9fc9e6', '#2a2a30', 0.5); }
}

function arm(c, L, sx, sy, hx, hy) {
  const C = cols(L);
  const mx = (sx + hx) / 2, my = (sy + hy) / 2;
  const sleeve = L.sleeve ?? 0.55;
  limb(c, [sx, sy, hx, hy], 3.3, L.armSkin || L.skin);
  if (sleeve > 0) limb(c, [sx, sy, sx + (hx - sx) * sleeve, sy + (hy - sy) * sleeve], 3.9, L.top);
  circ(c, hx, hy, 1.95, L.skin, INK, 0.9);
  void mx; void my; void C;
}

// ---------------------------------------------------------------- main entry
export function drawHuman(c, a, t) {
  const L = a.look;
  const view = viewOf(a.dir || 'down');
  const flip = a.dir === 'left' ? -1 : 1;
  const P = pose(a, view, t);
  const sc = (L.scale || 1);
  c.save();
  shadow(c, 0, 0.4, 9 * sc, 3.1 * sc, a.sit ? 0.12 : 0.2);
  c.scale(sc * flip, sc);
  c.translate(0, P.dy);
  c.rotate(P.tilt);
  c.scale(P.sx, P.sy);
  const s = {};

  const shL = view === 'side' ? [-0.6, SH + 1.4] : [-5, SH + 1.3];
  const shR = view === 'side' ? [0.6, SH + 1.4] : [5, SH + 1.3];

  // far arm (side view) and long back hair behind body
  if (view === 'side') { c.globalAlpha = 1; arm(c, { ...L, top: cols(L).topS, skin: cols(L).skinS, armSkin: cols(L).skinS }, shL[0], shL[1], P.hL[0], P.hL[1]); }
  if (view !== 'back') hairBack(c, L, view);
  if (!a.sit || !a.hideLegs) legs(c, L, P, view);
  torso(c, L, P, view, t);
  if (view === 'front') { arm(c, L, shL[0], shL[1], P.hL[0], P.hL[1]); }
  if (view === 'back') { arm(c, L, shL[0], shL[1], P.hL[0], P.hL[1]); arm(c, L, shR[0], shR[1], P.hR[0], P.hR[1]); }

  // head group
  c.save();
  c.translate(0, P.headDy);
  c.translate(0, HY + 6); c.rotate(P.headTilt); c.translate(0, -HY - 6);
  if (view === 'back') hairBack(c, L, view);
  if (view !== 'back') {
    // ears (visible on short hair)
    if (L.hairStyle === 'short' || L.hairStyle === 'spiky' || L.hairStyle === 'bald' || L.hairStyle === 'granny') {
      if (view === 'front') { ell(c, -HR + 0.3, HY + 1.6, 1.8, 2.4, L.skin); ell(c, HR - 0.3, HY + 1.6, 1.8, 2.4, L.skin); }
      else ell(c, -1, HY + 1.4, 1.8, 2.4, L.skin);
    }
    ell(c, 0, HY, HR, HRY, L.skin, INK, 1.05);
    // soft face shading at the bottom
    c.save(); c.beginPath(); c.ellipse(0, HY, HR, HRY, 0, 0, TAU); c.clip();
    c.fillStyle = 'rgba(230,160,130,.16)'; c.beginPath(); c.ellipse(0, HY + HRY + 2, HR + 2, 5, 0, 0, TAU); c.fill(); c.restore();
    eyes(c, a, L, view, t, s);
    blushAndMouth(c, a, L, view, t, P);
  }
  hairFront(c, L, view, t);
  if (s.brows && view !== 'back') brows(c, a, L, view);
  if (L.glasses && view !== 'back') {
    c.strokeStyle = L.glasses; c.lineWidth = 0.8;
    const xs = view === 'side' ? [5.6] : [-4.5, 4.5];
    for (const x of xs) { c.beginPath(); c.ellipse(x, HY + 1.4, 3.1, 2.8, 0, 0, TAU); c.stroke(); }
    if (view === 'front') { c.beginPath(); c.moveTo(-1.4, HY + 1); c.lineTo(1.4, HY + 1); c.stroke(); }
  }
  hat(c, L, view, t);
  if (L.flower && view !== 'back') { for (let i = 0; i < 5; i++) { const an = i / 5 * TAU + 0.3; circ(c, (view === 'side' ? -2 : 7.8) + Math.cos(an) * 1.6, HY - 6.8 + Math.sin(an) * 1.6, 1.35, L.flower, INK, 0.5); } circ(c, view === 'side' ? -2 : 7.8, HY - 6.8, 0.9, '#ffd35a', null); }
  c.restore();

  // near arm(s) last so held items sit on top
  if (view === 'side') arm(c, L, shR[0], shR[1], P.hR[0], P.hR[1]);
  if (view === 'front') arm(c, L, shR[0], shR[1], P.hR[0], P.hR[1]);
  if (P.held && view !== 'back') {
    if (P.heldHand === 'both') drawHeld(c, P.held, 0, P.hR[1] - 1.5, t, view);
    else drawHeld(c, P.held, P.hR[0], P.hR[1], t, view, P);
  }
  if (view === 'side' && P.sweep !== undefined) void 0;
  c.restore();
}

// Emotes float above a character's head. `k` is 0..1 lifetime progress.
export function drawEmote(c, type, x, y, k, t) {
  const pop = k < 0.15 ? (k / 0.15) : 1;
  const s = 0.6 + 0.4 * Math.min(1, pop * 1.25) - (pop < 1 ? 0 : 0);
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

// Draw an actor into a portrait canvas (dialogue box, order card). The same rig
// is used so portraits always match the in-world character exactly.
export function drawPortraitInto(ctx, w, h, a, t, drawFn, opts = {}) {
  const scale = opts.scale || h / 28;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h + (opts.dy ?? 11) * scale);
  ctx.scale(scale, scale);
  drawFn(ctx, a, t);
  ctx.restore();
}
