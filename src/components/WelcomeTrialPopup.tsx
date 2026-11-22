import React, {useEffect} from 'react';
import {CheckCircle2, Crown, ShieldCheck, Sparkles, X} from 'lucide-react';
import type {Language} from '../types/exam';

interface WelcomeTrialPopupProps {
  open: boolean;
  lang: Language;
  onClose: () => void;
  onStartTrial: () => void;
}

export const WelcomeTrialPopup: React.FC<WelcomeTrialPopupProps> = ({
  open,
  lang,
  onClose,
  onStartTrial,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const bullets =
    lang === 'hi'
      ? [
          '24 घंटे फुल CBT एक्सेस',
          'फिर ₹49/वर्ष (सिंगल परीक्षा) या ₹299/वर्ष (फुल कैटेगरी) Autopay',
          'डैशबोर्ड से कभी भी रद्द करें',
        ]
      : [
          '24 Hours Full CBT Access',
          'Then ₹49/yr (Single Exam) or ₹299/yr (Full Category) Autopay',
          'Cancel Anytime in Dashboard',
        ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-trial-popup-heading"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[55] bg-slate-950/80 flex items-center justify-center p-3.5 sm:p-5 animate-fade-in"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-gradient-to-br from-[#09142C] via-[#172554] to-[#1E3A8A] text-white border-2 border-amber-400 ring-2 ring-amber-300/40 shadow-[0_22px_55px_rgba(9,20,44,0.72),0_0_32px_rgba(245,158,11,0.25)]">
        {/* Golden top shimmer rim & ambient radial glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-14 w-52 h-52 rounded-full bg-amber-400/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -left-12 w-48 h-48 rounded-full bg-emerald-400/15 blur-3xl"
        />

        {/* Top-right Close X Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label={lang === 'hi' ? 'बंद करें' : 'Close welcome offer'}
          className="absolute top-3.5 right-3.5 z-20 w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 p-5 sm:p-7 space-y-5">
          {/* Bold Golden Badge */}
          <div className="pr-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-slate-950 text-[11px] font-extrabold tracking-wide uppercase shadow-sm">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>
                {lang === 'hi'
                  ? 'सीमित स्वागत ऑफर • ₹1 ट्रायल'
                  : 'LIMITED WELCOME OFFER • ₹1 TRIAL'}
              </span>
            </span>
          </div>

          {/* Large High-Contrast Headline */}
          <div className="space-y-2">
            <h2
              id="welcome-trial-popup-heading"
              className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug text-white text-balance"
            >
              {lang === 'hi'
                ? 'आज केवल ₹1 में कोई भी परीक्षा पैक या फुल कैटेगरी अनलॉक करें!'
                : 'Unlock Any Exam Pack or Full Category for Just ₹1 Today!'}
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 flex items-center gap-1.5 font-medium">
              <Crown className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                {lang === 'hi'
                  ? 'Exam TestBook • द्विभाषी (EN + हिंदी) रियल TCS iON CBT मॉक टेस्ट'
                  : 'Exam TestBook • Bilingual (EN + हिंदी) TCS iON Pattern Mock Tests'}
              </span>
            </p>
          </div>

          {/* Clear Bullet Points */}
          <ul className="rounded-xl bg-indigo-950/60 border border-amber-300/30 p-3.5 sm:p-4 space-y-2.5 text-xs sm:text-sm font-semibold text-white/95">
            {bullets.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {/* Glossy Bright Green CTA Button */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={onStartTrial}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-b from-emerald-400 via-emerald-500 to-green-600 hover:from-emerald-300 hover:via-emerald-400 hover:to-green-500 text-white text-sm sm:text-base font-extrabold border border-emerald-200/80 shadow-[0_8px_24px_rgba(16,185,129,0.5),inset_0_1px_0_rgba(255,255,255,0.55)] min-h-[48px] transition active:scale-[0.98]"
            >
              <span>
                {lang === 'hi'
                  ? 'अभी ₹1 ट्रायल भुगतान करें →'
                  : 'Pay ₹1 Trial Now →'}
              </span>
            </button>

            <div className="flex items-center justify-between gap-2 text-[11px] text-blue-200/90">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>
                  {lang === 'hi'
                    ? 'सुरक्षित Razorpay UPI / कार्ड'
                    : 'Secured by Razorpay UPI & Cards'}
                </span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="font-bold text-white/80 hover:text-white underline underline-offset-2"
              >
                {lang === 'hi' ? 'बाद में देखें' : 'Maybe later'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
