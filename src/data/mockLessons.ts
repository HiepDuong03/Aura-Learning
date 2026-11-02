import { VideoLesson, SavedWord } from '../types';

export const MOCK_LESSONS: VideoLesson[] = [
  {
    id: 'lesson-1',
    youtubeId: 'RKK7wGAYP6k',
    title: 'How language shapes the way we think',
    channel: 'TED / Lera Boroditsky',
    channelAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    thumbnail: 'https://img.youtube.com/vi/RKK7wGAYP6k/maxresdefault.jpg',
    level: 'B1',
    topic: 'Language Learning',
    duration: '14:08',
    durationSec: 848,
    views: '14M',
    description: 'There are about 7,000 languages spoken around the world — and they all have different sounds, vocabularies and structures.',
    subtitles: [
      {
            id: "s1-1",
            start: 12.94,
            end: 15.52,
            text: "So, I'll be speaking to you using language ...",
            translation: "Tôi đang trò chuyện với các bạn  bằng ngôn ngữ"
      },
      {
            id: "s1-2",
            start: 16.09,
            end: 17.61,
            text: "because I can.",
            translation: "bởi vì tôi có thể."
      },
      {
            id: "s1-3",
            start: 17.63,
            end: 20.79,
            text: "This is one these magical abilities that we humans have.",
            translation: "Đây là một trong những khả năng kì diệu của con người."
      },
      {
            id: "s1-4",
            start: 21.11,
            end: 25.07,
            text: "We can transmit really complicated thoughts to one another.",
            translation: "Ta có thể truyền tải  cả những suy nghĩ phức tạp nhất."
      },
      {
            id: "s1-5",
            start: 25.48,
            end: 29.07,
            text: "So what I'm doing right now is, I'm making sounds with my mouth",
            translation: "Và điều tôi đang làm, ngay lúc này, chính là tạo ra âm thanh từ miệng"
      },
      {
            id: "s1-6",
            start: 29.1,
            end: 30.31,
            text: "as I'm exhaling.",
            translation: "khi thở ra."
      },
      {
            id: "s1-7",
            start: 30.34,
            end: 32.69,
            text: "I'm making tones and hisses and puffs,",
            translation: "Tôi tạo ra âm điệu, tiếng rít  và cả tiếng thở,"
      },
      {
            id: "s1-8",
            start: 32.71,
            end: 35.72,
            text: "and those are creating air vibrations in the air.",
            translation: "và tất cả cùng tạo nên  sự rung động trong không khí."
      },
      {
            id: "s1-9",
            start: 35.74,
            end: 38.19,
            text: "Those air vibrations are traveling to you,",
            translation: "Những rung động này  được truyền tới chỗ các bạn,"
      },
      {
            id: "s1-10",
            start: 38.21,
            end: 40,
            text: "they're hitting your eardrums,",
            translation: "tác động vào màng nhĩ."
      },
      {
            id: "s1-11",
            start: 40.02,
            end: 44.6,
            text: "and then your brain takes those vibrations from your eardrums",
            translation: "Sau đó, bộ não tiếp nhận  những dao động này từ màng nhĩ"
      },
      {
            id: "s1-12",
            start: 44.63,
            end: 47.38,
            text: "and transforms them into thoughts.",
            translation: "và biến chúng thành suy nghĩ."
      },
      {
            id: "s1-13",
            start: 48.03,
            end: 49.18,
            text: "I hope.",
            translation: "Tôi hi vọng là như vậy."
      },
      {
            id: "s1-14",
            start: 49.21,
            end: 50.21,
            text: "(Laughter)",
            translation: "(Tiếng cười)"
      },
      {
            id: "s1-15",
            start: 50.23,
            end: 51.39,
            text: "I hope that's happening.",
            translation: "Hi vọng nó đang diễn ra."
      },
      {
            id: "s1-16",
            start: 51.41,
            end: 55.99,
            text: "So because of this ability, we humans are able to transmit our ideas",
            translation: "Chính nhờ khả năng này mà con người  có thể truyền tải những ý tưởng"
      },
      {
            id: "s1-17",
            start: 56.01,
            end: 58.71,
            text: "across vast reaches of space and time.",
            translation: "trong phạm vi không gian  và thời gian rộng lớn."
      },
      {
            id: "s1-18",
            start: 58.73,
            end: 63.27,
            text: "We're able to transmit knowledge across minds.",
            translation: "Ta có thể truyền tải  kiến thức tới mọi người."
      },
      {
            id: "s1-19",
            start: 63.29,
            end: 66.45,
            text: "I can put a bizarre new idea in your mind right now.",
            translation: "Tôi có thể đem một ý tưởng kỳ quái vào tâm trí bạn ngay lúc này."
      },
      {
            id: "s1-20",
            start: 66.47,
            end: 67.63,
            text: "I could say,",
            translation: "tôi có thể nói,"
      },
      {
            id: "s1-21",
            start: 68.37,
            end: 71.58,
            text: "\"Imagine a jellyfish waltzing in a library",
            translation: "\"Hãy tưởng tượng một con sứa  vừa nhảy điệu valse trong thư viện"
      },
      {
            id: "s1-22",
            start: 71.6,
            end: 73.78,
            text: "while thinking about quantum mechanics.\"",
            translation: "vừa nghĩ về cơ học lượng tử \""
      },
      {
            id: "s1-23",
            start: 73.8,
            end: 75.2,
            text: "(Laughter)",
            translation: "(tiếng cười)"
      },
      {
            id: "s1-24",
            start: 75.22,
            end: 78.25,
            text: "Now, if everything has gone relatively well in your life so far,",
            translation: "Nếu mọi thứ trong cuộc sống trước nay đều tương đối suôn sẻ,"
      },
      {
            id: "s1-25",
            start: 78.27,
            end: 80.39,
            text: "you probably haven't had that thought before.",
            translation: "có lẽ bạn chẳng bao giờ  suy nghĩ như thế này."
      },
      {
            id: "s1-26",
            start: 80.41,
            end: 81.41,
            text: "(Laughter)",
            translation: "(Tiếng cười)"
      },
      {
            id: "s1-27",
            start: 81.44,
            end: 83.17,
            text: "But now I've just made you think it,",
            translation: "Nhưng giờ tôi khiến bạn nghĩ về nó thông qua ngôn ngữ."
      },
      {
            id: "s1-28",
            start: 83.19,
            end: 84.35,
            text: "through language.",
            translation: "Nhưng giờ tôi khiến bạn nghĩ về nó thông qua ngôn ngữ."
      },
      {
            id: "s1-29",
            start: 84.65,
            end: 87.38,
            text: "Now of course, there isn't just one language in the world,",
            translation: "Và dĩ nhiên, thế giới không chỉ  có một ngôn ngữ,"
      },
      {
            id: "s1-30",
            start: 87.4,
            end: 90.05,
            text: "there are about 7,000 languages spoken around the world.",
            translation: "có khoảng 7.000 ngôn ngữ được dùng trên toàn thế giới"
      },
      {
            id: "s1-31",
            start: 90.07,
            end: 93.23,
            text: "And all the languages differ from one another in all kinds of ways.",
            translation: "Trên mọi khía cạnh,  các ngôn ngữ đều có điểm khác nhau."
      },
      {
            id: "s1-32",
            start: 93.25,
            end: 96.35,
            text: "Some languages have different sounds,",
            translation: "Một số ngôn ngữ khác nhau  về cách phát âm,"
      },
      {
            id: "s1-33",
            start: 96.37,
            end: 98.09,
            text: "they have different vocabularies,",
            translation: "từ vựng,"
      },
      {
            id: "s1-34",
            start: 98.11,
            end: 100.15,
            text: "and they also have different structures --",
            translation: "và cũng có thể khác nhau về cấu trúc..."
      },
      {
            id: "s1-35",
            start: 100.18,
            end: 102.06,
            text: "very importantly, different structures.",
            translation: "cấu trúc khác nhau,  vô cùng quan trọng."
      },
      {
            id: "s1-36",
            start: 102.9,
            end: 104.09,
            text: "That begs the question:",
            translation: "Điều này đặt ra câu hỏi:"
      },
      {
            id: "s1-37",
            start: 104.11,
            end: 106.72,
            text: "Does the language we speak shape the way we think?",
            translation: "Liệu ngôn ngữ ta nói  có định hình cách ta suy nghĩ?"
      },
      {
            id: "s1-38",
            start: 106.75,
            end: 108.32,
            text: "Now, this is an ancient question.",
            translation: "Đây là một câu hỏi từ xa xưa"
      },
      {
            id: "s1-39",
            start: 108.34,
            end: 111.52,
            text: "People have been speculating about this question forever.",
            translation: "mà con người vẫn không ngừng  nghiên cứu."
      },
      {
            id: "s1-40",
            start: 111.54,
            end: 113.86,
            text: "Charlemagne, Holy Roman emperor, said,",
            translation: "Charlemagne, hoàng đế  của đế chế La Mã, từng nói"
      },
      {
            id: "s1-41",
            start: 113.88,
            end: 116.92,
            text: "\"To have a second language is to have a second soul\" --",
            translation: "\"Nói được thêm một ngôn ngữ  chính là có thêm một tâm hồn\""
      },
      {
            id: "s1-42",
            start: 116.94,
            end: 119.44,
            text: "strong statement that language crafts reality.",
            translation: "một nhận định mạnh mẽ rằng  ngôn ngữ tạo ra thực tại."
      },
      {
            id: "s1-43",
            start: 119.99,
            end: 122.98,
            text: "But on the other hand, Shakespeare has Juliet say,",
            translation: "Song ở một khía cạnh khác,  Juliet của Shakespeare từng nói:"
      },
      {
            id: "s1-44",
            start: 123.01,
            end: 124.16,
            text: "\"What's in a name?",
            translation: "\"Cái tên nói lên điều gì?"
      },
      {
            id: "s1-45",
            start: 124.18,
            end: 126.52,
            text: "A rose by any other name would smell as sweet.\"",
            translation: "Một bông hồng dù có tên khác  vẫn cứ sẽ ngọt ngào\","
      },
      {
            id: "s1-46",
            start: 127.5,
            end: 130.56,
            text: "Well, that suggests that maybe language doesn't craft reality.",
            translation: "cho thấy phải chăng  ngôn ngữ không tạo nên thực tế."
      },
      {
            id: "s1-47",
            start: 130.93,
            end: 134.93,
            text: "These arguments have gone back and forth for thousands of years.",
            translation: "Những cuộc tranh luận như thế diễn ra nhiều lần suốt hàng nghìn năm qua."
      },
      {
            id: "s1-48",
            start: 135.4,
            end: 138.13,
            text: "But until recently, there hasn't been any data",
            translation: "Nhưng cho đến nay,  vẫn chưa có tài liệu nào"
      },
      {
            id: "s1-49",
            start: 138.16,
            end: 139.71,
            text: "to help us decide either way.",
            translation: "giúp ta tìm ra hướng đi đúng."
      },
      {
            id: "s1-50",
            start: 140.23,
            end: 142.68,
            text: "Recently, in my lab and other labs around the world,",
            translation: "Gần đây, nhiều phòng thí nghiệm  trên thế giới,"
      },
      {
            id: "s1-51",
            start: 142.71,
            end: 144.1,
            text: "we've started doing research,",
            translation: "đã bắt đầu nghiên cứu."
      },
      {
            id: "s1-52",
            start: 144.12,
            end: 148.56,
            text: "and now we have actual scientific data to weigh in on this question.",
            translation: "và hiện đã có được những dữ liệu khoa học  xác đáng để trả lời câu hỏi này."
      },
      {
            id: "s1-53",
            start: 148.92,
            end: 151.46,
            text: "So let me tell you about some of my favorite examples.",
            translation: "Tôi sẽ kể cho các bạn  một vài ví dụ yêu thích."
      },
      {
            id: "s1-54",
            start: 151.85,
            end: 155.26,
            text: "I'll start with an example from an Aboriginal community in Australia",
            translation: "Bắt đầu với ví dụ từ  một cộng đồng thổ dân ở Úc"
      },
      {
            id: "s1-55",
            start: 155.28,
            end: 157.01,
            text: "that I had the chance to work with.",
            translation: "mà tôi từng có cơ hội làm việc cùng."
      },
      {
            id: "s1-56",
            start: 157.04,
            end: 158.78,
            text: "These are the Kuuk Thaayorre people.",
            translation: "Đây là tộc người Kuuk Thaayorre,"
      },
      {
            id: "s1-57",
            start: 158.8,
            end: 162.6,
            text: "They live in Pormpuraaw at the very west edge of Cape York.",
            translation: "Họ sống ngay tại Pormpuraaw  tại bờ Đông của Cape York."
      },
      {
            id: "s1-58",
            start: 163.35,
            end: 165.59,
            text: "What's cool about Kuuk Thaayorre is,",
            translation: "Và điều thú vị về tộc Kuuk Thaayorre là,"
      },
      {
            id: "s1-59",
            start: 165.61,
            end: 168.67,
            text: "in Kuuk Thaayorre, they don't use words like \"left\" and \"right,\"",
            translation: "Người Kuuk Thaayorre không dùng những từ  như \"trái\" hay \"phải\""
      },
      {
            id: "s1-60",
            start: 168.69,
            end: 171.38,
            text: "and instead, everything is in cardinal directions:",
            translation: "thay vào đó, mọi thứ được xác định  theo bốn hướng:"
      },
      {
            id: "s1-61",
            start: 171.4,
            end: 172.82,
            text: "north, south, east and west.",
            translation: "Bắc, Nam, Đông và Tây."
      },
      {
            id: "s1-62",
            start: 173.43,
            end: 175.96,
            text: "And when I say everything, I really mean everything.",
            translation: "Và khi tôi nói mọi thứ,  ý của tôi là mọi thứ."
      },
      {
            id: "s1-63",
            start: 175.98,
            end: 177.53,
            text: "You would say something like,",
            translation: "Bạn sẽ nói, ví dụ như,"
      },
      {
            id: "s1-64",
            start: 177.56,
            end: 180.07,
            text: "\"Oh, there's an ant on your southwest leg.\"",
            translation: "\"Ô, có một con kiến trên  chân Tây Nam của bạn kìa.\""
      },
      {
            id: "s1-65",
            start: 181.18,
            end: 183.83,
            text: "Or, \"Move your cup to the north-northeast a little bit.\"",
            translation: "Hoặc, \"Dịch cốc sang  hướng Bắc-Đông Bắc chút đi.\""
      },
      {
            id: "s1-66",
            start: 184.4,
            end: 187.88,
            text: "In fact, the way that you say \"hello\" in Kuuk Thaayorre is you say,",
            translation: "Thực tế, cách bạn nói \"xin chào\"  trong tiếng Kuuk Thaayoore sẽ là:"
      },
      {
            id: "s1-67",
            start: 187.91,
            end: 189.17,
            text: "\"Which way are you going?\"",
            translation: "\"Bạn đi hướng nào đấy?\""
      },
      {
            id: "s1-68",
            start: 189.2,
            end: 190.53,
            text: "And the answer should be,",
            translation: "Và câu trả lời nên là,"
      },
      {
            id: "s1-69",
            start: 191.01,
            end: 192.79,
            text: "\"North-northeast in the far distance.",
            translation: "\"Xa xa hướng Bắc- Đông Bắc."
      },
      {
            id: "s1-70",
            start: 192.81,
            end: 194.13,
            text: "How about you?\"",
            translation: "Thế còn bạn?\""
      },
      {
            id: "s1-71",
            start: 194.16,
            end: 197.29,
            text: "So imagine as you're walking around your day,",
            translation: "Hãy tưởng tượng bạn đi bộ cả ngày,"
      },
      {
            id: "s1-72",
            start: 197.31,
            end: 198.86,
            text: "every person you greet,",
            translation: "với mỗi người bạn gặp,"
      },
      {
            id: "s1-73",
            start: 198.88,
            end: 200.96,
            text: "you have to report your heading direction.",
            translation: "bạn phải báo cáo hướng đi của mình."
      },
      {
            id: "s1-74",
            start: 200.98,
            end: 202.16,
            text: "(Laughter)",
            translation: "(Cười lớn)"
      },
      {
            id: "s1-75",
            start: 202.18,
            end: 205.51,
            text: "But that would actually get you oriented pretty fast, right?",
            translation: "Điều đó vô hình khiến bạn  định hướng khá nhanh, phải không?"
      },
      {
            id: "s1-76",
            start: 205.54,
            end: 208.5,
            text: "Because you literally couldn't get past \"hello,\"",
            translation: "Bởi bạn không thể đơn thuần  đi ngang qua và nói \"xin chào\""
      },
      {
            id: "s1-77",
            start: 208.52,
            end: 210.6,
            text: "if you didn't know which way you were going.",
            translation: "nếu không biết mình  đang đi đâu."
      },
      {
            id: "s1-78",
            start: 211.97,
            end: 215.46,
            text: "In fact, people who speak languages like this stay oriented really well.",
            translation: "Thực tế, những người nói ngôn ngữ  như vậy định hướng khá tốt."
      },
      {
            id: "s1-79",
            start: 215.49,
            end: 218.41,
            text: "They stay oriented better than we used to think humans could.",
            translation: "Họ định hướng tốt hơn nhiều  so với người bình thường."
      },
      {
            id: "s1-80",
            start: 218.84,
            end: 221.69,
            text: "We used to think that humans were worse than other creatures",
            translation: "Ta thường nghĩ con người  tệ hơn nhiều loài sinh vật"
      },
      {
            id: "s1-81",
            start: 221.72,
            end: 223.43,
            text: "because of some biological excuse:",
            translation: "vì một vài lý do sinh học:"
      },
      {
            id: "s1-82",
            start: 223.46,
            end: 226.78,
            text: "\"Oh, we don't have magnets in our beaks or in our scales.\"",
            translation: "\"Oh, chúng ta không có nam châm  trong mỏ hoặc vây.\""
      },
      {
            id: "s1-83",
            start: 226.81,
            end: 229.75,
            text: "No; if your language and your culture trains you to do it,",
            translation: "Không; nếu ngôn ngữ và văn hoá  huấn luyện bạn,"
      },
      {
            id: "s1-84",
            start: 229.77,
            end: 231.02,
            text: "actually, you can do it.",
            translation: "bạn có thể làm được."
      },
      {
            id: "s1-85",
            start: 231.04,
            end: 234.08,
            text: "There are humans around the world who stay oriented really well.",
            translation: "Có nhiều người trên thế giới định hướng rất tốt."
      },
      {
            id: "s1-86",
            start: 234.11,
            end: 236.24,
            text: "And just to get us in agreement",
            translation: "Và để ta đồng thuận"
      },
      {
            id: "s1-87",
            start: 236.26,
            end: 238.85,
            text: "about how different this is from the way we do it,",
            translation: "về sự đa dạng  trong cách làm điều này,"
      },
      {
            id: "s1-88",
            start: 238.88,
            end: 241.64,
            text: "I want you all to close your eyes for a second",
            translation: "tôi muốn các bạn  cùng nhắm mắt trong một giây"
      },
      {
            id: "s1-89",
            start: 242.89,
            end: 244.24,
            text: "and point southeast.",
            translation: "và chỉ về hướng Đông Nam."
      },
      {
            id: "s1-90",
            start: 244.26,
            end: 245.97,
            text: "(Laughter)",
            translation: "(Cười lớn)"
      },
      {
            id: "s1-91",
            start: 246,
            end: 247.58,
            text: "Keep your eyes closed. Point.",
            translation: "(Cười lớn)"
      },
      {
            id: "s1-92",
            start: 250.09,
            end: 252.11,
            text: "OK, so you can open your eyes.",
            translation: "Ok, giờ bạn có thể mở mắt."
      },
      {
            id: "s1-93",
            start: 252.14,
            end: 255.91,
            text: "I see you guys pointing there, there, there, there, there ...",
            translation: "Tôi thấy các bạn chỉ tay hướng kia, kia, kia, kia, kia.."
      },
      {
            id: "s1-94",
            start: 256.53,
            end: 258.41,
            text: "I don't know which way it is myself --",
            translation: "Chính tôi cũng không biết hướng của mình"
      },
      {
            id: "s1-95",
            start: 258.43,
            end: 260.1,
            text: "(Laughter)",
            translation: "(Cười lớn)"
      },
      {
            id: "s1-96",
            start: 260.12,
            end: 261.78,
            text: "You have not been a lot of help.",
            translation: "Các bạn không giúp được gì mấy."
      },
      {
            id: "s1-97",
            start: 261.8,
            end: 263.12,
            text: "(Laughter)",
            translation: "(Cười lớn)"
      },
      {
            id: "s1-98",
            start: 263.14,
            end: 266.06,
            text: "So let's just say the accuracy in this room was not very high.",
            translation: "Nên có thể nói độ chính xác trong phòng này không cao."
      },
      {
            id: "s1-99",
            start: 266.09,
            end: 269.45,
            text: "This is a big difference in cognitive ability across languages, right?",
            translation: "Đây là sự khác biệt lớn về khả năng  nhận thức của các ngôn ngữ, nhỉ?"
      },
      {
            id: "s1-100",
            start: 269.47,
            end: 272.87,
            text: "Where one group -- very distinguished group like you guys --",
            translation: "Khi mà một nhóm - rất ưu tú như các bạn -"
      },
      {
            id: "s1-101",
            start: 272.89,
            end: 274.45,
            text: "doesn't know which way is which,",
            translation: "Không rõ hướng nào là  hướng nào"
      },
      {
            id: "s1-102",
            start: 274.48,
            end: 275.81,
            text: "but in another group,",
            translation: "Nhưng trong một nhóm khác,"
      },
      {
            id: "s1-103",
            start: 275.84,
            end: 278.13,
            text: "I could ask a five-year-old and they would know.",
            translation: "tôi sẽ hỏi trẻ lên năm và chúng sẽ biết"
      },
      {
            id: "s1-104",
            start: 278.15,
            end: 279.23,
            text: "(Laughter)",
            translation: "(Cười lớn)"
      },
      {
            id: "s1-105",
            start: 279.26,
            end: 282.68,
            text: "There are also really big differences in how people think about time.",
            translation: "Có những sự khác biệt khác  về cách mọi người nghĩ về thời gian."
      },
      {
            id: "s1-106",
            start: 282.7,
            end: 286.72,
            text: "So here I have pictures of my grandfather at different ages.",
            translation: "Ở đây, tôi có hình của ông tôi  ở những độ tuổi khác nhau."
      },
      {
            id: "s1-107",
            start: 286.74,
            end: 289.97,
            text: "And if I ask an English speaker to organize time,",
            translation: "Và nếu tôi hỏi một người nói tiếng Anh sắp xếp theo thứ tự thời gian,"
      },
      {
            id: "s1-108",
            start: 289.99,
            end: 291.48,
            text: "they might lay it out this way,",
            translation: "họ có thể xếp"
      },
      {
            id: "s1-109",
            start: 291.5,
            end: 292.65,
            text: "from left to right.",
            translation: "từ trái sang phải."
      },
      {
            id: "s1-110",
            start: 292.68,
            end: 294.51,
            text: "This has to do with writing direction.",
            translation: "Liên quan tới cách viết."
      },
      {
            id: "s1-111",
            start: 294.53,
            end: 296.56,
            text: "If you were a speaker of Hebrew or Arabic,",
            translation: "Nếu nói tiếng Do Thái hoặc Ả Rập"
      },
      {
            id: "s1-112",
            start: 296.58,
            end: 298.87,
            text: "you might do it going in the opposite direction,",
            translation: "bạn có thể sẽ viết theo hướng  ngược lại,"
      },
      {
            id: "s1-113",
            start: 298.9,
            end: 300.05,
            text: "from right to left.",
            translation: "từ phải qua trái."
      },
      {
            id: "s1-114",
            start: 301.58,
            end: 303.16,
            text: "But how would the Kuuk Thaayorre,",
            translation: "Vậy người Kuuk Thaayorre,"
      },
      {
            id: "s1-115",
            start: 303.19,
            end: 305.58,
            text: "this Aboriginal group I just told you about, do it?",
            translation: "bộ tộc mà tôi vừa đề cập đến  sẽ xếp thế nào?"
      },
      {
            id: "s1-116",
            start: 305.61,
            end: 307.72,
            text: "They don't use words like \"left\" and \"right.\"",
            translation: "Họ không dùng những từ  như \"trái\" hay \"phải\"."
      },
      {
            id: "s1-117",
            start: 307.75,
            end: 309.24,
            text: "Let me give you hint.",
            translation: "Để tôi gợi ý cho các bạn."
      },
      {
            id: "s1-118",
            start: 309.26,
            end: 311.81,
            text: "When we sat people facing south,",
            translation: "Khi ngồi đối mặt hướng Nam,"
      },
      {
            id: "s1-119",
            start: 311.84,
            end: 313.7,
            text: "they organized time from left to right.",
            translation: "họ sắp xếp từ trái qua phải."
      },
      {
            id: "s1-120",
            start: 314.39,
            end: 316.57,
            text: "When we sat them facing north,",
            translation: "Khi ngồi đối mặt hướng Bắc,"
      },
      {
            id: "s1-121",
            start: 316.6,
            end: 318.57,
            text: "they organized time from right to left.",
            translation: "họ sắp xếp từ phải qua trái."
      },
      {
            id: "s1-122",
            start: 319.03,
            end: 321.08,
            text: "When we sat them facing east,",
            translation: "Khi ngồi đối mặt hướng Đông,"
      },
      {
            id: "s1-123",
            start: 321.11,
            end: 322.85,
            text: "time came towards the body.",
            translation: "sắp xếp theo thời gian hướng về cơ thể."
      },
      {
            id: "s1-124",
            start: 323.61,
            end: 324.92,
            text: "What's the pattern?",
            translation: "Vậy kiểu mẫu ở đây là gì?"
      },
      {
            id: "s1-125",
            start: 326.06,
            end: 327.75,
            text: "East to west, right?",
            translation: "Đông tới Tây, phải không?"
      },
      {
            id: "s1-126",
            start: 327.78,
            end: 331.28,
            text: "So for them, time doesn't actually get locked on the body at all,",
            translation: "Với họ, thời gian  không bó buộc với cơ thể"
      },
      {
            id: "s1-127",
            start: 331.31,
            end: 332.85,
            text: "it gets locked on the landscape.",
            translation: "mà là với không gian"
      },
      {
            id: "s1-128",
            start: 332.87,
            end: 334.59,
            text: "So for me, if I'm facing this way,",
            translation: "Như vậy, tôi hướng mặt  về phía này,"
      },
      {
            id: "s1-129",
            start: 334.61,
            end: 335.77,
            text: "then time goes this way,",
            translation: "thời gian sẽ theo phía này."
      },
      {
            id: "s1-130",
            start: 335.79,
            end: 338.26,
            text: "and if I'm facing this way, then time goes this way.",
            translation: "Hướng mặt phía này, thời gian theo phía này."
      },
      {
            id: "s1-131",
            start: 338.29,
            end: 340.29,
            text: "I'm facing this way, time goes this way --",
            translation: "Tôi đối mặt và, thời gian theo hướng này --"
      },
      {
            id: "s1-132",
            start: 340.31,
            end: 344.28,
            text: "very egocentric of me to have the direction of time chase me around",
            translation: "thật là vị kỷ  khi thấy thời gian đuổi theo mình,"
      },
      {
            id: "s1-133",
            start: 344.3,
            end: 345.94,
            text: "every time I turn my body.",
            translation: "mỗi khi xoay người."
      },
      {
            id: "s1-134",
            start: 346.6,
            end: 349.25,
            text: "For the Kuuk Thaayorre, time is locked on the landscape.",
            translation: "Với người Kuuk Thaayorre  thời gian bó buộc với không gian"
      },
      {
            id: "s1-135",
            start: 349.27,
            end: 352.09,
            text: "It's a dramatically different way of thinking about time.",
            translation: "Một cách nghĩ về thời gian  hoàn toàn khác biệt."
      },
      {
            id: "s1-136",
            start: 352.11,
            end: 354.02,
            text: "Here's another really smart human trick.",
            translation: "Còn đây là một mẹo khác  rất thông minh."
      },
      {
            id: "s1-137",
            start: 354.05,
            end: 356.26,
            text: "Suppose I ask you how many penguins are there.",
            translation: "Giả dụ tôi hỏi có bao nhiêu con chim cánh cụt."
      },
      {
            id: "s1-138",
            start: 356.96,
            end: 360.11,
            text: "Well, I bet I know how you'd solve that problem if you solved it.",
            translation: "Tôi cá các bạn  có thể trả lời bằng cách,"
      },
      {
            id: "s1-139",
            start: 360.14,
            end: 362.96,
            text: "You went, \"One, two, three, four, five, six, seven, eight.\"",
            translation: "bắt đầu, \"1,2,3,4,5,6,7,8.\""
      },
      {
            id: "s1-140",
            start: 362.99,
            end: 364.15,
            text: "You counted them.",
            translation: "Bạn đếm chúng,"
      },
      {
            id: "s1-141",
            start: 364.18,
            end: 365.78,
            text: "You named each one with a number,",
            translation: "gán mỗi con  với một con số,"
      },
      {
            id: "s1-142",
            start: 365.81,
            end: 368.44,
            text: "and the last number you said was the number of penguins.",
            translation: "và số cuối cùng  là số chim cánh cụt."
      },
      {
            id: "s1-143",
            start: 368.47,
            end: 371.33,
            text: "This is a little trick that you're taught to use as kids.",
            translation: "Đó là mẹo nhỏ  khi ta học đếm hồi nhỏ."
      },
      {
            id: "s1-144",
            start: 371.35,
            end: 374.4,
            text: "You learn the number list and you learn how to apply it.",
            translation: "Bạn học về dãy số  và áp dụng chúng."
      },
      {
            id: "s1-145",
            start: 374.79,
            end: 376.23,
            text: "A little linguistic trick.",
            translation: "Một mẹo ngôn ngữ nhỏ."
      },
      {
            id: "s1-146",
            start: 376.8,
            end: 378.48,
            text: "Well, some languages don't do this,",
            translation: "Một vài ngôn ngữ  không làm như vậy"
      },
      {
            id: "s1-147",
            start: 378.5,
            end: 381.65,
            text: "because some languages don't have exact number words.",
            translation: "vì không có chữ số đếm chính xác."
      },
      {
            id: "s1-148",
            start: 382.04,
            end: 384.94,
            text: "They're languages that don't have a word like \"seven\"",
            translation: "Những ngôn ngữ đó không có từ như \"bảy\""
      },
      {
            id: "s1-149",
            start: 384.96,
            end: 386.36,
            text: "or a word like \"eight.\"",
            translation: "hay \"tám\"."
      },
      {
            id: "s1-150",
            start: 387.03,
            end: 389.69,
            text: "In fact, people who speak these languages don't count,",
            translation: "Thực tế, người nói  những ngôn ngữ đó không đếm."
      },
      {
            id: "s1-151",
            start: 389.71,
            end: 392.71,
            text: "and they have trouble keeping track of exact quantities.",
            translation: "Họ gặp vấn đề với việc  đánh dấu số lượng chính xác"
      },
      {
            id: "s1-152",
            start: 392.74,
            end: 396.67,
            text: "So, for example, if I ask you to match this number of penguins",
            translation: "Ví dụ, nếu tôi yêu cầu bạn  gán số lượng chim cánh cụt"
      },
      {
            id: "s1-153",
            start: 396.69,
            end: 398.95,
            text: "to the same number of ducks,",
            translation: "với số lượng vịt tương ứng,"
      },
      {
            id: "s1-154",
            start: 398.98,
            end: 401.12,
            text: "you would be able to do that by counting.",
            translation: "bạn có thể làm điều đó  bằng việc đếm."
      },
      {
            id: "s1-155",
            start: 401.14,
            end: 405,
            text: "But folks who don't have that linguistic trick can't do that.",
            translation: "Nhưng những người không có  mẹo ngôn ngữ đó không làm được điều này."
      },
      {
            id: "s1-156",
            start: 407.65,
            end: 410.81,
            text: "Languages also differ in how they divide up the color spectrum --",
            translation: "Ngôn ngữ khác nhau  trong cả cách phân chia phổ màu -"
      },
      {
            id: "s1-157",
            start: 410.83,
            end: 411.98,
            text: "the visual world.",
            translation: "thế giới thị giác."
      },
      {
            id: "s1-158",
            start: 412.35,
            end: 414.5,
            text: "Some languages have lots of words for colors,",
            translation: "Một số ngôn ngữ  có rất nhiều từ chỉ màu sắc,"
      },
      {
            id: "s1-159",
            start: 414.52,
            end: 416.89,
            text: "some have only a couple words, \"light\" and \"dark.\"",
            translation: "số khác lại chỉ có vài từ, \"nhạt\" và \"đậm\"."
      },
      {
            id: "s1-160",
            start: 416.91,
            end: 420.54,
            text: "And languages differ in where they put boundaries between colors.",
            translation: "Ngôn ngữ cũng khác nhau  trong cách đặt giới hạn giữa màu sắc."
      },
      {
            id: "s1-161",
            start: 420.56,
            end: 423.77,
            text: "So, for example, in English, there's a word for blue",
            translation: "Ví dụ, trong tiếng Anh,  có từ \"xanh da trời\""
      },
      {
            id: "s1-162",
            start: 423.8,
            end: 426.93,
            text: "that covers all of the colors that you can see on the screen,",
            translation: "bao hàm tất cả các màu  bạn nhìn thấy trên màn hình,"
      },
      {
            id: "s1-163",
            start: 426.96,
            end: 428.96,
            text: "but in Russian, there isn't a single word.",
            translation: "nhưng tiếng Nga,  không có từ nào như vậy."
      },
      {
            id: "s1-164",
            start: 428.99,
            end: 431.19,
            text: "Instead, Russian speakers have to differentiate",
            translation: "Thay vào đó người nói tiếng Nga  phải phân biệt"
      },
      {
            id: "s1-165",
            start: 431.22,
            end: 432.69,
            text: "between light blue, \"goluboy,\"",
            translation: "giữa xanh nhạt, \"goluboy\""
      },
      {
            id: "s1-166",
            start: 432.71,
            end: 434.29,
            text: "and dark blue, \"siniy.\"",
            translation: "và xanh đậm, \"siniy\"."
      },
      {
            id: "s1-167",
            start: 435.14,
            end: 439.12,
            text: "So Russians have this lifetime of experience of, in language,",
            translation: "Thế nên, người Nga có kinh nghiệm trong ngôn ngữ,"
      },
      {
            id: "s1-168",
            start: 439.14,
            end: 441.01,
            text: "distinguishing these two colors.",
            translation: "để phân biệt hai màu sắc này."
      },
      {
            id: "s1-169",
            start: 441.04,
            end: 445,
            text: "When we test people's ability to perceptually discriminate these colors,",
            translation: "Kết quả kiểm tra khả năng phân biệt  màu sắc qua giác quan,"
      },
      {
            id: "s1-170",
            start: 445.02,
            end: 447.55,
            text: "what we find is that Russian speakers are faster",
            translation: "cho thấy người nói  tiếng Nga nhanh hơn"
      },
      {
            id: "s1-171",
            start: 447.57,
            end: 449.13,
            text: "across this linguistic boundary.",
            translation: "trong việc phân biệt"
      },
      {
            id: "s1-172",
            start: 449.15,
            end: 451.43,
            text: "They're faster to be able to tell the difference",
            translation: "trong việc phân biệt"
      },
      {
            id: "s1-173",
            start: 451.46,
            end: 452.92,
            text: "between a light and dark blue.",
            translation: "giữa xanh nhạt và xanh đậm trong giới hạn ngôn ngữ."
      },
      {
            id: "s1-174",
            start: 453.3,
            end: 456.56,
            text: "And when you look at people's brains as they're looking at colors --",
            translation: "Khi nhìn vào não bộ của họ khi quan sát những màu sắc này"
      },
      {
            id: "s1-175",
            start: 456.59,
            end: 459.92,
            text: "say you have colors shifting slowly from light to dark blue --",
            translation: "cùng với sự dịch chuyển chậm rãi từ nhạt đến đậm,"
      },
      {
            id: "s1-176",
            start: 460.8,
            end: 465.25,
            text: "the brains of people who use different words for light and dark blue",
            translation: "não bộ những người dùng từ khác nhau chỉ xanh đậm và xanh nhạt"
      },
      {
            id: "s1-177",
            start: 465.27,
            end: 468.78,
            text: "will give a surprised reaction as the colors shift from light to dark,",
            translation: "sẽ cho ra phản ứng đáng ngạc nhiên  khi màu sắc chuyển từ nhạt sang đậm,"
      },
      {
            id: "s1-178",
            start: 468.81,
            end: 471.99,
            text: "as if, \"Ooh, something has categorically changed,\"",
            translation: "như thể, \" Ồ, có sự thay đổi rõ rệt kìa,\""
      },
      {
            id: "s1-179",
            start: 472.01,
            end: 474.46,
            text: "whereas the brains of English speakers, for example,",
            translation: "trong khi não bộ của  những người nói tiếng Anh, ví dụ,"
      },
      {
            id: "s1-180",
            start: 474.48,
            end: 476.62,
            text: "that don't make this categorical distinction,",
            translation: "không có sự phân biệt rõ ràng này,"
      },
      {
            id: "s1-181",
            start: 476.65,
            end: 477.84,
            text: "don't give that surprise,",
            translation: "không có gì ngạc nhiên,"
      },
      {
            id: "s1-182",
            start: 477.87,
            end: 479.95,
            text: "because nothing is categorically changing.",
            translation: "vì không có gì thay đổi  rõ rệt."
      },
      {
            id: "s1-183",
            start: 482.05,
            end: 484.56,
            text: "Languages have all kinds of structural quirks.",
            translation: "Mỗi ngoại ngữ đều có  nét riêng về mặt cấu trúc."
      },
      {
            id: "s1-184",
            start: 484.58,
            end: 485.92,
            text: "This is one of my favorites.",
            translation: "Điều mà tôi rất thích."
      },
      {
            id: "s1-185",
            start: 485.94,
            end: 488.38,
            text: "Lots of languages have grammatical gender;",
            translation: "Rất nhiều ngôn ngữ có cấu trúc giới tính:"
      },
      {
            id: "s1-186",
            start: 488.4,
            end: 493.03,
            text: "every noun gets assigned a gender, often masculine or feminine.",
            translation: "mỗi danh từ được gán một giới tính,  thường là giống đực hoặc cái"
      },
      {
            id: "s1-187",
            start: 493.05,
            end: 495.11,
            text: "And these genders differ across languages.",
            translation: "và giới tính này khác nhau  giữa những ngôn ngữ khác nhau."
      },
      {
            id: "s1-188",
            start: 495.13,
            end: 499.68,
            text: "So, for example, the sun is feminine in German but masculine in Spanish,",
            translation: "Ví dụ, mặt trời giống cái trong tiếng Đức  nhưng giống đực trong tiếng Tây Ban Nha"
      },
      {
            id: "s1-189",
            start: 499.7,
            end: 501.05,
            text: "and the moon, the reverse.",
            translation: "và mặt trăng thì ngược lại."
      },
      {
            id: "s1-190",
            start: 501.63,
            end: 505.1,
            text: "Could this actually have any consequence for how people think?",
            translation: "Liệu điều này có ảnh hưởng đến cách suy nghĩ của mọi người?"
      },
      {
            id: "s1-191",
            start: 505.12,
            end: 509.11,
            text: "Do German speakers think of the sun as somehow more female-like,",
            translation: "Liệu người nói tiếng Đức  có nghĩ mặt trời nữ tính hơn,"
      },
      {
            id: "s1-192",
            start: 509.14,
            end: 511.04,
            text: "and the moon somehow more male-like?",
            translation: "và mặt trăng nam tính hơn?"
      },
      {
            id: "s1-193",
            start: 511.77,
            end: 513.67,
            text: "Actually, it turns out that's the case.",
            translation: "Thực tế đúng như vậy."
      },
      {
            id: "s1-194",
            start: 513.7,
            end: 519.12,
            text: "So if you ask German and Spanish speakers to, say, describe a bridge,",
            translation: "Thế nên, nếu bạn yêu cầu  người nói tiếng Đức và Tây Ban Nha"
      },
      {
            id: "s1-195",
            start: 519.14,
            end: 520.58,
            text: "like the one here --",
            translation: "tả cây cầu  thì sẽ như thế này -"
      },
      {
            id: "s1-196",
            start: 520.6,
            end: 523.95,
            text: "\"bridge\" happens to be grammatically feminine in German,",
            translation: "\"cái cầu\" trong tiếng Đức  mang giống cái,"
      },
      {
            id: "s1-197",
            start: 523.98,
            end: 526.13,
            text: "grammatically masculine in Spanish --",
            translation: "trong tiếng Tây Ban Nha mang giống đực,"
      },
      {
            id: "s1-198",
            start: 526.16,
            end: 530.48,
            text: "German speakers are more likely to say bridges are \"beautiful,\" \"elegant\"",
            translation: "Người nói tiếng Đức sẽ tả  chúng \"đẹp\" hay \"trang nhã\""
      },
      {
            id: "s1-199",
            start: 530.5,
            end: 532.63,
            text: "and stereotypically feminine words.",
            translation: "hay những từ miêu tả sự nữ tính."
      },
      {
            id: "s1-200",
            start: 532.65,
            end: 535.16,
            text: "Whereas Spanish speakers will be more likely to say",
            translation: "Trong khi, người nói tiếng Tây Ban Nha thường miêu tả"
      },
      {
            id: "s1-201",
            start: 535.18,
            end: 536.73,
            text: "they're \"strong\" or \"long,\"",
            translation: "nó \"chắc chắn\", hoặc \"dài\","
      },
      {
            id: "s1-202",
            start: 536.75,
            end: 538.14,
            text: "these masculine words.",
            translation: "nó \"chắc chắn\", hoặc \"dài\","
      },
      {
            id: "s1-203",
            start: 540.85,
            end: 542.53,
            text: "(Laughter)",
            translation: "(Cười lớn)"
      },
      {
            id: "s1-204",
            start: 543.4,
            end: 547.52,
            text: "Languages also differ in how they describe events, right?",
            translation: "Ngôn ngữ cũng miêu tả  sự việc theo cách khác nhau, đúng chứ?"
      },
      {
            id: "s1-205",
            start: 548.06,
            end: 550.41,
            text: "You take an event like this, an accident.",
            translation: "Ví dụ, một vụ tai nạn."
      },
      {
            id: "s1-206",
            start: 550.43,
            end: 553.22,
            text: "In English, it's fine to say, \"He broke the vase.\"",
            translation: "Tếng Anh thường nói  \"Anh ta làm vỡ cái bình\","
      },
      {
            id: "s1-207",
            start: 553.87,
            end: 556.41,
            text: "In a language like Spanish,",
            translation: "trong khi tiếng Tây Ban Nha,"
      },
      {
            id: "s1-208",
            start: 556.44,
            end: 559.28,
            text: "you might be more likely to say, \"The vase broke,\"",
            translation: "lại thường là: \"Cái bình bị vỡ\"."
      },
      {
            id: "s1-209",
            start: 559.31,
            end: 560.87,
            text: "or, \"The vase broke itself.\"",
            translation: "hay \"Cái bình tự vỡ.\""
      },
      {
            id: "s1-210",
            start: 561.33,
            end: 564.55,
            text: "If it's an accident, you wouldn't say that someone did it.",
            translation: "Đó là tai nạn,  bạn sẽ không nói ai làm vỡ."
      },
      {
            id: "s1-211",
            start: 564.58,
            end: 567.98,
            text: "In English, quite weirdly, we can even say things like,",
            translation: "Trong tiếng Anh, khá là kỳ quặc, khi ta thậm chí có thể nói:"
      },
      {
            id: "s1-212",
            start: 568.01,
            end: 569.25,
            text: "\"I broke my arm.\"",
            translation: "\"Tôi làm gãy tay.\""
      },
      {
            id: "s1-213",
            start: 569.95,
            end: 571.79,
            text: "Now, in lots of languages,",
            translation: "Trong nhiều ngôn ngữ,"
      },
      {
            id: "s1-214",
            start: 571.81,
            end: 574.98,
            text: "you couldn't use that construction unless you are a lunatic",
            translation: "không thể dùng cấu trúc này  trừ phi bạn có vấn đề về đầu óc"
      },
      {
            id: "s1-215",
            start: 575.01,
            end: 577.13,
            text: "and you went out looking to break your arm --",
            translation: "và cố tình tự đánh gãy tay."
      },
      {
            id: "s1-216",
            start: 577.16,
            end: 578.16,
            text: "(Laughter)",
            translation: "(Cười lớn)"
      },
      {
            id: "s1-217",
            start: 578.18,
            end: 579.34,
            text: "and you succeeded.",
            translation: "Và bạn đã thành công."
      },
      {
            id: "s1-218",
            start: 579.36,
            end: 582.62,
            text: "If it was an accident, you would use a different construction.",
            translation: "Nếu đó là một vụ tai nạn,  bạn có thể dùng cấu trúc khác."
      },
      {
            id: "s1-219",
            start: 582.65,
            end: 584.45,
            text: "Now, this has consequences.",
            translation: "Và điều đó có những hệ quả."
      },
      {
            id: "s1-220",
            start: 584.48,
            end: 588.66,
            text: "So, people who speak different languages will pay attention to different things,",
            translation: "Những người nói ngôn ngữ khác nhau sẽ tập trung vào những thứ khác nhau"
      },
      {
            id: "s1-221",
            start: 588.69,
            end: 592.1,
            text: "depending on what their language usually requires them to do.",
            translation: "phụ thuộc vào việc ngôn ngữ của họ  yêu cầu họ phải làm gì."
      },
      {
            id: "s1-222",
            start: 592.12,
            end: 596.29,
            text: "So we show the same accident to English speakers and Spanish speakers,",
            translation: "Khi đưa cùng một vụ tai nạn"
      },
      {
            id: "s1-223",
            start: 596.32,
            end: 599.6,
            text: "English speakers will remember who did it,",
            translation: "những người nói tiếng Anh sẽ nhớ ai gây ra chuyện đó,"
      },
      {
            id: "s1-224",
            start: 600.52,
            end: 603.94,
            text: "because English requires you to say, \"He did it; he broke the vase.\"",
            translation: "vì tiếng Anh yêu cầu bạn nói: \"Anh ta làm đấy, anh ta làm vỡ bình hoa.\""
      },
      {
            id: "s1-225",
            start: 603.96,
            end: 607.17,
            text: "Whereas Spanish speakers might be less likely to remember who did it",
            translation: "Trong khi những người nói tiếng  Tây Ban Nha lại ít nhớ ai gây ra,"
      },
      {
            id: "s1-226",
            start: 607.19,
            end: 608.34,
            text: "if it's an accident,",
            translation: "mà thường nhớ đó  là một vụ tai nạn."
      },
      {
            id: "s1-227",
            start: 608.37,
            end: 611.19,
            text: "but they're more likely to remember that it was an accident.",
            translation: "mà thường nhớ đó  là một vụ tai nạn."
      },
      {
            id: "s1-228",
            start: 611.22,
            end: 613.65,
            text: "They're more likely to remember the intention.",
            translation: "Họ thường nhớ đến sự kiện."
      },
      {
            id: "s1-229",
            start: 613.68,
            end: 616.76,
            text: "So, two people watch the same event,",
            translation: "Như vậy, hai người chứng kiến  cùng một sự việc,"
      },
      {
            id: "s1-230",
            start: 616.78,
            end: 618.87,
            text: "witness the same crime,",
            translation: "Như vậy, hai người chứng kiến  cùng một sự việc,"
      },
      {
            id: "s1-231",
            start: 618.89,
            end: 621.94,
            text: "but end up remembering different things about that event.",
            translation: "nhưng, cuối cùng, sẽ nhớ  những thứ khác nhau về sự việc đó."
      },
      {
            id: "s1-232",
            start: 622.56,
            end: 625.82,
            text: "This has implications, of course, for eyewitness testimony.",
            translation: "Điều này tất nhiên liên quan mật thiết  đến bằng chứng tận mắt thấy."
      },
      {
            id: "s1-233",
            start: 626.59,
            end: 628.95,
            text: "It also has implications for blame and punishment.",
            translation: "Nó cũng liên quan tới  việc quy trách nhiệm và hình phạt"
      },
      {
            id: "s1-234",
            start: 628.98,
            end: 630.78,
            text: "So if you take English speakers",
            translation: "Nếu là người nói tiếng Anh"
      },
      {
            id: "s1-235",
            start: 630.81,
            end: 632.97,
            text: "and I just show you someone breaking a vase,",
            translation: "và tôi mới chỉ cho bạn  ai đó làm vỡ cái bình,"
      },
      {
            id: "s1-236",
            start: 633,
            end: 636.85,
            text: "and I say, \"He broke the vase,\" as opposed to \"The vase broke,\"",
            translation: "và nói: \"Anh ta làm vỡ bình,\"  thay vì \"Cái bình bị vỡ,\""
      },
      {
            id: "s1-237",
            start: 637.5,
            end: 639.42,
            text: "even though you can witness it yourself,",
            translation: "dù bạn có thể chứng kiến tận mắt,"
      },
      {
            id: "s1-238",
            start: 639.44,
            end: 640.71,
            text: "you can watch the video,",
            translation: "bạn có thể xem video,"
      },
      {
            id: "s1-239",
            start: 640.73,
            end: 642.89,
            text: "you can watch the crime against the vase,",
            translation: "bạn có thể thấy việc phạm lỗi,"
      },
      {
            id: "s1-240",
            start: 644.16,
            end: 645.92,
            text: "you will punish someone more,",
            translation: "bạn sẽ có xu hướng trừng phạt ai đó,"
      },
      {
            id: "s1-241",
            start: 645.95,
            end: 648.8,
            text: "you will blame someone more if I just said, \"He broke it,\"",
            translation: "đổ lỗi cho ai đó khi tôi nói: \"Anh ta làm vỡ,\""
      },
      {
            id: "s1-242",
            start: 648.83,
            end: 650.32,
            text: "as opposed to, \"It broke.\"",
            translation: "thay vì: \"Nó bị vỡ.\""
      },
      {
            id: "s1-243",
            start: 650.93,
            end: 654.25,
            text: "The language guides our reasoning about events.",
            translation: "Ngôn ngữ dẫn dắt những suy luận về sự việc."
      },
      {
            id: "s1-244",
            start: 656,
            end: 658.88,
            text: "Now, I've given you a few examples",
            translation: "Tôi đã đưa các bạn  một vài ví dụ"
      },
      {
            id: "s1-245",
            start: 658.91,
            end: 662.63,
            text: "of how language can profoundly shape the way we think,",
            translation: "về việc ngôn ngữ có thể  định hình sâu sắc lối suy nghĩ của ta,"
      },
      {
            id: "s1-246",
            start: 662.66,
            end: 664.83,
            text: "and it does so in a variety of ways.",
            translation: "theo vô vàn cách."
      },
      {
            id: "s1-247",
            start: 664.86,
            end: 666.79,
            text: "So language can have big effects,",
            translation: "Thế nên, ngôn ngữ  có thể ảnh hưởng lớn,"
      },
      {
            id: "s1-248",
            start: 666.81,
            end: 668.55,
            text: "like we saw with space and time,",
            translation: "lên không gian, thời gian,"
      },
      {
            id: "s1-249",
            start: 668.58,
            end: 670.48,
            text: "where people can lay out space and time",
            translation: "người ta có thể  xếp chúng"
      },
      {
            id: "s1-250",
            start: 670.51,
            end: 673.75,
            text: "in completely different coordinate frames from each other.",
            translation: "theo những khuôn mẫu hoàn  toàn khác nhau."
      },
      {
            id: "s1-251",
            start: 674.78,
            end: 677.01,
            text: "Language can also have really deep effects --",
            translation: "Ngôn ngữ thật sự  có những ảnh hưởng sâu sắc"
      },
      {
            id: "s1-252",
            start: 677.04,
            end: 679.22,
            text: "that's what we saw with the case of number.",
            translation: "tới cách ta nhìn nhận những con số."
      },
      {
            id: "s1-253",
            start: 679.57,
            end: 681.62,
            text: "Having count words in your language,",
            translation: "Có những số đếm trong  ngôn ngữ của bạn,"
      },
      {
            id: "s1-254",
            start: 681.64,
            end: 682.86,
            text: "having number words,",
            translation: "có những từ chỉ số,"
      },
      {
            id: "s1-255",
            start: 682.88,
            end: 685.44,
            text: "opens up the whole world of mathematics.",
            translation: "mở ra một thế giới toán học."
      },
      {
            id: "s1-256",
            start: 685.47,
            end: 687.97,
            text: "Of course, if you don't count, you can't do algebra,",
            translation: "Tất nhiên, nếu không đếm, bạn không thể có đại số,"
      },
      {
            id: "s1-257",
            start: 688,
            end: 689.56,
            text: "you can't do any of the things",
            translation: "bạn hầu như chẳng làm được gì"
      },
      {
            id: "s1-258",
            start: 689.58,
            end: 692.33,
            text: "that would be required to build a room like this",
            translation: "trước yêu cầu xây một  căn phòng như thế này,"
      },
      {
            id: "s1-259",
            start: 692.35,
            end: 694.35,
            text: "or make this broadcast, right?",
            translation: "hay phát sóng chương trình này."
      },
      {
            id: "s1-260",
            start: 694.84,
            end: 697.7,
            text: "This little trick of number words gives you a stepping stone",
            translation: "Những mẹo chữ số  đưa bạn từng bước"
      },
      {
            id: "s1-261",
            start: 697.72,
            end: 699.2,
            text: "into a whole cognitive realm.",
            translation: "bước tới một vương quốc ý thức."
      },
      {
            id: "s1-262",
            start: 700.42,
            end: 702.72,
            text: "Language can also have really early effects,",
            translation: "Ngôn ngữ có thể có  ảnh hưởng từ rất sớm"
      },
      {
            id: "s1-263",
            start: 702.74,
            end: 705.61,
            text: "what we saw in the case of color.",
            translation: "đến cách ta nhìn nhận màu sắc."
      },
      {
            id: "s1-264",
            start: 706.21,
            end: 708.7,
            text: "These are really simple, basic, perceptual decisions.",
            translation: "Những quyết định tiềm thức  đơn giản và cơ bản."
      },
      {
            id: "s1-265",
            start: 708.72,
            end: 711.08,
            text: "We make thousands of them all the time,",
            translation: "Chúng ta đưa ra hàng nghìn  quyết định như vậy,"
      },
      {
            id: "s1-266",
            start: 711.11,
            end: 712.92,
            text: "and yet, language is getting in there",
            translation: "và ngôn ngữ đóng vai trò  quan trọng"
      },
      {
            id: "s1-267",
            start: 712.95,
            end: 717.28,
            text: "and fussing even with these tiny little perceptual decisions that we make.",
            translation: "trong cả những quyết định  nhỏ nhặt nhất."
      },
      {
            id: "s1-268",
            start: 718.79,
            end: 720.65,
            text: "Language can have really broad effects.",
            translation: "Ngôn ngữ có thể  có ảnh hưởng rộng lớn."
      },
      {
            id: "s1-269",
            start: 720.67,
            end: 723.9,
            text: "So the case of grammatical gender may be a little silly,",
            translation: "Trường hợp giới tính trong ngữ pháp có vẻ hơi ngớ ngẩn,"
      },
      {
            id: "s1-270",
            start: 723.92,
            end: 727.75,
            text: "but at the same time, grammatical gender applies to all nouns.",
            translation: "nhưng đồng thời, giới tính trong  ngôn ngữ áp dụng cho mọi danh từ,"
      },
      {
            id: "s1-271",
            start: 728.06,
            end: 730.35,
            text: "That means language can shape how you're thinking",
            translation: "Nghĩa là ngôn ngữ  có thể định hình cách ta nghĩ"
      },
      {
            id: "s1-272",
            start: 730.37,
            end: 733.26,
            text: "about anything that can be named by a noun.",
            translation: "về bất cứ điều gì được gọi  bằng danh từ."
      },
      {
            id: "s1-273",
            start: 734.18,
            end: 735.51,
            text: "That's a lot of stuff.",
            translation: "Có rất nhiều thứ như vậy."
      },
      {
            id: "s1-274",
            start: 736.45,
            end: 739.71,
            text: "And finally, I gave you an example of how language can shape things",
            translation: "Cuối cùng, tôi cho các bạn  ví dụ về cách ngôn ngữ"
      },
      {
            id: "s1-275",
            start: 739.73,
            end: 741.37,
            text: "that have personal weight to us --",
            translation: "định hình đánh giá của cá nhân"
      },
      {
            id: "s1-276",
            start: 741.39,
            end: 743.97,
            text: "ideas like blame and punishment or eyewitness memory.",
            translation: "những ý nghĩ như đổ lỗi,  hình phạt hay ký ức."
      },
      {
            id: "s1-277",
            start: 743.99,
            end: 746.15,
            text: "These are important things in our daily lives.",
            translation: "Chúng quan trọng  trong cuộc sống hàng ngày."
      },
      {
            id: "s1-278",
            start: 748.15,
            end: 753.15,
            text: "Now, the beauty of linguistic diversity is that it reveals to us",
            translation: "Giờ, vẻ đẹp của sự đa dạng  ngôn ngữ cho ta thấy"
      },
      {
            id: "s1-279",
            start: 753.18,
            end: 757.13,
            text: "just how ingenious and how flexible the human mind is.",
            translation: "tâm trí con người có thể thông minh và linh hoạt đến thế nào."
      },
      {
            id: "s1-280",
            start: 757.77,
            end: 762.31,
            text: "Human minds have invented not one cognitive universe, but 7,000 --",
            translation: "Tâm trí con người đã sáng tạo không chỉ  một mà là 7.000 vũ trụ nhận thức -"
      },
      {
            id: "s1-281",
            start: 762.33,
            end: 764.69,
            text: "there are 7,000 languages spoken around the world.",
            translation: "7.000 ngôn ngữ được sử  dụng trên thế giới."
      },
      {
            id: "s1-282",
            start: 766.01,
            end: 767.69,
            text: "And we can create many more --",
            translation: "Và ta có thể  tạo ra nhiều hơn--"
      },
      {
            id: "s1-283",
            start: 767.71,
            end: 770.79,
            text: "languages, of course, are living things,",
            translation: "ngôn ngữ, tất nhiên,  là những cá thể sống,"
      },
      {
            id: "s1-284",
            start: 770.82,
            end: 774.58,
            text: "things that we can hone and change to suit our needs.",
            translation: "những thứ ta có thể mài dũa, thay đổi để phù hợp với nhu cầu."
      },
      {
            id: "s1-285",
            start: 775.79,
            end: 779.27,
            text: "The tragic thing is that we're losing so much of this linguistic diversity",
            translation: "Điều đáng buồn là ta đang mất đi  sự đa dạng ngôn ngữ này."
      },
      {
            id: "s1-286",
            start: 779.29,
            end: 780.44,
            text: "all the time.",
            translation: "Ta mất đi một ngôn ngữ mỗi tuần,"
      },
      {
            id: "s1-287",
            start: 780.47,
            end: 782.36,
            text: "We're losing about one language a week,",
            translation: "Ta mất đi một ngôn ngữ mỗi tuần,"
      },
      {
            id: "s1-288",
            start: 782.38,
            end: 783.85,
            text: "and by some estimates,",
            translation: "Và theo thống kê,"
      },
      {
            id: "s1-289",
            start: 783.87,
            end: 787.14,
            text: "half of the world's languages will be gone in the next hundred years.",
            translation: "một nửa số ngôn ngữ trên thế giới sẽ biến mất trong hơn trăm năm tới."
      },
      {
            id: "s1-290",
            start: 787.97,
            end: 790.79,
            text: "And the even worse news is that right now,",
            translation: "Điều tệ hơn là ở thời điểm hiện tại,"
      },
      {
            id: "s1-291",
            start: 790.81,
            end: 794.52,
            text: "almost everything we know about the human mind and human brain",
            translation: "hầu hết mọi thứ ta biết về  não bộ và trí tuệ con người"
      },
      {
            id: "s1-292",
            start: 794.54,
            end: 799.57,
            text: "is based on studies of usually American English-speaking undergraduates",
            translation: "chủ yếu dựa trên nghiên cứu  của người Mỹ nói tiếng Anh"
      },
      {
            id: "s1-293",
            start: 799.6,
            end: 800.92,
            text: "at universities.",
            translation: "tại các trường đại học."
      },
      {
            id: "s1-294",
            start: 802.74,
            end: 806.27,
            text: "That excludes almost all humans. Right?",
            translation: "Một nhóm thiểu số, phải không ?"
      },
      {
            id: "s1-295",
            start: 806.3,
            end: 811.27,
            text: "So what we know about the human mind is actually incredibly narrow and biased,",
            translation: "Nên những điều ta biết về não bộ người  thực tế khá hạn hẹp và chủ quan,"
      },
      {
            id: "s1-296",
            start: 811.29,
            end: 814.53,
            text: "and our science has to do better.",
            translation: "và vì thế, cần phải thay đổi."
      },
      {
            id: "s1-297",
            start: 817.99,
            end: 820.25,
            text: "I want to leave you with this final thought.",
            translation: "Tôi muốn để lại cho các bạn suy nghĩ cuối cùng."
      },
      {
            id: "s1-298",
            start: 820.27,
            end: 823.78,
            text: "I've told you about how speakers of different languages think differently,",
            translation: "Tôi đã chia sẻ cách những người  nói ngôn ngữ khác nhau suy nghĩ khác nhau"
      },
      {
            id: "s1-299",
            start: 823.81,
            end: 827.09,
            text: "but of course, that's not about how people elsewhere think.",
            translation: "nhưng tất nhiên, đó không phải  là cách mà người nơi khác nghĩ,"
      },
      {
            id: "s1-300",
            start: 827.12,
            end: 828.53,
            text: "It's about how you think.",
            translation: "mà là chính bạn."
      },
      {
            id: "s1-301",
            start: 828.56,
            end: 832.16,
            text: "It's how the language that you speak shapes the way that you think.",
            translation: "Ngôn ngữ bạn nói  định hình cách bạn nghĩ."
      },
      {
            id: "s1-302",
            start: 833.07,
            end: 835.65,
            text: "And that gives you the opportunity to ask,",
            translation: "Và điều đó cho bạn cơ hội tự hỏi:"
      },
      {
            id: "s1-303",
            start: 835.67,
            end: 837.74,
            text: "\"Why do I think the way that I do?\"",
            translation: "\"Tại sao mình lại nghĩ theo cách này?\""
      },
      {
            id: "s1-304",
            start: 837.76,
            end: 839.36,
            text: "\"How could I think differently?\"",
            translation: "\"Làm thế nào nghĩ khác đi?\""
      },
      {
            id: "s1-305",
            start: 839.91,
            end: 841.27,
            text: "And also,",
            translation: "và \"Tôi mong muốn khơi gợi suy nghĩ gì?\""
      },
      {
            id: "s1-306",
            start: 841.3,
            end: 843.02,
            text: "\"What thoughts do I wish to create?\"",
            translation: "và \"Tôi mong muốn khơi gợi suy nghĩ gì?\""
      },
      {
            id: "s1-307",
            start: 843.84,
            end: 845,
            text: "Thank you very much.",
            translation: "Xin cám ơn rất nhiều."
      },
      {
            id: "s1-308",
            start: 845.02,
            end: 847.78,
            text: "(Applause)",
            translation: "(Vỗ tay)"
      }
],
    quizzes: [
      {
        id: 'q1',
        question: 'According to the speaker, what enables humans to transmit complicated thoughts?',
        options: ['Language', 'Telepathy', 'Writing only', 'Computers'],
        correctAnswer: 0,
        explanation: 'At 0:18-0:24, the speaker states that language is a magical ability allowing humans to transmit complicated thoughts.'
      },
      {
        id: 'q2',
        question: 'Approximately how many languages are spoken in the world today?',
        options: ['About 500', 'About 2,000', 'About 7,000', 'Over 50,000'],
        correctAnswer: 2,
        explanation: 'At 1:27-1:30, the speaker explicitly mentions there are about 7,000 languages spoken around the world.'
      }
    ]
  },
  {
    id: 'lesson-2',
    youtubeId: 'x1hRlGhaM9s',
    title: 'Ordering Food at a Cozy American Cafe',
    channel: 'Deeplingo - English',
    channelAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    thumbnail: 'https://img.youtube.com/vi/x1hRlGhaM9s/maxresdefault.jpg',
    level: 'A2',
    topic: 'Daily Life',
    duration: '03:40',
    durationSec: 220,
    views: '840K',
    description: 'Learn practical phrases and natural pronunciation for ordering coffee, pastries, and lunch at an American coffee shop.',
    subtitles: [
      {
        id: 's2-1',
        start: 0,
        end: 5.04,
        text: "Hi everyone. Welcome to Diplingo. Today,",
        translation: "Xin chào tất cả mọi người. Chào mừng bạn đến với Diplingo. Hôm nay,"
      },
      {
        id: 's2-2',
        start: 3.32,
        end: 7.48,
        text: "we're practicing a real-life food",
        translation: "chúng tôi đang thực hành một món ăn ngoài đời thực"
      },
      {
        id: 's2-3',
        start: 5.04,
        end: 9.96,
        text: "ordering conversation at a cafe.",
        translation: "sắp xếp cuộc trò chuyện tại một quán cà phê."
      },
      {
        id: 's2-4',
        start: 7.48,
        end: 12.4,
        text: "Listen carefully, learn useful everyday",
        translation: "Lắng nghe cẩn thận, học hỏi hữu ích mỗi ngày"
      },
      {
        id: 's2-5',
        start: 9.96,
        end: 14.92,
        text: "phrases, and see how to order food",
        translation: "cụm từ và xem cách đặt đồ ăn"
      },
      {
        id: 's2-6',
        start: 12.4,
        end: 17.6,
        text: "naturally and confidently.",
        translation: "một cách tự nhiên và tự tin."
      },
      {
        id: 's2-7',
        start: 14.92,
        end: 20.4,
        text: "Pay attention to how they ask questions,",
        translation: "Hãy chú ý đến cách họ đặt câu hỏi,"
      },
      {
        id: 's2-8',
        start: 17.6,
        end: 22.6,
        text: "choose items, and complete the order.",
        translation: "chọn mặt hàng và hoàn tất đơn hàng."
      },
      {
        id: 's2-9',
        start: 20.4,
        end: 25.04,
        text: "Try repeating the lines and imagine",
        translation: "Hãy thử lặp lại các dòng và tưởng tượng"
      },
      {
        id: 's2-10',
        start: 22.6,
        end: 26.48,
        text: "you're ordering at a real cafe.",
        translation: "bạn đang đặt hàng tại một quán cà phê thực sự."
      },
      {
        id: 's2-11',
        start: 25.04,
        end: 29.48,
        text: "Let's begin.",
        translation: "Hãy bắt đầu."
      },
      {
        id: 's2-12',
        start: 26.48,
        end: 32.92,
        text: "Ordering food at a cafe conversation.",
        translation: "Đặt đồ ăn tại một cuộc trò chuyện ở quán cà phê."
      },
      {
        id: 's2-13',
        start: 29.48,
        end: 36.52,
        text: "Hi. Can I order some food, please?",
        translation: "Xin chào. Tôi có thể gọi một ít thức ăn không?"
      },
      {
        id: 's2-14',
        start: 32.92,
        end: 37.84,
        text: "Sure. Eating here or taking away?",
        translation: "Chắc chắn rồi. Ăn ở đây hay mang đi?"
      },
      {
        id: 's2-15',
        start: 36.52,
        end: 40.12,
        text: "I'll eat here.",
        translation: "Tôi sẽ ăn ở đây."
      },
      {
        id: 's2-16',
        start: 37.84,
        end: 41.72,
        text: "Great. What would you like?",
        translation: "Tuyệt. Bạn muốn dùng gì?"
      },
      {
        id: 's2-17',
        start: 40.12,
        end: 43.56,
        text: "Hmm.",
        translation: "Hừm."
      },
      {
        id: 's2-18',
        start: 41.72,
        end: 46.56,
        text: "What do you recommend?",
        translation: "- Ông có gì ngon không?"
      },
      {
        id: 's2-19',
        start: 43.56,
        end: 49.24,
        text: "Our grilled chicken wrap is popular. We",
        translation: "Bọc gà nướng của chúng tôi rất phổ biến. Chúng tôi"
      },
      {
        id: 's2-20',
        start: 46.56,
        end: 50.52,
        text: "also have chicken, tuna, and veggie",
        translation: "cũng có thịt gà, cá ngừ và rau"
      },
      {
        id: 's2-21',
        start: 49.24,
        end: 53.2,
        text: "sandwiches.",
        translation: "Sandwich."
      },
      {
        id: 's2-22',
        start: 50.52,
        end: 54.32,
        text: "The chicken wrap sounds good. What's",
        translation: "Bọc gà nghe hay đấy. Cái gì"
      },
      {
        id: 's2-23',
        start: 53.2,
        end: 58.04,
        text: "inside?",
        translation: "phần trong; ở trong, nội bộ"
      },
      {
        id: 's2-24',
        start: 54.32,
        end: 59.48,
        text: "Chicken, lettuce, tomato, cucumber, and",
        translation: "Gà, rau diếp, cà chua, dưa chuột và"
      },
      {
        id: 's2-25',
        start: 58.04,
        end: 61.96,
        text: "garlic sauce.",
        translation: "nước sốt tỏi."
      },
      {
        id: 's2-26',
        start: 59.48,
        end: 65.2,
        text: "Is the garlic sauce spicy?",
        translation: "Nước sốt tỏi có cay không?"
      },
      {
        id: 's2-27',
        start: 61.96,
        end: 67.6,
        text: "No, it's creamy and mild.",
        translation: "Không, kem và nhẹ."
      },
      {
        id: 's2-28',
        start: 65.2,
        end: 70.76,
        text: "What does mild mean?",
        translation: "Nhẹ nghĩa là gì?"
      },
      {
        id: 's2-29',
        start: 67.6,
        end: 73.84,
        text: "It means not strong or spicy.",
        translation: "Nó có nghĩa là không mạnh hoặc cay."
      },
      {
        id: 's2-30',
        start: 70.76,
        end: 74.64,
        text: "Okay, perfect. I'll take the chicken",
        translation: "Được rồi, hoàn hảo. Tôi sẽ lấy thịt gà"
      },
      {
        id: 's2-31',
        start: 73.84,
        end: 76.72,
        text: "wrap.",
        translation: "quấn"
      },
      {
        id: 's2-32',
        start: 74.64,
        end: 78.52,
        text: "Regular or large?",
        translation: "Thường xuyên hay lớn?"
      },
      {
        id: 's2-33',
        start: 76.72,
        end: 80.08,
        text: "Regular is fine.",
        translation: "Thường xuyên là tốt."
      },
      {
        id: 's2-34',
        start: 78.52,
        end: 82.08,
        text: "Would you like a side?",
        translation: "Bạn có muốn chọn một bên không?"
      },
      {
        id: 's2-35',
        start: 80.08,
        end: 85.52,
        text: "What sides do you have?",
        translation: "Bạn có những mặt nào?"
      },
      {
        id: 's2-36',
        start: 82.08,
        end: 86.52,
        text: "Fries, potato wedges, coleslaw, or",
        translation: "Khoai tây chiên, khoai tây nêm, xà lách trộn, hoặc"
      },
      {
        id: 's2-37',
        start: 85.52,
        end: 88.96,
        text: "salad?",
        translation: "món rau trộn"
      },
      {
        id: 's2-38',
        start: 86.52,
        end: 92.52,
        text: "What are potato wedges?",
        translation: "Nêm khoai tây là gì?"
      },
      {
        id: 's2-39',
        start: 88.96,
        end: 96.52,
        text: "Thick pieces of baked or fried potato.",
        translation: "Miếng khoai tây nướng hoặc chiên dày."
      },
      {
        id: 's2-40',
        start: 92.52,
        end: 98.2,
        text: "Oh, okay. I'll have potato wedges.",
        translation: "Ồ, được rồi. Tôi sẽ ăn nêm khoai tây."
      },
      {
        id: 's2-41',
        start: 96.52,
        end: 101.32,
        text: "Would you like some sauce?",
        translation: "Bạn có muốn một ít nước sốt không?"
      },
      {
        id: 's2-42',
        start: 98.2,
        end: 104.92,
        text: "Yes. What sauces do you have?",
        translation: "Có. Bạn có loại nước sốt nào?"
      },
      {
        id: 's2-43',
        start: 101.32,
        end: 106.48,
        text: "Ketchup, garlic sauce, cheese sauce, or",
        translation: "Tương cà, sốt tỏi, sốt phô mai, hoặc"
      },
      {
        id: 's2-44',
        start: 104.92,
        end: 108.4,
        text: "spicy mayo?",
        translation: "sốt mayo cay?"
      },
      {
        id: 's2-45',
        start: 106.48,
        end: 109.92,
        text: "Cheese sauce, please.",
        translation: "Làm ơn cho nước sốt phô mai."
      },
      {
        id: 's2-46',
        start: 108.4,
        end: 113.04,
        text: "Would you like a drink?",
        translation: "Bạn có muốn uống gì không?"
      },
      {
        id: 's2-47',
        start: 109.92,
        end: 117.08,
        text: "Yes. Do you have fresh juice?",
        translation: "Có. Bạn có nước trái cây tươi không?"
      },
      {
        id: 's2-48',
        start: 113.04,
        end: 120.8,
        text: "Yes. Orange, apple, or lemon mint.",
        translation: "Vâng. Bạc hà cam, táo hoặc chanh."
      },
      {
        id: 's2-49',
        start: 117.08,
        end: 123.92,
        text: "Lemon mint sounds good. Is it sweet?",
        translation: "Bạc hà chanh nghe hay đấy. Ngọt chứ?"
      },
      {
        id: 's2-50',
        start: 120.8,
        end: 126.68,
        text: "We add sugar, but we can use less.",
        translation: "Chúng tôi thêm đường, nhưng chúng tôi có thể sử dụng ít hơn."
      },
      {
        id: 's2-51',
        start: 123.92,
        end: 128.4,
        text: "Yes, please. Less sugar.",
        translation: "Có, xin vui lòng. Ít đường hơn."
      },
      {
        id: 's2-52',
        start: 126.68,
        end: 130.08,
        text: "What size would you like?",
        translation: "Quy ́ vi ̣ muô ́ n ki ́ ch thươ ́ c gi"
      },
      {
        id: 's2-53',
        start: 128.4,
        end: 131.48,
        text: "Medium, please.",
        translation: "Trung bình, xin vui lòng."
      },
      {
        id: 's2-54',
        start: 130.08,
        end: 133.48,
        text: "Anything else?",
        translation: "Còn gì nữa không?"
      },
      {
        id: 's2-55',
        start: 131.48,
        end: 137.08,
        text: "Do you have soup today?",
        translation: "Hôm nay bạn có ăn súp không?"
      },
      {
        id: 's2-56',
        start: 133.48,
        end: 139.24,
        text: "Yes. Tomato soup or chicken soup?",
        translation: "Vâng. Súp cà chua hay súp gà?"
      },
      {
        id: 's2-57',
        start: 137.08,
        end: 142.36,
        text: "Which one do you recommend?",
        translation: "Bạn đề xuất cái nào?"
      },
      {
        id: 's2-58',
        start: 139.24,
        end: 143.8,
        text: "Chicken soup is light. Tomato soup is a",
        translation: "Súp gà nhẹ. Súp cà chua là một"
      },
      {
        id: 's2-59',
        start: 142.36,
        end: 146.2,
        text: "little thicker.",
        translation: "dày hơn một chút."
      },
      {
        id: 's2-60',
        start: 143.8,
        end: 149.48,
        text: "What does thicker mean?",
        translation: "Dày hơn có nghĩa là gì?"
      },
      {
        id: 's2-61',
        start: 146.2,
        end: 152.56,
        text: "It means less watery and heavier.",
        translation: "Nó có nghĩa là ít nước hơn và nặng hơn."
      },
      {
        id: 's2-62',
        start: 149.48,
        end: 154.84,
        text: "Okay. I'll try the tomato soup.",
        translation: "Được rồi, tôi sẽ thử súp cà chua."
      },
      {
        id: 's2-63',
        start: 152.56,
        end: 159.16,
        text: "Small or large bowl?",
        translation: "Bát nhỏ hay bát lớn?"
      },
      {
        id: 's2-64',
        start: 154.84,
        end: 160.96,
        text: "Small, please. I ordered a lot already.",
        translation: "Nhỏ, xin vui lòng. Tôi đã đặt hàng rất nhiều rồi."
      },
      {
        id: 's2-65',
        start: 159.16,
        end: 164.56,
        text: "You must be hungry.",
        translation: "Chắc hẳn bạn đang đói."
      },
      {
        id: 's2-66',
        start: 160.96,
        end: 166.28,
        text: "I skipped lunch. I'm very hungry.",
        translation: "Tôi đã bỏ bữa trưa. Tôi rất đói."
      },
      {
        id: 's2-67',
        start: 164.56,
        end: 168.52,
        text: "That explains it.",
        translation: "Điều đó giải thích điều đó."
      },
      {
        id: 's2-68',
        start: 166.28,
        end: 172.04,
        text: "Does the soup come with bread?",
        translation: "Súp có đi kèm với bánh mì không?"
      },
      {
        id: 's2-69',
        start: 168.52,
        end: 174.28,
        text: "Yes. It comes with two pieces of toast.",
        translation: "Vâng. Nó đi kèm với hai miếng bánh mì nướng."
      },
      {
        id: 's2-70',
        start: 172.04,
        end: 175.8,
        text: "Great. I'll take it.",
        translation: "Tuyệt vời. Tôi sẽ lấy nó."
      },
      {
        id: 's2-71',
        start: 174.28,
        end: 179.16,
        text: "Would you like dessert?",
        translation: "Bạn có muốn ăn tráng miệng không?"
      },
      {
        id: 's2-72',
        start: 175.8,
        end: 182.6,
        text: "Maybe. What desserts do you have?",
        translation: "Có thể. Bạn có món tráng miệng nào?"
      },
      {
        id: 's2-73',
        start: 179.16,
        end: 183.84,
        text: "Chocolate cake, cheesecake, cookies, and",
        translation: "Bánh sô cô la, bánh pho mát, bánh quy và"
      },
      {
        id: 's2-74',
        start: 182.6,
        end: 187.24,
        text: "ice cream.",
        translation: "kem"
      },
      {
        id: 's2-75',
        start: 183.84,
        end: 190.28,
        text: "Mhm. Cheesecake sounds good.",
        translation: "Mhm. Bánh phô mai nghe hay đấy."
      },
      {
        id: 's2-76',
        start: 187.24,
        end: 192.28,
        text: "It's one of our most popular desserts.",
        translation: "Đây là một trong những món tráng miệng phổ biến nhất của chúng tôi."
      },
      {
        id: 's2-77',
        start: 190.28,
        end: 194.08,
        text: "Is it a big slice?",
        translation: "Đó có phải là một lát cắt lớn không?"
      },
      {
        id: 's2-78',
        start: 192.28,
        end: 195.4,
        text: "It's medium-sized.",
        translation: "Nó có kích thước trung bình."
      },
      {
        id: 's2-79',
        start: 194.08,
        end: 199.4,
        text: "You can share it.",
        translation: "Bạn có thể chia sẻ nó."
      },
      {
        id: 's2-80',
        start: 195.4,
        end: 201.16,
        text: "I'm alone, so maybe I shouldn't.",
        translation: "Tôi ở một mình, vì vậy có lẽ tôi không nên."
      },
      {
        id: 's2-81',
        start: 199.4,
        end: 205,
        text: "You can take it home.",
        translation: "Bạn có thể mang nó về nhà."
      },
      {
        id: 's2-82',
        start: 201.16,
        end: 207.12,
        text: "Good idea. Add one cheesecake, please.",
        translation: "Ý tưởng hay. Vui lòng thêm một chiếc bánh pho mát."
      },
      {
        id: 's2-83',
        start: 205,
        end: 210.16,
        text: "Would you like it packed separately?",
        translation: "Bạn có muốn đóng gói riêng không?"
      },
      {
        id: 's2-84',
        start: 207.12,
        end: 212.08,
        text: "Yes. I'll take the cheesecake home.",
        translation: "Vâng. Tôi sẽ mang bánh phô mai về nhà."
      },
      {
        id: 's2-85',
        start: 210.16,
        end: 213.16,
        text: "No problem. Let [clears throat] me check",
        translation: "Không vấn đề gì. Hãy để [hắng giọng] tôi kiểm tra"
      },
      {
        id: 's2-86',
        start: 212.08,
        end: 214.24,
        text: "your order.",
        translation: "đơn hàng của bạn"
      },
      {
        id: 's2-87',
        start: 213.16,
        end: 217.48,
        text: "Sure.",
        translation: "Chắc chắn rồi."
      },
      {
        id: 's2-88',
        start: 214.24,
        end: 221.24,
        text: "One regular grilled chicken wrap, potato",
        translation: "Một gói gà nướng thông thường, khoai tây"
      },
      {
        id: 's2-89',
        start: 217.48,
        end: 222.6,
        text: "wedges, cheese sauce, lemon mint, and",
        translation: "nêm, sốt phô mai, bạc hà chanh và"
      },
      {
        id: 's2-90',
        start: 221.24,
        end: 223.64,
        text: "tomato soup.",
        translation: "Súp cà chua"
      },
      {
        id: 's2-91',
        start: 222.6,
        end: 227.44,
        text: "Yes.",
        translation: "Có."
      },
      {
        id: 's2-92',
        start: 223.64,
        end: 227.44,
        text: "And one cheesecake",
        translation: "Và một chiếc bánh pho mát"
      },
      {
        id: 's2-93',
        start: 227.72,
        end: 229.96,
        text: "to take",
        translation: "Để thi"
      },
      {
        id: 's2-94',
        start: 228.16,
        end: 231.96,
        text: "the wrap as a combo?",
        translation: "gói như một combo?"
      },
      {
        id: 's2-95',
        start: 229.96,
        end: 234.44,
        text: "How much is the combo?",
        translation: "Combo giá bao nhiêu?"
      },
      {
        id: 's2-96',
        start: 231.96,
        end: 236.52,
        text: "It's $11.50",
        translation: "Đó là $ 11,50"
      },
      {
        id: 's2-97',
        start: 234.44,
        end: 239.64,
        text: "with a side and drink.",
        translation: "với một bên và uống."
      },
      {
        id: 's2-98',
        start: 236.52,
        end: 240.92,
        text: "That sounds good. Make it a combo.",
        translation: "Nghe hay đấy. Biến nó thành một combo."
      },
      {
        id: 's2-99',
        start: 239.64,
        end: 244.4,
        text: "Sure.",
        translation: "Chắc chắn rồi."
      },
      {
        id: 's2-100',
        start: 240.92,
        end: 247.04,
        text: "The soup is $4.25",
        translation: "Súp là $ 4,25"
      },
      {
        id: 's2-101',
        start: 244.4,
        end: 249.56,
        text: "and the cheesecake is $3.",
        translation: "và bánh pho mát là $ 3."
      },
      {
        id: 's2-102',
        start: 247.04,
        end: 253.64,
        text: "Okay. What's the total?",
        translation: "Được rồi. Tổng cộng là bao nhiêu?"
      },
      {
        id: 's2-103',
        start: 249.56,
        end: 253.64,
        text: "Your total is $18.75.",
        translation: "Tổng số tiền của bạn là $ 18,75."
      },
      {
        id: 's2-104',
        start: 253.88,
        end: 258.32,
        text: "Can I pay by card?",
        translation: "Tôi có thể thanh toán bằng thẻ không?"
      },
      {
        id: 's2-105',
        start: 255.68,
        end: 259.56,
        text: "Yes. Tap your card here.",
        translation: "Có. Nhấn vào thẻ của bạn ở đây."
      },
      {
        id: 's2-106',
        start: 258.32,
        end: 261.92,
        text: "Like this?",
        translation: "Thích cái này không?"
      },
      {
        id: 's2-107',
        start: 259.56,
        end: 262.88,
        text: "Yes. Hold it for a second.",
        translation: "Vâng. Chờ một chút."
      },
      {
        id: 's2-108',
        start: 261.92,
        end: 264.6,
        text: "Okay.",
        translation: "Được rồi."
      },
      {
        id: 's2-109',
        start: 262.88,
        end: 266.28,
        text: "Payment successful.",
        translation: "Thanh toán thành công."
      },
      {
        id: 's2-110',
        start: 264.6,
        end: 268.52,
        text: "Can I get a receipt?",
        translation: "Tôi có thể nhận biên lai không?"
      },
      {
        id: 's2-111',
        start: 266.28,
        end: 270.24,
        text: "Of course. Here you go.",
        translation: "Tất nhiên. Của bạn đây."
      },
      {
        id: 's2-112',
        start: 268.52,
        end: 274,
        text: "Do I need a number?",
        translation: "Tôi có cần số điện thoại không?"
      },
      {
        id: 's2-113',
        start: 270.24,
        end: 274.88,
        text: "Yes. Here's number 42. Put it on your",
        translation: "Vâng. Đây là số 42. Đặt nó trên"
      },
      {
        id: 's2-114',
        start: 274,
        end: 277.4,
        text: "table.",
        translation: "bàn."
      },
      {
        id: 's2-115',
        start: 274.88,
        end: 280.28,
        text: "So, I don't need to wait here?",
        translation: "Vậy, tôi không cần phải chờ ở đây?"
      },
      {
        id: 's2-116',
        start: 277.4,
        end: 283.36,
        text: "No. Choose any empty table.",
        translation: "Không. Chọn bất kỳ bảng trống nào."
      },
      {
        id: 's2-117',
        start: 280.28,
        end: 286.36,
        text: "Nice. How long will it take?",
        translation: "Tốt. Sẽ mất bao lâu?"
      },
      {
        id: 's2-118',
        start: 283.36,
        end: 287.36,
        text: "About 10 to 12 minutes. The wrap is",
        translation: "Khoảng 10 đến 12 phút. Bọc là"
      },
      {
        id: 's2-119',
        start: 286.36,
        end: 290.8,
        text: "fresh.",
        translation: "tươi, tươi tắn"
      },
      {
        id: 's2-120',
        start: 287.36,
        end: 292.32,
        text: "That's fine. Fresh food is worth it.",
        translation: "Không sao. Thực phẩm tươi sống rất đáng giá."
      },
      {
        id: 's2-121',
        start: 290.8,
        end: 294.92,
        text: "Exactly.",
        translation: "Chính xác."
      },
      {
        id: 's2-122',
        start: 292.32,
        end: 298.4,
        text: "Can I get some water while I wait?",
        translation: "Tôi có thể lấy một ít nước trong khi chờ đợi không?"
      },
      {
        id: 's2-123',
        start: 294.92,
        end: 300.72,
        text: "Sure. Bottled water or a free cup?",
        translation: "Chắc chắn rồi. Nước đóng chai hay cốc miễn phí?"
      },
      {
        id: 's2-124',
        start: 298.4,
        end: 301.84,
        text: "A cup is fine. Thank you.",
        translation: "Một cốc cũng được. Cảm ơn bạn."
      },
      {
        id: 's2-125',
        start: 300.72,
        end: 304.64,
        text: "Here you go.",
        translation: "Của bạn đây."
      },
      {
        id: 's2-126',
        start: 301.84,
        end: 307.08,
        text: "Could I have extra napkins, too?",
        translation: "Tôi cũng có thể có thêm khăn ăn không?"
      },
      {
        id: 's2-127',
        start: 304.64,
        end: 311.72,
        text: "Sure. They're beside the counter.",
        translation: "Chắc chắn rồi. Chúng ở bên cạnh quầy."
      },
      {
        id: 's2-128',
        start: 307.08,
        end: 313.52,
        text: "Thanks. I always make a mess with wraps.",
        translation: "Cảm ơn. Tôi luôn làm rối tung mọi thứ."
      },
      {
        id: 's2-129',
        start: 311.72,
        end: 314.76,
        text: "You're not the only one.",
        translation: "Bạn không phải là người duy nhất."
      },
      {
        id: 's2-130',
        start: 313.52,
        end: 317,
        text: "Good to know.",
        translation: "Điều cần biết."
      },
      {
        id: 's2-131',
        start: 314.76,
        end: 319.84,
        text: "Your food will be ready soon.",
        translation: "Đồ ăn của bạn sẽ sớm sẵn sàng."
      },
      {
        id: 's2-132',
        start: 317,
        end: 322.48,
        text: "Perfect. Thanks for your help.",
        translation: "Hoàn hảo. Cảm ơn sự giúp đỡ của bạn."
      },
      {
        id: 's2-133',
        start: 319.84,
        end: 324.08,
        text: "You're welcome. Enjoy your meal.",
        translation: "Không có gì. Hãy thưởng thức bữa ăn của bạn."
      },
      {
        id: 's2-134',
        start: 322.48,
        end: 326.08,
        text: "Thank you.",
        translation: "Cảm ơn bạn."
      },
      {
        id: 's2-135',
        start: 324.08,
        end: 327.88,
        text: "Did you enjoy this conversation? Follow",
        translation: "Bạn có thích cuộc trò chuyện này không? Theo dõi"
      },
      {
        id: 's2-136',
        start: 326.08,
        end: 329.64,
        text: "a DeepLingo English for more real-life",
        translation: "một tiếng Anh DeepLingo cho cuộc sống thực hơn"
      },
      {
        id: 's2-137',
        start: 327.88,
        end: 331.36,
        text: "daily English practice.",
        translation: "thực hành tiếng Anh hàng ngày."
      },
      {
        id: 's2-138',
        start: 329.64,
        end: 332.92,
        text: "Want to practice role plays, shadowing,",
        translation: "Muốn thực hành đóng vai, theo dõi,"
      },
      {
        id: 's2-139',
        start: 331.36,
        end: 335.28,
        text: "vocabulary, and speaking with an AI",
        translation: "từ vựng và nói chuyện với AI"
      },
      {
        id: 's2-140',
        start: 332.92,
        end: 337.8,
        text: "teacher? Try the DeepLingo app. Link in",
        translation: "giáo viên? Hãy thử ứng dụng DeepLingo. Liên kết trong"
      },
      {
        id: 's2-141',
        start: 335.28,
        end: 337.8,
        text: "bio.",
        translation: "tiểu sử"
      }
    ],
    quizzes: [
      {
        id: 'q2-1',
        question: 'What kind of milk did the customer ask for?',
        options: ['Whole milk', 'Almond milk', 'Oat milk', 'Soy milk'],
        correctAnswer: 2,
        explanation: 'At 0:12, the customer requested an iced caramel latte with oat milk.'
      },
      {
        id: 'q2-2',
        question: 'What sweet level did the customer request?',
        options: ['No sugar', 'Extra sweet', 'Half-sweet', 'Standard'],
        correctAnswer: 2,
        explanation: 'At 0:24, the customer asked: "could you make that half-sweet?".'
      }
    ]
  },
  {
    id: 'lesson-3',
    youtubeId: 'gedoSfZvBgE',
    title: 'The Benefits of a Good Night Sleep',
    channel: 'TED-Ed / Shai Marcu',
    channelAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop',
    thumbnail: 'https://img.youtube.com/vi/gedoSfZvBgE/maxresdefault.jpg',
    level: 'B2',
    topic: 'Science & Nature',
    duration: '05:10',
    durationSec: 310,
    views: '8.5M',
    description: 'Discover how deep sleep cycles clean metabolic waste from your brain and boost daytime cognitive performance.',
    subtitles: [
      {
        id: 's3-1',
        start: 7.32,
        end: 13.2,
        text: "It's 4 a.m.,  and the big test is in eight hours,",
        translation: "Bây giờ là 4 giờ sáng, và bài kiểm tra quan trọng sẽ diễn ra sau 8 tiếng nữa,"
      },
      {
        id: 's3-2',
        start: 13.2,
        end: 16.12,
        text: "followed by a piano recital.",
        translation: "Rồi sau đó là bài độc tấu piano."
      },
      {
        id: 's3-3',
        start: 16.12,
        end: 21.89,
        text: "You've been studying and playing for days, but you still don't feel ready for either.",
        translation: "Bạn đã học và luyện tập nhiều ngày r���i, nhưng bạn thấy mình vẫn chưa sẵn sàng."
      },
      {
        id: 's3-4',
        start: 21.89,
        end: 23.32,
        text: "So, what can you do?",
        translation: "Vậy bạn có thể làm gì?"
      },
      {
        id: 's3-5',
        start: 23.32,
        end: 25.32,
        text: "Well, you can drink another cup of coffee",
        translation: "Bạn có thể lấy thêm một cốc cà phê nữa"
      },
      {
        id: 's3-6',
        start: 25.32,
        end: 28.08,
        text: "and spend the next few hours  cramming and practicing,",
        translation: "và dành vài giờ tiếp theo để luyện thi và tập luyện,"
      },
      {
        id: 's3-7',
        start: 28.08,
        end: 30,
        text: "but believe it or not,",
        translation: "Nhưng dù có tin hay không,"
      },
      {
        id: 's3-8',
        start: 30,
        end: 33.48,
        text: "you might be better off closing the books, putting away the music,",
        translation: "Bạn tốt hơn nên đóng quyển sách lại, để âm nhạc sang một bên,"
      },
      {
        id: 's3-9',
        start: 33.48,
        end: 35.82,
        text: "and going to sleep.",
        translation: "và đi ngủ."
      },
      {
        id: 's3-10',
        start: 35.82,
        end: 38.18,
        text: "Sleep occupies nearly  a third of our lives,",
        translation: "Giấc ngủ chiếm gần  một phần ba cuộc đời,"
      },
      {
        id: 's3-11',
        start: 38.18,
        end: 43.15,
        text: "but many of us give surprisingly little attention and care to it.",
        translation: "nhưng thật thú vị rằng rất nhiều người dành rất ít sự quan tâm đến nó."
      },
      {
        id: 's3-12',
        start: 43.15,
        end: 46.73,
        text: "This neglect is often the result  of a major misunderstanding.",
        translation: "Sự thờ ơ này dẫn đến nhiều sự hiểu nhầm nghiêm trọng."
      },
      {
        id: 's3-13',
        start: 46.73,
        end: 48.64,
        text: "Sleep isn't lost time,",
        translation: "Ngủ không phải là lãng phí thời gian,"
      },
      {
        id: 's3-14',
        start: 48.64,
        end: 52.33,
        text: "or just a way to rest  when all our important work is done.",
        translation: "hay chỉ là một cách nghỉ ngơi khi mọi việc quan trọng đã hoàn thành."
      },
      {
        id: 's3-15',
        start: 52.33,
        end: 54.34,
        text: "Instead, it's a critical function,",
        translation: "Thay v��o đó, nó là một hoạt động cốt yếu,"
      },
      {
        id: 's3-16',
        start: 54.34,
        end: 58.76,
        text: "during which your body balances and regulates its vital systems,",
        translation: "mà trong đó cơ thể cân bằng và điều chỉnh hệ thống của nó,"
      },
      {
        id: 's3-17',
        start: 58.76,
        end: 60.35,
        text: "affecting respiration",
        translation: "chi phối sự hô hấp"
      },
      {
        id: 's3-18',
        start: 60.35,
        end: 65.44,
        text: "and regulating everything from circulation to growth and immune response.",
        translation: "và điều hoà mọi thứ từ sự tuần hoàn đến sự lớn lên và miễn dịch."
      },
      {
        id: 's3-19',
        start: 65.44,
        end: 70.82,
        text: "That's great, but you can worry about  all those things after this test, right?",
        translation: "Thật tuyệt, nhưng bạn có thể nghĩ về những điều đó sau kì thi, đúng không?"
      },
      {
        id: 's3-20',
        start: 70.82,
        end: 72.44,
        text: "Well, not so fast.",
        translation: "Đừng vội như vậy chứ."
      },
      {
        id: 's3-21',
        start: 72.44,
        end: 75.47,
        text: "It turns out that sleep  is also crucial for your brain,",
        translation: "Giấc ngủ hoá ra lại vô cùng quan trọng với bộ não,"
      },
      {
        id: 's3-22',
        start: 75.47,
        end: 78.17,
        text: "with a fifth of your body's  circulatory blood",
        translation: "với một phần năm của sự lưu thông máu trong cơ thể bạn"
      },
      {
        id: 's3-23',
        start: 78.17,
        end: 80.85,
        text: "being channeled to it as you drift off.",
        translation: "được vận chuyển khi bạn chìm vào giấc ngủ."
      },
      {
        id: 's3-24',
        start: 80.85,
        end: 83.46,
        text: "And what goes on  in your brain while you sleep",
        translation: "Và những điều diễn ra trong bộ não khi ngủ"
      },
      {
        id: 's3-25',
        start: 83.46,
        end: 86.54,
        text: "is an intensely active period  of restructuring",
        translation: "là một giai đoạn tích cực của sự tái tổ chức"
      },
      {
        id: 's3-26',
        start: 86.54,
        end: 89.36,
        text: "that's crucial for how our memory works.",
        translation: "cái mà vô cùng quan trọng với cách mà bộ não làm việc."
      },
      {
        id: 's3-27',
        start: 89.36,
        end: 90.36,
        text: "At first glance,",
        translation: "Từ cái nhìn ban đầu,"
      },
      {
        id: 's3-28',
        start: 90.36,
        end: 94.25,
        text: "our ability to remember things  doesn't seem very impressive at all.",
        translation: "khả năng ghi nhớ của chúng ta dường như không có vẻ ấn tượng cho lắm."
      },
      {
        id: 's3-29',
        start: 94.25,
        end: 97.04,
        text: "19th century psychologist  Herman Ebbinghaus",
        translation: "Nhà tâm lý học thế kỉ 19 Herman Ebbinghaus"
      },
      {
        id: 's3-30',
        start: 97.04,
        end: 100.91,
        text: "demonstrated that we normally forget 40% of new material",
        translation: "chỉ ra rằng chúng ta thường quên 40% kiến thức mới"
      },
      {
        id: 's3-31',
        start: 100.91,
        end: 103.39,
        text: "within the first twenty minutes,",
        translation: "trong vòng 20 phút đầu tiên,"
      },
      {
        id: 's3-32',
        start: 103.39,
        end: 107.13,
        text: "a phenomenon known as the forgetting curve.",
        translation: "một hiện tượng được biết đến với tên gọi “Đường cong sự quên”."
      },
      {
        id: 's3-33',
        start: 107.13,
        end: 110.73,
        text: "But this loss can be prevented  through memory consolidation,",
        translation: "Nhưng sự quên lãng này có thể được ngăn cản bằng sự củng cố trí nhớ,"
      },
      {
        id: 's3-34',
        start: 110.73,
        end: 113.29,
        text: "the process by which information is moved",
        translation: "quá trình nhờ đó thông tin di chuyển"
      },
      {
        id: 's3-35',
        start: 113.29,
        end: 118.9,
        text: "from our fleeting short-term memory to our more durable long-term memory.",
        translation: "từ trí bộ nhớ ngắn hạn đến trí nhớ nhớ dài hạn."
      },
      {
        id: 's3-36',
        start: 118.9,
        end: 122.62,
        text: "This consolidation occurs with the help of a major part of the brain,",
        translation: "Nó xảy ra nhờ sự giúp đỡ từ một bộ phận quan trọng của não,"
      },
      {
        id: 's3-37',
        start: 122.62,
        end: 125.34,
        text: "known as the hippocampus.",
        translation: "được biết đến như là thuỳ hải mã."
      },
      {
        id: 's3-38',
        start: 125.34,
        end: 127.36,
        text: "Its role in long-term memory formation",
        translation: "Vai trò hình thành trí nhớ dài hạn của nó"
      },
      {
        id: 's3-39',
        start: 127.36,
        end: 131.37,
        text: "was demonstrated in the 1950s by Brenda Milner",
        translation: "được chứng minh vào những năm 1950 bởi Brenda Milner"
      },
      {
        id: 's3-40',
        start: 131.37,
        end: 134.66,
        text: "in her research with  a patient known as H.M.",
        translation: "trong một nghiên cứu với một bệnh nhân tên H.M."
      },
      {
        id: 's3-41',
        start: 134.66,
        end: 136.96,
        text: "After having his hippocampus removed,",
        translation: "Sau khi thuỳ hải mã của anh ấy bị loại bỏ,"
      },
      {
        id: 's3-42',
        start: 136.96,
        end: 141.32,
        text: "H.M.'s ability to form new short-term memories was damaged,",
        translation: "khả năng hình thành trí nhớ ngắn hạn của H.M bị tổn thương,"
      },
      {
        id: 's3-43',
        start: 141.32,
        end: 145.89,
        text: "but he was able to learn physical tasks through repetition.",
        translation: "nhưng anh ta vẫn có thể học các bài tập thể dục qua sự lặp lại."
      },
      {
        id: 's3-44',
        start: 145.89,
        end: 147.72,
        text: "Due to the removal of his hippocampus,",
        translation: "Do sự xoá bỏ của thuỳ hải mã,"
      },
      {
        id: 's3-45',
        start: 147.72,
        end: 152.29,
        text: "H.M.'s ability to form long-term memories was also damaged.",
        translation: "khả năng hình thành trí nhớ dài hạn của H.M cũng bị tổn thương."
      },
      {
        id: 's3-46',
        start: 152.29,
        end: 154.44,
        text: "What this case revealed, among other things,",
        translation: "Điều nó chỉ ra, bên cạnh nhiều điều khác,"
      },
      {
        id: 's3-47',
        start: 154.44,
        end: 157.36,
        text: "was that the hippocampus  was specifically involved",
        translation: "là thuỳ hải mã rõ ràng tham gia"
      },
      {
        id: 's3-48',
        start: 157.36,
        end: 162.06,
        text: "in the consolidation of long-term declarative memory,",
        translation: "vào sự củng cố của trí nhớ quy nạp,"
      },
      {
        id: 's3-49',
        start: 162.06,
        end: 165.32,
        text: "such as the facts and concepts you need to remember for that test,",
        translation: "như các thực tế và khái niệm bạn cần phải nhớ cho bài kiểm tra,"
      },
      {
        id: 's3-50',
        start: 165.32,
        end: 167.13,
        text: "rather than procedural memory,",
        translation: "chứ không phải là bộ nhớ thường trực,"
      },
      {
        id: 's3-51',
        start: 167.13,
        end: 171.73,
        text: "such as the finger movements you need to master for that recital.",
        translation: "như sự di chuyển ngón tay bạn cần nắm vững cho bài độc tấu."
      },
      {
        id: 's3-52',
        start: 171.73,
        end: 175.39,
        text: "Milner's findings, along with work  by Eric Kandel in the 90's,",
        translation: "Phát hiện của Milner, cùng với thành quả của Eric Kandel những năm 90,"
      },
      {
        id: 's3-53',
        start: 175.39,
        end: 180.75,
        text: "have given us our current model  of how this consolidation process works.",
        translation: "đã đem lại mô hình về cách quá trình củng cố làm việc."
      },
      {
        id: 's3-54',
        start: 180.75,
        end: 182.8,
        text: "Sensory data is initially transcribed",
        translation: "Thông tin cảm giác trước hết được sao lại"
      },
      {
        id: 's3-55',
        start: 182.8,
        end: 187.07,
        text: "and temporarily recorded in the neurons as short-term memory.",
        translation: "và lưu trữ tạm thời ở trong các nơron như trí nhớ ngắn hạn."
      },
      {
        id: 's3-56',
        start: 187.07,
        end: 189.62,
        text: "From there, it travels to the hippocampus,",
        translation: "Từ đó, nó di chuyển đến thuỳ hải mã,"
      },
      {
        id: 's3-57',
        start: 189.62,
        end: 193.15,
        text: "which strengthens and enhances  the neurons in that cortical area.",
        translation: "thứ sẽ tăng cường các nơron ở vỏ não"
      },
      {
        id: 's3-58',
        start: 193.15,
        end: 195.37,
        text: "Thanks to the phenomenon of neuroplasticity,",
        translation: "Nhờ vào hiện tượng 'tính dẻo của bộ não',"
      },
      {
        id: 's3-59',
        start: 195.37,
        end: 200.34,
        text: "new synaptic buds are formed, allowing new connections between neurons,",
        translation: "các liên kết synap hình thành, cho phép sự liên kết mới giữa các nơron,"
      },
      {
        id: 's3-60',
        start: 200.34,
        end: 202.18,
        text: "and strengthening the neural network",
        translation: "và tăng cường m��ng nơron"
      },
      {
        id: 's3-61',
        start: 202.18,
        end: 205.93,
        text: "where the information will be returned as long-term memory.",
        translation: "nơi mà thông tin sẽ được trả về như bộ nhớ dài hạn."
      },
      {
        id: 's3-62',
        start: 205.93,
        end: 208.8,
        text: "So why do we remember some things and not others?",
        translation: "Vậy tại sao bạn lại nhớ cái này mà không phải cái khác?"
      },
      {
        id: 's3-63',
        start: 208.8,
        end: 210.69,
        text: "Well, there are a few ways to influence",
        translation: "Có một vài cách để tác động"
      },
      {
        id: 's3-64',
        start: 210.69,
        end: 214.3,
        text: "the extent and effectiveness  of memory retention.",
        translation: "đến mức độ và sự hiệu quả của việc ghi nhớ."
      },
      {
        id: 's3-65',
        start: 214.3,
        end: 218.44,
        text: "For example, memories that are formed in times of heightened feeling,",
        translation: "Chẳng hạn, trí nhớ được hình thành khi cảm xúc lên cao,"
      },
      {
        id: 's3-66',
        start: 218.44,
        end: 219.47,
        text: "or even stress,",
        translation: "thậm chí căng thẳng"
      },
      {
        id: 's3-67',
        start: 219.47,
        end: 224.73,
        text: "will be better recorded due to  the hippocampus' link with emotion.",
        translation: "sẽ được lưu giữ tốt hơn nhờ sự liên kết của thuỳ hải mã với cảm xúc."
      },
      {
        id: 's3-68',
        start: 224.73,
        end: 228.72,
        text: "But one of the major factors contributing to memory consolidation is,",
        translation: "Nhưng một trong các yếu tố chính đóng góp vào việc củng cố trí nhớ là,"
      },
      {
        id: 's3-69',
        start: 228.72,
        end: 229.89,
        text: "you guessed it,",
        translation: "bạn đã đoán được rồi đấy,"
      },
      {
        id: 's3-70',
        start: 229.89,
        end: 231.88,
        text: "a good night's sleep.",
        translation: "một giấc ngủ ngon."
      },
      {
        id: 's3-71',
        start: 231.88,
        end: 234.21,
        text: "Sleep is composed of four stages,",
        translation: "Giấc ngủ gồm bốn giai đoạn,"
      },
      {
        id: 's3-72',
        start: 234.21,
        end: 236.95,
        text: "the deepest of which are known as slow-wave sleep",
        translation: "mà hai giai đoạn sâu nhất là ngủ s��ng chậm"
      },
      {
        id: 's3-73',
        start: 236.95,
        end: 239.23,
        text: "and rapid eye movement.",
        translation: "và ngủ chuyển động mắt nhanh."
      },
      {
        id: 's3-74',
        start: 239.23,
        end: 242.39,
        text: "EEG machines monitoring people during these stages",
        translation: "Máy EEG giám sát con người qua các quá trình này"
      },
      {
        id: 's3-75',
        start: 242.39,
        end: 244.38,
        text: "have shown electrical impulses",
        translation: "đã chỉ ra sằng các xung điện"
      },
      {
        id: 's3-76',
        start: 244.38,
        end: 249.69,
        text: "moving between the brainstem, hippocampus, thalamus, and cortex,",
        translation: "di chuyển giữa cuống não, thuỳ hải mã, đại não, đồi não và vỏ não,"
      },
      {
        id: 's3-77',
        start: 249.69,
        end: 253.53,
        text: "which serve as relay stations  of memory formation.",
        translation: "cái đóng vai trò như trạm chuyển tiếp của việc hình thành bộ nhớ."
      },
      {
        id: 's3-78',
        start: 253.53,
        end: 256.9,
        text: "And the different stages of sleep have been shown to help consolidate",
        translation: "Và các giai đoạn của giấc ngủ được chỉ ra là giúp củng cố"
      },
      {
        id: 's3-79',
        start: 256.9,
        end: 259.11,
        text: "different types of memories.",
        translation: "các dạng khác nhau của trí nhớ."
      },
      {
        id: 's3-80',
        start: 259.11,
        end: 262.56,
        text: "During the non-REM slow-wave sleep,",
        translation: "Trong giai đoạn non-REM - ngủ sóng chậm,"
      },
      {
        id: 's3-81',
        start: 262.56,
        end: 266.13,
        text: "declarative memory is encoded  into a temporary store",
        translation: "trí nhớ quy nạp được mã hoá tại một nơi lưu trữ tạm thời"
      },
      {
        id: 's3-82',
        start: 266.13,
        end: 268.95,
        text: "in the anterior part of the hippocampus.",
        translation: "ở phần phía trước của thuỳ hải mã."
      },
      {
        id: 's3-83',
        start: 268.95,
        end: 272.79,
        text: "Through a continuing dialogue  between the cortex and hippocampus,",
        translation: "Qua các trao đổi liên tục giữa vỏ não và thuỳ hải mã,"
      },
      {
        id: 's3-84',
        start: 272.79,
        end: 275.5,
        text: "it is then repeatedly reactivated,",
        translation: "nó liên tục được tái kích hoạt,"
      },
      {
        id: 's3-85',
        start: 275.5,
        end: 281,
        text: "driving its gradual redistribution to long-term storage in the cortex.",
        translation: "làm nó dần dần tái phân bố đến trí nhớ dài hạn ở vỏ não."
      },
      {
        id: 's3-86',
        start: 281,
        end: 284.88,
        text: "REM sleep, on the other hand, with its similarity to waking brain activity,",
        translation: "Giấc ngủ REM, mặt khác, với sự tương đồng của nó với đánh thức hoạt động của não,"
      },
      {
        id: 's3-87',
        start: 284.88,
        end: 288.47,
        text: "is associated with the consolidation of procedural memory.",
        translation: "liên hệ với sự củng cố của trí nhớ thường trực."
      },
      {
        id: 's3-88',
        start: 288.47,
        end: 290.31,
        text: "So based on the studies,",
        translation: "Vì vậy, theo một vài nghiên cứu,"
      },
      {
        id: 's3-89',
        start: 290.31,
        end: 293.53,
        text: "going to sleep three hours after  memorizing your formulas",
        translation: "đi ngủ khoảng ba tiếng sau khi ghi nhớ các công thức"
      },
      {
        id: 's3-90',
        start: 293.53,
        end: 298.51,
        text: "and one hour after practicing your scales would be the most ideal.",
        translation: "và một tiếng sau khi luyện tập những gam nhạc sẽ là lý tưởng nhất."
      },
      {
        id: 's3-91',
        start: 298.51,
        end: 301.02,
        text: "So hopefully you can see now that skimping on sleep",
        translation: "Vậy hy vọng bạn có thể thấy việc rút ngắn giấc ngủ"
      },
      {
        id: 's3-92',
        start: 301.02,
        end: 303.29,
        text: "not only harms your long-term health,",
        translation: "không những ảnh hưởng đến sức khoẻ lâu dài,"
      },
      {
        id: 's3-93',
        start: 303.29,
        end: 305.07,
        text: "but actually makes it less likely",
        translation: "mà còn làm ít có khả năng"
      },
      {
        id: 's3-94',
        start: 305.07,
        end: 309.42,
        text: "that you'll retain all that knowledge and practice from the previous night,",
        translation: "bạn sẽ nhớ được những kiến thức và bài tâp từ tối hôm trước,"
      },
      {
        id: 's3-95',
        start: 309.42,
        end: 313.54,
        text: "all of which just goes to affirm the wisdom of the phrase, \"Sleep on it.\"",
        translation: "tất cả những điều đó khẳng định sự sáng suốt của câu nói, \"để mai tính.\""
      },
      {
        id: 's3-96',
        start: 313.54,
        end: 315.64,
        text: "When you think about  all the internal restructuring",
        translation: "Khi bạn nghĩ về tất cả sự tái cấu trúc bên trong"
      },
      {
        id: 's3-97',
        start: 315.64,
        end: 319.37,
        text: "and forming of new connections that occurs while you slumber,",
        translation: "và việc hình thành các mối liên kết mới xảy ra khi bạn ngủ,"
      },
      {
        id: 's3-98',
        start: 319.37,
        end: 321.28,
        text: "you could even say that proper sleep",
        translation: "bạn có thể nói một giấc ngủ phù hợp"
      },
      {
        id: 's3-99',
        start: 321.28,
        end: 325.09,
        text: "will have you waking up every morning with a new and improved brain,",
        translation: "sẽ làm cho bạn thức dậy mỗi buổi sáng với một bộ não mới mẻ và được cải thiện,"
      },
      {
        id: 's3-100',
        start: 325.09,
        end: 327.59,
        text: "ready to face the challenges ahead.",
        translation: "sẵn sàng đối mặt với các thử thách."
      }
    ],
    quizzes: [
      {
        id: 'q3-1',
        question: 'What occurs during deep sleep according to researchers?',
        options: ['Brain shuts off completely', 'Cerebrospinal fluid washes away toxic proteins', 'Heart rate triples', 'Digestive system stops'],
        correctAnswer: 1,
        explanation: 'At 0:44, the video shows cerebrospinal fluid washing away toxic proteins from brain cells.'
      }
    ]
  },
  {
    id: 'lesson-4',
    youtubeId: 'UF8uR6Z6KLc',
    title: 'Steve Jobs: How to Live Before You Die',
    channel: 'Stanford / Steve Jobs',
    channelAvatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&h=100&fit=crop',
    thumbnail: 'https://img.youtube.com/vi/UF8uR6Z6KLc/maxresdefault.jpg',
    level: 'B2',
    topic: 'Inspiration',
    duration: '15:04',
    durationSec: 904,
    views: '42M',
    description: 'Steve Jobs urges us to pursue our dreams and see the opportunities in life setbacks — including death itself.',
    subtitles: [
      {
        id: 's4-1',
        start: 7.47,
        end: 10.37,
        text: "This program is brought to you by Stanford University.",
        translation: "Chương trình này do Đại học Stanford mang đến cho bạn."
      },
      {
        id: 's4-2',
        start: 10.47,
        end: 14.44,
        text: "Please visit us at stanford.edu",
        translation: "Vui lòng ghé thăm chúng tôi tại stanford.edu"
      },
      {
        id: 's4-3',
        start: 22.49,
        end: 30.02,
        text: "Thank You. I am honored to be with you today at your commencement",
        translation: "Cảm ơn bạn. Tôi rất vinh dự được ở bên bạn ngày hôm nay khi bạn bắt đầu"
      },
      {
        id: 's4-4',
        start: 30.02,
        end: 32.74,
        text: "from one of the finest universities in the world.",
        translation: "từ một trong những trường đại học tốt nhất trên thế giới."
      },
      {
        id: 's4-5',
        start: 35.56,
        end: 41.56,
        text: "Truth be told I never graduated from college",
        translation: "Thành thật mà nói, tôi chưa bao giờ tốt nghiệp đại học"
      },
      {
        id: 's4-6',
        start: 41.56,
        end: 45.93,
        text: "and this is the closest I've ever gotten to a college graduation.",
        translation: "và đây là lần gần nhất tôi tốt nghiệp đại học."
      },
      {
        id: 's4-7',
        start: 47.98,
        end: 52.01,
        text: "Today I want to tell you three stories from my life. That's it.",
        translation: "Hôm nay tôi muốn kể cho các bạn nghe ba câu chuyện từ cuộc đời tôi."
      },
      {
        id: 's4-8',
        start: 52.01,
        end: 54.85,
        text: "No big deal. Just three stories.",
        translation: "Không thành vấn đề. Chỉ ba tầng."
      },
      {
        id: 's4-9',
        start: 55.85,
        end: 59.57,
        text: "The first story is about connecting the dots.",
        translation: "Câu chuyện đầu tiên là về việc kết nối các dấu chấm."
      },
      {
        id: 's4-10',
        start: 61.01,
        end: 63.89,
        text: "I dropped out of Reed College after the first 6 months,",
        translation: "Tôi đã bỏ học Đại học Reed sau 6 tháng đầu tiên,"
      },
      {
        id: 's4-11',
        start: 63.98,
        end: 65.8,
        text: "but then stayed around as a drop-in",
        translation: "nhưng sau đó ở lại xung quanh như một người ghé thăm"
      },
      {
        id: 's4-12',
        start: 65.8,
        end: 68.73,
        text: "for another 18 months or so before I really quit.",
        translation: "trong khoảng 18 tháng nữa trước khi tôi thực sự bỏ cuộc."
      },
      {
        id: 's4-13',
        start: 69.41,
        end: 71.08,
        text: "So why did I drop out?",
        translation: "Tại sao tôi lại chọn bỏ học?"
      },
      {
        id: 's4-14',
        start: 72.23,
        end: 74.37,
        text: "It started before I was born.",
        translation: "Mọi thứ bắt đầu từ trước lúc tôi chào đời."
      },
      {
        id: 's4-15',
        start: 75.25,
        end: 79.03,
        text: "My biological mother was a young, unwed graduate student,",
        translation: "Mẹ ruột của tôi là một sinh viên tốt nghiệp trẻ, chưa lập gia đình,"
      },
      {
        id: 's4-16',
        start: 79.24,
        end: 81.35,
        text: "and she decided to put me up for adoption.",
        translation: "và cô ấy quyết định cho tôi làm con nuôi."
      },
      {
        id: 's4-17',
        start: 82.36,
        end: 86.23,
        text: "She felt very strongly that I should be adopted by college graduates,",
        translation: "Cô ấy cảm thấy rất mạnh mẽ rằng tôi nên được nhận nuôi bởi những sinh viên tốt nghiệp đại học,"
      },
      {
        id: 's4-18',
        start: 86.31,
        end: 88.61,
        text: "so everything was all set for me to",
        translation: "vì vậy mọi thứ đã được chuẩn bị để tôi"
      },
      {
        id: 's4-19',
        start: 88.61,
        end: 91.1,
        text: "be adopted at birth by a lawyer and his wife.",
        translation: "được một luật sư và vợ ông ta nhận làm con nuôi ngay từ khi sinh ra."
      },
      {
        id: 's4-20',
        start: 91.74,
        end: 94.15,
        text: "Except that when I popped out they decided",
        translation: "Ngoại trừ khi tôi bật ra, họ quyết định"
      },
      {
        id: 's4-21',
        start: 94.15,
        end: 97.55,
        text: "at the last minute that they really wanted a girl.",
        translation: "vào phút cuối cùng mà họ thực sự muốn có một cô gái"
      },
      {
        id: 's4-22',
        start: 97.92,
        end: 100.05,
        text: "So my parents, who were on a waiting list,",
        translation: "Vì vậy, cha mẹ tôi, những người đang trong danh sách chờ,"
      },
      {
        id: 's4-23',
        start: 100.16,
        end: 104.47,
        text: "got a call in the middle of the night asking: \"We have an unexpected",
        translation: "nhận được một cuộc gọi vào lúc nửa đêm hỏi: \"Chúng tôi có một"
      },
      {
        id: 's4-24',
        start: 104.47,
        end: 106.92,
        text: "baby boy; do you want him?\"",
        translation: "bé trai; bạn có muốn anh ta không?\""
      },
      {
        id: 's4-25',
        start: 107.43,
        end: 113.07,
        text: "They said: \"Of course.\" My biological mother later found out that",
        translation: "Họ nói: \"Tất nhiên rồi.\" Mẹ ruột của tôi sau đó phát hiện ra rằng"
      },
      {
        id: 's4-26',
        start: 113.3,
        end: 115.31,
        text: "my mother had never graduated from college",
        translation: "mẹ tôi chưa bao giờ tốt nghiệp đại học"
      },
      {
        id: 's4-27',
        start: 115.31,
        end: 118.47,
        text: "and that my father had never graduated from high school.",
        translation: "và rằng cha tôi chưa bao giờ tốt nghiệp trung học."
      },
      {
        id: 's4-28',
        start: 119.16,
        end: 122.45,
        text: "She refused to sign the final adoption papers.",
        translation: "Cô ấy từ chối ký vào giấy nhận con nuôi cuối cùng."
      },
      {
        id: 's4-29',
        start: 123.43,
        end: 125.39,
        text: "She only relented a few months later when",
        translation: "Cô chỉ nhượng bộ một vài tháng sau đó khi"
      },
      {
        id: 's4-30',
        start: 125.39,
        end: 132.51,
        text: "my parents promised that I would go to college. This was the start in my life.",
        translation: "bố mẹ tôi hứa rằng tôi sẽ đi học đại học. Đây là sự khởi đầu trong cuộc đời tôi."
      },
      {
        id: 's4-31',
        start: 132.54,
        end: 139.34,
        text: "And 17 years later I did go to college. But I naively chose a college",
        translation: "Và 17 năm sau tôi đã đi học đại học. Nhưng tôi đã ngây thơ chọn một trường đại học"
      },
      {
        id: 's4-32',
        start: 139.34,
        end: 141.66,
        text: "that was almost as expensive as Stanford,",
        translation: "gần như đắt như Stanford,"
      },
      {
        id: 's4-33',
        start: 142.47,
        end: 144.31,
        text: "and all of my working-class parents'",
        translation: "và tất cả các bậc cha mẹ thuộc tầng lớp lao động của tôi"
      },
      {
        id: 's4-34',
        start: 144.31,
        end: 146.78,
        text: "savings were being spent on my college tuition.",
        translation: "tiền tiết kiệm đã được chi cho học phí đại học của tôi."
      },
      {
        id: 's4-35',
        start: 147.61,
        end: 150.41,
        text: "After six months, I couldn't see the value in it.",
        translation: "Sau sáu tháng, tôi chẳng thấy giá trị gì từ việc đó."
      },
      {
        id: 's4-36',
        start: 150.72,
        end: 152.76,
        text: "I had no idea what I wanted to do with my life",
        translation: "Tôi không biết mình muốn làm gì với cuộc sống của mình"
      },
      {
        id: 's4-37',
        start: 152.76,
        end: 156.38,
        text: "and no idea how college was going to help me figure it out.",
        translation: "và không biết làm thế nào trường đại học sẽ giúp tôi tìm ra nó."
      },
      {
        id: 's4-38',
        start: 156.85,
        end: 160.09,
        text: "And here I was spending all of the money my parents had saved",
        translation: "Và tại nơi đây, tôi đang tiêu xài hết những đồng tiền bố mẹ bỏ bao mồ hôi công sức cả đời mới kiếm được."
      },
      {
        id: 's4-39',
        start: 160.29,
        end: 160.9,
        text: "their entire life.",
        translation: "cả cuộc đời của họ."
      },
      {
        id: 's4-40',
        start: 162.6,
        end: 166.94,
        text: "So I decided to drop out and trust that it would all work out OK.",
        translation: "Vì thế tôi quyết định bỏ học và tin rằng, mọi thứ rồi cũng được thu xếp ổn thoả."
      },
      {
        id: 's4-41',
        start: 166.94,
        end: 169.4,
        text: "It was pretty scary at the time,",
        translation: "Nó khá đáng sợ vào thời điểm đó,"
      },
      {
        id: 's4-42',
        start: 169.4,
        end: 172.81,
        text: "but looking back it was one of the best decisions I ever made.",
        translation: "nhưng nhìn lại đó là một trong những quyết định tốt nhất mà tôi từng đưa ra."
      },
      {
        id: 's4-43',
        start: 174.08,
        end: 176.69,
        text: "The minute I dropped out I could stop",
        translation: "Giây phút tôi bỏ học, tôi có thể dừng lại"
      },
      {
        id: 's4-44',
        start: 176.69,
        end: 179.48,
        text: "taking the required classes that didn't interest me,",
        translation: "tham gia các lớp học bắt buộc mà tôi không quan tâm,"
      },
      {
        id: 's4-45',
        start: 179.74,
        end: 183.6,
        text: "and begin dropping in on the ones that looked interesting.",
        translation: "và bắt đầu tham gia vào những hoạt động có vẻ thú vị."
      },
      {
        id: 's4-46',
        start: 184.76,
        end: 188.1,
        text: "It wasn't all romantic. I didn't have a dorm room,",
        translation: "Không phải tất cả đều lãng mạn. Tôi không có phòng ký túc xá,"
      },
      {
        id: 's4-47',
        start: 188.17,
        end: 190.5,
        text: "so I slept on the floor in friends' rooms,",
        translation: "vì vậy tôi đã ngủ trên sàn nhà trong phòng của bạn bè,"
      },
      {
        id: 's4-48',
        start: 190.59,
        end: 194.18,
        text: "I returned coke bottles for the 5 cent deposits to buy food with,",
        translation: "Tôi đã trả lại các chai than cốc cho khoản tiền gửi 5 xu để mua thực phẩm,"
      },
      {
        id: 's4-49',
        start: 194.72,
        end: 197.28,
        text: "and I would walk the 7 miles across town every Sunday",
        translation: "và tôi sẽ đi bộ 7 dặm qua thị trấn vào mỗi Chủ nhật"
      },
      {
        id: 's4-50',
        start: 197.28,
        end: 201.08,
        text: "night to get one good meal a week at the Hare Krishna",
        translation: "đêm để có được một bữa ăn ngon mỗi tuần tại Hare Krishna"
      },
      {
        id: 's4-51',
        start: 201.15,
        end: 203.08,
        text: "temple. I loved it.",
        translation: "đền thờ. Tôi thích nó."
      },
      {
        id: 's4-52',
        start: 203.85,
        end: 206.26,
        text: "And much of what I stumbled into by following",
        translation: "Và phần lớn những gì tôi vấp phải bằng cách làm theo"
      },
      {
        id: 's4-53',
        start: 206.26,
        end: 209.69,
        text: "my curiosity and intuition turned out to be priceless later on.",
        translation: "sự tò mò và trực giác của tôi hóa ra là vô giá sau này."
      },
      {
        id: 's4-54',
        start: 209.69,
        end: 214.37,
        text: "Let me give you one example: Reed College at that",
        translation: "Hãy để tôi cho bạn một ví dụ: Reed College tại đó"
      },
      {
        id: 's4-55',
        start: 214.5,
        end: 217.99,
        text: "time offered perhaps the best calligraphy instruction in the country.",
        translation: "Đại học Reed lúc đó có dạy thiết kế thư pháp, có lẽ là đỉnh nhất trong cả nước."
      },
      {
        id: 's4-56',
        start: 218.35,
        end: 222.75,
        text: "Throughout the campus every poster, every label on every drawer,",
        translation: "Khắp khuôn viên trường, mỗi tấm áp phích, mỗi nhãn trên mỗi ngăn kéo,"
      },
      {
        id: 's4-57',
        start: 222.75,
        end: 225.11,
        text: "was beautifully hand calligraphed.",
        translation: "được thư pháp bằng tay rất đẹp."
      },
      {
        id: 's4-58',
        start: 225.39,
        end: 228.89,
        text: "Because I had dropped out and didn't have to take the normal classes,",
        translation: "Bởi vì tôi đã bỏ học và không phải tham gia các lớp học bình thường,"
      },
      {
        id: 's4-59',
        start: 229.73,
        end: 232.68,
        text: "I decided to take a calligraphy class to learn how to do this.",
        translation: "Tôi quyết định tham gia một lớp học thư pháp để học cách làm điều này."
      },
      {
        id: 's4-60',
        start: 233.1,
        end: 236.09,
        text: "I learned about serif and san serif typefaces,",
        translation: "Tôi đã tìm hiểu về các kiểu chữ serif và san serif,"
      },
      {
        id: 's4-61',
        start: 236.3,
        end: 237.95,
        text: "about varying the amount of space",
        translation: "về việc thay đổi không gian"
      },
      {
        id: 's4-62',
        start: 237.95,
        end: 239.66,
        text: "between different letter combinations,",
        translation: "giữa các kết hợp chữ cái khác nhau,"
      },
      {
        id: 's4-63',
        start: 239.85,
        end: 242.4,
        text: "about what makes great typography great.",
        translation: "về những gì làm cho kiểu chữ tuyệt vời trở nên tuyệt vời."
      },
      {
        id: 's4-64',
        start: 243.44,
        end: 245.58,
        text: "It was beautiful, historical,",
        translation: "Nó rất đẹp, mang tính lịch sử,"
      },
      {
        id: 's4-65',
        start: 245.8,
        end: 249.18,
        text: "artistically subtle in a way that science can't capture,",
        translation: "tinh tế về mặt nghệ thuật theo cách mà khoa học không thể nắm bắt được,"
      },
      {
        id: 's4-66',
        start: 249.75,
        end: 251.45,
        text: "and I found it fascinating.",
        translation: "và tôi thấy nó thật hấp dẫn."
      },
      {
        id: 's4-67',
        start: 252.21,
        end: 256.8,
        text: "None of this had even a hope of any practical application in my life.",
        translation: "Chẳng có thứ gì có thể mong đem lại một ứng dụng thực tế nào cho cuộc đời tôi."
      },
      {
        id: 's4-68',
        start: 257.57,
        end: 258.77,
        text: "But ten years later,",
        translation: "Mười năm sau..."
      },
      {
        id: 's4-69',
        start: 258.87,
        end: 261.63,
        text: "when we were designing the first Macintosh computer,",
        translation: "khi chúng tôi thiết kế chiếc máy tính Macintosh đầu tiên,"
      },
      {
        id: 's4-70',
        start: 261.88,
        end: 265.47,
        text: "it all came back to me. And we designed it all into the Mac.",
        translation: "tất cả đã quay trở lại với tôi. Và chúng tôi đã thiết kế tất cả vào máy Mac."
      },
      {
        id: 's4-71',
        start: 265.47,
        end: 268.94,
        text: "It was the first computer with beautiful typography.",
        translation: "Đó là chiếc máy đầu tiên có kiểu chữ rất đẹp."
      },
      {
        id: 's4-72',
        start: 269.49,
        end: 272.77,
        text: "If I had never dropped in on that single course in college,",
        translation: "Nếu tôi chưa bao giờ tham gia khóa học duy nhất đó ở trường đại học,"
      },
      {
        id: 's4-73',
        start: 272.96,
        end: 274.59,
        text: "the Mac would have never had multiple",
        translation: "mac sẽ không bao giờ có nhiều"
      },
      {
        id: 's4-74',
        start: 274.59,
        end: 277.11,
        text: "typefaces or proportionally spaced fonts.",
        translation: "kiểu chữ hoặc phông chữ cách nhau theo tỷ lệ."
      },
      {
        id: 's4-75',
        start: 277.4,
        end: 279.61,
        text: "And since Windows just copied the Mac,",
        translation: "Và vì Windows chỉ sao chép Mac,"
      },
      {
        id: 's4-76',
        start: 279.7,
        end: 283.52,
        text: "it's likely that no personal computer would have them.",
        translation: "có khả năng là không có máy tính cá nhân nào có chúng."
      },
      {
        id: 's4-77',
        start: 287.07,
        end: 291.14,
        text: "If I had never dropped out,",
        translation: "Nếu tôi chưa bao giờ bỏ học,"
      },
      {
        id: 's4-78',
        start: 291.14,
        end: 294.04,
        text: "I would have never dropped in on this calligraphy class,",
        translation: "Tôi sẽ không bao giờ bỏ học lớp thư pháp này,"
      },
      {
        id: 's4-79',
        start: 294.11,
        end: 297.15,
        text: "and personal computers might not have the wonderful typography",
        translation: "và máy tính cá nhân có thể không có kiểu chữ tuyệt vời"
      },
      {
        id: 's4-80',
        start: 297.15,
        end: 300.52,
        text: "that they do. Of course it was impossible to connect",
        translation: "mà họ làm. Tất nhiên không thể kết nối"
      },
      {
        id: 's4-81',
        start: 300.52,
        end: 302.45,
        text: "the dots looking forward when I was in college.",
        translation: "những dấu chấm nhìn về phía trước khi tôi còn học đại học."
      },
      {
        id: 's4-82',
        start: 302.45,
        end: 306.65,
        text: "But it was very, very clear looking backwards ten years later.",
        translation: "Nhưng 10 năm sau nhìn lại thì những điều đó rất rõ ràng."
      },
      {
        id: 's4-83',
        start: 307.13,
        end: 310.15,
        text: "Again, you can't connect the dots looking forward;",
        translation: "Một lần nữa, bạn không thể kết nối các dấu chấm trong tương lai;"
      },
      {
        id: 's4-84',
        start: 310.15,
        end: 312.5,
        text: "you can only connect them looking backwards.",
        translation: "Bạn chỉ có thể ráp nối mọi việc khi nhìn lại mà thôi."
      },
      {
        id: 's4-85',
        start: 312.92,
        end: 315.55,
        text: "So you have to trust that the dots will somehow connect",
        translation: "Vì vậy, bạn phải tin rằng các dấu chấm sẽ kết nối với nhau bằng cách nào đó trong tương lai."
      },
      {
        id: 's4-86',
        start: 315.55,
        end: 316.44,
        text: "in your future.",
        translation: "tương lai của anh."
      },
      {
        id: 's4-87',
        start: 316.73,
        end: 320.73,
        text: "You have to trust in something, your gut, destiny, life, karma,",
        translation: "Các bạn cũng cần phải tin vào một số thứ khác như: sự quyết tâm, vận mệnh, cuộc sống, cái nghiệp hoặc bất cứ cái gì."
      },
      {
        id: 's4-88',
        start: 320.73,
        end: 321.44,
        text: "whatever.",
        translation: "bất cứ thứ gì"
      },
      {
        id: 's4-89',
        start: 322.35,
        end: 328.1,
        text: "Beleiveing that the dots will connect down the road will give you the confidence to follow your heart",
        translation: "Tin tưởng rằng các dấu chấm sẽ kết nối xuống đường sẽ cho bạn sự tự tin để làm theo trái tim của bạn"
      },
      {
        id: 's4-90',
        start: 328.1,
        end: 333.35,
        text: "Even when it leads you off the well worn path, and that will make all the difference.",
        translation: "Ngay cả khi nó dẫn bạn ra khỏi con đường mòn, và điều đó sẽ tạo ra tất cả sự khác biệt."
      },
      {
        id: 's4-91',
        start: 338.6,
        end: 342.7,
        text: "My second story is about love and loss.",
        translation: "Câu chuyện thứ hai của tôi là về tình yêu và sự mất mát."
      },
      {
        id: 's4-92',
        start: 344.03,
        end: 347.93,
        text: "I was lucky I found what I loved to do early in life.",
        translation: "Tôi đã rất may mắn - Tôi đã tìm thấy những việc tôi yêu thích làm từ rất sớm."
      },
      {
        id: 's4-93',
        start: 348.31,
        end: 351.52,
        text: "Woz and I started Apple in my parents garage when I was 20.",
        translation: "Woz và tôi thành lập Apple trong gara của bố mẹ tôi khi tôi 20 tuổi."
      },
      {
        id: 's4-94',
        start: 351.87,
        end: 355.26,
        text: "We worked hard, and in 10 years Apple had grown from just the two of",
        translation: "Chúng tôi đã làm việc chăm chỉ, và trong 10 năm Apple đã phát triển từ chỉ hai"
      },
      {
        id: 's4-95',
        start: 355.26,
        end: 359.58,
        text: "us in a garage into a $2 billion company with over 4000 employees.",
        translation: "chúng tôi trong một nhà để xe thành một công ty trị giá 2 tỷ $ với hơn 4000 nhân viên."
      },
      {
        id: 's4-96',
        start: 359.66,
        end: 363.35,
        text: "We had just released our finest creation the Macintosh",
        translation: "Chúng tôi vừa phát hành sáng tạo tốt nhất của chúng tôi Macintosh"
      },
      {
        id: 's4-97',
        start: 363.35,
        end: 365.64,
        text: "a year earlier, and I had just turned 30.",
        translation: "một năm trước đó, và tôi vừa bước sang tuổi 30."
      },
      {
        id: 's4-98',
        start: 366.36,
        end: 367.95,
        text: "And then I got fired.",
        translation: "Và sau đó, tôi bị sa thải."
      },
      {
        id: 's4-99',
        start: 369.05,
        end: 371.9,
        text: "How can you get fired from a company you started?",
        translation: "Làm sao mà bạn lại có thể bị sa thải bởi một công ty mà bạn đã sáng lập ra nó?"
      },
      {
        id: 's4-100',
        start: 372.4,
        end: 375.9,
        text: "Well, as Apple grew we hired someone who I thought",
        translation: "Vâng, khi Apple phát triển, chúng tôi đã thuê một người mà tôi nghĩ"
      },
      {
        id: 's4-101',
        start: 375.9,
        end: 378.46,
        text: "was very talented to run the company with me,",
        translation: "rất tài năng để điều hành công ty với tôi,"
      },
      {
        id: 's4-102',
        start: 378.68,
        end: 380.47,
        text: "and for the first year or so things went well.",
        translation: "và trong khoảng một năm đầu tiên, mọi thứ đã diễn ra tốt đẹp."
      },
      {
        id: 's4-103',
        start: 380.47,
        end: 382.68,
        text: "But then our visions of the future began",
        translation: "Nhưng sau đó tầm nhìn của chúng tôi về tương lai bắt đầu"
      },
      {
        id: 's4-104',
        start: 382.68,
        end: 385.74,
        text: "to diverge and eventually we had a falling out.",
        translation: "phân kỳ và cuối cùng chúng tôi đã có một cuộc cãi vã."
      },
      {
        id: 's4-105',
        start: 385.77,
        end: 388.67,
        text: "When we did, our Board of Directors sided with him.",
        translation: "When we did, our Board of Directors sided with him."
      },
      {
        id: 's4-106',
        start: 389.15,
        end: 392.73,
        text: "So at 30 I was out. And very publicly out.",
        translation: "Vì vậy, ở tuổi 30, tôi đã ra ngoài. Và rất công khai."
      },
      {
        id: 's4-107',
        start: 392.73,
        end: 395.89,
        text: "What had been the focus of my entire adult life was gone,",
        translation: "Những gì đã là trọng tâm của toàn bộ cuộc sống trưởng thành của tôi đã biến mất,"
      },
      {
        id: 's4-108',
        start: 395.89,
        end: 397.7,
        text: "and it was devastating.",
        translation: "Thật sự tôi rất thất vọng."
      },
      {
        id: 's4-109',
        start: 398.53,
        end: 400.64,
        text: "I really didn't know what to do for a few months.",
        translation: "Trong một vài tháng, tôi đã thực sự chẳng biết phải làm gì."
      },
      {
        id: 's4-110',
        start: 401.11,
        end: 403.87,
        text: "I felt that I had let the previous generation of entrepreneurs",
        translation: "Tôi cảm thấy rằng tôi đã để cho thế hệ doanh nhân trước"
      },
      {
        id: 's4-111',
        start: 403.87,
        end: 407.21,
        text: "down - that I had dropped the baton as it was being passed to me.",
        translation: "xuống - rằng tôi đã đánh rơi dùi cui khi nó đang được chuyển cho tôi."
      },
      {
        id: 's4-112',
        start: 407.21,
        end: 410.49,
        text: "I met with David Packard and Bob Noyce",
        translation: "Tôi đã gặp David Packard và Bob Noyce"
      },
      {
        id: 's4-113',
        start: 410.88,
        end: 413.7,
        text: "and tried to apologize for screwing up so badly.",
        translation: "Tôi đã cố gắng xin lỗi cho việc cư xử không hay của mình."
      },
      {
        id: 's4-114',
        start: 414.42,
        end: 415.84,
        text: "I was a very public failure,",
        translation: "Tôi là một thất bại rất công khai,"
      },
      {
        id: 's4-115',
        start: 415.84,
        end: 418.09,
        text: "and I even thought about running away from the valley.",
        translation: "và tôi thậm chí còn nghĩ đến việc chạy trốn khỏi thung lũng."
      },
      {
        id: 's4-116',
        start: 418.57,
        end: 423.39,
        text: "But something slowly began to dawn on me I still loved what I did.",
        translation: "Nhưng có một cái gì đó bắt đầu chầm chậm sáng lên trong tôi - tôi vẫn rất yêu quý những gì tôi đã làm."
      },
      {
        id: 's4-117',
        start: 423.59,
        end: 427.8,
        text: "The turn of events at Apple had not changed that one bit.",
        translation: "Khúc ngoặt của các sự kiện đã không hề làm thay đổi điều đó một chút nào."
      },
      {
        id: 's4-118',
        start: 427.8,
        end: 430.97,
        text: "I had been rejected, but I was still in love.",
        translation: "Tôi đã bị từ chối, nhưng tôi vẫn còn yêu."
      },
      {
        id: 's4-119',
        start: 432.09,
        end: 433.84,
        text: "And so I decided to start over.",
        translation: "Chính vì thế, tôi đã quyết định bắt đầu lại."
      },
      {
        id: 's4-120',
        start: 434.91,
        end: 437.91,
        text: "I didn't see it then, but it turned out that getting fired from",
        translation: "Tôi đã không nhìn thấy nó sau đó, nhưng nó bật ra rằng bị sa thải từ"
      },
      {
        id: 's4-121',
        start: 437.91,
        end: 440.32,
        text: "Apple was the best thing that could have ever happened to me.",
        translation: "Apple là điều tuyệt vời nhất có thể xảy ra với tôi."
      },
      {
        id: 's4-122',
        start: 441.01,
        end: 443.19,
        text: "The heaviness of being successful was",
        translation: "Gánh nặng của việc thành công là"
      },
      {
        id: 's4-123',
        start: 443.19,
        end: 446.02,
        text: "replaced by the lightness of being a beginner again,",
        translation: "được thay thế bằng sự nhẹ nhàng khi trở thành người mới bắt đầu một lần nữa,"
      },
      {
        id: 's4-124',
        start: 446.22,
        end: 447.16,
        text: "less sure about everything.",
        translation: "ít chắc chắn hơn về mọi thứ."
      },
      {
        id: 's4-125',
        start: 447.16,
        end: 450.9,
        text: "It freed me to enter one of the most creative periods of my life.",
        translation: "Nó đã cho tôi tự do bước vào một quãng đời đầy những sáng tạo của cuộc đời mình."
      },
      {
        id: 's4-126',
        start: 451.42,
        end: 454.35,
        text: "During the next five years, I started a company named NeXT,",
        translation: "Trong năm năm tiếp theo, tôi bắt đầu một công ty tên là NeXT,"
      },
      {
        id: 's4-127',
        start: 454.53,
        end: 455.89,
        text: "another company named Pixar,",
        translation: "một công ty khác tên là Pixar,"
      },
      {
        id: 's4-128',
        start: 455.89,
        end: 459.08,
        text: "and fell in love with an amazing woman who would become my wife.",
        translation: "và yêu một người phụ nữ tuyệt vời sẽ trở thành vợ tôi."
      },
      {
        id: 's4-129',
        start: 459.78,
        end: 462.61,
        text: "Pixar went on to create the worlds first computer animated feature",
        translation: "Pixar tiếp tục tạo ra tính năng hoạt hình máy tính đầu tiên trên thế giới"
      },
      {
        id: 's4-130',
        start: 462.61,
        end: 464.1,
        text: "film, Toy Story,",
        translation: "phim, Câu chuyện đồ chơi,"
      },
      {
        id: 's4-131',
        start: 464.38,
        end: 469.98,
        text: "and is now the most successful animation studio in the world.",
        translation: "và hiện là xưởng phim hoạt hình thành công nhất trên thế giới."
      },
      {
        id: 's4-132',
        start: 469.98,
        end: 473.8,
        text: "In a remarkable turn of events, Apple bought NeXT,",
        translation: "Trong một diễn biến đáng chú ý, Apple đã mua NeXT,"
      },
      {
        id: 's4-133',
        start: 473.89,
        end: 476.71,
        text: "I returned to Apple, and the technology we developed at",
        translation: "Tôi trở lại Apple và công nghệ mà chúng tôi đã phát triển tại"
      },
      {
        id: 's4-134',
        start: 476.71,
        end: 479.44,
        text: "NeXT is at the heart of Apple's current renaissance.",
        translation: "NeXT là trung tâm của thời kỳ phục hưng hiện tại của Apple."
      },
      {
        id: 's4-135',
        start: 479.89,
        end: 482.78,
        text: "And Laurene and I have a wonderful family together.",
        translation: "Tôi và Laurene có một gia đình hạnh phúc."
      },
      {
        id: 's4-136',
        start: 483.88,
        end: 485.75,
        text: "I'm pretty sure none of this would",
        translation: "Tôi khá chắc chắn rằng không ai trong số này sẽ"
      },
      {
        id: 's4-137',
        start: 485.75,
        end: 487.75,
        text: "have happened if I hadn't been fired from Apple.",
        translation: "đã xảy ra nếu tôi không bị sa thải khỏi Apple."
      },
      {
        id: 's4-138',
        start: 488.15,
        end: 491.89,
        text: "It was awful tasting medicine, but I guess the patient needed it.",
        translation: "Đó là một viên thuốc đắng nhưng tôi nghĩ bệnh nhân đã rất cần đến nó."
      },
      {
        id: 's4-139',
        start: 492.43,
        end: 497.86,
        text: "Sometimes life hits you in the head with a brick. Don't lose faith.",
        translation: "Đôi khi cuộc sống đánh vào đầu bạn bằng một viên gạch. Đừng đánh mất niềm tin."
      },
      {
        id: 's4-140',
        start: 498.3,
        end: 501.21,
        text: "I'm convinced that the only thing that kept me going was that I loved",
        translation: "Tôi tin chắc chắn rằng, điều duy nhất đã giúp tôi tiếp tục bước đi chính là tôi yêu những gì tôi đã làm."
      },
      {
        id: 's4-141',
        start: 501.21,
        end: 504.3,
        text: "what I did. You've got to find what you love.",
        translation: "những gì tôi đã làm. Bạn phải tìm thấy những gì bạn yêu thích."
      },
      {
        id: 's4-142',
        start: 504.54,
        end: 507.47,
        text: "And that is as true for your work as it is for your lovers.",
        translation: "Điều đó luôn đúng cho công việc và cho cả những người thân yêu của bạn."
      },
      {
        id: 's4-143',
        start: 508.17,
        end: 510.1,
        text: "Your work is going to fill a large part of your life,",
        translation: "Công việc của bạn sẽ chiếm một phần lớn trong cuộc sống của bạn,"
      },
      {
        id: 's4-144',
        start: 510.1,
        end: 512.45,
        text: "and the only way to be truly satisfied",
        translation: "và cách duy nhất để thực sự hài lòng"
      },
      {
        id: 's4-145',
        start: 512.45,
        end: 514.81,
        text: "is to do what you believe is great work.",
        translation: "là làm những gì bạn tin là công việc tuyệt vời."
      },
      {
        id: 's4-146',
        start: 515.08,
        end: 518.46,
        text: "And the only way to do great work is to love what you do.",
        translation: "Và cách duy nhất để làm những công việc tuyệt vời là bạn yêu việc mình làm."
      },
      {
        id: 's4-147',
        start: 518.46,
        end: 523.12,
        text: "If you haven't found it yet, keep looking. Don't settle.",
        translation: "Nếu như các bạn chưa tìm thấy nó, hãy tiếp tục tìm kiếm."
      },
      {
        id: 's4-148',
        start: 523.74,
        end: 527.51,
        text: "As with all matters of the heart, you'll know when you find it.",
        translation: "Như với tất cả các vấn đề của trái tim, bạn sẽ biết khi nào bạn tìm thấy nó."
      },
      {
        id: 's4-149',
        start: 527.51,
        end: 528.93,
        text: "And, like any great relationship,",
        translation: "Và, giống như bất kỳ mối quan hệ tuyệt vời nào,"
      },
      {
        id: 's4-150',
        start: 529.06,
        end: 531.99,
        text: "it just gets better and better as the years roll on.",
        translation: "nó chỉ trở nên tốt hơn và tốt hơn khi năm tháng trôi qua."
      },
      {
        id: 's4-151',
        start: 532.26,
        end: 536.15,
        text: "So keep looking. Don't settle.",
        translation: "Vì vậy, hãy tiếp tục tìm kiếm. Đừng dừng lại."
      },
      {
        id: 's4-152',
        start: 545.3,
        end: 548.49,
        text: "My third story is about death.",
        translation: "Câu chuyện thứ ba của tôi là về cái chết."
      },
      {
        id: 's4-153',
        start: 549.27,
        end: 552.53,
        text: "When I was 17, I read a quote that went something like:",
        translation: "Khi tôi 17 tuổi, tôi đã đọc một câu trích dẫn như sau:"
      },
      {
        id: 's4-154',
        start: 552.53,
        end: 555.75,
        text: "\"If you live each day as if it was your last,",
        translation: "\"Nếu bạn sống mỗi ngày như thể đó là ngày cuối cùng của bạn,"
      },
      {
        id: 's4-155',
        start: 555.91,
        end: 557.97,
        text: "someday you'll most certainly be right.\"",
        translation: "một ngày nào đó bạn chắc chắn sẽ đúng.\""
      },
      {
        id: 's4-156',
        start: 560.86,
        end: 565.36,
        text: "It made an impression on me, and since then, for the past 33 years,",
        translation: "Nó đã để lại ấn tượng rất sâu trong tôi và kể từ đó, trong suốt 33 năm qua."
      },
      {
        id: 's4-157',
        start: 565.52,
        end: 567.14,
        text: "I have looked in the mirror every morning",
        translation: "Tôi đã nhìn vào gương mỗi sáng"
      },
      {
        id: 's4-158',
        start: 567.14,
        end: 570.02,
        text: "and asked myself: \"If today were the last day of my life,",
        translation: "và tự hỏi: \"Nếu hôm nay là ngày cuối cùng của cuộc đời mình,"
      },
      {
        id: 's4-159',
        start: 570.02,
        end: 573.72,
        text: "would I want to do what I am about to do today?\"",
        translation: "tôi có muốn làm những gì tôi sắp làm hôm nay không?\""
      },
      {
        id: 's4-160',
        start: 574.31,
        end: 577.67,
        text: "And whenever the answer has been \"No\" for too many days in a row,",
        translation: "Và bất cứ khi nào câu trả lời là \"Không\" trong quá nhiều ngày liên tiếp,"
      },
      {
        id: 's4-161',
        start: 577.92,
        end: 579.56,
        text: "I know I need to change something.",
        translation: "Tôi biết tôi cần phải thay đổi điều gì đó."
      },
      {
        id: 's4-162',
        start: 580.57,
        end: 583.93,
        text: "Remembering that I'll be dead soon is the most important",
        translation: "Nhớ rằng tôi sẽ chết sớm là điều quan trọng nhất"
      },
      {
        id: 's4-163',
        start: 583.93,
        end: 587.21,
        text: "tool I've ever encountered to help me make the big choices in life.",
        translation: "công cụ mà tôi đã từng gặp phải để giúp tôi đưa ra những lựa chọn lớn trong cuộc sống."
      },
      {
        id: 's4-164',
        start: 587.92,
        end: 592.71,
        text: "Because almost everything all external expectations, all pride,",
        translation: "Bởi vì hầu hết mọi thứ, tất cả những kỳ vọng bên ngoài, tất cả niềm tự hào,"
      },
      {
        id: 's4-165',
        start: 592.89,
        end: 594.64,
        text: "all fear of embarrassment or failure -",
        translation: "tất cả nỗi sợ xấu hổ hoặc thất bại -"
      },
      {
        id: 's4-166',
        start: 594.87,
        end: 597.72,
        text: "these things just fall away in the face of death,",
        translation: "những điều này chỉ biến mất khi đối mặt với cái chết,"
      },
      {
        id: 's4-167',
        start: 598.18,
        end: 600.28,
        text: "leaving only what is truly important.",
        translation: "chỉ để lại những gì thực sự quan trọng."
      },
      {
        id: 's4-168',
        start: 600.83,
        end: 603.67,
        text: "Remembering that you are going to die is the best",
        translation: "Hãy nhớ rằng bạn sẽ chết là tốt nhất"
      },
      {
        id: 's4-169',
        start: 603.67,
        end: 607.73,
        text: "way I know to avoid the trap of thinking you have something to lose.",
        translation: "cách tôi biết để tránh cái bẫy nghĩ rằng bạn có thứ gì đó để mất."
      },
      {
        id: 's4-170',
        start: 608.2,
        end: 612.57,
        text: "You are already naked. There is no reason not to follow your heart.",
        translation: "Bạn đã khỏa thân rồi. Không có lý do gì để không làm theo trái tim của bạn."
      },
      {
        id: 's4-171',
        start: 613.95,
        end: 616.98,
        text: "About a year ago I was diagnosed with cancer.",
        translation: "Khoảng một năm trước đây, tôi được chẩn đoán bị bệnh ung thư."
      },
      {
        id: 's4-172',
        start: 616.98,
        end: 620.16,
        text: "I had a scan at 7:30 in the morning,",
        translation: "Tôi đã chụp cắt lớp lúc 7:30 sáng,"
      },
      {
        id: 's4-173',
        start: 620.28,
        end: 623.07,
        text: "and it clearly showed a tumor on my pancreas.",
        translation: "và nó cho thấy rõ ràng một khối u trên tuyến tụy của tôi."
      },
      {
        id: 's4-174',
        start: 623.6,
        end: 625.61,
        text: "I didn't even know what a pancreas was.",
        translation: "Lúc đó, tôi thậm chí còn chẳng hiểu tuyến tuỵ là gì."
      },
      {
        id: 's4-175',
        start: 626.27,
        end: 628.54,
        text: "The doctors told me this was almost",
        translation: "Các bác sĩ nói với tôi rằng điều này gần như"
      },
      {
        id: 's4-176',
        start: 628.54,
        end: 630.79,
        text: "certainly a type of cancer that is incurable,",
        translation: "chắc chắn là một loại ung thư không thể chữa được,"
      },
      {
        id: 's4-177',
        start: 630.79,
        end: 635.07,
        text: "and that I should expect to live no longer than three to six months.",
        translation: "và tôi hy vọng sẽ sống không quá ba đến sáu tháng."
      },
      {
        id: 's4-178',
        start: 635.84,
        end: 640.07,
        text: "My doctor advised me to go home and get my affairs in order,",
        translation: "Bác sĩ khuyên tôi nên về nhà và sắp xếp công việc của mình,"
      },
      {
        id: 's4-179',
        start: 640.32,
        end: 642.91,
        text: "which is doctor's code for prepare to die.",
        translation: "đó là mã của bác sĩ để chuẩn bị chết."
      },
      {
        id: 's4-180',
        start: 642.91,
        end: 647.96,
        text: "It means to try to tell your kids everything you thought",
        translation: "Điều đó có nghĩa là cố gắng nói với con bạn mọi thứ bạn nghĩ"
      },
      {
        id: 's4-181',
        start: 647.96,
        end: 651.17,
        text: "you'd have the next 10 years to tell them in just a few months.",
        translation: "bạn sẽ có 10 năm tiếp theo để nói với họ chỉ trong vài tháng."
      },
      {
        id: 's4-182',
        start: 651.85,
        end: 653.75,
        text: "It means to make sure everything is buttoned",
        translation: "Điều đó có nghĩa là đảm bảo mọi thứ đều được cài nút"
      },
      {
        id: 's4-183',
        start: 653.75,
        end: 656.71,
        text: "up so that it will be as easy as possible for your family.",
        translation: "để nó sẽ dễ dàng nhất có thể cho gia đình bạn."
      },
      {
        id: 's4-184',
        start: 656.71,
        end: 659.45,
        text: "It means to say your goodbyes.",
        translation: "Điều đó có nghĩa là nói những lời tạm biệt của bạn."
      },
      {
        id: 's4-185',
        start: 661.46,
        end: 663.58,
        text: "I lived with that diagnosis all day.",
        translation: "Cả ngày hôm đó tôi luôn nghĩ đến lời chẩn bệnh."
      },
      {
        id: 's4-186',
        start: 664.13,
        end: 666.33,
        text: "Later that evening I had a biopsy,",
        translation: "Tối hôm đó, tôi đã làm sinh thiết,"
      },
      {
        id: 's4-187',
        start: 666.59,
        end: 668.63,
        text: "where they stuck an endoscope down my throat,",
        translation: "nơi họ đặt một ống nội soi xuống cổ họng của tôi,"
      },
      {
        id: 's4-188',
        start: 668.83,
        end: 671,
        text: "through my stomach and into my intestines,",
        translation: "qua dạ dày và vào ruột của tôi,"
      },
      {
        id: 's4-189',
        start: 671.26,
        end: 674.48,
        text: "put a needle into my pancreas and got a few cells from the tumor.",
        translation: "đâm kim vào tuyến tụy của tôi và lấy một vài tế bào từ khối u."
      },
      {
        id: 's4-190',
        start: 674.48,
        end: 678.33,
        text: "I was sedated, but my wife, who was there,",
        translation: "Tôi đã được gây mê, nhưng vợ tôi, người đã ở đó,"
      },
      {
        id: 's4-191',
        start: 678.55,
        end: 681.51,
        text: "told me that when they viewed the cells under a microscope",
        translation: "nói với tôi rằng khi họ xem các tế bào dưới kính hiển vi"
      },
      {
        id: 's4-192',
        start: 681.74,
        end: 684.5,
        text: "the doctors started crying because it turned out to be",
        translation: "các bác sĩ bắt đầu khóc vì hóa ra"
      },
      {
        id: 's4-193',
        start: 684.5,
        end: 688.47,
        text: "a very rare form of pancreatic cancer that is curable with surgery.",
        translation: "một dạng ung thư tuyến tụy rất hiếm có thể chữa khỏi bằng phẫu thuật."
      },
      {
        id: 's4-194',
        start: 689,
        end: 693.12,
        text: "I had the surgery and thankfully I'm fine now.",
        translation: "Tôi đã mổ rồi và giờ thì đã khoẻ."
      },
      {
        id: 's4-195',
        start: 700.8,
        end: 703.3,
        text: "This was the closest I've been to facing death,",
        translation: "Đó là thời gian cận kề nhất mà tôi đã đối mặt với cái chết."
      },
      {
        id: 's4-196',
        start: 703.56,
        end: 706.44,
        text: "and I hope its the closest I get for a few more decades.",
        translation: "và tôi hy vọng nó sẽ trở nên gần gũi nhất với tôi trong vài thập kỷ nữa."
      },
      {
        id: 's4-197',
        start: 706.86,
        end: 708.12,
        text: "Having lived through it,",
        translation: "Sau khi trải qua nó,"
      },
      {
        id: 's4-198',
        start: 708.62,
        end: 711.25,
        text: "I can now say this to you with a bit more certainty than when",
        translation: "Bây giờ tôi có thể nói điều này với bạn với sự chắc chắn hơn một chút so với khi"
      },
      {
        id: 's4-199',
        start: 711.25,
        end: 715.32,
        text: "death was a useful but purely intellectual concept:",
        translation: "chết là một khái niệm hữu ích nhưng thuần túy trí tuệ:"
      },
      {
        id: 's4-200',
        start: 715.42,
        end: 717.87,
        text: "No one wants to die.",
        translation: "Không ai muốn chết cả."
      },
      {
        id: 's4-201',
        start: 718.26,
        end: 722.39,
        text: "Even people who want to go to heaven don't want to die to get there.",
        translation: "Kể cả những người muốn lên thiên đàng cũng không muốn chết để lên đó."
      },
      {
        id: 's4-202',
        start: 722.39,
        end: 725.82,
        text: "And yet death is the destination we all share.",
        translation: "Thế mà cái chết lại là điểm đến của tất cả chúng ta."
      },
      {
        id: 's4-203',
        start: 726.19,
        end: 730.17,
        text: "No one has ever escaped it. And that is as it should be,",
        translation: "Không ai có thể thoát khỏi nó. Và đó là điều nên làm,"
      },
      {
        id: 's4-204',
        start: 730.37,
        end: 734.49,
        text: "because Death is very likely the single best invention of Life.",
        translation: "bởi vì Cái chết rất có thể là phát minh tốt nhất của Sự sống."
      },
      {
        id: 's4-205',
        start: 735.02,
        end: 736.58,
        text: "It is Life's change agent.",
        translation: "Nó là tác nhân làm thay đổi cuộc sống."
      },
      {
        id: 's4-206',
        start: 736.63,
        end: 739.05,
        text: "It clears out the old to make way for the new.",
        translation: "Nó gạt bỏ cái cũ và mở đường cho cái mới."
      },
      {
        id: 's4-207',
        start: 739.87,
        end: 744.48,
        text: "Right now the new is you, but someday not too long from now,",
        translation: "Ngay bây giờ mới là bạn, nhưng một ngày nào đó không quá lâu kể từ bây giờ,"
      },
      {
        id: 's4-208',
        start: 744.57,
        end: 747.76,
        text: "you will gradually become the old and be cleared away.",
        translation: "bạn sẽ dần dần trở nên già nua và bị xóa sổ."
      },
      {
        id: 's4-209',
        start: 748.53,
        end: 751.01,
        text: "Sorry to be so dramatic, but it is quite true.",
        translation: "Xin thứ lỗi đã gây bi quan, nhưng mà đúng như vậy đấy."
      },
      {
        id: 's4-210',
        start: 752.15,
        end: 757.29,
        text: "Your time is limited, so don't waste it living someone else's life.",
        translation: "Your time is limited, so don't waste it living someone else's life."
      },
      {
        id: 's4-211',
        start: 758.11,
        end: 760.41,
        text: "Don't be trapped by dogma which is living",
        translation: "Don't be trapped by dogma which is living"
      },
      {
        id: 's4-212',
        start: 760.41,
        end: 762.6,
        text: "with the results of other people's thinking.",
        translation: "with the results of other people's thinking."
      },
      {
        id: 's4-213',
        start: 762.77,
        end: 766.19,
        text: "Don't let the noise of others' opinions drown out your own inner",
        translation: "Don't let the noise of others' opinions drown out your own inner"
      },
      {
        id: 's4-214',
        start: 766.19,
        end: 768.45,
        text: "voice. And most important,",
        translation: "voice. And most important,"
      },
      {
        id: 's4-215',
        start: 768.64,
        end: 771.28,
        text: "have the courage to follow your heart and intuition.",
        translation: "have the courage to follow your heart and intuition."
      },
      {
        id: 's4-216',
        start: 771.58,
        end: 775.35,
        text: "They somehow already know what you truly want to become.",
        translation: "They somehow already know what you truly want to become."
      },
      {
        id: 's4-217',
        start: 775.87,
        end: 778.2,
        text: "Everything else is secondary.",
        translation: "Everything else is secondary."
      },
      {
        id: 's4-218',
        start: 789.72,
        end: 790.91,
        text: "When I was young,",
        translation: "When I was young,"
      },
      {
        id: 's4-219',
        start: 791.29,
        end: 795.08,
        text: "there was an amazing publication called The Whole Earth Catalog,",
        translation: "there was an amazing publication called The Whole Earth Catalog,"
      },
      {
        id: 's4-220',
        start: 795.33,
        end: 797.79,
        text: "which was one of the bibles of my generation.",
        translation: "which was one of the bibles of my generation."
      },
      {
        id: 's4-221',
        start: 798.26,
        end: 801.77,
        text: "It was created by a fellow named Stewart Brand not far from here",
        translation: "It was created by a fellow named Stewart Brand not far from here"
      },
      {
        id: 's4-222',
        start: 801.77,
        end: 805.48,
        text: "in Menlo Park, and he brought it to life with his poetic touch.",
        translation: "in Menlo Park, and he brought it to life with his poetic touch."
      },
      {
        id: 's4-223',
        start: 805.84,
        end: 807.59,
        text: "This was in the late 1960's,",
        translation: "This was in the late 1960's,"
      },
      {
        id: 's4-224',
        start: 807.59,
        end: 810.17,
        text: "before personal computers and desktop publishing,",
        translation: "before personal computers and desktop publishing,"
      },
      {
        id: 's4-225',
        start: 810.44,
        end: 814.34,
        text: "so it was all made with typewriters, scissors, and polaroid cameras.",
        translation: "so it was all made with typewriters, scissors, and polaroid cameras."
      },
      {
        id: 's4-226',
        start: 814.68,
        end: 816.94,
        text: "It was sort of like Google in paperback form,",
        translation: "It was sort of like Google in paperback form,"
      },
      {
        id: 's4-227',
        start: 816.94,
        end: 821.34,
        text: "35 years before Google came along: it was idealistic,",
        translation: "35 years before Google came along: it was idealistic,"
      },
      {
        id: 's4-228',
        start: 821.57,
        end: 824.55,
        text: "overflowing with neat tools, and great notions.",
        translation: "overflowing with neat tools, and great notions."
      },
      {
        id: 's4-229',
        start: 825.49,
        end: 827.09,
        text: "Stewart and his team put out several",
        translation: "Stewart and his team put out several"
      },
      {
        id: 's4-230',
        start: 827.09,
        end: 828.48,
        text: "issues of The Whole Earth Catalog,",
        translation: "issues of The Whole Earth Catalog,"
      },
      {
        id: 's4-231',
        start: 828.48,
        end: 832.91,
        text: "and then when it had run its course, they put out a final issue.",
        translation: "and then when it had run its course, they put out a final issue."
      },
      {
        id: 's4-232',
        start: 833.4,
        end: 837.12,
        text: "It was the mid-1970s, and I was your age.",
        translation: "It was the mid-1970s, and I was your age."
      },
      {
        id: 's4-233',
        start: 838.72,
        end: 840.43,
        text: "On the back cover of their final issue",
        translation: "On the back cover of their final issue"
      },
      {
        id: 's4-234',
        start: 840.43,
        end: 844.07,
        text: "was a photograph of an early morning country road,",
        translation: "was a photograph of an early morning country road,"
      },
      {
        id: 's4-235',
        start: 844.32,
        end: 845.32,
        text: "the kind you might find yourself",
        translation: "the kind you might find yourself"
      },
      {
        id: 's4-236',
        start: 845.32,
        end: 848.19,
        text: "hitchhiking on if you were so adventurous.",
        translation: "hitchhiking on if you were so adventurous."
      },
      {
        id: 's4-237',
        start: 848.93,
        end: 853.14,
        text: "Beneath it were the words: \"Stay Hungry. Stay Foolish.\"",
        translation: "Beneath it were the words: \"Stay Hungry. Stay Foolish.\""
      },
      {
        id: 's4-238',
        start: 853.14,
        end: 858.23,
        text: "It was their farewell message as they signed off. Stay Hungry.",
        translation: "It was their farewell message as they signed off. Stay Hungry."
      },
      {
        id: 's4-239',
        start: 858.56,
        end: 862.73,
        text: "Stay Foolish. And I have always wished that for myself.",
        translation: "Stay Foolish. And I have always wished that for myself."
      },
      {
        id: 's4-240',
        start: 863.75,
        end: 868.54,
        text: "And now, as you graduate to begin anew, I wish that for you.",
        translation: "And now, as you graduate to begin anew, I wish that for you."
      },
      {
        id: 's4-241',
        start: 868.68,
        end: 871.61,
        text: "Stay Hungry. Stay Foolish.",
        translation: "Stay Hungry. Stay Foolish."
      },
      {
        id: 's4-242',
        start: 871.73,
        end: 874.85,
        text: "Thank you all very much.",
        translation: "Thank you all very much."
      },
      {
        id: 's4-243',
        start: 897.5,
        end: 900.89,
        text: "The preceding program is copyrighted by Stanford University.",
        translation: "The preceding program is copyrighted by Stanford University."
      },
      {
        id: 's4-244',
        start: 901.08,
        end: 903.76,
        text: "Please visit us at stanford.edu",
        translation: "Please visit us at stanford.edu"
      }
    ],
    quizzes: [
      {
        id: 'q4-1',
        question: 'According to Steve Jobs, what is the topic of his very first story?',
        options: [
          'Love and loss',
          'Connecting the dots',
          'Death and mortality',
          'Starting Apple in a garage'
        ],
        correctAnswer: 1,
        explanation: 'At 0:41, Steve Jobs states: "The first story is about connecting the dots."'
      },
      {
        id: 'q4-2',
        question: 'How long did Steve Jobs attend Reed College before dropping out?',
        options: [
          '4 full years',
          'The first 6 months',
          'Only 2 weeks',
          'He never enrolled'
        ],
        correctAnswer: 1,
        explanation: 'At 0:45, Steve Jobs explains: "I dropped out of Reed College after the first 6 months, but then stayed around as a drop-in for another 18 months."'
      }
    ]
  }
];

export const MOCK_SHORTS: VideoLesson[] = [
  {
    id: 'short-1',
    youtubeId: 's3bmNtkcj54',
    title: 'How to pronounce the long vowel /iː/ like a native',
    channel: 'BBC Learning English',
    channelAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    thumbnail: 'https://img.youtube.com/vi/s3bmNtkcj54/hqdefault.jpg',
    level: 'A1',
    topic: 'Pronunciation',
    duration: '00:31',
    durationSec: 31,
    views: '1.2M',
    description: 'Master the long vowel /iː/ with clear mouth shapes, smiling lips, and everyday practice words.',
    subtitles: [
      {
        id: 'sh1-1',
        start: 0.5,
        end: 5.5,
        text: 'Do you struggle with the English long vowel /iː/ in words like "me", "keep", or "three"?',
        translation: 'Bạn có gặp khó khăn với nguyên âm dài /iː/ trong tiếng Anh ở những từ như "me", "keep", hay "three" không?'
      },
      {
        id: 'sh1-2',
        start: 5.8,
        end: 10.5,
        text: "You're not alone, and we're here to help! This video explains how to pronounce /iː/ correctly.",
        translation: 'Bạn không đơn độc đâu, chúng tôi ở đây để giúp bạn! Video này sẽ hướng dẫn cách phát âm chuẩn /iː/.'
      },
      {
        id: 'sh1-3',
        start: 10.8,
        end: 16.5,
        text: 'It is pronounced /iː/. Pull the corners of your lips back wide, like a big smile: /iː/... /iː/.',
        translation: 'Âm này được phát âm là /iː/. Kéo khóe môi sang hai bên thật rộng, như đang cười tươi: /iː/... /iː/.'
      },
      {
        id: 'sh1-4',
        start: 16.8,
        end: 22.5,
        text: 'Now here are some words which have this sound: fleece, see, machine.',
        translation: 'Bây giờ là một số từ có âm này: fleece, see, machine.'
      },
      {
        id: 'sh1-5',
        start: 22.8,
        end: 28.0,
        text: 'Now you try, repeat after me: fleece... see... machine. Good!',
        translation: 'Bây giờ đến lượt bạn, hãy nhắc lại theo tôi nhé: fleece... see... machine. Tốt lắm!'
      },
      {
        id: 'sh1-6',
        start: 28.2,
        end: 31.0,
        text: 'Do you know any other words with the /iː/ sound? Put them in the comments below!',
        translation: 'Bạn có biết từ nào khác có âm /iː/ không? Hãy bình luận bên dưới nhé!'
      }
    ],
    quizzes: [
      {
        id: 'qsh1-1',
        question: 'Which shape should your mouth make when pronouncing the long vowel /iː/?',
        options: [
          'Rounded like an O',
          'Wide smile with lips stretched back',
          'Completely closed with teeth tight',
          'Lips pressed together'
        ],
        correctAnswer: 1,
        explanation: 'To produce the long vowel /iː/, stretch the corners of your lips back wide as if giving a broad smile.'
      },
      {
        id: 'qsh1-2',
        question: 'Which of the following words practiced in the video contains the /iː/ sound?',
        options: ['Ship', 'Fleece', 'Fit', 'Book'],
        correctAnswer: 1,
        explanation: 'The teacher practices three specific words: fleece, see, and machine, all containing the long vowel /iː/.'
      }
    ]
  },
  {
    id: 'short-2',
    youtubeId: 'ys8KkyWI_W8',
    title: 'American English vs British English Vocabulary Quiz',
    channel: 'BBC Learning English',
    channelAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    thumbnail: 'https://img.youtube.com/vi/ys8KkyWI_W8/hqdefault.jpg',
    level: 'A2',
    topic: 'Vocabulary',
    duration: '01:16',
    durationSec: 76,
    views: '2.4M',
    description: 'Learn the real everyday differences between US (Savannah) and UK (Nicola) vocabulary.',
    subtitles: [
      {
        id: 'sh2-1',
        start: 0.5,
        end: 6.8,
        text: 'Do you speak American English or British English? Try this vocabulary quiz!',
        translation: 'Bạn nói tiếng Anh Mỹ hay tiếng Anh Anh? Hãy thử bài đố từ vựng này nhé!'
      },
      {
        id: 'sh2-2',
        start: 7.0,
        end: 14.5,
        text: 'Savannah is from New York, but Nicola is from Gloucestershire in the UK, so their answers are quite different!',
        translation: 'Savannah đến từ New York, còn Nicola đến từ Gloucestershire ở Anh, nên câu trả lời của họ khá khác nhau!'
      },
      {
        id: 'sh2-3',
        start: 14.8,
        end: 25.5,
        text: 'First one: in America, the season before winter is called Fall, but in the UK, it is called Autumn!',
        translation: 'Từ đầu tiên: ở Mỹ, mùa trước mùa đông gọi là Fall, nhưng ở Anh thì gọi là Autumn!'
      },
      {
        id: 'sh2-4',
        start: 25.8,
        end: 37.0,
        text: 'Second one: what babies wear. In America, it is a Diaper, but in Britain, it is called a Nappy!',
        translation: 'Từ thứ hai: đồ trẻ em mặc. Ở Mỹ là Diaper, nhưng ở Anh được gọi là Nappy!'
      },
      {
        id: 'sh2-5',
        start: 37.3,
        end: 49.0,
        text: 'Third one: where you park your car. Americans call it a Parking lot, while British people call it a Car park!',
        translation: 'Từ thứ ba: nơi đỗ xe. Người Mỹ gọi là Parking lot, trong khi người Anh gọi là Car park!'
      },
      {
        id: 'sh2-6',
        start: 49.3,
        end: 61.0,
        text: 'Next: the subject with numbers. In the US, students study Math, but in the UK, they study Maths with an S!',
        translation: 'Tiếp theo: môn học về những con số. Ở Mỹ, học sinh học Math, nhưng ở Anh lại học Maths có chữ S!'
      },
      {
        id: 'sh2-7',
        start: 61.3,
        end: 71.0,
        text: 'And where to wash hands: in America you ask for the Restroom or Bathroom, while in Britain people say the Toilet or Loo!',
        translation: 'Và nơi rửa tay: ở Mỹ bạn hỏi Restroom hoặc Bathroom, còn ở Anh người ta gọi là Toilet hoặc Loo!'
      },
      {
        id: 'sh2-8',
        start: 71.3,
        end: 76.0,
        text: 'Did you answer more like Savannah or Nicola? Let us know in the comments!',
        translation: 'Bạn trả lời giống Savannah hay Nicola hơn? Hãy cho chúng tôi biết dưới phần bình luận nhé!'
      }
    ],
    quizzes: [
      {
        id: 'qsh2-1',
        question: 'What do British people call what Americans refer to as a "diaper"?',
        options: ['Nappy', 'Pants', 'Boot', 'Crisp'],
        correctAnswer: 0,
        explanation: 'In British English, Nicola explains that a baby\'s diaper is called a "nappy".'
      },
      {
        id: 'qsh2-2',
        question: 'How do Americans and British people differ when referring to the mathematics subject?',
        options: [
          'Americans say Numbers, British say Math',
          'Americans say Math, British say Maths with an S',
          'Both say Arithmetic only',
          'There is no difference'
        ],
        correctAnswer: 1,
        explanation: 'Americans drop the S and say "Math", whereas British English speakers always say "Maths" with an S.'
      }
    ]
  },
  {
    id: 'short-3',
    youtubeId: 'sikiDeWtv_k',
    title: 'Natural English Conversation: Have Dinner with Sian!',
    channel: 'BBC Learning English',
    channelAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    thumbnail: 'https://img.youtube.com/vi/sikiDeWtv_k/hqdefault.jpg',
    level: 'B1',
    topic: 'Daily Conversation',
    duration: '00:39',
    durationSec: 39,
    views: '1.9M',
    description: 'Learn polite dinner table expressions with Sian: cutlery, top-up, seconds, and dessert.',
    subtitles: [
      {
        id: 'sh3-1',
        start: 0.5,
        end: 3.5,
        text: 'Thank you, this smells delicious!',
        translation: 'Cảm ơn bạn, món này thơm nức mũi luôn!'
      },
      {
        id: 'sh3-2',
        start: 3.8,
        end: 7.5,
        text: 'Can you pass me the pepper, please?',
        translation: 'Bạn có thể chuyền giúp tôi lọ hạt tiêu được không?'
      },
      {
        id: 'sh3-3',
        start: 7.8,
        end: 10.0,
        text: 'Yeah, here you go!',
        translation: 'Vâng, của bạn đây nè!'
      },
      {
        id: 'sh3-4',
        start: 10.2,
        end: 14.0,
        text: "Thank you. I don't seem to have any cutlery...",
        translation: 'Cảm ơn bạn. Hình như tôi chưa có dao nĩa ăn...'
      },
      {
        id: 'sh3-5',
        start: 14.2,
        end: 17.0,
        text: 'Oops, there you go!',
        translation: 'Ôi trời, dao nĩa của bạn đây!'
      },
      {
        id: 'sh3-6',
        start: 17.2,
        end: 20.0,
        text: 'Do you want a top-up?',
        translation: 'Bạn có muốn rót thêm nước hay đồ uống không?'
      },
      {
        id: 'sh3-7',
        start: 20.2,
        end: 25.0,
        text: "Um, yeah, just a drop, please. Cheers! Do you have any napkins? I've made a mess.",
        translation: 'Dạ có, cho tôi một chút thôi nhé. Cạn ly! Bạn có khăn ăn không? Tôi lỡ làm rớt bẩn rồi.'
      },
      {
        id: 'sh3-8',
        start: 25.2,
        end: 28.5,
        text: 'Oh, yeah, um, ah, there you go!',
        translation: 'À có chứ, đây nhé!'
      },
      {
        id: 'sh3-9',
        start: 28.8,
        end: 32.8,
        text: "There's plenty more, do you want seconds?",
        translation: 'Còn nhiều lắm, bạn có muốn ăn thêm suất nữa không?'
      },
      {
        id: 'sh3-10',
        start: 33.0,
        end: 36.5,
        text: "Oh thanks, that was delicious, but I couldn't eat another bite!",
        translation: 'Ôi cảm ơn, ngon tuyệt cú mèo, nhưng tôi no căng bụng không thể ăn thêm miếng nào nữa!'
      },
      {
        id: 'sh3-11',
        start: 36.8,
        end: 39.0,
        text: 'Room for dessert? I made some cake! - Oh, go on then!',
        translation: 'Còn bụng ăn tráng miệng không? Tôi có làm bánh ngọt đấy! - Thế thì ăn luôn!'
      }
    ],
    quizzes: [
      {
        id: 'qsh3-1',
        question: 'What does the host mean when offering: "Do you want a top-up?"',
        options: [
          'Do you want more food on your plate?',
          'Do you want your glass refilled with more drink?',
          'Do you want to wash the dishes?',
          'Do you want to leave the table?'
        ],
        correctAnswer: 1,
        explanation: 'In dining, a "top-up" means refilling someone\'s glass with more beverage.'
      },
      {
        id: 'qsh3-2',
        question: 'What does "cutlery" mean in English?',
        options: [
          'Knives, forks, and spoons used for eating',
          'Paper napkins for wiping mouth',
          'Drinking glasses',
          'Cooking pots and pans'
        ],
        correctAnswer: 0,
        explanation: '"Cutlery" refers to utensils like knives, forks, and spoons used at the dining table.'
      }
    ]
  },
  {
    id: 'short-4',
    youtubeId: '0YnRI-RsLfU',
    title: 'English Pronunciation: Tricky -OUGH Words',
    channel: 'POC English',
    channelAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    thumbnail: 'https://img.youtube.com/vi/0YnRI-RsLfU/hqdefault.jpg',
    level: 'B2',
    topic: 'Pronunciation',
    duration: '00:38',
    durationSec: 38,
    views: '3.1M',
    description: "In this short English pronunciation lesson, let's learn words with difficult and confusing pronunciation: Through, Though, Tough, and Thought.",
    subtitles: [
      {
        id: 'sh4-1',
        start: 0.5,
        end: 5.5,
        text: "In this short English pronunciation lesson, let's learn words with difficult and confusing pronunciation:",
        translation: 'Trong bài học phát âm ngắn này, chúng ta hãy học những từ có cách phát âm khó và dễ nhầm lẫn:'
      },
      {
        id: 'sh4-2',
        start: 5.8,
        end: 13.5,
        text: 'Number one: Through. It sounds like T-H-R-O-O: Through. We drove through the tunnel.',
        translation: 'Số một: Through. Phát âm là T-H-R-O-O: Through. Chúng tôi lái xe xuyên qua đường hầm.'
      },
      {
        id: 'sh4-3',
        start: 13.8,
        end: 21.5,
        text: 'Number two: Though. It sounds like T-H-O-H: Though. Even though it was late, we kept going.',
        translation: 'Số hai: Though. Phát âm là T-H-O-H: Though. Mặc dù trời đã muộn, chúng tôi vẫn tiếp tục đi.'
      },
      {
        id: 'sh4-4',
        start: 21.8,
        end: 29.5,
        text: 'Number three: Tough. It sounds like T-U-F-F: Tough. Staying focused can be tough.',
        translation: 'Số ba: Tough. Phát âm giống như T-U-F-F: Tough. Giữ tập trung đôi khi có thể rất khó khăn.'
      },
      {
        id: 'sh4-5',
        start: 29.8,
        end: 35.5,
        text: 'Number four: Thought. It sounds like T-H-A-W-T: Thought. I thought you already knew.',
        translation: 'Số bốn: Thought. Phát âm là T-H-A-W-T: Thought. Tôi cứ ngỡ là bạn đã biết rồi.'
      },
      {
        id: 'sh4-6',
        start: 35.8,
        end: 38.0,
        text: 'Through, though, tough, and thought! Master these four tricky words!',
        translation: 'Through, though, tough, và thought! Hãy nắm vững 4 từ thử thách này nhé!'
      }
    ],
    quizzes: [
      {
        id: 'qsh4-1',
        question: 'Which of the words practiced first rhymes with "blue" and "clue"?',
        options: ['Through', 'Though', 'Tough', 'Thought'],
        correctAnswer: 0,
        explanation: '"Through" is pronounced /θruː/ and rhymes with "blue" and "clue".'
      },
      {
        id: 'qsh4-2',
        question: 'Which word contains the ending "f" sound (/tʌf/)?',
        options: ['Though', 'Thought', 'Tough', 'Through'],
        correctAnswer: 2,
        explanation: '"Tough" ends with the /f/ consonant sound, rhyming with "rough".'
      }
    ]
  }
];

export const INITIAL_SAVED_WORDS: SavedWord[] = [
  {
    id: 'w1',
    word: 'complicated',
    phonetic: '/ˈkɑːm.plə.keɪ.t̬ɪd/',
    partOfSpeech: 'adjective',
    translation: 'phức tạp, rắc rối',
    definitionEn: 'involving a lot of different parts, in a way that is difficult to understand',
    exampleEn: 'We can transmit really complicated thoughts to one another.',
    contextSentence: 'We can transmit really complicated thoughts to one another.',
    videoTitle: 'How language shapes the way we think',
    savedAt: Date.now() - 86400000 * 2,
    easeFactor: 2.35,
    interval: 3,
    repetitions: 2,
    lapses: 0,
    state: 'review',
    dueAt: Date.now() - 3600000,
    lastReviewedAt: Date.now() - 86400000 * 3
  },
  {
    id: 'w2',
    word: 'vibration',
    phonetic: '/vaɪˈbreɪ.ʃən/',
    partOfSpeech: 'noun',
    translation: 'sự rung động, dao động sóng âm',
    definitionEn: 'continuous quick, slight shaking movement or air oscillation',
    exampleEn: 'That creates air vibrations.',
    contextSentence: 'That creates air vibrations.',
    videoTitle: 'How language shapes the way we think',
    savedAt: Date.now() - 86400000 * 8,
    easeFactor: 2.65,
    interval: 8,
    repetitions: 4,
    lapses: 0,
    state: 'review',
    dueAt: Date.now() + 86400000 * 4,
    lastReviewedAt: Date.now() - 86400000 * 4
  },
  {
    id: 'w3',
    word: 'pastry',
    phonetic: '/ˈpeɪ.stri/',
    partOfSpeech: 'noun',
    translation: 'bánh ngọt nướng',
    definitionEn: 'a food made from a mixture of flour, fat, and water, rolled flat and baked',
    exampleEn: 'Would you like anything from our bakery display today?',
    contextSentence: 'Would you like anything from our bakery display today?',
    videoTitle: 'Ordering Food at a Cozy American Cafe',
    savedAt: Date.now() - 86400000 * 1,
    easeFactor: 2.50,
    interval: 1,
    repetitions: 1,
    lapses: 0,
    state: 'learning',
    dueAt: Date.now() - 1800000,
    lastReviewedAt: Date.now() - 86400000
  }
];
