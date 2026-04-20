import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  extractGeoWebhookResult,
  saveSeoGeoReport,
  StoredSeoGeoReport,
} from '../seo-geo-assistant/seo-geo-assistant.models';

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
  selector: 'app-seo-geo-assistant-nollm',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './seo-geo-assistant-nollm.html',
})
export class SeoGeoAssistantNoLlmComponent {
  private readonly router = inject(Router);

  readonly environment = environment;

  websiteUrl = '';
  brand = '';
  industry = '';
  location = 'Deutschland';

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  async submit(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const normalizedUrl = this.normalizeUrl(this.websiteUrl);
    if (!normalizedUrl) {
      this.errorMessage.set('Bitte gib eine gültige Website-URL ein.');
      return;
    }

    this.websiteUrl = normalizedUrl;
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    try {
      const requestBody = {
        url: normalizedUrl,
        brand: this.brand.trim(),
        industry: this.industry.trim(),
        location: this.location.trim() || 'Deutschland',
      };

      const response = await this.fetchWithTimeout(
        environment.geoAnalysisNoLlmWebhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        WEBHOOK_TIMEOUT_MS,
      );

      const rawResponse = await response.text().catch(() => '');

      if (!response.ok) {
        console.error('Geo analysis NoLLM webhook error', {
          status: response.status,
          url: environment.geoAnalysisNoLlmWebhookUrl,
          method: 'POST',
          requestBody,
          responseBody: rawResponse,
        });
        throw new RequestError('api', response.status, rawResponse);
      }

      const payload = extractGeoWebhookResult(this.parseJson(rawResponse));
      if (!payload) {
        throw new RequestError('empty', response.status, rawResponse);
      }

      const record: StoredSeoGeoReport = {
        id: `seo-geo-nollm-${Date.now()}`,
        createdAt: Date.now(),
        payload,
      };

      saveSeoGeoReport(record);

      await this.router.navigate(['/agents', 'seo-geo-analyse-assistent-nollm', 'result'], {
        queryParams: { reportId: record.id },
      });
    } catch (error) {
      this.errorMessage.set(this.toFriendlyErrorMessage(error));
      console.error('SEO/GEO NoLLM form request failed', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  fillExample(): void {
    this.websiteUrl = 'https://eom.de/agency/seo';
    this.brand = 'Effektiv Online-Marketing';
    this.industry = 'online Marketing';
    this.location = 'Hannover, DE';
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
      return raw;
    }
  }

  private normalizeUrl(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

    try {
      const url = new URL(withProtocol);
      return url.toString();
    } catch {
      return '';
    }
  }

  private toFriendlyErrorMessage(error: unknown): string {
    if (error instanceof RequestError) {
      switch (error.code) {
        case 'timeout':
          return 'Der NoLLM-Webhook braucht länger als erwartet. Bitte versuche es erneut.';
        case 'network':
          return 'Keine Verbindung. Bitte Internetverbindung prüfen.';
        case 'empty':
          return 'Der NoLLM-Webhook hat keine verwertbare Analyse zurückgegeben.';
        default:
          if (error.status === 500) {
            return 'Der NoLLM-Webhook antwortet mit HTTP 500.';
          }

          if (error.status === 404) {
            return 'Der NoLLM-Webhook wurde nicht gefunden.';
          }

          return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
      }
    }

    return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
  }
}
