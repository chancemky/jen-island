-- Friends, part two (all asynchronous — no live game server):
--  · jen_island_friends_week(board): this week's board for you and your friends only
--  · jen_island_help: a friend helped at your shop while visiting. Nothing is added to your
--    island until YOU accept it in the game; amounts are capped and one help per friend a day.
--  · jen_island_mail: postcards with a design, a sticker and a ready-made message (no free text).
create or replace function public.jen_island_friends_week(board text default 'served')
returns table (rank bigint, player_name text, island_name text, level integer, score bigint, badge text, look jsonb, is_me boolean)
language sql stable security definer set search_path = ''
as $$
  with mine as (select f.friend_id as uid from public.jen_island_friends f where f.user_id = (select auth.uid()) union select (select auth.uid())),
  rows as (
    select l.player_name, l.island_name, l.level, l.badge, l.look, (l.user_id = (select auth.uid())) as is_me,
      coalesce(case when board = 'earned' then w.earned when board = 'xp' then w.xp else w.served::bigint end, 0) as score
    from mine m join public.jen_island_leaderboard l on l.user_id = m.uid
    left join public.jen_island_lb_week w on w.user_id = m.uid and w.week = public.jen_island_week_of()
  )
  select row_number() over (order by r.score desc, r.player_name) as rank, r.player_name, r.island_name, r.level, r.score, r.badge, r.look, r.is_me from rows r order by 1;
$$;
revoke all on function public.jen_island_friends_week(text) from public, anon;
grant execute on function public.jen_island_friends_week(text) to authenticated;

create table if not exists public.jen_island_help (
  id bigint generated always as identity primary key,
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  day date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  kind text not null default 'help' check (kind in ('help', 'buy')),
  served integer not null default 0 check (served between 0 and 30),
  amount integer not null default 0 check (amount between 0 and 600),
  state text not null default 'new' check (state in ('new', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (from_id, to_id, day, kind)
);
create index if not exists jen_island_help_to_idx on public.jen_island_help (to_id, state);
alter table public.jen_island_help enable row level security;
revoke all on public.jen_island_help from anon, authenticated;
grant select, insert on public.jen_island_help to authenticated;
grant update (state) on public.jen_island_help to authenticated;
drop policy if exists "jen_island_help_send" on public.jen_island_help;
create policy "jen_island_help_send" on public.jen_island_help for insert to authenticated
  with check ((select auth.uid()) = from_id and state = 'new' and day = (now() at time zone 'Asia/Ho_Chi_Minh')::date
    and exists (select 1 from public.jen_island_friends f where f.user_id = from_id and f.friend_id = to_id));
drop policy if exists "jen_island_help_read" on public.jen_island_help;
create policy "jen_island_help_read" on public.jen_island_help for select to authenticated using ((select auth.uid()) in (from_id, to_id));
drop policy if exists "jen_island_help_answer" on public.jen_island_help;
create policy "jen_island_help_answer" on public.jen_island_help for update to authenticated
  using ((select auth.uid()) = to_id and state = 'new') with check ((select auth.uid()) = to_id and state in ('accepted', 'declined'));

create table if not exists public.jen_island_mail (
  id bigint generated always as identity primary key,
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references auth.users(id) on delete cascade,
  design text not null check (design ~ '^[a-z_]{1,20}$'),
  sticker text not null check (sticker ~ '^[a-z_]{1,20}$'),
  message smallint not null check (message between 0 and 40),
  day date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists jen_island_mail_to_idx on public.jen_island_mail (to_id, seen);
alter table public.jen_island_mail enable row level security;
revoke all on public.jen_island_mail from anon, authenticated;
grant select, insert on public.jen_island_mail to authenticated;
grant update (seen) on public.jen_island_mail to authenticated;
drop policy if exists "jen_island_mail_send" on public.jen_island_mail;
create policy "jen_island_mail_send" on public.jen_island_mail for insert to authenticated
  with check ((select auth.uid()) = from_id and seen = false and exists (select 1 from public.jen_island_friends f where f.user_id = from_id and f.friend_id = to_id)
    and (select count(*) from public.jen_island_mail m where m.from_id = (select auth.uid()) and m.day = (now() at time zone 'Asia/Ho_Chi_Minh')::date) < 10);
drop policy if exists "jen_island_mail_read" on public.jen_island_mail;
create policy "jen_island_mail_read" on public.jen_island_mail for select to authenticated using ((select auth.uid()) in (from_id, to_id));
drop policy if exists "jen_island_mail_seen" on public.jen_island_mail;
create policy "jen_island_mail_seen" on public.jen_island_mail for update to authenticated using ((select auth.uid()) = to_id) with check ((select auth.uid()) = to_id);

-- the names on your waiting help and postcards (from showcases: never ids or emails)
create or replace function public.jen_island_my_inbox()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'help', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'name', coalesce(s.player_name, '?'), 'kind', h.kind, 'served', h.served, 'amount', h.amount) order by h.id), '[]') from public.jen_island_help h left join public.jen_island_showcase s on s.user_id = h.from_id where h.to_id = (select auth.uid()) and h.state = 'new'),
    'mail', (select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'name', coalesce(s.player_name, '?'), 'design', m.design, 'sticker', m.sticker, 'message', m.message, 'day', m.day) order by m.id), '[]') from public.jen_island_mail m left join public.jen_island_showcase s on s.user_id = m.from_id where m.to_id = (select auth.uid()) and not m.seen));
$$;
revoke all on function public.jen_island_my_inbox() from public, anon;
grant execute on function public.jen_island_my_inbox() to authenticated;

select cron.unschedule('jen_island_social_cleanup') where exists (select 1 from cron.job where jobname = 'jen_island_social_cleanup');
select cron.schedule('jen_island_social_cleanup', '40 18 * * *', $$delete from public.jen_island_help where created_at < now() - interval '30 days'; delete from public.jen_island_mail where created_at < now() - interval '60 days'$$);
