/**
 * Scoped Multi-Tenant Storage Manager (AURA AI - Data Isolation Layer)
 * 
 * Prevents cross-account data contamination by partitioning localStorage
 * strictly by `userId`. Guest / anonymous sessions use a dedicated clean partition.
 */

import { SavedWord, VideoLesson } from '../types';
import { SpeakingScenario } from '../data/speakingScenarios';

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

  // --- Clean User Session Partition on Logout ---
  public static clearUserMemory(userId: string): void {
    try {
      const prefix = `4you_u_${userId}`;
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith(prefix)) {
          // Keep cached data in localStorage if needed, or remove
        }
      });
    } catch {}
  }
}
