// Actors: anything that walks, blinks and emotes. Holds animation state that
// the renderers (gfx/character.js, gfx/cat.js) read every frame.

import { clamp, rand, TAU } from '../core/util.js';
import { drawHuman, drawEmote } from '../gfx/character.js';
import { drawCat } from '../gfx/cat.js';
import { G } from '../systems/state.js';
import { drawLying } from '../gfx/hammock.js';

let nextId = 1;

export class Actor {
  constructor(o = {}) {
    this.id = o.id || 'a' + nextId++;
    this.kind = o.kind || 'human';
    this.look = o.look;
    this.name = o.name || '';
    this.x = o.x || 0; this.y = o.y || 0;
    this.dir = o.dir || 'down';
    this.speed = o.speed || 62;
    this.seed = o.seed ?? Math.random() * 100;
    this.moving = 0; this.walkPh = 0;
    this.blinkT = rand(1, 4); this.blinkAmt = 0; this._blink = 0;
    this.emo = 'neutral'; this.emoT = 0;
    this.talking = false;
    this.act = null; this.actT = 0; this.held = null;
    this.hop = 0; this.hopV = 0; this.squash = 0; this.turnT = 0;
    this.headTilt = 0; this.tiltTarget = 0;
    this.lookX = 0; this.lookY = 0;
    this.emote = null;
    this.path = null; this._resolve = null;
    this.sit = false;
    this.visible = true;
    this.earTwitch = 0; this.twitchT = rand(2, 6);
    this.data = o.data || {};
    this.scene = o.scene || null;
    this.solid = o.solid ?? false;
    this.radius = o.radius || 6;
    this.tint = null;
  }

  // ---- commands (return promises so cutscenes can await them)
  walkTo(points, opt = {}) {
    if (!Array.isArray(points[0])) points = [points];
    this.path = points.map(p => [p[0], p[1]]);
    this.pathSpeed = opt.speed || this.speed;
    // a walk never hangs: if it takes much longer than it should (blocked, or its scene isn't updating), it snaps to the end
    let len = 0, px = this.x, py = this.y; for (const [x, y] of this.path) { len += Math.hypot(x - px, y - py); px = x; py = y; }
    this._walkDeadline = performance.now() + (len / Math.max(10, this.pathSpeed)) * 2000 + 2500;
    if (this._resolve) this._resolve(false);
    return new Promise(res => { this._resolve = res; });
  }
  finishWalk() { if (!this.path) return; const last = this.path[this.path.length - 1]; if (last) { this.x = last[0]; this.y = last[1]; } this.path = null; const r = this._resolve; this._resolve = null; r?.(true); }
  stop() { this.path = null; if (this._resolve) { const r = this._resolve; this._resolve = null; r(false); } }
  face(d) {
    if (typeof d === 'object') { const dx = d.x - this.x, dy = d.y - this.y; d = Math.abs(dx) > Math.abs(dy) * 0.9 ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down'; }
    if (d !== this.dir) { this.dir = d; this.turnT = 0.14; }
  }
  setEmo(e, dur = 0) { this.emo = e; this.emoT = dur; }
  showEmote(type, dur = 1.6) { this.emote = { type, t: 0, dur }; }
  doHop(v = 95) { if (this.hop <= 0.01) { this.hopV = v; this.squash = 0.6; } }
  setAct(act, held = null) { if (this.act !== act) this.actT = 0; this.act = act; this.held = held; }

  update(dt, t, scene) {
    // path following
    if (this.path && this.path.length) {
      // (a waypoint someone is standing on is skipped, not circled — unless it's where you're going)
      if (scene && this.path.length > 1 && (this.data?.npc || this.data?.tourist)) { const [wx, wy] = this.path[0]; if (scene.actors.some(o => o !== this && !o.path && o.visible !== false && Math.hypot(o.x - wx, o.y - wy) < 12)) this.path.shift(); }
      const [tx, ty] = this.path[0];
      let dx = tx - this.x, dy = ty - this.y; const d = Math.hypot(dx, dy);
      const step = this.pathSpeed * dt;
      // islanders and visitors walk round people instead of through them
      if (scene && (this.data?.npc || this.data?.tourist) && d > step) { const v = steerAround(this, scene, dx / d, dy / d, d); if (v) { dx = v[0] * d; dy = v[1] * d; } }
      // (a waypoint on the way counts as reached a few steps early, so two people heading
      //  through the same corner don't circle it trying to give each other room)
      if (d <= step || d < 0.5 || (this.path.length > 1 && d < 8 && (this.data?.npc || this.data?.tourist))) {
        if (d <= step || d < 0.5) { this.x = tx; this.y = ty; }
        this.path.shift();
        if (!this.path.length) { this.path = null; const r = this._resolve; this._resolve = null; if (r) r(true); }
      } else {
        if (this.sit && this.kind !== 'pet') { this.sit = false; this.seatH = undefined; if (this.act === 'ride') this.act = null; }   // walking always means standing up
        this.x += (dx / d) * step; this.y += (dy / d) * step;
        this.moveAng = Math.atan2(dx, dy);   // body turns to face where it walks (8+ directions)
        this.setDirFromVel(dx, dy);
        this.walkPh += step * 0.18;
        this.moving = Math.min(1, this.moving + dt * 8);
      }
    }
    if (!this.path && !this._driven) this.moving = Math.max(0, this.moving - dt * 7);
    this._driven = false;
    this.animate(dt, t);
  }

  // Direction with hysteresis so diagonal walking doesn't flicker.
  setDirFromVel(vx, vy) {
    const ax = Math.abs(vx), ay = Math.abs(vy);
    if (ax < 0.01 && ay < 0.01) return;
    this.moveAng = Math.atan2(vx, vy);   // the body always turns toward where it's going (fixes side-stepping in follow scenes)
    const horiz = this.dir === 'left' || this.dir === 'right';
    let d;
    if (horiz ? ax > ay * 0.7 : ax > ay * 1.35) d = vx < 0 ? 'left' : 'right';
    else d = vy < 0 ? 'up' : 'down';
    this.face(d);
  }

  animate(dt, t) {
    this.t = t;
    // blink (with occasional double blink)
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this._blink = 0.13; this.blinkT = Math.random() < 0.2 ? 0.22 : rand(2, 5); }
    if (this._blink > 0) { this._blink -= dt; const k = 1 - Math.abs(this._blink / 0.13 - 0.5) * 2; this.blinkAmt = clamp(k * 1.4, 0, 1); }
    else this.blinkAmt = 0;
    // hop physics
    if (this.hopV || this.hop > 0) {
      this.hop += this.hopV * dt; this.hopV -= 520 * dt;
      if (this.hop <= 0) { this.hop = 0; this.hopV = 0; this.squash = 0.8; }
    }
    this.squash = Math.max(0, this.squash - dt * 5);
    this.turnT = Math.max(0, this.turnT - dt);
    this.actT += dt;
    if (this.emoT > 0) { this.emoT -= dt; if (this.emoT <= 0) this.emo = 'neutral'; }
    this.headTilt += (this.tiltTarget - this.headTilt) * Math.min(1, dt * 8);
    if (this.emote) { this.emote.t += dt; if (this.emote.t >= this.emote.dur) this.emote = null; }
    if (this.kind === 'cat') {
      this.twitchT -= dt;
      if (this.twitchT <= 0) { this.earTwitch = 1; this.twitchT = rand(1.5, 5); }
      this.earTwitch = Math.max(0, this.earTwitch - dt * 6);
    }
  }

  draw(c, t) {
    if (!this.visible) return;
    c.save();
    c.translate(Math.round(this.x * 4) / 4, Math.round(this.y * 4) / 4);
    if (this.alpha !== undefined) c.globalAlpha = this.alpha;
    if (this.kind === 'cat') drawCat(c, this, t);
    else if (this.kind === 'pet') this.petDraw?.(c, this, t);
    else if (this.lie?.prop) drawLying(c, this, t);        // lying in a hammock (gfx/hammock.js)
    else drawHuman(c, this, t);
    c.restore();
  }
  drawEmote(c, t) {
    if (!this.emote || !this.visible) return;
    const top = this.kind === 'pet' ? -26 : this.kind === 'cat' ? -44 : -50 * (this.look?.scale || 1) - (this.look?.hat === 'nonla' || this.look?.hat === 'chef' || this.look?.hat === 'sunhat' ? 6 : 0);
    drawEmote(c, this.emote.type, this.x + 9, this.y + top - this.hop, this.emote.t / this.emote.dur, t);
  }
}

// Steering round other people: anyone standing or walking in your way (within a couple of
// steps ahead and closer than a body-width to your line) nudges you sideways, away from
// them. When two people meet head on, both keep to their own right, so they pass instead of
// bumping. Never steers you into a wall or the water, and lets you walk straight onto
// your own spot at the end.
const LOOK = 40, CLEAR = 21;
function steerAround(a, scene, ux, uy, remaining) {
  const lastLeg = !a.path || a.path.length <= 1;
  if (lastLeg && remaining < 14) return null;
  let sx = 0, sy = 0;
  const px = -uy, py = ux;                                  // your left
  for (const o of scene.actors) {
    if (o === a || o.visible === false || o.kind === 'pet' || o.kind === 'cat' && o !== G.meo) continue;
    const ox = o.x - a.x, oy = o.y - a.y, od = Math.hypot(ox, oy);
    if (od > LOOK || od < 0.01) continue;
    if (od < 14) { sx -= ox / od * (1 - od / 14) * 1.2; sy -= oy / od * (1 - od / 14) * 1.2; }   // personal space: never walk inside someone
    const ahead = ox * ux + oy * uy; if (ahead < -2) continue;
    if (lastLeg && ahead > remaining + 6) continue;          // they're past where you're going
    const lat = ox * px + oy * py;                           // + = on your left
    if (Math.abs(lat) >= CLEAR) continue;
    const side = Math.abs(lat) < 1.5 ? -1 : -Math.sign(lat);   // step away from them; dead ahead: keep right
    const w = (1 - Math.max(0, ahead) / LOOK) * (1 - Math.abs(lat) / CLEAR) * (od < CLEAR ? 2 : 1);
    sx += px * side * w; sy += py * side * w;
  }
  if (!sx && !sy) return null;
  let vx = ux + sx * 1.6, vy = uy + sy * 1.6; const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
  if (scene.canStand && !scene.canStand(a.x + vx * 6, a.y + vy * 6, 4)) return null;
  return [vx, vy];
}

export const DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
export { TAU };
