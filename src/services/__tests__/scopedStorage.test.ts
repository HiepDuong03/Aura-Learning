import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScopedStorage } from '../scopedStorage';
import { SavedWord } from '../../types';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    }
  };
}

const sampleWord = (word: string): SavedWord => ({
  id: `w-${word}`,
  word,
  phonetic: `/${word}/`,
  partOfSpeech: 'n.',
  translation: word,
  definitionEn: word,
  savedAt: Date.now(),
  easeFactor: 2.5,
  interval: 0,
  repetitions: 0,
  lapses: 0,
  state: 'new',
  dueAt: Date.now()
});

describe('ScopedStorage Multi-Tenant Partitioning', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  it('isolates saved words, custom shorts, and offsets between userA, userB, and guest', () => {
    ScopedStorage.setSavedWords('userA', [sampleWord('ubiquitous')]);
    ScopedStorage.setSavedWords('userB', [sampleWord('ephemeral')]);
    ScopedStorage.setSavedWords(null, [sampleWord('guestonly')]);

    expect(ScopedStorage.getSavedWords('userA').map(w => w.word)).toEqual(['ubiquitous']);
    expect(ScopedStorage.getSavedWords('userB').map(w => w.word)).toEqual(['ephemeral']);
    expect(ScopedStorage.getSavedWords(null).map(w => w.word)).toEqual(['guestonly']);

    ScopedStorage.setShortsOffsets('userA', { 'short-1': 0.5 });
    expect(ScopedStorage.getShortsOffsets('userA')).toEqual({ 'short-1': 0.5 });
    expect(ScopedStorage.getShortsOffsets('userB')).toEqual({});
  });

  it('clears only the targeted user partition caches', () => {
    ScopedStorage.setSavedWords('userA', [sampleWord('alpha')]);
    ScopedStorage.setSavedWords('userB', [sampleWord('beta')]);
    ScopedStorage.clearPartitionCaches('userA');

    expect(ScopedStorage.getSavedWords('userA')).toEqual([]);
    expect(ScopedStorage.getSavedWords('userB').map(w => w.word)).toEqual(['beta']);
  });

  it('starts fresh accounts at streak 1 and strictly isolates guest vs user custom lessons', () => {
    expect(ScopedStorage.getStreakDays('brandNewUser')).toBe(1);
    expect(ScopedStorage.getSavedWords('brandNewUser')).toEqual([]);

    ScopedStorage.setCustomLessons(null, [
      {
        id: 'lesson-custom-guest-1',
        youtubeId: 'FkdIpHm4fjc',
        title: 'Guest Pasted Video',
        channel: 'Guest',
        thumbnail: '',
        level: 'B1',
        topic: 'Custom',
        duration: '01:00',
        durationSec: 60,
        views: '1',
        description: '',
        subtitles: [],
        quizzes: [],
        isCustom: true
      }
    ]);

    expect(ScopedStorage.getCustomLessons(null)).toHaveLength(1);
    expect(ScopedStorage.getCustomLessons('brandNewUser')).toEqual([]);
  });
});
