import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUT_DIR = path.join(__dirname, '..', 'public', 'curriculum');

const WORD_ATLAS_URL = 'https://raw.githubusercontent.com/designfuchen/word-atlas/main/data/word-atlas.json';
const DNIZFOR_OXFORD_URL = 'https://raw.githubusercontent.com/dnizfor/vocabulary-flashcard-dataset/main/data/data.json';

const TOPIC_META = [
  { id: 'education', titleEn: 'Education & Learning', titleVi: 'Giáo dục & Học tập', descVi: 'Từ vựng về trường học, học thuật, nghiên cứu và phát triển kỹ năng.', color: 'teal' },
  { id: 'work', titleEn: 'Work & Employment', titleVi: 'Công việc & Sự nghiệp', descVi: 'Giao tiếp công sở, phỏng vấn, thăng tiến và môi trường làm việc.', color: 'indigo' },
  { id: 'environment', titleEn: 'Environment & Climate', titleVi: 'Môi trường & Khí hậu', descVi: 'Biến đổi khí hậu, năng lượng xanh, bảo tồn sinh thái — chủ đề tủ IELTS.', color: 'emerald' },
  { id: 'technology', titleEn: 'Technology & Digital Life', titleVi: 'Công nghệ & Đời sống số', descVi: 'AI, internet, đổi mới sáng tạo và tác động của công nghệ hiện đại.', color: 'sky' },
  { id: 'health', titleEn: 'Health & Well-being', titleVi: 'Sức khỏe & Đời sống', descVi: 'Y tế, dinh dưỡng, thể chất, sức khỏe tinh thần và lối sống lành mạnh.', color: 'rose' },
  { id: 'society', titleEn: 'Society & Community', titleVi: 'Xã hội & Cộng đồng', descVi: 'Văn hóa, bình đẳng, cộng đồng, dân số và các vấn đề xã hội hiện đại.', color: 'amber' },
  { id: 'economy', titleEn: 'Economy & Finance', titleVi: 'Kinh tế & Tài chính', descVi: 'Thị trường, đầu tư, tiêu dùng, tăng trưởng và tài chính cá nhân.', color: 'violet' },
  { id: 'government', titleEn: 'Government & Law', titleVi: 'Chính phủ & Pháp luật', descVi: 'Chính sách công, luật pháp, quyền công dân và quản trị quốc gia.', color: 'slate' },
  { id: 'media', titleEn: 'Media & Communication', titleVi: 'Truyền thông & Báo chí', descVi: 'Mạng xã hội, tin tức, quảng cáo và kỹ năng truyền đạt thông tin.', color: 'pink' },
  { id: 'science', titleEn: 'Science & Research', titleVi: 'Khoa học & Nghiên cứu', descVi: 'Phương pháp khoa học, thí nghiệm, phát minh và tư duy phản biện.', color: 'cyan' },
  { id: 'city', titleEn: 'Cities & Urbanization', titleVi: 'Đô thị & Giao thông', descVi: 'Quy hoạch thành phố, nhà ở, giao thông công cộng và đô thị hóa.', color: 'orange' },
  { id: 'travel', titleEn: 'Travel & Tourism', titleVi: 'Du lịch & Khám phá', descVi: 'Hành trình, văn hóa du lịch, khách sạn và trải nghiệm quốc tế.', color: 'teal' },
  { id: 'daily', titleEn: 'Daily Life & Routines', titleVi: 'Đời sống thường ngày', descVi: 'Sinh hoạt hàng ngày, gia đình, mua sắm và giao tiếp tự nhiên.', color: 'emerald' },
  { id: 'emotion', titleEn: 'Emotions & Mindset', titleVi: 'Cảm xúc & Tâm lý', descVi: 'Diễn tả trạng thái cảm xúc, thái độ, động lực và giao tiếp tinh tế.', color: 'rose' },
  { id: 'thinking', titleEn: 'Critical Thinking & Logic', titleVi: 'Tư duy & Lập luận', descVi: 'Phân tích, đánh giá, so sánh, bảo vệ quan điểm cho IELTS Writing/Speaking.', color: 'indigo' },
  { id: 'arts', titleEn: 'Arts & Culture', titleVi: 'Nghệ thuật & Văn hóa', descVi: 'Âm nhạc, điện ảnh, văn học, di sản văn hóa và sáng tạo nghệ thuật.', color: 'purple' },
  { id: 'nature', titleEn: 'Nature & Wildlife', titleVi: 'Thiên nhiên & Hoang dã', descVi: 'Hệ sinh thái, động thực vật, địa lý và tài nguyên thiên nhiên.', color: 'lime' },
  { id: 'sport', titleEn: 'Sports & Fitness', titleVi: 'Thể thao & Rèn luyện', descVi: 'Thi đấu, tinh thần đồng đội, kỷ luật và rèn luyện thể lực.', color: 'sky' },
  { id: 'history', titleEn: 'History & Heritage', titleVi: 'Lịch sử & Di sản', descVi: 'Các mốc lịch sử, truyền thống, tiến bộ nhân loại và bảo tồn văn hóa.', color: 'amber' }
];

const CEFR_VOCAB_META = [
  { id: 'a1', cefr: 'A1', titleVi: 'Từ vựng cơ bản A1', descVi: 'Nền tảng giao tiếp sinh tồn — những từ tiếng Anh thông dụng nhất hàng ngày.', limit: 300 },
  { id: 'a2', cefr: 'A2', titleVi: 'Từ vựng sơ cấp A2', descVi: 'Mở rộng diễn đạt đời sống, công việc cơ bản và du lịch tự tin.', limit: 300 },
  { id: 'b1', cefr: 'B1', titleVi: 'Từ vựng trung cấp B1', descVi: 'Giao tiếp độc lập, trình bày quan điểm và đạt nền IELTS 5.5–6.0.', limit: 300 },
  { id: 'b2', cefr: 'B2', titleVi: 'Từ vựng trung cao cấp B2', descVi: 'Từ vựng công sở chuyên nghiệp & học thuật cho mục tiêu IELTS 6.5–7.0.', limit: 300 },
  { id: 'c1', cefr: 'C1', titleVi: 'Từ vựng cao cấp C1', descVi: 'Diễn đạt sắc bén, chính xác và tự nhiên như bản xứ — IELTS 7.5–8.0.', limit: 300 },
  { id: 'c2', cefr: 'C2', titleVi: 'Từ vựng tinh thông C2', descVi: 'Sắc thái học thuật & ngôn từ tinh tế ở bậc cao nhất — IELTS 8.5+.', limit: 200 }
];

const CEFR_RANK = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
const LESSON_SIZE = 10;

async function fetchJson(url) {
  console.log(`Downloading ${url}...`);
  const res = await fetch(url, { headers: { 'User-Agent': 'Aura-Learning-Curriculum-Builder/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.json();
}

function stripNonEnglishCol(rawCol) {
  if (!rawCol || typeof rawCol !== 'string') return '';
  return rawCol.split(/[｜|]/)[0].trim();
}

async function translateBatchGtx(texts) {
  if (!texts.length) return [];
  const results = new Array(texts.length).fill('');
  const BATCH_SIZE = 35;

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const slice = texts.slice(i, i + BATCH_SIZE);
    const joined = slice.map((t) => String(t).replace(/\r?\n/g, ' ').trim()).join('\n');
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(joined)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const data = await res.json();
        const fullTranslated = Array.isArray(data?.[0])
          ? data[0].map((seg) => (Array.isArray(seg) ? seg[0] : '')).join('')
          : '';
        const lines = fullTranslated.split('\n');
        for (let j = 0; j < slice.length; j++) {
          results[i + j] = (lines[j] || '').trim();
        }
      }
    } catch (err) {
      console.warn(`Batch translate warning at offset ${i}:`, err.message);
    }
    if (i + BATCH_SIZE < texts.length) {
      await new Promise((r) => setTimeout(r, 140));
    }
  }
  return results;
}

function buildLessonsFromWords(unitId, words) {
  const lessons = [];
  for (let i = 0; i < words.length; i += LESSON_SIZE) {
    const chunk = words.slice(i, i + LESSON_SIZE);
    const lessonNum = Math.floor(i / LESSON_SIZE) + 1;
    const padded = String(lessonNum).padStart(2, '0');
    lessons.push({
      id: `${unitId}-l${padded}`,
      lessonNumber: lessonNum,
      title: `Bài ${padded}`,
      wordCount: chunk.length,
      words: chunk
    });
  }
  return lessons;
}

// Structured CEFR Grammar Syllabus (A1 -> C2, 60 core lessons total = 10 per level)
function buildGrammarCurriculum() {
  const mkEx = (question, options, correctAnswer, explanationVi) => ({
    question,
    options,
    correctAnswer,
    explanationVi
  });

  const grammarByLevel = {
    a1: {
      id: 'grammar-a1',
      cefr: 'A1',
      titleVi: 'Nền tảng câu tiếng Anh (A1)',
      descVi: 'Nhận diện thành phần câu, động từ to be, các thì cơ bản và cấu trúc sinh hoạt hàng ngày.',
      lessons: [
        {
          id: 'gr-a1-01',
          lessonNumber: 1,
          category: 'Từ loại',
          title: 'To be & Subject Pronouns',
          titleVi: 'Động từ To be & Đại từ nhân xưng',
          cefr: 'A1',
          formula: 'I am · You/We/They are · He/She/It is + Noun/Adj',
          explanationVi: 'Dùng động từ "to be" để giới thiệu tên, nghề nghiệp, trạng thái, tuổi tác và vị trí. Trong tiếng Anh, câu miêu tả tính từ BẮT BUỘC phải có động từ "to be".',
          ieltsTipVi: 'Lỗi mất điểm phổ biến nhất ở IELTS Speaking Part 1 là thiếu "is/are" trước tính từ (VD nói "My city very crowded" thay vì "My city is very crowded").',
          examples: [
            { en: 'She is a software engineer from Hanoi.', vi: 'Cô ấy là một kỹ sư phần mềm đến từ Hà Nội.' },
            { en: 'They are ready for the morning meeting.', vi: 'Họ đã sẵn sàng cho cuộc họp buổi sáng.' }
          ],
          commonMistake: {
            wrong: 'My hometown very peaceful.',
            right: 'My hometown is very peaceful.',
            whyVi: 'Trước tính từ "peaceful" bắt buộc phải có động từ to be "is".'
          },
          exercises: [
            mkEx('My parents ___ both teachers at a local school.', ['is', 'are', 'am', 'be'], 1, '"My parents" là chủ ngữ số nhiều nên đi với "are".'),
            mkEx('___ this seat taken?', ['Are', 'Am', 'Is', 'Be'], 2, '"This seat" là danh từ số ít nên dùng "Is".'),
            mkEx('I ___ really excited about the new project.', ['is', 'are', 'be', 'am'], 3, 'Chủ ngữ "I" luôn đi với "am".'),
            mkEx('Chọn câu đúng ngữ pháp:', ['The coffee very hot.', 'The coffee is very hot.', 'The coffee are very hot.', 'The coffee be hot.'], 1, 'Cần động từ to be "is" trước tính từ "very hot".')
          ]
        },
        {
          id: 'gr-a1-02',
          lessonNumber: 2,
          category: 'Thì cơ bản',
          title: 'Present Simple (Habits & Facts)',
          titleVi: 'Thì Hiện tại đơn (Thói quen & Sự thật)',
          cefr: 'A1',
          formula: 'S + V(s/es) · Do/Does + S + V(inf)?',
          explanationVi: 'Diễn tả thói quen lặp lại, lịch trình cố định và sự thật hiển nhiên. Nhớ thêm "-s/-es" cho ngôi thứ 3 số ít (He/She/It).',
          ieltsTipVi: 'Thì Hiện tại đơn chiếm hơn 60% câu trả lời IELTS Speaking Part 1 (hỏi về công việc, sở thích, thói quen hàng ngày).',
          examples: [
            { en: 'I usually drink black coffee before work.', vi: 'Tôi thường uống cà phê đen trước giờ làm.' },
            { en: 'Does she commute by train every day?', vi: 'Cô ấy có đi làm bằng tàu mỗi ngày không?' }
          ],
          commonMistake: {
            wrong: 'He don’t like crowded places.',
            right: 'He doesn’t like crowded places.',
            whyVi: 'Chủ ngữ "He" (ngôi thứ 3 số ít) phải dùng trợ động từ "doesn’t".'
          },
          exercises: [
            mkEx('She ___ to the gym three times a week.', ['go', 'goes', 'going', 'is go'], 1, 'Chủ ngữ "She" ở hiện tại đơn thêm "-es" -> "goes".'),
            mkEx('___ you work from home on Fridays?', ['Does', 'Are', 'Do', 'Is'], 2, 'Câu hỏi với động từ thường "work" và chủ ngữ "you" dùng "Do".'),
            mkEx('Water ___ at 100 degrees Celsius.', ['boil', 'boils', 'is boiling', 'boiling'], 1, 'Sự thật hiển nhiên dùng hiện tại đơn -> "boils".'),
            mkEx('My brother ___ eat seafood.', ['don’t', 'isn’t', 'doesn’t', 'not'], 2, 'Phủ định với chủ ngữ số ít "My brother" dùng "doesn’t".')
          ]
        },
        {
          id: 'gr-a1-03',
          lessonNumber: 3,
          category: 'Thì cơ bản',
          title: 'Present Continuous (Actions Now)',
          titleVi: 'Thì Hiện tại tiếp diễn',
          cefr: 'A1',
          formula: 'S + am/is/are + V-ing',
          explanationVi: 'Dùng cho hành động đang diễn ra ngay lúc nói hoặc kế hoạch tạm thời trong giai đoạn hiện tại (this week, these days).',
          ieltsTipVi: 'Rất hiệu quả khi miêu tả xu hướng đang thay đổi trong IELTS Speaking & Writing: "More people are working remotely these days."',
          examples: [
            { en: 'I am preparing for my IELTS exam this month.', vi: 'Tháng này tôi đang ôn thi IELTS.' },
            { en: 'They are discussing the budget right now.', vi: 'Họ đang thảo luận về ngân sách ngay lúc này.' }
          ],
          commonMistake: {
            wrong: 'I am knowing the answer.',
            right: 'I know the answer.',
            whyVi: 'Động từ chỉ trạng thái nhận thức ("know", "believe", "want") không chia tiếp diễn.'
          },
          exercises: [
            mkEx('Listen! Someone ___ at the door.', ['knocks', 'is knocking', 'knock', 'knocked'], 1, 'Dấu hiệu "Listen!" chỉ hành động đang diễn ra ngay lúc nói.'),
            mkEx('We ___ a new app this quarter.', ['develop', 'are developing', 'develops', 'developing'], 1, 'Hành động tạm thời trong giai đoạn hiện tại ("this quarter").'),
            mkEx('She ___ right now, so please leave a message.', ['is driving', 'drives', 'drive', 'drove'], 0, '"right now" -> Hiện tại tiếp diễn.'),
            mkEx('Câu nào SAI ngữ pháp?', ['I am studying English.', 'She is cooking dinner.', 'He is wanting a new laptop.', 'They are waiting outside.'], 2, '"want" là động từ trạng thái, không chia V-ing.')
          ]
        },
        {
          id: 'gr-a1-04',
          lessonNumber: 4,
          category: 'Danh từ',
          title: 'Articles: A, An, The & Zero Article',
          titleVi: 'Mạo từ A / An / The',
          cefr: 'A1',
          formula: 'a + phụ âm · an + nguyên âm (âm) · the + đã xác định',
          explanationVi: 'Dùng "a/an" khi nhắc lần đầu với danh từ đếm được số ít; dùng "the" khi cả người nói và người nghe đều biết rõ đối tượng; không dùng mạo từ trước danh từ số nhiều nói chung.',
          ieltsTipVi: 'Dùng sai a/an/the là lỗi mất điểm ngữ pháp phổ biến số 1 của người Việt khi viết IELTS Writing.',
          examples: [
            { en: 'It takes an hour to get to the airport.', vi: 'Mất một tiếng để đi tới sân bay.' },
            { en: 'Education plays a vital role in society.', vi: 'Giáo dục đóng vai trò thiết yếu trong xã hội.' }
          ],
          commonMistake: {
            wrong: 'She works at a university in the Vietnam.',
            right: 'She works at a university in Vietnam.',
            whyVi: 'Trước tên hầu hết các quốc gia (Vietnam, Japan) không dùng "the"; "university" đọc âm đầu /j/ nên dùng "a".'
          },
          exercises: [
            mkEx('He is ___ honest person.', ['a', 'an', 'the', 'Ø'], 1, '"honest" có âm "h" câm, bắt đầu bằng nguyên âm /ɒ/ -> dùng "an".'),
            mkEx('Can you close ___ window next to you?', ['a', 'an', 'the', 'Ø'], 2, 'Cửa sổ đã được xác định rõ ("next to you") -> dùng "the".'),
            mkEx('She wants to study at ___ university in London.', ['a', 'an', 'the', 'Ø'], 0, '"university" bắt đầu bằng phụ âm /j/ -> dùng "a".'),
            mkEx('___ technology has changed how we communicate.', ['A', 'An', 'The', 'Ø (Không dùng)'], 3, 'Danh từ không đếm được nói chung không dùng mạo từ.')
          ]
        },
        {
          id: 'gr-a1-05',
          lessonNumber: 5,
          category: 'Cấu trúc cơ bản',
          title: 'There is / There are',
          titleVi: 'Cấu trúc diễn tả sự tồn tại (There is / are)',
          cefr: 'A1',
          formula: 'There is + N(ít / không đếm được) · There are + N(nhiều)',
          explanationVi: 'Dùng "There is / There are" để nói "có cái gì ở đâu". Tuyệt đối không dùng "Have" để mở đầu câu kiểu tiếng Việt ("In my city have many parks").',
          ieltsTipVi: 'Nâng cấp cho IELTS: thay "There are many..." bằng "There is a wide range of..." hoặc "There are numerous...".',
          examples: [
            { en: 'There is a cozy coffee shop near my office.', vi: 'Có một quán cà phê ấm cúng gần văn phòng tôi.' },
            { en: 'There are several reasons for this trend.', vi: 'Có một vài lý do cho xu hướng này.' }
          ],
          commonMistake: {
            wrong: 'In Hanoi have many ancient temples.',
            right: 'There are many ancient temples in Hanoi.',
            whyVi: 'Không dịch word-by-word "có" thành "have" đứng đầu câu; phải dùng "There are".'
          },
          exercises: [
            mkEx('___ a lot of traffic in the city center today.', ['There are', 'There is', 'Have', 'It has'], 1, '"traffic" là danh từ không đếm được -> dùng "There is".'),
            mkEx('___ three cafés on this street.', ['There is', 'Have', 'There are', 'They are'], 2, '"three cafés" là số nhiều -> "There are".'),
            mkEx('Is ___ any milk left in the fridge?', ['it', 'here', 'there', 'they'], 2, 'Câu hỏi tồn tại dùng "Is there...?"'),
            mkEx('Chọn câu đúng:', ['Here have two problems.', 'There are two main problems.', 'It has two problems.', 'There is two problems.'], 1, 'Dùng "There are" cho danh từ số nhiều "two main problems".')
          ]
        },
        {
          id: 'gr-a1-06',
          lessonNumber: 6,
          category: 'Giới từ',
          title: 'Prepositions of Time: In, On, At',
          titleVi: 'Giới từ chỉ thời gian (In / On / At)',
          cefr: 'A1',
          formula: 'at (giờ, dịp) · on (ngày, thứ) · in (tháng, năm, mùa, buổi)',
          explanationVi: 'Quy tắc kim tự tháp ngược: AT cho mốc hẹp nhất (7:30, night, noon), ON cho ngày cụ thể (Monday, May 5th), IN cho khoảng rộng (July, 2026, the morning).',
          ieltsTipVi: 'Cực kỳ quan trọng trong IELTS Listening Part 1 (nghe điền ngày giờ) và IELTS Writing Task 1 (mô tả số liệu theo năm/tháng).',
          examples: [
            { en: 'The flight departs at 8:15 on Friday morning.', vi: 'Chuyến bay khởi hành lúc 8:15 sáng thứ Sáu.' },
            { en: 'Sales rose sharply in 2025.', vi: 'Doanh số tăng mạnh vào năm 2025.' }
          ],
          commonMistake: {
            wrong: 'I was born in May 3rd.',
            right: 'I was born on May 3rd.',
            whyVi: 'Có ngày cụ thể (May 3rd) luôn dùng "on", chỉ có tháng (May) mới dùng "in".'
          },
          exercises: [
            mkEx('The meeting starts ___ 9:00 AM.', ['in', 'on', 'at', 'to'], 2, 'Giờ cụ thể luôn dùng "at".'),
            mkEx('We usually travel ___ the summer.', ['at', 'on', 'in', 'by'], 2, 'Mùa trong năm dùng "in".'),
            mkEx('Her birthday is ___ October 12th.', ['in', 'on', 'at', 'from'], 1, 'Ngày + tháng cụ thể dùng "on".'),
            mkEx('He likes to read ___ night before sleeping.', ['in', 'on', 'at', 'for'], 2, 'Cụm cố định "at night".')
          ]
        },
        {
          id: 'gr-a1-07',
          lessonNumber: 7,
          category: 'Động từ khuyết thiếu',
          title: 'Can / Can’t (Ability & Permission)',
          titleVi: 'Động từ khuyết thiếu Can / Can’t',
          cefr: 'A1',
          formula: 'S + can / can’t + V(nguyên mẫu không "to")',
          explanationVi: 'Dùng "can" để nói về khả năng làm gì, xin phép lịch sự hoặc đề nghị giúp đỡ. Sau "can" động từ LUÔN giữ nguyên mẫu không chia.',
          ieltsTipVi: 'Trong Speaking, dùng "can" kèm trạng từ ("can easily", "can barely") giúp câu nghe tự nhiên hơn nhiều.',
          examples: [
            { en: 'Can I pay by credit card here?', vi: 'Tôi có thể thanh toán bằng thẻ tín dụng ở đây không?' },
            { en: 'She can speak three languages fluently.', vi: 'Cô ấy có thể nói trôi chảy ba ngoại ngữ.' }
          ],
          commonMistake: {
            wrong: 'He can to swim very fast.',
            right: 'He can swim very fast.',
            whyVi: 'Sau động từ khuyết thiếu "can" không dùng "to".'
          },
          exercises: [
            mkEx('She ___ play the piano very well.', ['can to', 'cans', 'can', 'is can'], 2, '"can" không chia "-s" và không thêm "to".'),
            mkEx('___ you help me carry this box?', ['Can', 'Are', 'Do', 'Have'], 0, 'Lời nhờ vả dùng "Can you + V?".'),
            mkEx('I’m sorry, I ___ attend the call today.', ['can’t to', 'don’t can', 'can’t', 'not can'], 2, 'Phủ định của "can" là "can’t / cannot".'),
            mkEx('After "can", the verb must be in:', ['V-ing form', 'base form (V-inf)', 'past form', 'to-infinitive'], 1, 'Sau modal verb luôn là động từ nguyên mẫu không to.')
          ]
        },
        {
          id: 'gr-a1-08',
          lessonNumber: 8,
          category: 'Danh từ & Lượng từ',
          title: 'Countable vs Uncountable (Some / Any / Much / Many)',
          titleVi: 'Danh từ đếm được & Không đếm được',
          cefr: 'A1',
          formula: 'many + N(đếm được số nhiều) · much + N(không đếm được)',
          explanationVi: 'Danh từ không đếm được phổ biến (information, advice, furniture, equipment, money, time) KHÔNG có dạng số nhiều và đi với "much / a little".',
          ieltsTipVi: 'Giám khảo IELTS cực kỳ để ý các danh từ không đếm được hay bị thêm "s" sai: informations ❌, advices ❌, equipments ❌.',
          examples: [
            { en: 'She gave me some really useful advice.', vi: 'Cô ấy đã cho tôi vài lời khuyên rất hữu ích.' },
            { en: 'How much time do we have left?', vi: 'Chúng ta còn lại bao nhiêu thời gian?' }
          ],
          commonMistake: {
            wrong: 'I need many informations about the course.',
            right: 'I need a lot of information about the course.',
            whyVi: '"information" là danh từ không đếm được -> không thêm "-s" và không dùng "many".'
          },
          exercises: [
            mkEx('How ___ cups of coffee do you drink a day?', ['much', 'many', 'a little', 'any'], 1, '"cups" đếm được số nhiều -> dùng "many".'),
            mkEx('We don’t have ___ sugar left.', ['many', 'some', 'any', 'a'], 2, 'Câu phủ định dùng "any".'),
            mkEx('He gave me a useful piece of ___.', ['advices', 'advice', 'advise', 'advises'], 1, '"advice" không đếm được -> không thêm "-s".'),
            mkEx('How ___ money does this ticket cost?', ['many', 'few', 'much', 'several'], 2, '"money" là danh từ không đếm được -> dùng "much".')
          ]
        },
        {
          id: 'gr-a1-09',
          lessonNumber: 9,
          category: 'Thì cơ bản',
          title: 'Past Simple (Completed Past Actions)',
          titleVi: 'Thì Quá khứ đơn',
          cefr: 'A1',
          formula: 'S + V2/ed · Did + S + V(inf)?',
          explanationVi: 'Diễn tả hành động đã xảy ra và kết thúc hoàn toàn tại một thời điểm xác định trong quá khứ (yesterday, last week, in 2022).',
          ieltsTipVi: 'Bắt buộc làm chủ để kể chuyện mượt mà trong IELTS Speaking Part 2 (Describe a memorable trip / experience).',
          examples: [
            { en: 'We visited Da Nang last summer and loved the food.', vi: 'Mùa hè năm ngoái chúng tôi đã thăm Đà Nẵng và rất thích đồ ăn.' },
            { en: 'Did you finish the report yesterday?', vi: 'Hôm qua bạn đã hoàn thành báo cáo chưa?' }
          ],
          commonMistake: {
            wrong: 'Did you went to the concert last night?',
            right: 'Did you go to the concert last night?',
            whyVi: 'Đã mượn trợ động từ "Did" thì động từ chính "go" phải quay về nguyên mẫu.'
          },
          exercises: [
            mkEx('I ___ my old friend at the café yesterday.', ['meet', 'met', 'meeting', 'meets'], 1, 'Quá khứ bất quy tắc của "meet" là "met".'),
            mkEx('She didn’t ___ the email on time.', ['received', 'receives', 'receive', 'receiving'], 2, 'Sau "didn’t" dùng động từ nguyên mẫu "receive".'),
            mkEx('___ they enjoy the movie last weekend?', ['Do', 'Were', 'Did', 'Have'], 2, 'Câu hỏi quá khứ đơn với động từ thường dùng "Did".'),
            mkEx('In 2020, many companies ___ to remote work.', ['shift', 'shifted', 'shifting', 'shifts'], 1, 'Mốc thời gian quá khứ xác định "In 2020" -> quá khứ đơn.')
          ]
        },
        {
          id: 'gr-a1-10',
          lessonNumber: 10,
          category: 'Câu hỏi',
          title: 'Wh- Questions & Word Order',
          titleVi: 'Câu hỏi có từ để hỏi (Wh- Questions)',
          cefr: 'A1',
          formula: 'Wh-word + Aux (do/does/did/is/can) + S + V?',
          explanationVi: 'Khi đặt câu hỏi, trợ động từ LUÔN đảo lên trước chủ ngữ: "Where do you live?" chứ không nói "Where you live?".',
          ieltsTipVi: 'Giúp bạn phản xạ hỏi lại tự nhiên trong giao tiếp thực tế và AI Roleplay mà không bị nói câu trần thuật lên giọng.',
          examples: [
            { en: 'How long does it take to get to the station?', vi: 'Mất bao lâu để đi tới nhà ga?' },
            { en: 'What kind of music do you listen to?', vi: 'Bạn hay nghe thể loại nhạc nào?' }
          ],
          commonMistake: {
            wrong: 'Where you did buy that jacket?',
            right: 'Where did you buy that jacket?',
            whyVi: 'Trợ động từ "did" phải đứng ngay sau "Where" và trước chủ ngữ "you".'
          },
          exercises: [
            mkEx('Where ___ your sister live?', ['do', 'does', 'is', 'are'], 1, '"your sister" số ít + động từ thường "live" -> dùng "does".'),
            mkEx('Why ___ you leave the party early yesterday?', ['do', 'were', 'did', 'have'], 2, 'Quá khứ đơn với động từ thường "leave" -> "did".'),
            mkEx('___ far is it from here to the airport?', ['What', 'Where', 'How', 'Which'], 2, 'Hỏi khoảng cách dùng "How far".'),
            mkEx('Chọn câu hỏi đúng trật tự từ:', ['What time starts the movie?', 'What time the movie starts?', 'What time does the movie start?', 'What time is start the movie?'], 2, 'Wh-word + does + S + V(inf).')
          ]
        }
      ]
    },
    a2: {
      id: 'grammar-a2',
      cefr: 'A2',
      titleVi: 'Mở rộng diễn đạt sơ cấp (A2)',
      descVi: 'Nói về tương lai, so sánh, kinh nghiệm sống (Present Perfect) và động từ khuyết thiếu.',
      lessons: [
        {
          id: 'gr-a2-01', lessonNumber: 1, category: 'Tương lai', title: 'Will vs Be Going To', titleVi: 'Tương lai: Will và Be going to', cefr: 'A2',
          formula: 'S + will + V(inf) · S + am/is/are going to + V(inf)',
          explanationVi: 'Dùng "be going to" cho dự định đã lên kế hoạch trước hoặc dự đoán có bằng chứng rõ; dùng "will" cho quyết định tức thì ngay lúc nói hoặc lời hứa.',
          ieltsTipVi: 'Khi giám khảo hỏi về kế hoạch tương lai ở Speaking Part 1/3, dùng "I’m planning to / I’m going to" tự nhiên hơn dùng toàn "will".',
          examples: [{ en: 'I’m going to take the IELTS exam in October.', vi: 'Tôi dự định sẽ thi IELTS vào tháng Mười.' }, { en: 'Hold on, I’ll grab a pen and write that down.', vi: 'Chờ chút, tôi sẽ lấy bút ghi lại ngay.' }],
          commonMistake: { wrong: 'I going to visit Japan next year.', right: 'I am going to visit Japan next year.', whyVi: 'Không được quên động từ to be (am/is/are) trước "going to".' },
          exercises: [
            mkEx('Look at those dark clouds! It ___ rain.', ['will', 'is going to', 'rains', 'rained'], 1, 'Dự đoán có bằng chứng rõ trước mắt -> dùng "is going to".'),
            mkEx('“The phone is ringing.” — “Don’t worry, I ___ get it.”', ['am going to', 'will', 'get', 'got'], 1, 'Quyết định tức thì tại thời điểm nói -> dùng "will".'),
            mkEx('We ___ move to a bigger office next month. Everything is signed.', ['are going to', 'will to', 'go to', 'moved'], 0, 'Kế hoạch đã chuẩn bị sẵn -> "are going to".'),
            mkEx('She promises she ___ be late again.', ['isn’t going', 'won’t', 'doesn’t', 'not will'], 1, 'Lời hứa dùng "will / won’t".')
          ]
        },
        {
          id: 'gr-a2-02', lessonNumber: 2, category: 'So sánh', title: 'Comparatives & Superlatives', titleVi: 'So sánh hơn & So sánh nhất', cefr: 'A2',
          formula: 'adj-er / more + adj + than · the adj-est / the most + adj',
          explanationVi: 'Tính từ ngắn (1 âm tiết) thêm "-er / -est"; tính từ dài (≥ 2 âm tiết) dùng "more / the most". Nhớ các dạng bất quy tắc: good → better → best, bad → worse → worst.',
          ieltsTipVi: 'Cấu trúc cốt lõi của IELTS Writing Task 1 khi so sánh biểu đồ (VD: "significantly higher than", "the most popular choice").',
          examples: [{ en: 'Public transport is much cheaper than owning a car.', vi: 'Giao thông công cộng rẻ hơn nhiều so với việc sở hữu ô tô.' }, { en: 'That was the most challenging interview I’ve ever had.', vi: 'Đó là buổi phỏng vấn thử thách nhất tôi từng trải qua.' }],
          commonMistake: { wrong: 'This route is more faster than the highway.', right: 'This route is faster than the highway.', whyVi: 'Không dùng kép cả "more" lẫn đuôi "-er".' },
          exercises: [
            mkEx('Living in the suburbs is ___ than living downtown.', ['peacefuler', 'more peaceful', 'most peaceful', 'peaceful'], 1, 'Tính từ dài "peaceful" dùng "more peaceful".'),
            mkEx('This is ___ restaurant in the neighborhood.', ['better', 'the goodest', 'the best', 'best'], 2, 'So sánh nhất của "good" là "the best".'),
            mkEx('Traffic today is much ___ than yesterday.', ['badder', 'more bad', 'worse', 'worst'], 2, 'So sánh hơn của "bad" là "worse".'),
            mkEx('Online courses are often ___ flexible than traditional classes.', ['more', 'most', 'very', 'as'], 0, 'Có "than" -> so sánh hơn "more flexible".')
          ]
        },
        {
          id: 'gr-a2-03', lessonNumber: 3, category: 'Thì quan trọng', title: 'Present Perfect (Experience & Result)', titleVi: 'Thì Hiện tại hoàn thành', cefr: 'A2',
          formula: 'S + have/has + V3/ed (ever, never, already, yet, since, for)',
          explanationVi: 'Kết nối quá khứ với hiện tại: nói về trải nghiệm sống (không rõ thời điểm), hành động bắt đầu trong quá khứ kéo dài tới nay, hoặc kết quả còn rõ ở hiện tại.',
          ieltsTipVi: 'Không dùng Present Perfect với mốc thời gian quá khứ đã đóng (yesterday, in 2021) — đó là bẫy ngữ pháp số 1 ở bài thi IELTS.',
          examples: [{ en: 'I have lived in Ho Chi Minh City for five years.', vi: 'Tôi đã sống ở TP.HCM được 5 năm rồi.' }, { en: 'Have you ever worked with an international team?', vi: 'Bạn đã bao giờ làm việc với đội ngũ quốc tế chưa?' }],
          commonMistake: { wrong: 'I have graduated from university in 2023.', right: 'I graduated from university in 2023.', whyVi: 'Có mốc thời gian cụ thể đã kết thúc ("in 2023") -> bắt buộc dùng Quá khứ đơn.' },
          exercises: [
            mkEx('She ___ in this company since 2022.', ['works', 'worked', 'has worked', 'is working'], 2, 'Có "since + mốc thời gian" -> Hiện tại hoàn thành.'),
            mkEx('Have you finished the presentation ___?', ['already', 'yet', 'ever', 'since'], 1, '"yet" đứng cuối câu hỏi và câu phủ định.'),
            mkEx('We ___ three new clients this week.', ['sign', 'have signed', 'signed ago', 'are signing'], 1, 'Khoảng thời gian chưa kết thúc ("this week") -> Hiện tại hoàn thành.'),
            mkEx('I ___ to Paris twice.', ['have been', 'went yesterday', 'am going', 'was been'], 0, 'Kinh nghiệm sống không nêu mốc thời gian -> "have been".')
          ]
        },
        {
          id: 'gr-a2-04', lessonNumber: 4, category: 'Động từ khuyết thiếu', title: 'Should / Must / Have to', titleVi: 'Lời khuyên & Nghĩa vụ (Should / Must / Have to)', cefr: 'A2',
          formula: 'should (nên) · must (bắt buộc chủ quan) · have to (quy định bên ngoài)',
          explanationVi: '"Should" đưa ra lời khuyên; "mustn’t" là CẤM không được làm, còn "don’t have to" là KHÔNG CẦN THIẾT phải làm (nhưng làm cũng không sao).',
          ieltsTipVi: 'Rất hay dùng trong phần kết luận IELTS Writing Task 2 để đề xuất giải pháp ("Governments should invest in...").',
          examples: [{ en: 'You don’t have to wear a suit on casual Fridays.', vi: 'Bạn không cần phải mặc vest vào thứ Sáu thoải mái đâu.' }, { en: 'Passengers mustn’t smoke inside the cabin.', vi: 'Hành khách bị cấm hút thuốc trong khoang máy bay.' }],
          commonMistake: { wrong: 'You mustn’t pay — entry is free!', right: 'You don’t have to pay — entry is free!', whyVi: 'Miễn phí nghĩa là "không cần trả" (don’t have to), không phải "bị cấm trả" (mustn’t).' },
          exercises: [
            mkEx('It’s free to enter the museum. You ___ buy a ticket.', ['mustn’t', 'don’t have to', 'shouldn’t', 'can’t'], 1, 'Không cần thiết -> "don’t have to".'),
            mkEx('You look exhausted. You ___ get some rest.', ['should', 'have', 'mustn’t', 'need'], 0, 'Đưa ra lời khuyên -> "should".'),
            mkEx('Drivers ___ use their phones while driving. It’s illegal.', ['don’t have to', 'mustn’t', 'needn’t', 'should'], 1, 'Cấm theo luật -> "mustn’t".'),
            mkEx('Does he ___ work overtime this weekend?', ['must', 'should', 'have to', 'has to'], 2, 'Sau "Does" dùng nguyên mẫu "have to".')
          ]
        },
        {
          id: 'gr-a2-05', lessonNumber: 5, category: 'Thì quá khứ', title: 'Past Continuous & When/While', titleVi: 'Quá khứ tiếp diễn & Hành động cắt ngang', cefr: 'A2',
          formula: 'S + was/were + V-ing + when + S + V2/ed',
          explanationVi: 'Dùng Quá khứ tiếp diễn cho hành động nền đang diễn ra tại 1 thời điểm quá khứ, và Quá khứ đơn cho hành động ngắn bất ngờ cắt ngang.',
          ieltsTipVi: 'Mở bài Speaking Part 2 cực mượt: "I was walking back from work when I suddenly ran into..."',
          examples: [{ en: 'I was having dinner when the power went out.', vi: 'Tôi đang ăn tối thì mất điện.' }, { en: 'While she was presenting, the projector froze.', vi: 'Trong khi cô ấy đang thuyết trình, máy chiếu bị đứng hình.' }],
          commonMistake: { wrong: 'While I walked home, I saw an accident.', right: 'While I was walking home, I saw an accident.', whyVi: 'Hành động kéo dài sau "While" chia Quá khứ tiếp diễn.' },
          exercises: [
            mkEx('They ___ football when it started to pour.', ['played', 'were playing', 'play', 'are playing'], 1, 'Hành động đang diễn ra bị cắt ngang -> "were playing".'),
            mkEx('What ___ you doing at 9 PM last night?', ['did', 'was', 'were', 'are'], 2, 'Chủ ngữ "you" đi với "were".'),
            mkEx('I broke my glass while I ___ the dishes.', ['washed', 'was washing', 'wash', 'am washing'], 1, 'Sau "while" chỉ hành động nền -> "was washing".'),
            mkEx('He ___ asleep while watching the documentary.', ['fell', 'was falling', 'falls', 'falling'], 0, 'Hành động ngắn xảy ra -> Quá khứ đơn "fell".')
          ]
        },
        {
          id: 'gr-a2-06', lessonNumber: 6, category: 'Mẫu động từ', title: 'Gerunds (V-ing) vs Infinitives (To-V)', titleVi: 'Danh động từ (V-ing) & Động từ nguyên mẫu (To-V)', cefr: 'A2',
          formula: 'enjoy/avoid/suggest + V-ing · decide/want/plan + to V',
          explanationVi: 'Một số động từ theo sau bằng V-ing (enjoy, avoid, finish, mind, suggest), nhóm khác đi với to-V (decide, hope, agree, manage, afford). Sau giới từ LUÔN là V-ing.',
          ieltsTipVi: 'Cụm ghi điểm Writing/Speaking: "look forward to + V-ing", "be interested in + V-ing", "avoid + V-ing".',
          examples: [{ en: 'I really enjoy practicing English with real videos.', vi: 'Tôi rất thích luyện tiếng Anh qua video thực tế.' }, { en: 'She decided to apply for a scholarship abroad.', vi: 'Cô ấy quyết định nộp đơn xin học bổng du học.' }],
          commonMistake: { wrong: 'I look forward to hear from you.', right: 'I look forward to hearing from you.', whyVi: '"to" trong "look forward to" là giới từ -> bắt buộc dùng V-ing.' },
          exercises: [
            mkEx('Would you mind ___ the window?', ['to open', 'open', 'opening', 'opened'], 2, '"mind + V-ing".'),
            mkEx('We decided ___ the launch until next Monday.', ['postponing', 'to postpone', 'postpone', 'postponed'], 1, '"decide + to V".'),
            mkEx('She is interested in ___ graphic design.', ['learn', 'to learn', 'learning', 'learned'], 2, 'Sau giới từ "in" luôn dùng V-ing.'),
            mkEx('He suggested ___ an earlier train.', ['to take', 'taking', 'take', 'took'], 1, '"suggest + V-ing".')
          ]
        },
        {
          id: 'gr-a2-07', lessonNumber: 7, category: 'Câu điều kiện', title: 'Zero & First Conditionals', titleVi: 'Câu điều kiện loại 0 & loại 1', cefr: 'A2',
          formula: 'If + S + V(hiện tại đơn), S + will/can/may + V(inf)',
          explanationVi: 'Loại 0 diễn tả quy luật luôn đúng; Loại 1 diễn tả điều có thật và khả năng cao xảy ra ở hiện tại/tương lai. Không dùng "will" trong mệnh đề "If".',
          ieltsTipVi: 'Dùng Loại 1 để phân tích hệ quả trong IELTS Writing Task 2: "If cities invest in cycling lanes, air pollution will decline."',
          examples: [{ en: 'If you practice 15 minutes daily, your fluency will improve.', vi: 'Nếu bạn luyện 15 phút mỗi ngày, độ trôi chảy sẽ tiến bộ.' }, { en: 'If it rains tomorrow, we’ll hold the event indoors.', vi: 'Nếu mai trời mưa, chúng ta sẽ tổ chức sự kiện trong nhà.' }],
          commonMistake: { wrong: 'If I will have time, I will call you.', right: 'If I have time, I will call you.', whyVi: 'Mệnh đề chứa "If" chia Hiện tại đơn, không dùng "will".' },
          exercises: [
            mkEx('If you ___ water to 0°C, it freezes.', ['cool', 'will cool', 'cooled', 'cooling'], 0, 'Quy luật tự nhiên (Loại 0) dùng hiện tại đơn cả 2 vế.'),
            mkEx('If she ___ hard, she will pass the test easily.', ['study', 'studies', 'will study', 'studied'], 1, 'Mệnh đề If loại 1 chia hiện tại đơn -> "studies".'),
            mkEx('We will miss the bus unless we ___ now.', ['leave', 'will leave', 'left', 'don’t leave'], 0, '"unless" = "if not", theo sau là động từ khẳng định ở hiện tại đơn.'),
            mkEx('If they offer me the job, I ___ it immediately.', ['accept', 'accepted', 'will accept', 'accepting'], 2, 'Mệnh đề chính loại 1 dùng "will + V".')
          ]
        },
        {
          id: 'gr-a2-08', lessonNumber: 8, category: 'Liên từ', title: 'Conjunctions: Because, Although, But, So', titleVi: 'Liên từ nối ý cơ bản (Because / Although / So)', cefr: 'A2',
          formula: 'Although + clause 1, clause 2 (KHÔNG dùng thêm "but")',
          explanationVi: 'Liên từ giúp câu có chiều sâu thay vì nói từng câu cụt. Quy tắc vàng trong tiếng Anh: đã có "Although/Because" thì KHÔNG dùng kèm "but/so" trong cùng 1 câu.',
          ieltsTipVi: 'Lỗi "Although ... but ..." là lỗi cực kỳ phổ biến của học viên Việt Nam khiến điểm Grammar tụt xuống Band 5.0.',
          examples: [{ en: 'Although the exam was tough, he managed to score 7.5.', vi: 'Mặc dù bài thi khó, anh ấy vẫn đạt được 7.5.' }, { en: 'Because traffic was heavy, we arrived ten minutes late.', vi: 'Vì giao thông đông đúc, chúng tôi đến muộn 10 phút.' }],
          commonMistake: { wrong: 'Although it was raining, but we still went hiking.', right: 'Although it was raining, we still went hiking.', whyVi: 'Chỉ dùng 1 trong 2 liên từ ("Although" HOẶC "but"), không dùng cả hai.' },
          exercises: [
            mkEx('___ he was tired, he finished the assignment.', ['Because', 'So', 'Although', 'But'], 2, 'Hai vế mang nghĩa tương phản -> dùng "Although".'),
            mkEx('The weather was terrible, ___ the flight was delayed.', ['because', 'although', 'so', 'but'], 2, 'Vế sau là kết quả -> dùng "so".'),
            mkEx('Chọn câu đúng ngữ pháp:', ['Because it rained, so I stayed home.', 'Although it rained, I went out.', 'Although it rained, but I went out.', 'Because of it rained, I stayed home.'], 1, '"Although" không đi kèm "but".'),
            mkEx('She couldn’t attend ___ her illness.', ['because', 'because of', 'although', 'so'], 1, 'Trước cụm danh từ ("her illness") dùng "because of".')
          ]
        },
        {
          id: 'gr-a2-09', lessonNumber: 9, category: 'Trạng từ', title: 'Adjectives vs Adverbs of Manner', titleVi: 'Phân biệt Tính từ & Trạng từ chỉ cách thức', cefr: 'A2',
          formula: 'Linking verb + Adj · Action verb + Adv (-ly)',
          explanationVi: 'Tính từ bổ nghĩa cho danh từ và đi sau động từ nối (be, seem, feel, look); trạng từ (thường thêm -ly) bổ nghĩa cho động từ hành động (speak fluently, work efficiently).',
          ieltsTipVi: 'Dùng trạng từ chính xác ("rose dramatically", "declined slightly") là chìa khóa ăn điểm Lexical Resource ở IELTS Writing Task 1.',
          examples: [{ en: 'She explained the complex concept clearly.', vi: 'Cô ấy giải thích khái niệm phức tạp một cách rõ ràng.' }, { en: 'The soup smells delicious.', vi: 'Món súp có mùi thơm ngon.' }],
          commonMistake: { wrong: 'He speaks English very good.', right: 'He speaks English very well.', whyVi: 'Bổ nghĩa cho động từ hành động "speaks" phải dùng trạng từ "well", không dùng tính từ "good".' },
          exercises: [
            mkEx('Please drive ___ — the roads are slippery.', ['careful', 'carefully', 'care', 'caring'], 1, 'Bổ nghĩa cho động từ "drive" dùng trạng từ "carefully".'),
            mkEx('The team performed really ___ in the finals.', ['good', 'well', 'bestly', 'nice'], 1, 'Trạng từ của "good" là "well".'),
            mkEx('Your idea sounds ___.', ['brilliantly', 'brilliant', 'well', 'quickly'], 1, 'Sau động từ nối "sounds" dùng tính từ "brilliant".'),
            mkEx('He works very ___ to meet the deadline.', ['hardly', 'hard', 'hardness', 'harder than'], 1, '"hard" vừa là tính từ vừa là trạng từ ("hardly" nghĩa là "hầu như không").')
          ]
        },
        {
          id: 'gr-a2-10', lessonNumber: 10, category: 'Thói quen quá khứ', title: 'Used to (Past Habits)', titleVi: 'Thói quen trong quá khứ (Used to)', cefr: 'A2',
          formula: 'S + used to + V(inf) · S + didn’t use to + V(inf)',
          explanationVi: 'Diễn tả thói quen hoặc trạng thái từng có trong quá khứ nhưng nay đã chấm dứt. Phân biệt với "be used to + V-ing" (quen với việc gì).',
          ieltsTipVi: 'Cực kỳ tự nhiên khi so sánh quá khứ - hiện tại trong Speaking: "People used to write letters, whereas today they just text."',
          examples: [{ en: 'I used to live in a small town before moving to the capital.', vi: 'Tôi từng sống ở một thị trấn nhỏ trước khi lên thủ đô.' }, { en: 'Did you use to play video games after school?', vi: 'Hồi xưa bạn có hay chơi game sau giờ học không?' }],
          commonMistake: { wrong: 'I didn’t used to drink coffee.', right: 'I didn’t use to drink coffee.', whyVi: 'Sau "didn’t", "used" bỏ "d" thành "use to".' },
          exercises: [
            mkEx('There ___ be a cinema here, but now it’s a supermarket.', ['use to', 'used to', 'is used to', 'using to'], 1, 'Trạng thái quá khứ nay không còn -> "used to".'),
            mkEx('I didn’t ___ like spicy food when I was a kid.', ['used to', 'use to', 'using to', 'was used to'], 1, 'Sau "didn’t" dùng "use to".'),
            mkEx('She is used to ___ early for her shift.', ['wake up', 'waking up', 'woke up', 'wakes up'], 1, '"be used to + V-ing" nghĩa là quen với việc gì.'),
            mkEx('We ___ go camping every summer when we were students.', ['used to', 'are used to', 'use to', 'were used'], 0, 'Thói quen quá khứ -> "used to + V(inf)".')
          ]
        }
      ]
    },
    b1: {
      id: 'grammar-b1',
      cefr: 'B1',
      titleVi: 'Ngữ pháp giao tiếp độc lập (B1)',
      descVi: 'Mệnh đề quan hệ, câu bị động, điều kiện loại 2, quá khứ hoàn thành và tường thuật — nền tảng IELTS 6.0.',
      lessons: [
        {
          id: 'gr-b1-01', lessonNumber: 1, category: 'Câu bị động', title: 'Passive Voice (All Main Tenses)', titleVi: 'Câu bị động (Bối cảnh học thuật & Báo chí)', cefr: 'B1',
          formula: 'S + be (chia theo thì) + V3/ed (+ by agent)',
          explanationVi: 'Dùng khi hành động hoặc kết quả quan trọng hơn người thực hiện, hoặc khi không rõ ai làm.',
          ieltsTipVi: 'Bắt buộc có trong IELTS Writing Task 1 dạng quy trình (Process/Map): "The beans are roasted and then ground into powder."',
          examples: [{ en: 'Over 500 electric buses have been deployed in the city.', vi: 'Hơn 500 xe buýt điện đã được đưa vào vận hành trong thành phố.' }, { en: 'The policy is being reviewed by the committee.', vi: 'Chính sách đang được ủy ban xem xét lại.' }],
          commonMistake: { wrong: 'This building was build in 1995.', right: 'This building was built in 1995.', whyVi: 'Câu bị động bắt buộc dùng phân từ 2 (V3): built.' },
          exercises: [
            mkEx('The new bridge ___ next year.', ['will complete', 'will be completed', 'is completing', 'completed'], 1, 'Cây cầu được hoàn thành -> bị động tương lai "will be completed".'),
            mkEx('English ___ in more than 60 countries.', ['speaks', 'is spoken', 'spoke', 'is speaking'], 1, 'Bị động hiện tại đơn -> "is spoken".'),
            mkEx('The email ___ two hours ago.', ['was sent', 'sent', 'has sent', 'is sent'], 0, 'Quá khứ xác định ("two hours ago") -> bị động quá khứ đơn.'),
            mkEx('A new library is currently ___ downtown.', ['building', 'been built', 'being built', 'built'], 2, 'Bị động hiện tại tiếp diễn -> "is being built".')
          ]
        },
        {
          id: 'gr-b1-02', lessonNumber: 2, category: 'Câu phức', title: 'Defining Relative Clauses (Who / Which / That / Where)', titleVi: 'Mệnh đề quan hệ xác định', cefr: 'B1',
          formula: 'N(người) + who/that · N(vật) + which/that · N(nơi chốn) + where',
          explanationVi: 'Gộp hai câu đơn thành một câu phức mượt mà bằng đại từ quan hệ để định nghĩa rõ danh từ đứng trước.',
          ieltsTipVi: 'Dùng thành thạo mệnh đề quan hệ là tiêu chí cốt lõi để đạt Band 6.5+ tiêu chí Grammatical Range & Accuracy.',
          examples: [{ en: 'Candidates who prepare systematically tend to score higher.', vi: 'Những thí sinh ôn luyện có hệ thống thường đạt điểm cao hơn.' }, { en: 'That’s the café where we held our first kickoff meeting.', vi: 'Đó là quán cà phê nơi chúng tôi họp khởi động lần đầu.' }],
          commonMistake: { wrong: 'The book which I bought it yesterday is amazing.', right: 'The book which I bought yesterday is amazing.', whyVi: '"which" đã thay thế cho tân ngữ, không lặp lại "it".' },
          exercises: [
            mkEx('The colleague ___ helped me with the code just got promoted.', ['which', 'who', 'where', 'whose'], 1, 'Thay thế cho chủ ngữ chỉ người -> "who".'),
            mkEx('This is the neighborhood ___ I grew up.', ['which', 'where', 'who', 'that'], 1, 'Chỉ nơi chốn (= in which) -> "where".'),
            mkEx('She works for a startup ___ develops clean energy.', ['who', 'where', 'which', 'whose'], 2, 'Chỉ vật/tổ chức -> "which / that".'),
            mkEx('I met a designer ___ portfolio won an international award.', ['who', 'which', 'whose', 'whom'], 2, 'Chỉ sở hữu ("portfolio của cô ấy") -> "whose".')
          ]
        },
        {
          id: 'gr-b1-03', lessonNumber: 3, category: 'Câu điều kiện', title: 'Second Conditional (Hypothetical Situations)', titleVi: 'Câu điều kiện loại 2 (Giả định không có thật ở hiện tại)', cefr: 'B1',
          formula: 'If + S + V2/ed (were), S + would/could + V(inf)',
          explanationVi: 'Dùng để tưởng tượng tình huống giả định ở hiện tại hoặc đưa ra đề xuất nhẹ nhàng, lịch sự.',
          ieltsTipVi: 'Cực kỳ ăn điểm ở IELTS Speaking Part 3 khi hỏi câu giả định ("If I were in charge of city planning, I would...").',
          examples: [{ en: 'If I had more free time, I would learn a third language.', vi: 'Nếu tôi có thêm thời gian rảnh, tôi sẽ học ngoại ngữ thứ ba.' }, { en: 'If I were you, I would focus on high-frequency collocations.', vi: 'Nếu tôi là bạn, tôi sẽ tập trung vào các cụm từ tần suất cao.' }],
          commonMistake: { wrong: 'If I would win the lottery, I would buy a house.', right: 'If I won the lottery, I would buy a house.', whyVi: 'Không dùng "would" trong mệnh đề "If"; chia quá khứ đơn "won".' },
          exercises: [
            mkEx('If cities ___ more green spaces, residents would feel less stressed.', ['have', 'had', 'would have', 'having'], 1, 'Mệnh đề If loại 2 chia quá khứ đơn -> "had".'),
            mkEx('If I ___ you, I’d accept that internship.', ['am', 'was be', 'were', 'would be'], 2, 'Trong câu điều kiện loại 2 chuẩn học thuật dùng "were" cho mọi ngôi.'),
            mkEx('What ___ you do if you could live anywhere in the world?', ['will', 'would', 'did', 'do'], 1, 'Mệnh đề chính loại 2 dùng "would + V".'),
            mkEx('She would travel more if she ___ afraid of flying.', ['isn’t', 'won’t be', 'weren’t', 'hasn’t been'], 2, 'Giả định trái hiện tại -> "weren’t".')
          ]
        },
        {
          id: 'gr-b1-04', lessonNumber: 4, category: 'Thì hoàn thành', title: 'Present Perfect Continuous', titleVi: 'Thì Hiện tại hoàn thành tiếp diễn', cefr: 'B1',
          formula: 'S + have/has + been + V-ing',
          explanationVi: 'Nhấn mạnh tính LIÊN TỤC và QUÁ TRÌNH của hành động bắt đầu trong quá khứ kéo dài đến hiện tại (hoặc vừa dừng nhưng còn dấu vết).',
          ieltsTipVi: 'Trả lời câu hỏi "How long have you been studying English?" chuẩn tự nhiên: "I’ve been learning English for about six years."',
          examples: [{ en: 'I’ve been working on this product since early morning.', vi: 'Tôi đã làm việc với sản phẩm này liên tục từ sáng sớm.' }, { en: 'She looks tired because she has been running.', vi: 'Cô ấy trông mệt vì vừa chạy bộ xong.' }],
          commonMistake: { wrong: 'I am working here for three years.', right: 'I have been working here for three years.', whyVi: 'Hành động kéo dài từ quá khứ tới nay ("for three years") phải dùng Hiện tại hoàn thành (tiếp diễn), không dùng Hiện tại tiếp diễn.' },
          exercises: [
            mkEx('How long ___ you been waiting for the bus?', ['are', 'did', 'have', 'were'], 2, 'Cấu trúc "How long have you been + V-ing?".'),
            mkEx('It ___ all afternoon, so the streets are flooded.', ['is raining', 'has been raining', 'rained', 'rains'], 1, 'Hành động kéo dài liên tục tới hiện tại -> "has been raining".'),
            mkEx('I have been ___ Spanish for six months.', ['study', 'studied', 'studying', 'studies'], 2, 'Sau "have been" dùng V-ing.'),
            mkEx('We ___ three chapters so far today.', ['have been reading', 'have read', 'are reading', 'read'], 1, 'Nhấn mạnh KẾT QUẢ / SỐ LƯỢNG ("three chapters") dùng Hiện tại hoàn thành đơn.')
          ]
        },
        {
          id: 'gr-b1-05', lessonNumber: 5, category: 'Thì quá khứ', title: 'Past Perfect (Earlier Past Action)', titleVi: 'Thì Quá khứ hoàn thành', cefr: 'B1',
          formula: 'S + had + V3/ed (before / by the time + S + V2/ed)',
          explanationVi: 'Diễn tả một hành động xảy ra TRƯỚC một hành động khác trong quá khứ.',
          ieltsTipVi: 'Giúp câu chuyện Speaking Part 2 có chiều sâu thời gian rõ ràng ("By the time we arrived, the concert had already started.").',
          examples: [{ en: 'By the time I got to the airport, boarding had already closed.', vi: 'Lúc tôi đến sân bay thì cổng lên máy bay đã đóng rồi.' }, { en: 'She realized she had left her passport at home.', vi: 'Cô ấy nhận ra mình đã để quên hộ chiếu ở nhà.' }],
          commonMistake: { wrong: 'Before I moved here, I lived in Hue for 10 years.', right: 'Before I moved here, I had lived in Hue for 10 years.', whyVi: 'Hành động sống ở Huế xảy ra trước khi chuyển đi -> ưu tiên Quá khứ hoàn thành.' },
          exercises: [
            mkEx('When we arrived at the theater, the film ___.', ['already started', 'had already started', 'has already started', 'starts'], 1, 'Phim bắt đầu TRƯỚC khi chúng tôi đến -> "had already started".'),
            mkEx('He failed the test because he ___ enough.', ['didn’t revise', 'hadn’t revised', 'hasn’t revised', 'wasn’t revising'], 1, 'Không ôn tập xảy ra trước khi thi trượt -> "hadn’t revised".'),
            mkEx('After she ___ her degree, she joined a tech firm.', ['completes', 'had completed', 'has completed', 'completing'], 1, 'Hành động xảy ra trước -> "had completed".'),
            mkEx('By 2015, the company ___ to 12 countries.', ['expanded', 'had expanded', 'has expanded', 'expands'], 1, '"By + mốc quá khứ" luôn đi với Quá khứ hoàn thành.')
          ]
        },
        {
          id: 'gr-b1-06', lessonNumber: 6, category: 'Câu tường thuật', title: 'Reported Speech (Statements & Questions)', titleVi: 'Câu tường thuật (Gián tiếp)', cefr: 'B1',
          formula: 'S + said/told + (that) + S + V(lùi thì)',
          explanationVi: 'Khi tường thuật lại lời người khác đã nói ở quá khứ, lùi thì động từ 1 bậc (am/is → was, will → would, can → could) và không đảo ngữ trong câu hỏi gián tiếp.',
          ieltsTipVi: 'Hữu ích khi trích dẫn ý kiến chuyên gia hoặc phản hồi từ đồng nghiệp trong Writing/Speaking.',
          examples: [{ en: 'The manager said that the deadline had been extended.', vi: 'Quản lý nói rằng hạn chót đã được gia hạn.' }, { en: 'She asked me where I had learned English.', vi: 'Cô ấy hỏi tôi đã học tiếng Anh ở đâu.' }],
          commonMistake: { wrong: 'He asked me where did I live.', right: 'He asked me where I lived.', whyVi: 'Câu hỏi tường thuật giữ nguyên trật tự S + V, không mượn "did".' },
          exercises: [
            mkEx('She told me she ___ call me the next day.', ['will', 'would', 'can', 'is'], 1, 'Lùi thì "will" -> "would".'),
            mkEx('He asked me ___ I was free for lunch.', ['that', 'if', 'what', 'did'], 1, 'Câu hỏi Yes/No gián tiếp dùng "if / whether".'),
            mkEx('They ___ us that the flight was delayed.', ['said', 'told', 'spoke', 'talked'], 1, '"tell + someone + that..." (còn "say" không đi trực tiếp với tân ngữ người).'),
            mkEx('Can you tell me where ___?', ['is the station', 'the station is', 'does the station', 'was the station'], 1, 'Câu hỏi gián tiếp dùng trật tự S + V.')
          ]
        },
        {
          id: 'gr-b1-07', lessonNumber: 7, category: 'Động từ khuyết thiếu', title: 'Modals of Deduction (Must / Might / Can’t)', titleVi: 'Động từ suy đoán logic (Chắc chắn / Có thể / Không thể)', cefr: 'B1',
          formula: 'must be (chắc hẳn là) · might/could be (có lẽ là) · can’t be (không thể nào là)',
          explanationVi: 'Dùng để suy đoán dựa trên bằng chứng ở hiện tại. Lưu ý: ngược nghĩa suy đoán của "must be" là "can’t be" (KHÔNG phải "mustn’t be").',
          ieltsTipVi: 'Rất hiệu quả khi bình luận nguyên nhân trong Speaking Part 3 ("That might be because housing prices have skyrocketed.").',
          examples: [{ en: 'He’s been working for 12 hours — he must be exhausted.', vi: 'Anh ấy làm 12 tiếng rồi — chắc hẳn anh ấy kiệt sức lắm.' }, { en: 'That can’t be Sarah’s car; she’s in Singapore this week.', vi: 'Đó không thể là xe của Sarah được; tuần này cô ấy đang ở Singapore.' }],
          commonMistake: { wrong: 'That mustn’t be true!', right: 'That can’t be true!', whyVi: 'Suy đoán phủ định chắc chắn ("không thể nào") dùng "can’t", không dùng "mustn’t".' },
          exercises: [
            mkEx('The lights are off and nobody answered. They ___ be out.', ['must', 'can’t', 'shouldn’t', 'need'], 0, 'Suy đoán chắc chắn dựa trên bằng chứng -> "must".'),
            mkEx('He just ate a huge pizza. He ___ be hungry already!', ['mustn’t', 'can’t', 'might', 'should'], 1, 'Chắc chắn không thể -> "can’t".'),
            mkEx('I’m not sure where Tom is. He ___ be in the meeting room.', ['must', 'can’t', 'might', 'has to'], 2, 'Không chắc chắn (50/50) -> "might / could".'),
            mkEx('You’ve been studying nonstop — you ___ feel proud of your progress.', ['must', 'can’t', 'might not', 'didn’t'], 0, 'Suy đoán hợp lý chắc chắn -> "must".')
          ]
        },
        {
          id: 'gr-b1-08', lessonNumber: 8, category: 'Liên kết câu', title: 'Contrast Linkers: Despite, In Spite Of, Whereas', titleVi: 'Liên từ tương phản học thuật', cefr: 'B1',
          formula: 'Despite / In spite of + Noun / V-ing · Clause 1, whereas Clause 2',
          explanationVi: 'Thay vì chỉ dùng "but", dùng "despite / in spite of" trước cụm danh từ/V-ing và "whereas" để đối chiếu hai chủ thể song song.',
          ieltsTipVi: 'Dùng "whereas / while" giúp câu so sánh Task 1 và lập luận Task 2 bật ngay lên Band 7.0.',
          examples: [{ en: 'Despite the high cost, many students choose to study abroad.', vi: 'Mặc dù chi phí cao, nhiều sinh viên vẫn chọn du học.' }, { en: 'Online learning offers flexibility, whereas classrooms provide direct interaction.', vi: 'Học online mang lại sự linh hoạt, trong khi lớp học đem lại tương tác trực tiếp.' }],
          commonMistake: { wrong: 'Despite it was expensive, we bought it.', right: 'Despite the high price, we bought it.', whyVi: 'Sau "Despite" là cụm danh từ hoặc V-ing (không theo sau trực tiếp bởi mệnh đề S+V).' },
          exercises: [
            mkEx('___ facing several obstacles, the team launched on schedule.', ['Although', 'Despite', 'Whereas', 'However'], 1, 'Trước V-ing ("facing") dùng "Despite / In spite of".'),
            mkEx('Urban areas offer more jobs, ___ rural areas provide cleaner air.', ['despite', 'because', 'whereas', 'in spite of'], 2, 'Đối chiếu hai vế song song -> "whereas".'),
            mkEx('In spite ___ the rain, the marathon continued.', ['with', 'for', 'of', 'to'], 2, 'Cụm cố định "In spite of" (còn "Despite" KHÔNG có "of").'),
            mkEx('Chọn câu đúng:', ['Despite of the delay, we arrived safely.', 'Despite the delay, we arrived safely.', 'Although the delay, we arrived safely.', 'In spite the delay, we arrived safely.'], 1, '"Despite" đi trực tiếp với danh từ, không có "of".')
          ]
        },
        {
          id: 'gr-b1-09', lessonNumber: 9, category: 'Nhấn mạnh', title: 'Too / Enough & So / Such', titleVi: 'Cấu trúc mức độ (Too / Enough / So / Such)', cefr: 'B1',
          formula: 'too + adj + to V · adj + enough + to V · so + adj + that · such + (a/an) + adj + N + that',
          explanationVi: '"Enough" đứng SAU tính từ nhưng TRƯỚC danh từ. "So" đi với tính từ/trạng từ, còn "such" đi với cụm danh từ.',
          ieltsTipVi: 'Giúp diễn đạt nguyên nhân - kết quả giàu cảm xúc và học thuật hơn: "The policy was so effective that emissions fell by 20%."',
          examples: [{ en: 'The instructions weren’t clear enough for beginners to follow.', vi: 'Hướng dẫn chưa đủ rõ ràng để người mới làm theo.' }, { en: 'It was such an inspiring talk that everyone applauded.', vi: 'Đó là một bài nói truyền cảm hứng đến nỗi mọi người đều vỗ tay.' }],
          commonMistake: { wrong: 'He is enough tall to play basketball.', right: 'He is tall enough to play basketball.', whyVi: '"enough" đứng SAU tính từ ("tall enough").' },
          exercises: [
            mkEx('The problem is ___ complex to solve overnight.', ['enough', 'too', 'such', 'so'], 1, 'Cấu trúc "too + adj + to V" (quá ... để làm gì).'),
            mkEx('We don’t have ___ to finish all tasks today.', ['time enough', 'enough time', 'too time', 'so time'], 1, '"enough" đứng TRƯỚC danh từ ("enough time").'),
            mkEx('It was ___ a difficult question that nobody answered.', ['so', 'very', 'such', 'too'], 2, 'Trước cụm danh từ "a difficult question" dùng "such".'),
            mkEx('The lecture was ___ engaging that time flew by.', ['such', 'so', 'too', 'enough'], 1, 'Trước tính từ đơn lẻ "engaging" dùng "so".')
          ]
        },
        {
          id: 'gr-b1-10', lessonNumber: 10, category: 'Cụm động từ', title: 'Separable vs Inseparable Phrasal Verbs', titleVi: 'Cụm động từ tách được & không tách được', cefr: 'B1',
          formula: 'turn it off (đúng) · turn off it (sai) · look after them (đúng)',
          explanationVi: 'Với cụm động từ tách được (figure out, bring up, put off, turn down), nếu tân ngữ là ĐẠI TỪ (it, them, him), bắt buộc đặt đại từ ở GIỮA động từ và giới từ.',
          ieltsTipVi: 'Sử dụng đúng cụm động từ tự nhiên là tiêu chuẩn vàng giúp Speaking vọt từ Band 6.0 lên Band 7.0+.',
          examples: [{ en: 'Don’t worry, we’ll figure it out together.', vi: 'Đừng lo, chúng ta sẽ cùng tìm ra cách giải quyết.' }, { en: 'They had to put off the meeting until Friday.', vi: 'Họ phải hoãn cuộc họp sang thứ Sáu.' }],
          commonMistake: { wrong: 'Please turn off it before leaving.', right: 'Please turn it off before leaving.', whyVi: 'Đại từ "it" phải đặt ở giữa "turn" và "off".' },
          exercises: [
            mkEx('That’s a tricky bug, but we’ll ___.', ['figure out it', 'figure it out', 'it figure out', 'figure out'], 1, 'Đại từ "it" đặt giữa "figure ... out".'),
            mkEx('She ___ the job offer because the commute was too long.', ['turned down', 'turned up', 'looked after', 'ran into'], 0, '"turn down" = từ chối lời đề nghị.'),
            mkEx('Could you ___ my cat while I’m away?', ['look it after', 'look after it', 'after look it', 'look up it'], 1, '"look after" là cụm không tách được -> "look after it".'),
            mkEx('We’ve ___ coffee — let’s buy some more.', ['run out of', 'put off', 'given up', 'brought up'], 0, '"run out of" = hết sạch.')
          ]
        }
      ]
    },
    b2: {
      id: 'grammar-b2',
      cefr: 'B2',
      titleVi: 'Ngữ pháp học thuật & Công sở (B2)',
      descVi: 'Điều kiện loại 3 & hỗn hợp, mệnh đề rút gọn, bị động khách quan, cấu trúc giả định — mục tiêu IELTS 7.0.',
      lessons: [
        {
          id: 'gr-b2-01', lessonNumber: 1, category: 'Câu điều kiện', title: 'Third & Mixed Conditionals', titleVi: 'Câu điều kiện loại 3 & Hỗn hợp', cefr: 'B2',
          formula: 'If + S + had + V3, S + would have + V3 (hoặc would + V ở hiện tại)',
          explanationVi: 'Loại 3 nói về điều hối tiếc / giả định trái quá khứ; Hỗn hợp nối nguyên nhân quá khứ với kết quả kéo dài đến hiện tại.',
          ieltsTipVi: 'Dùng 1 câu điều kiện hỗn hợp chuẩn xác trong Writing Task 2 hoặc Speaking Part 3 chứng tỏ rõ năng lực Band 7.5+.',
          examples: [{ en: 'If governments had acted earlier, carbon emissions would be much lower today.', vi: 'Nếu chính phủ hành động sớm hơn, lượng khí thải hôm nay đã thấp hơn nhiều.' }, { en: 'If I hadn’t taken that internship, I wouldn’t have met my mentor.', vi: 'Nếu tôi không nhận kỳ thực tập đó, tôi đã chẳng gặp được người dẫn dắt mình.' }],
          commonMistake: { wrong: 'If I would have known, I would have helped.', right: 'If I had known, I would have helped.', whyVi: 'Mệnh đề If loại 3 dùng "had + V3", không dùng "would have".' },
          exercises: [
            mkEx('If she ___ the deadline, she wouldn’t have lost the contract.', ['met', 'had met', 'would meet', 'meets'], 1, 'Mệnh đề If loại 3 -> "had met".'),
            mkEx('If we had invested in renewable energy decades ago, we ___ fewer crises now.', ['would face', 'would have faced', 'faced', 'will face'], 0, 'Điều kiện hỗn hợp (quá khứ → kết quả "now") -> "would face".'),
            mkEx('They wouldn’t have missed the flight if they ___ earlier.', ['left', 'have left', 'had left', 'would leave'], 2, 'Giả định trái quá khứ -> "had left".'),
            mkEx('If he ___ fluent in English, he would have got that global role last year.', ['is', 'were', 'had been', 'would be'], 1, 'Điều kiện hỗn hợp (đặc điểm hiện tại → kết quả quá khứ) -> "were".')
          ]
        },
        {
          id: 'gr-b2-02', lessonNumber: 2, category: 'Câu phức học thuật', title: 'Non-Defining Relative Clauses', titleVi: 'Mệnh đề quan hệ không xác định (Bổ sung thông tin)', cefr: 'B2',
          formula: 'Clause, which + V... (KHÔNG dùng "that")',
          explanationVi: 'Tách bằng dấu phẩy để bổ sung thông tin phụ cho danh từ xác định hoặc cho CẢ MỆNH ĐỀ phía trước (dùng ", which"). Tuyệt đối không thay bằng "that".',
          ieltsTipVi: 'Cấu trúc "..., which leads to / which results in..." là vũ khí ghi điểm hàng đầu trong IELTS Writing Task 2.',
          examples: [{ en: 'Remote work cuts commuting time, which significantly boosts employee satisfaction.', vi: 'Làm việc từ xa giảm thời gian đi lại, điều này giúp tăng đáng kể sự hài lòng của nhân viên.' }, { en: 'My manager, who has 15 years of experience, gave me constructive feedback.', vi: 'Quản lý của tôi, người có 15 năm kinh nghiệm, đã cho tôi góp ý rất xây dựng.' }],
          commonMistake: { wrong: 'Housing costs have surged, that forces young people to rent.', right: 'Housing costs have surged, which forces young people to rent.', whyVi: 'Sau dấu phẩy bổ sung cho cả mệnh đề chỉ dùng "which", không dùng "that".' },
          exercises: [
            mkEx('Public transport is unreliable, ___ encourages people to buy private cars.', ['that', 'which', 'what', 'who'], 1, 'Bổ sung hệ quả cho cả vế trước -> ", which".'),
            mkEx('Dr. Lin, ___ research focuses on AI ethics, will speak tonight.', ['who', 'that', 'whose', 'which'], 2, 'Chỉ sở hữu ("nghiên cứu của Dr. Lin") -> "whose".'),
            mkEx('Chọn câu đúng:', ['Tokyo, that is Japan’s capital, is very safe.', 'Tokyo, which is Japan’s capital, is very safe.', 'Tokyo which is Japan’s capital is very safe.', 'Tokyo, what is Japan’s capital, is very safe.'], 1, 'Mệnh đề không xác định dùng dấu phẩy và "which".'),
            mkEx('He passed the exam on his first attempt, ___ surprised everyone.', ['that', 'what', 'which', 'it'], 2, 'Thay cho cả mệnh đề trước dấu phẩy -> "which".')
          ]
        },
        {
          id: 'gr-b2-03', lessonNumber: 3, category: 'Rút gọn câu', title: 'Participle Clauses (V-ing / V3)', titleVi: 'Mệnh đề phân từ rút gọn', cefr: 'B2',
          formula: 'V-ing (chủ động) / V3-ed (bị động), S + V (cùng chủ ngữ)',
          explanationVi: 'Rút gọn mệnh đề trạng ngữ hoặc mệnh đề quan hệ giúp câu văn súc tích, học thuật hơn. Hai vế BẮT BUỘC phải cùng một chủ ngữ để tránh lỗi "dangling modifier".',
          ieltsTipVi: 'Giúp tránh lặp "Because they...", "When it is..." trong Writing Task 1 & 2 (VD: "Faced with rising costs, firms are automating...").',
          examples: [{ en: 'Faced with fierce competition, startups must innovate constantly.', vi: 'Đối mặt với cạnh tranh gay gắt, các startup phải đổi mới liên tục.' }, { en: 'Having analyzed the survey data, the team revised its strategy.', vi: 'Sau khi phân tích dữ liệu khảo sát, nhóm đã điều chỉnh chiến lược.' }],
          commonMistake: { wrong: 'Walking to the station, the rain soaked my coat.', right: 'Walking to the station, I got soaked by the rain.', whyVi: '"the rain" không thể tự "walking" — chủ ngữ vế chính phải là "I".' },
          exercises: [
            mkEx('___ in 1920, the university attracts scholars worldwide.', ['Founding', 'Founded', 'To found', 'Having found'], 1, 'Trường đại học ĐƯỢC thành lập (bị động) -> "Founded".'),
            mkEx('___ his presentation early, he spent extra time on Q&A.', ['Finished', 'Having finished', 'Finish', 'Being finished'], 1, 'Chủ động hoàn thành trước hành động sau -> "Having finished".'),
            mkEx('Students ___ for the IELTS exam should practice timed essays.', ['preparing', 'prepared', 'prepare', 'are preparing'], 0, 'Rút gọn mệnh đề quan hệ chủ động -> "preparing".'),
            mkEx('___ by the sudden noise, the birds flew away.', ['Startling', 'Startled', 'Startle', 'Having startled'], 1, 'Bị giật mình (bị động) -> "Startled".')
          ]
        },
        {
          id: 'gr-b2-04', lessonNumber: 4, category: 'Văn phong học thuật', title: 'Impersonal Passive (It is argued that...)', titleVi: 'Bị động khách quan (IELTS Writing)', cefr: 'B2',
          formula: 'It is widely believed/argued that + Clause · S + is thought + to V / to have V3',
          explanationVi: 'Giúp trình bày quan điểm phổ biến một cách khách quan, tránh lặp "Many people think..." quá nhiều lần.',
          ieltsTipVi: 'Cấu trúc vàng cho câu mở đầu đoạn thân bài IELTS Writing Task 2.',
          examples: [{ en: 'It is widely acknowledged that early education shapes lifelong habits.', vi: 'Người ta công nhận rộng rãi rằng giáo dục sớm định hình thói quen suốt đời.' }, { en: 'Sleep deprivation is known to impair cognitive performance.', vi: 'Thiếu ngủ được biết là làm suy giảm hiệu suất nhận thức.' }],
          commonMistake: { wrong: 'It is believe that technology saves time.', right: 'It is believed that technology saves time.', whyVi: 'Thiếu dạng bị động V3 "believed".' },
          exercises: [
            mkEx('It is generally ___ that bilingualism benefits brain health.', ['accept', 'accepted', 'accepting', 'to accept'], 1, 'Bị động khách quan -> "It is accepted that...".'),
            mkEx('The ancient city is believed ___ over 3,000 years ago.', ['to build', 'to be built', 'to have been built', 'building'], 2, 'Bị động của hành động đã xảy ra trong quá khứ -> "to have been built".'),
            mkEx('Social media is often ___ to increase anxiety among teenagers.', ['claiming', 'claimed', 'claim', 'claims'], 1, '"is claimed to + V".'),
            mkEx('___ is argued that stricter regulations are necessary.', ['There', 'That', 'It', 'This'], 2, 'Chủ ngữ giả "It is argued that...".')
          ]
        },
        {
          id: 'gr-b2-05', lessonNumber: 5, category: 'Suy đoán quá khứ', title: 'Past Modals (Must have / Could have / Should have)', titleVi: 'Động từ khuyết thiếu trong quá khứ', cefr: 'B2',
          formula: 'must/might/can’t/should + have + V3/ed',
          explanationVi: '"Should have V3" = đáng lẽ nên làm (nhưng đã không làm); "Must have V3" = chắc hẳn đã xảy ra; "Can’t have V3" = không thể nào đã xảy ra.',
          ieltsTipVi: 'Thể hiện năng lực diễn đạt sắc thái tinh tế khi phân tích lỗi sai lịch sử hoặc bài học kinh nghiệm trong Speaking.',
          examples: [{ en: 'They should have tested the system before launching it.', vi: 'Đáng lẽ họ nên kiểm thử hệ thống trước khi ra mắt.' }, { en: 'She must have practiced a lot to deliver such a smooth speech.', vi: 'Chắc hẳn cô ấy đã luyện tập rất nhiều để có bài phát biểu trôi chảy như vậy.' }],
          commonMistake: { wrong: 'You should told me earlier.', right: 'You should have told me earlier.', whyVi: 'Phê bình/hối tiếc chuyện quá khứ phải dùng "should have + V3".' },
          exercises: [
            mkEx('I missed the train! I ___ left home ten minutes earlier.', ['must have', 'should have', 'can’t have', 'might'], 1, 'Hối tiếc đáng lẽ nên làm -> "should have".'),
            mkEx('The streets are completely dry. It ___ rained last night.', ['mustn’t have', 'can’t have', 'shouldn’t have', 'might have'], 1, 'Suy đoán chắc chắn KHÔNG thể đã xảy ra -> "can’t have".'),
            mkEx('He looks thrilled — he ___ passed his driving test!', ['must have', 'can’t have', 'should have', 'had to'], 0, 'Suy đoán chắc chắn đã xảy ra -> "must have".'),
            mkEx('You ___ bought so much food; we already have plenty.', ['needn’t have', 'mustn’t have', 'can’t have', 'couldn’t'], 0, '"needn’t have V3" = đã làm việc không cần thiết.')
          ]
        },
        {
          id: 'gr-b2-06', lessonNumber: 6, category: 'Giả định & Mong ước', title: 'Wish / If Only (Present & Past Regrets)', titleVi: 'Cấu trúc Wish / If only', cefr: 'B2',
          formula: 'wish + S + V2 (ước trái hiện tại) · wish + S + had V3 (hối tiếc quá khứ)',
          explanationVi: 'Giống câu điều kiện loại 2 và 3: ước điều trái hiện tại lùi về quá khứ đơn; hối tiếc chuyện đã qua lùi về quá khứ hoàn thành; phàn nàn thói quen khó chịu dùng "wish + would".',
          ieltsTipVi: 'Tạo câu trả lời giàu cảm xúc trong IELTS Speaking Part 2 về điều bạn muốn thay đổi.',
          examples: [{ en: 'I wish I had started learning vocabulary in context sooner.', vi: 'Ước gì tôi đã bắt đầu học từ vựng theo ngữ cảnh sớm hơn.' }, { en: 'If only public transport were faster during rush hour.', vi: 'Giá như phương tiện công cộng nhanh hơn vào giờ cao điểm.' }],
          commonMistake: { wrong: 'I wish I can speak English effortlessly.', right: 'I wish I could speak English effortlessly.', whyVi: 'Sau "wish" phải lùi thì ("can" -> "could").' },
          exercises: [
            mkEx('I wish I ___ more confident when speaking in public.', ['am', 'were', 'will be', 'have been'], 1, 'Ước trái hiện tại -> "were".'),
            mkEx('She wishes she ___ that job offer last year.', ['accepted', 'had accepted', 'would accept', 'accepts'], 1, 'Hối tiếc chuyện quá khứ ("last year") -> "had accepted".'),
            mkEx('If only people ___ stop littering in public parks!', ['would', 'will', 'had', 'are'], 0, 'Phàn nàn muốn ai đó thay đổi hành vi -> "would + V".'),
            mkEx('I wish I ___ so much coffee last night; I couldn’t sleep.', ['didn’t drink', 'hadn’t drunk', 'wouldn’t drink', 'haven’t drunk'], 1, 'Hối tiếc hành động quá khứ -> "hadn’t drunk".')
          ]
        },
        {
          id: 'gr-b2-07', lessonNumber: 7, category: 'Cấu trúc gây khiến', title: 'Causative: Have / Get Something Done', titleVi: 'Thể nhờ vả (Have / Get something done)', cefr: 'B2',
          formula: 'S + have/get + O(vật) + V3/ed',
          explanationVi: 'Diễn tả việc thuê hoặc nhờ người khác làm một dịch vụ cho mình (cắt tóc, sửa laptop, chấm bài), không tự tay làm.',
          ieltsTipVi: 'Dùng chuẩn xác giúp phân biệt giữa tự làm ("I cut my hair") và ra tiệm ("I had my hair cut").',
          examples: [{ en: 'I need to get my essay proofread before submitting it.', vi: 'Tôi cần nhờ kiểm tra lỗi bài luận trước khi nộp.' }, { en: 'We had the office redesigned last month.', vi: 'Tháng trước chúng tôi đã thuê thiết kế lại văn phòng.' }],
          commonMistake: { wrong: 'I had my laptop repair yesterday.', right: 'I had my laptop repaired yesterday.', whyVi: 'Sau "have + O(vật)" phải dùng phân từ 2 (V3) "repaired".' },
          exercises: [
            mkEx('She is going to have her teeth ___ tomorrow.', ['check', 'checking', 'checked', 'to check'], 2, 'Cấu trúc "have + O + V3".'),
            mkEx('We got our air conditioner ___ before summer started.', ['serviced', 'service', 'servicing', 'to service'], 0, '"get + O + V3".'),
            mkEx('How often do you get your car ___?', ['wash', 'washed', 'washing', 'washes'], 1, 'Nhờ rửa xe -> "washed".'),
            mkEx('They had a specialist ___ the security audit.', ['conduct', 'conducted', 'conducting', 'to conducting'], 0, '"have + SOMEONE + V(inf)" (chủ động nhờ người).')
          ]
        },
        {
          id: 'gr-b2-08', lessonNumber: 8, category: 'Tương lai nâng cao', title: 'Future Continuous & Future Perfect', titleVi: 'Tương lai tiếp diễn & Tương lai hoàn thành', cefr: 'B2',
          formula: 'will be + V-ing (đang diễn ra) · will have + V3 (hoàn tất trước mốc tương lai)',
          explanationVi: 'Future Perfect ("by 2030, ... will have doubled") cực kỳ đắc lực khi nói về mục tiêu tương lai hoặc dự báo biểu đồ.',
          ieltsTipVi: 'Ghi điểm cao trong IELTS Writing Task 1 các biểu đồ có năm dự báo tương lai (2030, 2050).',
          examples: [{ en: 'By 2035, renewable energy will have replaced most coal plants.', vi: 'Đến năm 2035, năng lượng tái tạo sẽ thay thế phần lớn nhà máy than.' }, { en: 'This time next week, I’ll be presenting in Singapore.', vi: 'Giờ này tuần sau tôi sẽ đang thuyết trình ở Singapore.' }],
          commonMistake: { wrong: 'By next year, I will finish 50 lessons.', right: 'By next year, I will have finished 50 lessons.', whyVi: 'Có "By + mốc tương lai" nhấn mạnh sự hoàn tất -> dùng Future Perfect.' },
          exercises: [
            mkEx('By the end of this year, she ___ over 1,000 IELTS words.', ['will master', 'will have mastered', 'is mastering', 'masters'], 1, '"By the end of..." -> "will have + V3".'),
            mkEx('Don’t call at 8 PM — I ___ dinner with clients.', ['will have had', 'will be having', 'have', 'had'], 1, 'Đang diễn ra tại thời điểm cụ thể trong tương lai -> "will be having".'),
            mkEx('By 2040, urban populations ___ significantly.', ['will have grown', 'grow', 'grew', 'are growing'], 0, 'Dự báo hoàn tất trước mốc 2040 -> "will have grown".'),
            mkEx('This time tomorrow we ___ over the Pacific Ocean.', ['will fly', 'will be flying', 'will have flown', 'flew'], 1, '"This time tomorrow" -> Tương lai tiếp diễn.')
          ]
        },
        {
          id: 'gr-b2-09', lessonNumber: 9, category: 'Liên kết học thuật', title: 'Result & Purpose Clauses (So that / In order to / Therefore)', titleVi: 'Mệnh đề mục đích & Hệ quả học thuật', cefr: 'B2',
          formula: 'in order to / so as to + V(inf) · so that + S + can/could + V · ; therefore, S + V',
          explanationVi: 'Lưu ý dấu câu cực quan trọng: "therefore / however / consequently" là trạng từ liên kết — phải đứng sau dấu chấm (.) hoặc chấm phẩy (;), KHÔNG đứng sau dấu phẩy nối 2 mệnh đề (comma splice).',
          ieltsTipVi: 'Tránh lỗi dấu phẩy với "however/therefore" giúp bài IELTS Writing giữ vững Band 7.0+ Punctuation.',
          examples: [{ en: 'Cities should subsidize buses in order to reduce private car usage.', vi: 'Các thành phố nên trợ giá xe buýt để giảm việc dùng xe cá nhân.' }, { en: 'Demand surged rapidly; consequently, prices climbed.', vi: 'Nhu cầu tăng vọt; do đó, giá cả leo thang.' }],
          commonMistake: { wrong: 'The plan was costly, however, it succeeded.', right: 'The plan was costly; however, it succeeded.', whyVi: 'Trước "however" nối 2 mệnh đề độc lập cần dấu chấm (.) hoặc chấm phẩy (;).' },
          exercises: [
            mkEx('She takes notes ___ remember key collocations.', ['so that', 'in order to', 'because', 'therefore'], 1, 'Trước động từ nguyên mẫu "remember" dùng "in order to".'),
            mkEx('He spoke slowly ___ everyone could follow.', ['in order to', 'so as to', 'so that', 'despite'], 2, 'Trước mệnh đề S + could V dùng "so that".'),
            mkEx('Chọn câu đúng dấu câu:', ['It was late, therefore, we left.', 'It was late; therefore, we left.', 'It was late therefore we left.', 'It was late, therefore we left.'], 1, 'Dùng chấm phẩy trước "therefore" và dấu phẩy ngay sau nó.'),
            mkEx('They invested heavily ___ remain competitive.', ['so that', 'so as to', 'therefore', 'whereas'], 1, '"so as to + V(inf)" chỉ mục đích.')
          ]
        },
        {
          id: 'gr-b2-10', lessonNumber: 10, category: 'Mệnh đề danh từ', title: 'Noun Clauses (What / Whether / The fact that)', titleVi: 'Mệnh đề danh từ làm chủ ngữ & tân ngữ', cefr: 'B2',
          formula: 'What + S + V + is... · Whether + S + V + depends on...',
          explanationVi: 'Biến cả một mệnh đề thành chủ ngữ hoặc tân ngữ giúp câu văn súc tích, chuyên nghiệp và đậm chất học thuật.',
          ieltsTipVi: 'Cách mở đầu lập luận sắc sảo cho IELTS Writing Task 2: "Whether remote work boosts productivity depends largely on management."',
          examples: [{ en: 'What matters most in language learning is daily consistency.', vi: 'Điều quan trọng nhất trong việc học ngoại ngữ là sự đều đặn mỗi ngày.' }, { en: 'The fact that housing is unaffordable concerns young graduates.', vi: 'Thực tế là nhà ở vượt quá khả năng chi trả khiến sinh viên mới ra trường lo lắng.' }],
          commonMistake: { wrong: 'That whether he comes or not is unclear.', right: 'Whether he comes or not is unclear.', whyVi: 'Không ghép thừa "That" trước "Whether".' },
          exercises: [
            mkEx('___ surprises many tourists is how affordable street food is.', ['That', 'What', 'Which', 'Where'], 1, '"What" (= The thing that) làm chủ ngữ mệnh đề danh từ.'),
            mkEx('___ the policy will succeed remains to be seen.', ['If', 'Whether', 'What', 'Which'], 1, 'Đầu câu làm chủ ngữ chỉ dùng "Whether", không dùng "If".'),
            mkEx('I’m not sure ___ caused the sudden drop in traffic.', ['that', 'what', 'which', 'how'], 1, '"what" làm chủ ngữ của "caused".'),
            mkEx('The ___ that plastic takes centuries to decompose is alarming.', ['thing', 'reason', 'fact', 'idea of'], 2, 'Cụm cố định "The fact that + Clause".')
          ]
        }
      ]
    },
    c1: {
      id: 'grammar-c1',
      cefr: 'C1',
      titleVi: 'Ngữ pháp sắc bén & Band 7.5–8.0 (C1)',
      descVi: 'Đảo ngữ nhấn mạnh, câu chẻ (Cleft), ngôn ngữ rào đón học thuật (Hedging) và danh từ hóa.',
      lessons: [
        {
          id: 'gr-c1-01', lessonNumber: 1, category: 'Đảo ngữ', title: 'Negative Inversion (Not only... but also)', titleVi: 'Đảo ngữ nhấn mạnh (Not only / Rarely / Seldom)', cefr: 'C1',
          formula: 'Not only + Aux + S + V, but S + also + V',
          explanationVi: 'Khi đưa trạng từ phủ định/giới hạn lên đầu câu (Not only, Rarely, Never, Little, Under no circumstances), ta đảo trợ động từ lên trước chủ ngữ như câu hỏi.',
          ieltsTipVi: 'Một câu đảo ngữ "Not only does..." đặt đúng chỗ trong IELTS Writing Task 2 tạo điểm nhấn Grammatical Range cực mạnh cho Band 8.0.',
          examples: [{ en: 'Not only does regular exercise improve physical health, but it also sharpens focus.', vi: 'Tập thể dục đều đặn không chỉ cải thiện thể chất mà còn tăng sự tập trung.' }, { en: 'Rarely have we seen such rapid technological disruption.', vi: 'Hiếm khi chúng ta chứng kiến sự biến đổi công nghệ nhanh đến vậy.' }],
          commonMistake: { wrong: 'Not only it saves time, but it also reduces costs.', right: 'Not only does it save time, but it also reduces costs.', whyVi: 'Phải đảo trợ động từ "does" lên trước chủ ngữ "it".' },
          exercises: [
            mkEx('Not only ___ renewable energy cut emissions, but it also creates jobs.', ['does', 'is', 'do', 'has'], 0, 'Đảo trợ động từ "does" trước chủ ngữ số ít "renewable energy".'),
            mkEx('Seldom ___ such a compelling argument.', ['I have heard', 'have I heard', 'did I heard', 'heard I'], 1, 'Sau "Seldom" đầu câu -> đảo "have I heard".'),
            mkEx('Under no circumstances ___ confidential data be shared.', ['should', 'it should', 'does', 'is'], 0, 'Đảo modal "should" lên trước chủ ngữ.'),
            mkEx('Little ___ realize how influential the decision would become.', ['they did', 'did they', 'they', 'were they'], 1, '"Little + did + S + V(inf)".')
          ]
        },
        {
          id: 'gr-c1-02', lessonNumber: 2, category: 'Câu chẻ', title: 'Cleft Sentences (It is... that / What... is)', titleVi: 'Câu chẻ nhấn mạnh trọng tâm', cefr: 'C1',
          formula: 'It is/was + [trọng tâm] + that/who + ... · What + S + V + is + [trọng tâm]',
          explanationVi: 'Dùng để chiếu đèn spotlight vào đúng thành phần muốn nhấn mạnh trong lập luận hoặc phản biện.',
          ieltsTipVi: 'Rất tự nhiên trong cả IELTS Speaking Part 3 lẫn Writing Task 2 khi muốn khẳng định nguyên nhân cốt lõi.',
          examples: [{ en: 'It is the lack of practical exposure that holds many learners back.', vi: 'Chính việc thiếu tiếp xúc thực tế mới là thứ kìm hãm nhiều người học.' }, { en: 'What governments truly need to prioritize is preventive healthcare.', vi: 'Điều các chính phủ thực sự cần ưu tiên là y tế dự phòng.' }],
          commonMistake: { wrong: 'It is consistency what makes the difference.', right: 'It is consistency that makes the difference.', whyVi: 'Trong cấu trúc "It is ... that", dùng "that" (hoặc "who"), không dùng "what".' },
          exercises: [
            mkEx('It was his calm attitude ___ defused the tense negotiation.', ['what', 'that', 'where', 'whose'], 1, 'Câu chẻ "It was ... that".'),
            mkEx('___ consumers care about most is transparent pricing.', ['It', 'That', 'What', 'Which'], 2, '"What + S + V + is...".'),
            mkEx('It is only by collaborating ___ we can solve global warming.', ['which', 'what', 'that', 'when'], 2, 'Nhấn mạnh cụm trạng ngữ dùng "that".'),
            mkEx('What really frustrates commuters ___ unpredictable delays.', ['are', 'is', 'were', 'be'], 1, 'Mệnh đề "What..." làm chủ ngữ đi với động từ số ít "is" (hoặc "are" khi nhấn mạnh danh từ số nhiều, chuẩn phổ biến là "is").')
          ]
        },
        {
          id: 'gr-c1-03', lessonNumber: 3, category: 'Văn phong IELTS', title: 'Academic Hedging & Cautious Language', titleVi: 'Ngôn ngữ rào đón học thuật (Tránh khẳng định cực đoan)', cefr: 'C1',
          formula: 'tend to · appear to · is likely to · arguably · to a large extent',
          explanationVi: 'Văn phong học thuật tiếng Anh tránh tuyệt đối hóa ("always", "proves", "all people"). Thay vào đó dùng hedging để lập luận chặt chẽ, thuyết phục và khó bị bắt bẻ.',
          ieltsTipVi: 'Khác biệt rõ nhất giữa bài Writing Band 6.5 (khẳng định cực đoan) và Band 8.0 (lập luận cân bằng, có mức độ).',
          examples: [{ en: 'Excessive screen time appears to correlate with shorter attention spans.', vi: 'Thời gian dùng màn hình quá mức dường như có tương quan với việc giảm khả năng tập trung.' }, { en: 'This trend is likely to reshape higher education over the next decade.', vi: 'Xu hướng này nhiều khả năng sẽ định hình lại giáo dục đại học trong thập kỷ tới.' }],
          commonMistake: { wrong: 'Social media always destroys teenagers’ mental health.', right: 'Excessive social media use can negatively affect teenagers’ mental health.', whyVi: 'Tránh khẳng định tuyệt đối "always destroys"; dùng modal/hedging hợp lý hơn.' },
          exercises: [
            mkEx('Young professionals ___ prioritize work-life balance over status.', ['tend to', 'always must', 'certainly', 'are tending'], 0, '"tend to + V" diễn tả xu hướng phổ biến.'),
            mkEx('Strict zoning laws are ___ to ease housing shortages.', ['unlikely', 'impossible that', 'never', 'definitely not to'], 0, '"be likely / unlikely to + V".'),
            mkEx('Automation will, ___ a large extent, transform routine office jobs.', ['in', 'to', 'at', 'for'], 1, 'Cụm cố định "to a large extent".'),
            mkEx('Which sentence uses academic hedging best?', ['AI definitely replaces every teacher.', 'AI may eventually augment many aspects of teaching.', 'AI always ruins schools.', 'Teachers are 100% useless soon.'], 1, '"may eventually augment" mang tính học thuật cân bằng.')
          ]
        },
        {
          id: 'gr-c1-04', lessonNumber: 4, category: 'Danh từ hóa', title: 'Nominalization (Dense Academic Style)', titleVi: 'Danh từ hóa (Nâng cấp câu văn Writing Band 8)', cefr: 'C1',
          formula: 'People rapidly urbanized → Rapid urbanization...',
          explanationVi: 'Biến động từ/tính từ thành cụm danh từ giúp câu ngắn gọn, trang trọng và tăng mật độ thông tin học thuật.',
          ieltsTipVi: 'Thay "Because the city grew fast, people had no homes" bằng "Rapid urban expansion has triggered an acute housing shortage."',
          examples: [{ en: 'The rapid expansion of e-commerce has reshaped retail.', vi: 'Sự mở rộng nhanh chóng của thương mại điện tử đã định hình lại ngành bán lẻ.' }, { en: 'A sharp decline in biodiversity poses severe ecological risks.', vi: 'Sự suy giảm mạnh đa dạng sinh học đặt ra rủi ro sinh thái nghiêm trọng.' }],
          commonMistake: { wrong: 'The grow of population caused pollution.', right: 'Population growth has contributed to pollution.', whyVi: 'Cần dùng danh từ "growth" thay vì động từ "grow".' },
          exercises: [
            mkEx('The ___ of clean energy requires sustained public investment.', ['adopt', 'adoption', 'adopting', 'adopted'], 1, 'Sau "The ... of" cần danh từ "adoption".'),
            mkEx('Widespread ___ of AI tools has accelerated software delivery.', ['integrate', 'integrated', 'integration', 'integrating'], 2, 'Danh từ hóa của "integrate" -> "integration".'),
            mkEx('There has been a noticeable ___ in air quality since 2022.', ['improve', 'improvement', 'improving', 'improved'], 1, 'Cụm danh từ "a noticeable improvement".'),
            mkEx('Their ___ to compromise stalled the negotiations.', ['refuse', 'refusal', 'refusing', 'refused'], 1, 'Danh từ của "refuse" -> "refusal".')
          ]
        },
        {
          id: 'gr-c1-05', lessonNumber: 5, category: 'Câu điều kiện nâng cao', title: 'Inverted Conditionals (Should / Were / Had)', titleVi: 'Đảo ngữ câu điều kiện (Bỏ "If")', cefr: 'C1',
          formula: 'Should + S + V (Loại 1) · Were + S + to V (Loại 2) · Had + S + V3 (Loại 3)',
          explanationVi: 'Bỏ "If" và đảo "Should / Were / Had" lên đầu câu tạo văn phong trang trọng, chuẩn mực cho email công sở cấp cao và IELTS Writing.',
          ieltsTipVi: 'Cực kỳ ấn tượng trong Writing Task 2: "Were governments to subsidize EVs further, adoption rates would surge."',
          examples: [{ en: 'Should you require any further details, please hesitate not to reach out.', vi: 'Nếu bạn cần thêm bất kỳ chi tiết nào, vui lòng liên hệ ngay.' }, { en: 'Had the committee intervened earlier, the crisis could have been averted.', vi: 'Nếu ủy ban can thiệp sớm hơn, cuộc khủng hoảng đã có thể tránh được.' }],
          commonMistake: { wrong: 'Had I knew about the change, I would have adjusted.', right: 'Had I known about the change, I would have adjusted.', whyVi: 'Sau "Had + S" phải là V3 ("known"), không phải V2 ("knew").' },
          exercises: [
            mkEx('___ the project fail to meet safety standards, it will be halted.', ['Should', 'Would', 'Did', 'Were'], 0, 'Đảo ngữ điều kiện loại 1 -> "Should + S + V(inf)".'),
            mkEx('___ they to cut taxes, consumer spending would likely rebound.', ['Should', 'Had', 'Were', 'Did'], 2, 'Đảo ngữ loại 2 -> "Were + S + to V".'),
            mkEx('___ we checked the logs earlier, we would have spotted the bug.', ['Were', 'Should', 'Had', 'If had'], 2, 'Đảo ngữ loại 3 -> "Had + S + V3".'),
            mkEx('___ you need assistance, our support desk is open 24/7.', ['Had', 'Should', 'Were', 'Would'], 1, 'Trang trọng loại 1 -> "Should you need...".')
          ]
        },
        {
          id: 'gr-c1-06', lessonNumber: 6, category: 'Thức giả định', title: 'Subjunctive Mood (Recommend / Essential that)', titleVi: 'Thức giả định trang trọng', cefr: 'C1',
          formula: 'suggest/recommend/insist/essential + that + S + (should) + V(nguyên mẫu)',
          explanationVi: 'Sau các động từ/tính từ mang tính đề xuất hoặc yêu cầu cấp thiết, động từ trong mệnh đề "that" giữ nguyên mẫu không chia "-s" hay quá khứ (kể cả với He/She/It).',
          ieltsTipVi: 'Đưa khuyến nghị cực kỳ chuyên nghiệp: "It is imperative that every citizen reduce single-use plastic."',
          examples: [{ en: 'Experts recommend that the city expand its metro network.', vi: 'Các chuyên gia khuyến nghị thành phố nên mở rộng mạng lưới tàu điện ngầm.' }, { en: 'It is essential that every applicant submit original documents.', vi: 'Điều thiết yếu là mọi ứng viên phải nộp giấy tờ gốc.' }],
          commonMistake: { wrong: 'The board insisted that the CEO resigns.', right: 'The board insisted that the CEO resign.', whyVi: 'Trong thức giả định, động từ "resign" giữ nguyên mẫu.' },
          exercises: [
            mkEx('It is vital that the policy ___ implemented fairly.', ['is', 'be', 'was', 'being'], 1, 'Thức giả định bị động -> "be + V3".'),
            mkEx('The doctor recommended that he ___ his caffeine intake.', ['reduces', 'reduced', 'reduce', 'reducing'], 2, 'Giữ nguyên mẫu "reduce" sau "recommend that".'),
            mkEx('They demanded that the company ___ full compensation.', ['pays', 'paid', 'pay', 'paying'], 2, '"demand that + S + V(inf)".'),
            mkEx('It is crucial that she ___ informed immediately.', ['is', 'be', 'will be', 'was'], 1, '"It is crucial that + S + be + V3".')
          ]
        },
        {
          id: 'gr-c1-07', lessonNumber: 7, category: 'Liên kết nâng cao', title: 'Complex Concession (Albeit / Much as / Even though)', titleVi: 'Nhượng bộ nâng cao (Albeit / Much as / Notwithstanding)', cefr: 'C1',
          formula: 'albeit + Adj/Adv/Phrase · Much as + S + V, Clause',
          explanationVi: '"Albeit" (= mặc dù) rất gọn vì chỉ cần tính từ/cụm ngắn phía sau (không cần mệnh đề đầy đủ); "Much as" mở đầu câu thừa nhận một phần rồi phản biện.',
          ieltsTipVi: 'Tạo sắc thái tự nhiên và tinh tế hiếm gặp trong Writing Task 1 & 2 ("Growth resumed, albeit at a slower pace.").',
          examples: [{ en: 'The economy recovered steadily, albeit at a modest pace.', vi: 'Nền kinh tế phục hồi ổn định, dù với tốc độ khiêm tốn.' }, { en: 'Much as I admire digital books, I still prefer paper copies.', vi: 'Dù rất thích sách điện tử, tôi vẫn chuộng sách giấy hơn.' }],
          commonMistake: { wrong: 'The solution worked, albeit it was expensive.', right: 'The solution worked, albeit expensively / albeit at high cost.', whyVi: '"albeit" không theo sau bởi mệnh đề đầy đủ S+V.' },
          exercises: [
            mkEx('She completed the marathon, ___ with a minor ankle injury.', ['although', 'albeit', 'whereas', 'however'], 1, 'Trước cụm giới từ không có động từ -> dùng "albeit".'),
            mkEx('___ as I respect his experience, I disagree with this proposal.', ['Very', 'Much', 'So', 'Even'], 1, 'Cụm nhượng bộ cố định "Much as + S + V".'),
            mkEx('The software is powerful, ___ somewhat unintuitive for novices.', ['albeit', 'even though', 'despite of', 'whereas'], 0, '"albeit + Adj phrase".'),
            mkEx('___ the initial setbacks, the research yielded breakthroughs.', ['Albeit', 'Notwithstanding', 'Whereas', 'Much as'], 1, '"Notwithstanding + Noun" = Mặc cho (trang trọng).')
          ]
        },
        {
          id: 'gr-c1-08', lessonNumber: 8, category: 'Mệnh đề quan hệ nâng cao', title: 'Preposition + Relative Pronoun (In which / By whom)', titleVi: 'Giới từ + Đại từ quan hệ (Trang trọng)', cefr: 'C1',
          formula: 'N + in which / through which / to which / of which',
          explanationVi: 'Đặt giới từ trước "which/whom" tạo văn phong học thuật chuẩn xác, tránh để giới từ lơ lửng cuối câu trong văn viết.',
          ieltsTipVi: 'Cụm "the extent to which...", "the manner in which...", "the platform through which..." là dấu ấn đặc trưng của Writing Band 8.0.',
          examples: [{ en: 'The extent to which AI replaces human judgment remains debated.', vi: 'Mức độ mà AI thay thế phán đoán con người vẫn đang được tranh luận.' }, { en: 'We need an environment in which creativity can flourish.', vi: 'Chúng ta cần một môi trường nơi sự sáng tạo có thể nở rộ.' }],
          commonMistake: { wrong: 'The extent to that automation helps varies.', right: 'The extent to which automation helps varies.', whyVi: 'Sau giới từ ("to", "in", "by") chỉ dùng "which/whom", không dùng "that".' },
          exercises: [
            mkEx('The degree ___ which stress affects sleep varies by individual.', ['in', 'to', 'on', 'at'], 1, 'Cụm cố định "the degree/extent to which".'),
            mkEx('There are several mechanisms ___ which vaccines build immunity.', ['by', 'who', 'that', 'what'], 0, '"mechanisms by/through which".'),
            mkEx('She cited three studies, two of ___ were published in 2025.', ['them', 'that', 'which', 'what'], 2, 'Sau dấu phẩy nối 1 câu phải dùng đại từ quan hệ "two of which".'),
            mkEx('The criteria ___ which applicants are judged must be transparent.', ['by', 'to', 'at', 'of'], 0, '"judge by criteria" -> "the criteria by which".')
          ]
        },
        {
          id: 'gr-c1-09', lessonNumber: 9, category: 'So sánh nâng cao', title: 'Double Comparatives & Proportional Change', titleVi: 'So sánh kép (Càng... càng...)', cefr: 'C1',
          formula: 'The + comparative..., the + comparative...',
          explanationVi: 'Diễn tả mối quan hệ tỷ lệ thuận hoặc nghịch giữa hai yếu tố một cách cực kỳ cô đọng và thuyết phục.',
          ieltsTipVi: 'Cấu trúc "The more..., the more..." dùng được ở cả Speaking lẫn Writing Task 2 để tóm gọn luận điểm.',
          examples: [{ en: 'The more actively you recall words, the longer you retain them.', vi: 'Bạn càng chủ động gợi nhớ từ vựng, bạn càng nhớ chúng lâu hơn.' }, { en: 'The denser a city becomes, the higher the demand for transit.', vi: 'Thành phố càng đông đúc, nhu cầu giao thông công cộng càng cao.' }],
          commonMistake: { wrong: 'More you practice, better you speak.', right: 'The more you practice, the better you speak.', whyVi: 'Bắt buộc có mạo từ "The" ở đầu cả hai vế.' },
          exercises: [
            mkEx('The earlier children learn music, ___ easily they develop rhythm.', ['more', 'the more', 'most', 'the most'], 1, 'Cấu trúc "The + so sánh hơn..., the + so sánh hơn...".'),
            mkEx('___ flexible a workplace is, the higher employee retention tends to be.', ['More', 'The more', 'Most', 'As'], 1, 'Đầu vế 1 bắt buộc có "The more".'),
            mkEx('The less sleep you get, ___ your concentration becomes.', ['worse', 'the worse', 'the worst', 'badder'], 1, '"the worse" (so sánh hơn của bad).'),
            mkEx('The faster technology evolves, the ___ lifelong learning becomes.', ['more essential', 'most essential', 'essential', 'essentialer'], 0, '"the more + adj dài".')
          ]
        },
        {
          id: 'gr-c1-10', lessonNumber: 10, category: 'Tỉnh lược & Thay thế', title: 'Ellipsis & Substitution (Do so / Those of / One)', titleVi: 'Tỉnh lược & Thay thế tránh lặp từ', cefr: 'C1',
          formula: 'do so (thay cả cụm động từ) · that of / those of (thay danh từ khi so sánh)',
          explanationVi: 'Thay vì lặp lại nguyên cụm từ dài trong câu so sánh hoặc câu nối tiếp, dùng "do so", "that of", "those of" để câu gọn và đạt điểm Cohesion cực cao.',
          ieltsTipVi: 'Cực kỳ quan trọng trong IELTS Writing Task 1: "The GDP of Country A exceeded that of Country B."',
          examples: [{ en: 'Many people want to switch careers, yet few actually do so.', vi: 'Nhiều người muốn chuyển ngành, nhưng rất ít người thực sự làm vậy.' }, { en: 'Salaries in tech are generally higher than those in hospitality.', vi: 'Mức lương ngành công nghệ thường cao hơn mức lương ngành dịch vụ.' }],
          commonMistake: { wrong: 'The climate of Da Lat is cooler than Hanoi.', right: 'The climate of Da Lat is cooler than that of Hanoi.', whyVi: 'Phải so sánh "khí hậu" với "khí hậu" ("that of Hanoi"), không so sánh khí hậu với thành phố.' },
          exercises: [
            mkEx('The population of Tokyo is much larger than ___ of Zurich.', ['this', 'that', 'those', 'it'], 1, 'Thay thế cho danh từ số ít "population" -> "that of".'),
            mkEx('Carbon emissions in industry far exceed ___ in agriculture.', ['that', 'those', 'them', 'which'], 1, 'Thay thế cho danh từ số nhiều "emissions" -> "those".'),
            mkEx('She promised to review the contract, and she promptly ___.', ['did so', 'made so', 'did it so', 'so did'], 0, 'Thay thế cho cả hành động "reviewed the contract" -> "did so".'),
            mkEx('If you haven’t backed up your data, I strongly advise you to ___.', ['do so', 'make it', 'be so', 'doing so'], 0, '"to do so" thay cho "to back up your data".')
          ]
        }
      ]
    },
    c2: {
      id: 'grammar-c2',
      cefr: 'C2',
      titleVi: 'Ngữ pháp tinh thông & Tu từ (C2)',
      descVi: 'Cấu trúc tu từ học thuật, đảo ngữ phức hợp, sắc thái tinh tế cho mục tiêu IELTS 8.5+ và viết chuyên sâu.',
      lessons: [
        {
          id: 'gr-c2-01', lessonNumber: 1, category: 'Đảo ngữ nâng cao', title: 'Fronting & Locative / Adjectival Inversion', titleVi: 'Đảo cụm tính từ / phân từ lên đầu câu', cefr: 'C2',
          formula: 'Equally important is... · Central to this debate is... · Attached is...',
          explanationVi: 'Đưa cụm tính từ hoặc cụm giới từ lên đầu câu rồi đảo động từ "be" giúp liên kết ý giữa hai đoạn văn mượt mà ở đẳng cấp xuất bản.',
          ieltsTipVi: 'Chuyển đoạn IELTS Writing Task 2 cực mượt: "Equally concerning is the growing gap in digital literacy."',
          examples: [{ en: 'Central to this debate is the question of individual privacy.', vi: 'Trọng tâm của cuộc tranh luận này là vấn đề quyền riêng tư cá nhân.' }, { en: 'Equally vital is the role of parental guidance.', vi: 'Quan trọng không kém là vai trò định hướng của phụ huynh.' }],
          commonMistake: { wrong: 'Equally important are the funding for schools.', right: 'Equally important is the funding for schools.', whyVi: 'Động từ chia theo chủ ngữ đứng sau ("the funding" — số ít -> "is").' },
          exercises: [
            mkEx('Central to sustainable growth ___ investment in education.', ['are', 'is', 'were', 'be'], 1, 'Chủ ngữ đứng sau là "investment" (số ít) -> "is".'),
            mkEx('Equally pressing ___ the challenges posed by aging populations.', ['is', 'are', 'was', 'has'], 1, 'Chủ ngữ đứng sau là "the challenges" (số nhiều) -> "are".'),
            mkEx('___ beneath the surface are complex socioeconomic factors.', ['Lie', 'Lying', 'Laid', 'Lies'], 1, 'Đảo cụm phân từ hiện tại "Lying beneath... are...".'),
            mkEx('So profound ___ the shift that entire industries had to adapt.', ['is', 'was', 'were', 'did'], 1, '"So + Adj + was + S + that..." (quá khứ).')
          ]
        },
        {
          id: 'gr-c2-02', lessonNumber: 2, category: 'Mệnh đề độc lập', title: 'Absolute Clauses (Nominative Absolute)', titleVi: 'Cấu trúc tuyệt đối (Bổ sung bối cảnh)', cefr: 'C2',
          formula: 'Noun + Participle / Adj, Main Clause (With + N + V-ing/V3)',
          explanationVi: 'Khác với mệnh đề phân từ rút gọn (phải cùng chủ ngữ), cấu trúc tuyệt đối có CHỦ NGỮ RIÊNG đứng trước phân từ, tạo độ nén thông tin cực cao.',
          ieltsTipVi: 'Tạo câu miêu tả bối cảnh xuất sắc: "All factors considered, remote work remains a net positive."',
          examples: [{ en: 'Weather permitting, the festival will take place outdoors.', vi: 'Nếu thời tiết thuận lợi, lễ hội sẽ diễn ra ngoài trời.' }, { en: 'With inflation easing gradually, consumer confidence has begun to recover.', vi: 'Khi lạm phát hạ nhiệt dần, niềm tin tiêu dùng bắt đầu phục hồi.' }],
          commonMistake: { wrong: 'With prices rising, so families spent less.', right: 'With prices rising, families spent less.', whyVi: 'Không thêm "so" sau cụm trạng ngữ "With + N + V-ing".' },
          exercises: [
            mkEx('All things ___, the pilot program exceeded expectations.', ['considering', 'considered', 'consider', 'to consider'], 1, 'Cụm tuyệt đối bị động cố định "All things considered".'),
            mkEx('Time ___, we will address audience questions at the end.', ['permitted', 'permitting', 'permits', 'to permit'], 1, '"Time/Weather permitting" (chủ động).'),
            mkEx('With resources ___ rapidly, conservation is urgent.', ['depleting', 'depleted by', 'deplete', 'depletes'], 0, '"With + N + V-ing" diễn tả quá trình đang diễn ra.'),
            mkEx('The negotiations ___, both sides issued a joint statement.', ['concluding', 'concluded', 'conclude', 'to conclude'], 1, 'Hành động hoàn tất bị động -> "The negotiations concluded".')
          ]
        },
        {
          id: 'gr-c2-03', lessonNumber: 3, category: 'Điều kiện nâng cao', title: 'But for / Were it not for / Had it not been for', titleVi: 'Cấu trúc "Nếu không nhờ có..."', cefr: 'C2',
          formula: 'But for / Were it not for + Noun, S + would + V · Had it not been for + Noun, S + would have V3',
          explanationVi: 'Cách diễn đạt trang trọng và cô đọng để nhấn mạnh vai trò quyết định của một yếu tố nào đó.',
          ieltsTipVi: 'Rất đắt giá khi lập luận vai trò không thể thiếu của một chính sách/công nghệ trong Writing Task 2.',
          examples: [{ en: 'Had it not been for rapid vaccine development, recovery would have taken years longer.', vi: 'Nếu không nhờ phát triển vắc-xin nhanh chóng, quá trình phục hồi đã mất thêm nhiều năm.' }, { en: 'But for her mentorship, I wouldn’t be leading this team today.', vi: 'Nếu không nhờ sự dìu dắt của chị ấy, hôm nay tôi đã không dẫn dắt nhóm này.' }],
          commonMistake: { wrong: 'Had it not been for he helped me, I would have failed.', right: 'Had it not been for his help, I would have failed.', whyVi: 'Sau giới từ "for" bắt buộc là cụm danh từ ("his help"), không phải mệnh đề.' },
          exercises: [
            mkEx('___ it not for government subsidies, solar panels would remain unaffordable.', ['Had', 'Were', 'Should', 'Was'], 1, 'Trái hiện tại -> "Were it not for + N".'),
            mkEx('Had it not ___ for the backup server, all data would have been lost.', ['be', 'being', 'been', 'was'], 2, 'Trái quá khứ -> "Had it not been for".'),
            mkEx('___ for strict safety protocols, accidents would be far more common.', ['Except', 'But', 'Unless', 'Without to'], 1, 'Cụm cố định "But for + Noun".'),
            mkEx('Had it not been for their quick response, the fire ___ spread.', ['will have', 'would have', 'would', 'had'], 1, 'Mệnh đề chính loại 3 -> "would have + V3".')
          ]
        },
        {
          id: 'gr-c2-04', lessonNumber: 4, category: 'Nhấn mạnh sắc thái', title: 'No Matter / Whatever / However (Concessive)', titleVi: 'Cấu trúc "Dù thế nào đi nữa" (However + Adj)', cefr: 'C2',
          formula: 'However + Adj/Adv + S + V · Whatever + Noun + S + V · No matter how + Adj...',
          explanationVi: 'Phân biệt "However" nối câu (= tuy nhiên) với "However + Adj" (= dù ... đến mức nào đi nữa).',
          ieltsTipVi: 'Câu viết sắc sảo: "However advanced algorithms become, human empathy remains irreplaceable."',
          examples: [{ en: 'However compelling the theory may sound, empirical proof is still required.', vi: 'Dù lý thuyết nghe thuyết phục đến đâu, bằng chứng thực nghiệm vẫn là bắt buộc.' }, { en: 'Whatever obstacles arise, clear communication keeps teams aligned.', vi: 'Dù trở ngại nào phát sinh, giao tiếp rõ ràng vẫn giúp đội ngũ đồng lòng.' }],
          commonMistake: { wrong: 'However hard does he try, he misses the mark.', right: 'However hard he tries, he misses the mark.', whyVi: 'Sau "However + adj/adv" KHÔNG đảo ngữ.' },
          exercises: [
            mkEx('___ ambitious a policy may be, poor execution undermines it.', ['Whatever', 'However', 'Whichever', 'No matter what'], 1, 'Trước tính từ "ambitious" dùng "However".'),
            mkEx('___ path graduates choose, adaptability is essential.', ['However', 'Whichever', 'How', 'Whoever'], 1, 'Trước danh từ có lựa chọn "path" dùng "Whichever / Whatever".'),
            mkEx('No matter ___ persuasive the ad is, consumers check reviews first.', ['what', 'which', 'how', 'when'], 2, 'Trước tính từ "persuasive" dùng "No matter how".'),
            mkEx('___ well-intentioned the law was, it produced unintended side effects.', ['Whatever', 'However', 'Though how', 'Despite'], 1, '"However + adj + S + V".')
          ]
        },
        {
          id: 'gr-c2-05', lessonNumber: 5, category: 'Đảo ngữ thời gian', title: 'No Sooner... Than / Hardly... When', titleVi: 'Đảo ngữ "Vừa mới... thì đã..."', cefr: 'C2',
          formula: 'No sooner + had + S + V3 + than + S + V2 · Hardly/Scarcely + had + S + V3 + when + S + V2',
          explanationVi: 'Nhấn mạnh hai sự kiện nối tiếp nhau gần như tức thì. Chú ý cặp từ cố định: "No sooner ... THAN" và "Hardly/Scarcely ... WHEN".',
          ieltsTipVi: 'Ghi điểm ấn tượng khi kể chuyện cao trào trong Speaking Part 2 hoặc phân tích chuỗi sự kiện lịch sử.',
          examples: [{ en: 'No sooner had the regulation taken effect than emissions began to drop.', vi: 'Quy định vừa mới có hiệu lực thì lượng khí thải đã bắt đầu giảm.' }, { en: 'Hardly had we deployed the update when traffic spiked.', vi: 'Chúng tôi vừa mới triển khai bản cập nhật thì lưu lượng truy cập tăng vọt.' }],
          commonMistake: { wrong: 'No sooner had I arrived when it started raining.', right: 'No sooner had I arrived than it started raining.', whyVi: '"No sooner" bắt buộc đi với "than", không đi với "when".' },
          exercises: [
            mkEx('No sooner had the store opened ___ queues formed outside.', ['when', 'than', 'then', 'that'], 1, 'Cặp cố định "No sooner ... than".'),
            mkEx('Hardly ___ the announcement been made when shares jumped 10%.', ['has', 'did', 'had', 'was'], 2, 'Đảo quá khứ hoàn thành bị động -> "Hardly had ... been made".'),
            mkEx('Scarcely had he sat down ___ his phone buzzed.', ['than', 'when', 'then', 'while'], 1, '"Scarcely / Hardly ... when".'),
            mkEx('No sooner ___ the lecture ended than students rushed to ask questions.', ['did', 'had', 'has', 'was'], 1, 'Cấu trúc chuẩn "No sooner had + S + V3".')
          ]
        },
        {
          id: 'gr-c2-06', lessonNumber: 6, category: 'Tương phản tu từ', title: 'As / Though Inversion (Rich though he is...)', titleVi: 'Đảo tính từ trước As / Though', cefr: 'C2',
          formula: 'Adj / Adv / Bare Noun + as / though + S + V, Main Clause',
          explanationVi: 'Một cách viết nhượng bộ giàu tính văn học và sắc bén: đưa tính từ/trạng từ lên đầu trước "as/though" (= Mặc dù...).',
          ieltsTipVi: 'Câu mở luận điểm đẳng cấp Band 8.5: "Appealing though convenience may be, long-term sustainability matters more."',
          examples: [{ en: 'Attractive though the short-term savings may appear, the hidden costs are huge.', vi: 'Dù khoản tiết kiệm ngắn hạn trông có vẻ hấp dẫn, chi phí ẩn lại rất lớn.' }, { en: 'Try as they might, they could not replicate the result.', vi: 'Dù cố gắng hết sức, họ vẫn không thể tái tạo kết quả đó.' }],
          commonMistake: { wrong: 'A clever though student she is, she still revises daily.', right: 'Clever though she is, she still revises daily.', whyVi: 'Đưa tính từ "Clever" đứng thẳng trước "though".' },
          exercises: [
            mkEx('___ though the task seemed, the team delivered ahead of time.', ['Daunting', 'Although daunting', 'How daunting', 'Despite daunting'], 0, 'Đưa tính từ "Daunting" lên trước "though".'),
            mkEx('Strange ___ it may sound, silence often boosts creativity.', ['although', 'as', 'that', 'like'], 1, '"Adj + as/though + S + V".'),
            mkEx('Hard ___ they tried, the negotiators reached a stalemate.', ['though', 'although', 'however', 'despite'], 0, '"Adv + though/as + S + V".'),
            mkEx('___ as she is, she remains remarkably humble.', ['A genius', 'Genius', 'The genius', 'Geniuses'], 1, 'Danh từ đảo trước "as/though" bỏ mạo từ "a/an" -> "Genius as she is".')
          ]
        },
        {
          id: 'gr-c2-07', lessonNumber: 7, category: 'Nhấn mạnh chuẩn mực', title: 'Not Until / Only After / Only By Inversion', titleVi: 'Đảo ngữ ở mệnh đề chính (Not until / Only after)', cefr: 'C2',
          formula: 'Not until + [thời điểm / mệnh đề] + Aux + S + V (đảo ở mệnh đề CHÍNH)',
          explanationVi: 'Bẫy kinh điển C2: khi "Not until / Only when / Only after" đứng đầu câu, KHÔNG đảo ở mệnh đề phụ ngay sau nó — mà đảo ngữ ở **mệnh đề chính** phía sau!',
          ieltsTipVi: 'Thể hiện kiểm soát cấu trúc câu phức tuyệt đối ở cấp độ C2.',
          examples: [{ en: 'Not until the data was audited did the discrepancy come to light.', vi: 'Mãi cho đến khi dữ liệu được kiểm toán thì sự chênh lệch mới lộ ra.' }, { en: 'Only by addressing root causes can cities reduce crime sustainably.', vi: 'Chỉ bằng cách giải quyết tận gốc thì các thành phố mới giảm tội phạm bền vững.' }],
          commonMistake: { wrong: 'Only when did I move abroad I appreciated home cooking.', right: 'Only when I moved abroad did I appreciate home cooking.', whyVi: 'Đảo trợ động từ "did" ở mệnh đề chính ("did I appreciate"), không đảo ở mệnh đề "when".' },
          exercises: [
            mkEx('Not until midnight ___ the storm finally subside.', ['did', 'it did', 'had', 'was'], 0, 'Đảo "did" trước chủ ngữ "the storm" + động từ nguyên mẫu "subside".'),
            mkEx('Only after reviewing every report ___ the pattern emerge.', ['did', 'does it', 'had it', 'was'], 0, 'Đảo ngữ mệnh đề chính ở quá khứ -> "did the pattern emerge".'),
            mkEx('Only by investing in teachers ___ we elevate educational outcomes.', ['can', 'we can', 'do we can', 'are'], 0, '"Only by + V-ing + can + S + V".'),
            mkEx('Only when consumers demand change ___ corporations truly pivot.', ['will', 'they will', 'are', 'have'], 0, 'Đảo "will" ở mệnh đề chính.')
          ]
        },
        {
          id: 'gr-c2-08', lessonNumber: 8, category: 'Chính xác hóa ngữ nghĩa', title: 'Participle & Infinitive Passive Nuances', titleVi: 'Sắc thái bị động với To-V & Danh động từ', cefr: 'C2',
          formula: 'deserve/need + V-ing (= to be V3) · resent + being V3 · appear + to have been V3',
          explanationVi: 'Diễn tả hành động bị động ở dạng danh động từ ("being overlooked") hoặc nguyên mẫu hoàn thành ("to have been underestimated") với độ chính xác cực cao.',
          ieltsTipVi: 'Rất hữu dụng khi phân tích vấn đề xã hội: "Rural communities often resent being excluded from policy decisions."',
          examples: [{ en: 'The long-term costs appear to have been severely underestimated.', vi: 'Chi phí dài hạn dường như đã bị đánh giá thấp nghiêm trọng.' }, { en: 'This outdated infrastructure urgently needs upgrading.', vi: 'Cơ sở hạ tầng lỗi thời này cần khẩn trương được nâng cấp.' }],
          commonMistake: { wrong: 'Nobody likes to being interrupted.', right: 'Nobody likes being interrupted.', whyVi: 'Dùng "likes being V3" hoặc "likes to be V3", không trộn cả "to" và "being".' },
          exercises: [
            mkEx('The manuscript is thought ___ in the 14th century.', ['to write', 'to be writing', 'to have been written', 'writing'], 2, 'Bị động hoàn thành -> "to have been written".'),
            mkEx('Employees appreciate ___ openly about company restructuring.', ['informing', 'being informed', 'to informing', 'informed'], 1, '"appreciate + being V3" (được thông báo).'),
            mkEx('The proposal warrants ___ before the final vote.', ['reconsidering', 'to reconsider', 'reconsider', 'be reconsidered'], 0, '"warrant / need / require + V-ing" mang nghĩa bị động.'),
            mkEx('She was fortunate ___ offered a fellowship on her first application.', ['to have been', 'having been to', 'to being', 'being to'], 0, '"fortunate + to have been + V3".')
          ]
        },
        {
          id: 'gr-c2-09', lessonNumber: 9, category: 'Mạch lạc học thuật', title: 'Discourse Markers for Synthesis & Nuance', titleVi: 'Từ nối tổng hợp & chuyển sắc thái C2', cefr: 'C2',
          formula: 'That said, ... · By the same token, ... · In light of..., ... · Conversely, ...',
          explanationVi: 'Thay thế các từ nối mòn cũ ("Besides", "In conclusion", "On the other hand") bằng các dấu hiệu diễn ngôn tự nhiên của người viết học thuật bản xứ.',
          ieltsTipVi: 'Giúp bài Writing đạt Band 8.0–9.0 tiêu chí Coherence & Cohesion mà không bị cảm giác "học vẹt template".',
          examples: [{ en: 'Remote work cuts overhead. That said, spontaneous collaboration can suffer.', vi: 'Làm việc từ xa giảm chi phí vận hành. Tuy vậy, sự cộng tác ngẫu hứng có thể bị ảnh hưởng.' }, { en: 'In light of recent findings, health guidelines have been updated.', vi: 'Xét theo các phát hiện gần đây, hướng dẫn y tế đã được cập nhật.' }],
          commonMistake: { wrong: 'In the light of the data shows growth...', right: 'In light of the recent data, growth appears steady.', whyVi: '"In light of" là cụm giới từ, theo sau là cụm danh từ.' },
          exercises: [
            mkEx('The plan is ambitious. ___, it faces significant budget hurdles.', ['By the same token', 'That said', 'Likewise', 'Furthermore'], 1, '"That said" = Tuy nói vậy nhưng... (chuyển hướng nhượng bộ mượt).'),
            mkEx('___ of mounting evidence, policymakers tightened air standards.', ['In light', 'On light', 'At light', 'By light'], 0, 'Cụm cố định "In light of + Noun".'),
            mkEx('High interest rates curb inflation; ___, they can slow job growth.', ['similarly', 'conversely', 'moreover', 'hence'], 1, 'Chiều tác động ngược lại -> "conversely".'),
            mkEx('Teachers deserve fair pay. ___, they should have access to modern training.', ['Conversely', 'By the same token', 'Nonetheless', 'Albeit'], 1, '"By the same token" = Tương tự theo cùng lập luận đó.')
          ]
        },
        {
          id: 'gr-c2-10', lessonNumber: 10, category: 'Chính xác ngữ pháp', title: 'Complex Subject-Verb Agreement & Quantifiers', titleVi: 'Hòa hợp chủ - vị trong câu học thuật phức', cefr: 'C2',
          formula: 'The number of + N(nhiều) + V(ít) · A number of + N(nhiều) + V(nhiều) · Neither A nor B + V(theo B)',
          explanationVi: 'Trong câu dài nhiều cụm giới từ xen giữa, luôn xác định đúng danh từ hạt nhân (head noun) để chia động từ chuẩn xác.',
          ieltsTipVi: 'Lỗi chia sai động từ sau "The number of" / "One of the main reasons" là rào cản phổ biến giữ bài ở Band 7.0 thay vì 8.0.',
          examples: [{ en: 'The number of postgraduate applicants has risen sharply since 2020.', vi: 'Số lượng ứng viên sau đại học đã tăng mạnh kể từ năm 2020.' }, { en: 'A growing number of universities are adopting open-access journals.', vi: 'Ngày càng nhiều trường đại học áp dụng tạp chí truy cập mở.' }],
          commonMistake: { wrong: 'One of the most effective strategies are daily spaced repetition.', right: 'One of the most effective strategies is daily spaced repetition.', whyVi: 'Chủ ngữ hạt nhân là "One" (số ít) -> động từ phải là "is".' },
          exercises: [
            mkEx('The number of electric vehicles on the road ___ doubled.', ['have', 'has', 'are', 'were'], 1, '"The number of..." chia động từ số ít -> "has".'),
            mkEx('A significant number of respondents ___ privacy concerns.', ['has raised', 'have raised', 'is raising', 'raises'], 1, '"A number of..." (= many) chia động từ số nhiều -> "have raised".'),
            mkEx('Neither the director nor the engineers ___ convinced by the prototype.', ['was', 'were', 'is', 'has been'], 1, '"Neither A nor B" chia theo B ("the engineers" -> số nhiều "were").'),
            mkEx('Each of the proposed reforms ___ careful scrutiny.', ['require', 'requires', 'are requiring', 'have required'], 1, '"Each of + N(nhiều)" luôn chia động từ số ít -> "requires".')
          ]
        }
      ]
    }
  };

  return grammarByLevel;
}

async function main() {
  fs.mkdirSync(path.join(OUT_DIR, 'topics'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'cefr'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'grammar'), { recursive: true });

  const [wordAtlasRaw, dnizforRaw] = await Promise.all([
    fetchJson(WORD_ATLAS_URL),
    fetchJson(DNIZFOR_OXFORD_URL)
  ]);

  console.log(`Loaded Word Atlas: ${wordAtlasRaw.length} entries, Oxford VI: ${dnizforRaw.length} entries`);

  // Build Vietnamese translation map from dnizfor (MIT)
  const viMap = new Map();
  for (const item of dnizforRaw) {
    const key = String(item?.word || '').trim().toLowerCase();
    if (!key) continue;
    const viEntry = Array.isArray(item.translations)
      ? item.translations.find((t) => t?.language === 'vi' && t?.translation)
      : null;
    if (viEntry?.translation) {
      viMap.set(key, String(viEntry.translation).trim());
    }
  }
  console.log(`Indexed ${viMap.size} pre-built Vietnamese translations from Oxford 3000 dataset.`);

  // Normalize Word Atlas entries
  const normalizedPool = [];
  const seenIds = new Set();
  for (const raw of wordAtlasRaw) {
    const word = String(raw?.w || '').trim();
    const id = String(raw?.id || '').trim();
    const cefr = String(raw?.cefr || 'B1').toUpperCase();
    const topic = String(raw?.topic || 'daily').toLowerCase();
    if (!word || !id || seenIds.has(id) || !CEFR_RANK[cefr]) continue;
    seenIds.add(id);

    const firstSense = Array.isArray(raw.senses) && raw.senses[0] ? raw.senses[0] : {};
    const pos = String(firstSense.pos || 'word').trim();
    const definitionEn = String(firstSense.en || '').trim();
    const ex0 = Array.isArray(raw.ex) && raw.ex[0] ? String(raw.ex[0].en || '').trim() : '';
    const ex1 = Array.isArray(raw.ex) && raw.ex[1] ? String(raw.ex[1].en || '').trim() : '';
    const collocations = Array.isArray(raw.col)
      ? raw.col.map(stripNonEnglishCol).filter(Boolean).slice(0, 3)
      : [];
    const synonyms = Array.isArray(raw.syn)
      ? raw.syn.map((s) => String(s || '').trim()).filter(Boolean).slice(0, 4)
      : [];

    if (!definitionEn || (!ex0 && !ex1)) continue;

    normalizedPool.push({
      id,
      word,
      ipaUs: String(raw.us || raw.uk || '').trim(),
      ipaUk: String(raw.uk || raw.us || '').trim(),
      pos,
      cefr,
      topic,
      meaningVi: viMap.get(word.toLowerCase()) || '',
      definitionEn,
      exampleDailyEn: ex0 || ex1,
      exampleIeltsEn: ex1 || ex0,
      collocations,
      synonyms,
      hasPrebuiltVi: viMap.has(word.toLowerCase())
    });
  }

  // Select curated high-impact subsets for Stage 1 (19 IELTS topics x 100 words + 6 CEFR levels)
  const selectedByTopic = new Map();
  const allSelectedWords = new Map();

  for (const meta of TOPIC_META) {
    const candidates = normalizedPool.filter((w) => w.topic === meta.id);
    // Prioritize entries with clean Vietnamese translation & progressive CEFR difficulty (A2/B1/B2/C1)
    candidates.sort((a, b) => {
      if (a.hasPrebuiltVi !== b.hasPrebuiltVi) return a.hasPrebuiltVi ? -1 : 1;
      return (CEFR_RANK[a.cefr] || 3) - (CEFR_RANK[b.cefr] || 3);
    });
    const picked = candidates.slice(0, 100);
    // Re-sort final 100 smoothly from A1 -> C2 so Lesson 01 is easiest and Lesson 10 is highest band
    picked.sort((a, b) => (CEFR_RANK[a.cefr] || 3) - (CEFR_RANK[b.cefr] || 3) || a.word.localeCompare(b.word));
    selectedByTopic.set(meta.id, picked);
    for (const w of picked) allSelectedWords.set(w.id, w);
  }

  const selectedByCefr = new Map();
  for (const meta of CEFR_VOCAB_META) {
    const candidates = normalizedPool.filter((w) => w.cefr === meta.cefr);
    candidates.sort((a, b) => {
      if (a.hasPrebuiltVi !== b.hasPrebuiltVi) return a.hasPrebuiltVi ? -1 : 1;
      return a.word.localeCompare(b.word);
    });
    const picked = candidates.slice(0, meta.limit);
    selectedByCefr.set(meta.id, picked);
    for (const w of picked) allSelectedWords.set(w.id, w);
  }

  // Batch-translate any remaining words that weren't in dnizfor Oxford VI map
  const missingViList = Array.from(allSelectedWords.values()).filter((w) => !w.meaningVi);
  console.log(`Total unique selected words: ${allSelectedWords.size}. Translating ${missingViList.length} remaining meanings to Vietnamese...`);

  if (missingViList.length > 0) {
    // Translate "word — short English definition" or just word/definition cleanly
    const toTranslate = missingViList.map((w) => w.word);
    const translated = await translateBatchGtx(toTranslate);
    for (let i = 0; i < missingViList.length; i++) {
      const vi = translated[i];
      if (vi && vi.toLowerCase() !== missingViList[i].word.toLowerCase()) {
        missingViList[i].meaningVi = vi;
      } else {
        // Fallback: translate concise English definition if headword came back untranslated
        missingViList[i].meaningVi = vi || missingViList[i].definitionEn;
      }
    }

    // Second pass for words where single-word GTX returned the English word unchanged -> translate definitionEn
    const stillEnglish = missingViList.filter(
      (w) => w.meaningVi.toLowerCase() === w.word.toLowerCase() || w.meaningVi === w.definitionEn
    );
    if (stillEnglish.length > 0) {
      console.log(`Refining ${stillEnglish.length} definitions into natural Vietnamese...`);
      const defVi = await translateBatchGtx(stillEnglish.map((w) => w.definitionEn));
      for (let i = 0; i < stillEnglish.length; i++) {
        if (defVi[i]) stillEnglish[i].meaningVi = defVi[i];
      }
    }
  }

  const stripInternal = ({ hasPrebuiltVi: _drop, ...clean }) => clean;

  // Write 19 IELTS Topic JSON files
  const manifestTopics = [];
  for (let idx = 0; idx < TOPIC_META.length; idx++) {
    const meta = TOPIC_META[idx];
    const words = (selectedByTopic.get(meta.id) || []).map(stripInternal);
    const lessons = buildLessonsFromWords(`topic-${meta.id}`, words);
    const filePayload = {
      id: `topic-${meta.id}`,
      slug: meta.id,
      trackType: 'ielts_topics',
      order: idx + 1,
      titleEn: meta.titleEn,
      titleVi: meta.titleVi,
      descVi: meta.descVi,
      color: meta.color,
      totalWords: words.length,
      totalLessons: lessons.length,
      lessons
    };
    fs.writeFileSync(path.join(OUT_DIR, 'topics', `${meta.id}.json`), JSON.stringify(filePayload), 'utf8');
    manifestTopics.push({
      id: filePayload.id,
      slug: meta.id,
      order: idx + 1,
      titleEn: meta.titleEn,
      titleVi: meta.titleVi,
      descVi: meta.descVi,
      color: meta.color,
      totalWords: words.length,
      totalLessons: lessons.length,
      dataPath: `/curriculum/topics/${meta.id}.json`
    });
  }

  // Write 6 CEFR Vocabulary JSON files
  const manifestCefrVocab = [];
  for (let idx = 0; idx < CEFR_VOCAB_META.length; idx++) {
    const meta = CEFR_VOCAB_META[idx];
    const words = (selectedByCefr.get(meta.id) || []).map(stripInternal);
    const lessons = buildLessonsFromWords(`cefr-${meta.id}`, words);
    const filePayload = {
      id: `cefr-${meta.id}`,
      slug: meta.id,
      cefr: meta.cefr,
      trackType: 'cefr_vocab',
      order: idx + 1,
      titleEn: `CEFR ${meta.cefr} Core Vocabulary`,
      titleVi: meta.titleVi,
      descVi: meta.descVi,
      totalWords: words.length,
      totalLessons: lessons.length,
      lessons
    };
    fs.writeFileSync(path.join(OUT_DIR, 'cefr', `${meta.id}.json`), JSON.stringify(filePayload), 'utf8');
    manifestCefrVocab.push({
      id: filePayload.id,
      slug: meta.id,
      cefr: meta.cefr,
      order: idx + 1,
      titleEn: filePayload.titleEn,
      titleVi: meta.titleVi,
      descVi: meta.descVi,
      totalWords: words.length,
      totalLessons: lessons.length,
      dataPath: `/curriculum/cefr/${meta.id}.json`
    });
  }

  // Write 6 CEFR Grammar JSON files
  const grammarData = buildGrammarCurriculum();
  const manifestGrammar = [];
  const grammarLevels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
  for (let idx = 0; idx < grammarLevels.length; idx++) {
    const slug = grammarLevels[idx];
    const unit = grammarData[slug];
    const filePayload = {
      ...unit,
      slug,
      trackType: 'grammar',
      order: idx + 1,
      totalLessons: unit.lessons.length
    };
    fs.writeFileSync(path.join(OUT_DIR, 'grammar', `${slug}.json`), JSON.stringify(filePayload), 'utf8');
    manifestGrammar.push({
      id: unit.id,
      slug,
      cefr: unit.cefr,
      order: idx + 1,
      titleEn: `CEFR ${unit.cefr} Grammar`,
      titleVi: unit.titleVi,
      descVi: unit.descVi,
      totalLessons: unit.lessons.length,
      dataPath: `/curriculum/grammar/${slug}.json`
    });
  }

  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    attributions: [
      { name: 'Word Atlas (IELTS & CEFR)', url: 'https://github.com/designfuchen/word-atlas', license: 'MIT / CC BY 4.0' },
      { name: 'Oxford 3000 Multilingual Flashcards', url: 'https://github.com/dnizfor/vocabulary-flashcard-dataset', license: 'MIT' },
      { name: 'CEFR-J Open Language Profiles', url: 'https://github.com/openlanguageprofiles/olp-en-cefrj', license: 'CC BY-SA 4.0' }
    ],
    stats: {
      totalIeltsTopics: manifestTopics.length,
      totalIeltsWords: manifestTopics.reduce((acc, t) => acc + t.totalWords, 0),
      totalCefrWords: manifestCefrVocab.reduce((acc, c) => acc + c.totalWords, 0),
      totalGrammarLessons: manifestGrammar.reduce((acc, g) => acc + g.totalLessons, 0)
    },
    ieltsTopics: manifestTopics,
    cefrVocab: manifestCefrVocab,
    grammar: manifestGrammar
  };

  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('✅ Curriculum generated successfully:', JSON.stringify(manifest.stats));
}

main().catch((err) => {
  console.error('❌ Failed to build curriculum data:', err);
  process.exit(1);
});
