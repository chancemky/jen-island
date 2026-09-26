// Shop lists and inventory screens.

import { G, T, addMoney, canAfford, addPantry, addMat, mats, pantry, hasMats, markDirty, repStars } from '../systems/state.js';
import { INGREDIENTS, AISLES, MATERIALS, FURNITURE, RECIPES, STATION, PREPPED, BUSINESSES, RECIPE_UPGRADES, ACHIEVEMENTS, CHAPTERS, PREP_VERB, ingName, matName, recipeName, bizName, furnName } from '../data/game.js';
import { MERCHANTS } from '../data/looks.js';
import { openSheet, tabs, rowEl, btn, h, flyIcon, showReward } from './sheets.js';
import { sfx } from '../core/audio.js';
import { money, escapeHtml, bus } from '../core/util.js';
import { iconURL } from '../gfx/food.js';
import { drawFurniturePreview } from '../gfx/furniture.js';
import { bizRecipes, ingredientsForBiz, canMake, recipePrice, priceMul, priceAppeal } from '../systems/business.js';
import { level } from '../systems/progress.js';
import { activeQuests } from '../systems/sidequests.js';
import { EQUIPMENT, SHOP_LEVEL_REQ, PRICE_RANGE } from '../data/game.js';
import { toast } from './hud.js';

const bagBtn = () => document.getElementById('bagBtn');
const noMoney = () => { sfx('error'); toast({ text: T('Not enough money', 'Không đủ tiền'), bad: true }); };
const merchantSay = () => { const a = G.scene?.merchant; if (a) { a.showEmote('happy', 1.2); a.setEmo('happy', 1.5); a.doHop(60); } };

function qtyStepper(max = 9, start = 1, onChange) {
  const q = h('div', 'qty'); let v = start;
  const minus = h('button', '', '−'), val = h('span', '', String(v)), plus = h('button', '', '+');
  minus.type = plus.type = 'button';
  const set = n => { v = Math.max(1, Math.min(max, n)); val.textContent = v; onChange?.(v); };
  minus.onclick = e => { e.stopPropagation(); sfx('ui'); set(v - 1); };
  plus.onclick = e => { e.stopPropagation(); sfx('ui'); set(v + 1); };
  q.append(minus, val, plus);
  return { el: q, get: () => v, set };
}
const col = () => { const r = h('div'); r.style.display = 'flex'; r.style.flexDirection = 'column'; r.style.gap = '6px'; r.style.alignItems = 'flex-end'; return r; };
const highlightRow = () => { const r = h('div', 'row'); r.style.background = '#fff7e0'; r.style.borderColor = '#f2c14e'; return r; };

// Which ingredients the island's shops stock right now.
export function stockedIngredients() {
  const set = new Set();
  for (const id of Object.keys(BUSINESSES)) if (G.state.biz[id].owned || G.state.biz[id].unlocked) for (const k of ingredientsForBiz(id)) set.add(k);
  if (!set.size) ['tea', 'kumquat', 'sugar', 'ice'].forEach(k => set.add(k));
  return [...set];
}

// ---------------------------------------------------------------- supermarket
export function openIngredientShop() {
  openSheet({ title: T('Binh Minh Supermarket', 'Siêu thị Bình Minh'), sub: T('Fresh ingredients', 'Nguyên liệu tươi'), who: MERCHANTS.co_hoa, build: (body, api) => {
    // aisle chips
    const stocked = stockedIngredients();
    const aisles = AISLES.filter(a => a.id === 'all' || a.items.some(k => stocked.includes(k)));
    if (!aisles.some(a => a.id === api.aisle)) api.aisle = 'all';
    const bar = h('div', 'aisles');
    for (const a of aisles) {
      const n = a.id === 'all' ? stocked.length : a.items.filter(k => stocked.includes(k)).length;
      const b = h('button', 'aisle' + (api.aisle === a.id ? ' on' : ''), `<img src="${iconURL(a.icon, 28)}" alt=""><span>${escapeHtml(T(a.en, a.vi))}</span><i>${n}</i>`);
      b.type = 'button'; b.onclick = () => { sfx('ui'); api.aisle = a.id; api.rebuild(); const l = api.body.querySelector('.list'); if (l) l.scrollTop = 0; };
      bar.appendChild(b);
    }
    body.appendChild(bar);
    const list = h('div', 'list scroll'); list.style.flex = '1';
    body.appendChild(list);
    const needs = api.aisle === 'all' ? shoppingNeeds() : [];
    if (needs.length) {
      const total = needs.reduce((s, [k, n]) => s + INGREDIENTS[k].price * n, 0);
      const r = highlightRow();
      r.innerHTML = `<div class="ico"><img src="${iconURL('bag', 44)}" alt=""></div><div class="info"><b>${T('Stock up for your menu', 'Mua đủ cho thực đơn')}</b><small>${needs.map(([k, n]) => `${escapeHtml(ingName(k))} ×${n}`).join(', ')}</small></div>`;
      r.appendChild(btn(money(total), (b) => {
        if (!canAfford(total)) return noMoney();
        addMoney(-total, 'buy');
        for (const [k, n] of needs) addPantry(k, INGREDIENTS[k].pack * n);
        sfx('buy'); flyIcon(needs[0][0], b, bagBtn()); merchantSay();
        bus.emit('bought', 'ingredients'); api.rebuild();
      }, 'buy alt'));
      list.appendChild(r);
    }
    const aisle = AISLES.find(a => a.id === api.aisle);
    for (const id of stocked) {
      if (aisle.items && !aisle.items.includes(id)) continue;
      const g = INGREDIENTS[id];
      const q = qtyStepper(9, 1, v => b.innerHTML = money(g.price * v));
      const right = col();
      const b = btn(money(g.price), () => {
        const n = q.get(), cost = g.price * n;
        if (!canAfford(cost)) return noMoney();
        addMoney(-cost, 'buy'); addPantry(id, g.pack * n);
        sfx('buy'); flyIcon(id, b, bagBtn()); merchantSay();
        bus.emit('bought', 'ingredients', id);
        api.rebuild();
      });
      right.append(q.el, b);
      // portions you own: raw in the bag plus anything already sliced/cooked in your shops (1 raw = 1 portion)
      const prepped = g.prep ? Object.values(G.state.biz).reduce((n, b) => n + (b.prepped?.[g.prep.to] || 0), 0) : 0, have = pantry(id) + prepped;
      list.appendChild(rowEl({ icon: id, title: escapeHtml(ingName(id)), sub: T(`${g.pack} portions per pack`, `${g.pack} phần / gói`), have: T(`Have: ${have}`, `Có: ${have}`), right }));
    }
  } });
}
// Missing packs to make ~8 of each known recipe.
export function shoppingNeeds() {
  const want = {};
  for (const bid of Object.keys(BUSINESSES)) {
    const b = G.state.biz[bid];
    if (!b.owned || (BUSINESSES[bid].repair && b.repair < 1)) continue;
    for (const k of ingredientsForBiz(bid)) {
      if (['tapioca', 'jelly', 'cheese_foam', 'chili'].includes(k) && !G.state.recipes.some(r => RECIPES[r].options.includes(k === 'chili' ? 'chili' : 'topping'))) continue;
      want[k] = Math.max(want[k] || 0, 8);
    }
  }
  const out = [];
  for (const [k, n] of Object.entries(want)) {
    const prepped = PREPPED[INGREDIENTS[k]?.prep?.to] ? Object.values(G.state.biz).reduce((s, b) => s + (b.prepped[INGREDIENTS[k].prep.to] || 0), 0) : 0;
    const have = pantry(k) + prepped;
    if (have < n) out.push([k, Math.ceil((n - have) / INGREDIENTS[k].pack)]);
  }
  return out;
}

// ---------------------------------------------------------------- materials
export function openMaterialShop() {
  openSheet({ title: T('Ben Vung Materials', 'VLXD Bền Vững'), sub: T('Wood, metal sheets and paint', 'Gỗ, tôn, sơn'), who: MERCHANTS.chu_bay, build: (body, api) => {
    const list = h('div', 'list scroll'); list.style.flex = '1'; body.appendChild(list);
    const need = G.runtime.materialNeed?.();
    if (need) {
      const missing = Object.entries(need.mats).filter(([k, n]) => mats(k) < n).map(([k, n]) => [k, n - mats(k)]);
      if (missing.length) {
        const total = missing.reduce((s, [k, n]) => s + MATERIALS[k].price * n, 0);
        const r = highlightRow();
        r.innerHTML = `<div class="ico"><img src="${iconURL('wood', 44)}" alt=""></div><div class="info"><b>${escapeHtml(T(`Everything for: ${need.label}`, `Đủ cho: ${need.label}`))}</b><small>${missing.map(([k, n]) => `${escapeHtml(matName(k))} ×${n}`).join(', ')}</small></div>`;
        r.appendChild(btn(money(total), b => {
          if (!canAfford(total)) return noMoney();
          addMoney(-total, 'buy'); for (const [k, n] of missing) addMat(k, n);
          sfx('buy'); flyIcon(missing[0][0], b, bagBtn()); merchantSay(); bus.emit('bought', 'materials'); api.rebuild();
        }, 'buy alt'));
        list.appendChild(r);
      }
    }
    for (const [id, m] of Object.entries(MATERIALS)) {
      if (m.unlock && G.state.story.chapter < m.unlock) continue;
      const q = qtyStepper(20, 1, v => b.innerHTML = money(m.price * v));
      const right = col();
      const b = btn(money(m.price), () => {
        const n = q.get(), cost = m.price * n;
        if (!canAfford(cost)) return noMoney();
        addMoney(-cost, 'buy'); addMat(id, n); sfx('buy'); flyIcon(id, b, bagBtn()); merchantSay(); bus.emit('bought', 'materials', id); api.rebuild();
      });
      right.append(q.el, b);
      list.appendChild(rowEl({ icon: id, title: escapeHtml(matName(id)), sub: T('For repairs and upgrades', 'Dùng để sửa và nâng cấp'), have: T(`Have: ${mats(id)}`, `Có: ${mats(id)}`), right }));
    }
  } });
}

// ---------------------------------------------------------------- furniture
export function openFurnitureShop() {
  openSheet({ title: T('Anh Khoa\'s Furniture', 'Nhà đẹp Anh Khoa'), sub: T('Make your house a home', 'Đồ đạc cho ngôi nhà'), who: MERCHANTS.anh_khoa, build: (body, api) => {
    const list = h('div', 'list scroll'); list.style.flex = '1'; body.appendChild(list);
    const s = G.state;
    for (const [id, f] of Object.entries(FURNITURE)) {
      if (f.unlock && s.story.chapter < f.unlock) continue;
      const owned = s.home.owned.filter(x => x === id).length + s.home.furniture.filter(x => x.id === id).length;
      const r = h('div', 'row');
      const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; cv.style.width = cv.style.height = '48px';
      const ico = h('div', 'ico'); ico.appendChild(cv); drawFurniturePreview(cv, id, f);
      const kind = f.light ? T('Glows warmly at night', 'Tỏa sáng ấm áp') : f.wall ? T('Hangs on the wall', 'Treo tường') : T('Place it in your home', 'Đặt trong nhà');
      const info = h('div', 'info', `<b>${escapeHtml(furnName(id))}</b><small>${kind}</small>${owned ? `<span class="have">${T('Owned', 'Đã có')}: ${owned}</span>` : ''}`);
      r.append(ico, info, btn(money(f.price), () => {
        if (!canAfford(f.price)) return noMoney();
        addMoney(-f.price, 'buy'); s.home.owned.push(id); markDirty(true); sfx('buy'); merchantSay();
        toast({ text: T(`${furnName(id)} delivered to your home`, `${furnName(id)} đã được gửi về nhà`), sub: T('Tap Decorate inside your house.', 'Bấm Trang trí trong nhà nhé.') });
        bus.emit('bought', 'furniture', id); api.rebuild();
      }));
      list.appendChild(r);
    }
  } });
}

// ---------------------------------------------------------------- bag
export function openBag() {
  const s = G.state;
  openSheet({ title: T('Bag', 'Túi đồ'), full: true, build: (body, api) => {
    tabs(body, [T('Ingredients', 'Nguyên liệu'), T('Materials', 'Vật liệu'), T('Recipes', 'Công thức'), T('Regulars', 'Khách quen'), T('Achievements', 'Thành tựu')], (i, pane) => {
      const list = h('div', 'list'); pane.appendChild(list);
      if (i === 0) {
        const ids = Object.keys(INGREDIENTS).filter(k => pantry(k) > 0);
        if (!ids.length) list.appendChild(h('div', 'empty-note', T('No ingredients yet. Visit the supermarket on Market Street.', 'Chưa có nguyên liệu. Ghé siêu thị ở Phố Chợ nhé.')));
        for (const k of ids) list.appendChild(rowEl({ icon: k, title: escapeHtml(ingName(k)), have: T(`${pantry(k)} portions`, `${pantry(k)} phần`) }));
        const prepped = [];
        for (const [bid, b] of Object.entries(s.biz)) for (const [k, n] of Object.entries(b.prepped || {})) if (n > 0) prepped.push([bid, k, n]);
        if (prepped.length) { list.appendChild(h('div', 'section-title', T('Prepped at your shops', 'Đã sơ chế ở các quán'))); for (const [bid, k, n] of prepped) list.appendChild(rowEl({ icon: k, title: escapeHtml(ingName(k)), sub: escapeHtml(bizName(bid)), have: T(`${n} portions`, `${n} phần`) })); }
      } else if (i === 1) {
        const ids = Object.keys(MATERIALS).filter(k => mats(k) > 0);
        if (!ids.length) list.appendChild(h('div', 'empty-note', T('No materials yet. Chú Bảy sells wood, metal and paint.', 'Chưa có vật liệu. Chú Bảy bán gỗ, tôn và sơn.')));
        for (const k of ids) list.appendChild(rowEl({ icon: k, title: escapeHtml(matName(k)), have: `×${mats(k)}` }));
      } else if (i === 2) {
        for (const [id, r] of Object.entries(RECIPES)) {
          const known = s.recipes.includes(id), lv = s.recipeLevels[id] || 1;
          const shop = bizName(Object.keys(BUSINESSES).find(b => BUSINESSES[b].biz === r.biz));
          list.appendChild(rowEl({ icon: known ? r.icon : 'rice_paper', title: known ? `${escapeHtml(recipeName(id))} <span class="pill lv">Lv ${lv}</span>` : '???', sub: known ? `${r.price}k · ${escapeHtml(shop)}` : T('Not discovered yet', 'Chưa khám phá'), dim: !known }));
        }
      } else if (i === 3) {
        const regs = Object.entries(s.regulars).sort((a, b) => b[1].visits - a[1].visits);
        if (!regs.length) list.appendChild(h('div', 'empty-note', T('Serve the same people a few times and they\'ll become regulars.', 'Phục vụ một người vài lần là họ thành khách quen.')));
        for (const [, r] of regs) list.appendChild(rowEl({ icon: RECIPES[r.fav]?.icon || 'heart', title: escapeHtml(r.name) + (r.visits >= 3 ? ` <span class="pill new">${T('Regular', 'Khách quen')}</span>` : ''), sub: T(`Visited ${r.visits} times · Favourite: ${r.fav ? recipeName(r.fav) : '—'}`, `Đã ghé ${r.visits} lần · Món ruột: ${r.fav ? recipeName(r.fav) : '—'}`) }));
      } else {
        for (const [id, a] of Object.entries(ACHIEVEMENTS)) { const got = s.achievements.includes(id); list.appendChild(rowEl({ icon: got ? 'lantern' : 'tile', title: got ? escapeHtml(T(a.en, a.vi)) : '— — —', sub: escapeHtml(T(a.desc, a.descVi)), dim: !got })); }
      }
    }, 0, api);
  } });
}

// ---------------------------------------------------------------- business menu (recipes, daily special, upgrades)
export function openBizMenu(bizId, { onUpgrade } = {}) {
  const s = G.state, def = BUSINESSES[bizId], b = s.biz[bizId];
  openSheet({ title: bizName(bizId), sub: T(`Level ${b.level}`, `Cấp ${b.level}`), full: true, build: (body, api) => {
    tabs(body, [T('Menu', 'Thực đơn'), T('Prices', 'Giá bán'), T('Daily special', 'Món đặc biệt'), T('Upgrades', 'Nâng cấp'), T('Equipment', 'Dụng cụ'), T('Stats', 'Thống kê')], (i, pane) => {
      if (i === 1) return pricesPane(pane, bizId, api);
      if (i === 4) return equipPane(pane, bizId, api);
      if (i > 1) i--; if (i > 2) i--;
      const list = h('div', 'list'); pane.appendChild(list);
      const recs = bizRecipes(bizId);
      if (i === 0) {
        if (!recs.length) list.appendChild(h('div', 'empty-note', T('No recipes yet — Mèo Mây might know one!', 'Chưa có món nào — biết đâu Mèo Mây biết!')));
        for (const r of recs) {
          const R = RECIPES[r], ok = canMake(bizId, r);
          const steps = R.steps.map(st => `<img src="${iconURL(STATION[st].icon, 22)}" style="width:20px;height:20px;vertical-align:middle">`).join(' ');
          list.appendChild(rowEl({ icon: R.icon, title: `${escapeHtml(recipeName(r))} · ${recipePrice(bizId, r)}k`, sub: `${steps}<br>${ok ? `<span style="color:#2f7f45">${T('Ready', 'Sẵn sàng')}</span>` : `<span style="color:#b3453a">${T('Missing ingredients', 'Thiếu nguyên liệu')}</span>`}` }));
        }
      } else if (i === 1) {
        list.appendChild(h('div', 'empty-note', T('Today\'s special costs 10% more, earns bigger tips and draws more customers. Mèo Mây picks one each morning — you can change it.', 'Món đặc biệt đắt hơn 10%, được boa nhiều hơn và hút khách hơn. Mỗi sáng Mèo Mây chọn một món — bạn có thể đổi.')));
        for (const r of recs) {
          const on = b.special === r;
          list.appendChild(rowEl({ icon: RECIPES[r].icon, title: escapeHtml(recipeName(r)) + (on ? ` <span class="pill new">${T('Today', 'Hôm nay')}</span>` : ''), right: btn(on ? '★' : T('Pick', 'Chọn'), () => { b.special = on ? null : r; markDirty(true); sfx('ui'); api.rebuild(); }, on ? 'buy pink' : 'buy alt') }));
        }
      } else if (i === 2) {
        const ups = def.upgrades || [];
        for (let lv = 2; lv < ups.length; lv++) {
          const u = ups[lv]; if (!u) continue;
          const done = b.level >= lv, req = SHOP_LEVEL_REQ[lv] || 0, locked = level() < req, next = b.level === lv - 1 && !locked;
          const need = h('div', 'need');
          need.innerHTML = `<span class="${s.money >= u.cost ? 'ok' : 'no'}"><img src="${iconURL('coin', 22)}">${u.cost}k</span>` + Object.entries(u.mats || {}).map(([k, n]) => `<span class="${mats(k) >= n ? 'ok' : 'no'}"><img src="${iconURL(k, 22)}">${mats(k)}/${n}</span>`).join('');
          const perk = u.tables ? T(`${u.tables} tables`, `${u.tables} bàn`) : T(`queue of ${u.queue}`, `hàng chờ ${u.queue}`);
          const r = rowEl({ icon: lv === 2 ? 'lantern' : lv === 3 ? 'cable' : 'star', dim: locked && !done, title: T(`Level ${lv}: ${u.label}`, `Cấp ${lv}: ${u.labelVi || u.label}`), sub: done ? T('Done', 'Đã nâng cấp') : locked ? T(`Needs island level ${req}`, `Cần đảo cấp ${req}`) : T(`${perk} · attracts more customers${u.price ? ` · prices +${Math.round((u.price - 1) * 100)}%` : ''}`, `${perk} · hút khách hơn${u.price ? ` · giá +${Math.round((u.price - 1) * 100)}%` : ''}`) });
          r.querySelector('.info').appendChild(need);
          if (!done) r.appendChild(btn(T('Upgrade', 'Nâng cấp'), () => {
            if (s.money < u.cost || !hasMats(u.mats)) { sfx('error'); toast({ text: T('Not enough yet', 'Chưa đủ'), sub: T('You need more money or materials — Chú Bảy sells them.', 'Cần thêm tiền hoặc vật liệu — Chú Bảy có bán.'), bad: true }); return; }
            api.close(true); onUpgrade?.(lv);
          }, 'buy', !next));
          list.appendChild(r);
        }
        if (ups.length <= 2) list.appendChild(h('div', 'empty-note', T('No upgrades here yet.', 'Chưa có nâng cấp.')));
      } else {
        const t = s.today.biz[bizId] || { served: 0, revenue: 0, perfect: 0 };
        list.appendChild(rowEl({ icon: 'coin', title: T(`Today: ${t.served} customers · ${money(t.revenue)}`, `Hôm nay: ${t.served} khách · ${money(t.revenue)}`), sub: T(`${t.perfect} perfect orders`, `${t.perfect} món hoàn hảo`) }));
        list.appendChild(rowEl({ icon: 'lantern', title: T(`All time: ${b.stats.served} customers · ${money(b.stats.revenue)}`, `Tổng: ${b.stats.served} khách · ${money(b.stats.revenue)}`) }));
      }
    }, 0, api);
  } });
}

// ---------------------------------------------------------------- prices + equipment
function pricesPane(pane, bizId, api) {
  const list = h('div', 'list'); pane.appendChild(list);
  if (level() < 2) { list.appendChild(h('div', 'empty-note', T('Reach level 2 to set your own prices.', 'Đạt cấp 2 để tự đặt giá.'))); return; }
  list.appendChild(h('div', 'empty-note', T('Higher prices earn more per order, but fewer people buy and tips shrink. Cheaper food brings a crowd.', 'Giá cao lời hơn mỗi món, nhưng ít người mua và tiền boa giảm. Giá rẻ thì đông khách.')));
  for (const r of bizRecipes(bizId)) {
    const m = priceMul(r), appeal = priceAppeal(r);
    const mood = appeal > 1.25 ? T('A bargain! Crowds love it', 'Rẻ quá! Khách mê') : appeal > 0.95 ? T('Fair price', 'Giá hợp lý') : appeal > 0.7 ? T('A bit pricey', 'Hơi đắt') : T('Too expensive — few buyers', 'Đắt quá — ít người mua');
    const right = h('div', 'qty');
    const set = v => { v = Math.round(Math.min(PRICE_RANGE[1], Math.max(PRICE_RANGE[0], v)) * 20) / 20; if (v === 1) delete G.state.prices[r]; else G.state.prices[r] = v; markDirty(true); sfx('tap'); api.rebuild(); };
    const minus = h('button', '', '−'); minus.type = 'button'; minus.onclick = () => set(m - 0.05); minus.disabled = m <= PRICE_RANGE[0] + 1e-6;
    const plus = h('button', '', '+'); plus.type = 'button'; plus.onclick = () => set(m + 0.05); plus.disabled = m >= PRICE_RANGE[1] - 1e-6;
    const val = h('b', '', `${Math.round(m * 100)}%`);
    right.append(minus, val, plus);
    list.appendChild(rowEl({ icon: RECIPES[r].icon, title: `${escapeHtml(recipeName(r))} · ${recipePrice(bizId, r)}k`, sub: `${mood}${m !== 1 ? ' · <u data-reset>' + T('reset', 'đặt lại') + '</u>' : ''}`, right }));
    const reset = list.lastChild.querySelector('[data-reset]'); if (reset) reset.onclick = () => set(1);
  }
}
function equipPane(pane, bizId, api) {
  const list = h('div', 'list'); pane.appendChild(list);
  const b = G.state.biz[bizId]; b.equip ||= {};
  for (const e of EQUIPMENT) {
    const own = b.equip[e.id], locked = level() < e.lv;
    const r = rowEl({ icon: e.icon, dim: locked, title: escapeHtml(T(e.en, e.vi)) + (own ? ` <span class="pill new">${T('Owned', 'Đã có')}</span>` : ''), sub: locked ? T(`Needs level ${e.lv} · ${e.fx}`, `Cần cấp ${e.lv} · ${e.fxVi}`) : T(e.fx, e.fxVi) });
    if (!own) r.appendChild(btn(money(e.cost), () => {
      if (!canAfford(e.cost)) return noMoney();
      addMoney(-e.cost, 'upgrade'); b.equip[e.id] = true; markDirty(true); sfx('buy');
      toast({ text: T(`${e.en} installed!`, `Đã lắp ${e.vi}!`), sub: T(e.fx, e.fxVi), icon: e.icon });
      api.rebuild();
    }, 'buy', locked));
    list.appendChild(r);
  }
}

// ---------------------------------------------------------------- requirement sheet (repair / buy / restore)
export function openRequirement({ title, sub = '', cost = 0, mats: need = {}, action, actionLabel, note = '', who = null }) {
  const s = G.state;
  return openSheet({ title, sub, who, build: (body, api) => {
    const wrap = h('div', 'scroll'); body.appendChild(wrap);
    if (note) wrap.appendChild(h('div', 'empty-note', escapeHtml(note)));
    const n = h('div', 'need');
    if (cost) n.innerHTML += `<span class="${s.money >= cost ? 'ok' : 'no'}"><img src="${iconURL('coin', 22)}">${money(cost)}</span>`;
    for (const [k, v] of Object.entries(need)) n.innerHTML += `<span class="${mats(k) >= v ? 'ok' : 'no'}"><img src="${iconURL(k, 22)}">${escapeHtml(matName(k))} ${mats(k)}/${v}</span>`;
    wrap.appendChild(n);
    const ready = s.money >= cost && hasMats(need);
    const foot = h('div', 'foot');
    foot.appendChild(btn(actionLabel, () => { if (!ready) return; api.close(true); action(); }, 'btn big' + (ready ? ' pink' : ''), !ready));
    body.appendChild(foot);
    if (!ready) wrap.appendChild(h('div', 'empty-note', Object.keys(need).length ? T('Ben Vung Materials on Market Street sells what you need.', 'Tiệm VLXD Bền Vững ở Phố Chợ có bán đủ thứ bạn cần.') : T('Keep earning — you\'re nearly there!', 'Cố gắng thêm chút nữa — sắp đủ rồi!')));
  } });
}

// ---------------------------------------------------------------- Mèo Mây's recipe notebook
export function openRecipeBook({ onDiscover } = {}) {
  const s = G.state;
  openSheet({ title: T('Mèo Mây\'s Notebook', 'Sổ tay của Mèo Mây'), sub: T('Recipes and upgrades', 'Công thức và nâng cấp'), who: 'meo', full: true, build: (body, api) => {
    const list = h('div', 'list scroll'); list.style.flex = '1'; body.appendChild(list);
    const avail = availableRecipes();
    if (avail.length) list.appendChild(h('div', 'section-title', T('Ready to learn', 'Công thức mới')));
    for (const id of avail) {
      list.appendChild(rowEl({ icon: RECIPES[id].icon, title: `${escapeHtml(recipeName(id))} <span class="pill new">${T('New!', 'Mới!')}</span>`, right: btn(T('Learn', 'Học'), () => { api.close(true); onDiscover?.(id); }, 'buy pink') }));
    }
    list.appendChild(h('div', 'section-title', T('Upgrade recipes', 'Nâng cấp công thức')));
    for (const id of s.recipes) {
      const R = RECIPES[id], lv = s.recipeLevels[id] || 1, next = RECIPE_UPGRADES[lv + 1];
      const r = rowEl({ icon: R.icon, title: `${escapeHtml(recipeName(id))} <span class="pill lv">Lv ${lv}</span>`, sub: next ? T(`${next.label}: +${Math.round((next.price - 1) * 100)}% price, calmer customers, bigger tips`, `${next.labelVi}: giá +${Math.round((next.price - 1) * 100)}%, khách kiên nhẫn hơn, boa nhiều hơn`) : T('Perfect! Fully upgraded.', 'Hoàn hảo! Đã nâng cấp tối đa.') });
      if (next) r.appendChild(btn(money(next.cost), () => {
        if (!canAfford(next.cost)) return noMoney();
        addMoney(-next.cost, 'upgrade'); s.recipeLevels[id] = lv + 1; markDirty(true); sfx('success');
        toast({ text: T(`${recipeName(id)} is now Lv ${lv + 1}!`, `${recipeName(id)} lên Lv ${lv + 1}!`), sub: T(next.label, next.labelVi), icon: R.icon }); api.rebuild();
      }));
      list.appendChild(r);
    }
    const locked = Object.keys(RECIPES).filter(id => !s.recipes.includes(id) && !avail.includes(id));
    if (locked.length) {
      list.appendChild(h('div', 'section-title', T('Coming later', 'Sắp tới')));
      for (const id of locked) { const R = RECIPES[id]; const why = s.story.chapter < R.chapter ? T(`Chapter ${R.chapter}`, `Chương ${R.chapter}`) : T(`Needs ${R.needRep} reputation`, `Cần ${R.needRep} danh tiếng`); list.appendChild(rowEl({ icon: 'rice_paper', title: '???', sub: why, dim: true })); }
    }
  } });
}
export function availableRecipes() {
  const s = G.state;
  return Object.entries(RECIPES).filter(([id, r]) => !s.recipes.includes(id) && s.story.chapter >= r.chapter && r.needRep && s.reputation >= r.needRep && bizUnlockedFor(r.biz)).map(([id]) => id);
}
function bizUnlockedFor(kind) { return Object.entries(BUSINESSES).some(([id, d]) => d.biz === kind && G.state.biz[id].owned); }

// ---------------------------------------------------------------- journal
const LORE = [
  [1, 'The island used to be called Cloud Island, because the morning mist hides it from passing boats.', 'Hòn đảo này từng được gọi là Đảo Mây, vì sương sớm che nó khỏi những chiếc thuyền đi ngang.'],
  [2, 'The first shed was Bà Tư\'s tea stand. She sold kumquat tea to fishermen for forty years.', 'Căn chòi đầu tiên là quán trà của Bà Tư. Bà bán trà tắc cho ngư dân suốt bốn mươi năm.'],
  [3, 'When the ferry company cut the route, visitors stopped coming, and the shops closed one by one.', 'Khi hãng tàu cắt tuyến, khách không tới nữa, và các quán lần lượt đóng cửa.'],
  [4, 'Mèo Mây arrived on a fishing boat as a kitten. Chú Hải says it chose the island, not the other way round.', 'Mèo Mây tới đảo trên một chiếc thuyền đánh cá khi còn là mèo con. Chú Hải bảo chính nó chọn hòn đảo.'],
  [5, 'The Night Market lanterns were made by Bà Sáu\'s mother. Every family on the island owns one.', 'Những chiếc lồng đèn ở Chợ Đêm do mẹ của Bà Sáu làm. Nhà nào trên đảo cũng có một chiếc.'],
  [6, 'The restaurant on the hill once cooked for the island\'s weddings. Its kitchen still smells faintly of star anise.', 'Nhà hàng trên đồi từng nấu cho mọi đám cưới trên đảo. Nhà bếp vẫn còn thoang thoảng mùi hoa hồi.'],
  [7, 'Mèo Mây has been waiting for someone who would stay. It never said so — but its tail says a lot.', 'Mèo Mây đã chờ một người chịu ở lại. Nó chưa bao giờ nói ra — nhưng cái đuôi thì nói nhiều lắm.'],
];
export function openJournal() {
  const s = G.state;
  openSheet({ title: T('Island Memories', 'Kỷ niệm của đảo'), who: 'meo', full: true, build: (body) => {
    const list = h('div', 'list scroll'); list.style.flex = '1'; body.appendChild(list);
    for (let i = 1; i < CHAPTERS.length; i++) {
      const ch = CHAPTERS[i], got = s.story.chapter >= i;
      list.appendChild(rowEl({ icon: got ? 'lantern' : 'tile', title: got ? escapeHtml(T(`Chapter ${i}: ${ch.title}`, `Chương ${i}: ${ch.vi}`)) : T(`Chapter ${i}: ???`, `Chương ${i}: ???`), dim: !got }));
    }
    const qs = activeQuests();
    if (qs.length) {
      list.appendChild(h('div', 'section-title', T('Side quests', 'Nhiệm vụ phụ')));
      for (const q of qs) list.appendChild(rowEl({ icon: 'star', title: G.state.sideQuests[q.id] === 'found' ? T(`Bring the ${q.item[0]} back`, `Mang ${q.item[1]} về trả`) : T(`Find the ${q.item[0]}`, `Tìm ${q.item[1]}`), sub: T('Marked ★ on your map', 'Đánh dấu ★ trên bản đồ') }));
    }
    list.appendChild(h('div', 'section-title', T('Stories Mèo Mây told you', 'Chuyện Mèo Mây kể')));
    for (const [ch, en, vi] of LORE) { if (s.story.chapter >= ch) list.appendChild(rowEl({ icon: 'notebook', title: escapeHtml(T(en, vi)) })); }
  } });
}
export { repStars, showReward };
