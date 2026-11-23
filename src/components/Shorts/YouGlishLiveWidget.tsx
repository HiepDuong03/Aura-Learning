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
  X
} from 'lucide-react';
import { ModalPortal } from '../Common/ModalPortal';

interface YouGlishLiveWidgetProps {
  initialWord: string;
  accent?: 'GLOBAL' | 'US' | 'UK' | 'AUS';
  asModal?: boolean;
  onClose?: () => void;
  onSelectWord?: (word: string) => void;
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
  const [selectedAccent, setSelectedAccent] = useState<'GLOBAL' | 'US' | 'UK' | 'AUS'>(accent);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [currentTrack, setCurrentTrack] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [hasScriptError, setHasScriptError] = useState<boolean>(false);
  const [emptyResult, setEmptyResult] = useState<boolean>(false);

  const widgetRef = useRef<any>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rawId = useId();
  const baseId = `youglish-embed-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Sync initialWord changes
  useEffect(() => {
    if (initialWord && initialWord !== currentWord) {
      setCurrentWord(initialWord);
      setSearchInput(initialWord);
    }
  }, [initialWord]);

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

  // Load YouGlish Widget Script and Instantiate Widget
  // NOTE: YouGlish's widget.js mutates the target node via `outerHTML`, so we imperatively create
  // a fresh child node inside `hostRef` rather than letting YG overwrite a React-managed element.
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setHasScriptError(false);
    setEmptyResult(false);

    const loadTimeout = window.setTimeout(() => {
      if (!isCancelled) {
        setIsLoading(false);
        setHasScriptError(true);
      }
    }, 12000);

    const clearWatchdog = () => window.clearTimeout(loadTimeout);

    const initWidget = () => {
      if (isCancelled) return;
      const YG = (window as any).YG;
      if (!YG || !YG.Widget) {
        clearWatchdog();
        setHasScriptError(true);
        setIsLoading(false);
        return;
      }

      const host = hostRef.current;
      if (!host) return;

      // Fresh imperative mount node so YouGlish's `outerHTML` replacement never breaks React reconciliation
      const mountId = `${baseId}-${Date.now()}`;
      host.innerHTML = '';
      const mountEl = document.createElement('div');
      mountEl.id = mountId;
      host.appendChild(mountEl);

      const numericWidth = Math.max(320, Math.min(720, Math.round(host.clientWidth || 640)));

      try {
        const widgetInstance = new YG.Widget(mountId, {
          width: numericWidth,
          height: 440,
          components: 72, // Video player (64) + Captions (8)
          autoStart: 1,
          events: {
            onFetchDone: (event: any) => {
              if (isCancelled) return;
              clearWatchdog();
              const count = Number(event?.totalResult || 0);
              setTotalResults(count);
              setCurrentTrack(1);
              setIsLoading(false);
              if (count === 0) {
                setEmptyResult(true);
              }
            },
            onVideoChange: (event: any) => {
              if (isCancelled) return;
              clearWatchdog();
              setCurrentTrack(event?.trackNumber || 1);
              setIsLoading(false);
            },
            onCaptionConsumed: () => {
              // Caption clip finished
            },
            onError: (err: any) => {
              console.warn('[YouGlish Live] Widget error:', err);
              if (isCancelled) return;
              clearWatchdog();
              setIsLoading(false);
              setHasScriptError(true);
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
      } catch (err) {
        console.error('[YouGlish Live] Setup exception:', err);
        if (isCancelled) return;
        clearWatchdog();
        setHasScriptError(true);
        setIsLoading(false);
      }
    };

    // Ensure YouGlish script is present
    if (!(window as any).YG) {
      const existingScript = document.getElementById('youglish-widget-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'youglish-widget-script';
        script.src = 'https://youglish.com/public/emb/widget.js';
        script.async = true;
        script.onload = () => {
          setTimeout(initWidget, 100);
        };
        script.onerror = () => {
          if (!isCancelled) {
            clearWatchdog();
            setHasScriptError(true);
            setIsLoading(false);
          }
        };
        document.body.appendChild(script);
      } else {
        const checkInterval = setInterval(() => {
          if ((window as any).YG) {
            clearInterval(checkInterval);
            initWidget();
          }
        }, 100);
        setTimeout(() => clearInterval(checkInterval), 4000);
      }
    } else {
      initWidget();
    }

    return () => {
      isCancelled = true;
      clearWatchdog();
      widgetRef.current = null;
      if (hostRef.current) {
        hostRef.current.innerHTML = '';
      }
    };
  }, [currentWord, selectedAccent, baseId]);

  // Widget Control Handlers
  const handleNext = () => {
    if (widgetRef.current && typeof widgetRef.current.next === 'function') {
      widgetRef.current.next();
    }
  };

  const handlePrev = () => {
    if (widgetRef.current && typeof widgetRef.current.previous === 'function') {
      widgetRef.current.previous();
    }
  };

  const handleReplay = () => {
    if (widgetRef.current && typeof widgetRef.current.replay === 'function') {
      widgetRef.current.replay();
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (widgetRef.current && typeof widgetRef.current.setSpeed === 'function') {
      widgetRef.current.setSpeed(speed);
    }
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
                YouTube CDN
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
        {/* Search input */}
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
            className="absolute right-1.5 top-1 px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-black transition-all"
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
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
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
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-teal-400 uppercase tracking-wider text-[11px]">
            Từ khóa: "{currentWord}"
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

      {/* Widget Container Mount Node */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-slate-800 min-h-[360px] flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 z-20 bg-slate-950/90 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
            <p className="text-xs font-bold text-slate-300">
              Đang tải video phát âm cho &quot;{currentWord}&quot;...
            </p>
          </div>
        )}

        {(hasScriptError || emptyResult) && (
          <div className="absolute inset-0 z-20 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3">
            <p className="text-xs text-amber-300 font-bold max-w-md">
              {emptyResult
                ? `Không tìm thấy clip YouGlish cho cụm "${currentWord}". Bạn có thể rút gọn từ khóa hoặc mở trực tiếp bên dưới.`
                : 'Không thể tải YouGlish Widget trực tiếp (có thể do trình duyệt chặn bên thứ ba hoặc mạng chậm).'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
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

        <div ref={hostRef} className="w-full min-h-[440px]" />
      </div>

      {/* Quick Player Bar (Next / Prev / Replay / Speed) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentTrack <= 1}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-black text-white flex items-center gap-1 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Ví dụ trước</span>
          </button>

          <button
            type="button"
            onClick={handleReplay}
            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Phát lại</span>
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-white flex items-center gap-1 transition-all"
          >
            <span>Ví dụ tiếp ➔</span>
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
              className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all ${
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
