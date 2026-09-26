// Player movement: analog joystick → smoothed velocity → collision-aware move.

import { damp, clamp } from '../core/util.js';
import { moveVector } from '../core/input.js';
import { Actor } from '../world/actor.js';
import { G } from './state.js';

export const WALK_SPEED = 96;

export class Player extends Actor {
  constructor(look) {
    super({ id: 'player', kind: 'human', look, speed: WALK_SPEED, radius: 6 });
    this.vx = 0; this.vy = 0;
    this.control = true;     // false during cutscenes
    this.stepT = 0;
  }
  // Called every frame before Actor.update.
  drive(dt, scene, sfx) {
    if (this.seat) { this.vx = this.vy = 0; this.moving = 0; return; }   // seated: the joystick stands you up (systems/seats.js)
    if (!this.control || this.path) { this.vx = damp(this.vx, 0, 16, dt); this.vy = damp(this.vy, 0, 16, dt); if (this.path) { this.vx = 0; this.vy = 0; } return; }
    const [ix, iy, m] = moveVector();
    // ease-in to feel responsive but not twitchy
    const k = m > 0 ? 0.45 + 0.55 * m : 0;
    const speed = WALK_SPEED * (G.runtime?.sleepy ? 0.72 : 1);
    const tx = ix * speed * (k > 0 ? 1 : 0) * Math.min(1, m * 1.25), ty = iy * speed * Math.min(1, m * 1.25);
    this.vx = damp(this.vx, tx, m > 0 ? 14 : 18, dt);
    this.vy = damp(this.vy, ty, m > 0 ? 14 : 18, dt);
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 2) {
      const [nx, ny] = scene.moveWithCollision(this.x, this.y, this.vx * dt, this.vy * dt, this.radius);
      const moved = Math.hypot(nx - this.x, ny - this.y);
      this.x = nx; this.y = ny;
      if (m > 0.05) this.setDirFromVel(ix, iy);
      this.walkPh += moved * 0.21;
      this.moving = clamp(sp / WALK_SPEED * 1.2, 0, 1);
      this._driven = true;
      this.stepT += moved;
      if (this.stepT > 26) { this.stepT = 0; sfx?.('step'); }
      if (moved < 0.02 * sp * dt) { this.vx *= 0.5; this.vy *= 0.5; }
    }
  }
}
