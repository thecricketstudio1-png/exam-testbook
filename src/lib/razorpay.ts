import type {User} from 'firebase/auth';
import {
  unlockEntitlementInFirestore,
  type VerifiedPaymentPayload,
} from './firebase';

export type RazorpayPlan = 'single' | 'bundle';

interface CreateOrderResponse {
  mode: 'live' | 'sandbox';
  orderId: string;
  amount: number;
  amountInr: number;
  currency: string;
  keyId: string;
  sandboxPayment?: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };
  error?: string;
}

interface VerifyPaymentResponse {
  verified: boolean;
  entitlement?: VerifiedPaymentPayload;
  error?: string;
}

export interface RazorpayHandlerResponse {
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  razorpay_payment_id: string;
  razorpay_signature?: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {open: () => void};
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      if (window.Razorpay) {
        finish(true);
        return;
      }
      if (existing.dataset.rzpFailed === '1') {
        finish(false);
        return;
      }
      const timeoutId = window.setTimeout(
        () => finish(Boolean(window.Razorpay)),
        5000,
      );
      existing.addEventListener(
        'load',
        () => {
          window.clearTimeout(timeoutId);
          finish(Boolean(window.Razorpay));
        },
        {once: true},
      );
      existing.addEventListener(
        'error',
        () => {
          window.clearTimeout(timeoutId);
          existing.dataset.rzpFailed = '1';
          finish(false);
        },
        {once: true},
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    const timeoutId = window.setTimeout(
      () => finish(Boolean(window.Razorpay)),
      5000,
    );
    script.onload = () => {
      window.clearTimeout(timeoutId);
      finish(Boolean(window.Razorpay));
    };
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      script.dataset.rzpFailed = '1';
      finish(false);
    };
    document.body.appendChild(script);
  });
}

async function verifyWithBackend(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan: RazorpayPlan;
  testId: string;
  uid?: string;
}): Promise<VerifiedPaymentPayload> {
  const verifyRes = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
  });

  const data = (await verifyRes.json()) as VerifyPaymentResponse;
  if (!verifyRes.ok || !data.verified || !data.entitlement) {
    throw new Error(data.error || 'Payment verification failed on server.');
  }
  return data.entitlement;
}

export async function triggerRazorpayCheckout(params: {
  plan: RazorpayPlan;
  testId: string;
  testTitle: string;
  user: User | null;
}): Promise<VerifiedPaymentPayload> {
  const {plan, testId, testTitle, user} = params;

  const orderRes = await fetch('/api/create-order', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      plan,
      testId: plan === 'bundle' ? 'ALL_MEGA_BUNDLE' : testId,
      uid: user?.uid || 'guest',
    }),
  });

  const orderData = (await orderRes.json()) as CreateOrderResponse;
  if (!orderRes.ok || !orderData.orderId) {
    throw new Error(orderData.error || 'Could not initiate Razorpay order.');
  }

  let paymentResult: RazorpayHandlerResponse;

  if (orderData.mode === 'live') {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) {
      throw new Error('Unable to load Razorpay Checkout SDK.');
    }

    paymentResult = await new Promise<RazorpayHandlerResponse>((resolve, reject) => {
      const rzp = new window.Razorpay!({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Exam Testbook',
        description:
          plan === 'bundle'
            ? 'Mega All-Exam Bundle (₹299)'
            : `${testTitle} — Single Test Pass (₹49)`,
        order_id: orderData.orderId,
        prefill: {
          name: user?.displayName || undefined,
          email: user?.email || undefined,
        },
        theme: {color: '#1E40AF'},
        handler: (resp) => resolve(resp),
        modal: {
          ondismiss: () => reject(new Error('Checkout dismissed by user.')),
        },
      });
      rzp.open();
    });
  } else {
    if (!orderData.sandboxPayment) {
      throw new Error('Sandbox payment payload missing from order response.');
    }
    paymentResult = orderData.sandboxPayment;
  }

  const verifiedEntitlement = await verifyWithBackend({
    razorpay_order_id: paymentResult.razorpay_order_id || orderData.orderId,
    razorpay_payment_id: paymentResult.razorpay_payment_id,
    razorpay_signature: paymentResult.razorpay_signature || '',
    plan,
    testId: plan === 'bundle' ? 'ALL_MEGA_BUNDLE' : testId,
    uid: user?.uid,
  });

  if (user) {
    await unlockEntitlementInFirestore(user.uid, verifiedEntitlement);
  }

  return verifiedEntitlement;
}
