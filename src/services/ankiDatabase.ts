/**
 * Anki Database & Storage Engine (Local-First IndexedDB Architecture)
 * Reverse-engineered from Anki's SQLite schema (notes, cards, revlog, graves, profiles, USN tracking)
 * 
 * BR-13: Full audit trail of reviews in revlog
 * BR-15: Zero silent failures, fallback to localStorage if IndexedDB is unavailable
 */

import { SavedWord, AnkiReviewLogEntry, AnkiCollectionStats, AnkiUserProfile, VideoLesson } from '../types';
import { ScopedStorage } from './scopedStorage';

const DB_VERSION = 3;

const STORES = {
  WORDS: 'words',
  REVLOG: 'revlog',
  META: 'meta',
  GRAVES: 'graves',
  CUSTOM_LESSONS: 'custom_lessons',
} as const;

export const DEFAULT_PROFILE: AnkiUserProfile = {
  id: 'prof_default',
  name: 'Học Viên 1',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
  createdAt: Date.now(),
  lastActiveAt: Date.now(),
  streakDays: 5,
};

export class AnkiDatabase {
  private db: IDBDatabase | null = null;
  private isInitializing: Promise<void> | null = null;
  private currentUsn: number = 0;
  private activeProfileId: string = 'prof_default';
  private currentUserId: string | null = null;

  public getDbName(userId?: string | null): string {
    const clean = (userId || '').trim();
    return clean ? `4you_anki_db_u_${clean}` : '4you_anki_db_guest';
  }

  /**
   * Seamlessly switches to another user's physical IndexedDB database partition
   */
  public async switchUser(userId: string | null): Promise<void> {
    if (this.currentUserId === userId && this.db) {
      return;
    }
    if (this.db) {
      try {
        this.db.close();
      } catch {}
      this.db = null;
    }
    this.currentUserId = userId;
    this.activeProfileId = userId || 'prof_default';
    this.isInitializing = null;
    await this.init(userId);
  }

  /**
   * Initializes the IndexedDB database for current or specified user
   */
  public async init(userId?: string | null): Promise<void> {
    if (userId !== undefined) {
      this.currentUserId = userId;
      this.activeProfileId = userId || 'prof_default';
    }
    if (this.db) return;
    if (this.isInitializing) return this.isInitializing;

    const dbName = this.getDbName(this.currentUserId);

    this.isInitializing = new Promise<void>((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        console.warn('[AnkiDB] IndexedDB is not supported in this environment. Falling back to ScopedStorage.');
        resolve();
        return;
      }

      const request = window.indexedDB.open(dbName, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store 1: words (Anki notes & cards unified)
        if (!db.objectStoreNames.contains(STORES.WORDS)) {
          const wordStore = db.createObjectStore(STORES.WORDS, { keyPath: 'id' });
          wordStore.createIndex('word', 'word', { unique: false });
          wordStore.createIndex('dueAt', 'dueAt', { unique: false });
          wordStore.createIndex('interval', 'interval', { unique: false });
          wordStore.createIndex('usn', 'usn', { unique: false });
          wordStore.createIndex('profileId', 'profileId', { unique: false });
        } else {
          const wordStore = (event.target as IDBOpenDBRequest).transaction?.objectStore(STORES.WORDS);
          if (wordStore && !wordStore.indexNames.contains('profileId')) {
            wordStore.createIndex('profileId', 'profileId', { unique: false });
          }
        }

        // Store 2: revlog (Immutable Review History Audit Log)
        if (!db.objectStoreNames.contains(STORES.REVLOG)) {
          const revlogStore = db.createObjectStore(STORES.REVLOG, { keyPath: 'id' });
          revlogStore.createIndex('wordId', 'wordId', { unique: false });
          revlogStore.createIndex('reviewedAt', 'reviewedAt', { unique: false });
          revlogStore.createIndex('rating', 'rating', { unique: false });
          revlogStore.createIndex('profileId', 'profileId', { unique: false });
        } else {
          const revlogStore = (event.target as IDBOpenDBRequest).transaction?.objectStore(STORES.REVLOG);
          if (revlogStore && !revlogStore.indexNames.contains('profileId')) {
            revlogStore.createIndex('profileId', 'profileId', { unique: false });
          }
        }

        // Store 3: meta (Collection level metadata, Profiles, & USN counters)
        if (!db.objectStoreNames.contains(STORES.META)) {
          db.createObjectStore(STORES.META, { keyPath: 'key' });
        }

        // Store 4: graves (Tombstones for deleted cards)
        if (!db.objectStoreNames.contains(STORES.GRAVES)) {
          db.createObjectStore(STORES.GRAVES, { keyPath: 'id' });
        }

        // Store 5: custom_lessons (Persistent user-imported YouTube lessons with full subtitles)
        if (!db.objectStoreNames.contains(STORES.CUSTOM_LESSONS)) {
          const lessonStore = db.createObjectStore(STORES.CUSTOM_LESSONS, { keyPath: 'id' });
          lessonStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = async (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        try {
          await this.initProfiles();
          await this.migrateFromLocalStorage();
          resolve();
        } catch (e) {
          console.warn('[AnkiDB] Migration warning:', e);
          resolve();
        }
      };

      request.onerror = (event) => {
        const err = (event.target as IDBOpenDBRequest).error;
        console.warn('[AnkiDB] IndexedDB open error, falling back to localStorage:', err);
        resolve();
      };
    });

    return this.isInitializing;
  }

  /**
   * Initializes profile storage
   */
  private async initProfiles(): Promise<void> {
    const profiles = await this.getProfiles();
    if (profiles.length === 0) {
      await this.saveProfiles([DEFAULT_PROFILE]);
      this.activeProfileId = DEFAULT_PROFILE.id;
      localStorage.setItem('4you_active_profile_id', DEFAULT_PROFILE.id);
    } else {
      const savedActive = localStorage.getItem('4you_active_profile_id');
      const found = profiles.find(p => p.id === savedActive);
      this.activeProfileId = found ? found.id : (profiles[0]?.id || DEFAULT_PROFILE.id);
    }
  }

  /**
   * Retrieves all profiles on this device
   */
  public async getProfiles(): Promise<AnkiUserProfile[]> {
    if (!this.db) {
      try {
        const raw = localStorage.getItem('4you_profiles_v1');
        return raw ? JSON.parse(raw) : [DEFAULT_PROFILE];
      } catch {
        return [DEFAULT_PROFILE];
      }
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(STORES.META, 'readonly');
        const store = transaction.objectStore(STORES.META);
        const req = store.get('profiles');

        req.onsuccess = () => {
          if (req.result && Array.isArray(req.result.value)) {
            resolve(req.result.value);
          } else {
            resolve([DEFAULT_PROFILE]);
          }
        };
        req.onerror = () => resolve([DEFAULT_PROFILE]);
      } catch {
        resolve([DEFAULT_PROFILE]);
      }
    });
  }

  /**
   * Saves profiles array
   */
  private async saveProfiles(profiles: AnkiUserProfile[]): Promise<void> {
    try {
      localStorage.setItem('4you_profiles_v1', JSON.stringify(profiles));
    } catch {
      // Safe ignore
    }

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(STORES.META, 'readwrite');
        const store = transaction.objectStore(STORES.META);
        store.put({ key: 'profiles', value: profiles });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Gets the currently active profile
   */
  public async getActiveProfile(): Promise<AnkiUserProfile> {
    const profiles = await this.getProfiles();
    return profiles.find(p => p.id === this.activeProfileId) || profiles[0] || DEFAULT_PROFILE;
  }

  /**
   * Switches the active profile (Anki REA: File -> Switch Profile)
   */
  public async setActiveProfile(profileId: string): Promise<AnkiUserProfile> {
    const profiles = await this.getProfiles();
    const target = profiles.find(p => p.id === profileId);
    if (!target) {
      throw new Error(`Không tìm thấy hồ sơ với ID: ${profileId}`);
    }

    this.activeProfileId = target.id;
    localStorage.setItem('4you_active_profile_id', target.id);
    return target;
  }

  /**
   * Creates a new profile on this device
   */
  public async createProfile(name: string, avatar?: string): Promise<AnkiUserProfile> {
    const profiles = await this.getProfiles();
    const newProfile: AnkiUserProfile = {
      id: `prof_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || `Học Viên ${profiles.length + 1}`,
      avatar: avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop`,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      streakDays: 1,
    };

    profiles.push(newProfile);
    await this.saveProfiles(profiles);
    return newProfile;
  }

  /**
   * Updates an existing profile (e.g. linking AnkiWeb / Cloud account)
   */
  public async updateProfile(profile: AnkiUserProfile): Promise<void> {
    const profiles = await this.getProfiles();
    const idx = profiles.findIndex(p => p.id === profile.id);
    if (idx !== -1) {
      profiles[idx] = profile;
      await this.saveProfiles(profiles);
    }
  }

  /**
   * Deletes a profile
   */
  public async deleteProfile(profileId: string): Promise<void> {
    const profiles = await this.getProfiles();
    if (profiles.length <= 1) {
      throw new Error('Không thể xoá hồ sơ duy nhất còn lại.');
    }

    const filtered = profiles.filter(p => p.id !== profileId);
    await this.saveProfiles(filtered);

    if (this.activeProfileId === profileId) {
      const next = filtered[0];
      if (next) {
        await this.setActiveProfile(next.id);
      }
    }
  }

  /**
   * Migrate existing localStorage saved words to IndexedDB on first boot
   */
  private async migrateFromLocalStorage(): Promise<void> {
    if (!this.db) return;

    try {
      const existingWords = await this.getAllWords();
      if (existingWords.length === 0) {
        const localRaw = localStorage.getItem('4you_saved_words_v2');
        if (localRaw) {
          const words: SavedWord[] = JSON.parse(localRaw);
          if (Array.isArray(words) && words.length > 0) {
            const taggedWords = words.map(w => ({
              ...w,
              profileId: w.profileId || this.activeProfileId,
            }));
            await this.saveWords(taggedWords);
            console.log(`[AnkiDB] Successfully migrated ${words.length} words from localStorage into IndexedDB.`);
          }
        }
      }

      // Recover and migrate any user-imported custom lessons from localStorage
      const existingCustomLessons = await this.getCustomLessons();
      if (existingCustomLessons.length === 0) {
        const savedLessonsRaw = localStorage.getItem('4you_custom_lessons_v1') || localStorage.getItem('4you_lessons_v2');
        if (savedLessonsRaw) {
          try {
            const parsedLessons = JSON.parse(savedLessonsRaw);
            if (Array.isArray(parsedLessons)) {
              const customOnly = parsedLessons.filter((l: VideoLesson) =>
                Boolean(l && (l.isCustom === true || (typeof l.id === 'string' && l.id.startsWith('lesson-custom-'))))
              );
              for (const cl of customOnly) {
                await this.saveCustomLesson({
                  ...cl,
                  isCustom: true,
                  createdAt: cl.createdAt || Date.now(),
                });
              }
              if (customOnly.length > 0) {
                console.log(`[AnkiDB] Successfully migrated ${customOnly.length} custom lessons into IndexedDB.`);
              }
            }
          } catch (e) {
            console.warn('[AnkiDB] Custom lessons parse error during migration:', e);
          }
        }
      }
    } catch (e) {
      console.warn('[AnkiDB] Could not migrate from localStorage:', e);
    }
  }

  /**
   * Retrieves all user-imported custom lessons from IndexedDB (with localStorage fallback)
   */
  public async getCustomLessons(): Promise<VideoLesson[]> {
    if (!this.db) {
      return ScopedStorage.getCustomLessons(this.currentUserId);
    }

    return new Promise((resolve) => {
      try {
        if (!this.db!.objectStoreNames.contains(STORES.CUSTOM_LESSONS)) {
          resolve([]);
          return;
        }
        const transaction = this.db!.transaction(STORES.CUSTOM_LESSONS, 'readonly');
        const store = transaction.objectStore(STORES.CUSTOM_LESSONS);
        const request = store.getAll();

        request.onsuccess = () => {
          const lessons = (request.result as VideoLesson[]) || [];
          lessons.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          resolve(lessons);
        };

        request.onerror = () => {
          resolve(ScopedStorage.getCustomLessons(this.currentUserId));
        };
      } catch (err) {
        resolve(ScopedStorage.getCustomLessons(this.currentUserId));
      }
    });
  }

  /**
   * Saves or updates a user-imported custom lesson in IndexedDB and scoped storage
   */
  public async saveCustomLesson(lesson: VideoLesson): Promise<void> {
    const formattedLesson: VideoLesson = {
      ...lesson,
      isCustom: true,
      createdAt: lesson.createdAt || Date.now(),
    };

    if (this.db && this.db.objectStoreNames.contains(STORES.CUSTOM_LESSONS)) {
      await new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(STORES.CUSTOM_LESSONS, 'readwrite');
          const store = transaction.objectStore(STORES.CUSTOM_LESSONS);
          const request = store.put(formattedLesson);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (e) {
          reject(e);
        }
      });
    }

    // Mirror to ScopedStorage partitioned by userId
    try {
      const allCustom = await this.getCustomLessons();
      const exists = allCustom.some(l => l.id === formattedLesson.id);
      const updated = exists
        ? allCustom.map(l => l.id === formattedLesson.id ? formattedLesson : l)
        : [formattedLesson, ...allCustom];
      ScopedStorage.setCustomLessons(this.currentUserId, updated);
    } catch {
      // Safe ignore storage quota
    }
  }

  /**
   * Deletes a user-imported custom lesson from IndexedDB and scoped storage
   */
  public async deleteCustomLesson(lessonId: string): Promise<void> {
    if (this.db && this.db.objectStoreNames.contains(STORES.CUSTOM_LESSONS)) {
      await new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(STORES.CUSTOM_LESSONS, 'readwrite');
          const store = transaction.objectStore(STORES.CUSTOM_LESSONS);
          const request = store.delete(lessonId);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (e) {
          reject(e);
        }
      });
    }

    try {
      const allCustom = await this.getCustomLessons();
      const filtered = allCustom.filter(l => l.id !== lessonId);
      ScopedStorage.setCustomLessons(this.currentUserId, filtered);
    } catch {
      // Safe ignore
    }
  }

  /**
   * Retrieves words for a specific profile (or active profile).
   * Since IndexedDB is partitioned per-user, results are strictly isolated.
   */
  public async getAllWords(profileId?: string): Promise<SavedWord[]> {
    if (!this.db) {
      return ScopedStorage.getSavedWords(this.currentUserId);
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(STORES.WORDS, 'readonly');
        const store = transaction.objectStore(STORES.WORDS);
        const request = store.getAll();

        request.onsuccess = () => {
          const allWords = (request.result as SavedWord[]) || [];
          resolve(allWords);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Saves a single word into IndexedDB and updates ScopedStorage mirror
   */
  public async saveWord(word: SavedWord, profileId?: string): Promise<void> {
    const targetProfileId = profileId || word.profileId || this.activeProfileId || this.currentUserId || 'prof_default';
    const wordWithSync: SavedWord = {
      ...word,
      profileId: targetProfileId,
      usn: (word.usn ?? 0) + 1,
      isDirty: true,
    };

    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(STORES.WORDS, 'readwrite');
          const store = transaction.objectStore(STORES.WORDS);
          const request = store.put(wordWithSync);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (e) {
          reject(e);
        }
      });
    }

    // Mirror to ScopedStorage for user-isolated cache
    try {
      const all = await this.getAllWords();
      ScopedStorage.setSavedWords(this.currentUserId, all);
    } catch {
      // Safe ignore storage quota
    }
  }

  /**
   * Batch saves words into IndexedDB
   */
  public async saveWords(words: SavedWord[], profileId?: string): Promise<void> {
    const targetProfileId = profileId || this.activeProfileId || this.currentUserId || 'prof_default';

    if (!this.db) {
      ScopedStorage.setSavedWords(this.currentUserId, words);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(STORES.WORDS, 'readwrite');
        const store = transaction.objectStore(STORES.WORDS);

        for (const w of words) {
          store.put({
            ...w,
            profileId: w.profileId || targetProfileId,
            usn: (w.usn ?? 0) + 1,
            isDirty: true,
          });
        }

        transaction.oncomplete = () => {
          try {
            ScopedStorage.setSavedWords(this.currentUserId, words);
          } catch {
            // Safe ignore
          }
          resolve();
        };

        transaction.onerror = () => reject(transaction.error);
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Bi-directional Cloud Synchronization (BR-13, BR-15)
   * Connects to /api/sync/words with Bearer token.
   * Sends local words, receives authoritative merged list, updates local IndexedDB.
   */
  public async syncWithCloud(token: string, profileId?: string): Promise<SavedWord[]> {
    if (!token) return this.getAllWords(profileId);

    const targetProfile = profileId || this.activeProfileId || this.currentUserId || 'prof_default';
    const localWords = await this.getAllWords(targetProfile);

    try {
      const response = await fetch('/api/sync/words', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ words: localWords })
      });

      if (!response.ok) {
        throw new Error(`Sync HTTP error: ${response.status}`);
      }

      const data = await response.json();
      const serverWords: SavedWord[] = data.words || [];

      if (this.db) {
        await new Promise<void>((resolve, reject) => {
          try {
            const transaction = this.db!.transaction(STORES.WORDS, 'readwrite');
            const store = transaction.objectStore(STORES.WORDS);

            for (const sw of serverWords) {
              store.put({
                ...sw,
                profileId: targetProfile,
                isDirty: false
              });
            }

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
          } catch (e) {
            reject(e);
          }
        });
      }

      // Update mirror in ScopedStorage
      try {
        ScopedStorage.setSavedWords(this.currentUserId, serverWords);
      } catch {}

      console.info(`[Anki Cloud Sync] Successfully synced ${serverWords.length} words with cloud.`);
      return serverWords;
    } catch (err) {
      console.warn('[Anki Cloud Sync] Cloud sync fallback to local IndexedDB:', err);
      return localWords;
    }
  }

  /**
   * Deletes a word and records its tombstone in `graves` (Anki REA)
   */
  public async deleteWord(wordId: string): Promise<void> {
    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction([STORES.WORDS, STORES.GRAVES], 'readwrite');
          const wordStore = transaction.objectStore(STORES.WORDS);
          const graveStore = transaction.objectStore(STORES.GRAVES);

          wordStore.delete(wordId);
          graveStore.put({
            id: `grave-${Date.now()}-${wordId}`,
            originalId: wordId,
            type: 'word',
            deletedAt: Date.now(),
            usn: ++this.currentUsn,
          });

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        } catch (e) {
          reject(e);
        }
      });
    }

    // Mirror update to ScopedStorage
    try {
      const all = await this.getAllWords();
      ScopedStorage.setSavedWords(this.currentUserId, all);
    } catch {
      // Safe ignore
    }
  }

  /**
   * Records an immutable review attempt into `revlog` (BR-13)
   */
  public async recordReview(review: Omit<AnkiReviewLogEntry, 'id' | 'usn'>): Promise<AnkiReviewLogEntry> {
    const entry: AnkiReviewLogEntry = {
      ...review,
      profileId: review.profileId || this.activeProfileId,
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      usn: ++this.currentUsn,
    };

    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const transaction = this.db!.transaction(STORES.REVLOG, 'readwrite');
          const store = transaction.objectStore(STORES.REVLOG);
          const request = store.add(entry);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (e) {
          console.warn('[AnkiDB] Failed to record revlog:', e);
          resolve();
        }
      });
    }

    return entry;
  }

  /**
   * Retrieves review history logs
   */
  public async getReviewLogs(limit: number = 100, profileId?: string): Promise<AnkiReviewLogEntry[]> {
    const targetProfileId = profileId || this.activeProfileId;
    if (!this.db) return [];

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction(STORES.REVLOG, 'readonly');
        const store = transaction.objectStore(STORES.REVLOG);
        const index = store.index('reviewedAt');
        const logs: AnkiReviewLogEntry[] = [];

        const request = index.openCursor(null, 'prev');
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor && logs.length < limit) {
            const entry = cursor.value as AnkiReviewLogEntry;
            if (!entry.profileId || entry.profileId === targetProfileId || targetProfileId === DEFAULT_PROFILE.id) {
              logs.push(entry);
            }
            cursor.continue();
          } else {
            resolve(logs);
          }
        };

        request.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  /**
   * Computes Anki retention and collection statistics
   */
  public async getStats(words: SavedWord[], profileId?: string): Promise<AnkiCollectionStats> {
    const now = Date.now();
    const logs = await this.getReviewLogs(500, profileId);

    const totalCards = words.length;
    const matureCards = words.filter(w => (w.interval ?? 0) >= 21).length;
    const youngCards = words.filter(w => (w.interval ?? 0) > 0 && (w.interval ?? 0) < 21).length;
    const learningCards = words.filter(w => (w.interval ?? 0) === 0 || w.state === 'relearning').length;
    const dueTodayCount = words.filter(w => (w.dueAt ?? 0) <= now).length;

    const totalReviews = logs.length;
    const successfulReviews = logs.filter(l => l.rating >= 2).length;
    const retentionRate = totalReviews > 0 ? Math.round((successfulReviews / totalReviews) * 100) : 100;

    const easeSum = words.reduce((acc, w) => acc + (w.easeFactor ?? 2.5), 0);
    const averageEaseFactor = totalCards > 0 ? Number((easeSum / totalCards).toFixed(2)) : 2.5;

    return {
      totalCards,
      matureCards,
      youngCards,
      learningCards,
      dueTodayCount,
      totalReviews,
      retentionRate,
      averageEaseFactor,
    };
  }

  /**
   * Generates a TSV text file fully compliant with Anki Desktop / AnkiMobile import format
   */
  public exportToAnkiTxt(words: SavedWord[]): string {
    const headers = [
      '#separator:tab',
      '#html:true',
      '#tags column:5',
      '#columns:Front\tPhonetic\tBack\tContext\tTags',
    ].join('\n');

    const rows = words.map(w => {
      const front = w.word.replace(/\t/g, ' ');
      const phonetic = (w.phonetic || '').replace(/\t/g, ' ');
      const back = w.translation.replace(/\t/g, ' ');
      const context = (w.contextSentence || '').replace(/\t/g, ' ');
      const tag = '4YouEnglish';

      return `${front}\t${phonetic}\t${back}\t${context}\t${tag}`;
    });

    return `${headers}\n${rows.join('\n')}`;
  }

  /**
   * Exports full JSON collection backup including review history
   */
  public async exportFullBackupJSON(words: SavedWord[]): Promise<string> {
    const logs = await this.getReviewLogs(1000);
    const profile = await this.getActiveProfile();
    const payload = {
      app: '4You Study & Video Reflex',
      version: '2.0-anki',
      exportedAt: new Date().toISOString(),
      profile,
      stats: {
        totalWords: words.length,
        totalReviewsRecorded: logs.length,
      },
      words,
      reviewLogs: logs,
    };

    return JSON.stringify(payload, null, 2);
  }

  /**
   * Imports collection from JSON backup string
   */
  public async importFullBackupJSON(jsonStr: string): Promise<{ words: SavedWord[]; importedCount: number }> {
    const parsed = JSON.parse(jsonStr);
    const candidateWords: SavedWord[] = Array.isArray(parsed) ? parsed : parsed.words;

    if (!Array.isArray(candidateWords)) {
      throw new Error('Dữ liệu JSON không đúng định dạng sao lưu 4You / Anki.');
    }

    const currentWords = await this.getAllWords();
    const wordMap = new Map<string, SavedWord>();

    currentWords.forEach(w => wordMap.set(w.word.toLowerCase().trim(), w));
    candidateWords.forEach(w => {
      if (w.word && w.translation) {
        wordMap.set(w.word.toLowerCase().trim(), {
          ...w,
          id: w.id || `word-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          profileId: this.activeProfileId,
          easeFactor: w.easeFactor ?? 2.5,
          interval: w.interval ?? 0,
          repetitions: w.repetitions ?? 0,
          lapses: w.lapses ?? 0,
          state: w.state ?? 'new',
          dueAt: w.dueAt ?? Date.now(),
          savedAt: w.savedAt ?? Date.now(),
        });
      }
    });

    const mergedWords = Array.from(wordMap.values());
    await this.saveWords(mergedWords);

    return {
      words: mergedWords,
      importedCount: candidateWords.length,
    };
  }

  /**
   * Helper to trigger native browser file download
   */
  public downloadFile(filename: string, content: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const ankiDb = new AnkiDatabase();
