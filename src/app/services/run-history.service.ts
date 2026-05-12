import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { supabase } from '../core/supabase.client';
import { RunRecord } from '../models/interfaces';
import { AuthService } from './auth.service';

const STORAGE_PREFIX = 'agentHubRuns:';
const LEGACY_STORAGE_KEY = 'agentHubRuns';
const MAX_RUNS = 50;

// Material-Symbol-Namen sind kleingeschrieben, nur a-z und _.
// Alles andere (Eigennamen wie "GEO-Audit") würde sonst als Text gerendert.
const VALID_ICON_RE = /^[a-z][a-z0-9_]*$/;

// Mapping pro agent_id auf einen sinnvollen Default — wird genutzt, falls
// n8n keinen oder einen ungültigen icon-Wert schreibt.
const ICON_BY_AGENT_ID: Record<string, string> = {
  'seo-geo-analyse-assistent': 'forum',
  'seo-geo-analyse-assistent-nollm': 'forum',
  'seo-intelligence-dashboard': 'query_stats',
  'reporting-bot': 'summarize',
  'ad-copy-generator': 'campaign',
  'seo-content-strategie': 'article',
  'interne-verlinkung-vorschlaege': 'hub',
  'produkttext-agent': 'inventory_2',
  'csv-produkttext-agent': 'table',
  'diagnostic-test': 'bug_report',
};

function sanitizeIcon(raw: unknown, agentId: string | null): string {
  if (typeof raw === 'string' && VALID_ICON_RE.test(raw)) return raw;
  if (agentId && ICON_BY_AGENT_ID[agentId]) return ICON_BY_AGENT_ID[agentId];
  return 'smart_toy';
}

@Injectable({ providedIn: 'root' })
export class RunHistoryService {
  private readonly auth = inject(AuthService);
  private _runs = signal<RunRecord[]>([]);
  private _loading = signal<boolean>(false);
  private _loaded = signal<boolean>(false);

  readonly runs = this._runs.asReadonly();
  readonly runCount = computed(() => this._runs().length);
  readonly loading = this._loading.asReadonly();
  readonly loaded = this._loaded.asReadonly();

  constructor() {
    // Alt-Cache aus der Demo-Zeit einmalig wegräumen.
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore
    }

    effect(() => {
      const userId = this.auth.session()?.user?.id;
      if (userId) {
        this._runs.set(this.loadFromStorage(userId));
        void this.syncFromSupabase();
      } else {
        // Nicht eingeloggt → kein Verlauf anzeigen.
        this._runs.set([]);
        this._loaded.set(false);
      }
    });
  }

  /**
   * Optimistic-Update für die lokale /history-Anzeige.
   * Der echte Insert in agent_runs erfolgt durch n8n am Workflow-Ende.
   * Lokale Einträge werden beim nächsten syncFromSupabase() durch DB-Daten ergänzt/ersetzt.
   */
  addRun(record: RunRecord): void {
    const userId = this.auth.session()?.user?.id;
    if (!userId) return; // Ohne Login speichern wir nichts.

    const updated = [record, ...this._runs().filter(r => r.id !== record.id)].slice(0, MAX_RUNS);
    this._runs.set(updated);
    this.persist(userId, updated);
  }

  getLatestForAgent(agentId: string): RunRecord | undefined {
    return this._runs().find(r => r.agentId === agentId);
  }

  getById(id: string): RunRecord | undefined {
    return this._runs().find(r => r.id === id);
  }

  /**
   * Lädt das vollständige Ergebnis-Payload eines Laufs aus agent_runs.output_payload.
   * Nutzbar in Result-Komponenten, um über ?runId=<uuid> Geräte-übergreifend
   * den Original-Output zu rekonstruieren.
   */
  async fetchOutputPayload(runId: string): Promise<unknown | null> {
    const userId = this.auth.session()?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('agent_runs')
      .select('output_payload')
      .eq('id', runId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[run-history] fetchOutputPayload failed:', error.message);
      return null;
    }
    return (data?.output_payload as unknown) ?? null;
  }

  async refresh(): Promise<void> {
    await this.syncFromSupabase();
  }

  private async syncFromSupabase(): Promise<void> {
    const userId = this.auth.session()?.user?.id;
    if (!userId) return;

    this._loading.set(true);
    try {
      const { data, error } = await supabase
        .from('agent_runs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_RUNS);

      if (error) {
        console.error('[run-history] sync failed', error);
        return;
      }

      const supabaseRuns: RunRecord[] = (data ?? []).map(row => ({
        id: row.id,
        agentId: row.agent_id,
        agentName: row.agent_name,
        agentIcon: sanitizeIcon(row.icon, row.agent_id),
        agentCategory: row.category ?? 'Data',
        timestamp: new Date(row.created_at).getTime(),
        inputData: (row.input_payload as Record<string, unknown>) ?? {},
        outputSummary: row.output_summary ?? row.preview ?? '',
        fullOutput: { type: 'markdown', content: '' },
        tokenCount: row.token_count ?? 0,
      }));

      // Optimistische Einträge (z. B. ein gerade gestarteter Lauf, den n8n noch nicht geschrieben hat)
      // bleiben erhalten, solange ihre ID nicht schon in Supabase liegt.
      const supabaseIds = new Set(supabaseRuns.map(r => r.id));
      const optimistic = this._runs().filter(r => !supabaseIds.has(r.id));

      const merged = [...supabaseRuns, ...optimistic]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_RUNS);

      this._runs.set(merged);
      this.persist(userId, merged);
      this._loaded.set(true);
    } finally {
      this._loading.set(false);
    }
  }

  private storageKey(userId: string): string {
    return `${STORAGE_PREFIX}${userId}`;
  }

  private loadFromStorage(userId: string): RunRecord[] {
    try {
      const raw = localStorage.getItem(this.storageKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as RunRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persist(userId: string, runs: RunRecord[]): void {
    try {
      localStorage.setItem(this.storageKey(userId), JSON.stringify(runs));
    } catch {
      // Storage full — silently ignore
    }
  }
}
