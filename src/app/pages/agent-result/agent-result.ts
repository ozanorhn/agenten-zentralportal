import { DecimalPipe } from '@angular/common';
import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RunHistoryService } from '../../services/run-history.service';
import { AgentOutputService } from '../../services/agent-output.service';
import { ToastService } from '../../services/toast.service';
import {
  BlogEditorOutput,
  RunRecord,
  EmailOutput,
  GeoAuditBotStatus,
  GeoAuditOutput,
  GeoAuditPage,
  LinkedInPostOutput,
  VideoScriptOutput,
  LeadTableOutput,
  KeywordTableOutput,
  SyncReportOutput,
  MarkdownOutput,
  CompanyListOutput,
  SocialMediaOutput,
  ContentStrategyOutput,
  KeywordDataRow,
  ProductTextOutput,
} from '../../models/interfaces';
import { AGENTS_MAP } from '../../data/agents.data';
import { renderMarkdownToHtml } from '../../utils/markdown.utils';

interface GeoAuditDistributionItem {
  label: string;
  range: string;
  count: number;
  tone: 'green' | 'yellow' | 'orange' | 'red';
}

interface GeoAuditRecommendation {
  title: string;
  body: string;
  icon: string;
  tone: 'critical' | 'warning' | 'info';
}

interface ContentStrategyIntentGroup {
  key: string;
  label: string;
  icon: string;
  description: string;
  accentClass: string;
  items: ContentStrategyOutput['longTailKeywords'];
}

@Component({
  selector: 'app-agent-result',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './agent-result.html',
  styleUrl: './agent-result.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AgentResult {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly runHistory = inject(RunHistoryService);
  private readonly agentOutputService = inject(AgentOutputService);
  private readonly toastService = inject(ToastService);

  readonly agentId = this.route.snapshot.params['id'] as string;
  readonly agentMeta = AGENTS_MAP[this.agentId];
  readonly isGeoSiteAudit = this.agentId === 'geo-site-audit';

  private readonly _run = signal<RunRecord | null>(this.resolveRun());

  readonly run = this._run.asReadonly();

  readonly output = computed(() => this._run()?.fullOutput ?? null);
  readonly emailOutput = computed(() =>
    this.output()?.type === 'email' ? this.output() as EmailOutput : null
  );
  readonly linkedInOutput = computed(() =>
    this.output()?.type === 'linkedin-post' ? this.output() as LinkedInPostOutput : null
  );
  readonly videoOutput = computed(() =>
    this.output()?.type === 'video-script' ? this.output() as VideoScriptOutput : null
  );
  readonly leadOutput = computed(() =>
    this.output()?.type === 'lead-table' ? this.output() as LeadTableOutput : null
  );
  readonly keywordOutput = computed(() =>
    this.output()?.type === 'keyword-table' ? this.output() as KeywordTableOutput : null
  );
  readonly syncOutput = computed(() =>
    this.output()?.type === 'sync-report' ? this.output() as SyncReportOutput : null
  );
  readonly geoAuditOutput = computed(() =>
    this.output()?.type === 'geo-audit' ? this.output() as GeoAuditOutput : null
  );
  readonly markdownOutput = computed(() =>
    this.output()?.type === 'markdown' ? this.output() as MarkdownOutput : null
  );
  readonly companyListOutput = computed(() =>
    this.output()?.type === 'company-list' ? this.output() as CompanyListOutput : null
  );
  readonly socialMediaOutput = computed(() =>
    this.output()?.type === 'social-media' ? this.output() as SocialMediaOutput : null
  );
  readonly contentStrategyOutput = computed(() =>
    this.output()?.type === 'content-strategy' ? this.output() as ContentStrategyOutput : null
  );
  readonly blogEditorOutput = computed(() =>
    this.output()?.type === 'blog-editor' ? this.output() as BlogEditorOutput : null
  );
  readonly productTextOutput = computed(() =>
    this.output()?.type === 'product-text' ? this.output() as ProductTextOutput : null
  );
  readonly renderedContentStrategyBrief = computed((): SafeHtml | null => {
    const brief = this.contentStrategyOutput()?.brief;
    if (!brief) return null;
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdownToHtml(brief));
  });
  readonly renderedContentStrategyAnalysis = computed((): SafeHtml | null => {
    const analysis = this.contentStrategyOutput()?.structuredAnalysis;
    if (!analysis) return null;
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdownToHtml(analysis));
  });
  readonly contentStrategyIntentGroups = computed<ContentStrategyIntentGroup[]>(() =>
    this.buildContentStrategyIntentGroups(this.contentStrategyOutput()?.longTailKeywords ?? [])
  );
  readonly contentStrategyTopKeyword = computed(() => {
    const keywords = [...(this.contentStrategyOutput()?.keywords ?? [])]
      .filter((keyword) => keyword.searchVolume !== null)
      .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0));

    return keywords[0] ?? null;
  });
  readonly contentStrategyLowestDifficultyKeyword = computed(() => {
    const keywords = [...(this.contentStrategyOutput()?.keywords ?? [])]
      .filter((keyword) => keyword.keywordDifficulty !== null)
      .sort((a, b) => {
        if ((a.keywordDifficulty ?? 0) !== (b.keywordDifficulty ?? 0)) {
          return (a.keywordDifficulty ?? 0) - (b.keywordDifficulty ?? 0);
        }

        return (b.searchVolume ?? 0) - (a.searchVolume ?? 0);
      });

    return keywords[0] ?? null;
  });
  readonly contentStrategyHighestCpcKeyword = computed(() => {
    const keywords = [...(this.contentStrategyOutput()?.keywords ?? [])]
      .filter((keyword) => keyword.cpc !== null)
      .sort((a, b) => (b.cpc ?? 0) - (a.cpc ?? 0));

    return keywords[0] ?? null;
  });
  readonly geoDistributionItems = computed<GeoAuditDistributionItem[]>(() => {
    const distribution = this.geoAuditOutput()?.distribution;
    if (!distribution) return [];

    return [
      { label: 'Stark', range: '80-100', count: distribution.green, tone: 'green' },
      { label: 'Solide', range: '60-79', count: distribution.yellow, tone: 'yellow' },
      { label: 'Schwach', range: '40-59', count: distribution.orange, tone: 'orange' },
      { label: 'Kritisch', range: '0-39', count: distribution.red, tone: 'red' },
    ];
  });
  readonly geoTopIssuesPreview = computed(() => this.geoAuditOutput()?.topIssues.slice(0, 6) ?? []);
  readonly geoTopPagesPreview = computed(() => this.geoAuditOutput()?.topPages.slice(0, 5) ?? []);
  readonly geoWeakestPages = computed(() => this.geoAuditOutput()?.worstPages.slice(0, 10) ?? []);
  readonly geoBestPage = computed(() => this.resolveGeoSnapshotPage('best'));
  readonly geoWorstPage = computed(() => this.resolveGeoSnapshotPage('worst'));
  readonly geoRecommendations = computed(() => this.buildGeoAuditRecommendations(this.geoAuditOutput()));

  readonly renderedMarkdown = computed((): SafeHtml | null => {
    const md = this.markdownOutput();
    if (!md?.content) return null;
    if (this.isGeoSiteAudit) {
      const escaped = this.escapeHtml(md.content);
      return this.sanitizer.bypassSecurityTrustHtml(`<pre class="geo-audit-report">${escaped}</pre>`);
    }
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdownToHtml(md.content));
  });
  readonly renderedBlogReport = computed((): SafeHtml | null => {
    const report = this.blogEditorOutput()?.report;
    if (!report) return null;
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdownToHtml(report));
  });
  readonly renderedBlogArticle = computed((): SafeHtml | null => {
    const article = this.blogEditorOutput()?.article;
    if (!article) return null;
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdownToHtml(article));
  });
  readonly renderedBlogOutline = computed((): SafeHtml | null => {
    const outline = this.blogEditorOutput()?.outline;
    if (!outline) return null;
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdownToHtml(outline));
  });

  readonly markdownTitle = computed(() =>
    this.isGeoSiteAudit ? 'GEO Site Audit' : 'Sales Briefing'
  );

  private resolveRun(): RunRecord | null {
    const existing = this.runHistory.getLatestForAgent(this.agentId);
    if (existing) return existing;
    const output = this.agentOutputService.generateOutput(this.agentId, {});
    const summary = this.buildSummary(output);
    const fallback: RunRecord = {
      id: `fallback-${this.agentId}`,
      agentId: this.agentId,
      agentName: this.agentMeta?.name ?? this.agentId,
      agentIcon: this.agentMeta?.icon ?? 'smart_toy',
      agentCategory: (this.agentMeta?.category ?? 'Sales') as RunRecord['agentCategory'],
      timestamp: Date.now(),
      inputData: {},
      outputSummary: summary,
      fullOutput: output,
      tokenCount: Math.floor(Math.random() * 800) + 400,
    };
    return fallback;
  }

  private buildSummary(output: ReturnType<AgentOutputService['generateOutput']>): string {
    switch (output.type) {
      case 'email': return output.subject;
      case 'linkedin-post': return output.headline;
      case 'video-script': return output.title;
      case 'lead-table': return `${output.totalFound} Leads gefunden, ${output.highScoreCount} Hot Leads`;
      case 'keyword-table': return `Top-Chance: ${output.topOpportunity}`;
      case 'sync-report': return `${output.synced} von ${output.totalRecords} Records synchronisiert`;
      case 'geo-audit': return this.buildGeoAuditSummary(output);
      case 'markdown':
        if (this.isGeoSiteAudit) {
          return output.websiteUrl ? `Geo Audit: ${this.toDisplayUrl(output.websiteUrl)}` : 'Geo Site Audit';
        }
        return output.companyName ? `Sales Briefing: ${output.companyName}` : 'Sales Briefing';
      case 'company-list': return `${output.companies.length} Unternehmen in ${output.city}`;
      case 'social-media': return `Social Media: ${output.topic}`;
      case 'content-strategy': return `Content-Strategie: ${output.primaryTopic}`;
      case 'blog-editor': return output.articleTitle ?? `Blog-Artikel: ${output.topic}`;
      case 'product-text': return output.generatedFile?.fileName ?? 'Produkttext';
    }
  }

  copySocialPlatform(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.show(`${label} kopiert!`, 'success');
    }).catch(() => {
      this.toastService.show('Kopieren fehlgeschlagen.', 'error');
    });
  }

  copyOutput(): void {
    const text = this.buildTextVersion();
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.show('In Zwischenablage kopiert!', 'success');
    }).catch(() => {
      this.toastService.show('Kopieren fehlgeschlagen.', 'error');
    });
  }

  downloadOutput(): void {
    const out = this.output();
    const isMarkdown = out?.type === 'markdown';
    const isGeoAudit = out?.type === 'geo-audit';
    const text = isGeoAudit ? JSON.stringify(out, null, 2) : this.buildTextVersion();
    const mimeType = isGeoAudit
      ? 'application/json;charset=utf-8'
      : isMarkdown
        ? 'text/markdown;charset=utf-8'
        : 'text/plain;charset=utf-8';
    const ext = isGeoAudit ? 'json' : isMarkdown ? 'md' : 'txt';
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.agentId}-output-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    this.toastService.show('Datei wird heruntergeladen…', 'info');
  }

  goBack(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 65) return 'text-amber-400';
    return 'text-red-400';
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Hot': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'Warm': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default: return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
    }
  }

  getOpportunityColor(opp: string): string {
    switch (opp) {
      case 'Hoch': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Mittel': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default: return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
    }
  }

  getSyncStatusColor(status: string): string {
    switch (status) {
      case 'success': return 'text-emerald-400';
      case 'error': return 'text-red-400';
      default: return 'text-amber-400';
    }
  }

  getSyncStatusIcon(status: string): string {
    switch (status) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      default: return 'pending';
    }
  }

  formatMarkdownSubject(md: MarkdownOutput): string | null {
    if (this.isGeoSiteAudit) {
      return md.websiteUrl ? this.toDisplayUrl(md.websiteUrl) : null;
    }

    return md.companyName ?? null;
  }

  formatAuditDomain(value: string): string {
    return this.toDisplayUrl(value);
  }

  resolveAuditPageUrl(domain: string, path: string): string | null {
    if (!domain || !path) return null;

    try {
      return new URL(path, domain).toString();
    } catch {
      return null;
    }
  }

  getGeoStatusLabel(botStatus: GeoAuditBotStatus): string {
    if (botStatus.cloudflareBlocksAll) return 'Komplett blockiert';
    if (botStatus.firewallBlocked) return 'KI-Bots blockiert';
    return 'KI-Bots erreichbar';
  }

  getGeoStatusDescription(botStatus: GeoAuditBotStatus): string {
    if (botStatus.cloudflareBlocksAll) {
      return 'Cloudflare blockiert aktuell Browser und Bot-Traffic. Der Audit ist nur eingeschraenkt verwertbar.';
    }

    if (botStatus.firewallBlocked) {
      return 'GPTBot und aehnliche Crawler laufen in Firewall- oder WAF-Regeln. Diese Freigabe ist der wichtigste erste Hebel.';
    }

    return 'Die Domain antwortet auch fuer KI-Crawler sauber. Fokus kann direkt auf Inhalts- und Strukturthemen gehen.';
  }

  getGeoStatusBadgeClass(botStatus: GeoAuditBotStatus): string {
    if (botStatus.cloudflareBlocksAll) {
      return 'bg-red-500/15 text-red-300 border-red-500/30';
    }

    if (botStatus.firewallBlocked) {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }

    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  }

  getGeoScoreBadgeClass(score: number): string {
    if (score >= 85) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (score >= 70) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    return 'bg-red-500/15 text-red-300 border-red-500/30';
  }

  getGeoToneFillClass(tone: GeoAuditDistributionItem['tone']): string {
    switch (tone) {
      case 'green': return 'bg-emerald-500';
      case 'yellow': return 'bg-amber-500';
      case 'orange': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  }

  getGeoRecommendationClass(tone: GeoAuditRecommendation['tone']): string {
    switch (tone) {
      case 'critical':
        return 'border-red-500/30 bg-red-500/10';
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/10';
      default:
        return 'border-[#0070FF]/30 bg-[#0070FF]/10';
    }
  }

  getBlogScoreBadgeClass(score: number | null): string {
    if (score === null) return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
    if (score >= 85) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (score >= 70) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    return 'bg-red-500/15 text-red-300 border-red-500/30';
  }

  getBlogVerdictBadgeClass(verdict?: string): string {
    const normalized = verdict?.toLowerCase() ?? '';
    if (normalized.includes('freigegeben') || normalized.includes('stark')) {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }

    if (normalized.includes('korrektur') || normalized.includes('ueberarbeiten')) {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }

    if (normalized.includes('kritisch') || normalized.includes('ablehnen')) {
      return 'bg-red-500/15 text-red-300 border-red-500/30';
    }

    return 'bg-[#0070FF]/15 text-[#7DB4FF] border-[#0070FF]/30';
  }

  formatSerpHost(url: string): string {
    return this.toDisplayUrl(url);
  }

  private buildTextVersion(): string {
    const out = this.output();
    if (!out) return '';
    const lines: string[] = [`=== ${this.agentMeta?.name ?? this.agentId} — Output ===\n`];

    switch (out.type) {
      case 'email':
        lines.push(`Betreff: ${out.subject}`, '', out.greeting, '', ...out.body, '', out.cta);
        break;
      case 'linkedin-post':
        lines.push(out.headline, '', ...out.body, '', out.cta, '', out.hashtags.join(' '));
        break;
      case 'video-script':
        lines.push(`Titel: ${out.title}`, '', `Hook: ${out.hook}`, '');
        out.sections.forEach(s => {
          lines.push(`## ${s.heading}`, s.narration, `[Visual: ${s.visualNote}]`, '');
        });
        lines.push(`CTA: ${out.cta}`);
        break;
      case 'lead-table':
        lines.push(`Gefundene Leads: ${out.totalFound} (${out.highScoreCount} Hot Leads)`, '');
        out.leads.forEach(l => {
          lines.push(`${l.name} | ${l.company} | Score: ${l.score} | ${l.status}`);
        });
        break;
      case 'keyword-table':
        lines.push(`Top-Chance: ${out.topOpportunity}`, '');
        out.keywords.forEach(k => {
          lines.push(`${k.keyword} | Vol: ${k.volume.toLocaleString()} | Difficulty: ${k.difficulty} | ${k.opportunity}`);
        });
        break;
      case 'sync-report':
        lines.push(
          `Records gesamt: ${out.totalRecords}`,
          `Synchronisiert: ${out.synced}`,
          `Duplikate entfernt: ${out.duplicatesRemoved}`,
          `Angereichert: ${out.enriched}`,
          `Fehler: ${out.errors}`,
          '',
        );
        out.syncItems.forEach(s => {
          lines.push(`${s.source} → ${s.target}: ${s.status} (${s.recordCount} Records)`);
        });
        break;
      case 'geo-audit':
        lines.push(this.buildGeoAuditTextVersion(out));
        break;
      case 'markdown':
        lines.push(out.content);
        break;
      case 'company-list':
        lines.push(`Branche: ${out.industry} | Stadt: ${out.city}`, '');
        out.companies.forEach(c => {
          lines.push(`${c.companyName} | ${c.fullAddress} | ${c.phoneNumber} | ${c.website ?? '–'}`);
        });
        break;
      case 'social-media':
        lines.push(
          `Thema: ${out.topic}`,
          `Brand Voice: ${out.brandVoice}`,
          `Zielgruppe: ${out.targetAudience}`,
          '',
          '--- Twitter ---',
          out.twitter,
          '',
          '--- LinkedIn ---',
          out.linkedin,
          '',
          '--- Reddit ---',
          `Titel: ${out.redditTitle}`,
          out.redditBody,
          '',
          '--- Instagram ---',
          out.instagramCaption,
        );
        break;
      case 'content-strategy':
        lines.push(
          `Hauptthema: ${out.primaryTopic}`,
          `Zielgruppe: ${out.targetAudience}`,
          `Content-Typ: ${out.contentType}`,
          '',
          '=== Strategische Analyse ===',
          ...(out.structuredAnalysis ? [out.structuredAnalysis, ''] : []),
          ...(out.primaryKeywords.length
            ? ['=== Primary Keywords ===', ...out.primaryKeywords, '']
            : []),
          ...(out.longTailKeywords.length
            ? ['=== Long-Tail Keywords ===', ...out.longTailKeywords.map((item) => `${item.keyword} (${item.intent})`), '']
            : []),
          ...(out.questionBasedKeywords.length
            ? ['=== Fragen ===', ...out.questionBasedKeywords, '']
            : []),
          ...(out.relatedTopics.length
            ? ['=== Verwandte Themen ===', ...out.relatedTopics, '']
            : []),
          ...(out.competitorUrls.length
            ? ['=== Wettbewerber ===', ...out.competitorUrls, '']
            : []),
          '=== Keywords ===',
          ...out.keywords.map((k) =>
            `${k.keyword} | SV: ${k.searchVolume ?? 'k.A.'} | KD: ${k.keywordDifficulty ?? 'k.A.'}`
          ),
          '',
          '=== Brief ===',
          out.brief,
        );
        break;
      case 'blog-editor':
        lines.push(
          `Thema: ${out.topic}`,
          `Primary Keyword: ${out.primaryKeyword}`,
          `Zielgruppe: ${out.audience}`,
          `Wortanzahl: ${out.wordCount ?? '—'}`,
          ...(out.score !== null ? [`Score: ${out.score}/100`] : []),
          ...(out.verdict ? [`Urteil: ${out.verdict}`] : []),
          '',
          '=== Outline ===',
          out.outline,
          '',
          '=== Chefredakteurs-Check ===',
          out.report,
          '',
          '=== Artikel ===',
          out.article,
          '',
          ...(out.keywords.length
            ? ['=== Keywords ===', ...out.keywords.map((keyword) => `${keyword.keyword} | SV: ${keyword.search_volume ?? '—'} | CPC: ${keyword.cpc ?? '—'} | Wettbewerb: ${keyword.competition ?? '—'}`), '']
            : []),
          ...(out.serpResults.length
            ? ['=== SERP ===', ...out.serpResults.map((result) => `${result.rank}. ${result.title} | ${result.url}`), '']
            : []),
          ...(out.peopleAlsoAsk.length
            ? ['=== People Also Ask ===', ...out.peopleAlsoAsk]
            : []),
        );
        break;
      case 'product-text':
        lines.push(
          `SEO Title: ${out.structuredResult?.seo?.title ?? out.structuredResult?.seo?.h1 ?? '–'}`,
          `Eingabe: ${out.inputReference ?? out.uploadedImageName}`,
          `Datei: ${out.generatedFile?.fileName ?? 'Keine Datei erhalten'}`,
          '',
          out.description,
        );
        break;
    }
    return lines.join('\n');
  }

  private toDisplayUrl(value: string): string {
    return value.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }

  private buildGeoAuditSummary(output: GeoAuditOutput): string {
    const processedSuffix = output.summary.totalProcessed ? ` (${output.summary.totalProcessed} Seiten)` : '';
    return `Geo Audit: ${this.toDisplayUrl(output.summary.domain)}${processedSuffix}`;
  }

  private resolveGeoSnapshotPage(kind: 'best' | 'worst'): GeoAuditPage | null {
    const audit = this.geoAuditOutput();
    if (!audit) return null;

    const ref = kind === 'best' ? audit.summary.bestPage : audit.summary.worstPage;
    const primaryList = kind === 'best' ? audit.topPages : audit.worstPages;
    const secondaryList = kind === 'best' ? audit.worstPages : audit.topPages;

    const matchingPage = (ref
      ? primaryList.find((page) => page.path === ref.path) ?? secondaryList.find((page) => page.path === ref.path)
      : null) ?? primaryList[0] ?? secondaryList[0];

    if (matchingPage) {
      return matchingPage;
    }

    if (!ref) {
      return null;
    }

    return {
      path: ref.path,
      score: ref.score,
      title: ref.title,
      failedCount: 0,
      failed: [],
    };
  }

  private buildGeoAuditRecommendations(audit: GeoAuditOutput | null): GeoAuditRecommendation[] {
    if (!audit || audit.summary.totalProcessed === 0) {
      return [];
    }

    const recommendations: GeoAuditRecommendation[] = [];
    const addRecommendation = (recommendation: GeoAuditRecommendation): void => {
      if (recommendations.some((item) => item.title === recommendation.title)) {
        return;
      }

      recommendations.push(recommendation);
    };

    if (audit.botStatus.cloudflareBlocksAll) {
      addRecommendation({
        title: 'Cloudflare fuer Audit-Traffic oeffnen',
        body: 'Die Domain ist fuer Browser und Bots abgeschirmt. Erlaube bekannte Bots oder richte gezielte Allowlists ein, bevor du Content-Themen priorisierst.',
        icon: 'shield_lock',
        tone: 'critical',
      });
    } else if (audit.botStatus.firewallBlocked) {
      addRecommendation({
        title: 'KI-Crawler in Firewall und WAF freigeben',
        body: 'GPTBot oder aehnliche Bots werden blockiert. Ohne diese Freigabe bleiben viele GEO-Massnahmen fuer Antwortmaschinen unsichtbar.',
        icon: 'shield',
        tone: 'critical',
      });
    }

    for (const issue of audit.topIssues) {
      const label = issue.issue.toLowerCase();

      if (label.includes('llms.txt')) {
        addRecommendation({
          title: 'llms.txt als Einstieg fuer KI-Systeme anlegen',
          body: 'Definiere zentrale Seiten, Themencluster und Prioritaeten in einer llms.txt, damit Antwortsysteme schneller verstehen, was wichtig ist.',
          icon: 'description',
          tone: 'warning',
        });
      } else if (label.includes('robots')) {
        addRecommendation({
          title: 'robots.txt fuer KI-Bots sauber regeln',
          body: 'Pruefe GPTBot, Google-Extended und verwandte Bots explizit. So vermeidest du widerspruechliche Signale zwischen Crawl-Freigabe und Content-Strategie.',
          icon: 'rule',
          tone: 'warning',
        });
      } else if (label.includes('breadcrumb')) {
        addRecommendation({
          title: 'Breadcrumb-Struktur konsequent auszeichnen',
          body: 'BreadcrumbList hilft Suchsystemen beim Verstehen von Themenhierarchien. Besonders Service- und Insight-Seiten profitieren davon.',
          icon: 'alt_route',
          tone: 'info',
        });
      } else if (label.includes('trust')) {
        addRecommendation({
          title: 'Trust-Signale auf umsatznahen Seiten staerken',
          body: 'Referenzen, Autorenhinweise, Kontaktanker und Cases fehlen auf vielen Seiten. Das ist ein schneller Hebel fuer GEO und Conversion zugleich.',
          icon: 'verified',
          tone: 'info',
        });
      } else if (label.includes('faq')) {
        addRecommendation({
          title: 'FAQ-Bloecke fuer Frageintentionen ergaenzen',
          body: 'Kurze FAQ-Abschnitte helfen bei Longtail-Fragen und machen Seiten fuer Antwortsysteme leichter verwertbar.',
          icon: 'quiz',
          tone: 'info',
        });
      } else if (label.includes('alt-text')) {
        addRecommendation({
          title: 'Alt-Texte fuer wichtige Assets nachpflegen',
          body: 'Multimodale Systeme profitieren davon, wenn Bilder und Grafiken semantisch sauber beschrieben sind.',
          icon: 'image',
          tone: 'info',
        });
      } else if (label.includes('hierarchie')) {
        addRecommendation({
          title: 'Ueberschriften-Hierarchie auf schwachen Seiten bereinigen',
          body: 'Eine klare H1-H2-H3-Struktur macht Inhalte fuer Nutzer, Crawler und Antwortsysteme deutlich leichter erfassbar.',
          icon: 'splitscreen',
          tone: 'info',
        });
      }

      if (recommendations.length >= 4) {
        break;
      }
    }

    if (!recommendations.length && audit.worstPages.length > 0) {
      addRecommendation({
        title: 'Schwaechste Seiten zuerst ueberarbeiten',
        body: `Starte mit ${audit.worstPages[0].path} und uebernehme die Fixes anschliessend fuer weitere Seiten mit denselben Defiziten.`,
        icon: 'task_alt',
        tone: 'info',
      });
    }

    return recommendations.slice(0, 4);
  }

  private buildGeoAuditTextVersion(output: GeoAuditOutput): string {
    const lines: string[] = [
      'GEO Site Audit',
      `Domain: ${output.summary.domain}`,
      `Seiten geprueft: ${output.summary.totalProcessed} von ${output.summary.totalFound}`,
      `Durchschnitt: ${output.summary.averageScore}/100`,
      `Crawler-Status: ${this.getGeoStatusLabel(output.botStatus)}`,
    ];

    if (output.summary.bestPage) {
      lines.push(`Beste Seite: ${output.summary.bestPage.score}/100 ${output.summary.bestPage.path}`);
    }

    if (output.summary.worstPage) {
      lines.push(`Schwaechste Seite: ${output.summary.worstPage.score}/100 ${output.summary.worstPage.path}`);
    }

    if (output.topIssues.length) {
      lines.push('', 'Top-Probleme:');
      output.topIssues.slice(0, 5).forEach((issue) => {
        lines.push(`- ${issue.issue}: ${issue.count} Seiten (${issue.percent}%)`);
      });
    }

    if (output.worstPages.length) {
      lines.push('', 'Schwaechste Seiten:');
      output.worstPages.slice(0, 5).forEach((page) => {
        lines.push(`- ${page.score}/100 ${page.path}`);
        if (page.failed.length) {
          lines.push(`  Probleme: ${page.failed.slice(0, 5).join(', ')}`);
        }
      });
    }

    if (output.errors.length) {
      lines.push('', 'Nicht erreichbare Seiten:');
      output.errors.forEach((error) => {
        lines.push(`- ${error.errorMsg}${error.pageUrl ? ` (${error.pageUrl})` : ''}`);
      });
    }

    return lines.join('\n');
  }

  readonly MONTH_NAMES = [
    'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
  ];

  getMonthLabel(month: number): string {
    return this.MONTH_NAMES[(month - 1) % 12] ?? String(month);
  }

  getMaxSearchVolume(monthlySearches: { searchVolume: number }[]): number {
    return Math.max(...monthlySearches.map((m) => m.searchVolume), 1);
  }

  getKdColor(kd: number | null): string {
    if (kd === null) return 'text-on-surface-variant';
    if (kd <= 20) return 'text-emerald-400';
    if (kd <= 49) return 'text-amber-400';
    return 'text-red-400';
  }

  getKdBg(kd: number | null): string {
    if (kd === null) return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
    if (kd <= 20) return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    if (kd <= 49) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    return 'bg-red-500/15 text-red-300 border-red-500/30';
  }

  getIntentBadgeClass(intent: string): string {
    switch (intent) {
      case 'commercial':
        return 'bg-[#0070FF]/15 text-[#7DB4FF] border-[#0070FF]/30';
      case 'transactional':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      case 'informational':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-surface-container-high text-on-surface-variant border-outline-variant/30';
    }
  }

  getIntentBadgeBackgroundClass(intent: string): string {
    switch (intent) {
      case 'commercial':
        return 'bg-[#0070FF]/15';
      case 'transactional':
        return 'bg-violet-500/15';
      case 'informational':
        return 'bg-emerald-500/15';
      default:
        return 'bg-surface-container-high/30';
    }
  }

  getIntentIconColor(intent: string): string {
    switch (intent) {
      case 'commercial':
        return 'text-[#7DB4FF]';
      case 'transactional':
        return 'text-violet-300';
      case 'informational':
        return 'text-emerald-300';
      default:
        return 'text-on-surface-variant';
    }
  }

  getIntentCardClass(intent: string): string {
    switch (intent) {
      case 'commercial':
        return 'border-[#0070FF]/25 bg-[#0070FF]/10 transition-all hover:-translate-y-0.5';
      case 'transactional':
        return 'border-violet-500/25 bg-violet-500/10 transition-all hover:-translate-y-0.5';
      case 'informational':
        return 'border-emerald-500/25 bg-emerald-500/10 transition-all hover:-translate-y-0.5';
      default:
        return 'border-outline-variant/25 bg-surface-container-high/30 transition-all hover:-translate-y-0.5';
    }
  }

  getIntentLabel(intent: string): string {
    switch (intent) {
      case 'commercial':
        return 'Commercial';
      case 'transactional':
        return 'Transactional';
      case 'informational':
        return 'Informational';
      default:
        return 'Weitere';
    }
  }

  formatCompetitorUrl(url: string): string {
    return this.toDisplayUrl(url);
  }

  private buildContentStrategyIntentGroups(
    items: ContentStrategyOutput['longTailKeywords'],
  ): ContentStrategyIntentGroup[] {
    const definitions: Omit<ContentStrategyIntentGroup, 'items'>[] = [
      {
        key: 'informational',
        label: 'Informational',
        icon: 'school',
        description: 'Nutzer suchen Orientierung, Beispiele und Grundlagen.',
        accentClass: 'border-emerald-500/25 bg-emerald-500/10',
      },
      {
        key: 'commercial',
        label: 'Commercial',
        icon: 'storefront',
        description: 'Hier entsteht Evaluationsdruck rund um Tools und Anbieter.',
        accentClass: 'border-[#0070FF]/25 bg-[#0070FF]/10',
      },
      {
        key: 'transactional',
        label: 'Transactional',
        icon: 'bolt',
        description: 'Diese Queries signalisieren direkte Kauf- oder Beauftragungsabsicht.',
        accentClass: 'border-violet-500/25 bg-violet-500/10',
      },
    ];

    const normalizedItems = items.map((item) => ({
      ...item,
      intent: item.intent.toLowerCase(),
    }));

    const groups = definitions
      .map((definition) => ({
        ...definition,
        items: normalizedItems.filter((item) => item.intent === definition.key),
      }))
      .filter((group) => group.items.length > 0);

    const remaining = normalizedItems.filter(
      (item) => !definitions.some((definition) => definition.key === item.intent),
    );

    if (remaining.length > 0) {
      groups.push({
        key: 'other',
        label: 'Weitere Signale',
        icon: 'interests',
        description: 'Zusätzliche Keyword-Chancen ohne klaren Intent-Cluster.',
        accentClass: 'border-outline-variant/25 bg-surface-container-high/30',
        items: remaining,
      });
    }

    return groups;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
