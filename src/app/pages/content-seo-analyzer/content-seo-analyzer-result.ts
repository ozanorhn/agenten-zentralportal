import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  ContentSeoAnalyzerCompetitiveSection,
  ContentSeoAnalyzerSeoSection,
  findContentSeoAnalyzerReport,
  StoredContentSeoAnalyzerReport,
} from './content-seo-analyzer.models';

interface InsightCard {
  title: string;
  description: string;
  items: string[];
  icon: string;
}

@Component({
  selector: 'app-content-seo-analyzer-result',
  standalone: true,
  templateUrl: './content-seo-analyzer-result.html',
})
export class ContentSeoAnalyzerResultComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly agentId = 'content-seo-analyzer';
  readonly agentMeta = AGENTS_MAP[this.agentId];
  readonly reportId = this.route.snapshot.queryParamMap.get('reportId');

  private readonly _record = signal<StoredContentSeoAnalyzerReport | null>(
    findContentSeoAnalyzerReport(this.reportId),
  );

  readonly record = this._record.asReadonly();
  readonly seo = computed<ContentSeoAnalyzerSeoSection | null>(() => this.record()?.payload.seo ?? null);
  readonly competitive = computed<ContentSeoAnalyzerCompetitiveSection | null>(() => this.record()?.payload.competitive ?? null);
  readonly seoScore = computed<number | null>(() => this.seo()?.score ?? null);
  readonly scoreLabel = computed(() => {
    const score = this.seoScore();
    if (score === null) {
      return 'Nicht verfuegbar';
    }

    if (score >= 8) {
      return 'Stark';
    }

    if (score >= 5) {
      return 'Solide';
    }

    return 'Ausbaufaehig';
  });
  readonly scoreToneClass = computed(() => {
    const score = this.seoScore();
    if (score === null) {
      return 'text-on-surface';
    }

    if (score >= 8) {
      return 'text-emerald-400';
    }

    if (score >= 5) {
      return 'text-amber-300';
    }

    return 'text-rose-300';
  });
  readonly seoInsightCards = computed<InsightCard[]>(() => {
    const seo = this.seo();
    return [
      {
        title: 'Content Gaps',
        description: 'Themen und Inhalte, die im aktuellen Auftritt noch fehlen.',
        items: seo?.contentGaps ?? [],
        icon: 'plagiarism',
      },
      {
        title: 'Keyword Opportunities',
        description: 'Suchbegriffe mit Potenzial fuer Sichtbarkeit und Nachfrage.',
        items: seo?.keywordOpportunities ?? [],
        icon: 'manage_search',
      },
      {
        title: 'Quick Wins',
        description: 'Schnelle Optimierungen mit direktem Hebel fuer SEO und Content.',
        items: seo?.quickWins ?? [],
        icon: 'bolt',
      },
    ].filter((card) => card.items.length > 0);
  });

  goBack(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  rerun(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp);
  }
}
