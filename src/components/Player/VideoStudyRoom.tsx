import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VideoLesson, SubtitleLine } from '../../types';
import { 
  ArrowLeft, 
  Volume2, 
  Sparkles, 
  Play, 
  Video as VideoIcon,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  WifiOff,
  Zap,
  Loader2,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakWord, batchTranslateSubtitles } from '../../services/dictionaryService';
import { tokenizeText } from '../../utils/textTokenizer';
import { lingqWordService } from '../../services/lingqWordService';
import { 
  loadYouTubeIframeAPI, 
  retryLoadYouTubeIframeAPI, 
  parseYouTubePlayerError, 
  YouTubePlayerStatus, 
  YouTubePlayerError 
} from '../../services/youtubeLoader';
import { VideoControlsBar } from './VideoControlsBar';
import { SubtitlesTab } from './SubtitlesTab';
import { DictationTab } from './DictationTab';
import { ShadowingTab } from './ShadowingTab';
import { QuizTab } from './QuizTab';

interface VideoStudyRoomProps {
  lesson: VideoLesson;
  onBack: () => void;
  onSelectWord: (word: string, contextSentence: string) => void;
  onUpdateLesson?: (updated: VideoLesson) => void;
  initialMode?: StudyMode;
}

type StudyMode = 'subtitles' | 'dictation' | 'shadowing' | 'quiz';

export const VideoStudyRoom: React.FC<VideoStudyRoomProps> = ({
  lesson,
  onBack,
  onSelectWord,
  onUpdateLesson,
  initialMode = 'subtitles'
}) => {
  const [activeMode, setActiveMode] = useState<StudyMode>(initialMode);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isSyncingCaptions, setIsSyncingCaptions] = useState<boolean>(false);
  const [vocabVersion, setVocabVersion] = useState<number>(0);

  // Subscribe to LingQ vocabulary status changes
  useEffect(() => {
    return lingqWordService.subscribe(() => {
      setVocabVersion(v => v + 1);
    });
  }, []);
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number>(0);
  const [showVietnamese, setShowVietnamese] = useState<boolean>(true);
  const [showSpotlightCard, setShowSpotlightCard] = useState<boolean>(() => {
    try {
      return localStorage.getItem('4you_show_spotlight_card') !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleSpotlightCard = (visible: boolean) => {
    setShowSpotlightCard(visible);
    try {
      localStorage.setItem('4you_show_spotlight_card', String(visible));
    } catch {}
  };

  // Player refs & resilient states
  const playerRef = useRef<any>(null);
  const activeSubRef = useRef<HTMLDivElement>(null);
  const loopTimeoutRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [playerStatus, setPlayerStatus] = useState<YouTubePlayerStatus>('loading');
  const [playerError, setPlayerError] = useState<YouTubePlayerError | null>(null);
  const [useDirectIframe, setUseDirectIframe] = useState<boolean>(false);
  const [loadAttempts, setLoadAttempts] = useState<number>(0);

  // Shadowing State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [spokenText, setSpokenText] = useState<string>('');
  const [shadowScore, setShadowScore] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Dictation State
  const [dictationInput, setDictationInput] = useState<string>('');
  const [dictationChecked, setDictationChecked] = useState<boolean>(false);
  const [showDictationAnswer, setShowDictationAnswer] = useState<boolean>(false);
  const [completedDictations, setCompletedDictations] = useState<Set<number>>(new Set());

  const [subOffset, setSubOffset] = useState<number>(() => lesson.subtitleOffset || 0);
  const isSeekingRef = useRef<boolean>(false);
  const seekCooldownTimerRef = useRef<any>(null);

  const rawSubtitles = lesson.subtitles || [];
  const subtitles: SubtitleLine[] = React.useMemo(() => {
    if (subOffset === 0) return rawSubtitles;
    return rawSubtitles.map(s => ({
      ...s,
      start: Math.max(0, Number((s.start + subOffset).toFixed(2))),
      end: Math.max(0.2, Number((s.end + subOffset).toFixed(2)))
    }));
  }, [rawSubtitles, subOffset]);

  // Handler to adjust and permanently save subtitle offset calibration to the lesson
  const handleSetSubOffset = useCallback((offsetOrUpdater: number | ((prev: number) => number)) => {
    setSubOffset((prev) => {
      const nextOffset = typeof offsetOrUpdater === 'function' ? offsetOrUpdater(prev) : offsetOrUpdater;
      const rounded = Number(nextOffset.toFixed(2));
      if (onUpdateLesson) {
        onUpdateLesson({
          ...lesson,
          subtitleOffset: rounded
        });
      }
      return rounded;
    });
  }, [lesson, onUpdateLesson]);

  const currentSub = (activeSubtitleIndex >= 0 ? subtitles[activeSubtitleIndex] : null) || subtitles[0] || {
    id: 's0',
    start: 0,
    end: 5,
    text: 'Welcome to this lesson.',
    translation: 'Chào mừng bạn đến với bài học này.'
  };

  // 1. Initialize Real YouTube IFrame Player API with Timeout & Network Resilience
  useEffect(() => {
    let isMounted = true;
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);

    if (useDirectIframe) {
      setPlayerStatus('ready');
      setPlayerError(null);
      return;
    }

    setPlayerStatus('loading');
    setPlayerError(null);

    const initPlayer = () => {
      if (!isMounted) return;
      if (!window.YT || !window.YT.Player) {
        throw new Error('window.YT.Player is not ready');
      }

      if (!playerContainerRef.current) return;

      // Always reset DOM container to avoid YouTube iframe destruction bugs
      playerContainerRef.current.innerHTML = '<div id="yt-player-iframe" class="w-full h-full"></div>';

      try {
        playerRef.current = new window.YT.Player('yt-player-iframe', {
          videoId: lesson.youtubeId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            enablejsapi: 1,
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              if (!isMounted) return;
              playerRef.current = event.target;
              setPlayerStatus('ready');
              if (typeof playerRef.current.setPlaybackRate === 'function') {
                playerRef.current.setPlaybackRate(playbackRate);
              }
            },
            onStateChange: (event: any) => {
              if (!isMounted) return;
              if (event.data === 1) { // PLAYING
                setIsPlaying(true);
                setPlayerStatus('playing');
              } else if (event.data === 2) { // PAUSED
                setIsPlaying(false);
                setPlayerStatus('paused');
              } else if (event.data === 3) { // BUFFERING
                setPlayerStatus('buffering');
              } else if (event.data === 0) { // ENDED
                setIsPlaying(false);
                setPlayerStatus('ready');
              }
            },
            onError: (event: any) => {
              if (!isMounted) return;
              const parsed = parseYouTubePlayerError(event.data);
              setPlayerStatus('error');
              setPlayerError(parsed);
              console.warn('[VideoStudyRoom] YouTube player error:', parsed);
            }
          }
        });
      } catch (err: any) {
        console.warn('[VideoStudyRoom] Failed to instantiate YT.Player:', err);
        if (!isMounted) return;
        setPlayerStatus('error');
        setPlayerError(parseYouTubePlayerError(999));
      }
    };

    // Load YouTube API script with 4.5s timeout watchdog
    loadYouTubeIframeAPI(4500)
      .then(() => {
        if (!isMounted) return;
        initPlayer();
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[VideoStudyRoom] YouTube API load failed or timed out:', err);
        setPlayerStatus('error');
        setPlayerError(parseYouTubePlayerError(999));
      });

    return () => {
      isMounted = false;
      if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch (e) {
          console.warn('[VideoStudyRoom] Error destroying player:', e);
        }
      }
    };
  }, [lesson.youtubeId, useDirectIframe, loadAttempts]);

  // Reset exercise and subtitle progress when switching lesson
  useEffect(() => {
    setActiveSubtitleIndex(subtitles.length > 0 && currentTime < subtitles[0].start ? -1 : 0);
    setSubOffset(lesson.subtitleOffset || 0);
    setCurrentTime(0);
    setDictationInput('');
    setDictationChecked(false);
    setShowDictationAnswer(false);
    setCompletedDictations(new Set());
    setSpokenText('');
    setShadowScore(null);
  }, [lesson.id]);

  // Robust helper to acquire the active YouTube player instance
  const getPlayer = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      return playerRef.current;
    }
    if (typeof window !== 'undefined' && window.YT && typeof window.YT.get === 'function') {
      const p = window.YT.get('yt-player-iframe');
      if (p && typeof p.seekTo === 'function') {
        playerRef.current = p;
        return p;
      }
    }
    return null;
  }, []);

  // Handler to sync complete, authentic subtitles from YouTube API
  const handleSyncFromYouTube = useCallback(async (isManual: boolean = false) => {
    if (isSyncingCaptions) return;
    setIsSyncingCaptions(true);
    try {
      const res = await fetch(`/api/youtube-captions?v=${lesson.youtubeId}`);
      if (!res.ok) throw new Error('Không thể tải phụ đề YouTube');
      const data = await res.json();
      if (data.subtitles && data.subtitles.length > 0) {
        let finalSubs = data.subtitles;
        const missing = finalSubs.filter((s: any) => !s.translation || !s.translation.trim());
        if (missing.length > 0) {
          const trans = await batchTranslateSubtitles(missing);
          let mIdx = 0;
          finalSubs = finalSubs.map((s: any) => {
            if (!s.translation || !s.translation.trim()) {
              return { ...s, translation: trans[mIdx++] || s.text };
            }
            return s;
          });
        }
        const updatedLesson: VideoLesson = {
          ...lesson,
          subtitles: finalSubs
        };
        if (onUpdateLesson) {
          onUpdateLesson(updatedLesson);
        }
        if (isManual) {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        }
      }
    } catch (err) {
      console.warn('Sync subtitles error:', err);
    } finally {
      setIsSyncingCaptions(false);
    }
  }, [lesson, isSyncingCaptions, onUpdateLesson]);

  // Auto-upgrade safety net: If lesson has fewer than 20 subtitles and has a YouTube ID,
  // silently fetch full authentic YouTube subtitles in the background
  useEffect(() => {
    if (lesson.youtubeId && (!lesson.subtitles || lesson.subtitles.length < 20) && !isSyncingCaptions) {
      handleSyncFromYouTube(false);
    }
  }, [lesson.id, lesson.youtubeId]);

  // 2. Real-time time sync directly from YouTube Player with Precision Subtitle Tracking Engine
  useEffect(() => {
    const timer = setInterval(() => {
      // Avoid time sync fight when user just clicked seek
      if (isSeekingRef.current) return;

      const player = getPlayer();
      if (player && typeof player.getCurrentTime === 'function') {
        try {
          const time = player.getCurrentTime();
          if (typeof time === 'number' && !isNaN(time)) {
            setCurrentTime(time);

            // Subtitle segment auto-loop handling
            if (isLooping && activeSubtitleIndex >= 0 && time >= currentSub.end - 0.08) {
              player.seekTo(currentSub.start, true);
              return;
            }

            // In subtitles mode, automatically track active subtitle with zero-lag precision
            if (activeMode === 'subtitles' && subtitles.length > 0) {
              // 40ms lookahead counteracts YouTube iframe postMessage IPC latency
              const effectiveTime = time + 0.04;

              // Phase A: Before first subtitle (Intro)
              if (effectiveTime < subtitles[0].start - 0.05) {
                if (activeSubtitleIndex !== -1) {
                  setActiveSubtitleIndex(-1);
                }
                return;
              }

              // Phase B: Past last subtitle
              const lastSub = subtitles[subtitles.length - 1];
              if (effectiveTime >= lastSub.end + 0.35) {
                if (activeSubtitleIndex !== -1) {
                  setActiveSubtitleIndex(-1);
                }
                return;
              }

              // Phase C: Precision Interval Search with Gap Handling
              let matchedIdx = -1;

              // O(1) Fast path: Check current active subtitle first
              if (activeSubtitleIndex >= 0 && activeSubtitleIndex < subtitles.length) {
                const cur = subtitles[activeSubtitleIndex];
                const next = subtitles[activeSubtitleIndex + 1];
                const bridgeLimit = next && (next.start - cur.end <= 0.45) 
                  ? next.start - 0.04 
                  : cur.end + 0.2;

                if (effectiveTime >= cur.start - 0.04 && effectiveTime < bridgeLimit) {
                  matchedIdx = activeSubtitleIndex;
                }
              }

              // If fast path didn't match (e.g. video progressed or user scrubbed)
              if (matchedIdx === -1) {
                let low = 0;
                let high = subtitles.length - 1;

                while (low <= high) {
                  const mid = Math.floor((low + high) / 2);
                  const sub = subtitles[mid];
                  const nextSub = subtitles[mid + 1];
                  const bridgeLimit = nextSub && (nextSub.start - sub.end <= 0.45)
                    ? nextSub.start - 0.04
                    : sub.end + 0.2;

                  if (effectiveTime < sub.start - 0.04) {
                    high = mid - 1;
                  } else if (effectiveTime >= bridgeLimit) {
                    low = mid + 1;
                  } else {
                    matchedIdx = mid;
                    break;
                  }
                }
              }

              // Update active index
              if (matchedIdx !== activeSubtitleIndex) {
                setActiveSubtitleIndex(matchedIdx);
              }
            }
          }
        } catch (e) {
          // ignore potential iframe communication errors
        }
      }
    }, 40);

    return () => clearInterval(timer);
  }, [activeMode, subtitles, activeSubtitleIndex, isLooping, currentSub, getPlayer]);

  // Auto scroll active subtitle into view
  useEffect(() => {
    if (activeSubRef.current && activeMode === 'subtitles') {
      activeSubRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeSubtitleIndex, activeMode]);

  // Play video segment for current subtitle (e.g. for Dictation or Shadowing)
  const playVideoSegment = useCallback((sub: SubtitleLine) => {
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    const player = getPlayer();
    if (player && typeof player.seekTo === 'function') {
      // 50ms pre-roll to prevent swallowing the opening consonant
      const seekTarget = Math.max(0, sub.start - 0.05);
      player.seekTo(seekTarget, true);
      if (typeof player.playVideo === 'function') {
        player.playVideo();
      }

      // Duration scaled accurately by current playback speed
      const durationMs = Math.max(800, (((sub.end - sub.start) / playbackRate) * 1000) + 150);
      loopTimeoutRef.current = setTimeout(() => {
        if (player && typeof player.pauseVideo === 'function') {
          player.pauseVideo();
        }
      }, durationMs);
    } else {
      speakWord(sub.text, 'en', playbackRate);
    }
  }, [playbackRate, getPlayer]);

  // Jump video to subtitle and seek
  const jumpToSubtitle = useCallback((sub: SubtitleLine, index: number) => {
    // Acquire seeking lock to prevent polling loop from snapping back to old time
    isSeekingRef.current = true;
    if (seekCooldownTimerRef.current) clearTimeout(seekCooldownTimerRef.current);
    seekCooldownTimerRef.current = setTimeout(() => {
      isSeekingRef.current = false;
    }, 350);

    setActiveSubtitleIndex(index);
    setCurrentTime(sub.start);
    setDictationInput('');
    setDictationChecked(false);
    setShowDictationAnswer(false);
    setSpokenText('');
    setShadowScore(null);

    const player = getPlayer();
    if (player) {
      try {
        if (typeof player.seekTo === 'function') {
          // 50ms pre-roll ensures clean playback from the very first phoneme
          const seekTarget = Math.max(0, sub.start - 0.05);
          player.seekTo(seekTarget, true);
        }
        if (typeof player.playVideo === 'function') {
          player.playVideo();
        }
      } catch (err) {
        console.warn('YouTube seek error:', err);
      }
    }
  }, [getPlayer]);

  // Speed change handler
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    const player = getPlayer();
    if (player && typeof player.setPlaybackRate === 'function') {
      player.setPlaybackRate(rate);
    }
  };

  // Play / Pause toggle
  const handleTogglePlay = () => {
    const player = getPlayer();
    if (player) {
      if (isPlaying) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    }
  };

  // Global Keyboard Shortcuts (Space: Play/Pause, A: Prev Sub, D: Next Sub, R: Replay)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger hotkeys if user is actively typing in a textarea or input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'KeyA') {
        e.preventDefault();
        if (activeSubtitleIndex > 0) {
          const prev = activeSubtitleIndex - 1;
          jumpToSubtitle(subtitles[prev], prev);
        }
      } else if (e.code === 'KeyD') {
        e.preventDefault();
        if (activeSubtitleIndex < subtitles.length - 1) {
          const next = activeSubtitleIndex + 1;
          jumpToSubtitle(subtitles[next], next);
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        jumpToSubtitle(currentSub, activeSubtitleIndex);
      } else if (e.code === 'BracketLeft') {
        e.preventDefault();
        handleSetSubOffset((prev: number) => Number((prev - 0.1).toFixed(2)));
      } else if (e.code === 'BracketRight') {
        e.preventDefault();
        handleSetSubOffset((prev: number) => Number((prev + 0.1).toFixed(2)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, activeSubtitleIndex, subtitles, currentSub, jumpToSubtitle, handleSetSubOffset]);

  // Speech Recognition for Shadowing
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setSpokenText(transcript);

        if (event.results[0].isFinal) {
          const target = currentSub.text.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
          const spoken = transcript.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
          
          const targetWords = target.split(/\s+/).filter(Boolean);
          const spokenWords = spoken.split(/\s+/).filter(Boolean);
          
          let matches = 0;
          targetWords.forEach((tw) => {
            if (spokenWords.includes(tw)) matches++;
          });

          const accuracy = Math.min(100, Math.round((matches / Math.max(1, targetWords.length)) * 100));
          setShadowScore(accuracy);
          setIsRecording(false);

          if (accuracy >= 80) {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          }
        }
      };

      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);

      recognitionRef.current = recognition;
    }
  }, [currentSub]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Trình duyệt của bạn chưa hỗ trợ Web Speech API. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setSpokenText('');
      setShadowScore(null);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
        setIsRecording(false);
      }
    }
  };

  const handleWordClick = (
    word: string,
    sentenceText: string,
    sub: SubtitleLine | undefined,
    index: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    // Pause video to allow quiet vocabulary inspection
    const player = getPlayer();
    if (player && typeof player.pauseVideo === 'function') {
      player.pauseVideo();
    }
    if (sub) {
      setActiveSubtitleIndex(index);
      setCurrentTime(sub.start);
      if (player && typeof player.seekTo === 'function') {
        player.seekTo(sub.start, true);
      }
    }
    onSelectWord(word, sentenceText);
  };

  const vocabStats = React.useMemo(() => {
    return lingqWordService.getLessonVocabularyStats(subtitles);
  }, [subtitles, vocabVersion]);

  const renderClickableWords = (text: string, sub?: SubtitleLine, index?: number) => {
    const targetSub = sub || currentSub;
    const targetIndex = typeof index === 'number' ? index : activeSubtitleIndex;
    const tokens = tokenizeText(text);

    return tokens.map((token, i) => {
      if (token.isWord) {
        const wordKey = token.lookupWord || token.text;
        const status = lingqWordService.getWordStatus(wordKey);
        const badgeClass = lingqWordService.getBadgeStyle(status);
        const statusMeta = lingqWordService.getStatusLabel(status);

        return (
          <span
            key={i}
            onClick={(e) => handleWordClick(wordKey, text, targetSub, targetIndex, e)}
            className={`clickable-word ${badgeClass} active:scale-95 cursor-pointer inline-block`}
            title={`Nhấn để tra từ • ${statusMeta.label}`}
          >
            {token.text}
          </span>
        );
      }
      return <span key={i}>{token.text}</span>;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 lg:pb-10 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-800">
              {lesson.level}
            </span>
            <span className="text-sm font-bold text-slate-700 hidden sm:inline truncate max-w-xs">
              {lesson.title}
            </span>
            <div 
              className="hidden md:flex items-center gap-1.5 text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-600 font-bold border border-slate-200/60"
              title={`Vốn từ vựng đã thuộc: ${vocabStats.knownCount}/${vocabStats.totalWords} từ (${vocabStats.percentKnown}%)`}
            >
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Vốn từ: {vocabStats.percentKnown}%</span>
            </div>
          </div>

          <button
            onClick={() => setShowVietnamese(!showVietnamese)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              showVietnamese 
                ? 'bg-teal-50 border-teal-200 text-teal-700' 
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            <span>{showVietnamese ? '🇻🇳 Đang hiện dịch nghĩa' : '🇻🇳 Đã ẩn dịch nghĩa'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: YouTube Video Player & Speed Playbar (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-video w-full rounded-3xl overflow-hidden shadow-xl bg-slate-950 border border-slate-800">
            {/* 1. Underlying Direct IFrame fallback OR YouTube API Player mount */}
            {useDirectIframe ? (
              <iframe
                key={`direct-iframe-${lesson.youtubeId}-${loadAttempts}`}
                src={`https://www.youtube-nocookie.com/embed/${lesson.youtubeId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&origin=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : '')}`}
                title={lesson.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div ref={playerContainerRef} className="w-full h-full">
                <div id="yt-player-iframe" className="w-full h-full" />
              </div>
            )}

            {/* 2. Poster & Buffering/Loading Overlay */}
            {playerStatus === 'loading' && !useDirectIframe && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xs">
                <img
                  src={lesson.thumbnail || `https://img.youtube.com/vi/${lesson.youtubeId}/hqdefault.jpg`}
                  alt={lesson.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-25 filter blur-xs"
                />
                <div className="relative z-10 flex flex-col items-center p-6 text-center max-w-md">
                  <div className="relative mb-4">
                    <div className="size-14 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                      <Loader2 className="w-7 h-7 animate-spin" />
                    </div>
                  </div>
                  <p className="text-white font-bold text-base mb-1">
                    Đang kết nối video bài học...
                  </p>
                  <p className="text-slate-400 text-xs mb-4">
                    Đang đồng bộ phụ đề song ngữ và chuẩn bị phòng học phản xạ
                  </p>
                  <button
                    type="button"
                    onClick={() => setUseDirectIframe(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-95 shadow-sm cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Mạng chậm? Bấm phát ngay bằng IFrame
                  </button>
                </div>
              </div>
            )}

            {/* 3. Error Diagnostics & Recovery Overlay */}
            {playerStatus === 'error' && !useDirectIframe && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-sm p-6 text-center">
                <img
                  src={lesson.thumbnail || `https://img.youtube.com/vi/${lesson.youtubeId}/hqdefault.jpg`}
                  alt={lesson.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-15 filter grayscale"
                />
                <div className="relative z-10 max-w-md w-full bg-slate-900/95 border border-slate-800 p-5 rounded-2xl shadow-2xl text-left">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="size-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                      {playerError?.isNetworkIssue ? (
                        <WifiOff className="w-5 h-5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {playerError?.title || 'Không thể tải video'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                        {playerError?.message || 'Kết nối đến YouTube bị gián đoạn hoặc quá thời gian chờ (timeout).'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setPlayerStatus('loading');
                        setUseDirectIframe(true);
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      Phát ngay (Nocookie)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlayerStatus('loading');
                        setLoadAttempts(a => a + 1);
                        retryLoadYouTubeIframeAPI();
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                      Thử lại kết nối
                    </button>
                  </div>

                  <div className="mt-3 text-center">
                    <a
                      href={`https://www.youtube.com/watch?v=${lesson.youtubeId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-teal-400 transition-colors"
                    >
                      <span>Xem trực tiếp trên YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Active Direct IFrame Badge & Reconnect API button */}
            {useDirectIframe && (
              <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md text-[11px] font-semibold text-slate-300 border border-slate-700/80 shadow-lg">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Chế độ IFrame trực tiếp</span>
                <button
                  type="button"
                  onClick={() => {
                    setUseDirectIframe(false);
                    setLoadAttempts(a => a + 1);
                  }}
                  className="ml-1 text-teal-400 hover:text-teal-300 underline font-bold cursor-pointer"
                  title="Thử chuyển lại API đồng bộ từng giây"
                >
                  Thử lại API
                </button>
              </div>
            )}
          </div>

          {/* Video Speed Bar & Repeat Controls */}
          <VideoControlsBar
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            playbackRate={playbackRate}
            onChangePlaybackRate={handleRateChange}
            isLooping={isLooping}
            onToggleLoop={() => setIsLooping(!isLooping)}
            onReplayCurrentSub={() => jumpToSubtitle(currentSub, activeSubtitleIndex)}
          />

          {/* Current Subtitle Spotlight Card - Strictly hidden during Dictation, Shadowing, and Quiz */}
          {activeMode === 'subtitles' && showSpotlightCard && (
            <div className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-3">
              {activeSubtitleIndex === -1 ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 font-bold text-base">
                      🎬
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-950">
                        Đoạn mở đầu (Intro) • Lời thoại bắt đầu tại {Math.floor(subtitles[0]?.start || 0)}s
                      </p>
                      <p className="text-[11px] text-amber-800/80 mt-0.5">
                        Hiện tại: {currentTime.toFixed(1)}s • Phụ đề sẽ tự động làm nổi bật khi lời thoại vang lên
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {subtitles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => jumpToSubtitle(subtitles[0], 0)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                      >
                        Bỏ qua Intro ➔
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleToggleSpotlightCard(false)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Ẩn khung câu thoại này"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Câu #{activeSubtitleIndex + 1}/{subtitles.length} ({Math.floor(currentSub.start)}s - {Math.floor(currentSub.end)}s)
                      <span className="text-slate-400 font-normal">| Hiện tại: {currentTime.toFixed(1)}s</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => playVideoSegment(currentSub)}
                        className="p-1.5 rounded-xl bg-white/80 text-teal-700 hover:bg-teal-100 shadow-sm transition-all flex items-center gap-1 text-[11px] font-bold px-2.5 cursor-pointer"
                        title="Phát trích đoạn từ Video"
                      >
                        <VideoIcon className="w-3.5 h-3.5" /> Nghe từ video
                      </button>
                      <button
                        onClick={() => speakWord(currentSub.text, 'en', playbackRate)}
                        className="p-1.5 rounded-xl bg-white/80 text-teal-700 hover:bg-teal-100 shadow-sm transition-all cursor-pointer"
                        title="Nghe phát âm chuẩn AI"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleSpotlightCard(false)}
                        className="p-1.5 rounded-xl bg-white/80 text-slate-400 hover:text-slate-700 hover:bg-slate-100 shadow-sm transition-all cursor-pointer ml-1"
                        title="Ẩn khung câu thoại này"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-base font-extrabold text-slate-900 leading-relaxed">
                    {renderClickableWords(currentSub.text, currentSub, activeSubtitleIndex)}
                  </p>
                  {showVietnamese && (
                    <p className="text-sm font-medium text-teal-800 mt-1 italic">
                      {currentSub.translation}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Re-open button if dismissed in subtitles mode */}
          {activeMode === 'subtitles' && !showSpotlightCard && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleToggleSpotlightCard(true)}
                className="text-[11px] font-bold text-slate-500 hover:text-teal-700 transition-colors flex items-center gap-1.5 cursor-pointer bg-slate-100/80 hover:bg-slate-200/80 px-3 py-1.5 rounded-full border border-slate-200/80 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Hiện khung câu thoại nổi bật</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Study Modes (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Mode Tabs */}
          <div 
            role="tablist" 
            aria-label="Chế độ học"
            className="flex p-1.5 rounded-2xl bg-slate-200/80 gap-1"
          >
            {[
              { id: 'subtitles', label: 'Song ngữ đồng bộ' },
              { id: 'dictation', label: 'Chép chính tả' },
              { id: 'shadowing', label: 'Shadowing' },
              { id: 'quiz', label: 'Trắc nghiệm' },
            ].map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeMode === tab.id}
                onClick={() => {
                  setActiveMode(tab.id as StudyMode);
                  if (tab.id !== 'subtitles' && playerRef.current?.pauseVideo) {
                    playerRef.current.pauseVideo();
                  }
                  if (tab.id === 'dictation' || tab.id === 'shadowing') {
                    setTimeout(() => playVideoSegment(currentSub), 250);
                  }
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeMode === tab.id
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: Subtitles List */}
          {activeMode === 'subtitles' && (
            <SubtitlesTab
              subtitles={subtitles}
              activeSubtitleIndex={activeSubtitleIndex}
              showVietnamese={showVietnamese}
              onJumpToSubtitle={jumpToSubtitle}
              renderClickableWords={renderClickableWords}
              activeSubRef={activeSubRef}
              subOffset={subOffset}
              onSetSubOffset={handleSetSubOffset}
              onSyncFullYouTube={() => handleSyncFromYouTube(true)}
              isSyncing={isSyncingCaptions}
            />
          )}

          {/* TAB 2: Dictation Mode */}
          {activeMode === 'dictation' && (
            <DictationTab
              currentSub={currentSub}
              subtitles={subtitles}
              activeSubtitleIndex={activeSubtitleIndex}
              dictationInput={dictationInput}
              setDictationInput={setDictationInput}
              dictationChecked={dictationChecked}
              setDictationChecked={setDictationChecked}
              showDictationAnswer={showDictationAnswer}
              setShowDictationAnswer={setShowDictationAnswer}
              completedDictations={completedDictations}
              setCompletedDictations={setCompletedDictations}
              onPlayVideoSegment={playVideoSegment}
              onSpeakWord={(t) => speakWord(t, 'en', playbackRate)}
              onJumpToSubtitle={jumpToSubtitle}
              showVietnamese={showVietnamese}
              renderClickableWords={renderClickableWords}
            />
          )}

          {/* TAB 3: Shadowing Mode */}
          {activeMode === 'shadowing' && (
            <ShadowingTab
              currentSub={currentSub}
              subtitles={subtitles}
              activeSubtitleIndex={activeSubtitleIndex}
              isRecording={isRecording}
              spokenText={spokenText}
              shadowScore={shadowScore}
              onToggleRecording={toggleRecording}
              onPlayVideoSegment={playVideoSegment}
              onSpeakWord={(t) => speakWord(t, 'en', playbackRate)}
              onJumpToSubtitle={jumpToSubtitle}
              renderClickableWords={renderClickableWords}
            />
          )}

          {/* TAB 4: Quiz Mode */}
          {activeMode === 'quiz' && (
            <QuizTab quizzes={lesson.quizzes || []} />
          )}
        </div>
      </main>
    </div>
  );
};

export default VideoStudyRoom;
