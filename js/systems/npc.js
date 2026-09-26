// Island life: residents with daily routines, tourists who arrive and leave
// by ferry, scooters on the streets, gulls and butterflies, and Mèo Mây's own
// wandering routine once the tutorial is over.

import { G, T } from './state.js';
import { Actor } from '../world/actor.js';
import { RESIDENTS, MERCHANTS, visitorLook } from '../data/looks.js';
import { drawSprite, spriteReady, spriteMeta } from '../gfx/sprites.js';
import { initAnimals, updateAnimals, animalDrawables, reactHop, drawReact, tickReact, react } from './animals.js';
import { POND as POND_C } from '../world/island.js';
import { ell } from '../gfx/draw.js';
import { updateBarks, drawBarks } from './fun.js';
import { updateSideQuests, drawSideQuests } from './sidequests.js';
import { PATHS, BUILDINGS } from '../world/island.js';
import { rand, randi, choice, chance, dist, bus, clamp, TAU, smoothLine } from '../core/util.js';
import { drawBoatTop } from './cinematic.js';
import { scooter as drawScooter, seagull, duck, wind } from '../gfx/props.js';
import { cam } from '../world/render.js';
const windAt = x => wind(x, G.t);
const inView = r => { const v = cam.view; return r.x < v.x + v.w && r.x + r.w > v.x && r.y < v.y + v.h && r.y + r.h > v.y; };
import { drawHuman } from '../gfx/character.js';
import { sfx } from '../core/audio.js';
import { fx } from '../world/render.js';

const HOME_OF = Object.fromEntries(BUILDINGS.filter(b => b.home).map(b => [b.home, b]));
// family households: Bé Na lives with her grandma, Minh rooms with Anh Tuấn
HOME_OF.be_na = HOME_OF.ba_tu; HOME_OF.minh = HOME_OF.anh_tuan;
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

npcs.spawnIsletResidents = () => {
  const island = G.scenes.island;
  for (const [rid, def] of Object.entries(RESIDENTS)) {
    if (!def.islet || npcs.residents.some(a => a.data.rid === rid)) continue;
    const home = HOME_OF[rid];
    const a = new Actor({ kind: 'human', look: def.look, name: def.name, x: home.x, y: home.y + 16, speed: rand(46, 58), data: { rid, state: 'idle', until: 0, npc: true } });
    a.talkable = true; island.add(a); npcs.residents.push(a);
  }
};
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
      const a = new Actor({ kind: 'human', look, name: who === 'ba_sau' ? 'Bà Sáu' : T('Vendor', 'Người bán'), x: b.x + (b.x < 440 ? -44 : 44), y: b.y + 4, data: { vendor: st, mid: who === 'ba_sau' ? 'ba_sau' : null } });
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
    if (def.islet && !G.state.story.flags.bridgeFixed) continue;
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
  initAnimals(island);
  npcs.ducks = [0, 1, 2, 3].map(i => ({ a: i * 1.6, r: 26 + i * 9, sp: 0.12 + i * 0.03, seed: i * 3, col: i === 3 ? '#f7de8c' : '#fffaf0', x: 0, y: 0 }));
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
    else if (near) { // a little chat; sometimes a joke lands and both laugh
      a.face(near); near.face(a); a.showEmote(choice(['...', 'note', 'happy', '...']), 1.8);
      if (chance(0.35)) setTimeout(() => { for (const o of [a, near]) { o.setAct('cheer'); o.doHop(60); } near.showEmote('happy', 1.4); setTimeout(() => { for (const o of [a, near]) if (o.act === 'cheer') o.setAct(null); }, 1200); }, 1600);
    }
    else if (!a.sit) idleAct(a);
    else if (chance(0.3)) { a.setAct(chance(0.5) ? 'drink' : 'eat', chance(0.5) ? 'cup' : 'banh_mi'); setTimeout(() => (a.act === 'drink' || a.act === 'eat') && a.setAct(null), 4000); }
  }
}

// Idle moments while standing around: each pick lasts a couple of seconds.
const IDLE = [
  { w: 3, go: a => a.face(choice(['down', 'left', 'right', 'down'])) },
  { w: 2, go: a => act(a, 'phone', 3) },
  { w: 1.5, go: a => { act(a, 'think', 2.2); a.showEmote('?', 1.6); } },
  { w: 1.5, go: a => { a.showEmote('zzz', 1.8); a.squash = 0.6; } },                         // yawn
  { w: 1.2, go: a => { act(a, 'dance', 2.6); a.showEmote('note', 2.4); } },
  { w: 1, go: a => { a.doHop(70); setTimeout(() => a.doHop(60), 420); } },                   // happy hop
  { w: 1.2, go: a => act(a, 'drink', 3, 'cup') },
  { w: 1, go: a => act(a, 'eat', 3, 'banh_mi') },
  { w: 1, go: a => { act(a, 'stretch', 1.8); } },
  { w: 0.8, go: a => { a.face('left'); setTimeout(() => a.face('right'), 700); setTimeout(() => a.face('down'), 1400); } }, // look around
];
function act(a, name, secs, held = null) { a.setAct(name, held); setTimeout(() => a.act === name && a.setAct(null), secs * 1000); }
function idleAct(a) {
  const d = a.data, role = a.look?.sprite ? spriteMeta(a.look.sprite)?.role : null;
  if (role === 'photo' && chance(0.35)) return act(a, 'photo', 2.2);
  if (role === 'music' && chance(0.4)) { a.showEmote('note', 2.4); return act(a, 'dance', 2.4); }
  if (role === 'sweep' && chance(0.35)) return act(a, 'sweep', 3);
  if (role === 'jog' && chance(0.3)) { a.doHop(90); return act(a, 'stretch', 1.6); }
  if (d.rid === 'minh' && chance(0.4)) return act(a, 'photo', 2.2);
  if (d.rid === 'be_na' && chance(0.3)) { a.doHop(90); setTimeout(() => a.doHop(80), 400); return; }
  let r = Math.random() * IDLE.reduce((s, x) => s + x.w, 0);
  for (const x of IDLE) { r -= x.w; if (r <= 0) return x.go(a); }
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
  const look = { ...visitorLook(seed, 'regular'), hat: 'helmet', hatColor: choice(['#f28f7c', '#6f9fc8', '#f7de8c', '#9fd8c8', '#fff5df']), backpack: undefined, camera: undefined, scale: 1, sprite: undefined };
  return { pts, segs, len, pos: len * phase, dir: 1, speed: 72, col, rider: { look, dir: 'right', moving: 0, seed, blinkAmt: 0, emo: 'happy', sit: true, act: 'ride', actT: 0 }, x: 0, y: 0, flip: false, beep: 0 };
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
  if (sc.shipper && spriteReady('shipper')) {
    const a = sc.shipperActor || (sc.shipperActor = { look: { sprite: 'shipper' }, seed: 5, blinkAmt: 0, emo: 'happy' });
    a.dir = sc.flip ? 'left' : 'right'; a.moving = sc.speed > 5 ? 1 : 0;
    return { x: sc.x, y: sc.y, draw: (c, t) => drawSprite(c, a, t) };
  }
  return { x: sc.x, y: sc.y, draw: (c, t) => { c.save(); c.translate(0, Math.sin(t * 20) * 0.3 * (sc.speed > 5 ? 1 : 0)); drawScooter(c, t, { col: sc.col, flip: sc.flip, basket: true, rider: (cc, tt) => { cc.save(); cc.scale(0.95, 0.95); drawHuman(cc, { ...sc.rider, dir: 'right' }, tt); cc.restore(); } }); c.restore(); } };
}

// ---------------------------------------------------------------- ducks + feeding
function updateDucks(dt) {
  const crumbs = npcs.crumbs || (npcs.crumbs = []);
  for (const b of crumbs) {
    if (b.z > 0 || b.vz > 0) { b.x += b.vx * dt; b.y += b.vy * dt; b.vz -= 260 * dt; b.z = Math.max(0, b.z + b.vz * dt); if (b.z === 0) { b.vz = 0; b.landed = 0.001; if (Math.random() < 0.3) sfx('splash'); } }
    else if (b.landed) b.landed += dt;
    b.life -= dt;
  }
  for (let i = crumbs.length - 1; i >= 0; i--) if (crumbs[i].life <= 0 || crumbs[i].eaten) crumbs.splice(i, 1);
  for (const d of npcs.ducks || []) {
    tickReact(d, dt);
    d.peck = Math.max(0, (d.peck || 0) - dt);
    // swim to the nearest crumb floating on the water
    let tgt = null, bd = 160;
    for (const b of crumbs) if (b.landed && !b.eaten) { const dd = dist(d.x, d.y, b.x, b.y); if (dd < bd) { bd = dd; tgt = b; } }
    if (tgt) {
      const dx = tgt.x - d.x, dy = tgt.y - d.y, l = Math.hypot(dx, dy) || 1;
      if (l < 5) { tgt.eaten = true; d.peck = 0.5; if (!d.react || d.react.t > 0.8) { d.react = { t: 0, text: G.lang === 'vi' ? 'Cạp cạp!' : 'Quack!' }; } sfx('quack'); d.fed = (d.fed || 0) + 1; }
      else { d.x += dx / l * 30 * dt; d.y += dy / l * 30 * dt; d.flip = dx < 0; }
      d.a = Math.atan2((d.y - 482) / (d.r * 0.62), (d.x - 770) / (d.r * 1.3)); // rejoin the loop from here
      continue;
    }
    // otherwise paddle lazily around the pond, easing back onto the loop
    d.a += d.sp * dt * (d.seed % 2 ? 1 : -1);
    const ox = 770 + Math.cos(d.a) * d.r * 1.3, oy = 482 + Math.sin(d.a) * d.r * 0.62;
    const k = Math.min(1, dt * 1.5); const nx = d.x ? d.x + (ox - d.x) * k : ox, ny = d.y ? d.y + (oy - d.y) * k : oy;
    if (Math.abs(nx - d.x) > 0.01) d.flip = nx < d.x;
    d.x = nx; d.y = ny;
  }
}
export function nearPond(x, y) { const px = (x - POND_C.x) / (POND_C.rx + 46), py = (y - POND_C.y) / (POND_C.ry + 36); return px * px + py * py < 1; }
export function feedDucks() {
  const pl = G.player, crumbs = npcs.crumbs || (npcs.crumbs = []);
  pl.face({ x: POND_C.x, y: POND_C.y }); pl.setAct('wave'); sfx('whoosh');
  setTimeout(() => pl.act === 'wave' && pl.setAct(null), 900);
  for (let i = 0; i < 6; i++) {
    const tx = POND_C.x + (pl.x - POND_C.x) * 0.45 + rand(-26, 26), ty = POND_C.y + (pl.y - POND_C.y) * 0.45 + rand(-12, 12), T = rand(0.5, 0.8);
    crumbs.push({ x: pl.x, y: pl.y - 2, vx: (tx - pl.x) / T, vy: (ty - pl.y) / T, z: 14, vz: 60 + rand(0, 40), life: 12, landed: 0 });
  }
  const s = G.state, key = 'ducksFed';
  if (s.story.flags[key] !== s.day) { s.story.flags[key] = s.day; bus.emit('toast', { text: G.lang === 'vi' ? 'Lũ vịt thích lắm!' : 'The ducks love you!', sub: G.lang === 'vi' ? '+5 KN · quay lại mai nhé' : '+5 XP · come back tomorrow', icon: 'heart' }); bus.emit('xp:add', 5); }
}

// ---------------------------------------------------------------- per frame
export function updateNPCs(dt) {
  const island = G.scenes.island;
  updateAnimals(dt);
  updateBarks(dt);
  updateSideQuests();
  for (const a of npcs.residents) updateResident(island, a, dt);
  updateVendors(island);
  for (const a of [...npcs.tourists]) updateTourist(island, a, dt);
  updateFerry(island, dt);
  for (const sc of npcs.scooters) updateScooter(sc, dt);
  for (const g of npcs.gulls) g.a += g.sp * dt;
  updateDucks(dt);
  // leaves and petals drift down from trees in view when the wind picks up
  npcs.leafT = (npcs.leafT || 0) - dt;
  if (npcs.leafT <= 0 && G.scene === island) {
    npcs.leafT = 0.35;
    const cand = island.props.filter(p => (p.kind === 'tree' || p.kind === 'flameTree' || p.kind === 'banyan' || p.kind === 'frangipani') && p.cull && inView(p.cull));
    if (cand.length) {
      const p = choice(cand), w = windAt(p.x);
      if (Math.abs(w) > 0.35 || Math.random() < 0.25) {
        const petal = p.kind === 'flameTree' ? '#f0553f' : p.kind === 'frangipani' ? '#fffdf2' : choice(['#8fd070', '#7cc463', '#b9d96a', '#e9c46f']);
        fx.burst('leaf', p.x + rand(-20, 20), p.y + 2, 1, { z: rand(40, 70), up: 0, g: 9, speed: 22 + Math.abs(w) * 30, angle: w >= 0 ? 0 : Math.PI, spread: 0.6, life: 3.2, size: 2.4, col: petal });
      }
    }
  }
  for (const b of npcs.butterflies) {
    b.t += dt;
    b.vx += (Math.sin(b.t * 1.3) * 18 - b.vx) * dt; b.vy += (Math.cos(b.t * 0.9) * 12 - b.vy) * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
  }
}
export function npcDrawables() {
  const out = [];
  for (const d of npcs.ducks || []) out.push({ x: d.x, y: d.y, draw: (c, t) => { const hop = reactHop(d); c.save(); c.translate(0, -hop); if (d.peck > 0) { c.translate(0, 1.5); c.rotate((d.flip ? -1 : 1) * Math.sin(d.peck * 18) * 0.25); } c.scale(1.25, 1.25); duck(c, t, d); c.restore(); if (d.react && d.react.t < 0.8) { c.save(); c.globalAlpha = 1 - d.react.t / 0.8; ell(c, 0, 2, 6 + d.react.t * 16, 2 + d.react.t * 5, null, '#fff', 1); c.restore(); } drawReact(c, d, 14 + hop); } });
  for (const b of npcs.crumbs || []) out.push({ x: b.x, y: b.y, sortY: b.y + 2, draw: c => { if (b.z > 0) { c.save(); c.globalAlpha = 0.25; ell(c, 0, 0, 1.6, 0.8, '#2a4a50', null); c.restore(); } ell(c, 0, -b.z, 1.6, 1.3, '#e3b36a', 'rgba(91,63,54,.6)', 0.4); if (b.landed && b.landed < 0.6) { c.save(); c.globalAlpha = 1 - b.landed / 0.6; ell(c, 0, 0, 2 + b.landed * 12, 1 + b.landed * 4, null, '#fff', 0.8); c.restore(); } } });
  const f = ferryDrawable(); if (f) out.push(f);
  out.push(...animalDrawables());
  for (const sc of npcs.scooters) out.push(scooterDrawable(sc));
  for (const b of npcs.butterflies) out.push({ x: b.x, y: b.y, sortY: b.y + 30, draw: (c, t) => { c.save(); c.translate(0, -22 - Math.sin(b.t * 3) * 4); const f = Math.abs(Math.sin(b.t * 16)); c.fillStyle = b.col; c.strokeStyle = 'rgba(91,63,54,.7)'; c.lineWidth = 0.6; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 2.6 * f, -1, 2.6 * f + 0.4, 3, s * 0.4, 0, TAU); c.fill(); c.stroke(); } c.restore(); } });
  return out;
}
export function drawSkyLife(c, t) {
  if (G.scene !== G.scenes.island) return;
  drawSideQuests(c, t);
  drawBarks(c, t);
  for (const g of npcs.gulls) {
    const x = g.cx + Math.cos(g.a) * g.r, y = g.cy + Math.sin(g.a) * g.r * 0.6;
    c.save(); c.globalAlpha = 0.18; c.fillStyle = '#2a4a50'; c.beginPath(); c.ellipse(x + 16, y + g.h * 0.4, 5, 1.6, 0, 0, TAU); c.fill(); c.restore();
    c.save(); c.translate(x, y - g.h * 0.3); c.scale(Math.sign(Math.cos(g.a + Math.PI / 2) * g.sp) || 1, 1); seagull(c, t, g); c.restore();
  }
}
