import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RunHistoryService } from '../../services/run-history.service';
import { AgentOutputService } from '../../services/agent-output.service';
import { NotificationService } from '../../services/notification.service';
import { AGENTS_MAP } from '../../data/agents.data';
import { AgentOutput, CompanyListOutput, CompanyRow, MarkdownOutput, RunRecord } from '../../models/interfaces';

const LEAD_RESEARCHER_WEBHOOK = 'https://n8n.eom.de/webhook/ac9a9c6c-a2f0-4389-9462-06cc82bebe8b';
const FIRMEN_FINDER_WEBHOOK = 'https://n8n.eom.de/webhook/3ecd15d2-2606-4ca3-b44e-b4c39208a39d';

@Component({
  selector: 'app-agent-detail',
  imports: [RouterLink],
  templateUrl: './agent-detail.html',
  styleUrl: './agent-detail.scss',
})
export class AgentDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly runHistory = inject(RunHistoryService);
  private readonly agentOutput = inject(AgentOutputService);
  private readonly notifService = inject(NotificationService);

  readonly agentId = this.route.snapshot.params['id'] as string;
  readonly agentMeta = AGENTS_MAP[this.agentId];

  readonly targetAudience = signal('');
  readonly companyName = signal('');
  readonly websiteUrl = signal('');
  readonly toneOfVoice = signal('Professionell & Sachlich');

  readonly isLeadResearcher = this.agentId === 'lead-researcher';
  readonly isFirmenFinder = this.agentId === 'firmen-finder';

  readonly industry = signal('');
  readonly city = signal('');

  readonly isSubmitting = signal(false);
  readonly progress = signal(0);
  readonly progressLabel = signal('Initialisiere Agent…');
  readonly webhookError = signal(false);

  readonly toneOptions = [
    'Professionell & Sachlich',
    'Inspirierend & Narrativ',
    'Direkt & Provokant',
    'Akademisch & Detailliert',
  ];

  readonly skills = computed(() => this.agentMeta?.skills ?? [
    { label: 'Copywriting', value: 95 },
    { label: 'Personalisierung', value: 88 },
    { label: 'Tonanalyse', value: 82 },
    { label: 'Conversion Rate', value: 91 },
  ]);

  readonly chartBars = [40, 65, 55, 90, 75, 45, 60, 85, 30, 50, 70, 95];

  private readonly PROGRESS_LABELS_FIRMEN = [
    'Initialisiere Agent…',
    'Verbinde mit Verzeichnis-Datenbank…',
    'Suche Unternehmen in der Region…',
    'Filtere nach Branche…',
    'Extrahiere Kontaktdaten…',
    'Firmenliste fertig ✓',
  ];

  private readonly PROGRESS_LABELS_LEAD = [
    'Initialisiere Agent…',
    'Verbinde mit Recherche-Engine…',
    'Analysiere Website-Daten…',
    'Erstelle Sales-Briefing…',
    'Finalisiere Dokument…',
    'Briefing fertig ✓',
  ];

  private readonly PROGRESS_LABELS = [
    'Initialisiere Agent…',
    'Analysiere Zielgruppe…',
    'Verarbeite Website-Daten…',
    'Generiere Content…',
    'Optimiere Ausgabe…',
    'Workflow abgeschlossen ✓',
  ];

  submitWorkflow(): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.progress.set(0);
    this.webhookError.set(false);

    if (this.isLeadResearcher) {
      this.runLeadResearcherWorkflow();
    } else if (this.isFirmenFinder) {
      this.runFirmenFinderWorkflow();
    } else {
      this.runGenericWorkflow();
    }
  }

  private runLeadResearcherWorkflow(): void {
    const labels = this.PROGRESS_LABELS_LEAD;
    this.progressLabel.set(labels[0]);

    const startTime = Date.now();
    const minDuration = 3000;

    // Animate progress to 80% while waiting for webhook
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / minDuration) * 80), 80);
      this.progress.set(pct);
      if (pct >= 60) this.progressLabel.set(labels[4]);
      else if (pct >= 40) this.progressLabel.set(labels[3]);
      else if (pct >= 20) this.progressLabel.set(labels[2]);
      else if (pct >= 5)  this.progressLabel.set(labels[1]);
    }, 80);

    const body = {
      companyName: this.companyName(),
      websiteUrl: this.websiteUrl(),
    };

    this.http.post(LEAD_RESEARCHER_WEBHOOK, body, { responseType: 'text' }).subscribe({
      next: (response: string) => {
        clearInterval(interval);
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDuration - elapsed);

        setTimeout(() => {
          this.progress.set(100);
          this.progressLabel.set(labels[5]);
          setTimeout(() => this.completeLeadResearcher(response), 400);
        }, remaining);
      },
      error: () => {
        clearInterval(interval);
        this.webhookError.set(true);
        this.progress.set(100);
        this.progressLabel.set('Fehler beim Abrufen der Daten');
        setTimeout(() => {
          this.isSubmitting.set(false);
        }, 800);
      },
    });
  }

  private completeLeadResearcher(rawResponse: string): void {
    const output: MarkdownOutput = {
      type: 'markdown',
      content: this.extractMarkdownContent(rawResponse),
      companyName: this.companyName(),
      websiteUrl: this.websiteUrl(),
    };

    this.saveAndNavigate(output, `Sales Briefing: ${this.companyName()}`);
  }

  private extractMarkdownContent(raw: string): string {
    let content = raw.trim();

    // Try to extract from JSON (handles single and double-encoded responses)
    for (let i = 0; i < 2; i++) {
      if (!content.startsWith('{') && !content.startsWith('[')) break;
      try {
        const parsed = JSON.parse(content);
        const obj = Array.isArray(parsed) ? parsed[0] : parsed;
        const extracted: unknown = obj?.briefing ?? obj?.output ?? obj?.body ?? obj?.content;
        if (typeof extracted === 'string') {
          content = extracted;
        } else {
          break;
        }
      } catch {
        // Malformed JSON — try regex extraction as fallback
        const match = raw.match(/"(?:briefing|output|body|content)"\s*:\s*"([\s\S]+?)"\s*[,}]/);
        if (match) {
          content = match[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\"/g, '"');
        }
        break;
      }
    }

    // Strip leading type-prefix artifact e.g. "markdown\n" that n8n may prepend
    content = content.replace(/^markdown\r?\n/, '');

    // If no real newlines but literal \n sequences exist, unescape them
    if (!content.includes('\n') && content.includes('\\n')) {
      content = content.replace(/\\n/g, '\n');
    }

    return content;
  }

  private runFirmenFinderWorkflow(): void {
    const labels = this.PROGRESS_LABELS_FIRMEN;
    this.progressLabel.set(labels[0]);

    const startTime = Date.now();
    const minDuration = 3000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / minDuration) * 80), 80);
      this.progress.set(pct);
      if (pct >= 60) this.progressLabel.set(labels[4]);
      else if (pct >= 40) this.progressLabel.set(labels[3]);
      else if (pct >= 20) this.progressLabel.set(labels[2]);
      else if (pct >= 5)  this.progressLabel.set(labels[1]);
    }, 80);

    const body = {
      industry: this.industry(),
      city: this.city(),
    };

    this.http.post(FIRMEN_FINDER_WEBHOOK, body, { responseType: 'text' }).subscribe({
      next: (response: string) => {
        clearInterval(interval);
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDuration - elapsed);

        setTimeout(() => {
          this.progress.set(100);
          this.progressLabel.set(labels[5]);
          setTimeout(() => this.completeFirmenFinder(response), 400);
        }, remaining);
      },
      error: () => {
        clearInterval(interval);
        this.webhookError.set(true);
        this.progress.set(100);
        this.progressLabel.set('Fehler beim Abrufen der Daten');
        setTimeout(() => {
          this.isSubmitting.set(false);
        }, 800);
      },
    });
  }

  private completeFirmenFinder(rawResponse: string): void {
    let companies: CompanyRow[] = [];
    try {
      const parsed = JSON.parse(rawResponse);
      // n8n may return a full array OR just the first item as a single object
      const arr: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      companies = arr
        .map((item) => (item as { contactInfo?: CompanyRow })?.contactInfo)
        .filter((c): c is CompanyRow => !!c);
    } catch {
      // Malformed JSON — proceed with empty list
    }

    const output: CompanyListOutput = {
      type: 'company-list',
      companies,
      industry: this.industry(),
      city: this.city(),
    };

    const summary = `${companies.length} Unternehmen gefunden in ${this.city()}`;
    const input = { industry: this.industry(), city: this.city() };
    this.saveAndNavigate(output, summary, input);
  }

  private runGenericWorkflow(): void {
    const labels = this.PROGRESS_LABELS;
    this.progressLabel.set(labels[0]);

    const totalMs = 3000;
    const intervalMs = 80;
    const steps = totalMs / intervalMs;
    let current = 0;

    const interval = setInterval(() => {
      current++;
      const pct = Math.min(Math.round((current / steps) * 100), 100);
      this.progress.set(pct);

      if (pct >= 90) this.progressLabel.set(labels[5]);
      else if (pct >= 70) this.progressLabel.set(labels[4]);
      else if (pct >= 50) this.progressLabel.set(labels[3]);
      else if (pct >= 30) this.progressLabel.set(labels[2]);
      else if (pct >= 10) this.progressLabel.set(labels[1]);

      if (pct >= 100) {
        clearInterval(interval);
        this.finishGenericWorkflow();
      }
    }, intervalMs);
  }

  private finishGenericWorkflow(): void {
    const input = {
      targetAudience: this.targetAudience(),
      websiteUrl: this.websiteUrl(),
      toneOfVoice: this.toneOfVoice(),
    };

    const output = this.agentOutput.generateOutput(this.agentId, input);

    let summary = '';
    switch (output.type) {
      case 'email':         summary = output.subject; break;
      case 'linkedin-post': summary = output.headline; break;
      case 'video-script':  summary = output.title; break;
      case 'lead-table':    summary = `${output.totalFound} Leads gefunden`; break;
      case 'keyword-table': summary = `Top-Chance: ${output.topOpportunity}`; break;
      case 'sync-report':   summary = `${output.synced}/${output.totalRecords} Records sync`; break;
      case 'markdown':      summary = output.companyName ?? 'Bericht'; break;
    }

    this.saveAndNavigate(output, summary, input);
  }

  private saveAndNavigate(
    output: AgentOutput,
    summary: string,
    input?: Record<string, string | undefined>,
  ): void {
    const resolvedInput = input ?? {
      companyName: this.companyName(),
      websiteUrl: this.websiteUrl(),
    };

    const record: RunRecord = {
      id: `run-${Date.now()}`,
      agentId: this.agentId,
      agentName: this.agentMeta?.name ?? this.agentId,
      agentIcon: this.agentMeta?.icon ?? 'smart_toy',
      agentCategory: (this.agentMeta?.category ?? 'Sales') as RunRecord['agentCategory'],
      timestamp: Date.now(),
      inputData: resolvedInput,
      outputSummary: summary,
      fullOutput: output,
      tokenCount: Math.floor(Math.random() * 800) + 400,
    };

    this.runHistory.addRun(record);

    this.notifService.addNotification({
      agentId: this.agentId,
      agentName: this.agentMeta?.name ?? this.agentId,
      agentIcon: this.agentMeta?.icon ?? 'smart_toy',
      message: `${this.agentMeta?.name ?? 'Agent'} hat deinen Workflow abgeschlossen. Ergebnis bereit!`,
      time: 'Gerade eben',
      read: false,
      link: `/agents/${this.agentId}/result`,
    });

    setTimeout(() => {
      this.isSubmitting.set(false);
      this.router.navigate(['/agents', this.agentId, 'result']);
    }, 400);
  }
}
