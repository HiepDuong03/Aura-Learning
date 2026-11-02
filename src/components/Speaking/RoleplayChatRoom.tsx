import React, { useRef, useEffect } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Volume2, 
  User, 
  Bot, 
  Mic, 
  MicOff, 
  Send
} from 'lucide-react';

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
  onSpeakText
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiThinking]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Persona Picker Carousel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {personas.map((p) => {
          const isSelected = selectedPersona.id === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPersona(p)}
              className={`p-4 rounded-3xl border text-left transition-all ${
                isSelected
                  ? 'bg-teal-600 text-white border-teal-600 shadow-md scale-[1.02]'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <img
                  src={p.avatar}
                  alt={p.name}
                  className="size-11 rounded-2xl object-cover ring-2 ring-white/50 shrink-0 shadow-xs"
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
      <div className="rounded-[36px] bg-white border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col h-[560px]">
        {/* Header Info */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img
              src={selectedPersona.avatar}
              alt={selectedPersona.name}
              className="size-10 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
            />
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Đối thoại với {selectedPersona.name} ({selectedPersona.role})
              </h3>
              <p className="text-[11px] text-teal-700 font-semibold truncate max-w-sm sm:max-w-md">
                🎯 Nhiệm vụ: {selectedPersona.mission}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRestartChat}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Bắt đầu lại cuộc hội thoại"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Message History List */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
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

                  {/* Native Rephrase Tip */}
                  {isUser && msg.nativeRephrase && (
                    <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-1.5 animate-fade-in">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Gợi ý cách nói tự nhiên hơn: </span>
                        <span>"{msg.nativeRephrase}"</span>
                      </div>
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

          <div ref={chatEndRef} />
        </div>

        {/* Input Controls */}
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
      </div>
    </div>
  );
};
