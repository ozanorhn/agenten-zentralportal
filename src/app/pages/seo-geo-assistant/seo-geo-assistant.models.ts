export const SEO_GEO_REPORT_SESSION_KEY = 'seo-geo-assistant:reports';

export type GeoAnalysisJobState = 'running' | 'done' | 'failed';

export interface GeoWebhookInput {
  url?: string;
  brand?: string;
  industry?: string;
  location?: string;
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
}

export interface DimensionScore {
  key?: string;
  label?: string;
  score?: number;
  indicator?: string;
  status?: string;
  label_text?: string;
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
  statusCode?: number;
  accessible?: boolean;
  blocked?: boolean;
}

export interface BotCategorySnapshot {
  total?: number;
  accessible?: number;
  blocked?: number;
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
  titel?: string;
  loesung?: string[];
  beispiel?: string;
  aufwand?: string;
  scoreImpact?: string;
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
  dimensionAnalysis?: Record<string, string[]>;
  aiMode?: string[];
  strategicActions?: StrategicAction[];
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
  breadcrumbSchema?: string;
  websiteSchema?: string;
  llmsTxt?: string;
  schemaAnalysis?: GeoSchemaAnalysis;
}

export interface GeoReport {
  executiveSummary?: string[];
  onpage?: ReportCategory;
  technik?: ReportCategory;
  offpage?: ReportCategory;
  geo?: GeoReportSection;
  artifacts?: GeoArtifacts;
}

export interface GeoWebhookResult {
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
  technical?: {
    aiBotsAllowed?: boolean;
    hasLlmsTxt?: boolean;
    isSSR?: boolean;
    hasCanonical?: boolean;
    https?: boolean;
  };
  content?: {
    wordCount?: number;
    avgParagraphWords?: number;
    h2QuestionCount?: number;
    hasVisibleAuthor?: boolean;
    semanticDensity?: number;
  };
  authority?: {
    hasWikidata?: boolean;
    wikidataId?: string;
    hasWikipedia?: boolean;
    domainRating?: number;
    refDomains?: number;
    socialPlatforms?: string[];
    validatedSocialLinks?: number;
  };
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
}

export function findSeoGeoReport(id: string | null): StoredSeoGeoReport | null {
  if (!id) {
    return loadSeoGeoReports()[0] ?? null;
  }

  return loadSeoGeoReports().find((entry) => entry.id === id) ?? null;
}
