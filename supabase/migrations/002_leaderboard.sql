-- JEN Island global leaderboard. Isolated jen_island_* table in the shared
-- project; unrelated simulator tables are untouched.
-- Each player can only write (and read directly) their own row. Everyone
-- signed in can see the public ranking through jen_island_leaderboard_top(),
-- which returns display fields only (never user ids or emails).

create table if not exists public.jen_island_leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  player_name text not null default '' check (char_length(player_name) <= 40),
  island_name text not null default '' check (char_length(island_name) <= 40),
  level integer not null default 1 check (level between 1 and 100000),
  xp bigint not null default 0 check (xp >= 0),
  money bigint not null default 0 check (money between -1000000000 and 100000000000),
  lifetime bigint not null default 0 check (lifetime >= 0),
  served integer not null default 0 check (served >= 0),
  day integer not null default 1 check (day >= 1),
  updated_at timestamptz not null default now()
);

create index if not exists jen_island_leaderboard_level_idx on public.jen_island_leaderboard (level desc, xp desc);
create index if not exists jen_island_leaderboard_money_idx on public.jen_island_leaderboard (money desc);

alter table public.jen_island_leaderboard enable row level security;
revoke all on public.jen_island_leaderboard from anon;
grant select, insert, update on public.jen_island_leaderboard to authenticated;

drop policy if exists "jen_island_lb_select_own" on public.jen_island_leaderboard;
create policy "jen_island_lb_select_own"
on public.jen_island_leaderboard for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "jen_island_lb_insert_own" on public.jen_island_leaderboard;
create policy "jen_island_lb_insert_own"
on public.jen_island_leaderboard for insert to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "jen_island_lb_update_own" on public.jen_island_leaderboard;
create policy "jen_island_lb_update_own"
on public.jen_island_leaderboard for update to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Public ranking: display fields only. sort = 'level' | 'money' | 'served'.
create or replace function public.jen_island_leaderboard_top(sort text default 'level', lim integer default 50)
returns table (rank bigint, player_name text, island_name text, level integer, money bigint, served integer, day integer, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select l.player_name, l.island_name, l.level, l.money, l.served, l.day, (l.user_id = (select auth.uid())) as is_me,
      row_number() over (order by
        case when sort = 'money' then l.money when sort = 'served' then l.served::bigint else l.level::bigint end desc,
        case when sort = 'level' then l.xp else l.level::bigint end desc,
        l.updated_at asc) as rank
    from public.jen_island_leaderboard l
    where l.player_name <> ''
  )
  select r.rank, r.player_name, r.island_name, r.level, r.money, r.served, r.day, r.is_me
  from ranked r
  where r.rank <= least(greatest(coalesce(lim, 50), 1), 100) or r.is_me
  order by r.rank;
$$;

revoke all on function public.jen_island_leaderboard_top(text, integer) from public, anon;
grant execute on function public.jen_island_leaderboard_top(text, integer) to authenticated;
