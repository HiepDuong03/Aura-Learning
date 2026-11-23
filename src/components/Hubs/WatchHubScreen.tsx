import React, { useState } from 'react';
import { PlaySquare, Video } from 'lucide-react';
import { AuthUser, DailyReelProgress, SavedWord, VideoLesson, AnkiRating } from '../../types';
import { HomeScreen } from '../Home/HomeScreen';
import { SaveReelExpressionPayload } from '../Shorts/ShortsView';

const ShortsView = React.lazy(() => import('../Shorts/ShortsView').then((m) => ({ default: m.ShortsView })));

interface WatchHubScreenProps {
  initialSubTab?: 'videos' | 'shorts';
  lessons: VideoLesson[];
  shorts: VideoLesson[];
  streakDays: number;
  savedWords: SavedWord[];
  activeProfileId: string;
  currentUser?: AuthUser | null;
  dailyReelProgress: DailyReelProgress;
  onSelectLesson: (lesson: VideoLesson, mode?: 'subtitles' | 'dictation' | 'shadowing' | 'quiz', startSec?: number) => void;
  onOpenImport: () => void;
  onDeleteLesson: (lessonId: string) => void;
  onSelectWord: (word: string, contextSentence?: string, sourceMeta?: { lessonId?: string; youtubeId?: string; timestampSec?: number }) => void;
  onReviewWord: (wordId: string, rating: AnkiRating) => void;
  onSaveReelExpression: (payload: SaveReelExpressionPayload) => void;
  onOpenAuth: () => void;
  onDailyReelProgressChange: (next: DailyReelProgress) => void;
}

export const WatchHubScreen: React.FC<WatchHubScreenProps> = ({
  initialSubTab = 'videos',
  lessons,
  shorts,
  streakDays,
  savedWords,
  activeProfileId,
  currentUser,
  dailyReelProgress,
  onSelectLesson,
  onOpenImport,
  onDeleteLesson,
  onSelectWord,
  onReviewWord,
  onSaveReelExpression,
  onOpenAuth,
  onDailyReelProgressChange
}) => {
  const [subTab, setSubTab] = useState<'videos' | 'shorts'>(initialSubTab);

  return (
    <div className="space-y-4">
      {/* Slim Sub-Tab Switcher (Eliminates duplicate Home / Listening / Shorts sidebar clutter) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex p-1 rounded-2xl bg-white border border-slate-200/90 shadow-xs">
          <button
            type="button"
            onClick={() => setSubTab('videos')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'videos' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video bài học & Shadowing</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('shorts')}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              subTab === 'shorts' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlaySquare className="w-3.5 h-3.5" />
            <span>Shorts phản xạ (9:16)</span>
          </button>
        </div>
      </div>

      {subTab === 'videos' ? (
        <HomeScreen
          lessons={lessons}
          onSelectLesson={onSelectLesson}
          streakDays={streakDays}
          savedWordsCount={savedWords.length}
          onOpenImport={onOpenImport}
          onDeleteLesson={onDeleteLesson}
        />
      ) : (
        <React.Suspense fallback={<div className="p-10 text-center text-xs font-bold text-slate-500">Đang mở Shorts phản xạ...</div>}>
          <ShortsView
            isActive={true}
            shorts={shorts}
            onSelectWord={onSelectWord}
            onOpenLesson={(lesson) => onSelectLesson(lesson, 'subtitles')}
            savedWords={savedWords}
            lessons={lessons}
            activeProfileId={activeProfileId}
            onImportShortClick={onOpenImport}
            onReviewWord={onReviewWord}
            onSaveReelExpression={onSaveReelExpression}
            currentUser={currentUser}
            onOpenAuth={onOpenAuth}
            dailyReelProgress={dailyReelProgress}
            onDailyReelProgressChange={onDailyReelProgressChange}
          />
        </React.Suspense>
      )}
    </div>
  );
};
