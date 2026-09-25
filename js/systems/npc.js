// Island life: residents with daily routines, tourists who arrive and leave
// by ferry, scooters on the streets, gulls and butterflies, and Mèo Mây's own
// wandering routine once the tutorial is over.

import { G } from './state.js';
import { Actor } from '../world/actor.js';
import { RESIDENTS, MERCHANTS, visitorLook } from '../data/looks.js';
import { PATHS, BUILDINGS } from '../world/island.js';
import { rand, randi, choice, chance, dist, bus, clamp, TAU, smoothLine } from '../core/util.js';
import { drawBoatTop } from './cinematic.js';
import { scooter as drawScooter, seagull } from '../gfx/props.js';
import { drawHuman } from '../gfx/character.js';
import { sfx } from '../core/audio.js';
import { fx } from '../world/render.js';

const HOME_OF = Object.fromEntries(BUILDINGS.filter(b => b.home).map(b => [b.home, b]));
const FERRY_TIMES = [8 * 60, 11 * 60, 14 * 60, 17 * 60];
const BERTH = { x: 1004, y: 2584 };

export const npcs = {
  residents: [], tourists: [], scooters: [], gulls: [], butterflies: [], ferry: null,
  byId(id) { return this.residents.find(a => a.data.rid === id) || null; },
  freeResidents() { return this.residents.filter(a => a.visible && a.data.state !== 'busy' && a.data.state !== 'home' && a.data.state !== 'going-home'); },
  borrowResident(bizId) {
    const free = this.freeResidents();
    if (!free.length) return null;
    const a = choice(free);
    a.stop(); a.data.state = 'busy'; a.setAct(null); a.sit = false;
    return a;
  },
  returnResident(a) { a.data.state = 'idle'; a.data.until = 0; },
  befriend(rid, n = 1) { const f = G.state.friends; f[rid] = (f[rid] || 0) + n; },
};
G.npcs = npcs;

npcs.spawnVisitorAt = (x, y, tag) => {
  const island = G.scenes.island, seed = randi(1, 1e6);
  const a = new Actor({ kind: 'human', look: visitorLook(seed, 'tourist'), x, y, speed: rand(46, 60), data: { tourist: true, state: 'walking', leaveAt: G.state.time + rand(90, 200) } });
  a.alpha = 0; a.fadeIn = true;
  island.add(a); npcs.tourists.push(a);
  const nodes = island.nav.tagged(tag); const sp = nodes.length ? choice(nodes) : island.nav.nearest(x, y);
  a.walkTo(island.nav.path(x, y, sp.x + rand(-14, 14), sp.y + rand(-8, 8))).then(() => { a.data.state = 'idle'; a.data.until = G.state.time + rand(20, 50); });
};

const VENDORS = [['nm1', 'ba_sau'], ['nm2', 0], ['nm3', 1], ['nm5', 2], ['nm6', 3]];
function updateVendors(island) {
  const s = G.state, open = s.nightMarket.restored && s.time >= 17 * 60 || (G.runtime.nm?.restoreAnim ?? 0) > 0.5;
  if (!npcs.vendors) {
    npcs.vendors = VENDORS.map(([st, who], i) => {
      const b = island.buildings[st];
      const look = who === 'ba_sau' ? MERCHANTS.ba_sau.look : visitorLook(9000 + i * 17, 'regular');
      const a = new Actor({ kind: 'human', look, name: who === 'ba_sau' ? 'Bà Sáu' : 'Người bán', x: b.x + (b.x < 440 ? -44 : 44), y: b.y + 4, data: { vendor: st, mid: who === 'ba_sau' ? 'ba_sau' : null } });
      a.talkable = who === 'ba_sau'; a.visible = false; a.face('down');
      island.add(a); return a;
    });
  }
  for (const a of npcs.vendors) {
    if (a.visible !== open) { a.visible = open; if (open) { a.alpha = 0; a.fadeIn = true; } }
    if (open && Math.random() < 0.004) { a.setAct(Math.random() < 0.5 ? 'wave' : 'stir'); a.showEmote(Math.random() < 0.5 ? 'note' : 'happy', 1.4); setTimeout(() => a.setAct(null), 1600); }
  }
}

export function initNPCs(island) {
  npcs.residents.length = 0;
  for (const [rid, def] of Object.entries(RESIDENTS)) {
    const home = HOME_OF[rid];
    const a = new Actor({ kind: 'human', look: def.look, name: def.name, x: home ? home.x : 900, y: home ? home.y + 16 : 1600, speed: rand(46, 58), data: { rid, state: 'idle', until: 0, npc: true } });
    a.talkable = true;
    island.add(a);
    npcs.residents.push(a);
  }
  // spread residents around the island at start instead of all at home
  for (const a of npcs.residents) { const sp = pickSpot(island, a); if (sp) { a.x = sp.x + rand(-10, 10); a.y = sp.y + rand(-6, 6); a.data.state = 'idle'; a.data.until = G.state.time + rand(10, 50); a.data.spot = sp; } }
  // scooters shuttle along the streets
  npcs.scooters = [
    makeScooter(PATHS.market, '#f28f7c', 0.1), makeScooter(PATHS.main.slice(1), '#9fd8c8', 0.5), makeScooter(PATHS.east, '#f7de8c', 0.3),
  ];
  npcs.gulls = Array.from({ length: 5 }, (_, i) => ({ cx: rand(200, 1600), cy: rand(300, 2500), r: rand(80, 200), a: rand(0, TAU), sp: rand(0.25, 0.5) * (i % 2 ? 1 : -1), seed: i * 3, h: rand(60, 110) }));
  npcs.butterflies = Array.from({ length: 10 }, (_, i) => ({ x: rand(300, 1500), y: rand(500, 2100), vx: 0, vy: 0, t: rand(0, 10), col: choice(['#fff4b8', '#ffc0d8', '#c9e8ff', '#ffe0a8']) }));
  npcs.ferry = { state: 'away', x: BERTH.x, y: 2950, speed: 0, next: nextFerryTime(), unload: 0, dockUntil: 0 };
}

function nextFerryTime() {
  const t = G.state.time;
  const times = [...FERRY_TIMES];
  if (G.state.nightMarket.restored) times.push(19 * 60 + 30);
  if (G.state.story.chapter >= 3) times.push(12 * 60 + 30, 15 * 60 + 30);
  times.sort((a, b) => a - b);
  return times.find(x => x > t + 1) ?? 99999;
}

function pickSpot(island, a) {
  const h = G.state.time / 60, nm = G.state.nightMarket.restored;
  const opts = [['beach', 2], ['bench', 2.5], ['market', 3], ['view', 1], ['plaza', 1.5]];
  if (npcs.ferry && (npcs.ferry.state === 'arriving' || npcs.ferry.state === 'docked')) opts.push(['dock', 2]);
  if (nm && h >= 17) opts.push(['nightmarket', 6]);
  const total = opts.reduce((s, o) => s + o[1], 0);
  let r = Math.random() * total, tag = 'plaza';
  for (const [k, w] of opts) { r -= w; if (r <= 0) { tag = k; break; } }
  const nodes = island.nav.tagged(tag);
  return nodes.length ? choice(nodes) : choice(island.nav.nodes);
}

function goTo(island, a, x, y, then) {
  a.data.state = 'walking';
  a.setAct(null); a.sit = false;
  a.walkTo(island.nav.path(a.x, a.y, x, y)).then(ok => { if (ok) then?.(); });
}

function updateResident(island, a, dt) {
  const d = a.data, s = G.state, h = s.time / 60;
  const bedtime = s.nightMarket.restored ? 22.5 : 21.3;
  if (d.state === 'busy') return;
  if (d.state === 'home') {
    if (h >= 6.8 + (a.seed % 1) * 1.5 && h < bedtime - 0.5) { a.visible = true; a.alpha = 0; a.fadeIn = true; d.state = 'idle'; d.until = 0; }
    return;
  }
  if ((h >= bedtime || h < 6.5) && d.state !== 'going-home') {
    const home = HOME_OF[d.rid];
    d.state = 'going-home';
    a.walkTo(island.nav.path(a.x, a.y, home.x, home.y + 10)).then(ok => { if (d.state === 'going-home') { a.visible = false; d.state = 'home'; } });
    return;
  }
  if (d.state === 'going-home' || d.state === 'walking') return;
  // idling at a spot
  if (s.time >= d.until) {
    const sp = pickSpot(island, a);
    d.spot = sp;
    goTo(island, a, sp.x + rand(-12, 12), sp.y + rand(-6, 6), () => {
      d.state = 'idle'; d.until = s.time + rand(18, 60);
      if (sp.tags.has('sit')) { a.sit = true; a.face('down'); }
      else if (sp.tags.has('beach') || sp.tags.has('view')) a.face('down');
      else if (sp.tags.has('dock')) a.face('down');
    });
    return;
  }
  // little idle behaviours
  d.fidget = (d.fidget ?? rand(2, 6)) - dt;
  if (d.fidget <= 0) {
    d.fidget = rand(3, 8);
    const near = npcs.residents.find(o => o !== a && o.visible && o.data.state === 'idle' && dist(o.x, o.y, a.x, a.y) < 44);
    const pl = G.player;
    if (pl && G.scene === island && dist(pl.x, pl.y, a.x, a.y) < 50 && chance(0.5)) { a.face(pl); if (!d.greeted) { d.greeted = true; a.setAct('wave'); a.showEmote('happy', 1.2); setTimeout(() => a.act === 'wave' && a.setAct(null), 1400); } }
    else if (near) { a.face(near); near.face(a); a.showEmote(choice(['...', 'note', 'happy', '...']), 1.8); }
    else if (!a.sit) {
      const r = Math.random();
      if (d.rid === 'minh' && r < 0.4) { a.setAct('photo'); setTimeout(() => a.act === 'photo' && a.setAct(null), 2200); }
      else if (r < 0.2) { a.setAct('phone'); setTimeout(() => a.act === 'phone' && a.setAct(null), 3000); }
      else a.face(choice(['down', 'left', 'right', 'down']));
    }
  }
}

// ---------------------------------------------------------------- tourists & ferry
function spawnTourists(island, n) {
  for (let i = 0; i < n; i++) {
    const seed = randi(1, 1e6);
    const a = new Actor({ kind: 'human', look: visitorLook(seed, 'tourist'), x: BERTH.x - 20, y: BERTH.y, speed: rand(46, 60), data: { tourist: true, state: 'disembark', leaveAt: G.state.time + rand(120, 260) } });
    a.visible = false;
    island.add(a);
    npcs.tourists.push(a);
    setTimeout(() => {
      a.visible = true; a.doHop(110);
      a.walkTo([[962, BERTH.y], [900, BERTH.y - 8], [900, 2440]]).then(() => { a.data.state = 'idle'; a.data.until = 0; });
    }, 700 + i * 650);
  }
}
function updateTourist(island, a, dt) {
  const d = a.data, s = G.state;
  if (d.state === 'disembark' || d.state === 'walking' || d.state === 'busy' || d.state === 'boarding') return;
  if (s.time >= d.leaveAt || s.time > 22 * 60) {
    d.state = 'boarding';
    a.walkTo(island.nav.path(a.x, a.y, 900, 2560).concat([[960, 2583]])).then(() => { a.fadeOut = true; npcs.tourists.splice(npcs.tourists.indexOf(a), 1); });
    return;
  }
  if (s.time >= (d.until || 0)) {
    const tags = ['beach', 'beach', 'bench', 'market', 'view', 'plaza', ...(s.nightMarket.restored && s.time > 17 * 60 ? ['nightmarket', 'nightmarket'] : [])];
    const nodes = island.nav.tagged(choice(tags));
    const sp = nodes.length ? choice(nodes) : choice(island.nav.nodes);
    goTo(island, a, sp.x + rand(-14, 14), sp.y + rand(-8, 8), () => {
      d.state = 'idle'; d.until = s.time + rand(15, 45);
      if (sp.tags.has('sit')) a.sit = true;
      if (chance(0.45)) { a.setAct(a.look.camera || chance(0.5) ? 'photo' : 'phone'); setTimeout(() => a.setAct(null), 2600); }
    });
  }
}
function updateFerry(island, dt) {
  const f = npcs.ferry, s = G.state;
  if (f.state === 'away') {
    if (s.time >= f.next) { f.state = 'arriving'; f.x = BERTH.x; f.y = 2980; f.speed = 70; sfx('horn'); }
  } else if (f.state === 'arriving') {
    const dy = f.y - BERTH.y;
    f.speed = Math.max(8, Math.min(80, dy * 0.8));
    f.y -= f.speed * dt;
    if (dy < 1) { f.y = BERTH.y; f.speed = 0; f.state = 'docked'; f.dockUntil = s.time + 28; f.unload = 1;
      const n = clamp(1 + Math.floor(s.reputation / 25) + (s.story.chapter >= 3 ? 1 : 0) + (s.nightMarket.restored ? 2 : 0), 1, 9);
      if (npcs.tourists.length < 16 && s.story.chapter >= 2 && !G.runtime.introBoat) spawnTourists(island, n);
      G.runtime.boatBoost = 30;
      bus.emit('ferry', n);
      fx.burst('splash', f.x - 20, f.y + 20, 8, { up: 50, life: 0.6 });
    }
  } else if (f.state === 'docked') {
    if (s.time >= f.dockUntil && !G.runtime.introBoat) { f.state = 'leaving'; sfx('horn'); }
  } else if (f.state === 'leaving') {
    f.speed = Math.min(90, f.speed + dt * 30);
    f.y += f.speed * dt;
    if (f.y > 3000) { f.state = 'away'; f.next = nextFerryTime(); }
  }
  if (G.runtime.boatBoost > 0) G.runtime.boatBoost -= dt;
}
export function ferryDrawable() {
  const f = npcs.ferry;
  if (!f || f.state === 'away') return null;
  return { x: f.x, y: f.y, sortY: f.y + 40, draw: (c, t) => drawBoatTop(c, t, { speed: f.speed, scale: 1.25, stripe: '#6fbfb0', cabin: '#fff5df' }) };
}
export function resetFerryForNewDay() { const f = npcs.ferry; if (!f) return; f.state = 'away'; f.y = 2980; f.next = nextFerryTime(); }

// ---------------------------------------------------------------- scooters
function makeScooter(path, col, phase) {
  const flat = smoothLine(path, 6), pts = [];
  for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
  let len = 0; const segs = [];
  for (let i = 0; i < pts.length - 1; i++) { const d = dist(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); segs.push(d); len += d; }
  const seed = randi(1, 999);
  return { pts, segs, len, pos: len * phase, dir: 1, speed: 72, col, rider: { look: visitorLook(seed, 'regular'), dir: 'right', moving: 0, seed, blinkAmt: 0, emo: 'happy', sit: true }, x: 0, y: 0, flip: false, beep: 0 };
}
function updateScooter(sc, dt) {
  const pl = G.player;
  let target = 72;
  if (pl && G.scene === G.scenes.island && dist(pl.x, pl.y, sc.x, sc.y) < 50) {
    // only brake if the player is actually ahead, on the road
    const i = sc.segs.findIndex((_, k) => true);
    const hx = sc.flip ? -1 : 1, ahead = (pl.x - sc.x) * hx * (Math.abs(sc.hx ?? 1)) + 0;
    const vx = sc.vx || hx, vy = sc.vy || 0, l = Math.hypot(vx, vy) || 1;
    const along = ((pl.x - sc.x) * vx + (pl.y - sc.y) * vy) / l, side = Math.abs(((pl.x - sc.x) * vy - (pl.y - sc.y) * vx) / l);
    void i; void ahead;
    if (along > 0 && side < 18) { target = 0; if (sc.beep <= 0) { sc.beep = 3; sfx('beep'); } }
  }
  sc.beep -= dt;
  sc.speed += (target - sc.speed) * Math.min(1, dt * 3);
  sc.pos += sc.dir * sc.speed * dt;
  if (sc.pos > sc.len) { sc.pos = sc.len; sc.dir = -1; } else if (sc.pos < 0) { sc.pos = 0; sc.dir = 1; }
  let p = sc.pos, i = 0;
  while (i < sc.segs.length - 1 && p > sc.segs[i]) { p -= sc.segs[i]; i++; }
  const a = sc.pts[i], b = sc.pts[i + 1], k = sc.segs[i] ? p / sc.segs[i] : 0;
  const nx = a[0] + (b[0] - a[0]) * k, ny = a[1] + (b[1] - a[1]) * k;
  sc.vx = (b[0] - a[0]) * sc.dir; sc.vy = (b[1] - a[1]) * sc.dir;
  const dx = (b[0] - a[0]) * sc.dir;
  if (Math.abs(dx) > 0.5) sc.flip = dx < 0;
  // drive on the right-hand side of the road
  const off = 7 * sc.dir;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  sc.x = nx + (-(b[1] - a[1]) / len) * off; sc.y = ny + ((b[0] - a[0]) / len) * off;
}
function scooterDrawable(sc) {
  return { x: sc.x, y: sc.y, draw: (c, t) => { c.save(); c.translate(0, Math.sin(t * 20) * 0.3 * (sc.speed > 5 ? 1 : 0)); drawScooter(c, t, { col: sc.col, flip: sc.flip, basket: true, rider: (cc, tt) => { cc.save(); cc.scale(0.95, 0.95); drawHuman(cc, { ...sc.rider, dir: 'right' }, tt); cc.restore(); } }); c.restore(); } };
}

// ---------------------------------------------------------------- per frame
export function updateNPCs(dt) {
  const island = G.scenes.island;
  for (const a of npcs.residents) updateResident(island, a, dt);
  updateVendors(island);
  for (const a of [...npcs.tourists]) updateTourist(island, a, dt);
  updateFerry(island, dt);
  for (const sc of npcs.scooters) updateScooter(sc, dt);
  for (const g of npcs.gulls) g.a += g.sp * dt;
  for (const b of npcs.butterflies) {
    b.t += dt;
    b.vx += (Math.sin(b.t * 1.3) * 18 - b.vx) * dt; b.vy += (Math.cos(b.t * 0.9) * 12 - b.vy) * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
  }
}
export function npcDrawables() {
  const out = [];
  const f = ferryDrawable(); if (f) out.push(f);
  for (const sc of npcs.scooters) out.push(scooterDrawable(sc));
  for (const b of npcs.butterflies) out.push({ x: b.x, y: b.y, sortY: b.y + 30, draw: (c, t) => { c.save(); c.translate(0, -22 - Math.sin(b.t * 3) * 4); const f = Math.abs(Math.sin(b.t * 16)); c.fillStyle = b.col; c.strokeStyle = 'rgba(91,63,54,.7)'; c.lineWidth = 0.6; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 2.6 * f, -1, 2.6 * f + 0.4, 3, s * 0.4, 0, TAU); c.fill(); c.stroke(); } c.restore(); } });
  return out;
}
export function drawSkyLife(c, t) {
  if (G.scene !== G.scenes.island) return;
  for (const g of npcs.gulls) {
    const x = g.cx + Math.cos(g.a) * g.r, y = g.cy + Math.sin(g.a) * g.r * 0.6;
    c.save(); c.globalAlpha = 0.18; c.fillStyle = '#2a4a50'; c.beginPath(); c.ellipse(x + 16, y + g.h * 0.4, 5, 1.6, 0, 0, TAU); c.fill(); c.restore();
    c.save(); c.translate(x, y - g.h * 0.3); c.scale(Math.sign(Math.cos(g.a + Math.PI / 2) * g.sp) || 1, 1); seagull(c, t, g); c.restore();
  }
}
