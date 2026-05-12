-- =============================================================================
-- Migration: agent_runs.output_payload für vollständige Ergebnisse
-- Datum:     2026-05-11
-- Zweck:     n8n speichert nach Workflow-Ende nicht nur Metadaten, sondern
--            auch das komplette Ergebnis-JSON. Die Result-Seite lädt es
--            bei Bedarf aus der DB nach (Geräte-übergreifend, persistent).
-- =============================================================================

alter table public.agent_runs
  add column if not exists output_payload jsonb;

comment on column public.agent_runs.output_payload is
  'Vollständiges Ergebnis-JSON aus n8n (z. B. GEO-Audit-Report). Wird von der Result-Seite via runId nachgeladen.';
