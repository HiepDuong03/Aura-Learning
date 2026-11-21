/**
 * Auto-Updating Real American YouTube Shorts Feed Service (Zero API Key, Official YouTube Atom RSS)
 *
 * Endpoints:
 * - GET  /api/reels/feed?refresh=0|1&channels=UC...,UC...
 * - POST /api/reels/resolve-channel  { input: "@handle | channel URL | Short URL | UC..." }
 */

export const CHANNEL_ID_REGEX = /^UC[a-zA-Z0-9_-]{22}$/;
export const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
export const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_CUSTOM_CHANNELS = 10;
const ALLOWED_YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);

export const DEFAULT_REEL_CHANNELS = [
  // Daily Life & American Pronunciation / Spoken English
  {
    channelId: 'UCz9cIPlVfRkHl94X9e4l8jA',
    channelName: 'San Diego Voice and Accent',
    category: 'daily_life',
    register: 'casual_us',
    level: 'B1'
  },
  {
    channelId: 'UC74TkOwWHL2iJHdxz9vRHiA',
    channelName: 'English Teaching Friends',
    category: 'daily_life',
    register: 'everyday',
    level: 'A2'
  },
  {
    channelId: 'UCHfoJB35VzcHso4__v8FhaA',
    channelName: 'MASTER EVERYDAY ENGLISH',
    category: 'daily_life',
    register: 'everyday',
    level: 'A2'
  },
  {
    channelId: 'UCEKXieT70wByfvZwP1CxdPQ',
    channelName: 'English with Jennifer',
    category: 'daily_life',
    register: 'everyday',
    level: 'B1'
  },
  {
    channelId: 'UCie7oCnYQ0cdLpxrJ2V-F5Q',
    channelName: 'Tannia Suárez',
    category: 'daily_life',
    register: 'casual_us',
    level: 'B2'
  },
  // Workplace & Business American English
  {
    channelId: 'UCAmXZMMytG4OQ6bz_Pm9KuA',
    channelName: 'ChatterFox',
    category: 'work_talk',
    register: 'workplace_us',
    level: 'B1'
  },
  {
    channelId: 'UC2mIxKDcTqYB9IYckx1pc-Q',
    channelName: 'BizWise Business English',
    category: 'work_talk',
    register: 'workplace_us',
    level: 'B2'
  },
  {
    channelId: 'UCFhAn8nQds3JDvf21STjeEw',
    channelName: 'coachshanesesl',
    category: 'work_talk',
    register: 'workplace_us',
    level: 'B1'
  },
  {
    channelId: 'UCEFLuo9AR7268-qJj1FkmSw',
    channelName: 'Speak Confident English',
    category: 'work_talk',
    register: 'workplace_us',
    level: 'B2'
  }
];

const feedCache = new Map();

export function isValidChannelId(id) {
  return typeof id === 'string' && CHANNEL_ID_REGEX.test(id.trim());
}

export function decodeXmlEntities(text) {
  if (!text) return '';
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractExpressionFromTitle(title) {
  const cleaned = String(title || '')
    .replace(/#[a-zA-Z0-9_]+/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  const quoted = cleaned.match(/["“”'‘’]([^"“”'‘’]{2,48})["“”'‘’]/);
  if (quoted && quoted[1]?.trim()) {
    return quoted[1].trim();
  }

  const beforePipe = cleaned.split('|')[0]?.trim() || cleaned;
  return beforePipe.length > 52 ? `${beforePipe.slice(0, 49).trim()}...` : beforePipe;
}

export function extractShortVideoId(rawInput) {
  const value = String(rawInput || '').trim();
  if (!value) return null;
  if (YOUTUBE_ID_REGEX.test(value)) return value;

  try {
    const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const parsed = new URL(normalized);
    if (!ALLOWED_YT_HOSTS.has(parsed.hostname.toLowerCase())) return null;

    if (parsed.hostname.toLowerCase() === 'youtu.be') {
      const id = parsed.pathname.replace(/^\/+/, '').split('/')[0];
      return YOUTUBE_ID_REGEX.test(id) ? id : null;
    }

    const shortsMatch = parsed.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})(?:\/|$)/);
    if (shortsMatch) return shortsMatch[1];

    const vParam = parsed.searchParams.get('v');
    if (vParam && YOUTUBE_ID_REGEX.test(vParam)) return vParam;
  } catch {
    return null;
  }
  return null;
}

/**
 * Parses an official YouTube Atom RSS feed XML string and extracts ONLY vertical `/shorts/` entries.
 */
export function parseYouTubeRssShorts(xml, channelMeta = {}) {
  if (!xml || typeof xml !== 'string') return [];

  const feedTitleMatch = xml.match(/<feed[\s\S]*?<title>([\s\S]*?)<\/title>/i);
  const resolvedChannelName =
    channelMeta.channelName ||
    (feedTitleMatch ? decodeXmlEntities(feedTitleMatch[1]) : 'American English Channel');

  const items = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    const idMatch = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i);
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/i);
    const publishedMatch = block.match(/<published>([^<]+)<\/published>/i);
    const authorMatch = block.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/i);

    const videoId = idMatch ? idMatch[1].trim() : '';
    const href = linkMatch ? linkMatch[1].trim() : '';
    if (!YOUTUBE_ID_REGEX.test(videoId) || !href.includes('/shorts/')) {
      continue;
    }

    const title = decodeXmlEntities(titleMatch ? titleMatch[1] : '');
    const channel = decodeXmlEntities(authorMatch ? authorMatch[1] : '') || resolvedChannelName;
    const publishedAt = publishedMatch ? publishedMatch[1].trim() : '';

    items.push({
      id: `rss-short-${videoId}`,
      youtubeId: videoId,
      title: title || `American English Short (${videoId})`,
      channel,
      channelId: channelMeta.channelId || '',
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      publishedAt,
      expression: extractExpressionFromTitle(title),
      reelCategory: channelMeta.category || 'my_videos',
      register: channelMeta.register || 'casual_us',
      level: channelMeta.level || 'B1',
      isCustomChannel: Boolean(channelMeta.isCustomChannel)
    });
  }

  return items;
}

function timeoutSignal(ms) {
  return typeof globalThis.AbortSignal?.timeout === 'function'
    ? globalThis.AbortSignal.timeout(ms)
    : undefined;
}

async function fetchChannelRssShorts(channelMeta) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelMeta.channelId)}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; 4YouReelsFeed/1.0)'
      },
      signal: timeoutSignal(7000)
    });
    if (!res.ok) return { channelMeta, items: [], ok: false, status: res.status };
    const xml = await res.text();
    const items = parseYouTubeRssShorts(xml, channelMeta);
    return { channelMeta, items, ok: true, status: 200 };
  } catch (err) {
    return { channelMeta, items: [], ok: false, error: err?.message || 'RSS fetch timeout' };
  }
}

export async function getAutoUpdatingReelsFeed(customChannelIds = [], forceRefresh = false) {
  const validCustomIds = Array.from(
    new Set(
      (Array.isArray(customChannelIds) ? customChannelIds : [])
        .map((c) => String(c || '').trim())
        .filter((c) => isValidChannelId(c) && !DEFAULT_REEL_CHANNELS.some((d) => d.channelId === c))
    )
  ).slice(0, MAX_CUSTOM_CHANNELS);

  const cacheKey = validCustomIds.slice().sort().join(',');
  const cachedEntry = feedCache.get(cacheKey);
  if (!forceRefresh && cachedEntry && Date.now() - cachedEntry.cachedAt < CACHE_TTL_MS) {
    return { ...cachedEntry.payload, cached: true };
  }

  const allTargets = [
    ...DEFAULT_REEL_CHANNELS,
    ...validCustomIds.map((channelId) => ({
      channelId,
      channelName: '',
      category: 'my_videos',
      register: 'casual_us',
      level: 'B1',
      isCustomChannel: true
    }))
  ];

  const settled = await Promise.all(allTargets.map(fetchChannelRssShorts));

  const seenVideoIds = new Set();
  const mergedReels = [];

  for (const result of settled) {
    for (const item of result.items) {
      if (seenVideoIds.has(item.youtubeId)) continue;
      seenVideoIds.add(item.youtubeId);
      mergedReels.push(item);
    }
  }

  // Sort newest first so fresh Shorts uploaded this week always appear at the top
  mergedReels.sort((a, b) => {
    const tA = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tB = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tB - tA;
  });

  const payload = {
    updatedAt: new Date().toISOString(),
    cached: false,
    channels: settled.map((s) => ({
      channelId: s.channelMeta.channelId,
      channelName: s.items[0]?.channel || s.channelMeta.channelName || s.channelMeta.channelId,
      category: s.channelMeta.category,
      shortsCount: s.items.length,
      ok: s.ok
    })),
    total: mergedReels.length,
    reels: mergedReels
  };

  if (feedCache.size > 40) {
    feedCache.clear();
  }
  feedCache.set(cacheKey, { cachedAt: Date.now(), payload });
  return payload;
}

export async function resolveChannelOrShort(rawInput) {
  const input = String(rawInput || '').trim();
  if (!input) {
    const err = new Error('Vui lòng dán link YouTube Short hoặc link/@handle kênh YouTube.');
    err.statusCode = 400;
    throw err;
  }

  // 1. Direct Short or YouTube video URL / 11-char ID
  const videoId = extractShortVideoId(input);
  if (videoId) {
    const oeRes = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/shorts/${videoId}`)}&format=json`,
      { signal: timeoutSignal(7000) }
    );
    if (!oeRes.ok) {
      const err = new Error('Video YouTube này không tồn tại hoặc không cho phép nhúng.');
      err.statusCode = 404;
      throw err;
    }
    const meta = await oeRes.json();
    return {
      type: 'short',
      videoId,
      title: meta.title || `YouTube Short (${videoId})`,
      author: meta.author_name || 'YouTube Creator',
      vertical: Boolean(meta.height && meta.width && meta.height > meta.width),
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    };
  }

  // 2. Direct channel ID (UC...)
  let channelId = isValidChannelId(input) ? input : null;

  // 3. Channel URL or @handle (strict YouTube host check — prevents SSRF)
  if (!channelId) {
    let targetUrl = '';
    if (input.startsWith('@') && /^@[a-zA-Z0-9._-]{2,64}$/.test(input)) {
      targetUrl = `https://www.youtube.com/${input}`;
    } else {
      let parsed;
      try {
        parsed = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
      } catch {
        const err = new Error('Định dạng link không hợp lệ. Hãy dán link YouTube Short hoặc @tenkenh.');
        err.statusCode = 400;
        throw err;
      }

      if (!ALLOWED_YT_HOSTS.has(parsed.hostname.toLowerCase())) {
        const err = new Error('Chỉ hỗ trợ đường dẫn từ youtube.com hoặc youtu.be.');
        err.statusCode = 400;
        throw err;
      }

      const directChannelMatch = parsed.pathname.match(/^\/channel\/(UC[a-zA-Z0-9_-]{22})(?:\/|$)/);
      if (directChannelMatch) {
        channelId = directChannelMatch[1];
      } else {
        targetUrl = `https://www.youtube.com${parsed.pathname}`;
      }
    }

    if (!channelId && targetUrl) {
      const pageRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        signal: timeoutSignal(8000)
      });
      if (!pageRes.ok) {
        const err = new Error('Không tìm thấy kênh YouTube này.');
        err.statusCode = 404;
        throw err;
      }
      const html = await pageRes.text();
      const cidMatch =
        html.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/) ||
        html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/) ||
        html.match(/channel_id=(UC[a-zA-Z0-9_-]{22})/);

      if (!cidMatch) {
        const err = new Error('Không trích xuất được mã kênh (channel_id) từ đường dẫn này.');
        err.statusCode = 404;
        throw err;
      }
      channelId = cidMatch[1];
    }
  }

  // Verify RSS feed for resolved channelId
  const rssCheck = await fetchChannelRssShorts({
    channelId,
    channelName: '',
    category: 'my_videos',
    isCustomChannel: true
  });

  if (!rssCheck.ok) {
    const err = new Error('Không đọc được RSS công khai từ kênh YouTube này.');
    err.statusCode = 404;
    throw err;
  }

  return {
    type: 'channel',
    channelId,
    channelName: rssCheck.items[0]?.channel || channelId,
    shortsCount: rssCheck.items.length,
    sampleReels: rssCheck.items.slice(0, 5)
  };
}

async function readJsonBody(req, maxBytes = 8192) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

export async function handleReelsFeedRequest(req, res, pathname) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (pathname === '/api/reels/feed' && req.method === 'GET') {
    const forceRefresh = parsedUrl.searchParams.get('refresh') === '1';
    const rawChannels = parsedUrl.searchParams.get('channels') || '';
    const customChannelIds = rawChannels
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = await getAutoUpdatingReelsFeed(customChannelIds, forceRefresh);
    res.statusCode = 200;
    res.end(JSON.stringify(payload));
    return;
  }

  if (pathname === '/api/reels/resolve-channel' && req.method === 'POST') {
    const body = await readJsonBody(req);
    const resolved = await resolveChannelOrShort(body?.input);
    res.statusCode = 200;
    res.end(JSON.stringify(resolved));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found' }));
}
