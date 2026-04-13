import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { RunHistoryService } from '../../services/run-history.service';
import { AgentOutputService } from '../../services/agent-output.service';
import { NotificationService } from '../../services/notification.service';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  AgentOutput,
  CompanyListOutput,
  CompanyRow,
  ContentStrategyOutput,
  KeywordDataRow,
  MonthlySearch,
  SocialMediaOutput,
  GeoAuditBotStatus,
  GeoAuditDistribution,
  GeoAuditError,
  GeoAuditIssue,
  GeoAuditOutput,
  GeoAuditPage,
  GeoAuditPageRef,
  GeoAuditSummary,
  GeoAuditTotals,
  MarkdownOutput,
  RunInputData,
  RunRecord,
} from '../../models/interfaces';

const LEAD_RESEARCHER_WEBHOOK = '/api/n8n/webhook/ac9a9c6c-a2f0-4389-9462-06cc82bebe8b';
const FIRMEN_FINDER_WEBHOOK = '/api/n8n/webhook/3ecd15d2-2606-4ca3-b44e-b4c39208a39d';
const GEO_SITE_AUDIT_WEBHOOK = '/api/n8n/webhook/site-audit';
const SOCIAL_MEDIA_WIZARD_WEBHOOK = '/api/n8n/webhook/74ff0667-7ddf-4fdc-9e9e-8a5c1b4c0de1';
const CONTENT_STRATEGY_WEBHOOK = '/api/n8n/webhook/ac7e989d-6e32-4850-83c4-f10421467fb8';

type MaxPagesValue = '25' | '50' | '100' | 'all';

@Component({
  selector: 'app-agent-detail',
  imports: [RouterLink],
  templateUrl: './agent-detail.html',
  styleUrl: './agent-detail.scss',
})
export class AgentDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly runHistory = inject(RunHistoryService);
  private readonly agentOutput = inject(AgentOutputService);
  private readonly notifService = inject(NotificationService);

  readonly agentId = this.route.snapshot.params['id'] as string;
  readonly agentMeta = AGENTS_MAP[this.agentId];

  readonly targetAudience = signal('');
  readonly companyName = signal('');
  readonly websiteUrl = signal('');
  readonly toneOfVoice = signal('Professionell & Sachlich');

  readonly isLeadResearcher = this.agentId === 'lead-researcher';
  readonly isFirmenFinder = this.agentId === 'firmen-finder';
  readonly isGeoSiteAudit = this.agentId === 'geo-site-audit';
  readonly isSocialMediaWizard = this.agentId === 'social-media-wizard';
  readonly isContentStrategyBot = this.agentId === 'content-strategy-bot';

  readonly brandVoice = signal('');
  readonly socialTopic = signal('');

  readonly primaryTopic = signal('');
  readonly contentStrategyTargetAudience = signal('');
  readonly contentType = signal('');
  readonly competitorUrlsInput = signal('');

  readonly industry = signal('');
  readonly city = signal('');
  readonly domain = signal('');
  readonly maxPages = signal<MaxPagesValue>('25');

  readonly isSubmitting = signal(false);
  readonly progress = signal(0);
  readonly progressLabel = signal('Initialisiere Agent…');
  readonly webhookError = signal(false);

  readonly toneOptions = [
    'Professionell & Sachlich',
    'Inspirierend & Narrativ',
    'Direkt & Provokant',
    'Akademisch & Detailliert',
  ];
  readonly maxPageOptions = [
    { value: '25' as const, label: '25 Seiten (Schnelltest)', limit: 25 },
    { value: '50' as const, label: '50 Seiten', limit: 50 },
    { value: '100' as const, label: '100 Seiten', limit: 100 },
    { value: 'all' as const, label: 'Alle Seiten', limit: null },
  ];

  readonly skills = computed(() => this.agentMeta?.skills ?? [
    { label: 'Copywriting', value: 95 },
    { label: 'Personalisierung', value: 88 },
    { label: 'Tonanalyse', value: 82 },
    { label: 'Conversion Rate', value: 91 },
  ]);

  readonly chartBars = [40, 65, 55, 90, 75, 45, 60, 85, 30, 50, 70, 95];

  private readonly PROGRESS_LABELS_FIRMEN = [
    'Initialisiere Agent…',
    'Verbinde mit Verzeichnis-Datenbank…',
    'Suche Unternehmen in der Region…',
    'Filtere nach Branche…',
    'Extrahiere Kontaktdaten…',
    'Firmenliste fertig ✓',
  ];

  private readonly PROGRESS_LABELS_LEAD = [
    'Initialisiere Agent…',
    'Verbinde mit Recherche-Engine…',
    'Analysiere Website-Daten…',
    'Erstelle Sales-Briefing…',
    'Finalisiere Dokument…',
    'Briefing fertig ✓',
  ];

  private readonly PROGRESS_LABELS = [
    'Initialisiere Agent…',
    'Analysiere Zielgruppe…',
    'Verarbeite Website-Daten…',
    'Generiere Content…',
    'Optimiere Ausgabe…',
    'Workflow abgeschlossen ✓',
  ];

  private readonly PROGRESS_LABELS_GEO = [
    'Initialisiere GEO Audit…',
    'Verbinde mit Sitemap-Crawler…',
    'Pruefe robots.txt und llms.txt…',
    'Analysiere Seitenstruktur und KI-Signale…',
    'Baue Ranking und Prioritaetenliste…',
    'Geo Site Audit fertig ✓',
  ];

  submitWorkflow(): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    this.progress.set(0);
    this.webhookError.set(false);

    if (this.isLeadResearcher) {
      this.runLeadResearcherWorkflow();
    } else if (this.isFirmenFinder) {
      this.runFirmenFinderWorkflow();
    } else if (this.isGeoSiteAudit) {
      this.runGeoSiteAuditWorkflow();
    } else if (this.isSocialMediaWizard) {
      this.runSocialMediaWizardWorkflow();
    } else if (this.isContentStrategyBot) {
      this.runContentStrategyWorkflow();
    } else {
      this.runGenericWorkflow();
    }
  }

  private runLeadResearcherWorkflow(): void {
    const labels = this.PROGRESS_LABELS_LEAD;
    this.progressLabel.set(labels[0]);

    const startTime = Date.now();
    const minDuration = 3000;

    // Animate progress to 80% while waiting for webhook
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / minDuration) * 80), 80);
      this.progress.set(pct);
      if (pct >= 60) this.progressLabel.set(labels[4]);
      else if (pct >= 40) this.progressLabel.set(labels[3]);
      else if (pct >= 20) this.progressLabel.set(labels[2]);
      else if (pct >= 5)  this.progressLabel.set(labels[1]);
    }, 80);

    const body = {
      companyName: this.companyName(),
      websiteUrl: this.websiteUrl(),
    };

    this.http.post(LEAD_RESEARCHER_WEBHOOK, body, { responseType: 'text' }).subscribe({
      next: (response: string) => {
        clearInterval(interval);
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDuration - elapsed);

        setTimeout(() => {
          this.progress.set(100);
          this.progressLabel.set(labels[5]);
          setTimeout(() => this.completeLeadResearcher(response), 400);
        }, remaining);
      },
      error: () => {
        clearInterval(interval);
        this.webhookError.set(true);
        this.progress.set(100);
        this.progressLabel.set('Fehler beim Abrufen der Daten');
        setTimeout(() => {
          this.isSubmitting.set(false);
        }, 800);
      },
    });
  }

  private completeLeadResearcher(rawResponse: string): void {
    const output: MarkdownOutput = {
      type: 'markdown',
      content: this.extractMarkdownContent(rawResponse),
      companyName: this.companyName(),
      websiteUrl: this.websiteUrl(),
    };

    this.saveAndNavigate(output, `Sales Briefing: ${this.companyName()}`);
  }

  private extractMarkdownContent(raw: string): string {
    let content = raw.trim();

    // Try to extract from JSON (handles single and double-encoded responses)
    for (let i = 0; i < 2; i++) {
      if (!content.startsWith('{') && !content.startsWith('[')) break;
      try {
        const parsed = JSON.parse(content);
        const obj = Array.isArray(parsed) ? parsed[0] : parsed;
        const extracted: unknown = obj?.briefing ?? obj?.output ?? obj?.body ?? obj?.content;
        if (typeof extracted === 'string') {
          content = extracted;
        } else {
          break;
        }
      } catch {
        // Malformed JSON — try regex extraction as fallback
        const match = raw.match(/"(?:briefing|output|body|content)"\s*:\s*"([\s\S]+?)"\s*[,}]/);
        if (match) {
          content = match[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\"/g, '"');
        }
        break;
      }
    }

    // Strip leading type-prefix artifact e.g. "markdown\n" that n8n may prepend
    content = content.replace(/^markdown\r?\n/, '');

    // If no real newlines but literal \n sequences exist, unescape them
    if (!content.includes('\n') && content.includes('\\n')) {
      content = content.replace(/\\n/g, '\n');
    }

    return content;
  }

  private runFirmenFinderWorkflow(): void {
    const labels = this.PROGRESS_LABELS_FIRMEN;
    this.progressLabel.set(labels[0]);

    const startTime = Date.now();
    const minDuration = 3000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / minDuration) * 80), 80);
      this.progress.set(pct);
      if (pct >= 60) this.progressLabel.set(labels[4]);
      else if (pct >= 40) this.progressLabel.set(labels[3]);
      else if (pct >= 20) this.progressLabel.set(labels[2]);
      else if (pct >= 5)  this.progressLabel.set(labels[1]);
    }, 80);

    const body = {
      industry: this.industry(),
      city: this.city(),
    };

    this.http.post(FIRMEN_FINDER_WEBHOOK, body, { responseType: 'text' }).subscribe({
      next: (response: string) => {
        clearInterval(interval);
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDuration - elapsed);

        setTimeout(() => {
          this.progress.set(100);
          this.progressLabel.set(labels[5]);
          setTimeout(() => this.completeFirmenFinder(response), 400);
        }, remaining);
      },
      error: () => {
        clearInterval(interval);
        this.webhookError.set(true);
        this.progress.set(100);
        this.progressLabel.set('Fehler beim Abrufen der Daten');
        setTimeout(() => {
          this.isSubmitting.set(false);
        }, 800);
      },
    });
  }

  private completeFirmenFinder(rawResponse: string): void {
    let companies: CompanyRow[] = [];
    try {
      const parsed = JSON.parse(rawResponse);
      // n8n may return a full array OR just the first item as a single object
      const arr: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      companies = arr
        .map((item) => (item as { contactInfo?: CompanyRow })?.contactInfo)
        .filter((c): c is CompanyRow => !!c);
    } catch {
      // Malformed JSON — proceed with empty list
    }

    const output: CompanyListOutput = {
      type: 'company-list',
      companies,
      industry: this.industry(),
      city: this.city(),
    };

    const summary = `${companies.length} Unternehmen gefunden in ${this.city()}`;
    const input = { industry: this.industry(), city: this.city() };
    this.saveAndNavigate(output, summary, input);
  }

  private runGeoSiteAuditWorkflow(): void {
    const labels = this.PROGRESS_LABELS_GEO;
    this.progressLabel.set(labels[0]);

    const startTime = Date.now();
    const minDuration = 3500;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / minDuration) * 80), 80);
      this.progress.set(pct);
      if (pct >= 60) this.progressLabel.set(labels[4]);
      else if (pct >= 40) this.progressLabel.set(labels[3]);
      else if (pct >= 20) this.progressLabel.set(labels[2]);
      else if (pct >= 5) this.progressLabel.set(labels[1]);
    }, 80);

    const selectedMaxPages = this.getSelectedMaxPagesOption();
    const body = {
      Domain: this.domain().trim(),
      'Max. Seiten': selectedMaxPages.label,
      maxPages: selectedMaxPages.value,
      maxPagesLabel: selectedMaxPages.label,
      maxPagesLimit: selectedMaxPages.limit,
      pageLimit: selectedMaxPages.limit,
      crawlAllPages: selectedMaxPages.limit === null,
    };

    this.http.post(GEO_SITE_AUDIT_WEBHOOK, body, { responseType: 'text' }).subscribe({
      next: (response: string) => {
        clearInterval(interval);
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDuration - elapsed);

        setTimeout(() => {
          this.progress.set(100);
          this.progressLabel.set(labels[5]);
          setTimeout(() => this.completeGeoSiteAudit(response), 400);
        }, remaining);
      },
      error: () => {
        clearInterval(interval);
        this.webhookError.set(true);
        this.progress.set(100);
        this.progressLabel.set('Fehler beim Abrufen der Audit-Daten');
        setTimeout(() => {
          this.isSubmitting.set(false);
        }, 800);
      },
    });
  }

  private completeGeoSiteAudit(rawResponse: string): void {
    const parsed = this.extractGeoSiteAuditResponse(rawResponse);
    if (!parsed) {
      this.webhookError.set(true);
      this.progressLabel.set('Leere oder ungueltige Audit-Antwort');
      setTimeout(() => {
        this.isSubmitting.set(false);
      }, 800);
      return;
    }

    const normalizedUrl = parsed.summary.domain || this.toAbsoluteUrl(this.domain());
    const domainLabel = this.toDomainLabel(parsed.summary.domain || this.domain());
    const selectedMaxPages = this.getSelectedMaxPagesOption();
    const output: GeoAuditOutput = parsed;

    const pageInfo = parsed.summary.totalProcessed ? ` (${parsed.summary.totalProcessed} Seiten)` : '';
    const summary = `Geo Audit: ${domainLabel}${pageInfo}`;
    const input: RunInputData = {
      domain: this.domain().trim(),
      maxPages: selectedMaxPages.label,
      websiteUrl: normalizedUrl,
    };

    this.saveAndNavigate(output, summary, input);
  }

  private extractGeoSiteAuditResponse(raw: string): GeoAuditOutput | null {
    const trimmed = raw.trim();
    const parsed = this.tryParseJson(trimmed);
    const candidate = Array.isArray(parsed) ? parsed[0] : parsed;

    return this.normalizeGeoSiteAuditPayload(candidate);
  }

  private tryParseJson(value: string): unknown | null {
    if (!value.startsWith('{') && !value.startsWith('[')) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private normalizeGeoSiteAuditPayload(value: unknown): GeoAuditOutput | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const topPages = this.normalizeGeoAuditPages(record['topPages']);
    const worstPages = this.normalizeGeoAuditPages(record['worstPages']);
    const summary = this.normalizeGeoAuditSummary(record['summary'], topPages, worstPages);
    const botStatus = this.normalizeGeoAuditBotStatus(record['botStatus']);
    const totals = this.normalizeGeoAuditTotals(record['totals'], summary);
    const distribution = this.normalizeGeoAuditDistribution(record['distribution']);
    const topIssues = this.normalizeGeoAuditIssues(record['topIssues']);
    const errors = this.normalizeGeoAuditErrors(record['errors']);

    if (!summary || !botStatus || !totals || !distribution || !topIssues || !topPages || !worstPages || !errors) {
      return null;
    }

    return {
      type: 'geo-audit',
      summary,
      botStatus,
      totals,
      distribution,
      topIssues,
      topPages,
      worstPages,
      errors,
    };
  }

  private normalizeGeoAuditSummary(
    value: unknown,
    topPages: GeoAuditPage[] | null,
    worstPages: GeoAuditPage[] | null,
  ): GeoAuditSummary | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const domain = this.toNonEmptyString(record['domain']);
    const totalFound = this.toNumber(record['totalFound']);
    const totalProcessed = this.toNumber(record['totalProcessed']);
    const averageScore = this.toNumber(record['averageScore']);

    if (!domain || totalFound === null || totalProcessed === null || averageScore === null) {
      return null;
    }

    return {
      domain,
      totalFound,
      totalProcessed,
      averageScore,
      bestPage: this.normalizeGeoAuditPageRef(record['bestPage']) ?? this.toGeoAuditPageRef(topPages?.[0]),
      worstPage: this.normalizeGeoAuditPageRef(record['worstPage']) ?? this.toGeoAuditPageRef(worstPages?.[0]),
    };
  }

  private normalizeGeoAuditPageRef(value: unknown): GeoAuditPageRef | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const path = this.toNonEmptyString(record['path']);
    const score = this.toNumber(record['score']);

    if (!path || score === null) {
      return null;
    }

    return {
      path,
      score,
      title: this.toOptionalString(record['title']),
    };
  }

  private toGeoAuditPageRef(page?: GeoAuditPage): GeoAuditPageRef | null {
    if (!page) return null;

    return {
      path: page.path,
      score: page.score,
      title: page.title,
    };
  }

  private normalizeGeoAuditBotStatus(value: unknown): GeoAuditBotStatus | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const cloudflareDetected = this.toBoolean(record['cloudflareDetected']);
    const cloudflareBlocksAll = this.toBoolean(record['cloudflareBlocksAll']);
    const explicitFirewallBlocked = this.toBoolean(record['firewallBlocked']);
    const aiBotStatus = this.toNumber(record['aiBotStatus']);
    const firewallBlocked = explicitFirewallBlocked ?? cloudflareBlocksAll ?? false;

    return {
      firewallBlocked,
      cloudflareDetected: cloudflareDetected ?? undefined,
      cloudflareBlocksAll: cloudflareBlocksAll ?? undefined,
      aiBotStatus,
    };
  }

  private normalizeGeoAuditTotals(value: unknown, summary: GeoAuditSummary | null): GeoAuditTotals | null {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !summary) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const totalFound = this.toNumber(record['totalFound']) ?? summary.totalFound;
    const totalProcessed = this.toNumber(record['totalProcessed']) ?? summary.totalProcessed;
    const averageScore = this.toNumber(record['averageScore']) ?? summary.averageScore;

    return {
      totalFound,
      totalProcessed,
      averageScore,
    };
  }

  private normalizeGeoAuditDistribution(value: unknown): GeoAuditDistribution | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;

    return {
      green: this.toNumber(record['green']) ?? 0,
      yellow: this.toNumber(record['yellow']) ?? 0,
      orange: this.toNumber(record['orange']) ?? 0,
      red: this.toNumber(record['red']) ?? 0,
    };
  }

  private normalizeGeoAuditIssues(value: unknown): GeoAuditIssue[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    return value
      .map((item) => this.normalizeGeoAuditIssue(item))
      .filter((item): item is GeoAuditIssue => !!item);
  }

  private normalizeGeoAuditIssue(value: unknown): GeoAuditIssue | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const issue = this.toNonEmptyString(record['issue']);
    const count = this.toNumber(record['count']);
    const percent = this.toNumber(record['percent']);

    if (!issue || count === null || percent === null) {
      return null;
    }

    return { issue, count, percent };
  }

  private normalizeGeoAuditPages(value: unknown): GeoAuditPage[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    return value
      .map((item) => this.normalizeGeoAuditPage(item))
      .filter((item): item is GeoAuditPage => !!item);
  }

  private normalizeGeoAuditPage(value: unknown): GeoAuditPage | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const path = this.toNonEmptyString(record['path']);
    const score = this.toNumber(record['score']);
    const failed = this.toStringList(record['failed']);
    const failedCount = this.toNumber(record['failedCount']) ?? failed.length;

    if (!path || score === null) {
      return null;
    }

    return {
      path,
      score,
      title: this.toOptionalString(record['title']),
      failedCount,
      failed,
    };
  }

  private normalizeGeoAuditErrors(value: unknown): GeoAuditError[] | null {
    if (!Array.isArray(value)) {
      return null;
    }

    return value
      .map((item) => this.normalizeGeoAuditError(item))
      .filter((item): item is GeoAuditError => !!item);
  }

  private normalizeGeoAuditError(value: unknown): GeoAuditError | null {
    if (typeof value === 'string') {
      const errorMsg = value.trim();
      return errorMsg ? { errorMsg } : null;
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const errorMsg = this.toNonEmptyString(record['errorMsg'])
      ?? this.toNonEmptyString(record['message'])
      ?? this.toNonEmptyString(record['error']);

    if (!errorMsg) {
      return null;
    }

    return {
      errorMsg,
      pageUrl: this.toOptionalString(record['pageUrl']),
    };
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      if (value === 'true') return true;
      if (value === 'false') return false;
    }

    return null;
  }

  private toOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private toNonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private toStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => !!item);
  }

  private toStringArrayOrJson(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter((item) => !!item);
    }

    if (typeof value !== 'string') {
      return [];
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed)
        ? parsed
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter((item) => !!item)
        : [trimmed];
    } catch {
      return [trimmed];
    }
  }

  private toIntentKeywordList(value: unknown): ContentStrategyOutput['longTailKeywords'] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => {
        const record = entry as Record<string, unknown>;
        const keyword = typeof record['keyword'] === 'string' ? record['keyword'].trim() : '';
        const intent = typeof record['intent'] === 'string' ? record['intent'].trim().toLowerCase() : 'unknown';

        if (!keyword) {
          return null;
        }

        return {
          keyword,
          intent,
        };
      })
      .filter((entry): entry is ContentStrategyOutput['longTailKeywords'][number] => entry !== null);
  }

  private toAbsoluteUrl(value: string): string | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  private toDomainLabel(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return 'Domain';
    return trimmed.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }

  setMaxPages(value: string): void {
    if (value === '25' || value === '50' || value === '100' || value === 'all') {
      this.maxPages.set(value);
      return;
    }

    this.maxPages.set('all');
  }

  private getSelectedMaxPagesOption(): { value: MaxPagesValue; label: string; limit: number | null } {
    return this.maxPageOptions.find((option) => option.value === this.maxPages())
      ?? this.maxPageOptions[this.maxPageOptions.length - 1];
  }

  private runSocialMediaWizardWorkflow(): void {
    const labels = [
      'Initialisiere Agent…',
      'Analysiere Brand Voice…',
      'Generiere Plattform-Content…',
      'Überprüfe und verfeinere…',
      'Finalisiere Inhalte…',
      'Social-Media-Paket fertig ✓',
    ];
    this.progressLabel.set(labels[0]);

    const startTime = Date.now();
    const minDuration = 4000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / minDuration) * 80), 80);
      this.progress.set(pct);
      if (pct >= 60) this.progressLabel.set(labels[4]);
      else if (pct >= 40) this.progressLabel.set(labels[3]);
      else if (pct >= 20) this.progressLabel.set(labels[2]);
      else if (pct >= 5)  this.progressLabel.set(labels[1]);
    }, 80);

    const body = {
      topic: this.socialTopic(),
      brand_voice: this.brandVoice(),
      target_audience: this.targetAudience(),
    };

    this.http.post(SOCIAL_MEDIA_WIZARD_WEBHOOK, body, { responseType: 'text' }).subscribe({
      next: (response: string) => {
        clearInterval(interval);
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDuration - elapsed);
        setTimeout(() => {
          this.progress.set(100);
          this.progressLabel.set(labels[5]);
          setTimeout(() => this.completeSocialMediaWizard(response), 400);
        }, remaining);
      },
      error: () => {
        clearInterval(interval);
        this.webhookError.set(true);
        this.progress.set(100);
        this.progressLabel.set('Fehler beim Generieren des Contents');
        setTimeout(() => this.isSubmitting.set(false), 800);
      },
    });
  }

  private completeSocialMediaWizard(rawResponse: string): void {
    let parsed: Record<string, string> = {};
    try {
      const candidate = JSON.parse(rawResponse);
      const obj = Array.isArray(candidate) ? candidate[0] : candidate;
      if (obj && typeof obj === 'object') {
        parsed = obj as Record<string, string>;
      }
    } catch {
      // proceed with empty parsed
    }

    const output: SocialMediaOutput = {
      type: 'social-media',
      topic: this.socialTopic(),
      brandVoice: this.brandVoice(),
      targetAudience: this.targetAudience(),
      twitter: parsed['twitter'] ?? '',
      linkedin: parsed['linkedin'] ?? '',
      redditTitle: parsed['reddit_title'] ?? '',
      redditBody: parsed['reddit_body'] ?? '',
      instagramCaption: parsed['instagram_caption'] ?? '',
    };

    const input: RunInputData = {
      topic: this.socialTopic(),
      brandVoice: this.brandVoice(),
      targetAudience: this.targetAudience(),
    };

    this.saveAndNavigate(output, `Social Media: ${this.socialTopic()}`, input);
  }

  private runContentStrategyWorkflow(): void {
    const labels = [
      'Initialisiere Agent…',
      'Verbinde mit Keyword-Datenbank…',
      'Analysiere Suchvolumen und Difficulty…',
      'Recherchiere Wettbewerber-URLs…',
      'Erstelle Content-Strategie…',
      'Content-Plan fertig ✓',
    ];
    this.progressLabel.set(labels[0]);

    const startTime = Date.now();
    const minDuration = 4000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / minDuration) * 80), 80);
      this.progress.set(pct);
      if (pct >= 60) this.progressLabel.set(labels[4]);
      else if (pct >= 40) this.progressLabel.set(labels[3]);
      else if (pct >= 20) this.progressLabel.set(labels[2]);
      else if (pct >= 5)  this.progressLabel.set(labels[1]);
    }, 80);

    const rawUrls = this.competitorUrlsInput().trim();
    const competitorUrls = rawUrls
      ? rawUrls.split('\n').map((u) => u.trim()).filter((u) => !!u)
      : [];

    const body = {
      primary_topic: this.primaryTopic(),
      target_audience: this.contentStrategyTargetAudience(),
      content_type: this.contentType(),
      competitor_urls: competitorUrls,
    };

    this.http.post(CONTENT_STRATEGY_WEBHOOK, body, { responseType: 'text' }).subscribe({
      next: (response: string) => {
        clearInterval(interval);
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minDuration - elapsed);
        setTimeout(() => {
          this.progress.set(100);
          this.progressLabel.set(labels[5]);
          setTimeout(() => this.completeContentStrategy(response), 400);
        }, remaining);
      },
      error: () => {
        clearInterval(interval);
        this.webhookError.set(true);
        this.progress.set(100);
        this.progressLabel.set('Fehler beim Abrufen der Daten');
        setTimeout(() => this.isSubmitting.set(false), 800);
      },
    });
  }

  private completeContentStrategy(rawResponse: string): void {
    let brief = '';
    let structuredAnalysis = '';
    let primaryTopic = this.primaryTopic();
    let targetAudience = this.contentStrategyTargetAudience();
    let contentType = this.contentType();
    let primaryKeywords: string[] = [];
    let longTailKeywords: ContentStrategyOutput['longTailKeywords'] = [];
    let questionBasedKeywords: string[] = [];
    let relatedTopics: string[] = [];
    let competitorUrls: string[] = [];
    const keywords: KeywordDataRow[] = [];

    try {
      const parsed = JSON.parse(rawResponse);
      const arr: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
      const first = arr[0] as Record<string, unknown> | undefined;
      const second = arr[1] as Record<string, unknown> | undefined;

      // DETECT FORMAT:
      // Format A (Old): [{ output: "brief" }, { output: "analysis", data: [...], primary_keywords: [...] }]
      // Format B: [{ output: { primary_keywords: [...] }, data: [...] }]
      // Format C (New): [{ ai_result: "brief", output: { primary_keywords: [...] }, data: [...], primary_topic: "...", target_audience: "...", content_type: "...", competitor_urls: "[...]" }]

      const isFormatC = typeof first?.['ai_result'] === 'string';
      const isFormatA = typeof first?.['output'] === 'string' && arr.length >= 2;
      const isFormatB = !isFormatC && !isFormatA && typeof first?.['output'] === 'object';

      if (isFormatC) {
        // FORMAT C: New unified format
        brief = first['ai_result'] as string;
        const outputObj = first?.['output'] as Record<string, unknown> | undefined;
        if (typeof outputObj === 'object' && outputObj !== null) {
          primaryKeywords = this.toStringArrayOrJson(outputObj['primary_keywords']);
          longTailKeywords = this.toIntentKeywordList(outputObj['long_tail_keywords']);
          questionBasedKeywords = this.toStringArrayOrJson(outputObj['question_based_keywords']);
          relatedTopics = this.toStringArrayOrJson(outputObj['related_topics']);
        }
        
        const rawPrimaryTopic = this.toNonEmptyString(first['primary_topic']);
        if (rawPrimaryTopic) primaryTopic = rawPrimaryTopic;
        
        const rawTargetAudience = this.toNonEmptyString(first['target_audience']);
        if (rawTargetAudience) targetAudience = rawTargetAudience;
        
        const rawContentType = this.toNonEmptyString(first['content_type']);
        if (rawContentType) contentType = rawContentType;
        
        competitorUrls = this.toStringArrayOrJson(first['competitor_urls']);
      } else if (isFormatA) {
        // FORMAT A: Old two-item format
        brief = first['output'] as string;
        if (typeof second?.['output'] === 'string') {
          structuredAnalysis = second['output'] as string;
        }
        primaryKeywords = this.toStringArrayOrJson(second?.['primary_keywords']);
        longTailKeywords = this.toIntentKeywordList(second?.['long_tail_keywords']);
        questionBasedKeywords = this.toStringArrayOrJson(second?.['question_based_keywords']);
        relatedTopics = this.toStringArrayOrJson(second?.['related_topics']);
        
        const rawPrimaryTopic = this.toNonEmptyString(second?.['primary_topic']);
        if (rawPrimaryTopic) primaryTopic = rawPrimaryTopic;
        
        const rawTargetAudience = this.toNonEmptyString(second?.['target_audience']);
        if (rawTargetAudience) targetAudience = rawTargetAudience;
        
        const rawContentType = this.toNonEmptyString(second?.['content_type']);
        if (rawContentType) contentType = rawContentType;
        
        competitorUrls = this.toStringArrayOrJson(second?.['competitor_urls']);
      } else if (isFormatB) {
        // FORMAT B: Single item with structured output
        const outputObj = first?.['output'] as Record<string, unknown> | undefined;
        if (typeof outputObj === 'object' && outputObj !== null) {
          primaryKeywords = this.toStringArrayOrJson(outputObj['primary_keywords']);
          longTailKeywords = this.toIntentKeywordList(outputObj['long_tail_keywords']);
          questionBasedKeywords = this.toStringArrayOrJson(outputObj['question_based_keywords']);
          relatedTopics = this.toStringArrayOrJson(outputObj['related_topics']);
        }
      }

      // Process data array (common to all formats)
      const targetItem = isFormatA ? second : first;
      const dataArr = targetItem?.['data'] as unknown[] | undefined;
      if (Array.isArray(dataArr)) {
        for (const dataItem of dataArr) {
          const task = ((dataItem as Record<string, unknown>)?.['tasks'] as unknown[] | undefined)?.[0];
          const result = ((task as Record<string, unknown>)?.['result'] as unknown[] | undefined)?.[0] as Record<string, unknown> | undefined;
          if (!result) continue;

          const kwDiff = ((result['items'] as unknown[] | undefined)?.[0] as Record<string, unknown> | undefined)?.['keyword_difficulty'];
          const rawMonthly = result['monthly_searches'] as unknown[] | undefined;

          const monthlySearches: MonthlySearch[] = Array.isArray(rawMonthly)
            ? rawMonthly
                .map((m) => {
                  const e = m as Record<string, unknown>;
                  return { year: e['year'] as number, month: e['month'] as number, searchVolume: (e['search_volume'] as number) ?? 0 };
                })
                .filter((m) => typeof m.month === 'number')
            : [];

          const kw = typeof result['keyword'] === 'string' ? result['keyword'] : '';
          if (!kw) continue;

          keywords.push({
            keyword: kw,
            searchVolume: typeof result['search_volume'] === 'number' ? result['search_volume'] : null,
            keywordDifficulty: typeof kwDiff === 'number' ? kwDiff : null,
            competition: typeof result['competition'] === 'string' ? result['competition'] : null,
            competitionIndex: typeof result['competition_index'] === 'number' ? result['competition_index'] : null,
            cpc: typeof result['cpc'] === 'number' ? result['cpc'] : null,
            monthlySearches,
          });
        }
      }
    } catch {
      // proceed with defaults
    }

    const output: ContentStrategyOutput = {
      type: 'content-strategy',
      primaryTopic,
      targetAudience,
      contentType,
      brief,
      structuredAnalysis,
      primaryKeywords,
      longTailKeywords,
      questionBasedKeywords,
      relatedTopics,
      competitorUrls,
      keywords,
    };

    const input: RunInputData = {
      primaryTopic,
      targetAudience,
      contentType,
    };

    this.saveAndNavigate(output, `Content-Strategie: ${primaryTopic}`, input);
  }

  private runGenericWorkflow(): void {
    const labels = this.PROGRESS_LABELS;
    this.progressLabel.set(labels[0]);

    const totalMs = 3000;
    const intervalMs = 80;
    const steps = totalMs / intervalMs;
    let current = 0;

    const interval = setInterval(() => {
      current++;
      const pct = Math.min(Math.round((current / steps) * 100), 100);
      this.progress.set(pct);

      if (pct >= 90) this.progressLabel.set(labels[5]);
      else if (pct >= 70) this.progressLabel.set(labels[4]);
      else if (pct >= 50) this.progressLabel.set(labels[3]);
      else if (pct >= 30) this.progressLabel.set(labels[2]);
      else if (pct >= 10) this.progressLabel.set(labels[1]);

      if (pct >= 100) {
        clearInterval(interval);
        this.finishGenericWorkflow();
      }
    }, intervalMs);
  }

  private finishGenericWorkflow(): void {
    const input: RunInputData = {
      targetAudience: this.targetAudience(),
      websiteUrl: this.websiteUrl(),
      toneOfVoice: this.toneOfVoice(),
    };

    const output = this.agentOutput.generateOutput(this.agentId, input);

    let summary = '';
    switch (output.type) {
      case 'email':         summary = output.subject; break;
      case 'linkedin-post': summary = output.headline; break;
      case 'video-script':  summary = output.title; break;
      case 'lead-table':    summary = `${output.totalFound} Leads gefunden`; break;
      case 'keyword-table': summary = `Top-Chance: ${output.topOpportunity}`; break;
      case 'sync-report':   summary = `${output.synced}/${output.totalRecords} Records sync`; break;
      case 'geo-audit':          summary = `Geo Audit: ${this.toDomainLabel(output.summary.domain)}`; break;
      case 'markdown':           summary = output.companyName ?? 'Bericht'; break;
      case 'company-list':       summary = `${output.companies.length} Unternehmen gefunden`; break;
      case 'content-strategy':   summary = `Content-Strategie: ${output.primaryTopic}`; break;
    }

    this.saveAndNavigate(output, summary, input);
  }

  private saveAndNavigate(
    output: AgentOutput,
    summary: string,
    input?: RunInputData,
  ): void {
    const resolvedInput = input ?? {
      companyName: this.companyName(),
      websiteUrl: this.websiteUrl(),
    };

    const record: RunRecord = {
      id: `run-${Date.now()}`,
      agentId: this.agentId,
      agentName: this.agentMeta?.name ?? this.agentId,
      agentIcon: this.agentMeta?.icon ?? 'smart_toy',
      agentCategory: (this.agentMeta?.category ?? 'Sales') as RunRecord['agentCategory'],
      timestamp: Date.now(),
      inputData: resolvedInput,
      outputSummary: summary,
      fullOutput: output,
      tokenCount: Math.floor(Math.random() * 800) + 400,
    };

    this.runHistory.addRun(record);

    this.notifService.addNotification({
      agentId: this.agentId,
      agentName: this.agentMeta?.name ?? this.agentId,
      agentIcon: this.agentMeta?.icon ?? 'smart_toy',
      message: `${this.agentMeta?.name ?? 'Agent'} hat deinen Workflow abgeschlossen. Ergebnis bereit!`,
      time: 'Gerade eben',
      read: false,
      link: `/agents/${this.agentId}/result`,
    });

    setTimeout(() => {
      this.isSubmitting.set(false);
      this.router.navigate(['/agents', this.agentId, 'result']);
    }, 400);
  }
}
