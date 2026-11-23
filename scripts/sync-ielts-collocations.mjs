import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.join(__dirname, '..', 'public', 'curriculum');
const TOPICS_DIR = path.join(OUT_DIR, 'topics');

const BASE_URL = 'https://www.forumflashstudy.com';
const AWL_URL = 'https://raw.githubusercontent.com/lpmi-13/machine_readable_wordlists/master/Academic/AWL/AWL.json';
const NAWL_URL = 'https://raw.githubusercontent.com/lpmi-13/machine_readable_wordlists/master/Academic/NAWL/NAWL.json';
const LESSON_SIZE = 10;

const TOPIC_VI_TITLES = {
  education: { titleVi: 'Giáo dục & Học tập', color: 'teal' },
  environment: { titleVi: 'Môi trường & Khí hậu', color: 'emerald' },
  technology: { titleVi: 'Công nghệ & Đời sống số', color: 'sky' },
  health: { titleVi: 'Sức khỏe & Y tế', color: 'rose' },
  work: { titleVi: 'Công việc & Sự nghiệp', color: 'indigo' },
  economy: { titleVi: 'Kinh tế & Tiêu dùng', color: 'violet' },
  cities: { titleVi: 'Đô thị & Đời sống thành phố', color: 'orange' },
  transport: { titleVi: 'Giao thông & Di chuyển', color: 'amber' },
  media: { titleVi: 'Truyền thông & Báo chí', color: 'pink' },
  crime: { titleVi: 'Tội phạm & Pháp luật', color: 'slate' },
  government: { titleVi: 'Chính phủ & Chính sách công', color: 'slate' },
  culture: { titleVi: 'Văn hóa & Nghệ thuật', color: 'purple' },
  family: { titleVi: 'Gia đình & Thế hệ', color: 'rose' },
  science: { titleVi: 'Khoa học & Nghiên cứu', color: 'cyan' },
  globalisation: { titleVi: 'Toàn cầu hóa & Hội nhập', color: 'indigo' },
  food: { titleVi: 'Ẩm thực & Dinh dưỡng', color: 'amber' },
  tourism: { titleVi: 'Du lịch & Khám phá', color: 'teal' },
  housing: { titleVi: 'Nhà ở & Kiến trúc', color: 'orange' },
  population: { titleVi: 'Dân số & Nhân khẩu học', color: 'violet' },
  equality: { titleVi: 'Bình đẳng & Công bằng xã hội', color: 'emerald' },
  communication: { titleVi: 'Giao tiếp & Ngôn ngữ', color: 'sky' },
  'active-life': { titleVi: 'Thể thao & Lối sống năng động', color: 'lime' },
  energy: { titleVi: 'Năng lượng & Tài nguyên', color: 'emerald' },
  oceans: { titleVi: 'Đại dương & Sinh thái biển', color: 'cyan' },
  'personal-finance': { titleVi: 'Tài chính cá nhân', color: 'violet' }
};

const POS_SHORT_MAP = {
  'Cụm danh từ': 'n. phr.',
  'Cụm động từ': 'v. phr.',
  'Cụm giới từ': 'prep. phr.',
  'Cụm tính từ': 'adj. phr.',
  'Cụm trạng từ': 'adv. phr.',
  'Danh từ': 'n.',
  'Động từ': 'v.',
  'Tính từ': 'adj.',
  'Trạng từ': 'adv.',
  'Thành ngữ': 'idiom',
  'Giới từ': 'prep.',
  'Liên từ': 'conj.'
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

function extractCollocationsFromPattern(pattern, term) {
  if (!pattern || typeof pattern !== 'string') return [];
  const results = [];
  const plusMatch = pattern.match(/([a-zA-Z\s/'-]+)\+\s*([^;.,]+)/);
  if (plusMatch) {
    const leftParts = plusMatch[1].split('/').map((s) => s.trim()).filter(Boolean);
    const right = plusMatch[2].trim();
    for (const lp of leftParts.slice(0, 3)) {
      // Avoid Vietnamese words on left side
      if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(lp)) continue;
      const cleanLeft = lp.replace(/^.*;\s*/, '').trim();
      if (cleanLeft && cleanLeft.length <= 32) {
        results.push(`${cleanLeft} ${right || term}`.replace(/\s+/g, ' ').trim());
      }
    }
  }
  return [...new Set(results)].slice(0, 4);
}

function formatIpa(rawPhonetic) {
  const clean = String(rawPhonetic || '').trim();
  if (!clean) return '';
  if (clean.startsWith('/') && clean.endsWith('/')) return clean;
  return `/${clean.replace(/^\/+|\/+$/g, '')}/`;
}

function detectAcademicTag(term, label, awlSet, nawlSet) {
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
  if (label && label.includes('Từ học thuật')) return 'AWL';
  return undefined;
}

function inferCefr(label, academicTag, indexInTopic) {
  if (label && label.includes('Thành ngữ')) return 'C2';
  if (label && label.includes('Từ học thuật')) return indexInTopic >= 140 ? 'C2' : 'C1';
  if (academicTag === 'NAWL') return 'C1';
  if (academicTag === 'AWL') return indexInTopic >= 120 ? 'C1' : 'B2';
  return indexInTopic >= 130 ? 'C1' : 'B2';
}

function sanitizeText(str) {
  // Ensure zero CJK characters ever sneak in
  return String(str || '').replace(/[\u4e00-\u9fff]+/g, '').trim();
}

async function run() {
  console.log('1. Fetching ForumFlash entry HTML to resolve current chunk hashes...');
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

  // Parse webpack chunk hash map: {38:"f194d7ebac5f4e01", ...}
  const chunkMapMatch = webpackJs.match(/\{(?:\d+:"[a-f0-9]+",?)+\}/);
  if (!chunkMapMatch) throw new Error('Could not parse webpack chunk hash map');
  const chunkHashMap = new Function(`return (${chunkMapMatch[0]})`)();

  // Find all dynamic JSON module maps containing ./education.json and pick the flashcard map (the one with `rows`)
  const candidateMapMatches = [...pageJs.matchAll(/\{\s*"\.\/active-life\.json":\[\d+,\d+\][^}]*\}/g)];
  if (candidateMapMatches.length === 0) {
    throw new Error('Could not parse any vocab module map from app/page chunk');
  }
  let vocabModuleMap = null;
  for (const m of candidateMapMatches) {
    const candidate = new Function(`return (${m[0]})`)();
    const eduPair = candidate['./education.json'];
    if (!eduPair) continue;
    const hash = chunkHashMap[eduPair[1]];
    if (!hash) continue;
    const probeJs = await fetchText(`${BASE_URL}/_next/static/chunks/${eduPair[1]}.${hash}.js`);
    const probeDecoded = unwrapEncoded(extractChunkExports(probeJs, eduPair[0]));
    if (Array.isArray(probeDecoded?.rows) && probeDecoded.rows.length > 0) {
      vocabModuleMap = candidate;
      break;
    }
  }
  if (!vocabModuleMap) {
    throw new Error('Could not find flashcard vocab module map containing rows');
  }

  // Parse IELTS topics metadata array from app/page chunk (contains JS hex escapes like \xe1)
  const eduIdx = pageJs.indexOf('{"id":"education"');
  if (eduIdx === -1) throw new Error('Could not locate education topic definition');
  const arrayEnd = pageJs.indexOf(']', eduIdx);
  const ieltsTopicsRaw = new Function(`return [${pageJs.slice(eduIdx, arrayEnd + 1)}`)();
  console.log(`2. Discovered ${ieltsTopicsRaw.length} IELTS topics from ForumFlash.`);

  fs.mkdirSync(TOPICS_DIR, { recursive: true });

  const newTopicSlugs = new Set();
  const manifestTopics = [];
  let grandTotalWords = 0;
  let totalAcademicTagged = 0;

  for (let tIdx = 0; tIdx < ieltsTopicsRaw.length; tIdx += 1) {
    const meta = ieltsTopicsRaw[tIdx];
    const slug = meta.id;
    const key = `./${slug}.json`;
    const pair = vocabModuleMap[key];
    if (!pair) {
      throw new Error(`No webpack module mapping found for ${key}`);
    }
    const moduleId = pair[0];
    const chunkId = pair[1];
    const hash = chunkHashMap[chunkId];
    if (!hash) {
      throw new Error(`No webpack hash found for chunkId ${chunkId} (${slug})`);
    }
    const chunkUrl = `${BASE_URL}/_next/static/chunks/${chunkId}.${hash}.js`;
    const chunkJs = await fetchText(chunkUrl);
    const rawExport = extractChunkExports(chunkJs, moduleId);
    const decoded = unwrapEncoded(rawExport);

    const classes = decoded.classes || [];
    const rows = decoded.rows || [];

    const words = rows.map((row, idx) => {
      const [rawTerm, rawDef, rawPattern, rawExamples, rawPhonetic, classIdx] = row;
      const [rawLabel, rawPosVi] = classes[classIdx] || ['Collocation · IELTS', 'Cụm danh từ'];
      const term = sanitizeText(rawTerm);
      const meaningVi = sanitizeText(rawDef);
      const pattern = sanitizeText(rawPattern);
      const examples = (Array.isArray(rawExamples) ? rawExamples : [])
        .map(sanitizeText)
        .filter((s) => s.length > 0);
      const label = sanitizeText(rawLabel) || 'Collocation · IELTS';
      const partOfSpeechVi = sanitizeText(rawPosVi) || 'Cụm danh từ';
      const pos = POS_SHORT_MAP[partOfSpeechVi] || 'phr.';
      const academicTag = detectAcademicTag(term, label, awlSet, nawlSet);
      if (academicTag) totalAcademicTagged += 1;

      const exampleIeltsEn = examples[0] || `In IELTS writing, "${term}" is commonly used when discussing ${meta.title.toLowerCase()}.`;
      const exampleDailyEn = examples[1] || exampleIeltsEn;

      const item = {
        id: `${slug}-item-${idx + 1}`,
        word: term,
        ipaUs: formatIpa(rawPhonetic),
        pos,
        partOfSpeechVi,
        label,
        pattern,
        cefr: inferCefr(label, academicTag, idx),
        topic: slug,
        meaningVi: meaningVi && meaningVi.toLowerCase() !== term.toLowerCase() ? meaningVi : `thuật ngữ ${term}`,
        definitionEn: pattern || `${label} (${partOfSpeechVi})`,
        exampleDailyEn,
        exampleIeltsEn,
        examples,
        collocations: extractCollocationsFromPattern(pattern, term),
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
        id: `topic-${slug}-l${String(lessonNumber).padStart(2, '0')}`,
        lessonNumber,
        title: `Bài ${String(lessonNumber).padStart(2, '0')}`,
        wordCount: slice.length,
        words: slice
      });
    }

    const viMeta = TOPIC_VI_TITLES[slug] || { titleVi: meta.title, color: 'teal' };
    const unitPayload = {
      id: `topic-${slug}`,
      slug,
      trackType: 'ielts_topics',
      order: tIdx + 1,
      titleEn: meta.title,
      titleVi: viMeta.titleVi,
      descVi: sanitizeText(meta.description),
      color: viMeta.color,
      totalWords: words.length,
      totalLessons: lessons.length,
      lessons
    };

    const outPath = path.join(TOPICS_DIR, `${slug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(unitPayload), 'utf8');
    newTopicSlugs.add(`${slug}.json`);
    grandTotalWords += words.length;

    manifestTopics.push({
      id: unitPayload.id,
      slug,
      order: tIdx + 1,
      titleEn: unitPayload.titleEn,
      titleVi: unitPayload.titleVi,
      descVi: unitPayload.descVi,
      color: unitPayload.color,
      totalWords: words.length,
      totalLessons: lessons.length,
      dataPath: `/curriculum/topics/${slug}.json`
    });

    console.log(`  [${String(tIdx + 1).padStart(2, '0')}/${ieltsTopicsRaw.length}] ${slug}.json -> ${words.length} collocations (${lessons.length} lessons)`);
  }

  // Clean up old stale topic JSON files not in the 25 new IELTS topics
  for (const existingFile of fs.readdirSync(TOPICS_DIR)) {
    if (existingFile.endsWith('.json') && !newTopicSlugs.has(existingFile)) {
      fs.unlinkSync(path.join(TOPICS_DIR, existingFile));
      console.log(`  Removed obsolete topic file: ${existingFile}`);
    }
  }

  // Update manifest.json preserving cefrVocab & grammar
  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = '3.0.0';
  manifest.generatedAt = new Date().toISOString();
  manifest.stats.totalIeltsTopics = manifestTopics.length;
  manifest.stats.totalIeltsWords = grandTotalWords;
  manifest.ieltsTopics = manifestTopics;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\nDONE: Synced ${manifestTopics.length} IELTS topics, ${grandTotalWords} collocations/terms (AWL/NAWL tagged: ${totalAcademicTagged}). Manifest bumped to v3.0.0.`);
}

run().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
