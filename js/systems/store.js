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
import { bus, devHost, nativeApp, islandNow, jstDate } from '../core/util.js';
import { CLOTHES } from '../data/wardrobe.js';
import * as cloud from './cloud.js';
import { grantServerBadge } from './badges.js';
import { iapReady, iapBuy } from './iap.js';

const local = devHost();
export const STORE = {
  payments: false,   // live purchases: turn on once Stripe's live webhook is set up (see README → Payments)
  checkout: { supporter: 'https://buy.stripe.com/6oU6oH0q4dGyghvckxeEo00', pass_s1: 'https://buy.stripe.com/3cI6oHc8M9qi5CR3O1eEo01' },   // live Payment Links (the player's id is added as client_reference_id)
  // Stripe sandbox links: used on a local copy, so the whole flow can be tried with test cards
  test: { supporter: 'https://buy.stripe.com/test_6oU6oH0q4dGyghvckxeEo00', pass_s1: 'https://buy.stripe.com/test_3cI6oHc8M9qi5CR3O1eEo01' },
};
// the store screen shows on the live site once payments are on; before that only
// on a local copy, so it can be checked
// (not in the store apps: Apple and Google need their own in-app purchases for these)
export const storeVisible = () => nativeApp() ? iapReady() : (STORE.payments || local);

export const PRODUCTS = {
  supporter: {
    en: 'Island Supporter Pack', vi: 'Gói Ủng Hộ Đảo', price: '$4.99',
    blurb: ['Help keep Bistro Island growing. A thank-you outfit set, yours forever.', 'Giúp Bistro Island tiếp tục phát triển. Một bộ trang phục cảm ơn, của bạn mãi mãi.'],
    clothes: ['ao_dai_rose', 'lantern_bow', 'supporter_scarf'],
  },
  pass_s1: {
    en: 'Lantern Season Pass', vi: 'Vé Mùa Lồng Đèn', price: '$2.99',
    blurb: ['Unlocks the supporter track of this season\'s pass. The free track stays free for everyone.', 'Mở nhánh ủng hộ của vé mùa này. Nhánh miễn phí luôn miễn phí cho mọi người.'],
    clothes: [],   // rewards come from the pass tiers below
  },
  pass_s2: {
    en: 'Tết Season Pass', vi: 'Vé Mùa Tết', price: '$2.99',
    blurb: ['Unlocks the supporter track of the Tết season. The free track stays free for everyone.', 'Mở nhánh ủng hộ của mùa Tết. Nhánh miễn phí luôn miễn phí cho mọi người.'],
    clothes: [],
  },
  lounge: {
    en: 'Lantern Lounge Bundle', vi: 'Gói Phòng Lồng Đèn', price: '$6.99',
    blurb: ['A velvet sofa with lantern cushions, a glowing lantern tree, a koi lamp and a matching robe. Purely for looks.', 'Sofa nhung gối lồng đèn, cây lồng đèn phát sáng, đèn cá koi và áo choàng đồng bộ. Chỉ để trang trí.'],
    clothes: ['lounge_robe'], furniture: ['lounge_sofa', 'lantern_tree', 'koi_lamp'],
  },
};

// The season pass: season points come from customers served during the season.
// Free rewards are for everyone; supporter rewards need pass_s1.
const SEASON_1 = {
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
const SEASON_2 = {
  id: 's2', en: 'Tết Season', vi: 'Mùa Tết', product: 'pass_s2',
  start: '2026-12-16', end: '2027-03-01',
  tiers: [
    { at: 40, free: 'mai_hairpin', paid: null },
    { at: 100, free: null, paid: 'gold_slippers' },
    { at: 180, free: 'lucky_tee', paid: null },
    { at: 280, free: null, paid: 'firework_hoodie' },
    { at: 360, free: 'nonla_blossom', paid: null },
    { at: 450, free: null, paid: 'aodai_tet' },
  ],
};
export const SEASONS = [SEASON_1, SEASON_2];
// the season on now (or the next one coming), read live: SEASON.id, SEASON.tiers…
export let SEASON = SEASON_1;
export function pickSeason(now = islandNow()) { SEASON = SEASONS.find(x => now < jstDate(x.end) + 864e5) || SEASONS[SEASONS.length - 1]; return SEASON; }
pickSeason();

const S = () => { const s = G.state; s.store ||= { season: {} }; s.store.season ||= {}; return s.store; };
const verified = new Set();               // products the server says this player bought
export const ownsProduct = id => verified.has(id);
const seasonOn = (now = islandNow()) => now >= jstDate(SEASON.start) && now < jstDate(SEASON.end) + 864e5;   // (dates in Japan time)
export const seasonPoints = () => S().season[SEASON.id]?.pts || 0;

function give(ids) {
  const w = G.state.wardrobe, got = [];
  for (const id of ids) if (CLOTHES[id]?.store && !w.owned.includes(id)) { w.owned.push(id); got.push(id); }
  return got;
}
// bundle furniture: delivered home once (remembered in the save)
function giveFurniture(pid) {
  const s = G.state, f = PRODUCTS[pid]?.furniture; if (!f) return;
  const done = (s.store.furnished ||= []); if (done.includes(pid)) return;
  done.push(pid); for (const id of f) (s.home.owned ||= []).push(id);
}
// the server is the only record of purchases: copy what it says into the save
export async function syncPurchases() {
  pickSeason();
  if (!cloud.hasSession()) return [];
  let rows;
  try { rows = await cloud.loadPurchases(); } catch { return []; }
  const fresh = [];
  for (const { product_id: id } of rows || []) {
    if (!PRODUCTS[id] || verified.has(id)) continue;
    verified.add(id); fresh.push(id);
    give(PRODUCTS[id].clothes); giveFurniture(id);
  }
  if (verified.size) grantServerBadge('supporter');
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

// Start a purchase: 'redirect' to Stripe, 'account' (needs a signed-in account), or 'off'.
export function buy(id) {
  if (nativeApp()) {                                              // the store apps: Apple / Google pay, via RevenueCat
    if (!iapReady()) return 'off';
    if (!G.user || G.user.local) return 'account';
    iapBuy(id).then(r => {
      if (r === 'bought') purchaseThanks();
      else if (r === 'failed') bus.emit('toast', { text: T('The purchase didn\'t go through', 'Giao dịch chưa thành công'), sub: T('Nothing was charged. Please try again.', 'Bạn chưa bị trừ tiền. Hãy thử lại.'), icon: 'heart', bad: true });
    });
    return 'iap';
  }
  const link = STORE.payments ? STORE.checkout[id] : local ? STORE.test[id] : null;
  if (!link) return 'off';
  if (!G.user || G.user.local) return 'account';                 // purchases belong to an account, so they're never lost
  location.href = `${link}${link.includes('?') ? '&' : '?'}client_reference_id=${encodeURIComponent(G.user.id)}`;
  return 'redirect';
}

// Back from Stripe (?purchase=<product>): thank the player and pick the purchase up once
// the webhook has recorded it (usually within a few seconds).
export function purchaseReturn() {
  const q = new URLSearchParams(location.search), id = q.get('purchase');
  if (!id || !PRODUCTS[id]) return;
  history.replaceState(null, '', location.pathname);
  purchaseThanks();
}
function purchaseThanks() {
  bus.emit('toast', { text: T('Thank you for supporting Bistro Island!', 'Cảm ơn bạn đã ủng hộ Bistro Island!'), sub: T('Your items are on their way to your wardrobe.', 'Món đồ đang được gửi tới tủ quần áo của bạn.'), icon: 'heart', ms: 5000 });
  let tries = 0; const poll = async () => { if ((await syncPurchases()).length || ++tries > 10) return; setTimeout(poll, 3000); }; setTimeout(poll, 1500);
}
