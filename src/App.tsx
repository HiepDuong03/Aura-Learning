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
import { ScopedStorage, PersistedRoleplayMessage } from './services/scopedStorage';
import { loadYouTubeIframeAPI } from './services/youtubeLoader';
import { ProductionErrorBoundary } from './components/Common/ProductionErrorBoundary';
import { LoadingFallback } from './components/Common/LoadingFallback';
import { useNotify } from './components/Common/ToastProvider';

import { VideoStudyRoom } from './components/Player/VideoStudyRoom';
import { ShortsView } from './components/Shorts/ShortsView';
import { VocabularyReview } from './components/Review/VocabularyReview';
import { WordVaultScreen } from './components/Vocabulary/WordVaultScreen';
import { WordGarden } from './components/Garden/WordGarden';
import { RapidSpeakingRoom } from './components/Speaking/RapidSpeakingRoom';
import { ProfileScreen } from './components/Profile/ProfileScreen';
import { ImportVideoModal } from './components/Import/ImportVideoModal';
import { AdminPanelModal } from './components/Admin/AdminPanelModal';

const STORAGE_KEYS = {
  SAVED_WORDS: '4you_saved_words_v2',
  LESSONS: '4you_lessons_v2',
  CUSTOM_LESSONS: '4you_custom_lessons_v1',
  STREAK: '4you_streak_days_v2',
  SCENARIOS: '4you_scenarios_v2',
  LAST_ACTIVE: '4you_last_active_date_v2'
};

export const App: React.FC = () => {
  const { toast } = useNotify();
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [currentLesson, setCurrentLesson] = useState<VideoLesson | null>(null);
  const [currentLessonMode, setCurrentLessonMode] = useState<'subtitles' | 'dictation' | 'shadowing' | 'quiz'>('subtitles');
  const [initialVideoTimestampSec, setInitialVideoTimestampSec] = useState<number | undefined>(undefined);

  const handleSelectLesson = (
    lesson: VideoLesson, 
    mode: 'subtitles' | 'dictation' | 'shadowing' | 'quiz' = 'subtitles',
    startTimestampSec?: number
  ) => {
    const mock = MOCK_LESSONS.find((m) => m.id === lesson.id);
    const freshLesson = mock && (!lesson.subtitles || lesson.subtitles.length < mock.subtitles.length)
      ? { ...lesson, subtitles: mock.subtitles, quizzes: mock.quizzes, duration: mock.duration, durationSec: mock.durationSec }
      : lesson;
    setInitialVideoTimestampSec(
      typeof startTimestampSec === 'number' && Number.isFinite(startTimestampSec) && startTimestampSec >= 0
        ? startTimestampSec
        : undefined
    );
    setCurrentLesson(freshLesson);
    setCurrentLessonMode(mode);
  };

  // Authentication & Session States (Defined first for proper scoped storage resolution)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isBootHydrated, setIsBootHydrated] = useState<boolean>(false);

  // Persistent state with ScopedStorage & Database-per-User isolation
  const [lessons, setLessons] = useState<VideoLesson[]>(() => {
    try {
      const user = authService.getCurrentUser();
      const customList = ScopedStorage.getCustomLessons(user?.id);
      return [...customList, ...MOCK_LESSONS];
    } catch {
      return MOCK_LESSONS;
    }
  });

  const [shorts, setShorts] = useState<VideoLesson[]>(MOCK_SHORTS);

  const [savedWords, setSavedWords] = useState<SavedWord[]>(() => {
    try {
      const user = authService.getCurrentUser();
      const scoped = ScopedStorage.getSavedWords(user?.id);
      if (scoped && scoped.length > 0) {
        return scoped;
      }
      if (!user) {
        const guestTransient = ScopedStorage.getGuestTransientWords();
        if (guestTransient && guestTransient.length > 0) {
          return guestTransient;
        }
      }
      return INITIAL_SAVED_WORDS;
    } catch {
      return INITIAL_SAVED_WORDS;
    }
  });

  const [scenarios, setScenarios] = useState<SpeakingScenario[]>(() => {
    try {
      const user = authService.getCurrentUser();
      const saved = ScopedStorage.getScenarios(user?.id);
      return saved && saved.length > 0 ? saved : SPEAKING_SCENARIOS;
    } catch {
      return SPEAKING_SCENARIOS;
    }
  });

  const [streakDays, setStreakDays] = useState<number>(() => {
    try {
      const user = authService.getCurrentUser();
      return ScopedStorage.getStreakDays(user?.id);
    } catch {
      return 5;
    }
  });

  const [roleplayHistory, setRoleplayHistory] = useState<Record<string, PersistedRoleplayMessage[]>>(() => {
    try {
      const user = authService.getCurrentUser();
      return ScopedStorage.getRoleplayHistory(user?.id);
    } catch {
      return {};
    }
  });

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isImportOpen, setIsImportOpen] = useState<boolean>(false);

  // Anki Multi-Profile States (Anki REA)
  const [profiles, setProfiles] = useState<AnkiUserProfile[]>([DEFAULT_PROFILE]);
  const [activeProfile, setActiveProfile] = useState<AnkiUserProfile>(DEFAULT_PROFILE);
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState<boolean>(false);

  const hydrateCloudAccountData = async (user: AuthUser, token: string, isCancelled?: () => boolean) => {
    const [cloudWords, cloudLessons, cloudState] = await Promise.all([
      ankiDb.syncWithCloud(token, user.id),
      fetch('/api/sync/lessons', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => (r.ok ? r.json() : null))
        .then(d => (d?.lessons as VideoLesson[] | undefined) || [])
        .catch(() => [] as VideoLesson[]),
      fetch('/api/sync/state', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => (r.ok ? r.json() : null))
        .then(d => d?.state || null)
        .catch(() => null)
    ]);
    if (isCancelled?.()) return;

    setSavedWords(cloudWords || []);
    ScopedStorage.setSavedWords(user.id, cloudWords || []);

    const localCustom = await ankiDb.getCustomLessons();
    if (isCancelled?.()) return;
    const mergedCustomMap = new Map<string, VideoLesson>();
    for (const l of [...cloudLessons, ...localCustom]) {
      if (l && l.id && l.title) mergedCustomMap.set(l.id, l);
    }
    const validCustom = Array.from(mergedCustomMap.values());
    setLessons([...validCustom, ...MOCK_LESSONS]);

    if (cloudState && typeof cloudState === 'object') {
      if (Array.isArray(cloudState.scenarios) && cloudState.scenarios.length > 0) {
        setScenarios(cloudState.scenarios);
        ScopedStorage.setScenarios(user.id, cloudState.scenarios);
      }
      if (typeof cloudState.streakDays === 'number' && cloudState.streakDays > 0) {
        setStreakDays(cloudState.streakDays);
        ScopedStorage.setStreakDays(user.id, cloudState.streakDays);
      }
      if (Array.isArray(cloudState.customShorts)) {
        ScopedStorage.setCustomShorts(user.id, cloudState.customShorts);
      }
      if (cloudState.shortsOffsets && typeof cloudState.shortsOffsets === 'object') {
        ScopedStorage.setShortsOffsets(user.id, cloudState.shortsOffsets);
      }
      if (cloudState.roleplayHistory && typeof cloudState.roleplayHistory === 'object') {
        setRoleplayHistory(cloudState.roleplayHistory);
        ScopedStorage.setRoleplayHistory(user.id, cloudState.roleplayHistory);
      }
    }
  };

  const handleAuthSuccess = async (user: AuthUser) => {
    setCurrentUser(user);
    ScopedStorage.clearGuestTransientWords();
    const token = authService.getToken();
    const loadedProfiles = await ankiDb.getProfiles();
    const active = await ankiDb.getActiveProfile();
    setProfiles(loadedProfiles);
    setActiveProfile(active);

    if (token) {
      await hydrateCloudAccountData(user, token);
    } else {
      const words = await ankiDb.getAllWords(user.id);
      setSavedWords(words || []);
      const dbCustom = await ankiDb.getCustomLessons();
      const validCustom = (dbCustom || []).filter(c => Boolean(c && typeof c === 'object' && c.id && c.title));
      setLessons([...validCustom, ...MOCK_LESSONS]);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    const loadedProfiles = await ankiDb.getProfiles();
    const active = await ankiDb.getActiveProfile();
    setProfiles(loadedProfiles);
    setActiveProfile(active);
    const guestWords = await ankiDb.getAllWords();
    setSavedWords(guestWords && guestWords.length > 0 ? guestWords : INITIAL_SAVED_WORDS);
    setLessons(MOCK_LESSONS);
    setScenarios(SPEAKING_SCENARIOS);
    setStreakDays(ScopedStorage.getStreakDays(null));
    setRoleplayHistory(ScopedStorage.getRoleplayHistory(null));
  };

  // Sequential Boot Hydration: prevents race conditions between session verification, IndexedDB init, and cloud sync
  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    const bootstrap = async () => {
      try {
        const cachedUser = authService.getCurrentUser();
        await ankiDb.init(cachedUser?.id);

        const verifiedUser = await authService.verifySession();
        if (cancelled) return;

        const effectiveUser = verifiedUser || null;
        setCurrentUser(effectiveUser);

        const loadedProfiles = await ankiDb.getProfiles();
        const active = await ankiDb.getActiveProfile();
        if (cancelled) return;
        setProfiles(loadedProfiles);
        setActiveProfile(active);

        const token = effectiveUser ? authService.getToken() : null;
        if (effectiveUser && token) {
          await hydrateCloudAccountData(effectiveUser, token, isCancelled);
        } else {
          const dbCustomLessons = await ankiDb.getCustomLessons();
          if (cancelled) return;
          if (dbCustomLessons && dbCustomLessons.length > 0) {
            const validCustom = dbCustomLessons.filter(c => Boolean(c && typeof c === 'object' && c.id && c.title));
            setLessons([...validCustom, ...MOCK_LESSONS]);
          }
          const dbWords = await ankiDb.getAllWords(active.id);
          if (cancelled) return;
          if (dbWords && dbWords.length > 0) {
            const safeWords = dbWords.filter((w): w is SavedWord => Boolean(w && typeof w === 'object' && typeof w.word === 'string' && w.word.trim().length > 0));
            if (safeWords.length > 0) {
              setSavedWords(safeWords);
            }
          }
        }
      } catch (err) {
        console.warn('[Boot] Initialization fallback to ScopedStorage:', err);
      } finally {
        if (!cancelled) {
          setIsBootHydrated(true);
        }
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
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
      toast.error(e instanceof Error ? e.message : 'Lỗi khi xoá hồ sơ.');
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

  // Sync to ScopedStorage, Anki IndexedDB, and Cloud Server (only after boot hydration completes)
  useEffect(() => {
    if (!isBootHydrated) return;
    try {
      ScopedStorage.setSavedWords(currentUser?.id, savedWords);
      ankiDb.saveWords(savedWords, activeProfile.id).catch(() => {});

      const token = authService.getToken();
      if (token && currentUser) {
        const timer = setTimeout(() => {
          ankiDb.syncWithCloud(token, currentUser.id).catch(console.warn);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('Storage sync error', e);
    }
  }, [savedWords, activeProfile.id, currentUser, isBootHydrated]);

  useEffect(() => {
    try {
      const customOnly = lessons.filter(l => Boolean(l && (l.isCustom || (typeof l.id === 'string' && l.id.startsWith('lesson-custom-')))));
      ScopedStorage.setCustomLessons(currentUser?.id, customOnly);
    } catch (e) {
      console.warn('ScopedStorage lessons error', e);
    }
  }, [lessons, currentUser]);

  useEffect(() => {
    try {
      ScopedStorage.setScenarios(currentUser?.id, scenarios);
    } catch (e) {
      console.warn('ScopedStorage scenarios error', e);
    }
  }, [scenarios, currentUser]);

  useEffect(() => {
    try {
      ScopedStorage.setStreakDays(currentUser?.id, streakDays);
    } catch (e) {
      console.warn('ScopedStorage streak error', e);
    }
  }, [streakDays, currentUser]);

  // Cloud State Sync for scenarios, streakDays, profiles, customShorts & shortsOffsets
  useEffect(() => {
    if (!isBootHydrated || !currentUser) return;
    const token = authService.getToken();
    if (!token) return;

    const timer = setTimeout(() => {
      fetch('/api/sync/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          state: {
            scenarios,
            streakDays,
            customShorts: ScopedStorage.getCustomShorts(currentUser.id),
            shortsOffsets: ScopedStorage.getShortsOffsets(currentUser.id),
            roleplayHistory
          }
        })
      }).catch(console.warn);
    }, 1500);
    return () => clearTimeout(timer);
  }, [scenarios, streakDays, roleplayHistory, currentUser, isBootHydrated]);

  // Real-world daily streak tracking based on calendar date
  useEffect(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const streakKey = currentUser ? `4you_u_${currentUser.id}_last_active` : '4you_guest_last_active';
      const lastActive = localStorage.getItem(streakKey);
      if (lastActive) {
        const lastDate = new Date(lastActive);
        const currDate = new Date(today);
        const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          // Exactly 1 day since last login -> Increment continuous streak!
          setStreakDays(prev => prev + 1);
          localStorage.setItem(streakKey, today);
        } else if (diffDays > 1) {
          // Missed more than 1 day -> Reset streak to 1
          setStreakDays(1);
          localStorage.setItem(streakKey, today);
        }
      } else {
        localStorage.setItem(streakKey, today);
      }
    } catch (e) {
      console.warn('Streak error', e);
    }
  }, [currentUser]);

  // Word Lookup Popup State
  const [wordModal, setWordModal] = useState<{
    isOpen: boolean;
    definition: WordDefinition | null;
    contextSentence: string;
    sourceLessonId?: string;
    sourceYoutubeId?: string;
    sourceTimestampSec?: number;
  }>({
    isOpen: false,
    definition: null,
    contextSentence: ''
  });

  // Handle clicking any word or phrase in subtitle, shorts, or garden
  const handleSelectWord = async (
    word: string,
    contextSentence: string = '',
    meta?: { lessonId?: string; youtubeId?: string; timestampSec?: number }
  ) => {
    const trimmed = word.trim();
    if (!trimmed) return;

    const resolvedLessonId = meta?.lessonId ?? currentLesson?.id;
    const resolvedYoutubeId = meta?.youtubeId ?? currentLesson?.youtubeId;
    const resolvedTimestampSec = meta?.timestampSec;

    // 1. Immediately open modal with responsive state (< 0ms UI latency)
    setWordModal({
      isOpen: true,
      definition: {
        word: trimmed,
        phonetic: trimmed.includes(' ') ? '' : `/${trimmed.toLowerCase()}/`,
        partOfSpeech: 'đang tra...',
        translation: 'Đang tải bản dịch...',
        definitionEn: `Đang tra cứu từ điển cho "${trimmed}"...`,
        exampleEn: contextSentence
      },
      contextSentence,
      sourceLessonId: resolvedLessonId,
      sourceYoutubeId: resolvedYoutubeId,
      sourceTimestampSec: resolvedTimestampSec
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
          phonetic: trimmed.includes(' ') ? '' : `/${trimmed.toLowerCase()}/`,
          partOfSpeech: trimmed.includes(' ') ? 'phrase' : 'từ vựng (vocab)',
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
      ankiDb.deleteWord(existing.id, existing.word).catch(console.warn);
    } else {
      const newWord: SavedWord = {
        id: `word-${Date.now()}`,
        word: def.word,
        phonetic: def.phonetic || (def.word.includes(' ') ? '' : `/${def.word}/`),
        partOfSpeech: def.partOfSpeech,
        translation: def.translation,
        definitionEn: def.definitionEn,
        exampleEn: def.exampleEn,
        contextSentence: wordModal.contextSentence,
        videoTitle: currentLesson?.title || 'YouTube Lesson',
        sourceLessonId: wordModal.sourceLessonId ?? currentLesson?.id,
        sourceYoutubeId: wordModal.sourceYoutubeId ?? currentLesson?.youtubeId,
        sourceTimestampSec: wordModal.sourceTimestampSec,
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

      // Track guest transient words for optional migration when registering
      if (!currentUser) {
        ScopedStorage.addGuestTransientWord(newWord);
      }
    }
  };

  // Update translation / context sentence inline from Word Vault
  const handleUpdateWord = (wordId: string, patch: { translation: string; contextSentence: string }) => {
    setSavedWords((prev) =>
      prev.map((w) => {
        if (w.id !== wordId) return w;
        const updated: SavedWord = {
          ...w,
          translation: patch.translation,
          contextSentence: patch.contextSentence,
          usn: (w.usn ?? 0) + 1,
          isDirty: true
        };
        ankiDb.saveWord(updated).catch(console.warn);
        return updated;
      })
    );
  };

  // Bulk delete words with two-way tombstone recording
  const handleBulkDeleteWords = (targets: Array<{ id: string; word: string }>) => {
    if (targets.length === 0) return;
    const idSet = new Set(targets.map((t) => t.id));
    setSavedWords((prev) => prev.filter((w) => !idSet.has(w.id)));
    targets.forEach((t) => {
      ankiDb.deleteWord(t.id, t.word).catch(console.warn);
    });
  };

  // Jump straight back to the source video at the exact saved timestamp
  const handleOpenWordInVideo = (word: SavedWord) => {
    const matchedLesson =
      lessons.find((l) => word.sourceLessonId && l.id === word.sourceLessonId) ||
      lessons.find((l) => word.sourceYoutubeId && l.youtubeId === word.sourceYoutubeId) ||
      shorts.find((s) => word.sourceLessonId && s.id === word.sourceLessonId) ||
      shorts.find((s) => word.sourceYoutubeId && s.youtubeId === word.sourceYoutubeId);

    if (matchedLesson) {
      handleSelectLesson(matchedLesson, 'subtitles', word.sourceTimestampSec);
      return;
    }

    if (word.sourceYoutubeId) {
      const startSec = typeof word.sourceTimestampSec === 'number' ? Math.max(0, word.sourceTimestampSec) : 0;
      const fallbackLesson: VideoLesson = {
        id: word.sourceLessonId || `replay-${word.sourceYoutubeId}`,
        youtubeId: word.sourceYoutubeId,
        title: word.videoTitle || 'Video nguồn từ vựng',
        channel: 'YouTube Replay',
        thumbnail: `https://img.youtube.com/vi/${word.sourceYoutubeId}/hqdefault.jpg`,
        level: 'B1',
        topic: 'Vocabulary Context',
        duration: '05:00',
        durationSec: 300,
        views: '1',
        description: 'Mở lại trực tiếp ngữ cảnh video của thẻ từ vựng.',
        subtitles: [
          {
            id: 'ctx-1',
            start: startSec,
            end: startSec + 6,
            text: word.contextSentence || word.word,
            translation: word.translation
          }
        ],
        quizzes: []
      };
      handleSelectLesson(fallbackLesson, 'subtitles', startSec);
      return;
    }

    toast.info('Từ vựng này chưa có thông tin video gốc để tua lại.');
  };

  // Anki SM-2 Review execution & revlog audit recording (BR-13)
  const handleReviewWord = (wordId: string, rating: AnkiRating) => {
    setSavedWords((prev) =>
      prev.map((w) => {
        if (w.id !== wordId) return w;
        const res = calculateAnkiSchedule(w, rating);

        // Record immutable audit entry into Anki revlog & sync to cloud if signed in
        const reviewPayload = {
          wordId: w.id,
          word: w.word,
          rating,
          interval: res.newInterval,
          lastInterval: w.interval || 0,
          easeFactor: res.newEaseFactor,
          reviewedAt: Date.now()
        };
        ankiDb.recordReview(reviewPayload).catch(console.warn);
        const token = authService.getToken();
        if (token && currentUser) {
          fetch('/api/sync/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ review: reviewPayload })
          }).catch(console.warn);
        }

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
    const token = authService.getToken();
    if (token && currentUser) {
      try {
        const res = await fetch('/api/sync/lessons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lessons: [taggedLesson] })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          toast.error(errData.error || 'Không thể đồng bộ bài học mới.');
          return;
        }
      } catch (e) {
        console.warn('[Sync] Cloud lesson sync warning, saved locally:', e);
      }
    }
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
      const token = authService.getToken();
      if (token && currentUser) {
        fetch('/api/sync/lessons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ lessons: [], deletedLessonIds: [lessonId] })
        }).catch(console.warn);
      }
    } catch (e) {
      console.warn('[Storage] Error deleting custom lesson:', e);
    }
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  };

  // Filter lessons based on search query with strict null safety (Hook must run unconditionally before any early return - React Error #300 fix)
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
            onBack={() => {
              setCurrentLesson(null);
              setInitialVideoTimestampSec(undefined);
            }}
            onSelectWord={handleSelectWord}
            onUpdateLesson={(updated) => {
              setCurrentLesson(updated);
              setLessons((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
              if (updated.isCustom || (typeof updated.id === 'string' && updated.id.startsWith('lesson-custom-'))) {
                ankiDb.saveCustomLesson(updated).catch(() => {});
              }
            }}
            initialMode={currentLessonMode}
            isWordModalOpen={wordModal.isOpen}
            initialTimestampSec={initialVideoTimestampSec}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />

          <WordPopupModal
            isOpen={wordModal.isOpen}
            definition={wordModal.definition}
            contextSentence={wordModal.contextSentence}
            videoTitle={currentLesson.title}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            isSaved={Boolean(
              wordModal.definition?.word &&
              savedWords.some((w) => w?.word && w.word.toLowerCase().trim() === wordModal.definition?.word?.toLowerCase().trim())
            )}
            onClose={() => setWordModal((prev) => ({ ...prev, isOpen: false }))}
            onSaveWord={handleSaveWord}
          />

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={handleAuthSuccess}
            guestWordsToMigrate={currentUser ? [] : ScopedStorage.getGuestTransientWords()}
          />
        </div>
      </ProductionErrorBoundary>
    );
  }

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
        currentUser={currentUser}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
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
          onOpenAdmin={() => setIsAdminModalOpen(true)}
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
              <ProductionErrorBoundary componentName="Kho từ vựng" onGoHome={() => setActiveTab('home')}>
                <WordVaultScreen
                  savedWords={savedWords}
                  onUpdateWord={handleUpdateWord}
                  onBulkDeleteWords={handleBulkDeleteWords}
                  onOpenWordInVideo={handleOpenWordInVideo}
                  onNavigateToReview={() => setActiveTab('review')}
                />
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
                  currentUser={currentUser}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                  onRoleplayHistoryChange={(history) => setRoleplayHistory(history)}
                />
              </ProductionErrorBoundary>
            )}

            {activeTab === 'review' && (
              <ProductionErrorBoundary componentName="Ôn tập Anki" onGoHome={() => setActiveTab('home')}>
                <VocabularyReview
                  savedWords={savedWords}
                  onReviewWord={handleReviewWord}
                  onOpenWordInVideo={handleOpenWordInVideo}
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
                  currentUser={currentUser}
                  onResetProgress={() => {
                    setSavedWords(INITIAL_SAVED_WORDS);
                    setLessons(MOCK_LESSONS);
                    setStreakDays(1);
                    ScopedStorage.setSavedWords(currentUser?.id, INITIAL_SAVED_WORDS);
                    ScopedStorage.setCustomLessons(currentUser?.id, []);
                    ScopedStorage.setStreakDays(currentUser?.id, 1);
                    ScopedStorage.clearGuestTransientWords();
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
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
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
            currentUser={currentUser}
            customLessonsCount={lessons.filter(l => Boolean(l && (l.isCustom || (typeof l.id === 'string' && l.id.startsWith('lesson-custom-'))))).length}
            onOpenAuth={() => setIsAuthModalOpen(true)}
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
        guestWordsToMigrate={currentUser ? [] : ScopedStorage.getGuestTransientWords()}
      />

      {/* Admin RBAC Management Panel */}
      <AdminPanelModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </div>
  );
};

export default App;
