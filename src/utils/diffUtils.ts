export interface DiffToken {
  targetWord: string;
  userWord?: string;
  isMatched: boolean;
}

export interface DictationDiffResult {
  tokens: DiffToken[];
  matchCount: number;
  totalCount: number;
  accuracy: number;
}

/**
 * Calculates word-level diff between target text and user transcription
 * using the Longest Common Subsequence (LCS) dynamic programming algorithm.
 */
export function calculateDictationDiff(
  targetText: string,
  userInput: string
): DictationDiffResult {
  const targetWords = targetText.trim().split(/\s+/).filter(Boolean);
  const inputWords = userInput.trim().split(/\s+/).filter(Boolean);

  const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

  const m = targetWords.length;
  const n = inputWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (clean(targetWords[i - 1]) === clean(inputWords[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const matchedTargetIndices = new Set<number>();
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    if (clean(targetWords[i - 1]) === clean(inputWords[j - 1])) {
      matchedTargetIndices.add(i - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  const tokens: DiffToken[] = targetWords.map((word, idx) => ({
    targetWord: word,
    isMatched: matchedTargetIndices.has(idx),
    userWord: matchedTargetIndices.has(idx) ? word : (inputWords[idx] || undefined)
  }));

  const matchCount = matchedTargetIndices.size;
  const totalCount = targetWords.length;
  const accuracy = totalCount > 0 ? Math.round((matchCount / totalCount) * 100) : 0;

  return { tokens, matchCount, totalCount, accuracy };
}
