import {initializeApp} from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  type Firestore,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  initializeFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type {AttemptResult} from '../types/exam';

const app = initializeApp(firebaseConfig);

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId,
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createFirestoreInstance();
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({prompt: 'select_account'});

export const EMAIL_FOR_SIGN_IN_KEY = 'emailForSignIn';
export const DEVICE_ID_STORAGE_KEY = 'etb_device_id_v1';
export const MAX_DEVICE_SWITCHES = 2;
export const DEVICE_SWITCH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (retryError) {
        if (
          retryError instanceof Error &&
          retryError.message.includes('the client is offline')
        ) {
          console.error('Please check your Firebase configuration.');
        }
      }
    }
  }
}
if (typeof window !== 'undefined') {
  window.setTimeout(() => {
    void testConnection();
  }, 1500);
}

export interface UserEntitlement {
  id: string;
  uid: string;
  plan: 'single' | 'bundle';
  testId: string;
  amountInr: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  verificationToken: string;
  status: 'verified';
}

export interface VerifiedPaymentPayload {
  plan: 'single' | 'bundle';
  testId: string;
  amountInr: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  verificationToken: string;
  status: 'verified';
}

export interface UserDeviceLockProfile {
  uid: string;
  activeDeviceId: string | null;
  deviceSwitchesUsed: number;
  deviceSwitchWindowStart: number;
  unlockedPackIds: string[];
  activePlan: 'none' | 'trial' | 'annual' | 'mega';
}

export function getOrCreateLocalDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'dev_ssr_default';
  }
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing && /^[a-zA-Z0-9_\-]{6,128}$/.test(existing)) {
      return existing;
    }
  } catch {
    // Ignore storage errors
  }

  let fresh = '';
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      fresh = `dev_${crypto.randomUUID().replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
    }
  } catch {
    // Fallback below
  }
  if (!fresh) {
    fresh = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  }

  try {
    window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, fresh);
  } catch {
    // Ignore storage errors
  }
  return fresh;
}

export function computeEffectiveSwitchMetrics(
  profile: Partial<UserDeviceLockProfile> | null | undefined,
  now = Date.now(),
): {
  switchesUsed: number;
  switchesRemaining: number;
  windowStart: number;
  nextResetAt: number;
  windowExpired: boolean;
} {
  const storedStart =
    typeof profile?.deviceSwitchWindowStart === 'number' &&
    profile.deviceSwitchWindowStart > 0
      ? profile.deviceSwitchWindowStart
      : now;
  const rawUsed =
    typeof profile?.deviceSwitchesUsed === 'number'
      ? Math.max(0, Math.min(MAX_DEVICE_SWITCHES, profile.deviceSwitchesUsed))
      : 0;
  const windowExpired =
    typeof profile?.deviceSwitchWindowStart === 'number' &&
    profile.deviceSwitchWindowStart > 0 &&
    now - profile.deviceSwitchWindowStart >= DEVICE_SWITCH_WINDOW_MS;

  const switchesUsed = windowExpired ? 0 : rawUsed;
  const switchesRemaining = Math.max(0, MAX_DEVICE_SWITCHES - switchesUsed);
  const windowStart = windowExpired ? now : storedStart;
  return {
    switchesUsed,
    switchesRemaining,
    windowStart,
    nextResetAt: windowStart + DEVICE_SWITCH_WINDOW_MS,
    windowExpired,
  };
}

export function isMobileWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /\bwv\b/i.test(ua) ||
    /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Twitter|Snapchat/i.test(ua) ||
    (/Android/i.test(ua) &&
      /Version\/[\d.]+/i.test(ua) &&
      !/Chrome\/[\d.]+ Mobile/i.test(ua)) ||
    (/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua))
  );
}

export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function fetchUserProfileDoc(
  uid: string,
): Promise<Record<string, unknown> | null> {
  const userPath = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }
}

export async function fetchUserSubscriptionDoc(
  uid: string,
): Promise<Record<string, unknown> | null> {
  const subPath = `users/${uid}/subscription/current`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'subscription', 'current'));
    return snap.exists() ? (snap.data() as Record<string, unknown>) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, subPath);
  }
}

export async function ensureUserProfile(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const safeEmail = (user.email || `${user.uid}@student.local`).slice(0, 254);
  const safeName = (
    user.displayName ||
    safeEmail.split('@')[0] ||
    'Student'
  ).slice(0, 120);
  const localDeviceId = getOrCreateLocalDeviceId();

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: safeEmail,
        displayName: safeName,
        role: 'student',
        activeDeviceId: localDeviceId,
        deviceSwitchesUsed: 0,
        deviceSwitchWindowStart: Date.now(),
        unlockedPackIds: [],
        activePlan: 'none',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = snap.data() as Record<string, unknown>;
      if (
        existingData.email !== safeEmail ||
        existingData.displayName !== safeName
      ) {
        await updateDoc(userRef, {
          email: safeEmail,
          displayName: safeName,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function bindInitialOrFreeDevice(user: User): Promise<void> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const localDeviceId = getOrCreateLocalDeviceId();
  try {
    await ensureUserProfile(user);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const data = snap.data() as Record<string, unknown>;
    const existingDeviceId =
      typeof data.activeDeviceId === 'string' ? data.activeDeviceId : null;
    const activePlan =
      typeof data.activePlan === 'string' ? data.activePlan : 'none';
    const unlockedPackIds = Array.isArray(data.unlockedPackIds)
      ? data.unlockedPackIds
      : [];

    if (!existingDeviceId) {
      await updateDoc(userRef, {
        activeDeviceId: localDeviceId,
        deviceSwitchesUsed: 0,
        deviceSwitchWindowStart: Date.now(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    if (
      existingDeviceId !== localDeviceId &&
      activePlan === 'none' &&
      unlockedPackIds.length === 0
    ) {
      await updateDoc(userRef, {
        activeDeviceId: localDeviceId,
        deviceSwitchesUsed: 0,
        deviceSwitchWindowStart: Date.now(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function transferActiveDeviceInFirestore(
  user: User,
): Promise<UserDeviceLockProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const localDeviceId = getOrCreateLocalDeviceId();

  try {
    await ensureUserProfile(user);
    const snap = await getDoc(userRef);
    const data = (snap.exists() ? snap.data() : {}) as Record<string, unknown>;
    const currentDeviceId =
      typeof data.activeDeviceId === 'string' ? data.activeDeviceId : null;

    const currentProfile: UserDeviceLockProfile = {
      uid: user.uid,
      activeDeviceId: currentDeviceId,
      deviceSwitchesUsed: Number(data.deviceSwitchesUsed || 0),
      deviceSwitchWindowStart: Number(data.deviceSwitchWindowStart || 0),
      unlockedPackIds: Array.isArray(data.unlockedPackIds)
        ? data.unlockedPackIds.filter((x): x is string => typeof x === 'string')
        : [],
      activePlan:
        data.activePlan === 'trial' ||
        data.activePlan === 'annual' ||
        data.activePlan === 'mega'
          ? data.activePlan
          : 'none',
    };

    if (currentDeviceId === localDeviceId) {
      return currentProfile;
    }

    if (!currentDeviceId) {
      const now = Date.now();
      await updateDoc(userRef, {
        activeDeviceId: localDeviceId,
        deviceSwitchesUsed: 0,
        deviceSwitchWindowStart: now,
        updatedAt: serverTimestamp(),
      });
      return {
        ...currentProfile,
        activeDeviceId: localDeviceId,
        deviceSwitchesUsed: 0,
        deviceSwitchWindowStart: now,
      };
    }

    const now = Date.now();
    const metrics = computeEffectiveSwitchMetrics(currentProfile, now);
    if (metrics.switchesRemaining <= 0) {
      throw new Error(
        'Device transfer limit reached (2/2 switches used in 30 days).',
      );
    }

    const nextSwitchesUsed = metrics.switchesUsed + 1;
    const nextWindowStart = metrics.windowStart;

    await updateDoc(userRef, {
      activeDeviceId: localDeviceId,
      deviceSwitchesUsed: nextSwitchesUsed,
      deviceSwitchWindowStart: nextWindowStart,
      updatedAt: serverTimestamp(),
    });

    return {
      ...currentProfile,
      activeDeviceId: localDeviceId,
      deviceSwitchesUsed: nextSwitchesUsed,
      deviceSwitchWindowStart: nextWindowStart,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('Device transfer limit reached')
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function syncUserUnlockedPacksToProfile(
  user: User,
  params: {
    unlockedPackIds: string[];
    activePlan: 'none' | 'trial' | 'annual' | 'mega';
  },
): Promise<void> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const localDeviceId = getOrCreateLocalDeviceId();
  const cleanPacks = Array.from(
    new Set(
      params.unlockedPackIds
        .map((id) => id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128))
        .filter(Boolean),
    ),
  ).slice(0, 200);

  try {
    await ensureUserProfile(user);
    const snap = await getDoc(userRef);
    const data = (snap.exists() ? snap.data() : {}) as Record<string, unknown>;
    const existingDeviceId =
      typeof data.activeDeviceId === 'string' && data.activeDeviceId
        ? data.activeDeviceId
        : localDeviceId;
    const existingSwitchesUsed =
      typeof data.deviceSwitchesUsed === 'number' ? data.deviceSwitchesUsed : 0;
    const existingWindowStart =
      typeof data.deviceSwitchWindowStart === 'number' &&
      data.deviceSwitchWindowStart > 0
        ? data.deviceSwitchWindowStart
        : Date.now();

    await updateDoc(userRef, {
      unlockedPackIds: cleanPacks,
      activePlan: params.activePlan,
      activeDeviceId: existingDeviceId,
      deviceSwitchesUsed: existingSwitchesUsed,
      deviceSwitchWindowStart: existingWindowStart,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  if (isMobileWebView()) {
    await signInWithRedirect(auth, googleProvider);
    return null;
  }

  try {
    const cred = await signInWithPopup(auth, googleProvider);
    await ensureUserProfile(cred.user);
    return cred.user;
  } catch (err) {
    const code = (err as {code?: string} | null)?.code ?? '';
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment' ||
      (code === 'auth/cancelled-popup-request' && isMobileWebView())
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
}

export async function completeGoogleRedirectSignIn(): Promise<User | null> {
  const result = await getRedirectResult(auth);
  if (result?.user) {
    await ensureUserProfile(result.user);
    return result.user;
  }
  return null;
}

export async function sendVerificationLinkToEmail(
  email: string,
): Promise<string> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }

  const continueUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://examtestbook.app/';

  await sendSignInLinkToEmail(auth, cleanEmail, {
    url: continueUrl,
    handleCodeInApp: true,
  });

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, cleanEmail);
    } catch {
      // Ignore storage quota errors
    }
  }
  return cleanEmail;
}

export function isCurrentUrlEmailSignInLink(): boolean {
  if (typeof window === 'undefined') return false;
  return isSignInWithEmailLink(auth, window.location.href);
}

export async function completeEmailLinkSignIn(
  explicitEmail?: string,
): Promise<User | null> {
  if (typeof window === 'undefined') return null;
  const href = window.location.href;
  if (!isSignInWithEmailLink(auth, href)) {
    return null;
  }

  let savedEmail = '';
  try {
    savedEmail = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY) || '';
  } catch {
    savedEmail = '';
  }

  const targetEmail = (savedEmail || explicitEmail || '').trim();
  if (!targetEmail) {
    const err = new Error('EMAIL_CONFIRMATION_REQUIRED');
    (err as Error & {code?: string}).code = 'etb/needs-email-confirmation';
    throw err;
  }

  const cred = await signInWithEmailLink(auth, targetEmail, href);
  try {
    window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
  } catch {
    // Ignore storage errors
  }

  try {
    const url = new URL(window.location.href);
    for (const key of ['apiKey', 'mode', 'oobCode', 'continueUrl', 'lang']) {
      url.searchParams.delete(key);
    }
    const cleaned = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, '', cleaned || '/');
  } catch {
    // Ignore history error
  }

  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function saveUserAttempt(
  uid: string,
  attempt: AttemptResult,
): Promise<void> {
  const cleanId = attempt.id.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128);
  const docPath = `users/${uid}/attempts/${cleanId}`;
  try {
    if (auth.currentUser) {
      await ensureUserProfile(auth.currentUser);
    }
    await setDoc(doc(db, 'users', uid, 'attempts', cleanId), {
      uid,
      attemptId: cleanId,
      testId: attempt.testId.slice(0, 128),
      examId: attempt.examId.slice(0, 128),
      testTitleEn: attempt.testTitle.en.slice(0, 200),
      testTitleHi: attempt.testTitle.hi.slice(0, 200),
      examNameEn: attempt.examName.en.slice(0, 200),
      examNameHi: attempt.examName.hi.slice(0, 200),
      score: attempt.score,
      maxScore: attempt.maxScore,
      accuracy: attempt.accuracy,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      skippedCount: attempt.skippedCount,
      timeTakenSeconds: attempt.timeTakenSeconds,
      submittedAt: attempt.submittedAt,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function fetchUserAttempts(uid: string): Promise<AttemptResult[]> {
  const colPath = `users/${uid}/attempts`;
  try {
    const q = query(
      collection(db, 'users', uid, 'attempts'),
      orderBy('submittedAt', 'desc'),
      limit(50),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: String(data.attemptId || d.id),
        testId: String(data.testId || ''),
        examId: String(data.examId || ''),
        testTitle: {
          en: String(data.testTitleEn || 'Mock Test'),
          hi: String(data.testTitleHi || 'मॉक टेस्ट'),
        },
        examName: {
          en: String(data.examNameEn || 'Exam'),
          hi: String(data.examNameHi || 'परीक्षा'),
        },
        submittedAt: Number(data.submittedAt || Date.now()),
        timeTakenSeconds: Number(data.timeTakenSeconds || 0),
        totalDurationSeconds: Number(data.timeTakenSeconds || 0),
        score: Number(data.score || 0),
        maxScore: Number(data.maxScore || 100),
        positiveMarks: Number(data.score || 0),
        negativeMarksDeducted: 0,
        accuracy: Number(data.accuracy || 0),
        correctCount: Number(data.correctCount || 0),
        wrongCount: Number(data.wrongCount || 0),
        skippedCount: Number(data.skippedCount || 0),
        totalQuestions:
          Number(data.correctCount || 0) +
          Number(data.wrongCount || 0) +
          Number(data.skippedCount || 0),
        sectionBreakdown: [],
        details: [],
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}

export async function unlockEntitlementInFirestore(
  uid: string,
  entitlement: VerifiedPaymentPayload,
): Promise<UserEntitlement> {
  const entitlementId = entitlement.razorpayPaymentId
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 128);
  const docPath = `users/${uid}/entitlements/${entitlementId}`;

  try {
    if (auth.currentUser) {
      await ensureUserProfile(auth.currentUser);
    }
    const payload = {
      uid,
      plan: entitlement.plan,
      testId: entitlement.testId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128),
      amountInr: entitlement.amountInr,
      razorpayOrderId: entitlement.razorpayOrderId.slice(0, 128),
      razorpayPaymentId: entitlement.razorpayPaymentId.slice(0, 128),
      verificationToken: entitlement.verificationToken.slice(0, 256),
      status: 'verified' as const,
      createdAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid, 'entitlements', entitlementId), payload);
    return {
      id: entitlementId,
      uid: payload.uid,
      plan: payload.plan,
      testId: payload.testId,
      amountInr: payload.amountInr,
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId,
      verificationToken: payload.verificationToken,
      status: 'verified',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function fetchUserEntitlements(
  uid: string,
): Promise<UserEntitlement[]> {
  const colPath = `users/${uid}/entitlements`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'entitlements'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        uid: String(data.uid || uid),
        plan: data.plan === 'bundle' ? 'bundle' : 'single',
        testId: String(data.testId || ''),
        amountInr: Number(data.amountInr || 0),
        razorpayOrderId: String(data.razorpayOrderId || ''),
        razorpayPaymentId: String(data.razorpayPaymentId || ''),
        verificationToken: String(data.verificationToken || ''),
        status: 'verified',
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, colPath);
  }
}
