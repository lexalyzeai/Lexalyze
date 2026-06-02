alter table public.analyses
  add column if not exists workspace_id uuid references public.team_workspaces(id) on delete cascade;

create index if not exists analyses_workspace_id_idx on public.analyses(workspace_id, created_at desc);
create index if not exists analyses_personal_user_idx on public.analyses(user_id, created_at desc) where workspace_id is null;

do $$
begin
  create policy "Team members can view workspace analyses"
    on public.analyses for select
    to authenticated
    using (
      workspace_id is not null
      and exists (
        select 1
        from public.team_members
        where team_members.workspace_id = analyses.workspace_id
          and team_members.status = 'active'
          and team_members.user_id = auth.uid()
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Team writers can update workspace analyses"
    on public.analyses for update
    to authenticated
    using (
      workspace_id is not null
      and exists (
        select 1
        from public.team_members
        where team_members.workspace_id = analyses.workspace_id
          and team_members.status = 'active'
          and team_members.user_id = auth.uid()
          and team_members.role in ('owner', 'admin', 'member')
      )
    )
    with check (
      workspace_id is not null
      and exists (
        select 1
        from public.team_members
        where team_members.workspace_id = analyses.workspace_id
          and team_members.status = 'active'
          and team_members.user_id = auth.uid()
          and team_members.role in ('owner', 'admin', 'member')
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Team writers can delete workspace analyses"
    on public.analyses for delete
    to authenticated
    using (
      workspace_id is not null
      and exists (
        select 1
        from public.team_members
        where team_members.workspace_id = analyses.workspace_id
          and team_members.status = 'active'
          and team_members.user_id = auth.uid()
          and team_members.role in ('owner', 'admin', 'member')
      )
    );
exception
  when duplicate_object then null;
end $$;
