import React from 'react';
import { 
  Home, 
  PlaySquare, 
  BookOpen, 
  Headphones, 
  Mic, 
  Layers, 
  Sprout, 
  User,
  Sparkles,
  Flame
} from 'lucide-react';

export type ActiveTab = 'home' | 'shorts' | 'words' | 'listening' | 'speaking' | 'review' | 'garden' | 'profile';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  savedWordsCount: number;
  streakDays: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  savedWordsCount,
  streakDays
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; color: string; badge?: string | number }[] = [
    { id: 'home', label: 'Trang chủ', icon: Home, color: 'text-teal-600' },
    { id: 'shorts', label: 'Shorts Video', icon: PlaySquare, color: 'text-rose-500', badge: 'Hot' },
    { id: 'words', label: 'Kho từ vựng', icon: BookOpen, color: 'text-amber-500' },
    { id: 'listening', label: 'Luyện nghe', icon: Headphones, color: 'text-sky-500' },
    { id: 'speaking', label: 'Luyện nói & AI Roleplay', icon: Mic, color: 'text-emerald-500' },
    { id: 'review', label: 'Ôn tập SRS', icon: Layers, color: 'text-purple-500', badge: savedWordsCount > 0 ? savedWordsCount : undefined },
    { id: 'garden', label: 'Vườn từ vựng', icon: Sprout, color: 'text-lime-600' },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white/95 backdrop-blur-md lg:flex shadow-sm">
      {/* Brand Logo */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-slate-100">
        <button 
          onClick={() => onSelectTab('home')}
          className="group flex items-center gap-3 text-left"
        >
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-400 text-white font-black text-xl shadow-[0_3px_0_#0f766e] group-hover:scale-105 group-hover:-rotate-3 transition-all duration-200">
            4U
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-slate-800">
              <span className="text-teal-600">4</span>
              <span className="text-orange-500">You</span>
            </span>
            <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              Pro App
            </span>
          </div>
        </button>
      </div>

      {/* Streak Banner */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_2px_0_#c2410c] animate-bounce">
              <Flame className="w-5 h-5 fill-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500">Chuỗi học tập</p>
              <p className="text-sm font-black text-orange-600">{streakDays} ngày liên tiếp!</p>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-amber-500" />
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        <p className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
          Học tập & Rèn luyện
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-all duration-150 btn-3d ${
                isActive
                  ? 'bg-teal-600 text-white shadow-[0_3px_0_#0f766e] translate-y-[-1px]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : item.color}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  isActive 
                    ? 'bg-white text-teal-700' 
                    : 'bg-orange-100 text-orange-600'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-4">
          <p className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
            Cá nhân
          </p>
          <button
            onClick={() => onSelectTab('profile')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-all btn-3d ${
              activeTab === 'profile'
                ? 'bg-teal-600 text-white shadow-[0_3px_0_#0f766e]'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className={`w-5 h-5 ${activeTab === 'profile' ? 'text-white' : 'text-slate-500'}`} />
            <span>Hồ sơ học tập</span>
          </button>
        </div>
      </nav>

      {/* Pro Badge Footer */}
      <div className="p-4 border-t border-slate-100">
        <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-100 text-center">
          <p className="text-xs font-bold text-teal-900">Mở khóa vô hạn</p>
          <p className="text-[11px] text-teal-700 mt-0.5">Không giới hạn bài học & tự do import YouTube</p>
        </div>
      </div>
    </aside>
  );
};
