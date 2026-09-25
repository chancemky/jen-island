// Actors: anything that walks, blinks and emotes. Holds animation state that
// the renderers (gfx/character.js, gfx/cat.js) read every frame.

import { clamp, rand, TAU } from '../core/util.js';
import { drawHuman, drawEmote } from '../gfx/character.js';
import { drawCat } from '../gfx/cat.js';

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
    if (this._resolve) this._resolve(false);
    return new Promise(res => { this._resolve = res; });
  }
  stop() { this.path = null; if (this._resolve) { const r = this._resolve; this._resolve = null; r(false); } }
  face(d) {
    if (typeof d === 'object') { const dx = d.x - this.x, dy = d.y - this.y; d = Math.abs(dx) > Math.abs(dy) * 0.9 ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down'; }
    if (d !== this.dir) { this.dir = d; this.turnT = 0.14; }
  }
  setEmo(e, dur = 0) { this.emo = e; this.emoT = dur; }
  showEmote(type, dur = 1.6) { this.emote = { type, t: 0, dur }; }
  doHop(v = 95) { if (this.hop <= 0.01) { this.hopV = v; this.squash = 0.6; } }
  setAct(act, held = null) { if (this.act !== act) this.actT = 0; this.act = act; this.held = held; }

  update(dt, t) {
    // path following
    if (this.path && this.path.length) {
      const [tx, ty] = this.path[0];
      const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
      const step = this.pathSpeed * dt;
      if (d <= step || d < 0.5) {
        this.x = tx; this.y = ty; this.path.shift();
        if (!this.path.length) { this.path = null; const r = this._resolve; this._resolve = null; if (r) r(true); }
      } else {
        this.x += (dx / d) * step; this.y += (dy / d) * step;
        this.setDirFromVel(dx, dy);
        this.walkPh += step * 0.21;
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
    else drawHuman(c, this, t);
    c.restore();
  }
  drawEmote(c, t) {
    if (!this.emote || !this.visible) return;
    const top = this.kind === 'cat' ? -44 : -46 * (this.look?.scale || 1) - (this.look?.hat === 'nonla' || this.look?.hat === 'chef' ? 6 : 0);
    drawEmote(c, this.emote.type, this.x + 9, this.y + top - this.hop, this.emote.t / this.emote.dur, t);
  }
}

export const DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
export { TAU };
