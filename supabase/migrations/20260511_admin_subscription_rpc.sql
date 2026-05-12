-- =============================================================================
-- Migration: Admin-RPC für Abo-Verwaltung
-- Datum:     2026-05-11
-- Zweck:     Admins setzen das Ablaufdatum eines Abos im Management-Tab.
--            Plus: admin_list_users gibt subscription_expires_at mit zurück.
-- =============================================================================

-- 1. admin_list_users neu anlegen, damit subscription_expires_at zurückkommt.
--    Falls die Funktion existiert: erst droppen (Rückgabetyp ändert sich evtl.).
drop function if exists public.admin_list_users();

create or replace function public.admin_list_users()
returns table (
  id           uuid,
  email        text,
  full_name    text,
  is_paid      boolean,
  is_admin     boolean,
  invite_code  text,
  created_at   timestamptz,
  subscription_expires_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.email,
    p.full_name,
    p.is_paid,
    p.is_admin,
    p.invite_code,
    p.created_at,
    p.subscription_expires_at
  from public.profiles p
  where exists (select 1 from public.profiles a where a.id = auth.uid() and a.is_admin = true)
  order by p.created_at desc;
$$;

grant execute on function public.admin_list_users() to authenticated;


-- 2. admin_set_subscription_expires_at — setzt oder löscht das Ablaufdatum
create or replace function public.admin_set_subscription_expires_at(
  p_user_id uuid,
  p_expires_at timestamptz   -- NULL = unbegrenzt freischalten
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
begin
  select is_admin into v_is_admin from public.profiles where id = auth.uid();
  if coalesce(v_is_admin, false) = false then
    raise exception 'Nur Admins dürfen Abo-Daten ändern.';
  end if;

  update public.profiles
     set subscription_expires_at = p_expires_at
   where id = p_user_id;
end;
$$;

grant execute on function public.admin_set_subscription_expires_at(uuid, timestamptz) to authenticated;
