export const SEO_GEO_REPORT_SESSION_KEY = 'seo-geo-assistant:reports';

export type GeoAnalysisJobState = 'running' | 'done' | 'failed';

export interface GeoWebhookInput {
  url?: string;
  brand?: string;
  industry?: string;
  location?: string;
  websiteType?: string;
}

export type GeoWebhookEnvelopeScalar = string | number | boolean | null;
export type GeoWebhookEnvelopeHeaders = Record<string, string>;
export type GeoWebhookEnvelopeParams = Record<string, GeoWebhookEnvelopeScalar>;

export interface GeoWebhookEnvelope {
  headers?: GeoWebhookEnvelopeHeaders;
  params?: GeoWebhookEnvelopeParams;
  query?: GeoWebhookEnvelopeParams;
  body?: GeoWebhookInput;
  webhookUrl?: string;
  executionMode?: string;
}

export interface SeoBreakdownItem {
  criterion?: string;
  points?: number;
  max?: number;
  detail?: string;
}

export interface SeoCategoryAnalysis {
  category?: string;
  score?: number;
  max?: number;
  weight?: number;
  breakdown?: SeoBreakdownItem[];
  critical_issues?: string[];
  urls_checked?: number;
  timestamp?: string;
}

export interface SeoAnalysis {
  total_score?: number;
  max?: number;
  score_breakdown?: string;
  categories?: {
    onpage?: SeoCategoryAnalysis;
    technik?: SeoCategoryAnalysis;
    offpage?: SeoCategoryAnalysis;
  };
}

export interface ScoreSummary {
  total?: number;
  label?: string;
  median?: number;
  improvementPotential?: number;
  diffToMedian?: number;
  criticalIssues?: number;
  brandRetrieval?: number;
  pageGeoReadiness?: number;
  balancedGeoScore?: number;
  guardrailApplied?: boolean;
  guardrailReason?: string | null;
}

export interface GeoBreakdownGroup {
  key?: string;
  label?: string;
  max?: number;
  score?: number;
  present?: string[];
  exclamation?: string[];
  missing?: string[];
  rationale?: string;
}

export interface DimensionScore {
  key?: string;
  label?: string;
  score?: number;
  indicator?: string;
  status?: string;
  label_text?: string;
  presentCount?: number;
  exclamationCount?: number;
  missingCount?: number;
  present?: string[];
  exclamation?: string[];
  missing?: string[];
  rationale?: string;
  explanation?: string;
  breakdown?: Record<string, GeoBreakdownGroup>;
  facts?: string[];
}

export interface AiPlatformScore {
  name?: string;
  score?: number;
  indicator?: string;
  limitingFactor?: string;
}

export interface BotSummary {
  total?: number;
  accessible?: number;
  blocked?: number;
}

export interface BotCategoryItem {
  name?: string;
  provider?: string;
  category?: string;
  isOAP?: boolean;
  statusCode?: number;
  accessible?: boolean;
  blocked?: boolean;
  status?: string;
  statusLabel?: string;
  description?: string;
}

export interface BotCategorySnapshot {
  total?: number;
  accessible?: number;
  blocked?: number;
  bots?: BotCategoryItem[];
}

export interface BotCategorySummary {
  category?: string;
  description?: string;
  summary?: string;
  bots?: BotCategoryItem[];
}

export interface BotAssessment {
  aiSearchBots?: string;
  aiTrainingBots?: string;
  aiAssistantBots?: string;
  archiveBots?: string;
  oapScore?: string;
  overallAccessibility?: number;
  blockedBots?: string[];
  recommendation?: string;
}

export interface BotAccessibilityCheck {
  categories?: Record<string, BotCategorySnapshot>;
  categorySummaries?: BotCategorySummary[];
  allBotsTested?: BotCategoryItem[];
  successfulBots?: BotCategoryItem[];
  blockedBotsDetailed?: BotCategoryItem[];
  errorBots?: BotCategoryItem[];
  summary?: {
    allBots?: BotSummary;
    oapBots?: BotSummary;
    urlVariants?: {
      total?: number;
      accessible?: number;
      issues?: string[];
    };
  };
  assessment?: BotAssessment;
  criticalBlocking?: string[];
}

export interface QuickWin {
  category?: string;
  titel?: string;
  loesung?: string[];
  beispiel?: string;
  aufwand?: string;
  scoreImpact?: string;
}

export interface SecondaryQuickWinsMeta {
  focus?: string;
  count?: number;
}

export interface SecondaryQuickWinsDebug {
  startedAt?: string;
  completedAt?: string;
  requestSource?: string;
  responseStatus?: number;
  responseShape?: string;
  recognizedCount?: number;
  error?: string | null;
  topLevelKeys?: string[];
}

export interface ReportCategory {
  score?: number;
  status?: string[];
  findings?: string[];
  quickWins?: QuickWin[];
}

export interface StrategicAction {
  titel?: string;
  warum?: string;
  wie?: string[];
  zeithorizont?: string;
}

export interface GeoReportSection {
  score?: number;
  balancedGeoScore?: number;
  brandRetrievalScore?: number;
  pageGeoReadinessScore?: number;
  guardrailApplied?: boolean;
  guardrailReason?: string | null;
  dimensionAnalysis?: Record<string, unknown>;
  subscores?: Record<string, Record<string, GeoBreakdownGroup>>;
  aiMode?: string[];
  strategicActions?: StrategicAction[];
}

export interface GeoReportDimensionSummary {
  score?: string | number;
  status?: string;
  summary?: string;
  begruendung?: string;
  explanation?: string;
  fakten?: {
    vorhanden?: string[];
    fehlt?: string[];
  };
  breakdown?: Record<string, GeoBreakdownGroup>;
}

export interface GeoSchemaAnalysis {
  present?: string[];
  missing?: string[];
  h2QuestionsFound?: string[];
  deployInstructions?: string;
}

export interface GeoArtifacts {
  organizationSchema?: string;
  faqPageSchema?: string;
  faqPageSchemaNote?: string;
  breadcrumbSchema?: string;
  websiteSchema?: string;
  articleSchema?: string;
  llmsTxt?: string;
  sitemapEntry?: string;
  schemaAnalysis?: GeoSchemaAnalysis;
}

export interface GeoReport {
  executiveSummary?: string[];
  onpage?: ReportCategory;
  technik?: ReportCategory;
  offpage?: ReportCategory;
  freshness?: ReportCategory;
  botAccessibility?: {
    categories?: BotCategorySummary[];
    summary?: {
      text?: string;
      oapText?: string;
      recommendation?: string;
    };
  };
  brandRetrieval?: GeoReportDimensionSummary;
  pageGeoReadiness?: GeoReportDimensionSummary;
  geo?: GeoReportSection;
  artifacts?: GeoArtifacts;
}

export interface FilePresenceCheck {
  exists?: boolean;
  hasContact?: boolean;
  hasExpiry?: boolean;
  wordCount?: number;
  hasContext?: boolean;
  hasSchema?: boolean;
}

export interface AiLiveTestResult {
  mentioned?: boolean;
  rank?: number | null;
  text?: string;
  citations?: string[];
  intent?: string;
}

export interface AiLiveTests {
  summary?: {
    totalTests?: number;
    mentionedIn?: number;
    visibilityScore?: number;
    visibilityLabel?: string;
  };
  perplexityInformational?: AiLiveTestResult;
  perplexityCommercial?: AiLiveTestResult;
  perplexityComparison?: AiLiveTestResult;
  chatGPT?: AiLiveTestResult;
  gemini?: AiLiveTestResult;
}

export interface GeoWebhookResult extends GeoWebhookEnvelope {
  analysedAt?: string;
  visuals?: {
    radarChart?: string;
  };
  input?: GeoWebhookInput;
  seoAnalysis?: SeoAnalysis;
  score?: ScoreSummary;
  dimensions?: DimensionScore[];
  aiPlatforms?: AiPlatformScore[];
  botAccessibilityCheck?: BotAccessibilityCheck;
  performance?: {
    score?: number | null;
    label?: string | null;
    lcp?: number | null;
    cls?: number | null;
    tbt?: number | null;
    fcp?: number | null;
    ttfb?: number | null;
    cwvCategory?: string | null;
    passesCore?: boolean;
    issues?: string[];
  };
  aiLiveTests?: AiLiveTests;
  secondaryQuickWins?: QuickWin[];
  secondaryQuickWinsMeta?: SecondaryQuickWinsMeta;
  secondaryQuickWinsDebug?: SecondaryQuickWinsDebug;
  secondaryQuickWinsLoading?: boolean;
  secondaryQuickWinsRequested?: boolean;
  secondaryQuickWinsRequestBody?: unknown;
  fileChecks?: {
    securityTxt?: FilePresenceCheck;
    llmsFullTxt?: FilePresenceCheck;
    aiPlugin?: FilePresenceCheck;
  };
  technical?: {
    aiBotsAllowed?: boolean;
    hasLlmsTxt?: boolean;
    hasLlmsFullTxt?: boolean;
    hasSecurityTxt?: boolean;
    hasAiPlugin?: boolean;
    isSSR?: boolean;
    hasCanonical?: boolean;
    https?: boolean;
    hasSitemapFile?: boolean;
    urlInSitemap?: boolean;
    robotsTxt?: {
      exists?: boolean;
      statusCode?: number;
      url?: string;
      hasSitemapHint?: boolean;
      blockedBots?: string[];
    };
  };
  content?: {
    wordCount?: number;
    avgParagraphWords?: number;
    h2QuestionCount?: number;
    hasFaqSchema?: boolean;
    hasVisibleAuthor?: boolean;
    semanticDensity?: number;
    internalLinkCount?: number;
    hasMultimedia?: boolean;
    multimediaList?: string[];
  };
  eeat?: {
    score?: number;
    max?: number;
    scoreNormalized?: number;
    label?: string;
    indicator?: string;
    present?: string[];
    missing?: string[];
    signals?: Record<string, boolean | number | string | null>;
  };
  freshness?: {
    days?: number;
    dateModified?: string;
    datePublished?: string;
    urlInSitemap?: boolean;
    score?: number;
  };
  authority?: {
    hasWikidata?: boolean;
    wikidataId?: string;
    hasWikipedia?: boolean;
    domainRating?: number;
    refDomains?: number;
    organicKeywords?: number;
    organicTraffic?: number;
    socialPlatforms?: string[];
    validatedSocialLinks?: number;
    sameAsCount?: number;
    sameAsLinks?: string[];
  };
  subscores?: Record<string, Record<string, GeoBreakdownGroup>>;
  report?: GeoReport;
}

export interface GeoAnalysisStartResponse {
  jobId?: string;
  status?: GeoAnalysisJobState;
  progress?: number;
  step?: string;
}

export interface GeoAnalysisJobError {
  message?: string;
  [key: string]: unknown;
}

export interface GeoAnalysisJobStatusResponse {
  jobId?: string;
  status?: GeoAnalysisJobState;
  progress?: number;
  step?: string;
  createdAt?: string;
  updatedAt?: string;
  input?: GeoWebhookInput | null;
  result?: unknown;
  error?: GeoAnalysisJobError | string | null;
}

export interface StoredSeoGeoReport {
  id: string;
  createdAt: number;
  payload: GeoWebhookResult;
}

export const SEO_GEO_REPORT_UPDATED_EVENT = 'seo-geo-report-updated';

export function extractGeoWebhookResult(data: unknown): GeoWebhookResult | null {
  let parsed = data;

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return null;
    }
  }

  const payload = Array.isArray(parsed) ? (parsed[0] ?? null) : parsed;
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload as GeoWebhookResult;
}

export function sanitizeNoLlmGeoWebhookResult(payload: GeoWebhookResult | null): GeoWebhookResult | null {
  if (!payload?.authority) {
    return payload;
  }

  const { refDomains, organicKeywords, organicTraffic, ...authority } = payload.authority;
  const hasAuthorityValues = Object.values(authority).some((value) => value !== undefined && value !== null);

  return {
    ...payload,
    authority: hasAuthorityValues ? authority : undefined,
  };
}

export function loadSeoGeoReports(): StoredSeoGeoReport[] {
  try {
    const raw = sessionStorage.getItem(SEO_GEO_REPORT_SESSION_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as StoredSeoGeoReport[] : [];
  } catch {
    return [];
  }
}

export function saveSeoGeoReport(record: StoredSeoGeoReport): void {
  const reports = loadSeoGeoReports();
  const filtered = reports.filter((entry) => entry.id !== record.id);
  const updated = [record, ...filtered].slice(0, 10);
  sessionStorage.setItem(SEO_GEO_REPORT_SESSION_KEY, JSON.stringify(updated));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SEO_GEO_REPORT_UPDATED_EVENT, {
      detail: { id: record.id },
    }));
  }
}

export function updateSeoGeoReport(
  id: string,
  updater: (record: StoredSeoGeoReport) => StoredSeoGeoReport,
): StoredSeoGeoReport | null {
  const existing = findSeoGeoReport(id);
  if (!existing) {
    return null;
  }

  const updated = updater(existing);
  saveSeoGeoReport(updated);
  return updated;
}

export function findSeoGeoReport(id: string | null): StoredSeoGeoReport | null {
  if (!id) {
    return loadSeoGeoReports()[0] ?? null;
  }

  return loadSeoGeoReports().find((entry) => entry.id === id) ?? null;
}
