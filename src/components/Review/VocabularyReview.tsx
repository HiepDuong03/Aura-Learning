import React, { useState, useEffect } from 'react';
import { SavedWord, AnkiRating } from '../../types';
import { 
  Layers, 
  Volume2, 
  RotateCw, 
  Sparkles, 
  Award, 
  Clock, 
  BrainCircuit, 
  BookMarked,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakWord } from '../../services/dictionaryService';
import { 
  calculateAnkiSchedule, 
  getAnkiIntervalPreviews, 
  calculateRetrievability 
} from '../../services/ankiScheduler';

interface VocabularyReviewProps {
  savedWords: SavedWord[];
  onReviewWord: (wordId: string, rating: AnkiRating) => void;
}

export const VocabularyReview: React.FC<VocabularyReviewProps> = ({
  savedWords,
  onReviewWord
}) => {
  const [isStudyMode, setIsStudyMode] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'due' | 'all' | 'mastered'>('due');

  const now = Date.now();

  // Filter words
  const dueWords = savedWords.filter((w) => !w.dueAt || w.dueAt <= now);
  const masteredWords = savedWords.filter((w) => w.interval >= 21);
  
  const displayWords = filterMode === 'due' 
    ? (dueWords.length > 0 ? dueWords : savedWords)
    : filterMode === 'mastered' 
    ? masteredWords 
    : savedWords;

  const currentWord = displayWords[currentIndex] || displayWords[0];

  // Dynamic preview for the 4 Anki buttons
  const previews = currentWord ? getAnkiIntervalPreviews(currentWord) : null;
  const currentRetrievability = currentWord ? calculateRetrievability(currentWord) : 100;

  // Keyboard shortcut listener (Space = flip, Escape = exit, 1/2/3/4 = rate)
  useEffect(() => {
    if (!isStudyMode || !currentWord) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        setIsStudyMode(false);
      } else if (e.code === 'Space') {
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
  }, [isStudyMode, isFlipped, currentWord, currentIndex, displayWords.length]);

  const [isFinished, setIsFinished] = useState<boolean>(false);

  const handleRate = (rating: AnkiRating) => {
    if (!currentWord) return;

    onReviewWord(currentWord.id, rating);
    setIsFlipped(false);

    if (currentIndex < displayWords.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setIsStudyMode(false);
      setIsFinished(true);
      setCurrentIndex(0);
    }
  };


  if (savedWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm max-w-xl mx-auto my-12">
        <div className="size-16 rounded-3xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
          <BookMarked className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-800">Chưa có từ vựng nào được lưu</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          Khi xem video, hãy bấm vào bất kỳ từ nào bạn chưa biết và nhấn "Lưu vào Flashcards" để thuật toán Anki tự động lên lịch nhé!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BrainCircuit className="w-7 h-7 text-teal-600" /> Ôn Tập Thuật Toán Anki SM-2
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-purple-700">
              SM-2 Engine
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Cá nhân hóa hệ số Ease Factor và khoảng cách ôn tập theo quy luật đường cong quên lãng
          </p>
        </div>

        {!isStudyMode && displayWords.length > 0 && (
          <button
            onClick={() => {
              setIsStudyMode(true);
              setIsFinished(false);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
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
            <div className="size-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Xuất sắc! Bạn đã hoàn thành toàn bộ các thẻ đến hạn hôm nay!
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Thuật toán Anki SM-2 đã tự động gia hạn khoảng cách nhớ. Hãy tiếp tục duy trì chuỗi học nhé!
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsFinished(false)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      {!isStudyMode && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
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
              ? 'Chưa có từ nào thuộc nhóm "Đã thuộc sâu" (Interval ≥ 21 ngày)'
              : 'Không có thẻ từ nào trong mục này'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterMode === 'mastered'
              ? 'Hãy tiếp tục ôn tập thẻ đến hạn hàng ngày để các mầm từ vựng phát triển thành Cây cổ thụ nhé!'
              : 'Bấm vào thẻ từ bất kỳ trong video để thêm từ mới vào danh sách ôn tập.'}
          </p>
        </div>
      )}

      {/* FLASHCARD STUDY VIEW */}
      {isStudyMode && currentWord ? (
        <div className="max-w-lg mx-auto space-y-4">
          {/* Top Progress & Anki Telemetry Bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="text-teal-700 font-black">
                Thẻ {currentIndex + 1} / {displayWords.length}
              </span>
              <button
                onClick={() => setIsStudyMode(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold"
              >
                Thoát ôn tập [Esc]
              </button>
            </div>

            {/* Anki Diagnostic Stats */}
            <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-center">
              <div className="p-1.5 rounded-xl bg-slate-50">
                <span className="block text-[10px] font-bold text-slate-400">Ease Factor</span>
                <span className="text-xs font-black text-purple-700">
                  {Math.round((currentWord.easeFactor || 2.5) * 100)}%
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-slate-50">
                <span className="block text-[10px] font-bold text-slate-400">Khoảng cách</span>
                <span className="text-xs font-black text-sky-700">
                  {currentWord.interval || 0} ngày
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-slate-50">
                <span className="block text-[10px] font-bold text-slate-400">Chuỗi thuộc</span>
                <span className="text-xs font-black text-emerald-700">
                  {currentWord.repetitions || 0} lần
                </span>
              </div>
              <div className="p-1.5 rounded-xl bg-slate-50">
                <span className="block text-[10px] font-bold text-slate-400">Độ nhớ (R)</span>
                <span className={`text-xs font-black ${
                  currentRetrievability >= 80 ? 'text-emerald-600' : currentRetrievability >= 50 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {currentRetrievability}%
                </span>
              </div>
            </div>
          </div>

          {/* Interactive 3D Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="relative h-88 w-full rounded-3xl bg-white border-2 border-slate-200/90 shadow-xl p-6 sm:p-8 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:border-teal-400 select-none"
          >
            {/* Top row */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                {currentWord.partOfSpeech}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakWord(currentWord.word);
                }}
                className="p-2.5 rounded-full bg-teal-50 text-teal-600 hover:bg-teal-100 hover:scale-105 active:scale-95 transition-all"
                title="Nghe phát âm chuẩn"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            {/* Center: Front or Back */}
            <div className="text-center space-y-3">
              {!isFlipped ? (
                <>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight capitalize">
                    {currentWord.word}
                  </h2>
                  <p className="text-base font-bold text-teal-600 tracking-wide">{currentWord.phonetic}</p>
                  {currentWord.contextSentence && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 mt-4 text-left">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Câu trong video:
                      </p>
                      <p className="text-xs italic text-slate-700 font-medium">
                        "{currentWord.contextSentence}"
                      </p>
                    </div>
                  )}
                  <p className="text-xs font-bold text-slate-400 pt-2 flex items-center justify-center gap-1">
                    <RotateCw className="w-3.5 h-3.5" /> Bấm vào thẻ (hoặc phím Space) để xem nghĩa
                  </p>
                </>
              ) : (
                <div className="space-y-3 animate-fade-in text-left">
                  <div className="p-3.5 rounded-2xl bg-teal-50/80 border border-teal-100">
                    <p className="text-[11px] font-black uppercase tracking-wider text-teal-700">
                      Nghĩa tiếng Việt
                    </p>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">
                      {currentWord.translation}
                    </h3>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Định nghĩa tiếng Anh
                    </p>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                      {currentWord.definitionEn}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom reminder */}
            <div className="text-center text-[10px] font-bold text-slate-400">
              {currentWord.videoTitle ? `Nguồn: ${currentWord.videoTitle}` : 'Thẻ từ vựng YouTube'}
            </div>
          </div>

          {/* THE 4 ANKI BUTTONS (Again, Hard, Good, Easy) */}
          {isFlipped ? (
            <div className="space-y-2 animate-fade-in">
              <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Đánh giá độ nhớ của bạn (Phím tắt: 1, 2, 3, 4):
              </p>
              <div className="grid grid-cols-4 gap-2">
                {/* 1: AGAIN */}
                <button
                  onClick={() => handleRate(1)}
                  className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-200 hover:bg-rose-100 active:scale-95 transition-all text-center group"
                >
                  <span className="block text-xs font-black text-rose-700 group-hover:scale-105">
                    Again (1)
                  </span>
                  <span className="block text-[11px] font-bold text-rose-500 mt-0.5">
                    {previews?.[1]}
                  </span>
                </button>

                {/* 2: HARD */}
                <button
                  onClick={() => handleRate(2)}
                  className="p-3 rounded-2xl bg-amber-50 border-2 border-amber-200 hover:bg-amber-100 active:scale-95 transition-all text-center group"
                >
                  <span className="block text-xs font-black text-amber-700 group-hover:scale-105">
                    Hard (2)
                  </span>
                  <span className="block text-[11px] font-bold text-amber-500 mt-0.5">
                    {previews?.[2]}
                  </span>
                </button>

                {/* 3: GOOD */}
                <button
                  onClick={() => handleRate(3)}
                  className="p-3 rounded-2xl bg-teal-50 border-2 border-teal-300 hover:bg-teal-100 active:scale-95 transition-all text-center group shadow-sm"
                >
                  <span className="block text-xs font-black text-teal-800 group-hover:scale-105">
                    Good (3)
                  </span>
                  <span className="block text-[11px] font-bold text-teal-600 mt-0.5">
                    {previews?.[3]}
                  </span>
                </button>

                {/* 4: EASY */}
                <button
                  onClick={() => handleRate(4)}
                  className="p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-300 hover:bg-emerald-100 active:scale-95 transition-all text-center group shadow-sm"
                >
                  <span className="block text-xs font-black text-emerald-800 group-hover:scale-105">
                    Easy (4)
                  </span>
                  <span className="block text-[11px] font-bold text-emerald-600 mt-0.5">
                    {previews?.[4]}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsFlipped(true)}
              className="w-full py-4 rounded-2xl btn-3d btn-3d-teal font-black text-sm flex items-center justify-center gap-2 shadow-[0_4px_0_#0f766e]"
            >
              <RotateCw className="w-4 h-4" /> Hiển thị đáp án (Space)
            </button>
          )}
        </div>
      ) : (
        /* LIST VIEW WITH ANKI BADGES */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayWords.map((word) => {
            const isDue = !word.dueAt || word.dueAt <= now;
            const retrievability = calculateRetrievability(word);

            return (
              <div
                key={word.id}
                className={`p-4 rounded-3xl bg-white border transition-all duration-200 flex flex-col justify-between ${
                  isDue ? 'border-teal-300 shadow-md ring-1 ring-teal-100' : 'border-slate-100 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-slate-900 capitalize">{word.word}</h3>
                      <button
                        onClick={() => speakWord(word.word)}
                        className="p-1 rounded-full text-teal-600 hover:bg-teal-50"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    {isDue ? (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 animate-pulse">
                        Cần ôn ngay
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">
                        Còn {Math.max(1, Math.round((word.dueAt - now) / 86400000))} ngày
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-teal-600 mt-0.5">{word.phonetic}</p>
                  <p className="text-sm font-bold text-slate-800 mt-2">{word.translation}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{word.definitionEn}</p>
                </div>

                {/* Anki Diagnostic Mini-Bar */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>EF: <strong className="text-purple-700">{Math.round((word.easeFactor || 2.5) * 100)}%</strong></span>
                  <span>Khoảng cách: <strong className="text-sky-700">{word.interval || 0}d</strong></span>
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
