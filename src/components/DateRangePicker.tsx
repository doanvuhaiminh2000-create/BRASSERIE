import React from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  className?: string;
}

export function DateRangePicker({
  startDate, setStartDate,
  endDate, setEndDate,
  className = ""
}: DateRangePickerProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-xl p-2 focus-within:border-[var(--color-accent-gold)] focus-within:ring-1 focus-within:ring-[var(--color-accent-gold)] transition-all ${className}`}>
      <div className="flex items-center gap-2 pl-2 animate-in fade-in slide-in-from-left-2 duration-300">
        <Calendar className="w-4 h-4 text-[var(--color-text-muted)]" />
        <input 
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-transparent border-none text-white text-sm font-medium focus:ring-0 outline-none cursor-pointer [color-scheme:dark] transition-colors"
        />
        <span className="text-[var(--color-text-muted)] text-sm font-bold">-</span>
        <input 
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-transparent border-none text-white text-sm font-medium focus:ring-0 outline-none cursor-pointer [color-scheme:dark] transition-colors"
        />
      </div>
    </div>
  );
}
