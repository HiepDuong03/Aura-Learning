import React, { useState } from 'react';
import { 
  Home, 
  PlaySquare, 
  Mic, 
  Layers, 
  MoreHorizontal, 
  BookOpen, 
  Headphones, 
  Sprout, 
  User, 
  X,
  Sparkles
} from 'lucide-react';
import { ActiveTab } from './Sidebar';

interface MobileNavProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  savedWordsCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  savedWordsCount
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const mainItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number }[] = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'speaking', label: 'Luyện nói', icon: Mic, badge: 'Hot' },
    { id: 'shorts', label: 'Shorts', icon: PlaySquare },
    { id: 'review', label: 'Ôn tập', icon: Layers, badge: savedWordsCount > 0 ? savedWordsCount : undefined },
  ];

  const secondaryItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
    { id: 'words', label: 'Kho từ vựng', icon: BookOpen, description: 'Từ vựng đã lưu & phát âm chuẩn' },
    { id: 'listening', label: 'Luyện nghe', icon: Headphones, description: 'Chuyên đề nghe phản xạ' },
    { id: 'garden', label: 'Vườn cây', icon: Sprout, description: 'Trực quan hóa trí nhớ Anki' },
    { id: 'profile', label: 'Cá nhân', icon: User, description: 'Tiến độ học & thiết lập' },
  ];

  const isMoreActive = secondaryItems.some(item => item.id === activeTab);

  return (
    <>
      {/* Mobile More Drawer Sheet */}
      {isMoreOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in flex flex-col justify-end"
          onClick={() => setIsMoreOpen(false)}
        >
          <div 
            className="bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-100 space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-black text-slate-800">Tính năng mở rộng</h3>
              </div>
              <button 
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      setIsMoreOpen(false);
                    }}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl text-left transition-all border ${
                      isActive 
                        ? 'bg-teal-50 border-teal-300 text-teal-800 font-extrabold shadow-sm' 
                        : 'bg-slate-50/80 border-slate-100 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-teal-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{item.label}</p>
                      <p className="text-xs text-slate-400 truncate">{item.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar */}
      <nav 
        aria-label="Điều hướng di động"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden shadow-lg"
      >
        <ul className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex flex-col items-center justify-center w-full h-full gap-0.5 text-[11px] font-bold transition-all ${
                    isActive ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className={`flex items-center justify-center w-10 h-7 rounded-full transition-all ${
                    isActive ? 'bg-teal-50 text-teal-600 shadow-[0_2px_0_#0d9488]' : ''
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="absolute top-1 right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}

          {/* More Button */}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              aria-label="Thêm tính năng"
              className={`relative flex flex-col items-center justify-center w-full h-full gap-0.5 text-[11px] font-bold transition-all ${
                isMoreActive ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`flex items-center justify-center w-10 h-7 rounded-full transition-all ${
                isMoreActive ? 'bg-teal-50 text-teal-600 shadow-[0_2px_0_#0d9488]' : ''
              }`}>
                <MoreHorizontal className="w-5 h-5" />
              </div>
              <span>Thêm</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
};
