import { describe, expect, it, vi } from 'vitest';
import { extractSelectablePhrase, tokenizeChatText } from '../roleplayTextHelper';
import {
  resolveVadThreshold,
  VAD_THRESHOLD_NOISY,
  VAD_THRESHOLD_NORMAL,
  VoiceActivityDetector
} from '../voiceActivityDetector';
import { ScopedStorage } from '../../services/scopedStorage';
import {
  buildCorrectionModeInstruction,
  generateFallbackFeedbackReport,
  VALID_CORRECTION_MODES
} from '../../../api/ai-dict-router.js';

describe('roleplayTextHelper (Langua Interactive Word DOM)', () => {
  it('tokenizes words and preserves punctuation and spacing', () => {
    const tokens = tokenizeChatText("Could I get an iced oat-milk latte, please?");
    const words = tokens.filter((t) => t.isWord).map((t) => t.cleanWord);
    expect(words).toEqual(['could', 'i', 'get', 'an', 'iced', 'oat-milk', 'latte', 'please']);
    expect(tokens.map((t) => t.raw).join('')).toBe("Could I get an iced oat-milk latte, please?");
  });

  it('extracts valid multi-word phrases within Langua 70-char cap', () => {
    expect(extractSelectablePhrase('  walk me   through  ')).toBe('walk me through');
    expect(extractSelectablePhrase('singleword')).toBeNull();
    expect(extractSelectablePhrase('a '.repeat(40))).toBeNull();
  });
});

describe('VoiceActivityDetector noisy-mode presets', () => {
  it('resolves normal and noisy environment thresholds cleanly', () => {
    expect(resolveVadThreshold(false)).toBe(VAD_THRESHOLD_NORMAL);
    expect(resolveVadThreshold(true)).toBe(VAD_THRESHOLD_NOISY);
    expect(resolveVadThreshold(true, 0.05)).toBe(0.05);
  });

  it('updates threshold dynamically via setNoisyEnvironment', () => {
    const vad = new VoiceActivityDetector({ noisyEnvironment: false });
    expect(vad.getThreshold()).toBe(VAD_THRESHOLD_NORMAL);
    vad.setNoisyEnvironment(true);
    expect(vad.getThreshold()).toBe(VAD_THRESHOLD_NOISY);
    vad.destroy();
  });
});

describe('AI Roleplay Langua correction modes & feedback report fallback', () => {
  it('builds distinct prompt rules for all 5 correction modes', () => {
    expect(VALID_CORRECTION_MODES).toEqual([
      'off',
      'written',
      'verbal_subtle',
      'verbal_explicit',
      'verbal_repeat'
    ]);
    const rules = VALID_CORRECTION_MODES.map((m) => buildCorrectionModeInstruction(m));
    expect(new Set(rules).size).toBe(5);
    expect(buildCorrectionModeInstruction('verbal_subtle')).toContain('Recasting');
    expect(buildCorrectionModeInstruction('verbal_repeat')).toContain('repeat');
  });

  it('produces deterministic fallback feedback report with mistakes and SRS vocab', () => {
    const report = generateFallbackFeedbackReport({
      mission: 'Gọi latte ít ngọt',
      messages: [
        { sender: 'AI', text: 'What can I get for you?' },
        {
          sender: 'User',
          text: 'I want an iced latte please.',
          correction: "I'd like an iced latte, please.",
          nativeRephrase: 'Could I please get an iced oat latte, half-sweet?',
          grammarTip: "Dùng 'Could I please get' tự nhiên hơn 'I want'."
        },
        {
          sender: 'User',
          text: 'Can I have the wifi password too?',
          nativeRephrase: 'Could I also grab the Wi-Fi password?'
        }
      ]
    });

    expect(report.isFallback).toBe(true);
    expect(report.overallScore).toBeGreaterThanOrEqual(55);
    expect(report.overallScore).toBeLessThanOrEqual(95);
    expect(report.mistakes.length).toBe(2);
    expect(report.mistakes[0]?.category).toBe('grammar');
    expect(report.keyVocabulary.length).toBe(2);
    expect(report.keyVocabulary[0]?.phrase).toContain('iced oat latte');
  });

  it('persists custom roleplay personas per user partition without cross-account leakage', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      get length() {
        return store.size;
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      }
    });

    ScopedStorage.setCustomRoleplayPersonas('user-a', [
      {
        id: 'custom-rp-1',
        name: 'Đàm phán lương',
        role: 'Hiring Manager',
        avatar: '',
        situation: 'Salary negotiation',
        mission: 'Ask for 15% raise',
        initialMessage: 'Hi!',
        initialTranslation: 'Chào bạn!',
        isCustom: true
      }
    ]);

    expect(ScopedStorage.getCustomRoleplayPersonas('user-a')).toHaveLength(1);
    expect(ScopedStorage.getCustomRoleplayPersonas('user-a')[0]?.name).toBe('Đàm phán lương');
    expect(ScopedStorage.getCustomRoleplayPersonas('user-b')).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});
