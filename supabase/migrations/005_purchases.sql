-- JEN Island purchases (cosmetic only). Rows are written by the payment webhook with
-- the service role; players can read their own rows and nothing else. The game copies
-- what it finds here into the save (js/systems/store.js), so editing a save can't
-- unlock a purchase that never happened.

create table if not exists public.jen_island_purchases (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null check (char_length(product_id) <= 40),
  provider text not null default 'stripe',
  provider_ref text unique,
  created_at timestamptz not null default now()
);
create index if not exists jen_island_purchases_user_idx on public.jen_island_purchases (user_id);

alter table public.jen_island_purchases enable row level security;
revoke all on public.jen_island_purchases from anon, authenticated;
grant select on public.jen_island_purchases to authenticated;

drop policy if exists "jen_island_purchases_select_own" on public.jen_island_purchases;
create policy "jen_island_purchases_select_own"
on public.jen_island_purchases for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- The Stripe webhooks' signing secrets are kept in Supabase Vault (names starting with
-- jen_island_stripe_webhook); only the service role (the edge function) can read them.
create or replace function public.jen_island_stripe_secret()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select string_agg(decrypted_secret, ',') from vault.decrypted_secrets where name like 'jen_island_stripe_webhook%' $$;
revoke all on function public.jen_island_stripe_secret() from public, anon, authenticated;
grant execute on function public.jen_island_stripe_secret() to service_role;
