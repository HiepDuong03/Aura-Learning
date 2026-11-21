import { describe, it, expect } from 'vitest';
import { decodeConnectedSpeech } from '../connectedSpeechDecoder';

describe('decodeConnectedSpeech', () => {
  it('detects high-frequency American reductions (going to -> gonna, want to -> wanna)', () => {
    const hints = decodeConnectedSpeech('I am going to figure it out because I want to help.');
    expect(hints.length).toBe(2);
    expect(hints.map((h) => h.spoken)).toContain('gonna');
  });

  it('detects palatalization / assimilation patterns (what do you -> whaddaya, would you -> wouldja)', () => {
    const hints1 = decodeConnectedSpeech('What do you recommend?');
    expect(hints1).toHaveLength(1);
    expect(hints1[0].written.toLowerCase()).toBe('what do you');
    expect(hints1[0].spoken).toBe('whaddaya');
    expect(hints1[0].type).toBe('assimilation');

    const hints2 = decodeConnectedSpeech('Would you like a side?');
    expect(hints2).toHaveLength(1);
    expect(hints2[0].spoken).toBe('wouldja');
  });

  it('detects Flap-T and linking phrases (make it a -> may-ki-da, figure it out)', () => {
    const hints = decodeConnectedSpeech('That sounds good. Make it a combo.');
    expect(hints).toHaveLength(1);
    expect(hints[0].spoken).toBe('may-ki-da');
    expect(hints[0].type).toBe('flap_t');
  });

  it('does not overlap broader rules when a more specific rule matches', () => {
    // "what do you" should match instead of both "what do you" and "do you"
    const hints = decodeConnectedSpeech('What do you want to order today?', 3);
    const ids = hints.map((h) => h.id);
    expect(ids).toContain('what-do-you');
    expect(ids).not.toContain('do-you');
    expect(ids).toContain('want-to');
  });

  it('caps hints to maxHints (default 2) to prevent mobile visual overload', () => {
    const hints = decodeConnectedSpeech(
      'I am going to tell you what do you want to kind of figure it out.'
    );
    expect(hints.length).toBe(2);
  });

  it('returns empty array for clean sentences without connected speech patterns or empty input', () => {
    expect(decodeConnectedSpeech('')).toEqual([]);
    expect(decodeConnectedSpeech('Regular is fine.')).toEqual([]);
  });
});
