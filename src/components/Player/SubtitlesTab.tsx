import React, { useState } from 'react';
import { SubtitleLine } from '../../types';
import { Play, Sparkles, Highlighter, X } from 'lucide-react';

interface SubtitlesTabProps {
  subtitles: SubtitleLine[];
  activeSubtitleIndex: number;
  showVietnamese: boolean;
  onJumpToSubtitle: (sub: SubtitleLine, index: number) => void;
  renderClickableWords: (text: string, sub?: SubtitleLine, index?: number) => React.ReactNode;
  activeSubRef: React.RefObject<HTMLDivElement>;
  subOffset?: number;
  onSetSubOffset?: (offsetOrUpdater: number | ((prev: number) => number)) => void;
  onSyncFullYouTube?: () => void;
  isSyncing?: boolean;
  phraseSelectMode?: boolean;
  onTogglePhraseSelectMode?: () => void;
  hasPhraseAnchor?: boolean;
  onSelectPhrase?: (phrase: string, sub: SubtitleLine, index: number) => void;
}

export const SubtitlesTab: React.FC<SubtitlesTabProps> = React.memo(({
  subtitles,
  activeSubtitleIndex,
  showVietnamese,
  onJumpToSubtitle,
  renderClickableWords,
  activeSubRef,
  subOffset = 0,
  onSetSubOffset,
  onSyncFullYouTube,
  isSyncing = false,
  phraseSelectMode = false,
  onTogglePhraseSelectMode,
  hasPhraseAnchor = false,
  onSelectPhrase
}) => {
  const [dragSelection, setDragSelection] = useState<{
    phrase: string;
    sub: SubtitleLine;
    index: number;
  } | null>(null);

  const handleSubtitleMouseUp = (sub: SubtitleLine, idx: number) => {
    if (!onSelectPhrase || typeof window === 'undefined') return;
    const rawSelection = window.getSelection()?.toString() || '';
    const cleaned = rawSelection
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
    const words = cleaned.split(' ').filter(Boolean);
    if (words.length >= 2 && words.length <= 6) {
      setDragSelection({
        phrase: cleaned,
        sub,
        index: idx
      });
    } else if (dragSelection && !cleaned) {
      setDragSelection(null);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-4 border border-slate-100 shadow-sm flex flex-col h-[520px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500">
            {subtitles.length} câu phụ đề song ngữ
          </span>
          {onSyncFullYouTube && (
            <button
              type="button"
              onClick={onSyncFullYouTube}
              disabled={isSyncing}
              className="text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50"
              title="Đồng bộ phụ đề từ YouTube chuẩn 4You"
            >
              <Sparkles className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Đang tải...' : subtitles.length < 20 ? '⚡ Tải full phụ đề' : 'Làm mới phụ đề'}
            </button>
          )}
          {onTogglePhraseSelectMode && (
            <button
              type="button"
              onClick={() => {
                setDragSelection(null);
                onTogglePhraseSelectMode();
              }}
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border transition-all flex items-center gap-1 active:scale-95 ${
                phraseSelectMode
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-indigo-50 text-indigo-700 border-indigo-200/80 hover:bg-indigo-100'
              }`}
              title="Bật chế độ chạm 2 từ để chọn cụm từ (idiom / phrasal verb) — hoặc bôi đen chuột trực tiếp"
            >
              <Highlighter className="w-3 h-3" />
              {phraseSelectMode ? 'Đang chọn cụm từ' : 'Chọn cụm từ'}
            </button>
          )}
        </div>

        {/* Sync Offset Calibrator */}
        {onSetSubOffset && (
          <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100/90 px-2 py-1 rounded-full border border-slate-200/60 shadow-xs" title="Chỉnh lệch phụ đề (Phím tắt: [ và ]). Tự động lưu vào video này.">
            <span className="text-[10px] font-bold text-slate-600 mr-0.5">Lệch sub:</span>
            <button
              type="button"
              onClick={() => onSetSubOffset((prev: number) => Number((prev - 0.5).toFixed(2)))}
              className="px-1.5 py-0.5 rounded-md bg-white hover:bg-slate-200 border border-slate-200 text-[10px] font-mono font-bold transition-all active:scale-95"
              title="Lùi 0.5s"
            >
              -0.5s
            </button>
            <button
              type="button"
              onClick={() => onSetSubOffset((prev: number) => Number((prev - 0.1).toFixed(2)))}
              className="px-1.5 py-0.5 rounded-md bg-white hover:bg-teal-100 border border-slate-200 text-[10px] font-mono font-bold transition-all active:scale-95 text-teal-700"
              title="Lùi 0.1s (Phím [)"
            >
              -0.1s
            </button>
            <span className="font-mono font-black text-teal-700 min-w-[42px] text-center text-[11px] px-1 bg-white rounded border border-teal-200/60">
              {subOffset > 0 ? `+${subOffset.toFixed(2)}s` : `${subOffset.toFixed(2)}s`}
            </span>
            <button
              type="button"
              onClick={() => onSetSubOffset((prev: number) => Number((prev + 0.1).toFixed(2)))}
              className="px-1.5 py-0.5 rounded-md bg-white hover:bg-teal-100 border border-slate-200 text-[10px] font-mono font-bold transition-all active:scale-95 text-teal-700"
              title="Tiến 0.1s (Phím ])"
            >
              +0.1s
            </button>
            <button
              type="button"
              onClick={() => onSetSubOffset((prev: number) => Number((prev + 0.5).toFixed(2)))}
              className="px-1.5 py-0.5 rounded-md bg-white hover:bg-slate-200 border border-slate-200 text-[10px] font-mono font-bold transition-all active:scale-95"
              title="Tiến 0.5s"
            >
              +0.5s
            </button>
            {subOffset !== 0 && (
              <button
                type="button"
                onClick={() => onSetSubOffset(0)}
                className="text-[10px] text-rose-500 font-bold hover:underline ml-1 px-1"
                title="Khôi phục 0s"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Immersion Keyboard Shortcut Legend & Phrase Selection Banner */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
        <span>Phím tắt: <strong className="text-slate-600">A</strong> câu trước • <strong className="text-slate-600">S</strong> phát lại • <strong className="text-slate-600">D</strong> câu sau • <strong className="text-slate-600">L</strong> lặp câu • <strong className="text-slate-600">Space</strong> phát/dừng</span>
      </div>

      {phraseSelectMode && (
        <div className="mt-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-800 flex items-center justify-between">
          <span>
            {hasPhraseAnchor
              ? '✨ Đã chọn từ đầu — hãy chạm từ kết thúc trong cùng câu (2–6 từ).'
              : '✨ Chế độ chọn cụm từ: chạm từ bắt đầu, sau đó chạm từ kết thúc trong cùng câu.'}
          </span>
        </div>
      )}

      {/* Desktop Mouse Drag Phrase Action Bar */}
      {dragSelection && onSelectPhrase && (
        <div className="mt-2 px-3 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-between shadow-md">
          <button
            type="button"
            onClick={() => {
              const sel = dragSelection;
              setDragSelection(null);
              window.getSelection()?.removeAllRanges();
              onSelectPhrase(sel.phrase, sel.sub, sel.index);
            }}
            className="flex items-center gap-1.5 hover:underline text-left"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Tra & giải thích cụm từ: “{dragSelection.phrase}”</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDragSelection(null);
              window.getSelection()?.removeAllRanges();
            }}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Đóng thanh chọn cụm từ"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 pr-1">
        {/* Intro notice if video is currently before the first sentence */}
        {activeSubtitleIndex === -1 && subtitles.length > 0 && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-between text-xs font-semibold text-amber-900 mb-2">
            <span>🎬 Đang chạy phần Intro • Lời thoại bắt đầu tại {Math.floor(subtitles[0].start)}s</span>
            <button
              type="button"
              onClick={() => onJumpToSubtitle(subtitles[0], 0)}
              className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline ml-2 shrink-0"
            >
              Bắt đầu học ngay ➔
            </button>
          </div>
        )}
        {subtitles.map((sub, idx) => {
          if (!sub) return null;
          const start = typeof sub.start === 'number' && !isNaN(sub.start) ? sub.start : 0;
          const end = typeof sub.end === 'number' && !isNaN(sub.end) ? sub.end : start + 3;
          const isActive = idx === activeSubtitleIndex;
          const startMin = Math.floor(start / 60);
          const startSec = Math.floor(start % 60).toString().padStart(2, '0');
          const endMin = Math.floor(end / 60);
          const endSec = Math.floor(end % 60).toString().padStart(2, '0');
          const timeFormatted = `${startMin}:${startSec} - ${endMin}:${endSec}`;

          return (
            <div
              key={sub.id}
              ref={isActive ? activeSubRef : null}
              onClick={() => {
                // Avoid jumping when user just finished dragging a multi-word selection
                const currentSel = typeof window !== 'undefined' ? window.getSelection()?.toString().trim() : '';
                if (currentSel && currentSel.includes(' ')) return;
                onJumpToSubtitle(sub, idx);
              }}
              className={`group p-3 rounded-2xl transition-all cursor-pointer border flex items-start gap-3 relative ${
                isActive
                  ? 'bg-teal-50/90 border-teal-500 shadow-md translate-x-1 ring-2 ring-teal-400/30'
                  : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              {/* 4You-style Quick Play/Seek Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onJumpToSubtitle(sub, idx);
                }}
                className={`size-8 rounded-xl flex items-center justify-center shrink-0 transition-all mt-0.5 ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-300'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-teal-600 group-hover:text-white'
                }`}
                title="Tua video đến câu này"
              >
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </button>

              {/* Subtitle Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold mb-1">
                  <span className="font-mono bg-slate-100/90 px-1.5 py-0.5 rounded text-slate-600 group-hover:bg-teal-100/70 group-hover:text-teal-800 transition-colors">
                    {timeFormatted} ({sub.start.toFixed(1)}s)
                  </span>
                  {isActive && (
                    <span className="flex items-center gap-1 text-teal-600 font-black">
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                      Đang phát
                    </span>
                  )}
                </div>
                <p
                  onMouseUp={() => handleSubtitleMouseUp(sub, idx)}
                  className={`text-sm leading-relaxed select-text ${isActive ? 'text-teal-950 font-extrabold' : 'text-slate-800 font-semibold'}`}
                >
                  {renderClickableWords(sub.text, sub, idx)}
                </p>
                {showVietnamese && (
                  <p className="text-xs text-slate-500 mt-1 italic leading-normal">
                    {sub.translation}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
SubtitlesTab.displayName = 'SubtitlesTab';
