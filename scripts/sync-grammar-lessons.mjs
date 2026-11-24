import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.join(__dirname, '..', 'public', 'curriculum');
const GRAMMAR_DIR = path.join(OUT_DIR, 'grammar');

const BASE_URL = 'https://www.forumflashstudy.com';
const EXERCISES_PER_LESSON = 6;

const GRAMMAR_LEVEL_META = [
  {
    slug: 'a1',
    cefr: 'A1',
    order: 1,
    titleEn: 'CEFR A1 Grammar Foundation',
    titleVi: 'Nền tảng câu tiếng Anh (A1)',
    descVi: 'Nhận diện thành phần câu, động từ to be, các thì cơ bản và cấu trúc sinh hoạt hàng ngày.'
  },
  {
    slug: 'a2',
    cefr: 'A2',
    order: 2,
    titleEn: 'CEFR A2 Everyday Grammar',
    titleVi: 'Ngữ pháp giao tiếp mở rộng (A2)',
    descVi: 'Quá khứ tiếp diễn, hiện tại hoàn thành cơ bản, so sánh, mệnh đề nối và kế hoạch tương lai.'
  },
  {
    slug: 'b1',
    cefr: 'B1',
    order: 3,
    titleEn: 'CEFR B1 Intermediate Grammar',
    titleVi: 'Ngữ pháp trung cấp (B1 · IELTS 5.5–6.0)',
    descVi: 'Câu bị động, mệnh đề quan hệ, câu điều kiện loại 1–2, câu tường thuật và động từ khuyết thiếu.'
  },
  {
    slug: 'b2',
    cefr: 'B2',
    order: 4,
    titleEn: 'CEFR B2 Upper-Intermediate Grammar',
    titleVi: 'Ngữ pháp trung cao cấp (B2 · IELTS 6.5–7.0)',
    descVi: 'Điều kiện hỗn hợp, đảo ngữ, câu chẻ nhấn mạnh, mệnh đề phân từ và cấu trúc viết học thuật.'
  },
  {
    slug: 'c1',
    cefr: 'C1',
    order: 5,
    titleEn: 'CEFR C1 Advanced Grammar',
    titleVi: 'Ngữ pháp cao cấp (C1 · IELTS 7.5–8.0)',
    descVi: 'Danh từ hóa, cấu trúc giả định, nhượng bộ học thuật, rút gọn mệnh đề nâng cao và mạch lạc văn bản.'
  },
  {
    slug: 'c2',
    cefr: 'C2',
    order: 6,
    titleEn: 'CEFR C2 Mastery Grammar',
    titleVi: 'Ngữ pháp tinh thông học thuật (C2 · IELTS 8.5+)',
    descVi: 'Sắc thái học thuật, hedging chuẩn xác, chuyển mạch lập luận và kiểm soát văn phong như bản xứ.'
  }
];

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

function expandPoolUnit(unit) {
  const { pool = [], levels = {}, questions = [], ...rest } = unit;
  const resolveList = (indices) => indices.map((idx) => (typeof idx === 'number' ? pool[idx] : idx)).filter(Boolean);
  const expandedLevels = {};
  for (const [k, v] of Object.entries(levels)) {
    expandedLevels[k] = Array.isArray(v) ? resolveList(v) : v;
  }
  return {
    ...rest,
    questions: Array.isArray(questions) ? resolveList(questions) : [],
    levels: expandedLevels
  };
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

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

function sanitizeText(str) {
  return String(str || '').replace(/[\u4e00-\u9fff]+/g, '').trim();
}

function toChoiceExercise(q) {
  if (!q || typeof q !== 'object') return null;
  if (!Array.isArray(q.options) || q.options.length < 2) return null;
  const options = q.options.map((opt) => sanitizeText(opt)).filter(Boolean);
  if (options.length < 2) return null;

  const answerStr = sanitizeText(q.answer);
  let correctAnswer = options.findIndex((o) => o === answerStr);
  if (correctAnswer === -1) {
    correctAnswer = options.findIndex((o) => o.toLowerCase() === answerStr.toLowerCase());
  }
  if (correctAnswer === -1) return null;

  const promptParts = [];
  const prompt = sanitizeText(q.prompt);
  const sentence = sanitizeText(q.sentence || q.stem || q.context || '');
  if (prompt) promptParts.push(prompt);
  if (sentence && !prompt.includes(sentence)) promptParts.push(sentence);

  const question = promptParts.join(' — ') || 'Chọn phương án đúng:';
  const explanationVi = sanitizeText(q.explain || q.explanation || `Đáp án đúng là "${options[correctAnswer]}".`);

  return {
    question,
    options,
    correctAnswer,
    explanationVi
  };
}

function pickBalancedExercises(unit, limit = EXERCISES_PER_LESSON) {
  const seen = new Set();
  const picked = [];

  const tryAdd = (rawQ) => {
    if (picked.length >= limit) return;
    const ex = toChoiceExercise(rawQ);
    if (!ex) return;
    const key = `${ex.question}::${ex.options.join('|')}`;
    if (seen.has(key)) return;
    seen.add(key);
    picked.push(ex);
  };

  // Pick balanced difficulty: 2 easy, 2 medium, 2 hard
  const buckets = [
    unit.levels?.easy || [],
    unit.levels?.medium || [],
    unit.levels?.hard || []
  ];
  for (const bucket of buckets) {
    let addedFromBucket = 0;
    for (const q of bucket) {
      if (addedFromBucket >= 2) break;
      const before = picked.length;
      tryAdd(q);
      if (picked.length > before) addedFromBucket += 1;
    }
  }

  // Top up from all remaining questions if needed
  const fallbackPool = [
    ...(unit.questions || []),
    ...(unit.levels?.easy || []),
    ...(unit.levels?.medium || []),
    ...(unit.levels?.hard || [])
  ];
  for (const q of fallbackPool) {
    if (picked.length >= limit) break;
    tryAdd(q);
  }

  return picked;
}

function buildIeltsTip(unit) {
  const checklist = unit.lesson?.checklist;
  if (Array.isArray(checklist) && checklist.length > 0) {
    return checklist.slice(0, 2).map(sanitizeText).filter(Boolean).join(' · ');
  }
  const firstUse = unit.lesson?.useCases?.[0];
  if (firstUse?.title && firstUse?.detail) {
    return `${sanitizeText(firstUse.title)}: ${sanitizeText(firstUse.detail)}`;
  }
  return sanitizeText(unit.summary || 'Áp dụng đúng cấu trúc này giúp tăng điểm Grammatical Range & Accuracy trong IELTS Writing & Speaking.');
}

function buildCommonMistake(unit) {
  const err0 = unit.lesson?.errors?.[0];
  if (err0 && err0.wrong && err0.correct) {
    return {
      wrong: sanitizeText(err0.wrong),
      right: sanitizeText(err0.correct),
      whyVi: sanitizeText(err0.note || 'Chú ý chia đúng dạng và trật tự cấu trúc trong câu.')
    };
  }
  const rawMistake = sanitizeText(unit.mistake || '').replace(/^Sai:\s*/i, '');
  const rawExample = sanitizeText(unit.example || '');
  return {
    wrong: rawMistake || 'Thiếu kiểm tra sự hòa hợp chủ ngữ – động từ.',
    right: rawExample || sanitizeText(unit.formula),
    whyVi: sanitizeText(unit.summary || 'Luôn đối chiếu với công thức chuẩn của chủ điểm này.')
  };
}

function mapGrammarUnitToLesson(rawUnit, index, cefr) {
  const u = expandPoolUnit(rawUnit);
  const lessonObj = u.lesson || {};

  const examples = (Array.isArray(lessonObj.examples) ? lessonObj.examples : [])
    .filter((ex) => ex && ex.sentence)
    .slice(0, 6)
    .map((ex) => ({
      en: sanitizeText(ex.sentence),
      vi: sanitizeText(ex.translation || ''),
      ...(ex.note ? { note: sanitizeText(ex.note) } : {}),
      ...(ex.label ? { label: sanitizeText(ex.label) } : {})
    }));

  if (examples.length === 0 && u.example) {
    examples.push({ en: sanitizeText(u.example), vi: sanitizeText(u.summary || '') });
  }

  const useCases = (Array.isArray(lessonObj.useCases) ? lessonObj.useCases : [])
    .filter((item) => item && item.title)
    .map((item) => ({
      title: sanitizeText(item.title),
      detail: sanitizeText(item.detail || ''),
      example: sanitizeText(item.example || '')
    }));

  const forms = (Array.isArray(lessonObj.forms) ? lessonObj.forms : [])
    .filter((item) => item && item.label)
    .map((item) => ({
      label: sanitizeText(item.label),
      pattern: sanitizeText(item.pattern || ''),
      example: sanitizeText(item.example || '')
    }));

  const formation = (Array.isArray(lessonObj.formation) ? lessonObj.formation : [])
    .filter((item) => item && item.step)
    .map((item) => ({
      step: sanitizeText(item.step),
      detail: sanitizeText(item.detail || ''),
      example: sanitizeText(item.example || '')
    }));

  const moreMistakes = (Array.isArray(lessonObj.errors) ? lessonObj.errors.slice(1, 4) : [])
    .filter((e) => e && e.wrong && e.correct)
    .map((e) => ({
      wrong: sanitizeText(e.wrong),
      right: sanitizeText(e.correct),
      whyVi: sanitizeText(e.note || '')
    }));

  const checklist = (Array.isArray(lessonObj.checklist) ? lessonObj.checklist : [])
    .map(sanitizeText)
    .filter(Boolean);

  const exercises = pickBalancedExercises(u, EXERCISES_PER_LESSON);

  const result = {
    id: sanitizeText(u.id || `gr-${cefr.toLowerCase()}-${String(index + 1).padStart(2, '0')}`),
    lessonNumber: index + 1,
    category: sanitizeText(u.group || 'Ngữ pháp'),
    title: sanitizeText(u.title),
    titleVi: sanitizeText(u.titleVi || u.title),
    cefr,
    formula: sanitizeText(u.formula || u.summary),
    explanationVi: sanitizeText(lessonObj.purpose || u.summary),
    ieltsTipVi: buildIeltsTip(u),
    examples,
    commonMistake: buildCommonMistake(u),
    exercises
  };

  if (useCases.length > 0) result.useCases = useCases;
  if (forms.length > 0) result.forms = forms;
  if (formation.length > 0) result.formation = formation;
  if (moreMistakes.length > 0) result.moreMistakes = moreMistakes;
  if (checklist.length > 0) result.checklist = checklist;

  return result;
}

async function run() {
  console.log('1. Fetching ForumFlash entry HTML to resolve current chunk hashes...');
  const html = await fetchText(`${BASE_URL}/home`);
  const webpackMatch = html.match(/\/_next\/static\/chunks\/webpack-[a-f0-9]+\.js/);
  const pageMatch = html.match(/\/_next\/static\/chunks\/app\/page-[a-f0-9]+\.js/);
  if (!webpackMatch || !pageMatch) {
    throw new Error('Could not find webpack or app/page chunk URLs in /home HTML');
  }

  const [webpackJs, pageJs] = await Promise.all([
    fetchText(`${BASE_URL}${webpackMatch[0]}`),
    fetchText(`${BASE_URL}${pageMatch[0]}`)
  ]);

  const chunkMapMatch = webpackJs.match(/\{(?:\d+:"[a-f0-9]+",?)+\}/);
  if (!chunkMapMatch) throw new Error('Could not parse webpack chunk hash map');
  const chunkHashMap = new Function(`return (${chunkMapMatch[0]})`)();

  // Locate grammar dynamic module map: {"./a1.json":[8541,8541],...,"./c2.json":[6038,6038]}
  const grammarMapMatch = pageJs.match(/\{\s*"\.\/a1\.json":\[\d+,\d+\][^}]*"\.\/c2\.json":\[\d+,\d+\][^}]*\}/);
  if (!grammarMapMatch) {
    throw new Error('Could not locate grammar module map in app/page chunk');
  }
  const grammarModuleMap = new Function(`return (${grammarMapMatch[0]})`)();

  fs.mkdirSync(GRAMMAR_DIR, { recursive: true });

  const manifestGrammar = [];
  let totalGrammarLessons = 0;
  let totalExercises = 0;

  for (const levelMeta of GRAMMAR_LEVEL_META) {
    const key = `./${levelMeta.slug}.json`;
    const pair = grammarModuleMap[key];
    if (!pair) throw new Error(`No grammar module mapping found for ${key}`);

    const [moduleId, chunkId] = pair;
    const hash = chunkHashMap[chunkId];
    if (!hash) throw new Error(`No webpack hash found for grammar chunkId ${chunkId} (${levelMeta.slug})`);

    const chunkUrl = `${BASE_URL}/_next/static/chunks/${chunkId}.${hash}.js`;
    const chunkJs = await fetchText(chunkUrl);
    const rawExport = extractChunkExports(chunkJs, moduleId);
    const decoded = unwrapEncoded(rawExport);

    const rawUnits = Array.isArray(decoded?.units) ? decoded.units : [];
    const lessons = rawUnits.map((u, idx) => mapGrammarUnitToLesson(u, idx, levelMeta.cefr));
    const levelExercises = lessons.reduce((sum, l) => sum + l.exercises.length, 0);

    const unitPayload = {
      id: `grammar-${levelMeta.slug}`,
      slug: levelMeta.slug,
      cefr: levelMeta.cefr,
      trackType: 'grammar',
      order: levelMeta.order,
      titleVi: levelMeta.titleVi,
      descVi: levelMeta.descVi,
      totalLessons: lessons.length,
      lessons
    };

    const outPath = path.join(GRAMMAR_DIR, `${levelMeta.slug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(unitPayload), 'utf8');

    manifestGrammar.push({
      id: unitPayload.id,
      slug: levelMeta.slug,
      cefr: levelMeta.cefr,
      order: levelMeta.order,
      titleEn: levelMeta.titleEn,
      titleVi: levelMeta.titleVi,
      descVi: levelMeta.descVi,
      totalLessons: lessons.length,
      dataPath: `/curriculum/grammar/${levelMeta.slug}.json`
    });

    totalGrammarLessons += lessons.length;
    totalExercises += levelExercises;
    console.log(`  [${levelMeta.cefr}] ${levelMeta.slug}.json -> ${lessons.length} units, ${levelExercises} exercises`);
  }

  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = '3.1.0';
  manifest.generatedAt = new Date().toISOString();
  manifest.stats.totalGrammarLessons = totalGrammarLessons;
  manifest.grammar = manifestGrammar;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\nDONE: Total ${totalGrammarLessons} grammar lessons across A1-C2 (${totalExercises} exercises). Manifest bumped to v3.1.0.`);
}

run().catch((err) => {
  console.error('Grammar sync failed:', err);
  process.exit(1);
});
