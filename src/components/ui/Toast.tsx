import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { cn } from '../../lib/utils';
import { haptics } from '../../lib/haptics';

let toastCount = 0;

interface ToastProps {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: (id: number) => void;
}

function ToastItem({ id, message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 3000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  return (
    <div className={cn(
      "px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-10 fade-in duration-300 pointer-events-auto max-w-sm w-full mx-auto backdrop-blur-md border",
      type === 'success' ? "bg-green-500/20 border-green-500/50 text-green-100" :
      type === 'error' ? "bg-red-500/20 border-red-500/50 text-red-100" :
      "bg-black/60 border-white/10 text-white"
    )}>
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button onClick={() => onClose(id)} className="opacity-70 hover:opacity-100 p-1">✕</button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Omit<ToastProps, 'onClose'>[]>([]);

  useEffect(() => {
    const handleAdd = (e: any) => setToasts(t => [...t, e.detail]);
    window.addEventListener('add_toast', handleAdd);
    return () => window.removeEventListener('add_toast', handleAdd);
  }, []);

  const handleClose = (id: number) => {
    setToasts(t => t.filter(toast => toast.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 inset-x-4 z-50 flex flex-col gap-2 pointer-events-none pt-safe">
      {toasts.map(t => <ToastItem key={t.id} {...t} onClose={handleClose} />)}
    </div>
  );
}

export const toast = {
  success: (message: string) => {
    haptics.success();
    window.dispatchEvent(new CustomEvent('add_toast', { detail: { id: ++toastCount, message, type: 'success' } }));
  },
  error: (message: string) => {
    haptics.error();
    window.dispatchEvent(new CustomEvent('add_toast', { detail: { id: ++toastCount, message, type: 'error' } }));
  },
  info: (message: string) => {
    haptics.light();
    window.dispatchEvent(new CustomEvent('add_toast', { detail: { id: ++toastCount, message, type: 'info' } }));
  }
};
