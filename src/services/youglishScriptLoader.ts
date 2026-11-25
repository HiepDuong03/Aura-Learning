export interface YouGlishFetchEvent {
  totalResult?: number;
}

export interface YouGlishVideoChangeEvent {
  trackNumber?: number;
}

export interface YouGlishErrorEvent {
  code?: number;
}

export interface YouGlishWidgetOptions {
  width: number;
  height?: number;
  components: number;
  autoStart?: number;
  events: {
    onFetchDone?: (event: YouGlishFetchEvent) => void;
    onVideoChange?: (event: YouGlishVideoChangeEvent) => void;
    onCaptionConsumed?: () => void;
    onError?: (event: YouGlishErrorEvent) => void;
  };
}

export interface YouGlishWidgetInstance {
  fetch: (query: string, lang: string, accent?: string) => void;
  next: () => void;
  previous: () => void;
  replay: () => void;
  setSpeed: (speed: number) => void;
}

export interface YouGlishGlobalApi {
  Widget: new (elementId: string, options: YouGlishWidgetOptions) => YouGlishWidgetInstance;
}

export type YouGlishLoadErrorCode = 'SCRIPT_BLOCKED' | 'TIMEOUT' | 'UNAVAILABLE';

export class YouGlishLoadError extends Error {
  readonly code: YouGlishLoadErrorCode;

  constructor(code: YouGlishLoadErrorCode, message: string) {
    super(message);
    this.name = 'YouGlishLoadError';
    this.code = code;
  }
}

interface YouGlishWindow extends Window {
  YG?: YouGlishGlobalApi;
  onYouglishAPIReady?: () => void;
}

const SCRIPT_ID = 'youglish-widget-script';
const SCRIPT_SRC = 'https://youglish.com/public/emb/widget.js';

let pendingPromise: Promise<YouGlishGlobalApi> | null = null;

/**
 * Reset internal singleton state (primarily used in unit tests and clean retries).
 */
export function resetYouGlishLoaderState(): void {
  pendingPromise = null;
}

/**
 * Loads YouGlish widget.js using the official `window.onYouglishAPIReady` hook
 * (https://youglish.com/api/doc/js-api) as a single deduplicated Promise.
 * If blocked by an adblocker or timed out, cleans up the failed script tag so
 * subsequent retries work cleanly.
 */
export function ensureYouGlishApi(timeoutMs: number = 7000): Promise<YouGlishGlobalApi> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new YouGlishLoadError('UNAVAILABLE', 'Window/DOM unavailable'));
  }

  const win = window as YouGlishWindow;
  if (win.YG && typeof win.YG.Widget === 'function') {
    return Promise.resolve(win.YG);
  }

  if (pendingPromise) {
    return pendingPromise;
  }

  pendingPromise = new Promise<YouGlishGlobalApi>((resolve, reject) => {
    let settled = false;

    const cleanupOnFailure = (removeScript: boolean) => {
      pendingPromise = null;
      if (removeScript) {
        const el = document.getElementById(SCRIPT_ID);
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      }
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanupOnFailure(true);
      reject(new YouGlishLoadError('TIMEOUT', 'YouGlish widget.js timed out waiting for onYouglishAPIReady'));
    }, timeoutMs);

    const finishSuccess = (api: YouGlishGlobalApi) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(api);
    };

    const finishError = (code: YouGlishLoadErrorCode, message: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanupOnFailure(true);
      reject(new YouGlishLoadError(code, message));
    };

    const previousReady = win.onYouglishAPIReady;
    win.onYouglishAPIReady = () => {
      if (typeof previousReady === 'function') {
        try {
          previousReady();
        } catch {
          // Ignore unrelated callback error
        }
      }
      if (win.YG && typeof win.YG.Widget === 'function') {
        finishSuccess(win.YG);
      } else {
        finishError('UNAVAILABLE', 'onYouglishAPIReady fired without YG.Widget');
      }
    };

    // Remove any stale failed script element before injecting a fresh one
    const existing = document.getElementById(SCRIPT_ID);
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      // Some cached runs expose window.YG immediately on load without re-firing onYouglishAPIReady
      if (win.YG && typeof win.YG.Widget === 'function') {
        finishSuccess(win.YG);
      }
    };
    script.onerror = () => {
      finishError('SCRIPT_BLOCKED', 'YouGlish widget.js was blocked by browser extension or network');
    };

    document.body.appendChild(script);
  });

  return pendingPromise;
}
