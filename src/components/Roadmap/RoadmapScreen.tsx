import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  GraduationCap,
  Headphones,
  Loader2,
  Lock,
  Mic,
  PenTool,
  Search,
  Sparkles,
  Star
} from 'lucide-react';
import {
  ActivePracticeMission,
  CefrLevel,
  CurriculumGrammarLesson,
  CurriculumGrammarUnitData,
  CurriculumManifest,
  CurriculumProgressState,
  CurriculumTrackType,
  CurriculumUnitMeta,
  CurriculumVocabLesson,
  CurriculumVocabUnitData,
  LessonCompletionRecord,
  WordDefinition
} from '../../types';
import { curriculumService } from '../../services/curriculumService';
import {
  buildGrammarPlacementQuestions,
  buildPlacementTestQuestions,
  computeUnitStats,
  curriculumWordToWordDefinition,
  CurriculumQuizQuestion,
  isLessonUnlocked,
  isUnitUnlocked
} from '../../utils/curriculumEngine';
import { LessonRunnerMode, RoadmapLessonRunner } from './RoadmapLessonRunner';
import { GrammarLessonModal } from './GrammarLessonModal';
import { PlacementTestModal } from './PlacementTestModal';

interface RoadmapScreenProps {
  progress: CurriculumProgressState;
  searchQuery?: string;
  onUpdateProgress: (updater: (prev: CurriculumProgressState) => CurriculumProgressState) => void;
  onSaveWordsToSrs: (words: Array<{ def: WordDefinition; contextSentence?: string; videoTitle?: string }>) => number;
  onLaunchMission: (mission: ActivePracticeMission) => void;
}

const LESSONS_PER_PAGE = 15;

export const RoadmapScreen: React.FC<RoadmapScreenProps> = ({
  progress,
  searchQuery = '',
  onUpdateProgress,
  onSaveWordsToSrs,
  onLaunchMission
}) => {
  const [manifest, setManifest] = useState<CurriculumManifest | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [track, setTrack] = useState<CurriculumTrackType>('ielts_topics');
  const [selectedUnitSlug, setSelectedUnitSlug] = useState<string>('education');

  const [vocabUnitData, setVocabUnitData] = useState<CurriculumVocabUnitData | null>(null);
  const [grammarUnitData, setGrammarUnitData] = useState<CurriculumGrammarUnitData | null>(null);
  const [isLoadingUnit, setIsLoadingUnit] = useState<boolean>(false);

  // Active modals
  const [activeVocabRunner, setActiveVocabRunner] = useState<{
    lesson: CurriculumVocabLesson;
    mode: LessonRunnerMode;
  } | null>(null);
  const [activeGrammarLesson, setActiveGrammarLesson] = useState<CurriculumGrammarLesson | null>(null);
  const [placementModal, setPlacementModal] = useState<{
    unitId: string;
    unitTitle: string;
    questions: CurriculumQuizQuestion[];
  } | null>(null);
  const [bannerToast, setBannerToast] = useState<string | null>(null);
  const [lessonFilterQuery, setLessonFilterQuery] = useState<string>('');
  const [lessonPage, setLessonPage] = useState<number>(1);

  // Load manifest once
  useEffect(() => {
    let active = true;
    curriculumService
      .getManifest()
      .then((m) => {
        if (!active) return;
        setManifest(m);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err?.message || 'Không thể tải dữ liệu Lộ trình.');
      });
    return () => {
      active = false;
    };
  }, []);

  const currentUnits: CurriculumUnitMeta[] = useMemo(() => {
    if (!manifest) return [];
    const raw =
      track === 'ielts_topics'
        ? manifest.ieltsTopics
        : track === 'cefr_vocab'
          ? manifest.cefrVocab
          : manifest.grammar;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return raw;
    const filtered = raw.filter(
      (u) =>
        u.titleEn.toLowerCase().includes(q) ||
        u.titleVi.toLowerCase().includes(q) ||
        u.descVi.toLowerCase().includes(q) ||
        (u.cefr || '').toLowerCase().includes(q)
    );
    return filtered.length > 0 ? filtered : raw;
  }, [manifest, track, searchQuery]);

  // Reset selected unit slug when switching track
  useEffect(() => {
    if (currentUnits.length === 0) return;
    const exists = currentUnits.some((u) => u.slug === selectedUnitSlug);
    if (!exists) {
      setSelectedUnitSlug(currentUnits[0].slug);
    }
  }, [currentUnits, selectedUnitSlug]);

  const activeUnitMeta = useMemo(
    () => currentUnits.find((u) => u.slug === selectedUnitSlug) || currentUnits[0] || null,
    [currentUnits, selectedUnitSlug]
  );

  const progressLessonsRef = useRef(progress.lessons);
  progressLessonsRef.current = progress.lessons;

  // Reset pagination & search whenever the selected unit changes; jump to first incomplete lesson
  useEffect(() => {
    setLessonFilterQuery('');
    if (!vocabUnitData) {
      setLessonPage(1);
      return;
    }
    const firstIncompleteIdx = vocabUnitData.lessons.findIndex(
      (l) => !progressLessonsRef.current[l.id]?.quizPassed
    );
    const targetIdx = firstIncompleteIdx >= 0 ? firstIncompleteIdx : 0;
    setLessonPage(Math.floor(targetIdx / LESSONS_PER_PAGE) + 1);
  }, [vocabUnitData]);

  const firstIncompleteVocabLesson = useMemo(() => {
    if (!vocabUnitData || vocabUnitData.lessons.length === 0) return null;
    const idx = vocabUnitData.lessons.findIndex((l) => !progress.lessons[l.id]?.quizPassed);
    if (idx < 0) return null;
    return {
      idx,
      lesson: vocabUnitData.lessons[idx],
      page: Math.floor(idx / LESSONS_PER_PAGE) + 1
    };
  }, [vocabUnitData, progress.lessons]);

  const filteredVocabLessons = useMemo(() => {
    if (!vocabUnitData) return [];
    const q = lessonFilterQuery.trim().toLowerCase();
    const mapped = vocabUnitData.lessons.map((lesson, originalIdx) => ({ lesson, originalIdx }));
    if (!q) return mapped;
    return mapped.filter(
      ({ lesson }) =>
        lesson.title.toLowerCase().includes(q) ||
        String(lesson.lessonNumber) === q ||
        lesson.words.some(
          (w) => w.word.toLowerCase().includes(q) || w.meaningVi.toLowerCase().includes(q)
        )
    );
  }, [vocabUnitData, lessonFilterQuery]);

  const totalVocabPages = Math.max(1, Math.ceil(filteredVocabLessons.length / LESSONS_PER_PAGE));
  const safeLessonPage = Math.min(lessonPage, totalVocabPages);
  const paginatedVocabLessons = useMemo(() => {
    const start = (safeLessonPage - 1) * LESSONS_PER_PAGE;
    return filteredVocabLessons.slice(start, start + LESSONS_PER_PAGE);
  }, [filteredVocabLessons, safeLessonPage]);

  // Lazy load active unit JSON
  useEffect(() => {
    if (!activeUnitMeta) return;
    let active = true;
    setIsLoadingUnit(true);
    setBannerToast(null);

    if (track === 'grammar') {
      curriculumService
        .getGrammarUnit(activeUnitMeta.dataPath)
        .then((data) => {
          if (!active) return;
          setGrammarUnitData(data);
          setVocabUnitData(null);
        })
        .catch(() => {
          if (!active) return;
          setGrammarUnitData(null);
        })
        .finally(() => {
          if (active) setIsLoadingUnit(false);
        });
    } else {
      curriculumService
        .getVocabUnit(activeUnitMeta.dataPath)
        .then((data) => {
          if (!active) return;
          setVocabUnitData(data);
          setGrammarUnitData(null);
        })
        .catch(() => {
          if (!active) return;
          setVocabUnitData(null);
        })
        .finally(() => {
          if (active) setIsLoadingUnit(false);
        });
    }

    return () => {
      active = false;
    };
  }, [activeUnitMeta, track]);

  const updateLessonProgress = (lessonId: string, patch: Partial<LessonCompletionRecord>) => {
    onUpdateProgress((prev) => {
      const existing = prev.lessons[lessonId] || { stars: 0, updatedAt: Date.now() };
      return {
        ...prev,
        lessons: {
          ...prev.lessons,
          [lessonId]: {
            ...existing,
            ...patch,
            stars: Math.max(existing.stars || 0, patch.stars ?? existing.stars ?? 0),
            updatedAt: Date.now()
          }
        }
      };
    });
  };

  const handleOpenPlacementTest = () => {
    if (track === 'grammar' && grammarUnitData) {
      const qs = buildGrammarPlacementQuestions(grammarUnitData.lessons, 20, Date.now() % 997);
      setPlacementModal({
        unitId: grammarUnitData.id,
        unitTitle: grammarUnitData.titleVi,
        questions: qs
      });
    } else if (vocabUnitData) {
      const qs = buildPlacementTestQuestions(vocabUnitData.lessons, 15, 5, Date.now() % 997);
      setPlacementModal({
        unitId: vocabUnitData.id,
        unitTitle: `${vocabUnitData.titleEn} (${vocabUnitData.titleVi})`,
        questions: qs
      });
    }
  };

  const activeLessonIds = useMemo(() => {
    if (track === 'grammar' && grammarUnitData) {
      return grammarUnitData.lessons.map((l) => l.id);
    }
    if (vocabUnitData) {
      return vocabUnitData.lessons.map((l) => l.id);
    }
    return [];
  }, [track, grammarUnitData, vocabUnitData]);

  const activeStats = useMemo(
    () => computeUnitStats(activeLessonIds, progress),
    [activeLessonIds, progress]
  );

  const unitAllWords = useMemo(
    () => (vocabUnitData ? vocabUnitData.lessons.flatMap((l) => l.words) : []),
    [vocabUnitData]
  );

  if (loadError) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-rose-200 text-center space-y-3">
        <p className="text-sm font-bold text-rose-700">{loadError}</p>
      </div>
    );
  }

  if (!manifest) {
    return (
      <div className="min-h-[420px] flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-sm font-bold">Đang nạp Lộ trình IELTS & CEFR...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header + 3 Track Switcher Pills (ForumFlash style) */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-[11px] font-black text-teal-800 uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-teal-600" />
            <span>Lộ trình khép kín 4 kỹ năng · {manifest.stats.totalIeltsWords + manifest.stats.totalCefrWords} từ & {manifest.stats.totalGrammarLessons} ngữ pháp</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {activeUnitMeta ? (track === 'ielts_topics' ? activeUnitMeta.titleEn : activeUnitMeta.titleVi) : 'Lộ trình học chuẩn hóa'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {activeUnitMeta?.descVi}
          </p>
        </div>

        {/* 3 Track Tabs (Single-line scrollable pill bar on narrow screens) */}
        <div className="inline-flex max-w-full overflow-x-auto no-scrollbar p-1.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs self-start lg:self-auto shrink-0">
          {(
            [
              { id: 'grammar', label: 'Ngữ pháp' },
              { id: 'ielts_topics', label: 'Từ vựng IELTS' },
              { id: 'cefr_vocab', label: 'Từ vựng CEFR' }
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTrack(item.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                track === item.id
                  ? 'bg-teal-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Compact Horizontal Unit/Topic Picker (keeps Placement Test & Bài 01 above the fold on mobile!) */}
      <div className="lg:hidden space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-teal-800">
            {track === 'ielts_topics' ? `Chọn chủ đề IELTS (${currentUnits.length})` : `Chọn chặng CEFR (${currentUnits.length})`}
          </span>
          <span className="text-[10px] font-bold text-slate-400">Vuốt ngang →</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {currentUnits.map((unit, idx) => {
            const isSelected = activeUnitMeta?.slug === unit.slug;
            const unitUnlocked = isUnitUnlocked(unit.id, idx, track, progress);
            const badgeText = unit.cefr || String(unit.order).padStart(2, '0');
            return (
              <button
                key={`mob-${unit.id}`}
                type="button"
                onClick={() => setSelectedUnitSlug(unit.slug)}
                className={`px-3 py-2 rounded-2xl border text-xs font-black whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-900 text-white border-teal-900 shadow-sm'
                    : unitUnlocked
                      ? 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                      : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {badgeText}
                </span>
                <span>{track === 'ielts_topics' ? unit.titleEn : unit.titleVi}</span>
                {!unitUnlocked && !progress.unlockedUnits[unit.id] && <Lock className="w-3 h-3 opacity-70" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (Desktop Only): Unit / Topic Picker */}
        <div className="hidden lg:block lg:col-span-4 rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden sticky top-20">
          <div className="p-4 bg-teal-900 text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-300">
              {track === 'ielts_topics'
                ? 'Thư viện IELTS'
                : track === 'cefr_vocab'
                  ? 'Từ vựng chuẩn CEFR'
                  : 'Lộ trình Ngữ pháp CEFR'}
            </p>
            <h2 className="text-lg font-black mt-0.5">
              {track === 'ielts_topics' ? 'Chọn chủ đề' : 'Chọn chặng học'}
            </h2>
            <p className="text-[11px] text-teal-200 mt-0.5">
              {track === 'ielts_topics'
                ? `${manifest.stats.totalIeltsTopics} chủ đề · ${manifest.stats.totalIeltsWords.toLocaleString()} từ B2–C2 (AWL 570)`
                : track === 'cefr_vocab'
                  ? `6 bậc A1 → C2 · ${manifest.stats.totalCefrWords.toLocaleString()} mục từ`
                  : `6 bậc A1 → C2 · ${manifest.stats.totalGrammarLessons} chủ điểm`}
            </p>
          </div>

          <div className="p-2.5 max-h-[calc(100vh-220px)] overflow-y-auto space-y-1.5">
            {currentUnits.map((unit, idx) => {
              const isSelected = activeUnitMeta?.slug === unit.slug;
              const unitUnlocked = isUnitUnlocked(unit.id, idx, track, progress);
              const badgeText = unit.cefr || String(unit.order).padStart(2, '0');
              // Count completed lessons for this unit from progress keys
              const completedInUnit = Object.entries(progress.lessons).filter(
                ([key, rec]) =>
                  rec.quizPassed &&
                  (key.startsWith(`${unit.id}-`) ||
                    (track === 'grammar' && unit.cefr && key.startsWith(`gr-${unit.cefr.toLowerCase()}-`)))
              ).length;
              const pct = unit.totalLessons > 0 ? Math.min(100, Math.round((completedInUnit / unit.totalLessons) * 100)) : 0;

              return (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setSelectedUnitSlug(unit.slug)}
                  className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                    isSelected
                      ? 'bg-teal-50/90 border-teal-400 shadow-xs'
                      : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <div
                    className={`size-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      isSelected
                        ? 'bg-teal-500 text-white shadow-xs'
                        : unitUnlocked
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {badgeText}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1.5">
                      <p className={`text-xs font-black leading-snug line-clamp-2 ${isSelected ? 'text-teal-950' : 'text-slate-800'}`}>
                        {track === 'ielts_topics' ? unit.titleEn : unit.titleVi}
                      </p>
                      {!unitUnlocked && !progress.unlockedUnits[unit.id] && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 shrink-0 mt-0.5">
                          Khóa
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {completedInUnit}/{unit.totalLessons} bài · {pct}%
                    </p>
                    <div className="w-full h-1 rounded-full bg-slate-100 mt-1.5 overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Unit Header, Placement Test Banner & Lessons */}
        <div className="lg:col-span-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-5">
          {isLoadingUnit ? (
            <div className="min-h-[380px] flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
              <p className="text-xs font-bold">Đang tải danh sách bài học...</p>
            </div>
          ) : (
            <>
              {bannerToast && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{bannerToast}</span>
                </div>
              )}

              {/* Unit Progress Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4">
                    <div>
                      <span className="text-lg font-black text-slate-900">
                        {activeStats.completedLessons}/{activeStats.totalLessons}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 ml-1">bài học</span>
                    </div>
                    <div className="h-5 w-px bg-slate-200" />
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-black text-slate-900">
                        {activeStats.earnedStars}/{activeStats.maxStars}
                      </span>
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    </div>
                  </div>
                </div>

                {vocabUnitData && (
                  <button
                    type="button"
                    onClick={() => {
                      const firstLessonWords = vocabUnitData.lessons[0]?.words || [];
                      const added = onSaveWordsToSrs(
                        firstLessonWords.map((w) => ({
                          def: curriculumWordToWordDefinition(w),
                          contextSentence: w.exampleIeltsEn || w.exampleDailyEn,
                          videoTitle: `Lộ trình: ${vocabUnitData.titleEn}`
                        }))
                      );
                      setBannerToast(
                        added > 0
                          ? `Đã nạp ${added} từ cốt lõi Bài 01 vào Kho ôn FSRS-6!`
                          : 'Bộ từ Bài 01 đã có sẵn trong Kho FSRS-6 của bạn.'
                      );
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Lưu nhanh Bài 01 vào FSRS-6</span>
                  </button>
                )}
              </div>

              {/* Placement / Skip Test Banner (ForumFlash signature CTA) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black">
                    {track === 'grammar'
                      ? `Kiểm tra kiến thức ${grammarUnitData?.cefr || ''}`
                      : 'Thi vượt cấp chủ đề'}
                  </h3>
                  <p className="text-xs text-teal-100/90 leading-relaxed">
                    {track === 'grammar'
                      ? '20 câu trắc nghiệm tổng hợp. Đạt từ 80% trở lên để mở khóa toàn bộ chủ điểm trong chặng này.'
                      : '20 câu theo mức khó: 15 câu trắc nghiệm/Cloze và 5 câu nghe viết. Đạt ≥ 80% mở khóa mọi bài.'}
                  </p>
                  {activeUnitMeta && progress.placementScores[activeUnitMeta.id] !== undefined && (
                    <p className="text-[11px] font-bold text-amber-300">
                      Điểm cao nhất: {progress.placementScores[activeUnitMeta.id]}%
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleOpenPlacementTest}
                  className="px-5 py-2.5 rounded-full bg-white hover:bg-teal-50 text-teal-950 text-xs font-black flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all shadow-sm"
                >
                  <span>Làm bài thi</span>
                  <ArrowRight className="w-4 h-4 text-rose-500" />
                </button>
              </div>

              {/* LESSON LIST: VOCABULARY (IELTS TOPICS OR CEFR) */}
              {vocabUnitData && (
                <div className="space-y-3">
                  {vocabUnitData.lessons.length > LESSONS_PER_PAGE && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={lessonFilterQuery}
                          onChange={(e) => {
                            setLessonFilterQuery(e.target.value);
                            setLessonPage(1);
                          }}
                          placeholder="Tìm số bài hoặc từ vựng (vd: 12, analogy)..."
                          className="w-full h-9 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                        {firstIncompleteVocabLesson && !lessonFilterQuery && (
                          <button
                            type="button"
                            onClick={() => setLessonPage(firstIncompleteVocabLesson.page)}
                            className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-black cursor-pointer transition-colors"
                          >
                            Tiếp tục {firstIncompleteVocabLesson.lesson.title}
                          </button>
                        )}
                        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2 py-1">
                          <button
                            type="button"
                            disabled={safeLessonPage <= 1}
                            onClick={() => setLessonPage((p) => Math.max(1, p - 1))}
                            className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            aria-label="Trang trước"
                          >
                            <ChevronLeft className="w-4 h-4 text-slate-700" />
                          </button>
                          <span className="text-[11px] font-black text-slate-700 px-1 whitespace-nowrap">
                            Trang {safeLessonPage}/{totalVocabPages}
                          </span>
                          <button
                            type="button"
                            disabled={safeLessonPage >= totalVocabPages}
                            onClick={() => setLessonPage((p) => Math.min(totalVocabPages, p + 1))}
                            className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            aria-label="Trang sau"
                          >
                            <ChevronRight className="w-4 h-4 text-slate-700" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {paginatedVocabLessons.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs font-semibold text-slate-500">
                      Không tìm thấy bài học hoặc từ vựng nào khớp với &ldquo;{lessonFilterQuery}&rdquo;.
                    </div>
                  ) : (
                    paginatedVocabLessons.map(({ lesson, originalIdx: idx }) => {
                    const unlocked = isLessonUnlocked(vocabUnitData.id, idx, activeLessonIds, progress);
                    const rec = progress.lessons[lesson.id];
                    const passed = Boolean(rec?.quizPassed);
                    const flashcardsDone = Boolean(rec?.flashcardsDone);

                    return (
                      <div
                        key={lesson.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          unlocked
                            ? passed
                              ? 'bg-emerald-50/30 border-emerald-200'
                              : 'bg-white border-teal-300/80 shadow-xs'
                            : 'bg-slate-50/70 border-slate-200/80 opacity-80'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
                            <h4 className="text-base font-black text-slate-900 whitespace-nowrap shrink-0">{lesson.title}</h4>
                            {(() => {
                              const levels = Array.from(new Set(lesson.words.map((w) => w.cefr)));
                              const bandText = levels.length > 1 ? `${levels[0]}–${levels[levels.length - 1]}` : levels[0] || 'B2';
                              return (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-black whitespace-nowrap shrink-0">
                                  {bandText}
                                </span>
                              );
                            })()}
                            <span className="text-xs font-semibold text-slate-500 truncate">
                              {lesson.wordCount} mục từ · {lesson.words.slice(0, 3).map((w) => w.word).join(', ')}...
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                                passed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : unlocked
                                    ? 'bg-teal-900 text-white'
                                    : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {passed ? 'Hoàn thành' : unlocked ? 'Đang học' : 'Chưa mở'}
                            </span>
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-0.5">
                              {rec?.stars || 0}/3 <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3.5 items-center">
                          {/* Left: Core Path (1. Học thẻ -> 2. Bài tập) */}
                          <div className="md:col-span-5 space-y-2">
                            <p className="text-[11px] font-bold text-slate-500">Để qua bài</p>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                disabled={!unlocked}
                                onClick={() => setActiveVocabRunner({ lesson, mode: 'flashcards' })}
                                className={`flex flex-col items-center gap-1 group ${unlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                              >
                                <div
                                  className={`size-12 rounded-full border-2 flex items-center justify-center font-black text-sm transition-all ${
                                    flashcardsDone
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : unlocked
                                        ? 'bg-white border-teal-600 text-teal-800 group-hover:bg-teal-50'
                                        : 'bg-slate-100 border-slate-300 text-slate-400'
                                  }`}
                                >
                                  {unlocked ? (flashcardsDone ? <CheckCircle2 className="w-5 h-5" /> : '1') : <Lock className="w-4 h-4" />}
                                </div>
                                <span className="text-[11px] font-bold text-slate-700">Học thẻ</span>
                              </button>

                              <ArrowRight className="w-4 h-4 text-slate-300 -mt-4" />

                              <button
                                type="button"
                                disabled={!unlocked}
                                onClick={() => setActiveVocabRunner({ lesson, mode: 'quiz' })}
                                className={`flex flex-col items-center gap-1 group ${unlocked ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                              >
                                <div
                                  className={`size-12 rounded-full border-2 flex items-center justify-center font-black text-sm transition-all ${
                                    passed
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : unlocked
                                        ? 'bg-white border-indigo-500 text-indigo-700 group-hover:bg-indigo-50'
                                        : 'bg-slate-100 border-slate-300 text-slate-400'
                                  }`}
                                >
                                  {unlocked ? (passed ? <CheckCircle2 className="w-5 h-5" /> : '2') : <Lock className="w-4 h-4" />}
                                </div>
                                <span className="text-[11px] font-bold text-slate-700">Bài tập</span>
                              </button>
                            </div>
                          </div>

                          {/* Right: Optional 4-Skill Practice (Nghe viết + Phát âm + Nói/Viết AI) */}
                          <div className="md:col-span-7 space-y-2">
                            <p className="text-[11px] font-bold text-slate-500">Luyện thêm 4 kỹ năng</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                disabled={!unlocked}
                                onClick={() => setActiveVocabRunner({ lesson, mode: 'dictation' })}
                                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200/80 text-xs font-bold text-slate-700 flex items-center justify-between disabled:opacity-50 cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5">
                                  <Headphones className="w-3.5 h-3.5 text-sky-600" /> Nghe viết
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {rec?.dictationDone ? '✓ Xong' : unlocked ? 'Mở' : 'Khóa'}
                                </span>
                              </button>

                              <button
                                type="button"
                                disabled={!unlocked}
                                onClick={() => setActiveVocabRunner({ lesson, mode: 'pronunciation' })}
                                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200/80 text-xs font-bold text-slate-700 flex items-center justify-between disabled:opacity-50 cursor-pointer"
                              >
                                <span className="flex items-center gap-1.5">
                                  <Mic className="w-3.5 h-3.5 text-emerald-600" /> Phát âm
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {rec?.pronunciationDone ? '✓ Xong' : unlocked ? 'Mở' : 'Khóa'}
                                </span>
                              </button>

                              <button
                                type="button"
                                disabled={!unlocked}
                                onClick={() =>
                                  onLaunchMission({
                                    id: `speak-${lesson.id}-${Date.now()}`,
                                    mode: 'roleplay',
                                    sourceTitle: `${vocabUnitData.titleEn} · ${lesson.title}`,
                                    topicName: vocabUnitData.titleEn,
                                    cefr: (vocabUnitData.cefr || lesson.words[0]?.cefr || 'B1') as CefrLevel,
                                    targetWords: lesson.words.slice(0, 5).map((w) => ({
                                      word: w.word,
                                      meaningVi: w.meaningVi,
                                      exampleEn: w.exampleIeltsEn || w.exampleDailyEn,
                                      pos: w.pos,
                                      pattern: w.pattern,
                                      collocations: w.collocations
                                    })),
                                    createdAt: Date.now()
                                  })
                                }
                                className="px-3 py-2 rounded-xl bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-900 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                              >
                                <Mic className="w-3.5 h-3.5" /> Nói AI
                              </button>

                              <button
                                type="button"
                                disabled={!unlocked}
                                onClick={() =>
                                  onLaunchMission({
                                    id: `write-${lesson.id}-${Date.now()}`,
                                    mode: 'writing',
                                    sourceTitle: `${vocabUnitData.titleEn} · ${lesson.title}`,
                                    topicName: vocabUnitData.titleEn,
                                    cefr: (vocabUnitData.cefr || lesson.words[0]?.cefr || 'B1') as CefrLevel,
                                    targetWords: lesson.words.slice(0, 5).map((w) => ({
                                      word: w.word,
                                      meaningVi: w.meaningVi,
                                      exampleEn: w.exampleIeltsEn || w.exampleDailyEn,
                                      pos: w.pos,
                                      pattern: w.pattern,
                                      collocations: w.collocations
                                    })),
                                    createdAt: Date.now()
                                  })
                                }
                                className="px-3 py-2 rounded-xl bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold text-indigo-900 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                              >
                                <PenTool className="w-3.5 h-3.5" /> Viết AI
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                  )}

                  {totalVocabPages > 1 && (
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={safeLessonPage <= 1}
                        onClick={() => setLessonPage((p) => Math.max(1, p - 1))}
                        className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" /> Trang trước
                      </button>
                      <span className="text-xs font-black text-slate-600 px-2">
                        Trang {safeLessonPage} / {totalVocabPages} ({filteredVocabLessons.length} bài)
                      </span>
                      <button
                        type="button"
                        disabled={safeLessonPage >= totalVocabPages}
                        onClick={() => setLessonPage((p) => Math.min(totalVocabPages, p + 1))}
                        className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                      >
                        Trang sau <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* LESSON LIST: GRAMMAR */}
              {grammarUnitData && (
                <div className="space-y-3">
                  {grammarUnitData.lessons.map((lesson, idx) => {
                    const unlocked = isLessonUnlocked(grammarUnitData.id, idx, activeLessonIds, progress);
                    const rec = progress.lessons[lesson.id];
                    const passed = Boolean(rec?.quizPassed);

                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => setActiveGrammarLesson(lesson)}
                        className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                          unlocked
                            ? passed
                              ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400 cursor-pointer'
                              : 'bg-white border-slate-200 hover:border-teal-400 hover:bg-teal-50/20 cursor-pointer'
                            : 'bg-slate-50 border-slate-200 opacity-65 cursor-not-allowed'
                        }`}
                      >
                        <div
                          className={`size-12 rounded-full border-2 flex items-center justify-center font-black text-sm shrink-0 ${
                            passed
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : unlocked
                                ? 'bg-teal-50 border-teal-500 text-teal-800'
                                : 'bg-slate-100 border-slate-300 text-slate-400'
                          }`}
                        >
                          {unlocked ? (passed ? <CheckCircle2 className="w-5 h-5" /> : String(lesson.lessonNumber).padStart(2, '0')) : <Lock className="w-4 h-4" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">
                            {lesson.category}
                          </span>
                          <h4 className="text-sm sm:text-base font-black text-slate-900 truncate">
                            {lesson.title}
                          </h4>
                          <p className="text-xs text-slate-500 truncate">{lesson.titleVi}</p>
                        </div>

                        <div className="hidden sm:flex items-center gap-2 shrink-0">
                          {unlocked ? (
                            <span className="text-xs font-bold text-teal-700 flex items-center gap-1 whitespace-nowrap">
                              <BookOpen className="w-3.5 h-3.5" />
                              {passed ? 'Xem lại' : 'Học bài →'}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 whitespace-nowrap">
                              <Lock className="w-3.5 h-3.5" />
                              Chưa mở
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Open Dataset Attribution */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" /> Dữ liệu học thuật chuẩn hóa từ nguồn mở MIT / CC BY 4.0
                </span>
                <div className="flex flex-wrap gap-3">
                  {manifest.attributions.map((attr) => (
                    <a
                      key={attr.name}
                      href={attr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-teal-600 underline"
                    >
                      {attr.name}
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {activeVocabRunner && vocabUnitData && (
        <RoadmapLessonRunner
          lesson={activeVocabRunner.lesson}
          trackType={vocabUnitData.trackType}
          unitTitle={track === 'ielts_topics' ? vocabUnitData.titleEn : vocabUnitData.titleVi}
          unitTopic={vocabUnitData.titleEn}
          unitCefr={(vocabUnitData.cefr || activeVocabRunner.lesson.words[0]?.cefr || 'B1') as CefrLevel}
          unitAllWords={unitAllWords}
          initialMode={activeVocabRunner.mode}
          existingRecord={progress.lessons[activeVocabRunner.lesson.id]}
          onClose={() => setActiveVocabRunner(null)}
          onSaveProgress={(patch) => updateLessonProgress(activeVocabRunner.lesson.id, patch)}
          onSaveWordsToSrs={onSaveWordsToSrs}
          onLaunchMission={(mission) => {
            setActiveVocabRunner(null);
            onLaunchMission(mission);
          }}
        />
      )}

      {activeGrammarLesson && (
        <GrammarLessonModal
          lesson={activeGrammarLesson}
          existingRecord={progress.lessons[activeGrammarLesson.id]}
          onClose={() => setActiveGrammarLesson(null)}
          onSaveProgress={(patch) => updateLessonProgress(activeGrammarLesson.id, patch)}
          onLaunchWritingMission={(mission) => {
            setActiveGrammarLesson(null);
            onLaunchMission(mission);
          }}
        />
      )}

      {placementModal && (
        <PlacementTestModal
          unitTitle={placementModal.unitTitle}
          questions={placementModal.questions}
          onClose={() => setPlacementModal(null)}
          onComplete={(scorePercent, passed) => {
            onUpdateProgress((prev) => ({
              ...prev,
              unlockedUnits: passed
                ? { ...prev.unlockedUnits, [placementModal.unitId]: true }
                : prev.unlockedUnits,
              placementScores: {
                ...prev.placementScores,
                [placementModal.unitId]: Math.max(prev.placementScores[placementModal.unitId] || 0, scorePercent)
              }
            }));
          }}
        />
      )}
    </div>
  );
};
