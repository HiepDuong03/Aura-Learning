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
  ShieldCheck
} from 'lucide-react';
import { AnkiUserProfile, AuthUser } from '../../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenImport: () => void;
  streakDays: number;
  activeProfile?: AnkiUserProfile;
  currentUser?: AuthUser | null;
  onOpenProfileSwitcher?: () => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenImport,
  streakDays,
  activeProfile,
  currentUser,
  onOpenProfileSwitcher,
  onOpenAuth,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

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
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 py-3 lg:px-8">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Search Bar */}
        <div className="flex-1 max-w-xl">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm kiếm video hoặc từ vựng..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full h-10 pl-10 pr-10 rounded-full border border-slate-200 bg-slate-50/70 text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => {
                const SpeechRecognition = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
                  (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

                if (!SpeechRecognition) {
                  alert('Trình duyệt chưa hỗ trợ Web Speech API. Vui lòng dùng Chrome hoặc Edge.');
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
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
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
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full mt-1">
                      <ShieldCheck className="w-3 h-3 text-teal-600" /> Tài khoản Cloud Active
                    </span>
                  </div>

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
            <div className="flex items-center gap-2">
              {/* Profile Pill for Guest */}
              {activeProfile && (
                <button
                  type="button"
                  onClick={onOpenProfileSwitcher}
                  className="hidden sm:flex items-center gap-1.5 h-10 px-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-xs text-xs font-bold text-slate-700"
                  title="Chuyển đổi hồ sơ Anki cục bộ"
                >
                  <img
                    src={activeProfile.avatar}
                    alt={activeProfile.name}
                    className="size-5 rounded-full object-cover ring-1 ring-slate-300 shrink-0"
                  />
                  <span className="max-w-[80px] truncate">{activeProfile.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              )}

              {/* Login / Register Button */}
              <button
                type="button"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 h-10 px-3.5 sm:px-4 rounded-full bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md shadow-teal-600/20 transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập</span>
              </button>
            </div>
          )}

          {/* Language Pair Selector */}
          <div className="hidden lg:flex items-center gap-1.5 h-10 px-3 rounded-full border border-slate-200 bg-white shadow-sm text-xs font-bold text-slate-700">
            <span className="text-base">🇺🇸</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-base">🇻🇳</span>
          </div>

          {/* Streak Indicator (visible on small screens) */}
          <div className="flex items-center gap-1.5 h-10 px-3 rounded-full bg-orange-50 border border-orange-200/80 text-orange-600 font-black text-xs sm:hidden">
            <Flame className="w-4 h-4 fill-orange-500" />
            <span>{streakDays}</span>
          </div>

          {/* Import YouTube Button */}
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 h-10 px-4 rounded-full btn-3d btn-3d-orange text-xs font-bold shadow-[0_3px_0_#d95e26]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Dán link YouTube</span>
            <span className="sm:hidden">Nhập</span>
          </button>
        </div>
      </div>
    </header>
  );
};
