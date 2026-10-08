// Stripe → Bistro Island purchases. Stripe calls this after a checkout is paid; it checks
// Stripe's signature, then records the product for the player (jen_island_purchases).
// The game reads that table on start (js/systems/store.js); players can't write it.
//
// The webhook signing secrets live in Supabase Vault (names starting with
// jen_island_stripe_webhook: the sandbox one and, for real money, jen_island_stripe_webhook_live)
// and are read through jen_island_stripe_secret(), which only the service role may call.
// Each Payment Link carries metadata product_id (supporter / pass_s1) and the game adds
// the player's id as client_reference_id.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const PRODUCTS = new Set(['supporter', 'pass_s1', 'pass_s2', 'lounge']);
const enc = new TextEncoder();
let secrets: string[] | null = null;

async function signingSecrets() {
  if (!secrets) { const { data, error } = await db.rpc('jen_island_stripe_secret'); if (error || !data) throw new Error('no webhook secret'); secrets = (data as string).split(','); }
  return secrets;
}
// Stripe-Signature: t=<unix time>,v1=<hex hmac of "t.payload">[,v1=…]
async function verified(payload: string, header: string) {
  const parts = header.split(',').map(p => p.split('=')), t = parts.find(([k]) => k === 't')?.[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - +t) > 300) return false;
  for (const secret of await signingSecrets()) {          // (sandbox and live each sign with their own secret)
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`)));
    const hex = [...mac].map(b => b.toString(16).padStart(2, '0')).join('');
    if (sigs.some(s => s.length === hex.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0)) return true;
  }
  return false;
}

Deno.serve(async req => {
  const payload = await req.text(), sig = req.headers.get('stripe-signature');
  if (!sig || !(await verified(payload, sig).catch(() => false))) return new Response('bad signature', { status: 400 });
  const event = JSON.parse(payload);
  if (event.type !== 'checkout.session.completed') return new Response('ignored');
  const s = event.data.object;
  const userId = s.client_reference_id, product = s.metadata?.product_id;
  if (s.payment_status !== 'paid' || !userId || !PRODUCTS.has(product)) return new Response('ignored');
  const { error } = await db.from('jen_island_purchases').upsert(
    { user_id: userId, product_id: product, provider: 'stripe', provider_ref: s.id },
    { onConflict: 'provider_ref', ignoreDuplicates: true },
  );
  if (error) return new Response('could not record purchase', { status: 500 });   // Stripe retries
  return new Response('ok');
});
