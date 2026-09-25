// Scene: one walkable space (the island, or a building interior).
// Owns collision shapes, depth-sorted props, actors, interaction triggers and a
// navigation graph that NPCs use to walk around obstacles.

import { dist, clamp } from '../core/util.js';

export class Scene {
  constructor(o) {
    this.id = o.id;
    this.kind = o.kind || 'interior';
    this.name = o.name || '';
    this.w = o.w; this.h = o.h;
    this.solids = [];      // {x,y,w,h, id?}
    this.circles = [];     // {x,y,r}
    this.props = [];       // {x,y,draw(c,t,scene), cull:{x,y,w,h}, solid?}
    this.actors = [];
    this.triggers = [];    // {id,x,y,w,h, kind:'door'|'act', label, ...}
    this.nav = new NavGraph();
    this.spawn = o.spawn || { x: this.w / 2, y: this.h / 2 };
    this.bg = o.bg || '#2a2220';
    this.zoomBias = o.zoomBias || 1;
  }

  add(actor) { if (!this.actors.includes(actor)) { this.actors.push(actor); actor.scene = this.id; } return actor; }
  remove(actor) { const i = this.actors.indexOf(actor); if (i >= 0) this.actors.splice(i, 1); }
  solid(x, y, w, h, extra = {}) { const s = { x, y, w, h, ...extra }; this.solids.push(s); return s; }
  circle(x, y, r) { const s = { x, y, r }; this.circles.push(s); return s; }
  prop(p) { this.props.push(p); return p; }
  trigger(t) { this.triggers.push(t); return t; }

  // Terrain test: overridden by the island (water, river). Interiors use bounds.
  terrain(x, y) { return x > 8 && y > 8 && x < this.w - 8 && y < this.h - 4; }

  blocked(x, y, r = 5, ignore = null) {
    for (const s of this.solids) {
      if (s.off || s === ignore) continue;
      if (x > s.x - r && x < s.x + s.w + r && y > s.y - r * 0.6 && y < s.y + s.h + r * 0.6) return s;
    }
    for (const s of this.circles) {
      const dx = x - s.x, dy = (y - s.y) * 1.4;
      if (dx * dx + dy * dy < (s.r + r) * (s.r + r)) return s;
    }
    return null;
  }
  canStand(x, y, r = 5) { return this.terrain(x, y) && this.terrainEdge(x, y, r) && !this.blocked(x, y, r); }
  terrainEdge(x, y, r) { return this.terrain(x - r, y) && this.terrain(x + r, y) && this.terrain(x, y - r * 0.5) && this.terrain(x, y + r * 0.5); }

  // Move with sliding along obstacles. Returns the new position.
  moveWithCollision(x, y, dx, dy, r = 5) {
    let nx = x + dx, ny = y + dy;
    if (this.canStand(nx, ny, r)) return [nx, ny];
    if (this.canStand(nx, y, r)) return [nx, y];
    if (this.canStand(x, ny, r)) return [x, ny];
    // try nudging around corners so the player doesn't snag
    const len = Math.hypot(dx, dy) || 1;
    for (const a of [0.45, -0.45, 0.8, -0.8]) {
      const c = Math.cos(a), s = Math.sin(a);
      const tx = x + (dx * c - dy * s) * 0.7, ty = y + (dx * s + dy * c) * 0.7;
      if (this.canStand(tx, ty, r)) return [tx, ty];
    }
    void len;
    return [x, y];
  }

  triggerAt(x, y, pad = 0) {
    let best = null, bd = Infinity;
    for (const t of this.triggers) {
      if (t.off || (t.enabled && !t.enabled())) continue;
      if (x >= t.x - pad && x <= t.x + t.w + pad && y >= t.y - pad && y <= t.y + t.h + pad) {
        const d = dist(x, y, t.x + t.w / 2, t.y + t.h / 2);
        if (d < bd) { bd = d; best = t; }
      }
    }
    return best;
  }

  update(dt, t) { for (const a of this.actors) a.update(dt, t, this); }
}

// ---------------------------------------------------------------- navigation
// A small waypoint graph. NPCs pick a destination node; A* gives the route.
export class NavGraph {
  constructor() { this.nodes = []; }
  add(x, y, tags = []) { const n = { id: this.nodes.length, x, y, links: new Set(), tags: new Set(tags) }; this.nodes.push(n); return n; }
  link(a, b) { if (a === b) return; a.links.add(b.id); b.links.add(a.id); }
  nearest(x, y, filter) {
    let best = null, bd = Infinity;
    for (const n of this.nodes) { if (filter && !filter(n)) continue; const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = n; } }
    return best;
  }
  tagged(tag) { return this.nodes.filter(n => n.tags.has(tag)); }
  // Add a polyline, merging with existing nodes that are very close.
  addLine(pts, tags = [], merge = 22) {
    let prev = null;
    for (const [x, y] of pts) {
      let n = this.nearest(x, y);
      if (!n || dist(n.x, n.y, x, y) > merge) n = this.add(x, y, tags);
      if (prev) this.link(prev, n);
      prev = n;
    }
    return prev;
  }
  // Subdivide long edges so NPCs can stop anywhere along a path.
  densify(step = 60) {
    const edges = [];
    for (const n of this.nodes) for (const id of n.links) if (id > n.id) edges.push([n, this.nodes[id]]);
    for (const [a, b] of edges) {
      const d = dist(a.x, a.y, b.x, b.y);
      const k = Math.floor(d / step);
      if (k < 1) continue;
      a.links.delete(b.id); b.links.delete(a.id);
      let prev = a;
      for (let i = 1; i <= k; i++) {
        const t = i / (k + 1);
        const n = this.add(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, ['path']);
        this.link(prev, n); prev = n;
      }
      this.link(prev, b);
    }
  }
  route(from, to) {
    if (!from || !to) return [];
    if (from === to) return [from];
    const open = new Set([from.id]), came = new Map(), g = new Map([[from.id, 0]]), f = new Map([[from.id, dist(from.x, from.y, to.x, to.y)]]);
    let guard = 0;
    while (open.size && guard++ < 5000) {
      let cur = null, cf = Infinity;
      for (const id of open) { const v = f.get(id); if (v < cf) { cf = v; cur = id; } }
      if (cur === to.id) {
        const out = [this.nodes[cur]];
        while (came.has(cur)) { cur = came.get(cur); out.unshift(this.nodes[cur]); }
        return out;
      }
      open.delete(cur);
      const cn = this.nodes[cur];
      for (const nid of cn.links) {
        const nn = this.nodes[nid];
        const tg = g.get(cur) + dist(cn.x, cn.y, nn.x, nn.y);
        if (tg < (g.get(nid) ?? Infinity)) { came.set(nid, cur); g.set(nid, tg); f.set(nid, tg + dist(nn.x, nn.y, to.x, to.y)); open.add(nid); }
      }
    }
    return [];
  }
  // Route from an arbitrary point to an arbitrary point via the graph.
  path(x1, y1, x2, y2) {
    const a = this.nearest(x1, y1), b = this.nearest(x2, y2);
    const nodes = this.route(a, b);
    const pts = nodes.map(n => [n.x, n.y]);
    pts.push([x2, y2]);
    return pts;
  }
}

// Grid A* for interiors with furniture (restaurant staff and guests).
export class Grid {
  constructor(scene, cell = 12, r = 5) {
    this.cell = cell; this.cols = Math.ceil(scene.w / cell); this.rows = Math.ceil(scene.h / cell);
    this.scene = scene; this.r = r; this.rebuild();
  }
  rebuild() {
    const { cols, rows, cell, scene, r } = this;
    this.free = new Uint8Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) this.free[j * cols + i] = scene.canStand(i * cell + cell / 2, j * cell + cell / 2, r) ? 1 : 0;
  }
  idx(x, y) { return clamp(Math.floor(y / this.cell), 0, this.rows - 1) * this.cols + clamp(Math.floor(x / this.cell), 0, this.cols - 1); }
  nearestFree(i) {
    if (this.free[i]) return i;
    const { cols, rows } = this, ci = i % cols, cj = Math.floor(i / cols);
    for (let rad = 1; rad < 8; rad++) for (let dj = -rad; dj <= rad; dj++) for (let di = -rad; di <= rad; di++) {
      const x = ci + di, y = cj + dj; if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      if (this.free[y * cols + x]) return y * cols + x;
    }
    return i;
  }
  path(x1, y1, x2, y2) {
    const { cols, cell } = this;
    const s = this.nearestFree(this.idx(x1, y1)), e = this.nearestFree(this.idx(x2, y2));
    const g = new Float32Array(this.free.length).fill(Infinity), came = new Int32Array(this.free.length).fill(-1);
    const open = [s]; g[s] = 0;
    const h = i => Math.hypot((i % cols) - (e % cols), Math.floor(i / cols) - Math.floor(e / cols));
    const inOpen = new Uint8Array(this.free.length); inOpen[s] = 1;
    let guard = 0;
    while (open.length && guard++ < 6000) {
      let bi = 0, bf = Infinity;
      for (let k = 0; k < open.length; k++) { const v = g[open[k]] + h(open[k]); if (v < bf) { bf = v; bi = k; } }
      const cur = open.splice(bi, 1)[0]; inOpen[cur] = 0;
      if (cur === e) break;
      const cx = cur % cols, cy = Math.floor(cur / cols);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= this.rows) continue;
        const ni = ny * cols + nx; if (!this.free[ni]) continue;
        if (dx && dy && (!this.free[cy * cols + nx] || !this.free[ny * cols + cx])) continue;
        const tg = g[cur] + (dx && dy ? 1.414 : 1);
        if (tg < g[ni]) { g[ni] = tg; came[ni] = cur; if (!inOpen[ni]) { open.push(ni); inOpen[ni] = 1; } }
      }
    }
    if (came[e] < 0 && e !== s) return [[x2, y2]];
    const cells = []; let cur = e;
    while (cur !== -1 && cur !== s) { cells.unshift(cur); cur = came[cur]; }
    // string-pull: drop points that are in a straight line
    const pts = cells.map(i => [(i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2]);
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      if (i > 0 && i < pts.length - 1) {
        const a = pts[i - 1], b = pts[i], c = pts[i + 1];
        if ((b[0] - a[0]) * (c[1] - b[1]) === (b[1] - a[1]) * (c[0] - b[0])) continue;
      }
      out.push(pts[i]);
    }
    out.push([x2, y2]);
    return out;
  }
}
