import React, { useState, useEffect, useRef, useId } from 'react';
import {
  Search,
  ExternalLink,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Loader2,
  Globe,
  Film,
  Volume2,
  RefreshCw,
  X
} from 'lucide-react';
import { ModalPortal } from '../Common/ModalPortal';
import {
  ensureYouGlishApi,
  YouGlishLoadError,
  YouGlishWidgetInstance
} from '../../services/youglishScriptLoader';
import {
  AccentFilter,
  LocalVideoClip,
  searchLocalVideoContexts
} from '../../services/localVideoContextSearch';
import { speakWord } from '../../services/dictionaryService';

interface YouGlishLiveWidgetProps {
  initialWord: string;
  accent?: AccentFilter;
  asModal?: boolean;
  onClose?: () => void;
  onSelectWord?: (word: string) => void;
}

type FailureReason = 'SCRIPT_BLOCKED' | 'TIMEOUT' | 'PLAYER_ERROR' | 'EMPTY' | null;
type PlayerMode = 'youglish' | 'local_fallback';

function highlightTokenInSentence(sentence: string, token: string): React.ReactNode {
  const clean = token.trim();
  if (!clean) return sentence;
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = sentence.split(new RegExp(`(${escaped}\\w*)`, 'gi'));
  return parts.map((part, idx) =>
    idx % 2 === 1 ? (
      <mark
        key={idx}
        className="px-1 py-0.5 rounded bg-teal-400/25 text-teal-200 font-black"
      >
        {part}
      </mark>
    ) : (
      <React.Fragment key={idx}>{part}</React.Fragment>
    )
  );
}

function getErrorDescription(reason: FailureReason, word: string): string {
  switch (reason) {
    case 'EMPTY':
      return `YouGlish không tìm thấy clip cho cụm "${word}". Bạn có thể rút gọn từ khóa hoặc mở trực tiếp bên dưới.`;
    case 'SCRIPT_BLOCKED':
      return 'Trình duyệt máy tính đang chặn YouGlish (thường do AdBlock / uBlock hoặc tắt Third-Party Cookies). Hãy tắt chặn quảng cáo cho trang này hoặc mở trực tiếp bên dưới.';
    case 'PLAYER_ERROR':
      return 'YouGlish Player gặp lỗi kết nối YouTube (có thể do hết lượt miễn phí/ngày hoặc extension chặn iframe).';
    case 'TIMEOUT':
    default:
      return 'YouGlish phản hồi quá chậm hoặc bị trình duyệt chặn bên thứ ba trên máy tính.';
  }
}

export const YouGlishLiveWidget: React.FC<YouGlishLiveWidgetProps> = ({
  initialWord,
  accent = 'US',
  asModal = false,
  onClose,
  onSelectWord
}) => {
  const [currentWord, setCurrentWord] = useState<string>(initialWord || 'complicated');
  const [searchInput, setSearchInput] = useState<string>(initialWord || 'complicated');
  const [selectedAccent, setSelectedAccent] = useState<AccentFilter>(accent);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [currentTrack, setCurrentTrack] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [failureReason, setFailureReason] = useState<FailureReason>(null);
  const [playerMode, setPlayerMode] = useState<PlayerMode>('youglish');
  const [localClips, setLocalClips] = useState<LocalVideoClip[]>([]);
  const [localClipIndex, setLocalClipIndex] = useState<number>(0);
  const [localReplayNonce, setLocalReplayNonce] = useState<number>(0);
  const [retryNonce, setRetryNonce] = useState<number>(0);

  const widgetRef = useRef<YouGlishWidgetInstance | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rawId = useId();
  const baseId = `youglish-embed-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Sync initialWord changes
  useEffect(() => {
    if (initialWord && initialWord !== currentWord) {
      setCurrentWord(initialWord);
      setSearchInput(initialWord);
    }
  }, [initialWord, currentWord]);

  // Close modal on Escape key
  useEffect(() => {
    if (!asModal || !onClose) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [asModal, onClose]);

  // Tier-1: Official `window.onYouglishAPIReady` loader + 7s watchdog
  // Tier-2: Automatic fallback to internal YouTube-NoCookie subtitle corpus
  useEffect(() => {
    let isCancelled = false;
    const hostNode = hostRef.current;
    setIsLoading(true);
    setFailureReason(null);
    setPlayerMode('youglish');
    setLocalClips([]);
    setLocalClipIndex(0);
    setTotalResults(0);
    setCurrentTrack(1);

    const activateFallbackOrFail = async (reason: Exclude<FailureReason, null>) => {
      if (isCancelled) return;
      const clips = await searchLocalVideoContexts(currentWord, selectedAccent);
      if (isCancelled) return;

      if (clips.length > 0) {
        setLocalClips(clips);
        setLocalClipIndex(0);
        setTotalResults(clips.length);
        setCurrentTrack(1);
        setFailureReason(reason);
        setPlayerMode('local_fallback');
        setIsLoading(false);
        return;
      }

      setFailureReason(reason);
      setIsLoading(false);
    };

    const loadTimeout = window.setTimeout(() => {
      if (!isCancelled) {
        void activateFallbackOrFail('TIMEOUT');
      }
    }, 7000);

    const clearWatchdog = () => window.clearTimeout(loadTimeout);

    ensureYouGlishApi(7000)
      .then((YG) => {
        if (isCancelled) return;
        const host = hostRef.current;
        if (!host) return;

        // Fresh imperative mount node so YouGlish's `outerHTML` replacement never breaks React reconciliation
        const mountId = `${baseId}-${Date.now()}`;
        host.innerHTML = '';
        const mountEl = document.createElement('div');
        mountEl.id = mountId;
        host.appendChild(mountEl);

        const numericWidth = Math.max(320, Math.min(720, Math.round(host.clientWidth || 640)));

        const widgetInstance = new YG.Widget(mountId, {
          width: numericWidth,
          height: 440,
          components: 72, // Video player (64) + Captions (8)
          autoStart: 1,
          events: {
            onFetchDone: (event) => {
              if (isCancelled) return;
              clearWatchdog();
              const count = Number(event?.totalResult || 0);
              if (count === 0) {
                void activateFallbackOrFail('EMPTY');
                return;
              }
              setTotalResults(count);
              setCurrentTrack(1);
              setIsLoading(false);
            },
            onVideoChange: (event) => {
              if (isCancelled) return;
              clearWatchdog();
              setCurrentTrack(event?.trackNumber || 1);
              setIsLoading(false);
            },
            onCaptionConsumed: () => {
              // Caption clip finished
            },
            onError: (err) => {
              console.warn('[YouGlish Live] Widget error:', err);
              if (isCancelled) return;
              clearWatchdog();
              const reason: Exclude<FailureReason, null> =
                err?.code === 3 ? 'TIMEOUT' : 'PLAYER_ERROR';
              void activateFallbackOrFail(reason);
            }
          }
        });

        widgetRef.current = widgetInstance;

        const accentParam =
          selectedAccent === 'US'
            ? 'us'
            : selectedAccent === 'UK'
              ? 'uk'
              : selectedAccent === 'AUS'
                ? 'aus'
                : undefined;

        if (accentParam) {
          widgetInstance.fetch(currentWord.trim(), 'english', accentParam);
        } else {
          widgetInstance.fetch(currentWord.trim(), 'english');
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        clearWatchdog();
        const reason: Exclude<FailureReason, null> =
          err instanceof YouGlishLoadError && err.code === 'SCRIPT_BLOCKED'
            ? 'SCRIPT_BLOCKED'
            : 'TIMEOUT';
        void activateFallbackOrFail(reason);
      });

    return () => {
      isCancelled = true;
      clearWatchdog();
      widgetRef.current = null;
      if (hostNode) {
        hostNode.innerHTML = '';
      }
    };
  }, [currentWord, selectedAccent, baseId, retryNonce]);

  const activeLocalClip = playerMode === 'local_fallback' ? localClips[localClipIndex] || null : null;

  // Unified Player Controls (work for both YouGlish Live and Local YouTube Fallback)
  const handleNext = () => {
    if (playerMode === 'local_fallback') {
      if (localClipIndex < localClips.length - 1) {
        const nextIdx = localClipIndex + 1;
        setLocalClipIndex(nextIdx);
        setCurrentTrack(nextIdx + 1);
      }
      return;
    }
    if (widgetRef.current && typeof widgetRef.current.next === 'function') {
      widgetRef.current.next();
    }
  };

  const handlePrev = () => {
    if (playerMode === 'local_fallback') {
      if (localClipIndex > 0) {
        const prevIdx = localClipIndex - 1;
        setLocalClipIndex(prevIdx);
        setCurrentTrack(prevIdx + 1);
      }
      return;
    }
    if (widgetRef.current && typeof widgetRef.current.previous === 'function') {
      widgetRef.current.previous();
    }
  };

  const handleReplay = () => {
    if (playerMode === 'local_fallback') {
      setLocalReplayNonce((n) => n + 1);
      return;
    }
    if (widgetRef.current && typeof widgetRef.current.replay === 'function') {
      widgetRef.current.replay();
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (playerMode === 'youglish' && widgetRef.current && typeof widgetRef.current.setSpeed === 'function') {
      widgetRef.current.setSpeed(speed);
    }
  };

  const handleRetryYouGlish = () => {
    setRetryNonce((n) => n + 1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setCurrentWord(searchInput.trim());
    if (onSelectWord) onSelectWord(searchInput.trim());
  };

  const playPhraseUrl = `https://www.playphrase.me/#/search?q=${encodeURIComponent(currentWord.trim())}`;
  const youGlishUrl = `https://youglish.com/pronounce/${encodeURIComponent(currentWord.trim())}/english${
    selectedAccent === 'US' ? '/us' : selectedAccent === 'UK' ? '/uk' : selectedAccent === 'AUS' ? '/aus' : ''
  }`;

  const showDeadFallbackOverlay = playerMode === 'youglish' && failureReason !== null;

  const content = (
    <div
      className={`w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl text-white space-y-3.5 ${
        asModal ? 'max-w-3xl max-h-[92vh] overflow-y-auto animate-fade-in' : ''
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-black">
            <Globe className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                Nghe &quot;{currentWord}&quot; trong video thực tế
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                {playerMode === 'local_fallback' ? 'YouTube Nội Bộ' : 'YouTube CDN'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Phát nhanh ngay trên màn hình · Tự nhảy đúng giây chứa cụm từ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={playPhraseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-200 flex items-center gap-1.5 transition-colors"
            title="Mở kho phim Hollywood trên PlayPhrase.me ở tab đầy đủ"
          >
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">PlayPhrase.me</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Search & Accent Row */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Nhập từ hoặc cụm từ (ví dụ: complicated, struggle)..."
            className="w-full pl-9 pr-20 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <button
            type="submit"
            className="absolute right-1.5 top-1 px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-black transition-all cursor-pointer"
          >
            Tìm kiếm
          </button>
        </form>

        {/* Accent Pills */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          {(['GLOBAL', 'US', 'UK', 'AUS'] as const).map((acc) => (
            <button
              key={acc}
              type="button"
              onClick={() => setSelectedAccent(acc)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                selectedAccent === acc
                  ? 'bg-teal-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {acc === 'GLOBAL' ? 'Tất cả giọng' : acc}
            </button>
          ))}
        </div>
      </div>

      {/* Result Status Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-teal-400 uppercase tracking-wider text-[11px]">
            Từ khóa: &quot;{currentWord}&quot;
          </span>
          {totalResults > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold text-[11px]">
              Đoạn {currentTrack} / {totalResults} video tìm thấy
            </span>
          )}
        </div>

        <a
          href={youGlishUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-bold text-slate-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
        >
          <span>Mở trên YouGlish.com</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Local Fallback Notice Banner */}
      {playerMode === 'local_fallback' && activeLocalClip && (
        <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="text-amber-200 font-semibold">
            YouGlish bị trình duyệt chặn — đang phát tự động từ <strong>kho YouTube nội bộ</strong>
            {activeLocalClip.matchType === 'related' && (
              <> (khớp từ gốc &ldquo;{activeLocalClip.matchedToken}&rdquo;)</>
            )}
            .
          </span>
          <button
            type="button"
            onClick={handleRetryYouGlish}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-teal-300 font-bold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Thử lại YouGlish</span>
          </button>
        </div>
      )}

      {/* Widget Container Mount Node */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-slate-800 min-h-[360px] flex flex-col items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
            <p className="text-xs font-bold text-slate-300">
              Đang tải video phát âm cho &quot;{currentWord}&quot;...
            </p>
          </div>
        )}

        {/* Tier-2 Auto-Fallback: Direct YouTube-NoCookie Embed + Synchronized Highlighted Caption */}
        {playerMode === 'local_fallback' && activeLocalClip && (
          <div className="w-full flex flex-col">
            <div className="relative w-full aspect-video bg-black">
              <iframe
                key={`${activeLocalClip.id}-${localReplayNonce}`}
                src={`https://www.youtube-nocookie.com/embed/${activeLocalClip.youtubeId}?start=${Math.max(
                  0,
                  activeLocalClip.startSec - 1
                )}&autoplay=1&rel=0&modestbranding=1`}
                title={activeLocalClip.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="font-bold truncate">
                  {activeLocalClip.title} · {activeLocalClip.channel}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-teal-300 font-black shrink-0">
                  {activeLocalClip.accent}
                </span>
              </div>
              <p className="text-sm font-bold text-white leading-relaxed">
                &ldquo;{highlightTokenInSentence(activeLocalClip.text, activeLocalClip.matchedToken)}&rdquo;
              </p>
              {activeLocalClip.translation && (
                <p className="text-xs text-slate-400 font-medium">{activeLocalClip.translation}</p>
              )}
            </div>
          </div>
        )}

        {/* Diagnostic Fallback Overlay when BOTH YouGlish and local corpus have no clip */}
        {showDeadFallbackOverlay && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3.5">
            <p className="text-xs text-amber-300 font-bold max-w-md leading-relaxed">
              {getErrorDescription(failureReason, currentWord)}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleRetryYouGlish}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold cursor-pointer transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                <span>Thử lại</span>
              </button>
              <button
                type="button"
                onClick={() => speakWord(currentWord, 'en', playbackSpeed)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-all"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Nghe phát âm mẫu</span>
              </button>
              <a
                href={youGlishUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Mở trên YouGlish</span>
              </a>
              <a
                href={playPhraseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold shadow-md transition-all"
              >
                <Film className="w-4 h-4 text-amber-400" />
                <span>Mở trên PlayPhrase.me</span>
              </a>
            </div>
          </div>
        )}

        <div
          ref={hostRef}
          className={`w-full ${playerMode === 'local_fallback' ? 'hidden' : 'min-h-[440px]'}`}
        />
      </div>

      {/* Quick Player Bar (Next / Prev / Replay / Speed) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentTrack <= 1}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-black text-white flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Ví dụ trước</span>
          </button>

          <button
            type="button"
            onClick={handleReplay}
            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Phát lại</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={playerMode === 'local_fallback' && currentTrack >= totalResults}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-black text-white flex items-center gap-1 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Ví dụ tiếp</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl text-xs font-bold">
          <Gauge className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
          {[0.75, 1, 1.25].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => handleSpeedChange(spd)}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                playbackSpeed === spd
                  ? 'bg-teal-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (asModal) {
    return (
      <ModalPortal onClose={onClose}>
        <div
          className="fixed inset-0 z-[130] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={`Nghe "${currentWord}" trong video thực tế`}
          onClick={onClose}
        >
          {content}
        </div>
      </ModalPortal>
    );
  }

  return content;
};
