import { describe, it, expect } from 'vitest';
import {
  buildForYouReelsFeed,
  buildMicroQuizForReels,
  buildThematicReelsFeed,
  mineAmericanExpressionsFromLessons
} from '../americanExpressionMiner';
import { AMERICAN_REELS_CORPUS, mapCuratedReelToVideoLesson } from '../../data/americanReelsCorpus';
import { VideoLesson } from '../../types';

const sampleCustomLesson: VideoLesson = {
  id: 'custom-vid-1',
  youtubeId: 'abc123XYZ99',
  title: 'Real American Startup Standup',
  channel: 'Tech English US',
  thumbnail: 'https://img.youtube.com/vi/abc123XYZ99/hqdefault.jpg',
  level: 'B1',
  topic: 'Workplace',
  duration: '04:10',
  durationSec: 250,
  views: '12K',
  description: 'Daily standup meeting',
  isCustom: true,
  quizzes: [],
  subtitles: [
    { id: 'c1', start: 5.0, end: 8.0, text: 'Morning everyone, let us touch base quickly.', translation: 'Chào mọi người, mình cập nhật nhanh nhé.' },
    { id: 'c2', start: 8.5, end: 12.0, text: 'Just making sure we are all on the same page.', translation: 'Đảm bảo tất cả chúng ta đều hiểu giống nhau.' },
    { id: 'c3', start: 12.5, end: 16.0, text: 'Let us wrap up before noon.', translation: 'Chốt lại trước buổi trưa nhé.' }
  ]
};

describe('americanExpressionMiner', () => {
  it('mines real American expressions from custom lessons with valid clip windows', () => {
    const mined = mineAmericanExpressionsFromLessons([sampleCustomLesson], []);
    expect(mined.length).toBe(3);
    expect(mined.map((m) => m.expression?.toLowerCase())).toEqual([
      'touch base',
      'on the same page',
      'wrap up'
    ]);
    for (const item of mined) {
      expect(item.reelCategory).toBe('my_videos');
      expect((item.endSeconds ?? 0) - (item.startSeconds ?? 0)).toBeGreaterThanOrEqual(6);
      expect(item.subtitles.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('deduplicates expressions already present in curated reels for the same video', () => {
    const curated = AMERICAN_REELS_CORPUS.map(mapCuratedReelToVideoLesson);
    const duplicateLesson: VideoLesson = {
      ...sampleCustomLesson,
      id: 'dup-1',
      youtubeId: '9LsK85CrsWU',
      isCustom: false,
      subtitles: [
        { id: 'd1', start: 14.5, end: 18.5, text: 'Yeah, can we circle back to this next week?', translation: 'Tuần sau quay lại bàn tiếp nhé?' }
      ]
    };

    const mined = mineAmericanExpressionsFromLessons([duplicateLesson], curated);
    expect(mined).toHaveLength(0);
  });

  it('groups reels into coherent thematic mini-clusters when filter is "all"', () => {
    const curated = AMERICAN_REELS_CORPUS.map(mapCuratedReelToVideoLesson);
    const feed = buildThematicReelsFeed(curated, [], 'all');

    expect(feed.length).toBe(curated.length);
    // First 3 items should share the same category ('daily_life'), next 3 should be 'work_talk'
    expect(feed.slice(0, 3).every((item) => item.reelCategory === 'daily_life')).toBe(true);
    expect(feed.slice(3, 6).every((item) => item.reelCategory === 'work_talk')).toBe(true);
  });

  it('filters strictly by topic category', () => {
    const curated = AMERICAN_REELS_CORPUS.map(mapCuratedReelToVideoLesson);
    const mined = mineAmericanExpressionsFromLessons([sampleCustomLesson], curated);

    const workOnly = buildThematicReelsFeed(curated, mined, 'work_talk');
    expect(workOnly.length).toBeGreaterThan(0);
    expect(workOnly.every((item) => item.reelCategory === 'work_talk')).toBe(true);

    const myVideosOnly = buildThematicReelsFeed(curated, mined, 'my_videos');
    expect(myVideosOnly).toHaveLength(3);
  });

  it('builds a valid 3-option interpolated micro-quiz from recently watched reels', () => {
    const curated = AMERICAN_REELS_CORPUS.map(mapCuratedReelToVideoLesson);
    const recent = curated.slice(0, 4);
    const quiz = buildMicroQuizForReels(recent, curated);

    expect(quiz).not.toBeNull();
    expect(quiz?.options).toHaveLength(3);
    expect(quiz?.correctIndex).toBeGreaterThanOrEqual(0);
    expect(quiz?.correctIndex).toBeLessThan(3);
    expect(quiz?.options[quiz.correctIndex]).toBe(recent[3].expressionMeaningVi);
    // All 3 options must be distinct
    expect(new Set(quiz?.options).size).toBe(3);
  });

  it('pushes watched Shorts to the end and shuffles unwatched Shorts deterministically per session', () => {
    const curated = AMERICAN_REELS_CORPUS.map(mapCuratedReelToVideoLesson);
    const watched = new Set([curated[0].id, curated[1].youtubeId]);

    const feedSeedA1 = buildForYouReelsFeed(curated, { watchedIds: watched, sessionSeed: 101 });
    const feedSeedA2 = buildForYouReelsFeed(curated, { watchedIds: watched, sessionSeed: 101 });
    const feedSeedB = buildForYouReelsFeed(curated, { watchedIds: watched, sessionSeed: 99999 });

    expect(feedSeedA1.length).toBe(curated.length);
    // Deterministic for same seed (prevents mid-watch jumping on re-renders)
    expect(feedSeedA1.map((r) => r.id)).toEqual(feedSeedA2.map((r) => r.id));
    // Different session seeds produce a fresh TikTok order
    expect(feedSeedA1.map((r) => r.id)).not.toEqual(feedSeedB.map((r) => r.id));
    // The 2 watched items must be at the very end
    const tailIds = new Set(feedSeedA1.slice(-2).map((r) => r.id));
    expect(tailIds.has(curated[0].id)).toBe(true);
    expect(tailIds.has(curated[1].id)).toBe(true);
  });

  it('interleaves SRS vocabulary review clips every 3 Shorts inside the For You feed', () => {
    const curated = AMERICAN_REELS_CORPUS.map(mapCuratedReelToVideoLesson);
    const srsClips: VideoLesson[] = [
      { ...sampleCustomLesson, id: 'srs-word-pastry', youtubeId: 'pastryVid01', targetWord: 'Pastry', expression: 'Pastry' },
      { ...sampleCustomLesson, id: 'srs-word-complicated', youtubeId: 'compVid0002', targetWord: 'Complicated', expression: 'Complicated' }
    ];

    const blended = buildForYouReelsFeed(curated, {
      watchedIds: new Set(),
      sessionSeed: 42,
      srsReviewClips: srsClips,
      srsEveryN: 3
    });

    expect(blended.length).toBe(curated.length + 2);
    expect(blended[3].id).toBe('srs-word-pastry');
    expect(blended[3].isSrsReviewClip).toBe(true);
    expect(blended[7].id).toBe('srs-word-complicated');
    expect(blended[7].isSrsReviewClip).toBe(true);
  });
});
