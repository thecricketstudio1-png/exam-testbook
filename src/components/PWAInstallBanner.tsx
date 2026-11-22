import React, {useState} from 'react';
import {
  CheckCircle2,
  Download,
  MoreVertical,
  Share,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';
import type {Language} from '../types/exam';

interface PWAInstallBannerProps {
  lang: Language;
  hidden?: boolean;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  lang,
  hidden = false,
}) => {
  const {
    isInstalled,
    isIOS,
    isInAppBrowser,
    bannerDismissed,
    autoPopupReady,
    dismissBanner,
    install,
  } = usePWAInstall();
  const [showInlineFallback, setShowInlineFallback] = useState(false);

  if (hidden || isInstalled || bannerDismissed || !autoPopupReady) {
    return null;
  }

  const handleInstallClick = async () => {
    const outcome = await install();
    if (outcome === 'fallback') {
      setShowInlineFallback(true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={
        lang === 'hi'
          ? 'Exam TestBook ऐप डाउनलोड और इंस्टॉल करें'
          : 'Download & Install Exam TestBook App'
      }
      className="fixed bottom-0 inset-x-0 md:bottom-5 md:right-5 md:left-auto md:w-[420px] z-[60] px-2 pt-2 md:p-0 pointer-events-none animate-fade-in"
    >
      <div className="pointer-events-auto relative overflow-hidden rounded-t-3xl md:rounded-2xl bg-gradient-to-br from-[#0B132B] via-[#1E3A8A] to-[#1D4ED8] text-white border-2 border-amber-400 shadow-[0_-12px_40px_rgba(15,23,42,0.68)] md:shadow-[0_18px_45px_rgba(15,23,42,0.68)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-4">
        {/* Top glossy golden accent bar */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-300 via-yellow-200 to-emerald-300"
        />

        {/* Subtle mobile bottom-sheet handle pill */}
        <div
          aria-hidden="true"
          className="w-10 h-1 rounded-full bg-white/30 mx-auto mb-2.5 md:hidden"
        />

        {/* Top-right Close Button */}
        <button
          type="button"
          onClick={dismissBanner}
          aria-label={
            lang === 'hi' ? 'ऐप इंस्टॉल कार्ड बंद करें' : 'Dismiss app install prompt'
          }
          className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Row: Custom App Icon + Title & Size Copy */}
        <div className="flex items-center gap-3 pr-9">
          <div className="relative shrink-0">
            <img
              src="/icon-192.png"
              alt="Exam TestBook App Icon"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-amber-300 shadow-md bg-[#0f172a]"
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-[#1E3A8A] text-slate-950 flex items-center justify-center">
              <Download className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-300/50 text-amber-200 text-[10px] font-extrabold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>{lang === 'hi' ? 'ऑफिशियल CBT ऐप' : 'OFFICIAL CBT APP'}</span>
            </div>
            <h3 className="text-sm sm:text-[15px] font-extrabold text-white leading-snug">
              {lang === 'hi'
                ? 'Exam TestBook ऐप डाउनलोड और इंस्टॉल करें'
                : 'Download & Install Exam TestBook App'}
            </h3>
            <p className="text-xs text-blue-100 font-semibold mt-0.5">
              {lang === 'hi'
                ? '2 MB • इंस्टेंट CBT मॉक टेस्ट और ऑफलाइन एक्सेस'
                : '2 MB • Instant CBT Tests'}
            </p>
          </div>
        </div>

        {/* Action Button or Inline 1-Step Instructions */}
        {!showInlineFallback ? (
          <div className="mt-3.5 relative">
            <div
              aria-hidden="true"
              className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-emerald-400 opacity-75 animate-pulse"
            />
            <button
              type="button"
              onClick={() => void handleInstallClick()}
              className="relative w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-emerald-400 hover:from-amber-200 hover:via-yellow-200 hover:to-emerald-300 text-slate-950 text-sm sm:text-[15px] font-extrabold border border-amber-100 shadow-lg flex items-center justify-center gap-2 min-h-[46px] transition active:scale-[0.98]"
            >
              <Download className="w-4 h-4 stroke-[2.75] shrink-0" />
              <span>
                {lang === 'hi'
                  ? 'अभी इंस्टॉल करें (1-क्लिक)'
                  : 'Install Now (1-Click)'}
              </span>
            </button>
          </div>
        ) : (
          <div className="mt-3.5 rounded-xl bg-slate-950/75 border border-amber-300/70 p-3.5 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {lang === 'hi' ? '1-स्टेप इंस्टॉल गाइड' : '1-STEP INSTALL GUIDE'}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                {isIOS ? (
                  <>
                    <Share className="w-3 h-3" />
                    <span>→ Home Screen</span>
                  </>
                ) : (
                  <>
                    <MoreVertical className="w-3 h-3" />
                    <span>→ Install app</span>
                  </>
                )}
              </span>
            </div>

            {isIOS ? (
              <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                {lang === 'hi' ? (
                  <>
                    Safari में नीचे <strong className="text-amber-300">Share</strong>{' '}
                    आइकन दबाएं →{' '}
                    <strong className="text-emerald-300">
                      Add to Home Screen
                    </strong>{' '}
                    पर टैप करें।
                  </>
                ) : (
                  <>
                    Tap Safari <strong className="text-amber-300">Share</strong>{' '}
                    icon below → Tap{' '}
                    <strong className="text-emerald-300">
                      Add to Home Screen
                    </strong>
                    .
                  </>
                )}
              </p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed">
                  {lang === 'hi' ? (
                    <>
                      ऊपर दाईं ओर ब्राउज़र मेन्यू{' '}
                      <strong className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/15 text-amber-300">
                        ⋮
                      </strong>{' '}
                      पर टैप करें →{' '}
                      <strong className="text-emerald-300">Install app</strong> या{' '}
                      <strong className="text-emerald-300">
                        Add to Home screen
                      </strong>{' '}
                      चुनें।
                    </>
                  ) : (
                    <>
                      Tap browser menu{' '}
                      <strong className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/15 text-amber-300">
                        ⋮
                      </strong>{' '}
                      at top-right → Tap{' '}
                      <strong className="text-emerald-300">Install app</strong> or{' '}
                      <strong className="text-emerald-300">
                        Add to Home screen
                      </strong>
                      .
                    </>
                  )}
                </p>
                {isInAppBrowser && (
                  <p className="text-[11px] text-amber-200 font-medium">
                    {lang === 'hi'
                      ? 'यदि आप Telegram/WhatsApp/Instagram में हैं, तो पहले "Open in Chrome" चुनें।'
                      : 'Inside Telegram, WhatsApp, or Instagram? Choose "Open in Chrome" first.'}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={dismissBanner}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-amber-300 hover:from-emerald-300 hover:to-amber-200 text-slate-950 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 min-h-[40px] transition active:scale-[0.98]"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{lang === 'hi' ? 'समझ गया (Got It)' : 'Got It'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
