import { describe, it, expect } from 'vitest';
import { isUsableViTranslation, translateEnToVi } from '../../../api/ai-dict-router.js';

describe('ai-dict-router translation & quality guard', () => {
  it('rejects untranslated English echoes and empty strings', () => {
    expect(isUsableViTranslation('brought to', 'brought to')).toBe(false);
    expect(isUsableViTranslation('brought to', 'Brought To!')).toBe(false);
    expect(isUsableViTranslation('brought to', '')).toBe(false);
    expect(isUsableViTranslation('brought to', 'được mang đến')).toBe(true);
  });

  it('falls back to MyMemory when Google Translate fails or returns rate-limit 429', async () => {
    const fakeFetch = async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('translate.googleapis.com')) {
        return new Response('Too Many Requests', { status: 429 });
      }
      if (urlStr.includes('api.mymemory.translated.net')) {
        return new Response(
          JSON.stringify({
            responseData: { translatedText: 'được mang đến' }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const result = await translateEnToVi('brought to', { fetchImpl: fakeFetch });
    expect(result.provider).toBe('mymemory');
    expect(result.translation).toBe('được mang đến');
  });

  it('skips Google response when it echoes the exact English phrase and uses MyMemory instead', async () => {
    const fakeFetch = async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes('translate.googleapis.com')) {
        return new Response(JSON.stringify([[['brought to', 'brought to']]]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(
        JSON.stringify({ responseData: { translatedText: 'mang đến cho' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const result = await translateEnToVi('brought to', { fetchImpl: fakeFetch });
    expect(result.provider).toBe('mymemory');
    expect(result.translation).toBe('mang đến cho');
  });
});
