// "Business" tab: everything you run in one place — rent or buy each property,
// hire a shopkeeper, and pay for a supply runner that restocks every morning.

import { G, T, canAfford } from '../systems/state.js';
import { BUSINESSES, bizName } from '../data/game.js';
import { h, btn } from './sheets.js';
import { sfx } from '../core/audio.js';
import { money, escapeHtml } from '../core/util.js';
import { toast } from './hud.js';
import { fx } from '../world/render.js';
import { PLACES, usedPlaces, ownsProperty, propertyPrice, buyProperty, placeName, rentToday, keeperOf, keeperWage, candidate, hireKeeper, fireKeeper, keeperTrait, canHaveKeeper, keeperUnlocked, hasSupply, buySupply, toggleSupply, SUPPLY, supplyUnlocked, staffedCount } from '../systems/economy.js';

export function renderOffice(pane, api) {
  const s = G.state, places = usedPlaces();
  const wages = Object.keys(s.keepers || {}).reduce((a, id) => a + keeperWage(id), 0);
  const st = staffedCount();
  pane.appendChild(h('div', 'office-head', `<div><small>${T('Rent per day', 'Tiền thuê mỗi ngày')}</small><b>${money(rentToday())}</b></div><div><small>${T('Shopkeeper wages', 'Lương chủ quán')}</small><b>${money(wages)}</b></div><div><small>${T('Shops running themselves', 'Quán tự vận hành')}</small><b>${st.staffed}/${st.total}</b></div>`));
  if (s.day < 3) pane.appendChild(h('div', 'empty-note', T('Rent starts on day 3 — Mèo Mây talked the landlords into a welcome discount.', 'Tiền thuê bắt đầu từ ngày 3 — Mèo Mây đã xin chủ nhà giảm giá chào mừng.')));
  const list = h('div', 'list'); pane.appendChild(list);
  for (const id of places) {
    const card = h('div', 'office-card');
    const own = ownsProperty(id), price = propertyPrice(id);
    card.appendChild(h('div', 'oc-title', `<b>${escapeHtml(placeName(id))}</b><small>${own ? T('You own this property ✓', 'Bạn sở hữu bất động sản này ✓') : T(`Rent ${money(PLACES[id].rent)}/day`, `Thuê ${money(PLACES[id].rent)}/ngày`)}</small>`));
    const row = h('div', 'oc-row');
    if (!own) row.appendChild(btn(T(`Buy property · ${money(price)}`, `Mua đứt · ${money(price)}`), () => {
      if (!canAfford(price)) { sfx('error'); toast({ text: T('Not enough money', 'Không đủ tiền'), bad: true }); return; }
      buyProperty(id); sfx('fanfare'); if (G.player) fx.burst('confetti', G.player.x, G.player.y - 30, 24, { up: 70, col: ['#ffd35a', '#f08ca0', '#9fd8c8'] });
      toast({ text: T(`You now own ${placeName(id)}!`, `Bạn đã sở hữu ${placeName(id)}!`), sub: T('No more rent here, ever.', 'Không bao giờ phải trả tiền thuê ở đây nữa.'), icon: 'key' });
      api.rebuild();
    }, 'buy'));
    if (id !== 'house' && canHaveKeeper(id)) {
      const k = keeperOf(id);
      if (k) {
        const tr = keeperTrait(k);
        card.appendChild(h('div', 'oc-line', `👤 <b>${escapeHtml(k.name)}</b> · ${escapeHtml(T(tr.en, tr.vi))} · ${T(`${money(keeperWage(id))}/day · served ${k.served || 0}`, `${money(keeperWage(id))}/ngày · đã bán ${k.served || 0}`)}`));
        row.appendChild(btn(T('Let go', 'Cho nghỉ'), () => { fireKeeper(id); sfx('back'); api.rebuild(); }, 'buy alt'));
      } else if (keeperUnlocked()) {
        const c = candidate(id), tr = keeperTrait(c);
        card.appendChild(h('div', 'oc-line', `${T('Applicant', 'Ứng viên')}: <b>${escapeHtml(c.name)}</b> · ${escapeHtml(T(tr.en, tr.vi))} · ${T(`${money(keeperWage(id))}/day`, `${money(keeperWage(id))}/ngày`)}`));
        row.appendChild(btn(T(`Hire · ${money(keeperWage(id) * 2)}`, `Thuê · ${money(keeperWage(id) * 2)}`), () => {
          if (!hireKeeper(id)) { sfx('error'); toast({ text: T('Not enough money', 'Không đủ tiền'), bad: true }); return; }
          sfx('success'); toast({ text: T(`${c.name} will run ${bizName(id)}!`, `${c.name} sẽ trông ${bizName(id)}!`), sub: T('They open, prep and serve during opening hours. Keep the pantry stocked!', 'Họ sẽ mở cửa, sơ chế và bán trong giờ mở cửa. Nhớ giữ kho đủ hàng nha!'), icon: 'person' });
          api.rebuild();
        }, 'buy'));
      } else card.appendChild(h('div', 'oc-line dim', T('Shopkeepers can be hired from Chapter 5.', 'Có thể thuê chủ quán từ Chương 5.')));
      if (supplyUnlocked()) {
        if (hasSupply(id)) {
          const on = G.state.supply[id].on;
          card.appendChild(h('div', 'oc-line', `🚚 ${on ? T('Supply runner restocks every morning', 'Người giao hàng tiếp tế mỗi sáng') : T('Supply runner paused', 'Người giao hàng đang tạm nghỉ')}`));
          row.appendChild(btn(on ? T('Pause deliveries', 'Tạm ngưng giao') : T('Resume deliveries', 'Giao tiếp'), () => { toggleSupply(id); sfx('ui'); api.rebuild(); }, 'buy alt'));
        } else {
          const p = SUPPLY.price(id);
          card.appendChild(h('div', 'oc-line dim', T('A supply runner buys this shop\'s ingredients for you every morning (shop price + 15% delivery).', 'Người giao hàng mua nguyên liệu cho quán mỗi sáng (giá siêu thị + 15% phí giao).')));
          row.appendChild(btn(T(`Supply runner · ${money(p)}`, `Người giao hàng · ${money(p)}`), () => {
            if (!buySupply(id)) { sfx('error'); toast({ text: T('Not enough money', 'Không đủ tiền'), bad: true }); return; }
            sfx('success'); toast({ text: T('Deliveries start now!', 'Bắt đầu giao hàng!'), sub: T('The pantry is topped up every morning at 6:00.', 'Kho được bổ sung mỗi sáng lúc 6:00.'), icon: 'bag' }); api.rebuild();
          }, 'buy'));
        }
      }
    }
    card.appendChild(row);
    list.appendChild(card);
  }
  const notYet = Object.keys(BUSINESSES).filter(id => !places.includes(id) && G.state.story.chapter >= (BUSINESSES[id].chapter || 1));
  if (notYet.length) list.appendChild(h('div', 'empty-note', T(`More places you could run: ${notYet.map(bizName).join(', ')}`, `Những nơi bạn có thể mở thêm: ${notYet.map(bizName).join(', ')}`)));
}
