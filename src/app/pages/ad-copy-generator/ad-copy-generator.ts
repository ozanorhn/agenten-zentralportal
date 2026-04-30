import { CommonModule } from '@angular/common';
import { Component, OnDestroy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface GoogleAd {
  label: string;
  tone: string;
  headline1: string;
  headline2: string;
  headline3: string;
  description1: string;
  description2: string;
  qualityScore: number;
}

interface MetaAd {
  format: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
}

interface AdResult {
  product: string;
  targetAudience: string;
  googleAds: GoogleAd[];
  metaAd: MetaAd;
}

const ANALYSIS_STEPS = [
  'Produkt & USPs werden analysiert ...',
  'Zielgruppe wird definiert ...',
  'Headlines werden generiert ...',
  'Descriptions werden optimiert ...',
  'Anzeigen werden finalisiert ...',
];

const AD_RESULT: AdResult = {
  product: 'KI-Planungssoftware für Agenturen',
  targetAudience: 'Marketing-Agenturen, 10–50 Mitarbeiter, DACH',
  googleAds: [
    {
      label: 'Variante A',
      tone: 'benefit',
      headline1: 'KI-Planung für Agenturen',
      headline2: '30 % weniger Planungsaufwand',
      headline3: 'Jetzt kostenlos testen',
      description1: 'Automatisierte Projektplanung mit KI. Spart Zeit, reduziert Fehler, hält Ihr Team im Takt.',
      description2: 'Speziell für Agenturen entwickelt. Keine Einrichtungskosten. 14 Tage gratis.',
      qualityScore: 9,
    },
    {
      label: 'Variante B',
      tone: 'pain',
      headline1: 'Schluss mit Planungschaos',
      headline2: 'KI übernimmt Ihre Planung',
      headline3: 'Demo in 5 Minuten buchen',
      description1: 'Zu viele Tabs, zu viele Mails, zu wenig Überblick? Unsere KI plant automatisch und fehlerfrei.',
      description2: 'Über 200 Agenturen nutzen bereits unsere Lösung. Testen Sie jetzt kostenlos.',
      qualityScore: 8,
    },
    {
      label: 'Variante C',
      tone: 'social',
      headline1: '200+ Agenturen vertrauen uns',
      headline2: 'KI-Planung in 5 Minuten ready',
      headline3: 'Gratis-Test starten',
      description1: 'Die führende KI-Planungssoftware für Agenturen im DACH-Raum. Einfach einrichten, sofort produktiv.',
      description2: 'Bewährt bei Agenturen von 10 bis 150 Mitarbeitern. Kostenloser 14-Tage-Test, keine Kreditkarte nötig.',
      qualityScore: 8,
    },
  ],
  metaAd: {
    format: 'Single Image Ad (Feed)',
    primaryText:
      'Deine Agentur verliert täglich Stunden durch manuelle Planung. KI macht das in Sekunden. Automatisch priorisiert, immer aktuell, immer im Budget.',
    headline: 'KI-Planung für Agenturen',
    description: '14 Tage kostenlos testen. Keine Kreditkarte.',
    cta: 'Jetzt kostenlos starten',
  },
};

@Component({
  selector: 'app-ad-copy-generator',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './ad-copy-generator.html',
  styleUrl: './ad-copy-generator.scss',
})
export class AdCopyGeneratorComponent implements OnDestroy {
  readonly isAnalyzing = signal(false);
  readonly hasCompleted = signal(false);
  readonly progress = signal(0);
  readonly progressLabel = signal(ANALYSIS_STEPS[0]);
  readonly result = signal<AdResult | null>(null);

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
      this.result.set(AD_RESULT);
      this.isAnalyzing.set(false);
      this.hasCompleted.set(true);
    }, 5000);
  }

  getQualityScoreClass(score: number): string {
    if (score >= 9) return 'text-emerald-700';
    if (score >= 7) return 'text-amber-700';
    return 'text-orange-700';
  }

  getToneBadge(tone: string): string {
    const map: Record<string, string> = {
      benefit: 'border border-sky-400/20 bg-sky-400/10 text-sky-700',
      pain: 'border border-rose-400/20 bg-rose-400/10 text-rose-700',
      social: 'border border-violet-400/20 bg-violet-400/10 text-violet-700',
    };
    return map[tone] ?? '';
  }

  getToneLabel(tone: string): string {
    const map: Record<string, string> = { benefit: 'Nutzen', pain: 'Problem', social: 'Social Proof' };
    return map[tone] ?? tone;
  }

  trackAd(_: number, ad: GoogleAd): string {
    return ad.label;
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
