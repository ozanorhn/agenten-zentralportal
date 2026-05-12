-- =============================================================================
-- Migration: subscription_expires_at für Karenzfrist-Logik
-- Datum:     2026-05-11
-- Zweck:     Der Zugang wird nur dann blockiert, wenn das Abo seit mehr als
--            30 Tagen abgelaufen ist. NULL = unbegrenzt (kein Ablauf gesetzt).
-- =============================================================================

alter table public.profiles
  add column if not exists subscription_expires_at timestamptz;

comment on column public.profiles.subscription_expires_at is
  'Datum, bis zu dem das Abo bezahlt ist. NULL = unbegrenzt. Liegt das Datum mehr als 30 Tage in der Vergangenheit, sieht der Nutzer die Zugang-beschränkt-Seite.';
