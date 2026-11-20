import { describe, it, expect } from 'vitest';
import { buildClozeSentence } from '../clozeHelper';

describe('buildClozeSentence', () => {
  it('masks a single word case-insensitively with word boundaries', () => {
    const res = buildClozeSentence(
      'I am truly Honored to be with you today.',
      'honored'
    );
    expect(res.hasMatch).toBe(true);
    expect(res.masked).toBe('I am truly ______ to be with you today.');
    expect(res.parts.filter((p) => p.isTarget).map((p) => p.text)).toEqual(['Honored']);
  });

  it('masks a multi-word idiom or phrasal verb cleanly', () => {
    const res = buildClozeSentence(
      'Never take it for granted when someone helps you.',
      'take it for granted'
    );
    expect(res.hasMatch).toBe(true);
    expect(res.masked).toBe('Never ______ when someone helps you.');
    expect(res.parts.some((p) => p.isTarget && p.text === 'take it for granted')).toBe(true);
  });

  it('does not partially match inside longer words', () => {
    const res = buildClozeSentence('She is comfortable and comforting.', 'art');
    expect(res.hasMatch).toBe(false);
    expect(res.masked).toBe('She is comfortable and comforting.');
  });

  it('handles punctuation next to target word and regex special characters safely', () => {
    const res = buildClozeSentence(
      "Don't give up! You're doing great.",
      "give up"
    );
    expect(res.hasMatch).toBe(true);
    expect(res.masked).toBe("Don't ______! You're doing great.");
  });

  it('returns hasMatch=false for empty inputs', () => {
    expect(buildClozeSentence('', 'word')).toEqual({
      masked: '',
      hasMatch: false,
      parts: []
    });
    expect(buildClozeSentence('Hello world', '')).toEqual({
      masked: 'Hello world',
      hasMatch: false,
      parts: [{ text: 'Hello world', isTarget: false }]
    });
  });
});
