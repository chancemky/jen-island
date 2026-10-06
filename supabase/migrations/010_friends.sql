-- Friends: every account publishes a small showcase (names, level, badge, look and the
-- layout of their home) under a random friend code. Friends can visit each other's homes
-- and send one gift a day. Names go through the same filter as the leaderboard.

create table if not exists public.jen_island_showcase (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  player_name text not null default '' check (char_length(player_name) <= 40),
  island_name text not null default '' check (char_length(island_name) <= 40),
  level integer not null default 1,
  day integer not null default 1,
  chapter integer not null default 1,
  badge text check (char_length(badge) <= 24),
  look jsonb check (octet_length(look::text) <= 4000),
  home jsonb check (octet_length(home::text) <= 20000),
  updated_at timestamptz not null default now()
);
create table if not exists public.jen_island_friends (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);
create table if not exists public.jen_island_gifts (
  id bigint generated always as identity primary key,
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('basket', 'flowers', 'lanterns')),
  sent_on date not null default current_date,
  claimed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (from_id, to_id, sent_on)
);

-- names: trimmed and filtered; the showcase can't fake a badge it can't hold
create or replace function public.jen_island_showcase_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.player_name := left(btrim(new.player_name), 40); new.island_name := left(btrim(new.island_name), 40);
  if public.jen_island_name_blocked(new.player_name) then new.player_name := 'Islander'; end if;
  if public.jen_island_name_blocked(new.island_name) then new.island_name := 'Island'; end if;
  if new.badge is not null and not public.jen_island_badge_ok(new.badge, new.user_id, 0, 0) then new.badge := null; end if;
  if tg_op = 'UPDATE' then new.code := old.code; end if;          -- a code never changes
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists jen_island_showcase_guard on public.jen_island_showcase;
create trigger jen_island_showcase_guard before insert or update on public.jen_island_showcase for each row execute function public.jen_island_showcase_guard();
revoke all on function public.jen_island_showcase_guard() from public, anon, authenticated;

alter table public.jen_island_showcase enable row level security;
alter table public.jen_island_friends enable row level security;
alter table public.jen_island_gifts enable row level security;
revoke all on public.jen_island_showcase, public.jen_island_friends, public.jen_island_gifts from anon, authenticated;
grant select, insert, update on public.jen_island_showcase to authenticated;
grant select, insert, delete on public.jen_island_friends to authenticated;
grant select, insert on public.jen_island_gifts to authenticated;
grant update (claimed) on public.jen_island_gifts to authenticated;

-- showcases: everyone signed in can read them (it's what visitors see); only you write yours
drop policy if exists "jen_island_showcase_read" on public.jen_island_showcase;
create policy "jen_island_showcase_read" on public.jen_island_showcase for select to authenticated using (true);
drop policy if exists "jen_island_showcase_write" on public.jen_island_showcase;
create policy "jen_island_showcase_write" on public.jen_island_showcase for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "jen_island_showcase_update" on public.jen_island_showcase;
create policy "jen_island_showcase_update" on public.jen_island_showcase for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- friends: your own list
drop policy if exists "jen_island_friends_own" on public.jen_island_friends;
create policy "jen_island_friends_own" on public.jen_island_friends for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- gifts: send only to a friend, as yourself; read what you sent or got; claim only yours
drop policy if exists "jen_island_gifts_send" on public.jen_island_gifts;
create policy "jen_island_gifts_send" on public.jen_island_gifts for insert to authenticated
  with check ((select auth.uid()) = from_id and exists (select 1 from public.jen_island_friends f where f.user_id = from_id and f.friend_id = to_id) and claimed = false);
drop policy if exists "jen_island_gifts_read" on public.jen_island_gifts;
create policy "jen_island_gifts_read" on public.jen_island_gifts for select to authenticated using ((select auth.uid()) in (from_id, to_id));
drop policy if exists "jen_island_gifts_claim" on public.jen_island_gifts;
create policy "jen_island_gifts_claim" on public.jen_island_gifts for update to authenticated using ((select auth.uid()) = to_id) with check ((select auth.uid()) = to_id);

-- add a friend by code (both sides become friends)
create or replace function public.jen_island_add_friend(friend_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); them uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  select user_id into them from public.jen_island_showcase where code = upper(btrim(friend_code));
  if them is null or them = me then return null; end if;
  insert into public.jen_island_friends (user_id, friend_id) values (me, them), (them, me) on conflict do nothing;
  return them;
end $$;
revoke all on function public.jen_island_add_friend(text) from public, anon;
grant execute on function public.jen_island_add_friend(text) to authenticated;
