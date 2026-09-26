// Home decorating: pick an item from your delivered furniture, tap the floor
// to place it (a ghost shows where it will go, green = fits), tap placed items
// to pick them back up. Furniture becomes real props with collision.

import { G, T, markDirty, unlockAchievement } from '../systems/state.js';
import { FURNITURE, furnName } from '../data/game.js';
import { FURN_DRAW, F, drawFurniturePreview } from '../gfx/furniture.js';
import { drawHuman } from '../gfx/character.js';
import { h } from './sheets.js';
import { sfx } from '../core/audio.js';
import { escapeHtml, clamp } from '../core/util.js';
import { toast } from './hud.js';
import { cam, fx } from '../world/render.js';
import { input, releaseJoystick } from '../core/input.js';

let D = null;
const house = () => G.scenes.house;

// Built-in pieces of your home. They can be moved and turned but never stored.
export const BUILTINS = {
  bed: { kind: 'bed', en: 'Bed', vi: 'Giường', x: 48, y: 118, w: 60, h: 50, opts: () => ({ col: '#f4a9b8', sleeper: () => G.runtime.sleeper, drawSleeper: (c, a, t) => drawHuman(c, a, t) }),
         trig: { id: 'bed', dx: -34, dy: -2, w: 72, h: 20, label: 'Ngủ', en: 'Sleep', icon: 'zzz', action: 'sleep' } },
  wardrobe: { kind: 'wardrobeBig', en: 'Wardrobe', vi: 'Tủ quần áo', x: 104, y: 72, w: 48, h: 10, opts: () => ({ col: '#e3b77f' }),
         trig: { id: 'wardrobe', dx: -26, dy: 0, w: 52, h: 22, label: 'Thay đồ', en: 'Wardrobe', icon: 'shirt', action: 'wardrobe' } },
  kitchen: { kind: 'kitchen', en: 'Kitchen', vi: 'Bếp', x: 226, y: 98, w: 70, h: 32, opts: () => ({}),
         trig: { id: 'kitchen', dx: -36, dy: 0, w: 70, h: 18, label: 'Nấu', en: 'Snack', icon: 'tea', action: 'homeSnack' } },
};
function builtinState() {
  const h = G.state.home;
  h.builtins ||= {};
  for (const [k, b] of Object.entries(BUILTINS)) h.builtins[k] ||= { x: b.x, y: b.y, rot: 0 };
  return h.builtins;
}
// Turning a piece: 0 front, 1 turned right, 2 back, 3 turned left. Turned pieces
// are drawn at a three-quarter angle (narrower, one side raised).
export function rotXform(c, rot) {
  if (!rot) return;
  if (rot === 2) { c.scale(-1, 1); return; }
  const dir = rot === 1 ? 1 : -1;
  c.transform(0.72 * dir, 0.2 * dir, 0, 1, 0, 0);
}
export function footprint(w, h, rot) { return rot % 2 ? { w: Math.max(12, Math.round(w * 0.72)), h: Math.round(h + w * 0.14) } : { w, h }; }
const defOf = sel => sel?.startsWith('builtin:') ? BUILTINS[sel.slice(8)] : FURNITURE[sel];
const drawSel = (c, t, sel, x, y, rot) => {
  c.save(); rotXform(c, rot);
  if (sel.startsWith('builtin:')) { const b = BUILTINS[sel.slice(8)]; F[b.kind](c, t, { x, y, ...b.opts() }); }
  else FURN_DRAW[sel](c, t, { ...FURNITURE[sel], x, y });
  c.restore();
};

// Build props for placed furniture and the built-ins (called on load and after edits).
export function rebuildHouseFurniture() {
  const sc = house();
  sc.props = sc.props.filter(p => !p.homeFurn && !p.builtin);
  sc.solids = sc.solids.filter(s => !s.homeFurn && !s.builtin);
  sc.triggers = sc.triggers.filter(t => !t.builtin);
  const bs = builtinState();
  for (const [k, b] of Object.entries(BUILTINS)) {
    if (D?.moving === k) continue;                       // being carried right now
    const st = bs[k], fp = footprint(b.w, b.h, st.rot || 0);
    const p = { kind: b.kind, builtin: k, x: st.x, y: st.y, ...b.opts() };
    p.draw = (c, t) => { c.save(); rotXform(c, st.rot || 0); F[b.kind](c, t, p); c.restore(); };
    p.cull = { x: st.x - 80, y: st.y - 90, w: 160, h: 110 };
    sc.prop(p);
    sc.solid(st.x - fp.w / 2, st.y - fp.h, fp.w, fp.h, { builtin: k });
    const tr = b.trig;
    sc.trigger({ ...tr, kind: 'act', x: st.x + tr.dx, y: st.y + tr.dy, builtin: k });
    if (k === 'bed') sc.bedPos = { x: st.x - 2, y: st.y - 30 };
  }
  for (const f of G.state.home.furniture) addFurnProp(sc, f);
}
function addFurnProp(sc, f) {
  const def = FURNITURE[f.id]; if (!def) return;
  const rot = f.rot || 0, fp = footprint(def.w, def.h, rot);
  const p = { homeFurn: f, x: f.x, y: f.y, draw: (c, t) => { c.save(); rotXform(c, rot); FURN_DRAW[f.id](c, t, { ...def, x: f.x, y: f.y }); c.restore(); }, cull: { x: f.x - 60, y: f.y - 80, w: 120, h: 100 } };
  if (def.floor) p.flat = true; // rugs sit under everything
  if (def.wall) p.sortY = -1;
  sc.prop(p);
  if (!def.floor && !def.wall) sc.solid(f.x - fp.w / 2, f.y - fp.h, fp.w, fp.h, { homeFurn: f });
}
function fits(sel, x, y, rot = 0) {
  const def = defOf(sel), sc = house(), a = sc.decorArea;
  if (def.wall) return x - def.w / 2 > 14 && x + def.w / 2 < sc.w - 14;
  const fp = footprint(def.w, def.h, rot);
  const builtin = sel.startsWith('builtin:');
  if (x - fp.w / 2 < a.x || x + fp.w / 2 > a.x + a.w || y > a.y + a.h) return false;
  if (y - fp.h < (builtin ? sc.WH + 2 : a.y - 50)) return false;
  if (def.floor) return true;
  // don't block the doorway
  if (Math.abs(x - sc.door.x) < fp.w / 2 + 18 && y > sc.h - 30) return false;
  for (const s of sc.solids) {
    if (s.off) continue;
    if (x - fp.w / 2 < s.x + s.w && x + fp.w / 2 > s.x && y - fp.h < s.y + s.h && y > s.y) return false;
  }
  return true;
}

export function isDecorating() { return !!D; }
export function startDecorate() {
  if (D) return;
  releaseJoystick();
  input.enabled = false;
  G.runtime.pause++;
  document.body.classList.add('hide-controls', 'decorating');
  const bar = h('div', 'deco-bar');
  document.getElementById('app').appendChild(bar);
  D = { bar, sel: null, ghost: null, valid: false, moving: null, rot: 0 };
  cam.targetZoomMul = 1.05;
  renderBar();
  const touch = document.getElementById('touch');
  D.onDown = e => {
    if (!D) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const r = document.getElementById('game').getBoundingClientRect();
    const [wx, wy] = G.renderer.toWorld(e.clientX - r.left, e.clientY - r.top);
    if (!D.sel) { pickUpAt(wx, wy); return; }
    const def = defOf(D.sel);
    const x = Math.round(wx / 4) * 4, y = def.wall ? house().WH : Math.round((wy + def.h / 2) / 4) * 4;
    D.ghost = { x, y };
    D.valid = fits(D.sel, x, y, D.rot);
    renderBar();
  };
  touch.addEventListener('pointerdown', D.onDown, true);
  G.runtime.decoOverlay = drawGhost;
}
function pickUpAt(wx, wy) {
  const list = G.state.home.furniture;
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i], def = FURNITURE[f.id];
    const top = def.wall ? f.y - 64 : f.y - Math.max(def.h, 30) - 16;
    if (wx > f.x - def.w / 2 - 4 && wx < f.x + def.w / 2 + 4 && wy > top && wy < f.y + 6) {
      list.splice(i, 1); G.state.home.owned.push(f.id);
      rebuildHouseFurniture(); markDirty(true);
      D.sel = f.id; D.rot = f.rot || 0; D.ghost = { x: f.x, y: f.y }; D.valid = fits(f.id, f.x, f.y, D.rot);
      sfx('pop'); renderBar(); return;
    }
  }
  // the bed, wardrobe and kitchen can be picked up too (they must be put back down)
  const bs = builtinState();
  for (const [k, b] of Object.entries(BUILTINS)) {
    const st = bs[k], fp = footprint(b.w, b.h, st.rot || 0), top = st.y - Math.max(fp.h, 40) - 20;
    if (wx > st.x - fp.w / 2 - 4 && wx < st.x + fp.w / 2 + 4 && wy > top && wy < st.y + 6) {
      D.moving = k; D.from = { ...st }; rebuildHouseFurniture();
      D.sel = 'builtin:' + k; D.rot = st.rot || 0; D.ghost = { x: st.x, y: st.y }; D.valid = fits(D.sel, st.x, st.y, D.rot);
      sfx('pop'); renderBar(); return;
    }
  }
}
function renderBar() {
  const owned = G.state.home.owned;
  const counts = {};
  for (const id of owned) counts[id] = (counts[id] || 0) + 1;
  const bar = D.bar;
  const hint = D.sel ? (D.ghost ? (D.valid ? T('Place it here?', 'Đặt ở đây?') : T('It doesn\'t fit here', 'Không vừa chỗ này')) : T('Tap the floor to place it', 'Chạm vào sàn để đặt')) : (owned.length ? T('Pick an item below, or tap any furniture (even the bed, wardrobe and kitchen) to move or turn it', 'Chọn đồ bên dưới, hoặc chạm vào đồ bất kỳ (cả giường, tủ, bếp) để dời hoặc xoay') : T('Tap any furniture — even the bed, wardrobe and kitchen — to move or turn it, or buy more from Anh Khoa.', 'Chạm vào bất kỳ đồ nào — cả giường, tủ và bếp — để dời hoặc xoay, hoặc mua thêm ở Nhà đẹp Anh Khoa.'));
  bar.innerHTML = `<div class="deco-hint">${escapeHtml(hint)}</div><div class="row-scroll"></div><div class="deco-actions"></div>`;
  const row = bar.querySelector('.row-scroll');
  for (const [id, n] of Object.entries(counts)) {
    const it = h('button', 'deco-item' + (D.sel === id ? ' on' : ''));
    it.type = 'button';
    const cv = document.createElement('canvas'); cv.width = 112; cv.height = 88;
    it.appendChild(cv); it.appendChild(document.createTextNode(`${furnName(id)}${n > 1 ? ' ×' + n : ''}`));
    drawFurniturePreview(cv, id, FURNITURE[id]);
    it.onclick = () => { sfx('ui'); D.sel = D.sel === id ? null : id; D.ghost = null; renderBar(); };
    row.appendChild(it);
  }
  const acts = bar.querySelector('.deco-actions');
  if (D.moving) { const b = BUILTINS[D.moving], it = h('button', 'deco-item on'); it.type = 'button'; it.textContent = T(`${b.en} (moving)`, `${b.vi} (đang dời)`); row.prepend(it); }
  if (D.sel && !defOf(D.sel).wall && !defOf(D.sel).floor) {
    const turn = d => { D.rot = (D.rot + d + 4) % 4; if (D.ghost) D.valid = fits(D.sel, D.ghost.x, D.ghost.y, D.rot); sfx('whoosh'); renderBar(); };
    const l = h('button', 'btn ghost rot', '⟲ 90°'); l.type = 'button'; l.onclick = () => turn(-1);
    const r = h('button', 'btn ghost rot', '90° ⟳'); r.type = 'button'; r.onclick = () => turn(1);
    acts.append(l, r);
  }
  if (D.sel && D.ghost) {
    const place = h('button', 'btn pink', T('Place', 'Đặt')); place.type = 'button'; place.disabled = !D.valid;
    place.onclick = () => {
      if (!D.valid) return;
      if (D.moving) { builtinState()[D.moving] = { x: D.ghost.x, y: D.ghost.y, rot: D.rot }; D.moving = null; }
      else {
        const i = G.state.home.owned.indexOf(D.sel); if (i >= 0) G.state.home.owned.splice(i, 1);
        G.state.home.furniture.push({ id: D.sel, x: D.ghost.x, y: D.ghost.y, rot: D.rot });
      }
      rebuildHouseFurniture(); markDirty(true);
      fx.burst('spark', D.ghost.x, D.ghost.y - 16, 8, { up: 30, col: '#ffd35a' }); sfx('success');
      if (G.state.home.furniture.length >= 5) unlockAchievement('cozy_home');
      D.sel = null; D.ghost = null; D.rot = 0; renderBar();
    };
    const cancel = h('button', 'btn ghost', T('Cancel', 'Bỏ chọn')); cancel.type = 'button'; cancel.onclick = () => { putBack(); D.sel = null; D.ghost = null; D.rot = 0; sfx('back'); renderBar(); };
    acts.append(cancel, place);
  }
  const done = h('button', 'btn gold', T('Done', 'Xong')); done.type = 'button'; done.onclick = () => { putBack(); stopDecorate(); };
  acts.appendChild(done);
}
// a built-in that was picked up but not placed goes back where it was
function putBack() { if (D?.moving) { builtinState()[D.moving] = D.from; D.moving = null; rebuildHouseFurniture(); } }
function drawGhost(c, t) {
  if (!D?.sel || !D.ghost) return;
  const def = defOf(D.sel), fp = footprint(def.w, def.h, D.rot);
  c.save();
  c.globalAlpha = 0.55 + Math.sin(t * 6) * 0.15;
  c.translate(D.ghost.x, D.ghost.y);
  drawSel(c, t, D.sel, D.ghost.x, D.ghost.y, D.rot);
  c.restore();
  c.save();
  c.strokeStyle = D.valid ? '#6fbf73' : '#e8584e'; c.lineWidth = 2; c.setLineDash([4, 4]);
  if (def.wall) c.strokeRect(D.ghost.x - def.w / 2, D.ghost.y - 66, def.w, 26);
  else c.strokeRect(D.ghost.x - fp.w / 2, D.ghost.y - fp.h, fp.w, fp.h);
  c.restore();
}
export function stopDecorate() {
  if (!D) return;
  document.getElementById('touch').removeEventListener('pointerdown', D.onDown, true);
  D.bar.remove();
  D = null;
  input.enabled = true;
  G.runtime.pause--;
  G.runtime.decoOverlay = null;
  cam.targetZoomMul = 1;
  document.body.classList.remove('hide-controls', 'decorating');
  sfx('back');
}
export { clamp };
