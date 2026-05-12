import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AgentRunContextService } from '../../services/agent-run-context.service';
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
  'Prüfen Sie Marken-Autorität und E-E-A-T Signale...',
  'Extrahiere strukturierte Daten und FAQ-Sektionen...',
  'Berechne GEO-Score für KI-Plattformen...',
  'Generiere finalen Optimierungs-Bericht...',
] as const;

@Component({
  selector: 'app-seo-geo-assistant-nollm',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './seo-geo-assistant-nollm.html',
})
export class SeoGeoAssistantNoLlmComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly runCtx = inject(AgentRunContextService);
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

  // --- UI KLASSEN FÜR DAS HTML ---
  readonly inputClass = 'w-full rounded-2xl border-0 bg-surface-container-highest px-4 py-4 pl-12 text-sm text-on-surface placeholder:text-on-surface-variant/30 focus:ring-1 focus:ring-[#0070FF] focus:shadow-[0_0_8px_rgba(0,112,255,0.3)]';
  readonly labelClass = 'block text-[10px] font-bold uppercase tracking-[0.22em] text-outline';
  readonly iconClass = 'material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50';
  readonly panelClass = 'glass-panel kinetic-border rounded-[2rem] border border-outline-variant/20 bg-surface-container';

  // --- STATISCHE OVERLAY KLASSEN ---
  readonly backdropClass = 'fixed inset-0 z-50 flex items-center justify-center bg-[rgba(241,245,249,0.84)] px-4 py-4 backdrop-blur-md dark:bg-[#041226]/78';
  readonly modalClass = 'relative w-full max-w-[44rem] overflow-hidden rounded-[2rem] border border-[#d6e2f0] bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_100%)] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(4,18,38,0.98),rgba(10,34,67,0.96))] dark:shadow-[0_24px_100px_rgba(0,0,0,0.45)] sm:p-5 md:p-6';
  readonly glowClass = 'pointer-events-none absolute inset-x-10 top-0 h-32 rounded-full bg-[#0070FF]/12 blur-3xl dark:bg-[#0070FF]/20';
  readonly progressBarClass = 'h-full rounded-full bg-[linear-gradient(90deg,#60a5fa_0%,#0070FF_55%,#38bdf8_100%)] transition-[width] duration-[1200ms] ease-out';

  // --- DYNAMISCHE OVERLAY LOGIK ---
  getStepContainerClass(index: number): string {
    const base = 'flex items-center gap-3 rounded-[1.25rem] border px-3 py-2.5 transition-all duration-500 ';
    if (index < this.activeStepIndex() || this.overlayCompleted()) {
      return base + 'border-emerald-200 bg-emerald-50/85 dark:border-[#93c5fd]/45 dark:bg-[#0d3f84]/28';
    }
    if (index === this.activeStepIndex() && !this.overlayCompleted()) {
      return base + 'border-[#9bc5ff] bg-[#eef6ff] shadow-[0_0_0_1px_rgba(0,112,255,0.08),0_14px_30px_rgba(0,112,255,0.12)] dark:border-[#7dd3fc]/60 dark:bg-[#0b4ea8]/28 dark:shadow-[0_0_0_1px_rgba(125,211,252,0.12),0_0_24px_rgba(0,112,255,0.16)]';
    }
    return base + 'border-[#d6e2f0] bg-white/72 dark:border-white/10 dark:bg-white/5';
  }

  getStepIconClass(index: number): string {
    const base = 'inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[1rem] border text-xs font-black md:h-8 md:w-8 md:text-sm ';
    if (index < this.activeStepIndex() || this.overlayCompleted()) {
      return base + 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-[#93c5fd]/50 dark:bg-[#35c2ff]/15 dark:text-[#dbeafe]';
    }
    if (index === this.activeStepIndex() && !this.overlayCompleted()) {
      return base + 'border-[#9bc5ff] bg-[#dcebff] text-[#0A4FB7] dark:border-[#7dd3fc]/65 dark:bg-[#0070FF]/25 dark:text-white';
    }
    return base + 'border-[#d6e2f0] bg-white/80 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-blue-100/55';
  }

  getTextClass(index: number, isTitle: boolean): string {
    const isDoneOrActive = index <= this.activeStepIndex() || this.overlayCompleted();
    if (isTitle) {
      return isDoneOrActive ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-blue-100/55';
    }
    return isDoneOrActive ? 'text-slate-600 dark:text-blue-100/65' : 'text-slate-400 dark:text-blue-100/40';
  }

  getStepStatusLabel(index: number): string {
    if (index < this.activeStepIndex() || this.overlayCompleted()) {
      return 'Fertig';
    }
    if (index === this.activeStepIndex()) {
      return 'Läuft';
    }
    return 'Wartet';
  }

  getStepStatusBadgeClass(index: number): string {
    const base = 'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ';
    if (index < this.activeStepIndex() || this.overlayCompleted()) {
      return base + 'bg-emerald-100 text-emerald-800 dark:bg-[#35c2ff]/15 dark:text-[#dbeafe]';
    }
    if (index === this.activeStepIndex() && !this.overlayCompleted()) {
      return base + 'bg-[#dcebff] text-[#0A4FB7] dark:bg-[#0070FF]/25 dark:text-white';
    }
    return base + 'bg-[#eef2f7] text-[#6b7f99] dark:bg-white/8 dark:text-blue-100/55';
  }

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
        ...this.runCtx.buildContext('seo-geo-analyse-assistent-nollm'),
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

      const secondaryQuickWinsRequestBody = parsedResponse ?? payload;
      const record: StoredSeoGeoReport = {
        id: `seo-geo-nollm-${Date.now()}`,
        createdAt: Date.now(),
        payload: {
          ...payload,
          secondaryQuickWinsLoading: true,
          secondaryQuickWinsRequested: false,
          secondaryQuickWinsRequestBody,
        },
      };

      saveSeoGeoReport(record);
      // Hinweis: agent_runs-Insert macht n8n am Workflow-Ende — wir senden nur den Lauf-Kontext mit.
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
          return 'Die Analyse dauert länger als erwartet. Bitte versuchen Sie es erneut.';
        case 'network':
          return 'Keine Verbindung. Bitte prüfen Sie Ihre Internetverbindung.';
        case 'empty':
          return 'Es konnte keine verwertbare Analyse erzeugt werden. Bitte versuchen Sie es erneut.';
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
