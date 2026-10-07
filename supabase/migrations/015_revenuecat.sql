-- In-app purchases in the App Store / Google Play apps go through RevenueCat. RevenueCat
-- calls the jen-island-revenuecat-webhook edge function, which checks the shared secret
-- (Vault: jen_island_revenuecat_webhook, the same value set as the webhook's Authorization
-- header in the RevenueCat dashboard) and records the product in jen_island_purchases.
create or replace function public.jen_island_rc_secret()
returns text language sql stable security definer set search_path = ''
as $$ select decrypted_secret from vault.decrypted_secrets where name = 'jen_island_revenuecat_webhook' limit 1 $$;
revoke all on function public.jen_island_rc_secret() from public, anon, authenticated;
grant execute on function public.jen_island_rc_secret() to service_role;
