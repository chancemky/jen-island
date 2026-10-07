// Photo mode: the HUD steps aside, you drag to frame the shot and slide to zoom, pick a
// filter, strike a pose, maybe add a Polaroid or postcard frame — then take the picture.
// It goes into your album and can be shared or saved straight away.

import { G, T, markDirty } from '../systems/state.js';
import { cam } from '../world/render.js';
import { addPhoto } from '../systems/album.js';
import { sfx } from '../core/audio.js';
import { toast } from './hud.js';
import { track } from '../systems/telemetry.js';
import { bus } from '../core/util.js';

const FILTERS = {
  natural: { en: 'Natural', vi: 'Tự nhiên', css: '', px: null },
  warm:    { en: 'Warm', vi: 'Ấm áp', css: 'sepia(.25) saturate(1.25) brightness(1.04)', px: (r, g, b) => [r * 1.08 + 8, g * 1.02 + 2, b * 0.86] },
  film:    { en: 'Film', vi: 'Phim cũ', css: 'sepia(.45) contrast(.92) brightness(1.05)', px: (r, g, b) => { const l = r * 0.3 + g * 0.59 + b * 0.11; return [l * 0.55 + r * 0.45 + 14, l * 0.6 + g * 0.4 + 6, l * 0.5 + b * 0.35]; } },
  mono:    { en: 'Mono', vi: 'Đen trắng', css: 'grayscale(1) contrast(1.08)', px: (r, g, b) => { const l = (r * 0.3 + g * 0.59 + b * 0.11 - 128) * 1.08 + 128; return [l, l, l]; } },
  dreamy:  { en: 'Dreamy', vi: 'Mơ màng', css: 'saturate(1.2) brightness(1.08) hue-rotate(-8deg)', px: (r, g, b) => [r * 0.92 + 30, g * 0.9 + 22, b * 0.92 + 36] },
  vivid:   { en: 'Vivid', vi: 'Rực rỡ', css: 'saturate(1.55) contrast(1.06)', px: (r, g, b) => { const l = r * 0.3 + g * 0.59 + b * 0.11; return [l + (r - l) * 1.55, l + (g - l) * 1.55, l + (b - l) * 1.55]; } },
};
const POSES = [['smile', '😊', null], ['wave', '👋', 'wave'], ['cheer', '🙌', 'cheer'], ['dance', '💃', 'dance'], ['laugh', '😆', 'laugh'], ['clap', '👏', 'clap'], ['bow', '🙇', 'bow'], ['think', '🤔', 'think']];
const FRAMES = [['none', ['No frame', 'Không khung']], ['polaroid', ['Polaroid', 'Polaroid']], ['postcard', ['Postcard', 'Bưu thiếp']]];

let ui = null;
// the camera hold photo mode uses (put back if anything else cleared it)
let mine = null;
const camOv = st => { if (!cam.override) cam.override = mine = { x: st.x, y: st.y, zoom: st.zoom, rate: 12 }; return cam.override; };
// a story scene or a change of place ends photo mode first
bus.on('cutscene', on => { if (on) closePhotoMode(); });
bus.on('scene', () => closePhotoMode());
export function openPhotoMode() {
  if (ui || !G.renderer?.cv || G.runtime.inCutscene) return;
  const pl = G.player, start = { x: cam.x, y: cam.y };
  const st = { filter: 'natural', frame: 'none', zoom: 1, x: cam.x, y: cam.y, pose: null };
  G.runtime.photoMode = true; document.body.classList.add('photo-mode');
  cam.override = mine = { x: st.x, y: st.y, zoom: 1, rate: 12 };
  pl?.face('down');
  ui = document.createElement('div'); ui.className = 'photo-ui';
  ui.innerHTML = `<div class="ph-drag" aria-hidden="true"></div>
    <div class="ph-top"><button class="ph-x" type="button" aria-label="${T('Close', 'Đóng')}">✕</button><span>${T('Drag to frame your shot', 'Kéo để chọn khung hình')}</span></div>
    <div class="ph-panel">
      <div class="ph-row"><b>${T('Zoom', 'Phóng')}</b><input class="ph-zoom" type="range" min="60" max="220" value="100" aria-label="Zoom"></div>
      <div class="ph-chips ph-filters">${Object.entries(FILTERS).map(([k, f]) => `<button type="button" data-f="${k}" class="${k === 'natural' ? 'on' : ''}">${T(f.en, f.vi)}</button>`).join('')}</div>
      <div class="ph-chips ph-poses">${POSES.map(([k, e]) => `<button type="button" data-p="${k}" title="${k}">${e}</button>`).join('')}</div>
      <div class="ph-chips ph-frames">${FRAMES.map(([k, l]) => `<button type="button" data-fr="${k}" class="${k === 'none' ? 'on' : ''}">${T(l[0], l[1])}</button>`).join('')}</div>
      <button class="ph-shoot" type="button">📸 ${T('Take photo', 'Chụp ảnh')}</button>
    </div><div class="ph-flash"></div>`;
  (document.getElementById('app') || document.body).appendChild(ui);
  const cv = G.renderer.cv;
  const setFilter = k => { st.filter = k; cv.style.filter = FILTERS[k].css; ui.querySelectorAll('[data-f]').forEach(b => b.classList.toggle('on', b.dataset.f === k)); };
  // drag to pan (within a generous circle around where you started)
  const drag = ui.querySelector('.ph-drag'); let last = null;
  drag.addEventListener('pointerdown', e => { last = [e.clientX, e.clientY]; drag.setPointerCapture(e.pointerId); });
  drag.addEventListener('pointermove', e => {
    if (!last) return; const z = cam.zoom || 1;
    st.x -= (e.clientX - last[0]) / z; st.y -= (e.clientY - last[1]) / z; last = [e.clientX, e.clientY];
    const dx = st.x - start.x, dy = st.y - start.y, d = Math.hypot(dx, dy), R = 420; if (d > R) { st.x = start.x + dx / d * R; st.y = start.y + dy / d * R; }
    camOv(st).x = st.x; camOv(st).y = st.y;
  });
  drag.addEventListener('pointerup', () => { last = null; });
  ui.querySelector('.ph-zoom').oninput = e => { st.zoom = +e.target.value / 100; camOv(st).zoom = st.zoom; };
  ui.querySelector('.ph-filters').onclick = e => { const k = e.target.closest('[data-f]')?.dataset.f; if (k) { sfx('ui'); setFilter(k); } };
  ui.querySelector('.ph-frames').onclick = e => { const k = e.target.closest('[data-fr]')?.dataset.fr; if (k) { sfx('ui'); st.frame = k; ui.querySelectorAll('[data-fr]').forEach(b => b.classList.toggle('on', b.dataset.fr === k)); } };
  ui.querySelector('.ph-poses').onclick = e => {
    const k = e.target.closest('[data-p]')?.dataset.p; if (!k || !pl) return;
    sfx('pop'); const pose = POSES.find(p => p[0] === k); st.pose = k;
    pl.face('down'); pl.setAct(pose[2]); pl.setEmo?.(k === 'think' ? 'think' : 'happy', 30); if (k === 'smile') pl.showEmote('happy', 1.2);
    ui.querySelectorAll('[data-p]').forEach(b => b.classList.toggle('on', b.dataset.p === k));
  };
  ui.querySelector('.ph-x').onclick = () => { sfx('back'); closePhotoMode(); };
  ui.querySelector('.ph-shoot').onclick = () => shoot(st);
  sfx('click');
}
export function closePhotoMode() {
  if (!ui) return;
  ui.remove(); ui = null;
  if (G.renderer?.cv) G.renderer.cv.style.filter = '';
  document.body.classList.remove('photo-mode'); G.runtime.photoMode = false;
  if (cam.override === mine) cam.override = null; mine = null; G.player?.setAct(null); G.player?.setEmo?.('neutral', 0);
}
async function shoot(st) {
  const src = G.renderer.cv, W = Math.min(1080, src.width), H = Math.round(W * src.height / src.width);
  const shot = document.createElement('canvas'); shot.width = W; shot.height = H;
  const c = shot.getContext('2d'); c.drawImage(src, 0, 0, W, H);
  const f = FILTERS[st.filter].px;
  if (f) { const img = c.getImageData(0, 0, W, H), d = img.data; for (let i = 0; i < d.length; i += 4) { const [r, g, b] = f(d[i], d[i + 1], d[i + 2]); d[i] = r; d[i + 1] = g; d[i + 2] = b; } c.putImageData(img, 0, 0); }
  const out = frame(shot, st.frame);
  // the flash and the shutter
  const fl = ui?.querySelector('.ph-flash'); if (fl) { fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go'); }
  sfx('click'); sfx('sparkle');
  const s = G.state, title = [`${s.island.name || 'Bistro Island'} · Day ${s.day}`, `${s.island.name || 'Bistro Island'} · Ngày ${s.day}`];
  const small = document.createElement('canvas'), sw = 480; small.width = sw; small.height = Math.round(sw * out.height / out.width);
  small.getContext('2d').drawImage(out, 0, 0, small.width, small.height);
  addPhoto(title, small.toDataURL('image/jpeg', 0.8));
  s.stats.photos = (s.stats.photos || 0) + 1; markDirty(true); track('photo', { filter: st.filter, frame: st.frame, pose: st.pose });
  const blob = await new Promise(r => out.toBlob(r, 'image/jpeg', 0.92));
  const file = blob && new File([blob], `bistro-island-day-${s.day}.jpg`, { type: 'image/jpeg' });
  toast({ text: T('📷 Saved to your album', '📷 Đã lưu vào album'), sub: T('Menu → Goals → Album to see it.', 'Menu → Mục tiêu → Album để xem.'), icon: 'photo', ms: 2400 });
  if (file && navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Bistro Island' }); return; } catch { /* closed the share sheet */ return; } }
  if (blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
}
// a Polaroid (thick white bottom, the island's name in pen) or a postcard (stamp and postmark)
function frame(shot, kind) {
  if (kind === 'none') return shot;
  const s = G.state, isle = s.island.name || 'Bistro Island', W = shot.width, H = shot.height;
  const out = document.createElement('canvas'), c = out.getContext('2d');
  if (kind === 'polaroid') {
    const m = Math.round(W * 0.05), bottom = Math.round(W * 0.2);
    out.width = W + m * 2; out.height = H + m + bottom;
    c.fillStyle = '#fffdf7'; c.fillRect(0, 0, out.width, out.height); c.drawImage(shot, m, m);
    c.fillStyle = '#3a2f2a'; c.font = `700 ${Math.round(W * 0.05)}px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive`; c.textAlign = 'center';
    c.fillText(`${isle} ♡ ${T('day', 'ngày')} ${s.day}`, out.width / 2, H + m + bottom * 0.58);
    return out;
  }
  // postcard
  const m = Math.round(W * 0.04); out.width = W + m * 2; out.height = H + m * 2;
  c.fillStyle = '#f7ecd6'; c.fillRect(0, 0, out.width, out.height); c.drawImage(shot, m, m);
  const sw = Math.round(W * 0.16), sx = out.width - m - sw - m, sy = m * 2;
  c.fillStyle = '#fffaf0'; c.fillRect(sx - 6, sy - 6, sw + 12, sw * 1.2 + 12); c.fillStyle = '#e8584e'; c.fillRect(sx, sy, sw, sw * 1.2);
  c.fillStyle = '#ffd35a'; c.font = `900 ${Math.round(sw * 0.5)}px sans-serif`; c.textAlign = 'center'; c.fillText('★', sx + sw / 2, sy + sw * 0.75);
  c.strokeStyle = 'rgba(40,30,30,.55)'; c.lineWidth = Math.max(2, W * 0.004); c.beginPath(); c.arc(sx - sw * 0.2, sy + sw * 1.1, sw * 0.45, 0, Math.PI * 2); c.stroke();
  c.fillStyle = 'rgba(40,30,30,.6)'; c.font = `800 ${Math.round(sw * 0.13)}px sans-serif`; c.fillText(isle.toUpperCase().slice(0, 14), sx - sw * 0.2, sy + sw * 1.13);
  c.fillStyle = '#fffaf0'; c.font = `900 ${Math.round(W * 0.07)}px Nunito, sans-serif`; c.textAlign = 'left'; c.lineWidth = Math.max(3, W * 0.008); c.strokeStyle = '#3a2f2a';
  const msg = T(`Greetings from ${isle}!`, `Gửi lời chào từ ${isle}!`); c.strokeText(msg, m * 2.2, out.height - m * 2.4); c.fillText(msg, m * 2.2, out.height - m * 2.4);
  return out;
}
