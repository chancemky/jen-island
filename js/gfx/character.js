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
import { INK, ell, circ, limb, poly, shadow, heart, line } from './draw.js';
import { drawHeld } from './food.js';

const HY = -24.4, HR = 12.5, HRY = 11.4; // big round head (about half the height)
const SH = -12.4, HEM = -4.9;           // small body: shoulder and hem lines
export const EL = 3.8;
const HEAD_S = 0.9;                      // head scale about the neck (more body shows, same chibi face)                   // extra leg length; everything above the hips is lifted by this
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

// Pose: body offsets, hand targets and foot targets computed from animation
// state. Arms and legs are two-bone limbs (see ik()), so elbows and knees bend
// naturally when hands and feet move.
const HIP_Y = HEM + 0.2 - EL;            // hip joint height in the leg frame
const FOOT_Y = -1.4;                      // resting foot height
const THIGH = 3.75, SHIN = 3.65, UPPER = 3.95, FORE = 3.75;
function pose(a, view, t) {
  const m = a.moving || 0, ph = a.walkPh || 0, act = a.act, at = a.actT || 0;
  const sw = Math.sin(ph) * m;
  const bob = Math.abs(Math.sin(ph)) * 1.5 * m;                  // lowest at mid-stance
  const breathe = Math.sin(t * 2.3 + (a.seed || 0)) * (1 - m);
  const P = {
    dy: -bob + breathe * 0.25 - (a.hop || 0), sx: 1, sy: 1 + breathe * 0.012,
    tilt: (view === 'side' ? 0.07 * m : sw * 0.03) + (a.tilt || 0), headTilt: (a.headTilt || 0) + (view === 'side' ? -0.04 * m : sw * 0.02), headDy: breathe * 0.35 + bob * 0.25,
    hL: [-6.6, -4.6], hR: [6.6, -4.6], held: null, heldHand: 'R',
    fL: null, fR: null, footAng: [0, 0], elbowPref: null,
  };
  // squash on turns and landings
  if (a.turnT > 0) { const k = a.turnT / 0.14; P.sx = 1 - 0.1 * k; P.sy = 1 + 0.06 * k; }
  if (a.squash) { P.sy *= 1 - a.squash * 0.18; P.sx *= 1 + a.squash * 0.14; }
  // airborne (hopping onto a seat or jumping for joy): knees tuck, arms lift
  const air = Math.min(1, (a.hop || 0) / 8);

  // ---- legs: a walk cycle with lifted, forward-swinging feet
  const leg = (phase, side) => {
    const c = Math.cos(phase), s = Math.sin(phase);
    const lift = Math.max(0, c) * m;                                  // swinging leg lifts
    if (view === 'side') return { x: side * 0.6 + s * 3.8 * m, y: FOOT_Y - lift * 2.8 - air * 2.6, ang: lift * -0.35 + (s < 0 && c < 0 ? 0.12 * m : 0) };
    return { x: side * 2.5 + s * 0.3 * m, y: FOOT_Y - lift * 2.9 - air * 2.8, ang: 0 };
  };
  const L0 = leg(ph, -1), R0 = leg(ph + Math.PI, 1);
  P.fL = [L0.x, L0.y]; P.fR = [R0.x, R0.y]; P.footAng = [L0.ang, R0.ang];
  // ---- arms swing opposite to the legs, elbows bending more on the forward swing
  if (view === 'side') {
    const k = Math.sin(ph) * m;
    P.hL = [-k * 4 - 0.4, -5 + Math.max(0, -k) * 1.8]; P.hR = [k * 4 + 0.4, -5 + Math.max(0, k) * 1.8];
  } else {
    P.hL = [-6.5 - Math.abs(sw) * 0.3, -4.8 - sw * 1.6]; P.hR = [6.5 + Math.abs(sw) * 0.3, -4.8 + sw * 1.6];
  }
  if (air > 0.05) { P.hL = [P.hL[0] - air * 1.5, P.hL[1] - air * 5]; P.hR = [P.hR[0] + air * 1.5, P.hR[1] - air * 5]; }

  switch (act) {
    case 'wave': P.hR = [8.6 + Math.sin(t * 12) * 1.8, -18.6]; P.elbowPref = [1, 0.6]; break;
    case 'cheer': { const k = Math.abs(Math.sin(t * 9)); P.hL = [-7.6, -19.5 - k * 2.4]; P.hR = [7.6, -19.5 - k * 2.4]; break; }
    case 'think': P.hR = [3, -17.6]; P.headTilt += 0.09; P.hL = [-2.6, -9.2]; break;
    case 'carry': P.hL = [-3.8, -10.6]; P.hR = [3.8, -10.6]; P.held = a.held; P.heldHand = 'both'; break;
    case 'drink': case 'eat': {
      const k = (Math.sin(at * 2.2) + 1) / 2, up = k > 0.72 ? 1 : 0;
      P.hR = up ? [2.2, -17.4] : [4.8, -10.2]; P.held = a.held || (act === 'drink' ? 'cup' : 'bowl');
      if (up && act === 'eat') P.chew = true;
      if (a.sit) P.hL = [-4.2, -8.6];
      break;
    }
    case 'hold': P.hR = [5, -10.2]; P.held = a.held; break;
    case 'chop': case 'work': P.hR = [4.4, -10.4 - Math.abs(Math.sin(at * 14)) * 3]; P.hL = [-3.8, -9.8]; P.held = act === 'chop' ? 'knife' : a.held; break;
    case 'stir': P.hR = [3 + Math.cos(at * 8) * 2, -10.4 + Math.sin(at * 8) * 1]; P.hL = [-4.2, -9.6]; P.held = 'ladle'; break;
    case 'hammer': { const k = (at * 3.4) % 1, s2 = k < 0.7 ? k / 0.7 : 1 - (k - 0.7) / 0.3; P.hR = [6.2, -9.6 - s2 * 8.6]; P.held = 'hammer'; P.hL = [-4, -8.4]; P.elbowPref = [1, 0.3]; break; }
    case 'write': P.hL = [-3.4, -10.8]; P.hR = [2.4 + Math.sin(at * 9) * 0.8, -11.4]; P.held = 'notebook'; break;
    case 'clean': P.hR = [5 + Math.sin(at * 7) * 3.4, -8.8]; P.held = 'cloth'; break;
    case 'sweep': P.hR = [4.6, -10.6]; P.hL = [2, -8.8]; P.held = 'broom'; P.sweep = Math.sin(at * 5); break;
    case 'phone': P.hR = [3.4, -15.6]; P.hL = [-2.4, -9.6]; P.held = 'phone'; P.elbowPref = [1, 1]; break;
    case 'photo': P.hR = [3, -18.2]; P.hL = [-3, -18.2]; P.held = 'camera'; break;
    case 'dance': { const k = Math.sin(at * 7); P.hL = [-7 + k, -14 - Math.abs(k) * 4]; P.hR = [7 + k, -14 - Math.abs(-k) * 4]; P.tilt += k * 0.08; P.dy -= Math.abs(Math.sin(at * 7)) * 1.6; break; }
    case 'stretch': { const k = Math.sin(Math.min(1, at / 1.6) * Math.PI); P.hL = [-3 - k, -12 - k * 9]; P.hR = [3 + k, -12 - k * 9]; P.sy *= 1 + k * 0.05; break; }
    case 'sit': break;
    case 'wait': {
      const tap = Math.max(0, Math.sin(at * 6)) * (Math.sin(at * 0.7) > 0.3 ? 1 : 0);
      P.fR = [P.fR[0], FOOT_Y - tap * 1.2]; P.hL = [-4.6, -8.8]; P.hR = [4.6, -8.8];
      break;
    }
    case 'sleep': P.headTilt += 0.16; P.headDy += 1.2; break;
    case 'ride': P.ride = true; break;
  }

  // ---- sitting: hips drop onto the seat, knees bend, feet rest on the ground
  if (a.sit || P.ride) {
    const seatH = a.seatH ?? 7.5;
    P.dy = (-seatH - HIP_Y) + breathe * 0.2 - (a.hop || 0) * 0 ;
    const ground = (a.footAt ? a.footAt[1] : FOOT_Y) - P.dy;          // ground height in the leg frame
    if (view === 'side') {
      const fx = a.footAt ? a.footAt[0] : 3.6;
      P.fL = [fx - 0.4, ground]; P.fR = [fx + 0.4, ground]; P.footAng = [0, 0]; P.kneePref = [1, -0.6];
    } else {
      P.sitFront = true; P.fL = [-2.7, ground]; P.fR = [2.7, ground]; P.footAng = [0, 0];
    }
    // hands rest on the lap unless busy
    if (!act || act === 'sit' || act === 'sleep') {
      if (view === 'side') { P.hL = [2.6, HIP_Y + P.dy * 0 + EL + 0.6]; P.hR = [3.2, HIP_Y + EL + 0.2]; }
      else { P.hL = [-3.4, HIP_Y + EL + 1.8]; P.hR = [3.4, HIP_Y + EL + 1.8]; }
    }
    if (!P.ride && a.handAt && act === 'wave') P.hL = [a.handAt[0][0], a.handAt[0][1] - P.dy + EL];
    if (P.ride && a.handAt) { P.hL = [a.handAt[0][0], a.handAt[0][1] - P.dy + EL]; P.hR = [a.handAt[1][0], a.handAt[1][1] - P.dy + EL]; P.elbowPref = view === 'side' ? [-0.3, 1] : [Math.sign(a.handAt[1][0]) || 1, 0.8]; }
  }
  if (a.sit && !P.ride) P.tilt = (a.tilt || 0);
  return P;
}

// Two-bone IK: the joint (elbow/knee) between A and B for bone lengths l1, l2,
// on the side closest to the preferred direction.
function ik(ax, ay, bx, by, l1, l2, px, py) {
  let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 0.001;
  const maxD = l1 + l2 - 0.02;
  if (d > maxD) { bx = ax + dx / d * maxD; by = ay + dy / d * maxD; dx = bx - ax; dy = by - ay; d = maxD; }
  const ux = dx / d, uy = dy / d;
  const aa = (l1 * l1 - l2 * l2 + d * d) / (2 * d), hh = Math.sqrt(Math.max(0, l1 * l1 - aa * aa));
  const mx = ax + ux * aa, my = ay + uy * aa;
  const j1 = [mx - uy * hh, my + ux * hh], j2 = [mx + uy * hh, my - ux * hh];
  const d1 = (j1[0] - mx) * px + (j1[1] - my) * py;
  return { j: d1 >= 0 ? j1 : j2, end: [bx, by] };
}
// Cut a polyline at a given length (for sleeves and trouser legs).
function cutLine(pts, len) {
  const out = [pts[0], pts[1]];
  for (let i = 2; i < pts.length; i += 2) {
    const x0 = out[out.length - 2], y0 = out[out.length - 1], x1 = pts[i], y1 = pts[i + 1], d = Math.hypot(x1 - x0, y1 - y0);
    if (d >= len) { out.push(x0 + (x1 - x0) * len / Math.max(d, 0.001), y0 + (y1 - y0) * len / Math.max(d, 0.001)); return out; }
    out.push(x1, y1); len -= d;
  }
  return out;
}

// ---------------------------------------------------------------- face
function eyes(c, a, L, view, t, s) {
  const emo = a.act === 'sleep' ? 'sleepy' : (a.emo || 'neutral');
  const blink = a.blinkAmt || 0;
  const lx = (a.lookX || 0) * 0.7, ly = (a.lookY || 0) * 0.6;
  const pos = view === 'side' ? [[6.2, 0]] : [[-5.1, 0], [5.1, 0]];
  const ey = HY + 3.1;
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
    const big = emo === 'surprised' ? 1.12 : 1;
    const rx = (view === 'side' ? 2.3 : 2.75) * big, ry = 3.55 * big * (1 - blink * 0.75);
    const yy = ey + ly;
    const iris = L.eyeCol || '#8a5a40';
    // sclera sliver, then a big glossy iris with a dark top and a lighter bottom
    c.beginPath(); c.ellipse(ex, yy, rx, ry, 0, 0, TAU);
    const g = c.createLinearGradient(0, yy - ry, 0, yy + ry);
    g.addColorStop(0, '#2a1a18'); g.addColorStop(0.35, shade(iris, -45)); g.addColorStop(0.8, iris); g.addColorStop(1, shade(iris, 45));
    c.fillStyle = g; c.fill();
    // pupil
    ell(c, ex + lx * 0.2, yy + ry * 0.05, rx * 0.46, ry * 0.5, 'rgba(25,14,12,.75)', null);
    // highlights: a big one, a small one and a tiny sparkle
    const hx = emo === 'think' ? 0.7 : -0.8;
    ell(c, ex + hx, yy - ry * 0.4, 1.25 * big, 1.05 * big, '#fff', null);
    circ(c, ex + 0.95, yy + ry * 0.42, 0.55 * big, 'rgba(255,255,255,.9)', null);
    if (emo === 'happy' || emo === 'excited' || emo === 'neutral') circ(c, ex + 1.2, yy - ry * 0.62, 0.35, '#fff', null);
    // thick upper lash line with an outer flick — the big-eyed chibi look
    // lash line hugs the top of the eye, mirrored per side, with a soft outer flick
    const o = view === 'side' ? 1 : Math.sign(ex0);
    c.beginPath(); c.moveTo(ex - o * rx * 1.0, yy - ry * 0.5); c.quadraticCurveTo(ex - o * rx * 0.05, yy - ry * 1.3, ex + o * rx * 1.14, yy - ry * 0.18);
    c.strokeStyle = '#2a1a18'; c.lineWidth = 1.2; c.lineCap = 'round'; c.stroke();
    if (L.lashes) { c.beginPath(); c.moveTo(ex + o * rx * 1.08, yy - ry * 0.22); c.quadraticCurveTo(ex + o * (rx + 1.1), yy - ry * 0.3, ex + o * (rx + 1.6), yy - ry * 0.62); c.lineWidth = 0.9; c.stroke(); }
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
  const bx = view === 'side' ? [8.3] : [-8.2, 8.2];
  for (const x of bx) ell(c, x, HY + 6.9, view === 'side' ? 2 : 2.7, 1.5, emo === 'angry' ? 'rgba(240,110,110,.65)' : 'rgba(250,135,150,.55)', null);
  if (emo !== 'angry' && view !== 'side') for (const x of bx) { // tiny blush strokes
    c.strokeStyle = 'rgba(230,100,120,.5)'; c.lineWidth = 0.5;
    c.beginPath(); for (let k = -1; k <= 1; k++) { c.moveTo(x + k * 1.1 + 0.5, HY + 6.2); c.lineTo(x + k * 1.1 - 0.3, HY + 7.5); } c.stroke();
  }
  const mx = view === 'side' ? 9.3 : 0, my = HY + 8.2;
  let open = 0;
  if (a.talking) open = 0.35 + 0.65 * Math.abs(Math.sin(t * 17 + Math.sin(t * 5)));
  if (P.chew) open = 0.5;
  c.lineCap = 'round';
  if (emo === 'surprised') { ell(c, mx, my + 0.4, 1.3, 1.6 + open * 0.4, MOUTH, INK, 0.6); return; }
  if (open > 0.15 || emo === 'happy' || emo === 'love') {
    const w = view === 'side' ? 1.1 : 1.6, h = emo === 'happy' || emo === 'love' ? Math.max(open, 0.8) * 1.7 : open * 1.6;
    c.beginPath(); c.moveTo(mx - w, my - 0.3); c.quadraticCurveTo(mx, my + h * 1.4, mx + w, my - 0.3); c.closePath();
    c.fillStyle = MOUTH; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.6; c.stroke();
    if (h > 1) ell(c, mx, my + h * 0.55, w * 0.55, h * 0.3, '#f28b95', null);
    return;
  }
  c.beginPath();
  if (emo === 'sad') { c.moveTo(mx - 1.3, my + 0.7); c.quadraticCurveTo(mx, my - 0.5, mx + 1.3, my + 0.7); }
  else if (emo === 'angry') { c.moveTo(mx - 1.2, my + 0.2); c.lineTo(mx + 1.2, my); }
  else if (emo === 'think') { c.moveTo(mx - 0.9, my + 0.3); c.quadraticCurveTo(mx + 0.3, my + 0.1, mx + 1.3, my - 0.4); }
  else { c.moveTo(mx - 1.1, my - 0.3); c.quadraticCurveTo(mx - 0.55, my + 0.7, mx, my - 0.05); c.quadraticCurveTo(mx + 0.55, my + 0.7, mx + 1.1, my - 0.3); } // tiny cat-like smile
  c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
}

function brows(c, a, L, view) {
  const emo = a.emo, C = cols(L);
  const xs = view === 'side' ? [5.8] : [-4.6, 4.6];
  c.strokeStyle = C.hairS; c.lineWidth = 0.9; c.lineCap = 'round';
  for (const x of xs) {
    const inner = view === 'side' ? -1 : -Math.sign(x);
    const y = HY - 1.6;
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
      // soft pointed strands falling over the forehead, just above the eyes
      // uneven, softly pointed strands: rounded where they meet, sharp at the tips
      const tips = [[HR - 1.3, HY + 2], [7.2, HY - 0.2], [2.4, HY - 1.2], [-2.6, HY - 0.5], [-7.4, HY + 0.4], [-HR + 1.3, HY + 2]];
      const roots = [[9.2, HY - 5], [4.6, HY - 5.6], [-0.2, HY - 6], [-5, HY - 5.4], [-9.6, HY - 4.6]];
      c.lineTo(tips[0][0], tips[0][1]);
      for (let i = 0; i < roots.length; i++) {
        const [tx, ty] = tips[i], [rx0, ry0] = roots[i], [nx, ny] = tips[i + 1];
        c.quadraticCurveTo(tx - 0.6, (ty + ry0) / 2 - 1, rx0, ry0);   // up into the root, curved
        c.quadraticCurveTo(nx + 0.8, (ry0 + ny) / 2 - 0.5, nx, ny);    // down to the next tip
      }
      c.lineTo(-HR - 0.9, HY + 3);
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
  } else if (h === 'sunhat') {
    // wide floppy straw sun hat with a ribbon
    const by = HY - 5.2, wob = Math.sin(t * 2) * 0.4;
    c.beginPath(); c.ellipse(0, by + 1, HR + 7.5, 4.2 + wob * 0.3, 0, 0, TAU); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.beginPath(); c.moveTo(-HR + 2, by + 0.5); c.quadraticCurveTo(-HR + 1, top - 3.5, 0, top - 4); c.quadraticCurveTo(HR - 1, top - 3.5, HR - 2, by + 0.5); c.closePath(); c.fillStyle = shade(col, 10); c.fill(); c.stroke();
    c.strokeStyle = L.hatRibbon || '#f28f7c'; c.lineWidth = 2; c.beginPath(); c.moveTo(-HR + 2.2, by - 1.4); c.quadraticCurveTo(0, by + 0.6, HR - 2.2, by - 1.4); c.stroke();
    c.strokeStyle = shade(col, -25); c.lineWidth = 0.5; for (let i = 1; i < 4; i++) { c.beginPath(); c.ellipse(0, by + 1, (HR + 7.5) * i / 4, (4.2) * i / 4, 0, 0, Math.PI); c.stroke(); }
  } else if (h === 'helmet') {
    // nón bảo hiểm — the half-shell scooter helmet
    c.beginPath(); c.ellipse(0, HY - 4.2, HR + 1.4, HRY + 0.4, 0, Math.PI, TAU); c.closePath();
    c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.1; c.stroke();
    c.strokeStyle = shade(col, 40); c.lineWidth = 1.6; c.beginPath(); c.ellipse(-2, HY - 9, HR - 4, HRY - 5, 0, Math.PI * 1.1, Math.PI * 1.5); c.stroke();
    if (view === 'side') { c.beginPath(); c.moveTo(HR - 2, HY - 4.6); c.quadraticCurveTo(HR + 4, HY - 4.4, HR + 4.4, HY - 2.6); c.lineTo(HR - 1.4, HY - 3.2); c.closePath(); c.fillStyle = shade(col, -25); c.fill(); c.stroke(); }
    else if (view === 'front') { box(c, -HR + 1, HY - 5.4, (HR - 1) * 2, 2.2, 1, shade(col, -25)); }
    c.strokeStyle = '#5a4a48'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(view === 'side' ? -2 : -HR + 1.5, HY - 3); c.quadraticCurveTo(view === 'side' ? 2 : 0, HY + HRY - 1, view === 'side' ? 5 : HR - 1.5, HY - 3); c.stroke();
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
  if (P.sitHide) return;
  const skin = L.legs || L.skin, sk2 = cols(L).skinS;
  const pants = L.bottomLen ? Math.min(L.bottomLen * 1.05, THIGH + SHIN) : 0;
  const draw = (hx, foot, ang, far) => {
    let knee, end;
    if (P.sitFront) {
      // seated, facing us: the thigh points at the camera (short), shin drops to the floor
      knee = [hx * 1.18, HIP_Y + 1.3];
      const fy = Math.max(knee[1] + 0.6, Math.min(foot[1], knee[1] + SHIN));
      end = fy - knee[1] < 1 ? [hx * -0.35, knee[1] + 1.2] : [hx * 1.1, fy];   // too low a seat: cross-legged
    } else {
      const r = ik(hx, HIP_Y, foot[0], foot[1], THIGH, SHIN, ...(P.kneePref || (view === 'side' ? [1, -0.25] : [Math.sign(hx) * 0.3, -1])));
      knee = r.j; end = r.end;
    }
    const pts = [hx, HIP_Y, knee[0], knee[1], end[0], end[1]];
    limb(c, pts, 3.7, far ? sk2 : skin);
    // a soft highlight down the front of the leg
    c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1; c.beginPath(); c.moveTo(pts[0] + 0.6, pts[1]); c.lineTo(pts[2] + 0.6, pts[3]); c.lineTo(pts[4] + 0.5, pts[5] - 0.4); c.stroke();
    if (!L.bottomLen || pants < THIGH) { // bare knee: a tiny kneecap line
      c.strokeStyle = 'rgba(160,100,80,.45)'; c.lineWidth = 0.5; c.beginPath(); c.arc(knee[0], knee[1], 0.9, Math.PI * 0.9, Math.PI * 1.9); c.stroke();
    }
    if (pants > 0) {
      const pp = cutLine(pts, pants);
      limb(c, pp, 4.3, far ? C.botS : L.bottom);
      if (pants >= THIGH + SHIN - 0.2) { c.strokeStyle = C.botS; c.lineWidth = 0.6; c.beginPath(); c.moveTo(pp[pp.length - 2] - 2, pp[pp.length - 1]); c.lineTo(pp[pp.length - 2] + 2, pp[pp.length - 1]); c.stroke(); }
    }
    // shoe: a rounded sole with a toe cap; tilts as the foot lifts
    c.save(); c.translate(end[0], end[1] + 0.3); c.rotate(ang || 0);
    const fw = view === 'side' ? 3 : 2.5, fx = view === 'side' ? 0.9 : 0;
    ell(c, fx, 0.2, fw, 1.75, far ? shade(L.shoe, -12) : L.shoe);
    c.fillStyle = shade(L.shoe, -35); c.fillRect(fx - fw + 0.5, 1.2, fw * 2 - 1, 0.7);
    ell(c, fx - 0.6, -0.4, 1, 0.5, C.shoeH, null);
    c.restore();
  };
  if (view === 'side') { draw(-0.6, P.fL, P.footAng[0], true); draw(0.6, P.fR, P.footAng[1], false); }
  else { draw(-2.5, P.fL, P.footAng[0], false); draw(2.5, P.fR, P.footAng[1], false); }
}

function torso(c, L, P, view, t) {
  const C = cols(L), st = L.topStyle || 'tee';
  const w1 = 4.5, w2 = st === 'dress' || st === 'aodai' ? 7 : 5.9;
  const hem = st === 'dress' ? HEM + 2.4 : st === 'aodai' ? HEM + 3.6 : HEM;
  // bottoms (shorts/skirt) peeking below top
  if (L.skirt && st !== 'dress' && st !== 'aodai') {
    c.beginPath(); c.moveTo(-5.4, HEM - 1.4); c.lineTo(5.4, HEM - 1.4); c.lineTo(7.4, HEM + 3.6); c.quadraticCurveTo(0, HEM + 4.8, -7.4, HEM + 3.6); c.closePath();
    c.fillStyle = L.bottom; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.strokeStyle = C.botS; c.lineWidth = 0.6; for (const x of [-3, 0, 3]) { c.beginPath(); c.moveTo(x * 0.8, HEM - 1); c.lineTo(x * 1.3, HEM + 3.8); c.stroke(); }
  } else if (st !== 'dress' && st !== 'aodai') {
    c.beginPath(); c.moveTo(-5.5, HEM - 1.4); c.lineTo(5.5, HEM - 1.4); c.lineTo(5.9, HEM + 1.7); c.lineTo(-5.9, HEM + 1.7); c.closePath();
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

function arm(c, L, sx, sy, hx, hy, pref, far) {
  const C = cols(L);
  const r = ik(sx, sy, hx, hy, UPPER, FORE, ...(pref || [Math.sign(hx - sx || sx) || 1, 0.5]));
  const pts = [sx, sy, r.j[0], r.j[1], r.end[0], r.end[1]];
  const skin = far ? C.skinS : (L.armSkin || L.skin);
  const sleeve = L.sleeve ?? 0.55;
  limb(c, pts, 3.2, skin);
  c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(pts[0] - 0.5, pts[1]); c.lineTo(pts[2] - 0.5, pts[3]); c.lineTo(pts[4] - 0.4, pts[5]); c.stroke();
  if (sleeve > 0) {
    const sp = cutLine(pts, sleeve * (UPPER + FORE));
    limb(c, sp, 3.9, far ? C.topS : L.top);
    // cuff
    const n = sp.length; c.strokeStyle = far ? shade(C.topS, -10) : C.topS; c.lineWidth = 0.7;
    const ex = sp[n - 2], ey = sp[n - 1], px = sp[n - 4], py = sp[n - 3], d = Math.hypot(ex - px, ey - py) || 1, nx = -(ey - py) / d, ny = (ex - px) / d;
    c.beginPath(); c.moveTo(ex + nx * 1.9, ey + ny * 1.9); c.lineTo(ex - nx * 1.9, ey - ny * 1.9); c.stroke();
  }
  // mitten hand with a little thumb
  const hx2 = r.end[0], hy2 = r.end[1];
  circ(c, hx2, hy2, 1.95, far ? C.skinS : L.skin, INK, 0.9);
  const fdx = hx2 - r.j[0], fdy = hy2 - r.j[1], fd = Math.hypot(fdx, fdy) || 1;
  circ(c, hx2 - fdy / fd * 1.2 + fdx / fd * 0.3, hy2 + fdx / fd * 1.2 + fdy / fd * 0.3, 0.75, far ? C.skinS : L.skin, INK, 0.5);
  return r.end;
}

// Role props worn on the back: surfboards, guitars.
function gearBehind(c, L, view, t, lift = -EL) {
  if (L.surf) {
    c.save(); c.translate(view === 'side' ? -6 : 7, -12 + lift); c.rotate(view === 'side' ? -0.25 : 0.18);
    c.beginPath(); c.ellipse(0, -8, 4.2, 17, 0, 0, TAU); c.fillStyle = L.surf; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -24); c.lineTo(0, 8); c.stroke();
    c.restore();
  }
  if (L.guitar && view !== 'side') {
    // guitar slung across the back: the body peeks out at the hip, the neck over the shoulder
    c.save(); c.translate(-8, -5 + lift); c.rotate(-0.55);
    limb(c, [0, -3, 0, -21], 2.2, '#8a5f3e'); box(c, -1.8, -24, 3.6, 3.4, 1, '#5a3a24', INK, 0.6);
    ell(c, 0, 2, 5.4, 6.4, '#e9a24a'); ell(c, 0, -3.4, 4.2, 4, '#e9a24a'); circ(c, 0, 0, 1.7, '#5a3a24', null);
    c.restore();
  }
}
// Props carried in front: a tote on the shoulder, a rolling suitcase.
function gearFront(c, L, view, t, a) {
  if (L.tote && view !== 'back') {
    const x = view === 'side' ? -2 : -6.4;
    c.strokeStyle = shade(L.tote, -30); c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + 2, SH + 1); c.lineTo(x - 0.5, SH + 6); c.stroke();
    box(c, x - 3.6, SH + 5.5, 6.6, 6.2, 1.5, L.tote, INK, 0.8);
    circ(c, x - 0.3, SH + 8.6, 1.1, '#fff8ea', null);
  }
  if (L.suitcase && !a.moving && !a.act && view === 'front') {
    c.save(); c.translate(9.2, 0 + EL);
    limb(c, [0, -12, 0, -18], 0.9, '#5a5660');
    box(c, -3.6, -12, 7.2, 10, 2, L.suitcase, INK, 0.9);
    line(c, -3.6, -8, 3.6, -8, shade(L.suitcase, -25), 0.8);
    circ(c, -2.4, -1.4, 1, '#3d3a42', null); circ(c, 2.4, -1.4, 1, '#3d3a42', null);
    c.restore();
  }
}

// A mochi-shaped head: round on top, a little fuller at the cheeks.
function headShape(c) {
  c.beginPath();
  c.moveTo(-HR, HY + 0.5);
  c.bezierCurveTo(-HR, HY - HRY * 1.38, HR, HY - HRY * 1.38, HR, HY + 0.5);
  c.bezierCurveTo(HR + 0.3, HY + HRY * 0.95, HR * 0.45, HY + HRY + 0.4, 0, HY + HRY + 0.4);
  c.bezierCurveTo(-HR * 0.45, HY + HRY + 0.4, -HR - 0.3, HY + HRY * 0.95, -HR, HY + 0.5);
  c.closePath();
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

  const shL = view === 'side' ? [-0.6, SH + 1.3] : [-4.3, SH + 1.2];
  const shR = view === 'side' ? [0.6, SH + 1.3] : [4.3, SH + 1.2];

  // far arm (side view) and long back hair behind body
  const prefL = P.elbowPref ? [-P.elbowPref[0], P.elbowPref[1]] : view === 'side' ? [-1, 0.6] : [-1, 0.45];
  const prefR = P.elbowPref || (view === 'side' ? [-1, 0.6] : [1, 0.45]);
  const headXf = () => { c.translate(0, P.headDy); c.translate(0, HY + 6); c.rotate(P.headTilt); c.scale(HEAD_S, HEAD_S); c.translate(0, -HY - 6); };
  if (view !== 'back') { c.save(); c.translate(0, -EL); headXf(); hairBack(c, L, view); c.restore(); }
  if (view !== 'back') gearBehind(c, L, view, t);
  if (!a.sit || !a.hideLegs) legs(c, L, P, view);
  c.translate(0, -EL);
  if (view === 'side') arm(c, L, shL[0], shL[1], P.hL[0], P.hL[1], P.elbowPref ? P.elbowPref : prefL, true);
  if (view === 'back') gearBehind(c, L, view, t, 0);
  torso(c, L, P, view, t);
  if (view === 'front') arm(c, L, shL[0], shL[1], P.hL[0], P.hL[1], prefL);
  if (view === 'back') { arm(c, L, shL[0], shL[1], P.hL[0], P.hL[1], prefL); arm(c, L, shR[0], shR[1], P.hR[0], P.hR[1], prefR); }

  // head group
  c.save();
  headXf();
  if (view === 'back') hairBack(c, L, view);
  if (view !== 'back') {
    // ears (visible on short hair)
    if (L.hairStyle === 'short' || L.hairStyle === 'spiky' || L.hairStyle === 'bald' || L.hairStyle === 'granny') {
      if (view === 'front') { ell(c, -HR + 0.3, HY + 1.6, 1.8, 2.4, L.skin); ell(c, HR - 0.3, HY + 1.6, 1.8, 2.4, L.skin); }
      else ell(c, -1, HY + 1.4, 1.8, 2.4, L.skin);
    }
    headShape(c); c.fillStyle = L.skin; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.05; c.stroke();
    // soft face shading at the bottom
    c.save(); headShape(c); c.clip();
    c.fillStyle = 'rgba(230,160,130,.16)'; c.beginPath(); c.ellipse(0, HY + HRY + 2, HR + 2, 5, 0, 0, TAU); c.fill(); c.restore();
    eyes(c, a, L, view, t, s);
    blushAndMouth(c, a, L, view, t, P);
  }
  hairFront(c, L, view, t);
  if (s.brows && view !== 'back') brows(c, a, L, view);
  if (L.glasses && view !== 'back') {
    c.strokeStyle = L.glasses; c.lineWidth = 0.8;
    const xs = view === 'side' ? [6.2] : [-5.1, 5.1];
    for (const x of xs) { c.beginPath(); c.ellipse(x, HY + 3.1, 3.7, 3.4, 0, 0, TAU); c.stroke(); }
    if (view === 'front') { c.beginPath(); c.moveTo(-1.4, HY + 2.6); c.lineTo(1.4, HY + 2.6); c.stroke(); }
  }
  hat(c, L, view, t);
  if (L.flower && view !== 'back') { for (let i = 0; i < 5; i++) { const an = i / 5 * TAU + 0.3; circ(c, (view === 'side' ? -2 : 7.8) + Math.cos(an) * 1.6, HY - 6.8 + Math.sin(an) * 1.6, 1.35, L.flower, INK, 0.5); } circ(c, view === 'side' ? -2 : 7.8, HY - 6.8, 0.9, '#ffd35a', null); }
  c.restore();

  // near arm(s) last so held items sit on top
  if (view === 'side' || view === 'front') { const e = arm(c, L, shR[0], shR[1], P.hR[0], P.hR[1], prefR); P.hR = e; }
  gearFront(c, L, view, t, a);
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
