create table if not exists public.upgrade_interest (
  id uuid primary key default gen_random_uuid(),
  plan text not null check (plan in ('solo', 'team')),
  email text,
  source text not null default 'pricing',
  user_id uuid references auth.users(id) on delete set null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists upgrade_interest_plan_created_idx
  on public.upgrade_interest(plan, created_at desc);

create index if not exists upgrade_interest_email_idx
  on public.upgrade_interest(lower(email))
  where email is not null;

alter table public.upgrade_interest enable row level security;
