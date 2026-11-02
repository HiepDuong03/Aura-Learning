import React from 'react';
import { SubtitleLine } from '../../types';
import { 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  Volume2, 
  ChevronLeft, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface ShadowingTabProps {
  currentSub: SubtitleLine;
  subtitles: SubtitleLine[];
  activeSubtitleIndex: number;
  isRecording: boolean;
  spokenText: string;
  shadowScore: number | null;
  onToggleRecording: () => void;
  onPlayVideoSegment: (sub: SubtitleLine) => void;
  onSpeakWord: (text: string) => void;
  onJumpToSubtitle: (sub: SubtitleLine, index: number) => void;
  renderClickableWords?: (text: string, sub?: SubtitleLine, index?: number) => React.ReactNode;
}

export const ShadowingTab: React.FC<ShadowingTabProps> = ({
  currentSub,
  subtitles,
  activeSubtitleIndex,
  isRecording,
  spokenText,
  shadowScore,
  onToggleRecording,
  onPlayVideoSegment,
  onSpeakWord,
  onJumpToSubtitle,
  renderClickableWords
}) => {
  return (
    <div className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[520px]">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
            <Mic className="w-4 h-4 text-teal-600" /> AI Shadowing Voice Trainer
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPlayVideoSegment(currentSub)}
              className="px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 flex items-center gap-1 shadow-sm transition-all"
            >
              <VideoIcon className="w-3.5 h-3.5" /> Nghe từ video
            </button>
            <button
              type="button"
              onClick={() => onSpeakWord(currentSub.text)}
              className="px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-700 font-bold text-xs hover:bg-teal-100 transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" /> AI
            </button>
          </div>
        </div>

        {/* Target Sentence Box */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <span className="text-[11px] font-black uppercase text-teal-600 tracking-wider">
            Câu mẫu từ video #{activeSubtitleIndex + 1}:
          </span>
          <p className="text-base font-extrabold text-slate-900 mt-1 leading-relaxed">
            {renderClickableWords ? renderClickableWords(currentSub.text, currentSub, activeSubtitleIndex) : currentSub.text}
          </p>
          <p className="text-xs text-slate-500 mt-1.5 italic">
            {currentSub.translation}
          </p>
        </div>

        {/* Spoken Output Comparison */}
        {spokenText && (
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2.5 animate-fade-in">
            <span className="text-[11px] font-black uppercase text-slate-500">
              Giọng của bạn thu được:
            </span>
            <p className="text-sm font-bold text-teal-950">
              "{spokenText}"
            </p>
            {shadowScore !== null && (
              <div className="flex items-center gap-3 pt-2.5 border-t border-teal-200">
                <div className={`text-2xl font-black ${shadowScore >= 80 ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {shadowScore}%
                </div>
                <div className="text-xs font-semibold text-teal-900">
                  {shadowScore >= 80 ? (
                    <span className="flex items-center gap-1 text-emerald-800 font-bold">
                      <Sparkles className="w-4 h-4 text-emerald-600" /> Xuất sắc! Phát âm và phản xạ rất chuẩn xác!
                    </span>
                  ) : (
                    'Khá tốt! Hãy bấm nghe lại âm thanh mẫu từ video và thử lại nhé.'
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Shadowing Controls */}
      <div className="space-y-3 pt-4 border-t border-slate-100 mt-4">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={activeSubtitleIndex === 0}
            onClick={() => {
              const prev = activeSubtitleIndex - 1;
              onJumpToSubtitle(subtitles[prev], prev);
              setTimeout(() => onPlayVideoSegment(subtitles[prev]), 200);
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Câu trước
          </button>

          <button
            type="button"
            disabled={activeSubtitleIndex === subtitles.length - 1}
            onClick={() => {
              const next = activeSubtitleIndex + 1;
              onJumpToSubtitle(subtitles[next], next);
              setTimeout(() => onPlayVideoSegment(subtitles[next]), 200);
            }}
            className="flex-1 py-2.5 rounded-xl btn-3d btn-3d-white text-xs font-bold flex items-center justify-center gap-1 disabled:opacity-30"
          >
            <span>Câu tiếp theo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleRecording}
          className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
            isRecording
              ? 'bg-rose-500 text-white animate-pulse shadow-rose-200'
              : 'btn-3d btn-3d-teal shadow-[0_3px_0_#0f766e]'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-5 h-5" /> Đang nghe bạn nói... (Bấm để dừng)
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" /> Bấm mic và đọc theo câu mẫu
            </>
          )}
        </button>
      </div>
    </div>
  );
};
