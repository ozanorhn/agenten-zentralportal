import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FunnelRole {
  title: string;
  urgencyScore: number;
  summary: string;
  bottleneck: string;
  metrics: { label: string; value: string }[];
  actions: string[];
}

const ANALYSIS_STEPS = [
  'Bewerberquellen werden ausgewertet ...',
  'Conversion-Stufen werden verglichen ...',
  'Drop-offs werden lokalisiert ...',
  'Hiring-Geschwindigkeit wird bewertet ...',
  'Prioritäten werden ausgegeben ...',
];

const FUNNEL_RESULTS: FunnelRole[] = [
  {
    title: 'Projektmanager (m/w/d)',
    urgencyScore: 92,
    summary: 'Der Funnel hat gute Erstbewerbungen, verliert aber zu viele Kandidat:innen zwischen Erstgespräch und Fachrunde.',
    bottleneck: 'Zu langsame Rückmeldung nach dem ersten Interview',
    metrics: [
      { label: 'Bewerbungen', value: '38' },
      { label: 'Interview-Rate', value: '29%' },
      { label: 'Time-to-Hire', value: '31 Tage' },
    ],
    actions: ['Feedback-SLA auf 24h setzen', 'Interviewleitfaden straffen', 'Zweitgespräch bündeln'],
  },
  {
    title: 'SEO & GEO-Manager (m/w/d)',
    urgencyScore: 84,
    summary: 'Der Funnel zieht passende Profile an, aber die CV-Qualität schwankt stark und frisst Screening-Zeit.',
    bottleneck: 'Zu breites Targeting in den ersten Bewerberquellen',
    metrics: [
      { label: 'Bewerbungen', value: '51' },
      { label: 'Interview-Rate', value: '18%' },
      { label: 'Time-to-Hire', value: '26 Tage' },
    ],
    actions: ['Anforderungsprofil schärfen', 'Must-have-Screening härter setzen', 'Fachtest früher platzieren'],
  },
  {
    title: 'AI Automation Engineer (m/w/d)',
    urgencyScore: 96,
    summary: 'Die Pipeline ist kritisch, weil gute Kandidat:innen knapp sind und der Prozess an mehreren Stellen zu langsam reagiert.',
    bottleneck: 'Engpass bei qualifizierten Profilen und zu lange Abstimmungszeit intern',
    metrics: [
      { label: 'Bewerbungen', value: '17' },
      { label: 'Interview-Rate', value: '35%' },
      { label: 'Time-to-Hire', value: '42 Tage' },
    ],
    actions: ['Active Sourcing priorisieren', 'Technikinterview verkürzen', 'Hiring Manager direkt in Runde 1 holen'],
  },
];

@Component({
  selector: 'app-hiring-funnel-agent',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './hiring-funnel-agent.html',
  styleUrl: './hiring-funnel-agent.scss',
})
export class HiringFunnelAgentComponent implements OnDestroy {
  readonly isAnalyzing = signal(false);
  readonly hasCompleted = signal(false);
  readonly progress = signal(0);
  readonly progressLabel = signal(ANALYSIS_STEPS[0]);
  readonly roles = signal<FunnelRole[]>([]);

  private progressIntervalId: ReturnType<typeof setInterval> | null = null;
  private finishTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly maxUrgency = computed(() => Math.max(...this.roles().map((role) => role.urgencyScore), 0));

  startAnalysis(): void {
    if (this.isAnalyzing()) {
      return;
    }

    this.clearTimers();
    this.isAnalyzing.set(true);
    this.hasCompleted.set(false);
    this.roles.set([]);
    this.progress.set(0);
    this.progressLabel.set(ANALYSIS_STEPS[0]);

    let currentStep = 0;

    this.progressIntervalId = setInterval(() => {
      currentStep += 1;
      this.progress.set(Math.min(currentStep * 20, 100));
      this.progressLabel.set(ANALYSIS_STEPS[Math.min(currentStep, ANALYSIS_STEPS.length - 1)]);
    }, 1000);

    this.finishTimeoutId = setTimeout(() => {
      this.clearTimers();
      this.progress.set(100);
      this.progressLabel.set(ANALYSIS_STEPS[ANALYSIS_STEPS.length - 1]);
      this.roles.set(FUNNEL_RESULTS);
      this.isAnalyzing.set(false);
      this.hasCompleted.set(true);
    }, 5000);
  }

  trackRole(_: number, role: FunnelRole): string {
    return role.title;
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  private clearTimers(): void {
    if (this.progressIntervalId) {
      clearInterval(this.progressIntervalId);
      this.progressIntervalId = null;
    }

    if (this.finishTimeoutId) {
      clearTimeout(this.finishTimeoutId);
      this.finishTimeoutId = null;
    }
  }
}
