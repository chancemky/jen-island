-- 021: indexes for the friend, gift and postcard lookups (Supabase performance advisor: unindexed foreign keys).
create index if not exists jen_island_friends_friend_id_idx on public.jen_island_friends (friend_id);
create index if not exists jen_island_gifts_to_id_idx on public.jen_island_gifts (to_id) where not claimed;
create index if not exists jen_island_mail_from_id_idx on public.jen_island_mail (from_id);
