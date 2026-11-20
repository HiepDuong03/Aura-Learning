import { AnkiRating, SavedWord } from '../types';

export interface ReviewSessionState {
  /** Frozen ordered list of word IDs remaining in this study session */
  queue: string[];
  /** Number of unique cards when the session started */
  initialCount: number;
  /** Word IDs that graduated (rated Hard/Good/Easy) during this session */
  completedIds: string[];
  /** Number of times each card was re-queued via Again (rating 1) in this session */
  relearnCounts: Record<string, number>;
  /** Total ratings submitted in this session (including relearning repeats) */
  totalAttempts: number;
}

/**
 * Freezes the review queue at session start so updating `dueAt` on `savedWords`
 * never mutates the queue mid-session or skips the next card.
 */
export function createReviewSession(words: SavedWord[]): ReviewSessionState {
  const uniqueIds = Array.from(new Set(words.map((w) => w.id).filter(Boolean)));
  return {
    queue: uniqueIds,
    initialCount: uniqueIds.length,
    completedIds: [],
    relearnCounts: {},
    totalAttempts: 0
  };
}

/**
 * Advances the review queue after grading the current card:
 * - Rating 1 (Again): Intra-day relearning — re-inserts the card back into the session queue
 *   (2 positions ahead or at the tail) so the learner must recall it before finishing.
 * - Rating 2/3/4 (Hard/Good/Easy): Graduates the card from today's session.
 */
export function advanceReviewSession(
  session: ReviewSessionState,
  wordId: string,
  rating: AnkiRating
): ReviewSessionState {
  const remaining = session.queue.filter((id, idx) => !(idx === 0 && id === wordId));
  const nextTotalAttempts = session.totalAttempts + 1;

  if (rating === 1) {
    const insertAt = Math.min(2, remaining.length);
    const nextQueue = [
      ...remaining.slice(0, insertAt),
      wordId,
      ...remaining.slice(insertAt)
    ];
    return {
      ...session,
      queue: nextQueue,
      relearnCounts: {
        ...session.relearnCounts,
        [wordId]: (session.relearnCounts[wordId] || 0) + 1
      },
      totalAttempts: nextTotalAttempts
    };
  }

  const nextCompleted = session.completedIds.includes(wordId)
    ? session.completedIds
    : [...session.completedIds, wordId];

  return {
    ...session,
    queue: remaining,
    completedIds: nextCompleted,
    totalAttempts: nextTotalAttempts
  };
}

export function isReviewSessionDone(session: ReviewSessionState): boolean {
  return session.queue.length === 0;
}
