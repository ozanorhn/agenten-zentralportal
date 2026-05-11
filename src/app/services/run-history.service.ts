import { Injectable, signal, computed } from '@angular/core';
import { RunRecord } from '../models/interfaces';

const STORAGE_KEY = 'agentHubRuns';
const MAX_RUNS = 50;

const HOUR = 3_600_000;

function demoRuns(): RunRecord[] {
  const now = Date.now();
  return [
    {
      id: 'demo-seo-1',
      agentId: 'seo-intelligence-dashboard',
      agentName: 'SEO-Tagesbericht',
      agentIcon: 'query_stats',
      agentCategory: 'SEO',
      timestamp: now - 1.5 * HOUR,
      inputData: { domain: 'eom.de' },
      outputSummary: 'Tagesbericht für eom.de — 3 neue Sofortmaßnahmen, 2 Ranking-Bewegungen.',
      fullOutput: { type: 'markdown', content: '' },
      tokenCount: 4820,
    },
    {
      id: 'demo-geo-1',
      agentId: 'seo-geo-analyse-assistent-nollm',
      agentName: 'GEO-Audit',
      agentIcon: 'forum',
      agentCategory: 'SEO',
      timestamp: now - 4 * HOUR,
      inputData: { domain: 'arcnode.de' },
      outputSummary: 'GEO-Score 78 / 100 — Marken-Erkennung stark, Zitierfähigkeit ausbaufähig.',
      fullOutput: { type: 'markdown', content: '' },
      tokenCount: 9210,
    },
    {
      id: 'demo-ads-1',
      agentId: 'ad-copy-generator',
      agentName: 'Ad-Copy-Generator',
      agentIcon: 'campaign',
      agentCategory: 'Ads',
      timestamp: now - 22 * HOUR,
      inputData: { topic: 'Q2-Sales-Kampagne', toneOfVoice: 'sachlich' },
      outputSummary: 'Drei Anzeigen-Varianten für Google und Meta, sofort einsatzbereit.',
      fullOutput: { type: 'markdown', content: '' },
      tokenCount: 3140,
    },
    {
      id: 'demo-content-1',
      agentId: 'seo-content-strategie',
      agentName: 'Content-Strategie',
      agentIcon: 'article',
      agentCategory: 'Content',
      timestamp: now - 27 * HOUR,
      inputData: { primaryTopic: 'KI-Automatisierung Mittelstand' },
      outputSummary: 'Content-Plan mit 8 Themen-Clustern und 24 Vorschlägen für Q2.',
      fullOutput: { type: 'markdown', content: '' },
      tokenCount: 7860,
    },
    {
      id: 'demo-link-1',
      agentId: 'interne-verlinkung-vorschlaege',
      agentName: 'Verlinkungsplan',
      agentIcon: 'hub',
      agentCategory: 'SEO',
      timestamp: now - 47 * HOUR,
      inputData: { domain: 'eom.de' },
      outputSummary: '14 Verlinkungs-Vorschläge zwischen Pillar-Pages und Cluster-Artikeln.',
      fullOutput: { type: 'markdown', content: '' },
      tokenCount: 2980,
    },
    {
      id: 'demo-report-1',
      agentId: 'reporting-bot',
      agentName: 'Reporting-Assistent',
      agentIcon: 'summarize',
      agentCategory: 'Data',
      timestamp: now - 70 * HOUR,
      inputData: { topic: 'Wochenbericht' },
      outputSummary: 'Wochenbericht: 312 Aufgaben automatisiert, 4.820 € Kostenersparnis.',
      fullOutput: { type: 'markdown', content: '' },
      tokenCount: 5400,
    },
  ];
}

@Injectable({ providedIn: 'root' })
export class RunHistoryService {
  private _runs = signal<RunRecord[]>(this.loadFromStorage());

  readonly runs = this._runs.asReadonly();

  readonly runCount = computed(() => this._runs().length);

  addRun(record: RunRecord): void {
    const updated = [record, ...this._runs()].slice(0, MAX_RUNS);
    this._runs.set(updated);
    this.persist(updated);
  }

  getLatestForAgent(agentId: string): RunRecord | undefined {
    return this._runs().find(r => r.agentId === agentId);
  }

  getById(id: string): RunRecord | undefined {
    return this._runs().find(r => r.id === id);
  }

  private loadFromStorage(): RunRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return demoRuns();
      const parsed = JSON.parse(raw) as RunRecord[];
      return parsed.length > 0 ? parsed : demoRuns();
    } catch {
      return demoRuns();
    }
  }

  private persist(runs: RunRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
    } catch {
      // Storage full — silently ignore
    }
  }
}
