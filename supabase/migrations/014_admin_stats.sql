-- Admin stats (admin.html): one function that summarises play for the owner. Only user ids
-- listed in jen_island_admins can call it; everyone else gets an error. Nothing personal is
-- returned: counts per day, per version and per event, plus the latest error messages.
create table if not exists public.jen_island_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.jen_island_admins enable row level security;
revoke all on public.jen_island_admins from anon, authenticated;
-- the owner's game account (add more with: insert into public.jen_island_admins values ('<user id>'))
insert into public.jen_island_admins (user_id) values ('ee926986-a4c1-4b69-bedf-a20861d303d1') on conflict do nothing;

create or replace function public.jen_island_admin_stats(days integer default 14)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare d integer := least(greatest(coalesce(days, 14), 1), 90); since timestamptz := now() - make_interval(days => d);
begin
  if not exists (select 1 from public.jen_island_admins a where a.user_id = (select auth.uid())) then raise exception 'not an admin'; end if;
  return jsonb_build_object(
    'generated', now(),
    'daily', (select coalesce(jsonb_agg(x order by x.day), '[]') from (
      select (e.created_at at time zone 'Asia/Ho_Chi_Minh')::date as day, count(distinct e.device) as players, count(distinct e.session) as sessions, count(*) filter (where e.name = 'session_start') as starts
      from public.jen_island_events e where e.created_at > since group by 1) x),
    'signups', (select coalesce(jsonb_agg(x order by x.day), '[]') from (
      select (u.created_at at time zone 'Asia/Ho_Chi_Minh')::date as day, count(*) as accounts from auth.users u where u.created_at > since group by 1) x),
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
revoke all on function public.jen_island_admin_stats(integer) from public, anon;
grant execute on function public.jen_island_admin_stats(integer) to authenticated;
