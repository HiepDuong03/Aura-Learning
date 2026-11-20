import { describe, it, expect } from 'vitest';
import {
  calculateFsrsSchedule,
  fsrsRetrievability,
  fsrsNextIntervalDays,
  inferFsrsState,
  FSRS_CONSTANTS
} from '../fsrsScheduler';
import { SavedWord } from '../../types';

const ONE_DAY_MS = 86_400_000;

function makeCard(overrides: Partial<SavedWord> = {}): SavedWord {
  return {
    id: 'word-fsrs-1',
    word: 'bottleneck',
    phonetic: '/ˈbɑː.t̬əl.nek/',
    partOfSpeech: 'noun',
    translation: 'nút thắt cổ chai',
    definitionEn: 'a point of congestion in a workflow or system',
    savedAt: 1_700_000_000_000,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    lapses: 0,
    state: 'new',
    dueAt: 1_700_000_000_000,
    ...overrides
  };
}

describe('FSRS-6 Scheduler', () => {
  it('satisfies forgetting curve identity R(S, S) = 0.90 and I(0.9, S) = S', () => {
    const rAtS = fsrsRetrievability(15, 15);
    expect(rAtS).toBeCloseTo(0.9, 5);
    expect(fsrsNextIntervalDays(15, 0.9)).toBe(15);
    expect(fsrsRetrievability(0, 15)).toBe(1);
    expect(fsrsRetrievability(45, 15)).toBeLessThan(0.9);
  });

  it('schedules a new card with FSRS-6 initial stability and grows stability across successful reviews', () => {
    const t0 = 1_700_000_000_000;
    const first = calculateFsrsSchedule(makeCard(), 3, { now: t0 });
    expect(first.newState).toBe('review');
    expect(first.newStability).toBeCloseTo(2.31, 1);
    expect(first.newInterval).toBe(2);
    expect(first.isSameDayRelearn).toBe(false);

    const t1 = t0 + first.newInterval * ONE_DAY_MS;
    const second = calculateFsrsSchedule(
      makeCard({
        stability: first.newStability,
        difficulty: first.newDifficulty,
        interval: first.newInterval,
        repetitions: first.newRepetitions,
        state: first.newState,
        lastReviewedAt: t0
      }),
      3,
      { now: t1 }
    );
    expect(second.newStability).toBeGreaterThan(first.newStability * 3);
    expect(second.newInterval).toBeGreaterThanOrEqual(8);
  });

  it('triggers intra-day relearning on Again (1) while preserving residual stability on mature card lapse', () => {
    const t0 = 1_700_000_000_000;
    const t1 = t0 + 100 * ONE_DAY_MS; // Reviewed right at S = 100 days (R = 0.9)
    const matureCard = makeCard({
      stability: 100,
      difficulty: 5,
      interval: 100,
      repetitions: 5,
      state: 'review',
      lastReviewedAt: t0
    });

    const lapsed = calculateFsrsSchedule(matureCard, 1, { now: t1 });
    expect(lapsed.newState).toBe('relearning');
    expect(lapsed.isSameDayRelearn).toBe(true);
    expect(lapsed.newLapses).toBe(1);
    expect(lapsed.newRepetitions).toBe(0);
    // Intra-day dueAt is 10 minutes ahead (not +1 day!)
    expect(lapsed.dueAt - t1).toBe(FSRS_CONSTANTS.RELEARNING_STEP_MINUTES * 60_000);
    // Residual stability survives above 1 day (unlike SM-2 hard reset)
    expect(lapsed.newStability).toBeGreaterThan(1.5);
    expect(lapsed.newStability).toBeLessThan(20);
    expect(lapsed.newDifficulty).toBeGreaterThan(5);
  });

  it('migrates legacy SM-2 cards smoothly without losing learned interval progress', () => {
    const legacyCard = makeCard({
      easeFactor: 2.5,
      interval: 21,
      repetitions: 4,
      state: 'review',
      stability: undefined,
      difficulty: undefined
    });

    const inferred = inferFsrsState(legacyCard);
    expect(inferred.isNewCard).toBe(false);
    expect(inferred.stability).toBe(21);
    expect(inferred.difficulty).toBeGreaterThanOrEqual(FSRS_CONSTANTS.MIN_DIFFICULTY);
    expect(inferred.difficulty).toBeLessThanOrEqual(FSRS_CONSTANTS.MAX_DIFFICULTY);
  });

  it('caps maximum interval at 365 days and clamps difficulty to [1, 10]', () => {
    const t0 = 1_700_000_000_000;
    const easyCard = makeCard({
      stability: 280,
      difficulty: 1.1,
      interval: 280,
      repetitions: 8,
      state: 'review',
      lastReviewedAt: t0
    });

    const res = calculateFsrsSchedule(easyCard, 4, { now: t0 + 280 * ONE_DAY_MS });
    expect(res.newInterval).toBe(FSRS_CONSTANTS.MAX_INTERVAL_DAYS);
    expect(res.newDifficulty).toBeGreaterThanOrEqual(FSRS_CONSTANTS.MIN_DIFFICULTY);
    expect(res.newDifficulty).toBeLessThanOrEqual(FSRS_CONSTANTS.MAX_DIFFICULTY);
  });
});
