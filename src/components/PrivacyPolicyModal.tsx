import React, {useEffect} from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CreditCard,
  Lock,
  Mail,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type {Language} from '../types/exam';

interface PrivacyPolicyModalProps {
  open: boolean;
  lang: Language;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  open,
  lang,
  onClose,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Privacy Policy — Exam TestBook"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[80] bg-slate-950/75 flex items-center justify-center p-2.5 sm:p-5"
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-fade-in">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-[#09142C] via-[#172554] to-[#1E40AF] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                Exam TestBook · /privacy-policy
              </div>
              <h2 className="text-base sm:text-lg font-extrabold truncate">
                {lang === 'hi'
                  ? 'गोपनीयता नीति (Privacy Policy)'
                  : 'Privacy Policy'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'hi' ? 'बंद करें' : 'Close Privacy Policy'}
            className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {/* App & Developer Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#1E40AF] shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  App Name
                </div>
                <div className="font-extrabold text-slate-900">Exam TestBook</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-[#1E40AF] shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Effective Date
                </div>
                <div className="font-bold text-slate-900">November 22, 2026</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Building2 className="w-4 h-4 text-[#1E40AF] shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Developer
                </div>
                <div className="font-bold text-slate-900">
                  Sharma Traders, Chas, Bokaro, Jharkhand, India
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-[#1E40AF] shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Contact
                </div>
                <div className="font-bold text-slate-900 break-all">
                  a4stechnical9507@gmail.com
                </div>
              </div>
            </div>
          </div>

          {/* Mandatory Non-Government Disclaimer */}
          <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-extrabold uppercase tracking-wider text-amber-900">
                {lang === 'hi'
                  ? 'महत्वपूर्ण अस्वीकरण (Disclaimer)'
                  : 'Important Educational Disclaimer'}
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                Exam TestBook is an independent educational platform and is NOT
                affiliated with Indian Railways (RRB), SSC, IBPS, JPSC, JSSC, or
                any government organization.
              </p>
            </div>
          </div>

          {/* 1. Firebase Auth Data Usage */}
          <section className="space-y-1.5">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>1. Firebase Authentication (Google & Email Login) Data Usage</span>
            </h3>
            <p>
              <strong>Exam TestBook</strong> allows you to practice free mock tests and
              daily quizzes without creating an account. When you choose to sign in
              using <strong>Firebase Auth (Google Sign-In or Email/Password login)</strong>,
              we collect only minimal account identifiers—your display name, email
              address, and Firebase User ID (<code>uid</code>).
            </p>
            <p>
              This information is stored securely in Google Firebase Firestore strictly
              to synchronize your mock test attempts, accuracy analytics, bookmarked
              questions, and paid test pack or subscription entitlements across your
              devices. We never sell, rent, or share your email or profile data with
              third-party advertisers.
            </p>
          </section>

          {/* 2. Razorpay & UPI AutoPay Verification */}
          <section className="space-y-1.5">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>2. Razorpay Payments & UPI AutoPay Verification</span>
            </h3>
            <p>
              All paid upgrades—including the <strong>₹1 Trial Pass</strong>,{' '}
              <strong>₹49/yr Annual Exam Pack</strong>, and{' '}
              <strong>₹299/yr Mega All-Exam Pass</strong>—are processed through{' '}
              <strong>Razorpay</strong>, a PCI-DSS compliant payment gateway. During
              checkout or <strong>UPI AutoPay verification</strong>, your payment
              credentials are entered exclusively inside Razorpay&apos;s encrypted
              checkout flow.
            </p>
            <p className="font-semibold text-slate-900">
              No credit/debit card numbers, CVV codes, net-banking passwords, or UPI PIN
              are ever collected, processed, or stored by Exam TestBook or Sharma
              Traders.
            </p>
            <p>
              We only retain non-sensitive Razorpay transaction/order reference IDs and
              your active plan validity status in Firestore so your unlocked mock tests
              remain accessible and can be cancelled at any time from your Dashboard.
            </p>
          </section>

          {/* 3. Local Storage & Offline PWA Data */}
          <section className="space-y-1.5">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              3. Local Browser Storage & Offline Practice
            </h3>
            <p>
              To support uninterrupted offline test practice and fast resume capability,
              Exam TestBook stores language preferences, saved questions, in-progress
              test responses, and cached attempt history locally in your browser/device
              storage. You can clear attempt history or local cache at any time.
            </p>
          </section>

          {/* 4. Account Deletion */}
          <section className="space-y-1.5 rounded-xl bg-blue-50/70 border border-blue-200 p-4">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
              <span>4. Account & Data Deletion Request</span>
            </h3>
            <p>
              You may request permanent deletion of your Exam TestBook account,
              Firebase Auth profile, test history, and subscription records at any time
              by sending an email request to{' '}
              <a
                href="mailto:a4stechnical9507@gmail.com?subject=Account%20Deletion%20Request%20-%20Exam%20TestBook"
                className="font-bold text-[#1E40AF] underline"
              >
                a4stechnical9507@gmail.com
              </a>{' '}
              from your registered email address. Deletion requests are verified and
              completed within 7 business days.
            </p>
          </section>

          {/* 5. Developer & Contact Information */}
          <section className="space-y-1.5 pt-1 border-t border-slate-200">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#2563EB] shrink-0" />
              <span>5. Grievance & Developer Contact</span>
            </h3>
            <p>
              If you have any questions about this Privacy Policy (Effective Date:{' '}
              <strong>November 22, 2026</strong>), subscriptions, refunds, or data
              privacy, please contact:
            </p>
            <div className="text-slate-900 font-semibold space-y-0.5">
              <div>App Name: Exam TestBook</div>
              <div>Developer: Sharma Traders, Chas, Bokaro, Jharkhand, India</div>
              <div>Contact: a4stechnical9507@gmail.com</div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] font-medium text-slate-500">
            Effective Date: November 22, 2026 · Sharma Traders
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1E40AF] hover:bg-blue-800 text-white text-xs sm:text-sm font-bold min-h-[38px] transition"
          >
            {lang === 'hi' ? 'बंद करें' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
