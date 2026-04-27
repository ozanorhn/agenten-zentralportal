export const OMR_SEO_CONTENT_STRATEGIE_SESSION_KEY = 'omr-seo-content-strategie:reports';

export interface OmrSeoContentStrategieInput {
  topic: string;
  audience: string;
  offer: string;
}

export interface StoredOmrSeoContentStrategieReport {
  id: string;
  createdAt: number;
  input: OmrSeoContentStrategieInput;
  parsedResponse: unknown | null;
  rawResponse: string;
}

export function loadOmrSeoContentStrategieReports(): StoredOmrSeoContentStrategieReport[] {
  try {
    const raw = sessionStorage.getItem(OMR_SEO_CONTENT_STRATEGIE_SESSION_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredOmrSeoContentStrategieReport[]) : [];
  } catch {
    return [];
  }
}

export function saveOmrSeoContentStrategieReport(record: StoredOmrSeoContentStrategieReport): void {
  const reports = loadOmrSeoContentStrategieReports();
  const filtered = reports.filter((entry) => entry.id !== record.id);
  const updated = [record, ...filtered].slice(0, 10);
  sessionStorage.setItem(OMR_SEO_CONTENT_STRATEGIE_SESSION_KEY, JSON.stringify(updated));
}

export function findOmrSeoContentStrategieReport(id: string | null): StoredOmrSeoContentStrategieReport | null {
  if (!id) {
    return loadOmrSeoContentStrategieReports()[0] ?? null;
  }

  return loadOmrSeoContentStrategieReports().find((entry) => entry.id === id) ?? null;
}
