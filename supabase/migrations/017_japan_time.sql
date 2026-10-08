-- 017: the island's clock is now Japan time (Asia/Tokyo, UTC+9) for everyone: weekly boards
-- close at Monday 00:00 in Japan, and the daily limits on visits, help and mail turn over at
-- midnight in Japan. (Everything seasonal in the game follows the real date in Japan.)
create or replace function public.jen_island_week_of(t timestamptz default now())
returns date language sql stable set search_path = ''
as $$ select date_trunc('week', t at time zone 'Asia/Tokyo')::date $$;
create or replace function public.jen_island_week_top(board text default 'served', lim integer default 50, wk date default null)
returns table (rank bigint, player_name text, island_name text, level integer, score bigint, badge text, look jsonb, is_me boolean)
language sql stable security definer set search_path = ''
as $$
  with ranked as (
    select l.player_name, l.island_name, l.level, l.badge, l.look, (l.user_id = (select auth.uid())) as is_me,
      case when board = 'earned' then w.earned when board = 'xp' then w.xp else w.served::bigint end as score,
      w.served as s2
    from public.jen_island_lb_week w join public.jen_island_leaderboard l on l.user_id = w.user_id
    where w.week = coalesce(public.jen_island_week_of(wk::timestamp at time zone 'Asia/Tokyo'), public.jen_island_week_of()) and l.player_name <> ''
  ), numbered as (
    select r.*, row_number() over (order by r.score desc, r.s2 desc, r.player_name) as rank from ranked r where r.score > 0
  )
  select n.rank, n.player_name, n.island_name, n.level, n.score, n.badge, n.look, n.is_me
  from numbered n
  where n.rank <= least(greatest(coalesce(lim, 50), 1), 100) or n.is_me
  order by n.rank;
$$;
create or replace function public.jen_island_admin_stats(days integer default 14)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare d integer := least(greatest(coalesce(days, 14), 1), 90); since timestamptz := now() - make_interval(days => d);
begin
  if not exists (select 1 from public.jen_island_admins a where a.user_id = (select auth.uid())) then raise exception 'not an admin'; end if;
  return jsonb_build_object(
    'generated', now(),
    'daily', (select coalesce(jsonb_agg(x order by x.day), '[]') from (
      select (e.created_at at time zone 'Asia/Tokyo')::date as day, count(distinct e.device) as players, count(distinct e.session) as sessions, count(*) filter (where e.name = 'session_start') as starts
      from public.jen_island_events e where e.created_at > since group by 1) x),
    'signups', (select coalesce(jsonb_agg(x order by x.day), '[]') from (
      select (u.created_at at time zone 'Asia/Tokyo')::date as day, count(*) as accounts from auth.users u where u.created_at > since group by 1) x),
    'totals', jsonb_build_object(
      'accounts', (select count(*) from auth.users), 'saves', (select count(*) from public.jen_island_saves),
      'leaderboard', (select count(*) from public.jen_island_leaderboard where player_name <> ''),
      'purchases', (select count(*) from public.jen_island_purchases), 'friends', (select count(*) / 2 from public.jen_island_friends),
      'players7', (select count(distinct device) from public.jen_island_events where created_at > now() - interval '7 days'),
      'players1', (select count(distinct device) from public.jen_island_events where created_at > now() - interval '1 day')),
    'events', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select e.name, count(*) as n from public.jen_island_events e where e.created_at > since group by 1 order by 2 desc limit 30) x),
    'versions', (select coalesce(jsonb_agg(x order by x.players desc), '[]') from (select e.version, count(distinct e.device) as players from public.jen_island_events e where e.created_at > now() - interval '3 days' group by 1 order by 2 desc limit 10) x),
    'errors', (select coalesce(jsonb_agg(x order by x.n desc), '[]') from (select left(r.message, 140) as message, r.version, count(*) as n, count(distinct r.device) as devices, max(r.created_at) as last from public.jen_island_errors r where r.created_at > since group by 1, 2 order by 3 desc limit 25) x),
    'chapters', (select coalesce(jsonb_agg(x order by x.chapter), '[]') from (select (s.save_data #>> '{story,chapter}')::int as chapter, count(*) as n from public.jen_island_saves s group by 1) x),
    'retention', (select jsonb_build_object('cohort', count(*), 'd1', count(*) filter (where back1), 'd7', count(*) filter (where back7)) from (
      select f.device, exists (select 1 from public.jen_island_events e where e.device = f.device and e.created_at between f.first + interval '1 day' and f.first + interval '2 days') as back1,
             exists (select 1 from public.jen_island_events e where e.device = f.device and e.created_at between f.first + interval '7 days' and f.first + interval '8 days') as back7
      from (select device, min(created_at) as first from public.jen_island_events group by device) f where f.first between now() - interval '30 days' and now() - interval '8 days') c)
  );
end
$$;
alter table public.jen_island_visits alter column day set default (now() at time zone 'Asia/Tokyo')::date;
alter table public.jen_island_help alter column day set default (now() at time zone 'Asia/Tokyo')::date;
alter table public.jen_island_mail alter column day set default (now() at time zone 'Asia/Tokyo')::date;
alter policy "jen_island_visits_leave" on public.jen_island_visits
  with check ((select auth.uid()) = from_id and seen = false and day = (now() at time zone 'Asia/Tokyo')::date
    and exists (select 1 from public.jen_island_friends f where f.user_id = from_id and f.friend_id = to_id));
alter policy "jen_island_help_send" on public.jen_island_help
  with check ((select auth.uid()) = from_id and state = 'new' and day = (now() at time zone 'Asia/Tokyo')::date
    and exists (select 1 from public.jen_island_friends f where f.user_id = from_id and f.friend_id = to_id));
alter policy "jen_island_mail_send" on public.jen_island_mail
  with check ((select auth.uid()) = from_id and seen = false and exists (select 1 from public.jen_island_friends f where f.user_id = from_id and f.friend_id = to_id)
    and (select count(*) from public.jen_island_mail m where m.from_id = (select auth.uid()) and m.day = (now() at time zone 'Asia/Tokyo')::date) < 10);
-- Monday 00:10 in Japan = Sunday 15:10 UTC
select cron.schedule('jen_island_week_close', '10 15 * * 0', $$select public.jen_island_week_close(public.jen_island_week_of() - 7)$$);
