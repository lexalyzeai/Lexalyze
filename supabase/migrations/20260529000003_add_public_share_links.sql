alter table public.analyses
  add column if not exists share_token text,
  add column if not exists share_enabled boolean not null default false,
  add column if not exists share_created_at timestamptz;

create unique index if not exists analyses_share_token_unique
  on public.analyses(share_token)
  where share_token is not null;

create index if not exists analyses_user_created_at_idx
  on public.analyses(user_id, created_at desc);
