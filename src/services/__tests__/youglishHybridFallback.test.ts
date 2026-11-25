import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ensureYouGlishApi,
  resetYouGlishLoaderState,
  YouGlishGlobalApi,
  YouGlishLoadError
} from '../youglishScriptLoader';
import { searchLocalVideoContexts } from '../localVideoContextSearch';

interface FakeScriptEl {
  id: string;
  src: string;
  async: boolean;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  parentNode: { removeChild: (child: FakeScriptEl) => void } | null;
}

describe('youglishScriptLoader (official onYouglishAPIReady hook)', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;

  let scriptElements: Map<string, FakeScriptEl>;
  let fakeWin: {
    YG?: YouGlishGlobalApi;
    onYouglishAPIReady?: () => void;
    setTimeout: typeof setTimeout;
    clearTimeout: typeof clearTimeout;
  };

  beforeEach(() => {
    resetYouGlishLoaderState();
    scriptElements = new Map();

    fakeWin = {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis)
    };

    const fakeBody = {
      appendChild: (el: FakeScriptEl) => {
        el.parentNode = fakeBody;
        scriptElements.set(el.id, el);
      },
      removeChild: (el: FakeScriptEl) => {
        scriptElements.delete(el.id);
        el.parentNode = null;
      }
    };

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: fakeWin
    });

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        getElementById: (id: string) => scriptElements.get(id) ?? null,
        createElement: (): FakeScriptEl => ({
          id: '',
          src: '',
          async: false,
          onload: null,
          onerror: null,
          parentNode: null
        }),
        body: fakeBody
      }
    });
  });

  afterEach(() => {
    resetYouGlishLoaderState();
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument
    });
  });

  it('resolves via window.onYouglishAPIReady and deduplicates concurrent calls', async () => {
    const p1 = ensureYouGlishApi(2000);
    const p2 = ensureYouGlishApi(2000);

    expect(scriptElements.size).toBe(1);
    expect(typeof fakeWin.onYouglishAPIReady).toBe('function');

    class DummyWidget {
      fetch() {}
      next() {}
      previous() {}
      replay() {}
      setSpeed() {}
    }
    const mockApi: YouGlishGlobalApi = {
      Widget: DummyWidget
    };
    fakeWin.YG = mockApi;
    fakeWin.onYouglishAPIReady?.();

    const [api1, api2] = await Promise.all([p1, p2]);
    expect(api1).toBe(mockApi);
    expect(api2).toBe(mockApi);
  });

  it('rejects immediately with SCRIPT_BLOCKED on script.onerror and allows clean retry', async () => {
    const firstAttempt = ensureYouGlishApi(2000);
    const injected = scriptElements.get('youglish-widget-script');
    expect(injected).toBeDefined();

    injected?.onerror?.();

    await expect(firstAttempt).rejects.toBeInstanceOf(YouGlishLoadError);
    await expect(firstAttempt).rejects.toMatchObject({ code: 'SCRIPT_BLOCKED' });
    // Failed script tag must be removed so retry injects a fresh one
    expect(scriptElements.size).toBe(0);

    // Retry succeeds cleanly
    const secondAttempt = ensureYouGlishApi(2000);
    expect(scriptElements.size).toBe(1);
    class DummyWidget {
      fetch() {}
      next() {}
      previous() {}
      replay() {}
      setSpeed() {}
    }
    const mockApi: YouGlishGlobalApi = { Widget: DummyWidget };
    fakeWin.YG = mockApi;
    fakeWin.onYouglishAPIReady?.();

    await expect(secondAttempt).resolves.toBe(mockApi);
  });
});

describe('searchLocalVideoContexts (Tier-2 Hybrid Fallback)', () => {
  it('returns exact curated clips for words in YOUGLISH_CORPUS and respects accent filter', async () => {
    const usClips = await searchLocalVideoContexts('complicated', 'US');
    expect(usClips.length).toBeGreaterThan(0);
    expect(usClips[0].matchType).toBe('exact');
    expect(usClips[0].youtubeId).toBeTruthy();
    expect(usClips.every((c) => c.accent === 'US' || c.accent === 'GLOBAL')).toBe(true);
  });

  it('returns related token clips when exact multi-word phrase is not in local corpus', async () => {
    const clips = await searchLocalVideoContexts('extraordinarily complicated thoughts', 'GLOBAL');
    expect(clips.length).toBeGreaterThan(0);
    expect(clips[0].matchType).toBe('related');
    expect(clips[0].matchedToken).toBe('complicated');
  });

  it('returns empty array for empty or non-existent nonsense queries', async () => {
    expect(await searchLocalVideoContexts('   ', 'GLOBAL')).toEqual([]);
    expect(await searchLocalVideoContexts('zxqvbnm12345', 'GLOBAL')).toEqual([]);
  });
});
