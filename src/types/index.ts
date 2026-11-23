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
  videoUrl?: string; // Optional direct MP4 URL (local public/reels/ or Cloudflare R2) for 0ms HTML5 <video> playback
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
  initialSubIndex?: number;
  // Real American Reels metadata
  expression?: string;
  expressionMeaningVi?: string;
  americanUsageNote?: string;
  reelCategory?: ReelCategory;
  register?: ReelRegister;
  srsWordId?: string;
  isSrsReviewClip?: boolean;
}

export type ReelCategory = 'daily_life' | 'work_talk' | 'my_videos';
export type ReelRegister = 'casual_us' | 'workplace_us' | 'everyday';

export interface DailyReelProgress {
  date: string; // YYYY-MM-DD (local date)
  completedReelIds: string[];
  dailyGoal: number;
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

export interface ContextExplanation {
  phrase: string;
  meaningVi: string;
  sentenceVi?: string;
  nuance: string;
  grammarNote: string;
  examples: Array<{ en: string; vi: string }>;
  source?: string;
  isFallback?: boolean;
  fallbackReason?: 'missing_gemini_key' | 'gemini_error' | string;
  quota?: {
    used: number;
    limit: number | null;
    unlimited: boolean;
  };
}

export interface SentenceEvaluationResult {
  targetWord: string;
  userSentence: string;
  scenario: 'work' | 'daily';
  score: number;
  isCorrectUsage: boolean;
  feedbackVi: string;
  naturalVersion: string;
  collocationTip: string;
  source?: string;
  isFallback?: boolean;
  quota?: {
    used: number;
    limit: number | null;
    unlimited: boolean;
  };
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
  sourceLessonId?: string;
  sourceYoutubeId?: string;
  sourceTimestampSec?: number;
  savedAt: number;
  
  // Thuật toán SRS (Anki SM-2 legacy + FSRS-6 DSR Model)
  easeFactor: number; // Mặc định: 2.50 (250%), tối thiểu: 1.30
  interval: number;   // Khoảng cách ôn tiếp theo tính theo ngày
  repetitions: number;// Số lần nhớ đúng liên tiếp
  lapses: number;     // Số lần bị quên (ấn Again)
  state: CardState;   // Trạng thái thẻ
  dueAt: number;      // Thời điểm thẻ đến hạn ôn tập (timestamp ms)
  lastReviewedAt?: number;
  stability?: number; // FSRS-6: Số ngày để xác suất nhớ R giảm từ 100% xuống 90%
  difficulty?: number;// FSRS-6: Độ khó thực tế của thẻ (1.0 - 10.0)
  schedulerVersion?: 'fsrs6' | 'sm2';
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

// ==========================================
// ROLE-BASED ACCESS CONTROL (RBAC) CONTRACTS
// ==========================================
export type UserRole = 'guest' | 'user' | 'pro' | 'admin';

export type UserPermission = 
  | 'vocab:read'
  | 'vocab:write'
  | 'vocab:sync'
  | 'import:limited'
  | 'import:unlimited'
  | 'speech:ai_score'
  | 'admin:manage_users'
  | 'admin:view_metrics';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  permissions: UserPermission[];
  profileId: string;
  token?: string;
  createdAt: number;
}

// ==========================================
// NORMALIZED RELATIONAL ENTITIES (3NF)
// ==========================================
export interface WordMasterEntity {
  id: string;
  lemma: string;
  phonetic?: string;
  partOfSpeech?: string;
  defaultTranslationVi: string;
  definitionEn?: string;
  cefrLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  frequencyRank?: number;
  createdAt: number;
}

export interface VocabularyNoteEntity {
  id: string;
  userId: string;
  profileId: string;
  wordId: string;
  customTranslation?: string;
  contextSentence?: string;
  contextTranslation?: string;
  sourceType: 'youtube' | 'custom' | 'shorts';
  sourceLessonId?: string;
  sourceVideoTitle?: string;
  sourceTimestampSec?: number;
  createdAt: number;
  updatedAt: number;
}

export interface SRSCardEntity {
  id: string;
  noteId: string;
  userId: string;
  profileId: string;
  cardType: 'recognition' | 'dictation' | 'shadowing';
  state: CardState;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  dueAt: number;
  lastReviewedAt?: number;
  usn: number;
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

// ==========================================
// STRUCTURED CURRICULUM (IELTS + CEFR ROADMAP)
// ==========================================
export type CurriculumTrackType = 'grammar' | 'ielts_topics' | 'cefr_vocab';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface CurriculumWordItem {
  id: string;
  word: string;
  ipaUs: string;
  ipaUk?: string;
  pos: string;
  cefr: CefrLevel;
  topic: string;
  meaningVi: string;
  definitionEn: string;
  exampleDailyEn: string;
  exampleIeltsEn: string;
  collocations: string[];
  synonyms: string[];
}

export interface CurriculumVocabLesson {
  id: string;
  lessonNumber: number;
  title: string;
  wordCount: number;
  words: CurriculumWordItem[];
}

export interface CurriculumGrammarExercise {
  question: string;
  options: string[];
  correctAnswer: number;
  explanationVi: string;
}

export interface CurriculumGrammarLesson {
  id: string;
  lessonNumber: number;
  category: string;
  title: string;
  titleVi: string;
  cefr: CefrLevel;
  formula: string;
  explanationVi: string;
  ieltsTipVi: string;
  examples: Array<{ en: string; vi: string }>;
  commonMistake: {
    wrong: string;
    right: string;
    whyVi: string;
  };
  exercises: CurriculumGrammarExercise[];
}

export interface CurriculumUnitMeta {
  id: string;
  slug: string;
  cefr?: CefrLevel;
  order: number;
  titleEn: string;
  titleVi: string;
  descVi: string;
  color?: string;
  totalWords?: number;
  totalLessons: number;
  dataPath: string;
}

export interface CurriculumVocabUnitData {
  id: string;
  slug: string;
  cefr?: CefrLevel;
  trackType: 'ielts_topics' | 'cefr_vocab';
  order: number;
  titleEn: string;
  titleVi: string;
  descVi: string;
  color?: string;
  totalWords: number;
  totalLessons: number;
  lessons: CurriculumVocabLesson[];
}

export interface CurriculumGrammarUnitData {
  id: string;
  slug: string;
  cefr: CefrLevel;
  trackType: 'grammar';
  order: number;
  titleVi: string;
  descVi: string;
  totalLessons: number;
  lessons: CurriculumGrammarLesson[];
}

export interface CurriculumManifest {
  version: string;
  generatedAt: string;
  attributions: Array<{ name: string; url: string; license: string }>;
  stats: {
    totalIeltsTopics: number;
    totalIeltsWords: number;
    totalCefrWords: number;
    totalGrammarLessons: number;
  };
  ieltsTopics: CurriculumUnitMeta[];
  cefrVocab: CurriculumUnitMeta[];
  grammar: CurriculumUnitMeta[];
}

export interface LessonCompletionRecord {
  flashcardsDone?: boolean;
  quizBestScore?: number; // 0..100
  quizPassed?: boolean;
  dictationDone?: boolean;
  pronunciationDone?: boolean;
  stars: number; // 0..3
  updatedAt: number;
}

export interface CurriculumProgressState {
  lessons: Record<string, LessonCompletionRecord>;
  unlockedUnits: Record<string, boolean>;
  placementScores: Record<string, number>;
}

export interface ActivePracticeMission {
  id: string;
  mode: 'roleplay' | 'writing';
  sourceTitle: string;
  topicName: string;
  cefr: CefrLevel;
  targetWords: Array<{ word: string; meaningVi: string; exampleEn?: string }>;
  grammarFocus?: { title: string; formula: string };
  createdAt: number;
}
