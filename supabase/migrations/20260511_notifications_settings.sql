-- =============================================================================
-- Migration: Notifications, User Settings, RLS, RPCs
-- Datum:     2026-05-11
-- Zweck:     Persistente, targetbare Benachrichtigungen, pro-User Einstellungen,
--            Admin-RPC zum Erstellen von Benachrichtigungen.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabelle: notifications
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null,
  title           text not null,
  body            text not null,
  icon            text not null default 'campaign',
  link            text,
  target_user_id  uuid references public.profiles(id) on delete cascade
);

create index if not exists idx_notifications_target_user_id on public.notifications(target_user_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

alter table public.notifications enable row level security;

-- SELECT: jeder eingeloggte User sieht Broadcasts (target_user_id IS NULL)
-- oder Nachrichten, die explizit an ihn adressiert sind.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select
  to authenticated
  using (target_user_id is null or target_user_id = auth.uid());

-- INSERT/UPDATE/DELETE: nur Admins
drop policy if exists notifications_insert_admin on public.notifications;
create policy notifications_insert_admin on public.notifications
  for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists notifications_update_admin on public.notifications;
create policy notifications_update_admin on public.notifications
  for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

drop policy if exists notifications_delete_admin on public.notifications;
create policy notifications_delete_admin on public.notifications
  for delete
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );


-- -----------------------------------------------------------------------------
-- 2. Tabelle: notification_reads
-- -----------------------------------------------------------------------------
create table if not exists public.notification_reads (
  notification_id  uuid not null references public.notifications(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  read_at          timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index if not exists idx_notification_reads_user_id on public.notification_reads(user_id);

alter table public.notification_reads enable row level security;

drop policy if exists notification_reads_select_own on public.notification_reads;
create policy notification_reads_select_own on public.notification_reads
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists notification_reads_insert_own on public.notification_reads;
create policy notification_reads_insert_own on public.notification_reads
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists notification_reads_delete_own on public.notification_reads;
create policy notification_reads_delete_own on public.notification_reads
  for delete
  to authenticated
  using (user_id = auth.uid());


-- -----------------------------------------------------------------------------
-- 3. Tabelle: user_settings
-- -----------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id        uuid primary key references public.profiles(id) on delete cascade,
  theme          text not null default 'system' check (theme in ('light','dark','system')),
  notify_in_app  boolean not null default true,
  notify_email   boolean not null default false,
  updated_at     timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists user_settings_select_own on public.user_settings;
create policy user_settings_select_own on public.user_settings
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists user_settings_insert_own on public.user_settings;
create policy user_settings_insert_own on public.user_settings
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_settings_update_own on public.user_settings;
create policy user_settings_update_own on public.user_settings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- -----------------------------------------------------------------------------
-- 4. RPC: admin_create_notification
--    Security definer, prüft Admin-Status, fügt Zeile ein.
-- -----------------------------------------------------------------------------
create or replace function public.admin_create_notification(
  p_title text,
  p_body text,
  p_icon text default 'campaign',
  p_link text default null,
  p_target_user_id uuid default null
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_row public.notifications;
begin
  if v_uid is null then
    raise exception 'Nicht eingeloggt.';
  end if;

  select is_admin into v_is_admin from public.profiles where id = v_uid;
  if coalesce(v_is_admin, false) = false then
    raise exception 'Nur Admins dürfen Benachrichtigungen erstellen.';
  end if;

  insert into public.notifications (created_by, title, body, icon, link, target_user_id)
  values (v_uid, p_title, p_body, coalesce(p_icon, 'campaign'), p_link, p_target_user_id)
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.admin_create_notification(text, text, text, text, uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 5. Realtime-Publikation
--    Damit der Client auf INSERT-Events lauschen kann.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- notifications hinzufügen, falls noch nicht in Publikation
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
      execute 'alter publication supabase_realtime add table public.notifications';
    end if;

    -- notification_reads hinzufügen
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notification_reads'
    ) then
      execute 'alter publication supabase_realtime add table public.notification_reads';
    end if;
  end if;
end$$;


-- -----------------------------------------------------------------------------
-- 6. agent_runs absichern (falls noch nicht passiert)
--    Stellt sicher: created_at default now() + RLS für eigene Runs.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='agent_runs') then
    -- RLS aktivieren
    execute 'alter table public.agent_runs enable row level security';

    -- SELECT eigene Runs
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='agent_runs' and policyname='agent_runs_select_own'
    ) then
      execute $p$
        create policy agent_runs_select_own on public.agent_runs
          for select to authenticated
          using (user_id = auth.uid())
      $p$;
    end if;

    -- INSERT eigene Runs
    if not exists (
      select 1 from pg_policies where schemaname='public' and tablename='agent_runs' and policyname='agent_runs_insert_own'
    ) then
      execute $p$
        create policy agent_runs_insert_own on public.agent_runs
          for insert to authenticated
          with check (user_id = auth.uid())
      $p$;
    end if;
  end if;
end$$;
