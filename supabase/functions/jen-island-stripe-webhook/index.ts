// Stripe → JEN Island purchases. Stripe calls this after a checkout is paid; it checks
// Stripe's signature, then records the product for the player (jen_island_purchases).
// The game reads that table on start (js/systems/store.js); players can't write it.
//
// Set up (once there is a Stripe account):
//   supabase secrets set STRIPE_SECRET_KEY=sk_live_… STRIPE_WEBHOOK_SECRET=whsec_…
//   supabase functions deploy jen-island-stripe-webhook --no-verify-jwt
// In Stripe: create a Payment Link per product with metadata product_id = supporter
// (or pass_s1), and a webhook for checkout.session.completed pointing at this function.
// Then set STORE.payments = true and the links in STORE.checkout.

import Stripe from 'https://esm.sh/stripe@17?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const PRODUCTS = new Set(['supporter', 'pass_s1']);

Deno.serve(async req => {
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('missing signature', { status: 400 });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, Stripe.createSubtleCryptoProvider());
  } catch {
    return new Response('bad signature', { status: 400 });
  }
  if (event.type !== 'checkout.session.completed') return new Response('ignored');
  const s = event.data.object as Stripe.Checkout.Session;
  const userId = s.client_reference_id, product = s.metadata?.product_id;
  if (s.payment_status !== 'paid' || !userId || !product || !PRODUCTS.has(product)) return new Response('ignored');
  const { error } = await db.from('jen_island_purchases').upsert(
    { user_id: userId, product_id: product, provider: 'stripe', provider_ref: s.id },
    { onConflict: 'provider_ref', ignoreDuplicates: true },
  );
  if (error) return new Response('could not record purchase', { status: 500 });   // Stripe retries
  return new Response('ok');
});
