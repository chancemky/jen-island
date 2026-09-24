-- JEN Island initial schema
create table if not exists public.player_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  save_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.player_saves enable row level security;

create policy "players can read own save"
on public.player_saves for select
to authenticated
using (auth.uid() = user_id);

create policy "players can insert own save"
on public.player_saves for insert
to authenticated
with check (auth.uid() = user_id);

create policy "players can update own save"
on public.player_saves for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists player_saves_updated_idx on public.player_saves(updated_at desc);
