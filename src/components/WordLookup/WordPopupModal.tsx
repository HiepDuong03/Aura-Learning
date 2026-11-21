import React, { useState, useEffect } from 'react';
import { AuthUser, ContextExplanation, WordDefinition, LingQWordStatus } from '../../types';
import { Volume2, Bookmark, BookmarkCheck, X, Sparkles, Loader2, Lock } from 'lucide-react';
import { explainInContext, speakWord } from '../../services/dictionaryService';
import { lingqWordService } from '../../services/lingqWordService';
import { authService } from '../../services/authService';

interface WordPopupModalProps {
  definition: WordDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveWord: (def: WordDefinition) => void;
  isSaved: boolean;
  contextSentence?: string;
  videoTitle?: string;
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
}

export const WordPopupModal: React.FC<WordPopupModalProps> = ({
  definition,
  isOpen,
  onClose,
  onSaveWord,
  isSaved,
  contextSentence,
  videoTitle,
  currentUser = null,
  onOpenAuth
}) => {
  const [currentStatus, setCurrentStatus] = useState<LingQWordStatus>(0);
  const [aiExplanation, setAiExplanation] = useState<ContextExplanation | null>(null);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [explainError, setExplainError] = useState<string>('');

  useEffect(() => {
    if (definition?.word) {
      setCurrentStatus(lingqWordService.getWordStatus(definition.word));
      setAiExplanation(null);
      setExplainError('');
      setIsExplaining(false);
    }
  }, [definition?.word, contextSentence]);

  const handleSetStatus = (status: LingQWordStatus) => {
    if (!definition?.word) return;
    setCurrentStatus(status);
    lingqWordService.setWordStatus(definition.word, status);
  };

  const handleRequestAiExplain = async () => {
    if (!definition?.word) return;
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    setIsExplaining(true);
    setExplainError('');
    try {
      const result = await explainInContext({
        phrase: definition.word,
        sentence: contextSentence || definition.exampleEn || '',
        videoTitle: videoTitle || '',
        token: authService.getToken()
      });
      setAiExplanation(result);
    } catch (err) {
      setExplainError(err instanceof Error ? err.message : 'Không thể gọi AI giải thích lúc này.');
    } finally {
      setIsExplaining(false);
    }
  };

  // Keyboard shortcuts 1, 2, 3, 4, K, Escape
  useEffect(() => {
    if (!isOpen || !definition) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        handleSetStatus(Number(e.key) as LingQWordStatus);
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleSetStatus(4); // Known
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, definition, onClose]);

  if (!isOpen || !definition) return null;

  const isMultiWordPhrase = definition.word.trim().includes(' ');
  const aiRealMeaning =
    aiExplanation?.meaningVi &&
    !/^cách diễn đạt "/i.test(aiExplanation.meaningVi.trim()) &&
    aiExplanation.meaningVi.trim().toLowerCase() !== definition.word.trim().toLowerCase()
      ? aiExplanation.meaningVi.trim()
      : '';
  const dictRealMeaning =
    definition.translation &&
    definition.translation.trim().toLowerCase() !== definition.word.trim().toLowerCase()
      ? definition.translation.trim()
      : '';
  const resolvedMeaningVi = (!aiExplanation?.isFallback && aiRealMeaning) || dictRealMeaning || aiRealMeaning;
  const hasRealEnglishDef =
    Boolean(definition.definitionEn?.trim()) &&
    !/^(?:từ vựng tiếng anh:|cụm từ tiếng anh:|meaning of "|expression\/phrase ")/i.test(
      definition.definitionEn.trim()
    );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in cursor-pointer"
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 transition-all transform scale-100 animate-in fade-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header: Word / Phrase & Audio */}
        <div className="flex items-start justify-between pr-8 gap-2">
          <div>
            {isMultiWordPhrase && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 mb-1.5">
                <Sparkles className="w-3 h-3" /> Cụm từ / Idiom
              </span>
            )}
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight capitalize leading-tight">
                {definition.word}
              </h2>
              <button
                onClick={() => speakWord(definition.word)}
                className="p-2 rounded-full bg-teal-50 text-teal-600 hover:bg-teal-100 hover:scale-105 active:scale-95 transition-all shrink-0"
                title="Phát âm tiếng Anh"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            {definition.phonetic && (
              <p className="text-sm font-medium text-teal-600 mt-0.5 tracking-wide">
                {definition.phonetic}
              </p>
            )}
          </div>

          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 shrink-0">
            {definition.partOfSpeech}
          </span>
        </div>

        {/* Translation Banner */}
        <div className="mt-4 p-3.5 rounded-2xl bg-teal-50/80 border border-teal-100/80">
          <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Ý nghĩa tiếng Việt</p>
          {resolvedMeaningVi ? (
            <p className="text-lg font-bold text-teal-950 mt-0.5">{resolvedMeaningVi}</p>
          ) : (
            <p className="text-sm font-medium text-amber-800 mt-1">
              Chưa dịch được tự động — bấm nút AI bên dưới để dịch theo ngữ cảnh câu.
            </p>
          )}
        </div>

        {/* Definition EN (Only render when a real dictionary definition exists) */}
        <div className="mt-4 space-y-2">
          {hasRealEnglishDef && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Định nghĩa tiếng Anh</p>
              <p className="text-sm text-slate-700 mt-0.5 leading-relaxed">
                {definition.definitionEn}
              </p>
            </div>
          )}

          {/* Context / Example */}
          {(contextSentence || definition.exampleEn) && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mt-2">
              <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Ngữ cảnh trong video:
              </p>
              <p className="text-xs italic text-slate-700">
                "{contextSentence || definition.exampleEn}"
              </p>
            </div>
          )}

          {/* AI Contextual Explanation Panel */}
          <div className="pt-2">
            {!aiExplanation ? (
              <button
                type="button"
                onClick={handleRequestAiExplain}
                disabled={isExplaining}
                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/80 text-indigo-800 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              >
                {isExplaining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>AI đang phân tích sắc thái ngữ cảnh...</span>
                  </>
                ) : currentUser ? (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <span>✨ Giải thích bằng AI theo ngữ cảnh câu</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Đăng nhập để dùng AI giải thích theo ngữ cảnh</span>
                  </>
                )}
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-indigo-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Phân tích theo ngữ cảnh
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      aiExplanation.isFallback
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-white text-indigo-700 border-indigo-200'
                    }`}
                  >
                    {aiExplanation.isFallback ? 'Dịch trực tiếp' : 'Live Gemini'}
                  </span>
                </div>
                {aiExplanation.sentenceVi && (
                  <p className="text-slate-800 bg-white/80 rounded-lg p-2 border border-indigo-100 leading-relaxed">
                    <strong className="text-teal-800">Dịch cả câu:</strong> {aiExplanation.sentenceVi}
                  </p>
                )}
                {aiExplanation.nuance && (
                  <p className="text-slate-700 leading-relaxed">
                    <strong className="text-indigo-900">
                      {aiExplanation.isFallback ? 'Ghi chú:' : 'Sắc thái:'}
                    </strong>{' '}
                    {aiExplanation.nuance}
                  </p>
                )}
                {aiExplanation.grammarNote && (
                  <p className="text-slate-700 leading-relaxed">
                    <strong className="text-indigo-900">Ngữ pháp:</strong> {aiExplanation.grammarNote}
                  </p>
                )}
                {Array.isArray(aiExplanation.examples) && aiExplanation.examples.length > 0 && (
                  <div className="pt-1 space-y-1.5 border-t border-indigo-200/60">
                    <p className="font-bold text-indigo-800">Ví dụ ứng dụng:</p>
                    {aiExplanation.examples.slice(0, 2).map((ex, idx) => (
                      <div key={idx} className="bg-white/80 rounded-lg p-2 border border-indigo-100">
                        <p className="font-semibold text-slate-800">“{ex.en}”</p>
                        {ex.vi && <p className="text-slate-500 italic mt-0.5">{ex.vi}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {explainError && (
              <p className="mt-1.5 text-[11px] font-semibold text-rose-600">{explainError}</p>
            )}
          </div>

          {/* Synonyms */}
          {definition.synonyms && definition.synonyms.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Từ đồng nghĩa</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {definition.synonyms.map((s, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* LingQ 4-Status Selector Bar */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-teal-500" /> Trạng thái LingQ:
            </span>
            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              {lingqWordService.getStatusLabel(currentStatus).label}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
            {[
              { status: 1, label: '1 • Mới lưu', desc: '1 ngày', active: 'bg-amber-400 text-amber-950 font-black shadow-xs' },
              { status: 2, label: '2 • Đang nhớ', desc: '3-6 ngày', active: 'bg-yellow-300 text-yellow-950 font-black shadow-xs' },
              { status: 3, label: '3 • Gần thuộc', desc: '14 ngày', active: 'bg-emerald-500 text-white font-black shadow-xs' },
              { status: 4, label: '4 • Đã thuộc', desc: 'Known', active: 'bg-slate-800 text-white font-black shadow-xs' },
            ].map((item) => (
              <button
                key={item.status}
                type="button"
                onClick={() => handleSetStatus(item.status as LingQWordStatus)}
                className={`py-1.5 px-1 rounded-lg text-center transition-all ${
                  currentStatus === item.status
                    ? item.active
                    : 'bg-white text-slate-600 hover:bg-slate-200/80 active:scale-95'
                }`}
                title={`Đặt trạng thái (Phím tắt: ${item.status})`}
              >
                <p className="text-[10px] font-bold leading-tight">{item.label}</p>
                <p className="text-[9px] opacity-80 mt-0.5">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Action Button: Save to Flashcards */}
        <div className="mt-5 pt-1">
          <button
            onClick={() => {
              const enrichedDef: WordDefinition = {
                ...definition,
                translation: resolvedMeaningVi || definition.translation || definition.word,
                definitionEn: hasRealEnglishDef ? definition.definitionEn : ''
              };
              onSaveWord(enrichedDef);
              if (currentStatus === 0) {
                handleSetStatus(1);
              }
            }}
            className={`w-full py-3.5 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 btn-3d transition-all ${
              isSaved
                ? 'bg-emerald-500 text-white shadow-[0_4px_0_#059669]'
                : 'btn-3d-teal'
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck className="w-5 h-5" />
                Đã lưu vào Kho từ vựng (SRS)
              </>
            ) : (
              <>
                <Bookmark className="w-5 h-5" />
                Lưu vào Flashcards để ôn tập
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
