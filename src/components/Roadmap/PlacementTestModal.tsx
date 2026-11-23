import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { X, Trophy, CheckCircle2, XCircle, Headphones, ArrowRight } from 'lucide-react';
import { CurriculumQuizQuestion, PASS_THRESHOLD_PERCENT } from '../../utils/curriculumEngine';
import { speakWord } from '../../services/dictionaryService';

interface PlacementTestModalProps {
  unitTitle: string;
  questions: CurriculumQuizQuestion[];
  onClose: () => void;
  onComplete: (scorePercent: number, passed: boolean) => void;
}

export const PlacementTestModal: React.FC<PlacementTestModalProps> = ({
  unitTitle,
  questions,
  onClose,
  onComplete
}) => {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [dictInput, setDictInput] = useState('');
  const [dictChecked, setDictChecked] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[index];

  const handleSelectMc = (optIdx: number) => {
    if (selected !== null || !q) return;
    setSelected(optIdx);
    if (optIdx === q.correctAnswer) {
      setCorrect((prev) => prev + 1);
    }
  };

  const handleSubmitDict = (e: React.FormEvent) => {
    e.preventDefault();
    if (dictChecked !== null || !q) return;
    const isOk = dictInput.trim().toLowerCase() === q.targetWord.trim().toLowerCase();
    setDictChecked(isOk);
    if (isOk) setCorrect((prev) => prev + 1);
  };

  const handleNext = () => {
    if (index < questions.length - 1) {
      setIndex((prev) => prev + 1);
      setSelected(null);
      setDictInput('');
      setDictChecked(null);
    } else {
      const percent = Math.round((correct / Math.max(1, questions.length)) * 100);
      const passed = percent >= PASS_THRESHOLD_PERCENT;
      if (passed) {
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
      }
      onComplete(percent, passed);
      setFinished(true);
    }
  };

  const percent = Math.round((correct / Math.max(1, questions.length)) * 100);
  const passed = percent >= PASS_THRESHOLD_PERCENT;
  const isAnswered = q?.kind === 'dictation' ? dictChecked !== null : selected !== null;

  return (
    <div
      className="fixed inset-0 z-[115] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 bg-teal-900 text-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-teal-300">
              Thi vượt cấp · Đạt ≥ {PASS_THRESHOLD_PERCENT}% để mở khóa toàn bộ
            </p>
            <h2 className="text-base sm:text-lg font-black">{unitTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-teal-200 hover:bg-teal-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {!finished && q ? (
            <>
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Câu {index + 1} / {questions.length}</span>
                <span className="text-teal-700">Đúng: {correct}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-teal-600 transition-all duration-200"
                  style={{ width: `${((index + 1) / questions.length) * 100}%` }}
                />
              </div>

              {q.kind === 'dictation' ? (
                <form onSubmit={handleSubmitDict} className="space-y-3">
                  <p className="text-sm font-black text-slate-900">{q.prompt}</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => speakWord(q.targetWord, 'en', 0.9)}
                      className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer"
                    >
                      <Headphones className="w-4 h-4" /> Nghe phát âm
                    </button>
                    {q.contextSentence && (
                      <span className="text-xs text-slate-500 italic line-clamp-2">“{q.contextSentence}”</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={dictInput}
                    onChange={(e) => setDictInput(e.target.value)}
                    disabled={dictChecked !== null}
                    placeholder="Nhập từ bạn nghe được..."
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-bold"
                    autoFocus
                  />
                  {dictChecked === null && (
                    <button
                      type="submit"
                      disabled={!dictInput.trim()}
                      className="w-full py-2.5 rounded-xl btn-3d btn-3d-teal text-xs font-black disabled:opacity-50 cursor-pointer"
                    >
                      Xác nhận đáp án
                    </button>
                  )}
                </form>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <p className="text-sm font-black text-slate-900">{q.prompt}</p>
                    {q.contextSentence && (
                      <p className="text-sm font-semibold text-indigo-900 bg-white p-3 rounded-xl border border-indigo-100">
                        “{q.contextSentence}”
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const answered = selected !== null;
                      const isCorrect = optIdx === q.correctAnswer;
                      const isSelected = optIdx === selected;
                      let cls = 'bg-white border-slate-200 text-slate-800 hover:border-teal-400';
                      if (answered) {
                        if (isCorrect) cls = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black';
                        else if (isSelected) cls = 'bg-rose-50 border-rose-400 text-rose-800';
                        else cls = 'bg-slate-50 border-slate-200 text-slate-400';
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={answered}
                          onClick={() => handleSelectMc(optIdx)}
                          className={`p-3.5 rounded-2xl border-2 text-left text-xs sm:text-sm font-bold flex items-center justify-between gap-2 cursor-pointer ${cls}`}
                        >
                          <span>{opt}</span>
                          {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                          {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {isAnswered && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-slate-700 space-y-2.5 animate-fade-in">
                  <p className="font-semibold">{q.explanationVi}</p>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full py-2.5 rounded-xl btn-3d btn-3d-teal text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{index === questions.length - 1 ? 'Nộp bài & Xem kết quả' : 'Câu tiếp theo'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 space-y-4 animate-fade-in">
              <div className={`inline-flex size-16 rounded-3xl items-center justify-center ${passed ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                {passed ? 'Vượt cấp thành công! Đã mở khóa toàn bộ chặng!' : 'Chưa đạt ngưỡng 80% để vượt cấp'}
              </h3>
              <p className="text-sm font-bold text-slate-600">
                Điểm của bạn: <span className={passed ? 'text-emerald-600' : 'text-amber-600'}>{correct}/{questions.length} ({percent}%)</span>
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 rounded-2xl btn-3d btn-3d-teal text-sm font-black cursor-pointer"
              >
                Quay lại Lộ trình
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
