import React, { useState, useMemo } from 'react';
import { VideoLesson } from '../../types';
import { 
  Play, 
  Sparkles, 
  Filter, 
  Clock, 
  Eye, 
  BookOpen, 
  Flame, 
  Trash2, 
  FolderHeart, 
  Video,
  X,
  Plus
} from 'lucide-react';

export interface HomeScreenProps {
  lessons: VideoLesson[];
  onSelectLesson: (lesson: VideoLesson, initialMode?: 'subtitles' | 'dictation' | 'shadowing' | 'quiz') => void;
  streakDays: number;
  savedWordsCount: number;
  isListeningHub?: boolean;
  onOpenImport?: () => void;
  onDeleteLesson?: (lessonId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  lessons,
  onSelectLesson,
  streakDays,
  savedWordsCount,
  isListeningHub = false,
  onOpenImport,
  onDeleteLesson,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [showOnlyCustom, setShowOnlyCustom] = useState<boolean>(false);

  const levels = ['All', 'A1', 'A2', 'B1', 'B2', 'C1'];
  const topics = [
    'All',
    'Language Learning',
    'Daily Life',
    'Science & Nature',
    'Technology',
    'Comedy & Sitcoms',
    'Culture & Society'
  ];

  const safeLessons = useMemo(() => {
    return (lessons || []).filter((l): l is VideoLesson => Boolean(l && typeof l === 'object' && l.id));
  }, [lessons]);

  const customLessonsCount = useMemo(() => {
    return safeLessons.filter(
      (l) => Boolean(l.isCustom || (typeof l.id === 'string' && l.id.startsWith('lesson-custom-')))
    ).length;
  }, [safeLessons]);

  const filteredLessons = useMemo(() => {
    return safeLessons.filter((lesson) => {
      const isCustom = Boolean(lesson.isCustom || (typeof lesson.id === 'string' && lesson.id.startsWith('lesson-custom-')));
      if (showOnlyCustom && !isCustom) return false;
      const matchLevel = selectedLevel === 'All' || lesson.level === selectedLevel;
      const matchTopic = selectedTopic === 'All' || lesson.topic === selectedTopic;
      return matchLevel && matchTopic;
    });
  }, [safeLessons, showOnlyCustom, selectedLevel, selectedTopic]);

  const isFilterActive = selectedLevel !== 'All' || selectedTopic !== 'All' || showOnlyCustom;

  const handleClearFilters = () => {
    setSelectedLevel('All');
    setSelectedTopic('All');
    setShowOnlyCustom(false);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Welcome Banner */}
      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-lg ${
        isListeningHub
          ? 'bg-gradient-to-r from-sky-800 via-indigo-700 to-purple-700'
          : 'bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600'
      }`}>
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> 
            {isListeningHub ? 'Trung tâm Luyện Nghe Chuyên Sâu (Listening Hub)' : 'Học tiếng Anh vui vẻ & hiệu quả'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            {isListeningHub
              ? 'Luyện Nghe Bắt Nhịp Âm Chuẩn Người Bản Xứ'
              : 'Biến Mọi Video YouTube Thành Bài Học Đỉnh Cao'}
          </h1>
          <p className="text-sm sm:text-base text-teal-100 font-medium leading-relaxed">
            {isListeningHub
              ? 'Luyện nghe sâu theo phương pháp Dictation & Shadowing. Tập trung bắt âm, điền từ vào chỗ trống và kiểm tra phản xạ ngay trên từng câu nói.'
              : 'Xem video yêu thích, nhấn vào từ bất kỳ để tra nghĩa tức thì. Luyện nói chấm điểm AI và chép chính tả phản xạ.'}
          </p>

          <div className="pt-2 flex flex-wrap gap-3 text-xs font-bold">
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
              <span>Chuỗi {streakDays} ngày học</span>
            </div>
            <div className="flex items-center gap-1.5 bg-black/20 px-3 py-1.5 rounded-full">
              <BookOpen className="w-4 h-4 text-teal-200" />
              <span>{savedWordsCount} từ vựng đã lưu</span>
            </div>
            {customLessonsCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowOnlyCustom((prev) => !prev);
                  if (!showOnlyCustom) {
                    setSelectedLevel('All');
                    setSelectedTopic('All');
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  showOnlyCustom
                    ? 'bg-white text-teal-800 shadow-md ring-2 ring-white/50'
                    : 'bg-black/25 hover:bg-black/35 text-white'
                }`}
                title="Bấm để lọc xem video bạn đã nhập"
              >
                <FolderHeart className="w-4 h-4 text-emerald-300" />
                <span>{customLessonsCount} video của bạn {showOnlyCustom ? '✓' : ''}</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-[-40px] bottom-[-40px] size-72 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Filter Bar (Level, Custom & Topics) */}
      <div className="space-y-3">
        {/* Levels & Custom Video Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400 pl-1 pr-2 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Bộ lọc:
          </div>

          {/* Quick Filter: User's Imported Videos */}
          <button
            type="button"
            onClick={() => {
              setShowOnlyCustom((prev) => !prev);
              if (!showOnlyCustom) {
                setSelectedLevel('All');
              }
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              showOnlyCustom
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <FolderHeart className="w-3.5 h-3.5" />
            <span>Video của bạn ({customLessonsCount})</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1 shrink-0" />

          {/* CEFR Levels */}
          {levels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                setSelectedLevel(lvl);
                if (lvl !== 'All') {
                  setShowOnlyCustom(false);
                }
              }}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all btn-3d shrink-0 ${
                selectedLevel === lvl && !showOnlyCustom
                  ? 'btn-3d-teal'
                  : 'btn-3d-white text-slate-600 hover:text-slate-900'
              }`}
            >
              {lvl === 'All' ? 'Tất cả' : lvl}
            </button>
          ))}
        </div>

        {/* Topics */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {topics.map((top) => (
            <button
              key={top}
              onClick={() => setSelectedTopic(top)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                selectedTopic === top
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {top === 'All' ? 'Tất cả chủ đề' : top}
            </button>
          ))}
        </div>

        {/* Active Filter Indicator & Reset Bar */}
        {isFilterActive && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-teal-50/90 border border-teal-200 rounded-2xl animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-950 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Đang lọc:</span>
              {showOnlyCustom && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[11px] font-black">
                  Video tự nhập ({customLessonsCount})
                </span>
              )}
              {selectedLevel !== 'All' && (
                <span className="px-2 py-0.5 rounded-md bg-teal-200 text-teal-900 text-[11px] font-black">
                  Trình độ {selectedLevel}
                </span>
              )}
              {selectedTopic !== 'All' && (
                <span className="px-2 py-0.5 rounded-md bg-teal-200 text-teal-900 text-[11px] font-black">
                  {selectedTopic}
                </span>
              )}
              <span className="text-teal-700 font-semibold ml-1">
                ({filteredLessons.length} / {safeLessons.length} video hiển thị)
              </span>
            </div>

            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-xl bg-white text-teal-700 hover:bg-teal-100 border border-teal-300 shadow-sm transition-all"
            >
              <X className="w-3 h-3" />
              <span>Xóa bộ lọc (Xem tất cả {safeLessons.length} video)</span>
            </button>
          </div>
        )}
      </div>

      {/* Video Shelf: Explore Lessons */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {showOnlyCustom ? 'Video Tùy Chỉnh Của Bạn' : 'Bài Học Được Đề Xuất Cho Bạn'}
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {showOnlyCustom 
                ? 'Các video YouTube bạn đã tự import và lưu vào bộ nhớ lâu dài'
                : 'Video có sẵn phụ đề song ngữ và bài tập thực hành'}
            </p>
          </div>
          <span className="text-xs font-bold text-teal-600">
            {filteredLessons.length} video sẵn sàng
          </span>
        </div>

        {/* Empty State when no lessons match filter */}
        {filteredLessons.length === 0 ? (
          <div className="py-14 px-6 rounded-3xl bg-white border border-dashed border-slate-200 text-center space-y-4 shadow-sm">
            <div className="size-16 mx-auto rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center shadow-inner">
              <Video className="w-8 h-8 text-teal-600" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-lg font-black text-slate-800">Không tìm thấy video nào</h3>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                {showOnlyCustom 
                  ? 'Bạn chưa có video nào tự import, hoặc video tự import không khớp với trình độ/chủ đề đã lọc.'
                  : `Không có bài học nào khớp với bộ lọc hiện tại (Trình độ: ${selectedLevel}, Chủ đề: ${selectedTopic}).`}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                ✕ Xóa toàn bộ bộ lọc ({safeLessons.length} video)
              </button>
              {onOpenImport && (
                <button
                  type="button"
                  onClick={onOpenImport}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Dán link YouTube để học ngay</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredLessons.map((lesson) => {
              const isCustomLesson = Boolean(
                lesson.isCustom || (typeof lesson.id === 'string' && lesson.id.startsWith('lesson-custom-'))
              );

              return (
                <div
                  key={lesson.id}
                  onClick={() => onSelectLesson(lesson)}
                  className={`group cursor-pointer rounded-3xl bg-white border p-3 shadow-sm hover:shadow-xl transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between relative ${
                    isCustomLesson ? 'border-emerald-200 ring-1 ring-emerald-500/10' : 'border-slate-100'
                  }`}
                >
                  <div>
                    {/* Thumbnail */}
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-100">
                      <img
                        src={lesson.thumbnail}
                        alt={lesson.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="size-11 rounded-full bg-white/90 text-teal-700 shadow-md flex items-center justify-center transform group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-teal-700 ml-0.5" />
                        </div>
                      </div>

                      {/* Level Badge */}
                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-900/80 text-white backdrop-blur-md">
                        {lesson.level}
                      </span>

                      {/* Custom Imported Badge */}
                      {isCustomLesson && (
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-md flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 fill-current" /> ĐÃ NHẬP
                        </span>
                      )}

                      {/* Duration */}
                      <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/75 text-white backdrop-blur-sm flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {lesson.duration}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="mt-3 space-y-1">
                      <h3 className="text-sm font-extrabold text-slate-900 line-clamp-2 leading-snug group-hover:text-teal-600 transition-colors">
                        {lesson.title}
                      </h3>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500 pt-1">
                        <span className="truncate max-w-[130px]">{lesson.channel}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {lesson.views}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tag footer */}
                  {isListeningHub ? (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLesson(lesson, 'dictation');
                        }}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] font-black transition-colors text-center"
                        title="Luyện chép chính tả video này"
                      >
                        🎧 Dictation
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLesson(lesson, 'shadowing');
                        }}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-black transition-colors text-center"
                        title="Luyện Shadowing ngữ điệu"
                      >
                        🎙️ Shadowing
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectLesson(lesson, 'quiz');
                        }}
                        className="py-1.5 px-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-black transition-colors text-center"
                        title="Luyện trắc nghiệm"
                      >
                        📝 Quiz
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-teal-700">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-teal-50">
                          {lesson.subtitles?.length || 0} câu phụ đề
                        </span>
                        {isCustomLesson && onDeleteLesson && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Bạn có chắc chắn muốn xoá video "${lesson.title}" khỏi danh sách bài học?`)) {
                                onDeleteLesson(lesson.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa video tự nhập này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <span className="text-orange-600 font-extrabold">Học ngay ➔</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
