import { URLSearchParams } from 'node:url';

/**
 * Auto-Updating Real American YouTube Shorts Feed Service (YouTube Data API v3 Infinite Scroll + Official YouTube Atom RSS Fallback)
 *
 * Endpoints:
 * - GET  /api/reels/feed?refresh=0|1&channels=UC...,UC...
 * - POST /api/reels/resolve-channel  { input: "@handle | channel URL | Short URL | UC..." }
 */

export const CHANNEL_ID_REGEX = /^UC[a-zA-Z0-9_-]{22}$/;
export const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;
export const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours for RSS
export const YT_API_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours for YouTube Data API v3 (protects 10k/day free quota)
const MAX_CUSTOM_CHANNELS = 10;
const MAX_VOCAB_WORDS = 5;
const ALLOWED_YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);

const YT_TOPIC_QUERIES = {
  all: [
    'real american english phrases daily conversation #shorts',
    'native american english slang idioms spoken #shorts',
    'natural english expressions workplace daily life #shorts'
  ],
  daily_life: [
    'american english daily conversation phrases #shorts',
    'casual american slang idioms real life #shorts',
    'speak natural american english pronunciation #shorts'
  ],
  work_talk: [
    'american business english workplace phrases #shorts',
    'professional english meeting expressions #shorts',
    'office english idioms american accent #shorts'
  ]
};

let ytApiQuotaBlockedUntil = 0;

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

export function sanitizeVocabWords(rawWords) {
  const list = Array.isArray(rawWords)
    ? rawWords
    : String(rawWords || '')
        .split(',')
        .map((w) => w.trim());

  const seen = new Set();
  const clean = [];
  for (const item of list) {
    const normalized = String(item || '')
      .replace(/[^a-zA-Z0-9\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (normalized.length < 2 || normalized.length > 40) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(normalized);
    if (clean.length >= MAX_VOCAB_WORDS) break;
  }
  return clean;
}

export function parseYouTubeApiSearchItems(data, meta = {}) {
  if (!data || !Array.isArray(data.items)) return [];

  const category = meta.category === 'work_talk' || meta.category === 'my_videos' ? meta.category : 'daily_life';
  const register =
    meta.register === 'workplace_us' || meta.register === 'everyday'
      ? meta.register
      : category === 'work_talk'
        ? 'workplace_us'
        : 'casual_us';
  const level = meta.level === 'A2' || meta.level === 'B2' ? meta.level : 'B1';
  const matchedVocabWord = meta.matchedVocabWord ? String(meta.matchedVocabWord).trim() : undefined;

  const seen = new Set();
  const items = [];
  for (const entry of data.items) {
    const videoId = entry?.id?.videoId;
    if (!videoId || !YOUTUBE_ID_REGEX.test(videoId) || seen.has(videoId)) continue;
    seen.add(videoId);

    const snippet = entry.snippet || {};
    const title = decodeXmlEntities(snippet.title || 'American English Short');
    const channel = decodeXmlEntities(snippet.channelTitle || 'American English');
    const channelId = String(snippet.channelId || '');
    const publishedAt = String(snippet.publishedAt || '');
    const thumbnail =
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    items.push({
      id: matchedVocabWord ? `ytapi-vocab-${videoId}` : `ytapi-short-${videoId}`,
      youtubeId: videoId,
      title,
      channel,
      channelId,
      thumbnail,
      publishedAt,
      expression: matchedVocabWord || extractExpressionFromTitle(title),
      reelCategory: category,
      register,
      level,
      isCustomChannel: false,
      source: 'youtube_api_v3',
      matchedVocabWord
    });
  }
  return items;
}

export async function fetchYouTubeApiShorts({
  apiKey = process.env.YOUTUBE_API_KEY,
  topic = 'all',
  pageToken = '',
  vocabWord = '',
  queryIndex = 0,
  forceRefresh = false,
  fetchImpl = fetch
} = {}) {
  const key = String(apiKey || '').trim();
  if (!key) {
    return { ok: false, reason: 'missing_key', items: [], nextPageToken: null, cached: false };
  }
  if (Date.now() < ytApiQuotaBlockedUntil) {
    return { ok: false, reason: 'quota_blocked', items: [], nextPageToken: null, cached: false };
  }

  const normalizedTopic = topic === 'daily_life' || topic === 'work_talk' ? topic : 'all';
  const cleanWord = vocabWord ? sanitizeVocabWords([vocabWord])[0] || '' : '';
  const queries = YT_TOPIC_QUERIES[normalizedTopic] || YT_TOPIC_QUERIES.all;
  const queryStr = cleanWord
    ? `"${cleanWord}" english pronunciation example #shorts`
    : queries[Math.abs(Number(queryIndex) || 0) % queries.length];

  const safePageToken = String(pageToken || '').trim().slice(0, 128);
  const cacheKey = `ytapi:${normalizedTopic}:${cleanWord.toLowerCase()}:${queryIndex}:${safePageToken}`;
  const cachedEntry = feedCache.get(cacheKey);
  if (!forceRefresh && cachedEntry && Date.now() - cachedEntry.cachedAt < YT_API_CACHE_TTL_MS) {
    return { ...cachedEntry.payload, cached: true };
  }

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoDuration: 'short',
    videoCaption: 'closedCaption',
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    relevanceLanguage: 'en',
    regionCode: 'US',
    maxResults: cleanWord ? '10' : '20',
    q: queryStr,
    key
  });
  if (safePageToken) {
    params.set('pageToken', safePageToken);
  }

  try {
    const res = await fetchImpl(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: timeoutSignal(8000)
    });

    if (!res.ok) {
      let reason = `http_${res.status}`;
      try {
        const errJson = await res.json();
        const errReason = errJson?.error?.errors?.[0]?.reason;
        if (errReason) reason = errReason;
        if (res.status === 403 && (errReason === 'quotaExceeded' || errReason === 'dailyLimitExceeded')) {
          ytApiQuotaBlockedUntil = Date.now() + 60 * 60 * 1000;
        }
      } catch {
        // ignore JSON parse error
      }
      return { ok: false, reason, items: [], nextPageToken: null, cached: false };
    }

    const data = await res.json();
    const items = parseYouTubeApiSearchItems(data, {
      category: normalizedTopic === 'work_talk' ? 'work_talk' : 'daily_life',
      matchedVocabWord: cleanWord || undefined
    });
    const nextPageToken = typeof data?.nextPageToken === 'string' && data.nextPageToken ? data.nextPageToken : null;
    const payload = { ok: true, reason: 'ok', items, nextPageToken, cached: false };

    if (feedCache.size > 120) {
      feedCache.clear();
    }
    feedCache.set(cacheKey, { cachedAt: Date.now(), payload });
    return payload;
  } catch (err) {
    return {
      ok: false,
      reason: err?.message || 'network_error',
      items: [],
      nextPageToken: null,
      cached: false
    };
  }
}

export async function getAutoUpdatingReelsFeed(
  customChannelIds = [],
  forceRefresh = false,
  options = {}
) {
  const {
    topic = 'all',
    pageToken = '',
    words = [],
    queryIndex = 0,
    apiKey = process.env.YOUTUBE_API_KEY
  } = options || {};

  const hasApiKey = Boolean(String(apiKey || '').trim());
  const cleanWords = sanitizeVocabWords(words);

  // When loading a subsequent infinite-scroll page (pageToken present), use YouTube Data API v3 directly
  if (pageToken && hasApiKey) {
    const apiPage = await fetchYouTubeApiShorts({
      apiKey,
      topic,
      pageToken,
      queryIndex,
      forceRefresh
    });
    return {
      updatedAt: new Date().toISOString(),
      cached: apiPage.cached,
      source: apiPage.ok ? 'youtube_api_v3' : 'rss_fallback',
      hasApiKey,
      nextPageToken: apiPage.nextPageToken,
      hasMore: Boolean(apiPage.nextPageToken),
      channels: [],
      total: apiPage.items.length,
      reels: apiPage.items
    };
  }

  // Initial page: fetch RSS pool + optional YouTube Data API v3 discovery + vocab-matched Shorts
  const validCustomIds = Array.from(
    new Set(
      (Array.isArray(customChannelIds) ? customChannelIds : [])
        .map((c) => String(c || '').trim())
        .filter((c) => isValidChannelId(c) && !DEFAULT_REEL_CHANNELS.some((d) => d.channelId === c))
    )
  ).slice(0, MAX_CUSTOM_CHANNELS);

  const rssCacheKey = `rss:${validCustomIds.slice().sort().join(',')}`;
  const cachedRss = feedCache.get(rssCacheKey);
  let rssPayload;
  if (!forceRefresh && cachedRss && Date.now() - cachedRss.cachedAt < CACHE_TTL_MS) {
    rssPayload = { ...cachedRss.payload, cached: true };
  } else {
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
    const seenRssIds = new Set();
    const rssReels = [];
    for (const result of settled) {
      for (const item of result.items) {
        if (seenRssIds.has(item.youtubeId)) continue;
        seenRssIds.add(item.youtubeId);
        rssReels.push(item);
      }
    }
    rssReels.sort((a, b) => {
      const tA = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tB = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tB - tA;
    });

    rssPayload = {
      updatedAt: new Date().toISOString(),
      cached: false,
      channels: settled.map((s) => ({
        channelId: s.channelMeta.channelId,
        channelName: s.items[0]?.channel || s.channelMeta.channelName || s.channelMeta.channelId,
        category: s.channelMeta.category,
        shortsCount: s.items.length,
        ok: s.ok
      })),
      reels: rssReels
    };

    if (feedCache.size > 120) {
      feedCache.clear();
    }
    feedCache.set(rssCacheKey, { cachedAt: Date.now(), payload: rssPayload });
  }

  let apiItems = [];
  let vocabApiItems = [];
  let nextPageToken = null;
  let usedApi = false;

  if (hasApiKey) {
    const apiTasks = [
      fetchYouTubeApiShorts({ apiKey, topic, pageToken: '', queryIndex, forceRefresh })
    ];
    // Fetch Shorts specifically matching up to 2 due vocabulary words to keep quota lean
    for (const word of cleanWords.slice(0, 2)) {
      apiTasks.push(fetchYouTubeApiShorts({ apiKey, topic: 'all', vocabWord: word, forceRefresh }));
    }
    const [mainApiRes, ...vocabResults] = await Promise.all(apiTasks);
    if (mainApiRes?.ok) {
      usedApi = true;
      apiItems = mainApiRes.items;
      nextPageToken = mainApiRes.nextPageToken;
    }
    for (const vRes of vocabResults) {
      if (vRes?.ok && Array.isArray(vRes.items)) {
        usedApi = true;
        vocabApiItems.push(...vRes.items);
      }
    }
  }

  const seenVideoIds = new Set();
  const mergedReels = [];
  for (const item of [...vocabApiItems, ...apiItems, ...rssPayload.reels]) {
    if (!item?.youtubeId || seenVideoIds.has(item.youtubeId)) continue;
    seenVideoIds.add(item.youtubeId);
    mergedReels.push(item);
  }

  return {
    updatedAt: new Date().toISOString(),
    cached: rssPayload.cached && !usedApi,
    source: usedApi ? 'youtube_api_v3' : 'rss_fallback',
    hasApiKey,
    nextPageToken,
    hasMore: Boolean(nextPageToken),
    channels: rssPayload.channels,
    total: mergedReels.length,
    reels: mergedReels
  };
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
    const topic = parsedUrl.searchParams.get('topic') || 'all';
    const pageToken = parsedUrl.searchParams.get('pageToken') || '';
    const words = sanitizeVocabWords(parsedUrl.searchParams.get('words') || '');
    const queryIndex = parseInt(parsedUrl.searchParams.get('queryIndex') || '0', 10) || 0;

    const payload = await getAutoUpdatingReelsFeed(customChannelIds, forceRefresh, {
      topic,
      pageToken,
      words,
      queryIndex
    });
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
