create table if not exists public.team_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.team_workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  status text not null default 'invited' check (status in ('active', 'invited')),
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table if not exists public.team_folders (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.team_workspaces(id) on delete cascade,
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.share_feedback (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  share_token text not null,
  kind text not null check (kind in ('comment', 'edit')),
  author_name text not null default 'Reviewer',
  body text not null,
  suggested_text text,
  created_at timestamptz not null default now()
);

alter table public.analyses
  add column if not exists folder_id uuid references public.team_folders(id) on delete set null,
  add column if not exists share_mode text not null default 'view' check (share_mode in ('view', 'comment', 'edit'));

create index if not exists team_workspaces_owner_id_idx on public.team_workspaces(owner_id);
create index if not exists team_members_workspace_id_idx on public.team_members(workspace_id);
create index if not exists team_folders_workspace_id_idx on public.team_folders(workspace_id);
create index if not exists analyses_folder_id_idx on public.analyses(folder_id);
create index if not exists share_feedback_analysis_id_idx on public.share_feedback(analysis_id, created_at desc);

alter table public.team_workspaces enable row level security;
alter table public.team_members enable row level security;
alter table public.team_folders enable row level security;
alter table public.share_feedback enable row level security;

do $$
begin
  create policy "Workspace owners can view their workspace"
    on public.team_workspaces for select
    to authenticated
    using (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Workspace owners can manage their workspace"
    on public.team_workspaces for all
    to authenticated
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Workspace owners can view members"
    on public.team_members for select
    to authenticated
    using (
      auth.uid() = (
        select owner_id from public.team_workspaces
        where team_workspaces.id = team_members.workspace_id
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Workspace owners can manage members"
    on public.team_members for all
    to authenticated
    using (
      auth.uid() = (
        select owner_id from public.team_workspaces
        where team_workspaces.id = team_members.workspace_id
      )
    )
    with check (
      auth.uid() = (
        select owner_id from public.team_workspaces
        where team_workspaces.id = team_members.workspace_id
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Workspace owners can view folders"
    on public.team_folders for select
    to authenticated
    using (
      auth.uid() = (
        select owner_id from public.team_workspaces
        where team_workspaces.id = team_folders.workspace_id
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Workspace owners can manage folders"
    on public.team_folders for all
    to authenticated
    using (
      auth.uid() = (
        select owner_id from public.team_workspaces
        where team_workspaces.id = team_folders.workspace_id
      )
    )
    with check (
      auth.uid() = (
        select owner_id from public.team_workspaces
        where team_workspaces.id = team_folders.workspace_id
      )
    );
exception
  when duplicate_object then null;
end $$;
