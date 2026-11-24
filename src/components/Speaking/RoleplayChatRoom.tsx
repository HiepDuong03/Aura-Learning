import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  Volume2,
  User,
  Bot,
  Mic,
  MicOff,
  Send,
  BookmarkPlus,
  BookmarkCheck,
  CheckCircle2,
  Target,
  Languages,
  EyeOff,
  Eye,
  Lightbulb,
  FileBarChart2,
  SlidersHorizontal,
  PhoneCall,
  Plus,
  Pencil,
  Gauge,
  VolumeX
} from 'lucide-react';
import { AvatarBadge } from '../Common/AvatarBadge';
import { InteractiveChatText } from './InteractiveChatText';
import { ChatDisplayMode, CorrectionMode, SavedWord, TurnQualityRating } from '../../types';

export interface RoleplayPersona {
  id: string;
  name: string;
  role: string;
  avatar: string;
  situation: string;
  mission: string;
  initialMessage: string;
  initialTranslation: string;
  isCustom?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'AI' | 'User';
  text: string;
  translation?: string;
  correction?: string;
  nativeRephrase?: string;
  grammarTip?: string;
  qualityRating?: TurnQualityRating;
  suggestedReplies?: string[];
  latencyMs?: number;
}

const CORRECTION_MODE_OPTIONS: Array<{
  id: CorrectionMode;
  label: string;
  shortDesc: string;
}> = [
  { id: 'written', label: 'Sửa dạng chữ', shortDesc: 'Hiện thẻ sửa lỗi dưới câu nói, không ngắt lời' },
  { id: 'verbal_subtle', label: 'Sửa ngầm tự nhiên', shortDesc: 'AI khéo léo lặp lại câu đúng trong lời đáp' },
  { id: 'verbal_explicit', label: 'Sửa trực tiếp', shortDesc: 'AI chỉ lỗi ngắn gọn rồi nói tiếp' },
  { id: 'verbal_repeat', label: 'Bắt lặp lại', shortDesc: 'AI mời bạn nói lại câu đúng để nhớ sâu' },
  { id: 'off', label: 'Tắt (Chỉ báo cáo cuối)', shortDesc: 'Nói tự do không gián đoạn, xem lỗi ở báo cáo' }
];

const QUALITY_BADGE_MAP: Record<TurnQualityRating, { label: string; className: string }> = {
  perfect: { label: '✓ Perfect', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  good: { label: '★ Good', className: 'bg-teal-100 text-teal-800 border-teal-200' },
  revision_needed: { label: '✎ Cần sửa', className: 'bg-amber-100 text-amber-800 border-amber-200' }
};

interface RoleplayChatRoomProps {
  personas: RoleplayPersona[];
  selectedPersona: RoleplayPersona;
  onSelectPersona: (persona: RoleplayPersona) => void;
  onCreateCustomPersona?: (custom: { title: string; partnerRole: string; mission: string }) => void;
  messages: ChatMessage[];
  inputMessage: string;
  onChangeInput: (val: string) => void;
  onSendMessage: () => void;
  onSendQuickReply?: (text: string) => void;
  isAiThinking: boolean;
  isRecording: boolean;
  onToggleRecording: () => void;
  onRestartChat: () => void;
  onSpeakText: (text: string, speed?: number) => void;
  aiEngineLabel?: string;
  quotaBadge?: string;
  isLockedForGuest?: boolean;
  onRequestLogin?: () => void;
  missionProgress?: number;
  missionCompleted?: boolean;
  autoSendVoice?: boolean;
  onToggleAutoSendVoice?: () => void;
  onSavePhraseToSrs?: (phrase: string, contextSentence: string, tip?: string) => void;
  onWordClick?: (word: string, contextSentence: string) => void;
  savedWords?: SavedWord[];
  correctionMode: CorrectionMode;
  onChangeCorrectionMode: (mode: CorrectionMode) => void;
  displayMode: ChatDisplayMode;
  onToggleDisplayMode: () => void;
  isCallModeVad: boolean;
  onToggleCallModeVad: () => void;
  noisyMode: boolean;
  onToggleNoisyMode: () => void;
  audioEnergy?: number;
  onOpenFeedbackReport?: () => void;
}

export const RoleplayChatRoom: React.FC<RoleplayChatRoomProps> = ({
  personas,
  selectedPersona,
  onSelectPersona,
  onCreateCustomPersona,
  messages,
  inputMessage,
  onChangeInput,
  onSendMessage,
  onSendQuickReply,
  isAiThinking,
  isRecording,
  onToggleRecording,
  onRestartChat,
  onSpeakText,
  aiEngineLabel,
  quotaBadge,
  isLockedForGuest = false,
  onRequestLogin,
  missionProgress = 0,
  missionCompleted = false,
  autoSendVoice = true,
  onToggleAutoSendVoice,
  onSavePhraseToSrs,
  onWordClick,
  savedWords = [],
  correctionMode,
  onChangeCorrectionMode,
  displayMode,
  onToggleDisplayMode,
  isCallModeVad,
  onToggleCallModeVad,
  noisyMode,
  onToggleNoisyMode,
  audioEnergy = 0,
  onOpenFeedbackReport
}) => {
  const chatListRef = useRef<HTMLDivElement>(null);
  const [savedRephraseIds, setSavedRephraseIds] = useState<Set<string>>(new Set());
  const [visibleTranslations, setVisibleTranslations] = useState<Set<string>>(new Set());
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [showSettingsBar, setShowSettingsBar] = useState<boolean>(false);
  const [showCustomCreator, setShowCustomCreator] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customPartnerRole, setCustomPartnerRole] = useState<string>('');
  const [customMission, setCustomMission] = useState<string>('');

  const savedWordSet = useMemo(() => {
    const set = new Set<string>();
    savedWords.forEach((w) => {
      if (w?.word) set.add(w.word.toLowerCase().trim());
    });
    return set;
  }, [savedWords]);

  const userTurnCount = useMemo(
    () => messages.filter((m) => m.sender === 'User').length,
    [messages]
  );

  const latestSuggestions = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m && m.sender === 'AI' && Array.isArray(m.suggestedReplies) && m.suggestedReplies.length > 0) {
        return m.suggestedReplies;
      }
    }
    return [
      'Could you give me a moment to think about that?',
      'Hi! Thanks for having me. Let me explain what I need today.',
      'Actually, I have a quick question about this.'
    ];
  }, [messages]);

  // Container-scoped auto-scroll (NEVER scrolls the outer window/header out of view!)
  useEffect(() => {
    const el = chatListRef.current;
    if (!el || messages.length <= 1) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isAiThinking]);

  const toggleTranslation = (msgId: string) => {
    setVisibleTranslations((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const toggleFeedbackCard = (msgId: string) => {
    setExpandedFeedbackIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  };

  const handleSubmitCustomRoleplay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateCustomPersona || !customTitle.trim()) return;
    onCreateCustomPersona({
      title: customTitle.trim(),
      partnerRole: customPartnerRole.trim() || 'Đối tác giao tiếp bản xứ',
      mission: customMission.trim() || `Xử lý tình huống "${customTitle.trim()}" tự nhiên và rõ ràng.`
    });
    setCustomTitle('');
    setCustomPartnerRole('');
    setCustomMission('');
    setShowCustomCreator(false);
  };

  const currentCorrectionMeta =
    CORRECTION_MODE_OPTIONS.find((opt) => opt.id === correctionMode) || CORRECTION_MODE_OPTIONS[0];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Compact Persona Picker Carousel + Custom Roleplay Creator (Fluently UX) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="text-xs font-black text-slate-600">
            Chọn nhân vật nhập vai ({personas.length}) · bấm từ bất kỳ trong chat để tra & lưu SRS
          </span>
          {onCreateCustomPersona && (
            <button
              type="button"
              onClick={() => setShowCustomCreator((v) => !v)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-black transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tự tạo tình huống</span>
            </button>
          )}
        </div>

        {showCustomCreator && onCreateCustomPersona && (
          <form
            onSubmit={handleSubmitCustomRoleplay}
            className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200 space-y-3 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-orange-950">
                ✨ Mô tả tình huống đời thực / công sở / IELTS của riêng bạn (AI nhập vai ngay)
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                required
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Tình huống (VD: Báo cáo sếp dự án trễ 2 ngày)"
                className="px-3 py-2 rounded-xl bg-white border border-orange-200 text-xs font-semibold focus:border-teal-500 outline-none"
              />
              <input
                type="text"
                value={customPartnerRole}
                onChange={(e) => setCustomPartnerRole(e.target.value)}
                placeholder="Vai của AI (VD: Quản lý dự án khó tính)"
                className="px-3 py-2 rounded-xl bg-white border border-orange-200 text-xs font-semibold focus:border-teal-500 outline-none"
              />
              <input
                type="text"
                value={customMission}
                onChange={(e) => setCustomMission(e.target.value)}
                placeholder="Mục tiêu của bạn (VD: Giải thích lý do & xin gia hạn)"
                className="px-3 py-2 rounded-xl bg-white border border-orange-200 text-xs font-semibold focus:border-teal-500 outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCustomCreator(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black cursor-pointer"
              >
                Bắt đầu nhập vai ngay
              </button>
            </div>
          </form>
        )}

        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
          {personas.map((p) => {
            const isSelected = selectedPersona.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPersona(p)}
                className={`px-3.5 py-2.5 rounded-2xl border text-left transition-all cursor-pointer shrink-0 w-56 ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AvatarBadge
                    src={p.avatar}
                    name={p.name}
                    className="size-9 rounded-xl ring-2 ring-white/50 shadow-xs shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="text-xs font-black truncate">{p.name}</h4>
                    <p className={`text-[10px] font-semibold truncate ${isSelected ? 'text-teal-100' : 'text-slate-500'}`}>
                      {p.role}
                    </p>
                  </div>
                </div>
                <p className={`text-[11px] line-clamp-1 mt-1.5 ${isSelected ? 'text-teal-50' : 'text-slate-600'}`}>
                  🎯 {p.mission}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Langua-Grade Chat Canvas */}
      <div className={`rounded-[28px] bg-white border border-slate-200/80 p-4 sm:p-5 shadow-sm flex flex-col ${isLockedForGuest ? 'h-[400px]' : 'h-[540px] sm:h-[580px]'}`}>
        {/* Top Header Info + Langua Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <AvatarBadge
              src={selectedPersona.avatar}
              name={selectedPersona.name}
              className="size-10 rounded-xl ring-1 ring-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-sm font-black text-slate-900 truncate">
                  {selectedPersona.name} · <span className="font-bold text-slate-500">{selectedPersona.role}</span>
                </h3>
                {aiEngineLabel && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    aiEngineLabel.includes('Live AI')
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {aiEngineLabel}
                  </span>
                )}
                {quotaBadge && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                    {quotaBadge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-teal-700 font-semibold truncate max-w-md">
                🎯 {selectedPersona.mission}
              </p>
            </div>
          </div>

          {/* Action Toolbar: Call Mode, Listen-First, Settings, Feedback Report, Restart */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onToggleCallModeVad}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                isCallModeVad
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs animate-pulse'
                  : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
              title="Bật Call Mode rảnh tay: tự động nghe khi bạn nói và gửi khi dừng 850ms"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>{isCallModeVad ? 'Call Mode: Đang nghe' : 'Call Mode'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleDisplayMode}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                displayMode === 'audio_only'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Chế độ Nghe trước (Listen-First): làm mờ chữ của AI để luyện tai nghe"
            >
              {displayMode === 'audio_only' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {displayMode === 'audio_only' ? 'Ẩn chữ: Bật' : 'Nghe trước'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsBar((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                showSettingsBar
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Chọn chế độ sửa lỗi AI & lọc ồn môi trường"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{currentCorrectionMeta?.label}</span>
            </button>

            {onOpenFeedbackReport && (
              <button
                type="button"
                onClick={onOpenFeedbackReport}
                disabled={userTurnCount < 1}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer disabled:opacity-40 ${
                  userTurnCount >= 3 || missionCompleted
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 shadow-xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                }`}
                title="Tổng kết lỗi sai, chấm điểm CEFR và lưu từ vựng FSRS-6"
              >
                <FileBarChart2 className="w-3.5 h-3.5" />
                <span>
                  Báo cáo {userTurnCount >= 3 ? 'AI' : `(${userTurnCount}/3)`}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onRestartChat}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Bắt đầu lại cuộc hội thoại"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Langua Settings Strip (5 Correction Modes + Noisy Mode + Auto-Send) */}
        {showSettingsBar && (
          <div className="py-2.5 px-3 mt-2 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Chế độ sửa lỗi của AI (chuẩn Langua):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleNoisyMode}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                    noisyMode
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Tăng ngưỡng nhận giọng VAD để lọc tiếng ồn ở quán cà phê / nơi công cộng"
                >
                  <VolumeX className="w-3 h-3" />
                  <span>Lọc ồn quán cà phê: {noisyMode ? 'Bật' : 'Tắt'}</span>
                </button>
                {onToggleAutoSendVoice && (
                  <button
                    type="button"
                    onClick={onToggleAutoSendVoice}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                      autoSendVoice
                        ? 'bg-teal-50 border-teal-200 text-teal-800'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>Tự gửi khi dừng nói: {autoSendVoice ? 'Bật' : 'Tắt'}</span>
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CORRECTION_MODE_OPTIONS.map((opt) => {
                const active = correctionMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeCorrectionMode(opt.id)}
                    title={opt.shortDesc}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      active
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              ℹ️ {currentCorrectionMeta?.shortDesc}
            </p>
          </div>
        )}

        {/* Mission Progress + Live Call Energy Indicator */}
        <div className="pt-2.5 pb-1 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 shrink-0">
            {missionCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Target className="w-3.5 h-3.5 text-teal-600" />
            )}
            <span className={missionCompleted ? 'text-emerald-700' : ''}>
              {missionCompleted ? 'Hoàn thành nhiệm vụ!' : `Tiến độ: ${missionProgress}%`}
            </span>
          </div>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                missionCompleted ? 'bg-emerald-500' : 'bg-teal-500'
              }`}
              style={{ width: `${Math.max(4, Math.min(100, missionProgress))}%` }}
            />
          </div>
          {isCallModeVad && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-black text-emerald-700">VAD</span>
              <div className="w-14 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-75"
                  style={{ width: `${Math.min(100, Math.round(audioEnergy * 600))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Message History List */}
        <div ref={chatListRef} className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
          {messages.map((msg) => {
            const isUser = msg.sender === 'User';
            const showTrans = visibleTranslations.has(msg.id);
            const hasFeedback = Boolean(msg.correction || msg.nativeRephrase || msg.grammarTip);
            const isFeedbackVisible =
              hasFeedback &&
              (correctionMode === 'written'
                ? !expandedFeedbackIds.has(msg.id)
                : expandedFeedbackIds.has(msg.id));
            const ratingMeta = msg.qualityRating ? QUALITY_BADGE_MAP[msg.qualityRating] : null;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div className={`size-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  isUser ? 'bg-orange-500 text-white' : 'bg-teal-600 text-white'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`max-w-[84%] space-y-1.5 flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3.5 rounded-3xl ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-teal-50 border border-teal-100 text-slate-900 rounded-tl-none'
                  }`}>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black opacity-70">
                          {isUser ? 'Bạn' : selectedPersona.name}
                        </span>
                        {isUser && ratingMeta && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black border ${ratingMeta.className}`}>
                            {ratingMeta.label}
                          </span>
                        )}
                      </div>

                      {/* AI Audio & Translation Micro-Actions (Langua UX) */}
                      {!isUser && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSpeakText(msg.text, 0.96)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-teal-700 hover:bg-teal-100 cursor-pointer"
                            title="Nghe tốc độ chuẩn (1.0x)"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onSpeakText(msg.text, 0.72)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-black text-teal-700 hover:bg-teal-100 cursor-pointer"
                            title="Nghe chậm 0.75x từng từ"
                          >
                            <Gauge className="w-3 h-3" />
                            <span>0.75x</span>
                          </button>
                          {msg.translation && (
                            <button
                              type="button"
                              onClick={() => toggleTranslation(msg.id)}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px] font-black cursor-pointer transition-colors ${
                                showTrans
                                  ? 'bg-teal-600 text-white'
                                  : 'text-teal-700 hover:bg-teal-100'
                              }`}
                              title="Hiện / Ẩn bản dịch tiếng Việt"
                            >
                              <Languages className="w-3 h-3" />
                              <span>Dịch</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <InteractiveChatText
                      text={msg.text}
                      isUser={isUser}
                      blurred={!isUser && displayMode === 'audio_only'}
                      savedWordSet={savedWordSet}
                      onWordClick={onWordClick}
                    />

                    {!isUser && msg.translation && showTrans && (
                      <p className="text-xs text-slate-600 italic mt-2 pt-1.5 border-t border-teal-200/70">
                        🇻🇳 {msg.translation}
                      </p>
                    )}
                  </div>

                  {/* User Micro-Action Pills (Langua: Pencil Correction + Magic Alternative + Listen) */}
                  {isUser && hasFeedback && (
                    <div className="flex flex-wrap items-center gap-1.5 px-1">
                      <button
                        type="button"
                        onClick={() => toggleFeedbackCard(msg.id)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border cursor-pointer transition-all ${
                          isFeedbackVisible
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-800'
                        }`}
                        title="Xem / Ẩn sửa lỗi ngữ pháp và cách nói tự nhiên bản xứ"
                      >
                        {msg.correction ? <Pencil className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
                        <span>
                          {isFeedbackVisible
                            ? 'Ẩn góp ý AI'
                            : msg.correction
                              ? 'Xem sửa lỗi & bản xứ'
                              : 'Cách nói bản xứ'}
                        </span>
                      </button>
                      {msg.nativeRephrase && (
                        <button
                          type="button"
                          onClick={() => onSpeakText(msg.nativeRephrase || msg.text, 0.92)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-teal-700 border border-slate-200 hover:bg-teal-50 cursor-pointer"
                          title="Nghe cách người bản xứ nói câu này"
                        >
                          <Volume2 className="w-2.5 h-2.5" /> Nghe câu chuẩn
                        </button>
                      )}
                    </div>
                  )}

                  {/* 3-Tier Langua + Fluently Feedback Card */}
                  {isUser && isFeedbackVisible && (
                    <div className="w-full p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 space-y-2 animate-fade-in">
                      {msg.correction && (
                        <div className="flex items-start gap-1.5 text-rose-800">
                          <Pencil className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-black">Sửa ngữ pháp: </span>
                            <span className="font-bold">“{msg.correction}”</span>
                          </div>
                        </div>
                      )}
                      {msg.nativeRephrase && (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-black">Cách nói bản xứ: </span>
                              <span className="font-semibold">“{msg.nativeRephrase}”</span>
                            </div>
                          </div>
                          {onSavePhraseToSrs && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!msg.nativeRephrase || savedRephraseIds.has(msg.id)) return;
                                onSavePhraseToSrs(msg.nativeRephrase, msg.text, msg.grammarTip);
                                setSavedRephraseIds((prev) => new Set(prev).add(msg.id));
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                                savedRephraseIds.has(msg.id)
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-white hover:bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                              title="Lưu câu chuẩn bản xứ này vào Kho từ vựng FSRS-6"
                            >
                              {savedRephraseIds.has(msg.id) ? (
                                <>
                                  <BookmarkCheck className="w-3 h-3" /> Đã lưu SRS
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="w-3 h-3" /> + Lưu SRS
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                      {msg.grammarTip && (
                        <p className="text-[11px] text-amber-900/90 pl-5 font-medium">
                          💡 {msg.grammarTip}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isAiThinking && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 p-2">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
              <span>{selectedPersona.name} đang suy nghĩ câu trả lời...</span>
            </div>
          )}
        </div>

        {/* Langua Suggested Replies Drawer (When learner is stuck) */}
        {!isLockedForGuest && showSuggestions && latestSuggestions.length > 0 && (
          <div className="py-2 px-2.5 mb-2 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-indigo-800 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Gợi ý 3 câu trả lời tự nhiên (bấm để gửi hoặc nghe thử):
              </span>
              <button
                type="button"
                onClick={() => setShowSuggestions(false)}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Ẩn
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {latestSuggestions.map((sug, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1 bg-white border border-indigo-200 rounded-xl pl-2.5 pr-1 py-1 text-xs font-semibold text-slate-800 shadow-2xs"
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (onSendQuickReply) {
                        onSendQuickReply(sug);
                      } else {
                        onChangeInput(sug);
                      }
                      setShowSuggestions(false);
                    }}
                    className="text-left hover:text-teal-700 cursor-pointer"
                  >
                    {sug}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSpeakText(sug, 0.92)}
                    className="p-1 rounded-lg text-indigo-600 hover:bg-indigo-50 cursor-pointer shrink-0"
                    title="Nghe thử câu gợi ý"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Controls or Auth Gate */}
        {isLockedForGuest ? (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl">
            <p className="text-xs font-bold text-slate-700">
              Đăng nhập tài khoản miễn phí để mở khóa 20 lượt AI mỗi ngày (hoặc không giới hạn với Pro).
            </p>
            {onRequestLogin && (
              <button
                type="button"
                onClick={onRequestLogin}
                className="px-4 py-2 rounded-xl btn-3d btn-3d-teal text-xs font-black shrink-0 cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            )}
          </div>
        ) : (
          <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleRecording}
              className={`p-3 rounded-2xl transition-all shadow-sm shrink-0 cursor-pointer ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-teal-50 hover:bg-teal-100 text-teal-700'
              }`}
              title={isRecording ? 'Đang ghi âm... Nhấn để dừng' : 'Bấm mic để nói trực tiếp'}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowSuggestions((v) => !v)}
              className={`p-3 rounded-2xl border transition-all shrink-0 cursor-pointer ${
                showSuggestions
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-slate-50 hover:bg-amber-50 border-slate-200 text-slate-600 hover:text-amber-700'
              }`}
              title="Bí ý tưởng? Xem 3 gợi ý trả lời tự nhiên"
            >
              <Lightbulb className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputMessage}
              onChange={(e) => onChangeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              placeholder={
                isCallModeVad
                  ? `Call Mode đang bật — cứ nói tự nhiên với ${selectedPersona.name}...`
                  : `Trả lời ${selectedPersona.name} bằng tiếng Anh...`
              }
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
            />

            <button
              type="button"
              onClick={onSendMessage}
              disabled={!inputMessage.trim() || isAiThinking}
              className="p-3 rounded-2xl btn-3d btn-3d-teal disabled:opacity-40 transition-all shrink-0 cursor-pointer"
              title="Gửi tin nhắn"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
