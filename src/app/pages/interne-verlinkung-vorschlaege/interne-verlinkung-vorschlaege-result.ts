import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  findInternalLinkSuggestionsReport,
  StoredInternalLinkSuggestionsReport,
} from './interne-verlinkung-vorschlaege.models';

interface InternalLinkSuggestion {
  url: string;
  anchorText: string;
  existingText: string;
  adaptedText: string;
  justification: string;
}

interface InternalLinkSuggestionsWebhookResult {
  totalAnalyzed: number | null;
  totalSuggestions: number | null;
  targetUrl: string;
  mainKeyword: string;
  suggestions: InternalLinkSuggestion[];
}

interface ResponseSection {
  key: string;
  label: string;
  kind: 'text' | 'string-list' | 'json';
  text?: string;
  items?: string[];
  json?: string;
}

@Component({
  selector: 'app-interne-verlinkung-vorschlaege-result',
  standalone: true,
  templateUrl: './interne-verlinkung-vorschlaege-result.html',
})
export class InterneVerlinkungVorschlaegeResultComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly agentId = 'interne-verlinkung-vorschlaege';
  readonly agentMeta = AGENTS_MAP[this.agentId];
  readonly reportId = this.route.snapshot.queryParamMap.get('reportId');

  private readonly _record = signal<StoredInternalLinkSuggestionsReport | null>(
    findInternalLinkSuggestionsReport(this.reportId),
  );

  readonly record = this._record.asReadonly();
  readonly structuredResult = computed<InternalLinkSuggestionsWebhookResult | null>(() =>
    this.extractStructuredResult(this.record()?.parsedResponse),
  );
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
    if (this.extractStructuredResult(input)) {
      return [];
    }

    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return [];
    }

    const record = input as Record<string, unknown>;
    return Object.entries(record).map(([key, value]) => this.mapSection(key, value));
  }

  private extractStructuredResult(input: unknown): InternalLinkSuggestionsWebhookResult | null {
    const first = Array.isArray(input) ? input[0] : input;
    if (!first || typeof first !== 'object' || Array.isArray(first)) {
      return null;
    }

    const record = first as Record<string, unknown>;
    const totalAnalyzed = typeof record['totalAnalyzed'] === 'number' ? record['totalAnalyzed'] : null;
    const totalSuggestions = typeof record['totalSuggestions'] === 'number' ? record['totalSuggestions'] : null;
    const targetUrl = typeof record['targetUrl'] === 'string' ? record['targetUrl'].trim() : '';
    const mainKeyword = typeof record['mainKeyword'] === 'string' ? record['mainKeyword'].trim() : '';
    const suggestions = this.normalizeSuggestions(record['suggestions']);

    if (
      totalAnalyzed === null &&
      totalSuggestions === null &&
      !targetUrl &&
      !mainKeyword &&
      !suggestions.length
    ) {
      return null;
    }

    return {
      totalAnalyzed,
      totalSuggestions,
      targetUrl,
      mainKeyword,
      suggestions,
    };
  }

  private normalizeSuggestions(value: unknown): InternalLinkSuggestion[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return null;
        }

        const record = item as Record<string, unknown>;
        return {
          url: typeof record['url'] === 'string' ? record['url'].trim() : '',
          anchorText: typeof record['anchorText'] === 'string' ? record['anchorText'].trim() : '',
          existingText: typeof record['existingText'] === 'string' ? record['existingText'].trim() : '',
          adaptedText: typeof record['adaptedText'] === 'string' ? record['adaptedText'].trim() : '',
          justification: typeof record['justification'] === 'string' ? record['justification'].trim() : '',
        };
      })
      .filter((item): item is InternalLinkSuggestion => !!item && !!item.url);
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
