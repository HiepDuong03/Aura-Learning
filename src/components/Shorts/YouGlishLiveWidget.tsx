import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ExternalLink, 
  Sparkles, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  Gauge, 
  Loader2, 
  Globe, 
  X,
  Play,
  CheckCircle2
} from 'lucide-react';

interface YouGlishLiveWidgetProps {
  initialWord: string;
  accent?: 'GLOBAL' | 'US' | 'UK' | 'AUS';
  onClose?: () => void;
  onSelectWord?: (word: string) => void;
}

export const YouGlishLiveWidget: React.FC<YouGlishLiveWidgetProps> = ({
  initialWord,
  accent = 'GLOBAL',
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

  const widgetRef = useRef<any>(null);
  const containerId = 'youglish-embed-container';

  // Sync initialWord changes
  useEffect(() => {
    if (initialWord && initialWord !== currentWord) {
      setCurrentWord(initialWord);
      setSearchInput(initialWord);
    }
  }, [initialWord]);

  // Load YouGlish Widget Script and Instantiate Widget
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setHasScriptError(false);

    const initWidget = () => {
      if (isCancelled) return;
      const YG = (window as any).YG;
      if (!YG || !YG.Widget) {
        setHasScriptError(true);
        setIsLoading(false);
        return;
      }

      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';

      try {
        const widgetInstance = new YG.Widget(containerId, {
          width: '100%',
          components: 9, // Video player + Subtitles + controls
          events: {
            onFetchDone: (event: any) => {
              if (isCancelled) return;
              setTotalResults(event.totalResult || 0);
              setCurrentTrack(1);
              setIsLoading(false);
            },
            onVideoChange: (event: any) => {
              if (isCancelled) return;
              setCurrentTrack(event.trackNumber || 1);
            },
            onCaptionConsumed: () => {
              // Caption clip finished
            },
            onError: (err: any) => {
              console.warn('[YouGlish Live] Widget error:', err);
              if (isCancelled) return;
              setIsLoading(false);
            }
          }
        });

        widgetRef.current = widgetInstance;

        let lang = 'english';
        if (selectedAccent === 'US') lang = 'english/us';
        else if (selectedAccent === 'UK') lang = 'english/uk';
        else if (selectedAccent === 'AUS') lang = 'english/aus';

        widgetInstance.fetch(currentWord.trim(), lang);
      } catch (err) {
        console.error('[YouGlish Live] Setup exception:', err);
        if (isCancelled) return;
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
          setTimeout(initWidget, 150);
        };
        script.onerror = () => {
          if (!isCancelled) {
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
        setTimeout(() => clearInterval(checkInterval), 3000);
      }
    } else {
      initWidget();
    }

    return () => {
      isCancelled = true;
    };
  }, [currentWord, selectedAccent]);

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
    if (widgetRef.current && typeof widgetRef.current.speed === 'function') {
      widgetRef.current.speed(speed);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setCurrentWord(searchInput.trim());
    if (onSelectWord) onSelectWord(searchInput.trim());
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-white space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-black">
            <Globe className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-white">
                YouGlish Live API Widget
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                Chính thức
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tra cứu phát âm thực tế từ hơn 100 triệu video trên YouGlish
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Đóng widget"
          >
            <X className="w-5 h-5" />
          </button>
        )}
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
          href={`https://youglish.com/pronounce/${encodeURIComponent(currentWord)}/english`}
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
              Đang kết nối cơ sở dữ liệu YouGlish cho từ "{currentWord}"...
            </p>
          </div>
        )}

        {hasScriptError && (
          <div className="p-6 text-center space-y-3">
            <p className="text-xs text-amber-300 font-bold">
              Không thể tải YouGlish Widget trực tiếp (có thể do trình duyệt chặn bên thứ ba).
            </p>
            <a
              href={`https://youglish.com/pronounce/${encodeURIComponent(currentWord)}/english`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Xem trực tiếp trên trang chủ YouGlish</span>
            </a>
          </div>
        )}

        <div id={containerId} className="w-full min-h-[360px]" />
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
};
