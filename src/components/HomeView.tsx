import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Cpu,
  FileText,
  Flame,
  Gift,
  Landmark,
  Loader2,
  MessageCircle,
  Play,
  RotateCcw,
  Scale,
  Search,
  Shield,
  Sparkles,
  Train,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  ExamCategory,
  ExamCategoryId,
  ExamItem,
  Language,
  MockTest,
  SavedTestProgress,
} from '../types/exam';
import {EXAM_CATEGORIES, EXAMS_CATALOG} from '../data/exams';
import {t} from '../data/i18n';
import {formatSecondsMMSS, isResponseEmpty} from '../utils/scoring';
import {useSubscription} from '../context/SubscriptionContext';
import {
  buildReferralShareUrl,
  buildWhatsAppShareUrl,
  type ReferralUserState,
} from '../utils/referral';

export type {ReferralUserState};

interface HomeViewProps {
  lang: Language;
  savedProgress: SavedTestProgress | null;
  onResumeTest: () => void;
  onDiscardSavedTest: () => void;
  onSelectCategory: (catId: ExamCategoryId) => void;
  onLaunchSampleCbt: () => void;
  onGoToQuiz: () => void;
  onStartTest: (exam: ExamItem, test: MockTest) => void;
  unlockedTestIds: string[];
  onUnlockTests: (ids: string[]) => void;
  referralState: ReferralUserState;
  onOpenClaimModal: () => void;
  onGoToDashboard: () => void;
  activeHomeCategory?: ExamCategoryId | null;
  onHomeCategoryChange?: (catId: ExamCategoryId | null) => void;
}

type QuickFilterId =
  | 'all'
  | 'free'
  | 'railway'
  | 'ssc'
  | 'jharkhand_state'
  | 'banking'
  | 'police';

const CATEGORY_ICONS: Record<
  ExamCategory['iconName'],
  React.ComponentType<{className?: string}>
> = {
  Train,
  Landmark,
  Building2,
  Shield,
  Award,
  BookOpen,
  Scale,
  Briefcase,
  Cpu,
};

const CATEGORY_THEMES: Record<
  ExamCategoryId,
  {
    gradient: string;
    thumbBg: string;
    cardTitle: {en: string; hi: string};
    examTag: {en: string; hi: string};
  }
> = {
  railway: {
    gradient: 'from-[#3B0712] via-[#7F1D1D] to-[#B91C1C]',
    thumbBg: 'from-[#3B0712] via-[#7F1D1D] to-[#B91C1C]',
    cardTitle: {en: 'Railway · रेलवे', hi: 'रेलवे · Railway'},
    examTag: {
      en: 'NTPC CBT-1/2, Group D, ALP, RPF',
      hi: 'NTPC CBT-1/2, ग्रुप D, ALP, RPF',
    },
  },
  ssc: {
    gradient: 'from-[#0B192C] via-[#1E3A8A] to-[#2563EB]',
    thumbBg: 'from-[#0B192C] via-[#1E3A8A] to-[#2563EB]',
    cardTitle: {en: 'SSC · एसएससी', hi: 'एसएससी · SSC'},
    examTag: {
      en: 'CGL, CHSL, GD Constable, MTS, CPO',
      hi: 'CGL, CHSL, GD कॉन्स्टेबल, MTS, CPO',
    },
  },
  banking: {
    gradient: 'from-[#052E16] via-[#065F46] to-[#059669]',
    thumbBg: 'from-[#052E16] via-[#065F46] to-[#059669]',
    cardTitle: {en: 'Banking · बैंकिंग', hi: 'बैंकिंग · Banking'},
    examTag: {
      en: 'IBPS PO/Clerk, SBI PO, RBI Grade B',
      hi: 'IBPS PO/क्लर्क, SBI PO, RBI ग्रेड B',
    },
  },
  police: {
    gradient: 'from-[#2E1065] via-[#581C87] to-[#7E22CE]',
    thumbBg: 'from-[#2E1065] via-[#581C87] to-[#7E22CE]',
    cardTitle: {en: 'Police · पुलिस', hi: 'पुलिस · Police'},
    examTag: {
      en: 'Jharkhand, Bihar, UP, Delhi Police',
      hi: 'झारखंड, बिहार, यूपी, दिल्ली पुलिस',
    },
  },
  defence: {
    gradient: 'from-[#271C02] via-[#713F12] to-[#B45309]',
    thumbBg: 'from-[#271C02] via-[#713F12] to-[#B45309]',
    cardTitle: {en: 'Defence · रक्षा', hi: 'रक्षा · Defence'},
    examTag: {
      en: 'NDA, CDS, AFCAT, Agniveer Army',
      hi: 'NDA, CDS, AFCAT, अग्निवीर आर्मी',
    },
  },
  teaching: {
    gradient: 'from-[#3B0726] via-[#831843] to-[#BE185D]',
    thumbBg: 'from-[#3B0726] via-[#831843] to-[#BE185D]',
    cardTitle: {en: 'Teaching · शिक्षक', hi: 'शिक्षक · Teaching'},
    examTag: {
      en: 'CTET, JTET, UPTET, KVS, DSSSB',
      hi: 'CTET, JTET, UPTET, KVS, DSSSB',
    },
  },
  upsc_psc: {
    gradient: 'from-[#042F2E] via-[#115E59] to-[#0D9488]',
    thumbBg: 'from-[#042F2E] via-[#115E59] to-[#0D9488]',
    cardTitle: {en: 'UPSC / PSC · यूपीएससी', hi: 'यूपीएससी · UPSC / PSC'},
    examTag: {
      en: 'UPSC IAS, JPSC, BPSC, UPPCS',
      hi: 'UPSC IAS, JPSC, BPSC, UPPCS',
    },
  },
  other_govt: {
    gradient: 'from-[#17153B] via-[#312E81] to-[#4338CA]',
    thumbBg: 'from-[#17153B] via-[#312E81] to-[#4338CA]',
    cardTitle: {en: 'Other Govt · अन्य सरकारी', hi: 'अन्य सरकारी · Other Govt'},
    examTag: {
      en: 'India Post GDS, EPFO, FCI, LIC',
      hi: 'इंडिया पोस्ट GDS, EPFO, FCI, LIC',
    },
  },
  engineering: {
    gradient: 'from-[#2D1206] via-[#7C2D12] to-[#C2410C]',
    thumbBg: 'from-[#2D1206] via-[#7C2D12] to-[#C2410C]',
    cardTitle: {en: 'Engineering · इंजीनियरिंग', hi: 'इंजीनियरिंग · Engineering'},
    examTag: {
      en: 'GATE, SSC JE, RRB JE, ISRO',
      hi: 'GATE, SSC JE, RRB JE, ISRO',
    },
  },
};

const CATEGORY_ROW_THEMES = [
  {
    poster: 'from-blue-900 to-indigo-700',
    borderLeft: 'border-l-blue-600',
    bottomAccent: 'from-blue-600 via-blue-600/70 to-transparent',
    cardBg: 'bg-blue-50/40',
  },
  {
    poster: 'from-emerald-900 to-teal-700',
    borderLeft: 'border-l-emerald-600',
    bottomAccent: 'from-emerald-600 via-emerald-600/70 to-transparent',
    cardBg: 'bg-emerald-50/40',
  },
  {
    poster: 'from-purple-900 to-violet-700',
    borderLeft: 'border-l-purple-600',
    bottomAccent: 'from-purple-600 via-purple-600/70 to-transparent',
    cardBg: 'bg-purple-50/40',
  },
  {
    poster: 'from-rose-950 to-red-700',
    borderLeft: 'border-l-rose-600',
    bottomAccent: 'from-rose-600 via-rose-600/70 to-transparent',
    cardBg: 'bg-rose-50/40',
  },
  {
    poster: 'from-amber-900 to-orange-700',
    borderLeft: 'border-l-amber-600',
    bottomAccent: 'from-amber-600 via-amber-600/70 to-transparent',
    cardBg: 'bg-amber-50/40',
  },
  {
    poster: 'from-cyan-900 to-sky-700',
    borderLeft: 'border-l-cyan-600',
    bottomAccent: 'from-cyan-600 via-cyan-600/70 to-transparent',
    cardBg: 'bg-cyan-50/40',
  },
  {
    poster: 'from-pink-950 to-fuchsia-700',
    borderLeft: 'border-l-pink-600',
    bottomAccent: 'from-pink-600 via-pink-600/70 to-transparent',
    cardBg: 'bg-pink-50/40',
  },
  {
    poster: 'from-slate-900 to-indigo-800',
    borderLeft: 'border-l-indigo-600',
    bottomAccent: 'from-indigo-600 via-indigo-600/70 to-transparent',
    cardBg: 'bg-indigo-50/40',
  },
] as const;

const QUICK_FILTERS: {id: QuickFilterId; label: {en: string; hi: string}}[] = [
  {id: 'all', label: {en: 'All Exams', hi: 'सभी परीक्षाएं'}},
  {id: 'free', label: {en: 'Free Mocks', hi: 'निःशुल्क मॉक'}},
  {id: 'railway', label: {en: 'Railway', hi: 'रेलवे'}},
  {id: 'ssc', label: {en: 'SSC', hi: 'एसएससी'}},
  {id: 'jharkhand_state', label: {en: 'Jharkhand/State', hi: 'झारखंड / राज्य'}},
  {id: 'banking', label: {en: 'Banking', hi: 'बैंकिंग'}},
  {id: 'police', label: {en: 'Police', hi: 'पुलिस'}},
];

const STATE_EXAM_IDS = new Set([
  'jharkhand-police',
  'bihar-police',
  'up-police',
  'jtet',
  'uptet',
  'jpsc',
  'bpsc',
]);

// Precomputed once at module load to eliminate per-render array filtering
const ALL_PLATFORM_TEST_IDS: string[] = EXAMS_CATALOG.flatMap((ex) =>
  ex.tests.map((tst) => tst.id),
);

const CATEGORY_EXAM_STATS: Record<
  ExamCategoryId,
  {subExamCount: number; totalMocksCount: number}
> = (() => {
  const stats = {} as Record<
    ExamCategoryId,
    {subExamCount: number; totalMocksCount: number}
  >;
  for (const cat of EXAM_CATEGORIES) {
    stats[cat.id] = {subExamCount: 0, totalMocksCount: 0};
  }
  for (const exam of EXAMS_CATALOG) {
    const entry = stats[exam.categoryId];
    if (entry) {
      entry.subExamCount += 1;
      entry.totalMocksCount += exam.tests.length;
    }
  }
  return stats;
})();

interface SplitTestCardProps {
  exam: ExamItem;
  lang: Language;
  title: string;
  totalTests: number;
  freeTests: number;
  highlightText: string;
  actionLabel: string;
  isPaidAction?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  onAction: () => void;
}

const SplitTestCard: React.FC<SplitTestCardProps> = React.memo(({
  exam,
  lang,
  title,
  totalTests,
  freeTests,
  highlightText,
  actionLabel,
  isPaidAction = false,
  isLoading = false,
  disabled = false,
  onAction,
}) => {
  const theme = CATEGORY_THEMES[exam.categoryId];

  const handleCardClick = () => {
    if (!disabled) onAction();
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAction();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      className={`flex flex-row gap-3.5 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md hover:border-blue-200 transition-all duration-200 min-w-0 ${
        disabled
          ? 'opacity-70 cursor-not-allowed'
          : 'cursor-pointer active:scale-[0.99] transition-transform'
      }`}
    >
      {/* Left Poster Thumbnail */}
      <div
        className={`relative w-24 h-24 sm:w-[105px] sm:h-[105px] shrink-0 rounded-xl overflow-hidden bg-gradient-to-br ${theme.thumbBg} p-2.5 flex flex-col justify-between text-white`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -bottom-4 w-14 h-14 rounded-full border-4 border-white/10"
        />

        <span className="relative z-10 self-start px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-extrabold leading-none tracking-tight whitespace-nowrap">
          {lang === 'hi' ? 'नया पैटर्न' : 'New Pattern'}
        </span>

        <div className="relative z-10 min-w-0">
          <div className="text-[10px] font-extrabold text-amber-300 leading-tight font-mono-num">
            2026
          </div>
          <div className="text-xs font-extrabold text-white leading-tight line-clamp-2 mt-0.5">
            {exam.shortName}
          </div>
        </div>
      </div>

      {/* Right Details Column */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1E40AF] text-[10px] font-bold whitespace-nowrap">
              {lang === 'hi' ? 'द्विभाषी' : 'Bilingual'}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold whitespace-nowrap">
              {lang === 'hi' ? 'मॉक व पार्ट टेस्ट' : 'Mock & Part Tests'}
            </span>
          </div>

          <h3 className="mt-1.5 text-sm sm:text-[15px] font-bold text-slate-900 leading-snug truncate">
            {title}
          </h3>

          <p className="mt-0.5 text-emerald-600 text-xs font-semibold truncate">
            {highlightText}
          </p>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 font-mono-num truncate">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {totalTests} {lang === 'hi' ? 'टेस्ट' : 'Tests'} · {freeTests}{' '}
              {lang === 'hi' ? 'निःशुल्क' : 'Free'}
            </span>
          </span>

          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className={`inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap shrink-0 py-1 px-1.5 -mr-1.5 rounded-md transition disabled:opacity-60 ${
              isPaidAction
                ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50'
                : 'text-[#2563EB] hover:text-blue-800 hover:bg-blue-50'
            }`}
          >
            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{actionLabel}</span>
            {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
});
SplitTestCard.displayName = 'SplitTestCard';

interface ExamCategoryCardProps {
  cat: ExamCategory;
  lang: Language;
  subExamCount: number;
  totalMocksCount: number;
  onExplore: (catId: ExamCategoryId) => void;
}

const ExamCategoryCard: React.FC<ExamCategoryCardProps> = React.memo(({
  cat,
  lang,
  subExamCount,
  totalMocksCount,
  onExplore,
}) => {
  const Icon = CATEGORY_ICONS[cat.iconName];
  const theme = CATEGORY_THEMES[cat.id];

  return (
    <button
      type="button"
      onClick={() => onExplore(cat.id)}
      className={`relative w-full rounded-2xl bg-gradient-to-br ${theme.gradient} p-4 flex items-center justify-between gap-3 shadow-md border border-white/15 text-white text-left cursor-pointer hover:brightness-110 active:scale-[0.99] transition-transform duration-150 min-w-0 overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_55%)]`}
    >
      <div className="relative z-10 w-12 h-12 rounded-xl bg-white/15 border border-white/15 flex items-center justify-center shrink-0">
        <Icon className="w-6 h-6 text-amber-200" />
      </div>

      <div className="relative z-10 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-extrabold text-white leading-tight truncate">
            {t(theme.cardTitle, lang)}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 text-[10px] font-extrabold leading-tight font-mono-num whitespace-nowrap shrink-0">
            {subExamCount} {lang === 'hi' ? 'परीक्षाएं' : 'Exams'}
          </span>
        </div>

        <p className="mt-1 text-xs text-white/85 truncate font-mono-num">
          {t(theme.examTag, lang)} • {totalMocksCount.toLocaleString('en-IN')}{' '}
          {lang === 'hi' ? 'मॉक टेस्ट' : 'Mock Tests'}
        </p>
      </div>

      <span className="relative z-10 bg-white text-slate-900 font-bold text-xs px-3 py-2 rounded-xl shrink-0 shadow-xs whitespace-nowrap">
        {lang === 'hi' ? 'देखें →' : 'Explore →'}
      </span>
    </button>
  );
});
ExamCategoryCard.displayName = 'ExamCategoryCard';

interface CategoryExamRowCardProps {
  exam: ExamItem;
  index: number;
  lang: Language;
  isBundleUnlocked: boolean;
  onSelectCategory: (catId: ExamCategoryId) => void;
}

const CategoryExamRowCard: React.FC<CategoryExamRowCardProps> = React.memo(({
  exam,
  index,
  lang,
  isBundleUnlocked,
  onSelectCategory,
}) => {
  const freeCount = exam.tests.filter((tst) => tst.tier === 'free').length;
  const rowTheme = CATEGORY_ROW_THEMES[index % CATEGORY_ROW_THEMES.length];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectCategory(exam.categoryId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectCategory(exam.categoryId);
        }
      }}
      className={`relative overflow-hidden rounded-xl border border-slate-200 border-l-[6px] ${rowTheme.borderLeft} ${rowTheme.cardBg} mb-3 py-3.5 pb-4 px-3 sm:px-4 flex flex-row gap-3.5 min-w-0 shadow-xs cursor-pointer hover:shadow-md active:scale-[0.99] transition-all duration-200`}
    >
      <div
        className={`relative w-28 h-28 rounded-xl shrink-0 overflow-hidden bg-gradient-to-br ${rowTheme.poster} p-2.5 flex flex-col justify-between text-white shadow-xs`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -bottom-4 w-16 h-16 rounded-full border-4 border-white/10"
        />

        <div className="relative z-10 flex items-start justify-end">
          <span className="px-1.5 py-0.5 rounded bg-white text-[#1E40AF] text-[8px] font-extrabold tracking-tight uppercase">
            {lang === 'hi' ? 'टेस्टबुक' : 'TESTBOOK'}
          </span>
        </div>

        <div className="relative z-10 min-w-0">
          <div className="text-[10px] font-extrabold text-amber-300 leading-none font-mono-num">
            2026
          </div>
          <div className="text-[13px] font-extrabold text-white leading-tight truncate mt-0.5">
            {exam.shortName}
          </div>
        </div>

        <div className="relative z-10 space-y-0.5">
          <span className="inline-block px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[8px] font-extrabold leading-none whitespace-nowrap">
            {lang === 'hi' ? 'नया पैटर्न' : 'New Pattern'}
          </span>
          <div className="text-[9px] font-bold text-white/85 leading-none">
            {lang === 'hi' ? 'मॉक टेस्ट' : 'Mock Test'}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-[#1E40AF] text-[10px] font-bold whitespace-nowrap">
              {lang === 'hi' ? 'द्विभाषी' : 'Bilingual'}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold font-mono-num whitespace-nowrap">
              ₹49 • {exam.tests.length} {lang === 'hi' ? 'टेस्ट' : 'Tests'}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold whitespace-nowrap">
              {lang === 'hi' ? 'मॉक व पार्ट टेस्ट' : 'Mock and Part Tests'}
            </span>
          </div>

          <h3 className="mt-1.5 text-[15px] font-bold text-slate-900 leading-snug line-clamp-2">
            {t(exam.name, lang)} ({exam.shortName}) 2026
          </h3>

          <p className="mt-0.5 text-xs font-semibold text-emerald-600 font-mono-num">
            {freeCount > 0
              ? lang === 'hi'
                ? `${freeCount} फ्री मॉक + ${exam.tests.length - freeCount} पेड मॉक`
                : `${freeCount} Free + ${exam.tests.length - freeCount} Paid Mocks`
              : lang === 'hi'
                ? 'पूर्ण पाठ्यक्रम मॉक टेस्ट'
                : 'Full Syllabus Mock Tests'}
          </p>
        </div>

        <div>
          <div className="border-t border-slate-100 my-2" />
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 font-mono-num truncate">
              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {exam.tests.length} {lang === 'hi' ? 'मॉक टेस्ट' : 'Tests'} · {freeCount}{' '}
                {lang === 'hi' ? 'निःशुल्क' : 'Free'}
              </span>
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCategory(exam.categoryId);
              }}
              className={`inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap shrink-0 ${
                isBundleUnlocked
                  ? 'text-[#2563EB] hover:text-blue-800'
                  : 'text-rose-600 hover:text-rose-700'
              }`}
            >
              <span>{lang === 'hi' ? 'टेस्ट खोलें' : 'Open Tests'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 left-0 right-0 h-[5px] bg-gradient-to-r ${rowTheme.bottomAccent} [clip-path:polygon(0_0,100%_65%,100%_100%,0%_100%)]`}
      />
    </div>
  );
});
CategoryExamRowCard.displayName = 'CategoryExamRowCard';



export const HomeView: React.FC<HomeViewProps> = ({
  lang,
  savedProgress,
  onResumeTest,
  onDiscardSavedTest,
  onSelectCategory,
  onLaunchSampleCbt,
  onGoToQuiz,
  onStartTest,
  unlockedTestIds,
  onUnlockTests,
  referralState,
  onOpenClaimModal,
  onGoToDashboard,
  activeHomeCategory,
  onHomeCategoryChange,
}) => {
  const [heroSearch, setHeroSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<QuickFilterId>('all');
  const [internalSelectedCategory, setInternalSelectedCategory] = useState<ExamCategoryId | null>(null);
  const selectedCategory =
    activeHomeCategory !== undefined ? activeHomeCategory : internalSelectedCategory;
  const updateSelectedCategory = (catId: ExamCategoryId | null) => {
    if (onHomeCategoryChange) {
      onHomeCategoryChange(catId);
    } else {
      setInternalSelectedCategory(catId);
    }
  };
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [payingTarget, setPayingTarget] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    subscription,
    isTrialActive,
    isPackUnlocked,
    isMegaPassActive,
    openSubscriptionModal,
    processingPlan,
  } = useSubscription();

  const unlockedSet = useMemo(() => new Set(unlockedTestIds), [unlockedTestIds]);

  const homeShareUrl = useMemo(
    () => buildReferralShareUrl(referralState.code),
    [referralState.code],
  );
  const homeWhatsappUrl = useMemo(
    () => buildWhatsAppShareUrl(referralState.code, homeShareUrl),
    [referralState.code, homeShareUrl],
  );
  const availableFreePacks = referralState.eligibleForRewards
    ? Math.max(
        0,
        Math.floor(referralState.friendsJoined / 2) - referralState.claimedExamIds.length,
      )
    : 0;
  const homeMilestoneCount = referralState.eligibleForRewards
    ? Math.min(2, referralState.friendsJoined)
    : 0;

  const handleCopyHomeReferral = async () => {
    try {
      await navigator.clipboard.writeText(homeShareUrl);
      setCopiedReferral(true);
      window.setTimeout(() => setCopiedReferral(false), 2000);
    } catch {
      setCopiedReferral(false);
    }
  };

  const isBundleUnlocked = useMemo(
    () =>
      isMegaPassActive() ||
      (ALL_PLATFORM_TEST_IDS.length > 0 &&
        ALL_PLATFORM_TEST_IDS.every((id) => unlockedSet.has(id) || isPackUnlocked(id))),
    [isMegaPassActive, isPackUnlocked, unlockedSet],
  );

  const searchResults = useMemo(() => {
    const q = heroSearch.trim().toLowerCase();
    if (!q) return EXAMS_CATALOG.slice(0, 6);
    return EXAMS_CATALOG.filter((exam) => {
      const cat = EXAM_CATEGORIES.find((c) => c.id === exam.categoryId);
      const text = [
        exam.shortName,
        exam.name.en,
        exam.name.hi,
        cat?.name.en ?? '',
        cat?.name.hi ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(q);
    }).slice(0, 7);
  }, [heroSearch]);

  const selectedCategoryObj = useMemo(
    () => EXAM_CATEGORIES.find((c) => c.id === selectedCategory) ?? null,
    [selectedCategory],
  );

  const selectedCategoryExams = useMemo(() => {
    if (!selectedCategory) return [];
    const byCat = EXAMS_CATALOG.filter((exam) => exam.categoryId === selectedCategory);
    const q = categorySearch.trim().toLowerCase();
    if (!q) return byCat;
    return byCat.filter((exam) =>
      [exam.shortName, exam.name.en, exam.name.hi]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [selectedCategory, categorySearch]);

  const trendingSeries = useMemo(() => {
    const list: {exam: ExamItem; test: MockTest}[] = [];
    for (const exam of EXAMS_CATALOG) {
      const matchesFilter =
        activeFilter === 'all' ||
        activeFilter === 'free' ||
        (activeFilter === 'jharkhand_state'
          ? STATE_EXAM_IDS.has(exam.id)
          : exam.categoryId === activeFilter);

      if (!matchesFilter) continue;

      if (activeFilter === 'free') {
        const freeTest = exam.tests.find((tst) => tst.tier === 'free');
        if (freeTest) list.push({exam, test: freeTest});
      } else {
        const freeTest = exam.tests.find((tst) => tst.tier === 'free');
        const singleTest = exam.tests.find((tst) => tst.tier === 'single');
        if (freeTest) list.push({exam, test: freeTest});
        if (singleTest) list.push({exam, test: singleTest});
      }
    }
    return list.slice(0, 6);
  }, [activeFilter]);

  const savedAnsweredCount = savedProgress
    ? Object.values(savedProgress.responses).filter((v) => !isResponseEmpty(v)).length
    : 0;

  const handleStartTrial = () => {
    setPaymentNotice(null);
    openSubscriptionModal({
      initialTier: 'single',
      onUnlocked: (ids) => {
        onUnlockTests(ids);
        setPaymentNotice({
          type: 'success',
          text:
            lang === 'hi'
              ? '₹1 ट्रायल पास (24 घंटे) सक्रिय हो गया! चयनित टेस्ट अनलॉक हैं।'
              : '₹1 Trial (24h) activated! Your chosen exam/category is now unlocked.',
        });
      },
    });
  };

  const handleUnlockBundle = (catId?: ExamCategoryId) => {
    setPaymentNotice(null);
    openSubscriptionModal({
      initialTier: 'category',
      initialCategoryId: catId ?? 'railway',
      onUnlocked: (ids) => {
        onUnlockTests(ids);
        setPaymentNotice({
          type: 'success',
          text:
            lang === 'hi'
              ? 'कैटेगरी बंडल ₹1 ट्रायल (24 घंटे) सक्रिय हो गया!'
              : 'Category Bundle ₹1 Trial (24h) activated!',
        });
      },
    });
  };

  const handleAttemptSeries = useCallback(
    (exam: ExamItem, test: MockTest) => {
      // Free tests launch immediately without login
      const isAccessible =
        test.tier === 'free' ||
        unlockedSet.has(test.id) ||
        isPackUnlocked(test.id) ||
        isPackUnlocked(exam.id);
      if (isAccessible) {
        onStartTest(exam, test);
        return;
      }

      setPaymentNotice(null);
      openSubscriptionModal({
        initialTier: test.tier === 'bundle' ? 'category' : 'single',
        initialExamId: exam.id,
        initialCategoryId: exam.categoryId,
        onUnlocked: (ids) => {
          onUnlockTests(ids);
          onStartTest(exam, test);
        },
      });
    },
    [isPackUnlocked, onStartTest, onUnlockTests, openSubscriptionModal, unlockedSet],
  );

  const handleOpenCategorySubView = useCallback(
    (catId: ExamCategoryId) => {
      if (onHomeCategoryChange) {
        onHomeCategoryChange(catId);
      } else {
        setInternalSelectedCategory(catId);
      }
      setCategorySearch('');
      setCategorySearchOpen(false);
      if (typeof window !== 'undefined') {
        window.scrollTo({top: 0, behavior: 'smooth'});
      }
    },
    [onHomeCategoryChange],
  );

  /* 3. ADDA247-STYLE DEDICATED CATEGORY SUB-VIEW */
  if (selectedCategory && selectedCategoryObj) {
    return (
      <div className="min-h-screen bg-[#F4F7FC] pb-10 animate-fade-in">
        {/* Sticky Top Bar: ← [Category] Mock Test + Search Icon */}
        <div className="sticky top-14 sm:top-16 z-20 bg-white border-b border-slate-200 shadow-2xs">
          <div className="max-w-4xl mx-auto px-3 sm:px-6 h-13 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setCategorySearch('');
                  setCategorySearchOpen(false);
                  if (
                    typeof window !== 'undefined' &&
                    window.history.state?.__etbNav &&
                    window.history.state?.homeCategory === selectedCategory
                  ) {
                    window.history.back();
                  } else {
                    updateSelectedCategory(null);
                  }
                }}
                aria-label={lang === 'hi' ? 'वापस जाएं' : 'Back to Home'}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-800 hover:bg-slate-100 shrink-0 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                {t(selectedCategoryObj.name, lang)}{' '}
                {lang === 'hi' ? 'मॉक टेस्ट' : 'Mock Test'}
              </h1>
            </div>

            <button
              type="button"
              onClick={() => setCategorySearchOpen((prev) => !prev)}
              aria-label={lang === 'hi' ? 'परीक्षा खोजें' : 'Search exams'}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 hover:bg-slate-100 shrink-0 transition"
            >
              {categorySearchOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>

          {categorySearchOpen && (
            <div className="max-w-4xl mx-auto px-3 sm:px-6 pb-3">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="search"
                  autoFocus
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder={
                    lang === 'hi'
                      ? `${t(selectedCategoryObj.name, lang)} में परीक्षा खोजें...`
                      : `Search in ${t(selectedCategoryObj.name, lang)}...`
                  }
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:bg-white"
                />
              </div>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto sm:px-6 sm:pt-4">
          {/* Top Featured Mega Pass Row (₹299 Full Category Bundle) */}
          <div className="bg-white border-b border-slate-200 sm:rounded-2xl sm:border px-3 py-3.5 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-20 h-20 rounded-xl shrink-0 bg-gradient-to-br from-rose-600 to-red-700 text-white p-2 flex flex-col justify-between shadow-xs">
                <span className="text-[8px] font-extrabold uppercase tracking-wider text-amber-300 leading-none">
                  {lang === 'hi' ? 'मेगा पास' : 'MEGA PASS'}
                </span>
                <div className="text-[9px] font-extrabold leading-tight uppercase">
                  {lang === 'hi' ? 'सभी परीक्षाएं एक पास' : 'ALL EXAMS ONE PASS'}
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wide">
                  {lang === 'hi' ? 'कैटेगरी मेगा पास' : 'Category Mega Pass'}
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                  {lang === 'hi'
                    ? 'फुल कैटेगरी बंडल @ ₹299'
                    : 'Full Category Bundle @ ₹299'}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                  {lang === 'hi'
                    ? `सभी ${t(selectedCategoryObj.name, lang)} परीक्षाएं और चरण अनलॉक करें (प्रत्येक 90 टेस्ट)`
                    : `Unlock all ${t(selectedCategoryObj.name, lang)} exams & stages (90 tests each)`}
                </p>
              </div>
            </div>

            {isPackUnlocked(`cat_${selectedCategoryObj.id}`) || isBundleUnlocked ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{lang === 'hi' ? 'अनलॉक्ड' : 'Unlocked'}</span>
              </span>
            ) : (
              <button
                type="button"
                disabled={processingPlan !== null}
                onClick={() => handleUnlockBundle(selectedCategoryObj.id)}
                className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 text-xs font-extrabold whitespace-nowrap shrink-0 transition min-h-[38px]"
              >
                {lang === 'hi'
                  ? '1 दिन के लिए ₹1 ट्रायल'
                  : 'Start ₹1 Trial for 1 Day'}
              </button>
            )}
          </div>

          {paymentNotice && (
            <div
              className={`px-3 py-2.5 text-xs font-medium border-b ${
                paymentNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {paymentNotice.text}
            </div>
          )}

          {/* Separated Vibrant Horizontal Split Cards */}
          {selectedCategoryExams.length === 0 ? (
            <div className="mt-3 mx-3 sm:mx-0 bg-white rounded-xl border border-slate-200 px-4 py-10 text-center text-sm text-slate-500 shadow-xs">
              {lang === 'hi'
                ? 'इस खोज से मेल खाने वाली कोई परीक्षा नहीं मिली।'
                : 'No matching exams found in this category.'}
            </div>
          ) : (
            <div className="px-3 sm:px-0 pt-3">
              {selectedCategoryExams.map((exam, index) => (
                <CategoryExamRowCard
                  key={exam.id}
                  exam={exam}
                  index={index}
                  lang={lang}
                  isBundleUnlocked={isBundleUnlocked}
                  onSelectCategory={onSelectCategory}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FC] animate-fade-in">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 overflow-x-hidden">
        {/* 0. TOP EXAM TESTBOOK 1-DAY ₹1 TRIAL PASS BANNER (AT VERY TOP) */}
        <section
          aria-label="Exam TestBook 1-Day Trial Pass"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#09142C] via-[#172554] to-[#1E3A8A] text-white border-2 border-amber-400 ring-1 ring-amber-300/45 shadow-[0_8px_24px_rgba(245,158,11,0.18)] p-3.5 sm:px-5 sm:py-4"
        >
          {/* Golden top rim highlight & subtle warm sheen */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-12 w-44 h-44 rounded-full bg-amber-400/15 blur-2xl"
          />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 text-[11px] font-extrabold tracking-wide uppercase shadow-xs whitespace-nowrap">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>
                    {lang === 'hi' ? '₹1 ट्रायल • 24 घंटे' : '₹1 TRIAL • 24 HOURS'}
                  </span>
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-amber-200 tracking-tight">
                  {lang === 'hi'
                    ? 'एग्जाम टेस्टबुक 1-दिन ट्रायल पास'
                    : 'Exam TestBook 1-Day Trial Pass'}
                </span>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-white/95 leading-snug">
                {lang === 'hi'
                  ? '1-दिन ₹1 ट्रायल के बाद सिंगल परीक्षा ₹49/वर्ष या फुल कैटेगरी ₹299/वर्ष अनलॉक करें'
                  : 'Unlock Single Exam ₹49/yr or Full Category ₹299/yr after 1-day ₹1 trial'}
              </p>

              {isTrialActive() && subscription?.targetLabel && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {lang === 'hi'
                      ? `सक्रिय 24h ट्रायल: ${subscription.targetLabel}`
                      : `Active 24h Trial: ${subscription.targetLabel}`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {isBundleUnlocked ? (
                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-300/50 text-emerald-200 text-xs sm:text-sm font-extrabold min-h-[42px] whitespace-nowrap">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{lang === 'hi' ? 'मेगा पास अनलॉक्ड' : 'Mega Pass Unlocked'}</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={processingPlan !== null}
                  onClick={handleStartTrial}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-emerald-400 via-emerald-500 to-green-600 hover:from-emerald-300 hover:via-emerald-400 hover:to-green-500 disabled:opacity-60 text-white text-xs sm:text-sm font-extrabold border border-emerald-200/75 shadow-[0_6px_18px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(255,255,255,0.5)] min-h-[42px] whitespace-nowrap transition active:scale-[0.98]"
                >
                  {processingPlan === 'trial' && (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  )}
                  <span>
                    {lang === 'hi' ? '₹1 ट्रायल शुरू करें →' : 'Start ₹1 Trial →'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {paymentNotice && (
            <div
              className={`relative z-10 mt-3 rounded-xl px-3.5 py-2 text-xs font-semibold border ${
                paymentNotice.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-300/50 text-emerald-100'
                  : 'bg-rose-500/20 border-rose-300/50 text-rose-100'
              }`}
            >
              {paymentNotice.text}
            </div>
          )}
        </section>

        {/* 1. VIBRANT COMPACT HERO BANNER */}
        <section className="relative bg-gradient-to-br from-[#1E40AF] via-[#4F46E5] to-[#A21CAF] text-white rounded-2xl p-3.5 sm:p-4 border border-amber-300/45 border-t-2 border-t-amber-300 shadow-lg before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.28),transparent_55%)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          >
            <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-fuchsia-400/25 blur-3xl" />
            <div className="absolute -bottom-20 -left-16 w-64 h-64 rounded-full bg-sky-400/20 blur-3xl" />
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center">
            <div className={savedProgress ? 'lg:col-span-7 min-w-0' : 'lg:col-span-12 max-w-3xl min-w-0'}>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/55 text-amber-200 text-[10px] font-extrabold tracking-wide uppercase shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                <span>
                  {lang === 'hi'
                    ? '★ भारत का #1 सरकारी परीक्षा CBT मंच'
                    : "★ INDIA'S #1 GOVT EXAM CBT PLATFORM"}
                </span>
              </div>

              <h1 className="mt-2 text-lg sm:text-2xl font-extrabold tracking-tight leading-snug text-white text-balance">
                {lang === 'hi' ? (
                  <>
                    सरकारी परीक्षाओं की सटीक तैयारी —{' '}
                    <span className="text-amber-300">रियल TCS iON CBT</span> अभ्यास
                  </>
                ) : (
                  <>
                    Crack Indian Govt Exams with{' '}
                    <span className="text-amber-300">Real TCS iON CBT Practice</span>
                  </>
                )}
              </h1>

              {/* Bright White Search Bar with Blue Search Icon Button */}
              <div ref={searchWrapRef} className="relative mt-2.5 max-w-xl">
                <div className="flex items-center gap-1.5 bg-white rounded-xl p-1 shadow-md border border-white/90">
                  <input
                    type="search"
                    value={heroSearch}
                    onFocus={() => setDropdownOpen(true)}
                    onChange={(e) => {
                      setHeroSearch(e.target.value);
                      setDropdownOpen(true);
                    }}
                    placeholder={
                      lang === 'hi'
                        ? 'परीक्षा खोजें: RRB NTPC, JSSC, SSC CGL, पुलिस...'
                        : 'Search exams: RRB NTPC, JSSC, SSC CGL, IBPS, Police...'
                    }
                    aria-label={lang === 'hi' ? 'परीक्षा खोजें' : 'Search exams'}
                    className="flex-1 min-w-0 h-9 sm:h-10 pl-3 pr-1 rounded-lg bg-transparent text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:outline-none"
                  />
                  {heroSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeroSearch('');
                        setDropdownOpen(false);
                      }}
                      aria-label="Clear search"
                      className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (heroSearch.trim() && searchResults.length > 0) {
                        const first = searchResults[0];
                        const freeTest = first.tests[0];
                        setDropdownOpen(false);
                        if (freeTest) {
                          onStartTest(first, freeTest);
                        } else {
                          onSelectCategory(first.categoryId);
                        }
                      } else {
                        setDropdownOpen((prev) => !prev);
                      }
                    }}
                    aria-label={lang === 'hi' ? 'खोजें' : 'Search'}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs transition"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>

                {dropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-30 bg-white text-slate-900 border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                    {searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-xs sm:text-sm text-slate-500">
                        {lang === 'hi'
                          ? 'कोई परीक्षा नहीं मिली।'
                          : 'No matching exams found.'}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        {searchResults.map((exam) => {
                          const freeTest = exam.tests[0];
                          return (
                            <button
                              key={exam.id}
                              type="button"
                              onClick={() => {
                                setDropdownOpen(false);
                                if (freeTest) {
                                  onStartTest(exam, freeTest);
                                } else {
                                  onSelectCategory(exam.categoryId);
                                }
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center justify-between gap-3 transition"
                            >
                              <div className="min-w-0">
                                <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                  {exam.shortName} · {t(exam.name, lang)}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono-num">
                                  {exam.duration}m · {exam.totalMarks}{' '}
                                  {lang === 'hi' ? 'अंक' : 'Marks'} · -{exam.negativeMark}
                                </div>
                              </div>
                              <span className="text-xs font-bold text-[#2563EB] shrink-0 inline-flex items-center gap-1">
                                <span>{lang === 'hi' ? 'शुरू करें' : 'Start Free'}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Colorful Glowing Trust Pills */}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-sky-400/20 border border-sky-300/60 text-sky-100 text-[11px] font-bold font-mono-num shadow-[0_0_12px_rgba(56,189,248,0.35)]">
                  {lang === 'hi' ? '90+ पैक' : '90+ Packs'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/60 text-amber-200 text-[11px] font-bold shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                  {lang === 'hi' ? 'TCS iON पैटर्न' : 'TCS iON Pattern'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/60 text-emerald-100 text-[11px] font-bold shadow-[0_0_12px_rgba(52,211,153,0.32)]">
                  EN + हिंदी
                </span>
              </div>
            </div>

            {/* Resume Unfinished Test Card inside Hero */}
            {savedProgress && (
              <div className="lg:col-span-5 bg-white text-slate-900 rounded-xl p-3.5 border border-blue-200 shadow-sm min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'hi'
                        ? 'अधूरा टेस्ट जारी रखें'
                        : 'Resume Unfinished Test'}
                    </span>
                  </span>
                  <span className="font-mono-num text-xs font-bold text-[#1E40AF]">
                    {formatSecondsMMSS(savedProgress.timeLeft)}
                  </span>
                </div>

                <h2 className="mt-1 text-sm font-bold text-slate-900 truncate">
                  {t(savedProgress.examName, lang)} · {t(savedProgress.testTitle, lang)}
                </h2>
                <p className="mt-0.5 text-xs text-slate-600 font-mono-num">
                  {lang === 'hi' ? 'उत्तर दिए गए' : 'Answered'}:{' '}
                  <strong>{savedAnsweredCount}</strong>
                </p>

                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onResumeTest}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition min-h-[36px]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{lang === 'hi' ? 'जारी रखें' : 'Resume'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onDiscardSavedTest}
                    aria-label={lang === 'hi' ? 'टेस्ट हटाएं' : 'Discard test'}
                    className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition min-h-[36px]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 1B. COMPACT SLEEK REFERRAL BANNER (~40% Shorter Tight Horizontal Style) */}
        <section
          aria-label="Refer and Earn"
          className="relative overflow-hidden rounded-2xl p-2.5 sm:px-3.5 sm:py-3 bg-gradient-to-r from-[#4C1D95] via-[#3B0764] to-[#1E1B4B] text-white border border-amber-400/85 shadow-[0_6px_20px_rgba(76,29,149,0.28)]"
        >
          <div className="relative z-10 space-y-2">
            {/* Row 1: Title + "0/2 Joined" Gold Pill */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={onGoToDashboard}
                  title={lang === 'hi' ? 'रेफरल ट्रैकर देखें' : 'View Referral Tracker'}
                  aria-label={lang === 'hi' ? 'रेफरल ट्रैकर देखें' : 'View Referral Tracker'}
                  className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-300/50 flex items-center justify-center shrink-0 hover:bg-amber-400/30 transition"
                >
                  <Gift className="w-4 h-4 text-amber-300" />
                </button>
                <h2 className="text-xs sm:text-sm font-extrabold text-white tracking-tight truncate">
                  {lang === 'hi'
                    ? 'रेफर करें और ₹49 पैक फ्री पाएं'
                    : 'Refer & Unlock ₹49 Pack FREE'}
                </h2>
              </div>

              <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 text-[10px] sm:text-[11px] font-extrabold px-2.5 py-0.5 rounded-full tabular-nums whitespace-nowrap shrink-0 shadow-xs">
                {homeMilestoneCount}/2 {lang === 'hi' ? 'जुड़े' : 'Joined'}
              </span>
            </div>

            {/* Row 2: Mini Progress Indicator + Compact Share WhatsApp & Copy Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
              <div
                aria-label="Referral milestone tracker"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 border border-amber-300/30 text-[10px] font-bold shrink-0"
              >
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    homeMilestoneCount >= 1
                      ? 'bg-emerald-500/35 text-emerald-200'
                      : 'bg-white/10 text-white/85'
                  }`}
                >
                  {homeMilestoneCount >= 1 ? '✓ 1' : '1'}
                </span>
                <span
                  aria-hidden="true"
                  className={`w-3 h-[2px] ${
                    homeMilestoneCount >= 1 ? 'bg-emerald-300' : 'bg-amber-300/40'
                  }`}
                />
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    homeMilestoneCount >= 2
                      ? 'bg-emerald-500/35 text-emerald-200'
                      : 'bg-white/10 text-white/85'
                  }`}
                >
                  {homeMilestoneCount >= 2 ? '✓ 2' : '2'}
                </span>
                <span
                  aria-hidden="true"
                  className={`w-3 h-[2px] ${
                    homeMilestoneCount >= 2 ? 'bg-amber-300' : 'bg-amber-300/40'
                  }`}
                />
                <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 whitespace-nowrap">
                  🎁 ₹49
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-1 sm:flex-initial justify-end">
                <a
                  href={homeWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-[11px] sm:text-xs shadow-xs min-h-[34px] whitespace-nowrap transition"
                >
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{lang === 'hi' ? 'WhatsApp शेयर' : 'Share WhatsApp'}</span>
                </a>

                <button
                  type="button"
                  onClick={() => void handleCopyHomeReferral()}
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-900 font-extrabold text-[11px] sm:text-xs border border-amber-300 shadow-xs min-h-[34px] whitespace-nowrap transition"
                >
                  {copiedReferral ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#4C1D95] shrink-0" />
                  )}
                  <span>
                    {copiedReferral
                      ? lang === 'hi'
                        ? 'कॉपी!'
                        : 'Copied!'
                      : lang === 'hi'
                        ? 'कॉपी'
                        : 'Copy'}
                  </span>
                </button>

                {availableFreePacks > 0 && referralState.eligibleForRewards && (
                  <button
                    type="button"
                    onClick={onOpenClaimModal}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-[11px] sm:text-xs min-h-[34px] whitespace-nowrap transition"
                  >
                    <Gift className="w-3.5 h-3.5 shrink-0" />
                    <span>{lang === 'hi' ? 'क्लेम' : 'Claim'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tiny Single-Line Exclusion Note */}
            <div className="flex items-center justify-between gap-2 text-[10px] leading-tight">
              <p className="text-indigo-100/90 font-medium truncate">
                {lang === 'hi'
                  ? '*₹49/₹299 सक्रियण पर मान्य (₹1 ट्रायल शामिल नहीं)'
                  : '*Valid on ₹49/₹299 activation (₹1 Trial excluded)'}
              </p>
              {(referralState.isTrialOnly || referralState.trialBlockedCount > 0) && (
                <span className="text-amber-300 font-bold whitespace-nowrap shrink-0">
                  {referralState.isTrialOnly
                    ? lang === 'hi'
                      ? '₹1 ट्रायल ब्लॉक'
                      : 'Blocked on ₹1 Trial'
                    : lang === 'hi'
                      ? `${referralState.trialBlockedCount} ब्लॉक`
                      : `${referralState.trialBlockedCount} blocked`}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 2. FULL-WIDTH VERTICAL STACK OF DARK JEWEL-TONED CATEGORY BANNERS */}
        <section>
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {lang === 'hi' ? '9 परीक्षा श्रेणियां' : 'Explore 9 Exam Categories'}
            </h2>
            <button
              type="button"
              onClick={() => onSelectCategory('railway')}
              className="text-xs font-bold text-[#2563EB] hover:underline inline-flex items-center gap-1"
            >
              <span>
                {lang === 'hi'
                  ? `सभी ${EXAMS_CATALOG.length} पैक देखें`
                  : `View All ${EXAMS_CATALOG.length} Packs`}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {EXAM_CATEGORIES.map((cat) => {
              const stats = CATEGORY_EXAM_STATS[cat.id];
              return (
                <ExamCategoryCard
                  key={cat.id}
                  cat={cat}
                  lang={lang}
                  subExamCount={stats.subExamCount}
                  totalMocksCount={stats.totalMocksCount}
                  onExplore={handleOpenCategorySubView}
                />
              );
            })}
          </div>
        </section>

        {/* 3. LIVE TODAY & DAILY QUIZ SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-3.5">
            <Flame className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {lang === 'hi' ? 'आज लाइव अभ्यास और दैनिक क्विज़' : 'Live Today & Daily Quiz'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div
              role="button"
              tabIndex={0}
              onClick={onGoToQuiz}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onGoToQuiz();
                }
              }}
              className="bg-white border border-blue-100 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-[0.99] transition-all min-w-0"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] text-[#2563EB] border border-blue-100 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-[#1E40AF] uppercase tracking-wide">
                    {lang === 'hi' ? 'निःशुल्क दैनिक क्विज़' : 'Free Daily Capsule'}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate mt-0.5">
                    {lang === 'hi'
                      ? 'दैनिक करंट अफेयर्स क्विज़ (5 प्रश्न)'
                      : 'Daily Free Current Affairs Quiz (5 Qs)'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono-num">
                    5 {lang === 'hi' ? 'प्रश्न' : 'Qs'} · 5 {lang === 'hi' ? 'मिनट' : 'Mins'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onGoToQuiz();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold whitespace-nowrap shrink-0 transition min-h-[40px]"
              >
                {lang === 'hi' ? 'निःशुल्क शुरू करें' : 'Start Free'}
              </button>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={onLaunchSampleCbt}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onLaunchSampleCbt();
                }
              }}
              className="bg-white border border-blue-100 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs cursor-pointer hover:shadow-md hover:border-blue-200 active:scale-[0.99] transition-all min-w-0"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-[#EFF6FF] text-[#1E40AF] border border-blue-100 flex items-center justify-center shrink-0">
                  <Play className="w-5 h-5 fill-current" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-[#1E40AF] uppercase tracking-wide">
                    {lang === 'hi' ? 'अखिल भारतीय CBT' : 'All-India CBT Mode'}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate mt-0.5">
                    {lang === 'hi'
                      ? 'ऑल-इंडिया फ्री लाइव मॉक टेस्ट'
                      : 'All-India Free Live Mock'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono-num">
                    MCQ · MSQ · NAT · EN/हिंदी
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLaunchSampleCbt();
                }}
                className="px-3.5 py-2.5 rounded-xl bg-[#1E40AF] hover:bg-blue-900 text-white text-xs font-bold whitespace-nowrap shrink-0 transition min-h-[40px]"
              >
                {lang === 'hi' ? 'निःशुल्क शुरू करें' : 'Start Free'}
              </button>
            </div>
          </div>
        </section>

        {/* 4. FILTER TABS & TRENDING TEST SERIES CARDS */}
        <section aria-label="Exam Filters & Trending Series" className="space-y-4 min-w-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {QUICK_FILTERS.map((chip) => {
              const active = activeFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setActiveFilter(chip.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition min-h-[40px] ${
                    active
                      ? 'bg-[#1E40AF] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-[#2563EB] hover:text-[#1E40AF]'
                  }`}
                >
                  {t(chip.label, lang)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              {lang === 'hi' ? 'ट्रेंडिंग टेस्ट सीरीज़' : 'Trending Test Series'}
            </h2>
            <span className="text-xs text-slate-500 font-semibold font-mono-num">
              {trendingSeries.length} {lang === 'hi' ? 'मॉक टेस्ट' : 'Mocks'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {trendingSeries.map(({exam, test}) => {
              const isUnlocked =
                test.tier === 'free' ||
                unlockedSet.has(test.id) ||
                isPackUnlocked(test.id) ||
                isPackUnlocked(exam.id);
              const isPayingThis = payingTarget === test.id;
              const freeCount = exam.tests.filter((tst) => tst.tier === 'free').length;

              return (
                <SplitTestCard
                  key={test.id}
                  exam={exam}
                  lang={lang}
                  title={`${exam.shortName} · ${t(test.title, lang)}`}
                  totalTests={exam.tests.length}
                  freeTests={freeCount}
                  highlightText={
                    test.tier === 'free'
                      ? lang === 'hi'
                        ? `${freeCount} निःशुल्क मॉक · फुल पैक ₹49`
                        : `${freeCount} Free Mocks · ₹49 Full Pack`
                      : lang === 'hi'
                        ? `₹49 • ${exam.tests.length} टेस्ट (${freeCount} फ्री + ${exam.tests.length - freeCount} पेड)`
                        : `₹49 • ${exam.tests.length} Tests (${freeCount} Free + ${exam.tests.length - freeCount} Paid)`
                  }
                  actionLabel={
                    isUnlocked
                      ? lang === 'hi'
                        ? 'टेस्ट खोलें'
                        : 'Open Tests'
                      : lang === 'hi'
                        ? '1 दिन के लिए ₹1 ट्रायल'
                        : 'Start ₹1 Trial for 1 Day'
                  }
                  isPaidAction={!isUnlocked}
                  isLoading={isPayingThis}
                  disabled={payingTarget !== null || processingPlan !== null}
                  onAction={() => handleAttemptSeries(exam, test)}
                />
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
