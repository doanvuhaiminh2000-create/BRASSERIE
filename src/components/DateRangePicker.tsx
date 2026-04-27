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
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'dd/mm/yyyy';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-3 bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-xl p-2 focus-within:border-[var(--color-accent-gold)] focus-within:ring-1 focus-within:ring-[var(--color-accent-gold)] transition-all">
        <div className="flex items-center gap-2 pl-2">
          <Calendar className="w-4 h-4 text-[var(--color-accent-gold)]" />
          <div className="flex items-center gap-1">
            <div className="relative group/dt">
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
              />
              <div className="bg-transparent text-white text-xs font-bold px-1 py-1 rounded hover:bg-white/5 transition-colors">
                {formatDate(startDate)}
              </div>
            </div>
            <span className="text-[var(--color-text-muted)] text-xs font-bold mx-0.5">-</span>
            <div className="relative group/dt">
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
              />
              <div className="bg-transparent text-white text-xs font-bold px-1 py-1 rounded hover:bg-white/5 transition-colors">
                {formatDate(endDate)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-[var(--color-text-muted)] font-medium px-2 uppercase tracking-widest italic flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-[var(--color-accent-gold)]"></span>
        Khoảng phân tích (dd/mm/yyyy)
      </p>
    </div>
  );
}
