-- 018: friends can send a piece of furniture from their storage (kind 'item', the furniture id in
-- `item`). Still one gift per friend per day (the unique key), still only to friends.
alter table public.jen_island_gifts add column if not exists item text check (item is null or item ~ '^[a-z0-9_]{1,40}$');
alter table public.jen_island_gifts drop constraint if exists jen_island_gifts_kind_check;
alter table public.jen_island_gifts add constraint jen_island_gifts_kind_check check (kind in ('basket', 'flowers', 'lanterns', 'item'));
