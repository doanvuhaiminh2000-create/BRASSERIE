import React from 'react';
import { Calendar } from 'lucide-react';
import { DateRange } from '../lib/utils'; // Keep the type string there or redefine here

interface DateRangePickerProps {
  dateFilter: string;
  setDateFilter: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  className?: string;
}

export function DateRangePicker({
  dateFilter, setDateFilter,
  startDate, setStartDate,
  endDate, setEndDate,
  className = ""
}: DateRangePickerProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 bg-[var(--color-bg-surface)] border border-[var(--color-border-main)] rounded-xl p-1.5 focus-within:border-[var(--color-accent-gold)] focus-within:ring-1 focus-within:ring-[var(--color-accent-gold)] transition-all ${className}`}>
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-[var(--color-text-muted)] ml-2" />
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="bg-transparent border-none text-white text-sm font-bold focus:ring-0 outline-none pr-4 py-2 cursor-pointer [color-scheme:dark]"
        >
          <option value="today" className="bg-[var(--color-bg-surface)] text-white">Hôm nay</option>
          <option value="yesterday" className="bg-[var(--color-bg-surface)] text-white">Hôm qua</option>
          <option value="7days" className="bg-[var(--color-bg-surface)] text-white">7 ngày qua</option>
          <option value="thisMonth" className="bg-[var(--color-bg-surface)] text-white">Tháng này</option>
          <option value="lastMonth" className="bg-[var(--color-bg-surface)] text-white">Tháng trước</option>
          <option value="custom" className="bg-[var(--color-bg-surface)] text-white">Tùy chỉnh</option>
          <option value="all" className="bg-[var(--color-bg-surface)] text-white">Tất cả thời gian</option>
        </select>
      </div>

      {dateFilter === 'custom' && (
        <div className="flex items-center gap-2 border-l border-[var(--color-border-main)] pl-3 animate-in fade-in slide-in-from-left-2 duration-300">
          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-medium rounded-lg px-2 py-1 focus:border-[var(--color-accent-gold)] outline-none cursor-pointer [color-scheme:dark] transition-colors"
          />
          <span className="text-[var(--color-text-muted)] text-xs">→</span>
          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white/10 hover:bg-white/20 border border-white/10 text-white text-xs font-medium rounded-lg px-2 py-1 focus:border-[var(--color-accent-gold)] outline-none cursor-pointer [color-scheme:dark] transition-colors"
          />
        </div>
      )}
    </div>
  );
}

export function getDateRangeStrings(filter: string, startStr: string, endStr: string): { start: string, end: string } {
  const now = new Date();
  
  if (filter === 'all') {
    return { start: '1970-01-01', end: '2099-12-31' };
  }
  
  if (filter === 'custom') {
    return { start: startStr, end: endStr };
  }

  const d = new Date(now);
  let start = new Date(d);
  let end = new Date(d);

  if (filter === 'today') {
    // start and end are today
  } else if (filter === 'yesterday') {
    start.setDate(d.getDate() - 1);
    end = new Date(start);
  } else if (filter === '7days') {
    start.setDate(d.getDate() - 7);
  } else if (filter === 'thisMonth') {
    start = new Date(d.getFullYear(), d.getMonth(), 1);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 0); // last day
  } else if (filter === 'lastMonth') {
    start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    end = new Date(d.getFullYear(), d.getMonth(), 0); // last day
  }

  const fmt = (dt: Date) => dt.toISOString().split('T')[0];
  return { start: fmt(start), end: fmt(end) };
}
