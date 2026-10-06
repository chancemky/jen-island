-- JEN Island error reports and anonymous gameplay stats, kept in this project only
-- (no third-party trackers). The game can add rows but never read them; you read them
-- in the Supabase dashboard (or through the jen_island_stats views below).

create table if not exists public.jen_island_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  device text not null check (char_length(device) <= 64),
  version text check (char_length(version) <= 20),
  message text not null check (char_length(message) <= 500),
  stack text check (char_length(stack) <= 4000),
  context jsonb check (octet_length(context::text) <= 2000)
);
create table if not exists public.jen_island_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  device text not null check (char_length(device) <= 64),
  session text not null check (char_length(session) <= 64),
  version text check (char_length(version) <= 20),
  name text not null check (char_length(name) <= 40),
  props jsonb check (octet_length(props::text) <= 2000)
);
create index if not exists jen_island_events_name_idx on public.jen_island_events (name, created_at);
create index if not exists jen_island_events_device_idx on public.jen_island_events (device, created_at);
create index if not exists jen_island_errors_created_idx on public.jen_island_errors (created_at);

alter table public.jen_island_errors enable row level security;
alter table public.jen_island_events enable row level security;
revoke all on public.jen_island_errors, public.jen_island_events from anon, authenticated;
grant insert on public.jen_island_errors, public.jen_island_events to anon, authenticated;
drop policy if exists "jen_island_errors_insert" on public.jen_island_errors;
create policy "jen_island_errors_insert" on public.jen_island_errors for insert to anon, authenticated with check (true);
drop policy if exists "jen_island_events_insert" on public.jen_island_events;
create policy "jen_island_events_insert" on public.jen_island_events for insert to anon, authenticated with check (true);

-- Reading the numbers (service role / dashboard only): a private schema the API never exposes.
create schema if not exists jen_island_stats;
revoke all on schema jen_island_stats from anon, authenticated;

-- players per day, and how many were new that day
create or replace view jen_island_stats.daily as
with first_seen as (select device, min(created_at)::date as day0 from public.jen_island_events group by device)
select e.created_at::date as day, count(distinct e.device) as players,
       count(distinct e.device) filter (where f.day0 = e.created_at::date) as new_players,
       count(*) filter (where e.name = 'session_start') as sessions
from public.jen_island_events e join first_seen f using (device)
group by 1 order by 1 desc;

-- retention: of the players who started on a day, how many came back 1, 7 and 30 days later
create or replace view jen_island_stats.retention as
with first_seen as (select device, min(created_at)::date as day0 from public.jen_island_events group by device),
     seen as (select distinct device, created_at::date as day from public.jen_island_events)
select f.day0 as cohort, count(*) as players,
       round(100.0 * count(*) filter (where exists (select 1 from seen s where s.device = f.device and s.day = f.day0 + 1)) / count(*), 1) as d1_pct,
       round(100.0 * count(*) filter (where exists (select 1 from seen s where s.device = f.device and s.day = f.day0 + 7)) / count(*), 1) as d7_pct,
       round(100.0 * count(*) filter (where exists (select 1 from seen s where s.device = f.device and s.day = f.day0 + 30)) / count(*), 1) as d30_pct
from first_seen f group by 1 order by 1 desc;

-- where players get to: the furthest story step each device reached
create or replace view jen_island_stats.story_funnel as
with best as (select device, max((props->>'chapter')::int) as chapter from public.jen_island_events where name in ('chapter', 'session_start') and props ? 'chapter' group by device)
select chapter, count(*) as players_reached_and_stopped from best group by 1 order by 1;

-- the most common errors this week
create or replace view jen_island_stats.top_errors as
select message, count(*) as times, count(distinct device) as players, max(created_at) as last_seen, max(version) as latest_version
from public.jen_island_errors where created_at > now() - interval '7 days'
group by 1 order by 2 desc;
