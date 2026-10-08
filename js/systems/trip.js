// Boat trips to Turtle Cove (once fishing is open): Chú Hải takes you out from the end of
// the pier once a day (50k for fuel). On the little beach the tide brings things in — tap
// them before the next wave takes them back. Shells, coconuts, scallops, now and then a
// mango tree's drop, and rare finds: a giant conch, a ship in a bottle, a sea turtle saying
// hello (just a lovely moment — and a photo). 45 seconds.
import { G, T, addMoney, addPantry, canAfford, markDirty } from './state.js';
import { bus } from '../core/util.js';
import { present } from '../ui/sheets.js';
import { addXP } from './progress.js';
import { PIER_END } from '../world/island.js';
import { celebratePhoto } from './album.js';
import { track } from './telemetry.js';

const FIND = [
  { id: 'shell', em: '🐚', w: 34, en: 'Shell', vi: 'Vỏ sò' }, { id: 'coconut', em: '🥥', w: 10, ing: 'coconut', en: 'Coconut', vi: 'Dừa' },
  { id: 'scallop', em: '🦪', w: 10, ing: 'scallop', en: 'Scallop', vi: 'Sò điệp' }, { id: 'mango', em: '🥭', w: 7, ing: 'mango', en: 'Mango', vi: 'Xoài' },
  { id: 'star', em: '⭐', w: 8, en: 'Starfish', vi: 'Sao biển' }, { id: 'crab', em: '🦀', w: 9, bad: true, en: 'Crab (ouch!)', vi: 'Cua (đau!)' },
  { id: 'conch', em: '🌀', w: 1.2, furn: 'giant_shell', en: 'Giant conch', vi: 'Ốc khổng lồ' }, { id: 'bottle', em: '🍾', w: 1.2, furn: 'bottle_ship', en: 'Ship in a bottle', vi: 'Thuyền trong chai' },
  { id: 'turtle', em: '🐢', w: 1.5, en: 'A sea turtle!', vi: 'Một chú rùa biển!' },
];
const pickFind = () => { const tot = FIND.reduce((a, f) => a + f.w, 0); let r = Math.random() * tot; for (const f of FIND) { r -= f.w; if (r <= 0) return f; } return FIND[0]; };
export const tripOpen = () => !!G.state.story.flags.fishing;
export function tripAction(pl) {
  if (G.scene !== G.scenes.island || !tripOpen()) return null;
  const E = PIER_END; if (pl.x < E.x + E.w - 36 || pl.x > E.x + E.w + 14 || pl.y < E.y - 30 || pl.y > E.y + E.h + 10) return null;
  if (G.state.story.flags.tripDay === G.state.day) return { label: T('Chú Hải\'s boat (tomorrow)', 'Thuyền Chú Hải (mai)'), icon: 'fish', run: () => bus.emit('toast', { text: T('One trip a day — the tide needs to come back in!', 'Mỗi ngày một chuyến — đợi thủy triều lên lại nhé!'), icon: 'fish' }) };
  return { label: T('Boat to Turtle Cove · 50k', 'Đi thuyền tới Vịnh Rùa · 50k'), icon: 'fish', run: go };
}
function go() {
  if (!canAfford(50)) return bus.emit('toast', { text: T('The trip costs 50k for fuel', 'Chuyến đi tốn 50k tiền xăng'), icon: 'fish', bad: true });
  addMoney(-50, 'game'); G.state.story.flags.tripDay = G.state.day; markDirty(true); bus.emit('sfx', 'horn');
  return present(() => new Promise(done => {
    const el = document.createElement('div'); el.className = 'trip';
    el.innerHTML = `<div class="tr-sky"></div><div class="tr-sea"></div><div class="tr-wave"></div><div class="tr-sand"></div><div class="tr-hud"><b>🏝️ ${T('Turtle Cove', 'Vịnh Rùa')}</b><span class="tr-time">45</span></div><div class="tr-items"></div><div class="tr-bag"></div>`;
    (document.getElementById('app') || document.body).appendChild(el);
    const items = el.querySelector('.tr-items'), bag = el.querySelector('.tr-bag'), got = {};
    let left = 45, over = false;
    const drawBag = () => { bag.innerHTML = Object.entries(got).map(([id, n]) => `<span>${FIND.find(f => f.id === id).em}×${n}</span>`).join('') || `<small>${T('Tap what the tide brings in!', 'Chạm vào những gì sóng đánh vào!')}</small>`; };
    const spawn = () => {
      if (over) return;
      const f = pickFind(), it = document.createElement('button'); it.type = 'button'; it.className = 'tr-it'; it.textContent = f.em;
      it.style.left = (8 + Math.random() * 80) + '%'; it.style.top = (52 + Math.random() * 34) + '%';
      it.onclick = () => {
        if (it.dataset.done) return; it.dataset.done = 1; it.classList.add('got');
        if (f.bad) { bus.emit('sfx', 'error'); left = Math.max(1, left - 3); } else { got[f.id] = (got[f.id] || 0) + 1; bus.emit('sfx', f.furn || f.id === 'turtle' ? 'fanfare' : 'pop'); }
        if (f.id === 'turtle') { el.querySelector('.tr-hud b').textContent = '🐢 ' + T('A turtle says hello!', 'Rùa biển chào bạn!'); }
        drawBag(); setTimeout(() => it.remove(), 350);
      };
      items.appendChild(it);
      setTimeout(() => { if (!it.dataset.done) { it.classList.add('wash'); setTimeout(() => it.remove(), 500); } }, 2600 + Math.random() * 1400);
      setTimeout(spawn, 420 + Math.random() * 520);
    };
    const tick = setInterval(() => { left--; el.querySelector('.tr-time').textContent = left; if (left <= 0) finish(); }, 1000);
    const finish = () => {
      if (over) return; over = true; clearInterval(tick);
      const s = G.state, lines = [];
      for (const [id, n] of Object.entries(got)) {
        const f = FIND.find(x => x.id === id);
        if (f.ing) addPantry(f.ing, n);
        if (f.furn) for (let i = 0; i < n; i++) (s.home.owned ||= []).push(f.furn);
        if (id === 'shell' || id === 'star') addMoney(n * (id === 'star' ? 6 : 3), 'game');
        lines.push(`${f.em} ${T(f.en, f.vi)} ×${n}`);
      }
      s.stats.trips = (s.stats.trips || 0) + 1; s.stats.shells = (s.stats.shells || 0) + (got.shell || 0); if (got.turtle) s.stats.turtles = (s.stats.turtles || 0) + 1;
      addXP(30 + Object.values(got).reduce((a, n) => a + n, 0) * 3, 'trip'); markDirty(true); track('trip', { n: Object.values(got).reduce((a, b) => a + b, 0) });
      el.innerHTML = `<div class="modal" style="position:absolute"><div class="card" style="text-align:center"><h2>${T('Back at the pier', 'Về tới bến')}</h2><p style="font-weight:800;line-height:1.6">${lines.join('<br>') || T('Just sea air today. Lovely though.', 'Hôm nay chỉ có gió biển. Mà cũng dễ chịu.')}</p><p class="muted" style="font-size:12px">${T('Shells and starfish sell for a little; food goes to the pantry; treasures go home.', 'Vỏ sò và sao biển bán được chút tiền; đồ ăn vào kho; báu vật gửi về nhà.')}</p><button class="btn primary" type="button">${T('Lovely', 'Tuyệt')}</button></div></div>`;
      el.querySelector('button').onclick = () => { el.remove(); if (got.turtle || got.conch || got.bottle) celebratePhoto(got.turtle ? ['A turtle at Turtle Cove', 'Rùa biển ở Vịnh Rùa'] : ['Treasure from Turtle Cove', 'Báu vật Vịnh Rùa']); done(); };
    };
    drawBag(); setTimeout(spawn, 600);
  }));
}
