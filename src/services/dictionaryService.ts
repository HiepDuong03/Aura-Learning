import { WordDefinition } from '../types';

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

export async function lookupWord(rawWord: string): Promise<WordDefinition> {
  // Keep internal apostrophes for contractions (e.g. "don't", "I'm", "Steve's")
  const normalized = rawWord.trim().replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '');
  const lookupTerm = normalized.replace(/['’]s$/i, '').trim();
  const cleanWord = lookupTerm.toLowerCase();
  
  if (!cleanWord) {
    throw new Error('Từ không hợp lệ');
  }

  // 1. Check local dictionary first for zero-latency response
  const simpleKey = cleanWord.replace(/[^a-zA-Z]/g, '');
  if (BUILTIN_DICT[cleanWord]) {
    return BUILTIN_DICT[cleanWord];
  }
  if (BUILTIN_DICT[simpleKey]) {
    return BUILTIN_DICT[simpleKey];
  }

  // 2. Query ultra-fast Google Translate API (No CORS issues, real Vietnamese meaning & POS)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(cleanWord)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const primaryTranslation = data[0]?.[0]?.[0] || cleanWord;
      
      // Extract dictionary entries (pos & alternative translations)
      let partOfSpeech = 'vocabulary';
      const synonyms: string[] = [];

      if (Array.isArray(data[1]) && data[1].length > 0) {
        const firstCategory = data[1][0];
        partOfSpeech = firstCategory[0] || 'vocabulary';
        if (Array.isArray(firstCategory[1])) {
          synonyms.push(...firstCategory[1].slice(0, 5));
        }
      }

      // POS translation mapping for display
      const posDisplayMap: Record<string, string> = {
        noun: 'danh từ (noun)',
        verb: 'động từ (verb)',
        adjective: 'tính từ (adj)',
        adverb: 'phó từ (adv)',
        preposition: 'giới từ (prep)',
        conjunction: 'liên từ (conj)',
        pronoun: 'đại từ (pron)'
      };

      return {
        word: cleanWord,
        phonetic: `/${cleanWord}/`,
        partOfSpeech: posDisplayMap[partOfSpeech] || partOfSpeech,
        translation: primaryTranslation,
        definitionEn: `Ý nghĩa của "${cleanWord}" trong ngữ cảnh: ${primaryTranslation}`,
        exampleEn: synonyms.length > 0 ? `Các nghĩa liên quan: ${synonyms.join(', ')}` : `Từ vựng tiếng Anh trong bài học.`,
        synonyms: synonyms.length > 0 ? synonyms : undefined
      };
    }
  } catch (err) {
    console.warn('Google Translate API error, falling back to offline dictionary', err);
  }

  // Fallback if network offline
  return {
    word: cleanWord,
    phonetic: `/${cleanWord}/`,
    partOfSpeech: 'từ vựng (vocabulary)',
    translation: cleanWord,
    definitionEn: `Từ vựng tiếng Anh: "${cleanWord}"`,
    exampleEn: `Tra từ điển trực tiếp trong bài học.`
  };
}

/**
 * Dịch hàng loạt các câu phụ đề từ tiếng Anh sang tiếng Việt (Chuẩn 4You / 4English)
 * Dịch theo từng lô 12 câu để tối ưu tốc độ và tránh bị chặn.
 */
export async function batchTranslateSubtitles(
  subtitles: { text: string }[],
  onProgress?: (done: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];
  const CHUNK_SIZE = 12;

  for (let i = 0; i < subtitles.length; i += CHUNK_SIZE) {
    const chunk = subtitles.slice(i, i + CHUNK_SIZE);
    const joinedText = chunk.map((c) => c.text.replace(/\n/g, ' ')).join('\n');

    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(joinedText)}`
      );
      if (res.ok) {
        const data = await res.json();
        const rawTranslated = data[0].map((item: any) => item[0]).join('');
        const splitLines = rawTranslated.split('\n');

        for (let j = 0; j < chunk.length; j++) {
          results.push(splitLines[j]?.trim() || chunk[j].text);
        }
      } else {
        chunk.forEach((c) => results.push(c.text));
      }
    } catch (e) {
      console.warn('Batch translation error, fallback to original', e);
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

/**
 * Phát âm tiếng Anh tự nhiên (Natural Human-like Audio)
 * Ưu tiên:
 * 1. Google Neural Speech Stream (Âm thanh tự nhiên, ngữ điệu chuẩn bản xứ)
 * 2. Microsoft Natural Online / Google US English Neural Voices (không bị máy móc như David Desktop)
 */
export function speakWord(text: string, lang: 'en' | 'zh' = 'en', rate: number = 0.95) {
  if (!text || !text.trim()) return;

  const cleanText = text.trim();

  // Dừng âm thanh đang phát trước đó nếu có
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  // 1. Phương án 1: Google Neural High-Definition Audio (Giọng tự nhiên nhất, không máy móc)
  try {
    const encoded = encodeURIComponent(cleanText.slice(0, 200));
    const targetLang = lang === 'zh' ? 'zh-CN' : 'en-US';
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${targetLang}&client=tw-ob`;

    const audio = new Audio(googleTtsUrl);
    audio.playbackRate = rate; // Tốc độ tùy chỉnh (0.75x chậm, 0.95x tự nhiên, 1.0x chuẩn)
    currentAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Google TTS audio playback blocked, falling back to Neural Browser Voice', err);
        speakWithNeuralBrowserVoice(cleanText, lang, rate);
      });
      return;
    }
  } catch (e) {
    console.warn('Neural audio stream error', e);
  }

  // 2. Phương án 2: Lọc giọng Neural Browser (Jenny, Guy, Aria Natural)
  speakWithNeuralBrowserVoice(cleanText, lang, rate);
}

function speakWithNeuralBrowserVoice(text: string, lang: 'en' | 'zh', rate: number = 0.95) {
  if (!('speechSynthesis' in window)) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
  utterance.rate = rate;
  utterance.pitch = 1.0;

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


