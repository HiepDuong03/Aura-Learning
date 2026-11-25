/**
 * Scoped Multi-Tenant Storage Manager (AURA AI - Data Isolation Layer)
 * 
 * Prevents cross-account data contamination by partitioning localStorage
 * strictly by `userId`. Guest / anonymous sessions use a dedicated clean partition.
 */

import { SavedWord, VideoLesson, AnkiUserProfile, DailyReelProgress, CurriculumProgressState } from '../types';
import { createEmptyCurriculumProgress, normalizeCurriculumProgress } from '../utils/curriculumEngine';

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
import { SpeakingScenario } from '../data/speakingScenarios';
import { ScenarioCompletionRecord } from '../utils/speakingMetrics';

export interface PersistedRoleplayMessage {
  id: string;
  sender: 'AI' | 'User';
  text: string;
  translation?: string;
  correction?: string;
  nativeRephrase?: string;
  grammarTip?: string;
  qualityRating?: 'perfect' | 'good' | 'revision_needed';
  suggestedReplies?: string[];
  latencyMs?: number;
}

export interface PersistedCustomRoleplayPersona {
  id: string;
  name: string;
  role: string;
  avatar: string;
  situation: string;
  mission: string;
  initialMessage: string;
  initialTranslation: string;
  isCustom?: boolean;
}

export class ScopedStorage {
  private static getPrefix(userId?: string | null): string {
    const cleanId = (userId || '').trim();
    return cleanId ? `4you_u_${cleanId}` : '4you_guest';
  }

  // --- Saved Words ---
  public static getSavedWords(userId?: string | null): SavedWord[] {
    try {
      const key = `${this.getPrefix(userId)}_words`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((w): w is SavedWord => Boolean(w && typeof w === 'object' && w.word));
        }
      }
    } catch (e) {
      console.warn('[ScopedStorage] Error reading saved words:', e);
    }
    return [];
  }

  public static setSavedWords(userId: string | null | undefined, words: SavedWord[]): void {
    try {
      const key = `${this.getPrefix(userId)}_words`;
      localStorage.setItem(key, JSON.stringify(words));
    } catch (e) {
      console.warn('[ScopedStorage] Error writing saved words:', e);
    }
  }

  // --- Guest Transient Words (Created only in the current anonymous session) ---
  public static getGuestTransientWords(): SavedWord[] {
    try {
      const raw = localStorage.getItem('4you_guest_transient_words');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((w): w is SavedWord => Boolean(w && typeof w === 'object' && w.word));
        }
      }
    } catch {}
    return [];
  }

  public static addGuestTransientWord(word: SavedWord): void {
    try {
      const current = this.getGuestTransientWords();
      const updated = [word, ...current.filter(w => w.word.toLowerCase() !== word.word.toLowerCase())];
      localStorage.setItem('4you_guest_transient_words', JSON.stringify(updated));
    } catch {}
  }

  public static clearGuestTransientWords(): void {
    try {
      localStorage.removeItem('4you_guest_transient_words');
    } catch {}
  }

  // --- Custom Lessons ---
  public static getCustomLessons(userId?: string | null): VideoLesson[] {
    try {
      const key = `${this.getPrefix(userId)}_custom_lessons`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((l): l is VideoLesson => Boolean(l && typeof l === 'object' && l.id && l.title));
        }
      }
    } catch (e) {
      console.warn('[ScopedStorage] Error reading custom lessons:', e);
    }
    return [];
  }

  public static setCustomLessons(userId: string | null | undefined, lessons: VideoLesson[]): void {
    try {
      const key = `${this.getPrefix(userId)}_custom_lessons`;
      localStorage.setItem(key, JSON.stringify(lessons));
    } catch (e) {
      console.warn('[ScopedStorage] Error writing custom lessons:', e);
    }
  }

  // --- Streak Days ---
  public static getStreakDays(userId?: string | null): number {
    try {
      const key = `${this.getPrefix(userId)}_streak`;
      const raw = localStorage.getItem(key);
      if (raw !== null) {
        const parsed = parseInt(raw, 10);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
      }
      return 1;
    } catch {
      return 1;
    }
  }

  public static setStreakDays(userId: string | null | undefined, streak: number): void {
    try {
      const key = `${this.getPrefix(userId)}_streak`;
      localStorage.setItem(key, String(streak));
    } catch {}
  }

  // --- Speaking Scenarios ---
  public static getScenarios(userId?: string | null): SpeakingScenario[] | null {
    try {
      const key = `${this.getPrefix(userId)}_scenarios`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public static setScenarios(userId: string | null | undefined, scenarios: SpeakingScenario[]): void {
    try {
      const key = `${this.getPrefix(userId)}_scenarios`;
      localStorage.setItem(key, JSON.stringify(scenarios));
    } catch {}
  }

  // --- Anki Profiles (Scoped per User) ---
  public static getProfiles(userId?: string | null): AnkiUserProfile[] | null {
    try {
      const key = `${this.getPrefix(userId)}_profiles`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
      }
    } catch {}
    return null;
  }

  public static setProfiles(userId: string | null | undefined, profiles: AnkiUserProfile[]): void {
    try {
      const key = `${this.getPrefix(userId)}_profiles`;
      localStorage.setItem(key, JSON.stringify(profiles));
    } catch {}
  }

  public static getActiveProfileId(userId?: string | null): string | null {
    try {
      return localStorage.getItem(`${this.getPrefix(userId)}_active_profile_id`);
    } catch {
      return null;
    }
  }

  public static setActiveProfileId(userId: string | null | undefined, profileId: string): void {
    try {
      localStorage.setItem(`${this.getPrefix(userId)}_active_profile_id`, profileId);
    } catch {}
  }

  // --- Shorts Feed (Custom Shorts & Offsets Scoped per User) ---
  public static getCustomShorts(userId?: string | null): VideoLesson[] {
    try {
      const key = `${this.getPrefix(userId)}_custom_shorts`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  }

  public static setCustomShorts(userId: string | null | undefined, shorts: VideoLesson[]): void {
    try {
      const key = `${this.getPrefix(userId)}_custom_shorts`;
      localStorage.setItem(key, JSON.stringify(shorts));
    } catch {}
  }

  public static getShortsOffsets(userId?: string | null): Record<string, number> {
    try {
      const key = `${this.getPrefix(userId)}_shorts_offsets`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  public static setShortsOffsets(userId: string | null | undefined, offsets: Record<string, number>): void {
    try {
      const key = `${this.getPrefix(userId)}_shorts_offsets`;
      localStorage.setItem(key, JSON.stringify(offsets));
    } catch {}
  }

  // --- Roleplay Chat History (Scoped per User, keyed by personaId) ---
  public static getRoleplayHistory(userId?: string | null): Record<string, PersistedRoleplayMessage[]> {
    try {
      const key = `${this.getPrefix(userId)}_roleplay_history`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, PersistedRoleplayMessage[]>;
        }
      }
    } catch {
      return {};
    }
    return {};
  }

  public static setRoleplayHistory(
    userId: string | null | undefined,
    history: Record<string, PersistedRoleplayMessage[]>
  ): void {
    try {
      const key = `${this.getPrefix(userId)}_roleplay_history`;
      localStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
      console.warn('[ScopedStorage] Error writing roleplay history:', e);
    }
  }

  // --- Completed Speaking Scenarios (Scoped per User) ---
  public static getCompletedScenarios(userId?: string | null): Record<string, ScenarioCompletionRecord> {
    try {
      const key = `${this.getPrefix(userId)}_completed_scenarios`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, ScenarioCompletionRecord>;
        }
      }
    } catch {
      return {};
    }
    return {};
  }

  public static setCompletedScenarios(
    userId: string | null | undefined,
    records: Record<string, ScenarioCompletionRecord>
  ): void {
    try {
      const key = `${this.getPrefix(userId)}_completed_scenarios`;
      localStorage.setItem(key, JSON.stringify(records));
    } catch (e) {
      console.warn('[ScopedStorage] Error writing completed scenarios:', e);
    }
  }

  // --- Daily Real American Reels Micro-Habit Progress (Scoped per User) ---
  public static getDailyReelProgress(userId?: string | null): DailyReelProgress {
    const today = getLocalDateKey();
    try {
      const key = `${this.getPrefix(userId)}_daily_reel_progress`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DailyReelProgress>;
        if (parsed && parsed.date === today && Array.isArray(parsed.completedReelIds)) {
          return {
            date: today,
            completedReelIds: parsed.completedReelIds.filter((id): id is string => typeof id === 'string'),
            dailyGoal: typeof parsed.dailyGoal === 'number' && parsed.dailyGoal > 0 ? parsed.dailyGoal : 5
          };
        }
      }
    } catch {
      // Fallback to fresh daily goal
    }
    return { date: today, completedReelIds: [], dailyGoal: 5 };
  }

  public static setDailyReelProgress(
    userId: string | null | undefined,
    progress: DailyReelProgress
  ): void {
    try {
      const key = `${this.getPrefix(userId)}_daily_reel_progress`;
      localStorage.setItem(key, JSON.stringify(progress));
    } catch (e) {
      console.warn('[ScopedStorage] Error writing daily reel progress:', e);
    }
  }

  // --- Structured Curriculum Progress (IELTS Topics + CEFR Vocab + Grammar, Scoped per User) ---
  public static getCurriculumProgress(userId?: string | null): CurriculumProgressState {
    try {
      const key = `${this.getPrefix(userId)}_curriculum_progress`;
      const raw = localStorage.getItem(key);
      if (raw) {
        return normalizeCurriculumProgress(JSON.parse(raw));
      }
    } catch {
      return createEmptyCurriculumProgress();
    }
    return createEmptyCurriculumProgress();
  }

  public static setCurriculumProgress(
    userId: string | null | undefined,
    progress: CurriculumProgressState
  ): void {
    try {
      const key = `${this.getPrefix(userId)}_curriculum_progress`;
      localStorage.setItem(key, JSON.stringify(progress));
    } catch (e) {
      console.warn('[ScopedStorage] Error writing curriculum progress:', e);
    }
  }

  // --- Custom Roleplay Personas (Scoped per User) ---
  public static getCustomRoleplayPersonas(userId?: string | null): PersistedCustomRoleplayPersona[] {
    try {
      const key = `${this.getPrefix(userId)}_custom_roleplay_personas`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(
              (p): p is PersistedCustomRoleplayPersona =>
                Boolean(p && typeof p === 'object' && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.mission === 'string')
            )
            .slice(0, 20);
        }
      }
    } catch (e) {
      console.warn('[ScopedStorage] Error reading custom roleplay personas:', e);
    }
    return [];
  }

  public static setCustomRoleplayPersonas(
    userId: string | null | undefined,
    personas: PersistedCustomRoleplayPersona[]
  ): void {
    try {
      const key = `${this.getPrefix(userId)}_custom_roleplay_personas`;
      localStorage.setItem(key, JSON.stringify(personas.slice(0, 20)));
    } catch (e) {
      console.warn('[ScopedStorage] Error writing custom roleplay personas:', e);
    }
  }

  // --- Writing Coach Auto-Save Drafts (Scoped per User, LRU max 10) ---
  public static getWritingDraft(userId: string | null | undefined, draftKey: string): string {
    try {
      const cleanKey = draftKey.trim();
      if (!cleanKey) return '';
      const storageKey = `${this.getPrefix(userId)}_writing_drafts`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed[cleanKey]?.text === 'string') {
        return parsed[cleanKey].text;
      }
    } catch (e) {
      console.warn('[ScopedStorage] Error reading writing draft:', e);
    }
    return '';
  }

  public static setWritingDraft(userId: string | null | undefined, draftKey: string, text: string): void {
    try {
      const cleanKey = draftKey.trim();
      if (!cleanKey) return;
      const storageKey = `${this.getPrefix(userId)}_writing_drafts`;
      const raw = localStorage.getItem(storageKey);
      let drafts: Record<string, { text: string; updatedAt: number }> = {};
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          drafts = parsed;
        }
      }
      if (!text.trim()) {
        delete drafts[cleanKey];
      } else {
        drafts[cleanKey] = { text: text.slice(0, 4000), updatedAt: Date.now() };
      }
      // Keep only the 10 most recently edited drafts
      const entries = Object.entries(drafts)
        .sort((a, b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0))
        .slice(0, 10);
      localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(entries)));
    } catch (e) {
      console.warn('[ScopedStorage] Error writing writing draft:', e);
    }
  }

  // --- Clean User Session Partition Caches ---
  public static clearPartitionCaches(userId?: string | null): void {
    try {
      const prefix = `${this.getPrefix(userId)}_`;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  }
}
