// Making a home your own:
//  · walls and floor: any colour (swatches or your own pick) and a pattern, for each floor of the
//    house — saved, and what friends see when they visit
//  · furniture colours: give any piece a new colour (its fabric and wood shift hue; the outlines
//    stay). Drawn once into a small cached image, so it costs nothing per frame.
import { G, T, markDirty, addMoney } from './state.js';
import { shade, bus } from '../core/util.js';
import { openSheet, h, present } from '../ui/sheets.js';
import { FURNITURE } from '../data/game.js';
import { setProgress, homePieces } from '../data/sets.js';
import { realWeek } from './storefront.js';
import { sfx } from '../core/audio.js';

export const WALL_SWATCHES = ['#f7e2c4', '#f6e6d6', '#e6eef7', '#e2f2e6', '#fbe0e6', '#fff3c4', '#e9dccb', '#d6e6f5', '#e8d9f2', '#f4d2c0', '#c9e4d6', '#3f4a5e'];
export const FLOOR_SWATCHES = ['#d9a870', '#d29d64', '#c98f5a', '#b08158', '#8a5a3a', '#e8d2b8', '#f4efe4', '#bdb2a3', '#9fb4c8', '#c9a0a0'];
export const WALL_STYLES = [['stripe', 'Stripes', 'Kẻ sọc'], ['dots', 'Dots', 'Chấm bi'], ['brick', 'Brick', 'Gạch'], ['tile', 'Tiles', 'Ô gạch men'], ['paw', 'Paw prints', 'Dấu chân mèo'], ['plain', 'Plain', 'Trơn']];
export const FLOOR_STYLES = [['wood', 'Wooden boards', 'Sàn gỗ'], ['tile', 'Chequered tiles', 'Gạch ca rô'], ['concrete', 'Polished stone', 'Đá mài']];

const styles = () => (G.state.home.style ||= {});
// apply a saved look to a room (a floor of your home, or a friend's when visiting)
export function applyRoomStyle(sc, st) {
  if (!sc || !st) return;
  if (st.wall) { sc.wall = st.wall; sc.wall2 = shade(st.wall, -8); }
  if (st.wallStyle) sc.wallStyle = st.wallStyle;
  if (st.floor) sc.floor = st.floor;
  if (st.floorStyle) sc.floorStyle = st.floorStyle;
}
export function applyRoomStyles() { for (const id of ['house', 'house_up', 'house_down']) applyRoomStyle(G.scenes[id], styles()[id]); }

// shop interiors keep their own look (the Business tab → Interior)
const shopStyles = () => (G.state.shopStyle ||= {});
export function applyShopStyles() { for (const [id, st] of Object.entries(shopStyles())) applyRoomStyle(G.scenes[id], st); }
export function openRoomStyle(sc, shop = false) {
  const st = ((shop ? shopStyles() : styles())[sc.id] ||= {});
  const set = (k, v) => { st[k] = v; applyRoomStyle(sc, st); markDirty(true); sfx('tap'); };
  openSheet({ title: T('Walls & floor', 'Tường & sàn'), sub: T('Paint this room any colour you like', 'Sơn phòng này màu bạn thích'), pauseTime: false, build: (body, api) => {
    const sw = (label, list, key, current) => {
      body.appendChild(h('div', 'section-title', label));
      const row = h('div', 'swatches');
      for (const col of list) { const b = h('button', 'swatch' + (current === col ? ' on' : '')); b.type = 'button'; b.style.background = col; b.setAttribute('aria-label', col); b.onclick = () => { set(key, col); api.rebuild(); }; row.appendChild(b); }
      const pick = document.createElement('input'); pick.type = 'color'; pick.className = 'swatch pick'; pick.value = current || list[0]; pick.setAttribute('aria-label', T('Any colour', 'Màu bất kỳ'));
      pick.oninput = () => set(key, pick.value); pick.onchange = () => api.rebuild(); row.appendChild(pick);
      body.appendChild(row);
    };
    const pat = (label, list, key, current) => {
      body.appendChild(h('div', 'section-title', label));
      const row = h('div', 'chip-row');
      for (const [k, en, vi] of list) { const b = h('button', 'chip' + (current === k ? ' on' : ''), T(en, vi)); b.type = 'button'; b.onclick = () => { set(key, k); api.rebuild(); }; row.appendChild(b); }
      body.appendChild(row);
    };
    sw(T('Wall colour', 'Màu tường'), WALL_SWATCHES, 'wall', sc.wall);
    pat(T('Wallpaper', 'Giấy dán tường'), WALL_STYLES, 'wallStyle', sc.wallStyle);
    sw(T('Floor colour', 'Màu sàn'), FLOOR_SWATCHES, 'floor', sc.floor);
    pat(T('Floor', 'Kiểu sàn'), FLOOR_STYLES, 'floorStyle', sc.floorStyle);
    const reset = h('button', 'link-btn', T('Back to how it was built', 'Về như lúc mới xây')); reset.type = 'button';
    reset.onclick = () => { delete (shop ? shopStyles() : styles())[sc.id]; markDirty(true); sfx('back'); api.close(); if (shop) location.reload(); else import('./home.js').then(m => m.restoreHome()); };
    if (shop) reset.textContent = T('Back to the original look (reloads)', 'Về như ban đầu (tải lại)');
    body.appendChild(reset);
  } });
}

// ---------------------------------------------------------------- furniture colours
export const HUES = [0, 35, 70, 120, 170, 210, 260, 310];
const cache = new Map();
// a piece drawn at a new hue: rendered once (front, side or back) into a canvas and reused
export function recoloured(key, hue, draw) {
  const k = key + ':' + hue;
  let e = cache.get(k);
  if (!e) {
    const W = 220, H = 200, ox = 110, oy = 170, cv = document.createElement('canvas'); cv.width = W * 2; cv.height = H * 2;
    const c = cv.getContext('2d'); c.scale(2, 2); c.translate(ox, oy); c.lineJoin = c.lineCap = 'round';
    try { draw(c); } catch { /* a piece that can't draw offscreen just shows its normal colours */ }
    try {
      const img = c.getImageData(0, 0, cv.width, cv.height), d = img.data, rot = hue / 360;
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dl = mx - mn;
        if (dl < 0.08 || l < 0.18) continue;                      // ink outlines, greys and shadows keep their colour
        const s = l > 0.5 ? dl / (2 - mx - mn) : dl / (mx + mn);
        let hh = mx === r ? (g - b) / dl + (g < b ? 6 : 0) : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4; hh = (hh / 6 + rot) % 1;
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
        d[i] = f(hh + 1 / 3) * 255; d[i + 1] = f(hh) * 255; d[i + 2] = f(hh - 1 / 3) * 255;
      }
      c.setTransform(1, 0, 0, 1, 0, 0); c.putImageData(img, 0, 0);
    } catch { /* (tainted or unsupported: keep the plain drawing) */ }
    e = { cv, ox, oy, W, H }; cache.set(k, e);
    if (cache.size > 120) cache.delete(cache.keys().next().value);
  }
  return e;
}
export function drawRecoloured(c, key, hue, draw) { const e = recoloured(key, hue, draw); c.drawImage(e.cv, -e.ox, -e.oy, e.W, e.H); }

// ---------------------------------------------------------------- Home of the Week
// Every week (Monday–Sunday, the shared clock) Anh Khoa and Cô Lan drop by and judge your home:
// variety, complete furniture sets, lights, things on the walls, painted rooms, the extra floors
// and your garden. One of them is the week's spotlight and counts extra. A cosy, personal home
// beats a full one.
const HOME_THEMES = [
  { id: 'sets', en: 'Cosy & complete', vi: 'Ấm cúng & trọn bộ' }, { id: 'light', en: 'Light it up', vi: 'Thắp sáng' }, { id: 'variety', en: 'A bit of everything', vi: 'Mỗi thứ một chút' },
  { id: 'garden', en: 'Green fingers', vi: 'Bàn tay xanh' }, { id: 'paint', en: 'Fresh paint', vi: 'Nước sơn mới' }, { id: 'walls', en: 'Gallery wall', vi: 'Bức tường kỷ niệm' },
];
export const homeTheme = (wk = realWeek()) => HOME_THEMES[((wk % HOME_THEMES.length) + HOME_THEMES.length) % HOME_THEMES.length];
export function scoreHome(theme = homeTheme()) {
  const h = G.state.home, all = homePieces(h), defs = all.map(f => FURNITURE[f.id]).filter(Boolean);
  const parts = {
    variety: Math.min(3, new Set(all.map(f => f.id)).size * 0.25),
    sets: Math.min(3, setProgress(h).filter(x => x.done).length),
    light: Math.min(2, defs.filter(d => d.light).length * 0.5),
    walls: Math.min(2, defs.filter(d => d.wall).length * 0.5),
    paint: Math.min(1.5, Object.keys(h.style || {}).length * 0.5),
    garden: Math.min(2, (h.yard || []).length * 0.3),
    floors: Math.min(1.5, Object.values(h.rooms || {}).filter(r => r.length >= 3).length * 0.75),
  };
  if (parts[theme.id] != null) parts[theme.id] *= 1.5;
  return { total: Object.values(parts).reduce((a, v) => a + v, 0), parts, n: all.length };
}
const SAY_HOME = {
  variety: [['So many different things — every corner tells a story.', 'Nhiều thứ ghê — góc nào cũng có chuyện để kể.'], ['Lovely, but a little samey.', 'Đẹp, mà hơi giống nhau.']],
  sets: [['Everything matches. That\'s a real home.', 'Mọi thứ hợp nhau. Đúng là một mái nhà.'], ['Finish a set or two — it ties a room together.', 'Hoàn thành một hai bộ đi — phòng sẽ gọn gàng hơn.']],
  light: [['It must glow beautifully at night.', 'Tối chắc lung linh lắm.'], ['A few more lamps would make it cosier.', 'Thêm vài cây đèn cho ấm cúng hơn.']],
  walls: [['The walls are full of memories.', 'Tường đầy kỷ niệm.'], ['Bare walls! Hang something you love.', 'Tường trống trơn! Treo thứ gì bạn thích đi.']],
  paint: [['That colour suits you.', 'Màu đó hợp với bạn ghê.'], ['A splash of paint would change everything.', 'Một chút sơn sẽ thay đổi hết.']],
  garden: [['The garden made me smile before I even knocked.', 'Chưa gõ cửa mà khu vườn đã làm tôi mỉm cười.'], ['The front garden is waiting for you.', 'Khu vườn trước nhà đang chờ bạn đó.']],
  floors: [['Upstairs and down — what a house!', 'Trên lầu dưới hầm — nhà gì mà đẹp vậy!'], ['All that space and so little in it!', 'Rộng vậy mà để trống nhiều quá!']],
};
export function initHomeContest() {
  bus.on('dayEnd', sum => {
    const s = G.state, c = (s.homeContest ||= {}), wk = realWeek() - 1;
    if (!sum || c.judged === wk) return; if (c.judged == null) { c.judged = wk; markDirty(); return; }
    c.judged = wk;
    const theme = homeTheme(wk), r = scoreHome(theme); if (r.n < 3) { markDirty(); return; }
    const stars = Math.max(1, Math.min(5, Math.round(r.total / 3))), prize = [0, 0, 100, 250, 600, 1200][stars];
    if (prize) addMoney(prize, 'festival');
    c.last = { wk, stars, prize, theme: theme.id }; c.best = Math.max(c.best || 0, stars); if (stars >= 4) c.wins = (c.wins || 0) + 1; markDirty(true);
    const keys = Object.keys(r.parts).sort((a, b) => r.parts[b] - r.parts[a]), good = keys[0], weak = keys[keys.length - 1];
    present(() => new Promise(done => {
      const el = document.createElement('div'); el.className = 'modal';
      el.innerHTML = `<div class="card contest"><div class="kicker">${T('Home of the Week', 'Ngôi nhà của tuần')}</div><h2>${T(theme.en, theme.vi)}</h2><div class="stars-big">${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div>
        <p class="judge"><b>Anh Khoa</b> “${T(...SAY_HOME[good][0])}”</p><p class="judge"><b>Cô Lan</b> “${T(...SAY_HOME[weak][r.parts[weak] >= 1 ? 0 : 1])}”</p>
        <p style="font-weight:900">${prize ? T(`Prize: ${prize}k`, `Giải thưởng: ${prize}k`) : T('No prize this time — next week\'s spotlight is new!', 'Lần này chưa có giải — tuần sau có chủ đề mới!')}</p>
        <p class="muted" style="font-size:12px">${T(`This week's spotlight: ${homeTheme().en}`, `Chủ đề tuần này: ${homeTheme().vi}`)}</p><button class="btn primary" type="button">${T('Thank you!', 'Cảm ơn!')}</button></div>`;
      (document.getElementById('app') || document.body).appendChild(el); bus.emit('stinger', stars >= 4 ? 'award' : 'friend');
      el.querySelector('button').onclick = () => { el.remove(); done(); };
    }));
  });
}
