import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CsvProductTextOutput,
  CsvProductTextRow,
  RunRecord,
} from '../../models/interfaces';
import { AGENTS_MAP } from '../../data/agents.data';
import { RunHistoryService } from '../../services/run-history.service';
import { ToastService } from '../../services/toast.service';

const CSV_PRODUCT_TEXT_SESSION_RUN_KEY = 'csv-product-text:last-run';
const PREVIEW_ROW_LIMIT = 25;
const FALLBACK_TABLE_COLUMNS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Type',
  'Tags',
  'Published',
  'Status',
  'Variant SKU',
  'Variant Price',
  'SEO Title',
  'SEO Description',
] as const;
const HTML_PREVIEW_COLUMN = 'Body (HTML)';
const WIDE_COLUMNS = new Set([
  'Body (HTML)',
  'SEO Title',
  'SEO Description',
]);
const COLLAPSED_CELL_CHARACTER_LIMIT = 520;

@Component({
  selector: 'app-csv-product-text-result',
  standalone: true,
  templateUrl: './csv-product-text-result.html',
  styleUrl: './csv-product-text-result.scss',
})
export class CsvProductTextResultComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly runHistory = inject(RunHistoryService);
  private readonly toastService = inject(ToastService);

  readonly agentId = 'csv-produkttext-agent';
  readonly agentMeta = AGENTS_MAP[this.agentId];
  readonly requestedRunId = this.route.snapshot.queryParamMap.get('runId');

  private readonly _run = signal<RunRecord | null>(this.resolveRun());
  private readonly expandedCells = signal<Record<string, boolean>>({});

  readonly run = this._run.asReadonly();
  readonly output = computed(() => {
    const output = this._run()?.fullOutput;
    return output?.type === 'csv-product-text' ? output as CsvProductTextOutput : null;
  });
  readonly rows = computed(() => this.output()?.rows ?? []);
  readonly previewRows = computed(() => this.rows().slice(0, PREVIEW_ROW_LIMIT));
  readonly hasMoreRows = computed(() => this.rows().length > this.previewRows().length);
  readonly tableColumns = computed(() => {
    const outputColumns = this.output()?.columns ?? [];
    if (outputColumns.length) {
      return outputColumns;
    }

    return [...FALLBACK_TABLE_COLUMNS];
  });

  goBack(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  downloadCsv(): void {
    const output = this.output();
    if (!output || !output.rows.length) {
      this.toastService.show('Keine CSV-Daten zum Download vorhanden.', 'error');
      return;
    }

    const csv = this.buildCsv(output.rows, output.columns);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    this.downloadBlob(blob, output.downloadFileName);
    this.toastService.show('CSV wird heruntergeladen…', 'info');
  }

  formatCellValue(column: string, value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '–';
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => this.formatPrimitive(entry))
        .filter((entry) => entry.length > 0)
        .join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    if (column === HTML_PREVIEW_COLUMN) {
      return this.toBodyPreview(String(value));
    }

    return String(value);
  }

  isWideColumn(column: string): boolean {
    return WIDE_COLUMNS.has(column);
  }

  isMultilineColumn(column: string): boolean {
    return column === HTML_PREVIEW_COLUMN;
  }

  getColumnMinWidth(column: string): number {
    switch (column) {
      case 'Handle':
        return 180;
      case 'Title':
        return 220;
      case 'Body (HTML)':
        return 420;
      case 'Vendor':
        return 180;
      case 'Type':
        return 140;
      case 'Tags':
        return 220;
      case 'Published':
      case 'Status':
        return 120;
      case 'Option1 Name':
      case 'Option1 Value':
        return 160;
      case 'Variant SKU':
        return 170;
      case 'Variant Price':
        return 130;
      case 'SEO Title':
        return 320;
      case 'SEO Description':
        return 380;
      default:
        return 180;
    }
  }

  isNoWrapColumn(column: string): boolean {
    return new Set([
      'Handle',
      'Vendor',
      'Type',
      'Published',
      'Status',
      'Option1 Name',
      'Option1 Value',
      'Variant SKU',
      'Variant Price',
    ]).has(column);
  }

  shouldShowExpandButton(column: string, value: unknown): boolean {
    const text = this.formatCellValue(column, value);
    return text !== '–' && text.length > COLLAPSED_CELL_CHARACTER_LIMIT;
  }

  isCellExpanded(index: number, row: CsvProductTextRow, column: string): boolean {
    return !!this.expandedCells()[this.buildCellKey(index, row, column)];
  }

  toggleCellExpanded(index: number, row: CsvProductTextRow, column: string): void {
    const key = this.buildCellKey(index, row, column);
    this.expandedCells.update((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '–';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  trackRow(index: number, row: CsvProductTextRow): string | number {
    return this.resolveRowKey(index, row);
  }

  private resolveRun(): RunRecord | null {
    if (this.requestedRunId) {
      const byId = this.runHistory.getById(this.requestedRunId);
      if (byId?.fullOutput.type === 'csv-product-text') {
        return byId;
      }
    }

    const latest = this.runHistory.getLatestForAgent(this.agentId);
    if (latest?.fullOutput.type === 'csv-product-text') {
      return latest;
    }

    try {
      const raw = sessionStorage.getItem(CSV_PRODUCT_TEXT_SESSION_RUN_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as RunRecord;
      return parsed.fullOutput.type === 'csv-product-text' ? parsed : null;
    } catch {
      return null;
    }
  }

  private buildCsv(rows: CsvProductTextRow[], columns: string[]): string {
    const resolvedColumns = columns.length ? columns : this.collectColumns(rows);
    const headerLine = resolvedColumns.map((column) => this.escapeCsvValue(column)).join(';');
    const dataLines = rows.map((row) =>
      resolvedColumns
        .map((column) => this.escapeCsvValue(this.toCsvCell(row[column])))
        .join(';'),
    );

    return [headerLine, ...dataLines].join('\n');
  }

  private collectColumns(rows: CsvProductTextRow[]): string[] {
    const keys = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        keys.add(key);
      }
    }
    return [...keys];
  }

  private toCsvCell(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => this.formatPrimitive(entry))
        .filter((entry) => entry.length > 0)
        .join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private formatPrimitive(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private stripHtml(value: string): string {
    return value
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, '\'')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private toBodyPreview(value: string): string {
    return value
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(h1|h2|h3|h4|h5|h6|p|div|section|article)>/gi, '\n\n')
      .replace(/<(ul|ol)[^>]*>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/(ul|ol)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, '\'')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  private buildCellKey(index: number, row: CsvProductTextRow, column: string): string {
    const rowKey = this.resolveRowKey(index, row);
    return `${rowKey}::${column}`;
  }

  private resolveRowKey(index: number, row: CsvProductTextRow): string | number {
    return (row['id'] as string | number | null | undefined)
      ?? (row['sku'] as string | number | null | undefined)
      ?? (row['Variant SKU'] as string | number | null | undefined)
      ?? (row['Handle'] as string | number | null | undefined)
      ?? index;
  }

  private escapeCsvValue(value: string): string {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
