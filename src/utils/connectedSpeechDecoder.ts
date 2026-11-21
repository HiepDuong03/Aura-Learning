/**
 * American Connected Speech Decoder (0ms, 100% client-side, receptive-first).
 *
 * Detects authentic American English speech reductions, assimilations, and linking
 * patterns inside subtitle lines so EFL learners recognize rapid spoken speech
 * (receptive listening comprehension per IATEFL PronSIG & ERIC EJ1515456).
 */

export type ConnectedSpeechType = 'reduction' | 'assimilation' | 'linking' | 'flap_t';

export interface ConnectedSpeechHint {
  id: string;
  written: string;
  spoken: string;
  ipaLike: string;
  type: ConnectedSpeechType;
  noteVi: string;
}

interface ConnectedSpeechRule {
  id: string;
  pattern: RegExp;
  spoken: string;
  ipaLike: string;
  type: ConnectedSpeechType;
  noteVi: string;
  priority: number;
}

const CONNECTED_SPEECH_RULES: ConnectedSpeechRule[] = [
  // High-frequency American reductions
  {
    id: 'going-to',
    pattern: /\bgoing to\b/i,
    spoken: 'gonna',
    ipaLike: '/ˈɡʌnə/',
    type: 'reduction',
    noteVi: 'Người Mỹ nói nhanh thường nuốt "going to" thành "gonna" (khi chỉ ý định tương lai).',
    priority: 10
  },
  {
    id: 'want-to',
    pattern: /\bwant to\b/i,
    spoken: 'wanna',
    ipaLike: '/ˈwɑːnə/',
    type: 'reduction',
    noteVi: 'Trong hội thoại tự nhiên, "want to" thường rút gọn nghe như "wanna".',
    priority: 10
  },
  {
    id: 'got-to',
    pattern: /\b(have\s+)?got to\b/i,
    spoken: 'gotta',
    ipaLike: '/ˈɡɑːt̬ə/',
    type: 'reduction',
    noteVi: '"(have) got to" rút gọn thành "gotta" — rất hay gặp trong đời sống Mỹ.',
    priority: 10
  },
  {
    id: 'have-to',
    pattern: /\bhave to\b/i,
    spoken: 'hafta',
    ipaLike: '/ˈhæftə/',
    type: 'reduction',
    noteVi: 'Âm /v/ trước /t/ bị vô thanh hóa, nghe như "hafta".',
    priority: 9
  },
  {
    id: 'kind-of',
    pattern: /\bkind of\b/i,
    spoken: 'kinda',
    ipaLike: '/ˈkaɪndə/',
    type: 'reduction',
    noteVi: '"kind of" giảm âm thành "kinda" (kiểu như / hơi hơi).',
    priority: 9
  },
  {
    id: 'sort-of',
    pattern: /\bsort of\b/i,
    spoken: 'sorta',
    ipaLike: '/ˈsɔːrt̬ə/',
    type: 'reduction',
    noteVi: '"sort of" giảm âm thành "sorta" trong lời nói tự nhiên.',
    priority: 8
  },
  {
    id: 'out-of',
    pattern: /\bout of\b/i,
    spoken: 'outta',
    ipaLike: '/ˈaʊt̬ə/',
    type: 'reduction',
    noteVi: '"out of" nối âm + giảm "of" thành "outta".',
    priority: 9
  },
  {
    id: 'a-lot-of',
    pattern: /\ba lot of\b/i,
    spoken: 'alotta',
    ipaLike: '/əˈlɑːt̬ə/',
    type: 'flap_t',
    noteVi: 'Âm /t/ kẹp giữa 2 nguyên âm bật nhẹ như /d/ (Flap-T), nghe như "a-lo-da".',
    priority: 9
  },
  {
    id: 'give-me',
    pattern: /\bgive me\b/i,
    spoken: 'gimme',
    ipaLike: '/ˈɡɪmi/',
    type: 'reduction',
    noteVi: 'Người Mỹ nói nhanh nối "give me" thành "gimme".',
    priority: 9
  },
  {
    id: 'let-me',
    pattern: /\blet me\b/i,
    spoken: 'lemme',
    ipaLike: '/ˈlemi/',
    type: 'reduction',
    noteVi: 'Âm /t/ bị nuốt khi nối với /m/, nghe như "lemme".',
    priority: 9
  },
  {
    id: 'dont-know',
    pattern: /\bdon['’]t know\b/i,
    spoken: 'dunno',
    ipaLike: '/dəˈnoʊ/',
    type: 'reduction',
    noteVi: '"don\'t know" nói nhanh thường nghe rất ngắn thành "dunno".',
    priority: 10
  },

  // Palatalization / Assimilation (/d/ or /t/ + /j/ -> /dʒ/ or /tʃ/)
  {
    id: 'what-are-you',
    pattern: /\bwhat are you\b/i,
    spoken: 'whatcha',
    ipaLike: '/ˈwʌtʃə/',
    type: 'assimilation',
    noteVi: '"what are you" đồng hóa thành "whatcha" khi nói nhanh.',
    priority: 10
  },
  {
    id: 'what-do-you',
    pattern: /\bwhat do you\b/i,
    spoken: 'whaddaya',
    ipaLike: '/ˈwʌt̬əjə/',
    type: 'assimilation',
    noteVi: 'Câu hỏi cực phổ biến: "What do you..." thường nghe như "Whaddaya...".',
    priority: 10
  },
  {
    id: 'would-you',
    pattern: /\bwould you\b/i,
    spoken: 'wouldja',
    ipaLike: '/ˈwʊdʒə/',
    type: 'assimilation',
    noteVi: 'Âm /d/ + /y/ nối thành /dʒ/ ("wouldja"), rất hay nghe khi gọi món hay nhờ vả.',
    priority: 9
  },
  {
    id: 'could-you',
    pattern: /\bcould you\b/i,
    spoken: 'couldja',
    ipaLike: '/ˈkʊdʒə/',
    type: 'assimilation',
    noteVi: 'Âm /d/ + /y/ biến thành /dʒ/ ("couldja").',
    priority: 9
  },
  {
    id: 'did-you',
    pattern: /\bdid you\b/i,
    spoken: 'didja',
    ipaLike: '/ˈdɪdʒə/',
    type: 'assimilation',
    noteVi: 'Âm /d/ + /y/ nối mượt thành "didja".',
    priority: 9
  },
  {
    id: 'got-you',
    pattern: /\bgot you\b/i,
    spoken: 'gotcha',
    ipaLike: '/ˈɡɑːtʃə/',
    type: 'assimilation',
    noteVi: '"got you" đồng hóa thành "gotcha" (Hiểu rồi / Bắt được nhé!).',
    priority: 9
  },
  {
    id: 'do-you',
    pattern: /\bdo you\b/i,
    spoken: 'dya / d\'you',
    ipaLike: '/djə/',
    type: 'reduction',
    noteVi: 'Đầu câu hỏi "Do you..." thường giảm nhẹ âm thành "d\'you" hoặc "dya".',
    priority: 6
  },

  // High-frequency American Flap-T & Linking phrases
  {
    id: 'figure-it-out',
    pattern: /\bfigure it out\b/i,
    spoken: 'fi-gyuh-ri-dout',
    ipaLike: '/ˈfɪɡjər ɪt̬ aʊt/',
    type: 'linking',
    noteVi: 'Nối liền 3 từ + Flap-T ở "it out", nghe thành một nhịp "fi-gyuh-ri-dout".',
    priority: 10
  },
  {
    id: 'work-out',
    pattern: /\bwork out\b/i,
    spoken: 'wer-kout',
    ipaLike: '/wɜːrˈkaʊt/',
    type: 'linking',
    noteVi: 'Phụ âm /k/ nối thẳng sang nguyên âm /aʊ/, nghe như "wer-kout".',
    priority: 8
  },
  {
    id: 'turned-out',
    pattern: /\bturned out\b/i,
    spoken: 'turn-dout',
    ipaLike: '/tɜːrnˈdaʊt/',
    type: 'linking',
    noteVi: 'Âm /d/ cuối "turned" nối liền sang "out" thành "turn-dout".',
    priority: 8
  },
  {
    id: 'drop-out',
    pattern: /\bdrop(?:ped)? out\b/i,
    spoken: 'dro-pout',
    ipaLike: '/drɑːˈpaʊt/',
    type: 'linking',
    noteVi: 'Âm /p/ hoặc /pt/ nối sang "out" gọn thành 1 cụm.',
    priority: 7
  },
  {
    id: 'what-about',
    pattern: /\bwhat about\b/i,
    spoken: 'wha-da-bout',
    ipaLike: '/ˈwʌt̬əbaʊt/',
    type: 'flap_t',
    noteVi: 'Flap-T biến /t/ thành âm /d/ nhẹ: "wha-da-bout".',
    priority: 8
  },
  {
    id: 'not-at-all',
    pattern: /\bnot at all\b/i,
    spoken: 'no-da-tall',
    ipaLike: '/nɑːt̬əˈtɔːl/',
    type: 'flap_t',
    noteVi: 'Nối cả 3 từ liền hơi: "no-da-tall".',
    priority: 8
  },
  {
    id: 'get-it',
    pattern: /\bget it\b/i,
    spoken: 'ge-dit',
    ipaLike: '/ˈɡet̬ɪt/',
    type: 'flap_t',
    noteVi: 'Flap-T kiểu Mỹ đặc trưng: "get it" nghe như "ge-dit".',
    priority: 8
  },
  {
    id: 'check-it-out',
    pattern: /\bcheck it out\b/i,
    spoken: 'che-ki-dout',
    ipaLike: '/tʃek ɪt̬ aʊt/',
    type: 'linking',
    noteVi: 'Nối /k/ → /ɪ/ và Flap-T /t/ → /d/: "che-ki-dout".',
    priority: 9
  },
  {
    id: 'make-it-a',
    pattern: /\bmake it a\b/i,
    spoken: 'may-ki-da',
    ipaLike: '/ˈmeɪk ɪt̬ ə/',
    type: 'flap_t',
    noteVi: 'Nối liền "make it a" bằng Flap-T thành "may-ki-da".',
    priority: 9
  },
  {
    id: 'here-you-go',
    pattern: /\bhere you go\b/i,
    spoken: 'here-ya-go',
    ipaLike: '/hɪr jə ɡoʊ/',
    type: 'reduction',
    noteVi: 'Từ "you" không nhấn trọng âm giảm thành "ya": "here-ya-go".',
    priority: 8
  },
  {
    id: 'for-a',
    pattern: /\bfor a\b/i,
    spoken: 'fer-uh',
    ipaLike: '/fərə/',
    type: 'reduction',
    noteVi: '"for a" giảm âm schwa rất nhanh thành "fer-uh".',
    priority: 5
  },
  {
    id: 'want-a',
    pattern: /\bwant a\b/i,
    spoken: 'wanna',
    ipaLike: '/ˈwɑːnə/',
    type: 'reduction',
    noteVi: '"want a" trong lời nói nhanh thường nghe rất giống "wanna".',
    priority: 7
  },
  {
    id: 'take-it',
    pattern: /\btake it\b/i,
    spoken: 'tay-kit',
    ipaLike: '/ˈteɪkɪt/',
    type: 'linking',
    noteVi: 'Phụ âm /k/ nối thẳng qua nguyên âm /ɪ/ nghe như "tay-kit".',
    priority: 7
  }
];

/**
 * Extracts up to `maxHints` (default 2) highest-priority American connected speech hints
 * from an English subtitle sentence.
 */
export function decodeConnectedSpeech(sentence: string, maxHints = 2): ConnectedSpeechHint[] {
  const clean = String(sentence || '').trim();
  if (!clean || maxHints <= 0) return [];

  const matched: Array<ConnectedSpeechHint & { priority: number; matchIndex: number }> = [];
  const usedRanges: Array<[number, number]> = [];

  // Sort rules by priority descending so more specific rules (e.g., "what do you") beat broader ones ("do you")
  const orderedRules = [...CONNECTED_SPEECH_RULES].sort((a, b) => b.priority - a.priority);

  for (const rule of orderedRules) {
    const match = rule.pattern.exec(clean);
    if (!match || match.index === undefined) continue;

    const start = match.index;
    const end = start + match[0].length;
    const overlaps = usedRanges.some(([uStart, uEnd]) => start < uEnd && end > uStart);
    if (overlaps) continue;

    usedRanges.push([start, end]);
    matched.push({
      id: rule.id,
      written: match[0],
      spoken: rule.spoken,
      ipaLike: rule.ipaLike,
      type: rule.type,
      noteVi: rule.noteVi,
      priority: rule.priority,
      matchIndex: start
    });

    if (matched.length >= maxHints) break;
  }

  return matched
    .sort((a, b) => a.matchIndex - b.matchIndex)
    .map(({ id, written, spoken, ipaLike, type, noteVi }) => ({
      id,
      written,
      spoken,
      ipaLike,
      type,
      noteVi
    }));
}
