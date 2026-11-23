import React, { useRef, useEffect, useState } from 'react';
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
  Target
} from 'lucide-react';
import { AvatarBadge } from '../Common/AvatarBadge';

export interface RoleplayPersona {
  id: string;
  name: string;
  role: string;
  avatar: string;
  situation: string;
  mission: string;
  initialMessage: string;
  initialTranslation: string;
}

export interface ChatMessage {
  id: string;
  sender: 'AI' | 'User';
  text: string;
  translation?: string;
  nativeRephrase?: string;
  grammarTip?: string;
  latencyMs?: number;
}

interface RoleplayChatRoomProps {
  personas: RoleplayPersona[];
  selectedPersona: RoleplayPersona;
  onSelectPersona: (persona: RoleplayPersona) => void;
  messages: ChatMessage[];
  inputMessage: string;
  onChangeInput: (val: string) => void;
  onSendMessage: () => void;
  isAiThinking: boolean;
  isRecording: boolean;
  onToggleRecording: () => void;
  onRestartChat: () => void;
  onSpeakText: (text: string) => void;
  aiEngineLabel?: string;
  quotaBadge?: string;
  isLockedForGuest?: boolean;
  onRequestLogin?: () => void;
  missionProgress?: number;
  missionCompleted?: boolean;
  autoSendVoice?: boolean;
  onToggleAutoSendVoice?: () => void;
  onSavePhraseToSrs?: (phrase: string, contextSentence: string, tip?: string) => void;
}

export const RoleplayChatRoom: React.FC<RoleplayChatRoomProps> = ({
  personas,
  selectedPersona,
  onSelectPersona,
  messages,
  inputMessage,
  onChangeInput,
  onSendMessage,
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
  onSavePhraseToSrs
}) => {
  const chatListRef = useRef<HTMLDivElement>(null);
  const [savedRephraseIds, setSavedRephraseIds] = useState<Set<string>>(new Set());

  // Container-scoped auto-scroll (NEVER scrolls the outer window/header out of view!)
  useEffect(() => {
    const el = chatListRef.current;
    if (!el || messages.length <= 1) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isAiThinking]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Persona Picker Carousel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {personas.map((p) => {
          const isSelected = selectedPersona.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPersona(p)}
              className={`p-4 rounded-3xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md scale-[1.01]'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <AvatarBadge
                  src={p.avatar}
                  name={p.name}
                  className="size-11 rounded-2xl ring-2 ring-white/50 shadow-xs"
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-black truncate">{p.name}</h4>
                  <p className={`text-[11px] font-medium truncate ${isSelected ? 'text-teal-100' : 'text-slate-500'}`}>
                    {p.role}
                  </p>
                </div>
              </div>
              <p className={`text-xs line-clamp-2 ${isSelected ? 'text-teal-50' : 'text-slate-600'}`}>
                🎯 {p.mission}
              </p>
            </button>
          );
        })}
      </div>

      {/* Interactive Chat Canvas */}
      <div className={`rounded-[32px] bg-white border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col ${isLockedForGuest ? 'h-[360px]' : 'h-[480px] sm:h-[520px]'}`}>
        {/* Header Info */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <AvatarBadge
              src={selectedPersona.avatar}
              name={selectedPersona.name}
              className="size-10 rounded-xl ring-1 ring-slate-200"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">
                  Đối thoại với {selectedPersona.name} ({selectedPersona.role})
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
              <p className="text-[11px] text-teal-700 font-semibold truncate max-w-sm sm:max-w-md">
                🎯 Nhiệm vụ: {selectedPersona.mission}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onToggleAutoSendVoice && (
              <button
                type="button"
                onClick={onToggleAutoSendVoice}
                className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                  autoSendVoice
                    ? 'bg-teal-50 border-teal-200 text-teal-700'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
                title="Tự động gửi câu nói ngay khi bạn dừng nói bằng Mic"
              >
                <Mic className="w-3 h-3" />
                <span>{autoSendVoice ? 'Tự gửi giọng nói: Bật' : 'Tự gửi giọng nói: Tắt'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onRestartChat}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Bắt đầu lại cuộc hội thoại"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mission Completion Progress Bar */}
        <div className="pt-2.5 pb-1 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-600 shrink-0">
            {missionCompleted ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Target className="w-3.5 h-3.5 text-teal-600" />
            )}
            <span className={missionCompleted ? 'text-emerald-700' : ''}>
              {missionCompleted ? 'Hoàn thành nhiệm vụ!' : `Tiến độ nhiệm vụ: ${missionProgress}%`}
            </span>
          </div>
          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                missionCompleted ? 'bg-emerald-500' : 'bg-teal-500'
              }`}
              style={{ width: `${Math.max(4, Math.min(100, missionProgress))}%` }}
            />
          </div>
        </div>

        {/* Message History List */}
        <div ref={chatListRef} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {messages.map((msg) => {
            const isUser = msg.sender === 'User';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
              >
                <div className={`size-8 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                  isUser ? 'bg-orange-500 text-white' : 'bg-teal-600 text-white'
                }`}>
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`max-w-[80%] space-y-1.5 ${isUser ? 'items-end' : ''}`}>
                  <div className={`p-4 rounded-3xl ${
                    isUser
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-teal-50 border border-teal-100 text-slate-900 rounded-tl-none'
                  }`}>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-[11px] font-black opacity-70">
                        {isUser ? 'Bạn' : selectedPersona.name}
                      </span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => onSpeakText(msg.text)}
                          className="text-teal-700 hover:text-teal-900 p-0.5 rounded"
                          title="Nghe phát âm"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm font-semibold leading-relaxed">{msg.text}</p>
                    {msg.translation && (
                      <p className="text-xs text-slate-500 italic mt-1">{msg.translation}</p>
                    )}
                  </div>

                  {/* Native Rephrase & Grammar Tip + 1-Click Save to FSRS-6 */}
                  {isUser && (msg.nativeRephrase || msg.grammarTip) && (
                    <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5 animate-fade-in">
                      {msg.nativeRephrase && (
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Gợi ý cách nói tự nhiên hơn: </span>
                              <span>"{msg.nativeRephrase}"</span>
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
                              className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 shrink-0 transition-all ${
                                savedRephraseIds.has(msg.id)
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-white hover:bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                              title="Lưu câu chuẩn bản xứ này vào Kho từ vựng FSRS-6 để ôn tập"
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
                        <p className="text-[11px] text-amber-800/90 pl-5 font-medium">
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
                className="px-4 py-2 rounded-xl btn-3d btn-3d-teal text-xs font-black shrink-0"
              >
                Đăng nhập ngay
              </button>
            )}
          </div>
        ) : (
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleRecording}
            className={`p-3 rounded-2xl transition-all shadow-sm shrink-0 ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse'
                : 'bg-teal-50 hover:bg-teal-100 text-teal-700'
            }`}
            title={isRecording ? 'Đang ghi âm... Nhấn để dừng' : 'Bấm mic để nói trực tiếp'}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
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
            placeholder={`Trả lời ${selectedPersona.name} bằng tiếng Anh...`}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
          />

          <button
            type="button"
            onClick={onSendMessage}
            disabled={!inputMessage.trim() || isAiThinking}
            className="p-3 rounded-2xl btn-3d btn-3d-teal disabled:opacity-40 transition-all shrink-0"
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
