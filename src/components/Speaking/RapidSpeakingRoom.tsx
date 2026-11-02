import React, { useState, useEffect, useRef } from 'react';
import { 
  SpeakingScenario, 
  CEFRLevel, 
  CEFR_LEVEL_SPECS 
} from '../../data/speakingScenarios';
import { 
  ArrowLeft, 
  Plus, 
  X,
  MessageSquare,
  Zap,
  Mic,
  Activity,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakWord } from '../../services/dictionaryService';
import { GuidedSpeakingCard, ReflexScaffoldingStep } from './GuidedSpeakingCard';
import { RoleplayChatRoom, RoleplayPersona, ChatMessage } from './RoleplayChatRoom';
import { VoiceActivityDetector } from '../../utils/voiceActivityDetector';
import { assessSpeech, DetailedSpeechAssessment } from '../../utils/speechAssessor';
import { soundEffects } from '../../utils/audioFeedback';

interface RapidSpeakingRoomProps {
  scenarios: SpeakingScenario[];
  onBack: () => void;
  onAddCustomScenario: (scenario: SpeakingScenario) => void;
}

const AI_PERSONAS: RoleplayPersona[] = [
  {
    id: 'cafe-barista',
    name: 'Emma',
    role: 'Barista tại New York',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    situation: 'Bạn bước vào quán cà phê đông đúc giữa trung tâm Manhattan.',
    mission: 'Gọi 1 ly latte đá sữa yến mạch, yêu cầu giảm ngọt 50% và hỏi pass Wifi.',
    initialMessage: 'Hey there! Welcome to Central Roast. What can I brew up for you today?',
    initialTranslation: 'Chào bạn! Chào mừng đến với Central Roast. Hôm nay tôi có thể pha gì cho bạn?'
  },
  {
    id: 'airport-officer',
    name: 'Officer David',
    role: 'Sĩ quan hải quan London',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    situation: 'Bạn vừa hạ cánh xuống London và đang làm thủ tục nhập cảnh.',
    mission: 'Trình hộ chiếu, nêu rõ mục đích du lịch 10 ngày và khách sạn bạn sẽ ở.',
    initialMessage: 'Good morning. Passport and landing card please. What is the purpose of your visit to the UK?',
    initialTranslation: 'Chào buổi sáng. Xin vui lòng xuất trình hộ chiếu và thẻ nhập cảnh. Mục đích chuyến đi của bạn là gì?'
  },
  {
    id: 'hotel-reception',
    name: 'Alex',
    role: 'Lễ tân khách sạn Paris',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop',
    situation: 'Bạn muốn trả phòng nhưng hóa đơn xuất hiện khoản phụ thu vô lý.',
    mission: 'Khiếu nại tiền minibar bạn không hề dùng và yêu cầu gửi hành lý đến chiều.',
    initialMessage: 'Bonjour! Are you checking out of room 402 today? How was your overall stay with us?',
    initialTranslation: 'Xin chào! Bạn muốn trả phòng 402 hôm nay đúng không? Kỳ nghỉ của bạn thế nào?'
  },
  {
    id: 'tech-interviewer',
    name: 'Sarah',
    role: 'Tech Lead tại Google',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop',
    situation: 'Bạn tham gia vòng phỏng vấn kỹ thuật và văn hóa doanh nghiệp.',
    mission: 'Giới thiệu ngắn gọn kinh nghiệm và giải thích cách bạn xử lý khi dự án trễ hạn.',
    initialMessage: 'Hi! Thanks for joining today. Could you walk me through a challenging project you recently solved?',
    initialTranslation: 'Chào bạn! Cảm ơn bạn đã tham gia hôm nay. Bạn có thể chia sẻ về một dự án nhiều thách thức bạn từng giải quyết?'
  }
];

const CATEGORIES = ['Tất cả', 'Ăn uống', 'Mua sắm', 'Du lịch', 'Công sở', 'Xã giao', 'Khẩn cấp'];

export const RapidSpeakingRoom: React.FC<RapidSpeakingRoomProps> = ({
  scenarios,
  onBack,
  onAddCustomScenario
}) => {
  const [activeTab, setActiveTab] = useState<'guided' | 'roleplay'>('guided');
  
  // Guided Mode States
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('A1');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  
  const levelScenarios = scenarios.filter((s) => {
    const matchLevel = s.level === selectedLevel;
    const matchCategory = selectedCategory === 'Tất cả' || s.category === selectedCategory;
    return matchLevel && matchCategory;
  });

  const [selectedScenario, setSelectedScenario] = useState<SpeakingScenario>(
    levelScenarios[0] || scenarios[0] || {
      id: 'default',
      level: 'A1',
      title: 'Tập nói cơ bản',
      category: 'Xã giao',
      description: 'Bài học cơ bản',
      icon: '💬',
      targetGoal: 'Phản xạ câu cơ bản',
      turns: []
    }
  );
  
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [spokenText, setSpokenText] = useState<string>('');
  const [score, setScore] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [turnStartTime, setTurnStartTime] = useState<number>(Date.now());
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [customTopic, setCustomTopic] = useState<string>('');
  const [isScenarioComplete, setIsScenarioComplete] = useState<boolean>(false);

  // SuperChinese & ELSA REA Upgraded States
  const [isVadEnabled, setIsVadEnabled] = useState<boolean>(false);
  const [audioEnergy, setAudioEnergy] = useState<number>(0);
  const [detailedAssessment, setDetailedAssessment] = useState<DetailedSpeechAssessment | null>(null);
  const [scaffoldingStep, setScaffoldingStep] = useState<ReflexScaffoldingStep>(1);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  // Roleplay Mode States
  const [selectedPersona, setSelectedPersona] = useState<RoleplayPersona>(AI_PERSONAS[0] || {
    id: 'default',
    name: 'AI Tutor',
    role: 'Gia sư tiếng Anh',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    situation: 'Trò chuyện tự do',
    mission: 'Thực hành hội thoại',
    initialMessage: 'Hello! How can I help you today?',
    initialTranslation: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?'
  });
  const [roleplayMessages, setRoleplayMessages] = useState<ChatMessage[]>([]);
  const [roleplayInput, setRoleplayInput] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [roleplayStartTime, setRoleplayStartTime] = useState<number>(Date.now());

  // Refs for Web Speech & Web Audio VAD
  const recognitionRef = useRef<any>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentTurn = selectedScenario.turns[currentTurnIndex] || selectedScenario.turns[0];

  // Initialize Roleplay with initial message
  useEffect(() => {
    if (activeTab === 'roleplay') {
      setRoleplayMessages([
        {
          id: 'init-1',
          sender: 'AI',
          text: selectedPersona.initialMessage,
          translation: selectedPersona.initialTranslation
        }
      ]);
      setRoleplayStartTime(Date.now());
      speakWord(selectedPersona.initialMessage, 'en', 0.95);
    }
  }, [activeTab, selectedPersona]);

  // Update selectedScenario if level or category changes and current selection is invalid
  useEffect(() => {
    if (levelScenarios.length > 0 && !levelScenarios.some(s => s.id === selectedScenario.id)) {
      const first = levelScenarios[0];
      if (first) {
        setSelectedScenario(first);
        setCurrentTurnIndex(0);
        setIsScenarioComplete(false);
      }
    }
  }, [selectedLevel, selectedCategory, levelScenarios, selectedScenario.id]);

  // Reset turn clock on turn index change
  useEffect(() => {
    setTurnStartTime(Date.now());
    setSpokenText('');
    setScore(null);
    setDetailedAssessment(null);
    setLatencyMs(null);

    // If turn is AI, speak it out automatically
    if (currentTurn && currentTurn.speaker === 'AI') {
      speakWord(currentTurn.text, 'en', 0.95);
    } else if (currentTurn && currentTurn.speaker === 'User') {
      // Start 3.0s countdown if in Scaffolding Step 2 or 3 (SuperChinese REA)
      if (scaffoldingStep >= 2) {
        setCountdownSeconds(3);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = setInterval(() => {
          setCountdownSeconds((prev) => {
            if (prev === null || prev <= 1) {
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setCountdownSeconds(null);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [currentTurnIndex, selectedScenario, scaffoldingStep]);

  // Production-grade Speech Evaluation using ELSA REA Engine
  const evaluateSpeech = (spoken: string) => {
    if (!currentTurn) return;

    const elapsed = Date.now() - turnStartTime;
    setLatencyMs(elapsed);

    // Run ELSA 3-tier phonetic assessment
    const assessment = assessSpeech(currentTurn.text, spoken, elapsed);
    setDetailedAssessment(assessment);
    setScore(assessment.overallScore);

    // Immediate sound effect & confetti based on 3-tier threshold (BR-07)
    if (assessment.overallScore >= 85) {
      soundEffects.playSuccess();
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
    } else if (assessment.overallScore >= 65) {
      soundEffects.playAlmost();
    } else {
      soundEffects.playTryAgain();
    }
  };

  // Web Speech API Initialization
  useEffect(() => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0]?.transcript ?? '')
          .join('');
        
        if (activeTab === 'guided') {
          setSpokenText(transcript);
          const isFinal = Boolean(event.results[0]?.isFinal);
          if (isFinal) {
            evaluateSpeech(transcript);
            setIsRecording(false);
            if (vadRef.current) vadRef.current.resumeListening();
          }
        } else {
          setRoleplayInput(transcript);
          const isFinal = Boolean(event.results[0]?.isFinal);
          if (isFinal) {
            setIsRecording(false);
          }
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        if (vadRef.current) vadRef.current.resumeListening();
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Safe ignore
        }
      }
    };
  }, [currentTurn, activeTab, turnStartTime]);

  // SuperChinese Hands-free VAD Engine Lifecycle
  useEffect(() => {
    if (isVadEnabled && activeTab === 'guided') {
      const vad = new VoiceActivityDetector({
        speechStartThreshold: 0.032,
        silenceTimeoutMs: 850,
        minSpeechDurationMs: 400,
        onVolumeChange: (rms) => {
          setAudioEnergy(rms);
        },
        onSpeechStart: () => {
          if (!isRecording && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              setIsRecording(true);
            } catch {
              // Safe ignore if already active
            }
          }
        },
        onSpeechEnd: () => {
          if (recognitionRef.current && isRecording) {
            try {
              recognitionRef.current.stop();
            } catch {
              // Safe ignore
            }
          }
        },
        onError: (err) => {
          console.warn('VAD Error:', err);
          setIsVadEnabled(false);
        }
      });

      vad.start().catch(() => {
        setIsVadEnabled(false);
      });

      vadRef.current = vad;

      return () => {
        vad.destroy();
        vadRef.current = null;
      };
    } else {
      if (vadRef.current) {
        vadRef.current.destroy();
        vadRef.current = null;
      }
      setAudioEnergy(0);
    }
  }, [isVadEnabled, activeTab]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Trình duyệt chưa hỗ trợ Web Speech API. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setSpokenText('');
      setScore(null);
      setDetailedAssessment(null);
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.warn(e);
        setIsRecording(false);
      }
    }
  };

  // Next guided turn
  const handleNextTurn = () => {
    if (currentTurnIndex < selectedScenario.turns.length - 1) {
      setCurrentTurnIndex(prev => prev + 1);
    } else {
      confetti({ particleCount: 100, spread: 80 });
      setIsScenarioComplete(true);
    }
  };

  // Roleplay send message
  const handleSendRoleplay = () => {
    if (!roleplayInput.trim() || isAiThinking) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'User',
      text: roleplayInput.trim(),
      latencyMs: Date.now() - roleplayStartTime,
      nativeRephrase: generateNativeRephrase(roleplayInput.trim())
    };

    setRoleplayMessages(prev => [...prev, userMsg]);
    setRoleplayInput('');
    setIsAiThinking(true);

    setTimeout(() => {
      const aiReplyText = getRealisticAiReply(selectedPersona.id, userMsg.text);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'AI',
        text: aiReplyText,
      };

      setRoleplayMessages(prev => [...prev, aiMsg]);
      setIsAiThinking(false);
      speakWord(aiReplyText, 'en', 0.95);
    }, 700);
  };

  const generateNativeRephrase = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('i want to have') || lower.includes('i want')) {
      return text.replace(/i want to have|i want/gi, 'Could I please get');
    }
    if (lower.includes('how much money') || lower.includes('how much is it')) {
      return "What's the damage on this? / How much does that come out to?";
    }
    if (lower.includes('give me')) {
      return text.replace(/give me/gi, 'May I have');
    }
    return `In natural conversation, you can say: "${text}, please."`;
  };

  const getRealisticAiReply = (personaId: string, userInput: string): string => {
    const input = userInput.toLowerCase();
    if (personaId === 'cafe-barista') {
      if (input.includes('latte') || input.includes('coffee')) {
        return "Coming right up! That will be an iced oat latte, half-sweet. Anything from our fresh bakery today?";
      }
      if (input.includes('wifi') || input.includes('password')) {
        return "The Wifi network is 'CentralRoast_Guest' and the password is on the bottom of your receipt: 'coffeelover2026'.";
      }
      return "Sure thing! That comes to $5.50. Will you be paying with card or cash today?";
    }
    if (personaId === 'airport-officer') {
      if (input.includes('hotel') || input.includes('stay') || input.includes('vacation') || input.includes('holiday')) {
        return "Very good. How long do you plan to remain in the United Kingdom, and do you have a return ticket?";
      }
      return "Thank you. Welcome to the UK! Please collect your luggage at carousel number four. Have a pleasant stay.";
    }
    return "Understood! I'll take care of that right away for you. Is there anything else you need assistance with?";
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in pb-16 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
          </button>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-orange-500 fill-orange-500" />
            Luyện Phản Xạ Nói & AI Roleplay
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Tích hợp công nghệ VAD SuperChinese và bản đồ nhiệt âm thanh 3 cấp độ ELSA Speak
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1.5 rounded-2xl bg-slate-200/80 gap-1 sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('guided')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'guided'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Lộ trình phản xạ CEFR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roleplay')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'roleplay'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Roleplay Chat</span>
          </button>
        </div>
      </div>

      {/* MODE 1: GUIDED CEFR LEVEL ROADMAP */}
      {activeTab === 'guided' && (
        <div className="space-y-6 animate-fade-in">
          {/* Hands-free VAD & Reflex Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-teal-500 text-white shadow-xs">
                <Activity className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-black text-slate-900">
                  Tự động phát hiện giọng nói (SuperChinese Hands-free VAD)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Tự động nhận diện khi bạn bắt đầu nói và dừng khi im lặng 850ms, không cần chạm nút Mic.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsVadEnabled(!isVadEnabled)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                isVadEnabled
                  ? 'bg-emerald-600 text-white shadow-[0_3px_0_#065f46] animate-pulse'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>{isVadEnabled ? '🟢 VAD Đang Bật (Nói tự do)' : 'Bật Hands-free VAD'}</span>
            </button>
          </div>

          {/* Level Selector (A1 -> C1) */}
          <div className="p-3 rounded-3xl bg-white border border-slate-200/80 shadow-sm space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['A1', 'A2', 'B1', 'B2', 'C1'] as CEFRLevel[]).map((lvl) => {
                const spec = CEFR_LEVEL_SPECS[lvl];
                const isCurrent = selectedLevel === lvl;
                const count = scenarios.filter((s) => s.level === lvl).length;

                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => {
                      setSelectedLevel(lvl);
                      setCurrentTurnIndex(0);
                      setIsScenarioComplete(false);
                    }}
                    className={`p-3 rounded-2xl text-left transition-all duration-200 relative ${
                      isCurrent
                        ? 'bg-teal-600 text-white shadow-md scale-[1.02]'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                        isCurrent ? 'bg-white/20 text-white' : 'bg-white text-slate-800 shadow-xs'
                      }`}>
                        {lvl}
                      </span>
                      <span className={`text-[10px] font-bold ${isCurrent ? 'text-teal-200' : 'text-slate-400'}`}>
                        {count} bài
                      </span>
                    </div>
                    <h4 className="text-xs font-black truncate">{spec.name}</h4>
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${
                      isCurrent ? 'text-amber-300' : 'text-slate-500'
                    }`}>
                      Mục tiêu: {spec.targetLatency}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Category Filter Bar */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 no-scrollbar">
              <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Chủ đề:</span>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold shrink-0 transition-all ${
                    selectedCategory === cat
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Scenario Carousel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>{levelScenarios.length} tình huống thực chiến:</span>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(true)}
                className="text-orange-600 hover:text-orange-700 flex items-center gap-1 font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Tạo tình huống mới
              </button>
            </div>

            {levelScenarios.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-3xl border border-slate-200 text-xs text-slate-500 space-y-2">
                <p className="font-bold text-slate-700">Chưa có tình huống nào thuộc chủ đề "{selectedCategory}" ở trình độ {selectedLevel}</p>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('Tất cả')}
                  className="px-4 py-1.5 rounded-full bg-teal-50 text-teal-700 font-extrabold hover:bg-teal-100 transition-colors inline-block"
                >
                  Xem tất cả tình huống của trình độ {selectedLevel} ➔
                </button>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {levelScenarios.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setSelectedScenario(sc);
                      setCurrentTurnIndex(0);
                      setIsScenarioComplete(false);
                    }}
                    className={`p-3.5 rounded-3xl border text-left shrink-0 w-64 transition-all duration-200 ${
                      selectedScenario?.id === sc.id
                        ? 'bg-teal-50/90 border-teal-500 shadow-sm ring-2 ring-teal-400/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xl">{sc.icon}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                        {sc.category}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 line-clamp-1">{sc.title}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">{sc.targetGoal}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Guided Speaking Card with ELSA Heatmap, Word Drill, & SuperChinese Scaffolding */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-8 shadow-sm">
            <GuidedSpeakingCard
              currentTurn={currentTurn}
              currentTurnIndex={currentTurnIndex}
              totalTurns={selectedScenario?.turns?.length || 0}
              selectedLevel={selectedLevel}
              score={score}
              latencyMs={latencyMs}
              isRecording={isRecording}
              spokenText={spokenText}
              isScenarioComplete={isScenarioComplete}
              detailedAssessment={detailedAssessment}
              scaffoldingStep={scaffoldingStep}
              handsFreeVadActive={isVadEnabled}
              audioEnergy={audioEnergy}
              countdownSeconds={countdownSeconds}
              onScaffoldingStepChange={(step) => setScaffoldingStep(step)}
              onToggleRecording={toggleRecording}
              onNextTurn={handleNextTurn}
              onRestartScenario={() => {
                setIsScenarioComplete(false);
                setCurrentTurnIndex(0);
              }}
              onNextScenario={() => {
                setIsScenarioComplete(false);
                setCurrentTurnIndex(0);
                if (levelScenarios.length > 0) {
                  const currentIndexInList = levelScenarios.findIndex(s => s.id === selectedScenario?.id);
                  const nextSc = levelScenarios[(currentIndexInList + 1) % levelScenarios.length];
                  if (nextSc) setSelectedScenario(nextSc);
                }
              }}
              onSpeakText={(t) => speakWord(t, 'en', 0.95)}
            />
          </div>
        </div>
      )}

      {/* MODE 2: ROLEPLAY CHAT */}
      {activeTab === 'roleplay' && (
        <RoleplayChatRoom
          personas={AI_PERSONAS}
          selectedPersona={selectedPersona}
          onSelectPersona={(p) => setSelectedPersona(p)}
          messages={roleplayMessages}
          inputMessage={roleplayInput}
          onChangeInput={setRoleplayInput}
          onSendMessage={handleSendRoleplay}
          isAiThinking={isAiThinking}
          isRecording={isRecording}
          onToggleRecording={toggleRecording}
          onRestartChat={() => {
            setRoleplayMessages([
              {
                id: `init-${Date.now()}`,
                sender: 'AI',
                text: selectedPersona.initialMessage,
                translation: selectedPersona.initialTranslation
              }
            ]);
            speakWord(selectedPersona.initialMessage, 'en', 0.95);
          }}
          onSpeakText={(t) => speakWord(t, 'en', 0.95)}
        />
      )}

      {/* Custom Scenario Modal */}
      {isCustomModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsCustomModalOpen(false)}
        >
          <div 
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-800">Tạo tình huống phản xạ mới</h3>
              <button 
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Chủ đề tình huống:</label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Ví dụ: Đổi trả hàng tại siêu thị, Hỏi đường đi ga tàu..."
                  className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:border-teal-500 outline-none"
                />
              </div>

              <button
                type="button"
                disabled={!customTopic.trim()}
                onClick={() => {
                  const newSc: SpeakingScenario = {
                    id: `custom-${Date.now()}`,
                    level: selectedLevel,
                    title: customTopic.trim(),
                    category: 'Xã giao',
                    description: `Tình huống luyện tập tự tạo: ${customTopic}`,
                    icon: '🎯',
                    targetGoal: `Hoàn thành cuộc trò chuyện về ${customTopic}`,
                    turns: [
                      {
                        id: 'c-1',
                        speaker: 'AI',
                        speakerName: 'Alex',
                        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
                        text: `Hello! I see you want to discuss about ${customTopic}. How can I assist you with that?`,
                        translation: `Xin chào! Tôi thấy bạn muốn trao đổi về ${customTopic}. Tôi có thể giúp gì cho bạn?`,
                        expectedKeywords: ['assist', 'help', 'discuss']
                      },
                      {
                        id: 'c-2',
                        speaker: 'User',
                        speakerName: 'Bạn',
                        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
                        text: `I would like to explain my situation regarding ${customTopic}.`,
                        translation: `Tôi muốn trình bày tình huống của mình về ${customTopic}.`,
                        hintPrompt: `Nói rằng bạn muốn trình bày về ${customTopic}`,
                        expectedKeywords: ['would', 'like', 'explain']
                      }
                    ]
                  };
                  onAddCustomScenario(newSc);
                  setSelectedScenario(newSc);
                  setCurrentTurnIndex(0);
                  setIsCustomModalOpen(false);
                  setCustomTopic('');
                }}
                className="w-full py-3.5 rounded-2xl btn-3d btn-3d-teal font-black text-sm disabled:opacity-50"
              >
                Tạo và bắt đầu luyện ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
