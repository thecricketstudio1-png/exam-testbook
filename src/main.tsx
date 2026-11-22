import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import {SubscriptionProvider} from './context/SubscriptionContext.tsx';
import {initPWAInstallListeners} from './hooks/usePWAInstall.ts';
import './index.css';

initPWAInstallListeners();

registerSW({
  immediate: true,
  onRegisterError() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  },
});

createRoot(document.getElementById('root')!).render(
  <SubscriptionProvider>
    <App />
  </SubscriptionProvider>,
);
