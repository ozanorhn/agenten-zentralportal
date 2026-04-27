import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AGENTS_MAP } from '../../data/agents.data';
import { ProductTextOutput, ProductTextPlatformResult, RunRecord } from '../../models/interfaces';
import { NotificationService } from '../../services/notification.service';
import { RunHistoryService } from '../../services/run-history.service';
import {
  BinaryFileStoreService,
  StoredBinaryFile,
} from '../../services/binary-file-store.service';

const PRODUCT_TEXT_WEBHOOK_PATH = '/webhook/seo-product-description';
const MAX_PERSISTED_BINARY_BYTES = 3_500_000;
const PRODUCT_TEXT_SESSION_RUN_KEY = 'product-text:last-run';

function buildWebhookCandidates(path: string): readonly string[] {
  return environment.production
    ? [`/api/n8n${path}`, `${environment.n8nBase}${path}`]
    : [`${environment.n8nBase}${path}`];
}

const PRODUCT_TEXT_WEBHOOKS = buildWebhookCandidates(PRODUCT_TEXT_WEBHOOK_PATH);

type ProductTextInputMode = 'productUrl' | 'imageUrl';

interface ProductTextRequestPayload {
  productUrl?: string;
  imageUrl?: string;
  description?: string;
}

interface PreparedProductTextRequest {
  body: ProductTextRequestPayload | FormData;
  requestKind: 'json' | 'multipart';
  inputReference: string;
}

interface ParsedBinaryFile {
  blob: Blob;
  fileName: string;
  mimeType: string;
  size: number;
}

interface ParsedBinaryMeta {
  fileName: string;
  mimeType: string;
  size: number;
}

interface ParsedHeaderDescription {
  value: string;
  headerName: string;
}

interface ParsedProductTextResponse {
  description: string;
  file: ParsedBinaryFile | null;
  fileMeta: ParsedBinaryMeta | null;
  fileBase64: string | null;
  structuredResult: ProductTextOutput['structuredResult'];
  platformResult: ProductTextOutput['platformResult'];
  mode: ProductTextOutput['responseMeta']['mode'];
  mimeType: string | null;
  descriptionSource: ProductTextOutput['responseMeta']['descriptionSource'];
  descriptionHeaderName: string | null;
  fileSource: ProductTextOutput['responseMeta']['fileSource'];
}

@Component({
  selector: 'app-product-text-agent',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './product-text-agent.html',
  styleUrl: './product-text-agent.scss',
})
export class ProductTextAgentComponent {
  private readonly router = inject(Router);
  private readonly runHistory = inject(RunHistoryService);
  private readonly notifications = inject(NotificationService);
  private readonly binaryFileStore = inject(BinaryFileStoreService);

  readonly agentMeta = AGENTS_MAP['produkttext-agent'];

  readonly inputMode = signal<ProductTextInputMode>('productUrl');
  readonly productUrl = signal('');
  readonly selectedImage = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly dragOver = signal(false);
  readonly description = signal('');
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly statusLabel = signal('Gib eine Produkt-URL ein oder lade ein Bild hoch und starte dann den Agenten.');
  readonly isUrlMode = computed(() => this.inputMode() === 'productUrl');
  readonly isImageMode = computed(() => this.inputMode() === 'imageUrl');
  readonly hasSelectedImage = computed(() => !!this.selectedImage());
  readonly selectedImageName = computed(() => this.selectedImage()?.name ?? 'Noch kein Bild ausgewählt');
  readonly selectedImageSize = computed(() => {
    const file = this.selectedImage();
    return file ? this.formatFileSize(file.size) : '–';
  });

  ngOnDestroy(): void {
    this.revokePreviewUrl();
  }

  setInputMode(mode: ProductTextInputMode): void {
    if (this.inputMode() === mode) {
      return;
    }

    this.inputMode.set(mode);
    this.errorMessage.set('');
    this.statusLabel.set(
      mode === 'productUrl'
        ? 'URL-Modus aktiv. Du kannst jetzt eine Produktseite einfügen.'
        : 'Bild-Modus aktiv. Du kannst jetzt ein Produktbild hochladen.',
    );
  }

  updateProductUrl(value: string): void {
    this.productUrl.set(value);
    this.errorMessage.set('');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.applyImageFile(file);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    this.applyImageFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  updateDescription(value: string): void {
    this.description.set(value);
  }

  clearSelectedImage(): void {
    this.selectedImage.set(null);
    this.revokePreviewUrl();
    this.errorMessage.set('');
    this.statusLabel.set('Bild entfernt. Du kannst ein neues Produktbild auswählen.');
  }

  clearForm(): void {
    this.productUrl.set('');
    this.selectedImage.set(null);
    this.revokePreviewUrl();
    this.dragOver.set(false);
    this.description.set('');
    this.errorMessage.set('');
    this.statusLabel.set('Gib eine Produkt-URL ein oder lade ein Bild hoch und starte dann den Agenten.');
  }

  async submit(): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    const preparedRequest = await this.buildRequestPayload();
    if (!preparedRequest) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.statusLabel.set(
      this.isUrlMode()
        ? 'Produktseite wird analysiert…'
        : 'Produktbild wird hochgeladen…',
    );

    try {
      const response = await this.callWebhook(
        PRODUCT_TEXT_WEBHOOKS,
        preparedRequest.body,
        preparedRequest.requestKind,
        'Der Produkttext-Service',
      );

      this.statusLabel.set('Ergebnis wird aufbereitet…');
      const parsed = await this.parseWebhookResponse(response, preparedRequest.inputReference);
      const runId = `run-${Date.now()}`;

      if (parsed.file) {
        const storedFile: StoredBinaryFile = {
          blob: parsed.file.blob,
          fileName: parsed.file.fileName,
          mimeType: parsed.file.mimeType,
          size: parsed.file.size,
          base64: parsed.file.size <= MAX_PERSISTED_BINARY_BYTES ? parsed.fileBase64 ?? undefined : undefined,
        };
        this.binaryFileStore.set(runId, storedFile);
      } else if (parsed.fileBase64 && parsed.fileMeta) {
        this.binaryFileStore.set(runId, {
          fileName: parsed.fileMeta.fileName,
          mimeType: parsed.fileMeta.mimeType,
          size: parsed.fileMeta.size,
          base64: parsed.fileBase64,
        });
      }

      this.statusLabel.set('Ergebnis wird gespeichert…');
      const output = await this.buildOutput(parsed, preparedRequest.inputReference);
      const record: RunRecord = {
        id: runId,
        agentId: 'produkttext-agent',
        agentName: this.agentMeta.name,
        agentIcon: this.agentMeta.icon,
        agentCategory: this.agentMeta.category,
        timestamp: Date.now(),
        inputData: {
          productReference: preparedRequest.inputReference,
        },
        outputSummary: output.structuredResult?.seo?.title
          ?? output.structuredResult?.seo?.h1
          ?? (output.platformResult as ProductTextPlatformResult | null | undefined)?.amazon?.item_name
          ?? (output.platformResult as ProductTextPlatformResult | null | undefined)?.shopify?.Title
          ?? output.generatedFile?.fileName
          ?? 'Produkttext generiert',
        fullOutput: output,
        tokenCount: output.structuredResult?.tokensUsed ?? (Math.floor(Math.random() * 450) + 250),
      };

      this.runHistory.addRun(record);
      this.persistSessionRun(record);
      this.notifications.addNotification({
        agentId: 'produkttext-agent',
        agentName: this.agentMeta.name,
        agentIcon: this.agentMeta.icon,
        message: parsed.file
          ? `${this.agentMeta.name} hat Produkttext und eine zusätzliche Datei bereitgestellt.`
          : `${this.agentMeta.name} hat einen Produkttext bereitgestellt.`,
        time: 'Gerade eben',
        read: false,
        link: '/agents/produkttext-agent/result',
      });

      this.statusLabel.set(parsed.file ? 'Produkttext und Datei bereit ✓' : 'Produkttext bereit ✓');

      setTimeout(() => {
        this.router.navigate(['/agents', 'produkttext-agent', 'result'], {
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

  private applyImageFile(file: File | null): void {
    this.errorMessage.set('');

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Bitte lade ein Bild hoch. Andere Dateitypen werden hier nicht verarbeitet.');
      return;
    }

    this.selectedImage.set(file);
    this.updatePreviewUrl(file);
    this.statusLabel.set('Bild bereit. Du kannst den Agenten jetzt starten.');
  }

  private updatePreviewUrl(file: File): void {
    this.revokePreviewUrl();
    this.previewUrl.set(URL.createObjectURL(file));
  }

  private revokePreviewUrl(): void {
    const current = this.previewUrl();
    if (current) {
      URL.revokeObjectURL(current);
      this.previewUrl.set(null);
    }
  }

  private async buildRequestPayload(): Promise<PreparedProductTextRequest | null> {
    const mode = this.inputMode();
    const trimmedDescription = this.description().trim();

    if (mode === 'productUrl') {
      const trimmedValue = this.productUrl().trim();
      if (!trimmedValue) {
        this.errorMessage.set('Bitte gib eine Produkt-URL ein.');
        return null;
      }

      if (!this.isValidHttpUrl(trimmedValue)) {
        this.errorMessage.set('Die URL muss mit http:// oder https:// beginnen.');
        return null;
      }

      const payload: ProductTextRequestPayload = { productUrl: trimmedValue };
      if (trimmedDescription) {
        payload.description = trimmedDescription;
      }

      return {
        body: payload,
        requestKind: 'json',
        inputReference: trimmedValue,
      };
    }

    const file = this.selectedImage();
    if (!file) {
      this.errorMessage.set('Bitte füge ein Produktbild hinzu.');
      return null;
    }

    const formData = new FormData();
    formData.append('file', file, file.name);
    if (trimmedDescription) {
      formData.append('description', trimmedDescription);
    }

    return {
      body: formData,
      requestKind: 'multipart',
      inputReference: file.name,
    };
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private async buildOutput(
    parsed: ParsedProductTextResponse,
    inputReference: string,
  ): Promise<ProductTextOutput> {
    const fallbackDescription = parsed.file
      ? 'Die Datei wurde erfolgreich zurueckgeliefert, aber es wurde kein lesbarer Produkttext gefunden.'
      : 'Es wurde keine lesbare Produktbeschreibung gefunden.';

    let generatedFile: ProductTextOutput['generatedFile'] = null;

    if (parsed.file) {
      const base64 = parsed.fileBase64
        ?? (parsed.file.size <= MAX_PERSISTED_BINARY_BYTES
          ? await this.blobToBase64(parsed.file.blob)
          : undefined);

      generatedFile = {
        fileName: parsed.file.fileName,
        mimeType: parsed.file.mimeType,
        size: parsed.file.size,
        base64,
        persisted: !!base64,
      };
    } else if (parsed.fileMeta) {
      generatedFile = {
        fileName: parsed.fileMeta.fileName,
        mimeType: parsed.fileMeta.mimeType,
        size: parsed.fileMeta.size,
        base64: parsed.fileBase64 && parsed.fileMeta.size <= MAX_PERSISTED_BINARY_BYTES
          ? parsed.fileBase64
          : undefined,
        persisted: !!(parsed.fileBase64 && parsed.fileMeta.size <= MAX_PERSISTED_BINARY_BYTES),
      };
    }

    return {
      type: 'product-text',
      description: parsed.description || fallbackDescription,
      inputReference,
      uploadedImageName: inputReference,
      generatedFile,
      structuredResult: parsed.structuredResult,
      platformResult: parsed.platformResult ?? null,
      responseMeta: {
        mode: parsed.mode,
        mimeType: parsed.mimeType,
        descriptionSource: parsed.descriptionSource,
        descriptionHeaderName: parsed.descriptionHeaderName,
        fileSource: generatedFile ? parsed.fileSource : 'none',
      },
    };
  }

  private async parseWebhookResponse(
    response: Response,
    inputReference: string,
  ): Promise<ParsedProductTextResponse> {
    const multipart = await this.tryParseMultipartResponse(response.clone(), inputReference);
    if (multipart) {
      return multipart;
    }

    const textual = await this.tryParseTextualResponse(response.clone(), inputReference);
    if (textual) {
      return textual;
    }

    const file = await this.extractBinaryFile(response, inputReference);
    const headerDescription = this.extractDescriptionHeader(response.headers);
    return {
      description: headerDescription?.value ?? '',
      file,
      fileMeta: file
        ? {
            fileName: file.fileName,
            mimeType: file.mimeType,
            size: file.size,
          }
        : null,
      fileBase64: null,
      structuredResult: null,
      platformResult: null,
      mode: file ? 'binary' : 'empty',
      mimeType: file?.mimeType ?? (response.headers.get('content-type')?.split(';')[0]?.trim() ?? null),
      descriptionSource: headerDescription ? 'header' : 'none',
      descriptionHeaderName: headerDescription?.headerName ?? null,
      fileSource: file ? 'response-body' : 'none',
    };
  }

  private async tryParseMultipartResponse(
    response: Response,
    inputReference: string,
  ): Promise<ParsedProductTextResponse | null> {
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.startsWith('multipart/')) {
      return null;
    }

    try {
      const headerDescription = this.extractDescriptionHeader(response.headers);
      const formData = await response.formData();
      let description = '';
      let file: ParsedBinaryFile | null = null;

      for (const [, value] of formData.entries()) {
        if (typeof value === 'string') {
          if (!description && this.isReadableText(value)) {
            description = value.trim();
          }
          continue;
        }

        if (!file) {
          file = {
            blob: value,
            fileName: value.name || this.buildDownloadName(inputReference, value.type),
            mimeType: value.type || 'application/octet-stream',
            size: value.size,
          };
        }
      }

      return {
        description: description || headerDescription?.value || '',
        file,
        fileMeta: file
          ? {
              fileName: file.fileName,
              mimeType: file.mimeType,
              size: file.size,
            }
          : null,
        fileBase64: null,
        structuredResult: null,
        platformResult: null,
        mode: 'multipart',
        mimeType: file?.mimeType ?? (contentType.split(';')[0]?.trim() || null),
        descriptionSource: description ? 'multipart-field' : headerDescription ? 'header' : 'none',
        descriptionHeaderName: description ? null : headerDescription?.headerName ?? null,
        fileSource: file ? 'multipart-part' : 'none',
      };
    } catch {
      return null;
    }
  }

  private async tryParseTextualResponse(
    response: Response,
    inputReference: string,
  ): Promise<ParsedProductTextResponse | null> {
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    const isLikelyText = contentType.includes('json')
      || contentType.startsWith('text/')
      || contentType.includes('xml')
      || contentType.includes('javascript')
      || !contentType;

    if (!isLikelyText) {
      return null;
    }

    const rawText = await response.text();
    const trimmed = rawText.trim();
    const headerDescription = this.extractDescriptionHeader(response.headers);
    if (!trimmed) {
      return {
        description: headerDescription?.value ?? '',
        file: null,
        fileMeta: null,
        fileBase64: null,
        structuredResult: null,
        platformResult: null,
        mode: 'empty',
        mimeType: contentType.split(';')[0]?.trim() || null,
        descriptionSource: headerDescription ? 'header' : 'none',
        descriptionHeaderName: headerDescription?.headerName ?? null,
        fileSource: 'none',
      };
    }

    const parsedJson = this.tryParseJson(trimmed);
    if (parsedJson !== null) {
      return this.normalizeJsonPayload(parsedJson, inputReference, response.headers);
    }

    return {
      description: trimmed,
      file: null,
      fileMeta: null,
      fileBase64: null,
      structuredResult: null,
      platformResult: null,
      mode: 'text',
      mimeType: contentType.split(';')[0]?.trim() || 'text/plain',
      descriptionSource: 'text-body',
      descriptionHeaderName: null,
      fileSource: 'none',
    };
  }

  private normalizeJsonPayload(
    value: unknown,
    inputReference: string,
    headers?: Headers,
  ): ParsedProductTextResponse {
    const structuredResult = this.extractStructuredResult(value);
    const platformResult = this.extractPlatformResult(value);
    const fileBase64 = this.extractBinaryBase64FromPayload(value);
    const fileMeta = this.extractBinaryMetaFromPayload(value, inputReference);
    const file = this.createFileFromPayload(fileBase64, fileMeta);
    const headerDescription = this.extractDescriptionHeader(headers);
    const payloadDescription = this.extractDescriptionFromPayload(structuredResult, value);

    return {
      description: payloadDescription ?? headerDescription?.value ?? '',
      file,
      fileMeta,
      fileBase64,
      structuredResult,
      platformResult,
      mode: 'json',
      mimeType: headers?.get('content-type')?.split(';')[0]?.trim() ?? 'application/json',
      descriptionSource: payloadDescription ? 'payload' : headerDescription ? 'header' : 'none',
      descriptionHeaderName: payloadDescription ? null : headerDescription?.headerName ?? null,
      fileSource: file ? 'payload-base64' : 'none',
    };
  }

  private extractPlatformResult(value: unknown): ProductTextPlatformResult | null {
    const candidates = Array.isArray(value) ? value : [value];
    for (const item of candidates) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }
      const record = item as Record<string, unknown>;
      const hasPlatform = ['amazon', 'shopify', 'ebay', 'shopware', 'woocommerce'].some((k) => k in record);
      if (hasPlatform) {
        return record as unknown as ProductTextPlatformResult;
      }
    }
    return null;
  }

  private extractDescriptionFromPayload(
    structuredResult: ProductTextOutput['structuredResult'],
    fallbackValue: unknown,
  ): string | undefined {
    const structuredDescription = structuredResult?.content?.productDescription
      ?? structuredResult?.content?.intro
      ?? structuredResult?.seo?.metaDescription
      ?? undefined;
    if (structuredDescription?.trim()) {
      return structuredDescription.trim();
    }

    const strongKeys = [
      'productText',
      'product_text',
      'generatedText',
      'generated_text',
      'generatedDescription',
      'generated_description',
      'productDescription',
      'product_description',
      'produktbeschreibung',
      'metaDescription',
      'meta_description',
      'intro',
      'text',
      'body',
      'content',
      'output',
      'message',
      'caption',
    ];
    const fallbackKeys = [
      'beschreibung',
      'description',
    ];

    const direct = this.findStringByKeys(fallbackValue, strongKeys);
    if (direct) {
      return direct;
    }

    const longText = this.findLongText(fallbackValue);
    if (longText) {
      return longText;
    }

    return this.findStringByKeys(fallbackValue, fallbackKeys);
  }

  private extractStructuredResult(value: unknown): ProductTextOutput['structuredResult'] {
    const record = this.unwrapStructuredResult(value);
    if (!record) {
      return null;
    }

    return {
      success: this.toNullableBoolean(record['success']),
      generatedAt: this.toNullableString(record['generatedAt']),
      model: this.toNullableString(record['model']),
      tokensUsed: this.toNullableNumber(record['tokensUsed']),
      seo: this.normalizeSeoData(record['seo']),
      tags: this.normalizeTagsData(record['tags']),
      content: this.normalizeContentData(record['content']),
      schema: this.normalizeSchemaData(record['schema']),
      openGraph: this.normalizeStringRecord(record['openGraph']),
      twitterCard: this.normalizeStringRecord(record['twitterCard']),
      dataflowSeo: this.normalizeDataflowSeo(record['dataflowSeo']),
    };
  }

  private unwrapStructuredResult(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.unwrapStructuredResult(item);
        if (found) {
          return found;
        }
      }
      return null;
    }

    const record = value as Record<string, unknown>;
    if (this.hasStructuredProductFields(record)) {
      return record;
    }

    for (const nested of Object.values(record)) {
      const found = this.unwrapStructuredResult(nested);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private hasStructuredProductFields(record: Record<string, unknown>): boolean {
    return [
      'generatedAt',
      'model',
      'tokensUsed',
      'seo',
      'tags',
      'content',
      'schema',
      'openGraph',
      'twitterCard',
      'dataflowSeo',
    ].some((key) => key in record);
  }

  private normalizeSeoData(value: unknown): NonNullable<ProductTextOutput['structuredResult']>['seo'] {
    const record = this.toRecord(value);
    if (!record) {
      return null;
    }

    const normalized = {
      title: this.toNullableString(record['title']),
      metaDescription: this.toNullableString(record['metaDescription']),
      h1: this.toNullableString(record['h1']),
      focusKeyword: this.toNullableString(record['focusKeyword']),
      secondaryKeywords: this.toStringArray(record['secondaryKeywords']),
      lsiKeywords: this.toStringArray(record['lsiKeywords']),
      longTailKeywords: this.toStringArray(record['longTailKeywords']),
      slug: this.toNullableString(record['slug']),
      canonicalUrl: this.toNullableString(record['canonicalUrl']),
      robots: this.toNullableString(record['robots']),
      readabilityLevel: this.toNullableString(record['readabilityLevel']),
      keywordDensityTarget: this.toNullableString(record['keywordDensityTarget']),
    };

    return this.hasMeaningfulValues([
      normalized.title,
      normalized.metaDescription,
      normalized.h1,
      normalized.focusKeyword,
      normalized.slug,
      normalized.canonicalUrl,
      normalized.robots,
      normalized.readabilityLevel,
      normalized.keywordDensityTarget,
      normalized.secondaryKeywords,
      normalized.lsiKeywords,
      normalized.longTailKeywords,
    ]) ? normalized : null;
  }

  private normalizeTagsData(value: unknown): NonNullable<ProductTextOutput['structuredResult']>['tags'] {
    const record = this.toRecord(value);
    if (!record) {
      return null;
    }

    const normalized = {
      productTags: this.toStringArray(record['productTags']),
      categoryPath: this.toStringArray(record['categoryPath']),
      breadcrumb: this.toStringArray(record['breadcrumb']),
      cmsTags: this.toStringArray(record['cmsTags']),
    };

    return this.hasMeaningfulValues([
      normalized.productTags,
      normalized.categoryPath,
      normalized.breadcrumb,
      normalized.cmsTags,
    ]) ? normalized : null;
  }

  private normalizeContentData(value: unknown): NonNullable<ProductTextOutput['structuredResult']>['content'] {
    const record = this.toRecord(value);
    if (!record) {
      return null;
    }

    const normalized = {
      intro: this.toNullableString(record['intro']),
      productDescription: this.toNullableString(record['productDescription']),
      contentOutline: this.normalizeContentOutline(record['contentOutline']),
      features: this.toStringArray(record['features']),
      benefits: this.toStringArray(record['benefits']),
      specifications: this.toRecord(record['specifications']) ?? {},
      callToAction: this.toNullableString(record['callToAction']),
      socialProofHook: this.toNullableString(record['socialProofHook']),
      imageAltTexts: this.toStringArray(record['imageAltTexts']),
    };

    return this.hasMeaningfulValues([
      normalized.intro,
      normalized.productDescription,
      normalized.contentOutline,
      normalized.features,
      normalized.benefits,
      normalized.specifications,
      normalized.callToAction,
      normalized.socialProofHook,
      normalized.imageAltTexts,
    ]) ? normalized : null;
  }

  private normalizeContentOutline(value: unknown): NonNullable<NonNullable<ProductTextOutput['structuredResult']>['content']>['contentOutline'] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => {
      const record = this.toRecord(item);
      if (!record) {
        return [];
      }

      const h2 = this.toNullableString(record['h2']);
      if (!h2) {
        return [];
      }

      return [{
        h2,
        h3s: this.toStringArray(record['h3s']),
        keyFocus: this.toNullableString(record['keyFocus']),
      }];
    });
  }

  private normalizeSchemaData(value: unknown): NonNullable<ProductTextOutput['structuredResult']>['schema'] {
    const record = this.toRecord(value);
    if (!record) {
      return null;
    }

    const normalized = {
      product: this.toRecord(record['product']),
      breadcrumb: this.toRecord(record['breadcrumb']),
      faqPage: this.toRecord(record['faqPage']),
    };

    return this.hasMeaningfulValues([
      normalized.product,
      normalized.breadcrumb,
      normalized.faqPage,
    ]) ? normalized : null;
  }

  private normalizeDataflowSeo(value: unknown): NonNullable<ProductTextOutput['structuredResult']>['dataflowSeo'] {
    const record = this.toRecord(value);
    if (!record) {
      return null;
    }

    const normalized = {
      primaryIntent: this.toNullableString(record['primaryIntent']),
      keywordStrategy: this.toNullableString(record['keywordStrategy']),
      contentScore: this.toDisplayString(record['contentScore']),
      eeatSignals: this.toStringArray(record['eeatSignals']),
      internalLinkOpportunities: this.normalizeInternalLinkOpportunities(record['internalLinkOpportunities']),
      competitorDifferentiators: this.toStringArray(record['competitorDifferentiators']),
      topicalClusters: this.toStringArray(record['topicalClusters']),
    };

    return this.hasMeaningfulValues([
      normalized.primaryIntent,
      normalized.keywordStrategy,
      normalized.contentScore,
      normalized.eeatSignals,
      normalized.internalLinkOpportunities,
      normalized.competitorDifferentiators,
      normalized.topicalClusters,
    ]) ? normalized : null;
  }

  private normalizeInternalLinkOpportunities(
    value: unknown,
  ): NonNullable<NonNullable<ProductTextOutput['structuredResult']>['dataflowSeo']>['internalLinkOpportunities'] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => {
      const record = this.toRecord(item);
      if (!record) {
        return [];
      }

      const anchorText = this.toNullableString(record['anchorText']);
      const targetTopic = this.toNullableString(record['targetTopic']);
      if (!anchorText || !targetTopic) {
        return [];
      }

      return [{ anchorText, targetTopic }];
    });
  }

  private normalizeStringRecord(value: unknown): Record<string, string> {
    const record = this.toRecord(value);
    if (!record) {
      return {};
    }

    return Object.entries(record).reduce<Record<string, string>>((acc, [key, item]) => {
      const normalized = this.toDisplayString(item);
      if (normalized) {
        acc[key] = normalized;
      }
      return acc;
    }, {});
  }

  private hasMeaningfulValues(values: unknown[]): boolean {
    return values.some((value) => {
      if (value === null || value === undefined) {
        return false;
      }

      if (typeof value === 'string') {
        return value.trim().length > 0;
      }

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      if (typeof value === 'object') {
        return Object.keys(value as Record<string, unknown>).length > 0;
      }

      return true;
    });
  }

  private findStringByKeys(value: unknown, keys: string[]): string | undefined {
    if (!value || typeof value !== 'object') {
      return undefined;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findStringByKeys(item, keys);
        if (found) {
          return found;
        }
      }
      return undefined;
    }

    const record = value as Record<string, unknown>;
    for (const key of keys) {
      const candidate = record[key];
      if (typeof candidate === 'string' && this.isReadableText(candidate)) {
        return candidate.trim();
      }
    }

    for (const nested of Object.values(record)) {
      const found = this.findStringByKeys(nested, keys);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  private findLongText(value: unknown): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (this.isReadableText(trimmed) && trimmed.length > 32) {
        return trimmed;
      }
      return undefined;
    }

    if (!value || typeof value !== 'object') {
      return undefined;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.findLongText(item);
        if (found) {
          return found;
        }
      }
      return undefined;
    }

    const record = value as Record<string, unknown>;
    for (const nested of Object.values(record)) {
      const found = this.findLongText(nested);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  private extractBinaryBase64FromPayload(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.extractBinaryBase64FromPayload(item);
        if (found) {
          return found;
        }
      }
      return null;
    }

    const record = value as Record<string, unknown>;
    const direct = this.extractBase64String(record['base64']) ?? this.extractBase64String(record['data']);
    if (direct) {
      return direct;
    }

    for (const nested of Object.values(record)) {
      const found = this.extractBinaryBase64FromPayload(nested);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private extractBinaryMetaFromPayload(
    value: unknown,
    inputReference: string,
  ): ParsedBinaryMeta | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.extractBinaryMetaFromPayload(item, inputReference);
        if (found) {
          return found;
        }
      }
      return null;
    }

    const record = value as Record<string, unknown>;
    const direct = this.binaryMetaFromRecord(record, inputReference);
    if (direct) {
      return direct;
    }

    for (const nested of Object.values(record)) {
      const found = this.extractBinaryMetaFromPayload(nested, inputReference);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private binaryMetaFromRecord(
    record: Record<string, unknown>,
    inputReference: string,
  ): ParsedBinaryMeta | null {
    const fileName = this.toNonEmptyString(record['fileName'])
      ?? this.toNonEmptyString(record['filename'])
      ?? this.toNonEmptyString(record['name']);
    const mimeType = this.toNonEmptyString(record['mimeType'])
      ?? this.toNonEmptyString(record['mime_type']);
    const fileSize = this.toByteSize(record['fileSize'])
      ?? this.toByteSize(record['size']);

    if (!fileName && !mimeType && fileSize === null) {
      return null;
    }

    return {
      fileName: fileName ?? this.buildDownloadName(inputReference, mimeType ?? 'application/octet-stream'),
      mimeType: mimeType ?? 'application/octet-stream',
      size: fileSize ?? 0,
    };
  }

  private createFileFromPayload(
    base64: string | null,
    fileMeta: ParsedBinaryMeta | null,
  ): ParsedBinaryFile | null {
    if (!base64 || !fileMeta) {
      return null;
    }

    try {
      const blob = this.base64ToBlob(base64, fileMeta.mimeType);
      return {
        blob,
        fileName: fileMeta.fileName,
        mimeType: blob.type || fileMeta.mimeType,
        size: blob.size,
      };
    } catch {
      return null;
    }
  }

  private async extractBinaryFile(
    response: Response,
    inputReference: string,
  ): Promise<ParsedBinaryFile | null> {
    const blob = await response.blob();
    if (!blob.size) {
      return null;
    }

    const mimeType = blob.type
      || response.headers.get('content-type')?.split(';')[0]?.trim()
      || 'application/octet-stream';

    return {
      blob,
      fileName: this.extractFileNameFromHeaders(response.headers) ?? this.buildDownloadName(inputReference, mimeType),
      mimeType,
      size: blob.size,
    };
  }

  private extractDescriptionHeader(headers?: Headers): ParsedHeaderDescription | null {
    if (!headers) {
      return null;
    }

    const headerKeys = [
      'beschreibung',
      'produktbeschreibung',
      'x-beschreibung',
      'x-produktbeschreibung',
      'x-product-description',
      'product-description',
      'x-description',
      'description',
      'x-output-text',
      'x-product-text',
      'x-text',
    ];

    for (const key of headerKeys) {
      const value = headers.get(key);
      if (value && this.isReadableText(value)) {
        return {
          value: value.trim(),
          headerName: key,
        };
      }
    }

    return null;
  }

  private extractFileNameFromHeaders(headers: Headers): string | undefined {
    const contentDisposition = headers.get('content-disposition');
    if (!contentDisposition) {
      return undefined;
    }

    const match = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
    return match?.[1] ? decodeURIComponent(match[1].replace(/"/g, '').trim()) : undefined;
  }

  private buildDownloadName(inputReference: string, mimeType: string): string {
    const baseName = this.sanitizeFileBaseName(inputReference) || 'produkttext-output';
    const extension = this.extensionForMimeType(mimeType);
    return `${baseName}-output.${extension}`;
  }

  private sanitizeFileBaseName(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'produkttext';
    }

    const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
    const cleaned = withoutProtocol
      .replace(/[?#].*$/, '')
      .replace(/\.[a-z0-9]{2,6}$/i, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    return cleaned.slice(0, 60) || 'produkttext';
  }

  private extensionForMimeType(mimeType: string): string {
    switch (mimeType) {
      case 'application/pdf':
        return 'pdf';
      case 'image/png':
        return 'png';
      case 'image/jpeg':
        return 'jpg';
      case 'image/webp':
        return 'webp';
      case 'application/json':
        return 'json';
      case 'text/plain':
        return 'txt';
      default:
        return 'bin';
    }
  }

  private isReadableText(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }

    if (/^data:/i.test(trimmed)) {
      return false;
    }

    if (/^[A-Za-z0-9+/=_-]{120,}$/.test(trimmed) && !/\s/.test(trimmed)) {
      return false;
    }

    return true;
  }

  private extractBase64String(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    if (trimmed.startsWith('data:')) {
      return trimmed.split(',')[1];
    }

    return /^[A-Za-z0-9+/=\s_-]{32,}$/.test(trimmed) ? trimmed : undefined;
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const binary = atob(base64.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new Blob([bytes], { type: mimeType });
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== 'string') {
          reject(new Error('Blob konnte nicht in Base64 umgewandelt werden.'));
          return;
        }

        resolve(result.split(',')[1] ?? '');
      };
      reader.onerror = () => reject(reader.error ?? new Error('Datei konnte nicht gelesen werden.'));
      reader.readAsDataURL(blob);
    });
  }

  private tryParseJson(value: string): unknown | null {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private toDisplayString(value: unknown): string | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }

    return this.toNullableString(value);
  }

  private toNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.trim());
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toNullableBoolean(value: unknown): boolean | null {
    return typeof value === 'boolean' ? value : null;
  }

  private toStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((item) => {
      const normalized = this.toDisplayString(item);
      return normalized ? [normalized] : [];
    });
  }

  private toNonEmptyString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private toByteSize(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const plainNumber = Number(trimmed);
    if (Number.isFinite(plainNumber)) {
      return plainNumber;
    }

    const match = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(B|KB|MB|GB)$/i);
    if (!match) {
      return null;
    }

    const amount = Number(match[1].replace(',', '.'));
    const unit = match[2].toUpperCase();
    const factors: Record<string, number> = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
    };

    return Math.round(amount * factors[unit]);
  }

  private async callWebhook(
    urls: readonly string[],
    body: ProductTextRequestPayload | FormData,
    requestKind: 'json' | 'multipart',
    label: string,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (const url of urls) {
      try {
        const response = requestKind === 'multipart'
          ? await fetch(url, {
              method: 'POST',
              body: body as FormData,
            })
          : await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body as ProductTextRequestPayload),
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

  private toErrorMessage(error: unknown): string {
    const text = error instanceof Error ? error.message : '';
    const parsed = this.tryParseJson(text);
    const record = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
    const backendMessage = this.toNonEmptyString(record?.['message']);

    if (/Produkttext-Service/.test(text)) {
      return text;
    }

    if (/not registered/i.test(text)) {
      return 'Der Produkttext-Service ist gerade nicht erreichbar. Bitte versuche es in ein paar Minuten erneut.';
    }

    if (backendMessage) {
      return backendMessage;
    }

    return 'Deine Eingabe konnte gerade nicht verarbeitet werden. Bitte pruefe URL, Bild und Hinweise und versuche es erneut.';
  }

  private persistSessionRun(record: RunRecord): void {
    try {
      sessionStorage.setItem(PRODUCT_TEXT_SESSION_RUN_KEY, JSON.stringify(record));
    } catch {
      // Ignore storage quota issues.
    }
  }
}
