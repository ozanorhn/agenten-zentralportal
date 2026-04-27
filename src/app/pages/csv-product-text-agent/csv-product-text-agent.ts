import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  CsvProductTextOutput,
  CsvProductTextRow,
  RunRecord,
} from '../../models/interfaces';
import { NotificationService } from '../../services/notification.service';
import { RunHistoryService } from '../../services/run-history.service';

const CSV_PRODUCT_TEXT_WEBHOOK_PATH = '/webhook/csv-product-descriptions';
const CSV_PRODUCT_TEXT_SESSION_RUN_KEY = 'csv-product-text:last-run';
const CSV_FILE_EXTENSION_PATTERN = /\.csv$/i;
const PREFERRED_COLUMN_ORDER = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Type',
  'Tags',
  'Published',
  'Status',
  'Option1 Name',
  'Option1 Value',
  'Variant SKU',
  'Variant Price',
  'Variant Inventory Tracker',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Variant Weight Unit',
  'SEO Title',
  'SEO Description',
  'id',
  'title',
  'sku',
  'price',
  'category',
  'vendor',
  'tags',
  'seo_description',
  'meta_title',
  'meta_description',
] as const;

function buildWebhookCandidates(path: string): readonly string[] {
  return environment.production
    ? [`/api/n8n${path}`, `${environment.n8nBase}${path}`]
    : [`${environment.n8nBase}${path}`];
}

const CSV_PRODUCT_TEXT_WEBHOOKS = buildWebhookCandidates(CSV_PRODUCT_TEXT_WEBHOOK_PATH);

@Component({
  selector: 'app-csv-product-text-agent',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './csv-product-text-agent.html',
  styleUrl: './csv-product-text-agent.scss',
})
export class CsvProductTextAgentComponent {
  private readonly router = inject(Router);
  private readonly runHistory = inject(RunHistoryService);
  private readonly notifications = inject(NotificationService);

  readonly agentMeta = AGENTS_MAP['csv-produkttext-agent'];

  readonly selectedFile = signal<File | null>(null);
  readonly dragOver = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly statusLabel = signal('Lade eine CSV-Datei hoch und starte dann den Agenten.');

  readonly hasSelectedFile = computed(() => !!this.selectedFile());
  readonly selectedFileName = computed(() => this.selectedFile()?.name ?? 'Noch keine CSV ausgewaehlt');
  readonly selectedFileSize = computed(() => {
    const file = this.selectedFile();
    return file ? this.formatFileSize(file.size) : '–';
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.applyFile(file);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.applyFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    this.errorMessage.set('');
    this.statusLabel.set('CSV entfernt. Du kannst jetzt eine neue Datei auswaehlen.');
  }

  async submit(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const file = this.selectedFile();
    if (!file) {
      this.errorMessage.set('Bitte waehle zuerst eine CSV-Datei aus.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.statusLabel.set('CSV wird an den Produkttext-Service gesendet…');

    try {
      const formData = new FormData();
      formData.append('file', file, file.name);

      const response = await this.callWebhook(
        CSV_PRODUCT_TEXT_WEBHOOKS,
        formData,
        'Der CSV Produkttext-Service',
      );

      this.statusLabel.set('Webhook-Antwort wird verarbeitet…');
      const payload = await this.parseJsonResponse(response);
      const rows = this.normalizeRows(payload);
      const columns = this.buildColumnOrder(rows);
      const runId = `run-${Date.now()}`;

      const output: CsvProductTextOutput = {
        type: 'csv-product-text',
        inputFileName: file.name,
        rowCount: rows.length,
        columns,
        rows,
        downloadFileName: this.buildDownloadFileName(file.name),
        generatedAt: new Date().toISOString(),
      };

      const record: RunRecord = {
        id: runId,
        agentId: 'csv-produkttext-agent',
        agentName: this.agentMeta.name,
        agentIcon: this.agentMeta.icon,
        agentCategory: this.agentMeta.category,
        timestamp: Date.now(),
        inputData: {
          csvFileName: file.name,
        },
        outputSummary: rows.length
          ? `${rows.length} Produktbeschreibungen generiert`
          : 'CSV verarbeitet, aber keine Datensaetze erhalten',
        fullOutput: output,
        tokenCount: Math.max(rows.length * 12, 180),
      };

      this.runHistory.addRun(record);
      this.persistSessionRun(record);
      this.notifications.addNotification({
        agentId: 'csv-produkttext-agent',
        agentName: this.agentMeta.name,
        agentIcon: this.agentMeta.icon,
        message: rows.length
          ? `${this.agentMeta.name} hat ${rows.length} Produkttexte bereitgestellt.`
          : `${this.agentMeta.name} wurde abgeschlossen, aber ohne Datensaetze.`,
        time: 'Gerade eben',
        read: false,
        link: '/agents/csv-produkttext-agent/result',
      });

      this.statusLabel.set(rows.length ? 'CSV-Ergebnis bereit ✓' : 'CSV verarbeitet, aber leer.');

      setTimeout(() => {
        this.router.navigate(['/agents', 'csv-produkttext-agent', 'result'], {
          queryParams: { runId },
        });
      }, 250);
    } catch (error) {
      console.error(error);
      this.errorMessage.set(this.toErrorMessage(error));
      this.statusLabel.set('Etwas ist schiefgelaufen. Bitte versuche es erneut.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private applyFile(file: File | null): void {
    this.errorMessage.set('');

    if (!file) {
      return;
    }

    const looksLikeCsv = file.type === 'text/csv'
      || file.type === 'application/vnd.ms-excel'
      || CSV_FILE_EXTENSION_PATTERN.test(file.name);

    if (!looksLikeCsv) {
      this.errorMessage.set('Bitte lade eine CSV-Datei hoch.');
      return;
    }

    this.selectedFile.set(file);
    this.statusLabel.set('CSV bereit. Du kannst den Agenten jetzt starten.');
  }

  private async callWebhook(
    urls: readonly string[],
    body: FormData,
    label: string,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          body,
        });

        if (response.ok) {
          return response;
        }

        const errorText = await response.clone().text().catch(() => '');
        if (response.status === 404) {
          lastError = /not registered/i.test(errorText)
            ? new Error(`${label} ist aktuell nicht aktiv.`)
            : new Error(`${label} konnte unter ${url} nicht erreicht werden.`);
          continue;
        }

        throw new Error(errorText || `${label} antwortete mit Status ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(`${label} konnte nicht aufgerufen werden.`);
      }
    }

    throw lastError ?? new Error(`${label} konnte nicht aufgerufen werden.`);
  }

  private async parseJsonResponse(response: Response): Promise<unknown> {
    try {
      return await response.clone().json();
    } catch {
      const text = await response.text();
      const parsed = this.tryParseJson(text);
      if (parsed !== null) {
        return parsed;
      }

      throw new Error('Die Webhook-Antwort war kein gueltiges JSON.');
    }
  }

  private normalizeRows(payload: unknown): CsvProductTextRow[] {
    if (Array.isArray(payload)) {
      return payload.flatMap((item) => {
        const row = this.normalizeRow(item);
        return row ? [row] : [];
      });
    }

    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const record = payload as Record<string, unknown>;
    for (const key of ['data', 'items', 'results', 'rows', 'output']) {
      if (Array.isArray(record[key])) {
        return this.normalizeRows(record[key]);
      }
    }

    const single = this.normalizeRow(record);
    return single ? [single] : [];
  }

  private normalizeRow(value: unknown): CsvProductTextRow | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    return { ...(value as Record<string, unknown>) };
  }

  private buildColumnOrder(rows: CsvProductTextRow[]): string[] {
    const discovered = new Set<string>();

    for (const row of rows) {
      for (const key of Object.keys(row)) {
        discovered.add(key);
      }
    }

    const preferred = PREFERRED_COLUMN_ORDER.filter((key) => discovered.has(key));
    const remaining = [...discovered]
      .filter((key) => !preferred.includes(key as typeof PREFERRED_COLUMN_ORDER[number]))
      .sort((left, right) => left.localeCompare(right, 'de'));

    return [...preferred, ...remaining];
  }

  private buildDownloadFileName(inputFileName: string): string {
    const baseName = inputFileName.replace(CSV_FILE_EXTENSION_PATTERN, '') || 'produkttexte';
    return `${baseName}-seo-export.csv`;
  }

  private tryParseJson(value: string): unknown | null {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private toErrorMessage(error: unknown): string {
    const text = error instanceof Error ? error.message : '';
    const parsed = this.tryParseJson(text);
    const record = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
    const backendMessage = typeof record?.['message'] === 'string' ? record['message'] : null;

    if (/CSV Produkttext-Service/.test(text)) {
      return text;
    }

    if (/not registered/i.test(text)) {
      return 'Der CSV Produkttext-Service ist gerade nicht erreichbar. Bitte versuche es in ein paar Minuten erneut.';
    }

    if (backendMessage) {
      return backendMessage;
    }

    return 'Die CSV konnte gerade nicht verarbeitet werden. Bitte pruefe Datei und Inhalt und versuche es erneut.';
  }

  private persistSessionRun(record: RunRecord): void {
    try {
      sessionStorage.setItem(CSV_PRODUCT_TEXT_SESSION_RUN_KEY, JSON.stringify(record));
    } catch {
      // Ignore storage quota issues.
    }
  }
}
