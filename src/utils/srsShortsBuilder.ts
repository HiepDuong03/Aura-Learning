import { SavedWord, VideoLesson } from '../types';
import { ankiScheduler } from '../services/ankiScheduler';
import { AccentZone, YouGlishOccurrence } from '../services/youglishEngine';
import { YOUGLISH_CORPUS } from '../data/youglishCorpus';

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'into',
  'about',
  'over',
  'your',
  'their',
  'have',
  'been',
  'will',
  'would',
  'could',
  'should',
  'very',
  'more',
  'most',
  'some',
  'make',
  'take',
  'give',
  'keep',
  'work',
  'good',
  'high'
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractCoreTokens(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((tok) => tok.length >= 4 && !STOP_WORDS.has(tok));
}

function isValidYoutubeId(id?: string): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id.trim());
}

function computeSrsPriority(word: SavedWord, now: number): number {
  let score = 0;
  if (ankiScheduler.isCardDue(word, now)) score += 1000;
  if (word.state === 'relearning' || word.state === 'learning' || word.interval === 0) score += 200;
  if ((word.easeFactor || 2.5) < 2.3) score += 100;
  score += Math.min(50, Math.floor((word.savedAt || 0) / 1e11));
  return score;
}

export interface BuildFullSrsShortsParams {
  savedWords: SavedWord[];
  exactOccurrences: YouGlishOccurrence[];
  lessons: VideoLesson[];
  accentFilter?: AccentZone;
  selectedWordFilter?: string;
}

/**
 * 3-Tier SRS Shorts Coverage Builder:
 * Guarantees 100% coverage of the learner's SavedWord vault inside the Shorts "Ôn SRS" tab
 * (1 saved word = 1 review card/clip, zero silently dropped IELTS/CEFR words):
 *  - Tier 1a: Exact verified video occurrence from YouGlishEngine
 *  - Tier 1b: Original source YouTube video + timestamp stored on the SavedWord
 *  - Tier 2:  Unique related-token clip from YOUGLISH_CORPUS / lessons (clearly labeled)
 *  - Tier 3:  Interactive 9:16 Audio/Context SRS Card with Cloze + 0ms TTS + YouGlish Live button
 */
export function buildFullSrsShortsFeed(params: BuildFullSrsShortsParams): VideoLesson[] {
  const { savedWords, exactOccurrences, lessons, accentFilter = 'GLOBAL', selectedWordFilter = 'all' } = params;
  const now = Date.now();

  const validWords = (Array.isArray(savedWords) ? savedWords : []).filter(
    (w): w is SavedWord => Boolean(w && typeof w === 'object' && typeof w.word === 'string' && w.word.trim().length > 0)
  );

  if (validWords.length === 0) {
    return [];
  }

  const normalizedFilter = selectedWordFilter.toLowerCase().trim();
  const targetWords =
    normalizedFilter && normalizedFilter !== 'all'
      ? validWords.filter((w) => w.word.toLowerCase().trim() === normalizedFilter)
      : validWords;

  // Deduplicate by lowercase word while prioritizing FSRS-6 due / hardest cards
  const sortedWords = [...targetWords].sort((a, b) => {
    const diff = computeSrsPriority(b, now) - computeSrsPriority(a, now);
    if (diff !== 0) return diff;
    return (b.savedAt || 0) - (a.savedAt || 0);
  });

  const uniqueWords: SavedWord[] = [];
  const seenWordLower = new Set<string>();
  for (const w of sortedWords) {
    const key = w.word.toLowerCase().trim();
    if (seenWordLower.has(key)) continue;
    seenWordLower.add(key);
    uniqueWords.push(w);
  }

  // Index exact occurrences by lowercase targetWord
  const exactByWord = new Map<string, YouGlishOccurrence>();
  for (const occ of exactOccurrences) {
    const key = (occ.targetWord || '').toLowerCase().trim();
    if (key && !exactByWord.has(key)) {
      exactByWord.set(key, occ);
    }
  }

  const usedVideoSignatures = new Set<string>();
  const results: VideoLesson[] = [];

  for (const wordObj of uniqueWords) {
    const cleanWord = wordObj.word.trim();
    const lowerWord = cleanWord.toLowerCase();

    // --- TIER 1a: Exact verified YouGlishOccurrence ---
    const exactOcc = exactByWord.get(lowerWord);
    if (exactOcc && exactOcc.vid) {
      usedVideoSignatures.add(`${exactOcc.vid}:${Math.floor(exactOcc.start / 8)}`);
      results.push({
        id: exactOcc.id,
        youtubeId: exactOcc.vid,
        title: exactOcc.sourceLessonTitle
          ? `Ôn từ "${cleanWord}" — ${exactOcc.sourceLessonTitle}`
          : `Ôn từ "${cleanWord}"`,
        channel: exactOcc.channel,
        thumbnail: exactOcc.thumbnail,
        level: 'B1',
        topic: `Ôn từ: ${cleanWord}`,
        duration: `00:${Math.max(5, Math.round(exactOcc.clipEnd - exactOcc.clipStart)).toString().padStart(2, '0')}`,
        durationSec: Math.max(5, Math.round(exactOcc.clipEnd - exactOcc.clipStart)),
        views: 'Ôn SRS',
        description: exactOcc.display,
        subtitles: exactOcc.subtitles,
        quizzes: [],
        isShort: true,
        startSeconds: exactOcc.clipStart,
        endSeconds: exactOcc.clipEnd,
        targetWord: cleanWord,
        targetContext: exactOcc.display,
        expression: cleanWord,
        expressionMeaningVi: wordObj.translation || '',
        americanUsageNote: `Từ trong Kho FSRS-6${wordObj.translation ? `: "${wordObj.translation}"` : ''}. Nghe lại trong video thực tế và đánh giá mức nhớ bên dưới.`,
        sourceLessonTitle: exactOcc.sourceLessonTitle,
        subtitleOffset: exactOcc.subtitleOffset,
        initialSubIndex: 0,
        srsWordId: wordObj.id,
        isSrsReviewClip: true,
        srsMatchTier: 'exact_video'
      });
      continue;
    }

    // --- TIER 1b: Original source video saved on the SavedWord ---
    if (isValidYoutubeId(wordObj.sourceYoutubeId)) {
      const startSec = Math.max(0, Math.floor(wordObj.sourceTimestampSec || 0));
      const contextLine = wordObj.contextSentence || wordObj.exampleEn || `Practice using "${cleanWord}" in real context.`;
      usedVideoSignatures.add(`${wordObj.sourceYoutubeId}:${Math.floor(startSec / 8)}`);
      results.push({
        id: `srs-src-${wordObj.id}`,
        youtubeId: wordObj.sourceYoutubeId,
        title: wordObj.videoTitle ? `Ôn từ "${cleanWord}" — ${wordObj.videoTitle}` : `Ôn từ "${cleanWord}"`,
        channel: 'Video bạn đã học',
        thumbnail: `https://img.youtube.com/vi/${wordObj.sourceYoutubeId}/hqdefault.jpg`,
        level: 'B1',
        topic: `Ôn từ: ${cleanWord}`,
        duration: '00:12',
        durationSec: 12,
        views: 'Ôn SRS',
        description: contextLine,
        subtitles: [
          {
            id: `sub-src-${wordObj.id}`,
            start: startSec,
            end: startSec + 8,
            text: contextLine,
            translation: wordObj.translation || ''
          }
        ],
        quizzes: [],
        isShort: true,
        startSeconds: startSec,
        endSeconds: startSec + 12,
        targetWord: cleanWord,
        targetContext: contextLine,
        expression: cleanWord,
        expressionMeaningVi: wordObj.translation || '',
        americanUsageNote: `Trích trực tiếp từ video bạn từng lưu từ này${wordObj.translation ? ` (${wordObj.translation})` : ''}.`,
        sourceLessonTitle: wordObj.videoTitle || 'Video đã học',
        initialSubIndex: 0,
        srsWordId: wordObj.id,
        isSrsReviewClip: true,
        srsMatchTier: 'source_video'
      });
      continue;
    }

    // --- TIER 2: Related core-token video clip (unique clip per word) ---
    const coreTokens = extractCoreTokens(lowerWord);
    let matchedRelated: VideoLesson | null = null;

    if (coreTokens.length > 0) {
      const tokenMatchers = coreTokens.map((tok) => ({
        token: tok,
        regex: new RegExp(`\\b${escapeRegExp(tok)}(?:s|es|ed|ing)?\\b`, 'i')
      }));

      for (const entry of YOUGLISH_CORPUS) {
        if (!entry.youtubeId) continue;
        if (accentFilter !== 'GLOBAL' && entry.zone !== accentFilter) continue;
        const sig = `${entry.youtubeId}:${Math.floor(entry.start / 8)}`;
        if (usedVideoSignatures.has(sig)) continue;

        const hit = tokenMatchers.find((m) => m.regex.test(entry.text || ''));
        if (hit) {
          usedVideoSignatures.add(sig);
          const clipStart = Math.max(0, Number(entry.start.toFixed(2)));
          const clipEnd = Number((entry.end + 0.5).toFixed(2));
          matchedRelated = {
            id: `srs-rel-${wordObj.id}-${entry.id}`,
            youtubeId: entry.youtubeId,
            title: `Ôn "${cleanWord}" — Ngữ cảnh liên quan (${hit.token})`,
            channel: `${entry.speaker} (${entry.channel})`,
            thumbnail: entry.thumbnail || `https://img.youtube.com/vi/${entry.youtubeId}/hqdefault.jpg`,
            level: 'B2',
            topic: `Ôn từ: ${cleanWord}`,
            duration: `00:${Math.max(6, Math.round(clipEnd - clipStart)).toString().padStart(2, '0')}`,
            durationSec: Math.max(6, Math.round(clipEnd - clipStart)),
            views: 'Ôn SRS',
            description: entry.text,
            subtitles: [
              {
                id: `sub-rel-${wordObj.id}`,
                start: clipStart,
                end: clipEnd,
                text: entry.text,
                translation: entry.translation || wordObj.translation || ''
              }
            ],
            quizzes: [],
            isShort: true,
            startSeconds: clipStart,
            endSeconds: clipEnd,
            targetWord: cleanWord,
            targetContext: wordObj.contextSentence || wordObj.exampleEn || entry.text,
            expression: cleanWord,
            expressionMeaningVi: wordObj.translation || '',
            americanUsageNote: `Clip ngữ cảnh liên quan qua từ gốc "${hit.token}". Bấm "YouGlish trực tiếp" để xem thêm clip đúng cụm "${cleanWord}".`,
            sourceLessonTitle: entry.sourceTitle,
            initialSubIndex: 0,
            srsWordId: wordObj.id,
            isSrsReviewClip: true,
            srsMatchTier: 'related_video'
          };
          break;
        }
      }

      if (!matchedRelated && Array.isArray(lessons)) {
        outerLessons: for (const lesson of lessons) {
          if (!lesson?.youtubeId || !Array.isArray(lesson.subtitles)) continue;
          for (const sub of lesson.subtitles) {
            if (!sub?.text) continue;
            const sig = `${lesson.youtubeId}:${Math.floor(sub.start / 8)}`;
            if (usedVideoSignatures.has(sig)) continue;
            const hit = tokenMatchers.find((m) => m.regex.test(sub.text));
            if (hit) {
              usedVideoSignatures.add(sig);
              const clipStart = Math.max(0, Number(sub.start.toFixed(2)));
              const clipEnd = Math.min(lesson.durationSec || 9999, Number((sub.end + 0.5).toFixed(2)));
              matchedRelated = {
                id: `srs-rel-l-${wordObj.id}-${lesson.id}`,
                youtubeId: lesson.youtubeId,
                title: `Ôn "${cleanWord}" — ${lesson.title}`,
                channel: lesson.channel || 'YouTube',
                thumbnail: lesson.thumbnail || `https://img.youtube.com/vi/${lesson.youtubeId}/hqdefault.jpg`,
                level: lesson.level || 'B2',
                topic: `Ôn từ: ${cleanWord}`,
                duration: `00:${Math.max(6, Math.round(clipEnd - clipStart)).toString().padStart(2, '0')}`,
                durationSec: Math.max(6, Math.round(clipEnd - clipStart)),
                views: 'Ôn SRS',
                description: sub.text,
                subtitles: [sub],
                quizzes: [],
                isShort: true,
                startSeconds: clipStart,
                endSeconds: clipEnd,
                targetWord: cleanWord,
                targetContext: wordObj.contextSentence || wordObj.exampleEn || sub.text,
                expression: cleanWord,
                expressionMeaningVi: wordObj.translation || '',
                americanUsageNote: `Clip ngữ cảnh liên quan qua từ gốc "${hit.token}". Bấm "YouGlish trực tiếp" để nghe thêm clip chứa nguyên cụm "${cleanWord}".`,
                sourceLessonTitle: lesson.title,
                subtitleOffset: lesson.subtitleOffset || 0,
                initialSubIndex: 0,
                srsWordId: wordObj.id,
                isSrsReviewClip: true,
                srsMatchTier: 'related_video'
              };
              break outerLessons;
            }
          }
        }
      }
    }

    if (matchedRelated) {
      results.push(matchedRelated);
      continue;
    }

    // --- TIER 3: Interactive 9:16 Audio/Context SRS Card + YouGlish Live ---
    const contextSentence =
      (wordObj.contextSentence && wordObj.contextSentence.trim()) ||
      (wordObj.exampleEn && wordObj.exampleEn.trim()) ||
      `We should pay closer attention to ${cleanWord} in everyday communication.`;

    results.push({
      id: `srs-audio-${wordObj.id}`,
      youtubeId: '',
      title: `Ôn từ "${cleanWord}" · Thẻ Nghe FSRS-6`,
      channel: wordObj.videoTitle || 'Kho từ FSRS-6',
      thumbnail: '',
      level: 'B2',
      topic: `Ôn từ: ${cleanWord}`,
      duration: '00:08',
      durationSec: 8,
      views: 'Ôn SRS',
      description: contextSentence,
      subtitles: [
        {
          id: `sub-audio-${wordObj.id}`,
          start: 0,
          end: 8,
          text: contextSentence,
          translation: wordObj.translation || ''
        }
      ],
      quizzes: [],
      isShort: true,
      startSeconds: 0,
      endSeconds: 8,
      targetWord: cleanWord,
      targetContext: contextSentence,
      expression: cleanWord,
      expressionMeaningVi: wordObj.translation || '',
      americanUsageNote: wordObj.definitionEn
        ? `${wordObj.definitionEn} — Bấm Nghe câu mẫu (0ms) hoặc mở "YouGlish trực tiếp" để xem trong video bản xứ.`
        : `Từ trong Kho FSRS-6 (${wordObj.translation}). Bấm Nghe câu mẫu (0ms) hoặc mở "YouGlish trực tiếp" để xem trong video bản xứ.`,
      sourceLessonTitle: wordObj.videoTitle || 'Lộ trình & Kho từ',
      initialSubIndex: 0,
      srsWordId: wordObj.id,
      isSrsReviewClip: true,
      isAudioSrsCard: true,
      srsMatchTier: 'audio_context'
    });
  }

  return results;
}
