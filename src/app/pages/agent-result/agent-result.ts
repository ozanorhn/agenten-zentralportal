import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RunHistoryService } from '../../services/run-history.service';
import { AgentOutputService } from '../../services/agent-output.service';
import { ToastService } from '../../services/toast.service';
import {
  RunRecord,
  EmailOutput,
  LinkedInPostOutput,
  VideoScriptOutput,
  LeadTableOutput,
  KeywordTableOutput,
  SyncReportOutput,
} from '../../models/interfaces';
import { AGENTS_MAP } from '../../data/agents.data';

@Component({
  selector: 'app-agent-result',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './agent-result.html',
  styleUrl: './agent-result.scss',
})
export class AgentResult {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly runHistory = inject(RunHistoryService);
  private readonly agentOutputService = inject(AgentOutputService);
  private readonly toastService = inject(ToastService);

  readonly agentId = this.route.snapshot.params['id'] as string;
  readonly agentMeta = AGENTS_MAP[this.agentId];

  private readonly _run = signal<RunRecord | null>(this.resolveRun());

  readonly run = this._run.asReadonly();

  readonly output = computed(() => this._run()?.fullOutput ?? null);
  readonly emailOutput = computed(() =>
    this.output()?.type === 'email' ? this.output() as EmailOutput : null
  );
  readonly linkedInOutput = computed(() =>
    this.output()?.type === 'linkedin-post' ? this.output() as LinkedInPostOutput : null
  );
  readonly videoOutput = computed(() =>
    this.output()?.type === 'video-script' ? this.output() as VideoScriptOutput : null
  );
  readonly leadOutput = computed(() =>
    this.output()?.type === 'lead-table' ? this.output() as LeadTableOutput : null
  );
  readonly keywordOutput = computed(() =>
    this.output()?.type === 'keyword-table' ? this.output() as KeywordTableOutput : null
  );
  readonly syncOutput = computed(() =>
    this.output()?.type === 'sync-report' ? this.output() as SyncReportOutput : null
  );

  private resolveRun(): RunRecord | null {
    const existing = this.runHistory.getLatestForAgent(this.agentId);
    if (existing) return existing;
    // Fallback: generate output so the page always works
    const output = this.agentOutputService.generateOutput(this.agentId, {});
    const summary = this.buildSummary(output);
    const fallback: RunRecord = {
      id: `fallback-${this.agentId}`,
      agentId: this.agentId,
      agentName: this.agentMeta?.name ?? this.agentId,
      agentIcon: this.agentMeta?.icon ?? 'smart_toy',
      agentCategory: (this.agentMeta?.category ?? 'Sales') as RunRecord['agentCategory'],
      timestamp: Date.now(),
      inputData: {},
      outputSummary: summary,
      fullOutput: output,
      tokenCount: Math.floor(Math.random() * 800) + 400,
    };
    return fallback;
  }

  private buildSummary(output: ReturnType<AgentOutputService['generateOutput']>): string {
    switch (output.type) {
      case 'email': return output.subject;
      case 'linkedin-post': return output.headline;
      case 'video-script': return output.title;
      case 'lead-table': return `${output.totalFound} Leads gefunden, ${output.highScoreCount} Hot Leads`;
      case 'keyword-table': return `Top-Chance: ${output.topOpportunity}`;
      case 'sync-report': return `${output.synced} von ${output.totalRecords} Records synchronisiert`;
    }
  }

  copyOutput(): void {
    const text = this.buildTextVersion();
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.show('In Zwischenablage kopiert!', 'success');
    }).catch(() => {
      this.toastService.show('Kopieren fehlgeschlagen.', 'error');
    });
  }

  downloadOutput(): void {
    const text = this.buildTextVersion();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.agentId}-output-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.show('Datei wird heruntergeladen…', 'info');
  }

  goBack(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 65) return 'text-amber-400';
    return 'text-red-400';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Hot': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'Warm': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default: return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
    }
  }

  getOpportunityColor(opp: string): string {
    switch (opp) {
      case 'Hoch': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Mittel': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default: return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
    }
  }

  getSyncStatusColor(status: string): string {
    switch (status) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      default: return 'text-amber-400';
    }
  }

  getSyncStatusIcon(status: string): string {
    switch (status) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      default: return 'pending';
    }
  }

  private buildTextVersion(): string {
    const out = this.output();
    if (!out) return '';
    const lines: string[] = [`=== ${this.agentMeta?.name ?? this.agentId} — Output ===\n`];

    switch (out.type) {
      case 'email':
        lines.push(`Betreff: ${out.subject}`, '', out.greeting, '', ...out.body, '', out.cta);
        break;
      case 'linkedin-post':
        lines.push(out.headline, '', ...out.body, '', out.cta, '', out.hashtags.join(' '));
        break;
      case 'video-script':
        lines.push(`Titel: ${out.title}`, '', `Hook: ${out.hook}`, '');
        out.sections.forEach(s => {
          lines.push(`## ${s.heading}`, s.narration, `[Visual: ${s.visualNote}]`, '');
        });
        lines.push(`CTA: ${out.cta}`);
        break;
      case 'lead-table':
        lines.push(`Gefundene Leads: ${out.totalFound} (${out.highScoreCount} Hot Leads)`, '');
        out.leads.forEach(l => {
          lines.push(`${l.name} | ${l.company} | Score: ${l.score} | ${l.status}`);
        });
        break;
      case 'keyword-table':
        lines.push(`Top-Chance: ${out.topOpportunity}`, '');
        out.keywords.forEach(k => {
          lines.push(`${k.keyword} | Vol: ${k.volume.toLocaleString()} | Difficulty: ${k.difficulty} | ${k.opportunity}`);
        });
        break;
      case 'sync-report':
        lines.push(
          `Records gesamt: ${out.totalRecords}`,
          `Synchronisiert: ${out.synced}`,
          `Duplikate entfernt: ${out.duplicatesRemoved}`,
          `Angereichert: ${out.enriched}`,
          `Fehler: ${out.errors}`,
          '',
        );
        out.syncItems.forEach(s => {
          lines.push(`${s.source} → ${s.target}: ${s.status} (${s.recordCount} Records)`);
        });
        break;
    }
    return lines.join('\n');
  }
}
