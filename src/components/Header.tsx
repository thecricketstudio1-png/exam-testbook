import React from 'react';
import type {User as FirebaseUser} from 'firebase/auth';
import {
  Bookmark,
  BookOpenCheck,
  GraduationCap,
  Home,
  LayoutDashboard,
  Search,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import {Language, NavTab} from '../types/exam';
import {t, UI_COPY} from '../data/i18n';
import {PWAInstallButton} from './PWAInstallButton';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  lang: Language;
  onToggleLang: (lang: Language) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentUser: FirebaseUser | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  lang,
  onToggleLang,
  searchQuery,
  onSearchChange,
  currentUser,
}) => {
  const navItems: {id: NavTab; label: {en: string; hi: string}; icon: React.ReactNode}[] = [
    {id: 'home', label: UI_COPY.nav.home, icon: <Home className="w-4 h-4" />},
    {id: 'exams', label: UI_COPY.nav.exams, icon: <BookOpenCheck className="w-4 h-4" />},
    {id: 'quiz', label: UI_COPY.nav.quiz, icon: <Sparkles className="w-4 h-4" />},
    {id: 'saved', label: UI_COPY.nav.saved, icon: <Bookmark className="w-4 h-4" />},
    {id: 'dashboard', label: UI_COPY.nav.dashboard, icon: <LayoutDashboard className="w-4 h-4" />},
  ];

  const handleSearchInput = (val: string) => {
    onSearchChange(val);
    if (val.trim() && activeTab !== 'exams') {
      onSelectTab('exams');
    }
  };

  const userInitial = (
    currentUser?.displayName?.[0] ||
    currentUser?.email?.[0] ||
    ''
  ).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-[#1E40AF] text-white border-b border-blue-800/50 shadow-xs">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-5">
        {/* Brand */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-1.5 sm:gap-2.5 text-left shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-xl py-1"
        >
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-white text-[#1E40AF] flex items-center justify-center shrink-0 shadow-xs">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="leading-tight">
            <div className="text-[13px] sm:text-base font-extrabold tracking-tight whitespace-nowrap">
              {t(UI_COPY.brand.name, lang)}
            </div>
            <div className="hidden lg:block text-[11px] text-blue-100/90 font-medium whitespace-nowrap">
              {t(UI_COPY.brand.tagline, lang)}
            </div>
          </div>
        </button>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-white/18 text-white font-semibold shadow-2xs'
                    : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
              >
                {t(item.label, lang)}
              </button>
            );
          })}
        </nav>

        {/* Search + Bilingual Toggle + PWA Install + Profile */}
        <div className="flex items-center gap-1 sm:gap-2.5 flex-1 md:flex-initial justify-end max-w-md min-w-0">
          <div className="relative flex-1 min-w-[48px] sm:w-44 lg:w-60 max-w-[210px]">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-200 absolute left-2 sm:left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder={t(UI_COPY.header.searchPlaceholder, lang)}
              aria-label={t(UI_COPY.header.searchPlaceholder, lang)}
              className="w-full h-8 sm:h-9 pl-7 sm:pl-8 pr-6 sm:pr-7 rounded-xl bg-white/12 border border-white/20 text-xs sm:text-sm text-white placeholder:text-blue-200/80 focus:outline-none focus:bg-white focus:text-slate-900 focus:placeholder:text-slate-400 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 text-blue-200 hover:text-white focus:text-slate-600"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* EN | हिंदी Toggle */}
          <div
            role="group"
            aria-label="Language Toggle"
            className="flex items-center bg-blue-950/45 border border-white/20 rounded-xl p-0.5 shrink-0"
          >
            <button
              type="button"
              onClick={() => onToggleLang('en')}
              className={`px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                lang === 'en'
                  ? 'bg-white text-[#1E40AF] shadow-xs'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onToggleLang('hi')}
              className={`px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                lang === 'hi'
                  ? 'bg-white text-[#1E40AF] shadow-xs'
                  : 'text-blue-100 hover:text-white'
              }`}
            >
              हिंदी
            </button>
          </div>

          <PWAInstallButton lang={lang} />

          {/* Profile Button */}
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            aria-label={
              currentUser
                ? currentUser.displayName || currentUser.email || 'Profile'
                : lang === 'hi'
                  ? 'प्रोफ़ाइल और डैशबोर्ड'
                  : 'Profile & Dashboard'
            }
            title={
              currentUser
                ? currentUser.displayName || currentUser.email || 'Account'
                : lang === 'hi'
                  ? 'अकाउंट और लॉगिन'
                  : 'Account & Sign In'
            }
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 flex items-center justify-center text-xs font-extrabold text-white shrink-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {userInitial ? (
              <span>{userInitial}</span>
            ) : (
              <User className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
