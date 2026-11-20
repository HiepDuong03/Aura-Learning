import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AuthUser, SavedWord, AnkiRating, SentenceEvaluationResult } from '../../types';
import {
  Volume2,
  RotateCw,
  Sparkles,
  Award,
  BrainCircuit,
  BookMarked,
  Film,
  Eye,
  EyeOff,
  Keyboard,
  Mic,
  MicOff,
  Briefcase,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Repeat,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { evaluateSentencePractice, speakWord } from '../../services/dictionaryService';
import { authService } from '../../services/authService';
import {
  calculateFsrsRetrievability,
  getFsrsIntervalPreviews,
  inferFsrsState
} from '../../services/fsrsScheduler';
import { buildClozeSentence } from '../../utils/clozeHelper';
import {
  advanceReviewSession,
  createReviewSession,
  isReviewSessionDone,
  ReviewSessionState
} from '../../utils/srsSessionQueue';
import { assessSpeech } from '../../utils/speechAssessor';
import { useNotify } from '../Common/ToastProvider';

type StudyModality = 'cloze' | 'typing' | 'speak';

interface VocabularyReviewProps {
  savedWords: SavedWord[];
  onReviewWord: (wordId: string, rating: AnkiRating) => void;
  onOpenWordInVideo?: (word: SavedWord) => void;
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
}

function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9'\s]/g, '')
    .replace(/\s+/g, ' ');
}

export const VocabularyReview: React.FC<VocabularyReviewProps> = ({
  savedWords,
  onReviewWord,
  onOpenWordInVideo,
  currentUser = null,
  onOpenAuth
}) => {
  const { toast } = useNotify();
  const [sessionState, setSessionState] = useState<ReviewSessionState | null>(null);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'due' | 'all' | 'mastered'>('due');
  const [studyModality, setStudyModality] = useState<StudyModality>('cloze');
  const [peekWord, setPeekWord] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [lastSessionSummary, setLastSessionSummary] = useState<{ graduated: number; attempts: number } | null>(null);

  // Typing Cloze state
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [typingResult, setTypingResult] = useState<'idle' | 'exact' | 'close' | 'miss'>('idle');

  // Spoken Recall (Production Effect) state
  const [isSpeakingMic, setIsSpeakingMic] = useState<boolean>(false);
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');
  const [spokenScore, setSpokenScore] = useState<number | null>(null);
  const recognitionRef = useRef<{ start: () => void; stop: () => void; abort: () => void } | null>(null);

  // Active Sentence Production (Work / Daily AI coach) state
  const [showSentenceCoach, setShowSentenceCoach] = useState<boolean>(false);
  const [sentenceScenario, setSentenceScenario] = useState<'work' | 'daily'>('work');
  const [userSentence, setUserSentence] = useState<string>('');
  const [isEvaluatingSentence, setIsEvaluatingSentence] = useState<boolean>(false);
  const [sentenceEval, setSentenceEval] = useState<SentenceEvaluationResult | null>(null);
  const [sentenceError, setSentenceError] = useState<string>('');

  const [now] = useState<number>(() => Date.now());
  const isStudyMode = sessionState !== null;

  // Filter words for overview & session creation
  const dueWords = useMemo(
    () => savedWords.filter((w) => !w.dueAt || w.dueAt <= Date.now()),
    [savedWords]
  );
  const masteredWords = useMemo(
    () =>
      savedWords.filter((w) => {
        const fsrs = inferFsrsState(w);
        return fsrs.stability >= 21 || (w.interval || 0) >= 21;
      }),
    [savedWords]
  );

  const displayWords =
    filterMode === 'due'
      ? dueWords.length > 0
        ? dueWords
        : savedWords
      : filterMode === 'mastered'
      ? masteredWords
      : savedWords;

  // Resolve current card from frozen session queue (never skips cards when dueAt mutates!)
  const currentWordId = sessionState?.queue[0] || null;
  const currentWord = useMemo(
    () => (currentWordId ? savedWords.find((w) => w.id === currentWordId) || null : null),
    [savedWords, currentWordId]
  );

  const resetCardInteractionState = useCallback(() => {
    setIsFlipped(false);
    setPeekWord(false);
    setTypedAnswer('');
    setTypingResult('idle');
    setSpokenTranscript('');
    setSpokenScore(null);
    setShowSentenceCoach(false);
    setUserSentence('');
    setSentenceEval(null);
    setSentenceError('');
    setIsEvaluatingSentence(false);
    if (recognitionRef.current && isSpeakingMic) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsSpeakingMic(false);
    }
  }, [isSpeakingMic]);

  // Dynamic FSRS-6 telemetry & previews for current card
  const previews = currentWord ? getFsrsIntervalPreviews(currentWord) : null;
  const currentFsrs = currentWord ? inferFsrsState(currentWord) : null;
  const currentRetrievability = currentWord ? calculateFsrsRetrievability(currentWord) : 100;
  const clozeData = currentWord?.contextSentence
    ? buildClozeSentence(currentWord.contextSentence, currentWord.word)
    : null;
  const currentRelearnCount = currentWord && sessionState ? sessionState.relearnCounts[currentWord.id] || 0 : 0;

  const handleStartSession = () => {
    if (displayWords.length === 0) return;
    setSessionState(createReviewSession(displayWords));
    setIsFinished(false);
    setLastSessionSummary(null);
    resetCardInteractionState();
  };

  const handleExitSession = useCallback(() => {
    setSessionState(null);
    resetCardInteractionState();
  }, [resetCardInteractionState]);

  const handleRate = useCallback(
    (rating: AnkiRating) => {
      if (!currentWord || !sessionState) return;

      onReviewWord(currentWord.id, rating);
      const nextSession = advanceReviewSession(sessionState, currentWord.id, rating);

      if (rating === 1) {
        toast.info(`Đã đưa "${currentWord.word}" vào hàng đợi lặp lại ngay trong phiên này.`);
      }

      resetCardInteractionState();

      if (isReviewSessionDone(nextSession)) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        setLastSessionSummary({
          graduated: nextSession.completedIds.length,
          attempts: nextSession.totalAttempts
        });
        setSessionState(null);
        setIsFinished(true);
      } else {
        setSessionState(nextSession);
      }
    },
    [currentWord, sessionState, onReviewWord, resetCardInteractionState, toast]
  );

  // Check Typing Cloze answer
  const handleCheckTypedAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !typedAnswer.trim()) return;
    const expected = normalizeForCompare(currentWord.word);
    const actual = normalizeForCompare(typedAnswer);

    if (actual === expected) {
      setTypingResult('exact');
      speakWord(currentWord.word);
    } else if (expected.includes(actual) || actual.includes(expected)) {
      setTypingResult('close');
    } else {
      setTypingResult('miss');
    }
    setIsFlipped(true);
  };

  // Web Speech API for Speak Recall (Production Effect)
  const handleToggleSpeakRecall = () => {
    if (!currentWord) return;

    if (isSpeakingMic && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsSpeakingMic(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
        abort: () => void;
      };
      webkitSpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
        abort: () => void;
      };
    };

    const SpeechCtor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechCtor) {
      toast.info('Trình duyệt chưa hỗ trợ Web Speech API. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    const rec = new SpeechCtor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    const targetPrompt = currentWord.contextSentence && currentWord.contextSentence.trim()
      ? currentWord.contextSentence
      : currentWord.word;

    rec.onresult = (event) => {
      let combined = '';
      let isFinal = false;
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res?.[0]?.transcript) combined += res[0].transcript;
        if (res?.isFinal) isFinal = true;
      }
      setSpokenTranscript(combined);
      if (isFinal && combined.trim()) {
        const result = assessSpeech(targetPrompt, combined, 1500);
        setSpokenScore(result.overallScore);
        setIsSpeakingMic(false);
        setIsFlipped(true);
      }
    };
    rec.onerror = () => setIsSpeakingMic(false);
    rec.onend = () => setIsSpeakingMic(false);

    recognitionRef.current = rec;
    setSpokenTranscript('');
    setSpokenScore(null);
    try {
      rec.start();
      setIsSpeakingMic(true);
    } catch {
      setIsSpeakingMic(false);
    }
  };

  // Evaluate learner's own real-world Work / Daily sentence via AI
  const handleEvaluateSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord) return;
    if (!currentUser) {
      onOpenAuth?.();
      return;
    }
    const trimmed = userSentence.trim();
    if (trimmed.length < 4) {
      setSentenceError('Hãy viết một câu tiếng Anh hoàn chỉnh (tối thiểu 4 ký tự).');
      return;
    }

    setIsEvaluatingSentence(true);
    setSentenceError('');
    try {
      const res = await evaluateSentencePractice({
        targetWord: currentWord.word,
        userSentence: trimmed,
        scenario: sentenceScenario,
        contextSentence: currentWord.contextSentence,
        token: authService.getToken()
      });
      setSentenceEval(res);
    } catch (err) {
      setSentenceError(err instanceof Error ? err.message : 'Không thể chấm câu bằng AI lúc này.');
    } finally {
      setIsEvaluatingSentence(false);
    }
  };

  // Keyboard shortcuts (Space = flip, Escape = exit, 1/2/3/4 = rate) — skipped when typing in input/textarea
  useEffect(() => {
    if (!isStudyMode || !currentWord) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTypingField =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.code === 'Escape') {
        e.preventDefault();
        handleExitSession();
        return;
      }
      if (isTypingField) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') handleRate(1);
        if (e.key === '2') handleRate(2);
        if (e.key === '3') handleRate(3);
        if (e.key === '4') handleRate(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudyMode, isFlipped, currentWord, handleExitSession, handleRate]);

  if (savedWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm max-w-xl mx-auto my-12">
        <div className="size-16 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
          <BookMarked className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Chưa có từ vựng nào được lưu</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          Khi xem video, hãy bấm vào từ hoặc bôi đen cụm từ chưa biết và nhấn "Lưu vào Flashcards" để thuật toán FSRS-6 tự động lên lịch ôn tập!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BrainCircuit className="w-7 h-7 text-teal-600" /> Ôn Tập Chủ Động FSRS-6
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 text-indigo-700">
              FSRS-6 • 90% Retention
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Lập lịch theo mô hình trí nhớ DSR (Stability & Difficulty), lặp lại ngay thẻ quên và luyện đặt câu thực chiến Công việc / Đời sống
          </p>
        </div>

        {!isStudyMode && displayWords.length > 0 && (
          <button
            type="button"
            onClick={handleStartSession}
            className="px-6 py-3 rounded-2xl btn-3d btn-3d-teal text-sm font-black shadow-[0_4px_0_#0f766e] flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            Bắt đầu ôn {displayWords.length} thẻ ➔
          </button>
        )}
      </div>

      {/* Completion Banner */}
      {isFinished && !isStudyMode && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Xuất sắc! Bạn đã hoàn thành toàn bộ phiên ôn tập hôm nay!
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {lastSessionSummary
                  ? `Đã thuộc ${lastSessionSummary.graduated} thẻ sau ${lastSessionSummary.attempts} lượt truy xuất. Thuật toán FSRS-6 đã cập nhật Độ bền (S) và Độ khó (D) tối ưu cho từng thẻ.`
                  : 'Thuật toán FSRS-6 đã tự động tối ưu lịch ôn tiếp theo theo đường cong quên lãng.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsFinished(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white"
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      {!isStudyMode && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMode('due')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'due'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Đến hạn hôm nay ({dueWords.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'all'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tất cả từ ({savedWords.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('mastered')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'mastered'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Đã thuộc sâu ({masteredWords.length})
          </button>
        </div>
      )}

      {/* Empty Filter State */}
      {!isStudyMode && displayWords.length === 0 && (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm space-y-2 animate-fade-in">
          <div className="size-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto text-2xl">
            🌱
          </div>
          <h3 className="text-sm font-black text-slate-800">
            {filterMode === 'mastered'
              ? 'Chưa có từ nào đạt "Đã thuộc sâu" (Độ bền Stability ≥ 21 ngày)'
              : 'Không có thẻ từ nào trong mục này'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterMode === 'mastered'
              ? 'Hãy ôn đều đặn hàng ngày — khi độ bền trí nhớ đạt ≥ 21 ngày, từ sẽ tự động nâng cấp thành Known trên cả phụ đề video!'
              : 'Bấm vào từ hoặc bôi đen cụm từ trong video để thêm vào danh sách ôn tập.'}
          </p>
        </div>
      )}

      {/* FLASHCARD STUDY VIEW (SRS 2.0: Frozen Queue + Intra-day Relearning + 3 Active Modalities + AI Sentence Coach) */}
      {isStudyMode && currentWord && sessionState ? (
        <div className="max-w-xl mx-auto space-y-4">
          {/* Top Progress, Modality Switcher & FSRS-6 DSR Telemetry */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-teal-700 font-black">
                  Đã thuộc {sessionState.completedIds.length} / {sessionState.initialCount}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500">Còn {sessionState.queue.length} thẻ</span>
                {currentRelearnCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black">
                    <Repeat className="w-3 h-3" /> Lặp lại lần {currentRelearnCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleExitSession}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold"
              >
                Thoát [Esc]
              </button>
            </div>

            {/* 3 Active Retrieval Modality Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100">
              {(
                [
                  { id: 'cloze', label: 'Cloze Ngữ Cảnh', icon: Sparkles },
                  { id: 'typing', label: 'Gõ Điền Từ', icon: Keyboard },
                  { id: 'speak', label: 'Nói Thành Tiếng', icon: Mic }
                ] as Array<{ id: StudyModality; label: string; icon: typeof Sparkles }>
              ).map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setStudyModality(m.id);
                      setPeekWord(false);
                      setTypingResult('idle');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${
                      studyModality === m.id
                        ? 'bg-white text-teal-700 shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* FSRS-6 DSR Diagnostic Stats */}
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className="p-1.5 rounded-xl bg-slate-50" title="Stability (S): Số ngày để xác suất nhớ giảm về 90%">
                <span className="block text-[10px] font-bold text-slate-400">Độ bền (S)</span>
                <span className="text-xs font-black text-sky-700">
                  {currentFsrs && !currentFsrs.isNewCard ? `${currentFsrs.stability.toFixed(1)}d` : 'Mới'}
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-slate-50" title="Difficulty (D): Độ khó của thẻ từ 1.0 (rất dễ) đến 10.0 (rất khó)">
                <span className="block text-[10px] font-bold text-slate-400">Độ khó (D)</span>
                <span className="text-xs font-black text-purple-700">
                  {currentFsrs ? `${currentFsrs.difficulty.toFixed(1)}/10` : '5.0/10'}
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-slate-50">
                <span className="block text-[10px] font-bold text-slate-400">Chuỗi nhớ</span>
                <span className="text-xs font-black text-emerald-700">
                  {currentWord.repetitions || 0} lần
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-slate-50" title="Retrievability (R): Xác suất nhớ hiện tại theo đường cong FSRS-6">
                <span className="block text-[10px] font-bold text-slate-400">Xác suất (R)</span>
                <span
                  className={`text-xs font-black ${
                    currentRetrievability >= 80
                      ? 'text-emerald-600'
                      : currentRetrievability >= 50
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                >
                  {currentRetrievability}%
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Flashcard */}
          <div
            onClick={() => {
              if (studyModality === 'cloze' || isFlipped) {
                setIsFlipped(!isFlipped);
              }
            }}
            className={`relative min-h-[350px] w-full rounded-3xl bg-white border-2 border-slate-200/90 shadow-xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
              studyModality === 'cloze' ? 'cursor-pointer hover:border-teal-400' : ''
            }`}
          >
            {/* Card Top Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                  {currentWord.partOfSpeech}
                </span>
                {!isFlipped && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {studyModality === 'typing'
                      ? 'Gõ điền từ'
                      : studyModality === 'speak'
                      ? 'Nói thành tiếng'
                      : clozeData?.hasMatch
                      ? 'Cloze Ngữ Cảnh'
                      : 'Nhận diện từ'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {!isFlipped && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPeekWord((prev) => !prev);
                    }}
                    className="px-2.5 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 text-[11px] font-bold flex items-center gap-1 transition-all"
                    title="Gợi ý chữ cái đầu"
                  >
                    {peekWord ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{peekWord ? 'Ẩn gợi ý' : 'Gợi ý'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakWord(
                      !isFlipped && studyModality === 'speak' && currentWord.contextSentence
                        ? currentWord.contextSentence
                        : currentWord.word
                    );
                  }}
                  className="p-2.5 rounded-full bg-teal-50 text-teal-600 hover:bg-teal-100 hover:scale-105 active:scale-95 transition-all"
                  title="Nghe phát âm chuẩn"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Card Center: FRONT vs BACK */}
            <div className="my-4 space-y-3">
              {!isFlipped ? (
                <>
                  {/* Cloze Sentence Display (used in Cloze & Typing modes when sentence matches) */}
                  {clozeData?.hasMatch && (studyModality === 'cloze' || studyModality === 'typing') ? (
                    <div className="space-y-3 text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        {studyModality === 'typing'
                          ? 'Gõ chính xác từ/cụm từ bị ẩn trong câu:'
                          : 'Nhớ lại từ bị ẩn trong ngữ cảnh câu:'}
                      </p>
                      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-left">
                        <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                          “
                          {clozeData.parts.map((part, idx) =>
                            part.isTarget ? (
                              <span
                                key={idx}
                                className="inline-block mx-1 px-3 py-0.5 rounded-lg bg-indigo-600 text-white font-mono text-sm tracking-widest align-baseline"
                              >
                                {peekWord
                                  ? `${currentWord.word.slice(0, Math.min(3, currentWord.word.length))}...`
                                  : '______'}
                              </span>
                            ) : (
                              <span key={idx}>{part.text}</span>
                            )
                          )}
                          ”
                        </p>
                      </div>
                      <p className="text-xs font-bold text-slate-500">
                        Nghĩa gợi ý: <span className="text-teal-700">{currentWord.translation}</span>
                        {currentWord.phonetic ? ` • ${currentWord.phonetic}` : ''}
                      </p>
                    </div>
                  ) : studyModality === 'typing' ? (
                    <div className="space-y-2 text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                        Viết từ tiếng Anh tương ứng với nghĩa:
                      </p>
                      <h2 className="text-2xl font-black text-slate-900">{currentWord.translation}</h2>
                      {peekWord && (
                        <p className="text-xs font-mono font-bold text-indigo-600">
                          Gợi ý: {currentWord.word.slice(0, Math.min(3, currentWord.word.length))}... ({currentWord.word.length} ký tự)
                        </p>
                      )}
                    </div>
                  ) : studyModality === 'speak' ? (
                    <div className="space-y-3 text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-teal-700">
                        Đọc to thành tiếng để kích hoạt trí nhớ vận động (Production Effect):
                      </p>
                      <h2 className="text-3xl font-black text-slate-900 capitalize">{currentWord.word}</h2>
                      {currentWord.phonetic && (
                        <p className="text-sm font-bold text-teal-600">{currentWord.phonetic}</p>
                      )}
                      {currentWord.contextSentence && (
                        <p className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 italic">
                          “{currentWord.contextSentence}”
                        </p>
                      )}
                      <div className="pt-2 flex flex-col items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSpeakRecall();
                          }}
                          className={`px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 ${
                            isSpeakingMic
                              ? 'bg-rose-600 text-white shadow-lg animate-pulse'
                              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-md'
                          }`}
                        >
                          {isSpeakingMic ? (
                            <>
                              <MicOff className="w-4 h-4" /> Đang nghe... (Nhấn để dừng)
                            </>
                          ) : (
                            <>
                              <Mic className="w-4 h-4" /> Bấm Mic & Nói to câu này
                            </>
                          )}
                        </button>
                        {spokenTranscript && (
                          <p className="text-xs text-slate-600 italic">Bạn vừa nói: “{spokenTranscript}”</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-center">
                      <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight capitalize">
                        {currentWord.word}
                      </h2>
                      <p className="text-base font-bold text-teal-600 tracking-wide">{currentWord.phonetic}</p>
                      {currentWord.contextSentence && (
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 mt-3 text-left">
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Câu trong video:
                          </p>
                          <p className="text-xs italic text-slate-700 font-medium">
                            “{currentWord.contextSentence}”
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Typing Cloze Input Box */}
                  {studyModality === 'typing' && (
                    <form
                      onSubmit={handleCheckTypedAnswer}
                      onClick={(e) => e.stopPropagation()}
                      className="pt-2 flex gap-2"
                    >
                      <input
                        type="text"
                        value={typedAnswer}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        placeholder={`Gõ từ/cụm từ tiếng Anh...`}
                        autoFocus
                        className="flex-1 h-11 px-4 rounded-xl border-2 border-indigo-200 bg-white text-sm font-bold text-slate-900 focus:border-indigo-500 outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!typedAnswer.trim()}
                        className="px-4 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black disabled:opacity-50 shrink-0"
                      >
                        Kiểm tra ↵
                      </button>
                    </form>
                  )}

                  {studyModality === 'cloze' && (
                    <p className="text-xs font-bold text-slate-400 pt-1 flex items-center justify-center gap-1">
                      <RotateCw className="w-3.5 h-3.5" /> Bấm vào thẻ (hoặc phím Space) để lật đáp án
                    </p>
                  )}
                </>
              ) : (
                /* CARD BACK */
                <div className="space-y-3 animate-fade-in text-left" onClick={(e) => e.stopPropagation()}>
                  {/* Typing / Spoken Recall Instant Feedback Banner */}
                  {typingResult !== 'idle' && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                        typingResult === 'exact'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : typingResult === 'close'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      {typingResult === 'exact' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Chính xác 100%! Gợi ý bấm: Nhớ tốt (3) hoặc Quá dễ (4).</span>
                        </>
                      ) : typingResult === 'close' ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Gần đúng (bạn gõ: “{typedAnswer}”). Gợi ý bấm: Nhớ khó (2).</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Chưa khớp (bạn gõ: “{typedAnswer}”). Gợi ý bấm: Quên (1) để lặp lại ngay!</span>
                        </>
                      )}
                    </div>
                  )}

                  {spokenScore !== null && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                        spokenScore >= 80
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      <span>🎙️ Độ khớp phát âm: {spokenScore}%</span>
                      <span className="font-normal italic truncate max-w-[60%]">“{spokenTranscript}”</span>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between gap-2 flex-wrap">
                    <h3 className="text-2xl font-black text-slate-900 capitalize">{currentWord.word}</h3>
                    {currentWord.phonetic && (
                      <span className="text-xs font-bold text-teal-600">{currentWord.phonetic}</span>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-100">
                    <p className="text-[11px] font-black uppercase tracking-wider text-teal-700">
                      Nghĩa tiếng Việt
                    </p>
                    <h4 className="text-xl font-black text-slate-900 mt-0.5">
                      {currentWord.translation}
                    </h4>
                  </div>

                  {clozeData && clozeData.parts.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Câu đầy đủ trong video:
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        “
                        {clozeData.parts.map((part, idx) =>
                          part.isTarget ? (
                            <mark
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-teal-200/80 text-teal-950 font-black"
                            >
                              {part.text}
                            </mark>
                          ) : (
                            <span key={idx}>{part.text}</span>
                          )
                        )}
                        ”
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Định nghĩa tiếng Anh
                    </p>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {currentWord.definitionEn}
                    </p>
                  </div>

                  {/* ACTIVE PRODUCTION: Real-life Work / Daily Sentence Coach */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowSentenceCoach((prev) => !prev)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-50 to-indigo-50 hover:from-teal-100 hover:to-indigo-100 border border-indigo-200/80 text-indigo-800 font-black text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>
                        {showSentenceCoach
                          ? 'Thu gọn khung luyện đặt câu thực chiến'
                          : '✍️ Luyện dùng từ này ngay (Đặt câu Công việc / Đời sống + AI sửa)'}
                      </span>
                    </button>

                    {showSentenceCoach && (
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-indigo-200/80 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] font-black text-slate-700">Chọn bối cảnh áp dụng:</span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSentenceScenario('work')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border ${
                                sentenceScenario === 'work'
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              <Briefcase className="w-3 h-3" /> Công việc / Email
                            </button>
                            <button
                              type="button"
                              onClick={() => setSentenceScenario('daily')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 border ${
                                sentenceScenario === 'daily'
                                  ? 'bg-teal-600 text-white border-teal-600'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              <Coffee className="w-3 h-3" /> Đời sống
                            </button>
                          </div>
                        </div>

                        <form onSubmit={handleEvaluateSentence} className="space-y-2">
                          <textarea
                            rows={2}
                            value={userSentence}
                            onChange={(e) => setUserSentence(e.target.value)}
                            placeholder={
                              sentenceScenario === 'work'
                                ? `Viết 1 câu họp/email công việc có chứa "${currentWord.word}"...`
                                : `Viết 1 câu giao tiếp hằng ngày có chứa "${currentWord.word}"...`
                            }
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-indigo-500 outline-none resize-none"
                          />
                          <button
                            type="submit"
                            disabled={isEvaluatingSentence || !userSentence.trim()}
                            className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {isEvaluatingSentence ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> AI đang chấm độ tự nhiên...
                              </>
                            ) : currentUser ? (
                              <>
                                <Send className="w-3.5 h-3.5" /> Chấm & Gợi ý cách nói chuẩn bản xứ
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" /> Đăng nhập để dùng AI chấm câu
                              </>
                            )}
                          </button>
                        </form>

                        {sentenceError && (
                          <p className="text-[11px] font-bold text-rose-600">{sentenceError}</p>
                        )}

                        {sentenceEval && (
                          <div className="p-3 rounded-xl bg-white border border-indigo-100 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-indigo-900">
                                Điểm tự nhiên: {sentenceEval.score}/10 {sentenceEval.isCorrectUsage ? '✅' : '⚠️'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                {sentenceEval.isFallback ? 'Offline Check' : 'Live Gemini'}
                              </span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{sentenceEval.feedbackVi}</p>
                            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start justify-between gap-2">
                              <div>
                                <span className="block text-[10px] font-black text-emerald-800 uppercase">
                                  Phiên bản chuẩn bản xứ:
                                </span>
                                <p className="font-bold text-emerald-950 mt-0.5">“{sentenceEval.naturalVersion}”</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => speakWord(sentenceEval.naturalVersion)}
                                className="p-1.5 rounded-lg bg-white text-emerald-700 hover:bg-emerald-100 shrink-0"
                                title="Nghe phát âm phiên bản bản xứ"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            </div>
                            {sentenceEval.collocationTip && (
                              <p className="text-[11px] text-slate-500 italic">💡 {sentenceEval.collocationTip}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {onOpenWordInVideo && (currentWord.sourceLessonId || currentWord.sourceYoutubeId) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenWordInVideo(currentWord);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Film className="w-4 h-4" />
                      <span>
                        🎬 Xem lại đoạn video gốc
                        {typeof currentWord.sourceTimestampSec === 'number'
                          ? ` (${Math.floor(currentWord.sourceTimestampSec / 60)}:${String(
                              Math.floor(currentWord.sourceTimestampSec % 60)
                            ).padStart(2, '0')})`
                          : ''}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom source reminder */}
            <div className="text-center text-[10px] font-bold text-slate-400">
              {currentWord.videoTitle ? `Nguồn: ${currentWord.videoTitle}` : 'Thẻ từ vựng YouTube'}
            </div>
          </div>

          {/* THE 4 FSRS-6 RATING BUTTONS (Honest Labels per Anki FSRS Guidelines) */}
          {isFlipped ? (
            <div className="space-y-2 animate-fade-in">
              <p className="text-center text-[11px] font-bold text-slate-500">
                Đánh giá trung thực (Phím 1–4) • <span className="text-rose-600">Chỉ bấm Quên (1) khi không nhớ; Nhớ khó (2) là đã nhớ nhưng tốn sức</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleRate(1)}
                  className={`p-3 rounded-2xl bg-rose-50 border-2 hover:bg-rose-100 active:scale-95 transition-all text-center group ${
                    typingResult === 'miss' ? 'border-rose-500 ring-2 ring-rose-300' : 'border-rose-200'
                  }`}
                >
                  <span className="block text-xs font-black text-rose-700">1 • Quên (Again)</span>
                  <span className="block text-[11px] font-bold text-rose-500 mt-0.5">{previews?.[1]}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRate(2)}
                  className={`p-3 rounded-2xl bg-amber-50 border-2 hover:bg-amber-100 active:scale-95 transition-all text-center group ${
                    typingResult === 'close' ? 'border-amber-500 ring-2 ring-amber-300' : 'border-amber-200'
                  }`}
                >
                  <span className="block text-xs font-black text-amber-700">2 • Nhớ khó (Hard)</span>
                  <span className="block text-[11px] font-bold text-amber-600 mt-0.5">{previews?.[2]}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRate(3)}
                  className={`p-3 rounded-2xl bg-teal-50 border-2 hover:bg-teal-100 active:scale-95 transition-all text-center group shadow-sm ${
                    typingResult === 'exact' ? 'border-teal-600 ring-2 ring-teal-300' : 'border-teal-300'
                  }`}
                >
                  <span className="block text-xs font-black text-teal-800">3 • Nhớ tốt (Good)</span>
                  <span className="block text-[11px] font-bold text-teal-600 mt-0.5">{previews?.[3]}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRate(4)}
                  className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-300 hover:bg-emerald-100 active:scale-95 transition-all text-center group shadow-sm"
                >
                  <span className="block text-xs font-black text-emerald-800">4 • Quá dễ (Easy)</span>
                  <span className="block text-[11px] font-bold text-emerald-600 mt-0.5">{previews?.[4]}</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsFlipped(true)}
              className="w-full py-4 rounded-2xl btn-3d btn-3d-teal font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_0_#0f766e]"
            >
              <RotateCw className="w-4 h-4" /> Hiển thị đáp án (Space)
            </button>
          )}
        </div>
      ) : (
        /* OVERVIEW GRID WITH FSRS-6 DSR BADGES */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayWords.map((word) => {
            const isDue = !word.dueAt || word.dueAt <= now;
            const retrievability = calculateFsrsRetrievability(word, now);
            const fsrs = inferFsrsState(word);

            return (
              <div
                key={word.id}
                className={`p-4 rounded-3xl bg-white border transition-all duration-200 flex flex-col justify-between ${
                  isDue ? 'border-teal-300 shadow-md ring-1 ring-teal-100' : 'border-slate-100 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-lg font-black text-slate-900 capitalize truncate">{word.word}</h3>
                      <button
                        type="button"
                        onClick={() => speakWord(word.word)}
                        className="p-1 rounded-full text-teal-600 hover:bg-teal-50 shrink-0"
                        aria-label={`Phát âm ${word.word}`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    {isDue ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 shrink-0">
                        Cần ôn ngay
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">
                        Còn {Math.max(1, Math.round((word.dueAt - now) / 86400000))} ngày
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-teal-600 mt-0.5">{word.phonetic}</p>
                  <p className="text-sm font-bold text-slate-800 mt-2">{word.translation}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{word.definitionEn}</p>
                </div>

                {/* FSRS-6 Diagnostic Mini-Bar */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>
                    D: <strong className="text-purple-700">{fsrs.difficulty.toFixed(1)}</strong>
                  </span>
                  <span>
                    S: <strong className="text-sky-700">{fsrs.isNewCard ? 'Mới' : `${fsrs.stability.toFixed(1)}d`}</strong>
                  </span>
                  <span className={`font-black ${retrievability >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {retrievability}% nhớ
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
