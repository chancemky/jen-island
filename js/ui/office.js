// "Business" tab: everything you run in one place — the books (today's profit and
// loss per business, spending by category, net worth, lifetime profit), rent or buy
// each property, hire a shopkeeper, and pay for a supply runner.

import { G, T, canAfford } from '../systems/state.js';
import { BUSINESSES, bizName } from '../data/game.js';
import { h, btn } from './sheets.js';
import { sfx } from '../core/audio.js';
import { money, escapeHtml } from '../core/util.js';
import { toast } from './hud.js';
import { fx } from '../world/render.js';
import { PLACES, usedPlaces, ownsProperty, propertyPrice, buyProperty, placeName, rentToday, keeperOf, keeperWage, candidate, hireKeeper, fireKeeper, keeperTrait, canHaveKeeper, keeperUnlocked, hasSupply, buySupply, toggleSupply, SUPPLY, supplyUnlocked, staffedCount, keeperSkill, SKILL_NAMES, wageFor, hireFee } from '../systems/economy.js';
import { daySheet, netWorth, lifetimeTotals, catName } from '../systems/ledger.js';
import { dailyWages } from '../systems/restaurant.js';

// ---------------------------------------------------------------- the books
function renderBooks(pane) {
  const s = G.state, sheet = daySheet(), life = lifetimeTotals(), nw = netWorth(propertyPrice);
  const card = h('div', 'office-card');
  card.appendChild(h('div', 'oc-title', `<b>${T('The books', 'Sổ sách')}</b><small>${T('Today so far', 'Hôm nay tới giờ')}</small>`));
  const pct = (a, b) => b ? `${a >= b ? '▲' : '▼'} ${Math.abs(Math.round((a - b) / Math.max(1, b) * 100))}%` : '';
  const y = s.history?.[s.history.length - 1];
  card.appendChild(h('div', 'oc-line', `${T('Money in', 'Tiền vào')}: <b>${money(sheet.totalIn)}</b> · ${T('Money out', 'Tiền ra')}: <b>${money(sheet.totalOut)}</b>${y?.net != null ? ` · <span style="opacity:.75">${T(`yesterday's net ${money(y.net)}`, `lãi hôm qua ${money(y.net)}`)}</span>` : ''}`));
  const cats = Object.entries(sheet.spending);
  if (cats.length) card.appendChild(h('div', 'oc-line dim', `${T('Spent on', 'Đã chi')}: ${cats.map(([c, v]) => `${escapeHtml(catName(c))} ${money(v)}`).join(' · ')}`));
  const rows = Object.entries(sheet.biz);
  if (rows.length) {
    const tbl = rows.map(([id, p]) => `<tr><td>${escapeHtml(id === 'house' ? placeName(id) : bizName(id))}</td><td>${money(p.sales)}</td><td>${money(p.tips)}</td><td>−${money(p.cogs)}</td><td>−${money(p.wages + p.delivery + p.rent)}</td><td><b style="color:${p.net >= 0 ? '#2f7f45' : '#c0473b'}">${money(p.net)}</b></td></tr>`).join('');
    card.appendChild(h('div', 'oc-line', `<table class="pnl"><tr><th></th><th>${T('Sales', 'Bán')}</th><th>${T('Tips', 'Boa')}</th><th>${T('Food', 'Hàng')}</th><th>${T('Staff/rent', 'Lương/thuê')}</th><th>${T('Net', 'Lãi')}</th></tr>${tbl}</table>`));
    card.appendChild(h('div', 'oc-line dim', T('Food = what the ingredients of today\'s sales cost. Rent and wages are paid at night.', 'Hàng = giá nguyên liệu của các món đã bán hôm nay. Tiền thuê và lương trả vào buổi tối.')));
  }
  if (y?.revenue != null) card.appendChild(h('div', 'oc-line dim', `${T('Revenue vs yesterday', 'Doanh thu so với hôm qua')}: ${money(Math.round(s.today.revenue))} / ${money(y.revenue)} ${pct(s.today.revenue, y.revenue)}`));
  pane.appendChild(card);
  const w = h('div', 'office-card');
  w.appendChild(h('div', 'oc-title', `<b>${T('Net worth', 'Tổng tài sản')} · ${money(nw.total)}</b><small>${T('Cash plus everything you own', 'Tiền mặt cộng mọi thứ bạn sở hữu')}</small>`));
  w.appendChild(h('div', 'oc-line dim', `${T('Cash', 'Tiền mặt')} ${money(nw.cash)} · ${T('Businesses', 'Quán')} ${money(nw.businesses)} · ${T('Property', 'Nhà đất')} ${money(nw.property)} · ${T('Stock', 'Hàng')} ${money(nw.stock)} · ${T('Home', 'Nhà')} ${money(nw.home)}`));
  w.appendChild(h('div', 'oc-line', `${T('Lifetime', 'Từ trước tới nay')}: ${T('sales', 'bán hàng')} <b>${money(life.sales)}</b> · ${T('tips', 'boa')} <b>${money(life.tips)}</b> · ${T('profit', 'lãi')} <b style="color:${life.profit >= 0 ? '#2f7f45' : '#c0473b'}">${money(life.profit)}</b>`));
  pane.appendChild(w);
}

export function renderOffice(pane, api) {
  const s = G.state, places = usedPlaces();
  const wages = Object.keys(s.keepers || {}).reduce((a, id) => a + keeperWage(id), 0) + (s.biz.restaurant?.owned ? dailyWages() : 0);
  const st = staffedCount();
  pane.appendChild(h('div', 'office-head', `<div><small>${T('Rent per day', 'Tiền thuê mỗi ngày')}</small><b>${money(rentToday())}</b></div><div><small>${T('Wages per day', 'Lương mỗi ngày')}</small><b>${money(wages)}</b></div><div><small>${T('Shops running themselves', 'Quán tự vận hành')}</small><b>${st.staffed}/${st.total}</b></div>`));
  if (s.day < 3) pane.appendChild(h('div', 'empty-note', T('Rent starts on day 3 — Mèo Mây talked the landlords into a welcome discount.', 'Tiền thuê bắt đầu từ ngày 3 — Mèo Mây đã xin chủ nhà giảm giá chào mừng.')));
  const list = h('div', 'list'); pane.appendChild(list);
  renderBooks(list);
  for (const id of places) {
    const card = h('div', 'office-card');
    const own = ownsProperty(id), price = propertyPrice(id);
    card.appendChild(h('div', 'oc-title', `<b>${escapeHtml(placeName(id))}</b><small>${own ? T('You own this property ✓', 'Bạn sở hữu bất động sản này ✓') : T(`Rent ${money(PLACES[id].rent)}/day · buying pays back in ${PLACES[id].payback} days`, `Thuê ${money(PLACES[id].rent)}/ngày · mua đứt hoàn vốn sau ${PLACES[id].payback} ngày`)}</small>`));
    if (!own && id !== 'house') card.appendChild(h('div', 'oc-line dim', T('Owning it: no rent, +5% customers (your own sign out front), 10% cheaper shop upgrades.', 'Sở hữu: không tiền thuê, +5% khách (biển hiệu của riêng bạn), nâng cấp quán rẻ hơn 10%.')));
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
        const sk = SKILL_NAMES[keeperSkill(k)];
        card.appendChild(h('div', 'oc-line', `👤 <b>${escapeHtml(k.name)}</b> · ${escapeHtml(T(...sk))} · ${escapeHtml(T(tr.en, tr.vi))} · ${T(`${money(keeperWage(id))}/day · served ${k.today || 0} today, ${k.served || 0} in all`, `${money(keeperWage(id))}/ngày · hôm nay bán ${k.today || 0}, tổng ${k.served || 0}`)}`));
        row.appendChild(btn(T('Let go', 'Cho nghỉ'), () => { fireKeeper(id); sfx('back'); api.rebuild(); }, 'buy alt'));
      } else if (keeperUnlocked()) {
        const c = candidate(id), tr = keeperTrait(c);
        const w = wageFor(id, keeperSkill(c)), fee = hireFee(id, c);
        card.appendChild(h('div', 'oc-line', `${T('Applicant', 'Ứng viên')}: <b>${escapeHtml(c.name)}</b> · ${escapeHtml(T(...SKILL_NAMES[keeperSkill(c)]))} · ${escapeHtml(T(tr.en, tr.vi))} · ${T(`${money(w)}/day`, `${money(w)}/ngày`)}`));
        row.appendChild(btn(T(`Hire shopkeeper · ${money(fee)}`, `Thuê người trông · ${money(fee)}`), () => {
          if (!hireKeeper(id)) { sfx('error'); toast({ text: T('Not enough money', 'Không đủ tiền'), bad: true }); return; }
          sfx('success'); toast({ text: T(`${c.name} will run ${bizName(id)}!`, `${c.name} sẽ trông ${bizName(id)}!`), sub: T('They open, prep and serve during opening hours. Keep the pantry stocked!', 'Họ sẽ mở cửa, sơ chế và bán trong giờ mở cửa. Nhớ giữ kho đủ hàng nha!'), icon: 'person' });
          api.rebuild();
        }, 'buy'));
      } else card.appendChild(h('div', 'oc-line dim', T('Shopkeepers can be hired from Chapter 5.', 'Có thể thuê người trông quán từ Chương 5.')));
      if (supplyUnlocked()) {
        if (hasSupply(id)) {
          const on = G.state.supply[id].on;
          card.appendChild(h('div', 'oc-line', `🚚 ${on ? T('Supply runner restocks every morning', 'Người giao hàng tiếp tế mỗi sáng') : T('Supply runner paused', 'Người giao hàng đang tạm nghỉ')}`));
          row.appendChild(btn(on ? T('Pause deliveries', 'Tạm ngưng giao') : T('Resume deliveries', 'Giao tiếp'), () => { toggleSupply(id); sfx('ui'); api.rebuild(); }, 'buy alt'));
        } else {
          const p = SUPPLY.price(id);
          card.appendChild(h('div', 'oc-line dim', T('A supply runner looks at what this shop has been selling (and what\'s already prepped) and brings about a day and a half of ingredients every morning — shop price + 15% delivery.', 'Người giao hàng xem quán bán gì gần đây (và đã sơ chế bao nhiêu) rồi mang đủ nguyên liệu cho khoảng một ngày rưỡi mỗi sáng — giá siêu thị + 15% phí giao.')));
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
