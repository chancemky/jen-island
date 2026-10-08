-- 019: album backup. A private bucket; each player keeps up to 24 small photos (JSON records with
-- a downscaled JPEG data URL, ≤ 64 KB each) in a folder named after their user id. ~1.5 MB per
-- player at most, so it stays inside the free storage tier.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('jen-island-photos', 'jen-island-photos', false, 65536, array['application/json'])
on conflict (id) do update set public = false, file_size_limit = 65536, allowed_mime_types = array['application/json'];

create or replace function public.jen_island_photo_count()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from storage.objects o
  where o.bucket_id = 'jen-island-photos' and (storage.foldername(o.name))[1] = (select auth.uid())::text;
$$;
revoke all on function public.jen_island_photo_count() from public, anon;
grant execute on function public.jen_island_photo_count() to authenticated;

drop policy if exists "jen_island_photos_read" on storage.objects;
create policy "jen_island_photos_read" on storage.objects for select to authenticated
  using (bucket_id = 'jen-island-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "jen_island_photos_add" on storage.objects;
create policy "jen_island_photos_add" on storage.objects for insert to authenticated
  with check (bucket_id = 'jen-island-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f-]{36}/[0-9]{10,14}\.json$' and public.jen_island_photo_count() < 24);
drop policy if exists "jen_island_photos_remove" on storage.objects;
create policy "jen_island_photos_remove" on storage.objects for delete to authenticated
  using (bucket_id = 'jen-island-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
