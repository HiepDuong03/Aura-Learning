#!/usr/bin/env node
/**
 * Local Movie / Sitcom -> Real American Reels Slicer CLI
 *
 * Cuts any local .mp4 + .srt (e.g., Friends, The Office, Suits, Modern Family)
 * into tiny 8-18s H.264/AAC MP4 clips (~500KB each) targeting high-frequency
 * American expressions and writes `manifest.json` so ShortsView plays them
 * natively with HTML5 <video> at 0ms latency (zero YouTube iframe lag!).
 *
 * Usage:
 *   node scripts/slice-movie-clips.mjs \
 *     --video "C:\Movies\TheOffice_S01E01.mp4" \
 *     --srt   "C:\Movies\TheOffice_S01E01.srt" \
 *     --title "The Office S01E01" \
 *     --category work_talk \
 *     --out public/reels \
 *     --base-url /reels
 *
 * For Cloudflare R2 deployment, pass `--base-url https://pub-xxx.r2.dev/reels`
 * and upload the generated folder to your R2 bucket.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const EXPRESSION_RULES = [
  { expression: 'figure it out', pattern: /\bfigur(?:e|es|ed|ing)\s+(?:it\s+|this\s+|that\s+)?out\b/i, meaningVi: 'Tìm ra cách giải quyết / Tự xoay xở', usageNote: 'Cụm cửa miệng khi xử lý rắc rối trong đời sống & công việc ở Mỹ.', category: 'work_talk', register: 'workplace_us' },
  { expression: 'sounds good', pattern: /\bsounds?\s+good\b/i, meaningVi: 'Nghe hay đấy / Chốt nhé!', usageNote: 'Cách đồng ý nhanh, tự nhiên nhất của người Mỹ.', category: 'daily_life', register: 'casual_us' },
  { expression: 'no big deal', pattern: /\bno big deal\b/i, meaningVi: 'Chuyện nhỏ thôi / Không có gì to tát', usageNote: 'Dùng để trấn an hoặc đáp lại lời cảm ơn/xin lỗi.', category: 'daily_life', register: 'casual_us' },
  { expression: 'touch base', pattern: /\btouch(?:es|ed|ing)?\s+base\b/i, meaningVi: 'Liên hệ nhanh để cập nhật tình hình', usageNote: 'Câu cửa miệng số 1 dân văn phòng Mỹ.', category: 'work_talk', register: 'workplace_us' },
  { expression: 'on the same page', pattern: /\bon the same page\b/i, meaningVi: 'Cùng chung cách hiểu / Đồng thuận', usageNote: 'Dùng trong họp team để xác nhận mọi người đã hiểu giống nhau.', category: 'work_talk', register: 'workplace_us' },
  { expression: 'wrap up', pattern: /\bwrap(?:s|ped|ping)?\s+up\b/i, meaningVi: 'Kết thúc / Chốt lại công việc hoặc buổi họp', usageNote: 'Thường nghe ở cuối cuộc họp hoặc cuối ngày làm việc.', category: 'work_talk', register: 'workplace_us' },
  { expression: 'make sense', pattern: /\bmak(?:e|es|ing)\s+sense\b/i, meaningVi: 'Hợp lý / Có lý đấy', usageNote: 'Rất phổ biến khi phản hồi ý tưởng: "That makes total sense."', category: 'work_talk', register: 'workplace_us' },
  { expression: 'all set', pattern: /\ball set\b/i, meaningVi: 'Sẵn sàng / Xong xuôi hết rồi', usageNote: 'Dùng ở quán ăn, sân bay và công sở Mỹ.', category: 'daily_life', register: 'casual_us' },
  { expression: 'hang out', pattern: /\bhang(?:s|ing)?\s+out\b/i, meaningVi: 'Đi chơi / Tụ tập thư giãn', usageNote: 'Cách rủ bạn bè kiểu Mỹ: "Wanna hang out tonight?"', category: 'daily_life', register: 'casual_us' },
  { expression: 'catch up', pattern: /\bcatch(?:es|ing)?\s+up\b/i, meaningVi: 'Bắt kịp tiến độ / Hẹn hỏi thăm nhau', usageNote: 'Dùng cho cả đồng nghiệp lẫn bạn bè lâu ngày gặp lại.', category: 'work_talk', register: 'workplace_us' },
  { expression: 'end up', pattern: /\bend(?:s|ed|ing)?\s+up\b/i, meaningVi: 'Cuối cùng lại (rơi vào tình huống...)', usageNote: 'Rất hay gặp trong lời kể chuyện tự nhiên của người Mỹ.', category: 'daily_life', register: 'casual_us' },
  { expression: 'play it by ear', pattern: /\bplay(?:s|ed|ing)?\s+it\s+by\s+ear\b/i, meaningVi: 'Tùy cơ ứng biến / Tới đâu tính tới đó', usageNote: 'Idiom tự nhiên khi chưa muốn chốt lịch cứng.', category: 'daily_life', register: 'casual_us' },
  { expression: 'work out', pattern: /\bwork(?:s|ed|ing)?\s+out\b/i, meaningVi: 'Ổn thỏa / Suôn sẻ', usageNote: 'Câu động viên phổ biến: "Don\'t worry, it\'ll work out."', category: 'work_talk', register: 'everyday' },
  { expression: 'go ahead', pattern: /\bgo(?:es|ing)?\s+ahead\b/i, meaningVi: 'Cứ tự nhiên đi / Tiến hành đi', usageNote: 'Cực hay dùng trong cuộc họp hoặc khi nhường lời.', category: 'work_talk', register: 'workplace_us' },
  { expression: 'my bad', pattern: /\bmy bad\b/i, meaningVi: 'Lỗi của mình / Mình sơ suất quá', usageNote: 'Cách nhận lỗi nhẹ nhàng, thân mật rất đặc trưng của người Mỹ.', category: 'daily_life', register: 'casual_us' },
  { expression: 'fair enough', pattern: /\bfair enough\b/i, meaningVi: 'Cũng hợp lý / Nghe cũng có lý đấy', usageNote: 'Dùng để công nhận quan điểm của đối phương một cách lịch sự.', category: 'work_talk', register: 'everyday' },
  { expression: 'I am down', pattern: /\bi(?:'m| am)\s+down\b/i, meaningVi: 'Mình tham gia luôn / Chơi luôn!', usageNote: 'Slang Mỹ siêu phổ biến khi đồng ý đi ăn, đi chơi hoặc tham gia kèo.', category: 'daily_life', register: 'casual_us' }
];

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith('--')) {
      args[key.slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

function parseSrtTimestamp(raw) {
  const cleaned = String(raw || '').trim().replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length !== 3) return 0;
  return Number(((Number(parts[0]) || 0) * 3600 + (Number(parts[1]) || 0) * 60 + (Number(parts[2]) || 0)).toFixed(3));
}

function parseSrt(srtText) {
  const normalized = String(srtText || '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^WEBVTT.*\n+/i, '')
    .trim();
  if (!normalized) return [];

  const cues = [];
  for (const block of normalized.split(/\n{2,}/)) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const tIdx = lines.findIndex((l) => l.includes('-->'));
    if (tIdx < 0) continue;
    const [startRaw, endRaw] = lines[tIdx].split('-->');
    const start = parseSrtTimestamp(startRaw);
    const end = parseSrtTimestamp((endRaw || '').trim().split(/\s+/)[0]);
    if (end <= start) continue;
    const text = lines.slice(tIdx + 1).join(' ').replace(/<[^>]+>/g, '').replace(/\{\\[^}]+\}/g, '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    cues.push({ start, end, text });
  }
  return cues;
}

function main() {
  const args = parseArgs(process.argv);
  const videoPath = args.video;
  const srtPath = args.srt;
  const title = args.title || (videoPath ? path.basename(videoPath, path.extname(videoPath)) : 'American Clip');
  const outDir = path.resolve(args.out || 'public/reels');
  const baseUrl = (args['base-url'] || '/reels').replace(/\/$/, '');
  const maxClips = Number(args.max || 15);
  const categoryOverride = args.category; // optional: daily_life | work_talk | my_videos

  if (!videoPath || !srtPath) {
    console.error('Usage: node scripts/slice-movie-clips.mjs --video <file.mp4> --srt <file.srt> [--title "Friends S01E01"] [--category daily_life|work_talk] [--out public/reels] [--base-url /reels]');
    process.exit(1);
  }

  const ffmpegCheck = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  if (ffmpegCheck.status !== 0) {
    console.error('❌ ffmpeg is not installed or not in PATH. Install ffmpeg first (winget install Gyan.FFmpeg).');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const srtContent = fs.readFileSync(srtPath, 'utf8');
  const cues = parseSrt(srtContent);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'clip';

  const manifestPath = path.join(outDir, 'manifest.json');
  let existingManifest = [];
  if (fs.existsSync(manifestPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (Array.isArray(parsed)) existingManifest = parsed;
    } catch {}
  }

  const usedExpressions = new Set();
  const createdEntries = [];
  let lastEnd = -1;

  for (let i = 0; i < cues.length && createdEntries.length < maxClips; i++) {
    const cue = cues[i];
    if (cue.start < lastEnd + 1) continue;
    const rule = EXPRESSION_RULES.find((r) => !usedExpressions.has(r.expression) && r.pattern.test(cue.text));
    if (!rule) continue;

    usedExpressions.add(rule.expression);
    const winStart = Math.max(0, i - 1);
    const winEnd = Math.min(cues.length - 1, i + 1);
    const slice = cues.slice(winStart, winEnd + 1);
    const clipStart = Math.max(0, Number((slice[0].start - 0.6).toFixed(2)));
    const clipEnd = Math.min(clipStart + 18, Math.max(clipStart + 5, Number((slice[slice.length - 1].end + 0.8).toFixed(2))));
    const duration = Number((clipEnd - clipStart).toFixed(2));
    lastEnd = clipEnd;

    const clipIndex = createdEntries.length + 1;
    const fileName = `${slug}-${clipIndex}.mp4`;
    const outputFile = path.join(outDir, fileName);

    console.log(`✂️  Cutting #${clipIndex} [${rule.expression}] (${clipStart}s -> ${clipEnd}s) -> ${fileName}`);
    const ff = spawnSync(
      'ffmpeg',
      [
        '-y',
        '-ss', String(clipStart),
        '-i', videoPath,
        '-t', String(duration),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '26',
        '-vf', 'scale=-2:720',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputFile
      ],
      { stdio: 'pipe' }
    );

    if (ff.status !== 0) {
      console.warn(`⚠️ Failed to slice ${fileName}:`, ff.stderr?.toString().slice(0, 300));
      continue;
    }

    const matchedText = rule.pattern.exec(cue.text)?.[0] || rule.expression;
    const subtitles = slice.map((c, idx) => ({
      id: `${slug}-${clipIndex}-s${idx + 1}`,
      start: Math.max(0, Number((c.start - clipStart).toFixed(2))),
      end: Math.max(0.5, Number((c.end - clipStart).toFixed(2))),
      text: c.text,
      translation: ''
    }));

    createdEntries.push({
      id: `movie-${slug}-${clipIndex}`,
      youtubeId: '',
      videoUrl: `${baseUrl}/${fileName}`,
      title: `${matchedText} — ${title}`,
      channel: title,
      thumbnail: '',
      level: 'B1',
      topic: (categoryOverride || rule.category) === 'work_talk' ? 'Công sở Mỹ (Phim)' : 'Đời sống Mỹ (Phim)',
      duration: `00:${Math.round(duration).toString().padStart(2, '0')}`,
      durationSec: Math.round(duration),
      views: 'MP4 HD',
      description: rule.usageNote,
      subtitles,
      quizzes: [],
      isShort: true,
      startSeconds: 0,
      endSeconds: duration,
      targetWord: matchedText,
      targetContext: cue.text,
      sourceLessonTitle: title,
      initialSubIndex: i - winStart,
      expression: matchedText,
      expressionMeaningVi: rule.meaningVi,
      americanUsageNote: rule.usageNote,
      reelCategory: categoryOverride || rule.category,
      register: rule.register
    });
  }

  const mergedById = new Map();
  for (const item of [...existingManifest, ...createdEntries]) {
    if (item?.id) mergedById.set(item.id, item);
  }
  const finalManifest = Array.from(mergedById.values());
  fs.writeFileSync(manifestPath, JSON.stringify(finalManifest, null, 2), 'utf8');
  console.log(`✅ Done! Sliced ${createdEntries.length} clips -> ${manifestPath} (Total in manifest: ${finalManifest.length})`);
}

main();
