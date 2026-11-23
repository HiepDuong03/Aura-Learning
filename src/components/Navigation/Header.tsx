import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Mic, 
  Plus, 
  ArrowRight, 
  Flame, 
  ChevronDown, 
  LogIn, 
  User, 
  LogOut, 
  Users,
  ShieldCheck,
  X
} from 'lucide-react';
import { AnkiUserProfile, AuthUser } from '../../types';
import { ActiveTab } from './Sidebar';
import { useNotify } from '../Common/ToastProvider';

interface HeaderProps {
  activeTab?: ActiveTab;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenImport: () => void;
  streakDays: number;
  activeProfile?: AnkiUserProfile;
  currentUser?: AuthUser | null;
  onOpenProfileSwitcher?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'roadmap',
  searchQuery,
  onSearchChange,
  onOpenImport,
  streakDays,
  activeProfile,
  currentUser,
  onOpenProfileSwitcher,
  onOpenAuth,
  onLogout,
  onOpenAdmin,
}) => {
  const { toast } = useNotify();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const searchPlaceholder =
    activeTab === 'roadmap'
      ? 'Tìm chủ đề IELTS, CEFR hoặc bài học...'
      : activeTab === 'watch'
        ? 'Tìm kiếm video, chủ đề hoặc kênh...'
        : 'Tìm kiếm video hoặc từ vựng...';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-3.5 py-2.5 sm:px-4 sm:py-3 lg:px-8">
      <div className="flex items-center justify-between gap-2.5 sm:gap-3 max-w-7xl mx-auto">
        {/* Compact Brand Logo on Mobile/Tablet (when Desktop Sidebar is hidden) */}
        <div className="flex items-center gap-2 lg:hidden shrink-0">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-teal-400 text-white font-black text-sm shadow-[0_2px_0_#0f766e]">
            4U
          </div>
          <span className="hidden xs:inline text-base font-black tracking-tight text-slate-800">
            <span className="text-teal-600">4</span>
            <span className="text-orange-500">You</span>
          </span>
        </div>

        {/* Desktop / Tablet Search Bar */}
        <div className="hidden sm:block flex-1 max-w-xl">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-10 pl-10 pr-10 rounded-full border border-slate-200 bg-slate-50/70 text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
            <button
              type="button"
              onClick={() => {
                const SpeechRecognition = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
                  (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

                if (!SpeechRecognition) {
                  toast.info('Trình duyệt chưa hỗ trợ Web Speech API. Vui lòng dùng Chrome hoặc Edge.');
                  return;
                }
                try {
                  const recognition = new SpeechRecognition();
                  recognition.lang = 'en-US';
                  recognition.interimResults = false;
                  recognition.onstart = () => {
                    onSearchChange('Đang nghe giọng nói...');
                  };
                  recognition.onresult = (e: any) => {
                    const transcript = e.results[0]?.[0]?.transcript || '';
                    onSearchChange(transcript);
                  };
                  recognition.onerror = () => {
                    onSearchChange('');
                  };
                  recognition.start();
                } catch (err) {
                  console.warn('Voice search error:', err);
                }
              }}
              className="absolute right-2.5 p-1.5 rounded-full text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors active:scale-95"
              title="Tìm kiếm bằng giọng nói"
              aria-label="Tìm kiếm bằng giọng nói"
            >
              <Mic className="w-4 h-4" />
            </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
          {/* Mobile Search Trigger */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen((prev) => !prev)}
            className={`sm:hidden flex items-center justify-center size-9 rounded-full border transition-colors cursor-pointer ${
              isMobileSearchOpen || searchQuery
                ? 'bg-teal-50 border-teal-300 text-teal-700'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            aria-label="Mở tìm kiếm"
          >
            {isMobileSearchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
          </button>
          {/* Auth State: Logged In vs Logged Out */}
          {currentUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 h-10 px-2.5 sm:px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-xs text-xs font-black text-slate-800"
              >
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="size-6 rounded-full object-cover ring-2 ring-teal-500 shrink-0"
                />
                <span className="hidden sm:inline max-w-[110px] truncate">{currentUser.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-100 p-2 z-50 animate-fade-in space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-black text-slate-900 truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full ${
                        currentUser.role === 'admin' 
                          ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                          : currentUser.role === 'pro'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-teal-50 text-teal-700 border border-teal-200/60'
                      }`}>
                        <ShieldCheck className="w-3 h-3 text-current" />
                        {currentUser.role === 'admin' ? '🛡️ Quản trị viên (Admin)' : currentUser.role === 'pro' ? '👑 Thành viên Pro' : '🌱 Học viên Thành viên'}
                      </span>
                    </div>
                  </div>

                  {currentUser.role === 'admin' && onOpenAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAdmin();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-black text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>Bảng Quản Trị Hệ Thống</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenProfileSwitcher?.();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2"
                  >
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>Đổi Anki Profile</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout?.();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md shadow-teal-600/20 transition-all active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Đăng nhập</span>
            </button>
          )}

          {/* Language Pair Status Pill (Non-interactive indicator) */}
          <div
            className="hidden lg:flex items-center gap-1.5 h-9 px-3 rounded-full bg-slate-50 border border-slate-200/70 text-[11px] font-black text-slate-500 select-none"
            title="Cặp ngôn ngữ học tập: Tiếng Anh (US/UK) → Tiếng Việt"
          >
            <span>EN</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span>VI</span>
          </div>

          {/* Streak Indicator (visible on small screens) */}
          <div className="flex items-center gap-1 h-9 px-2.5 rounded-full bg-orange-50 border border-orange-200/80 text-orange-600 font-black text-xs sm:hidden shrink-0">
            <Flame className="w-3.5 h-3.5 fill-orange-500" />
            <span>{streakDays}</span>
          </div>

          {/* Import YouTube Button */}
          <button
            type="button"
            onClick={onOpenImport}
            className="flex items-center gap-1.5 h-9 sm:h-10 px-3 sm:px-4 rounded-full btn-3d btn-3d-orange text-xs font-bold shadow-[0_3px_0_#d95e26] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span className="hidden sm:inline">Dán link YouTube</span>
            <span className="sm:hidden">Nhập</span>
          </button>
        </div>
      </div>

      {/* Expandable Full-Width Mobile Search Row */}
      {isMobileSearchOpen && (
        <div className="sm:hidden pt-2.5 pb-0.5 animate-fade-in">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-10 pl-10 pr-9 rounded-full border border-teal-300 bg-white text-sm font-medium placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-700"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
