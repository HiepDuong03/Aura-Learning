import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  CheckCircle2,
  Clock,
  Lightbulb,
  Loader2,
  Lock,
  PenTool,
  RefreshCw,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Volume2,
  X
} from 'lucide-react';
import {
  ActivePracticeMission,
  AuthUser,
  SavedWord,
  SentenceEvaluationResult,
  WritingCoachMode
} from '../../types';
import { authService } from '../../services/authService';
import { ScopedStorage } from '../../services/scopedStorage';
import { speakWord } from '../../services/dictionaryService';
import { detectUsedMissionWords } from '../../utils/curriculumEngine';
import {
  buildPeelScaffold,
  buildWritingPrompts,
  getDefaultWritingMode,
  getRecommendedWordTarget,
  getWritingLinkers,
  WRITING_MODE_SPECS,
  WritingScenario,
  WritingTargetWordInput
} from '../../utils/writingCoachPrompts';

interface WritingCoachPanelProps {
  activeMission?: ActivePracticeMission | null;
  onClearMission?: () => void;
  savedWords?: SavedWord[];
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onSavePhraseToSrs?: (phrase: string, contextSentence: string, tip?: string) => void;
}

function formatTimer(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const WritingCoachPanel: React.FC<WritingCoachPanelProps> = ({
  activeMission,
  onClearMission,
  savedWords = [],
  currentUser,
  onOpenAuth,
  onSavePhraseToSrs
}) => {
  const [scenario, setScenario] = useState<WritingScenario>('ielts');
  const [writingMode, setWritingMode] = useState<WritingCoachMode>(() =>
    getDefaultWritingMode('ielts', activeMission?.cefr)
  );
  const [promptIndex, setPromptIndex] = useState<number>(0);
  const [showPeelGuide, setShowPeelGuide] = useState<boolean>(false);
  const [selectedWordDetail, setSelectedWordDetail] = useState<string | null>(null);
  const [customTarget, setCustomTarget] = useState<string>(
    activeMission?.targetWords?.[0]?.word || savedWords[0]?.word || 'curriculum'
  );

  const draftKey = useMemo(() => {
    const missionKey = activeMission?.id || activeMission?.sourceTitle || 'free';
    return `${missionKey}__${scenario}__${writingMode}`;
  }, [activeMission?.id, activeMission?.sourceTitle, scenario, writingMode]);

  const [text, setText] = useState<string>(() =>
    ScopedStorage.getWritingDraft(currentUser?.id, draftKey)
  );
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SentenceEvaluationResult | null>(null);
  const [previousResult, setPreviousResult] = useState<SentenceEvaluationResult | null>(null);
  const [savedChunkKeys, setSavedChunkKeys] = useState<Record<string, boolean>>({});

  // Optional countdown timer
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number>(
    getRecommendedWordTarget('paragraph').timerMinutes * 60
  );

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const missionWords: WritingTargetWordInput[] = useMemo(() => {
    if (activeMission?.targetWords && activeMission.targetWords.length > 0) {
      return activeMission.targetWords;
    }
    return savedWords.slice(0, 5).map((w) => ({
      word: w.word,
      meaningVi: w.translation,
      exampleEn: w.contextSentence || w.exampleEn,
      pos: w.partOfSpeech
    }));
  }, [activeMission, savedWords]);

  // Adapt default writing mode when mission or scenario changes
  useEffect(() => {
    setWritingMode(getDefaultWritingMode(scenario, activeMission?.cefr));
    setPromptIndex(0);
    setSelectedWordDetail(null);
  }, [activeMission?.id, activeMission?.cefr, scenario]);

  // Load scoped draft whenever draftKey or userId changes
  useEffect(() => {
    const restored = ScopedStorage.getWritingDraft(currentUser?.id, draftKey);
    setText(restored);
    setResult(null);
    setPreviousResult(null);
    setError(null);
    setSavedChunkKeys({});
  }, [currentUser?.id, draftKey]);

  // Auto-save draft to ScopedStorage (debounced 400ms)
  useEffect(() => {
    const handle = window.setTimeout(() => {
      ScopedStorage.setWritingDraft(currentUser?.id, draftKey, text);
      if (text.trim()) {
        setDraftSavedAt(Date.now());
      } else {
        setDraftSavedAt(null);
      }
    }, 400);
    return () => window.clearTimeout(handle);
  }, [currentUser?.id, draftKey, text]);

  // Reset countdown timer duration when writingMode changes
  useEffect(() => {
    setTimerActive(false);
    setTimerSecondsLeft(getRecommendedWordTarget(writingMode).timerMinutes * 60);
  }, [writingMode]);

  useEffect(() => {
    if (!timerActive || timerSecondsLeft <= 0) return;
    const interval = window.setInterval(() => {
      setTimerSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [timerActive, timerSecondsLeft]);

  const modeSpec = getRecommendedWordTarget(writingMode);

  const promptOptions = useMemo(
    () =>
      buildWritingPrompts({
        scenario,
        writingMode,
        topicName: activeMission?.topicName || activeMission?.sourceTitle,
        cefr: activeMission?.cefr,
        targetWords: missionWords,
        grammarFocus: activeMission?.grammarFocus
      }),
    [scenario, writingMode, activeMission?.topicName, activeMission?.sourceTitle, activeMission?.cefr, missionWords, activeMission?.grammarFocus]
  );

  const activePrompt = promptOptions[promptIndex % promptOptions.length] || promptOptions[0];

  const peelSteps = useMemo(
    () => buildPeelScaffold(scenario, activePrompt, activeMission?.grammarFocus),
    [scenario, activePrompt, activeMission?.grammarFocus]
  );

  const linkers = useMemo(() => getWritingLinkers(scenario), [scenario]);

  const usedWords = useMemo(
    () => detectUsedMissionWords(text, missionWords.map((w) => w.word)),
    [text, missionWords]
  );

  const wordCount = useMemo(
    () => text.trim().split(/\s+/).filter(Boolean).length,
    [text]
  );

  const activeWordInfo = useMemo(
    () => missionWords.find((w) => w.word === selectedWordDetail) || null,
    [missionWords, selectedWordDetail]
  );

  const insertSnippetAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    const clean = snippet.trim();
    if (!el) {
      setText((prev) => (prev.trim() ? `${prev.trim()} ${clean} ` : `${clean} `));
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const needsLeadingSpace = before.length > 0 && !/\s$/.test(before);
    const needsTrailingSpace = after.length === 0 || !/^\s/.test(after);
    const inserted = `${needsLeadingSpace ? ' ' : ''}${clean}${needsTrailingSpace ? ' ' : ''}`;
    const next = `${before}${inserted}${after}`;
    setText(next);
    window.requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleSaveSingleChunk = (chunkKey: string, phrase: string, contextSentence: string, meaningVi: string) => {
    if (!onSavePhraseToSrs || savedChunkKeys[chunkKey]) return;
    onSavePhraseToSrs(phrase, contextSentence, meaningVi);
    setSavedChunkKeys((prev) => ({ ...prev, [chunkKey]: true }));
  };

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
          writingMode,
          promptText: activePrompt?.promptEn,
          userSentence: text.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Không thể chấm bài viết lúc này.');
      }
      if (result) {
        setPreviousResult(result);
      }
      setResult(data as SentenceEvaluationResult);
      setSavedChunkKeys({});
      setTimerActive(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối AI chấm viết.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleStartRewrite = () => {
    if (result) {
      setPreviousResult(result);
    }
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const requiredTargetCount = Math.min(modeSpec.minTargetWords, Math.max(1, missionWords.length));
  const wordCountStatus =
    wordCount === 0
      ? 'text-slate-400'
      : wordCount < modeSpec.minWords
        ? 'text-amber-600'
        : wordCount <= modeSpec.maxWords + 30
          ? 'text-emerald-600'
          : 'text-indigo-600';

  const scoreDelta = useMemo(() => {
    if (!result || !previousResult) return null;
    if (scenario === 'ielts' && typeof result.bandOverall === 'number' && typeof previousResult.bandOverall === 'number') {
      const diff = Math.round((result.bandOverall - previousResult.bandOverall) * 10) / 10;
      return {
        label: `Band ${previousResult.bandOverall.toFixed(1)} → ${result.bandOverall.toFixed(1)}`,
        diff,
        suffix: 'Band'
      };
    }
    const diff = result.score - previousResult.score;
    return {
      label: `${previousResult.score} → ${result.score}/10`,
      diff,
      suffix: 'điểm'
    };
  }, [result, previousResult, scenario]);

  return (
    <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4 animate-fade-in">
      {/* Header + Scenario Switcher */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-black uppercase">
            <PenTool className="w-3.5 h-3.5" /> AI Writing Coach 2.0 · Chuẩn IELTS 8.5+
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            {activeMission ? `Nhiệm vụ Viết: ${activeMission.sourceTitle}` : 'Phòng Luyện Viết IELTS & Giao Tiếp Thực Chiến'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Đọc đề bài, áp dụng tự nhiên từ vựng/ngữ pháp mục tiêu theo khung PEEL — AI chấm 4 tiêu chí & sửa từng cụm.
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

      {/* Progressive Mode Selector + Optional Timer */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['sentence', 'paragraph', 'essay'] as const).map((m) => {
            const spec = WRITING_MODE_SPECS[m];
            const active = writingMode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setWritingMode(m)}
                className={`px-3 py-1.5 rounded-xl border text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-black block leading-tight">{spec.labelVi}</span>
                <span className={`text-[10px] font-semibold ${active ? 'text-indigo-100' : 'text-slate-500'}`}>
                  {spec.minWords}–{spec.maxWords} từ
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (timerSecondsLeft === 0) {
                setTimerSecondsLeft(modeSpec.timerMinutes * 60);
              }
              setTimerActive((prev) => !prev);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              timerActive
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Đồng hồ bấm giờ luyện tốc độ viết"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timerActive ? `Đang tính: ${formatTimer(timerSecondsLeft)}` : `Bấm giờ (${modeSpec.timerMinutes}p)`}</span>
          </button>

          {activeMission && onClearMission && (
            <button
              type="button"
              onClick={onClearMission}
              className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Bỏ nhiệm vụ
            </button>
          )}
        </div>
      </div>

      {/* Task Prompt Card + PEEL Scaffolding Toggle */}
      {activePrompt && (
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white space-y-2.5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/25 border border-indigo-400/30 text-indigo-200 text-[10px] font-black uppercase tracking-wider">
              {activePrompt.taskTypeLabel}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPeelGuide((prev) => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  showPeelGuide
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-white/10 hover:bg-white/20 text-amber-200'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{showPeelGuide ? 'Ẩn dàn ý PEEL' : 'Gợi ý dàn ý PEEL'}</span>
              </button>
              <button
                type="button"
                onClick={() => setPromptIndex((prev) => (prev + 1) % promptOptions.length)}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-100 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                title="Đổi dạng đề khác (không tốn lượt AI)"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Đổi đề</span>
              </button>
            </div>
          </div>

          <p className="text-sm sm:text-base font-bold leading-relaxed text-white">
            &ldquo;{activePrompt.promptEn}&rdquo;
          </p>
          <p className="text-[11px] text-slate-300 font-medium">{activePrompt.instructionVi}</p>

          {showPeelGuide && (
            <div className="mt-2 pt-3 border-t border-white/10 space-y-3 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {peelSteps.map((step) => (
                  <div
                    key={step.code}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1 flex flex-col justify-between"
                  >
                    <div>
                      <p className="text-[11px] font-black text-teal-300">{step.label}</p>
                      <p className="text-[11px] text-slate-300 leading-snug mt-0.5">{step.hintVi}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => insertSnippetAtCursor(step.starterEn)}
                      className="mt-1.5 text-left text-[11px] font-semibold text-amber-200 hover:text-amber-100 underline decoration-dotted cursor-pointer"
                    >
                      + Chèn mở câu: &ldquo;{step.starterEn}&rdquo;
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Bấm để chèn nhanh từ nối học thuật (Cohesive Devices):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {linkers.map((lk) => (
                    <button
                      key={lk.phrase}
                      type="button"
                      onClick={() => insertSnippetAtCursor(lk.phrase)}
                      title={lk.functionVi}
                      className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/30 text-teal-200 text-[11px] font-bold cursor-pointer transition-all"
                    >
                      + {lk.phrase} <span className="text-teal-300/70 font-normal">({lk.functionVi})</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Target Vocabulary & Grammar Focus Bar */}
      {(activeMission?.grammarFocus || missionWords.length > 0) && (
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black text-indigo-950">
              {activeMission?.grammarFocus
                ? `🎯 Cấu trúc cần áp dụng: ${activeMission.grammarFocus.title}`
                : `🎯 Từ vựng mục tiêu (đã dùng ${usedWords.length}/${missionWords.length} · khuyến nghị tự nhiên ≥ ${requiredTargetCount} từ — bấm từng từ để xem collocation):`}
            </p>
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
                const isSelected = selectedWordDetail === item.word;
                return (
                  <button
                    key={item.word}
                    type="button"
                    onClick={() => setSelectedWordDetail((prev) => (prev === item.word ? null : item.word))}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isUsed
                        ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                        : isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-white border-indigo-200 text-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {isUsed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    <span>{item.word}</span>
                    <span className={`text-[11px] font-medium ${isSelected && !isUsed ? 'text-indigo-100' : 'text-slate-400'}`}>
                      ({item.meaningVi})
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Selected Word Collocation & Pattern Drawer */}
          {activeWordInfo && (
            <div className="p-3 rounded-xl bg-white border border-indigo-200 space-y-1.5 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-indigo-950">{activeWordInfo.word}</span>
                  {activeWordInfo.pos && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                      {activeWordInfo.pos}
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-600">— {activeWordInfo.meaningVi}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => speakWord(activeWordInfo.word, 'en', 0.92)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Nghe
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSnippetAtCursor(activeWordInfo.word)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    + Chèn vào bài
                  </button>
                </div>
              </div>

              {activeWordInfo.pattern && (
                <p className="text-xs font-medium text-slate-700">
                  <strong className="text-indigo-700">Cách dùng / Cấu trúc:</strong> {activeWordInfo.pattern}
                </p>
              )}

              {activeWordInfo.collocations && activeWordInfo.collocations.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-bold text-slate-500">Collocations:</span>
                  {activeWordInfo.collocations.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => insertSnippetAtCursor(col)}
                      className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[11px] font-bold cursor-pointer"
                      title="Bấm để chèn cụm này vào bài viết"
                    >
                      + {col}
                    </button>
                  ))}
                </div>
              )}

              {activeWordInfo.exampleEn && (
                <p className="text-xs italic text-slate-500">
                  Ví dụ: &ldquo;{activeWordInfo.exampleEn}&rdquo;
                </p>
              )}
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

      {/* Writing Editor Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          ref={textareaRef}
          rows={writingMode === 'essay' ? 8 : writingMode === 'paragraph' ? 6 : 4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            writingMode === 'paragraph'
              ? 'Bắt đầu bằng câu luận điểm (Point) trả lời đề bài, sau đó giải thích (Explain), cho ví dụ (Example) và chốt ý (Link)...'
              : writingMode === 'essay'
                ? 'Đoạn 1: Paraphrase đề bài + Luận điểm chính (Thesis).\nĐoạn 2: Thân bài theo khung PEEL.\nĐoạn 3: Kết luận ngắn gọn...'
                : 'Viết 1–2 câu tiếng Anh tự nhiên trả lời đề bài trên...'
          }
          className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:outline-none text-sm font-medium text-slate-900 leading-relaxed resize-y"
        />

        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className={wordCountStatus}>
              {wordCount} / {modeSpec.minWords}–{modeSpec.maxWords} từ
            </span>
            {draftSavedAt && (
              <span className="text-[11px] font-semibold text-slate-400">
                • Đã lưu nháp tự động
              </span>
            )}
            {text.trim().length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setText('');
                  ScopedStorage.setWritingDraft(currentUser?.id, draftKey, '');
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                Xóa nháp
              </button>
            )}
          </div>

          {currentUser ? (
            <button
              type="submit"
              disabled={isEvaluating || !text.trim()}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm cursor-pointer transition-all whitespace-nowrap"
            >
              {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{result ? 'Chấm lại & So sánh tiến bộ' : 'Chấm điểm & Nâng cấp bằng AI'}</span>
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

      {/* AI Evaluation Report (4-Criteria Rubric + Inline Diff + Band +1.0 Upgrade + Chunk Saver) */}
      {result && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-indigo-50/70 border border-indigo-200 space-y-4 animate-fade-in">
          {/* Score Header + Score Delta */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-indigo-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-800">
                Báo cáo chấm bài ({scenario === 'ielts' ? 'IELTS Writing' : scenario.toUpperCase()})
              </span>
              {result.isFallback && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                  Chế độ Offline
                </span>
              )}
              {scoreDelta && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                    scoreDelta.diff > 0
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                      : scoreDelta.diff === 0
                        ? 'bg-slate-100 border-slate-200 text-slate-700'
                        : 'bg-amber-100 border-amber-300 text-amber-800'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  {scoreDelta.label}
                  {scoreDelta.diff > 0 ? ` (+${scoreDelta.diff} ${scoreDelta.suffix})` : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {scenario === 'ielts' && typeof result.bandOverall === 'number' ? (
                <span className="px-3.5 py-1 rounded-full bg-indigo-600 text-white text-sm font-black shadow-xs">
                  Band {result.bandOverall.toFixed(1)}
                </span>
              ) : (
                <span className="px-3.5 py-1 rounded-full bg-white border border-indigo-200 text-sm font-black text-indigo-700 shadow-xs">
                  {result.score} / 10 điểm
                </span>
              )}
            </div>
          </div>

          {/* 4-Criteria Rubric Grid */}
          {result.criteria && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { label: result.criteria.labels[0], val: result.criteria.c1 },
                  { label: result.criteria.labels[1], val: result.criteria.c2 },
                  { label: result.criteria.labels[2], val: result.criteria.c3 },
                  { label: result.criteria.labels[3], val: result.criteria.c4 }
                ] as const
              ).map((crit) => (
                <div key={crit.label} className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-center">
                  <p className="text-[10px] font-bold text-slate-500 leading-tight">{crit.label}</p>
                  <p className="text-base font-black text-indigo-700 mt-0.5">
                    {scenario === 'ielts' ? crit.val.toFixed(1) : `${crit.val}/10`}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Examiner Summary Feedback */}
          <p className="text-sm font-semibold text-slate-800 leading-relaxed">{result.feedbackVi}</p>

          {/* Target Vocabulary Context Audit */}
          {result.targetWordsAudit && result.targetWordsAudit.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Đánh giá cách dùng từ mục tiêu:
              </p>
              <div className="flex flex-wrap gap-2">
                {result.targetWordsAudit.map((audit) => (
                  <div
                    key={audit.word}
                    className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 ${
                      audit.usedCorrectly
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <span className="font-black">{audit.usedCorrectly ? '✓' : '!'} {audit.word}</span>
                    {audit.noteVi && <span className="text-[11px] opacity-80">— {audit.noteVi}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inline Error Corrections (Red Strikethrough -> Green Replacement) */}
          {result.inlineCorrections && result.inlineCorrections.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-rose-700">
                Sửa lỗi chi tiết trên bài của bạn ({result.inlineCorrections.length} điểm cần nâng):
              </p>
              <div className="space-y-2">
                {result.inlineCorrections.map((corr, idx) => (
                  <div
                    key={`${corr.original}-${idx}`}
                    className="p-3 rounded-xl bg-white border border-rose-100 space-y-1"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-bold">
                      <span className="line-through text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        {corr.original}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {corr.corrected}
                      </span>
                    </div>
                    {corr.explanationVi && (
                      <p className="text-xs text-slate-600 font-medium">{corr.explanationVi}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Polished +1.0 Band Rewrite (Preserving Learner's Ideas) */}
          <div className="p-4 rounded-xl bg-white border border-emerald-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase text-emerald-700">
                ✨ Bản nâng cấp +1.0 Band (giữ nguyên ý của bạn):
              </span>
              <button
                type="button"
                onClick={() => speakWord(result.naturalVersion, 'en', 0.92)}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" /> Nghe bản mẫu
              </button>
            </div>
            <p className="text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-line">
              &ldquo;{result.naturalVersion}&rdquo;
            </p>
          </div>

          {/* Upgraded Lexical Chunks for 1-Click FSRS-6 Saving */}
          {result.upgradedChunks && result.upgradedChunks.length > 0 && onSavePhraseToSrs && (
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-teal-800">
                Cụm từ ăn điểm nên lưu vào Kho FSRS-6:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {result.upgradedChunks.map((chunk, idx) => {
                  const key = `${chunk.upgraded}-${idx}`;
                  const isSaved = Boolean(savedChunkKeys[key]);
                  return (
                    <div
                      key={key}
                      className="p-3 rounded-xl bg-white border border-teal-200/80 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1 text-xs font-black text-teal-900">
                          {chunk.weak && (
                            <>
                              <span className="line-through text-slate-400 font-semibold">{chunk.weak}</span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                            </>
                          )}
                          <span>{chunk.upgraded}</span>
                        </div>
                        {chunk.meaningVi && (
                          <p className="text-[11px] text-slate-600 font-medium mt-0.5">{chunk.meaningVi}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={isSaved}
                        onClick={() =>
                          handleSaveSingleChunk(key, chunk.upgraded, chunk.contextSentence, chunk.meaningVi)
                        }
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                          isSaved
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                        }`}
                      >
                        {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
                        <span>{isSaved ? 'Đã lưu' : 'Lưu FSRS'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.collocationTip && (
            <p className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              💡 {result.collocationTip}
            </p>
          )}

          {/* Rewrite Loop CTA */}
          <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleStartRewrite}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sửa bài & Chấm lại nâng Band</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
