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
import { INK, ell, circ, limb, poly, shadow, heart, line } from './draw.js';
import { drawHeld } from './food.js';

const CY = 0.96, SZ = 0.3;
// skeleton dimensions (model units ≈ world units)
const HIP_Y = 9.4, HIP_X = 2.6, THIGH = 4.8, SHIN = 4.6, FOOT_L = 2.8;
const WAIST_Y = 9.8, CHEST_Y = 17.6, SHO_X = 4.5, SHO_Y = 17, UPPER = 4.2, FORE = 4.0;
const NECK_Y = 19.3, HEAD_Y = 28.2, HR = 9.9;
export const HEAD_CENTER_Y = HEAD_Y;

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
    feet: [], hands: [null, null], held: null, heldHand: 'R', squashY: 1, squashX: 1,
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
    P.hands[side < 0 ? 0 : 1] = { x: side * (SHO_X + 1.0 + run * 0.4), y: SHO_Y - UPPER - FORE + 0.9 + bend + run * 1.2 * m, z: swing + 0.4 };
  }
  // airborne: knees tuck, arms up a little
  const air = Math.min(1, (a.hop || 0) / 8);
  if (air > 0.05) { for (const f of P.feet) { f.y += air * 2.4; f.z -= air * 1.2; } P.hands[0].y += air * 4; P.hands[1].y += air * 4; P.hands[0].x -= air; P.hands[1].x += air; }
  if (a.turnT > 0) { const k = a.turnT / 0.14; P.squashX = 1 - 0.06 * k; P.squashY = 1 + 0.04 * k; }
  if (a.squash) { P.squashY *= 1 - a.squash * 0.16; P.squashX *= 1 + a.squash * 0.12; }

  const aim = (i, x, y, z) => { P.hands[i] = { x, y, z }; };
  switch (act) {
    case 'wave': aim(1, SHO_X + 3.2 + Math.sin(t * 12) * 1.8, SHO_Y + 6.4, 2); break;
    case 'cheer': { const k = Math.abs(Math.sin(t * 9)); aim(0, -SHO_X - 2.4, SHO_Y + 6.6 + k * 1.4, 1); aim(1, SHO_X + 2.4, SHO_Y + 6.6 + k * 1.4, 1); break; }
    case 'think': aim(1, 2.2, SHO_Y + 3.4, 5.4); P.headTilt += 0.1; break;
    case 'carry': aim(0, -2.6, SHO_Y - 3, 5); aim(1, 2.6, SHO_Y - 3, 5); P.held = a.held; P.heldHand = 'both'; break;
    case 'drink': case 'eat': { const k = (Math.sin(at * 2.2) + 1) / 2, up = k > 0.72; aim(1, 1.6, up ? SHO_Y + 4 : SHO_Y - 4, up ? 6.4 : 4.6); P.held = a.held || (act === 'drink' ? 'cup' : 'bowl'); if (up && act === 'eat') P.chew = true; break; }
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
    case 'wait': P.feet[1].y += Math.max(0, Math.sin(at * 6)) * (Math.sin(at * 0.7) > 0.3 ? 0.9 : 0); break;
    case 'sleep': P.headNod += 0.12; break;
    case 'ride': P.ride = true; break;
  }
  // carrying a shopping basket in the left hand (unless that hand is busy)
  if (a.basket && !['cheer', 'carry', 'photo', 'dance', 'stretch', 'write', 'sweep', 'chop', 'work', 'stir', 'hammer'].includes(act)) { aim(0, -(SHO_X + 1.8), SHO_Y - 6.4 + P.bob * 0.3, 1.6 + Math.sin(ph) * 0.8 * m); P.basket = true; }
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
    const r = ik(sho, handW, UPPER, FORE, Rb([side * 0.35, -0.3, -1]));   // elbows point back and a little out
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
const HAIR = {
  short:  { f: 0.42, s: 0.05, b: -0.55, vol: 1.04 },
  spiky:  { f: 0.44, s: 0.1, b: -0.5, vol: 1.05, spikes: true },
  bob:    { f: 0.3, s: -0.6, b: -0.95, vol: 1.1, jaw: true },
  long:   { f: 0.3, s: -0.5, b: -1.2, vol: 1.08, curtain: 13 },
  wavy:   { f: 0.28, s: -0.5, b: -1.2, vol: 1.1, curtain: 14, wavy: true },
  twin:   { f: 0.3, s: -0.25, b: -0.7, vol: 1.05, tails: true },
  pony:   { f: 0.33, s: -0.1, b: -0.55, vol: 1.04, pony: true },
  buns:   { f: 0.35, s: -0.1, b: -0.5, vol: 1.04, buns: true },
  granny: { f: 0.5, s: 0.1, b: -0.4, vol: 1.05, topBun: true },
  bald:   { f: 1.2, s: 1.2, b: 1.2, vol: 1 },
};
function hairLat(H, lon) {
  const a = Math.abs(lon);
  let lat;
  if (a < 1.1) lat = H.f + (H.s - H.f) * Math.pow(a / 1.1, 2.2) * 0.5;
  else if (a < 1.75) lat = H.f + (H.s - H.f) * (0.5 + 0.5 * (a - 1.1) / 0.65);
  else lat = H.s + (H.b - H.s) * Math.min(1, (a - 1.75) / 1.2);
  if (a < 1.05) lat -= 0.09 * Math.pow(Math.abs(Math.sin(lon * 5.2)), 0.7);   // fringe points
  if (H.wavy && a > 1.5) lat += Math.sin(lon * 9) * 0.05;
  return lat;
}
// fill the part of the head sphere above the hairline (or a hat line)
function capRegion(c, S, yawFace, latFn, r, fill, detail) {
  const pts = [];
  const N = 72;
  for (let i = 0; i < N; i++) { const lon = -Math.PI + (i / N) * TAU, q = onHead(S, yawFace, lon, latFn(lon), r); pts.push(q); }
  // find the visible arc (dz >= 0), starting just after an invisible sample
  let start = pts.findIndex((q, i) => q.dz >= 0 && pts[(i - 1 + N) % N].dz < 0);
  const hc = proj(S.head), R2 = r * 1.02;
  c.save(); c.beginPath(); c.ellipse(hc[0], hc[1], R2, R2 * 0.99, 0, 0, TAU); c.clip();
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

// ---------------------------------------------------------------- face
function drawFace(c, a, L, S, yawFace, t, P) {
  const C = cols(L), emo = a.act === 'sleep' ? 'sleepy' : (a.emo || 'neutral'), blink = a.blinkAmt || 0;
  const lx = (a.lookX || 0) * 0.08;
  // cheeks
  for (const s of [-1, 1]) { const q = onHead(S, yawFace, s * 0.62, -0.3); if (q.dz > 0.1) { const pp = proj(q.p); ell(c, pp[0], pp[1], 2.4 * Math.max(0.4, q.dz), 1.5, emo === 'angry' ? 'rgba(240,110,110,.6)' : 'rgba(250,140,150,.5)', null); } }
  // eyes: simple dark ovals with a white shine
  for (const s of [-1, 1]) {
    const q = onHead(S, yawFace, s * 0.4 + lx, -0.06); if (q.dz < 0.05) continue;
    const pp = proj(q.p), fx = Math.max(0.35, Math.sqrt(q.dz));
    c.lineCap = 'round';
    if (emo === 'happy' || (emo === 'love' && blink > 0.5)) { c.beginPath(); c.moveTo(pp[0] - 1.9 * fx, pp[1] + 0.7); c.quadraticCurveTo(pp[0], pp[1] - 2.2, pp[0] + 1.9 * fx, pp[1] + 0.7); c.strokeStyle = '#2b2020'; c.lineWidth = 1.2; c.stroke(); continue; }
    if (emo === 'love') { heart(c, pp[0], pp[1] + 0.3, 2.2, '#f0607a', shade('#f0607a', -40), 0.5); continue; }
    if (blink > 0.55 || emo === 'sleepy') { c.beginPath(); c.moveTo(pp[0] - 1.8 * fx, pp[1] + 0.4); c.quadraticCurveTo(pp[0], pp[1] + 1.4, pp[0] + 1.8 * fx, pp[1] + 0.4); c.strokeStyle = '#2b2020'; c.lineWidth = 1.1; c.stroke(); continue; }
    const big = emo === 'surprised' ? 1.18 : 1;
    const rx = 1.75 * fx * big, ry = 2.45 * big * (1 - blink * 0.8);
    ell(c, pp[0], pp[1], rx, ry, '#2b2020', null);
    if (L.eyeCol) ell(c, pp[0], pp[1] + ry * 0.35, rx * 0.72, ry * 0.42, shade(L.eyeCol, -10), null);
    circ(c, pp[0] - rx * 0.3, pp[1] - ry * 0.4, 0.75 * big, '#fff', null);
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
  if (L.glasses) for (const s of [-1, 1]) { const g = onHead(S, yawFace, s * 0.4, -0.06, HR + 0.5); if (g.dz < 0.1) continue; const pp = proj(g.p); c.strokeStyle = L.glasses; c.lineWidth = 0.8; c.beginPath(); c.ellipse(pp[0], pp[1], 3 * Math.max(0.4, g.dz), 3, 0, 0, TAU); c.stroke(); }
}

// ---------------------------------------------------------------- hats
function drawHat(c, L, S, yawFace, t) {
  const h = L.hat; if (!h) return;
  const col = L.hatColor || '#f2d894', hc = proj(S.head);
  const top = proj(add(S.head, [0, HR * 0.97, 0]));
  const brimRing = (y, r, fill, stroke = INK) => { const cy = proj(add(S.head, [0, y, 0])); ell(c, cy[0], cy[1], r, r * SZ * 1.6 + 1, fill, stroke, 1); return cy; };
  if (h === 'nonla') {
    const by = brimRing(HR * 0.3, HR * 1.55, shade(col, -18));
    const apex = proj(add(S.head, [0, HR * 1.45, 0]));
    c.beginPath(); c.moveTo(by[0] - HR * 1.5, by[1] - 1); c.quadraticCurveTo(by[0] - HR * 0.5, apex[1] + HR * 0.5, apex[0], apex[1]); c.quadraticCurveTo(by[0] + HR * 0.5, apex[1] + HR * 0.5, by[0] + HR * 1.5, by[1] - 1); c.quadraticCurveTo(by[0], by[1] + 4, by[0] - HR * 1.5, by[1] - 1);
    c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.strokeStyle = shade(col, -26); c.lineWidth = 0.5; for (let i = 1; i < 4; i++) { const k = i / 4; c.beginPath(); c.moveTo(by[0] - HR * 1.5 * (1 - k), by[1] - (by[1] - apex[1]) * k); c.quadraticCurveTo(by[0], by[1] - (by[1] - apex[1]) * k + 2 * (1 - k), by[0] + HR * 1.5 * (1 - k), by[1] - (by[1] - apex[1]) * k); c.stroke(); }
    return;
  }
  const dome = (lat, fill) => capRegion(c, S, yawFace, () => lat, HR * 1.07, fill, null);
  const outline = () => { c.beginPath(); c.ellipse(hc[0], hc[1], HR * 1.07, HR * 1.06, 0, 0, TAU); };
  if (h === 'cap' || h === 'helmet' || h === 'bandana' || h === 'beanie') {
    const lat = h === 'helmet' ? -0.05 : h === 'beanie' ? 0.05 : h === 'bandana' ? 0.22 : 0.15;
    dome(lat, col);
    c.save(); outline(); c.clip(); capRegion(c, S, yawFace, () => lat + 0.07, HR * 1.07, 'rgba(0,0,0,0)', null); c.restore();
    // outline of the dome edge
    const e1 = [], N = 40; for (let i = 0; i <= N; i++) { const lon = -Math.PI + i / N * TAU, q = onHead(S, yawFace, lon, lat, HR * 1.07); if (q.dz >= 0) e1.push(proj(q.p)); }
    if (e1.length > 1) { c.beginPath(); c.moveTo(e1[0][0], e1[0][1]); for (const p of e1) c.lineTo(p[0], p[1]); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); }
    c.save(); c.beginPath(); c.ellipse(hc[0], hc[1], HR * 1.07, HR * 1.06, 0, Math.PI * 1.05, Math.PI * 1.95); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); c.restore();
    if (h === 'cap') { const f = onHead(S, yawFace, 0, lat + 0.02, HR * 1.1), fp = proj(add(f.p, rotY([0, 0, 5.5], yawFace))); const b = proj(f.p); c.beginPath(); c.ellipse((b[0] + fp[0]) / 2, (b[1] + fp[1]) / 2 + 0.5, 3 + Math.abs(fp[0] - b[0]) * 0.5 + 2, 2 + Math.abs(fp[1] - b[1]) * 0.5, 0, 0, TAU); c.fillStyle = shade(col, -16); c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); circ(c, top[0], top[1] + 1, 1, shade(col, -30), null); }
    if (h === 'beanie') { circ(c, top[0], top[1] - 1.5, 2.8, L.hatRibbon || '#fffaf0', INK, 0.8); }
    if (h === 'helmet') { c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(hc[0] - 3, hc[1] - HR * 0.6, 4, 1.6, -0.3, 0, TAU); c.fill(); }
    if (h === 'bandana') { const k = onHead(S, yawFace, Math.PI, 0.2, HR * 1.08); if (k.dz < 0.2) { const kp = proj(k.p); poly(c, [kp[0], kp[1], kp[0] - 4, kp[1] + 3, kp[0] - 3, kp[1] - 1], col, INK, 0.7); } for (let i = -2; i <= 2; i++) { const q = onHead(S, yawFace, i * 0.35, 0.5, HR * 1.07); if (q.dz > 0.1) { const pp = proj(q.p); circ(c, pp[0], pp[1], 0.5, 'rgba(255,255,255,.9)', null); } } }
    return;
  }
  if (h === 'sunhat' || h === 'bucket' || h === 'boater') {
    const r = h === 'sunhat' ? HR * 1.7 : h === 'boater' ? HR * 1.5 : HR * 1.35;
    const by = brimRing(HR * 0.35, r, h === 'bucket' ? shade(col, -12) : col);
    const crownH = h === 'boater' ? HR * 0.55 : HR * 0.75;
    c.beginPath(); c.moveTo(by[0] - HR * 0.9, by[1]); c.quadraticCurveTo(by[0] - HR * 0.95, by[1] - crownH - 2, by[0], by[1] - crownH - 2.5); c.quadraticCurveTo(by[0] + HR * 0.95, by[1] - crownH - 2, by[0] + HR * 0.9, by[1]); c.closePath();
    c.fillStyle = shade(col, 8); c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
    c.strokeStyle = L.hatRibbon || (h === 'boater' ? '#3f4a5e' : '#f28f7c'); c.lineWidth = 2; c.beginPath(); c.moveTo(by[0] - HR * 0.88, by[1] - 1.6); c.quadraticCurveTo(by[0], by[1] + 0.2, by[0] + HR * 0.88, by[1] - 1.6); c.stroke();
    return;
  }
  if (h === 'chef') { for (const [dx, dy, r] of [[-4.2, 0, 4.4], [4.2, 0, 4.4], [0, -2.4, 4.8]]) circ(c, top[0] + dx, top[1] - 4 + dy, r, '#fffdf8'); c.fillStyle = '#fffdf8'; c.fillRect(top[0] - 6, top[1] - 3, 12, 4.5); c.strokeStyle = INK; c.lineWidth = 0.9; c.strokeRect(top[0] - 6, top[1] - 3, 12, 4.5); return; }
  if (h === 'beret') { ell(c, top[0] + 1.5, top[1] + 1.2, HR * 1.05, 4.2, col, INK, 1); ell(c, top[0] - 1, top[1] + 0.2, 4.4, 1.4, shade(col, 18), null); limb(c, [top[0] + 1, top[1] - 2.6, top[0] + 1.6, top[1] - 4.4], 1, shade(col, -25)); return; }
  if (h === 'crown') { const y = top[1] + 2; c.beginPath(); c.moveTo(top[0] - 6, y); c.lineTo(top[0] - 6.4, y - 5.4); c.lineTo(top[0] - 3, y - 2.6); c.lineTo(top[0], y - 6.6); c.lineTo(top[0] + 3, y - 2.6); c.lineTo(top[0] + 6.4, y - 5.4); c.lineTo(top[0] + 6, y); c.closePath(); c.fillStyle = '#ffd35a'; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); for (const [x, cl] of [[-3.2, '#f36d86'], [0, '#6fbfb0'], [3.2, '#8fb7e0']]) circ(c, top[0] + x, y - 1.4, 0.9, cl, null); return; }
  // decorations that sit on a point of the head
  const onPt = (lon, lat, fn) => { const q = onHead(S, yawFace, lon, lat, HR * 1.08); if (q.dz < -0.35) return; const pp = proj(q.p); c.save(); if (q.dz < 0) c.globalAlpha = 0.9; fn(pp[0], pp[1], Math.max(0.5, Math.abs(q.dz) * 0.5 + 0.5)); c.restore(); };
  if (h === 'bow') onPt(0.9, 0.55, (x, y, k) => { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + s * 5 * k, y - 4.2, x + s * 5 * k, y + 0.6); c.quadraticCurveTo(x + s * 3.6 * k, y + 3.2, x, y); c.fillStyle = col; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); } circ(c, x, y, 1.4, shade(col, -14), INK, 0.7); });
  if (h === 'flower') onPt(0.8, 0.45, (x, y) => { for (let i = 0; i < 5; i++) { const an = i / 5 * TAU; circ(c, x + Math.cos(an) * 1.7, y + Math.sin(an) * 1.7, 1.45, col, INK, 0.5); } circ(c, x, y, 1.1, '#ffd35a', INK, 0.5); });
  if (h === 'catears') for (const s of [-1, 1]) onPt(s * 0.55, 0.7, (x, y) => { poly(c, [x - 2.9, y + 2.4, x + s * 0.6, y - 5, x + 2.9, y + 2.4], col, INK, 0.9); poly(c, [x - 1.4, y + 1.8, x + s * 0.4, y - 2.2, x + 1.4, y + 1.8], '#ffc0d0', null); });
  if (h === 'flowercrown') for (let i = 0; i < 12; i++) { const lon = -Math.PI + i / 12 * TAU; const q = onHead(S, yawFace, lon, 0.42, HR * 1.07); if (q.dz < 0) continue; const pp = proj(q.p); circ(c, pp[0], pp[1], 1.6, ['#ff8fb0', '#fff', '#ffd35a', '#c9a8ff'][i % 4], INK, 0.4); if (i % 2) ell(c, pp[0] + 1.4, pp[1] + 0.6, 1.2, 0.6, '#7fc062', null); }
}

// ---------------------------------------------------------------- body parts
function drawTorso(c, L, S, a, t) {
  const C = cols(L), st = L.topStyle || 'tee';
  const yaw = S.yaw, cy = Math.abs(Math.cos(yaw)), sy = Math.abs(Math.sin(yaw));
  const w = (rx, rz) => Math.sqrt(Math.pow(rx * cy, 2) + Math.pow(rz * sy, 2));
  const top = proj(S.chest), bot = proj(S.waist), neck = proj(S.neck);
  const dress = st === 'dress' || st === 'aodai';
  const wT = w(4.9, 3.4), wB = w(dress ? 7.4 : 5.4, dress ? 5 : 3.8);
  const hemY = dress ? bot[1] + (st === 'aodai' ? 6.5 : 4.2) : bot[1] + 1.2;
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
  if (st === 'floral') for (let i = 0; i < 8; i++) { circ(c, top[0] + ((i * 37) % 11) - 5.5 + Math.sin(yaw) * 2, top[1] + 1 + ((i * 23) % 9), 0.85, L.top2 || '#fff4b8', null); }
  c.restore();
  // front details (only when facing us): collars, buttons, pockets, hood strings
  const facing = Math.cos(yaw);
  const fx = top[0] + Math.sin(yaw) * 3.2 * 0.9, k = Math.max(0.2, facing);
  if (facing > 0.15) {
    if (st === 'hoodie') { c.strokeStyle = '#fff'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(fx - 1.2 * k, top[1] + 0.6); c.lineTo(fx - 1.4 * k, top[1] + 3.6); c.moveTo(fx + 1.2 * k, top[1] + 0.6); c.lineTo(fx + 1.4 * k, top[1] + 3.6); c.stroke(); c.strokeStyle = C.topS; c.beginPath(); c.moveTo(fx - 3.2 * k, bot[1] - 1.8); c.quadraticCurveTo(fx, bot[1] - 2.8, fx + 3.2 * k, bot[1] - 1.8); c.stroke(); }
    else if (st === 'shirt') { poly(c, [fx - 3.2 * k, top[1] - 1.6, fx, top[1] + 1.6, fx - 1 * k, top[1] - 1.6], '#fffdf6', INK, 0.6); poly(c, [fx + 3.2 * k, top[1] - 1.6, fx, top[1] + 1.6, fx + 1 * k, top[1] - 1.6], '#fffdf6', INK, 0.6); for (let i = 0; i < 3; i++) circ(c, fx, top[1] + 2.8 + i * 2, 0.4, C.topS, null); }
    else if (st === 'aodai') { c.strokeStyle = C.topH; c.lineWidth = 0.7; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(fx - 2 * k + i * 1.4 * k, top[1] + 4 + i * 1.5, 1, 0, TAU); c.stroke(); } }
    else { c.strokeStyle = C.topS; c.lineWidth = 0.8; c.beginPath(); c.moveTo(fx - 2.4 * k, top[1] - 1.6); c.quadraticCurveTo(fx, top[1] + 0.8, fx + 2.4 * k, top[1] - 1.6); c.stroke(); }
    if (L.apron) { c.beginPath(); c.moveTo(fx - 3.6 * k, top[1] + 2); c.lineTo(fx + 3.6 * k, top[1] + 2); c.lineTo(fx + 4.6 * k, hemY + 0.6); c.quadraticCurveTo(fx, hemY + 1.6, fx - 4.6 * k, hemY + 0.6); c.closePath(); c.fillStyle = L.apron; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.8; c.stroke(); }
    if (L.lanyard) { c.strokeStyle = L.lanyard; c.lineWidth = 0.6; c.beginPath(); c.moveTo(fx - 2 * k, top[1] - 1.4); c.lineTo(fx, top[1] + 4.4); c.lineTo(fx + 2 * k, top[1] - 1.4); c.stroke(); c.fillStyle = '#fff'; c.fillRect(fx - 1.3, top[1] + 4, 2.6, 3); }
    if (L.camera) { c.strokeStyle = '#3d3d44'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(fx - 3 * k, top[1] - 1); c.lineTo(fx, top[1] + 4); c.lineTo(fx + 3 * k, top[1] - 1); c.stroke(); c.fillStyle = '#4a4a54'; c.fillRect(fx - 2.2, top[1] + 3.6, 4.4, 3); circ(c, fx, top[1] + 5.1, 1, '#9fc9e6', '#2a2a30', 0.5); }
  }
  if (L.scarf) { ell(c, neck[0], neck[1] + 1.4, w(4.8, 3.6), 1.9, L.scarf, INK, 0.8); }
  // neck
  void neck;
}
function drawLeg(c, L, lg, P) {
  const C = cols(L), far = false;
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
  // chunky shoe
  const st = L.shoeStyle || 'sneaker', a0 = proj(lg.ankle), a1 = proj(lg.toe);
  const dx = a1[0] - a0[0], dy = a1[1] - a0[1];
  const cx = (a0[0] + a1[0]) / 2, cyy = (a0[1] + a1[1]) / 2 + 0.3;
  const rx = Math.max(2.4, Math.hypot(dx, dy) / 2 + 1.9), ang = Math.atan2(dy, dx);
  const sc = L.shoe;
  if (st === 'boot' || st === 'rainboot') capsule(c, [add(lg.knee, mul(sub(lg.ankle, lg.knee), 0.45)), lg.ankle], 5.2, sc);
  c.save(); c.translate(cx, cyy); c.rotate(Math.abs(dx) < 0.6 ? 0 : ang * 0.35);
  if (st === 'sandal') { ell(c, 0, 0.5, rx, 1.6, shade(sc, -10)); ell(c, 0, -0.1, rx - 0.6, 1.3, L.skin, null); c.strokeStyle = sc; c.lineWidth = 1; c.beginPath(); c.moveTo(-rx + 0.8, -0.2); c.lineTo(rx - 0.8, -0.2); c.stroke(); }
  else if (st === 'slipper') { ell(c, 0, 0, rx + 0.4, 2.2, sc); ell(c, 0, -1.2, 1.8, 1, '#fff', null); circ(c, -0.9, -2.1, 0.8, sc, INK, 0.4); circ(c, 0.9, -2.1, 0.8, sc, INK, 0.4); }
  else { ell(c, 0, 0, rx, 2.1, sc); c.fillStyle = st === 'sneaker' ? '#fffaf0' : shade(sc, -35); c.fillRect(-rx + 0.6, 1, rx * 2 - 1.2, 0.9); ell(c, -rx * 0.3, -0.8, rx * 0.35, 0.5, 'rgba(255,255,255,.45)', null); if (st === 'rainboot') { c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(-1.2, -4.5, 0.8, 3.4); } }
  c.restore();
  void C; void far; void P;
}
function drawArm(c, L, arm) {
  const C = cols(L);
  capsule(c, [arm.sho, arm.elbow, arm.hand], 3.0, L.armSkin || L.skin);
  const sleeve = L.sleeve ?? 0.55;
  if (sleeve > 0) {
    const tot = UPPER + FORE, cut = sleeve * tot;
    const pts = [arm.sho];
    if (cut <= UPPER) pts.push(add(arm.sho, mul(sub(arm.elbow, arm.sho), cut / UPPER)));
    else { pts.push(arm.elbow, add(arm.elbow, mul(sub(arm.hand, arm.elbow), (cut - UPPER) / FORE))); }
    capsule(c, pts, 3.7, L.top);
  }
  const h = proj(arm.hand);
  circ(c, h[0], h[1], 1.85, L.skin, INK, 0.9);
  void C;
  return h;
}
function drawBackGear(c, L, S) {
  // backpack / guitar / surfboard hang on the back (−z of the chest)
  const back = add(S.chest, rotY([0, -2.2, -3.8], S.yaw)), bp = proj(back);
  if (L.backpack) { c.beginPath(); c.roundRect ? c.roundRect(bp[0] - 4.6, bp[1] - 3, 9.2, 9.4, 3) : c.rect(bp[0] - 4.6, bp[1] - 3, 9.2, 9.4); c.fillStyle = L.backpack; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); c.fillStyle = shade(L.backpack, -18); c.fillRect(bp[0] - 3.2, bp[1] + 2.4, 6.4, 3); }
  if (L.surf) { c.save(); c.translate(bp[0] + 2, bp[1] - 2); c.rotate(0.2); ell(c, 0, -3, 4, 15, L.surf, INK, 1); line(c, 0, -17, 0, 11, '#fff', 1); c.restore(); }
  if (L.guitar) { c.save(); c.translate(bp[0] - 3, bp[1] + 4); c.rotate(-0.6); limb(c, [0, -3, 0, -20], 2, '#8a5f3e'); ell(c, 0, 2, 5, 6, '#e9a24a', INK, 1); ell(c, 0, -3.2, 4, 3.8, '#e9a24a', INK, 1); circ(c, 0, 0, 1.6, '#5a3a24', null); c.restore(); }
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
  shadow(c, 0, 0.4, 9 * sc, 3 * sc, a.sit ? 0.12 : 0.2);
  c.scale(sc * 1.15 * P.squashX, sc * 1.15 * P.squashY);   // model scale
  c.lineJoin = 'round'; c.lineCap = 'round';

  // gather parts with depth, draw back to front
  const parts = [];
  const depth = p => p[2];
  const L2 = { ...L };
  for (const lg of S.legs) parts.push({ z: (depth(lg.knee) + depth(lg.ankle)) / 2 - 0.6, draw: () => drawLeg(c, L, lg, P) });
  for (const arm of S.arms) parts.push({ z: (depth(arm.elbow) + depth(arm.hand)) / 2 + 0.3, draw: () => { const h = drawArm(c, L, arm); if (arm.side > 0) P.hR = h; else P.hL = h; } });
  parts.push({ z: 0, torso: true, draw: () => drawTorso(c, L, S, a, t) });
  if (L.backpack || L.surf || L.guitar) parts.push({ z: -3.8 * facing, draw: () => drawBackGear(c, L, S) });
  // long hair curtain hangs behind the head (in front of the back when seen from behind)
  const H = HAIR[L.hairStyle] || HAIR.bob;
  if (H.curtain) parts.push({ z: -2 * facing - 0.5, draw: () => {
    const hc = proj(S.head), w2 = HR * (0.95 + 0.1 * Math.abs(Math.sin(yaw)));
    c.beginPath(); c.moveTo(hc[0] - w2, hc[1] - 2);
    c.lineTo(hc[0] - w2 - 0.6, hc[1] + H.curtain);
    if (H.wavy) for (let i = 0; i < 4; i++) { const x = hc[0] - w2 + (i + 0.5) * (w2 * 2 / 4); c.quadraticCurveTo(x - w2 / 8, hc[1] + H.curtain + 3, x + w2 / 4, hc[1] + H.curtain); }
    else c.quadraticCurveTo(hc[0], hc[1] + H.curtain + 3.4, hc[0] + w2 + 0.6, hc[1] + H.curtain);
    c.lineTo(hc[0] + w2, hc[1] - 2); c.closePath(); c.fillStyle = L.hair; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  } });
  // pigtails / ponytail
  if (H.tails) for (const s of [-1, 1]) { const base = add(S.head, rotY([s * (HR + 0.4), 1.5, -1.5], yaw)); parts.push({ z: depth(base) - 0.2, draw: () => capsule(c, [base, add(base, rotY([s * 2.2, -6, -0.5], yaw)), add(base, rotY([s * 1.2, -11, -1], yaw))], 4.2, L.hair) }); }
  if (H.pony) { const base = add(S.head, rotY([0, 3, -HR], yaw)); parts.push({ z: depth(base), draw: () => capsule(c, [base, add(base, rotY([0, -5, -2.4], yaw)), add(base, rotY([0, -11, -1.8], yaw))], 4.6, L.hair) }); }
  // neck then head (+ hair + face + hat)
  parts.push({ z: 0.5, head: true, draw: () => {
    const nk = proj(S.neck);
    ell(c, nk[0], nk[1] + 0.6, 2.7, 2.6, cols(L).skinS, INK, 0.8);
    drawHead(c, a, L, S, yaw, t, P, H);
  } });
  parts.sort((p, q) => (p.head ? 1 : 0) - (q.head ? 1 : 0) || p.z - q.z);
  for (const p of parts) p.draw();
  if (P.basket && P.hL) drawBasket(c, P.hL[0], P.hL[1], a.basketItems || 0, t, (a.moving || 0) * Math.sin((a.walkPh || 0) * 2));
  // held item in the right hand (or both hands)
  if (P.held && P.hR) {
    if (P.heldHand === 'both' && P.hL) drawHeld(c, P.held, (P.hL[0] + P.hR[0]) / 2, (P.hL[1] + P.hR[1]) / 2 - 1.5, t, 'front');
    else drawHeld(c, P.held, P.hR[0], P.hR[1], t, facing > -0.2 ? 'front' : 'back', P);
  }
  c.restore();
  void L2;
}

function drawHead(c, a, L, S, yaw, t, P, H) {
  const C = cols(L), hc = proj(S.head);
  // cartoon three-quarter cheat: the face turns toward the camera a bit more than the body
  let yn = yaw; while (yn > Math.PI) yn -= TAU; while (yn < -Math.PI) yn += TAU;
  const yawFace = yn - 0.8 * Math.sin(yn) + (a.headTurn || 0);   // side → about 45°, back stays back
  c.save();
  // head tilt (emotions, thinking)
  if (P.headTilt) { c.translate(hc[0], hc[1] + HR * 0.6); c.rotate(P.headTilt); c.translate(-hc[0], -hc[1] - HR * 0.6); }
  // hair volume behind the head
  if (H !== HAIR.bald) {
    const v = H.vol, jaw = H.jaw ? 3 : 0;
    c.beginPath(); c.ellipse(hc[0], hc[1] - 0.8 + jaw * 0.3, HR * v, HR * v * 0.98 + jaw * 0.4, 0, 0, TAU); c.fillStyle = L.hair; c.fill(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke();
  }
  const covered = ['cap', 'helmet', 'beanie', 'bandana', 'nonla', 'sunhat', 'bucket', 'boater', 'chef'].includes(L.hat);
  if (H.buns && !covered) for (const s of [-1, 1]) { const b = add(S.head, rotY([s * 6.4, HR * 0.78, -1.5], yaw)), bp = proj(b); circ(c, bp[0], bp[1], 4, L.hair); c.strokeStyle = C.hairH; c.lineWidth = 0.8; c.beginPath(); c.arc(bp[0] - 0.8, bp[1] - 0.8, 2.2, 3.4, 4.6); c.stroke(); }
  if (H.topBun && !covered) { const b = add(S.head, rotY([0, HR * 0.95, -2], yaw)), bp = proj(b); circ(c, bp[0], bp[1], 4.2, L.hair); }
  // ears
  for (const s of [-1, 1]) { const q = onHead(S, yawFace, s * 1.5, -0.08); if (q.dz > -0.2) { const pp = proj(q.p); ell(c, pp[0], pp[1], 1.7, 2.3, L.skin, INK, 0.8); } }
  // the head sphere
  c.beginPath(); c.ellipse(hc[0], hc[1], HR, HR * 0.97, 0, 0, TAU);
  const g = c.createRadialGradient(hc[0] - HR * 0.3, hc[1] - HR * 0.3, HR * 0.2, hc[0], hc[1], HR * 1.05);
  g.addColorStop(0, shade(L.skin, 6)); g.addColorStop(1, shade(L.skin, -6));
  c.fillStyle = g; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.05; c.stroke();
  // face (only the visible side)
  drawFace(c, a, L, S, yawFace, t, P);
  // hair cap with fringe
  if (H !== HAIR.bald) {
    capRegion(c, S, yawFace, lon => hairLat(H, lon), HR * 1.04, L.hair, pts => {
      // sheen and a few strand lines
      c.strokeStyle = C.hairH; c.lineWidth = 1.2; c.globalAlpha = 0.55;
      c.beginPath(); c.ellipse(hc[0] - 1.5, hc[1] - HR * 0.35, HR * 0.6, HR * 0.38, 0, Math.PI * 1.15, Math.PI * 1.6); c.stroke(); c.globalAlpha = 1;
      c.strokeStyle = C.hairS; c.lineWidth = 0.6;
      for (const q of pts) { if (q.dz < 0.3 || Math.random() > 0) continue; }
    });
    // outline the hairline so the fringe reads clearly
    const line2 = []; for (let i = 0; i <= 60; i++) { const lon = -Math.PI + i / 60 * TAU, q = onHead(S, yawFace, lon, hairLat(H, lon), HR * 1.04); if (q.dz >= 0.02) line2.push(proj(q.p)); else if (line2.length) { strokeLine(c, line2); line2.length = 0; } }
    if (line2.length) strokeLine(c, line2);
    if (H.spikes && !covered) for (let i = -2; i <= 2; i++) { const q = onHead(S, yawFace, i * 0.4, 0.9, HR * 1.05); if (q.dz < -0.3) continue; const pp = proj(q.p); poly(c, [pp[0] - 2.2, pp[1] + 1.5, pp[0] + i * 0.6, pp[1] - 3.5, pp[0] + 2.2, pp[1] + 1.5], L.hair, INK, 0.8); }
  }
  drawHat(c, L, S, yawFace, t);
  c.restore();
}
// A little woven market basket; groceries pile up as you shop.
function drawBasket(c, x, y, n, t, swing) {
  c.save(); c.translate(x, y); c.rotate(swing * 0.12);
  c.strokeStyle = INK; c.lineWidth = 2.4; c.beginPath(); c.arc(0, 4, 5, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
  c.strokeStyle = '#c98f5a'; c.lineWidth = 1.2; c.stroke();
  const fruit = ['#ffa53a', '#79b85c', '#e8584e', '#f7de8c', '#9fd67a', '#f4a9b8'];
  for (let i = 0; i < Math.min(6, n); i++) circ(c, -3.4 + (i % 3) * 3.4, 3.6 - Math.floor(i / 3) * 2.2, 1.8, fruit[i], INK, 0.5);
  poly(c, [-6.2, 3.6, 6.2, 3.6, 4.8, 10.2, -4.8, 10.2], '#d9a066', INK, 0.9);
  c.strokeStyle = '#b77a4f'; c.lineWidth = 0.6;
  for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-5.8 + k * 0.4, 5.6 + k * 1.6); c.lineTo(5.8 - k * 0.4, 5.6 + k * 1.6); c.stroke(); }
  for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(k * 2.3, 3.8); c.lineTo(k * 1.8, 10); c.stroke(); }
  box2(c, -6.6, 2.8, 13.2, 1.6, '#e3b77f');
  c.restore();
}
function box2(c, x, y, w, h, fill) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 0.8) : c.rect(x, y, w, h); c.fillStyle = fill; c.fill(); c.strokeStyle = INK; c.lineWidth = 0.7; c.stroke(); }
function strokeLine(c, pts) { if (pts.length < 2) return; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]); c.strokeStyle = INK; c.lineWidth = 0.9; c.stroke(); }

// Where emotes should float above this character.
export const villagerTop = L => -(HEAD_Y + HR + 6) * (L?.scale || 1);
export { clamp };

// Draw a character framed on their face: head centred at (cx, cy), about
// `size` across. Used for portraits and the little queue faces.
export function drawVillagerHead(c, cx, cy, size, a, t) {
  const sc = (a.look?.scale || 1) * 1.15, k = size / (HR * 2.3 * sc);
  c.save(); c.translate(cx, cy + HEAD_Y * sc * k); c.scale(k, k);
  drawVillager(c, { dir: 'down', moving: 0, walkPh: 0, seed: 1, blinkAmt: 0, emo: 'happy', ...a, portrait: true }, t);
  c.restore();
}
