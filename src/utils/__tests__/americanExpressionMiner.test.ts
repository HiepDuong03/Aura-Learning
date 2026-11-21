import { describe, it, expect } from 'vitest';
import {
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
      youtubeId: 'UF8uR6Z6KLc',
      isCustom: false,
      subtitles: [
        { id: 'd1', start: 52.0, end: 55.0, text: 'No big deal. Just three stories.', translation: 'Chuyện nhỏ thôi.' }
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
});
