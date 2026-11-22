import React, {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {User} from 'firebase/auth';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import {EXAM_CATEGORIES, EXAMS_CATALOG} from '../data/exams';
import type {ExamCategoryId, Language} from '../types/exam';
import {
  auth,
  bindInitialOrFreeDevice,
  completeEmailLinkSignIn,
  completeGoogleRedirectSignIn,
  computeEffectiveSwitchMetrics,
  db,
  ensureUserProfile,
  fetchUserEntitlements,
  fetchUserProfileDoc,
  fetchUserSubscriptionDoc,
  getOrCreateLocalDeviceId,
  handleFirestoreError,
  isCurrentUrlEmailSignInLink,
  OperationType,
  sendVerificationLinkToEmail,
  signInWithGoogle,
  subscribeToAuth,
  syncUserUnlockedPacksToProfile,
  transferActiveDeviceInFirestore,
  type UserDeviceLockProfile,
} from '../lib/firebase';
import {loadRazorpayScript} from '../lib/razorpay';
import {
  getSavedLanguage,
  getUnlockedTestIds,
  setUnlockedTestIds,
  unlockTestIds,
} from '../utils/storage';
import type {
  TrialCheckoutSelection,
  TrialTier,
} from '../components/SubscriptionModal';

const SubscriptionModal = React.lazy(() =>
  import('../components/SubscriptionModal').then((m) => ({
    default: m.SubscriptionModal,
  })),
);

export type SubscriptionPlanType = 'none' | 'trial' | 'annual' | 'mega';
export type SubscriptionStatusType = 'inactive' | 'active' | 'cancelled' | 'expired';

export interface UserSubscription {
  uid: string;
  plan: SubscriptionPlanType;
  status: SubscriptionStatusType;
  trialActive: boolean;
  trialUsed: boolean;
  trialExpiresAt: number;
  megaPassActive: boolean;
  megaPassExpiresAt: number;
  annualExpiresAt: number;
  unlockedPackIds: string[];
  lastPaymentId: string;
  lastAmountInr: number;
  cancelledAt: number;
  autopayAmountInr?: number;
  razorpayPlanId?: string;
  razorpaySubscriptionId?: string;
  targetType?: 'exam' | 'category' | 'all';
  targetId?: string;
  targetLabel?: string;
}

export interface SubscriptionModalOptions {
  initialTier?: TrialTier;
  initialExamId?: string;
  initialCategoryId?: ExamCategoryId;
  onUnlocked?: (unlockedTestIds: string[]) => void;
}

export interface DeviceLockInfo {
  localDeviceId: string;
  activeDeviceId: string | null;
  isLockedToOtherDevice: boolean;
  switchesUsed: number;
  switchesRemaining: number;
  nextResetAt: number;
}

interface PendingAuthRequest {
  selection?: TrialCheckoutSelection;
  resolve: (user: User) => void;
  reject: (err: Error) => void;
}

interface PendingTestCheckout {
  plan: 'trial' | 'annual' | 'mega';
  amountInr: number;
  title: string;
  description: string;
  summaryLine?: string;
  planIdLabel?: string;
  user: User;
  resolve: (paymentId: string) => void;
  reject: (err: Error) => void;
}

export interface SubscriptionContextValue {
  subscription: UserSubscription | null;
  userProfile: UserDeviceLockProfile | null;
  deviceLock: DeviceLockInfo;
  currentUser: User | null;
  authReady: boolean;
  loading: boolean;
  processingPlan: 'trial' | 'annual' | 'mega' | null;
  error: string | null;
  clearError: () => void;
  uiLang: Language;
  setUiLang: (lang: Language) => void;
  openAuthModal: () => Promise<User | null>;
  openDeviceTransferModal: () => void;
  transferPassToCurrentDevice: () => Promise<boolean>;
  openSubscriptionModal: (options?: SubscriptionModalOptions) => void;
  closeSubscriptionModal: () => void;
  isTrialActive: () => boolean;
  isTrialOnlyAccount: () => boolean;
  hasPaidSubscription: () => boolean;
  isPackUnlocked: (id: string) => boolean;
  isMegaPassActive: () => boolean;
  purchaseTrial: () => Promise<boolean>;
  purchaseTrialSubscription: (
    selection: TrialCheckoutSelection,
  ) => Promise<string[] | null>;
  purchaseAnnualPlan: (packId?: string, packTitle?: string) => Promise<boolean>;
  purchaseMegaPass: () => Promise<boolean>;
  cancelSubscription: () => Promise<void>;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const PENDING_TRIAL_CHECKOUT_KEY = 'etb_pending_trial_checkout_v1';
const SUB_CACHE_STORAGE_KEY = 'etb_sub_cache_v1';
const LAST_UID_STORAGE_KEY = 'etb_last_uid_v1';

const TEST_TO_EXAM_MAP = new Map<string, string>();
const TEST_TO_CATEGORY_MAP = new Map<string, ExamCategoryId>();
const EXAM_TO_CATEGORY_MAP = new Map<string, ExamCategoryId>();
const EXAM_TESTS_MAP = new Map<string, string[]>();
const CATEGORY_TESTS_MAP = new Map<string, string[]>();
const FREE_TEST_IDS = new Set<string>();
const ALL_TEST_IDS: string[] = [];

for (const cat of EXAM_CATEGORIES) {
  CATEGORY_TESTS_MAP.set(cat.id, []);
}

for (const exam of EXAMS_CATALOG) {
  EXAM_TO_CATEGORY_MAP.set(exam.id, exam.categoryId);
  const testIds: string[] = [];
  const catTestList = CATEGORY_TESTS_MAP.get(exam.categoryId) ?? [];
  for (const tst of exam.tests) {
    TEST_TO_EXAM_MAP.set(tst.id, exam.id);
    TEST_TO_CATEGORY_MAP.set(tst.id, exam.categoryId);
    testIds.push(tst.id);
    catTestList.push(tst.id);
    ALL_TEST_IDS.push(tst.id);
    if (tst.tier === 'free') {
      FREE_TEST_IDS.add(tst.id);
    }
  }
  EXAM_TESTS_MAP.set(exam.id, testIds);
  CATEGORY_TESTS_MAP.set(exam.categoryId, catTestList);
}

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128) || 'pack';
}

function savePendingTrialSelection(selection?: TrialCheckoutSelection): void {
  if (typeof window === 'undefined') return;
  try {
    if (selection) {
      window.localStorage.setItem(
        PENDING_TRIAL_CHECKOUT_KEY,
        JSON.stringify(selection),
      );
    }
  } catch {
    // Ignore storage errors
  }
}

function consumePendingTrialSelection(): TrialCheckoutSelection | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PENDING_TRIAL_CHECKOUT_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(PENDING_TRIAL_CHECKOUT_KEY);
    const parsed = JSON.parse(raw) as Partial<TrialCheckoutSelection>;
    if (
      (parsed.tier === 'single' || parsed.tier === 'category') &&
      (parsed.targetType === 'exam' || parsed.targetType === 'category') &&
      typeof parsed.targetId === 'string' &&
      typeof parsed.targetLabel === 'string' &&
      typeof parsed.planId === 'string' &&
      (parsed.autopayAmountInr === 49 || parsed.autopayAmountInr === 299)
    ) {
      return parsed as TrialCheckoutSelection;
    }
  } catch {
    try {
      window.localStorage.removeItem(PENDING_TRIAL_CHECKOUT_KEY);
    } catch {
      // Ignore
    }
  }
  return null;
}

function createEmptySubscription(uid: string): UserSubscription {
  return {
    uid,
    plan: 'none',
    status: 'inactive',
    trialActive: false,
    trialUsed: false,
    trialExpiresAt: 0,
    megaPassActive: false,
    megaPassExpiresAt: 0,
    annualExpiresAt: 0,
    unlockedPackIds: [],
    lastPaymentId: 'none',
    lastAmountInr: 0,
    cancelledAt: 0,
  };
}

function parseSubscriptionDoc(
  uid: string,
  data: Record<string, unknown>,
): UserSubscription {
  const planRaw = data.plan;
  const plan: SubscriptionPlanType =
    planRaw === 'trial' || planRaw === 'annual' || planRaw === 'mega'
      ? planRaw
      : 'none';

  const statusRaw = data.status;
  const status: SubscriptionStatusType =
    statusRaw === 'active' ||
    statusRaw === 'cancelled' ||
    statusRaw === 'expired'
      ? statusRaw
      : 'inactive';

  const unlockedPackIds = Array.isArray(data.unlockedPackIds)
    ? data.unlockedPackIds
        .filter((item): item is string => typeof item === 'string' && item.length > 0)
        .slice(0, 200)
    : [];

  const targetTypeRaw = data.targetType;
  const targetType =
    targetTypeRaw === 'exam' ||
    targetTypeRaw === 'category' ||
    targetTypeRaw === 'all'
      ? targetTypeRaw
      : undefined;

  return {
    uid: typeof data.uid === 'string' ? data.uid : uid,
    plan,
    status,
    trialActive: Boolean(data.trialActive),
    trialUsed: Boolean(data.trialUsed),
    trialExpiresAt: Number(data.trialExpiresAt || 0),
    megaPassActive: Boolean(data.megaPassActive),
    megaPassExpiresAt: Number(data.megaPassExpiresAt || 0),
    annualExpiresAt: Number(data.annualExpiresAt || 0),
    unlockedPackIds,
    lastPaymentId:
      typeof data.lastPaymentId === 'string' && data.lastPaymentId
        ? data.lastPaymentId
        : 'none',
    lastAmountInr: Number(data.lastAmountInr || 0),
    cancelledAt: Number(data.cancelledAt || 0),
    autopayAmountInr:
      typeof data.autopayAmountInr === 'number' ? data.autopayAmountInr : undefined,
    razorpayPlanId:
      typeof data.razorpayPlanId === 'string' ? data.razorpayPlanId : undefined,
    razorpaySubscriptionId:
      typeof data.razorpaySubscriptionId === 'string'
        ? data.razorpaySubscriptionId
        : undefined,
    targetType,
    targetId: typeof data.targetId === 'string' ? data.targetId : undefined,
    targetLabel: typeof data.targetLabel === 'string' ? data.targetLabel : undefined,
  };
}

function parseUserDeviceProfile(
  uid: string,
  data: Record<string, unknown>,
): UserDeviceLockProfile {
  const unlockedPackIds = Array.isArray(data.unlockedPackIds)
    ? data.unlockedPackIds
        .filter((item): item is string => typeof item === 'string' && item.length > 0)
        .slice(0, 200)
    : [];

  const activePlan =
    data.activePlan === 'trial' ||
    data.activePlan === 'annual' ||
    data.activePlan === 'mega'
      ? data.activePlan
      : 'none';

  return {
    uid,
    activeDeviceId:
      typeof data.activeDeviceId === 'string' && data.activeDeviceId
        ? data.activeDeviceId
        : null,
    deviceSwitchesUsed: Number(data.deviceSwitchesUsed || 0),
    deviceSwitchWindowStart: Number(data.deviceSwitchWindowStart || 0),
    unlockedPackIds,
    activePlan,
  };
}

interface CachedSubscriptionPayload {
  uid: string;
  subscription: UserSubscription;
  userProfile: UserDeviceLockProfile;
  hasPaidEntitlement: boolean;
  updatedAt: number;
}

function readCachedSubscriptionState(
  explicitUid?: string | null,
): CachedSubscriptionPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const targetUid =
      explicitUid ||
      auth.currentUser?.uid ||
      window.localStorage.getItem(LAST_UID_STORAGE_KEY);
    if (!targetUid) return null;

    const raw = window.localStorage.getItem(SUB_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, CachedSubscriptionPayload>;
    const entry = map?.[targetUid];
    if (!entry || entry.uid !== targetUid || !entry.subscription || !entry.userProfile) {
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeCachedSubscriptionState(payload: CachedSubscriptionPayload): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(SUB_CACHE_STORAGE_KEY);
    const map = raw
      ? (JSON.parse(raw) as Record<string, CachedSubscriptionPayload>)
      : {};
    map[payload.uid] = payload;
    window.localStorage.setItem(SUB_CACHE_STORAGE_KEY, JSON.stringify(map));
    window.localStorage.setItem(LAST_UID_STORAGE_KEY, payload.uid);
  } catch {
    // Ignore storage quota errors
  }
}

function clearLastCachedUid(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LAST_UID_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

function expandUnlockedIds(ids: string[]): string[] {
  const expanded = new Set<string>();
  for (const id of ids) {
    if (id === 'ALL_MEGA_BUNDLE') {
      for (const tid of ALL_TEST_IDS) {
        expanded.add(tid);
      }
      continue;
    }

    const catKey = id.startsWith('cat_') ? id.slice(4) : id;
    const catTests = CATEGORY_TESTS_MAP.get(catKey);
    if (catTests && catTests.length > 0) {
      expanded.add(catKey);
      expanded.add(`cat_${catKey}`);
      for (const tid of catTests) {
        expanded.add(tid);
      }
      for (const ex of EXAMS_CATALOG) {
        if (ex.categoryId === catKey) {
          expanded.add(ex.id);
        }
      }
      continue;
    }

    expanded.add(id);
    const testsForExam = EXAM_TESTS_MAP.get(id);
    if (testsForExam) {
      for (const tid of testsForExam) {
        expanded.add(tid);
      }
    }
  }
  return Array.from(expanded);
}

const GoogleMark: React.FC = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="w-4 h-4 shrink-0"
  >
    <path
      fill="#EA4335"
      d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.6-5.4 3.6-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.2-.2-1.7H12z"
    />
    <path
      fill="#34A853"
      d="M3.3 7.5l3.2 2.3C7.4 7.8 9.5 6.3 12 6.3c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.1 14.6 2.2 12 2.2c-3.8 0-7.1 2.2-8.7 5.3z"
    />
    <path
      fill="#FBBC05"
      d="M12 21.8c2.6 0 4.8-.9 6.4-2.4l-3-2.5c-.8.6-1.9 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1l-3.2 2.5c1.6 3.2 4.9 5.5 8.8 5.5z"
    />
    <path
      fill="#4285F4"
      d="M21.4 12.2c0-.6-.1-1.2-.2-1.7H12v3.9h5.4c-.3 1.3-1 2.3-2 3l3 2.5c1.8-1.6 3-4.1 3-7.7z"
    />
  </svg>
);

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export const SubscriptionProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const localDeviceId = useMemo(() => getOrCreateLocalDeviceId(), []);
  const initialCache = useMemo(
    () => readCachedSubscriptionState(auth.currentUser?.uid ?? null),
    [],
  );

  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [authReady, setAuthReady] = useState(() => Boolean(auth.currentUser || initialCache));
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    () => initialCache?.subscription ?? null,
  );
  const [userProfile, setUserProfile] = useState<UserDeviceLockProfile | null>(
    () => initialCache?.userProfile ?? null,
  );
  const [profileLoaded, setProfileLoaded] = useState(() => Boolean(initialCache));
  const [subLoaded, setSubLoaded] = useState(() => Boolean(initialCache));
  // Render UI in 0ms without blocking while background getDoc sync runs
  const [loading, setLoading] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<
    'trial' | 'annual' | 'mega' | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [uiLang, setUiLang] = useState<Language>(() => getSavedLanguage());
  const [localUnlockedIds, setLocalUnlockedIds] = useState<string[]>(() =>
    getUnlockedTestIds(),
  );
  const [hasPaidEntitlement, setHasPaidEntitlement] = useState(
    () => initialCache?.hasPaidEntitlement ?? false,
  );

  // Unified 2-Step SubscriptionModal state
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [subModalOpts, setSubModalOpts] = useState<SubscriptionModalOptions>({});
  const subModalOptsRef = useRef<SubscriptionModalOptions>({});
  subModalOptsRef.current = subModalOpts;
  const [subModalError, setSubModalError] = useState<string | null>(null);

  // Dual Sign-In Modal State (1-Tap Google + Passwordless Email Verification Link)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authEmailLinkSentTo, setAuthEmailLinkSentTo] = useState<string | null>(
    null,
  );
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authModalError, setAuthModalError] = useState<string | null>(null);
  const pendingAuthRef = useRef<PendingAuthRequest | null>(null);

  // Email Confirmation Modal (when verification link is opened on another browser without localStorage)
  const [needsEmailConfirmOpen, setNeedsEmailConfirmOpen] = useState(false);
  const [confirmLinkEmail, setConfirmLinkEmail] = useState('');
  const [confirmLinkSubmitting, setConfirmLinkSubmitting] = useState(false);
  const [confirmLinkError, setConfirmLinkError] = useState<string | null>(null);

  // 1-Device Lock Transfer Modal
  const [deviceTransferModalOpen, setDeviceTransferModalOpen] = useState(false);
  const [deviceTransferProcessing, setDeviceTransferProcessing] = useState(false);
  const [deviceTransferError, setDeviceTransferError] = useState<string | null>(
    null,
  );
  const promptedMismatchKeyRef = useRef<string | null>(null);
  const boundDeviceAttemptRef = useRef<string | null>(null);

  // Sandbox Checkout Modal (when neither server live keys nor VITE_RAZORPAY_KEY_ID is configured)
  const [testCheckout, setTestCheckout] = useState<PendingTestCheckout | null>(
    null,
  );

  const clearError = useCallback(() => {
    setError(null);
    setSubModalError(null);
  }, []);

  // Complete Passwordless Email Verification Link or Google Redirect Sign-In on App Load
  useEffect(() => {
    let active = true;

    const handleReturnFromAuthLink = async () => {
      try {
        if (isCurrentUrlEmailSignInLink()) {
          const user = await completeEmailLinkSignIn();
          if (user && active) {
            setCurrentUser(user);
            setAuthModalOpen(false);
            setAuthEmailLinkSentTo(null);
          }
          return;
        }

        const redirectUser = await completeGoogleRedirectSignIn();
        if (redirectUser && active) {
          setCurrentUser(redirectUser);
          setAuthModalOpen(false);
        }
      } catch (err) {
        if (!active) return;
        const code = (err as {code?: string} | null)?.code ?? '';
        if (code === 'etb/needs-email-confirmation') {
          setNeedsEmailConfirmOpen(true);
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : uiLang === 'hi'
              ? 'साइन-इन लिंक अमान्य या समाप्त हो गया है।'
              : 'Sign-in link is invalid or expired. Please request a new link.',
        );
      }
    };

    void handleReturnFromAuthLink();
    return () => {
      active = false;
    };
  }, [uiLang]);

  // Lightweight one-time getDoc sync for user profile, subscription, and entitlements
  const syncSubscriptionFromServer = useCallback(async (user: User): Promise<void> => {
    try {
      await ensureUserProfile(user).catch(() => {});

      const [profileData, subData, entitlements] = await Promise.all([
        fetchUserProfileDoc(user.uid),
        fetchUserSubscriptionDoc(user.uid),
        fetchUserEntitlements(user.uid).catch(() => []),
      ]);

      const nextProfile: UserDeviceLockProfile = profileData
        ? parseUserDeviceProfile(user.uid, profileData)
        : {
            uid: user.uid,
            activeDeviceId: null,
            deviceSwitchesUsed: 0,
            deviceSwitchWindowStart: 0,
            unlockedPackIds: [],
            activePlan: 'none',
          };

      const nextSubscription: UserSubscription = subData
        ? parseSubscriptionDoc(user.uid, subData)
        : createEmptySubscription(user.uid);

      const paidEnt = entitlements.some((e) => (e.amountInr ?? 0) >= 39);

      setUserProfile(nextProfile);
      setSubscription(nextSubscription);
      setHasPaidEntitlement(paidEnt);
      setProfileLoaded(true);
      setSubLoaded(true);
      setLoading(false);

      writeCachedSubscriptionState({
        uid: user.uid,
        subscription: nextSubscription,
        userProfile: nextProfile,
        hasPaidEntitlement: paidEnt,
        updatedAt: Date.now(),
      });
    } catch (err) {
      setProfileLoaded(true);
      setSubLoaded(true);
      setLoading(false);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to sync subscription with Firestore.',
      );
    }
  }, []);

  // Listen to Firebase Auth only; hydrate from localStorage cache in 0ms + run one-time getDoc sync on login
  useEffect(() => {
    let active = true;

    const unsubAuth = subscribeToAuth((user) => {
      if (!active) return;
      setCurrentUser(user);
      setAuthReady(true);

      if (!user) {
        clearLastCachedUid();
        setSubscription(null);
        setUserProfile(null);
        setProfileLoaded(false);
        setSubLoaded(false);
        setHasPaidEntitlement(false);
        setDeviceTransferModalOpen(false);
        promptedMismatchKeyRef.current = null;
        boundDeviceAttemptRef.current = null;
        setLoading(false);
        return;
      }

      if (pendingAuthRef.current) {
        const pending = pendingAuthRef.current;
        pendingAuthRef.current = null;
        setAuthModalOpen(false);
        setAuthEmailLinkSentTo(null);
        setAuthModalError(null);
        pending.resolve(user);
      }

      // Instant 0ms localStorage hydration if cached for this user
      const cached = readCachedSubscriptionState(user.uid);
      if (cached) {
        setUserProfile(cached.userProfile);
        setSubscription(cached.subscription);
        setHasPaidEntitlement(cached.hasPaidEntitlement);
        setProfileLoaded(true);
        setSubLoaded(true);
        setLoading(false);
      }

      // Lightweight one-time getDoc fetch on login (no continuous onSnapshot listener)
      void syncSubscriptionFromServer(user);
    });

    return () => {
      active = false;
      unsubAuth();
    };
  }, [syncSubscriptionFromServer]);

  const hasOwnedPass = useMemo(() => {
    if (!currentUser) return false;
    const now = Date.now();
    if (
      subscription &&
      subscription.status === 'active' &&
      ((subscription.trialActive && subscription.trialExpiresAt > now) ||
        (subscription.megaPassActive && subscription.megaPassExpiresAt > now) ||
        subscription.unlockedPackIds.length > 0)
    ) {
      return true;
    }
    if (userProfile?.activePlan && userProfile.activePlan !== 'none') {
      return true;
    }
    if (userProfile?.unlockedPackIds && userProfile.unlockedPackIds.length > 0) {
      return true;
    }
    return hasPaidEntitlement;
  }, [currentUser, hasPaidEntitlement, subscription, userProfile]);

  const deviceLock = useMemo<DeviceLockInfo>(() => {
    const metrics = computeEffectiveSwitchMetrics(userProfile);
    const activeDeviceId = userProfile?.activeDeviceId ?? null;
    const isLockedToOtherDevice = Boolean(
      currentUser &&
        profileLoaded &&
        hasOwnedPass &&
        activeDeviceId &&
        activeDeviceId !== localDeviceId,
    );

    return {
      localDeviceId,
      activeDeviceId,
      isLockedToOtherDevice,
      switchesUsed: metrics.switchesUsed,
      switchesRemaining: metrics.switchesRemaining,
      nextResetAt: metrics.nextResetAt,
    };
  }, [currentUser, hasOwnedPass, localDeviceId, profileLoaded, userProfile]);

  // Enforce 1-Device Lock & Sync local unlocked tests with authorized device state
  useEffect(() => {
    if (!currentUser || !profileLoaded || !subLoaded) return;

    if (deviceLock.isLockedToOtherDevice) {
      setLocalUnlockedIds(setUnlockedTestIds([]));
      const mismatchKey = `${currentUser.uid}:${deviceLock.activeDeviceId}`;
      if (promptedMismatchKeyRef.current !== mismatchKey) {
        promptedMismatchKeyRef.current = mismatchKey;
        setDeviceTransferError(null);
        setDeviceTransferModalOpen(true);
      }
      return;
    }

    promptedMismatchKeyRef.current = null;
    setDeviceTransferModalOpen(false);

    const bindKey = `${currentUser.uid}:${localDeviceId}`;
    if (
      boundDeviceAttemptRef.current !== bindKey &&
      (!userProfile?.activeDeviceId ||
        (userProfile.activeDeviceId !== localDeviceId && !hasOwnedPass))
    ) {
      boundDeviceAttemptRef.current = bindKey;
      void bindInitialOrFreeDevice(currentUser)
        .then(() => syncSubscriptionFromServer(currentUser))
        .catch(() => {});
    }

    const toUnlock = new Set<string>();
    const now = Date.now();

    if (subscription && subscription.status !== 'cancelled') {
      if (subscription.megaPassActive && subscription.megaPassExpiresAt > now) {
        for (const tid of ALL_TEST_IDS) toUnlock.add(tid);
      } else if (subscription.unlockedPackIds.length > 0) {
        for (const tid of expandUnlockedIds(subscription.unlockedPackIds)) {
          toUnlock.add(tid);
        }
      } else if (subscription.trialActive && subscription.trialExpiresAt > now) {
        for (const tid of ALL_TEST_IDS) toUnlock.add(tid);
      }
    }

    if (
      subscription?.status !== 'cancelled' &&
      userProfile?.unlockedPackIds &&
      userProfile.unlockedPackIds.length > 0
    ) {
      for (const tid of expandUnlockedIds(userProfile.unlockedPackIds)) {
        toUnlock.add(tid);
      }
    }

    if (toUnlock.size > 0) {
      setLocalUnlockedIds(unlockTestIds(Array.from(toUnlock)));
    }
  }, [
    currentUser,
    deviceLock.activeDeviceId,
    deviceLock.isLockedToOtherDevice,
    hasOwnedPass,
    localDeviceId,
    profileLoaded,
    subLoaded,
    subscription,
    syncSubscriptionFromServer,
    userProfile,
  ]);

  const requireAuth = useCallback(
    (selection?: TrialCheckoutSelection): Promise<User> => {
      if (auth.currentUser) {
        return Promise.resolve(auth.currentUser);
      }
      return new Promise<User>((resolve, reject) => {
        if (pendingAuthRef.current) {
          pendingAuthRef.current.reject(
            new Error('Replaced by a new sign-in prompt.'),
          );
        }
        pendingAuthRef.current = {selection, resolve, reject};
        setAuthEmailLinkSentTo(null);
        setAuthModalError(null);
        setAuthModalOpen(true);
      });
    },
    [],
  );

  const openAuthModal = useCallback(async (): Promise<User | null> => {
    try {
      return await requireAuth();
    } catch {
      return null;
    }
  }, [requireAuth]);

  const openDeviceTransferModal = useCallback(() => {
    setDeviceTransferError(null);
    setDeviceTransferModalOpen(true);
  }, []);

  const transferPassToCurrentDevice = useCallback(async (): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) return false;
    setDeviceTransferProcessing(true);
    setDeviceTransferError(null);
    try {
      const updated = await transferActiveDeviceInFirestore(user);
      setUserProfile(updated);
      setDeviceTransferModalOpen(false);
      promptedMismatchKeyRef.current = null;
      await syncSubscriptionFromServer(user);
      return true;
    } catch (err) {
      setDeviceTransferError(
        err instanceof Error
          ? err.message
          : 'Unable to transfer pass to this device.',
      );
      return false;
    } finally {
      setDeviceTransferProcessing(false);
    }
  }, [syncSubscriptionFromServer]);

  const openSubscriptionModal = useCallback(
    (options?: SubscriptionModalOptions) => {
      setError(null);
      setSubModalError(null);
      if (deviceLock.isLockedToOtherDevice) {
        setDeviceTransferError(null);
        setDeviceTransferModalOpen(true);
        return;
      }
      setSubModalOpts(options ?? {});
      setSubModalOpen(true);
    },
    [deviceLock.isLockedToOtherDevice],
  );

  const closeSubscriptionModal = useCallback(() => {
    if (processingPlan !== null) return;
    setSubModalOpen(false);
    setSubModalError(null);
  }, [processingPlan]);

  const handleDismissAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthEmailLinkSentTo(null);
    setAuthModalError(null);
    if (pendingAuthRef.current) {
      pendingAuthRef.current.reject(
        new Error(
          uiLang === 'hi'
            ? 'चेकआउट जारी रखने के लिए साइन इन आवश्यक है।'
            : 'Please verify via Google or Email Link before checkout.',
        ),
      );
      pendingAuthRef.current = null;
    }
  }, [uiLang]);

  const handleModalGoogleSignIn = async () => {
    setAuthSubmitting(true);
    setAuthModalError(null);
    if (pendingAuthRef.current?.selection) {
      savePendingTrialSelection(pendingAuthRef.current.selection);
    }
    try {
      const user = await signInWithGoogle();
      if (!user) {
        // Mobile WebView signInWithRedirect triggered; page will reload with user
        return;
      }
      consumePendingTrialSelection();
      setCurrentUser(user);
      if (pendingAuthRef.current) {
        const pending = pendingAuthRef.current;
        pendingAuthRef.current = null;
        setAuthModalOpen(false);
        setAuthEmailLinkSentTo(null);
        pending.resolve(user);
      } else {
        setAuthModalOpen(false);
      }
    } catch (err) {
      setAuthModalError(
        err instanceof Error ? err.message : 'Google sign-in failed.',
      );
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleModalSendEmailLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) return;
    setAuthSubmitting(true);
    setAuthModalError(null);
    if (pendingAuthRef.current?.selection) {
      savePendingTrialSelection(pendingAuthRef.current.selection);
    }
    try {
      const sentEmail = await sendVerificationLinkToEmail(authEmail);
      setAuthEmailLinkSentTo(sentEmail);
    } catch (err) {
      setAuthModalError(
        err instanceof Error
          ? err.message
          : 'Could not send email verification link.',
      );
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleCompleteEmailConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmLinkEmail.trim()) return;
    setConfirmLinkSubmitting(true);
    setConfirmLinkError(null);
    try {
      const user = await completeEmailLinkSignIn(confirmLinkEmail);
      if (user) {
        setCurrentUser(user);
        setNeedsEmailConfirmOpen(false);
        setConfirmLinkEmail('');
      }
    } catch (err) {
      setConfirmLinkError(
        err instanceof Error
          ? err.message
          : 'Could not verify email link. Try requesting a fresh link.',
      );
    } finally {
      setConfirmLinkSubmitting(false);
    }
  };

  const openRazorpayCheckout = useCallback(
    async (params: {
      plan: 'trial' | 'annual' | 'mega';
      amountInr: number;
      title: string;
      description: string;
      packId: string;
      user: User;
    }): Promise<string> => {
      const {plan, amountInr, title, description, packId, user} = params;
      const viteKeyId =
        (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined)?.trim() ||
        '';

      let checkoutKeyId = viteKeyId;
      let serverOrderId: string | undefined;

      if (!checkoutKeyId && (plan === 'annual' || plan === 'mega')) {
        try {
          const res = await fetch('/api/create-order', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              plan: plan === 'mega' ? 'bundle' : 'single',
              testId: plan === 'mega' ? 'ALL_MEGA_BUNDLE' : packId,
              uid: user.uid,
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as {
              mode?: string;
              keyId?: string;
              orderId?: string;
            };
            if (data.mode === 'live' && data.keyId && data.orderId) {
              checkoutKeyId = data.keyId;
              serverOrderId = data.orderId;
            }
          }
        } catch {
          // Fall back cleanly to preview test modal below
        }
      }

      if (checkoutKeyId) {
        if (!window.Razorpay) {
          const loaded = await loadRazorpayScript();
          if (!loaded || !window.Razorpay) {
            throw new Error(
              uiLang === 'hi'
                ? 'Razorpay चेकआउट लोड नहीं हो सका। कृपया इंटरनेट जांचें।'
                : 'Unable to load Razorpay Checkout SDK. Check your connection.',
            );
          }
        }

        return new Promise<string>((resolve, reject) => {
          const rzp = new window.Razorpay!({
            key: checkoutKeyId,
            amount: amountInr * 100,
            currency: 'INR',
            name: 'Exam TestBook',
            description,
            ...(serverOrderId ? {order_id: serverOrderId} : {}),
            prefill: {
              name: user.displayName || undefined,
              email: user.email || undefined,
            },
            notes: {
              uid: user.uid,
              plan,
              packId: sanitizeId(packId),
            },
            theme: {color: '#1E40AF'},
            handler: (resp) => {
              resolve(
                sanitizeId(
                  resp.razorpay_payment_id || `pay_rzp_${Date.now()}`,
                ),
              );
            },
            modal: {
              ondismiss: () =>
                reject(
                  new Error(
                    uiLang === 'hi'
                      ? 'भुगतान रद्द कर दिया गया।'
                      : 'Checkout dismissed by user.',
                  ),
                ),
            },
          });
          rzp.open();
        });
      }

      return new Promise<string>((resolve, reject) => {
        setTestCheckout({
          plan,
          amountInr,
          title,
          description,
          user,
          resolve,
          reject,
        });
      });
    },
    [uiLang],
  );

  const persistSubscriptionWrite = useCallback(
    async (user: User, nextState: UserSubscription) => {
      const subDocPath = `users/${user.uid}/subscription/current`;
      const subRef = doc(db, 'users', user.uid, 'subscription', 'current');
      const cleanPacks = nextState.unlockedPackIds.map(sanitizeId).slice(0, 200);
      const cleanPayload: Record<string, unknown> = {
        uid: user.uid,
        plan: nextState.plan,
        status: nextState.status,
        trialActive: nextState.trialActive,
        trialUsed: nextState.trialUsed,
        trialExpiresAt: nextState.trialExpiresAt,
        megaPassActive: nextState.megaPassActive,
        megaPassExpiresAt: nextState.megaPassExpiresAt,
        annualExpiresAt: nextState.annualExpiresAt,
        unlockedPackIds: cleanPacks,
        lastPaymentId: sanitizeId(nextState.lastPaymentId || 'pay_rzp'),
        lastAmountInr: nextState.lastAmountInr,
        cancelledAt: nextState.cancelledAt,
      };

      if (typeof nextState.autopayAmountInr === 'number') {
        cleanPayload.autopayAmountInr = nextState.autopayAmountInr;
      }
      if (nextState.razorpayPlanId) {
        cleanPayload.razorpayPlanId = nextState.razorpayPlanId.slice(0, 128);
      }
      if (nextState.razorpaySubscriptionId) {
        cleanPayload.razorpaySubscriptionId = sanitizeId(
          nextState.razorpaySubscriptionId,
        );
      }
      if (nextState.targetType) {
        cleanPayload.targetType = nextState.targetType;
      }
      if (nextState.targetId) {
        cleanPayload.targetId = sanitizeId(nextState.targetId);
      }
      if (nextState.targetLabel) {
        cleanPayload.targetLabel = nextState.targetLabel.slice(0, 200);
      }

      try {
        await ensureUserProfile(user);
        const existingSnap = await getDoc(subRef);
        if (!existingSnap.exists()) {
          await setDoc(subRef, {
            ...cleanPayload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          await updateDoc(subRef, {
            ...cleanPayload,
            updatedAt: serverTimestamp(),
          });
        }

        // Also unlock the pack & bind activeDeviceId directly on users/{uid}
        await syncUserUnlockedPacksToProfile(user, {
          unlockedPackIds: cleanPacks,
          activePlan: nextState.status === 'active' ? nextState.plan : 'none',
        });

        await syncSubscriptionFromServer(user);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, subDocPath);
      }
    },
    [syncSubscriptionFromServer],
  );

  const isTrialActive = useCallback((): boolean => {
    if (!subscription) return false;
    if (subscription.status === 'cancelled') return false;
    return subscription.trialActive && subscription.trialExpiresAt > Date.now();
  }, [subscription]);

  const isMegaPassActive = useCallback((): boolean => {
    if (!subscription) return false;
    if (subscription.status === 'cancelled') return false;
    return (
      subscription.megaPassActive && subscription.megaPassExpiresAt > Date.now()
    );
  }, [subscription]);

  const hasPaidSubscription = useCallback((): boolean => {
    if (hasPaidEntitlement) return true;
    if (!subscription || subscription.status !== 'active') return false;
    const now = Date.now();
    if (subscription.megaPassActive && subscription.megaPassExpiresAt > now) {
      return true;
    }
    if (subscription.plan === 'mega' || subscription.plan === 'annual') {
      return true;
    }
    if (subscription.lastAmountInr >= 49) {
      return true;
    }
    if (
      subscription.plan === 'trial' &&
      (subscription.autopayAmountInr === 49 || subscription.autopayAmountInr === 299) &&
      subscription.trialExpiresAt > 0 &&
      subscription.trialExpiresAt <= now
    ) {
      return true;
    }
    return false;
  }, [hasPaidEntitlement, subscription]);

  const isTrialOnlyAccount = useCallback((): boolean => {
    if (hasPaidSubscription()) return false;
    if (!subscription || subscription.status === 'cancelled') return false;
    const now = Date.now();
    return (
      subscription.plan === 'trial' ||
      (subscription.trialActive &&
        subscription.trialExpiresAt > now &&
        subscription.lastAmountInr <= 1)
    );
  }, [hasPaidSubscription, subscription]);

  const isPackUnlocked = useCallback(
    (id: string): boolean => {
      if (!id) return false;
      // Free tests always work without login or device lock
      if (FREE_TEST_IDS.has(id)) return true;

      // 1-Device Lock enforcement: deny paid packs if active on another device
      if (deviceLock.isLockedToOtherDevice) return false;

      if (isMegaPassActive()) return true;

      // Legacy full-platform trial
      if (
        subscription &&
        subscription.status !== 'cancelled' &&
        subscription.trialActive &&
        subscription.trialExpiresAt > Date.now() &&
        subscription.unlockedPackIds.length === 0
      ) {
        return true;
      }

      const combinedUnlocked = Array.from(
        new Set([
          ...(subscription?.status !== 'cancelled'
            ? subscription?.unlockedPackIds ?? []
            : []),
          ...(subscription?.status !== 'cancelled'
            ? userProfile?.unlockedPackIds ?? []
            : []),
        ]),
      );

      if (
        combinedUnlocked.length > 0 &&
        (!subscription ||
          subscription.status !== 'cancelled') &&
        ((subscription?.trialActive && subscription.trialExpiresAt > Date.now()) ||
          !subscription ||
          subscription.annualExpiresAt === 0 ||
          subscription.annualExpiresAt > Date.now())
      ) {
        const subSet = new Set(combinedUnlocked);
        if (subSet.has('ALL_MEGA_BUNDLE') || subSet.has(id)) return true;

        const parentExamId = TEST_TO_EXAM_MAP.get(id);
        if (parentExamId && subSet.has(parentExamId)) return true;

        const catId =
          (CATEGORY_TESTS_MAP.has(id) ? id : undefined) ??
          EXAM_TO_CATEGORY_MAP.get(id) ??
          TEST_TO_CATEGORY_MAP.get(id);
        if (catId && (subSet.has(catId) || subSet.has(`cat_${catId}`))) {
          return true;
        }
      }

      const localSet = new Set(localUnlockedIds);
      if (localSet.has(id)) return true;

      const examTestIds = EXAM_TESTS_MAP.get(id);
      if (examTestIds && examTestIds.length > 0) {
        const paidTests = examTestIds.filter((tid) => !FREE_TEST_IDS.has(tid));
        if (paidTests.length > 0 && paidTests.every((tid) => localSet.has(tid))) {
          return true;
        }
      }

      return false;
    },
    [
      deviceLock.isLockedToOtherDevice,
      isMegaPassActive,
      localUnlockedIds,
      subscription,
      userProfile?.unlockedPackIds,
    ],
  );

  const applyOptimisticUnlock = useCallback(
    (
      user: User,
      nextState: UserSubscription,
      idsToUnlock: string[],
    ): string[] => {
      const mergedLocal = unlockTestIds(idsToUnlock);
      const nextProfile: UserDeviceLockProfile = {
        uid: user.uid,
        activeDeviceId: userProfile?.activeDeviceId ?? localDeviceId,
        deviceSwitchesUsed: userProfile?.deviceSwitchesUsed ?? 0,
        deviceSwitchWindowStart:
          userProfile?.deviceSwitchWindowStart ?? Date.now(),
        unlockedPackIds: nextState.unlockedPackIds,
        activePlan: nextState.status === 'active' ? nextState.plan : 'none',
      };

      setSubscription(nextState);
      setUserProfile(nextProfile);
      setLocalUnlockedIds(mergedLocal);
      setProfileLoaded(true);
      setSubLoaded(true);
      setProcessingPlan(null);

      writeCachedSubscriptionState({
        uid: user.uid,
        subscription: nextState,
        userProfile: nextProfile,
        hasPaidEntitlement:
          hasPaidEntitlement || nextState.lastAmountInr >= 49,
        updatedAt: Date.now(),
      });

      return idsToUnlock;
    },
    [
      hasPaidEntitlement,
      localDeviceId,
      userProfile?.activeDeviceId,
      userProfile?.deviceSwitchWindowStart,
      userProfile?.deviceSwitchesUsed,
    ],
  );

  const purchaseTrialSubscription = useCallback(
    async (selection: TrialCheckoutSelection): Promise<string[] | null> => {
      setError(null);
      setSubModalError(null);
      setProcessingPlan('trial');

      try {
        const user = await requireAuth(selection);

        // Synchronous in-memory / localStorage 1-Device Lock check (zero blocking Firestore getDoc wait)
        const cachedProfile =
          userProfile?.uid === user.uid
            ? userProfile
            : readCachedSubscriptionState(user.uid)?.userProfile ?? null;
        if (cachedProfile) {
          const hasPassOnProfile =
            cachedProfile.activePlan !== 'none' ||
            cachedProfile.unlockedPackIds.length > 0;
          if (
            hasPassOnProfile &&
            cachedProfile.activeDeviceId &&
            cachedProfile.activeDeviceId !== localDeviceId
          ) {
            setProcessingPlan(null);
            setDeviceTransferError(null);
            setDeviceTransferModalOpen(true);
            return null;
          }
        }

        const viteKeyId =
          (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined)?.trim() ||
          '';

        const packToken =
          selection.targetType === 'category'
            ? `cat_${sanitizeId(selection.targetId)}`
            : sanitizeId(selection.targetId);
        const idsForSelection = expandUnlockedIds([packToken]);
        const description = `${selection.targetLabel} — ₹1 today (24h trial) → ₹${selection.autopayAmountInr}/yr Autopay`;

        const completeOptimisticPayment = (
          rawPaymentId: string,
          resolvedPlanId: string,
          resolvedSubscriptionId: string,
        ): string[] => {
          const now = Date.now();
          const base = subscription ?? createEmptySubscription(user.uid);
          const mergedPacks = Array.from(
            new Set([...base.unlockedPackIds, packToken]),
          ).slice(0, 200);

          const nextState: UserSubscription = {
            ...base,
            uid: user.uid,
            plan:
              base.megaPassActive && base.megaPassExpiresAt > now
                ? 'mega'
                : 'trial',
            status: 'active',
            trialActive: true,
            trialUsed: true,
            trialExpiresAt: now + ONE_DAY_MS,
            annualExpiresAt: now + ONE_YEAR_MS,
            unlockedPackIds: mergedPacks,
            lastPaymentId: sanitizeId(
              rawPaymentId || `pay_rzp_${now.toString(36)}`,
            ),
            lastAmountInr: 1,
            cancelledAt: 0,
            autopayAmountInr: selection.autopayAmountInr,
            razorpayPlanId: resolvedPlanId,
            razorpaySubscriptionId: resolvedSubscriptionId,
            targetType: selection.targetType,
            targetId: sanitizeId(selection.targetId),
            targetLabel: selection.targetLabel,
          };

          // Optimistic 0ms unlock: save to localStorage, update React state, close modal, unlock tests immediately
          applyOptimisticUnlock(user, nextState, idsForSelection);
          const callback = subModalOptsRef.current.onUnlocked;
          setSubModalOpen(false);
          setSubModalError(null);
          callback?.(idsForSelection);

          // Sync to Firestore users/{uid} asynchronously in the background
          void persistSubscriptionWrite(user, nextState).catch(() => {});

          return idsForSelection;
        };

        // Fast-path: VITE_RAZORPAY_KEY_ID present -> open Razorpay Checkout immediately with zero pre-payment API/DB wait
        if (viteKeyId) {
          if (!window.Razorpay) {
            const loaded = await loadRazorpayScript();
            if (!loaded || !window.Razorpay) {
              throw new Error(
                uiLang === 'hi'
                  ? 'Razorpay चेकआउट लोड नहीं हो सका। कृपया इंटरनेट जांचें।'
                  : 'Unable to load Razorpay Checkout SDK. Check your connection.',
              );
            }
          }

          const clientPlanId = selection.planId;
          const clientSubRef = `sub_cli_${Date.now().toString(36)}`;

          return await new Promise<string[]>((resolve, reject) => {
            const rzp = new window.Razorpay!({
              key: viteKeyId,
              amount: 100,
              currency: 'INR',
              name: 'Exam TestBook',
              description,
              prefill: {
                name: user.displayName || undefined,
                email: user.email || undefined,
              },
              notes: {
                uid: user.uid,
                plan_id: clientPlanId,
                tier: selection.tier,
                targetType: selection.targetType,
                targetId: sanitizeId(selection.targetId),
              },
              theme: {color: '#1E40AF'},
              handler: (resp) => {
                const unlocked = completeOptimisticPayment(
                  resp.razorpay_payment_id || `pay_rzp_${Date.now()}`,
                  clientPlanId,
                  resp.razorpay_subscription_id || clientSubRef,
                );
                resolve(unlocked);
              },
              modal: {
                ondismiss: () =>
                  reject(
                    new Error(
                      uiLang === 'hi'
                        ? 'भुगतान रद्द कर दिया गया।'
                        : 'Checkout dismissed by user.',
                    ),
                  ),
              },
            });
            rzp.open();
          });
        }

        // Backend-managed subscription or sandbox mode (only when VITE_RAZORPAY_KEY_ID is omitted)
        const createRes = await fetch('/api/create-subscription', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            tier: selection.tier,
            targetType: selection.targetType,
            targetId: selection.targetId,
            targetLabel: selection.targetLabel,
            uid: user.uid,
          }),
        });

        const subData = (await createRes.json().catch(() => ({}))) as {
          mode?: 'live' | 'sandbox';
          subscriptionId?: string;
          planId?: string;
          keyId?: string;
          autopayAmountInr?: number;
          error?: string;
        };

        if (!createRes.ok || !subData.subscriptionId) {
          throw new Error(
            subData.error || 'Unable to initiate Razorpay Subscription.',
          );
        }

        const resolvedPlanId = subData.planId || selection.planId;
        const resolvedSubscriptionId = subData.subscriptionId;

        if (subData.mode === 'live' && subData.keyId) {
          if (!window.Razorpay) {
            const loaded = await loadRazorpayScript();
            if (!loaded || !window.Razorpay) {
              throw new Error(
                uiLang === 'hi'
                  ? 'Razorpay चेकआउट लोड नहीं हो सका। कृपया इंटरनेट जांचें।'
                  : 'Unable to load Razorpay Checkout SDK. Check your connection.',
              );
            }
          }

          return await new Promise<string[]>((resolve, reject) => {
            const rzp = new window.Razorpay!({
              key: subData.keyId!,
              subscription_id: resolvedSubscriptionId,
              name: 'Exam TestBook',
              description,
              prefill: {
                name: user.displayName || undefined,
                email: user.email || undefined,
              },
              notes: {
                uid: user.uid,
                plan_id: resolvedPlanId,
                tier: selection.tier,
                targetType: selection.targetType,
                targetId: sanitizeId(selection.targetId),
              },
              theme: {color: '#1E40AF'},
              handler: (resp) => {
                const subIdUsed =
                  resp.razorpay_subscription_id || resolvedSubscriptionId;
                const unlocked = completeOptimisticPayment(
                  resp.razorpay_payment_id || `pay_rzp_${Date.now()}`,
                  resolvedPlanId,
                  subIdUsed,
                );

                // Background signature verification after 0ms optimistic unlock
                void fetch('/api/verify-subscription', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify({
                    razorpay_subscription_id: subIdUsed,
                    razorpay_payment_id: resp.razorpay_payment_id || '',
                    razorpay_signature: resp.razorpay_signature || '',
                    tier: selection.tier,
                  }),
                }).catch(() => {});

                resolve(unlocked);
              },
              modal: {
                ondismiss: () =>
                  reject(
                    new Error(
                      uiLang === 'hi'
                        ? 'भुगतान रद्द कर दिया गया।'
                        : 'Checkout dismissed by user.',
                    ),
                  ),
              },
            });
            rzp.open();
          });
        }

        const sandboxPaymentId = await new Promise<string>((resolve, reject) => {
          setTestCheckout({
            plan: 'trial',
            amountInr: 1,
            title:
              uiLang === 'hi'
                ? '1 दिन के लिए ₹1 ट्रायल (24 घंटे)'
                : '₹1 Trial for 1 Day (24h Access)',
            description,
            summaryLine:
              uiLang === 'hi'
                ? '₹1 आज, फिर 24 घंटे बाद ₹49/yr या ₹299/yr Autopay • डैशबोर्ड से कभी भी रद्द करें'
                : '₹1 today, then ₹49/yr or ₹299/yr Autopay after 24 hours • Cancel anytime in Dashboard',
            planIdLabel: resolvedPlanId,
            user,
            resolve,
            reject,
          });
        });

        return completeOptimisticPayment(
          sandboxPaymentId,
          resolvedPlanId,
          resolvedSubscriptionId,
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Trial checkout failed.';
        setError(msg);
        setSubModalError(msg);
        return null;
      } finally {
        setProcessingPlan(null);
      }
    },
    [
      applyOptimisticUnlock,
      localDeviceId,
      persistSubscriptionWrite,
      requireAuth,
      subscription,
      uiLang,
      userProfile,
    ],
  );

  // Resume pending checkout seamlessly after Email Link Sign-In or Google WebView Redirect
  useEffect(() => {
    if (!currentUser || !authReady || !profileLoaded || !subLoaded || loading) {
      return;
    }
    if (deviceLock.isLockedToOtherDevice) return;

    const pendingSelection = consumePendingTrialSelection();
    if (!pendingSelection) return;

    const packToken =
      pendingSelection.targetType === 'category'
        ? `cat_${sanitizeId(pendingSelection.targetId)}`
        : sanitizeId(pendingSelection.targetId);
    const alreadyUnlocked =
      subscription?.status === 'active' &&
      subscription.unlockedPackIds.includes(packToken);
    if (alreadyUnlocked) return;

    void purchaseTrialSubscription(pendingSelection);
  }, [
    authReady,
    currentUser,
    deviceLock.isLockedToOtherDevice,
    loading,
    profileLoaded,
    purchaseTrialSubscription,
    subLoaded,
    subscription,
  ]);

  const purchaseTrial = useCallback(async (): Promise<boolean> => {
    setError(null);
    setProcessingPlan('trial');
    try {
      const user = await requireAuth();
      const paymentId = await openRazorpayCheckout({
        plan: 'trial',
        amountInr: 1,
        title:
          uiLang === 'hi'
            ? '₹1 ट्रायल (24 घंटे फुल एक्सेस)'
            : '₹1 Trial Authentication (24h Full Access)',
        description: 'Exam TestBook ₹1 Trial Pass — 24h Access',
        packId: 'trial_pass',
        user,
      });

      const base = subscription ?? createEmptySubscription(user.uid);
      const nextState: UserSubscription = {
        ...base,
        uid: user.uid,
        plan:
          base.megaPassActive && base.megaPassExpiresAt > Date.now()
            ? 'mega'
            : 'trial',
        status: 'active',
        trialActive: true,
        trialUsed: true,
        trialExpiresAt: Date.now() + ONE_DAY_MS,
        unlockedPackIds:
          base.unlockedPackIds.length > 0
            ? base.unlockedPackIds
            : ['ALL_MEGA_BUNDLE'],
        lastPaymentId: paymentId,
        lastAmountInr: 1,
        cancelledAt: 0,
      };

      applyOptimisticUnlock(user, nextState, ALL_TEST_IDS);
      void persistSubscriptionWrite(user, nextState).catch(() => {});
      return true;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Trial checkout failed.';
      setError(msg);
      return false;
    } finally {
      setProcessingPlan(null);
    }
  }, [
    applyOptimisticUnlock,
    openRazorpayCheckout,
    persistSubscriptionWrite,
    requireAuth,
    subscription,
    uiLang,
  ]);

  const purchaseAnnualPlan = useCallback(
    async (
      packId = 'annual_pack',
      packTitle = 'Exam TestBook Annual Pack',
    ): Promise<boolean> => {
      setError(null);
      setProcessingPlan('annual');
      try {
        const user = await requireAuth();
        const cleanPackId = sanitizeId(packId);
        const paymentId = await openRazorpayCheckout({
          plan: 'annual',
          amountInr: 49,
          title:
            uiLang === 'hi'
              ? `${packTitle} — वार्षिक पैक (₹49/वर्ष)`
              : `${packTitle} — Annual Pack (₹49/yr)`,
          description: `${packTitle} — 1 Year Unlimited Mock Tests (₹49/yr)`,
          packId: cleanPackId,
          user,
        });

        const base = subscription ?? createEmptySubscription(user.uid);
        const mergedPacks = Array.from(
          new Set([...base.unlockedPackIds, cleanPackId]),
        ).slice(0, 200);
        const now = Date.now();
        const nextPlan: SubscriptionPlanType =
          base.megaPassActive && base.megaPassExpiresAt > now ? 'mega' : 'annual';

        const nextState: UserSubscription = {
          ...base,
          uid: user.uid,
          plan: nextPlan,
          status: 'active',
          annualExpiresAt: now + ONE_YEAR_MS,
          unlockedPackIds: mergedPacks,
          lastPaymentId: paymentId,
          lastAmountInr: 49,
          cancelledAt: 0,
          autopayAmountInr: 49,
          targetType: 'exam',
          targetId: cleanPackId,
          targetLabel: packTitle,
        };

        const examTests =
          EXAM_TESTS_MAP.get(packId) ?? EXAM_TESTS_MAP.get(cleanPackId);
        const parentExamId = TEST_TO_EXAM_MAP.get(packId);
        const idsToUnlock = examTests
          ? examTests
          : parentExamId
            ? EXAM_TESTS_MAP.get(parentExamId) ?? [packId]
            : [packId];

        applyOptimisticUnlock(user, nextState, idsToUnlock);
        void persistSubscriptionWrite(user, nextState).catch(() => {});
        return true;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Annual plan checkout failed.';
        setError(msg);
        return false;
      } finally {
        setProcessingPlan(null);
      }
    },
    [
      applyOptimisticUnlock,
      openRazorpayCheckout,
      persistSubscriptionWrite,
      requireAuth,
      subscription,
      uiLang,
    ],
  );

  const purchaseMegaPass = useCallback(async (): Promise<boolean> => {
    setError(null);
    setProcessingPlan('mega');
    try {
      const user = await requireAuth();
      const paymentId = await openRazorpayCheckout({
        plan: 'mega',
        amountInr: 299,
        title:
          uiLang === 'hi'
            ? 'मेगा ऑल-एग्जाम पास (₹299/वर्ष)'
            : 'Mega All-Exam Pass (₹299/yr)',
        description:
          'Exam TestBook Mega Pass — All 9 Categories & Exams for 1 Year (₹299/yr)',
        packId: 'ALL_MEGA_BUNDLE',
        user,
      });

      const base = subscription ?? createEmptySubscription(user.uid);
      const mergedPacks = Array.from(
        new Set([...base.unlockedPackIds, 'ALL_MEGA_BUNDLE']),
      ).slice(0, 200);
      const nextState: UserSubscription = {
        ...base,
        uid: user.uid,
        plan: 'mega',
        status: 'active',
        megaPassActive: true,
        megaPassExpiresAt: Date.now() + ONE_YEAR_MS,
        unlockedPackIds: mergedPacks,
        lastPaymentId: paymentId,
        lastAmountInr: 299,
        cancelledAt: 0,
        autopayAmountInr: 299,
        targetType: 'all',
        targetId: 'ALL_MEGA_BUNDLE',
        targetLabel: 'Mega All-Exam Pass',
      };

      applyOptimisticUnlock(user, nextState, ALL_TEST_IDS);
      void persistSubscriptionWrite(user, nextState).catch(() => {});
      return true;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Mega Pass checkout failed.';
      setError(msg);
      return false;
    } finally {
      setProcessingPlan(null);
    }
  }, [
    applyOptimisticUnlock,
    openRazorpayCheckout,
    persistSubscriptionWrite,
    requireAuth,
    subscription,
    uiLang,
  ]);

  const cancelSubscription = useCallback(async (): Promise<void> => {
    setError(null);
    const user = auth.currentUser;
    if (!user) {
      setError(
        uiLang === 'hi'
          ? 'सदस्यता रद्द करने के लिए साइन इन आवश्यक है।'
          : 'Please sign in to manage your subscription.',
      );
      return;
    }

    const cancelledAt = Date.now();
    const base = subscription ?? createEmptySubscription(user.uid);
    const toRevoke = new Set(
      base.unlockedPackIds.length > 0
        ? expandUnlockedIds(base.unlockedPackIds)
        : ALL_TEST_IDS,
    );
    const remainingLocal = getUnlockedTestIds().filter((id) => !toRevoke.has(id));
    setLocalUnlockedIds(setUnlockedTestIds(remainingLocal));

    const nextState: UserSubscription = {
      ...base,
      uid: user.uid,
      plan: 'none',
      status: 'cancelled',
      trialActive: false,
      megaPassActive: false,
      cancelledAt,
    };

    setSubscription(nextState);

    const subDocPath = `users/${user.uid}/subscription/current`;
    const subRef = doc(db, 'users', user.uid, 'subscription', 'current');
    try {
      await ensureUserProfile(user);
      const snap = await getDoc(subRef);
      if (snap.exists()) {
        await updateDoc(subRef, {
          plan: 'none',
          status: 'cancelled',
          trialActive: false,
          megaPassActive: false,
          cancelledAt,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(subRef, {
          uid: user.uid,
          plan: 'none',
          status: 'cancelled',
          trialActive: false,
          trialUsed: base.trialUsed,
          trialExpiresAt: base.trialExpiresAt,
          megaPassActive: false,
          megaPassExpiresAt: base.megaPassExpiresAt,
          annualExpiresAt: base.annualExpiresAt,
          unlockedPackIds: base.unlockedPackIds,
          lastPaymentId: base.lastPaymentId || 'none',
          lastAmountInr: 0,
          cancelledAt,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await syncUserUnlockedPacksToProfile(user, {
        unlockedPackIds: [],
        activePlan: 'none',
      });
      await syncSubscriptionFromServer(user);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, subDocPath);
    }
  }, [subscription, syncSubscriptionFromServer, uiLang]);

  const handleModalConfirmCheckout = useCallback(
    async (selection: TrialCheckoutSelection) => {
      await purchaseTrialSubscription(selection);
    },
    [purchaseTrialSubscription],
  );

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      subscription,
      userProfile,
      deviceLock,
      currentUser,
      authReady,
      loading,
      processingPlan,
      error,
      clearError,
      uiLang,
      setUiLang,
      openAuthModal,
      openDeviceTransferModal,
      transferPassToCurrentDevice,
      openSubscriptionModal,
      closeSubscriptionModal,
      isTrialActive,
      isTrialOnlyAccount,
      hasPaidSubscription,
      isPackUnlocked,
      isMegaPassActive,
      purchaseTrial,
      purchaseTrialSubscription,
      purchaseAnnualPlan,
      purchaseMegaPass,
      cancelSubscription,
    }),
    [
      subscription,
      userProfile,
      deviceLock,
      currentUser,
      authReady,
      loading,
      processingPlan,
      error,
      clearError,
      uiLang,
      openAuthModal,
      openDeviceTransferModal,
      transferPassToCurrentDevice,
      openSubscriptionModal,
      closeSubscriptionModal,
      isTrialActive,
      isTrialOnlyAccount,
      hasPaidSubscription,
      isPackUnlocked,
      isMegaPassActive,
      purchaseTrial,
      purchaseTrialSubscription,
      purchaseAnnualPlan,
      purchaseMegaPass,
      cancelSubscription,
    ],
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}

      {/* Unified 2-Step Plan & Target Selector Modal (Lazy Loaded) */}
      {subModalOpen && (
        <Suspense fallback={null}>
          <SubscriptionModal
            open={subModalOpen}
            lang={uiLang}
            initialTier={subModalOpts.initialTier}
            initialExamId={subModalOpts.initialExamId}
            initialCategoryId={subModalOpts.initialCategoryId}
            processing={processingPlan !== null}
            error={subModalError}
            isPackUnlocked={isPackUnlocked}
            onClose={closeSubscriptionModal}
            onConfirmCheckout={handleModalConfirmCheckout}
          />
        </Suspense>
      )}

      {/* Dual Sign-In Modal: 1-Tap Google + Passwordless Email Verification Link */}
      {authModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            uiLang === 'hi'
              ? 'भुगतान से पहले साइन इन करें'
              : 'Sign in to continue'
          }
          className="fixed inset-0 z-[70] bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-amber-300/60 shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-5 py-4 bg-gradient-to-r from-[#09142C] via-[#172554] to-[#1E40AF] text-white flex items-center justify-between gap-3 border-b border-amber-300/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/50 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold truncate">
                    {uiLang === 'hi'
                      ? 'त्वरित साइन इन करें'
                      : 'Sign In to Continue'}
                  </h3>
                  <p className="text-[11px] text-blue-100/90 truncate">
                    {uiLang === 'hi'
                      ? 'बिना पासवर्ड, बिना SMS शुल्क — 1-डिवाइस पास सुरक्षा'
                      : 'Zero passwords, zero SMS fees · Instant 1-Device Lock sync'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissAuthModal}
                aria-label={uiLang === 'hi' ? 'बंद करें' : 'Close'}
                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Primary Option: Glossy 1-Tap Google Sign-In */}
              <button
                type="button"
                disabled={authSubmitting}
                onClick={() => void handleModalGoogleSignIn()}
                className="relative overflow-hidden w-full inline-flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-gradient-to-r from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] hover:from-[#1D4ED8] hover:to-[#172554] disabled:opacity-60 text-white text-sm font-extrabold min-h-[46px] shadow-[0_6px_18px_rgba(37,99,235,0.35)] transition"
              >
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-2xs shrink-0">
                  {authSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1E40AF]" />
                  ) : (
                    <GoogleMark />
                  )}
                </span>
                <span>
                  {uiLang === 'hi'
                    ? 'Google से जारी रखें (1-टैप)'
                    : 'Continue with Google (1-Tap)'}
                </span>
              </button>

              <div className="relative flex items-center py-0.5">
                <div className="flex-1 border-t border-slate-200" />
                <span className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {uiLang === 'hi'
                    ? 'या ईमेल वेरिफिकेशन लिंक'
                    : 'OR CONTINUE WITH EMAIL (VERIFICATION LINK)'}
                </span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              {/* Secondary Option: Passwordless Email Verification Link */}
              {authEmailLinkSentTo ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 min-w-0">
                      <div className="text-sm font-extrabold text-emerald-950">
                        {uiLang === 'hi'
                          ? 'वेरिफिकेशन लिंक भेजा गया!'
                          : 'Verification Link Sent!'}
                      </div>
                      <p className="text-xs text-emerald-900 leading-relaxed break-words">
                        {uiLang === 'hi' ? (
                          <>
                            हमने <strong>{authEmailLinkSentTo}</strong> पर एक साइन-इन लिंक भेजा है। साइन इन और चेकआउट अपने आप पूरा करने के लिए ईमेल में लिंक पर क्लिक करें।
                          </>
                        ) : (
                          <>
                            We sent a passwordless sign-in link to{' '}
                            <strong>{authEmailLinkSentTo}</strong>. Open the link on this device to verify and continue automatically.
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={authSubmitting}
                      onClick={(e) => void handleModalSendEmailLink(e)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold min-h-[38px] transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>
                        {uiLang === 'hi' ? 'लिंक फिर भेजें' : 'Resend Link'}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={authSubmitting}
                      onClick={() => {
                        setAuthEmailLinkSentTo(null);
                        setAuthModalError(null);
                      }}
                      className="py-2 px-3 rounded-lg border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-xs font-bold min-h-[38px] transition"
                    >
                      {uiLang === 'hi' ? 'ईमेल बदलें' : 'Change Email'}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleModalSendEmailLink} className="space-y-3">
                  <div>
                    <label
                      htmlFor="auth-email-link-input"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      {uiLang === 'hi'
                        ? 'ईमेल पता (पासवर्ड की जरूरत नहीं)'
                        : 'Email Address (No password required)'}
                    </label>
                    <input
                      id="auth-email-link-input"
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder={
                        uiLang === 'hi'
                          ? 'example@gmail.com दर्ज करें'
                          : 'Enter your email address'
                      }
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-[#2563EB]"
                    />
                  </div>

                  {authModalError && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-700">
                      {authModalError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-extrabold min-h-[44px] transition"
                  >
                    {authSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4 text-amber-300" />
                    )}
                    <span>
                      {uiLang === 'hi'
                        ? 'वेरिफिकेशन लिंक भेजें'
                        : 'Send Verification Link'}
                    </span>
                  </button>
                </form>
              )}

              <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    {uiLang === 'hi'
                      ? 'फ्री मॉक टेस्ट बिना लॉगिन उपलब्ध हैं'
                      : 'Free mock tests work without login'}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Confirmation Modal (when email verification link is opened in a different browser) */}
      {needsEmailConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm Email Address"
          className="fixed inset-0 z-[72] bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-5 py-4 bg-[#1E40AF] text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Mail className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-extrabold">
                  {uiLang === 'hi'
                    ? 'ईमेल पुष्टि करें'
                    : 'Confirm Your Email'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNeedsEmailConfirmOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={handleCompleteEmailConfirmation}
              className="p-5 space-y-4"
            >
              <p className="text-xs sm:text-sm text-slate-600">
                {uiLang === 'hi'
                  ? 'वेरिफिकेशन पूरा करने के लिए कृपया वही ईमेल पता दर्ज करें जिस पर लिंक भेजा गया था।'
                  : 'To finish verifying your link on this browser, confirm the email address where you received the verification link.'}
              </p>
              <input
                type="email"
                required
                value={confirmLinkEmail}
                onChange={(e) => setConfirmLinkEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-[#2563EB]"
              />
              {confirmLinkError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-700">
                  {confirmLinkError}
                </div>
              )}
              <button
                type="submit"
                disabled={confirmLinkSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-extrabold min-h-[44px]"
              >
                {confirmLinkSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>
                  {uiLang === 'hi'
                    ? 'सत्यापित करें और आगे बढ़ें'
                    : 'Verify & Sign In'}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 1-Device Lock Pass Transfer Prompt Modal */}
      {deviceTransferModalOpen && currentUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="1-Device Lock Pass Transfer"
          className="fixed inset-0 z-[73] bg-slate-950/80 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-amber-400 shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-5 py-4 bg-gradient-to-r from-[#09142C] via-[#172554] to-[#1E40AF] text-white flex items-center justify-between gap-3 border-b border-amber-300/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/50 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                    {uiLang === 'hi' ? '1-डिवाइस पास सुरक्षा' : '1-DEVICE PASS LOCK'}
                  </div>
                  <h3 className="text-base font-extrabold truncate">
                    {uiLang === 'hi'
                      ? 'दूसरे डिवाइस पर पास सक्रिय है'
                      : 'Pass Active on Another Device'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                disabled={deviceTransferProcessing}
                onClick={() => setDeviceTransferModalOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-1.5">
                <p className="text-sm font-extrabold text-slate-900">
                  {uiLang === 'hi'
                    ? `पास दूसरे डिवाइस पर सक्रिय है। क्या इस डिवाइस पर पास ट्रांसफर करें? (${deviceLock.switchesRemaining}/2 स्विच शेष)`
                    : `Pass is active on another device. Transfer pass to this device? (${deviceLock.switchesRemaining}/2 switches left)`}
                </p>
                <p className="text-xs text-slate-600">
                  {uiLang === 'hi'
                    ? 'एक समय में केवल 1 डिवाइस पर पेड पास चलता है (प्रति 30 दिन अधिकतम 2 डिवाइस स्विच अनुमत हैं)।'
                    : 'Your paid/trial pass works on 1 active device at a time (up to 2 device transfers allowed per 30 days).'}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs px-1 text-slate-600 font-mono-num">
                <span>{uiLang === 'hi' ? 'खाता' : 'Verified Account'}:</span>
                <span className="font-bold text-slate-900 truncate max-w-[220px]">
                  {currentUser.email || currentUser.uid}
                </span>
              </div>

              {deviceLock.switchesRemaining <= 0 && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs font-semibold text-rose-800">
                  {uiLang === 'hi'
                    ? `पिछले 30 दिनों के सभी 2/2 स्विच उपयोग हो चुके हैं। रीसेट तिथि: ${new Date(deviceLock.nextResetAt).toLocaleDateString()}`
                    : `All 2/2 device switches used for this 30-day cycle. Resets on ${new Date(deviceLock.nextResetAt).toLocaleDateString()}.`}
                </div>
              )}

              {deviceTransferError && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-medium text-red-700">
                  {deviceTransferError}
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={deviceTransferProcessing}
                  onClick={() => setDeviceTransferModalOpen(false)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold min-h-[44px] transition"
                >
                  {uiLang === 'hi' ? 'केवल फ्री टेस्ट' : 'Keep Free Only'}
                </button>
                <button
                  type="button"
                  disabled={
                    deviceTransferProcessing || deviceLock.switchesRemaining <= 0
                  }
                  onClick={() => void transferPassToCurrentDevice()}
                  className="flex-[1.5] inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#16A34A] to-[#15803D] hover:from-[#15803D] hover:to-[#166534] disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold min-h-[44px] shadow-xs transition"
                >
                  {deviceTransferProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>
                    {uiLang === 'hi'
                      ? `इस डिवाइस पर ट्रांसफर करें (${deviceLock.switchesRemaining}/2)`
                      : `Transfer Pass Here (${deviceLock.switchesRemaining}/2 left)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Razorpay Sandbox Checkout Modal (fallback when live keys/VITE_RAZORPAY_KEY_ID are not set) */}
      {testCheckout && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Razorpay Checkout"
          className="fixed inset-0 z-[75] bg-slate-950/75 flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-fade-in">
            <div className="px-5 py-4 bg-[#1E40AF] text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                    Exam TestBook · Razorpay Subscription
                  </div>
                  <h3 className="text-base font-extrabold truncate">
                    {testCheckout.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const active = testCheckout;
                  setTestCheckout(null);
                  active.reject(
                    new Error(
                      uiLang === 'hi'
                        ? 'भुगतान रद्द कर दिया गया।'
                        : 'Checkout cancelled by user.',
                    ),
                  );
                }}
                aria-label="Close Checkout"
                className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                <div className="flex items-start justify-between gap-2 text-xs text-slate-600">
                  <span>{uiLang === 'hi' ? 'प्लान' : 'Selected Plan'}</span>
                  <span className="font-bold text-slate-900 text-right">
                    {testCheckout.description}
                  </span>
                </div>
                {testCheckout.planIdLabel && (
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{uiLang === 'hi' ? 'प्लान आईडी' : 'Plan ID'}</span>
                    <span className="font-mono-num font-bold text-slate-800">
                      {testCheckout.planIdLabel}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>{uiLang === 'hi' ? 'खाता' : 'Student Account'}</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[210px]">
                    {testCheckout.user.email || testCheckout.user.uid}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">
                    {uiLang === 'hi' ? 'आज देय राशि' : 'Payable Today'}
                  </span>
                  <span className="text-xl font-extrabold font-mono-num text-[#1E40AF]">
                    ₹{testCheckout.amountInr}
                  </span>
                </div>
              </div>

              {testCheckout.summaryLine && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 px-3.5 py-2.5 text-xs font-medium text-blue-950">
                  {testCheckout.summaryLine}
                </div>
              )}

              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2.5 text-xs text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  {uiLang === 'hi'
                    ? 'टेस्ट मोड चेकआउट सक्रिय है (RAZORPAY_KEY_ID / VITE_RAZORPAY_KEY_ID कॉन्फ़िगर होने पर लाइव Razorpay खुलेगा)।'
                    : 'Razorpay Test Checkout mode (live Razorpay Subscription checkout opens automatically when Razorpay merchant keys & plan IDs are configured).'}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const active = testCheckout;
                    setTestCheckout(null);
                    active.reject(
                      new Error(
                        uiLang === 'hi'
                          ? 'भुगतान रद्द कर दिया गया।'
                          : 'Checkout cancelled by user.',
                      ),
                    );
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold min-h-[44px] transition"
                >
                  {uiLang === 'hi' ? 'रद्द करें' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const active = testCheckout;
                    setTestCheckout(null);
                    active.resolve(
                      `pay_test_${active.plan}_${Date.now().toString(36)}`,
                    );
                  }}
                  className="flex-[1.5] inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold min-h-[44px] shadow-xs transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {uiLang === 'hi'
                      ? `₹${testCheckout.amountInr} भुगतान सफल करें`
                      : `Complete ₹${testCheckout.amountInr} Payment`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SubscriptionContext.Provider>
  );
};

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error(
      'useSubscription must be used within a SubscriptionProvider.',
    );
  }
  return ctx;
}
