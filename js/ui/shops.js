// Shop lists and inventory screens.

import { G, addMoney, canAfford, addPantry, addMat, mats, pantry, hasMats, markDirty, repStars } from '../systems/state.js';
import { INGREDIENTS, MATERIALS, FURNITURE, RECIPES, STATION, PREPPED, BUSINESSES, RECIPE_UPGRADES, ACHIEVEMENTS, CHAPTERS, OPTIONS } from '../data/game.js';
import { MERCHANTS } from '../data/looks.js';
import { openSheet, tabs, rowEl, btn, h, flyIcon, showReward } from './sheets.js';
import { sfx } from '../core/audio.js';
import { money, escapeHtml, bus } from '../core/util.js';
import { iconURL } from '../gfx/food.js';
import { drawFurniturePreview } from '../gfx/furniture.js';
import { bizRecipes, ingredientsForBiz, canMake, recipePrice, makeableRecipes, stockOf } from '../systems/business.js';
import { toast } from './hud.js';

const bagBtn = () => document.getElementById('bagBtn');
const merchantSay = (id, lines) => { const a = G.runtime.merchant; if (a && a.data.mid === id) { a.showEmote('happy', 1.2); a.setEmo('happy', 1.5); a.doHop(60); } };

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

// Which ingredients the island's shops stock right now.
export function stockedIngredients() {
  const set = new Set();
  for (const id of Object.keys(BUSINESSES)) if (G.state.biz[id].owned || G.state.biz[id].unlocked) for (const k of ingredientsForBiz(id)) set.add(k);
  if (!set.size) ['tea', 'kumquat', 'sugar', 'ice'].forEach(k => set.add(k));
  return [...set];
}

// ---------------------------------------------------------------- supermarket
export function openIngredientShop() {
  const who = MERCHANTS.co_hoa;
  openSheet({ title: 'Siêu thị Cô Hoa', sub: 'Nguyên liệu tươi · Fresh ingredients', who, build: (body, api) => {
    const list = h('div', 'list scroll'); list.style.flex = '1';
    body.appendChild(list);
    const ids = stockedIngredients();
    // quick-buy for what today's recipes need
    const needs = shoppingNeeds();
    if (needs.length) {
      const total = needs.reduce((s, [k, n]) => s + INGREDIENTS[k].price * n, 0);
      const r = h('div', 'row'); r.style.background = '#fff7e0'; r.style.borderColor = '#f2c14e';
      r.innerHTML = `<div class="ico"><img src="${iconURL('bag', 44)}" alt=""></div><div class="info"><b>Mua đủ cho thực đơn</b><small>Stock up: ${needs.map(([k, n]) => `${INGREDIENTS[k].vi} ×${n}`).join(', ')}</small></div>`;
      r.appendChild(btn(money(total), (b) => {
        if (!canAfford(total)) { sfx('error'); toast({ text: 'Không đủ tiền', sub: 'Not enough money', bad: true }); return; }
        addMoney(-total, 'buy');
        for (const [k, n] of needs) addPantry(k, INGREDIENTS[k].pack * n);
        sfx('buy'); flyIcon(needs[0][0], b, bagBtn()); merchantSay('co_hoa');
        bus.emit('bought', 'ingredients'); api.rebuild();
      }, 'buy alt'));
      list.appendChild(r);
    }
    for (const id of ids) {
      const g = INGREDIENTS[id];
      const have = pantry(id);
      const q = qtyStepper(9, 1, v => b.innerHTML = money(g.price * v));
      const right = h('div'); right.style.display = 'flex'; right.style.flexDirection = 'column'; right.style.gap = '6px'; right.style.alignItems = 'flex-end';
      const b = btn(money(g.price), () => {
        const n = q.get(), cost = g.price * n;
        if (!canAfford(cost)) { sfx('error'); toast({ text: 'Không đủ tiền', sub: 'Not enough money', bad: true }); return; }
        addMoney(-cost, 'buy'); addPantry(id, g.pack * n);
        sfx('buy'); flyIcon(id, b, bagBtn()); merchantSay('co_hoa');
        bus.emit('bought', 'ingredients', id);
        api.rebuild();
      });
      right.append(q.el, b);
      const prep = g.prep ? ` · cần ${g.prep.verb.toLowerCase()}` : '';
      list.appendChild(rowEl({ icon: id, title: `${g.vi} <span style="opacity:.55;font-weight:800">· ${g.en}</span>`, sub: `${g.pack} phần / gói${prep}`, have: `Có: ${have}`, right }));
    }
  } });
}
// Missing packs to make ~8 of each known recipe.
export function shoppingNeeds() {
  const want = {};
  for (const bid of Object.keys(BUSINESSES)) {
    const b = G.state.biz[bid];
    if (!b.owned || (BUSINESSES[bid].repair && b.repair < 1) || BUSINESSES[bid].kind === 'restaurant' && !b.owned) continue;
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
  const who = MERCHANTS.chu_bay;
  openSheet({ title: 'Vật liệu Chú Bảy', sub: 'Gỗ, tôn, sơn · Building materials', who, build: (body, api) => {
    const list = h('div', 'list scroll'); list.style.flex = '1'; body.appendChild(list);
    const need = G.runtime.materialNeed?.();
    if (need) {
      const missing = Object.entries(need.mats).filter(([k, n]) => mats(k) < n).map(([k, n]) => [k, n - mats(k)]);
      if (missing.length) {
        const total = missing.reduce((s, [k, n]) => s + MATERIALS[k].price * n, 0);
        const r = h('div', 'row'); r.style.background = '#fff7e0'; r.style.borderColor = '#f2c14e';
        r.innerHTML = `<div class="ico"><img src="${iconURL('wood', 44)}" alt=""></div><div class="info"><b>Đủ cho: ${escapeHtml(need.label)}</b><small>${missing.map(([k, n]) => `${MATERIALS[k].vi} ×${n}`).join(', ')}</small></div>`;
        r.appendChild(btn(money(total), b => {
          if (!canAfford(total)) { sfx('error'); toast({ text: 'Không đủ tiền', sub: 'Not enough money', bad: true }); return; }
          addMoney(-total, 'buy'); for (const [k, n] of missing) addMat(k, n);
          sfx('buy'); flyIcon(missing[0][0], b, bagBtn()); merchantSay('chu_bay'); bus.emit('bought', 'materials'); api.rebuild();
        }, 'buy alt'));
        list.appendChild(r);
      }
    }
    for (const [id, m] of Object.entries(MATERIALS)) {
      if (m.unlock && G.state.story.chapter < m.unlock) continue;
      const q = qtyStepper(20, 1, v => b.innerHTML = money(m.price * v));
      const right = h('div'); right.style.display = 'flex'; right.style.flexDirection = 'column'; right.style.gap = '6px'; right.style.alignItems = 'flex-end';
      const b = btn(money(m.price), () => {
        const n = q.get(), cost = m.price * n;
        if (!canAfford(cost)) { sfx('error'); toast({ text: 'Không đủ tiền', sub: 'Not enough money', bad: true }); return; }
        addMoney(-cost, 'buy'); addMat(id, n); sfx('buy'); flyIcon(id, b, bagBtn()); merchantSay('chu_bay'); bus.emit('bought', 'materials', id); api.rebuild();
      });
      right.append(q.el, b);
      list.appendChild(rowEl({ icon: id, title: `${m.vi} <span style="opacity:.55;font-weight:800">· ${m.en}</span>`, sub: 'Dùng để sửa và nâng cấp · For repairs & upgrades', have: `Có: ${mats(id)}`, right }));
    }
  } });
}

// ---------------------------------------------------------------- furniture
export function openFurnitureShop() {
  openSheet({ title: 'Nội thất Anh Khoa', sub: 'Đồ đạc cho ngôi nhà · For your home', who: MERCHANTS.anh_khoa, build: (body, api) => {
    const list = h('div', 'list scroll'); list.style.flex = '1'; body.appendChild(list);
    const s = G.state;
    for (const [id, f] of Object.entries(FURNITURE)) {
      if (f.unlock && s.story.chapter < f.unlock) continue;
      const owned = s.home.owned.filter(x => x === id).length + s.home.furniture.filter(x => x.id === id).length;
      const r = h('div', 'row');
      const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; cv.style.width = cv.style.height = '48px';
      const ico = h('div', 'ico'); ico.appendChild(cv); drawFurniturePreview(cv, id, f);
      const info = h('div', 'info', `<b>${f.vi} <span style="opacity:.55;font-weight:800">· ${f.en}</span></b><small>${f.light ? 'Tỏa sáng ấm áp · Glows at night' : f.wall ? 'Treo tường · Wall item' : 'Đặt trong nhà · Place in your home'}</small>${owned ? `<span class="have">Đã có: ${owned}</span>` : ''}`);
      r.append(ico, info, btn(money(f.price), b => {
        if (!canAfford(f.price)) { sfx('error'); toast({ text: 'Không đủ tiền', sub: 'Not enough money', bad: true }); return; }
        addMoney(-f.price, 'buy'); s.home.owned.push(id); markDirty(true); sfx('buy'); merchantSay('anh_khoa');
        toast({ text: `${f.vi} đã được gửi về nhà`, sub: 'Delivered to your home — tap Decorate inside.' });
        bus.emit('bought', 'furniture', id); api.rebuild();
      }));
      list.appendChild(r);
    }
  } });
}

// ---------------------------------------------------------------- bag
export function openBag() {
  const s = G.state;
  openSheet({ title: 'Túi đồ', sub: 'Inventory', full: true, build: (body) => {
    tabs(body, ['Nguyên liệu', 'Vật liệu', 'Công thức', 'Khách quen', 'Thành tựu'], (i, pane) => {
      const list = h('div', 'list'); pane.appendChild(list);
      if (i === 0) {
        const ids = Object.keys(INGREDIENTS).filter(k => pantry(k) > 0);
        if (!ids.length) list.appendChild(h('div', 'empty-note', 'Chưa có nguyên liệu. Visit the supermarket on Market Street.'));
        for (const k of ids) list.appendChild(rowEl({ icon: k, title: INGREDIENTS[k].vi, sub: INGREDIENTS[k].en, have: `${pantry(k)} phần` }));
        const prepped = [];
        for (const [bid, b] of Object.entries(s.biz)) for (const [k, n] of Object.entries(b.prepped || {})) if (n > 0) prepped.push([bid, k, n]);
        if (prepped.length) { list.appendChild(h('div', 'section-title', 'Đã sơ chế · Prepped at your shops')); for (const [bid, k, n] of prepped) list.appendChild(rowEl({ icon: k, title: PREPPED[k].vi, sub: BUSINESSES[bid].name, have: `${n} phần` })); }
      } else if (i === 1) {
        const ids = Object.keys(MATERIALS).filter(k => mats(k) > 0);
        if (!ids.length) list.appendChild(h('div', 'empty-note', 'Chưa có vật liệu. Chú Bảy sells wood, metal and paint.'));
        for (const k of ids) list.appendChild(rowEl({ icon: k, title: MATERIALS[k].vi, sub: MATERIALS[k].en, have: `×${mats(k)}` }));
      } else if (i === 2) {
        for (const [id, r] of Object.entries(RECIPES)) {
          const known = s.recipes.includes(id);
          const lv = s.recipeLevels[id] || 1;
          list.appendChild(rowEl({ icon: known ? r.icon : 'rice_paper', title: known ? `${r.vi} <span class="pill lv">Lv ${lv}</span>` : '???', sub: known ? `${r.en} · ${r.price}k · ${BUSINESSES[Object.keys(BUSINESSES).find(b => BUSINESSES[b].biz === r.biz)].name}` : 'Chưa khám phá · Not discovered yet', dim: !known }));
        }
      } else if (i === 3) {
        const regs = Object.entries(s.regulars).sort((a, b) => b[1].visits - a[1].visits);
        if (!regs.length) list.appendChild(h('div', 'empty-note', 'Serve the same people a few times and they\'ll become regulars.'));
        for (const [k, r] of regs) list.appendChild(rowEl({ icon: RECIPES[r.fav]?.icon || 'heart', title: r.name + (r.visits >= 3 ? ' <span class="pill new">Khách quen</span>' : ''), sub: `Đã ghé ${r.visits} lần · Favourite: ${RECIPES[r.fav]?.vi || '—'}` }));
      } else {
        for (const [id, a] of Object.entries(ACHIEVEMENTS)) { const got = s.achievements.includes(id); list.appendChild(rowEl({ icon: got ? 'lantern' : 'tile', title: got ? a.en : '— — —', sub: a.desc, dim: !got })); }
      }
    });
  } });
}

// ---------------------------------------------------------------- business menu (recipes, daily special, upgrades)
export function openBizMenu(bizId, { onUpgrade } = {}) {
  const s = G.state, def = BUSINESSES[bizId], b = s.biz[bizId];
  openSheet({ title: def.name, sub: `${def.en} · Level ${b.level}`, full: true, build: (body, api) => {
    tabs(body, ['Thực đơn', 'Món đặc biệt', 'Nâng cấp', 'Thống kê'], (i, pane) => {
      const list = h('div', 'list'); pane.appendChild(list);
      const recs = bizRecipes(bizId);
      if (i === 0) {
        if (!recs.length) list.appendChild(h('div', 'empty-note', 'No recipes yet — Mèo Mây might know one!'));
        for (const r of recs) {
          const R = RECIPES[r], ok = canMake(bizId, r);
          const steps = R.steps.map(st => `<img src="${iconURL(STATION[st].icon === 'blend' || STATION[st].action ? 'ice' : STATION[st].icon, 22)}" style="width:20px;height:20px;vertical-align:middle">`).join(' ');
          list.appendChild(rowEl({ icon: R.icon, title: `${R.vi} · ${recipePrice(bizId, r)}k`, sub: `${steps}<br>${ok ? '<span style="color:#2f7f45">Sẵn sàng · Ready</span>' : '<span style="color:#b3453a">Thiếu nguyên liệu · Missing ingredients</span>'}` }));
        }
      } else if (i === 1) {
        list.appendChild(h('div', 'empty-note', 'Món đặc biệt hôm nay: 10% pricier, bigger tips, and it draws more customers. Mèo Mây picks one each morning — you can change it.'));
        for (const r of recs) {
          const on = b.special === r;
          list.appendChild(rowEl({ icon: RECIPES[r].icon, title: RECIPES[r].vi + (on ? ' <span class="pill new">Hôm nay</span>' : ''), right: btn(on ? '★' : 'Chọn', () => { b.special = on ? null : r; markDirty(true); sfx('ui'); api.rebuild(); }, on ? 'buy pink' : 'buy alt') }));
        }
      } else if (i === 2) {
        const ups = def.upgrades || [];
        for (let lv = 2; lv < ups.length; lv++) {
          const u = ups[lv]; if (!u) continue;
          const done = b.level >= lv, next = b.level === lv - 1;
          const need = h('div', 'need');
          need.innerHTML = `<span class="${s.money >= u.cost ? 'ok' : 'no'}"><img src="${iconURL('coin', 22)}">${u.cost}k</span>` + Object.entries(u.mats || {}).map(([k, n]) => `<span class="${mats(k) >= n ? 'ok' : 'no'}"><img src="${iconURL(k, 22)}">${mats(k)}/${n}</span>`).join('');
          const r = rowEl({ icon: lv === 2 ? 'lantern' : 'cable', title: `Level ${lv}: ${u.label}`, sub: done ? 'Đã nâng cấp · Done' : `Queue ${u.queue || u.tables || ''} · attracts more customers` });
          r.querySelector('.info').appendChild(need);
          if (!done) r.appendChild(btn('Nâng cấp', () => {
            if (s.money < u.cost || !hasMats(u.mats)) { sfx('error'); toast({ text: 'Chưa đủ', sub: 'Need more money or materials (Chú Bảy sells them)', bad: true }); return; }
            api.close(true); onUpgrade?.(lv);
          }, 'buy', !next));
          list.appendChild(r);
        }
        if (ups.length <= 2) list.appendChild(h('div', 'empty-note', 'Chưa có nâng cấp · No upgrades here yet.'));
      } else {
        const t = s.today.biz[bizId] || { served: 0, revenue: 0, perfect: 0 };
        list.appendChild(rowEl({ icon: 'coin', title: `Hôm nay: ${t.served} khách · ${money(t.revenue)}`, sub: `Today · ${t.perfect} perfect` }));
        list.appendChild(rowEl({ icon: 'lantern', title: `Tổng: ${b.stats.served} khách · ${money(b.stats.revenue)}`, sub: 'All time' }));
      }
    }, 0, api);
  } });
}

// ---------------------------------------------------------------- requirement sheet (repair / buy / restore)
export function openRequirement({ title, sub, icon, cost = 0, mats: need = {}, action, actionLabel, note = '', who = null }) {
  const s = G.state;
  return openSheet({ title, sub, who, build: (body, api) => {
    const wrap = h('div', 'scroll'); body.appendChild(wrap);
    if (note) wrap.appendChild(h('div', 'empty-note', escapeHtml(note)));
    const n = h('div', 'need');
    if (cost) n.innerHTML += `<span class="${s.money >= cost ? 'ok' : 'no'}"><img src="${iconURL('coin', 22)}">${money(cost)}</span>`;
    for (const [k, v] of Object.entries(need)) n.innerHTML += `<span class="${mats(k) >= v ? 'ok' : 'no'}"><img src="${iconURL(k, 22)}">${MATERIALS[k].vi} ${mats(k)}/${v}</span>`;
    wrap.appendChild(n);
    const ready = s.money >= cost && hasMats(need);
    const foot = h('div', 'foot');
    foot.appendChild(btn(actionLabel, () => { if (!ready) return; api.close(true); action(); }, 'btn big' + (ready ? ' pink' : ''), !ready));
    body.appendChild(foot);
    if (!ready) wrap.appendChild(h('div', 'empty-note', Object.keys(need).length ? 'Chú Bảy\'s material shop on Market Street sells what you need.' : 'Keep earning — you\'re nearly there!'));
  } });
}

// ---------------------------------------------------------------- Mèo Mây's recipe notebook
export function openRecipeBook({ onDiscover } = {}) {
  const s = G.state;
  openSheet({ title: 'Sổ tay của Mèo Mây', sub: "Mèo Mây's recipe notebook", who: 'meo', full: true, build: (body, api) => {
    const list = h('div', 'list scroll'); list.style.flex = '1'; body.appendChild(list);
    const avail = availableRecipes();
    if (avail.length) list.appendChild(h('div', 'section-title', 'Công thức mới · Ready to learn'));
    for (const id of avail) {
      const R = RECIPES[id];
      list.appendChild(rowEl({ icon: R.icon, title: R.vi + ' <span class="pill new">Mới!</span>', sub: R.en, right: btn('Học', () => { api.close(true); onDiscover?.(id); }, 'buy pink') }));
    }
    list.appendChild(h('div', 'section-title', 'Nâng cấp công thức · Upgrade recipes'));
    for (const id of s.recipes) {
      const R = RECIPES[id], lv = s.recipeLevels[id] || 1, next = RECIPE_UPGRADES[lv + 1];
      const r = rowEl({ icon: R.icon, title: `${R.vi} <span class="pill lv">Lv ${lv}</span>`, sub: next ? `${next.label}: +${Math.round((next.price - 1) * 100)}% price, calmer customers, bigger tips` : 'Hoàn hảo! Fully upgraded.' });
      if (next) r.appendChild(btn(money(next.cost), () => {
        if (!canAfford(next.cost)) { sfx('error'); toast({ text: 'Không đủ tiền', sub: 'Not enough money', bad: true }); return; }
        addMoney(-next.cost, 'upgrade'); s.recipeLevels[id] = lv + 1; markDirty(true); sfx('success');
        toast({ text: `${R.vi} lên Lv ${lv + 1}!`, sub: next.label, icon: R.icon }); api.rebuild();
      }));
      list.appendChild(r);
    }
    const locked = Object.keys(RECIPES).filter(id => !s.recipes.includes(id) && !avail.includes(id));
    if (locked.length) {
      list.appendChild(h('div', 'section-title', 'Sắp tới · Coming later'));
      for (const id of locked) { const R = RECIPES[id]; const why = s.story.chapter < R.chapter ? `Chương ${R.chapter}` : `Cần ${R.needRep} danh tiếng · reputation`; list.appendChild(rowEl({ icon: 'rice_paper', title: '???', sub: why, dim: true })); }
    }
  } });
}
export function availableRecipes() {
  const s = G.state;
  return Object.entries(RECIPES).filter(([id, r]) => !s.recipes.includes(id) && s.story.chapter >= r.chapter && r.needRep && s.reputation >= r.needRep && bizUnlockedFor(r.biz)).map(([id]) => id);
}
function bizUnlockedFor(kind) { return Object.entries(BUSINESSES).some(([id, d]) => d.biz === kind && G.state.biz[id].owned); }

// ---------------------------------------------------------------- journal
export function openJournal() {
  const s = G.state;
  const LORE = [
    [1, 'The island used to be called Đảo Mây — Cloud Island — because the morning mist hides it from passing boats.'],
    [2, 'The first shed was Bà Tư\'s tea stand. She sold trà tắc to fishermen for forty years.'],
    [3, 'When the ferry company cut the route, visitors stopped coming, and the shops closed one by one.'],
    [4, 'Mèo Mây arrived on a fishing boat as a kitten. Chú Hải says it chose the island, not the other way round.'],
    [5, 'The Night Market lanterns were made by Bà Sáu\'s mother. Every family on the island owns one.'],
    [6, 'The restaurant on the hill once cooked for the island\'s weddings. Its kitchen still smells faintly of star anise.'],
    [7, 'Mèo Mây has been waiting for someone who would stay. It never said so — but its tail says a lot.'],
  ];
  openSheet({ title: 'Kỷ niệm của đảo', sub: 'Island memories', who: 'meo', full: true, build: (body) => {
    const list = h('div', 'list scroll'); list.style.flex = '1'; body.appendChild(list);
    for (let i = 1; i < CHAPTERS.length; i++) {
      const ch = CHAPTERS[i], got = s.story.chapter > i || (s.story.chapter === i);
      list.appendChild(rowEl({ icon: got ? 'lantern' : 'tile', title: got ? `Chương ${i}: ${ch.vi}` : `Chương ${i}: ???`, sub: got ? ch.title : 'Locked', dim: !got }));
    }
    list.appendChild(h('div', 'section-title', 'Chuyện xưa · Stories Mèo Mây told you'));
    for (const [ch, text] of LORE) { if (s.story.chapter >= ch) list.appendChild(rowEl({ icon: 'notebook', title: escapeHtml(text) })); }
  } });
}
export { repStars };
