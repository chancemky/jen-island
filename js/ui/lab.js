// The recipe lab at your own stove: pick up to three things from your pantry and cook them
// together. The right combination discovers a secret recipe (RECIPES with `secret: true`)
// for one of your shops; anything else gets an honest opinion from Mèo Mây. Each try uses
// one portion of what you put in, and the stations you can use are the ones your known
// recipes have taught you.
import { G, T, pantry, addPantry, markDirty, learnRecipe } from '../systems/state.js';
import { RECIPES, STATION, PREPPED, BUSINESSES, recipeName, ingName } from '../data/game.js';
import { openSheet, h, btn, showReward } from './sheets.js';
import { iconURL } from '../gfx/food.js';
import { sfx } from '../core/audio.js';
import { toast } from './hud.js';
import { choice, escapeHtml } from '../core/util.js';
import { track } from '../systems/telemetry.js';

const FLOPS = [
  ['Mèo Mây sniffs it, sneezes, and leaves the room.', 'Mèo Mây ngửi thử, hắt xì, rồi bỏ đi.'],
  ['It tastes like a rainy Tuesday. Not bad, not good.', 'Vị như một ngày thứ Ba mưa. Không dở, không ngon.'],
  ['Interesting! In the way a shipwreck is interesting.', 'Thú vị đó! Theo kiểu một con tàu đắm cũng thú vị.'],
  ['You\'ve invented a new colour. Not a new recipe.', 'Bạn vừa phát minh ra một màu mới. Không phải món mới.'],
  ['So close. Something\'s missing — or something\'s extra.', 'Gần lắm rồi. Thiếu gì đó — hoặc dư gì đó.'],
];
const stockKey = k => STATION[k]?.uses || null;
const haveOf = k => { const u = stockKey(k); if (!u) return 99; const raw = PREPPED[u] ? PREPPED[u].from : u; return pantry(raw); };
function stations() {
  const known = new Set();
  for (const id of G.state.recipes) for (const st of RECIPES[id]?.steps || []) if (STATION[st]) known.add(st);
  for (const [k, st] of Object.entries(STATION)) if (st.uses && haveOf(k) > 0) known.add(k);       // and whatever's in your pantry
  return [...known].sort((a, b) => (haveOf(b) > 0) - (haveOf(a) > 0));
}
export function openLab() {
  const pick = [];
  openSheet({ title: T('Recipe lab', 'Bếp thử món'), sub: T('Mix up to three things and taste', 'Trộn tối đa ba thứ rồi nếm thử'), build: (body, api) => {
    const s = G.state, found = Object.keys(RECIPES).filter(id => RECIPES[id].secret), got = found.filter(id => s.recipes.includes(id)).length;
    body.appendChild(h('div', 'empty-note', T(`Secret recipes found: ${got} / ${found.length}. Each try uses one portion of each thing you add.`, `Món bí mật đã tìm: ${got} / ${found.length}. Mỗi lần thử dùng một phần mỗi thứ.`)));
    const pot = h('div', 'lab-pot'); body.appendChild(pot);
    const drawPot = () => { pot.innerHTML = [0, 1, 2].map(i => pick[i] ? `<button type="button" class="lab-slot on" data-i="${i}"><img src="${iconURL(STATION[pick[i]].icon, 48)}" alt=""><small>${escapeHtml(T(STATION[pick[i]].en || STATION[pick[i]].label, STATION[pick[i]].label))}</small></button>` : `<div class="lab-slot">+</div>`).join(''); pot.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { pick.splice(+b.dataset.i, 1); sfx('back'); drawPot(); }); };
    drawPot();
    const grid = h('div', 'lab-grid scroll'); body.appendChild(grid);
    for (const k of stations()) {
      const n = haveOf(k), b = h('button', 'lab-ing' + (n < 1 ? ' dim' : ''), `<img src="${iconURL(STATION[k].icon, 40)}" alt=""><small>${escapeHtml(T(STATION[k].en || STATION[k].label, STATION[k].label))}</small>${stockKey(k) ? `<i>${n}</i>` : ''}`);
      b.type = 'button'; b.disabled = n < 1;
      b.onclick = () => { if (pick.length >= 3 || pick.includes(k)) { sfx('error'); return; } pick.push(k); sfx('pop'); drawPot(); };
      grid.appendChild(b);
    }
    body.appendChild(btn('🍳 ' + T('Cook & taste', 'Nấu & nếm thử'), () => cook(pick, api), 'btn big pink lab-cook'));
  } });
}
function cook(pick, api) {
  if (pick.length < 2) { toast({ text: T('Add at least two things', 'Thêm ít nhất hai thứ'), icon: 'grill' }); return; }
  for (const k of pick) { const u = stockKey(k); if (u) addPantry(PREPPED[u] ? PREPPED[u].from : u, -1); }
  sfx('sizzle'); G.player?.setAct('stir'); setTimeout(() => G.player?.setAct(null), 1400);
  const key = [...pick].sort().join('+');
  const hit = Object.keys(RECIPES).find(id => RECIPES[id].secret && [...RECIPES[id].steps].sort().join('+') === key);
  const s = G.state; s.stats.labTries = (s.stats.labTries || 0) + 1; markDirty(true); track('lab', { hit: !!hit });
  pick.length = 0;
  if (!hit) { setTimeout(() => toast({ text: T(...choice(FLOPS)), icon: 'grill', ms: 3200 }), 900); api.rebuild(); return; }
  if (s.recipes.includes(hit)) { setTimeout(() => toast({ text: T(`Your ${recipeName(hit)} — as good as ever!`, `Món ${recipeName(hit)} của bạn — vẫn ngon như mọi khi!`), icon: RECIPES[hit].icon }), 900); api.rebuild(); return; }
  learnRecipe(hit); api.close(true);
  const shop = Object.entries(BUSINESSES).find(([, b]) => b.biz === RECIPES[hit].biz)?.[0];
  setTimeout(() => showReward({ kicker: T('Secret recipe discovered!', 'Khám phá món bí mật!'), title: recipeName(hit), icon: RECIPES[hit].icon, steps: RECIPES[hit].steps.map(k => STATION[k].icon), text: T(`${RECIPES[hit].blurb || ''} It's on the menu at ${shop ? BUSINESSES[shop].en : 'your shop'} now.`, `${RECIPES[hit].blurbVi || ''} Món này đã có trong thực đơn ${shop ? BUSINESSES[shop].name : 'quán bạn'}.`) }), 700);
}
export const isLabStove = () => G.scene?.id === 'house';
