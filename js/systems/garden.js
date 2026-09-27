// The garden patch beside your house: three little beds. Plant (a few k for
// seeds), water once a day, and after two watered days pick a basket for the
// pantry. Plus the plaques on the places you restored, which tell their story.

import { G, T, markDirty, addPantry, addMoney, canAfford } from './state.js';
import { say, ask } from '../ui/dialogue.js';
import { sfx } from '../core/audio.js';
import { toast } from '../ui/hud.js';
import { fx } from '../world/render.js';
import { dist } from '../core/util.js';
import { INK, ell, circ, box, line } from '../gfx/draw.js';
import { discover } from './interact.js';

export const GARDEN = { x: 1370, y: 1800 };
const BEDS = [[-30, 0], [0, 0], [30, 0], [-30, 30], [0, 30], [30, 30]];   // the last three come with the garden terrace
export const CROPS = {
  herbs: { en: 'Herbs', vi: 'Rau thơm', seed: 3, yield: 6, col: '#6fbf4a' },
  chili: { en: 'Chilies', vi: 'Ớt', seed: 3, yield: 8, col: '#e8584e' },
  kumquat: { en: 'Kumquats', vi: 'Tắc', seed: 5, yield: 5, col: '#f2a33a' },
  lime: { en: 'Limes', vi: 'Chanh', seed: 4, yield: 5, col: '#9fd05a' },
};
const beds = () => { const g = (G.state.garden ||= { beds: [null, null, null] }); return g.beds; };
const bedAt = pl => BEDS.slice(0, beds().length).findIndex(([dx, dy]) => dist(pl.x, pl.y, GARDEN.x + dx, GARDEN.y + dy + 14) < 16);
const ripe = b => b && b.water >= 2;
export function gardenAction(pl) {
  if (G.scene !== G.scenes.island || G.state.story.chapter < 2) return null;
  const i = bedAt(pl); if (i < 0) return null;
  const b = beds()[i];
  if (!b) return { label: T('Plant', 'Gieo hạt'), icon: 'herbs', run: () => plant(i) };
  if (ripe(b)) return { label: T(`Harvest ${CROPS[b.crop].en.toLowerCase()}`, `Thu hoạch ${CROPS[b.crop].vi.toLowerCase()}`), icon: b.crop, run: () => harvest(i) };
  if (b.last === G.state.day) return { label: T('Watered today', 'Đã tưới hôm nay'), icon: 'ice', run: () => toast({ text: T('Already watered today', 'Hôm nay tưới rồi'), sub: T(`Ready after ${2 - b.water} more day(s) of watering.`, `Tưới thêm ${2 - b.water} ngày nữa là thu hoạch.`), icon: 'herbs' }) };
  return { label: T('Water', 'Tưới cây'), icon: 'ice', run: () => water(i) };
}
async function plant(i) {
  const ids = Object.keys(CROPS);
  const pick = await ask(null, T('What will you plant?', 'Trồng gì đây?'), [...ids.map(id => T(`${CROPS[id].en} (${CROPS[id].seed}k)`, `${CROPS[id].vi} (${CROPS[id].seed}k)`)), T('Nothing for now', 'Để sau')]);
  const id = ids[pick]; if (!id) return;
  if (!canAfford(CROPS[id].seed)) { sfx('error'); return; }
  addMoney(-CROPS[id].seed, 'ingredients');
  beds()[i] = { crop: id, water: 0, last: 0, day: G.state.day }; markDirty(true);
  G.player.setAct('work'); sfx('chop'); setTimeout(() => G.player.setAct(null), 700);
  discover('garden');
  toast({ text: T(`${CROPS[id].en} planted`, `Đã gieo ${CROPS[id].vi.toLowerCase()}`), sub: T('Water once a day; ready after two days.', 'Tưới mỗi ngày một lần; hai ngày là thu hoạch.'), icon: id });
}
function water(i) {
  const b = beds()[i]; b.water++; b.last = G.state.day; markDirty(true);
  sfx('pour'); fx.burst('splash', GARDEN.x + BEDS[i][0], GARDEN.y - 4, 8, { up: 16, col: '#dff6ff' });
  G.player.setAct('work'); setTimeout(() => G.player.setAct(null), 600);
}
function harvest(i) {
  const b = beds()[i], c = CROPS[b.crop];
  addPantry(b.crop, c.yield); beds()[i] = null; markDirty(true);
  sfx('success'); fx.burst('leaf', GARDEN.x + BEDS[i][0], GARDEN.y - 8, 8, { up: 30, col: c.col });
  G.player.setAct('hold', b.crop); setTimeout(() => G.player.act === 'hold' && G.player.setAct(null), 1000);
  toast({ text: T(`+${c.yield} ${c.en.toLowerCase()} from your garden`, `+${c.yield} ${c.vi.toLowerCase()} từ vườn nhà`), icon: b.crop });
}
// world drawing: the beds and what's growing
export function gardenDrawables() {
  if (G.scene !== G.scenes?.island || G.state.story.chapter < 2) return [];
  return [{ x: GARDEN.x, y: GARDEN.y, sortY: GARDEN.y - 2, draw: (c, t) => {
    c.save();
    const n = beds().length;
    box(c, -46, -12, 92, n > 3 ? 52 : 22, 4, '#a8784e', INK, 1);                       // the wooden frame
    BEDS.slice(0, n).forEach(([dx, dy], i) => {
      c.save(); c.translate(0, dy);
      box(c, dx - 12, -9, 24, 16, 3, '#7a5236', null);
      for (let k = 0; k < 3; k++) line(c, dx - 9, -6 + k * 5, dx + 9, -6 + k * 5, '#6a4630', 0.8);
      const b = beds()[i]; if (!b) { c.restore(); return; }
      const grow = ripe(b) ? 1 : 0.35 + b.water * 0.3, col = CROPS[b.crop].col;
      for (let k = -1; k <= 1; k++) {
        const x = dx + k * 7, sway = Math.sin(t * 2 + x) * 0.8;
        line(c, x, 0, x + sway, -8 * grow, '#5f9f3a', 1.2);
        ell(c, x + sway - 2, -7 * grow, 2.4 * grow, 1.4, '#6fbf4a', INK, 0.4); ell(c, x + sway + 2, -8 * grow, 2.4 * grow, 1.4, '#6fbf4a', INK, 0.4);
        if (ripe(b) && b.crop !== 'herbs') circ(c, x + sway, -10, 1.8, col, INK, 0.5);
      }
      if (b.last !== G.state.day && !ripe(b)) { c.fillStyle = 'rgba(120,180,230,.9)'; c.beginPath(); c.arc(dx + 10, -16 + Math.sin(t * 3) * 1.5, 2, 0, Math.PI * 2); c.fill(); }
      c.restore();
    });
    c.restore();
  } }];
}

// ---------------------------------------------------------------- plaques on restored places
const PLAQUES = [
  { x: 640, y: 2250, need: () => G.state.biz.shed1?.repair >= 1, en: 'A little brass plaque: "Bà Tư\'s Tea Stand, since 1985 — reopened by a newcomer who stayed."', vi: 'Tấm bảng đồng nhỏ: “Quán trà Bà Tư, từ 1985 — được mở lại bởi một người mới đến và ở lại.”' },
  { x: 600, y: 1610, need: () => G.state.biz.shed2?.repair >= 1, en: 'Carved into the counter: "Lâm Bakery — bread at four, every morning." Someone added: "…again."', vi: 'Khắc trên quầy: “Lò bánh họ Lâm — bánh ra lò lúc bốn giờ, mỗi sáng.” Ai đó ghi thêm: “…lại rồi.”' },
  { x: 1700, y: 1560, need: () => G.state.story.flags.bridgeFixed, en: 'Bridge plaque: "Broken by the great storm. Mended by the island, plank by plank."', vi: 'Bảng ghi trên cầu: “Gãy trong cơn bão lớn. Được cả đảo sửa lại, từng tấm ván.”' },
  { x: 560, y: 740, need: () => G.state.nightMarket?.restored, en: 'On the lantern post: "The last lantern was blown out here. The first one was lit again here too."', vi: 'Trên cột đèn: “Chiếc lồng đèn cuối cùng tắt ở đây. Chiếc đầu tiên cũng được thắp lại ở đây.”' },
];
export function plaqueAction(pl) {
  if (G.scene !== G.scenes.island) return null;
  const p = PLAQUES.find(p => dist(pl.x, pl.y, p.x, p.y) < 26 && p.need());
  return p ? { label: T('Read', 'Đọc'), icon: 'notebook', run: async () => { discover('plaque'); await say(null, T(p.en, p.vi)); } } : null;
}
