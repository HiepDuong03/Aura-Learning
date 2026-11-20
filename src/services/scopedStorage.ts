/**
 * Scoped Multi-Tenant Storage Manager (AURA AI - Data Isolation Layer)
 * 
 * Prevents cross-account data contamination by partitioning localStorage
 * strictly by `userId`. Guest / anonymous sessions use a dedicated clean partition.
 */

import { SavedWord, VideoLesson, AnkiUserProfile } from '../types';
import { SpeakingScenario } from '../data/speakingScenarios';

export interface PersistedRoleplayMessage {
  id: string;
  sender: 'AI' | 'User';
  text: string;
  translation?: string;
  nativeRephrase?: string;
  grammarTip?: string;
  latencyMs?: number;
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
      return raw ? parseInt(raw, 10) : 5;
    } catch {
      return 5;
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
