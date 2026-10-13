// Island projects: big builds the player pays for that make the whole island prettier — lantern
// lights over Market Street, cabanas on the beach, a golden Mèo Mây at the dock… The biggest money
// goals in the game, and each one shows on the island for good (for everyone who visits too).
// Opened from the Island Board on Wind Plaza.

import { G, T, addMoney, canAfford, markDirty } from './state.js';
import { bus, money, rand } from '../core/util.js';
import { FURN_DRAW } from '../gfx/furniture.js';
import { fx } from '../world/render.js';
import { PLAZA } from '../world/island.js';

const ring = (cx, cy, r, n, a0 = 0) => Array.from({ length: n }, (_, i) => { const a = a0 + i / n * Math.PI * 2; return [Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.62)]; });
const along = (x0, y0, x1, y1, n) => Array.from({ length: n }, (_, i) => [Math.round(x0 + (x1 - x0) * i / (n - 1)), Math.round(y0 + (y1 - y0) * i / (n - 1))]);

export const PROJECTS = [
  { id: 'market_lights', cost: 12000, icon: '🏮', en: 'Lantern lights over Market Street', vi: 'Đèn lồng trên Phố Chợ', blurb: ['Two more rows of silk lanterns from end to end.', 'Thêm hai dãy lồng đèn lụa dọc cả con phố.'],
    props: () => [1150, 1290].flatMap(y => [0, 1, 2, 3].map(i => ['lanternString', 560 + i * 200, y, { sortY: 99990, x2: 560 + i * 200 + 150, h: 46, cull: { x: 560 + i * 200 - 10, y: y - 70, w: 180, h: 80 } }])) },
  { id: 'dock_flowers', cost: 18000, icon: '🌺', en: 'Flower beds up the dock road', vi: 'Luống hoa dọc đường bến tàu', blurb: ['Welcome every ferry with flowers on both sides of the road.', 'Đón mỗi chuyến phà bằng hoa hai bên đường.'],
    props: () => [818, 982].flatMap(x => along(x, 1800, x, 2230, 8).map(([px, py]) => ['flowerPatch', px, py, { cullR: 30, cullH: 30, flat: true }])) },
  { id: 'beach_cabanas', cost: 35000, icon: '⛱️', en: 'Cabanas on Sunny Beach', vi: 'Lều dù trên Bãi Biển', blurb: ['Striped parasols and loungers for the beach crowd.', 'Dù sọc và ghế nằm cho khách tắm biển.'],
    props: () => [[360, 2300], [470, 2318], [580, 2306], [300, 2228], [690, 2262]].flatMap(([x, y], i) => [['lounger', x + 10, y + 6, { cullR: 40, cullH: 30 }], ['umbrella', x, y, { col: ['#f28f7c', '#6fbfb0', '#f7de8c', '#8fb7e0', '#c9b6e8'][i], cullR: 50, cullH: 90 }]]) },
  { id: 'plaza_lamps', cost: 45000, icon: '💡', en: 'A ring of lamps round Wind Plaza', vi: 'Vòng đèn quanh Quảng trường gió', blurb: ['Eight iron lamps so the plaza glows every evening.', 'Tám cây đèn sắt cho quảng trường sáng rực mỗi tối.'],
    props: () => ring(PLAZA.x, PLAZA.y, 205, 8, Math.PI / 8).map(([x, y]) => ['lampPost', x, y, { cullR: 40, cullH: 60 }]) },
  { id: 'nm_canopy', cost: 60000, icon: '✨', en: 'A lantern canopy over the Night Market', vi: 'Mái lồng đèn trên Chợ Đêm', blurb: ['Strings of lanterns criss-crossing above the stalls.', 'Những dây lồng đèn đan chéo phía trên các sạp.'],
    props: () => [600, 645, 735, 780].map(y => ['lanternString', 270, y, { sortY: 99990, x2: 590, h: 34, n: 12, cull: { x: 260, y: y - 60, w: 340, h: 80 } }]) },
  { id: 'dock_arches', cost: 90000, icon: '🌸', en: 'Flower arches up to the plaza', vi: 'Cổng hoa lên quảng trường', blurb: ['A tunnel of bougainvillea arches from the dock to Wind Plaza.', 'Một đường cổng hoa giấy từ bến tàu lên Quảng trường gió.'],
    props: () => along(900, 1900, 900, 2180, 4).map(([x, y]) => ['flowerArch', x, y, { cullR: 60, cullH: 90 }]) },
  { id: 'golden_meo', cost: 250000, icon: '🐱', en: 'The Golden Mèo Mây statue', vi: 'Tượng Mèo Mây vàng', blurb: ['A giant golden Mèo Mây greeting every boat at the dock. She approves.', 'Một Mèo Mây vàng khổng lồ chào mọi con thuyền ở bến. Mèo Mây rất duyệt.'],
    props: () => [['goldMeo', 1035, 2338, { cullR: 70, cullH: 140, solidR: 0 }]] },
  { id: 'fireworks', cost: 400000, icon: '🎆', en: 'Fireworks every night at nine', vi: 'Pháo hoa mỗi tối lúc chín giờ', blurb: ['The island lights up the sky over Wind Plaza at 21:00, every night.', 'Hòn đảo bắn pháo hoa trên Quảng trường gió lúc 21:00, mỗi tối.'], props: () => [] },
];
const S = () => (G.state.projects ||= {});
export const projectDone = id => !!S()[id];
export const projectsDone = () => PROJECTS.filter(p => projectDone(p.id)).length;
export function fundProject(id) {
  const P = PROJECTS.find(p => p.id === id); if (!P || projectDone(id) || !canAfford(P.cost)) return false;
  addMoney(-P.cost, 'build'); S()[id] = G.state.day; markDirty(true);
  bus.emit('project', id); bus.emit('stinger', 'newshop');
  bus.emit('toast', { text: T(`${P.en} — done!`, `${P.vi} — xong rồi!`), sub: T('The whole island is talking about it.', 'Cả đảo đang bàn tán về nó.'), icon: 'star', cls: 'ach', ms: 4200 });
  return true;
}
// the golden statue: Mèo Mây's own statue, three times the size
const goldMeo = (c, t, p) => { c.save(); c.scale(3, 3); FURN_DRAW.meo_statue?.(c, t, { ...p, x: 0, y: 0 }); c.restore(); };
// called once when the island is built: every project's pieces, hidden until it's paid for
export function placeProjects(isl) {
  for (const P of PROJECTS) for (const [kind, x, y, o] of P.props()) {
    const p = kind === 'goldMeo' ? isl.prop({ kind, x, y, draw: (c, t) => goldMeo(c, t, p), cull: { x: x - 70, y: y - 150, w: 140, h: 170 } }) : isl.add2(kind, x, y, o);
    if (p) p.hidden = () => !projectDone(P.id);
  }
}
// the fireworks: twenty-five minutes of bursts over the plaza from 21:00 — drawn on top of the
// night (they're light), as rising trails that open into rings of sparks
const shells = [];
export function updateProjects(dt) {
  for (const f of shells) { f.t += dt; for (const q of f.sparks) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 26 * dt; q.vx *= 0.985; } }
  while (shells.length && shells[0].t > 2.6) shells.shift();
  if (!projectDone('fireworks') || !G.scene || G.scene !== G.scenes?.island) return;
  const m = G.state.time % (24 * 60); if (m < 21 * 60 || m > 21 * 60 + 25) return;
  if ((fwT -= dt) > 0) return;
  fwT = rand(0.45, 1.1);
  const x = PLAZA.x + rand(-150, 150), y = PLAZA.y - rand(40, 130), col = ['#ffd35a', '#f36d86', '#8fe0ff', '#9fe07a', '#c9a6ff'][Math.floor(rand(0, 5))], n = 34;
  shells.push({ x, y, x0: x + rand(-20, 20), y0: PLAZA.y - 20, t: 0, col, sparks: Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, v = rand(62, 84); return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v }; }) });
  bus.emit('sfx', 'pop');
}
let fwT = 0;
export function drawFireworks(c) {
  if (!shells.length) return;
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (const f of shells) {
    if (f.t < 0.55) { const k = f.t / 0.55, y = f.y0 + (f.y - f.y0) * k, x = f.x0 + (f.x - f.x0) * k; c.strokeStyle = 'rgba(255,240,200,.85)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y + 10); c.lineTo(x, y); c.stroke(); continue; }
    const a = Math.max(0, 1 - (f.t - 0.55) / 2); c.fillStyle = f.col; c.globalAlpha = a;
    c.strokeStyle = f.col; c.lineWidth = 1.6;
    for (const q of f.sparks) { c.beginPath(); c.moveTo(q.x - q.vx * 0.09, q.y - q.vy * 0.09); c.lineTo(q.x, q.y); c.stroke(); c.beginPath(); c.arc(q.x, q.y, 2.4, 0, Math.PI * 2); c.fill(); }   // (each spark with a short trail)
    if (f.t < 0.75) { c.globalAlpha = (0.75 - f.t) * 3; c.beginPath(); c.arc(f.x, f.y, 20, 0, Math.PI * 2); c.fill(); }
  }
  c.restore();
}
export function projectMoney(P) { return money(P.cost); }
