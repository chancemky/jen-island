// The island's books: where the money comes from and where it goes.
//  • every money movement is filed under a category (sales, tips, ingredients, rent…)
//  • each business keeps its own daily profit & loss: sales, tips, cost of the food it
//    sold (recorded at the moment of sale), wages, deliveries and rent
//  • lifetime totals and profit, and a net-worth figure (cash + what you own)
// Nothing here changes the economy — it only keeps score.

import { G, T } from './state.js';
import { bus } from '../core/util.js';
import { BUSINESSES, INGREDIENTS, MATERIALS, FURNITURE } from '../data/game.js';

// reason passed to addMoney → category shown to the player
const CAT = {
  sale: 'sales', deposit: 'sales', tip: 'tips',
  level: 'rewards', milestone: 'rewards', quest: 'rewards', festival: 'rewards', keeper: 'rewards', gift: 'rewards', award: 'rewards', game: 'rewards', starter: 'rewards',
  ingredients: 'ingredients', delivery: 'deliveries', supply: 'deliveries',
  materials: 'materials', build: 'building', repair: 'building', restore: 'building', statue: 'building',
  upgrade: 'upgrades', recipe: 'upgrades', equipment: 'upgrades',
  rent: 'rent', wages: 'wages', hire: 'wages',
  business: 'businesses', key: 'businesses', property: 'property',
  furniture: 'home', clothes: 'personal', salon: 'personal', pet: 'personal', petfood: 'personal', snack: 'personal', buy: 'other',
};
export const CAT_NAMES = {
  sales: ['Sales', 'Bán hàng'], tips: ['Tips', 'Tiền boa'], rewards: ['Rewards', 'Phần thưởng'],
  ingredients: ['Ingredients', 'Nguyên liệu'], deliveries: ['Deliveries', 'Giao hàng'], materials: ['Materials', 'Vật liệu'],
  building: ['Building & repairs', 'Xây & sửa'], upgrades: ['Upgrades', 'Nâng cấp'], rent: ['Rent', 'Tiền thuê'], wages: ['Wages & hiring', 'Lương & tuyển'],
  businesses: ['New businesses', 'Mua quán'], property: ['Property', 'Bất động sản'], home: ['Home', 'Nhà'], personal: ['Personal', 'Cá nhân'], other: ['Other', 'Khác'],
};
export const catName = c => T(...(CAT_NAMES[c] || [c, c]));

function books() {
  const s = G.state;
  s.books ||= { in: {}, out: {}, cogs: 0 };
  s.today.money ||= { in: {}, out: {} };
  s.today.pnl ||= {};
  return s.books;
}
export function initLedger() {
  bus.on('money', (k, reason) => {
    if (!G.state || !k) return;
    const b = books(), cat = CAT[reason] || 'other', side = k > 0 ? 'in' : 'out', amt = Math.abs(k);
    b[side][cat] = (b[side][cat] || 0) + amt;
    const t = G.state.today.money; t[side][cat] = (t[side][cat] || 0) + amt;
  });
}
// a business's line for today
export function pnl(bizId) {
  books();
  return (G.state.today.pnl[bizId] ||= { sales: 0, tips: 0, cogs: 0, wages: 0, delivery: 0, rent: 0 });
}
export function recordSale(bizId, price, tip, cogs) {
  const p = pnl(bizId); p.sales += price; p.tips += tip; p.cogs += cogs;
  books().cogs += cogs;
}
export function recordCost(bizId, kind, amount) { if (amount) pnl(bizId)[kind] += amount; }
export const netOf = p => p.sales + p.tips - p.cogs - p.wages - p.delivery - p.rent;

// ---------------------------------------------------------------- totals
export function lifetimeTotals() {
  const b = books(), sum = o => Object.values(o).reduce((a, v) => a + v, 0);
  const inc = sum(b.in), out = sum(b.out);
  return { income: inc, spent: out, profit: inc - out, sales: b.in.sales || 0, tips: b.in.tips || 0 };
}
// what you own, valued at what it would cost to get again (roughly)
export function netWorth(propertyPrice) {
  const s = G.state;
  let biz = 0;
  for (const [id, def] of Object.entries(BUSINESSES)) {
    const z = s.biz[id]; if (!z?.owned) continue;
    biz += def.buy || 0;
    for (const [m, n] of Object.entries(def.repair || {})) biz += (MATERIALS[m]?.price || 0) * n;
    for (let lv = 2; lv <= (z.level || 1); lv++) biz += def.upgrades?.[lv]?.cost || 0;
  }
  let prop = 0; for (const id of Object.keys(s.property || {})) prop += propertyPrice ? propertyPrice(id) : 0;
  let stock = 0; for (const [k, n] of Object.entries(s.pantry || {})) stock += (INGREDIENTS[k]?.cost || 0) * n;
  for (const [k, n] of Object.entries(s.materials || {})) stock += (MATERIALS[k]?.price || 0) * n;
  let home = 0; for (const f of [...(s.home?.furniture || []).map(f => f.id), ...(s.home?.owned || [])]) home += FURNITURE[f]?.price || 0;
  const cash = Math.floor(s.money);
  return { cash, businesses: Math.round(biz), property: Math.round(prop), stock: Math.round(stock), home: Math.round(home), total: Math.round(cash + biz + prop + stock + home) };
}
// the day's books, for the summary card (spending by category, and each business's P&L)
export function daySheet() {
  books();
  const t = G.state.today, sum = o => Object.values(o).reduce((a, v) => a + v, 0);
  const round = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v >= 0.5).map(([k, v]) => [k, Math.round(v)]).sort((a, b) => b[1] - a[1]));
  const biz = {};
  for (const [id, p] of Object.entries(t.pnl)) biz[id] = { ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Math.round(v)])), net: Math.round(netOf(p)) };
  return { income: round(t.money.in), spending: round(t.money.out), totalIn: Math.round(sum(t.money.in)), totalOut: Math.round(sum(t.money.out)), biz };
}
