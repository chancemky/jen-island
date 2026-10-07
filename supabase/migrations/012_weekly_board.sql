-- Weekly leaderboard, rewards for the week's best, and characters on the ranking rows.
--
-- Weeks run Monday to Sunday on island time (Vietnam, UTC+7). What a player gains in a
-- week is recorded by an AFTER trigger on jen_island_leaderboard, so it only ever counts
-- totals the fair-play guard has already clamped. Every Monday a cron job writes the
-- previous week's top 10 of each board into jen_island_week_awards; the game reads those
-- (and hands out the trophy and coins once, remembered in the save). The all-time board
-- (jen_island_leaderboard_top) is unchanged apart from the new look column.

-- ---------------------------------------------------------------- the character on each row
alter table public.jen_island_leaderboard add column if not exists look jsonb
  check (look is null or pg_column_size(look) <= 2000);

-- ---------------------------------------------------------------- weekly gains
create or replace function public.jen_island_week_of(t timestamptz default now())
returns date language sql stable set search_path = ''
as $$ select date_trunc('week', t at time zone 'Asia/Ho_Chi_Minh')::date $$;
grant execute on function public.jen_island_week_of(timestamptz) to authenticated;

create table if not exists public.jen_island_lb_week (
  user_id uuid not null references auth.users(id) on delete cascade,
  week date not null,
  served integer not null default 0,
  earned bigint not null default 0,
  xp bigint not null default 0,
  primary key (user_id, week)
);
create index if not exists jen_island_lb_week_served_idx on public.jen_island_lb_week (week, served desc);
create index if not exists jen_island_lb_week_earned_idx on public.jen_island_lb_week (week, earned desc);
create index if not exists jen_island_lb_week_xp_idx on public.jen_island_lb_week (week, xp desc);
alter table public.jen_island_lb_week enable row level security;
revoke all on public.jen_island_lb_week from anon, authenticated;   -- read through the functions below only

create or replace function public.jen_island_lb_week_track()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  ds integer := greatest(0, new.served - old.served);
  de bigint := greatest(0, new.lifetime - old.lifetime);
  dx bigint := greatest(0, new.xp - old.xp);
begin
  if ds = 0 and de = 0 and dx = 0 then return null; end if;
  insert into public.jen_island_lb_week as w (user_id, week, served, earned, xp)
  values (new.user_id, public.jen_island_week_of(), ds, de, dx)
  on conflict (user_id, week) do update set served = w.served + excluded.served, earned = w.earned + excluded.earned, xp = w.xp + excluded.xp;
  return null;
end
$$;
revoke all on function public.jen_island_lb_week_track() from public, anon, authenticated;
drop trigger if exists jen_island_lb_week_track on public.jen_island_leaderboard;
create trigger jen_island_lb_week_track
after update on public.jen_island_leaderboard
for each row execute function public.jen_island_lb_week_track();

-- ---------------------------------------------------------------- weekly ranking
-- board = 'served' | 'earned' | 'xp'; wk = any day of the week (default: this week)
create or replace function public.jen_island_week_top(board text default 'served', lim integer default 50, wk date default null)
returns table (rank bigint, player_name text, island_name text, level integer, score bigint, badge text, look jsonb, is_me boolean)
language sql stable security definer set search_path = ''
as $$
  with ranked as (
    select l.player_name, l.island_name, l.level, l.badge, l.look, (l.user_id = (select auth.uid())) as is_me,
      case when board = 'earned' then w.earned when board = 'xp' then w.xp else w.served::bigint end as score,
      w.served as s2
    from public.jen_island_lb_week w join public.jen_island_leaderboard l on l.user_id = w.user_id
    where w.week = coalesce(public.jen_island_week_of(wk::timestamp at time zone 'Asia/Ho_Chi_Minh'), public.jen_island_week_of()) and l.player_name <> ''
  ), numbered as (
    select r.*, row_number() over (order by r.score desc, r.s2 desc, r.player_name) as rank from ranked r where r.score > 0
  )
  select n.rank, n.player_name, n.island_name, n.level, n.score, n.badge, n.look, n.is_me
  from numbered n
  where n.rank <= least(greatest(coalesce(lim, 50), 1), 100) or n.is_me
  order by n.rank;
$$;
revoke all on function public.jen_island_week_top(text, integer, date) from public, anon;
grant execute on function public.jen_island_week_top(text, integer, date) to authenticated;

-- ---------------------------------------------------------------- awards
create table if not exists public.jen_island_week_awards (
  week date not null,
  board text not null check (board in ('served', 'earned', 'xp')),
  user_id uuid not null references auth.users(id) on delete cascade,
  rank integer not null check (rank between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (week, board, user_id)
);
create index if not exists jen_island_week_awards_user_idx on public.jen_island_week_awards (user_id);
alter table public.jen_island_week_awards enable row level security;
revoke all on public.jen_island_week_awards from anon, authenticated;
grant select on public.jen_island_week_awards to authenticated;
drop policy if exists "jen_island_awards_own" on public.jen_island_week_awards;
create policy "jen_island_awards_own" on public.jen_island_week_awards for select to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- writes the top 10 of each board for the week that contains wk (safe to run twice)
create or replace function public.jen_island_week_close(wk date)
returns integer language plpgsql security definer set search_path = ''
as $$
declare n integer := 0; c integer; b text;
begin
  foreach b in array array['served', 'earned', 'xp'] loop
    insert into public.jen_island_week_awards (week, board, user_id, rank)
    select date_trunc('week', wk)::date, b, x.user_id, x.rank from (
      select w.user_id, row_number() over (order by case when b = 'earned' then w.earned when b = 'xp' then w.xp else w.served::bigint end desc, w.served desc, l.player_name) as rank,
        case when b = 'earned' then w.earned when b = 'xp' then w.xp else w.served::bigint end as score
      from public.jen_island_lb_week w join public.jen_island_leaderboard l on l.user_id = w.user_id
      where w.week = date_trunc('week', wk)::date and l.player_name <> ''
    ) x where x.rank <= 10 and x.score > 0
    on conflict do nothing;
    get diagnostics c = row_count; n := n + c;
  end loop;
  return n;
end
$$;
revoke all on function public.jen_island_week_close(date) from public, anon, authenticated;

-- ---------------------------------------------------------------- weekly badges
create or replace function public.jen_island_badge_ok(b text, uid uuid, served integer, lifetime bigint)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case b
    when 'supporter' then exists (select 1 from public.jen_island_purchases p where p.user_id = uid)
    when 'founder' then exists (select 1 from auth.users u where u.id = uid and u.created_at < '2026-11-01')
    when 'week_champ' then exists (select 1 from public.jen_island_week_awards a where a.user_id = uid and a.rank = 1)
    when 'week_podium' then exists (select 1 from public.jen_island_week_awards a where a.user_id = uid and a.rank <= 3)
    when 'week_top10' then exists (select 1 from public.jen_island_week_awards a where a.user_id = uid)
    when 'legend_crowd' then served >= 10000
    when 'crowd' then served >= 1000
    when 'tycoon' then lifetime >= 100000
    else true end
$$;
revoke all on function public.jen_island_badge_ok(text, uuid, integer, bigint) from public, anon, authenticated;

-- ---------------------------------------------------------------- all-time board, now with looks
drop function if exists public.jen_island_leaderboard_top(text, integer);
create function public.jen_island_leaderboard_top(sort text default 'level', lim integer default 50)
returns table (rank bigint, player_name text, island_name text, level integer, money bigint, served integer, day integer, badge text, look jsonb, is_me boolean)
language sql stable security definer set search_path = ''
as $$
  with ranked as (
    select l.player_name, l.island_name, l.level, l.money, l.served, l.day, l.badge, l.look, (l.user_id = (select auth.uid())) as is_me,
      row_number() over (order by
        case when sort = 'money' then l.money when sort = 'served' then l.served::bigint else l.level::bigint end desc,
        case when sort = 'level' then l.xp else l.level::bigint end desc,
        l.updated_at asc) as rank
    from public.jen_island_leaderboard l
    where l.player_name <> ''
  )
  select r.rank, r.player_name, r.island_name, r.level, r.money, r.served, r.day, r.badge, r.look, r.is_me
  from ranked r
  where r.rank <= least(greatest(coalesce(lim, 50), 1), 100) or r.is_me
  order by r.rank;
$$;
revoke all on function public.jen_island_leaderboard_top(text, integer) from public, anon;
grant execute on function public.jen_island_leaderboard_top(text, integer) to authenticated;

-- ---------------------------------------------------------------- Monday 00:10 island time
select cron.unschedule('jen_island_week_close') where exists (select 1 from cron.job where jobname = 'jen_island_week_close');
select cron.schedule('jen_island_week_close', '10 17 * * 0', $$select public.jen_island_week_close(public.jen_island_week_of() - 7)$$);
