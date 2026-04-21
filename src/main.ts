import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

const CHUNK_RETRY_STORAGE_KEY = 'ki-portal:chunk-retry-path';
const CHUNK_RETRY_QUERY_PARAM = '__chunk_retry';

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = 'message' in error ? (error as { message?: unknown }).message : undefined;
    if (typeof maybeMessage === 'string') {
      return maybeMessage;
    }

    const maybeReason = 'reason' in error ? (error as { reason?: unknown }).reason : undefined;
    if (typeof maybeReason === 'string') {
      return maybeReason;
    }

    if (maybeReason instanceof Error) {
      return maybeReason.message;
    }
  }

  return '';
}

function isChunkLoadError(error: unknown): boolean {
  const message = extractErrorMessage(error);

  return /Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk [\w-]+ failed|Importing a module script failed/i.test(
    message,
  );
}

function currentRetryPath(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(CHUNK_RETRY_QUERY_PARAM);
  return `${url.pathname}${url.search}`;
}

function recoverFromChunkLoad(): boolean {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return false;
  }

  const path = currentRetryPath();
  const previousRetry = sessionStorage.getItem(CHUNK_RETRY_STORAGE_KEY);

  if (previousRetry === path) {
    sessionStorage.removeItem(CHUNK_RETRY_STORAGE_KEY);
    return false;
  }

  sessionStorage.setItem(CHUNK_RETRY_STORAGE_KEY, path);

  const url = new URL(window.location.href);
  url.searchParams.set(CHUNK_RETRY_QUERY_PARAM, `${Date.now()}`);
  window.location.replace(url.toString());
  return true;
}

function cleanupChunkRetryState(): void {
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return;
  }

  sessionStorage.removeItem(CHUNK_RETRY_STORAGE_KEY);

  const url = new URL(window.location.href);
  if (!url.searchParams.has(CHUNK_RETRY_QUERY_PARAM)) {
    return;
  }

  url.searchParams.delete(CHUNK_RETRY_QUERY_PARAM);
  window.history.replaceState(window.history.state, '', url.toString());
}

function installChunkLoadRecovery(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('error', (event) => {
    const candidate = event.error ?? event.message;
    if (!isChunkLoadError(candidate)) {
      return;
    }

    event.preventDefault();
    recoverFromChunkLoad();
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (!isChunkLoadError(event.reason)) {
      return;
    }

    event.preventDefault();
    recoverFromChunkLoad();
  });
}

installChunkLoadRecovery();

bootstrapApplication(App, appConfig)
  .then(() => cleanupChunkRetryState())
  .catch((err) => {
    if (isChunkLoadError(err) && recoverFromChunkLoad()) {
      return;
    }

    console.error(err);
  });
