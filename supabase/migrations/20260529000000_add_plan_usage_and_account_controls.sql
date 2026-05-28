alter table public.profiles
  add column if not exists plan text not null default 'free',
  add column if not exists usage_month text not null default to_char(timezone('utc'::text, now()), 'YYYY-MM'),
  add column if not exists monthly_analyses_used integer not null default 0;

update public.profiles
set plan = coalesce(nullif(plan, ''), 'free'),
    usage_month = coalesce(nullif(usage_month, ''), to_char(timezone('utc'::text, now()), 'YYYY-MM')),
    monthly_analyses_used = coalesce(monthly_analyses_used, 0);

do $$
begin
  alter table public.profiles
    add constraint profiles_plan_check check (plan in ('free', 'solo', 'team'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_monthly_analyses_used_check check (monthly_analyses_used >= 0);
exception
  when duplicate_object then null;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, analyses_used, plan, usage_month, monthly_analyses_used)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    0,
    'free',
    to_char(timezone('utc'::text, now()), 'YYYY-MM'),
    0
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;

do $$
begin
  create policy "Users can update own profile"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can update own analyses"
    on public.analyses for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can delete own analyses"
    on public.analyses for delete
    to authenticated
    using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can delete own followups"
    on public.followups for delete
    to authenticated
    using (
      auth.uid() = (
        select analyses.user_id
        from public.analyses
        where analyses.id = followups.analysis_id
      )
    );
exception
  when duplicate_object then null;
end $$;
