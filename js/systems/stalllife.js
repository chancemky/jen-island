// Night Market life around the stalls you don't own yet:
//  · each family walks in from off-screen a little after 17:00, steps behind their counter and
//    works it; at closing (23:00) they come out and walk off again — never popping in or out
//  · they have their own customers: visitors walk up, order, wait while it's made, then wander
//    off eating (or sit down at a table)
//  · now and then a group sits at one of the market's tables, eating and chatting
// Stalls you own are yours (their family has retired and doesn't come any more).
import { G, T } from './state.js';
import { Actor } from '../world/actor.js';
import { MERCHANTS, visitorLook } from '../data/looks.js';
import { QUEUES, NM_TABLES } from '../world/island.js';
import { BUSINESSES, RECIPES } from '../data/game.js';
import { cam } from '../world/render.js';
import { rand, choice, dist } from '../core/util.js';

const FAMILIES = [['nm1', 'ba_sau'], ['nm2', 0], ['nm3', 1], ['nm5', 2], ['nm6', 3]];
const OPEN = 17 * 60, CLOSE = 23 * 60;
// where people come from and go to: the market's edges (whichever is out of view is used)
const EDGES = [[435, 900], [180, 640], [700, 560], [435, 420], [200, 860], [680, 860]];
const TABLES = NM_TABLES;
const life = { custT: 4, groupT: 20, customers: [], groups: [] };

const hours = () => G.state.time;
const marketOpen = () => !!G.state.nightMarket?.restored && hours() >= OPEN && hours() < CLOSE;
const offView = (x, y, pad = 60) => { const v = cam.view; return !v || x < v.x - pad || x > v.x + v.w + pad || y < v.y - pad || y > v.y + v.h + pad; };
function edge(from) {
  const out = EDGES.filter(([x, y]) => offView(x, y));
  const list = out.length ? out : EDGES;
  return list.reduce((b, p) => (!b || dist(p[0], p[1], from[0], from[1]) < dist(b[0], b[1], from[0], from[1]) ? p : b), null);
}
const besideStall = b => [b.x + (b.x < 440 ? -44 : 44), b.y + 6];
// the hatch behind the counter (same as a hired shopkeeper's: see economy.js opening())
function behindCounter(a, b) {
  const w = b.w || 66, h = 30, o = { x: -w / 2 + 3, y: -h - 23, w: w - 6, h: 17, feet: -22 };
  a.x = b.x + (a.data.slot ? w / 2 - 14 : -w / 2 + 14); a.y = b.y + o.feet; a.sortY = b.y + 0.6;
  a.clip = { x: b.x + o.x, y: b.y + o.y, w: o.w, h: o.h };
}
function walk(island, a, to, then) {
  const route = island.nav.path(a.x, a.y, to[0], to[1]);
  a.walkTo(route.unreachable ? [to] : route.concat([to])).then(ok => then?.(ok));
}

export function updateStallLife(island, npcs, dt) {
  const s = G.state;
  if (!npcs.vendors) {
    npcs.vendors = FAMILIES.map(([st, who], i) => {
      const look = who === 'ba_sau' ? MERCHANTS.ba_sau.look : { ...visitorLook(9000 + i * 17, 'regular'), apron: '#fff6e6' };
      const a = new Actor({ kind: 'human', look, name: who === 'ba_sau' ? 'Bà Sáu' : T('Stall owner', 'Chủ sạp'), x: 0, y: 0, data: { vendor: st, mid: who === 'ba_sau' ? 'ba_sau' : null, phase: 'away', slot: i % 2, workT: 0, jitter: rand(0, 25) } });
      a.talkable = who === 'ba_sau'; a.visible = false; a.noCollide = true; a.face('down');
      island.add(a); return a;
    });
  }
  const open = marketOpen() || (G.runtime.nm?.restoreAnim ?? 0) > 0.5;
  for (const a of npcs.vendors) {
    const d = a.data, b = island.buildings[d.vendor]; if (!b || G.runtime.inCutscene) continue;
    const mine = s.biz[d.vendor]?.owned, want = open && !mine && hours() >= OPEN + d.jitter - (G.runtime.nm?.restoreAnim ? 99 : 0);
    if (d.phase === 'away' && want) {                                   // arrive from off-screen and walk to the stall
      const p = edge(besideStall(b)); a.clip = null; a.x = p[0]; a.y = p[1]; a.visible = true; a.alpha = undefined; d.phase = 'arriving';
      walk(island, a, besideStall(b), () => { if (d.phase !== 'arriving') return; d.phase = 'working'; behindCounter(a, b); a.face('down'); });
    } else if ((d.phase === 'working' || d.phase === 'arriving') && !want) {   // closing up: out from behind the counter and away
      a.clip = null; const p = besideStall(b); if (d.phase === 'working') { a.x = p[0]; a.y = p[1]; a.sortY = undefined; }
      d.phase = 'leaving';
      walk(island, a, edge(p), () => { if (d.phase !== 'leaving') return; a.fadeHide = true; d.phase = 'away'; });
    } else if (d.phase === 'working') {
      if (!a.clip) behindCounter(a, b);
      d.workT -= dt;
      if (d.workT <= 0 && !d.inTalk) {
        const busy = life.customers.some(c => c.stall === d.vendor && c.state === 'waiting');
        a.face(busy || Math.random() < 0.7 ? 'down' : d.slot ? 'left' : 'right');
        a.setAct(choice(busy ? ['stir', 'work', 'chop'] : ['stir', 'work', 'clean', null]));
        d.workT = busy ? rand(1.2, 2) : rand(2.5, 5);
        if (!busy && Math.random() < 0.08) a.showEmote(choice(['note', 'happy']), 1.4);
      }
    }
  }
  updateCustomers(island, npcs, dt, open);
}

// ---------------------------------------------------------------- customers and diners
function freeQueue(st) { const q = QUEUES[st]?.[0]; return q && !life.customers.some(c => c.stall === st && c.state !== 'leaving' && c.state !== 'eating') ? q : null; }
// what they walk off with: a cup for drinks, a bowl for food (as customers at your shops)
function dishOf(st) { const id = BUSINESSES[st]?.menu?.[0], v = RECIPES[id]?.vessel, drink = v === 'cup' || v === 'glass'; return { held: drink ? 'cup' : 'bowl', drink }; }
function spawnCustomer(island, npcs) {
  const working = npcs.vendors.filter(v => v.data.phase === 'working' && freeQueue(v.data.vendor)); if (!working.length) return;
  const v = choice(working), st = v.data.vendor, q = freeQueue(st), p = edge(q);
  const a = new Actor({ kind: 'human', look: visitorLook(Math.floor(rand(1, 99999)), 'tourist'), x: p[0], y: p[1], speed: rand(46, 58), data: { stallCustomer: true } });
  island.add(a);
  const c = { a, stall: st, state: 'walking', t: 0 }; life.customers.push(c);
  walk(island, a, q, ok => { if (!ok) { c.state = 'leaving'; return leave(island, c); } c.state = 'waiting'; c.t = rand(3, 5.5); a.face('up'); });
}
function leave(island, c) {
  c.state = 'leaving'; const a = c.a;
  walk(island, a, edge([a.x, a.y]), () => { a.fadeOut = true; });
}
function updateCustomers(island, npcs, dt, open) {
  const near = G.player && G.scene === island && dist(G.player.x, G.player.y, 435, 640) < 700;
  life.custT -= dt;
  if (open && near && life.custT <= 0 && life.customers.length < 9) { life.custT = rand(4, 9); spawnCustomer(island, npcs); }
  for (const c of [...life.customers]) {
    const a = c.a;
    if (!island.actors.includes(a)) { life.customers.splice(life.customers.indexOf(c), 1); continue; }
    if (c.state === 'waiting') {
      c.t -= dt;
      if (c.t <= 0) {                                         // served: off to eat it
        const dish = dishOf(c.stall); a.held = dish.held; a.face('down');
        const seat = freeSeat();
        if (seat && Math.random() < 0.5) { c.state = 'walking'; seat.who = a; walk(island, a, seat.at, ok => { if (!ok) { seat.who = null; return leave(island, c); } c.state = 'eating'; c.seat = seat; c.t = rand(20, 40); a.sit = true; a.seatH = 4; a.face(seat.face); a.setAct(dish.drink ? 'drink' : 'eat'); }); }
        else { c.state = 'eating'; c.t = rand(8, 14); a.setAct(dish.drink ? 'drink' : 'eat'); }
      }
    } else if (c.state === 'eating') {
      c.t -= dt;
      if (Math.random() < 0.004) a.showEmote(choice(['...', 'happy', 'heart']), 1.4);
      if (c.t <= 0 || !open && Math.random() < 0.02) { a.setAct(null); a.held = null; if (a.sit) { a.sit = false; a.seatH = undefined; a.y += 8; } if (c.seat) c.seat.who = null; leave(island, c); }
    }
  }
  // a group at a table, eating and chatting
  life.groupT -= dt;
  if (open && near && life.groupT <= 0) { life.groupT = rand(40, 80); seatGroup(island); }
}
// the seats round the two tables
let SEATS = null;
function seats() {
  if (SEATS) return SEATS;
  SEATS = [];
  for (const [x, y] of TABLES) for (const [dx, dy, face] of [[-22, 2, 'right'], [22, 2, 'left'], [0, 16, 'up']]) SEATS.push({ at: [x + dx, y + dy], face, who: null, table: [x, y] });
  return SEATS;
}
const freeSeat = () => seats().find(s => !s.who);
function seatGroup(island) {
  const free = seats().filter(s => !s.who), byTable = {}; for (const s of free) (byTable[s.table.join()] ||= []).push(s);
  const tbl = Object.values(byTable).sort((p, q) => q.length - p.length)[0]; if (!tbl || tbl.length < 2) return;
  const start = edge(tbl[0].at), dish = choice(['xien_nuong', 'oc_luoc', 'banh_trang_tron', 'che_ba_mau']);
  tbl.forEach((seat, i) => {
    const a = new Actor({ kind: 'human', look: visitorLook(Math.floor(rand(1, 99999)), 'regular'), x: start[0] + i * 10, y: start[1] + i * 6, speed: rand(48, 56), data: { stallCustomer: true } });
    island.add(a); seat.who = a;
    const c = { a, stall: null, state: 'walking', t: 0, seat }; life.customers.push(c);
    walk(island, a, seat.at, ok => {
      if (!ok) { seat.who = null; return leave(island, c); }
      c.state = 'eating'; c.t = rand(35, 60); a.sit = true; a.seatH = 4; a.face(seat.face);
      const drink = RECIPES[dish]?.vessel === 'glass'; a.held = drink ? 'cup' : 'bowl'; a.setAct(drink ? 'drink' : 'eat');
    });
  });
}
