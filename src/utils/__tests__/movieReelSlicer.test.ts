import { describe, it, expect } from 'vitest';
import {
  buildVideoLessonFromManifestEntry,
  parseSrtToSubtitles,
  selectAmericanReelClipsFromSubtitles
} from '../movieReelSlicer';

const SAMPLE_SRT = `1
00:00:10,000 --> 00:00:13,200
Hey Joey, wanna grab coffee after work?

2
00:00:13,500 --> 00:00:16,000
Sure, sounds good! Let's hang out at Central Perk.

3
00:00:16,500 --> 00:00:19,500
Awesome, see you there at six.

4
00:01:02,000 --> 00:01:05,400
Before we leave, let's make sure we're all on the same page.

5
00:01:05,800 --> 00:01:08,500
Fair enough, let's wrap up in five minutes.
`;

describe('movieReelSlicer', () => {
  it('parses standard SRT cues with accurate second timestamps', () => {
    const cues = parseSrtToSubtitles(SAMPLE_SRT);
    expect(cues).toHaveLength(5);
    expect(cues[0].start).toBe(10);
    expect(cues[0].end).toBe(13.2);
    expect(cues[1].text).toContain('sounds good');
    expect(cues[3].start).toBe(62);
  });

  it('selects authentic American expression clips with 0-based relative subtitles', () => {
    const cues = parseSrtToSubtitles(SAMPLE_SRT);
    const clips = selectAmericanReelClipsFromSubtitles(cues, {
      sourceSlug: 'friends-s01e01',
      maxClips: 10
    });

    expect(clips.length).toBeGreaterThanOrEqual(2);
    expect(clips[0].expression.toLowerCase()).toBe('sounds good');
    expect(clips[0].subtitles[0].start).toBeGreaterThanOrEqual(0);
    expect(clips[0].subtitles[clips[0].targetSubIndex].text).toContain('sounds good');
    expect(clips[1].expression.toLowerCase()).toBe('on the same page');
  });

  it('builds a direct HTML5 MP4 VideoLesson with videoUrl', () => {
    const cues = parseSrtToSubtitles(SAMPLE_SRT);
    const [first] = selectAmericanReelClipsFromSubtitles(cues, {
      sourceSlug: 'friends-s01e01'
    });
    const lesson = buildVideoLessonFromManifestEntry(first, {
      videoUrl: '/reels/friends-s01e01-1.mp4',
      sourceTitle: 'Friends S01E01'
    });

    expect(lesson.videoUrl).toBe('/reels/friends-s01e01-1.mp4');
    expect(lesson.youtubeId).toBe('');
    expect(lesson.startSeconds).toBe(0);
    expect(lesson.expression?.toLowerCase()).toBe('sounds good');
  });
});
