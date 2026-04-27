import React from 'react';
import { Database } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon = Database, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center animate-in fade-in duration-500 bg-[var(--color-bg-surface)] rounded-2xl border border-[var(--color-border-main)] p-6 text-center">
       <Icon className="w-12 h-12 text-[var(--color-text-muted)] mb-4 opacity-50" />
       <h2 className="text-lg md:text-xl font-bold text-white mb-2 uppercase tracking-wide">{title}</h2>
       {description && <p className="text-[var(--color-text-muted)] text-sm max-w-sm mb-6 leading-relaxed">{description}</p>}
       {actionLabel && onAction && (
         <button 
           onClick={onAction} 
           className="px-6 py-3 bg-[var(--color-accent-gold)] text-black font-black rounded-lg transition-all shadow-lg hover:scale-105 active:scale-95 uppercase tracking-widest text-xs"
         >
           {actionLabel}
         </button>
       )}
    </div>
  );
}
