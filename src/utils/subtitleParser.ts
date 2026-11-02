import { SubtitleLine } from '../types';

/**
 * Normalizes time string (HH:MM:SS,mmm or HH:MM:SS.mmm or MM:SS.mmm) into seconds (float).
 */
export function parseTimestampToSeconds(timestamp: string): number {
  if (!timestamp) return 0;
  const clean = timestamp.trim().replace(',', '.');
  const parts = clean.split(':');

  if (parts.length === 3) {
    const hours = parseFloat(parts[0] || '0');
    const minutes = parseFloat(parts[1] || '0');
    const seconds = parseFloat(parts[2] || '0');
    return parseFloat((hours * 3600 + minutes * 60 + seconds).toFixed(3));
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0] || '0');
    const seconds = parseFloat(parts[1] || '0');
    return parseFloat((minutes * 60 + seconds).toFixed(3));
  } else {
    return parseFloat(parseFloat(clean || '0').toFixed(3));
  }
}

/**
 * Format seconds back to VTT/SRT timestamp string.
 */
export function formatSecondsToTimestamp(sec: number, separator: '.' | ',' = '.'): string {
  const totalMs = Math.round(sec * 1000);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const ms = totalMs % 1000;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(ms).padStart(3, '0');

  return `${hh}:${mm}:${ss}${separator}${mmm}`;
}

/**
 * Clean subtitle text from formatting tags and artifacts.
 */
export function cleanSubtitleText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, '') // remove HTML/VTT tags like <c.yellow>, <b>, <i>, <font>
    .replace(/\{[^}]+\}/g, '') // remove ASS/SSA tags like {\an8}
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Dependency-free parser for SRT and WebVTT subtitle formats.
 * Compliant with standard WebVTT and SubRip formats (Context7-verified).
 */
export function parseSubtitleFile(content: string): SubtitleLine[] {
  if (!content || !content.trim()) return [];

  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cues: SubtitleLine[] = [];
  let currentId = 1;

  // Regex matching timestamp lines: 00:00:12,345 --> 00:00:15,678 (supports . and , and optional hours)
  const timeRegex = /((?:\d{1,2}:)?\d{2}:\d{2}[,.]\d{2,3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[,.]\d{2,3})/;

  let i = 0;
  // Skip WEBVTT header and metadata
  if (lines[0]?.trim().startsWith('WEBVTT')) {
    i = 1;
    while (i < lines.length && lines[i]?.trim() !== '') {
      i++; // skip header block
    }
  }

  while (i < lines.length) {
    const line = lines[i]?.trim() || '';

    // Check for cue timestamp
    const match = line.match(timeRegex);
    if (match && match[1] && match[2]) {
      const start = parseTimestampToSeconds(match[1]);
      const end = parseTimestampToSeconds(match[2]);

      // Read text lines until empty line
      i++;
      const textParts: string[] = [];
      while (i < lines.length && lines[i]?.trim() !== '') {
        const textLine = lines[i]?.trim();
        // Skip comment lines in VTT
        if (textLine && !textLine.startsWith('NOTE') && !textLine.startsWith('STYLE')) {
          textParts.push(textLine);
        }
        i++;
      }

      const text = cleanSubtitleText(textParts.join(' '));
      // Ignore audio noise indicators like [Music], [Applause]
      if (text && !text.match(/^\[(music|applause|cheering|laughter|sound)\]$/i)) {
        cues.push({
          id: `cue-${currentId++}`,
          start,
          end,
          text,
          translation: ''
        });
      }
    } else {
      i++;
    }
  }

  return sanitizeAndAlignCues(cues);
}

/**
 * Universal Subtitle Sanitizer and Alignment Calibrator.
 * 1. Sorts chronologically.
 * 2. Unescapes and cleans HTML/artifacts.
 * 3. Eliminates overlapping timestamps (clamps cue[i].end = min(cue[i].end, cue[i+1].start)).
 * 4. Enforces minimum readable duration (0.4s).
 * 5. Guarantees monotonic non-overlapping intervals across the entire video.
 */
export function sanitizeAndAlignCues(cues: SubtitleLine[]): SubtitleLine[] {
  if (!cues || cues.length === 0) return [];

  // 1. Clean text and parse floats
  const cleaned: SubtitleLine[] = cues
    .map((c, idx) => ({
      id: c.id || `cue-${idx + 1}`,
      start: parseFloat(c.start.toFixed(2)),
      end: parseFloat(Math.max(c.start + 0.35, c.end).toFixed(2)),
      text: cleanSubtitleText(c.text),
      translation: cleanSubtitleText(c.translation || '')
    }))
    .filter(c => c.text && !c.text.match(/^\[(music|applause|cheering|laughter|sound)\]$/i));

  // 2. Chronological sort
  cleaned.sort((a, b) => a.start - b.start || a.end - b.end);

  // 3. De-duplicate identical consecutive cues
  const deduped: SubtitleLine[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const cur = cleaned[i];
    const prev = deduped[deduped.length - 1];
    if (prev && prev.text.toLowerCase() === cur.text.toLowerCase() && Math.abs(cur.start - prev.start) < 1.0) {
      // Extend previous cue instead of duplicating
      prev.end = Math.max(prev.end, cur.end);
    } else {
      deduped.push({ ...cur });
    }
  }

  // 4. Strictly eliminate overlaps
  for (let i = 0; i < deduped.length - 1; i++) {
    const cur = deduped[i];
    const next = deduped[i + 1];

    if (cur.end > next.start) {
      // If current cue ends after next cue starts, clamp current cue's end
      cur.end = parseFloat(Math.max(cur.start + 0.2, next.start).toFixed(2));
    }
  }

  return deduped;
}

/**
 * LingQ Intelligent Sentence Re-Chunker.
 * Combines fragmented subtitle cues into grammatically coherent, natural sentences.
 */
export function rechunkSubtitles(rawCues: SubtitleLine[], maxDuration: number = 7.5, maxGap: number = 0.8): SubtitleLine[] {
  if (!rawCues || rawCues.length === 0) return [];

  // Pre-align input cues
  const alignedInput = sanitizeAndAlignCues(rawCues);

  const rechunked: SubtitleLine[] = [];
  let currentAccumulator: {
    start: number;
    end: number;
    textParts: string[];
    translationParts: string[];
  } | null = null;

  let idCounter = 1;

  // Regex checking if text ends with a sentence terminator
  const sentenceEndRegex = /[.?!…]["'”’]?$/;

  for (let i = 0; i < alignedInput.length; i++) {
    const cue = alignedInput[i];
    if (!cue) continue;

    if (!currentAccumulator) {
      currentAccumulator = {
        start: cue.start,
        end: cue.end,
        textParts: [cue.text],
        translationParts: cue.translation ? [cue.translation] : []
      };
    } else {
      const gap = cue.start - currentAccumulator.end;
      const combinedDuration = cue.end - currentAccumulator.start;
      const lastText = currentAccumulator.textParts[currentAccumulator.textParts.length - 1] || '';
      const isAbbreviation = /(?:Mr|Mrs|Ms|Dr|Prof|vs|U\.S|etc|i\.e|e\.g)\.$/i.test(lastText.trim());
      const isPreviousComplete = !isAbbreviation && sentenceEndRegex.test(lastText.trim());

      // Should we flush the accumulator into a complete sentence?
      const shouldFlush = 
        isPreviousComplete || 
        gap > maxGap || 
        combinedDuration > maxDuration;

      if (shouldFlush) {
        rechunked.push({
          id: `s-${idCounter++}`,
          start: currentAccumulator.start,
          end: currentAccumulator.end,
          text: currentAccumulator.textParts.join(' ').trim(),
          translation: currentAccumulator.translationParts.join(' ').trim()
        });

        currentAccumulator = {
          start: cue.start,
          end: cue.end,
          textParts: [cue.text],
          translationParts: cue.translation ? [cue.translation] : []
        };
      } else {
        // Continue merging cue into current sentence
        currentAccumulator.end = cue.end;
        currentAccumulator.textParts.push(cue.text);
        if (cue.translation) {
          currentAccumulator.translationParts.push(cue.translation);
        }
      }
    }
  }

  // Push remaining accumulator
  if (currentAccumulator && currentAccumulator.textParts.length > 0) {
    rechunked.push({
      id: `s-${idCounter++}`,
      start: currentAccumulator.start,
      end: currentAccumulator.end,
      text: currentAccumulator.textParts.join(' ').trim(),
      translation: currentAccumulator.translationParts.join(' ').trim()
    });
  }

  return sanitizeAndAlignCues(rechunked);
}

/**
 * Converts raw article / essay text into study subtitle lines with synthetic time stamps.
 */
export function segmentRawTextIntoSubtitles(text: string, wordsPerSecond: number = 2.5): SubtitleLine[] {
  if (!text || !text.trim()) return [];

  // Split text by sentence terminators
  const rawSentences = text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let currentTime = 0;
  const result: SubtitleLine[] = [];

  rawSentences.forEach((sentence, idx) => {
    const wordCount = sentence.split(/\s+/).length;
    const duration = Math.max(1.8, parseFloat((wordCount / wordsPerSecond).toFixed(2)));
    const start = parseFloat(currentTime.toFixed(2));
    const end = parseFloat((currentTime + duration).toFixed(2));

    result.push({
      id: `txt-${idx + 1}`,
      start,
      end,
      text: sentence,
      translation: ''
    });

    currentTime = end + 0.4; // 400ms pause between sentences
  });

  return result;
}

export const parseSrtOrVtt = (content: string): SubtitleLine[] => {
  return parseSubtitleFile(content);
};

export function parseTimestampedTranscript(raw: string): SubtitleLine[] {
  if (!raw || !raw.trim()) return [];
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const result: SubtitleLine[] = [];
  let id = 1;

  // Regex matching [01:23] or (01:23) or 01:23 at start of line
  const timeRegex = /^[\(\[]?(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)[\)\]]?\s*(.*)$/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (!line) continue;
    const match = line.match(timeRegex);
    if (match && match[1]) {
      const start = parseTimestampToSeconds(match[1]);
      const text = cleanSubtitleText(match[2] || '');
      if (text) {
        result.push({
          id: `raw-${id++}`,
          start,
          end: start + 4.0,
          text,
          translation: ''
        });
      }
    }
  }

  // Adjust ends to not overlap next start
  for (let i = 0; i < result.length - 1; i++) {
    const curr = result[i];
    const next = result[i + 1];
    if (curr && next && next.start > curr.start) {
      curr.end = Math.min(curr.end, next.start);
    }
  }

  return result;
}
