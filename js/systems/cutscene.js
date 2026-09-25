// Cutscene toolkit. Story scripts are plain async functions that await these
// helpers, so they read top-to-bottom like a screenplay. Player control is
// suspended while a scene runs and always restored, even if a step throws.

import { G } from './state.js';
import { cam } from '../world/render.js';
import { sleep, dist, bus } from '../core/util.js';
import { say, ask, closeDialog } from '../ui/dialogue.js';
import { releaseJoystick } from '../core/input.js';
import { sfx } from '../core/audio.js';

const cinema = document.getElementById('cinema');
let running = null;
const queue = [];

export const cs = {
  get active() { return !!running; },
  async run(name, fn, { bars = true, keepHud = false } = {}) {
    if (running) { await new Promise(r => queue.push(r)); }
    running = name;
    const pl = G.player;
    pl.control = false; releaseJoystick();
    document.body.classList.add('cutscene');
    if (bars) cinema.classList.remove('hidden'), requestAnimationFrame(() => cinema.classList.add('on'));
    if (!keepHud) document.body.classList.add('hide-controls');
    bus.emit('cutscene', true);
    try { await fn(); }
    catch (e) { console.error('[cutscene]', name, e); }
    finally {
      closeDialog();
      cam.override = null; cam.follow = pl; cam.targetZoomMul = 1;
      stopFollow();
      pl.control = true;
      cinema.classList.remove('on'); setTimeout(() => { if (!running) cinema.classList.add('hidden'); }, 600);
      document.body.classList.remove('cutscene', 'hide-controls');
      running = null;
      bus.emit('cutscene', false);
      G.markDirty?.(true);
      const next = queue.shift(); if (next) next();
    }
  },
};

export const wait = s => sleep(s * 1000);
export { say, ask };

// Camera: pan to a point (or actor) with optional zoom; returns when settled.
export async function camTo(x, y, { zoom = 1, rate = 3, hold = 0 } = {}) {
  if (typeof x === 'object') { y = x.y - 18; x = x.x; }
  cam.override = { x, y, zoom, rate };
  const start = performance.now();
  while (performance.now() - start < 3000) {
    if (Math.hypot(cam.x - x, cam.y - y) < 3 && Math.abs(cam.zoomMul - zoom) < 0.02) break;
    await sleep(30);
  }
  if (hold) await wait(hold);
}
export function camFollow(actor, zoom = 1) { cam.override = null; cam.follow = actor; cam.targetZoomMul = zoom; }

// Walk an actor to a point along the scene's nav graph (outdoors) or directly.
export async function walk(actor, x, y, { speed, direct = false } = {}) {
  const sc = G.scene;
  let pts = [[x, y]];
  if (!direct && sc?.nav?.nodes.length && dist(actor.x, actor.y, x, y) > 60) {
    pts = sc.nav.path(actor.x, actor.y, x, y);
    // skip the first node if we're already past it
    if (pts.length > 1 && dist(actor.x, actor.y, pts[1][0], pts[1][1]) < dist(pts[0][0], pts[0][1], pts[1][0], pts[1][1])) pts.shift();
  }
  await actor.walkTo(pts, { speed: speed || actor.speed });
}
export function face(a, target) { a.face(target); }
export function emote(a, type, dur = 1.4) { a.showEmote(type, dur); if (type === '!') sfx('pop'); }
export async function hop(a, times = 1) { for (let i = 0; i < times; i++) { a.doHop(); await wait(0.42); } }

// ---------------------------------------------------------------- follow the leader
// The player walks the leader's breadcrumb trail, staying a comfortable step behind.
let follow = null;
export function startFollow(leader, gap = 30) {
  follow = { leader, gap, crumbs: [[leader.x, leader.y]] };
  G.player.control = false;
}
export function stopFollow() { if (follow) { G.player.path = null; } follow = null; }
export function updateFollow(dt) {
  if (!follow) return;
  const { leader, crumbs, gap } = follow, pl = G.player;
  const lastC = crumbs[crumbs.length - 1];
  if (dist(lastC[0], lastC[1], leader.x, leader.y) > 6) crumbs.push([leader.x, leader.y]);
  // distance along trail from player to leader
  let target = null;
  let total = 0;
  for (let i = crumbs.length - 1; i > 0; i--) {
    total += dist(crumbs[i][0], crumbs[i][1], crumbs[i - 1][0], crumbs[i - 1][1]);
    if (total >= gap) { target = crumbs[i - 1]; break; }
  }
  if (!target) { pl.moving = Math.max(0, pl.moving - dt * 6); return; }
  const dx = target[0] - pl.x, dy = target[1] - pl.y, d = Math.hypot(dx, dy);
  if (d < 1.5) { pl.moving = Math.max(0, pl.moving - dt * 6); return; }
  const sp = Math.min(leader.pathSpeed || leader.speed, 110) * (d > 40 ? 1.3 : 1);
  const step = Math.min(d, sp * dt);
  pl.x += dx / d * step; pl.y += dy / d * step;
  pl.setDirFromVel(dx, dy);
  pl.walkPh += step * 0.21; pl.moving = Math.min(1, pl.moving + dt * 8); pl._driven = true;
  pl.vx = dx / d * sp; pl.vy = dy / d * sp;
  // trim crumbs already passed
  while (crumbs.length > 2 && dist(crumbs[0][0], crumbs[0][1], pl.x, pl.y) < 8) crumbs.shift();
}

export function caption(main, sub) {
  const el = document.getElementById('caption');
  if (!main) { el.classList.remove('on'); return; }
  el.innerHTML = `${main}${sub ? `<small>${sub}</small>` : ''}`;
  el.classList.add('on');
}
export { closeDialog };
