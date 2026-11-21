import { ReelCategory, ReelRegister, SubtitleLine, VideoLesson } from '../types';

export interface SrtCue {
  id: string;
  start: number;
  end: number;
  text: string;
}

export interface SlicedReelSpec {
  id: string;
  expression: string;
  expressionMeaningVi: string;
  americanUsageNote: string;
  reelCategory: ReelCategory;
  register: ReelRegister;
  startSeconds: number;
  endSeconds: number;
  targetSubIndex: number;
  subtitles: SubtitleLine[];
}

interface ExpressionRule {
  expression: string;
  pattern: RegExp;
  meaningVi: string;
  usageNote: string;
  category: Exclude<ReelCategory, 'my_videos'>;
  register: ReelRegister;
}

export const MOVIE_EXPRESSION_RULES: ExpressionRule[] = [
  {
    expression: 'figure it out',
    pattern: /\bfigur(?:e|es|ed|ing)\s+(?:it\s+|this\s+|that\s+)?out\b/i,
    meaningVi: 'Tìm ra cách giải quyết / Tự xoay xở',
    usageNote: 'Cụm cửa miệng khi xử lý rắc rối trong đời sống & công việc ở Mỹ.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'sounds good',
    pattern: /\bsounds?\s+good\b/i,
    meaningVi: 'Nghe hay đấy / Chốt nhé!',
    usageNote: 'Cách đồng ý nhanh, tự nhiên nhất của người Mỹ.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'no big deal',
    pattern: /\bno big deal\b/i,
    meaningVi: 'Chuyện nhỏ thôi / Không có gì to tát',
    usageNote: 'Dùng để trấn an hoặc đáp lại lời cảm ơn/xin lỗi.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'touch base',
    pattern: /\btouch(?:es|ed|ing)?\s+base\b/i,
    meaningVi: 'Liên hệ nhanh để cập nhật tình hình',
    usageNote: 'Câu cửa miệng số 1 dân văn phòng Mỹ.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'on the same page',
    pattern: /\bon the same page\b/i,
    meaningVi: 'Cùng chung cách hiểu / Đồng thuận',
    usageNote: 'Dùng trong họp team để xác nhận mọi người đã hiểu giống nhau.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'wrap up',
    pattern: /\bwrap(?:s|ped|ping)?\s+up\b/i,
    meaningVi: 'Kết thúc / Chốt lại công việc hoặc buổi họp',
    usageNote: 'Thường nghe ở cuối cuộc họp hoặc cuối ngày làm việc.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'make sense',
    pattern: /\bmak(?:e|es|ing)\s+sense\b/i,
    meaningVi: 'Hợp lý / Có lý đấy',
    usageNote: 'Rất phổ biến khi phản hồi ý tưởng: "That makes total sense."',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'all set',
    pattern: /\ball set\b/i,
    meaningVi: 'Sẵn sàng / Xong xuôi hết rồi',
    usageNote: 'Dùng ở quán ăn, sân bay và công sở Mỹ.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'hang out',
    pattern: /\bhang(?:s|ing)?\s+out\b/i,
    meaningVi: 'Đi chơi / Tụ tập thư giãn',
    usageNote: 'Cách rủ bạn bè kiểu Mỹ: "Wanna hang out tonight?"',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'catch up',
    pattern: /\bcatch(?:es|ing)?\s+up\b/i,
    meaningVi: 'Bắt kịp tiến độ / Hẹn hỏi thăm nhau',
    usageNote: 'Dùng cho cả đồng nghiệp lẫn bạn bè lâu ngày gặp lại.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'end up',
    pattern: /\bend(?:s|ed|ing)?\s+up\b/i,
    meaningVi: 'Cuối cùng lại (rơi vào tình huống...)',
    usageNote: 'Rất hay gặp trong lời kể chuyện tự nhiên của người Mỹ.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'play it by ear',
    pattern: /\bplay(?:s|ed|ing)?\s+it\s+by\s+ear\b/i,
    meaningVi: 'Tùy cơ ứng biến / Tới đâu tính tới đó',
    usageNote: 'Idiom tự nhiên khi chưa muốn chốt lịch cứng.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'work out',
    pattern: /\bwork(?:s|ed|ing)?\s+out\b/i,
    meaningVi: 'Ổn thỏa / Suôn sẻ (hoặc tập gym)',
    usageNote: 'Câu động viên phổ biến: "Don\'t worry, it\'ll work out."',
    category: 'work_talk',
    register: 'everyday'
  },
  {
    expression: 'go ahead',
    pattern: /\bgo(?:es|ing)?\s+ahead\b/i,
    meaningVi: 'Cứ tự nhiên đi / Tiến hành đi',
    usageNote: 'Cực hay dùng trong cuộc họp hoặc khi nhường lời.',
    category: 'work_talk',
    register: 'workplace_us'
  },
  {
    expression: 'my bad',
    pattern: /\bmy bad\b/i,
    meaningVi: 'Lỗi của mình / Mình sơ suất quá',
    usageNote: 'Cách nhận lỗi nhẹ nhàng, thân mật rất đặc trưng của người Mỹ.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'fair enough',
    pattern: /\bfair enough\b/i,
    meaningVi: 'Cũng hợp lý / Nghe cũng có lý đấy',
    usageNote: 'Dùng để công nhận quan điểm của đối phương một cách lịch sự.',
    category: 'work_talk',
    register: 'everyday'
  },
  {
    expression: 'never mind',
    pattern: /\bnever\s?mind\b/i,
    meaningVi: 'Thôi bỏ đi / Không sao đâu',
    usageNote: 'Cụm giao tiếp hàng ngày khi không muốn nhắc tiếp nữa.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'I am down',
    pattern: /\bi(?:'m| am)\s+down\b/i,
    meaningVi: 'Mình tham gia luôn / Chơi luôn!',
    usageNote: 'Slang Mỹ siêu phổ biến khi đồng ý đi ăn, đi chơi hoặc tham gia kèo.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'cut it out',
    pattern: /\bcut it out\b/i,
    meaningVi: 'Thôi ngay đi / Dừng lại đi',
    usageNote: 'Hay nghe trong phim sitcom Mỹ khi bảo ai đó ngừng trêu chọc.',
    category: 'daily_life',
    register: 'casual_us'
  },
  {
    expression: 'come on',
    pattern: /\bcome on\b/i,
    meaningVi: 'Thôi nào / Cố lên nào',
    usageNote: 'Cụm cảm thán đa năng bậc nhất trong hội thoại Mỹ.',
    category: 'daily_life',
    register: 'casual_us'
  }
];

function parseSrtTimestamp(raw: string): number {
  const cleaned = raw.trim().replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length !== 3) return 0;
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  const seconds = Number(parts[2]) || 0;
  return Number((hours * 3600 + minutes * 60 + seconds).toFixed(3));
}

/**
 * Parses standard .srt or .vtt subtitle text into timed cues.
 */
export function parseSrtToSubtitles(srtContent: string): SrtCue[] {
  const normalized = String(srtContent || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^WEBVTT.*\n+/i, '')
    .trim();

  if (!normalized) return [];

  const blocks = normalized.split(/\n{2,}/);
  const cues: SrtCue[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i]
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const timeLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeLineIdx < 0) continue;

    const [startRaw, endRaw] = lines[timeLineIdx].split('-->');
    const start = parseSrtTimestamp(startRaw || '');
    const end = parseSrtTimestamp((endRaw || '').trim().split(/\s+/)[0] || '');
    if (end <= start) continue;

    const text = lines
      .slice(timeLineIdx + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\{\\[^}]+\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) continue;
    cues.push({
      id: `cue-${cues.length + 1}`,
      start,
      end,
      text
    });
  }

  return cues;
}

/**
 * Selects up to `maxClips` authentic 8–18s American expression clips from a movie/sitcom transcript.
 * Shifts subtitle timestamps relative to each clip's `startSeconds` (0-based) for clean HTML5 <video> playback.
 */
export function selectAmericanReelClipsFromSubtitles(
  cues: SrtCue[],
  options: {
    sourceSlug: string;
    categoryOverride?: ReelCategory;
    maxClips?: number;
  }
): SlicedReelSpec[] {
  const maxClips = options.maxClips ?? 20;
  const results: SlicedReelSpec[] = [];
  const usedExpressions = new Set<string>();
  let lastClipEnd = -1;

  for (let i = 0; i < cues.length; i++) {
    if (results.length >= maxClips) break;
    const cue = cues[i];
    if (cue.start < lastClipEnd + 1) continue;

    const rule = MOVIE_EXPRESSION_RULES.find(
      (r) => !usedExpressions.has(r.expression) && r.pattern.test(cue.text)
    );
    if (!rule) continue;

    usedExpressions.add(rule.expression);

    const winStartIdx = Math.max(0, i - 1);
    const winEndIdx = Math.min(cues.length - 1, i + 1);
    const sliceCues = cues.slice(winStartIdx, winEndIdx + 1);

    const clipStart = Math.max(0, Number((sliceCues[0].start - 0.6).toFixed(2)));
    const rawClipEnd = Number((sliceCues[sliceCues.length - 1].end + 0.8).toFixed(2));
    const clipEnd = Math.min(clipStart + 18, Math.max(clipStart + 5, rawClipEnd));
    lastClipEnd = clipEnd;

    const matchedText = rule.pattern.exec(cue.text)?.[0] || rule.expression;
    const relativeSubs: SubtitleLine[] = sliceCues.map((c, subIdx) => ({
      id: `${options.sourceSlug}-${results.length + 1}-s${subIdx + 1}`,
      start: Math.max(0, Number((c.start - clipStart).toFixed(2))),
      end: Math.max(0.5, Number((c.end - clipStart).toFixed(2))),
      text: c.text,
      translation: ''
    }));

    results.push({
      id: `movie-${options.sourceSlug}-${results.length + 1}`,
      expression: matchedText,
      expressionMeaningVi: rule.meaningVi,
      americanUsageNote: rule.usageNote,
      reelCategory: options.categoryOverride || rule.category,
      register: rule.register,
      startSeconds: clipStart,
      endSeconds: clipEnd,
      targetSubIndex: i - winStartIdx,
      subtitles: relativeSubs
    });
  }

  return results;
}

export function buildVideoLessonFromManifestEntry(
  spec: SlicedReelSpec,
  meta: {
    videoUrl: string;
    sourceTitle: string;
    channel?: string;
    thumbnail?: string;
    level?: 'A2' | 'B1' | 'B2';
  }
): VideoLesson {
  const durationSec = Math.max(5, Math.round(spec.endSeconds - spec.startSeconds));
  return {
    id: spec.id,
    youtubeId: '',
    videoUrl: meta.videoUrl,
    title: `${spec.expression} — ${meta.sourceTitle}`,
    channel: meta.channel || meta.sourceTitle,
    thumbnail: meta.thumbnail || '',
    level: meta.level || 'B1',
    topic: spec.reelCategory === 'work_talk' ? 'Công sở Mỹ (Phim)' : 'Đời sống Mỹ (Phim)',
    duration: `00:${durationSec.toString().padStart(2, '0')}`,
    durationSec,
    views: 'Local MP4',
    description: spec.americanUsageNote,
    subtitles: spec.subtitles,
    quizzes: [],
    isShort: true,
    startSeconds: 0,
    endSeconds: durationSec,
    targetWord: spec.expression,
    targetContext: spec.subtitles[spec.targetSubIndex]?.text || spec.subtitles[0]?.text || '',
    sourceLessonTitle: meta.sourceTitle,
    initialSubIndex: spec.targetSubIndex,
    expression: spec.expression,
    expressionMeaningVi: spec.expressionMeaningVi,
    americanUsageNote: spec.americanUsageNote,
    reelCategory: spec.reelCategory,
    register: spec.register
  };
}
