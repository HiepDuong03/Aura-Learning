import { SavedWord, AnkiRating, CardState } from '../types';

export const ANKI_CONSTANTS = {
  INITIAL_EASE_FACTOR: 2.5,
  MIN_EASE_FACTOR: 1.3,
  HARD_FACTOR: 1.2,
  EASY_BONUS: 1.3,
  MAX_INTERVAL: 365, // Max 1 year cap to prevent runaway intervals
  // Initial intervals for new cards (in days)
  GRADUATING_INTERVAL_GOOD: 1,
  GRADUATING_INTERVAL_EASY: 4,
};

/**
 * Fuzz Factor: Tránh hiện tượng dồn thẻ (Bunching)
 * Thêm một độ lệch ngẫu nhiên nhỏ (±5%) khi interval >= 3 ngày
 */
export function applyFuzz(interval: number): number {
  if (interval < 3) return interval;
  const fuzzRange = Math.max(1, Math.round(interval * 0.05));
  const randomDelta = Math.floor(Math.random() * (fuzzRange * 2 + 1)) - fuzzRange;
  return Math.max(1, interval + randomDelta);
}

export interface AnkiCalculationResult {
  newEaseFactor: number;
  newInterval: number; // in days
  newRepetitions: number;
  newLapses: number;
  newState: CardState;
  dueAt: number; // timestamp ms
}

/**
 * Thuật toán tính toán chuẩn xác Anki SM-2
 * @param word Thẻ từ vựng hiện tại
 * @param rating 1: Again, 2: Hard, 3: Good, 4: Easy
 * @param skipFuzz Nếu true, bỏ qua độ lệch ngẫu nhiên (dùng khi preview trên nút)
 */
export function calculateAnkiSchedule(
  word: SavedWord,
  rating: AnkiRating,
  skipFuzz: boolean = false
): AnkiCalculationResult {
  let easeFactor = word.easeFactor || ANKI_CONSTANTS.INITIAL_EASE_FACTOR;
  let interval = word.interval || 0;
  let repetitions = word.repetitions || 0;
  let lapses = word.lapses || 0;
  let state: CardState = word.state || 'new';

  const ONE_DAY_MS = 86400000;

  switch (rating) {
    case 1: {
      // 🔴 AGAIN: Quên hoàn toàn
      lapses += 1;
      repetitions = 0;
      // Phạt giảm Ease Factor đi 0.20 (không bao giờ dưới 1.30)
      easeFactor = Math.max(ANKI_CONSTANTS.MIN_EASE_FACTOR, easeFactor - 0.2);
      interval = 1; // Reset về 1 ngày
      state = 'relearning';
      break;
    }

    case 2: {
      // 🟡 HARD: Nhớ vất vả
      // Phạt giảm Ease Factor đi 0.15
      easeFactor = Math.max(ANKI_CONSTANTS.MIN_EASE_FACTOR, easeFactor - 0.15);
      repetitions += 1;
      if (interval === 0) {
        interval = 1;
      } else {
        // Tăng chậm 1.2 lần
        interval = Math.max(interval + 1, Math.round(interval * ANKI_CONSTANTS.HARD_FACTOR));
      }
      state = 'review';
      break;
    }

    case 3: {
      // 🔵 GOOD: Nhớ chuẩn xác (điểm cân bằng lý tưởng)
      repetitions += 1;
      if (repetitions === 1) {
        interval = ANKI_CONSTANTS.GRADUATING_INTERVAL_GOOD;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      if (!skipFuzz) {
        interval = applyFuzz(interval);
      }
      state = 'review';
      break;
    }

    case 4: {
      // 🟢 EASY: Quá dễ, thuộc lòng
      // Thưởng tăng Ease Factor thêm 0.15
      easeFactor += 0.15;
      repetitions += 1;
      if (repetitions === 1) {
        interval = ANKI_CONSTANTS.GRADUATING_INTERVAL_EASY;
      } else {
        interval = Math.round(interval * easeFactor * ANKI_CONSTANTS.EASY_BONUS);
      }
      if (!skipFuzz) {
        interval = applyFuzz(interval);
      }
      state = 'review';
      break;
    }
  }

  // Cap interval to maximum 365 days (BR / Anki Best Practice)
  interval = Math.min(ANKI_CONSTANTS.MAX_INTERVAL, Math.max(1, interval));

  const now = Date.now();
  const dueAt = now + interval * ONE_DAY_MS;

  return {
    newEaseFactor: Math.round(easeFactor * 100) / 100,
    newInterval: interval,
    newRepetitions: repetitions,
    newLapses: lapses,
    newState: state,
    dueAt
  };
}

/**
 * Dự đoán số ngày sẽ lên lịch cho 4 nút (Again, Hard, Good, Easy)
 * Hiển thị trực quan trên giao diện giống hệt Anki (dùng skipFuzz = true để không bị nhảy số ngẫu nhiên)
 */
export function getAnkiIntervalPreviews(word: SavedWord): Record<AnkiRating, string> {
  const ratings: AnkiRating[] = [1, 2, 3, 4];
  const previews: Record<AnkiRating, string> = {
    1: '1 ngày',
    2: '2 ngày',
    3: '4 ngày',
    4: '7 ngày'
  };

  ratings.forEach((r) => {
    const res = calculateAnkiSchedule(word, r, true);
    if (res.newInterval === 1) {
      previews[r] = '1 ngày';
    } else if (res.newInterval < 30) {
      previews[r] = `${res.newInterval} ngày`;
    } else if (res.newInterval < 365) {
      previews[r] = `${Math.round(res.newInterval / 30)} tháng`;
    } else {
      previews[r] = `${(res.newInterval / 365).toFixed(1)} năm`;
    }
  });

  return previews;
}

/**
 * Tính toán xác suất ghi nhớ hiện tại (Retrievability R)
 * Dựa trên mô hình đường cong quên lãng Ebbinghaus: R(t) = exp(-t / S)
 */
export function calculateRetrievability(word: SavedWord): number {
  if (!word.lastReviewedAt || !word.interval || word.interval <= 0) {
    return 100;
  }
  const daysSinceLastReview = (Date.now() - word.lastReviewedAt) / 86400000;
  // Sấp xỉ độ bền Stability S qua interval
  const stability = word.interval;
  const retrievability = Math.exp(-daysSinceLastReview / Math.max(1, stability));
  return Math.max(0, Math.min(100, Math.round(retrievability * 100)));
}

/**
 * Kiểm tra xem thẻ từ vựng đã đến hạn ôn tập hay chưa (dueAt <= now)
 */
export function isCardDue(word: SavedWord, now: number = Date.now()): boolean {
  return !word.dueAt || word.dueAt <= now;
}

/**
 * Tính toán kết quả ôn tập và cập nhật toàn bộ thuộc tính Anki cho SavedWord
 */
export function calculateNextReview(word: SavedWord, rating: AnkiRating): SavedWord {
  const res = calculateAnkiSchedule(word, rating);
  return {
    ...word,
    easeFactor: res.newEaseFactor,
    interval: res.newInterval,
    repetitions: res.newRepetitions,
    lapses: res.newLapses,
    state: res.newState,
    dueAt: res.dueAt,
    lastReviewedAt: Date.now(),
    usn: (word.usn ?? 0) + 1,
    isDirty: true
  };
}

export const ankiScheduler = {
  calculateAnkiSchedule,
  calculateNextReview,
  isCardDue,
  getAnkiIntervalPreviews,
  calculateRetrievability,
  applyFuzz,
  constants: ANKI_CONSTANTS
};
