export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface LevelInfo {
  level: CEFRLevel;
  name: string;
  tagline: string;
  targetLatency: string;
  latencyMaxMs: number;
  cognitiveFocus: string;
  badgeColor: string;
  description: string;
}

export const CEFR_LEVEL_SPECS: Record<CEFRLevel, LevelInfo> = {
  A1: {
    level: 'A1',
    name: 'Sinh Tồn Căn Bản',
    tagline: 'Phá vỡ câm lặng - Bật âm những nhu cầu sống còn',
    targetLatency: '< 2.5s',
    latencyMaxMs: 2500,
    cognitiveFocus: 'Tập trung bật từ khóa trọng tâm không sợ sai ngữ pháp',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Nhu cầu ăn uống, hỏi đường đơn giản, số đếm, chào hỏi và khách sạn.'
  },
  A2: {
    level: 'A2',
    name: 'Giao Tiếp Đời Sống',
    tagline: 'Xử lý các việc vặt thường nhật độc lập',
    targetLatency: '< 2.0s',
    latencyMaxMs: 2000,
    cognitiveFocus: 'Liên kết 2-3 câu đơn bằng liên từ (and, but, because) không khựng',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    description: 'Mua sắm trả giá, chỉ đường chi tiết, mua thuốc tại hiệu thuốc, giao lưu kết bạn.'
  },
  B1: {
    level: 'B1',
    name: 'Tình Huống Bất Ngờ',
    tagline: 'Ứng biến sự cố du lịch & giải quyết vấn đề',
    targetLatency: '< 1.5s',
    latencyMaxMs: 1500,
    cognitiveFocus: 'Phản xạ khi gặp sự cố không có trong kịch bản chuẩn bị trước',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Hành lý thất lạc sân bay, đổi trả hàng lỗi, khiếu nại dịch vụ khách sạn, xin lỗi và giải thích.'
  },
  B2: {
    level: 'B2',
    name: 'Công Sở & Đàm Phán',
    tagline: 'Giao tiếp trôi chảy tự nhiên không cần dịch nhẩm',
    targetLatency: '< 1.2s',
    latencyMaxMs: 1200,
    cognitiveFocus: 'Lập luận theo đoạn văn mạch lạc, từ chối khéo léo, thương lượng lợi ích',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Phỏng vấn xin việc, thương lượng lương, báo cáo tiến độ dự án, thuyết phục khách hàng.'
  },
  C1: {
    level: 'C1',
    name: 'Tranh Luận Sắc Bén',
    tagline: 'Phản xạ tức thì ngang tầm người bản xứ (Native-Like)',
    targetLatency: '< 0.9s',
    latencyMaxMs: 900,
    cognitiveFocus: 'Sử dụng từ vựng tinh tế, ẩn dụ, phản biện lập luận logic phức tạp',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Họp chiến lược ban lãnh đạo, tranh luận đạo đức AI, đàm phán hợp đồng triệu đô, xử lý khủng hoảng.'
  }
};

export interface DialogueTurn {
  id: string;
  speaker: 'AI' | 'User';
  speakerName: string;
  avatar: string;
  text: string;
  translation: string;
  hintPrompt?: string;
  expectedKeywords: string[];
  nativeVariations?: string[];
}

export interface SpeakingScenario {
  id: string;
  level: CEFRLevel;
  title: string;
  category: 'Ăn uống' | 'Mua sắm' | 'Du lịch' | 'Công sở' | 'Xã giao' | 'Khẩn cấp';
  description: string;
  icon: string;
  targetGoal: string;
  turns: DialogueTurn[];
}

export const SPEAKING_SCENARIOS: SpeakingScenario[] = [
  // ==========================================
  // LEVEL A1: SINH TỒN CĂN BẢN (5 TÌNH HUỐNG)
  // ==========================================
  {
    id: 'a1-1',
    level: 'A1',
    title: 'Gọi Món & Nước Uống Tại Nhà Hàng',
    category: 'Ăn uống',
    icon: '🍜',
    description: 'Thực hành gọi món ăn, dặn dò không ăn cay và xin nước ấm.',
    targetGoal: 'Gọi được món và đồ uống chính xác dưới 2.5s.',
    turns: [
      {
        id: 'a1-1-t1',
        speaker: 'AI',
        speakerName: 'Bồi bàn',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=100&h=100&fit=crop',
        text: 'Hello! Are you ready to order, or do you need more time?',
        translation: 'Xin chào! Bạn đã sẵn sàng gọi món chưa, hay cần thêm thời gian?',
        expectedKeywords: ['ready', 'order', 'please'],
        nativeVariations: ["Ready to order?", "Can I get you started?"]
      },
      {
        id: 'a1-1-t2',
        speaker: 'User',
        speakerName: 'Bạn (Khách hàng)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tôi đã sẵn sàng. Cho tôi món mì xào bò, không cay nhé."',
        text: "I am ready. I would like beef fried noodles, no spicy please.",
        translation: 'Tôi sẵn sàng rồi. Cho tôi món mì xào bò, không cay nhé.',
        expectedKeywords: ['ready', 'beef', 'noodles', 'no', 'spicy'],
        nativeVariations: ["Beef noodles, no spice please.", "I'll do the beef noodles mild."]
      },
      {
        id: 'a1-1-t3',
        speaker: 'AI',
        speakerName: 'Bồi bàn',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=100&h=100&fit=crop',
        text: 'Sure! Would you like anything to drink?',
        translation: 'Chắc chắn rồi! Bạn có muốn uống gì không?',
        expectedKeywords: ['drink', 'water']
      },
      {
        id: 'a1-1-t4',
        speaker: 'User',
        speakerName: 'Bạn (Khách hàng)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Chỉ cho tôi một ly nước ấm thôi, cảm ơn."',
        text: 'Just a glass of warm water, thank you.',
        translation: 'Chỉ cho tôi một ly nước ấm thôi, cảm ơn.',
        expectedKeywords: ['just', 'warm', 'water', 'thank'],
        nativeVariations: ["Warm water is fine.", "Just water for me."]
      }
    ]
  },
  {
    id: 'a1-2',
    level: 'A1',
    title: 'Hỏi Đường Đến Ga Tàu Điện Ngầm',
    category: 'Du lịch',
    icon: '🚇',
    description: 'Hỏi người đi đường vị trí ga tàu điện và thời gian đi bộ.',
    targetGoal: 'Hỏi được hướng đi và xác nhận khoảng cách trong 2 câu.',
    turns: [
      {
        id: 'a1-2-t1',
        speaker: 'User',
        speakerName: 'Bạn (Khách du lịch)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Xin lỗi, cho tôi hỏi ga tàu điện ngầm gần nhất ở đâu?"',
        text: 'Excuse me, where is the nearest subway station?',
        translation: 'Xin lỗi, cho tôi hỏi ga tàu điện ngầm gần nhất ở đâu?',
        expectedKeywords: ['excuse', 'where', 'subway', 'station'],
        nativeVariations: ["Where's the closest metro station?", "How do I get to the subway?"]
      },
      {
        id: 'a1-2-t2',
        speaker: 'AI',
        speakerName: 'Người đi đường',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
        text: 'Go straight for two blocks, then turn right. You will see the entrance.',
        translation: 'Đi thẳng qua 2 ngã tư, sau đó rẽ phải. Bạn sẽ thấy lối vào ngay.',
        expectedKeywords: ['straight', 'turn', 'right']
      },
      {
        id: 'a1-2-t3',
        speaker: 'User',
        speakerName: 'Bạn (Khách du lịch)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Cảm ơn bạn rất nhiều! Chúc một ngày tốt lành."',
        text: 'Thank you very much! Have a great day.',
        translation: 'Cảm ơn bạn rất nhiều! Chúc bạn một ngày tốt lành.',
        expectedKeywords: ['thank', 'very', 'great', 'day'],
        nativeVariations: ["Thanks a bunch!", "Appreciate it, have a good one!"]
      }
    ]
  },
  {
    id: 'a1-3',
    level: 'A1',
    title: 'Thanh Toán Tại Cửa Hàng Tiện Lợi (7-Eleven)',
    category: 'Mua sắm',
    icon: '🏪',
    description: 'Mua nước khoáng, bánh mì kẹp và thanh toán bằng mã QR / tiền mặt.',
    targetGoal: 'Hỏi giá tiền và thanh toán nhanh chóng.',
    turns: [
      {
        id: 'a1-3-t1',
        speaker: 'AI',
        speakerName: 'Thu ngân',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        text: 'Hello! That will be three dollars and fifty cents. Cash or card?',
        translation: 'Xin chào! Của bạn hết 3 đô 50 cent. Tiền mặt hay thẻ?',
        expectedKeywords: ['dollars', 'cents', 'cash', 'card']
      },
      {
        id: 'a1-3-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tôi trả tiền mặt đây. Cho tôi xin một túi xách nylon nhé."',
        text: 'Here is cash. Can I get a plastic bag please?',
        translation: 'Tiền mặt đây ạ. Cho tôi xin một chiếc túi nylon nhé.',
        expectedKeywords: ['here', 'cash', 'plastic', 'bag', 'please'],
        nativeVariations: ["Cash, please. Do you have a bag?", "I'll pay cash. Need a bag please."]
      }
    ]
  },
  {
    id: 'a1-4',
    level: 'A1',
    title: 'Làm Quen & Giới Thiệu Bản Thân Căn Bản',
    category: 'Xã giao',
    icon: '👋',
    description: 'Nói tên, quốc tịch và sở thích đơn giản trong buổi gặp mặt đầu tiên.',
    targetGoal: 'Tự tin giới thiệu bản thân trong 3 câu ngắn.',
    turns: [
      {
        id: 'a1-4-t1',
        speaker: 'AI',
        speakerName: 'Alex (Bạn mới)',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop',
        text: 'Hi there! My name is Alex. Where are you from?',
        translation: 'Chào bạn! Tên mình là Alex. Bạn đến từ đâu vậy?',
        expectedKeywords: ['where', 'from']
      },
      {
        id: 'a1-4-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Rất vui được gặp bạn! Tôi đến từ Việt Nam và hiện đang sống ở Hà Nội."',
        text: 'Nice to meet you! I am from Vietnam, and I live in Hanoi.',
        translation: 'Rất vui được gặp bạn! Tôi đến từ Việt Nam, và tôi sống ở Hà Nội.',
        expectedKeywords: ['nice', 'meet', 'from', 'vietnam', 'live'],
        nativeVariations: ["Great to meet you! I'm from Vietnam.", "Pleasure! Vietnam is my hometown."]
      }
    ]
  },
  {
    id: 'a1-5',
    level: 'A1',
    title: 'Khách Sạn: Hỏi Mật Khẩu Wi-Fi & Xin Thêm Khăn',
    category: 'Du lịch',
    icon: '🏨',
    description: 'Gọi lễ tân khách sạn để xin thông tin mạng và vật dụng phòng.',
    targetGoal: 'Giao tiếp rõ ràng yêu cầu hỗ trợ phòng.',
    turns: [
      {
        id: 'a1-5-t1',
        speaker: 'AI',
        speakerName: 'Lễ tân khách sạn',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop',
        text: 'Front desk, how may I assist you?',
        translation: 'Lễ tân xin nghe, tôi có thể hỗ trợ gì cho quý khách?',
        expectedKeywords: ['front', 'desk', 'assist']
      },
      {
        id: 'a1-5-t2',
        speaker: 'User',
        speakerName: 'Bạn (Phòng 302)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Chào bạn, tôi ở phòng 302. Cho tôi hỏi mật khẩu Wi-Fi là gì và mang thêm cho tôi 2 cái khăn tắm nhé."',
        text: 'Hello, I am in room 302. What is the Wi-Fi password, and can I get two extra towels?',
        translation: 'Chào bạn, tôi ở phòng 302. Mật khẩu Wi-Fi là gì, và cho tôi xin thêm 2 chiếc khăn tắm được không?',
        expectedKeywords: ['room', 'wifi', 'password', 'two', 'extra', 'towels'],
        nativeVariations: ["Room 302 here. Could we get the Wi-Fi code and extra towels?"]
      }
    ]
  },

  // ==========================================
  // LEVEL A2: GIAO TIẾP ĐỜI SỐNG (5 TÌNH HUỐNG)
  // ==========================================
  {
    id: 'a2-1',
    level: 'A2',
    title: 'Trả Giá & Mặc Cả Tại Chợ Bản Địa',
    category: 'Mua sắm',
    icon: '🛍️',
    description: 'Thương lượng giá cả khi mua quà lưu niệm thủ công.',
    targetGoal: 'Thương lượng thành công mức giảm giá 25%.',
    turns: [
      {
        id: 'a2-1-t1',
        speaker: 'AI',
        speakerName: 'Chủ quầy hàng',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
        text: 'This handmade leather jacket is eighty dollars. The quality is top notch!',
        translation: 'Chiếc áo khoác da thủ công này giá 80 đô. Chất lượng hàng đầu đấy!',
        expectedKeywords: ['jacket', 'eighty', 'dollars']
      },
      {
        id: 'a2-1-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Hơi đắt quá! 60 đô được không? Nếu được tôi lấy luôn 2 cái."',
        text: "That is a bit too expensive. Can you do sixty dollars? I will buy two.",
        translation: 'Hơi đắt quá. 60 đô được không? Tôi sẽ mua 2 cái.',
        expectedKeywords: ['expensive', 'sixty', 'dollars', 'buy', 'two'],
        nativeVariations: ["Can you do 60? I'll take two.", "That's steep! 60 each and it's a deal."]
      },
      {
        id: 'a2-1-t3',
        speaker: 'AI',
        speakerName: 'Chủ quầy hàng',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
        text: 'Alright, deal! Sixty each because you are buying two. Cash or card?',
        translation: 'Được rồi, chốt giá! 60 đô mỗi cái vì bạn mua 2 chiếc. Tiền mặt hay quẹt thẻ?',
        expectedKeywords: ['deal', 'cash', 'card']
      },
      {
        id: 'a2-1-t4',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tôi trả bằng thẻ tín dụng. Làm ơn gói riêng từng cái giúp tôi nhé."',
        text: 'I will pay by credit card. Please wrap them separately.',
        translation: 'Tôi sẽ trả bằng thẻ tín dụng. Làm ơn gói riêng từng cái giúp tôi.',
        expectedKeywords: ['pay', 'credit', 'card', 'wrap', 'separately'],
        nativeVariations: ["Credit card, please. Could you bag them separately?"]
      }
    ]
  },
  {
    id: 'a2-2',
    level: 'A2',
    title: 'Mua Thuốc Cảm Tại Hiệu Thuốc',
    category: 'Khẩn cấp',
    icon: '💊',
    description: 'Miêu tả triệu chứng đau đầu, nghẹt mũi và hỏi liều lượng uống.',
    targetGoal: 'Miêu tả chính xác 2 triệu chứng và cách dùng thuốc dưới 2.0s.',
    turns: [
      {
        id: 'a2-2-t1',
        speaker: 'AI',
        speakerName: 'Dược sĩ',
        avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop',
        text: 'Good morning! How can I help you today?',
        translation: 'Chào buổi sáng! Tôi có thể giúp gì cho bạn hôm nay?',
        expectedKeywords: ['help']
      },
      {
        id: 'a2-2-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tôi bị đau đầu nặng và nghẹt mũi từ tối qua. Bạn có thuốc gì không?"',
        text: 'I have a bad headache and a stuffy nose since last night. Do you have any medicine for this?',
        translation: 'Tôi bị đau đầu nặng và nghẹt mũi từ tối qua. Bạn có thuốc gì cho tình trạng này không?',
        expectedKeywords: ['headache', 'stuffy', 'nose', 'medicine'],
        nativeVariations: ["I've got a terrible headache and blocked nose.", "I'm coming down with a cold."]
      },
      {
        id: 'a2-2-t3',
        speaker: 'AI',
        speakerName: 'Dược sĩ',
        avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&h=100&fit=crop',
        text: 'Take this tablet twice a day after meals. Does it make you drowsy? Yes, so avoid driving.',
        translation: 'Uống viên này 2 lần một ngày sau bữa ăn nhé. Nó có gây buồn ngủ không? Có đấy, nên tránh lái xe.',
        expectedKeywords: ['tablet', 'meals', 'driving']
      },
      {
        id: 'a2-2-t4',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tôi hiểu rồi. Cho tôi một hộp nhé, cảm ơn lời khuyên của bạn."',
        text: 'I understand. I will take one box, thank you for your advice.',
        translation: 'Tôi hiểu rồi. Cho tôi một hộp nhé, cảm ơn lời khuyên của bạn.',
        expectedKeywords: ['understand', 'take', 'box', 'thank', 'advice'],
        nativeVariations: ["Got it. One box please, thanks a lot!"]
      }
    ]
  },
  {
    id: 'a2-3',
    level: 'A2',
    title: 'Bắt Taxi & Hướng Dẫn Điểm Dừng',
    category: 'Du lịch',
    icon: '🚕',
    description: 'Nói điểm đến, yêu cầu bật đồng hồ tính cước và báo điểm dừng.',
    targetGoal: 'Chỉ dẫn điểm đến và yêu cầu bật meter.',
    turns: [
      {
        id: 'a2-3-t1',
        speaker: 'AI',
        speakerName: 'Tài xế taxi',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop',
        text: 'Hop in! Where are you heading to today?',
        translation: 'Lên xe nào! Hôm nay bạn đi đâu?',
        expectedKeywords: ['where', 'heading']
      },
      {
        id: 'a2-3-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Làm ơn cho tôi đến khách sạn Hilton, và hãy bật đồng hồ tính tiền giúp tôi nhé."',
        text: 'Please take me to the Hilton Hotel, and please turn on the meter.',
        translation: 'Làm ơn cho tôi đến khách sạn Hilton, và hãy bật đồng hồ tính tiền giúp tôi nhé.',
        expectedKeywords: ['take', 'hilton', 'hotel', 'turn', 'meter'],
        nativeVariations: ["Hilton Hotel please, by the meter.", "Could you run the meter to Hilton?"]
      }
    ]
  },
  {
    id: 'a2-4',
    level: 'A2',
    title: 'Hẹn Bạn Đi Uống Cà Phê Cuối Tuần',
    category: 'Xã giao',
    icon: '☕',
    description: 'Đề xuất địa điểm, thời gian và thống nhất lịch hẹn.',
    targetGoal: 'Mời hẹn và chốt giờ gặp dưới 2.0s.',
    turns: [
      {
        id: 'a2-4-t1',
        speaker: 'AI',
        speakerName: 'Sarah (Đồng nghiệp)',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        text: 'Hey! Are you free this Saturday afternoon? We should catch up!',
        translation: 'Này! Chiều thứ 7 này bạn rảnh không? Tụi mình nên gặp nhau chút đi!',
        expectedKeywords: ['free', 'saturday', 'catch']
      },
      {
        id: 'a2-4-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Ý kiến hay đấy! Gặp nhau lúc 3 giờ chiều ở quán cà phê gần công viên nhé?"',
        text: 'That sounds great! How about meeting at 3 PM at the coffee shop near the park?',
        translation: 'Ý kiến hay đấy! Gặp nhau lúc 3 giờ chiều ở quán cà phê gần công viên nhé?',
        expectedKeywords: ['sounds', 'great', 'meeting', '3', 'coffee', 'park'],
        nativeVariations: ["Sounds awesome! 3 PM at the park cafe works for you?", "Let's do 3 PM by the park."]
      }
    ]
  },
  {
    id: 'a2-5',
    level: 'A2',
    title: 'Đặt Bàn Trước Tại Nhà Hàng Đông Khách',
    category: 'Ăn uống',
    icon: '🍽️',
    description: 'Gọi điện đặt bàn cho 4 người vào tối thứ 6, yêu cầu chỗ ngồi gần cửa sổ.',
    targetGoal: 'Đặt bàn thành công với đầy đủ số người, thời gian và vị trí.',
    turns: [
      {
        id: 'a2-5-t1',
        speaker: 'AI',
        speakerName: 'Nhân viên lễ tân nhà hàng',
        avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=100&h=100&fit=crop',
        text: 'Bistro Paris, how can I help you with your reservation?',
        translation: 'Nhà hàng Bistro Paris xin nghe, tôi có thể hỗ trợ quý khách đặt bàn thế nào?',
        expectedKeywords: ['reservation', 'help']
      },
      {
        id: 'a2-5-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tôi muốn đặt một bàn cho 4 người vào lúc 7 giờ tối thứ 6 này, gần cửa sổ nhé."',
        text: 'I would like to book a table for four people this Friday at 7 PM, preferably near the window.',
        translation: 'Tôi muốn đặt một bàn cho 4 người vào lúc 7 giờ tối thứ 6 này, ưu tiên gần cửa sổ nhé.',
        expectedKeywords: ['book', 'table', 'four', 'friday', '7', 'window'],
        nativeVariations: ["Table for 4, Friday 7 PM by the window please.", "Can I reserve a table for four at 7 PM Friday?"]
      }
    ]
  },

  // ==========================================
  // LEVEL B1: TÌNH HUỐNG BẤT NGỜ (5 TÌNH HUỐNG)
  // ==========================================
  {
    id: 'b1-1',
    level: 'B1',
    title: 'Khiếu Nại Hành Lý Bị Thất Lạc Tại Sân Bay',
    category: 'Du lịch',
    icon: '🧳',
    description: 'Xử lý tình huống vali không xuất hiện trên băng chuyền sau chuyến bay quốc tế.',
    targetGoal: 'Cung cấp mã số chuyến bay, mô tả vali và yêu cầu giao tới khách sạn.',
    turns: [
      {
        id: 'b1-1-t1',
        speaker: 'AI',
        speakerName: 'Nhân viên hành lý sân bay',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        text: 'Baggage claim service, how can I assist you?',
        translation: 'Bộ phận hỗ trợ hành lý xin nghe, tôi có thể giúp gì cho quý khách?',
        expectedKeywords: ['baggage', 'assist']
      },
      {
        id: 'b1-1-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tôi vừa bay chuyến VN300 từ Hà Nội đến, nhưng vali màu đen của tôi không xuất hiện trên băng chuyền."',
        text: 'I just arrived on flight VN300 from Hanoi, but my black suitcase never appeared on the carousel.',
        translation: 'Tôi vừa đến trên chuyến bay VN300 từ Hà Nội, nhưng chiếc vali màu đen của tôi không hề xuất hiện trên băng chuyền.',
        expectedKeywords: ['arrived', 'flight', 'black', 'suitcase', 'carousel'],
        nativeVariations: ["My luggage is missing from flight VN300.", "My suitcase didn't come out on carousel 4."]
      },
      {
        id: 'b1-1-t3',
        speaker: 'AI',
        speakerName: 'Nhân viên hành lý sân bay',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        text: 'I am terribly sorry about that. Could you show me your baggage claim tag so I can track it down?',
        translation: 'Tôi rất tiếc về sự cố này. Bạn có thể cho tôi xem thẻ hành lý để tôi tra cứu vị trí của nó không?',
        expectedKeywords: ['tag', 'track']
      },
      {
        id: 'b1-1-t4',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Thẻ của tôi đây. Xin vui lòng gửi nó trực tiếp đến khách sạn của tôi ngay khi tìm thấy nhé."',
        text: 'Here is my tag. Please deliver it directly to my hotel as soon as you find it.',
        translation: 'Thẻ của tôi đây. Xin vui lòng gửi nó trực tiếp đến khách sạn của tôi ngay khi tìm thấy nhé.',
        expectedKeywords: ['tag', 'deliver', 'hotel', 'soon', 'find'],
        nativeVariations: ["Here's the receipt. Can you courier it to my hotel?"]
      }
    ]
  },
  {
    id: 'b1-2',
    level: 'B1',
    title: 'Đổi Trả Hàng Hóa Bị Lỗi & Yêu Cầu Hoàn Tiền',
    category: 'Mua sắm',
    icon: '🔄',
    description: 'Mang tai nghe bị hỏng một bên loa quay lại cửa hàng để khiếu nại.',
    targetGoal: 'Giải thích lỗi kỹ thuật và thương lượng hoàn tiền 100%.',
    turns: [
      {
        id: 'b1-2-t1',
        speaker: 'AI',
        speakerName: 'Nhân viên chăm sóc khách hàng',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop',
        text: 'Customer support, how may I help you today?',
        translation: 'Bộ phận hỗ trợ khách hàng xin nghe, tôi có thể giúp gì cho bạn?',
        expectedKeywords: ['support', 'help']
      },
      {
        id: 'b1-2-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tôi mua chiếc tai nghe này hôm qua, nhưng bên tai trái hoàn toàn không có tiếng. Tôi muốn đổi cái mới hoặc hoàn tiền."',
        text: 'I bought these headphones yesterday, but the left ear has no sound at all. I would like a replacement or full refund.',
        translation: 'Tôi mua chiếc tai nghe này hôm qua, nhưng bên tai trái hoàn toàn không có tiếng. Tôi muốn đổi cái mới hoặc hoàn tiền đầy đủ.',
        expectedKeywords: ['bought', 'headphones', 'left', 'sound', 'replacement', 'refund'],
        nativeVariations: ["The left earbud is dead. I'd like an exchange or my money back."]
      }
    ]
  },
  {
    id: 'b1-3',
    level: 'B1',
    title: 'Phòng Khách Sạn Có Sự Cố: Máy Lạnh Hỏng Lúc Nửa Đêm',
    category: 'Khẩn cấp',
    icon: '❄️',
    description: 'Báo sự cố điều hòa thổi hơi nóng giữa đêm mùa hè và yêu cầu đổi phòng.',
    targetGoal: 'Yêu cầu thợ sửa hoặc đổi phòng ngay lập tức dưới 1.5s.',
    turns: [
      {
        id: 'b1-3-t1',
        speaker: 'AI',
        speakerName: 'Quản lý ca đêm khách sạn',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop',
        text: 'Front desk, night manager speaking. Is everything alright in room 405?',
        translation: 'Lễ tân, quản lý ca đêm xin nghe. Phòng 405 có vấn đề gì không ạ?',
        expectedKeywords: ['speaking', 'alright']
      },
      {
        id: 'b1-3-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Không ổn chút nào. Máy lạnh chỉ thổi gió nóng và phòng thì ngột ngạt. Hãy đổi phòng khác cho tôi ngay bây giờ."',
        text: 'Not at all. The air conditioner is blowing hot air and the room is boiling. Please move me to another room immediately.',
        translation: 'Không ổn chút nào. Máy lạnh chỉ thổi gió nóng và phòng thì ngột ngạt. Hãy chuyển tôi sang phòng khác ngay lập tức.',
        expectedKeywords: ['air', 'conditioner', 'hot', 'move', 'another', 'room', 'immediately'],
        nativeVariations: ["The AC is broken and blowing heat. I need to switch rooms right now."]
      }
    ]
  },
  {
    id: 'b1-4',
    level: 'B1',
    title: 'Xin Lỗi & Giải Thích Lý Do Trễ Hẹn Cuộc Họp',
    category: 'Công sở',
    icon: '⏰',
    description: 'Gọi điện cho đối tác thông báo bị kẹt xe nghiêm trọng do tai nạn giao thông.',
    targetGoal: 'Thông báo sự cố trễ giờ lịch sự và đề xuất dời lại 30 phút.',
    turns: [
      {
        id: 'b1-4-t1',
        speaker: 'AI',
        speakerName: 'Mr. David (Đối tác)',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
        text: 'Hi! Our meeting is scheduled in 10 minutes. Are you almost here?',
        translation: 'Chào bạn! Cuộc họp bắt đầu sau 10 phút nữa. Bạn gần đến nơi chưa?',
        expectedKeywords: ['meeting', 'scheduled', 'almost']
      },
      {
        id: 'b1-4-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tôi vô cùng xin lỗi. Có một vụ tai nạn trên đường cao tốc khiến giao thông tê liệt. Tôi có thể đến trễ 20 phút không?"',
        text: 'I am terribly sorry. There was an accident on the highway and traffic is completely blocked. May we push back our meeting by twenty minutes?',
        translation: 'Tôi vô cùng xin lỗi. Có một vụ tai nạn trên đường cao tốc khiến giao thông tê liệt hoàn toàn. Chúng ta có thể dời cuộc họp lại 20 phút được không?',
        expectedKeywords: ['terribly', 'sorry', 'accident', 'traffic', 'push', 'twenty', 'minutes'],
        nativeVariations: ["So sorry, bad crash on the highway. Can we push back 20 minutes?"]
      }
    ]
  },
  {
    id: 'b1-5',
    level: 'B1',
    title: 'Hỏi Thăm & Tư Vấn Tour Du Lịch Bản Địa',
    category: 'Du lịch',
    icon: '🗺️',
    description: 'Tìm hiểu tour tham quan trong ngày, hỏi về bữa ăn đi kèm và chính sách hủy vé.',
    targetGoal: 'Lấy đầy đủ thông tin chi phí và điều kiện hủy vé.',
    turns: [
      {
        id: 'b1-5-t1',
        speaker: 'AI',
        speakerName: 'Hướng dẫn viên tour',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
        text: 'Welcome to Island Adventures! Are you looking for a full-day or half-day island tour?',
        translation: 'Chào mừng quý khách! Bạn đang tìm kiếm tour đảo nguyên ngày hay nửa ngày?',
        expectedKeywords: ['island', 'tour']
      },
      {
        id: 'b1-5-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Chúng tôi muốn tour nguyên ngày. Giá này đã bao gồm bữa trưa và đồ lặn chưa, và chính sách hủy vé thế nào?"',
        text: 'We prefer the full-day tour. Does the price include lunch and snorkeling gear, and what is your cancellation policy?',
        translation: 'Chúng tôi muốn tour nguyên ngày. Giá này đã bao gồm bữa trưa và dụng cụ lặn chưa, và chính sách hủy vé thế nào?',
        expectedKeywords: ['prefer', 'full-day', 'include', 'lunch', 'cancellation', 'policy'],
        nativeVariations: ["Full-day please. Is lunch included, and can we cancel if it rains?"]
      }
    ]
  },

  // ==========================================
  // LEVEL B2: CÔNG SỞ & ĐÀM PHÁN (5 TÌNH HUỐNG)
  // ==========================================
  {
    id: 'b2-1',
    level: 'B2',
    title: 'Phỏng Vấn Xin Việc: Xử Lý Điểm Yếu Khéo Léo',
    category: 'Công sở',
    icon: '💼',
    description: 'Trả lời câu hỏi hóc búa về điểm yếu lớn nhất và cách bạn đã vượt qua.',
    targetGoal: 'Biến điểm yếu thành cơ hội chứng minh khả năng tự hoàn thiện bản thân.',
    turns: [
      {
        id: 'b2-1-t1',
        speaker: 'AI',
        speakerName: 'Giám đốc nhân sự',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop',
        text: 'What would you say is your greatest professional weakness, and how have you worked to overcome it?',
        translation: 'Bạn nghĩ điểm yếu lớn nhất trong công việc của mình là gì, và bạn đã làm gì để khắc phục nó?',
        expectedKeywords: ['weakness', 'overcome']
      },
      {
        id: 'b2-1-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Trước đây tôi gặp khó khăn khi phân chia công việc vì muốn tự làm mọi thứ, nhưng gần đây tôi đã học cách tin tưởng đồng đội."',
        text: 'In the past, I struggled with delegation because I wanted to do everything myself. Recently, I have learned to empower my team and trust their strengths.',
        translation: 'Trước đây tôi gặp khó khăn trong việc phân quyền vì muốn tự làm mọi thứ. Gần đây, tôi đã học cách trao quyền cho đội ngũ và tin tưởng vào thế mạnh của họ.',
        expectedKeywords: ['delegation', 'myself', 'learned', 'team', 'trust'],
        nativeVariations: ["I used to micromanage, but now I focus on empowering colleagues.", "Delegating was tough for me initially."]
      }
    ]
  },
  {
    id: 'b2-2',
    level: 'B2',
    title: 'Báo Cáo Tiến Độ Dự Án & Xử Lý Tắc Nghẽn (Roadblock)',
    category: 'Công sở',
    icon: '📊',
    description: 'Giải thích lý do một tính năng bị chậm tiến độ và đưa ra phương án thay thế.',
    targetGoal: 'Báo cáo trung thực rủi ro và đề xuất giải pháp khả thi.',
    turns: [
      {
        id: 'b2-2-t1',
        speaker: 'AI',
        speakerName: 'Quản lý dự án cấp cao',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
        text: 'We are two days away from sprint review, but QA reported critical bugs in the payment flow. Can we still release on time?',
        translation: 'Còn 2 ngày nữa là đến buổi tổng kết sprint, nhưng QA báo có lỗi nghiêm trọng ở cổng thanh toán. Chúng ta có phát hành đúng hạn được không?',
        expectedKeywords: ['sprint', 'review', 'bugs', 'release']
      },
      {
        id: 'b2-2-t2',
        speaker: 'User',
        speakerName: 'Bạn (Trưởng nhóm kỹ thuật)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Để đảm bảo chất lượng, tôi đề xuất lùi đợt phát hành 2 ngày để đội ngũ vá lỗi triệt để thay vì vội vàng ra mắt."',
        text: 'To safeguard user experience, I recommend pushing back the deployment by forty-eight hours so our engineers can patch the root cause thoroughly.',
        translation: 'Để đảm bảo trải nghiệm người dùng, tôi đề xuất lùi đợt triển khai 48 giờ để các kỹ sư có thể xử lý triệt để nguyên nhân gốc rễ.',
        expectedKeywords: ['safeguard', 'recommend', 'pushing', 'deployment', 'patch', 'thoroughly'],
        nativeVariations: ["Better to delay two days than ship buggy code.", "I propose a 48-hour buffer to fix the core issue."]
      }
    ]
  },
  {
    id: 'b2-3',
    level: 'B2',
    title: 'Thương Lượng Mức Lương & Quyền Lợi (Salary Negotiation)',
    category: 'Công sở',
    icon: '💰',
    description: 'Đề xuất tăng 15% mức lương dựa trên giá trị chuyên môn bạn đem lại.',
    targetGoal: 'Thương lượng tự tin và chuyên nghiệp không gây phản cảm.',
    turns: [
      {
        id: 'b2-3-t1',
        speaker: 'AI',
        speakerName: 'Nhà tuyển dụng',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop',
        text: 'We are excited to extend an offer of fifty thousand dollars annually. What are your thoughts on this package?',
        translation: 'Chúng tôi rất hào hứng gửi đến bạn lời mời làm việc với mức lương 50.000 đô mỗi năm. Bạn nghĩ sao về chế độ này?',
        expectedKeywords: ['offer', 'thousand', 'package']
      },
      {
        id: 'b2-3-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Cảm ơn bạn. Dựa trên kinh nghiệm và mặt bằng thị trường, mức 58.000 đô sẽ phản ánh đúng hơn giá trị tôi có thể đóng góp."',
        text: 'Thank you for the offer. Based on my proven track record and current market benchmarks, sixty thousand would be closer to the value I can deliver.',
        translation: 'Cảm ơn lời mời của công ty. Dựa trên kinh nghiệm thực tế và mặt bằng thị trường hiện tại, mức 60.000 đô sẽ sát hơn với giá trị mà tôi có thể đóng góp.',
        expectedKeywords: ['thank', 'offer', 'track', 'record', 'market', 'benchmarks', 'value'],
        nativeVariations: ["Could we meet closer to 60K given my background?", "I was hoping for around 60K based on my experience."]
      }
    ]
  },
  {
    id: 'b2-4',
    level: 'B2',
    title: 'Từ Chối Yêu Cầu Tăng Thêm Khối Lượng Công Việc',
    category: 'Công sở',
    icon: '🛡️',
    description: 'Từ chối nhận thêm dự án mới một cách chuyên nghiệp vì lịch trình hiện tại đã kín.',
    targetGoal: 'Thiết lập ranh giới công việc rõ ràng và bảo vệ chất lượng dự án.',
    turns: [
      {
        id: 'b2-4-t1',
        speaker: 'AI',
        speakerName: 'Trưởng bộ phận',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop',
        text: 'We just signed a new client, and I need you to lead this onboarding campaign starting next Monday.',
        translation: 'Chúng ta vừa ký được khách hàng mới, và tôi cần bạn phụ trách chiến dịch này bắt đầu từ thứ 2 tới.',
        expectedKeywords: ['signed', 'client', 'lead', 'campaign']
      },
      {
        id: 'b2-4-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tôi rất muốn hỗ trợ, nhưng khối lượng công việc hiện tại của tôi đã tối đa công suất. Nếu nhận thêm, các deadline hiện tại có thể bị ảnh hưởng."',
        text: 'I would love to support, but my current bandwidth is already at full capacity. Taking this on might compromise the deliverables we committed for Q3.',
        translation: 'Tôi rất muốn hỗ trợ, nhưng khối lượng công việc hiện tại của tôi đã đạt tối đa công suất. Nhận thêm việc này có thể làm ảnh hưởng đến các cam kết trong quý 3.',
        expectedKeywords: ['support', 'bandwidth', 'capacity', 'compromise', 'deliverables', 'committed'],
        nativeVariations: ["My plate is full right now. Taking this might jeopardize our Q3 goals."]
      }
    ]
  },
  {
    id: 'b2-5',
    level: 'B2',
    title: 'Xoa Dịu & Giải Quyết Khiếu Nại Khách Hàng Giận Dữ',
    category: 'Công sở',
    icon: '🤝',
    description: 'Lắng nghe khách hàng bức xúc vì hệ thống sập và đưa ra cam kết đền bù.',
    targetGoal: 'Hạ nhiệt cơn giận của khách hàng và khôi phục niềm tin dịch vụ.',
    turns: [
      {
        id: 'b2-5-t1',
        speaker: 'AI',
        speakerName: 'Khách hàng giận dữ',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop',
        text: 'Your service went down for four hours during our peak flash sale! We lost thousands of dollars in revenue!',
        translation: 'Dịch vụ bên bạn sập 4 tiếng đúng đợt flash sale cao điểm của chúng tôi! Chúng tôi đã mất hàng nghìn đô doanh thu đấy!',
        expectedKeywords: ['down', 'hours', 'lost', 'revenue']
      },
      {
        id: 'b2-5-t2',
        speaker: 'User',
        speakerName: 'Bạn (Giám đốc CSKH)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tôi hoàn toàn hiểu sự bức xúc chính đáng của bạn. Chúng tôi chân thành xin lỗi và sẽ miễn phí phí dịch vụ tháng này kèm báo cáo chi tiết."',
        text: 'I completely understand your frustration and take full responsibility. We sincerely apologize, and we will waive your subscription fee this month alongside a post-mortem report.',
        translation: 'Tôi hoàn toàn thấu hiểu sự bức xúc chính đáng của bạn và xin nhận toàn bộ trách nhiệm. Chúng tôi chân thành xin lỗi, và sẽ miễn phí dịch vụ tháng này kèm một bản báo cáo phân tích sự cố chi tiết.',
        expectedKeywords: ['completely', 'understand', 'frustration', 'responsibility', 'apologize', 'waive', 'fee'],
        nativeVariations: ["You have every right to be upset. We're waiving this month's bill and investigating immediately."]
      }
    ]
  },

  // ==========================================
  // LEVEL C1: TRANH LUẬN SẮC BÉN (5 TÌNH HUỐNG)
  // ==========================================
  {
    id: 'c1-1',
    level: 'C1',
    title: 'Tranh Luận Chiến Lược: Ứng Dụng AI Vào Tự Động Hóa',
    category: 'Công sở',
    icon: '🧠',
    description: 'Bảo vệ luận điểm về việc tự động hóa bằng AI sẽ nâng cao năng suất hay đe dọa việc làm.',
    targetGoal: 'Phản biện sắc sảo, dùng từ vựng học thuật và liên kết lập luận đa chiều dưới 0.9s.',
    turns: [
      {
        id: 'c1-1-t1',
        speaker: 'AI',
        speakerName: 'Chuyên gia tư vấn chiến lược',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
        text: 'Some executives argue that aggressive AI automation will inevitably erode employee morale and lead to massive talent turnover. Do you agree?',
        translation: 'Một số lãnh đạo cho rằng tự động hóa AI ồ ạt sẽ làm suy giảm tinh thần nhân viên và gây chảy máu chất xám. Bạn có đồng tình không?',
        expectedKeywords: ['automation', 'morale', 'turnover']
      },
      {
        id: 'c1-1-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tôi không đồng ý. Thay vì thay thế con người, AI sẽ giải phóng nhân sự khỏi các tác vụ lặp đi lặp lại để tập trung vào đổi mới sáng tạo."',
        text: 'I respectfully disagree. Rather than replacing human capital, AI liberates professionals from repetitive drudgery, allowing them to channel their cognitive bandwidth into high-impact innovation.',
        translation: 'Tôi xin phép không đồng ý. Thay vì thay thế con người, AI giải phóng nhân sự khỏi các công việc lặp lại nhàm chán, cho phép họ dồn năng lực trí tuệ vào đổi mới sáng tạo mang lại giá trị cao.',
        expectedKeywords: ['disagree', 'replacing', 'liberates', 'repetitive', 'innovation'],
        nativeVariations: ["I take a different stance. AI augments human potential rather than displacing it.", "That is an oversimplification; automation catalyzes strategic value."]
      }
    ]
  },
  {
    id: 'c1-2',
    level: 'C1',
    title: 'Thương Thảo Hợp Đồng & Rủi Ro Pháp Lý Độc Quyền',
    category: 'Công sở',
    icon: '⚖️',
    description: 'Bảo vệ quyền lợi sở hữu trí tuệ và bác bỏ điều khoản độc quyền bất lợi.',
    targetGoal: 'Lập luận sắc bén bảo vệ quyền sở hữu trí tuệ.',
    turns: [
      {
        id: 'c1-2-t1',
        speaker: 'AI',
        speakerName: 'Luật sư đối tác',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop',
        text: 'Clause 8 demands an exclusive global license on all derivative intellectual property developed during this partnership. This is non-negotiable for our board.',
        translation: 'Điều khoản số 8 yêu cầu giấy phép độc quyền toàn cầu đối với mọi tài sản trí tuệ phái sinh phát triển trong quá trình hợp tác này. Đây là điều kiện tiên quyết của hội đồng quản trị chúng tôi.',
        expectedKeywords: ['clause', 'exclusive', 'intellectual', 'property', 'non-negotiable']
      },
      {
        id: 'c1-2-t2',
        speaker: 'User',
        speakerName: 'Bạn',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Yêu cầu độc quyền toàn bộ tài sản trí tuệ là phi thực tế và làm triệt tiêu động lực đổi mới. Chúng tôi đề xuất mô hình đồng sở hữu có giới hạn theo lãnh thổ."',
        text: 'Surrendering exclusive ownership over core IP creates an unacceptable asymmetrical risk. We propose a territory-specific co-ownership model that protects your commercial rights while preserving our proprietary framework.',
        translation: 'Việc từ bỏ quyền sở hữu độc quyền đối với tài sản trí tuệ cốt lõi tạo ra một rủi ro bất cân xứng không thể chấp nhận. Chúng tôi đề xuất mô hình đồng sở hữu theo từng khu vực lãnh thổ nhằm bảo vệ quyền thương mại của quý vị nhưng vẫn giữ vững quyền sở hữu công nghệ của chúng tôi.',
        expectedKeywords: ['exclusive', 'ownership', 'risk', 'propose', 'model', 'protects', 'rights'],
        nativeVariations: ["Outright exclusivity is a dealbreaker. Let's explore co-licensing by territory instead."]
      }
    ]
  },
  {
    id: 'c1-3',
    level: 'C1',
    title: 'Họp Khẩn Cấp: Xử Lý Khủng Hoảng Dữ Liệu Khách Hàng',
    category: 'Khẩn cấp',
    icon: '🚨',
    description: 'Chỉ đạo phản ứng truyền thông khi phát hiện lỗ hổng rò rỉ dữ liệu người dùng.',
    targetGoal: 'Đưa ra chiến lược minh bạch hóa thông tin và trấn an khách hàng.',
    turns: [
      {
        id: 'c1-3-t1',
        speaker: 'AI',
        speakerName: 'Giám đốc an ninh mạng',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
        text: 'Our security team contained the data breach, but user emails were compromised. Should we delay public disclosure until legal finishes their assessment?',
        translation: 'Đội bảo mật đã cô lập được vụ rò rỉ dữ liệu, nhưng một số email người dùng đã bị lộ. Chúng ta có nên trì hoãn công bố cho đến khi bộ phận pháp lý đánh giá xong không?',
        expectedKeywords: ['breach', 'compromised', 'delay', 'disclosure']
      },
      {
        id: 'c1-3-t2',
        speaker: 'User',
        speakerName: 'Bạn (CEO)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Tuyệt đối không giấu giếm. Che giấu chỉ hủy hoại niềm tin. Hãy công bố minh bạch ngay trong hôm nay kèm các biện pháp bảo vệ tài khoản cho người dùng."',
        text: 'Transparency is non-negotiable. Concealing this will irrevocably damage our brand equity. We must issue a proactive statement today outlining the incident and providing free identity protection services.',
        translation: 'Minh bạch là nguyên tắc không thể thỏa hiệp. Việc che giấu chỉ làm hủy hoại uy tín thương hiệu vĩnh viễn. Chúng ta phải đưa ra tuyên bố chủ động ngay hôm nay, nêu rõ sự cố và cung cấp dịch vụ bảo vệ danh tính miễn phí cho khách hàng.',
        expectedKeywords: ['transparency', 'damage', 'brand', 'proactive', 'statement', 'incident'],
        nativeVariations: ["Cover-ups kill companies. We go public immediately with full transparency."]
      }
    ]
  },
  {
    id: 'c1-4',
    level: 'C1',
    title: 'Thuyết Phục Nhà Đầu Tư Thiên Thần (Investor Pitching)',
    category: 'Công sở',
    icon: '🚀',
    description: 'Thuyết phục quỹ đầu tư mạo hiểm về lợi thế hào phòng thủ (Moat) của công ty.',
    targetGoal: 'Giải thích rào cản cạnh tranh độc quyền trong 30 giây.',
    turns: [
      {
        id: 'c1-4-t1',
        speaker: 'AI',
        speakerName: 'Nhà đầu tư mạo hiểm mạo hiểm',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
        text: 'Your unit economics look promising, but what stops Big Tech from copying your business model within three months?',
        translation: 'Chỉ số kinh tế đơn vị của bạn trông rất hứa hẹn, nhưng điều gì ngăn cản các ông lớn công nghệ sao chép mô hình của bạn chỉ trong 3 tháng?',
        expectedKeywords: ['promising', 'copying', 'model']
      },
      {
        id: 'c1-4-t2',
        speaker: 'User',
        speakerName: 'Bạn (Nhà sáng lập)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Hào phòng thủ của chúng tôi là hiệu ứng mạng lưới dữ liệu độc quyền và chi phí chuyển đổi cao của khách hàng doanh nghiệp."',
        text: 'Our defensibility lies in proprietary closed-loop datasets and compounding network effects that create formidable switching costs for enterprise clients.',
        translation: 'Lợi thế phòng thủ của chúng tôi nằm ở tập dữ liệu vòng lặp khép kín độc quyền và hiệu ứng mạng lưới cộng dồn, tạo ra chi phí chuyển đổi cực kỳ lớn cho các khách hàng doanh nghiệp.',
        expectedKeywords: ['defensibility', 'proprietary', 'network', 'effects', 'switching', 'costs', 'enterprise'],
        nativeVariations: ["Our moat is proprietary data and deep workflow integration that tech giants can't replicate."]
      }
    ]
  },
  {
    id: 'c1-5',
    level: 'C1',
    title: 'Phản Biện Về Tính Bền Vững & Tẩy Xanh (Greenwashing)',
    category: 'Xã giao',
    icon: '🌱',
    description: 'Chỉ ra sự khác biệt giữa các cam kết ESG hình thức và tác động môi trường thực tế.',
    targetGoal: 'Dùng luận điểm sắc sảo chỉ trích các chiến dịch tiếp thị xanh sáo rỗng.',
    turns: [
      {
        id: 'c1-5-t1',
        speaker: 'AI',
        speakerName: 'Giám đốc tiếp thị nhãn hàng',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop',
        text: 'Our carbon-offset marketing campaign generated unprecedented brand awareness. Why are sustainability activists still criticizing our roadmap?',
        translation: 'Chiến dịch tiếp thị bù trừ carbon của chúng tôi đã tạo ra độ nhận diện thương hiệu chưa từng có. Tại sao các nhà hoạt động môi trường vẫn chỉ trích lộ trình của chúng tôi?',
        expectedKeywords: ['campaign', 'awareness', 'sustainability', 'criticizing']
      },
      {
        id: 'c1-5-t2',
        speaker: 'User',
        speakerName: 'Bạn (Chuyên gia ESG)',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        hintPrompt: 'Nói: "Bởi vì mua chứng chỉ carbon chỉ là giải pháp che đậy. Nếu không cắt giảm khí thải trực tiếp trong chuỗi cung ứng, đó chỉ là tẩy xanh."',
        text: 'Because purchasing carbon credits merely masks structural emissions without decoupling resource consumption. Without decarbonizing your primary supply chain, consumers perceive this as superficial greenwashing.',
        translation: 'Bởi vì việc mua tín chỉ carbon đơn thuần chỉ che đậy lượng khí thải cơ cấu mà không thực sự tách rời tiêu hao tài nguyên. Nếu không khử carbon trực tiếp trong chuỗi cung ứng chính, người tiêu dùng sẽ coi đây chỉ là hành vi tẩy xanh bề mặt.',
        expectedKeywords: ['carbon', 'credits', 'emissions', 'decarbonizing', 'supply', 'chain', 'greenwashing'],
        nativeVariations: ["Offsetting without actual supply chain reduction is textbook greenwashing."]
      }
    ]
  }
];
