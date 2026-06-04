create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  properties jsonb not null default '{}'::jsonb,
  anonymous_id text,
  user_id uuid references auth.users(id) on delete set null,
  source text not null default 'web',
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_created_idx
  on public.analytics_events(event, created_at desc);

create index if not exists analytics_events_user_created_idx
  on public.analytics_events(user_id, created_at desc)
  where user_id is not null;

create index if not exists analytics_events_anonymous_created_idx
  on public.analytics_events(anonymous_id, created_at desc)
  where anonymous_id is not null;

alter table public.analytics_events enable row level security;
