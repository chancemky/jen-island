-- JEN Island fair play: leaderboard sanity limits, a name filter and account deletion.
--
-- The game runs in the browser, so the server cannot replay it. Instead every
-- leaderboard write is clamped to what real play allows: totals can only grow as fast
-- as a busy player could since the row's last update (counting at most two hours per
-- write), and money can never be more than everything ever earned. Honest players
-- never reach these limits; edited numbers are cut back to them. A player who played
-- offline catches up a little with every write while they keep playing.

-- ---------------------------------------------------------------- name filter
-- true when a name contains a blocked word (English and Vietnamese, ignoring case,
-- spaces, dots and common letter swaps)
create or replace function public.jen_island_name_blocked(name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    translate(lower(regexp_replace(coalesce(name, ''), '[\s._\-*]+', '', 'g')), '013457@$!', 'oieastasi')
    ~ '(fuck|fuk|shit|bitch|cunt|nigg|faggot|whore|slut|pussy|penis|vagina|rapist|nazi|hitler|retard|porn|đụ|địt|lồn|cặc|buồi|đéo|dume|duma|vcl|vkl|clgt|đmm)',
    false)
$$;

-- ---------------------------------------------------------------- leaderboard guard
create or replace function public.jen_island_leaderboard_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  mins numeric;           -- real minutes of play this write may account for (at most two hours)
  base record;            -- where the totals stood before this write
begin
  if tg_op = 'UPDATE' then
    mins := least(120, greatest(0, extract(epoch from (now() - old.updated_at)) / 60));
    select old.level as level, old.xp as xp, old.lifetime as lifetime, old.served as served, old.day as day into base;
  else
    select least(120, greatest(0, extract(epoch from (now() - u.created_at)) / 60)) into mins
    from auth.users u where u.id = new.user_id;
    mins := coalesce(mins, 0);
    select 1 as level, 0::bigint as xp, 0::bigint as lifetime, 0 as served, 1 as day into base;
  end if;

  -- per real minute of play, plus a small catch-up allowance on every write
  -- (a busy late-game island earns about 500 a minute; these leave plenty of room)
  if new.lifetime > base.lifetime then new.lifetime := least(new.lifetime, base.lifetime + (1500 * mins + 3000)::bigint); end if;
  if new.xp > base.xp then new.xp := least(new.xp, base.xp + (150 * mins + 300)::bigint); end if;
  if new.served > base.served then new.served := least(new.served, base.served + (10 * mins + 20)::integer); end if;
  if new.level > base.level then new.level := least(new.level, base.level + (mins / 10 + 1)::integer); end if;
  if new.day > base.day then new.day := least(new.day, base.day + (2 * mins + 2)::integer); end if;

  -- you can't hold more than you ever earned (plus the 380 you start with)
  new.money := least(new.money, new.lifetime + 1000);

  -- names: trimmed, and hidden from the ranking when they contain a blocked word
  new.player_name := left(btrim(new.player_name), 40);
  new.island_name := left(btrim(new.island_name), 40);
  if public.jen_island_name_blocked(new.player_name) then new.player_name := ''; end if;
  if public.jen_island_name_blocked(new.island_name) then new.island_name := 'Island'; end if;

  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists jen_island_leaderboard_guard on public.jen_island_leaderboard;
create trigger jen_island_leaderboard_guard
before insert or update on public.jen_island_leaderboard
for each row execute function public.jen_island_leaderboard_guard();

revoke all on function public.jen_island_leaderboard_guard() from public, anon, authenticated;
grant execute on function public.jen_island_name_blocked(text) to authenticated;

-- ---------------------------------------------------------------- account deletion
-- Deletes everything JEN Island keeps for the signed-in player. The login itself is
-- shared with the other JEN game in this project, so it is only removed when that
-- game has no data for this player either.
create or replace function public.jen_island_delete_account()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.jen_island_leaderboard where user_id = uid;
  delete from public.jen_island_daily_summaries where user_id = uid;
  delete from public.jen_island_save_snapshots where user_id = uid;
  delete from public.jen_island_saves where user_id = uid;
  delete from public.jen_island_profiles where user_id = uid;
  if not exists (select 1 from public.jen_players where user_id = uid)
     and not exists (select 1 from public.jen_scores where user_id = uid) then
    delete from auth.users where id = uid;
    return 'account';
  end if;
  return 'game';
end
$$;

revoke all on function public.jen_island_delete_account() from public, anon;
grant execute on function public.jen_island_delete_account() to authenticated;
