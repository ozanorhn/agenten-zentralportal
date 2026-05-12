-- Erweitert invite_codes um die Möglichkeit, Admin-Rechte beim Einlösen zu vergeben.
-- Nur Codes mit grants_admin = true setzen profiles.is_admin = true.

-- 1. Spalte hinzufügen (defensiv, mehrfach ausführbar)
alter table public.invite_codes
  add column if not exists grants_admin boolean not null default false;

-- 2. redeem_invite_code: bei grants_admin=true zusätzlich is_admin setzen
create or replace function public.redeem_invite_code(p_code text)
returns json
language plpgsql
security definer
as $function$
declare
  v_code_row invite_codes%rowtype;
begin
  select * into v_code_row from invite_codes where code = p_code for update;

  if not found then
    return json_build_object('success', false, 'message', 'Ungültiger Code');
  end if;

  if not v_code_row.is_active then
    return json_build_object('success', false, 'message', 'Code nicht aktiv');
  end if;

  if v_code_row.uses_count >= v_code_row.max_uses then
    return json_build_object('success', false, 'message', 'Code bereits verbraucht');
  end if;

  update invite_codes set uses_count = uses_count + 1 where id = v_code_row.id;

  update profiles
  set
    is_paid = true,
    invite_code = p_code,
    is_admin = case when v_code_row.grants_admin then true else is_admin end
  where id = auth.uid();

  return json_build_object('success', true, 'message', 'Zugang freigeschaltet');
end;
$function$;

-- 3. admin_create_invite_code: optionaler Parameter p_grants_admin (Default false)
create or replace function public.admin_create_invite_code(
  p_code text,
  p_max_uses integer default 10,
  p_grants_admin boolean default false
)
returns void
language plpgsql
security definer
as $function$
begin
  if not (select is_admin from profiles where id = auth.uid()) then
    raise exception 'Zugriff verweigert';
  end if;

  insert into invite_codes (code, max_uses, grants_admin, is_active, uses_count)
  values (p_code, p_max_uses, p_grants_admin, true, 0);
end;
$function$;
