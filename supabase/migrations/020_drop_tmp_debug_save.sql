-- 020: remove a one-off debugging helper that was created by hand (never part of the game).
-- It returned one player's whole save to anyone holding a fixed token, without signing in.
revoke all on function public.jen_island_tmp_debug_save(text) from public, anon, authenticated;
drop function if exists public.jen_island_tmp_debug_save(text);
