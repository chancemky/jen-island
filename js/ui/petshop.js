// Cô Bông's pet shop: adopt a pet (it follows you, or lives at home with its own
// bed), buy pet food, and choose which pet comes on walks.

import { G, T, canAfford } from '../systems/state.js';
import { MERCHANTS } from '../data/looks.js';
import { openSheet, tabs, h, btn, showReward } from './sheets.js';
import { askText } from './naming.js';
import { sfx } from '../core/audio.js';
import { money, escapeHtml } from '../core/util.js';
import { toast } from './hud.js';
import { fx } from '../world/render.js';
import { PETS, PET_FOOD, myPets, followerUid, buyPet, setFollower, buyFood, drawPetPreview } from '../systems/pets.js';
import { ANIMAL_DRAW } from '../systems/animals.js';

export function openPetShop() {
  const who = MERCHANTS.co_bong;
  openSheet({ title: T('Cô Bông\'s Pet Shop', 'Tiệm Thú Cưng Bé Bông'), sub: T('Adopt a friend for life', 'Nhận nuôi một người bạn trọn đời'), who, full: true, build: (body, api) => {
    tabs(body, [T('Adopt', 'Nhận nuôi'), T('My pets', 'Thú cưng của tôi'), T('Food', 'Thức ăn')], (i, pane) => {
      const list = h('div', 'list'); pane.appendChild(list);
      if (i === 0) {
        for (const [id, def] of Object.entries(PETS)) {
          const r = h('div', 'row cl-row');
          const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96;
          const ico = h('div', 'ico cl-ico'); ico.appendChild(cv); r.appendChild(ico);
          r.appendChild(h('div', 'info', `<b>${escapeHtml(T(def.en, def.vi))}</b><small>${money(def.price)}</small>`));
          r.appendChild(btn(money(def.price), async () => {
            if (!canAfford(def.price)) { sfx('error'); toast({ text: T('Not enough money', 'Không đủ tiền'), bad: true }); return; }
            const name = await askText({ title: T('Name your new friend', 'Đặt tên cho bạn mới'), placeholder: T(def.en, def.vi), max: 14, value: '' });
            const p = await buyPet(id, name);
            if (!p) return;
            sfx('fanfare'); if (G.player) fx.burst('heart', G.player.x, G.player.y - 30, 10, { up: 50, col: '#f28fa3', size: 4 });
            await showReward({ icon: 'paw', kicker: T('New pet!', 'Thú cưng mới!'), title: p.name, text: followerUid() === p.uid ? T(`${p.name} will follow you everywhere. Other pets you adopt live at home with their own bed.`, `${p.name} sẽ theo bạn khắp nơi. Thú cưng khác sẽ ở nhà với giường riêng.`) : T(`${p.name} is waiting at home, on a brand new bed.`, `${p.name} đang chờ ở nhà, trên một chiếc giường mới tinh.`) });
            api.rebuild();
          }, 'buy'));
          list.appendChild(r);
          drawPreview(cv, id);
        }
      } else if (i === 1) {
        const pets = myPets();
        if (!pets.length) list.appendChild(h('div', 'empty-note', T('No pets yet. Adopt one!', 'Chưa có thú cưng. Nhận nuôi một bé nha!')));
        const f = followerUid();
        for (const p of pets) {
          const def = PETS[p.id], r = h('div', 'row cl-row');
          const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96;
          const ico = h('div', 'ico cl-ico'); ico.appendChild(cv); r.appendChild(ico);
          r.appendChild(h('div', 'info', `<b>${escapeHtml(p.name)}</b><small>${escapeHtml(T(def.en, def.vi))} · ${'❤'.repeat(Math.min(5, 1 + Math.floor((p.love || 0) / 4)))}</small>`));
          r.appendChild(p.uid === f ? btn(T('On walks', 'Đang dắt'), () => {}, 'buy pink', true) : btn(T('Take on walks', 'Dắt đi dạo'), () => { setFollower(p.uid); sfx('success'); api.rebuild(); }, 'buy alt'));
          list.appendChild(r);
          drawPreview(cv, p.id);
        }
        if (f) list.appendChild(btn(T('Leave everyone at home', 'Để tất cả ở nhà'), () => { setFollower(null); sfx('back'); api.rebuild(); }, 'btn ghost'));
      } else {
        list.appendChild(h('div', 'empty-note', T(`You have ${G.state.petFood || 0} portions of pet food. Feed your pets at home — they love you more every time.`, `Bạn có ${G.state.petFood || 0} phần thức ăn. Cho thú cưng ăn ở nhà — mỗi lần tụi nó thương bạn thêm.`)));
        for (const n of [1, 3]) list.appendChild(btn(T(`Buy ${PET_FOOD.n * n} portions · ${money(PET_FOOD.price * n)}`, `Mua ${PET_FOOD.n * n} phần · ${money(PET_FOOD.price * n)}`), () => { if (!buyFood(n)) { sfx('error'); toast({ text: T('Not enough money', 'Không đủ tiền'), bad: true }); return; } sfx('buy'); api.rebuild(); }, 'btn big gold'));
      }
    }, 0, api);
  } });
}
// preview drawing (dogs and cats use the island animals; bunny and duckling are simple)
function drawPreview(cv, id) {
  const c = cv.getContext('2d'), def = PETS[id], t = performance.now() / 1000;
  c.clearRect(0, 0, cv.width, cv.height); c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.translate(cv.width / 2, cv.height * 0.82); const k = cv.width / 30; c.scale(k, k);
  const st = { vx: 0, vy: 0, t, seed: 1, face: 1, state: 'idle', idle: 'wag', col: def.col, id: 'sit' };
  if (def.kind === 'dog') ANIMAL_DRAW.dog(c, t, st);
  else if (def.kind === 'cat') ANIMAL_DRAW.cat(c, t, st);
  else drawPetPreview(c, { data: { pet: { id } }, dir: 'right', moving: 0, name: '', x: 0, y: 0 }, t);
  c.restore();
}
