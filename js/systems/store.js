// The supporter store: optional, cosmetic-only purchases and a seasonal pass.
//
// Nothing here makes anyone stronger, richer or faster. Every reward is a piece of
// clothing (data/wardrobe.js, `store: true`): never sold in the boutique and never
// counted for milestones or achievements.
//
// Purchases are recorded only by the server (a payment webhook writes the
// jen_island_purchases table, which players can read but never write), so a save
// edit can't unlock them. Switched off until a payment provider is connected:
// set STORE.payments and fill in STORE.checkout with each product's checkout link.

import { G, T, markDirty } from './state.js';
import { bus } from '../core/util.js';
import { CLOTHES } from '../data/wardrobe.js';
import * as cloud from './cloud.js';

export const STORE = {
  payments: false,   // real purchases (needs the checkout links below and the webhook)
  checkout: { supporter: '', pass_s1: '' },   // payment links (the player's id is added as client_reference_id)
};
// the store screen shows on the live site once payments are on; before that only
// on a local copy, so it can be checked
export const storeVisible = () => STORE.payments || ['localhost', '127.0.0.1'].includes(location.hostname);

export const PRODUCTS = {
  supporter: {
    en: 'Island Supporter Pack', vi: 'Gói Ủng Hộ Đảo', price: '$4.99',
    blurb: ['Help keep JEN Island growing. A thank-you outfit set, yours forever.', 'Giúp JEN Island tiếp tục phát triển. Một bộ trang phục cảm ơn, của bạn mãi mãi.'],
    clothes: ['ao_dai_rose', 'lantern_bow', 'supporter_scarf'],
  },
  pass_s1: {
    en: 'Lantern Season Pass', vi: 'Vé Mùa Lồng Đèn', price: '$2.99',
    blurb: ['Unlocks the supporter track of this season\'s pass. The free track stays free for everyone.', 'Mở nhánh ủng hộ của vé mùa này. Nhánh miễn phí luôn miễn phí cho mọi người.'],
    clothes: [],   // rewards come from the pass tiers below
  },
};

// The season pass: season points come from customers served during the season.
// Free rewards are for everyone; supporter rewards need pass_s1.
export const SEASON = {
  id: 's1', en: 'Lantern Season', vi: 'Mùa Lồng Đèn', product: 'pass_s1',
  start: '2026-10-15', end: '2026-12-15',
  tiers: [
    { at: 40, free: null, paid: 'ao_dai_jade' },
    { at: 100, free: 'nonla_painted', paid: null },
    { at: 180, free: null, paid: 'firefly_hoodie' },
    { at: 280, free: 'lantern_tee', paid: null },
    { at: 400, free: null, paid: 'nonla_gold' },
  ],
};

const S = () => { const s = G.state; s.store ||= { season: {} }; s.store.season ||= {}; return s.store; };
const verified = new Set();               // products the server says this player bought
export const ownsProduct = id => verified.has(id);
const seasonOn = (now = Date.now()) => now >= Date.parse(SEASON.start) && now < Date.parse(SEASON.end) + 864e5;
export const seasonPoints = () => S().season[SEASON.id]?.pts || 0;

function give(ids) {
  const w = G.state.wardrobe, got = [];
  for (const id of ids) if (CLOTHES[id]?.store && !w.owned.includes(id)) { w.owned.push(id); got.push(id); }
  return got;
}
// the server is the only record of purchases: copy what it says into the save
export async function syncPurchases() {
  if (!cloud.hasSession()) return [];
  let rows;
  try { rows = await cloud.loadPurchases(); } catch { return []; }
  const fresh = [];
  for (const { product_id: id } of rows || []) {
    if (!PRODUCTS[id] || verified.has(id)) continue;
    verified.add(id); fresh.push(id);
    give(PRODUCTS[id].clothes);
  }
  if (fresh.length) { claimSeason(); markDirty(true); }
  return fresh;
}
// every customer served during the season is a point; tiers unlock as they're reached
export function seasonServed(n = 1) {
  if (!seasonOn()) return;
  const r = (S().season[SEASON.id] ||= { pts: 0, got: [] });
  r.pts += n;
  if (claimSeason().length) markDirty(true);
}
function claimSeason() {
  const r = S().season[SEASON.id]; if (!r) return [];
  const paid = ownsProduct(SEASON.product), got = [];
  for (const t of SEASON.tiers) if (r.pts >= t.at) for (const id of [t.free, paid ? t.paid : null]) if (id && !r.got.includes(id)) { r.got.push(id); got.push(...give([id])); }
  if (got.length) bus.emit('toast', { text: T('Season reward unlocked!', 'Mở khóa phần thưởng mùa!'), sub: got.map(id => T(CLOTHES[id].en, CLOTHES[id].vi)).join(' · '), icon: 'shirt' });
  return got;
}
export const seasonState = () => ({ on: seasonOn(), pts: seasonPoints(), paid: ownsProduct(SEASON.product), got: S().season[SEASON.id]?.got || [] });

// Start a purchase. Returns 'off' while payments are switched off.
export function buy(id) {
  const link = STORE.checkout[id];
  if (!STORE.payments || !link || !G.user || G.user.local) return 'off';
  location.href = `${link}${link.includes('?') ? '&' : '?'}client_reference_id=${encodeURIComponent(G.user.id)}`;
  return 'redirect';
}
