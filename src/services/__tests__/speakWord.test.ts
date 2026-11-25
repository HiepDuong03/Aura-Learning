import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { speakWord } from '../dictionaryService';

class MockSpeechSynthesisUtterance {
  text: string;
  lang = '';
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

describe('speakWord (zero-latency single-shot TTS)', () => {
  const originalWindow = globalThis.window;
  const originalUtterance = globalThis.SpeechSynthesisUtterance;

  let cancelMock: ReturnType<typeof vi.fn>;
  let speakMock: ReturnType<typeof vi.fn>;
  let spokenUtterances: MockSpeechSynthesisUtterance[];

  beforeEach(() => {
    spokenUtterances = [];
    cancelMock = vi.fn();
    speakMock = vi.fn((u: MockSpeechSynthesisUtterance) => {
      spokenUtterances.push(u);
    });

    const mockVoices: SpeechSynthesisVoice[] = [
      {
        default: true,
        lang: 'en-US',
        localService: true,
        name: 'Microsoft David Desktop',
        voiceURI: 'Microsoft David Desktop'
      },
      {
        default: false,
        lang: 'en-US',
        localService: false,
        name: 'Microsoft Aria Online (Natural) - English (United States)',
        voiceURI: 'Microsoft Aria Online (Natural)'
      }
    ];

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        speechSynthesis: {
          cancel: cancelMock,
          speak: speakMock,
          getVoices: () => mockVoices,
          addEventListener: vi.fn()
        }
      }
    });

    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockSpeechSynthesisUtterance
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: originalWindow
    });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: originalUtterance
    });
  });

  it('speaks immediately once using the highest-ranked Natural voice without double playback', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();

    speakWord('Early childhood education narrows the gap.', 'en', 0.92, { onStart, onEnd });

    expect(cancelMock).toHaveBeenCalledTimes(1);
    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(spokenUtterances[0].voice?.name).toContain('Aria Online (Natural)');
    expect(spokenUtterances[0].rate).toBe(0.92);

    spokenUtterances[0].onend?.();
    spokenUtterances[0].onerror?.();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('ignores stale onend/onerror callbacks when a newer speakWord call interrupts the previous one', () => {
    const firstOnEnd = vi.fn();
    const secondOnEnd = vi.fn();

    speakWord('First sentence.', 'en', 0.92, { onEnd: firstOnEnd });
    speakWord('Second sentence.', 'en', 0.92, { onEnd: secondOnEnd });

    expect(cancelMock).toHaveBeenCalledTimes(2);
    expect(speakMock).toHaveBeenCalledTimes(2);

    // Late event from canceled first utterance must NOT trigger callback
    spokenUtterances[0].onend?.();
    expect(firstOnEnd).not.toHaveBeenCalled();

    spokenUtterances[1].onend?.();
    expect(secondOnEnd).toHaveBeenCalledTimes(1);
  });
});
