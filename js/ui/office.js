// "Business" tab: everything you run in one place — the books (today's profit and
// loss per business, spending by category, net worth, lifetime profit), rent or buy
// each property, hire a shopkeeper, and pay for a supply runner.

import { G, T, canAfford, bizOf, addMoney, addPantry } from '../systems/state.js';
import { INGREDIENTS } from '../data/game.js';
import { iconURL } from '../gfx/food.js';
import { bus } from '../core/util.js';
import { shoppingNeeds } from './shops.js';
import { BUSINESSES, NIGHT_MARKET_RESTORE, ROLES, bizName } from '../data/game.js';
import { h, btn } from './sheets.js';
import { sfx } from '../core/audio.js';
import { money, escapeHtml } from '../core/util.js';
import { toast, moneyShortfall, setWaypoint } from './hud.js';
import { openShopFront, canDecorateFront } from './storefront.js';
import { scoreFront, frontAttract } from '../systems/storefront.js';
import { fx } from '../world/render.js';
import { PLACES, usedPlaces, ownsProperty, propertyPrice, buyProperty, placeName, rentToday, keeperOf, keeperWage, candidate, hireKeeper, fireKeeper, keeperTrait, canHaveKeeper, keeperUnlocked, hasSupply, buySupply, toggleSupply, SUPPLY, supplyUnlocked, staffedCount, keeperSkill, SKILL_NAMES, wageFor, hireFee, recentShopNet, canTrain, trainCost, trainKeeper, promoteCost, promoteKeeper } from '../systems/economy.js';
import { daySheet, netWorth, lifetimeTotals, catName } from '../systems/ledger.js';
import { dailyWages } from '../systems/restaurant.js';
import { openStaffBoard } from './staff.js';

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

// The restaurant is yours once you have its key: say so plainly — repair, open/closed, the team
// and what they cost — with Hire / Let go on the Staff Board. (Buying the property only ends the rent.)
function restaurantStatus(card, row, api) {
  const z = bizOf('restaurant'), team = z.employees || [];
  const repaired = z.repair >= 1;
  card.appendChild(h('div', 'oc-line', `🍽 <b>${T('Your restaurant', 'Nhà hàng của bạn')}</b> · ${repaired ? T('repaired ✓', 'đã sửa ✓') : T(`repair ${Math.round((z.repair || 0) * 100)}% — finish it to open`, `sửa được ${Math.round((z.repair || 0) * 100)}% — sửa xong mới mở được`)}${repaired ? ` · ${z.open ? T('open now', 'đang mở cửa') : T('closed', 'đang đóng cửa')}` : ''}`));
  const roles = team.map(e => `${escapeHtml(e.name)} (${escapeHtml(T(ROLES[e.role]?.en || e.role, ROLES[e.role]?.vi || e.role))})`).join(', ');
  card.appendChild(h('div', 'oc-line' + (team.length ? '' : ' dim'), team.length
    ? `👥 ${T(`Staff ${team.length}`, `Nhân viên ${team.length}`)}: ${roles} · ${T(`wages ${money(dailyWages())}/day`, `lương ${money(dailyWages())}/ngày`)}${repaired ? '' : ` <span style="opacity:.75">${T('(paid once it\'s repaired)', '(trả lương khi đã sửa xong)')}</span>`}`
    : T('No staff yet — hire a cook and a server so it runs on its own.', 'Chưa có nhân viên — thuê một đầu bếp và một phục vụ để nhà hàng tự vận hành.')));
  if (repaired) row.appendChild(btn(T('Hire / Let go', 'Thuê / Cho nghỉ'), () => { api.close(true); openStaffBoard(); }, 'buy alt'));
}

export function renderOffice(pane, api) {
  const s = G.state, places = usedPlaces();
  const wages = Object.keys(s.keepers || {}).reduce((a, id) => a + keeperWage(id), 0) + (s.biz.restaurant?.owned ? dailyWages() : 0);
  const st = staffedCount();
  pane.appendChild(h('div', 'office-head', `<div><small>${T('Rent per day', 'Tiền thuê mỗi ngày')}</small><b>${money(rentToday())}</b></div><div><small>${T('Wages per day', 'Lương mỗi ngày')}</small><b>${money(wages)}</b></div><div><small>${T('Shops running themselves', 'Quán tự vận hành')}</small><b>${st.staffed}/${st.total}</b></div>`));
  pane.appendChild(h('div', 'oc-line dim', T('Island level unlocks features; each shop has its own upgrade level.', 'Cấp đảo mở khóa tính năng; mỗi quán có cấp nâng cấp riêng.')));
  if (s.day < 3) pane.appendChild(h('div', 'empty-note', T('Rent starts on day 3 — Mèo Mây talked the landlords into a welcome discount.', 'Tiền thuê bắt đầu từ ngày 3 — Mèo Mây đã xin chủ nhà giảm giá chào mừng.')));
  const list = h('div', 'list'); pane.appendChild(list);
  // one tap: phone Cô Hoa and have everything your shops need delivered (+10% for the delivery)
  { const needs = shoppingNeeds();
    if (needs.length) {
      const total = Math.round(needs.reduce((a, [k, n]) => a + INGREDIENTS[k].price * n, 0) * 1.1);
      const r = h('div', 'row restock-row', `<div class="ico">🛵</div><div class="info"><b>${T('Restock all shops', 'Nhập hàng cho tất cả quán')}</b><small>${T('About 1½ days of what you sell, delivered now (+10% delivery)', 'Khoảng 1,5 ngày bán hàng, giao ngay (+10% phí giao)')}</small><div class="mini-chips">${needs.slice(0, 14).map(([k, n]) => `<span class="mini-chip"><img src="${iconURL(k, 22)}" alt="">×${INGREDIENTS[k].pack * n}</span>`).join('')}</div></div>`);
      r.appendChild(btn(money(total), () => {
        if (!canAfford(total)) return moneyShortfall(total);
        addMoney(-total, 'ingredients'); for (const [k, n] of needs) addPantry(k, INGREDIENTS[k].pack * n);
        sfx('buy'); toast({ text: T('Cô Hoa\'s scooter is on the way!', 'Xe của Cô Hoa đang tới!'), sub: T('Everything is in your pantry.', 'Mọi thứ đã vào kho.'), icon: 'bag', now: true }); bus.emit('bought', 'ingredients'); api.rebuild();
      }, 'buy alt'));
      list.appendChild(r);
    } }
  renderBooks(list);
  const nightMarketRestored = !!s.nightMarket?.restored;
  if (s.story.chapter >= 8 || nightMarketRestored) {
    const card = h('div', 'office-card');
    card.appendChild(h('div', 'oc-title', `<b>${nightMarketRestored ? T('Night Market: restored', 'Chợ Đêm: đã khôi phục') : T('Night Market: not restored yet', 'Chợ Đêm: chưa khôi phục')}</b>${nightMarketRestored ? '' : `<small>${T('Restore cost', 'Chi phí khôi phục')}: ${money(NIGHT_MARKET_RESTORE.cost)}</small>`}`));
    if (!nightMarketRestored) card.appendChild(h('div', 'oc-line dim', T('Finish the story goal with Mèo Mây.', 'Hoàn thành mục tiêu cốt truyện với Mèo Mây.')));
    list.appendChild(card);
  }
  for (const id of places) {
    const card = h('div', 'office-card');
    const own = ownsProperty(id), price = propertyPrice(id);
    card.appendChild(h('div', 'oc-title', `<b>${escapeHtml(placeName(id))}</b><small>${own ? T('You own this property ✓', 'Bạn sở hữu bất động sản này ✓') : T(`Rent ${money(PLACES[id].rent)}/day · buying pays back in ${PLACES[id].payback} days`, `Thuê ${money(PLACES[id].rent)}/ngày · mua đứt hoàn vốn sau ${PLACES[id].payback} ngày`)}</small>`));
    const row = h('div', 'oc-row');
    if (id === 'restaurant') restaurantStatus(card, row, api);
    if (!own && id !== 'house') card.appendChild(h('div', 'oc-line dim', T('It\'s already yours to run — buying the property is the deed that ends the rent: no rent, +5% customers (your own sign out front), 10% cheaper shop upgrades.', 'Quán đã là của bạn — mua đứt là mua giấy tờ nhà đất để hết phải trả tiền thuê: không tiền thuê, +5% khách (biển hiệu của riêng bạn), nâng cấp quán rẻ hơn 10%.')));
    const affordable = canAfford(price);
    if (!own && !affordable) card.appendChild(h('div', 'oc-line dim', T(`You have ${money(s.money)} · short ${money(price - s.money)}`, `Bạn có ${money(s.money)} · thiếu ${money(price - s.money)}`)));
    if (!own) row.appendChild(btn(T(`Buy property · ${money(price)}`, `Mua đứt · ${money(price)}`), () => {
      if (!canAfford(price)) return moneyShortfall(price);
      buyProperty(id); sfx('fanfare'); if (G.player) fx.burst('confetti', G.player.x, G.player.y - 30, 24, { up: 70, col: ['#ffd35a', '#f08ca0', '#9fd8c8'] });
      toast({ text: T(`You now own ${placeName(id)}!`, `Bạn đã sở hữu ${placeName(id)}!`), sub: T('No more rent here, ever.', 'Không bao giờ phải trả tiền thuê ở đây nữa.'), icon: 'key' });
      api.rebuild();
    }, 'buy', !affordable));
    if (canDecorateFront(id)) { const sc = scoreFront(id), n = (G.state.biz[id].decor || []).length; row.appendChild(btn(T(`Shop front${n ? ` · ${n}` : ''}`, `Mặt tiền${n ? ` · ${n}` : ''}`), () => { api.close(true); openShopFront(id); }, 'buy alt')); if (n) card.appendChild(h('div', 'oc-line dim', T(`Shop front draws +${Math.round((frontAttract(id) - 1) * 100)}% customers`, `Mặt tiền thu hút thêm ${Math.round((frontAttract(id) - 1) * 100)}% khách`))); void sc; }
    if (id !== 'house' && canHaveKeeper(id)) {
      const k = keeperOf(id);
      if (k) {
        const tr = keeperTrait(k);
        const sk = SKILL_NAMES[keeperSkill(k)];
        card.appendChild(h('div', 'oc-line', `👤 <b>${escapeHtml(k.name)}</b> · ${escapeHtml(T(...sk))} · ${escapeHtml(T(tr.en, tr.vi))} · ${T(`${money(keeperWage(id))}/day · served ${k.today || 0} today, ${k.served || 0} in all`, `${money(keeperWage(id))}/ngày · hôm nay bán ${k.today || 0}, tổng ${k.served || 0}`)}`));
        if (canTrain(id)) row.appendChild(btn(T(`Train · ${money(trainCost(id))}`, `Đào tạo · ${money(trainCost(id))}`), () => { if (!trainKeeper(id)) return moneyShortfall(trainCost(id)); sfx('success'); toast({ text: T(`${k.name} is now ${SKILL_NAMES[keeperSkill(k)][0].toLowerCase()}!`, `${k.name} giờ đã ${SKILL_NAMES[keeperSkill(k)][1].toLowerCase()}!`), icon: 'star' }); api.rebuild(); }, 'buy'));
        else if (keeperSkill(k) >= 3 && !k.head) row.appendChild(btn(T(`Promote · ${money(promoteCost(id))}`, `Thăng chức · ${money(promoteCost(id))}`), () => { if (!promoteKeeper(id)) return moneyShortfall(promoteCost(id)); sfx('fanfare'); toast({ text: T(`${k.name} is your head keeper now!`, `${k.name} giờ là trưởng quán!`), icon: 'star' }); api.rebuild(); }, 'buy'));
        row.appendChild(btn(T('Let go', 'Cho nghỉ'), () => { fireKeeper(id); sfx('back'); api.rebuild(); }, 'buy alt'));
      } else if (keeperUnlocked()) {
        const c = candidate(id), tr = keeperTrait(c);
        const w = wageFor(id, keeperSkill(c)), fee = hireFee(id, c);
        card.appendChild(h('div', 'oc-line', `${T('Applicant', 'Ứng viên')}: <b>${escapeHtml(c.name)}</b> · ${escapeHtml(T(...SKILL_NAMES[keeperSkill(c)]))} · ${escapeHtml(T(tr.en, tr.vi))} · ${T(`${money(w)}/day`, `${money(w)}/ngày`)}`));
        // wage vs what the shop actually makes, so hiring is never a blind loss
        const net = recentShopNet(id);
        if (net == null) card.appendChild(h('div', 'oc-line dim', T('No books for this shop yet — run it yourself for a day or two to see what it makes before hiring.', 'Quán này chưa có sổ sách — tự bán một hai ngày để xem quán lời bao nhiêu rồi hẵng thuê.')));
        else card.appendChild(h('div', 'oc-line' + (net < w * 1.5 ? '' : ' dim'), `${T(`Lately this shop clears about ${money(net)}/day; the wage would be ${money(w)}/day.`, `Gần đây quán lời khoảng ${money(net)}/ngày; lương sẽ là ${money(w)}/ngày.`)}${net < w * 1.5 ? ` <span style="color:#c0473b">${T('That\'s thin — a shopkeeper would eat most of it. Upgrade recipes, raise prices or wait until it\'s busier.', 'Hơi mỏng — lương sẽ ăn gần hết tiền lời. Hãy nâng cấp công thức, tăng giá hoặc đợi quán đông hơn.')}</span>` : ''}`));
        row.appendChild(btn(T(`Hire shopkeeper · ${money(fee)}`, `Thuê người trông · ${money(fee)}`), () => {
          if (!hireKeeper(id)) return moneyShortfall(fee);
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
          const feePct = Math.round((SUPPLY.fee - 1) * 100);
          card.appendChild(h('div', 'oc-line dim', T(`A supply runner looks at what this shop has been selling (and what's already prepped) and brings about a day and a half of ingredients every morning — shop price + ${feePct}% delivery.`, `Người giao hàng xem quán bán gì gần đây (và đã sơ chế bao nhiêu) rồi mang đủ nguyên liệu cho khoảng một ngày rưỡi mỗi sáng — giá siêu thị + ${feePct}% phí giao.`)));
          row.appendChild(btn(T(`Supply runner · ${money(p)}`, `Người giao hàng · ${money(p)}`), () => {
            if (!buySupply(id)) return moneyShortfall(p);
            sfx('success'); toast({ text: T('Deliveries start now!', 'Bắt đầu giao hàng!'), sub: T('The pantry is topped up every morning at 6:00.', 'Kho được bổ sung mỗi sáng lúc 6:00.'), icon: 'bag' }); api.rebuild();
          }, 'buy'));
        }
      }
    }
    card.appendChild(row);
    list.appendChild(card);
  }
  if (bizOf('restaurant').owned && !places.includes('restaurant')) {
    const card = h('div', 'office-card'), row = h('div', 'oc-row');
    card.appendChild(h('div', 'oc-title', `<b>${escapeHtml(bizName('restaurant'))}</b><small>${T('You have the key ✓', 'Bạn đã có chìa khóa ✓')}</small>`));
    restaurantStatus(card, row, api);
    if (row.children.length) card.appendChild(row);
    list.appendChild(card);
  }
  const notYet = Object.keys(BUSINESSES).filter(id => !places.includes(id) && !bizOf(id).owned && G.state.story.chapter >= (BUSINESSES[id].chapter || 1));
  if (notYet.length) {
    const more = h('div', 'office-card');
    more.appendChild(h('div', 'oc-title', `<b>${T('More places you could run', 'Những nơi bạn có thể mở thêm')}</b><small>${T('Tap one to mark it with the gold arrow.', 'Chạm để đánh dấu bằng mũi tên vàng.')}</small>`));
    const row = h('div', 'oc-row');
    for (const id of notYet) {
      const spot = G.scenes?.island?.buildings?.[id];
      if (!spot) continue;
      row.appendChild(btn(escapeHtml(bizName(id)), () => { api.close(true); setWaypoint({ scene: 'island', x: spot.x, y: spot.y }, bizName(id)); }, 'buy alt'));
    }
    if (row.children.length) { more.appendChild(row); list.appendChild(more); }
  }
}
