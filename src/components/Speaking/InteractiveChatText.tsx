import React, { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import { extractSelectablePhrase, tokenizeChatText } from '../../utils/roleplayTextHelper';

interface InteractiveChatTextProps {
  text: string;
  isUser: boolean;
  blurred?: boolean;
  savedWordSet?: Set<string>;
  onWordClick?: (word: string, contextSentence: string) => void;
}

/**
 * Renders every English word as an interactive clickable span (Langua `.js-translatable-text` UX)
 * with optional Listen-First blur-to-reveal and drag-to-translate phrase lookup (<= 70 chars).
 */
export const InteractiveChatText: React.FC<InteractiveChatTextProps> = ({
  text,
  isUser,
  blurred = false,
  savedWordSet,
  onWordClick
}) => {
  const [revealed, setRevealed] = useState<boolean>(false);
  const tokens = useMemo(() => tokenizeChatText(text), [text]);

  const isHidden = blurred && !revealed;

  if (isHidden) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className="w-full text-left group relative rounded-2xl bg-slate-200/80 hover:bg-slate-200 px-3.5 py-2.5 transition-all cursor-pointer border border-slate-300/60"
        title="Chế độ Nghe trước: bấm vào khối mờ để hiện chữ"
      >
        <p className="text-sm font-semibold leading-relaxed select-none blur-[5px] opacity-60 pointer-events-none">
          {text}
        </p>
        <span className="absolute inset-0 flex items-center justify-center gap-1.5 text-xs font-black text-slate-700 group-hover:text-teal-700">
          <Eye className="w-3.5 h-3.5" />
          <span>Nghe trước · Bấm để hiện chữ</span>
        </span>
      </button>
    );
  }

  const handleMouseUp = () => {
    if (!onWordClick || typeof window === 'undefined') return;
    const rawSelection = window.getSelection()?.toString() || '';
    const phrase = extractSelectablePhrase(rawSelection, 70);
    if (phrase) {
      onWordClick(phrase, text);
    }
  };

  return (
    <p
      onMouseUp={handleMouseUp}
      className="text-sm font-semibold leading-relaxed"
    >
      {tokens.map((tok, idx) => {
        if (!tok.isWord || !onWordClick) {
          return <React.Fragment key={idx}>{tok.raw}</React.Fragment>;
        }
        const isSaved = Boolean(savedWordSet?.has(tok.cleanWord));
        return (
          <span
            key={idx}
            role="button"
            tabIndex={0}
            onClick={(e) => {
              const sel = window.getSelection()?.toString().trim();
              if (sel && sel.includes(' ')) return;
              e.stopPropagation();
              onWordClick(tok.cleanWord, text);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onWordClick(tok.cleanWord, text);
              }
            }}
            className={`inline rounded px-0.5 -mx-0.5 cursor-pointer transition-colors ${
              isUser
                ? isSaved
                  ? 'bg-emerald-500/30 text-emerald-100 underline decoration-emerald-300/80 decoration-dotted underline-offset-2'
                  : 'hover:bg-white/20'
                : isSaved
                  ? 'bg-amber-200/70 text-amber-950 underline decoration-amber-500 decoration-dotted underline-offset-2'
                  : 'hover:bg-teal-200/70 hover:text-teal-950'
            }`}
            title={isSaved ? 'Từ đã lưu trong FSRS-6 · Bấm để xem lại' : 'Bấm để tra nghĩa & lưu FSRS-6'}
          >
            {tok.raw}
          </span>
        );
      })}
    </p>
  );
};
