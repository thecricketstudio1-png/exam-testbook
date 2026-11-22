import React from 'react';
import {
  Bookmark,
  BookOpenCheck,
  Home,
  LayoutDashboard,
  Zap,
} from 'lucide-react';
import {Language, NavTab} from '../types/exam';
import {t, UI_COPY} from '../data/i18n';

interface MobileBottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lang: Language;
  bookmarkCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  lang,
  bookmarkCount,
}) => {
  const items: {
    id: NavTab;
    label: {en: string; hi: string};
    icon: React.ComponentType<{className?: string}>;
    badge?: number;
  }[] = [
    {id: 'home', label: UI_COPY.nav.home, icon: Home},
    {id: 'exams', label: UI_COPY.nav.exams, icon: BookOpenCheck},
    {id: 'quiz', label: UI_COPY.nav.quiz, icon: Zap},
    {id: 'saved', label: UI_COPY.nav.saved, icon: Bookmark, badge: bookmarkCount},
    {id: 'dashboard', label: UI_COPY.nav.dashboard, icon: LayoutDashboard},
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-blue-100 shadow-[0_-6px_24px_-8px_rgba(30,64,175,0.12)] pb-safe"
    >
      <div className="grid grid-cols-5 h-16 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center min-h-[44px] gap-1 transition-colors ${
                isActive
                  ? 'text-[#1E40AF] font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div
                className={`relative flex items-center justify-center w-11 h-7 rounded-full transition-colors ${
                  isActive ? 'bg-[#EFF6FF] text-[#1E40AF]' : ''
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-2xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-none tracking-tight whitespace-nowrap">
                {t(item.label, lang)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
