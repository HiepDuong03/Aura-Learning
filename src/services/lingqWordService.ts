import { LingQWordStatus, SubtitleLine, SavedWord } from '../types';
import { tokenizeText } from '../utils/textTokenizer';

const LINGQ_STORAGE_KEY = '4you_lingq_words';

// Common stop words that are automatically considered known (so we don't spam users with blue on 'the', 'is', 'a')
const COMMON_KNOWN_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'is', 'am', 'are', 'was', 'were', 'been', 'being', 'has', 'had', 'did', 'does'
]);

class LingQWordService {
  private statusMap: Map<string, LingQWordStatus> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const saved = localStorage.getItem(LINGQ_STORAGE_KEY);
      if (saved) {
        const records: Record<string, LingQWordStatus> = JSON.parse(saved);
        Object.entries(records).forEach(([word, status]) => {
          this.statusMap.set(word.toLowerCase(), status);
        });
      }

      // Synchronize with existing Anki SavedWords
      const savedWordsRaw = localStorage.getItem('4you_saved_words');
      if (savedWordsRaw) {
        const savedWords: SavedWord[] = JSON.parse(savedWordsRaw);
        savedWords.forEach(sw => {
          const w = sw.word.toLowerCase();
          if (!this.statusMap.has(w)) {
            if (sw.interval >= 21) {
              this.statusMap.set(w, 4); // Known
            } else if (sw.interval >= 7) {
              this.statusMap.set(w, 3); // Learning 3
            } else if (sw.interval >= 2) {
              this.statusMap.set(w, 2); // Learning 2
            } else {
              this.statusMap.set(w, 1); // Learning 1
            }
          }
        });
      }
    } catch (e) {
      console.warn('Failed to load LingQ words from storage', e);
    }
  }

  private saveToStorage() {
    try {
      const obj: Record<string, LingQWordStatus> = {};
      this.statusMap.forEach((status, word) => {
        obj[word] = status;
      });
      localStorage.setItem(LINGQ_STORAGE_KEY, JSON.stringify(obj));
      this.notifyListeners();
    } catch (e) {
      console.warn('Failed to save LingQ words', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn());
  }

  /**
   * Get LingQ status of a given word.
   * 0: New (Blue)
   * 1: Learning 1 (Yellow dark)
   * 2: Learning 2 (Yellow light)
   * 3: Learning 3 (Greenish / near known)
   * 4: Known (Normal)
   * 5: Ignored
   */
  public getWordStatus(rawWord: string): LingQWordStatus {
    const clean = rawWord.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
    if (!clean || clean.length <= 1) return 4; // Single characters (a, I) are known

    if (this.statusMap.has(clean)) {
      return this.statusMap.get(clean)!;
    }

    // Common words default to Known (Status 4) so transcript is not cluttered
    if (COMMON_KNOWN_WORDS.has(clean)) {
      return 4;
    }

    // Pure numbers are considered Known
    if (/^\d+$/.test(clean)) {
      return 4;
    }

    return 0; // Default: New word (Blue)
  }

  public setWordStatus(rawWord: string, status: LingQWordStatus) {
    const clean = rawWord.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
    if (!clean) return;

    this.statusMap.set(clean, status);
    this.saveToStorage();
  }

  public markAsKnown(rawWord: string) {
    this.setWordStatus(rawWord, 4);
  }

  public markAsIgnored(rawWord: string) {
    this.setWordStatus(rawWord, 5);
  }

  public cycleWordStatus(rawWord: string): LingQWordStatus {
    const current = this.getWordStatus(rawWord);
    let next: LingQWordStatus = 1;

    if (current === 0) next = 1;
    else if (current === 1) next = 2;
    else if (current === 2) next = 3;
    else if (current === 3) next = 4;
    else if (current === 4) next = 1;
    else next = 1;

    this.setWordStatus(rawWord, next);
    return next;
  }

  /**
   * Analyze all vocabulary in a lesson and return stats:
   * % Known, count of New words, Learning words, Known words.
   */
  public getLessonVocabularyStats(subtitles: SubtitleLine[]) {
    const uniqueWords = new Set<string>();

    subtitles.forEach(sub => {
      const tokens = tokenizeText(sub.text);
      tokens.forEach(token => {
        if (token.isWord) {
          const clean = token.text.toLowerCase().replace(/^[^\w]+|[^\w]+$/g, '');
          if (clean && clean.length > 1 && !/^\d+$/.test(clean)) {
            uniqueWords.add(clean);
          }
        }
      });
    });

    let newCount = 0;
    let learningCount = 0;
    let knownCount = 0;

    uniqueWords.forEach(word => {
      const status = this.getWordStatus(word);
      if (status === 0) newCount++;
      else if (status >= 1 && status <= 3) learningCount++;
      else if (status === 4) knownCount++;
    });

    const totalUnique = uniqueWords.size;
    const percentKnown = totalUnique > 0 ? Math.round((knownCount / totalUnique) * 100) : 100;

    return {
      totalWords: totalUnique,
      newCount,
      learningCount,
      knownCount,
      percentKnown
    };
  }

  /**
   * Tailwind CSS styling for each LingQ status.
   */
  public getBadgeStyle(status: LingQWordStatus): string {
    switch (status) {
      case 0:
        // Status 0 (New Word): Subtle blue badge encouraging lookup
        return 'bg-blue-50/90 text-blue-800 border-b-2 border-blue-400 font-medium px-0.5 rounded-xs transition-colors hover:bg-blue-100 cursor-pointer';
      case 1:
        // Status 1 (LingQ 1): Rich warm yellow
        return 'bg-amber-100 text-amber-950 border-b-2 border-amber-400 font-medium px-0.5 rounded-xs transition-colors hover:bg-amber-200 cursor-pointer';
      case 2:
        // Status 2 (LingQ 2): Light yellow
        return 'bg-yellow-50 text-yellow-900 border-b border-yellow-300 font-medium px-0.5 rounded-xs transition-colors hover:bg-yellow-100 cursor-pointer';
      case 3:
        // Status 3 (LingQ 3): Near known (subtle dot / faint green)
        return 'text-emerald-900 border-b border-emerald-300 font-medium px-0.5 rounded-xs transition-colors hover:bg-emerald-50 cursor-pointer';
      case 4:
      case 5:
      default:
        // Status 4 (Known) / Ignored: Clean standard text
        return 'text-slate-800 hover:text-teal-700 hover:bg-slate-100 px-0.5 rounded-xs transition-colors cursor-pointer';
    }
  }

  /**
   * Status label in Vietnamese.
   */
  public getStatusLabel(status: LingQWordStatus): { label: string; color: string } {
    switch (status) {
      case 0: return { label: 'Từ mới', color: 'bg-blue-500 text-white' };
      case 1: return { label: 'Mới lưu (1 ngày)', color: 'bg-amber-500 text-white' };
      case 2: return { label: 'Đang nhớ (3-6 ngày)', color: 'bg-yellow-500 text-white' };
      case 3: return { label: 'Gần thuộc (14 ngày)', color: 'bg-emerald-600 text-white' };
      case 4: return { label: 'Đã thuộc (Known)', color: 'bg-slate-600 text-white' };
      case 5: return { label: 'Bỏ qua (Ignore)', color: 'bg-slate-400 text-white' };
    }
  }
}

export const lingqWordService = new LingQWordService();
