import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface PipelineDeal {
  companyName: string;
  industry: string;
  stage: string;
  stageTone: 'emerald' | 'amber' | 'blue' | 'orange';
  dealValue: string;
  winScore: number;
  riskSignal: string;
  nextAction: string;
  metrics: { label: string; value: string }[];
  tags: string[];
}

const ANALYSIS_STEPS = [
  'Deals werden aus CRM geladen ...',
  'Win-Wahrscheinlichkeiten werden berechnet ...',
  'Risikosignale werden identifiziert ...',
  'Maßnahmen werden priorisiert ...',
  'Pipeline-Score wird ausgegeben ...',
];

const PIPELINE_RESULTS: PipelineDeal[] = [
  {
    companyName: 'Neon Commerce GmbH',
    industry: 'E-Commerce',
    stage: 'Proposal',
    stageTone: 'amber',
    dealValue: '€24.000 / Jahr',
    winScore: 78,
    riskSignal: 'Kein Kontakt seit 9 Tagen — Momentum sinkt',
    nextAction: 'Follow-up-Anruf heute Nachmittag ansetzen',
    metrics: [
      { label: 'ARR', value: '€24.000' },
      { label: 'Kontakte', value: '3 Personen' },
      { label: 'Zyklus', value: '22 Tage' },
    ],
    tags: ['Proposal versendet', 'Budget bestätigt', 'Entscheider bekannt'],
  },
  {
    companyName: 'Vantix Group AG',
    industry: 'B2B Software',
    stage: 'Closing',
    stageTone: 'emerald',
    dealValue: '€44.000 / Jahr',
    winScore: 62,
    riskSignal: 'Entscheider nicht direkt in Gespräch eingebunden',
    nextAction: 'Executive Briefing mit C-Level noch diese Woche',
    metrics: [
      { label: 'ARR', value: '€44.000' },
      { label: 'Kontakte', value: '6 Personen' },
      { label: 'Zyklus', value: '41 Tage' },
    ],
    tags: ['Legal Review läuft', 'Pilot abgeschlossen', 'Kommerziell offen'],
  },
  {
    companyName: 'Marktfeld AG',
    industry: 'Handel',
    stage: 'Demo',
    stageTone: 'blue',
    dealValue: '€16.000 / Jahr',
    winScore: 41,
    riskSignal: 'Budget nicht freigegeben — Q2-Entscheidung offen',
    nextAction: 'ROI-Kalkulation und Business Case bereitstellen',
    metrics: [
      { label: 'ARR', value: '€16.000' },
      { label: 'Kontakte', value: '2 Personen' },
      { label: 'Zyklus', value: '14 Tage' },
    ],
    tags: ['Demo durchgeführt', 'Interesse vorhanden', 'Budget unklar'],
  },
  {
    companyName: 'Deepflow Systems',
    industry: 'SaaS',
    stage: 'Erstgespräch',
    stageTone: 'orange',
    dealValue: '€28.000 / Jahr',
    winScore: 89,
    riskSignal: 'Konkurrenzlösung aktiv in Evaluierung',
    nextAction: 'Differenzierungs-Pitch und Case Study vorbereiten',
    metrics: [
      { label: 'ARR', value: '€28.000' },
      { label: 'Kontakte', value: '1 Person' },
      { label: 'Zyklus', value: '4 Tage' },
    ],
    tags: ['Hohe Kaufabsicht', 'Schneller Zyklus', 'Wettbewerb aktiv'],
  },
];

@Component({
  selector: 'app-pipeline-analyst',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pipeline-analyst.html',
  styleUrl: './pipeline-analyst.scss',
})
export class PipelineAnalystComponent implements OnDestroy {
  readonly isAnalyzing = signal(false);
  readonly hasCompleted = signal(false);
  readonly progress = signal(0);
  readonly progressLabel = signal(ANALYSIS_STEPS[0]);
  readonly deals = signal<PipelineDeal[]>([]);

  private progressIntervalId: ReturnType<typeof setInterval> | null = null;
  private finishTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly avgWinScore = computed(() => {
    const d = this.deals();
    if (!d.length) return 0;
    return Math.round(d.reduce((s, deal) => s + deal.winScore, 0) / d.length);
  });

  startAnalysis(): void {
    if (this.isAnalyzing()) return;

    this.clearTimers();
    this.isAnalyzing.set(true);
    this.hasCompleted.set(false);
    this.deals.set([]);
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
      this.deals.set(PIPELINE_RESULTS);
      this.isAnalyzing.set(false);
      this.hasCompleted.set(true);
    }, 5000);
  }

  getStageBadgeClasses(tone: string): string {
    const map: Record<string, string> = {
      emerald: 'border border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
      amber: 'border border-amber-400/20 bg-amber-400/10 text-amber-300',
      blue: 'border border-blue-400/20 bg-blue-400/10 text-blue-300',
      orange: 'border border-orange-400/20 bg-orange-400/10 text-orange-300',
    };
    return map[tone] ?? '';
  }

  getWinScoreClass(score: number): string {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-orange-400';
  }

  trackDeal(_: number, deal: PipelineDeal): string {
    return deal.companyName;
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
