import React from 'react';

/**
 * Production-Grade Lazy Component Loader with Automatic Deployment Recovery
 * 
 * BR-15: Resilient error handling without unhandled promise rejections.
 * Automatically recovers from "Failed to fetch dynamically imported module"
 * when a new release is deployed while a user has an older session open.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  componentName?: string
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const storageKey = `retry_chunk_${componentName || 'unknown'}`;
    const hasAlreadyRetried = sessionStorage.getItem(storageKey);

    try {
      const module = await componentImport();
      sessionStorage.removeItem(storageKey);
      return module;
    } catch (error: any) {
      console.warn(`[LazyLoader] Error loading chunk for ${componentName || 'component'}:`, error);

      const errorMessage = String(error?.message || '');
      const isDynamicImportFailure =
        errorMessage.includes('Failed to fetch dynamically imported module') ||
        errorMessage.includes('Importing a module script failed') ||
        errorMessage.includes('error loading dynamically imported module') ||
        error?.name === 'ChunkLoadError';

      if (isDynamicImportFailure && !hasAlreadyRetried) {
        sessionStorage.setItem(storageKey, 'true');
        console.info(`[LazyLoader] Stale bundle hash detected after deployment. Auto-refreshing to load latest chunk...`);
        
        // Force reload from server to fetch latest index.html with new chunk hashes
        window.location.reload();
        
        // Return a pending promise while the browser is navigating/reloading
        return new Promise<{ default: T }>(() => {});
      }

      sessionStorage.removeItem(storageKey);
      throw error;
    }
  });
}
