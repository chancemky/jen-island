// Renderer + camera + world-space effects.

import { G } from '../systems/state.js';
import { clamp, damp, lerp, TAU, rand, invLerp } from '../core/util.js';
import { LIGHT, glows } from '../gfx/props.js';
import { INK, ell, circ, text, heart, star, line } from '../gfx/draw.js';
import { drawSpark } from '../gfx/character.js';
import { drawIcon } from '../gfx/food.js';

// ---------------------------------------------------------------- camera
export const cam = {
  x: 0, y: 0, zoom: 1.3, baseZoom: 1.3, zoomMul: 1, targetZoomMul: 1,
  follow: null, fx: 0, fy: 0, override: null, shake: 0, lead: [0, 0],
  view: { x: 0, y: 0, w: 0, h: 0 },
  snap(x, y) { this.x = x; this.y = y; },
  update(dt, scene, cssW, cssH) {
    let tx, ty;
    if (this.override) { tx = this.override.x; ty = this.override.y; }
    else if (this.follow) {
      // look slightly ahead in the direction of travel
      const f = this.follow;
      this.lead[0] = damp(this.lead[0], (f.vx || 0) * 0.35, 3, dt);
      this.lead[1] = damp(this.lead[1], (f.vy || 0) * 0.3, 3, dt);
      tx = f.x + this.lead[0]; ty = f.y - 18 + this.lead[1];
    } else { tx = this.x; ty = this.y; }
    const rate = this.override?.rate ?? 6;
    this.x = damp(this.x, tx, rate, dt); this.y = damp(this.y, ty, rate, dt);
    this.zoomMul = damp(this.zoomMul, this.override?.zoom ?? this.targetZoomMul, 3.2, dt);
    let z = this.baseZoom * (scene.zoomBias || 1);
    // interiors fit the room's width, but never so small that characters get tiny
    if (scene.fitW) z = Math.min(z, Math.max(cssW / scene.fitW, this.baseZoom * 0.8));
    z *= this.zoomMul;
    this.zoom = z;
    const vw = cssW / z, vh = cssH / z;
    // clamp to the scene (interiors centre when smaller than the screen)
    const pad = scene.kind === 'island' ? 120 : 30;
    const minX = vw / 2 - pad, maxX = scene.w - vw / 2 + pad, minY = vh / 2 - pad, maxY = scene.h - vh / 2 + pad + (scene.bottomPad || 0);
    let cx = minX > maxX ? scene.w / 2 : clamp(this.x, minX, maxX);
    let cy = minY > maxY ? scene.h / 2 + (scene.bottomPad || 0) / 2 : clamp(this.y, minY, maxY);
    this.x = cx; this.y = cy;
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt * 3); cx += (Math.random() - 0.5) * this.shake * 6; cy += (Math.random() - 0.5) * this.shake * 6; }
    this.view = { x: cx - vw / 2, y: cy - vh / 2, w: vw, h: vh, cx, cy };
  },
};

// ---------------------------------------------------------------- particles
export const fx = {
  parts: [], texts: [],
  clear() { this.parts.length = 0; this.texts.length = 0; },
  burst(kind, x, y, n = 8, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.angle !== undefined ? o.angle + (Math.random() - 0.5) * (o.spread ?? 1) : Math.random() * TAU;
      const sp = (o.speed || 40) * (0.5 + Math.random() * 0.8);
      this.parts.push({ kind, x: x + (Math.random() - 0.5) * (o.jitter || 6), y: y + (Math.random() - 0.5) * (o.jitter || 6) * 0.5, z: o.z || 0,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, vz: (o.up ?? 40) * (0.6 + Math.random() * 0.8),
        g: o.g ?? 90, life: 0, max: (o.life || 0.8) * (0.7 + Math.random() * 0.6), size: (o.size || 3) * (0.7 + Math.random() * 0.6),
        col: Array.isArray(o.col) ? o.col[i % o.col.length] : o.col || '#fff', rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 8, icon: o.icon });
    }
  },
  float(x, y, str, col = '#fff', o = {}) { this.texts.push({ x, y, str, col, life: 0, max: o.life || 1.2, size: o.size || 9, icon: o.icon }); },
  update(dt) {
    for (const p of this.parts) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.g * dt; if (p.z < 0 && p.g > 0) { p.z = 0; p.vz *= -0.35; p.vx *= 0.6; p.vy *= 0.6; } p.rot += p.vr * dt; if (p.kind === 'dust' || p.kind === 'steam') { p.vx *= 0.96; p.vy *= 0.96; } }
    this.parts = this.parts.filter(p => p.life < p.max);
    for (const t of this.texts) t.life += dt;
    this.texts = this.texts.filter(t => t.life < t.max);
  },
  draw(c, t) {
    for (const p of this.parts) {
      const k = p.life / p.max, a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      c.save(); c.globalAlpha = a; c.translate(p.x, p.y - p.z);
      switch (p.kind) {
        case 'dust': ell(c, 0, 0, p.size * (1 + k * 1.6), p.size * (0.7 + k), 'rgba(235,220,195,.85)', null); break;
        case 'poof': { const r = p.size * (0.6 + k * 1.1); c.globalAlpha *= 1 - k * k; circ(c, 0, 0, r, '#fffaf2', 'rgba(91,63,54,.5)', 0.8); circ(c, -r * 0.35, -r * 0.3, r * 0.35, '#fff', null); break; }
        case 'snip': c.rotate(p.rot); line(c, -p.size, 0, p.size, 0, p.col, 1.2); break;
        case 'steam': ell(c, 0, 0, p.size * (1 + k), p.size * (1 + k), 'rgba(255,255,255,.55)', null); break;
        case 'spark': drawSpark(c, 0, 0, p.size * (1 - k * 0.5), p.col); break;
        case 'coin': c.rotate(p.rot * 0.3); ell(c, 0, 0, p.size * Math.abs(Math.cos(p.rot)) + 0.5, p.size, '#ffd35a', INK, 0.7); break;
        case 'heart': heart(c, 0, 0, p.size, p.col, INK, 0.6); break;
        case 'confetti': c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); break;
        case 'chip': c.rotate(p.rot); c.fillStyle = p.col; c.strokeStyle = INK; c.lineWidth = 0.6; c.fillRect(-p.size, -p.size / 3, p.size * 2, p.size * 0.66); c.strokeRect(-p.size, -p.size / 3, p.size * 2, p.size * 0.66); break;
        case 'leaf': c.rotate(p.rot); ell(c, 0, 0, p.size, p.size * 0.45, p.col, INK, 0.5); break;
        case 'splash': circ(c, 0, 0, p.size * (1 - k * 0.5), 'rgba(220,245,255,.9)', null); break;
        case 'star': star(c, 0, 0, p.size, p.col, INK, 0.6); break;
        case 'icon': c.scale(p.size / 16, p.size / 16); drawIcon(c, p.icon, t); break;
        default: circ(c, 0, 0, p.size, p.col, null);
      }
      c.restore();
    }
    for (const f of this.texts) {
      const k = f.life / f.max, e = 1 - Math.pow(1 - Math.min(1, k * 2.5), 3);
      const a = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      c.save(); c.globalAlpha = a;
      const s = k < 0.12 ? 0.6 + k / 0.12 * 0.5 : 1.1 - Math.min(0.1, (k - 0.12));
      c.translate(f.x, f.y - e * 22); c.scale(s, s);
      text(c, f.str, 0, 0, f.size, f.col, 900, 'center', INK, 3);
      c.restore();
    }
  },
};

// ---------------------------------------------------------------- lighting by time of day
export function lightingFor(minutes, interior) {
  const m = minutes % 1440 + (minutes >= 1440 ? 1440 : 0);
  let night = invLerp(18 * 60, 19 * 60 + 30, m);
  if (m < 6 * 60 + 30) night = 1 - invLerp(5 * 60, 6 * 60 + 30, m);
  const golden = invLerp(16 * 60 + 30, 18 * 60, m) * (1 - invLerp(18 * 60 + 30, 19 * 60 + 30, m));
  const dawn = invLerp(5 * 60 + 30, 6 * 60 + 30, m) * (1 - invLerp(6 * 60 + 30, 8 * 60, m));
  return { night: interior ? night * 0.35 : night, golden: interior ? golden * 0.3 : golden, dawn: interior ? 0 : dawn, lampOn: night > 0.25 };
}

// ---------------------------------------------------------------- renderer
export class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.c = canvas.getContext('2d', { alpha: false });
    this.dpr = 1; this.w = 0; this.h = 0;
    this.resize();
  }
  resize() {
    const r = this.cv.getBoundingClientRect();
    this.dpr = Math.min(G.state?.settings?.smooth ? 2 : 1.5, window.devicePixelRatio || 1);   // battery: 1.5x is plenty sharp
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.cv.width = Math.round(this.w * this.dpr); this.cv.height = Math.round(this.h * this.dpr);
    // characters about 48px tall on a typical phone
    cam.baseZoom = clamp(Math.min(this.w / 285, this.h / 500), 1.05, 2.2);
  }
  render(scene, t, extra = {}) {
    const c = this.c, v = cam.view, z = cam.zoom, d = this.dpr;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = scene.bg || '#2a2220'; c.fillRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(d * z, 0, 0, d * z, -v.x * d * z, -v.y * d * z);
    c.lineJoin = 'round'; c.lineCap = 'round';
    glows.length = 0;
    const light = extra.light || { night: 0, golden: 0, dawn: 0 };
    LIGHT.night = light.lampOn ? Math.max(0.3, light.night) : 0;

    if (scene.kind === 'island') { scene.drawWater(c, v, t); scene.drawGround(c, v, t, Math.min(2.5, d * z)); scene.drawShore(c, v, t); }
    else scene.drawBackground(c, v, t);
    if (scene.drawUnder) scene.drawUnder(c, v, t);

    // depth-sorted world
    const list = [], pad = 40;
    const inView = r => r.x < v.x + v.w + pad && r.x + r.w > v.x - pad && r.y < v.y + v.h + pad && r.y + r.h > v.y - pad;
    for (const p of scene.props) {
      if (p.hidden?.()) continue;
      if (p.cull && !inView(p.cull)) continue;
      if (p.flat) { c.save(); c.translate(p.x, p.y); p.draw(c, t); c.restore(); continue; }
      list.push(p);
    }
    for (const a of scene.actors) if (a.visible && a.x > v.x - pad && a.x < v.x + v.w + pad && a.y > v.y - pad && a.y < v.y + v.h + 80) list.push(a);
    if (extra.worldExtra) for (const e of extra.worldExtra) list.push(e);
    list.sort((a, b) => (a.sortY ?? a.y) - (b.sortY ?? b.y));
    for (const o of list) {
      if (o instanceof Object && o.draw && o.look !== undefined) { o.draw(c, t); continue; }
      c.save(); c.translate(o.x, o.y); o.draw(c, t, scene); c.restore();
    }
    // ghost the player when hidden behind a building
    const pl = extra.player;
    if (pl && pl.visible) {
      for (const o of list) {
        if (!o.isBuilding || o.y <= pl.y) continue;
        const r = o.cull;
        if (pl.x > o.x - o.w / 2 - 6 && pl.x < o.x + o.w / 2 + 6 && pl.y < o.y - 4 && pl.y > r.y + 30) { c.save(); c.globalAlpha = 0.42; pl.draw(c, t); c.restore(); break; }
      }
    }
    fx.draw(c, t);
    if (scene.drawOver) scene.drawOver(c, v, t);

    // lighting overlay
    if (light.night > 0.01 || light.golden > 0.01 || light.dawn > 0.01) {
      c.save();
      if (light.golden > 0.01) { c.globalCompositeOperation = 'soft-light'; c.fillStyle = `rgba(255,150,70,${light.golden * 0.55})`; c.fillRect(v.x, v.y, v.w, v.h); }
      if (light.dawn > 0.01) { c.globalCompositeOperation = 'soft-light'; c.fillStyle = `rgba(255,170,190,${light.dawn * 0.5})`; c.fillRect(v.x, v.y, v.w, v.h); }
      if (light.night > 0.01) { c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgba(${Math.round(lerp(255, 118, light.night))},${Math.round(lerp(255, 124, light.night))},${Math.round(lerp(255, 190, light.night))},1)`; c.fillRect(v.x, v.y, v.w, v.h); }
      c.restore();
    }
    // light glows punch through the dark
    if (glows.length && LIGHT.night > 0.02) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const [x, y, r, col] of glows) {
        if (x < v.x - r || x > v.x + v.w + r || y < v.y - r || y > v.y + v.h + r) continue;
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.globalAlpha = Math.min(1, LIGHT.night * 1.2); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      c.restore();
    }
    // emotes and speech on top of everything
    for (const a of scene.actors) a.drawEmote(c, t);
    if (extra.overlay) extra.overlay(c, t);
  }
  toScreen(x, y) { const v = cam.view, z = cam.zoom; return [(x - v.x) * z, (y - v.y) * z]; }
  toWorld(sx, sy) { const v = cam.view, z = cam.zoom; return [sx / z + v.x, sy / z + v.y]; }
}
export { rand };
