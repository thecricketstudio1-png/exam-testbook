import React, {useEffect, useMemo, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Cpu,
  Crown,
  Landmark,
  Loader2,
  Scale,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Train,
  X,
} from 'lucide-react';
import {EXAM_CATEGORIES, EXAMS_CATALOG} from '../data/exams';
import {t} from '../data/i18n';
import type {ExamCategory, ExamCategoryId, ExamItem, Language} from '../types/exam';

export type TrialTier = 'single' | 'category';

export interface TrialCheckoutSelection {
  tier: TrialTier;
  targetType: 'exam' | 'category';
  targetId: string;
  targetLabel: string;
  planId: string;
  autopayAmountInr: 49 | 299;
}

interface SubscriptionModalProps {
  open: boolean;
  lang: Language;
  initialTier?: TrialTier;
  initialExamId?: string;
  initialCategoryId?: ExamCategoryId;
  processing: boolean;
  error: string | null;
  isPackUnlocked: (id: string) => boolean;
  onClose: () => void;
  onConfirmCheckout: (selection: TrialCheckoutSelection) => Promise<void>;
}

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

const POPULAR_EXAM_IDS = [
  'rrb-group-d',
  'rrb-ntpc',
  'ssc-chsl',
  'ssc-cgl',
  'ibps-po',
];

const BUNDLE_NAMES: Record<ExamCategoryId, {en: string; hi: string}> = {
  railway: {en: 'Full Railway Bundle', hi: 'फुल रेलवे बंडल'},
  ssc: {en: 'Full SSC Bundle', hi: 'फुल SSC बंडल'},
  banking: {en: 'Full Banking Bundle', hi: 'फुल बैंकिंग बंडल'},
  police: {en: 'Full Police Bundle', hi: 'फुल पुलिस बंडल'},
  defence: {en: 'Full Defence Bundle', hi: 'फुल डिफेंस बंडल'},
  teaching: {en: 'Full Teaching/State TET Bundle', hi: 'फुल टीचिंग/राज्य TET बंडल'},
  upsc_psc: {en: 'Full UPSC & State PSC Bundle', hi: 'फुल UPSC एवं राज्य PSC बंडल'},
  other_govt: {en: 'Full Other Govt Bundle', hi: 'फुल अन्य सरकारी बंडल'},
  engineering: {en: 'Full Engineering Bundle', hi: 'फुल इंजीनियरिंग बंडल'},
};

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  open,
  lang,
  initialTier = 'single',
  initialExamId,
  initialCategoryId,
  processing,
  error,
  isPackUnlocked,
  onClose,
  onConfirmCheckout,
}) => {
  const [step, setStep] = useState<'tier' | 'target'>('tier');
  const [tier, setTier] = useState<TrialTier>(initialTier);
  const [examSearch, setExamSearch] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string>(
    initialExamId || POPULAR_EXAM_IDS[0],
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<ExamCategoryId>(
    initialCategoryId || 'railway',
  );
  const [submitting, setSubmitting] = useState(false);

  const isBusy = processing || submitting;

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    setStep('tier');
    setTier(initialTier);
    setExamSearch('');
    setSelectedExamId(initialExamId || POPULAR_EXAM_IDS[0]);
    setSelectedCategoryId(initialCategoryId || 'railway');
  }, [open, initialTier, initialExamId, initialCategoryId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, isBusy, onClose]);

  const sortedAndFilteredExams = useMemo<ExamItem[]>(() => {
    const q = examSearch.trim().toLowerCase();
    const filtered = EXAMS_CATALOG.filter((exam) => {
      if (!q) return true;
      const cat = EXAM_CATEGORIES.find((c) => c.id === exam.categoryId);
      return [
        exam.shortName,
        exam.name.en,
        exam.name.hi,
        cat?.name.en ?? '',
        cat?.name.hi ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    return [...filtered].sort((a, b) => {
      if (a.id === initialExamId && b.id !== initialExamId) return -1;
      if (b.id === initialExamId && a.id !== initialExamId) return 1;
      const aPop = POPULAR_EXAM_IDS.indexOf(a.id);
      const bPop = POPULAR_EXAM_IDS.indexOf(b.id);
      if (aPop !== -1 && bPop !== -1) return aPop - bPop;
      if (aPop !== -1) return -1;
      if (bPop !== -1) return 1;
      return 0;
    });
  }, [examSearch, initialExamId]);

  const categoryBundles = useMemo(() => {
    return EXAM_CATEGORIES.map((cat) => {
      const examsInCat = EXAMS_CATALOG.filter((ex) => ex.categoryId === cat.id);
      const totalTests = examsInCat.reduce((sum, ex) => sum + ex.tests.length, 0);
      const unlocked =
        isPackUnlocked(`cat_${cat.id}`) ||
        isPackUnlocked(cat.id) ||
        (examsInCat.length > 0 && examsInCat.every((ex) => isPackUnlocked(ex.id)));
      return {
        cat,
        bundleName: BUNDLE_NAMES[cat.id],
        examCount: examsInCat.length,
        totalTests,
        unlocked,
      };
    });
  }, [isPackUnlocked]);

  const selectedExam = useMemo(
    () =>
      EXAMS_CATALOG.find((ex) => ex.id === selectedExamId) ??
      EXAMS_CATALOG[0],
    [selectedExamId],
  );

  const selectedCategoryBundle = useMemo(
    () =>
      categoryBundles.find((b) => b.cat.id === selectedCategoryId) ??
      categoryBundles[0],
    [categoryBundles, selectedCategoryId],
  );

  const vitePlan49 =
    (import.meta.env.VITE_RAZORPAY_PLAN_ID_49 as string | undefined)?.trim() ||
    'RAZORPAY_PLAN_ID_49';
  const vitePlan299 =
    (import.meta.env.VITE_RAZORPAY_PLAN_ID_299 as string | undefined)?.trim() ||
    'RAZORPAY_PLAN_ID_299';

  const activePlanId = tier === 'single' ? vitePlan49 : vitePlan299;
  const activeAutopayInr: 49 | 299 = tier === 'single' ? 49 : 299;

  if (!open) return null;

  const handleConfirm = async () => {
    if (isBusy) return;
    setSubmitting(true);
    try {
      if (tier === 'single' && selectedExam) {
        await onConfirmCheckout({
          tier: 'single',
          targetType: 'exam',
          targetId: selectedExam.id,
          targetLabel: selectedExam.shortName,
          planId: vitePlan49,
          autopayAmountInr: 49,
        });
      } else if (tier === 'category' && selectedCategoryBundle) {
        await onConfirmCheckout({
          tier: 'category',
          targetType: 'category',
          targetId: selectedCategoryBundle.cat.id,
          targetLabel: t(selectedCategoryBundle.bundleName, lang),
          planId: vitePlan299,
          autopayAmountInr: 299,
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        lang === 'hi'
          ? '1 दिन के लिए ₹1 ट्रायल शुरू करें'
          : 'Start ₹1 Trial for 1 Day'
      }
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[60] bg-slate-950/75 flex items-center justify-center p-2.5 sm:p-5"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-fade-in">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#09142C] via-[#172554] to-[#1E40AF] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                {lang === 'hi'
                  ? '24-घंटे ₹1 ट्रायल · Razorpay Autopay'
                  : '24-Hour ₹1 Trial · Razorpay Subscription'}
              </div>
              <h2 className="text-base sm:text-lg font-extrabold truncate">
                {lang === 'hi'
                  ? '1 दिन के लिए ₹1 ट्रायल शुरू करें'
                  : 'Start ₹1 Trial for 1 Day'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            aria-label={lang === 'hi' ? 'बंद करें' : 'Close'}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 disabled:opacity-50 flex items-center justify-center transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive 2-Step Segmented Switcher */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => setStep('tier')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold text-left flex items-center gap-2 transition min-h-[40px] ${
              step === 'tier'
                ? 'bg-white text-[#1E40AF] border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0 ${
                step === 'tier'
                  ? 'bg-[#1E40AF] text-white'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {step === 'target' ? <Check className="w-3.5 h-3.5" /> : 'A'}
            </span>
            <span className="truncate">
              {lang === 'hi' ? 'स्टेप A: प्लान चुनें' : 'Step A: Choose Tier'}
            </span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => setStep('target')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold text-left flex items-center gap-2 transition min-h-[40px] ${
              step === 'target'
                ? 'bg-white text-[#1E40AF] border border-blue-200 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-extrabold flex items-center justify-center shrink-0 ${
                step === 'target'
                  ? 'bg-[#1E40AF] text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              B
            </span>
            <span className="truncate">
              {tier === 'single'
                ? lang === 'hi'
                  ? 'स्टेप B: 1 परीक्षा चुनें'
                  : 'Step B: Choose 1 Exam'
                : lang === 'hi'
                  ? 'स्टेप B: 1 कैटेगरी चुनें'
                  : 'Step B: Choose 1 Category'}
            </span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {step === 'tier' ? (
            <div className="space-y-3.5">
              <div className="text-xs sm:text-sm text-slate-600">
                {lang === 'hi'
                  ? 'अपना 24-घंटे ₹1 ट्रायल प्लान चुनें (परीक्षा के बाद कभी भी रद्द करें):'
                  : 'Pick your 24-hour ₹1 trial tier before selecting your exam or category:'}
              </div>

              {/* Tier 1: Single Exam Pack */}
              <button
                type="button"
                onClick={() => setTier('single')}
                className={`w-full text-left rounded-2xl p-4 sm:p-5 border-2 transition flex items-start justify-between gap-3 ${
                  tier === 'single'
                    ? 'border-[#2563EB] bg-blue-50/60 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-blue-200'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-extrabold text-slate-900">
                      {lang === 'hi' ? 'सिंगल परीक्षा पैक' : 'Single Exam Pack'}
                    </span>
                    <span className="text-[11px] font-mono-num text-slate-500">
                      · {vitePlan49}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#1E40AF] font-mono-num">
                    {lang === 'hi'
                      ? 'आज ₹1 (24 घंटे ट्रायल) → ₹49/वर्ष Autopay'
                      : '₹1 today (24h trial) → ₹49/yr Autopay'}
                  </div>
                  <p className="text-xs text-slate-600">
                    {lang === 'hi'
                      ? 'किसी 1 चुनी हुई परीक्षा (जैसे RRB NTPC, RRB Group D, SSC CGL, IBPS PO) के सभी मॉक टेस्ट अनलॉक करें।'
                      : 'Unlock all mock tests & bilingual solutions for any 1 selected exam (e.g., RRB Group D, RRB NTPC, SSC CHSL, SSC CGL, IBPS PO).'}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      tier === 'single'
                        ? 'border-[#2563EB] bg-[#2563EB] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {tier === 'single' && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-base font-extrabold font-mono-num text-slate-900">
                    ₹1 <span className="text-xs font-semibold text-slate-500">/ 24h</span>
                  </span>
                </div>
              </button>

              {/* Tier 2: Full Category Bundle */}
              <button
                type="button"
                onClick={() => setTier('category')}
                className={`w-full text-left rounded-2xl p-4 sm:p-5 border-2 transition flex items-start justify-between gap-3 ${
                  tier === 'category'
                    ? 'border-[#2563EB] bg-blue-50/60 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-blue-200'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm sm:text-base font-extrabold text-slate-900">
                      <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        {lang === 'hi'
                          ? 'फुल कैटेगरी बंडल'
                          : 'Full Category Bundle'}
                      </span>
                    </span>
                    <span className="text-[11px] font-mono-num text-slate-500">
                      · {vitePlan299}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#1E40AF] font-mono-num">
                    {lang === 'hi'
                      ? 'आज ₹1 (24 घंटे ट्रायल) → ₹299/वर्ष Autopay'
                      : '₹1 today (24h trial) → ₹299/yr Autopay'}
                  </div>
                  <p className="text-xs text-slate-600">
                    {lang === 'hi'
                      ? '1 पूरी श्रेणी (जैसे Full Railway Bundle, Full SSC Bundle, Full Banking Bundle) की सभी परीक्षाएं अनलॉक करें।'
                      : 'Unlock every exam & CBT stage inside 1 full category (e.g., Full Railway Bundle, Full SSC Bundle, Full Banking Bundle, Full Police Bundle).'}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      tier === 'category'
                        ? 'border-[#2563EB] bg-[#2563EB] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {tier === 'category' && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-base font-extrabold font-mono-num text-slate-900">
                    ₹1 <span className="text-xs font-semibold text-slate-500">/ 24h</span>
                  </span>
                </div>
              </button>
            </div>
          ) : tier === 'single' ? (
            /* Step B1: Searchable Individual Exam Picker */
            <div className="space-y-3">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="search"
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  placeholder={
                    lang === 'hi'
                      ? 'परीक्षा खोजें: RRB Group D, RRB NTPC, SSC CHSL, SSC CGL, IBPS PO...'
                      : 'Search exam: RRB Group D, RRB NTPC, SSC CHSL, SSC CGL, IBPS PO...'
                  }
                  className="w-full h-11 pl-10 pr-9 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                />
                {examSearch && (
                  <button
                    type="button"
                    onClick={() => setExamSearch('')}
                    aria-label="Clear exam search"
                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Popular Quick Picks */}
              <div className="flex flex-wrap items-center gap-1.5">
                {POPULAR_EXAM_IDS.map((popId) => {
                  const popExam = EXAMS_CATALOG.find((e) => e.id === popId);
                  if (!popExam) return null;
                  const active = selectedExamId === popExam.id;
                  return (
                    <button
                      key={popExam.id}
                      type="button"
                      onClick={() => setSelectedExamId(popExam.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition min-h-[32px] ${
                        active
                          ? 'bg-[#1E40AF] text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {popExam.shortName}
                    </button>
                  );
                })}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {sortedAndFilteredExams.length === 0 ? (
                  <div className="py-8 text-center text-xs sm:text-sm text-slate-500">
                    {lang === 'hi'
                      ? 'कोई मेल खाती परीक्षा नहीं मिली।'
                      : 'No matching exams found.'}
                  </div>
                ) : (
                  sortedAndFilteredExams.map((exam) => {
                    const cat = EXAM_CATEGORIES.find((c) => c.id === exam.categoryId);
                    const isSelected = selectedExam?.id === exam.id;
                    const alreadyUnlocked = isPackUnlocked(exam.id);
                    return (
                      <button
                        key={exam.id}
                        type="button"
                        onClick={() => setSelectedExamId(exam.id)}
                        className={`w-full px-3.5 py-3 text-left flex items-center justify-between gap-3 transition ${
                          isSelected
                            ? 'bg-blue-50/80'
                            : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {exam.shortName} · {t(exam.name, lang)}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono-num mt-0.5 truncate">
                            {cat ? t(cat.name, lang) : exam.categoryId} ·{' '}
                            {exam.tests.length} {lang === 'hi' ? 'टेस्ट' : 'Tests'}
                            {alreadyUnlocked && (
                              <span className="text-emerald-700 font-bold">
                                {' '}
                                · {lang === 'hi' ? 'अनलॉक्ड ✓' : 'Unlocked ✓'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-[#2563EB] bg-[#2563EB] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Step B2: Full Category Bundle Cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-0.5">
              {categoryBundles.map(({cat, bundleName, examCount, totalTests, unlocked}) => {
                const Icon = CATEGORY_ICONS[cat.iconName];
                const isSelected = selectedCategoryBundle?.cat.id === cat.id;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`text-left rounded-xl p-3.5 border-2 transition flex items-start justify-between gap-2.5 ${
                      isSelected
                        ? 'border-[#2563EB] bg-blue-50/75 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#1E40AF] text-white'
                            : 'bg-blue-50 text-[#1E40AF]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                          {t(bundleName, lang)}
                        </div>
                        <div className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                          {t(cat.description, lang)}
                        </div>
                        <div className="text-[11px] font-mono-num font-semibold text-slate-500 mt-1">
                          {examCount} {lang === 'hi' ? 'परीक्षाएं' : 'Exams'} ·{' '}
                          {totalTests} {lang === 'hi' ? 'टेस्ट' : 'Tests'}
                          {unlocked && (
                            <span className="text-emerald-700 font-bold">
                              {' '}
                              · {lang === 'hi' ? 'अनलॉक्ड ✓' : 'Unlocked ✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-[#2563EB] bg-[#2563EB] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Clear Summary Banner */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-900">
                {tier === 'single'
                  ? lang === 'hi'
                    ? `चयनित: ${selectedExam?.shortName} (सिंगल परीक्षा पैक)`
                    : `Selected: ${selectedExam?.shortName} (Single Exam Pack)`
                  : lang === 'hi'
                    ? `चयनित: ${t(selectedCategoryBundle.bundleName, lang)}`
                    : `Selected: ${t(selectedCategoryBundle.bundleName, lang)}`}
              </span>
              <span className="font-mono-num font-extrabold text-[#1E40AF]">
                {lang === 'hi'
                  ? `₹1 आज → ₹${activeAutopayInr}/वर्ष`
                  : `₹1 today → ₹${activeAutopayInr}/yr`}
              </span>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                {lang === 'hi'
                  ? '₹1 आज, फिर 24 घंटे बाद ₹49/yr या ₹299/yr Autopay • डैशबोर्ड से कभी भी रद्द करें'
                  : '₹1 today, then ₹49/yr or ₹299/yr Autopay after 24 hours • Cancel anytime in Dashboard'}
              </span>
            </div>

            <div className="text-[11px] font-mono-num text-slate-500">
              {lang === 'hi' ? 'प्लान आईडी' : 'Razorpay Plan ID'}: {activePlanId}
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2.5 shrink-0">
          {step === 'tier' ? (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold min-h-[44px] transition"
              >
                {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => setStep('target')}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold min-h-[44px] shadow-xs transition"
              >
                <span>
                  {tier === 'single'
                    ? lang === 'hi'
                      ? 'आगे बढ़ें: परीक्षा चुनें'
                      : 'Next: Choose 1 Exam'
                    : lang === 'hi'
                      ? 'आगे बढ़ें: कैटेगरी चुनें'
                      : 'Next: Choose 1 Category'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setStep('tier')}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs sm:text-sm font-bold min-h-[44px] transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{lang === 'hi' ? 'पीछे' : 'Back'}</span>
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={() => void handleConfirm()}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-70 text-slate-950 text-xs sm:text-sm font-extrabold min-h-[44px] shadow-xs transition"
              >
                {isBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {isBusy
                    ? lang === 'hi'
                      ? 'Razorpay खुल रहा है...'
                      : 'Opening Razorpay...'
                    : lang === 'hi'
                      ? '1 दिन के लिए ₹1 ट्रायल शुरू करें'
                      : 'Start ₹1 Trial for 1 Day'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
