// Chị Tiên's hair salon: pay for a new cut (about 20 per side) or a colour.
// Every row previews the cut on *your* head. After paying you hop into the
// chair, Chị Tiên snips away, and you pop out with the new look.

import { G, T, markDirty, addMoney, canAfford } from '../systems/state.js';
import { HAIRCUTS, HAIR_COLORS } from '../data/hair.js';
import { MERCHANTS, playerLook } from '../data/looks.js';
import { openSheet, tabs, h, btn } from './sheets.js';
import { drawVillagerHead } from '../gfx/villager.js';
import { sfx } from '../core/audio.js';
import { money, escapeHtml, sleep } from '../core/util.js';
import { toast } from './hud.js';
import { addXP } from '../systems/progress.js';
import { fx } from '../world/render.js';
import { camTo, camFollow } from '../systems/cutscene.js';
import { baseLook, refreshPlayerLook } from './clothes.js';

const DYE_PRICE = 60;
const COLOR_NAMES = [['Dark brown', 'Nâu đậm'], ['Soft black', 'Đen tuyền'], ['Chestnut', 'Hạt dẻ'], ['Caramel', 'Nâu caramel'], ['Honey', 'Mật ong'], ['Blonde', 'Vàng hoe'], ['Ash grey', 'Xám tro'], ['Sakura pink', 'Hồng anh đào'], ['Ocean blue', 'Xanh biển'], ['Mint', 'Xanh bạc hà'], ['Plum', 'Tím mận'], ['Silver', 'Bạch kim']];

function head(cv, look) {
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height); c.lineJoin = 'round'; c.lineCap = 'round';
  // show the whole haircut: a little lower and smaller than a portrait
  drawVillagerHead(c, cv.width / 2, cv.height * 0.46, cv.width * 0.95, { look: { ...look, hat: null, _v: undefined }, dir: 'down' }, 1);
}
function row(look, title, note, right) {
  const r = h('div', 'row cl-row');
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 112;
  const ico = h('div', 'ico cl-ico'); ico.appendChild(cv); r.appendChild(ico);
  r.appendChild(h('div', 'info', `<b>${escapeHtml(title)}</b><small>${note}</small>`));
  if (right) r.appendChild(right);
  head(cv, look);
  return r;
}

function applyHair(patch) {
  const s = G.state;
  s.player.lookOpt = { ...(s.player.lookOpt || {}), ...patch };
  s.player.look = { ...(s.player.look || playerLook(s.player.lookOpt)), ...patch };
  delete s.player.look._v;
  s.stats.haircuts = (s.stats.haircuts || 0) + 1;
  markDirty(true);
}

// the little chair routine
async function haircut(patch, label) {
  const pl = G.player, sc = G.scene, st = sc?.merchant;
  const chair = sc?.props?.find(p => p.kind === 'salonChair');
  pl.control = false;
  try {
    if (chair) { await pl.walkTo([[chair.x, chair.y + 12]], { speed: 90 }); pl.face('up'); await sleep(100); pl.face('down'); pl.sit = true; pl.seatH = 11; pl.x = chair.x; pl.y = chair.y + 1.5; pl.squash = 0.8; sfx('pop'); }
    if (chair) camTo(chair.x + 10, chair.y - 26, { zoom: 1.9, rate: 3 });
    if (st && chair) { st._home = st._home || { x: st.x, y: st.y }; await st.walkTo([[chair.x + 26, chair.y + 6]], { speed: 90 }); st.face('left'); }
    // cape on, snip snip (little bits of hair fall), then POOF: new look
    const oldLook = pl.look; pl.look = { ...oldLook, cape: '#fffaf0' }; delete pl.look._v;
    st?.setAct('work', 'scissors');
    const hairCol = oldLook.hair || '#6e4430';
    for (let i = 0; i < 6; i++) {
      sfx('snip'); await sleep(160); sfx('snip');
      fx.burst('snip', pl.x + (Math.random() - 0.5) * 18, pl.y - 38, 4, { up: 10, g: 60, col: hairCol, size: 2, life: 1 });
      if (i === 2) { st?.face('up'); await sleep(200); st?.face('left'); }
      await sleep(260);
    }
    st?.setAct(null);
    sfx('whoosh');
    fx.burst('poof', pl.x, pl.y - 32, 9, { up: 20, g: 0, speed: 26, size: 9, life: 0.9, jitter: 14 });
    await sleep(260);
    applyHair(patch); refreshPlayerLook();
    sfx('buy'); fx.burst('spark', pl.x, pl.y - 34, 16, { up: 50, col: '#ffd35a' });
    pl.setEmo('happy', 2); pl.showEmote('sparkle', 1.6);
    st?.showEmote('heart', 1.4);
    await sleep(600);
    if (chair) { pl.sit = false; pl.seatH = undefined; pl.doHop?.(70); pl.y = chair.y + 14; }
    camFollow(pl, 1);
    toast({ text: T(`New look: ${label[0]}!`, `Kiểu mới: ${label[1]}!`), sub: T('Chị Tiên: "Gorgeous! Come back any time."', 'Chị Tiên: "Xinh quá trời! Ghé lại nha."'), icon: 'scissors' });
    if (st && st._home) { st.walkTo([[st._home.x, st._home.y]], { speed: 70 }).then(() => st.face('down')); }
  } finally { pl.control = true; if (pl.look?.cape) refreshPlayerLook(); camFollow(pl, 1); }
}

export function openSalon() {
  const who = MERCHANTS.chi_tien;
  openSheet({ title: T('Chị Tiên\'s Hair Salon', 'Salon Tóc Xinh'), sub: T('Pick a new haircut or colour', 'Chọn kiểu tóc hoặc màu tóc mới'), who, full: true, build: (body, api) => {
    const me = baseLook();
    tabs(body, [T('Women', 'Nữ'), T('Men', 'Nam'), T('Colour', 'Màu tóc')], (i, pane) => {
      const list = h('div', 'list'); pane.appendChild(list);
      if (i < 2) {
        const g = i === 0 ? 'f' : 'm';
        const ids = Object.keys(HAIRCUTS).filter(k => HAIRCUTS[k].g === g).sort((a, b) => HAIRCUTS[a].price - HAIRCUTS[b].price);
        for (const id of ids) {
          const it = HAIRCUTS[id], cur = me.hairStyle === id, price = Math.max(40, it.price);
          const b = cur ? btn(T('Current', 'Đang để'), () => {}, 'buy pink', true) : btn(money(price), () => {
            if (!canAfford(price)) { sfx('error'); toast({ text: T('Not enough money', 'Không đủ tiền'), bad: true }); return; }
            addMoney(-price, 'salon'); addXP(8, 'salon');
            api.close(); haircut({ hairStyle: id }, [it.en, it.vi]);
          }, 'buy');
          list.appendChild(row({ ...me, hairStyle: id }, T(it.en, it.vi), cur ? T('Your current cut ✓', 'Kiểu tóc hiện tại ✓') : money(price), b));
        }
      } else {
        HAIR_COLORS.forEach((col, k) => {
          const cur = me.hair === col, nm = COLOR_NAMES[k] || ['Colour', 'Màu'];
          const b = cur ? btn(T('Current', 'Đang dùng'), () => {}, 'buy pink', true) : btn(money(DYE_PRICE), () => {
            if (!canAfford(DYE_PRICE)) { sfx('error'); toast({ text: T('Not enough money', 'Không đủ tiền'), bad: true }); return; }
            addMoney(-DYE_PRICE, 'salon'); addXP(6, 'salon');
            api.close(); haircut({ hair: col }, nm);
          }, 'buy');
          list.appendChild(row({ ...me, hair: col }, T(nm[0], nm[1]), cur ? T('Your colour ✓', 'Màu hiện tại ✓') : money(DYE_PRICE), b));
        });
      }
    }, 0, api);
  } });
}
