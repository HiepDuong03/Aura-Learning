import React, { useState } from 'react';
import { BookOpen, Layers } from 'lucide-react';
import { AnkiRating, AuthUser, SavedWord } from '../../types';

const VocabularyReview = React.lazy(() => import('../Review/VocabularyReview').then((m) => ({ default: m.VocabularyReview })));
const WordVaultScreen = React.lazy(() => import('../Vocabulary/WordVaultScreen').then((m) => ({ default: m.WordVaultScreen })));

interface MemoryHubScreenProps {
  savedWords: SavedWord[];
  currentUser?: AuthUser | null;
  onReviewWord: (wordId: string, rating: AnkiRating) => void;
  onUpdateWord: (wordId: string, patch: { translation: string; contextSentence: string }) => void;
  onBulkDeleteWords: (targets: Array<{ id: string; word: string }>) => void;
  onOpenWordInVideo: (word: SavedWord) => void;
  onOpenAuth: () => void;
}

export const MemoryHubScreen: React.FC<MemoryHubScreenProps> = ({
  savedWords,
  currentUser,
  onReviewWord,
  onUpdateWord,
  onBulkDeleteWords,
  onOpenWordInVideo,
  onOpenAuth
}) => {
  const [subTab, setSubTab] = useState<'review' | 'vault'>('review');

  return (
    <div className="space-y-4">
      <div className="inline-flex p-1 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
        <button
          type="button"
          onClick={() => setSubTab('review')}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
            subTab === 'review' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Ôn tập FSRS-6</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('vault')}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
            subTab === 'vault' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Kho từ vựng ({savedWords.length})</span>
        </button>
      </div>

      <React.Suspense fallback={<div className="p-10 text-center text-xs font-bold text-slate-500">Đang nạp kho trí nhớ...</div>}>
        {subTab === 'review' ? (
          <VocabularyReview
            savedWords={savedWords}
            onReviewWord={onReviewWord}
            onOpenWordInVideo={onOpenWordInVideo}
            currentUser={currentUser}
            onOpenAuth={onOpenAuth}
          />
        ) : (
          <WordVaultScreen
            savedWords={savedWords}
            onUpdateWord={onUpdateWord}
            onBulkDeleteWords={onBulkDeleteWords}
            onOpenWordInVideo={onOpenWordInVideo}
            onNavigateToReview={() => setSubTab('review')}
          />
        )}
      </React.Suspense>
    </div>
  );
};
