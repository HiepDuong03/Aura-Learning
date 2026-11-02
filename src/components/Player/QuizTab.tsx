import React, { useState } from 'react';
import { QuizQuestion } from '../../types';
import { Award, CheckCircle2, ChevronRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizTabProps {
  quizzes: QuizQuestion[];
}

export const QuizTab: React.FC<QuizTabProps> = ({ quizzes }) => {
  const [currentQuizIndex, setCurrentQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  if (quizzes.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-6 border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-[520px] text-center">
        <Award className="w-12 h-12 text-slate-300 mb-3" />
        <p className="text-sm font-bold text-slate-600">Video này chưa có trắc nghiệm sẵn.</p>
        <p className="text-xs text-slate-400 mt-1">Bạn có thể luyện tập bằng tab Song ngữ, Chép chính tả và Shadowing!</p>
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
        <button
          type="button"
          onClick={() => {
            setCurrentQuizIndex(0);
            setSelectedOption(null);
            setIsAnswered(false);
            setQuizScore(0);
            setQuizFinished(false);
          }}
          className="px-6 py-3 rounded-2xl btn-3d btn-3d-teal font-black text-sm"
        >
          Làm lại bài trắc nghiệm
        </button>
      </div>
    );
  }

  const currentQuiz = quizzes[currentQuizIndex];
  if (!currentQuiz) return null;

  return (
    <div className="rounded-3xl bg-white p-5 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[520px]">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="text-xs font-black uppercase tracking-wider text-teal-600">
            Câu hỏi {currentQuizIndex + 1}/{quizzes.length}
          </span>
          <span className="text-xs font-bold text-slate-400">
            Điểm: {quizScore}/{quizzes.length}
          </span>
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
              if (currentQuizIndex + 1 < quizzes.length) {
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
            <span>{currentQuizIndex + 1 < quizzes.length ? 'Câu hỏi kế tiếp' : 'Xem kết quả bài tập'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
