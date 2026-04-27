import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

export function getMilestone(logs: any[], actionType: string, position: 'first' | 'last') {
  if (!logs || !logs.length) return undefined;
  if (position === 'first') {
    return logs.find(log => log.action === actionType);
  } else {
    // Reverse mutates the array, so we copy it first, or use a loop.
    for (let i = logs.length - 1; i >= 0; i--) {
      if (logs[i].action === actionType) return logs[i];
    }
    return undefined;
  }
}

export type DateRange = 'today' | 'yesterday' | '7days' | 'thisMonth' | 'lastMonth' | 'all' | 'custom';

export function isDateInRange(timestamp: number, range: DateRange, customStart?: string, customEnd?: string) {
  if (range === 'all') return true;
  
  const date = new Date(timestamp);
  const now = new Date();
  
  const isSameDay = (d1: Date, d2: Date) => 
    d1.getDate() === d2.getDate() && 
    d1.getMonth() === d2.getMonth() && 
    d1.getFullYear() === d2.getFullYear();

  if (range === 'today') {
    return isSameDay(date, now);
  }
  if (range === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return isSameDay(date, yesterday);
  }
  if (range === '7days') {
    const last7Days = new Date(now);
    last7Days.setHours(0, 0, 0, 0);
    last7Days.setDate(now.getDate() - 7);
    return date.getTime() >= last7Days.getTime();
  }
  if (range === 'thisMonth') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  if (range === 'lastMonth') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
  }
  if (range === 'custom' && customStart && customEnd) {
    const [sYear, sMonth, sDay] = customStart.split('-').map(Number);
    const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
    
    const [eYear, eMonth, eDay] = customEnd.split('-').map(Number);
    const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
    
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
  }
  return true;
}

/**
 * Strip POS code prefix như "S3P", "S1P", "S2P", v.v.
 * VD: "S3P2146446156" → "2146446156"
 */
export function normalizePosCode(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).trim();
  return s.replace(/^S\d+P/i, '');
}
