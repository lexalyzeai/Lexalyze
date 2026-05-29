create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  device_name text,
  browser_name text,
  os_name text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, device_id)
);

create index if not exists user_sessions_user_last_seen_idx
  on public.user_sessions(user_id, last_seen desc)
  where revoked_at is null;

alter table public.user_sessions enable row level security;

create policy "Users can read their sessions"
  on public.user_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their sessions"
  on public.user_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their sessions"
  on public.user_sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
