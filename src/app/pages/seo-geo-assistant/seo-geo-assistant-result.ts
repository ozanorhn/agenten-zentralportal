import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  BotCategoryItem,
  DimensionScore,
  extractGeoWebhookResult,
  findSeoGeoReport,
  GeoAnalysisJobState,
  GeoAnalysisJobStatusResponse,
  GeoWebhookResult,
  QuickWin,
  ReportCategory,
  saveSeoGeoReport,
  StoredSeoGeoReport,
} from './seo-geo-assistant.models';

type SeoGeoTabKey = 'onpage' | 'technik' | 'offpage' | 'geo';
type StatusRequestErrorCode = 'network' | 'api';

const STATUS_POLL_INTERVAL_MS = 2_000;

interface ScoreBox {
  label: string;
  value: number | null;
  max: number;
  tone: 'metric' | 'neutral';
  hint?: string;
  signed?: boolean;
  unit?: string;
  showMax?: boolean;
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
  indicator: string;
  statusLabel: string;
  icon: string;
  facts: string[];
}

interface MetricListItem {
  label: string;
  value: string;
  tone: 'ok' | 'warn' | 'bad' | 'neutral';
}

interface ArtifactCard {
  key: string;
  title: string;
  description: string;
  content: string;
}

class StatusRequestError extends Error {
  constructor(
    public readonly code: StatusRequestErrorCode,
    public readonly status?: number,
    public readonly responseBody?: string,
  ) {
    super(code);
  }
}

@Component({
  selector: 'app-seo-geo-assistant-result',
  standalone: true,
  templateUrl: './seo-geo-assistant-result.html',
})
export class SeoGeoAssistantResultComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private pollTimeoutId: number | null = null;

  readonly agentId = (this.route.snapshot.data['agentId'] as string | undefined) ?? 'seo-geo-analyse-assistent';
  readonly agentMeta = AGENTS_MAP[this.agentId];
  readonly reportId = this.route.snapshot.queryParamMap.get('reportId');
  readonly jobId = this.route.snapshot.queryParamMap.get('jobId');
  readonly activeTab = signal<SeoGeoTabKey>('onpage');
  readonly tabs: TabDefinition[] = [
    { key: 'onpage', label: 'Content & Onpage' },
    { key: 'technik', label: 'Technische Basis' },
    { key: 'offpage', label: 'Autorität & Offpage' },
    { key: 'geo', label: 'AI' },
  ];

  private readonly _record = signal<StoredSeoGeoReport | null>(findSeoGeoReport(this.reportId));
  private readonly _jobStatus = signal<GeoAnalysisJobStatusResponse | null>(null);

  readonly record = this._record.asReadonly();
  readonly jobStatus = this._jobStatus.asReadonly();
  readonly output = computed<GeoWebhookResult | null>(() => this._record()?.payload ?? null);
  readonly isPolling = signal(false);
  readonly statusErrorMessage = signal('');
  readonly pendingState = computed<boolean>(() =>
    !this.output() && !!this.jobId && !this.statusErrorMessage(),
  );
  readonly currentJobProgress = computed<number>(() => this.jobStatus()?.progress ?? 5);
  readonly currentJobStep = computed<string>(() => this.jobStatus()?.step ?? 'Analyse gestartet');
  readonly currentJobUrl = computed<string>(() => {
    const url = this.jobStatus()?.input?.url;
    return url ? url.replace(/^https?:\/\//, '') : 'SEO/GEO Analyse';
  });
  readonly currentJobStatusLabel = computed<string>(() =>
    this.toStatusLabel(this.jobStatus()?.status),
  );
  readonly executiveSummary = computed(() => this.output()?.report?.executiveSummary ?? []);
  readonly radarChartUrl = computed(() => this.output()?.visuals?.radarChart ?? null);

  readonly scoreBoxes = computed<ScoreBox[]>(() => {
    const out = this.output();
    return [
      {
        label: 'GEO Score',
        value: out?.score?.total ?? null,
        max: 100,
        tone: 'metric',
        hint: out?.score?.label ?? undefined,
        showMax: true,
      },
      {
        label: 'Branchen-Median',
        value: out?.score?.median ?? null,
        max: 100,
        tone: 'neutral',
        showMax: true,
      },
      {
        label: 'Vorsprung',
        value: out?.score?.diffToMedian ?? null,
        max: 100,
        tone: 'metric',
        hint: 'gegenüber Median',
        signed: true,
        unit: 'P',
        showMax: false,
      },
      {
        label: 'Potenzial',
        value: out?.score?.improvementPotential ?? null,
        max: 100,
        tone: 'neutral',
        hint: 'bis 100 Punkte',
        unit: 'P',
        showMax: false,
      },
    ];
  });

  readonly dimensionCards = computed<DimensionCard[]>(() =>
    (this.output()?.dimensions ?? []).map((dimension) => ({
      key: dimension.key ?? 'dimension',
      label: dimension.label ?? 'Dimension',
      score: dimension.score ?? null,
      indicator: dimension.indicator ?? '',
      statusLabel: dimension.status ?? dimension.label_text ?? '–',
      icon: this.dimensionIcon(dimension.key),
      facts: this.dimensionFacts(dimension),
    })),
  );

  readonly aiPlatforms = computed(() => this.output()?.aiPlatforms ?? []);
  readonly geoDimensionEntries = computed(() =>
    Object.entries(this.output()?.report?.geo?.dimensionAnalysis ?? {}),
  );
  readonly geoAiMode = computed(() => this.output()?.report?.geo?.aiMode ?? []);
  readonly strategicActions = computed(() => this.output()?.report?.geo?.strategicActions ?? []);

  readonly techniqueBotCards = computed<BotCard[]>(() =>
    (this.output()?.botAccessibilityCheck?.categories?.['AI Search']?.bots ?? [])
      .concat(this.output()?.botAccessibilityCheck?.categories?.['AI Training']?.bots ?? [])
      .concat(this.output()?.botAccessibilityCheck?.categories?.['AI Assistant']?.bots ?? [])
      .map((bot) => this.toBotCard(bot)),
  );

  readonly blockedBots = computed(() => this.output()?.botAccessibilityCheck?.assessment?.blockedBots ?? []);
  readonly criticalBlockingBots = computed(() =>
    Array.from(
      new Set([
        ...(this.output()?.botAccessibilityCheck?.criticalBlocking ?? []),
        ...(this.output()?.botAccessibilityCheck?.assessment?.blockedBots ?? []),
      ]),
    ),
  );
  readonly botSummaryItems = computed<MetricListItem[]>(() => {
    const summary = this.output()?.botAccessibilityCheck?.summary;
    const overall = this.output()?.botAccessibilityCheck?.assessment?.overallAccessibility;
    const items: MetricListItem[] = [];

    if (summary?.allBots?.total !== undefined && summary?.allBots?.accessible !== undefined) {
      const blocked = summary.allBots.blocked ?? 0;
      items.push({
        label: 'Alle Bots',
        value: `${summary.allBots.accessible}/${summary.allBots.total} erreichbar`,
        tone: blocked === 0 ? 'ok' : blocked >= 3 ? 'bad' : 'warn',
      });
    }

    if (summary?.oapBots?.total !== undefined && summary?.oapBots?.accessible !== undefined) {
      const blocked = summary.oapBots.blocked ?? 0;
      items.push({
        label: 'OAP Bots',
        value: `${summary.oapBots.accessible}/${summary.oapBots.total} erreichbar`,
        tone: blocked === 0 ? 'ok' : blocked >= 2 ? 'bad' : 'warn',
      });
    }

    if (summary?.urlVariants?.total !== undefined && summary?.urlVariants?.accessible !== undefined) {
      items.push({
        label: 'URL Varianten',
        value: `${summary.urlVariants.accessible}/${summary.urlVariants.total} erreichbar`,
        tone: summary.urlVariants.accessible === summary.urlVariants.total ? 'ok' : 'warn',
      });
    }

    if (overall !== undefined) {
      items.push({
        label: 'Gesamtzugänglichkeit',
        value: `${overall}/100`,
        tone: overall >= 80 ? 'ok' : overall >= 60 ? 'warn' : 'bad',
      });
    }

    return items;
  });
  readonly botAssessmentFacts = computed<string[]>(() => {
    const assessment = this.output()?.botAccessibilityCheck?.assessment;
    return [
      assessment?.aiSearchBots,
      assessment?.aiTrainingBots,
      assessment?.aiAssistantBots,
      assessment?.oapScore,
    ].filter((item): item is string => !!item);
  });
  readonly technicalDetails = computed<MetricListItem[]>(() => {
    const technical = this.output()?.technical;
    if (!technical) {
      return [];
    }

    return [
      {
        label: 'HTTPS',
        value: technical.https ? 'Aktiv' : 'Nicht erkannt',
        tone: technical.https ? 'ok' : 'bad',
      },
      {
        label: 'KI-Crawler',
        value: technical.aiBotsAllowed ? 'Erlaubt' : 'Blockiert',
        tone: technical.aiBotsAllowed ? 'ok' : 'bad',
      },
      {
        label: 'llms.txt',
        value: technical.hasLlmsTxt ? 'Vorhanden' : 'Fehlt',
        tone: technical.hasLlmsTxt ? 'ok' : 'bad',
      },
      {
        label: 'SSR',
        value: technical.isSSR ? 'Aktiv' : 'Nicht erkannt',
        tone: technical.isSSR ? 'ok' : 'warn',
      },
      {
        label: 'Canonical',
        value: technical.hasCanonical ? 'Vorhanden' : 'Fehlt',
        tone: technical.hasCanonical ? 'ok' : 'bad',
      },
    ];
  });
  readonly contentDetails = computed<MetricListItem[]>(() => {
    const content = this.output()?.content;
    if (!content) {
      return [];
    }

    const items: MetricListItem[] = [];

    if (content.wordCount !== undefined) {
      items.push({
        label: 'Wortzahl',
        value: `${content.wordCount}`,
        tone: content.wordCount >= 1200 ? 'ok' : content.wordCount >= 600 ? 'warn' : 'bad',
      });
    }

    if (content.avgParagraphWords !== undefined) {
      items.push({
        label: 'Ø Wörter pro Absatz',
        value: `${content.avgParagraphWords}`,
        tone: content.avgParagraphWords >= 45 ? 'ok' : content.avgParagraphWords >= 25 ? 'warn' : 'bad',
      });
    }

    if (content.h2QuestionCount !== undefined) {
      items.push({
        label: 'H2 als Fragen',
        value: `${content.h2QuestionCount}`,
        tone: content.h2QuestionCount >= 3 ? 'ok' : content.h2QuestionCount >= 1 ? 'warn' : 'bad',
      });
    }

    if (content.hasVisibleAuthor !== undefined) {
      items.push({
        label: 'Autor sichtbar',
        value: content.hasVisibleAuthor ? 'Ja' : 'Nein',
        tone: content.hasVisibleAuthor ? 'ok' : 'bad',
      });
    }

    if (content.semanticDensity !== undefined) {
      items.push({
        label: 'Semantische Dichte',
        value: `${content.semanticDensity}`,
        tone: content.semanticDensity > 0 ? 'ok' : 'warn',
      });
    }

    return items;
  });
  readonly authorityDetails = computed<MetricListItem[]>(() => {
    const authority = this.output()?.authority;
    if (!authority) {
      return [];
    }

    const items: MetricListItem[] = [
      {
        label: 'Wikidata',
        value: authority.hasWikidata
          ? (authority.wikidataId ? `Ja (${authority.wikidataId})` : 'Ja')
          : 'Nein',
        tone: authority.hasWikidata ? 'ok' : 'bad',
      },
      {
        label: 'Wikipedia',
        value: authority.hasWikipedia ? 'Vorhanden' : 'Fehlt',
        tone: authority.hasWikipedia ? 'ok' : 'warn',
      },
    ];

    if (authority.domainRating !== undefined) {
      items.push({
        label: 'Domain Rating',
        value: `${authority.domainRating}`,
        tone: authority.domainRating > 0 ? 'warn' : 'bad',
      });
    }

    if (authority.refDomains !== undefined) {
      items.push({
        label: 'Referring Domains',
        value: `${authority.refDomains}`,
        tone: authority.refDomains > 0 ? 'warn' : 'bad',
      });
    }

    if (authority.validatedSocialLinks !== undefined) {
      items.push({
        label: 'Validierte Social Links',
        value: `${authority.validatedSocialLinks}`,
        tone: authority.validatedSocialLinks >= 5 ? 'ok' : 'warn',
      });
    }

    if (authority.socialPlatforms?.length) {
      items.push({
        label: 'Social Plattformen',
        value: authority.socialPlatforms.join(', '),
        tone: 'neutral',
      });
    }

    return items;
  });
  readonly schemaAnalysis = computed(() => this.output()?.report?.artifacts?.schemaAnalysis ?? null);
  readonly artifactCards = computed<ArtifactCard[]>(() => {
    const artifacts = this.output()?.report?.artifacts;
    if (!artifacts) {
      return [];
    }

    return [
      {
        key: 'organization-schema',
        title: 'Organization Schema',
        description: 'Strukturierte Organisationsdaten für Marke, Beschreibung und sameAs-Profile.',
        content: artifacts.organizationSchema ?? '',
      },
      {
        key: 'faqpage-schema',
        title: 'FAQPage Schema',
        description: 'FAQ-Markup für Frage-Antwort-Blöcke auf der Seite.',
        content: artifacts.faqPageSchema ?? '',
      },
      {
        key: 'breadcrumb-schema',
        title: 'BreadcrumbList Schema',
        description: 'Breadcrumb-Markup für die Navigationshierarchie.',
        content: artifacts.breadcrumbSchema ?? '',
      },
      {
        key: 'website-schema',
        title: 'WebSite Schema',
        description: 'Website-Markup inklusive SearchAction.',
        content: artifacts.websiteSchema ?? '',
      },
      {
        key: 'llms-txt',
        title: 'llms.txt',
        description: 'Vorschlag für die KI-lesbare Übersichtsdatei der Website.',
        content: artifacts.llmsTxt ?? '',
      },
    ].filter((artifact) => artifact.content.trim().length > 0);
  });

  readonly onpageStatuses = computed(() => this.buildStatusItems(this.output()?.report?.onpage));
  readonly technikStatuses = computed(() => this.buildStatusItems(this.output()?.report?.technik));
  readonly offpageStatuses = computed(() => this.buildStatusItems(this.output()?.report?.offpage));

  constructor() {
    if (!this._record() && this.jobId) {
      void this.pollJobStatus();
    }
  }

  ngOnDestroy(): void {
    this.clearPollTimeout();
  }

  setActiveTab(tab: SeoGeoTabKey): void {
    this.activeTab.set(tab);
  }

  goBack(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  retryPolling(): void {
    if (!this.jobId) {
      return;
    }

    this.statusErrorMessage.set('');
    void this.pollJobStatus();
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

  formatScoreBoxValue(box: ScoreBox): string {
    if (box.value === null || box.value === undefined) {
      return '–';
    }

    if (box.signed && box.value > 0) {
      return `+${box.value}`;
    }

    return `${box.value}`;
  }

  scoreBoxSuffix(box: ScoreBox): string {
    if (box.showMax === false) {
      return box.unit ?? '';
    }

    return '/100';
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

  detailToneClass(tone: MetricListItem['tone']): string {
    switch (tone) {
      case 'ok':
        return 'text-emerald-300';
      case 'warn':
        return 'text-amber-300';
      case 'bad':
        return 'text-red-300';
      default:
        return 'text-on-surface';
    }
  }

  factIcon(fact: string): string {
    if (this.isNegativeFact(fact)) return 'close';
    if (this.isWarningFact(fact)) return 'priority_high';
    return 'check';
  }

  factClass(fact: string): string {
    if (this.isNegativeFact(fact)) return 'text-red-300';
    if (this.isWarningFact(fact)) return 'text-amber-400';
    return 'text-emerald-300';
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

  private isWarningFact(text: string): boolean {
    return /^[!ⓘ]|–\s*(zu kurz|zu wenig|niedrig|gering|mäßig)|ausbaufähig/i.test(text.trim());
  }

  private toBotCard(bot: BotCategoryItem): BotCard {
    return {
      name: bot.name ?? 'Bot',
      provider: bot.provider ?? '–',
      statusCode: bot.statusCode ?? null,
      blocked: !!bot.blocked,
    };
  }

  private async pollJobStatus(): Promise<void> {
    if (!this.jobId) {
      return;
    }

    this.clearPollTimeout();
    this.isPolling.set(true);

    try {
      const status = await this.fetchJobStatus(this.jobId);
      this._jobStatus.set(status);
      this.statusErrorMessage.set('');

      if (status.status === 'done') {
        const payload = extractGeoWebhookResult(status.result);
        if (!payload) {
          this.isPolling.set(false);
          this.statusErrorMessage.set('Die Analyse ist fertig, aber das Ergebnis konnte nicht gelesen werden.');
          return;
        }

        const record: StoredSeoGeoReport = {
          id: `seo-geo-${Date.now()}`,
          createdAt: Date.now(),
          payload,
        };

        saveSeoGeoReport(record);
        this._record.set(record);
        this.isPolling.set(false);

        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { reportId: record.id, jobId: this.jobId },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        return;
      }

      if (status.status === 'failed') {
        this.isPolling.set(false);
        this.statusErrorMessage.set(this.errorMessageFromStatus(status));
        return;
      }

      this.scheduleNextPoll();
    } catch (error) {
      this.isPolling.set(false);
      this.statusErrorMessage.set(this.toFriendlyStatusErrorMessage(error));
    }
  }

  private scheduleNextPoll(): void {
    this.clearPollTimeout();
    this.pollTimeoutId = window.setTimeout(() => {
      void this.pollJobStatus();
    }, STATUS_POLL_INTERVAL_MS);
  }

  private clearPollTimeout(): void {
    if (this.pollTimeoutId !== null) {
      window.clearTimeout(this.pollTimeoutId);
      this.pollTimeoutId = null;
    }
  }

  private async fetchJobStatus(jobId: string): Promise<GeoAnalysisJobStatusResponse> {
    const url = new URL(environment.geoAnalysisStatusWebhookUrl, window.location.origin);
    url.searchParams.set('jobId', jobId);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
    } catch (error) {
      if (error instanceof TypeError) {
        throw new StatusRequestError('network');
      }

      throw error;
    }

    const raw = await response.text().catch(() => '');
    if (!response.ok) {
      throw new StatusRequestError('api', response.status, raw);
    }

    const parsed = this.parseJson(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new StatusRequestError('api', response.status, raw);
    }

    return parsed as GeoAnalysisJobStatusResponse;
  }

  private parseJson(raw: string): unknown {
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  private toFriendlyStatusErrorMessage(error: unknown): string {
    if (error instanceof StatusRequestError) {
      switch (error.code) {
        case 'network':
          return 'Der Live-Status konnte gerade nicht geladen werden. Bitte Verbindung prüfen und erneut versuchen.';
        default:
          if (error.status === 404) {
            return 'Der Analyse-Job wurde im Status-Endpunkt nicht gefunden.';
          }

          return 'Der Live-Status konnte nicht geladen werden. Bitte versuche es erneut.';
      }
    }

    return 'Der Live-Status konnte nicht geladen werden. Bitte versuche es erneut.';
  }

  private errorMessageFromStatus(status: GeoAnalysisJobStatusResponse): string {
    if (typeof status.error === 'string' && status.error.trim()) {
      return status.error;
    }

    if (status.error && typeof status.error === 'object' && typeof status.error.message === 'string') {
      return status.error.message;
    }

    return 'Die Analyse ist fehlgeschlagen. Bitte starte sie erneut.';
  }

  private toStatusLabel(status?: GeoAnalysisJobState): string {
    switch (status) {
      case 'done':
        return 'Abgeschlossen';
      case 'failed':
        return 'Fehler';
      default:
        return 'Läuft';
    }
  }
}
