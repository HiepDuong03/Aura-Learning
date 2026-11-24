import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  VideoLesson,
  SavedWord,
  WordDefinition,
  AnkiRating,
  AnkiUserProfile,
  AuthUser,
  DailyReelProgress,
  CurriculumProgressState,
  ActivePracticeMission
} from './types';
import { INITIAL_SAVED_WORDS } from './data/initialSavedWords';
import { calculateFsrsSchedule } from './services/fsrsScheduler';
import { lingqWordService } from './services/lingqWordService';
import { Sidebar, ActiveTab } from './components/Navigation/Sidebar';
import { Header } from './components/Navigation/Header';
import { MobileNav } from './components/Navigation/MobileNav';
import { WordPopupModal } from './components/WordLookup/WordPopupModal';
import { ProfileSwitcherModal } from './components/Navigation/ProfileSwitcherModal';
import { AuthModal } from './components/Auth/AuthModal';
import { SPEAKING_SCENARIOS, SpeakingScenario } from './data/speakingScenarios';
import { lookupWord } from './services/dictionaryService';
import { ankiDb, DEFAULT_PROFILE } from './services/ankiDatabase';
import { authService } from './services/authService';
import { ScopedStorage, PersistedRoleplayMessage, getLocalDateKey } from './services/scopedStorage';
import { ScenarioCompletionRecord } from './utils/speakingMetrics';
import { createEmptyCurriculumProgress, normalizeCurriculumProgress } from './utils/curriculumEngine';
import { loadYouTubeIframeAPI } from './services/youtubeLoader';
import { ProductionErrorBoundary } from './components/Common/ProductionErrorBoundary';
import { LoadingFallback } from './components/Common/LoadingFallback';
import { useNotify } from './components/Common/ToastProvider';

const VideoStudyRoom = React.lazy(() => import('./components/Player/VideoStudyRoom').then((m) => ({ default: m.VideoStudyRoom })));
const RoadmapScreen = React.lazy(() => import('./components/Roadmap/RoadmapScreen').then((m) => ({ default: m.RoadmapScreen })));
const WatchHubScreen = React.lazy(() => import('./components/Hubs/WatchHubScreen').then((m) => ({ default: m.WatchHubScreen })));
const MemoryHubScreen = React.lazy(() => import('./components/Hubs/MemoryHubScreen').then((m) => ({ default: m.MemoryHubScreen })));
const RapidSpeakingRoom = React.lazy(() => import('./components/Speaking/RapidSpeakingRoom').then((m) => ({ default: m.RapidSpeakingRoom })));
const ProfileScreen = React.lazy(() => import('./components/Profile/ProfileScreen').then((m) => ({ default: m.ProfileScreen })));
const ImportVideoModal = React.lazy(() => import('./components/Import/ImportVideoModal').then((m) => ({ default: m.ImportVideoModal })));
const AdminPanelModal = React.lazy(() => import('./components/Admin/AdminPanelModal').then((m) => ({ default: m.AdminPanelModal })));

export const App: React.FC = () => {
  const { toast } = useNotify();
  const [activeTab, setActiveTab] = useState<ActiveTab>('roadmap');
  const [currentLesson, setCurrentLesson] = useState<VideoLesson | null>(null);
  const [currentLessonMode, setCurrentLessonMode] = useState<'subtitles' | 'dictation' | 'shadowing' | 'quiz'>('subtitles');
  const [initialVideoTimestampSec, setInitialVideoTimestampSec] = useState<number | undefined>(undefined);

  const mockLessonsRef = useRef<VideoLesson[]>([]);

  const handleSelectLesson = (
    lesson: VideoLesson, 
    mode: 'subtitles' | 'dictation' | 'shadowing' | 'quiz' = 'subtitles',
    startTimestampSec?: number
  ) => {
    const mock = mockLessonsRef.current.find((m) => m.id === lesson.id);
    const freshLesson = mock && (!lesson.subtitles || lesson.subtitles.length < mock.subtitles.length)
      ? { ...lesson, subtitles: mock.subtitles, quizzes: mock.quizzes, duration: mock.duration, durationSec: mock.durationSec }
      : lesson;
    React.startTransition(() => {
      setInitialVideoTimestampSec(
        typeof startTimestampSec === 'number' && Number.isFinite(startTimestampSec) && startTimestampSec >= 0
          ? startTimestampSec
          : undefined
      );
      setCurrentLesson(freshLesson);
      setCurrentLessonMode(mode);
    });
  };

  // Authentication & Session States (Defined first for proper scoped storage resolution)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [isBootHydrated, setIsBootHydrated] = useState<boolean>(false);
  // Synchronous lock preventing guest state from writing into a newly signed-in/out account partition
  const isAccountSwitchingRef = useRef<boolean>(false);

  // Persistent state with ScopedStorage & Database-per-User isolation
  const [lessons, setLessons] = useState<VideoLesson[]>(() => {
    try {
      const user = authService.getCurrentUser();
      const customList = ScopedStorage.getCustomLessons(user?.id);
      return [...customList];
    } catch {
      return [];
    }
  });

  const [shorts, setShorts] = useState<VideoLesson[]>([]);

  // Lazy-load 200KB static video catalog out of the initial main bundle
  useEffect(() => {
    let active = true;
    import('./data/mockLessons')
      .then((mod) => {
        if (!active) return;
        mockLessonsRef.current = mod.MOCK_LESSONS;
        setShorts(mod.MOCK_SHORTS);
        setLessons((prev) => {
          const existingIds = new Set(prev.map((l) => l.id));
          const additions = mod.MOCK_LESSONS.filter((m) => !existingIds.has(m.id));
          return additions.length > 0 ? [...prev, ...additions] : prev;
        });
      })
      .catch((err) => {
        console.warn('[App] Failed to lazy-load mockLessons:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const [savedWords, setSavedWords] = useState<SavedWord[]>(() => {
    try {
      const user = authService.getCurrentUser();
      const scoped = ScopedStorage.getSavedWords(user?.id);
      // Authenticated accounts ALWAYS own their exact vault (empty [] if none saved yet — NEVER mock words)
      if (user) {
        return scoped;
      }
      if (scoped && scoped.length > 0) {
        return scoped;
      }
      const guestTransient = ScopedStorage.getGuestTransientWords();
      if (guestTransient && guestTransient.length > 0) {
        return guestTransient;
      }
      return INITIAL_SAVED_WORDS;
    } catch {
      return authService.getCurrentUser() ? [] : INITIAL_SAVED_WORDS;
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
      return 1;
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

  const [completedScenarios, setCompletedScenarios] = useState<Record<string, ScenarioCompletionRecord>>(() => {
    try {
      const user = authService.getCurrentUser();
      return ScopedStorage.getCompletedScenarios(user?.id);
    } catch {
      return {};
    }
  });

  const [dailyReelProgress, setDailyReelProgress] = useState<DailyReelProgress>(() => {
    try {
      const user = authService.getCurrentUser();
      return ScopedStorage.getDailyReelProgress(user?.id);
    } catch {
      return { date: getLocalDateKey(), completedReelIds: [], dailyGoal: 5 };
    }
  });

  const [curriculumProgress, setCurriculumProgress] = useState<CurriculumProgressState>(() => {
    try {
      const user = authService.getCurrentUser();
      return normalizeCurriculumProgress(ScopedStorage.getCurriculumProgress(user?.id));
    } catch {
      return createEmptyCurriculumProgress();
    }
  });

  const [activeMission, setActiveMission] = useState<ActivePracticeMission | null>(null);

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

    const cleanCloudWords = Array.isArray(cloudWords) ? cloudWords : [];
    setSavedWords(cleanCloudWords);
    ScopedStorage.setSavedWords(user.id, cleanCloudWords);

    // Strictly merge ONLY this user's cloud lessons + this user's IndexedDB partition (never guest lessons)
    const localCustom = await ankiDb.getCustomLessons();
    if (isCancelled?.()) return;
    const mergedCustomMap = new Map<string, VideoLesson>();
    for (const l of [...cloudLessons, ...localCustom]) {
      if (l && l.id && l.title) mergedCustomMap.set(l.id, l);
    }
    const validCustom = Array.from(mergedCustomMap.values());
    setLessons([...validCustom, ...mockLessonsRef.current]);
    ScopedStorage.setCustomLessons(user.id, validCustom);

    const nextScenarios =
      cloudState && Array.isArray(cloudState.scenarios) && cloudState.scenarios.length > 0
        ? cloudState.scenarios
        : (ScopedStorage.getScenarios(user.id) || SPEAKING_SCENARIOS);
    setScenarios(nextScenarios);
    ScopedStorage.setScenarios(user.id, nextScenarios);

    const nextStreak =
      cloudState && typeof cloudState.streakDays === 'number' && cloudState.streakDays > 0
        ? cloudState.streakDays
        : ScopedStorage.getStreakDays(user.id);
    setStreakDays(nextStreak);
    ScopedStorage.setStreakDays(user.id, nextStreak);

    if (cloudState && Array.isArray(cloudState.customShorts)) {
      ScopedStorage.setCustomShorts(user.id, cloudState.customShorts);
    }
    if (cloudState && cloudState.shortsOffsets && typeof cloudState.shortsOffsets === 'object') {
      ScopedStorage.setShortsOffsets(user.id, cloudState.shortsOffsets);
    }

    const nextRoleplay =
      cloudState && cloudState.roleplayHistory && typeof cloudState.roleplayHistory === 'object'
        ? cloudState.roleplayHistory
        : ScopedStorage.getRoleplayHistory(user.id);
    setRoleplayHistory(nextRoleplay);
    ScopedStorage.setRoleplayHistory(user.id, nextRoleplay);

    const nextCompleted =
      cloudState && cloudState.completedScenarios && typeof cloudState.completedScenarios === 'object'
        ? cloudState.completedScenarios
        : ScopedStorage.getCompletedScenarios(user.id);
    setCompletedScenarios(nextCompleted);
    ScopedStorage.setCompletedScenarios(user.id, nextCompleted);

    const todayKey = getLocalDateKey();
    const nextDailyProgress =
      cloudState &&
      cloudState.dailyReelProgress &&
      typeof cloudState.dailyReelProgress === 'object' &&
      cloudState.dailyReelProgress.date === todayKey &&
      Array.isArray(cloudState.dailyReelProgress.completedReelIds)
        ? cloudState.dailyReelProgress
        : ScopedStorage.getDailyReelProgress(user.id);
    setDailyReelProgress(nextDailyProgress);
    ScopedStorage.setDailyReelProgress(user.id, nextDailyProgress);

    const nextCurriculum =
      cloudState && cloudState.curriculumProgress && typeof cloudState.curriculumProgress === 'object'
        ? normalizeCurriculumProgress(cloudState.curriculumProgress)
        : normalizeCurriculumProgress(ScopedStorage.getCurriculumProgress(user.id));
    setCurriculumProgress(nextCurriculum);
    ScopedStorage.setCurriculumProgress(user.id, nextCurriculum);
  };

  const handleAuthSuccess = async (user: AuthUser) => {
    // Lock persistence effects BEFORE switching user so guest words/videos NEVER overwrite the new account!
    isAccountSwitchingRef.current = true;
    setIsBootHydrated(false);
    try {
      ScopedStorage.clearGuestTransientWords();
      await ankiDb.switchUser(user.id);
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
        ScopedStorage.setSavedWords(user.id, words || []);
        const dbCustom = await ankiDb.getCustomLessons();
        const validCustom = (dbCustom || []).filter(c => Boolean(c && typeof c === 'object' && c.id && c.title));
        setLessons([...validCustom, ...mockLessonsRef.current]);
        ScopedStorage.setCustomLessons(user.id, validCustom);
        setScenarios(ScopedStorage.getScenarios(user.id) || SPEAKING_SCENARIOS);
        setStreakDays(ScopedStorage.getStreakDays(user.id));
        setRoleplayHistory(ScopedStorage.getRoleplayHistory(user.id));
        setCompletedScenarios(ScopedStorage.getCompletedScenarios(user.id));
        setDailyReelProgress(ScopedStorage.getDailyReelProgress(user.id));
        setCurriculumProgress(normalizeCurriculumProgress(ScopedStorage.getCurriculumProgress(user.id)));
      }

      // Commit currentUser AFTER account data is hydrated cleanly
      setCurrentUser(user);
    } finally {
      isAccountSwitchingRef.current = false;
      setIsBootHydrated(true);
    }
  };

  const handleLogout = async () => {
    isAccountSwitchingRef.current = true;
    setIsBootHydrated(false);
    try {
      await authService.logout();
      setCurrentUser(null);
      const loadedProfiles = await ankiDb.getProfiles();
      const active = await ankiDb.getActiveProfile();
      setProfiles(loadedProfiles);
      setActiveProfile(active);
      const guestWords = await ankiDb.getAllWords();
      setSavedWords(guestWords && guestWords.length > 0 ? guestWords : INITIAL_SAVED_WORDS);
      const guestCustom = await ankiDb.getCustomLessons();
      const validGuestCustom = (guestCustom || []).filter(c => Boolean(c && typeof c === 'object' && c.id && c.title));
      setLessons([...validGuestCustom, ...mockLessonsRef.current]);
      setScenarios(ScopedStorage.getScenarios(null) || SPEAKING_SCENARIOS);
      setStreakDays(ScopedStorage.getStreakDays(null));
      setRoleplayHistory(ScopedStorage.getRoleplayHistory(null));
      setCompletedScenarios(ScopedStorage.getCompletedScenarios(null));
      setDailyReelProgress(ScopedStorage.getDailyReelProgress(null));
      setCurriculumProgress(normalizeCurriculumProgress(ScopedStorage.getCurriculumProgress(null)));
      setActiveMission(null);
    } finally {
      isAccountSwitchingRef.current = false;
      setIsBootHydrated(true);
    }
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
            setLessons([...validCustom, ...mockLessonsRef.current]);
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

  // Sync to ScopedStorage, Anki IndexedDB, and Cloud Server (ONLY after boot & account switch hydration completes)
  useEffect(() => {
    if (!isBootHydrated || isAccountSwitchingRef.current) return;
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
    if (!isBootHydrated || isAccountSwitchingRef.current) return;
    try {
      const customOnly = lessons.filter(l => Boolean(l && (l.isCustom || (typeof l.id === 'string' && l.id.startsWith('lesson-custom-')))));
      ScopedStorage.setCustomLessons(currentUser?.id, customOnly);
    } catch (e) {
      console.warn('ScopedStorage lessons error', e);
    }
  }, [lessons, currentUser, isBootHydrated]);

  useEffect(() => {
    if (!isBootHydrated || isAccountSwitchingRef.current) return;
    try {
      ScopedStorage.setScenarios(currentUser?.id, scenarios);
    } catch (e) {
      console.warn('ScopedStorage scenarios error', e);
    }
  }, [scenarios, currentUser, isBootHydrated]);

  useEffect(() => {
    if (!isBootHydrated || isAccountSwitchingRef.current) return;
    try {
      ScopedStorage.setStreakDays(currentUser?.id, streakDays);
    } catch (e) {
      console.warn('ScopedStorage streak error', e);
    }
  }, [streakDays, currentUser, isBootHydrated]);

  useEffect(() => {
    if (!isBootHydrated || isAccountSwitchingRef.current) return;
    try {
      ScopedStorage.setDailyReelProgress(currentUser?.id, dailyReelProgress);
    } catch (e) {
      console.warn('ScopedStorage daily reel progress error', e);
    }
  }, [dailyReelProgress, currentUser, isBootHydrated]);

  useEffect(() => {
    if (!isBootHydrated || isAccountSwitchingRef.current) return;
    try {
      ScopedStorage.setCurriculumProgress(currentUser?.id, curriculumProgress);
    } catch (e) {
      console.warn('ScopedStorage curriculum progress error', e);
    }
  }, [curriculumProgress, currentUser, isBootHydrated]);

  // Cloud State Sync for scenarios, streakDays, profiles, customShorts, shortsOffsets & curriculumProgress
  useEffect(() => {
    if (!isBootHydrated || isAccountSwitchingRef.current || !currentUser) return;
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
            roleplayHistory,
            completedScenarios,
            dailyReelProgress,
            curriculumProgress
          }
        })
      }).catch(console.warn);
    }, 1500);
    return () => clearTimeout(timer);
  }, [scenarios, streakDays, roleplayHistory, completedScenarios, dailyReelProgress, curriculumProgress, currentUser, isBootHydrated]);

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

  // Save a native rephrase from AI Roleplay directly into the FSRS-6 vocabulary deck
  const handleSaveRoleplayPhraseToSrs = (phrase: string, originalUserLine: string, grammarTip?: string) => {
    const cleanPhrase = phrase.trim();
    if (!cleanPhrase) return;
    const normalized = cleanPhrase.toLowerCase();
    const alreadyExists = savedWords.some((w) => w?.word && w.word.toLowerCase().trim() === normalized);
    if (alreadyExists) {
      toast.info('Câu/cụm từ này đã có trong Kho từ vựng FSRS-6 của bạn.');
      return;
    }

    const newWord: SavedWord = {
      id: `word-rp-${Date.now()}`,
      word: cleanPhrase.slice(0, 80),
      phonetic: '',
      partOfSpeech: 'native phrase',
      translation: grammarTip?.trim() || 'Cách diễn đạt chuẩn bản xứ từ AI Roleplay',
      definitionEn: `Natural native phrasing (improved from: "${originalUserLine}")`,
      contextSentence: cleanPhrase,
      videoTitle: 'AI Roleplay Coaching',
      savedAt: Date.now(),
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      lapses: 0,
      state: 'new',
      dueAt: Date.now(),
      lastReviewedAt: Date.now(),
      schedulerVersion: 'fsrs6',
      usn: 1,
      isDirty: true
    };

    setSavedWords((prev) => [newWord, ...prev]);
    ankiDb.saveWord(newWord).catch(console.warn);
    if (!currentUser) {
      ScopedStorage.addGuestTransientWord(newWord);
    }
    toast.success('Đã lưu câu bản xứ vào Kho từ vựng FSRS-6 để ôn tập!');
  };

  // Save an American expression directly from Real American Reels into FSRS-6 with exact video timestamp
  const handleSaveReelExpression = (payload: {
    expression: string;
    meaningVi: string;
    contextSentence: string;
    usageNote?: string;
    videoTitle?: string;
    sourceLessonId?: string;
    sourceYoutubeId?: string;
    sourceTimestampSec?: number;
  }) => {
    const cleanExpr = payload.expression.trim();
    if (!cleanExpr) return;
    const normalized = cleanExpr.toLowerCase();
    const alreadyExists = savedWords.some((w) => w?.word && w.word.toLowerCase().trim() === normalized);
    if (alreadyExists) {
      toast.info(`"${cleanExpr}" đã có trong Kho từ vựng FSRS-6 của bạn.`);
      return;
    }

    const newWord: SavedWord = {
      id: `word-reel-${Date.now()}`,
      word: cleanExpr.slice(0, 80),
      phonetic: '',
      partOfSpeech: cleanExpr.includes(' ') ? 'expression' : 'spoken word',
      translation: payload.meaningVi.trim() || `Cụm tiếng Mỹ: "${cleanExpr}"`,
      definitionEn: payload.usageNote?.trim() || `Real American English expression from "${payload.videoTitle || 'Shorts'}"`,
      exampleEn: payload.contextSentence,
      contextSentence: payload.contextSentence,
      videoTitle: payload.videoTitle || 'Real American Reels',
      sourceLessonId: payload.sourceLessonId,
      sourceYoutubeId: payload.sourceYoutubeId,
      sourceTimestampSec: payload.sourceTimestampSec,
      savedAt: Date.now(),
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      lapses: 0,
      state: 'new',
      dueAt: Date.now(),
      lastReviewedAt: Date.now(),
      schedulerVersion: 'fsrs6',
      usn: 1,
      isDirty: true
    };

    setSavedWords((prev) => [newWord, ...prev]);
    ankiDb.saveWord(newWord).catch(console.warn);
    if (!currentUser) {
      ScopedStorage.addGuestTransientWord(newWord);
    }
    toast.success(`Đã lưu "${cleanExpr}" vào Kho từ vựng FSRS-6!`);
  };

  // Batch save vocabulary from Roadmap lessons directly into FSRS-6 deck
  const handleSaveWordsBatchToSrs = (
    items: Array<{ def: WordDefinition; contextSentence?: string; videoTitle?: string }>
  ): number => {
    if (!items || items.length === 0) return 0;
    const existingKeys = new Set(
      savedWords.map((w) => (w?.word || '').toLowerCase().trim()).filter(Boolean)
    );
    const now = Date.now();
    const toAdd: SavedWord[] = [];

    items.forEach((item, idx) => {
      const cleanWord = (item.def?.word || '').trim();
      if (!cleanWord) return;
      const key = cleanWord.toLowerCase();
      if (existingKeys.has(key)) return;
      existingKeys.add(key);

      toAdd.push({
        id: `word-rm-${now}-${idx}`,
        word: cleanWord,
        phonetic: item.def.phonetic || '',
        partOfSpeech: item.def.partOfSpeech || 'word',
        translation: item.def.translation || cleanWord,
        definitionEn: item.def.definitionEn || '',
        exampleEn: item.def.exampleEn || item.contextSentence || '',
        contextSentence: item.contextSentence || item.def.exampleEn || cleanWord,
        videoTitle: item.videoTitle || 'Lộ trình 4 Kỹ năng',
        savedAt: now,
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
        lapses: 0,
        state: 'new',
        dueAt: now,
        lastReviewedAt: now,
        schedulerVersion: 'fsrs6',
        usn: 1,
        isDirty: true
      });
    });

    if (toAdd.length > 0) {
      setSavedWords((prev) => [...toAdd, ...prev]);
      toAdd.forEach((w) => {
        ankiDb.saveWord(w).catch(console.warn);
        if (!currentUser) {
          ScopedStorage.addGuestTransientWord(w);
        }
      });
      toast.success(`Đã nạp ${toAdd.length} từ mới vào Kho ôn tập FSRS-6!`);
    } else {
      toast.info('Toàn bộ từ trong bài này đã có trong Kho từ vựng FSRS-6 của bạn.');
    }
    return toAdd.length;
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

  // FSRS-6 Review execution, revlog audit recording & Anki -> LingQ status sync
  const handleReviewWord = (wordId: string, rating: AnkiRating) => {
    setSavedWords((prev) =>
      prev.map((w) => {
        if (w.id !== wordId) return w;
        const res = calculateFsrsSchedule(w, rating);

        // Auto-sync mastery milestone back into LingQ subtitle highlight matrix
        if (rating === 1) {
          lingqWordService.setWordStatus(w.word, 1);
        } else if (res.newStability >= 21) {
          lingqWordService.setWordStatus(w.word, 4);
        } else if (res.newStability >= 7) {
          lingqWordService.setWordStatus(w.word, 3);
        } else if (res.newStability >= 2) {
          lingqWordService.setWordStatus(w.word, 2);
        }

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
          stability: res.newStability,
          difficulty: res.newDifficulty,
          schedulerVersion: 'fsrs6',
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
          <React.Suspense fallback={<LoadingFallback />}>
            <VideoStudyRoom
              lesson={currentLesson}
              onBack={() => {
                React.startTransition(() => {
                  setCurrentLesson(null);
                  setInitialVideoTimestampSec(undefined);
                });
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
          </React.Suspense>

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
          React.startTransition(() => {
            setActiveTab(tab);
            setCurrentLesson(null);
          });
        }}
        savedWordsCount={savedWords.length}
        streakDays={streakDays}
        currentUser={currentUser}
        onOpenAdmin={() => setIsAdminModalOpen(true)}
      />

      {/* Main Content Area (offset by sidebar on desktop) */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header
          activeTab={activeTab}
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

        <main className="flex-1 max-w-7xl mx-auto w-full p-4 lg:p-8 pb-24 lg:pb-12">
          <React.Suspense fallback={<LoadingFallback />}>
            {activeTab === 'roadmap' && (
              <ProductionErrorBoundary componentName="Lộ trình học" onGoHome={() => setActiveTab('roadmap')}>
                <RoadmapScreen
                  progress={curriculumProgress}
                  searchQuery={searchQuery}
                  onUpdateProgress={setCurriculumProgress}
                  onSaveWordsToSrs={handleSaveWordsBatchToSrs}
                  onLaunchMission={(mission) => {
                    setActiveMission(mission);
                    React.startTransition(() => {
                      setActiveTab('output');
                    });
                  }}
                />
              </ProductionErrorBoundary>
            )}

            {activeTab === 'watch' && (
              <ProductionErrorBoundary componentName="Xem & Nghe Video" onGoHome={() => setActiveTab('roadmap')}>
                <WatchHubScreen
                  lessons={searchedLessons}
                  shorts={shorts}
                  streakDays={streakDays}
                  savedWords={savedWords}
                  activeProfileId={currentUser?.id || activeProfile.id}
                  currentUser={currentUser}
                  dailyReelProgress={dailyReelProgress}
                  onSelectLesson={handleSelectLesson}
                  onOpenImport={() => setIsImportOpen(true)}
                  onDeleteLesson={handleDeleteLesson}
                  onSelectWord={handleSelectWord}
                  onReviewWord={handleReviewWord}
                  onSaveReelExpression={handleSaveReelExpression}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                  onDailyReelProgressChange={setDailyReelProgress}
                />
              </ProductionErrorBoundary>
            )}

            {activeTab === 'memory' && (
              <ProductionErrorBoundary componentName="Ôn tập & Kho từ" onGoHome={() => setActiveTab('roadmap')}>
                <MemoryHubScreen
                  savedWords={savedWords}
                  currentUser={currentUser}
                  onReviewWord={handleReviewWord}
                  onUpdateWord={handleUpdateWord}
                  onBulkDeleteWords={handleBulkDeleteWords}
                  onOpenWordInVideo={handleOpenWordInVideo}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                />
              </ProductionErrorBoundary>
            )}

            {activeTab === 'output' && (
              <ProductionErrorBoundary componentName="Phòng Nói & Viết AI" onGoHome={() => setActiveTab('roadmap')}>
                <RapidSpeakingRoom
                  scenarios={scenarios}
                  onBack={() => setActiveTab('roadmap')}
                  onAddCustomScenario={(sc) => setScenarios((prev) => [sc, ...prev])}
                  currentUser={currentUser}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                  onRoleplayHistoryChange={(history) => setRoleplayHistory(history)}
                  completedScenarios={completedScenarios}
                  onCompletedScenariosChange={(records) => setCompletedScenarios(records)}
                  onSavePhraseToSrs={handleSaveRoleplayPhraseToSrs}
                  onWordClick={(word, contextSentence) => void handleSelectWord(word, contextSentence)}
                  activeMission={activeMission}
                  onClearMission={() => setActiveMission(null)}
                  savedWords={savedWords}
                />
              </ProductionErrorBoundary>
            )}

            {activeTab === 'profile' && (
              <ProductionErrorBoundary componentName="Hồ Sơ Học Tập" onGoHome={() => setActiveTab('roadmap')}>
                <ProfileScreen
                  savedWords={savedWords}
                  streakDays={streakDays}
                  currentUser={currentUser}
                  curriculumProgress={curriculumProgress}
                  onNavigateToReview={() => setActiveTab('memory')}
                  onSelectWord={handleSelectWord}
                  onResetProgress={() => {
                    const resetWords = currentUser ? [] : INITIAL_SAVED_WORDS;
                    if (currentUser) {
                      savedWords.forEach((w) => {
                        ankiDb.deleteWord(w.id, w.word).catch(console.warn);
                      });
                    } else {
                      ankiDb.saveWords(INITIAL_SAVED_WORDS).catch(console.warn);
                    }
                    const emptyCurr = createEmptyCurriculumProgress();
                    setSavedWords(resetWords);
                    setLessons(mockLessonsRef.current);
                    setStreakDays(1);
                    setCurriculumProgress(emptyCurr);
                    setActiveMission(null);
                    ScopedStorage.setSavedWords(currentUser?.id, resetWords);
                    ScopedStorage.setCustomLessons(currentUser?.id, []);
                    ScopedStorage.setStreakDays(currentUser?.id, 1);
                    ScopedStorage.setCurriculumProgress(currentUser?.id, emptyCurr);
                    ScopedStorage.clearGuestTransientWords();
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
          React.startTransition(() => {
            setActiveTab(tab);
            setCurrentLesson(null);
          });
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
        currentUser={currentUser}
        streakDays={streakDays}
        onSwitchProfile={handleSwitchProfile}
        onCreateProfile={handleCreateProfile}
        onDeleteProfile={handleDeleteProfile}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Authentication Modal (Register / Login) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        guestWordsToMigrate={currentUser ? [] : ScopedStorage.getGuestTransientWords()}
      />

      {/* Admin RBAC Management Panel */}
      {isAdminModalOpen && (
        <React.Suspense fallback={null}>
          <AdminPanelModal
            isOpen={isAdminModalOpen}
            onClose={() => setIsAdminModalOpen(false)}
          />
        </React.Suspense>
      )}
    </div>
  );
};

export default App;
