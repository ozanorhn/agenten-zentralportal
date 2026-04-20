import { UpperCasePipe } from '@angular/common';
import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AGENTS_MAP } from '../../data/agents.data';
import {
  ProductTextOutput,
  ProductTextPlatformResult,
  RunRecord,
} from '../../models/interfaces';
import {
  BinaryFileStoreService,
  StoredBinaryFile,
} from '../../services/binary-file-store.service';
import { RunHistoryService } from '../../services/run-history.service';
import { ToastService } from '../../services/toast.service';
import { renderMarkdownToHtml } from '../../utils/markdown.utils';

const PRODUCT_TEXT_SESSION_RUN_KEY = 'product-text:last-run';

interface ProductTextKeyValueEntry {
  key: string;
  value: string;
}

interface ProductTextFaqItem {
  question: string;
  answer: string;
}

type PlatformType = 'amazon' | 'shopify' | 'ebay' | 'shopware' | 'woocommerce';

@Component({
  selector: 'app-product-text-result',
  standalone: true,
  imports: [UpperCasePipe],
  templateUrl: './product-text-result.html',
  styleUrl: './product-text-result.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ProductTextResultComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly runHistory = inject(RunHistoryService);
  private readonly binaryFileStore = inject(BinaryFileStoreService);
  private readonly toastService = inject(ToastService);

  readonly agentId = 'produkttext-agent';
  readonly agentMeta = AGENTS_MAP[this.agentId];
  readonly requestedRunId = this.route.snapshot.queryParamMap.get('runId');

  private readonly _run = signal<RunRecord | null>(this.resolveRun());
  readonly selectedPlatform = signal<PlatformType | null>(null);

  readonly run = this._run.asReadonly();
  readonly output = computed(() => {
    const output = this._run()?.fullOutput;
    if (output?.type !== 'product-text') {
      return null;
    }

    const productOutput = output as ProductTextOutput & {
      responseMeta?: ProductTextOutput['responseMeta'];
      structuredResult?: ProductTextOutput['structuredResult'];
    };
    return {
      ...productOutput,
      inputReference: productOutput.inputReference ?? productOutput.uploadedImageName,
      structuredResult: productOutput.structuredResult ?? null,
      responseMeta: productOutput.responseMeta ?? {
        mode: productOutput.generatedFile ? 'binary' : 'text',
        mimeType: productOutput.generatedFile?.mimeType ?? null,
        descriptionSource: 'none',
        descriptionHeaderName: null,
        fileSource: productOutput.generatedFile ? 'response-body' : 'none',
      },
    } as ProductTextOutput;
  });
  readonly structuredResult = computed(() => this.output()?.structuredResult ?? null);
  readonly seo = computed(() => this.structuredResult()?.seo ?? null);
  readonly tags = computed(() => this.structuredResult()?.tags ?? null);
  readonly contentData = computed(() => this.structuredResult()?.content ?? null);
  readonly schemaData = computed(() => this.structuredResult()?.schema ?? null);
  readonly dataflowSeo = computed(() => this.structuredResult()?.dataflowSeo ?? null);
  readonly hasStructuredResult = computed(() => {
    const sr = this.structuredResult();
    return !!(sr && (sr.seo || sr.content || sr.tags || sr.dataflowSeo || sr.schema));
  });
  readonly inMemoryFile = computed<StoredBinaryFile | null>(() => {
    const run = this._run();
    return run ? this.binaryFileStore.get(run.id) : null;
  });
  readonly fileReady = computed(() => !!this.inMemoryFile() || !!this.output()?.generatedFile?.base64);
  readonly primaryCopyText = computed(() =>
    this.contentData()?.productDescription
    ?? this.contentData()?.intro
    ?? this.output()?.description
    ?? '',
  );
  readonly descriptionLength = computed(() => this.primaryCopyText().trim().length ?? 0);
  readonly platformProductName = computed(() => {
    const r = this.platformResult();
    return r?.amazon?.item_name ?? r?.shopify?.Title ?? r?.shopware?.name ?? r?.woocommerce?.post_title ?? null;
  });
  readonly platformProductDescription = computed(() => {
    const r = this.platformResult();
    return r?.amazon?.item_description ?? r?.shopify?.['Body (HTML)'] ?? r?.woocommerce?.post_excerpt ?? null;
  });
  readonly heroTitle = computed(() =>
    this.seo()?.title
    ?? this.seo()?.h1
    ?? this.platformProductName()
    ?? this.contentData()?.productDescription
    ?? 'Produkttext',
  );
  readonly heroSubtitle = computed(() =>
    this.contentData()?.intro
    ?? this.seo()?.metaDescription
    ?? this.output()?.description
    ?? '',
  );
  readonly generatedPreviewUrl = computed(() => {
    const file = this.inMemoryFile();
    const base64 = file?.base64 ?? this.output()?.generatedFile?.base64;
    const mimeType = file?.mimeType ?? this.output()?.generatedFile?.mimeType ?? this.output()?.responseMeta.mimeType;

    if (!base64 || !mimeType?.startsWith('image/')) {
      return null;
    }

    return `data:${mimeType};base64,${base64}`;
  });
  readonly renderedPrimaryText = computed((): SafeHtml | null => {
    const content = this.primaryCopyText();
    if (!content.trim()) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdownToHtml(content));
  });
  readonly openGraphEntries = computed<ProductTextKeyValueEntry[]>(() =>
    this.toKeyValueEntries(this.structuredResult()?.openGraph ?? {}),
  );
  readonly twitterCardEntries = computed<ProductTextKeyValueEntry[]>(() =>
    this.toKeyValueEntries(this.structuredResult()?.twitterCard ?? {}),
  );
  readonly specificationEntries = computed<ProductTextKeyValueEntry[]>(() =>
    this.toUnknownEntries(this.contentData()?.specifications ?? {}),
  );
  readonly schemaProductJson = computed(() => this.prettyJson(this.schemaData()?.product));
  readonly schemaBreadcrumbJson = computed(() => this.prettyJson(this.schemaData()?.breadcrumb));
  readonly schemaFaqJson = computed(() => this.prettyJson(this.schemaData()?.faqPage));
  readonly faqItems = computed(() => this.extractFaqItems(this.schemaData()?.faqPage));
  readonly formattedGeneratedAt = computed(() => this.formatDateTime(this.structuredResult()?.generatedAt));
  readonly formattedTokensUsed = computed(() => this.formatNumber(this.structuredResult()?.tokensUsed));

  readonly platformResult = computed(() => {
    const output = this.output();
    if (!output?.platformResult) {
      return null;
    }

    // Handle array (normalize to single object if array with one item)
    if (Array.isArray(output.platformResult)) {
      return output.platformResult[0] ?? null;
    }

    return output.platformResult as ProductTextPlatformResult;
  });

  readonly availablePlatforms = computed((): PlatformType[] => {
    const result = this.platformResult();
    if (!result) {
      return [];
    }

    const platforms: PlatformType[] = [];
    if (result.amazon) platforms.push('amazon');
    if (result.shopify) platforms.push('shopify');
    if (result.ebay) platforms.push('ebay');
    if (result.shopware) platforms.push('shopware');
    if (result.woocommerce) platforms.push('woocommerce');
    return platforms;
  });

  readonly effectivePlatform = computed(() =>
    this.selectedPlatform() ?? this.availablePlatforms()[0] ?? null,
  );

  readonly hasPlatformData = computed(() => this.availablePlatforms().length > 0);

  goBack(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  copyDescription(): void {
    const description = this.primaryCopyText();
    if (!description.trim()) {
      this.toastService.show('Kein Produkttext zum Kopieren vorhanden.', 'error');
      return;
    }

    navigator.clipboard.writeText(description).then(() => {
      this.toastService.show('Produkttext kopiert!', 'success');
    }).catch(() => {
      this.toastService.show('Kopieren fehlgeschlagen.', 'error');
    });
  }

  copyField(value: string, label: string): void {
    if (!value?.trim()) {
      return;
    }
    navigator.clipboard.writeText(value).then(() => {
      this.toastService.show(`${label} kopiert!`, 'success');
    }).catch(() => {
      this.toastService.show('Kopieren fehlgeschlagen.', 'error');
    });
  }

  downloadGeneratedFile(): void {
    const file = this.resolveDownloadableFile();
    if (!file) {
      this.toastService.show('Die zurueckgelieferte Datei ist in dieser Sitzung nicht mehr verfuegbar.', 'error');
      return;
    }

    this.downloadBlob(file.blob, file.fileName);
    this.toastService.show('Datei wird heruntergeladen…', 'info');
  }

  downloadDescription(): void {
    const description = this.primaryCopyText();
    if (!description.trim()) {
      this.toastService.show('Kein Produkttext zum Download vorhanden.', 'error');
      return;
    }

    const blob = new Blob([description], { type: 'text/plain;charset=utf-8' });
    this.downloadBlob(blob, `produkttext-${Date.now()}.txt`);
    this.toastService.show('Produkttext wird heruntergeladen…', 'info');
  }

  formatFileSize(bytes: number | null | undefined): string {
    if (!bytes) return '–';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  formatNumber(value: number | null | undefined): string {
    return value === null || value === undefined
      ? '–'
      : new Intl.NumberFormat('de-DE').format(value);
  }

  private resolveDownloadableFile(): (StoredBinaryFile & { blob: Blob }) | null {
    const memoryFile = this.inMemoryFile();
    if (memoryFile) {
      if (memoryFile.blob) {
        return memoryFile as StoredBinaryFile & { blob: Blob };
      }

      if (memoryFile.base64) {
        return {
          ...memoryFile,
          blob: this.base64ToBlob(memoryFile.base64, memoryFile.mimeType),
        };
      }
    }

    const persistedFile = this.output()?.generatedFile;
    if (!persistedFile?.base64) {
      return null;
    }

    return {
      blob: this.base64ToBlob(persistedFile.base64, persistedFile.mimeType),
      fileName: persistedFile.fileName,
      mimeType: persistedFile.mimeType,
      size: persistedFile.size,
    };
  }

  private toKeyValueEntries(record: Record<string, string>): ProductTextKeyValueEntry[] {
    return Object.entries(record).map(([key, value]) => ({ key, value }));
  }

  private toUnknownEntries(record: Record<string, unknown>): ProductTextKeyValueEntry[] {
    return Object.entries(record).flatMap(([key, value]) => {
      const normalized = this.stringifyValue(value);
      return normalized ? [{ key, value: normalized }] : [];
    });
  }

  private stringifyValue(value: unknown): string | null {
    if (typeof value === 'string') {
      return value.trim() ? value.trim() : null;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.length ? value.map((item) => this.stringifyValue(item) ?? '').filter(Boolean).join(', ') : null;
    }

    if (value && typeof value === 'object') {
      const entries = this.toUnknownEntries(value as Record<string, unknown>);
      return entries.length ? entries.map((entry) => `${entry.key}: ${entry.value}`).join(' | ') : null;
    }

    return null;
  }

  private prettyJson(value: unknown): string {
    if (!value || typeof value !== 'object' || !Object.keys(value as Record<string, unknown>).length) {
      return '';
    }

    return JSON.stringify(value, null, 2);
  }

  private extractFaqItems(value: Record<string, unknown> | null | undefined): ProductTextFaqItem[] {
    const entities = value?.['mainEntity'];
    if (!Array.isArray(entities)) {
      return [];
    }

    return entities.flatMap((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return [];
      }

      const record = item as Record<string, unknown>;
      const question = typeof record['name'] === 'string' ? record['name'].trim() : '';
      const acceptedAnswer = record['acceptedAnswer'];
      const answerRecord = acceptedAnswer && typeof acceptedAnswer === 'object' && !Array.isArray(acceptedAnswer)
        ? acceptedAnswer as Record<string, unknown>
        : null;
      const answer = typeof answerRecord?.['text'] === 'string' ? answerRecord['text'].trim() : '';

      return question && answer ? [{ question, answer }] : [];
    });
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mimeType });
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  downloadPlatformData(platform: PlatformType): void {
    const result = this.platformResult();
    if (!result || !result[platform]) {
      this.toastService.show(`Keine Daten für ${platform} verfügbar.`, 'error');
      return;
    }

    const data = result[platform] as unknown as Record<string, unknown>;
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${platform}-produktdaten-${timestamp}.json`;
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

    this.downloadBlob(blob, fileName);
    this.toastService.show(`${platform} Daten werden heruntergeladen…`, 'info');
  }

  downloadPlatformDataAsCSV(platform: PlatformType): void {
    const result = this.platformResult();
    if (!result || !result[platform]) {
      this.toastService.show(`Keine Daten für ${platform} verfügbar.`, 'error');
      return;
    }

    const data = result[platform] as unknown as Record<string, unknown>;
    const csv = this.objectToCSV(data);
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `${platform}-produktdaten-${timestamp}.csv`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });

    this.downloadBlob(blob, fileName);
    this.toastService.show(`${platform} Daten (CSV) werden heruntergeladen…`, 'info');
  }

  downloadAllPlatformData(): void {
    const result = this.platformResult();
    if (!result || Object.keys(result).length <= 1) {
      this.toastService.show('Keine Plattformdaten zum Herunterladen verfügbar.', 'error');
      return;
    }

    const allData = {
      success: result.success,
      platforms: {} as Record<string, unknown>,
    };

    const platforms: PlatformType[] = ['amazon', 'shopify', 'ebay', 'shopware', 'woocommerce'];
    platforms.forEach((platform) => {
      if (result[platform]) {
        allData.platforms[platform] = result[platform];
      }
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `produktdaten-alle-plattformen-${timestamp}.json`;
    const jsonString = JSON.stringify(allData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });

    this.downloadBlob(blob, fileName);
    this.toastService.show('Alle Plattformdaten werden heruntergeladen…', 'info');
  }

  private objectToCSV(obj: Record<string, unknown>): string {
    const rows: string[] = [];

    // Header
    const keys = Object.keys(obj);
    rows.push(keys.map((key) => this.escapeCSV(key)).join(','));

    // Values
    const values = keys.map((key) => {
      const value = obj[key];
      const stringValue = this.objectToString(value);
      return this.escapeCSV(stringValue);
    });
    rows.push(values.join(','));

    return rows.join('\n');
  }

  private objectToString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.objectToString(item)).join('; ');
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      return entries.map(([key, val]) => `${key}: ${this.objectToString(val)}`).join(' | ');
    }

    return '';
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  private resolveRun(): RunRecord | null {
    const requested = this.requestedRunId ? this.runHistory.getById(this.requestedRunId) : undefined;
    if (requested) {
      return requested;
    }

    const latest = this.runHistory.getLatestForAgent(this.agentId);
    if (latest) {
      return latest;
    }

    try {
      const raw = sessionStorage.getItem(PRODUCT_TEXT_SESSION_RUN_KEY);
      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as RunRecord;
    } catch {
      return null;
    }
  }
}
