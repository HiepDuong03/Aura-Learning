export interface SubtitleLine {
  id: string;
  start: number; // in seconds
  end: number;
  text: string;
  translation: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface VideoLesson {
  id: string;
  youtubeId: string;
  title: string;
  channel: string;
  channelAvatar?: string;
  thumbnail: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  topic: string;
  duration: string;
  durationSec: number;
  views: string;
  description: string;
  subtitles: SubtitleLine[];
  quizzes: QuizQuestion[];
  subtitleOffset?: number; // Custom subtitle calibration in seconds (e.g. -0.2s or +0.3s)
  isShort?: boolean;
  isCustom?: boolean; // Flag to identify user-imported lessons
  createdAt?: number; // Timestamp of import/creation
  startSeconds?: number;
  endSeconds?: number;
  targetWord?: string;
  targetContext?: string;
  sourceLessonTitle?: string;
}

export interface WordDefinition {
  word: string;
  phonetic?: string;
  partOfSpeech: string;
  translation: string;
  definitionEn: string;
  exampleEn?: string;
  exampleVi?: string;
  synonyms?: string[];
}

export type AnkiRating = 1 | 2 | 3 | 4; // 1: Again, 2: Hard, 3: Good, 4: Easy
export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface ReviewLog {
  reviewedAt: number;
  rating: AnkiRating;
  scheduledDays: number;
  easeFactor: number;
}

export interface SavedWord {
  id: string;
  word: string;
  phonetic: string;
  partOfSpeech: string;
  translation: string;
  definitionEn: string;
  exampleEn?: string;
  contextSentence?: string;
  videoTitle?: string;
  savedAt: number;
  
  // Thuật toán Anki SM-2 Core Parameters
  easeFactor: number; // Mặc định: 2.50 (250%), tối thiểu: 1.30
  interval: number;   // Khoảng cách ôn tiếp theo tính theo ngày
  repetitions: number;// Số lần nhớ đúng liên tiếp
  lapses: number;     // Số lần bị quên (ấn Again)
  state: CardState;   // Trạng thái thẻ
  dueAt: number;      // Thời điểm thẻ đến hạn ôn tập (timestamp ms)
  lastReviewedAt?: number;
  reviewLogs?: ReviewLog[];
  usn?: number;       // Anki Update Sequence Number
  isDirty?: boolean;  // Cờ báo dữ liệu đã sửa cục bộ chưa đồng bộ
  profileId?: string; // ID của Anki Profile sở hữu thẻ này
}

export interface AnkiUserProfile {
  id: string;
  name: string;
  avatar: string;
  createdAt: number;
  lastActiveAt: number;
  streakDays: number;
  cloudAccount?: {
    email: string;
    isLinked: boolean;
    lastSyncedAt?: number;
  };
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  profileId: string;
  token?: string;
  createdAt: number;
}

export interface AnkiReviewLogEntry {
  id: string;
  wordId: string;
  word: string;
  rating: AnkiRating; // 1: Again, 2: Hard, 3: Good, 4: Easy
  interval: number;
  lastInterval: number;
  easeFactor: number;
  timeSpentMs?: number;
  reviewedAt: number;
  usn: number;
  profileId?: string;
}

export interface AnkiCollectionStats {
  totalCards: number;
  matureCards: number; // interval >= 21 days
  youngCards: number;  // interval < 21 days
  learningCards: number;
  dueTodayCount: number;
  totalReviews: number;
  retentionRate: number; // percentage of successful reviews (ratings 2, 3, 4)
  averageEaseFactor: number;
}

// Trạng thái nhận diện từ vựng chuẩn LingQ (4-Status Color Matrix)
export type LingQWordStatus = 
  | 0  // New Word (Chưa gặp bao giờ - Xanh dương)
  | 1  // Learning 1 (Mới lưu thẻ - Vàng đậm, 1 ngày)
  | 2  // Learning 2 (Đang nhớ - Vàng nhạt, 3-6 ngày)
  | 3  // Learning 3 (Gần thuộc - Xanh lá nhạt, 14 ngày)
  | 4  // Known Word (Đã thuần thục - Chữ bình thường)
  | 5; // Ignored (Tên riêng, bỏ qua)

export interface LingQWordRecord {
  word: string;
  status: LingQWordStatus;
  updatedAt: number;
}

export type LessonSourceType = 'youtube' | 'file_srt_vtt' | 'text_article';
