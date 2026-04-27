export const INTERNAL_LINK_SUGGESTIONS_SESSION_KEY = 'interne-verlinkung-vorschlaege:reports';

export interface InternalLinkSuggestionsInput {
  sitemapUrl: string;
  targetUrl: string;
  mainKeyword: string;
}

export interface StoredInternalLinkSuggestionsReport {
  id: string;
  createdAt: number;
  input: InternalLinkSuggestionsInput;
  parsedResponse: unknown | null;
  rawResponse: string;
}

export function loadInternalLinkSuggestionsReports(): StoredInternalLinkSuggestionsReport[] {
  try {
    const raw = sessionStorage.getItem(INTERNAL_LINK_SUGGESTIONS_SESSION_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredInternalLinkSuggestionsReport[]) : [];
  } catch {
    return [];
  }
}

export function saveInternalLinkSuggestionsReport(record: StoredInternalLinkSuggestionsReport): void {
  const reports = loadInternalLinkSuggestionsReports();
  const filtered = reports.filter((entry) => entry.id !== record.id);
  const updated = [record, ...filtered].slice(0, 10);
  sessionStorage.setItem(INTERNAL_LINK_SUGGESTIONS_SESSION_KEY, JSON.stringify(updated));
}

export function findInternalLinkSuggestionsReport(id: string | null): StoredInternalLinkSuggestionsReport | null {
  if (!id) {
    return loadInternalLinkSuggestionsReports()[0] ?? null;
  }

  return loadInternalLinkSuggestionsReports().find((entry) => entry.id === id) ?? null;
}
