import { describe, it, expect } from 'vitest';
import { calculateAnkiSchedule, ANKI_CONSTANTS } from '../ankiScheduler';
import { SavedWord } from '../../types';

function makeCard(overrides: Partial<SavedWord> = {}): SavedWord {
  return {
    id: 'word-test-1',
    word: 'resilient',
    phonetic: '/rɪˈzɪl.jənt/',
    partOfSpeech: 'adjective',
    translation: 'kiên cường',
    definitionEn: 'able to recover quickly',
    savedAt: 1_700_000_000_000,
    easeFactor: ANKI_CONSTANTS.INITIAL_EASE_FACTOR,
    interval: 0,
    repetitions: 0,
    lapses: 0,
    state: 'new',
    dueAt: 1_700_000_000_000,
    ...overrides
  };
}

describe('Anki SM-2 Scheduler', () => {
  it('graduates a new card on Good (rating 3) to 1 day then 6 days', () => {
    const first = calculateAnkiSchedule(makeCard(), 3, true);
    expect(first.newState).toBe('review');
    expect(first.newRepetitions).toBe(1);
    expect(first.newInterval).toBe(ANKI_CONSTANTS.GRADUATING_INTERVAL_GOOD);

    const second = calculateAnkiSchedule(
      makeCard({ interval: first.newInterval, repetitions: first.newRepetitions, easeFactor: first.newEaseFactor, state: first.newState }),
      3,
      true
    );
    expect(second.newRepetitions).toBe(2);
    expect(second.newInterval).toBe(6);
  });

  it('resets repetitions, increments lapses, and floors easeFactor at 1.30 on Again (rating 1)', () => {
    const res = calculateAnkiSchedule(
      makeCard({ easeFactor: 1.35, interval: 14, repetitions: 4, lapses: 0, state: 'review' }),
      1,
      true
    );
    expect(res.newState).toBe('relearning');
    expect(res.newRepetitions).toBe(0);
    expect(res.newLapses).toBe(1);
    expect(res.newInterval).toBe(1);
    expect(res.newEaseFactor).toBe(ANKI_CONSTANTS.MIN_EASE_FACTOR);
  });

  it('caps maximum interval at ANKI_CONSTANTS.MAX_INTERVAL (365 days)', () => {
    const res = calculateAnkiSchedule(
      makeCard({ easeFactor: 3.0, interval: 300, repetitions: 8, state: 'review' }),
      4,
      true
    );
    expect(res.newInterval).toBe(ANKI_CONSTANTS.MAX_INTERVAL);
  });
});
