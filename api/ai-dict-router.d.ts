export const MAX_USER_CUSTOM_LESSONS: number;
export const MAX_USER_DAILY_AI_TURNS: number;

export function normalizeLookupQuery(rawWord: string): string;
export function isUsableViTranslation(sourceEn: string, candidateVi: string): boolean;

export function translateEnToVi(
  text: string,
  options?: { fetchImpl?: typeof fetch; timeoutMs?: number }
): Promise<{
  translation: string;
  partOfSpeech: string;
  synonyms: string[];
  provider: 'google_gtx' | 'mymemory' | 'none';
}>;

export function handlePublicDictRoutes(params: Record<string, unknown>): Promise<boolean>;
export function handleAuthenticatedAiRoutes(params: Record<string, unknown>): Promise<boolean>;
