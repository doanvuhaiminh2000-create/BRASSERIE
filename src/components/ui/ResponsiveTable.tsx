import React from 'react';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { cn } from '../../lib/utils';

export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  hideOnMobile?: boolean;
  primary?: boolean; // hiển thị nổi bật trên mobile card
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string | number;
  emptyText?: string;
}

export function ResponsiveTable<T>({ data, columns, keyExtractor, emptyText = 'Không có dữ liệu' }: ResponsiveTableProps<T>) {
  const { isMobile } = useBreakpoint();
  
  if (data.length === 0) {
    return (
      <div className="p-10 text-center text-[var(--color-text-muted)] italic uppercase tracking-widest text-xs">
        {emptyText}
      </div>
    );
  }
  
  if (isMobile) {
    // Card layout
    return (
      <div className="space-y-2 p-2">
        {data.map(row => (
          <div key={keyExtractor(row)} className="bg-[var(--color-bg-main)] border border-[var(--color-border-main)] rounded-xl p-4">
            {columns.filter(c => !c.hideOnMobile).map(col => (
              <div key={col.key} className={cn("flex justify-between items-center py-1", col.primary && "border-b border-[var(--color-border-main)] pb-2 mb-2")}>
                <span className="text-[10px] uppercase text-[var(--color-text-muted)] font-bold tracking-wider">{col.label}</span>
                <span className={cn("text-sm", col.primary && "text-base font-bold text-white")}>{col.render(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  
  // Desktop table
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-[var(--color-bg-main)]/50">
            {columns.map(col => (
              <th key={col.key} className={cn(
                "p-4 border-b border-[var(--color-border-main)] text-[var(--color-text-muted)] font-medium text-xs uppercase tracking-widest",
                col.align === 'right' && 'text-right',
                col.align === 'center' && 'text-center'
              )}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(row => (
            <tr key={keyExtractor(row)} className="hover:bg-[var(--color-border-main)]/20 transition-colors">
              {columns.map(col => (
                <td key={col.key} className={cn(
                  "p-4 border-b border-[var(--color-border-main)]/50 text-[var(--color-text-main)]",
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center'
                )}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
