import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-orange-600/90 backdrop-blur-md text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top-full duration-300">
      <WifiOff className="w-4 h-4" />
      <span>Mất kết nối mạng. Bạn đang dùng Offline Mode.</span>
    </div>
  );
}
