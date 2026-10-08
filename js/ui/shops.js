// Shop lists and inventory screens.

import { G, T, addMoney, canAfford, addPantry, addMat, mats, pantry, hasMats, markDirty } from '../systems/state.js';
import { INGREDIENTS, AISLES, MATERIALS, FURNITURE, RECIPES, STATION, BUSINESSES, RECIPE_UPGRADES, ACHIEVEMENTS, CHAPTERS, ingName, matName, recipeName, bizName, furnName, EQUIPMENT, SHOP_LEVEL_REQ, PRICE_RANGE, recipeUpgradeCost, BRAND_COLOURS, SIGN_STYLES, BRAND_RECOLOUR } from '../data/game.js';
import { MERCHANTS, RESIDENTS } from '../data/looks.js';
import { openSheet, tabs, rowEl, btn, h, flyIcon } from './sheets.js';
import { sfx } from '../core/audio.js';
import { money, escapeHtml, bus, clock } from '../core/util.js';
import { iconURL, hasIcon } from '../gfx/food.js';
import { CLOTHES, FREE_CLOTHES } from '../data/wardrobe.js';
import { FISH } from '../systems/fishing.js';
import { drawFurniturePreview } from '../gfx/furniture.js';
import { bizRecipes, ingredientsForBiz, canMake, recipePrice, priceMul, priceAppeal, stockOf } from '../systems/business.js';
import { level } from '../systems/progress.js';
import { activeQuests, SIDE_QUESTS, deliverTarget } from '../systems/sidequests.js';
import { MEO_MEMORIES } from '../data/lore.js';
import { DISCOVERIES } from '../systems/interact.js';
import { albumPhotos } from '../systems/album.js';
import { openPhotoViewer } from './album.js';
import { nextHome, homeLoan, upgradeHome, nextFloor, upgradeFloor, placedFurniture } from '../systems/home.js';
import { setProgress, comfortBonus } from '../data/sets.js';
import { upgradeCost, shopNeed } from '../systems/economy.js';
import { toast, moneyShortfall } from './hud.js';
import { STEPS, STEP_TEACHES } from '../systems/story.js';
import { openTideBook, CREATURE_COUNT, CONSTELLATIONS } from '../systems/nature.js';

const bagBtn = () => document.getElementById('bagBtn');
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
    // keep the aisle row where it was (rebuilds used to snap it back to the first aisle)
    bar.scrollLeft = api.aisleScroll || 0;
    bar.addEventListener('scroll', () => { api.aisleScroll = bar.scrollLeft; edge(); }, { passive: true });
    const edge = () => { bar.classList.toggle('more-r', bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 4); bar.classList.toggle('more-l', bar.scrollLeft > 4); };
    requestAnimationFrame(() => { const on = bar.querySelector('.aisle.on'); if (on) { const l = on.offsetLeft - bar.offsetLeft, r = l + on.offsetWidth; if (l < bar.scrollLeft) bar.scrollLeft = l - 12; else if (r > bar.scrollLeft + bar.clientWidth) bar.scrollLeft = r - bar.clientWidth + 12; api.aisleScroll = bar.scrollLeft; } edge(); });
    const list = h('div', 'list scroll'); list.style.flex = '1';
    body.appendChild(list);
    const needs = api.aisle === 'all' ? shoppingNeeds() : [];
    if (needs.length) {
      const total = needs.reduce((s, [k, n]) => s + INGREDIENTS[k].price * n, 0);
      const r = highlightRow();
      r.innerHTML = `<div class="ico"><img src="${iconURL('bag', 44)}" alt=""></div><div class="info"><b>${T('Stock up · about 1½ days of what you sell', 'Mua đủ · khoảng 1,5 ngày bán hàng')}</b><div class="mini-chips">${needs.slice(0, 12).map(([k, n]) => `<span class="mini-chip" title="${escapeHtml(ingName(k))}"><img src="${iconURL(k, 28)}" alt="${escapeHtml(ingName(k))}">×${n}</span>`).join('')}${needs.length > 12 ? `<span class="mini-chip more">${T(`+${needs.length - 12} more`, `+${needs.length - 12} món`)}</span>` : ''}</div></div>`;
      r.appendChild(btn(money(total), (b) => {
        if (!canAfford(total)) return moneyShortfall(total);
        addMoney(-total, 'ingredients');
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
        if (!canAfford(cost)) return moneyShortfall(cost);
        addMoney(-cost, 'ingredients'); addPantry(id, g.pack * n);
        sfx('buy'); flyIcon(id, b, bagBtn()); merchantSay();
        bus.emit('bought', 'ingredients', id);
        api.rebuild();
      });
      right.append(q.el, b);
      // The supermarket sells raw ingredients; prepped portions stay listed separately in the bag.
      list.appendChild(rowEl({ icon: id, title: escapeHtml(ingName(id)), sub: T(`${g.pack} portions per pack`, `${g.pack} phần / gói`), have: haveText(id), right }));
    }
  } });
}
// portions of an ingredient already prepped in your shops (sliced mango, pressed cane juice…)
export function preppedOf(k) { const to = INGREDIENTS[k]?.prep?.to; if (!to) return 0; let n = 0; for (const b of Object.values(G.state.biz)) n += b.prepped?.[to] || 0; return n; }
const haveText = id => { const p = preppedOf(id); return p ? T(`Have: ${pantry(id)} + ${p} prepped`, `Có: ${pantry(id)} + ${p} đã sơ chế`) : T(`Have: ${pantry(id)}`, `Có: ${pantry(id)}`); };
// Missing packs to make ~8 of each known recipe.
export function shoppingNeeds() {
  const want = {};
  for (const bid of Object.keys(BUSINESSES)) {
    const b = G.state.biz[bid];
    if (!b.owned || (BUSINESSES[bid].repair && b.repair < 1)) continue;
    for (const k of ingredientsForBiz(bid)) {
      if (['tapioca', 'jelly', 'cheese_foam', 'chili'].includes(k) && !G.state.recipes.some(r => RECIPES[r].options.includes(k === 'chili' ? 'chili' : 'topping'))) continue;
      want[k] = (want[k] || 0) + shopNeed(bid, k);      // the pantry is shared: add up what each shop is likely to sell
    }
  }
  const out = [];
  for (const [k, n] of Object.entries(want)) {
    const have = pantry(k) + preppedOf(k);           // (already-prepped portions count too)
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
      const missing = Object.entries(need.mats).filter(([k, n]) => mats(k) < n && !matLocked(k)).map(([k, n]) => [k, n - mats(k)]);
      if (missing.length) {
        const total = missing.reduce((s, [k, n]) => s + MATERIALS[k].price * n, 0);
        const r = highlightRow();
        r.innerHTML = `<div class="ico"><img src="${iconURL('wood', 44)}" alt=""></div><div class="info"><b>${escapeHtml(T(`Everything for: ${need.label}`, `Đủ cho: ${need.label}`))}</b><small>${missing.map(([k, n]) => `${escapeHtml(matName(k))} ×${n}`).join(', ')}</small></div>`;
        r.appendChild(btn(money(total), b => {
          if (!canAfford(total)) return moneyShortfall(total);
          addMoney(-total, 'materials'); for (const [k, n] of missing) addMat(k, n);
          sfx('buy'); flyIcon(missing[0][0], b, bagBtn()); merchantSay(); bus.emit('bought', 'materials'); api.rebuild();
        }, 'buy alt'));
        list.appendChild(r);
      }
    }
    for (const [id, m] of Object.entries(MATERIALS)) {
      if (matLocked(id)) {                                  // shown, but not sold yet: say when it arrives
        const r = rowEl({ icon: id, title: escapeHtml(matName(id)), sub: T(`Arrives in Chapter ${m.unlock}`, `Có từ Chương ${m.unlock}`), have: T(`Have: ${mats(id)}`, `Có: ${mats(id)}`), right: h('span', 'locked-tag', '🔒') });
        r.classList.add('locked'); list.appendChild(r); continue;
      }
      const q = qtyStepper(20, 1, v => b.innerHTML = money(m.price * v));
      const right = col();
      const b = btn(money(m.price), () => {
        const n = q.get(), cost = m.price * n;
        if (!canAfford(cost)) return moneyShortfall(cost);
        addMoney(-cost, 'materials'); addMat(id, n); sfx('buy'); flyIcon(id, b, bagBtn()); merchantSay(); bus.emit('bought', 'materials', id); api.rebuild();
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
    // home upgrades (pay now, or move in now and pay back a little each good night)
    const up = nextHome();
    if (up || homeLoan()) {
      const r = h('div', 'row', `<div class="ico">🏡</div><div class="info"><b>${escapeHtml(up ? T(up.en, up.vi) : T('Home loan', 'Tiền nhà'))}</b><small>${homeLoan() ? T(`Still owed: ${money(homeLoan())} (paid back from good days)`, `Còn nợ: ${money(homeLoan())} (trả dần vào ngày có lãi)`) : escapeHtml(T(...up.note))}</small></div>`);
      if (up && !homeLoan()) { const col = h('div', 'btn-col'); col.append(btn(money(up.cost), () => { if (!upgradeHome('cash')) return moneyShortfall(up.cost); sfx('fanfare'); api.rebuild(); }, 'buy'), btn(T('Pay later', 'Trả dần'), () => { upgradeHome('loan'); sfx('fanfare'); api.rebuild(); }, 'buy alt')); r.appendChild(col); }
      list.appendChild(r);
    }
    // once the house is at its biggest: build up and down
    for (const which of ['up', 'down']) {
      const fu = nextFloor(which); if (!fu) continue;
      const r = h('div', 'row', `<div class="ico">${which === 'up' ? '🪜' : '🕯️'}</div><div class="info"><b>${escapeHtml(T(fu.en, fu.vi))}</b><small>${homeLoan() ? T('Pay off your home loan first', 'Trả xong tiền nhà trước đã') : escapeHtml(T(...fu.note))}</small></div>`);
      if (!homeLoan()) { const col = h('div', 'btn-col'); col.append(btn(money(fu.cost), () => { if (!upgradeFloor(which, 'cash')) return moneyShortfall(fu.cost); sfx('fanfare'); api.rebuild(); }, 'buy'), btn(T('Pay later', 'Trả dần'), () => { upgradeFloor(which, 'loan'); sfx('fanfare'); api.rebuild(); }, 'buy alt')); r.appendChild(col); }
      list.appendChild(r);
    }
    // furniture sets: place every piece for the home-comfort bonus
    { const sets = setProgress(s.home), done = sets.filter(x => x.done).length;
      list.appendChild(h('div', 'section-title', T(`Furniture sets · ${done} complete · tips +${Math.round(comfortBonus(s.home) * 100)}%`, `Bộ nội thất · hoàn thành ${done} · boa +${Math.round(comfortBonus(s.home) * 100)}%`)));
      const wrap = h('div', 'set-list'); list.appendChild(wrap);
      for (const st of sets) wrap.appendChild(h('div', 'set-chip' + (st.done ? ' done' : ''), `<b>${st.done ? '✓ ' : ''}${escapeHtml(T(st.en, st.vi))}</b><small>${st.have}/${st.pieces.length} · ${st.pieces.map(p => escapeHtml(furnName(p))).join(', ')}</small>`)); }
    const ids = Object.keys(FURNITURE).sort((a, b) => !!FURNITURE[a].collector - !!FURNITURE[b].collector);
    let collectorHead = false;
    for (const id of ids) {
      const f = FURNITURE[id];
      if (f.reward || (f.unlock && s.story.chapter < f.unlock)) continue;
      if (f.need && !s.story.flags[f.need] && !(s.sideQuests?.[f.need] === 'done')) continue;
      if (f.collector && !collectorHead) { collectorHead = true; list.appendChild(h('div', 'section-title', T('✦ Collector\'s corner', '✦ Góc sưu tầm'))); }
      const owned = s.home.owned.filter(x => x === id).length + placedFurniture().filter(x => x.id === id).length;
      const r = h('div', 'row');
      const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; cv.style.width = cv.style.height = '48px';
      const ico = h('div', 'ico'); ico.appendChild(cv); drawFurniturePreview(cv, id, f);
      const kind = f.light ? T('Glows warmly at night', 'Tỏa sáng ấm áp') : f.wall ? T('Hangs on the wall', 'Treo tường') : T('Place it in your home', 'Đặt trong nhà');
      const info = h('div', 'info', `<b>${escapeHtml(furnName(id))}</b><small>${kind}</small>${owned ? `<span class="have">${T('Owned', 'Đã có')}: ${owned}</span>` : ''}`);
      r.append(ico, info, btn(money(f.price), () => {
        if (!canAfford(f.price)) return moneyShortfall(f.price);
        addMoney(-f.price, 'furniture'); sfx('buy'); merchantSay();
        s.home.owned.push(id); markDirty(true);
        toast({ text: T(`${furnName(id)} delivered to your home`, `${furnName(id)} đã được gửi về nhà`), sub: T('Tap Decorate inside your house.', 'Bấm Trang trí trong nhà nhé.') });
        bus.emit('bought', 'furniture', id); api.rebuild();
      }));
      list.appendChild(r);
    }
  } });
}

// ---------------------------------------------------------------- bag
function recipeShopId(id, recipe) {
  const menus = Object.entries(BUSINESSES).filter(([, b]) => b.menu?.includes(id));
  const owned = menus.find(([bid]) => G.state.biz[bid]?.owned);
  return (owned || menus[0] || Object.entries(BUSINESSES).find(([, b]) => b.biz === recipe.biz))?.[0] || null;
}

function bagRecipeDetail(id, bizId, lv) {
  const recipe = RECIPES[id], ready = bizId ? canMake(bizId, id) : false;
  const detail = h('div', 'recipe-detail');
  detail.style.cssText = 'margin:-4px 8px 6px;padding:12px;background:#fff8ea;border:2.5px solid #e9d8bf;border-top:0;border-radius:0 0 16px 16px;';
  const price = bizId ? recipePrice(bizId, id) : recipe.price;
  detail.innerHTML = `<b style="display:block;font-size:15px">${escapeHtml(recipeName(id))} · Lv ${lv}</b><small style="display:block;margin-top:2px;font-weight:800;opacity:.72">${T('Price', 'Giá')}: ${money(price)} · ${T('Shop', 'Quán')}: ${escapeHtml(bizId ? bizName(bizId) : '—')}</small>${recipe.blurb ? `<p style="margin:8px 0;font-size:13px;font-weight:700;line-height:1.35">${escapeHtml(T(recipe.blurb, recipe.blurbVi))}</p>` : ''}<div style="font-size:13px;font-weight:900;color:${ready ? '#2f7f45' : '#b3453a'}">${ready ? T('✓ Ready to make', '✓ Sẵn sàng làm') : T('Missing ingredients', 'Thiếu nguyên liệu')}</div>`;
  const need = {};
  for (const step of recipe.steps) { const use = STATION[step]?.uses; if (use) need[use] = (need[use] || 0) + 1; }
  const steps = h('div', 'recipe-steps'); steps.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:9px;';
  recipe.steps.forEach((step, i) => {
    const station = STATION[step], use = station?.uses;
    const have = use && bizId ? stockOf(bizId, use) : 0, ok = !use || have >= need[use];
    const row = h('div', 'recipe-step'); row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 8px;background:#fff;border-radius:12px;border:2px solid ' + (ok ? '#d9e9cf' : '#f2b1a8');
    row.innerHTML = `<img src="${iconURL(station?.icon || recipe.icon, 28)}" alt="" style="width:28px;height:28px"><div style="flex:1;min-width:0"><b style="display:block;font-size:13px">${i + 1}. ${escapeHtml(use ? ingName(use) : T(station?.en || step, station?.label || step))}</b></div><span class="have" style="background:${ok ? '#e6f6dc' : '#fff0ec'};color:${ok ? '#2f7f45' : '#b3453a'}">${use ? ok ? T(`Have: ${have}`, `Có: ${have}`) : T(`Missing · Have: ${have}`, `Thiếu · Có: ${have}`) : T('Action', 'Thao tác')}</span>`;
    steps.appendChild(row);
  });
  detail.appendChild(steps);
  return detail;
}

// Achievements: one-off special moments (shown in Menu → Goals)
export function renderAchievements(list) {
  const s = G.state;
  const all = Object.entries(ACHIEVEMENTS), have = all.filter(([id]) => s.achievements.includes(id)).length;
  list.appendChild(h('div', 'empty-note', T(`${have} / ${all.length} — achievements are one-off special moments. Milestones are counters that keep growing.`, `${have} / ${all.length} — thành tựu là những khoảnh khắc đặc biệt, chỉ một lần. Cột mốc là bộ đếm cứ tăng dần.`)));
  for (const [id, a] of all) {
    const got = s.achievements.includes(id);
    if (a.hidden && !got) { list.appendChild(rowEl({ icon: 'lock', title: T('??? · a secret', '??? · bí mật'), sub: escapeHtml(T(...a.hint)), dim: true })); continue; }
    list.appendChild(rowEl({ icon: got ? (a.hidden ? 'star' : 'lantern') : 'lock', title: got ? escapeHtml(T(a.en, a.vi)) + (a.hidden ? ` <span class="pill new">${T('Secret', 'Bí mật')}</span>` : '') : '— — —', sub: escapeHtml(T(a.desc, a.descVi)), dim: !got }));
  }
}
// The collection book: every fish caught, dish discovered and boutique piece owned — the
// rest are question marks waiting to be found.
function renderCollection(pane) {
  const s = G.state;
  const shelf = (title, items) => {
    const got = items.filter(x => x.got).length;
    pane.appendChild(h('div', 'section-title', `${escapeHtml(title)} · ${got} / ${items.length}`));
    const bar = h('div', 'ms-bar'); bar.innerHTML = `<i style="width:${Math.round(got / items.length * 100)}%"></i>`; pane.appendChild(bar);
    const grid = h('div', 'coll-grid'); pane.appendChild(grid);
    for (const x of items) grid.appendChild(h('div', 'coll' + (x.got ? '' : ' locked'), x.got ? `<img src="${iconURL(x.icon, 44)}" alt=""><small>${escapeHtml(x.name)}</small>` : '<b>?</b><small>???</small>'));
  };
  shelf(T('Fish & finds', 'Cá & đồ câu được'), Object.entries(FISH).map(([id, f]) => ({ got: !!s.fishSeen?.[id], icon: hasIcon(id) ? id : f.ing && hasIcon(f.ing) ? f.ing : 'fish', name: T(f.en, f.vi) })));
  shelf(T('Dishes', 'Món ăn'), Object.entries(RECIPES).map(([id, r]) => ({ got: s.recipes.includes(id), icon: r.icon || id, name: recipeName(id) })));
  shelf(T('Boutique pieces', 'Đồ ở tiệm thời trang'), Object.entries(CLOTHES).filter(([id, c]) => !FREE_CLOTHES.includes(id) && !c.store).map(([id, c]) => ({ got: s.wardrobe.owned.includes(id), icon: 'shirt', name: T(c.en, c.vi) })));
  pane.appendChild(h('div', 'empty-note', T('Badges for full shelves are in Menu → Goals.', 'Huy hiệu cho kệ đầy đủ ở Menu → Mục tiêu.')));
}
export function openBag() {
  const s = G.state;
  openSheet({ title: T('Bag', 'Túi đồ'), full: true, build: (body, api) => {
    const ti = (label, icon) => ({ label, icon });
    tabs(body, [ti(T('Ingredients', 'Nguyên liệu'), 'bag'), ti(T('Materials', 'Vật liệu'), 'wood'), ti(T('Recipes', 'Công thức'), 'notebook'), ti(T('Regulars', 'Khách quen'), 'person'), ti(T('Collection', 'Bộ sưu tập'), 'fish')], (i, pane) => {
      if (i === 4) return renderCollection(pane);
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
        if (!ids.length) list.appendChild(h('div', 'empty-note', T('No materials yet. Ben Vung Materials on Market Street sells wood, metal and paint.', 'Chưa có vật liệu. VLXD Bền Vững ở Phố Chợ bán gỗ, tôn và sơn.')));
        for (const k of ids) list.appendChild(rowEl({ icon: k, title: escapeHtml(matName(k)), have: `×${mats(k)}` }));
      } else if (i === 2) {
        for (const id of s.recipes) {
          const r = RECIPES[id], lv = s.recipeLevels[id] || 1;
          const bid = recipeShopId(id, r), shop = bid ? bizName(bid) : '—';
          const row = rowEl({ icon: r.icon, title: `${escapeHtml(recipeName(id))} <span class="pill lv">${T('Lv', 'Cấp')} ${lv}</span>`, sub: `${money(bid ? recipePrice(bid, id) : r.price)} · ${escapeHtml(shop)}` });
          const detail = bagRecipeDetail(id, bid, lv), detailId = `bag-recipe-${id}`;
          const arrow = h('span', 'recipe-arrow', '⌄'); arrow.style.cssText = 'font-size:22px;font-weight:900;transition:transform .18s;';
          row.classList.add('recipe-row'); row.tabIndex = 0; row.setAttribute('role', 'button'); row.setAttribute('aria-controls', detailId); row.style.cursor = 'pointer';
          detail.id = detailId; detail.hidden = api.recipeOpen !== id;
          const sync = () => { const open = !detail.hidden; row.setAttribute('aria-expanded', String(open)); arrow.style.transform = open ? 'rotate(180deg)' : ''; };
          const toggle = () => { sfx('ui'); detail.hidden = !detail.hidden; api.recipeOpen = detail.hidden ? null : id; sync(); };
          row.appendChild(arrow); row.addEventListener('click', toggle); row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
          sync(); list.append(row, detail);
        }
        secretRecipes(list);
      } else if (i === 3) {
        const regs = Object.entries(s.regulars).sort((a, b) => b[1].visits - a[1].visits);
        if (!regs.length) list.appendChild(h('div', 'empty-note', T('Serve the same people a few times and they\'ll become regulars.', 'Phục vụ một người vài lần là họ thành khách quen.')));
        for (const [, r] of regs) list.appendChild(rowEl({ icon: RECIPES[r.fav]?.icon || 'heart', title: escapeHtml(r.name) + (r.visits >= 3 ? ` <span class="pill new">${T('Regular', 'Khách quen')}</span>` : ''), sub: T(`Visited ${r.visits} ${r.visits === 1 ? 'time' : 'times'} · Favourite: ${r.fav ? recipeName(r.fav) : '—'}`, `Đã ghé ${r.visits} lần · Món ruột: ${r.fav ? recipeName(r.fav) : '—'}`) }));
      }
    }, 0, api);
  } });
}

// ---------------------------------------------------------------- business menu (recipes, daily special, upgrades)
export function openBizMenu(bizId, { onUpgrade } = {}) {
  const s = G.state, def = BUSINESSES[bizId], b = s.biz[bizId];
  openSheet({ title: bizName(bizId), sub: T(`Level ${b.level}`, `Cấp ${b.level}`), full: true, build: (body, api) => {
    const brandable = !!BUSINESSES[bizId] && (b.owned || bizId === 'night');   // every shop you own can carry your name
    tabs(body, [T('Menu', 'Thực đơn'), T('Prices', 'Giá bán'), T('Daily special', 'Món đặc biệt'), T('Upgrades', 'Nâng cấp'), T('Equipment', 'Dụng cụ'), T('Stats', 'Thống kê'), ...(brandable ? [T('Branding', 'Thương hiệu')] : [])], (i, pane) => {
      if (i === 6) return brandPane(pane, bizId, api);
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
          const cost = upgradeCost(bizId, lv), need = needChips(u.mats, cost);
          const perk = u.tables ? T(`${u.tables} tables`, `${u.tables} bàn`) : T(`queue of ${u.queue}`, `hàng chờ ${u.queue}`);
          const r = rowEl({ icon: lv === 2 ? 'lantern' : lv === 3 ? 'cable' : 'star', dim: locked && !done, title: T(`Level ${lv}: ${u.label}`, `Cấp ${lv}: ${u.labelVi || u.label}`), sub: done ? T('Done', 'Đã nâng cấp') : locked ? T(`Needs island level ${req}`, `Cần đảo cấp ${req}`) : T(`${perk} · attracts more customers${u.price ? ` · prices +${Math.round((u.price - 1) * 100)}%` : ''}`, `${perk} · hút khách hơn${u.price ? ` · giá +${Math.round((u.price - 1) * 100)}%` : ''}`) });
          if (!done) r.querySelector('.info').appendChild(need);   // (a finished upgrade doesn't list what it cost)
          if (!done) r.appendChild(btn(T('Upgrade', 'Nâng cấp'), () => {
            if (s.money < cost || !hasMats(u.mats)) { sfx('error'); toast({ text: T('Not enough yet', 'Chưa đủ'), sub: T('You need more money or materials — tap a material to see where to buy it (Ben Vung Materials).', 'Cần thêm tiền hoặc vật liệu — chạm vào vật liệu để xem nơi mua (VLXD Bền Vững).'), bad: true }); return; }
            api.close(true); onUpgrade?.(lv);
          }, 'buy', !next));
          list.appendChild(r);
        }
        // kiosks and stalls come fully fitted out: they grow through equipment, recipe levels and prices instead
        if (ups.length <= 2) list.appendChild(h('div', 'empty-note', T('This kiosk comes fully fitted out — there\'s nothing to build here. Grow it with Equipment, recipe upgrades in Mèo Mây\'s notebook, a daily special and your prices.', 'Quầy này đã được trang bị đầy đủ — không cần xây thêm gì. Hãy phát triển nó bằng Dụng cụ, nâng cấp công thức trong sổ tay Mèo Mây, món đặc biệt và giá bán của bạn.')));
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
  list.appendChild(h('div', 'empty-note', T('Higher prices earn more per order, but fewer people buy and tips shrink; cheaper food brings a crowd and happy regulars. Tourists and harbour or cove customers mind prices less; picky ones mind more — unless your food is excellent. Upgraded recipes and nicer shops can charge more before anyone notices.', 'Giá cao lời hơn mỗi món, nhưng ít người mua và tiền boa giảm; giá rẻ thì đông khách và nhiều khách quen. Du khách và khách ở bến cảng, vịnh dừa ít để ý giá; khách khó tính thì để ý hơn — trừ khi món của bạn thật ngon. Công thức đã nâng cấp và quán đẹp hơn có thể bán giá cao hơn mà không ai phàn nàn.')));
  for (const r of bizRecipes(bizId)) {
    const m = priceMul(r), appeal = priceAppeal(r, bizId);
    const mood = appeal > 1.25 ? T('A bargain! Crowds love it', 'Rẻ quá! Khách mê') : appeal > 0.9 ? T('Fair price', 'Giá hợp lý') : appeal > 0.68 ? T('A bit pricey — tourists won\'t mind', 'Hơi đắt — du khách thì không ngại') : T('Too expensive — many walk on by', 'Đắt quá — nhiều người bỏ đi');
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
// your shop, your name: a sign, a colour scheme and a sign style (the fancy signs are a treat to save for)
function brandPane(pane, bizId, api) {
  const s = G.state, br = ((s.brand ||= {})[bizId] ||= {}), list = h('div', 'list'); pane.appendChild(list);
  list.appendChild(h('div', 'empty-note', T('Make it yours. Customers remember a shop with a name.', 'Làm cho nó thành của bạn. Khách nhớ những quán có tên riêng.')));
  const nameRow = h('div', 'row'), inp = document.createElement('input');
  inp.maxLength = 16; inp.value = br.name || ''; inp.placeholder = bizSignDefault(bizId); inp.style.cssText = 'flex:1;font:inherit;font-weight:900;font-size:14px;padding:10px;border-radius:12px;border:2.5px solid #e1ccad';
  nameRow.append(inp, btn(T('Save name', 'Lưu tên'), () => { br.name = inp.value.trim().slice(0, 16) || undefined; if (!br.name) delete br.name; markDirty(true); sfx('success'); toast({ text: T('New sign painted!', 'Đã sơn bảng hiệu mới!'), sub: br.name || bizSignDefault(bizId), icon: 'sign_open' }); api.rebuild(); }, 'buy'));
  list.appendChild(h('div', 'section-title', T('Shop name', 'Tên quán'))); list.appendChild(nameRow);
  list.appendChild(h('div', 'section-title', T(`Colours · repaint ${money(BRAND_RECOLOUR)}`, `Màu sắc · sơn lại ${money(BRAND_RECOLOUR)}`)));
  const sw = h('div', 'brand-swatches'); list.appendChild(sw);
  for (const [k, c] of Object.entries(BRAND_COLOURS)) {
    const b = h('button', 'swatch' + ((br.colour || 'classic') === k ? ' on' : ''), `<i style="background:linear-gradient(90deg, ${(c.awning || ['#fff5df', '#f28f7c'])[0]} 50%, ${(c.awning || ['#fff5df', '#f28f7c'])[1]} 50%)"></i><small>${escapeHtml(T(c.en, c.vi))}</small>`); b.type = 'button';
    b.onclick = () => { if ((br.colour || 'classic') === k) return; if (!canAfford(BRAND_RECOLOUR)) return moneyShortfall(BRAND_RECOLOUR); addMoney(-BRAND_RECOLOUR, 'upgrade'); br.colour = k; markDirty(true); sfx('buy'); api.rebuild(); };
    sw.appendChild(b);
  }
  list.appendChild(h('div', 'section-title', T('Sign style', 'Kiểu bảng hiệu')));
  const owned = (br.signsOwned ||= ['plain']);
  for (const [k, st] of Object.entries(SIGN_STYLES)) {
    const have = owned.includes(k), on = (br.sign || 'plain') === k, locked = st.lv && level() < st.lv;
    const r = rowEl({ icon: 'sign_open', title: escapeHtml(T(st.en, st.vi)) + (on ? ` <span class="pill new">${T('On', 'Đang dùng')}</span>` : ''), sub: locked ? T(`Needs island level ${st.lv}`, `Cần đảo cấp ${st.lv}`) : have ? T('Yours', 'Đã có') : money(st.cost), dim: locked });
    if (!on && !locked) r.appendChild(btn(have ? T('Use', 'Dùng') : money(st.cost), () => { if (!have) { if (!canAfford(st.cost)) return moneyShortfall(st.cost); addMoney(-st.cost, 'upgrade'); owned.push(k); } br.sign = k; markDirty(true); sfx('success'); api.rebuild(); }, have ? 'buy alt' : 'buy'));
    list.appendChild(r);
  }
}
const bizSignDefault = id => ({ shed1: T('TEA & COFFEE', 'TRÀ & CÀ PHÊ'), shed2: 'BÁNH MÌ', truck: T('ROLL TRUCK', 'XE CUỐN'), restaurant: T('RESTAURANT', 'NHÀ HÀNG'), cafe: T('HARBOUR CAFÉ', 'CÀ PHÊ BẾN CẢNG'), grill: T('COVE GRILL', 'QUÁN NƯỚNG VỊNH DỪA'), smoothie: T('SMOOTHIE BAR', 'SINH TỐ BÃI BIỂN') })[id] || (BUSINESSES[id]?.stall || id === 'night' ? T('YOUR STALL', 'SẠP CỦA BẠN') : '');
function equipPane(pane, bizId, api) {
  const list = h('div', 'list'); pane.appendChild(list);
  const b = G.state.biz[bizId]; b.equip ||= {};
  for (const e of EQUIPMENT) {
    const own = b.equip[e.id], locked = level() < e.lv;
    const r = rowEl({ icon: e.icon, dim: locked, title: escapeHtml(T(e.en, e.vi)) + (own ? ` <span class="pill new">${T('Owned', 'Đã có')}</span>` : ''), sub: locked ? T(`Needs level ${e.lv} · ${e.fx}`, `Cần cấp ${e.lv} · ${e.fxVi}`) : T(e.fx, e.fxVi) });
    if (!own) r.appendChild(btn(money(e.cost), () => {
      if (!canAfford(e.cost)) return moneyShortfall(e.cost);
      addMoney(-e.cost, 'equipment'); b.equip[e.id] = true; markDirty(true); sfx('buy');
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
    wrap.appendChild(needChips(need, cost));
    const ready = s.money >= cost && hasMats(need);
    const foot = h('div', 'foot');
    foot.appendChild(btn(actionLabel, () => { if (!ready) return; api.close(true); action(); }, 'btn big' + (ready ? ' pink' : ''), !ready));
    body.appendChild(foot);
    if (!ready) wrap.appendChild(h('div', 'empty-note', Object.keys(need).length ? T('Tap a material to see what it is and where to buy it. Ben Vung Materials on Market Street sells them all.', 'Chạm vào vật liệu để xem tên và nơi mua. VLXD Bền Vững ở Phố Chợ bán đủ cả.') : T('Keep earning — you\'re nearly there!', 'Cố gắng thêm chút nữa — sắp đủ rồi!')));
  } });
}

// Requirement chips: tap a material to see its name and where to buy it; "?" explains all of them
const MAT_SHOP = () => T('Ben Vung Materials (Market Street)', 'VLXD Bền Vững (Phố Chợ)');
// (some materials only reach the island later in the story — the shop and this hint use the same rule)
const matLocked = k => { const lv = MATERIALS[k]?.unlock; return !!lv && G.state.story.chapter < lv; };
function matWhere(k) {
  const m = MATERIALS[k]; if (!m) return '';
  return matLocked(k)
    ? T(`Not in the shops yet: ${matName(k).toLowerCase()} arrive at ${MAT_SHOP()} in Chapter ${m.unlock} (you're in Chapter ${G.state.story.chapter}). Keep following the story!`, `Chưa có bán: ${matName(k).toLowerCase()} sẽ về ${MAT_SHOP()} ở Chương ${m.unlock} (bạn đang ở Chương ${G.state.story.chapter}). Cứ theo cốt truyện nhé!`)
    : T(`Sold at ${MAT_SHOP()}`, `Có bán ở ${MAT_SHOP()}`);
}
export function needChips(need, cost = 0) {
  const s = G.state, n = h('div', 'need');
  if (cost) n.appendChild(h('span', s.money >= cost ? 'ok' : 'no', `<img src="${iconURL('coin', 22)}">${money(cost)}`));
  for (const [k, v] of Object.entries(need || {})) {
    const chip = h('button', 'chip ' + (mats(k) >= v ? 'ok' : 'no'), `<img src="${iconURL(k, 22)}">${escapeHtml(matName(k))} ${mats(k)}/${v}`);
    chip.type = 'button';
    chip.onclick = e => { e.stopPropagation(); sfx('ui'); toast({ text: `${matName(k)} · ${mats(k)}/${v}`, sub: matWhere(k), icon: k, ms: 3600 }); };
    n.appendChild(chip);
  }
  if (Object.keys(need || {}).length) {
    const q = h('button', 'chip help', '?'); q.type = 'button';
    q.onclick = e => { e.stopPropagation(); sfx('ui'); toast({ text: T('Where to get materials', 'Mua vật liệu ở đâu'), sub: Object.keys(need).map(k => `${matName(k)}: ${matWhere(k)}`).join(' · '), icon: 'wood', ms: 6000 }); };
    n.appendChild(q);
  }
  return n;
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
      const r = rowEl({ icon: R.icon, title: `${escapeHtml(recipeName(id))} <span class="pill lv">${T('Lv', 'Cấp')} ${lv}</span>`, sub: next ? T(`${next.label}: +${Math.round((next.price - 1) * 100)}% price, calmer customers, bigger tips`, `${next.labelVi}: giá +${Math.round((next.price - 1) * 100)}%, khách kiên nhẫn hơn, boa nhiều hơn`) : T('Perfect! Fully upgraded.', 'Hoàn hảo! Đã nâng cấp tối đa.') });
      const nextCost = next ? recipeUpgradeCost(id, lv + 1) : 0;
      if (next) r.appendChild(btn(money(nextCost), () => {
        if (!canAfford(nextCost)) return moneyShortfall(nextCost);
        addMoney(-nextCost, 'recipe'); s.recipeLevels[id] = lv + 1; markDirty(true); sfx('success');
        toast({ text: T(`${recipeName(id)} is now Lv ${lv + 1}!`, `${recipeName(id)} lên Lv ${lv + 1}!`), sub: T(next.label, next.labelVi), icon: R.icon }); api.rebuild();
      }));
      list.appendChild(r);
    }
    secretRecipes(list, avail, T('Coming later', 'Sắp tới'));
  } });
}
// Recipes you haven't learned stay secret (no names): one summary row instead of a wall of "???",
// plus a nudge when your current story goal is about to teach one.
function secretRecipes(list, exclude = [], heading = '') {
  const s = G.state, locked = Object.keys(RECIPES).filter(id => !s.recipes.includes(id) && !exclude.includes(id));
  if (!locked.length) return;
  if (heading) list.appendChild(h('div', 'section-title', heading));
  const soon = (STEP_TEACHES[s.story.step] || []).filter(id => locked.includes(id)), step = STEPS[s.story.step];
  if (soon.length && step?.text) {
    const r = highlightRow();
    r.innerHTML = `<div class="ico"><img src="${iconURL('notebook', 44)}" alt=""></div><div class="info"><b>${soon.length > 1 ? T(`${soon.length} new recipes are on their way!`, `Sắp có ${soon.length} công thức mới!`) : T('A new recipe is on its way!', 'Sắp có công thức mới!')}</b><small>${escapeHtml(T('Finish your story goal to learn it: ', 'Hoàn thành mục tiêu cốt truyện để học: ') + step.text())}</small></div>`;
    list.appendChild(r);
  }
  const ready = availableRecipes();
  let story = 0, shop = 0, rep = 0, learn = 0, nextRep = Infinity;
  for (const id of locked) {
    const R = RECIPES[id];
    if (soon.includes(id)) continue;
    if (ready.includes(id)) learn++;
    else if (R.stallOnly || (R.starter && !R.needRep)) shop++;
    else if (!R.needRep || s.story.chapter < R.chapter) story++;
    else if (!bizUnlockedFor(R.biz)) shop++;
    else { rep++; nextRep = Math.min(nextRep, R.needRep); }
  }
  const parts = [
    learn && T(`Ready to learn in Mèo Mây's notebook: ${learn}`, `Có thể học trong sổ tay Mèo Mây: ${learn}`),
    story && T(`From the story: ${story}`, `Theo cốt truyện: ${story}`),
    rep && T(`Need more reputation: ${rep} (next at ${nextRep}, you have ${Math.floor(s.reputation)})`, `Cần thêm danh tiếng: ${rep} (món kế ở ${nextRep}, bạn có ${Math.floor(s.reputation)})`),
    shop && T(`With new shops & stalls: ${shop}`, `Đi kèm quán & sạp mới: ${shop}`),
  ].filter(Boolean);
  const n = locked.length - soon.length;
  if (n > 0) list.appendChild(rowEl({ icon: 'rice_paper', title: T(`${n} recipe${n > 1 ? 's' : ''} still secret`, `Còn ${n} công thức bí mật`), sub: escapeHtml(parts.join(' · ')) + '<br> · ' + T('Follow the story and earn reputation to uncover them.', 'Theo cốt truyện và tích danh tiếng để khám phá.'), dim: true }));
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
  openSheet({ title: T('Chapters & Story', 'Các chương & câu chuyện'), sub: T('Every chapter of your island, the ones still to come, side quests and Mèo Mây\'s stories', 'Các chương của hòn đảo, những chương sắp tới, nhiệm vụ phụ và chuyện Mèo Mây kể'), who: 'meo', full: true, build: (body, api) => {
    const list = h('div', 'list scroll'); list.style.flex = '1'; body.appendChild(list);
    // the photo album: snapshots of the big moments
    const photos = albumPhotos();
    list.appendChild(h('div', 'section-title', T(`Photo album (${photos.length})`, `Album ảnh (${photos.length})`)));
    if (!photos.length) list.appendChild(h('div', 'empty-note', T('The big moments are photographed for you — the first repair, the first customer, every new chapter…', 'Những khoảnh khắc lớn sẽ được chụp lại — lần sửa quán đầu tiên, vị khách đầu tiên, mỗi chương mới…')));
    else {
      const grid = h('div', 'album'); list.appendChild(grid);
      for (const ph of [...photos].reverse()) {
        const f = h('button', 'album-ph', `<img src="${ph.img}" alt=""><small>${escapeHtml(T(ph.title[0], ph.title[1]))} · <br>${T(`Day ${ph.day}`, `Ngày ${ph.day}`)}</small>`); f.type = 'button';
        f.onclick = () => openPhotoViewer(ph.t, () => api.rebuild());
        grid.appendChild(f);
      }
    }
    for (let i = 1; i < CHAPTERS.length; i++) {
      const ch = CHAPTERS[i], got = s.story.chapter >= i;
      list.appendChild(rowEl({ icon: got ? 'lantern' : 'lock', title: got ? escapeHtml(T(`Chapter ${i}: ${ch.title}`, `Chương ${i}: ${ch.vi}`)) : T(`Chapter ${i}: ???`, `Chương ${i}: ???`), dim: !got }));
    }
    const qs = activeQuests();
    if (qs.length) {
      list.appendChild(h('div', 'section-title', T('Side quests', 'Nhiệm vụ phụ')));
      for (const q of qs) {
        const found = G.state.sideQuests[q.id] === 'found', to = deliverTarget(q), who = to === 'meo' ? 'Mèo Mây' : (RESIDENTS[to]?.name || MERCHANTS[to]?.name || to);
        const title = found ? (to === q.giver ? T(`Bring the ${q.item[0]} back to ${who}`, `Mang ${q.item[1]} về cho ${who}`) : T(`Take the ${q.item[0]} to ${who}`, `Mang ${q.item[1]} cho ${who}`))
          : q.type === 'meet' ? T(`Meet at ${q.place[0]}`, `Hẹn ở ${q.place[1]}`) : q.type === 'puzzle' ? T(`Play ${q.item[0]}`, `Chơi ${q.item[1]}`) : T(`Find the ${q.item[0]}`, `Tìm ${q.item[1]}`);
        list.appendChild(rowEl({ icon: q.icon || 'star', title: escapeHtml(title), sub: q.time ? T(`Between ${clock(q.time[0] * 60)} and ${clock(Math.min(1439, q.time[1] * 60))} · ★ on your map`, `Trong khoảng ${clock(q.time[0] * 60)}–${clock(Math.min(1439, q.time[1] * 60))} · ★ trên bản đồ`) : T('Marked ★ on your map', 'Đánh dấu ★ trên bản đồ') }));
      }
    }
    // discoveries: every kind of thing you've tried in the world
    const found = G.state.discovered || {}, all = Object.entries(DISCOVERIES);
    list.appendChild(h('div', 'section-title', T(`Discoveries (${Object.keys(found).length}/${all.length})`, `Khám phá (${Object.keys(found).length}/${all.length})`)));
    list.appendChild(h('div', 'empty-note', all.map(([k, v]) => found[k] ? `✓ ${escapeHtml(T(v[0], v[1]))}` : '· ???').join('<br>')));
    // nature collections: tide pool creatures and constellations
    { const tp = G.state.tidepool || {}, st = G.state.constellations || {};
      list.appendChild(h('div', 'section-title', T('Nature', 'Thiên nhiên')));
      const r1 = rowEl({ icon: 'fish', title: T(`Tide pool friends · ${Object.keys(tp).length}/${CREATURE_COUNT}`, `Bạn bè hồ triều · ${Object.keys(tp).length}/${CREATURE_COUNT}`), sub: T('West end of Sunny Beach, at low tide (6–9, 17–20)', 'Cuối bãi biển phía tây, khi triều xuống (6–9, 17–20 giờ)') });
      r1.style.cursor = 'pointer'; r1.onclick = () => openTideBook(); list.appendChild(r1);
      list.appendChild(rowEl({ icon: 'star', title: T(`Constellations · ${Object.keys(st).length}/${CONSTELLATIONS.length}`, `Chòm sao · ${Object.keys(st).length}/${CONSTELLATIONS.length}`), sub: Object.keys(st).length ? CONSTELLATIONS.filter(c => st[c.id]).map(c => escapeHtml(T(c.en, c.vi))).join(' · ') : T('Lighthouse Point, on clear nights after 21:00', 'Mũi Hải Đăng, những đêm quang mây sau 21 giờ') })); }
    // the scrapbook: every neighbour you helped, and what they gave you to remember it by
    const doneQs = SIDE_QUESTS.filter(q => G.state.sideQuests?.[q.id] === 'done');
    list.appendChild(h('div', 'section-title', T(`Scrapbook (${doneQs.length}/${SIDE_QUESTS.length})`, `Sổ kỷ niệm (${doneQs.length}/${SIDE_QUESTS.length})`)));
    if (!doneQs.length) list.appendChild(h('div', 'empty-note', T('Help your neighbours and their stories end up here.', 'Giúp hàng xóm và câu chuyện của họ sẽ được ghi ở đây.')));
    for (const q of doneQs) {
      const k = q.reward?.keepsake, mem = q.memory || q.thanks;
      list.appendChild(rowEl({ icon: q.icon || 'star', title: escapeHtml(k ? T(k[0], k[1]) : T(q.item[0], q.item[1])), sub: escapeHtml(mem ? T(mem[0], mem[1]) : '') + (G.state.keepsakes?.[q.id] ? T(` · day ${G.state.keepsakes[q.id].day}`, ` · ngày ${G.state.keepsakes[q.id].day}`) : '') }));
    }
    list.appendChild(h('div', 'section-title', T('Stories Mèo Mây told you', 'Chuyện Mèo Mây kể')));
    for (const [ch, en, vi] of LORE) { if (s.story.chapter >= ch) list.appendChild(rowEl({ icon: 'notebook', title: escapeHtml(T(en, vi)) })); }
    for (const mem of MEO_MEMORIES.slice(0, s.story.flags.meoMem || 0)) list.appendChild(rowEl({ icon: 'heart', title: escapeHtml(mem.lines.map(l => T(l[0], l[1])).join(' ')) }));
    if ((s.story.flags.meoMem || 0) < MEO_MEMORIES.length) list.appendChild(h('div', 'empty-note', T('Ask Mèo Mây to "tell me something" — there\'s more to hear as the island grows.', 'Hỏi Mèo Mây “kể chuyện đi” — hòn đảo càng lớn, Mèo Mây càng có nhiều chuyện kể.')));
  } });
}
