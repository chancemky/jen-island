// RevenueCat → Bistro Island purchases (the App Store / Google Play apps).
// RevenueCat sends every event with the Authorization header set in its dashboard; it must
// match the Vault secret jen_island_revenuecat_webhook (read via jen_island_rc_secret()).
// The app logs into RevenueCat with the player's Supabase user id, so app_user_id is
// the player. Store product ids map to the game's products below.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const PRODUCTS: Record<string, string> = { bistro_supporter: 'supporter', bistro_pass_s1: 'pass_s1' };
const BUY = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let secret: string | null = null;

Deno.serve(async req => {
  if (!secret) { const { data } = await db.rpc('jen_island_rc_secret'); secret = (data as string) || null; }
  const auth = req.headers.get('authorization') || '';
  if (!secret || auth.length !== secret.length || [...auth].reduce((d, c, i) => d | (c.charCodeAt(0) ^ secret!.charCodeAt(i)), 0) !== 0) return new Response('unauthorized', { status: 401 });
  const { event } = await req.json().catch(() => ({ event: null }));
  if (!event || !BUY.has(event.type)) return new Response('ignored');
  const product = PRODUCTS[event.product_id], user = event.app_user_id;
  if (!product || !UUID.test(user || '')) return new Response('ignored');
  const { error } = await db.from('jen_island_purchases').upsert(
    { user_id: user, product_id: product, provider: event.store === 'PLAY_STORE' ? 'google' : 'apple', provider_ref: 'rc:' + (event.transaction_id || event.id) },
    { onConflict: 'provider_ref', ignoreDuplicates: true },
  );
  if (error) return new Response('could not record purchase', { status: 500 });   // RevenueCat retries
  return new Response('ok');
});
