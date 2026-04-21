import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  AiLiveTestResult,
  BotCategoryItem,
  DimensionScore,
  extractGeoWebhookResult,
  findSeoGeoReport,
  GeoBreakdownGroup,
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
const LEGACY_DIMENSION_ORDER = ['brand', 'citation', 'eeat', 'technical', 'schema', 'content'] as const;
type LegacyDimensionKey = typeof LEGACY_DIMENSION_ORDER[number];

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
  facts: DimensionFact[];
}

interface DimensionFact {
  raw: string;
  text: string;
}

interface GeoDimensionEntry {
  key: string;
  label: string;
  items: string[];
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

interface AiLiveTestCard {
  key: string;
  title: string;
  mentioned: boolean;
  rank: number | null;
  intent: string;
  excerpt: string;
  citations: string[];
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
    this.resolveDimensionCards(),
  );

  readonly aiPlatforms = computed(() => this.output()?.aiPlatforms ?? []);
  readonly geoDimensionEntries = computed<GeoDimensionEntry[]>(() =>
    Object.entries(this.output()?.report?.geo?.dimensionAnalysis ?? {})
      .map(([key, value]) => ({
        key,
        label: this.geoDimensionLabel(key),
        items: this.normalizeGeoDimensionItems(value),
      }))
      .filter((entry) => entry.items.length > 0),
  );
  readonly geoAiMode = computed(() => this.output()?.report?.geo?.aiMode ?? []);
  readonly strategicActions = computed(() => this.output()?.report?.geo?.strategicActions ?? []);
  readonly executiveSummary = computed(() => this.output()?.report?.executiveSummary ?? []);

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

    if (content.internalLinkCount !== undefined) {
      items.push({
        label: 'Interne Links',
        value: `${content.internalLinkCount}`,
        tone: content.internalLinkCount >= 20 ? 'ok' : content.internalLinkCount >= 8 ? 'warn' : 'bad',
      });
    }

    if (content.hasMultimedia !== undefined) {
      items.push({
        label: 'Multimedia',
        value: content.hasMultimedia ? 'Vorhanden' : 'Nicht erkannt',
        tone: content.hasMultimedia ? 'ok' : 'warn',
      });
    }

    if (content.multimediaList?.length) {
      items.push({
        label: 'Medien',
        value: content.multimediaList.join(', '),
        tone: 'neutral',
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

    if (authority.domainRating !== undefined && authority.domainRating !== null && authority.domainRating > 0) {
      items.push({
        label: 'Domain Rating',
        value: `${authority.domainRating}`,
        tone: 'warn',
      });
    }

    if (authority.refDomains !== undefined) {
      items.push({
        label: 'Referring Domains',
        value: `${authority.refDomains}`,
        tone: authority.refDomains > 0 ? 'warn' : 'bad',
      });
    }

    if (authority.organicKeywords !== undefined) {
      items.push({
        label: 'Organische Keywords',
        value: `${authority.organicKeywords}`,
        tone: authority.organicKeywords > 0 ? 'warn' : 'bad',
      });
    }

    if (authority.organicTraffic !== undefined) {
      items.push({
        label: 'Organischer Traffic',
        value: `${authority.organicTraffic}`,
        tone: authority.organicTraffic > 0 ? 'warn' : 'bad',
      });
    }

    const sameAsCount = authority.sameAsCount ?? authority.validatedSocialLinks ?? authority.sameAsLinks?.length;
    if (sameAsCount !== undefined) {
      items.push({
        label: 'sameAs Links',
        value: `${sameAsCount}`,
        tone: sameAsCount >= 5 ? 'ok' : 'warn',
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
  readonly freshnessDetails = computed<MetricListItem[]>(() => {
    const freshness = this.output()?.freshness;
    if (!freshness) {
      return [];
    }

    const items: MetricListItem[] = [];

    if (freshness.score !== undefined) {
      items.push({
        label: 'Freshness Score',
        value: `${freshness.score}/100`,
        tone: freshness.score >= 80 ? 'ok' : freshness.score >= 60 ? 'warn' : 'bad',
      });
    }

    if (freshness.days !== undefined) {
      items.push({
        label: 'Letztes Update',
        value: `${freshness.days} Tage`,
        tone: freshness.days <= 45 ? 'ok' : freshness.days <= 180 ? 'warn' : 'bad',
      });
    }

    if (freshness.dateModified) {
      items.push({
        label: 'dateModified',
        value: freshness.dateModified,
        tone: 'neutral',
      });
    }

    if (freshness.datePublished) {
      items.push({
        label: 'datePublished',
        value: freshness.datePublished,
        tone: 'neutral',
      });
    }

    if (freshness.urlInSitemap !== undefined) {
      items.push({
        label: 'In Sitemap',
        value: freshness.urlInSitemap ? 'Ja' : 'Nein',
        tone: freshness.urlInSitemap ? 'ok' : 'bad',
      });
    }

    return items;
  });
  readonly performanceDetails = computed<MetricListItem[]>(() => {
    const performance = this.output()?.performance;
    if (!performance) {
      return [];
    }

    const items: MetricListItem[] = [];

    if (performance.score !== null && performance.score !== undefined) {
      items.push({
        label: 'Performance Score',
        value: `${performance.score}/100`,
        tone: performance.score >= 90 ? 'ok' : performance.score >= 70 ? 'warn' : 'bad',
      });
    }

    if (performance.cwvCategory) {
      items.push({
        label: 'CWV Kategorie',
        value: performance.cwvCategory,
        tone: performance.passesCore ? 'ok' : 'warn',
      });
    } else if (performance.passesCore !== undefined) {
      items.push({
        label: 'Core Web Vitals',
        value: performance.passesCore ? 'Bestanden' : 'Nicht bestanden',
        tone: performance.passesCore ? 'ok' : 'bad',
      });
    }

    if (performance.lcp !== null && performance.lcp !== undefined) {
      items.push({
        label: 'LCP',
        value: `${performance.lcp}`,
        tone: performance.lcp <= 2500 ? 'ok' : performance.lcp <= 4000 ? 'warn' : 'bad',
      });
    }

    if (performance.cls !== null && performance.cls !== undefined) {
      items.push({
        label: 'CLS',
        value: `${performance.cls}`,
        tone: performance.cls <= 0.1 ? 'ok' : performance.cls <= 0.25 ? 'warn' : 'bad',
      });
    }

    if (performance.tbt !== null && performance.tbt !== undefined) {
      items.push({
        label: 'TBT',
        value: `${performance.tbt}`,
        tone: performance.tbt <= 200 ? 'ok' : performance.tbt <= 600 ? 'warn' : 'bad',
      });
    }

    if (performance.fcp !== null && performance.fcp !== undefined) {
      items.push({
        label: 'FCP',
        value: `${performance.fcp}`,
        tone: performance.fcp <= 1800 ? 'ok' : performance.fcp <= 3000 ? 'warn' : 'bad',
      });
    }

    if (performance.ttfb !== null && performance.ttfb !== undefined) {
      items.push({
        label: 'TTFB',
        value: `${performance.ttfb}`,
        tone: performance.ttfb <= 800 ? 'ok' : performance.ttfb <= 1800 ? 'warn' : 'bad',
      });
    }

    return items;
  });
  readonly performanceIssues = computed(() => this.output()?.performance?.issues ?? []);
  readonly hasPerformanceData = computed(() => {
    const performance = this.output()?.performance;
    if (!performance) {
      return false;
    }

    return (
      this.performanceDetails().length > 0 ||
      this.performanceIssues().length > 0 ||
      (!!performance.label && performance.label.trim().length > 0)
    );
  });
  readonly fileCheckDetails = computed<MetricListItem[]>(() => {
    const fileChecks = this.output()?.fileChecks;
    const technical = this.output()?.technical;
    const items: MetricListItem[] = [];

    if (technical?.hasLlmsTxt !== undefined) {
      items.push({
        label: 'llms.txt',
        value: technical.hasLlmsTxt ? 'Vorhanden' : 'Fehlt',
        tone: technical.hasLlmsTxt ? 'ok' : 'bad',
      });
    }

    if (technical?.hasLlmsFullTxt !== undefined || fileChecks?.llmsFullTxt?.exists !== undefined) {
      const exists = fileChecks?.llmsFullTxt?.exists ?? technical?.hasLlmsFullTxt ?? false;
      items.push({
        label: 'llms-full.txt',
        value: exists
          ? `${fileChecks?.llmsFullTxt?.wordCount ?? 0} Wörter`
          : 'Fehlt',
        tone: exists ? 'ok' : 'warn',
      });
    }

    if (technical?.hasSecurityTxt !== undefined || fileChecks?.securityTxt?.exists !== undefined) {
      const exists = fileChecks?.securityTxt?.exists ?? technical?.hasSecurityTxt ?? false;
      items.push({
        label: 'security.txt',
        value: exists
          ? [
              fileChecks?.securityTxt?.hasContact ? 'Contact' : null,
              fileChecks?.securityTxt?.hasExpiry ? 'Expiry' : null,
            ].filter(Boolean).join(' · ') || 'Vorhanden'
          : 'Fehlt',
        tone: exists ? 'ok' : 'warn',
      });
    }

    if (technical?.hasAiPlugin !== undefined || fileChecks?.aiPlugin?.exists !== undefined) {
      const exists = fileChecks?.aiPlugin?.exists ?? technical?.hasAiPlugin ?? false;
      items.push({
        label: 'ai-plugin.json',
        value: exists
          ? (fileChecks?.aiPlugin?.hasSchema ? 'Schema erkannt' : 'Vorhanden')
          : 'Fehlt',
        tone: exists ? 'ok' : 'warn',
      });
    }

    if (technical?.hasSitemapFile !== undefined) {
      items.push({
        label: 'sitemap.xml',
        value: technical.hasSitemapFile ? 'Vorhanden' : 'Fehlt',
        tone: technical.hasSitemapFile ? 'ok' : 'bad',
      });
    }

    if (technical?.urlInSitemap !== undefined) {
      items.push({
        label: 'URL in Sitemap',
        value: technical.urlInSitemap ? 'Ja' : 'Nein',
        tone: technical.urlInSitemap ? 'ok' : 'bad',
      });
    }

    return items;
  });
  readonly aiLiveSummaryItems = computed<MetricListItem[]>(() => {
    const summary = this.output()?.aiLiveTests?.summary;
    if (!summary) {
      return [];
    }

    const items: MetricListItem[] = [];

    if (summary.totalTests !== undefined) {
      items.push({
        label: 'Tests',
        value: `${summary.totalTests}`,
        tone: 'neutral',
      });
    }

    if (summary.mentionedIn !== undefined && summary.totalTests !== undefined) {
      items.push({
        label: 'Erwähnungen',
        value: `${summary.mentionedIn}/${summary.totalTests}`,
        tone: summary.mentionedIn >= Math.ceil(summary.totalTests / 2) ? 'ok' : 'warn',
      });
    }

    if (summary.visibilityScore !== undefined) {
      items.push({
        label: 'Visibility Score',
        value: `${summary.visibilityScore}/100`,
        tone: summary.visibilityScore >= 70 ? 'ok' : summary.visibilityScore >= 40 ? 'warn' : 'bad',
      });
    }

    if (summary.visibilityLabel) {
      items.push({
        label: 'Bewertung',
        value: summary.visibilityLabel,
        tone: 'neutral',
      });
    }

    return items;
  });
  readonly aiLiveTestCards = computed<AiLiveTestCard[]>(() => {
    const tests = this.output()?.aiLiveTests;
    if (!tests) {
      return [];
    }

    return [
      this.toAiLiveTestCard('perplexity-info', 'Perplexity Informational', tests.perplexityInformational),
      this.toAiLiveTestCard('perplexity-commercial', 'Perplexity Commercial', tests.perplexityCommercial),
      this.toAiLiveTestCard('perplexity-comparison', 'Perplexity Comparison', tests.perplexityComparison),
      this.toAiLiveTestCard('chatgpt', 'ChatGPT', tests.chatGPT),
      this.toAiLiveTestCard('gemini', 'Gemini', tests.gemini),
    ].filter((card): card is AiLiveTestCard => !!card);
  });
  readonly hasAiLiveTestData = computed(() => {
    const summary = this.output()?.aiLiveTests?.summary;
    if (this.aiLiveTestCards().length > 0) {
      return true;
    }

    if (!summary) {
      return false;
    }

    return (
      (summary.totalTests ?? 0) > 0 ||
      (summary.mentionedIn ?? 0) > 0 ||
      (summary.visibilityScore ?? 0) > 0
    );
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
        key: 'faqpage-note',
        title: 'FAQPage Hinweis',
        description: 'Webhook-Hinweis, wenn noch keine ausreichenden FAQ-Fragen erkannt wurden.',
        content: artifacts.faqPageSchemaNote ?? '',
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
        key: 'article-schema',
        title: 'Article Schema',
        description: 'Artikel-Markup für Titel, Autor, Publisher und Datumsfelder.',
        content: artifacts.articleSchema ?? '',
      },
      {
        key: 'llms-txt',
        title: 'llms.txt',
        description: 'Vorschlag für die KI-lesbare Übersichtsdatei der Website.',
        content: artifacts.llmsTxt ?? '',
      },
      {
        key: 'sitemap-entry',
        title: 'Sitemap Entry',
        description: 'Empfohlener Eintrag für die sitemap.xml.',
        content: artifacts.sitemapEntry ?? '',
      },
    ].filter((artifact) => artifact.content.trim().length > 0);
  });

  readonly onpageStatuses = computed(() => this.buildStatusItems(this.output()?.report?.onpage));
  readonly technikStatuses = computed(() => this.buildStatusItems(this.output()?.report?.technik));
  readonly offpageStatuses = computed(() => this.buildStatusItems(this.output()?.report?.offpage));
  readonly freshnessStatuses = computed(() => this.buildStatusItems(this.output()?.report?.freshness));

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
      case 'brandRetrieval':
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
      case 'pageGeoReadiness':
        return 'article';
      case 'freshness':
        return 'schedule';
      default:
        return 'analytics';
    }
  }

  private dimensionByKey(key: string): DimensionScore | null {
    return this.output()?.dimensions?.find((dimension) => dimension.key === key) ?? null;
  }

  private resolveDimensionCards(): DimensionCard[] {
    const dimensions = this.output()?.dimensions ?? [];
    const hasLegacyDimensions = dimensions.some((dimension) =>
      LEGACY_DIMENSION_ORDER.includes((dimension.key ?? '') as LegacyDimensionKey),
    );

    if (hasLegacyDimensions) {
      return LEGACY_DIMENSION_ORDER
        .map((key) => dimensions.find((dimension) => dimension.key === key))
        .filter((dimension): dimension is DimensionScore => !!dimension)
        .map((dimension) => this.toDimensionCard(dimension));
    }

    const synthesized = this.buildLegacyCompatibilityCards();
    if (synthesized.length > 0) {
      return synthesized;
    }

    return dimensions
      .filter((dimension) => dimension.key !== 'freshness')
      .map((dimension) => this.toDimensionCard(dimension));
  }

  private buildLegacyCompatibilityCards(): DimensionCard[] {
    const cards: Array<DimensionCard | null> = [
      this.buildSyntheticLegacyCard('brand'),
      this.buildSyntheticLegacyCard('citation'),
      this.buildSyntheticLegacyCard('eeat'),
      this.buildSyntheticLegacyCard('technical'),
      this.buildSyntheticLegacyCard('schema'),
      this.buildSyntheticLegacyCard('content'),
    ];

    return cards.filter((card): card is DimensionCard => !!card);
  }

  private buildSyntheticLegacyCard(key: LegacyDimensionKey): DimensionCard | null {
    switch (key) {
      case 'brand': {
        const dimension = this.dimensionByKey('brandRetrieval');
        if (!dimension) {
          return null;
        }

        return {
          key,
          label: 'Marken-Erkennung',
          score: dimension.score ?? null,
          indicator: this.scoreIndicator(dimension.score),
          statusLabel: this.scoreStatus(dimension.score),
          icon: this.dimensionIcon(key),
          facts: this.dimensionFacts(dimension),
        };
      }
      case 'citation':
        return this.buildSyntheticBreakdownCard(
          key,
          'Zitierfähigkeit',
          'pageGeoReadiness',
          'answerabilitySignals',
        );
      case 'eeat':
        return this.buildSyntheticBreakdownCard(
          key,
          'Expertise & E-E-A-T',
          'brandRetrieval',
          'authoritySignals',
        );
      case 'technical':
        return this.buildSyntheticBreakdownCard(
          key,
          'Technische Basis',
          'pageGeoReadiness',
          'technicalAccessSignals',
        );
      case 'schema':
        return this.buildSyntheticBreakdownCard(
          key,
          'Strukturierte Daten',
          'pageGeoReadiness',
          'structuredClaritySignals',
        );
      case 'content':
        return this.buildSyntheticBreakdownCard(
          key,
          'Content-Struktur',
          'pageGeoReadiness',
          'contentPackagingSignals',
        );
      default:
        return null;
    }
  }

  private buildSyntheticBreakdownCard(
    legacyKey: LegacyDimensionKey,
    label: string,
    dimensionKey: string,
    breakdownKey: string,
  ): DimensionCard | null {
    const dimension = this.dimensionByKey(dimensionKey);
    const group = dimension?.breakdown?.[breakdownKey];

    if (!group && !dimension) {
      return null;
    }

    const score = this.normalizedBreakdownScore(group, dimension?.score ?? null);
    const facts = this.breakdownFacts(group);

    return {
      key: legacyKey,
      label,
      score,
      indicator: this.scoreIndicator(score),
      statusLabel: this.scoreStatus(score),
      icon: this.dimensionIcon(legacyKey),
      facts,
    };
  }

  private geoDimensionLabel(key: string): string {
    return this.dimensionByKey(key)?.label ?? this.humanizeKey(key);
  }

  private normalizeGeoDimensionItems(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    if (!value || typeof value !== 'object') {
      return [];
    }

    const entry = value as Record<string, unknown>;
    const score = typeof entry['score'] === 'string' || typeof entry['score'] === 'number'
      ? `Score: ${entry['score']}`
      : null;
    const status = typeof entry['status'] === 'string'
      ? `Status: ${entry['status']}`
      : null;
    const summary = typeof entry['summary'] === 'string'
      ? entry['summary']
      : null;
    const reasonSource = typeof entry['begruendung'] === 'string'
      ? entry['begruendung']
      : typeof entry['explanation'] === 'string'
        ? entry['explanation']
        : null;
    const reason = reasonSource && reasonSource !== summary ? reasonSource : null;

    return [score, status, summary, reason]
      .filter((item): item is string => !!item)
      .map((item) => item.trim())
      .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index);
  }

  private humanizeKey(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (letter) => letter.toUpperCase());
  }

  private toAiLiveTestCard(
    key: string,
    title: string,
    test?: AiLiveTestResult,
  ): AiLiveTestCard | null {
    if (!test) {
      return null;
    }

    const hasMeaningfulContent = !!(
      test.mentioned ||
      test.rank !== null && test.rank !== undefined ||
      (test.text && test.text.trim().length > 0) ||
      (test.citations?.length ?? 0) > 0
    );

    if (!hasMeaningfulContent) {
      return null;
    }

    return {
      key,
      title,
      mentioned: !!test.mentioned,
      rank: test.rank ?? null,
      intent: test.intent ?? '–',
      excerpt: this.truncateText(test.text ?? '', 320),
      citations: test.citations ?? [],
    };
  }

  private truncateText(value: string, maxLength: number): string {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return '';
    }

    if (normalized.length <= maxLength) {
      return normalized;
    }

    return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
  }

  private dimensionFacts(dimension: DimensionScore): DimensionFact[] {
    const webhookFacts = [...(dimension.present ?? []), ...(dimension.missing ?? [])]
      .map((fact) => fact.trim())
      .filter((fact) => fact.length > 0);

    if (webhookFacts.length) {
      return webhookFacts.map((fact) => this.toDimensionFact(fact));
    }

    if (dimension.facts?.length) {
      return dimension.facts
        .map((fact) => fact.trim())
        .filter((fact) => fact.length > 0)
        .map((fact) => this.toDimensionFact(fact));
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

    if (authority?.domainRating !== undefined && authority.domainRating !== null && authority.domainRating > 0) {
      facts.push(`DR ${authority.domainRating}`);
    }

    if (authority?.refDomains !== undefined) {
      facts.push(
        authority.refDomains === 0
          ? '0 Referring Domains'
          : `${authority.refDomains} Referring Domains`,
      );
    }

    return facts.map((fact) => this.toDimensionFact(fact));
  }

  private toDimensionFact(raw: string): DimensionFact {
    return {
      raw,
      text: raw.replace(/^(✅|❌|ⓘ|✓|✗|✕|!|⚠️|⚠)\s*/u, '').trim(),
    };
  }

  private toDimensionCard(dimension: DimensionScore): DimensionCard {
    return {
      key: dimension.key ?? 'dimension',
      label: dimension.label ?? 'Dimension',
      score: dimension.score ?? null,
      indicator: dimension.indicator ?? this.scoreIndicator(dimension.score),
      statusLabel: dimension.status ?? dimension.label_text ?? this.scoreStatus(dimension.score),
      icon: this.dimensionIcon(dimension.key),
      facts: this.dimensionFacts(dimension),
    };
  }

  private breakdownFacts(group?: GeoBreakdownGroup): DimensionFact[] {
    if (!group) {
      return [];
    }

    const presentFacts = (group.present ?? [])
      .map((fact) => fact.trim())
      .filter((fact) => fact.length > 0)
      .map((fact) => this.toDimensionFact(this.ensureFactPrefix(fact, 'present')));

    const missingFacts = (group.missing ?? [])
      .map((fact) => fact.trim())
      .filter((fact) => fact.length > 0)
      .map((fact) => this.toDimensionFact(this.ensureFactPrefix(fact, 'missing')));

    return [...presentFacts, ...missingFacts];
  }

  private ensureFactPrefix(fact: string, source?: 'present' | 'missing'): string {
    const trimmed = fact.trim();
    if (/^(✅|❌|ⓘ|✓|✗|✕|!|⚠️|⚠)\s*/u.test(trimmed)) {
      return trimmed;
    }

    if (source === 'present') {
      return `✅ ${trimmed}`;
    }

    if (source === 'missing') {
      return `❌ ${trimmed}`;
    }

    if (/(fehlt|fehlend|nicht|schwach|zu kurz|zu wenig|inkonsistent|blockiert|kein|keine)/i.test(trimmed)) {
      return `❌ ${trimmed}`;
    }

    return `✅ ${trimmed}`;
  }

  private normalizedBreakdownScore(group?: GeoBreakdownGroup, fallback?: number | null): number | null {
    if (group?.score !== undefined && group?.score !== null && group?.max) {
      const value = Math.round((group.score / group.max) * 100);
      return Number.isFinite(value) ? value : fallback ?? null;
    }

    if (group?.score !== undefined && group?.score !== null) {
      return group.score;
    }

    return fallback ?? null;
  }

  private scoreIndicator(score?: number | null): string {
    if (score === null || score === undefined) {
      return '';
    }

    if (score >= 65) {
      return '✓';
    }

    if (score >= 50) {
      return 'ⓘ';
    }

    return '✗';
  }

  private scoreStatus(score?: number | null): string {
    if (score === null || score === undefined) {
      return '–';
    }

    if (score >= 85) {
      return 'Sehr gut';
    }

    if (score >= 65) {
      return 'Gut';
    }

    if (score >= 50) {
      return 'Durchschnitt';
    }

    if (score >= 35) {
      return 'Ausbaufähig';
    }

    return 'Kritisch';
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
    return /^(❌|✗|✕|kein|keine|0\s)/i.test(text.trim());
  }

  private isWarningFact(text: string): boolean {
    return /^(ⓘ|!|⚠️|⚠)|–\s*(zu kurz|zu wenig|niedrig|gering|mäßig)|ausbaufähig/i.test(text.trim());
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
