import { describe, it, expect } from 'vitest';
import {
  DEFAULT_REEL_CHANNELS,
  extractExpressionFromTitle,
  extractShortVideoId,
  fetchYouTubeApiShorts,
  isValidChannelId,
  parseYouTubeApiSearchItems,
  parseYouTubeRssShorts,
  sanitizeVocabWords
} from '../../../api/reels-feed.js';

const SAMPLE_RSS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
  <title>ChatterFox</title>
  <entry>
    <yt:videoId>eAizldoLIkk</yt:videoId>
    <title>&ldquo;With All Due Respect&rdquo; = Disagreement #workplace</title>
    <link rel="alternate" href="https://www.youtube.com/shorts/eAizldoLIkk"/>
    <author><name>ChatterFox</name></author>
    <published>2026-11-18T14:00:00+00:00</published>
  </entry>
  <entry>
    <yt:videoId>longVid1234</yt:videoId>
    <title>Full 25 Minute Landscape Lecture</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=longVid1234"/>
    <author><name>ChatterFox</name></author>
    <published>2026-11-17T14:00:00+00:00</published>
  </entry>
  <entry>
    <yt:videoId>dQ9SW57Cln4</yt:videoId>
    <title>Business English: What &quot;Just Checking In&quot; Actually Means</title>
    <link rel="alternate" href="https://www.youtube.com/shorts/dQ9SW57Cln4"/>
    <author><name>ChatterFox</name></author>
    <published>2026-11-16T10:00:00+00:00</published>
  </entry>
</feed>`;

describe('reels-feed RSS parser & validators', () => {
  it('filters strictly to vertical /shorts/ entries and skips landscape /watch videos', () => {
    const reels = parseYouTubeRssShorts(SAMPLE_RSS_XML, {
      channelId: 'UCAmXZMMytG4OQ6bz_Pm9KuA',
      category: 'work_talk',
      register: 'workplace_us',
      level: 'B1'
    });

    expect(reels).toHaveLength(2);
    expect(reels.map((r) => r.youtubeId)).toEqual(['eAizldoLIkk', 'dQ9SW57Cln4']);
    expect(reels[1].expression).toBe('Just Checking In');
    expect(reels[0].reelCategory).toBe('work_talk');
  });

  it('validates YouTube channel IDs strictly to prevent SSRF', () => {
    expect(isValidChannelId('UCAmXZMMytG4OQ6bz_Pm9KuA')).toBe(true);
    expect(isValidChannelId('http://169.254.169.254/latest')).toBe(false);
    expect(isValidChannelId('UCshort')).toBe(false);
    expect(DEFAULT_REEL_CHANNELS.every((c) => isValidChannelId(c.channelId))).toBe(true);
  });

  it('extracts 11-character video IDs from Shorts, watch, and youtu.be URLs only', () => {
    expect(extractShortVideoId('https://www.youtube.com/shorts/FkdIpHm4fjc?feature=share')).toBe('FkdIpHm4fjc');
    expect(extractShortVideoId('https://youtu.be/9LsK85CrsWU')).toBe('9LsK85CrsWU');
    expect(extractShortVideoId('https://evil.example.com/shorts/FkdIpHm4fjc')).toBeNull();
    expect(extractShortVideoId('@rachelsenglish')).toBeNull();
  });

  it('extracts clean expression hints from Short titles', () => {
    expect(extractExpressionFromTitle('What Does "Circle Back" Really Mean? | Business English #Shorts')).toBe('Circle Back');
    expect(extractExpressionFromTitle('How Americans Say It Fast #shorts #english')).toBe('How Americans Say It Fast');
  });

  it('sanitizes vocabulary words for YouTube Data API queries (deduped, capped at 5)', () => {
    expect(
      sanitizeVocabWords(' Pastry, complicated!, pastry, a, vibration, circle back, touch base, wrap up ')
    ).toEqual(['Pastry', 'complicated', 'vibration', 'circle back', 'touch base']);
  });

  it('parses YouTube Data API v3 search items and tags matched vocabulary words', () => {
    const sampleApiPayload = {
      nextPageToken: 'CAUQAA',
      items: [
        {
          id: { videoId: 'AbCdEfGhI12' },
          snippet: {
            title: 'How to Use &quot;Complicated&quot; Naturally #shorts',
            channelTitle: 'Speak English US',
            channelId: 'UCAmXZMMytG4OQ6bz_Pm9KuA',
            publishedAt: '2026-11-20T10:00:00Z',
            thumbnails: { high: { url: 'https://i.ytimg.com/vi/AbCdEfGhI12/hqdefault.jpg' } }
          }
        },
        {
          id: { videoId: 'invalid' },
          snippet: { title: 'Bad ID should be skipped' }
        }
      ]
    };

    const parsed = parseYouTubeApiSearchItems(sampleApiPayload, {
      category: 'daily_life',
      matchedVocabWord: 'Complicated'
    });

    expect(parsed).toHaveLength(1);
    expect(parsed[0].youtubeId).toBe('AbCdEfGhI12');
    expect(parsed[0].expression).toBe('Complicated');
    expect(parsed[0].matchedVocabWord).toBe('Complicated');
    expect(parsed[0].source).toBe('youtube_api_v3');
  });

  it('gracefully reports missing_key when YOUTUBE_API_KEY is not configured', async () => {
    const res = await fetchYouTubeApiShorts({ apiKey: '' });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('missing_key');
    expect(res.items).toEqual([]);
    expect(res.nextPageToken).toBeNull();
  });
});
