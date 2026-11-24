/**
 * Backend Router for AI Features (Roleplay, Contextual Explain, Auto-Quiz, Scenario Generator)
 * & Cached Master Dictionary/Translation.
 * Keeps LLM keys strictly on server, caches words/phrases in `words_master`,
 * and enforces RBAC daily quotas (`user` 20 turns/day vs `pro`/`admin` unlimited).
 */

export const MAX_USER_CUSTOM_LESSONS = 5;
export const MAX_USER_DAILY_AI_TURNS = 20;

const POS_DISPLAY_MAP = {
  noun: 'danh từ (noun)',
  verb: 'động từ (verb)',
  adjective: 'tính từ (adj)',
  adverb: 'phó từ (adv)',
  preposition: 'giới từ (prep)',
  conjunction: 'liên từ (conj)',
  pronoun: 'đại từ (pron)'
};

const STOP_WORDS_EN = new Set([
  'the', 'and', 'that', 'this', 'with', 'from', 'have', 'were', 'been', 'will',
  'your', 'their', 'about', 'would', 'there', 'which', 'when', 'what', 'just',
  'like', 'into', 'they', 'them', 'then', 'than', 'only', 'some', 'more', 'very',
  'because', 'really', 'going', 'think', 'know', 'want', 'could', 'should'
]);

export function normalizeLookupQuery(rawWord) {
  return String(rawWord || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, '')
    .replace(/['’]s$/i, '')
    .toLowerCase();
}

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

export const VALID_CORRECTION_MODES = [
  'off',
  'written',
  'verbal_subtle',
  'verbal_explicit',
  'verbal_repeat'
];

export function buildCorrectionModeInstruction(mode) {
  switch (mode) {
    case 'off':
      return 'Correction Mode = OFF: Do NOT correct the learner inside "reply". Just keep the conversation flowing naturally.';
    case 'verbal_subtle':
      return 'Correction Mode = VERBAL SUBTLE (Recasting): In "reply", naturally rephrase any mistake the learner made inside your conversational response (e.g. Learner: "I go yesterday" -> You: "Oh, you went yesterday? What did you do?") without explicitly interrupting or lecturing.';
    case 'verbal_explicit':
      return 'Correction Mode = VERBAL EXPLICIT: If the learner makes a noticeable grammar/wording error, briefly mention the right phrasing at the start of "reply" in a warm, encouraging tone, then continue the conversation.';
    case 'verbal_repeat':
      return 'Correction Mode = VERBAL REPEAT: If the learner makes a noticeable grammar/wording error, gently give the correct phrasing in "reply" and invite them to repeat the corrected sentence before moving on. If they spoke accurately, praise briefly and continue.';
    case 'written':
    default:
      return 'Correction Mode = WRITTEN BELOW: Keep "reply" completely natural and in-character without interrupting to correct; put any grammar fixes in "correction" and native upgrades in "nativeRephrase".';
  }
}

function generateFallbackRoleplay(personaId, userMessage) {
  const input = String(userMessage || '').toLowerCase();
  const nativeRephrase = generateFallbackRephrase(userMessage);
  const wordCount = String(userMessage || '').trim().split(/\s+/).filter(Boolean).length;
  const qualityRating = wordCount >= 7 ? 'good' : 'revision_needed';
  const correction = /\bi want\b/i.test(userMessage)
    ? String(userMessage).replace(/\bi want\b/gi, "I'd like")
    : '';

  if (personaId === 'cafe-barista') {
    if (input.includes('latte') || input.includes('coffee') || input.includes('oat')) {
      return {
        reply: "Got it! One iced oat milk latte, half-sweet. Anything else from our pastry case?",
        replyTranslation: "Đã rõ! Một ly latte đá sữa yến mạch, giảm ngọt 50%. Bạn có muốn gọi thêm bánh ngọt không?",
        correction,
        nativeRephrase,
        grammarTip: "Khi gọi đồ uống ở Mỹ, dùng 'Could I get an iced oat latte, half-sweet?' nghe tự nhiên hơn.",
        qualityRating,
        suggestedReplies: [
          "No thanks, just the latte. Could I also get the Wi-Fi password?",
          "Yes, I'll take a butter croissant as well, please.",
          "That's all for today. Can I pay by card?"
        ]
      };
    }
    if (input.includes('wifi') || input.includes('password')) {
      return {
        reply: "Our Wi-Fi network is 'CentralRoast_Guest' and the passcode is printed at the bottom of your receipt.",
        replyTranslation: "Mạng Wi-Fi của quán là 'CentralRoast_Guest' và mật khẩu có in ở cuối hóa đơn nhé.",
        correction,
        nativeRephrase,
        grammarTip: "Hỏi mật khẩu lịch sự: 'Could I have the Wi-Fi password, please?'",
        qualityRating,
        suggestedReplies: [
          "Awesome, thank you so much! Where can I pick up my drink?",
          "Great, I'll pay by card now.",
          "Thanks! Do you have any seats with power outlets?"
        ]
      };
    }
    return {
      reply: "Sure thing! Your total comes to $5.50. Will that be card or cash today?",
      replyTranslation: "Chắc chắn rồi! Tổng hóa đơn của bạn là $5.50. Bạn thanh toán bằng thẻ hay tiền mặt?",
      correction,
      nativeRephrase,
      grammarTip: "Dùng 'I'll pay by card' hoặc 'Tap to pay, please' khi thanh toán.",
      qualityRating,
      suggestedReplies: [
        "I'll pay by card, please. Could I also get the Wi-Fi password?",
        "Could I get an iced oat milk latte, half-sweet?",
        "Here's my card. Keep the receipt, thanks!"
      ]
    };
  }

  if (personaId === 'airport-officer') {
    if (input.includes('hotel') || input.includes('stay') || input.includes('days') || input.includes('vacation') || input.includes('holiday')) {
      return {
        reply: "Thank you. And do you have a confirmed return ticket and anything to declare?",
        replyTranslation: "Cảm ơn. Bạn có vé khứ hồi đã xác nhận và có gì cần khai báo hải quan không?",
        correction,
        nativeRephrase,
        grammarTip: "Nêu thời gian lưu trú rõ ràng: 'I'm staying for ten days at the Hilton Hotel for sightseeing.'",
        qualityRating,
        suggestedReplies: [
          "Yes, my return flight is on the 15th, and I have nothing to declare.",
          "Here is my return ticket confirmation. Nothing to declare.",
          "I'm flying back next Sunday and only have personal belongings."
        ]
      };
    }
    return {
      reply: "Alright, passport stamped. Welcome to London—please proceed to baggage claim carousel 4.",
      replyTranslation: "Được rồi, đã đóng dấu hộ chiếu. Chào mừng đến London—vui lòng đi tới băng chuyền hành lý số 4.",
      correction,
      nativeRephrase,
      grammarTip: "Khi xuất nhập cảnh hãy trả lời ngắn gọn, đúng trọng tâm câu hỏi.",
      qualityRating,
      suggestedReplies: [
        "I'm here for a 10-day vacation and staying at a hotel in central London.",
        "Thank you, officer! Have a great day.",
        "Here is my passport. I'm visiting for sightseeing for ten days."
      ]
    };
  }

  if (personaId === 'hotel-reception') {
    if (input.includes('minibar') || input.includes('charge') || input.includes('bill') || input.includes('mistake')) {
      return {
        reply: "I sincerely apologize for the mix-up on your bill. I'll remove the minibar charge right away. Would you like us to store your luggage until this afternoon?",
        replyTranslation: "Tôi thành thật xin lỗi vì nhầm lẫn trên hóa đơn. Tôi sẽ gỡ phí minibar ngay. Bạn có muốn gửi hành lý đến chiều nay không?",
        correction,
        nativeRephrase,
        grammarTip: "Khiếu nại khéo léo: 'I believe there might be a billing error—I didn't use the minibar.'",
        qualityRating,
        suggestedReplies: [
          "Yes, please! Could you hold my suitcase until around 5 PM?",
          "Thank you for fixing that so quickly. I'd love to leave my bags here.",
          "That would be super helpful. Is there any extra fee for luggage storage?"
        ]
      };
    }
    return {
      reply: "Of course! We can safely hold your bags at the concierge desk until 6 PM. Here is your claim tag.",
      replyTranslation: "Tất nhiên rồi! Chúng tôi sẽ giữ hành lý an toàn ở quầy lễ tân đến 6 giờ chiều. Đây là thẻ nhận đồ của bạn.",
      correction,
      nativeRephrase,
      grammarTip: "Nhờ giữ hành lý: 'Would it be possible to leave my luggage here until this afternoon?'",
      qualityRating,
      suggestedReplies: [
        "Actually, I noticed a minibar charge on my bill that I didn't use.",
        "Thanks a lot! I'll be back to pick them up before 6 PM.",
        "Could you also help me call a taxi to the airport later?"
      ]
    };
  }

  if (personaId === 'tech-interviewer') {
    if (input.includes('project') || input.includes('deadline') || input.includes('delay') || input.includes('team')) {
      return {
        reply: "That's a structured approach. How did you communicate the timeline trade-offs to stakeholders when the deadline was at risk?",
        replyTranslation: "Cách tiếp cận rất bài bản. Bạn đã trao đổi các đánh đổi về tiến độ với các bên liên quan thế nào khi deadline có nguy cơ trễ?",
        correction,
        nativeRephrase,
        grammarTip: "Phỏng vấn Tech nên dùng cấu trúc STAR (Situation - Task - Action - Result).",
        qualityRating,
        suggestedReplies: [
          "I flagged the risk early and proposed cutting non-critical scope to hit the launch date.",
          "We held a quick alignment sync and shared a revised milestone plan with clear options.",
          "I prioritized the core user flow first and delivered the secondary features in the next sprint."
        ]
      };
    }
    return {
      reply: "Thanks for sharing that background. Can you walk me through a specific technical bottleneck you resolved and its measurable impact?",
      replyTranslation: "Cảm ơn bạn đã chia sẻ. Bạn có thể kể chi tiết về một nút thắt kỹ thuật bạn từng xử lý và tác động đo lường được không?",
      correction,
      nativeRephrase,
      grammarTip: "Nhấn mạnh kết quả định lượng: 'We reduced API latency by 40% after refactoring the cache layer.'",
      qualityRating,
      suggestedReplies: [
        "Sure! On our last project, we cut page load time by 45% by optimizing API caching.",
        "When our release faced a delay, I coordinated with QA and unblocked the critical path.",
        "Let me walk you through how I led a migration with zero downtime."
      ]
    };
  }

  return {
    reply: "Understood! Could you share a bit more detail so I can help you properly?",
    replyTranslation: "Tôi hiểu rồi! Bạn có thể chia sẻ thêm một chút chi tiết để tôi hỗ trợ tốt hơn không?",
    correction,
    nativeRephrase,
    grammarTip: "Mở rộng câu trả lời thêm 1 chi tiết lý do hoặc ví dụ cụ thể.",
    qualityRating,
    suggestedReplies: [
      "Sure, let me explain what I'm looking for in more detail.",
      "Actually, my main priority right now is finding a quick solution.",
      "Could you walk me through the available options?"
    ]
  };
}

export function generateFallbackFeedbackReport({ messages = [], mission = '' }) {
  const userMessages = (Array.isArray(messages) ? messages : [])
    .filter((m) => m && m.sender === 'User' && typeof m.text === 'string' && m.text.trim());
  const totalWords = userMessages.reduce((sum, m) => sum + m.text.trim().split(/\s+/).filter(Boolean).length, 0);
  const avgWords = userMessages.length > 0 ? totalWords / userMessages.length : 0;

  const estimatedCefr = avgWords >= 14 ? 'B2' : avgWords >= 9 ? 'B1' : avgWords >= 5 ? 'A2' : 'A1';
  const overallScore = Math.max(55, Math.min(95, Math.round(62 + Math.min(28, avgWords * 2) + Math.min(8, userMessages.length * 1.5))));

  const mistakes = userMessages
    .filter((m) => m.correction || (m.nativeRephrase && m.nativeRephrase.toLowerCase() !== m.text.toLowerCase()))
    .slice(0, 5)
    .map((m) => ({
      original: m.text,
      corrected: m.correction || m.nativeRephrase || m.text,
      explanationVi: m.grammarTip || 'Diễn đạt tự nhiên và lịch sự hơn theo văn phong người bản xứ.',
      category: m.correction ? 'grammar' : 'naturalness'
    }));

  const keyVocabulary = userMessages
    .filter((m) => m.nativeRephrase && m.nativeRephrase.length <= 120)
    .slice(0, 4)
    .map((m) => ({
      phrase: m.nativeRephrase,
      meaningVi: m.grammarTip || 'Cách diễn đạt chuẩn bản xứ trong tình huống thực tế',
      contextSentence: m.text
    }));

  if (keyVocabulary.length === 0) {
    keyVocabulary.push(
      {
        phrase: 'Could I please get...',
        meaningVi: 'Cho tôi gọi / lấy... một cách lịch sự',
        contextSentence: 'Could I please get an iced oat latte, half-sweet?'
      },
      {
        phrase: 'Would it be possible to...',
        meaningVi: 'Liệu có thể... được không (rất lịch sự)',
        contextSentence: 'Would it be possible to leave my luggage here until this afternoon?'
      }
    );
  }

  return {
    estimatedCefr,
    overallScore,
    summaryVi: `Bạn đã hoàn thành ${userMessages.length} lượt nói (${totalWords} từ, trung bình ${avgWords.toFixed(1)} từ/lượt)${mission ? ` cho nhiệm vụ "${mission}"` : ''}. Hãy bấm lưu các cụm từ bên dưới vào FSRS-6 để biến chúng thành phản xạ tự nhiên!`,
    strengthsVi: [
      `Chủ động duy trì mạch hội thoại qua ${userMessages.length} lượt tương tác.`,
      avgWords >= 8
        ? 'Độ dài câu khá tốt, truyền tải được nhiều ý trong một lượt nói.'
        : 'Câu ngắn gọn, dễ hiểu — hãy thử mở rộng thêm lý do hoặc lời lịch sự.'
    ],
    mistakes,
    keyVocabulary,
    isFallback: true
  };
}

export function isUsableViTranslation(sourceEn, candidateVi) {
  const src = String(sourceEn || '').trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
  const dst = String(candidateVi || '').trim();
  if (!dst) return false;
  const dstNorm = dst.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
  if (src && dstNorm === src) return false;
  return true;
}

function generateFallbackExplanation({
  phrase,
  sentence,
  cachedTranslation,
  sentenceTranslation,
  fallbackReason,
  fallbackDetail
}) {
  const cleanMeaning = isUsableViTranslation(phrase, cachedTranslation) ? String(cachedTranslation).trim() : '';
  const cleanSentenceVi = isUsableViTranslation(sentence, sentenceTranslation)
    ? String(sentenceTranslation).trim()
    : '';
  const reasonNote =
    fallbackReason === 'missing_gemini_key'
      ? 'Máy chủ chưa gắn GEMINI_API_KEY nên chưa phân tích được sắc thái sâu.'
      : `Dịch vụ AI Gemini đang báo lỗi (${fallbackDetail || 'unavailable'}).`;

  return {
    phrase,
    meaningVi: cleanMeaning,
    sentenceVi: cleanSentenceVi,
    nuance: reasonNote,
    grammarNote: '',
    examples:
      sentence && cleanSentenceVi
        ? [{ en: sentence, vi: cleanSentenceVi }]
        : [],
    fallbackReason: fallbackReason || 'gemini_error',
    fallbackDetail: fallbackDetail || ''
  };
}

export function generateFallbackQuizzes(title, subtitles) {
  const validLines = (Array.isArray(subtitles) ? subtitles : [])
    .filter(s => s && typeof s.text === 'string' && s.text.trim().split(/\s+/).length >= 5);

  const wordPool = new Set();
  const candidates = [];

  for (const line of validLines) {
    const words = line.text.match(/[A-Za-z]{5,}/g) || [];
    for (const w of words) {
      const lower = w.toLowerCase();
      if (!STOP_WORDS_EN.has(lower)) {
        wordPool.add(lower);
      }
    }
    const targetWord = words.find(w => !STOP_WORDS_EN.has(w.toLowerCase()));
    if (targetWord) {
      candidates.push({ line, targetWord });
    }
  }

  const allWords = Array.from(wordPool);
  const quizzes = [];
  const step = Math.max(1, Math.floor(candidates.length / 5));

  for (let i = 0; i < candidates.length && quizzes.length < 5; i += step) {
    const { line, targetWord } = candidates[i];
    const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const maskedSentence = line.text.replace(new RegExp(`\\b${escaped}\\b`, 'i'), '______');
    const distractors = allWords
      .filter(w => w !== targetWord.toLowerCase())
      .slice(quizzes.length * 3, quizzes.length * 3 + 3);

    const fallbackDistractors = ['experience', 'remember', 'important', 'different', 'understand', 'challenge'];
    while (distractors.length < 3) {
      const pick = fallbackDistractors[(quizzes.length + distractors.length) % fallbackDistractors.length];
      if (pick !== targetWord.toLowerCase() && !distractors.includes(pick)) {
        distractors.push(pick);
      } else {
        distractors.push(`option${distractors.length + 1}`);
      }
    }

    const correctIndex = quizzes.length % 4;
    const options = [...distractors];
    options.splice(correctIndex, 0, targetWord);

    quizzes.push({
      id: `quiz-auto-${Date.now()}-${quizzes.length + 1}`,
      question: `Chọn từ phù hợp điền vào chỗ trống trong bài "${title || 'Video Lesson'}":\n"${maskedSentence}"`,
      options,
      correctAnswer: correctIndex,
      explanation: line.translation
        ? `Câu gốc: "${line.text}" (${line.translation})`
        : `Câu gốc trong video: "${line.text}"`
    });
  }

  if (quizzes.length === 0) {
    return [
      {
        id: `quiz-auto-${Date.now()}-1`,
        question: `Nội dung chính của bài học "${title || 'English Lesson'}" hướng đến mục tiêu nào?`,
        options: [
          'Luyện nghe hiểu, từ vựng theo ngữ cảnh và phản xạ nói',
          'Chỉ học lý thuyết ngữ pháp rời rạc',
          'Không có mục tiêu giao tiếp',
          'Chỉ nghe nhạc nền'
        ],
        correctAnswer: 0,
        explanation: 'Học tiếng Anh qua video song ngữ giúp kết hợp nghe, từ vựng theo ngữ cảnh và Shadowing.'
      }
    ];
  }

  return quizzes;
}

export function generateFallbackScenario(topic, level = 'B1') {
  const cleanTopic = String(topic || 'Daily Conversation').trim();
  const validLevel = ['A1', 'A2', 'B1', 'B2', 'C1'].includes(level) ? level : 'B1';
  const ts = Date.now();
  const aiAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
  const userAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop';

  return {
    id: `custom-${ts}`,
    level: validLevel,
    title: cleanTopic,
    category: 'Xã giao',
    description: `Kịch bản phản xạ CEFR ${validLevel}: ${cleanTopic}`,
    icon: '🎯',
    targetGoal: `Giao tiếp tự tin và xử lý trọn vẹn tình huống "${cleanTopic}"`,
    turns: [
      {
        id: `sc-${ts}-1`,
        speaker: 'AI',
        speakerName: 'Alex',
        avatar: aiAvatar,
        text: `Hi there! Welcome. I understand you'd like to talk about ${cleanTopic}. How can I help you today?`,
        translation: `Chào bạn! Tôi biết bạn muốn trao đổi về ${cleanTopic}. Hôm nay tôi có thể giúp gì cho bạn?`,
        expectedKeywords: ['help', 'today']
      },
      {
        id: `sc-${ts}-2`,
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: userAvatar,
        text: `Hi! Thanks for your time. I need some help regarding ${cleanTopic}.`,
        translation: `Chào bạn! Cảm ơn bạn đã dành thời gian. Tôi cần hỗ trợ về ${cleanTopic}.`,
        hintPrompt: `Chào lại và nêu rõ bạn cần hỗ trợ về "${cleanTopic}"`,
        expectedKeywords: ['thanks', 'need', 'help'],
        nativeVariations: [`Hi, I was hoping you could help me out with ${cleanTopic}.`]
      },
      {
        id: `sc-${ts}-3`,
        speaker: 'AI',
        speakerName: 'Alex',
        avatar: aiAvatar,
        text: `Of course! Could you share a few more details so I can find the best option for you?`,
        translation: `Tất nhiên rồi! Bạn có thể chia sẻ thêm vài chi tiết để tôi tìm phương án tốt nhất cho bạn không?`,
        expectedKeywords: ['details', 'option']
      },
      {
        id: `sc-${ts}-4`,
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: userAvatar,
        text: `Sure. Specifically, I want to make sure everything is clear and fits my schedule.`,
        translation: `Chắc chắn rồi. Cụ thể là tôi muốn đảm bảo mọi thứ rõ ràng và phù hợp với lịch của mình.`,
        hintPrompt: `Giải thích cụ thể yêu cầu hoặc mong muốn chính của bạn`,
        expectedKeywords: ['sure', 'clear', 'schedule'],
        nativeVariations: [`Definitely—my main priority is keeping it clear and on schedule.`]
      },
      {
        id: `sc-${ts}-5`,
        speaker: 'AI',
        speakerName: 'Alex',
        avatar: aiAvatar,
        text: `That makes total sense. I can arrange that right away. Is there anything else you'd like to add?`,
        translation: `Rất hợp lý. Tôi có thể sắp xếp ngay lập tức. Bạn có muốn bổ sung thêm gì nữa không?`,
        expectedKeywords: ['arrange', 'else']
      },
      {
        id: `sc-${ts}-6`,
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: userAvatar,
        text: `No, that covers everything. Thank you so much for your help!`,
        translation: `Không, như vậy là đủ rồi. Cảm ơn bạn rất nhiều vì đã hỗ trợ!`,
        hintPrompt: `Xác nhận đã đủ thông tin và cảm ơn lịch sự để kết thúc`,
        expectedKeywords: ['everything', 'thank', 'help'],
        nativeVariations: [`That's all for now—really appreciate your help!`]
      }
    ]
  };
}

async function callGeminiJson(apiKey, prompt, timeoutMs = 14000) {
  // Active Gemini Flash models verified against https://aistudio.google.com/docs/models & /deprecations (Nov 2026).
  // Note: gemini-2.0-flash was shut down June 1, 2026; gemini-2.5-flash is deprecated for new keys.
  const candidateModels = Array.from(
    new Set(
      [
        process.env.GEMINI_MODEL,
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash',
        'gemini-3.8-flash',
        'gemini-2.5-flash-lite'
      ].filter(Boolean)
    )
  );

  let lastErr = null;
  for (const model of candidateModels) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.4
          }
        })
      });
      if (!res.ok) {
        let apiErrStatus = '';
        try {
          const errBody = await res.json();
          apiErrStatus = errBody?.error?.status || errBody?.error?.message?.slice(0, 60) || '';
        } catch {
          // ignore
        }
        lastErr = new Error(`${model} HTTP ${res.status}${apiErrStatus ? ` (${apiErrStatus})` : ''}`);
        if (res.status === 404 || res.status === 429 || res.status === 503) {
          continue;
        }
        throw lastErr;
      }
      const data = await res.json();
      const parts = Array.isArray(data?.candidates?.[0]?.content?.parts)
        ? data.candidates[0].content.parts
        : [];
      // Gemini 3.x / 2.5 thinking models may include thought parts; select the non-thought JSON part
      const answerPart =
        parts.find((p) => p && typeof p.text === 'string' && !p.thought) || parts[parts.length - 1];
      const rawText = String(answerPart?.text || '').trim();
      const cleanedJson = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      return JSON.parse(cleanedJson);
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastErr || new Error('Gemini unavailable');
}

export async function translateEnToVi(text, { fetchImpl = fetch, timeoutMs = 4500, geminiApiKey = '' } = {}) {
  const clean = String(text || '').trim();
  if (!clean) return { translation: '', partOfSpeech: '', synonyms: [], provider: 'none' };

  const browserHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'application/json'
  };

  // Provider 1: Google Translate gtx endpoint
  const ctrl1 = new AbortController();
  const t1 = setTimeout(() => ctrl1.abort(), timeoutMs);
  try {
    const res = await fetchImpl(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&dt=bd&q=${encodeURIComponent(clean)}`,
      { signal: ctrl1.signal, headers: browserHeaders }
    );
    if (res.ok) {
      const data = await res.json();
      const translation = Array.isArray(data?.[0]) ? data[0].map((item) => item?.[0] || '').join('').trim() : '';
      let partOfSpeech = '';
      const synonyms = [];
      if (Array.isArray(data?.[1]) && data[1].length > 0) {
        partOfSpeech = data[1][0]?.[0] || '';
        if (Array.isArray(data[1][0]?.[1])) {
          synonyms.push(...data[1][0][1].slice(0, 5));
        }
      }
      if (isUsableViTranslation(clean, translation)) {
        return { translation, partOfSpeech, synonyms, provider: 'google_gtx' };
      }
    }
  } catch {
    // fall through to Provider 2
  } finally {
    clearTimeout(t1);
  }

  // Provider 2: MyMemory Free Translation API (reliable from cloud datacenter IPs)
  const ctrl2 = new AbortController();
  const t2 = setTimeout(() => ctrl2.abort(), timeoutMs);
  try {
    const res = await fetchImpl(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|vi`,
      { signal: ctrl2.signal, headers: browserHeaders }
    );
    if (res.ok) {
      const data = await res.json();
      const translatedText = String(data?.responseData?.translatedText || '').trim();
      if (
        translatedText &&
        !/MYMEMORY WARNING/i.test(translatedText) &&
        isUsableViTranslation(clean, translatedText)
      ) {
        return { translation: translatedText, partOfSpeech: '', synonyms: [], provider: 'mymemory' };
      }
    }
  } catch {
    // fall through to Provider 3
  } finally {
    clearTimeout(t2);
  }

  // Provider 3: Gemini fallback when configured on server (bypasses shared-IP translate limits)
  const key = String(geminiApiKey || '').trim();
  if (key) {
    try {
      const parsed = await callGeminiJson(
        key,
        `Translate the English word or phrase "${clean}" into concise natural Vietnamese. Respond in JSON: { "translation": "..." }`,
        7000
      );
      const vi = String(parsed?.translation || '').trim();
      if (isUsableViTranslation(clean, vi)) {
        return { translation: vi, partOfSpeech: '', synonyms: [], provider: 'gemini' };
      }
    } catch {
      // fall through
    }
  }

  return { translation: '', partOfSpeech: '', synonyms: [], provider: 'none' };
}

async function defaultFetchDictionaryEntry(cleanQuery) {
  const isPhrase = cleanQuery.includes(' ');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const translatePromise = translateEnToVi(cleanQuery, {
      timeoutMs: 4000,
      geminiApiKey: process.env.GEMINI_API_KEY || ''
    });
    const dictPromise = isPhrase
      ? Promise.resolve(null)
      : fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanQuery)}`, {
          signal: controller.signal
        });

    const [translateRes, dictRes] = await Promise.allSettled([translatePromise, dictPromise]);

    let translation = '';
    let partOfSpeech = isPhrase ? 'cụm từ (phrase)' : 'vocabulary';
    const synonyms = [];

    if (translateRes.status === 'fulfilled' && translateRes.value?.translation) {
      translation = translateRes.value.translation;
      if (!isPhrase && translateRes.value.partOfSpeech) {
        partOfSpeech = translateRes.value.partOfSpeech;
      }
      if (!isPhrase && Array.isArray(translateRes.value.synonyms)) {
        synonyms.push(...translateRes.value.synonyms);
      }
    }

    let phonetic = isPhrase ? '' : `/${cleanQuery}/`;
    let definitionEn = '';
    let exampleEn = '';

    if (!isPhrase && dictRes.status === 'fulfilled' && dictRes.value?.ok) {
      const dictJson = await dictRes.value.json();
      const first = Array.isArray(dictJson) ? dictJson[0] : null;
      if (first) {
        phonetic = first.phonetic || first.phonetics?.find((p) => p.text)?.text || phonetic;
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

    if (!translation && !definitionEn) return null;

    return {
      word: cleanQuery,
      phonetic,
      partOfSpeech: POS_DISPLAY_MAP[partOfSpeech] || partOfSpeech,
      translation: translation || cleanQuery,
      definitionEn: definitionEn || '',
      exampleEn: exampleEn || '',
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

async function consumeAiQuota({ db, currentUser, req, res, sendJson }) {
  const role = currentUser.role || 'user';
  if (role === 'guest') {
    sendJson(req, res, 403, { error: 'Vui lòng đăng nhập để sử dụng tính năng AI.' });
    return null;
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  const isUnlimited = role === 'pro' || role === 'admin';
  const usedBefore = await db.getAiUsageCount(currentUser.id, dateKey);

  if (!isUnlimited && usedBefore >= MAX_USER_DAILY_AI_TURNS) {
    sendJson(req, res, 429, {
      error: `Bạn đã dùng hết ${MAX_USER_DAILY_AI_TURNS} lượt AI miễn phí hôm nay. Nâng cấp Pro để sử dụng không giới hạn!`,
      quota: { used: usedBefore, limit: MAX_USER_DAILY_AI_TURNS, unlimited: false }
    });
    return null;
  }

  const usedAfter = await db.incrementAiUsage(currentUser.id, dateKey);
  return {
    used: usedAfter,
    limit: isUnlimited ? null : MAX_USER_DAILY_AI_TURNS,
    unlimited: isUnlimited
  };
}

export async function handlePublicDictRoutes({ req, res, pathname, db, parseJsonBody, sendJson, options = {} }) {
  const lookupFn = options.fetchDictionaryEntry || defaultFetchDictionaryEntry;
  const batchTranslateFn = options.fetchBatchTranslation || defaultFetchBatchTranslation;

  if (pathname === '/api/dict/lookup' && req.method === 'GET') {
    try {
      const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      const normalized = normalizeLookupQuery(parsedUrl.searchParams.get('w') || '');
      const wordCount = normalized ? normalized.split(' ').length : 0;

      if (!normalized || normalized.length > 80 || wordCount > 8) {
        sendJson(req, res, 400, { error: 'Từ hoặc cụm từ tra cứu không hợp lệ (tối đa 8 từ / 80 ký tự).' });
        return true;
      }

      const cached = await db.findMasterWord(normalized);
      if (cached && isUsableViTranslation(normalized, cached.defaultTranslationVi)) {
        sendJson(req, res, 200, {
          word: cached.lemma,
          phonetic: cached.phonetic || (normalized.includes(' ') ? '' : `/${cached.lemma}/`),
          partOfSpeech: cached.partOfSpeech || (normalized.includes(' ') ? 'cụm từ (phrase)' : 'vocabulary'),
          translation: cached.defaultTranslationVi,
          definitionEn: cached.definitionEn || '',
          exampleEn: cached.exampleEn || '',
          synonyms: cached.synonyms && cached.synonyms.length > 0 ? cached.synonyms : undefined,
          source: 'db_cache'
        });
        return true;
      }

      const fetched = await lookupFn(normalized);
      if (!fetched) {
        sendJson(req, res, 200, {
          word: normalized,
          phonetic: normalized.includes(' ') ? '' : `/${normalized}/`,
          partOfSpeech: normalized.includes(' ') ? 'cụm từ (phrase)' : 'từ vựng (vocabulary)',
          translation: '',
          definitionEn: '',
          exampleEn: '',
          source: 'fallback'
        });
        return true;
      }

      if (isUsableViTranslation(normalized, fetched.translation)) {
        await db.upsertMasterWord(fetched);
      }
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
  const apiKey = (options.geminiApiKey ?? process.env.GEMINI_API_KEY ?? '').trim();

  // 1. POST /api/ai/roleplay
  if (pathname === '/api/ai/roleplay' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const userMessage = String(body.userMessage || '').trim();
      if (!userMessage || userMessage.length > 800) {
        sendJson(req, res, 400, { error: 'Tin nhắn hội thoại không hợp lệ (tối đa 800 ký tự).' });
        return true;
      }

      const quota = await consumeAiQuota({ db, currentUser, req, res, sendJson });
      if (!quota) return true;

      const personaId = String(body.personaId || 'cafe-barista');
      const personaName = String(body.personaName || 'AI Tutor');
      const personaRole = String(body.personaRole || 'English Partner');
      const situation = String(body.situation || '');
      const mission = String(body.mission || '');
      const history = Array.isArray(body.history) ? body.history : [];
      const correctionMode = VALID_CORRECTION_MODES.includes(body.correctionMode)
        ? body.correctionMode
        : 'written';

      const computeFallbackMissionProgress = () => {
        const allUserText = [
          ...history.filter(m => m && m.sender === 'User').map(m => String(m.text || '')),
          userMessage
        ].join(' ').toLowerCase();

        const personaChecklists = {
          'cafe-barista': [['latte', 'coffee', 'iced'], ['oat', 'less sweet', '50%', 'half sweet', 'sugar'], ['wifi', 'wi-fi', 'password']],
          'airport-officer': [['passport', 'here'], ['travel', 'tourism', 'vacation', 'holiday', '10 days', 'ten days'], ['hotel', 'stay', 'staying']],
          'hotel-reception': [['minibar', 'bill', 'charge', 'didn\'t use', 'did not use'], ['check out', 'checkout', '402'], ['luggage', 'bag', 'afternoon', 'store', 'leave']],
          'tech-interviewer': [['project', 'experience', 'built', 'worked'], ['delay', 'deadline', 'late', 'behind'], ['communicate', 'prioritize', 'solution', 'team']]
        };

        const steps = personaChecklists[personaId] || [];
        if (steps.length === 0) {
          const turns = history.filter(m => m && m.sender === 'User').length + 1;
          const pct = Math.min(100, turns * 35);
          return { missionProgress: pct, missionCompleted: pct >= 100 };
        }
        const matched = steps.filter(group => group.some(kw => allUserText.includes(kw))).length;
        const pct = Math.round((matched / steps.length) * 100);
        return { missionProgress: pct, missionCompleted: pct >= 100 };
      };

      if (options.aiResponder) {
        const result = await options.aiResponder({ personaId, personaName, personaRole, situation, mission, history, userMessage, correctionMode });
        const fallbackMission = computeFallbackMissionProgress();
        const missionProgress = typeof result.missionProgress === 'number'
          ? Math.max(0, Math.min(100, Math.round(result.missionProgress)))
          : fallbackMission.missionProgress;
        const missionCompleted = typeof result.missionCompleted === 'boolean'
          ? result.missionCompleted
          : missionProgress >= 100;
        sendJson(req, res, 200, { ...result, missionProgress, missionCompleted, source: 'gemini', isFallback: false, quota });
        return true;
      }

      if (apiKey) {
        try {
          const recentHistory = history.slice(-6).map(m => `${m.sender === 'AI' ? personaName : 'Learner'}: ${m.text}`).join('\n');
          const correctionRule = buildCorrectionModeInstruction(correctionMode);
          const prompt = [
            `You are roleplaying as "${personaName}" (${personaRole}) in an interactive English speaking practice (Langua + Fluently style).`,
            `Situation: ${situation}`,
            `Learner Mission: ${mission}`,
            correctionRule,
            recentHistory ? `Recent Conversation:\n${recentHistory}` : '',
            `Learner just said: "${userMessage}"`,
            `Respond in strict JSON with exact fields:`,
            `- "reply": Natural, concise 1-3 sentence in-character English reply following the Correction Mode rule above.`,
            `- "replyTranslation": Accurate, natural Vietnamese translation of your "reply".`,
            `- "correction": Grammar/spelling fix of the learner's exact sentence in English (return "" empty string if grammatically correct).`,
            `- "nativeRephrase": A more natural native-speaker way to say what the learner meant (in English, 1 sentence).`,
            `- "grammarTip": One short, helpful Vietnamese feedback tip (max 28 words) explaining why the correction/rephrase sounds better.`,
            `- "qualityRating": One of "perfect" (natural & error-free), "good" (clear with minor room to sound more native), or "revision_needed" (noticeable grammar/wording error).`,
            `- "suggestedReplies": Array of exactly 3 short, natural English sentences the learner could say next to advance the conversation.`,
            `- "missionProgress": integer 0 to 100 estimating cumulative completion of the Learner Mission across the conversation so far.`,
            `- "missionCompleted": boolean (true if the learner has completed all key goals in the Learner Mission).`
          ].filter(Boolean).join('\n');
          const parsed = await callGeminiJson(apiKey, prompt);
          const fallbackMission = computeFallbackMissionProgress();
          const missionProgress = typeof parsed.missionProgress === 'number'
            ? Math.max(0, Math.min(100, Math.round(parsed.missionProgress)))
            : fallbackMission.missionProgress;
          const missionCompleted = typeof parsed.missionCompleted === 'boolean'
            ? parsed.missionCompleted
            : missionProgress >= 100;
          const validRating = ['perfect', 'good', 'revision_needed'].includes(parsed.qualityRating)
            ? parsed.qualityRating
            : (parsed.correction ? 'revision_needed' : 'good');
          const suggestedReplies = Array.isArray(parsed.suggestedReplies)
            ? parsed.suggestedReplies.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 3)
            : [];
          sendJson(req, res, 200, {
            reply: String(parsed.reply || '').trim() || 'Could you tell me a bit more?',
            replyTranslation: String(parsed.replyTranslation || '').trim(),
            correction: String(parsed.correction || '').trim(),
            nativeRephrase: String(parsed.nativeRephrase || '').trim() || generateFallbackRephrase(userMessage),
            grammarTip: String(parsed.grammarTip || '').trim(),
            qualityRating: validRating,
            suggestedReplies,
            missionProgress,
            missionCompleted,
            source: 'gemini',
            isFallback: false,
            quota
          });
          return true;
        } catch (aiErr) {
          console.warn('[AI Roleplay] Gemini call failed, falling back cleanly:', aiErr.message);
        }
      }

      const fallback = generateFallbackRoleplay(personaId, userMessage);
      const fallbackMission = computeFallbackMissionProgress();
      sendJson(req, res, 200, { ...fallback, ...fallbackMission, source: 'offline-fallback', isFallback: true, quota });
      return true;
    } catch (err) {
      sendJson(req, res, 500, { error: err.message || 'Lỗi xử lý AI Roleplay.' });
      return true;
    }
  }

  // 1.5 POST /api/ai/roleplay-feedback (Post-Chat Langua Feedback Report & SRS Vocab Extraction)
  if (pathname === '/api/ai/roleplay-feedback' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const messages = Array.isArray(body.messages) ? body.messages.slice(-30) : [];
      const personaName = String(body.personaName || 'AI Tutor').slice(0, 80);
      const personaRole = String(body.personaRole || 'English Partner').slice(0, 120);
      const mission = String(body.mission || '').slice(0, 260);
      const userCount = messages.filter((m) => m && m.sender === 'User' && String(m.text || '').trim()).length;

      if (userCount < 1) {
        sendJson(req, res, 400, { error: 'Hãy nói ít nhất 1 lượt để AI tổng hợp báo cáo hội thoại.' });
        return true;
      }

      const quota = await consumeAiQuota({ db, currentUser, req, res, sendJson });
      if (!quota) return true;

      if (options.aiFeedbackResponder) {
        const report = await options.aiFeedbackResponder({ personaName, personaRole, mission, messages });
        sendJson(req, res, 200, { report: { ...report, isFallback: false }, source: 'gemini', isFallback: false, quota });
        return true;
      }

      if (apiKey) {
        try {
          const transcript = messages
            .map((m) => `${m.sender === 'User' ? 'Learner' : personaName}: ${String(m.text || '').trim()}`)
            .join('\n')
            .slice(0, 4000);
          const prompt = [
            `You are an expert English speaking coach creating a Post-Chat Feedback Report (Langua style) for a Vietnamese learner.`,
            `Partner: ${personaName} (${personaRole})`,
            mission ? `Mission: ${mission}` : '',
            `Conversation Transcript:\n${transcript}`,
            `Return strict JSON with exact keys:`,
            `- "estimatedCefr": string ("A1"|"A2"|"B1"|"B2"|"C1") estimating the learner's spoken level in this chat.`,
            `- "overallScore": integer 0 to 100.`,
            `- "summaryVi": 2 encouraging, specific Vietnamese sentences summarizing performance and next focus.`,
            `- "strengthsVi": array of 2-3 short Vietnamese bullet strings highlighting what the learner did well.`,
            `- "mistakes": array of up to 5 objects { "original": "learner exact sentence", "corrected": "improved natural English", "explanationVi": "concise Vietnamese explanation", "category": "grammar"|"vocabulary"|"naturalness" }.`,
            `- "keyVocabulary": array of 3-6 high-value English phrases/collocations from the conversation or upgrades { "phrase": "...", "meaningVi": "...", "contextSentence": "..." } ready to save as SRS flashcards.`
          ].filter(Boolean).join('\n');

          const parsed = await callGeminiJson(apiKey, prompt);
          const mistakes = Array.isArray(parsed.mistakes)
            ? parsed.mistakes.slice(0, 5).map((item) => ({
                original: String(item?.original || '').trim(),
                corrected: String(item?.corrected || '').trim(),
                explanationVi: String(item?.explanationVi || '').trim(),
                category: ['grammar', 'vocabulary', 'naturalness'].includes(item?.category)
                  ? item.category
                  : 'naturalness'
              })).filter((m) => m.original && m.corrected)
            : [];
          const keyVocabulary = Array.isArray(parsed.keyVocabulary)
            ? parsed.keyVocabulary.slice(0, 6).map((v) => ({
                phrase: String(v?.phrase || '').trim(),
                meaningVi: String(v?.meaningVi || '').trim(),
                contextSentence: String(v?.contextSentence || '').trim()
              })).filter((v) => v.phrase)
            : [];
          const strengthsVi = Array.isArray(parsed.strengthsVi)
            ? parsed.strengthsVi.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 3)
            : [];

          const report = {
            estimatedCefr: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(parsed.estimatedCefr)
              ? parsed.estimatedCefr
              : 'B1',
            overallScore: Math.max(0, Math.min(100, Math.round(Number(parsed.overallScore) || 78))),
            summaryVi: String(parsed.summaryVi || '').trim() || 'Bạn đã duy trì hội thoại rất tốt!',
            strengthsVi,
            mistakes,
            keyVocabulary,
            isFallback: false
          };

          sendJson(req, res, 200, { report, source: 'gemini', isFallback: false, quota });
          return true;
        } catch (aiErr) {
          console.warn('[AI Roleplay Feedback] Gemini call failed, using fallback:', aiErr.message);
        }
      }

      const fallbackReport = generateFallbackFeedbackReport({ messages, mission });
      sendJson(req, res, 200, { report: fallbackReport, source: 'offline-fallback', isFallback: true, quota });
      return true;
    } catch (err) {
      sendJson(req, res, 500, { error: err.message || 'Lỗi tổng hợp báo cáo hội thoại AI.' });
      return true;
    }
  }

  // 2. POST /api/ai/explain (Contextual word/phrase explanation)
  if (pathname === '/api/ai/explain' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const phrase = normalizeLookupQuery(body.phrase || '');
      const sentence = String(body.sentence || '').trim().slice(0, 500);
      const videoTitle = String(body.videoTitle || '').trim().slice(0, 200);

      if (!phrase || phrase.length > 80) {
        sendJson(req, res, 400, { error: 'Từ hoặc cụm từ cần giải thích không hợp lệ.' });
        return true;
      }

      // Check quota without charging yet (never burn user's daily quota when falling back!)
      const role = currentUser.role || 'user';
      if (role === 'guest') {
        sendJson(req, res, 403, { error: 'Vui lòng đăng nhập để sử dụng tính năng AI.' });
        return true;
      }
      const dateKey = new Date().toISOString().slice(0, 10);
      const isUnlimited = role === 'pro' || role === 'admin';
      const usedBefore = await db.getAiUsageCount(currentUser.id, dateKey);
      if (!isUnlimited && usedBefore >= MAX_USER_DAILY_AI_TURNS) {
        sendJson(req, res, 429, {
          error: `Bạn đã dùng hết ${MAX_USER_DAILY_AI_TURNS} lượt AI miễn phí hôm nay. Nâng cấp Pro để sử dụng không giới hạn!`,
          quota: { used: usedBefore, limit: MAX_USER_DAILY_AI_TURNS, unlimited: false }
        });
        return true;
      }

      const chargeQuota = async () => {
        const usedAfter = await db.incrementAiUsage(currentUser.id, dateKey);
        return {
          used: usedAfter,
          limit: isUnlimited ? null : MAX_USER_DAILY_AI_TURNS,
          unlimited: isUnlimited
        };
      };

      if (options.aiExplainResponder) {
        const result = await options.aiExplainResponder({ phrase, sentence, videoTitle });
        const quota = await chargeQuota();
        sendJson(req, res, 200, { phrase, ...result, source: 'gemini', isFallback: false, quota });
        return true;
      }

      let fallbackReason = apiKey ? 'gemini_error' : 'missing_gemini_key';
      let fallbackDetail = '';

      if (apiKey) {
        try {
          const prompt = [
            `You are an expert English-Vietnamese language coach (like eJOY / LingQ).`,
            `Explain the exact meaning of the English word or phrase "${phrase}" IN THE SPECIFIC CONTEXT of this sentence:`,
            `Sentence: "${sentence || phrase}"`,
            videoTitle ? `Video Topic: "${videoTitle}"` : '',
            `Respond in JSON with exact fields:`,
            `- "meaningVi": Concise, accurate Vietnamese meaning of "${phrase}" in THIS context.`,
            `- "nuance": 1-2 short Vietnamese sentences explaining tone/nuance or idiom meaning.`,
            `- "grammarNote": 1 short Vietnamese sentence on structure/collocation usage.`,
            `- "examples": Array of 2 objects { "en": "...", "vi": "..." } showing natural everyday usage of "${phrase}".`
          ].filter(Boolean).join('\n');
          const parsed = await callGeminiJson(apiKey, prompt);
          const examples = Array.isArray(parsed.examples)
            ? parsed.examples.slice(0, 2).map((ex) => ({ en: String(ex?.en || ''), vi: String(ex?.vi || '') })).filter((ex) => ex.en)
            : [];
          const quota = await chargeQuota();
          sendJson(req, res, 200, {
            phrase,
            meaningVi: String(parsed.meaningVi || '').trim() || phrase,
            nuance: String(parsed.nuance || '').trim(),
            grammarNote: String(parsed.grammarNote || '').trim(),
            examples,
            source: 'gemini',
            isFallback: false,
            quota
          });
          return true;
        } catch (aiErr) {
          const safeMsg = String(aiErr?.message || 'error').replace(/key=[^&\s]+/gi, 'key=***').slice(0, 90);
          console.warn('[AI Explain] Gemini call failed, using real translation fallback:', safeMsg);
          fallbackReason = 'gemini_error';
          fallbackDetail = safeMsg;
        }
      }

      const cached = await db.findMasterWord(phrase);
      const cachedVi = isUsableViTranslation(phrase, cached?.defaultTranslationVi)
        ? cached.defaultTranslationVi
        : '';
      const [phraseTr, sentenceTr] = await Promise.all([
        cachedVi ? Promise.resolve({ translation: cachedVi }) : translateEnToVi(phrase, { timeoutMs: 4000 }),
        sentence && sentence.toLowerCase() !== phrase.toLowerCase()
          ? translateEnToVi(sentence, { timeoutMs: 4000 })
          : Promise.resolve({ translation: '' })
      ]);

      const fallback = generateFallbackExplanation({
        phrase,
        sentence,
        cachedTranslation: phraseTr?.translation || cachedVi,
        sentenceTranslation: sentenceTr?.translation || '',
        fallbackReason,
        fallbackDetail
      });
      sendJson(req, res, 200, {
        ...fallback,
        source: 'translate-fallback',
        isFallback: true,
        quota: {
          used: usedBefore,
          limit: isUnlimited ? null : MAX_USER_DAILY_AI_TURNS,
          unlimited: isUnlimited
        }
      });
      return true;
    } catch (err) {
      sendJson(req, res, 500, { error: err.message || 'Lỗi giải thích ngữ cảnh AI.' });
      return true;
    }
  }

  // 3. POST /api/ai/generate-quiz (5 real comprehension/vocab quizzes from transcript)
  if (pathname === '/api/ai/generate-quiz' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const title = String(body.title || 'English Lesson').trim().slice(0, 200);
      const subtitles = Array.isArray(body.subtitles) ? body.subtitles : [];
      if (subtitles.length === 0) {
        sendJson(req, res, 400, { error: 'Thiếu dữ liệu phụ đề để tạo trắc nghiệm.' });
        return true;
      }

      const quota = await consumeAiQuota({ db, currentUser, req, res, sendJson });
      if (!quota) return true;

      if (options.aiQuizResponder) {
        const quizzes = await options.aiQuizResponder({ title, subtitles });
        sendJson(req, res, 200, { quizzes, source: 'gemini', isFallback: false, quota });
        return true;
      }

      if (apiKey) {
        try {
          const step = Math.max(1, Math.floor(subtitles.length / 30));
          const sampled = [];
          for (let i = 0; i < subtitles.length && sampled.length < 30; i += step) {
            if (subtitles[i]?.text) sampled.push(String(subtitles[i].text).trim());
          }
          const transcriptText = sampled.join('\n').slice(0, 3500);
          const prompt = [
            `Generate 5 English listening comprehension and contextual vocabulary multiple-choice questions for Vietnamese learners based strictly on this lesson transcript.`,
            `Lesson Title: "${title}"`,
            `Transcript:\n${transcriptText}`,
            `Respond in JSON as { "quizzes": [ { "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "Short explanation in Vietnamese" } ] }`,
            `Ensure every question has exactly 4 options and correctAnswer is an integer 0..3.`
          ].join('\n');
          const parsed = await callGeminiJson(apiKey, prompt);
          const quizzes = (Array.isArray(parsed.quizzes) ? parsed.quizzes : [])
            .filter(q => q && q.question && Array.isArray(q.options) && q.options.length === 4)
            .slice(0, 5)
            .map((q, idx) => ({
              id: `quiz-ai-${Date.now()}-${idx + 1}`,
              question: String(q.question),
              options: q.options.map(String),
              correctAnswer: Math.max(0, Math.min(3, Number(q.correctAnswer) || 0)),
              explanation: String(q.explanation || 'Đáp án dựa trên ngữ cảnh bài học.')
            }));
          if (quizzes.length > 0) {
            sendJson(req, res, 200, { quizzes, source: 'gemini', isFallback: false, quota });
            return true;
          }
        } catch (aiErr) {
          console.warn('[AI Quiz] Gemini call failed, using transcript fallback:', aiErr.message);
        }
      }

      const fallbackQuizzes = generateFallbackQuizzes(title, subtitles);
      sendJson(req, res, 200, { quizzes: fallbackQuizzes, source: 'offline-fallback', isFallback: true, quota });
      return true;
    } catch (err) {
      sendJson(req, res, 500, { error: err.message || 'Lỗi tạo trắc nghiệm AI.' });
      return true;
    }
  }

  // 4. POST /api/ai/generate-scenario (6-turn CEFR speaking scenario)
  if (pathname === '/api/ai/generate-scenario' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const topic = String(body.topic || '').trim().slice(0, 150);
      const level = ['A1', 'A2', 'B1', 'B2', 'C1'].includes(body.level) ? body.level : 'B1';
      if (!topic || topic.length < 2) {
        sendJson(req, res, 400, { error: 'Vui lòng nhập chủ đề tình huống hợp lệ.' });
        return true;
      }

      const quota = await consumeAiQuota({ db, currentUser, req, res, sendJson });
      if (!quota) return true;

      if (options.aiScenarioResponder) {
        const scenario = await options.aiScenarioResponder({ topic, level });
        sendJson(req, res, 200, { scenario, source: 'gemini', isFallback: false, quota });
        return true;
      }

      if (apiKey) {
        try {
          const prompt = [
            `Create a realistic 6-turn English speaking reflex scenario for a Vietnamese learner at CEFR level ${level}.`,
            `Topic: "${topic}"`,
            `Respond in JSON with:`,
            `{ "title": "...", "description": "Vietnamese description", "targetGoal": "Vietnamese goal", "turns": [`,
            `  { "speaker": "AI"|"User" (alternating AI, User, AI, User, AI, User), "speakerName": "Alex"|"Bạn", "text": "Natural English line", "translation": "Vietnamese translation", "hintPrompt": "Short Vietnamese cue for User turns", "expectedKeywords": ["word1", "word2", "word3"], "nativeVariations": ["Alternative natural phrasing"] }`,
            `] }`
          ].join('\n');
          const parsed = await callGeminiJson(apiKey, prompt);
          const ts = Date.now();
          const aiAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop';
          const userAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop';
          const turns = (Array.isArray(parsed.turns) ? parsed.turns : []).slice(0, 6).map((t, idx) => {
            const isAi = idx % 2 === 0;
            return {
              id: `sc-ai-${ts}-${idx + 1}`,
              speaker: isAi ? 'AI' : 'User',
              speakerName: isAi ? String(t?.speakerName || 'Alex') : 'Bạn',
              avatar: isAi ? aiAvatar : userAvatar,
              text: String(t?.text || '').trim(),
              translation: String(t?.translation || '').trim(),
              hintPrompt: isAi ? undefined : String(t?.hintPrompt || ''),
              expectedKeywords: Array.isArray(t?.expectedKeywords) ? t.expectedKeywords.map(String).slice(0, 5) : [],
              nativeVariations: Array.isArray(t?.nativeVariations) ? t.nativeVariations.map(String).slice(0, 2) : []
            };
          }).filter(t => t.text);

          if (turns.length >= 4) {
            const scenario = {
              id: `custom-${ts}`,
              level,
              title: String(parsed.title || topic),
              category: 'Xã giao',
              description: String(parsed.description || `Tình huống phản xạ CEFR ${level}: ${topic}`),
              icon: '🎯',
              targetGoal: String(parsed.targetGoal || `Hoàn thành hội thoại về ${topic}`),
              turns
            };
            sendJson(req, res, 200, { scenario, source: 'gemini', isFallback: false, quota });
            return true;
          }
        } catch (aiErr) {
          console.warn('[AI Scenario] Gemini call failed, using fallback:', aiErr.message);
        }
      }

      const fallbackScenario = generateFallbackScenario(topic, level);
      sendJson(req, res, 200, { scenario: fallbackScenario, source: 'offline-fallback', isFallback: true, quota });
      return true;
    } catch (err) {
      sendJson(req, res, 500, { error: err.message || 'Lỗi tạo tình huống Speaking AI.' });
      return true;
    }
  }

  // 5. POST /api/ai/evaluate-sentence (Active Production: evaluate learner's sentence/short paragraph in IELTS, Work or Daily context)
  if (pathname === '/api/ai/evaluate-sentence' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const targetWordsList = Array.isArray(body.targetWords)
        ? body.targetWords.map((w) => normalizeLookupQuery(w || '')).filter(Boolean).slice(0, 8)
        : [];
      const targetWord = normalizeLookupQuery(body.targetWord || targetWordsList[0] || '');
      const userSentence = String(body.userSentence || '').trim().slice(0, 800);
      const scenario = body.scenario === 'work' ? 'work' : body.scenario === 'ielts' ? 'ielts' : 'daily';
      const contextSentence = String(body.contextSentence || '').trim().slice(0, 320);
      const grammarFocus = String(body.grammarFocus || '').trim().slice(0, 180);

      if (!targetWord && !grammarFocus) {
        sendJson(req, res, 400, { error: 'Thiếu từ vựng hoặc cấu trúc ngữ pháp mục tiêu cần luyện viết.' });
        return true;
      }
      if (!userSentence || userSentence.length < 4) {
        sendJson(req, res, 400, { error: 'Vui lòng viết 1 câu tiếng Anh hoàn chỉnh (ít nhất 4 ký tự).' });
        return true;
      }

      const quota = await consumeAiQuota({ db, currentUser, req, res, sendJson });
      if (!quota) return true;

      if (options.aiSentenceResponder) {
        const result = await options.aiSentenceResponder({ targetWord, userSentence, scenario, contextSentence });
        sendJson(req, res, 200, {
          targetWord,
          userSentence,
          scenario,
          ...result,
          source: 'gemini',
          isFallback: false,
          quota
        });
        return true;
      }

      if (apiKey) {
        try {
          const contextLabel =
            scenario === 'ielts'
              ? 'academic IELTS Writing Task 2 / Band 7.5+ formal essay style'
              : scenario === 'work'
                ? 'professional workplace communication (emails, meetings, Slack, presentations)'
                : 'natural everyday spoken English with friends or colleagues';
          const prompt = [
            `You are an elite English communication & IELTS Writing coach helping a Vietnamese learner turn passive vocabulary/grammar into active fluency.`,
            targetWordsList.length > 1
              ? `Target vocabulary list (try to use as many naturally): ${targetWordsList.map((w) => `"${w}"`).join(', ')}`
              : targetWord
                ? `Target word or phrase: "${targetWord}"`
                : '',
            grammarFocus ? `Target grammar structure to apply: "${grammarFocus}"` : '',
            contextSentence ? `Reference context sentence: "${contextSentence}"` : '',
            `Intended context: ${contextLabel}`,
            `Learner's writing: "${userSentence}"`,
            `Evaluate the learner's writing and return strict JSON with exact keys:`,
            `- "score": integer 1 to 10 (naturalness + grammatical & contextual accuracy).`,
            `- "isCorrectUsage": boolean (true if target vocabulary/grammar is used accurately in meaning and grammar).`,
            `- "feedbackVi": 2 concise Vietnamese sentences praising what works and pointing out any grammar/collocation/register mistake.`,
            `- "naturalVersion": One polished, natural rewrite tailored for ${contextLabel} keeping the learner's idea and target vocabulary/grammar.`,
            `- "collocationTip": One short Vietnamese tip showing a high-value collocation or Band 7.5+ pattern.`
          ].filter(Boolean).join('\n');

          const parsed = await callGeminiJson(apiKey, prompt);
          const scoreNum = Math.max(1, Math.min(10, Math.round(Number(parsed.score) || 7)));
          sendJson(req, res, 200, {
            targetWord,
            userSentence,
            scenario,
            score: scoreNum,
            isCorrectUsage: Boolean(parsed.isCorrectUsage),
            feedbackVi: String(parsed.feedbackVi || '').trim() || 'Câu của bạn khá rõ ý!',
            naturalVersion: String(parsed.naturalVersion || '').trim() || userSentence,
            collocationTip: String(parsed.collocationTip || '').trim(),
            source: 'gemini',
            isFallback: false,
            quota
          });
          return true;
        } catch (aiErr) {
          console.warn('[AI Sentence Eval] Gemini call failed, using offline evaluator:', aiErr.message);
        }
      }

      // Deterministic offline fallback evaluator (honest, clear isFallback: true)
      const lowerSent = userSentence.toLowerCase();
      const targetRoot = targetWord.toLowerCase().replace(/(ing|ed|s)$/, '');
      const hasTarget = lowerSent.includes(targetWord.toLowerCase()) || (targetRoot.length >= 4 && lowerSent.includes(targetRoot));
      const wordCount = userSentence.split(/\s+/).filter(Boolean).length;
      const endsWithPunct = /[.!?]$/.test(userSentence);
      const score = !hasTarget ? 4 : wordCount >= 6 && endsWithPunct ? 8 : 7;

      const naturalSuggestion = scenario === 'work'
        ? `In today's team update, I want to highlight "${targetWord}" so we stay aligned on the timeline.`
        : `Honestly, "${targetWord}" really came up in my day today and made me think twice.`;

      sendJson(req, res, 200, {
        targetWord,
        userSentence,
        scenario,
        score,
        isCorrectUsage: hasTarget && wordCount >= 4,
        feedbackVi: !hasTarget
          ? `Câu của bạn chưa chứa từ/cụm "${targetWord}". Hãy thử đưa trực tiếp "${targetWord}" vào câu để luyện phản xạ chủ động nhé! (Chế độ Offline — cần GEMINI_API_KEY để chấm sâu ngữ pháp)`
          : wordCount < 5
          ? `Bạn đã dùng đúng "${targetWord}", nhưng câu hơi ngắn (${wordCount} từ). Hãy thêm bối cảnh cụ thể (thời gian, mục tiêu hoặc lý do) để dùng tự nhiên hơn ngoài thực tế.`
          : `Tốt lắm! Bạn đã chủ động dùng "${targetWord}" trong câu ${wordCount} từ. Cấu hình GEMINI_API_KEY trên server để nhận nhận xét sắc thái ngữ pháp chi tiết hơn.`,
        naturalVersion: hasTarget ? userSentence : naturalSuggestion,
        collocationTip: scenario === 'work'
          ? `Mẹo công sở: Hãy gắn "${targetWord}" vào câu đề xuất, cập nhật tiến độ hoặc email phản hồi sếp/đồng nghiệp.`
          : `Mẹo đời sống: Nói to câu chứa "${targetWord}" 2 lần (Production Effect) để lần sau bật ra tự nhiên không cần dịch.`,
        source: 'offline-fallback',
        isFallback: true,
        quota
      });
      return true;
    } catch (err) {
      sendJson(req, res, 500, { error: err.message || 'Lỗi chấm câu luyện tập AI.' });
      return true;
    }
  }

  return false;
}
