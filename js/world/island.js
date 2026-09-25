// The island: terrain, ground painting (chunk-cached), animated water,
// buildings, scenery, collision and the NPC navigation graph.

import { smoothLoop, smoothLine, inPoly, distToLine, rng, clamp, TAU, shade, dist } from '../core/util.js';
import { Scene } from './scene.js';
import { INK, ell, circ, box, poly, line, text, star } from '../gfx/draw.js';
import { drawHuman } from '../gfx/character.js';
import * as P from '../gfx/props.js';
import * as B from '../gfx/buildings.js';
import { G } from '../systems/state.js';

export const W = 1800, H = 2600;

// ---------------------------------------------------------------- geometry
const SAND_CP = [[900, 170], [1120, 190], [1330, 260], [1500, 380], [1610, 560], [1650, 780], [1640, 1000], [1680, 1220], [1700, 1450], [1720, 1700], [1700, 1950], [1610, 2170], [1440, 2330], [1200, 2410], [900, 2440], [620, 2420], [400, 2340], [230, 2190], [140, 1980], [110, 1720], [100, 1450], [120, 1220], [130, 980], [170, 740], [260, 540], [410, 360], [610, 240]];
export const SAND = smoothLoop(SAND_CP, 10);
const CX = 900, CY = 1300;
function insetPoly(poly, fn) {
  const out = [];
  for (let i = 0; i < poly.length; i += 2) {
    const x = poly[i], y = poly[i + 1], dx = CX - x, dy = CY - y, d = Math.hypot(dx, dy) || 1, k = fn(x, y);
    out.push(x + (dx / d) * k, y + (dy / d) * k);
  }
  return out;
}
export const GRASS = insetPoly(SAND, (x, y) => 46 + 110 * clamp((y - 1980) / 280, 0, 1) + 70 * clamp((x - 1540) / 140, 0, 1) * clamp((y - 1760) / 260, 0, 1) + 20 * clamp((500 - x) / 200, 0, 1) * clamp((y - 1900) / 200, 0, 1));
const FOAM2 = insetPoly(SAND, () => -16);
const SHALLOW = insetPoly(SAND, () => -44);

export const RIVER = smoothLine([[706, 528], [650, 640], [580, 760], [490, 862], [380, 950], [250, 1030], [150, 1075], [60, 1100]], 8);
export const RIVER_W = 42;
export const POND = { x: 770, y: 478, rx: 82, ry: 52 };
export const PIER = { x: 872, y: 2400, w: 56, h: 205 };
export const PIER_END = { x: 820, y: 2560, w: 150, h: 46 };
export const BRIDGES = [{ x: 422, y: 846, w: 64, h: 86, deck: 'v' }, { x: 116, y: 1050, w: 56, h: 80, deck: 'v' }];
export const PLAZA = { x: 900, y: 1540, r: 104 };
export const NM_PLAZA = { x: 250, y: 470, w: 360, h: 330 };
export const PADDIES = [{ x: 1430, y: 880, w: 90, h: 70 }, { x: 1530, y: 880, w: 80, h: 70 }, { x: 1430, y: 962, w: 90, h: 70 }, { x: 1530, y: 962, w: 80, h: 70 }, { x: 1430, y: 1044, w: 180, h: 64 }];

// Paths: [points, width]
export const PATHS = {
  main: [[900, 2410], [900, 2250], [902, 2000], [904, 1760], [900, 1644]],
  beachW: [[900, 2252], [760, 2250], [600, 2236], [450, 2176], [330, 2066], [250, 1960]],
  beachE: [[900, 2252], [1060, 2250], [1230, 2236], [1380, 2196], [1500, 2100], [1580, 1990]],
  east: [[1000, 1580], [1120, 1690], [1260, 1766], [1420, 1766], [1560, 1720], [1610, 1640]],
  lane: [[1120, 1690], [1200, 1620], [1340, 1610], [1500, 1570]],
  north: [[900, 1436], [900, 1300], [900, 1186]],
  market: [[480, 1184], [700, 1190], [900, 1188], [1100, 1186], [1340, 1176], [1450, 1140]],
  west: [[800, 1560], [650, 1604], [500, 1600], [370, 1544], [270, 1440], [230, 1330]],
  linh: [[300, 1392], [270, 1440]],
  lan: [[690, 1458], [760, 1500], [812, 1520]],
  nw: [[480, 1184], [460, 1080], [456, 960], [454, 846], [440, 760]],
  nm: [[440, 760], [430, 520]],
  resto: [[1100, 1186], [1130, 1040], [1170, 900], [1200, 754]],
  north2: [[1170, 900], [1040, 760], [940, 620], [900, 330]],
  paddy: [[1200, 1040], [1420, 1040], [1520, 1040], [1620, 1040]],
  dinh: [[940, 620], [800, 590], [650, 440], [620, 392]],
  westCoast: [[230, 1330], [180, 1200], [150, 1090], [140, 1000], [200, 860], [300, 720]],
};
const PATH_W = 30;

// ---------------------------------------------------------------- building placements
// x,y = door threshold / front-centre base. fp = collision footprint depth.
export const BUILDINGS = [
  { id: 'shed1', type: 'shed', x: 600, y: 2206, w: 100, fp: 44, door: [32, 0], interior: 'shed1', biz: 'shed1' },
  { id: 'shed2', type: 'shed', x: 560, y: 1574, w: 100, fp: 44, door: [32, 0], interior: 'shed2', biz: 'shed2' },
  { id: 'truck', type: 'truck', x: 1420, y: 2152, w: 104, fp: 30, door: [44, 0], interior: 'truck', biz: 'truck' },
  { id: 'restaurant', type: 'restaurant', x: 1200, y: 742, w: 232, fp: 80, door: [0, 0], interior: 'restaurant', biz: 'restaurant' },
  { id: 'house', type: 'house', x: 1260, y: 1736, w: 118, fp: 58, door: [0, 0], interior: 'house', wall: '#f7dd8a', roof: '#d9784f', shutter: '#6fae7c', mailbox: true, chimney: true },
  { id: 'meo', type: 'meo', x: 1480, y: 1730, w: 110, fp: 56, door: [0, 0], interior: 'meo' },
  { id: 'supermarket', type: 'shop', kind: 'supermarket', x: 700, y: 1154, w: 150, fp: 60, door: [51, 0], interior: 'supermarket' },
  { id: 'materials', type: 'shop', kind: 'materials', x: 1090, y: 1154, w: 140, fp: 56, door: [48, 0], interior: 'materials', wall: '#e9ddd0' },
  { id: 'furniture', type: 'shop', kind: 'furniture', x: 1310, y: 1146, w: 140, fp: 56, door: [48, 0], interior: 'furniture', wall: '#f4e6d6' },
  // resident homes (not enterable)
  { id: 'h_batu', type: 'house', x: 420, y: 1546, w: 100, fp: 52, wall: '#f4c9c0', roof: '#c9674a', shutter: '#7aa38a', home: 'ba_tu' },
  { id: 'h_linh', type: 'house', x: 300, y: 1384, w: 100, fp: 52, wall: '#cfe6d8', roof: '#d9784f', shutter: '#e89a8a', home: 'linh' },
  { id: 'h_lan', type: 'house', x: 690, y: 1452, w: 100, fp: 52, wall: '#f9e2ee', roof: '#b8603f', shutter: '#9fb4dc', home: 'co_lan', label: 'HOA' },
  { id: 'h_tuan', type: 'house', x: 1140, y: 1652, w: 96, fp: 50, wall: '#d6e6f5', roof: '#c9674a', shutter: '#f2c14e', home: 'anh_tuan' },
  { id: 'h_mai', type: 'house', x: 1360, y: 1602, w: 96, fp: 50, wall: '#fbe7b6', roof: '#d9784f', shutter: '#6fae7c', home: 'chi_mai' },
  { id: 'h_hai', type: 'house', x: 1560, y: 1952, w: 96, fp: 50, wall: '#e8f1e6', roof: '#6f9fc8', shutter: '#e8584e', home: 'chu_hai' },
  { id: 'dinh', type: 'dinh', x: 620, y: 386, w: 170, fp: 60 },
];
export const STALLS = [
  { id: 'nm1', x: 340, y: 580, label: 'BÀ SÁU', goods: ['#f2c46b', '#e3703a'], cloth: ['#e8584e', '#fff5df'] },
  { id: 'nm2', x: 530, y: 580, label: 'CHÈ', goods: ['#a8423a', '#9fd67a'], cloth: ['#6fbfb0', '#fff5df'] },
  { id: 'nm3', x: 340, y: 670, label: 'ỐC', goods: ['#e0a052', '#fff5df'], cloth: ['#f2c14e', '#fff5df'] },
  { id: 'night', x: 530, y: 670, label: 'SẠP CỦA BẠN', goods: ['#f2c46b', '#a8423a'], cloth: ['#f08ca0', '#fff5df'], biz: 'night' },
  { id: 'nm5', x: 340, y: 760, label: 'NƯỚC MÍA', goods: ['#b9e08a', '#f7de8c'], cloth: ['#8fb7e0', '#fff5df'] },
  { id: 'nm6', x: 530, y: 760, label: 'XIÊN QUE', goods: ['#c96b45', '#e3703a'], cloth: ['#c9b6e8', '#fff5df'] },
];

// Where customers queue for each business (front of the service window).
export const QUEUES = {
  shed1: [[586, 2232], [560, 2240], [532, 2240], [504, 2232], [478, 2222]],
  shed2: [[546, 1600], [520, 1606], [494, 1606], [468, 1600], [442, 1592]],
  truck: [[1410, 2182], [1386, 2194], [1360, 2206], [1334, 2216], [1308, 2224], [1282, 2230]],
  night: [[505, 700], [482, 712], [458, 724], [440, 740], [438, 766]],
};

// ---------------------------------------------------------------- terrain tests
const inRect = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
export function onBridge(x, y) { return BRIDGES.some(b => inRect(b, x, y)); }
export function isWater(x, y) {
  if (inRect(PIER, x, y) || inRect(PIER_END, x, y)) return false;
  if (!inPoly(SAND, x, y)) return true;
  if (onBridge(x, y)) return false;
  if (distToLine(RIVER, x, y) < RIVER_W / 2) return true;
  const px = (x - POND.x) / POND.rx, py = (y - POND.y) / POND.ry;
  if (px * px + py * py < 1) return true;
  return false;
}
function isPaddy(x, y) { return PADDIES.some(p => inRect(p, x, y)); }

// ---------------------------------------------------------------- ground painter
function tracePoly(c, pts) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); }
function traceLine(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); }
const SMOOTH_PATHS = Object.fromEntries(Object.entries(PATHS).map(([k, p]) => [k, p.length > 2 ? chunkPts(smoothLine(p, 6)) : p]));
function chunkPts(flat) { const o = []; for (let i = 0; i < flat.length; i += 2) o.push([flat[i], flat[i + 1]]); return o; }

function paintGround(c) {
  // shallow water rings
  tracePoly(c, SHALLOW); c.fillStyle = 'rgba(140,222,222,.55)'; c.fill();
  tracePoly(c, FOAM2); c.fillStyle = 'rgba(170,234,228,.8)'; c.fill();
  // sand
  tracePoly(c, SAND); c.fillStyle = '#f5e2b3'; c.fill();
  c.strokeStyle = '#e8cf95'; c.lineWidth = 7; c.stroke();
  // sand speckles
  const R = rng(42);
  for (let i = 0; i < 2600; i++) {
    const x = R() * W, y = R() * H;
    if (!inPoly(SAND, x, y) || inPoly(GRASS, x, y)) continue;
    c.fillStyle = R() < 0.5 ? 'rgba(210,180,120,.35)' : 'rgba(255,255,240,.6)';
    c.fillRect(x, y, 2, 2);
  }
  // shells & starfish on the beach
  for (let i = 0; i < 90; i++) {
    const x = R() * W, y = R() * H;
    if (!inPoly(SAND, x, y) || inPoly(GRASS, x, y)) continue;
    if (R() < 0.3) { P.LIGHT; c.save(); c.translate(x, y); starfish(c, R()); c.restore(); }
    else { ell(c, x, y, 2.6, 1.8, R() < 0.5 ? '#fff4e8' : '#f7c9c0', 'rgba(120,90,70,.5)', 0.6); }
  }
  // grass
  tracePoly(c, GRASS); c.fillStyle = '#a3d68a'; c.fill();
  c.save(); c.clip();
  for (let i = 0; i < 520; i++) {
    const x = R() * W, y = R() * H, r = 20 + R() * 60;
    c.fillStyle = R() < 0.5 ? 'rgba(130,195,110,.35)' : 'rgba(190,230,150,.32)';
    c.beginPath(); c.ellipse(x, y, r, r * 0.6, 0, 0, TAU); c.fill();
  }
  for (let i = 0; i < 5200; i++) {
    const x = R() * W, y = R() * H;
    c.strokeStyle = R() < 0.6 ? 'rgba(90,150,70,.35)' : 'rgba(220,245,190,.5)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 1, y - 3); c.stroke();
  }
  // tiny flowers in the grass
  for (let i = 0; i < 700; i++) { const x = R() * W, y = R() * H; c.fillStyle = ['#fff', '#ffd35a', '#ff9ab5', '#c9a8ff'][i % 4]; c.beginPath(); c.arc(x, y, 1.3, 0, TAU); c.fill(); }
  c.restore();
  tracePoly(c, GRASS); c.strokeStyle = '#8cc472'; c.lineWidth = 4; c.stroke();
  c.strokeStyle = 'rgba(120,170,90,.5)'; c.lineWidth = 1.5; c.stroke();
  // rice paddies
  for (const p of PADDIES) {
    box(c, p.x - 4, p.y - 4, p.w + 8, p.h + 8, 6, '#b99a66', null);
    box(c, p.x, p.y, p.w, p.h, 4, '#8fcfc8', 'rgba(91,63,54,.5)', 1);
    for (let yy = p.y + 8; yy < p.y + p.h - 4; yy += 9) for (let xx = p.x + 7; xx < p.x + p.w - 4; xx += 9) { c.strokeStyle = '#6fb356'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(xx, yy + 3); c.lineTo(xx - 2, yy - 2); c.moveTo(xx, yy + 3); c.lineTo(xx + 2, yy - 2); c.stroke(); }
  }
  // night market plaza (stone)
  { const n = NM_PLAZA; box(c, n.x, n.y, n.w, n.h, 26, '#e3d6bd', 'rgba(150,120,90,.5)', 2); c.save(); box(c, n.x, n.y, n.w, n.h, 26, null, null); c.clip(); c.strokeStyle = 'rgba(160,130,100,.3)'; c.lineWidth = 1; for (let x = n.x; x < n.x + n.w; x += 22) { c.beginPath(); c.moveTo(x, n.y); c.lineTo(x, n.y + n.h); c.stroke(); } for (let y = n.y; y < n.y + n.h; y += 22) { c.beginPath(); c.moveTo(n.x, y); c.lineTo(n.x + n.w, y); c.stroke(); } c.restore(); }
  // paths: darker edge, then fill, then pebbles
  for (const pts of Object.values(SMOOTH_PATHS)) { traceLine(c, pts); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#d7b77e'; c.lineWidth = PATH_W + 6; c.stroke(); }
  for (const pts of Object.values(SMOOTH_PATHS)) { traceLine(c, pts); c.strokeStyle = '#efd8a6'; c.lineWidth = PATH_W; c.stroke(); }
  for (const pts of Object.values(SMOOTH_PATHS)) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], d = Math.hypot(bx - ax, by - ay);
      for (let k = 0; k < d; k += 9) { const tt = k / d, ox = (R() - 0.5) * PATH_W * 0.8, oy = (R() - 0.5) * PATH_W * 0.8; c.fillStyle = R() < 0.5 ? 'rgba(190,150,100,.4)' : 'rgba(255,250,230,.6)'; c.fillRect(ax + (bx - ax) * tt + ox, ay + (by - ay) * tt + oy, 2.2, 1.6); }
    }
  }
  // plaza with a tiled rosette
  { const p = PLAZA; circ(c, p.x, p.y, p.r + 6, '#d7b77e', null); circ(c, p.x, p.y, p.r, '#ecdcc0', 'rgba(150,120,90,.6)', 2);
    for (let r = 30; r < p.r; r += 22) circ(c, p.x, p.y, r, null, 'rgba(170,140,100,.35)', 1.2);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; line(c, p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, p.x + Math.cos(a) * p.r, p.y + Math.sin(a) * p.r, 'rgba(170,140,100,.3)', 1); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; circ(c, p.x + Math.cos(a) * (p.r - 12), p.y + Math.sin(a) * (p.r - 12), 3, '#e8584e', null); }
  }
  // river with banks
  const rl = chunkPts(RIVER);
  traceLine(c, rl); c.lineCap = 'round'; c.strokeStyle = '#d8c28c'; c.lineWidth = RIVER_W + 14; c.stroke();
  traceLine(c, rl); c.strokeStyle = '#6cc3cf'; c.lineWidth = RIVER_W; c.stroke();
  traceLine(c, rl); c.strokeStyle = '#86d3db'; c.lineWidth = RIVER_W * 0.55; c.stroke();
  // pond
  ell(c, POND.x, POND.y, POND.rx + 8, POND.ry + 7, '#d8c28c', null);
  ell(c, POND.x, POND.y, POND.rx, POND.ry, '#6cc3cf', 'rgba(91,63,54,.4)', 1.5);
  ell(c, POND.x - 10, POND.y - 6, POND.rx * 0.6, POND.ry * 0.5, '#86d3db', null);
  // rocks around the pond (the river's spring)
  for (let i = 0; i < 9; i++) { const a = Math.PI * 0.9 + i * 0.22; ell(c, POND.x + Math.cos(a) * (POND.rx + 4), POND.y + Math.sin(a) * (POND.ry + 3), 8, 5, '#c7c0b4', INK, 0.8); }
  // pier planks
  for (const r of [PIER, PIER_END]) {
    c.fillStyle = 'rgba(40,80,90,.25)'; c.fillRect(r.x + 4, r.y + 6, r.w, r.h);
    box(c, r.x, r.y, r.w, r.h, 3, '#c9955e', INK, 1.2);
    c.strokeStyle = '#a8763f'; c.lineWidth = 1;
    if (r === PIER) for (let y = r.y + 7; y < r.y + r.h; y += 7) { c.beginPath(); c.moveTo(r.x + 1, y); c.lineTo(r.x + r.w - 1, y); c.stroke(); }
    else for (let x = r.x + 7; x < r.x + r.w; x += 7) { c.beginPath(); c.moveTo(x, r.y + 1); c.lineTo(x, r.y + r.h - 1); c.stroke(); }
  }
  for (const [x, y] of [[870, 2440], [926, 2440], [870, 2520], [926, 2520], [818, 2606], [970, 2606], [894, 2608]]) { box(c, x - 4, y - 6, 8, 12, 2, '#8a5f3e', INK, 0.8); }
  // bridges
  for (const b of BRIDGES) {
    c.fillStyle = 'rgba(40,80,90,.2)'; c.fillRect(b.x + 4, b.y + 4, b.w, b.h);
    box(c, b.x, b.y, b.w, b.h, 4, '#d19a62', INK, 1.2);
    c.strokeStyle = '#a8763f'; c.lineWidth = 1;
    for (let y = b.y + 6; y < b.y + b.h; y += 6) { c.beginPath(); c.moveTo(b.x + 2, y); c.lineTo(b.x + b.w - 2, y); c.stroke(); }
  }
}
function starfish(c, r) { const col = r < 0.5 ? '#f7a36b' : '#f28f9a'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 1.7 : 4.2; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(120,70,50,.6)'; c.lineWidth = 0.6; c.stroke(); }

// Chunk cache so the heavy ground only paints once per zoom level.
const CHUNK = 400;
export class GroundCache {
  constructor() { this.map = new Map(); this.scale = 0; }
  get(ix, iy, scale) {
    if (Math.abs(scale - this.scale) > 0.01) { this.map.clear(); this.scale = scale; }
    const key = ix + ',' + iy;
    let e = this.map.get(key);
    if (!e) {
      const cv = document.createElement('canvas');
      const px = Math.ceil(CHUNK * scale);
      cv.width = px; cv.height = px;
      const c = cv.getContext('2d');
      c.scale(scale, scale); c.translate(-ix * CHUNK, -iy * CHUNK);
      c.lineJoin = 'round'; c.lineCap = 'round';
      paintGround(c);
      e = { cv, used: 0 };
      this.map.set(key, e);
      if (this.map.size > 20) { // evict least recently used
        let old = null, ou = Infinity; for (const [k, v] of this.map) if (v.used < ou && k !== key) { ou = v.used; old = k; }
        if (old) { const v = this.map.get(old); v.cv.width = v.cv.height = 0; this.map.delete(old); }
      }
    }
    e.used = performance.now();
    return e.cv;
  }
}

// ---------------------------------------------------------------- island scene
export class Island extends Scene {
  constructor() {
    super({ id: 'island', kind: 'island', w: W, h: H, spawn: { x: 900, y: 2560 } });
    this.cache = new GroundCache();
    this.buildings = {};
    this.build();
  }

  terrain(x, y) { return !isWater(x, y) && !isPaddy(x, y) && x > 0 && y > 0 && x < W && y < H; }

  add2(kind, x, y, o = {}) {
    const fn = P[kind];
    const p = { kind, x, y, ...o, draw: (c, t) => fn(c, t, p) };
    const r = o.cullR || 70;
    p.cull = o.cull || { x: x - r, y: y - (o.cullH || 140), w: r * 2, h: (o.cullH || 140) + 20 };
    this.prop(p);
    if (o.solidR) this.circle(x, y - 2, o.solidR);
    if (o.solidRect) this.solid(x + o.solidRect[0], y + o.solidRect[1], o.solidRect[2], o.solidRect[3]);
    return p;
  }

  build() {
    const R = rng(7);
    // ---- buildings
    for (const b of BUILDINGS) this.addBuilding(b);
    for (const s of STALLS) this.addStall(s);
    this.solid(PIER_END.x - 2, PIER_END.y + PIER_END.h - 4, PIER_END.w + 4, 8); // railing at pier end
    // ---- Night Market: lantern strings over the lane and around the square (dark until restored)
    const nmBroken = () => { const k = G.runtime?.nm?.restoreAnim; return k !== undefined && k !== null ? k < 0.55 : !G.state.nightMarket.restored; };
    for (const [x1, y1, x2, y2, h] of [[378, 540, 494, 540, 54], [378, 628, 494, 628, 54], [378, 716, 494, 716, 54], [262, 486, 596, 486, 60], [262, 486, 262, 790, 0], [300, 800, 420, 800, 48], [470, 800, 596, 800, 48]]) {
      if (!h) continue;
      const p = this.add2('lanternString', x1, y1, { x2, y2, h, n: Math.max(4, Math.round((x2 - x1) / 28)), cull: { x: x1 - 10, y: y1 - 90, w: x2 - x1 + 20, h: 100 }, cols: ['#ea5a4f', '#f2c14e', '#f08ca0', '#ea5a4f', '#6fbfb0'] });
      Object.defineProperty(p, 'broken', { get: nmBroken });
    }
    for (const [x, y] of [[268, 560], [268, 700], [590, 560], [590, 700]]) { const p = this.add2('lampPost', x, y, { solidR: 3, cullR: 40, cullH: 60 }); Object.defineProperty(p, 'broken', { get: nmBroken }); }
    // ---- decorations
    this.add2('welcomeGate', 900, 2396, { w: 104, cullR: 90, cullH: 110, label: () => (G.state.island.name || 'JEN Island').toUpperCase() });
    this.circle(848, 2394, 7); this.circle(952, 2394, 7);
    this.add2('lighthouse', 900, 300, { cullR: 40, cullH: 160, solidR: 16 });
    const fountain = this.add2('fountain', PLAZA.x, PLAZA.y + 16, { cullR: 60, cullH: 130, solidR: 40 });
    const baseDraw = fountain.draw;
    fountain.draw = (c, t) => { baseDraw(c, t); if (G.state.statue) drawFounderStatue(c, t); };
    // plaza banyan & benches
    this.add2('banyan', 700, 1690, { s: 0.9, cullR: 110, cullH: 150, solidR: 14 });
    for (const [x, y] of [[830, 1640], [970, 1640], [830, 1450], [970, 1450]]) this.add2('bench', x, y, { solidRect: [-18, -8, 36, 8] });
    // lantern strings over the market street
    for (let i = 0; i < 4; i++) this.add2('lanternString', 560 + i * 200, 1214, { x2: 560 + i * 200 + 150, h: 50, cullR: 160, cullH: 80, cull: { x: 560 + i * 200 - 10, y: 1150, w: 180, h: 80 } });
    this.add2('foodCart', 810, 1222, { label: 'BÁNH MÌ', solidRect: [-20, -8, 40, 8] });
    this.add2('foodCart', 1000, 1224, { label: 'KEM', solidRect: [-20, -8, 40, 8] });
    for (const [x, y, col] of [[780, 1232, '#e8584e'], [830, 1236, '#6f9fc8'], [980, 1236, '#e8584e'], [1025, 1236, '#6fbf73']]) this.add2('stool', x, y, { col });
    this.add2('lowTable', 805, 1244, {});
    // signposts
    this.add2('signpost', 940, 2300, { signs: [{ label: 'CHỢ', dir: 1 }, { label: 'BÃI BIỂN', dir: -1 }, { label: 'NHÀ', dir: 1 }], solidR: 3 });
    this.add2('signpost', 942, 1330, { signs: [{ label: 'CHỢ ĐÊM', dir: -1 }, { label: 'NHÀ HÀNG', dir: 1 }], solidR: 3 });
    // scooters parked along the street
    this.add2('scooter', 620, 1238, { col: '#f28f7c', basket: true });
    this.add2('scooter', 1180, 1234, { col: '#9fd8c8', flip: true });
    this.add2('scooter', 1030, 1680, { col: '#f7de8c' });
    // beach
    for (const [x, y, c1] of [[700, 2330, '#f28f7c'], [1120, 2350, '#6fbfb0'], [1300, 2300, '#f7de8c'], [480, 2270, '#c9b6e8']]) { this.add2('umbrella', x, y, { col: c1, cullR: 40, cullH: 60 }); this.add2('lounger', x + 26, y + 6, {}); }
    for (const [x, y, w] of [[1610, 2120, false], [1648, 2060, false], [1680, 2200, true], [1520, 2290, true]]) this.add2('basketBoat', x, y, { water: w, oar: true, solidR: w ? 0 : 14 });
    for (const [x, y] of [[1300, 2510], [560, 2500], [1720, 1300]]) this.add2('fishingBoat', x, y, { cullR: 60, cullH: 60, flip: x < 900 });
    for (const [x, y] of [[760, 2560], [1060, 2540], [1780, 900]]) this.add2('buoy', x, y, {});
    this.add2('clothesline', 1520, 1880, { w: 50 });
    this.add2('crate', 1612, 1900, { fruit: '#a6c7d8' });
    // paddy life
    this.add2('buffalo', 1400, 1136, { solidR: 16 });
    this.add2('haystack', 1640, 1100, { solidR: 14 });
    this.add2('shrine', 1180, 1030, { solidR: 8 });
    // pond lotus
    for (let i = 0; i < 9; i++) { const a = R() * TAU, rr = R() * 0.7; this.add2('lotus', POND.x + Math.cos(a) * POND.rx * rr, POND.y + Math.sin(a) * POND.ry * rr, { flower: i % 3 === 0, cullR: 12, cullH: 16 }); }
    // lamp posts
    for (const [x, y] of [[872, 2268], [930, 2006], [872, 1740], [930, 1300], [560, 1160], [1240, 1160], [1150, 1700], [440, 1620], [1160, 960], [960, 700], [476, 1040]]) this.add2('lampPost', x, y, { solidR: 3, cullR: 40, cullH: 60 });
    // pots and flowers by buildings
    for (const [x, y] of [[640, 1162], [760, 1162], [1400, 1742], [1540, 1740], [1200, 1744], [1330, 1742]]) this.add2('pot', x, y, { flowers: ['#ff8fb0', '#ffd35a', '#fff'][((x + y) | 0) % 3], solidR: 5 });
    // ---- vegetation (scattered with spacing rules)
    const avoid = (x, y, r) => {
      if (!this.terrain(x, y) || !inPoly(GRASS, x, y)) return true;
      for (const pts of Object.values(PATHS)) { const flat = pts.flat(); if (distToLine(flat, x, y) < PATH_W / 2 + r) return true; }
      if (dist(x, y, PLAZA.x, PLAZA.y) < PLAZA.r + r + 10) return true;
      if (x > NM_PLAZA.x - r && x < NM_PLAZA.x + NM_PLAZA.w + r && y > NM_PLAZA.y - r && y < NM_PLAZA.y + NM_PLAZA.h + r) return true;
      for (const b of BUILDINGS) if (x > b.x - b.w / 2 - r - 6 && x < b.x + b.w / 2 + r + 6 && y > b.y - b.fp - 40 - r && y < b.y + 36 + r) return true;
      for (const s of this.circles) if (dist(x, y, s.x, s.y) < s.r + r + 6) return true;
      if (distToLine(RIVER, x, y) < RIVER_W / 2 + r + 6) return true;
      if (Math.hypot((x - POND.x) / (POND.rx + r + 10), (y - POND.y) / (POND.ry + r + 10)) < 1) return true;
      if (PADDIES.some(p => x > p.x - r - 8 && x < p.x + p.w + r + 8 && y > p.y - r - 8 && y < p.y + p.h + r + 16)) return true;
      return false;
    };
    const place = (kind, n, r, o = {}, filt = null) => {
      let tries = 0, made = 0;
      while (made < n && tries++ < n * 60) {
        const x = 140 + R() * (W - 280), y = 220 + R() * (H - 400);
        if (filt && !filt(x, y)) continue;
        if (avoid(x, y, r)) continue;
        this.add2(kind, x, y, { ...o, s: o.s ? o.s * (0.85 + R() * 0.3) : undefined, solidR: o.trunk ?? 6, cullR: o.cullR || 70, cullH: o.cullH || 130 });
        made++;
      }
    };
    // palms hug the coast
    const inner = insetPoly(GRASS, () => 70);
    const nearCoast = (x, y) => !inPoly(inner, x, y);
    place('palm', 34, 16, { trunk: 5, cullR: 60, cullH: 110 }, nearCoast);
    place('flameTree', 9, 30, { trunk: 7 }, (x, y) => y > 1300 && y < 2100);
    place('tree', 36, 26, { trunk: 7 });
    place('tree', 10, 26, { trunk: 7, fruit: '#ffb74a' });
    place('bamboo', 12, 18, { trunk: 12, cullR: 40, cullH: 120 }, (x, y) => y < 1400);
    place('banana', 14, 14, { trunk: 5, cullR: 40, cullH: 70 });
    place('bush', 46, 14, { trunk: 9, cullR: 30, cullH: 40 });
    place('bush', 26, 14, { trunk: 9, flowers: '#f36d86', col: '#6fb356', cullR: 30, cullH: 40 });
    place('bush', 14, 14, { trunk: 9, flowers: '#e97ad0', col: '#7cc463', cullR: 30, cullH: 40 }); // bougainvillea
    place('rock', 14, 12, { trunk: 10, cullR: 20, cullH: 20 });
    // non-colliding ground clutter
    for (let i = 0; i < 520; i++) {
      const x = 140 + R() * (W - 280), y = 200 + R() * (H - 360);
      if (avoid(x, y, 2)) continue;
      const k = R() < 0.72 ? 'grassTuft' : 'flowerPatch';
      const p = { kind: k, x, y, col: R() < 0.5 ? '#6fb356' : '#7fc062', n: 3 + (R() * 4 | 0) };
      p.draw = (c, t) => P[k](c, t, p); p.cull = { x: x - 14, y: y - 14, w: 28, h: 18 }; p.flat = true;
      this.prop(p);
    }
    this.buildNav();
  }

  addBuilding(b) {
    const draw = { shed: B.drawShed, house: B.drawHouse, meo: B.drawMeoHouse, shop: B.drawShop, restaurant: B.drawRestaurant, truck: B.drawFoodTruck, dinh: B.drawDinh }[b.type];
    const bld = { ...b, doorOpen: 0, doorTarget: 0, state: () => this.buildingState(b) };
    bld.draw = (c, t) => draw(c, t, bld);
    bld.cull = { x: b.x - b.w / 2 - 30, y: b.y - 190, w: b.w + 60, h: 210 };
    bld.isBuilding = true;
    this.prop(bld);
    this.buildings[b.id] = bld;
    this.solid(b.x - b.w / 2, b.y - b.fp, b.w, b.fp - 2, { building: b.id });
    if (b.interior) {
      const dx = b.door[0];
      this.trigger({ id: 'door:' + b.id, kind: 'door', x: b.x + dx - 13, y: b.y - 6, w: 26, h: 22, building: b.id, interior: b.interior, doorX: b.x + dx, doorY: b.y });
    }
    if (b.biz && b.type !== 'restaurant') {
      // talk/serve spot in front of the service window
      this.trigger({ id: 'front:' + b.id, kind: 'front', x: b.x - 50, y: b.y - 4, w: 70, h: 40, building: b.id, biz: b.biz });
    }
  }
  addStall(s) {
    const st = { ...s, type: 'stall', w: 66, state: () => this.stallState(s) };
    st.draw = (c, t) => B.drawNightStall(c, t, st);
    st.cull = { x: s.x - 50, y: s.y - 110, w: 100, h: 125 };
    st.isBuilding = true;
    this.prop(st);
    this.buildings[s.id] = st;
    this.solid(s.x - 33, s.y - 30, 66, 28, { building: s.id });
    if (s.biz) this.trigger({ id: 'front:' + s.id, kind: 'front', x: s.x - 40, y: s.y - 4, w: 80, h: 34, building: s.id, biz: s.biz });
  }

  buildingState(b) {
    const s = G.state, rt = G.runtime?.biz?.[b.biz || b.id] || {};
    if (b.biz) {
      const bz = s.biz[b.biz];
      return { repair: rt.repairAnim ?? bz.repair, level: bz.level, open: bz.open, owned: bz.owned, sign: bizSign(b.biz), flapOpen: rt.flap, signFlip: rt.signFlip, color: b.biz === 'shed2' ? '#fde2c4' : '#f7e3c0', roof: b.biz === 'shed2' ? '#f28f7c' : '#6fbfb0', signCol: b.biz === 'shed2' ? '#e8a24a' : '#e8584e', awning: b.biz === 'shed2' ? ['#fff5df', '#e8a24a'] : ['#fff5df', '#f28f7c'] };
    }
    return {};
  }
  stallState(s) {
    const nm = G.state.nightMarket, rt = G.runtime?.nm || {};
    const k = rt.restoreAnim ?? (nm.restored ? 1 : 0);
    const night = (G.state.time >= 17 * 60);
    if (s.biz) { const bz = G.state.biz[s.biz]; return { repair: k, open: bz.open }; }
    return { repair: k, open: k >= 1 && night };
  }

  buildNav() {
    const nav = this.nav;
    for (const [name, pts] of Object.entries(PATHS)) nav.addLine(pts, ['path', name], 26);
    // plaza ring
    const ring = [];
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; ring.push([PLAZA.x + Math.cos(a) * (PLAZA.r - 8), PLAZA.y + Math.sin(a) * (PLAZA.r - 8)]); }
    ring.push(ring[0]);
    nav.addLine(ring, ['plaza'], 40);
    nav.densify(70);
    // spots with activities
    const spot = (x, y, tags, linkTo) => { const n = nav.add(x, y, tags); const near = linkTo ? nav.nearest(linkTo[0], linkTo[1], m => m !== n) : nav.nearest(x, y, m => m !== n && m.tags.has('path')); nav.link(n, near); return n; };
    for (const [x, y] of [[700, 2300], [1120, 2320], [1300, 2270], [480, 2240], [1000, 2340], [800, 2350]]) spot(x, y, ['beach', 'spot']);
    for (const [x, y] of [[830, 1650], [970, 1650], [830, 1460], [970, 1460]]) spot(x, y + 6, ['bench', 'spot', 'sit']);
    spot(900, 2575, ['dock', 'spot']); spot(860, 2580, ['dock', 'spot']);
    for (const [x, y] of [[790, 1250], [1010, 1252], [700, 1206], [1090, 1206], [1310, 1196]]) spot(x, y, ['market', 'spot']);
    for (const [x, y] of [[400, 620], [470, 620], [400, 710], [470, 710], [430, 800]]) spot(x, y, ['nightmarket', 'spot'], [436, 700]);
    for (const [x, y] of [[760, 560], [1250, 1060], [950, 360], [1500, 1150]]) spot(x, y, ['view', 'spot']);
    for (const b of BUILDINGS) if (b.home) spot(b.x, b.y + 10, ['home:' + b.home]);
    for (const [id, q] of Object.entries(QUEUES)) spot(q[0][0], q[0][1] + 8, ['queue:' + id]);
    spot(1200, 760, ['door:restaurant']);
  }

  // ---------------------------------------------------------------- per-frame water
  drawWater(c, view, t) {
    const { x, y, w, h } = view;
    c.fillStyle = '#5ec2cf'; c.fillRect(x - 2, y - 2, w + 4, h + 4);
    // darker deep water further from the island
    // wave glints
    const g = 64, x0 = Math.floor(x / g) * g, y0 = Math.floor(y / g) * g;
    c.lineCap = 'round';
    for (let gy = y0; gy < y + h + g; gy += g) for (let gx = x0; gx < x + w + g; gx += g) {
      const hsh = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
      const ox = (hsh % 40) - 20, oy = ((hsh >> 8) % 40) - 20;
      const px = gx + ox + Math.sin(t * 0.6 + hsh) * 6, py = gy + oy + Math.cos(t * 0.5 + hsh) * 2;
      const a = 0.18 + 0.2 * Math.sin(t * 1.3 + (hsh % 13));
      if (a < 0.05) continue;
      c.strokeStyle = `rgba(255,255,255,${a})`; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(px - 7, py); c.quadraticCurveTo(px - 3.5, py - 3, px, py); c.quadraticCurveTo(px + 3.5, py - 3, px + 7, py); c.stroke();
      if ((hsh & 7) === 0) { const k = (Math.sin(t * 3 + hsh) + 1) / 2; if (k > 0.7) { c.fillStyle = `rgba(255,255,255,${(k - 0.7) * 2.6})`; c.beginPath(); c.arc(px + 12, py + 8, 1.4, 0, TAU); c.fill(); } }
    }
  }
  drawGround(c, view, t, scale) {
    const ix0 = Math.max(0, Math.floor(view.x / CHUNK)), iy0 = Math.max(0, Math.floor(view.y / CHUNK));
    const ix1 = Math.min(Math.ceil(W / CHUNK) - 1, Math.floor((view.x + view.w) / CHUNK)), iy1 = Math.min(Math.ceil(H / CHUNK) - 1, Math.floor((view.y + view.h) / CHUNK));
    for (let iy = iy0; iy <= iy1; iy++) for (let ix = ix0; ix <= ix1; ix++) {
      const cv = this.cache.get(ix, iy, scale);
      c.drawImage(cv, ix * CHUNK, iy * CHUNK, CHUNK + 0.5, CHUNK + 0.5);
    }
  }
  drawShore(c, view, t) {
    // animated foam lines hugging the beach
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    tracePoly(c, SAND);
    c.setLineDash([14, 20]); c.lineDashOffset = -t * 9;
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3.2; c.stroke();
    const k = (Math.sin(t * 0.9) + 1) / 2;
    tracePoly(c, FOAM2);
    c.setLineDash([22, 30]); c.lineDashOffset = t * 6;
    c.strokeStyle = `rgba(255,255,255,${0.25 + k * 0.35})`; c.lineWidth = 2.2; c.stroke();
    // river & pond flow
    c.setLineDash([6, 26]); c.lineDashOffset = -t * 24;
    c.beginPath(); c.moveTo(RIVER[0], RIVER[1]); for (let i = 2; i < RIVER.length; i += 2) c.lineTo(RIVER[i], RIVER[i + 1]);
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.stroke();
    c.setLineDash([]);
    for (let i = 0; i < 3; i++) { const kk = (t * 0.25 + i / 3) % 1; c.globalAlpha = 0.5 * (1 - kk); ell(c, 690 + i * 10, 520, 6 + kk * 20, 2 + kk * 6, null, '#fff', 1.2); }
    c.globalAlpha = 1;
    // bridge rails (over the ground, under characters would be wrong; they are thin so draw here)
    c.restore();
  }
}

// The founder statue: a stone likeness of the player rising from the fountain.
const STONE = { skin: '#dcd6cc', hair: '#b9b2a6', top: '#cfc8bc', bottom: '#bdb6aa', shoe: '#aaa396', legs: '#dcd6cc' };
function drawFounderStatue(c, t) {
  const L = G.player?.look; if (!L) return;
  const stone = { ...L, ...STONE, hatColor: '#cfc8bc', apron: L.apron ? '#e3ddd2' : undefined, backpack: undefined, flower: L.flower ? '#e3ddd2' : undefined, _c: null };
  box(c, -16, -46, 32, 14, 3, '#e9e2d4', INK, 1.2);
  box(c, -12, -58, 24, 12, 3, '#ddd6c8', INK, 1.1);
  text(c, (G.state.player.name || '').toUpperCase(), 0, -39, 5.6, '#8a7a6a', 900);
  c.save(); c.translate(0, -58); c.scale(1.5, 1.5);
  drawHuman(c, { look: stone, dir: 'down', moving: 0, walkPh: 0, seed: 1, emo: 'happy', blinkAmt: 0, act: 'wave', actT: 0.5, headTilt: 0 }, 0.5);
  c.restore();
  // a little sparkle now and then
  const k = (t * 0.4) % 1; if (k < 0.12) { c.globalAlpha = 1 - k / 0.12; star(c, 14, -110, 3 + k * 20, '#fff8d8', null, 0, 4, 0.3); c.globalAlpha = 1; }
}

export function bizSign(id) {
  const s = G.state;
  if (id === 'shed1') return 'TRÀ & CÀ PHÊ';
  if (id === 'shed2') return 'BÁNH MÌ';
  if (id === 'truck') return 'XE CUỐN';
  if (id === 'restaurant') return 'NHÀ HÀNG ' + (s.island.name || 'JEN').toUpperCase();
  if (id === 'night') return 'SẠP ĐÊM';
  return '';
}

// Named areas for the HUD location toast.
export const AREAS = [
  { name: 'Bến Tàu', en: 'Ferry Dock', test: (x, y) => y > 2380 },
  { name: 'Bãi Biển', en: 'Sunny Beach', test: (x, y) => y > 2150 || (x > 1450 && y > 1900) },
  { name: 'Quảng Trường', en: 'Banyan Plaza', test: (x, y) => dist(x, y, PLAZA.x, PLAZA.y) < 190 },
  { name: 'Phố Chợ', en: 'Market Street', test: (x, y) => y > 1060 && y < 1290 && x > 460 && x < 1480 },
  { name: 'Xóm Đông', en: 'East Village', test: (x, y) => x > 1040 && y > 1500 && y < 1900 },
  { name: 'Xóm Tây', en: 'West Village', test: (x, y) => x < 820 && y > 1290 && y < 1900 },
  { name: 'Chợ Đêm', en: 'Night Market', test: (x, y) => x < 640 && y < 840 },
  { name: 'Ruộng Lúa', en: 'Rice Paddies', test: (x, y) => x > 1360 && y > 820 && y < 1180 },
  { name: 'Đồi Nhà Hàng', en: 'Restaurant Hill', test: (x, y) => x > 1000 && y < 980 },
  { name: 'Ngọn Hải Đăng', en: 'Lighthouse Point', test: (x, y) => y < 420 },
  { name: 'Hồ Sen', en: 'Lotus Spring', test: (x, y) => dist(x, y, POND.x, POND.y) < 170 },
];
export function areaAt(x, y) { return AREAS.find(a => a.test(x, y)) || { name: 'Đảo', en: 'Island' }; }
