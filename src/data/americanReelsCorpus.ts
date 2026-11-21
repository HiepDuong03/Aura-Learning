import { ReelCategory, ReelRegister, SubtitleLine, VideoLesson } from '../types';

export interface CuratedAmericanReel {
  id: string;
  youtubeId: string;
  expression: string;
  expressionMeaningVi: string;
  americanUsageNote: string;
  reelCategory: Exclude<ReelCategory, 'my_videos'>;
  register: ReelRegister;
  level: 'A2' | 'B1' | 'B2';
  channel: string;
  sourceLessonTitle: string;
  startSeconds: number;
  endSeconds: number;
  targetSubIndex: number;
  subtitles: SubtitleLine[];
}

/**
 * Curated Vertical 9:16 Real American YouTube Shorts Corpus (Instant 0ms Fallback + Starter Feed)
 *
 * Every YouTube Short ID below was verified live:
 * - Portrait 9:16 aspect ratio (vertical: true via youtube.com/oembed)
 * - Embeddable & playable (playabilityStatus: OK, playableInEmbed: true)
 * - Exact timestamps extracted directly from YouTube timed captions
 *
 * Fresh Shorts are also fetched automatically at runtime via `GET /api/reels/feed`.
 */
export const AMERICAN_REELS_CORPUS: CuratedAmericanReel[] = [
  // ===================== CLUSTER 1: DAILY LIFE & CASUAL US (6 VERTICAL SHORTS) =====================
  {
    id: 'reel-us-grab-coffee',
    youtubeId: 'FkdIpHm4fjc',
    expression: 'grab a coffee',
    expressionMeaningVi: 'Đi làm ly cà phê / lấy nhanh thứ gì đó',
    americanUsageNote: 'Người Mỹ dùng "grab" suốt ngày thay cho "get/take" để nghe thân thiện, tự nhiên: grab a coffee, grab a seat, grab lunch.',
    reelCategory: 'daily_life',
    register: 'casual_us',
    level: 'A2',
    channel: 'My Bilingual Life',
    sourceLessonTitle: 'What Americans Really Mean When They Say "Grab"',
    startSeconds: 14.4,
    endSeconds: 36.3,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rus-gr-1',
        start: 14.4,
        end: 17.0,
        text: 'And yes, that is true, but listen to how Americans really use it.',
        translation: 'Đúng là nghĩa từ điển vậy, nhưng hãy nghe cách người Mỹ thực sự dùng nó.'
      },
      {
        id: 'rus-gr-2',
        start: 17.0,
        end: 23.2,
        text: 'Grab a coffee. Grab a seat. Grab lunch.',
        translation: 'Làm ly cà phê nhé. Ngồi xuống tự nhiên đi. Đi ăn trưa thôi.'
      },
      {
        id: 'rus-gr-3',
        start: 23.28,
        end: 26.24,
        text: 'Grab your jacket. Let me grab my phone.',
        translation: 'Cầm áo khoác đi. Để mình lấy điện thoại cái đã.'
      },
      {
        id: 'rus-gr-4',
        start: 26.24,
        end: 31.6,
        text: 'In everyday English, grab has become a friendly, casual way to say get.',
        translation: 'Trong tiếng Anh hàng ngày, "grab" trở thành cách nói thân thiện, tự nhiên thay cho "get".'
      },
      {
        id: 'rus-gr-5',
        start: 31.6,
        end: 36.3,
        text: 'Want to grab dinner later? That just means, do you want to get dinner together?',
        translation: '"Want to grab dinner later?" chỉ đơn giản là rủ nhau lát nữa đi ăn tối cùng nhau.'
      }
    ]
  },
  {
    id: 'reel-us-wanna-hafta',
    youtubeId: 'mwTpw9_6Aig',
    expression: 'wanna / hafta',
    expressionMeaningVi: 'Nối âm kiểu Mỹ: want to → wanna, have to → hafta',
    americanUsageNote: 'Trong văn nói Mỹ tự nhiên, "want to" gần như luôn nuốt thành "wanna" và "have to" thành "hafta".',
    reelCategory: 'daily_life',
    register: 'casual_us',
    level: 'A2',
    channel: 'Speak English With Vanessa',
    sourceLessonTitle: 'Speak Like an American: Wanna & Hafta',
    startSeconds: 0.0,
    endSeconds: 27.2,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rus-wh-1',
        start: 0.0,
        end: 3.4,
        text: 'Can you say this like an American? I want to go with you.',
        translation: 'Bạn có thể nói câu này chuẩn kiểu Mỹ không? "I want to go with you."'
      },
      {
        id: 'rus-wh-2',
        start: 3.42,
        end: 6.9,
        text: 'I wanna go with you. The words want and to become wanna.',
        translation: '"I wanna go with you." Hai từ "want" và "to" nối liền thành "wanna".'
      },
      {
        id: 'rus-wh-3',
        start: 6.9,
        end: 13.26,
        text: "I wanna go with you. What about this sentence: You don't have to clean that up by yourself.",
        translation: '"I wanna go with you." Còn câu này thì sao: Bạn không cần phải tự dọn chỗ đó một mình đâu.'
      },
      {
        id: 'rus-wh-4',
        start: 15.32,
        end: 22.86,
        text: "You don't hafta clean that up by yourself. The words have to become hafta in American English.",
        translation: '"You don\'t hafta clean that up by yourself." Cụm "have to" biến thành "hafta" trong tiếng Mỹ.'
      },
      {
        id: 'rus-wh-5',
        start: 22.86,
        end: 27.2,
        text: "You don't hafta clean that up all by yourself.",
        translation: 'Bạn không phải dọn sạch chỗ đó một mình đâu.'
      }
    ]
  },
  {
    id: 'reel-us-hit-the-sack',
    youtubeId: '44IhmZVASd8',
    expression: 'hit the sack',
    expressionMeaningVi: 'Đi ngủ / leo lên giường ngủ',
    americanUsageNote: 'Thành ngữ đời thường cực phổ biến ở Mỹ khi mệt lử cuối ngày, tự nhiên hơn nhiều so với "go to sleep".',
    reelCategory: 'daily_life',
    register: 'casual_us',
    level: 'B1',
    channel: 'San Diego Voice and Accent',
    sourceLessonTitle: '"Hit the sack" — American English Idiom',
    startSeconds: 7.5,
    endSeconds: 27.9,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rus-hs-1',
        start: 7.56,
        end: 11.64,
        text: 'To hit the sack means to go to bed.',
        translation: '"Hit the sack" có nghĩa là đi ngủ.'
      },
      {
        id: 'rus-hs-2',
        start: 11.64,
        end: 14.5,
        text: "I'm exhausted. I think I'm going to hit the sack.",
        translation: 'Mình kiệt sức rồi. Chắc mình đi ngủ đây.'
      },
      {
        id: 'rus-hs-3',
        start: 14.5,
        end: 21.4,
        text: "It's been a long week and I can't wait to hit the sack and catch up on sleep this weekend.",
        translation: 'Cả tuần dài mệt mỏi rồi, mình chỉ mong được lên giường ngủ bù cuối tuần này.'
      },
      {
        id: 'rus-hs-4',
        start: 21.44,
        end: 27.9,
        text: 'Jane had to wake up early for her flight, so she hit the sack as soon as she got home.',
        translation: 'Jane phải dậy sớm kịp chuyến bay nên vừa về đến nhà là cô ấy đi ngủ ngay.'
      }
    ]
  },
  {
    id: 'reel-us-have-to-aftuh',
    youtubeId: 'IIUd7suvUFI',
    expression: 'I have to',
    expressionMeaningVi: 'Tôi phải... (đọc nối kiểu Mỹ: "I aftuh")',
    americanUsageNote: 'Khi nói nhanh, người Mỹ lược âm /h/ của "have" và nối thành "I aftuh" — tập nghe cụm này giúp bắt kịp 90% hội thoại hàng ngày.',
    reelCategory: 'daily_life',
    register: 'casual_us',
    level: 'A2',
    channel: 'SpeechModification',
    sourceLessonTitle: 'Fluent American Practice: "I have to"',
    startSeconds: 0.4,
    endSeconds: 24.3,
    targetSubIndex: 2,
    subtitles: [
      {
        id: 'rus-ht-1',
        start: 0.48,
        end: 4.0,
        text: "Hi guys, here's a quick practice for the phrase I have to.",
        translation: 'Chào mọi người, đây là bài luyện nhanh cho cụm "I have to".'
      },
      {
        id: 'rus-ht-2',
        start: 4.0,
        end: 8.5,
        text: 'We say it like "I aftuh". I have to think about it.',
        translation: 'Người Mỹ đọc nối như "I aftuh". Tôi phải suy nghĩ thêm về việc đó.'
      },
      {
        id: 'rus-ht-3',
        start: 8.5,
        end: 15.0,
        text: 'I have to work. I have to go. I have to be there.',
        translation: 'Mình phải làm việc. Mình phải đi rồi. Mình phải có mặt ở đó.'
      },
      {
        id: 'rus-ht-4',
        start: 15.08,
        end: 21.8,
        text: 'I have to call her. I have to get some. I have to buy that.',
        translation: 'Mình phải gọi cho cô ấy. Mình phải mua một ít. Mình phải mua món đó.'
      },
      {
        id: 'rus-ht-5',
        start: 21.8,
        end: 24.3,
        text: 'I have to write it down. I have to remember that.',
        translation: 'Mình phải ghi lại mới được. Mình phải nhớ chuyện đó.'
      }
    ]
  },
  {
    id: 'reel-us-small-talk',
    youtubeId: 'P6MfNZBfrNU',
    expression: 'not clicking with',
    expressionMeaningVi: 'Không hợp cạ / khó bắt nhịp trò chuyện',
    americanUsageNote: 'Khi nói chuyện xã giao ở Mỹ ("small talk"), mở đầu bằng câu xã giao nhẹ nhàng là văn hóa mặc định trước khi đi vào chuyện sâu.',
    reelCategory: 'daily_life',
    register: 'casual_us',
    level: 'B2',
    channel: 'Tannia Suárez',
    sourceLessonTitle: 'The American Small Talk Trap',
    startSeconds: 8.4,
    endSeconds: 24.4,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rus-st-1',
        start: 8.4,
        end: 11.4,
        text: 'When I work with that culture clash, they come to me and say:',
        translation: 'Khi gặp cú sốc văn hóa đó, mọi người hay tìm đến mình và bảo:'
      },
      {
        id: 'rus-st-2',
        start: 11.4,
        end: 15.12,
        text: '"I don\'t understand. I\'m just not clicking with people."',
        translation: '"Mình không hiểu sao cứ không bắt nhịp / không hợp cạ được với mọi người."'
      },
      {
        id: 'rus-st-3',
        start: 15.12,
        end: 18.6,
        text: "It's because we have this quirky way of starting with the superficial stuff.",
        translation: 'Bởi vì người Mỹ có thói quen mở đầu bằng những câu xã giao bề nổi.'
      },
      {
        id: 'rus-st-4',
        start: 18.6,
        end: 24.4,
        text: 'Like "How\'s the weather?" "How are you? Good. How are you? Great."',
        translation: 'Kiểu như "Thời tiết thế nào?", "Khỏe không? Ổn. Còn bạn? Tuyệt vời."'
      }
    ]
  },
  {
    id: 'reel-us-hotel-checkin',
    youtubeId: 'pOLF41l4-eU',
    expression: 'have a reservation',
    expressionMeaningVi: 'Có đặt phòng / đặt bàn trước',
    americanUsageNote: 'Mẫu hội thoại thực tế chuẩn Mỹ khi nhận phòng khách sạn hoặc vào nhà hàng — ngắn gọn, lịch sự, dùng được ngay.',
    reelCategory: 'daily_life',
    register: 'everyday',
    level: 'A2',
    channel: 'English Teaching Friends',
    sourceLessonTitle: 'Hotel Check-In English in America',
    startSeconds: 0.0,
    endSeconds: 18.2,
    targetSubIndex: 0,
    subtitles: [
      {
        id: 'rus-hc-1',
        start: 0.0,
        end: 4.3,
        text: 'Do you have a reservation? — Yes, I do.',
        translation: 'Bạn có đặt phòng trước không? — Có, tôi có đặt rồi.'
      },
      {
        id: 'rus-hc-2',
        start: 4.4,
        end: 8.9,
        text: 'May I see your ID, please? — Sure, here it is.',
        translation: 'Cho tôi xem giấy tờ tùy thân của bạn nhé? — Vâng, đây ạ.'
      },
      {
        id: 'rus-hc-3',
        start: 8.96,
        end: 13.4,
        text: 'How many nights will you stay? — Two nights.',
        translation: 'Bạn sẽ ở lại mấy đêm? — Hai đêm ạ.'
      },
      {
        id: 'rus-hc-4',
        start: 13.44,
        end: 18.2,
        text: 'Here is your room key. — Thank you.',
        translation: 'Đây là chìa khóa phòng của bạn. — Cảm ơn bạn.'
      }
    ]
  },

  // ===================== CLUSTER 2: WORKPLACE & AMERICAN OFFICE (6 VERTICAL SHORTS) =====================
  {
    id: 'reel-work-circle-back',
    youtubeId: '9LsK85CrsWU',
    expression: 'circle back',
    expressionMeaningVi: 'Quay lại bàn tiếp sau / để sau xử lý tiếp',
    americanUsageNote: 'Cụm từ số 1 trong các cuộc họp Mỹ khi muốn tạm gác 1 chủ đề để xử lý vào cuối ngày hoặc tuần sau.',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B1',
    channel: 'coachshanesesl',
    sourceLessonTitle: 'What Does "Circle Back" Really Mean?',
    startSeconds: 12.7,
    endSeconds: 37.8,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rw-cb-1',
        start: 12.72,
        end: 14.56,
        text: 'Circle back.',
        translation: 'Quay lại bàn tiếp sau ("Circle back").'
      },
      {
        id: 'rw-cb-2',
        start: 14.56,
        end: 18.48,
        text: 'Yeah, can we circle back to this next week?',
        translation: 'Ừ, tuần sau mình quay lại bàn tiếp vấn đề này được không?'
      },
      {
        id: 'rw-cb-3',
        start: 18.48,
        end: 23.84,
        text: "Let's circle back to the budget after lunch.",
        translation: 'Ăn trưa xong tụi mình quay lại chốt ngân sách nhé.'
      },
      {
        id: 'rw-cb-4',
        start: 23.84,
        end: 30.5,
        text: "We're going to have to circle back to this after we finish the main work.",
        translation: 'Chúng ta sẽ phải quay lại việc này sau khi làm xong phần việc chính.'
      },
      {
        id: 'rw-cb-5',
        start: 30.56,
        end: 37.8,
        text: 'To circle back means to get back to something later.',
        translation: '"Circle back" nghĩa là tạm gác lại rồi quay lại xử lý sau.'
      }
    ]
  },
  {
    id: 'reel-work-just-checking-in',
    youtubeId: 'dQ9SW57Cln4',
    expression: 'just checking in',
    expressionMeaningVi: 'Hỏi thăm nhẹ xem tiến độ tới đâu rồi',
    americanUsageNote: 'Nhắn Slack/Email cho đồng nghiệp Mỹ dùng "Just checking in" để nhắc khéo cập nhật tiến độ mà không gây cảm giác gắt gỏng.',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B1',
    channel: 'ChatterFox',
    sourceLessonTitle: 'What "Just Checking In" Actually Means at Work',
    startSeconds: 8.4,
    endSeconds: 34.3,
    targetSubIndex: 2,
    subtitles: [
      {
        id: 'rw-jc-1',
        start: 8.48,
        end: 14.16,
        text: 'If you work in the US, sooner or later you will get a message that says, "Just checking in."',
        translation: 'Nếu làm việc ở Mỹ, sớm muộn gì bạn cũng nhận được tin nhắn: "Just checking in."'
      },
      {
        id: 'rw-jc-2',
        start: 14.16,
        end: 20.0,
        text: "And if English isn't your first language, that message can feel stressful.",
        translation: 'Và nếu tiếng Anh không phải tiếng mẹ đẻ, tin nhắn đó dễ khiến bạn thấy áp lực.'
      },
      {
        id: 'rw-jc-3',
        start: 25.64,
        end: 31.92,
        text: 'In most American workplaces, "Just checking in" simply means, "Any updates?"',
        translation: 'Ở hầu hết công sở Mỹ, "Just checking in" chỉ đơn giản là hỏi: "Có cập nhật gì mới chưa?"'
      },
      {
        id: 'rw-jc-4',
        start: 31.92,
        end: 34.28,
        text: "It's not criticism. It's just a polite way to follow up.",
        translation: 'Đó không phải là chê trách. Chỉ là cách hỏi thăm tiến độ rất lịch sự thôi.'
      }
    ]
  },
  {
    id: 'reel-work-with-all-due-respect',
    youtubeId: 'eAizldoLIkk',
    expression: 'with all due respect',
    expressionMeaningVi: 'Xin phép nói thẳng / tôi tôn trọng nhưng không đồng ý',
    americanUsageNote: 'Tín hiệu lịch sự nhưng rất rõ ràng trong cuộc họp Mỹ: ngay sau cụm này sẽ là một quan điểm phản biện trực diện.',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B2',
    channel: 'ChatterFox',
    sourceLessonTitle: '"With All Due Respect" = Workplace Disagreement',
    startSeconds: 9.6,
    endSeconds: 48.4,
    targetSubIndex: 3,
    subtitles: [
      {
        id: 'rw-wr-1',
        start: 9.6,
        end: 15.08,
        text: 'Quick tip: you might hear this phrase, "with all due respect."',
        translation: 'Mẹo nhỏ: bạn có thể hay nghe cụm "with all due respect."'
      },
      {
        id: 'rw-wr-2',
        start: 15.08,
        end: 24.4,
        text: 'Sounds polite, right? But in real conversations, they are probably about to disagree with you.',
        translation: 'Nghe lịch sự đúng không? Nhưng thực tế là họ sắp phản biện lại ý bạn đấy.'
      },
      {
        id: 'rw-wr-3',
        start: 29.0,
        end: 35.6,
        text: 'It basically means, I respect you, but I see this differently.',
        translation: 'Về cơ bản nó có nghĩa là: tôi tôn trọng bạn, nhưng tôi nhìn vấn đề này theo hướng khác.'
      },
      {
        id: 'rw-wr-4',
        start: 42.6,
        end: 48.4,
        text: "For example: With all due respect, I don't think this will work.",
        translation: 'Ví dụ: Xin phép nói thẳng, tôi không nghĩ phương án này sẽ khả thi.'
      }
    ]
  },
  {
    id: 'reel-work-earliest-convenience',
    youtubeId: 'PhOgmBhouXA',
    expression: 'at your earliest convenience',
    expressionMeaningVi: 'Sớm nhất có thể khi bạn tiện',
    americanUsageNote: 'Câu chốt email công việc cực chuẩn để giục đối tác/đồng nghiệp làm sớm mà vẫn giữ thái độ chuyên nghiệp, không thô lỗ.',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B2',
    channel: 'ChatterFox',
    sourceLessonTitle: 'Business English: "At Your Earliest Convenience"',
    startSeconds: 9.3,
    endSeconds: 45.6,
    targetSubIndex: 3,
    subtitles: [
      {
        id: 'rw-ec-1',
        start: 9.32,
        end: 15.4,
        text: "Here's a phrase that sounds super formal: at your earliest convenience.",
        translation: 'Đây là cụm nghe rất trang trọng: "at your earliest convenience."'
      },
      {
        id: 'rw-ec-2',
        start: 15.4,
        end: 22.4,
        text: 'Basically it means: please take care of this as soon as you can.',
        translation: 'Hiểu đơn giản là: vui lòng xử lý việc này sớm nhất có thể khi bạn thu xếp được.'
      },
      {
        id: 'rw-ec-3',
        start: 22.44,
        end: 26.08,
        text: "It doesn't mean drop everything right now, and not whenever you get around to it.",
        translation: 'Không phải bắt bạn bỏ hết mọi thứ làm ngay, nhưng cũng đừng để ngâm quá lâu.'
      },
      {
        id: 'rw-ec-4',
        start: 36.72,
        end: 45.6,
        text: 'For example: Please review the document at your earliest convenience, or send the signed contract.',
        translation: 'Ví dụ: Vui lòng xem giúp tài liệu (hoặc gửi hợp đồng đã ký) sớm nhất khi bạn tiện.'
      }
    ]
  },
  {
    id: 'reel-work-repeat-more-slowly',
    youtubeId: 'dRLPWwI0_1s',
    expression: 'a little fast for me',
    expressionMeaningVi: 'Hơi nhanh với tôi — xin nhắc lại chậm hơn',
    americanUsageNote: 'Đừng im lặng khi đồng nghiệp bản xứ nói quá nhanh trong cuộc họp: câu này vừa chuyên nghiệp vừa tự tin.',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B1',
    channel: 'BizWise Business English',
    sourceLessonTitle: 'When Someone Speaks Too Fast in Meetings',
    startSeconds: 1.4,
    endSeconds: 49.8,
    targetSubIndex: 3,
    subtitles: [
      {
        id: 'rw-rf-1',
        start: 1.48,
        end: 8.08,
        text: 'Do you ever stay quiet in a meeting because someone is speaking too fast?',
        translation: 'Bạn có bao giờ ngồi im trong cuộc họp chỉ vì ai đó nói quá nhanh không?'
      },
      {
        id: 'rw-rf-2',
        start: 12.8,
        end: 18.8,
        text: 'We need the revised figures by Thursday so finance can check them before Friday.',
        translation: 'Ta cần số liệu chỉnh sửa trước thứ Năm để bên tài chính kiểm tra trước thứ Sáu.'
      },
      {
        id: 'rw-rf-3',
        start: 32.12,
        end: 41.5,
        text: "The person speaking has a responsibility to be understood. It's reasonable to ask them to slow down.",
        translation: 'Người nói có trách nhiệm truyền đạt dễ hiểu. Đề nghị họ nói chậm lại là hoàn toàn hợp lý.'
      },
      {
        id: 'rw-rf-4',
        start: 43.32,
        end: 49.8,
        text: 'Sorry, that was a little fast for me. Could you repeat that more slowly, please?',
        translation: 'Xin lỗi, đoạn vừa rồi hơi nhanh với mình. Bạn nhắc lại chậm hơn một chút được không?'
      }
    ]
  },
  {
    id: 'reel-work-can-of-worms',
    youtubeId: 'hr_Dkpzd3ak',
    expression: 'open a can of worms',
    expressionMeaningVi: 'Khơi ra một mớ rắc rối / đụng vào ổ kiến lửa',
    americanUsageNote: 'Idiom công sở cực đắt giá khi muốn cảnh báo rằng 1 đề xuất mới sẽ kéo theo hàng loạt vấn đề phức tạp.',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B2',
    channel: 'Speak Confident English',
    sourceLessonTitle: 'Workplace Idiom: Open a Can of Worms',
    startSeconds: 0.3,
    endSeconds: 47.9,
    targetSubIndex: 3,
    subtitles: [
      {
        id: 'rw-cw-1',
        start: 0.32,
        end: 5.36,
        text: 'To open a can of worms. That is a workplace idiom you are likely to hear.',
        translation: '"Open a can of worms" là một thành ngữ công sở bạn rất hay gặp.'
      },
      {
        id: 'rw-cw-2',
        start: 12.16,
        end: 21.2,
        text: 'It means to warn someone that whatever they are proposing is going to lead to greater complexity.',
        translation: 'Nó dùng để cảnh báo rằng điều họ đang đề xuất sẽ kéo theo nhiều rắc rối phức tạp hơn.'
      },
      {
        id: 'rw-cw-3',
        start: 26.48,
        end: 35.2,
        text: 'For example, someone proposes a change to an existing policy that everyone knows how to follow.',
        translation: 'Ví dụ ai đó đề xuất đổi một quy định cũ mà tất cả mọi người đã quen làm theo.'
      },
      {
        id: 'rw-cw-4',
        start: 41.56,
        end: 47.9,
        text: 'Another coworker might say, "Be careful with that. You\'re opening a can of worms."',
        translation: 'Đồng nghiệp khác có thể nói: "Cẩn thận đấy. Bạn đang khơi ra cả một mớ rắc rối đó."'
      }
    ]
  }
];

export function mapCuratedReelToVideoLesson(reel: CuratedAmericanReel): VideoLesson {
  const durationSec = Math.max(5, Math.round(reel.endSeconds - reel.startSeconds));
  return {
    id: reel.id,
    youtubeId: reel.youtubeId,
    title: `${reel.expression} — ${reel.sourceLessonTitle}`,
    channel: reel.channel,
    thumbnail: `https://i.ytimg.com/vi/${reel.youtubeId}/hqdefault.jpg`,
    level: reel.level,
    topic: reel.reelCategory === 'work_talk' ? 'Công sở & Giao tiếp Mỹ' : 'Đời sống Mỹ',
    duration: `00:${durationSec.toString().padStart(2, '0')}`,
    durationSec,
    views: '1.5M',
    description: reel.americanUsageNote,
    subtitles: reel.subtitles,
    quizzes: [],
    isShort: true,
    startSeconds: reel.startSeconds,
    endSeconds: reel.endSeconds,
    targetWord: reel.expression,
    targetContext: reel.subtitles[reel.targetSubIndex]?.text || reel.subtitles[0]?.text || '',
    sourceLessonTitle: reel.sourceLessonTitle,
    initialSubIndex: reel.targetSubIndex,
    expression: reel.expression,
    expressionMeaningVi: reel.expressionMeaningVi,
    americanUsageNote: reel.americanUsageNote,
    reelCategory: reel.reelCategory,
    register: reel.register
  };
}
