import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  SpeakingScenario,
  CEFRLevel,
  CEFR_LEVEL_SPECS
} from '../../data/speakingScenarios';
import {
  Plus,
  X,
  MessageSquare,
  Zap,
  Mic,
  Sparkles,
  Loader2,
  PenTool,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  VolumeX
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakWord } from '../../services/dictionaryService';
import { authService } from '../../services/authService';
import { ScopedStorage, PersistedRoleplayMessage } from '../../services/scopedStorage';
import {
  ActivePracticeMission,
  AuthUser,
  ChatDisplayMode,
  CorrectionMode,
  RoleplayFeedbackReport,
  SavedWord
} from '../../types';
import { useNotify } from '../Common/ToastProvider';
import { ModalPortal } from '../Common/ModalPortal';
import { GuidedSpeakingCard, ReflexScaffoldingStep } from './GuidedSpeakingCard';
import { RoleplayChatRoom, RoleplayPersona, ChatMessage } from './RoleplayChatRoom';
import { RoleplayFeedbackModal } from './RoleplayFeedbackModal';
import { WritingCoachPanel } from './WritingCoachPanel';
import { detectUsedMissionWords } from '../../utils/curriculumEngine';
import { buildMissionRoleplayPersona } from '../../utils/missionRoleplayBuilder';
import { VoiceActivityDetector } from '../../utils/voiceActivityDetector';
import { assessSpeech, DetailedSpeechAssessment } from '../../utils/speechAssessor';
import { soundEffects } from '../../utils/audioFeedback';
import {
  computeSpeechReactionLatencyMs,
  mergeScenarioCompletion,
  ScenarioCompletionRecord
} from '../../utils/speakingMetrics';

interface SpeechRecognitionResultItem {
  readonly isFinal?: boolean;
  readonly 0?: { readonly transcript?: string };
}

interface SpeechRecognitionEventLike {
  readonly results: ArrayLike<SpeechRecognitionResultItem>;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onspeechstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface RapidSpeakingRoomProps {
  scenarios: SpeakingScenario[];
  onBack: () => void;
  onAddCustomScenario: (scenario: SpeakingScenario) => void;
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onRoleplayHistoryChange?: (history: Record<string, PersistedRoleplayMessage[]>) => void;
  completedScenarios?: Record<string, ScenarioCompletionRecord>;
  onCompletedScenariosChange?: (records: Record<string, ScenarioCompletionRecord>) => void;
  onSavePhraseToSrs?: (phrase: string, contextSentence: string, tip?: string) => void;
  onWordClick?: (word: string, contextSentence: string) => void;
  activeMission?: ActivePracticeMission | null;
  onClearMission?: () => void;
  savedWords?: SavedWord[];
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
  onBack: _onBack,
  onAddCustomScenario,
  currentUser,
  onOpenAuth,
  onRoleplayHistoryChange,
  completedScenarios: completedScenariosProp,
  onCompletedScenariosChange,
  onSavePhraseToSrs,
  onWordClick,
  activeMission,
  onClearMission,
  savedWords = []
}) => {
  const { toast } = useNotify();
  const [activeTab, setActiveTab] = useState<'guided' | 'roleplay' | 'writing'>(() =>
    activeMission ? (activeMission.mode === 'writing' ? 'writing' : 'roleplay') : 'guided'
  );

  useEffect(() => {
    if (!activeMission) return;
    setActiveTab(activeMission.mode === 'writing' ? 'writing' : 'roleplay');
  }, [activeMission]);

  // Guided Mode States (Compact Focus Layout)
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('A1');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [showScenarioDrawer, setShowScenarioDrawer] = useState<boolean>(false);

  const levelScenarios = useMemo(
    () =>
      scenarios.filter((s) => {
        const matchLevel = s.level === selectedLevel;
        const matchCategory = selectedCategory === 'Tất cả' || s.category === selectedCategory;
        return matchLevel && matchCategory;
      }),
    [scenarios, selectedLevel, selectedCategory]
  );

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
  const [customLevel, setCustomLevel] = useState<CEFRLevel>('B1');
  const [isGeneratingScenario, setIsGeneratingScenario] = useState<boolean>(false);
  const [isScenarioComplete, setIsScenarioComplete] = useState<boolean>(false);

  // Hands-free VAD + Langua Noisy Mode + WakeLock States
  const [isVadEnabled, setIsVadEnabled] = useState<boolean>(false);
  const [noisyMode, setNoisyMode] = useState<boolean>(false);
  const [audioEnergy, setAudioEnergy] = useState<number>(0);
  const [detailedAssessment, setDetailedAssessment] = useState<DetailedSpeechAssessment | null>(null);
  const [scaffoldingStep, setScaffoldingStep] = useState<ReflexScaffoldingStep>(1);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);

  // Roleplay Mode States (Langua + Fluently Architecture)
  const missionPersona = useMemo(
    () => (activeMission ? buildMissionRoleplayPersona(activeMission) : null),
    [activeMission]
  );

  const [customPersonas, setCustomPersonas] = useState<RoleplayPersona[]>(() =>
    ScopedStorage.getCustomRoleplayPersonas(currentUser?.id)
  );
  const allPersonas = useMemo(
    () => (missionPersona ? [missionPersona, ...customPersonas, ...AI_PERSONAS] : [...customPersonas, ...AI_PERSONAS]),
    [missionPersona, customPersonas]
  );

  useEffect(() => {
    setCustomPersonas(ScopedStorage.getCustomRoleplayPersonas(currentUser?.id));
  }, [currentUser?.id]);

  const [selectedPersona, setSelectedPersona] = useState<RoleplayPersona>(() =>
    missionPersona || AI_PERSONAS[0] || {
      id: 'default',
      name: 'AI Tutor',
      role: 'Gia sư tiếng Anh',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      situation: 'Trò chuyện tự do',
      mission: 'Thực hành hội thoại',
      initialMessage: 'Hello! How can I help you today?',
      initialTranslation: 'Xin chào! Tôi có thể giúp gì cho bạn hôm nay?'
    }
  );

  // Auto-switch to the dedicated mission persona whenever a Roadmap Speaking Mission launches
  useEffect(() => {
    if (activeMission?.mode === 'roleplay' && missionPersona) {
      setSelectedPersona(missionPersona);
    }
  }, [activeMission?.id, activeMission?.mode, missionPersona]);
  const [roleplayMessages, setRoleplayMessages] = useState<ChatMessage[]>([]);
  const [roleplayInput, setRoleplayInput] = useState<string>('');
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [roleplayStartTime, setRoleplayStartTime] = useState<number>(Date.now());
  const [aiEngineLabel, setAiEngineLabel] = useState<string>('Live AI Roleplay');
  const [quotaBadge, setQuotaBadge] = useState<string | undefined>(undefined);
  const [autoSendVoice, setAutoSendVoice] = useState<boolean>(true);
  const [correctionMode, setCorrectionMode] = useState<CorrectionMode>('written');
  const [displayMode, setDisplayMode] = useState<ChatDisplayMode>('text_audio');
  const [missionProgressMap, setMissionProgressMap] = useState<Record<string, { progress: number; completed: boolean }>>({});
  const [localCompletedScenarios, setLocalCompletedScenarios] = useState<Record<string, ScenarioCompletionRecord>>(() =>
    ScopedStorage.getCompletedScenarios(currentUser?.id)
  );
  const completedScenarios = completedScenariosProp ?? localCompletedScenarios;

  // Post-Chat Feedback Report Modal States (Langua)
  const [feedbackModalOpen, setFeedbackModalOpen] = useState<boolean>(false);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState<boolean>(false);
  const [feedbackReport, setFeedbackReport] = useState<RoleplayFeedbackReport | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Refs for Web Speech, VAD acoustic-echo guard, WakeLock & Safari iOS onend fallback
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const isAiSpeakingRef = useRef<boolean>(false);
  const speechStartMsRef = useRef<number | null>(null);
  const latestTranscriptRef = useRef<string>('');
  const hasFinalizedRecRef = useRef<boolean>(false);
  const turnScoresRef = useRef<number[]>([]);
  const turnLatenciesRef = useRef<number[]>([]);
  const autoSendVoiceRef = useRef<boolean>(autoSendVoice);
  const sendRoleplayTextRef = useRef<(text: string) => void>(() => {});

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    autoSendVoiceRef.current = autoSendVoice;
  }, [autoSendVoice]);

  useEffect(() => {
    if (vadRef.current) {
      vadRef.current.setNoisyEnvironment(noisyMode);
    }
  }, [noisyMode]);

  // Speak AI text at configurable speed (1.0x normal / 0.72x slow) with VAD echo guard
  const speakWithVadGuard = (text: string, speed = 0.95) => {
    speakWord(text, 'en', speed, {
      onStart: () => {
        isAiSpeakingRef.current = true;
      },
      onEnd: () => {
        setTimeout(() => {
          isAiSpeakingRef.current = false;
        }, 250);
      }
    });
  };

  const currentTurn = selectedScenario.turns[currentTurnIndex] || selectedScenario.turns[0];

  const persistRoleplayForPersona = (personaId: string, messages: ChatMessage[]) => {
    const trimmed = messages.slice(-40);
    const allHistory = ScopedStorage.getRoleplayHistory(currentUser?.id);
    const updatedHistory: Record<string, PersistedRoleplayMessage[]> = {
      ...allHistory,
      [personaId]: trimmed
    };
    ScopedStorage.setRoleplayHistory(currentUser?.id, updatedHistory);
    onRoleplayHistoryChange?.(updatedHistory);
  };

  // Load persisted Roleplay history per persona (or seed with initial greeting)
  useEffect(() => {
    if (activeTab === 'roleplay') {
      const savedMap = ScopedStorage.getRoleplayHistory(currentUser?.id);
      const savedForPersona = savedMap[selectedPersona.id];
      if (Array.isArray(savedForPersona) && savedForPersona.length > 0) {
        setRoleplayMessages(savedForPersona);
      } else {
        const seed: ChatMessage[] = [
          {
            id: 'init-1',
            sender: 'AI',
            text: selectedPersona.initialMessage,
            translation: selectedPersona.initialTranslation
          }
        ];
        setRoleplayMessages(seed);
        speakWithVadGuard(selectedPersona.initialMessage, 0.95);
      }
      setRoleplayStartTime(Date.now());
    }
  }, [activeTab, selectedPersona, currentUser?.id]);

  // Update selectedScenario if level or category changes and current selection is invalid
  useEffect(() => {
    if (levelScenarios.length > 0 && !levelScenarios.some((s) => s.id === selectedScenario.id)) {
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
    speechStartMsRef.current = null;
    latestTranscriptRef.current = '';
    hasFinalizedRecRef.current = false;
    setSpokenText('');
    setScore(null);
    setDetailedAssessment(null);
    setLatencyMs(null);

    if (currentTurnIndex === 0) {
      turnScoresRef.current = [];
      turnLatenciesRef.current = [];
    }

    if (activeTab === 'guided' && currentTurn && currentTurn.speaker === 'AI') {
      speakWithVadGuard(currentTurn.text, 0.95);
    } else if (activeTab === 'guided' && currentTurn && currentTurn.speaker === 'User') {
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
  }, [currentTurnIndex, selectedScenario, scaffoldingStep, activeTab]);

  // Speech Evaluation using true reaction latency (turnStart -> speechstart)
  const evaluateSpeech = (spoken: string) => {
    if (!currentTurn) return;

    const elapsed = computeSpeechReactionLatencyMs({
      turnStartMs: turnStartTime,
      speechStartMs: speechStartMsRef.current,
      fallbackEndMs: Date.now()
    });
    setLatencyMs(elapsed);

    const assessment = assessSpeech(currentTurn.text, spoken, elapsed);
    setDetailedAssessment(assessment);
    setScore(assessment.overallScore);
    turnScoresRef.current.push(assessment.overallScore);
    turnLatenciesRef.current.push(elapsed);

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
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onspeechstart = () => {
        if (speechStartMsRef.current === null) {
          speechStartMsRef.current = Date.now();
        }
      };

      const finalizeTranscript = (transcript: string) => {
        if (hasFinalizedRecRef.current) return;
        hasFinalizedRecRef.current = true;
        isRecordingRef.current = false;
        setIsRecording(false);

        const clean = transcript.trim();
        if (!clean) {
          if (vadRef.current) vadRef.current.resumeListening();
          return;
        }

        if (activeTab === 'guided') {
          setSpokenText(clean);
          evaluateSpeech(clean);
          if (vadRef.current) vadRef.current.resumeListening();
        } else {
          setRoleplayInput(clean);
          if (autoSendVoiceRef.current) {
            sendRoleplayTextRef.current(clean);
          }
          if (vadRef.current) vadRef.current.resumeListening();
        }
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? '')
          .join('');
        latestTranscriptRef.current = transcript;

        if (activeTab === 'guided') {
          setSpokenText(transcript);
        } else {
          setRoleplayInput(transcript);
        }

        const lastResult = event.results[event.results.length - 1];
        if (lastResult?.isFinal) {
          finalizeTranscript(transcript);
        }
      };

      recognition.onerror = () => {
        isRecordingRef.current = false;
        setIsRecording(false);
        if (vadRef.current) vadRef.current.resumeListening();
      };

      recognition.onend = () => {
        if (!hasFinalizedRecRef.current && latestTranscriptRef.current.trim()) {
          finalizeTranscript(latestTranscriptRef.current);
          return;
        }
        isRecordingRef.current = false;
        setIsRecording(false);
        if (vadRef.current) vadRef.current.resumeListening();
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

  // Hands-free VAD + WakeLock Engine Lifecycle (works in BOTH Guided & Roleplay Call Mode!)
  useEffect(() => {
    const shouldRunVad = isVadEnabled && (activeTab === 'guided' || activeTab === 'roleplay');
    if (shouldRunVad) {
      const vad = new VoiceActivityDetector({
        noisyEnvironment: noisyMode,
        silenceTimeoutMs: 850,
        minSpeechDurationMs: 400,
        onVolumeChange: (rms) => {
          setAudioEnergy(isAiSpeakingRef.current ? 0 : rms);
        },
        onSpeechStart: () => {
          if (isAiSpeakingRef.current || isRecordingRef.current || !recognitionRef.current) {
            return;
          }
          try {
            speechStartMsRef.current = Date.now();
            latestTranscriptRef.current = '';
            hasFinalizedRecRef.current = false;
            isRecordingRef.current = true;
            setIsRecording(true);
            recognitionRef.current.start();
          } catch {
            isRecordingRef.current = false;
            setIsRecording(false);
          }
        },
        onSpeechEnd: () => {
          if (recognitionRef.current && isRecordingRef.current) {
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

      // Keep screen awake during Hands-free Call Mode (Langua keep_screen_on)
      if ('wakeLock' in navigator && typeof navigator.wakeLock?.request === 'function') {
        navigator.wakeLock
          .request('screen')
          .then((sentinel) => {
            wakeLockRef.current = sentinel;
          })
          .catch(() => {
            // WakeLock unsupported or denied by battery saver — non-blocking
          });
      }

      return () => {
        vad.destroy();
        vadRef.current = null;
        if (wakeLockRef.current) {
          void wakeLockRef.current.release().catch(() => {});
          wakeLockRef.current = null;
        }
      };
    }

    if (vadRef.current) {
      vadRef.current.destroy();
      vadRef.current = null;
    }
    if (wakeLockRef.current) {
      void wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    setAudioEnergy(0);
  }, [isVadEnabled, activeTab]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.info('Trình duyệt chưa hỗ trợ Web Speech API (ví dụ Firefox). Vui lòng dùng Chrome/Safari/Edge hoặc gõ trực tiếp.');
      return;
    }

    if (isRecordingRef.current) {
      recognitionRef.current.stop();
      isRecordingRef.current = false;
      setIsRecording(false);
    } else {
      speechStartMsRef.current = null;
      latestTranscriptRef.current = '';
      hasFinalizedRecRef.current = false;
      setSpokenText('');
      setScore(null);
      setDetailedAssessment(null);
      try {
        recognitionRef.current.start();
        isRecordingRef.current = true;
        setIsRecording(true);
      } catch (e) {
        console.warn(e);
        isRecordingRef.current = false;
        setIsRecording(false);
      }
    }
  };

  // Next guided turn + persist scenario mastery on completion
  const handleNextTurn = () => {
    if (currentTurnIndex < selectedScenario.turns.length - 1) {
      setCurrentTurnIndex((prev) => prev + 1);
    } else {
      const avgScore =
        turnScoresRef.current.length > 0
          ? Math.round(turnScoresRef.current.reduce((a, b) => a + b, 0) / turnScoresRef.current.length)
          : (score ?? 85);
      const bestLatency =
        turnLatenciesRef.current.length > 0
          ? Math.min(...turnLatenciesRef.current)
          : latencyMs;
      const updatedRecords = mergeScenarioCompletion(
        completedScenarios,
        selectedScenario.id,
        avgScore,
        bestLatency
      );
      setLocalCompletedScenarios(updatedRecords);
      ScopedStorage.setCompletedScenarios(currentUser?.id, updatedRecords);
      onCompletedScenariosChange?.(updatedRecords);
      confetti({ particleCount: 100, spread: 80 });
      setIsScenarioComplete(true);
    }
  };

  // Create custom Fluently-style Roleplay Persona on the fly
  const handleCreateCustomPersona = (custom: { title: string; partnerRole: string; mission: string }) => {
    const id = `custom-rp-${Date.now()}`;
    const newPersona: RoleplayPersona = {
      id,
      name: custom.title.slice(0, 26),
      role: custom.partnerRole,
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop',
      situation: `Tình huống thực tế do người học thiết kế: ${custom.title}.`,
      mission: custom.mission,
      initialMessage: `Hi! Let's jump right into "${custom.title}". How would you like to start?`,
      initialTranslation: `Chào bạn! Hãy bắt đầu ngay tình huống "${custom.title}". Bạn muốn mở lời thế nào?`,
      isCustom: true
    };
    setCustomPersonas((prev) => {
      const next = [newPersona, ...prev].slice(0, 20);
      ScopedStorage.setCustomRoleplayPersonas(currentUser?.id, next);
      return next;
    });
    setSelectedPersona(newPersona);
    toast.success(`Đã khởi tạo & lưu phòng nhập vai: ${custom.title}`);
  };

  // Roleplay send message via authenticated Backend AI API
  const sendRoleplayText = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isAiThinking) return;

    const token = authService.getToken();
    if (!token || !currentUser) {
      toast.error('Vui lòng đăng nhập để sử dụng AI Roleplay.');
      onOpenAuth?.();
      return;
    }

    const userMsgId = `usr-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'User',
      text: trimmed,
      latencyMs: Date.now() - roleplayStartTime
    };

    const nextHistory = [...roleplayMessages, userMsg];
    setRoleplayMessages(nextHistory);
    persistRoleplayForPersona(selectedPersona.id, nextHistory);
    setRoleplayInput('');
    setIsAiThinking(true);

    try {
      const isMissionChat = Boolean(activeMission && missionPersona && selectedPersona.id === missionPersona.id);
      const res = await fetch('/api/ai/roleplay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          personaId: selectedPersona.id,
          personaName: selectedPersona.name,
          personaRole: selectedPersona.role,
          situation: selectedPersona.situation,
          mission: selectedPersona.mission,
          correctionMode,
          ...(isMissionChat && activeMission
            ? {
                targetWords: activeMission.targetWords.map((w) => w.word),
                grammarFocus: activeMission.grammarFocus
                  ? `${activeMission.grammarFocus.title}: ${activeMission.grammarFocus.formula}`
                  : undefined
              }
            : {}),
          history: nextHistory.slice(-6).map((m) => ({ sender: m.sender, text: m.text })),
          userMessage: trimmed
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Không thể kết nối AI Roleplay.');
        setIsAiThinking(false);
        return;
      }

      if (data.isFallback) {
        setAiEngineLabel('Chế độ Offline / Chưa cấu hình AI Key');
      } else {
        setAiEngineLabel('Live AI (Gemini)');
      }

      if (data.quota) {
        setQuotaBadge(
          data.quota.unlimited
            ? 'Pro Unlimited'
            : `${data.quota.used}/${data.quota.limit} lượt hôm nay`
        );
      }

      if (typeof data.missionProgress === 'number') {
        const prevDone = Boolean(missionProgressMap[selectedPersona.id]?.completed);
        const nowDone = Boolean(data.missionCompleted) || data.missionProgress >= 100;
        setMissionProgressMap((prev) => ({
          ...prev,
          [selectedPersona.id]: { progress: data.missionProgress, completed: nowDone }
        }));
        if (!prevDone && nowDone) {
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
          toast.success(`🎉 Chúc mừng! Bạn đã hoàn thành nhiệm vụ cùng ${selectedPersona.name}!`);
        }
      }

      setRoleplayMessages((prev) => {
        const updated: ChatMessage[] = [
          ...prev.map((m) =>
            m.id === userMsgId
              ? {
                  ...m,
                  correction: data.correction || undefined,
                  nativeRephrase: data.nativeRephrase,
                  grammarTip: data.grammarTip,
                  qualityRating: data.qualityRating
                }
              : m
          ),
          {
            id: `ai-${Date.now()}`,
            sender: 'AI',
            text: data.reply || 'Could you elaborate on that?',
            translation: data.replyTranslation || undefined,
            suggestedReplies: Array.isArray(data.suggestedReplies) ? data.suggestedReplies : undefined
          }
        ];
        persistRoleplayForPersona(selectedPersona.id, updated);
        return updated;
      });

      setRoleplayStartTime(Date.now());
      if (data.reply) {
        speakWithVadGuard(data.reply, 0.95);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ AI Roleplay.');
    } finally {
      setIsAiThinking(false);
    }
  };

  sendRoleplayTextRef.current = (text: string) => {
    void sendRoleplayText(text);
  };

  const handleSendRoleplay = () => {
    void sendRoleplayText(roleplayInput);
  };

  // Post-Chat Feedback Report (Langua)
  const handleOpenFeedbackReport = async () => {
    const token = authService.getToken();
    if (!token || !currentUser) {
      onOpenAuth?.();
      return;
    }

    setFeedbackModalOpen(true);
    setIsLoadingFeedback(true);
    setFeedbackError(null);
    setFeedbackReport(null);

    try {
      const res = await fetch('/api/ai/roleplay-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          personaName: selectedPersona.name,
          personaRole: selectedPersona.role,
          mission: selectedPersona.mission,
          messages: roleplayMessages.slice(-30)
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Không thể tổng hợp báo cáo hội thoại lúc này.');
      }
      if (data.quota) {
        setQuotaBadge(
          data.quota.unlimited
            ? 'Pro Unlimited'
            : `${data.quota.used}/${data.quota.limit} lượt hôm nay`
        );
      }
      setFeedbackReport(data.report as RoleplayFeedbackReport);
    } catch (err: unknown) {
      setFeedbackError(err instanceof Error ? err.message : 'Lỗi kết nối báo cáo AI.');
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in pb-12 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Compact Top Header & Mode Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 fill-orange-500 shrink-0" />
            <span>Phòng Nói & Viết AI (Output Lab)</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Biến từ vựng & ngữ pháp Lộ trình thành phản xạ Nói (Call Mode + Sửa lỗi 5 cấp) & bài Viết chuẩn bản xứ
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="inline-flex max-w-full overflow-x-auto no-scrollbar p-1 rounded-2xl bg-slate-200/80 gap-1 shrink-0 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('guided')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'guided'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Phản xạ CEFR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roleplay')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'roleplay'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>AI Roleplay & Call</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('writing')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'writing'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 shrink-0" />
            <span>Luyện Viết AI</span>
          </button>
        </div>
      </div>

      {/* MODE 1: COMPACT FOCUS GUIDED CEFR (Speaking Card Immediately Above the Fold!) */}
      {activeTab === 'guided' && (
        <div className="space-y-4 animate-fade-in">
          {/* Single-Row Compact Control Strip: Level Pills + Active Scenario Trigger + VAD Pill */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Compact A1-C1 Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
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
                      title={`${spec.name} · Mục tiêu: ${spec.targetLatency}`}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        isCurrent
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{lvl}</span>
                      <span className={`text-[10px] font-bold ${isCurrent ? 'text-teal-100' : 'text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Compact Hands-free VAD + Noisy Mode + Create AI Scenario */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsVadEnabled((v) => !v)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    isVadEnabled
                      ? 'bg-emerald-600 text-white shadow-xs animate-pulse'
                      : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
                  }`}
                  title="Tự nhận giọng nói và dừng khi im lặng 850ms"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isVadEnabled ? 'VAD Đang Bật' : 'Hands-free VAD'}</span>
                </button>

                {isVadEnabled && (
                  <button
                    type="button"
                    onClick={() => setNoisyMode((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                      noisyMode
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Lọc ồn quán cà phê / nơi đông người"
                  >
                    <VolumeX className="w-3 h-3" />
                    <span>{noisyMode ? 'Lọc ồn: Bật' : 'Lọc ồn'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setCustomLevel(selectedLevel);
                    setIsCustomModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo bài AI</span>
                </button>
              </div>
            </div>

            {/* Active Scenario Summary Bar + Collapsible Picker Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">{selectedScenario.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {selectedScenario.title}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
                      Mục tiêu {CEFR_LEVEL_SPECS[selectedLevel].targetLatency}
                    </span>
                    {completedScenarios[selectedScenario.id] && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 shrink-0">
                        ✓ {completedScenarios[selectedScenario.id]?.bestScore}%
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{selectedScenario.targetGoal}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowScenarioDrawer((v) => !v)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>Đổi tình huống ({levelScenarios.length})</span>
                {showScenarioDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Collapsible Scenario & Topic Drawer */}
            {showScenarioDrawer && (
              <div className="pt-2.5 border-t border-slate-100 space-y-2.5 animate-fade-in">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Chủ đề:</span>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {levelScenarios.length === 0 ? (
                  <div className="p-4 text-center bg-slate-50 rounded-2xl text-xs text-slate-500 space-y-2">
                    <p className="font-bold text-slate-700">
                      Chưa có tình huống nào thuộc chủ đề “{selectedCategory}” ở mức {selectedLevel}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('Tất cả')}
                      className="px-3 py-1 rounded-full bg-teal-50 text-teal-700 font-extrabold cursor-pointer"
                    >
                      Xem tất cả ({selectedLevel}) ➔
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {levelScenarios.map((sc) => {
                      const completion = completedScenarios[sc.id];
                      const isSelected = selectedScenario?.id === sc.id;
                      return (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => {
                            setSelectedScenario(sc);
                            setCurrentTurnIndex(0);
                            setIsScenarioComplete(false);
                            setShowScenarioDrawer(false);
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-400/40'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-base">{sc.icon}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
                              {sc.category}
                            </span>
                            {completion && (
                              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                ✓ {completion.bestScore}%
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-black text-slate-900 line-clamp-1">{sc.title}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{sc.targetGoal}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Guided Speaking Card (Now Sits Immediately Above the Fold!) */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-7 shadow-sm">
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
                  const currentIndexInList = levelScenarios.findIndex((s) => s.id === selectedScenario?.id);
                  const nextSc = levelScenarios[(currentIndexInList + 1) % levelScenarios.length];
                  if (nextSc) setSelectedScenario(nextSc);
                }
              }}
              onSpeakText={(t) => speakWithVadGuard(t, 0.95)}
            />
          </div>
        </div>
      )}

      {/* MODE 2: AI ROLEPLAY & CALL MODE (Langua + Fluently Architecture) */}
      {activeTab === 'roleplay' && (
        <div className="space-y-4">
          {activeMission && activeMission.targetWords.length > 0 && (() => {
            const userTranscript = roleplayMessages
              .filter((m) => m.sender === 'User')
              .map((m) => m.text)
              .join(' ');
            const usedSet = new Set(
              detectUsedMissionWords(
                userTranscript,
                activeMission.targetWords.map((w) => w.word)
              )
            );
            return (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-teal-700">
                      Nhiệm vụ thực chiến từ Lộ trình ({usedSet.size}/{activeMission.targetWords.length} từ đã dùng)
                    </p>
                    <h3 className="text-sm font-black text-slate-900">{activeMission.sourceTitle}</h3>
                  </div>
                  {onClearMission && (
                    <button
                      type="button"
                      onClick={() => {
                        onClearMission();
                        if (missionPersona && selectedPersona.id === missionPersona.id && AI_PERSONAS[0]) {
                          setSelectedPersona(AI_PERSONAS[0]);
                        }
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white cursor-pointer"
                      title="Đóng nhiệm vụ"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeMission.targetWords.map((tw) => {
                    const isUsed = usedSet.has(tw.word);
                    return (
                      <button
                        key={tw.word}
                        type="button"
                        onClick={() => speakWithVadGuard(tw.word, 0.92)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                          isUsed
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white hover:bg-teal-50 text-slate-700 border-teal-200'
                        }`}
                        title={tw.pattern ? `${tw.meaningVi} — ${tw.pattern} (Bấm để nghe phát âm)` : `${tw.meaningVi} (Bấm để nghe phát âm)`}
                      >
                        {isUsed && <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{tw.word}</span>
                        <span className={`text-[10px] ${isUsed ? 'text-emerald-100' : 'text-slate-400'}`}>
                          · {tw.meaningVi}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <RoleplayChatRoom
            personas={allPersonas}
            selectedPersona={selectedPersona}
            onSelectPersona={(p) => setSelectedPersona(p)}
            onCreateCustomPersona={handleCreateCustomPersona}
            messages={roleplayMessages}
            inputMessage={roleplayInput}
            onChangeInput={setRoleplayInput}
            onSendMessage={handleSendRoleplay}
            onSendQuickReply={(text) => void sendRoleplayText(text)}
            isAiThinking={isAiThinking}
            isRecording={isRecording}
            onToggleRecording={toggleRecording}
            onRestartChat={() => {
              const resetSeed: ChatMessage[] = [
                {
                  id: `init-${Date.now()}`,
                  sender: 'AI',
                  text: selectedPersona.initialMessage,
                  translation: selectedPersona.initialTranslation
                }
              ];
              setRoleplayMessages(resetSeed);
              persistRoleplayForPersona(selectedPersona.id, resetSeed);
              setMissionProgressMap((prev) => ({
                ...prev,
                [selectedPersona.id]: { progress: 0, completed: false }
              }));
              speakWithVadGuard(selectedPersona.initialMessage, 0.95);
            }}
            onSpeakText={(t, speed) => speakWithVadGuard(t, speed ?? 0.95)}
            aiEngineLabel={aiEngineLabel}
            quotaBadge={quotaBadge}
            isLockedForGuest={!currentUser}
            onRequestLogin={onOpenAuth}
            missionProgress={missionProgressMap[selectedPersona.id]?.progress || 0}
            missionCompleted={Boolean(missionProgressMap[selectedPersona.id]?.completed)}
            autoSendVoice={autoSendVoice}
            onToggleAutoSendVoice={() => setAutoSendVoice((prev) => !prev)}
            onSavePhraseToSrs={onSavePhraseToSrs}
            onWordClick={onWordClick}
            savedWords={savedWords}
            correctionMode={correctionMode}
            onChangeCorrectionMode={(mode) => setCorrectionMode(mode)}
            displayMode={displayMode}
            onToggleDisplayMode={() =>
              setDisplayMode((prev) => (prev === 'audio_only' ? 'text_audio' : 'audio_only'))
            }
            isCallModeVad={isVadEnabled}
            onToggleCallModeVad={() => setIsVadEnabled((prev) => !prev)}
            noisyMode={noisyMode}
            onToggleNoisyMode={() => setNoisyMode((prev) => !prev)}
            audioEnergy={audioEnergy}
            onOpenFeedbackReport={() => void handleOpenFeedbackReport()}
          />
        </div>
      )}

      {/* MODE 3: AI WRITING COACH */}
      {activeTab === 'writing' && (
        <WritingCoachPanel
          activeMission={activeMission}
          onClearMission={onClearMission}
          savedWords={savedWords}
          currentUser={currentUser}
          onOpenAuth={onOpenAuth}
          onSavePhraseToSrs={onSavePhraseToSrs}
        />
      )}

      {/* Post-Chat Feedback Report Modal (Langua) */}
      <RoleplayFeedbackModal
        isOpen={feedbackModalOpen}
        isLoading={isLoadingFeedback}
        report={feedbackReport}
        error={feedbackError}
        personaName={selectedPersona.name}
        onClose={() => setFeedbackModalOpen(false)}
        onSpeakText={(t, speed) => speakWithVadGuard(t, speed ?? 0.92)}
        onSavePhraseToSrs={onSavePhraseToSrs}
      />

      {/* Custom Scenario Modal (Guided CEFR) */}
      {isCustomModalOpen && (
        <ModalPortal onClose={() => setIsCustomModalOpen(false)}>
          <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
            role="dialog"
            aria-modal="true"
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
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
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
                    placeholder="Ví dụ: Đổi trả hàng tại siêu thị, Đàm phán tăng lương..."
                    className="w-full p-3 rounded-2xl border border-slate-200 text-sm focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Trình độ CEFR mục tiêu:</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(['A1', 'A2', 'B1', 'B2', 'C1'] as CEFRLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setCustomLevel(lvl)}
                        className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                          customLevel === lvl
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!customTopic.trim() || isGeneratingScenario}
                  onClick={async () => {
                    const topicClean = customTopic.trim();
                    if (!topicClean) return;

                    setIsGeneratingScenario(true);
                    let generatedScenario: SpeakingScenario | null = null;
                    const token = authService.getToken();

                    if (currentUser && token) {
                      try {
                        const res = await fetch('/api/ai/generate-scenario', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`
                          },
                          body: JSON.stringify({
                            topic: topicClean,
                            level: customLevel,
                            category: 'Xã giao'
                          })
                        });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok && data?.scenario && Array.isArray(data.scenario.turns) && data.scenario.turns.length >= 2) {
                          generatedScenario = data.scenario as SpeakingScenario;
                          toast.success(
                            data.isFallback
                              ? `Đã khởi tạo kịch bản 6 lượt (${customLevel}) cho "${topicClean}".`
                              : `AI đã thiết kế kịch bản ${generatedScenario.turns.length} lượt (${customLevel})!`
                          );
                        } else if (!res.ok) {
                          toast.info(data?.error || 'Đang dùng mẫu hội thoại 6 lượt cục bộ.');
                        }
                      } catch {
                        toast.info('Mạng AI tạm gián đoạn — đang tạo kịch bản cục bộ.');
                      }
                    }

                    if (!generatedScenario) {
                      generatedScenario = {
                        id: `custom-${Date.now()}`,
                        level: customLevel,
                        title: topicClean,
                        category: 'Xã giao',
                        description: `Tình huống phản xạ (${customLevel}): ${topicClean}`,
                        icon: '🎯',
                        targetGoal: `Hoàn thành hội thoại tự tin về "${topicClean}" ở mức ${customLevel}`,
                        turns: [
                          {
                            id: 'c-1',
                            speaker: 'AI',
                            speakerName: 'Alex',
                            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
                            text: `Hi there! Let's talk about ${topicClean}. What brings you here today?`,
                            translation: `Chào bạn! Hãy cùng trao đổi về ${topicClean}. Hôm nay bạn cần gì?`,
                            expectedKeywords: ['talk', 'today']
                          },
                          {
                            id: 'c-2',
                            speaker: 'User',
                            speakerName: 'Bạn',
                            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
                            text: `Thanks for asking. I'd like to discuss ${topicClean} and explain my situation.`,
                            translation: `Cảm ơn bạn đã hỏi. Tôi muốn trao đổi về ${topicClean} và trình bày tình huống của mình.`,
                            hintPrompt: `Giới thiệu mục đích trao đổi về ${topicClean}`,
                            expectedKeywords: ['discuss', 'explain', 'situation']
                          },
                          {
                            id: 'c-3',
                            speaker: 'AI',
                            speakerName: 'Alex',
                            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
                            text: 'Sure, I understand. What specific details or preferences should I know about?',
                            translation: 'Chắc chắn rồi, tôi hiểu. Có chi tiết hoặc yêu cầu cụ thể nào tôi nên biết không?',
                            expectedKeywords: ['specific', 'details']
                          },
                          {
                            id: 'c-4',
                            speaker: 'User',
                            speakerName: 'Bạn',
                            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
                            text: 'My main priority is getting a quick and practical solution today.',
                            translation: 'Ưu tiên chính của tôi là có một giải pháp nhanh và thiết thực hôm nay.',
                            hintPrompt: 'Nêu ưu tiên chính của bạn một cách rõ ràng',
                            expectedKeywords: ['priority', 'practical', 'solution']
                          }
                        ]
                      };
                    }

                    setIsGeneratingScenario(false);
                    setSelectedLevel(generatedScenario.level);
                    setSelectedCategory('Tất cả');
                    onAddCustomScenario(generatedScenario);
                    setSelectedScenario(generatedScenario);
                    setCurrentTurnIndex(0);
                    setIsScenarioComplete(false);
                    setIsCustomModalOpen(false);
                    setCustomTopic('');
                  }}
                  className="w-full py-3.5 rounded-2xl btn-3d btn-3d-teal font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isGeneratingScenario ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI đang viết kịch bản {customLevel}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>{currentUser ? `✨ Tạo kịch bản 6 lượt bằng AI (${customLevel})` : 'Tạo và bắt đầu luyện ngay'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};
