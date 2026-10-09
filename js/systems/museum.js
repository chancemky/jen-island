// The island museum, in the Village Hall: donate one of each fish you've caught, a sketch of each
// tide-pool creature you've seen, a chart of each constellation you've joined up, and the
// treasures from Turtle Cove. Each wing fills up; every five donations the hall says thank you,
// and a full museum earns its own exhibit for your home.
import { G, T, markDirty, addMoney } from './state.js';
import { bus, dist } from '../core/util.js';
import { openSheet, h, btn } from '../ui/sheets.js';
import { sfx } from '../core/audio.js';
import { addXP } from './progress.js';
import { FISH } from './fishing.js';
import { CONSTELLATIONS } from './nature.js';
import { FURNITURE } from '../data/game.js';

export const MUSEUM_SPOT = { x: 620, y: 412 };
const CREATURES = ['hermit', 'starfish', 'anemone', 'shrimp', 'urchin', 'blenny', 'nudibranch', 'octopus', 'seahorse'];
const CREATURE_NAMES = { hermit: ['Hermit crab', 'Ốc mượn hồn'], starfish: ['Cushion starfish', 'Sao biển gối'], anemone: ['Sea anemone', 'Hải quỳ'], shrimp: ['Glass shrimp', 'Tôm kính'], urchin: ['Sea urchin', 'Nhím biển'], blenny: ['Rock blenny', 'Cá bống đá'], nudibranch: ['Purple sea slug', 'Sên biển tím'], octopus: ['Baby octopus', 'Bạch tuộc con'], seahorse: ['Tiny seahorse', 'Cá ngựa tí hon'] };
const TREASURES = ['giant_shell', 'bottle_ship'];
const FISHES = () => Object.keys(FISH).filter(id => !FISH[id].junk);
const mus = () => (G.state.museum ||= { fish: {}, creatures: {}, stars: {}, treasures: {} });
export function museumCount() { const m = mus(); return Object.keys(m.fish).length + Object.keys(m.creatures).length + Object.keys(m.stars).length + Object.keys(m.treasures).length; }
export const museumTotal = () => FISHES().length + CREATURES.length + CONSTELLATIONS.length + TREASURES.length;
function thank() {
  const n = museumCount(), s = G.state;
  if (n % 5 === 0) { const k = 50 + n * 10; addMoney(k, 'gift'); bus.emit('toast', { text: T(`The museum thanks you — ${n} exhibits!`, `Bảo tàng cảm ơn bạn — ${n} hiện vật!`), sub: T(`A donation box gift: ${k}k`, `Quà từ hòm công đức: ${k}k`), icon: 'star', cls: 'ach', ms: 3600 }); }
  if (n === museumTotal() && !s.museum.complete) { s.museum.complete = true; (s.home.owned ||= []).push('museum_model'); bus.emit('toast', { text: T('The museum is complete!', 'Bảo tàng đã đầy đủ!'), sub: T('A model of the Village Hall is waiting at home.', 'Mô hình Đình làng đang chờ ở nhà.'), icon: 'star', cls: 'ach', ms: 5000 }); }
  addXP(20, 'museum'); markDirty(true); sfx('success');
}
export function museumAction(pl) {
  if (G.scene !== G.scenes.island || dist(pl.x, pl.y, MUSEUM_SPOT.x, MUSEUM_SPOT.y) > 34) return null;
  return { label: T('Island museum', 'Bảo tàng đảo'), icon: 'star', run: openMuseum };
}
export function openMuseum() {
  openSheet({ title: T('Island Museum', 'Bảo tàng đảo'), sub: T(`${museumCount()} of ${museumTotal()} exhibits · Village Hall`, `${museumCount()}/${museumTotal()} hiện vật · Đình làng`), build: (body, api) => {
    const list = h('div', 'list scroll'); list.style.flex = '1'; body.appendChild(list);
    const s = G.state, m = mus();
    const section = (title, items) => {
      const have = items.filter(i => i.done).length; list.appendChild(h('div', 'section-title', `${title} · ${have}/${items.length}`));
      for (const it of items) {
        const r = h('div', 'row' + (it.done ? '' : it.can ? '' : ' dim'), `<div class="ico">${it.done ? it.icon : it.can ? '📦' : '❔'}</div><div class="info"><b>${it.done || it.can ? it.name : '???'}</b><small>${it.done ? T('On display', 'Đang trưng bày') : it.can ? it.how : it.hint}</small></div>`);
        if (!it.done && it.can) r.appendChild(btn(T('Donate', 'Hiến tặng'), () => { it.give(); thank(); api.rebuild(); }, 'buy'));
        list.appendChild(r);
      }
    };
    section(T('🐟 Fish', '🐟 Cá'), FISHES().map(id => ({ icon: FISH[id].rare ? '🌙' : FISH[id].nightOnly ? '🏮' : '🐟', name: T(FISH[id].en, FISH[id].vi), done: !!m.fish[id], can: (s.fishBag?.[id] || 0) > 0, how: T('Donate one from your catch', 'Hiến một con bạn đã câu'), hint: T('Catch one first', 'Câu được một con trước đã'), give: () => { s.fishBag[id]--; m.fish[id] = s.day; } })));
    section(T('🦀 Tide pool', '🦀 Hồ triều'), CREATURES.map(id => ({ icon: '🖼️', name: T(...CREATURE_NAMES[id]), done: !!m.creatures[id], can: !!s.tidepool?.[id], how: T('Donate your sketch of it', 'Hiến bức ký họa của bạn'), hint: T('Find it in the tide pool', 'Tìm nó ở hồ triều'), give: () => { m.creatures[id] = s.day; } })));
    section(T('✨ Star charts', '✨ Bản đồ sao'), CONSTELLATIONS.map(c => ({ icon: '✨', name: T(c.en, c.vi), done: !!m.stars[c.id], can: !!s.constellations?.[c.id], how: T('Donate your star chart', 'Hiến bản đồ sao của bạn'), hint: T('Join it up at Lighthouse Point', 'Nối chòm sao ở Mũi Hải Đăng'), give: () => { m.stars[c.id] = s.day; } })));
    section(T('🏺 Treasures', '🏺 Báu vật'), TREASURES.map(id => ({ icon: '🏺', name: T(FURNITURE[id].en, FURNITURE[id].vi), done: !!m.treasures[id], can: (s.home.owned || []).includes(id), how: T('Donate it from your storage', 'Hiến từ kho đồ của bạn'), hint: T('Found at Turtle Cove', 'Tìm ở Vịnh Rùa'), give: () => { const i = s.home.owned.indexOf(id); if (i >= 0) s.home.owned.splice(i, 1); m.treasures[id] = s.day; } })));
  } });
}
// a banner over the hall's door once the museum has something in it
export function museumDrawables() {
  if (G.scene !== G.scenes.island || !museumCount()) return [];
  const x = MUSEUM_SPOT.x + 62, y = MUSEUM_SPOT.y + 4;          // a standing sign beside the hall's steps
  return [{ x, y, draw: c => {
    c.fillStyle = 'rgba(0,0,0,.15)'; c.beginPath(); c.ellipse(0, 1, 12, 2.4, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#6b4a36'; c.fillRect(-10, -14, 2, 14); c.fillRect(8, -14, 2, 14);
    c.fillStyle = '#fff5df'; c.strokeStyle = '#5b3f36'; c.lineWidth = 1; c.beginPath(); c.roundRect ? c.roundRect(-16, -28, 32, 15, 3) : c.rect(-16, -28, 32, 15); c.fill(); c.stroke();
    c.fillStyle = '#a8563f'; c.font = '900 6px Nunito, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(T('MUSEUM', 'BẢO TÀNG'), 0, -23.5);
    c.fillStyle = '#7a6a5a'; c.font = '800 4px Nunito, sans-serif'; c.fillText(`${museumCount()}/${museumTotal()}`, 0, -17.5);
  } }];
}
