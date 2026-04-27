import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  InternalLinkSuggestionsInput,
  saveInternalLinkSuggestionsReport,
  StoredInternalLinkSuggestionsReport,
} from './interne-verlinkung-vorschlaege.models';

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
  selector: 'app-interne-verlinkung-vorschlaege',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './interne-verlinkung-vorschlaege.html',
})
export class InterneVerlinkungVorschlaegeComponent {
  private readonly router = inject(Router);

  readonly environment = environment;
  readonly agentMeta = AGENTS_MAP['interne-verlinkung-vorschlaege'];

  sitemapUrl = '';
  targetUrl = '';
  mainKeyword = '';
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  async submit(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const payload = this.normalizeInput();
    if (!payload) {
      this.errorMessage.set('Bitte fuelle Sitemap-URL, Ziel-URL und Hauptkeyword aus.');
      return;
    }

    this.sitemapUrl = payload.sitemapUrl;
    this.targetUrl = payload.targetUrl;
    this.mainKeyword = payload.mainKeyword;
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    try {
      const response = await this.fetchWithTimeout(
        environment.internalLinkSuggestionsWebhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/plain',
          },
          body: JSON.stringify(payload),
        },
        WEBHOOK_TIMEOUT_MS,
      );

      const rawResponse = await response.text().catch(() => '');

      if (!response.ok) {
        console.error('Internal link suggestions webhook error', {
          status: response.status,
          url: environment.internalLinkSuggestionsWebhookUrl,
          method: 'POST',
          requestBody: payload,
          responseBody: rawResponse,
        });
        throw new RequestError('api', response.status, rawResponse);
      }

      const parsedResponse = this.parseJson(rawResponse);
      if (!rawResponse && parsedResponse === null) {
        throw new RequestError('empty', response.status, rawResponse);
      }

      const record: StoredInternalLinkSuggestionsReport = {
        id: `interne-verlinkung-vorschlaege-${Date.now()}`,
        createdAt: Date.now(),
        input: payload,
        parsedResponse,
        rawResponse,
      };

      saveInternalLinkSuggestionsReport(record);

      await this.router.navigate(['/agents', 'interne-verlinkung-vorschlaege', 'result'], {
        queryParams: { reportId: record.id },
      });
    } catch (error) {
      this.errorMessage.set(this.toFriendlyErrorMessage(error));
      console.error('Internal link suggestions request failed', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  fillExample(): void {
    this.sitemapUrl = 'https://www.sistrix.de/sitemap.xml';
    this.targetUrl = 'https://www.sistrix.de/ratgeber/seo/';
    this.mainKeyword = 'seo software';
    this.errorMessage.set('');
  }

  payloadPreview(): string {
    return JSON.stringify(
      {
        sitemapUrl: this.sitemapUrl || '...',
        targetUrl: this.targetUrl || '...',
        mainKeyword: this.mainKeyword || '...',
      },
      null,
      2,
    );
  }

  private normalizeInput(): InternalLinkSuggestionsInput | null {
    const sitemapUrl = this.normalizeUrl(this.sitemapUrl);
    const targetUrl = this.normalizeUrl(this.targetUrl);
    const mainKeyword = this.mainKeyword.trim();

    if (!sitemapUrl || !targetUrl || !mainKeyword) {
      return null;
    }

    return { sitemapUrl, targetUrl, mainKeyword };
  }

  private normalizeUrl(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
      return new URL(withProtocol).toString();
    } catch {
      return '';
    }
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

  private toFriendlyErrorMessage(error: unknown): string {
    if (error instanceof RequestError) {
      switch (error.code) {
        case 'timeout':
          return 'Die Vorschlagsanalyse dauert laenger als erwartet. Bitte versuche es erneut.';
        case 'network':
          return 'Keine Verbindung. Bitte pruefe deine Internetverbindung.';
        case 'empty':
          return 'Der Webhook hat keine auswertbare Antwort zurueckgegeben.';
        default:
          if (error.status === 404) {
            return 'Der Webhook fuer interne Verlinkung wurde nicht gefunden.';
          }

          if (error.status === 500) {
            return 'Der Webhook fuer interne Verlinkung hat mit HTTP 500 geantwortet.';
          }

          return 'Die Vorschlaege fuer interne Verlinkung konnten nicht gestartet werden. Bitte versuche es erneut.';
      }
    }

    return 'Die Vorschlaege fuer interne Verlinkung konnten nicht gestartet werden. Bitte versuche es erneut.';
  }
}
