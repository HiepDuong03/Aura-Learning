import { describe, it, expect } from 'vitest';
import {
  computeSpeechReactionLatencyMs,
  mergeScenarioCompletion
} from '../speakingMetrics';

describe('speakingMetrics', () => {
  it('measures true reaction latency using speechStartMs instead of full sentence end time', () => {
    const turnStartMs = 1_700_000_000_000;
    const speechStartMs = turnStartMs + 850; // Reacted in 0.85s
    const fallbackEndMs = turnStartMs + 5200; // Finished speaking long sentence after 5.2s

    const latency = computeSpeechReactionLatencyMs({
      turnStartMs,
      speechStartMs,
      fallbackEndMs
    });
    expect(latency).toBe(850);
  });

  it('falls back cleanly when speechStartMs is unavailable', () => {
    const turnStartMs = 1_700_000_000_000;
    const latency = computeSpeechReactionLatencyMs({
      turnStartMs,
      speechStartMs: null,
      fallbackEndMs: turnStartMs + 1400
    });
    expect(latency).toBe(1400);
  });

  it('tracks best score, fastest latency, and attempt count across scenario completions', () => {
    let records = mergeScenarioCompletion({}, 'a1-cafe', 78, 1900, 1000);
    expect(records['a1-cafe']).toEqual({
      scenarioId: 'a1-cafe',
      bestScore: 78,
      bestLatencyMs: 1900,
      attempts: 1,
      completedAt: 1000
    });

    // Second attempt: higher score & faster latency
    records = mergeScenarioCompletion(records, 'a1-cafe', 94, 1100, 2000);
    expect(records['a1-cafe']).toEqual({
      scenarioId: 'a1-cafe',
      bestScore: 94,
      bestLatencyMs: 1100,
      attempts: 2,
      completedAt: 2000
    });

    // Third attempt: lower score & slower latency -> best records preserved
    records = mergeScenarioCompletion(records, 'a1-cafe', 82, 1600, 3000);
    expect(records['a1-cafe']?.bestScore).toBe(94);
    expect(records['a1-cafe']?.bestLatencyMs).toBe(1100);
    expect(records['a1-cafe']?.attempts).toBe(3);
  });
});
