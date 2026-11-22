import {lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {User} from 'firebase/auth';
import {
  AttemptResult,
  BilingualText,
  BookmarkItem,
  ExamCategoryId,
  ExamItem,
  Language,
  MockTest,
  NavTab,
  Question,
  SavedTestProgress,
} from './types/exam';
import {EXAMS_CATALOG} from './data/exams';
import {t, UI_COPY} from './data/i18n';
import {
  addAttemptResult,
  clearAttemptHistory,
  clearTestProgress,
  getAttemptHistory,
  getBookmarks,
  getCustomQuestions,
  getSavedLanguage,
  getSavedTestProgress,
  getUnlockedTestIds,
  saveCustomQuestions,
  saveLanguage,
  toggleBookmarkStorage,
  unlockTestIds,
} from './utils/storage';
import {Header} from './components/Header';
import {MobileBottomNav} from './components/MobileBottomNav';
import {HomeView} from './components/HomeView';
import {OfflineIndicator} from './components/OfflineIndicator';
import {PWAInstallBanner} from './components/PWAInstallBanner';
import type {ReferralUserState} from './utils/referral';
import {
  fetchUserAttempts,
  fetchUserEntitlements,
  saveUserAttempt,
  subscribeToAuth,
} from './lib/firebase';
import {useSubscription} from './context/SubscriptionContext';

const ExamsView = lazy(() =>
  import('./components/ExamsView').then((m) => ({default: m.ExamsView})),
);
const DailyQuizView = lazy(() =>
  import('./components/DailyQuizView').then((m) => ({default: m.DailyQuizView})),
);
const SavedView = lazy(() =>
  import('./components/SavedView').then((m) => ({default: m.SavedView})),
);
const DashboardView = lazy(() =>
  import('./components/DashboardView').then((m) => ({default: m.DashboardView})),
);
const TestEngine = lazy(() =>
  import('./components/TestEngine').then((m) => ({default: m.TestEngine})),
);
const ResultView = lazy(() =>
  import('./components/ResultView').then((m) => ({default: m.ResultView})),
);
const PrivacyPolicyModal = lazy(() =>
  import('./components/PrivacyPolicyModal').then((m) => ({
    default: m.PrivacyPolicyModal,
  })),
);
const WelcomeTrialPopup = lazy(() =>
  import('./components/WelcomeTrialPopup').then((m) => ({
    default: m.WelcomeTrialPopup,
  })),
);
const ReferralTrackerCard = lazy(() =>
  import('./components/ReferralHub').then((m) => ({
    default: m.ReferralTrackerCard,
  })),
);
const ReferralPackClaimModal = lazy(() =>
  import('./components/ReferralHub').then((m) => ({
    default: m.ReferralPackClaimModal,
  })),
);

let cachedSampleQuestions: Question[] | null = null;
async function loadSampleQuestions(): Promise<Question[]> {
  if (cachedSampleQuestions) return cachedSampleQuestions;
  const mod = await import('./data/questions');
  cachedSampleQuestions = mod.SAMPLE_DEV_QUESTIONS;
  return cachedSampleQuestions;
}

function ViewLoadingFallback() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-8">
      <div className="bg-white border border-blue-100 rounded-2xl p-6 space-y-3 animate-pulse">
        <div className="h-5 w-48 bg-slate-200 rounded-md" />
        <div className="h-4 w-72 bg-slate-100 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="h-28 bg-slate-100 rounded-xl" />
          <div className="h-28 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

const REFERRAL_PROFILES_KEY = 'etb_referral_profiles_v1';
const REFERRAL_CREDITS_KEY = 'etb_referral_credits_v1';
const REFERRAL_TRIAL_BLOCKED_KEY = 'etb_referral_trial_blocked_v1';
const REFERRED_BY_KEY = 'etb_referred_by_v1';
const WELCOME_POPUP_SEEN_KEY = 'etb_welcome_trial_popup_seen_v1';
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface StoredReferralProfile {
  code: string;
  simulatedJoins: number;
  claimedExamIds: string[];
  lastKnownTrialOnly?: boolean;
  lastKnownPaidActivated?: boolean;
}

interface StoredReferredBy {
  code: string;
  credited: boolean;
  capturedAt: number;
  status?: 'pending_activation' | 'blocked_trial' | 'credited';
}

function safeReadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

function generateReferralCode(seed?: string): string {
  if (seed) {
    let hash = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      hash ^= seed.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    let out = '';
    let val = hash >>> 0;
    for (let i = 0; i < 4; i++) {
      out += CODE_ALPHABET[val % CODE_ALPHABET.length];
      val = Math.floor(val / CODE_ALPHABET.length) + ((hash >>> (i * 7)) & 0xff);
    }
    return `ETB-${out}`;
  }
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `ETB-${out}`;
}

function getOrCreateReferralProfile(profileKey: string): StoredReferralProfile {
  const profiles = safeReadJson<Record<string, StoredReferralProfile>>(
    REFERRAL_PROFILES_KEY,
    {},
  );
  if (profiles[profileKey]?.code) {
    return profiles[profileKey];
  }
  const nextProfile: StoredReferralProfile = {
    code: generateReferralCode(profileKey === 'guest' ? undefined : profileKey),
    simulatedJoins: 0,
    claimedExamIds: [],
  };
  profiles[profileKey] = nextProfile;
  safeWriteJson(REFERRAL_PROFILES_KEY, profiles);
  return nextProfile;
}

function isReferrerProfileTrialOnly(refCode: string): boolean {
  const normalized = refCode.trim().toUpperCase();
  if (!normalized) return false;
  const profiles = safeReadJson<Record<string, StoredReferralProfile>>(
    REFERRAL_PROFILES_KEY,
    {},
  );
  const matching = Object.values(profiles).find(
    (p) => p.code.toUpperCase() === normalized,
  );
  if (!matching) return false;
  return Boolean(matching.lastKnownTrialOnly && !matching.lastKnownPaidActivated);
}

function markTrialBlockedReferral(refCode: string, joinerId: string): void {
  const normalized = refCode.trim().toUpperCase();
  if (!normalized) return;
  const blocked = safeReadJson<Record<string, string[]>>(
    REFERRAL_TRIAL_BLOCKED_KEY,
    {},
  );
  const list = blocked[normalized] ?? [];
  if (!list.includes(joinerId)) {
    blocked[normalized] = [...list, joinerId];
    safeWriteJson(REFERRAL_TRIAL_BLOCKED_KEY, blocked);
  }
}

function clearTrialBlockedReferral(refCode: string, joinerId: string): void {
  const normalized = refCode.trim().toUpperCase();
  if (!normalized) return;
  const blocked = safeReadJson<Record<string, string[]>>(
    REFERRAL_TRIAL_BLOCKED_KEY,
    {},
  );
  const list = blocked[normalized];
  if (list && list.includes(joinerId)) {
    blocked[normalized] = list.filter((id) => id !== joinerId);
    safeWriteJson(REFERRAL_TRIAL_BLOCKED_KEY, blocked);
  }
}

function creditReferrerCode(refCode: string, joinerId: string): boolean {
  const normalized = refCode.trim().toUpperCase();
  if (!normalized) return false;
  if (isReferrerProfileTrialOnly(normalized)) return false;
  const credits = safeReadJson<Record<string, string[]>>(REFERRAL_CREDITS_KEY, {});
  const list = credits[normalized] ?? [];
  if (list.includes(joinerId)) return false;
  credits[normalized] = [...list, joinerId];
  safeWriteJson(REFERRAL_CREDITS_KEY, credits);
  clearTrialBlockedReferral(normalized, joinerId);
  return true;
}

interface ActiveTestSession {
  test: MockTest;
  examName: BilingualText;
  questions: Question[];
  initialProgress?: SavedTestProgress | null;
}

interface AppNavSnapshot {
  __etbNav: true;
  tab: NavTab;
  homeCategory: ExamCategoryId | null;
  examsCategory: ExamCategoryId | 'all';
  inTest: boolean;
  inResult: boolean;
  claimModal: boolean;
  privacyModal: boolean;
}

function getNavSnapshotKey(s: AppNavSnapshot): string {
  return `${s.tab}|${s.homeCategory ?? ''}|${s.examsCategory}|${s.inTest ? 1 : 0}|${s.inResult ? 1 : 0}|${s.claimModal ? 1 : 0}|${s.privacyModal ? 1 : 0}`;
}

export default function App() {
  const [lang, setLang] = useState<Language>(() => getSavedLanguage());
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [homeCategory, setHomeCategory] = useState<ExamCategoryId | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ExamCategoryId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [savedProgress, setSavedProgress] = useState<SavedTestProgress | null>(() =>
    getSavedTestProgress(),
  );
  const [history, setHistory] = useState<AttemptResult[]>(() => getAttemptHistory());
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => getBookmarks());
  const [customQuestions, setCustomQuestions] = useState<Question[]>(() =>
    getCustomQuestions(),
  );
  const [unlockedTestIds, setUnlockedTestIds] = useState<string[]>(() =>
    getUnlockedTestIds(),
  );

  const [activeSession, setActiveSession] = useState<ActiveTestSession | null>(null);
  const [activeResult, setActiveResult] = useState<AttemptResult | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [welcomePopupOpen, setWelcomePopupOpen] = useState(false);
  const [privacyPolicyOpen, setPrivacyPolicyOpen] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      window.location.pathname.replace(/\/+$/, '') === '/privacy-policy',
  );
  const [referralVersion, setReferralVersion] = useState(0);
  const [referralNotice, setReferralNotice] = useState<string | null>(null);

  const {
    subscription,
    authReady,
    loading: subLoading,
    setUiLang,
    isTrialActive,
    isTrialOnlyAccount,
    hasPaidSubscription,
    isMegaPassActive,
    openSubscriptionModal,
  } = useSubscription();

  const userOnTrialOnly = isTrialOnlyAccount();
  const userPaidActivated = hasPaidSubscription();
  const hasActivePaidOrTrial =
    userPaidActivated ||
    userOnTrialOnly ||
    isTrialActive() ||
    isMegaPassActive();
  const referralEligible = userPaidActivated && !userOnTrialOnly;

  const hasInitHistoryRef = useRef(false);
  const isRestoringPopStateRef = useRef(false);
  const lastSnapshotKeyRef = useRef('');
  const prevInTestRef = useRef(false);
  const activeSessionRef = useRef<ActiveTestSession | null>(activeSession);
  const activeResultRef = useRef<AttemptResult | null>(activeResult);

  activeSessionRef.current = activeSession;
  activeResultRef.current = activeResult;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    setUiLang(lang);
  }, [lang, setUiLang]);

  useEffect(() => {
    if (subscription) {
      setUnlockedTestIds(getUnlockedTestIds());
    }
  }, [subscription]);

  // Show WelcomeTrialPopup automatically 1s after launch (once per session) for users without an active paid/trial plan
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!authReady || subLoading) return;
    if (hasActivePaidOrTrial || activeSession || privacyPolicyOpen) return;

    try {
      if (window.sessionStorage.getItem(WELCOME_POPUP_SEEN_KEY) === '1') {
        return;
      }
    } catch {
      // Ignore sessionStorage restrictions
    }

    const timer = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(WELCOME_POPUP_SEEN_KEY, '1');
      } catch {
        // Ignore sessionStorage restrictions
      }
      setWelcomePopupOpen(true);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [authReady, subLoading, hasActivePaidOrTrial, activeSession, privacyPolicyOpen]);

  // Persist trial/paid flags per profile and evaluate pending ?ref=CODE eligibility
  useEffect(() => {
    const profileKey = currentUser?.uid ?? 'guest';
    const profiles = safeReadJson<Record<string, StoredReferralProfile>>(
      REFERRAL_PROFILES_KEY,
      {},
    );
    const current = profiles[profileKey] ?? getOrCreateReferralProfile(profileKey);
    if (
      current.lastKnownTrialOnly !== userOnTrialOnly ||
      current.lastKnownPaidActivated !== userPaidActivated
    ) {
      profiles[profileKey] = {
        ...current,
        lastKnownTrialOnly: userOnTrialOnly,
        lastKnownPaidActivated: userPaidActivated,
      };
      safeWriteJson(REFERRAL_PROFILES_KEY, profiles);
      setReferralVersion((v) => v + 1);
    }

    if (!currentUser) return;
    const storedRef = safeReadJson<StoredReferredBy | null>(REFERRED_BY_KEY, null);
    if (!storedRef || storedRef.credited || storedRef.code === current.code) {
      return;
    }

    if (userOnTrialOnly) {
      markTrialBlockedReferral(storedRef.code, currentUser.uid);
      if (storedRef.status !== 'blocked_trial') {
        safeWriteJson<StoredReferredBy>(REFERRED_BY_KEY, {
          ...storedRef,
          credited: false,
          status: 'blocked_trial',
        });
        setReferralNotice(
          lang === 'hi'
            ? 'रेफरल रिवॉर्ड क्रेडिट ब्लॉक है: ₹1 ट्रायल खातों पर लागू नहीं (केवल ₹49/₹299 सब्सक्रिप्शन सक्रिय होने के बाद मान्य)।'
            : 'Referral reward credit blocked: Not applicable on ₹1 Trial accounts (valid only after ₹49/₹299 subscription activation).',
        );
        setReferralVersion((v) => v + 1);
      }
      return;
    }

    if (userPaidActivated) {
      if (isReferrerProfileTrialOnly(storedRef.code)) {
        setReferralNotice(
          lang === 'hi'
            ? 'रेफरल रिवॉर्ड क्रेडिट ब्लॉक है: आमंत्रित करने वाला खाता केवल ₹1 ट्रायल पर है (₹49/₹299 आवश्यक)।'
            : 'Referral reward credit blocked: Referrer account is only on a ₹1 Trial (requires ₹49/₹299 activation).',
        );
        return;
      }
      const credited = creditReferrerCode(storedRef.code, currentUser.uid);
      if (credited) {
        safeWriteJson<StoredReferredBy>(REFERRED_BY_KEY, {
          ...storedRef,
          credited: true,
          status: 'credited',
        });
        setReferralNotice(
          lang === 'hi'
            ? `रेफरल कोड ${storedRef.code} सक्रिय! ₹49/₹299 प्लान पर +1 जॉइन क्रेडिट हुआ।`
            : `Referral code ${storedRef.code} verified! +1 join credited after ₹49/₹299 activation.`,
        );
        setReferralVersion((v) => v + 1);
      }
    }
  }, [currentUser, lang, userOnTrialOnly, userPaidActivated]);

  // Detect ?ref=CODE on app load and save pending referral (credits ONLY after ₹49/₹299 activation, never on ₹1 Trial)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const rawRef = url.searchParams.get('ref');
    if (rawRef) {
      const normalizedRef = rawRef.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);
      if (normalizedRef.length >= 4) {
        const guestProfile = getOrCreateReferralProfile('guest');
        const existingStored = safeReadJson<StoredReferredBy | null>(REFERRED_BY_KEY, null);
        const alreadySame = existingStored?.code === normalizedRef;
        if (!alreadySame && normalizedRef !== guestProfile.code) {
          safeWriteJson<StoredReferredBy>(REFERRED_BY_KEY, {
            code: normalizedRef,
            credited: false,
            capturedAt: Date.now(),
            status: 'pending_activation',
          });
          setReferralNotice(
            lang === 'hi'
              ? `रेफरल कोड ${normalizedRef} सहेजा गया। ₹49/₹299 सब्सक्रिप्शन सक्रिय होने के बाद ही क्रेडिट होगा (₹1 ट्रायल पर लागू नहीं)।`
              : `Referral code ${normalizedRef} saved. Reward credits only after ₹49/₹299 subscription activation (not applicable on ₹1 Trial accounts).`,
          );
          setReferralVersion((v) => v + 1);
        }
      }
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, [lang]);

  // Listen to browser / Android hardware Back button (popstate)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = (event: PopStateEvent) => {
      const raw = event.state as Partial<AppNavSnapshot> | null;
      const isPrivacyPath =
        window.location.pathname.replace(/\/+$/, '') === '/privacy-policy';
      const target: AppNavSnapshot =
        raw && raw.__etbNav
          ? {
              __etbNav: true,
              tab: raw.tab ?? 'home',
              homeCategory: raw.homeCategory ?? null,
              examsCategory: raw.examsCategory ?? 'all',
              inTest: Boolean(raw.inTest),
              inResult: Boolean(raw.inResult),
              claimModal: Boolean(raw.claimModal),
              privacyModal: Boolean(raw.privacyModal) || isPrivacyPath,
            }
          : {
              __etbNav: true,
              tab: 'home',
              homeCategory: null,
              examsCategory: 'all',
              inTest: false,
              inResult: false,
              claimModal: false,
              privacyModal: isPrivacyPath,
            };

      const resolvedInTest = target.inTest && Boolean(activeSessionRef.current);
      const resolvedInResult = target.inResult && Boolean(activeResultRef.current);
      const resolvedSnapshot: AppNavSnapshot = {
        ...target,
        inTest: resolvedInTest,
        inResult: resolvedInResult,
      };

      isRestoringPopStateRef.current = true;
      lastSnapshotKeyRef.current = getNavSnapshotKey(resolvedSnapshot);
      prevInTestRef.current = resolvedInTest;

      if (!resolvedInTest && activeSessionRef.current) {
        setActiveSession(null);
        setSavedProgress(getSavedTestProgress());
      }
      if (!resolvedInResult && activeResultRef.current) {
        setActiveResult(null);
      }
      setClaimModalOpen(target.claimModal);
      setPrivacyPolicyOpen(target.privacyModal);
      setActiveTab(target.tab);
      setHomeCategory(target.homeCategory);
      setSelectedCategory(target.examsCategory);

      if (
        resolvedInTest !== target.inTest ||
        resolvedInResult !== target.inResult
      ) {
        window.history.replaceState(resolvedSnapshot, '');
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Push browser history entries whenever the user navigates to a sub-screen
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const snapshot: AppNavSnapshot = {
      __etbNav: true,
      tab: activeTab,
      homeCategory,
      examsCategory: selectedCategory,
      inTest: Boolean(activeSession),
      inResult: Boolean(activeResult),
      claimModal: claimModalOpen,
      privacyModal: privacyPolicyOpen,
    };
    const nextKey = getNavSnapshotKey(snapshot);
    const targetUrl = snapshot.privacyModal ? '/privacy-policy' : '/';

    if (!hasInitHistoryRef.current) {
      hasInitHistoryRef.current = true;
      lastSnapshotKeyRef.current = nextKey;
      prevInTestRef.current = snapshot.inTest;
      window.history.replaceState(snapshot, '', targetUrl);
      return;
    }

    if (isRestoringPopStateRef.current) {
      isRestoringPopStateRef.current = false;
      lastSnapshotKeyRef.current = nextKey;
      prevInTestRef.current = snapshot.inTest;
      return;
    }

    if (nextKey === lastSnapshotKeyRef.current) {
      prevInTestRef.current = snapshot.inTest;
      return;
    }

    const transitioningTestToResult =
      prevInTestRef.current && !snapshot.inTest && snapshot.inResult;

    lastSnapshotKeyRef.current = nextKey;
    prevInTestRef.current = snapshot.inTest;

    if (transitioningTestToResult) {
      window.history.replaceState(snapshot, '', targetUrl);
    } else {
      window.history.pushState(snapshot, '', targetUrl);
    }
  }, [
    activeTab,
    homeCategory,
    selectedCategory,
    activeSession,
    activeResult,
    claimModalOpen,
    privacyPolicyOpen,
  ]);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      if (!user) return;

      getOrCreateReferralProfile(user.uid);

      void (async () => {
        try {
          const [entitlements, remoteAttempts] = await Promise.all([
            fetchUserEntitlements(user.uid),
            fetchUserAttempts(user.uid),
          ]);

          if (entitlements.length > 0) {
            const hasBundle = entitlements.some(
              (e) => e.plan === 'bundle' || e.testId === 'ALL_MEGA_BUNDLE',
            );
            const idsToUnlock = hasBundle
              ? EXAMS_CATALOG.flatMap((ex) => ex.tests.map((tst) => tst.id))
              : entitlements.map((e) => e.testId);
            const mergedIds = unlockTestIds(idsToUnlock);
            setUnlockedTestIds(mergedIds);
          }

          if (remoteAttempts.length > 0) {
            setHistory((prev) => {
              const map = new Map<string, AttemptResult>();
              for (const item of [...prev, ...remoteAttempts]) {
                if (!map.has(item.id)) map.set(item.id, item);
              }
              return Array.from(map.values()).sort((a, b) => b.submittedAt - a.submittedAt);
            });
          }
        } catch {
          // Structured error already logged by handleFirestoreError
        }
      })();
    });
    return unsubscribe;
  }, []);

  const referralState = useMemo<ReferralUserState>(() => {
    void referralVersion;
    const profileKey = currentUser?.uid ?? 'guest';
    const profile = getOrCreateReferralProfile(profileKey);
    const credits = safeReadJson<Record<string, string[]>>(REFERRAL_CREDITS_KEY, {});
    const trialBlocked = safeReadJson<Record<string, string[]>>(
      REFERRAL_TRIAL_BLOCKED_KEY,
      {},
    );
    const rawCreditedJoins = (credits[profile.code] ?? []).length;
    const trialBlockedCount = (trialBlocked[profile.code] ?? []).length;
    const storedRef = safeReadJson<StoredReferredBy | null>(REFERRED_BY_KEY, null);
    const rawTotalJoins = profile.simulatedJoins + rawCreditedJoins;
    const rewardBlockedReason: ReferralUserState['rewardBlockedReason'] = userOnTrialOnly
      ? 'trial_only'
      : !userPaidActivated
        ? 'activation_required'
        : null;

    return {
      code: profile.code,
      friendsJoined: referralEligible ? rawTotalJoins : 0,
      claimedExamIds: profile.claimedExamIds,
      referredBy: storedRef?.code ?? null,
      simulatedJoins: referralEligible ? profile.simulatedJoins : 0,
      eligibleForRewards: referralEligible,
      isTrialOnly: userOnTrialOnly,
      isPaidActivated: userPaidActivated,
      trialBlockedCount,
      rewardBlockedReason,
    };
  }, [currentUser, referralEligible, referralVersion, userOnTrialOnly, userPaidActivated]);

  const availableFreePacks = referralEligible
    ? Math.max(
        0,
        Math.floor(referralState.friendsJoined / 2) - referralState.claimedExamIds.length,
      )
    : 0;

  const bookmarkedIds = useMemo(
    () => new Set(bookmarks.map((b) => b.questionId)),
    [bookmarks],
  );

  const handleToggleLang = useCallback((nextLang: Language) => {
    setLang(nextLang);
    saveLanguage(nextLang);
  }, []);

  const handleToggleBookmark = useCallback((q: Question) => {
    const updated = toggleBookmarkStorage(q);
    setBookmarks(updated);
  }, []);

  const buildQuestionsForTest = useCallback(
    async (test: MockTest): Promise<Question[]> => {
      const sampleQuestions = await loadSampleQuestions();
      const base = sampleQuestions.map((q) => ({
        ...q,
        negativeMark: q.type === 'NAT' && q.negativeMark === 0 ? 0 : test.negativeMark,
      }));
      return [...base, ...customQuestions];
    },
    [customQuestions],
  );

  const handleStartTest = useCallback(
    (exam: ExamItem, test: MockTest) => {
      void (async () => {
        const questions = await buildQuestionsForTest(test);
        setActiveResult(null);
        setActiveSession({
          test,
          examName: exam.name,
          questions,
          initialProgress: null,
        });
      })();
    },
    [buildQuestionsForTest],
  );

  const handleLaunchSampleCbt = useCallback(() => {
    const defaultExam = EXAMS_CATALOG[0]; // RRB NTPC
    const defaultTest = defaultExam.tests[0];
    handleStartTest(defaultExam, defaultTest);
  }, [handleStartTest]);

  const handleResumeTest = useCallback(() => {
    if (!savedProgress) return;
    const progressToResume = savedProgress;
    void (async () => {
      const sampleQuestions = await loadSampleQuestions();
      const exam =
        EXAMS_CATALOG.find((e) => e.id === progressToResume.examId) ??
        EXAMS_CATALOG[0];
      const test = exam.tests.find(
        (tst) => tst.id === progressToResume.testId,
      ) ?? {
        id: progressToResume.testId,
        examId: progressToResume.examId,
        title: progressToResume.testTitle,
        durationMinutes: Math.max(
          1,
          Math.round(progressToResume.totalDurationSeconds / 60),
        ),
        totalMarks: 100,
        negativeMark: exam.negativeMark,
        questionCount: sampleQuestions.length + customQuestions.length,
        tier: 'free' as const,
        priceInr: 0,
        sections: exam.sections,
      };
      const questions =
        progressToResume.testId === 'custom-admin-test'
          ? customQuestions.length > 0
            ? customQuestions
            : sampleQuestions
          : await buildQuestionsForTest(test);

      setActiveResult(null);
      setActiveSession({
        test,
        examName: progressToResume.examName,
        questions,
        initialProgress: progressToResume,
      });
    })();
  }, [savedProgress, customQuestions, buildQuestionsForTest]);

  const handleDiscardSavedTest = useCallback(() => {
    clearTestProgress();
    setSavedProgress(null);
  }, []);

  const handleTestComplete = useCallback(
    (result: AttemptResult) => {
      const updatedHistory = addAttemptResult(result);
      setHistory(updatedHistory);
      setSavedProgress(null);
      setActiveSession(null);
      setActiveResult(result);
      if (currentUser) {
        void saveUserAttempt(currentUser.uid, result).catch(() => {});
      }
    },
    [currentUser],
  );

  const handleTestExit = useCallback((saved: boolean) => {
    setActiveSession(null);
    if (saved) {
      setSavedProgress(getSavedTestProgress());
    } else {
      clearTestProgress();
      setSavedProgress(null);
    }
  }, []);

  const handleSaveCustomQuestions = useCallback((nextQuestions: Question[]) => {
    saveCustomQuestions(nextQuestions);
    setCustomQuestions(nextQuestions);
  }, []);

  const handleLaunchCustomTest = useCallback((questions: Question[]) => {
    if (questions.length === 0) return;
    const totalMarks = questions.reduce((acc, q) => acc + q.marks, 0);
    const customTest: MockTest = {
      id: 'custom-admin-test',
      examId: 'custom-admin',
      title: {en: 'Admin Custom Imported Mock Test', hi: 'एडमिन कस्टम इम्पोर्टेड मॉक टेस्ट'},
      durationMinutes: Math.max(10, questions.length * 2),
      totalMarks,
      negativeMark: 0.25,
      questionCount: questions.length,
      tier: 'free',
      priceInr: 0,
      sections: Array.from(
        new Map(questions.map((q) => [q.section.en, q.section])).values(),
      ),
    };
    setActiveResult(null);
    setActiveSession({
      test: customTest,
      examName: {en: 'Custom Bank', hi: 'कस्टम बैंक'},
      questions,
      initialProgress: null,
    });
  }, []);

  const handleUnlockTests = useCallback((ids: string[]) => {
    const next = unlockTestIds(ids);
    setUnlockedTestIds(next);
  }, []);

  const handleSimulateFriendJoin = useCallback(() => {
    if (userOnTrialOnly || !userPaidActivated) {
      setReferralNotice(
        lang === 'hi'
          ? 'रेफरल रिवॉर्ड क्रेडिट ब्लॉक है: ₹1 ट्रायल खातों पर लागू नहीं (केवल ₹49/₹299 सब्सक्रिप्शन सक्रिय होने के बाद मान्य)।'
          : 'Referral reward credit blocked: Not applicable on ₹1 Trial accounts (valid only after ₹49/₹299 subscription activation).',
      );
      return;
    }

    const profileKey = currentUser?.uid ?? 'guest';
    const profiles = safeReadJson<Record<string, StoredReferralProfile>>(
      REFERRAL_PROFILES_KEY,
      {},
    );
    const current = profiles[profileKey] ?? getOrCreateReferralProfile(profileKey);
    profiles[profileKey] = {
      ...current,
      simulatedJoins: current.simulatedJoins + 1,
    };
    safeWriteJson(REFERRAL_PROFILES_KEY, profiles);
    setReferralVersion((v) => v + 1);
  }, [currentUser, lang, userOnTrialOnly, userPaidActivated]);

  const handleClaimFreeExamPack = useCallback(
    (exam: ExamItem) => {
      if (userOnTrialOnly || !userPaidActivated) {
        setClaimModalOpen(false);
        setReferralNotice(
          lang === 'hi'
            ? 'रेफरल रिवॉर्ड क्लेम ब्लॉक है: ₹1 ट्रायल खातों पर लागू नहीं (केवल ₹49/₹299 सब्सक्रिप्शन सक्रिय होने के बाद मान्य)।'
            : 'Referral reward blocked: Not applicable on ₹1 Trial accounts (valid only after ₹49/₹299 subscription activation).',
        );
        return;
      }

      const profileKey = currentUser?.uid ?? 'guest';
      const profiles = safeReadJson<Record<string, StoredReferralProfile>>(
        REFERRAL_PROFILES_KEY,
        {},
      );
      const current = profiles[profileKey] ?? getOrCreateReferralProfile(profileKey);
      const credits = safeReadJson<Record<string, string[]>>(REFERRAL_CREDITS_KEY, {});
      const totalJoins = current.simulatedJoins + (credits[current.code] ?? []).length;
      const unlockedQuota = Math.floor(totalJoins / 2) - current.claimedExamIds.length;
      if (unlockedQuota <= 0) return;

      const examTestIds = exam.tests.map((item) => item.id);
      const merged = unlockTestIds(examTestIds);
      setUnlockedTestIds(merged);

      profiles[profileKey] = {
        ...current,
        claimedExamIds: [...current.claimedExamIds, exam.id],
      };
      safeWriteJson(REFERRAL_PROFILES_KEY, profiles);
      setReferralVersion((v) => v + 1);
      setClaimModalOpen(false);
      setReferralNotice(
        lang === 'hi'
          ? `${exam.shortName} (${exam.tests.length} टेस्ट) ₹0 में सफलतापूर्वक अनलॉक हो गया!`
          : `${exam.shortName} (${exam.tests.length} Tests) unlocked permanently for ₹0!`,
      );
    },
    [currentUser, lang, userOnTrialOnly, userPaidActivated],
  );

  const handleSelectNavTab = useCallback((tab: NavTab) => {
    setActiveResult(null);
    if (tab === 'home') {
      setHomeCategory(null);
    }
    setActiveTab(tab);
  }, []);

  const handleSelectCategoryFromHome = useCallback((catId: ExamCategoryId) => {
    setSelectedCategory(catId);
    setActiveResult(null);
    setActiveTab('exams');
  }, []);

  const handleCloseWelcomePopup = useCallback(() => {
    try {
      window.sessionStorage.setItem(WELCOME_POPUP_SEEN_KEY, '1');
    } catch {
      // Ignore sessionStorage restrictions
    }
    setWelcomePopupOpen(false);
  }, []);

  const handleWelcomeStartTrial = useCallback(() => {
    try {
      window.sessionStorage.setItem(WELCOME_POPUP_SEEN_KEY, '1');
    } catch {
      // Ignore sessionStorage restrictions
    }
    setWelcomePopupOpen(false);
    openSubscriptionModal({
      initialTier: 'single',
      onUnlocked: (ids) => handleUnlockTests(ids),
    });
  }, [handleUnlockTests, openSubscriptionModal]);

  const handleRetakeFromResult = useCallback(() => {
    if (!activeResult) return;
    if (activeResult.testId === 'custom-admin-test' && customQuestions.length > 0) {
      handleLaunchCustomTest(customQuestions);
      return;
    }
    const exam = EXAMS_CATALOG.find((e) => e.id === activeResult.examId) ?? EXAMS_CATALOG[0];
    const test = exam.tests.find((tst) => tst.id === activeResult.testId) ?? exam.tests[0];
    handleStartTest(exam, test);
  }, [activeResult, customQuestions, handleLaunchCustomTest, handleStartTest]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FC] text-slate-900">
      <Header
        activeTab={activeTab}
        onSelectTab={handleSelectNavTab}
        lang={lang}
        onToggleLang={handleToggleLang}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentUser={currentUser}
      />

      <main className="flex-1 pb-24 md:pb-12">
        {referralNotice && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs sm:text-sm font-semibold text-emerald-900 flex items-center justify-between gap-3">
              <span>{referralNotice}</span>
              <button
                type="button"
                onClick={() => setReferralNotice(null)}
                className="text-xs font-bold text-emerald-700 hover:underline shrink-0"
              >
                {lang === 'hi' ? 'बंद करें' : 'Dismiss'}
              </button>
            </div>
          </div>
        )}

        {activeResult ? (
          <Suspense fallback={<ViewLoadingFallback />}>
            <ResultView
              result={activeResult}
              lang={lang}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
              onRetake={handleRetakeFromResult}
              onBackDashboard={() => {
                setActiveResult(null);
                setActiveTab('dashboard');
              }}
            />
          </Suspense>
        ) : activeTab === 'home' ? (
          <HomeView
            lang={lang}
            savedProgress={savedProgress}
            onResumeTest={handleResumeTest}
            onDiscardSavedTest={handleDiscardSavedTest}
            onSelectCategory={handleSelectCategoryFromHome}
            onLaunchSampleCbt={handleLaunchSampleCbt}
            onGoToQuiz={() => setActiveTab('quiz')}
            onStartTest={handleStartTest}
            unlockedTestIds={unlockedTestIds}
            onUnlockTests={handleUnlockTests}
            referralState={referralState}
            onOpenClaimModal={() => setClaimModalOpen(true)}
            onGoToDashboard={() => setActiveTab('dashboard')}
            activeHomeCategory={homeCategory}
            onHomeCategoryChange={setHomeCategory}
          />
        ) : activeTab === 'exams' ? (
          <Suspense fallback={<ViewLoadingFallback />}>
            <ExamsView
              lang={lang}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              searchQuery={searchQuery}
              unlockedTestIds={unlockedTestIds}
              onUnlockTests={handleUnlockTests}
              onStartTest={handleStartTest}
              currentUser={currentUser}
            />
          </Suspense>
        ) : activeTab === 'quiz' ? (
          <Suspense fallback={<ViewLoadingFallback />}>
            <DailyQuizView
              lang={lang}
              bookmarkedIds={bookmarkedIds}
              onToggleBookmark={handleToggleBookmark}
            />
          </Suspense>
        ) : activeTab === 'saved' ? (
          <Suspense fallback={<ViewLoadingFallback />}>
            <SavedView
              lang={lang}
              bookmarks={bookmarks}
              onToggleBookmark={handleToggleBookmark}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<ViewLoadingFallback />}>
            <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-5 sm:pt-8 -mb-2">
              <ReferralTrackerCard
                lang={lang}
                referralState={referralState}
                onSimulateJoin={handleSimulateFriendJoin}
                onOpenClaimModal={() => setClaimModalOpen(true)}
                onNavigateToCategory={handleSelectCategoryFromHome}
              />
            </div>
            <DashboardView
              lang={lang}
              history={history}
              onViewAttempt={(attempt) => setActiveResult(attempt)}
              onClearHistory={() => {
                clearAttemptHistory();
                setHistory([]);
              }}
              customQuestions={customQuestions}
              onSaveCustomQuestions={handleSaveCustomQuestions}
              onLaunchCustomTest={handleLaunchCustomTest}
              currentUser={currentUser}
              onOpenPrivacyPolicy={() => setPrivacyPolicyOpen(true)}
            />
          </Suspense>
        )}
      </main>

      {/* Responsive Footer with Privacy Policy link (Home & all views) */}
      {!activeSession && (
        <footer className="border-t border-slate-200 bg-white py-5 pb-24 md:pb-5 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-center sm:text-left">
            <span>
              © {new Date().getFullYear()} {t(UI_COPY.brand.name, lang)} —{' '}
              {t(UI_COPY.brand.tagline, lang)}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <span className="hidden lg:inline">
                {lang === 'hi'
                  ? 'भारतीय सरकारी परीक्षाओं के लिए द्विभाषी CBT अभ्यास मंच'
                  : 'Bilingual CBT Practice Platform for Indian Government Exams'}
              </span>
              <a
                href="/privacy-policy"
                onClick={(e) => {
                  e.preventDefault();
                  setPrivacyPolicyOpen(true);
                }}
                className="font-bold text-[#1E40AF] hover:underline"
              >
                {lang === 'hi' ? 'गोपनीयता नीति (Privacy Policy)' : 'Privacy Policy'}
              </a>
            </div>
          </div>
        </footer>
      )}

      {!activeSession && (
        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={handleSelectNavTab}
          lang={lang}
          bookmarkCount={bookmarks.length}
        />
      )}

      {activeSession && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 bg-slate-950/75 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 shadow-xl">
                {lang === 'hi' ? 'CBT टेस्ट लोड हो रहा है...' : 'Loading CBT Engine...'}
              </div>
            </div>
          }
        >
          <TestEngine
            test={activeSession.test}
            examName={activeSession.examName}
            questions={activeSession.questions}
            initialProgress={activeSession.initialProgress}
            lang={lang}
            onToggleLang={handleToggleLang}
            bookmarkedIds={bookmarkedIds}
            onToggleBookmark={handleToggleBookmark}
            onComplete={handleTestComplete}
            onExit={handleTestExit}
          />
        </Suspense>
      )}

      {claimModalOpen && (
        <Suspense fallback={null}>
          <ReferralPackClaimModal
            open={claimModalOpen}
            lang={lang}
            unlockedTestIds={unlockedTestIds}
            availableFreePacks={availableFreePacks}
            onClose={() => setClaimModalOpen(false)}
            onClaimPack={handleClaimFreeExamPack}
          />
        </Suspense>
      )}

      {privacyPolicyOpen && (
        <Suspense fallback={null}>
          <PrivacyPolicyModal
            open={privacyPolicyOpen}
            lang={lang}
            onClose={() => setPrivacyPolicyOpen(false)}
          />
        </Suspense>
      )}

      {welcomePopupOpen && !activeSession && (
        <Suspense fallback={null}>
          <WelcomeTrialPopup
            open={welcomePopupOpen && !activeSession}
            lang={lang}
            onClose={handleCloseWelcomePopup}
            onStartTrial={handleWelcomeStartTrial}
          />
        </Suspense>
      )}

      <PWAInstallBanner lang={lang} hidden={Boolean(activeSession)} />

      <OfflineIndicator lang={lang} />
    </div>
  );
}
