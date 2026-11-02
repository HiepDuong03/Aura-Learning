import type { Plugin } from 'vite';
import https from 'node:https';
import { IncomingMessage, ServerResponse } from 'node:http';

async function fetchFromYouTube(videoId: string) {
  // 1. Fetch watch page to extract INNERTUBE_API_KEY
  const html = await new Promise<string>((resolve, reject) => {
    https.get(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });

  const apiKeyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const apiKey = apiKeyMatch ? apiKeyMatch[1] : '';

  // 2. Query youtubei/v1/player with modern Android client context
  const postData = JSON.stringify({
    context: {
      client: {
        clientName: 'ANDROID',
        clientVersion: '20.10.38',
        hl: 'en',
        gl: 'US'
      }
    },
    videoId: videoId
  });

  const playerJson = await new Promise<any>((resolve, reject) => {
    const req = https.request({
      hostname: 'www.youtube.com',
      port: 443,
      path: `/youtubei/v1/player?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve({}); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  const title = playerJson.videoDetails?.title || '';
  const author = playerJson.videoDetails?.author || '';
  const captionTracks = playerJson.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

  if (captionTracks.length === 0) {
    throw new Error('Video này không có phụ đề tiếng Anh trên YouTube.');
  }

  // Prioritize manual English over auto-generated ASR
  const track = captionTracks.find((t: any) => t.languageCode === 'en' && !t.kind) || 
                captionTracks.find((t: any) => t.languageCode === 'en') || 
                captionTracks[0];

  const xml = await new Promise<string>((resolve, reject) => {
    https.get(track.baseUrl, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });

  // Check if official Vietnamese subtitles exist on YouTube
  const viTrack = captionTracks.find((t: any) => t.languageCode === 'vi');
  let viSubs: { start: number; end: number; text: string }[] = [];
  if (viTrack) {
    try {
      const viXml = await new Promise<string>((resolve, reject) => {
        https.get(viTrack.baseUrl, res => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => resolve(d));
        }).on('error', reject);
      });
      const viRegex = /<p t="(\d+)" d="(\d+)"[^>]*>(.*?)<\/p>/gs;
      let viMatch;
      while ((viMatch = viRegex.exec(viXml)) !== null) {
        const vStart = parseInt(viMatch[1], 10) / 1000;
        const vDur = parseInt(viMatch[2], 10) / 1000;
        const vText = viMatch[3]
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\n/g, ' ')
          .trim();
        if (vText && !vText.match(/^\[(music|applause|cheering)\]$/i)) {
          viSubs.push({ start: vStart, end: vStart + vDur, text: vText });
        }
      }
    } catch (e) {
      console.warn('Could not fetch vi caption track', e);
    }
  }

  // Parse <p t="startMs" d="durMs">Text</p>
  const regex = /<p t="(\d+)" d="(\d+)"[^>]*>(.*?)<\/p>/gs;
  let match;
  const rawSubtitles = [];
  let idCounter = 1;

  while ((match = regex.exec(xml)) !== null) {
    const startMs = parseInt(match[1], 10);
    const durMs = parseInt(match[2], 10);
    let text = match[3]
      .replace(/<[^>]+>/g, '') // remove inner formatting tags
      .replace(/&amp;/g, '&')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\n/g, ' ')
      .trim();

    if (text && !text.match(/^\[(music|applause|cheering)\]$/i)) {
      const start = parseFloat((startMs / 1000).toFixed(2));
      const end = parseFloat(((startMs + durMs) / 1000).toFixed(2));
      let translation = '';

      if (viSubs.length > 0) {
        const enMid = (start + end) / 2;
        let minDiff = 2.5;
        for (const vi of viSubs) {
          const viMid = (vi.start + vi.end) / 2;
          const diff = Math.abs(enMid - viMid);
          if (diff < minDiff) {
            minDiff = diff;
            translation = vi.text;
          }
        }
      }

      rawSubtitles.push({
        id: `s-${idCounter++}`,
        start,
        end,
        text,
        translation
      });
    }
  }

  // Strictly eliminate timestamp overlaps in YouTube ASR
  rawSubtitles.sort((a, b) => a.start - b.start);
  for (let i = 0; i < rawSubtitles.length - 1; i++) {
    const cur = rawSubtitles[i];
    const next = rawSubtitles[i + 1];
    if (cur.end > next.start) {
      cur.end = parseFloat(Math.max(cur.start + 0.2, next.start).toFixed(2));
    }
  }

  return {
    videoId,
    title,
    author,
    totalSubtitles: rawSubtitles.length,
    subtitles: rawSubtitles
  };
}

export function youtubeCaptionPlugin(): Plugin {
  return {
    name: 'youtube-caption-plugin',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        if (!req.url || !req.url.startsWith('/api/youtube-captions')) {
          return next();
        }

        try {
          const urlObj = new URL(req.url, 'http://localhost');
          const videoId = urlObj.searchParams.get('v');

          if (!videoId) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing videoId parameter (?v=...)' }));
            return;
          }

          const result = await fetchFromYouTube(videoId);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: err.message || 'Lỗi khi tải phụ đề từ YouTube' }));
        }
      });
    }
  };
}
