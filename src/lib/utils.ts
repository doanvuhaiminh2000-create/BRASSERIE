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

export type DateRange = 'today' | 'yesterday' | '7days' | 'all';

export function isDateInRange(timestamp: number, range: DateRange) {
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
  return true;
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

export type DateRange = 'today' | 'yesterday' | '7days' | 'all';

export function isDateInRange(timestamp: number, range: DateRange) {
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
  return true;
}
