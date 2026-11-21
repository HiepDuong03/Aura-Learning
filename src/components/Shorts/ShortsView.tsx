import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  VideoLesson,
  SavedWord,
  AnkiRating,
  AuthUser,
  ContextExplanation,
  DailyReelProgress,
  SubtitleLine
} from '../../types';
import {
  ChevronUp,
  ChevronDown,
  Heart,
  Bookmark,
  BookmarkCheck,
  Volume2,
  VolumeX,
  Sparkles,
  ArrowRight,
  Play,
  Pause,
  Repeat,
  Eye,
  Target,
  Search,
  Plus,
  SlidersHorizontal,
  Mic,
  MicOff,
  Zap,
  CheckCircle2,
  BookOpen,
  AlertTriangle,
  Loader2,
  ListFilter,
  Layers,
  GraduationCap,
  Lock,
  Globe,
  Flame,
  Ear,
  Brain,
  X,
  Settings2,
  Film,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { batchTranslateSubtitles, explainInContext } from '../../services/dictionaryService';
import { authService } from '../../services/authService';
import { getLocalDateKey } from '../../services/scopedStorage';
import { tokenizeText } from '../../utils/textTokenizer';
import { loadYouTubeIframeAPI, parseYouTubePlayerError, YouTubePlayerError } from '../../services/youtubeLoader';
import {
  computePoolAssignments,
  getPoolSlotForIndex,
  planSlotAction,
  PoolSlotId,
  PoolSlotRuntime
} from '../../utils/shortsPlayerPool';
import { decodeConnectedSpeech } from '../../utils/connectedSpeechDecoder';
import {
  buildMicroQuizForReels,
  buildThematicReelsFeed,
  MicroQuizQuestion,
  mineAmericanExpressionsFromLessons,
  ReelTopicFilter
} from '../../utils/americanExpressionMiner';
import { AMERICAN_REELS_CORPUS, mapCuratedReelToVideoLesson } from '../../data/americanReelsCorpus';
import { shortsFeedService } from '../../services/shortsFeedService';
import { youglishEngine, AccentZone, ContextRegister, YouGlishOccurrence } from '../../services/youglishEngine';
import { speechScoringService, SpeechScoreResult } from '../../services/speechScoringService';
import { YouGlishLiveWidget } from './YouGlishLiveWidget';
import { useNotify } from '../Common/ToastProvider';

type ShortsFeedMode = 'reels' | 'youglish' | 'search';
type SubtitleDisplayMode = 'bilingual' | 'en_only' | 'blind';

export interface SaveReelExpressionPayload {
  expression: string;
  meaningVi: string;
  contextSentence: string;
  usageNote?: string;
  videoTitle?: string;
  sourceLessonId?: string;
  sourceYoutubeId?: string;
  sourceTimestampSec?: number;
}

interface ShortsViewProps {
  isActive?: boolean;
  shorts?: VideoLesson[];
  onSelectWord: (word: string, contextSentence: string) => void;
  onOpenLesson: (lesson: VideoLesson) => void;
  savedWords?: SavedWord[];
  lessons?: VideoLesson[];
  activeProfileId?: string;
  onImportShortClick?: () => void;
  onReviewWord?: (wordId: string, rating: AnkiRating) => void;
  onSaveReelExpression?: (payload: SaveReelExpressionPayload) => void;
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
  dailyReelProgress?: DailyReelProgress;
  onDailyReelProgressChange?: (progress: DailyReelProgress) => void;
}

interface HeartParticle {
  id: number;
  x: number;
  y: number;
}

export const ShortsView: React.FC<ShortsViewProps> = ({
  isActive = true,
  onSelectWord,
  onOpenLesson,
  savedWords = [],
  lessons = [],
  activeProfileId = 'default_profile',
  onImportShortClick,
  onReviewWord,
  onSaveReelExpression,
  currentUser,
  onOpenAuth,
  dailyReelProgress,
  onDailyReelProgressChange
}) => {
  const { toast } = useNotify();
  // Feed Mode State: Real American Reels (default, entertainment-first) | YouGlish SRS | Search
  const [feedMode, setFeedMode] = useState<ShortsFeedMode>('reels');
  const [reelTopicFilter, setReelTopicFilter] = useState<ReelTopicFilter>('all');
  const [selectedWordFilter, setSelectedWordFilter] = useState<string>('all');
  const [accentFilter, setAccentFilter] = useState<AccentZone>('GLOBAL');
  const [registerFilter, setRegisterFilter] = useState<'all' | ContextRegister>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [showLiveYouglish, setShowLiveYouglish] = useState<boolean>(false);

  // Active Index & Feed
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentSubIndex, setCurrentSubIndex] = useState<number>(0);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // TikTok Ergonomics & Micro-Interactions
  // Start muted on initial load so browsers never block autoplay; display a prominent unmute pill (PLOS ONE 2024)
  const [isGlobalMuted, setIsGlobalMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('4you_shorts_muted');
    return saved !== null ? saved === 'true' : true;
  });
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isHoldSpeeding, setIsHoldSpeeding] = useState<boolean>(false);
  const [heartParticles, setHeartParticles] = useState<HeartParticle[]>([]);
  const lastTapTimeRef = useRef<number>(0);
  const tapTimeoutRef = useRef<any>(null);
  const holdSpeedTimerRef = useRef<any>(null);
  const lastWheelTimeRef = useRef<number>(0);

  // Video Loading & Error Recovery States
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(true);
  const [playerError, setPlayerError] = useState<YouTubePlayerError | null>(null);
  const [swipeAnimation, setSwipeAnimation] = useState<'slide-up' | 'slide-down' | null>(null);
  const [useDirectIframe, setUseDirectIframe] = useState<boolean>(false);
  const loadingTimeoutRef = useRef<any>(null);

  // Subtitle Display Mode: Default 'bilingual' in Reels (Comprehensible Input i+1, Cambridge 2026 L2-top)
  const [subtitleMode, setSubtitleMode] = useState<SubtitleDisplayMode>('bilingual');
  const isBlindMode = subtitleMode === 'blind';
  const [isWordRevealed, setIsWordRevealed] = useState<boolean>(false);
  const [isDrillMode, setIsDrillMode] = useState<boolean>(false);
  const [drillRepeatCount, setDrillRepeatCount] = useState<number>(1);
  const drillRepeatCountRef = useRef<number>(1);

  // Interpolated 3-Second Micro-Quiz State (Nature Comms Psych 2025)
  const [activeMicroQuiz, setActiveMicroQuiz] = useState<MicroQuizQuestion | null>(null);
  const [microQuizAnswer, setMicroQuizAnswer] = useState<number | null>(null);
  const watchedReelsRef = useRef<VideoLesson[]>([]);
  const swipesSinceQuizRef = useRef<number>(0);

  // AI American Nuance Decoder State (reuses POST /api/ai/explain)
  const [aiNuance, setAiNuance] = useState<ContextExplanation | null>(null);
  const [isLoadingAiNuance, setIsLoadingAiNuance] = useState<boolean>(false);
  const [aiNuanceError, setAiNuanceError] = useState<string | null>(null);

  // 1-Tap Shadowing States
  const [isShadowing, setIsShadowing] = useState<boolean>(false);
  const [shadowResult, setShadowResult] = useState<SpeechScoreResult | null>(null);
  const recognitionRef = useRef<any>(null);

  // Settings drawer (consolidates Subtitle mode, Drill 3x, Player Pool/IFrame, Offset & YouGlish Live)
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [showSearchBar, setShowSearchBar] = useState<boolean>(false);
  const [subOffset, setSubOffset] = useState<number>(0);

  // Local / R2 MP4 movie reels manifest (auto-loaded from /reels/manifest.json if present)
  const [manifestReels, setManifestReels] = useState<VideoLesson[]>([]);

  // Auto-Updating Live YouTube Shorts RSS Feed + User-Followed Channels & User-Added Shorts
  interface FollowedReelChannel {
    channelId: string;
    channelName: string;
    shortsCount?: number;
  }
  const [liveRssReels, setLiveRssReels] = useState<VideoLesson[]>([]);
  const [isRefreshingFeed, setIsRefreshingFeed] = useState<boolean>(false);
  const [showAddSourcePanel, setShowAddSourcePanel] = useState<boolean>(false);
  const [sourceInput, setSourceInput] = useState<string>('');
  const [isResolvingSource, setIsResolvingSource] = useState<boolean>(false);
  const [sourceError, setSourceError] = useState<string | null>(null);

  const [followedChannels, setFollowedChannels] = useState<FollowedReelChannel[]>(() => {
    try {
      const raw = localStorage.getItem(`4you_shorts_followed_channels_${activeProfileId}`);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [customAddedShorts, setCustomAddedShorts] = useState<VideoLesson[]>(() => {
    try {
      const raw = localStorage.getItem(`4you_shorts_custom_added_${activeProfileId}`);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [dynamicSubtitlesMap, setDynamicSubtitlesMap] = useState<Record<string, SubtitleLine[]>>(() => {
    try {
      const raw = localStorage.getItem('4you_shorts_captions_cache_v1');
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });
  const [hydratingVideoId, setHydratingVideoId] = useState<string | null>(null);
  const [failedCaptionIds, setFailedCaptionIds] = useState<Record<string, boolean>>({});
  const inFlightCaptionIdsRef = useRef<Set<string>>(new Set());

  // Mobile companion drawer toggle
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  const playerRef = useRef<any>(null);
  const nativeVideoRef = useRef<HTMLVideoElement | null>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const userPausedRef = useRef<boolean>(false);
  const poolPlayersRef = useRef<Record<PoolSlotId, any>>({ 0: null, 1: null, 2: null });
  const poolContainersRef = useRef<Record<PoolSlotId, HTMLDivElement | null>>({ 0: null, 1: null, 2: null });
  const poolRuntimesRef = useRef<Record<PoolSlotId, PoolSlotRuntime>>({
    0: { clipId: null, youtubeId: null, startSeconds: 0, isReady: false, isPrewarmed: false },
    1: { clipId: null, youtubeId: null, startSeconds: 0, isReady: false, isPrewarmed: false },
    2: { clipId: null, youtubeId: null, startSeconds: 0, isReady: false, isPrewarmed: false }
  });
  const isMountedRef = useRef<boolean>(true);
  const activeSlotRef = useRef<PoolSlotId>(0);
  const activeClipStartRef = useRef<number>(0);
  const isActiveRef = useRef<boolean>(isActive);
  const isGlobalMutedRef = useRef<boolean>(isGlobalMuted);
  const playbackRateRef = useRef<number>(playbackRate);
  const loadingDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prewarmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSeekingRef = useRef<boolean>(false);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isGlobalMutedRef.current = isGlobalMuted;
  }, [isGlobalMuted]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Auto-load local or Cloudflare R2 MP4 Movie/Sitcom Reels manifest (0ms HTML5 <video> engine)
  useEffect(() => {
    let cancelled = false;
    const manifestUrl =
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_REELS_MANIFEST_URL ||
      '/reels/manifest.json';

    fetch(manifestUrl)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const valid = data.filter(
          (item): item is VideoLesson =>
            Boolean(item && typeof item === 'object' && item.id && typeof item.videoUrl === 'string' && item.videoUrl)
        );
        if (valid.length > 0) {
          setManifestReels(valid);
        }
      })
      .catch(() => {
        // Optional manifest: silently skip when no local MP4 reels have been sliced yet
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const lastLoadedProfileIdRef = useRef<string>(activeProfileId);

  // Reload profile-scoped channels & custom Shorts cleanly when activeProfileId changes (never bleed across accounts!)
  useEffect(() => {
    if (lastLoadedProfileIdRef.current === activeProfileId) return;
    lastLoadedProfileIdRef.current = activeProfileId;
    try {
      const rawCh = localStorage.getItem(`4you_shorts_followed_channels_${activeProfileId}`);
      const parsedCh = rawCh ? JSON.parse(rawCh) : [];
      setFollowedChannels(Array.isArray(parsedCh) ? parsedCh : []);
    } catch {
      setFollowedChannels([]);
    }
    try {
      const rawSh = localStorage.getItem(`4you_shorts_custom_added_${activeProfileId}`);
      const parsedSh = rawSh ? JSON.parse(rawSh) : [];
      setCustomAddedShorts(Array.isArray(parsedSh) ? parsedSh : []);
    } catch {
      setCustomAddedShorts([]);
    }
  }, [activeProfileId]);

  // Persist user-followed YouTube channels & custom-added Shorts strictly for the active profile
  useEffect(() => {
    if (lastLoadedProfileIdRef.current !== activeProfileId) return;
    try {
      localStorage.setItem(`4you_shorts_followed_channels_${activeProfileId}`, JSON.stringify(followedChannels));
    } catch {
      // ignore storage quota errors
    }
  }, [followedChannels, activeProfileId]);

  useEffect(() => {
    if (lastLoadedProfileIdRef.current !== activeProfileId) return;
    try {
      localStorage.setItem(`4you_shorts_custom_added_${activeProfileId}`, JSON.stringify(customAddedShorts));
    } catch {
      // ignore storage quota errors
    }
  }, [customAddedShorts, activeProfileId]);

  // Fetch auto-updating live YouTube Shorts feed from official RSS via /api/reels/feed
  const loadLiveRssFeed = useCallback(async (forceRefresh = false, showToastOnDone = false) => {
    setIsRefreshingFeed(true);
    try {
      const customChannelIds = followedChannels.map((c) => c.channelId).filter(Boolean);
      const params = new URLSearchParams();
      if (forceRefresh) params.set('refresh', '1');
      if (customChannelIds.length > 0) params.set('channels', customChannelIds.join(','));
      const query = params.toString();
      const res = await fetch(`/api/reels/feed${query ? `?${query}` : ''}`);
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data?.reels)) return;

      const mapped: VideoLesson[] = data.reels
        .filter((item: unknown): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
        .map((item: Record<string, unknown>) => {
          const youtubeId = String(item.youtubeId || '');
          const title = String(item.title || 'Real American Short');
          const channel = String(item.channel || 'American English');
          const expression = String(item.expression || title);
          const category =
            item.reelCategory === 'work_talk' || item.reelCategory === 'my_videos'
              ? item.reelCategory
              : 'daily_life';
          const register =
            item.register === 'workplace_us' || item.register === 'everyday'
              ? item.register
              : 'casual_us';
          const level = item.level === 'A2' || item.level === 'B2' ? item.level : 'B1';

          return {
            id: `rss-short-${youtubeId}`,
            youtubeId,
            title,
            channel,
            thumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
            level,
            topic: category === 'work_talk' ? 'Công sở Mỹ' : category === 'my_videos' ? 'Kênh bạn theo dõi' : 'Đời sống Mỹ',
            duration: '00:55',
            durationSec: 55,
            views: 'Live RSS',
            description: `Shorts dọc 9:16 mới nhất từ ${channel} — phụ đề & dịch tiếng Việt tự động nạp khi xem.`,
            subtitles: [],
            quizzes: [],
            isShort: true,
            isCustom: category === 'my_videos',
            startSeconds: 0,
            endSeconds: 59,
            targetWord: expression,
            sourceLessonTitle: title,
            expression,
            expressionMeaningVi: '',
            americanUsageNote: `Clip Shorts dọc 9:16 tự động cập nhật từ kênh ${channel}. Nhấn vào bất kỳ từ nào trong phụ đề để tra & lưu FSRS-6.`,
            reelCategory: category,
            register
          } as VideoLesson;
        });

      setLiveRssReels(mapped);
      if (showToastOnDone) {
        toast.success(`Đã cập nhật ${mapped.length} Shorts dọc 9:16 mới nhất từ YouTube!`);
      }
    } catch {
      if (showToastOnDone) {
        toast.error('Không thể làm mới feed lúc này — đang dùng kho Shorts dự phòng.');
      }
    } finally {
      setIsRefreshingFeed(false);
    }
  }, [followedChannels, toast]);

  useEffect(() => {
    void loadLiveRssFeed(false, false);
  }, [loadLiveRssFeed]);

  // User adds ANY YouTube Short link or YouTube channel (@handle / URL) right inside the app
  const handleAddReelSource = useCallback(async (rawValue?: string) => {
    const input = (rawValue ?? sourceInput).trim();
    if (!input || isResolvingSource) return;
    setIsResolvingSource(true);
    setSourceError(null);
    try {
      const res = await fetch('/api/reels/resolve-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input })
      });
      const data = await res.json();
      if (!res.ok) {
        setSourceError(data?.error || 'Không nhận diện được link YouTube Short hoặc kênh này.');
        return;
      }

      if (data.type === 'short' && data.videoId) {
        const newShort: VideoLesson = {
          id: `custom-short-${data.videoId}`,
          youtubeId: data.videoId,
          title: data.title || `YouTube Short (${data.videoId})`,
          channel: data.author || 'Short bạn thêm',
          thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`,
          level: 'B1',
          topic: 'Short bạn thêm',
          duration: '00:55',
          durationSec: 55,
          views: 'Của bạn',
          description: `Video Short bạn tự thêm từ ${data.author || 'YouTube'}.`,
          subtitles: [],
          quizzes: [],
          isShort: true,
          isCustom: true,
          startSeconds: 0,
          endSeconds: 59,
          targetWord: data.title || 'YouTube Short',
          sourceLessonTitle: data.title || 'YouTube Short',
          expression: (data.title || 'YouTube Short').slice(0, 52),
          americanUsageNote: `Clip bạn tự dán từ kênh ${data.author || 'YouTube'}. Hệ thống tự kéo phụ đề khớp giây & dịch tiếng Việt.`,
          reelCategory: 'my_videos',
          register: 'casual_us'
        };

        setCustomAddedShorts((prev) => [
          newShort,
          ...prev.filter((item) => item.youtubeId !== newShort.youtubeId)
        ]);
        setSourceInput('');
        setShowAddSourcePanel(false);
        setFeedMode('reels');
        setReelTopicFilter('my_videos');
        setCurrentIndex(0);
        toast.success(`Đã thêm Short "${newShort.title.slice(0, 42)}" — đang tự tải phụ đề!`);
        return;
      }

      if (data.type === 'channel' && data.channelId) {
        const already = followedChannels.some((c) => c.channelId === data.channelId);
        if (!already) {
          setFollowedChannels((prev) => [
            { channelId: data.channelId, channelName: data.channelName || data.channelId, shortsCount: data.shortsCount || 0 },
            ...prev
          ]);
        }
        setSourceInput('');
        toast.success(
          `Đã theo dõi kênh ${data.channelName || data.channelId} (${data.shortsCount || 0} Shorts dọc mới nhất)!`
        );
        setFeedMode('reels');
        setReelTopicFilter('my_videos');
      }
    } catch {
      setSourceError('Lỗi kết nối tới server khi kiểm tra link YouTube.');
    } finally {
      setIsResolvingSource(false);
    }
  }, [sourceInput, isResolvingSource, followedChannels, toast]);

  const handleRemoveFollowedChannel = useCallback((channelId: string) => {
    setFollowedChannels((prev) => prev.filter((c) => c.channelId !== channelId));
    toast.info('Đã hủy theo dõi kênh.');
  }, [toast]);

  // --- 0. Curated Vertical 9:16 + Auto-Updating RSS Shorts + Local MP4 + User Custom Videos ---
  const curatedReels: VideoLesson[] = useMemo(() => {
    const starter = [
      ...manifestReels,
      ...customAddedShorts,
      ...AMERICAN_REELS_CORPUS.map(mapCuratedReelToVideoLesson),
      ...liveRssReels
    ];
    const seen = new Set<string>();
    const deduped: VideoLesson[] = [];
    for (const reel of starter) {
      const key = reel.videoUrl ? `mp4:${reel.videoUrl}` : `yt:${reel.youtubeId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const cachedSubs = reel.subtitles.length === 0 ? dynamicSubtitlesMap[reel.youtubeId] : undefined;
      if (cachedSubs && cachedSubs.length > 0) {
        const lastEnd = cachedSubs[cachedSubs.length - 1]?.end || reel.endSeconds || 55;
        deduped.push({
          ...reel,
          subtitles: cachedSubs,
          endSeconds: Math.max(12, Math.min(90, Math.ceil(lastEnd + 1)))
        });
      } else {
        deduped.push(reel);
      }
    }
    return deduped;
  }, [manifestReels, customAddedShorts, liveRssReels, dynamicSubtitlesMap]);

  // Only auto-mine user-imported custom lessons (never pollute vertical 9:16 tabs with 16:9 MOCK_LESSONS!)
  const minedReels: VideoLesson[] = useMemo(() => {
    const customUserLessons = lessons.filter((l) => l.isCustom);
    return mineAmericanExpressionsFromLessons(customUserLessons, curatedReels, 4);
  }, [lessons, curatedReels]);

  const allReelsPool: VideoLesson[] = useMemo(() => {
    return [...curatedReels, ...minedReels];
  }, [curatedReels, minedReels]);

  const reelsCategoryCounts = useMemo(() => {
    return {
      all: allReelsPool.length,
      daily_life: allReelsPool.filter((r) => r.reelCategory === 'daily_life').length,
      work_talk: allReelsPool.filter((r) => r.reelCategory === 'work_talk').length,
      my_videos: allReelsPool.filter((r) => r.reelCategory === 'my_videos').length
    };
  }, [allReelsPool]);

  const thematicReelsFeed: VideoLesson[] = useMemo(() => {
    return buildThematicReelsFeed(curatedReels, minedReels, reelTopicFilter);
  }, [curatedReels, minedReels, reelTopicFilter]);

  // --- 1. Compute YouGlish Mined Occurrences with SRS Smart Sorter ---
  const youglishOccurrences: YouGlishOccurrence[] = useMemo(() => {
    return youglishEngine.mineYouGlishOccurrences(savedWords, lessons, {
      targetWordFilter: selectedWordFilter,
      accentFilter: accentFilter === 'GLOBAL' ? undefined : accentFilter,
      registerFilter: registerFilter === 'all' ? undefined : registerFilter
    });
  }, [savedWords, lessons, selectedWordFilter, accentFilter, registerFilter]);

  // List of words that have YouGlish video occurrences
  const availableWordsWithCount = useMemo(() => {
    const map = new Map<string, { count: number; isDue: boolean }>();
    youglishOccurrences.forEach(o => {
      if (!o || !o.targetWord) return;
      const w = o.targetWord.toLowerCase().trim();
      const existing = map.get(w);
      map.set(w, {
        count: (existing?.count || 0) + 1,
        isDue: existing?.isDue || o.isDueToday
      });
    });
    return Array.from(map.entries()).map(([word, meta]) => ({ word, ...meta }));
  }, [youglishOccurrences]);

  // --- 2. Convert Active Feed items into Uniform VideoLesson Array ---
  const activeFeed: VideoLesson[] = useMemo(() => {
    if (feedMode === 'reels') {
      return thematicReelsFeed;
    }

    if (feedMode === 'search') {
      const results = youglishEngine.searchYouGlishQuery(searchQuery, lessons);
      return results.map(occ => {
        const targetSubIdx = Array.isArray(occ.subtitles) ? occ.subtitles.findIndex(s => 
          s && (s.start === occ.start || (occ.targetWord && s.text && s.text.toLowerCase().includes(occ.targetWord.toLowerCase().trim())))
        ) : 0;
        return {
          id: occ.id,
          youtubeId: occ.vid,
          title: `🔍 YouGlish: "${occ.targetWord}" trong "${occ.sourceLessonTitle}"`,
          channel: occ.channel,
          thumbnail: occ.thumbnail,
          level: 'B1',
          topic: `Tra cứu: ${occ.targetWord}`,
          duration: `00:${Math.round(occ.clipEnd - occ.clipStart).toString().padStart(2, '0')}`,
          durationSec: Math.round(occ.clipEnd - occ.clipStart),
          views: '800K',
          description: occ.display,
          subtitles: occ.subtitles,
          quizzes: [],
          isShort: true,
          startSeconds: occ.clipStart,
          endSeconds: occ.clipEnd,
          targetWord: occ.targetWord,
          targetContext: occ.display,
          sourceLessonTitle: occ.sourceLessonTitle,
          subtitleOffset: occ.subtitleOffset,
          initialSubIndex: targetSubIdx >= 0 ? targetSubIdx : 0
        };
      });
    }

    // 'youglish' SRS review mode
    return youglishOccurrences.map(occ => {
      return {
        id: occ.id,
        youtubeId: occ.vid,
        title: occ.sourceLessonTitle ? `Trích đoạn: ${occ.sourceLessonTitle}` : 'Video trích đoạn YouGlish',
        channel: occ.channel,
        thumbnail: occ.thumbnail,
        level: 'B1',
        topic: 'Luyện phản xạ YouGlish',
        duration: `00:${Math.round(occ.clipEnd - occ.clipStart).toString().padStart(2, '0')}`,
        durationSec: Math.round(occ.clipEnd - occ.clipStart),
        views: '1.2M',
        description: occ.display,
        subtitles: occ.subtitles,
        quizzes: [],
        isShort: true,
        startSeconds: occ.clipStart,
        endSeconds: occ.clipEnd,
        targetWord: occ.targetWord,
        targetContext: occ.display,
        sourceLessonTitle: occ.sourceLessonTitle,
        subtitleOffset: occ.subtitleOffset,
        initialSubIndex: 0
      };
    });
  }, [feedMode, thematicReelsFeed, youglishOccurrences, searchQuery, lessons]);

  // Reset index when feed criteria change
  useEffect(() => {
    setCurrentIndex(0);
    const first = activeFeed[0];
    const initIdx = first?.initialSubIndex ?? 0;
    setCurrentSubIndex(initIdx);
    setIsWordRevealed(false);
    setShadowResult(null);
    setAiNuance(null);
    setAiNuanceError(null);
    setActiveMicroQuiz(null);
    setMicroQuizAnswer(null);
  }, [feedMode, reelTopicFilter, selectedWordFilter, accentFilter, registerFilter, searchQuery]);

  // Active current short
  const currentShort: VideoLesson = activeFeed[currentIndex] || activeFeed[0] || {
    id: 'placeholder',
    youtubeId: 's3bmNtkcj54',
    title: 'Khám phá video ngắn học tiếng Anh',
    channel: '4You Study',
    thumbnail: 'https://img.youtube.com/vi/s3bmNtkcj54/hqdefault.jpg',
    level: 'B1',
    topic: 'Daily Conversation',
    duration: '00:30',
    durationSec: 30,
    views: '1M',
    description: 'Chưa có video phù hợp.',
    subtitles: [
      { id: 'ph1', start: 0, end: 5, text: 'No video clips available in this category.', translation: 'Chưa có trích đoạn video nào.' }
    ],
    quizzes: []
  };

  // When active short changes, immediately position to target sentence
  useEffect(() => {
    const initIdx = currentShort.initialSubIndex ?? 0;
    setCurrentSubIndex(initIdx);
    setIsWordRevealed(false);
    setShadowResult(null);
    setAiNuance(null);
    setAiNuanceError(null);
  }, [currentShort.id]);

  // Auto-hydrate real timed subtitles + Vietnamese translations on demand for RSS / custom Shorts
  const hydrateShortCaptions = useCallback(async (videoId: string, isPrimary: boolean) => {
    if (!videoId || videoId === 'placeholder') return;
    if (dynamicSubtitlesMap[videoId]?.length) return;
    if (failedCaptionIds[videoId] || inFlightCaptionIdsRef.current.has(videoId)) return;

    inFlightCaptionIdsRef.current.add(videoId);
    if (isPrimary) setHydratingVideoId(videoId);

    try {
      const res = await fetch(`/api/youtube-captions?v=${encodeURIComponent(videoId)}`);
      if (!res.ok) {
        setFailedCaptionIds((prev) => ({ ...prev, [videoId]: true }));
        return;
      }
      const data = await res.json();
      const rawSubs: SubtitleLine[] = Array.isArray(data?.subtitles) ? data.subtitles : [];
      if (rawSubs.length === 0) {
        setFailedCaptionIds((prev) => ({ ...prev, [videoId]: true }));
        return;
      }

      // Immediately show English captions before Vietnamese translation finishes
      setDynamicSubtitlesMap((prev) => ({ ...prev, [videoId]: rawSubs }));

      // Batch-translate missing Vietnamese lines via existing /api/dict/translate-batch proxy
      const needsVi = rawSubs.some((s) => !s.translation || !s.translation.trim());
      let finalSubs = rawSubs;
      if (needsVi) {
        try {
          const translatedTexts = await batchTranslateSubtitles(rawSubs);
          finalSubs = rawSubs.map((line, idx) => ({
            ...line,
            translation: line.translation?.trim() || translatedTexts[idx] || ''
          }));
        } catch {
          // Keep English captions if batch translation temporarily fails
        }
      }

      setDynamicSubtitlesMap((prev) => {
        const next = { ...prev, [videoId]: finalSubs };
        try {
          // Keep bounded cache (latest 60 Shorts)
          const keys = Object.keys(next);
          const trimmed: Record<string, SubtitleLine[]> = {};
          keys.slice(-60).forEach((k) => {
            trimmed[k] = next[k];
          });
          localStorage.setItem('4you_shorts_captions_cache_v1', JSON.stringify(trimmed));
        } catch {
          // ignore storage quota errors
        }
        return next;
      });
    } catch {
      setFailedCaptionIds((prev) => ({ ...prev, [videoId]: true }));
    } finally {
      inFlightCaptionIdsRef.current.delete(videoId);
      setHydratingVideoId((prev) => (prev === videoId ? null : prev));
    }
  }, [dynamicSubtitlesMap, failedCaptionIds]);

  useEffect(() => {
    if (feedMode !== 'reels') return;
    if (currentShort.youtubeId && !currentShort.videoUrl && currentShort.subtitles.length === 0) {
      void hydrateShortCaptions(currentShort.youtubeId, true);
    }
    const nextShort = activeFeed[currentIndex + 1];
    if (nextShort?.youtubeId && !nextShort.videoUrl && nextShort.subtitles.length === 0) {
      void hydrateShortCaptions(nextShort.youtubeId, false);
    }
  }, [feedMode, currentShort.youtubeId, currentShort.videoUrl, currentShort.subtitles.length, activeFeed, currentIndex, hydrateShortCaptions]);

  const currentOccurrence = feedMode === 'youglish' ? youglishOccurrences[currentIndex] : null;
  const activeExpression = (currentShort.expression || currentShort.targetWord || '').trim();
  const isCurrentExpressionSaved = useMemo(() => {
    if (!activeExpression) return false;
    const normalized = activeExpression.toLowerCase();
    return savedWords.some((w) => w?.word && w.word.toLowerCase().trim() === normalized);
  }, [activeExpression, savedWords]);

  const isCurrentHydrating = hydratingVideoId === currentShort.youtubeId && currentShort.subtitles.length === 0;
  const isCurrentNoCaptions = Boolean(failedCaptionIds[currentShort.youtubeId]) && currentShort.subtitles.length === 0;
  const subtitles = currentShort?.subtitles || [];
  const currentSub = subtitles[currentSubIndex] || subtitles[0] || {
    id: 'empty',
    start: 0,
    end: 5,
    text: isCurrentHydrating
      ? 'Loading synced English captions...'
      : isCurrentNoCaptions
        ? currentShort.title || 'Listen directly to this American Short'
        : 'Enjoy this English learning Short!',
    translation: isCurrentHydrating
      ? 'Đang tự động tải phụ đề khớp giây & dịch tiếng Việt...'
      : isCurrentNoCaptions
        ? 'Video này chưa có phụ đề YouTube — bạn vẫn nghe trực tiếp hoặc lướt tiếp nhé.'
        : 'Hãy thưởng thức video ngắn học tiếng Anh này!'
  };

  // American Connected Speech Hints (0ms, receptive-first, capped at 2 chips)
  const connectedSpeechHints = useMemo(() => {
    return decodeConnectedSpeech(currentSub.text, 2);
  }, [currentSub.text]);

  // Daily Micro-Habit Progress Helper (5 real American expressions/day)
  const effectiveDailyGoal = dailyReelProgress?.dailyGoal || 5;
  const completedTodayIds = useMemo(() => {
    const today = getLocalDateKey();
    if (dailyReelProgress && dailyReelProgress.date === today) {
      return dailyReelProgress.completedReelIds;
    }
    return [];
  }, [dailyReelProgress]);

  const markReelCompleted = useCallback((reelId: string) => {
    if (!reelId || reelId === 'placeholder' || !onDailyReelProgressChange) return;
    const today = getLocalDateKey();
    const currentList = dailyReelProgress && dailyReelProgress.date === today
      ? dailyReelProgress.completedReelIds
      : [];
    if (currentList.includes(reelId)) return;

    const nextIds = [...currentList, reelId];
    const goal = dailyReelProgress?.dailyGoal || 5;
    onDailyReelProgressChange({
      date: today,
      completedReelIds: nextIds,
      dailyGoal: goal
    });

    if (nextIds.length === goal) {
      confetti({ particleCount: 70, spread: 75, origin: { y: 0.55 } });
      toast.success(`🔥 Đạt mục tiêu ${goal}/${goal} cụm tiếng Mỹ hôm nay! Đỉnh cao!`);
    }
  }, [dailyReelProgress, onDailyReelProgressChange, toast]);

  // Mark reel as absorbed after 3 seconds of active viewing
  useEffect(() => {
    if (!isActive || feedMode !== 'reels' || !currentShort?.id || currentShort.id === 'placeholder') {
      return;
    }
    const timer = setTimeout(() => {
      markReelCompleted(currentShort.id);
      const alreadyTracked = watchedReelsRef.current.some((r) => r.id === currentShort.id);
      if (!alreadyTracked) {
        watchedReelsRef.current = [...watchedReelsRef.current.slice(-8), currentShort];
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isActive, feedMode, currentShort, markReelCompleted]);

  // SRS Rating for Revealed Flashcards — wired directly to FSRS-6 via App.tsx
  const handleRateCard = async (rating: AnkiRating) => {
    const targetW = activeExpression.toLowerCase();
    const matchingWord = targetW ? savedWords.find(w => w?.word && w.word.toLowerCase().trim() === targetW) : null;
    if (matchingWord) {
      if (onReviewWord) {
        onReviewWord(matchingWord.id, rating);
      } else {
        await speechScoringService.recordShadowingResult(matchingWord, rating, activeProfileId);
      }
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
    }
    setTimeout(() => {
      handleNext();
    }, 350);
  };

  // 1-Tap Save Expression directly to FSRS-6 with exact video timestamp
  const handleSaveCurrentExpression = useCallback(() => {
    if (!activeExpression) return;
    const contextSentence = currentSub.text || currentShort.targetContext || '';
    const meaningVi = currentShort.expressionMeaningVi || currentSub.translation || '';
    if (onSaveReelExpression) {
      onSaveReelExpression({
        expression: activeExpression,
        meaningVi,
        contextSentence,
        usageNote: currentShort.americanUsageNote || currentShort.description,
        videoTitle: currentShort.sourceLessonTitle || currentShort.title,
        sourceYoutubeId: currentShort.youtubeId,
        sourceTimestampSec: Math.max(0, Math.floor(currentSub.start ?? currentShort.startSeconds ?? 0))
      });
      setBookmarked(true);
      markReelCompleted(currentShort.id);
    } else {
      onSelectWord(activeExpression, contextSentence);
    }
  }, [activeExpression, currentSub, currentShort, onSaveReelExpression, onSelectWord, markReelCompleted]);

  // 1-Click AI American Nuance Decoder (reuses POST /api/ai/explain)
  const handleAskAiNuance = async () => {
    if (!activeExpression) return;
    if (!currentUser) {
      onOpenAuth?.();
      return;
    }
    setIsLoadingAiNuance(true);
    setAiNuanceError(null);
    try {
      const result = await explainInContext({
        phrase: activeExpression,
        sentence: currentSub.text || currentShort.targetContext || activeExpression,
        videoTitle: currentShort.sourceLessonTitle || currentShort.title,
        token: authService.getToken()
      });
      setAiNuance(result);
    } catch (err) {
      setAiNuanceError(err instanceof Error ? err.message : 'Không thể tải giải mã AI lúc này.');
    } finally {
      setIsLoadingAiNuance(false);
    }
  };

  // Playback speed quick switcher (0.75x / 1.0x / 1.25x) — supports both HTML5 <video> & YouTube Pool
  const handleChangePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (nativeVideoRef.current && currentShort.videoUrl) {
      nativeVideoRef.current.playbackRate = rate;
      return;
    }
    if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
      try {
        playerRef.current.setPlaybackRate(rate);
      } catch {}
    }
  };

  // Subtitle offset sync
  useEffect(() => {
    setSubOffset(currentShort.subtitleOffset || 0);
  }, [currentShort.id, currentShort.subtitleOffset]);

  const handleAdjustOffset = (deltaOrExact: number, isExact: boolean = false) => {
    const nextOffset = isExact ? deltaOrExact : Number((subOffset + deltaOrExact).toFixed(2));
    setSubOffset(nextOffset);
    currentShort.subtitleOffset = nextOffset;
    shortsFeedService.setShortOffset(currentShort.id, nextOffset);
  };

  // Reset drill count & shadowing on video or subtitle change
  useEffect(() => {
    drillRepeatCountRef.current = 1;
    setDrillRepeatCount(1);
    setIsWordRevealed(false);
    setShadowResult(null);
  }, [currentSubIndex, currentIndex]);

  const activeSlotId: PoolSlotId = getPoolSlotForIndex(currentIndex);

  const clearLoadingOverlay = useCallback(() => {
    if (loadingDelayTimerRef.current) {
      clearTimeout(loadingDelayTimerRef.current);
      loadingDelayTimerRef.current = null;
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    if (isMountedRef.current) {
      setIsVideoLoading(false);
    }
  }, []);

  const showLoadingWithDelay = useCallback(() => {
    if (loadingDelayTimerRef.current) clearTimeout(loadingDelayTimerRef.current);
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

    // Avoid spinner flash for fast transitions (< 320ms)
    loadingDelayTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsVideoLoading(true);
      }
    }, 320);

    // Safety watchdog so loading overlay never stalls
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsVideoLoading(false);
      }
    }, 2200);
  }, []);

  // --- 3. Dual Player Engine: Native HTML5 <video> MP4 (0ms) OR 3-Slot YouTube Pool ([N-1, N, N+1]) ---
  useEffect(() => {
    userPausedRef.current = false;

    if (currentShort.videoUrl) {
      // Pause all pooled YouTube players while Native HTML5 MP4 plays
      ([0, 1, 2] as PoolSlotId[]).forEach((sid) => {
        try {
          poolPlayersRef.current[sid]?.mute?.();
          poolPlayersRef.current[sid]?.pauseVideo?.();
        } catch {}
      });
      clearLoadingOverlay();
      setPlayerError(null);

      const vid = nativeVideoRef.current;
      if (vid) {
        vid.muted = isGlobalMutedRef.current;
        vid.playbackRate = playbackRateRef.current;
        vid.currentTime = currentShort.startSeconds || 0;
        if (isActiveRef.current) {
          vid.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
        } else {
          vid.pause();
          setIsPlaying(false);
        }
      }
      return;
    }

    if (useDirectIframe) {
      clearLoadingOverlay();
      setPlayerError(null);
      return;
    }

    const effectiveFeed = activeFeed.length > 0 ? activeFeed : [currentShort];
    const safeIndex = Math.min(currentIndex, effectiveFeed.length - 1);
    const assignments = computePoolAssignments(safeIndex, effectiveFeed);
    const targetActiveSlot = getPoolSlotForIndex(safeIndex);
    const activeAssignment = assignments[targetActiveSlot];
    const activeClip = activeAssignment.clip;
    if (!activeClip) return;

    activeSlotRef.current = targetActiveSlot;
    activeClipStartRef.current = activeClip.startSeconds;

    if (prewarmTimerRef.current) {
      clearTimeout(prewarmTimerRef.current);
      prewarmTimerRef.current = null;
    }

    const instantiateSlotPlayer = (
      slotId: PoolSlotId,
      clip: { clipId: string; youtubeId: string; startSeconds: number },
      isPrimarySlot: boolean
    ) => {
      if (!isMountedRef.current || !window.YT?.Player) return;
      const container = poolContainersRef.current[slotId];
      if (!container) return;

      const mountNodeId = `yt-shorts-pool-slot-${slotId}`;
      container.innerHTML = `<div id="${mountNodeId}" class="w-full h-full pointer-events-none scale-[1.35] origin-center"></div>`;

      poolRuntimesRef.current[slotId] = {
        clipId: clip.clipId,
        youtubeId: clip.youtubeId,
        startSeconds: clip.startSeconds,
        isReady: false,
        isPrewarmed: false
      };

      try {
        const ytPlayer = new window.YT.Player(mountNodeId, {
          videoId: clip.youtubeId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            mute: isPrimarySlot && isActiveRef.current && !isGlobalMutedRef.current ? 0 : 1,
            start: Math.floor(clip.startSeconds),
            enablejsapi: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              if (!isMountedRef.current) return;
              const p = event.target;
              poolPlayersRef.current[slotId] = p;
              const rt = poolRuntimesRef.current[slotId];
              rt.isReady = true;

              const isCurrentlyActive = activeSlotRef.current === slotId;
              if (isCurrentlyActive) {
                playerRef.current = p;
                if (isGlobalMutedRef.current || !isActiveRef.current) {
                  p.mute?.();
                } else {
                  p.unMute?.();
                }
                p.setPlaybackRate?.(playbackRateRef.current);
                if (rt.startSeconds > 0) {
                  p.seekTo?.(rt.startSeconds, true);
                }
                if (isActiveRef.current) {
                  p.playVideo?.();
                  setIsPlaying(true);
                } else {
                  p.pauseVideo?.();
                  setIsPlaying(false);
                }
                setPlayerError(null);
                clearLoadingOverlay();
              } else {
                // Silent first-frame pre-buffer for background slot (N+1)
                p.mute?.();
                if (rt.startSeconds > 0) {
                  p.seekTo?.(rt.startSeconds, true);
                }
                p.playVideo?.();
              }
            },
            onStateChange: (event: any) => {
              if (!isMountedRef.current) return;
              const p = event.target;
              const rt = poolRuntimesRef.current[slotId];
              const isCurrentlyActive = activeSlotRef.current === slotId;

              // Background slot (N+1 / N-1): freeze immediately after buffering first frame!
              if (!isCurrentlyActive) {
                if (event.data === 1) {
                  p.mute?.();
                  p.pauseVideo?.();
                  if (rt.startSeconds > 0) {
                    p.seekTo?.(rt.startSeconds, true);
                  }
                  rt.isPrewarmed = true;
                }
                return;
              }

              // Active slot: always clear loading overlay immediately on active playback/cue
              if (event.data === 1 || event.data === 2 || event.data === 5) {
                clearLoadingOverlay();
                setPlayerError(null);
              }

              if (event.data === 1) {
                rt.isPrewarmed = true;
                setIsPlaying(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                setCurrentSubIndex(0);
                drillRepeatCountRef.current = 1;
                setDrillRepeatCount(1);
                p.seekTo?.(activeClipStartRef.current, true);
                p.playVideo?.();
              }
            },
            onError: (event: any) => {
              if (!isMountedRef.current) return;
              if (activeSlotRef.current !== slotId) return;
              console.warn('[ShortsView] YouTube player error:', event.data);
              const parsed = parseYouTubePlayerError(event.data);
              setPlayerError(parsed);
              clearLoadingOverlay();
            }
          }
        });
        poolPlayersRef.current[slotId] = ytPlayer;
        if (isPrimarySlot) {
          playerRef.current = ytPlayer;
        }
      } catch (err) {
        console.warn(`[ShortsView] Failed to instantiate YT.Player for slot ${slotId}:`, err);
        if (isPrimarySlot) clearLoadingOverlay();
      }
    };

    const syncPool = () => {
      if (!isMountedRef.current || !window.YT?.Player) return;

      // 1. Instantly mute & pause all non-active slots so only the active video has sound
      ([0, 1, 2] as PoolSlotId[]).forEach((sid) => {
        if (sid === targetActiveSlot) return;
        const p = poolPlayersRef.current[sid];
        if (p) {
          try {
            p.mute?.();
            p.pauseVideo?.();
          } catch {
            // ignore
          }
        }
      });

      // 2. Activate target slot (0ms if prewarmed, ~50ms if same-video seek, cold load otherwise)
      const activePlayer = poolPlayersRef.current[targetActiveSlot];
      const activeRuntime = poolRuntimesRef.current[targetActiveSlot];
      setPlayerError(null);

      if (activePlayer && activeRuntime.isReady && typeof activePlayer.playVideo === 'function') {
        playerRef.current = activePlayer;
        const action = planSlotAction(activeRuntime, activeClip);

        if (isGlobalMutedRef.current || !isActiveRef.current) {
          activePlayer.mute?.();
        } else {
          activePlayer.unMute?.();
        }
        activePlayer.setPlaybackRate?.(playbackRateRef.current);

        if (action === 'noop-ready') {
          clearLoadingOverlay();
          if (isActiveRef.current) {
            activePlayer.playVideo?.();
            setIsPlaying(true);
          } else {
            activePlayer.pauseVideo?.();
            setIsPlaying(false);
          }
        } else if (action === 'reuse-seek') {
          clearLoadingOverlay();
          activeRuntime.clipId = activeClip.clipId;
          activeRuntime.startSeconds = activeClip.startSeconds;
          activePlayer.seekTo?.(activeClip.startSeconds, true);
          if (isActiveRef.current) {
            activePlayer.playVideo?.();
            setIsPlaying(true);
          } else {
            activePlayer.pauseVideo?.();
            setIsPlaying(false);
          }
        } else {
          showLoadingWithDelay();
          activeRuntime.clipId = activeClip.clipId;
          activeRuntime.youtubeId = activeClip.youtubeId;
          activeRuntime.startSeconds = activeClip.startSeconds;
          activeRuntime.isPrewarmed = false;
          activePlayer.loadVideoById?.({
            videoId: activeClip.youtubeId,
            startSeconds: activeClip.startSeconds
          });
          if (isActiveRef.current) {
            activePlayer.playVideo?.();
            setIsPlaying(true);
          } else {
            activePlayer.pauseVideo?.();
            setIsPlaying(false);
          }
        }
        setCurrentSubIndex(0);
        drillRepeatCountRef.current = 1;
        setDrillRepeatCount(1);
      } else {
        showLoadingWithDelay();
        instantiateSlotPlayer(targetActiveSlot, activeClip, true);
      }

      // 3. Stagger silent first-frame pre-buffering of NEXT video (N+1) by 180ms
      const nextSlotEntry = ([0, 1, 2] as PoolSlotId[])
        .map((sid) => assignments[sid])
        .find((a) => a.role === 'next' && a.clip);

      if (nextSlotEntry?.clip) {
        const nextSlotId = nextSlotEntry.slotId;
        const nextClip = nextSlotEntry.clip;
        prewarmTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current || activeSlotRef.current === nextSlotId) return;
          const nextPlayer = poolPlayersRef.current[nextSlotId];
          const nextRuntime = poolRuntimesRef.current[nextSlotId];

          if (nextPlayer && nextRuntime.isReady && typeof nextPlayer.loadVideoById === 'function') {
            const action = planSlotAction(nextRuntime, nextClip);
            if (action === 'noop-ready') return;

            nextPlayer.mute?.();
            nextRuntime.clipId = nextClip.clipId;
            nextRuntime.youtubeId = nextClip.youtubeId;
            nextRuntime.startSeconds = nextClip.startSeconds;

            if (action === 'reuse-seek') {
              nextPlayer.seekTo?.(nextClip.startSeconds, true);
              nextPlayer.pauseVideo?.();
              nextRuntime.isPrewarmed = true;
            } else {
              nextRuntime.isPrewarmed = false;
              nextPlayer.loadVideoById?.({
                videoId: nextClip.youtubeId,
                startSeconds: nextClip.startSeconds
              });
            }
          } else if (!nextPlayer) {
            instantiateSlotPlayer(nextSlotId, nextClip, false);
          }
        }, 180);
      }
    };

    loadYouTubeIframeAPI(3500)
      .then(() => {
        if (!isMountedRef.current) return;
        syncPool();
      })
      .catch((err) => {
        if (!isMountedRef.current) return;
        console.warn('[ShortsView] YouTube API load failed, switching to direct embed:', err);
        setUseDirectIframe(true);
        clearLoadingOverlay();
      });

    return () => {
      if (prewarmTimerRef.current) {
        clearTimeout(prewarmTimerRef.current);
        prewarmTimerRef.current = null;
      }
    };
  }, [currentIndex, currentShort.youtubeId, currentShort.startSeconds, activeFeed, useDirectIframe, clearLoadingOverlay, showLoadingWithDelay]);

  // Handle tab active state changes (Background pre-warm vs Active user viewing)
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isActive) {
      if (!isGlobalMuted && typeof player.unMute === 'function') {
        player.unMute();
      }
      if (typeof player.playVideo === 'function') {
        player.playVideo();
        setIsPlaying(true);
      }
    } else {
      if (typeof player.pauseVideo === 'function') {
        player.pauseVideo();
        setIsPlaying(false);
      }
    }
  }, [isActive, isGlobalMuted]);

  // Pre-load next short thumbnail into browser cache for instantaneous transitions
  useEffect(() => {
    const nextShort = activeFeed[currentIndex + 1];
    if (nextShort?.thumbnail) {
      const img = new Image();
      img.src = nextShort.thumbnail;
    }
  }, [currentIndex, activeFeed]);

  // --- 4. Real-time 40ms sync loop (Native HTML5 <video> + YouTube Pool; respects user pause!) ---
  useEffect(() => {
    const timer = setInterval(() => {
      if (isSeekingRef.current || userPausedRef.current) return;

      const isNative = Boolean(currentShort.videoUrl);
      const nativeVid = nativeVideoRef.current;
      const ytPlayer = playerRef.current;

      let rawTime: number | null = null;
      if (isNative) {
        if (!nativeVid || nativeVid.paused) return;
        rawTime = nativeVid.currentTime;
      } else {
        if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
        // Skip loop/seek if YouTube player is paused (state === 2)
        if (typeof ytPlayer.getPlayerState === 'function' && ytPlayer.getPlayerState() === 2) return;
        rawTime = ytPlayer.getCurrentTime();
      }

      if (typeof rawTime !== 'number' || Number.isNaN(rawTime)) return;

      try {
        setCurrentTime(rawTime);

        const clipStart = currentShort.startSeconds || 0;
        const clipEnd = currentShort.endSeconds;

        const seekActivePlayer = (targetSec: number) => {
          if (isNative && nativeVid) {
            nativeVid.currentTime = targetSec;
          } else if (ytPlayer && typeof ytPlayer.seekTo === 'function') {
            ytPlayer.seekTo(targetSec, true);
          }
        };

        // Auto-loop for sliced clips
        if (clipEnd && clipEnd > clipStart && rawTime >= clipEnd - 0.08) {
          seekActivePlayer(clipStart);
          setCurrentSubIndex(0);
          drillRepeatCountRef.current = 1;
          setDrillRepeatCount(1);
          return;
        }

        const cues = currentShort?.subtitles || [];
        if (cues.length === 0) return;

        const effectiveTime = rawTime + subOffset + 0.04;

        // Normalization for relative vs absolute cues
        const hasStartOffset = clipStart > 2;
        const isRelativeCues = hasStartOffset && cues[0].start < clipStart - 1.5;
        const lookupTime = isRelativeCues ? (effectiveTime - clipStart) : effectiveTime;

        // Active cue checking
        const active = cues[currentSubIndex];

        // Cake Drill-Mode logic: loop current sentence 3 times
        if (isDrillMode && active && lookupTime >= active.end - 0.08) {
          if (drillRepeatCountRef.current < 3) {
            drillRepeatCountRef.current += 1;
            setDrillRepeatCount(drillRepeatCountRef.current);
            isSeekingRef.current = true;
            const targetSeek = isRelativeCues ? (active.start + clipStart) : active.start;
            seekActivePlayer(targetSeek);
            setTimeout(() => {
              isSeekingRef.current = false;
            }, 250);
            return;
          } else {
            drillRepeatCountRef.current = 1;
            setDrillRepeatCount(1);
          }
        }

        if (active && lookupTime >= active.start && lookupTime <= active.end) {
          return;
        }

        // Fast search matching cue
        let matched = -1;
        for (let i = 0; i < cues.length; i++) {
          if (lookupTime >= cues[i].start && lookupTime <= cues[i].end) {
            matched = i;
            break;
          }
        }

        if (matched !== -1) {
          setCurrentSubIndex(matched);
        } else {
          for (let i = 0; i < cues.length - 1; i++) {
            if (lookupTime > cues[i].end && lookupTime < cues[i + 1].start) {
              setCurrentSubIndex(i);
              break;
            }
          }
        }
      } catch (err) {
        // Safe ignore during seek transitions
      }
    }, 40);

    return () => clearInterval(timer);
  }, [currentShort, currentSubIndex, isDrillMode, subOffset]);

  // Cleanup all 3 pooled players & timers on component unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      if (holdSpeedTimerRef.current) clearTimeout(holdSpeedTimerRef.current);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      if (loadingDelayTimerRef.current) clearTimeout(loadingDelayTimerRef.current);
      if (prewarmTimerRef.current) clearTimeout(prewarmTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      ([0, 1, 2] as PoolSlotId[]).forEach((sid) => {
        try {
          const p = poolPlayersRef.current[sid];
          if (p && typeof p.destroy === 'function') {
            p.destroy();
          }
        } catch (e) {}
        poolPlayersRef.current[sid] = null;
      });
    };
  }, []);

  // --- 5. TikTok Instant Gesture & Swipe Mechanics (No Forced Loading Flash + 3s Interpolated Micro-Quiz) ---
  const advanceToNextReel = useCallback(() => {
    if (currentIndex < activeFeed.length - 1) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }
      setIsShadowing(false);
      setSwipeAnimation('slide-up');
      setPlayerError(null);
      setActiveMicroQuiz(null);
      setMicroQuizAnswer(null);

      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setCurrentSubIndex(0);
        setBookmarked(false);
        setIsWordRevealed(false);
        setShadowResult(null);
        setSwipeAnimation(null);
      }, 65);
    }
  }, [currentIndex, activeFeed.length]);

  const handleNext = useCallback(() => {
    if (currentIndex >= activeFeed.length - 1) return;

    // Trigger 3-Second Interpolated Micro-Quiz every 4 clips in 'reels' mode (non-blocking — skip anytime)
    if (feedMode === 'reels' && !activeMicroQuiz) {
      if (currentShort?.id && currentShort.id !== 'placeholder') {
        const exists = watchedReelsRef.current.some((r) => r.id === currentShort.id);
        if (!exists) {
          watchedReelsRef.current = [...watchedReelsRef.current.slice(-8), currentShort];
        }
      }
      swipesSinceQuizRef.current += 1;
      if (swipesSinceQuizRef.current >= 4 && watchedReelsRef.current.length >= 2) {
        const quiz = buildMicroQuizForReels(watchedReelsRef.current, allReelsPool);
        if (quiz) {
          swipesSinceQuizRef.current = 0;
          setActiveMicroQuiz(quiz);
          setMicroQuizAnswer(null);
          if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
            try { playerRef.current.pauseVideo(); } catch {}
          }
          setIsPlaying(false);
          return;
        }
      }
    }

    advanceToNextReel();
  }, [currentIndex, activeFeed.length, feedMode, activeMicroQuiz, currentShort, allReelsPool, advanceToNextReel]);

  const handleAnswerMicroQuiz = (optionIdx: number) => {
    if (!activeMicroQuiz || microQuizAnswer !== null) return;
    setMicroQuizAnswer(optionIdx);
    if (optionIdx === activeMicroQuiz.correctIndex) {
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.6 } });
    }
  };

  const handleDismissMicroQuiz = () => {
    setActiveMicroQuiz(null);
    setMicroQuizAnswer(null);
    advanceToNextReel();
  };

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }
      setIsShadowing(false);
      setSwipeAnimation('slide-down');
      setPlayerError(null);
      setActiveMicroQuiz(null);
      setMicroQuizAnswer(null);

      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setCurrentSubIndex(0);
        setBookmarked(false);
        setIsWordRevealed(false);
        setShadowResult(null);
        setSwipeAnimation(null);
      }, 65);
    }
  }, [currentIndex]);

  // Desktop Mouse Wheel / Trackpad Flick Swiping (like TikTok Web)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 450) return; // 450ms cooldown
    if (e.deltaY > 30) {
      lastWheelTimeRef.current = now;
      handleNext();
    } else if (e.deltaY < -30) {
      lastWheelTimeRef.current = now;
      handlePrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;
      if (e.key === 'ArrowUp' || e.key === 'k') handlePrev();
      else if (e.key === 'ArrowDown' || e.key === 'j') handleNext();
      else if (e.key === ' ') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'm') toggleMute();
      else if (e.key === 'r') replayCurrentSubtitle();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  const togglePlayPause = useCallback(() => {
    const currentlyPlaying = isPlayingRef.current;

    if (currentShort.videoUrl && nativeVideoRef.current) {
      if (currentlyPlaying) {
        userPausedRef.current = true;
        nativeVideoRef.current.pause();
        isPlayingRef.current = false;
        setIsPlaying(false);
      } else {
        userPausedRef.current = false;
        nativeVideoRef.current.play().catch(() => {});
        isPlayingRef.current = true;
        setIsPlaying(true);
      }
      return;
    }

    const ytPlayer = playerRef.current;
    if (!ytPlayer) return;
    if (currentlyPlaying) {
      userPausedRef.current = true;
      ytPlayer.pauseVideo?.();
      isPlayingRef.current = false;
      setIsPlaying(false);
    } else {
      userPausedRef.current = false;
      ytPlayer.playVideo?.();
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
  }, [currentShort.videoUrl]);

  // Global Mute Toggle (Persistent across all shorts — supports HTML5 <video> & YouTube)
  const toggleMute = useCallback(() => {
    const nextMuted = !isGlobalMutedRef.current;
    isGlobalMutedRef.current = nextMuted;
    setIsGlobalMuted(nextMuted);
    localStorage.setItem('4you_shorts_muted', String(nextMuted));

    if (nativeVideoRef.current) {
      nativeVideoRef.current.muted = nextMuted;
    }
    if (playerRef.current) {
      if (nextMuted) {
        playerRef.current.mute?.();
      } else {
        playerRef.current.unMute?.();
      }
    }
  }, []);

  // TikTok Double-Tap to Like with Particle Physics + First-Tap Auto-Unmute (PLOS ONE 2024)
  const handleCardTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const newParticle: HeartParticle = {
        id: Date.now(),
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      setHeartParticles(prev => [...prev, newParticle]);
      setTimeout(() => {
        setHeartParticles(prev => prev.filter(p => p.id !== newParticle.id));
      }, 700);
    } else {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = setTimeout(() => {
        if (isGlobalMutedRef.current) {
          toggleMute();
        } else {
          togglePlayPause();
        }
        tapTimeoutRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
    lastTapTimeRef.current = now;
  };

  // Long-Press for 2.0x Speed
  const handleTouchHoldStart = () => {
    if (holdSpeedTimerRef.current) clearTimeout(holdSpeedTimerRef.current);
    holdSpeedTimerRef.current = setTimeout(() => {
      setIsHoldSpeeding(true);
      if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
        playerRef.current.setPlaybackRate(2.0);
      }
    }, 400);
  };

  const handleTouchHoldEnd = () => {
    if (holdSpeedTimerRef.current) clearTimeout(holdSpeedTimerRef.current);
    if (isHoldSpeeding) {
      setIsHoldSpeeding(false);
      if (playerRef.current && typeof playerRef.current.setPlaybackRate === 'function') {
        playerRef.current.setPlaybackRate(playbackRate);
      }
    }
  };

  // 1-Tap Shadowing (Speech Recognition & Anki SRS Loop)
  const handleStartShadowing = () => {
    if (!speechScoringService.isSupported()) {
      toast.info('Trình duyệt của bạn chưa hỗ trợ Web Speech API. Vui lòng dùng Chrome, Edge hoặc Safari.');
      return;
    }

    if (isShadowing) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsShadowing(false);
      return;
    }

    userPausedRef.current = true;
    if (nativeVideoRef.current) nativeVideoRef.current.pause();
    if (playerRef.current) playerRef.current.pauseVideo?.();
    isPlayingRef.current = false;
    setIsPlaying(false);
    setIsShadowing(true);
    setShadowResult(null);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = currentOccurrence?.zone === 'UK' ? 'en-GB' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      const score = speechScoringService.scoreSpeech(transcript, currentSub.text, currentShort.targetWord);
      setShadowResult(score);
      setIsShadowing(false);

      if (score.accuracy >= 75) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        markReelCompleted(currentShort.id);
        const targetW = activeExpression.toLowerCase();
        const matchingWord = targetW ? savedWords.find(w => w?.word && w.word.toLowerCase().trim() === targetW) : null;
        if (matchingWord) {
          if (onReviewWord) {
            onReviewWord(matchingWord.id, score.ankiRating);
          } else {
            await speechScoringService.recordShadowingResult(matchingWord, score.ankiRating, activeProfileId);
          }
        }
      }
    };

    recognition.onerror = () => {
      setIsShadowing(false);
    };

    recognition.onend = () => {
      setIsShadowing(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const seekToSubtitle = useCallback((index: number) => {
    if (!subtitles[index]) return;
    isSeekingRef.current = true;
    setCurrentSubIndex(index);
    drillRepeatCountRef.current = 1;
    setDrillRepeatCount(1);

    const clipStart = currentShort.startSeconds || 0;
    const hasStartOffset = clipStart > 2;
    const isRelativeCues = hasStartOffset && subtitles[0].start < clipStart - 1.5;
    const targetSeek = isRelativeCues ? (subtitles[index].start + clipStart) : subtitles[index].start;

    userPausedRef.current = false;
    if (currentShort.videoUrl && nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = targetSeek;
      nativeVideoRef.current.play().catch(() => {});
      isPlayingRef.current = true;
      setIsPlaying(true);
    } else if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(targetSeek, true);
      playerRef.current.playVideo();
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 350);
  }, [subtitles, currentShort.startSeconds, currentShort.videoUrl]);

  const replayCurrentSubtitle = useCallback(() => {
    if (!currentSub) return;
    isSeekingRef.current = true;
    userPausedRef.current = false;
    drillRepeatCountRef.current = 1;
    setDrillRepeatCount(1);

    const clipStart = currentShort.startSeconds || 0;
    const hasStartOffset = clipStart > 2;
    const isRelativeCues = hasStartOffset && subtitles[0]?.start < clipStart - 1.5;
    const targetSeek = isRelativeCues ? (currentSub.start + clipStart) : currentSub.start;

    if (currentShort.videoUrl && nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = targetSeek;
      nativeVideoRef.current.play().catch(() => {});
      isPlayingRef.current = true;
      setIsPlaying(true);
    } else if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(targetSeek, true);
      playerRef.current.playVideo();
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 350);
  }, [currentSub, currentShort.startSeconds, currentShort.videoUrl, subtitles]);

  // Tokenize subtitle and render smooth natural text (no cluttered per-word boxes)
  const renderWords = (text: string, surface: 'video' | 'light' = 'video') => {
    const tokens = tokenizeText(text);
    const targetPhrase = activeExpression.toLowerCase();
    const shouldMask = !isWordRevealed && (isBlindMode || feedMode === 'youglish');

    // Compute highlighted character span for multi-word expressions (e.g., "figure it out", "sounds good")
    let phraseStart = -1;
    let phraseEnd = -1;
    if (targetPhrase && targetPhrase.includes(' ')) {
      const escaped = targetPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      const match = regex.exec(text);
      if (match && match.index !== undefined) {
        phraseStart = match.index;
        phraseEnd = match.index + match[0].length;
      }
    }

    let cursor = 0;
    let maskedPhraseEmitted = false;

    const maskButtonClass =
      surface === 'video'
        ? 'cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-sm mx-0.5 align-baseline'
        : 'cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-xs mx-0.5 align-baseline';

    const targetHighlightClass =
      surface === 'video'
        ? 'cursor-pointer bg-amber-400 text-slate-950 font-black rounded-md px-1.5 py-0.5 shadow-sm'
        : 'cursor-pointer bg-amber-100 text-amber-900 font-black rounded-md px-1.5 py-0.5 border border-amber-300/80';

    const normalWordClass =
      surface === 'video'
        ? 'cursor-pointer hover:text-teal-300 hover:underline decoration-teal-400/80 underline-offset-4 transition-colors'
        : 'cursor-pointer hover:text-teal-700 hover:bg-teal-50 rounded px-0.5 transition-colors';

    return tokens.map((token, i) => {
      const tokenStart = cursor;
      const tokenEnd = cursor + token.text.length;
      cursor = tokenEnd;

      const isInsideMultiWordPhrase =
        phraseStart >= 0 && tokenStart >= phraseStart && tokenEnd <= phraseEnd;

      if (isInsideMultiWordPhrase && shouldMask) {
        if (maskedPhraseEmitted) return null;
        maskedPhraseEmitted = true;
        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setIsWordRevealed(true);
            }}
            className={maskButtonClass}
            title="Đang chế độ nghe mù — Nhấn để mở cụm từ"
          >
            <Eye className="w-3 h-3" /> Nghe & Đoán
          </button>
        );
      }

      if (!token.isWord) {
        if (isInsideMultiWordPhrase) {
          return (
            <span
              key={i}
              className={
                surface === 'video'
                  ? 'bg-amber-400 text-slate-950 font-black py-0.5'
                  : 'bg-amber-100 text-amber-900 font-black py-0.5'
              }
            >
              {token.text}
            </span>
          );
        }
        return <span key={i}>{token.text}</span>;
      }

      const isSingleTarget =
        Boolean(targetPhrase) &&
        !targetPhrase.includes(' ') &&
        (token.lookupWord?.toLowerCase() === targetPhrase ||
          token.text?.toLowerCase().replace(/[^a-z]/g, '') === targetPhrase);

      const isTarget = isInsideMultiWordPhrase || isSingleTarget;

      if (isTarget && shouldMask) {
        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setIsWordRevealed(true);
            }}
            className={maskButtonClass}
            title="Đang chế độ nghe mù — Nhấn để mở từ khóa"
          >
            <Eye className="w-3 h-3" /> Nghe & Đoán
          </button>
        );
      }

      if (isTarget) {
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onSelectWord(isInsideMultiWordPhrase ? activeExpression : (token.lookupWord || token.text), text);
            }}
            className={targetHighlightClass}
            title={`Cụm tiếng Mỹ mục tiêu: "${isInsideMultiWordPhrase ? activeExpression : token.text}" — Nhấn để tra chi tiết`}
          >
            {token.text}
          </span>
        );
      }

      return (
        <span
          key={i}
          onClick={(e) => {
            e.stopPropagation();
            onSelectWord(token.lookupWord || token.text, text);
          }}
          className={normalWordClass}
          title="Nhấn để tra từ & lưu vào FSRS-6"
        >
          {token.text}
        </span>
      );
    });
  };

  const clipStart = currentShort.startSeconds || 0;
  const hasStartOffset = clipStart > 2;
  const isRelativeCues = hasStartOffset && subtitles[0]?.start < clipStart - 1.5;
  const cueStartNormalized = isRelativeCues ? (currentSub.start + clipStart) : currentSub.start;
  const cueEndNormalized = isRelativeCues ? (currentSub.end + clipStart) : currentSub.end;
  const cueDuration = Math.max(0.1, cueEndNormalized - cueStartNormalized);
  const cueProgress = Math.min(100, Math.max(0, ((currentTime - cueStartNormalized) / cueDuration) * 100));

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-2 font-['Plus_Jakarta_Sans',sans-serif] space-y-3.5">
      {/* REGION 1: Single Slim Unified Bar (Replaces 2 stacked bars & duplicate buttons) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl px-2.5 py-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {([
            { mode: 'reels' as ShortsFeedMode, filter: 'all' as ReelTopicFilter, label: 'Tất cả', count: reelsCategoryCounts.all },
            { mode: 'reels' as ShortsFeedMode, filter: 'daily_life' as ReelTopicFilter, label: '☕ Đời sống Mỹ', count: reelsCategoryCounts.daily_life },
            { mode: 'reels' as ShortsFeedMode, filter: 'work_talk' as ReelTopicFilter, label: '💼 Công sở', count: reelsCategoryCounts.work_talk },
            { mode: 'reels' as ShortsFeedMode, filter: 'my_videos' as ReelTopicFilter, label: '🎬 Của tôi', count: reelsCategoryCounts.my_videos }
          ]).map((tab) => {
            const isTabActive = feedMode === 'reels' && reelTopicFilter === tab.filter;
            return (
              <button
                key={tab.filter}
                type="button"
                onClick={() => {
                  setFeedMode(tab.mode);
                  setReelTopicFilter(tab.filter);
                  setShowSearchBar(false);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isTabActive
                    ? 'bg-teal-600 text-white shadow-xs font-black'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  isTabActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => {
              setFeedMode('youglish');
              setShowSearchBar(false);
            }}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              feedMode === 'youglish'
                ? 'bg-teal-600 text-white shadow-xs font-black'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Ôn SRS</span>
            {youglishOccurrences.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                feedMode === 'youglish' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {youglishOccurrences.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
              completedTodayIds.length >= effectiveDailyGoal
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
            title="Mục tiêu micro-habit mỗi ngày: 5 cụm tiếng Mỹ thực tế"
          >
            <Flame className={`w-3.5 h-3.5 ${completedTodayIds.length >= effectiveDailyGoal ? 'text-emerald-600' : 'text-amber-500'}`} />
            <span>{Math.min(completedTodayIds.length, effectiveDailyGoal)}/{effectiveDailyGoal}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddSourcePanel((prev) => !prev);
              setSourceError(null);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              showAddSourcePanel
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border-teal-200'
            }`}
            title="Dán link YouTube Short hoặc theo dõi kênh YouTube tự cập nhật"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thêm nguồn</span>
          </button>

          <button
            type="button"
            disabled={isRefreshingFeed}
            onClick={() => void loadLiveRssFeed(true, true)}
            className="p-2 rounded-xl border bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 transition-all cursor-pointer disabled:opacity-50"
            title="Tải Shorts mới nhất từ YouTube ngay"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshingFeed ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !showSearchBar;
              setShowSearchBar(next);
              if (next) setFeedMode('search');
              else if (feedMode === 'search') setFeedMode('reels');
            }}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showSearchBar || feedMode === 'search'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title="Tìm trích đoạn theo cụm từ"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              showSettingsPanel || isBlindMode || isDrillMode || subOffset !== 0 || showLiveYouglish
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title="Cài đặt phụ đề, Nghe mù, Lặp 3x, Lệch sub & YouGlish Live"
          >
            <Settings2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="lg:hidden px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Học</span>
          </button>
        </div>
      </div>

      {/* Self-Service Add Short / Follow YouTube Channel Drawer (Hidden by default) */}
      {showAddSourcePanel && (
        <div className="bg-white border border-teal-200 rounded-2xl p-4 shadow-sm space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                + Tự thêm YouTube Short hoặc theo dõi kênh tự cập nhật
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Dán link bất kỳ clip Short (<code className="text-teal-700">youtube.com/shorts/...</code>) hoặc <code className="text-teal-700">@tenkenh</code> — app tự tải video mới, kéo phụ đề khớp giây & dịch tiếng Việt.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddSourcePanel(false)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleAddReelSource();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={sourceInput}
              onChange={(e) => {
                setSourceInput(e.target.value);
                if (sourceError) setSourceError(null);
              }}
              placeholder="Ví dụ: https://youtube.com/shorts/... hoặc @rachelsenglish"
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-teal-500 focus:outline-hidden text-sm text-slate-900"
            />
            <button
              type="submit"
              disabled={isResolvingSource || !sourceInput.trim()}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              {isResolvingSource ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{isResolvingSource ? 'Đang kiểm tra...' : 'Thêm ngay'}</span>
            </button>
          </form>

          {sourceError && (
            <p className="text-xs font-semibold text-rose-600">{sourceError}</p>
          )}

          {/* Quick-Follow Suggestions + Currently Followed Custom Channels */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Gợi ý kênh Mỹ (bấm để theo dõi):</span>
            {['@rachelsenglish', '@EnglishwithLucy', '@HadarShemesh'].map((handle) => (
              <button
                key={handle}
                type="button"
                disabled={isResolvingSource}
                onClick={() => void handleAddReelSource(handle)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 hover:border-teal-200 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
              >
                + {handle}
              </button>
            ))}
          </div>

          {followedChannels.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Kênh bạn đang theo dõi:</span>
              {followedChannels.map((ch) => (
                <span
                  key={ch.channelId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-bold text-teal-800"
                >
                  <span>{ch.channelName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFollowedChannel(ch.channelId)}
                    className="hover:text-rose-600 cursor-pointer"
                    title="Hủy theo dõi kênh này"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Consolidated Settings Drawer (Hidden by default — Zero UI Clutter) */}
      {showSettingsPanel && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 px-1.5">Phụ đề:</span>
              {([
                { id: 'bilingual' as SubtitleDisplayMode, label: 'EN + VI' },
                { id: 'en_only' as SubtitleDisplayMode, label: 'Chỉ EN' },
                { id: 'blind' as SubtitleDisplayMode, label: 'Nghe mù' }
              ]).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSubtitleMode(mode.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    subtitleMode === mode.id ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsDrillMode(!isDrillMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isDrillMode
                  ? 'bg-teal-50 text-teal-800 border-teal-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Repeat className="w-3.5 h-3.5 text-teal-600" />
              <span>Lặp 3x: {isDrillMode ? 'BẬT' : 'TẮT'}</span>
            </button>

            <button
              type="button"
              onClick={() => setUseDirectIframe(!useDirectIframe)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                useDirectIframe
                  ? 'bg-teal-50 text-teal-800 border-teal-300'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-teal-600" />
              <span>{useDirectIframe ? 'IFrame' : '3-Slot Pool'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLiveYouglish(!showLiveYouglish)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                showLiveYouglish
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>YouGlish Live</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              Lệch sub ({subOffset > 0 ? `+${subOffset}s` : `${subOffset}s`}):
            </span>
            {[-0.5, -0.2, 0.2, 0.5].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() => handleAdjustOffset(delta)}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                {delta > 0 ? `+${delta}s` : `${delta}s`}
              </button>
            ))}
            {subOffset !== 0 && (
              <button
                type="button"
                onClick={() => handleAdjustOffset(0, true)}
                className="px-2 py-1 text-xs font-bold text-teal-700 hover:underline cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}

      {/* YouGlish Official Live Widget API Panel */}
      {showLiveYouglish && (
        <div className="animate-fade-in">
          <YouGlishLiveWidget
            initialWord={activeExpression || searchQuery || 'complicated'}
            accent={accentFilter}
            onClose={() => setShowLiveYouglish(false)}
            onSelectWord={(w) => {
              setSelectedWordFilter(w);
            }}
          />
        </div>
      )}

      {/* Search Input Bar (Shown only when Search icon is toggled) */}
      {(showSearchBar || feedMode === 'search') && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFeedMode('search');
            setSearchQuery(searchInput);
          }}
          className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs max-w-2xl mx-auto"
        >
          <Search className="w-5 h-5 text-slate-400 ml-2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nhập từ hoặc cụm tiếng Mỹ (ví dụ: figure out, sounds good)..."
            className="flex-1 bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden font-medium"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            Tìm
          </button>
        </form>
      )}

      {/* Empty State */}
      {activeFeed.length === 0 ? (
        <div className="w-full max-w-md mx-auto py-16 rounded-3xl bg-white border border-slate-200 p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
          <div className="size-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100">
            <Target className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900">
              {feedMode === 'reels' && reelTopicFilter === 'my_videos'
                ? 'Chưa có Short hoặc kênh nào bạn tự thêm'
                : 'Chưa tìm thấy trích đoạn phù hợp'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              {feedMode === 'reels' && reelTopicFilter === 'my_videos'
                ? 'Dán link bất kỳ YouTube Short hoặc @tenkenh yêu thích — app tự tải video mới, kéo phụ đề khớp giây và dịch tiếng Việt!'
                : feedMode === 'search'
                  ? `Không có trích đoạn nào chứa "${searchQuery}". Hãy thử cụm từ khác.`
                  : 'Không có trích đoạn nào phù hợp với bộ lọc bạn vừa chọn.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {feedMode === 'reels' && reelTopicFilter === 'my_videos' && (
              <button
                type="button"
                onClick={() => setShowAddSourcePanel(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Short hoặc Kênh ngay</span>
              </button>
            )}
            {feedMode === 'reels' && reelTopicFilter === 'my_videos' && onImportShortClick && (
              <button
                type="button"
                onClick={onImportShortClick}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Import video dài</span>
              </button>
            )}
            <button
              onClick={() => {
                setReelTopicFilter('all');
                setSelectedWordFilter('all');
                setAccentFilter('GLOBAL');
                setRegisterFilter('all');
                setSearchQuery('');
                setSearchInput('');
                setFeedMode('reels');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
            >
              Xem Real American Reels
            </button>
          </div>
        </div>
      ) : (
        /* 2. Main Studio Grid: Clean Video Stage (Left) + YouGlish Study Companion (Right) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start justify-center">
          
          {/* ================= COLUMN 1: THE CLEAN VIDEO STAGE ================= */}
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center w-full">
            <div className="relative flex items-center gap-3">
              {/* The Video Card Viewport */}
              <div 
                onWheel={handleWheel}
                onMouseDown={handleTouchHoldStart}
                onMouseUp={handleTouchHoldEnd}
                onTouchStart={(e) => {
                  handleTouchHoldStart();
                  touchStartY.current = e.touches[0]?.clientY ?? null;
                }}
                onTouchEnd={(e) => {
                  handleTouchHoldEnd();
                  if (touchStartY.current === null) return;
                  const touchEndY = e.changedTouches[0]?.clientY ?? 0;
                  const diff = touchStartY.current - touchEndY;
                  if (diff > 45) handleNext();
                  else if (diff < -45) handlePrev();
                  touchStartY.current = null;
                }}
                className={`relative w-[340px] sm:w-[376px] h-[630px] sm:h-[675px] rounded-[28px] overflow-hidden shadow-xl bg-slate-950 border border-slate-200 flex flex-col justify-between select-none transition-all duration-150 ${
                  swipeAnimation === 'slide-up' ? '-translate-y-4 opacity-75 scale-[0.98]' : ''
                } ${
                  swipeAnimation === 'slide-down' ? 'translate-y-4 opacity-75 scale-[0.98]' : ''
                }`}
              >
                {/* 1. Underlying YouTube Video Player + Soft Ambient Poster Backdrop (Never harsh black screen) */}
                <div className="absolute inset-0 overflow-hidden bg-slate-950 flex items-center justify-center">
                  <img
                    src={currentShort.thumbnail || `https://img.youtube.com/vi/${currentShort.youtubeId}/hqdefault.jpg`}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md scale-110 pointer-events-none"
                  />
                  {currentShort.videoUrl ? (
                    <>
                      <video
                        ref={nativeVideoRef}
                        key={currentShort.videoUrl}
                        src={currentShort.videoUrl}
                        playsInline
                        autoPlay
                        muted={isGlobalMuted}
                        preload="auto"
                        onPlay={() => {
                          isPlayingRef.current = true;
                          setIsPlaying(true);
                          clearLoadingOverlay();
                        }}
                        onPause={() => {
                          isPlayingRef.current = false;
                          setIsPlaying(false);
                        }}
                        onEnded={() => {
                          const vid = nativeVideoRef.current;
                          if (vid && !userPausedRef.current) {
                            vid.currentTime = currentShort.startSeconds || 0;
                            vid.play().catch(() => {});
                          }
                        }}
                        className="relative z-[2] w-full h-full object-cover pointer-events-none"
                      />
                      {/* Silent 0ms preload for next MP4 reel */}
                      {activeFeed[currentIndex + 1]?.videoUrl && (
                        <video
                          src={activeFeed[currentIndex + 1].videoUrl}
                          preload="auto"
                          muted
                          className="hidden"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  ) : useDirectIframe ? (
                    <iframe
                      key={`direct-iframe-${currentShort.youtubeId}-${currentIndex}`}
                      src={`https://www.youtube-nocookie.com/embed/${currentShort.youtubeId}?autoplay=1&mute=${isGlobalMuted ? 1 : 0}&start=${Math.floor(clipStart)}&controls=0&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                      title={currentShort.title}
                      className="w-full h-full border-0 pointer-events-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="relative w-full h-full pointer-events-none">
                      {([0, 1, 2] as PoolSlotId[]).map((slotId) => {
                        const isSlotActive = slotId === activeSlotId;
                        return (
                          <div
                            key={slotId}
                            ref={(el) => {
                              poolContainersRef.current[slotId] = el;
                            }}
                            className={`absolute inset-0 w-full h-full pointer-events-none [&_iframe]:pointer-events-none [&_iframe]:w-full [&_iframe]:h-full transition-opacity duration-150 ${
                              isSlotActive ? 'opacity-100 z-[2]' : 'opacity-0 z-[0]'
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Anti-Blackscreen Smooth Poster Loading Overlay */}
                  {isVideoLoading && !playerError && (
                    <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center transition-opacity duration-300 pointer-events-none">
                      <img
                        src={currentShort.thumbnail || `https://img.youtube.com/vi/${currentShort.youtubeId}/hqdefault.jpg`}
                        alt={currentShort.title}
                        className="absolute inset-0 w-full h-full object-cover blur-sm opacity-50 scale-105"
                      />
                      <div className="relative z-10 flex flex-col items-center gap-3">
                        <div className="size-11 rounded-full border-3 border-teal-400 border-t-transparent animate-spin shadow-xl" />
                        <span className="px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-md text-xs font-bold text-slate-200 border border-slate-700 shadow-lg">
                          Đang tải video...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* YouTube Player Error Recovery Card */}
                  {playerError && (
                    <div className="absolute inset-0 z-25 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center text-white space-y-4">
                      <div className="size-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-amber-300">
                          {playerError.title || 'Video không khả dụng'}
                        </h3>
                        <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                          {playerError.message || 'Video này có thể bị hạn chế bản quyền hoặc không tồn tại trên YouTube.'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 pt-2 w-full max-w-xs">
                        {currentShort.targetWord && (
                          <button
                            type="button"
                            onClick={() => setShowLiveYouglish(true)}
                            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Globe className="w-4 h-4" />
                            <span>Mở từ "{currentShort.targetWord}" trên YouGlish Live</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setUseDirectIframe(true)}
                          className="w-full py-2 px-4 rounded-xl bg-teal-500 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Zap className="w-4 h-4" />
                          <span>Thử phát ngay bằng IFrame</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNext}
                          className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span>Xem Short kế tiếp</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Double-Tap Like Heart Particles */}
                  {heartParticles.map(p => (
                    <div
                      key={p.id}
                      style={{ left: `${p.x}px`, top: `${p.y}px` }}
                      className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 text-rose-500 z-30 animate-scale-up"
                    >
                      <Heart className="w-16 h-16 fill-rose-500 drop-shadow-2xl" />
                    </div>
                  ))}

                  {/* 3-Second Interpolated Micro-Quiz Overlay (Nature Comms Psych 2025 — Non-blocking!) */}
                  {activeMicroQuiz && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 z-35 bg-slate-950/92 backdrop-blur-md p-5 flex flex-col justify-center gap-4 animate-fade-in"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[11px] font-black">
                          <Brain className="w-3.5 h-3.5" />
                          <span>Micro-Quiz 3 giây • Khóa trí nhớ</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleDismissMicroQuiz}
                          className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          title="Bỏ qua và lướt tiếp"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400/15 to-teal-400/15 border border-amber-400/30">
                          <p className="text-lg font-black text-amber-300">
                            "{activeMicroQuiz.expression}"
                          </p>
                          <p className="text-[11px] text-slate-300 italic mt-0.5 line-clamp-2">
                            {activeMicroQuiz.contextSentence}
                          </p>
                        </div>
                        <p className="text-xs font-bold text-white">
                          {activeMicroQuiz.promptVi}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {activeMicroQuiz.options.map((opt, idx) => {
                          const isAnswered = microQuizAnswer !== null;
                          const isSelected = microQuizAnswer === idx;
                          const isCorrect = idx === activeMicroQuiz.correctIndex;
                          let btnClass = 'bg-slate-900 border-slate-700 text-slate-200 hover:border-teal-400 hover:bg-slate-800';
                          if (isAnswered) {
                            if (isCorrect) {
                              btnClass = 'bg-emerald-500/25 border-emerald-400 text-emerald-200 font-black';
                            } else if (isSelected) {
                              btnClass = 'bg-rose-500/25 border-rose-400 text-rose-200';
                            } else {
                              btnClass = 'bg-slate-900/60 border-slate-800 text-slate-500';
                            }
                          }
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAnswerMicroQuiz(idx)}
                              disabled={isAnswered}
                              className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${btnClass}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {microQuizAnswer !== null && (
                        <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 text-[11px] text-slate-200 leading-relaxed">
                          <span className={microQuizAnswer === activeMicroQuiz.correctIndex ? 'text-emerald-400 font-black' : 'text-amber-300 font-black'}>
                            {microQuizAnswer === activeMicroQuiz.correctIndex ? '🎉 Chuẩn xác! ' : '💡 Ghi nhớ nhanh: '}
                          </span>
                          {activeMicroQuiz.explanationVi}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleDismissMicroQuiz}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:brightness-105 text-slate-950 font-black text-xs shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>{microQuizAnswer !== null ? 'Lướt clip tiếp theo' : 'Bỏ qua & Lướt tiếp'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Prominent Unmute Prompt Pill (PLOS ONE 2024: sound-off hurts enjoyment & comprehension) */}
                  {isGlobalMuted && !playerError && !activeMicroQuiz && !isVideoLoading && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute();
                      }}
                      className="absolute top-14 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black shadow-2xl flex items-center gap-2 cursor-pointer animate-bounce border-2 border-amber-200"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>🔊 Chạm để bật tiếng Mỹ</span>
                    </button>
                  )}

                  {/* Hold to 2x Speed Indicator */}
                  {isHoldSpeeding && (
                    <div className="absolute top-12 z-40 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-2xl animate-pulse">
                      <Zap className="w-4 h-4 fill-slate-950" />
                      <span>2.0X SPEED</span>
                    </div>
                  )}

                  {/* Tap-to-Play/Pause Controller Click Area (z-[5] ABOVE player iframe z-[2], BELOW top/bottom UI z-10) */}
                  <div
                    onClick={handleCardTap}
                    className="absolute inset-0 z-[5] cursor-pointer flex items-center justify-center"
                    title="Chạm 1 lần để Dừng/Phát • Chạm 2 lần để thả tim • Nhấn giữ để tăng tốc 2x"
                  >
                    {!isPlaying && !isVideoLoading && !playerError && !activeMicroQuiz && (
                      <div className="w-16 h-16 rounded-full bg-black/65 backdrop-blur-md flex items-center justify-center text-white shadow-2xl border border-white/25 animate-scale-up">
                        <Play className="w-8 h-8 fill-white ml-1" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Top Slim Video Overlay Bar (Unobtrusive) */}
                <div className="relative z-10 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-500 text-white shadow-md">
                      #{currentIndex + 1}/{activeFeed.length}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/20 text-white backdrop-blur-md">
                      {currentOccurrence ? `${currentOccurrence.zone}` : currentShort.level}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Unmute/Mute Toggle */}
                    <button
                      onClick={toggleMute}
                      className={`px-2.5 py-1 rounded-full backdrop-blur-md text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        isGlobalMuted ? 'bg-amber-500 text-white animate-pulse shadow-md' : 'bg-black/60 text-white hover:bg-black/80'
                      }`}
                      title={isGlobalMuted ? 'Bấm để bật âm thanh' : 'Tắt âm thanh'}
                    >
                      {isGlobalMuted ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Bật tiếng</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                          <span>Bật</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onOpenLesson(currentShort)}
                      className="px-2.5 py-1 rounded-full bg-white text-slate-900 text-[11px] font-black shadow-md hover:bg-teal-50 flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                      title="Mở toàn bộ phòng học video"
                    >
                      <span>Học full</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* 3. Bottom Clean Karaoke Subtitle Box (Unobstructed Speaker Face + L2-Top + Connected Speech) */}
                <div className="relative z-10 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent space-y-2">
                  {/* Real-time Subtitle Progress Line */}
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-400 transition-all duration-75 ease-linear"
                      style={{ width: `${cueProgress}%` }}
                    />
                  </div>

                  {/* Subtitle Card (L2 English Top -> L1 Vietnamese Subtle Bottom) */}
                  <div
                    onClick={replayCurrentSubtitle}
                    className="p-3 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 shadow-xl cursor-pointer hover:border-teal-400/50 transition-colors"
                    title="Bấm vào thẻ để nghe lại câu này"
                  >
                    <p className="text-sm sm:text-base font-black text-white leading-relaxed">
                      {renderWords(currentSub.text)}
                    </p>
                    {subtitleMode !== 'en_only' && (
                      <p className="text-xs text-slate-300/90 mt-1.5 italic font-medium">
                        {!isWordRevealed && (isBlindMode || feedMode === 'youglish') ? (
                          <span className="text-amber-300/80 font-mono text-[11px] inline-flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>[ 🎧 Mở đáp án để xem bản dịch tiếng Việt ]</span>
                          </span>
                        ) : (
                          currentSub.translation
                        )}
                      </p>
                    )}

                    {/* American Connected Speech Receptive Chips (0ms, max 2 chips) */}
                    {connectedSpeechHints.length > 0 && !(isBlindMode && !isWordRevealed) && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-white/10">
                        {connectedSpeechHints.map((hint) => (
                          <span
                            key={hint.id}
                            title={hint.noteVi}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-500/20 border border-teal-400/40 text-[10px] font-bold text-teal-200"
                          >
                            <Ear className="w-3 h-3 text-teal-300 shrink-0" />
                            <span className="opacity-80">{hint.written}</span>
                            <span className="text-amber-300">→ "{hint.spoken}"</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Channel Tag & Quick Speed Controls (0.75x / 1.0x / 1.25x) */}
                  <div className="text-white text-xs font-semibold drop-shadow flex items-center justify-between gap-2 px-1">
                    <span className="font-bold text-amber-300 truncate max-w-[165px]">
                      @{currentShort.channel}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {[0.75, 1.0, 1.25].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChangePlaybackRate(rate);
                          }}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                            playbackRate === rate
                              ? 'bg-teal-400 text-slate-950'
                              : 'bg-white/15 text-slate-200 hover:bg-white/25'
                          }`}
                          title={`Tốc độ phát ${rate}x`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean Light Studio Flanking Dock (Play/Pause + Save SRS + Shadow + Prev/Next) */}
              <div className="flex flex-col items-center gap-2.5 shrink-0">
                {/* Explicit Pause / Play Button (Always works cleanly on both MP4 & YouTube) */}
                <button
                  type="button"
                  onClick={togglePlayPause}
                  className="flex flex-col items-center gap-1 cursor-pointer group"
                  title={isPlaying ? 'Tạm dừng video (Phím Space)' : 'Tiếp tục phát (Phím Space)'}
                >
                  <div className={`p-3 rounded-2xl border transition-all shadow-xs ${
                    !isPlaying
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-teal-300 hover:text-teal-700'
                  }`}>
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {isPlaying ? 'Dừng' : 'Phát'}
                  </span>
                </button>

                {/* 1-Tap Save Expression to FSRS-6 */}
                <button
                  type="button"
                  onClick={handleSaveCurrentExpression}
                  className="flex flex-col items-center gap-1 cursor-pointer group"
                  title={isCurrentExpressionSaved ? 'Cụm này đã có trong Kho FSRS-6' : 'Lưu nhanh cụm này vào FSRS-6'}
                >
                  <div className={`p-3 rounded-2xl border transition-all shadow-xs ${
                    isCurrentExpressionSaved || bookmarked
                      ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-amber-200/50'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700'
                  }`}>
                    {isCurrentExpressionSaved || bookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {isCurrentExpressionSaved ? 'Đã lưu' : 'Lưu SRS'}
                  </span>
                </button>

                {/* 1-Tap Shadowing Mic Button */}
                <button
                  type="button"
                  onClick={handleStartShadowing}
                  className="flex flex-col items-center gap-1 cursor-pointer group"
                  title="Nhại giọng câu này (1-Tap Shadowing AI)"
                >
                  <div className={`p-3 rounded-2xl transition-all shadow-sm ${
                    isShadowing
                      ? 'bg-rose-500 text-white scale-105 animate-pulse shadow-rose-500/30'
                      : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20'
                  }`}>
                    {isShadowing ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {isShadowing ? 'Đang nghe' : 'Nhại lại'}
                  </span>
                </button>

                {/* Up / Down Navigation Buttons */}
                <div className="flex flex-col gap-1.5 pt-2.5 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={handlePrev}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 disabled:opacity-30 transition-all cursor-pointer shadow-xs"
                    title="Clip trước (Mũi tên lên)"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    disabled={currentIndex === activeFeed.length - 1}
                    onClick={handleNext}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 disabled:opacity-30 transition-all cursor-pointer shadow-xs"
                    title="Clip tiếp theo (Mũi tên xuống)"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ================= REGION 3: SINGLE CLEAN STUDY CARD (ZERO CLUTTER) ================= */}
          <div className={`lg:col-span-6 xl:col-span-7 w-full ${isMobileDrawerOpen ? 'block' : 'hidden lg:flex lg:flex-col'}`}>
            <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-5">
              {/* Top Section: American Expression OR SRS Active Recall */}
              {activeExpression && (
                feedMode === 'reels' ? (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            {currentShort.register === 'workplace_us'
                              ? '💼 Công sở Mỹ'
                              : currentShort.register === 'casual_us'
                                ? '☕ Đời sống Mỹ'
                                : '🗣️ Giao tiếp hàng ngày'}
                          </span>
                          {currentShort.videoUrl && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ⚡ MP4 0ms
                            </span>
                          )}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight pt-0.5">
                          "{activeExpression}"
                        </h2>
                        {currentShort.expressionMeaningVi && (
                          <p className="text-sm sm:text-base font-bold text-teal-700">
                            {currentShort.expressionMeaningVi}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveCurrentExpression}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 border ${
                          isCurrentExpressionSaved
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600 shadow-xs'
                        }`}
                      >
                        {isCurrentExpressionSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                        <span>{isCurrentExpressionSaved ? 'Đã lưu FSRS-6' : '+ Lưu FSRS-6'}</span>
                      </button>
                    </div>

                    {currentShort.americanUsageNote && (
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5">
                        <strong className="text-slate-900">🇺🇸 Người Mỹ dùng khi nào:</strong> {currentShort.americanUsageNote}
                      </p>
                    )}

                    {/* Receptive Connected Speech Chips (Only when sentence has real reductions/linking) */}
                    {connectedSpeechHints.length > 0 && (
                      <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                          <Ear className="w-3.5 h-3.5 text-teal-600" />
                          <span>Nối âm thực tế (để nghe ra người Mỹ):</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {connectedSpeechHints.map((hint) => (
                            <span
                              key={hint.id}
                              title={hint.noteVi}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-teal-100 text-xs"
                            >
                              <span className="text-slate-600 font-medium">"{hint.written}"</span>
                              <span className="text-slate-400">→</span>
                              <span className="font-black text-amber-800">"{hint.spoken}"</span>
                              <span className="font-mono text-[11px] text-teal-700">{hint.ipaLike}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clean 2-Button Action Row: AI Nuance + Watch Real Movie Scenes on PlayPhrase */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAskAiNuance}
                        disabled={isLoadingAiNuance}
                        className="flex-1 min-w-[200px] py-2 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                      >
                        {isLoadingAiNuance ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-600" />}
                        <span>{currentUser ? 'AI Giải mã sắc thái Mỹ' : 'Đăng nhập dùng AI Sắc thái'}</span>
                      </button>

                      <a
                        href={`https://www.playphrase.me/#/search?q=${encodeURIComponent(activeExpression)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                        title={`Mở cảnh phim & sitcom Mỹ nói "${activeExpression}" trên PlayPhrase.me`}
                      >
                        <Film className="w-3.5 h-3.5 text-slate-600" />
                        <span>Nghe trong phim Mỹ</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    </div>

                    {aiNuanceError && <p className="text-xs text-rose-600 font-semibold">{aiNuanceError}</p>}

                    {aiNuance && (
                      <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200 text-xs space-y-2 animate-fade-in">
                        <p className="font-black text-indigo-950">{aiNuance.meaningVi}</p>
                        <p className="text-slate-700 leading-relaxed">{aiNuance.nuance}</p>
                        {aiNuance.grammarNote && (
                          <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 font-medium">
                            💡 {aiNuance.grammarNote}
                          </p>
                        )}
                        {Array.isArray(aiNuance.examples) && aiNuance.examples.length > 0 && (
                          <div className="space-y-1 pt-1.5 border-t border-indigo-200/70">
                            {aiNuance.examples.slice(0, 2).map((ex, i) => (
                              <div key={i} className="text-[11px]">
                                <p className="text-slate-900 font-semibold">• {ex.en}</p>
                                <p className="text-slate-600 pl-2.5">{ex.vi}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black uppercase tracking-wider text-teal-700">
                            {!isWordRevealed ? '🎯 Ôn tập FSRS-6' : '🎯 Từ mục tiêu'}
                          </span>
                          {currentOccurrence?.isDueToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                              Cần ôn hôm nay
                            </span>
                          )}
                        </div>

                        {!isWordRevealed ? (
                          <div className="flex items-center gap-2.5 pt-1">
                            <div className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-dashed border-amber-300 text-amber-900 font-mono font-black text-base tracking-widest flex items-center gap-2">
                              <span>• • • • • •</span>
                              <span className="text-[11px] font-sans text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">
                                {activeExpression.length} ký tự
                              </span>
                            </div>
                            <button
                              onClick={() => setIsWordRevealed(true)}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Mở đáp án</span>
                            </button>
                          </div>
                        ) : (
                          <h2 className="text-2xl font-black text-slate-900 pt-0.5 tracking-tight">
                            "{activeExpression}"
                          </h2>
                        )}
                      </div>

                      {isWordRevealed && (
                        <button
                          onClick={() => onSelectWord(activeExpression, currentShort.targetContext || '')}
                          className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Tra chi tiết</span>
                        </button>
                      )}
                    </div>

                    {isWordRevealed && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 mr-1">Chấm FSRS-6:</span>
                        {([
                          { r: 1 as AnkiRating, label: 'Quên', cls: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white' },
                          { r: 2 as AnkiRating, label: 'Khó', cls: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-500 hover:text-white' },
                          { r: 3 as AnkiRating, label: 'Tốt', cls: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-600 hover:text-white' },
                          { r: 4 as AnkiRating, label: 'Dễ', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-600 hover:text-white' }
                        ]).map((btn) => (
                          <button
                            key={btn.r}
                            onClick={() => handleRateCard(btn.r)}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${btn.cls}`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {feedMode === 'youglish' && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                          <ListFilter className="w-3.5 h-3.5 text-teal-600" />
                          Sổ tay ({availableWordsWithCount.length} từ)
                        </span>
                        <div className="flex items-center gap-1">
                          {(['GLOBAL', 'US', 'UK'] as AccentZone[]).map((z) => (
                            <button
                              key={z}
                              onClick={() => setAccentFilter(z)}
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                                accentFilter === z ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {z === 'GLOBAL' ? 'Tất cả' : z === 'US' ? '🇺🇸 Mỹ' : '🇬🇧 Anh'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}

              {/* Inline Shadowing Result (Only shown right after mic attempt) */}
              {shadowResult && (
                <div
                  className={`p-3 rounded-2xl border space-y-1 animate-scale-up ${
                    shadowResult.accuracy >= 70
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50 border-amber-200 text-amber-950'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black flex items-center gap-1.5">
                      <CheckCircle2 className={`w-4 h-4 ${shadowResult.accuracy >= 70 ? 'text-emerald-600' : 'text-amber-600'}`} />
                      <span>Phát âm: {shadowResult.accuracy}%</span>
                    </span>
                    <button onClick={() => setShadowResult(null)} className="text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer">
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-slate-700 italic">"{shadowResult.transcript || 'Không nghe rõ'}"</p>
                </div>
              )}

              {/* Bottom Section inside SAME Single Card: Compact Transcript (Click any line to seek) */}
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-teal-600" />
                    <span>Kịch bản ({subtitles.length} câu)</span>
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    {isBlindMode && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold">Nghe mù</span>}
                    {isDrillMode && <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold">Lặp 3x</span>}
                    <span>Nhấp câu để tua</span>
                  </div>
                </div>

                <div className="max-h-[250px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                  {subtitles.map((sub, idx) => {
                    const isActive = currentSubIndex === idx;
                    return (
                      <div
                        key={sub.id || idx}
                        onClick={() => seekToSubtitle(idx)}
                        className={`px-3 py-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-teal-50/70 border-teal-300'
                            : 'bg-slate-50/50 border-transparent hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <p className={`text-sm leading-relaxed ${isActive ? 'text-slate-900 font-bold' : 'text-slate-700 font-medium'}`}>
                          {renderWords(sub.text, 'light')}
                        </p>
                        {subtitleMode !== 'en_only' && sub.translation && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {!isWordRevealed && (isBlindMode || feedMode === 'youglish') ? (
                              <span className="text-amber-700 text-[11px] inline-flex items-center gap-1">
                                <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>Mở đáp án để xem dịch</span>
                              </span>
                            ) : (
                              sub.translation
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default ShortsView;
