import { Injectable } from '@angular/core';

export interface StoredBinaryFile {
  fileName: string;
  mimeType: string;
  size: number;
  blob?: Blob;
  base64?: string;
}

@Injectable({ providedIn: 'root' })
export class BinaryFileStoreService {
  private readonly storagePrefix = 'product-text-binary:';
  private readonly files = new Map<string, StoredBinaryFile>();

  set(runId: string, file: StoredBinaryFile): void {
    this.files.set(runId, file);
    this.persist(runId, file);
  }

  get(runId: string): StoredBinaryFile | null {
    const inMemory = this.files.get(runId);
    if (inMemory) {
      return inMemory;
    }

    const restored = this.restore(runId);
    if (restored) {
      this.files.set(runId, restored);
    }
    return restored;
  }

  private persist(runId: string, file: StoredBinaryFile): void {
    if (!file.base64) {
      return;
    }

    try {
      sessionStorage.setItem(this.storagePrefix + runId, JSON.stringify({
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        base64: file.base64,
      }));
    } catch {
      // Ignore quota issues and keep the in-memory copy.
    }
  }

  private restore(runId: string): StoredBinaryFile | null {
    try {
      const raw = sessionStorage.getItem(this.storagePrefix + runId);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as Partial<StoredBinaryFile>;
      if (!parsed.fileName || !parsed.mimeType || typeof parsed.size !== 'number' || !parsed.base64) {
        return null;
      }

      return {
        fileName: parsed.fileName,
        mimeType: parsed.mimeType,
        size: parsed.size,
        base64: parsed.base64,
      };
    } catch {
      return null;
    }
  }
}
