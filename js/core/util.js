// Small shared helpers: math, easing, seeded randomness, colour shading, promises.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const approach = (v, target, step) => (v < target ? Math.min(target, v + step) : Math.max(target, v - step));
// Frame-rate independent exponential smoothing: k is "fraction per second remaining".
export const damp = (a, b, rate, dt) => lerp(a, b, 1 - Math.exp(-rate * dt));

export const ease = {
  linear: t => t,
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: t => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
};

// Mulberry32 — deterministic per-seed randomness for looks and scenery.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
export const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const chance = p => Math.random() < p;
export const choice = arr => arr[Math.floor(Math.random() * arr.length)];

const shadeCache = new Map();
export function shade(hex, amt) {
  const key = hex + amt;
  let v = shadeCache.get(key);
  if (v) return v;
  let hx = hex.slice(1); if (hx.length === 3) hx = hx[0] + hx[0] + hx[1] + hx[1] + hx[2] + hx[2];
  const n = parseInt(hx, 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  v = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  shadeCache.set(key, v);
  return v;
}
export function mix(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const r = Math.round(lerp(a >> 16, b >> 16, t)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t)), bl = Math.round(lerp(a & 255, b & 255, t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}
export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export const nextFrame = () => new Promise(r => requestAnimationFrame(r));

// Money is stored in thousands of đồng ("k"), the way Vietnamese menus show it.
export function money(k) {
  const v = Math.round(k);
  if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1).replace('.0', '') + 'B₫';
  if (Math.abs(v) >= 10000) return (v / 1000).toFixed(1).replace('.0', '') + 'M₫';
  return v.toLocaleString('en-US') + 'k';
}
export const pad2 = n => String(n).padStart(2, '0');
export function clock(minutes) {
  const m = Math.floor(minutes) % 1440;
  return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
}
export const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Point in polygon (flat [x0,y0,x1,y1,...] array).
export function inPoly(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 2; i < poly.length; j = i, i += 2) {
    const xi = poly[i], yi = poly[i + 1], xj = poly[j], yj = poly[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// Closed Catmull-Rom spline through [x,y] control points → flat point list.
export function smoothLoop(pts, seg = 8) {
  const out = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      out.push(
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      );
    }
  }
  return out;
}
// Open Catmull-Rom through points → flat list (for rivers/paths).
export function smoothLine(pts, seg = 8) {
  const out = [], n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      out.push(
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      );
    }
  }
  out.push(pts[n - 1][0], pts[n - 1][1]);
  return out;
}
// Distance from point to polyline (flat list).
export function distToLine(line, x, y) {
  let best = Infinity;
  for (let i = 0; i < line.length - 2; i += 2) {
    const ax = line[i], ay = line[i + 1], bx = line[i + 2], by = line[i + 3];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((x - ax) * dx + (y - ay) * dy) / l2, 0, 1);
    const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
    if (d < best) best = d;
  }
  return best;
}

// Tiny event bus.
export class Emitter {
  constructor() { this.h = new Map(); }
  on(ev, fn) { (this.h.get(ev) || this.h.set(ev, new Set()).get(ev)).add(fn); return () => this.h.get(ev)?.delete(fn); }
  emit(ev, ...a) { this.h.get(ev)?.forEach(fn => { try { fn(...a); } catch (e) { console.error('[bus]', ev, e); } }); }
}
export const bus = new Emitter();
