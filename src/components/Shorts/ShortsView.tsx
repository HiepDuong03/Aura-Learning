import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { VideoLesson, SavedWord, SubtitleLine } from '../../types';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  Heart, 
  Bookmark, 
  BookmarkCheck, 
  Volume2, 
  VolumeX, 
  Sparkles,
  ArrowRight,
  Play, 
  Pause,
  RotateCcw, 
  Gauge, 
  Repeat, 
  Eye, 
  EyeOff, 
  Compass, 
  Target, 
  Search, 
  Plus, 
  SlidersHorizontal, 
  Check, 
  Mic, 
  MicOff, 
  Zap, 
  CheckCircle2, 
  BookOpen, 
  AlertTriangle,
  ExternalLink,
  Loader2,
  ListFilter,
  Layers,
  GraduationCap,
  Lock,
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakWord } from '../../services/dictionaryService';
import { tokenizeText } from '../../utils/textTokenizer';
import { loadYouTubeIframeAPI, parseYouTubePlayerError, YouTubePlayerError } from '../../services/youtubeLoader';
import { shortsFeedService } from '../../services/shortsFeedService';
import { youglishEngine, AccentZone, ContextRegister, YouGlishOccurrence } from '../../services/youglishEngine';
import { speechScoringService, SpeechScoreResult } from '../../services/speechScoringService';
import { YouGlishLiveWidget } from './YouGlishLiveWidget';

type ShortsFeedMode = 'youglish' | 'search';

interface ShortsViewProps {
  isActive?: boolean;
  shorts?: VideoLesson[];
  onSelectWord: (word: string, contextSentence: string) => void;
  onOpenLesson: (lesson: VideoLesson) => void;
  savedWords?: SavedWord[];
  lessons?: VideoLesson[];
  activeProfileId?: string;
  onImportShortClick?: () => void;
}

interface HeartParticle {
  id: number;
  x: number;
  y: number;
}

export const ShortsView: React.FC<ShortsViewProps> = ({
  isActive = true,
  shorts: initialShorts,
  onSelectWord,
  onOpenLesson,
  savedWords = [],
  lessons = [],
  activeProfileId = 'default_profile',
  onImportShortClick
}) => {
  // Feed Mode State: Pure YouGlish Study & Search
  const [feedMode, setFeedMode] = useState<ShortsFeedMode>('youglish');
  const [selectedWordFilter, setSelectedWordFilter] = useState<string>('all');
  const [accentFilter, setAccentFilter] = useState<AccentZone>('GLOBAL');
  const [registerFilter, setRegisterFilter] = useState<'all' | ContextRegister>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [showLiveYouglish, setShowLiveYouglish] = useState<boolean>(false);

  // Active Index & Feed
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [currentSubIndex, setCurrentSubIndex] = useState<number>(0);
  const [liked, setLiked] = useState<boolean>(false);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // TikTok Ergonomics & Micro-Interactions
  // Default to muted on first visit to comply with browser autoplay policies and ensure instant start
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

  // YouGlish Learning Enhancements — Blind Listening (Nghe Mù) enabled by default for SRS Active Recall!
  const [isBlindMode, setIsBlindMode] = useState<boolean>(true);
  const [isWordRevealed, setIsWordRevealed] = useState<boolean>(false);
  const [isDrillMode, setIsDrillMode] = useState<boolean>(false);
  const [drillRepeatCount, setDrillRepeatCount] = useState<number>(1);
  const drillRepeatCountRef = useRef<number>(1);

  // 1-Tap Shadowing States
  const [isShadowing, setIsShadowing] = useState<boolean>(false);
  const [shadowResult, setShadowResult] = useState<SpeechScoreResult | null>(null);
  const recognitionRef = useRef<any>(null);

  // Subtitle offset calibration
  const [showOffsetBar, setShowOffsetBar] = useState<boolean>(false);
  const [subOffset, setSubOffset] = useState<number>(0);

  // Mobile companion drawer toggle
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);

  // SRS Rating for Revealed Flashcards
  const handleRateCard = async (rating: 1 | 2 | 3 | 4) => {
    const targetW = currentShort?.targetWord?.toLowerCase().trim();
    const matchingWord = targetW ? savedWords.find(w => w?.word && w.word.toLowerCase().trim() === targetW) : null;
    if (matchingWord) {
      await speechScoringService.recordShadowingResult(matchingWord, rating, activeProfileId);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.6 } });
    }
    setTimeout(() => {
      handleNext();
    }, 450);
  };

  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const isSeekingRef = useRef<boolean>(false);
  const touchStartY = useRef<number | null>(null);

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

    // Default 'youglish' mode
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
  }, [feedMode, youglishOccurrences, searchQuery, lessons]);

  // Reset index when feed criteria change
  useEffect(() => {
    setCurrentIndex(0);
    const first = activeFeed[0];
    const initIdx = (first as any)?.initialSubIndex ?? 0;
    setCurrentSubIndex(initIdx);
    setIsWordRevealed(false);
    setShadowResult(null);
  }, [feedMode, selectedWordFilter, accentFilter, registerFilter, searchQuery]);

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

  // When active short changes, immediately position to target sentence and mask keyword for Blind Listening
  useEffect(() => {
    const initIdx = (currentShort as any)?.initialSubIndex ?? 0;
    setCurrentSubIndex(initIdx);
    setIsWordRevealed(false);
    setShadowResult(null);
  }, [currentShort.id]);

  const currentOccurrence = feedMode === 'youglish' ? youglishOccurrences[currentIndex] : null;

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

  const subtitles = currentShort?.subtitles || [];
  const currentSub = subtitles[currentSubIndex] || subtitles[0] || {
    id: 'empty',
    start: 0,
    end: 5,
    text: 'Enjoy this English learning Short!',
    translation: 'Hãy thưởng thức video ngắn học tiếng Anh này!'
  };

  // Reset drill count & shadowing on video or subtitle change
  useEffect(() => {
    drillRepeatCountRef.current = 1;
    setDrillRepeatCount(1);
    setIsWordRevealed(false);
    setShadowResult(null);
  }, [currentSubIndex, currentIndex]);

  // --- 3. Ultra-Fast Resilient YouTube Player Engine ---
  useEffect(() => {
    if (useDirectIframe) {
      setIsVideoLoading(false);
      setPlayerError(null);
      return;
    }

    let isMounted = true;
    const clipStart = currentShort.startSeconds || 0;

    // Fast-path: Reuse existing player instance without DOM recreation (150ms switch vs 3s recreate)
    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      try {
        setIsVideoLoading(true);
        setPlayerError(null);

        // 1.8s watchdog timer to guarantee loading spinner never gets stuck
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = setTimeout(() => {
          if (isMounted) setIsVideoLoading(false);
        }, 1800);

        playerRef.current.loadVideoById({
          videoId: currentShort.youtubeId,
          startSeconds: clipStart
        });

        if (isGlobalMuted) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }

        if (typeof playerRef.current.setPlaybackRate === 'function') {
          playerRef.current.setPlaybackRate(playbackRate);
        }

        if (isActive) {
          playerRef.current.playVideo();
          setIsPlaying(true);
        } else {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
        }
        setCurrentSubIndex(0);
        drillRepeatCountRef.current = 1;
        setDrillRepeatCount(1);
        return;
      } catch (e) {
        console.warn('[ShortsView] loadVideoById error, rebuilding player container:', e);
      }
    }

    // Cold-path: Create fresh player element inside container
    const initPlayer = () => {
      if (!isMounted) return;
      if (!window.YT || !window.YT.Player) return;
      if (!playerContainerRef.current) return;

      // Recreate pristine inner mount div to avoid YouTube .destroy() node removal issues
      playerContainerRef.current.innerHTML = '<div id="yt-shorts-mount-node" class="w-full h-full pointer-events-none scale-[1.35] origin-center"></div>';

      setIsVideoLoading(true);
      setPlayerError(null);

      // Watchdog timeout for cold initialization
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = setTimeout(() => {
        if (isMounted) setIsVideoLoading(false);
      }, 2000);

      try {
        playerRef.current = new window.YT.Player('yt-shorts-mount-node', {
          videoId: currentShort.youtubeId,
          playerVars: {
            autoplay: isActive ? 1 : 0,
            controls: 0,
            mute: (!isActive || isGlobalMuted) ? 1 : 0,
            start: Math.floor(clipStart),
            enablejsapi: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              playerRef.current = event.target;
              if (isGlobalMuted || !isActive) {
                event.target.mute();
              } else {
                event.target.unMute();
              }
              if (typeof event.target.setPlaybackRate === 'function') {
                event.target.setPlaybackRate(playbackRate);
              }
              if (clipStart > 0 && typeof event.target.seekTo === 'function') {
                event.target.seekTo(clipStart, true);
              }
              if (isActive) {
                event.target.playVideo();
                setIsPlaying(true);
              } else {
                event.target.pauseVideo();
                setIsPlaying(false);
              }
              setIsVideoLoading(false);
              setPlayerError(null);
              if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              // Clear loading state on ANY active player state (Playing = 1, Paused = 2, Buffering = 3, Cued = 5)
              if (event.data === 1 || event.data === 2 || event.data === 5) {
                setIsVideoLoading(false);
                setPlayerError(null);
                if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
              }

              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                // Loop restart to clip start
                setCurrentSubIndex(0);
                drillRepeatCountRef.current = 1;
                setDrillRepeatCount(1);
                if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                  playerRef.current.seekTo(clipStart, true);
                  playerRef.current.playVideo();
                }
              }
            },
            onError: (event: any) => {
              if (!isMounted) return;
              console.warn('[ShortsView] YouTube player error:', event.data);
              const parsed = parseYouTubePlayerError(event.data);
              setPlayerError(parsed);
              setIsVideoLoading(false);
              if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
            }
          }
        });
      } catch (err) {
        console.warn('[ShortsView] Failed to instantiate YT.Player:', err);
        setIsVideoLoading(false);
      }
    };

    loadYouTubeIframeAPI(3500)
      .then(() => {
        if (!isMounted) return;
        initPlayer();
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[ShortsView] YouTube API load failed, switching to direct embed:', err);
        setUseDirectIframe(true);
        setIsVideoLoading(false);
      });

    return () => {
      isMounted = false;
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
  }, [currentShort.youtubeId, currentShort.startSeconds, useDirectIframe]);

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

  // --- 4. Real-time 40ms sync loop with Pre-Roll Normalization & Auto-Loop ---
  useEffect(() => {
    const timer = setInterval(() => {
      if (isSeekingRef.current) return;
      const player = playerRef.current;
      if (!player || typeof player.getCurrentTime !== 'function') return;

      try {
        const rawTime = player.getCurrentTime();
        if (typeof rawTime !== 'number' || isNaN(rawTime)) return;
        setCurrentTime(rawTime);

        const clipStart = currentShort.startSeconds || 0;
        const clipEnd = currentShort.endSeconds;

        // Auto-loop for sliced YouGlish clips
        if (clipEnd && clipEnd > clipStart && rawTime >= clipEnd - 0.08) {
          player.seekTo(clipStart, true);
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
            player.seekTo(targetSeek, true);
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      if (holdSpeedTimerRef.current) clearTimeout(holdSpeedTimerRef.current);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
      try {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
        }
      } catch (e) {}
    };
  }, []);

  // --- 5. TikTok Gesture & Interaction Mechanics ---
  const handleNext = useCallback(() => {
    if (currentIndex < activeFeed.length - 1) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }
      setIsShadowing(false);
      setSwipeAnimation('slide-up');
      setIsVideoLoading(true);
      setPlayerError(null);

      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setCurrentSubIndex(0);
        setLiked(false);
        setBookmarked(false);
        setIsWordRevealed(false);
        setShadowResult(null);
        setSwipeAnimation(null);
      }, 140);
    }
  }, [currentIndex, activeFeed.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }
      setIsShadowing(false);
      setSwipeAnimation('slide-down');
      setIsVideoLoading(true);
      setPlayerError(null);

      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setCurrentSubIndex(0);
        setLiked(false);
        setBookmarked(false);
        setIsWordRevealed(false);
        setShadowResult(null);
        setSwipeAnimation(null);
      }, 140);
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

  const togglePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  // Global Mute Toggle (Persistent across all shorts)
  const toggleMute = () => {
    const nextMuted = !isGlobalMuted;
    setIsGlobalMuted(nextMuted);
    localStorage.setItem('4you_shorts_muted', String(nextMuted));
    if (playerRef.current) {
      if (nextMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    }
  };

  // TikTok Double-Tap to Like with Particle Physics
  const handleCardTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapTimeRef.current < DOUBLE_TAP_DELAY) {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }
      setLiked(true);
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
        togglePlayPause();
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
      alert('Trình duyệt của bạn chưa hỗ trợ Web Speech API. Vui lòng dùng Chrome, Edge hoặc Safari.');
      return;
    }

    if (isShadowing) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsShadowing(false);
      return;
    }

    if (playerRef.current) playerRef.current.pauseVideo();
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
        const targetW = currentShort?.targetWord?.toLowerCase().trim();
        const matchingWord = targetW ? savedWords.find(w => w?.word && w.word.toLowerCase().trim() === targetW) : null;
        if (matchingWord) {
          await speechScoringService.recordShadowingResult(matchingWord, score.ankiRating, activeProfileId);
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

    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      playerRef.current.seekTo(targetSeek, true);
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
    setTimeout(() => {
      isSeekingRef.current = false;
    }, 350);
  }, [subtitles, currentShort.startSeconds]);

  const replayCurrentSubtitle = useCallback(() => {
    if (currentSub && playerRef.current && typeof playerRef.current.seekTo === 'function') {
      isSeekingRef.current = true;
      drillRepeatCountRef.current = 1;
      setDrillRepeatCount(1);

      const clipStart = currentShort.startSeconds || 0;
      const hasStartOffset = clipStart > 2;
      const isRelativeCues = hasStartOffset && subtitles[0]?.start < clipStart - 1.5;
      const targetSeek = isRelativeCues ? (currentSub.start + clipStart) : currentSub.start;

      playerRef.current.seekTo(targetSeek, true);
      playerRef.current.playVideo();
      setIsPlaying(true);
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 350);
    }
  }, [currentSub, currentShort.startSeconds, subtitles]);

  // Tokenize subtitle and render words
  const renderWords = (text: string) => {
    const tokens = tokenizeText(text);
    const target = currentShort.targetWord?.toLowerCase().trim();

    return tokens.map((token, i) => {
      if (!token.isWord) return <span key={i}>{token.text}</span>;

      const isTarget = target && (
        token.lookupWord?.toLowerCase() === target ||
        token.text?.toLowerCase().replace(/[^a-z]/g, '') === target
      );

      // Review Mode (Active Recall): mask target word until user reveals!
      if (isTarget && (!isWordRevealed && (isBlindMode || feedMode === 'youglish'))) {
        return (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setIsWordRevealed(true);
            }}
            className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md animate-pulse border border-amber-300"
            title="Đang chế độ nghe mù — Nhấn để mở từ khóa"
          >
            <Eye className="w-3.5 h-3.5" /> [ 🎧 Nghe & Đoán ]
          </button>
        );
      }

      // YouGlish Target Word Highlight (Golden Glow)
      if (isTarget) {
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onSelectWord(token.lookupWord || token.text, text);
            }}
            className="cursor-pointer bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black rounded-lg px-2 py-0.5 mx-0.5 inline-block shadow-lg ring-2 ring-amber-300 animate-scale-up"
            title={`Từ mục tiêu: "${token.text}" — Nhấn để tra nghĩa & lưu Anki`}
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
          className="cursor-pointer hover:bg-teal-400 hover:text-teal-950 rounded px-1 transition-all bg-white/20 mx-0.5 inline-block"
          title="Nhấn để tra từ & lưu Anki Flashcard"
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
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 py-4 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Global Navigation Bar: Mode Switcher & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-slate-900 border border-slate-800 p-2.5 sm:p-3 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
          <button
            onClick={() => setFeedMode('youglish')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              feedMode === 'youglish'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Ôn Từ YouGlish</span>
            {youglishOccurrences.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                feedMode === 'youglish' ? 'bg-slate-950 text-teal-300' : 'bg-slate-800 text-teal-400'
              }`}>
                {youglishOccurrences.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setFeedMode('search')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              feedMode === 'search'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Tra Cứu Video</span>
          </button>

          <button
            onClick={() => setShowLiveYouglish(!showLiveYouglish)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              showLiveYouglish
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-600/30 ring-2 ring-red-400'
                : 'text-red-400 hover:text-white hover:bg-slate-800 border border-red-500/30'
            }`}
            title="Mở Widget API chính thức từ YouGlish với hơn 100 triệu video"
          >
            <Globe className="w-4 h-4 text-red-400 group-hover:text-white" />
            <span>YouGlish Live API</span>
            <span className="px-1.5 py-0.5 rounded-full bg-red-950/80 text-red-300 text-[10px] font-bold">
              100M+
            </span>
          </button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Instant IFrame Fast Mode Toggle */}
          <button
            onClick={() => setUseDirectIframe(!useDirectIframe)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              useDirectIframe 
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm' 
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Bật chế độ phát siêu tốc (Nocookie IFrame)"
          >
            <Zap className={`w-3.5 h-3.5 ${useDirectIframe ? 'text-teal-400' : 'text-slate-400'}`} />
            <span className="text-[11px] font-semibold">{useDirectIframe ? 'Phát Siêu Tốc (IFrame)' : 'Chế độ chuẩn'}</span>
          </button>

          {onImportShortClick && (
            <button
              onClick={onImportShortClick}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Short</span>
            </button>
          )}

          {/* Mobile Companion Drawer Trigger */}
          <button
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            className="lg:hidden px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Góc Học Tập</span>
          </button>
        </div>
      </div>

      {/* YouGlish Official Live Widget API Panel */}
      {showLiveYouglish && (
        <div className="mb-6 animate-fade-in">
          <YouGlishLiveWidget
            initialWord={currentShort.targetWord || searchQuery || 'complicated'}
            accent={accentFilter}
            onClose={() => setShowLiveYouglish(false)}
            onSelectWord={(w) => {
              setSelectedWordFilter(w);
            }}
          />
        </div>
      )}

      {/* Search Input Bar (When in Search Mode) */}
      {feedMode === 'search' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearchQuery(searchInput);
          }}
          className="flex items-center gap-2 mb-6 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-md max-w-2xl mx-auto"
        >
          <Search className="w-5 h-5 text-slate-500 ml-2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nhập từ vựng tiếng Anh để xem cách người bản xứ phát âm..."
            className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder-slate-500 focus:outline-hidden font-medium"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Tìm trích đoạn
          </button>
        </form>
      )}

      {/* Empty State */}
      {activeFeed.length === 0 ? (
        <div className="w-full max-w-md mx-auto h-[450px] rounded-[32px] bg-slate-900 border border-slate-800 p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
          <div className="size-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Target className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-white">Chưa tìm thấy video phù hợp</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
              {feedMode === 'search'
                ? `Không có trích đoạn nào chứa từ "${searchQuery}". Hãy thử tìm kiếm từ vựng khác.`
                : 'Không có trích đoạn nào phù hợp với bộ lọc từ vựng hoặc giọng bạn vừa chọn.'}
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedWordFilter('all');
              setAccentFilter('GLOBAL');
              setRegisterFilter('all');
              setSearchQuery('');
              setSearchInput('');
              setFeedMode('youglish');
            }}
            className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-md cursor-pointer transition-transform active:scale-95"
          >
            Xem lại tất cả từ
          </button>
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
                className={`relative w-[340px] sm:w-[380px] h-[640px] sm:h-[690px] rounded-[32px] overflow-hidden shadow-2xl bg-black border-2 border-slate-800 flex flex-col justify-between select-none transition-all duration-150 ${
                  swipeAnimation === 'slide-up' ? '-translate-y-4 opacity-75 scale-[0.98]' : ''
                } ${
                  swipeAnimation === 'slide-down' ? 'translate-y-4 opacity-75 scale-[0.98]' : ''
                }`}
              >
                {/* 1. Underlying YouTube Video Player */}
                <div className="absolute inset-0 overflow-hidden bg-black flex items-center justify-center">
                  {useDirectIframe ? (
                    <iframe
                      key={`direct-iframe-${currentShort.youtubeId}-${currentIndex}`}
                      src={`https://www.youtube-nocookie.com/embed/${currentShort.youtubeId}?autoplay=1&mute=${isGlobalMuted ? 1 : 0}&start=${Math.floor(clipStart)}&controls=0&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                      title={currentShort.title}
                      className="w-full h-full border-0 scale-[1.35] origin-center pointer-events-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div ref={playerContainerRef} className="w-full h-full">
                      <div id="yt-shorts-mount-node" className="w-full h-full pointer-events-none scale-[1.35] origin-center" />
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

                  {/* Hold to 2x Speed Indicator */}
                  {isHoldSpeeding && (
                    <div className="absolute top-12 z-40 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-2xl animate-pulse">
                      <Zap className="w-4 h-4 fill-slate-950" />
                      <span>2.0X SPEED</span>
                    </div>
                  )}

                  {/* Tap-to-Play/Pause Controller Click Area */}
                  <div 
                    onClick={handleCardTap} 
                    className="absolute inset-0 z-0 cursor-pointer flex items-center justify-center"
                    title="Chạm 1 lần để dừng/phát • Chạm 2 lần để thả tim • Nhấn giữ để tăng tốc 2x"
                  >
                    {!isPlaying && !isVideoLoading && !playerError && (
                      <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-2xl animate-scale-up">
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

                {/* 3. Bottom Clean Karaoke Subtitle Box (Speaker 100% visible) */}
                <div className="relative z-10 p-4 bg-gradient-to-t from-black/95 via-black/85 to-transparent space-y-2">
                  {/* Real-time Subtitle Progress Line */}
                  <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-teal-400 transition-all duration-75 ease-linear"
                      style={{ width: `${cueProgress}%` }}
                    />
                  </div>

                  {/* Subtitle Card */}
                  <div 
                    onClick={replayCurrentSubtitle}
                    className="p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/20 shadow-xl cursor-pointer hover:border-teal-400/50 transition-colors"
                    title="Bấm vào thẻ để nghe lại câu này"
                  >
                    <p className="text-sm sm:text-base font-black text-white leading-relaxed">
                      {renderWords(currentSub.text)}
                    </p>
                    <p className="text-xs text-slate-300 mt-1.5 italic font-medium">
                      {!isWordRevealed && (isBlindMode || feedMode === 'youglish') ? (
                        <span className="text-amber-300/80 font-mono text-[11px] inline-flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>[ 🎧 Mở đáp án để xem bản dịch tiếng Việt ]</span>
                        </span>
                      ) : (
                        currentSub.translation
                      )}
                    </p>
                  </div>

                  {/* Channel Tag */}
                  <div className="text-white text-xs font-semibold drop-shadow flex items-center justify-between px-1">
                    <span className="font-bold text-amber-300 truncate max-w-[200px]">
                      @{currentShort.channel}
                    </span>
                    <span className="text-slate-300 text-[10px] shrink-0">
                      {currentShort.views} lượt xem
                    </span>
                  </div>
                </div>
              </div>

              {/* Outside Action Bar (Desktop Flanking Dock) */}
              <div className="flex flex-col items-center gap-2.5 shrink-0">
                {/* Like */}
                <button
                  onClick={() => setLiked(!liked)}
                  className="flex flex-col items-center gap-0.5 cursor-pointer group"
                >
                  <div className={`p-3 rounded-2xl backdrop-blur-md transition-all shadow-lg ${
                    liked ? 'bg-rose-500 text-white scale-110 shadow-rose-500/30' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}>
                    <Heart className={`w-5 h-5 ${liked ? 'fill-white' : ''}`} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {liked ? '1.4K' : '1.3K'}
                  </span>
                </button>

                {/* Bookmark */}
                <button
                  onClick={() => setBookmarked(!bookmarked)}
                  className="flex flex-col items-center gap-0.5 cursor-pointer group"
                >
                  <div className={`p-3 rounded-2xl backdrop-blur-md transition-all shadow-lg ${
                    bookmarked ? 'bg-amber-500 text-slate-950 scale-110 shadow-amber-500/30' : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}>
                    {bookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Lưu</span>
                </button>

                {/* 1-Tap Shadowing Mic Button */}
                <button
                  onClick={handleStartShadowing}
                  className={`p-3 rounded-2xl backdrop-blur-md transition-all cursor-pointer shadow-lg ${
                    isShadowing 
                      ? 'bg-rose-500 text-white scale-110 animate-ping shadow-rose-500/50' 
                      : 'bg-teal-500 hover:bg-teal-400 text-slate-950 font-black shadow-teal-500/20'
                  }`}
                  title="Nhại giọng câu này (1-Tap Shadowing AI)"
                >
                  {isShadowing ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                {/* Replay Current Subtitle */}
                <button
                  onClick={replayCurrentSubtitle}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-teal-400 backdrop-blur-md shadow-lg transition-all cursor-pointer"
                  title="Phát lại câu phụ đề này"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                {/* Subtitle Offset Calibration Toggle */}
                <button
                  onClick={() => setShowOffsetBar(!showOffsetBar)}
                  className={`p-3 rounded-2xl backdrop-blur-md transition-all cursor-pointer shadow-lg ${
                    subOffset !== 0 
                      ? 'bg-amber-500 text-slate-950 font-black' 
                      : 'bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Chỉnh độ lệch phụ đề (Lệch sub)"
                >
                  <SlidersHorizontal className="w-5 h-5" />
                </button>

                {/* YouGlish Live API Modal / Viewer Toggle */}
                <button
                  type="button"
                  onClick={() => setShowLiveYouglish(true)}
                  className="flex flex-col items-center gap-0.5 cursor-pointer group"
                  title="Mở tra cứu trực tiếp trên YouGlish Live (100M+ video)"
                >
                  <div className="p-3 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 group-hover:text-white group-hover:bg-red-600 backdrop-blur-md transition-all shadow-lg">
                    <Globe className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[10px] font-bold text-red-400 group-hover:text-red-300">Live API</span>
                </button>

                {/* Up / Down Navigation Buttons */}
                <div className="flex flex-col gap-1 pt-2 border-t border-slate-800">
                  <button
                    disabled={currentIndex === 0}
                    onClick={handlePrev}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white disabled:opacity-20 transition-all cursor-pointer shadow-md"
                    title="Shorts trước đó (Phím Mũi tên lên)"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                  <button
                    disabled={currentIndex === activeFeed.length - 1}
                    onClick={handleNext}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white disabled:opacity-20 transition-all cursor-pointer shadow-md"
                    title="Shorts tiếp theo (Phím Mũi tên xuống)"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ================= COLUMN 2: YOUGLISH STUDY COMPANION PANEL ================= */}
          <div className={`lg:col-span-6 xl:col-span-7 flex flex-col gap-4 w-full ${isMobileDrawerOpen ? 'block' : 'hidden lg:flex'}`}>
            
            {/* 1. Target Vocabulary Spotlight Card */}
            {currentShort.targetWord && (
              <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-start justify-between relative z-10 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl border border-amber-500/30">
                      🎯
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                          {!isWordRevealed ? 'Thử thách ôn tập SRS:' : 'YouGlish • Từ mục tiêu:'}
                        </span>
                        {currentOccurrence?.isDueToday && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
                            {!isWordRevealed ? 'Lắng nghe để nhớ từ' : 'Cần ôn hôm nay (SRS Due)'}
                          </span>
                        )}
                      </div>

                      {/* When Not Revealed: HIDE TARGET WORD COMPLETELY! */}
                      {!isWordRevealed ? (
                        <div className="flex items-center gap-2.5 mt-1.5">
                          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-dashed border-amber-400/60 text-amber-300 font-mono font-black text-lg tracking-widest flex items-center gap-2">
                            <span>• • • • • •</span>
                            <span className="text-[10px] font-sans text-amber-400 font-bold bg-amber-400/20 px-1.5 py-0.5 rounded">
                              {currentShort.targetWord?.length || 0} ký tự
                            </span>
                          </div>
                          <button
                            onClick={() => setIsWordRevealed(true)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Mở đáp án</span>
                          </button>
                        </div>
                      ) : (
                        <h2 className="text-2xl font-black text-amber-300 mt-0.5 tracking-tight animate-scale-up">
                          "{currentShort.targetWord}"
                        </h2>
                      )}
                    </div>
                  </div>

                  {!isWordRevealed ? (
                    <button
                      onClick={() => setIsWordRevealed(true)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl text-xs font-black border border-amber-400/40 shadow-sm transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem từ</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectWord(currentShort.targetWord!, currentShort.targetContext || '')}
                      className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-105 text-slate-950 rounded-xl text-xs font-black shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Tra từ & Lưu Anki</span>
                    </button>
                  )}
                </div>

                {/* Collocation & Real Context: Target word is masked if !isWordRevealed! */}
                {currentOccurrence?.collocation && (
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cụm từ tự nhiên (Collocation):</span>
                    </div>
                    {!isWordRevealed ? (
                      <div className="flex items-center justify-between text-slate-400 py-0.5">
                        <span className="font-mono text-amber-300/90 text-xs flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            {currentShort.targetWord
                              ? currentOccurrence.collocation.replace(new RegExp(`\\b${currentShort.targetWord}\\b`, 'gi'), '[ •••••• ]')
                              : '[ •••••• ]'}
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-500 italic">Mở đáp án để xem</span>
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-white text-sm">
                          {currentOccurrence.collocation}
                        </p>
                        {currentOccurrence.collocationTip && (
                          <p className="text-slate-400 text-[11px] italic">
                            {currentOccurrence.collocationTip}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Anki Flashcard Quick Rating (Appears as soon as answer is revealed) */}
                {isWordRevealed && (
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1.5 animate-fade-in">
                    <span className="text-[11px] font-bold text-slate-400 mr-1">Đánh giá Anki:</span>
                    <button
                      onClick={() => handleRateCard(1)}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                      title="Quên từ này — Ôn lại sau 1 ngày"
                    >
                      Quên (1d)
                    </button>
                    <button
                      onClick={() => handleRateCard(2)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer"
                      title="Từ khó nhớ — Ôn lại sau 3 ngày"
                    >
                      Khó (3d)
                    </button>
                    <button
                      onClick={() => handleRateCard(3)}
                      className="px-2.5 py-1 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[11px] font-bold hover:bg-teal-500 hover:text-slate-950 transition-colors cursor-pointer"
                      title="Nhớ tốt — Ôn lại sau 7 ngày"
                    >
                      Tốt (7d)
                    </button>
                    <button
                      onClick={() => handleRateCard(4)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                      title="Rất dễ — Ôn lại sau 14 ngày"
                    >
                      Dễ (14d)
                    </button>
                  </div>
                )}

                {/* Accent & Register Meta Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                    Giọng: {currentOccurrence?.zone === 'UK' ? '🇬🇧 Anh - Anh' : '🇺🇸 Anh - Mỹ'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold">
                    Ngữ cảnh: {currentOccurrence?.register === 'academic' ? '👔 Học thuật / Thuyết trình TED' : '☕ Đời thường / Giao tiếp'}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-semibold truncate max-w-xs">
                    Nguồn: {currentOccurrence?.sourceLessonTitle || currentShort.title}
                  </span>
                </div>

                {/* 1-Click YouGlish Live API Discovery Button */}
                <button
                  type="button"
                  onClick={() => setShowLiveYouglish(true)}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <Globe className="w-4 h-4 text-red-400" />
                  <span>Mở thêm hàng ngàn video phát âm từ "{currentShort.targetWord}" trên YouGlish Live</span>
                </button>
              </div>
            )}

            {/* 2. YouGlish Filters: Accents & Context Registers */}
            {feedMode === 'youglish' && (
              <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <ListFilter className="w-4 h-4 text-teal-400" />
                    <span>Lọc từ vựng trong sổ tay:</span>
                  </div>
                  <span>{availableWordsWithCount.length} từ đã học</span>
                </div>

                {/* Word Chips Carousel: Masked during Active Recall when in 'all' */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <button
                    onClick={() => setSelectedWordFilter('all')}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedWordFilter === 'all'
                        ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md font-black'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    Tất cả từ ({youglishOccurrences.length})
                  </button>

                  {!isWordRevealed && selectedWordFilter === 'all' ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-amber-500/30 text-amber-300 text-xs shrink-0">
                      <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Danh sách từ đang ẩn để nghe đoán (Active Recall)</span>
                      <button
                        onClick={() => setIsWordRevealed(true)}
                        className="ml-1 px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-bold border border-amber-500/30 cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Mở từ</span>
                      </button>
                    </div>
                  ) : (
                    availableWordsWithCount.map(({ word, count, isDue }) => (
                      <button
                        key={word}
                        onClick={() => setSelectedWordFilter(word)}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          selectedWordFilter && word && selectedWordFilter.toLowerCase() === word.toLowerCase()
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        {isDue && (
                          <span className="size-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                        <span>{word}</span>
                        <span className="opacity-60 text-[10px]">({count})</span>
                      </button>
                    ))
                  )}
                </div>

                {/* Accent and Register Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs font-bold text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 mr-1">Giọng:</span>
                    <button
                      onClick={() => setAccentFilter('GLOBAL')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${accentFilter === 'GLOBAL' ? 'bg-slate-700 text-white font-black' : 'hover:text-slate-200'}`}
                    >
                      Toàn cầu
                    </button>
                    <button
                      onClick={() => setAccentFilter('US')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${accentFilter === 'US' ? 'bg-slate-700 text-white font-black' : 'hover:text-slate-200'}`}
                    >
                      🇺🇸 Mỹ
                    </button>
                    <button
                      onClick={() => setAccentFilter('UK')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${accentFilter === 'UK' ? 'bg-slate-700 text-white font-black' : 'hover:text-slate-200'}`}
                    >
                      🇬🇧 Anh
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 mr-1">Văn cảnh:</span>
                    <button
                      onClick={() => setRegisterFilter('all')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${registerFilter === 'all' ? 'bg-slate-700 text-white font-black' : 'hover:text-slate-200'}`}
                    >
                      Mọi loại
                    </button>
                    <button
                      onClick={() => setRegisterFilter('academic')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${registerFilter === 'academic' ? 'bg-slate-700 text-white font-black' : 'hover:text-slate-200'}`}
                    >
                      Học thuật
                    </button>
                    <button
                      onClick={() => setRegisterFilter('casual')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${registerFilter === 'casual' ? 'bg-slate-700 text-white font-black' : 'hover:text-slate-200'}`}
                    >
                      Đời thường
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Interactive Subtitle & Transcript Flow (Click to Jump Video) */}
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-400" />
                  <span>Dòng phụ đề trích đoạn ({subtitles.length} câu):</span>
                </span>
                <span className="text-[11px] text-slate-500">
                  Nhấp vào câu bất kỳ để tua video
                </span>
              </div>

              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {subtitles.map((sub, idx) => {
                  const isActive = currentSubIndex === idx;
                  return (
                    <div
                      key={sub.id || idx}
                      onClick={() => seekToSubtitle(idx)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-teal-950/40 border-teal-400 shadow-md ring-1 ring-teal-400/30'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-mono font-bold text-teal-300">
                          #{idx + 1} • {Math.floor(sub.start)}s - {Math.floor(sub.end)}s
                        </span>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full bg-teal-500 text-slate-950 font-black text-[9px] animate-pulse">
                            Đang phát
                          </span>
                        )}
                      </div>
                      <p className={`text-xs sm:text-sm font-semibold leading-relaxed ${isActive ? 'text-teal-200 font-bold' : 'text-slate-200'}`}>
                        {renderWords(sub.text)}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 italic">
                        {!isWordRevealed && (isBlindMode || feedMode === 'youglish') ? (
                          <span className="text-amber-400/80 font-mono text-[10px] inline-flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            <span>[ 🎧 Mở đáp án để xem bản dịch tiếng Việt ]</span>
                          </span>
                        ) : (
                          sub.translation
                        )}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Learning Modes & Practice Switches */}
            <div className="grid grid-cols-2 gap-3">
              {/* Blind Mode */}
              <button
                onClick={() => setIsBlindMode(!isBlindMode)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                  isBlindMode 
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-md' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {isBlindMode ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                    <span>Nghe Mù (Cloze)</span>
                  </div>
                  <p className="text-[10px] opacity-70 mt-0.5">Ẩn từ khóa để luyện đoán</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isBlindMode ? 'bg-amber-400 text-slate-950' : 'bg-slate-800'}`}>
                  {isBlindMode ? 'BẬT' : 'TẮT'}
                </span>
              </button>

              {/* Cake Drill Mode */}
              <button
                onClick={() => setIsDrillMode(!isDrillMode)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-left ${
                  isDrillMode 
                    ? 'bg-teal-500/20 border-teal-400/60 text-teal-300 shadow-md' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <Repeat className="w-4 h-4 text-teal-400" />
                    <span>Lặp 3x (Drill Mode)</span>
                  </div>
                  <p className="text-[10px] opacity-70 mt-0.5">Tự lặp câu 3 lần</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isDrillMode ? 'bg-teal-400 text-slate-950' : 'bg-slate-800'}`}>
                  {isDrillMode ? 'BẬT' : 'TẮT'}
                </span>
              </button>
            </div>

            {/* Subtitle Offset Bar (Drawer Mode) */}
            {showOffsetBar && (
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-400/50 shadow-xl text-white space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4" /> 
                    Cân chỉnh độ lệch sub: {subOffset > 0 ? `+${subOffset}s` : `${subOffset}s`}
                  </span>
                  <button
                    onClick={() => handleAdjustOffset(0, true)}
                    className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Về mặc định
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <button
                    onClick={() => handleAdjustOffset(-0.5)}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    -0.5s
                  </button>
                  <button
                    onClick={() => handleAdjustOffset(-0.2)}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    -0.2s
                  </button>
                  <button
                    onClick={() => handleAdjustOffset(+0.2)}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    +0.2s
                  </button>
                  <button
                    onClick={() => handleAdjustOffset(+0.5)}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                  >
                    +0.5s
                  </button>
                  <button
                    onClick={() => setShowOffsetBar(false)}
                    className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* AI Speech Scoring Result Card */}
            {shadowResult && (
              <div className="p-4 rounded-3xl bg-slate-900 border border-teal-400 shadow-2xl text-white space-y-2 animate-scale-up">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-teal-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 
                    AI Chấm Điểm Phát Âm: {shadowResult.accuracy}%
                  </span>
                  <button
                    onClick={() => setShadowResult(null)}
                    className="text-slate-400 hover:text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-300 italic">
                  Bạn vừa nói: "{shadowResult.transcript || 'Không nghe rõ'}"
                </p>
                {shadowResult.accuracy >= 70 ? (
                  <p className="text-xs font-bold text-emerald-400">
                    🎉 Tuyệt vời! Thẻ Anki của từ "{currentShort.targetWord}" đã được cập nhật chu kỳ ghi nhớ!
                  </p>
                ) : (
                  <p className="text-xs text-amber-300">
                    💡 Hãy thử bấm lại nút micro và phát âm chậm, tròn vành rõ chữ hơn nhé.
                  </p>
                )}
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
};

export default ShortsView;
