import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  ContentSeoAnalyzerCompetitiveSection,
  ContentSeoAnalyzerResultPayload,
  ContentSeoAnalyzerSeoSection,
  saveContentSeoAnalyzerReport,
  StoredContentSeoAnalyzerReport,
} from './content-seo-analyzer.models';

type RequestErrorCode = 'timeout' | 'network' | 'api' | 'empty';

class RequestError extends Error {
  constructor(
    public readonly code: RequestErrorCode,
    public readonly status?: number,
    public readonly responseBody?: string,
  ) {
    super(code);
  }
}

const WEBHOOK_TIMEOUT_MS = 90_000;

@Component({
  selector: 'app-content-seo-analyzer',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './content-seo-analyzer.html',
})
export class ContentSeoAnalyzerComponent {
  private readonly router = inject(Router);

  readonly environment = environment;
  readonly agentMeta = AGENTS_MAP['content-seo-analyzer'];

  domain = '';
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  async submit(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const normalizedDomain = this.normalizeDomain(this.domain);
    if (!normalizedDomain) {
      this.errorMessage.set('Bitte gib eine gueltige Domain ein.');
      return;
    }

    this.domain = normalizedDomain;
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    try {
      const requestBody = { domain: normalizedDomain };
      const response = await this.fetchWithTimeout(
        environment.contentSeoAnalyzerWebhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain',
          },
          body: JSON.stringify(requestBody),
        },
        WEBHOOK_TIMEOUT_MS,
      );

      const rawResponse = await response.text().catch(() => '');

      if (!response.ok) {
        console.error('Content SEO Analyzer webhook error', {
          status: response.status,
          url: environment.contentSeoAnalyzerWebhookUrl,
          method: 'POST',
          requestBody,
          responseBody: rawResponse,
        });
        throw new RequestError('api', response.status, rawResponse);
      }

      const payload = this.extractResultPayload(this.parseJson(rawResponse));
      if (!payload) {
        throw new RequestError('empty', response.status, rawResponse);
      }

      const record: StoredContentSeoAnalyzerReport = {
        id: `content-seo-analyzer-${Date.now()}`,
        createdAt: Date.now(),
        domain: normalizedDomain,
        payload,
      };

      saveContentSeoAnalyzerReport(record);

      await this.router.navigate(['/agents', 'content-seo-analyzer', 'result'], {
        queryParams: { reportId: record.id },
      });
    } catch (error) {
      this.errorMessage.set(this.toFriendlyErrorMessage(error));
      console.error('Content SEO Analyzer request failed', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  fillExample(): void {
    this.domain = 'sistrix.de';
    this.errorMessage.set('');
  }

  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new RequestError('timeout');
      }

      if (error instanceof TypeError) {
        throw new RequestError('network');
      }

      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private normalizeDomain(value: string): string {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      return '';
    }

    const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
      const url = new URL(withProtocol);
      const hostname = url.hostname.replace(/\.$/, '').replace(/^www\./, '');
      return this.isValidDomain(hostname) ? hostname : '';
    } catch {
      return '';
    }
  }

  private isValidDomain(hostname: string): boolean {
    if (!hostname || hostname.length > 253 || !hostname.includes('.')) {
      return false;
    }

    const labels = hostname.split('.');
    return labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label));
  }

  private parseJson(raw: string): unknown {
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private extractResultPayload(input: unknown): ContentSeoAnalyzerResultPayload | null {
    const candidate = this.resolvePayloadCandidate(input);
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      return null;
    }

    const record = candidate as Record<string, unknown>;
    const seo = this.normalizeSeoSection(record['seo']);
    const competitive = this.normalizeCompetitiveSection(record['competitive']);

    if (!seo && !competitive) {
      return null;
    }

    return {
      seo,
      competitive,
    };
  }

  private resolvePayloadCandidate(input: unknown): unknown {
    if (Array.isArray(input)) {
      return input[0] ?? null;
    }

    if (!input || typeof input !== 'object') {
      return null;
    }

    const record = input as Record<string, unknown>;

    if (record['seo'] || record['competitive']) {
      return record;
    }

    const nestedKeys = ['data', 'result', 'body', 'payload', 'response'];
    for (const key of nestedKeys) {
      const nested = record[key];
      if (Array.isArray(nested)) {
        const first = nested[0];
        if (first && typeof first === 'object') {
          const nestedRecord = first as Record<string, unknown>;
          if (nestedRecord['seo'] || nestedRecord['competitive']) {
            return nestedRecord;
          }
        }
      } else if (nested && typeof nested === 'object') {
        const nestedRecord = nested as Record<string, unknown>;
        if (nestedRecord['seo'] || nestedRecord['competitive']) {
          return nestedRecord;
        }
      }
    }

    return null;
  }

  private normalizeSeoSection(value: unknown): ContentSeoAnalyzerSeoSection | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const score = typeof record['score'] === 'number' ? record['score'] : null;
    const contentGaps = this.asStringArray(record['contentGaps']);
    const keywordOpportunities = this.asStringArray(record['keywordOpportunities']);
    const quickWins = this.asStringArray(record['quickWins']);

    if (score === null && !contentGaps.length && !keywordOpportunities.length && !quickWins.length) {
      return null;
    }

    return {
      score,
      contentGaps,
      keywordOpportunities,
      quickWins,
    };
  }

  private normalizeCompetitiveSection(value: unknown): ContentSeoAnalyzerCompetitiveSection | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    const topCompetitors = this.asStringArray(record['topCompetitors']);
    const marketPosition = typeof record['marketPosition'] === 'string' ? record['marketPosition'].trim() : '';
    const advantages = this.asStringArray(record['advantages']);
    const recommendedPositioning =
      typeof record['recommendedPositioning'] === 'string'
        ? record['recommendedPositioning'].trim()
        : '';

    if (!topCompetitors.length && !marketPosition && !advantages.length && !recommendedPositioning) {
      return null;
    }

    return {
      topCompetitors,
      marketPosition,
      advantages,
      recommendedPositioning,
    };
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private toFriendlyErrorMessage(error: unknown): string {
    if (error instanceof RequestError) {
      switch (error.code) {
        case 'timeout':
          return 'Die Analyse dauert länger als erwartet. Bitte versuchen Sie es erneut.';
        case 'network':
          return 'Keine Verbindung. Bitte prüfen Sie Ihre Internetverbindung.';
        case 'empty':
          return 'Es konnte kein verwertbarer Befund erzeugt werden. Bitte versuchen Sie es erneut.';
        default:
          if (error.status === 404) {
            return 'Das System ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut.';
          }

          if (error.status === 500) {
            return 'Das System ist gerade nicht erreichbar. Bitte versuchen Sie es in wenigen Minuten erneut.';
          }

          return 'Die Analyse konnte nicht gestartet werden. Bitte versuchen Sie es erneut.';
      }
    }

    return 'Die Analyse konnte nicht gestartet werden. Bitte versuchen Sie es erneut.';
  }
}
