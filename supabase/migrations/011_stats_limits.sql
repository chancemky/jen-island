-- Stats and error reports: a device can add at most 120 events and 20 error reports an
-- hour (anything more is quietly dropped), and old rows are cleared every night:
-- events after 180 days, error reports after 60.
create or replace function public.jen_island_stats_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare n integer; cap integer := case when tg_table_name = 'jen_island_errors' then 20 else 120 end;
begin
  if tg_table_name = 'jen_island_errors' then
    select count(*) into n from public.jen_island_errors where device = new.device and created_at > now() - interval '1 hour';
  else
    select count(*) into n from public.jen_island_events where device = new.device and created_at > now() - interval '1 hour';
  end if;
  if n >= cap then return null; end if;
  new.created_at := now();
  return new;
end $$;
revoke all on function public.jen_island_stats_limit() from public, anon, authenticated;
drop trigger if exists jen_island_events_limit on public.jen_island_events;
create trigger jen_island_events_limit before insert on public.jen_island_events for each row execute function public.jen_island_stats_limit();
drop trigger if exists jen_island_errors_limit on public.jen_island_errors;
create trigger jen_island_errors_limit before insert on public.jen_island_errors for each row execute function public.jen_island_stats_limit();

create extension if not exists pg_cron;
select cron.unschedule(jobid) from cron.job where jobname = 'jen_island_stats_cleanup';
select cron.schedule('jen_island_stats_cleanup', '17 3 * * *', $$
  delete from public.jen_island_events where created_at < now() - interval '180 days';
  delete from public.jen_island_errors where created_at < now() - interval '60 days';
$$);
