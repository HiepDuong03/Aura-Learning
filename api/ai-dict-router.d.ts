export const MAX_USER_CUSTOM_LESSONS: number;
export const MAX_USER_DAILY_AI_TURNS: number;
export const VALID_CORRECTION_MODES: readonly string[];

export function normalizeLookupQuery(rawWord: string): string;
export function isUsableViTranslation(sourceEn: string, candidateVi: string): boolean;
export function buildCorrectionModeInstruction(mode: string): string;
export function generateFallbackFeedbackReport(params: {
  messages?: Array<{
    sender?: string;
    text?: string;
    correction?: string;
    nativeRephrase?: string;
    grammarTip?: string;
  }>;
  mission?: string;
}): {
  estimatedCefr: string;
  overallScore: number;
  summaryVi: string;
  strengthsVi: string[];
  mistakes: Array<{
    original: string;
    corrected: string;
    explanationVi: string;
    category: 'grammar' | 'vocabulary' | 'naturalness';
  }>;
  keyVocabulary: Array<{
    phrase: string;
    meaningVi: string;
    contextSentence: string;
  }>;
  isFallback: boolean;
};

export function translateEnToVi(
  text: string,
  options?: { fetchImpl?: typeof fetch; timeoutMs?: number; geminiApiKey?: string }
): Promise<{
  translation: string;
  partOfSpeech: string;
  synonyms: string[];
  provider: 'google_gtx' | 'mymemory' | 'gemini' | 'none';
}>;

export function handlePublicDictRoutes(params: Record<string, unknown>): Promise<boolean>;
export function handleAuthenticatedAiRoutes(params: Record<string, unknown>): Promise<boolean>;
