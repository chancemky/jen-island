// Decorating a shop front: the camera frames the space in front of the shop; pick a piece
// from the tray and tap where it goes, drag pieces to move them, tap one and "Remove" to
// take it back (half refunded). The bar shows this week's contest theme and how the judges
// would score the front right now.
import { G, T, markDirty } from '../systems/state.js';
import { cam } from '../world/render.js';
import { setScene } from '../systems/scenes.js';
import { DECOR, decorOf, frontArea, placeDecor, removeDecor, moveDecor, scoreFront, themeOf } from '../systems/storefront.js';
import { BUSINESSES, bizName } from '../data/game.js';
import { sfx } from '../core/audio.js';
import { toast, moneyShortfall } from './hud.js';
import { drawDecor } from '../systems/growth.js';
import { escapeHtml } from '../core/util.js';

let ui = null;
export function openShopFront(id) {
  const b = G.scenes.island?.buildings?.[id]; if (!b || ui) return;
  const area = frontArea(b), st = { pick: null, sel: -1, drag: null };
  setScene('island', b.x, b.y + 80, 'up'); G.player.x = b.x + area.x1 + 22; G.player.y = b.y + 78;
  const fit = (G.renderer.w * 0.94) / (area.x1 - area.x0) / cam.baseZoom;
  const mine = { x: b.x, y: b.y + 6, zoom: Math.max(0.9, Math.min(1.9, fit)), rate: 8 }; cam.override = mine;
  G.runtime.pause++; G.runtime.shopFront = id; document.body.classList.add('photo-mode');
  ui = document.createElement('div'); ui.className = 'photo-ui front-ui';
  ui.innerHTML = `<div class="ph-drag"></div>
    <div class="ph-top"><button class="ph-x" type="button">✓</button><span class="fr-info"></span></div>
    <div class="ph-panel"><div class="fr-sel"></div><div class="ph-chips fr-tray"></div></div>`;
  (document.getElementById('app') || document.body).appendChild(ui);
  const info = ui.querySelector('.fr-info'), tray = ui.querySelector('.fr-tray'), selBar = ui.querySelector('.fr-sel');
  const refresh = () => {
    const th = themeOf(), sc = scoreFront(id, th), stars = Math.max(0, Math.min(5, Math.round(sc.total / 3)));
    info.innerHTML = `${escapeHtml(bizName(id))} · ${T('Theme', 'Chủ đề')}: <b>${escapeHtml(T(th.en, th.vi))}</b> · ${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`;
    tray.innerHTML = Object.entries(DECOR).map(([k, d]) => `<button type="button" data-k="${k}" class="${st.pick === k ? 'on' : ''}">${escapeHtml(T(d.en, d.vi))} <small>${d.price}k</small>${d.tags.includes(th.id) ? ' ✦' : ''}</button>`).join('');
    selBar.innerHTML = st.sel >= 0 ? `<button type="button" class="btn small ghost fr-del">${T('Remove (half back)', 'Gỡ (hoàn nửa tiền)')}</button>` : `<small>${st.pick ? T('Tap in front of the shop to place it', 'Chạm trước quán để đặt') : T('Pick a piece · ✦ fits this week\'s theme · drag to move', 'Chọn món · ✦ hợp chủ đề tuần · kéo để di chuyển')}</small>`;
    selBar.querySelector('.fr-del')?.addEventListener('click', () => { removeDecor(id, st.sel); st.sel = -1; sfx('back'); refresh(); });
  };
  tray.onclick = e => { const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return; st.pick = st.pick === k ? null : k; st.sel = -1; sfx('ui'); refresh(); };
  const toLocal = e => { const r = G.renderer.cv.getBoundingClientRect(), [wx, wy] = G.renderer.toWorld(e.clientX - r.left, e.clientY - r.top); return [wx - b.x, wy - b.y]; };
  const inArea = (dx, dy) => dx >= area.x0 && dx <= area.x1 && dy >= area.y0 && dy <= area.y1;
  const hit = (dx, dy) => { const list = decorOf(id); let best = -1, bd = 22; list.forEach((d, i) => { const dd = Math.hypot(d.dx - dx, (d.dy - 10) - dy); if (dd < bd) { bd = dd; best = i; } }); return best; };
  const drag = ui.querySelector('.ph-drag');
  drag.addEventListener('pointerdown', e => {
    const [dx, dy] = toLocal(e), i = hit(dx, dy);
    if (i >= 0) { st.sel = i; st.pick = null; st.drag = { i, id: e.pointerId }; drag.setPointerCapture(e.pointerId); sfx('pop'); refresh(); return; }
    if (st.pick) { if (!inArea(dx, dy)) { sfx('error'); toast({ text: T('Decor goes in front of the shop', 'Đồ trang trí đặt trước quán nhé'), icon: 'sofa', ms: 1400 }); return; }
      if (!placeDecor(id, st.pick, dx, dy)) return moneyShortfall(DECOR[st.pick].price); sfx('buy'); refresh(); return; }
    st.sel = -1; refresh();
  });
  drag.addEventListener('pointermove', e => { if (!st.drag) return; const [dx, dy] = toLocal(e); if (inArea(dx, dy)) moveDecor(id, st.drag.i, dx, dy); });
  drag.addEventListener('pointerup', () => { if (st.drag) { st.drag = null; markDirty(true); refresh(); } });
  // the placing area and the selected piece, drawn over the world
  G.runtime.decoOverlay = (c, t) => {
    if (cam.override !== mine) cam.override = mine;                // (a scene change resets the camera: keep it on the shop)
    c.save(); c.setLineDash([3, 3]); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1; c.strokeRect(b.x + area.x0, b.y + area.y0 - 6, area.x1 - area.x0, area.y1 - area.y0 + 6); c.restore();
    const d = decorOf(id)[st.sel]; if (d) { c.save(); c.strokeStyle = '#ff6fae'; c.lineWidth = 1.4; c.beginPath(); c.ellipse(b.x + d.dx, b.y + d.dy, 14, 5, 0, 0, Math.PI * 2); c.stroke(); c.restore(); }
  };
  ui.querySelector('.ph-x').onclick = () => close(mine);
  refresh(); sfx('page');
}
function close(mine) {
  if (!ui) return; ui.remove(); ui = null;
  G.runtime.pause--; G.runtime.shopFront = null; G.runtime.decoOverlay = null; document.body.classList.remove('photo-mode');
  if (cam.override === mine) cam.override = null; sfx('success');
}
export { drawDecor };
export const shopFrontOpen = () => !!ui;
export const canDecorateFront = id => !!BUSINESSES[id] && G.state.biz[id]?.owned && !!G.scenes.island?.buildings?.[id] && BUSINESSES[id].kind !== 'restaurant';
