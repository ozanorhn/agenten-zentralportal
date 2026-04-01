import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RunHistoryService } from '../../services/run-history.service';
import { AgentOutputService } from '../../services/agent-output.service';
import { NotificationService } from '../../services/notification.service';
import { AGENTS_MAP } from '../../data/agents.data';
import { RunRecord } from '../../models/interfaces';

@Component({
  selector: 'app-agent-detail',
  imports: [RouterLink],
  templateUrl: './agent-detail.html',
  styleUrl: './agent-detail.scss',
})
export class AgentDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly runHistory = inject(RunHistoryService);
  private readonly agentOutput = inject(AgentOutputService);
  private readonly notifService = inject(NotificationService);

  readonly agentId = this.route.snapshot.params['id'] as string;
  readonly agentMeta = AGENTS_MAP[this.agentId];

  readonly targetAudience = signal('');
  readonly websiteUrl = signal('');
  readonly toneOfVoice = signal('Professionell & Sachlich');

  readonly isSubmitting = signal(false);
  readonly progress = signal(0);
  readonly progressLabel = signal('Initialisiere Agent…');

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

  // Dummy chart bars
  readonly chartBars = [40, 65, 55, 90, 75, 45, 60, 85, 30, 50, 70, 95];

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
    this.progressLabel.set(this.PROGRESS_LABELS[0]);

    const totalMs = 3000;
    const intervalMs = 80;
    const steps = totalMs / intervalMs;
    let current = 0;

    const interval = setInterval(() => {
      current++;
      const pct = Math.min(Math.round((current / steps) * 100), 100);
      this.progress.set(pct);

      // Update label at milestone percentages
      if (pct >= 90) this.progressLabel.set(this.PROGRESS_LABELS[5]);
      else if (pct >= 70) this.progressLabel.set(this.PROGRESS_LABELS[4]);
      else if (pct >= 50) this.progressLabel.set(this.PROGRESS_LABELS[3]);
      else if (pct >= 30) this.progressLabel.set(this.PROGRESS_LABELS[2]);
      else if (pct >= 10) this.progressLabel.set(this.PROGRESS_LABELS[1]);

      if (pct >= 100) {
        clearInterval(interval);
        this.finishWorkflow();
      }
    }, intervalMs);
  }

  private finishWorkflow(): void {
    const input = {
      targetAudience: this.targetAudience(),
      websiteUrl: this.websiteUrl(),
      toneOfVoice: this.toneOfVoice(),
    };

    const output = this.agentOutput.generateOutput(this.agentId, input);

    // Build output summary
    let summary = '';
    switch (output.type) {
      case 'email': summary = output.subject; break;
      case 'linkedin-post': summary = output.headline; break;
      case 'video-script': summary = output.title; break;
      case 'lead-table': summary = `${output.totalFound} Leads gefunden`; break;
      case 'keyword-table': summary = `Top-Chance: ${output.topOpportunity}`; break;
      case 'sync-report': summary = `${output.synced}/${output.totalRecords} Records sync`; break;
    }

    const record: RunRecord = {
      id: `run-${Date.now()}`,
      agentId: this.agentId,
      agentName: this.agentMeta?.name ?? this.agentId,
      agentIcon: this.agentMeta?.icon ?? 'smart_toy',
      agentCategory: (this.agentMeta?.category ?? 'Sales') as RunRecord['agentCategory'],
      timestamp: Date.now(),
      inputData: input,
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
