-- Friend visits: when you visit a friend's home you can leave one emote (no free text, so
-- nothing to moderate). The friend sees who came by the next time they play. One row per
-- visitor, host and island day; old visits are cleaned up after 30 days.
create table if not exists public.jen_island_visits (
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  emote text not null default 'wave' check (emote in ('wave', 'heart', 'laugh', 'clap', 'dance', 'wow', 'yum', 'sparkle')),
  seen boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id, day)
);
create index if not exists jen_island_visits_to_idx on public.jen_island_visits (to_id, seen);
alter table public.jen_island_visits enable row level security;
revoke all on public.jen_island_visits from anon, authenticated;
grant select, insert, update on public.jen_island_visits to authenticated;
drop policy if exists "jen_island_visits_leave" on public.jen_island_visits;
create policy "jen_island_visits_leave" on public.jen_island_visits for insert to authenticated
  with check ((select auth.uid()) = from_id and seen = false and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date
    and exists (select 1 from public.jen_island_friends f where f.user_id = from_id and f.friend_id = to_id));
drop policy if exists "jen_island_visits_change" on public.jen_island_visits;
create policy "jen_island_visits_change" on public.jen_island_visits for update to authenticated
  using ((select auth.uid()) in (from_id, to_id)) with check ((select auth.uid()) in (from_id, to_id));
drop policy if exists "jen_island_visits_read" on public.jen_island_visits;
create policy "jen_island_visits_read" on public.jen_island_visits for select to authenticated
  using ((select auth.uid()) in (from_id, to_id));

-- the visitor's display name comes from their showcase (never their id or email)
create or replace function public.jen_island_my_visitors()
returns table (from_id uuid, player_name text, emote text, day date)
language sql stable security definer set search_path = ''
as $$
  select v.from_id, coalesce(s.player_name, ''), v.emote, v.day
  from public.jen_island_visits v left join public.jen_island_showcase s on s.user_id = v.from_id
  where v.to_id = (select auth.uid()) and not v.seen
  order by v.created_at desc limit 20;
$$;
revoke all on function public.jen_island_my_visitors() from public, anon;
grant execute on function public.jen_island_my_visitors() to authenticated;

select cron.unschedule('jen_island_visits_cleanup') where exists (select 1 from cron.job where jobname = 'jen_island_visits_cleanup');
select cron.schedule('jen_island_visits_cleanup', '30 18 * * *', $$delete from public.jen_island_visits where created_at < now() - interval '30 days'$$);
