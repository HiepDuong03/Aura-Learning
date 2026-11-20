/**
 * Backend Router for AI Roleplay & Cached Master Dictionary/Translation
 * Keeps LLM keys strictly on server, caches words in `words_master`,
 * and enforces RBAC daily quotas (`user` vs `pro`/`admin`).
 */

export const MAX_USER_CUSTOM_LESSONS = 5;
export const MAX_USER_DAILY_AI_TURNS = 10;

const POS_DISPLAY_MAP = {
  noun: 'danh từ (noun)',
  verb: 'động từ (verb)',
  adjective: 'tính từ (adj)',
  adverb: 'phó từ (adv)',
  preposition: 'giới từ (prep)',
  conjunction: 'liên từ (conj)',
  pronoun: 'đại từ (pron)'
};

function generateFallbackRephrase(text) {
  const clean = String(text || '').trim();
  const lower = clean.toLowerCase();
  if (lower.includes('i want to have') || lower.includes('i want')) {
    return clean.replace(/i want to have|i want/gi, 'Could I please get');
  }
  if (lower.includes('how much money') || lower.includes('how much is it')) {
    return "How much does that come out to?";
  }
  if (lower.includes('give me')) {
    return clean.replace(/give me/gi, 'May I have');
  }
  return `In natural conversation, try adding polite framing: "Excuse me, ${clean}"`;
}

function generateFallbackRoleplay(personaId, userMessage) {
  const input = String(userMessage || '').toLowerCase();
  const nativeRephrase = generateFallbackRephrase(userMessage);

  if (personaId === 'cafe-barista') {
    if (input.includes('latte') || input.includes('coffee') || input.includes('oat')) {
      return {
        reply: "Got it! One iced oat milk latte, half-sweet. Anything else from our pastry case?",
        nativeRephrase,
        grammarTip: "Khi gọi đồ uống ở Mỹ, dùng 'Could I get an iced oat latte, half-sweet?' nghe tự nhiên hơn."
      };
    }
    if (input.includes('wifi') || input.includes('password')) {
      return {
        reply: "Our Wi-Fi network is 'CentralRoast_Guest' and the passcode is printed at the bottom of your receipt.",
        nativeRephrase,
        grammarTip: "Hỏi mật khẩu lịch sự: 'Could I have the Wi-Fi password, please?'"
      };
    }
    return {
      reply: "Sure thing! Your total comes to $5.50. Will that be card or cash today?",
      nativeRephrase,
      grammarTip: "Dùng 'I'll pay by card' hoặc 'Tap to pay, please' khi thanh toán."
    };
  }

  if (personaId === 'airport-officer') {
    if (input.includes('hotel') || input.includes('stay') || input.includes('days') || input.includes('vacation') || input.includes('holiday')) {
      return {
        reply: "Thank you. And do you have a confirmed return ticket and anything to declare?",
        nativeRephrase,
        grammarTip: "Nêu thời gian lưu trú rõ ràng: 'I'm staying for ten days at the Hilton Hotel for sightseeing.'"
      };
    }
    return {
      reply: "Alright, passport stamped. Welcome to London—please proceed to baggage claim carousel 4.",
      nativeRephrase,
      grammarTip: "Khi xuất nhập cảnh hãy trả lời ngắn gọn, đúng trọng tâm câu hỏi."
    };
  }

  if (personaId === 'hotel-reception') {
    if (input.includes('minibar') || input.includes('charge') || input.includes('bill') || input.includes('mistake')) {
      return {
        reply: "I sincerely apologize for the mix-up on your bill. I'll remove the minibar charge right away. Would you like us to store your luggage until this afternoon?",
        nativeRephrase,
        grammarTip: "Khiếu nại khéo léo: 'I believe there might be a billing error—I didn't use the minibar.'"
      };
    }
    return {
      reply: "Of course! We can safely hold your bags at the concierge desk until 6 PM. Here is your claim tag.",
      nativeRephrase,
      grammarTip: "Nhờ giữ hành lý: 'Would it be possible to leave my luggage here until this afternoon?'"
    };
  }

  if (personaId === 'tech-interviewer') {
    if (input.includes('project') || input.includes('deadline') || input.includes('delay') || input.includes('team')) {
      return {
        reply: "That's a structured approach. How did you communicate the timeline trade-offs to stakeholders when the deadline was at risk?",
        nativeRephrase,
        grammarTip: "Phỏng vấn Tech nên dùng cấu trúc STAR (Situation - Task - Action - Result)."
      };
    }
    return {
      reply: "Thanks for sharing that background. Can you walk me through a specific technical bottleneck you resolved and its measurable impact?",
      nativeRephrase,
      grammarTip: "Nhấn mạnh kết quả định lượng: 'We reduced API latency by 40% after refactoring the cache layer.'"
    };
  }

  return {
    reply: "Understood! Could you share a bit more detail so I can help you properly?",
    nativeRephrase,
    grammarTip: "Mở rộng câu trả lời thêm 1 chi tiết lý do hoặc ví dụ cụ thể."
  };
}

async function defaultFetchDictionaryEntry(cleanWord) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const [translateRes, dictRes] = await Promise.allSettled([
      fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&q=${encodeURIComponent(cleanWord)}`,
        { signal: controller.signal }
      ),
      fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`,
        { signal: controller.signal }
      )
    ]);

    let translation = '';
    let partOfSpeech = 'vocabulary';
    const synonyms = [];

    if (translateRes.status === 'fulfilled' && translateRes.value.ok) {
      const data = await translateRes.value.json();
      translation = data?.[0]?.[0]?.[0] || '';
      if (Array.isArray(data?.[1]) && data[1].length > 0) {
        partOfSpeech = data[1][0]?.[0] || 'vocabulary';
        if (Array.isArray(data[1][0]?.[1])) {
          synonyms.push(...data[1][0][1].slice(0, 5));
        }
      }
    }

    let phonetic = `/${cleanWord}/`;
    let definitionEn = '';
    let exampleEn = '';

    if (dictRes.status === 'fulfilled' && dictRes.value.ok) {
      const dictJson = await dictRes.value.json();
      const first = Array.isArray(dictJson) ? dictJson[0] : null;
      if (first) {
        phonetic = first.phonetic || first.phonetics?.find(p => p.text)?.text || phonetic;
        const firstMeaning = first.meanings?.[0];
        if (firstMeaning) {
          if (partOfSpeech === 'vocabulary' && firstMeaning.partOfSpeech) {
            partOfSpeech = firstMeaning.partOfSpeech;
          }
          const defObj = firstMeaning.definitions?.[0];
          if (defObj) {
            definitionEn = defObj.definition || '';
            exampleEn = defObj.example || '';
          }
        }
      }
    }

    if (!translation) return null;

    return {
      word: cleanWord,
      phonetic,
      partOfSpeech: POS_DISPLAY_MAP[partOfSpeech] || partOfSpeech,
      translation,
      definitionEn: definitionEn || `Meaning of "${cleanWord}": ${translation}`,
      exampleEn: exampleEn || (synonyms.length > 0 ? `Synonyms: ${synonyms.join(', ')}` : `Vocabulary from lesson.`),
      synonyms
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function defaultFetchBatchTranslation(texts) {
  const CHUNK_SIZE = 12;
  const results = [];
  for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
    const chunk = texts.slice(i, i + CHUNK_SIZE);
    const joinedText = chunk.map(t => String(t || '').replace(/\n/g, ' ')).join('\n');
    try {
      const res = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(joinedText)}`
      );
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data?.[0]) ? data[0].map(item => item[0]).join('') : '';
        const lines = raw.split('\n');
        for (let j = 0; j < chunk.length; j++) {
          results.push(lines[j]?.trim() || chunk[j]);
        }
      } else {
        results.push(...chunk);
      }
    } catch {
      results.push(...chunk);
    }
  }
  return results;
}

async function callGeminiRoleplay({ apiKey, personaName, personaRole, situation, mission, history, userMessage }) {
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const recentHistory = (Array.isArray(history) ? history : [])
    .slice(-6)
    .map(m => `${m.sender === 'AI' ? personaName : 'Learner'}: ${m.text}`)
    .join('\n');

  const prompt = [
    `You are roleplaying as "${personaName}" (${personaRole}) in an interactive English speaking practice.`,
    `Situation: ${situation}`,
    `Learner Mission: ${mission}`,
    recentHistory ? `Recent Conversation:\n${recentHistory}` : '',
    `Learner just said: "${userMessage}"`,
    `Respond in JSON with exactly 3 string fields:`,
    `- "reply": Natural, concise 1-3 sentence in-character English reply continuing the conversation.`,
    `- "nativeRephrase": A more natural native-speaker way to say what the learner just said (in English).`,
    `- "grammarTip": One short, helpful Vietnamese feedback tip (max 25 words) about phrasing or grammar.`
  ].filter(Boolean).join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7
        }
      })
    });
    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}`);
    }
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = JSON.parse(rawText);
    return {
      reply: String(parsed.reply || '').trim() || "Could you tell me a bit more?",
      nativeRephrase: String(parsed.nativeRephrase || '').trim() || generateFallbackRephrase(userMessage),
      grammarTip: String(parsed.grammarTip || '').trim()
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function handlePublicDictRoutes({ req, res, pathname, db, parseJsonBody, sendJson, options = {} }) {
  const lookupFn = options.fetchDictionaryEntry || defaultFetchDictionaryEntry;
  const batchTranslateFn = options.fetchBatchTranslation || defaultFetchBatchTranslation;

  if (pathname === '/api/dict/lookup' && req.method === 'GET') {
    try {
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const rawWord = (parsedUrl.searchParams.get('w') || '').trim();
      const normalized = rawWord.replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '').replace(/['’]s$/i, '').toLowerCase();

      if (!normalized || normalized.length > 64) {
        sendJson(req, res, 400, { error: 'Từ khóa tra cứu không hợp lệ.' });
        return true;
      }

      // 1. Try persistent DB master cache first
      const cached = await db.findMasterWord(normalized);
      if (cached && cached.defaultTranslationVi) {
        sendJson(req, res, 200, {
          word: cached.lemma,
          phonetic: cached.phonetic || `/${cached.lemma}/`,
          partOfSpeech: cached.partOfSpeech || 'vocabulary',
          translation: cached.defaultTranslationVi,
          definitionEn: cached.definitionEn || `Meaning of "${cached.lemma}": ${cached.defaultTranslationVi}`,
          exampleEn: cached.exampleEn || '',
          synonyms: cached.synonyms && cached.synonyms.length > 0 ? cached.synonyms : undefined,
          source: 'db_cache'
        });
        return true;
      }

      // 2. Fetch upstream & persist into words_master
      const fetched = await lookupFn(normalized);
      if (!fetched) {
        sendJson(req, res, 200, {
          word: normalized,
          phonetic: `/${normalized}/`,
          partOfSpeech: 'từ vựng (vocabulary)',
          translation: normalized,
          definitionEn: `Từ vựng tiếng Anh: "${normalized}"`,
          exampleEn: '',
          source: 'fallback'
        });
        return true;
      }

      await db.upsertMasterWord(fetched);
      sendJson(req, res, 200, { ...fetched, source: 'upstream' });
      return true;
    } catch (err) {
      sendJson(req, res, 500, { error: err.message || 'Lỗi tra từ điển máy chủ.' });
      return true;
    }
  }

  if (pathname === '/api/dict/translate-batch' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const texts = Array.isArray(body.texts) ? body.texts : [];
      if (texts.length === 0 || texts.length > 60) {
        sendJson(req, res, 400, { error: 'Danh sách câu dịch phải từ 1 đến 60 dòng mỗi lượt.' });
        return true;
      }
      const translations = await batchTranslateFn(texts);
      sendJson(req, res, 200, { translations });
      return true;
    } catch (err) {
      sendJson(req, res, 500, { error: err.message || 'Lỗi dịch phụ đề hàng loạt.' });
      return true;
    }
  }

  return false;
}

export async function handleAuthenticatedAiRoutes({ req, res, pathname, db, currentUser, parseJsonBody, sendJson, options = {} }) {
  if (pathname === '/api/ai/roleplay' && req.method === 'POST') {
    try {
      const role = currentUser.role || 'user';
      if (role === 'guest') {
        sendJson(req, res, 403, { error: 'Vui lòng đăng nhập để sử dụng AI Roleplay.' });
        return true;
      }

      const dateKey = new Date().toISOString().slice(0, 10);
      const isUnlimited = role === 'pro' || role === 'admin';
      const usedBefore = await db.getAiUsageCount(currentUser.id, dateKey);

      if (!isUnlimited && usedBefore >= MAX_USER_DAILY_AI_TURNS) {
        sendJson(req, res, 429, {
          error: `Bạn đã dùng hết ${MAX_USER_DAILY_AI_TURNS} lượt AI Roleplay miễn phí hôm nay. Nâng cấp Pro để luyện nói không giới hạn!`,
          quota: { used: usedBefore, limit: MAX_USER_DAILY_AI_TURNS, unlimited: false }
        });
        return true;
      }

      const body = await parseJsonBody(req);
      const userMessage = String(body.userMessage || '').trim();
      const personaId = String(body.personaId || 'cafe-barista');
      const personaName = String(body.personaName || 'AI Tutor');
      const personaRole = String(body.personaRole || 'English Partner');
      const situation = String(body.situation || '');
      const mission = String(body.mission || '');
      const history = Array.isArray(body.history) ? body.history : [];

      if (!userMessage || userMessage.length > 800) {
        sendJson(req, res, 400, { error: 'Tin nhắn hội thoại không hợp lệ (tối đa 800 ký tự).' });
        return true;
      }

      const usedAfter = await db.incrementAiUsage(currentUser.id, dateKey);
      const quota = {
        used: usedAfter,
        limit: isUnlimited ? null : MAX_USER_DAILY_AI_TURNS,
        unlimited: isUnlimited
      };

      const apiKey = (options.geminiApiKey ?? process.env.GEMINI_API_KEY ?? '').trim();
      if (options.aiResponder) {
        const result = await options.aiResponder({ personaId, personaName, personaRole, situation, mission, history, userMessage });
        sendJson(req, res, 200, { ...result, source: 'gemini', isFallback: false, quota });
        return true;
      }

      if (apiKey) {
        try {
          const result = await callGeminiRoleplay({ apiKey, personaName, personaRole, situation, mission, history, userMessage });
          sendJson(req, res, 200, { ...result, source: 'gemini', isFallback: false, quota });
          return true;
        } catch (aiErr) {
          console.warn('[AI Roleplay] Gemini call failed, falling back cleanly:', aiErr.message);
        }
      }

      const fallback = generateFallbackRoleplay(personaId, userMessage);
      sendJson(req, res, 200, { ...fallback, source: 'offline-fallback', isFallback: true, quota });
      return true;
    } catch (err) {
      sendJson(req, res, 500, { error: err.message || 'Lỗi xử lý AI Roleplay.' });
      return true;
    }
  }

  return false;
}
