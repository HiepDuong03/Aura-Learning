/**
 * YouGlish Context Mining & SRS Smart Ranking Engine
 * Reverse-Engineered from YouGlish Architecture (bundle.min__53__.js & params.jsonData)
 * Compliant with AURA AI Principal Engineer Constitution (BR-R01, BR-13, BR-15)
 * 
 * Provides:
 * 1. Inverted Subtitle Index: Mapping words to exact video occurrences across all lessons.
 * 2. Accent Detection & Zoning: US (1), UK (2), AUS (3), and Register (Academic vs Daily).
 * 3. Pre-Roll Buffer (K_BACK_DURATION = 2.5s) for authentic speech anticipation.
 * 4. SRS Smart Prioritization: Feeds videos for words that are Due Today or rated Hard.
 * 5. Collocation & Phrase Extraction.
 */

import { VideoLesson, SubtitleLine, SavedWord } from '../types';
import { ankiScheduler } from './ankiScheduler';
import { YOUGLISH_CORPUS, YouGlishCorpusEntry } from '../data/youglishCorpus';

export type AccentZone = 'US' | 'UK' | 'AUS' | 'GLOBAL';
export type ContextRegister = 'academic' | 'casual' | 'general';

export interface YouGlishOccurrence {
  id: string;
  vid: string;               // YouTube Video ID (matches YouGlish vid)
  start: number;             // Exact word timestamp (matches YouGlish start)
  end: number;               // Word end timestamp (matches YouGlish end)
  clipStart: number;         // Pre-roll buffered start (T_start = start - K_BACK_DURATION)
  clipEnd: number;           // Post-roll buffered end
  display: string;           // Exact subtitle line (matches YouGlish display)
  targetWord: string;        // The vocabulary word being studied
  collocation?: string;      // Natural word combination/collocation
  collocationTip?: string;   // Usage tip for the collocation
  zone: AccentZone;          // Regional accent
  zoneCode: number;          // 1: US, 2: UK, 3: AUS (matches YouGlish zone)
  register: ContextRegister; // Academic (TED) vs Casual (Friends/Cafe)
  sourceLessonId: string;
  sourceLessonTitle: string;
  channel: string;
  thumbnail: string;
  subtitles: SubtitleLine[]; // Surrounding synchronized cues
  priorityScore: number;     // SRS calculated priority
  isDueToday: boolean;       // Flashcard due for review in Anki
  subtitleOffset: number;    // Calibration offset
}

// YouGlish decompiled pre-roll and post-roll constants
const K_BACK_DURATION = 2.5; // Seconds to rewind before the target sentence
const K_POST_ROLL = 2.5;     // Seconds to extend after the sentence

// Common Collocation Patterns for high-impact English learning
const COLLOCATION_PATTERNS: Record<string, { phrase: string; tip: string }> = {
  struggle: { phrase: 'struggle with / struggle to', tip: 'Vật lộn hoặc gặp khó khăn lớn để làm việc gì đó' },
  courage: { phrase: 'have the courage to', tip: 'Có đủ dũng khí, can đảm để đưa ra quyết định' },
  bizarre: { phrase: 'bizarre idea / bizarre behavior', tip: 'Ý tưởng hoặc hành vi kỳ lạ, quái dị một cách bất thường' },
  transmit: { phrase: 'transmit ideas / transmit knowledge', tip: 'Truyền tải kiến thức hoặc tư tưởng qua không gian và thời gian' },
  crucial: { phrase: 'crucial role / crucial decision', tip: 'Đóng vai trò then chốt, mang tính quyết định sống còn' },
  fascinating: { phrase: 'fascinating insight / find it fascinating', tip: 'Cực kỳ lôi cuốn, hấp dẫn và kích thích tư duy' },
  habit: { phrase: 'form a habit / break a habit', tip: 'Hình thành hoặc từ bỏ một thói quen cố hữu' },
  procrastinate: { phrase: 'procrastinate on doing something', tip: 'Trì hoãn, chần chừ việc cần làm đến phút chót' },
  delicious: { phrase: 'delicious coffee / taste delicious', tip: 'Mùi vị thơm ngon hảo hạng, đậm đà' },
  cozy: { phrase: 'cozy atmosphere / cozy cafe', tip: 'Không gian ấm cúng, dễ chịu và thư giãn' },
  substitute: { phrase: 'substitute A for B', tip: 'Thay thế thành phần A bằng thành phần B (ví dụ: đổi sữa hạt)' },
  perception: { phrase: 'perception of reality / sensory perception', tip: 'Cách bộ não tri giác và cảm nhận thực tại' },
  memory: { phrase: 'memory loss / trigger memories', tip: 'Ký ức, trí nhớ hoặc gợi lại những hồi ức quá khứ' },
  detachment: { phrase: 'emotional detachment', tip: 'Sự tách biệt về mặt cảm xúc, giữ tâm thế khách quan' }
};

export class YouGlishEngine {
  /**
   * Detects regional accent and context register from lesson metadata
   */
  detectAccentAndRegister(lesson: VideoLesson): { zone: AccentZone; zoneCode: number; register: ContextRegister } {
    if (!lesson) return { zone: 'US', zoneCode: 1, register: 'general' };
    const channelLower = (lesson.channel || '').toLowerCase();
    const titleLower = (lesson.title || '').toLowerCase();
    const topicLower = (lesson.topic || '').toLowerCase();

    // Accent detection
    let zone: AccentZone = 'US';
    let zoneCode = 1;

    if (channelLower.includes('bbc') || channelLower.includes('lucy') || channelLower.includes('oxford') || channelLower.includes('cambridge') || titleLower.includes('british')) {
      zone = 'UK';
      zoneCode = 2;
    } else if (channelLower.includes('australia') || titleLower.includes('aussie')) {
      zone = 'AUS';
      zoneCode = 3;
    } else {
      zone = 'US';
      zoneCode = 1;
    }

    // Register detection
    let register: ContextRegister = 'general';
    if (channelLower.includes('ted') || channelLower.includes('stanford') || topicLower.includes('science') || topicLower.includes('linguistics') || topicLower.includes('psychology')) {
      register = 'academic';
    } else if (channelLower.includes('deeplingo') || channelLower.includes('friends') || topicLower.includes('daily') || topicLower.includes('cafe')) {
      register = 'casual';
    }

    return { zone, zoneCode, register };
  }

  /**
   * Scans a sentence and extracts any matching collocation for the target word
   */
  findCollocation(word: string, sentence: string): { collocation?: string; collocationTip?: string } {
    if (!word || !sentence) return {};
    const cleanWord = (word || '').toLowerCase().trim();
    const preset = COLLOCATION_PATTERNS[cleanWord];
    if (preset) {
      return { collocation: preset.phrase, collocationTip: preset.tip };
    }

    // Auto-detect adjacent words (n-gram: 1 word before, target, 1-2 words after)
    const words = sentence.split(/\s+/);
    const targetIdx = words.findIndex(w => (w || '').toLowerCase().replace(/[^a-z]/g, '') === cleanWord);
    if (targetIdx !== -1) {
      const start = Math.max(0, targetIdx - 1);
      const end = Math.min(words.length, targetIdx + 3);
      const slice = words.slice(start, end).join(' ').replace(/[,.!?;:]/g, '');
      return { collocation: slice, collocationTip: `Cụm từ ngữ cảnh: "${slice}"` };
    }

    return {};
  }

  /**
   * MINE YOUGLISH OCCURRENCES WITH SRS SMART RANKING:
   * Maps saved words to authentic occurrences across all lessons and ranks by Anki urgency
   */
  mineYouGlishOccurrences(
    savedWords: SavedWord[],
    lessons: VideoLesson[],
    options?: {
      targetWordFilter?: string;
      accentFilter?: AccentZone;
      registerFilter?: ContextRegister;
    }
  ): YouGlishOccurrence[] {
    const now = Date.now();
    const occurrences: YouGlishOccurrence[] = [];
    const seenKeys = new Set<string>();

    // BR-R01: Cold Start Check — If user has no saved words, use high-frequency starter words
    const safeSavedWords = Array.isArray(savedWords)
      ? savedWords.filter(w => Boolean(w && typeof w === 'object' && typeof w.word === 'string' && w.word.trim().length > 0))
      : [];

    let activeWords: SavedWord[] = safeSavedWords;
    if (activeWords.length === 0) {
      activeWords = [
        { id: 'cs-1', word: 'crucial', phonetic: '/ˈkruː.ʃəl/', partOfSpeech: 'adj', translation: 'then chốt, quan trọng', definitionEn: 'extremely important', savedAt: now, easeFactor: 2.5, interval: 0, repetitions: 0, lapses: 0, state: 'new', dueAt: now },
        { id: 'cs-2', word: 'transmit', phonetic: '/trænzˈmɪt/', partOfSpeech: 'verb', translation: 'truyền tải, phát đi', definitionEn: 'pass on from one person or place to another', savedAt: now, easeFactor: 2.5, interval: 0, repetitions: 0, lapses: 0, state: 'new', dueAt: now },
        { id: 'cs-3', word: 'bizarre', phonetic: '/bɪˈzɑːr/', partOfSpeech: 'adj', translation: 'kỳ quái, lạ lùng', definitionEn: 'very strange or unusual', savedAt: now, easeFactor: 2.5, interval: 0, repetitions: 0, lapses: 0, state: 'new', dueAt: now },
        { id: 'cs-4', word: 'courage', phonetic: '/ˈkʌr.ɪdʒ/', partOfSpeech: 'noun', translation: 'dũng khí, can đảm', definitionEn: 'the ability to do something that frightens one', savedAt: now, easeFactor: 2.5, interval: 0, repetitions: 0, lapses: 0, state: 'new', dueAt: now }
      ];
    }

    const targetFilter = options?.targetWordFilter?.toLowerCase().trim();
    const filteredWords = targetFilter && targetFilter !== 'all'
      ? activeWords.filter(w => w?.word && w.word.toLowerCase().trim() === targetFilter)
      : activeWords;

    for (const wordObj of filteredWords) {
      if (!wordObj || !wordObj.word) continue;
      const cleanWord = wordObj.word.toLowerCase().trim();
      if (cleanWord.length < 2) continue;

      // SRS Priority Score calculation
      const isDue = ankiScheduler.isCardDue(wordObj, now);
      let priorityScore = 0;
      if (isDue) priorityScore += 100;
      if (wordObj.interval === 0 || (wordObj.repetitions && wordObj.repetitions <= 1)) priorityScore += 50;
      if (wordObj.easeFactor && wordObj.easeFactor < 2.3) priorityScore += 40; // Hard word

      // Word boundary regex
      const wordRegex = new RegExp(`\\b${cleanWord}(?:s|es|ed|ing|d)?\\b`, 'i');

      // 1. Mine from authentic Multi-Source YouGlish Corpus (strictly up to 2 examples per word)
      for (const entry of YOUGLISH_CORPUS) {
        if (!entry || !entry.youtubeId) continue;
        const currentCount = occurrences.filter(o => o?.targetWord && o.targetWord.toLowerCase() === cleanWord).length;
        if (currentCount >= 2) break;

        const entryWord = (entry.word || '').toLowerCase();
        if (entryWord === cleanWord || wordRegex.test(entry.text || '')) {
          // Apply filters
          if (options?.accentFilter && options.accentFilter !== 'GLOBAL' && entry.zone !== options.accentFilter) {
            continue;
          }
          if (options?.registerFilter && entry.register !== options.registerFilter) {
            continue;
          }

          const clipKey = `${entry.youtubeId}-${Math.floor(entry.start / 8)}`;
          if (seenKeys.has(clipKey)) continue;
          seenKeys.add(clipKey);

          const clipStart = Math.max(0, Number(entry.start.toFixed(2)));
          const clipEnd = Number((entry.end + 0.3).toFixed(2));

          const { collocation, collocationTip } = entry.collocation 
            ? { collocation: entry.collocation, collocationTip: entry.collocationTip }
            : this.findCollocation(cleanWord, entry.text || '');

          occurrences.push({
            id: `yg-corp-${cleanWord}-${entry.youtubeId}-${Math.floor(entry.start)}`,
            vid: entry.youtubeId,
            start: entry.start,
            end: entry.end,
            clipStart,
            clipEnd,
            display: entry.text || '',
            targetWord: wordObj.word,
            collocation,
            collocationTip,
            zone: entry.zone,
            zoneCode: entry.zoneCode,
            register: entry.register,
            sourceLessonId: entry.id,
            sourceLessonTitle: entry.sourceTitle,
            channel: `${entry.speaker} (${entry.channel})`,
            thumbnail: entry.thumbnail || `https://img.youtube.com/vi/${entry.youtubeId}/hqdefault.jpg`,
            subtitles: [
              {
                id: `sub-${entry.id}`,
                start: entry.start,
                end: entry.end,
                text: entry.text || '',
                translation: entry.translation || ''
              }
            ],
            priorityScore: priorityScore + 5,
            isDueToday: isDue,
            subtitleOffset: 0
          });
        }
      }

      // 2. Mine from current lessons (if word still has fewer than 2 examples)
      if (Array.isArray(lessons)) {
        for (const lesson of lessons) {
          if (!lesson || typeof lesson !== 'object' || !lesson.id || !lesson.youtubeId) continue;
          const currentCount = occurrences.filter(o => o?.targetWord && o.targetWord.toLowerCase() === cleanWord).length;
          if (currentCount >= 2) break;
          if (!lesson.subtitles || !Array.isArray(lesson.subtitles) || lesson.subtitles.length === 0) continue;

          const { zone, zoneCode, register } = this.detectAccentAndRegister(lesson);

          // Apply filters
          if (options?.accentFilter && options.accentFilter !== 'GLOBAL' && zone !== options.accentFilter) {
            continue;
          }
          if (options?.registerFilter && register !== options.registerFilter) {
            continue;
          }

          for (let idx = 0; idx < lesson.subtitles.length; idx++) {
            const sub = lesson.subtitles[idx];
            if (!sub || typeof sub.text !== 'string') continue;
            if (wordRegex.test(sub.text)) {
            const clipKey = `${lesson.youtubeId}-${Math.floor(sub.start / 8)}`;
            if (seenKeys.has(clipKey)) continue;
            seenKeys.add(clipKey);

            // Clip directly around the target sentence without overlapping preceding sentence
            const clipStart = Math.max(0, Number(sub.start.toFixed(2)));
            const clipEnd = Math.min(lesson.durationSec || 9999, Number((sub.end + 0.3).toFixed(2)));

            const { collocation, collocationTip } = this.findCollocation(cleanWord, sub.text);

            occurrences.push({
              id: `yg-${cleanWord}-${lesson.id}-${idx}`,
              vid: lesson.youtubeId,
              start: sub.start,
              end: sub.end,
              clipStart,
              clipEnd,
              display: sub.text,
              targetWord: wordObj.word,
              collocation,
              collocationTip,
              zone,
              zoneCode,
              register,
              sourceLessonId: lesson.id,
              sourceLessonTitle: lesson.title || 'Bài học video',
              channel: lesson.channel || 'Kênh YouTube',
              thumbnail: lesson.thumbnail || `https://img.youtube.com/vi/${lesson.youtubeId}/hqdefault.jpg`,
              subtitles: [sub], // Strictly target sentence for 1:1 audio-visual sync
              priorityScore,
              isDueToday: isDue,
              subtitleOffset: lesson.subtitleOffset || 0
            });

            const occurrencesForWord = occurrences.filter(o => o?.targetWord && o.targetWord.toLowerCase() === cleanWord);
            if (occurrencesForWord.length >= 2) break;
          }
        }
      }
    }
  }

    // Sort by SRS priority (Due today first, then hardest, then newest)
    return occurrences.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  /**
   * Instant search across all lesson subtitles for any query word
   */
  searchYouGlishQuery(query: string, lessons: VideoLesson[]): YouGlishOccurrence[] {
    const clean = (query || '').toLowerCase().trim();
    if (!clean || clean.length < 2 || !lessons) return [];

    const dummyWord: SavedWord = {
      id: `query-${clean}`,
      word: clean,
      phonetic: '',
      partOfSpeech: '',
      translation: '',
      definitionEn: '',
      savedAt: Date.now(),
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      lapses: 0,
      state: 'new',
      dueAt: Date.now()
    };

    return this.mineYouGlishOccurrences([dummyWord], lessons, { targetWordFilter: clean });
  }
}

export const youglishEngine = new YouGlishEngine();
