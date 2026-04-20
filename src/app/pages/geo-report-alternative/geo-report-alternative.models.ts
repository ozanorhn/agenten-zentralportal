export const GEO_REPORT_ALTERNATIVE_SESSION_KEY = 'geo-report-alternative:reports';

export interface StoredGeoReportAlternative {
  id: string;
  createdAt: number;
  url: string;
  markdown: string;
}

export function loadGeoReportAlternatives(): StoredGeoReportAlternative[] {
  try {
    const raw = sessionStorage.getItem(GEO_REPORT_ALTERNATIVE_SESSION_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredGeoReportAlternative[]) : [];
  } catch {
    return [];
  }
}

export function saveGeoReportAlternative(record: StoredGeoReportAlternative): void {
  const reports = loadGeoReportAlternatives();
  const filtered = reports.filter((entry) => entry.id !== record.id);
  const updated = [record, ...filtered].slice(0, 10);
  sessionStorage.setItem(GEO_REPORT_ALTERNATIVE_SESSION_KEY, JSON.stringify(updated));
}

export function findGeoReportAlternative(id: string | null): StoredGeoReportAlternative | null {
  if (!id) {
    return loadGeoReportAlternatives()[0] ?? null;
  }

  return loadGeoReportAlternatives().find((entry) => entry.id === id) ?? null;
}
