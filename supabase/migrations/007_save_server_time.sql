-- Cloud saves are stamped with the server's clock (not the device's), so two devices
-- can tell reliably whether the other one saved since they last synced.
create or replace function public.jen_island_saves_stamp()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;
drop trigger if exists jen_island_saves_stamp on public.jen_island_saves;
create trigger jen_island_saves_stamp
before insert or update on public.jen_island_saves
for each row execute function public.jen_island_saves_stamp();
revoke all on function public.jen_island_saves_stamp() from public, anon, authenticated;
