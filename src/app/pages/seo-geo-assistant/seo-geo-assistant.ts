import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  GeoAnalysisStartResponse,
} from './seo-geo-assistant.models';

type RequestErrorCode = 'network' | 'api';

class RequestError extends Error {
  constructor(
    public readonly code: RequestErrorCode,
    public readonly status?: number,
    public readonly responseBody?: string,
  ) {
    super(code);
  }
}
const LONG_WAIT_NOTICE_MS = 15_000;

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
  private longWaitNoticeTimeoutId: number | null = null;

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly showLongWaitNotice = signal(false);

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
    this.showLongWaitNotice.set(false);
    this.startLongWaitNoticeTimer();

    try {
      const requestBody = {
        url: normalizedUrl,
        brand: this.brand.trim(),
        industry: this.industry.trim(),
        location: this.location.trim() || 'Deutschland',
      };

      const response = await this.fetchWebhookResponse(environment.geoAnalysisStartWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error('Geo analysis webhook error', {
          status: response.status,
          url: environment.geoAnalysisStartWebhookUrl,
          method: 'POST',
          requestBody,
          responseBody: errorText,
        });
        throw new RequestError('api', response.status, errorText);
      }

      const startResponse = this.extractStartResponse(await this.readJson(response));
      if (!startResponse?.jobId) {
        throw new RequestError('api');
      }

      await this.router.navigate(['/agents', 'seo-geo-analyse-assistent', 'result'], {
        queryParams: { jobId: startResponse.jobId },
      });
    } catch (error) {
      this.errorMessage.set(this.toFriendlyErrorMessage(error));
      console.error('SEO/GEO form request failed', error);
    } finally {
      this.clearLongWaitNoticeTimer();
      this.showLongWaitNotice.set(false);
      this.isSubmitting.set(false);
    }
  }

  fillExample(): void {
    this.websiteUrl = 'https://www.sistrix.de/';
    this.brand = 'SISTRIX';
    this.industry = 'SEO-Software';
    this.location = 'Deutschland';
  }

  private async fetchWebhookResponse(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, init);
    } catch (error) {
      if (error instanceof TypeError) {
        throw new RequestError('network');
      }

      throw error;
    }
  }

  private startLongWaitNoticeTimer(): void {
    this.clearLongWaitNoticeTimer();
    this.longWaitNoticeTimeoutId = window.setTimeout(() => {
      this.showLongWaitNotice.set(true);
    }, LONG_WAIT_NOTICE_MS);
  }

  private clearLongWaitNoticeTimer(): void {
    if (this.longWaitNoticeTimeoutId !== null) {
      window.clearTimeout(this.longWaitNoticeTimeoutId);
      this.longWaitNoticeTimeoutId = null;
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

  private extractStartResponse(data: unknown): GeoAnalysisStartResponse | null {
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

    return payload as GeoAnalysisStartResponse;
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
        case 'network':
          return 'Keine Verbindung. Bitte Internetverbindung prüfen.';
        default:
          if (error.status === 500) {
            return 'Die Analyse konnte nicht gestartet werden. Bitte versuchen Sie es in wenigen Minuten erneut.';
          }

          if (error.status === 404) {
            return 'Das System ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut.';
          }

          return 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
      }
    }

    return 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
  }
}
