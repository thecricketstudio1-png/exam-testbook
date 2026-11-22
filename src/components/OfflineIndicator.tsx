import React from 'react';
import {WifiOff} from 'lucide-react';
import {useOnlineStatus} from '../hooks/useOnlineStatus';
import {Language} from '../types/exam';

export const OfflineIndicator: React.FC<{lang: Language}> = ({lang}) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        {lang === 'hi'
          ? 'ऑफ़लाइन मोड — कैश्ड डेटा और मॉक टेस्ट उपलब्ध हैं।'
          : 'Offline Mode — Cached mock tests & saved data active.'}
      </span>
    </div>
  );
};
