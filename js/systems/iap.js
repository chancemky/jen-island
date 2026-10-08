// In-app purchases in the App Store / Google Play apps, through RevenueCat
// (@revenuecat/purchases-capacitor). Apple and Google require their own payment system
// for in-app goods, so the apps never show the Stripe links the website uses.
// The purchase is recorded by the server (RevenueCat webhook → jen_island_purchases);
// the game then picks it up like any other purchase (store.js syncPurchases).
// Fill in IAP.keys with the RevenueCat public SDK keys once the store products exist.

import { G } from './state.js';
import { nativeApp } from '../core/util.js';

export const IAP = {
  keys: { ios: '', android: '' },                                                 // RevenueCat → Project → API keys (public)
  products: { supporter: 'bistro_supporter', pass_s1: 'bistro_pass_s1', pass_s2: 'bistro_pass_s2', lounge: 'bistro_lounge' },        // the store product ids (non-consumable)
};
const plugin = () => nativeApp() ? window.Capacitor?.Plugins?.Purchases : null;
const key = () => IAP.keys[window.Capacitor?.getPlatform?.()] || '';
let ready = null, user = null, prices = {};
export const iapReady = () => !!plugin() && !!key();
async function setup() {
  const P = plugin(); if (!P || !key() || !G.user || G.user.local) return null;
  if (ready && user === G.user.id) return ready;
  user = G.user.id;
  ready = (async () => {
    await P.configure({ apiKey: key(), appUserID: G.user.id });               // the player's account id = RevenueCat's app user id
    try {
      const { products } = await P.getProducts({ productIdentifiers: Object.values(IAP.products), type: 'NON_SUBSCRIPTION' });
      for (const p of products || []) prices[p.identifier] = p;
    } catch { /* prices fall back to the list price */ }
    return P;
  })().catch(e => { console.warn('iap', e?.message); ready = null; return null; });
  return ready;
}
export function iapPrice(id) { return prices[IAP.products[id]]?.priceString || null; }
// resolves 'bought', 'cancelled' or 'failed'
export async function iapBuy(id) {
  const P = await setup(); const sp = prices[IAP.products[id]];
  if (!P || !sp) return 'failed';
  try { await P.purchaseStoreProduct({ product: sp }); return 'bought'; }
  catch (e) { return e?.userCancelled || /cancel/i.test(e?.message || '') ? 'cancelled' : 'failed'; }
}
export async function iapRestore() { const P = await setup(); if (!P) return false; try { await P.restorePurchases(); return true; } catch { return false; } }
export function initIAP() { if (iapReady()) setup(); }
