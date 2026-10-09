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
import { openRoomStyle, drawRecoloured, HUES } from '../systems/homestyle.js';

let D = null;
// the floor of your home you're decorating (or standing on): ground floor, upstairs or basement
const FLOORS = ['house', 'house_up', 'house_down'];
const house = () => (D?.sc || (FLOORS.includes(G.scene?.id) ? G.scene : null) || G.scenes.house);
// the furniture placed on a floor (the ground floor keeps the original list)
export function furnList(sc = house()) { const h = G.state.home; return sc.id === 'house' ? h.furniture : ((h.rooms ||= {})[sc.id] ||= []); }
const hasBuiltins = sc => sc.id === 'house';

// Built-in pieces of your home. They can be moved and turned but never stored.
export const BUILTINS = {
  bed: { kind: 'bed', en: 'Bed', vi: 'Giường', x: 39, y: 112, w: 60, h: 50, opts: () => ({ col: '#f4a9b8', sleeper: () => G.runtime.sleeper, drawSleeper: (c, a, t) => drawHuman(c, a, t) }),
         trig: { id: 'bed', dx: -34, dy: -2, w: 72, h: 20, label: 'Ngủ', en: 'Sleep', icon: 'zzz', action: 'sleep' } },
  wardrobe: { kind: 'wardrobeBig', en: 'Wardrobe', vi: 'Tủ quần áo', x: 127, y: 80, w: 48, h: 10, opts: () => ({ col: '#e3b77f' }),
         trig: { id: 'wardrobe', dx: -26, dy: 0, w: 52, h: 22, label: 'Thay đồ', en: 'Wardrobe', icon: 'shirt', action: 'wardrobe' } },
  kitchen: { kind: 'kitchen', en: 'Kitchen', vi: 'Bếp', x: 231, y: 96, w: 70, h: 32, opts: () => ({}),
         trig: { id: 'kitchen', dx: -36, dy: 0, w: 70, h: 18, label: 'Bếp', en: 'Kitchen', icon: 'tea', action: 'homeSnack' } },
  lamp: { kind: 'floorLamp', en: 'Floor lamp', vi: 'Đèn đứng', x: 15, y: 144, w: 10, h: 4, round: true, opts: () => ({}) },
  plant: { kind: 'plant', en: 'Potted plant', vi: 'Chậu cây', x: 15, y: 288, w: 14, h: 8, round: true, opts: () => ({ s: 1 }) },
  mat: { kind: 'rug', en: 'Mat', vi: 'Thảm', x: 135, y: 208, w: 96, h: 40, floor: true, opts: () => ({ w: 96, h: 40, col: '#f7d6a0' }) },   // last: it lies under everything
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
// The floor is a grid of square tiles (like a cosy-life game's): every piece covers whole tiles —
// 1×1, 2×1, 3×2… — so pieces line up, sit flush side by side and never overlap. Turning a piece
// that has a real side view swaps its width and depth.
export const TILE = 16;
export function footprint(w, h, rot, key) {
  const tw = Math.max(1, Math.round(w / TILE)) * TILE, th = Math.max(1, Math.round(h / TILE)) * TILE;
  return rot % 2 && SIDE[key] ? { w: th, h: tw } : { w: tw, h: th };
}
export function floorGrid(sc = house()) {
  const cols = Math.floor((sc.w - 8) / TILE), ox = Math.round((sc.w - cols * TILE) / 2), oy = sc.WH, rows = Math.floor((sc.h - 6 - oy) / TILE);
  return { cols, rows, ox, oy };
}
// the nearest grid position for a piece whose base (front, centre) is near x, y
export function snapTo(sel, x, y, rot = 0) {
  const def = defOf(sel), sc = house();
  if (def.wall) { const [lo, hi] = wallLift(sel, sc.WH); return { x: Math.round(x / 4) * 4, y: sc.WH + clamp(Math.round((y - sc.WH) / 4) * 4, lo, hi) }; }
  const g = floorGrid(sc), fp = footprint(def.w, def.h, rot, keyOf(sel));
  const left = clamp(g.ox + Math.round((x - fp.w / 2 - g.ox) / TILE) * TILE, g.ox, g.ox + g.cols * TILE - fp.w);
  const bottom = clamp(g.oy + Math.round((y - g.oy) / TILE) * TILE, g.oy + fp.h, g.oy + g.rows * TILE);
  return { x: left + fp.w / 2, y: bottom };
}
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
  coverFixtures(sc, visit ? home.furniture : furnList(sc));
}
// Wall pieces were drawn for walls of different heights. Measure each one once (its topmost
// painted pixel) and lower it just enough that it hangs inside the wall, below the cornice.
// The painted area of a drawing, relative to its anchor (measured once, then cached).
const BOX = {};
function paintedBox(k, draw) {
  if (BOX[k]) return BOX[k];
  let l = 0, r = 0, t = 0, b = 0, any = false;
  try {
    const cv = document.createElement('canvas'); cv.width = 200; cv.height = 200; const c = cv.getContext('2d');
    c.translate(100, 180); draw(c);
    const d = c.getImageData(0, 0, 200, 200).data;
    for (let y = 0; y < 200; y++) for (let x = 0; x < 200; x++) if (d[(y * 200 + x) * 4 + 3] > 60) {
      if (!any) { l = r = x; t = b = y; any = true; } else { l = Math.min(l, x); r = Math.max(r, x); b = y; }
    }
  } catch { /* no canvas: fall back to the catalogue size */ }
  return (BOX[k] = any ? { l: l - 100, r: r - 100 + 1, t: t - 180, b: b - 180 + 1 } : null);
}
const furnBox = id => paintedBox('f:' + id, c => FURN_DRAW[id]?.(c, 0, { ...FURNITURE[id], x: 0, y: 0, off: true })) || { l: -FURNITURE[id].w / 2, r: FURNITURE[id].w / 2, t: -40, b: -14 };
export function wallDrop(id, WH = 64) { return Math.max(0, Math.round(-(WH - 7) - furnBox(id).t)); }
// A wall piece's anchor is (x, WH + lift): it can hang anywhere along the back wall, at any
// height that keeps it on the wall (below the cornice, above the skirting).
function wallLift(id, WH) {
  const bx = furnBox(id), drop = wallDrop(id, WH), top = WH + bx.t + drop, bot = WH + bx.b + drop;
  return [Math.min(0, 4 - top), Math.max(0, WH - 3 - bot)];
}
function wallRect(id, x, y, WH, rot = 0) {
  const bx = furnBox(id), dy = y + wallDrop(id, WH), [l, r] = rot === 2 ? [-bx.r, -bx.l] : [bx.l, bx.r];   // (mirrored)
  return { l: x + l, r: x + r, t: dy + bx.t, b: dy + bx.b };
}
// the room's own fixtures on the back wall (windows, the clock, the calendar, shelves…). Windows
// stay put; the little decorations (clock, calendar, family photo, shelf) step aside when you
// hang something of your own over them.
const isFixture = q => q.sortY === -1 && !q.homeFurn && !q.flat && q.kind && (q.draw || q.drawOwn);
const yields = q => q.kind !== 'window';
export function fixtureRect(q, WH) {
  const bx = paintedBox(`q:${q.kind}:${q.w}:${q.h}:${q.hgt}`, c => (q.drawOwn || q.draw)(c, 0)); if (!bx) return null;
  return { l: q.x + bx.l, r: q.x + bx.r, t: q.y + bx.t, b: Math.min(WH, q.y + bx.b) };
}
// your wall pieces hide the room's little decorations they're hung over
function coverFixtures(sc, list) {
  const mine = (list || []).filter(f => FURNITURE[f.id]?.wall).map(f => wallRect(f.id, f.x, f.y, sc.WH, f.rot || 0));
  for (const q of sc.props) {
    if (!isFixture(q) || !yields(q)) continue;
    q.drawOwn ||= q.draw;
    const R = fixtureRect(q, sc.WH);
    q.covered = !!R && mine.some(m => overlaps(m, R, -1));
    q.draw = q.covered ? () => {} : q.drawOwn;
  }
}
// tall things standing against the back wall (wardrobe, kitchen, bed head…) hide the wall behind them
export function hidesWall(sc) {
  const out = [];
  for (const q of sc.props) {
    if (q.flat || q.sortY === -1 || !q.draw || q.y > sc.WH + 48 || (q.homeFurn && FURNITURE[q.homeFurn.id]?.wall)) continue;
    const k = q.homeFurn ? `o:${q.homeFurn.id}:${q.homeFurn.rot || 0}` : `o:${q.kind || q.builtin || 'x'}:${q.w}:${q.h}`;
    const bx = paintedBox(k, c => q.draw(c, 0)); if (bx) out.push({ l: q.x + bx.l, r: q.x + bx.r, t: q.y + bx.t, b: q.y + bx.b });
  }
  return out;
}
const overlaps = (a, b, gap = 1) => a.l < b.r + gap && a.r > b.l - gap && a.t < b.b + gap && a.b > b.t - gap;
function addFurnProp(sc, f) {
  const def = FURNITURE[f.id]; if (!def) return;
  const rot = f.rot || 0, fp = footprint(def.w, def.h, rot, f.id);
  const dy = def.wall ? wallDrop(f.id, sc.WH) + (f.y - sc.WH) : 0;
  const plain = (c, t) => drawTurned(c, t, f.id, rot, () => FURN_DRAW[f.id](c, t, { ...def, ...(f.fs || {}), x: f.x, y: f.y }));
  // a piece you've recoloured is drawn from a cached image in its new colour (lights keep their glow: they can't be recoloured)
  const draw = f.hue && !def.light ? c => drawRecoloured(c, `${f.id}:${rot}`, f.hue, cc => plain(cc, 0)) : plain;
  const p = { homeFurn: f, x: f.x, y: def.wall ? sc.WH : f.y, draw: (c, t) => { if (dy) c.translate(0, dy); draw(c, t); }, cull: { x: f.x - 70, y: f.y - 100, w: 140, h: 140 } };
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
    const [lo, hi] = wallLift(sel, sc.WH), R = wallRect(sel, x, y, sc.WH, rot);
    if (y - sc.WH < lo || y - sc.WH > hi || R.l < 8 || R.r > sc.w - 8) return false;
    // not over a window, a fixture or another wall piece
    for (const q of sc.props) {
      let Q = null;
      if (q.homeFurn) { if (!FURNITURE[q.homeFurn.id]?.wall || (self?.f && q.homeFurn === self.f)) continue; Q = wallRect(q.homeFurn.id, q.homeFurn.x, q.homeFurn.y, sc.WH, q.homeFurn.rot || 0); }
      else if (isFixture(q) && !yields(q)) Q = fixtureRect(q, sc.WH);
      if (Q && overlaps(R, Q)) return false;
    }
    return true;
  }
  const fp = footprint(def.w, def.h, rot, keyOf(sel)), g = floorGrid(sc), E = 0.5;
  // anywhere on the floor grid, right up against the walls
  if (x - fp.w / 2 < g.ox - E || x + fp.w / 2 > g.ox + g.cols * TILE + E || y > g.oy + g.rows * TILE + E || y - fp.h < g.oy - E) return false;
  if (def.floor) return true;                              // rugs and mats lie under anything
  // don't block the doorway
  if (!sc.noDoor && Math.abs(x - sc.door.x) < fp.w / 2 + 18 && y > sc.h - 30) return false;
  for (const s of sc.solids) {
    if (s.off || (self && (self.f ? s.homeFurn === self.f : s.builtin === self.key))) continue;
    if (x - fp.w / 2 - pad < s.x + s.w - E && x + fp.w / 2 + pad > s.x + E && y - fp.h - pad < s.y + s.h - E && y + pad > s.y + E) return false;   // (sharing an edge is fine)
  }
  return true;
}

// after the house changes (bigger room, new stairs) or a save from an older layout loads:
// anything that no longer fits — off the floor, on the stairs, overlapping — moves to the nearest
// free spot (or, if the room is full, back into your storage). Built-ins always find a spot.
export function clearStairs() {
  for (const id of FLOORS) {
    const sc = G.scenes[id]; if (!sc) continue;
    const keep = D; D = { sc }; let moved = 0;
    try {
      rebuildHouseFurniture(null, sc);
      if (hasBuiltins(sc)) for (const [k, b] of Object.entries(BUILTINS)) {
        const p = builtinState()[k], sn = snapTo('builtin:' + k, p.x, p.y, p.rot || 0);
        if (sn.x !== p.x || sn.y !== p.y) { const was = { x: p.x, y: p.y }; Object.assign(p, sn); rebuildHouseFurniture(null, sc); if (!fits('builtin:' + k, p.x, p.y, p.rot || 0, { key: k })) Object.assign(p, was); else moved++; rebuildHouseFurniture(null, sc); }
        if (fits('builtin:' + k, p.x, p.y, p.rot || 0, { key: k })) continue;
        const was = { ...p }; p.x = -999; rebuildHouseFurniture(null, sc);
        const spot = freeSpot('builtin:' + k, 0, was); Object.assign(p, spot ? { x: spot.x, y: spot.y, rot: 0 } : was); rebuildHouseFurniture(null, sc); moved++; void b;
      }
      const list = furnList(sc);
      for (const f of [...list]) {
        if (!FURNITURE[f.id]) continue;
        const sn = snapTo(f.id, f.x, f.y, f.rot || 0);          // (older layouts: onto the grid)
        if (sn.x !== f.x || sn.y !== f.y) { const was = { x: f.x, y: f.y }; f.x = sn.x; f.y = sn.y; rebuildHouseFurniture(null, sc); if (!fits(f.id, f.x, f.y, f.rot || 0, { f })) { f.x = was.x; f.y = was.y; } else moved++; rebuildHouseFurniture(null, sc); }
        if (fits(f.id, f.x, f.y, f.rot || 0, { f })) continue;
        list.splice(list.indexOf(f), 1); rebuildHouseFurniture(null, sc);
        const spot = freeSpot(f.id, 0, { x: f.x, y: f.y }); if (spot) { f.x = spot.x; f.y = spot.y; f.rot = 0; list.push(f); } else G.state.home.owned.push(f.id);
        rebuildHouseFurniture(null, sc); moved++;
      }
    } finally { D = keep; }
    if (moved) markDirty(true);
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
  // What's under your finger. Each piece has two areas: its tiles on the floor, and the space its
  // drawing takes up above them. A tap on a piece's own tiles wins outright; otherwise the piece
  // whose drawing you touched, nearest first (wall pieces before floor pieces behind them, rugs last).
  let best = null;
  for (const [order, pc] of pieces().entries()) {
    const def = defOf(selOf(pc)), st = posOf(pc), fp = footprint(def.w, def.h, st.rot || 0, keyOf(selOf(pc)));
    const WR = def.wall ? wallRect(selOf(pc), st.x, st.y, house().WH, st.rot || 0) : null;
    const hw = Math.max(fp.w / 2, 12) + 3, top = WR ? WR.t - 3 : def.floor ? st.y - fp.h - 2 : st.y - Math.max(fp.h, pc.key ? 44 : 30) - 12;
    const bottom = WR ? WR.b + 3 : st.y + 4;
    if (WR ? wx < WR.l - 3 || wx > WR.r + 3 || wy < top || wy > bottom : wx < st.x - hw || wx > st.x + hw || wy < top || wy > bottom) continue;
    const onTiles = !def.wall && wx >= st.x - fp.w / 2 && wx <= st.x + fp.w / 2 && wy >= st.y - fp.h && wy <= st.y;
    const rank = def.floor ? (pc.f ? 1 : 0) + order * 0.001 : onTiles ? 4 : def.wall ? 3 : 2;
    const d = Math.hypot(wx - st.x, (wy - (st.y - Math.min(fp.h, 20))) * 0.7);
    if (!best || rank > best.rank || (rank === best.rank && d < best.d)) best = { pc, rank, d };
  }
  return best?.pc || null;
}
// the free place on the back wall nearest to x, y (anywhere along it, at any height)
function wallSpot(sel, x0, y0, self = null, rot = 0, visible = false) {
  const sc = house(), [lo, hi] = wallLift(sel, sc.WH), spots = [], hid = visible ? hidesWall(sc) : [];
  if (visible === 2) for (const q of sc.props) if (isFixture(q) && !q.covered) { const R = fixtureRect(q, sc.WH); if (R) hid.push(R); }   // (first try not to cover the room's own decorations)
  for (let x = 8; x <= sc.w - 8; x += 4) for (let k = lo; k <= hi; k += 4) spots.push({ x, y: sc.WH + k, d: Math.hypot(x - x0, (sc.WH + k - y0) * 1.5) });
  spots.sort((a, b) => a.d - b.d);
  for (const s of spots) if (fits(sel, s.x, s.y, rot, self) && !hid.some(o => overlaps(wallRect(sel, s.x, s.y, sc.WH, rot), o, 0))) return { x: s.x, y: s.y };
  return visible === 2 ? wallSpot(sel, x0, y0, self, rot, 1) : null;
}
// a free place for something new, as close to the middle of the floor as possible — or, for a
// piece that has to move (the stairs went in where it stood), as close as possible to where it was,
// so a wardrobe on the back wall stays on the back wall
function freeSpot(sel, pad = TILE, near = null) {   // (new pieces keep a tile of room around them where they can, so they're easy to see and grab)
  const sc = house(), def = defOf(sel);
  if (def.wall) return wallSpot(sel, near?.x ?? sc.w / 2, near?.y ?? sc.WH * 0.5, null, 0, 2);      // (somewhere you can see it)
  const g = floorGrid(sc), fp = footprint(def.w, def.h, 0, keyOf(sel)), spots = [];
  const cx = near?.x ?? sc.w / 2, cy = near?.y ?? g.oy + g.rows * TILE * 0.6, wy = near ? 2.2 : 1.3;   // (moving: stay at the same depth before going sideways)
  for (let gx = 0; gx * TILE + fp.w <= g.cols * TILE; gx++) for (let gy = fp.h / TILE; gy <= g.rows; gy++) {
    const x = g.ox + gx * TILE + fp.w / 2, y = g.oy + gy * TILE;
    spots.push({ x, y, d: Math.hypot(x - cx, (y - cy) * wy) });
  }
  spots.sort((a, b) => a.d - b.d);
  for (const s of spots) if (fits(sel, s.x, s.y, 0, null, near ? 0 : pad)) return { x: s.x, y: s.y };
  return pad && !near ? freeSpot(sel, 0) : null;
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
    if (!pc) {
      // a piece is selected and you tap somewhere empty: move it there (if it fits), like picking it up and putting it down
      if (D.sel) {
        const sel = selOf(D.sel), st = posOf(D.sel), def = defOf(sel), to = def.wall ? snapTo(sel, wx, st.y + wy - (wallRect(sel, st.x, st.y, house().WH).t + wallRect(sel, st.x, st.y, house().WH).b) / 2) : snapTo(sel, wx, wy + footprint(def.w, def.h, st.rot || 0, keyOf(sel)).h / 2, st.rot || 0);
        if ((to.x !== st.x || to.y !== st.y) && fits(sel, to.x, to.y, st.rot || 0, D.sel)) { const before = snap(); st.x = to.x; st.y = to.y; rebuildHouseFurniture(); changed(before); sfx('success'); fx.burst('spark', st.x, st.y - 14, 6, { up: 24, col: '#ffd35a' }); renderBar(); return; }
        D.sel = null; sfx('back'); renderBar();
      }
      return;
    }
    const st = posOf(pc);
    D.sel = pc;
    D.drag = { pc, id: e.pointerId, sx: e.clientX, sy: e.clientY, gx: wx - st.x, gy: wy - st.y, moved: false, from: { x: st.x, y: st.y, rot: st.rot || 0 }, before: snap() };
    sfx('pop'); renderBar();
  };
  D.onMove = e => {
    const d = D?.drag; if (!d || e.pointerId !== d.id) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
    if (!d.moved) { d.moved = true; D.lifted = d.pc; rebuildHouseFurniture(); }    // lift it out of the room while it's carried
    const [wx, wy] = toWorld(e), sel = selOf(d.pc);
    const { x, y } = snapTo(sel, wx - d.gx, wy - d.gy, d.from.rot);     // tile by tile
    if (D.ghost && D.ghost.x === x && D.ghost.y === y) return;
    if (D.ghost) sfx('tap');
    D.ghost = { x, y }; D.valid = fits(sel, x, y, d.from.rot, d.pc);
    if (defOf(sel).wall) { const sc = house(), ok = []; for (let gx = 8; gx <= sc.w - 8; gx += 4) if (fits(sel, gx, y, d.from.rot, d.pc)) ok.push(gx); D.wallOK = { ok, y }; }
    renderHint();
  };
  D.onUp = e => {
    const d = D?.drag; if (!d || e.pointerId !== d.id) return;
    D.drag = null;
    if (d.moved) {
      const st = posOf(d.pc);
      // dropped where it doesn't quite fit: settle into the nearest free spot (up to two tiles away)
      if (!D.valid && D.ghost) {
        const sel = selOf(d.pc), def = defOf(sel), step = TILE; let near = def.wall ? wallSpot(sel, D.ghost.x, D.ghost.y, d.pc, d.from.rot) : null;
        for (let r = 1; r <= 2 && !near && !def.wall; r++) for (let dx = -r; dx <= r && !near; dx++) for (let dy = -r; dy <= r && !near; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const x = D.ghost.x + dx * step, y = D.ghost.y + dy * step;
          if (fits(sel, x, y, d.from.rot, d.pc)) near = { x, y };
        }
        if (near) { D.ghost = near; D.valid = true; }
      }
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
    act(T('🎨 Walls', '🎨 Tường'), 'ghost small', () => openRoomStyle(house())),
    ...(house().id === 'house' && !G.runtime.visit ? [act(T('🌷 Garden', '🌷 Vườn'), 'ghost small', () => { stopDecorate(); import('./storefront.js').then(m => m.openShopFront('house')); })] : []),
    act(D.folded ? '▴' : '▾', 'ghost small', () => { D.folded = !D.folded; sfx('ui'); renderBar(); }),
    act(T('Done', 'Xong'), 'gold', () => stopDecorate()));
  acts.children[1].title = D.folded ? T('Show your items', 'Hiện đồ') : T('Hide the tray', 'Thu gọn');
  const row = bar.querySelector('.row-scroll');
  const ids = Object.keys(counts);
  if (!ids.length) row.appendChild(h('div', 'deco-empty', T('Everything you own is already placed in your home. Put a piece away on another floor to bring it here, or buy more from Anh Khoa on Market Street.', 'Đồ của bạn đã bày hết trong nhà. Cất bớt một món ở tầng khác để mang lên đây, hoặc mua thêm ở tiệm Anh Khoa trên Phố Chợ.')));
  for (const id of ids) {
    const it = h('button', 'deco-item'); it.type = 'button';
    const cv = document.createElement('canvas'); cv.width = 112; cv.height = 88;
    it.appendChild(cv); it.appendChild(document.createTextNode(`${furnName(id)}${counts[id] > 1 ? ' ×' + counts[id] : ''}`));
    drawFurniturePreview(cv, id, FURNITURE[id]);
    it.onclick = () => {
      const spot = freeSpot(id);
      if (!spot) { sfx('error'); toast(FURNITURE[id]?.wall ? { text: T('No free wall space', 'Tường hết chỗ trống'), sub: T('Move a tall piece away from the back wall, or take a wall piece down.', 'Dời đồ cao ra khỏi tường sau, hoặc gỡ bớt một món treo tường.'), icon: 'sofa' } : { text: T('No room for that', 'Hết chỗ rồi'), sub: T('Move or put something away first.', 'Dời hoặc cất bớt đồ trước nhé.'), icon: 'sofa' }); return; }
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
    const st = posOf(D.sel), rot = ((st.rot || 0) + d + 4) % 4, to = snapTo(sel, st.x, st.y, rot);
    if (!fits(sel, to.x, to.y, rot, D.sel)) { sfx('error'); toast({ text: T('No room to turn it here', 'Không đủ chỗ để xoay'), icon: 'sofa', ms: 1400, now: true }); return; }
    const before = snap(); st.rot = rot; st.x = to.x; st.y = to.y; rebuildHouseFurniture(); changed(before); sfx('whoosh'); renderBar();
  };
  // nudge one tile at a time (wall pieces move in small steps, up and down the wall too)
  const nudge = (dx, dy) => {
    const st = posOf(D.sel), step = def.wall ? 4 : TILE, x = st.x + dx * step, y = st.y + dy * step;
    if (!fits(sel, x, y, st.rot || 0, D.sel)) { sfx('error'); return; }
    const before = snap(); st.x = x; st.y = y; rebuildHouseFurniture(); changed(before); sfx('tap');
  };
  if (!def.wall && SIDE[keyOf(sel)]) t.append(act('↺', 'ghost small icon', () => turn(-1)), act('↻', 'ghost small icon', () => turn(1)));
  else t.append(act('⇋', 'ghost small icon', () => turn(2)));                       // everything else can be mirrored
  if (D.sel.f && !def.light) t.append(act('🎨', 'ghost small icon', () => {
    const f = D.sel.f, before = snap(), i = HUES.indexOf(f.hue || 0); f.hue = HUES[(i + 1) % HUES.length] || undefined; if (!f.hue) delete f.hue;
    rebuildHouseFurniture(); changed(before); sfx('pop');
  }));
  const pad = h('div', 'deco-nudge');
  pad.append(act('◀', 'ghost small icon', () => nudge(-1, 0)));
  pad.append(act('▲', 'ghost small icon', () => nudge(0, -1)), act('▼', 'ghost small icon', () => nudge(0, 1)));
  pad.append(act('▶', 'ghost small icon', () => nudge(1, 0)));
  t.append(pad);
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
  const top = def.wall ? wallRect(selOf(D.sel), st.x, st.y, house().WH).t - 8 : st.y - Math.max(footprint(def.w, def.h, st.rot || 0, keyOf(selOf(D.sel))).h, D.sel.key ? 48 : 34) - 22;
  const sx = r.left + (st.x - v.x) * z, sy = r.top + (top - v.y) * z;
  const w = t.offsetWidth, hh = t.offsetHeight;
  t.style.left = clamp(sx - w / 2, 8, innerWidth - w - 8) + 'px'; t.style.top = clamp(sy - hh, 8, innerHeight - hh - 8) + 'px'; t.style.visibility = 'visible';
}
function drawOverlay(c, t) {
  if (!D) return;
  // the floor grid, faintly — brighter while you're carrying something
  { const sc = house(), g = floorGrid(sc), x1 = g.ox + g.cols * TILE, y1 = g.oy + g.rows * TILE;
    c.save(); c.strokeStyle = `rgba(255,255,255,${D.lifted ? 0.35 : 0.18})`; c.lineWidth = 0.6; c.beginPath();
    for (let i = 0; i <= g.cols; i++) { const x = g.ox + i * TILE; c.moveTo(x, g.oy); c.lineTo(x, y1); }
    for (let j = 0; j <= g.rows; j++) { const y = g.oy + j * TILE; c.moveTo(g.ox, y); c.lineTo(x1, y); }
    c.stroke(); c.restore(); }
  // the piece being carried
  if (D.lifted && D.ghost) {
    const sel = selOf(D.lifted), def = defOf(sel), rot = posOf(D.lifted).rot || 0, fp = footprint(def.w, def.h, rot, keyOf(sel));
    // carrying a wall piece: where along the wall it would fit at this height, in soft green
    if (def.wall && D.wallOK?.y === D.ghost.y) {
      const R = wallRect(sel, 0, D.ghost.y, house().WH, rot); c.save(); c.fillStyle = 'rgba(111,191,115,.22)';
      for (const gx of D.wallOK.ok) c.fillRect(gx - 2, R.t, 4, R.b - R.t);
      c.restore();
    }
    c.save(); c.globalAlpha = 0.75; c.translate(D.ghost.x, D.ghost.y - 3 + (def.wall && !sel.startsWith('builtin:') ? wallDrop(sel, house().WH) : 0)); drawSel(c, t, sel, D.ghost.x, D.ghost.y, rot); c.restore();
    c.save(); c.strokeStyle = D.valid ? '#4fae5a' : '#e8584e'; c.fillStyle = D.valid ? 'rgba(111,191,115,.18)' : 'rgba(232,88,78,.18)'; c.lineWidth = 2; c.setLineDash([5, 4]);
    if (def.wall) { const R = wallRect(sel, D.ghost.x, D.ghost.y, house().WH, rot); c.fillRect(R.l, R.t, R.r - R.l, R.b - R.t); c.strokeRect(R.l, R.t, R.r - R.l, R.b - R.t); }
    else { c.fillRect(D.ghost.x - fp.w / 2, D.ghost.y - fp.h, fp.w, fp.h); c.strokeRect(D.ghost.x - fp.w / 2, D.ghost.y - fp.h, fp.w, fp.h); }
    c.restore(); return;
  }
  // the selected piece: a soft pulsing outline round its footprint
  if (D.sel) {
    const sel = selOf(D.sel), def = defOf(sel), st = posOf(D.sel), fp = footprint(def.w, def.h, st.rot || 0, keyOf(sel)), k = 2 + Math.sin(t * 5) * 1.2;
    c.save(); c.strokeStyle = '#f08ca0'; c.lineWidth = 2; c.setLineDash([6, 4]); c.lineDashOffset = -t * 20;
    if (def.wall) { const R = wallRect(selOf(D.sel), st.x, st.y, house().WH, st.rot || 0); c.strokeRect(R.l - k, R.t - k, R.r - R.l + k * 2, R.b - R.t + k * 2); }
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
