import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AGENTS_MAP } from '../../data/agents.data';
import { ProductTextOutput, RunRecord } from '../../models/interfaces';
import { NotificationService } from '../../services/notification.service';
import { RunHistoryService } from '../../services/run-history.service';
import {
  BinaryFileStoreService,
  StoredBinaryFile,
} from '../../services/binary-file-store.service';

const PRODUCT_TEXT_DESCRIPTION_PATH = '/webhook/produktbeschreibung';
const PRODUCT_TEXT_IMAGE_PATH = '/webhook/produktbild';
const MAX_PERSISTED_BINARY_BYTES = 3_500_000;
const PRODUCT_TEXT_SESSION_RUN_KEY = 'product-text:last-run';

function buildWebhookCandidates(path: string): readonly string[] {
  return environment.production
    ? [`/api/n8n${path}`, `${environment.n8nBase}${path}`]
    : [`${environment.n8nBase}${path}`];
}

const PRODUCT_TEXT_DESCRIPTION_WEBHOOKS = buildWebhookCandidates(PRODUCT_TEXT_DESCRIPTION_PATH);
const PRODUCT_TEXT_IMAGE_WEBHOOKS = buildWebhookCandidates(PRODUCT_TEXT_IMAGE_PATH);

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
export class ProductTextAgentComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly runHistory = inject(RunHistoryService);
  private readonly notifications = inject(NotificationService);
  private readonly binaryFileStore = inject(BinaryFileStoreService);

  readonly agentMeta = AGENTS_MAP['produkttext-agent'];

  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly dragOver = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly statusLabel = signal('Lade ein einziges Produktbild hoch und starte dann den Agenten.');

  readonly selectedFileName = computed(() => this.selectedFile()?.name ?? 'Kein Bild ausgewählt');
  readonly selectedFileSize = computed(() => {
    const file = this.selectedFile();
    return file ? this.formatFileSize(file.size) : '–';
  });

  ngOnDestroy(): void {
    this.revokePreviewUrl();
  }

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

  clearFile(): void {
    this.errorMessage.set('');
    this.selectedFile.set(null);
    this.revokePreviewUrl();
    this.statusLabel.set('Lade ein einziges Produktbild hoch und starte dann den Agenten.');
  }

  async submit(): Promise<void> {
    const file = this.selectedFile();
    if (!file || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.statusLabel.set('Produktbild wird parallel an Beschreibung und Bild gesendet…');

    try {
      const [descriptionResponse, imageResponse] = await Promise.all([
        this.callWebhook(
          PRODUCT_TEXT_DESCRIPTION_WEBHOOKS,
          this.buildFormData(file),
          'Der Beschreibungs-Webhook',
        ),
        this.callWebhook(
          PRODUCT_TEXT_IMAGE_WEBHOOKS,
          this.buildFormData(file),
          'Der Bild-Webhook',
        ),
      ]);

      this.statusLabel.set('Text- und Bildantwort werden zusammengeführt…');
      const [descriptionParsed, imageParsed] = await Promise.all([
        this.parseWebhookResponse(descriptionResponse, file.name),
        this.parseWebhookResponse(imageResponse, file.name),
      ]);
      const parsed = this.mergeParsedResponses(descriptionParsed, imageParsed);
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
        this.downloadBlob(parsed.file.blob, parsed.file.fileName);
      } else if (parsed.fileBase64 && parsed.fileMeta) {
        this.binaryFileStore.set(runId, {
          fileName: parsed.fileMeta.fileName,
          mimeType: parsed.fileMeta.mimeType,
          size: parsed.fileMeta.size,
          base64: parsed.fileBase64,
        });
      }

      this.statusLabel.set('Beschreibung und Bild werden gespeichert…');
      const output = await this.buildOutput(parsed, file.name);
      const record: RunRecord = {
        id: runId,
        agentId: 'produkttext-agent',
        agentName: this.agentMeta.name,
        agentIcon: this.agentMeta.icon,
        agentCategory: this.agentMeta.category,
        timestamp: Date.now(),
        inputData: {
          productImageName: file.name,
        },
        outputSummary: output.generatedFile?.fileName ?? 'Produkttext generiert',
        fullOutput: output,
        tokenCount: Math.floor(Math.random() * 450) + 250,
      };

      this.runHistory.addRun(record);
      this.persistSessionRun(record);
      this.notifications.addNotification({
        agentId: 'produkttext-agent',
        agentName: this.agentMeta.name,
        agentIcon: this.agentMeta.icon,
        message: `${this.agentMeta.name} hat Produkttext und Datei bereitgestellt.`,
        time: 'Gerade eben',
        read: false,
        link: '/agents/produkttext-agent/result',
      });

      this.statusLabel.set(parsed.file ? 'Beschreibung und Bild bereit ✓' : 'Beschreibung bereit ✓');

      setTimeout(() => {
        this.router.navigate(['/agents', 'produkttext-agent', 'result'], {
          queryParams: { runId },
        });
      }, 250);
    } catch (error) {
      console.error(error);
      this.errorMessage.set(this.toErrorMessage(error));
      this.statusLabel.set('Die Antworten der Webhooks sind fehlgeschlagen.');
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

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Bitte lade ein Bild hoch. Andere Dateitypen werden hier nicht verarbeitet.');
      return;
    }

    this.selectedFile.set(file);
    this.updatePreviewUrl(file);
    this.statusLabel.set('Bild bereit. Du kannst den Produkttext-Agenten jetzt starten.');
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

  private buildFormData(file: File): FormData {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return formData;
  }

  private mergeParsedResponses(
    descriptionResponse: ParsedProductTextResponse,
    imageResponse: ParsedProductTextResponse,
  ): ParsedProductTextResponse {
    const descriptionCandidate = this.hasDescription(descriptionResponse)
      ? descriptionResponse
      : imageResponse;
    const fileCandidate = this.hasFilePayload(imageResponse)
      ? imageResponse
      : descriptionResponse;

    return {
      description: descriptionCandidate.description,
      file: fileCandidate.file,
      fileMeta: fileCandidate.fileMeta,
      fileBase64: fileCandidate.fileBase64,
      mode: this.hasFilePayload(fileCandidate) ? fileCandidate.mode : descriptionCandidate.mode,
      mimeType: fileCandidate.mimeType ?? descriptionCandidate.mimeType,
      descriptionSource: descriptionCandidate.descriptionSource,
      descriptionHeaderName: descriptionCandidate.descriptionHeaderName,
      fileSource: this.hasFilePayload(fileCandidate) ? fileCandidate.fileSource : 'none',
    };
  }

  private async buildOutput(
    parsed: ParsedProductTextResponse,
    uploadedImageName: string,
  ): Promise<ProductTextOutput> {
    const fallbackDescription = parsed.file
      ? 'Das Bild wurde erfolgreich zurückgeliefert, aber der Beschreibungs-Webhook hat keinen lesbaren Produkttext geliefert.'
      : 'Der Beschreibungs-Webhook hat keine lesbare Produktbeschreibung geliefert.';

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
      uploadedImageName,
      generatedFile,
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
    uploadedImageName: string,
  ): Promise<ParsedProductTextResponse> {
    const multipart = await this.tryParseMultipartResponse(response.clone(), uploadedImageName);
    if (multipart) {
      return multipart;
    }

    const textual = await this.tryParseTextualResponse(response.clone(), uploadedImageName);
    if (textual) {
      return textual;
    }

    const file = await this.extractBinaryFile(response, uploadedImageName);
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
      mode: file ? 'binary' : 'empty',
      mimeType: file?.mimeType ?? (response.headers.get('content-type')?.split(';')[0]?.trim() ?? null),
      descriptionSource: headerDescription ? 'header' : 'none',
      descriptionHeaderName: headerDescription?.headerName ?? null,
      fileSource: file ? 'response-body' : 'none',
    };
  }

  private async tryParseMultipartResponse(
    response: Response,
    uploadedImageName: string,
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

      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          if (!description && this.isReadableText(value)) {
            description = value.trim();
          }
          continue;
        }

        if (!file) {
          file = {
            blob: value,
            fileName: value.name || this.buildDownloadName(uploadedImageName, value.type),
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
    uploadedImageName: string,
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
        mode: 'empty',
        mimeType: contentType.split(';')[0]?.trim() || null,
        descriptionSource: headerDescription ? 'header' : 'none',
        descriptionHeaderName: headerDescription?.headerName ?? null,
        fileSource: 'none',
      };
    }

    const parsedJson = this.tryParseJson(trimmed);
    if (parsedJson !== null) {
      return this.normalizeJsonPayload(parsedJson, uploadedImageName, response.headers);
    }

    return {
      description: trimmed,
      file: null,
      fileMeta: null,
      fileBase64: null,
      mode: 'text',
      mimeType: contentType.split(';')[0]?.trim() || 'text/plain',
      descriptionSource: 'text-body',
      descriptionHeaderName: null,
      fileSource: 'none',
    };
  }

  private normalizeJsonPayload(
    value: unknown,
    uploadedImageName: string,
    headers?: Headers,
  ): ParsedProductTextResponse {
    const fileBase64 = this.extractBinaryBase64FromPayload(value);
    const fileMeta = this.extractBinaryMetaFromPayload(value, uploadedImageName);
    const file = this.createFileFromPayload(fileBase64, fileMeta);
    const headerDescription = this.extractDescriptionHeader(headers);
    const payloadDescription = this.extractDescriptionFromPayload(value);

    return {
      description: payloadDescription ?? headerDescription?.value ?? '',
      file,
      fileMeta,
      fileBase64,
      mode: 'json',
      mimeType: headers?.get('content-type')?.split(';')[0]?.trim() ?? 'application/json',
      descriptionSource: payloadDescription ? 'payload' : headerDescription ? 'header' : 'none',
      descriptionHeaderName: payloadDescription ? null : headerDescription?.headerName ?? null,
      fileSource: file ? 'payload-base64' : 'none',
    };
  }

  private extractDescriptionFromPayload(value: unknown): string | undefined {
    const prioritized = [
      'productDescription',
      'product_description',
      'produktbeschreibung',
      'beschreibung',
      'description',
      'text',
      'body',
      'content',
      'output',
      'message',
      'caption',
    ];

    const direct = this.findStringByKeys(value, prioritized);
    if (direct) {
      return direct;
    }

    return this.findLongText(value);
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
    uploadedImageName: string,
  ): ParsedBinaryMeta | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const found = this.extractBinaryMetaFromPayload(item, uploadedImageName);
        if (found) {
          return found;
        }
      }
      return null;
    }

    const record = value as Record<string, unknown>;
    const direct = this.binaryMetaFromRecord(record, uploadedImageName);
    if (direct) {
      return direct;
    }

    for (const nested of Object.values(record)) {
      const found = this.extractBinaryMetaFromPayload(nested, uploadedImageName);
      if (found) {
        return found;
      }
    }

    return null;
  }

  private binaryMetaFromRecord(
    record: Record<string, unknown>,
    uploadedImageName: string,
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
      fileName: fileName ?? this.buildDownloadName(uploadedImageName, mimeType ?? 'application/octet-stream'),
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
    uploadedImageName: string,
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
      fileName: this.extractFileNameFromHeaders(response.headers) ?? this.buildDownloadName(uploadedImageName, mimeType),
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

    const match = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
    return match?.[1] ? decodeURIComponent(match[1].replace(/"/g, '').trim()) : undefined;
  }

  private buildDownloadName(uploadedImageName: string, mimeType: string): string {
    const baseName = uploadedImageName.replace(/\.[^.]+$/, '') || 'produkttext-output';
    const extension = this.extensionForMimeType(mimeType);
    return `${baseName}-output.${extension}`;
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

  private hasDescription(value: ParsedProductTextResponse): boolean {
    return value.description.trim().length > 0;
  }

  private hasFilePayload(value: ParsedProductTextResponse): boolean {
    return !!value.file || !!value.fileMeta || !!value.fileBase64;
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
    formData: FormData,
    label: string,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
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

    if (/Beschreibungs-Webhook|Bild-Webhook/.test(text)) {
      return text;
    }

    if (/not registered/i.test(text)) {
      return 'Mindestens einer der n8n-Webhooks ist aktuell nicht aktiv. Bitte pruefe die produktiven Endpunkte fuer Produktbeschreibung und Produktbild.';
    }

    if (backendMessage) {
      return `n8n meldet einen Workflow-Fehler: ${backendMessage}`;
    }

    return 'Die Antworten der beiden n8n-Webhooks konnten nicht verarbeitet werden. Bitte versuche es mit einem anderen Bild erneut.';
  }

  private persistSessionRun(record: RunRecord): void {
    try {
      sessionStorage.setItem(PRODUCT_TEXT_SESSION_RUN_KEY, JSON.stringify(record));
    } catch {
      // Ignore storage quota issues.
    }
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
