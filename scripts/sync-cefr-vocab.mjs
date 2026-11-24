import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.join(__dirname, '..', 'public', 'curriculum');
const CEFR_DIR = path.join(OUT_DIR, 'cefr');

const BASE_URL = 'https://www.forumflashstudy.com';
const AWL_URL = 'https://raw.githubusercontent.com/lpmi-13/machine_readable_wordlists/master/Academic/AWL/AWL.json';
const NAWL_URL = 'https://raw.githubusercontent.com/lpmi-13/machine_readable_wordlists/master/Academic/NAWL/NAWL.json';
const LESSON_SIZE = 10;

const CEFR_LEVEL_META = [
  {
    slug: 'a1',
    cefr: 'A1',
    order: 1,
    titleEn: 'CEFR A1 Core Vocabulary',
    titleVi: 'Từ vựng cơ bản A1',
    descVi: 'Nền tảng giao tiếp sinh tồn — những từ tiếng Anh thông dụng nhất hàng ngày.'
  },
  {
    slug: 'a2',
    cefr: 'A2',
    order: 2,
    titleEn: 'CEFR A2 Core Vocabulary',
    titleVi: 'Từ vựng sơ trung cấp A2',
    descVi: 'Mở rộng vốn từ đời sống, mua sắm, công việc và các chủ đề quen thuộc.'
  },
  {
    slug: 'b1',
    cefr: 'B1',
    order: 3,
    titleEn: 'CEFR B1 Core Vocabulary',
    titleVi: 'Từ vựng trung cấp B1',
    descVi: 'Giao tiếp độc lập, diễn đạt quan điểm cá nhân và đọc hiểu tin tức — IELTS 5.5–6.0.'
  },
  {
    slug: 'b2',
    cefr: 'B2',
    order: 4,
    titleEn: 'CEFR B2 Core Vocabulary',
    titleVi: 'Từ vựng trung cao cấp B2',
    descVi: 'Tự tin tranh luận, đọc tài liệu chuyên ngành và viết luận học thuật — IELTS 6.5–7.0.'
  },
  {
    slug: 'c1',
    cefr: 'C1',
    order: 5,
    titleEn: 'CEFR C1 Core Vocabulary',
    titleVi: 'Từ vựng cao cấp C1',
    descVi: 'Diễn đạt sắc bén, chính xác và tự nhiên như bản xứ — IELTS 7.5–8.0.'
  },
  {
    slug: 'c2',
    cefr: 'C2',
    order: 6,
    titleEn: 'CEFR C2 Core Vocabulary',
    titleVi: 'Từ vựng tinh thông C2',
    descVi: 'Sắc thái học thuật & ngôn từ tinh tế ở bậc cao nhất — IELTS 8.5+.'
  }
];

const POS_SHORT_MAP = {
  'Danh từ': 'n.',
  'Động từ': 'v.',
  'Tính từ': 'adj.',
  'Trạng từ': 'adv.',
  'Giới từ': 'prep.',
  'Liên từ': 'conj.',
  'Đại từ': 'pron.',
  'Mạo từ': 'art.',
  'Từ hạn định': 'det.',
  'Thán từ': 'interj.',
  'Số từ': 'num.',
  'Động từ khuyết thiếu': 'modal v.',
  'Trợ động từ': 'aux. v.',
  'Cụm động từ': 'phr. v.',
  'Cụm danh từ': 'n. phr.',
  'Cụm tính từ': 'adj. phr.',
  'Cụm trạng từ': 'adv. phr.',
  'Cụm giới từ': 'prep. phr.',
  'Thành ngữ': 'idiom'
};

// Deterministic character-substitution decoder matching ForumFlash client bundle
const VIET_LOWER = 'àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ';
const VIET_ALL = VIET_LOWER + VIET_LOWER.toUpperCase();

function buildBackwardTable() {
  const forward = new Uint16Array(7936);
  const backward = new Uint16Array(7936);
  for (let n = 0; n < 7936; n += 1) {
    forward[n] = n;
    backward[n] = n;
  }

  for (const [alphabet, seed] of [
    ['0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 0x46464c41],
    [VIET_ALL, 0x56494554]
  ]) {
    const orig = [...alphabet];
    const shuffled = [...alphabet];
    let state = seed >>> 0;
    const nextRand = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
    };
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(nextRand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    orig.forEach((ch, idx) => {
      const fromCode = ch.charCodeAt(0);
      const toCode = shuffled[idx].charCodeAt(0);
      forward[fromCode] = toCode;
      backward[toCode] = fromCode;
    });
  }
  return backward;
}

const BACKWARD_TABLE = buildBackwardTable();

function decodeString(str) {
  let out = '';
  const buf = [];
  for (let i = 0; i < str.length; i += 1) {
    const code = str.charCodeAt(i);
    buf.push(code < 7936 ? BACKWARD_TABLE[code] : code);
    if (buf.length === 4096) {
      out += String.fromCharCode.apply(null, buf);
      buf.length = 0;
    }
  }
  return out + String.fromCharCode.apply(null, buf);
}

function decodePayload(node) {
  if (typeof node === 'string') return decodeString(node);
  if (Array.isArray(node)) return node.map(decodePayload);
  if (node && typeof node === 'object') {
    const obj = {};
    for (const [k, v] of Object.entries(node)) {
      obj[decodeString(k)] = decodePayload(v);
    }
    return obj;
  }
  return node;
}

function unwrapEncoded(raw) {
  if (raw && typeof raw === 'object' && raw.x === 1) {
    return decodePayload(raw.d);
  }
  return raw;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

async function loadAcademicSets() {
  const awlSet = new Set();
  const nawlSet = new Set();
  const collectWords = (node, targetSet) => {
    if (!node) return;
    if (typeof node === 'string') {
      const clean = node.trim().toLowerCase();
      if (/^[a-z]+$/.test(clean)) targetSet.add(clean);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) collectWords(item, targetSet);
      return;
    }
    if (typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        const cleanK = k.trim().toLowerCase();
        if (/^[a-z]+$/.test(cleanK) && !cleanK.startsWith('sublist')) targetSet.add(cleanK);
        collectWords(v, targetSet);
      }
    }
  };
  try {
    const [awlRaw, nawlRaw] = await Promise.all([
      fetchText(AWL_URL).then(JSON.parse),
      fetchText(NAWL_URL).then(JSON.parse)
    ]);
    collectWords(awlRaw, awlSet);
    collectWords(nawlRaw, nawlSet);
    console.log(`Loaded academic word lists: AWL=${awlSet.size}, NAWL=${nawlSet.size}`);
  } catch (err) {
    console.warn('Warning: could not fetch AWL/NAWL lists:', err.message);
  }
  return { awlSet, nawlSet };
}

function extractChunkExports(jsCode, moduleId) {
  const chunks = [];
  const fakeSelf = { webpackChunk_N_E: chunks };
  new Function('self', jsCode)(fakeSelf);
  for (const entry of chunks) {
    const modules = entry && entry[1];
    if (!modules) continue;
    const modFn = modules[moduleId] || Object.values(modules)[0];
    if (typeof modFn === 'function') {
      const mod = { exports: {} };
      modFn(mod, mod.exports);
      return mod.exports;
    }
  }
  throw new Error(`Could not extract module ${moduleId} from webpack chunk`);
}

function formatIpa(rawPhonetic) {
  const clean = String(rawPhonetic || '').trim();
  if (!clean) return '';
  if (clean.startsWith('/') && clean.endsWith('/')) return clean;
  return `/${clean.replace(/^\/+|\/+$/g, '')}/`;
}

function detectAcademicTag(term, awlSet, nawlSet) {
  const tokens = String(term || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 3);
  for (const t of tokens) {
    if (awlSet.has(t)) return 'AWL';
  }
  for (const t of tokens) {
    if (nawlSet.has(t)) return 'NAWL';
  }
  return undefined;
}

function extractCollocationsFromNote(note) {
  if (!note || typeof note !== 'string') return [];
  const found = [];
  // Extract English phrases inside single quotes like 'blame sb for sth' or 'a temporary aberration'
  const quoteMatches = [...note.matchAll(/'([a-zA-Z][a-zA-Z0-9\s/-]{2,42})'/g)];
  for (const m of quoteMatches) {
    const phrase = m[1].trim();
    if (phrase.includes(' ') || phrase.includes('/')) {
      found.push(phrase);
    }
  }
  return [...new Set(found)].slice(0, 4);
}

function sanitizeText(str) {
  return String(str || '').replace(/[\u4e00-\u9fff]+/g, '').trim();
}

function slugifyWordId(levelSlug, word, idx) {
  const base = word
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `cefr-${levelSlug}-${base || 'item'}-${idx + 1}`;
}

async function run() {
  console.log('1. Fetching ForumFlash /home HTML to resolve current chunk hashes...');
  const html = await fetchText(`${BASE_URL}/home`);
  const webpackMatch = html.match(/\/_next\/static\/chunks\/webpack-[a-f0-9]+\.js/);
  const pageMatch = html.match(/\/_next\/static\/chunks\/app\/page-[a-f0-9]+\.js/);
  if (!webpackMatch || !pageMatch) {
    throw new Error('Could not find webpack or app/page chunk URLs in /home HTML');
  }

  const [webpackJs, pageJs, { awlSet, nawlSet }] = await Promise.all([
    fetchText(`${BASE_URL}${webpackMatch[0]}`),
    fetchText(`${BASE_URL}${pageMatch[0]}`),
    loadAcademicSets()
  ]);

  const chunkMapMatch = webpackJs.match(/\{(?:\d+:"[a-f0-9]+",?)+\}/);
  if (!chunkMapMatch) throw new Error('Could not parse webpack chunk hash map');
  const chunkHashMap = new Function(`return (${chunkMapMatch[0]})`)();

  // Locate the flashcard module map containing oxford-a1.json with `rows`
  const candidateMaps = [...pageJs.matchAll(/\{[^{}]*"\.\/oxford-a1\.json"[^{}]*\}/g)];
  if (candidateMaps.length === 0) {
    throw new Error('Could not find any module map containing ./oxford-a1.json');
  }

  let vocabModuleMap = null;
  for (const m of candidateMaps) {
    const candidate = new Function(`return (${m[0]})`)();
    const pair = candidate['./oxford-a1.json'];
    if (!pair) continue;
    const hash = chunkHashMap[pair[1]];
    if (!hash) continue;
    const probeJs = await fetchText(`${BASE_URL}/_next/static/chunks/${pair[1]}.${hash}.js`);
    const probeDecoded = unwrapEncoded(extractChunkExports(probeJs, pair[0]));
    if (Array.isArray(probeDecoded?.rows) && probeDecoded.rows.length > 0) {
      vocabModuleMap = candidate;
      break;
    }
  }

  if (!vocabModuleMap) {
    throw new Error('Could not locate flashcard vocab module map containing rows for oxford-a1.json');
  }

  fs.mkdirSync(CEFR_DIR, { recursive: true });

  const manifestCefrVocab = [];
  const unknownPosLabels = new Set();
  let grandTotalWords = 0;
  let totalAcademicTagged = 0;

  console.log('2. Extracting and normalizing CEFR A1-C2 Oxford vocabulary decks...');

  for (const meta of CEFR_LEVEL_META) {
    const key = `./oxford-${meta.slug}.json`;
    const pair = vocabModuleMap[key];
    if (!pair) {
      throw new Error(`No webpack module mapping found for ${key}`);
    }
    const [moduleId, chunkId] = pair;
    const hash = chunkHashMap[chunkId];
    if (!hash) {
      throw new Error(`No webpack hash found for chunkId ${chunkId} (${meta.slug})`);
    }

    const chunkUrl = `${BASE_URL}/_next/static/chunks/${chunkId}.${hash}.js`;
    const chunkJs = await fetchText(chunkUrl);
    const decoded = unwrapEncoded(extractChunkExports(chunkJs, moduleId));

    const classes = Array.isArray(decoded.classes) ? decoded.classes : [];
    const rows = Array.isArray(decoded.rows) ? decoded.rows : [];

    const words = rows.map((row, idx) => {
      const [rawWord, rawMeaningVi, rawNote, rawExamples, rawPhonetic, classIdx] = row;
      const [rawLabel, rawPosVi] = classes[classIdx] || [`Từ vựng Oxford · Bậc ${meta.cefr}`, 'Từ vựng'];

      const word = sanitizeText(rawWord);
      const meaningVi = sanitizeText(rawMeaningVi);
      const pattern = sanitizeText(rawNote);
      const examples = (Array.isArray(rawExamples) ? rawExamples : [])
        .map(sanitizeText)
        .filter((s) => s.length > 0);
      const label = sanitizeText(rawLabel) || `Từ vựng Oxford · Bậc ${meta.cefr}`;
      const partOfSpeechVi = sanitizeText(rawPosVi) || 'Từ vựng';

      const pos = POS_SHORT_MAP[partOfSpeechVi] || 'word';
      if (!POS_SHORT_MAP[partOfSpeechVi]) {
        unknownPosLabels.add(partOfSpeechVi);
      }

      const academicTag = detectAcademicTag(word, awlSet, nawlSet);
      if (academicTag) totalAcademicTagged += 1;

      const ipa = formatIpa(rawPhonetic);
      const exampleDailyEn = examples[0] || `We often use "${word}" in everyday English.`;
      const exampleIeltsEn = examples[1] || exampleDailyEn;

      const safeMeaningVi =
        meaningVi && meaningVi.toLowerCase() !== word.toLowerCase()
          ? meaningVi
          : `từ vựng "${word}" (${partOfSpeechVi})`;

      const item = {
        id: slugifyWordId(meta.slug, word, idx),
        word,
        ipaUs: ipa,
        ipaUk: ipa,
        pos,
        partOfSpeechVi,
        label,
        pattern,
        cefr: meta.cefr,
        topic: `oxford-${meta.slug}`,
        meaningVi: safeMeaningVi,
        definitionEn: pattern || `${label} (${partOfSpeechVi})`,
        exampleDailyEn,
        exampleIeltsEn,
        examples,
        collocations: extractCollocationsFromNote(pattern),
        synonyms: []
      };

      if (academicTag) item.academicTag = academicTag;
      return item;
    });

    const lessons = [];
    for (let i = 0; i < words.length; i += LESSON_SIZE) {
      const slice = words.slice(i, i + LESSON_SIZE);
      const lessonNumber = Math.floor(i / LESSON_SIZE) + 1;
      lessons.push({
        id: `cefr-${meta.slug}-l${String(lessonNumber).padStart(2, '0')}`,
        lessonNumber,
        title: `Bài ${String(lessonNumber).padStart(2, '0')}`,
        wordCount: slice.length,
        words: slice
      });
    }

    const unitPayload = {
      id: `cefr-${meta.slug}`,
      slug: meta.slug,
      cefr: meta.cefr,
      trackType: 'cefr_vocab',
      order: meta.order,
      titleEn: meta.titleEn,
      titleVi: meta.titleVi,
      descVi: meta.descVi,
      totalWords: words.length,
      totalLessons: lessons.length,
      lessons
    };

    const outPath = path.join(CEFR_DIR, `${meta.slug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(unitPayload), 'utf8');
    grandTotalWords += words.length;

    manifestCefrVocab.push({
      id: unitPayload.id,
      slug: meta.slug,
      cefr: meta.cefr,
      order: meta.order,
      titleEn: meta.titleEn,
      titleVi: meta.titleVi,
      descVi: meta.descVi,
      totalWords: words.length,
      totalLessons: lessons.length,
      dataPath: `/curriculum/cefr/${meta.slug}.json`
    });

    console.log(
      `  [${meta.cefr}] ${meta.slug}.json -> ${words.length} words (${lessons.length} lessons)`
    );
  }

  if (unknownPosLabels.size > 0) {
    console.warn('Warning: unmapped POS labels encountered:', [...unknownPosLabels]);
  }

  // Update manifest.json preserving ieltsTopics & grammar
  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = '3.2.0';
  manifest.generatedAt = new Date().toISOString();
  manifest.stats.totalCefrWords = grandTotalWords;
  manifest.cefrVocab = manifestCefrVocab;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(
    `\nDONE: Synced ${manifestCefrVocab.length} CEFR levels, ${grandTotalWords} Oxford words (AWL/NAWL tagged: ${totalAcademicTagged}). Manifest bumped to v3.2.0.`
  );
}

run().catch((err) => {
  console.error('CEFR vocab sync failed:', err);
  process.exit(1);
});
