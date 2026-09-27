// The photo album: the game quietly takes a snapshot of the island at the big
// moments — the first repair, the first customer, every chapter, the festival,
// Minh's photo trips — and keeps them with a caption and the day. Pictures live
// on this device only (they're too big for the cloud save).

import { G, T } from './state.js';
import { bus } from '../core/util.js';

const MAX = 36;
const key = () => G.user ? `jenisland.album.${G.user.id}` : null;
export function albumPhotos() { try { return JSON.parse(localStorage.getItem(key()) || '[]'); } catch { return []; } }
function save(list) {
  for (let n = list.length; n > 0; n--) { try { localStorage.setItem(key(), JSON.stringify(list.slice(-n))); return; } catch { /* full: keep fewer */ } }
}
// take the picture a moment after the event, so the scene has settled
export function snapshot(title, delay = 1200) {
  if (!key() || !G.renderer?.cv) return;
  setTimeout(() => {
    try {
      const src = G.renderer.cv, w = 320, h = Math.round(w * src.height / src.width);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = Math.min(h, 480);
      const c = cv.getContext('2d'); c.drawImage(src, 0, Math.max(0, (src.height - src.width * 1.5) / 2), src.width, Math.min(src.height, src.width * 1.5), 0, 0, w, cv.height);
      const list = albumPhotos(); list.push({ day: G.state.day, t: Date.now(), title, img: cv.toDataURL('image/jpeg', 0.72) });
      while (list.length > MAX) list.shift();
      save(list);
      bus.emit('toast', { text: T('📷 Added to your album', '📷 Đã thêm vào album'), sub: T(title[0], title[1]), icon: 'photo', ms: 1600 });
    } catch (e) { console.warn('album', e); }
  }, delay);
}
const MOMENTS = {
  first_repair: ['The first shed, fixed', 'Căn chòi đầu tiên, đã sửa xong'], first_sale: ['My very first customer', 'Vị khách đầu tiên'],
  first_keeper: ['My first helper', 'Người phụ giúp đầu tiên'], truck: ['The truck is ours', 'Chiếc xe là của mình'],
  night_market: ['The Night Market lights up again', 'Chợ Đêm sáng đèn trở lại'], restaurant: ['Grand opening on the hill', 'Khai trương nhà hàng trên đồi'],
  statue: ['The night the statue was unveiled', 'Đêm khánh thành bức tượng'], lantern_festival: ['The Lantern Festival', 'Lễ Hội Đèn Lồng'],
  keeper_island: ['Keeper of the Island', 'Người Giữ Đảo'], sunrise: ['Sunrise from the lighthouse', 'Bình minh từ hải đăng'],
};
export function initAlbum() {
  bus.on('achievement', id => { if (MOMENTS[id]) snapshot(MOMENTS[id], 1500); });
  bus.on('chapterCard', (n, title) => snapshot(title, 400));
  bus.on('quest:done', (id, title) => { if (['minh_sunset', 'minh_fireflies', 'vy_portrait', 'hai_dawn', 'post_lam', 'nm_lanterns'].includes(id) && title) snapshot(title, 200); });
}
