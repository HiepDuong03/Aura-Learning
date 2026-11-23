import React from 'react';
import { Compass, PlaySquare, Layers, Mic, User } from 'lucide-react';
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
  const mainItems: {
    id: ActiveTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string | number;
  }[] = [
    { id: 'roadmap', label: 'Lộ trình', icon: Compass },
    { id: 'watch', label: 'Xem & Nghe', icon: PlaySquare },
    { id: 'memory', label: 'Ôn tập', icon: Layers, badge: savedWordsCount > 0 ? savedWordsCount : undefined },
    { id: 'output', label: 'Nói & Viết', icon: Mic },
    { id: 'profile', label: 'Hồ sơ', icon: User }
  ];

  return (
    <nav
      aria-label="Điều hướng di động"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden shadow-lg"
    >
      <ul className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {mainItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-full h-full flex flex-col items-center justify-center gap-0.5 py-1 transition-colors cursor-pointer ${
                  isActive ? 'text-teal-600 font-black' : 'text-slate-500 font-semibold hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full bg-orange-500 text-white text-[9px] font-black leading-tight">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] leading-tight truncate max-w-[68px]">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
