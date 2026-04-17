import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  AiPlatformScore,
  BotCategoryItem,
  DimensionScore,
  findSeoGeoReport,
  GeoWebhookResult,
  QuickWin,
  ReportCategory,
  StoredSeoGeoReport,
  StrategicAction,
} from './seo-geo-assistant.models';

type SeoGeoTabKey = 'onpage' | 'technik' | 'offpage' | 'geo';

interface ScoreBox {
  label: string;
  value: number | null;
  max: number;
  tone: 'metric' | 'neutral';
  hint?: string;
}

interface TabDefinition {
  key: SeoGeoTabKey;
  label: string;
}

interface StatusItem {
  text: string;
  tone: 'ok' | 'warn' | 'bad';
}

interface BotCard {
  name: string;
  provider: string;
  statusCode: number | null;
  blocked: boolean;
}

interface DimensionCard {
  key: string;
  label: string;
  score: number | null;
  labelText: string;
  icon: string;
  facts: string[];
}

@Component({
  selector: 'app-seo-geo-assistant-result',
  standalone: true,
  templateUrl: './seo-geo-assistant-result.html',
})
export class SeoGeoAssistantResultComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly agentId = 'seo-geo-analyse-assistent';
  readonly agentMeta = AGENTS_MAP[this.agentId];
  readonly reportId = this.route.snapshot.queryParamMap.get('reportId');
  readonly activeTab = signal<SeoGeoTabKey>('onpage');
  readonly tabs: TabDefinition[] = [
    { key: 'onpage', label: 'Content & Onpage' },
    { key: 'technik', label: 'Technische Basis' },
    { key: 'offpage', label: 'Autorität & Offpage' },
    { key: 'geo', label: 'AI' },
  ];

  private readonly _record = signal<StoredSeoGeoReport | null>(findSeoGeoReport(this.reportId));

  readonly record = this._record.asReadonly();
  readonly output = computed<GeoWebhookResult | null>(() => this._record()?.payload ?? null);

  readonly scoreBoxes = computed<ScoreBox[]>(() => {
    const out = this.output();
    return [
      {
        label: 'GEO Score',
        value: out?.score?.total ?? null,
        max: 100,
        tone: 'metric',
        hint: out?.score?.label ?? undefined,
      },
      {
        label: 'Branchen-Median',
        value: out?.score?.median ?? null,
        max: 100,
        tone: 'neutral',
      },
    ];
  });

  readonly dimensionCards = computed<DimensionCard[]>(() =>
    (this.output()?.dimensions ?? []).map((dimension) => ({
      key: dimension.key ?? 'dimension',
      label: dimension.label ?? 'Dimension',
      score: dimension.score ?? null,
      labelText: dimension.label_text ?? '–',
      icon: this.dimensionIcon(dimension.key),
      facts: this.dimensionFacts(dimension),
    })),
  );

  readonly aiPlatforms = computed(() => this.output()?.aiPlatforms ?? []);
  readonly geoDimensionEntries = computed(() => Object.entries(this.output()?.report?.geo?.dimensionAnalysis ?? {}));
  readonly geoAiMode = computed(() => this.output()?.report?.geo?.aiMode ?? []);
  readonly strategicActions = computed(() => this.output()?.report?.geo?.strategicActions ?? []);

  readonly techniqueBotCards = computed<BotCard[]>(() =>
    (this.output()?.botAccessibilityCheck?.categories?.['AI Search']?.bots ?? [])
      .concat(this.output()?.botAccessibilityCheck?.categories?.['AI Training']?.bots ?? [])
      .concat(this.output()?.botAccessibilityCheck?.categories?.['AI Assistant']?.bots ?? [])
      .map((bot) => this.toBotCard(bot)),
  );

  readonly blockedBots = computed(() => this.output()?.botAccessibilityCheck?.assessment?.blockedBots ?? []);

  readonly onpageStatuses = computed(() => this.buildStatusItems(this.output()?.report?.onpage));
  readonly technikStatuses = computed(() => this.buildStatusItems(this.output()?.report?.technik));
  readonly offpageStatuses = computed(() => this.buildStatusItems(this.output()?.report?.offpage));

  setActiveTab(tab: SeoGeoTabKey): void {
    this.activeTab.set(tab);
  }

  goBack(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  formatDate(value?: string): string {
    if (!value) {
      return '–';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'short',
    }).format(date);
  }

  formatValue(value?: number | null): string {
    return value === null || value === undefined ? '–' : `${value}`;
  }

  formatScore(score?: number | null, max = 100): string {
    if (score === null || score === undefined) {
      return '–';
    }

    return `${score}/${max}`;
  }

  scoreBarWidth(score?: number | null, max = 100): string {
    if (!score || !max) {
      return '0%';
    }

    return `${Math.max(0, Math.min(100, (score / max) * 100))}%`;
  }

  scoreNumberClass(box: ScoreBox): string {
    if (box.tone === 'neutral') {
      return 'text-on-surface-variant';
    }

    return this.metricTextClass(box.value);
  }

  scoreBarClass(box: ScoreBox): string {
    if (box.tone === 'neutral') {
      return 'bg-outline-variant';
    }

    return this.metricBarClass(box.value);
  }

  metricTextClass(score?: number | null): string {
    if ((score ?? 0) >= 80) {
      return 'text-emerald-300';
    }

    if ((score ?? 0) >= 65) {
      return 'text-[#378ADD]';
    }

    if ((score ?? 0) >= 50) {
      return 'text-amber-300';
    }

    return 'text-red-300';
  }

  metricBarClass(score?: number | null): string {
    if ((score ?? 0) >= 80) {
      return 'bg-[#639922]';
    }

    if ((score ?? 0) >= 65) {
      return 'bg-[#378ADD]';
    }

    if ((score ?? 0) >= 50) {
      return 'bg-[#EF9F27]';
    }

    return 'bg-[#E24B4A]';
  }

  navClass(tab: SeoGeoTabKey): string {
    return this.activeTab() === tab
      ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.1)]'
      : 'text-on-surface-variant hover:text-on-surface';
  }

  statusClass(tone: StatusItem['tone']): string {
    switch (tone) {
      case 'ok':
        return 'border-emerald-500/20 bg-emerald-500/10';
      case 'warn':
        return 'border-amber-500/20 bg-amber-500/10';
      default:
        return 'border-red-500/20 bg-red-500/10';
    }
  }

  statusIconClass(tone: StatusItem['tone']): string {
    switch (tone) {
      case 'ok':
        return 'bg-emerald-500/15 text-emerald-300';
      case 'warn':
        return 'bg-amber-500/15 text-amber-300';
      default:
        return 'bg-red-500/15 text-red-300';
    }
  }

  statusSymbol(tone: StatusItem['tone']): string {
    switch (tone) {
      case 'ok':
        return 'check';
      case 'warn':
        return 'priority_high';
      default:
        return 'close';
    }
  }

  effortClass(value?: string): string {
    switch ((value ?? '').toLowerCase()) {
      case 'niedrig':
        return 'bg-emerald-500/10 text-emerald-300';
      case 'mittel':
        return 'bg-amber-500/10 text-amber-300';
      case 'hoch':
        return 'bg-red-500/10 text-red-300';
      default:
        return 'bg-surface-container-high text-on-surface-variant';
    }
  }

  botCardClass(card: BotCard): string {
    return card.blocked
      ? 'border-red-500/20 border-l-[3px]'
      : 'border-emerald-500/20 border-l-[3px]';
  }

  factIcon(fact: string): string {
    return this.isNegativeFact(fact) ? 'close' : 'check';
  }

  factClass(fact: string): string {
    return this.isNegativeFact(fact) ? 'text-red-300' : 'text-emerald-300';
  }

  currentTabLabel(): string {
    return this.tabs.find((tab) => tab.key === this.activeTab())?.label ?? 'Report';
  }

  currentReport(): ReportCategory | null {
    switch (this.activeTab()) {
      case 'onpage':
        return this.output()?.report?.onpage ?? null;
      case 'technik':
        return this.output()?.report?.technik ?? null;
      case 'offpage':
        return this.output()?.report?.offpage ?? null;
      default:
        return null;
    }
  }

  currentStatuses(): StatusItem[] {
    switch (this.activeTab()) {
      case 'onpage':
        return this.onpageStatuses();
      case 'technik':
        return this.technikStatuses();
      case 'offpage':
        return this.offpageStatuses();
      default:
        return [];
    }
  }

  currentFindings(): string[] {
    return this.currentReport()?.findings ?? [];
  }

  currentQuickWins(): QuickWin[] {
    return this.currentReport()?.quickWins ?? [];
  }

  private dimensionIcon(key?: string): string {
    switch (key) {
      case 'brand':
        return 'branding_watermark';
      case 'citation':
        return 'format_quote';
      case 'eeat':
        return 'school';
      case 'technical':
        return 'settings';
      case 'schema':
        return 'account_tree';
      case 'content':
        return 'article';
      default:
        return 'analytics';
    }
  }

  private dimensionFacts(dimension: DimensionScore): string[] {
    if (dimension.facts?.length) {
      return dimension.facts;
    }

    if (dimension.key !== 'brand') {
      return [];
    }

    const authority = this.output()?.authority;
    const facts: string[] = [];

    if (authority?.hasWikidata) {
      facts.push(authority.wikidataId ? `Wikidata-Eintrag (${authority.wikidataId})` : 'Wikidata-Eintrag vorhanden');
    } else {
      facts.push('kein Wikidata-Eintrag');
    }

    if (authority?.hasWikipedia) {
      facts.push('Wikipedia-Artikel vorhanden');
    } else {
      facts.push('kein Wikipedia-Artikel');
    }

    if (authority?.socialPlatforms?.length) {
      facts.push(`Social Media: ${authority.socialPlatforms.join(', ')}`);
    }

    if (authority?.domainRating !== undefined) {
      facts.push(
        authority.domainRating === 0
          ? 'DR 0 - keine externe Autorität'
          : `DR ${authority.domainRating}`,
      );
    }

    if (authority?.refDomains !== undefined) {
      facts.push(
        authority.refDomains === 0
          ? '0 Referring Domains'
          : `${authority.refDomains} Referring Domains`,
      );
    }

    return facts;
  }

  private buildStatusItems(section?: ReportCategory | null): StatusItem[] {
    return (section?.status ?? []).map((text) => ({
      text,
      tone: this.inferTone(text),
    }));
  }

  private inferTone(value: string): StatusItem['tone'] {
    const lower = value.toLowerCase();
    if (
      lower.includes('gut:') ||
      lower.includes('vorhanden') ||
      lower.includes('aktiv') ||
      lower.includes('korrekt') ||
      lower.includes('solide') ||
      lower.includes('stark')
    ) {
      return 'ok';
    }

    if (
      lower.includes('kritisch') ||
      lower.includes('fehlt') ||
      lower.includes('kein ') ||
      lower.includes('keine') ||
      lower.includes('0 ') ||
      lower.includes('schwächt')
    ) {
      return 'bad';
    }

    return 'warn';
  }

  private isNegativeFact(text: string): boolean {
    return /^(kein|keine|0\s)/i.test(text.trim());
  }

  private toBotCard(bot: BotCategoryItem): BotCard {
    return {
      name: bot.name ?? 'Bot',
      provider: bot.provider ?? '–',
      statusCode: bot.statusCode ?? null,
      blocked: !!bot.blocked,
    };
  }
}
