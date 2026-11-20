import { describe, it, expect } from 'vitest';
import {
  createReviewSession,
  advanceReviewSession,
  isReviewSessionDone
} from '../srsSessionQueue';
import { SavedWord } from '../../types';

function makeWord(id: string): SavedWord {
  return {
    id,
    word: id,
    phonetic: '',
    partOfSpeech: 'noun',
    translation: id,
    definitionEn: id,
    savedAt: 1_700_000_000_000,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    lapses: 0,
    state: 'new',
    dueAt: 1_700_000_000_000
  };
}

describe('srsSessionQueue', () => {
  it('freezes the session queue and visits every card sequentially without skipping', () => {
    let session = createReviewSession([makeWord('w1'), makeWord('w2'), makeWord('w3')]);
    expect(session.queue).toEqual(['w1', 'w2', 'w3']);
    expect(session.initialCount).toBe(3);

    session = advanceReviewSession(session, 'w1', 3);
    expect(session.queue).toEqual(['w2', 'w3']);
    expect(session.completedIds).toEqual(['w1']);

    session = advanceReviewSession(session, 'w2', 4);
    expect(session.queue).toEqual(['w3']);
    expect(session.completedIds).toEqual(['w1', 'w2']);

    session = advanceReviewSession(session, 'w3', 2);
    expect(isReviewSessionDone(session)).toBe(true);
    expect(session.completedIds).toEqual(['w1', 'w2', 'w3']);
    expect(session.totalAttempts).toBe(3);
  });

  it('re-queues forgotten cards (Again = 1) for intra-day relearning until recalled', () => {
    let session = createReviewSession([makeWord('w1'), makeWord('w2'), makeWord('w3')]);

    // Forget w1 -> moves back into the active session queue
    session = advanceReviewSession(session, 'w1', 1);
    expect(isReviewSessionDone(session)).toBe(false);
    expect(session.queue).toEqual(['w2', 'w3', 'w1']);
    expect(session.completedIds).toEqual([]);
    expect(session.relearnCounts['w1']).toBe(1);

    // Pass w2 and w3
    session = advanceReviewSession(session, 'w2', 3);
    session = advanceReviewSession(session, 'w3', 3);
    expect(session.queue).toEqual(['w1']);
    expect(isReviewSessionDone(session)).toBe(false);

    // Finally recall w1 -> session finishes
    session = advanceReviewSession(session, 'w1', 3);
    expect(isReviewSessionDone(session)).toBe(true);
    expect(session.completedIds).toEqual(['w2', 'w3', 'w1']);
    expect(session.totalAttempts).toBe(4);
  });
});
