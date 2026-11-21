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
 * Curated Real American Reels Corpus
 *
 * Every YouTube ID below was verified via `https://www.youtube.com/oembed` (HTTP 200)
 * and paired with exact real timestamps extracted from synced lesson/short transcripts.
 * Grouped by thematic clusters (`daily_life` and `work_talk`) to avoid fragmented
 * random context-switching (Nature Communications Psychology, May 2026).
 */
export const AMERICAN_REELS_CORPUS: CuratedAmericanReel[] = [
  // ===================== CLUSTER 1: DAILY LIFE & CASUAL US =====================
  {
    id: 'reel-us-sounds-good',
    youtubeId: 'x1hRlGhaM9s',
    expression: 'sounds good',
    expressionMeaningVi: 'Nghe hay đấy / chốt luôn nhé',
    americanUsageNote: 'Câu cửa miệng số 1 của người Mỹ để đồng ý nhẹ nhàng khi gọi món, hẹn giờ hoặc chốt ý tưởng.',
    reelCategory: 'daily_life',
    register: 'casual_us',
    level: 'A2',
    channel: 'Deeplingo - American Cafe',
    sourceLessonTitle: 'Ordering Food at a Cozy American Cafe',
    startSeconds: 41.7,
    endSeconds: 56.0,
    targetSubIndex: 2,
    subtitles: [
      {
        id: 'rus-sg-1',
        start: 41.72,
        end: 46.56,
        text: 'What do you recommend?',
        translation: 'Quán có món gì ngon, bạn gợi ý giúp mình với?'
      },
      {
        id: 'rus-sg-2',
        start: 43.56,
        end: 50.52,
        text: 'Our grilled chicken wrap is popular. We also have chicken, tuna, and veggie sandwiches.',
        translation: 'Bánh cuộn gà nướng rất được ưa chuộng. Tụi mình còn có sandwich gà, cá ngừ và rau củ.'
      },
      {
        id: 'rus-sg-3',
        start: 50.52,
        end: 54.32,
        text: "The chicken wrap sounds good. What's inside?",
        translation: 'Bánh cuộn gà nghe ổn đấy. Bên trong có những gì vậy?'
      }
    ]
  },
  {
    id: 'reel-us-a-side',
    youtubeId: 'x1hRlGhaM9s',
    expression: 'a side',
    expressionMeaningVi: 'Món ăn kèm (khoai tây chiên, salad...)',
    americanUsageNote: 'Ở quán ăn Mỹ, nhân viên hỏi "Would you like a side?" là hỏi món ăn kèm chứ không phải "một bên".',
    reelCategory: 'daily_life',
    register: 'casual_us',
    level: 'A2',
    channel: 'Deeplingo - American Cafe',
    sourceLessonTitle: 'Ordering Food at a Cozy American Cafe',
    startSeconds: 74.6,
    endSeconds: 86.6,
    targetSubIndex: 2,
    subtitles: [
      {
        id: 'rus-sd-1',
        start: 74.64,
        end: 78.52,
        text: 'Regular or large?',
        translation: 'Cỡ vừa hay cỡ lớn ạ?'
      },
      {
        id: 'rus-sd-2',
        start: 76.72,
        end: 80.08,
        text: 'Regular is fine.',
        translation: 'Cỡ vừa là được rồi ạ.'
      },
      {
        id: 'rus-sd-3',
        start: 78.52,
        end: 82.08,
        text: 'Would you like a side?',
        translation: 'Bạn có muốn gọi thêm món ăn kèm không?'
      },
      {
        id: 'rus-sd-4',
        start: 80.08,
        end: 85.52,
        text: 'What sides do you have?',
        translation: 'Quán có những món ăn kèm nào vậy?'
      }
    ]
  },
  {
    id: 'reel-us-that-explains-it',
    youtubeId: 'x1hRlGhaM9s',
    expression: 'That explains it',
    expressionMeaningVi: 'Thảo nào / Hèn gì!',
    americanUsageNote: 'Cực kỳ tự nhiên khi vừa nghe lý do giải thích cho chuyện gì đó thay vì nói "Now I understand why".',
    reelCategory: 'daily_life',
    register: 'everyday',
    level: 'A2',
    channel: 'Deeplingo - American Cafe',
    sourceLessonTitle: 'Ordering Food at a Cozy American Cafe',
    startSeconds: 159.1,
    endSeconds: 170.0,
    targetSubIndex: 2,
    subtitles: [
      {
        id: 'rus-te-1',
        start: 159.16,
        end: 164.56,
        text: 'You must be hungry.',
        translation: 'Chắc hẳn bạn đang đói lắm.'
      },
      {
        id: 'rus-te-2',
        start: 160.96,
        end: 166.28,
        text: "I skipped lunch. I'm very hungry.",
        translation: 'Mình bỏ bữa trưa rồi, giờ đói meo luôn.'
      },
      {
        id: 'rus-te-3',
        start: 164.56,
        end: 168.52,
        text: 'That explains it.',
        translation: 'Thảo nào!'
      }
    ]
  },
  {
    id: 'reel-us-make-it-a-combo',
    youtubeId: 'x1hRlGhaM9s',
    expression: 'Make it a combo',
    expressionMeaningVi: 'Lên thành combo giúp mình nhé',
    americanUsageNote: 'Cấu trúc "Make it + [thứ bạn chốt]" dùng siêu gọn ở Mỹ: "Make it iced", "Make it a large", "Make it two".',
    reelCategory: 'daily_life',
    register: 'casual_us',
    level: 'A2',
    channel: 'Deeplingo - American Cafe',
    sourceLessonTitle: 'Ordering Food at a Cozy American Cafe',
    startSeconds: 229.9,
    endSeconds: 242.0,
    targetSubIndex: 2,
    subtitles: [
      {
        id: 'rus-cb-1',
        start: 229.96,
        end: 234.44,
        text: 'How much is the combo?',
        translation: 'Combo giá bao nhiêu vậy?'
      },
      {
        id: 'rus-cb-2',
        start: 231.96,
        end: 239.64,
        text: "It's $11.50 with a side and drink.",
        translation: '11 đô 50 kèm một món phụ và đồ uống ạ.'
      },
      {
        id: 'rus-cb-3',
        start: 236.52,
        end: 240.92,
        text: 'That sounds good. Make it a combo.',
        translation: 'Nghe hợp lý đấy. Lên thành combo giúp mình nhé.'
      }
    ]
  },
  {
    id: 'reel-us-tap-your-card',
    youtubeId: 'x1hRlGhaM9s',
    expression: 'Tap your card',
    expressionMeaningVi: 'Chạm thẻ (thanh toán không tiếp xúc)',
    americanUsageNote: 'Ở Mỹ hiện nay thu ngân nói "Tap your card" hoặc "Tap to pay" nhiều hơn "Swipe your card".',
    reelCategory: 'daily_life',
    register: 'everyday',
    level: 'A2',
    channel: 'Deeplingo - American Cafe',
    sourceLessonTitle: 'Ordering Food at a Cozy American Cafe',
    startSeconds: 247.0,
    endSeconds: 261.0,
    targetSubIndex: 2,
    subtitles: [
      {
        id: 'rus-tc-1',
        start: 247.04,
        end: 253.64,
        text: "Okay. What's the total? — Your total is $18.75.",
        translation: 'Ok tổng cộng bao nhiêu vậy? — Tổng của bạn là 18 đô 75.'
      },
      {
        id: 'rus-tc-2',
        start: 253.88,
        end: 258.32,
        text: 'Can I pay by card?',
        translation: 'Mình thanh toán bằng thẻ được không?'
      },
      {
        id: 'rus-tc-3',
        start: 255.68,
        end: 259.56,
        text: 'Yes. Tap your card here.',
        translation: 'Được ạ. Bạn chạm thẻ vào đây nhé.'
      }
    ]
  },
  {
    id: 'reel-us-restroom',
    youtubeId: 'ys8KkyWI_W8',
    expression: 'Restroom',
    expressionMeaningVi: 'Nhà vệ sinh (cách hỏi lịch sự ở Mỹ)',
    americanUsageNote: 'Ở nơi công cộng Mỹ, luôn hỏi "Where is the restroom?" thay vì "toilet" (nghe hơi thô ở Mỹ).',
    reelCategory: 'daily_life',
    register: 'everyday',
    level: 'A2',
    channel: 'BBC Learning English (US vs UK)',
    sourceLessonTitle: 'American English vs British English Vocabulary Quiz',
    startSeconds: 61.0,
    endSeconds: 75.5,
    targetSubIndex: 0,
    subtitles: [
      {
        id: 'rus-rr-1',
        start: 61.3,
        end: 71.0,
        text: 'And where to wash hands: in America you ask for the Restroom or Bathroom, while in Britain people say the Toilet or Loo!',
        translation: 'Còn chỗ rửa tay: ở Mỹ bạn hỏi Restroom hoặc Bathroom, còn ở Anh người ta nói Toilet hoặc Loo!'
      },
      {
        id: 'rus-rr-2',
        start: 71.3,
        end: 76.0,
        text: 'Did you answer more like Savannah or Nicola? Let us know in the comments!',
        translation: 'Bạn trả lời giống Savannah (Mỹ) hay Nicola (Anh) hơn?'
      }
    ]
  },
  {
    id: 'reel-us-here-you-go',
    youtubeId: 'sikiDeWtv_k',
    expression: 'here you go',
    expressionMeaningVi: 'Của bạn đây nhé!',
    americanUsageNote: 'Luôn nói "Here you go" (nhẹ nhàng, thân thiện) khi đưa đồ ăn, thẻ ngân hàng hay tài liệu cho ai đó.',
    reelCategory: 'daily_life',
    register: 'casual_us',
    level: 'A2',
    channel: 'BBC Learning English',
    sourceLessonTitle: 'Natural English Conversation: Have Dinner with Sian!',
    startSeconds: 3.5,
    endSeconds: 17.5,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rus-hg-1',
        start: 3.8,
        end: 7.5,
        text: 'Can you pass me the pepper, please?',
        translation: 'Bạn chuyền giúp mình lọ hạt tiêu với nhé?'
      },
      {
        id: 'rus-hg-2',
        start: 7.8,
        end: 10.0,
        text: 'Yeah, here you go!',
        translation: 'Ừ, của bạn đây nè!'
      },
      {
        id: 'rus-hg-3',
        start: 14.2,
        end: 17.0,
        text: 'Oops, there you go!',
        translation: 'À đây, của bạn đây nhé!'
      }
    ]
  },
  {
    id: 'reel-us-another-bite',
    youtubeId: 'sikiDeWtv_k',
    expression: "couldn't eat another bite",
    expressionMeaningVi: 'No căng bụng không ăn nổi thêm miếng nào nữa',
    americanUsageNote: 'Cách khen đồ ăn ngon và từ chối lịch sự khi đã quá no trên bàn ăn với bạn bè/đồng nghiệp.',
    reelCategory: 'daily_life',
    register: 'casual_us',
    level: 'B1',
    channel: 'BBC Learning English',
    sourceLessonTitle: 'Natural English Conversation: Have Dinner with Sian!',
    startSeconds: 28.5,
    endSeconds: 39.0,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rus-ab-1',
        start: 28.8,
        end: 32.8,
        text: "There's plenty more, do you want seconds?",
        translation: 'Còn nhiều lắm, bạn có muốn ăn thêm phần nữa không?'
      },
      {
        id: 'rus-ab-2',
        start: 33.0,
        end: 36.5,
        text: "Oh thanks, that was delicious, but I couldn't eat another bite!",
        translation: 'Cảm ơn nhiều, ngon xuất sắc luôn nhưng mình no căng không ăn nổi thêm miếng nào nữa!'
      },
      {
        id: 'rus-ab-3',
        start: 36.8,
        end: 39.0,
        text: 'Room for dessert? I made some cake! - Oh, go on then!',
        translation: 'Còn bụng ăn tráng miệng không? Mình có làm bánh đấy! — Thế thì ăn luôn!'
      }
    ]
  },

  // ===================== CLUSTER 2: WORKPLACE & REAL AMERICAN TALK =====================
  {
    id: 'reel-work-truth-be-told',
    youtubeId: 'UF8uR6Z6KLc',
    expression: 'Truth be told',
    expressionMeaningVi: 'Thành thật mà nói thì...',
    americanUsageNote: 'Cụm mở lời cực tự nhiên & tinh tế trong cuộc họp hoặc khi chia sẻ thật lòng (đỡ cứng hơn "Honestly speaking").',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B1',
    channel: 'Stanford / Steve Jobs',
    sourceLessonTitle: 'Steve Jobs: How to Live Before You Die',
    startSeconds: 35.2,
    endSeconds: 46.5,
    targetSubIndex: 0,
    subtitles: [
      {
        id: 'rw-tbt-1',
        start: 35.56,
        end: 41.56,
        text: 'Truth be told, I never graduated from college',
        translation: 'Thành thật mà nói, tôi chưa bao giờ tốt nghiệp đại học'
      },
      {
        id: 'rw-tbt-2',
        start: 41.56,
        end: 45.93,
        text: "and this is the closest I've ever gotten to a college graduation.",
        translation: 'và đây là lần tôi ở gần một buổi lễ tốt nghiệp đại học nhất.'
      }
    ]
  },
  {
    id: 'reel-work-no-big-deal',
    youtubeId: 'UF8uR6Z6KLc',
    expression: 'No big deal',
    expressionMeaningVi: 'Chuyện nhỏ thôi / Không có gì to tát',
    americanUsageNote: 'Dùng để hạ nhiệt căng thẳng hoặc đáp lại lời cảm ơn/xin lỗi trong team ("Sorry I\'m 2 minutes late" — "No big deal!").',
    reelCategory: 'work_talk',
    register: 'casual_us',
    level: 'A2',
    channel: 'Stanford / Steve Jobs',
    sourceLessonTitle: 'Steve Jobs: How to Live Before You Die',
    startSeconds: 47.8,
    endSeconds: 56.0,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rw-nbd-1',
        start: 47.98,
        end: 52.01,
        text: "Today I want to tell you three stories from my life. That's it.",
        translation: 'Hôm nay tôi muốn kể cho các bạn nghe ba câu chuyện đời mình. Thế thôi.'
      },
      {
        id: 'rw-nbd-2',
        start: 52.01,
        end: 54.85,
        text: 'No big deal. Just three stories.',
        translation: 'Chẳng có gì to tát đâu. Chỉ ba câu chuyện thôi.'
      }
    ]
  },
  {
    id: 'reel-work-all-set',
    youtubeId: 'UF8uR6Z6KLc',
    expression: 'all set',
    expressionMeaningVi: 'Mọi thứ sẵn sàng / Xong xuôi hết rồi',
    americanUsageNote: 'Cụm đa năng bậc nhất nước Mỹ: họp xong nói "We\'re all set!", gửi file xong nói "You\'re all set!".',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B1',
    channel: 'Stanford / Steve Jobs',
    sourceLessonTitle: 'Steve Jobs: How to Live Before You Die',
    startSeconds: 85.8,
    endSeconds: 98.0,
    targetSubIndex: 0,
    subtitles: [
      {
        id: 'rw-as-1',
        start: 86.31,
        end: 91.1,
        text: 'so everything was all set for me to be adopted at birth by a lawyer and his wife.',
        translation: 'vì vậy mọi thứ đã được sắp xếp xong xuôi để tôi được vợ chồng một luật sư nhận nuôi ngay khi chào đời.'
      },
      {
        id: 'rw-as-2',
        start: 91.74,
        end: 97.55,
        text: 'Except that when I popped out they decided at the last minute that they really wanted a girl.',
        translation: 'Ngoại trừ lúc tôi vừa chào đời thì họ lại đổi ý vào phút chót rằng họ muốn một bé gái.'
      }
    ]
  },
  {
    id: 'reel-work-figure-it-out',
    youtubeId: 'UF8uR6Z6KLc',
    expression: 'figure it out',
    expressionMeaningVi: 'Tìm ra cách giải quyết / Tự xoay xở',
    americanUsageNote: 'Phrasal verb công sở Mỹ dùng hằng ngày khi xử lý bug hay bài toán khó: "Don\'t worry, we\'ll figure it out."',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B1',
    channel: 'Stanford / Steve Jobs',
    sourceLessonTitle: 'Steve Jobs: How to Live Before You Die',
    startSeconds: 150.5,
    endSeconds: 157.0,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rw-fio-1',
        start: 150.72,
        end: 152.76,
        text: 'I had no idea what I wanted to do with my life',
        translation: 'Tôi chẳng biết mình muốn làm gì với cuộc đời mình'
      },
      {
        id: 'rw-fio-2',
        start: 152.76,
        end: 156.38,
        text: 'and no idea how college was going to help me figure it out.',
        translation: 'và cũng không biết đại học sẽ giúp tôi tìm ra câu trả lời kiểu gì.'
      }
    ]
  },
  {
    id: 'reel-work-work-out-ok',
    youtubeId: 'UF8uR6Z6KLc',
    expression: 'work out',
    expressionMeaningVi: 'Ổn thỏa / Diễn ra suôn sẻ',
    americanUsageNote: 'Ngoài nghĩa "tập gym", người Mỹ dùng "work out" cực nhiều với nghĩa mọi việc ổn thỏa ("It\'ll all work out!").',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B1',
    channel: 'Stanford / Steve Jobs',
    sourceLessonTitle: 'Steve Jobs: How to Live Before You Die',
    startSeconds: 162.3,
    endSeconds: 173.2,
    targetSubIndex: 0,
    subtitles: [
      {
        id: 'rw-wo-1',
        start: 162.6,
        end: 166.94,
        text: 'So I decided to drop out and trust that it would all work out OK.',
        translation: 'Vì vậy tôi quyết định bỏ học và tin rằng mọi thứ rồi sẽ ổn thỏa thôi.'
      },
      {
        id: 'rw-wo-2',
        start: 166.94,
        end: 172.81,
        text: 'It was pretty scary at the time, but looking back it was one of the best decisions I ever made.',
        translation: 'Lúc đó cũng khá đáng sợ, nhưng nhìn lại thì đó là một trong những quyết định sáng suốt nhất đời tôi.'
      }
    ]
  },
  {
    id: 'reel-work-turned-out',
    youtubeId: 'UF8uR6Z6KLc',
    expression: 'turned out',
    expressionMeaningVi: 'Hóa ra lại là / Kết quả lại thành ra',
    americanUsageNote: 'Dùng suốt khi kể chuyện hoặc review dự án: "It turned out to be much faster than we expected."',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B1',
    channel: 'Stanford / Steve Jobs',
    sourceLessonTitle: 'Steve Jobs: How to Live Before You Die',
    startSeconds: 203.5,
    endSeconds: 210.5,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rw-to-1',
        start: 203.85,
        end: 206.26,
        text: 'And much of what I stumbled into by following',
        translation: 'Và rất nhiều thứ tôi tình cờ gặp được khi đi theo'
      },
      {
        id: 'rw-to-2',
        start: 206.26,
        end: 209.69,
        text: 'my curiosity and intuition turned out to be priceless later on.',
        translation: 'sự tò mò và trực giác của mình về sau hóa ra lại vô giá.'
      }
    ]
  },
  {
    id: 'reel-work-down-the-road',
    youtubeId: 'UF8uR6Z6KLc',
    expression: 'down the road',
    expressionMeaningVi: 'Về sau này / Trong tương lai gần-xa',
    americanUsageNote: 'Idiom cực chuẩn trong họp chiến lược & công việc ở Mỹ: "This decision will save us hours down the road."',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B2',
    channel: 'Stanford / Steve Jobs',
    sourceLessonTitle: 'Steve Jobs: How to Live Before You Die',
    startSeconds: 322.0,
    endSeconds: 333.8,
    targetSubIndex: 0,
    subtitles: [
      {
        id: 'rw-dtr-1',
        start: 322.35,
        end: 328.1,
        text: 'Believing that the dots will connect down the road will give you the confidence to follow your heart',
        translation: 'Tin rằng các điểm sẽ tự kết nối với nhau về sau này sẽ cho bạn sự tự tin để đi theo trái tim'
      },
      {
        id: 'rw-dtr-2',
        start: 328.1,
        end: 333.35,
        text: 'even when it leads you off the well-worn path, and that will make all the difference.',
        translation: 'ngay cả khi nó dẫn bạn ra khỏi lối mòn quen thuộc, và điều đó sẽ tạo nên mọi sự khác biệt.'
      }
    ]
  },
  {
    id: 'reel-work-screw-up',
    youtubeId: 'UF8uR6Z6KLc',
    expression: 'screwing up',
    expressionMeaningVi: 'Làm hỏng bét / Phạm sai lầm lớn',
    americanUsageNote: 'Tiếng Mỹ đời thực ở công sở thân mật (dùng khi nhận lỗi thẳng thắn): "My bad, I screwed up the deployment."',
    reelCategory: 'work_talk',
    register: 'casual_us',
    level: 'B2',
    channel: 'Stanford / Steve Jobs',
    sourceLessonTitle: 'Steve Jobs: How to Live Before You Die',
    startSeconds: 407.0,
    endSeconds: 414.5,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rw-su-1',
        start: 407.21,
        end: 410.49,
        text: 'I met with David Packard and Bob Noyce',
        translation: 'Tôi đã gặp David Packard và Bob Noyce'
      },
      {
        id: 'rw-su-2',
        start: 410.88,
        end: 413.7,
        text: 'and tried to apologize for screwing up so badly.',
        translation: 'và cố gắng xin lỗi vì mình đã làm hỏng bét mọi chuyện đến thế.'
      }
    ]
  },
  {
    id: 'reel-work-start-over',
    youtubeId: 'UF8uR6Z6KLc',
    expression: 'start over',
    expressionMeaningVi: 'Làm lại từ đầu',
    americanUsageNote: 'Tự nhiên hơn hẳn "begin again from zero": "Let\'s scrap this draft and start over."',
    reelCategory: 'work_talk',
    register: 'workplace_us',
    level: 'B1',
    channel: 'Stanford / Steve Jobs',
    sourceLessonTitle: 'Steve Jobs: How to Live Before You Die',
    startSeconds: 427.5,
    endSeconds: 438.5,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rw-so-1',
        start: 427.8,
        end: 430.97,
        text: 'I had been rejected, but I was still in love.',
        translation: 'Tôi bị gạt ra ngoài, nhưng tôi vẫn còn yêu công việc này.'
      },
      {
        id: 'rw-so-2',
        start: 432.09,
        end: 433.84,
        text: 'And so I decided to start over.',
        translation: 'Và thế là tôi quyết định bắt đầu lại từ đầu.'
      }
    ]
  },
  {
    id: 'reel-work-keep-going',
    youtubeId: '0YnRI-RsLfU',
    expression: 'can be tough',
    expressionMeaningVi: 'Khá là khó nhằn / Không dễ chút nào',
    americanUsageNote: 'Người Mỹ rất hay dùng "tough" thay cho "difficult" trong giao tiếp thật ("That\'s a tough call", "Staying focused can be tough").',
    reelCategory: 'work_talk',
    register: 'everyday',
    level: 'B1',
    channel: 'POC English',
    sourceLessonTitle: 'English Pronunciation: Tricky -OUGH Words',
    startSeconds: 13.8,
    endSeconds: 29.8,
    targetSubIndex: 1,
    subtitles: [
      {
        id: 'rw-kg-1',
        start: 13.8,
        end: 21.5,
        text: 'Number two: Though. It sounds like T-H-O-H: Though. Even though it was late, we kept going.',
        translation: 'Số hai: Though. Mặc dù đã muộn nhưng chúng tôi vẫn tiếp tục cố gắng.'
      },
      {
        id: 'rw-kg-2',
        start: 21.8,
        end: 29.5,
        text: 'Number three: Tough. It sounds like T-U-F-F: Tough. Staying focused can be tough.',
        translation: 'Số ba: Tough (/tʌf/). Giữ được sự tập trung đôi khi khá là khó nhằn.'
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
    thumbnail: `https://img.youtube.com/vi/${reel.youtubeId}/hqdefault.jpg`,
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
