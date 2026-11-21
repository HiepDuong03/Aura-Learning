import { ReelCategory, ReelRegister, SubtitleLine, VideoLesson } from '../types';

export type ReelTopicFilter = 'all' | ReelCategory;

interface ExpressionCatalogItem {
  expression: string;
  pattern: RegExp;
  meaningVi: string;
  usageNote: string;
  category: Exclude<ReelCategory, 'my_videos'>;
  register: ReelRegister;
}

/**
 * High-frequency real American English expressions (phrasal verbs, idioms, spoken chunks)
 * mined automatically from user-imported YouTube videos & existing lessons.
 */
const AMERICAN_EXPRESSION_CATALOG: ExpressionCatalogItem[] = [
  {
    expression: 'figure out',
    pattern: /\bfigur(?:e|es|ed|ing)\s+(?:it\s+|this\s+|that\s+)?out\b/i,
    meaningVi: 'Tìm ra cách giải quyết / Hiểu ra',
    usageNote: 'Phrasal verb cửa miệng của người Mỹ khi xử lý vấn đề khó trong đời sống & công việc.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'work out',
    pattern: /\bwork(?:s|ed|ing)?\s+out\b/i,
    meaningVi: 'Ổn thỏa / Suôn sẻ (hoặc tập thể dục)',
    usageNote: 'Rất hay dùng để trấn an hoặc chốt giải pháp: "It will work out fine."',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'turn out',
    pattern: /\bturn(?:s|ed|ing)?\s+out\b/i,
    meaningVi: 'Hóa ra lại là / Kết quả thành ra',
    usageNote: 'Dùng khi kể về một kết quả bất ngờ trong cuộc sống hoặc review dự án.',
    category: 'work_talk',
    register: 'everyday'
  },
  {
    expression: 'no big deal',
    pattern: /\bno big deal\b/i,
    meaningVi: 'Chuyện nhỏ thôi / Không có gì to tát',
    usageNote: 'Cách đáp thân thiện kiểu Mỹ khi ai đó xin lỗi hoặc cảm ơn.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'sounds good',
    pattern: /\bsounds?\s+good\b/i,
    meaningVi: 'Nghe hay đấy / Chốt nhé!',
    usageNote: 'Câu đồng ý tự nhiên bậc nhất trong tiếng Mỹ hàng ngày.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'make sense',
    pattern: /\bmak(?:e|es|ing)\s+sense\b/i,
    meaningVi: 'Hợp lý / Có lý đấy',
    usageNote: 'Cực hay dùng trong họp: "That makes total sense!"',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'at the last minute',
    pattern: /\bat the last minute\b/i,
    meaningVi: 'Vào phút chót',
    usageNote: 'Diễn tả việc thay đổi kế hoạch hay nộp việc sát giờ.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'down the road',
    pattern: /\bdown the road\b/i,
    meaningVi: 'Về sau này / Trong tương lai',
    usageNote: 'Idiom công sở Mỹ hay gặp khi bàn về kế hoạch dài hạn.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'all set',
    pattern: /\ball set\b/i,
    meaningVi: 'Sẵn sàng / Xong xuôi hết rồi',
    usageNote: 'Dùng cực nhiều ở Mỹ khi kết thúc giao dịch hoặc hoàn tất chuẩn bị.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'end up',
    pattern: /\bend(?:s|ed|ing)?\s+up\b/i,
    meaningVi: 'Cuối cùng lại (rơi vào tình huống...)',
    usageNote: 'Diễn tả kết cục không lường trước: "We ended up grabbing tacos."',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'hang out',
    pattern: /\bhang(?:s|ing)?\s+out\b/i,
    meaningVi: 'Đi chơi / Tụ tập thư giãn',
    usageNote: 'Cách rủ bạn bè kiểu Mỹ: "Wanna hang out this weekend?"',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'catch up',
    pattern: /\bcatch(?:es|ing)?\s+up\b/i,
    meaningVi: 'Bắt kịp tiến độ / Hẹn hỏi thăm nhau',
    usageNote: 'Dùng cả ở công sở ("Let\'s catch up on Monday") lẫn bạn bè.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'come up with',
    pattern: /\bcam?e?\s+up\s+with\b|\bcoming\s+up\s+with\b/i,
    meaningVi: 'Nghĩ ra / Đề xuất ý tưởng',
    usageNote: 'Cụm vàng khi brainstorm: "We need to come up with a better plan."',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'look forward to',
    pattern: /\blook(?:s|ing)?\s+forward\s+to\b/i,
    meaningVi: 'Rất mong chờ điều gì đó',
    usageNote: 'Cụm lịch sự chuẩn mực để kết email hoặc cuộc gọi công việc.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'by the way',
    pattern: /\bby the way\b/i,
    meaningVi: 'Nhân tiện thì / À mà này...',
    usageNote: 'Cụm chuyển ý mượt mà trong mọi cuộc trò chuyện.',
    category: 'daily_life',
    register: 'everyday'
  },
  {
    expression: 'to be honest',
    pattern: /\bto be honest\b/i,
    meaningVi: 'Thật lòng mà nói thì...',
    usageNote: 'Dùng để mở đầu nhận xét thẳng thắn nhưng vẫn mềm mỏng.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'go ahead',
    pattern: /\bgo(?:es|ing)?\s+ahead\b/i,
    meaningVi: 'Cứ tự nhiên đi / Tiến hành luôn đi',
    usageNote: 'Rất hay nghe trong cuộc họp Zoom: "Go ahead, I\'m listening."',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'find out',
    pattern: /\bf(?:ind|inds|ound|inding)\s+out\b/i,
    meaningVi: 'Phát hiện ra / Tìm hiểu được',
    usageNote: 'Tự nhiên hơn nhiều so với "discover" trong lời nói hàng ngày.',
    category: 'daily_life',
    register: 'everyday'
  },
  {
    expression: 'keep going',
    pattern: /\bk(?:eep|eeps|ept|eeping)\s+going\b/i,
    meaningVi: 'Tiếp tục cố gắng / Đừng bỏ cuộc',
    usageNote: 'Câu động viên ngắn gọn, đầy năng lượng của người bản xứ.',
    category: 'daily_life',
    register: 'everyday'
  },
  {
    expression: 'start over',
    pattern: /\bstart(?:s|ed|ing)?\s+over\b/i,
    meaningVi: 'Bắt đầu lại từ đầu',
    usageNote: 'Cụm chuẩn Mỹ thay cho "begin again from the beginning".',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'drop out',
    pattern: /\bdrop(?:s|ped|ping)?\s+out\b/i,
    meaningVi: 'Bỏ học / Rút lui giữa chừng',
    usageNote: 'Phrasal verb thông dụng về việc dừng khóa học hoặc cuộc thi.',
    category: 'daily_life',
    register: 'everyday'
  },
  {
    expression: 'looking back',
    pattern: /\blooking back\b/i,
    meaningVi: 'Nhìn lại quá khứ thì...',
    usageNote: 'Mở đầu câu rút kinh nghiệm cực tự nhiên: "Looking back, we moved too fast."',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'weigh in',
    pattern: /\bweigh(?:s|ed|ing)?\s+in\b/i,
    meaningVi: 'Đóng góp ý kiến / Tham gia nhận xét',
    usageNote: 'Cực hay dùng trong họp Mỹ: "Feel free to weigh in on this proposal."',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'back and forth',
    pattern: /\bback and forth\b/i,
    meaningVi: 'Qua lại nhiều lần / Tranh luận tới lui',
    usageNote: 'Rất thông dụng khi nói về chuỗi email hoặc đàm phán kéo dài.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'on the other hand',
    pattern: /\bon the other hand\b/i,
    meaningVi: 'Mặt khác thì...',
    usageNote: 'Nối 2 góc nhìn trái chiều mượt mà khi thuyết trình hoặc phản biện.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'in all kinds of ways',
    pattern: /\bin all kinds of ways\b/i,
    meaningVi: 'Theo đủ mọi cách khác nhau',
    usageNote: 'Cách nói phóng khoáng tự nhiên thay cho "in various different ways".',
    category: 'daily_life',
    register: 'everyday'
  },
  {
    expression: 'begs the question',
    pattern: /\bbegs? the question\b/i,
    meaningVi: 'Đặt ra một câu hỏi lớn là...',
    usageNote: 'Cụm dẫn dắt vấn đề sắc sảo trong thảo luận và trình bày ý tưởng.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'had a falling out',
    pattern: /\bfalling out\b/i,
    meaningVi: 'Xảy ra mâu thuẫn / Cãi vã nghỉ chơi',
    usageNote: 'Diễn tả bất đồng quan điểm nghiêm trọng giữa đồng nghiệp hoặc bạn bè.',
    category: 'work_talk',
    register: 'casual_us'
  },
  {
    expression: 'let someone down',
    pattern: /\blet\s+[\w\s]{1,28}\s+down\b/i,
    meaningVi: 'Làm ai đó thất vọng',
    usageNote: 'Phrasal verb giàu cảm xúc: "I don\'t want to let the team down."',
    category: 'work_talk',
    register: 'everyday'
  },
  {
    expression: 'touch base',
    pattern: /\btouch(?:es|ed|ing)?\s+base\b/i,
    meaningVi: 'Liên hệ nhanh để cập nhật tình hình',
    usageNote: 'Câu cửa miệng số 1 dân văn phòng Mỹ: "Let\'s touch base tomorrow morning."',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'play it by ear',
    pattern: /\bplay(?:s|ed|ing)?\s+it\s+by\s+ear\b/i,
    meaningVi: 'Tùy cơ ứng biến / Tới đâu tính tới đó',
    usageNote: 'Idiom cực kỳ phổ biến khi chưa chốt kế hoạch cứng.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'wrap up',
    pattern: /\bwrap(?:s|ped|ping)?\s+up\b/i,
    meaningVi: 'Kết thúc / Chốt lại công việc hoặc cuộc họp',
    usageNote: 'Dùng ở cuối buổi họp: "Let\'s wrap up in five minutes."',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'on the same page',
    pattern: /\bon the same page\b/i,
    meaningVi: 'Cùng chung cách hiểu / Đồng thuận',
    usageNote: 'Câu chốt siêu chuẩn trong team Mỹ: "Just making sure we\'re all on the same page."',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'circle back',
    pattern: /\bcircl(?:e|es|ed|ing)\s+back\b/i,
    meaningVi: 'Quay lại bàn tiếp sau / để sau xử lý tiếp',
    usageNote: 'Cụm từ số 1 trong cuộc họp Mỹ khi tạm gác một chủ đề để xử lý sau.',
    category: 'work_talk',
    register: 'workplace_us'
  }
];

function normalizeKey(youtubeId: string, expression: string): string {
  return `${youtubeId.trim()}::${expression.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()}`;
}

/**
 * Mines short 10–25s Real American Reels automatically from user-imported videos
 * and existing lessons, deduplicating against already-curated reels.
 */
export function mineAmericanExpressionsFromLessons(
  lessons: VideoLesson[],
  existingReels: VideoLesson[] = [],
  maxPerLesson = 4
): VideoLesson[] {
  if (!Array.isArray(lessons) || lessons.length === 0) return [];

  const seenKeys = new Set<string>();
  for (const reel of existingReels) {
    if (reel?.youtubeId && (reel.expression || reel.targetWord)) {
      seenKeys.add(normalizeKey(reel.youtubeId, reel.expression || reel.targetWord || ''));
    }
  }

  // Prioritize user-imported custom lessons first so their own videos show up immediately
  const sortedLessons = [...lessons].sort((a, b) => Number(Boolean(b.isCustom)) - Number(Boolean(a.isCustom)));
  const mined: VideoLesson[] = [];

  for (const lesson of sortedLessons) {
    if (!lesson?.youtubeId || !Array.isArray(lesson.subtitles) || lesson.subtitles.length === 0) {
      continue;
    }

    let minedForThisLesson = 0;

    for (let idx = 0; idx < lesson.subtitles.length; idx++) {
      if (minedForThisLesson >= maxPerLesson) break;
      const line = lesson.subtitles[idx];
      if (!line?.text) continue;

      const catalogMatch = AMERICAN_EXPRESSION_CATALOG.find((item) => item.pattern.test(line.text));
      if (!catalogMatch) continue;

      const dedupeKey = normalizeKey(lesson.youtubeId, catalogMatch.expression);
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      const windowStartIdx = Math.max(0, idx - 1);
      const windowEndIdx = Math.min(lesson.subtitles.length - 1, idx + 1);
      const clipSubs: SubtitleLine[] = lesson.subtitles.slice(windowStartIdx, windowEndIdx + 1);
      const targetSubIndex = idx - windowStartIdx;

      const firstSub = clipSubs[0];
      const lastSub = clipSubs[clipSubs.length - 1];
      const clipStart = Math.max(0, Number(((firstSub?.start ?? line.start) - 0.5).toFixed(2)));
      const clipEnd = Math.max(clipStart + 6, Number(((lastSub?.end ?? line.end) + 1.5).toFixed(2)));
      const durationSec = Math.max(6, Math.round(clipEnd - clipStart));

      const matchedText = catalogMatch.pattern.exec(line.text)?.[0] || catalogMatch.expression;
      const reelCategory: ReelCategory = lesson.isCustom ? 'my_videos' : catalogMatch.category;

      mined.push({
        id: `mined-${lesson.id}-${idx}-${catalogMatch.expression.replace(/\s+/g, '-')}`,
        youtubeId: lesson.youtubeId,
        title: `${matchedText} — ${lesson.title}`,
        channel: lesson.channel || 'Video của bạn',
        thumbnail: lesson.thumbnail || `https://img.youtube.com/vi/${lesson.youtubeId}/hqdefault.jpg`,
        level: lesson.level || 'B1',
        topic: lesson.isCustom ? 'Từ video của bạn' : lesson.topic || 'Giao tiếp thực tế',
        duration: `00:${durationSec.toString().padStart(2, '0')}`,
        durationSec,
        views: lesson.views || 'My Video',
        description: catalogMatch.usageNote,
        subtitles: clipSubs,
        quizzes: [],
        isShort: true,
        isCustom: lesson.isCustom,
        startSeconds: clipStart,
        endSeconds: clipEnd,
        targetWord: matchedText,
        targetContext: line.text,
        sourceLessonTitle: lesson.title,
        initialSubIndex: targetSubIndex,
        expression: matchedText,
        expressionMeaningVi: catalogMatch.meaningVi,
        americanUsageNote: catalogMatch.usageNote,
        reelCategory,
        register: catalogMatch.register
      });

      minedForThisLesson += 1;
    }
  }

  return mined;
}

/**
 * Builds the Reels feed using Thematic Mini-Clustering (grouping 3 coherent clips per
 * topic cluster when filter === 'all') to mitigate short-video fragmentation & forgetting
 * (Nature Communications Psychology, May 2026).
 */
export function buildThematicReelsFeed(
  curatedReels: VideoLesson[],
  minedReels: VideoLesson[],
  topicFilter: ReelTopicFilter
): VideoLesson[] {
  const combined = [...curatedReels, ...minedReels];

  if (topicFilter !== 'all') {
    return combined.filter((item) => item.reelCategory === topicFilter);
  }

  const buckets: Record<ReelCategory, VideoLesson[]> = {
    daily_life: [],
    work_talk: [],
    my_videos: []
  };

  for (const item of combined) {
    const cat: ReelCategory = item.reelCategory || 'daily_life';
    buckets[cat].push(item);
  }

  // Interleave in coherent clusters of 3 clips per category (my_videos first if user imported any)
  const clusterSize = 3;
  const order: ReelCategory[] =
    buckets.my_videos.length > 0
      ? ['my_videos', 'daily_life', 'work_talk']
      : ['daily_life', 'work_talk'];

  const result: VideoLesson[] = [];
  const cursors: Record<ReelCategory, number> = { daily_life: 0, work_talk: 0, my_videos: 0 };

  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const cat of order) {
      const start = cursors[cat];
      if (start < buckets[cat].length) {
        result.push(...buckets[cat].slice(start, start + clusterSize));
        cursors[cat] = start + clusterSize;
        hasMore = true;
      }
    }
  }

  return result;
}

export interface ForYouFeedOptions {
  watchedIds?: Set<string>;
  sessionSeed?: number;
  srsReviewClips?: VideoLesson[];
  srsEveryN?: number;
}

/**
 * Deterministic seeded Fisher-Yates shuffle (Mulberry32) so each session gets a
 * fresh TikTok-like order without jumping on React re-renders.
 */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = (seed >>> 0) || 1;
  const nextRand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRand() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * TikTok "For You" + SRS Vocabulary Blending Engine:
 * 1. Always prioritizes unwatched Shorts first (pushes already-seen videos to the tail).
 * 2. Shuffles deterministically per session so reopening the app never repeats clip #1.
 * 3. Interleaves user's own SRS vocabulary review clips every `srsEveryN` videos so
 *    passive scrolling actively reinforces the words the user is studying.
 */
export function buildForYouReelsFeed(
  baseFeed: VideoLesson[],
  options: ForYouFeedOptions = {}
): VideoLesson[] {
  const {
    watchedIds = new Set<string>(),
    sessionSeed = 1,
    srsReviewClips = [],
    srsEveryN = 3
  } = options;

  const isWatched = (item: VideoLesson): boolean =>
    watchedIds.has(item.id) || Boolean(item.youtubeId && watchedIds.has(item.youtubeId));

  const unwatched: VideoLesson[] = [];
  const watched: VideoLesson[] = [];
  for (const item of baseFeed) {
    if (isWatched(item)) {
      watched.push(item);
    } else {
      unwatched.push(item);
    }
  }

  const orderedBase = [
    ...seededShuffle(unwatched, sessionSeed),
    ...seededShuffle(watched, sessionSeed + 997)
  ];

  const validSrs = srsReviewClips.filter((clip) => Boolean(clip && clip.id && clip.youtubeId));
  if (validSrs.length === 0 || srsEveryN <= 0) {
    return orderedBase;
  }

  const orderedSrs = [
    ...validSrs.filter((c) => !isWatched(c)),
    ...validSrs.filter((c) => isWatched(c))
  ];

  const merged: VideoLesson[] = [];
  const usedIds = new Set<string>();
  let srsCursor = 0;
  let regularSinceLastSrs = 0;

  for (const item of orderedBase) {
    if (usedIds.has(item.id)) continue;
    merged.push(item);
    usedIds.add(item.id);
    regularSinceLastSrs += 1;

    if (regularSinceLastSrs >= srsEveryN && srsCursor < orderedSrs.length) {
      while (srsCursor < orderedSrs.length && usedIds.has(orderedSrs[srsCursor].id)) {
        srsCursor += 1;
      }
      if (srsCursor < orderedSrs.length) {
        const srsItem = orderedSrs[srsCursor];
        merged.push({ ...srsItem, isSrsReviewClip: true });
        usedIds.add(srsItem.id);
        srsCursor += 1;
        regularSinceLastSrs = 0;
      }
    }
  }

  // If the base feed was tiny, still surface remaining SRS clips at the end
  while (srsCursor < orderedSrs.length) {
    const srsItem = orderedSrs[srsCursor];
    srsCursor += 1;
    if (usedIds.has(srsItem.id)) continue;
    merged.push({ ...srsItem, isSrsReviewClip: true });
    usedIds.add(srsItem.id);
  }

  return merged;
}

export interface MicroQuizQuestion {
  id: string;
  reelId: string;
  expression: string;
  contextSentence: string;
  promptVi: string;
  options: string[];
  correctIndex: number;
  explanationVi: string;
}

/**
 * Generates a 3-second Interpolated Retrieval Practice (IRP) micro-quiz from a
 * recently watched reel (Nature Comms Psych 2025: boosts delayed retention).
 */
export function buildMicroQuizForReels(
  recentReels: VideoLesson[],
  allPoolReels: VideoLesson[]
): MicroQuizQuestion | null {
  const candidates = recentReels.filter(
    (r) => Boolean(r?.expression && r?.expressionMeaningVi)
  );
  if (candidates.length === 0) return null;

  // Pick the most recent watched candidate with a clear meaning
  const target = candidates[candidates.length - 1];
  const correctMeaning = (target.expressionMeaningVi || '').trim();
  if (!correctMeaning) return null;

  const distractors: string[] = [];
  const seenOptions = new Set<string>([correctMeaning.toLowerCase()]);

  for (const poolItem of allPoolReels) {
    const meaning = (poolItem.expressionMeaningVi || '').trim();
    if (!meaning) continue;
    const lower = meaning.toLowerCase();
    if (seenOptions.has(lower)) continue;
    seenOptions.add(lower);
    distractors.push(meaning);
    if (distractors.length >= 2) break;
  }

  // Fallback distractors if feed is tiny
  const fallbackPool = [
    'Từ chối khéo một lời mời',
    'Yêu cầu giảm giá khi thanh toán',
    'Xin lỗi vì đến muộn cuộc họp'
  ];
  for (const fb of fallbackPool) {
    if (distractors.length >= 2) break;
    if (!seenOptions.has(fb.toLowerCase())) {
      seenOptions.add(fb.toLowerCase());
      distractors.push(fb);
    }
  }

  if (distractors.length < 2) return null;

  // Deterministic slot placement based on reel id hash so UI doesn't jitter on re-render
  const hash = target.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const correctIndex = hash % 3;
  const options = [...distractors];
  options.splice(correctIndex, 0, correctMeaning);

  return {
    id: `mquiz-${target.id}`,
    reelId: target.id,
    expression: target.expression || target.targetWord || '',
    contextSentence: target.targetContext || target.subtitles[0]?.text || '',
    promptVi: `Bạn vừa gặp cụm "${target.expression}" — người Mỹ dùng với nghĩa nào?`,
    options,
    correctIndex,
    explanationVi: target.americanUsageNote || `"${target.expression}" có nghĩa là: ${correctMeaning}.`
  };
}
