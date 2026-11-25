import { YOUGLISH_CORPUS } from '../data/youglishCorpus';
import { VideoLesson } from '../types';

export type AccentFilter = 'GLOBAL' | 'US' | 'UK' | 'AUS';

export interface LocalVideoClip {
  id: string;
  youtubeId: string;
  startSec: number;
  endSec?: number;
  text: string;
  translation?: string;
  title: string;
  channel: string;
  accent: AccentFilter;
  matchType: 'exact' | 'related';
  matchedToken: string;
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'into',
  'onto',
  'about',
  'over',
  'under',
  'your',
  'their',
  'have',
  'has',
  'had',
  'been',
  'will',
  'would',
  'could',
  'should',
  'very',
  'more',
  'most',
  'some',
  'such',
  'than',
  'then',
  'when',
  'what',
  'which',
  'make',
  'take',
  'give',
  'keep'
]);

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inferLessonAccent(lesson: VideoLesson): AccentFilter {
  const meta = `${lesson.channel || ''} ${lesson.title || ''}`.toLowerCase();
  if (meta.includes('bbc') || meta.includes('oxford') || meta.includes('cambridge') || meta.includes('british') || meta.includes('lucy')) {
    return 'UK';
  }
  if (meta.includes('australia') || meta.includes('aussie')) {
    return 'AUS';
  }
  return 'US';
}

function extractCoreTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

let cachedLessonsPromise: Promise<VideoLesson[]> | null = null;

async function getLazyCatalogLessons(): Promise<VideoLesson[]> {
  if (!cachedLessonsPromise) {
    cachedLessonsPromise = import('../data/mockLessons')
      .then((mod) => [...(mod.MOCK_LESSONS || []), ...(mod.MOCK_SHORTS || [])])
      .catch(() => []);
  }
  return cachedLessonsPromise;
}

/**
 * Searches verified local YouTube subtitle corpora (YOUGLISH_CORPUS + lazy MOCK_LESSONS)
 * as a zero-block Tier-2 fallback when YouGlish widget.js is blocked on desktop browsers.
 */
export async function searchLocalVideoContexts(
  rawQuery: string,
  accent: AccentFilter = 'GLOBAL',
  maxResults: number = 12
): Promise<LocalVideoClip[]> {
  const cleanQuery = rawQuery.trim().toLowerCase();
  if (!cleanQuery) return [];

  const exactRegex = new RegExp(`\\b${escapeRegExp(cleanQuery)}(?:s|es|ed|ing)?\\b`, 'i');
  const coreTokens = extractCoreTokens(cleanQuery);
  const relatedRegexes = coreTokens.map((tok) => ({
    token: tok,
    regex: new RegExp(`\\b${escapeRegExp(tok)}(?:s|es|ed|ing)?\\b`, 'i')
  }));

  const exactMatches: LocalVideoClip[] = [];
  const relatedMatches: LocalVideoClip[] = [];
  const seenKeys = new Set<string>();

  const matchesAccent = (clipAccent: AccentFilter) =>
    accent === 'GLOBAL' || clipAccent === 'GLOBAL' || clipAccent === accent;

  // 1. Scan curated YOUGLISH_CORPUS first (always available synchronously)
  for (const entry of YOUGLISH_CORPUS) {
    if (!entry.youtubeId || !matchesAccent(entry.zone)) continue;
    const dedupKey = `${entry.youtubeId}:${Math.floor(entry.start / 5)}`;
    if (seenKeys.has(dedupKey)) continue;

    const isExact =
      entry.word.toLowerCase() === cleanQuery || exactRegex.test(entry.text || '');

    if (isExact) {
      seenKeys.add(dedupKey);
      exactMatches.push({
        id: `local-corp-${entry.id}`,
        youtubeId: entry.youtubeId,
        startSec: Math.max(0, Math.floor(entry.start)),
        endSec: entry.end,
        text: entry.text,
        translation: entry.translation,
        title: entry.sourceTitle,
        channel: `${entry.speaker} (${entry.channel})`,
        accent: entry.zone,
        matchType: 'exact',
        matchedToken: rawQuery.trim()
      });
      continue;
    }

    for (const rel of relatedRegexes) {
      if (entry.word.toLowerCase() === rel.token || rel.regex.test(entry.text || '')) {
        seenKeys.add(dedupKey);
        relatedMatches.push({
          id: `local-corp-rel-${entry.id}`,
          youtubeId: entry.youtubeId,
          startSec: Math.max(0, Math.floor(entry.start)),
          endSec: entry.end,
          text: entry.text,
          translation: entry.translation,
          title: entry.sourceTitle,
          channel: `${entry.speaker} (${entry.channel})`,
          accent: entry.zone,
          matchType: 'related',
          matchedToken: rel.token
        });
        break;
      }
    }
  }

  // 2. Scan lazy-loaded catalog lessons subtitles
  const lessons = await getLazyCatalogLessons();
  for (const lesson of lessons) {
    if (!lesson.youtubeId || !Array.isArray(lesson.subtitles)) continue;
    const lessonAccent = inferLessonAccent(lesson);
    if (!matchesAccent(lessonAccent)) continue;

    for (const sub of lesson.subtitles) {
      if (!sub || !sub.text) continue;
      const startSec = Math.max(0, Math.floor(sub.start));
      const dedupKey = `${lesson.youtubeId}:${Math.floor(startSec / 5)}`;
      if (seenKeys.has(dedupKey)) continue;

      if (exactRegex.test(sub.text)) {
        seenKeys.add(dedupKey);
        exactMatches.push({
          id: `local-lesson-${lesson.id}-${sub.id}`,
          youtubeId: lesson.youtubeId,
          startSec,
          endSec: sub.end,
          text: sub.text,
          translation: sub.translation,
          title: lesson.title,
          channel: lesson.channel || 'YouTube',
          accent: lessonAccent,
          matchType: 'exact',
          matchedToken: rawQuery.trim()
        });
        if (exactMatches.length >= maxResults) break;
      } else if (relatedMatches.length < maxResults) {
        for (const rel of relatedRegexes) {
          if (rel.regex.test(sub.text)) {
            seenKeys.add(dedupKey);
            relatedMatches.push({
              id: `local-lesson-rel-${lesson.id}-${sub.id}`,
              youtubeId: lesson.youtubeId,
              startSec,
              endSec: sub.end,
              text: sub.text,
              translation: sub.translation,
              title: lesson.title,
              channel: lesson.channel || 'YouTube',
              accent: lessonAccent,
              matchType: 'related',
              matchedToken: rel.token
            });
            break;
          }
        }
      }
    }
    if (exactMatches.length >= maxResults) break;
  }

  // Prefer exact matches; only include related clips when exact matches are empty
  const combined = exactMatches.length > 0 ? exactMatches : relatedMatches;
  return combined.slice(0, maxResults);
}
