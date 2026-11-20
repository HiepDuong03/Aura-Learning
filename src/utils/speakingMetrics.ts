export interface ScenarioCompletionRecord {
  scenarioId: string;
  bestScore: number;
  bestLatencyMs: number | null;
  attempts: number;
  completedAt: number;
}

/**
 * Computes true conversational reaction latency (Turn start -> First detected speech),
 * per MDN SpeechRecognition `speechstart` / VAD `onSpeechStart` semantics.
 * Prevents penalizing learners for speaking longer sentences.
 */
export function computeSpeechReactionLatencyMs(params: {
  turnStartMs: number;
  speechStartMs: number | null;
  fallbackEndMs: number;
}): number {
  const { turnStartMs, speechStartMs, fallbackEndMs } = params;
  const anchor =
    typeof speechStartMs === 'number' && speechStartMs >= turnStartMs
      ? speechStartMs
      : fallbackEndMs;
  return Math.max(100, Math.round(anchor - turnStartMs));
}

/**
 * Updates per-scenario mastery history while preserving the learner's highest score
 * and fastest reaction time.
 */
export function mergeScenarioCompletion(
  current: Record<string, ScenarioCompletionRecord>,
  scenarioId: string,
  score: number,
  latencyMs: number | null,
  now: number = Date.now()
): Record<string, ScenarioCompletionRecord> {
  const existing = current[scenarioId];
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const bestScore = existing ? Math.max(existing.bestScore, safeScore) : safeScore;

  let bestLatencyMs: number | null = existing?.bestLatencyMs ?? null;
  if (typeof latencyMs === 'number' && latencyMs > 0) {
    bestLatencyMs =
      bestLatencyMs === null ? Math.round(latencyMs) : Math.min(bestLatencyMs, Math.round(latencyMs));
  }

  return {
    ...current,
    [scenarioId]: {
      scenarioId,
      bestScore,
      bestLatencyMs,
      attempts: (existing?.attempts || 0) + 1,
      completedAt: now
    }
  };
}
