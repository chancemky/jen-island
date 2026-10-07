// The album viewer: a photo full screen, swipe (or tap the arrows) to go through the
// album, share or save it, or delete it (tap twice).
import { G, T } from '../systems/state.js';
import { albumPhotos, deletePhoto } from '../systems/album.js';
import { sfx } from '../core/audio.js';
import { escapeHtml } from '../core/util.js';
import { toast } from './hud.js';

export function openPhotoViewer(t, onChange) {
  let list = [...albumPhotos()].reverse(), i = Math.max(0, list.findIndex(p => p.t === t)), armed = false;
  const el = document.createElement('div'); el.className = 'album-view viewer';
  const draw = () => {
    const ph = list[i]; if (!ph) { el.remove(); return; }
    el.innerHTML = `<button class="av-x" type="button" aria-label="${T('Close', 'Đóng')}">✕</button>
      <button class="av-nav l" type="button" ${i <= 0 ? 'disabled' : ''}>‹</button><img src="${ph.img}" alt=""><button class="av-nav r" type="button" ${i >= list.length - 1 ? 'disabled' : ''}>›</button>
      <b>${escapeHtml(T(ph.title[0], ph.title[1]))}</b><small>${T(`Day ${ph.day}`, `Ngày ${ph.day}`)} · ${i + 1} / ${list.length}</small>
      <div class="av-row"><button class="btn pink av-share" type="button">${T('Share / save', 'Chia sẻ / lưu')}</button><button class="btn ghost av-del" type="button">${T('Delete', 'Xóa')}</button></div>`;
    el.querySelector('.av-x').onclick = () => { sfx('back'); el.remove(); };
    el.querySelector('.av-nav.l').onclick = e => { e.stopPropagation(); if (i > 0) { i--; armed = false; sfx('page'); draw(); } };
    el.querySelector('.av-nav.r').onclick = e => { e.stopPropagation(); if (i < list.length - 1) { i++; armed = false; sfx('page'); draw(); } };
    el.querySelector('.av-share').onclick = () => share(ph);
    el.querySelector('.av-del').onclick = e => {
      if (!armed) { armed = true; e.target.textContent = T('Tap again to delete', 'Chạm lần nữa để xóa'); return; }
      deletePhoto(ph.t); sfx('back'); list = [...albumPhotos()].reverse(); i = Math.min(i, list.length - 1); armed = false; onChange?.(); if (!list.length) el.remove(); else draw();
    };
  };
  let sx = null;
  el.addEventListener('pointerdown', e => { sx = e.clientX; });
  el.addEventListener('pointerup', e => { if (sx == null) return; const d = e.clientX - sx; sx = null; if (Math.abs(d) > 50) { if (d < 0 && i < list.length - 1) i++; else if (d > 0 && i > 0) i--; else return; armed = false; sfx('page'); draw(); } });
  draw(); (document.getElementById('app') || document.body).appendChild(el); sfx('page');
}
async function share(ph) {
  try {
    const blob = await (await fetch(ph.img)).blob(), file = new File([blob], `bistro-island-day-${ph.day}.jpg`, { type: blob.type || 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Bistro Island' }); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast({ text: T('Photo saved', 'Đã lưu ảnh'), icon: 'photo' });
  } catch { /* share sheet closed */ }
}
