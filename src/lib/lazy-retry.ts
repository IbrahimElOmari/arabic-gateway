import React from "react";

const LAZY_RETRY_KEY = "app_lazy_retry_done";
const LAZY_RETRY_PARAM = "_lazy_retry";

export function buildLazyRetryUrl(currentHref: string, timestamp = Date.now()): string {
  const url = new URL(currentHref);
  url.searchParams.set(LAZY_RETRY_PARAM, timestamp.toString());
  return `${url.pathname}${url.search}${url.hash}`;
}

function isModuleLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk|ChunkLoadError/i.test(
    error.message
  );
}

export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      const module = await importer();
      sessionStorage.removeItem(LAZY_RETRY_KEY);
      return module;
    } catch (error) {
      if (isModuleLoadError(error) && sessionStorage.getItem(LAZY_RETRY_KEY) !== "true") {
        sessionStorage.setItem(LAZY_RETRY_KEY, "true");
        window.location.replace(buildLazyRetryUrl(window.location.href));
      }

      throw error;
    }
  });
}

export function isLazyModuleLoadError(error: unknown): boolean {
  return isModuleLoadError(error);
}

export function recoverFromLazyModuleLoadError(): void {
  window.location.replace(buildLazyRetryUrl(window.location.href));
}