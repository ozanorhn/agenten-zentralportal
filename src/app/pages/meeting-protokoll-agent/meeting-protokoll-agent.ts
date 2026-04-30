import { CommonModule } from '@angular/common';
import { Component, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ActionItem {
  task: string;
  owner: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
}

interface MeetingResult {
  title: string;
  date: string;
  duration: string;
  location: string;
  attendees: { name: string; role: string }[];
  agendaItems: string[];
  decisions: string[];
  actionItems: ActionItem[];
  nextMeeting: string;
}

const ANALYSIS_STEPS = [
  'Notizen werden strukturiert ...',
  'Teilnehmer werden identifiziert ...',
  'Beschlüsse werden extrahiert ...',
  'Action Items werden zugeordnet ...',
  'Protokoll wird formatiert ...',
];

const MEETING_RESULT: MeetingResult = {
  title: 'Q2-Planungsmeeting: Produktentwicklung',
  date: '29. April 2026',
  duration: '60 Minuten',
  location: 'Konferenzraum B / Remote',
  attendees: [
    { name: 'Sarah Köhler', role: 'Head of Product' },
    { name: 'Marcus Brandt', role: 'Tech Lead' },
    { name: 'Jana Reuter', role: 'Design' },
    { name: 'Tom Freund', role: 'Marketing' },
    { name: 'Lisa Maier', role: 'Engineering' },
  ],
  agendaItems: [
    'Q1 Retrospektive & Learnings',
    'Q2 Roadmap Review & Priorisierung',
    'Launch-Zeitplan für Feature X',
    'Ressourcen & Kapazitätsplanung',
    'Sonstiges',
  ],
  decisions: [
    'Feature X wird am 15. Mai in Staging deployed. Kein weiterer Scope-Creep.',
    'Onboarding-Flow wird vor dem Launch überarbeitet (Jana übernimmt Design-Ownership).',
    'Marketing startet Pre-Launch-Kampagne ab 8. Mai. Tom koordiniert mit Sarah.',
    'Wöchentlicher Sync wird auf Dienstag 10:00 Uhr verlegt.',
  ],
  actionItems: [
    {
      task: 'Tech Spec für Feature X finalisieren und mit Team teilen',
      owner: 'Marcus Brandt',
      deadline: '02. Mai',
      priority: 'high',
    },
    {
      task: 'Onboarding-Screens in Figma aktualisieren',
      owner: 'Jana Reuter',
      deadline: '05. Mai',
      priority: 'high',
    },
    {
      task: 'Pre-Launch-Briefing für Marketing vorbereiten',
      owner: 'Tom Freund',
      deadline: '06. Mai',
      priority: 'medium',
    },
    {
      task: 'Staging-Deployment vorbereiten & Checklist erstellen',
      owner: 'Lisa Maier',
      deadline: '12. Mai',
      priority: 'high',
    },
    {
      task: 'Q2 Roadmap in Notion aktualisieren',
      owner: 'Sarah Köhler',
      deadline: '30. April',
      priority: 'medium',
    },
  ],
  nextMeeting: 'Dienstag, 06. Mai 2026, 10:00 Uhr',
};

@Component({
  selector: 'app-meeting-protokoll-agent',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './meeting-protokoll-agent.html',
  styleUrl: './meeting-protokoll-agent.scss',
})
export class MeetingProtokollAgentComponent implements OnDestroy {
  readonly isAnalyzing = signal(false);
  readonly hasCompleted = signal(false);
  readonly progress = signal(0);
  readonly progressLabel = signal(ANALYSIS_STEPS[0]);
  readonly result = signal<MeetingResult | null>(null);

  private progressIntervalId: ReturnType<typeof setInterval> | null = null;
  private finishTimeoutId: ReturnType<typeof setTimeout> | null = null;

  startAnalysis(): void {
    if (this.isAnalyzing()) return;

    this.clearTimers();
    this.isAnalyzing.set(true);
    this.hasCompleted.set(false);
    this.result.set(null);
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
      this.result.set(MEETING_RESULT);
      this.isAnalyzing.set(false);
      this.hasCompleted.set(true);
    }, 5000);
  }

  getPriorityClasses(priority: string): string {
    const map: Record<string, string> = {
      high: 'border border-rose-400/20 bg-rose-400/10 text-rose-700',
      medium: 'border border-amber-400/20 bg-amber-400/10 text-amber-700',
      low: 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-700',
    };
    return map[priority] ?? '';
  }

  getPriorityLabel(priority: string): string {
    const map: Record<string, string> = { high: 'Hoch', medium: 'Mittel', low: 'Niedrig' };
    return map[priority] ?? priority;
  }

  trackItem(_: number, item: ActionItem): string {
    return item.task;
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
