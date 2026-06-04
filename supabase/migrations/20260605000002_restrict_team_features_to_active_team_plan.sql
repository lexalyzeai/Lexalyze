drop policy if exists "Users can view own analyses" on public.analyses;
drop policy if exists "Users can insert own analyses" on public.analyses;
drop policy if exists "Users can update own analyses" on public.analyses;
drop policy if exists "Users can delete own analyses" on public.analyses;
drop policy if exists "Team members can view workspace analyses" on public.analyses;
drop policy if exists "Team writers can update workspace analyses" on public.analyses;
drop policy if exists "Team writers can delete workspace analyses" on public.analyses;

create policy "Users can view own analyses"
  on public.analyses for select
  to authenticated
  using ((select auth.uid()) = user_id and workspace_id is null);

create policy "Users can insert own analyses"
  on public.analyses for insert
  to authenticated
  with check ((select auth.uid()) = user_id and workspace_id is null);

create policy "Users can update own analyses"
  on public.analyses for update
  to authenticated
  using ((select auth.uid()) = user_id and workspace_id is null)
  with check ((select auth.uid()) = user_id and workspace_id is null);

create policy "Users can delete own analyses"
  on public.analyses for delete
  to authenticated
  using ((select auth.uid()) = user_id and workspace_id is null);

create policy "Team members can view workspace analyses"
  on public.analyses for select
  to authenticated
  using (
    workspace_id is not null
    and exists (
      select 1
      from public.team_members
      join public.team_workspaces on team_workspaces.id = team_members.workspace_id
      join public.profiles owner_profiles on owner_profiles.id = team_workspaces.owner_id
      where team_members.workspace_id = analyses.workspace_id
        and team_members.status = 'active'
        and team_members.user_id = (select auth.uid())
        and owner_profiles.plan = 'team'
    )
  );

create policy "Team writers can update workspace analyses"
  on public.analyses for update
  to authenticated
  using (
    workspace_id is not null
    and exists (
      select 1
      from public.team_members
      join public.team_workspaces on team_workspaces.id = team_members.workspace_id
      join public.profiles owner_profiles on owner_profiles.id = team_workspaces.owner_id
      where team_members.workspace_id = analyses.workspace_id
        and team_members.status = 'active'
        and team_members.user_id = (select auth.uid())
        and team_members.role in ('owner', 'admin', 'member')
        and owner_profiles.plan = 'team'
    )
  )
  with check (
    workspace_id is not null
    and exists (
      select 1
      from public.team_members
      join public.team_workspaces on team_workspaces.id = team_members.workspace_id
      join public.profiles owner_profiles on owner_profiles.id = team_workspaces.owner_id
      where team_members.workspace_id = analyses.workspace_id
        and team_members.status = 'active'
        and team_members.user_id = (select auth.uid())
        and team_members.role in ('owner', 'admin', 'member')
        and owner_profiles.plan = 'team'
    )
  );

create policy "Team writers can delete workspace analyses"
  on public.analyses for delete
  to authenticated
  using (
    workspace_id is not null
    and exists (
      select 1
      from public.team_members
      join public.team_workspaces on team_workspaces.id = team_members.workspace_id
      join public.profiles owner_profiles on owner_profiles.id = team_workspaces.owner_id
      where team_members.workspace_id = analyses.workspace_id
        and team_members.status = 'active'
        and team_members.user_id = (select auth.uid())
        and team_members.role in ('owner', 'admin', 'member')
        and owner_profiles.plan = 'team'
    )
  );
