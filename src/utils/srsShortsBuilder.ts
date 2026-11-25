import { SavedWord, VideoLesson } from '../types';
import { ankiScheduler } from '../services/ankiScheduler';
import { AccentZone, YouGlishOccurrence } from '../services/youglishEngine';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
 * (1 saved word = 1 review card/clip, zero silently dropped IELTS/CEFR words and ZERO false-positive
 * partial word splits like matching "distance learning" -> "in the far distance"):
 *  - Tier 1a: Exact verified video occurrence from YouGlishEngine
 *  - Tier 1b: Original source YouTube video + timestamp stored on the SavedWord
 *  - Tier 2:  Exact-phrase match inside user/catalog lesson subtitles (whole phrase, never split)
 *  - Tier 3:  Interactive 9:16 Audio/Context SRS Card using the word's own authentic sentence + 0ms TTS + YouGlish Live
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

    // --- TIER 2: Exact whole-phrase match in lesson subtitles (NEVER split multi-word phrases) ---
    let matchedExactLesson: VideoLesson | null = null;
    if (Array.isArray(lessons) && accentFilter === 'GLOBAL') {
      const exactPhraseRegex = new RegExp(`\\b${escapeRegExp(lowerWord)}(?:s|es|ed|ing)?\\b`, 'i');
      outerLessons: for (const lesson of lessons) {
        if (!lesson?.youtubeId || !Array.isArray(lesson.subtitles)) continue;
        for (const sub of lesson.subtitles) {
          if (!sub?.text) continue;
          const sig = `${lesson.youtubeId}:${Math.floor(sub.start / 8)}`;
          if (usedVideoSignatures.has(sig)) continue;
          if (exactPhraseRegex.test(sub.text)) {
            usedVideoSignatures.add(sig);
            const clipStart = Math.max(0, Number(sub.start.toFixed(2)));
            const clipEnd = Math.min(lesson.durationSec || 9999, Number((sub.end + 0.5).toFixed(2)));
            matchedExactLesson = {
              id: `srs-exact-l-${wordObj.id}-${lesson.id}`,
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
              targetContext: sub.text,
              expression: cleanWord,
              expressionMeaningVi: wordObj.translation || '',
              americanUsageNote: `Từ trong Kho FSRS-6${wordObj.translation ? `: "${wordObj.translation}"` : ''}. Khớp đúng cụm từ trong bài học video.`,
              sourceLessonTitle: lesson.title,
              subtitleOffset: lesson.subtitleOffset || 0,
              initialSubIndex: 0,
              srsWordId: wordObj.id,
              isSrsReviewClip: true,
              srsMatchTier: 'exact_video'
            };
            break outerLessons;
          }
        }
      }
    }

    if (matchedExactLesson) {
      results.push(matchedExactLesson);
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
