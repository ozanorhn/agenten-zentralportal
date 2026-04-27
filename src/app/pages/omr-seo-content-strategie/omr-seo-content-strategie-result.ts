import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  findOmrSeoContentStrategieReport,
  StoredOmrSeoContentStrategieReport,
} from './omr-seo-content-strategie.models';
import { renderMarkdownToHtml } from '../../utils/markdown.utils';

interface ResponseSection {
  key: string;
  label: string;
  kind: 'text' | 'string-list' | 'json';
  text?: string;
  items?: string[];
  json?: string;
}

interface KeywordMarkdownResult {
  keyword: string;
  text: string;
}

@Component({
  selector: 'app-omr-seo-content-strategie-result',
  standalone: true,
  templateUrl: './omr-seo-content-strategie-result.html',
  encapsulation: ViewEncapsulation.None,
})
export class OmrSeoContentStrategieResultComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);

  readonly agentId = 'omr-seo-content-strategie';
  readonly agentMeta = AGENTS_MAP[this.agentId];
  readonly reportId = this.route.snapshot.queryParamMap.get('reportId');

  private readonly _record = signal<StoredOmrSeoContentStrategieReport | null>(
    findOmrSeoContentStrategieReport(this.reportId),
  );

  readonly record = this._record.asReadonly();
  readonly keywordMarkdownResult = computed<KeywordMarkdownResult | null>(() =>
    this.extractKeywordMarkdownResult(this.record()?.parsedResponse),
  );
  readonly renderedMarkdown = computed<SafeHtml | null>(() => {
    const markdown = this.keywordMarkdownResult()?.text;
    if (!markdown) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdownToHtml(markdown));
  });
  readonly responseSections = computed<ResponseSection[]>(() =>
    this.buildResponseSections(this.record()?.parsedResponse),
  );
  readonly rawJson = computed<string>(() => this.toJson(this.record()?.parsedResponse));
  readonly rawText = computed<string>(() => this.record()?.rawResponse ?? '');

  goBack(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  rerun(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  formatDate(timestamp: number): string {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(timestamp);
  }

  private buildResponseSections(input: unknown): ResponseSection[] {
    if (this.extractKeywordMarkdownResult(input)) {
      return [];
    }

    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return [];
    }

    const record = input as Record<string, unknown>;
    return Object.entries(record).map(([key, value]) => this.mapSection(key, value));
  }

  private extractKeywordMarkdownResult(input: unknown): KeywordMarkdownResult | null {
    const first = Array.isArray(input) ? input[0] : input;
    if (!first || typeof first !== 'object' || Array.isArray(first)) {
      return null;
    }

    const record = first as Record<string, unknown>;
    const keyword = typeof record['keyword'] === 'string' ? record['keyword'].trim() : '';
    const text = typeof record['text'] === 'string' ? record['text'].trim() : '';

    if (!keyword && !text) {
      return null;
    }

    return {
      keyword,
      text,
    };
  }

  private mapSection(key: string, value: unknown): ResponseSection {
    const label = this.toLabel(key);

    if (typeof value === 'string') {
      return {
        key,
        label,
        kind: 'text',
        text: value,
      };
    }

    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      return {
        key,
        label,
        kind: 'string-list',
        items: value as string[],
      };
    }

    return {
      key,
      label,
      kind: 'json',
      json: this.toJson(value),
    };
  }

  private toLabel(key: string): string {
    return key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (value) => value.toUpperCase());
  }

  private toJson(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '';
    }
  }
}
