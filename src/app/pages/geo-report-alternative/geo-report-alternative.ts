import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  saveGeoReportAlternative,
  StoredGeoReportAlternative,
} from './geo-report-alternative.models';
import { extractMarkdownContent } from '../../utils/markdown.utils';

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
  selector: 'app-geo-report-alternative',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './geo-report-alternative.html',
})
export class GeoReportAlternativeComponent {
  private readonly router = inject(Router);

  readonly environment = environment;

  websiteUrl = '';
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  async submit(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const normalizedUrl = this.normalizeUrl(this.websiteUrl);
    if (!normalizedUrl) {
      this.errorMessage.set('Bitte gib eine gueltige Website-URL ein.');
      return;
    }

    this.websiteUrl = normalizedUrl;
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    try {
      const requestBody = { url: normalizedUrl };
      const response = await this.fetchWithTimeout(
        environment.geoReportAlternativeWebhookUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/markdown, text/plain, application/json',
          },
          body: JSON.stringify(requestBody),
        },
        WEBHOOK_TIMEOUT_MS,
      );

      const rawResponse = await response.text();

      if (!response.ok) {
        console.error('Geo report alternative webhook error', {
          status: response.status,
          url: environment.geoReportAlternativeWebhookUrl,
          method: 'POST',
          requestBody,
          responseBody: rawResponse,
        });
        throw new RequestError('api', response.status, rawResponse);
      }

      const markdown = extractMarkdownContent(rawResponse);
      if (!markdown) {
        throw new RequestError('empty', response.status, rawResponse);
      }

      const record: StoredGeoReportAlternative = {
        id: `geo-report-alternative-${Date.now()}`,
        createdAt: Date.now(),
        url: normalizedUrl,
        markdown,
      };

      saveGeoReportAlternative(record);

      await this.router.navigate(['/agents', 'geo-report-alternative', 'result'], {
        queryParams: { reportId: record.id },
      });
    } catch (error) {
      this.errorMessage.set(this.toFriendlyErrorMessage(error));
      console.error('Geo report alternative request failed', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  fillExample(): void {
    this.websiteUrl = 'https://www.sistrix.de/';
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
          return 'Die Analyse dauert länger als erwartet. Bitte versuchen Sie es erneut.';
        case 'network':
          return 'Keine Verbindung. Bitte prüfen Sie Ihre Internetverbindung.';
        case 'empty':
          return 'Es konnte kein verwertbarer Bericht erzeugt werden. Bitte versuchen Sie es erneut.';
        default:
          if (error.status === 500) {
            return 'Das System ist gerade nicht erreichbar. Bitte versuchen Sie es in wenigen Minuten erneut.';
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
