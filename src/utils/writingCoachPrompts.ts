import { CefrLevel, WritingCoachMode } from '../types';

export type WritingScenario = 'ielts' | 'work' | 'daily';

export interface WritingTargetWordInput {
  word: string;
  meaningVi: string;
  exampleEn?: string;
  pos?: string;
  pattern?: string;
  collocations?: string[];
}

export interface WritingPromptOption {
  id: string;
  taskTypeLabel: string;
  promptEn: string;
  instructionVi: string;
  suggestedWords: string[];
}

export interface WritingPeelStep {
  code: 'P' | 'E1' | 'E2' | 'L';
  label: string;
  hintVi: string;
  starterEn: string;
}

export interface WritingLinkerChip {
  phrase: string;
  functionVi: string;
}

export interface WritingWordTargetSpec {
  mode: WritingCoachMode;
  labelVi: string;
  shortDescVi: string;
  minWords: number;
  maxWords: number;
  minTargetWords: number;
  timerMinutes: number;
}

export const WRITING_MODE_SPECS: Record<WritingCoachMode, WritingWordTargetSpec> = {
  sentence: {
    mode: 'sentence',
    labelVi: 'Luyện câu',
    shortDescVi: '1–2 câu chuẩn xác (12–40 từ)',
    minWords: 12,
    maxWords: 40,
    minTargetWords: 1,
    timerMinutes: 5
  },
  paragraph: {
    mode: 'paragraph',
    labelVi: 'Đoạn PEEL',
    shortDescVi: '1 đoạn thân bài (80–130 từ)',
    minWords: 80,
    maxWords: 130,
    minTargetWords: 2,
    timerMinutes: 15
  },
  essay: {
    mode: 'essay',
    labelVi: 'Mini Essay',
    shortDescVi: 'Mở + Thân + Kết (160–260 từ)',
    minWords: 160,
    maxWords: 260,
    minTargetWords: 3,
    timerMinutes: 25
  }
};

export function getRecommendedWordTarget(mode: WritingCoachMode): WritingWordTargetSpec {
  return WRITING_MODE_SPECS[mode];
}

export function getDefaultWritingMode(scenario: WritingScenario, cefr?: CefrLevel): WritingCoachMode {
  if (scenario === 'ielts') {
    if (cefr === 'A1' || cefr === 'A2') return 'sentence';
    return 'paragraph';
  }
  return 'sentence';
}

const IELTS_LINKERS: WritingLinkerChip[] = [
  { phrase: 'Furthermore,', functionVi: 'Bổ sung ý' },
  { phrase: 'By contrast,', functionVi: 'Đối lập' },
  { phrase: 'Consequently,', functionVi: 'Hệ quả' },
  { phrase: 'For instance,', functionVi: 'Đưa ví dụ' },
  { phrase: 'Although', functionVi: 'Nhượng bộ' },
  { phrase: 'This is largely because', functionVi: 'Giải thích nguyên nhân' }
];

const WORK_LINKERS: WritingLinkerChip[] = [
  { phrase: 'Regarding', functionVi: 'Mở đầu vấn đề' },
  { phrase: 'To keep us on track,', functionVi: 'Nhấn mạnh tiến độ' },
  { phrase: 'In addition,', functionVi: 'Bổ sung thông tin' },
  { phrase: 'As a next step,', functionVi: 'Đề xuất hành động' },
  { phrase: 'Please let me know if', functionVi: 'Kết lịch sự' }
];

const DAILY_LINKERS: WritingLinkerChip[] = [
  { phrase: 'Honestly,', functionVi: 'Mở lời tự nhiên' },
  { phrase: 'On top of that,', functionVi: 'Thêm ý' },
  { phrase: 'Even though', functionVi: 'Mặc dù' },
  { phrase: 'That is why', functionVi: 'Giải thích lý do' },
  { phrase: 'Looking back,', functionVi: 'Nhìn lại trải nghiệm' }
];

export function getWritingLinkers(scenario: WritingScenario): WritingLinkerChip[] {
  if (scenario === 'ielts') return IELTS_LINKERS;
  if (scenario === 'work') return WORK_LINKERS;
  return DAILY_LINKERS;
}

function cleanTopicLabel(topicName?: string): string {
  const clean = (topicName || '').trim();
  if (!clean) return 'modern society';
  return clean.replace(/^CEFR\s+[A-C][12]\s+/i, '').replace(/Core Vocabulary/i, '').trim() || 'modern society';
}

export function buildWritingPrompts(params: {
  scenario: WritingScenario;
  writingMode: WritingCoachMode;
  topicName?: string;
  cefr?: CefrLevel;
  targetWords: WritingTargetWordInput[];
  grammarFocus?: { title: string; formula: string };
}): WritingPromptOption[] {
  const { scenario, writingMode, topicName, targetWords, grammarFocus } = params;
  const topic = cleanTopicLabel(topicName);
  const words = targetWords.map((w) => w.word.trim()).filter(Boolean);
  const w1 = words[0] || topic.toLowerCase();
  const w2 = words[1] || words[0] || 'long-term development';
  const w3 = words[2] || words[1] || w1;
  const spec = getRecommendedWordTarget(writingMode);

  if (grammarFocus) {
    return [
      {
        id: 'grammar-opinion',
        taskTypeLabel: `Áp dụng Ngữ pháp · ${spec.labelVi}`,
        promptEn: `Write about "${topic}" while clearly applying the structure "${grammarFocus.title}" (${grammarFocus.formula}).`,
        instructionVi: `Đưa đúng cấu trúc "${grammarFocus.title}" vào bài (${spec.minWords}–${spec.maxWords} từ) để AI kiểm tra độ chính xác ngữ pháp.`,
        suggestedWords: words.slice(0, 3)
      },
      {
        id: 'grammar-contrast',
        taskTypeLabel: 'So sánh & Lập luận',
        promptEn: `Compare two contrasting viewpoints on ${topic}, making sure at least one sentence uses "${grammarFocus.title}".`,
        instructionVi: `Viết lập luận 2 chiều và sử dụng tự nhiên cấu trúc ${grammarFocus.formula}.`,
        suggestedWords: words.slice(0, 3)
      },
      {
        id: 'grammar-solution',
        taskTypeLabel: 'Đề xuất Giải pháp',
        promptEn: `Propose a practical recommendation related to ${topic} using "${grammarFocus.title}" to elevate your academic tone.`,
        instructionVi: `Nêu 1 vấn đề và 1 giải pháp thực tế, áp dụng chuẩn xác công thức ngữ pháp mục tiêu.`,
        suggestedWords: words.slice(0, 3)
      }
    ];
  }

  if (scenario === 'ielts') {
    const scopeHint =
      writingMode === 'sentence'
        ? `Viết 1–2 câu học thuật (${spec.minWords}–${spec.maxWords} từ), dùng tự nhiên ≥ 1 từ trong danh sách.`
        : writingMode === 'paragraph'
          ? `Viết 1 đoạn thân bài PEEL (${spec.minWords}–${spec.maxWords} từ) trả lời trực tiếp đề bài, dùng tự nhiên ≥ 2 từ mục tiêu (không cần nhồi cả ${Math.max(words.length, 2)} từ).`
          : `Viết bài luận ngắn gồm Mở bài (Paraphrase + Thesis), 1–2 Thân bài và Kết bài (${spec.minWords}–${spec.maxWords} từ), dùng tự nhiên ≥ 3 từ mục tiêu.`;

    return [
      {
        id: 'ielts-opinion',
        taskTypeLabel: 'IELTS Task 2 · Opinion (Agree / Disagree)',
        promptEn:
          words.length >= 2
            ? `Some people argue that governments should prioritize "${w1}" over "${w2}" when addressing issues in ${topic}. To what extent do you agree or disagree?`
            : `Some people believe that investing heavily in "${w1}" is the most effective way to improve ${topic}. To what extent do you agree or disagree?`,
        instructionVi: scopeHint,
        suggestedWords: [w1, w2, w3].filter((v, i, arr) => arr.indexOf(v) === i)
      },
      {
        id: 'ielts-discussion',
        taskTypeLabel: 'IELTS Task 2 · Discussion (Both Views)',
        promptEn:
          words.length >= 2
            ? `While some individuals emphasize the benefits of "${w1}", others contend that "${w2}" plays a more decisive role in ${topic}. Discuss both views and give your own opinion.`
            : `People hold differing views on how "${w1}" shapes modern ${topic}. Discuss both perspectives and state your opinion.`,
        instructionVi: scopeHint,
        suggestedWords: [w1, w2, w3].filter((v, i, arr) => arr.indexOf(v) === i)
      },
      {
        id: 'ielts-problem-solution',
        taskTypeLabel: 'IELTS Task 2 · Problem & Solution',
        promptEn:
          words.length >= 2
            ? `Many communities face growing challenges related to "${w1}" and "${w2}" in the field of ${topic}. What are the main causes, and what measures can be taken to address them?`
            : `Rapid changes in ${topic} have created major challenges involving "${w1}". What causes this trend and how can it be resolved?`,
        instructionVi: scopeHint,
        suggestedWords: [w1, w2, w3].filter((v, i, arr) => arr.indexOf(v) === i)
      }
    ];
  }

  if (scenario === 'work') {
    return [
      {
        id: 'work-proposal',
        taskTypeLabel: 'Workplace · Email Đề xuất',
        promptEn: `Write a concise email to your manager proposing an improvement related to "${w1}"${words.length >= 2 ? ` and "${w2}"` : ''} for your team.`,
        instructionVi: `Viết email chuyên nghiệp, súc tích (${spec.minWords}–${spec.maxWords} từ), ưu tiên giọng văn rõ ràng và lịch sự.`,
        suggestedWords: words.slice(0, 3)
      },
      {
        id: 'work-slack',
        taskTypeLabel: 'Workplace · Cập nhật Slack / Họp nhóm',
        promptEn: `Draft a clear team update explaining a recent issue around "${w1}" and outlining the next action step.`,
        instructionVi: `Viết tin nhắn ngắn gọn, đi thẳng vào trọng tâm và hành động tiếp theo.`,
        suggestedWords: words.slice(0, 3)
      },
      {
        id: 'work-client',
        taskTypeLabel: 'Workplace · Phản hồi Đối tác',
        promptEn: `Reply politely to a stakeholder who raised concerns about "${w1}" and reassure them with a clear plan.`,
        instructionVi: `Giữ tông giọng chuyên nghiệp, đồng cảm và đưa cam kết cụ thể.`,
        suggestedWords: words.slice(0, 3)
      }
    ];
  }

  return [
    {
      id: 'daily-story',
      taskTypeLabel: 'Đời sống · Chia sẻ trải nghiệm',
      promptEn: `Share a short personal reflection or recent experience involving "${w1}"${words.length >= 2 ? ` or "${w2}"` : ''} as if chatting with a close friend.`,
      instructionVi: `Viết tự nhiên như người bản xứ trò chuyện (${spec.minWords}–${spec.maxWords} từ), tránh văn phong quá cứng nhắc.`,
      suggestedWords: words.slice(0, 3)
    },
    {
      id: 'daily-opinion',
      taskTypeLabel: 'Đời sống · Bày tỏ quan điểm',
      promptEn: `A friend asks your honest opinion about "${w1}" in everyday life. Write your response clearly and naturally.`,
      instructionVi: `Nêu suy nghĩ cá nhân kèm 1 lý do hoặc ví dụ đời thường.`,
      suggestedWords: words.slice(0, 3)
    },
    {
      id: 'daily-advice',
      taskTypeLabel: 'Đời sống · Đưa lời khuyên',
      promptEn: `Give practical, friendly advice to someone who wants to learn more about "${w1}".`,
      instructionVi: `Viết gần gũi, dễ áp dụng và dùng tự nhiên ≥ ${spec.minTargetWords} từ mục tiêu.`,
      suggestedWords: words.slice(0, 3)
    }
  ];
}

export function buildPeelScaffold(
  scenario: WritingScenario,
  prompt: WritingPromptOption,
  grammarFocus?: { title: string; formula: string }
): WritingPeelStep[] {
  const focusWord = prompt.suggestedWords[0] || 'this issue';
  const secondWord = prompt.suggestedWords[1] || focusWord;

  if (scenario === 'work') {
    return [
      {
        code: 'P',
        label: 'Mục đích (Purpose)',
        hintVi: 'Nêu thẳng lý do viết email/tin nhắn trong câu đầu.',
        starterEn: `I am writing to share a quick proposal regarding ${focusWord}.`
      },
      {
        code: 'E1',
        label: 'Bối cảnh (Context)',
        hintVi: 'Giải thích ngắn vấn đề hoặc cơ hội hiện tại.',
        starterEn: `Currently, our workflow around ${secondWord} requires additional alignment.`
      },
      {
        code: 'E2',
        label: 'Đề xuất (Action)',
        hintVi: 'Nêu giải pháp cụ thể, đo lường được.',
        starterEn: `As a next step, I suggest we prioritize...`
      },
      {
        code: 'L',
        label: 'Kết nối (CTA)',
        hintVi: 'Đề nghị phản hồi hoặc lịch chốt rõ ràng.',
        starterEn: `Please let me know your thoughts by Friday so we can move forward.`
      }
    ];
  }

  if (scenario === 'daily') {
    return [
      {
        code: 'P',
        label: 'Ý chính (Main Thought)',
        hintVi: 'Nêu cảm nhận thật của bạn ngay câu đầu.',
        starterEn: `Honestly, I think ${focusWord} has made a huge difference in my routine.`
      },
      {
        code: 'E1',
        label: 'Lý do (Why)',
        hintVi: 'Giải thích ngắn gọn vì sao bạn thấy vậy.',
        starterEn: `That is mostly because it helps me...`
      },
      {
        code: 'E2',
        label: 'Ví dụ thật (Example)',
        hintVi: 'Kể 1 tình huống nhỏ bạn vừa gặp.',
        starterEn: `Just last week, I noticed that...`
      },
      {
        code: 'L',
        label: 'Chốt ý (Wrap-up)',
        hintVi: 'Tóm lại 1 câu tự nhiên.',
        starterEn: `Overall, I would definitely recommend giving it a try.`
      }
    ];
  }

  return [
    {
      code: 'P',
      label: 'Point (Luận điểm chính)',
      hintVi: grammarFocus
        ? `Mở đoạn bằng 1 câu luận điểm rõ ràng (có thể lồng "${grammarFocus.title}").`
        : `Nêu rõ lập trường trực tiếp trả lời đề bài với "${focusWord}".`,
      starterEn: `One compelling reason to prioritize ${focusWord} is that it directly strengthens long-term outcomes.`
    },
    {
      code: 'E1',
      label: 'Explain (Giải thích nhân–quả)',
      hintVi: 'Phân tích cơ chế "vì sao / dẫn tới hệ quả gì" thay vì chỉ khẳng định suông.',
      starterEn: `This is largely because when resources are directed toward ${secondWord}, individuals gain...`
    },
    {
      code: 'E2',
      label: 'Example (Ví dụ thực tế)',
      hintVi: 'Đưa 1 minh chứng cụ thể (quốc gia, trường học, nghiên cứu hoặc chính sách).',
      starterEn: `For instance, countries that invest consistently in ${focusWord} tend to experience...`
    },
    {
      code: 'L',
      label: 'Link (Kết nối về đề bài)',
      hintVi: 'Khẳng định lại luận điểm để chốt đoạn mạch lạc (Coherence & Cohesion).',
      starterEn: `Consequently, addressing ${focusWord} remains indispensable for sustainable progress.`
    }
  ];
}
