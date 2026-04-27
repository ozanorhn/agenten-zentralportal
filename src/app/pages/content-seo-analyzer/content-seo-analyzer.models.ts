export const CONTENT_SEO_ANALYZER_SESSION_KEY = 'content-seo-analyzer:reports';

export interface ContentSeoAnalyzerSeoSection {
  score?: number | null;
  contentGaps?: string[];
  keywordOpportunities?: string[];
  quickWins?: string[];
}

export interface ContentSeoAnalyzerCompetitiveSection {
  topCompetitors?: string[];
  marketPosition?: string;
  advantages?: string[];
  recommendedPositioning?: string;
}

export interface ContentSeoAnalyzerResultPayload {
  seo?: ContentSeoAnalyzerSeoSection | null;
  competitive?: ContentSeoAnalyzerCompetitiveSection | null;
}

export interface StoredContentSeoAnalyzerReport {
  id: string;
  createdAt: number;
  domain: string;
  payload: ContentSeoAnalyzerResultPayload;
}

export function loadContentSeoAnalyzerReports(): StoredContentSeoAnalyzerReport[] {
  try {
    const raw = sessionStorage.getItem(CONTENT_SEO_ANALYZER_SESSION_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredContentSeoAnalyzerReport[]) : [];
  } catch {
    return [];
  }
}

export function saveContentSeoAnalyzerReport(record: StoredContentSeoAnalyzerReport): void {
  const reports = loadContentSeoAnalyzerReports();
  const filtered = reports.filter((entry) => entry.id !== record.id);
  const updated = [record, ...filtered].slice(0, 10);
  sessionStorage.setItem(CONTENT_SEO_ANALYZER_SESSION_KEY, JSON.stringify(updated));
}

export function findContentSeoAnalyzerReport(id: string | null): StoredContentSeoAnalyzerReport | null {
  if (!id) {
    return loadContentSeoAnalyzerReports()[0] ?? null;
  }

  return loadContentSeoAnalyzerReports().find((entry) => entry.id === id) ?? null;
}
