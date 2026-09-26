// Sitting: every bench, chair, stool, sofa and floor cushion has seat spots.
// Walk up, tap Sit: the character faces the seat, turns around, does a little
// hop and lands butt-first with a squash. Move the joystick (or tap Stand) to
// hop back off.

import { G } from './state.js';
import { dist, sleep } from '../core/util.js';
import { sfx } from '../core/audio.js';

// seat spots per prop kind: offset from the prop's base, and the seat height
const KINDS = {
  bench: [{ dx: -9, dy: 1.5, h: 11 }, { dx: 9, dy: 1.5, h: 11 }],
  stool: [{ dx: 0, dy: 1, h: 7.5 }],
  chair: [{ dx: 0, dy: 1.5, h: 10 }],
  chair_wood: [{ dx: 0, dy: 1.5, h: 10 }],
  sofa: [{ dx: -12, dy: 1.5, h: 12 }, { dx: 12, dy: 1.5, h: 12 }],
  cushion: [{ dx: 0, dy: 1, h: 4 }],
  lounger: [{ dx: -5, dy: 1, h: 5.5 }],
  rattanSet: [{ dx: -16, dy: 1.5, h: 10.5 }, { dx: 16, dy: 1.5, h: 10.5 }],
};
function kindOf(p) { return p.homeFurn ? p.homeFurn.id : p.kind; }

export function seatsIn(scene) {
  if (!scene || scene.id === 'restaurant') return [];      // restaurant chairs belong to the guests
  const out = [];
  for (const p of scene.props) {
    const k = kindOf(p), defs = KINDS[k];
    if (!defs || p.noBack || p.hidden?.()) continue;
    const x = p.homeFurn ? p.homeFurn.x : p.x, y = p.homeFurn ? p.homeFurn.y : p.y;
    for (const d of defs) out.push({ x: x + d.dx, y: y + d.dy, h: d.h, prop: p });
  }
  return out;
}
function taken(scene, s) { return scene.actors.some(a => a !== G.player && a.sit && dist(a.x, a.y, s.x, s.y) < 7); }
export function nearestSeat(scene, x, y, r = 22) {
  let best = null, bd = r;
  for (const s of seatsIn(scene)) { const d = Math.min(dist(x, y, s.x, s.y), dist(x, y, s.x, s.y + 12)); if (d < bd && !taken(scene, s)) { bd = d; best = s; } }
  return best;
}

// Hop an actor onto a seat: butt first, little squash on landing.
export async function hopOnto(a, s) {
  const x0 = a.x, y0 = a.y, T = 0.42, t0 = performance.now();
  a.face('down');
  sfx('hop');
  while (true) {
    const k = Math.min(1, (performance.now() - t0) / 1000 / T), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    a.x = x0 + (s.x - x0) * e; a.y = y0 + (s.y - y0) * e;
    a.hop = Math.sin(k * Math.PI) * 9;
    if (k > 0.45 && !a.sit) { a.sit = true; a.seatH = s.h; }
    if (k >= 1) break;
    await sleep(16);
  }
  a.hop = 0; a.squash = 0.9; a.x = s.x; a.y = s.y;
  sfx('pop');
}
export async function hopOff(a, s) {
  const x0 = a.x, y0 = a.y, tx = s.x, ty = s.y + 13, T = 0.34, t0 = performance.now();
  sfx('hop');
  while (true) {
    const k = Math.min(1, (performance.now() - t0) / 1000 / T);
    a.x = x0 + (tx - x0) * k; a.y = y0 + (ty - y0) * k; a.hop = Math.sin(k * Math.PI) * 7;
    if (k > 0.25 && a.sit) { a.sit = false; a.seatH = undefined; }
    if (k >= 1) break;
    await sleep(16);
  }
  a.hop = 0; a.squash = 0.6;
}

// ---- the player
let busy = false;
export const isSeated = () => !!G.player?.seat;
export async function sitDown(s) {
  const pl = G.player; if (busy || pl.seat) return;
  busy = true;
  try {
    pl.control = false;
    // stand in front of the seat, face it, then turn around and hop up
    await pl.walkTo([[s.x, s.y + 12]], { speed: 80 });
    pl.face('up'); await sleep(120);
    pl.face('down'); await sleep(90);
    await hopOnto(pl, s);
    pl.seat = s; pl.setEmo('happy', 1.2);
  } finally { busy = false; }
}
export async function standUp() {
  const pl = G.player; if (busy || !pl.seat) return;
  busy = true;
  try {
    const s = pl.seat; pl.seat = null;
    await hopOff(pl, s);
  } finally { pl.control = true; busy = false; }
}
// while seated: any real joystick push gets you up
export function updateSeat(mag) { if (isSeated() && !busy && mag > 0.5) standUp(); }
