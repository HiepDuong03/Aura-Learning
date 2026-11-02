import React from 'react';
import { SubtitleLine } from '../../types';
import { calculateDictationDiff } from '../../utils/diffUtils';
import { 
  Video as VideoIcon, 
  Volume2, 
  HelpCircle, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface DictationTabProps {
  currentSub: SubtitleLine;
  subtitles: SubtitleLine[];
  activeSubtitleIndex: number;
  dictationInput: string;
  setDictationInput: React.Dispatch<React.SetStateAction<string>>;
  dictationChecked: boolean;
  setDictationChecked: React.Dispatch<React.SetStateAction<boolean>>;
  showDictationAnswer: boolean;
  setShowDictationAnswer: React.Dispatch<React.SetStateAction<boolean>>;
  completedDictations: Set<number>;
  setCompletedDictations: React.Dispatch<React.SetStateAction<Set<number>>>;
  onPlayVideoSegment: (sub: SubtitleLine) => void;
  onSpeakWord: (text: string) => void;
  onJumpToSubtitle: (sub: SubtitleLine, index: number) => void;
  showVietnamese: boolean;
  renderClickableWords: (text: string, sub?: SubtitleLine, index?: number) => React.ReactNode;
}

export const DictationTab: React.FC<DictationTabProps> = ({
  currentSub,
  subtitles,
  activeSubtitleIndex,
  dictationInput,
  setDictationInput,
  dictationChecked,
  setDictationChecked,
  showDictationAnswer,
  setShowDictationAnswer,
  completedDictations,
  setCompletedDictations,
  onPlayVideoSegment,
  onSpeakWord,
  onJumpToSubtitle,
  showVietnamese,
  renderClickableWords
}) => {
  const dictationDiff = calculateDictationDiff(currentSub.text, dictationInput);

  const handleCheck = () => {
    setDictationChecked(true);
    if (dictationDiff.accuracy === 100) {
      setCompletedDictations(prev => new Set(prev).add(activeSubtitleIndex));
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });

      // Auto-advance after 1.2s if there is a next subtitle
      if (activeSubtitleIndex < subtitles.length - 1) {
        setTimeout(() => {
          const next = activeSubtitleIndex + 1;
          onJumpToSubtitle(subtitles[next], next);
          setTimeout(() => onPlayVideoSegment(subtitles[next]), 200);
        }, 1200);
      }
    }
  };

  return (
    <div className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[540px]">
      <div className="space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs shadow-xs">
              {activeSubtitleIndex + 1}
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Nghe Chép Chính Tả (Dictation)
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Đã đúng: <span className="font-bold text-teal-700">{completedDictations.size}</span>/{subtitles.length} câu
              </p>
            </div>
          </div>

          {/* Audio Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPlayVideoSegment(currentSub)}
              className="px-2.5 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 flex items-center gap-1 shadow-sm transition-all active:scale-95"
              title="Phát âm thanh gốc từ video"
            >
              <VideoIcon className="w-3.5 h-3.5" /> Nghe video
            </button>
            <button
              type="button"
              onClick={() => onSpeakWord(currentSub.text)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all"
              title="Nghe AI đọc rõ ràng"
            >
              <Volume2 className="w-3.5 h-3.5" /> AI
            </button>
          </div>
        </div>

        {/* Word Slot Placeholders */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center justify-between">
            <span>Cấu trúc câu ({currentSub.text.trim().split(/\s+/).length} từ):</span>
            <span className="text-teal-700 font-semibold truncate max-w-[200px]">
              {showVietnamese ? currentSub.translation : '💡 Gõ các từ nghe được'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {currentSub.text.trim().split(/\s+/).map((word, i) => {
              const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');
              return (
                <span 
                  key={i} 
                  className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-400 shadow-xs"
                >
                  {'_ '.repeat(Math.max(2, cleanWord.length))}
                </span>
              );
            })}
          </div>
        </div>

        {/* Input Box */}
        <textarea
          value={dictationInput}
          onChange={(e) => {
            setDictationInput(e.target.value);
            setDictationChecked(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleCheck();
            }
          }}
          rows={3}
          placeholder="Gõ các từ bạn nghe được từ video vào đây (Enter để kiểm tra)..."
          className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-medium focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
        />

        {/* Feedback Diff when Checked */}
        {dictationChecked && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase text-slate-500">So khớp chi tiết từng từ:</span>
              <span className={`text-xs font-black ${dictationDiff.accuracy >= 80 ? 'text-emerald-700' : 'text-rose-600'}`}>
                Đúng {dictationDiff.matchCount}/{dictationDiff.totalCount} từ ({dictationDiff.accuracy}%)
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {dictationDiff.tokens.map((token, idx) => (
                <div
                  key={idx}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                    token.isMatched
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}
                >
                  {token.isMatched ? (
                    <span>✓ {token.targetWord}</span>
                  ) : (
                    <span>
                      ✗ <span className="line-through text-rose-400">{token.userWord || '___'}</span> → <strong className="text-emerald-700">{token.targetWord}</strong>
                    </span>
                  )}
                </div>
              ))}
            </div>

            {dictationDiff.accuracy === 100 && activeSubtitleIndex < subtitles.length - 1 && (
              <p className="text-xs font-bold text-teal-700 flex items-center gap-1 pt-1">
                <Sparkles className="w-3.5 h-3.5" /> Chuẩn 100%! Đang tự động chuyển sang câu tiếp theo...
              </p>
            )}

            <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
              <span className="font-bold text-slate-900">Bản dịch nghĩa: </span>
              {currentSub.translation}
            </div>
          </div>
        )}

        {/* Show Full Answer */}
        {showDictationAnswer && !dictationChecked && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1 animate-fade-in">
            <p className="font-black">Đáp án chuẩn từ video:</p>
            <p className="font-bold text-sm text-slate-900">{renderClickableWords(currentSub.text, currentSub, activeSubtitleIndex)}</p>
            <p className="italic text-slate-600">{currentSub.translation}</p>
          </div>
        )}

        {/* Helper Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const targetWords = currentSub.text.trim().split(/\s+/).filter(Boolean);
              const currentWords = dictationInput.trim().split(/\s+/).filter(Boolean);
              if (currentWords.length < targetWords.length) {
                const nextWord = targetWords[currentWords.length];
                setDictationInput(prev => (prev ? prev.trim() + ' ' + nextWord : nextWord));
              }
            }}
            className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" /> Gợi ý 1 từ
          </button>

          <button
            type="button"
            onClick={() => setShowDictationAnswer(!showDictationAnswer)}
            className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            {showDictationAnswer ? 'Ẩn đáp án' : 'Xem đáp án'}
          </button>

          <button
            type="button"
            onClick={() => {
              setDictationInput('');
              setDictationChecked(false);
              setShowDictationAnswer(false);
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-xl flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Làm lại
          </button>
        </div>
      </div>

      {/* Bottom Action Navigation */}
      <div className="space-y-2 pt-4 border-t border-slate-100 mt-4">
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
          onClick={handleCheck}
          className="w-full py-3.5 rounded-2xl btn-3d btn-3d-teal font-black text-sm flex items-center justify-center gap-2 shadow-[0_3px_0_#0f766e]"
        >
          <CheckCircle2 className="w-5 h-5" /> Kiểm tra câu trả lời (Enter)
        </button>
      </div>
    </div>
  );
};
