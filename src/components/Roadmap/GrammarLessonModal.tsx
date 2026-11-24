import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { X, CheckCircle2, XCircle, Sparkles, AlertTriangle, PenTool, ArrowRight, RotateCcw } from 'lucide-react';
import { ActivePracticeMission, CurriculumGrammarLesson, LessonCompletionRecord } from '../../types';
import { ModalPortal } from '../Common/ModalPortal';

interface GrammarLessonModalProps {
  lesson: CurriculumGrammarLesson;
  existingRecord?: LessonCompletionRecord;
  onClose: () => void;
  onSaveProgress: (patch: Partial<LessonCompletionRecord>) => void;
  onLaunchWritingMission: (mission: ActivePracticeMission) => void;
}

export const GrammarLessonModal: React.FC<GrammarLessonModalProps> = ({
  lesson,
  existingRecord,
  onClose,
  onSaveProgress,
  onLaunchWritingMission
}) => {
  const [step, setStep] = useState<'learn' | 'practice' | 'done'>('learn');
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);

  const currentQ = lesson.exercises[qIdx];

  const handleChoose = (idx: number) => {
    if (selected !== null || !currentQ) return;
    setSelected(idx);
    if (idx === currentQ.correctAnswer) {
      setCorrect((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (qIdx < lesson.exercises.length - 1) {
      setQIdx((prev) => prev + 1);
      setSelected(null);
    } else {
      const percent = Math.round((correct / Math.max(1, lesson.exercises.length)) * 100);
      const passed = percent >= 75;
      const stars = percent === 100 ? 3 : percent >= 80 ? 2 : passed ? 1 : 0;
      onSaveProgress({
        flashcardsDone: true,
        quizBestScore: Math.max(existingRecord?.quizBestScore || 0, percent),
        quizPassed: Boolean(existingRecord?.quizPassed || passed),
        stars: Math.max(existingRecord?.stars || 0, stars)
      });
      if (passed) {
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.65 } });
      }
      setStep('done');
    }
  };

  const percent = Math.round((correct / Math.max(1, lesson.exercises.length)) * 100);

  const handlePracticeWritingWithGrammar = () => {
    onLaunchWritingMission({
      id: `grammar-mission-${lesson.id}-${Date.now()}`,
      mode: 'writing',
      sourceTitle: `Ngữ pháp ${lesson.cefr}: ${lesson.title}`,
      topicName: lesson.title,
      cefr: lesson.cefr,
      targetWords: [],
      grammarFocus: {
        title: `${lesson.title} (${lesson.titleVi})`,
        formula: lesson.formula
      },
      createdAt: Date.now()
    });
  };

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
      <div
        className="w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-teal-600 text-white text-[11px] font-black">{lesson.cefr}</span>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{lesson.category}</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 mt-0.5">{lesson.title}</h2>
            <p className="text-xs font-semibold text-teal-700">{lesson.titleVi}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {step === 'learn' && (
            <>
              <div className="p-4 rounded-2xl bg-slate-900 text-teal-300 font-mono text-xs sm:text-sm font-bold shadow-inner">
                {lesson.formula}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
                {lesson.explanationVi}
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-black">Mẹo ăn điểm IELTS: </span>
                  <span>{lesson.ieltsTipVi}</span>
                </div>
              </div>

              {lesson.forms && lesson.forms.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Các dạng cấu trúc:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {lesson.forms.map((f, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-black uppercase">
                          {f.label}
                        </span>
                        <p className="text-xs font-mono font-bold text-slate-900">{f.pattern}</p>
                        {f.example && <p className="text-xs text-slate-500 italic">{f.example}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lesson.useCases && lesson.useCases.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">Khi nào sử dụng:</p>
                  <div className="space-y-2">
                    {lesson.useCases.map((uc, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                        <p className="text-xs font-black text-slate-900">{idx + 1}. {uc.title}</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{uc.detail}</p>
                        {uc.example && (
                          <p className="text-xs font-semibold text-teal-800 pt-0.5">{uc.example}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Ví dụ chuẩn ngữ cảnh:</p>
                {lesson.examples.map((ex, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">• {ex.en}</p>
                      {ex.label && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                          {ex.label}
                        </span>
                      )}
                    </div>
                    {ex.vi && <p className="text-xs text-slate-600 italic pl-3">{ex.vi}</p>}
                    {ex.note && <p className="text-[11px] text-teal-700 bg-teal-50/60 px-2.5 py-1 rounded-lg">{ex.note}</p>}
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2.5 text-xs">
                <p className="font-black text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" /> Lỗi người học hay mắc:
                </p>
                {[lesson.commonMistake, ...(lesson.moreMistakes || [])].map((m, idx) => (
                  <div key={idx} className={`space-y-1 ${idx > 0 ? 'pt-2 border-t border-amber-200/70' : ''}`}>
                    <p className="text-rose-700 line-through font-semibold">❌ {m.wrong}</p>
                    <p className="text-emerald-800 font-bold">✅ {m.right}</p>
                    {m.whyVi && <p className="text-slate-600">{m.whyVi}</p>}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  onSaveProgress({ flashcardsDone: true });
                  setStep('practice');
                  setQIdx(0);
                  setSelected(null);
                  setCorrect(0);
                }}
                className="w-full py-3.5 rounded-2xl btn-3d btn-3d-teal text-sm font-black flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Làm bài tập ứng dụng ({lesson.exercises.length} câu)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'practice' && currentQ && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Câu {qIdx + 1} / {lesson.exercises.length}</span>
                <span className="text-teal-700">Đúng: {correct}</span>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-black text-slate-900">
                {currentQ.question}
              </div>
              <div className="space-y-2">
                {currentQ.options.map((opt, idx) => {
                  const answered = selected !== null;
                  const isCorrect = idx === currentQ.correctAnswer;
                  const isSelected = idx === selected;
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
                      onClick={() => handleChoose(idx)}
                      className={`w-full p-3.5 rounded-2xl border-2 text-left text-xs sm:text-sm font-bold flex items-center justify-between cursor-pointer ${cls}`}
                    >
                      <span>{opt}</span>
                      {answered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {selected !== null && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-slate-700 space-y-2.5 animate-fade-in">
                  <p className="font-semibold">{currentQ.explanationVi}</p>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full py-2.5 rounded-xl btn-3d btn-3d-teal text-xs font-black cursor-pointer"
                  >
                    {qIdx === lesson.exercises.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo →'}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <h3 className="text-2xl font-black text-slate-900">
                {percent >= 75 ? 'Tuyệt vời! Bạn đã nắm vững chủ điểm này!' : 'Ôn lại lý thuyết và thử lại nhé!'}
              </h3>
              <p className="text-sm font-bold text-teal-700">
                Đạt {correct}/{lesson.exercises.length} ({percent}%)
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handlePracticeWritingWithGrammar}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <PenTool className="w-4 h-4" />
                  <span>Viết câu áp dụng cấu trúc này (AI chấm)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('practice');
                    setQIdx(0);
                    setSelected(null);
                    setCorrect(0);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Làm lại
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl btn-3d btn-3d-teal text-xs font-black cursor-pointer"
                >
                  Quay lại Lộ trình
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </ModalPortal>
  );
};
