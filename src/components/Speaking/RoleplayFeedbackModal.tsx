import React, { useState } from 'react';
import {
  Award,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  Loader2,
  Sparkles,
  Volume2,
  X,
  AlertCircle
} from 'lucide-react';
import { RoleplayFeedbackReport } from '../../types';
import { ModalPortal } from '../Common/ModalPortal';

interface RoleplayFeedbackModalProps {
  isOpen: boolean;
  isLoading: boolean;
  report: RoleplayFeedbackReport | null;
  error?: string | null;
  personaName: string;
  onClose: () => void;
  onSpeakText: (text: string, speed?: number) => void;
  onSavePhraseToSrs?: (phrase: string, contextSentence: string, tip?: string) => void;
}

const CATEGORY_LABELS: Record<'grammar' | 'vocabulary' | 'naturalness', { label: string; style: string }> = {
  grammar: { label: 'Ngữ pháp', style: 'bg-rose-100 text-rose-700 border-rose-200' },
  vocabulary: { label: 'Từ vựng', style: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  naturalness: { label: 'Tự nhiên bản xứ', style: 'bg-amber-100 text-amber-800 border-amber-200' }
};

export const RoleplayFeedbackModal: React.FC<RoleplayFeedbackModalProps> = ({
  isOpen,
  isLoading,
  report,
  error,
  personaName,
  onClose,
  onSpeakText,
  onSavePhraseToSrs
}) => {
  const [savedIndices, setSavedIndices] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const handleSaveOne = (idx: number, phrase: string, contextSentence: string, meaningVi: string) => {
    if (!onSavePhraseToSrs || savedIndices.has(idx)) return;
    onSavePhraseToSrs(phrase, contextSentence || phrase, meaningVi);
    setSavedIndices((prev) => new Set(prev).add(idx));
  };

  const handleSaveAll = () => {
    if (!onSavePhraseToSrs || !report) return;
    const next = new Set(savedIndices);
    report.keyVocabulary.forEach((v, idx) => {
      if (!next.has(idx)) {
        onSavePhraseToSrs(v.phrase, v.contextSentence || v.phrase, v.meaningVi);
        next.add(idx);
      }
    });
    setSavedIndices(next);
  };

  const allSaved =
    Boolean(report && report.keyVocabulary.length > 0) &&
    report!.keyVocabulary.every((_, idx) => savedIndices.has(idx));

  return (
    <ModalPortal onClose={onClose}>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-[28px] bg-white shadow-2xl border border-slate-200/80"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/95 backdrop-blur border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Báo cáo tổng kết hội thoại AI</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Phân tích chuyên sâu buổi nói chuyện với {personaName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              aria-label="Đóng báo cáo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {isLoading && (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                <p className="text-sm font-bold text-slate-700">
                  AI Coach đang phân tích lỗi sai & trích xuất từ vựng chuẩn bản xứ...
                </p>
              </div>
            )}

            {!isLoading && error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-sm font-semibold">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {!isLoading && report && (
              <>
                {/* Score & CEFR Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white flex flex-col justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-100">
                      Điểm tổng kết
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-3xl font-black">{report.overallScore}</span>
                      <span className="text-sm font-bold text-teal-100">/ 100</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                      Ước lượng CEFR
                    </span>
                    <div className="text-3xl font-black text-indigo-900 mt-1">{report.estimatedCefr}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                      Điểm cần nâng cấp
                    </span>
                    <div className="text-3xl font-black text-amber-900 mt-1">
                      {report.mistakes.length} lỗi · {report.keyVocabulary.length} cụm từ
                    </div>
                  </div>
                </div>

                {/* Summary & Strengths */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed">{report.summaryVi}</p>
                  {report.strengthsVi.length > 0 && (
                    <ul className="space-y-1.5 pt-1">
                      {report.strengthsVi.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {report.isFallback && (
                    <p className="text-[11px] font-semibold text-slate-400">
                      * Chế độ phân tích cục bộ (gắn GEMINI_API_KEY trên server để nhận phân tích ngữ pháp sâu hơn).
                    </p>
                  )}
                </div>

                {/* Mistakes Breakdown */}
                {report.mistakes.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Chi tiết lỗi & cách sửa chuẩn bản xứ ({report.mistakes.length})
                    </h4>
                    <div className="space-y-2.5">
                      {report.mistakes.map((m, idx) => {
                        const badge = CATEGORY_LABELS[m.category] || CATEGORY_LABELS.naturalness;
                        return (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${badge.style}`}>
                                {badge.label}
                              </span>
                              <button
                                type="button"
                                onClick={() => onSpeakText(m.corrected, 0.92)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 cursor-pointer"
                              >
                                <Volume2 className="w-3.5 h-3.5" /> Nghe câu chuẩn
                              </button>
                            </div>
                            <div className="text-xs space-y-1">
                              <p className="text-rose-700 line-through decoration-rose-400 font-medium">
                                Bạn nói: “{m.original}”
                              </p>
                              <p className="text-emerald-800 font-bold">
                                Chuẩn hơn: “{m.corrected}”
                              </p>
                              {m.explanationVi && (
                                <p className="text-slate-600 font-medium pt-0.5">💡 {m.explanationVi}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Key Vocabulary -> 1-Click Batch Save to FSRS-6 */}
                {report.keyVocabulary.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Cụm từ đắt giá để lưu vào FSRS-6 ({report.keyVocabulary.length})
                      </h4>
                      {onSavePhraseToSrs && (
                        <button
                          type="button"
                          onClick={handleSaveAll}
                          disabled={allSaved}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                            allSaved
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-xs'
                          }`}
                        >
                          {allSaved ? (
                            <>
                              <BookmarkCheck className="w-3.5 h-3.5" /> Đã lưu tất cả vào SRS
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="w-3.5 h-3.5" /> Lưu tất cả vào FSRS-6
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {report.keyVocabulary.map((vocab, idx) => {
                        const isSaved = savedIndices.has(idx);
                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-2xl bg-teal-50/50 border border-teal-200/80 flex flex-col justify-between gap-2"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-black text-slate-900">{vocab.phrase}</p>
                                <button
                                  type="button"
                                  onClick={() => onSpeakText(vocab.phrase, 0.9)}
                                  className="p-1 rounded-lg text-teal-700 hover:bg-teal-100 cursor-pointer shrink-0"
                                  title="Nghe phát âm"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <p className="text-xs text-slate-600 font-semibold mt-0.5">{vocab.meaningVi}</p>
                            </div>
                            {onSavePhraseToSrs && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSaveOne(idx, vocab.phrase, vocab.contextSentence, vocab.meaningVi)
                                }
                                className={`self-start px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                                  isSaved
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-white hover:bg-teal-100 text-teal-800 border border-teal-300'
                                }`}
                              >
                                {isSaved ? (
                                  <>
                                    <BookmarkCheck className="w-3 h-3" /> Đã lưu SRS
                                  </>
                                ) : (
                                  <>
                                    <BookmarkPlus className="w-3 h-3" /> + Lưu thẻ SRS
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-2xl btn-3d btn-3d-teal text-xs font-black cursor-pointer"
                  >
                    Tiếp tục luyện hội thoại
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
