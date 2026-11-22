import {useCallback, useEffect, useState} from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: 'accepted' | 'dismissed'; platform: string}>;
}

const BANNER_DISMISS_STORAGE_KEY = 'etb_pwa_install_dismissed_session_v1';
const AUTO_POPUP_DELAY_MS = 1500;

interface PWAStoreState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  isInstalled: boolean;
  isIOS: boolean;
  isInAppBrowser: boolean;
  bannerDismissed: boolean;
  autoPopupReady: boolean;
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as {standalone?: boolean}).standalone === true
  );
}

function detectPlatformFlags(): {isIOS: boolean; isInAppBrowser: boolean} {
  if (typeof navigator === 'undefined') {
    return {isIOS: false, isInAppBrowser: false};
  }
  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isInAppBrowser =
    /\bwv\b|FBAN|FBAV|Instagram|Telegram|WhatsApp|Line\/|MicroMessenger|Snapchat|Twitter/i.test(
      ua,
    ) ||
    (/Android/i.test(ua) &&
      /Version\/[\d.]+/i.test(ua) &&
      !/Chrome\/[\d.]+ Mobile/i.test(ua));
  return {isIOS, isInAppBrowser};
}

function readBannerDismissedInSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(BANNER_DISMISS_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const initialFlags = detectPlatformFlags();
let storeState: PWAStoreState = {
  deferredPrompt: null,
  isInstalled: detectStandalone(),
  isIOS: initialFlags.isIOS,
  isInAppBrowser: initialFlags.isInAppBrowser,
  bannerDismissed: readBannerDismissedInSession(),
  autoPopupReady: false,
};

const listeners = new Set<() => void>();
let globalListenersAttached = false;
let autoPopupTimerId: number | null = null;

function notifyListeners() {
  for (const listener of listeners) {
    listener();
  }
}

function updateStore(partial: Partial<PWAStoreState>) {
  storeState = {...storeState, ...partial};
  notifyListeners();
}

export function initPWAInstallListeners(): void {
  if (typeof window === 'undefined' || globalListenersAttached) return;
  globalListenersAttached = true;

  if (!storeState.autoPopupReady && autoPopupTimerId === null) {
    autoPopupTimerId = window.setTimeout(() => {
      autoPopupTimerId = null;
      updateStore({autoPopupReady: true});
    }, AUTO_POPUP_DELAY_MS);
  }

  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    updateStore({
      deferredPrompt: e as BeforeInstallPromptEvent,
      isInstalled: detectStandalone(),
    });
  };

  const handleAppInstalled = () => {
    updateStore({
      isInstalled: true,
      deferredPrompt: null,
    });
  };

  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);

  const mediaQuery = window.matchMedia('(display-mode: standalone)');
  const handleDisplayModeChange = (e: MediaQueryListEvent) => {
    if (e.matches) {
      updateStore({isInstalled: true, deferredPrompt: null});
    }
  };
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleDisplayModeChange);
  }
}

// Capture beforeinstallprompt and start 1.5s auto-popup countdown immediately on initial load
initPWAInstallListeners();

export function dismissPWAInstallBanner(): void {
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(BANNER_DISMISS_STORAGE_KEY, '1');
    } catch {
      // Ignore sessionStorage errors
    }
  }
  updateStore({bannerDismissed: true});
}

export type PWAInstallOutcome = 'accepted' | 'dismissed' | 'fallback';

export function usePWAInstall() {
  const [state, setState] = useState<PWAStoreState>(() => storeState);

  useEffect(() => {
    initPWAInstallListeners();
    setState(storeState);
    const sync = () => setState(storeState);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const install = useCallback(async (): Promise<PWAInstallOutcome> => {
    const promptEvent = storeState.deferredPrompt;
    if (!promptEvent) {
      return 'fallback';
    }
    try {
      await promptEvent.prompt();
      const {outcome} = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        updateStore({isInstalled: true, deferredPrompt: null});
        return 'accepted';
      }
      updateStore({deferredPrompt: null});
      return 'dismissed';
    } catch {
      return 'fallback';
    }
  }, []);

  return {
    isInstallable: Boolean(state.deferredPrompt),
    isInstalled: state.isInstalled,
    isIOS: state.isIOS,
    isInAppBrowser: state.isInAppBrowser,
    bannerDismissed: state.bannerDismissed,
    autoPopupReady: state.autoPopupReady,
    dismissBanner: dismissPWAInstallBanner,
    install,
  };
}
