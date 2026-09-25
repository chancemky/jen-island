// Building interiors. Each is a small cut-away room: back wall at the top,
// floor below, a low front ledge with the doorway at the bottom.

import { Scene } from './scene.js';
import { F } from '../gfx/furniture.js';
import { INK, ell, circ, box, line, text, shadow } from '../gfx/draw.js';
import { shade, rng, TAU } from '../core/util.js';
import { LIGHT } from '../gfx/props.js';
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
    else if (this.wallStyle === 'metal') { c.fillStyle = 'rgba(255,255,255,.18)'; for (let x = 0; x < w; x += 14) c.fillRect(x, 0, 2, WH); }
    c.restore();
    // wainscot + baseboard
    box(c, 0, WH - 16, w, 12, 0, shade(this.wall, -18), null);
    box(c, 0, WH - 6, w, 6, 0, shade(this.wall, -40), null);
    line(c, 0, WH - 16, w, WH - 16, 'rgba(91,63,54,.5)', 1);
    box(c, 0, 0, w, WH, 3, null, INK, 1.4);
    // side walls (thin)
    box(c, -8, 0, 10, h + 10, 3, shade(this.wall, -30), INK, 1.2);
    box(c, w - 2, 0, 10, h + 10, 3, shade(this.wall, -30), INK, 1.2);
    if (this.outside) this.drawOutside(c, t);
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
    ell(c, door.x, h + 1, door.w / 2 - 2, 3, '#e89a8a', INK, 0.8);
    // light spilling in from outside
    const lt = LIGHT.night > 0.4 ? 'rgba(120,130,200,.25)' : 'rgba(255,240,200,.35)';
    c.fillStyle = lt; c.beginPath(); c.moveTo(L, h + 8); c.lineTo(R, h + 8); c.lineTo(R + 10, h - 30); c.lineTo(L - 10, h - 30); c.closePath(); c.globalAlpha = 0.5; c.fill(); c.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- definitions
export function buildInteriors() {
  const S = {};

  // Player home
  {
    const r = new Interior({ id: 'house', name: 'Nhà của bạn', w: 270, h: 300, WH: 64, wall: '#f7e2c4', wall2: '#f2d7b3', floor: '#d9a870', door: { x: 135, w: 30 }, building: 'house' });
    r.wallItem('window', 135, { w: 46, h: 28, hgt: 54, curtain: '#f4a9b8' });
    r.wallItem('calendar', 196, { day: () => G.state.day });
    r.wallItem('clock', 76, {});
    r.furn('bed', 48, 118, { col: '#f4a9b8', sleeper: () => G.runtime.sleeper, drawSleeper: (c, a, t) => drawHuman(c, a, t) }, [-30, -52, 60, 50]);
    r.furn('wardrobe', 104, 72, {}, [-20, -8, 40, 8]);
    r.furn('kitchen', 226, 98, {}, [-35, -34, 70, 32]);
    r.furn('plant', 250, 284, { s: 1 }, [-6, -6, 12, 6]);
    r.trigger({ id: 'bed', kind: 'act', x: 14, y: 116, w: 72, h: 20, label: 'Ngủ', en: 'Sleep', icon: 'zzz', action: 'sleep' });
    r.trigger({ id: 'kitchen', kind: 'act', x: 190, y: 98, w: 70, h: 18, label: 'Nấu', en: 'Snack', icon: 'tea', action: 'homeSnack' });
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
    r.furn('produce', 150, 236, { w: 70, cols: ['#ffa53a', '#f7de8c', '#e8584e'] }, [-35, -24, 70, 22]);
    r.trigger({ id: 'shop', kind: 'act', x: 106, y: 110, w: 88, h: 34, label: 'Mua', en: 'Shop', icon: 'tea', action: 'shop:ingredients' });
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
    S.furniture = r;
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
  return S;
}
export { shadow, text, TAU };
