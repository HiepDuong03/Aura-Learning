import React, { useMemo, useState } from 'react';
import { LingQWordStatus, SavedWord } from '../../types';
import {
  BookMarked,
  BrainCircuit,
  Check,
  Edit3,
  Film,
  Search,
  Sparkles,
  Trash2,
  Volume2,
  X
} from 'lucide-react';
import { speakWord } from '../../services/dictionaryService';
import { lingqWordService } from '../../services/lingqWordService';
import { calculateFsrsRetrievability } from '../../services/fsrsScheduler';
import { useNotify } from '../Common/ToastProvider';

interface WordVaultScreenProps {
  savedWords: SavedWord[];
  onUpdateWord: (wordId: string, patch: { translation: string; contextSentence: string }) => void;
  onBulkDeleteWords: (words: Array<{ id: string; word: string }>) => void;
  onOpenWordInVideo?: (word: SavedWord) => void;
  onNavigateToReview: () => void;
}

type SrsFilter = 'all' | 'due' | 'learning' | 'mastered';

export const WordVaultScreen: React.FC<WordVaultScreenProps> = ({
  savedWords,
  onUpdateWord,
  onBulkDeleteWords,
  onOpenWordInVideo,
  onNavigateToReview
}) => {
  const { toast, confirmDialog } = useNotify();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [srsFilter, setSrsFilter] = useState<SrsFilter>('all');
  const [videoFilter, setVideoFilter] = useState<string>('ALL');
  const [lingqFilter, setLingqFilter] = useState<'ALL' | LingQWordStatus>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editTranslation, setEditTranslation] = useState<string>('');
  const [editContext, setEditContext] = useState<string>('');
  const [now] = useState<number>(() => Date.now());

  const videoTitles = useMemo(() => {
    const titles = new Set<string>();
    savedWords.forEach((w) => {
      if (w.videoTitle && w.videoTitle.trim()) {
        titles.add(w.videoTitle.trim());
      }
    });
    return Array.from(titles).sort((a, b) => a.localeCompare(b));
  }, [savedWords]);

  const counts = useMemo(() => {
    const due = savedWords.filter((w) => !w.dueAt || w.dueAt <= now).length;
    const mastered = savedWords.filter((w) => (w.interval || 0) >= 21).length;
    const learning = savedWords.length - mastered;
    return { total: savedWords.length, due, learning, mastered };
  }, [savedWords, now]);

  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return savedWords.filter((w) => {
      if (srsFilter === 'due' && w.dueAt && w.dueAt > now) return false;
      if (srsFilter === 'mastered' && (w.interval || 0) < 21) return false;
      if (srsFilter === 'learning' && (w.interval || 0) >= 21) return false;

      if (videoFilter !== 'ALL' && (w.videoTitle || '') !== videoFilter) return false;

      if (lingqFilter !== 'ALL') {
        const st = lingqWordService.getWordStatus(w.word);
        if (st !== lingqFilter) return false;
      }

      if (!q) return true;
      return (
        w.word.toLowerCase().includes(q) ||
        (w.translation || '').toLowerCase().includes(q) ||
        (w.contextSentence || '').toLowerCase().includes(q) ||
        (w.videoTitle || '').toLowerCase().includes(q)
      );
    });
  }, [savedWords, searchQuery, srsFilter, videoFilter, lingqFilter, now]);

  const toggleSelect = (wordId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    if (filteredWords.length === 0) return;
    const allSelected = filteredWords.every((w) => selectedIds.has(w.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWords.map((w) => w.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const targets = savedWords
      .filter((w) => selectedIds.has(w.id))
      .map((w) => ({ id: w.id, word: w.word }));

    const confirmed = await confirmDialog({
      title: `Xóa ${targets.length} từ vựng đã chọn?`,
      message: 'Các từ này sẽ bị xóa khỏi Kho từ vựng cục bộ và đồng bộ xóa lên Cloud (nếu đã đăng nhập).',
      confirmLabel: `Xóa ${targets.length} từ`,
      cancelLabel: 'Hủy',
      destructive: true
    });

    if (!confirmed) return;
    onBulkDeleteWords(targets);
    setSelectedIds(new Set());
    toast.success(`Đã xóa ${targets.length} từ vựng khỏi kho.`);
  };

  const handleDeleteSingle = async (word: SavedWord) => {
    const confirmed = await confirmDialog({
      title: `Xóa từ "${word.word}"?`,
      message: 'Từ này sẽ bị xóa khỏi danh sách ôn tập SRS của bạn.',
      confirmLabel: 'Xóa từ',
      cancelLabel: 'Giữ lại',
      destructive: true
    });
    if (!confirmed) return;
    onBulkDeleteWords([{ id: word.id, word: word.word }]);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(word.id);
      return next;
    });
    toast.success(`Đã xóa "${word.word}".`);
  };

  const startEdit = (word: SavedWord) => {
    setEditingWordId(word.id);
    setEditTranslation(word.translation || '');
    setEditContext(word.contextSentence || '');
  };

  const saveEdit = (wordId: string) => {
    const trimmedTrans = editTranslation.trim();
    if (!trimmedTrans) {
      toast.error('Nghĩa tiếng Việt không được để trống.');
      return;
    }
    onUpdateWord(wordId, {
      translation: trimmedTrans,
      contextSentence: editContext.trim()
    });
    setEditingWordId(null);
    toast.success('Đã cập nhật ghi chú từ vựng.');
  };

  if (savedWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm max-w-xl mx-auto my-12">
        <div className="size-16 rounded-3xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
          <BookMarked className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Kho từ vựng của bạn đang trống</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          Trong lúc xem video, hãy nhấn vào từng từ hoặc bôi đen cụm từ (idiom) để lưu lại cùng câu ngữ cảnh và timestamp video gốc.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BookMarked className="w-7 h-7 text-teal-600" /> Kho Từ Vựng (Word Vault)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-teal-100 text-teal-800">
              {savedWords.length} mục
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Quản lý từ đơn & cụm từ đã lưu, chỉnh sửa nghĩa ngữ cảnh và nhảy thẳng về đúng giây trong video gốc
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToReview}
          className="px-5 py-3 rounded-2xl btn-3d btn-3d-teal text-xs font-black flex items-center justify-center gap-2 shrink-0"
        >
          <BrainCircuit className="w-4 h-4" />
          <span>Ôn tập Flashcards ({counts.due} đến hạn) ➔</span>
        </button>
      </div>

      {/* Search & Filters Card */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm từ vựng, cụm từ, nghĩa tiếng Việt hoặc câu ví dụ..."
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:bg-white focus:border-teal-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Video Filter */}
          <select
            value={videoFilter}
            onChange={(e) => setVideoFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none focus:border-teal-500 max-w-full md:max-w-[220px]"
          >
            <option value="ALL">🎬 Tất cả nguồn video ({videoTitles.length})</option>
            {videoTitles.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>

          {/* LingQ Status Filter */}
          <select
            value={lingqFilter === 'ALL' ? 'ALL' : String(lingqFilter)}
            onChange={(e) =>
              setLingqFilter(e.target.value === 'ALL' ? 'ALL' : (Number(e.target.value) as LingQWordStatus))
            }
            className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 outline-none focus:border-teal-500"
          >
            <option value="ALL">🏷️ Mọi cấp độ LingQ</option>
            <option value="1">1 • Mới lưu</option>
            <option value="2">2 • Đang nhớ</option>
            <option value="3">3 • Gần thuộc</option>
            <option value="4">4 • Đã thuộc (Known)</option>
          </select>
        </div>

        {/* SRS Status Pills & Bulk Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `Tất cả (${counts.total})` },
                { id: 'due', label: `Cần ôn (${counts.due})` },
                { id: 'learning', label: `Đang học (${counts.learning})` },
                { id: 'mastered', label: `Đã thuộc sâu (${counts.mastered})` }
              ] as Array<{ id: SrsFilter; label: string }>
            ).map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSrsFilter(pill.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  srsFilter === pill.id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              {filteredWords.length > 0 && filteredWords.every((w) => selectedIds.has(w.id))
                ? 'Bỏ chọn tất cả'
                : `Chọn tất cả (${filteredWords.length})`}
            </button>

            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa đã chọn ({selectedIds.size})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results List */}
      {filteredWords.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-3xl border border-slate-100 shadow-sm space-y-2">
          <p className="text-sm font-black text-slate-700">Không tìm thấy từ vựng khớp bộ lọc</p>
          <p className="text-xs text-slate-500">Thử xóa từ khóa tìm kiếm hoặc chuyển sang bộ lọc "Tất cả".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredWords.map((word) => {
            const isSelected = selectedIds.has(word.id);
            const isEditing = editingWordId === word.id;
            const isDue = !word.dueAt || word.dueAt <= now;
            const isPhrase = word.word.trim().includes(' ');
            const retrievability = calculateFsrsRetrievability(word, now);
            const lingqStatus = lingqWordService.getWordStatus(word.word);
            const lingqLabel = lingqWordService.getStatusLabel(lingqStatus).label;
            const hasVideoJump = Boolean(onOpenWordInVideo && (word.sourceLessonId || word.sourceYoutubeId));

            return (
              <div
                key={word.id}
                className={`p-4 rounded-3xl bg-white border transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md'
                    : 'border-slate-200/80 shadow-sm hover:border-slate-300'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Row: Checkbox + Word + Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(word.id)}
                        className="mt-1.5 size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
                        aria-label={`Chọn từ ${word.word}`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-black text-slate-900 capitalize break-words">
                            {word.word}
                          </h3>
                          <button
                            type="button"
                            onClick={() => speakWord(word.word)}
                            className="p-1.5 rounded-full bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors"
                            title="Nghe phát âm"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          {isPhrase && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 inline-flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" /> Cụm từ
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                          {word.phonetic && <span className="font-semibold text-teal-600">{word.phonetic}</span>}
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-600">
                            {word.partOfSpeech}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold">
                            {lingqLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startEdit(word)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                          title="Chỉnh sửa nghĩa & ngữ cảnh"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(word)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa từ này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body: Inline Editor OR Display */}
                  {isEditing ? (
                    <div className="space-y-2 p-3 rounded-2xl bg-slate-50 border border-teal-200">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Nghĩa tiếng Việt
                        </label>
                        <input
                          type="text"
                          value={editTranslation}
                          onChange={(e) => setEditTranslation(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold focus:border-teal-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                          Câu ngữ cảnh (Context Sentence)
                        </label>
                        <textarea
                          rows={2}
                          value={editContext}
                          onChange={(e) => setEditContext(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:border-teal-500 outline-none resize-none"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingWordId(null)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(word.id)}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-teal-600 text-white hover:bg-teal-700 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Lưu thay đổi
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-extrabold text-teal-900 bg-teal-50/70 px-3 py-2 rounded-xl border border-teal-100/80">
                        {word.translation}
                      </p>
                      {word.contextSentence && (
                        <p className="text-xs italic text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 leading-relaxed">
                          “{word.contextSentence}”
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Footer: SRS Telemetry & Jump to Video */}
                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                  <div className="flex items-center gap-2.5 text-slate-500 font-semibold">
                    <span className={isDue ? 'text-teal-700 font-black' : 'text-slate-500'}>
                      {isDue ? '● Cần ôn hôm nay' : `Interval: ${word.interval || 0}d`}
                    </span>
                    <span>•</span>
                    <span className={retrievability >= 80 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                      {retrievability}% nhớ
                    </span>
                  </div>

                  {hasVideoJump ? (
                    <button
                      type="button"
                      onClick={() => onOpenWordInVideo?.(word)}
                      className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 font-bold flex items-center gap-1 transition-all active:scale-95"
                      title={`Mở lại video "${word.videoTitle || 'gốc'}" tại giây ${Math.floor(word.sourceTimestampSec || 0)}s`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>
                        Xem video
                        {typeof word.sourceTimestampSec === 'number'
                          ? ` (${Math.floor(word.sourceTimestampSec / 60)}:${String(
                              Math.floor(word.sourceTimestampSec % 60)
                            ).padStart(2, '0')})`
                          : ''}
                      </span>
                    </button>
                  ) : word.videoTitle ? (
                    <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[180px]">
                      🎬 {word.videoTitle}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
