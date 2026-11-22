export interface ReferralUserState {
  code: string;
  friendsJoined: number;
  claimedExamIds: string[];
  referredBy: string | null;
  simulatedJoins: number;
  eligibleForRewards: boolean;
  isTrialOnly: boolean;
  isPaidActivated: boolean;
  trialBlockedCount: number;
  rewardBlockedReason: 'trial_only' | 'activation_required' | null;
}

export function buildReferralShareUrl(code: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://examtestbook.app';
  return `${origin}/?ref=${encodeURIComponent(code)}`;
}

export function buildWhatsAppShareUrl(code: string, shareUrl: string): string {
  const message = `Exam Testbook par RRB NTPC, Group D, SSC ke 90 Mock Tests free mein paayein! Mere link se join karein: ${shareUrl} (Referral Code: ${code}) — Bilingual EN/हिंदी CBT Practice!`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildTelegramShareUrl(code: string, shareUrl: string): string {
  const message = `Exam Testbook par RRB NTPC, Group D, SSC ke 90 Mock Tests free mein paayein! Join with code ${code}:`;
  return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(message)}`;
}
