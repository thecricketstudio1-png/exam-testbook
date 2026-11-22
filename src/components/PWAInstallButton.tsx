import React, {useState} from 'react';
import {
  CheckCircle2,
  Download,
  MoreVertical,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';
import type {Language} from '../types/exam';

interface PWAInstallFallbackModalProps {
  open: boolean;
  lang: Language;
  isIOS: boolean;
  isInAppBrowser: boolean;
  onClose: () => void;
}

export const PWAInstallFallbackModal: React.FC<PWAInstallFallbackModalProps> = ({
  open,
  lang,
  isIOS,
  isInAppBrowser,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        lang === 'hi'
          ? 'Exam TestBook ऐप इंस्टॉल करें'
          : 'Install Exam TestBook App'
      }
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/75 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white border-2 border-amber-400 shadow-2xl overflow-hidden animate-fade-in">
        <div className="px-4 py-3.5 bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#1D4ED8] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/icon-192.png"
              alt="Exam TestBook"
              className="w-10 h-10 rounded-xl border border-amber-300/80 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                {lang === 'hi' ? '1-स्टेप ऐप इंस्टॉल' : '1-STEP APP INSTALL'}
              </div>
              <h3 className="text-sm font-extrabold truncate">
                {lang === 'hi'
                  ? 'Exam TestBook इंस्टॉल करें'
                  : 'Install Exam TestBook App'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'hi' ? 'बंद करें' : 'Close'}
            className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5 text-slate-800">
          {isIOS ? (
            <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 space-y-2 text-xs sm:text-sm">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <Share className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                <span>
                  {lang === 'hi'
                    ? 'iPhone / iPad Safari स्टेप्स:'
                    : 'Install on iPhone / iPad (Safari):'}
                </span>
              </div>
              <p className="font-semibold text-slate-800 leading-relaxed">
                {lang === 'hi'
                  ? 'नीचे Safari में Share आइकन दबाएं → "Add to Home Screen" चुनें।'
                  : 'Tap the Share button in Safari toolbar → Tap "Add to Home Screen".'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 space-y-2 text-xs sm:text-sm">
              <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                {isInAppBrowser ? (
                  <MoreVertical className="w-4 h-4 text-amber-700 shrink-0" />
                ) : (
                  <Smartphone className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                )}
                <span>
                  {lang === 'hi' ? '1-स्टेप इंस्टॉल गाइड:' : '1-Step Install Guide:'}
                </span>
              </div>
              <p className="font-bold text-slate-900 leading-relaxed">
                {lang === 'hi'
                  ? 'ऊपर दाईं ओर ब्राउज़र मेन्यू ⋮ पर टैप करें → "Install app" या "Add to Home screen" चुनें।'
                  : 'Tap browser menu ⋮ at top-right → Tap "Install app" or "Add to Home screen".'}
              </p>
              {isInAppBrowser && (
                <p className="text-xs text-slate-600 font-medium">
                  {lang === 'hi'
                    ? 'Telegram, Instagram या WhatsApp में पहले "Open in Chrome" चुनें।'
                    : 'Inside Telegram, Instagram, or WhatsApp? First tap "Open in Chrome".'}
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-300 via-yellow-300 to-emerald-400 hover:from-amber-200 hover:to-emerald-300 text-slate-950 text-sm font-extrabold min-h-[42px] flex items-center justify-center gap-1.5 transition"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{lang === 'hi' ? 'समझ गया (Got It)' : 'Got It'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface PWAInstallButtonProps {
  lang: Language;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({lang}) => {
  const {isInstalled, isIOS, isInAppBrowser, install} = usePWAInstall();
  const [showFallbackModal, setShowFallbackModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    const outcome = await install();
    if (outcome === 'fallback') {
      setShowFallbackModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        aria-label={
          lang === 'hi' ? 'ऐप इंस्टॉल करें' : 'Install Exam TestBook App'
        }
        className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-300 hover:from-amber-200 hover:to-yellow-200 text-slate-950 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-extrabold shadow-xs border border-amber-200 transition whitespace-nowrap shrink-0 min-h-[34px] active:scale-[0.97]"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{lang === 'hi' ? 'इंस्टॉल' : 'Install'}</span>
      </button>

      <PWAInstallFallbackModal
        open={showFallbackModal}
        lang={lang}
        isIOS={isIOS}
        isInAppBrowser={isInAppBrowser}
        onClose={() => setShowFallbackModal(false)}
      />
    </>
  );
};
