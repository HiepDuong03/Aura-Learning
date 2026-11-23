import {
  CurriculumGrammarLesson,
  CurriculumProgressState,
  CurriculumTrackType,
  CurriculumVocabLesson,
  CurriculumWordItem,
  WordDefinition
} from '../types';

export const PASS_THRESHOLD_PERCENT = 80;

export function createEmptyCurriculumProgress(): CurriculumProgressState {
  return {
    lessons: {},
    unlockedUnits: {},
    placementScores: {}
  };
}

export function normalizeCurriculumProgress(raw: unknown): CurriculumProgressState {
  if (!raw || typeof raw !== 'object') {
    return createEmptyCurriculumProgress();
  }
  const obj = raw as Partial<CurriculumProgressState>;
  return {
    lessons: obj.lessons && typeof obj.lessons === 'object' && !Array.isArray(obj.lessons) ? obj.lessons : {},
    unlockedUnits:
      obj.unlockedUnits && typeof obj.unlockedUnits === 'object' && !Array.isArray(obj.unlockedUnits)
        ? obj.unlockedUnits
        : {},
    placementScores:
      obj.placementScores && typeof obj.placementScores === 'object' && !Array.isArray(obj.placementScores)
        ? obj.placementScores
        : {}
  };
}

/**
 * IELTS Topics: all 19 topics can be started from Lesson 01 freely (learners pick their target topic).
 * CEFR Vocab & Grammar: Level A1 (index 0) is always unlocked; higher levels unlock when
 * the previous level has >= 50% lessons passed OR the user passes the Placement Test (>= 80%).
 */
export function isUnitUnlocked(
  unitId: string,
  unitIndex: number,
  trackType: CurriculumTrackType,
  progress: CurriculumProgressState,
  previousUnitStats?: { completedLessons: number; totalLessons: number }
): boolean {
  if (trackType === 'ielts_topics') return true;
  if (unitIndex <= 0) return true;
  if (progress.unlockedUnits[unitId]) return true;
  if (
    previousUnitStats &&
    previousUnitStats.totalLessons > 0 &&
    previousUnitStats.completedLessons / previousUnitStats.totalLessons >= 0.5
  ) {
    return true;
  }
  return false;
}

export function isLessonUnlocked(
  unitId: string,
  lessonIndex: number,
  lessonIds: string[],
  progress: CurriculumProgressState
): boolean {
  if (lessonIndex <= 0) return true;
  if (progress.unlockedUnits[unitId]) return true;
  const prevId = lessonIds[lessonIndex - 1];
  if (!prevId) return true;
  return Boolean(progress.lessons[prevId]?.quizPassed);
}

export interface UnitProgressStats {
  completedLessons: number;
  totalLessons: number;
  earnedStars: number;
  maxStars: number;
  percent: number;
}

export function computeUnitStats(
  lessonIds: string[],
  progress: CurriculumProgressState
): UnitProgressStats {
  const totalLessons = lessonIds.length;
  const maxStars = totalLessons * 3;
  if (totalLessons === 0) {
    return { completedLessons: 0, totalLessons: 0, earnedStars: 0, maxStars: 0, percent: 0 };
  }

  let completedLessons = 0;
  let earnedStars = 0;
  for (const id of lessonIds) {
    const rec = progress.lessons[id];
    if (!rec) continue;
    if (rec.quizPassed) completedLessons += 1;
    earnedStars += Math.min(3, Math.max(0, Number(rec.stars || 0)));
  }

  return {
    completedLessons,
    totalLessons,
    earnedStars,
    maxStars,
    percent: Math.round((completedLessons / totalLessons) * 100)
  };
}

export interface CurriculumQuizQuestion {
  id: string;
  kind: 'meaning_mc' | 'cloze_mc' | 'dictation';
  targetWord: string;
  prompt: string;
  contextSentence?: string;
  options: string[];
  correctAnswer: number;
  explanationVi: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function maskWordInSentence(sentence: string, word: string): string | null {
  const clean = (word || '').trim();
  if (!sentence || !clean) return null;
  const regex = new RegExp(`\\b${escapeRegExp(clean)}(?:s|es|ed|ing|d)?\\b`, 'i');
  if (!regex.test(sentence)) return null;
  return sentence.replace(regex, '______');
}

function deterministicShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates a balanced mix of Vietnamese-meaning multiple choice and IELTS Cloze context questions
 * without ever leaking the target word in the prompt or duplicating options.
 */
export function buildLessonQuizQuestions(
  lessonWords: CurriculumWordItem[],
  distractorPool: CurriculumWordItem[] = lessonWords,
  seed: number = 42
): CurriculumQuizQuestion[] {
  const pool = distractorPool.length >= 4 ? distractorPool : lessonWords;
  const questions: CurriculumQuizQuestion[] = [];

  lessonWords.forEach((item, idx) => {
    const others = deterministicShuffle(
      pool.filter((p) => p.id !== item.id && p.word.toLowerCase() !== item.word.toLowerCase()),
      seed + idx * 17
    );

    const maskedIelts = maskWordInSentence(item.exampleIeltsEn, item.word);
    const maskedDaily = !maskedIelts ? maskWordInSentence(item.exampleDailyEn, item.word) : null;
    const maskedSentence = maskedIelts || maskedDaily;

    // Alternate between IELTS Cloze context and Meaning MC for high active recall variety
    if (maskedSentence && idx % 2 === 1) {
      const distractors: string[] = [];
      const seen = new Set<string>([item.word.toLowerCase()]);
      for (const candidate of others) {
        const lw = candidate.word.toLowerCase();
        if (seen.has(lw)) continue;
        seen.add(lw);
        distractors.push(candidate.word);
        if (distractors.length >= 3) break;
      }
      if (distractors.length >= 3) {
        const options = deterministicShuffle([item.word, ...distractors], seed + idx * 31);
        questions.push({
          id: `q-cloze-${item.id}-${idx}`,
          kind: 'cloze_mc',
          targetWord: item.word,
          prompt: `Chọn từ phù hợp nhất điền vào chỗ trống (${item.meaningVi}):`,
          contextSentence: maskedSentence,
          options,
          correctAnswer: options.indexOf(item.word),
          explanationVi: `"${item.word}" (${item.pos}) có nghĩa là "${item.meaningVi}". Câu đầy đủ: "${maskedIelts ? item.exampleIeltsEn : item.exampleDailyEn}"`
        });
        return;
      }
    }

    // Meaning MC
    const meaningDistractors: string[] = [];
    const seenMeanings = new Set<string>([item.meaningVi.toLowerCase().trim()]);
    for (const candidate of others) {
      const lm = candidate.meaningVi.toLowerCase().trim();
      if (!lm || seenMeanings.has(lm)) continue;
      seenMeanings.add(lm);
      meaningDistractors.push(candidate.meaningVi);
      if (meaningDistractors.length >= 3) break;
    }

    const fallbackMeanings = ['sự trì hoãn', 'kế hoạch dài hạn', 'giải pháp thay thế'];
    for (const fb of fallbackMeanings) {
      if (meaningDistractors.length >= 3) break;
      if (!seenMeanings.has(fb)) {
        seenMeanings.add(fb);
        meaningDistractors.push(fb);
      }
    }

    const options = deterministicShuffle([item.meaningVi, ...meaningDistractors.slice(0, 3)], seed + idx * 23);
    questions.push({
      id: `q-mean-${item.id}-${idx}`,
      kind: 'meaning_mc',
      targetWord: item.word,
      prompt: `Từ "${item.word}" (${item.pos}) có nghĩa tiếng Việt gần nhất là gì?`,
      contextSentence: item.exampleDailyEn,
      options,
      correctAnswer: options.indexOf(item.meaningVi),
      explanationVi: `"${item.word}" ${item.ipaUs || ''} — ${item.meaningVi}. (${item.definitionEn})`
    });
  });

  return questions;
}

/**
 * Builds a comprehensive Placement / Skip Test (default 20 questions: 15 MC/Cloze + 5 Dictation)
 * sampled evenly across all lessons in a topic or CEFR tier.
 */
export function buildPlacementTestQuestions(
  lessons: CurriculumVocabLesson[],
  totalMc: number = 15,
  totalDictation: number = 5,
  seed: number = 99
): CurriculumQuizQuestion[] {
  const allWords = lessons.flatMap((l) => l.words);
  if (allWords.length === 0) return [];

  const sampled = deterministicShuffle(allWords, seed);
  const mcTargets = sampled.slice(0, Math.min(totalMc, sampled.length));
  const mcQuestions = buildLessonQuizQuestions(mcTargets, allWords, seed + 7);

  const dictPool = sampled.slice(mcTargets.length);
  const dictTargets = (dictPool.length >= totalDictation ? dictPool : sampled).slice(0, Math.min(totalDictation, sampled.length));
  const dictQuestions: CurriculumQuizQuestion[] = dictTargets.map((item, idx) => ({
    id: `q-dict-${item.id}-${idx}`,
    kind: 'dictation',
    targetWord: item.word,
    prompt: `Nghe phát âm và gõ chính xác từ tiếng Anh (nghĩa: ${item.meaningVi}):`,
    contextSentence: maskWordInSentence(item.exampleDailyEn, item.word) || undefined,
    options: [],
    correctAnswer: 0,
    explanationVi: `Đáp án đúng: "${item.word}" ${item.ipaUs || ''} — ${item.meaningVi}.`
  }));

  return [...mcQuestions, ...dictQuestions];
}

export function buildGrammarPlacementQuestions(
  lessons: CurriculumGrammarLesson[],
  maxQuestions: number = 20,
  seed: number = 101
): CurriculumQuizQuestion[] {
  const all: CurriculumQuizQuestion[] = [];
  lessons.forEach((lesson) => {
    lesson.exercises.forEach((ex, idx) => {
      all.push({
        id: `gr-place-${lesson.id}-${idx}`,
        kind: 'meaning_mc',
        targetWord: lesson.title,
        prompt: `[${lesson.category}] ${ex.question}`,
        options: ex.options,
        correctAnswer: ex.correctAnswer,
        explanationVi: ex.explanationVi
      });
    });
  });
  return deterministicShuffle(all, seed).slice(0, Math.min(maxQuestions, all.length));
}

/**
 * Detects which target mission words a learner actually used in their spoken or written output,
 * including common morphological inflections (-s, -es, -ed, -ing, -d, -ly).
 */
export function detectUsedMissionWords(text: string, targetWords: string[]): string[] {
  const normalized = (text || '').toLowerCase();
  if (!normalized.trim()) return [];
  const used: string[] = [];

  for (const rawWord of targetWords) {
    const clean = (rawWord || '').trim().toLowerCase();
    if (!clean) continue;
    const stem = clean.length > 4 && clean.endsWith('e') ? clean.slice(0, -1) : clean;
    const pattern = new RegExp(
      `\\b(?:${escapeRegExp(clean)}(?:s|es|ed|ing|d|ly)?|${escapeRegExp(stem)}(?:ed|ing|er|est|ies|ied))\\b`,
      'i'
    );
    if (pattern.test(normalized)) {
      used.push(rawWord);
    }
  }
  return used;
}

export function curriculumWordToWordDefinition(item: CurriculumWordItem): WordDefinition {
  return {
    word: item.word,
    phonetic: item.ipaUs || item.ipaUk || '',
    partOfSpeech: item.pos || 'word',
    translation: item.meaningVi,
    definitionEn: item.definitionEn,
    exampleEn: item.exampleIeltsEn || item.exampleDailyEn,
    synonyms: item.synonyms
  };
}
