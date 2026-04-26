import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { haptics } from '../../lib/haptics';

export function ConfirmModalContainer() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const handleAdd = (e: any) => {
      setConfig(e.detail);
      setIsOpen(true);
      haptics.medium();
    };
    window.addEventListener('open_confirm', handleAdd);
    return () => window.removeEventListener('open_confirm', handleAdd);
  }, []);

  const handleClose = (result: boolean) => {
    setIsOpen(false);
    if (config?.onResolve) {
      config.onResolve(result);
    }
  };

  if (!isOpen || !config) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => handleClose(false)} />
      <div className={cn("relative w-full max-w-sm bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200", config.danger && "border-[var(--color-accent-red)]/50")}>
        <h3 className="text-xl font-bold text-white mb-2">{config.title}</h3>
        <p className="text-[var(--color-text-muted)] text-sm mb-6">{config.message}</p>
        <div className="flex gap-3">
          <button 
            onClick={() => handleClose(false)}
            className="flex-1 py-3 px-4 rounded-xl font-bold bg-[var(--color-bg-main)] border border-[var(--color-border-main)] text-white hover:bg-white/5 transition-colors"
          >
            {config.cancelText || 'Hủy'}
          </button>
          <button 
            onClick={() => handleClose(true)}
            className={cn("flex-1 py-3 px-4 rounded-xl font-bold text-white transition-colors shadow-lg", 
              config.danger ? "bg-[var(--color-accent-red)] hover:bg-red-600 shadow-red-500/20" : "bg-[var(--color-accent-blue)] hover:bg-blue-600 shadow-blue-500/20"
            )}
          >
            {config.confirmText || 'Đồng ý'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const confirmModal = (options: { title: string; message: string; confirmText?: string; cancelText?: string; danger?: boolean }) => {
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(new CustomEvent('open_confirm', { 
      detail: { ...options, onResolve: resolve } 
    }));
  });
};
