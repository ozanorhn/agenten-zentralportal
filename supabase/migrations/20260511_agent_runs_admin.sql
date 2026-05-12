-- =============================================================================
-- Migration: agent_runs absichern + Admin-Sicht
-- Datum:     2026-05-11
-- Zweck:     Schema garantieren, Admin-SELECT-Policy für die System-Übersicht,
--            Aggregations-RPC für letzte Aktivität & Aufrufe.
-- =============================================================================

-- 1. Spalten sicherstellen (falls Schema von Code abweicht)
do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema='public' and table_name='agent_runs') then
    create table public.agent_runs (
      id           uuid primary key default gen_random_uuid(),
      created_at   timestamptz not null default now(),
      user_id      uuid not null references public.profiles(id) on delete cascade,
      agent_id     text not null,
      agent_name   text,
      icon         text,
      category     text,
      preview      text,
      token_count  integer
    );
  end if;

  -- Spalten ergänzen falls fehlend
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_runs' and column_name='created_at') then
    alter table public.agent_runs add column created_at timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_runs' and column_name='agent_id') then
    alter table public.agent_runs add column agent_id text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_runs' and column_name='agent_name') then
    alter table public.agent_runs add column agent_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_runs' and column_name='icon') then
    alter table public.agent_runs add column icon text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_runs' and column_name='category') then
    alter table public.agent_runs add column category text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_runs' and column_name='preview') then
    alter table public.agent_runs add column preview text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_runs' and column_name='token_count') then
    alter table public.agent_runs add column token_count integer;
  end if;
end$$;

alter table public.agent_runs enable row level security;

-- 2. RLS-Policies: eigene Runs + Admin sieht alles
drop policy if exists agent_runs_select_own on public.agent_runs;
create policy agent_runs_select_own on public.agent_runs
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists agent_runs_insert_own on public.agent_runs;
create policy agent_runs_insert_own on public.agent_runs
  for insert to authenticated
  with check (user_id = auth.uid());

-- 3. Aggregation für die Systemverwaltung (Admin-Sicht)
create or replace function public.admin_agent_stats(p_days int default 30)
returns table (
  agent_id     text,
  agent_name   text,
  icon         text,
  category     text,
  last_run_at  timestamptz,
  run_count_30d bigint,
  unique_users bigint
)
language sql
security definer
set search_path = public
as $$
  select
    ar.agent_id,
    max(ar.agent_name) as agent_name,
    max(ar.icon) as icon,
    max(ar.category) as category,
    max(ar.created_at) as last_run_at,
    count(*) filter (where ar.created_at >= now() - make_interval(days => p_days)) as run_count_30d,
    count(distinct ar.user_id) as unique_users
  from public.agent_runs ar
  where exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  group by ar.agent_id
  order by max(ar.created_at) desc nulls last;
$$;

grant execute on function public.admin_agent_stats(int) to authenticated;

-- 4. Diagnose: Anzahl Rows
create or replace function public.debug_agent_runs_count()
returns table (total bigint, mine bigint)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.agent_runs) as total,
    (select count(*) from public.agent_runs where user_id = auth.uid()) as mine;
$$;

grant execute on function public.debug_agent_runs_count() to authenticated;
