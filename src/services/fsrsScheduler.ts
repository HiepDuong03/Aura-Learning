import { AnkiRating, CardState, SavedWord } from '../types';

/**
 * Official FSRS-6 default 21 parameters (open-spaced-repetition/awesome-fsrs).
 * Fitted on ~350M Anki reviews across ~10,000 collections.
 */
export const FSRS6_DEFAULT_WEIGHTS = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001,
  1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014,
  1.8729, 0.5425, 0.0912, 0.0658, 0.1542
] as const;

export const FSRS_CONSTANTS = {
  DESIRED_RETENTION: 0.9,
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 10,
  MIN_STABILITY: 0.1,
  MAX_STABILITY: 36500,
  MAX_INTERVAL_DAYS: 365,
  RELEARNING_STEP_MINUTES: 10
} as const;

const ONE_DAY_MS = 86_400_000;
const ONE_MIN_MS = 60_000;

const W = FSRS6_DEFAULT_WEIGHTS;
const DECAY = W[20];
const FORGETTING_FACTOR = Math.pow(0.9, -1 / DECAY) - 1;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * FSRS-6 power-law forgetting curve:
 * R(t, S) = (1 + factor * (t / S))^(-w20), guaranteed R(S, S) = 0.9
 */
export function fsrsRetrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  if (elapsedDays <= 0) return 1;
  return clamp(Math.pow(1 + (FORGETTING_FACTOR * elapsedDays) / stability, -DECAY), 0, 1);
}

/**
 * Exact inverse of forgetting curve to schedule next interval I(r, S) in days.
 */
export function fsrsNextIntervalDays(
  stability: number,
  desiredRetention: number = FSRS_CONSTANTS.DESIRED_RETENTION
): number {
  const safeR = clamp(desiredRetention, 0.7, 0.98);
  const rawDays = (stability / FORGETTING_FACTOR) * (Math.pow(safeR, -1 / DECAY) - 1);
  return clamp(Math.round(rawDays), 1, FSRS_CONSTANTS.MAX_INTERVAL_DAYS);
}

/**
 * Initial stability S0(G) = w[G - 1]
 */
export function fsrsInitialStability(rating: AnkiRating): number {
  return clamp(W[rating - 1], FSRS_CONSTANTS.MIN_STABILITY, FSRS_CONSTANTS.MAX_STABILITY);
}

/**
 * Initial difficulty D0(G) = w4 - exp(w5 * (G - 1)) + 1, clamped to [1, 10]
 */
export function fsrsInitialDifficulty(rating: AnkiRating): number {
  const raw = W[4] - Math.exp(W[5] * (rating - 1)) + 1;
  return clamp(raw, FSRS_CONSTANTS.MIN_DIFFICULTY, FSRS_CONSTANTS.MAX_DIFFICULTY);
}

/**
 * Difficulty update with linear damping + mean reversion toward D0(4) (eliminates SM-2 "ease hell")
 */
export function fsrsNextDifficulty(currentDifficulty: number, rating: AnkiRating): number {
  const deltaD = -W[6] * (rating - 3);
  const damped = currentDifficulty + deltaD * ((10 - currentDifficulty) / 9);
  const targetD = fsrsInitialDifficulty(4);
  const reverted = W[7] * targetD + (1 - W[7]) * damped;
  return clamp(reverted, FSRS_CONSTANTS.MIN_DIFFICULTY, FSRS_CONSTANTS.MAX_DIFFICULTY);
}

/**
 * FSRS-6 same-day review stability: S'(S, G) = S * exp(w17 * (G - 3 + w18)) * S^(-w19)
 */
export function fsrsSameDayStability(stability: number, rating: AnkiRating): number {
  const safeS = Math.max(FSRS_CONSTANTS.MIN_STABILITY, stability);
  let sInc = Math.exp(W[17] * (rating - 3 + W[18])) * Math.pow(safeS, -W[19]);
  if (rating >= 2) {
    sInc = Math.max(1, sInc);
  }
  return clamp(safeS * sInc, FSRS_CONSTANTS.MIN_STABILITY, FSRS_CONSTANTS.MAX_STABILITY);
}

/**
 * Post-recall stability S'_r(D, S, R, G) for Hard (2), Good (3), Easy (4)
 */
export function fsrsRecallStability(
  difficulty: number,
  stability: number,
  retrievability: number,
  rating: AnkiRating
): number {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  const growth =
    Math.exp(W[8]) *
    (11 - difficulty) *
    Math.pow(Math.max(FSRS_CONSTANTS.MIN_STABILITY, stability), -W[9]) *
    (Math.exp(W[10] * (1 - retrievability)) - 1) *
    hardPenalty *
    easyBonus;

  const nextS = stability * (1 + Math.max(0, growth));
  return clamp(nextS, FSRS_CONSTANTS.MIN_STABILITY, FSRS_CONSTANTS.MAX_STABILITY);
}

/**
 * Post-lapse stability S'_f(D, S, R) for Again (1) — preserves residual memory instead of hard reset
 */
export function fsrsForgetStability(
  difficulty: number,
  stability: number,
  retrievability: number
): number {
  const postLapse =
    W[11] *
    Math.pow(difficulty, -W[12]) *
    (Math.pow(stability + 1, W[13]) - 1) *
    Math.exp(W[14] * (1 - retrievability));
  const cap = stability / Math.exp(W[17] * W[18]);
  return clamp(Math.min(postLapse, cap), FSRS_CONSTANTS.MIN_STABILITY, FSRS_CONSTANTS.MAX_STABILITY);
}

/**
 * Seamlessly infers initial FSRS DSR state from legacy SM-2 cards without losing progress.
 */
export function inferFsrsState(word: SavedWord): { stability: number; difficulty: number; isNewCard: boolean } {
  const hasExplicitFsrs =
    typeof word.stability === 'number' &&
    word.stability > 0 &&
    typeof word.difficulty === 'number' &&
    word.difficulty >= 1;

  if (hasExplicitFsrs) {
    return {
      stability: word.stability!,
      difficulty: clamp(word.difficulty!, FSRS_CONSTANTS.MIN_DIFFICULTY, FSRS_CONSTANTS.MAX_DIFFICULTY),
      isNewCard: word.state === 'new' && (word.repetitions || 0) === 0
    };
  }

  const isNewCard =
    (word.state === 'new' || !word.state) &&
    (word.repetitions || 0) === 0 &&
    (word.interval || 0) <= 0;

  if (isNewCard) {
    return {
      stability: 0,
      difficulty: fsrsInitialDifficulty(3),
      isNewCard: true
    };
  }

  // Migrate legacy SM-2 card cleanly into DSR space
  const migratedStability = clamp(Math.max(1, word.interval || 1), FSRS_CONSTANTS.MIN_STABILITY, FSRS_CONSTANTS.MAX_STABILITY);
  const ef = word.easeFactor || 2.5;
  // Map SM-2 easeFactor [1.3..2.8] inversely to FSRS difficulty [8.5..2.5]
  const migratedDifficulty = clamp(8.5 - ((ef - 1.3) / 1.5) * 6.0, FSRS_CONSTANTS.MIN_DIFFICULTY, FSRS_CONSTANTS.MAX_DIFFICULTY);

  return {
    stability: migratedStability,
    difficulty: round2(migratedDifficulty),
    isNewCard: false
  };
}

export interface FsrsCalculationResult {
  newStability: number;
  newDifficulty: number;
  newInterval: number; // Scheduled days (or 1 on lapse, with intra-day dueAt)
  newRepetitions: number;
  newLapses: number;
  newState: CardState;
  newEaseFactor: number; // Backwards-compatible mirror of difficulty for legacy displays
  dueAt: number;
  retrievabilityBefore: number; // 0..100
  isSameDayRelearn: boolean;
}

export function calculateFsrsSchedule(
  word: SavedWord,
  rating: AnkiRating,
  options?: { now?: number; desiredRetention?: number }
): FsrsCalculationResult {
  const now = options?.now ?? Date.now();
  const desiredRetention = options?.desiredRetention ?? FSRS_CONSTANTS.DESIRED_RETENTION;
  const { stability, difficulty, isNewCard } = inferFsrsState(word);

  let repetitions = word.repetitions || 0;
  let lapses = word.lapses || 0;
  let newStability: number;
  let newDifficulty: number;
  let newState: CardState;
  let retrievabilityBefore = 100;

  if (isNewCard || stability <= 0) {
    newStability = fsrsInitialStability(rating);
    newDifficulty = fsrsInitialDifficulty(rating);
    if (rating === 1) {
      lapses += 1;
      repetitions = 0;
      newState = 'relearning';
    } else {
      repetitions = 1;
      newState = 'review';
    }
  } else {
    const lastTs = word.lastReviewedAt || word.savedAt || now;
    const elapsedDays = Math.max(0, (now - lastTs) / ONE_DAY_MS);
    const isSameDay = elapsedDays < 0.5;
    const r = fsrsRetrievability(elapsedDays, stability);
    retrievabilityBefore = Math.round(r * 100);

    newDifficulty = fsrsNextDifficulty(difficulty, rating);

    if (rating === 1) {
      lapses += 1;
      repetitions = 0;
      newState = 'relearning';
      newStability = isSameDay
        ? fsrsSameDayStability(stability, 1)
        : fsrsForgetStability(newDifficulty, stability, r);
    } else {
      repetitions += 1;
      newState = 'review';
      newStability = isSameDay
        ? fsrsSameDayStability(stability, rating)
        : fsrsRecallStability(newDifficulty, stability, r, rating);
    }
  }

  newStability = round2(newStability);
  newDifficulty = round2(newDifficulty);

  const isSameDayRelearn = rating === 1;
  const newInterval = isSameDayRelearn
    ? Math.max(1, Math.round(newStability))
    : fsrsNextIntervalDays(newStability, desiredRetention);

  // Per Anki FSRS best practice: Again triggers an intra-day relearning step (< 1 day)
  const dueAt = isSameDayRelearn
    ? now + FSRS_CONSTANTS.RELEARNING_STEP_MINUTES * ONE_MIN_MS
    : now + newInterval * ONE_DAY_MS;

  // Keep easeFactor mirrored cleanly for legacy analytics/stats compatibility
  const mirroredEase = round2(clamp(2.8 - ((newDifficulty - 1) / 9) * 1.5, 1.3, 2.8));

  return {
    newStability,
    newDifficulty,
    newInterval,
    newRepetitions: repetitions,
    newLapses: lapses,
    newState,
    newEaseFactor: mirroredEase,
    dueAt,
    retrievabilityBefore,
    isSameDayRelearn
  };
}

export function calculateFsrsRetrievability(word: SavedWord, now: number = Date.now()): number {
  const { stability, isNewCard } = inferFsrsState(word);
  if (isNewCard || stability <= 0 || !word.lastReviewedAt) {
    return 100;
  }
  const elapsedDays = Math.max(0, (now - word.lastReviewedAt) / ONE_DAY_MS);
  return Math.round(fsrsRetrievability(elapsedDays, stability) * 100);
}

export function getFsrsIntervalPreviews(
  word: SavedWord,
  now: number = Date.now()
): Record<AnkiRating, string> {
  const previews: Record<AnkiRating, string> = {
    1: 'Lặp lại ngay',
    2: '1 ngày',
    3: '2 ngày',
    4: '8 ngày'
  };

  ([1, 2, 3, 4] as AnkiRating[]).forEach((rating) => {
    if (rating === 1) {
      previews[1] = 'Lặp lại ngay (~10p)';
      return;
    }
    const res = calculateFsrsSchedule(word, rating, { now });
    if (res.newInterval === 1) {
      previews[rating] = '1 ngày';
    } else if (res.newInterval < 30) {
      previews[rating] = `${res.newInterval} ngày`;
    } else if (res.newInterval < 365) {
      previews[rating] = `${Math.round(res.newInterval / 30)} tháng`;
    } else {
      previews[rating] = `${(res.newInterval / 365).toFixed(1)} năm`;
    }
  });

  return previews;
}

export const fsrsScheduler = {
  calculateFsrsSchedule,
  calculateFsrsRetrievability,
  getFsrsIntervalPreviews,
  fsrsRetrievability,
  fsrsNextIntervalDays,
  inferFsrsState,
  weights: FSRS6_DEFAULT_WEIGHTS,
  constants: FSRS_CONSTANTS
};
