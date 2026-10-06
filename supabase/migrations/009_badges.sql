-- Leaderboard badges: each player shows one badge beside their name. The server checks
-- the ones that can be checked: Supporter needs a real purchase, Founder an account made
-- before launch, and the counting badges need the matching totals.
alter table public.jen_island_leaderboard add column if not exists badge text check (char_length(badge) <= 24);

create or replace function public.jen_island_badge_ok(b text, uid uuid, served integer, lifetime bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case b
    when 'supporter' then exists (select 1 from public.jen_island_purchases p where p.user_id = uid)
    when 'founder' then exists (select 1 from auth.users u where u.id = uid and u.created_at < '2026-11-01')
    when 'legend_crowd' then served >= 10000
    when 'crowd' then served >= 1000
    when 'tycoon' then lifetime >= 100000
    else true end
$$;
revoke all on function public.jen_island_badge_ok(text, uuid, integer, bigint) from public, anon, authenticated;

create or replace function public.jen_island_leaderboard_badge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.badge is not null and not public.jen_island_badge_ok(new.badge, new.user_id, new.served, new.lifetime) then new.badge := null; end if;
  return new;
end
$$;
-- runs after the fair-play guard has clamped served / lifetime ("zz" sorts it last)
drop trigger if exists jen_island_zz_leaderboard_badge on public.jen_island_leaderboard;
create trigger jen_island_zz_leaderboard_badge
before insert or update on public.jen_island_leaderboard
for each row execute function public.jen_island_leaderboard_badge();
revoke all on function public.jen_island_leaderboard_badge() from public, anon, authenticated;

drop function if exists public.jen_island_leaderboard_top(text, integer);
create function public.jen_island_leaderboard_top(sort text default 'level', lim integer default 50)
returns table (rank bigint, player_name text, island_name text, level integer, money bigint, served integer, day integer, badge text, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select l.player_name, l.island_name, l.level, l.money, l.served, l.day, l.badge, (l.user_id = (select auth.uid())) as is_me,
      row_number() over (order by
        case when sort = 'money' then l.money when sort = 'served' then l.served::bigint else l.level::bigint end desc,
        case when sort = 'level' then l.xp else l.level::bigint end desc,
        l.updated_at asc) as rank
    from public.jen_island_leaderboard l
    where l.player_name <> ''
  )
  select r.rank, r.player_name, r.island_name, r.level, r.money, r.served, r.day, r.badge, r.is_me
  from ranked r
  where r.rank <= least(greatest(coalesce(lim, 50), 1), 100) or r.is_me
  order by r.rank;
$$;
revoke all on function public.jen_island_leaderboard_top(text, integer) from public, anon;
grant execute on function public.jen_island_leaderboard_top(text, integer) to authenticated;
