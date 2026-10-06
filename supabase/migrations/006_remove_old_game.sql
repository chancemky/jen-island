-- The old JEN game (jen_players / jen_scores) is retired; JEN Island now owns this
-- project. Its tables, triggers and functions are removed, and Delete account
-- always removes the login.

drop table if exists public.jen_scores cascade;
drop table if exists public.jen_players cascade;
drop function if exists public.jen_save_state cascade;
drop function if exists public.jen_sync_score cascade;
drop function if exists public.jen_validate_player_update cascade;

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
  delete from auth.users where id = uid;
  return 'account';
end
$$;
revoke all on function public.jen_island_delete_account() from public, anon;
grant execute on function public.jen_island_delete_account() to authenticated;
