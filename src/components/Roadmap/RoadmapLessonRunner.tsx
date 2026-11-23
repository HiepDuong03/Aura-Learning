import React, { useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Volume2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ChevronLeft,
  Bookmark,
  Mic,
  MicOff,
  PenTool,
  RotateCcw,
  Sparkles,
  Trophy,
  Headphones,
  Maximize2,
  Minimize2,
  Plus,
  Play,
  Check
} from 'lucide-react';
import {
  ActivePracticeMission,
  CefrLevel,
  CurriculumVocabLesson,
  CurriculumWordItem,
  LessonCompletionRecord,
  WordDefinition
} from '../../types';
import { ModalPortal } from '../Common/ModalPortal';
import {
  buildLessonQuizQuestions,
  curriculumWordToWordDefinition,
  PASS_THRESHOLD_PERCENT
} from '../../utils/curriculumEngine';
import { speakWord } from '../../services/dictionaryService';
import { speechScoringService } from '../../services/speechScoringService';
import { YouGlishLiveWidget } from '../Shorts/YouGlishLiveWidget';

export type LessonRunnerMode = 'flashcards' | 'quiz' | 'dictation' | 'pronunciation';

interface RoadmapLessonRunnerProps {
  lesson: CurriculumVocabLesson;
  trackType?: 'ielts_topics' | 'cefr_vocab';
  unitTitle: string;
  unitTopic: string;
  unitCefr: CefrLevel;
  unitAllWords: CurriculumWordItem[];
  initialMode: LessonRunnerMode;
  existingRecord?: LessonCompletionRecord;
  onClose: () => void;
  onSaveProgress: (patch: Partial<LessonCompletionRecord>) => void;
  onSaveWordsToSrs: (words: Array<{ def: WordDefinition; contextSentence?: string; videoTitle?: string }>) => number;
  onLaunchMission: (mission: ActivePracticeMission) => void;
}

const CEFR_BAND_META: Record<CefrLevel, { label: string; cls: string }> = {
  A1: { label: 'A1', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  A2: { label: 'A2', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  B1: { label: 'B1 · Band 5.5', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  B2: { label: 'B2 · Band 6.5+', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  C1: { label: 'C1 · Band 7.5+', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  C2: { label: 'C2 · Band 8.5+', cls: 'bg-purple-50 text-purple-800 border-purple-200' }
};

export const RoadmapLessonRunner: React.FC<RoadmapLessonRunnerProps> = ({
  lesson,
  trackType = 'ielts_topics',
  unitTitle,
  unitTopic,
  unitCefr,
  unitAllWords,
  initialMode,
  existingRecord,
  onClose,
  onSaveProgress,
  onSaveWordsToSrs,
  onLaunchMission
}) => {
  const [mode, setMode] = useState<LessonRunnerMode>(initialMode);
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [frontSide, setFrontSide] = useState<'en' | 'vi'>('en');
  const [isExpanded, setIsExpanded] = useState(false);
  const [hardWordIds, setHardWordIds] = useState<Set<string>>(() => new Set());
  const [videoModalWord, setVideoModalWord] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Quiz state
  const quizQuestions = useMemo(
    () => buildLessonQuizQuestions(lesson.words, unitAllWords, lesson.lessonNumber * 37),
    [lesson.words, unitAllWords, lesson.lessonNumber]
  );
  const [qIndex, setQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Dictation state
  const [dictIndex, setDictIndex] = useState(0);
  const [dictInput, setDictInput] = useState('');
  const [dictChecked, setDictChecked] = useState<null | boolean>(null);
  const [dictScore, setDictScore] = useState(0);
  const [dictFinished, setDictFinished] = useState(false);

  // Pronunciation state
  const [pronIndex, setPronIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [pronResultScore, setPronResultScore] = useState<number | null>(null);
  const [pronCompletedCount, setPronCompletedCount] = useState(0);
  const [pronError, setPronError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const currentWord = lesson.words[cardIndex] || lesson.words[0];

  const handleSaveBatch = (items: CurriculumWordItem[], label: string) => {
    const payload = items.map((w) => ({
      def: curriculumWordToWordDefinition(w),
      contextSentence: w.exampleIeltsEn || w.exampleDailyEn,
      videoTitle: `Lộ trình: ${unitTitle} — ${lesson.title}`
    }));
    const added = onSaveWordsToSrs(payload);
    setSavedNotice(
      added > 0
        ? `Đã lưu ${added} từ mới (${label}) vào Kho ôn tập FSRS-6!`
        : `Toàn bộ ${items.length} từ đã có sẵn trong Kho FSRS-6 của bạn.`
    );
  };

  const buildMission = (targetMode: 'roleplay' | 'writing'): ActivePracticeMission => {
    const picked = lesson.words.slice(0, 5).map((w) => ({
      word: w.word,
      meaningVi: w.meaningVi,
      exampleEn: w.exampleIeltsEn || w.exampleDailyEn
    }));
    return {
      id: `mission-${lesson.id}-${Date.now()}`,
      mode: targetMode,
      sourceTitle: `${unitTitle} · ${lesson.title}`,
      topicName: unitTopic || unitTitle,
      cefr: currentWord?.cefr || unitCefr,
      targetWords: picked,
      createdAt: Date.now()
    };
  };

  const handleAdvanceFlashcard = (markHard: boolean) => {
    if (markHard && currentWord) {
      setHardWordIds((prev) => new Set(prev).add(currentWord.id));
    }
    if (cardIndex < lesson.words.length - 1) {
      setCardIndex((prev) => prev + 1);
      setIsFlipped(false);
    } else {
      onSaveProgress({ flashcardsDone: true });
      setMode('quiz');
      setQIndex(0);
      setSelectedOption(null);
      setCorrectCount(0);
      setQuizFinished(false);
    }
  };

  const handleSelectQuizOption = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    const q = quizQuestions[qIndex];
    if (idx === q.correctAnswer) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleNextQuizQuestion = () => {
    if (qIndex < quizQuestions.length - 1) {
      setQIndex((prev) => prev + 1);
      setSelectedOption(null);
    } else {
      const percent = Math.round((correctCount / Math.max(1, quizQuestions.length)) * 100);
      const passed = percent >= PASS_THRESHOLD_PERCENT;
      const earnedStars = percent === 100 ? 3 : percent >= 90 ? 2 : passed ? 1 : 0;
      const bestScore = Math.max(existingRecord?.quizBestScore || 0, percent);
      const bestStars = Math.max(existingRecord?.stars || 0, earnedStars);
      onSaveProgress({
        flashcardsDone: true,
        quizBestScore: bestScore,
        quizPassed: Boolean(existingRecord?.quizPassed || passed),
        stars: bestStars
      });
      if (passed) {
        confetti({ particleCount: 70, spread: 65, origin: { y: 0.65 } });
      }
      setQuizFinished(true);
    }
  };

  const handleCheckDictation = (e: React.FormEvent) => {
    e.preventDefault();
    const target = lesson.words[dictIndex];
    if (!target || dictChecked !== null) return;
    const isCorrect = dictInput.trim().toLowerCase() === target.word.trim().toLowerCase();
    setDictChecked(isCorrect);
    if (isCorrect) setDictScore((prev) => prev + 1);
  };

  const handleNextDictation = () => {
    if (dictIndex < lesson.words.length - 1) {
      setDictIndex((prev) => prev + 1);
      setDictInput('');
      setDictChecked(null);
    } else {
      onSaveProgress({ dictationDone: true });
      setDictFinished(true);
    }
  };

  const handleTogglePronunciationMic = () => {
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setPronError('Trình duyệt chưa hỗ trợ Web Speech API. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    setPronError(null);
    setSpokenTranscript('');
    setPronResultScore(null);
    const target = lesson.words[pronIndex];
    if (!target) return;

    try {
      const rec = new SpeechRecognitionCtor();
      rec.lang = 'en-US';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event: any) => {
        const transcript = String(event?.results?.[0]?.[0]?.transcript || '').trim();
        setSpokenTranscript(transcript);
        const scored = speechScoringService.scoreSpeech(transcript, target.exampleDailyEn || target.word, target.word);
        setPronResultScore(scored.accuracy);
        if (scored.accuracy >= 65) {
          setPronCompletedCount((prev) => {
            const next = prev + 1;
            if (next >= Math.min(3, lesson.words.length)) {
              onSaveProgress({ pronunciationDone: true });
            }
            return next;
          });
        }
        setIsListening(false);
      };
      rec.onerror = () => {
        setPronError('Không thu được giọng nói — kiểm tra micro và thử lại.');
        setIsListening(false);
      };
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
      rec.start();
      setIsListening(true);
    } catch {
      setPronError('Không thể bật micro. Vui lòng cấp quyền micro cho trình duyệt.');
      setIsListening(false);
    }
  };

  const quizPercent = Math.round((correctCount / Math.max(1, quizQuestions.length)) * 100);
  const quizPassedNow = quizPercent >= PASS_THRESHOLD_PERCENT;

  return (
    <ModalPortal onClose={videoModalWord ? undefined : onClose}>
      <div
        className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
      <div
        className={`w-full ${isExpanded && mode === 'flashcards' ? 'max-w-4xl' : 'max-w-2xl'} max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/70">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-teal-700 truncate">
              {unitTitle} · {lesson.title}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {(
                [
                  { id: 'flashcards', label: '1. Học thẻ' },
                  { id: 'quiz', label: '2. Bài tập' },
                  { id: 'dictation', label: 'Nghe viết' },
                  { id: 'pronunciation', label: 'Phát âm' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMode(tab.id);
                    setSavedNotice(null);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    mode === tab.id
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            aria-label="Đóng bài học"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {savedNotice && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{savedNotice}</span>
            </div>
          )}

          {/* MODE 1: FLASHCARDS */}
          {mode === 'flashcards' && currentWord && (
            <div className="space-y-4">
              {/* Progress + Front Side Toggle (Anh | Việt) */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-2">
                  <span>
                    Thẻ {cardIndex + 1} / {lesson.words.length}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[11px]">
                    {currentWord.cefr}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500">Mặt trước:</span>
                  <div className="inline-flex items-center p-0.5 rounded-full bg-slate-100 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setFrontSide('en');
                        setIsFlipped(false);
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                        frontSide === 'en'
                          ? 'bg-[#043e35] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Anh
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFrontSide('vi');
                        setIsFlipped(false);
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-black transition-all cursor-pointer ${
                        frontSide === 'vi'
                          ? 'bg-[#043e35] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Việt
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-[#043e35] transition-all duration-200"
                  style={{ width: `${((cardIndex + 1) / lesson.words.length) * 100}%` }}
                />
              </div>

              {/* Interactive Dark Forest Green Flashcard (ForumFlash Collocation Style) */}
              {(() => {
                const bandMeta = CEFR_BAND_META[currentWord.cefr] || CEFR_BAND_META.B2;
                const cardLabel =
                  currentWord.label ||
                  (trackType === 'ielts_topics' ? 'COLLOCATION · IELTS' : `CEFR · BẬC ${currentWord.cefr}`);
                const posPill = (currentWord.partOfSpeechVi || currentWord.pos).toUpperCase();
                const allExamples =
                  currentWord.examples && currentWord.examples.length > 0
                    ? currentWord.examples
                    : [currentWord.exampleIeltsEn, currentWord.exampleDailyEn].filter(
                        (s, i, arr) => Boolean(s) && arr.indexOf(s) === i
                      );

                return (
                  <div
                    onClick={() => setIsFlipped((prev) => !prev)}
                    className={`rounded-3xl cursor-pointer transition-all duration-200 select-none flex flex-col justify-between ${
                      isExpanded ? 'min-h-[380px] p-7 sm:p-10' : 'min-h-[290px] p-6 sm:p-8'
                    } ${
                      !isFlipped
                        ? 'bg-gradient-to-br from-[#043e35] via-[#05463c] to-[#022c26] text-white shadow-xl border border-teal-900/40'
                        : 'bg-white text-slate-900 shadow-lg border-2 border-[#043e35]/20'
                    }`}
                  >
                    {/* Card Top Metadata Row */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[11px] font-black uppercase tracking-[0.14em] ${
                          !isFlipped ? 'text-teal-200/90' : 'text-[#043e35]'
                        }`}
                      >
                        {cardLabel}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {currentWord.academicTag && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${
                              !isFlipped
                                ? 'bg-white/15 text-teal-100 border border-white/15'
                                : 'bg-violet-600 text-white'
                            }`}
                          >
                            {currentWord.academicTag === 'AWL' ? 'AWL 570' : 'NAWL'}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[10px] font-black uppercase ${
                            !isFlipped
                              ? 'bg-white/10 text-teal-100 border-white/15'
                              : bandMeta.cls
                          }`}
                        >
                          {bandMeta.label}
                        </span>
                      </div>
                    </div>

                    {/* Card Center Content */}
                    {!isFlipped ? (
                      <div className="my-auto py-8 text-center flex flex-col items-center justify-center gap-3">
                        {frontSide === 'en' ? (
                          <>
                            <h2
                              className={`${
                                isExpanded ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'
                              } font-black text-white tracking-tight leading-tight max-w-2xl`}
                            >
                              {currentWord.word}
                            </h2>
                            {currentWord.ipaUs && (
                              <p className="text-sm sm:text-base font-mono font-medium text-teal-100/85">
                                {currentWord.ipaUs}
                                {currentWord.ipaUk && currentWord.ipaUk !== currentWord.ipaUs
                                  ? ` · UK ${currentWord.ipaUk}`
                                  : ''}
                              </p>
                            )}
                            <span className="mt-1 px-4 py-1.5 rounded-full bg-white/10 border border-teal-300/25 text-teal-200 text-[11px] font-black tracking-wider uppercase">
                              {posPill}
                            </span>
                          </>
                        ) : (
                          <>
                            <h2
                              className={`${
                                isExpanded ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'
                              } font-black text-white tracking-tight leading-snug max-w-xl`}
                            >
                              {currentWord.meaningVi}
                            </h2>
                            <span className="mt-1 px-4 py-1.5 rounded-full bg-white/10 border border-teal-300/25 text-teal-200 text-[11px] font-black tracking-wider uppercase">
                              {posPill}
                            </span>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="my-4 space-y-3.5 animate-fade-in">
                        {/* Term + Vietnamese Meaning */}
                        <div className="p-4 rounded-2xl bg-[#043e35]/5 border border-[#043e35]/15">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="text-xl sm:text-2xl font-black text-[#043e35] tracking-tight">
                              {currentWord.word}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-[#043e35]/10 text-[#043e35] text-[10px] font-black uppercase tracking-wider">
                              {posPill}
                            </span>
                          </div>
                          {currentWord.ipaUs && (
                            <p className="text-xs font-mono font-bold text-teal-700 mt-0.5">
                              {currentWord.ipaUs}
                            </p>
                          )}
                          <p className="text-lg font-black text-slate-900 mt-2">
                            {currentWord.meaningVi}
                          </p>
                          {(currentWord.pattern || currentWord.definitionEn) && (
                            <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">
                              {currentWord.pattern || currentWord.definitionEn}
                            </p>
                          )}
                        </div>

                        {/* IELTS Context Sentences */}
                        {allExamples.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Ví dụ ngữ cảnh IELTS
                            </p>
                            {allExamples.map((ex, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-2.5"
                              >
                                <p className="text-xs sm:text-sm font-semibold text-slate-800 leading-relaxed">
                                  “{ex}”
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    speakWord(ex, 'en', 0.92);
                                  }}
                                  className="p-1.5 rounded-lg bg-white hover:bg-teal-50 text-teal-700 border border-slate-200 shrink-0 cursor-pointer"
                                  title="Nghe câu ví dụ"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Collocations & Synonyms */}
                        {(currentWord.collocations.length > 0 || currentWord.synonyms.length > 0) && (
                          <div className="space-y-2 pt-1">
                            {currentWord.collocations.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-[11px] font-bold text-slate-500">Kết hợp từ:</span>
                                {currentWord.collocations.map((col) => (
                                  <span
                                    key={col}
                                    className="px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[11px]"
                                  >
                                    {col}
                                  </span>
                                ))}
                              </div>
                            )}
                            {currentWord.synonyms.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 items-center">
                                <span className="text-[11px] font-bold text-slate-500">Paraphrase:</span>
                                {currentWord.synonyms.map((syn) => (
                                  <span
                                    key={syn}
                                    className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-[11px]"
                                  >
                                    {syn}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Card Bottom Flip Hint */}
                    <div className="text-center pt-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                          !isFlipped ? 'text-teal-200/75' : 'text-slate-400'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{!isFlipped ? 'Lật thẻ' : 'Nhấp để lật lại mặt trước'}</span>
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Center Action Pills: NGHE · ÔN TẬP · VIDEO · PHÓNG TO */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => speakWord(currentWord.word, 'en', 0.92)}
                  className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#043e35]" />
                  <span>Nghe</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBatch([currentWord], currentWord.word)}
                  className="px-4 py-2 rounded-full bg-white hover:bg-teal-50 border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#043e35]" />
                  <span>Ôn tập</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoModalWord(currentWord.word)}
                  className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Nghe người bản xứ dùng cụm từ này trong video thực tế"
                >
                  <Play className="w-3.5 h-3.5 text-[#043e35] fill-[#043e35]" />
                  <span>Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  {isExpanded ? (
                    <Minimize2 className="w-3.5 h-3.5 text-[#043e35]" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5 text-[#043e35]" />
                  )}
                  <span>{isExpanded ? 'Thu gọn' : 'Phóng to'}</span>
                </button>
              </div>

              {/* Bottom Review Bar: Trước | Cần ôn | Đã nhớ */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={cardIndex === 0}
                  onClick={() => {
                    setCardIndex((prev) => Math.max(0, prev - 1));
                    setIsFlipped(false);
                  }}
                  className="px-3 py-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-35 flex items-center justify-center cursor-pointer shrink-0"
                  title="Thẻ trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleSaveBatch([currentWord], currentWord.word);
                    handleAdvanceFlashcard(true);
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Cần ôn</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAdvanceFlashcard(false)}
                  className="flex-1 py-3 px-4 rounded-2xl bg-[#043e35] hover:bg-[#065246] text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{cardIndex === lesson.words.length - 1 ? 'Sang Bài tập' : 'Đã nhớ'}</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: LESSON QUIZ */}
          {mode === 'quiz' && !quizFinished && quizQuestions[qIndex] && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>
                  Câu {qIndex + 1} / {quizQuestions.length}
                </span>
                <span className="text-teal-700">Đúng: {correctCount}</span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-200"
                  style={{ width: `${((qIndex + 1) / quizQuestions.length) * 100}%` }}
                />
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <p className="text-sm font-black text-slate-900">{quizQuestions[qIndex].prompt}</p>
                {quizQuestions[qIndex].contextSentence && (
                  <p className="text-sm font-semibold text-indigo-900 bg-white p-3 rounded-xl border border-indigo-100 leading-relaxed">
                    “{quizQuestions[qIndex].contextSentence}”
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {quizQuestions[qIndex].options.map((opt, idx) => {
                  const isAnswered = selectedOption !== null;
                  const isCorrect = idx === quizQuestions[qIndex].correctAnswer;
                  const isSelected = idx === selectedOption;
                  let cls = 'bg-white border-slate-200 text-slate-800 hover:border-teal-400 hover:bg-teal-50/40';
                  if (isAnswered) {
                    if (isCorrect) cls = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-black';
                    else if (isSelected) cls = 'bg-rose-50 border-rose-400 text-rose-800';
                    else cls = 'bg-slate-50 border-slate-200 text-slate-400 opacity-70';
                  }
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectQuizOption(idx)}
                      className={`p-3.5 rounded-2xl border-2 text-left text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-between gap-2 ${cls}`}
                    >
                      <span>{opt}</span>
                      {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-slate-700 space-y-2 animate-fade-in">
                  <p className="font-semibold">{quizQuestions[qIndex].explanationVi}</p>
                  <button
                    type="button"
                    onClick={handleNextQuizQuestion}
                    className="w-full py-2.5 rounded-xl btn-3d btn-3d-teal text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{qIndex === quizQuestions.length - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* QUIZ FINISHED — CLOSED-LOOP 4-SKILL BRIDGE */}
          {mode === 'quiz' && quizFinished && (
            <div className="text-center space-y-5 py-3 animate-fade-in">
              <div className="inline-flex size-16 rounded-3xl bg-teal-50 border border-teal-200 items-center justify-center text-teal-600">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900">
                  {quizPassedNow ? 'Chúc mừng! Bạn đã qua bài!' : 'Cần đạt ≥ 80% để mở bài tiếp theo'}
                </h3>
                <p className="text-sm font-bold text-slate-600 mt-1">
                  Kết quả: <span className={quizPassedNow ? 'text-emerald-600' : 'text-amber-600'}>{correctCount}/{quizQuestions.length} ({quizPercent}%)</span>
                </p>
              </div>

              {/* Closed-Loop Actions: SRS + Speaking AI + Writing AI */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-left">
                <p className="text-xs font-black uppercase tracking-wider text-teal-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Khép kín 4 kỹ năng với bộ từ vừa học:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveBatch(lesson.words, `${lesson.words.length} từ bài này`)}
                    className="p-3 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Bookmark className="w-4 h-4 text-teal-600" />
                    <span>Lưu {lesson.words.length} từ vào FSRS-6</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLaunchMission(buildMission('roleplay'))}
                    className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Luyện Nói AI ngay</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onLaunchMission(buildMission('writing'))}
                    className="p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  >
                    <PenTool className="w-4 h-4" />
                    <span>Luyện Viết AI ngay</span>
                  </button>
                </div>
                {hardWordIds.size > 0 && (
                  <p className="text-[11px] text-amber-700 font-semibold">
                    * Bạn đã đánh dấu {hardWordIds.size} từ chưa nhớ trong phần Học thẻ — chúng đã được lưu ưu tiên vào FSRS-6.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setQIndex(0);
                    setSelectedOption(null);
                    setCorrectCount(0);
                    setQuizFinished(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Làm lại bài tập
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl btn-3d btn-3d-teal text-xs font-black cursor-pointer"
                >
                  Quay lại Lộ trình
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: DICTATION */}
          {mode === 'dictation' && (
            !dictFinished && lesson.words[dictIndex] ? (
              <form onSubmit={handleCheckDictation} className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Nghe viết: Từ {dictIndex + 1} / {lesson.words.length}</span>
                  <span className="text-teal-700">Đúng: {dictScore}</span>
                </div>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  <button
                    type="button"
                    onClick={() => speakWord(lesson.words[dictIndex].word, 'en', 0.9)}
                    className="mx-auto px-5 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-black flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Headphones className="w-5 h-5" />
                    <span>Nghe phát âm từ này</span>
                  </button>
                  <p className="text-xs font-bold text-slate-600">
                    Nghĩa: <span className="text-teal-700">{lesson.words[dictIndex].meaningVi}</span> ({lesson.words[dictIndex].pos})
                  </p>
                </div>

                <input
                  type="text"
                  value={dictInput}
                  onChange={(e) => setDictInput(e.target.value)}
                  disabled={dictChecked !== null}
                  placeholder="Gõ chính xác từ tiếng Anh bạn vừa nghe..."
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-teal-500 focus:outline-none text-sm font-bold text-slate-900"
                  autoFocus
                />

                {dictChecked === null ? (
                  <button
                    type="submit"
                    disabled={!dictInput.trim()}
                    className="w-full py-3 rounded-2xl btn-3d btn-3d-teal text-sm font-black disabled:opacity-50 cursor-pointer"
                  >
                    Kiểm tra chính tả
                  </button>
                ) : (
                  <div className={`p-3.5 rounded-2xl border text-xs font-bold space-y-2 ${dictChecked ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                    <p>
                      {dictChecked
                        ? `Chính xác! "${lesson.words[dictIndex].word}" ${lesson.words[dictIndex].ipaUs}`
                        : `Đáp án đúng: "${lesson.words[dictIndex].word}" ${lesson.words[dictIndex].ipaUs}`}
                    </p>
                    <button
                      type="button"
                      onClick={handleNextDictation}
                      className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black cursor-pointer"
                    >
                      {dictIndex === lesson.words.length - 1 ? 'Hoàn thành Nghe viết' : 'Từ tiếp theo →'}
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <div className="text-center py-6 space-y-4">
                <h3 className="text-xl font-black text-slate-900">Hoàn thành Luyện Nghe Viết!</h3>
                <p className="text-sm font-bold text-teal-700">Chính xác {dictScore} / {lesson.words.length} từ</p>
                <button
                  type="button"
                  onClick={() => setMode('pronunciation')}
                  className="px-5 py-2.5 rounded-xl btn-3d btn-3d-teal text-xs font-black cursor-pointer"
                >
                  Chuyển sang Luyện Phát âm →
                </button>
              </div>
            )
          )}

          {/* MODE 4: PRONUNCIATION */}
          {mode === 'pronunciation' && lesson.words[pronIndex] && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>Phát âm câu mẫu: {pronIndex + 1} / {lesson.words.length}</span>
                <span className="text-emerald-700">Đạt: {pronCompletedCount}</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-black text-slate-900">{lesson.words[pronIndex].word}</p>
                    <p className="text-xs font-mono font-bold text-teal-700">{lesson.words[pronIndex].ipaUs}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakWord(lesson.words[pronIndex].exampleDailyEn || lesson.words[pronIndex].word, 'en', 0.9)}
                    className="px-3 py-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" /> Nghe mẫu
                  </button>
                </div>
                <p className="text-sm font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-200/80">
                  “{lesson.words[pronIndex].exampleDailyEn}”
                </p>
              </div>

              <button
                type="button"
                onClick={handleTogglePronunciationMic}
                className={`w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'btn-3d btn-3d-teal'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                <span>{isListening ? 'Đang nghe bạn đọc... (Bấm dừng)' : 'Bấm Micro và đọc to câu mẫu'}</span>
              </button>

              {pronError && <p className="text-xs font-bold text-rose-600">{pronError}</p>}

              {pronResultScore !== null && (
                <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-1.5">
                  <p className="text-xs text-slate-600">
                    Giọng của bạn: <strong className="text-slate-900">“{spokenTranscript}”</strong>
                  </p>
                  <p className={`text-lg font-black ${pronResultScore >= 75 ? 'text-emerald-700' : 'text-amber-600'}`}>
                    Độ chính xác: {pronResultScore}%
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={pronIndex === 0}
                  onClick={() => {
                    setPronIndex((prev) => Math.max(0, prev - 1));
                    setPronResultScore(null);
                    setSpokenTranscript('');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 disabled:opacity-40 cursor-pointer"
                >
                  ← Câu trước
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pronIndex < lesson.words.length - 1) {
                      setPronIndex((prev) => prev + 1);
                      setPronResultScore(null);
                      setSpokenTranscript('');
                    } else {
                      onSaveProgress({ pronunciationDone: true });
                      onLaunchMission(buildMission('roleplay'));
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black cursor-pointer"
                >
                  {pronIndex === lesson.words.length - 1 ? 'Sang Luyện Nói AI →' : 'Câu tiếp theo →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {videoModalWord && (
        <YouGlishLiveWidget
          initialWord={videoModalWord}
          accent="US"
          asModal
          onClose={() => setVideoModalWord(null)}
        />
      )}
      </div>
    </ModalPortal>
  );
};
