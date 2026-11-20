import https from 'node:https';

export const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function isValidYouTubeId(videoId) {
  return typeof videoId === 'string' && YOUTUBE_ID_REGEX.test(videoId.trim());
}

const captionRateHits = new Map();
function checkCaptionRateLimit(ip, windowMs = 60_000, maxReq = 20) {
  const now = Date.now();
  if (captionRateHits.size > 1000) {
    for (const [k, rec] of captionRateHits.entries()) {
      if (now > rec.resetAt) captionRateHits.delete(k);
    }
  }
  const existing = captionRateHits.get(ip);
  if (!existing || now > existing.resetAt) {
    captionRateHits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  existing.count += 1;
  return existing.count <= maxReq;
}

export async function fetchFromYouTube(rawVideoId) {
  const videoId = String(rawVideoId || '').trim();
  if (!isValidYouTubeId(videoId)) {
    const err = new Error('Invalid YouTube videoId format.');
    err.statusCode = 400;
    throw err;
  }
  // 1. Fetch watch page to extract INNERTUBE_API_KEY
  const html = await new Promise((resolve, reject) => {
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

  const playerJson = await new Promise((resolve, reject) => {
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
  const track = captionTracks.find(t => t.languageCode === 'en' && !t.kind) || 
                captionTracks.find(t => t.languageCode === 'en') || 
                captionTracks[0];

  const xml = await new Promise((resolve, reject) => {
    https.get(track.baseUrl, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });

  // Check if official Vietnamese subtitles exist on YouTube
  const viTrack = captionTracks.find(t => t.languageCode === 'vi');
  let viSubs = [];
  if (viTrack) {
    try {
      const viXml = await new Promise((resolve, reject) => {
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
      .replace(/<[^>]+>/g, '')
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const videoId = (url.searchParams.get('v') || req.query?.v || '').trim();

  if (!videoId) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Missing videoId parameter (?v=...)' }));
    return;
  }

  if (!isValidYouTubeId(videoId)) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid YouTube videoId format. Must be 11 characters [a-zA-Z0-9_-].' }));
    return;
  }

  const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').toString().split(',')[0].trim();
  if (!checkCaptionRateLimit(clientIp)) {
    res.statusCode = 429;
    res.end(JSON.stringify({ error: 'Quá nhiều yêu cầu lấy phụ đề. Vui lòng thử lại sau 1 phút.' }));
    return;
  }

  try {
    const result = await fetchFromYouTube(videoId);
    res.statusCode = 200;
    res.end(JSON.stringify(result));
  } catch (err) {
    res.statusCode = err.statusCode || 500;
    res.end(JSON.stringify({ error: err.message || 'Lỗi khi tải phụ đề từ YouTube' }));
  }
}
