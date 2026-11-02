export interface TextToken {
  text: string;
  isWord: boolean;
  lookupWord: string;
}

/**
 * Tokenizes text into words and delimiters (spaces, punctuation, symbols).
 * Handles contractions (don't, I'm, it's, we've), smart quotes (I’m), and possessives (Steve's).
 */
export function tokenizeText(text: string): TextToken[] {
  if (!text) return [];

  // Match English words with optional apostrophe contractions
  const regex = /([a-zA-Z]+(?:['’][a-zA-Z]+)?)/g;
  const tokens: TextToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        text: text.slice(lastIndex, match.index),
        isWord: false,
        lookupWord: ''
      });
    }

    const matchedWord = match[0];
    // Strip possessive 's or ’s for clean dictionary lookup (e.g., "Steve's" -> "Steve")
    const lookupWord = matchedWord.replace(/['’]s$/i, '');

    tokens.push({
      text: matchedWord,
      isWord: true,
      lookupWord
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      text: text.slice(lastIndex),
      isWord: false,
      lookupWord: ''
    });
  }

  return tokens;
}
