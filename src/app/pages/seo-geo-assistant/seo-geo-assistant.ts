import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  GeoWebhookResult,
  saveSeoGeoReport,
  StoredSeoGeoReport,
} from './seo-geo-assistant.models';

type RequestErrorCode = 'timeout' | 'network' | 'api';

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
  selector: 'app-seo-geo-assistant',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './seo-geo-assistant.html',
})
export class SeoGeoAssistantComponent {
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
        environment.geoAnalysisWebhookUrl,
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

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Geo analysis webhook error', {
          status: response.status,
          url: environment.geoAnalysisWebhookUrl,
          method: 'POST',
          requestBody,
          responseBody: errorText,
        });
        throw new RequestError('api', response.status, errorText);
      }

      const payload = this.extractPayload(await this.readJson(response));
      if (!payload) {
        throw new RequestError('api');
      }

      const record: StoredSeoGeoReport = {
        id: `seo-geo-${Date.now()}`,
        createdAt: Date.now(),
        payload,
      };

      saveSeoGeoReport(record);

      await this.router.navigate(['/agents', 'seo-geo-analyse-assistent', 'result'], {
        queryParams: { reportId: record.id },
      });
    } catch (error) {
      this.errorMessage.set(this.toFriendlyErrorMessage(error));
      console.error('SEO/GEO form request failed', error);
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

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private extractPayload(data: unknown): GeoWebhookResult | null {
    let parsed = data;

    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return null;
      }
    }

    const payload = Array.isArray(parsed) ? (parsed[0] ?? null) : parsed;
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    return payload as GeoWebhookResult;
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
          return 'Die Analyse dauert länger als erwartet. Bitte versuche es erneut.';
        case 'network':
          return 'Keine Verbindung. Bitte Internetverbindung prüfen.';
        default:
          if (error.status === 500) {
            return 'Der Webhook antwortet mit HTTP 500. Der Request wird per POST gesendet, aber der n8n-Testworkflow liefert intern einen Fehler.';
          }

          if (error.status === 404) {
            return 'Der Webhook-Endpunkt wurde nicht gefunden. Bitte die Ziel-URL prüfen.';
          }

          return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
      }
    }

    return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
  }
}
