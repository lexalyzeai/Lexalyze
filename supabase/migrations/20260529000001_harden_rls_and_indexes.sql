revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;

create index if not exists analyses_user_id_idx on public.analyses(user_id);
create index if not exists followups_analysis_id_idx on public.followups(analysis_id);

drop index if exists public.profiles_plan_idx;
drop index if exists public.profiles_usage_month_idx;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can view own analyses" on public.analyses;
drop policy if exists "Users can insert own analyses" on public.analyses;
drop policy if exists "Users can update own analyses" on public.analyses;
drop policy if exists "Users can delete own analyses" on public.analyses;
drop policy if exists "Users can view own followups" on public.followups;
drop policy if exists "Users can insert own followups" on public.followups;
drop policy if exists "Users can delete own followups" on public.followups;

create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Users can view own analyses"
  on public.analyses for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own analyses"
  on public.analyses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own analyses"
  on public.analyses for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own analyses"
  on public.analyses for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can view own followups"
  on public.followups for select
  to authenticated
  using (
    (select auth.uid()) = (
      select analyses.user_id
      from public.analyses
      where analyses.id = followups.analysis_id
    )
  );

create policy "Users can insert own followups"
  on public.followups for insert
  to authenticated
  with check (
    (select auth.uid()) = (
      select analyses.user_id
      from public.analyses
      where analyses.id = followups.analysis_id
    )
  );

create policy "Users can delete own followups"
  on public.followups for delete
  to authenticated
  using (
    (select auth.uid()) = (
      select analyses.user_id
      from public.analyses
      where analyses.id = followups.analysis_id
    )
  );
