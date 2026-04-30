import { CommonModule } from '@angular/common';
import { Component, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface PriceItem {
  item: string;
  description: string;
  price: string;
  highlight: boolean;
}

interface ProposalResult {
  title: string;
  client: string;
  date: string;
  validUntil: string;
  executiveSummary: string;
  scope: { title: string; points: string[] }[];
  priceItems: PriceItem[];
  totalNet: string;
  totalGross: string;
  nextSteps: { step: string; date: string; owner: string }[];
  contact: { name: string; email: string; phone: string };
}

const ANALYSIS_STEPS = [
  'Anforderungen werden analysiert ...',
  'Leistungsumfang wird definiert ...',
  'Preisstruktur wird berechnet ...',
  'Angebot wird strukturiert ...',
  'Dokument wird finalisiert ...',
];

const PROPOSAL_RESULT: ProposalResult = {
  title: 'Angebot: KI-gestützte Marketing-Automatisierung',
  client: 'Vantix Digital GmbH',
  date: '29. April 2026',
  validUntil: '29. Mai 2026',
  executiveSummary:
    'Wir freuen uns, Ihnen unser Angebot für die Implementierung einer KI-gestützten Marketing-Automatisierungslösung zu unterbreiten. Basierend auf unserem Gespräch vom 22. April schlagen wir einen modularen Ansatz vor, der Ihre bestehenden Prozesse nahtlos integriert und innerhalb von 8 Wochen produktiv ist. Unser Ziel: 40 % weniger manueller Aufwand im Content-Workflow und messbare Steigerung der Lead-Qualität.',
  scope: [
    {
      title: 'Phase 1 — Analyse & Strategie',
      points: [
        'Prozessanalyse und Ist-Stand-Dokumentation',
        'KI-Potenzialanalyse für bestehende Workflows',
        'Technische Architektur und Integrationsplan',
        'Stakeholder-Workshop (halbtägig)',
      ],
    },
    {
      title: 'Phase 2 — Implementierung',
      points: [
        'Setup KI-Automatisierungsplattform (n8n)',
        'Integration CRM, E-Mail und Content-Tools',
        'Entwicklung von 5 automatisierten Workflows',
        'Quality-Assurance und Testphase',
      ],
    },
    {
      title: 'Phase 3 — Launch & Übergabe',
      points: [
        'Go-Live-Begleitung und Monitoring (2 Wochen)',
        'Team-Schulung (2 Sessions à 2 Stunden)',
        'Dokumentation und Übergabepaket',
        '30-Tage-Support nach Launch',
      ],
    },
  ],
  priceItems: [
    {
      item: 'Phase 1 — Analyse & Strategie',
      description: '2 Wochen, inkl. Workshop',
      price: '€ 4.800',
      highlight: false,
    },
    {
      item: 'Phase 2 — Implementierung',
      description: '4 Wochen, 5 Workflows',
      price: '€ 12.400',
      highlight: true,
    },
    {
      item: 'Phase 3 — Launch & Übergabe',
      description: '2 Wochen inkl. Schulung',
      price: '€ 3.600',
      highlight: false,
    },
    {
      item: 'Support-Retainer (optional)',
      description: '3 Monate, 4h/Monat',
      price: '€ 2.400',
      highlight: false,
    },
  ],
  totalNet: '€ 23.200',
  totalGross: '€ 27.608',
  nextSteps: [
    { step: 'Angebot freigeben & Auftrag erteilen', date: '05. Mai 2026', owner: 'Vantix Digital GmbH' },
    { step: 'Kick-off-Termin vereinbaren', date: '08. Mai 2026', owner: 'Beide Parteien' },
    { step: 'Projektstart Phase 1', date: '12. Mai 2026', owner: 'EOM Agentur' },
  ],
  contact: {
    name: 'Stefan Fleckenstein',
    email: 'stefan@arcnode.de',
    phone: '+49 40 123 456 78',
  },
};

@Component({
  selector: 'app-angebots-assistent',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './angebots-assistent.html',
  styleUrl: './angebots-assistent.scss',
})
export class AngebotAssistentComponent implements OnDestroy {
  readonly isAnalyzing = signal(false);
  readonly hasCompleted = signal(false);
  readonly progress = signal(0);
  readonly progressLabel = signal(ANALYSIS_STEPS[0]);
  readonly result = signal<ProposalResult | null>(null);

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
      this.result.set(PROPOSAL_RESULT);
      this.isAnalyzing.set(false);
      this.hasCompleted.set(true);
    }, 5000);
  }

  trackScope(_: number, s: { title: string }): string {
    return s.title;
  }

  trackPrice(_: number, p: PriceItem): string {
    return p.item;
  }

  trackStep(_: number, s: { step: string }): string {
    return s.step;
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
