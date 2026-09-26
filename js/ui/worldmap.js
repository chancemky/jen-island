// The island map in the menu. A detailed base layer (sea, beaches, grass,
// trees, roads, river, fields, buildings, the Night Market) is painted once
// into an offscreen canvas; the view then only redraws while you drag or pinch,
// with live markers on top (you, Mèo Mây, your goal, lost items).

import { G, T } from '../systems/state.js';
import { RIVER, RIVER_W, POND, PATHS, BUILDINGS, STALLS, PLAZA, NM_PLAZA, PIER, PIER_END, LANDS, PADDIES, BRIDGES, SEA_BRIDGES, W, H } from '../world/island.js';
import { activeQuests, questSpot } from '../systems/sidequests.js';
import { currentStep } from '../systems/story.js';
import { iconURL } from '../gfx/food.js';
import { TAU, clamp } from '../core/util.js';
import { sfx } from '../core/audio.js';

const BASE_K = 0.36;                       // base layer resolution (px per world unit)
const REGIONS = {
  harbour: { flag: 'harbourBridge', ch: 12, en: 'Harbour Town', vi: 'Phố Cảng', x: 2690, y: 520 },
  cove: { flag: 'coveBridge', ch: 17, en: 'Coconut Cove', vi: 'Vịnh Dừa', x: 2330, y: 2290 },
  islet: { flag: 'bridgeFixed', ch: 14, en: 'Firefly Islet', vi: 'Cù Lao Đom Đóm', x: 2250, y: 1560 },
};
const regionOpen = r => !!G.state.story.flags[REGIONS[r].flag];
const landRegion = l => l.id || (l.cx > 2000 ? 'islet' : null);

const ICON = { shed1: 'tea', shed2: 'banh_mi_thit', truck: 'goi_cuon', restaurant: 'pho_bo', house: 'heart', meo: 'notebook', supermarket: 'bag', materials: 'wood', furniture: 'sofa', boutique: 'shirt', salon: 'scissors', dinh: 'lantern', petshop: 'paw', cafe: 'coffee', grill: 'squid' };
const LABEL = { shed1: ['Drinks', 'Quán Nước'], shed2: ['Bánh Mì', 'Bánh Mì'], truck: ['Truck', 'Xe Cuốn'], restaurant: ['Restaurant', 'Nhà Hàng'], house: ['Home', 'Nhà bạn'], meo: ['Mèo Mây', 'Mèo Mây'], supermarket: ['Market', 'Siêu thị'], materials: ['Materials', 'Vật liệu'], furniture: ['Furniture', 'Nội thất'], boutique: ['Boutique', 'Tiệm áo'], salon: ['Salon', 'Tiệm tóc'], dinh: ['Temple', 'Đình'], petshop: ['Pet Shop', 'Thú cưng'], cafe: ['Café', 'Cà phê'], grill: ['Grill', 'Quán nướng'], h_mai: ['Clinic', 'Phòng khám'] };
const MAP_ICONS = {};
function icon(k) { if (!MAP_ICONS[k]) { const img = new Image(); img.src = iconURL(k, 64); MAP_ICONS[k] = img; } return MAP_ICONS[k]; }

// ---------------------------------------------------------------- base layer
let base = null, baseKey = '';
function trace(c, p) { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); }
function buildBase() {
  const key = JSON.stringify([G.state.story.flags.bridgeFixed, G.state.story.flags.harbourBridge, G.state.story.flags.coveBridge, G.state.nightMarket.restored, G.lang, Object.values(G.state.biz).map(b => b.owned ? 1 : 0).join('')]);
  if (base && key === baseKey) return base;
  baseKey = key;
  const cv = base || document.createElement('canvas'); base = cv;
  cv.width = Math.ceil(W * BASE_K); cv.height = Math.ceil(H * BASE_K);
  const c = cv.getContext('2d');
  c.setTransform(BASE_K, 0, 0, BASE_K, 0, 0);
  c.lineCap = 'round'; c.lineJoin = 'round';
  // sea with soft depth and little wave marks
  const sea = c.createLinearGradient(0, 0, W, H); sea.addColorStop(0, '#7fd6de'); sea.addColorStop(1, '#4fb0c3');
  c.fillStyle = sea; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(255,255,255,.32)'; c.lineWidth = 6;
  for (let i = 0; i < 140; i++) { const x = (i * 397) % W, y = (i * 719) % H; c.beginPath(); c.moveTo(x - 20, y); c.quadraticCurveTo(x, y - 10, x + 20, y); c.stroke(); }
  for (const l of LANDS) {
    trace(c, l.shallow); c.fillStyle = 'rgba(160,232,230,.75)'; c.fill();
    trace(c, l.foam); c.fillStyle = 'rgba(210,246,240,.95)'; c.fill();
    trace(c, l.sand); c.fillStyle = '#f5e2b3'; c.fill(); c.strokeStyle = '#e3c88a'; c.lineWidth = 8; c.stroke();
    trace(c, l.grass); const g = c.createRadialGradient(l.cx, l.cy - 200, 100, l.cx, l.cy, 1400); g.addColorStop(0, '#b3e09a'); g.addColorStop(1, '#8ccb74'); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(90,140,70,.35)'; c.lineWidth = 5; c.stroke();
  }
  // fields
  for (const p of PADDIES) {
    c.fillStyle = p.kind === 'veg' ? '#9a6e45' : '#8fd0c6'; c.beginPath(); c.roundRect ? c.roundRect(p.x, p.y, p.w, p.h, 6) : c.rect(p.x, p.y, p.w, p.h); c.fill();
    c.strokeStyle = p.kind === 'veg' ? '#6fae4f' : '#6fbf73'; c.lineWidth = 4; for (let y = p.y + 10; y < p.y + p.h - 4; y += 12) { c.beginPath(); c.moveTo(p.x + 6, y); c.lineTo(p.x + p.w - 6, y); c.stroke(); }
  }
  // river with banks, pond with lotus
  const riv = () => { c.beginPath(); c.moveTo(RIVER[0], RIVER[1]); for (let i = 2; i < RIVER.length; i += 2) c.lineTo(RIVER[i], RIVER[i + 1]); };
  riv(); c.strokeStyle = '#5aa8b4'; c.lineWidth = RIVER_W + 10; c.stroke();
  riv(); c.strokeStyle = '#72c9d4'; c.lineWidth = RIVER_W; c.stroke();
  riv(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 4; c.setLineDash([20, 30]); c.stroke(); c.setLineDash([]);
  c.beginPath(); c.ellipse(POND.x, POND.y, POND.rx + 6, POND.ry + 6, 0, 0, TAU); c.fillStyle = '#5aa8b4'; c.fill();
  c.beginPath(); c.ellipse(POND.x, POND.y, POND.rx, POND.ry, 0, 0, TAU); c.fillStyle = '#72c9d4'; c.fill();
  for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(POND.x - 50 + (i * 37) % 100, POND.y - 24 + (i * 23) % 48, 7, 0, TAU); c.fillStyle = '#7fc062'; c.fill(); }
  // trees, as little canopies (shadow + crown + highlight)
  const isl = G.scenes?.island;
  if (isl) for (const p of isl.props) {
    const k = p.kind; if (!['tree', 'palm', 'flameTree', 'banyan', 'bamboo', 'banana', 'bush', 'frangipani'].includes(k)) continue;
    const r = k === 'banyan' ? 60 : k === 'tree' || k === 'flameTree' ? 26 : k === 'palm' ? 20 : k === 'bush' ? 11 : 15;
    const col = k === 'palm' ? '#5fae57' : k === 'flameTree' ? '#e8584e' : k === 'bush' ? (p.flowers || '#6fb356') : p.fruit ? '#6fae4f' : '#5aa24c';
    c.beginPath(); c.ellipse(p.x + 5, p.y - r * 0.4 + 6, r, r * 0.8, 0, 0, TAU); c.fillStyle = 'rgba(40,80,40,.2)'; c.fill();
    c.beginPath(); c.arc(p.x, p.y - r * 0.6, r, 0, TAU); c.fillStyle = col; c.fill(); c.strokeStyle = 'rgba(40,70,40,.45)'; c.lineWidth = 3; c.stroke();
    c.beginPath(); c.arc(p.x - r * 0.3, p.y - r * 0.9, r * 0.4, 0, TAU); c.fillStyle = 'rgba(255,255,255,.22)'; c.fill();
    if (p.fruit) for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(p.x - 10 + i * 10, p.y - r * 0.5 + (i % 2) * 6, 3.5, 0, TAU); c.fillStyle = p.fruit; c.fill(); }
  }
  // roads: a darker edge under a light sandy fill
  const road = (pts, w, col) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
  const skip = k => k === 'bridge' || k === 'hbridge' || k === 'cbridge';
  for (const [k, p] of Object.entries(PATHS)) if (!skip(k)) road(p, 36, '#c7a574');
  for (const [k, p] of Object.entries(PATHS)) if (!skip(k)) road(p, 26, '#f1ddb0');
  // bridges (dashed when not built yet)
  for (const b of [...SEA_BRIDGES, ...BRIDGES]) {
    const open = b.fixed ? b.fixed() : true, horiz = b.w > b.h;
    c.save(); if (!open) { c.globalAlpha = 0.55; c.setLineDash([26, 20]); }
    c.fillStyle = '#c98f5a'; c.strokeStyle = '#8a5f3e'; c.lineWidth = 5;
    if (open) { c.fillRect(b.x, b.y, b.w, b.h); c.strokeRect(b.x, b.y, b.w, b.h); c.strokeStyle = 'rgba(90,60,30,.4)'; c.lineWidth = 2; for (let i = 8; i < (horiz ? b.w : b.h); i += 14) { c.beginPath(); if (horiz) { c.moveTo(b.x + i, b.y + 3); c.lineTo(b.x + i, b.y + b.h - 3); } else { c.moveTo(b.x + 3, b.y + i); c.lineTo(b.x + b.w - 3, b.y + i); } c.stroke(); } }
    else { c.beginPath(); c.moveTo(b.x, b.y + b.h / 2); c.lineTo(b.x + b.w, b.y + b.h / 2); c.strokeStyle = '#c98f5a'; c.lineWidth = 16; c.stroke(); }
    c.restore();
  }
  // the pier
  for (const r of [PIER, PIER_END]) { c.fillStyle = '#c98f5a'; c.fillRect(r.x, r.y, r.w, r.h); c.strokeStyle = '#8a5f3e'; c.lineWidth = 5; c.strokeRect(r.x, r.y, r.w, r.h); }
  // Wind Plaza: a round paved square with the fountain
  c.beginPath(); c.arc(PLAZA.x, PLAZA.y, PLAZA.r, 0, TAU); c.fillStyle = '#ecdcc0'; c.fill(); c.strokeStyle = '#c7a574'; c.lineWidth = 6; c.stroke();
  c.beginPath(); c.arc(PLAZA.x, PLAZA.y, 30, 0, TAU); c.fillStyle = '#8fd6e2'; c.fill(); c.strokeStyle = '#9aa3ad'; c.lineWidth = 6; c.stroke();
  // Night Market: tiled square, two rows of striped stall roofs, lantern strings
  drawNightMarket(c);
  // buildings as tiny houses (wall + roof)
  for (const b of BUILDINGS) {
    const w = b.w * 0.9, hh = Math.max(40, b.fp * 0.9), x = b.x - w / 2, y = b.y - hh;
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x + 6, y + 8, w, hh);
    c.fillStyle = b.wall || '#fff1dc'; c.fillRect(x, y + hh * 0.35, w, hh * 0.65); c.strokeStyle = '#5b3f36'; c.lineWidth = 4; c.strokeRect(x, y + hh * 0.35, w, hh * 0.65);
    c.beginPath(); c.moveTo(x - 8, y + hh * 0.4); c.lineTo(x + w * 0.2, y); c.lineTo(x + w * 0.8, y); c.lineTo(x + w + 8, y + hh * 0.4); c.closePath();
    c.fillStyle = b.roof || ({ shop: '#e8584e', shed: '#b8845a', truck: '#9fd8c8', restaurant: '#d9784f', kiosk: '#f2a14e', dinh: '#b8603f', meo: '#9fb4dc' }[b.type] || '#d9784f'); c.fill(); c.stroke();
  }
  return cv;
}
function drawNightMarket(c) {
  const R = NM_PLAZA, on = G.state.nightMarket.restored;
  c.save();
  c.beginPath(); c.roundRect ? c.roundRect(R.x, R.y, R.w, R.h, 28) : c.rect(R.x, R.y, R.w, R.h);
  c.fillStyle = on ? '#f0d7b4' : '#ddd2bd'; c.fill(); c.strokeStyle = '#b89a6e'; c.lineWidth = 6; c.stroke(); c.clip();
  c.strokeStyle = 'rgba(160,130,90,.28)'; c.lineWidth = 3; for (let x = R.x; x < R.x + R.w; x += 40) { c.beginPath(); c.moveTo(x, R.y); c.lineTo(x, R.y + R.h); c.stroke(); } for (let y = R.y; y < R.y + R.h; y += 40) { c.beginPath(); c.moveTo(R.x, y); c.lineTo(R.x + R.w, y); c.stroke(); }
  c.restore();
  for (const s of STALLS) {
    const cols = on ? (s.cloth || ['#e8584e', '#fff5df']) : ['#a89a8c', '#c9bdb0'], x = s.x - 38, y = s.y - 46;
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(x + 6, y + 8, 76, 44);
    for (let i = 0; i < 6; i++) { c.fillStyle = cols[i % 2]; c.fillRect(x + i * 76 / 6, y, 76 / 6, 30); }
    c.strokeStyle = '#5b3f36'; c.lineWidth = 4; c.strokeRect(x, y, 76, 30);
    c.fillStyle = on ? '#c9955e' : '#9a8a7e'; c.fillRect(x + 4, y + 30, 68, 16); c.strokeRect(x + 4, y + 30, 68, 16);
    const own = s.biz && G.state.biz[s.biz]?.owned;
    if (own) { c.beginPath(); c.arc(s.x, y - 12, 12, 0, TAU); c.fillStyle = '#f08ca0'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke(); }
  }
  // lantern strings
  for (const y of [R.y + 24, R.y + R.h - 20]) for (let x = R.x + 30; x < R.x + R.w - 20; x += 34) { c.beginPath(); c.arc(x, y + Math.sin(x) * 4, 7, 0, TAU); c.fillStyle = on ? ['#ea5a4f', '#f2c14e', '#f08ca0'][(x / 34 | 0) % 3] : '#b3a79a'; c.fill(); }
}

// ---------------------------------------------------------------- live view
export function mountMap(wrap) {
  const cv = document.createElement('canvas'); wrap.appendChild(cv);
  const ui = document.createElement('div'); ui.className = 'map-ui';
  ui.innerHTML = '<button type="button" data-z="1">+</button><button type="button" data-z="-1">−</button><button type="button" data-z="0">◎</button>';
  wrap.appendChild(ui);
  const view = { x: 0, y: 0, s: 0 };           // world point at the canvas centre, px per unit
  let fit = 0, raf = 0;
  const size = () => { const r = wrap.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); cv.width = Math.max(10, r.width * dpr); cv.height = Math.max(10, r.height * dpr); fit = Math.min(cv.width / (W - 60), cv.height / (H - 60)); view.fit = fit; };
  const me = () => { const pl = G.player; if (G.scene?.id === 'island') return pl; const b = BUILDINGS.find(b => b.interior === G.scene?.id); return b ? { x: b.x, y: b.y } : pl; };
  const clampView = () => { view.s = clamp(view.s, fit, fit * 6); const hw = cv.width / 2 / view.s, hh = cv.height / 2 / view.s; view.x = clamp(view.x, Math.min(W / 2, hw), Math.max(W / 2, W - hw)); view.y = clamp(view.y, Math.min(H / 2, hh), Math.max(H / 2, H - hh)); };
  const redraw = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; draw(cv, view); }); };
  // open on the whole world (a little zoomed), leaning towards where you are
  const start = () => { size(); view.fit = fit; const p = me(); view.s = fit * 1.25; view.x = ((p?.x ?? PLAZA.x) + W / 2) / 2; view.y = ((p?.y ?? PLAZA.y) + H / 2) / 2; clampView(); redraw(); };
  requestAnimationFrame(start); setTimeout(() => cv.isConnected && start(), 350);
  // drag and pinch
  const pts = new Map(); let last = null;
  const toCanvas = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, toCanvas(e)); last = null; });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId), cur = toCanvas(e); pts.set(e.pointerId, cur);
    if (pts.size === 1) { view.x -= (cur[0] - prev[0]) / view.s; view.y -= (cur[1] - prev[1]) / view.s; }
    else if (pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (last) { const k = d / last; const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; zoomAt(mx, my, k); }
      last = d;
    }
    clampView(); redraw();
  });
  const up = e => { pts.delete(e.pointerId); last = null; };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); const [mx, my] = toCanvas(e); zoomAt(mx, my, e.deltaY < 0 ? 1.15 : 1 / 1.15); clampView(); redraw(); }, { passive: false });
  function zoomAt(mx, my, k) {
    const wx = view.x + (mx - cv.width / 2) / view.s, wy = view.y + (my - cv.height / 2) / view.s;
    view.s = clamp(view.s * k, fit, fit * 6);
    view.x = wx - (mx - cv.width / 2) / view.s; view.y = wy - (my - cv.height / 2) / view.s;
  }
  ui.querySelectorAll('button').forEach(b => b.onclick = () => { sfx('ui'); const z = +b.dataset.z; if (z) zoomAt(cv.width / 2, cv.height / 2, z > 0 ? 1.4 : 1 / 1.4); else { const p = me(); if (p) { view.x = p.x; view.y = p.y; } } clampView(); redraw(); });
  // icons finish loading after the first frame
  setTimeout(redraw, 600); setTimeout(redraw, 1500);
}

function draw(cv, view) {
  const c = cv.getContext('2d'), b = buildBase();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#4fb0c3'; c.fillRect(0, 0, cv.width, cv.height);
  c.save();
  c.translate(cv.width / 2 - view.x * view.s, cv.height / 2 - view.y * view.s); c.scale(view.s, view.s);
  c.imageSmoothingQuality = 'high';
  c.drawImage(b, 0, 0, W, H);
  const k = 1 / view.s * Math.min(2, devicePixelRatio || 1);           // screen-constant sizes
  // locked regions: soft fog with a padlock and the chapter they open in
  for (const l of LANDS) {
    const rid = landRegion(l); if (!rid || regionOpen(rid)) continue;
    const R = REGIONS[rid];
    c.save(); trace(c, l.shallow); c.fillStyle = 'rgba(70,110,130,.45)'; c.fill(); c.restore();
    label(c, '🔒 ' + T(R.en, R.vi), R.x, R.y, 15 * k, '#fff', 'rgba(40,60,80,.85)');
    label(c, T(`Opens in Chapter ${R.ch}`, `Mở ở Chương ${R.ch}`), R.x, R.y + 22 * k, 11 * k, '#fff', 'rgba(40,60,80,.85)');
  }
  // area names
  c.globalAlpha = 0.55;
  for (const [x, y, en, vi, reg] of [[520, 1760, 'West Village', 'Xóm Tây'], [1330, 1880, 'East Village', 'Xóm Đông'], [900, 2350, 'Sunny Beach', 'Bãi Biển'], [1460, 1180, 'Rice Paddies', 'Ruộng Lúa'], [900, 1080, 'Market Street', 'Phố Chợ'], [430, 450, 'Night Market', 'Chợ Đêm'], [900, 1700, 'Wind Plaza', 'Quảng trường gió'], [2690, 820, 'Harbour Town', 'Phố Cảng', 'harbour'], [2330, 2420, 'Coconut Cove', 'Vịnh Dừa', 'cove'], [2250, 1760, 'Firefly Islet', 'Cù Lao Đom Đóm', 'islet']]) {
    if (reg && !regionOpen(reg)) continue;
    label(c, T(en, vi), x, y, 13 * k, '#5b3f36', null, 'italic 900');
  }
  c.globalAlpha = 1;
  // building badges with icons
  const placed = [];
  for (const bd of BUILDINGS) {
    const lab = LABEL[bd.id], ic = ICON[bd.id] || (bd.home ? 'person' : null);
    if (bd.region && !regionOpen(bd.region)) continue;
    if (bd.id === 'h_vy' && !regionOpen('islet')) continue;
    if (!ic) continue;
    const zoomed = view.s > (view.fit || 0) * 2.4;
    if (bd.home && bd.id !== 'h_mai' && !zoomed) continue;          // homes appear when you zoom in
    const own = G.state.biz[bd.id], owned = own?.owned && (own.repair >= 1 || bd.type === 'kiosk' || bd.type === 'truck');
    const r = 11 * k, y = bd.y - bd.fp - 20;
    c.beginPath(); c.arc(bd.x, y, r + 3 * k, 0, TAU); c.fillStyle = owned ? '#f08ca0' : bd.home ? '#e9d6bb' : '#fff8ea'; c.fill(); c.lineWidth = 3 * k; c.strokeStyle = '#5b3f36'; c.stroke();
    const img = icon(ic); if (img.complete && img.naturalWidth) c.drawImage(img, bd.x - r, y - r, r * 2, r * 2);
    if (lab && (zoomed || !bd.home)) {
      // place the name above the badge, or below if that spot is taken; skip if both are
      const txt = T(lab[0], lab[1]), fs = 9 * k; c.font = `900 ${fs}px Nunito, sans-serif`;
      const tw = c.measureText(txt).width + 4 * k, th = fs * 1.2;
      const spots = [y - r - 7 * k, y + r + 8 * k];
      for (const ly of spots) {
        const rect = [bd.x - tw / 2, ly - th / 2, tw, th];
        if (placed.some(q => rect[0] < q[0] + q[2] && rect[0] + rect[2] > q[0] && rect[1] < q[1] + q[3] && rect[1] + rect[3] > q[1])) continue;
        placed.push(rect); label(c, txt, bd.x, ly, fs, '#5b3f36', '#fff8ea'); break;
      }
    }
  }
  // side quest stars
  for (const q of activeQuests()) if (G.state.sideQuests[q.id] === 'active') { const sp = questSpot(q); starAt(c, sp.x, sp.y, 12 * k); }
  // goal
  const tg = currentStep()?.target?.();
  if (tg && tg.scene === 'island') { c.beginPath(); c.arc(tg.x, tg.y, 18 * k, 0, TAU); c.strokeStyle = '#f2c14e'; c.lineWidth = 5 * k; c.stroke(); c.beginPath(); c.arc(tg.x, tg.y, 28 * k, 0, TAU); c.strokeStyle = 'rgba(242,193,78,.45)'; c.lineWidth = 4 * k; c.stroke(); }
  // Mèo Mây and you
  if (G.meo && G.scenes.island.actors.includes(G.meo)) { c.beginPath(); c.arc(G.meo.x, G.meo.y, 10 * k, 0, TAU); c.fillStyle = '#9fb4dc'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3 * k; c.stroke(); }
  const pl = G.scene?.id === 'island' ? G.player : BUILDINGS.find(b => b.interior === G.scene?.id) || G.player;
  if (pl) {
    c.beginPath(); c.arc(pl.x, pl.y, 20 * k, 0, TAU); c.fillStyle = 'rgba(240,140,160,.3)'; c.fill();
    c.beginPath(); c.arc(pl.x, pl.y, 12 * k, 0, TAU); c.fillStyle = '#f08ca0'; c.fill(); c.lineWidth = 4 * k; c.strokeStyle = '#fff'; c.stroke();
    label(c, T('You', 'Bạn'), pl.x, pl.y - 22 * k, 13 * k, '#e56b8b', '#fff');
  }
  c.restore();
  // screen overlays: title cartouche, compass, legend
  const d = Math.min(2, devicePixelRatio || 1);
  c.save(); c.scale(d, d);
  const cw = cv.width / d, ch = cv.height / d;
  c.fillStyle = 'rgba(255,248,234,.92)'; c.strokeStyle = '#5b3f36'; c.lineWidth = 2;
  c.beginPath(); c.roundRect ? c.roundRect(10, 10, 150, 34, 12) : c.rect(10, 10, 150, 34); c.fill(); c.stroke();
  c.fillStyle = '#5b3f36'; c.font = '900 14px Nunito, sans-serif'; c.textAlign = 'left'; c.fillText(G.state.island.name || 'JEN Island', 20, 32);
  // compass
  c.translate(cw - 34, ch - 60); c.fillStyle = 'rgba(255,248,234,.9)'; c.beginPath(); c.arc(0, 0, 20, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = '#e8584e'; c.beginPath(); c.moveTo(0, -16); c.lineTo(5, 0); c.lineTo(-5, 0); c.closePath(); c.fill(); c.fillStyle = '#9aa3ad'; c.beginPath(); c.moveTo(0, 16); c.lineTo(5, 0); c.lineTo(-5, 0); c.closePath(); c.fill();
  c.fillStyle = '#5b3f36'; c.font = '900 9px Nunito, sans-serif'; c.textAlign = 'center'; c.fillText(T('N', 'B'), 0, -22 + 2);
  c.restore();
  c.save(); c.scale(d, d); c.font = '900 11px Nunito, sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'left'; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 3;
  c.fillText(T('● You  ● Mèo Mây  ○ Goal  ★ Lost item · drag / pinch to zoom', '● Bạn  ● Mèo Mây  ○ Mục tiêu  ★ Đồ thất lạc · kéo / chụm để phóng to'), 10, ch - 10);
  c.restore();
}
function label(c, text, x, y, size, fill, bg, weight = '900') {
  c.font = `${weight} ${size}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  if (bg) { c.lineWidth = size * 0.35; c.strokeStyle = bg; c.strokeText(text, x, y); }
  c.fillStyle = fill; c.fillText(text, x, y); c.textBaseline = 'alphabetic';
}
function starAt(c, x, y, r) { c.fillStyle = '#ffd35a'; c.strokeStyle = '#5b3f36'; c.lineWidth = r * 0.25; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); c.stroke(); }
