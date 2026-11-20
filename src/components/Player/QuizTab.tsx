import React, { useState } from 'react';
import { AuthUser, QuizQuestion, SubtitleLine } from '../../types';
import { Award, CheckCircle2, ChevronRight, Sparkles, Loader2, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { authService } from '../../services/authService';
import { useNotify } from '../Common/ToastProvider';

interface QuizTabProps {
  quizzes: QuizQuestion[];
  lessonTitle?: string;
  subtitles?: SubtitleLine[];
  currentUser?: AuthUser | null;
  onUpdateQuizzes?: (quizzes: QuizQuestion[]) => void;
  onOpenAuth?: () => void;
}

export const QuizTab: React.FC<QuizTabProps> = ({
  quizzes,
  lessonTitle = '',
  subtitles = [],
  currentUser = null,
  onUpdateQuizzes,
  onOpenAuth
}) => {
  const { toast } = useNotify();
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const resetQuizProgress = () => {
    setCurrentQuizIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setQuizScore(0);
    setQuizFinished(false);
  };

  const handleGenerateAiQuiz = async () => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!subtitles || subtitles.length < 3) {
      toast.info('Video cần ít nhất 3 câu phụ đề để AI tạo bộ câu hỏi.');
      return;
    }

    setIsGenerating(true);
    try {
      const token = authService.getToken();
      const res = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: lessonTitle,
          subtitles: subtitles.slice(0, 60).map((s) => ({
            text: s.text,
            translation: s.translation
          }))
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : `Lỗi HTTP ${res.status}`);
      }

      if (Array.isArray(data.quizzes) && data.quizzes.length > 0 && onUpdateQuizzes) {
        onUpdateQuizzes(data.quizzes);
        resetQuizProgress();
        toast.success(
          data.isFallback
            ? `Đã tạo ${data.quizzes.length} câu hỏi Cloze từ phụ đề video!`
            : `AI đã tạo ${data.quizzes.length} câu trắc nghiệm đọc hiểu mới!`
        );
      } else {
        toast.error('AI chưa tạo được câu hỏi phù hợp từ phụ đề này.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tạo Quiz bằng AI lúc này.');
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = Boolean(onUpdateQuizzes && subtitles.length >= 3);

  if (quizzes.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[520px] text-center">
        <Award className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-700">Video này chưa có bộ trắc nghiệm sẵn.</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          AI có thể đọc phụ đề bài học và sinh ngay 5 câu hỏi đọc hiểu & từ vựng chuẩn ngữ cảnh.
        </p>

        {canGenerate && (
          <button
            type="button"
            onClick={handleGenerateAiQuiz}
            disabled={isGenerating}
            className="mt-5 px-5 py-3 rounded-2xl btn-3d btn-3d-teal font-black text-xs flex items-center gap-2 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI đang tạo 5 câu hỏi...</span>
              </>
            ) : currentUser ? (
              <>
                <Sparkles className="w-4 h-4" />
                <span>✨ Tạo 5 câu Quiz bằng AI</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Đăng nhập để tạo Quiz bằng AI</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  if (quizFinished) {
    return (
      <div className="rounded-3xl bg-white p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[520px] text-center space-y-4 animate-fade-in">
        <div className="size-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-md">
          <Award className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">Hoàn thành bài trắc nghiệm!</h3>
          <p className="text-sm text-slate-600 mt-1">
            Kết quả của bạn: <strong className="text-emerald-600">{quizScore}/{quizzes.length}</strong> câu đúng
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={resetQuizProgress}
            className="px-6 py-3 rounded-2xl btn-3d btn-3d-teal font-black text-sm"
          >
            Làm lại bài trắc nghiệm
          </button>
          {canGenerate && (
            <button
              type="button"
              onClick={handleGenerateAiQuiz}
              disabled={isGenerating}
              className="px-4 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1.5"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Tạo bộ câu hỏi mới</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const safeIndex = Math.min(currentQuizIndex, quizzes.length - 1);
  const currentQuiz = quizzes[safeIndex];
  if (!currentQuiz) return null;

  return (
    <div className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[520px]">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-teal-600">
            Câu hỏi {safeIndex + 1}/{quizzes.length}
          </span>
          <div className="flex items-center gap-2">
            {canGenerate && (
              <button
                type="button"
                onClick={handleGenerateAiQuiz}
                disabled={isGenerating}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition-all disabled:opacity-50"
                title="Dùng AI tạo bộ 5 câu trắc nghiệm mới từ phụ đề video"
              >
                {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>{isGenerating ? 'Đang tạo...' : 'Tạo Quiz AI'}</span>
              </button>
            )}
            <span className="text-xs font-bold text-slate-400">
              Điểm: {quizScore}/{quizzes.length}
            </span>
          </div>
        </div>

        <h3 className="text-base font-extrabold text-slate-900 mt-4 leading-snug">
          {currentQuiz.question}
        </h3>

        {/* Options List */}
        <div className="mt-5 space-y-2.5">
          {currentQuiz.options.map((opt, oIdx) => {
            const isCorrect = oIdx === currentQuiz.correctAnswer;
            const isSelected = selectedOption === oIdx;
            let optionStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100';

            if (isAnswered) {
              if (isCorrect) {
                optionStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold';
              } else if (isSelected) {
                optionStyle = 'bg-rose-50 border-rose-300 text-rose-900';
              }
            } else if (isSelected) {
              optionStyle = 'bg-teal-50 border-teal-500 text-teal-900 font-bold shadow-sm';
            }

            return (
              <button
                key={oIdx}
                type="button"
                disabled={isAnswered}
                onClick={() => setSelectedOption(oIdx)}
                className={`w-full p-3.5 rounded-2xl border text-sm text-left transition-all flex items-center justify-between ${optionStyle}`}
              >
                <span>{opt}</span>
                {isAnswered && isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {isAnswered && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <span className="font-bold text-slate-900">Giải thích: </span>
            {currentQuiz.explanation}
          </div>
        )}
      </div>

      {/* Quiz Actions */}
      <div className="pt-4 border-t border-slate-100 mt-4">
        {!isAnswered ? (
          <button
            type="button"
            disabled={selectedOption === null}
            onClick={() => {
              if (selectedOption === null) return;
              setIsAnswered(true);
              if (selectedOption === currentQuiz.correctAnswer) {
                setQuizScore((prev) => prev + 1);
                confetti({ particleCount: 40, spread: 50 });
              }
            }}
            className="w-full py-3.5 rounded-2xl btn-3d btn-3d-teal font-black text-sm disabled:opacity-50"
          >
            Kiểm tra câu trả lời
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (safeIndex + 1 < quizzes.length) {
                setCurrentQuizIndex((prev) => prev + 1);
                setSelectedOption(null);
                setIsAnswered(false);
              } else {
                confetti({ particleCount: 90, spread: 80 });
                setQuizFinished(true);
              }
            }}
            className="w-full py-3.5 rounded-2xl btn-3d btn-3d-orange font-black text-sm flex items-center justify-center gap-2"
          >
            <span>{safeIndex + 1 < quizzes.length ? 'Câu hỏi kế tiếp' : 'Xem kết quả bài tập'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
