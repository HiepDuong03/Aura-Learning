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
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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

// Current active audio instance to prevent overlapping speech
let currentAudio: HTMLAudioElement | null = null;

export interface SpeakCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Phát âm tiếng Anh tự nhiên (Natural Human-like Audio)
 * Ưu tiên:
 * 1. Google Neural Speech Stream (Âm thanh tự nhiên, ngữ điệu chuẩn bản xứ)
 * 2. Microsoft Natural Online / Google US English Neural Voices (không bị máy móc như David Desktop)
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
  let ended = false;
  const finishOnce = () => {
    if (ended) return;
    ended = true;
    callbacks?.onEnd?.();
  };

  // Dừng âm thanh đang phát trước đó nếu có
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  callbacks?.onStart?.();

  // 1. Phương án 1: Google Neural High-Definition Audio (Giọng tự nhiên nhất, không máy móc)
  try {
    const encoded = encodeURIComponent(cleanText.slice(0, 200));
    const targetLang = lang === 'zh' ? 'zh-CN' : 'en-US';
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${targetLang}&client=tw-ob`;

    const audio = new Audio(googleTtsUrl);
    audio.playbackRate = rate; // Tốc độ tùy chỉnh (0.75x chậm, 0.95x tự nhiên, 1.0x chuẩn)
    currentAudio = audio;

    audio.onended = finishOnce;
    audio.onerror = () => {
      speakWithNeuralBrowserVoice(cleanText, lang, rate, finishOnce);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Google TTS audio playback blocked, falling back to Neural Browser Voice', err);
        speakWithNeuralBrowserVoice(cleanText, lang, rate, finishOnce);
      });
      return;
    }
  } catch (e) {
    console.warn('Neural audio stream error', e);
  }

  // 2. Phương án 2: Lọc giọng Neural Browser (Jenny, Guy, Aria Natural)
  speakWithNeuralBrowserVoice(cleanText, lang, rate, finishOnce);
}

function speakWithNeuralBrowserVoice(
  text: string,
  lang: 'en' | 'zh',
  rate: number = 0.95,
  onFinished?: () => void
) {
  if (!('speechSynthesis' in window)) {
    onFinished?.();
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
  utterance.rate = rate;
  utterance.pitch = 1.0;
  utterance.onend = () => onFinished?.();
  utterance.onerror = () => onFinished?.();

  const voices = window.speechSynthesis.getVoices();

  // Tìm kiếm các giọng AI Neural / Natural cao cấp
  const targetPrefix = lang === 'zh' ? 'zh' : 'en';
  const naturalVoice = voices.find(
    (v) =>
      v.lang.startsWith(targetPrefix) &&
      (v.name.includes('Natural') ||
        v.name.includes('Neural') ||
        v.name.includes('Google') ||
        v.name.includes('Jenny') ||
        v.name.includes('Guy') ||
        v.name.includes('Aria') ||
        v.name.includes('Xiaoxiao') ||
        v.name.includes('Yunxi'))
  ) || voices.find((v) => v.lang.startsWith(targetPrefix));

  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  window.speechSynthesis.speak(utterance);
}


