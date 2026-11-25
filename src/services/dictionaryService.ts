import { ContextExplanation, SentenceEvaluationResult, WordDefinition } from '../types';

// Built-in offline quick dictionary for instant zero-latency responses
const BUILTIN_DICT: Record<string, WordDefinition> = {
  honored: {
    word: 'honored',
    phonetic: '/ˈɑː.nɚd/',
    partOfSpeech: 'adjective',
    translation: 'vinh dự, tự hào',
    definitionEn: 'proud and pleased to be given an honor or special opportunity',
    exampleEn: 'I am honored to be with you today.',
    synonyms: ['proud', 'privileged', 'esteemed']
  },
  commencement: {
    word: 'commencement',
    phonetic: '/kəˈmens.mənt/',
    partOfSpeech: 'noun',
    translation: 'lễ tốt nghiệp đại học, sự bắt đầu',
    definitionEn: 'a graduation ceremony where degrees or diplomas are given',
    exampleEn: 'At your commencement from one of the finest universities.',
    synonyms: ['graduation', 'convocation', 'beginning']
  },
  graduated: {
    word: 'graduated',
    phonetic: '/ˈɡrædʒ.u.eɪ.t̬ɪd/',
    partOfSpeech: 'verb',
    translation: 'đã tốt nghiệp đại học',
    definitionEn: 'successfully completed a degree at a college or university',
    exampleEn: 'I never graduated from college.',
    synonyms: ['qualified', 'earned degree']
  },
  connecting: {
    word: 'connecting',
    phonetic: '/kəˈnek.tɪŋ/',
    partOfSpeech: 'verb',
    translation: 'kết nối, liên kết lại với nhau',
    definitionEn: 'joining or linking things together to see the pattern',
    exampleEn: 'The first story is about connecting the dots.',
    synonyms: ['linking', 'joining', 'associating']
  },
  biological: {
    word: 'biological',
    phonetic: '/ˌbaɪ.əˈlɑː.dʒɪ.kəl/',
    partOfSpeech: 'adjective',
    translation: 'ruột thịt, thuộc về sinh học',
    definitionEn: 'related by birth and blood rather than by adoption',
    exampleEn: 'My biological mother was a young graduate student.',
    synonyms: ['natural', 'birth', 'genetic']
  },
  adoption: {
    word: 'adoption',
    phonetic: '/əˈdɑːp.ʃən/',
    partOfSpeech: 'noun',
    translation: 'sự cho / nhận con nuôi',
    definitionEn: 'the legal process of taking another person’s child into your family',
    exampleEn: 'She decided to put me up for adoption.',
    synonyms: ['fostering', 'child placement']
  },
  language: {
    word: 'language',
    phonetic: '/ˈlæŋ.ɡwɪdʒ/',
    partOfSpeech: 'noun',
    translation: 'ngôn ngữ, tiếng nói',
    definitionEn: 'a system of communication consisting of sounds, words, and grammar',
    exampleEn: 'How language shapes the way we think.',
    synonyms: ['tongue', 'speech', 'dialect']
  },
  complicated: {
    word: 'complicated',
    phonetic: '/ˈkɑːm.plə.keɪ.t̬ɪd/',
    partOfSpeech: 'adjective',
    translation: 'phức tạp, rắc rối',
    definitionEn: 'involving a lot of different parts in a way that is difficult to understand',
    exampleEn: 'We can transmit really complicated thoughts.',
    synonyms: ['complex', 'intricate', 'difficult']
  },
  vibration: {
    word: 'vibration',
    phonetic: '/vaɪˈbreɪ.ʃən/',
    partOfSpeech: 'noun',
    translation: 'sự rung động, dao động sóng âm',
    definitionEn: 'continuous quick, slight shaking movement or air oscillation',
    exampleEn: 'That creates air vibrations.',
    synonyms: ['oscillation', 'tremor', 'pulse']
  },
  comfortable: {
    word: 'comfortable',
    phonetic: '/ˈkʌm.fɚ.t̬ə.bəl/',
    partOfSpeech: 'adjective',
    translation: 'thoải mái, dễ chịu',
    definitionEn: 'producing or affording physical comfort, ease, or security',
    exampleEn: 'These shoes are super comfortable!',
    synonyms: ['cozy', 'snug', 'relaxing']
  },
  caramel: {
    word: 'caramel',
    phonetic: '/ˈker.ə.mel/',
    partOfSpeech: 'noun',
    translation: 'đường thắng, kẹo caramen',
    definitionEn: 'burnt sugar used for adding flavor or color to food or drink',
    exampleEn: 'Could I please get an iced caramel latte?',
    synonyms: ['toffee']
  },
  essential: {
    word: 'essential',
    phonetic: '/ɪˈsen.ʃəl/',
    partOfSpeech: 'adjective',
    translation: 'thiết yếu, cơ bản, cốt lõi',
    definitionEn: 'necessary or of the greatest importance in a particular situation',
    exampleEn: 'We are going to learn essential English words.',
    synonyms: ['crucial', 'vital', 'indispensable']
  }
};

const clientWordCache = new Map<string, WordDefinition>();

export function normalizePhraseInput(rawWord: string): string {
  const collapsed = String(rawWord || '')
    .trim()
    .replace(/\s+/g, ' ');
  const trimmedPunct = collapsed.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
  const words = trimmedPunct.split(' ').filter(Boolean);
  if (words.length === 1) {
    return trimmedPunct.replace(/['’]s$/i, '').trim().toLowerCase();
  }
  return words.slice(0, 8).join(' ').slice(0, 80).toLowerCase();
}

export async function lookupWord(rawWord: string): Promise<WordDefinition> {
  // Preserve internal spaces for multi-word phrases & apostrophes for contractions
  const cleanWord = normalizePhraseInput(rawWord);

  if (!cleanWord) {
    throw new Error('Từ không hợp lệ');
  }

  const isMultiWord = cleanWord.includes(' ');

  // 1. Check local dictionary & in-memory cache first
  const simpleKey = isMultiWord ? cleanWord : cleanWord.replace(/[^a-zA-Z]/g, '');
  if (BUILTIN_DICT[cleanWord]) {
    return BUILTIN_DICT[cleanWord];
  }
  if (!isMultiWord && BUILTIN_DICT[simpleKey]) {
    return BUILTIN_DICT[simpleKey];
  }
  if (clientWordCache.has(cleanWord)) {
    return clientWordCache.get(cleanWord)!;
  }

  // 2. Query server-side cached master dictionary (/api/dict/lookup -> words_master DB cache)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(`/api/dict/lookup?w=${encodeURIComponent(cleanWord)}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.word) {
        const rawTrans = typeof data.translation === 'string' ? data.translation.trim() : '';
        const hasRealTranslation =
          Boolean(rawTrans) && rawTrans.toLowerCase() !== cleanWord.toLowerCase();
        const rawDef = typeof data.definitionEn === 'string' ? data.definitionEn.trim() : '';
        const isPlaceholderDef =
          !rawDef ||
          /^từ vựng tiếng anh:/i.test(rawDef) ||
          /^cụm từ tiếng anh:/i.test(rawDef) ||
          /^meaning of "/i.test(rawDef) ||
          /^expression\/phrase "/i.test(rawDef);

        const entry: WordDefinition = {
          word: data.word,
          phonetic: data.phonetic || (isMultiWord ? '' : `/${cleanWord}/`),
          partOfSpeech: data.partOfSpeech || (isMultiWord ? 'cụm từ (phrase)' : 'vocabulary'),
          translation: hasRealTranslation ? rawTrans : '',
          definitionEn: isPlaceholderDef ? '' : rawDef,
          exampleEn: data.exampleEn || '',
          synonyms: Array.isArray(data.synonyms) && data.synonyms.length > 0 ? data.synonyms : undefined
        };
        if (hasRealTranslation) {
          clientWordCache.set(cleanWord, entry);
        }
        return entry;
      }
    }
  } catch (err) {
    console.warn('[Dictionary] Backend lookup unavailable, falling back to offline entry:', err);
  }

  // Honest offline fallback (never pretend English word is its own Vietnamese translation)
  return {
    word: cleanWord,
    phonetic: isMultiWord ? '' : `/${cleanWord}/`,
    partOfSpeech: isMultiWord ? 'cụm từ (phrase)' : 'từ vựng (vocabulary)',
    translation: '',
    definitionEn: '',
    exampleEn: ''
  };
}

export async function explainInContext(params: {
  phrase: string;
  sentence: string;
  videoTitle?: string;
  token?: string | null;
}): Promise<ContextExplanation> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (params.token) {
    headers.Authorization = `Bearer ${params.token}`;
  }

  const res = await fetch('/api/ai/explain', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      phrase: params.phrase,
      sentence: params.sentence,
      videoTitle: params.videoTitle || ''
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = typeof data?.error === 'string' && data.error
      ? data.error
      : `Không thể giải thích bằng AI (HTTP ${res.status})`;
    throw new Error(errMsg);
  }

  return data as ContextExplanation;
}

export async function evaluateSentencePractice(params: {
  targetWord: string;
  userSentence: string;
  scenario: 'work' | 'daily';
  contextSentence?: string;
  token?: string | null;
}): Promise<SentenceEvaluationResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (params.token) {
    headers.Authorization = `Bearer ${params.token}`;
  }

  const res = await fetch('/api/ai/evaluate-sentence', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      targetWord: params.targetWord,
      userSentence: params.userSentence,
      scenario: params.scenario,
      contextSentence: params.contextSentence || ''
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errMsg = typeof data?.error === 'string' && data.error
      ? data.error
      : `Không thể chấm câu bằng AI (HTTP ${res.status})`;
    throw new Error(errMsg);
  }

  return data as SentenceEvaluationResult;
}

/**
 * Dịch hàng loạt phụ đề qua Backend Proxy (/api/dict/translate-batch) để tránh bị Google rate-limit trực tiếp từ browser.
 */
export async function batchTranslateSubtitles(
  subtitles: { text: string }[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];
  const CHUNK_SIZE = 40;

  for (let i = 0; i < subtitles.length; i += CHUNK_SIZE) {
    const chunk = subtitles.slice(i, i + CHUNK_SIZE);
    const texts = chunk.map(c => c.text.replace(/\n/g, ' '));

    try {
      const res = await fetch('/api/dict/translate-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts })
      });
      if (res.ok) {
        const data = await res.json();
        const translated: string[] = Array.isArray(data.translations) ? data.translations : [];
        for (let j = 0; j < chunk.length; j++) {
          results.push(translated[j]?.trim() || chunk[j].text);
        }
      } else {
        chunk.forEach((c) => results.push(c.text));
      }
    } catch (e) {
      console.warn('[Dictionary] Batch translation fallback to original text:', e);
      chunk.forEach((c) => results.push(c.text));
    }

    if (onProgress) {
      onProgress(Math.min(i + CHUNK_SIZE, subtitles.length), subtitles.length);
    }
  }

  return results;
}

// Active session token & cached voice list for zero-latency, non-overlapping TTS
let activeSpeakSessionId = 0;
let cachedVoices: SpeechSynthesisVoice[] = [];
let voiceListenerBound = false;

function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  const synth = window.speechSynthesis;
  if (!voiceListenerBound && typeof synth.addEventListener === 'function') {
    voiceListenerBound = true;
    synth.addEventListener('voiceschanged', () => {
      cachedVoices = synth.getVoices();
    });
  }
  const live = synth.getVoices();
  if (live.length > 0) {
    cachedVoices = live;
  }
  return cachedVoices;
}

function selectPreferredVoice(voices: SpeechSynthesisVoice[], lang: 'en' | 'zh'): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;
  const targetPrefix = lang === 'zh' ? 'zh' : 'en';
  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(targetPrefix));
  if (langVoices.length === 0) return undefined;

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    const name = v.name.toLowerCase();
    const locale = v.lang.toLowerCase();
    let score = 0;
    if (name.includes('natural') || name.includes('neural')) score += 100;
    if (name.includes('google us english') || name.includes('google uk english')) score += 90;
    else if (name.includes('google')) score += 75;
    if (
      name.includes('aria') ||
      name.includes('jenny') ||
      name.includes('guy') ||
      name.includes('samantha') ||
      name.includes('daniel') ||
      name.includes('xiaoxiao') ||
      name.includes('yunxi')
    ) {
      score += 60;
    }
    if (name.includes('enhanced') || name.includes('premium')) score += 40;
    if (lang === 'en' && locale === 'en-us') score += 15;
    if (lang === 'zh' && locale === 'zh-cn') score += 15;
    return score;
  };

  return [...langVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}

export interface SpeakCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Phát âm tiếng Anh tự nhiên với độ trễ ~0ms, không lặp 2 lần.
 * Dùng trực tiếp Web Speech API (ưu tiên giọng Microsoft Natural Online / Google US English / Apple Enhanced)
 * thay vì gọi hotlink translate.google.com (vốn bị chặn 403/timeout 3-4s và bắn trùng onerror + play.catch).
 */
export function speakWord(
  text: string,
  lang: 'en' | 'zh' = 'en',
  rate: number = 0.95,
  callbacks?: SpeakCallbacks
) {
  if (!text || !text.trim()) {
    callbacks?.onEnd?.();
    return;
  }

  const cleanText = text.trim();
  const sessionId = ++activeSpeakSessionId;

  let ended = false;
  const finishOnce = () => {
    if (ended || sessionId !== activeSpeakSessionId) return;
    ended = true;
    callbacks?.onEnd?.();
  };

  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    callbacks?.onStart?.();
    finishOnce();
    return;
  }

  // Hủy sạch câu đang đọc trước đó để không bao giờ xếp hàng đọc lặp
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
  utterance.rate = Math.min(2, Math.max(0.5, rate));
  utterance.pitch = 1.0;

  const preferredVoice = selectPreferredVoice(getAvailableVoices(), lang);
  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  utterance.onend = () => finishOnce();
  utterance.onerror = () => finishOnce();

  callbacks?.onStart?.();
  window.speechSynthesis.speak(utterance);
}


