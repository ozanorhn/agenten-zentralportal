-- =============================================================================
-- Migration: agent_runs vorbereiten für n8n-Direktschreiben
-- Datum:     2026-05-11
-- Zweck:     n8n schreibt nach Workflow-Ende direkt nach agent_runs.
--            Spalten für Modell, Status, Dauer und Fehler hinzufügen.
--            Frontend liefert user_id und run_id im Webhook-Payload an n8n.
-- =============================================================================

-- 1. Neue Spalten (alle nullable, damit alte Inserts weiter klappen)
alter table public.agent_runs
  add column if not exists model         text,         -- z. B. 'claude-opus-4-7'
  add column if not exists status        text          -- 'completed' | 'failed' | 'running'
                                          default 'completed'
                                          check (status in ('completed','failed','running')),
  add column if not exists duration_ms   integer,
  add column if not exists error_message text,
  add column if not exists input_payload jsonb,        -- was an n8n geschickt wurde (optional)
  add column if not exists output_summary text;        -- Kurztext für Listen

-- preview umbenennen auf output_summary, falls vorhanden — wir nutzen ab jetzt output_summary einheitlich.
-- Wenn 'preview' existiert und 'output_summary' bisher leer: Daten rüberkopieren.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='agent_runs' and column_name='preview') then
    update public.agent_runs
       set output_summary = coalesce(output_summary, preview)
     where output_summary is null and preview is not null;
  end if;
end$$;

-- 2. Indexe für die Aggregation
create index if not exists idx_agent_runs_agent_id_created on public.agent_runs(agent_id, created_at desc);
create index if not exists idx_agent_runs_user_id_created on public.agent_runs(user_id, created_at desc);
create index if not exists idx_agent_runs_status on public.agent_runs(status);

-- 3. Aggregation um Modell und Status erweitern
-- Alte Signatur erst löschen, da Rückgabetyp sich ändert.
drop function if exists public.admin_agent_stats(int);

create or replace function public.admin_agent_stats(p_days int default 30)
returns table (
  agent_id      text,
  agent_name    text,
  icon          text,
  category      text,
  model         text,
  last_run_at   timestamptz,
  run_count_30d bigint,
  unique_users  bigint,
  failed_count  bigint
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
    -- Modell der letzten Ausführung
    (
      select model
      from public.agent_runs ar2
      where ar2.agent_id = ar.agent_id and ar2.model is not null
      order by ar2.created_at desc
      limit 1
    ) as model,
    max(ar.created_at) as last_run_at,
    count(*) filter (where ar.created_at >= now() - make_interval(days => p_days)) as run_count_30d,
    count(distinct ar.user_id) as unique_users,
    count(*) filter (where ar.status = 'failed' and ar.created_at >= now() - make_interval(days => p_days)) as failed_count
  from public.agent_runs ar
  where exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  group by ar.agent_id
  order by max(ar.created_at) desc nulls last;
$$;

grant execute on function public.admin_agent_stats(int) to authenticated;
