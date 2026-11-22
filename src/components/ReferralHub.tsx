import React, {useMemo, useState} from 'react';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Gift,
  Link2,
  MessageCircle,
  Search,
  Send,
  Shield,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type {ExamCategoryId, ExamItem, Language} from '../types/exam';
import {EXAMS_CATALOG} from '../data/exams';
import {t} from '../data/i18n';
import {
  buildReferralShareUrl,
  buildTelegramShareUrl,
  buildWhatsAppShareUrl,
  type ReferralUserState,
} from '../utils/referral';

interface ReferralTrackerCardProps {
  lang: Language;
  referralState: ReferralUserState;
  onSimulateJoin: () => void;
  onOpenClaimModal: () => void;
  onNavigateToCategory?: (catId: ExamCategoryId) => void;
}

export const ReferralTrackerCard: React.FC<ReferralTrackerCardProps> = ({
  lang,
  referralState,
  onSimulateJoin,
  onOpenClaimModal,
  onNavigateToCategory,
}) => {
  const [copied, setCopied] = useState(false);
  const [slotNotice, setSlotNotice] = useState<string | null>(null);

  const shareUrl = useMemo(
    () => buildReferralShareUrl(referralState.code),
    [referralState.code],
  );
  const whatsappUrl = useMemo(
    () => buildWhatsAppShareUrl(referralState.code, shareUrl),
    [referralState.code, shareUrl],
  );
  const telegramUrl = useMemo(
    () => buildTelegramShareUrl(referralState.code, shareUrl),
    [referralState.code, shareUrl],
  );

  const availableFreePacks = referralState.eligibleForRewards
    ? Math.max(
        0,
        Math.floor(referralState.friendsJoined / 2) - referralState.claimedExamIds.length,
      )
    : 0;
  const milestoneCount = Math.min(2, referralState.friendsJoined);
  const progressPercent = (milestoneCount / 2) * 100;
  const isCycleUnlocked = referralState.eligibleForRewards && referralState.friendsJoined >= 2;

  const claimedExams = useMemo(
    () =>
      referralState.claimedExamIds
        .map((id) => EXAMS_CATALOG.find((ex) => ex.id === id))
        .filter((ex): ex is ExamItem => Boolean(ex)),
    [referralState.claimedExamIds],
  );

  const handleCopy = async (customNotice?: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (customNotice) {
        setSlotNotice(customNotice);
      }
      window.setTimeout(() => {
        setCopied(false);
        setSlotNotice(null);
      }, 2200);
    } catch {
      setCopied(false);
    }
  };

  const friendLogEntries = useMemo(() => {
    const verifiedCount = Math.max(
      0,
      referralState.friendsJoined - referralState.simulatedJoins,
    );
    const totalRows = Math.max(2, referralState.friendsJoined);
    return Array.from({length: totalRows}, (_, index) => {
      const slotNumber = index + 1;
      const joined = slotNumber <= referralState.friendsJoined;
      const isSimulated = joined && slotNumber > verifiedCount;
      return {
        slotNumber,
        joined,
        isSimulated,
      };
    });
  }, [referralState.friendsJoined, referralState.simulatedJoins]);

  const howItWorksSteps = [
    {
      step: '1',
      title: lang === 'hi' ? 'लिंक शेयर करें' : 'Share Link',
      detail:
        lang === 'hi'
          ? 'WhatsApp या Telegram पर भेजें'
          : 'Send via WhatsApp or Telegram',
    },
    {
      step: '2',
      title: lang === 'hi' ? '2 दोस्त ₹49/₹299 लें' : '2 Friends Activate ₹49/₹299',
      detail:
        lang === 'hi'
          ? 'दोनों ₹49/₹299 प्लान सक्रिय करें'
          : 'Both activate ₹49/₹299 plan (no ₹1 trial)',
    },
    {
      step: '3',
      title:
        lang === 'hi'
          ? '₹49 पैक क्लेम करें (90 टेस्ट)'
          : 'Claim ₹49 Pack (90 Tests)',
      detail:
        lang === 'hi' ? '₹0 में लाइफटाइम अनलॉक' : 'Instant ₹0 lifetime unlock',
    },
  ];

  return (
    <section
      aria-label="Refer and Earn Tracker"
      className="relative overflow-hidden bg-gradient-to-r from-[#2E1065] via-[#581C87] to-[#86198F] text-white border border-white/25 rounded-2xl shadow-lg"
    >
      <img
        src="/images/refer-bg.png"
        alt=""
        aria-hidden="true"
        referrerPolicy="no-referrer"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 to-black/45"
      />

      <div className="relative z-10 p-4 sm:p-6 space-y-5">
        {/* Executive Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-300/35 text-amber-300 text-[11px] font-bold tracking-wider whitespace-nowrap">
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {lang === 'hi'
                    ? 'रेफर और कमाएं हब • 100% मुफ्त'
                    : 'REFER & EARN HUB • 100% FREE'}
                </span>
              </span>
              {referralState.referredBy && (
                <span className="text-[11px] font-medium text-indigo-200 tabular-nums">
                  {lang === 'hi'
                    ? `रेफरल कोड ${referralState.referredBy} से जुड़े`
                    : `Joined via ${referralState.referredBy}`}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight text-balance">
              {lang === 'hi'
                ? '2 दोस्त जोड़ें और कोई भी ₹49 टेस्ट पैक (90 टेस्ट) मुफ्त पाएं'
                : '2 Friends Joined = 1 Free ₹49 Exam Pack (90 Tests)'}
            </h2>
            <p className="text-xs text-amber-200/95 font-medium">
              {lang === 'hi'
                ? 'नोट: ₹1 ट्रायल खातों पर लागू नहीं (केवल ₹49/₹299 सब्सक्रिप्शन सक्रिय होने के बाद मान्य)'
                : 'Note: Not applicable on ₹1 Trial accounts (valid only after ₹49/₹299 subscription activation)'}
            </p>
            {(referralState.isTrialOnly ||
              !referralState.eligibleForRewards ||
              referralState.trialBlockedCount > 0) && (
              <div className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/25 border border-rose-300/40 text-rose-100 text-[11px] font-semibold">
                <Shield className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>
                  {referralState.isTrialOnly
                    ? lang === 'hi'
                      ? 'रेफरल क्रेडिट ब्लॉक: आपका खाता ₹1 ट्रायल पर है (₹49/₹299 सक्रियण आवश्यक)।'
                      : 'Reward credit blocked: Your account is on a ₹1 Trial (requires ₹49/₹299 activation).'
                    : referralState.trialBlockedCount > 0
                      ? lang === 'hi'
                        ? `${referralState.trialBlockedCount} मित्र ₹1 ट्रायल पर हैं — ₹49/₹299 सक्रियण तक क्रेडिट ब्लॉक है।`
                        : `${referralState.trialBlockedCount} invited friend(s) on ₹1 Trial — credit blocked until ₹49/₹299 activation.`
                      : lang === 'hi'
                        ? 'क्रेडिट प्राप्त करने के लिए आपका और मित्र का ₹49/₹299 प्लान सक्रिय होना आवश्यक है।'
                        : 'Requires ₹49/₹299 subscription activation on both accounts before referral credit unlocks.'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold tabular-nums border whitespace-nowrap ${
                isCycleUnlocked
                  ? 'bg-emerald-500/25 border-emerald-300/45 text-emerald-200'
                  : 'bg-amber-400/20 border-amber-300/35 text-amber-200'
              }`}
            >
              {isCycleUnlocked ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              ) : (
                <Users className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              )}
              <span>
                {milestoneCount}/2{' '}
                {lang === 'hi'
                  ? isCycleUnlocked
                    ? 'जुड़े ✓'
                    : 'जुड़े'
                  : isCycleUnlocked
                    ? 'Joined ✓'
                    : 'Joined'}
              </span>
            </span>
          </div>
        </div>

        {/* 1. 3-Step Visual How-It-Works Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {howItWorksSteps.map((item, idx) => (
            <div
              key={item.step}
              className="relative flex items-center gap-3 rounded-xl bg-indigo-950/60 border border-white/25 px-3.5 py-2.5"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-extrabold tabular-nums flex items-center justify-center shrink-0">
                {item.step}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-white truncate">
                  {item.step}. {item.title}
                </div>
                <div className="text-[11px] text-white/80 truncate">
                  {item.detail}
                </div>
              </div>
              {idx < howItWorksSteps.length - 1 && (
                <ChevronRight
                  aria-hidden="true"
                  className="hidden sm:block w-4 h-4 text-white/50 shrink-0"
                />
              )}
            </div>
          ))}
        </div>

        {/* 2. Interactive 2-Node Milestone Progress Bar */}
        <div className="rounded-xl bg-indigo-950/60 border border-white/25 p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="font-semibold text-indigo-100 tabular-nums">
              {lang === 'hi' ? 'माइलस्टोन प्रगति' : 'Milestone Progress'}:{' '}
              <strong className="text-white">{milestoneCount} / 2</strong>
              {referralState.friendsJoined > 2 && (
                <span className="ml-2 text-indigo-200/85">
                  ({lang === 'hi' ? 'कुल जॉइन' : 'Total Joined'}:{' '}
                  {referralState.friendsJoined})
                </span>
              )}
            </div>
            <div className="text-xs font-bold tabular-nums text-amber-300">
              {availableFreePacks > 0
                ? lang === 'hi'
                  ? `${availableFreePacks} फ्री ₹49 पैक तैयार`
                  : `${availableFreePacks} Free ₹49 Pack Ready`
                : lang === 'hi'
                  ? `${2 - milestoneCount} और मित्र बाकी`
                  : `${2 - milestoneCount} more to unlock`}
            </div>
          </div>

          <div className="relative h-2 bg-white/15 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-amber-400 rounded-full transition-all duration-300"
              style={{width: `${progressPercent}%`}}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[1, 2].map((slot) => {
              const joined = referralState.friendsJoined >= slot;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => {
                    if (!joined) {
                      void handleCopy(
                        lang === 'hi'
                          ? `मित्र ${slot} को आमंत्रित करने के लिए लिंक कॉपी हो गया!`
                          : `Invite link copied — share with Friend ${slot}!`,
                      );
                    }
                  }}
                  className={`flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 border text-left transition min-h-[46px] ${
                    joined
                      ? 'bg-emerald-500/20 border-emerald-400/40 text-white cursor-default'
                      : 'bg-white/10 hover:bg-white/15 border-white/15 text-indigo-100 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold tabular-nums shrink-0 ${
                        joined
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-white/15 text-indigo-200 border border-white/20'
                      }`}
                    >
                      {joined ? <Check className="w-4 h-4" /> : slot}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">
                        {lang === 'hi' ? `मित्र ${slot}` : `Friend ${slot}`}
                      </div>
                      <div className="text-[10px] text-indigo-200/80 truncate">
                        {joined
                          ? lang === 'hi'
                            ? 'सफलतापूर्वक जुड़ा'
                            : 'Referral verified'
                          : lang === 'hi'
                            ? 'लिंक कॉपी करने के लिए टैप करें'
                            : 'Tap to copy invite'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-extrabold whitespace-nowrap shrink-0 ${
                      joined ? 'text-emerald-300' : 'text-amber-300/90'
                    }`}
                  >
                    {joined
                      ? lang === 'hi'
                        ? 'जुड़े ✓'
                        : 'Joined ✓'
                      : lang === 'hi'
                        ? 'प्रतीक्षारत'
                        : 'Pending'}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                if (availableFreePacks > 0) {
                  onOpenClaimModal();
                } else {
                  void handleCopy(
                    lang === 'hi'
                      ? 'लिंक कॉपी हो गया — ₹49 पैक अनलॉक करने के लिए 2 मित्र जोड़ें!'
                      : 'Invite link copied — invite 2 friends to unlock ₹49 pack!',
                  );
                }
              }}
              className={`flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 border text-left transition min-h-[46px] ${
                availableFreePacks > 0
                  ? 'bg-amber-400 hover:bg-amber-300 border-amber-200 text-slate-950 shadow-sm'
                  : claimedExams.length > 0 && isCycleUnlocked
                    ? 'bg-emerald-500/20 border-emerald-400/40 text-white'
                    : 'bg-white/10 hover:bg-white/15 border-white/15 text-indigo-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    availableFreePacks > 0
                      ? 'bg-slate-950/15 text-slate-950'
                      : claimedExams.length > 0 && isCycleUnlocked
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-amber-400/20 text-amber-300 border border-amber-300/30'
                  }`}
                >
                  <Gift className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-extrabold truncate">
                    {lang === 'hi' ? '₹49 पैक रिवॉर्ड' : '₹49 Pack Reward'}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      availableFreePacks > 0
                        ? 'text-slate-800 font-semibold'
                        : 'text-indigo-200/80'
                    }`}
                  >
                    {availableFreePacks > 0
                      ? lang === 'hi'
                        ? 'क्लेम करने के लिए टैप करें'
                        : 'Tap to claim 90 tests'
                      : claimedExams.length > 0
                        ? lang === 'hi'
                          ? 'अनलॉक किया गया'
                          : 'Unlocked at ₹0'
                        : lang === 'hi'
                          ? '2/2 जॉइन पर खुलेगा'
                          : 'Unlocks at 2/2'}
                  </div>
                </div>
              </div>
              <span
                className={`text-[11px] font-extrabold whitespace-nowrap shrink-0 ${
                  availableFreePacks > 0
                    ? 'text-slate-950'
                    : claimedExams.length > 0
                      ? 'text-emerald-300'
                      : 'text-white/65'
                }`}
              >
                {availableFreePacks > 0
                  ? lang === 'hi'
                    ? 'क्लेम →'
                    : 'Claim →'
                  : claimedExams.length > 0
                    ? lang === 'hi'
                      ? 'क्लेम्ड ✓'
                      : 'Claimed ✓'
                    : lang === 'hi'
                      ? 'लॉक्ड'
                      : 'Locked'}
              </span>
            </button>
          </div>

          {slotNotice && (
            <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{slotNotice}</span>
            </div>
          )}
        </div>

        {/* 3. Referral Code & Link Copy Bar + Share & Claim CTAs */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-xl bg-indigo-950/60 border border-white/25 p-2.5">
            <div className="flex items-center justify-between sm:justify-start gap-2.5 px-2.5 py-1.5 rounded-lg bg-white/15 border border-white/20 shrink-0">
              <span className="text-[11px] font-semibold text-white/80">
                {lang === 'hi' ? 'कोड' : 'Code'}
              </span>
              <span className="text-sm font-extrabold font-mono-num tracking-wider text-amber-300">
                {referralState.code}
              </span>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1.5 flex-1 min-w-0">
              <Link2 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="text-xs font-mono-num text-white/95 truncate">
                {shareUrl}
              </span>
            </div>

            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-900 text-xs font-extrabold whitespace-nowrap shrink-0 min-h-[42px] transition"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>
                {copied
                  ? lang === 'hi'
                    ? 'कॉपी हो गया'
                    : 'Copied!'
                  : lang === 'hi'
                    ? 'लिंक कॉपी करें'
                    : 'Copy Link'}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold whitespace-nowrap min-h-[44px] border border-emerald-400/35 shadow-sm transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>
                  {lang === 'hi' ? 'WhatsApp पर शेयर करें' : 'Share on WhatsApp'}
                </span>
              </a>

              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold whitespace-nowrap min-h-[44px] border border-sky-400/35 shadow-sm transition"
              >
                <Send className="w-4 h-4" />
                <span>
                  {lang === 'hi' ? 'Telegram पर शेयर करें' : 'Share on Telegram'}
                </span>
              </a>

              <button
                type="button"
                onClick={onSimulateJoin}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold whitespace-nowrap min-h-[44px] transition"
              >
                <UserPlus className="w-4 h-4 text-amber-300" />
                <span>
                  {lang === 'hi'
                    ? 'Simulate Friend Join (+1 डेमो)'
                    : 'Simulate Friend Join'}
                </span>
              </button>
            </div>

            <button
              type="button"
              disabled={availableFreePacks <= 0}
              onClick={onOpenClaimModal}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap min-h-[44px] transition ${
                availableFreePacks > 0
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm'
                  : 'bg-white/10 text-white/55 border border-white/15 cursor-not-allowed'
              }`}
            >
              <Gift className="w-4 h-4" />
              <span>
                {availableFreePacks > 0
                  ? lang === 'hi'
                    ? 'फ्री ₹49 पैक क्लेम करें'
                    : 'Claim Free ₹49 Pack'
                  : lang === 'hi'
                    ? 'फ्री ₹49 पैक क्लेम करें (2/2 आवश्यक)'
                    : 'Claim Free ₹49 Pack (2/2 Required)'}
              </span>
            </button>
          </div>
        </div>

        {/* 4. Invited Friends Log & Reward History */}
        <div className="rounded-xl bg-indigo-950/60 border border-white/25 p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-300" />
              <span>
                {lang === 'hi'
                  ? 'आमंत्रित मित्र लॉग व रिवॉर्ड इतिहास'
                  : 'Invited Friends Log & Reward History'}
              </span>
            </h3>
            <span className="text-[11px] font-semibold text-white/85 tabular-nums">
              {referralState.friendsJoined}{' '}
              {lang === 'hi' ? 'जुड़े' : 'Joined'} · {claimedExams.length}{' '}
              {lang === 'hi' ? 'क्लेम्ड' : 'Claimed'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="divide-y divide-white/15 rounded-lg border border-white/20 bg-white/10 overflow-hidden">
              {friendLogEntries.map((entry) => (
                <div
                  key={entry.slotNumber}
                  className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {entry.joined ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    )}
                    <span className="font-semibold text-white truncate">
                      {lang === 'hi'
                        ? `मित्र #${entry.slotNumber}`
                        : `Friend #${entry.slotNumber}`}
                    </span>
                    {entry.joined && (
                      <span className="text-[10px] text-white/75 truncate">
                        ·{' '}
                        {entry.isSimulated
                          ? lang === 'hi'
                            ? 'डेमो जॉइन'
                            : 'Demo Join'
                          : lang === 'hi'
                            ? 'लिंक द्वारा जुड़े'
                            : 'Joined via link'}
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-bold text-[11px] whitespace-nowrap shrink-0 ${
                      entry.joined ? 'text-emerald-300' : 'text-white/80'
                    }`}
                  >
                    {entry.joined
                      ? lang === 'hi'
                        ? 'जुड़े ✓'
                        : 'Joined ✓'
                      : lang === 'hi'
                        ? 'प्रतीक्षारत'
                        : 'Pending'}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-white/20 bg-white/10 p-2.5 flex flex-col justify-center">
              {claimedExams.length > 0 ? (
                <div className="space-y-1.5">
                  {claimedExams.map((exam) => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => onNavigateToCategory?.(exam.categoryId)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-left transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Gift className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="text-xs font-bold text-white truncate">
                          {exam.shortName} · {exam.tests.length}{' '}
                          {lang === 'hi' ? 'टेस्ट' : 'Tests'}
                        </span>
                      </div>
                      <span className="text-[11px] font-extrabold text-emerald-300 whitespace-nowrap shrink-0">
                        {lang === 'hi' ? '₹0 क्लेम्ड ✓' : '₹0 Claimed ✓'}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-2 py-2 text-xs text-indigo-200/85 flex items-center justify-between gap-2">
                  <span>
                    {availableFreePacks > 0
                      ? lang === 'hi'
                        ? 'आपका ₹49 पैक क्लेम करने के लिए तैयार है!'
                        : 'Your ₹49 exam pack reward is ready to claim!'
                      : lang === 'hi'
                        ? '2 मित्र जुड़ने पर यहाँ ₹49 पैक रिवॉर्ड दिखेगा।'
                        : 'Claimed ₹49 exam packs will appear here once 2 friends join.'}
                  </span>
                  {availableFreePacks > 0 && (
                    <button
                      type="button"
                      onClick={onOpenClaimModal}
                      className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-extrabold whitespace-nowrap shrink-0"
                    >
                      {lang === 'hi' ? 'क्लेम करें' : 'Claim'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

interface ReferralPackClaimModalProps {
  open: boolean;
  lang: Language;
  unlockedTestIds: string[];
  availableFreePacks: number;
  onClose: () => void;
  onClaimPack: (exam: ExamItem) => void;
}

const FEATURED_REFERRAL_EXAM_IDS = [
  'rrb-ntpc',
  'rrb-group-d',
  'ssc-cgl',
  'jharkhand-police',
];

export const ReferralPackClaimModal: React.FC<ReferralPackClaimModalProps> = ({
  open,
  lang,
  unlockedTestIds,
  availableFreePacks,
  onClose,
  onClaimPack,
}) => {
  const [packSearch, setPackSearch] = useState('');
  const unlockedSet = useMemo(() => new Set(unlockedTestIds), [unlockedTestIds]);

  const sortedExams = useMemo(() => {
    const q = packSearch.trim().toLowerCase();
    const list = EXAMS_CATALOG.filter((exam) => {
      if (!q) return true;
      return [exam.shortName, exam.name.en, exam.name.hi, exam.categoryId]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
    return [...list].sort((a, b) => {
      const aFeatured = FEATURED_REFERRAL_EXAM_IDS.indexOf(a.id);
      const bFeatured = FEATURED_REFERRAL_EXAM_IDS.indexOf(b.id);
      if (aFeatured !== -1 && bFeatured !== -1) return aFeatured - bFeatured;
      if (aFeatured !== -1) return -1;
      if (bFeatured !== -1) return 1;
      return 0;
    });
  }, [packSearch]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        lang === 'hi' ? 'फ्री ₹49 परीक्षा पैक चुनें' : 'Claim 1 Free ₹49 Exam Pack'
      }
      className="fixed inset-0 z-50 bg-slate-900/75 flex items-center justify-center p-3 sm:p-4"
    >
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#064E3B] to-[#059669] text-white flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">
              {lang === 'hi'
                ? `${availableFreePacks} फ्री रिवॉर्ड उपलब्ध`
                : `${availableFreePacks} Free Reward Available`}
            </div>
            <h3 className="text-base sm:text-lg font-extrabold truncate mt-0.5">
              {lang === 'hi'
                ? 'कोई भी 1 ₹49 परीक्षा पैक ₹0 में अनलॉक करें'
                : 'Choose Any 1 ₹49 Exam Pack for ₹0'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'hi' ? 'बंद करें' : 'Close'}
            className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="search"
              value={packSearch}
              onChange={(e) => setPackSearch(e.target.value)}
              placeholder={
                lang === 'hi'
                  ? 'परीक्षा पैक खोजें: RRB NTPC, Group D, SSC CGL, Jharkhand Police...'
                  : 'Search any exam pack: RRB NTPC, Group D, SSC CGL, Jharkhand Police...'
              }
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 sm:p-3">
          {sortedExams.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              {lang === 'hi'
                ? 'कोई परीक्षा पैक नहीं मिला।'
                : 'No matching exam pack found.'}
            </div>
          ) : (
            sortedExams.map((exam) => {
              const allTestsUnlocked = exam.tests.every(
                (tst) => tst.tier === 'free' || unlockedSet.has(tst.id),
              );

              return (
                <div
                  key={exam.id}
                  className="p-3 rounded-xl hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {exam.shortName} · {t(exam.name, lang)}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600 font-mono-num">
                      <span>
                        {exam.tests.length} {lang === 'hi' ? 'टेस्ट' : 'Tests'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="line-through text-slate-400">₹49</span>
                      <span className="font-extrabold text-emerald-700">
                        {lang === 'hi' ? '₹0 फ्री' : '₹0 FREE'}
                      </span>
                    </div>
                  </div>

                  {allTestsUnlocked ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{lang === 'hi' ? 'अनलॉक्ड' : 'Unlocked'}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={availableFreePacks <= 0}
                      onClick={() => onClaimPack(exam)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold whitespace-nowrap shrink-0 min-h-[40px] transition"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>
                        {lang === 'hi' ? '₹0 में अनलॉक करें' : 'Unlock Free (₹0)'}
                      </span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
