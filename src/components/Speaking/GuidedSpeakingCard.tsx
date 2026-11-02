import React, { useState } from 'react';
import { DialogueTurn, CEFRLevel, CEFR_LEVEL_SPECS } from '../../data/speakingScenarios';
import { 
  Volume2, 
  Lightbulb, 
  Sparkles, 
  Mic, 
  MicOff, 
  ArrowRight, 
  Award, 
  Eye, 
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Volume1
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { speakWord } from '../../services/dictionaryService';
import { 
  assessSpeech, 
  DetailedSpeechAssessment, 
  WordAssessment 
} from '../../utils/speechAssessor';
import { soundEffects } from '../../utils/audioFeedback';

export type ReflexScaffoldingStep = 1 | 2 | 3;

interface GuidedSpeakingCardProps {
  currentTurn: DialogueTurn;
  currentTurnIndex: number;
  totalTurns: number;
  selectedLevel: CEFRLevel;
  score: number | null;
  latencyMs: number | null;
  isRecording: boolean;
  spokenText: string;
  isScenarioComplete: boolean;
  detailedAssessment?: DetailedSpeechAssessment | null;
  scaffoldingStep?: ReflexScaffoldingStep;
  handsFreeVadActive?: boolean;
  audioEnergy?: number;
  countdownSeconds?: number | null;
  onToggleRecording: () => void;
  onNextTurn: () => void;
  onRestartScenario: () => void;
  onNextScenario: () => void;
  onSpeakText: (text: string) => void;
  onScaffoldingStepChange?: (step: ReflexScaffoldingStep) => void;
}

export const GuidedSpeakingCard: React.FC<GuidedSpeakingCardProps> = ({
  currentTurn,
  currentTurnIndex,
  totalTurns,
  selectedLevel,
  score,
  latencyMs,
  isRecording,
  spokenText,
  isScenarioComplete,
  detailedAssessment,
  scaffoldingStep = 1,
  handsFreeVadActive = false,
  audioEnergy = 0,
  countdownSeconds = null,
  onToggleRecording,
  onNextTurn,
  onRestartScenario,
  onNextScenario,
  onSpeakText,
  onScaffoldingStepChange,
}) => {
  const activeLevelSpec = CEFR_LEVEL_SPECS[selectedLevel];
  const isSpeedAchieved = latencyMs !== null && latencyMs <= activeLevelSpec.latencyMaxMs;
  const [hideEnglish, setHideEnglish] = useState(false);

  // Targeted Word Drill Modal State (ELSA Speak REA)
  const [drillingWord, setDrillingWord] = useState<WordAssessment | null>(null);
  const [drillSpoken, setDrillSpoken] = useState<string>('');
  const [drillScore, setDrillScore] = useState<number | null>(null);
  const [isDrillRecording, setIsDrillRecording] = useState<boolean>(false);
  const [revealedBlanks, setRevealedBlanks] = useState<Record<number, boolean>>({});

  // Helper to toggle masked blank words in Step 2 Chunking
  const toggleBlankWord = (idx: number) => {
    setRevealedBlanks(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Single Word Drill Audio Check
  const handleDrillListen = (word: string, slow = false) => {
    speakWord(word, 'en', slow ? 0.75 : 0.95);
  };

  const startDrillSpeechRecognition = (targetWord: WordAssessment) => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói. Vui lòng thử trên Chrome hoặc Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsDrillRecording(true);
        setDrillSpoken('');
        setDrillScore(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim() ?? '';
        setDrillSpoken(transcript);

        const singleWordAssessment = assessSpeech(targetWord.cleanWord, transcript);
        const wordResult = singleWordAssessment.words[0]?.score ?? 0;
        setDrillScore(wordResult);

        if (wordResult >= 85) {
          soundEffects.playSuccess();
          confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
          targetWord.tier = 'correct';
          targetWord.score = wordResult;
          targetWord.omissionWarning = undefined;
        } else if (wordResult >= 65) {
          soundEffects.playAlmost();
        } else {
          soundEffects.playTryAgain();
        }
      };

      recognition.onerror = () => {
        setIsDrillRecording(false);
      };

      recognition.onend = () => {
        setIsDrillRecording(false);
      };

      recognition.start();
    } catch {
      setIsDrillRecording(false);
    }
  };

  if (isScenarioComplete) {
    return (
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-center space-y-4 max-w-md mx-auto animate-fade-in my-6">
        <div className="size-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
          <Award className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900">
            Xuất sắc! Hoàn thành tình huống {selectedLevel}!
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Bạn đã vượt qua các lượt hội thoại theo chuẩn phản xạ {activeLevelSpec.targetLatency}.
          </p>
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onRestartScenario}
            className="flex-1 py-3 rounded-2xl btn-3d btn-3d-teal font-black text-xs"
          >
            Luyện lại bài này
          </button>
          <button
            type="button"
            onClick={onNextScenario}
            className="flex-1 py-3 rounded-2xl btn-3d btn-3d-orange font-black text-xs shadow-[0_3px_0_#d95e26]"
          >
            Tình huống kế tiếp ➔
          </button>
        </div>
      </div>
    );
  }

  if (!currentTurn) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm bg-slate-50 rounded-2xl border border-slate-200">
        Không có dữ liệu lượt thoại cho tình huống này. Vui lòng chọn tình huống khác.
      </div>
    );
  }

  // Parse words for chunking or display
  const rawWords = currentTurn.text.split(/\s+/).filter(Boolean);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* SuperChinese 3-Step Reflex Scaffolding Header */}
      {onScaffoldingStepChange && currentTurn.speaker === 'User' && (
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => onScaffoldingStepChange(1)}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
              scaffoldingStep === 1 
                ? 'bg-white text-teal-700 shadow-sm font-black' 
                : 'hover:text-slate-900'
            }`}
          >
            <span>1. Đọc mẫu</span>
          </button>
          <button
            type="button"
            onClick={() => onScaffoldingStepChange(2)}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
              scaffoldingStep === 2 
                ? 'bg-white text-amber-700 shadow-sm font-black' 
                : 'hover:text-slate-900'
            }`}
          >
            <span>2. Đục lỗ (3s)</span>
          </button>
          <button
            type="button"
            onClick={() => onScaffoldingStepChange(3)}
            className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 ${
              scaffoldingStep === 3 
                ? 'bg-white text-rose-700 shadow-sm font-black' 
                : 'hover:text-slate-900'
            }`}
          >
            <span>3. Phản xạ kín</span>
          </button>
        </div>
      )}

      {/* Progress & Quick Toggle Bar */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-bold text-slate-500">
          Lượt thoại: <strong className="text-slate-800">{currentTurnIndex + 1}/{totalTurns}</strong>
        </span>

        {/* 3s Countdown Timer if in Scaffolding Step 2 or 3 */}
        {countdownSeconds !== null && countdownSeconds > 0 && (
          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-black animate-pulse border border-rose-300">
            ⏳ Phản xạ trong: {countdownSeconds}s
          </span>
        )}

        <button
          type="button"
          onClick={() => setHideEnglish(!hideEnglish)}
          className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1 transition-all ${
            hideEnglish 
              ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
          title="Ẩn chữ tiếng Anh để ép não bộ phản xạ tự nhiên không dịch thầm"
        >
          {hideEnglish ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{hideEnglish ? 'Đang ẩn chữ' : 'Ẩn chữ (Ép phản xạ)'}</span>
        </button>
      </div>

      {/* Conversation Turn Card */}
      <div className="flex items-start gap-4">
        <img
          src={currentTurn.avatar}
          alt={currentTurn.speakerName}
          className="size-14 rounded-2xl object-cover ring-2 ring-slate-200 shrink-0 shadow-sm"
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800">
              {currentTurn.speakerName}
            </span>
            {currentTurn.speaker === 'AI' && (
              <button
                type="button"
                onClick={() => onSpeakText(currentTurn.text)}
                className="p-1 rounded-full text-teal-600 hover:bg-teal-50"
                title="Nghe phát âm chuẩn"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {currentTurn.speaker === 'User' && currentTurn.hintPrompt && (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-100 text-xs font-bold text-sky-900 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-sky-600 shrink-0" />
              <span>{currentTurn.hintPrompt}</span>
            </div>
          )}

          {/* Main Speech Text Box with ELSA Heatmap and Scaffolding */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mt-2 relative">
            {/* Step 3: Blind Roleplay (Completely hidden unless hovered/toggled) */}
            {scaffoldingStep === 3 && currentTurn.speaker === 'User' ? (
              <div className="py-2 text-center">
                <p className="text-sm font-bold text-rose-700 mb-1">
                  🎯 Bước 3: Phản xạ mù (Không nhìn chữ)
                </p>
                <p className="text-xs text-slate-500">
                  Lắng nghe câu hỏi của đối phương và trực tiếp nói câu trả lời của bạn!
                </p>
              </div>
            ) : scaffoldingStep === 2 && currentTurn.speaker === 'User' ? (
              /* Step 2: Timed Chunking with Blank Words */
              <div className="flex flex-wrap items-center gap-1.5 py-1">
                {rawWords.map((word, wIdx) => {
                  const shouldMask = (wIdx % 2 === 1 || wIdx === rawWords.length - 1);
                  const isRevealed = revealedBlanks[wIdx];

                  if (shouldMask && !isRevealed) {
                    return (
                      <button
                        key={wIdx}
                        type="button"
                        onClick={() => toggleBlankWord(wIdx)}
                        className="px-2.5 py-1 rounded-lg bg-amber-200 text-amber-900 font-black text-sm border border-amber-300 hover:bg-amber-300 transition-all animate-pulse"
                        title="Bấm để mở gợi ý từ"
                      >
                        [ ? ]
                      </button>
                    );
                  }

                  return (
                    <span
                      key={wIdx}
                      onClick={() => shouldMask && toggleBlankWord(wIdx)}
                      className={`text-lg font-black ${shouldMask ? 'text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded cursor-pointer' : 'text-slate-800'}`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            ) : detailedAssessment && detailedAssessment.words.length > 0 && currentTurn.speaker === 'User' ? (
              /* ELSA Speak 3-Tier Phonetic Heatmap (🟢 Green, 🟡 Yellow, 🔴 Red) */
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200">
                  <span className="font-bold text-slate-500">
                    Bản đồ âm thanh ELSA (Bấm từ màu vàng/đỏ để luyện riêng):
                  </span>
                  <div className="flex items-center gap-2 text-[10px] font-bold">
                    <span className="text-emerald-700 flex items-center gap-0.5">🟢 ≥85%</span>
                    <span className="text-amber-700 flex items-center gap-0.5">🟡 65-84%</span>
                    <span className="text-rose-700 flex items-center gap-0.5">🔴 &lt;65%</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 py-1">
                  {detailedAssessment.words.map((w) => {
                    let badgeClass = 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100';
                    let icon = '🔴';
                    if (w.tier === 'correct') {
                      badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100';
                      icon = '🟢';
                    } else if (w.tier === 'almost') {
                      badgeClass = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
                      icon = '🟡';
                    }

                    return (
                      <div key={w.id} className="relative group inline-flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => setDrillingWord(w)}
                          className={`px-2.5 py-1 rounded-xl text-base font-black border transition-all cursor-pointer shadow-xs ${badgeClass}`}
                          title={`Điểm: ${w.score}% - Bấm để luyện riêng`}
                        >
                          {w.originalWord}
                        </button>
                        {w.omissionWarning && (
                          <span className="text-[10px] text-rose-600 font-bold mt-0.5 flex items-center gap-0.5 whitespace-nowrap">
                            ⚠️ {w.omissionWarning.replace('Thiếu âm đuôi ', '')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Standard Full-Text View */
              <p className={`text-lg font-black text-slate-800 leading-relaxed transition-all ${
                hideEnglish && currentTurn.speaker === 'User' ? 'blur-sm select-none hover:blur-none cursor-pointer' : ''
              }`}>
                {currentTurn.text}
              </p>
            )}

            {hideEnglish && currentTurn.speaker === 'User' && (
              <span className="text-[10px] text-amber-600 font-bold block mt-1">
                ⚡ Đang ẩn câu tiếng Anh. Rê chuột hoặc chạm vào đây để xem đáp án gợi ý.
              </span>
            )}

            <p className="text-xs text-slate-500 italic mt-2">
              {currentTurn.translation}
            </p>
          </div>
        </div>
      </div>

      {/* Latency & Accuracy Score Gauge */}
      {score !== null && (
        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 animate-fade-in">
          <div className="text-center p-2 rounded-xl bg-white shadow-sm">
            <span className="block text-[11px] font-bold text-slate-400">Độ chính xác phát âm (ELSA)</span>
            <span className={`text-2xl font-black ${
              score >= 85 ? 'text-emerald-600' : score >= 65 ? 'text-amber-600' : 'text-rose-600'
            }`}>
              {score}%
            </span>
            <span className="block text-[10px] text-slate-500 font-semibold mt-0.5">
              {score >= 85 ? '🟢 Chuẩn bản xứ (Mastery)' : score >= 65 ? '🟡 Gần đạt, cần rõ âm cuối' : '🔴 Cần luyện lại từng từ'}
            </span>
          </div>

          <div className="text-center p-2 rounded-xl bg-white shadow-sm">
            <span className="block text-[11px] font-bold text-slate-400">
              Thời gian phản xạ (Chuẩn: {activeLevelSpec.targetLatency})
            </span>
            <span className={`text-2xl font-black ${
              isSpeedAchieved ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {latencyMs ? (latencyMs / 1000).toFixed(1) : 1.2}s
            </span>
            <span className="block text-[10px] font-semibold mt-0.5">
              {isSpeedAchieved ? (
                <span className="text-emerald-600 font-bold">⚡ Phản xạ tự nhiên!</span>
              ) : (
                <span className="text-amber-600 font-bold">⏳ Cần luyện nhanh hơn {activeLevelSpec.targetLatency}</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Phonetic Diagnostic Advice (Nuốt âm / Missing Consonant Clusters) */}
      {detailedAssessment && detailedAssessment.omissionWarnings.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
          <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            Chẩn đoán lỗi nuốt âm (Phát hiện từ ELSA Speak):
          </p>
          <ul className="space-y-1 pl-5 text-xs text-amber-800 list-disc font-medium">
            {detailedAssessment.omissionWarnings.map((warning, wIdx) => (
              <li key={wIdx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Native Variations */}
      {currentTurn.nativeVariations && currentTurn.nativeVariations.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-100">
          <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Cách người bản xứ nói tự nhiên hơn (Native Phrasing):
          </p>
          <div className="flex flex-wrap gap-2">
            {currentTurn.nativeVariations.map((v, i) => (
              <span
                key={i}
                onClick={() => onSpeakText(v)}
                className="cursor-pointer text-xs font-semibold px-2.5 py-1 rounded-lg bg-white text-purple-800 border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1"
              >
                "{v}" <Volume2 className="w-3 h-3 text-purple-600" />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Control: Mic or Text */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        {currentTurn.speaker === 'User' ? (
          <div className="space-y-2">
            {/* Live Audio Energy Visualizer when Hands-free VAD or Recording */}
            {(isRecording || handsFreeVadActive) && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-xs text-slate-600 font-bold">
                <span className="size-2 rounded-full bg-rose-500 animate-ping" />
                <span>{handsFreeVadActive ? '🎙️ VAD đang tự động lắng nghe giọng nói...' : 'Đang ghi âm...'}</span>
                <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden ml-2">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-75 rounded-full"
                    style={{ width: `${Math.min(100, Math.round(audioEnergy * 400))}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleRecording}
                className={`flex-1 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 btn-3d transition-all ${
                  isRecording
                    ? 'bg-rose-500 text-white shadow-[0_4px_0_#be123c] animate-pulse'
                    : 'btn-3d-teal'
                }`}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-5 h-5" /> Đang nghe bạn nói... (Bấm để dừng)
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" /> Bấm Mic để nói câu phản xạ
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onNextTurn}
                className="px-5 py-4 rounded-2xl btn-3d btn-3d-orange font-black text-xs flex items-center gap-1 shadow-[0_3px_0_#d95e26]"
              >
                <span>{currentTurnIndex < totalTurns - 1 ? 'Lượt tiếp' : 'Hoàn thành'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onSpeakText(currentTurn.text)}
              className="flex-1 py-3.5 rounded-2xl btn-3d btn-3d-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <Volume2 className="w-4 h-4 text-teal-600" /> Nghe lại lời đối phương
            </button>
            <button
              type="button"
              onClick={onNextTurn}
              className="px-5 py-3.5 rounded-2xl btn-3d btn-3d-teal text-xs font-bold flex items-center gap-1"
            >
              <span>Đến lượt tôi nói</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Targeted Word Drill Modal (Reverse-Engineered from ELSA Speak) */}
      {drillingWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase text-teal-700 tracking-wider">
                🎯 Luyện phát âm từng từ (ELSA Drill)
              </span>
              <button
                type="button"
                onClick={() => setDrillingWord(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 py-2">
              <h3 className="text-3xl font-black text-slate-900">
                {drillingWord.originalWord}
              </h3>
              {drillingWord.ipaHint && (
                <span className="text-sm font-semibold text-teal-600 font-mono block">
                  {drillingWord.ipaHint}
                </span>
              )}
              {drillingWord.omissionWarning && (
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-1">
                  ⚠️ {drillingWord.omissionWarning}
                </span>
              )}
            </div>

            {/* Audio reference buttons */}
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleDrillListen(drillingWord.cleanWord, false)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                <Volume2 className="w-4 h-4 text-teal-600" /> Bình thường (1.0x)
              </button>
              <button
                type="button"
                onClick={() => handleDrillListen(drillingWord.cleanWord, true)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                <Volume1 className="w-4 h-4 text-amber-600" /> Nghe chậm (0.75x)
              </button>
            </div>

            {/* Drill result gauge */}
            {drillScore !== null && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 animate-fade-in">
                <span className="block text-xs font-bold text-slate-500">Điểm phát âm của bạn:</span>
                <span className={`text-2xl font-black ${
                  drillScore >= 85 ? 'text-emerald-600' : drillScore >= 65 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {drillScore}%
                </span>
                <p className="text-xs text-slate-600 mt-1">
                  {drillScore >= 85 
                    ? '🎉 Xuất sắc! Bạn đã phát âm chuẩn bản xứ!' 
                    : drillScore >= 65 
                    ? '🟡 Gần đạt! Chú ý bật rõ âm đuôi và thử lại.' 
                    : '🔴 Chưa đúng. Hãy nghe lại âm mẫu và thử lại.'}
                </p>
                {drillSpoken && (
                  <span className="text-[11px] text-slate-400 italic block mt-0.5">
                    Máy nghe được: "{drillSpoken}"
                  </span>
                )}
              </div>
            )}

            {/* Practice Mic Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => startDrillSpeechRecognition(drillingWord)}
                disabled={isDrillRecording}
                className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 btn-3d ${
                  isDrillRecording 
                    ? 'bg-rose-500 text-white animate-pulse' 
                    : 'btn-3d-teal'
                }`}
              >
                <Mic className="w-4 h-4" />
                {isDrillRecording ? 'Đang lắng nghe...' : 'Bấm để phát âm lại từ này'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
