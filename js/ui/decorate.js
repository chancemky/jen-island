// Home decorating: pick an item from your delivered furniture, tap the floor
// to place it (a ghost shows where it will go, green = fits), tap placed items
// to pick them back up. Furniture becomes real props with collision.

import { G, T, markDirty, unlockAchievement } from '../systems/state.js';
import { FURNITURE, furnName } from '../data/game.js';
import { FURN_DRAW, drawFurniturePreview } from '../gfx/furniture.js';
import { h } from './sheets.js';
import { sfx } from '../core/audio.js';
import { escapeHtml, clamp } from '../core/util.js';
import { toast } from './hud.js';
import { cam, fx } from '../world/render.js';
import { input, releaseJoystick } from '../core/input.js';

let D = null;
const house = () => G.scenes.house;

// Build props for placed furniture (called on load and after edits).
export function rebuildHouseFurniture() {
  const sc = house();
  sc.props = sc.props.filter(p => !p.homeFurn);
  sc.solids = sc.solids.filter(s => !s.homeFurn);
  for (const f of G.state.home.furniture) addFurnProp(sc, f);
}
function addFurnProp(sc, f) {
  const def = FURNITURE[f.id]; if (!def) return;
  const p = { homeFurn: f, x: f.x, y: f.y, draw: (c, t) => FURN_DRAW[f.id](c, t, { ...def, x: f.x, y: f.y }), cull: { x: f.x - 60, y: f.y - 80, w: 120, h: 100 } };
  if (def.floor) p.flat = true; // rugs sit under everything
  if (def.wall) p.sortY = -1;
  sc.prop(p);
  if (!def.floor && !def.wall) sc.solid(f.x - def.w / 2, f.y - def.h, def.w, def.h, { homeFurn: f });
}
function fits(id, x, y, ignore = null) {
  const def = FURNITURE[id], sc = house(), a = sc.decorArea;
  if (def.wall) return x - def.w / 2 > 14 && x + def.w / 2 < sc.w - 14;
  if (x - def.w / 2 < a.x || x + def.w / 2 > a.x + a.w || y - def.h < a.y - 50 || y > a.y + a.h) return false;
  if (def.floor) return true;
  // don't block the doorway
  if (Math.abs(x - sc.door.x) < def.w / 2 + 18 && y > sc.h - 30) return false;
  for (const s of sc.solids) {
    if (s === ignore || s.off) continue;
    if (x - def.w / 2 < s.x + s.w && x + def.w / 2 > s.x && y - def.h < s.y + s.h && y > s.y) return false;
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
  D = { bar, sel: null, ghost: null, valid: false, moving: null };
  cam.targetZoomMul = 1.05;
  renderBar();
  const touch = document.getElementById('touch');
  D.onDown = e => {
    if (!D) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const r = document.getElementById('game').getBoundingClientRect();
    const [wx, wy] = G.renderer.toWorld(e.clientX - r.left, e.clientY - r.top);
    if (!D.sel) { pickUpAt(wx, wy); return; }
    const def = FURNITURE[D.sel];
    const x = Math.round(wx / 4) * 4, y = def.wall ? house().WH : Math.round((wy + def.h / 2) / 4) * 4;
    D.ghost = { x, y };
    D.valid = fits(D.sel, x, y);
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
      D.sel = f.id; D.ghost = { x: f.x, y: f.y }; D.valid = fits(f.id, f.x, f.y);
      sfx('pop'); renderBar(); return;
    }
  }
}
function renderBar() {
  const owned = G.state.home.owned;
  const counts = {};
  for (const id of owned) counts[id] = (counts[id] || 0) + 1;
  const bar = D.bar;
  const hint = D.sel ? (D.ghost ? (D.valid ? T('Place it here?', 'Đặt ở đây?') : T('It doesn\'t fit here', 'Không vừa chỗ này')) : T('Tap the floor to place it', 'Chạm vào sàn để đặt')) : (owned.length ? T('Pick an item below, or tap placed furniture to move it', 'Chọn đồ bên dưới, hoặc chạm đồ đã đặt để di chuyển') : T('Tap placed furniture to move it, or buy more from Anh Khoa.', 'Chạm đồ đã đặt để di chuyển, hoặc mua thêm ở tiệm Anh Khoa.'));
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
  if (D.sel && D.ghost) {
    const place = h('button', 'btn pink', T('Place', 'Đặt')); place.type = 'button'; place.disabled = !D.valid;
    place.onclick = () => {
      if (!D.valid) return;
      const i = G.state.home.owned.indexOf(D.sel); if (i >= 0) G.state.home.owned.splice(i, 1);
      G.state.home.furniture.push({ id: D.sel, x: D.ghost.x, y: D.ghost.y });
      rebuildHouseFurniture(); markDirty(true);
      fx.burst('spark', D.ghost.x, D.ghost.y - 16, 8, { up: 30, col: '#ffd35a' }); sfx('success');
      if (G.state.home.furniture.length >= 5) unlockAchievement('cozy_home');
      D.sel = null; D.ghost = null; renderBar();
    };
    const cancel = h('button', 'btn ghost', T('Cancel', 'Bỏ chọn')); cancel.type = 'button'; cancel.onclick = () => { D.sel = null; D.ghost = null; sfx('back'); renderBar(); };
    acts.append(cancel, place);
  }
  const done = h('button', 'btn gold', T('Done', 'Xong')); done.type = 'button'; done.onclick = stopDecorate;
  acts.appendChild(done);
}
function drawGhost(c, t) {
  if (!D?.sel || !D.ghost) return;
  const def = FURNITURE[D.sel];
  c.save();
  c.globalAlpha = 0.55 + Math.sin(t * 6) * 0.15;
  c.translate(D.ghost.x, D.ghost.y);
  FURN_DRAW[D.sel](c, t, { ...def, x: D.ghost.x, y: D.ghost.y });
  c.restore();
  c.save();
  c.strokeStyle = D.valid ? '#6fbf73' : '#e8584e'; c.lineWidth = 2; c.setLineDash([4, 4]);
  if (def.wall) c.strokeRect(D.ghost.x - def.w / 2, D.ghost.y - 66, def.w, 26);
  else c.strokeRect(D.ghost.x - def.w / 2, D.ghost.y - def.h, def.w, def.h);
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
