import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildPeelScaffold,
  buildWritingPrompts,
  getDefaultWritingMode,
  getRecommendedWordTarget,
  getWritingLinkers
} from '../writingCoachPrompts';
import { ScopedStorage } from '../../services/scopedStorage';

const SAMPLE_WORDS = [
  { word: 'early childhood education', meaningVi: 'giáo dục mầm non' },
  { word: 'vocational training', meaningVi: 'đào tạo nghề' },
  { word: 'higher education', meaningVi: 'giáo dục đại học' }
];

describe('writingCoachPrompts', () => {
  it('generates 3 distinct IELTS Task 2 prompt types incorporating target vocabulary', () => {
    const prompts = buildWritingPrompts({
      scenario: 'ielts',
      writingMode: 'paragraph',
      topicName: 'Education & Learning',
      cefr: 'B2',
      targetWords: SAMPLE_WORDS
    });

    expect(prompts).toHaveLength(3);
    expect(prompts[0].taskTypeLabel).toContain('Opinion');
    expect(prompts[1].taskTypeLabel).toContain('Discussion');
    expect(prompts[2].taskTypeLabel).toContain('Problem & Solution');
    expect(prompts[0].promptEn).toContain('early childhood education');
    expect(prompts[0].promptEn).toContain('vocational training');
  });

  it('adapts prompts for grammarFocus, workplace, and daily scenarios', () => {
    const grammarPrompts = buildWritingPrompts({
      scenario: 'ielts',
      writingMode: 'sentence',
      topicName: 'Conditionals',
      targetWords: [],
      grammarFocus: { title: 'Mixed Conditionals', formula: 'If + S + had V3, S + would + V' }
    });
    expect(grammarPrompts[0].promptEn).toContain('Mixed Conditionals');

    const workPrompts = buildWritingPrompts({
      scenario: 'work',
      writingMode: 'sentence',
      topicName: 'Work',
      targetWords: SAMPLE_WORDS
    });
    expect(workPrompts[0].taskTypeLabel).toContain('Workplace');

    const dailyPrompts = buildWritingPrompts({
      scenario: 'daily',
      writingMode: 'sentence',
      topicName: 'Daily',
      targetWords: SAMPLE_WORDS
    });
    expect(dailyPrompts[0].taskTypeLabel).toContain('Đời sống');
  });

  it('builds a 4-step PEEL scaffold and returns appropriate word targets & default modes', () => {
    const prompts = buildWritingPrompts({
      scenario: 'ielts',
      writingMode: 'paragraph',
      topicName: 'Education',
      targetWords: SAMPLE_WORDS
    });
    const peel = buildPeelScaffold('ielts', prompts[0]);
    expect(peel.map((s) => s.code)).toEqual(['P', 'E1', 'E2', 'L']);
    expect(getWritingLinkers('ielts').length).toBeGreaterThanOrEqual(5);

    expect(getRecommendedWordTarget('paragraph').minWords).toBe(80);
    expect(getRecommendedWordTarget('paragraph').minTargetWords).toBe(2);
    expect(getDefaultWritingMode('ielts', 'B2')).toBe('paragraph');
    expect(getDefaultWritingMode('ielts', 'A1')).toBe('sentence');
    expect(getDefaultWritingMode('work', 'C1')).toBe('sentence');
  });
});

describe('ScopedStorage writing draft isolation', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
        get length() {
          return store.size;
        },
        key: (i: number) => Array.from(store.keys())[i] ?? null
      }
    });
  });

  it('isolates writing drafts strictly per userId and clears empty drafts', () => {
    ScopedStorage.setWritingDraft('user_a', 'mission-1', 'Draft by User A about higher education.');
    ScopedStorage.setWritingDraft('user_b', 'mission-1', 'Draft by User B.');

    expect(ScopedStorage.getWritingDraft('user_a', 'mission-1')).toBe('Draft by User A about higher education.');
    expect(ScopedStorage.getWritingDraft('user_b', 'mission-1')).toBe('Draft by User B.');
    expect(ScopedStorage.getWritingDraft(null, 'mission-1')).toBe('');

    ScopedStorage.setWritingDraft('user_a', 'mission-1', '   ');
    expect(ScopedStorage.getWritingDraft('user_a', 'mission-1')).toBe('');
  });
});
