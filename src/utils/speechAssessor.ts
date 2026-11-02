/**
 * Speech Assessment & Pronunciation Diagnosis Engine
 * Reverse-engineered from ELSA Speak (3-tier phonetic heatmap & omission diagnosis)
 * 
 * BR-06: No guessing rule - explicit word alignment without heuristic hand-waving
 * BR-07: 3-tier scoring thresholds: >= 85% Green, 65-84% Yellow, < 65% Red
 * BR-15: Type-safe, zero silent failures
 */

export type AssessmentTier = 'correct' | 'almost' | 'incorrect' | 'omitted';

export interface WordAssessment {
  id: string;
  originalWord: string;
  cleanWord: string;
  spokenWord?: string;
  score: number;
  tier: AssessmentTier;
  ipaHint?: string;
  omissionWarning?: string;
  phoneticFeedback?: string;
}

export interface DetailedSpeechAssessment {
  overallScore: number;
  accuracyScore: number;
  completenessScore: number;
  fluencyScore: number;
  words: WordAssessment[];
  omissionWarnings: string[];
  diagnosticSummary: string;
}

/**
 * Standard Levenshtein distance between two strings
 */
export function calculateLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,       // deletion
        dp[i]![j - 1]! + 1,       // insertion
        dp[i - 1]![j - 1]! + cost // substitution
      );
    }
  }

  return dp[m]![n]!;
}

/**
 * Calculates string similarity from 0 to 100
 */
export function calculateWordSimilarity(target: string, spoken: string): number {
  const cleanTarget = target.toLowerCase().trim();
  const cleanSpoken = spoken.toLowerCase().trim();

  if (cleanTarget === cleanSpoken) return 100;
  if (!cleanTarget || !cleanSpoken) return 0;

  const maxLen = Math.max(cleanTarget.length, cleanSpoken.length);
  const distance = calculateLevenshteinDistance(cleanTarget, cleanSpoken);
  const similarityRatio = Math.max(0, (maxLen - distance) / maxLen);

  return Math.round(similarityRatio * 100);
}

/**
 * Common IPA hints dictionary for English practice
 */
const COMMON_IPA_HINTS: Record<string, string> = {
  the: '/ðə/',
  that: '/ðæt/',
  this: '/ðɪs/',
  these: '/ðiːz/',
  those: '/ðoʊz/',
  think: '/θɪŋk/',
  thought: '/θɔːt/',
  though: '/ðoʊ/',
  through: '/θruː/',
  tough: '/tʌf/',
  asked: '/æskt/',
  watched: '/wɑːtʃt/',
  worked: '/wɜːrkt/',
  liked: '/laɪkt/',
  wanted: '/ˈwɑːntɪd/',
  needed: '/ˈniːdɪd/',
  decided: '/dɪˈsaɪdɪd/',
  coffee: '/ˈkɔːfi/',
  latte: '/ˈlɑːteɪ/',
  receipt: '/rɪˈsiːt/',
  passport: '/ˈpæspɔːrt/',
  hotel: '/hoʊˈtɛl/',
  luggage: '/ˈlʌɡɪdʒ/',
  schedule: '/ˈskɛdʒuːl/',
  comfortable: '/ˈkʌmftərbəl/',
  vegetable: '/ˈvɛdʒtəbəl/',
};

/**
 * Detects common Vietnamese learner phonetic omission errors (nuốt âm)
 */
function diagnosePhoneticOmission(target: string, spoken?: string): { warning?: string; feedback?: string } {
  if (!spoken) {
    return {
      warning: 'Từ bị bỏ qua',
      feedback: 'Bạn chưa phát âm từ này hoặc nói quá nhỏ.',
    };
  }

  const t = target.toLowerCase().replace(/[^a-z]/g, '');
  const s = spoken.toLowerCase().replace(/[^a-z]/g, '');

  if (t === s) return {};

  // Trailing /s/ or /z/ omission: target ends in s, es, ce, se but spoken does not
  if ((t.endsWith('s') || t.endsWith('es') || t.endsWith('ce') || t.endsWith('se')) && !s.endsWith('s') && !s.endsWith('z')) {
    return {
      warning: 'Thiếu âm đuôi /s/ hoặc /z/',
      feedback: `Đừng quên bật âm gió cuối cho "${target}".`,
    };
  }

  // Trailing /t/ or /d/ or /ed/ omission
  if ((t.endsWith('ed') || t.endsWith('t') || t.endsWith('d')) && !s.endsWith('t') && !s.endsWith('d')) {
    return {
      warning: 'Thiếu âm đuôi /t/ hoặc /d/',
      feedback: `Cần bật rõ âm kết thúc /t/ hoặc /d/ cho "${target}".`,
    };
  }

  // Trailing consonant clusters (st, sk, pt, ct)
  if ((t.endsWith('st') || t.endsWith('sk') || t.endsWith('xt')) && !s.endsWith('t')) {
    return {
      warning: 'Thiếu cụm phụ âm cuối',
      feedback: `Chú ý phát âm đầy đủ cả hai phụ âm cuối của "${target}".`,
    };
  }

  // /th/ sound substitution (/θ/, /ð/ replaced by /t/ or /d/)
  if (t.startsWith('th') && (s.startsWith('t') || s.startsWith('d'))) {
    return {
      warning: 'Lỗi âm /θ/ hoặc /ð/',
      feedback: `Đặt đầu lưỡi giữa hai hàm răng khi phát âm "th" trong "${target}".`,
    };
  }

  return {};
}

/**
 * Assesses spoken speech against a target sentence with word-level alignment
 * Implements ELSA Speak 3-tier scoring:
 * - 🟢 Green: >= 85
 * - 🟡 Yellow: 65 - 84
 * - 🔴 Red: < 65
 */
export function assessSpeech(targetSentence: string, spokenTranscript: string, latencyMs?: number): DetailedSpeechAssessment {
  const cleanTargetWords = targetSentence
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const cleanSpokenWords = spokenTranscript
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const words: WordAssessment[] = [];
  const omissionWarnings: string[] = [];

  // Optimal alignment using greedy dynamic window matching
  let spokenIndex = 0;

  for (let i = 0; i < cleanTargetWords.length; i++) {
    const targetWord = cleanTargetWords[i] ?? '';
    const cleanWord = targetWord.toLowerCase();
    const id = `w-${i}-${cleanWord}`;

    // Search ahead up to 2 words in spoken words for best match
    let bestScore = 0;
    let bestSpokenMatch: string | undefined = undefined;
    let bestMatchOffset = -1;

    for (let offset = 0; offset <= 2; offset++) {
      const candidateIdx = spokenIndex + offset;
      if (candidateIdx < cleanSpokenWords.length) {
        const candidate = cleanSpokenWords[candidateIdx] ?? '';
        const sim = calculateWordSimilarity(cleanWord, candidate);
        if (sim > bestScore) {
          bestScore = sim;
          bestSpokenMatch = candidate;
          bestMatchOffset = offset;
        }
      }
    }

    if (bestScore >= 50 && bestMatchOffset !== -1) {
      spokenIndex += bestMatchOffset + 1;
    } else {
      bestSpokenMatch = undefined;
      bestScore = 0;
    }

    // Determine 3-tier status according to BR-07
    let tier: AssessmentTier = 'incorrect';
    if (bestScore >= 85) {
      tier = 'correct';
    } else if (bestScore >= 65) {
      tier = 'almost';
    } else if (!bestSpokenMatch) {
      tier = 'omitted';
    }

    const { warning, feedback } = diagnosePhoneticOmission(cleanWord, bestSpokenMatch);
    if (warning && !omissionWarnings.includes(warning)) {
      omissionWarnings.push(`${targetWord}: ${warning}`);
    }

    const ipaHint = COMMON_IPA_HINTS[cleanWord];

    words.push({
      id,
      originalWord: targetWord,
      cleanWord,
      spokenWord: bestSpokenMatch,
      score: bestScore,
      tier,
      ipaHint,
      omissionWarning: warning,
      phoneticFeedback: feedback,
    });
  }

  // Calculate comprehensive metrics
  const totalWords = words.length;
  const matchedWordsCount = words.filter(w => w.tier === 'correct' || w.tier === 'almost').length;
  const correctWordsCount = words.filter(w => w.tier === 'correct').length;

  const totalScoreSum = words.reduce((acc, curr) => acc + curr.score, 0);
  const accuracyScore = totalWords > 0 ? Math.round(totalScoreSum / totalWords) : 0;
  const completenessScore = totalWords > 0 ? Math.round((matchedWordsCount / totalWords) * 100) : 0;

  // Fluency considers speed and word accuracy
  let fluencyScore = accuracyScore;
  if (latencyMs && latencyMs > 0) {
    if (latencyMs <= 1800) {
      fluencyScore = Math.min(100, Math.round(accuracyScore * 1.05));
    } else if (latencyMs > 4000) {
      fluencyScore = Math.max(40, Math.round(accuracyScore * 0.85));
    }
  }

  const overallScore = Math.round((accuracyScore * 0.6) + (completenessScore * 0.3) + (fluencyScore * 0.1));

  let diagnosticSummary = 'Phát âm tuyệt vời! Bạn đã phát âm chuẩn xác từng từ.';
  if (overallScore < 65) {
    diagnosticSummary = 'Cần luyện tập thêm. Hãy bấm vào các từ màu đỏ để nghe và luyện phát âm từng từ.';
  } else if (overallScore < 85) {
    diagnosticSummary = 'Rất tốt! Chú ý các từ màu vàng và bật rõ các âm đuôi để đạt điểm tuyệt đối.';
  }

  return {
    overallScore,
    accuracyScore,
    completenessScore,
    fluencyScore,
    words,
    omissionWarnings,
    diagnosticSummary,
  };
}
