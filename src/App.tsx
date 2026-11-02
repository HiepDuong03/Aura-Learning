import React, { useState, useEffect, useMemo } from 'react';
import { VideoLesson, SavedWord, WordDefinition, AnkiRating, AnkiUserProfile, AuthUser } from './types';
import { MOCK_LESSONS, MOCK_SHORTS, INITIAL_SAVED_WORDS } from './data/mockLessons';
import { calculateAnkiSchedule } from './services/ankiScheduler';
import { Sidebar, ActiveTab } from './components/Navigation/Sidebar';
import { Header } from './components/Navigation/Header';
import { MobileNav } from './components/Navigation/MobileNav';
import { HomeScreen } from './components/Home/HomeScreen';
import { WordPopupModal } from './components/WordLookup/WordPopupModal';
import { ProfileSwitcherModal } from './components/Navigation/ProfileSwitcherModal';
import { AuthModal } from './components/Auth/AuthModal';
import { SPEAKING_SCENARIOS, SpeakingScenario } from './data/speakingScenarios';
import { lookupWord } from './services/dictionaryService';
import { ankiDb, DEFAULT_PROFILE } from './services/ankiDatabase';
import { authService } from './services/authService';
import { loadYouTubeIframeAPI } from './services/youtubeLoader';
import { ProductionErrorBoundary } from './components/Common/ProductionErrorBoundary';
import { LoadingFallback } from './components/Common/LoadingFallback';
import { BookOpen } from 'lucide-react';

import { VideoStudyRoom } from './components/Player/VideoStudyRoom';
import { ShortsView } from './components/Shorts/ShortsView';

// Code-Splitting: Lazy load secondary screen chunks for fast initial paint (<120kB)
const VocabularyReview = React.lazy(() => import('./components/Review/VocabularyReview').then(m => ({ default: m.VocabularyReview })));
const WordGarden = React.lazy(() => import('./components/Garden/WordGarden').then(m => ({ default: m.WordGarden })));
const RapidSpeakingRoom = React.lazy(() => import('./components/Speaking/RapidSpeakingRoom').then(m => ({ default: m.RapidSpeakingRoom })));
const ProfileScreen = React.lazy(() => import('./components/Profile/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const ImportVideoModal = React.lazy(() => import('./components/Import/ImportVideoModal').then(m => ({ default: m.ImportVideoModal })));

const STORAGE_KEYS = {
  SAVED_WORDS: '4you_saved_words_v2',
  LESSONS: '4you_lessons_v2',
  CUSTOM_LESSONS: '4you_custom_lessons_v1',
  STREAK: '4you_streak_days_v2',
  SCENARIOS: '4you_scenarios_v2',
  LAST_ACTIVE: '4you_last_active_date_v2'
};

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [currentLesson, setCurrentLesson] = useState<VideoLesson | null>(null);
  const [currentLessonMode, setCurrentLessonMode] = useState<'subtitles' | 'dictation' | 'shadowing' | 'quiz'>('subtitles');

  const handleSelectLesson = (
    lesson: VideoLesson, 
    mode: 'subtitles' | 'dictation' | 'shadowing' | 'quiz' = 'subtitles'
  ) => {
    const mock = MOCK_LESSONS.find((m) => m.id === lesson.id);
    const freshLesson = mock && (!lesson.subtitles || lesson.subtitles.length < mock.subtitles.length)
      ? { ...lesson, subtitles: mock.subtitles, quizzes: mock.quizzes, duration: mock.duration, durationSec: mock.durationSec }
      : lesson;
    setCurrentLesson(freshLesson);
    setCurrentLessonMode(mode);
  };

  // Persistent state with localStorage & IndexedDB backup
  const [lessons, setLessons] = useState<VideoLesson[]>(() => {
    try {
      // 1. Try to load user-imported custom lessons from dedicated key
      const savedCustom = localStorage.getItem(STORAGE_KEYS.CUSTOM_LESSONS);
      let customList: VideoLesson[] = [];
      if (savedCustom) {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed)) {
          customList = parsed.filter((p): p is VideoLesson => Boolean(p && typeof p === 'object' && p.id && p.title));
        }
      } else {
        const saved = localStorage.getItem(STORAGE_KEYS.LESSONS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            customList = parsed.filter((p): p is VideoLesson => Boolean(p && typeof p === 'object' && p.id && (p.isCustom || (typeof p.id === 'string' && p.id.startsWith('lesson-custom-')))));
          }
        }
      }
      return [...customList, ...MOCK_LESSONS];
    } catch {
      return MOCK_LESSONS;
    }
  });

  const [shorts, setShorts] = useState<VideoLesson[]>(MOCK_SHORTS);

  const [savedWords, setSavedWords] = useState<SavedWord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SAVED_WORDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((w): w is SavedWord => Boolean(w && typeof w === 'object' && typeof w.word === 'string' && w.word.trim().length > 0));
        }
      }
      return INITIAL_SAVED_WORDS;
    } catch {
      return INITIAL_SAVED_WORDS;
    }
  });

  const [scenarios, setScenarios] = useState<SpeakingScenario[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCENARIOS);
      return saved ? JSON.parse(saved) : SPEAKING_SCENARIOS;
    } catch {
      return SPEAKING_SCENARIOS;
    }
  });

  const [streakDays, setStreakDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STREAK);
      return saved ? parseInt(saved, 10) : 5;
    } catch {
      return 5;
    }
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  // Authentication & Session States
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Anki Multi-Profile States (Anki REA)
  const [profiles, setProfiles] = useState<AnkiUserProfile[]>([DEFAULT_PROFILE]);
  const [activeProfile, setActiveProfile] = useState<AnkiUserProfile>(DEFAULT_PROFILE);
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState<boolean>(false);

  const handleAuthSuccess = async (user: AuthUser) => {
    setCurrentUser(user);
    const loadedProfiles = await ankiDb.getProfiles();
    const active = await ankiDb.getActiveProfile();
    setProfiles(loadedProfiles);
    setActiveProfile(active);
    const words = await ankiDb.getAllWords(active.id);
    setSavedWords(words);
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    const loadedProfiles = await ankiDb.getProfiles();
    const active = await ankiDb.getActiveProfile();
    setProfiles(loadedProfiles);
    setActiveProfile(active);
    const words = await ankiDb.getAllWords(active.id);
    setSavedWords(words);
  };

  // Initialize Anki Local-First Database on boot with active profile & persistent custom lessons
  useEffect(() => {
    ankiDb.init()
      .then(async () => {
        const loadedProfiles = await ankiDb.getProfiles();
        const active = await ankiDb.getActiveProfile();
        setProfiles(loadedProfiles);
        setActiveProfile(active);

        // Load custom user-imported lessons from persistent IndexedDB
        const dbCustomLessons = await ankiDb.getCustomLessons();
        if (dbCustomLessons && dbCustomLessons.length > 0) {
          setLessons((prev) => {
            const validCustom = dbCustomLessons.filter(c => Boolean(c && typeof c === 'object' && c.id && c.title));
            const customIds = new Set(validCustom.map(c => c.id));
            const nonCustomPrev = (prev || []).filter(l => Boolean(l && l.id && !customIds.has(l.id) && !MOCK_LESSONS.some(m => m && m.id === l.id)));
            return [...validCustom, ...nonCustomPrev, ...MOCK_LESSONS];
          });
        }

        return ankiDb.getAllWords(active.id);
      })
      .then((dbWords) => {
        if (dbWords && dbWords.length > 0) {
          const safeWords = dbWords.filter((w): w is SavedWord => Boolean(w && typeof w === 'object' && typeof w.word === 'string' && w.word.trim().length > 0));
          if (safeWords.length > 0) {
            setSavedWords(safeWords);
          }
        }
      })
      .catch((err) => {
        console.warn('[AnkiDB] Boot initialization fallback to localStorage:', err);
      });
  }, []);

  // Pre-warm YouTube Iframe API in background during idle time for instant 0ms startup
  useEffect(() => {
    const idleId = typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (window as any).requestIdleCallback(() => loadYouTubeIframeAPI().catch(() => {}))
      : setTimeout(() => loadYouTubeIframeAPI().catch(() => {}), 1200);

    return () => {
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && typeof idleId === 'number') {
        (window as any).cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId as any);
      }
    };
  }, []);

  // Anki Profile Switcher Handlers
  const handleSwitchProfile = async (profileId: string) => {
    try {
      const active = await ankiDb.setActiveProfile(profileId);
      setActiveProfile(active);
      const words = await ankiDb.getAllWords(profileId);
      setSavedWords(words);
      setIsProfileSwitcherOpen(false);
    } catch (e) {
      console.warn('[AnkiProfile] Switch error:', e);
    }
  };

  const handleCreateProfile = async (name: string) => {
    try {
      const newProf = await ankiDb.createProfile(name);
      await ankiDb.setActiveProfile(newProf.id);
      const all = await ankiDb.getProfiles();
      setProfiles(all);
      setActiveProfile(newProf);
      setSavedWords([]);
      setIsProfileSwitcherOpen(false);
    } catch (e) {
      console.warn('[AnkiProfile] Create error:', e);
    }
  };

  const handleDeleteProfile = async (profileId: string) => {
    try {
      await ankiDb.deleteProfile(profileId);
      const all = await ankiDb.getProfiles();
      const active = await ankiDb.getActiveProfile();
      setProfiles(all);
      setActiveProfile(active);
      const words = await ankiDb.getAllWords(active.id);
      setSavedWords(words);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Lỗi khi xoá hồ sơ.');
    }
  };

  const handleUpdateAccountEmail = async (profileId: string, email: string) => {
    try {
      const prof = profiles.find(p => p.id === profileId);
      if (prof) {
        const updated: AnkiUserProfile = {
          ...prof,
          cloudAccount: {
            email,
            isLinked: true,
            lastSyncedAt: Date.now()
          }
        };
        await ankiDb.updateProfile(updated);
        const all = await ankiDb.getProfiles();
        setProfiles(all);
        if (activeProfile.id === profileId) {
          setActiveProfile(updated);
        }
      }
    } catch (e) {
      console.warn('[AnkiProfile] Update email error:', e);
    }
  };

  // Sync to localStorage and Anki IndexedDB
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_WORDS, JSON.stringify(savedWords));
      ankiDb.saveWords(savedWords, activeProfile.id).catch(() => {});
    } catch (e) {
      console.warn('Storage sync error', e);
    }
  }, [savedWords, activeProfile.id]);

  useEffect(() => {
    try {
      const customOnly = lessons.filter(l => Boolean(l && (l.isCustom || (typeof l.id === 'string' && l.id.startsWith('lesson-custom-')))));
      localStorage.setItem(STORAGE_KEYS.CUSTOM_LESSONS, JSON.stringify(customOnly));
      localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons));
    } catch (e) {
      console.warn('localStorage error', e);
    }
  }, [lessons]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(scenarios));
    } catch (e) {
      console.warn('localStorage error', e);
    }
  }, [scenarios]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.STREAK, streakDays.toString());
    } catch (e) {
      console.warn('localStorage error', e);
    }
  }, [streakDays]);

  // Real-world daily streak tracking based on calendar date
  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastActive = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVE);
      if (lastActive) {
        const lastDate = new Date(lastActive);
        const currDate = new Date(today);
        const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          // Exactly 1 day since last login -> Increment continuous streak!
          setStreakDays(prev => prev + 1);
          localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, today);
        } else if (diffDays > 1) {
          // Missed more than 1 day -> Reset streak to 1
          setStreakDays(1);
          localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, today);
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.LAST_ACTIVE, today);
      }
    } catch (e) {
      console.warn('Streak error', e);
    }
  }, []);

  // Word Lookup Popup State
  const [wordModal, setWordModal] = useState<{
    isOpen: boolean;
    definition: WordDefinition | null;
    contextSentence: string;
  }>({
    isOpen: false,
    definition: null,
    contextSentence: ''
  });

  // Handle clicking any word in subtitle or garden
  const handleSelectWord = async (word: string, contextSentence: string = '') => {
    const trimmed = word.trim();
    if (!trimmed) return;

    // 1. Immediately open modal with responsive state (< 0ms UI latency)
    setWordModal({
      isOpen: true,
      definition: {
        word: trimmed,
        phonetic: `/${trimmed.toLowerCase()}/`,
        partOfSpeech: 'đang tra...',
        translation: 'Đang tải bản dịch...',
        definitionEn: `Đang tra cứu từ điển cho "${trimmed}"...`,
        exampleEn: contextSentence
      },
      contextSentence
    });

    try {
      const def = await lookupWord(trimmed);
      setWordModal((prev) => ({
        ...prev,
        isOpen: true,
        definition: def
      }));
    } catch (e) {
      console.error('Lookup failed, using fallback', e);
      setWordModal((prev) => ({
        ...prev,
        isOpen: true,
        definition: {
          word: trimmed,
          phonetic: `/${trimmed.toLowerCase()}/`,
          partOfSpeech: 'từ vựng (vocab)',
          translation: trimmed,
          definitionEn: `Từ vựng trong bài học: "${trimmed}"`,
          exampleEn: contextSentence
        }
      }));
    }
  };

  // Handle bookmarking word to flashcards
  const handleSaveWord = (def: WordDefinition) => {
    if (!def || !def.word) return;
    const cleanDefWord = def.word.toLowerCase().trim();
    const existing = savedWords.find((w) => w?.word && w.word.toLowerCase().trim() === cleanDefWord);
    if (existing) {
      setSavedWords((prev) => prev.filter((w) => w.id !== existing.id));
      ankiDb.deleteWord(existing.id).catch(console.warn);
    } else {
      const newWord: SavedWord = {
        id: `word-${Date.now()}`,
        word: def.word,
        phonetic: def.phonetic || `/${def.word}/`,
        partOfSpeech: def.partOfSpeech,
        translation: def.translation,
        definitionEn: def.definitionEn,
        exampleEn: def.exampleEn,
        contextSentence: wordModal.contextSentence,
        videoTitle: currentLesson?.title || 'YouTube Lesson',
        savedAt: Date.now(),
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        lapses: 0,
        state: 'new',
        dueAt: Date.now(),
        lastReviewedAt: Date.now(),
        usn: 1,
        isDirty: true
      };
      setSavedWords((prev) => [newWord, ...prev]);
      ankiDb.saveWord(newWord).catch(console.warn);
    }
  };

  // Anki SM-2 Review execution & revlog audit recording (BR-13)
  const handleReviewWord = (wordId: string, rating: AnkiRating) => {
    setSavedWords((prev) =>
      prev.map((w) => {
        if (w.id !== wordId) return w;
        const res = calculateAnkiSchedule(w, rating);

        // Record immutable audit entry into Anki revlog
        ankiDb.recordReview({
          wordId: w.id,
          word: w.word,
          rating,
          interval: res.newInterval,
          lastInterval: w.interval || 0,
          easeFactor: res.newEaseFactor,
          reviewedAt: Date.now()
        }).catch(console.warn);

        return {
          ...w,
          easeFactor: res.newEaseFactor,
          interval: res.newInterval,
          repetitions: res.newRepetitions,
          lapses: res.newLapses,
          state: res.newState,
          dueAt: res.dueAt,
          lastReviewedAt: Date.now(),
          usn: (w.usn ?? 0) + 1,
          isDirty: true
        };
      })
    );
  };

  const handleImportLesson = async (newLesson: VideoLesson) => {
    const taggedLesson: VideoLesson = {
      ...newLesson,
      isCustom: true,
      createdAt: newLesson.createdAt || Date.now(),
    };
    try {
      await ankiDb.saveCustomLesson(taggedLesson);
    } catch (e) {
      console.warn('[Storage] Error persisting imported lesson to IndexedDB:', e);
    }
    setLessons((prev) => [taggedLesson, ...prev.filter((l) => l.id !== taggedLesson.id)]);
    handleSelectLesson(taggedLesson, 'subtitles');
  };

  const handleDeleteLesson = async (lessonId: string) => {
    try {
      await ankiDb.deleteCustomLesson(lessonId);
    } catch (e) {
      console.warn('[Storage] Error deleting custom lesson:', e);
    }
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  // If currently studying a video lesson
  if (currentLesson) {
    return (
      <ProductionErrorBoundary
        componentName="Phòng học Video (Study Room)"
        onReset={() => setCurrentLesson(null)}
        onGoHome={() => setCurrentLesson(null)}
      >
        <div className="min-h-screen bg-slate-50 font-['Plus_Jakarta_Sans',sans-serif]">
          <VideoStudyRoom
            lesson={currentLesson}
            onBack={() => setCurrentLesson(null)}
            onSelectWord={handleSelectWord}
            onUpdateLesson={(updated) => {
              setCurrentLesson(updated);
              setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
              if (updated.isCustom || (typeof updated.id === 'string' && updated.id.startsWith('lesson-custom-'))) {
                ankiDb.saveCustomLesson(updated).catch(() => {});
              }
            }}
            initialMode={currentLessonMode}
          />

          <WordPopupModal
            isOpen={wordModal.isOpen}
            definition={wordModal.definition}
            contextSentence={wordModal.contextSentence}
            isSaved={Boolean(
              wordModal.definition?.word &&
              savedWords.some((w) => w?.word && w.word.toLowerCase().trim() === wordModal.definition?.word?.toLowerCase().trim())
            )}
            onClose={() => setWordModal((prev) => ({ ...prev, isOpen: false }))}
            onSaveWord={handleSaveWord}
          />
        </div>
      </ProductionErrorBoundary>
    );
  }

  // Filter lessons based on search query with strict null safety
  const searchedLessons = useMemo(() => {
    const q = (searchQuery || '').toLowerCase().trim();
    return (lessons || []).filter((l): l is VideoLesson => {
      if (!l || typeof l !== 'object') return false;
      if (!q) return true;
      const title = (l.title || '').toLowerCase();
      const topic = (l.topic || '').toLowerCase();
      const channel = (l.channel || '').toLowerCase();
      return title.includes(q) || topic.includes(q) || channel.includes(q);
    });
  }, [lessons, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setCurrentLesson(null);
        }}
        savedWordsCount={savedWords.length}
        streakDays={streakDays}
      />

      {/* Main Content Area (offset by sidebar on desktop) */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenImport={() => setIsImportOpen(true)}
          streakDays={streakDays}
          activeProfile={activeProfile}
          currentUser={currentUser}
          onOpenProfileSwitcher={() => setIsProfileSwitcherOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onLogout={handleLogout}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full pb-24 lg:pb-12">
          <React.Suspense fallback={<LoadingFallback />}>
            {activeTab === 'home' && (
              <ProductionErrorBoundary componentName="Trang chủ" onGoHome={() => setActiveTab('home')}>
                <HomeScreen
                  lessons={searchedLessons}
                  onSelectLesson={handleSelectLesson}
                  streakDays={streakDays}
                  savedWordsCount={savedWords.length}
                  onOpenImport={() => setIsImportOpen(true)}
                  onDeleteLesson={handleDeleteLesson}
                />
              </ProductionErrorBoundary>
            )}

            {activeTab === 'shorts' && (
              <ProductionErrorBoundary componentName="Shorts Video & YouGlish" onGoHome={() => setActiveTab('home')}>
                <ShortsView
                  isActive={true}
                  shorts={shorts}
                  onSelectWord={handleSelectWord}
                  onOpenLesson={(lesson) => handleSelectLesson(lesson, 'subtitles')}
                  savedWords={savedWords}
                  lessons={lessons}
                  activeProfileId={activeProfile.id}
                  onImportShortClick={() => setIsImportOpen(true)}
                />
              </ProductionErrorBoundary>
            )}

            {activeTab === 'words' && (
              <ProductionErrorBoundary componentName="Sổ tay từ vựng" onGoHome={() => setActiveTab('home')}>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-amber-500" /> Sổ Tay Từ Vựng ({savedWords.length} từ)
                      </h1>
                      <p className="text-xs font-semibold text-slate-500 mt-1">
                        Toàn bộ từ vựng bạn đã tra và lưu trong các bài học video
                      </p>
                    </div>
                  </div>

                  <VocabularyReview
                    savedWords={savedWords}
                    onReviewWord={handleReviewWord}
                  />
                </div>
              </ProductionErrorBoundary>
            )}

            {activeTab === 'listening' && (
              <ProductionErrorBoundary componentName="Listening Hub" onGoHome={() => setActiveTab('home')}>
                <HomeScreen
                  lessons={lessons}
                  onSelectLesson={handleSelectLesson}
                  streakDays={streakDays}
                  savedWordsCount={savedWords.length}
                  isListeningHub={true}
                  onOpenImport={() => setIsImportOpen(true)}
                  onDeleteLesson={handleDeleteLesson}
                />
              </ProductionErrorBoundary>
            )}

            {activeTab === 'speaking' && (
              <ProductionErrorBoundary componentName="Luyện Nói AI" onGoHome={() => setActiveTab('home')}>
                <RapidSpeakingRoom
                  scenarios={scenarios}
                  onBack={() => setActiveTab('home')}
                  onAddCustomScenario={(sc) => setScenarios((prev) => [sc, ...prev])}
                />
              </ProductionErrorBoundary>
            )}

            {activeTab === 'review' && (
              <ProductionErrorBoundary componentName="Ôn tập Anki" onGoHome={() => setActiveTab('home')}>
                <VocabularyReview
                  savedWords={savedWords}
                  onReviewWord={handleReviewWord}
                />
              </ProductionErrorBoundary>
            )}

            {activeTab === 'garden' && (
              <ProductionErrorBoundary componentName="Khu Vườn Từ Vựng" onGoHome={() => setActiveTab('home')}>
                <WordGarden
                  savedWords={savedWords}
                  streakDays={streakDays}
                  onNavigateToReview={() => setActiveTab('review')}
                  onSelectWord={handleSelectWord}
                />
              </ProductionErrorBoundary>
            )}

            {activeTab === 'profile' && (
              <ProductionErrorBoundary componentName="Hồ Sơ Học Tập" onGoHome={() => setActiveTab('home')}>
                <ProfileScreen
                  savedWords={savedWords}
                  streakDays={streakDays}
                  onResetProgress={() => {
                    setSavedWords(INITIAL_SAVED_WORDS);
                    setLessons(MOCK_LESSONS);
                    setStreakDays(1);
                    localStorage.clear();
                    ankiDb.saveWords(INITIAL_SAVED_WORDS).catch(console.warn);
                  }}
                  onImportWords={(imported) => {
                    setSavedWords(imported);
                  }}
                />
              </ProductionErrorBoundary>
            )}
          </React.Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setCurrentLesson(null);
        }}
        savedWordsCount={savedWords.length}
      />

      {/* Global Modals */}
      <WordPopupModal
        isOpen={wordModal.isOpen}
        definition={wordModal.definition}
        contextSentence={wordModal.contextSentence}
        isSaved={Boolean(
          wordModal.definition?.word &&
          savedWords.some((w) => w?.word && w.word.toLowerCase().trim() === wordModal.definition?.word?.toLowerCase().trim())
        )}
        onClose={() => setWordModal((prev) => ({ ...prev, isOpen: false }))}
        onSaveWord={handleSaveWord}
      />

      {isImportOpen && (
        <React.Suspense fallback={null}>
          <ImportVideoModal
            isOpen={isImportOpen}
            onClose={() => setIsImportOpen(false)}
            onImportLesson={handleImportLesson}
          />
        </React.Suspense>
      )}

      {/* Anki Profile Switcher Modal */}
      <ProfileSwitcherModal
        isOpen={isProfileSwitcherOpen}
        onClose={() => setIsProfileSwitcherOpen(false)}
        profiles={profiles}
        activeProfileId={activeProfile.id}
        onSwitchProfile={handleSwitchProfile}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
        onUpdateAccountEmail={handleUpdateAccountEmail}
      />

      {/* Authentication Modal (Register / Login) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};

export default App;
