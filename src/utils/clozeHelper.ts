export interface ClozeSegment {
  text: string;
  isTarget: boolean;
}

export interface ClozeResult {
  masked: string;
  hasMatch: boolean;
  parts: ClozeSegment[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Masks a target word or multi-word phrase inside a context sentence for
 * Contextual Cloze Deletion flashcards, and splits the sentence into segments
 * for highlighting on the answer side.
 */
export function buildClozeSentence(sentence: string, targetWord: string): ClozeResult {
  const cleanSentence = String(sentence || '').trim();
  const cleanTarget = String(targetWord || '').trim().replace(/\s+/g, ' ');

  if (!cleanSentence || !cleanTarget) {
    return {
      masked: cleanSentence,
      hasMatch: false,
      parts: cleanSentence ? [{ text: cleanSentence, isTarget: false }] : []
    };
  }

  const tokens = cleanTarget.split(' ').filter(Boolean).map(escapeRegExp);
  const patternBody = tokens.join('\\s+');
  const startsWithWord = /^[a-zA-Z0-9]/.test(cleanTarget);
  const endsWithWord = /[a-zA-Z0-9]$/.test(cleanTarget);
  const regexSource = `${startsWithWord ? '\\b' : ''}(${patternBody})${endsWithWord ? '\\b' : ''}`;
  const regex = new RegExp(regexSource, 'gi');

  const parts: ClozeSegment[] = [];
  let lastIndex = 0;
  let hasMatch = false;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleanSentence)) !== null) {
    if (match[0].length === 0) {
      regex.lastIndex += 1;
      continue;
    }
    hasMatch = true;
    if (match.index > lastIndex) {
      parts.push({
        text: cleanSentence.slice(lastIndex, match.index),
        isTarget: false
      });
    }
    parts.push({
      text: match[0],
      isTarget: true
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < cleanSentence.length) {
    parts.push({
      text: cleanSentence.slice(lastIndex),
      isTarget: false
    });
  }

  if (!hasMatch) {
    return {
      masked: cleanSentence,
      hasMatch: false,
      parts: [{ text: cleanSentence, isTarget: false }]
    };
  }

  const masked = parts.map((p) => (p.isTarget ? '______' : p.text)).join('');

  return {
    masked,
    hasMatch: true,
    parts
  };
}
