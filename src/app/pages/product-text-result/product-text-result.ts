import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AGENTS_MAP } from '../../data/agents.data';
import { ProductTextOutput, RunRecord } from '../../models/interfaces';
import {
  BinaryFileStoreService,
  StoredBinaryFile,
} from '../../services/binary-file-store.service';
import { RunHistoryService } from '../../services/run-history.service';
import { ToastService } from '../../services/toast.service';
import { renderMarkdownToHtml } from '../../utils/markdown.utils';

const PRODUCT_TEXT_SESSION_RUN_KEY = 'product-text:last-run';

@Component({
  selector: 'app-product-text-result',
  standalone: true,
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

  readonly run = this._run.asReadonly();
  readonly output = computed(() => {
    const output = this._run()?.fullOutput;
    if (output?.type !== 'product-text') {
      return null;
    }

    const productOutput = output as ProductTextOutput & { responseMeta?: ProductTextOutput['responseMeta'] };
    return {
      ...productOutput,
      inputReference: productOutput.inputReference ?? productOutput.uploadedImageName,
      responseMeta: productOutput.responseMeta ?? {
        mode: productOutput.generatedFile ? 'binary' : 'text',
        mimeType: productOutput.generatedFile?.mimeType ?? null,
        descriptionSource: 'none',
        descriptionHeaderName: null,
        fileSource: productOutput.generatedFile ? 'response-body' : 'none',
      },
    } as ProductTextOutput;
  });
  readonly inMemoryFile = computed<StoredBinaryFile | null>(() => {
    const run = this._run();
    return run ? this.binaryFileStore.get(run.id) : null;
  });
  readonly fileReady = computed(() => !!this.inMemoryFile() || !!this.output()?.generatedFile?.base64);
  readonly descriptionLength = computed(() => this.output()?.description.trim().length ?? 0);
  readonly generatedPreviewUrl = computed(() => {
    const file = this.inMemoryFile();
    const base64 = file?.base64 ?? this.output()?.generatedFile?.base64;
    const mimeType = file?.mimeType ?? this.output()?.generatedFile?.mimeType ?? this.output()?.responseMeta.mimeType;

    if (!base64 || !mimeType?.startsWith('image/')) {
      return null;
    }

    return `data:${mimeType};base64,${base64}`;
  });
  readonly renderedDescription = computed((): SafeHtml | null => {
    const description = this.output()?.description;
    if (!description) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdownToHtml(description));
  });

  goBack(): void {
    this.router.navigate(['/agents', this.agentId]);
  }

  copyDescription(): void {
    const description = this.output()?.description ?? '';
    if (!description) {
      this.toastService.show('Keine Beschreibung zum Kopieren vorhanden.', 'error');
      return;
    }

    navigator.clipboard.writeText(description).then(() => {
      this.toastService.show('Produkttext kopiert!', 'success');
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
    const description = this.output()?.description ?? '';
    if (!description) {
      this.toastService.show('Keine Beschreibung zum Download vorhanden.', 'error');
      return;
    }

    const blob = new Blob([description], { type: 'text/plain;charset=utf-8' });
    this.downloadBlob(blob, `produkttext-${Date.now()}.txt`);
    this.toastService.show('Beschreibung wird heruntergeladen…', 'info');
  }

  formatFileSize(bytes: number | null | undefined): string {
    if (!bytes) return '–';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
