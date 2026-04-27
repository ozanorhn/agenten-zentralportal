import { NgClass } from '@angular/common';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import {
  extractGeoWebhookResult,
  sanitizeNoLlmGeoWebhookResult,
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
const OVERLAY_STEP_ADVANCE_MS = 4_000;
const OVERLAY_SUCCESS_HOLD_MS = 320;
const OVERLAY_PROGRESS_STOPS = [18, 36, 58, 78, 92] as const;
const ANALYSIS_STEPS = [
  'Analysiere Website-Struktur und Crawler-Zugriff...',
  'Prüfe Marken-Autorität und E-E-A-T Signale...',
  'Extrahiere strukturierte Daten und FAQ-Sektionen...',
  'Berechne GEO-Score für KI-Plattformen...',
  'Generiere finalen Optimierungs-Bericht...',
] as const;

@Component({
  selector: 'app-seo-geo-assistant-nollm',
  standalone: true,
  imports: [FormsModule, RouterLink, NgClass],
  templateUrl: './seo-geo-assistant-nollm.html',
})
export class SeoGeoAssistantNoLlmComponent implements OnDestroy {
  private readonly router = inject(Router);
  private overlayStepTimerId: number | null = null;

  readonly environment = environment;
  readonly analysisSteps = ANALYSIS_STEPS;
  readonly websiteTypes = ['Produktseite', 'Landingpage', 'Blog'] as const;

  websiteUrl = '';
  brand = '';
  industry = '';
  location = 'Deutschland';
  websiteType = '';

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly showLoadingOverlay = signal(false);
  readonly overlayCompleted = signal(false);
  readonly activeStepIndex = signal(0);
  readonly overlayProgress = signal(0);

  ngOnDestroy(): void {
    this.resetLoadingOverlay();
  }

  async submit(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const normalizedUrl = this.normalizeUrl(this.websiteUrl);
    if (!normalizedUrl) {
      this.errorMessage.set('Bitte gib eine gültige Website-URL ein.');
      return;
    }

    if (!this.websiteType.trim()) {
      this.errorMessage.set('Bitte wähle einen Webseitentyp aus.');
      return;
    }

    this.websiteUrl = normalizedUrl;
    this.errorMessage.set('');
    this.isSubmitting.set(true);
    this.startLoadingOverlay();

    let navigationSucceeded = false;

    try {
      const requestBody = {
        url: normalizedUrl,
        brand: this.brand.trim(),
        industry: this.industry.trim(),
        location: this.location.trim() || 'Deutschland',
        websiteType: this.websiteType.trim(),
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
      const parsedResponse = this.parseJson(rawResponse);

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

      const payload = sanitizeNoLlmGeoWebhookResult(extractGeoWebhookResult(parsedResponse));
      if (!payload) {
        throw new RequestError('empty', response.status, rawResponse);
      }

      const record: StoredSeoGeoReport = {
        id: `seo-geo-nollm-${Date.now()}`,
        createdAt: Date.now(),
        payload: {
          ...payload,
          secondaryQuickWinsLoading: true,
          secondaryQuickWinsRequested: false,
          secondaryQuickWinsRequestBody: requestBody,
        },
      };

      saveSeoGeoReport(record);
      await this.showOverlayCompletedState();

      navigationSucceeded = await this.router.navigate(['/agents', 'seo-geo-analyse-assistent-nollm', 'result'], {
        queryParams: { reportId: record.id },
      });

      if (!navigationSucceeded) {
        throw new Error('navigation_failed');
      }
    } catch (error) {
      this.resetLoadingOverlay();
      this.errorMessage.set(this.toFriendlyErrorMessage(error));
      console.error('SEO/GEO NoLLM form request failed', error);
    } finally {
      if (!navigationSucceeded) {
        this.resetLoadingOverlay();
      }
      this.isSubmitting.set(false);
    }
  }

  fillExample(): void {
    this.websiteUrl = 'https://www.sistrix.de/';
    this.brand = 'SISTRIX';
    this.industry = 'SEO-Software';
    this.location = 'Deutschland';
    this.websiteType = 'Landingpage';
  }

  private startLoadingOverlay(): void {
    this.clearOverlayTimer();
    this.showLoadingOverlay.set(true);
    this.overlayCompleted.set(false);
    this.activeStepIndex.set(0);
    this.overlayProgress.set(OVERLAY_PROGRESS_STOPS[0]);
    this.scheduleNextOverlayStep();
  }

  private scheduleNextOverlayStep(): void {
    this.clearOverlayTimer();

    this.overlayStepTimerId = window.setTimeout(() => {
      if (!this.isSubmitting()) {
        this.clearOverlayTimer();
        return;
      }

      const currentStep = this.activeStepIndex();
      const lastStepIndex = this.analysisSteps.length - 1;
      if (currentStep >= lastStepIndex) {
        this.overlayProgress.set(OVERLAY_PROGRESS_STOPS[lastStepIndex] ?? 92);
        this.clearOverlayTimer();
        return;
      }

      const nextStep = currentStep + 1;
      this.activeStepIndex.set(nextStep);
      this.overlayProgress.set(OVERLAY_PROGRESS_STOPS[nextStep] ?? 92);

      if (nextStep < lastStepIndex) {
        this.scheduleNextOverlayStep();
      } else {
        this.clearOverlayTimer();
      }
    }, OVERLAY_STEP_ADVANCE_MS);
  }

  private resetLoadingOverlay(): void {
    this.clearOverlayTimer();
    this.showLoadingOverlay.set(false);
    this.overlayCompleted.set(false);
    this.activeStepIndex.set(0);
    this.overlayProgress.set(0);
  }

  private clearOverlayTimer(): void {
    if (this.overlayStepTimerId !== null) {
      window.clearTimeout(this.overlayStepTimerId);
      this.overlayStepTimerId = null;
    }
  }

  private async showOverlayCompletedState(): Promise<void> {
    this.clearOverlayTimer();
    this.overlayCompleted.set(true);
    this.activeStepIndex.set(this.analysisSteps.length - 1);
    this.overlayProgress.set(100);
    await this.wait(OVERLAY_SUCCESS_HOLD_MS);
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

  private wait(durationMs: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, durationMs));
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
