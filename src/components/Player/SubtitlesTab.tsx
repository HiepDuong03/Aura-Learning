import React from 'react';
import { SubtitleLine } from '../../types';
import { Play, Sparkles } from 'lucide-react';

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
}

export const SubtitlesTab: React.FC<SubtitlesTabProps> = ({
  subtitles,
  activeSubtitleIndex,
  showVietnamese,
  onJumpToSubtitle,
  renderClickableWords,
  activeSubRef,
  subOffset = 0,
  onSetSubOffset,
  onSyncFullYouTube,
  isSyncing = false
}) => {
  return (
    <div className="rounded-3xl bg-white p-4 border border-slate-100 shadow-sm flex flex-col h-[520px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
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
              onClick={() => onJumpToSubtitle(sub, idx)}
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
                <p className={`text-sm leading-relaxed ${isActive ? 'text-teal-950 font-extrabold' : 'text-slate-800 font-semibold'}`}>
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
};
