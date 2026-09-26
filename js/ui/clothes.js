// Cô Ba's boutique (buy clothes) and the wardrobe at home (wear them).
// Every item shows a live preview of *you* wearing it.

import { G, T, markDirty, addMoney, canAfford } from '../systems/state.js';
import { CLOTHES, SLOTS, FREE_CLOTHES, applyOutfit } from '../data/wardrobe.js';
import { playerLook } from '../data/looks.js';
import { openSheet, tabs, h, btn } from './sheets.js';
import { drawHuman, EL } from '../gfx/character.js';
import { sfx } from '../core/audio.js';
import { money, escapeHtml } from '../core/util.js';
import { toast } from './hud.js';
import { level, addXP } from '../systems/progress.js';
import { fx } from '../world/render.js';

export const BA = { name: 'Cô Ba', look: { skin: '#f8d6bd', hair: '#6e4430', hairStyle: 'wavy', top: '#fff', topStyle: 'dress', bottom: '#fff', shoe: '#f0e6da', lashes: true, hat: 'sunhat', hatColor: '#f3dcae' } };

function wardrobe() {
  const s = G.state;
  s.wardrobe ||= { owned: [...FREE_CLOTHES], outfit: 'classic' };
  for (const f of FREE_CLOTHES) if (!s.wardrobe.owned.includes(f)) s.wardrobe.owned.push(f);
  return s.wardrobe;
}
export function baseLook() { const s = G.state; return s.player.look || playerLook(s.player.lookOpt || {}); }
export function currentLook() { return applyOutfit(baseLook(), wardrobe()); }
export function refreshPlayerLook() { if (G.player) G.player.look = currentLook(); }

// little full-body preview of the player trying something on
function preview(cv, look, focus, id) {
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
  if (focus === 'shoes') { const s = cv.height / 16; c.translate(cv.width / 2, cv.height - 2.2 * s); c.scale(s, s); } // zoom in on the feet
  else { const s = cv.height / 58; c.translate(cv.width / 2, cv.height - 4 * s); c.scale(s, s); }
  // accessories worn on the back are shown from a three-quarter back view
  const back = look.backpack || look.guitar || look.surf;
  const yawOverride = focus === 'extra' ? (back && id ? 2.4 : 0.45) : undefined;
  drawHuman(c, { look, dir: 'down', moving: 0, walkPh: 0, seed: 2, blinkAmt: 0, emo: 'happy', act: null, yawOverride }, 1);
  c.restore();
}
function itemRow(id, right, { dim = false, note = '' } = {}) {
  const it = CLOTHES[id], w = wardrobe();
  const r = h('div', 'row cl-row' + (dim ? ' dim' : ''));
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 112;
  const ico = h('div', 'ico cl-ico'); ico.appendChild(cv); r.appendChild(ico);
  r.appendChild(h('div', 'info', `<b>${escapeHtml(T(it.en, it.vi))}</b><small>${note}</small>`));
  if (right) r.appendChild(right);
  preview(cv, applyOutfit(baseLook(), { ...w, [it.slot]: id }), it.slot, id);
  return r;
}

export function openBoutique() {
  openSheet({ title: T('Cô Ba\'s Boutique', 'Tiệm Áo Cô Ba'), sub: T('Clothes, hats and accessories', 'Quần áo, mũ nón và phụ kiện'), who: BA, full: true, build: (body, api) => {
    tabs(body, SLOTS.map(sl => T(sl.en, sl.vi)), (i, pane) => {
      const slot = SLOTS[i].id, w = wardrobe();
      const list = h('div', 'list'); pane.appendChild(list);
      const ids = Object.keys(CLOTHES).filter(k => CLOTHES[k].slot === slot && !FREE_CLOTHES.includes(k)).sort((a, b) => (CLOTHES[a].lv || 0) - (CLOTHES[b].lv || 0) || CLOTHES[a].price - CLOTHES[b].price);
      for (const id of ids) {
        const it = CLOTHES[id], own = w.owned.includes(id), locked = level() < (it.lv || 0);
        const note = own ? T('In your wardrobe ✓', 'Đã có trong tủ ✓') : locked ? T(`Unlocks at level ${it.lv}`, `Mở ở cấp ${it.lv}`) : money(it.price);
        const b = own ? null : btn(money(it.price), (el) => {
          if (!canAfford(it.price)) { sfx('error'); toast({ text: T('Not enough money', 'Không đủ tiền'), bad: true }); return; }
          addMoney(-it.price, 'clothes'); w.owned.push(id); w[slot] = id; addXP(10, 'clothes');
          markDirty(true); refreshPlayerLook(); sfx('buy');
          toast({ text: T(`${it.en} — you're wearing it!`, `${it.vi} — mặc luôn rồi nè!`), sub: T('Change any time at the wardrobe in your room.', 'Thay đồ bất cứ lúc nào ở tủ quần áo trong phòng.'), icon: 'shirt' });
          if (G.player) fx.burst('spark', G.player.x, G.player.y - 30, 10, { up: 40, col: '#ffd35a' });
          api.rebuild(); void el;
        }, 'buy', locked);
        list.appendChild(itemRow(id, b, { dim: locked && !own, note }));
      }
    }, 0, api);
  } });
}

export function openWardrobe() {
  openSheet({ title: T('Wardrobe', 'Tủ quần áo'), sub: T('What will you wear today?', 'Hôm nay mặc gì đây?'), full: true, build: (body, api) => {
    const w = wardrobe();
    const top = h('div', 'cl-mirror');
    const cv = document.createElement('canvas'); cv.width = 180; cv.height = 210; top.appendChild(cv);
    body.appendChild(top);
    preview(cv, currentLook());
    tabs(body, SLOTS.map(sl => T(sl.en, sl.vi)), (i, pane) => {
      const slot = SLOTS[i].id;
      const list = h('div', 'list'); pane.appendChild(list);
      const ids = w.owned.filter(k => CLOTHES[k]?.slot === slot);
      for (const id of ids) {
        const on = w[slot] === id || (!w[slot] && FREE_CLOTHES.includes(id));
        const b = btn(on ? T('Wearing', 'Đang mặc') : T('Wear', 'Mặc'), () => {
          w[slot] = id; markDirty(true); refreshPlayerLook(); sfx('whoosh');
          if (G.player) { G.player.doHop(70); G.player.setEmo('happy', 1.5); G.player.showEmote('sparkle', 1.2); }
          api.rebuild();
        }, on ? 'buy pink' : 'buy alt', on);
        list.appendChild(itemRow(id, b, { note: on ? T('Wearing now', 'Đang mặc') : '' }));
      }
      if (ids.length <= 1) list.appendChild(h('div', 'empty-note', T('Buy more at Cô Ba\'s Boutique on Market Street!', 'Mua thêm ở Tiệm Áo Cô Ba trên Phố Chợ nhé!')));
    }, 0, api);
  } });
}
