import React, {Suspense, useEffect, useMemo, useState} from 'react';
import type {User} from 'firebase/auth';
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Crown,
  Eye,
  FileText,
  History,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import {AttemptResult, BookmarkItem, Language, Question} from '../types/exam';
import {t, UI_COPY} from '../data/i18n';
import {formatSecondsMMSS} from '../utils/scoring';
import {getBookmarks, toggleBookmarkStorage} from '../utils/storage';
import {
  readCustomBanners,
  type CustomBannersState,
} from '../utils/banners';
import {
  sendVerificationLinkToEmail,
  signInWithGoogle,
  signOutUser,
} from '../lib/firebase';
import {useSubscription} from '../context/SubscriptionContext';

const DashboardAdminPanels = React.lazy(() =>
  import('./DashboardAdminPanels').then((m) => ({
    default: m.DashboardAdminPanels,
  })),
);

interface DashboardViewProps {
  lang: Language;
  history: AttemptResult[];
  onViewAttempt: (attempt: AttemptResult) => void;
  onClearHistory: () => void;
  customQuestions: Question[];
  onSaveCustomQuestions: (questions: Question[]) => void;
  onLaunchCustomTest: (questions: Question[]) => void;
  currentUser: User | null;
  onOpenPrivacyPolicy?: () => void;
}

const ADMIN_PIN = '2026';
const ADMIN_EMAIL = 'amritsharma6206@gmail.com';

export const DashboardView: React.FC<DashboardViewProps> = ({
  lang,
  history,
  onViewAttempt,
  onClearHistory,
  customQuestions,
  onSaveCustomQuestions,
  onLaunchCustomTest,
  currentUser,
  onOpenPrivacyPolicy,
}) => {
  const {
    subscription,
    deviceLock,
    isTrialActive,
    isMegaPassActive,
    openDeviceTransferModal,
    openSubscriptionModal,
    cancelSubscription,
    processingPlan,
    error: subError,
  } = useSubscription();

  const [subNotice, setSubNotice] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'overview' | 'saved' | 'admin'>('overview');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinUnlocked, setPinUnlocked] = useState(false);

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => getBookmarks());
  const [expandedSavedIds, setExpandedSavedIds] = useState<Set<string>>(new Set());

  const [banners, setBanners] = useState<CustomBannersState>(() => readCustomBanners());

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailLinkSentTo, setEmailLinkSentTo] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthorizedAdminEmail =
    currentUser?.email?.trim().toLowerCase() === ADMIN_EMAIL;
  const isAdminUnlocked = isAuthorizedAdminEmail || pinUnlocked;

  useEffect(() => {
    if (subTab === 'saved') {
      setBookmarks(getBookmarks());
    }
  }, [subTab]);

  const handleToggleSavedBookmark = (q: Question) => {
    const next = toggleBookmarkStorage(q);
    setBookmarks(next);
  };

  const toggleSavedExpand = (id: string) => {
    setExpandedSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePinUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === ADMIN_PIN) {
      setPinUnlocked(true);
      setPinInput('');
      setPinError(null);
      return;
    }
    setPinError(
      lang === 'hi'
        ? 'गलत 4-अंकीय एडमिन पिन। कृपया पुनः प्रयास करें।'
        : 'Incorrect 4-digit Admin PIN. Please try again.',
    );
  };

  const handleLockAdmin = () => {
    setPinUnlocked(false);
    setPinInput('');
    setPinError(null);
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendEmailVerificationLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const sentTo = await sendVerificationLinkToEmail(emailInput);
      setEmailLinkSentTo(sentTo);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Failed to send verification link.',
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (history.length === 0) {
      return {avgAccuracy: 0, bestPercent: 0};
    }
    const avgAcc =
      history.reduce((acc, h) => acc + h.accuracy, 0) / history.length;
    const bestPct = Math.max(
      ...history.map((h) => (h.maxScore > 0 ? (h.score / h.maxScore) * 100 : 0)),
    );
    return {
      avgAccuracy: Number(avgAcc.toFixed(1)),
      bestPercent: Number(Math.max(0, bestPct).toFixed(1)),
    };
  }, [history]);

  const dashboardHeaderSrc =
    banners.dashboard.imageDataUrl || '/images/dashboard-bg.png';
  const isDashboardLightText = banners.dashboard.textTheme === 'light';

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 border border-white/15 shadow-md">
        <img
          src={dashboardHeaderSrc}
          alt=""
          aria-hidden="true"
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute inset-0 w-full h-full object-cover"
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${
            isDashboardLightText
              ? 'bg-gradient-to-b from-black/25 to-black/45'
              : 'bg-white/80'
          }`}
        />

        <div className="relative z-10 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1
              className={`text-xl sm:text-2xl font-extrabold tracking-tight ${
                isDashboardLightText ? 'text-white' : 'text-slate-900'
              }`}
            >
              {t(UI_COPY.dashboard.heading, lang)}
            </h1>
            <p
              className={`text-xs sm:text-sm mt-0.5 ${
                isDashboardLightText ? 'text-blue-100/90' : 'text-slate-700'
              }`}
            >
              {lang === 'hi'
                ? 'टेस्ट सटीकता, सहेजे गए प्रश्न और एडमिन उपकरण'
                : 'Track test accuracy, saved questions & protected admin tools'}
            </p>
          </div>

          {/* Sub-navigation Bar: Overview | Saved | Admin Panel 🔒 */}
          <div
            className={`inline-flex flex-wrap items-center gap-1 p-1 rounded-xl self-start border ${
              isDashboardLightText
                ? 'bg-slate-950/60 border-white/25'
                : 'bg-white/85 border-slate-900/15'
            }`}
          >
            <button
              type="button"
              onClick={() => setSubTab('overview')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap min-h-[38px] transition ${
                subTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : isDashboardLightText
                    ? 'text-white/95 hover:text-white hover:bg-white/15'
                    : 'text-slate-800 hover:bg-white/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span>{lang === 'hi' ? 'अवलोकन' : 'Overview'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('saved')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap min-h-[38px] transition ${
                subTab === 'saved'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : isDashboardLightText
                    ? 'text-white/95 hover:text-white hover:bg-white/15'
                    : 'text-slate-800 hover:bg-white/60'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>{lang === 'hi' ? 'सहेजे गए' : 'Saved'}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold tabular-nums ${
                  subTab === 'saved'
                    ? 'bg-blue-100 text-[#1E40AF]'
                    : isDashboardLightText
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-900/10 text-slate-800'
                }`}
              >
                {bookmarks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('admin')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap min-h-[38px] transition ${
                subTab === 'admin'
                  ? 'bg-amber-400 text-slate-950 shadow-xs font-extrabold'
                  : isDashboardLightText
                    ? 'text-amber-200 hover:text-white hover:bg-white/15'
                    : 'text-indigo-900 hover:bg-white/60'
              }`}
            >
              {isAdminUnlocked ? (
                <Unlock className="w-4 h-4" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>
                {lang === 'hi'
                  ? isAdminUnlocked
                    ? 'एडमिन पैनल'
                    : 'एडमिन पैनल 🔒'
                  : isAdminUnlocked
                    ? 'Admin Panel'
                    : 'Admin Panel 🔒'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tab 1: Overview */}
      {subTab === 'overview' && (
        <div className="space-y-5 sm:space-y-6">
          {/* Compact Student Account & Cloud Sync Strip */}
          <div className="bg-white border border-slate-200/90 rounded-2xl px-4 sm:px-5 py-3.5 flex flex-col gap-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {currentUser ? (
                <>
                  <div className="text-xs sm:text-sm text-slate-700">
                    <strong className="text-slate-900">
                      {currentUser.displayName || currentUser.email}
                    </strong>{' '}
                    <span className="text-slate-500">
                      · {lang === 'hi' ? 'Firestore क्लाउड सिंक सक्रिय' : 'Firestore Sync Active'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void signOutUser()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{lang === 'hi' ? 'साइन आउट' : 'Sign Out'}</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="text-xs sm:text-sm text-slate-600">
                    {lang === 'hi'
                      ? 'प्रयास इतिहास और अनलॉक किए गए टेस्ट सिंक करने के लिए साइन इन करें।'
                      : 'Sign in to sync attempts and unlocked paid tests with Firestore.'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={handleGoogleLogin}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#1E40AF] hover:from-blue-700 hover:to-blue-900 disabled:opacity-50 text-white text-xs font-extrabold shadow-xs transition"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'hi'
                          ? 'Google से जारी रखें (1-टैप)'
                          : 'Continue with Google (1-Tap)'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailForm((s) => !s);
                        setEmailLinkSentTo(null);
                        setAuthError(null);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#1E40AF]" />
                      <span>
                        {lang === 'hi'
                          ? 'ईमेल वेरिफिकेशन लिंक'
                          : 'Email Verification Link'}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {showEmailForm && !currentUser && (
              emailLinkSentTo ? (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-800 bg-emerald-50/70 rounded-xl p-3 border border-emerald-200">
                  <span>
                    {lang === 'hi'
                      ? `${emailLinkSentTo} पर वेरिफिकेशन लिंक भेजा गया है — साइन इन करने के लिए ईमेल में लिंक खोलें।`
                      : `Verification link sent to ${emailLinkSentTo} — open the link in your inbox to sign in automatically.`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEmailLinkSentTo(null)}
                    className="font-bold text-[#1E40AF] hover:underline shrink-0"
                  >
                    {lang === 'hi' ? 'ईमेल बदलें' : 'Change Email'}
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleSendEmailVerificationLink}
                  className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2"
                >
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder={
                      lang === 'hi'
                        ? 'ईमेल पता दर्ज करें (पासवर्ड की जरूरत नहीं)'
                        : 'Enter email address (no password needed)'
                    }
                    className="h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-900 flex-1 min-w-[210px]"
                  />
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="h-9 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    {authLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>
                      {lang === 'hi'
                        ? 'वेरिफिकेशन लिंक भेजें'
                        : 'Send Verification Link'}
                    </span>
                  </button>
                </form>
              )
            )}

            {authError && <p className="text-xs text-red-600">{authError}</p>}
          </div>

          {/* Subscription & Pass Management + Privacy Policy Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-[#1E40AF] text-xs font-extrabold">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {isMegaPassActive()
                      ? lang === 'hi'
                        ? 'मेगा ऑल-एग्जाम पास सक्रिय (₹299/yr)'
                        : 'Mega All-Exam Pass Active (₹299/yr)'
                      : isTrialActive()
                        ? lang === 'hi'
                          ? `₹1 ट्रायल सक्रिय (24h)${subscription?.targetLabel ? ` · ${subscription.targetLabel}` : ''}`
                          : `₹1 Trial Active (24h)${subscription?.targetLabel ? ` · ${subscription.targetLabel}` : ''}`
                        : subscription &&
                            subscription.status === 'active' &&
                            subscription.unlockedPackIds.length > 0
                          ? lang === 'hi'
                            ? `वार्षिक पैक सक्रिय (${subscription.unlockedPackIds.length})`
                            : `Annual Pack Active (${subscription.unlockedPackIds.length})`
                          : subscription?.status === 'cancelled'
                            ? lang === 'hi'
                              ? 'सदस्यता रद्द (Cancelled)'
                              : 'Subscription Cancelled'
                            : lang === 'hi'
                              ? 'फ्री प्लान (कोई पेड पास नहीं)'
                              : 'Free Tier (No Active Paid Pass)'}
                  </span>
                </span>

                {isMegaPassActive() && subscription?.megaPassExpiresAt ? (
                  <span className="text-xs text-slate-500 font-mono-num">
                    {lang === 'hi' ? 'वैधता:' : 'Valid till'}{' '}
                    {new Date(subscription.megaPassExpiresAt).toLocaleDateString()}
                  </span>
                ) : isTrialActive() && subscription?.trialExpiresAt ? (
                  <span className="text-xs text-slate-500 font-mono-num">
                    {lang === 'hi' ? '24h ट्रायल समाप्त:' : '24h trial ends'}{' '}
                    {new Date(subscription.trialExpiresAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {subscription.autopayAmountInr
                      ? ` · ₹${subscription.autopayAmountInr}/yr Autopay`
                      : ''}
                  </span>
                ) : null}
              </div>

              <p className="text-xs text-slate-600">
                {lang === 'hi'
                  ? '₹1 आज (24 घंटे ट्रायल), फिर 24 घंटे बाद ₹49/yr या ₹299/yr Autopay • डैशबोर्ड से कभी भी रद्द करें।'
                  : '₹1 today, then ₹49/yr or ₹299/yr Autopay after 24 hours • Cancel anytime in Dashboard.'}
              </p>

              {currentUser && deviceLock.isLockedToOtherDevice ? (
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  <span>
                    {lang === 'hi'
                      ? `पास दूसरे डिवाइस पर सक्रिय है (${deviceLock.switchesRemaining}/2 स्विच शेष)`
                      : `Pass is active on another device (${deviceLock.switchesRemaining}/2 switches left)`}
                  </span>
                  <button
                    type="button"
                    onClick={openDeviceTransferModal}
                    className="text-[#1E40AF] underline font-extrabold"
                  >
                    {lang === 'hi' ? 'यहाँ ट्रांसफर करें' : 'Transfer to this device'}
                  </button>
                </div>
              ) : (
                currentUser && (isTrialActive() || isMegaPassActive() || subscription?.status === 'active') && (
                  <p className="text-[11px] text-emerald-700 font-semibold font-mono-num">
                    {lang === 'hi'
                      ? `1-डिवाइस पास लॉक सक्रिय · ${deviceLock.switchesRemaining}/2 डिवाइस स्विच शेष`
                      : `1-Device Lock active · ${deviceLock.switchesRemaining}/2 device switches left (30 days)`}
                  </p>
                )
              )}

              {(subNotice || subError) && (
                <p className="text-xs font-semibold text-blue-700">
                  {subNotice || subError}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!isMegaPassActive() && (
                <button
                  type="button"
                  disabled={processingPlan !== null}
                  onClick={() => {
                    setSubNotice(null);
                    openSubscriptionModal({
                      onUnlocked: () => {
                        setSubNotice(
                          lang === 'hi'
                            ? '₹1 ट्रायल (24 घंटे) सक्रिय हो गया!'
                            : '₹1 Trial (24h) activated!',
                        );
                      },
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 text-xs font-extrabold min-h-[38px] transition"
                >
                  {processingPlan === 'trial' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {lang === 'hi'
                      ? '1 दिन के लिए ₹1 ट्रायल शुरू करें'
                      : 'Start ₹1 Trial for 1 Day'}
                  </span>
                </button>
              )}

              {(isTrialActive() ||
                isMegaPassActive() ||
                subscription?.status === 'active') && (
                <button
                  type="button"
                  onClick={() => {
                    void cancelSubscription().then(() => {
                      setSubNotice(
                        lang === 'hi'
                          ? 'सदस्यता सफलतापूर्वक रद्द कर दी गई।'
                          : 'Subscription cancelled.',
                      );
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold min-h-[38px] transition"
                >
                  <span>
                    {lang === 'hi' ? 'सदस्यता रद्द करें' : 'Cancel Subscription'}
                  </span>
                </button>
              )}

              {onOpenPrivacyPolicy && (
                <button
                  type="button"
                  onClick={onOpenPrivacyPolicy}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold min-h-[38px] transition"
                >
                  <FileText className="w-3.5 h-3.5 text-[#1E40AF]" />
                  <span>{lang === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Top Student Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-semibold text-slate-500">
                {t(UI_COPY.dashboard.testsAttempted, lang)}
              </div>
              <div className="mt-1.5 text-2xl font-extrabold text-slate-900 font-mono-num">
                {history.length}
              </div>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-semibold text-slate-500">
                {t(UI_COPY.dashboard.avgAccuracy, lang)}
              </div>
              <div className="mt-1.5 text-2xl font-extrabold text-emerald-700 font-mono-num">
                {summary.avgAccuracy}%
              </div>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-semibold text-slate-500">
                {t(UI_COPY.dashboard.bestScore, lang)}
              </div>
              <div className="mt-1.5 text-2xl font-extrabold text-[#1E40AF] font-mono-num">
                {summary.bestPercent}%
              </div>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-semibold text-slate-500">
                {t(UI_COPY.dashboard.customQuestionsCount, lang)}
              </div>
              <div className="mt-1.5 text-2xl font-extrabold text-slate-900 font-mono-num">
                {customQuestions.length}
              </div>
            </div>
          </div>

          {/* Attempt History */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {t(UI_COPY.dashboard.historyTab, lang)}
              </h2>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t(UI_COPY.dashboard.clearHistory, lang)}</span>
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-600">
                {t(UI_COPY.dashboard.noHistory, lang)}
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {t(item.examName, lang)} · {t(item.testTitle, lang)}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono-num">
                        <span>{new Date(item.submittedAt).toLocaleString()}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {t(UI_COPY.result.score, lang)}:{' '}
                          <strong className="text-slate-900">
                            {item.score} / {item.maxScore}
                          </strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {t(UI_COPY.result.accuracy, lang)}: <strong>{item.accuracy}%</strong>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatSecondsMMSS(item.timeTakenSeconds)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onViewAttempt(item)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold transition shrink-0 min-h-[38px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t(UI_COPY.dashboard.viewSolutions, lang)}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Saved Questions */}
      {subTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {t(UI_COPY.saved.heading, lang)}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {lang === 'hi'
                  ? 'रिवीजन के लिए बुकमार्क किए गए प्रश्न'
                  : 'Bookmarked questions saved for quick revision'}
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-[#EFF6FF] text-sm font-mono-num font-bold text-[#1E40AF]">
              {bookmarks.length}
            </span>
          </div>

          {bookmarks.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center mx-auto">
                <Bookmark className="w-6 h-6" />
              </div>
              <p className="mt-4 text-sm text-slate-600 max-w-md mx-auto">
                {t(UI_COPY.saved.empty, lang)}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {bookmarks.map((item) => {
                const q = item.question;
                const isOpen = expandedSavedIds.has(q.id);
                const correctDisplay = Array.isArray(q.correctAnswer)
                  ? q.correctAnswer.map((id) => id.toUpperCase()).join(', ')
                  : q.type === 'NAT'
                    ? q.correctAnswer
                    : q.correctAnswer.toUpperCase();

                return (
                  <div
                    key={q.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 pb-3 border-b border-slate-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-[#1E40AF]">
                          {t(q.section, lang)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{q.type}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleSavedBookmark(q)}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t(UI_COPY.saved.remove, lang)}</span>
                      </button>
                    </div>

                    <p className="mt-3 text-sm sm:text-base font-medium text-slate-900 leading-relaxed">
                      {t(q.question, lang)}
                    </p>

                    {q.options && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, idx) => (
                          <div
                            key={opt.id}
                            className="text-xs sm:text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                          >
                            <strong className="font-mono-num">
                              {String.fromCharCode(65 + idx)}.
                            </strong>{' '}
                            {t(opt.text, lang)}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => toggleSavedExpand(q.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
                      >
                        {isOpen ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            <span>{t(UI_COPY.saved.hideAnswer, lang)}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            <span>{t(UI_COPY.saved.showAnswer, lang)}</span>
                          </>
                        )}
                      </button>

                      {isOpen && (
                        <div className="mt-3 bg-blue-50/70 border border-blue-100 rounded-lg p-3.5 text-xs sm:text-sm text-slate-700 space-y-1.5">
                          <div>
                            <strong className="text-emerald-700">
                              {t(UI_COPY.result.correctAnswer, lang)}:{' '}
                            </strong>
                            <span className="font-mono-num font-bold text-slate-900">
                              {correctDisplay}
                            </span>
                          </div>
                          <div>
                            <strong className="text-[#1E40AF]">
                              {t(UI_COPY.result.explanation, lang)}:{' '}
                            </strong>
                            {t(q.explanation, lang)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 3: Protected Admin Panel */}
      {subTab === 'admin' && (
        <div className="space-y-5">
          {!isAdminUnlocked ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs max-w-lg mx-auto text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center mx-auto">
                <Lock className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-extrabold text-slate-900">
                  {lang === 'hi'
                    ? 'एडमिन पैनल लॉक है'
                    : 'Admin Panel Protected'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  {lang === 'hi'
                    ? 'केवल एडमिन के लिए। अनलॉक करने हेतु 4-अंकीय एडमिन पिन दर्ज करें या एडमिन ईमेल से साइन इन करें।'
                    : `Restricted to admins. Enter the 4-digit Admin PIN or sign in with ${ADMIN_EMAIL}.`}
                </p>
              </div>

              <form onSubmit={handlePinUnlock} className="space-y-3">
                <div className="relative max-w-xs mx-auto">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                      setPinError(null);
                    }}
                    placeholder={lang === 'hi' ? '4-अंकीय पिन दर्ज करें' : 'Enter 4-digit PIN'}
                    aria-label="4-digit Admin PIN"
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-300 text-center font-mono-num text-base font-bold tracking-[0.35em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-600"
                  />
                </div>

                {pinError && (
                  <p className="text-xs font-semibold text-red-600">{pinError}</p>
                )}

                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E40AF] hover:bg-blue-800 text-white text-sm font-bold min-h-[44px] transition"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'एडमिन पैनल अनलॉक करें' : 'Unlock Admin Panel'}</span>
                </button>
              </form>
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-xs font-semibold text-slate-500">
                  {lang === 'hi' ? 'एडमिन पैनल लोड हो रहा है...' : 'Loading Admin Panel...'}
                </div>
              }
            >
              <DashboardAdminPanels
                lang={lang}
                adminEmail={ADMIN_EMAIL}
                isAuthorizedAdminEmail={isAuthorizedAdminEmail}
                customQuestions={customQuestions}
                onSaveCustomQuestions={onSaveCustomQuestions}
                onLaunchCustomTest={onLaunchCustomTest}
                banners={banners}
                onBannersChange={setBanners}
                onLockAdmin={handleLockAdmin}
              />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
};
