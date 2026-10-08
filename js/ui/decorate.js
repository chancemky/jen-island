// Home decorating — drag and drop. Touch any piece (furniture, or the bed, wardrobe and
// kitchen) and drag it: it follows your finger with a green/red outline and stays wherever
// you let go (saved at once; if it doesn't fit there it slides back). A small toolbar by the
// selected piece turns it or puts it away; Undo steps back. Tap something in the tray to
// add it to a free spot. The camera frames the whole room above the tray (which folds
// down), so every corner can be reached. Rugs and mats go under everything.

import { G, T, markDirty, unlockAchievement } from '../systems/state.js';
import { FURNITURE, furnName } from '../data/game.js';
import { FURN_DRAW, F, drawFurniturePreview, SIDE, drawSide, drawBack } from '../gfx/furniture.js';
import { drawHuman } from '../gfx/character.js';
import { h } from './sheets.js';
import { sfx } from '../core/audio.js';
import { clamp, devHost } from '../core/util.js';
import { toast } from './hud.js';
import { cam, fx } from '../world/render.js';
import { input, releaseJoystick } from '../core/input.js';

let D = null;
// the floor of your home you're decorating (or standing on): ground floor, upstairs or basement
const FLOORS = ['house', 'house_up', 'house_down'];
const house = () => (D?.sc || (FLOORS.includes(G.scene?.id) ? G.scene : null) || G.scenes.house);
// the furniture placed on a floor (the ground floor keeps the original list)
export function furnList(sc = house()) { const h = G.state.home; return sc.id === 'house' ? h.furniture : ((h.rooms ||= {})[sc.id] ||= []); }
const hasBuiltins = sc => sc.id === 'house';

// Built-in pieces of your home. They can be moved and turned but never stored.
export const BUILTINS = {
  bed: { kind: 'bed', en: 'Bed', vi: 'Giường', x: 48, y: 118, w: 60, h: 50, opts: () => ({ col: '#f4a9b8', sleeper: () => G.runtime.sleeper, drawSleeper: (c, a, t) => drawHuman(c, a, t) }),
         trig: { id: 'bed', dx: -34, dy: -2, w: 72, h: 20, label: 'Ngủ', en: 'Sleep', icon: 'zzz', action: 'sleep' } },
  wardrobe: { kind: 'wardrobeBig', en: 'Wardrobe', vi: 'Tủ quần áo', x: 104, y: 72, w: 48, h: 10, opts: () => ({ col: '#e3b77f' }),
         trig: { id: 'wardrobe', dx: -26, dy: 0, w: 52, h: 22, label: 'Thay đồ', en: 'Wardrobe', icon: 'shirt', action: 'wardrobe' } },
  kitchen: { kind: 'kitchen', en: 'Kitchen', vi: 'Bếp', x: 226, y: 98, w: 70, h: 32, opts: () => ({}),
         trig: { id: 'kitchen', dx: -36, dy: 0, w: 70, h: 18, label: 'Bếp', en: 'Kitchen', icon: 'tea', action: 'homeSnack' } },
  lamp: { kind: 'floorLamp', en: 'Floor lamp', vi: 'Đèn đứng', x: 22, y: 150, w: 10, h: 4, round: true, opts: () => ({}) },
  plant: { kind: 'plant', en: 'Potted plant', vi: 'Chậu cây', x: 24, y: 284, w: 14, h: 8, round: true, opts: () => ({ s: 1 }) },
  mat: { kind: 'rug', en: 'Mat', vi: 'Thảm', x: 150, y: 214, w: 96, h: 40, floor: true, opts: () => ({ w: 96, h: 40, col: '#f7d6a0' }) },   // last: it lies under everything
};
function builtinState() {
  const h = G.state.home;
  h.builtins ||= {};
  for (const [k, b] of Object.entries(BUILTINS)) h.builtins[k] ||= { x: b.x, y: b.y, rot: 0 };
  return h.builtins;
}
// Turning a piece: 0 front, 1 turned right, 2 back, 3 turned left. Turned left and
// right show the piece's real side (a box model, see SIDE in furniture.js); round
// pieces look the same from every side. The footprint turns with it.
export function drawTurned(c, t, key, rot, front) {
  c.save();
  if (rot % 2 && SIDE[key]) { if (rot === 3) c.scale(-1, 1); drawSide(c, key, t); }
  else if (rot === 2 && SIDE[key] && !NO_BACK.has(key)) drawBack(c, key, t);       // its real back
  else { if (rot === 2) c.scale(-1, 1); front(); }
  c.restore();
}
// pieces whose back is just their front (screens on a stand look odd as a plain box): mirror instead
const NO_BACK = new Set([]);
export function footprint(w, h, rot, key) { return rot % 2 && SIDE[key] ? { w: h, h: w } : { w, h }; }
const defOf = sel => sel?.startsWith('builtin:') ? BUILTINS[sel.slice(8)] : FURNITURE[sel];
const keyOf = sel => sel.startsWith('builtin:') ? BUILTINS[sel.slice(8)].kind : sel;
const drawSel = (c, t, sel, x, y, rot) => drawTurned(c, t, keyOf(sel), rot, () => {
  if (sel.startsWith('builtin:')) { const b = BUILTINS[sel.slice(8)]; F[b.kind](c, t, { x, y, ...b.opts() }); }
  else FURN_DRAW[sel](c, t, { ...FURNITURE[sel], x, y });
});

// Build props for placed furniture and the built-ins (called on load and after edits).
// `home` is another player's layout when visiting a friend: then the bed, wardrobe and
// kitchen are just furniture (nothing to use in someone else's house).
export function rebuildHouseFurniture(home = null, only = null) {
  if (!home && !only) { for (const id of FLOORS) if (G.scenes[id]) rebuildHouseFurniture(null, G.scenes[id]); return; }
  const sc = only || G.scenes.house;
  sc.props = sc.props.filter(p => !p.homeFurn && !p.builtin);
  sc.solids = sc.solids.filter(s => !s.homeFurn && !s.builtin);
  sc.triggers = sc.triggers.filter(t => !t.builtin);
  const visit = !!home;
  if (hasBuiltins(sc)) {
  const bs = visit ? Object.fromEntries(Object.entries(BUILTINS).map(([k, b]) => [k, home.builtins?.[k] || { x: b.x, y: b.y, rot: 0 }])) : builtinState();
  for (const [k, b] of Object.entries(BUILTINS)) {
    if (D?.lifted?.key === k) continue;                  // being carried right now
    const st = bs[k], rot = st.rot || 0, fp = footprint(b.w, b.h, rot, b.kind);
    const p = { kind: b.kind, builtin: k, x: st.x, y: st.y, ...b.opts() };
    p.draw = (c, t) => drawTurned(c, t, b.kind, rot, () => F[b.kind](c, t, p));
    p.cull = { x: st.x - 90, y: st.y - 110, w: 180, h: 130 };
    if (b.floor) p.flat = true;
    sc.prop(p);
    if (!b.floor) sc.solid(st.x - fp.w / 2, st.y - fp.h, fp.w, fp.h, { builtin: k });
    const tr = visit ? null : b.trig;
    // the action spot follows the piece: in front of it, or beside it when it's turned.
    // The bed is the exception: anywhere next to it (either side, the foot, however it's
    // turned) offers Sleep, so walking up to it from any direction works.
    if (k === 'bed' && tr) sc.trigger({ ...tr, kind: 'act', x: st.x - fp.w / 2 - 14, y: st.y - fp.h, w: fp.w + 28, h: fp.h + 22, builtin: k });
    else if (tr) sc.trigger({ ...tr, kind: 'act', x: rot % 2 ? st.x + (rot === 1 ? fp.w / 2 : -fp.w / 2 - 22) : st.x + tr.dx, y: rot % 2 ? st.y - fp.h / 2 : st.y + tr.dy, w: rot % 2 ? 22 : tr.w, h: rot % 2 ? Math.min(40, fp.h) : tr.h, builtin: k });
    if (k === 'bed' && !visit) sc.bedPos = { x: st.x - 2, y: st.y - 30 };
  }
  }
  for (const f of (visit ? home.furniture : furnList(sc)) || []) if (D?.lifted?.f !== f) addFurnProp(sc, f);
}
// Wall pieces were drawn for walls of different heights. Measure each one once (its topmost
// painted pixel) and lower it just enough that it hangs inside the wall, below the cornice.
const DROP = {};
export function wallDrop(id, WH = 64) {
  const k = id + ':' + WH; if (k in DROP) return DROP[k];
  let top = 0;
  try {
    const cv = document.createElement('canvas'); cv.width = 160; cv.height = 200; const c = cv.getContext('2d');
    c.translate(80, 180); FURN_DRAW[id]?.(c, 0, { ...FURNITURE[id], x: 0, y: 0, off: true });
    const d = c.getImageData(0, 0, 160, 200).data;
    outer: for (let y = 0; y < 200; y++) for (let x = 0; x < 160; x++) if (d[(y * 160 + x) * 4 + 3] > 40) { top = y - 180; break outer; }
  } catch { top = 0; }
  return (DROP[k] = Math.max(0, Math.round(-(WH - 7) - top)));
}
function addFurnProp(sc, f) {
  const def = FURNITURE[f.id]; if (!def) return;
  const rot = f.rot || 0, fp = footprint(def.w, def.h, rot, f.id);
  const dy = def.wall ? wallDrop(f.id, sc.WH) : 0;
  const p = { homeFurn: f, x: f.x, y: f.y, draw: (c, t) => { if (dy) c.translate(0, dy); drawTurned(c, t, f.id, rot, () => FURN_DRAW[f.id](c, t, { ...def, ...(f.fs || {}), x: f.x, y: f.y })); }, cull: { x: f.x - 70, y: f.y - 100, w: 140, h: 140 } };
  if (def.floor) p.flat = true; // rugs sit under everything
  if (def.wall) p.sortY = -1;
  sc.prop(p);
  if (!def.floor && !def.wall) sc.solid(f.x - fp.w / 2, f.y - fp.h, fp.w, fp.h, { homeFurn: f });
}
// does `sel` (a furniture id, or 'builtin:<key>') fit with its base at x,y?
// (`self` is the piece being moved or turned, so it doesn't bump into its own outline)
function fits(sel, x, y, rot = 0, self = null, pad = 0) {
  const def = defOf(sel), sc = house();
  if (def.wall) {
    if (!(x - def.w / 2 > 14 && x + def.w / 2 < sc.w - 14)) return false;
    // not over a window or another wall piece
    for (const q of sc.props) {
      const other = q.homeFurn ? FURNITURE[q.homeFurn.id] : null;
      if (q.homeFurn && (!other?.wall || (self?.f && q.homeFurn === self.f))) continue;
      if (!q.homeFurn && q.kind !== 'window') continue;
      const w = q.homeFurn ? other.w : (q.w || 46);
      if (Math.abs(q.x - x) < (w + def.w) / 2 + 2) return false;
    }
    return true;
  }
  const fp = footprint(def.w, def.h, rot, keyOf(sel));
  // anywhere on the floor, right up against the walls
  if (x - fp.w / 2 < 4 || x + fp.w / 2 > sc.w - 4 || y > sc.h - 6) return false;
  if (y - fp.h < sc.WH - 4) return false;
  if (def.floor) return true;                              // rugs and mats lie under anything
  // don't block the doorway
  if (!sc.noDoor && Math.abs(x - sc.door.x) < fp.w / 2 + 18 && y > sc.h - 30) return false;
  for (const s of sc.solids) {
    if (s.off || (self && (self.f ? s.homeFurn === self.f : s.builtin === self.key))) continue;
    if (x - fp.w / 2 - pad < s.x + s.w && x + fp.w / 2 + pad > s.x && y - fp.h - pad * 2.4 < s.y + s.h && y + pad > s.y) return false;
  }
  return true;
}

// after stairs are built: anything standing where a flight now is moves to a free spot (or,
// if the room is full, back into your storage). Built-ins always find a spot.
export function clearStairs() {
  for (const id of FLOORS) {
    const sc = G.scenes[id]; if (!sc) continue;
    const st = sc.solids.filter(q => q.stairs); if (!st.length) continue;
    const hit = (x, y, w, h) => st.some(q => x - w / 2 < q.x + q.w + 6 && x + w / 2 > q.x - 6 && y - h < q.y + q.h + 24 && y > q.y);
    const keep = D; D = { sc };
    try {
      rebuildHouseFurniture(null, sc);
      const list = furnList(sc);
      for (const f of [...list]) {
        const def = FURNITURE[f.id]; if (!def || def.wall) continue; const fp = footprint(def.w, def.h, f.rot || 0, f.id);
        if (!hit(f.x, f.y, fp.w, fp.h)) continue;
        list.splice(list.indexOf(f), 1); rebuildHouseFurniture(null, sc);
        const spot = freeSpot(f.id); if (spot) { f.x = spot.x; f.y = spot.y; list.push(f); } else G.state.home.owned.push(f.id);
        rebuildHouseFurniture(null, sc);
      }
      if (hasBuiltins(sc)) for (const [k, b] of Object.entries(BUILTINS)) {
        const p = builtinState()[k], fp = footprint(b.w, b.h, p.rot || 0, b.kind); if (b.floor || !hit(p.x, p.y, fp.w, fp.h)) continue;
        const was = { ...p }; p.x = -999; rebuildHouseFurniture(null, sc);
        const spot = freeSpot('builtin:' + k); Object.assign(p, spot ? { x: spot.x, y: spot.y, rot: 0 } : was); rebuildHouseFurniture(null, sc);
      }
    } finally { D = keep; }
    markDirty(true);
  }
}

// ---------------------------------------------------------------- pieces in the room
// a piece: { f } for your furniture, { key } for a built-in
const selOf = pc => pc.f ? pc.f.id : 'builtin:' + pc.key;
const posOf = pc => pc.f ? pc.f : builtinState()[pc.key];
function pieces() {
  const out = furnList().map(f => ({ f }));
  if (hasBuiltins(house())) for (const k of Object.keys(BUILTINS)) out.push({ key: k });
  return out;
}
// what's under a tap: things standing on the floor first (front-most first), then wall
// pieces, and rugs last (so you can always grab the table that stands on the rug)
function pieceAt(wx, wy) {
  const hits = [];
  for (const [order, pc] of pieces().entries()) {
    const def = defOf(selOf(pc)), st = posOf(pc), fp = footprint(def.w, def.h, st.rot || 0, keyOf(selOf(pc)));
    const hw = Math.max(fp.w / 2, 13) + 5, top = def.wall ? st.y - 66 : def.floor ? st.y - fp.h - 4 : st.y - Math.max(fp.h, pc.key ? 44 : 30) - 16;
    // (rugs: your own lie on top of the built-in mat, and newer ones on top of older ones)
    if (wx > st.x - hw && wx < st.x + hw && wy > top && wy < st.y + 8) hits.push({ pc, rank: def.floor ? (pc.f ? 0.5 : 0) : def.wall ? 1 : 2, y: def.floor ? order : st.y });
  }
  hits.sort((a, b) => b.rank - a.rank || b.y - a.y);
  return hits[0]?.pc || null;
}
// a free place for something new, as close to the middle of the floor as possible
function freeSpot(sel, pad = 12) {   // (new pieces keep a little room around them, so they're easy to see and grab)
  const sc = house(), def = defOf(sel);
  if (def.wall) { for (let r = 0; r < sc.w / 2; r += 8) for (const sx of [1, -1]) { const x = sc.w / 2 + sx * r; if (fits(sel, x, sc.WH)) return { x: Math.round(x / 4) * 4, y: sc.WH }; } return null; }
  const cx = sc.w / 2, cy = (sc.WH + sc.h) / 2 + def.h / 2;
  for (let r = 0; r < 260; r += 8) for (let k = 0; k < Math.max(1, Math.floor(r / 4)); k++) {
    const a = k / Math.max(1, Math.floor(r / 4)) * Math.PI * 2, x = Math.round((cx + Math.cos(a) * r) / 4) * 4, y = Math.round((cy + Math.sin(a) * r * 0.7) / 4) * 4;
    if (fits(sel, x, y, 0, null, pad)) return { x, y };
  }
  return pad ? freeSpot(sel, 0) : null;
}

// ---------------------------------------------------------------- undo
const snap = () => JSON.stringify({ furniture: G.state.home.furniture, rooms: G.state.home.rooms || {}, owned: G.state.home.owned, builtins: builtinState() });
function restore(txt) { const o = JSON.parse(txt); Object.assign(G.state.home, { furniture: o.furniture, rooms: o.rooms, owned: o.owned, builtins: o.builtins }); D.sel = null; rebuildHouseFurniture(); markDirty(true); }
function changed(before) { if (before !== snap()) { D.hist.push(before); if (D.hist.length > 30) D.hist.shift(); markDirty(true); } }

// ---------------------------------------------------------------- the mode
export function isDecorating() { return !!D; }
export function startDecorate() {
  if (D) return;
  releaseJoystick();
  input.enabled = false;
  G.runtime.pause++;
  document.body.classList.add('hide-controls', 'decorating');
  const bar = h('div', 'deco-bar'), tools = h('div', 'deco-tools hidden');
  document.getElementById('app').append(bar, tools);
  D = { sc: house(), bar, tools, sel: null, lifted: null, drag: null, ghost: null, valid: false, hist: [], folded: false };
  D.padWas = D.sc.bottomPad || 0;
  renderBar();
  const touch = document.getElementById('touch');
  D.onDown = e => {
    if (!D) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const [wx, wy] = toWorld(e);
    const pc = pieceAt(wx, wy);
    if (!pc) { if (D.sel) { D.sel = null; sfx('back'); renderBar(); } return; }
    const st = posOf(pc);
    D.sel = pc;
    D.drag = { pc, id: e.pointerId, sx: e.clientX, sy: e.clientY, gx: wx - st.x, gy: wy - st.y, moved: false, from: { x: st.x, y: st.y, rot: st.rot || 0 }, before: snap() };
    sfx('pop'); renderBar();
  };
  D.onMove = e => {
    const d = D?.drag; if (!d || e.pointerId !== d.id) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
    if (!d.moved) { d.moved = true; D.lifted = d.pc; rebuildHouseFurniture(); }    // lift it out of the room while it's carried
    const [wx, wy] = toWorld(e), sel = selOf(d.pc), def = defOf(sel);
    const x = Math.round((wx - d.gx) / 4) * 4, y = def.wall ? house().WH : Math.round((wy - d.gy) / 4) * 4;
    D.ghost = { x, y }; D.valid = fits(sel, x, y, d.from.rot, d.pc);
    renderHint();
  };
  D.onUp = e => {
    const d = D?.drag; if (!d || e.pointerId !== d.id) return;
    D.drag = null;
    if (d.moved) {
      const st = posOf(d.pc);
      if (D.valid) { st.x = D.ghost.x; st.y = D.ghost.y; sfx('success'); fx.burst('spark', st.x, st.y - 14, 6, { up: 24, col: '#ffd35a' }); }
      else { sfx('error'); toast({ text: T('It doesn\'t fit there', 'Không vừa chỗ đó'), sub: T('Put back where it was.', 'Đã để lại chỗ cũ.'), icon: 'sofa', ms: 1400 }); }
      D.lifted = null; D.ghost = null; rebuildHouseFurniture(); changed(d.before);
    }
    renderBar();
  };
  touch.addEventListener('pointerdown', D.onDown, true);
  window.addEventListener('pointermove', D.onMove, true);
  window.addEventListener('pointerup', D.onUp, true);
  window.addEventListener('pointercancel', D.onUp, true);
  G.runtime.decoOverlay = drawOverlay;
  if (devHost()) window.__deco = () => D;   // (tests)
  const tick = () => { if (!D) return; placeTools(); D.raf = requestAnimationFrame(tick); }; tick();
}
function toWorld(e) { const r = document.getElementById('game').getBoundingClientRect(); return G.renderer.toWorld(e.clientX - r.left, e.clientY - r.top); }

// frame the whole room in the space above the tray
function frameRoom() {
  const sc = house(), cv = document.getElementById('game').getBoundingClientRect(), W = cv.width, H = cv.height;
  const trayH = D.bar.getBoundingClientRect().height || 180;
  let zb = cam.baseZoom * (sc.zoomBias || 1); if (sc.fitW) zb = Math.min(zb, Math.max(W / sc.fitW, cam.baseZoom * 0.8));
  const z = Math.min(W / (sc.w + 16), (H - trayH - 24) / (sc.h + 10), zb * 1.15);
  cam.targetZoomMul = z / zb; cam.zoomMul = cam.targetZoomMul;
  sc.bottomPad = D.padWas + (trayH + 8) / z;
}

function act(label, cls, fn, disabled = false) { const b = h('button', 'btn ' + cls, label); b.type = 'button'; b.disabled = disabled; b.onclick = e => { e.stopPropagation(); fn(b); }; return b; }
function renderHint() {
  const el = D?.bar.querySelector('.deco-hint'); if (!el) return;
  el.textContent = D.drag?.moved ? (D.valid ? T('Let go to put it here', 'Thả tay để đặt ở đây') : T('It doesn\'t fit here — let go and it goes back', 'Không vừa chỗ này — thả ra là về chỗ cũ'))
    : D.sel ? T('Drag it anywhere · turn it or put it away with the buttons', 'Kéo đi chỗ khác · xoay hoặc cất bằng các nút')
    : T('Drag anything in your room to move it · tap an item below to add it', 'Kéo đồ trong phòng để dời · chạm món bên dưới để thêm vào');
}
function renderBar() {
  const bar = D.bar, owned = G.state.home.owned, counts = {};
  for (const id of owned) if (FURNITURE[id]) counts[id] = (counts[id] || 0) + 1;
  bar.classList.toggle('folded', D.folded);
  bar.innerHTML = `<div class="deco-head"><div class="deco-hint"></div><div class="deco-actions"></div></div><div class="row-scroll"></div>`;
  renderHint();
  const acts = bar.querySelector('.deco-actions');
  acts.append(
    act(T('↶ Undo', '↶ Hoàn tác'), 'ghost small', () => { if (D.hist.length) { restore(D.hist.pop()); sfx('whoosh'); renderBar(); } }, !D.hist.length),
    act(D.folded ? '▴' : '▾', 'ghost small', () => { D.folded = !D.folded; sfx('ui'); renderBar(); }),
    act(T('Done', 'Xong'), 'gold', () => stopDecorate()));
  acts.children[1].title = D.folded ? T('Show your items', 'Hiện đồ') : T('Hide the tray', 'Thu gọn');
  const row = bar.querySelector('.row-scroll');
  const ids = Object.keys(counts);
  if (!ids.length) row.appendChild(h('div', 'deco-empty', T('Everything you own is in the room. Anh Khoa sells more on Market Street.', 'Đồ của bạn đã bày hết trong phòng. Nhà đẹp Anh Khoa ở Phố Chợ có bán thêm.')));
  for (const id of ids) {
    const it = h('button', 'deco-item'); it.type = 'button';
    const cv = document.createElement('canvas'); cv.width = 112; cv.height = 88;
    it.appendChild(cv); it.appendChild(document.createTextNode(`${furnName(id)}${counts[id] > 1 ? ' ×' + counts[id] : ''}`));
    drawFurniturePreview(cv, id, FURNITURE[id]);
    it.onclick = () => {
      const spot = freeSpot(id);
      if (!spot) { sfx('error'); toast({ text: T('No room for that', 'Hết chỗ rồi'), sub: T('Move or put something away first.', 'Dời hoặc cất bớt đồ trước nhé.'), icon: 'sofa' }); return; }
      const before = snap(), i = owned.indexOf(id); if (i >= 0) owned.splice(i, 1);
      const f = { id, x: spot.x, y: spot.y, rot: 0 }; furnList().push(f);
      rebuildHouseFurniture(); changed(before); D.sel = { f };
      fx.burst('spark', f.x, f.y - 14, 8, { up: 30, col: '#ffd35a' }); sfx('success');
      if (furnList().length >= 5) unlockAchievement('cozy_home');
      renderBar();
    };
    row.appendChild(it);
  }
  renderTools();
  requestAnimationFrame(() => D && frameRoom());
}
// the little toolbar that floats over the selected piece
function renderTools() {
  const t = D.tools; t.innerHTML = '';
  if (!D.sel) { t.classList.add('hidden'); return; }
  const sel = selOf(D.sel), def = defOf(sel);
  const turn = d => {
    const st = posOf(D.sel), rot = ((st.rot || 0) + d + 4) % 4;
    if (!fits(sel, st.x, st.y, rot, D.sel)) { sfx('error'); toast({ text: T('No room to turn it here', 'Không đủ chỗ để xoay'), icon: 'sofa', ms: 1400 }); return; }
    const before = snap(); st.rot = rot; rebuildHouseFurniture(); changed(before); sfx('whoosh'); renderBar();
  };
  if (!def.wall && SIDE[keyOf(sel)]) t.append(act('↺', 'ghost small icon', () => turn(-1)), act('↻', 'ghost small icon', () => turn(1)));
  else t.append(act('⇋', 'ghost small icon', () => turn(2)));                       // everything else can be mirrored
  if (D.sel.f) t.append(act(T('Put away', 'Cất đi'), 'ghost small', () => {
    const before = snap(), list = furnList(), i = list.indexOf(D.sel.f);
    if (i >= 0) { list.splice(i, 1); G.state.home.owned.push(D.sel.f.id); }
    D.sel = null; rebuildHouseFurniture(); changed(before); sfx('pop'); renderBar();
  }));
  t.append(act('✕', 'ghost small', () => { D.sel = null; sfx('back'); renderBar(); }));
  t.classList.remove('hidden');
}
function placeTools() {
  const t = D.tools; if (!D.sel || D.drag?.moved) { t.style.visibility = 'hidden'; return; }
  const st = posOf(D.sel), def = defOf(selOf(D.sel)), v = cam.view, z = cam.zoom, r = document.getElementById('game').getBoundingClientRect();
  const top = def.wall ? st.y - 70 : st.y - Math.max(footprint(def.w, def.h, st.rot || 0, keyOf(selOf(D.sel))).h, D.sel.key ? 48 : 34) - 22;
  const sx = r.left + (st.x - v.x) * z, sy = r.top + (top - v.y) * z;
  const w = t.offsetWidth, hh = t.offsetHeight;
  t.style.left = clamp(sx - w / 2, 8, innerWidth - w - 8) + 'px'; t.style.top = clamp(sy - hh, 8, innerHeight - hh - 8) + 'px'; t.style.visibility = 'visible';
}
function drawOverlay(c, t) {
  if (!D) return;
  // the piece being carried
  if (D.lifted && D.ghost) {
    const sel = selOf(D.lifted), def = defOf(sel), rot = posOf(D.lifted).rot || 0, fp = footprint(def.w, def.h, rot, keyOf(sel));
    c.save(); c.globalAlpha = 0.75; c.translate(D.ghost.x, D.ghost.y - 3 + (def.wall && !sel.startsWith('builtin:') ? wallDrop(sel, house().WH) : 0)); drawSel(c, t, sel, D.ghost.x, D.ghost.y, rot); c.restore();
    c.save(); c.strokeStyle = D.valid ? '#4fae5a' : '#e8584e'; c.fillStyle = D.valid ? 'rgba(111,191,115,.18)' : 'rgba(232,88,78,.18)'; c.lineWidth = 2; c.setLineDash([5, 4]);
    if (def.wall) { c.fillRect(D.ghost.x - def.w / 2, D.ghost.y - 66, def.w, 26); c.strokeRect(D.ghost.x - def.w / 2, D.ghost.y - 66, def.w, 26); }
    else { c.fillRect(D.ghost.x - fp.w / 2, D.ghost.y - fp.h, fp.w, fp.h); c.strokeRect(D.ghost.x - fp.w / 2, D.ghost.y - fp.h, fp.w, fp.h); }
    c.restore(); return;
  }
  // the selected piece: a soft pulsing outline round its footprint
  if (D.sel) {
    const sel = selOf(D.sel), def = defOf(sel), st = posOf(D.sel), fp = footprint(def.w, def.h, st.rot || 0, keyOf(sel)), k = 2 + Math.sin(t * 5) * 1.2;
    c.save(); c.strokeStyle = '#f08ca0'; c.lineWidth = 2; c.setLineDash([6, 4]); c.lineDashOffset = -t * 20;
    if (def.wall) c.strokeRect(st.x - def.w / 2 - k, st.y - 66 - k, def.w + k * 2, 26 + k * 2);
    else c.strokeRect(st.x - fp.w / 2 - k, st.y - fp.h - k, fp.w + k * 2, fp.h + k * 2);
    c.restore();
  }
}
export function stopDecorate() {
  if (!D) return;
  const touch = document.getElementById('touch');
  touch.removeEventListener('pointerdown', D.onDown, true);
  window.removeEventListener('pointermove', D.onMove, true);
  window.removeEventListener('pointerup', D.onUp, true);
  window.removeEventListener('pointercancel', D.onUp, true);
  cancelAnimationFrame(D.raf);
  if (D.lifted) { D.lifted = null; rebuildHouseFurniture(); }
  D.bar.remove(); D.tools.remove();
  house().bottomPad = D.padWas;
  D = null;
  input.enabled = true;
  G.runtime.pause--;
  G.runtime.decoOverlay = null;
  cam.targetZoomMul = 1;
  document.body.classList.remove('hide-controls', 'decorating');
  sfx('back');
}
