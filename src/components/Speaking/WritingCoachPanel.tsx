import React, { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Lock, PenTool, Sparkles, X } from 'lucide-react';
import { ActivePracticeMission, AuthUser, SavedWord, SentenceEvaluationResult } from '../../types';
import { authService } from '../../services/authService';
import { detectUsedMissionWords } from '../../utils/curriculumEngine';

interface WritingCoachPanelProps {
  activeMission?: ActivePracticeMission | null;
  onClearMission?: () => void;
  savedWords?: SavedWord[];
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onSavePhraseToSrs?: (phrase: string, contextSentence: string, tip?: string) => void;
}

export const WritingCoachPanel: React.FC<WritingCoachPanelProps> = ({
  activeMission,
  onClearMission,
  savedWords = [],
  currentUser,
  onOpenAuth,
  onSavePhraseToSrs
}) => {
  const [scenario, setScenario] = useState<'ielts' | 'work' | 'daily'>('ielts');
  const [customTarget, setCustomTarget] = useState<string>(
    activeMission?.targetWords?.[0]?.word || savedWords[0]?.word || 'curriculum'
  );
  const [text, setText] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SentenceEvaluationResult | null>(null);

  const missionWords = useMemo(() => {
    if (activeMission?.targetWords && activeMission.targetWords.length > 0) {
      return activeMission.targetWords;
    }
    return savedWords.slice(0, 5).map((w) => ({
      word: w.word,
      meaningVi: w.translation,
      exampleEn: w.contextSentence || w.exampleEn
    }));
  }, [activeMission, savedWords]);

  const usedWords = useMemo(
    () => detectUsedMissionWords(text, missionWords.map((w) => w.word)),
    [text, missionWords]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (text.trim().length < 6) {
      setError('Hãy viết ít nhất 1 câu tiếng Anh hoàn chỉnh (≥ 6 ký tự).');
      return;
    }

    setIsEvaluating(true);
    setError(null);
    try {
      const token = authService.getToken();
      const targetWordsArr = missionWords.map((w) => w.word);
      const res = await fetch('/api/ai/evaluate-sentence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          targetWord: usedWords[0] || targetWordsArr[0] || customTarget || 'expression',
          targetWords: targetWordsArr,
          grammarFocus: activeMission?.grammarFocus
            ? `${activeMission.grammarFocus.title}: ${activeMission.grammarFocus.formula}`
            : undefined,
          scenario,
          userSentence: text.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Không thể chấm bài viết lúc này.');
      }
      setResult(data as SentenceEvaluationResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối AI chấm viết.');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-black uppercase">
            <PenTool className="w-3.5 h-3.5" /> AI Writing Coach · Nâng Band 7.5+
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            {activeMission ? `Nhiệm vụ Viết: ${activeMission.sourceTitle}` : 'Luyện Viết Câu & Đoạn Ngắn Với Từ Vựng Đã Học'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Chủ động đặt câu/đoạn ngắn áp dụng từ vựng & ngữ pháp vừa nạp — AI sửa lỗi và viết lại bản chuẩn bản xứ.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(
            [
              { id: 'ielts', label: 'IELTS Academic' },
              { id: 'work', label: 'Công sở' },
              { id: 'daily', label: 'Đời sống' }
            ] as const
          ).map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => setScenario(sc.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scenario === sc.id ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mission Banner (Grammar or Target Vocabulary Checklist) */}
      {(activeMission?.grammarFocus || missionWords.length > 0) && (
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black text-indigo-950">
              {activeMission?.grammarFocus
                ? `🎯 Cấu trúc cần áp dụng: ${activeMission.grammarFocus.title}`
                : `🎯 Checklist từ vựng mục tiêu (đã dùng ${usedWords.length}/${missionWords.length}):`}
            </p>
            {activeMission && onClearMission && (
              <button
                type="button"
                onClick={onClearMission}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Bỏ nhiệm vụ
              </button>
            )}
          </div>

          {activeMission?.grammarFocus && (
            <p className="font-mono text-xs font-bold bg-slate-900 text-teal-300 px-3 py-2 rounded-xl">
              {activeMission.grammarFocus.formula}
            </p>
          )}

          {missionWords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {missionWords.map((item) => {
                const isUsed = usedWords.includes(item.word);
                return (
                  <span
                    key={item.word}
                    title={item.meaningVi}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                      isUsed
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                        : 'bg-white border-indigo-200 text-slate-700'
                    }`}
                  >
                    {isUsed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{item.word}</span>
                    <span className="text-[11px] text-slate-400 font-medium">({item.meaningVi})</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {missionWords.length === 0 && !activeMission?.grammarFocus && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600 shrink-0">Từ mục tiêu:</label>
          <input
            type="text"
            value={customTarget}
            onChange={(e) => setCustomTarget(e.target.value)}
            placeholder="Nhập từ tiếng Anh muốn luyện đặt câu..."
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {/* Writing Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            scenario === 'ielts'
              ? 'Viết 1–3 câu tiếng Anh theo phong cách IELTS Writing (ví dụ: Governments should allocate more funding to modernizing the national curriculum...)'
              : 'Viết 1–2 câu tiếng Anh áp dụng các từ ở trên...'
          }
          className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none text-sm font-medium text-slate-900 leading-relaxed resize-y"
        />

        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400 font-semibold">{text.trim().split(/\s+/).filter(Boolean).length} từ</span>
          {currentUser ? (
            <button
              type="submit"
              disabled={isEvaluating || !text.trim()}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm cursor-pointer transition-all whitespace-nowrap"
            >
              {isEvaluating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Chấm điểm & Nâng cấp bằng AI</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth?.()}
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm cursor-pointer transition-all whitespace-nowrap"
            >
              <Lock className="w-4 h-4" />
              <span>Đăng nhập để dùng AI Chấm Viết</span>
            </button>
          )}
        </div>
      </form>

      {/* AI Evaluation Output */}
      {result && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-indigo-50/70 border border-indigo-200 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-800">
              Kết quả đánh giá AI ({scenario.toUpperCase()})
            </span>
            <span className="px-3 py-1 rounded-full bg-white border border-indigo-200 text-sm font-black text-indigo-700 shadow-xs">
              {result.score} / 10 điểm
            </span>
          </div>

          <p className="text-sm font-semibold text-slate-800 leading-relaxed">{result.feedbackVi}</p>

          <div className="p-3.5 rounded-xl bg-white border border-emerald-200 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase text-emerald-700">
                ✨ Phiên bản tự nhiên / Band 7.5+:
              </span>
              {onSavePhraseToSrs && (
                <button
                  type="button"
                  onClick={() => onSavePhraseToSrs(result.naturalVersion, result.userSentence, result.collocationTip)}
                  className="text-[11px] font-bold text-teal-700 hover:underline cursor-pointer"
                >
                  + Lưu vào FSRS-6
                </button>
              )}
            </div>
            <p className="text-sm font-bold text-slate-900 leading-relaxed">“{result.naturalVersion}”</p>
          </div>

          {result.collocationTip && (
            <p className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              💡 {result.collocationTip}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
