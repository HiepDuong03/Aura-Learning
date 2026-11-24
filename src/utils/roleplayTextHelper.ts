export interface ChatWordToken {
  raw: string;
  cleanWord: string;
  isWord: boolean;
}

/**
 * Splits an English chat sentence into interactive word spans and punctuation/whitespace tokens
 * (mirrors Langua's `.js-translatable-text.word` architecture).
 */
export function tokenizeChatText(text: string): ChatWordToken[] {
  const input = String(text || '');
  if (!input) return [];

  const parts = input.split(/([A-Za-z][A-Za-z'’-]*)/g);
  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      const isWord = /^[A-Za-z][A-Za-z'’-]*$/.test(part);
      const cleanWord = isWord
        ? part.replace(/^'+|'+$/g, '').replace(/[’]s$/i, '').toLowerCase()
        : '';
      return {
        raw: part,
        cleanWord,
        isWord: isWord && cleanWord.length > 0
      };
    });
}

/**
 * Validates drag-selected phrase length (Langua limits phrase popup selection to <= 70 chars).
 */
export function extractSelectablePhrase(selectionText: string, maxChars = 70): string | null {
  const normalized = String(selectionText || '').trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length > maxChars) return null;
  const wordCount = normalized.split(' ').filter(Boolean).length;
  if (wordCount < 2 || wordCount > 12) return null;
  return normalized;
}
