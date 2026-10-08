// Shop fronts: decorate the space in front of each shop however you like — planters,
// lanterns, café tables, a bicycle, a bird bath… Nothing is fixed: you choose each piece and
// where it goes. Islanders judge it two ways:
//  · every day, passers-by notice a good front: a well-dressed shop draws up to 15% more customers
//  · every 7th island day, the Storefront Showdown: three neighbours judge your best shop
//    against the week's theme. They look at variety, how well it fits the theme, balance
//    (both sides of the door), a sense of space (not empty, not cluttered), and lights after
//    dark — a creative front beats an expensive one.
import { G, T, addMoney, canAfford, markDirty } from './state.js';
import { BUSINESSES } from '../data/game.js';
import { bus } from '../core/util.js';

// tags: floral · cosy · beach · festive · night (lights) · green
export const DECOR = {
  planter:   { fn: 'flowerBed', o: { w: 34 }, en: 'Flower planter', vi: 'Bồn hoa', price: 60, w: 34, tags: ['floral', 'green'] },
  pot:       { fn: 'pot', o: {}, en: 'Potted plant', vi: 'Chậu cây', price: 30, w: 14, tags: ['green'] },
  bush:      { fn: 'bush', o: { s: 0.55 }, en: 'Round shrub', vi: 'Bụi cây tròn', price: 40, w: 20, tags: ['green'] },
  banana:    { fn: 'banana', o: { s: 0.5 }, en: 'Banana plant', vi: 'Cây chuối', price: 70, w: 22, tags: ['green', 'beach'] },
  arch:      { fn: 'flowerArch', o: { w: 40 }, en: 'Flower arch', vi: 'Cổng hoa', price: 220, w: 44, tags: ['floral', 'festive'] },
  bench:     { fn: 'bench', o: {}, en: 'Bench', vi: 'Ghế dài', price: 90, w: 36, tags: ['cosy'] },
  stools:    { fn: 'lowTable', o: {}, en: 'Low table & stools', vi: 'Bàn thấp & ghế đẩu', price: 110, w: 30, tags: ['cosy'] },
  rattan:    { fn: 'rattanSet', o: {}, en: 'Rattan set', vi: 'Bộ bàn ghế mây', price: 180, w: 44, tags: ['cosy', 'beach'] },
  umbrella:  { fn: 'umbrella', o: { col: '#f28f7c' }, en: 'Parasol table', vi: 'Bàn dù', price: 140, w: 36, tags: ['beach', 'cosy'] },
  lamp:      { fn: 'lampPost', o: {}, en: 'Lamp post', vi: 'Cột đèn', price: 120, w: 10, tags: ['night'], light: true },
  lantern:   { fn: 'lanternPole', o: {}, en: 'Lantern pole', vi: 'Cột lồng đèn', price: 80, w: 10, tags: ['festive', 'night'], light: true },
  crates:    { fn: 'crateStack', o: {}, en: 'Crate stack', vi: 'Chồng thùng gỗ', price: 50, w: 30, tags: ['cosy'] },
  bicycle:   { fn: 'bicycle', o: { col: '#6fbfb0' }, en: 'Bicycle', vi: 'Xe đạp', price: 150, w: 32, tags: ['cosy'] },
  birdcage:  { fn: 'birdCage', o: {}, en: 'Bird cage', vi: 'Lồng chim', price: 100, w: 12, tags: ['cosy', 'green'] },
  birdbath:  { fn: 'birdBath', o: {}, en: 'Bird bath', vi: 'Bồn tắm chim', price: 90, w: 16, tags: ['green', 'floral'] },
  easel:     { fn: 'easel', o: {}, en: 'Painted sign', vi: 'Biển vẽ tay', price: 60, w: 18, tags: ['cosy', 'festive'] },
  surf:      { fn: 'surfboard', o: {}, en: 'Surfboard', vi: 'Ván lướt sóng', price: 120, w: 12, tags: ['beach'] },
  bunting:   { fn: 'flagPole', o: {}, en: 'Flag pole', vi: 'Cột cờ', price: 70, w: 10, tags: ['festive'] },
};
export const THEMES = [
  { id: 'floral', en: 'In bloom', vi: 'Hoa nở' }, { id: 'cosy', en: 'Cosy corner', vi: 'Góc ấm cúng' }, { id: 'beach', en: 'Beach vibes', vi: 'Không khí biển' },
  { id: 'festive', en: 'Festival time', vi: 'Mùa lễ hội' }, { id: 'night', en: 'Glow after dark', vi: 'Lung linh về đêm' }, { id: 'green', en: 'Green garden', vi: 'Vườn xanh' },
];
export const themeOf = (day = G.state.day) => THEMES[Math.floor((day - 1) / 7) % THEMES.length];
export const decorOf = id => { const z = G.state.biz[id]; return z ? (z.decor ||= []) : []; };
// the strip in front of a shop where decor can go (relative to the building's ground line)
export function frontArea(b) { const w = b.w || 100; return { x0: -w / 2 - 46, x1: w / 2 + 46, y0: 8, y1: 46 }; }

// ---------------------------------------------------------------- judging
export function scoreFront(id, theme = themeOf()) {
  const list = decorOf(id), b = G.scenes.island?.buildings?.[id]; if (!list.length || !b) return { total: 0, parts: { variety: 0, theme: 0, balance: 0, space: 0, light: 0 } };
  const kinds = new Set(list.map(d => d.k));
  const variety = Math.min(3, kinds.size * 0.6);
  const fit = list.filter(d => DECOR[d.k]?.tags.includes(theme.id)).length, themeS = Math.min(3, fit * 0.75);
  const left = list.filter(d => d.dx < -6).length, right = list.filter(d => d.dx > 6).length, balance = list.length < 2 ? 0.5 : 3 * (1 - Math.abs(left - right) / list.length);
  const n = list.length, space = n <= 2 ? n : n <= 7 ? 3 : Math.max(0, 3 - (n - 7) * 0.6);
  const lights = list.filter(d => DECOR[d.k]?.light).length, light = Math.min(3, lights * 1.2);
  const parts = { variety, theme: themeS, balance, space, light };
  return { total: Object.values(parts).reduce((a, v) => a + v, 0), parts };
}
// a well-dressed front draws more people (up to +15%, from the everyday score without a theme)
export function frontAttract(id) {
  const list = G.state.biz[id]?.decor; if (!list?.length) return 1;
  const s = scoreFront(id, { id: '_' }); return 1 + Math.min(0.15, (s.total / 12) * 0.15);
}
const JUDGES = ['co_lan', 'vy', 'ba_tu'];
const SAY = {
  variety: [['So many different things to look at!', 'Nhiều thứ để ngắm ghê!'], ['A bit samey. Try mixing it up.', 'Hơi giống nhau. Thử kết hợp thêm nhé.']],
  theme: [['That\'s exactly this week\'s theme.', 'Đúng chủ đề tuần này luôn.'], ['Pretty — but where\'s the theme?', 'Đẹp đó — mà chủ đề đâu rồi?']],
  balance: [['Lovely and balanced on both sides.', 'Cân đối đẹp cả hai bên.'], ['Everything\'s on one side!', 'Mọi thứ dồn hết một bên!']],
  space: [['Just enough — room to breathe.', 'Vừa đủ — có chỗ để thở.'], ['A little too empty, or too crowded.', 'Hơi trống, hoặc hơi chật.']],
  light: [['It\'ll glow beautifully tonight.', 'Tối nay sẽ lung linh lắm.'], ['It\'ll be dark out here at night.', 'Buổi tối ở đây sẽ tối lắm.']],
};
export function judgeWeek() {
  const s = G.state, theme = themeOf(s.day - 1), shops = Object.keys(BUSINESSES).filter(id => s.biz[id]?.owned && decorOf(id).length);
  if (!shops.length) return null;
  const best = shops.map(id => ({ id, ...scoreFront(id, theme) })).sort((a, b) => b.total - a.total)[0];
  const stars = Math.max(1, Math.min(5, Math.round(best.total / 3)));
  const comments = JUDGES.map((rid, i) => { const keys = Object.keys(best.parts).sort((a, b) => (best.parts[b] - best.parts[a]) * (i % 2 ? -1 : 1)); const k = keys[i % keys.length]; return { rid, line: SAY[k][best.parts[k] >= 2 ? 0 : 1] }; });
  const prize = [0, 0, 150, 400, 900, 1800][stars], ribbon = stars >= 5 ? 'gold' : stars >= 4 ? 'silver' : stars >= 3 ? 'bronze' : null;
  if (prize) addMoney(prize, 'festival');
  const c = (s.contest ||= { ribbons: {}, wins: 0 }); c.last = { day: s.day, shop: best.id, theme: theme.id, stars, prize };
  if (ribbon) { c.ribbons[best.id] = ribbon; if (stars >= 4) c.wins = (c.wins || 0) + 1; }
  markDirty(true);
  return { shop: best.id, theme, stars, prize, ribbon, comments };
}
// ---------------------------------------------------------------- editing
export function placeDecor(id, k, dx, dy) {
  const d = DECOR[k]; if (!d || !canAfford(d.price)) return false;
  addMoney(-d.price, 'build'); decorOf(id).push({ k, dx: Math.round(dx), dy: Math.round(dy) }); markDirty(true); bus.emit('decor', id); return true;
}
export function removeDecor(id, i) { const list = decorOf(id), d = list[i]; if (!d) return; list.splice(i, 1); addMoney(Math.round((DECOR[d.k]?.price || 0) / 2), 'build'); markDirty(true); bus.emit('decor', id); }
export function moveDecor(id, i, dx, dy) { const d = decorOf(id)[i]; if (!d) return; d.dx = Math.round(dx); d.dy = Math.round(dy); markDirty(); }

// the Storefront Showdown, every 7th island day after the summary
export function initStorefront() {
  bus.on('dayEnd', sum => {
    if (!sum || G.state.day % 7 !== 0) return;
    const r = judgeWeek(); if (!r) return;
    import('../ui/sheets.js').then(({ present }) => present(() => new Promise(done => {
      const el = document.createElement('div'); el.className = 'modal';
      el.innerHTML = `<div class="card contest"><div class="kicker">${T('Storefront Showdown', 'Thi mặt tiền đẹp')}</div><h2>${T(r.theme.en, r.theme.vi)}</h2><p style="font-weight:800">${T(`The judges chose ${BUSINESSES[r.shop].en}`, `Ban giám khảo chọn ${BUSINESSES[r.shop].name}`)}</p><div class="stars-big">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
        ${r.comments.map(c => `<p class="judge"><b>${(RES[c.rid] || '')}</b> “${T(c.line[0], c.line[1])}”</p>`).join('')}
        <p style="font-weight:900">${r.prize ? T(`Prize: ${r.prize}k${r.ribbon ? ` and a ${r.ribbon} ribbon for the shop` : ''}`, `Giải thưởng: ${r.prize}k${r.ribbon ? ` và ruy băng ${({ gold: 'vàng', silver: 'bạc', bronze: 'đồng' })[r.ribbon]} cho quán` : ''}`) : T('No prize this time — try mixing in the theme!', 'Lần này chưa có giải — thử thêm đồ hợp chủ đề nhé!')}</p>
        <p class="muted" style="font-size:12px">${T(`Next week's theme: ${themeOf(G.state.day + 1).en}`, `Chủ đề tuần sau: ${themeOf(G.state.day + 1).vi}`)}</p><button class="btn primary" type="button">${T('Thank you!', 'Cảm ơn!')}</button></div>`;
      (document.getElementById('app') || document.body).appendChild(el); bus.emit('stinger', r.stars >= 4 ? 'award' : 'friend');
      el.querySelector('button').onclick = () => { el.remove(); done(); };
    })));
  });
}
const RES = { co_lan: 'Cô Lan', vy: 'Vy', ba_tu: 'Bà Tư' };
