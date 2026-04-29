import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface InterviewCandidate {
  name: string;
  overallScore: number;
  recommendation: 'Strong Hire' | 'Hire' | 'Hold';
  summary: string;
  scores: { label: string; value: number }[];
  strengths: string[];
  risks: string[];
}

const ANALYSIS_STEPS = [
  'Interviewnotizen werden zusammengeführt ...',
  'Kompetenzsignale werden gewichtet ...',
  'Antwortqualität und Ownership werden bewertet ...',
  'Risikosignale werden priorisiert ...',
  'Hiring-Empfehlung wird erstellt ...',
];

const FINALISTS: InterviewCandidate[] = [
  {
    name: 'Lena Baum',
    overallScore: 94,
    recommendation: 'Strong Hire',
    summary: 'Klar stärkste Kandidatin mit hoher Struktur, sehr guter Kommunikation und belastbarem Führungs- und Delivery-Signal.',
    scores: [
      { label: 'Fachlicher Fit', value: 95 },
      { label: 'Ownership', value: 93 },
      { label: 'Kommunikation', value: 94 },
    ],
    strengths: ['Klare Priorisierung', 'Ruhige Stakeholder-Führung', 'Messbare Projekterfolge'],
    risks: ['Gehaltserwartung liegt im oberen Band'],
  },
  {
    name: 'Can Demir',
    overallScore: 87,
    recommendation: 'Hire',
    summary: 'Starker Kandidat mit guter Dynamik im Gespräch und sehr solidem operativem Fit, aber noch mit kleineren Lücken in der Seniorität.',
    scores: [
      { label: 'Fachlicher Fit', value: 89 },
      { label: 'Ownership', value: 84 },
      { label: 'Kommunikation', value: 88 },
    ],
    strengths: ['Hands-on Mentalität', 'Schnelle Auffassung', 'Klares Delivery-Verständnis'],
    risks: ['Weniger Erfahrung in komplexen Eskalationen'],
  },
  {
    name: 'Paula Rehm',
    overallScore: 79,
    recommendation: 'Hold',
    summary: 'Sympathischer und sauberer Eindruck, aber aktuell eher als zweite Reihe oder für ein enger abgegrenztes Setup überzeugend.',
    scores: [
      { label: 'Fachlicher Fit', value: 81 },
      { label: 'Ownership', value: 77 },
      { label: 'Kommunikation', value: 80 },
    ],
    strengths: ['Sehr gute Teamenergie', 'Saubere Antworten', 'Lernbereitschaft'],
    risks: ['Noch zu wenig Tiefgang für Lead-Niveau', 'Begrenzte Erfahrung in Konfliktsituationen'],
  },
];

@Component({
  selector: 'app-interview-scorecard-agent',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './interview-scorecard-agent.html',
  styleUrl: './interview-scorecard-agent.scss',
})
export class InterviewScorecardAgentComponent implements OnDestroy {
  readonly isAnalyzing = signal(false);
  readonly hasCompleted = signal(false);
  readonly progress = signal(0);
  readonly progressLabel = signal(ANALYSIS_STEPS[0]);
  readonly finalists = signal<InterviewCandidate[]>([]);

  private progressIntervalId: ReturnType<typeof setInterval> | null = null;
  private finishTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly topRecommendation = computed(() => this.finalists()[0]?.recommendation ?? 'Hold');

  startAnalysis(): void {
    if (this.isAnalyzing()) {
      return;
    }

    this.clearTimers();
    this.isAnalyzing.set(true);
    this.hasCompleted.set(false);
    this.finalists.set([]);
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
      this.finalists.set(FINALISTS);
      this.isAnalyzing.set(false);
      this.hasCompleted.set(true);
    }, 5000);
  }

  trackCandidate(_: number, candidate: InterviewCandidate): string {
    return candidate.name;
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
