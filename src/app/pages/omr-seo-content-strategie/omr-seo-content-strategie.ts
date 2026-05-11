import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  OmrSeoContentStrategieInput,
  saveOmrSeoContentStrategieReport,
  StoredOmrSeoContentStrategieReport,
} from './omr-seo-content-strategie.models';

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
  selector: 'app-seo-content-strategie',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './omr-seo-content-strategie.html',
})
export class OmrSeoContentStrategieComponent {
  private readonly router = inject(Router);

  readonly environment = environment;
  readonly agentMeta = AGENTS_MAP['seo-content-strategie'];

  topic = '';
  audience = '';
  offer = '';
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');

  async submit(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const payload = this.normalizeInput();
    if (!payload) {
      this.errorMessage.set('Bitte fuelle Thema, Zielgruppe und Offer aus.');
      return;
    }

    this.topic = payload.topic;
    this.audience = payload.audience;
    this.offer = payload.offer;
    this.errorMessage.set('');
    this.isSubmitting.set(true);

    try {
      const response = await this.fetchWithTimeout(
        environment.contentOpportunityWebhookUrl,
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
        console.error('SEO Content Strategie webhook error', {
          status: response.status,
          url: environment.contentOpportunityWebhookUrl,
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

      const record: StoredOmrSeoContentStrategieReport = {
        id: `seo-content-strategie-${Date.now()}`,
        createdAt: Date.now(),
        input: payload,
        parsedResponse,
        rawResponse,
      };

      saveOmrSeoContentStrategieReport(record);

      await this.router.navigate(['/agents', 'seo-content-strategie', 'result'], {
        queryParams: { reportId: record.id },
      });
    } catch (error) {
      this.errorMessage.set(this.toFriendlyErrorMessage(error));
      console.error('SEO Content Strategie request failed', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  fillExample(): void {
    this.topic = 'KI-gestuetzte Prozessautomatisierung im B2B-Marketing';
    this.audience = 'Marketing-Leitung und Geschaeftsfuehrung in B2B-Software-Unternehmen';
    this.offer = 'Strategische Einfuehrung von KI-Systemen fuer Marketing- und Sales-Teams inklusive Enablement und operativem Rollout';
    this.errorMessage.set('');
  }

  payloadPreview(): string {
    return JSON.stringify(
      {
        topic: this.topic || '...',
        audience: this.audience || '...',
        offer: this.offer || '...',
      },
      null,
      2,
    );
  }

  private normalizeInput(): OmrSeoContentStrategieInput | null {
    const topic = this.topic.trim();
    const audience = this.audience.trim();
    const offer = this.offer.trim();

    if (!topic || !audience || !offer) {
      return null;
    }

    return { topic, audience, offer };
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
          return 'Die Analyse dauert länger als erwartet. Bitte versuchen Sie es erneut.';
        case 'network':
          return 'Keine Verbindung. Bitte prüfen Sie Ihre Internetverbindung.';
        case 'empty':
          return 'Es konnte kein verwertbares Ergebnis erzeugt werden. Bitte versuchen Sie es erneut.';
        default:
          if (error.status === 404) {
            return 'Das System ist gerade nicht verfügbar. Bitte versuchen Sie es später erneut.';
          }

          if (error.status === 500) {
            return 'Das System ist gerade nicht erreichbar. Bitte versuchen Sie es in wenigen Minuten erneut.';
          }

          return 'Der SEO-Strategie-Planer konnte nicht gestartet werden. Bitte versuchen Sie es erneut.';
      }
    }

    return 'Der SEO-Strategie-Planer konnte nicht gestartet werden. Bitte versuche es erneut.';
  }
}
