import { describe, it, expect } from 'vitest';
import {
  buildLessonQuizQuestions,
  buildPlacementTestQuestions,
  computeUnitStats,
  createEmptyCurriculumProgress,
  detectUsedMissionWords,
  isLessonUnlocked,
  isUnitUnlocked,
  maskWordInSentence
} from '../curriculumEngine';
import { CurriculumVocabLesson, CurriculumWordItem } from '../../types';

const sampleWords: CurriculumWordItem[] = [
  {
    id: 'w1',
    word: 'curriculum',
    ipaUs: '/kəˈrɪkjələm/',
    pos: 'n.',
    cefr: 'B2',
    topic: 'education',
    meaningVi: 'chương trình giảng dạy',
    definitionEn: 'the subjects studied in a school or college',
    exampleDailyEn: 'The school updated its curriculum this year.',
    exampleIeltsEn: 'Schools should integrate financial literacy into the national curriculum.',
    collocations: ['national curriculum'],
    synonyms: ['syllabus']
  },
  {
    id: 'w2',
    word: 'sustain',
    ipaUs: '/səˈsteɪn/',
    pos: 'v.',
    cefr: 'B2',
    topic: 'environment',
    meaningVi: 'duy trì bền vững',
    definitionEn: 'to keep something going over a long period',
    exampleDailyEn: 'It is hard to sustain focus for hours.',
    exampleIeltsEn: 'Green policies help sustain long-term economic growth.',
    collocations: ['sustain growth'],
    synonyms: ['maintain']
  },
  {
    id: 'w3',
    word: 'allocate',
    ipaUs: '/ˈæləkeɪt/',
    pos: 'v.',
    cefr: 'C1',
    topic: 'economy',
    meaningVi: 'phân bổ',
    definitionEn: 'to distribute resources for a particular purpose',
    exampleDailyEn: 'We need to allocate time wisely.',
    exampleIeltsEn: 'Governments must allocate more funds to public healthcare.',
    collocations: ['allocate resources'],
    synonyms: ['distribute']
  },
  {
    id: 'w4',
    word: 'mitigate',
    ipaUs: '/ˈmɪtɪɡeɪt/',
    pos: 'v.',
    cefr: 'C1',
    topic: 'environment',
    meaningVi: 'giảm thiểu',
    definitionEn: 'to make something less severe or painful',
    exampleDailyEn: 'Trees help mitigate heat in summer.',
    exampleIeltsEn: 'Urban forests can mitigate the impact of climate change.',
    collocations: ['mitigate risk'],
    synonyms: ['alleviate']
  }
];

describe('curriculumEngine', () => {
  it('enforces sequential lesson unlocking and instant unit unlock on placement pass', () => {
    const progress = createEmptyCurriculumProgress();
    const ids = ['u1-l01', 'u1-l02', 'u1-l03'];

    expect(isLessonUnlocked('u1', 0, ids, progress)).toBe(true);
    expect(isLessonUnlocked('u1', 1, ids, progress)).toBe(false);

    progress.lessons['u1-l01'] = { quizPassed: true, quizBestScore: 90, stars: 3, updatedAt: Date.now() };
    expect(isLessonUnlocked('u1', 1, ids, progress)).toBe(true);
    expect(isLessonUnlocked('u1', 2, ids, progress)).toBe(false);

    progress.unlockedUnits['u1'] = true;
    expect(isLessonUnlocked('u1', 2, ids, progress)).toBe(true);
  });

  it('allows free entry to all IELTS topics while gating higher CEFR levels until 50% or placement pass', () => {
    const progress = createEmptyCurriculumProgress();
    expect(isUnitUnlocked('topic-environment', 2, 'ielts_topics', progress)).toBe(true);
    expect(isUnitUnlocked('cefr-a1', 0, 'cefr_vocab', progress)).toBe(true);
    expect(isUnitUnlocked('cefr-a2', 1, 'cefr_vocab', progress, { completedLessons: 2, totalLessons: 10 })).toBe(false);
    expect(isUnitUnlocked('cefr-a2', 1, 'cefr_vocab', progress, { completedLessons: 5, totalLessons: 10 })).toBe(true);

    progress.unlockedUnits['cefr-b1'] = true;
    expect(isUnitUnlocked('cefr-b1', 2, 'cefr_vocab', progress, { completedLessons: 0, totalLessons: 10 })).toBe(true);
  });

  it('masks target word in Cloze sentences without leaking the answer', () => {
    const masked = maskWordInSentence(
      'Governments must allocate more funds to public healthcare.',
      'allocate'
    );
    expect(masked).toBe('Governments must ______ more funds to public healthcare.');
    expect(masked?.toLowerCase()).not.toContain('allocate');
  });

  it('builds valid 4-option quiz & placement test questions without duplicate options', () => {
    const quiz = buildLessonQuizQuestions(sampleWords, sampleWords, 7);
    expect(quiz).toHaveLength(4);
    for (const q of quiz) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.correctAnswer).toBeGreaterThanOrEqual(0);
      expect(q.correctAnswer).toBeLessThan(4);
      if (q.kind === 'cloze_mc' && q.contextSentence) {
        expect(q.contextSentence.toLowerCase()).not.toContain(q.targetWord.toLowerCase());
      }
    }

    const lessons: CurriculumVocabLesson[] = [
      { id: 't-l01', lessonNumber: 1, title: 'Bài 01', wordCount: 4, words: sampleWords }
    ];
    const placement = buildPlacementTestQuestions(lessons, 3, 2, 11);
    expect(placement.filter((q) => q.kind !== 'dictation')).toHaveLength(3);
    expect(placement.filter((q) => q.kind === 'dictation')).toHaveLength(2);
  });

  it('detects used mission words including morphological inflections in speaking/writing output', () => {
    const used = detectUsedMissionWords(
      'Schools are allocating funds to mitigate risks while sustaining high standards.',
      ['curriculum', 'sustain', 'allocate', 'mitigate']
    );
    expect(used).toEqual(['sustain', 'allocate', 'mitigate']);
  });

  it('computes accurate unit completion percentage and stars', () => {
    const progress = createEmptyCurriculumProgress();
    progress.lessons['l1'] = { quizPassed: true, stars: 3, updatedAt: 1 };
    progress.lessons['l2'] = { quizPassed: false, stars: 1, updatedAt: 2 };
    const stats = computeUnitStats(['l1', 'l2', 'l3', 'l4'], progress);
    expect(stats).toEqual({
      completedLessons: 1,
      totalLessons: 4,
      earnedStars: 4,
      maxStars: 12,
      percent: 25
    });
  });
});
