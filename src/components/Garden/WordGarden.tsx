import React, { useState } from 'react';
import { SavedWord } from '../../types';
import { 
  Sprout, 
  Sparkles, 
  Sun, 
  Droplets, 
  Award, 
  TreePine, 
  Flower2, 
  Volume2,
  X,
  ArrowRight,
  Clock,
  BrainCircuit
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakWord } from '../../services/dictionaryService';
import { calculateRetrievability } from '../../services/ankiScheduler';

interface WordGardenProps {
  savedWords: SavedWord[];
  streakDays: number;
  onNavigateToReview?: () => void;
  onSelectWord?: (word: string, contextSentence?: string) => void;
}

export const WordGarden: React.FC<WordGardenProps> = ({
  savedWords,
  streakDays,
  onNavigateToReview,
  onSelectWord
}) => {
  const [selectedPlant, setSelectedPlant] = useState<SavedWord | null>(null);
  const [isWatered, setIsWatered] = useState<boolean>(false);

  const now = Date.now();
  const dueWords = savedWords.filter((w) => !w.dueAt || w.dueAt <= now);
  const masteredCount = savedWords.filter((w) => (w.interval || 0) >= 21).length;
  const reviewingCount = savedWords.filter((w) => (w.interval || 0) >= 3 && (w.interval || 0) < 21).length;
  const learningCount = savedWords.filter((w) => (w.interval || 0) < 3).length;

  const handleWaterGarden = () => {
    setIsWatered(true);
    confetti({
      particleCount: 80,
      spread: 90,
      colors: ['#38bdf8', '#0ea5e9', '#34d399', '#f43f5e']
    });
    setTimeout(() => setIsWatered(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sprout className="w-6 h-6 text-lime-600" /> Vườn Từ Vựng Của Bạn (Word Garden)
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Mỗi từ bạn học và ôn tập sẽ giúp mầm cây phát triển thành vườn hoa rực rỡ!
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dueWords.length > 0 && onNavigateToReview && (
            <button
              onClick={onNavigateToReview}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl btn-3d bg-emerald-600 text-white shadow-[0_3px_0_#059669] text-xs font-black animate-pulse"
            >
              <Clock className="w-4 h-4" /> Ôn {dueWords.length} cây cần tưới ➔
            </button>
          )}

          <button
            onClick={handleWaterGarden}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl btn-3d text-xs font-bold transition-all ${
              isWatered
                ? 'bg-sky-600 text-white shadow-[0_3px_0_#0369a1] scale-105'
                : 'bg-sky-500 text-white shadow-[0_3px_0_#0284c7]'
            }`}
          >
            <Droplets className={`w-4 h-4 fill-white ${isWatered ? 'animate-bounce' : ''}`} />
            {isWatered ? 'Đang tưới nước...' : 'Tưới nước cho vườn'}
          </button>
        </div>
      </div>

      {/* Due Words Notification Banner */}
      {dueWords.length > 0 && (
        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200/90 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black">
              💧
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">
                Có {dueWords.length} mầm cây đang khô hạn và cần bạn ôn tập hôm nay!
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Bấm vào cây để xem thẻ từ hoặc bắt đầu phiên ôn tập thuật toán SM-2.
              </p>
            </div>
          </div>
          {onNavigateToReview && (
            <button
              onClick={onNavigateToReview}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-all flex items-center gap-1"
            >
              Ôn ngay <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Garden Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-lime-50 border border-lime-200">
          <p className="text-xs font-bold text-lime-700 flex items-center gap-1">
            <Sprout className="w-4 h-4" /> Đang nảy mầm
          </p>
          <p className="text-2xl font-black text-lime-900 mt-1">{learningCount} từ</p>
          <p className="text-[10px] text-lime-600 font-semibold mt-0.5">Mầm non mới gieo</p>
        </div>

        <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200">
          <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
            <Flower2 className="w-4 h-4" /> Đang đơm hoa
          </p>
          <p className="text-2xl font-black text-amber-900 mt-1">{reviewingCount} từ</p>
          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Đang ôn tập đều đặn</p>
        </div>

        <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200">
          <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
            <TreePine className="w-4 h-4" /> Cây cổ thụ
          </p>
          <p className="text-2xl font-black text-emerald-900 mt-1">{masteredCount} từ</p>
          <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Đã nhớ vĩnh viễn</p>
        </div>

        <div className="p-4 rounded-3xl bg-orange-50 border border-orange-200">
          <p className="text-xs font-bold text-orange-700 flex items-center gap-1">
            <Sun className="w-4 h-4 text-amber-500" /> Ánh nắng Streak
          </p>
          <p className="text-2xl font-black text-orange-900 mt-1">{streakDays} ngày</p>
          <p className="text-[10px] text-orange-600 font-semibold mt-0.5">Giúp cây mau lớn</p>
        </div>
      </div>

      {/* Visual Garden Canvas */}
      <div className={`relative rounded-[36px] bg-gradient-to-b from-sky-200 via-sky-100 to-emerald-100 p-8 border border-sky-200 shadow-inner overflow-hidden min-h-[380px] flex flex-col justify-between transition-all ${
        isWatered ? 'ring-4 ring-sky-300 ring-offset-2' : ''
      }`}>
        {/* Floating Sun and Clouds */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 p-2 rounded-2xl bg-white/60 backdrop-blur-md text-xs font-bold text-sky-800">
            <Sun className="w-5 h-5 text-amber-500 animate-spin" style={{ animationDuration: '20s' }} />
            <span>{isWatered ? '🌧️ Cơn mưa tươi mát đang tưới cho cả vườn hoa!' : 'Khu vườn đang tràn ngập sức sống!'}</span>
          </div>

          <div className="text-right">
            <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-600 text-white shadow-sm">
              Cấp độ vườn: Level {Math.floor(savedWords.length / 3) + 1}
            </span>
          </div>
        </div>

        {/* The Plants & Flowers Visuals */}
        <div className="my-8 flex flex-wrap items-end justify-center gap-6 sm:gap-10">
          {savedWords.map((word) => {
            const isMastered = (word.interval || 0) >= 21;
            const isReviewing = (word.interval || 0) >= 3 && (word.interval || 0) < 21;
            const isDue = !word.dueAt || word.dueAt <= now;

            return (
              <div
                key={word.id}
                onClick={() => setSelectedPlant(word)}
                className="group flex flex-col items-center cursor-pointer transition-transform duration-200 hover:scale-125 focus:outline-none"
                title={`Bấm để xem chi tiết: ${word.word}`}
              >
                {/* Speech Bubble on Hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity mb-2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold whitespace-nowrap shadow-md pointer-events-none flex items-center gap-1">
                  <span>{word.word}</span>
                  <span className="text-slate-400">({word.translation})</span>
                  {isDue && <span className="text-amber-400">💧</span>}
                </div>

                {/* Plant Icon */}
                <div className={`relative size-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  isMastered
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-200'
                    : isReviewing
                    ? 'bg-amber-400 text-white ring-4 ring-amber-200'
                    : 'bg-lime-400 text-slate-800 ring-4 ring-lime-200'
                }`}>
                  {isDue && (
                    <span className="absolute -top-1 -right-1 size-4 bg-sky-500 rounded-full flex items-center justify-center text-[9px] shadow-sm animate-pulse">
                      💧
                    </span>
                  )}
                  {isMastered ? (
                    <TreePine className="w-8 h-8" />
                  ) : isReviewing ? (
                    <Flower2 className="w-8 h-8 animate-pulse" />
                  ) : (
                    <Sprout className="w-8 h-8" />
                  )}
                </div>

                {/* Pot / Soil */}
                <div className="w-10 h-3 rounded-b-xl bg-amber-800/80 mt-1 shadow-sm" />
                <span className="text-[10px] font-bold text-slate-700 mt-1 capitalize max-w-[70px] truncate">
                  {word.word}
                </span>
              </div>
            );
          })}
        </div>

        {/* Ground grass layer */}
        <div className="w-full h-4 rounded-full bg-emerald-600/30 backdrop-blur-sm flex items-center justify-center text-[10px] font-extrabold text-emerald-900">
          🌱 Đất màu mỡ nuôi dưỡng {savedWords.length} cây từ vựng • Bấm vào cây để xem độ lớn
        </div>
      </div>

      {/* PLANT INSPECTION POPUP MODAL */}
      {selectedPlant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🌱</span>
                <div>
                  <h3 className="text-xl font-black text-slate-900 capitalize flex items-center gap-2">
                    {selectedPlant.word}
                    <button
                      onClick={() => speakWord(selectedPlant.word)}
                      className="p-1 rounded-full text-teal-600 hover:bg-teal-50"
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </h3>
                  <p className="text-xs font-semibold text-teal-600">{selectedPlant.phonetic}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlant(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Nghĩa tiếng Việt</span>
              <p className="text-base font-black text-slate-800 mt-0.5">{selectedPlant.translation}</p>
              {selectedPlant.definitionEn && (
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{selectedPlant.definitionEn}</p>
              )}
            </div>

            {/* Plant Health & SM-2 Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400">Độ nhớ (R)</span>
                <span className="text-sm font-black text-emerald-600">
                  {calculateRetrievability(selectedPlant)}%
                </span>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400">Khoảng cách</span>
                <span className="text-sm font-black text-sky-600">
                  {selectedPlant.interval || 0} ngày
                </span>
              </div>
              <div className="p-2 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400">Hệ số Ease</span>
                <span className="text-sm font-black text-purple-600">
                  {Math.round((selectedPlant.easeFactor || 2.5) * 100)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              {onSelectWord && (
                <button
                  onClick={() => {
                    const wordToLookup = selectedPlant.word;
                    setSelectedPlant(null);
                    onSelectWord(wordToLookup);
                  }}
                  className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
                >
                  Tra từ điển đầy đủ
                </button>
              )}
              {onNavigateToReview && (
                <button
                  onClick={() => {
                    setSelectedPlant(null);
                    onNavigateToReview();
                  }}
                  className="flex-1 py-2.5 rounded-2xl btn-3d btn-3d-teal text-white text-xs font-black shadow-[0_3px_0_#0f766e]"
                >
                  Mở phòng ôn tập SM-2
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
