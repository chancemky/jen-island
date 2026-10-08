// The photo album: the game quietly takes a snapshot of the island at the big
// moments — the first repair, the first customer, every chapter, the festival,
// Minh's photo trips — and keeps them with a caption and the day. Pictures live
// on this device only (they're too big for the cloud save).

import { G, T } from './state.js';
import { bus, sleep } from '../core/util.js';
import { RESIDENTS } from '../data/looks.js';
import { cam, fx } from '../world/render.js';

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
// a picture you took yourself in photo mode (ui/photo.js)
export function addPhoto(title, img) {
  if (!key()) return false;
  const list = albumPhotos(); list.push({ day: G.state.day, t: Date.now(), title, img, mine: true });
  while (list.length > MAX) list.shift();
  save(list); return true;
}
// ---------------------------------------------------------------- celebration photos
// For milestones the album gets a proper photo: once the moment is free (no scene, no card
// open), the camera comes in close, you cheer with confetti while anyone nearby turns and
// claps, and the shot is framed as a captioned Polaroid. Waits up to two minutes for a calm
// moment; if none comes it takes a plain snapshot instead.
const queue = []; let running = false;
const calm = () => !G.runtime.inCutscene && !G.runtime.photoMode && !G.runtime.sleeping && G.scene && G.player?.visible && G.renderer?.cv
  && !document.querySelector('.reward:not(.out), .levelup:not(.out), .modal, .summary, .sheet-wrap:not(.out), .wn-wrap, #dialog:not(.hidden), .svc, .prep');
export function celebratePhoto(title) { if (!key()) return; queue.push({ title, at: Date.now() }); setTimeout(next, 1200); }
async function next() {
  if (running || !queue.length) return;
  if (!calm()) { if (Date.now() - queue[0].at > 120000) { const q = queue.shift(); snapshot(q.title, 0); } setTimeout(next, 1500); return; }
  running = true;
  try { await stage(queue.shift().title); } catch (e) { console.warn('album', e); }
  running = false; if (queue.length) setTimeout(next, 3000);
}
async function stage(title) {
  const pl = G.player, sc = G.scene, mine = { x: pl.x, y: pl.y - 26, zoom: 2.1, rate: 5 };
  let crowd = [], shot = null;
  try {
    document.body.classList.add('snapping'); cam.override = mine;
    pl.face('down'); pl.setAct('cheer'); pl.setEmo?.('happy', 4);
    crowd = (sc.actors || []).filter(a => a !== pl && a.kind === 'human' && a.visible && Math.hypot(a.x - pl.x, a.y - pl.y) < 110 && !a.data?.keeper && !a.clip).slice(0, 4);
    for (const a of crowd) { a.face(a.x < pl.x ? 'right' : 'left'); a.setAct('clap'); }
    if (G.meo?.visible && G.meo.scene === sc) G.meo.showEmote?.('heart', 2);
    await sleep(750);
    if (!calm() && G.runtime.inCutscene) return;                 // a scene started: give way
    fx.burst('confetti', pl.x, pl.y - 34, 30, { up: 90, speed: 70, col: ['#f08ca0', '#ffd35a', '#9fd8c8', '#fff'], g: 60, life: 1.8 });
    bus.emit('sfx', 'sparkle');
    await sleep(700);
    shot = grab(title);
  } finally {
    document.body.classList.remove('snapping'); if (cam.override === mine) cam.override = null;
    if (pl.act === 'cheer') pl.setAct(null); for (const a of crowd) if (a.act === 'clap') a.setAct(null);
  }
  if (!shot) return;
  const list = albumPhotos(); list.push({ day: G.state.day, t: Date.now(), title, img: shot, celebration: true });
  while (list.length > MAX) list.shift(); save(list);
  const fl = document.createElement('div'); fl.className = 'snap-flash'; (document.getElementById('app') || document.body).appendChild(fl); setTimeout(() => fl.remove(), 600);
  bus.emit('toast', { text: T('📷 Added to your album', '📷 Đã thêm vào album'), sub: T(title[0], title[1]), icon: 'photo', ms: 2200 });
}
// the middle of the screen as a 3:4 Polaroid with the moment written underneath
function grab(title) {
  try {
    const src = G.renderer.cv, sw = Math.min(src.width, src.height * 0.75), sh = sw / 0.75, sx = (src.width - sw) / 2, sy = Math.max(0, Math.min(src.height - sh, (src.height - sh) / 2 - src.height * 0.04));
    const W = 360, H = 480, m = 16, cap = 66, cv = document.createElement('canvas'); cv.width = W + m * 2; cv.height = H + m + cap;
    const c = cv.getContext('2d'); c.fillStyle = '#fffdf7'; c.fillRect(0, 0, cv.width, cv.height); c.drawImage(src, sx, sy, sw, sh, m, m, W, H);
    c.fillStyle = '#3a2f2a'; c.textAlign = 'center'; c.font = '700 19px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
    c.fillText(T(title[0], title[1]).slice(0, 34), cv.width / 2, H + m + 30);
    c.font = '700 13px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive'; c.fillStyle = '#8a6a5a';
    c.fillText(`${G.state.island.name || 'Bistro Island'} · ${T('day', 'ngày')} ${G.state.day}`, cv.width / 2, H + m + 52);
    return cv.toDataURL('image/jpeg', 0.8);
  } catch { return null; }
}
export function deletePhoto(t) { save(albumPhotos().filter(p => p.t !== t)); }
const MOMENTS = {
  first_repair: ['The first shed, fixed', 'Căn chòi đầu tiên, đã sửa xong'], first_sale: ['My very first customer', 'Vị khách đầu tiên'],
  first_keeper: ['My first helper', 'Người phụ giúp đầu tiên'], truck: ['The truck is ours', 'Chiếc xe là của mình'],
  night_market: ['The Night Market lights up again', 'Chợ Đêm sáng đèn trở lại'], restaurant: ['Grand opening on the hill', 'Khai trương nhà hàng trên đồi'],
  statue: ['The night the statue was unveiled', 'Đêm khánh thành bức tượng'], lantern_festival: ['The Lantern Festival', 'Lễ Hội Đèn Lồng'],
  keeper_island: ['Keeper of the Island', 'Người Giữ Đảo'], sunrise: ['Sunrise from the lighthouse', 'Bình minh từ hải đăng'],
};
export function initAlbum() {
  bus.on('achievement', id => { if (MOMENTS[id]) celebratePhoto(MOMENTS[id]); });
  bus.on('chapterCard', (n, title) => celebratePhoto(title));
  bus.on('levelup', lv => { if (lv % 10 === 0) celebratePhoto([`Level ${lv}!`, `Cấp ${lv}!`]); });
  bus.on('weekAward', () => celebratePhoto(['A trophy week!', 'Một tuần đoạt cúp!']));
  bus.on('heartEvent', (rid, n) => { if (n === 2) { const nm = RESIDENTS[rid]?.name || ''; celebratePhoto([`Close friends with ${nm}`, `Bạn thân với ${nm}`]); } });
  bus.on('rareMet', id => celebratePhoto({ critic: ['Five stars from the critic', 'Năm sao từ nhà phê bình'], vlogger: ['On Kenji\'s travel vlog', 'Lên vlog của Kenji'], busker: ['A song by the fountain', 'Một bài hát bên đài phun nước'], goldcat: ['The golden cat!', 'Chú mèo vàng!'] }[id] || ['A rare visitor', 'Vị khách hiếm']));
  bus.on('quest:done', (id, title) => { if (['minh_sunset', 'minh_fireflies', 'vy_portrait', 'hai_dawn', 'post_lam', 'nm_lanterns'].includes(id) && title) snapshot(title, 200); });
}
