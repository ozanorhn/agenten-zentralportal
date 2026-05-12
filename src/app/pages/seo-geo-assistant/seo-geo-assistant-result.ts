import { AfterViewInit, Component, ElementRef, OnDestroy, computed, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { RunHistoryService } from '../../services/run-history.service';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  AiLiveTestResult,
  BotCategoryItem,
  BotCategorySummary,
  DimensionScore,
  extractGeoWebhookResult,
  findSeoGeoReport,
  GeoBreakdownGroup,
  GeoAnalysisJobState,
  GeoAnalysisJobStatusResponse,
  GeoWebhookInput,
  GeoWebhookResult,
  QuickWin,
  ReportCategory,
  sanitizeNoLlmGeoWebhookResult,
  SecondaryQuickWinsDebug,
  SecondaryQuickWinsMeta,
  SEO_GEO_REPORT_UPDATED_EVENT,
  saveSeoGeoReport,
  StoredSeoGeoReport,
} from './seo-geo-assistant.models';

type SeoGeoTabKey = 'onpage' | 'technik' | 'offpage';
type StatusRequestErrorCode = 'network' | 'api';

const STATUS_POLL_INTERVAL_MS = 2_000;
const SECONDARY_QUICK_WINS_TIMEOUT_MS = 60_000;
const SECONDARY_QUICK_WINS_PROGRESS_ADVANCE_MS = 900;
const SECONDARY_QUICK_WINS_PROGRESS_STOPS = [12, 27, 43, 61, 78, 92] as const;
const SECONDARY_QUICK_WINS_LOADING_STEPS = [
  'Prioritäten werden aus der vertieften Analyse zusammengetragen.',
  'Aufwand und Score-Impact werden gewichtet.',
  'Konkrete Maßnahmen und Titel werden aufbereitet.',
  'Beispiele und Umsetzungsschritte werden ergänzt.',
  'Sofortmaßnahmen werden für die Anzeige finalisiert.',
] as const;
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
  statusLabel: string | null;
  description: string | null;
}

interface BotAssessmentItem {
  label: string;
  value: string;
  tone: 'ok' | 'warn' | 'bad' | 'neutral';
}

interface BotCategorySection {
  key: string;
  label: string;
  description: string | null;
  summary: string | null;
  bots: BotCard[];
}

interface DimensionCard {
  key: string;
  label: string;
  score: number | null;
  indicator: string;
  statusLabel: string;
  icon: string;
  infoNote: string | null;
  facts: DimensionFact[];
}

interface DimensionFact {
  raw: string;
  text: string;
  tone: 'ok' | 'warn' | 'bad';
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

interface EnvelopeFieldItem {
  label: string;
  value: string;
}

interface SecondaryQuickWinsResponse {
  quickWins: QuickWin[];
  meta: SecondaryQuickWinsMeta | null;
  debug: Partial<SecondaryQuickWinsDebug>;
}

interface SecondaryQuickWinsRequestResolution {
  body: unknown | null;
  source: string;
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
export class SeoGeoAssistantResultComponent implements AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly runHistory = inject(RunHistoryService);
  private pollTimeoutId: number | null = null;
  private quickWinsProgressTimerId: number | null = null;
  private _animRafId: number | null = null;
  private stickyTabsRafId: number | null = null;
  private stickyTabsScrollHandler: (() => void) | null = null;
  private stickyTabsResizeHandler: (() => void) | null = null;
  private stickyTabsResizeObserver: ResizeObserver | null = null;
  private secondaryQuickWinsRequestStarted = false;
  private readonly reportUpdatedListener = ((event: Event) => {
    const updatedId = (event as CustomEvent<{ id?: string }>).detail?.id;
    const currentId = this._record()?.id ?? this.reportId;
    if (updatedId && currentId && updatedId !== currentId) {
      return;
    }

    const refreshed = findSeoGeoReport(this.reportId);
    if (refreshed) {
      this._record.set(refreshed);
      this.maybeLoadSecondaryQuickWins();
    }
  }) as EventListener;

  readonly agentId = (this.route.snapshot.data['agentId'] as string | undefined) ?? 'seo-geo-analyse-assistent';
  readonly agentMeta = AGENTS_MAP[this.agentId];
  readonly reportId = this.route.snapshot.queryParamMap.get('reportId');
  readonly jobId = this.route.snapshot.queryParamMap.get('jobId');
  readonly runId = this.route.snapshot.queryParamMap.get('runId');
  readonly activeTab = signal<SeoGeoTabKey>('onpage');
  readonly openDimensionNoteKey = signal<string | null>(null);
  readonly tabs: TabDefinition[] = [
    { key: 'onpage', label: 'Content & Onpage' },
    { key: 'technik', label: 'Technische Basis' },
    { key: 'offpage', label: 'Autorität & Offpage' },
  ];
  readonly reportHeaderRef = viewChild<ElementRef<HTMLElement>>('reportHeader');
  readonly tabsSentinelRef = viewChild<ElementRef<HTMLElement>>('tabsSentinel');
  readonly tabsSlotRef = viewChild<ElementRef<HTMLElement>>('tabsSlot');

  private readonly _record = signal<StoredSeoGeoReport | null>(findSeoGeoReport(this.reportId));
  private readonly _jobStatus = signal<GeoAnalysisJobStatusResponse | null>(null);

  readonly record = this._record.asReadonly();
  readonly jobStatus = this._jobStatus.asReadonly();
  readonly output = computed<GeoWebhookResult | null>(() => {
    const payload = this._record()?.payload ?? null;
    return this.agentId === 'seo-geo-analyse-assistent-nollm'
      ? sanitizeNoLlmGeoWebhookResult(payload)
      : payload;
  });
  readonly primaryInput = computed<GeoWebhookInput | null>(() =>
    this.extractSecondaryQuickWinsInput(this.output()) ?? null,
  );
  readonly isEnvelopeOnlyResult = computed<boolean>(() =>
    this.isEnvelopeOnlyPayload(this.output()),
  );
  readonly displayReportTitle = computed<string>(() => {
    const url = this.primaryInput()?.url;
    if (url) {
      return this.compactUrl(url);
    }

    return this.isEnvelopeOnlyResult() ? 'NoLLM Request' : 'Report';
  });
  readonly displayReportTimestamp = computed<string | number | null>(() =>
    this.output()?.analysedAt ?? this.record()?.createdAt ?? null,
  );
  readonly envelopeInputItems = computed<EnvelopeFieldItem[]>(() => {
    const input = this.primaryInput();
    return [
      { label: 'Website', value: input?.url ?? '' },
      { label: 'Marke', value: input?.brand ?? '' },
      { label: 'Branche', value: input?.industry ?? '' },
      { label: 'Standort', value: input?.location ?? '' },
    ].filter((item) => item.value.trim().length > 0);
  });
  readonly envelopeDiagnosticItems = computed<EnvelopeFieldItem[]>(() => {
    const payload = this.output();
    const headers = payload?.headers ?? {};

    return [
      { label: 'Endpunkt', value: payload?.webhookUrl ?? '' },
      { label: 'Execution Mode', value: payload?.executionMode ?? '' },
      { label: 'Origin', value: headers['origin'] ?? '' },
      { label: 'Referer', value: headers['referer'] ?? '' },
      { label: 'Host', value: headers['host'] ?? '' },
      { label: 'Forwarded Proto', value: headers['x-forwarded-proto'] ?? '' },
      { label: 'User-Agent', value: headers['user-agent'] ?? '' },
      { label: 'Content-Type', value: headers['content-type'] ?? '' },
    ].filter((item) => item.value.trim().length > 0);
  });
  readonly isSecondaryQuickWinsLoading = computed<boolean>(() => !!this.output()?.secondaryQuickWinsLoading);
  readonly secondaryQuickWinsMeta = computed<SecondaryQuickWinsMeta | null>(() =>
    this.output()?.secondaryQuickWinsMeta ?? null,
  );
  readonly secondaryQuickWinsDebug = computed<SecondaryQuickWinsDebug | null>(() =>
    this.output()?.secondaryQuickWinsDebug ?? null,
  );
  readonly secondaryQuickWinsProgress = signal(0);
  readonly secondaryQuickWinsLoadingStepIndex = signal(0);
  readonly secondaryQuickWinsLoadingLabel = computed<string>(() =>
    SECONDARY_QUICK_WINS_LOADING_STEPS[this.secondaryQuickWinsLoadingStepIndex()] ?? 'Sofortmaßnahmen werden geladen.',
  );
  readonly isPolling = signal(false);
  readonly statusErrorMessage = signal('');
  readonly geoScoreDisplayValue = signal<number>(0);
  readonly geoScoreBarWidth = signal<string>('0%');
  readonly tabsPinned = signal(false);
  readonly tabsPinnedTop = signal(0);
  readonly tabsPinnedLeft = signal(0);
  readonly tabsPinnedWidth = signal(0);
  readonly tabsPlaceholderHeight = signal(0);
  readonly pendingState = computed<boolean>(() =>
    !this.output() && !!this.jobId && !this.statusErrorMessage(),
  );
  readonly currentJobProgress = computed<number>(() => this.jobStatus()?.progress ?? 5);
  readonly currentJobStep = computed<string>(() => this.jobStatus()?.step ?? 'Analyse gestartet');
  readonly currentJobUrl = computed<string>(() => {
    const url = this.jobStatus()?.input?.url;
    return url ? this.compactUrl(url) : 'SEO- & Standort-Analyse';
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
      
      
    ];
  });

  readonly balancedScoreBoxes = computed<ScoreBox[]>(() => {
    const score = this.output()?.score;
    if (!score) {
      return [];
    }

    const items: ScoreBox[] = [];

    

    

    return items;
  });

  readonly radarChartUrl = computed<string | null>(() => this.output()?.visuals?.radarChart ?? null);

  readonly guardrailNotice = computed<string | null>(() => {
    const score = this.output()?.score;
    if (!score?.guardrailApplied) {
      return null;
    }
    return score.guardrailReason ?? 'Guardrail wurde angewendet.';
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

  readonly techniqueBotCards = computed<BotCard[]>(() => {
    const check = this.output()?.botAccessibilityCheck;
    const categoryBots = Object.values(check?.categories ?? {})
      .flatMap((category) => category.bots ?? []);
    const summaryBots = (check?.categorySummaries ?? [])
      .flatMap((category) => category.bots ?? []);
    const reportBots = (this.output()?.report?.botAccessibility?.categories ?? [])
      .flatMap((category) => category.bots ?? []);
    const fromCategories = this.uniqueBotCards([...categoryBots, ...summaryBots, ...reportBots]);

    if (fromCategories.length) {
      return fromCategories;
    }

    const blocked = new Set([
      ...(check?.assessment?.blockedBots ?? []),
      ...(check?.criticalBlocking ?? []),
    ]);

    if (!check?.summary || blocked.size === 0) {
      return [];
    }

    return Array.from(blocked).map<BotCard>((name) => ({
      name,
      provider: 'Blockiert',
      statusCode: null,
      blocked: true,
      statusLabel: 'Blockiert',
      description: null,
    }));
  });

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
  readonly botAssessmentItems = computed<BotAssessmentItem[]>(() => {
    const assessment = this.output()?.botAccessibilityCheck?.assessment;
    return [
      { label: 'AI Search', value: assessment?.aiSearchBots },
      { label: 'AI Training', value: assessment?.aiTrainingBots },
      { label: 'AI Assistant', value: assessment?.aiAssistantBots },
    ]
      .filter((item): item is { label: string; value: string } => !!item.value)
      .map((item) => ({
        ...item,
        tone: this.reachabilityTone(item.value),
      }));
  });
  readonly oapBotCategory = computed<BotCategorySection | null>(() =>
    this.botCategorySections().find((category) => category.key === 'oap-bots') ?? null,
  );
  readonly nonOapBotCategory = computed<BotCategorySection | null>(() =>
    this.botCategorySections().find((category) => category.key === 'other-bots') ?? null,
  );
  readonly blockedBotCards = computed<BotCard[]>(() =>
    this.techniqueBotCards().filter((bot) => bot.blocked),
  );
  readonly botRecommendation = computed<string | null>(() =>
    this.output()?.botAccessibilityCheck?.assessment?.recommendation
    ?? this.output()?.report?.botAccessibility?.summary?.recommendation
    ?? null,
  );
  readonly botCategorySections = computed<BotCategorySection[]>(() => {
    const check = this.output()?.botAccessibilityCheck;
    const reportCategories = this.output()?.report?.botAccessibility?.categories ?? [];
    const summaryCategories = check?.categorySummaries ?? [];
    const oapSection = this.buildOapBotCategorySection();
    const nonOapSection = this.buildNonOapBotCategorySection();

    const preferredCategories = summaryCategories.length ? summaryCategories : reportCategories;
    const mappedPreferredCategories = preferredCategories
        .map((category, index) => this.toBotCategorySection(category, index))
        .filter((category): category is BotCategorySection => !!category);

    if (mappedPreferredCategories.length || oapSection) {
      return [oapSection, nonOapSection, ...mappedPreferredCategories]
        .filter((category): category is BotCategorySection => !!category);
    }

    const fallbackCategories = Object.entries(check?.categories ?? {})
      .filter(([key]) => key.trim().toLowerCase() !== 'archive')
      .map(([key, category]) => {
        const total = category.total;
        const accessible = category.accessible;
        const blocked = category.blocked ?? 0;
        const summary = total !== undefined && accessible !== undefined
          ? `${accessible}/${total} erreichbar`
          : null;

        return {
          key,
          label: key,
          description: blocked > 0 ? `${blocked} blockiert` : null,
          summary,
          bots: this.uniqueBotCards(category.bots ?? []),
        } satisfies BotCategorySection;
      })
      .filter((category) => !!category.summary || category.bots.length > 0);

    return [oapSection, nonOapSection, ...fallbackCategories]
      .filter((category): category is BotCategorySection => !!category);
  });
  readonly technicalDetails = computed<MetricListItem[]>(() => {
    const fileChecks = this.output()?.fileChecks;
    const technical = this.output()?.technical;
    if (!technical) {
      return [];
    }

    const items: MetricListItem[] = [
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

    if (technical.hasLlmsFullTxt !== undefined || fileChecks?.llmsFullTxt?.exists !== undefined) {
      const exists = fileChecks?.llmsFullTxt?.exists ?? technical.hasLlmsFullTxt ?? false;
      items.push({
        label: 'llms-full.txt',
        value: exists ? `${fileChecks?.llmsFullTxt?.wordCount ?? 0} Wörter` : 'Fehlt',
        tone: exists ? 'ok' : 'warn',
      });
    }

    if (technical.hasSecurityTxt !== undefined || fileChecks?.securityTxt?.exists !== undefined) {
      const exists = fileChecks?.securityTxt?.exists ?? technical.hasSecurityTxt ?? false;
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

    if (technical.hasAiPlugin !== undefined || fileChecks?.aiPlugin?.exists !== undefined) {
      const exists = fileChecks?.aiPlugin?.exists ?? technical.hasAiPlugin ?? false;
      items.push({
        label: 'ai-plugin.json',
        value: exists
          ? (fileChecks?.aiPlugin?.hasSchema ? 'Schema erkannt' : 'Vorhanden')
          : 'Fehlt',
        tone: exists ? 'ok' : 'warn',
      });
    }

    if (technical.hasSitemapFile !== undefined) {
      items.push({
        label: 'sitemap.xml',
        value: technical.hasSitemapFile ? 'Vorhanden' : 'Fehlt',
        tone: technical.hasSitemapFile ? 'ok' : 'bad',
      });
    }

    if (technical.urlInSitemap !== undefined) {
      items.push({
        label: 'URL in Sitemap',
        value: technical.urlInSitemap ? 'Ja' : 'Nein',
        tone: technical.urlInSitemap ? 'ok' : 'bad',
      });
    }

    const robots = technical.robotsTxt;
    if (robots?.exists !== undefined) {
      items.push({
        label: 'robots.txt',
        value: robots.exists ? `Vorhanden (${robots.statusCode ?? '200'})` : 'Fehlt',
        tone: robots.exists ? 'ok' : 'bad',
      });
    }

    if (robots?.hasSitemapHint !== undefined) {
      items.push({
        label: 'Sitemap-Hinweis',
        value: robots.hasSitemapHint ? 'In robots.txt' : 'Fehlt',
        tone: robots.hasSitemapHint ? 'ok' : 'warn',
      });
    }

    if (robots?.blockedBots?.length) {
      items.push({
        label: 'Blockierte Bots (robots.txt)',
        value: robots.blockedBots.join(', '),
        tone: 'bad',
      });
    }

    return items;
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

    const authorVisibility = this.resolveAuthorVisibilitySignal();
    if (authorVisibility !== null) {
      items.push({
        label: 'Autor sichtbar',
        value: authorVisibility ? 'Ja' : 'Nein',
        tone: authorVisibility ? 'ok' : 'bad',
      });
    } else if (this.isNoLlmAgent()) {
      const fallbackDetail = this.resolveNoLlmAuthorFallbackDetail();
      if (fallbackDetail) {
        items.push(fallbackDetail);
      }
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

  readonly eeatSummary = computed(() => this.output()?.eeat ?? null);
  readonly eeatPresent = computed<string[]>(() => this.output()?.eeat?.present ?? []);
  readonly eeatMissing = computed<string[]>(() => this.output()?.eeat?.missing ?? []);
  readonly hasEeatData = computed(() => {
    const eeat = this.output()?.eeat;
    if (!eeat) return false;
    return (
      eeat.score !== undefined ||
      (eeat.present?.length ?? 0) > 0 ||
      (eeat.missing?.length ?? 0) > 0
    );
  });

  readonly hasBotAccessibilityData = computed(() => {
    const check = this.output()?.botAccessibilityCheck;
    const reportBotAccessibility = this.output()?.report?.botAccessibility;
    if (!check && !reportBotAccessibility) return false;
    return (
      this.botSummaryItems().length > 0 ||
      this.botAssessmentItems().length > 0 ||
      !!this.oapBotCategory() ||
      !!this.nonOapBotCategory() ||
      this.blockedBotCards().length > 0 ||
      this.criticalBlockingBots().length > 0 ||
      !!this.botRecommendation()
    );
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
        description: 'Hinweis, wenn noch keine ausreichenden FAQ-Fragen erkannt wurden.',
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
    if (typeof window !== 'undefined') {
      window.addEventListener(SEO_GEO_REPORT_UPDATED_EVENT, this.reportUpdatedListener);
    }
    this.maybeLoadSecondaryQuickWins();

    // Lädt das vollständige Ergebnis aus agent_runs.output_payload,
    // falls die Seite über den Verlauf mit ?runId=<uuid> aufgerufen wurde.
    if (!this._record() && this.runId) {
      void this.loadFromDb(this.runId);
    }

    if (!this._record() && this.jobId) {
      void this.pollJobStatus();
    }

    effect(() => {
      const total = this.output()?.score?.total;
      if (typeof total === 'number') {
        this.animateGeoScore(total);
      }
    });
  }

  ngAfterViewInit(): void {
    this.attachStickyTabs();
  }

  private async loadFromDb(runId: string): Promise<void> {
    const payload = await this.runHistory.fetchOutputPayload(runId);
    const result = extractGeoWebhookResult(payload);
    if (!result) return;

    const record: StoredSeoGeoReport = {
      id: runId,
      createdAt: Date.now(),
      payload: result,
    };
    saveSeoGeoReport(record);
    this._record.set(record);
    this.maybeLoadSecondaryQuickWins();
  }

  private animateGeoScore(target: number): void {
    if (this._animRafId !== null) {
      cancelAnimationFrame(this._animRafId);
    }
    const duration = 1500;
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(eased * target);
      this.geoScoreDisplayValue.set(current);
      this.geoScoreBarWidth.set(`${(current / 100) * 100}%`);
      if (t < 1) {
        this._animRafId = requestAnimationFrame(step);
      } else {
        this._animRafId = null;
        this.geoScoreDisplayValue.set(target);
        this.geoScoreBarWidth.set(`${target}%`);
      }
    };
    this._animRafId = requestAnimationFrame(step);
  }

  ngOnDestroy(): void {
    this.detachStickyTabs();
    this.clearPollTimeout();
    this.resetSecondaryQuickWinsProgress();
    if (typeof window !== 'undefined') {
      window.removeEventListener(SEO_GEO_REPORT_UPDATED_EVENT, this.reportUpdatedListener);
    }
    if (this._animRafId !== null) {
      cancelAnimationFrame(this._animRafId);
    }
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

  formatDate(value?: string | number | null): string {
    if (!value) {
      return '–';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return `${value}`;
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
    if ((score ?? 0) >= 60) {
      return 'text-emerald-800 dark:text-emerald-300';
    }

    if ((score ?? 0) >= 30) {
      return 'text-amber-800 dark:text-amber-300';
    }

    return 'text-red-800 dark:text-red-300';
  }

  metricBarClass(score?: number | null): string {
    if ((score ?? 0) >= 60) {
      return 'bg-[#639922]';
    }

    if ((score ?? 0) >= 30) {
      return 'bg-[#EF9F27]';
    }

    return 'bg-[#E24B4A]';
  }

  navClass(tab: SeoGeoTabKey): string {
    return this.activeTab() === tab
      ? 'bg-surface-container-lowest font-semibold text-[#0A66FF] shadow-[0_6px_18px_rgba(15,23,42,0.12)] ring-1 ring-[#0070FF]/15 dark:text-[#93c5fd]'
      : 'text-on-surface-variant hover:bg-surface-container-low/60 hover:text-on-surface';
  }

  tabsContainerClass(): string {
    return this.tabsPinned() ? 'fixed z-40' : 'relative';
  }

  statusClass(tone: StatusItem['tone']): string {
    switch (tone) {
      case 'ok':
        return 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10';
      case 'warn':
        return 'border-amber-300 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10';
      default:
        return 'border-red-300 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10';
    }
  }

  statusIconClass(tone: StatusItem['tone']): string {
    switch (tone) {
      case 'ok':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300';
      case 'warn':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300';
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300';
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
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'mittel':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300';
      case 'hoch':
        return 'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-300';
      default:
        return 'bg-surface-container-high text-on-surface-variant';
    }
  }

  botCardClass(card: BotCard): string {
    return card.blocked
      ? 'border-red-300 dark:border-red-500/20 border-l-[3px]'
      : 'border-emerald-300 dark:border-emerald-500/20 border-l-[3px]';
  }

  botCategoryChipClass(card: BotCard): string {
    return card.blocked
      ? 'border border-red-300 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
      : 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300';
  }

  detailToneClass(tone: MetricListItem['tone']): string {
    switch (tone) {
      case 'ok':
        return 'text-emerald-800 dark:text-emerald-300';
      case 'warn':
        return 'text-amber-800 dark:text-amber-300';
      case 'bad':
        return 'text-red-800 dark:text-red-300';
      default:
        return 'text-on-surface';
    }
  }

  detailToneLabel(tone: MetricListItem['tone']): string {
    switch (tone) {
      case 'ok':
        return 'Gut';
      case 'warn':
        return 'Hinweis';
      case 'bad':
        return 'Kritisch';
      default:
        return 'Info';
    }
  }

  detailToneBadgeClass(tone: MetricListItem['tone']): string {
    switch (tone) {
      case 'ok':
        return 'border border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300';
      case 'warn':
        return 'border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300';
      case 'bad':
        return 'border border-red-300 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300';
      default:
        return 'border border-outline-variant/20 bg-surface-container-high text-on-surface-variant';
    }
  }

  factIcon(tone: DimensionFact['tone']): string {
    switch (tone) {
      case 'bad':
        return 'close';
      case 'warn':
        return 'priority_high';
      default:
        return 'check';
    }
  }

  dimensionFactCardClass(tone: DimensionFact['tone']): string {
    switch (tone) {
      case 'bad':
        return 'bg-red-50 border-red-300 dark:bg-red-500/10 dark:border-red-500/20';
      case 'warn':
        return 'bg-amber-50 border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/20';
      default:
        return 'bg-emerald-50 border-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/20';
    }
  }

  dimensionFactIconBadgeClass(tone: DimensionFact['tone']): string {
    switch (tone) {
      case 'bad':
        return 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300';
      case 'warn':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300';
      default:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300';
    }
  }

  toggleDimensionNote(key: string): void {
    this.openDimensionNoteKey.set(this.openDimensionNoteKey() === key ? null : key);
  }

  isDimensionNoteOpen(key: string): boolean {
    return this.openDimensionNoteKey() === key;
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
    const secondaryQuickWins = this.output()?.secondaryQuickWins ?? [];
    if (secondaryQuickWins.length) {
      const matchedQuickWins = secondaryQuickWins.filter((quickWin) => this.matchesActiveTabCategory(quickWin.category));
      if (matchedQuickWins.length || this.hasCategorizedQuickWins(secondaryQuickWins)) {
        return matchedQuickWins;
      }
    }

    return this.currentReport()?.quickWins ?? [];
  }

  shouldShowQuickWinsCard(): boolean {
    return !!(
      this.isSecondaryQuickWinsLoading() ||
      this.secondaryQuickWinsMeta() ||
      (this.output()?.secondaryQuickWins?.length ?? 0) > 0 ||
      this.currentQuickWins().length > 0 ||
      (this.agentId === 'seo-geo-analyse-assistent-nollm' && this.secondaryQuickWinsDebug())
    );
  }

  private hasCategorizedQuickWins(quickWins: QuickWin[]): boolean {
    return quickWins.some((quickWin) => this.normalizeQuickWinCategory(quickWin.category) !== null);
  }

  private matchesActiveTabCategory(category: string | undefined): boolean {
    return this.normalizeQuickWinCategory(category) === this.activeTab();
  }

  private normalizeQuickWinCategory(category: string | undefined): SeoGeoTabKey | null {
    const normalizedCategory = category?.trim().toLowerCase();
    switch (normalizedCategory) {
      case 'onpage':
      case 'technik':
      case 'offpage':
        return normalizedCategory;
      default:
        return null;
    }
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
          infoNote: this.dimensionImportanceNote(key, 'Marken-Erkennung'),
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
        return this.buildSyntheticEeatCard();
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
      infoNote: this.dimensionImportanceNote(legacyKey, label),
      facts,
    };
  }

  private buildSyntheticEeatCard(): DimensionCard | null {
    const card = this.buildSyntheticBreakdownCard(
      'eeat',
      'Expertise & E-E-A-T',
      'brandRetrieval',
      'authoritySignals',
    );

    if (!card) {
      return null;
    }

    // In the NoLLM flow we only show the webhook-provided author signal
    // in the dedicated content details and avoid synthesizing extra EEAT facts.
    if (this.isNoLlmAgent()) {
      return card;
    }

    const hasVisibleAuthor = this.resolveAuthorVisibilitySignal();
    if (hasVisibleAuthor === null) {
      return card;
    }

    const authorFact = this.toDimensionFact(
      hasVisibleAuthor ? '✅ Autor sichtbar' : '❌ Autor nicht sichtbar',
    );

    const alreadyListed = card.facts.some((fact) => /autor sichtbar|autor nicht sichtbar/i.test(fact.text));
    if (alreadyListed) {
      return card;
    }

    return {
      ...card,
      facts: [authorFact, ...card.facts],
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
    const webhookFacts = [
      ...(dimension.present ?? [])
        .map((fact) => this.toDimensionFact(this.ensureFactPrefix(fact, 'present'), 'ok')),
      ...(dimension.exclamation ?? [])
        .map((fact) => this.toDimensionFact(this.ensureFactPrefix(fact, 'exclamation'), 'warn')),
      ...(dimension.missing ?? [])
        .map((fact) => this.toDimensionFact(this.ensureFactPrefix(fact, 'missing'), 'bad')),
    ].filter((fact) => fact.text.length > 0);

    if (webhookFacts.length) {
      return webhookFacts;
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

  private toDimensionFact(raw: string, tone?: DimensionFact['tone']): DimensionFact {
    return {
      raw,
      text: raw.replace(/^(✅|❌|ⓘ|✓|✗|✕|!|⚠️|⚠)\s*/u, '').trim(),
      tone: tone ?? this.inferFactTone(raw),
    };
  }

  private isNoLlmAgent(): boolean {
    return this.agentId === 'seo-geo-analyse-assistent-nollm';
  }

  private resolveAuthorVisibilitySignal(): boolean | null {
    const authorVisibility = this.output()?.content?.hasVisibleAuthor;

    if (this.isNoLlmAgent()) {
      return authorVisibility === true ? true : null;
    }

    return authorVisibility === undefined ? null : authorVisibility;
  }

  private resolveNoLlmAuthorFallbackDetail(): MetricListItem | null {
    const eeatSignals = this.output()?.eeat?.signals ?? {};
    const hasPersonSchema = eeatSignals['hasPersonSchema'];

    if (typeof hasPersonSchema === 'boolean') {
      return {
        label: 'Person-Schema',
        value: hasPersonSchema ? 'Vorhanden' : 'Fehlt',
        tone: hasPersonSchema ? 'ok' : 'warn',
      };
    }

    const hasFaqSchema = this.output()?.content?.hasFaqSchema;
    if (hasFaqSchema !== undefined) {
      return {
        label: 'FAQ Schema',
        value: hasFaqSchema ? 'Vorhanden' : 'Nicht erkannt',
        tone: hasFaqSchema ? 'ok' : 'warn',
      };
    }

    return null;
  }

  private toDimensionCard(dimension: DimensionScore): DimensionCard {
    return {
      key: dimension.key ?? 'dimension',
      label: dimension.label ?? 'Dimension',
      score: dimension.score ?? null,
      indicator: dimension.indicator ?? this.scoreIndicator(dimension.score),
      statusLabel: dimension.status ?? dimension.label_text ?? this.scoreStatus(dimension.score),
      icon: this.dimensionIcon(dimension.key),
      infoNote: this.dimensionImportanceNote(dimension.key, dimension.label),
      facts: this.dimensionFacts(dimension),
    };
  }

  private dimensionImportanceNote(key?: string | null, label?: string | null): string | null {
    const normalizedKey = (key ?? '').trim().toLowerCase();
    const normalizedLabel = (label ?? '').trim().toLowerCase();

    if (
      normalizedKey === 'brand' ||
      normalizedKey === 'brandretrieval' ||
      normalizedLabel === 'marken-erkennung'
    ) {
      return 'Eine klare Marken-Erkennung hilft KI-Systemen, Ihr Unternehmen eindeutig derselben Entitaet zuzuordnen - ueber Website, Erwahnungen, Profile und Quellen hinweg. Wenn Name, Marke und Signale inkonsistent oder zu schwach sind, wird Ihre Marke seltener korrekt erkannt, verwechselt oder in Antworten gar nicht erst beruecksichtigt.';
    }

    if (normalizedKey === 'schema' || normalizedLabel === 'strukturierte daten') {
      return 'Strukturierte Daten (Schema.org / JSON-LD) sind die maschinenlesbare Grundlage fuer KI-Systeme und Suchmaschinen. Sie helfen dabei, Inhalte eindeutig zuzuordnen, zum Beispiel Unternehmen, Artikel, FAQ oder Produkte. Ohne diese Markierungen muss die KI Inhalte selbst interpretieren - was oft zu Fehlinterpretationen oder fehlender Zitierung fuehrt.';
    }

    if (normalizedKey === 'citation' || normalizedLabel === 'zitierfaehigkeit') {
      return 'KI-Suchsysteme bevorzugen klar abgegrenzte, faktenreiche und modular aufgebaute Inhalte. Besonders Inhalte mit Frage-Antwort-Struktur werden haeufiger zitiert. Wenn Inhalte nicht klar formuliert oder zu verschachtelt sind, werden sie oft umgeschrieben oder gar nicht als Quelle verwendet.';
    }

    if (normalizedKey === 'eeat' || normalizedLabel === 'expertise & e-e-a-t') {
      return 'E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) ist ein Signal fuer Vertrauenswuerdigkeit. KI-Systeme bevorzugen Inhalte mit klar erkennbarem Autor, Veroeffentlichungsdatum und externen Quellen. Ohne diese Signale wirkt eine Seite weniger glaubwuerdig und wird seltener als Referenz genutzt.';
    }

    if (normalizedKey === 'technical' || normalizedLabel === 'technische basis') {
      return 'Technische Faktoren wie Ladegeschwindigkeit, Serverantwortzeit (TTFB) und Crawler-Zugaenglichkeit entscheiden darueber, ob KI-Systeme Inhalte ueberhaupt lesen koennen. Wenn Bots blockiert werden oder die Seite zu langsam ist, bleibt der Inhalt fuer KI-Suchmaschinen praktisch unsichtbar.';
    }

    if (normalizedKey === 'content' || normalizedLabel === 'content-struktur') {
      return 'Eine klare Struktur mit H1, H2, Absaetzen, Alt-Texten und Meta-Tags hilft KI-Systemen, Inhalte korrekt zu verstehen und zu segmentieren. Unstrukturierte oder zu kurze Inhalte werden schlechter verarbeitet und seltener vollstaendig in Antworten integriert.';
    }

    return null;
  }

  private breakdownFacts(group?: GeoBreakdownGroup): DimensionFact[] {
    if (!group) {
      return [];
    }

    const presentFacts = (group.present ?? [])
      .map((fact) => fact.trim())
      .filter((fact) => fact.length > 0)
      .map((fact) => this.toDimensionFact(this.ensureFactPrefix(fact, 'present'), 'ok'));

    const exclamationFacts = (group.exclamation ?? [])
      .map((fact) => fact.trim())
      .filter((fact) => fact.length > 0)
      .map((fact) => this.toDimensionFact(this.ensureFactPrefix(fact, 'exclamation'), 'warn'));

    const missingFacts = (group.missing ?? [])
      .map((fact) => fact.trim())
      .filter((fact) => fact.length > 0)
      .map((fact) => this.toDimensionFact(this.ensureFactPrefix(fact, 'missing'), 'bad'));

    return [...presentFacts, ...exclamationFacts, ...missingFacts];
  }

  private ensureFactPrefix(fact: string, source?: 'present' | 'exclamation' | 'missing'): string {
    const trimmed = fact.trim();
    if (/^(✅|❌|ⓘ|✓|✗|✕|!|⚠️|⚠)\s*/u.test(trimmed)) {
      return trimmed;
    }

    if (source === 'present') {
      return `✅ ${trimmed}`;
    }

    if (source === 'exclamation') {
      return `ⓘ ${trimmed}`;
    }

    if (source === 'missing') {
      return `❌ ${trimmed}`;
    }

    if (/(fehlt|fehlend|nicht|schwach|zu kurz|zu wenig|inkonsistent|blockiert|kein|keine)/i.test(trimmed)) {
      return `❌ ${trimmed}`;
    }

    return `✅ ${trimmed}`;
  }

  private inferFactTone(text: string): DimensionFact['tone'] {
    if (this.isNegativeFact(text)) {
      return 'bad';
    }

    if (this.isWarningFact(text)) {
      return 'warn';
    }

    return 'ok';
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
    const statusLabel = bot.statusLabel
      ?? (bot.status === 'blocked' ? 'Blockiert' : bot.status === 'ok' ? 'Erfolgreich' : null);
    return {
      name: bot.name ?? 'Bot',
      provider: bot.provider ?? '–',
      statusCode: bot.statusCode ?? null,
      blocked: !!bot.blocked || bot.accessible === false || bot.status === 'blocked',
      statusLabel,
      description: bot.description ?? null,
    };
  }

  private uniqueBotCards(bots: BotCategoryItem[]): BotCard[] {
    const seen = new Set<string>();
    const cards: BotCard[] = [];

    for (const bot of bots) {
      const card = this.toBotCard(bot);
      const key = `${card.name}::${card.provider}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      cards.push(card);
    }

    return cards;
  }

  private toBotCategorySection(category: BotCategorySummary, index: number): BotCategorySection | null {
    const label = category.category?.trim();
    const description = category.description?.trim() || null;
    const summary = category.summary?.trim() || null;
    const bots = this.uniqueBotCards(category.bots ?? []);

    if (label?.toLowerCase() === 'archive') {
      return null;
    }

    if (!label && !summary && bots.length === 0) {
      return null;
    }

    return {
      key: label ? label.toLowerCase().replace(/\s+/g, '-') : `category-${index}`,
      label: label || `Kategorie ${index + 1}`,
      description,
      summary,
      bots,
    };
  }

  private reachabilityTone(value: string): 'ok' | 'warn' | 'bad' | 'neutral' {
    const match = value.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) {
      return 'neutral';
    }

    const accessible = Number(match[1]);
    const total = Number(match[2]);
    if (!Number.isFinite(accessible) || !Number.isFinite(total) || total <= 0) {
      return 'neutral';
    }

    const ratio = accessible / total;
    if (ratio >= 1) {
      return 'ok';
    }

    if (ratio >= 0.65) {
      return 'warn';
    }

    return 'bad';
  }

  private buildOapBotCategorySection(): BotCategorySection | null {
    const check = this.output()?.botAccessibilityCheck;
    const oapBots = this.uniqueBotCards(
      this.collectDetailedBotItems()
        .filter((bot) => bot.isOAP),
    );

    if (!oapBots.length) {
      return null;
    }

    const oapSummary = check?.assessment?.oapScore
      ?? this.output()?.report?.botAccessibility?.summary?.oapText
      ?? this.formatOapSummary(check?.summary?.oapBots);

    return {
      key: 'oap-bots',
      label: 'OAP Bots',
      description: 'OpenAI, Anthropic und weitere OAP-relevante Bots aus dem Payload.',
      summary: oapSummary,
      bots: oapBots,
    };
  }

  private buildNonOapBotCategorySection(): BotCategorySection | null {
    const otherBots = this.uniqueBotCards(
      this.collectDetailedBotItems()
        .filter((bot) => !bot.isOAP),
    );

    if (!otherBots.length) {
      return null;
    }

    const accessible = otherBots.filter((bot) => !bot.blocked).length;
    const total = otherBots.length;

    return {
      key: 'other-bots',
      label: 'Weitere Bots',
      description: 'Weitere getestete Bots ausserhalb der OAP-Gruppe.',
      summary: `${accessible}/${total} erreichbar`,
      bots: otherBots,
    };
  }

  private collectDetailedBotItems(): BotCategoryItem[] {
    const check = this.output()?.botAccessibilityCheck;
    return [
      ...(check?.allBotsTested ?? []),
      ...(check?.successfulBots ?? []),
      ...(check?.blockedBotsDetailed ?? []),
      ...(check?.errorBots ?? []),
    ];
  }

  private formatOapSummary(summary?: { total?: number; accessible?: number }): string | null {
    if (summary?.total === undefined || summary?.accessible === undefined) {
      return null;
    }

    return `${summary.accessible}/${summary.total} erreichbar`;
  }

  private attachStickyTabs(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const sync = () => this.scheduleStickyTabsSync();
    this.stickyTabsScrollHandler = sync;
    this.stickyTabsResizeHandler = sync;

    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);

    this.stickyTabsResizeObserver = new ResizeObserver(() => this.scheduleStickyTabsSync());

    const header = this.reportHeaderRef()?.nativeElement;
    const slot = this.tabsSlotRef()?.nativeElement;
    if (header) {
      this.stickyTabsResizeObserver.observe(header);
    }
    if (slot) {
      this.stickyTabsResizeObserver.observe(slot);
    }

    this.scheduleStickyTabsSync();
  }

  private detachStickyTabs(): void {
    if (typeof window !== 'undefined') {
      if (this.stickyTabsScrollHandler) {
        window.removeEventListener('scroll', this.stickyTabsScrollHandler);
      }
      if (this.stickyTabsResizeHandler) {
        window.removeEventListener('resize', this.stickyTabsResizeHandler);
      }
      if (this.stickyTabsRafId !== null) {
        window.cancelAnimationFrame(this.stickyTabsRafId);
      }
    }

    this.stickyTabsResizeObserver?.disconnect();
    this.stickyTabsResizeObserver = null;
    this.stickyTabsRafId = null;
    this.stickyTabsScrollHandler = null;
    this.stickyTabsResizeHandler = null;
  }

  private scheduleStickyTabsSync(): void {
    if (typeof window === 'undefined' || this.stickyTabsRafId !== null) {
      return;
    }

    this.stickyTabsRafId = window.requestAnimationFrame(() => {
      this.stickyTabsRafId = null;
      this.syncStickyTabs();
    });
  }

  private syncStickyTabs(): void {
    const header = this.reportHeaderRef()?.nativeElement;
    const sentinel = this.tabsSentinelRef()?.nativeElement;
    const slot = this.tabsSlotRef()?.nativeElement;

    if (!header || !sentinel || !slot || !this.output() || this.isEnvelopeOnlyResult()) {
      this.tabsPinned.set(false);
      return;
    }

    const headerRect = header.getBoundingClientRect();
    const sentinelRect = sentinel.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const pinTop = Math.round(headerRect.bottom + 8);
    const shouldPin = sentinelRect.top <= pinTop;

    this.tabsPinnedTop.set(pinTop);
    this.tabsPinnedLeft.set(Math.round(slotRect.left));
    this.tabsPinnedWidth.set(Math.round(slotRect.width));
    this.tabsPlaceholderHeight.set(Math.round(slotRect.height));
    this.tabsPinned.set(shouldPin);
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
        this.runHistory.addRun({
          id: `run-${Date.now()}`,
          agentId: 'seo-geo-analyse-assistent-nollm',
          agentName: 'GEO-Audit',
          agentIcon: 'forum',
          agentCategory: 'SEO',
          timestamp: Date.now(),
          inputData: { domain: payload.input?.url ?? '' },
          outputSummary: `GEO-Audit: ${payload.input?.url ?? 'Domain'}`,
          fullOutput: { type: 'markdown', content: '' },
          tokenCount: 0,
        });
        this.isPolling.set(false);
        this.maybeLoadSecondaryQuickWins();

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

  private maybeLoadSecondaryQuickWins(): void {
    const record = this._record();
    if (!record || this.secondaryQuickWinsRequestStarted || this.agentId !== 'seo-geo-analyse-assistent-nollm') {
      return;
    }

    if (this.isEnvelopeOnlyPayload(record.payload)) {
      return;
    }

    if (record.payload.secondaryQuickWins?.length) {
      return;
    }

    const request = this.resolveSecondaryQuickWinsRequest(record);
    if (request.body === null || request.body === undefined) {
      return;
    }

    this.secondaryQuickWinsRequestStarted = true;
    const loadingRecord: StoredSeoGeoReport = {
      ...record,
      payload: {
        ...record.payload,
        secondaryQuickWinsLoading: true,
        secondaryQuickWinsRequested: true,
        secondaryQuickWinsRequestBody: request.body,
        secondaryQuickWinsDebug: {
          ...record.payload.secondaryQuickWinsDebug,
          startedAt: new Date().toISOString(),
          completedAt: undefined,
          requestSource: request.source,
          error: null,
        },
      },
    };

    saveSeoGeoReport(loadingRecord);
    this._record.set(loadingRecord);
    this.startSecondaryQuickWinsProgress();
    void this.loadSecondaryQuickWins(loadingRecord);
  }

  private async loadSecondaryQuickWins(record: StoredSeoGeoReport): Promise<void> {
    const targetUrl = environment.geoAnalysisNoLlmForwardWebhookUrl;
    const request = this.resolveSecondaryQuickWinsRequest(record);
    const requestBody = request.body;

    if (!targetUrl || requestBody === null || requestBody === undefined) {
      this.finishSecondaryQuickWins(record, [], true, null, {
        requestSource: request.source,
        error: !targetUrl ? 'Konfiguration unvollständig.' : 'Anfrage konnte nicht erstellt werden.',
      });
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), SECONDARY_QUICK_WINS_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeout);
      }

      if (!response.ok) {
        const responseBody = await response.text().catch(() => '');
        console.error('Geo analysis quick wins webhook error', {
          status: response.status,
          url: targetUrl,
          responseBody,
        });
        this.finishSecondaryQuickWins(record, [], false, null, {
          requestSource: request.source,
          responseStatus: response.status,
          error: responseBody || `HTTP ${response.status}`,
        });
        return;
      }

      const raw = await response.text().catch(() => '');
      const parsedQuickWinsResponse = this.extractSecondaryQuickWinsResponse(this.parseJson(raw));
      this.finishSecondaryQuickWins(
        record,
        parsedQuickWinsResponse.quickWins,
        true,
        parsedQuickWinsResponse.meta,
        {
          ...parsedQuickWinsResponse.debug,
          requestSource: request.source,
          responseStatus: response.status,
          error: null,
        },
      );
    } catch (error) {
      console.error('Geo analysis quick wins webhook request failed', {
        url: targetUrl,
        error,
      });
      this.finishSecondaryQuickWins(record, [], false, null, {
        requestSource: request.source,
        error: this.describeSecondaryQuickWinsError(error),
      });
    }
  }

  private finishSecondaryQuickWins(
    record: StoredSeoGeoReport,
    quickWins: QuickWin[],
    requestCompleted: boolean,
    meta: SecondaryQuickWinsMeta | null = null,
    debug: Partial<SecondaryQuickWinsDebug> = {},
  ): void {
    this.finishSecondaryQuickWinsProgress();

    const updatedRecord: StoredSeoGeoReport = {
      ...record,
      payload: {
        ...record.payload,
        secondaryQuickWins: quickWins.length ? quickWins : record.payload.secondaryQuickWins,
        secondaryQuickWinsMeta: meta ?? record.payload.secondaryQuickWinsMeta,
        secondaryQuickWinsDebug: {
          ...record.payload.secondaryQuickWinsDebug,
          ...debug,
          recognizedCount: quickWins.length,
          completedAt: new Date().toISOString(),
        },
        secondaryQuickWinsLoading: false,
        secondaryQuickWinsRequested: requestCompleted,
        secondaryQuickWinsRequestBody: undefined,
      },
    };

    saveSeoGeoReport(updatedRecord);
    this._record.set(updatedRecord);
  }

  private startSecondaryQuickWinsProgress(): void {
    this.clearSecondaryQuickWinsProgressTimer();
    this.secondaryQuickWinsLoadingStepIndex.set(0);
    this.secondaryQuickWinsProgress.set(SECONDARY_QUICK_WINS_PROGRESS_STOPS[0] ?? 12);
    this.scheduleNextSecondaryQuickWinsProgress();
  }

  private scheduleNextSecondaryQuickWinsProgress(): void {
    this.clearSecondaryQuickWinsProgressTimer();

    this.quickWinsProgressTimerId = window.setTimeout(() => {
      if (!this.isSecondaryQuickWinsLoading()) {
        this.clearSecondaryQuickWinsProgressTimer();
        return;
      }

      const currentStep = this.secondaryQuickWinsLoadingStepIndex();
      const lastStepIndex = SECONDARY_QUICK_WINS_PROGRESS_STOPS.length - 1;
      if (currentStep >= lastStepIndex) {
        this.secondaryQuickWinsProgress.set(SECONDARY_QUICK_WINS_PROGRESS_STOPS[lastStepIndex] ?? 92);
        this.clearSecondaryQuickWinsProgressTimer();
        return;
      }

      const nextStep = currentStep + 1;
      this.secondaryQuickWinsLoadingStepIndex.set(nextStep);
      this.secondaryQuickWinsProgress.set(SECONDARY_QUICK_WINS_PROGRESS_STOPS[nextStep] ?? 92);

      if (nextStep < lastStepIndex) {
        this.scheduleNextSecondaryQuickWinsProgress();
      } else {
        this.clearSecondaryQuickWinsProgressTimer();
      }
    }, SECONDARY_QUICK_WINS_PROGRESS_ADVANCE_MS);
  }

  private finishSecondaryQuickWinsProgress(): void {
    this.clearSecondaryQuickWinsProgressTimer();
    this.secondaryQuickWinsLoadingStepIndex.set(SECONDARY_QUICK_WINS_LOADING_STEPS.length - 1);
    this.secondaryQuickWinsProgress.set(100);
  }

  private resetSecondaryQuickWinsProgress(): void {
    this.clearSecondaryQuickWinsProgressTimer();
    this.secondaryQuickWinsLoadingStepIndex.set(0);
    this.secondaryQuickWinsProgress.set(0);
  }

  private clearSecondaryQuickWinsProgressTimer(): void {
    if (this.quickWinsProgressTimerId !== null) {
      window.clearTimeout(this.quickWinsProgressTimerId);
      this.quickWinsProgressTimerId = null;
    }
  }

  private extractSecondaryQuickWinsResponse(data: unknown): SecondaryQuickWinsResponse {
    const parsed = Array.isArray(data) ? (data[0] ?? null) : data;
    if (!parsed || typeof parsed !== 'object') {
      return {
        quickWins: [],
        meta: null,
        debug: {
          responseShape: 'invalid',
          topLevelKeys: [],
        },
      };
    }

    const payload = parsed as {
      quickWins?: unknown;
      quick_wins?: unknown;
      analysis_meta?: unknown;
    };
    const hasCamelCase = Array.isArray(payload.quickWins);
    const hasSnakeCase = Array.isArray(payload.quick_wins);
    const quickWinsSource: unknown[] = hasCamelCase
      ? payload.quickWins as unknown[]
      : hasSnakeCase
        ? payload.quick_wins as unknown[]
        : [];
    const quickWins = quickWinsSource
      .map((item: unknown) => this.normalizeQuickWin(item))
      .filter((item: QuickWin | null): item is QuickWin => item !== null);

    return {
      quickWins,
      meta: this.extractSecondaryQuickWinsMeta(payload.analysis_meta),
      debug: {
        responseShape: hasCamelCase ? 'quickWins' : hasSnakeCase ? 'quick_wins' : 'unknown',
        topLevelKeys: Object.keys(payload),
      },
    };
  }

  private normalizeQuickWin(item: unknown): QuickWin | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const raw = item as {
      category?: unknown;
      titel?: unknown;
      loesung?: unknown;
      beispiel?: unknown;
      aufwand?: unknown;
      scoreImpact?: unknown;
      score_impact?: unknown;
    };

    return {
      category: typeof raw.category === 'string' ? raw.category : undefined,
      titel: typeof raw.titel === 'string' ? raw.titel : undefined,
      loesung: Array.isArray(raw.loesung) ? raw.loesung.filter((entry): entry is string => typeof entry === 'string') : undefined,
      beispiel: typeof raw.beispiel === 'string' ? raw.beispiel : undefined,
      aufwand: typeof raw.aufwand === 'string' ? raw.aufwand : undefined,
      scoreImpact: typeof raw.scoreImpact === 'string'
        ? raw.scoreImpact
        : typeof raw.score_impact === 'string'
          ? raw.score_impact
          : undefined,
    };
  }

  private extractSecondaryQuickWinsMeta(value: unknown): SecondaryQuickWinsMeta | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const meta = value as { focus?: unknown; count?: unknown };
    return {
      focus: typeof meta.focus === 'string' ? meta.focus : undefined,
      count: typeof meta.count === 'number' ? meta.count : undefined,
    };
  }

  private resolveSecondaryQuickWinsRequest(record: StoredSeoGeoReport): SecondaryQuickWinsRequestResolution {
    const storedRequest = record.payload.secondaryQuickWinsRequestBody;
    if (storedRequest !== null && storedRequest !== undefined) {
      return {
        body: storedRequest,
        source: 'secondaryQuickWinsRequestBody',
      };
    }

    const payloadInput = this.extractSecondaryQuickWinsInput(record.payload.input);
    if (payloadInput) {
      return {
        body: payloadInput,
        source: 'payload.input',
      };
    }

    return {
      body: null,
      source: 'unavailable',
    };
  }

  private extractSecondaryQuickWinsInput(value: unknown): GeoWebhookInput | null {
    const candidate = Array.isArray(value) ? (value[0] ?? null) : value;
    if (!candidate || typeof candidate !== 'object') {
      return null;
    }

    const nestedInput = (candidate as { input?: unknown }).input;
    if (nestedInput) {
      const extractedNested = this.extractSecondaryQuickWinsInput(nestedInput);
      if (extractedNested) {
        return extractedNested;
      }
    }

    const nestedBody = (candidate as { body?: unknown }).body;
    if (nestedBody) {
      const extractedBody = this.extractSecondaryQuickWinsInput(nestedBody);
      if (extractedBody) {
        return extractedBody;
      }
    }

    const { url, brand, industry, location } = candidate as GeoWebhookInput;
    if (![url, brand, industry, location].some((entry) => typeof entry === 'string' && entry.trim().length > 0)) {
      return null;
    }

    return {
      url: typeof url === 'string' ? url : undefined,
      brand: typeof brand === 'string' ? brand : undefined,
      industry: typeof industry === 'string' ? industry : undefined,
      location: typeof location === 'string' ? location : undefined,
    };
  }

  private describeSecondaryQuickWinsError(error: unknown): string {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'Request wurde wegen Timeout abgebrochen.';
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'Unbekannter Fehler beim Laden der Sofortmaßnahmen.';
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

    return 'Die Analyse ist fehlgeschlagen. Bitte starten Sie sie erneut.';
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

  compactUrl(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
      const parsed = new URL(normalized);
      const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
      const path = parsed.pathname.replace(/\/+$/, '');
      const search = parsed.search ?? '';
      const hash = parsed.hash ?? '';
      return `${host}${path === '/' ? '' : path}${search}${hash}`;
    } catch {
      return trimmed
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/\/+$/, '')
        .toLowerCase();
    }
  }

  private isEnvelopeOnlyPayload(payload?: GeoWebhookResult | null): boolean {
    return this.hasEnvelopeData(payload) && !this.hasAnalysisCore(payload);
  }

  private hasEnvelopeData(payload?: GeoWebhookResult | null): boolean {
    if (!payload) {
      return false;
    }

    return (
      !!this.extractSecondaryQuickWinsInput(payload.body) ||
      payload.headers !== undefined ||
      typeof payload.webhookUrl === 'string'
    );
  }

  private hasAnalysisCore(payload?: GeoWebhookResult | null): boolean {
    if (!payload) {
      return false;
    }

    return (
      this.hasPopulatedObject(payload.score) ||
      (payload.dimensions?.length ?? 0) > 0 ||
      this.hasPopulatedObject(payload.report) ||
      this.hasPopulatedObject(payload.botAccessibilityCheck) ||
      (payload.aiPlatforms?.length ?? 0) > 0
    );
  }

  private hasPopulatedObject(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    return Object.values(value as Record<string, unknown>).some((entry) => {
      if (Array.isArray(entry)) {
        return entry.length > 0;
      }

      if (entry && typeof entry === 'object') {
        return Object.keys(entry as Record<string, unknown>).length > 0;
      }

      return entry !== undefined && entry !== null && entry !== '';
    });
  }
}
