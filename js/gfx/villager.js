// Villager model: a small 3D skeleton projected to the screen, in the style of
// cozy life-sim villagers (roughly three heads tall: big round head, short
// torso, short legs with chunky shoes, mitten hands).
//
// Why 3D: turning, walking and sitting look right from every angle. The body
// turns smoothly toward where it's going (including diagonals), legs swing in
// depth with a soft knee flex, arms swing forward/back with a relaxed elbow,
// and parts are drawn back-to-front so overlaps are always correct.
//
// Space: x right, y up, z toward the camera. Feet at y = 0. The camera looks
// down slightly: screenX = x, screenY = -y*CY + z*SZ.

import { TAU, shade, clamp } from '../core/util.js';
import { INK, ell, circ, limb, poly, shadow, heart, line, box } from './draw.js';
import { drawHeld } from './food.js';
import { HAIRCUTS } from '../data/hair.js';

const CY = 0.96, SZ = 0.3;
// skeleton dimensions (model units ≈ world units)
const HIP_Y = 8.6, HIP_X = 2.45, THIGH = 4.1, SHIN = 3.9, FOOT_L = 2.8;
const WAIST_Y = 9.0, CHEST_Y = 17.2, SHO_X = 5.3, SHO_Y = 16.3, UPPER = 3.9, FORE = 3.7;
// the big head sits right on the shoulders (overlapping the top of the body) — no neck
const NECK_Y = 17.4, HEAD_Y = 26.6, HR = 10.6;

// ---------------------------------------------------------------- math
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = a => Math.hypot(a[0], a[1], a[2]);
const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const rotY = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
// two-bone IK: joint between A and B (lengths l1, l2) bending toward `pole`
function ik(A, B, l1, l2, pole) {
  let d = sub(B, A), dl = len(d);
  const maxD = l1 + l2 - 0.01;
  if (dl > maxD) { B = add(A, mul(d, maxD / dl)); d = sub(B, A); dl = maxD; }
  const u = mul(d, 1 / (dl || 1));
  const aa = (l1 * l1 - l2 * l2 + dl * dl) / (2 * (dl || 1)), h = Math.sqrt(Math.max(0, l1 * l1 - aa * aa));
  let p = sub(pole, mul(u, dot(pole, u))); p = norm(p);
  return { j: add(add(A, mul(u, aa)), mul(p, h)), end: B };
}
const proj = p => [p[0], -p[1] * CY + p[2] * SZ];

// ---------------------------------------------------------------- colours
function cols(L) {
  if (L._v) return L._v;
  L._v = {
    skinS: shade(L.skin, -16), skinD: shade(L.skin, -30), hairS: shade(L.hair, -24), hairH: shade(L.hair, 32),
    topS: shade(L.top, -18), topH: shade(L.top, 18), botS: shade(L.bottom, -16), shoeS: shade(L.shoe, -22),
  };
  return L._v;
}

// ---------------------------------------------------------------- facing
const DIR_YAW = { down: 0, right: Math.PI / 2, up: Math.PI, left: -Math.PI / 2 };
function yawOf(a, t) {
  if (a.yawOverride !== undefined) return a.yawOverride;
  let target = DIR_YAW[a.dir || 'down'] ?? 0;
  if ((a.moving || 0) > 0.2 && a.moveAng !== undefined) target = a.moveAng;
  if (a._yaw === undefined || a.portrait || a._yawT === undefined) { a._yaw = target; a._yawT = t; return target; }
  const dt = Math.min(0.1, Math.max(0, t - a._yawT)); a._yawT = t;
  let d = target - a._yaw; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
  a._yaw += d * Math.min(1, dt * 14);                      // smooth turning
  return a._yaw;
}

// ---------------------------------------------------------------- pose
function pose(a, t, yaw) {
  const run = a.running ? 1 : 0;
  const m = Math.min(1, a.moving || 0), ph = a.walkPh || 0, act = a.act, at = a.actT || 0;
  const s1 = Math.sin(ph), c1 = Math.cos(ph);
  const breathe = Math.sin(t * 2.2 + (a.seed || 0)) * (1 - m);
  const stride = (2.8 + run * 1.4) * m;
  const P = {
    rootY: 0, lean: (0.07 + run * 0.13) * m, roll: s1 * 0.035 * m, sway: s1 * 0.35 * m,
    pelvisYaw: s1 * 0.14 * m, chestYaw: -s1 * 0.12 * m,
    headNod: Math.sin(ph * 2) * 0.03 * m + breathe * 0.01, headTilt: (a.headTilt || 0) + s1 * 0.03 * m,
    bob: (1 - Math.abs(c1)) * 0 + ((Math.cos(ph * 2) + 1) / 2) * (0.7 + run * 0.8) * m + breathe * 0.12,
    feet: [], hands: [null, null], held: null, heldHand: 'R', squashY: 1, squashX: 1, bites: a.bites || 0,
  };
  // body highest when a leg passes underneath (twice per stride)
  P.bob -= (a.hop || 0) * -1;                               // hops lift the whole body
  // ---- feet: stride along z, swing foot lifts (knees flex via IK)
  for (const side of [-1, 1]) {
    const phase = side < 0 ? ph : ph + Math.PI, sp = Math.sin(phase), cp = Math.cos(phase);
    const lift = Math.max(0, cp) * (1.4 + run * 1.3) * m;
    P.feet.push({ x: side * HIP_X * 0.95, y: 0.9 + lift, z: sp * stride, toe: -Math.max(0, cp) * 0.35 * m });
  }
  // ---- arms swing opposite to the legs; elbows relax and bend more going forward
  for (const side of [-1, 1]) {
    const phase = side < 0 ? ph + Math.PI : ph, sp = Math.sin(phase);
    const swing = sp * (2.6 + run * 2.2) * m;
    const bend = (0.8 + Math.max(0, sp) * 1.4 * m) + run * 2.4 * m;
    P.hands[side < 0 ? 0 : 1] = { x: side * (SHO_X + 2.3 + run * 0.4), y: SHO_Y - UPPER - FORE + 1.2 + bend * 0.5 + run * 1.2 * m, z: swing * 0.9 };   // hands hang just outside the hips
  }
  // airborne: knees tuck, arms up a little
  const air = Math.min(1, (a.hop || 0) / 8);
  if (air > 0.05) { for (const f of P.feet) { f.y += air * 2.4; f.z -= air * 1.2; } P.hands[0].y += air * 4; P.hands[1].y += air * 4; P.hands[0].x -= air; P.hands[1].x += air; }
  if (a.turnT > 0) { const k = a.turnT / 0.14; P.squashX = 1 - 0.06 * k; P.squashY = 1 + 0.04 * k; }
  if (a.squash) { P.squashY *= 1 - a.squash * 0.16; P.squashX *= 1 + a.squash * 0.12; }

  const aim = (i, x, y, z) => { P.hands[i] = { x, y, z, aim: true }; };
  switch (act) {
    case 'wave': aim(1, SHO_X + 3.2 + Math.sin(t * 12) * 1.8, SHO_Y + 6.4, 2); break;
    case 'cheer': { const k = Math.abs(Math.sin(t * 9)); aim(0, -SHO_X - 2.4, SHO_Y + 6.6 + k * 1.4, 1); aim(1, SHO_X + 2.4, SHO_Y + 6.6 + k * 1.4, 1); break; }
    case 'think': aim(1, 2.2, SHO_Y + 3.4, 5.4); P.headTilt += 0.1; break;
    case 'carry': aim(0, -2.6, SHO_Y - 3, 5); aim(1, 2.6, SHO_Y - 3, 5); P.held = a.held; P.heldHand = 'both'; break;
    case 'drink': case 'eat': { const k = (Math.sin(at * 2.2) + 1) / 2, up = k > 0.72; aim(1, 1.6, up ? SHO_Y + 4 : SHO_Y - 4, up ? 6.4 : 4.6); P.held = a.held || (act === 'drink' ? 'cup' : 'bowl'); P.sip = up; if (up && act === 'eat') P.chew = true; break; }
    case 'hold': aim(1, 3, SHO_Y - 4, 4.8); P.held = a.held; break;
    case 'chop': case 'work': aim(1, 3, SHO_Y - 3 + Math.abs(Math.sin(at * 14)) * 2.6, 5.2); aim(0, -2.6, SHO_Y - 4, 4.6); P.held = act === 'chop' ? 'knife' : a.held; break;
    case 'stir': aim(1, 2 + Math.cos(at * 8) * 1.6, SHO_Y - 3.4, 5 + Math.sin(at * 8) * 1.2); aim(0, -2.8, SHO_Y - 4, 4.4); P.held = 'ladle'; break;
    case 'hammer': { const k = (at * 3.4) % 1, s2 = k < 0.7 ? k / 0.7 : 1 - (k - 0.7) / 0.3; aim(1, SHO_X + 1, SHO_Y - 4 + s2 * 9, 4 - s2 * 3); aim(0, -3, SHO_Y - 5, 4); P.held = 'hammer'; P.lean += 0.06; break; }
    case 'write': aim(0, -2, SHO_Y - 3, 5); aim(1, 2 + Math.sin(at * 9) * 0.6, SHO_Y - 2.4, 5.4); P.held = 'notebook'; break;
    case 'clean': aim(1, 3 + Math.sin(at * 7) * 3, SHO_Y - 5, 5); P.held = 'cloth'; break;
    case 'sweep': aim(1, 3, SHO_Y - 3, 3); aim(0, 1.4, SHO_Y - 6, 4); P.held = 'broom'; P.sweep = Math.sin(at * 5); break;
    case 'phone': aim(1, SHO_X + 1.4, SHO_Y + 8, 1.8); P.held = 'phone'; P.headTilt += 0.08; break;
    case 'photo': aim(0, -2.2, SHO_Y + 7.6, 6); aim(1, 2.2, SHO_Y + 7.6, 6); P.held = 'camera'; break;
    case 'dance': { const k = Math.sin(at * 7); aim(0, -SHO_X - 2 + k, SHO_Y + 3 + Math.abs(k) * 3, 2); aim(1, SHO_X + 2 + k, SHO_Y + 3 + Math.abs(k) * 3, 2); P.roll += k * 0.1; P.bob += Math.abs(Math.sin(at * 7)) * 1.4; P.pelvisYaw += k * 0.2; break; }
    case 'stretch': { const k = Math.sin(Math.min(1, at / 1.6) * Math.PI); aim(0, -2 - k, SHO_Y + 3 + k * 8, 0.5); aim(1, 2 + k, SHO_Y + 3 + k * 8, 0.5); P.squashY *= 1 + k * 0.05; break; }
    case 'clap': { const k = Math.abs(Math.sin(at * 11)); aim(0, -0.8 - k * 2.4, SHO_Y + 1.6, 6.2); aim(1, 0.8 + k * 2.4, SHO_Y + 1.6, 6.2); P.bob += k * 0.4; break; }
    case 'laugh': { const k = Math.abs(Math.sin(at * 13)); aim(0, -2.8, SHO_Y - 6.4, 5); aim(1, 2.8, SHO_Y - 6.4, 5); P.bob += k * 0.9; P.headTilt -= 0.06; P.roll += Math.sin(at * 6.5) * 0.04; break; }
    case 'bow': { const k = Math.sin(Math.min(1, at / 0.9) * Math.PI); P.lean += k * 0.32; P.headNod += k * 0.3; P.squashY *= 1 - k * 0.06; P.bob -= k * 1.2; aim(0, -2.4, SHO_Y - 6, 4); aim(1, 2.4, SHO_Y - 6, 4); break; }
    case 'wait': P.feet[1].y += Math.max(0, Math.sin(at * 6)) * (Math.sin(at * 0.7) > 0.3 ? 0.9 : 0); break;
    case 'sleep': P.headNod += 0.12; break;
    case 'ride': P.ride = true; break;
  }
  // carrying a shopping basket in the left hand (unless that hand is busy)
  if (a.basket && !['cheer', 'carry', 'photo', 'dance', 'stretch', 'write', 'sweep', 'chop', 'work', 'stir', 'hammer', 'clap', 'laugh', 'bow'].includes(act)) { aim(0, -(SHO_X + 3.4), SHO_Y - 6.4 + P.bob * 0.3, 0.6 + Math.sin(ph) * 0.6 * m); P.basket = true; }
  // ---- lying back (in a hammock): legs together, ankles close, hands folded on the tummy
  if (a.lying) {
    P.lean = 0; P.roll = 0; P.sway = 0; P.pelvisYaw = 0; P.chestYaw = 0; P.bob = breathe * 0.25; P.headNod = -0.05;
    P.feet[0] = { x: -HIP_X * 0.55, y: 0.9, z: 0.2, toe: 0 }; P.feet[1] = { x: HIP_X * 0.5, y: 1.1, z: 0.9, toe: 0 };
    aim(0, -1.6, WAIST_Y + 2.6, 4.6); aim(1, 1.8, WAIST_Y + 3.6, 4.8);
    return P;
  }
  // ---- sitting / riding: hips on the seat, thighs forward, shins down
  if (a.sit || P.ride) {
    const seat = a.seatH ?? 6;
    P.seat = seat; P.lean = P.ride ? 0.12 : 0.02; P.roll = 0; P.sway = 0; P.pelvisYaw = 0; P.chestYaw = 0; P.bob = breathe * 0.12;
    const swing = Math.sin(t * 2 + (a.seed || 0)) * 0.6 * (P.ride ? 0 : 1);
    const ground = P.ride ? -7.5 : 0.9;
    for (const [i, side] of [[0, -1], [1, 1]]) P.feet[i] = { x: side * HIP_X, y: Math.max(ground, seat - 0.4 - SHIN - 0.6), z: THIGH + (P.ride ? 1.6 : 0.6) + (i ? swing : -swing), toe: 0 };
    if (!act || act === 'sit' || act === 'sleep') { aim(0, -3, seat + 1.6, 4.4); aim(1, 3, seat + 1.6, 4.4); }
    if (P.ride) { aim(0, -7.2, 6.8, 8.2); aim(1, 7.2, 6.8, 8.2); }
    else if (act === 'wave') aim(0, -3, seat + 1.6, 4.4);
  }
  return P;
}

// ---------------------------------------------------------------- skeleton → screen
function skeleton(a, P, yaw) {
  const hipY = P.seat !== undefined ? P.seat + 0.2 : HIP_Y + P.bob;
  const pelvis = [P.sway, hipY, 0];
  const Rb = (p, extraYaw = 0) => rotY(p, yaw + extraYaw);                 // model → world (about the feet)
  // lean: tip the upper body forward around the pelvis
  const leanP = p => { const dy = p[1] - hipY, c = Math.cos(P.lean), s = Math.sin(P.lean); return [p[0], hipY + dy * c, p[2] + dy * s]; };
  const rollP = p => { const dy = p[1] - hipY, c = Math.cos(P.roll), s = Math.sin(P.roll); return [p[0] * c - dy * s * 0 + dy * s, hipY + dy * c, p[2]]; };
  const upper = (p, yawExtra) => Rb(rollP(leanP(rotY(p, yawExtra))));
  const S = {};
  S.pelvis = Rb(pelvis);
  // legs
  S.legs = [0, 1].map(i => {
    const side = i ? 1 : -1, f = P.feet[i];
    const hip = Rb(add(pelvis, rotY([side * HIP_X, 0, 0], P.pelvisYaw)));
    const ankleM = [f.x + P.sway * 0.4, f.y, f.z];
    const ankle = Rb(ankleM);
    const r = ik(hip, ankle, THIGH, SHIN, Rb([0, 0.2, 1]));
    if (P.seat === undefined) r.j = mul(add(hip, r.end), 0.5);   // straight, stubby legs when standing/walking
    const toe = add(r.end, Rb([0, -0.2 + Math.sin(f.toe || 0) * 0 - (f.toe || 0) * 1.2, FOOT_L]));
    return { side, hip, knee: r.j, ankle: r.end, toe };
  });
  // torso
  S.waist = upper([0, WAIST_Y - hipY + hipY, 0].map((v, k) => k === 0 ? P.sway : v), P.pelvisYaw);
  S.waist = Rb(rollP(leanP([P.sway, hipY + 0.4, 0])));
  S.chest = upper([P.sway, hipY + (CHEST_Y - HIP_Y), 0], P.chestYaw);
  S.neck = upper([P.sway, hipY + (NECK_Y - HIP_Y), 0], P.chestYaw);
  S.head = upper([P.sway, hipY + (HEAD_Y - HIP_Y) - P.headNod * 2, 0.3], P.chestYaw * 0.5);
  // arms (hands are aimed in model space, relative to the body frame)
  S.arms = [0, 1].map(i => {
    const side = i ? 1 : -1, h = P.hands[i];
    const sho = upper([P.sway + side * SHO_X, hipY + (SHO_Y - HIP_Y), 0], P.chestYaw);
    const handW = upper([P.sway + h.x, hipY + (h.y - HIP_Y), h.z], P.chestYaw * 0.5);
    const r = ik(sho, handW, UPPER, FORE, Rb([side * 1, -0.6, 0]));   // elbows (when bent) point down and out
    if (!h.aim) { const d = sub(r.end, sho), l = len(d); r.end = add(sho, mul(d, Math.min(l, UPPER + FORE) / (l || 1))); r.j = mul(add(sho, r.end), 0.5); }
    return { side, sho, elbow: r.j, hand: r.end };
  });
  S.yaw = yaw;
  return S;
}

// ---------------------------------------------------------------- drawing helpers
function capsule(c, pts3, w, fill, stroke = INK) {
  const p = []; for (const q of pts3) p.push(...proj(q));
  limb(c, p, w, fill, stroke);
}
// point on the head sphere, relative to where the face points (lon/lat), in world space
function onHead(S, yawFace, lon, lat, r = HR) {
  const d = [Math.sin(lon) * Math.cos(lat), Math.sin(lat), Math.cos(lon) * Math.cos(lat)];
  const w = rotY(d, yawFace);
  return { p: add(S.head, mul([w[0], w[1] * 0.97, w[2]], r)), dz: w[2], dx: w[0] };
}

// ---------------------------------------------------------------- hair
const HAIR = Object.fromEntries(Object.entries(HAIRCUTS).map(([k, v]) => [k, v.H]));
function hairLat(H, lon) {
  const a = Math.abs(lon);
  let lat;
  if (a < 1.1) lat = H.f + (H.s - H.f) * Math.pow(a / 1.1, 2.2) * 0.5;
  else if (a < 1.75) lat = H.f + (H.s - H.f) * (0.5 + 0.5 * (a - 1.1) / 0.65);
  else { const b = H.fade || H.buzz || H.bald || H.mohawk ? H.b : Math.min(H.b, -0.75); lat = H.s + (b - H.s) * smooth(1.75, 2.55, a); }   // behind the ear the hairline drops to the nape quickly: the back of the skull is all hair
  const amp = H.tipsAmp ?? (H.blunt ? 0.012 : H.curls ? 0.07 : 0.09);
  if (a < 1.05) lat -= amp * Math.pow(Math.abs(Math.sin(lon * (H.curls ? 8 : 5.2))), 0.7);   // fringe points
  if (H.sweep && a < 1.5) lat += H.sweep * 0.16 * Math.sin(lon * 1.3) * Math.cos(a / 1.5 * Math.PI / 2);   // side-swept
  if (H.cpart && a < 1.3) lat += H.cpart * Math.exp(-Math.pow(lon / 0.26, 2)) - H.cpart * 0.35 * Math.exp(-Math.pow((a - 0.8) / 0.3, 2));   // centre part, bangs fall to the sides
  if (H.messy) lat += Math.sin(lon * 13 + 1) * 0.035 + Math.sin(lon * 7) * 0.025;
  if (H.wavy && a > 1.5) lat += Math.sin(lon * 9) * 0.05;
  return Math.min(1.45, lat);
}
const smooth = (e0, e1, x) => { const k = clamp((x - e0) / (e1 - e0), 0, 1); return k * k * (3 - 2 * k); };
// a tail of hair through 3D points; braids get woven segments
function hairTail(c, pts3, w, col, braid, tie) {
  const p = pts3.map(proj);
  // a real tail of hair: pinched at the tie, full just below it, tapering to a soft point
  const path = []; const n = 18;
  const at = u => { const k = u * (p.length - 1), j = Math.min(p.length - 2, Math.floor(k)), f = k - j; return [p[j][0] + (p[j + 1][0] - p[j][0]) * f, p[j][1] + (p[j + 1][1] - p[j][1]) * f]; };
  const smoothAt = u => { const a0 = at(Math.max(0, u - 0.06)), a1 = at(u), a2 = at(Math.min(1, u + 0.06)); return [(a0[0] + a1[0] * 2 + a2[0]) / 4, (a0[1] + a1[1] * 2 + a2[1]) / 4]; };
  const width = u => w * 0.5 * (braid ? (0.8 - u * 0.25) : (0.55 + 0.5 * Math.sin(Math.min(1, u / 0.35) * Math.PI / 2) - 0.75 * Math.pow(Math.max(0, u - 0.35) / 0.65, 1.6)));
  const L = [], R = [];
  for (let i = 0; i <= n; i++) { const u = i / n, q = smoothAt(u), q2 = smoothAt(Math.min(1, u + 0.04)), q1 = smoothAt(Math.max(0, u - 0.04)); let dx = q2[0] - q1[0], dy = q2[1] - q1[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const ww = Math.max(0.5, width(u)); L.push([q[0] - dy * ww, q[1] + dx * ww]); R.push([q[0] + dy * ww, q[1] - dx * ww]); }
  const tip = smoothAt(1), base = smoothAt(0);
  c.beginPath(); c.moveTo(L[0][0], L[0][1]); for (const q of L) c.lineTo(q[0], q[1]);
  if (braid) c.lineTo(tip[0], tip[1]); else { const e = p[p.length - 1], d = p[p.length - 2]; c.quadraticCurveTo(tip[0] + (e[0] - d[0]) * 0.15, tip[1] + (e[1] - d[1]) * 0.15 + 0.8, R[n][0], R[n][1]); }
  for (let i = n; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
  c.quadraticCurveTo(base[0] + (base[0] - smoothAt(0.1)[0]) * 0.6, base[1] + (base[1] - smoothAt(0.1)[1]) * 0.6, L[0][0], L[0][1]);
  c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  if (!braid) { c.save(); c.clip(); c.strokeStyle = shade(col, -24); c.lineWidth = 0.6; c.globalAlpha = 0.6; for (const o of [-0.35, 0.3]) { c.beginPath(); for (let i = 2; i <= n - 2; i++) { const u = i / n, q = smoothAt(u), ww = width(u) * o; const q2 = smoothAt(Math.min(1, u + 0.04)), q1 = smoothAt(Math.max(0, u - 0.04)); let dx = q2[0] - q1[0], dy = q2[1] - q1[1]; const l = Math.hypot(dx, dy) || 1; const x = q[0] - dy / l * ww * 2, y = q[1] + dx / l * ww * 2; i === 2 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); } c.restore(); }
  if (braid) {
    const n = 7; c.strokeStyle = shade(col, -30); c.lineWidth = 0.7;
    for (let i = 1; i < n; i++) {
      const k = i / n * (p.length - 1), j = Math.min(p.length - 2, Math.floor(k)), f = k - j;
      const x = p[j][0] + (p[j + 1][0] - p[j][0]) * f, y = p[j][1] + (p[j + 1][1] - p[j][1]) * f, ww = w * 0.5 * (1 - i / n * 0.25);
      c.beginPath(); c.moveTo(x - ww, y - 1.2); c.quadraticCurveTo(x, y + 0.9, x + ww, y - 1.2); c.stroke();
    }
  }
  if (braid) { const e = smoothAt(1); poly(c, [e[0] - w * 0.3, e[1] - 0.5, e[0], e[1] + 2.4, e[0] + w * 0.3, e[1] - 0.5], col, INK, 0.6); }
  if (tie) { const b = smoothAt(0.03); ell(c, b[0], b[1], w * 0.36, w * 0.24, tie, INK, 0.6); }
}
function bumpyBlob(c, x, y, r, col, n = 10) {
  for (let i = 0; i < n; i++) { const an = i / n * TAU; circ(c, x + Math.cos(an) * r * 0.82, y + Math.sin(an) * r * 0.82, r * 0.34, col, INK, 0.8); }
  circ(c, x, y, r * 0.86, col, null);
  c.strokeStyle = shade(col, 30); c.lineWidth = 0.7; c.globalAlpha = 0.6;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(x + ((i * 7) % 5 - 2) * r * 0.2, y + ((i * 3) % 4 - 1.5) * r * 0.2, r * 0.18, 3.6, 5.8); c.stroke(); }
  c.globalAlpha = 1;
}
// fill the part of the head sphere above the hairline (or a hat line)
function capRegion(c, S, yawFace, latFn, r, fill, detail, clipPath = null) {
  const pts = [];
  const N = 72;
  for (let i = 0; i < N; i++) { const lon = -Math.PI + (i / N) * TAU, q = onHead(S, yawFace, lon, latFn(lon), r); pts.push(q); }
  // find the visible arc (dz >= 0), starting just after an invisible sample
  let start = pts.findIndex((q, i) => q.dz >= 0 && pts[(i - 1 + N) % N].dz < 0);
  const hc = proj(S.head), R2 = r * 1.02;
  c.save(); if (clipPath) clipPath(); else { c.beginPath(); c.ellipse(hc[0], hc[1], R2, R2 * 0.99, 0, 0, TAU); c.clip(); }
  c.beginPath();
  if (start < 0) { // whole hairline visible (e.g. hat line near the equator seen from the side) or none
    if (pts[0].dz >= 0) { const f = proj(pts[0].p); c.moveTo(f[0], f[1]); for (const q of pts) { const s = proj(q.p); c.lineTo(s[0], s[1]); } c.closePath(); }
  } else {
    const vis = []; for (let k = 0; k < N; k++) { const q = pts[(start + k) % N]; if (q.dz < 0) break; vis.push(q); }
    const first = proj(vis[0].p), last = proj(vis[vis.length - 1].p);
    c.moveTo(first[0], first[1]);
    for (const q of vis) { const s = proj(q.p); c.lineTo(s[0], s[1]); }
    c.lineTo(last[0] + (last[0] > hc[0] ? 20 : -20), last[1]);
    c.lineTo(last[0] + (last[0] > hc[0] ? 20 : -20), hc[1] - r * 3);
    c.lineTo(first[0] + (first[0] > hc[0] ? 20 : -20), hc[1] - r * 3);
    c.lineTo(first[0] + (first[0] > hc[0] ? 20 : -20), first[1]);
    c.closePath();
  }
  c.fillStyle = fill; c.fill();
  if (detail) detail(pts);
  c.restore();
}

const HAT_COVERS = ['cap', 'helmet', 'beanie', 'bandana', 'nonla', 'sunhat', 'bucket', 'boater', 'chef'];


// The outer silhouette of a haircut: bigger than the head, lifted at the crown,
// puffed at the sides, with a little texture on top. Hair never grows under
// the chin: below the jaw line the shell is cut away in front of the face
// (that's what made bobs and afros look like beards).
function hairShell(hc, H, yawFace, grow = 0) {
  const v = H.vol, crown = H.crown ?? 0.07, side = H.side ?? 0.03, tex = H.tex ?? 0.012, jaw = H.jaw ? 0.1 : 0, pts = [];
  for (let i = 0; i < 64; i++) {
    const th = i / 64 * TAU, cs = Math.cos(th), sn = Math.sin(th);
    let r = HR * v + HR * crown * Math.pow(Math.max(0, -sn), 3) + HR * side * Math.pow(Math.abs(cs), 4) * (sn < 0.6 ? 1 : 0.6);
    if (sn < 0.2) r += HR * tex * Math.abs(Math.sin(th * 9 + 0.5));
    if (sn > 0) r += HR * jaw * Math.pow(Math.abs(cs), 2);
    r += grow;
    pts.push([hc[0] + cs * r, hc[1] - 0.8 - HR * crown * 0.4 + sn * r * 0.98]);
  }
  return pts;
}
function shellPath(c, pts) { c.moveTo(pts[0][0], pts[0][1]); for (const q of pts) c.lineTo(q[0], q[1]); c.closePath(); }
// clip that removes the "beard" zone below the jaw in front of the face
function noBeardClip(c, hc, yawFace) {
  const fr = Math.cos(yawFace);
  if (fr < -0.15) { c.rect(hc[0] - 60, hc[1] - 60, 120, 120); return; }
  const cut = hc[1] + HR * 0.28, chinX = hc[0] + Math.sin(yawFace) * HR * 0.72, half = HR * (0.5 + 0.2 * Math.max(0, fr));
  c.rect(hc[0] - 60, hc[1] - 60, 120, cut - hc[1] + 60);
  c.rect(hc[0] - 60, cut, chinX - half - hc[0] + 60, 60);
  c.rect(chinX + half, cut, 60, 60);
}

// ---------------------------------------------------------------- face
function drawFace(c, a, L, S, yawFace, t, P) {
  const C = cols(L), emo = a.act === 'sleep' ? 'sleepy' : (a.emo || 'neutral'), blink = a.blinkAmt || 0;
  const lx = (a.lookX || 0) * 0.08;
  // cheeks
  for (const s of [-1, 1]) { const q = onHead(S, yawFace, s * 0.62, -0.3); if (q.dz > 0.1) { const pp = proj(q.p); ell(c, pp[0], pp[1], 2.9 * Math.max(0.4, q.dz), 1.8, emo === 'angry' ? 'rgba(240,110,110,.6)' : 'rgba(250,140,150,.5)', null); } }
  // eyes: simple dark ovals with a white shine
  for (const s of [-1, 1]) {
    const q = onHead(S, yawFace, s * 0.42 + lx, -0.1); if (q.dz < 0.05) continue;
    const pp = proj(q.p), fx = Math.max(0.35, Math.sqrt(q.dz));
    c.lineCap = 'round';
    if (emo === 'happy' || (emo === 'love' && blink > 0.5)) { c.beginPath(); c.moveTo(pp[0] - 1.9 * fx, pp[1] + 0.7); c.quadraticCurveTo(pp[0], pp[1] - 2.2, pp[0] + 1.9 * fx, pp[1] + 0.7); c.strokeStyle = '#2b2020'; c.lineWidth = 1.2; c.stroke(); continue; }
    if (emo === 'love') { heart(c, pp[0], pp[1] + 0.3, 2.2, '#f0607a', shade('#f0607a', -40), 0.5); continue; }
    if (blink > 0.55 || emo === 'sleepy') { c.beginPath(); c.moveTo(pp[0] - 1.8 * fx, pp[1] + 0.4); c.quadraticCurveTo(pp[0], pp[1] + 1.4, pp[0] + 1.8 * fx, pp[1] + 0.4); c.strokeStyle = '#2b2020'; c.lineWidth = 1.1; c.stroke(); continue; }
    const big = emo === 'surprised' ? 1.18 : 1;
    const rx = 2.15 * fx * big, ry = 2.9 * big * (1 - blink * 0.8);
    ell(c, pp[0], pp[1], rx, ry, '#2b2020', null);
    if (L.eyeCol) ell(c, pp[0], pp[1] + ry * 0.35, rx * 0.72, ry * 0.42, shade(L.eyeCol, -10), null);
    circ(c, pp[0] - rx * 0.28, pp[1] - ry * 0.38, 0.95 * big, '#fff', null);
    circ(c, pp[0] + rx * 0.35, pp[1] + ry * 0.3, 0.35, 'rgba(255,255,255,.8)', null);
    if (L.lashes) { c.strokeStyle = '#2b2020'; c.lineWidth = 0.7; c.beginPath(); const o = s * (Math.cos(yawFace) >= 0 ? 1 : -1); c.moveTo(pp[0] + o * rx * 0.8, pp[1] - ry * 0.7); c.lineTo(pp[0] + o * (rx + 1), pp[1] - ry * 1.05); c.stroke(); }
  }
  // brows (hair colour), shaped by emotion
  for (const s of [-1, 1]) {
    const q = onHead(S, yawFace, s * 0.4, 0.2); if (q.dz < 0.15) continue;
    const pp = proj(q.p), fx = Math.max(0.4, q.dz), inner = -s;
    c.strokeStyle = C.hairS; c.lineWidth = 0.9; c.lineCap = 'round'; c.beginPath();
    if (emo === 'angry') { c.moveTo(pp[0] - inner * 1.5 * fx, pp[1] - 0.8); c.lineTo(pp[0] + inner * 1.4 * fx, pp[1] + 0.5); }
    else if (emo === 'sad') { c.moveTo(pp[0] - inner * 1.5 * fx, pp[1] + 0.5); c.lineTo(pp[0] + inner * 1.4 * fx, pp[1] - 0.6); }
    else if (emo === 'surprised') { c.moveTo(pp[0] - 1.4 * fx, pp[1] - 0.6); c.quadraticCurveTo(pp[0], pp[1] - 1.8, pp[0] + 1.4 * fx, pp[1] - 0.6); }
    else { c.moveTo(pp[0] - 1.3 * fx, pp[1]); c.quadraticCurveTo(pp[0], pp[1] - 0.8, pp[0] + 1.3 * fx, pp[1]); }
    c.stroke();
  }
  // tiny nose
  { const q = onHead(S, yawFace, 0, -0.22); if (q.dz > 0.2) { const pp = proj(q.p); ell(c, pp[0], pp[1], 0.8, 0.55, C.skinD, null); } }
  // mouth
  const q = onHead(S, yawFace, 0, -0.38); if (q.dz > 0.2) {
    const pp = proj(q.p), fx = Math.max(0.5, q.dz);
    let open = 0; if (a.talking) open = 0.35 + 0.65 * Math.abs(Math.sin(t * 17 + Math.sin(t * 5))); if (P.chew) open = 0.5;
    c.lineCap = 'round';
    if (emo === 'surprised') ell(c, pp[0], pp[1] + 0.3, 1.1 * fx, 1.4 + open * 0.3, '#8e3f3e', INK, 0.5);
    else if (open > 0.15 || emo === 'happy' || emo === 'love') { const w = 1.5 * fx, h = emo === 'happy' || emo === 'love' ? Math.max(open, 0.8) * 1.5 : open * 1.5; c.beginPath(); c.moveTo(pp[0] - w, pp[1] - 0.3); c.quadraticCurveTo(pp[0], pp[1] + h * 1.4, pp[0] + w, pp[1] - 0.3); c.closePath(); c.fillStyle = '#8e3f3e'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.5; c.stroke(); if (h > 1) ell(c, pp[0], pp[1] + h * 0.55, w * 0.5, h * 0.28, '#f28b95', null); }
    else { c.beginPath(); if (emo === 'sad') { c.moveTo(pp[0] - 1.2 * fx, pp[1] + 0.6); c.quadraticCurveTo(pp[0], pp[1] - 0.4, pp[0] + 1.2 * fx, pp[1] + 0.6); } else if (emo === 'angry') { c.moveTo(pp[0] - 1.1 * fx, pp[1]); c.lineTo(pp[0] + 1.1 * fx, pp[1] - 0.2); } else { c.moveTo(pp[0] - 1.1 * fx, pp[1] - 0.2); c.quadraticCurveTo(pp[0], pp[1] + 0.9, pp[0] + 1.1 * fx, pp[1] - 0.2); } c.strokeStyle = '#6e3230'; c.lineWidth = 0.75; c.stroke(); }
  }
  if (L.shades) { const pts = []; for (const s of [-1, 1]) { const g = onHead(S, yawFace, s * 0.42, -0.1, HR + 0.5); if (g.dz < 0.1) continue; const pp = proj(g.p), fx = Math.max(0.4, g.dz); pts.push(pp);
      if (L.shadesHeart) heart(c, pp[0], pp[1] + 0.9, 4 * Math.max(0.6, fx), L.shades, INK, 0.7); else { c.beginPath(); c.roundRect ? c.roundRect(pp[0] - 3.4 * fx, pp[1] - 3.3, 6.8 * fx, 6.6, 2.2) : c.rect(pp[0] - 3.4 * fx, pp[1] - 3.3, 6.8 * fx, 6.6); c.fillStyle = L.shades; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(pp[0] - 1.8 * fx, pp[1] - 1.4, 1.1, 1.8); }
    if (pts.length === 2) line(c, pts[0][0] + 2.6, pts[0][1] - 0.8, pts[1][0] - 2.6, pts[1][1] - 0.8, INK, 0.8); }
  if (L.glasses) for (const s of [-1, 1]) { const g = onHead(S, yawFace, s * 0.4, -0.06, HR + 0.5); if (g.dz < 0.1) continue; const pp = proj(g.p); c.strokeStyle = L.glasses; c.lineWidth = 0.8; c.beginPath(); c.ellipse(pp[0], pp[1], 3 * Math.max(0.4, g.dz), 3, 0, 0, TAU); c.stroke(); }
}

// ---------------------------------------------------------------- hats
function drawHat(c, L, S, yawFace, t) {
  const h = L.hat; if (!h && !L.flower) return;
  const col = L.hatColor || '#f2d894', hc = proj(S.head);
  const top = proj(add(S.head, [0, HR * 0.97, 0]));
  // brims: flat ellipses whose front edge sits on the upper forehead (never over the eyes)
  const brimRing = (y, r, fill, stroke = INK) => { const ry = r * 0.2 + 1, cyS = hc[1] - HR * 0.3 - ry, cy = [hc[0], cyS]; ell(c, cy[0], cy[1], r, ry, fill, stroke, 1); return cy; };
  if (h === 'nonla') {
    const by = brimRing(HR * 0.3, HR * 1.55, shade(col, -18));
    const apex = [by[0], by[1] - HR * 1.05];
    c.beginPath(); c.moveTo(by[0] - HR * 1.5, by[1] - 1); c.quadraticCurveTo(by[0] - HR * 0.5, apex[1] + HR * 0.5, apex[0], apex[1]); c.quadraticCurveTo(by[0] + HR * 0.5, apex[1] + HR * 0.5, by[0] + HR * 1.5, by[1] - 1); c.quadraticCurveTo(by[0], by[1] + 4, by[0] - HR * 1.5, by[1] - 1);
    c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    if (L.hatMotif) {                                   // painted blossoms, or gold leaf with a moving shine
      c.save(); c.clip();
      const sx = Math.sin(yawFace) * HR * 0.6;
      if (L.hatMotif === 'flowers') for (let i = 0; i < 6; i++) { const px = by[0] - HR * 0.9 + i * HR * 0.36 + sx, py = by[1] - 3 - (i % 2) * HR * 0.25; for (let k2 = 0; k2 < 5; k2++) { const an = k2 / 5 * TAU + i; circ(c, px + Math.cos(an) * 1.3, py + Math.sin(an) * 1.1, 1, ['#ff6f91', '#ffffff', '#ffb3c6'][i % 3], null); } circ(c, px, py, 0.6, '#ffd35a', null); ell(c, px + 2, py + 0.6, 1.1, 0.5, '#6fae4d', null); }
      if (L.hatMotif === 'gold') { const k2 = ((t * 0.35) % 1.4) - 0.2, gx = by[0] - HR * 1.6 + k2 * HR * 3.2; c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(gx, apex[1]); c.lineTo(gx + 3, apex[1]); c.lineTo(gx - 3, by[1] + 3); c.lineTo(gx - 6, by[1] + 3); c.fill(); for (let i = 0; i < 5; i++) circ(c, by[0] - HR + i * HR * 0.5 + sx, by[1] - 2.2 - (i % 2) * 2, 0.6, '#fff6b0', null); }
      c.restore();
    }
    c.strokeStyle = shade(col, -26); c.lineWidth = 0.5; for (let i = 1; i < 4; i++) { const k = i / 4; c.beginPath(); c.moveTo(by[0] - HR * 1.5 * (1 - k), by[1] - (by[1] - apex[1]) * k); c.quadraticCurveTo(by[0], by[1] - (by[1] - apex[1]) * k + 2 * (1 - k), by[0] + HR * 1.5 * (1 - k), by[1] - (by[1] - apex[1]) * k); c.stroke(); }
    return;
  }
  const dome = (lat, fill) => capRegion(c, S, yawFace, () => lat, HR * 1.07, fill, null);
  const outline = () => { c.beginPath(); c.ellipse(hc[0], hc[1], HR * 1.07, HR * 1.06, 0, 0, TAU); };
  if (h === 'cap' || h === 'helmet' || h === 'bandana' || h === 'beanie') {
    const front = h === 'helmet' ? 0.36 : h === 'beanie' ? 0.4 : h === 'bandana' ? 0.44 : 0.4, back = h === 'helmet' ? -0.25 : h === 'beanie' ? -0.2 : 0.05;
    const latF = lon => { const k = Math.min(1, Math.abs(lon) / 1.6); return front + (back - front) * k * k; };
    capRegion(c, S, yawFace, latF, HR * 1.07, col, null);
    const lat = front;
    // outline of the dome edge
    const e1 = [], N = 40; for (let i = 0; i <= N; i++) { const lon = -Math.PI + i / N * TAU, q = onHead(S, yawFace, lon, latF(lon), HR * 1.07); if (q.dz >= 0) e1.push(proj(q.p)); }
    if (e1.length > 1) { c.beginPath(); c.moveTo(e1[0][0], e1[0][1]); for (const p of e1) c.lineTo(p[0], p[1]); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); }
    c.save(); c.beginPath(); c.ellipse(hc[0], hc[1], HR * 1.07, HR * 1.06, 0, Math.PI * 1.05, Math.PI * 1.95); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); c.restore();
    if (h === 'cap') {
      // the bill: a curved peak sticking out from the front of the crown (real 3D, so it
      // reads as a wide peak from the front, a blade in profile, and hides behind the head)
      const r = HR * 1.07, cl = Math.cos(lat), sl = Math.sin(lat), BL = HR * 0.95;
      const at = (lon, out) => { const ext = out ? BL * Math.pow(Math.max(0, Math.cos(lon * 0.95)), 0.7) : 0, drop = out ? HR * 0.14 * Math.cos(lon) : 0;
        const v = [Math.sin(lon) * cl * r * (out ? 1.04 : 1), sl * r * 0.97 - drop, Math.cos(lon) * cl * r + ext]; return proj(add(S.head, rotY(v, yawFace))); };
      const pts = []; for (let k = 0; k <= 16; k++) pts.push(at(-1.25 + k / 16 * 2.5, false)); for (let k = 16; k >= 0; k--) pts.push(at(-1.25 + k / 16 * 2.5, true));
      const tipZ = Math.cos(yawFace);
      c.save();
      if (tipZ < 0) { c.beginPath(); c.rect(hc[0] - 60, hc[1] - 60, 120, 120); c.ellipse(hc[0], hc[1], HR * 1.07, HR * 1.06, 0, 0, TAU); c.clip('evenodd'); }   // behind the head: only the tips peek out
      else if (tipZ > 0.3) { c.beginPath(); for (let k = 0; k <= 16; k++) { const q = at(-1.1 + k / 16 * 2.2, false); k ? c.lineTo(q[0], q[1] + 1.3) : c.moveTo(q[0], q[1] + 1.3); } c.strokeStyle = 'rgba(60,30,20,.16)'; c.lineWidth = 2.2; c.stroke(); }   // soft shadow on the forehead
      c.beginPath(); pts.forEach((q, k) => k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.closePath();
      c.fillStyle = shade(col, -12); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
      if (tipZ > 0.2) { c.beginPath(); for (let k = 0; k <= 12; k++) { const lon = -1 + k / 12 * 2, a = at(lon, false), b = at(lon, true), q = [a[0] + (b[0] - a[0]) * 0.72, a[1] + (b[1] - a[1]) * 0.72]; k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.strokeStyle = shade(col, -32); c.lineWidth = 0.5; c.stroke(); }   // stitching
      c.restore();
      // the adjustable strap and the little opening above it at the back
      const bq = onHead(S, yawFace, Math.PI, 0.16, HR * 1.07);
      if (bq.dz > 0.15) { const bp = proj(bq.p), kx = Math.max(0.3, bq.dz); c.beginPath(); c.ellipse(bp[0], bp[1] + 0.6, 2.6 * kx, 2, 0, Math.PI, 0); c.closePath(); c.fillStyle = L.hair || '#4a322b'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.6; c.stroke(); box(c, bp[0] - 3 * kx, bp[1] + 0.2, 6 * kx, 1.2, 0.4, shade(col, -20), INK, 0.5); }
      circ(c, top[0], top[1] + 1, 1, shade(col, -30), null);
    }
    if (h === 'beanie') { circ(c, top[0], top[1] - 1.5, 2.8, L.hatRibbon || '#fffaf0', INK, 0.8); }
    if (h === 'helmet') { c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(hc[0] - 3, hc[1] - HR * 0.6, 4, 1.6, -0.3, 0, TAU); c.fill(); }
    if (h === 'bandana') { const k = onHead(S, yawFace, Math.PI, 0.2, HR * 1.08); if (k.dz > -0.2) { const kp = proj(k.p); poly(c, [kp[0], kp[1], kp[0] - 4, kp[1] + 3, kp[0] - 3, kp[1] - 1], col, INK, 0.7); } for (let i = -2; i <= 2; i++) { const q = onHead(S, yawFace, i * 0.35, 0.5, HR * 1.07); if (q.dz > 0.1) { const pp = proj(q.p); circ(c, pp[0], pp[1], 0.5, 'rgba(255,255,255,.9)', null); } } }
    return;
  }
  if (h === 'sunhat' || h === 'bucket' || h === 'boater') {
    const r = h === 'sunhat' ? HR * 1.7 : h === 'boater' ? HR * 1.5 : HR * 1.35;
    const by = brimRing(HR * 0.35, r, h === 'bucket' ? shade(col, -12) : col);
    const crownH = h === 'boater' ? HR * 0.5 : HR * 0.68;
    c.beginPath(); c.moveTo(by[0] - HR * 1.08, by[1] + 1); c.bezierCurveTo(by[0] - HR * 1.12, by[1] - crownH * 0.9, by[0] - HR * 0.6, by[1] - crownH - 2.5, by[0], by[1] - crownH - 2.5); c.bezierCurveTo(by[0] + HR * 0.6, by[1] - crownH - 2.5, by[0] + HR * 1.12, by[1] - crownH * 0.9, by[0] + HR * 1.08, by[1] + 1); c.closePath();
    c.fillStyle = shade(col, 8); c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.strokeStyle = L.hatRibbon || (h === 'boater' ? '#3f4a5e' : '#f28f7c'); c.lineWidth = 2; c.beginPath(); c.moveTo(by[0] - HR * 1.08, by[1] - 1.2); c.quadraticCurveTo(by[0], by[1] + 1.2, by[0] + HR * 1.08, by[1] - 1.2); c.stroke();
    return;
  }
  if (h === 'chef') {
    // a band that hugs the crown (following the head's curve), with the puffy top above it
    const bw = HR * 0.92, yb = hc[1] - HR * 0.42, yt = hc[1] - HR * 0.86;
    for (const [dx, dy, r] of [[-4.6, 0, 5], [4.6, 0, 5], [0, -2.8, 5.4]]) circ(c, hc[0] + dx, yt - 3.6 + dy, r, '#fffdf8');
    c.beginPath(); c.moveTo(hc[0] - bw, yb); c.lineTo(hc[0] - bw * 0.86, yt); c.quadraticCurveTo(hc[0], yt - 1.6, hc[0] + bw * 0.86, yt); c.lineTo(hc[0] + bw, yb); c.quadraticCurveTo(hc[0], yb + 2.4, hc[0] - bw, yb); c.closePath();
    c.fillStyle = '#fffdf8'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
    c.strokeStyle = 'rgba(91,63,54,.25)'; c.lineWidth = 0.6; for (const k of [-0.45, 0, 0.45]) { c.beginPath(); c.moveTo(hc[0] + k * bw, yt + 0.6); c.lineTo(hc[0] + k * bw * 1.05, yb + 1.2 - Math.abs(k) * 1.2); c.stroke(); }
    return;
  }
  if (h === 'beret') { ell(c, top[0] + 1.5, top[1] + 1.2, HR * 1.05, 4.2, col, INK, 1); ell(c, top[0] - 1, top[1] + 0.2, 4.4, 1.4, shade(col, 18), null); limb(c, [top[0] + 1, top[1] - 2.6, top[0] + 1.6, top[1] - 4.4], 1, shade(col, -25)); return; }
  if (h === 'crown') { const y = top[1] + 2; c.beginPath(); c.moveTo(top[0] - 6, y); c.lineTo(top[0] - 6.4, y - 5.4); c.lineTo(top[0] - 3, y - 2.6); c.lineTo(top[0], y - 6.6); c.lineTo(top[0] + 3, y - 2.6); c.lineTo(top[0] + 6.4, y - 5.4); c.lineTo(top[0] + 6, y); c.closePath(); c.fillStyle = '#ffd35a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); for (const [x, cl] of [[-3.2, '#f36d86'], [0, '#6fbfb0'], [3.2, '#8fb7e0']]) circ(c, top[0] + x, y - 1.4, 0.9, cl, null); return; }
  // decorations that sit on a point of the head
  const onPt = (lon, lat, fn) => { const q = onHead(S, yawFace, lon, lat, HR * 1.08); if (q.dz < -0.35) return; const pp = proj(q.p); c.save(); if (q.dz < 0) c.globalAlpha = 0.9; fn(pp[0], pp[1], Math.max(0.5, Math.abs(q.dz) * 0.5 + 0.5)); c.restore(); };
  if (h === 'lanternbow') onPt(0.9, 0.55, (x, y, k) => {      // a gold bow with a tiny red lantern swinging under it
    for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + sd * 5 * k, y - 4.2, x + sd * 5 * k, y + 0.6); c.quadraticCurveTo(x + sd * 3.6 * k, y + 3.2, x, y); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); }
    circ(c, x, y, 1.4, shade(col, -14), INK, 0.7);
    const sw = Math.sin(t * 2.6) * 0.35, lx = x + Math.sin(sw) * 5, ly = y + Math.cos(sw) * 5;
    line(c, x, y + 1, lx, ly - 1.6, INK, 0.4);
    ell(c, lx, ly, 1.9, 2.2, '#e8584e', INK, 0.5); c.fillStyle = '#ffd35a'; c.fillRect(lx - 1.3, ly - 2.4, 2.6, 0.6); c.fillRect(lx - 1.3, ly + 1.8, 2.6, 0.6);
    c.globalAlpha = 0.35 + Math.sin(t * 4) * 0.15; circ(c, lx, ly, 3.2, '#ffcf6a', null); c.globalAlpha = 1;
  });
  if (h === 'bow') onPt(0.9, 0.55, (x, y, k) => { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + s * 5 * k, y - 4.2, x + s * 5 * k, y + 0.6); c.quadraticCurveTo(x + s * 3.6 * k, y + 3.2, x, y); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); } circ(c, x, y, 1.4, shade(col, -14), INK, 0.7); });
  if (L.flower && h !== 'flower') onPt(0.85, 0.5, (x, y) => { for (let i = 0; i < 5; i++) { const an = i / 5 * TAU; circ(c, x + Math.cos(an) * 1.7, y + Math.sin(an) * 1.7, 1.45, L.flower, INK, 0.5); } circ(c, x, y, 1.1, '#ffd35a', INK, 0.5); });
  if (h === 'flower') onPt(0.8, 0.45, (x, y) => { for (let i = 0; i < 5; i++) { const an = i / 5 * TAU; circ(c, x + Math.cos(an) * 1.7, y + Math.sin(an) * 1.7, 1.45, col, INK, 0.5); } circ(c, x, y, 1.1, '#ffd35a', INK, 0.5); });
  if (h === 'catears') for (const s of [-1, 1]) {
    // ears stand up from the headband: from behind you see their backs over the top of the head
    const q = onHead(S, yawFace, s * 0.62, 0.95, HR * 1.02), pp = proj(q.p), x = pp[0], y = pp[1], sx = s * Math.sign(Math.cos(yawFace) || 1);
    c.save();
    if (q.dz < 0) { c.beginPath(); c.rect(hc[0] - 60, hc[1] - 60, 120, 120); c.ellipse(hc[0], hc[1], HR * 1.02, HR * 0.99, 0, 0, TAU); c.clip('evenodd'); }
    poly(c, [x - 2.9, y + 2.4, x + sx * 0.6, y - 5, x + 2.9, y + 2.4], q.dz < 0 ? shade(col, -8) : col, INK, 0.9);
    if (q.dz > 0.1) poly(c, [x - 1.4, y + 1.8, x + sx * 0.4, y - 2.2, x + 1.4, y + 1.8], '#ffc0d0', null);
    c.restore();
  }
  // heart boppers: two hearts on springy wires that wobble as you move
  if (h === 'hearts') for (const s of [-1, 1]) {
    const q = onHead(S, yawFace, s * 0.55, 1.2, HR * 1.04);
    const b = proj(q.p), wob = Math.sin(t * 6 + s) * 1.6, tip = [b[0] + s * 3 + wob, b[1] - 10];
    c.save();
    c.strokeStyle = INK; c.lineWidth = 0.7; c.beginPath(); c.moveTo(b[0], b[1]); c.quadraticCurveTo(b[0] + s * 3, b[1] - 5, tip[0], tip[1]); c.stroke();
    const hx = tip[0], hy = tip[1] - 1.6; c.beginPath(); c.moveTo(hx, hy + 3.6); c.bezierCurveTo(hx - 5, hy, hx - 3.6, hy - 4.4, hx, hy - 1.9); c.bezierCurveTo(hx + 3.6, hy - 4.4, hx + 5, hy, hx, hy + 3.6); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
    circ(c, hx - 1, hy - 1.2, 0.6, 'rgba(255,255,255,.8)', null); c.restore();
  }
  // a striped party cone with a pom, tipped a little to one side
  if (h === 'party') { const q = onHead(S, yawFace, 0.3, 1.3, HR * 1.05), pp = proj(q.p), x = pp[0], y = pp[1] + 1; {
    const lean = Math.sin(yawFace) * 1.2, ap = [x + 2 + lean, y - 12];
    c.beginPath(); c.moveTo(x - 5, y + 1.4); c.lineTo(ap[0], ap[1]); c.lineTo(x + 5, y + 1.4); c.quadraticCurveTo(x, y + 3.2, x - 5, y + 1.4); c.closePath();
    c.fillStyle = col; c.fill(); c.save(); c.clip(); c.strokeStyle = L.hatRibbon || '#fff6d8'; c.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(x - 7, y - 2 + i * 3.6); c.lineTo(x + 7, y - 5 + i * 3.6); c.stroke(); } c.restore();
    c.beginPath(); c.moveTo(x - 5, y + 1.4); c.lineTo(ap[0], ap[1]); c.lineTo(x + 5, y + 1.4); c.quadraticCurveTo(x, y + 3.2, x - 5, y + 1.4); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
    for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + t * 2; circ(c, ap[0] + Math.cos(an) * 1.4, ap[1] + Math.sin(an) * 1.4, 1.25, i % 2 ? '#ffd35a' : '#f36d86', null); }
  } }
  // a propeller beanie: the little rotor spins when you walk
  if (h === 'propeller') {
    const latF = () => 0.42; capRegion(c, S, yawFace, latF, HR * 1.07, col, null);
    c.save(); c.beginPath(); c.ellipse(hc[0], hc[1], HR * 1.07, HR * 1.06, 0, Math.PI * 1.05, Math.PI * 1.95); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); c.restore();
    for (let i = 0; i < 4; i++) { const q = onHead(S, yawFace, i / 4 * TAU + 0.3, 0.75, HR * 1.075); if (q.dz < 0.05) continue; const pp = proj(q.p); circ(c, pp[0], pp[1], 1.1, ['#f36d86', '#ffd35a', '#6fbfb0', '#8fb7e0'][i], null); }
    const px = top[0], py = top[1] - 2.6, spin = t * 14, len = 6.5;
    line(c, px, top[1] + 0.6, px, py, INK, 0.9);
    for (const s of [0, Math.PI]) { const dx = Math.cos(spin + s) * len; c.beginPath(); c.ellipse(px + dx / 2, py, Math.abs(dx) / 2 + 0.4, 1.1, 0, 0, TAU); c.fillStyle = s ? '#f36d86' : '#ffd35a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.5; c.stroke(); }
    circ(c, px, py, 0.9, '#fffaf0', INK, 0.5);
  }
  // a cloth headband with a star at the front (red and gold for National Day)
  if (h === 'starband') {
    const pts = []; for (let i = 0; i <= 32; i++) { const lon = -Math.PI + i / 32 * TAU, q = onHead(S, yawFace, lon, 0.5, HR * 1.08); pts.push([proj(q.p), q.dz]); }
    c.lineCap = 'round'; c.lineJoin = 'round'; for (const [w, cl] of [[3.8, INK], [2.6, col]]) { c.strokeStyle = cl; c.lineWidth = w; c.beginPath(); let on = false; for (const [p, z] of pts) { if (z < -0.05) { on = false; continue; } on ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); on = true; } c.stroke(); }
    onPt(0, 0.5, (x, y, k) => { const sp = []; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 1.1 : 2.6) * k; sp.push(x + Math.cos(an) * r, y + Math.sin(an) * r); } poly(c, sp, L.hatRibbon || '#ffd35a', INK, 0.4); });
  }
  if (h === 'flowercrown') for (let i = 0; i < 12; i++) { const lon = -Math.PI + i / 12 * TAU; const q = onHead(S, yawFace, lon, 0.42, HR * 1.07); if (q.dz < 0) continue; const pp = proj(q.p); circ(c, pp[0], pp[1], 1.6, ['#ff8fb0', '#fff', '#ffd35a', '#c9a8ff'][i % 4], INK, 0.4); if (i % 2) ell(c, pp[0] + 1.4, pp[1] + 0.6, 1.2, 0.6, '#7fc062', null); }
}

// ---------------------------------------------------------------- body parts
function drawTorso(c, L, S, a, t) {
  const C = cols(L), st = L.topStyle || 'tee';
  const yaw = S.yaw, cy = Math.abs(Math.cos(yaw)), sy = Math.abs(Math.sin(yaw));
  const w = (rx, rz) => Math.sqrt(Math.pow(rx * cy, 2) + Math.pow(rz * sy, 2));
  const top = proj(S.chest), bot = proj(S.waist), neck = proj(S.neck);
  const dress = st === 'dress' || st === 'aodai';
  const wT = w(5.1, 3.6), wB = w(dress ? 7.6 : 5.8, dress ? 5.2 : 4.1);
  const hemY = dress ? bot[1] + (st === 'aodai' ? 8.6 : 4.2) : bot[1] + 1.2;
  // bottoms under the top (shorts/skirt waistband)
  if (!dress) {
    const bw = w(5.6, 3.9);
    c.beginPath(); c.moveTo(bot[0] - bw, bot[1] - 1.6); c.lineTo(bot[0] + bw, bot[1] - 1.6); c.lineTo(bot[0] + bw + (L.skirt ? 2 : 0.3), bot[1] + (L.skirt ? 5 : 2.4)); c.quadraticCurveTo(bot[0], bot[1] + (L.skirt ? 6 : 3), bot[0] - bw - (L.skirt ? 2 : 0.3), bot[1] + (L.skirt ? 5 : 2.4)); c.closePath();
    c.fillStyle = L.bottom; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  }
  // the top: rounded shoulders, gentle taper
  c.beginPath();
  c.moveTo(top[0] - wT, top[1] + 1.2);
  c.quadraticCurveTo(top[0] - wT, top[1] - 1.6, top[0] - wT + 2.2, top[1] - 1.8);
  c.lineTo(top[0] + wT - 2.2, top[1] - 1.8);
  c.quadraticCurveTo(top[0] + wT, top[1] - 1.6, top[0] + wT, top[1] + 1.2);
  c.lineTo(bot[0] + wB, hemY);
  c.quadraticCurveTo(bot[0], hemY + 1.4, bot[0] - wB, hemY);
  c.closePath();
  c.fillStyle = L.top; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  // soft shading on the side turned away
  c.save(); c.clip();
  const shadeSide = Math.sin(yaw) >= 0 ? -1 : 1;
  c.fillStyle = C.topS; c.globalAlpha = 0.35; c.fillRect(top[0] + shadeSide * wT * 0.4 - (shadeSide < 0 ? wT : 0), top[1] - 3, wT * 1.1, hemY - top[1] + 5); c.globalAlpha = 1;
  if (st === 'stripe') { c.fillStyle = L.top2 || '#fff'; for (let y = top[1] + 0.6; y < hemY; y += 2.4) c.fillRect(top[0] - 9, y, 18, 1.05); }
  if (L.check) { c.fillStyle = L.check; c.globalAlpha = 0.45; for (let x = top[0] - 12; x < top[0] + 12; x += 3) c.fillRect(x, top[1] - 3, 1.4, hemY - top[1] + 6); for (let y = top[1] - 2; y < hemY + 2; y += 3) c.fillRect(top[0] - 12, y, 24, 1.4); c.globalAlpha = 1; }
  if (st === 'varsity') { c.fillStyle = L.top2 || '#fff'; c.fillRect(bot[0] - 12, hemY - 2.4, 24, 1); c.fillRect(bot[0] - 12, hemY - 0.8, 24, 0.9); }
  if (L.overall) { const ob = w(4.2, 3), fk = Math.cos(yaw); c.fillStyle = L.overall; if (fk > -0.1) { c.beginPath(); c.moveTo(bot[0] + Math.sin(yaw) * 2 - ob, top[1] + 3.2); c.lineTo(bot[0] + Math.sin(yaw) * 2 + ob, top[1] + 3.2); c.lineTo(bot[0] + wB, hemY + 2); c.lineTo(bot[0] - wB, hemY + 2); c.closePath(); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke(); }
    c.strokeStyle = L.overall; c.lineWidth = 1.5; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(top[0] + sd * wT * 0.55, top[1] - 1.6); c.lineTo(bot[0] + sd * ob * 0.8 + Math.sin(yaw) * 2, top[1] + 3.4); c.stroke(); } }
  if (st === 'floral') for (let i = 0; i < 8; i++) { circ(c, top[0] + ((i * 37) % 11) - 5.5 + Math.sin(yaw) * 2, top[1] + 1 + ((i * 23) % 9), 0.85, L.top2 || '#fff4b8', null); }
  // printed motifs for the special pieces (they slide round as you turn)
  if (L.motif) {
    const sx = Math.sin(yaw) * 3, cols = L.motifCols || ['#fff4f6', '#ffd35a', '#ff9fb4'];
    if (L.motif === 'blossom') for (let i = 0; i < 7; i++) {
      const px = top[0] + ((i * 41) % 13) - 6.5 + sx, py = top[1] + 1.2 + ((i * 29) % 13) * (hemY - top[1] - 2) / 13, col = cols[i % cols.length];
      for (let k2 = 0; k2 < 5; k2++) { const an = k2 / 5 * TAU + i; circ(c, px + Math.cos(an) * 0.95, py + Math.sin(an) * 0.95, 0.72, col, null); }
      circ(c, px, py, 0.45, '#ffd35a', null); if (i % 2) ell(c, px + 1.4, py + 0.6, 0.8, 0.35, '#7fc062', null);
    }
    if (L.motif === 'lanterns') for (let i = 0; i < 4; i++) {
      const px = top[0] - 5.4 + i * 3.6 + sx, py = top[1] + 3.4 + (i % 2) * 1.2;
      line(c, px, py - 1.6, px, py - 0.9, '#5b3f36', 0.35); ell(c, px, py, 1.1, 1.3, '#e8584e', null); c.fillStyle = '#ffd35a'; c.fillRect(px - 0.8, py - 1.35, 1.6, 0.4); c.fillRect(px - 0.8, py + 1.0, 1.6, 0.4);
    }
    if (L.motif === 'fireflies') for (let i = 0; i < 9; i++) {
      const k2 = (Math.sin(t * 2.2 + i * 1.7) + 1) / 2, px = top[0] + ((i * 31) % 12) - 6 + sx + Math.sin(t + i) * 0.4, py = top[1] + 0.8 + ((i * 17) % 11) * (hemY - top[1] - 1) / 11;
      c.globalAlpha = 0.25 + k2 * 0.75; circ(c, px, py, 0.55 + k2 * 0.35, '#e9ff8a', null); c.globalAlpha = 0.25 * k2; circ(c, px, py, 1.7, '#e9ff8a', null); c.globalAlpha = 1;
    }
    if (L.motif === 'waves') for (let j = 0; j < 2; j++) { c.strokeStyle = cols[j % cols.length]; c.lineWidth = 0.55; c.beginPath(); for (let x = -10; x <= 10; x += 2.5) { const px = bot[0] + x + sx, py = hemY - 1.6 - j * 1.8; c.moveTo(px - 1.25, py); c.quadraticCurveTo(px, py - 1.4, px + 1.25, py); } c.stroke(); }
  }
  if (L.trim) { c.fillStyle = L.trim; c.fillRect(bot[0] - 14, hemY - 1.3, 28, 1.1); c.globalAlpha = 0.55; c.fillStyle = '#fff6c8'; c.fillRect(bot[0] - 14, hemY - 1.25, 28, 0.35); c.globalAlpha = 1; }
  c.restore();
  // a gold collar band on the áo dài
  if (L.trim && (st === 'aodai' || st === 'dress')) { c.strokeStyle = L.trim; c.lineWidth = 1.1; c.beginPath(); c.moveTo(neck[0] - w(2.4, 1.8), top[1] - 1.7); c.quadraticCurveTo(neck[0], top[1] - 0.2, neck[0] + w(2.4, 1.8), top[1] - 1.7); c.stroke(); }
  // front details (only when facing us): collars, buttons, pockets, hood strings
  const facing = Math.cos(yaw);
  const fx = top[0] + Math.sin(yaw) * 3.2 * 0.9, k = Math.max(0.2, facing);
  if (facing > 0.15) {
    if (st === 'hoodie') { c.strokeStyle = '#fff'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(fx - 1.2 * k, top[1] + 0.6); c.lineTo(fx - 1.4 * k, top[1] + 3.6); c.moveTo(fx + 1.2 * k, top[1] + 0.6); c.lineTo(fx + 1.4 * k, top[1] + 3.6); c.stroke(); c.strokeStyle = C.topS; c.beginPath(); c.moveTo(fx - 3.2 * k, bot[1] - 1.8); c.quadraticCurveTo(fx, bot[1] - 2.8, fx + 3.2 * k, bot[1] - 1.8); c.stroke(); }
    else if (st === 'shirt') { poly(c, [fx - 3.2 * k, top[1] - 1.6, fx, top[1] + 1.6, fx - 1 * k, top[1] - 1.6], '#fffdf6', INK, 0.6); poly(c, [fx + 3.2 * k, top[1] - 1.6, fx, top[1] + 1.6, fx + 1 * k, top[1] - 1.6], '#fffdf6', INK, 0.6); for (let i = 0; i < 3; i++) circ(c, fx, top[1] + 2.8 + i * 2, 0.4, C.topS, null); }
    else if (st === 'polo') { const pc = L.top2 || C.topS; poly(c, [fx - 3 * k, top[1] - 1.7, fx, top[1] + 0.8, fx - 0.4 * k, top[1] - 1.7], pc, INK, 0.6); poly(c, [fx + 3 * k, top[1] - 1.7, fx, top[1] + 0.8, fx + 0.4 * k, top[1] - 1.7], pc, INK, 0.6); line(c, fx, top[1] + 0.8, fx, top[1] + 3.4, C.topS, 0.6); circ(c, fx, top[1] + 1.8, 0.35, pc, null); circ(c, fx, top[1] + 3, 0.35, pc, null); }
    else if (st === 'varsity') { c.strokeStyle = L.top2 || '#fff'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(fx - 2.6 * k, top[1] - 1.6); c.quadraticCurveTo(fx, top[1] + 1.2, fx + 2.6 * k, top[1] - 1.6); c.stroke(); line(c, fx, top[1] + 1, fx, hemY - 1, shade(L.top, -25), 0.6); for (let i = 0; i < 3; i++) circ(c, fx + 0.9, top[1] + 2.4 + i * 2, 0.35, L.top2 || '#fff', null); c.fillStyle = L.top2 || '#fff'; c.font = '900 4px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText('J', fx - 3 * k, top[1] + 4.6); }
    else if (st === 'aodai') { c.strokeStyle = C.topH; c.lineWidth = 0.7; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(fx - 2 * k + i * 1.4 * k, top[1] + 4 + i * 1.5, 1, 0, TAU); c.stroke(); } }
    else { c.strokeStyle = C.topS; c.lineWidth = 0.8; c.beginPath(); c.moveTo(fx - 2.4 * k, top[1] - 1.6); c.quadraticCurveTo(fx, top[1] + 0.8, fx + 2.4 * k, top[1] - 1.6); c.stroke(); }
    if (L.apron) { c.beginPath(); c.moveTo(fx - 3.6 * k, top[1] + 2); c.lineTo(fx + 3.6 * k, top[1] + 2); c.lineTo(fx + 4.6 * k, hemY + 0.6); c.quadraticCurveTo(fx, hemY + 1.6, fx - 4.6 * k, hemY + 0.6); c.closePath(); c.fillStyle = L.apron; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); }
    if (L.lanyard) { c.strokeStyle = L.lanyard; c.lineWidth = 0.6; c.beginPath(); c.moveTo(fx - 2 * k, top[1] - 1.4); c.lineTo(fx, top[1] + 4.4); c.lineTo(fx + 2 * k, top[1] - 1.4); c.stroke(); c.fillStyle = '#fff'; c.fillRect(fx - 1.3, top[1] + 4, 2.6, 3); }
    if (L.camera) { c.strokeStyle = '#3d3d44'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(fx - 3 * k, top[1] - 1); c.lineTo(fx, top[1] + 4); c.lineTo(fx + 3 * k, top[1] - 1); c.stroke(); c.fillStyle = '#4a4a54'; c.fillRect(fx - 2.2, top[1] + 3.6, 4.4, 3); circ(c, fx, top[1] + 5.1, 1, '#9fc9e6', '#2a2a30', 0.5); }
  }
  if (L.necklace && facing > 0.1) { for (let i = 0; i <= 8; i++) { const u = i / 8 - 0.5, px = fx + u * 8 * k, py = top[1] + 0.9 + (1 - 4 * u * u) * 2.6; circ(c, px, py, 0.62, L.necklace, 'rgba(91,63,54,.55)', 0.3); } }
  // backpack straps (the pack itself hangs on the back)
  if (L.backpack && facing > 0.1) { c.strokeStyle = shade(L.backpack, -18); c.lineWidth = 1.5; for (const sd of [-1, 1]) { c.beginPath(); c.moveTo(fx + sd * 3 * k, top[1] - 1.6); c.quadraticCurveTo(fx + sd * 3.6 * k, top[1] + 3, fx + sd * 3.2 * k, bot[1] - 2); c.stroke(); } }
  if (L.cape) { c.beginPath(); c.moveTo(neck[0] - 3, top[1] - 2); c.lineTo(neck[0] + 3, top[1] - 2); c.lineTo(bot[0] + wB + 3.5, hemY + 2.5); c.quadraticCurveTo(bot[0], hemY + 4.5, bot[0] - wB - 3.5, hemY + 2.5); c.closePath(); c.fillStyle = L.cape; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); c.strokeStyle = 'rgba(111,191,176,.6)'; c.lineWidth = 0.6; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(neck[0] + i * 0.8, top[1]); c.lineTo(bot[0] + i * 2.4, hemY + 3); c.stroke(); } }
  if (L.scarf) { ell(c, neck[0], neck[1] + 1.4, w(4.8, 3.6), 1.9, L.scarf, INK, 0.8); }
  if (L.scarf && L.scarfLong) {                        // the long tails, fluttering, with a fringe
    const side = Math.sin(yaw) > 0.3 ? -1 : 1, fl = Math.sin(t * 3.2) * 0.8 + (a.moving || 0) * Math.sin(t * 9) * 1.2, x0 = neck[0] + side * 2.4, y0 = neck[1] + 2.4;
    for (const [dx, len] of [[0, 9], [1.6, 7]]) {
      const ex = x0 + side * dx + fl * (1 + dx * 0.3), ey = y0 + len;
      c.beginPath(); c.moveTo(x0 + side * dx - 1.1, y0); c.quadraticCurveTo(x0 + side * dx + fl * 0.5 - 1.3, y0 + len * 0.5, ex - 1.1, ey); c.lineTo(ex + 1.1, ey); c.quadraticCurveTo(x0 + side * dx + fl * 0.5 + 1.3, y0 + len * 0.5, x0 + side * dx + 1.1, y0); c.closePath();
      c.fillStyle = L.scarf; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.6; c.stroke();
      c.strokeStyle = shade(L.scarf, -25); c.lineWidth = 0.4; for (let f = -1; f <= 1; f++) { c.beginPath(); c.moveTo(ex + f * 0.7, ey); c.lineTo(ex + f * 0.7 + fl * 0.2, ey + 1.2); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(ex - 0.9, y0 + 2, 0.5, len - 3);
    }
  }
  // work gear that says who someone is
  if (L.coat) {                                         // a doctor's long white coat, open at the front
    const cw = wT + 0.6, cb = wB + 1.2, ch = Math.max(hemY, bot[1]) + 5.2;
    c.beginPath(); c.moveTo(top[0] - cw, top[1] + 1.2); c.quadraticCurveTo(top[0] - cw, top[1] - 1.8, top[0] - cw + 2.2, top[1] - 2); c.lineTo(top[0] + cw - 2.2, top[1] - 2); c.quadraticCurveTo(top[0] + cw, top[1] - 1.8, top[0] + cw, top[1] + 1.2);
    c.lineTo(bot[0] + cb, ch); c.quadraticCurveTo(bot[0], ch + 1.2, bot[0] - cb, ch); c.closePath();
    c.fillStyle = L.coat; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    if (facing > 0.15) {
      poly(c, [fx - 2.2 * k, top[1] - 1.8, fx + 2.2 * k, top[1] - 1.8, fx + 1.2 * k, ch, fx - 1.2 * k, ch], L.top, INK, 0.7);            // the shirt shows down the middle
      poly(c, [fx - 2.2 * k, top[1] - 1.8, fx - 3.8 * k, top[1] + 0.4, fx - 1.4 * k, top[1] + 4], shade(L.coat, -6), INK, 0.6);            // lapels
      poly(c, [fx + 2.2 * k, top[1] - 1.8, fx + 3.8 * k, top[1] + 0.4, fx + 1.4 * k, top[1] + 4], shade(L.coat, -6), INK, 0.6);
      box(c, fx + 2.2 * k, top[1] + 3, 2.4 * k, 2, 0.4, shade(L.coat, -8), INK, 0.5);                                                          // breast pocket with a pen
      line(c, fx + 2.8 * k, top[1] + 2.4, fx + 2.8 * k, top[1] + 3.6, '#5f8fd0', 0.7);
    } else line(c, bot[0], top[1] + 2, bot[0], ch, shade(L.coat, -14), 0.7);                                                              // back seam
  }
  if (L.steth && facing > 0.15) {                       // stethoscope round the neck
    c.strokeStyle = '#6b737c'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(fx - 3.2 * k, top[1] - 1.4); c.quadraticCurveTo(fx - 3.6 * k, top[1] + 4, fx - 1.4 * k, top[1] + 5.4); c.moveTo(fx + 3.2 * k, top[1] - 1.4); c.quadraticCurveTo(fx + 3 * k, top[1] + 2.6, fx + 2.2 * k, top[1] + 4); c.stroke();
    circ(c, fx - 1.2 * k, top[1] + 5.8, 1, '#b9c3cb', INK, 0.5);
  }
  if (L.tape && facing > 0.1) {                         // a tailor's measuring tape over the shoulders
    for (const sd of [-1, 1]) poly(c, [fx + sd * 3.4 * k, top[1] - 1.6, fx + sd * 2.4 * k, top[1] - 1.6, fx + sd * 2.6 * k, top[1] + 7, fx + sd * 3.6 * k, top[1] + 7], '#f5d06a', INK, 0.5);
    for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) line(c, fx + sd * 2.5 * k, top[1] + 0.4 + i * 1.6, fx + sd * 3 * k, top[1] + 0.4 + i * 1.6, INK, 0.3);
  }
  if (L.badge && facing > 0.2) { box(c, fx - 4 * k, top[1] + 2.2, 2.6 * k, 1.8, 0.4, '#fff', INK, 0.5); line(c, fx - 3.8 * k, top[1] + 2.5, fx - 1.6 * k, top[1] + 2.5, L.badge, 0.6); }
  if (L.comb && facing > 0.2) { box(c, fx + 1.6 * k, hemY - 4.4, 2.2 * k, 2.6, 0.4, shade(L.apron || L.top, -10), INK, 0.5); line(c, fx + 2.2 * k, hemY - 5.6, fx + 2.2 * k, hemY - 4, '#2f2a30', 0.6); line(c, fx + 3 * k, hemY - 5.8, fx + 3 * k, hemY - 4, '#b9c3cb', 0.6); }
  if (L.toolbelt) {                                     // a leather tool belt with a hammer at the hip
    const bw = w(5.9, 4.1);
    c.beginPath(); c.moveTo(bot[0] - bw, bot[1] - 2); c.lineTo(bot[0] + bw, bot[1] - 2); c.lineTo(bot[0] + bw, bot[1] + 0.4); c.lineTo(bot[0] - bw, bot[1] + 0.4); c.closePath(); c.fillStyle = '#8a5f3e'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke();
    const sd = Math.sin(yaw) >= 0 ? -1 : 1, px = bot[0] + sd * bw * 0.7;
    box(c, px - 1.8, bot[1] - 1, 3.6, 3.6, 0.6, '#a8763f', INK, 0.6);
    line(c, px + 0.6, bot[1] - 1, px + 0.9, bot[1] + 4.4, '#c9955e', 1); box(c, px - 0.8, bot[1] + 3.8, 3.4, 1.4, 0.3, '#8f9aa3', INK, 0.4);
  }
}
function drawLeg(c, L, lg) {
  const skin = L.legs || L.skin;
  capsule(c, [lg.hip, lg.knee, lg.ankle], 3.5, skin);
  const pants = L.bottomLen ? Math.min(1, L.bottomLen / 5) : 0;
  if (pants > 0) {
    const thighOnly = pants <= 0.55;
    const kneeK = thighOnly ? Math.min(1, pants / 0.5) : 1;
    const kneeP = add(lg.hip, mul(sub(lg.knee, lg.hip), kneeK));
    const pts = [lg.hip, kneeP];
    if (!thighOnly) pts.push(add(lg.knee, mul(sub(lg.ankle, lg.knee), Math.min(1, (pants - 0.5) / 0.5))));
    capsule(c, pts, 4.2, L.bottom);
  }
  drawFoot(c, L, lg);
}
// A real foot: an egg-shaped footprint (narrow heel, wide ball, round toe)
// in the ground plane, extruded upward into a shoe. Stacked layers give the
// sides; everything is projected so the foot turns with the body.
function drawFoot(c, L, lg) {
  const st = L.shoeStyle || 'sneaker', sc = L.shoe, dark = shade(sc, -28);
  let fwd = sub(lg.toe, lg.ankle); fwd = norm(fwd);
  const lat = norm([fwd[2], 0, -fwd[0]]);
  const ground = add(lg.ankle, [0, -0.9, 0]);
  const cu = FOOT_L * 0.42, A = FOOT_L * 0.5 + 1.4;
  const P3 = (u, v, hh) => proj(add(add(add(ground, mul(fwd, u)), mul(lat, v)), [0, hh, 0]));
  const outline = (k, hh, du = 0) => { const o = []; for (let i = 0; i < 22; i++) { const th = i / 22 * TAU, cs = Math.cos(th), sn = Math.sin(th); const bw = (cs > 0 ? 2.0 - 0.3 * cs * cs * cs : 1.55) * k; o.push(P3(cu + du + A * k * cs, bw * sn, hh)); } return o; };
  const path = pts => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts) c.lineTo(q[0], q[1]); c.closePath(); };
  // layers: [scale, height, colour]
  const soleH = { sneaker: 0.8, hightop: 0.9, sandal: 0.55, slipper: 0.7, loafer: 0.5, boot: 0.8, rainboot: 0.8 }[st] ?? 0.7;
  const topH = { sneaker: 2.1, hightop: 2.3, sandal: 0.55, slipper: 2.4, loafer: 1.75, boot: 2.1, rainboot: 2.2 }[st] ?? 2;
  const soleCol = st === 'sneaker' || st === 'hightop' ? '#fffaf0' : st === 'slipper' ? shade(sc, -8) : st === 'sandal' ? sc : shade(sc, -45);
  const layers = [];
  for (let hh = 0; hh <= soleH + 0.001; hh += 0.25) layers.push([1.02, hh, soleCol]);
  if (st !== 'sandal') for (let hh = soleH; hh <= topH + 0.001; hh += 0.25) { const k = 1 - Math.pow((hh - soleH) / Math.max(0.1, topH - soleH), 3) * 0.2; layers.push([k, hh, sc]); }
  if (st !== 'sandal') layers[layers.length - 1][2] = shade(sc, 10);
  // boots / high-tops: a shaft around the ankle
  if (st === 'boot' || st === 'rainboot') capsule(c, [add(lg.knee, mul(sub(lg.ankle, lg.knee), 0.4)), lg.ankle], 5.0, sc);
  if (st === 'hightop') capsule(c, [add(lg.ankle, [0, 2.6, 0]), lg.ankle], 4.4, sc);
  // outline pass (union silhouette), then fill pass
  c.lineJoin = 'round';
  for (const [k, hh] of layers) { path(outline(k, hh)); c.strokeStyle = INK; c.lineWidth = 1.7; c.stroke(); }
  for (const [k, hh, col] of layers) { path(outline(k, hh)); c.fillStyle = col; c.fill(); }
  const top = layers[layers.length - 1], tk = top[0], th = top[1];
  if (st === 'sandal') {
    // bare foot on a flat sole: skin footprint, toes and a strap
    const sk = L.skin, skL = [];
    for (let hh = soleH; hh <= soleH + 1.5; hh += 0.35) skL.push([0.86 - (hh - soleH) * 0.12, hh]);
    for (const [k, hh] of skL) { path(outline(k, hh, -0.2)); c.fillStyle = sk; c.fill(); }
    const last = skL[skL.length - 1]; path(outline(last[0], last[1], -0.2)); c.strokeStyle = shade(sk, -30); c.lineWidth = 0.5; c.stroke();
    for (let i = 0; i < 4; i++) { const v = -0.95 + i * 0.63, u = cu + A * 0.78 - Math.abs(v) * 0.35; const q = P3(u, v, soleH + 0.8); circ(c, q[0], q[1], i === 0 || i === 3 ? 0.55 : 0.62, sk, shade(sk, -35), 0.4); }
    const s1 = P3(cu + 0.3, -1.6, soleH + 1.3), s2 = P3(cu + 0.3, 1.6, soleH + 1.3), s3 = P3(cu + 1.3, 0, soleH + 1.5);
    c.strokeStyle = sc; c.lineWidth = 1.3; c.beginPath(); c.moveTo(s1[0], s1[1]); c.quadraticCurveTo(s3[0], s3[1], s2[0], s2[1]); c.stroke();
    return;
  }
  // details on the top of the shoe
  const T = (u, v) => P3(cu + u * tk, v * tk, th);
  if (st === 'sneaker' || st === 'hightop') {
    // white toe cap and laces
    const cap = []; for (let i = -5; i <= 5; i++) { const th2 = i / 5 * 1.2; cap.push(P3(cu + A * 0.98 * Math.cos(th2) * tk, 1.7 * Math.sin(th2) * tk, th - 0.2)); }
    cap.push(T(A * 0.45, 1.1)); cap.push(T(A * 0.45, -1.1));
    c.beginPath(); c.moveTo(cap[0][0], cap[0][1]); for (const q of cap) c.lineTo(q[0], q[1]); c.closePath(); c.fillStyle = '#fffaf0'; c.fill();
    c.strokeStyle = '#fffaf0'; c.lineWidth = 0.7;
    for (let i = 0; i < 3; i++) { const a1 = T(-0.4 + i * 0.5, -0.55), a2 = T(-0.4 + i * 0.5, 0.55); c.beginPath(); c.moveTo(a1[0], a1[1]); c.lineTo(a2[0], a2[1]); c.stroke(); }
    if (st === 'hightop') { const sp = T(-0.9, 0); circ(c, sp[0], sp[1] - 1.8, 0.9, '#fffaf0', INK, 0.4); }
  } else if (st === 'loafer') {
    const a1 = T(0.2, -1.05), a2 = T(0.2, 1.05), m = T(0.35, 0); c.strokeStyle = dark; c.lineWidth = 0.9; c.beginPath(); c.moveTo(a1[0], a1[1]); c.quadraticCurveTo(m[0], m[1] + 0.3, a2[0], a2[1]); c.stroke(); circ(c, m[0], m[1], 0.5, '#f2c14e', null);
  } else if (st === 'slipper' && fwd[2] > -0.25) {        // the bunny face is on the toe: hidden when the toes point away from you
    for (const v of [-0.7, 0.7]) { const e = T(A * 0.2, v); ell(c, e[0], e[1] - 1.8, 0.8, 1.9, sc, INK, 0.5); ell(c, e[0], e[1] - 1.8, 0.35, 1.2, '#ffc0d0', null); }
    const n = T(A * 0.72, 0); circ(c, n[0], n[1], 0.5, '#f28fa3', null);
    for (const v of [-0.45, 0.45]) { const e = T(A * 0.5, v); circ(c, e[0], e[1], 0.3, INK, null); }
  } else if (st === 'rainboot') {
    const h1 = T(-0.8, -0.8); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(h1[0] - 0.4, h1[1] - 4, 0.8, 3);
  }
  // shine on the toe
  const sh = T(A * 0.55, -0.6); ell(c, sh[0], sh[1], 0.9, 0.45, 'rgba(255,255,255,.5)', null);
  // ankle opening (the leg goes into the shoe)
  if (st === 'sneaker' || st === 'loafer' || st === 'slipper') { const o = T(-A * 0.55, 0); ell(c, o[0], o[1], 1.25 * tk, 0.55, shade(sc, -38), null); }
}
function drawArm(c, L, arm) {
  capsule(c, [arm.sho, arm.elbow, arm.hand], 3.0, L.armSkin || L.skin);
  const sleeve = L.coat ? 0.92 : L.sleeve ?? 0.55;
  if (sleeve > 0) {
    const tot = UPPER + FORE, cut = sleeve * tot;
    const pts = [arm.sho];
    if (cut <= UPPER) pts.push(add(arm.sho, mul(sub(arm.elbow, arm.sho), cut / UPPER)));
    else { pts.push(arm.elbow, add(arm.elbow, mul(sub(arm.hand, arm.elbow), (cut - UPPER) / FORE))); }
    capsule(c, pts, 3.7, L.coat || L.top);
  }
  const h = proj(arm.hand);
  circ(c, h[0], h[1], 1.85, L.skin, INK, 0.9);
  return h;
}
// tote bag: strap over the right shoulder, the bag at the right hip
function drawTote(c, L, S, yaw, swing) {
  const sho = proj(add(S.chest, rotY([SHO_X - 0.6, 1.6, 0], yaw))), bag = add(S.waist, rotY([SHO_X + 1.6, -1.2, 0.4 + swing * 0.8], yaw)), b = proj(bag);
  const w = 3.6 * Math.max(0.45, Math.abs(Math.sin(yaw)) * 0.2 + Math.abs(Math.cos(yaw))), bx = b[0] + swing * 0.6, by = b[1];
  c.strokeStyle = shade(L.tote, -30); c.lineWidth = 0.9; c.beginPath(); c.moveTo(sho[0] - 1, sho[1]); c.lineTo(bx - w * 0.5, by - 3); c.moveTo(sho[0] + 1, sho[1]); c.lineTo(bx + w * 0.5, by - 3); c.stroke();
  c.beginPath(); c.moveTo(bx - w, by - 3); c.lineTo(bx + w, by - 3); c.lineTo(bx + w * 1.15, by + 4); c.lineTo(bx - w * 1.15, by + 4); c.closePath(); c.fillStyle = L.tote; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke();
  if (Math.cos(yaw) > -0.2 || Math.abs(Math.sin(yaw)) > 0.5) heart(c, bx, by + 0.8, 1.1 * Math.min(1, w / 3.6), '#f28fa3', null);
}
// surfboard carried level under the right arm: seen from the side its nose points the way
// you're walking; from the front or back it lies across your hip
function drawSurf(c, L, S, yaw, swing) {
  const sd = Math.sin(yaw), pos = proj(add(S.waist, rotY([SHO_X + 3.2, 2.6, 0.6], yaw)));
  const nose = Math.abs(sd) > 0.35 ? Math.sign(sd) : 1;                        // which way the long end points on screen
  c.save(); c.translate(pos[0] + nose * (Math.abs(sd) > 0.35 ? 3 : 9), pos[1] - 1 + swing * 0.4); c.rotate(-0.06 * nose + swing * 0.03);
  const len = 16, th = 3.4;
  c.beginPath(); c.moveTo(-len * nose, 0); c.bezierCurveTo(-len * 0.7 * nose, -th * 1.1, len * 0.5 * nose, -th, len * nose, -0.4);
  c.bezierCurveTo(len * 0.5 * nose, th, -len * 0.7 * nose, th * 1.1, -len * nose, 0); c.closePath();
  c.fillStyle = L.surf; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
  line(c, -len * 0.82 * nose, 0, len * 0.82 * nose, -0.2, 'rgba(255,255,255,.85)', 0.8);   // the stringer down the middle
  c.restore();
}
function drawBackGear(c, L, S) {
  // backpack / guitar / surfboard hang on the back (−z of the chest)
  const back = add(S.chest, rotY([0, -2.2, -3.8], S.yaw)), bp = proj(back);
  if (L.backpack) { c.beginPath(); c.roundRect ? c.roundRect(bp[0] - 4.6, bp[1] - 3, 9.2, 9.4, 3) : c.rect(bp[0] - 4.6, bp[1] - 3, 9.2, 9.4); c.fillStyle = L.backpack; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); c.fillStyle = shade(L.backpack, -18); c.fillRect(bp[0] - 3.2, bp[1] + 2.4, 6.4, 3); }
  // (the surfboard is carried at your side — see drawSurf)
  if (L.guitar) {
    // an acoustic guitar slung diagonally across the back, neck up over the right shoulder
    // (mirrored from behind, so the neck stays over the same — the right — shoulder)
    const m = Math.cos(S.yaw) < 0 ? -1 : 1;
    c.save(); c.translate(bp[0] - 2 * m, bp[1] + 5); c.scale(m, 1); c.rotate(-0.55);
    const wood = '#e39a45', edge = '#b86b2c';
    box(c, -1.1, -24, 2.2, 15, 0.6, '#6b4431', INK, 0.7);                                            // neck / fretboard
    for (let k = 0; k < 5; k++) line(c, -1.1, -22 + k * 2.6, 1.1, -22 + k * 2.6, '#d9c8a8', 0.35);   // frets
    c.beginPath(); c.moveTo(-1.6, -24); c.lineTo(1.6, -24); c.lineTo(1.9, -28.5); c.lineTo(-1.9, -28.5); c.closePath(); c.fillStyle = '#4a3226'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.6; c.stroke();   // headstock
    for (const y of [-25.3, -26.6, -27.8]) { circ(c, -2.4, y, 0.55, '#e6ecef', INK, 0.3); circ(c, 2.4, y, 0.55, '#e6ecef', INK, 0.3); }   // tuning pegs
    // body: upper bout, waist, lower bout
    c.beginPath(); c.ellipse(0, 1.6, 5.6, 5.2, 0, 0, TAU); c.ellipse(0, -5.2, 4.2, 3.9, 0, 0, TAU); c.fillStyle = edge; c.fill();
    c.beginPath(); c.ellipse(0, 1.6, 5.2, 4.8, 0, 0, TAU); c.moveTo(3.9, -5.2); c.ellipse(0, -5.2, 3.9, 3.6, 0, 0, TAU); c.fillStyle = wood; c.fill();
    c.beginPath(); c.ellipse(0, 1.6, 5.6, 5.2, 0, 0.35, Math.PI - 0.35); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke();
    c.beginPath(); c.ellipse(0, -5.2, 4.2, 3.9, 0, Math.PI + 0.5, TAU - 0.5); c.stroke();
    c.beginPath(); c.moveTo(-5.4, 0.2); c.quadraticCurveTo(-3.2, -2.2, -4, -4.4); c.moveTo(5.4, 0.2); c.quadraticCurveTo(3.2, -2.2, 4, -4.4); c.stroke();   // the waist
    circ(c, 0, -2.2, 1.9, '#3a2418', null); c.beginPath(); c.arc(0, -2.2, 2.5, 0, TAU); c.strokeStyle = '#f7de8c'; c.lineWidth = 0.4; c.stroke();   // sound hole + rosette
    box(c, -2.2, 2.8, 4.4, 1.1, 0.4, '#6b4431', null);                                             // bridge
    ell(c, 2.4, 0.6, 1.3, 2, 'rgba(90,50,30,.35)', null, 0, 0.4);                                 // pickguard
    c.strokeStyle = 'rgba(255,255,240,.8)'; c.lineWidth = 0.22; for (const x of [-0.6, -0.2, 0.2, 0.6]) { c.beginPath(); c.moveTo(x, 3); c.lineTo(x * 0.8, -24); c.stroke(); }   // strings
    c.restore();
  }
}

// ---------------------------------------------------------------- main entry
export function drawVillager(c, a, t) {
  const L = a.look; if (!L) return;
  const sc = L.scale || 1;
  const yaw = yawOf(a, t);
  const P = pose(a, t, yaw);
  const S = skeleton(a, P, yaw);
  const facing = Math.cos(yaw);                 // >0 facing the camera
  c.save();
  if (!a.lying) shadow(c, 0, 0.4, 9 * sc, 3 * sc, a.sit ? 0.12 : 0.2);
  c.scale(sc * 1.15 * P.squashX, sc * 1.15 * P.squashY);   // model scale
  c.lineJoin = 'round'; c.lineCap = 'round';

  // gather parts with depth, draw back to front
  const parts = [];
  const depth = p => p[2];
  // legs come out from under the shorts: always behind the body, unless seated (thighs on the lap)
  for (const lg of S.legs) parts.push({ z: P.seat !== undefined ? (depth(lg.knee) + depth(lg.ankle)) / 2 + 2 : -100 + depth(lg.ankle), draw: () => drawLeg(c, L, lg) });
  // Arm layering. Relaxed arms hang at the sides: seen from the front both are
  // drawn over the body edge, from the back both behind it, and from the side the
  // near arm is in front and the far arm behind, no matter which way it swings.
  // (Swinging used to flip each arm in front of the chest one at a time.)
  const sideness = Math.sin(yaw);
  for (const arm of S.arms) {
    if (L.cape) continue;                        // hands tucked under the salon cape
    const d = (depth(arm.elbow) + depth(arm.hand)) / 2, shoZ = -arm.side * SHO_X * sideness, aimed = P.hands[arm.side > 0 ? 1 : 0].aim;
    let z;
    if (aimed && facing > -0.25 && depth(arm.hand) > 1.5) z = d + 0.3;             // reaching forward (eating, carrying)
    else if (Math.abs(sideness) < 0.42) z = facing > 0 ? 0.3 + d * 0.01 : -50 + d;
    else z = shoZ > 0 ? 0.3 + d * 0.01 : -50 + d;
    parts.push({ z, draw: () => {
      const h = drawArm(c, L, arm); if (arm.side > 0) P.hR = h; else P.hL = h;
      if (arm.side < 0 && P.basket) drawBasket(c, h[0], h[1], a.basketItems || 0, t, (a.moving || 0) * Math.sin((a.walkPh || 0) * 2));
    } });
  }
  parts.push({ z: 0, torso: true, draw: () => drawTorso(c, L, S, a, t) });
  // worn on the back: seen from behind it's over long hair (a ponytail still falls over it)
  if (L.backpack || L.guitar) parts.push({ z: facing < -0.15 ? 99.5 : -3.8 * facing, overHead: facing < -0.15, draw: () => drawBackGear(c, L, S) });
  // things that hang at the right side: they turn with you and swing as you walk
  const rside = rotY([1, 0, 0], yaw), swing = Math.sin((a.walkPh || 0) * 2) * (a.moving || 0);
  if (L.tote) parts.push({ z: rside[2] * 6 + 0.2, draw: () => drawTote(c, L, S, yaw, swing) });
  if (L.surf) parts.push({ z: rside[2] * 9 + 0.1, draw: () => drawSurf(c, L, S, yaw, swing) });
  // long hair curtain hangs behind the head (in front of the back when seen from behind)
  const H = HAIR[L.hairStyle] || HAIR.bob;
  const covered = HAT_COVERS.includes(L.hat);
  // seen from behind, long hair is one shape from the crown to the ends (drawn over the head)
  // (under a hat it flows out from beneath it: trimmed below the hat line, and the hat goes on after)
  const brimmed = ['nonla', 'sunhat', 'bucket', 'boater'].includes(L.hat);
  if (H.curtain && facing < -0.15) parts.push({ z: 99, overHead: true, draw: () => {
    const hc0 = proj(S.head), hc = [hc0[0], hc0[1] - 0.8], R = HR * (covered ? 1.09 : 1.16), cl = H.curtain + 0.8, w2 = HR * (0.95 + 0.1 * Math.abs(Math.sin(yaw))) * (H.narrow ? 0.62 : 1);
    c.save();
    if (covered) { c.beginPath(); c.rect(hc[0] - 60, hc0[1] - HR * (brimmed ? 0.4 : 0.1), 120, 80); c.clip(); }
    c.beginPath();
    c.moveTo(hc[0] - R, hc[1]);
    c.arc(hc[0], hc[1], R, Math.PI, TAU);                                          // over the crown
    c.lineTo(hc[0] + Math.max(w2, R * 0.92), hc[1] + 3);
    c.lineTo(hc[0] + w2 + 0.6, hc[1] + cl);
    if (H.wavy || H.curls || H.messy) { const n = H.curls ? 6 : 4; for (let i = n - 1; i >= 0; i--) { const x = hc[0] - w2 + (i + 0.5) * (w2 * 2 / n); c.quadraticCurveTo(x + w2 / (n * 2), hc[1] + cl + (H.curls ? 3 : 2.2), x - w2 / n + w2 / (n * 2), hc[1] + cl); } }
    else c.quadraticCurveTo(hc[0], hc[1] + cl + (H.blunt ? 0.6 : 3.4), hc[0] - w2 - 0.6, hc[1] + cl);
    c.lineTo(hc[0] - Math.max(w2, R * 0.92), hc[1] + 3);
    c.closePath();
    c.fillStyle = L.hair; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    // strands run all the way from the crown down, plus a soft shine
    c.strokeStyle = cols(L).hairS; c.lineWidth = 0.6; c.globalAlpha = 0.6;
    for (const k of [-0.55, -0.2, 0.2, 0.55]) { c.beginPath(); c.moveTo(hc[0] + k * R * 0.5, hc[1] - R * 0.7); c.quadraticCurveTo(hc[0] + k * R * 0.95, hc[1], hc[0] + k * w2 * 1.05, hc[1] + cl - 1.5); c.stroke(); }
    c.globalAlpha = 1;
    c.fillStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.ellipse(hc[0] - R * 0.25, hc[1] - R * 0.55, R * 0.45, R * 0.18, -0.2, 0, TAU); c.fill();
    c.restore();
  } });
  if (H.curtain && !(facing < -0.15)) parts.push({ z: -2 * facing - 0.5, draw: () => {
    const hc = proj(S.head), w2 = HR * (0.95 + 0.1 * Math.abs(Math.sin(yaw))) * (H.narrow ? 0.62 : 1), cl = a.lying ? Math.min(H.curtain, 6) : H.curtain;   // lying back, long hair spreads round the head instead of hanging
    c.beginPath(); c.moveTo(hc[0] - w2, hc[1] - 2);
    c.lineTo(hc[0] - w2 - 0.6, hc[1] + cl);
    if (H.wavy || H.curls || H.messy) { const n = H.curls ? 6 : 4; for (let i = 0; i < n; i++) { const x = hc[0] - w2 + (i + 0.5) * (w2 * 2 / n); c.quadraticCurveTo(x - w2 / (n * 2), hc[1] + cl + (H.curls ? 3.6 : 3), x + w2 / n, hc[1] + cl - (H.messy && i % 2 ? 1.6 : 0)); } }
    else c.quadraticCurveTo(hc[0], hc[1] + cl + (H.blunt ? 0.6 : 3.4), hc[0] + w2 + 0.6, hc[1] + cl);
    c.lineTo(hc[0] + w2, hc[1] - 2); c.closePath(); c.fillStyle = L.hair; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    // a few strand lines
    c.strokeStyle = cols(L).hairS; c.lineWidth = 0.6; c.globalAlpha = 0.6;
    for (const k of [-0.5, 0, 0.5]) { c.beginPath(); c.moveTo(hc[0] + k * w2, hc[1] + 4); c.lineTo(hc[0] + k * w2 * 1.08, hc[1] + cl - 1); c.stroke(); }
    c.globalAlpha = 1;
  } });
  // pigtails / ponytails / braids
  const tie = L.hairTie || '#f28f7c';
  // (tails, ponytails and buns tied at the back are in front of the head when you see them
  // from behind — drawn over it, never hidden under it with only the tip poking out at the neck)
  const nearSide = p => depth(p) > S.head[2] + 0.5;
  if (H.tails) { const n = (H.tails.len || 11) / 11; for (const s of [-1, 1]) { const base = add(S.head, rotY([s * (HR + 0.4), 1.5, -1.5], yaw)); parts.push({ z: nearSide(base) ? 100 + depth(base) : depth(base) - 0.2, overHead: nearSide(base), draw: () => hairTail(c, [base, add(base, rotY([s * 2.2, -6 * n, -0.5], yaw)), add(base, rotY([s * 1.2, -11 * n, -1], yaw))], H.tails.braid ? 4 : 5.6, L.hair, H.tails.braid, tie) }); } }
  if (H.pony) {
    const o = H.pony, n = (o.len || 11) / 11;
    let base, pts;
    if (o.side) { const s = o.side; base = add(S.head, rotY([s * HR * 0.72, -4.5, 3], yaw)); pts = [base, add(base, rotY([s * 1.4, -5 * n, 1.2], yaw)), add(base, rotY([s * 0.8, -11 * n, 1.8], yaw))]; }
    else if (o.high) { base = add(S.head, rotY([0, HR * 0.72, -HR * 0.72], yaw)); pts = [base, add(base, rotY([0, -1, -4.2], yaw)), add(base, rotY([0, -7 * n, -4.8], yaw)), add(base, rotY([0, -12 * n, -3], yaw))]; }
    else if (o.low) { base = add(S.head, rotY([0, -3.5, -HR * 0.86], yaw)); pts = [base, add(base, rotY([0, -5 * n, -1.2], yaw)), add(base, rotY([0, -10 * n, -0.8], yaw))]; }
    else { base = add(S.head, rotY([0, 2.4, -HR * 0.97], yaw)); pts = [base, add(base, rotY([0, -2.6, -2.6], yaw)), add(base, rotY([0, -8 * n, -2.8], yaw)), add(base, rotY([0, -14 * n, -1.6], yaw))]; }   // tied at the back of the head, hanging past the nape
    parts.push({ z: nearSide(base) ? 100 + depth(base) : depth(base), overHead: nearSide(base), draw: () => hairTail(c, pts, o.braid ? 4.4 : 6.4, L.hair, o.braid, tie) });
  }
  // neck then head (+ hair + face + hat)
  parts.push({ z: 0.5, head: true, draw: () => {
    drawHead(c, a, L, S, yaw, t, P, H);
  } });
  // buns and puffs on your side of the head sit over it (and over long hair seen from behind)
  if ((H.buns || H.topBun || H.puff) && !covered) parts.push({ z: 100.5, overHead: true, draw: () => headSpace(c, a, S, yaw, P, () => drawHairKnots(c, L, S, yaw, H, true)) });
  // the hat goes on last: over the head, the hair and anything tied at the back of it
  if (L.hat || L.flower) parts.push({ z: 0, hat: true, draw: () => headSpace(c, a, S, yaw, P, yawFace => drawHat(c, L, S, yawFace, t)) });
  const layer = p => p.hat ? 3 : p.overHead ? 2 : p.head ? 1 : 0;
  parts.sort((p, q) => layer(p) - layer(q) || p.z - q.z);
  for (const p of parts) p.draw();
  // held item in the right hand (or both hands)
  // seen from behind, things held in front of the body (a plate, a cup, a snack, a notebook) are
  // hidden by it; only tools swung out to the side (hammer, broom, ladle, knife) still show
  const tool = ['hammer', 'broom', 'ladle', 'knife'].includes(P.held);
  if (P.held && P.hR && (facing >= -0.3 || tool)) {
    if (P.heldHand === 'both' && P.hL) drawHeld(c, P.held, (P.hL[0] + P.hR[0]) / 2, (P.hL[1] + P.hR[1]) / 2 - 1.5, t, 'front');
    else {
      let [hx, hy] = P.hR;
      // facing away (hammering a wall, stirring at the stove): keep the tool clear of
      // the head so it reads in front of it — out to the right hand's side, a hammer up high
      if (facing < -0.3) {
        const hc = proj(S.head), side = Math.sign(Math.cos(yaw) * -1) || 1;
        if (Math.hypot(hx - hc[0], hy - hc[1]) < HR + 3) { hx = hc[0] + side * (HR + 2.5); if (P.held === 'hammer') hy = Math.min(hy, hc[1] - 2); circ(c, hx, hy, 1.85, L.skin, INK, 0.9); }   // the hand holding it
      }
      // a sip or a bite: the cup / bowl goes to the mouth — just in front of the face, never into the head
      if (P.sip && facing > -0.3) {
        const hc = proj(S.head), fwd = Math.sin(yaw);
        hx = hc[0] + fwd * HR * 0.95; hy = hc[1] + HR * (0.62 - 0.12 * Math.abs(fwd));
        circ(c, hx + (fwd >= 0 ? 1.4 : -1.4), hy + 2.2, 1.85, L.skin, INK, 0.9);   // the hand under it
      }
      drawHeld(c, P.held, hx, hy, t, facing > -0.2 ? 'front' : 'back', P);
    }
  }
  c.restore();
}

// Which way the face points. Cartoon three-quarter cheat: seen from the side the face
// turns toward the camera (side → about 45°). Past the side it swings on round to the
// back, so from behind (and three-quarters behind) you see the back of the head — not
// a face peeking over the edge of it.
function faceYaw(yaw, turn = 0) {
  let yn = yaw; while (yn > Math.PI) yn -= TAU; while (yn < -Math.PI) yn += TAU;
  const q = Math.abs(yn), s0 = Math.PI / 2 - 0.8;
  const f = q <= Math.PI / 2 ? yn - 0.8 * Math.sin(yn) : Math.sign(yn) * (s0 + (Math.PI - s0) * Math.pow((q - Math.PI / 2) / (Math.PI / 2), 0.75));
  return f + turn;
}
// run fn in the head's own space (its tilt), with the face direction
function headSpace(c, a, S, yaw, P, fn) {
  const hc = proj(S.head);
  c.save();
  if (P.headTilt) { c.translate(hc[0], hc[1] + HR * 0.6); c.rotate(P.headTilt); c.translate(-hc[0], -hc[1] - HR * 0.6); }
  fn(faceYaw(yaw, a.headTurn || 0));
  c.restore();
}
// Spiky hair: tufts all round the crown pointing outward, so it's spiky from every side.
// Tufts on the far side are drawn behind the head (only their tips show over the top).
function spikes(c, S, yawFace, hc, L, near) {
  const tufts = [];
  for (let i = -2; i <= 2; i++) tufts.push([i * 0.4, 0.9]);                 // the front row
  for (let i = 0; i < 8; i++) tufts.push([-Math.PI + (i + 0.5) / 8 * TAU, 0.55]);   // round the crown
  tufts.push([Math.PI, 1.15], [Math.PI * 0.6, 1.1], [-Math.PI * 0.6, 1.1]);
  for (const [lon, lat] of tufts) {
    const q = onHead(S, yawFace, lon, lat, HR * 1.04); if ((q.dz > 0.05) !== near) continue;
    const pp = proj(q.p), vx = pp[0] - hc[0], vy = pp[1] - hc[1] - 3, l = Math.hypot(vx, vy) || 1, ux = vx / l, uy = vy / l;
    const tip = [pp[0] + ux * 4.2, pp[1] + uy * 4.2];
    poly(c, [pp[0] - uy * 2.3, pp[1] + ux * 2.3, tip[0], tip[1], pp[0] + uy * 2.3, pp[1] - ux * 2.3], L.hair, INK, 0.8);
    circ(c, pp[0], pp[1], 2.1, L.hair, null);
  }
}
// Buns and puffs: the ones on the far side of the head are drawn before it (peeking
// out round the edge), the ones on your side after the hair, sitting on top of it.
function drawHairKnots(c, L, S, yaw, H, near) {
  const C = cols(L);
  const side = p => (p[2] > S.head[2] + 0.5) === near;
  if (H.buns) for (const s of [-1, 1]) { const b = add(S.head, rotY([s * 6.4, HR * 0.78, -1.5], yaw)); if (!side(b)) continue; const bp = proj(b); circ(c, bp[0], bp[1], 4, L.hair); c.strokeStyle = C.hairH; c.lineWidth = 0.8; c.beginPath(); c.arc(bp[0] - 0.8, bp[1] - 0.8, 2.2, 3.4, 4.6); c.stroke(); }
  if (H.topBun) {
    const o = H.topBun, b = add(S.head, rotY([0, HR * (o.back ? 0.72 : 0.95), o.back ? -HR * 0.62 : -2], yaw)), bp = proj(b), r = o.small ? 3.2 : 4.2;
    if (side(b)) {
      if (o.messy) bumpyBlob(c, bp[0], bp[1] - 0.5, r + 0.8, L.hair, 8);
      else { circ(c, bp[0], bp[1], r, L.hair); c.strokeStyle = C.hairH; c.lineWidth = 0.7; c.beginPath(); c.arc(bp[0], bp[1], r * 0.55, 3.3, 5.2); c.stroke(); }
      if (o.messy) { c.strokeStyle = INK; c.lineWidth = 0.7; c.beginPath(); c.moveTo(bp[0] + 2, bp[1] - r); c.quadraticCurveTo(bp[0] + 5, bp[1] - r - 2, bp[0] + 4.4, bp[1] - r + 1.4); c.stroke(); }
    }
  }
  if (H.puff) { const b = add(S.head, rotY([0, HR * 0.86, -3], yaw)); if (side(b)) { const bp = proj(b); bumpyBlob(c, bp[0], bp[1] - H.puff * 0.35, H.puff, L.hair, 11); } }
}
function drawHead(c, a, L, S, yaw, t, P, H) {
  const C = cols(L), hc = proj(S.head);
  const yawFace = faceYaw(yaw, a.headTurn || 0);
  c.save();
  // head tilt (emotions, thinking)
  if (P.headTilt) { c.translate(hc[0], hc[1] + HR * 0.6); c.rotate(P.headTilt); c.translate(-hc[0], -hc[1] - HR * 0.6); }
  // hair volume behind the head
  const shaved = H.bald || H.fade || H.buzz;
  // hats press the hair down: no crown lift or texture poking out over the hat
  const hatOn = HAT_COVERS.includes(L.hat);
  const HS = hatOn ? { ...H, vol: Math.min(H.vol, 1.06), crown: 0.02, tex: 0, side: Math.min(H.side ?? 0.03, 0.05) } : H;
  const shell = shaved ? null : hairShell(hc, HS, yawFace);
  if (shell) {
    c.save(); c.beginPath(); noBeardClip(c, hc, yawFace); c.clip();
    if (H.curls) for (let i = 0; i < 18; i++) { const q = shell[Math.floor(i / 18 * shell.length)]; circ(c, q[0], q[1], 2.7, L.hair, INK, 0.9); }
    c.beginPath(); shellPath(c, shell); c.fillStyle = L.hair; c.fill(); if (!H.curls) { c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); }
    c.restore();
  }
  const covered = HAT_COVERS.includes(L.hat);
  if (!covered) drawHairKnots(c, L, S, yaw, H, false);
  if (H.spikes && !covered) spikes(c, S, yawFace, hc, L, false);
  // ears: at the edge they stick out from behind the head; turned toward you (seen from
  // three-quarters behind) they sit on it
  const ears = [-1, 1].map(s => onHead(S, yawFace, s * 1.5, -0.08));
  const ear = q => { const pp = proj(q.p), k = clamp(q.dz, 0, 1); ell(c, pp[0], pp[1], 1.7 + k * 0.5, 2.3 + k * 0.3, L.skin, INK, 0.8); if (k > 0.3) { c.strokeStyle = C.skinD; c.lineWidth = 0.5; c.beginPath(); c.arc(pp[0], pp[1], 1.1, -1.2, 1.6); c.stroke(); } };
  for (const q of ears) if (q.dz > -0.2 && q.dz <= 0.35) ear(q);
  // the head sphere
  c.beginPath(); c.ellipse(hc[0], hc[1], HR, HR * 0.97, 0, 0, TAU);
  const g = c.createRadialGradient(hc[0] - HR * 0.3, hc[1] - HR * 0.3, HR * 0.2, hc[0], hc[1], HR * 1.05);
  g.addColorStop(0, shade(L.skin, 6)); g.addColorStop(1, shade(L.skin, -6));
  c.fillStyle = g; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.05; c.stroke();
  for (const q of ears) if (q.dz > 0.35) ear(q);
  // face (only the visible side)
  drawFace(c, a, L, S, yawFace, t, P);
  // hair cap with fringe
  if (!H.bald) {
    // faded sides: short stubble below the main cut
    if (H.fade || H.buzz) {
      const fl = H.buzz ? (lon => hairLat(H, lon)) : (lon => 1.5 - 1.72 * smooth(0.35, 1.25, Math.abs(lon)));
      c.save(); c.globalAlpha = H.buzz ? 0.8 : 0.5;
      capRegion(c, S, yawFace, fl, HR * 1.01, L.hair, null);
      c.restore();
    }
    if (!H.buzz && !H.mohawk) {
      const inner = shell ? hairShell(hc, HS, yawFace, -0.55) : null;
      capRegion(c, S, yawFace, lon => hairLat(H, lon), HR * 1.04, L.hair, () => {
        // sheen
        c.strokeStyle = C.hairH; c.lineWidth = 1.2; c.globalAlpha = 0.55;
        c.beginPath(); c.ellipse(hc[0] - 1.5, hc[1] - HR * 0.35, HR * 0.6, HR * 0.38, 0, Math.PI * 1.15, Math.PI * 1.6); c.stroke(); c.globalAlpha = 1;
        // combed-back lines, part lines and curl texture
        c.strokeStyle = C.hairS; c.lineWidth = 0.65;
        if (H.slick) for (const lon0 of [-0.7, -0.35, 0, 0.35, 0.7]) { const q = []; for (let k = 0; k <= 6; k++) { const o = onHead(S, yawFace, lon0 * (1 - k / 8) + (H.sweep ? 0.2 : 0), H.f + 0.12 + k * 0.12, HR * 1.04); if (o.dz > 0.05) q.push(proj(o.p)); } if (q.length > 1) { c.beginPath(); c.moveTo(q[0][0], q[0][1]); for (const pt of q) c.lineTo(pt[0], pt[1]); c.stroke(); } }
        if (H.sweep || H.cpart) { const lp = H.cpart ? 0 : -Math.sign(H.sweep) * 0.5; const q = []; for (let k = 0; k <= 5; k++) { const o = onHead(S, yawFace, lp, hairLat(H, lp) + 0.02 + k * 0.14, HR * 1.04); if (o.dz > 0.05) q.push(proj(o.p)); } if (q.length > 1) { c.lineWidth = 0.8; c.beginPath(); c.moveTo(q[0][0], q[0][1]); for (const pt of q) c.lineTo(pt[0], pt[1]); c.stroke(); } }
        if (H.curls) { c.strokeStyle = C.hairS; c.lineWidth = 0.7; for (let i = 0; i < 14; i++) { const o = onHead(S, yawFace, -1.3 + (i % 5) * 0.65 + (i > 4 ? 0.3 : 0), 0.55 + Math.floor(i / 5) * 0.3, HR * 1.04); if (o.dz < 0.2) continue; const pp = proj(o.p); c.beginPath(); c.arc(pp[0], pp[1], 1.3, 0.4, 3.9); c.stroke(); } }
      }, inner ? () => { c.beginPath(); shellPath(c, inner); c.clip(); c.beginPath(); noBeardClip(c, hc, yawFace); c.clip(); } : null);
      // outline the hairline so the fringe reads clearly
      const line2 = []; for (let i = 0; i <= 60; i++) { const lon = -Math.PI + i / 60 * TAU, q = onHead(S, yawFace, lon, hairLat(H, lon), HR * 1.04); if (q.dz >= 0.02) line2.push(proj(q.p)); else if (line2.length) { strokeLine(c, line2); line2.length = 0; } }
      if (line2.length) strokeLine(c, line2);
    }
    if (!covered) {
      if (H.spikes) spikes(c, S, yawFace, hc, L, true);
      if (H.quiff) {
        // a swoop of volume at the front of the crown
        const q = onHead(S, yawFace, H.sweep ? 0.15 : 0, 0.95, HR * 1.02), pp = proj(q.p), k = H.quiff * clamp(q.dz * 2 + 0.6, 0.35, 1), dx = Math.sin(yawFace) * 2;
        c.save(); if (q.dz < 0.1) { c.beginPath(); c.rect(hc[0] - 60, hc[1] - 60, 120, 120); c.ellipse(hc[0], hc[1], HR * 1.03, HR, 0, 0, TAU); c.clip('evenodd'); }
        const top = () => { c.moveTo(pp[0] - 7, pp[1] + 3); c.bezierCurveTo(pp[0] - 7.4, pp[1] - k * 0.7, pp[0] + dx - 1, pp[1] - k * 1.2, pp[0] + dx + 5.6, pp[1] - k * 0.75); c.bezierCurveTo(pp[0] + dx + 8, pp[1] - k * 0.55, pp[0] + 7.6, pp[1] - 0.5, pp[0] + 6.8, pp[1] + 3); };
        c.beginPath(); top(); c.quadraticCurveTo(pp[0], pp[1] + 4.5, pp[0] - 7, pp[1] + 3); c.fillStyle = L.hair; c.fill();
        c.beginPath(); top(); c.strokeStyle = INK; c.lineWidth = 0.95; c.stroke();
        c.strokeStyle = C.hairH; c.lineWidth = 0.9; c.globalAlpha = 0.6; c.beginPath(); c.moveTo(pp[0] - 4.4, pp[1] - k * 0.2); c.quadraticCurveTo(pp[0] - 1, pp[1] - k * 0.95, pp[0] + 3.5, pp[1] - k * 0.6); c.stroke(); c.globalAlpha = 1;
        c.restore();
      }
      if (H.mohawk) {
        const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14, lat = 0.8 + u * 1.7; const lon = lat > Math.PI / 2 ? Math.PI : 0, la = lat > Math.PI / 2 ? Math.PI - lat : lat; pts.push(onHead(S, yawFace, lon, la, HR * 1.06)); }
        pts.sort((p1, p2) => p1.dz - p2.dz);
        for (const q of pts) { if (q.dz < -0.2 && q.p[1] - S.head[1] < HR * 0.8) continue; const pp = proj(q.p), vx = pp[0] - hc[0], vy = pp[1] - hc[1], l = Math.hypot(vx, vy) || 1; poly(c, [pp[0] - 2.4, pp[1] + 1, pp[0] + vx / l * 4.4, pp[1] + vy / l * 4.4 - 1, pp[0] + 2.4, pp[1] + 1], L.hair, INK, 0.8); circ(c, pp[0], pp[1] + 0.6, 2.3, L.hair, null); }
      }
    }
  }
  c.restore();
}
// A little woven market basket; groceries pile up as you shop.
function drawBasket(c, x, y, n, t, swing) {
  c.save(); c.translate(x, y); c.rotate(swing * 0.12);
  c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath(); c.arc(0, 4, 5, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  c.strokeStyle = '#c98f5a'; c.lineWidth = 1.2; c.stroke();
  // the groceries pile up out of the top: a leek and a baguette stand up behind, fruit in front
  if (n >= 2) { c.save(); c.rotate(-0.35); box2(c, -4.6, -6, 1.8, 9, '#f2f0e0'); for (const dx of [-0.6, 0.6]) { c.beginPath(); c.moveTo(-3.7 + dx, -6); c.lineTo(-4.6 + dx * 3, -10); c.strokeStyle = '#6fae4c'; c.lineWidth = 1.2; c.stroke(); } c.restore(); }
  if (n >= 4) { c.save(); c.rotate(0.4); box2(c, 2.6, -7, 2.6, 10, '#e7b160'); c.restore(); }
  poly(c, [-6.2, 3.6, 6.2, 3.6, 4.8, 10.2, -4.8, 10.2], '#d9a066', INK, 0.9);
  const fruit = ['#ffa53a', '#79b85c', '#e8584e', '#f7de8c', '#9fd67a', '#f4a9b8', '#ffa53a', '#e8584e'];
  for (let i = 0; i < Math.min(8, n); i++) { const row = Math.floor(i / 4), x = -4.2 + (i % 4) * 2.8 + row * 1.4, y = 2.4 - row * 2.2; circ(c, x, y, 1.9, fruit[i], INK, 0.5); circ(c, x - 0.6, y - 0.6, 0.5, 'rgba(255,255,255,.6)', null); }
  c.strokeStyle = '#b77a4f'; c.lineWidth = 0.6;
  for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-5.8 + k * 0.4, 5.6 + k * 1.6); c.lineTo(5.8 - k * 0.4, 5.6 + k * 1.6); c.stroke(); }
  for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 2.3, 3.8); c.lineTo(k * 1.8, 10); c.stroke(); }
  box2(c, -6.6, 2.8, 13.2, 1.6, '#e3b77f');
  c.restore();
}
function box2(c, x, y, w, h, fill) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 0.8) : c.rect(x, y, w, h); c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke(); }
function strokeLine(c, pts) { if (pts.length < 2) return; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); }

// Where emotes should float above this character.

// Draw a character framed on their face: head centred at (cx, cy), about
// `size` across. Used for portraits and the little queue faces.
export function drawVillagerHead(c, cx, cy, size, a, t) {
  const sc = (a.look?.scale || 1) * 1.15, k = size / (HR * 2.3 * sc);
  c.save(); c.translate(cx, cy + HEAD_Y * sc * k); c.scale(k, k);
  drawVillager(c, { dir: 'down', moving: 0, walkPh: 0, seed: 1, blinkAmt: 0, emo: 'happy', ...a, portrait: true }, t);
  c.restore();
}
