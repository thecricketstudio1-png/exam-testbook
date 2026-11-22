import React, {memo, useCallback, useMemo} from 'react';
import type {User} from 'firebase/auth';
import {
  Clock,
  Info,
  Lock,
  Play,
} from 'lucide-react';
import {
  ExamCategory,
  ExamCategoryId,
  ExamItem,
  Language,
  MockTest,
} from '../types/exam';
import {EXAM_CATEGORIES, EXAMS_CATALOG} from '../data/exams';
import {t, UI_COPY} from '../data/i18n';
import {useSubscription} from '../context/SubscriptionContext';

const CATEGORY_MAP = new Map<ExamCategoryId, ExamCategory>(
  EXAM_CATEGORIES.map((cat) => [cat.id, cat]),
);

interface ExamsViewProps {
  lang: Language;
  selectedCategory: ExamCategoryId | 'all';
  onSelectCategory: (cat: ExamCategoryId | 'all') => void;
  searchQuery: string;
  unlockedTestIds: string[];
  onUnlockTests: (ids: string[]) => void;
  onStartTest: (exam: ExamItem, test: MockTest) => void;
  currentUser: User | null;
}

interface ExamSeriesCardProps {
  exam: ExamItem;
  category: ExamCategory | undefined;
  lang: Language;
  unlockedSet: Set<string>;
  isPackUnlocked: (id: string) => boolean;
  onTestClick: (exam: ExamItem, test: MockTest) => void;
}

const ExamSeriesCard = memo<ExamSeriesCardProps>(function ExamSeriesCard({
  exam,
  category,
  lang,
  unlockedSet,
  isPackUnlocked,
  onTestClick,
}) {
  return (
    <div className="bg-white border border-slate-200/90 hover:border-blue-200 rounded-2xl p-5 flex flex-col gap-4 shadow-xs hover:shadow-md transition-all duration-200">
      <div>
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E40AF] bg-[#EFF6FF] px-2.5 py-1 rounded-lg">
          {category ? t(category.name, lang) : ''} · {exam.shortName}
        </div>
        <h2 className="mt-2 text-base sm:text-lg font-extrabold text-slate-900">
          {t(exam.name, lang)}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-mono-num">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {exam.duration} {t(UI_COPY.exams.mins, lang)}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t(UI_COPY.exams.totalMarks, lang)}: {exam.totalMarks}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t(UI_COPY.exams.negativeMark, lang)}: -{exam.negativeMark}
          </span>
        </div>
      </div>

      {/* Test List */}
      <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
        {exam.tests.map((test) => {
          const isUnlocked =
            test.tier === 'free' ||
            unlockedSet.has(test.id) ||
            isPackUnlocked(test.id) ||
            isPackUnlocked(exam.id);
          return (
            <div
              key={test.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-800 truncate">
                  {t(test.title, lang)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 font-mono-num">
                  <span
                    className={
                      test.tier === 'free' || isUnlocked
                        ? 'text-emerald-600 font-semibold'
                        : 'text-slate-700 font-semibold'
                    }
                  >
                    {test.tier === 'free'
                      ? t(UI_COPY.exams.free, lang)
                      : isUnlocked
                        ? t(UI_COPY.exams.unlocked, lang)
                        : test.tier === 'bundle'
                          ? t(UI_COPY.exams.megaBundle, lang)
                          : `₹${test.priceInr}`}
                  </span>
                  {' · '}
                  {test.durationMinutes}m · {test.totalMarks}{' '}
                  {lang === 'hi' ? 'अंक' : 'Marks'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onTestClick(exam, test)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition min-h-[40px] ${
                  isUnlocked
                    ? 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-2xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {isUnlocked ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{t(UI_COPY.exams.startTest, lang)}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>
                      {lang === 'hi'
                        ? '1 दिन के लिए ₹1 ट्रायल'
                        : 'Start ₹1 Trial for 1 Day'}
                    </span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export const ExamsView: React.FC<ExamsViewProps> = ({
  lang,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  unlockedTestIds,
  onUnlockTests,
  onStartTest,
}) => {
  const {
    isPackUnlocked,
    openSubscriptionModal,
    clearError: clearSubError,
  } = useSubscription();

  const unlockedSet = useMemo(() => new Set(unlockedTestIds), [unlockedTestIds]);

  const filteredExams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return EXAMS_CATALOG.filter((exam) => {
      if (selectedCategory !== 'all' && exam.categoryId !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const cat = CATEGORY_MAP.get(exam.categoryId);
      const haystack = [
        exam.shortName,
        exam.name.en,
        exam.name.hi,
        cat?.name.en ?? '',
        cat?.name.hi ?? '',
        cat?.description.en ?? '',
        ...exam.tests.map((tst) => `${tst.title.en} ${tst.title.hi}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [selectedCategory, searchQuery]);

  const handleTestClick = useCallback(
    (exam: ExamItem, test: MockTest) => {
      // Free tests always work without login
      const isAccessible =
        test.tier === 'free' ||
        unlockedSet.has(test.id) ||
        isPackUnlocked(test.id) ||
        isPackUnlocked(exam.id);
      if (isAccessible) {
        onStartTest(exam, test);
      } else {
        clearSubError();
        openSubscriptionModal({
          initialTier: test.tier === 'bundle' ? 'category' : 'single',
          initialExamId: exam.id,
          initialCategoryId: exam.categoryId,
          onUnlocked: (ids) => {
            onUnlockTests(ids);
            onStartTest(exam, test);
          },
        });
      }
    },
    [
      clearSubError,
      isPackUnlocked,
      onStartTest,
      onUnlockTests,
      openSubscriptionModal,
      unlockedSet,
    ],
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 sm:py-7 space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-blue-100 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {t(UI_COPY.exams.heading, lang)}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1.5 mt-1">
            <Info className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
            <span>{t(UI_COPY.exams.sampleDataNotice, lang)}</span>
          </p>
        </div>
      </div>

      {/* Category Filter Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition shrink-0 min-h-[40px] ${
            selectedCategory === 'all'
              ? 'bg-[#1E40AF] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:border-[#2563EB] hover:text-[#1E40AF]'
          }`}
        >
          {t(UI_COPY.exams.allCategories, lang)} ({EXAMS_CATALOG.length})
        </button>
        {EXAM_CATEGORIES.map((cat) => {
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition shrink-0 min-h-[40px] ${
                active
                  ? 'bg-[#1E40AF] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:border-[#2563EB] hover:text-[#1E40AF]'
              }`}
            >
              {t(cat.name, lang)}
            </button>
          );
        })}
      </div>

      {/* Exams Grid */}
      {filteredExams.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-sm text-slate-600 shadow-xs">
          {t(UI_COPY.exams.noResults, lang)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredExams.map((exam) => (
            <ExamSeriesCard
              key={exam.id}
              exam={exam}
              category={CATEGORY_MAP.get(exam.categoryId)}
              lang={lang}
              unlockedSet={unlockedSet}
              isPackUnlocked={isPackUnlocked}
              onTestClick={handleTestClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};
