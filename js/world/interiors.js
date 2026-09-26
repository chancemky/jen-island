// Building interiors. Each is a small cut-away room: back wall at the top,
// floor below, a low front ledge with the doorway at the bottom.

import { Scene } from './scene.js';
import { F } from '../gfx/furniture.js';
import { INK, ell, circ, box, line, text, shadow } from '../gfx/draw.js';
import { shade, rng, TAU } from '../core/util.js';
import { LIGHT } from '../gfx/props.js';
import * as PR from '../gfx/props.js';
import { G } from '../systems/state.js';
import { drawHuman } from '../gfx/character.js';

export class Interior extends Scene {
  constructor(o) {
    super({ ...o, kind: 'interior', bg: o.bg || '#2b221e' });
    this.WH = o.WH ?? 62;             // back wall height
    this.wall = o.wall || '#f7e6c8';
    this.wall2 = o.wall2 || shade(this.wall, -10);
    this.floor = o.floor || '#d9a870';
    this.floorStyle = o.floorStyle || 'wood';
    this.wallStyle = o.wallStyle || 'stripe';
    this.door = o.door || { x: this.w / 2, w: 30 };
    this.outside = o.outside || 0;    // height of the outdoor strip below the room (service windows)
    this.bottomPad = this.outside;
    this.fitW = o.fitW || this.w + 26;
    this.entry = { x: this.door.x, y: this.h - 14 };
    this.building = o.building;
    // exit through the doorway
    this.trigger({ id: 'exit', kind: 'exit', x: this.door.x - this.door.w / 2, y: this.h - 10, w: this.door.w, h: 26 });
    this.front = this.prop({ x: 0, y: this.h + 2, sortY: this.h + 2, draw: (c, t) => this.drawLedge(c, t), cull: { x: -10, y: this.h - 20, w: this.w + 20, h: 40 } });
    this.doorOpen = 0;
  }
  terrain(x, y) {
    const inDoor = Math.abs(x - this.door.x) < this.door.w / 2 - 2 && y < this.h + 18;
    return x > 10 && x < this.w - 10 && y > this.WH + 6 && (y < this.h - 3 || inDoor);
  }
  furn(kind, x, y, o = {}, solid = null) {
    const p = { kind, x, y, ...o };
    if (kind === 'rug' || kind === 'mat' || kind === 'cat_bed') p.flat = true;   // floor coverings (and the cat bed) sit under everyone
    p.draw = (c, t) => F[kind](c, t, p);
    p.cull = { x: x - 80, y: y - 90, w: 160, h: 110 };
    this.prop(p);
    if (solid) this.solid(x + solid[0], y + solid[1], solid[2], solid[3], { furn: kind });
    return p;
  }
  wallItem(kind, x, o = {}) { const p = this.furn(kind, x, this.WH, o); p.sortY = -1; return p; }

  drawBackground(c, v, t) {
    const { w, h, WH } = this;
    // floor
    box(c, 0, WH - 4, w, h - WH + 4, 4, this.floor, null);
    c.save(); c.beginPath(); c.rect(0, WH, w, h - WH); c.clip();
    if (this.floorStyle === 'wood') { const R2 = rng(11); for (let y = WH; y < h; y += 12) { let x = -R2() * 40; while (x < w) { const pw = 34 + R2() * 40; c.fillStyle = shade(this.floor, (R2() - 0.5) * 16); c.fillRect(x, y, pw, 12); if (R2() < 0.35) { c.fillStyle = 'rgba(120,70,40,.18)'; c.beginPath(); c.ellipse(x + pw * R2(), y + 6, 2, 1, 0, 0, TAU); c.fill(); } x += pw; } } }
    if (this.floorStyle === 'wood') { c.strokeStyle = shade(this.floor, -20); c.lineWidth = 1; for (let y = WH + 12; y < h; y += 12) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); const R = rng(y); for (let k = 0; k < 4; k++) { const x = R() * w; c.beginPath(); c.moveTo(x, y - 12); c.lineTo(x, y); c.stroke(); } } }
    else if (this.floorStyle === 'tile') { const s = 22; for (let y = WH, r = 0; y < h; y += s, r++) for (let x = 0, k = 0; x < w; x += s, k++) { c.fillStyle = (r + k) % 2 ? shade(this.floor, -10) : this.floor; c.fillRect(x, y, s, s); } }
    else if (this.floorStyle === 'concrete') { const R = rng(3); for (let i = 0; i < 120; i++) { c.fillStyle = 'rgba(0,0,0,.05)'; c.fillRect(R() * w, WH + R() * (h - WH), 3, 2); } }
    else if (this.floorStyle === 'rubber') { c.strokeStyle = shade(this.floor, -14); c.lineWidth = 1.2; for (let x = 6; x < w; x += 8) { c.beginPath(); c.moveTo(x, WH); c.lineTo(x, h); c.stroke(); } }
    // soft light pool from the door and a vignette
    const g = c.createRadialGradient(this.door.x, h, 10, this.door.x, h, 140); g.addColorStop(0, 'rgba(255,240,200,.28)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(0, WH, w, h - WH);
    c.fillStyle = 'rgba(80,50,40,.12)'; c.fillRect(0, WH, w, 10);
    c.restore();
    // back wall
    box(c, 0, 0, w, WH, 3, this.wall, null);
    c.save(); c.beginPath(); c.rect(0, 0, w, WH); c.clip();
    if (this.wallStyle === 'stripe') { c.fillStyle = this.wall2; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 7, WH); }
    else if (this.wallStyle === 'tile') { c.strokeStyle = shade(this.wall, -14); c.lineWidth = 0.8; for (let y = 8; y < WH; y += 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } for (let x = 0; x < w; x += 10) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, WH); c.stroke(); } }
    else if (this.wallStyle === 'brick') { c.strokeStyle = shade(this.wall, -16); c.lineWidth = 0.8; for (let y = 0, r = 0; y < WH; y += 8, r++) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (r % 2) * 10; x < w; x += 20) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 8); c.stroke(); } } }
    else if (this.wallStyle === 'paw') { const R = rng(9); for (let i = 0; i < 26; i++) { const x = R() * w, y = 6 + R() * (WH - 16); c.fillStyle = 'rgba(255,255,255,.55)'; circ(c, x, y, 2.2, 'rgba(255,255,255,.55)', null); for (const [dx, dy] of [[-2.4, -2.6], [0, -3.6], [2.4, -2.6]]) circ(c, x + dx, y + dy, 1, 'rgba(255,255,255,.55)', null); } }
    else if (this.wallStyle === 'dots') { const R = rng(4); for (let y = 8, r = 0; y < WH - 4; y += 12, r++) for (let x = (r % 2) * 9; x < w; x += 18) circ(c, x + R() * 0.1, y, 2.2, 'rgba(255,255,255,.7)', null); c.fillStyle = shade(this.wall, -12); c.fillRect(0, WH - 16, w, 3); }
    else if (this.wallStyle === 'metal') { c.fillStyle = 'rgba(255,255,255,.18)'; for (let x = 0; x < w; x += 14) c.fillRect(x, 0, 2, WH); }
    c.restore();
    // wainscot panels + rail + baseboard, crown molding, soft window light
    box(c, 0, WH - 16, w, 12, 0, shade(this.wall, -18), null);
    c.strokeStyle = shade(this.wall, -30); c.lineWidth = 0.7; for (let x = 10; x < w; x += 20) { c.beginPath(); c.moveTo(x, WH - 14); c.lineTo(x, WH - 6); c.stroke(); }
    box(c, 0, WH - 6, w, 6, 0, shade(this.wall, -40), null);
    line(c, 0, WH - 16, w, WH - 16, 'rgba(91,63,54,.5)', 1);
    line(c, 0, WH - 15, w, WH - 15, 'rgba(255,255,255,.35)', 0.8);
    box(c, 0, 0, w, 4, 0, shade(this.wall, -12), null); line(c, 0, 4, w, 4, 'rgba(91,63,54,.3)', 0.8);
    { const lg = c.createLinearGradient(0, 0, w * 0.6, h); lg.addColorStop(0, 'rgba(255,248,220,.16)'); lg.addColorStop(1, 'rgba(255,248,220,0)'); c.fillStyle = lg; c.beginPath(); c.moveTo(w * 0.15, WH); c.lineTo(w * 0.35, WH); c.lineTo(w * 0.7, h); c.lineTo(w * 0.35, h); c.closePath(); c.fill(); }
    box(c, 0, 0, w, WH, 3, null, INK, 1.4);
    // side walls (thin)
    box(c, -8, 0, 10, h + 10, 3, shade(this.wall, -30), INK, 1.2);
    box(c, w - 2, 0, 10, h + 10, 3, shade(this.wall, -30), INK, 1.2);
    if (this.outside) this.drawOutside(c, t);
    // doormat is part of the floor so feet never slip under it
    box(c, this.door.x - this.door.w / 2 + 1, this.h - 14, this.door.w - 2, 12, 3, '#e89a8a', INK, 0.8);
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; for (let i = 1; i < 4; i++) { const x = this.door.x - this.door.w / 2 + 1 + i * (this.door.w - 2) / 4; c.beginPath(); c.moveTo(x, this.h - 12); c.lineTo(x, this.h - 4); c.stroke(); }
  }
  // ---- 1: an unmistakable way out: glowing doorway, frame and a bouncing EXIT arrow
  drawOver(c, v, t) {
    const { door, h } = this, pl = G.player;
    const near = pl && Math.hypot(pl.x - door.x, pl.y - h) < 70;
    const k = near ? 1 : 0.7;
    const bob = Math.sin(t * 4) * 3;
    const y = h - 44 + bob;
    c.save(); c.globalAlpha = k;
    // arrow
    c.beginPath(); c.moveTo(door.x - 9, y); c.lineTo(door.x + 9, y); c.lineTo(door.x + 9, y + 8); c.lineTo(door.x + 15, y + 8); c.lineTo(door.x, y + 20); c.lineTo(door.x - 15, y + 8); c.lineTo(door.x - 9, y + 8); c.closePath();
    c.fillStyle = '#6fbf73'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.6; c.stroke();
    // label
    box(c, door.x - 20, y - 15, 40, 13, 5, '#fff8ea', INK, 1.2);
    text(c, G.lang === 'vi' ? 'LỐI RA' : 'EXIT', door.x, y - 8.2, 7.5, '#3f8f5f', 900);
    c.restore();
  }
  drawOutside(c, t) {
    const { w, h } = this;
    box(c, -40, h, w + 80, this.outside + 60, 0, '#f5e2b3', null);
    c.fillStyle = 'rgba(210,180,120,.35)'; const R = rng(5); for (let i = 0; i < 80; i++) c.fillRect(R() * w, h + R() * this.outside, 2, 2);
    box(c, -40, h + this.outside * 0.45, w + 80, 22, 0, '#efd8a6', null);
    // sunlight falling in
    const g = c.createLinearGradient(0, h, 0, h + this.outside); g.addColorStop(0, 'rgba(255,245,210,.5)'); g.addColorStop(1, 'rgba(255,245,210,0)'); c.fillStyle = g; c.fillRect(-40, h, w + 80, this.outside);
  }
  drawLedge(c, t) {
    const { w, h, door } = this;
    const L = door.x - door.w / 2, R = door.x + door.w / 2;
    const ledge = (x0, x1) => { box(c, x0, h - 2, x1 - x0, 12, 2, shade(this.wall, -26), INK, 1.2); c.fillStyle = 'rgba(0,0,0,.1)'; c.fillRect(x0 + 1, h + 6, x1 - x0 - 2, 3); };
    if (!this.noLedgeLeft) ledge(-8, L); else ledge(this.ledgeFrom, L);
    ledge(R, w + 8);
    // door frame + mat
    box(c, L - 3, h - 6, 4, 16, 1, shade(this.wall, -50), INK, 1);
    box(c, R - 1, h - 6, 4, 16, 1, shade(this.wall, -50), INK, 1);
    // bright light spilling in from outside marks the doorway
    const pulse = 0.55 + 0.15 * Math.sin(t * 2.5);
    const g = c.createLinearGradient(0, h + 8, 0, h - 40);
    g.addColorStop(0, LIGHT.night > 0.4 ? `rgba(160,170,230,${pulse})` : `rgba(255,244,200,${pulse + 0.2})`); g.addColorStop(1, 'rgba(255,244,200,0)');
    c.fillStyle = g; c.beginPath(); c.moveTo(L, h + 8); c.lineTo(R, h + 8); c.lineTo(R + 12, h - 40); c.lineTo(L - 12, h - 40); c.closePath(); c.fill();
    // door frame posts + lintel
    box(c, L - 5, h - 16, 6, 26, 2, shade(this.wall, -55), INK, 1);
    box(c, R - 1, h - 16, 6, 26, 2, shade(this.wall, -55), INK, 1);
  }
}

// ---------------------------------------------------------------- definitions
export function buildInteriors() {
  const S = {};

  // Player home
  {
    const r = new Interior({ id: 'house', name: 'Nhà của bạn', w: 270, h: 300, WH: 64, wall: '#f7e2c4', wall2: '#f2d7b3', floor: '#d9a870', door: { x: 135, w: 30 }, building: 'house' });
    r.wallItem('window', 160, { w: 46, h: 28, hgt: 54, curtain: '#f4a9b8' });
    r.wallItem('calendar', 200, { day: () => G.state.day });
    r.wallItem('clock', 28, {});
    r.furn('rug', 150, 214, { w: 96, h: 40, col: '#f7d6a0' });
    r.furn('bed', 48, 118, { col: '#f4a9b8', sleeper: () => G.runtime.sleeper, drawSleeper: (c, a, t) => drawHuman(c, a, t) }, [-30, -52, 60, 50]);
    r.furn('wardrobeBig', 104, 72, { col: '#e3b77f' }, [-24, -8, 48, 8]);
    r.wallItem('wallShelf', 240); r.wallItem('familyPhoto', 58);
    r.furn('floorLamp', 22, 150, {}, [-4, -3, 8, 3]);
    r.furn('kitchen', 226, 98, {}, [-35, -34, 70, 32]);
    r.furn('plant', 250, 284, { s: 1 }, [-6, -6, 12, 6]);
    r.trigger({ id: 'bed', kind: 'act', x: 14, y: 116, w: 72, h: 20, label: 'Ngủ', en: 'Sleep', icon: 'zzz', action: 'sleep' });
    r.trigger({ id: 'kitchen', kind: 'act', x: 190, y: 98, w: 70, h: 18, label: 'Nấu', en: 'Snack', icon: 'tea', action: 'homeSnack' });
    r.trigger({ id: 'wardrobe', kind: 'act', x: 78, y: 72, w: 52, h: 22, label: 'Thay đồ', en: 'Wardrobe', icon: 'shirt', action: 'wardrobe' });
    r.bedPos = { x: 46, y: 88 };
    r.decorArea = { x: 16, y: 126, w: 238, h: 156 };
    S.house = r;
  }
  // Supermarket
  {
    const r = new Interior({ id: 'supermarket', name: 'Siêu thị Cô Hoa', w: 300, h: 300, WH: 66, wall: '#e3f3ea', wall2: '#d3ecdf', wallStyle: 'tile', floor: '#f4efe4', floorStyle: 'tile', door: { x: 150, w: 34 }, building: 'supermarket' });
    r.furn('shelfJars', 52, 70, { w: 84, cols: ['#f28f7c', '#f7de8c', '#9fd67a', '#e9a24a', '#f4ead2'] }, [-42, -8, 84, 8]);
    r.furn('fridge', 262, 72, {}, [-18, -8, 36, 8]);
    r.furn('fridge', 224, 72, {}, [-18, -8, 36, 8]);
    r.furn('pass', 150, 112, { w: 76 }, [-38, -24, 76, 22]);
    r.furn('register', 172, 86, {});
    r.furn('produce', 64, 176, { w: 80 }, [-40, -24, 80, 22]);
    r.furn('produce', 236, 176, { w: 80, cols: ['#79b85c', '#ffb38a', '#ffd35a', '#9fd67a', '#dff4ff'] }, [-40, -24, 80, 22]);
    r.furn('sacks', 40, 286, {}, [-20, -14, 40, 12]);
    r.furn('crateStack', 266, 286, {}, [-20, -16, 40, 14]);
    r.furn('produce', 52, 240, { w: 64, cols: ['#ffa53a', '#f7de8c', '#e8584e'] }, [-32, -24, 64, 22]); // by the wall, clear of the door
    r.trigger({ id: 'shop', kind: 'act', x: 106, y: 110, w: 88, h: 34, label: 'Mua', en: 'Shop', icon: 'tea', action: 'shop:ingredients' });
    r.furn('aisleSign', 64, 150, { label: 'FRESH', col: '#6fbf73' }); r.furn('aisleSign', 236, 150, { label: 'FRUIT', col: '#f28f7c' });
    r.wallItem('bunting', 150, { w: 150, cols: ['#6fbf73', '#fff', '#f28f7c', '#fff'] });
    r.merchantPos = { x: 150, y: 84, id: 'co_hoa' };
    S.supermarket = r;
  }
  // Material shop
  {
    const r = new Interior({ id: 'materials', name: 'Vật liệu Chú Bảy', w: 280, h: 290, WH: 64, wall: '#e9d6c4', wallStyle: 'brick', floor: '#c9c3b8', floorStyle: 'concrete', door: { x: 140, w: 32 }, building: 'materials' });
    r.furn('lumber', 50, 130, { w: 70 }, [-36, -12, 72, 12]);
    r.furn('paintShelf', 232, 72, { w: 70 }, [-35, -8, 70, 8]);
    r.furn('sheetStack', 226, 178, {}, [-24, -20, 48, 20]);
    r.furn('pass', 140, 104, { w: 70 }, [-35, -24, 70, 22]);
    r.furn('crateStack', 44, 274, {}, [-20, -16, 40, 14]);
    r.furn('sacks', 250, 280, {}, [-20, -14, 40, 12]);
    r.furn('lumber', 70, 214, { w: 60 }, [-32, -12, 64, 12]);
    r.trigger({ id: 'shop', kind: 'act', x: 100, y: 102, w: 80, h: 34, label: 'Mua', en: 'Shop', icon: 'wood', action: 'shop:materials' });
    r.wallItem('pegboard', 60, { w: 70 });
    r.merchantPos = { x: 140, y: 78, id: 'chu_bay' };
    S.materials = r;
  }
  // Furniture shop
  {
    const r = new Interior({ id: 'furniture', name: 'Nội thất Anh Khoa', w: 290, h: 300, WH: 64, wall: '#f4e1cf', wall2: '#efd6be', floor: '#c98f5a', door: { x: 145, w: 32 }, building: 'furniture' });
    r.wallItem('painting', 60); r.wallItem('clock', 226); r.wallItem('painting', 100);
    r.furn('pass', 145, 104, { w: 70 }, [-35, -24, 70, 22]);
    r.furn('sofa', 62, 150, {}, [-30, -24, 60, 22]);
    r.furn('lamp', 22, 120, {}, [-5, -4, 10, 4]);
    r.furn('bookshelf', 250, 96, {}, [-18, -10, 36, 10]);
    r.furn('fishtank', 238, 190, {}, [-16, -16, 32, 16]);
    r.furn('rug', 62, 196, { w: 60, h: 28, col: '#9fd8c8' });
    r.furn('plant', 190, 286, {}, [-6, -6, 12, 6]);
    r.furn('chair', 240, 250, { col: '#b77a4f' }, [-7, -6, 14, 6]);
    r.furn('table', 200, 250, { w: 34, col: '#b77a4f' }, [-17, -8, 34, 8]);
    r.furn('radio', 166, 88, {});
    r.trigger({ id: 'shop', kind: 'act', x: 104, y: 102, w: 82, h: 34, label: 'Mua', en: 'Shop', icon: 'sofa', action: 'shop:furniture' });
    r.merchantPos = { x: 145, y: 78, id: 'anh_khoa' };
    r.furn('floorLamp', 262, 150, {}, [-4, -3, 8, 3]);
    S.furniture = r;
  }
  // Cô Ba's boutique
  {
    const r = new Interior({ id: 'boutique', name: 'Tiệm Áo Cô Ba', w: 290, h: 300, WH: 66, wall: '#fbe0e6', wall2: '#f6cfd8', wallStyle: 'dots', floor: '#e8d2b8', floorStyle: 'wood', door: { x: 145, w: 32 }, building: 'boutique' });
    r.wallItem('bunting', 145, { w: 200, cols: ['#f4a9b8', '#fff', '#9fd8c8', '#fff', '#f7de8c'] });
    r.wallItem('window', 60, { w: 40, h: 24, hgt: 50, curtain: '#9fd8c8' });
    r.furn('pass', 145, 104, { w: 70, col: '#f6cfd8', top: '#fff8fa' }, [-35, -24, 70, 22]);
    r.furn('clothesRack', 58, 148, { w: 70 }, [-36, -6, 72, 6]);
    r.furn('clothesRack', 232, 148, { w: 70, cols: ['#3d3550', '#e8584e', '#fffaf0', '#8fb7e0', '#ffd35a'] }, [-36, -6, 72, 6]);
    r.furn('clothesRack', 58, 226, { w: 60, cols: ['#f7de8c', '#b9d7a0', '#f8c0a0', '#dfe8ff'] }, [-31, -6, 62, 6]);
    r.furn('mirror', 250, 92, {}, [-11, -4, 22, 4]);
    r.furn('fittingRoom', 250, 236, { col: '#e56b8b' }, [-22, -8, 44, 8]);
    r.furn('mannequin', 186, 220, { col: '#f4a9b8', hat: '#f3dcae' }, [-7, -3, 14, 3]);
    r.furn('mannequin', 120, 220, { col: '#8fb7e0' }, [-7, -3, 14, 3]);
    r.furn('hatStand', 30, 96, {}, [-6, -3, 12, 3]);
    r.furn('shoeShelf', 200, 76, { w: 44 }, [-22, -8, 44, 8]);
    r.furn('rug', 145, 190, { w: 70, h: 30, col: '#f4a9b8' });
    r.furn('plant', 24, 286, {}, [-6, -6, 12, 6]);
    r.trigger({ id: 'shop', kind: 'act', x: 104, y: 102, w: 82, h: 34, label: 'Mua', en: 'Shop', icon: 'shirt', action: 'shop:boutique' });
    r.merchantPos = { x: 145, y: 80, id: 'co_ba' };
    S.boutique = r;
  }
  // Chị Tiên's hair salon
  {
    const r = new Interior({ id: 'salon', name: 'Salon Tóc Xinh', w: 290, h: 290, WH: 66, wall: '#e3f5ef', wall2: '#cfeee4', wallStyle: 'dots', floor: '#f4efe6', floorStyle: 'tile', door: { x: 145, w: 32 }, building: 'salon' });
    r.wallItem('bunting', 145, { w: 200, cols: ['#9fd8c8', '#fff', '#c9b6e8', '#fff', '#f4a9b8'] });
    r.wallItem('window', 232, { w: 40, h: 24, hgt: 50, curtain: '#c9b6e8' });
    r.furn('pass', 145, 104, { w: 70, col: '#cfeee4', top: '#fffdf8' }, [-35, -24, 70, 22]);
    r.furn('salonStation', 46, 88, {}, [-18, -8, 36, 8]);
    r.furn('salonStation', 98, 88, {}, [-18, -8, 36, 8]);
    r.furn('salonChair', 46, 122, { col: '#e56b8b' }, [-9, -5, 18, 5]);
    r.furn('salonChair', 98, 122, { col: '#6fbfb0' }, [-9, -5, 18, 5]);
    r.furn('hairWash', 238, 150, {}, [-16, -6, 34, 6]);
    r.furn('hoodDryer', 250, 222, {}, [-9, -4, 18, 4]);
    r.furn('armchair', 210, 222, { col: '#c9b6e8' }, [-14, -5, 28, 5]);
    r.furn('productShelf', 214, 80, { w: 44 }, [-22, -6, 44, 6]);
    r.furn('barberPole', 20, 70, {});
    r.furn('rug', 145, 196, { w: 72, h: 30, col: '#9fd8c8' });
    r.furn('plant', 24, 270, {}, [-6, -6, 12, 6]);
    r.furn('plant', 266, 270, {}, [-6, -6, 12, 6]);
    r.furn('vase_ceramic', 60, 220, {}, [-6, -3, 12, 3]);
    r.trigger({ id: 'shop', kind: 'act', x: 104, y: 102, w: 82, h: 34, label: 'Cắt tóc', en: 'Haircut', icon: 'scissors', action: 'shop:salon' });
    r.merchantPos = { x: 145, y: 80, id: 'chi_tien' };
    S.salon = r;
  }
  // Mèo Mây's home
  {
    const r = new Interior({ id: 'meo', name: 'Nhà Mèo Mây', w: 250, h: 280, WH: 62, wall: '#e2eaf7', wallStyle: 'paw', floor: '#e8c9a0', door: { x: 125, w: 30 }, building: 'meo' });
    r.wallItem('window', 125, { w: 44, h: 26, hgt: 52, curtain: '#f7a6b4' });
    r.wallItem('photoWall', 196);
    r.furn('cat_tree', 34, 112, {}, [-12, -6, 24, 6]);
    r.furn('bookshelf', 214, 92, {}, [-18, -10, 36, 10]);
    r.furn('table', 124, 146, { w: 40, col: '#b77a4f' }, [-20, -10, 40, 10]);
    r.furn('cushion', 96, 150, { col: '#f7a6b4' }); r.furn('cushion', 152, 150, { col: '#9fb4dc' });
    r.furn('cat_bed', 56, 236, {});
    r.furn('rug', 124, 214, { w: 70, h: 30, col: '#f7a6b4' });
    r.furn('altarShelf', 70, 62, {});
    r.furn('plant', 228, 266, {}, [-6, -6, 12, 6]);
    r.furn('prepTable', 200, 146, { w: 44 }, [-22, -26, 44, 24]);
    r.trigger({ id: 'notebook', kind: 'act', x: 176, y: 146, w: 48, h: 20, label: 'Sổ tay', en: 'Recipes', icon: 'notebook', action: 'recipeBook' });
    r.trigger({ id: 'photos', kind: 'act', x: 170, y: 64, w: 56, h: 16, label: 'Kỷ niệm', en: 'Memories', icon: 'photo', action: 'journal' });
    r.meoSpot = { x: 124, y: 170 };
    r.catBed = { x: 56, y: 233 };
    S.meo = r;
  }
  // Business interiors with a service window onto the outdoor queue
  const bizRoom = (id, name, o) => {
    const r = new Interior({ id, name, w: 232, h: 196, WH: 60, outside: 86, door: { x: 200, w: 28 }, building: o.building, ...o });
    r.noLedgeLeft = true; r.ledgeFrom = 162;
    r.solid(0, r.h - 34, 158, 40, { furn: 'station' });   // counter blocks the window line
    r.serveSpot = { x: 80, y: r.h - 44 };
    r.windowSlots = [[84, r.h + 30], [48, r.h + 40], [120, r.h + 42]];
    r.trigger({ id: 'serve', kind: 'act', x: 16, y: r.h - 58, w: 140, h: 26, label: 'Bán hàng', en: 'Serve', icon: 'coin', action: 'serve' });
    r.trigger({ id: 'prep', kind: 'act', x: 160, y: 96, w: 64, h: 24, label: 'Sơ chế', en: 'Prep', icon: 'knife', action: 'prep' });
    r.trigger({ id: 'menu', kind: 'act', x: 16, y: 84, w: 58, h: 26, label: 'Thực đơn', en: 'Menu', icon: 'menu', action: 'menu' });
    return r;
  };
  {
    const r = bizRoom('shed1', 'Quán Nước', { wall: '#f7e3c0', wall2: '#efd6ae', floor: '#c9955e', building: 'shed1' });
    r.furn('shelfJars', 124, 60, { w: 80 });
    r.furn('menuBoard', 44, 84, {}, [-14, -8, 28, 8]);
    r.furn('prepTable', 194, 96, { w: 56 }, [-28, -26, 56, 24]);
    r.furn('drinkStation', 80, r.h - 2, { w: 148 });
    r.furn('plant', 214, 150, { s: 0.8 }, [-5, -5, 10, 5]);
    S.shed1 = r;
  }
  {
    const r = bizRoom('shed2', 'Bánh Mì Góc Phố', { wall: '#fde2c4', wall2: '#f6d4ad', floor: '#b98a5a', building: 'shed2' });
    r.furn('breadBasket', 124, 62, {});
    r.furn('shelfJars', 170, 60, { w: 50, cols: ['#f39a48', '#e9eef2', '#79b85c', '#d77c55'] });
    r.furn('menuBoard', 44, 84, {}, [-14, -8, 28, 8]);
    r.furn('grill', 196, 96, { w: 52 }, [-26, -26, 52, 24]);
    r.furn('pass', 80, r.h - 2, { w: 148 });
    r.furn('breadBasket', 40, r.h - 32, {});
    S.shed2 = r;
  }
  {
    const r = bizRoom('truck', 'Xe Cuốn', { wall: '#bfe6dc', wallStyle: 'metal', floor: '#6e6a70', floorStyle: 'rubber', building: 'truck' });
    r.furn('shelfJars', 120, 60, { w: 70, cols: ['#fbf3df', '#ff9a7a', '#86c86a', '#f5c23a'] });
    r.furn('menuBoard', 44, 84, {}, [-14, -8, 28, 8]);
    r.furn('stove', 194, 96, { w: 52, on: () => true }, [-26, -26, 52, 24]);
    r.furn('pass', 80, r.h - 2, { w: 148 });
    S.truck = r;
  }
  Object.assign(S, buildHomes());
  return S;
}

// ---------------------------------------------------------------- neighbours' homes
// Each home has its own look, a bed (the owner sleeps there at night) and a few
// things you can look at. 'host' is where the owner stands when they're in.
function buildHomes() {
  const S = {};
  const home = (rid, o, dress, looks) => {
    const r = new Interior({ id: 'home_' + rid, w: 240, h: 250, WH: 60, door: { x: 120, w: 30 }, building: 'h_' + ({ ba_tu: 'batu', linh: 'linh', co_lan: 'lan', anh_tuan: 'tuan', chi_mai: 'mai', chu_hai: 'hai', vy: 'vy' })[rid], ...o });
    r.owner = rid;
    r.bedSleeper = null;
    r.furn('bed', 46, 112, { col: o.bed || '#9fb4dc', sleeper: () => r.bedSleeper, drawSleeper: (c, a, t) => drawHuman(c, a, t) }, [-30, -52, 60, 50]);
    r.bedPos = { x: 46, y: 88 };
    dress(r);
    for (const [x, y, en, vi] of looks) r.trigger({ id: 'look' + x, kind: 'act', x: x - 22, y: y - 6, w: 44, h: 22, label: 'Xem', en: 'Look', icon: 'photo', action: 'look', text: [en, vi] });
    r.host = o.host || { x: 150, y: 170 };
    S[r.id] = r;
  };
  home('ba_tu', { wall: '#efdcc0', wall2: '#e6ceac', floor: '#b98a5a', bed: '#c9b6e8' }, r => {
    r.wallItem('altarShelf', 150); r.wallItem('familyPhoto', 200);
    r.furn('table', 150, 150, { w: 40, col: '#8a5f3e', cloth: '#f7d6c0' }, [-20, -10, 40, 10]);
    r.furn('cushion', 124, 156, { col: '#e8584e' }); r.furn('cushion', 176, 156, { col: '#e8584e' });
    r.furn('plant', 216, 118, { pot: '#d9784f' }, [-6, -6, 12, 6]); r.furn('bonsai', 24, 236, {}, [-9, -6, 18, 6]);
    r.furn('rug', 150, 214, { w: 80, h: 30, col: '#c9674a' });
  }, [[150, 66, 'A black-and-white photo: a young Bà Tư beside a brand-new tea stand, 1985.', 'Một tấm ảnh trắng đen: Bà Tư thời trẻ bên quán trà mới toanh, năm 1985.'], [150, 150, 'A tea set with five tiny cups. One is chipped — "Mèo Mây did it," says a note.', 'Bộ ấm trà với năm chén nhỏ. Một chén bị mẻ — tờ giấy ghi “Mèo Mây làm đó”.'], [216, 124, 'A kumquat tree in a pot. It has more fruit than leaves.', 'Một chậu tắc. Trái còn nhiều hơn lá.']]);
  home('linh', { wall: '#dff0e6', wall2: '#cfe6d8', floor: '#e3c9a0', bed: '#f4a9b8' }, r => {
    r.wallItem('painting', 150); r.wallItem('clock', 200);
    r.furn('deskNook', 190, 104, {}, [-20, -8, 40, 8]); r.furn('bookshelf', 110, 90, {}, [-18, -10, 36, 10]);
    r.furn('cushion', 150, 190, { col: '#9fd8c8' }); r.furn('lamp', 216, 180, {}, [-5, -4, 10, 4]);
    r.furn('rug', 150, 214, { w: 90, h: 32, col: '#9fd8c8' });
  }, [[190, 104, 'Exam notes covered in doodles of kumquats. Very focused studying.', 'Vở ôn thi vẽ đầy hình trái tắc. Học rất tập trung.'], [110, 96, 'Novels, a biology textbook, and a book called "How to Befriend a Cat".', 'Tiểu thuyết, sách sinh học, và một cuốn tên “Làm Thân Với Mèo”.'], [150, 66, 'A photo of Linh\'s graduation... from kindergarten.', 'Ảnh tốt nghiệp của Linh… mẫu giáo.']]);
  home('co_lan', { wall: '#fbe6ef', wall2: '#f6d4e2', floor: '#e8d2b8', bed: '#f4a9b8', wallStyle: 'dots' }, r => {
    r.wallItem('window', 150, { w: 40, h: 24, hgt: 50, curtain: '#9fd8c8' }); r.wallItem('wallShelf', 206);
    for (const [x, y] of [[100, 96], [196, 104], [216, 176], [24, 236], [150, 236], [100, 176]]) r.furn('plant', x, y, { s: 0.9, pot: ['#8fb7e0', '#d9784f', '#f4a9b8'][(x + y) % 3] }, [-6, -6, 12, 6]);
    r.furn('table', 160, 150, { w: 34, col: '#e3b77f', cloth: '#fff5f7' }, [-17, -10, 34, 10]);
    r.furn('rug', 150, 214, { w: 70, h: 30, col: '#f7a6b4' });
  }, [[160, 150, 'A half-made flower crown. The note says "for the festival!"', 'Một vòng hoa đang kết dở. Tờ giấy ghi “cho lễ hội!”'], [196, 110, 'A pot labelled "DO NOT WATER — it\'s plastic". It has been watered.', 'Chậu hoa dán nhãn “ĐỪNG TƯỚI — hoa nhựa”. Nó đã bị tưới.']]);
  home('anh_tuan', { wall: '#dbe8f5', wall2: '#cadcee', floor: '#b9a58a', bed: '#8fb7e0', wallStyle: 'metal' }, r => {
    r.wallItem('photoWall', 160); r.wallItem('clock', 210);
    r.furn('sofa', 150, 150, { col: '#6f9fc8' }, [-30, -24, 60, 22]); r.furn('tv', 150, 96, {}, [-20, -8, 40, 8]);
    r.furn('crateStack', 214, 200, {}, [-20, -16, 40, 14]); r.furn('radio', 214, 110, {});
  }, [[160, 66, 'Minh\'s photos of the island. In every one, Mèo Mây is somewhere in the background.', 'Ảnh đảo của Minh. Tấm nào cũng có Mèo Mây ở đâu đó phía sau.'], [214, 200, 'Scooter parts and a sign: "TAXI — cheap, fast, mostly safe".', 'Đồ phụ tùng xe máy và tấm bảng: “TAXI — rẻ, nhanh, khá an toàn”.'], [150, 100, 'The TV is showing a cooking show. The host is using far too much sugar.', 'TV đang chiếu chương trình nấu ăn. Người dẫn bỏ quá trời đường.']]);
  home('chi_mai', { wall: '#eef6f9', wall2: '#e0eef3', floor: '#dcd2c2', floorStyle: 'tile', bed: '#fffaf0' }, r => {
    r.wallItem('wallShelf', 150); r.wallItem('calendar', 200, { day: () => G.state.day });
    r.furn('shelfJars', 196, 60, { w: 50, cols: ['#fffaf0', '#9fd8c8', '#f28f7c', '#fff'] });
    r.furn('deskNook', 150, 130, {}, [-20, -8, 40, 8]); r.furn('plant', 216, 200, {}, [-6, -6, 12, 6]); r.furn('chair', 110, 130, { col: '#9fd8c8' });
  }, [[196, 66, 'Neatly labelled jars: bandages, lime drops, "emergency candy".', 'Những lọ dán nhãn gọn gàng: băng gạc, kẹo chanh, “kẹo khẩn cấp”.'], [150, 130, 'A stack of letters to deliver. The top one is addressed to "Mèo Mây, Cloud Island".', 'Một chồng thư cần giao. Lá trên cùng gửi “Mèo Mây, Đảo Mây”.']]);
  home('chu_hai', { wall: '#e3eef0', wall2: '#d3e3e6', floor: '#a88a6a', bed: '#6f9fc8' }, r => {
    r.wallItem('painting', 150); r.wallItem('window', 206, { w: 36, h: 22, hgt: 48, curtain: '#e8584e' });
    r.furn('fishtank', 190, 110, {}, [-16, -16, 32, 16]); r.furn('sacks', 214, 220, {}, [-20, -14, 40, 12]);
    r.furn('table', 130, 160, { w: 36, col: '#8a5f3e' }, [-18, -10, 36, 10]); r.furn('stool', 104, 168, {});
  }, [[190, 114, 'A fish tank. One fish has a tiny name tag: "Not Dinner".', 'Bể cá. Một con cá đeo bảng tên nhỏ xíu: “Không Phải Bữa Tối”.'], [150, 66, 'A painting of a stormy sea. Chú Hải says it\'s a portrait of his mood before coffee.', 'Bức tranh biển động. Chú Hải bảo đó là tâm trạng chú trước khi uống cà phê.'], [214, 220, 'Nets, rope, and a sandal that is definitely Bà Tư\'s.', 'Lưới, dây thừng, và một chiếc dép chắc chắn là của Bà Tư.']]);
  home('vy', { wall: '#fdf3e0', wall2: '#f6e6c8', floor: '#d9b98a', bed: '#9fd8c8' }, r => {
    r.wallItem('painting', 110); r.wallItem('painting', 170);
    r.prop({ x: 160, y: 140, draw: (c, t) => PR.easel(c, t, {}), cull: { x: 130, y: 90, w: 60, h: 60 } }); r.solid(154, 136, 12, 5);
    r.prop({ x: 205, y: 190, draw: (c, t) => PR.easel(c, t, {}), cull: { x: 175, y: 140, w: 60, h: 60 } }); r.solid(199, 186, 12, 5);
    r.furn('lantern', 60, 200, {}); r.furn('cushion', 110, 200, { col: '#f7de8c' });
  }, [[160, 140, 'A half-finished painting of your shops, seen from the lookout tower.', 'Một bức tranh vẽ dở những quán của bạn, nhìn từ tháp canh.'], [140, 66, 'Paintings of fireflies. Up close, every dot is a tiny smiling face.', 'Tranh đom đóm. Nhìn gần, mỗi chấm là một khuôn mặt cười nhỏ xíu.']]);
  return S;
}
export { shadow, text, TAU };
