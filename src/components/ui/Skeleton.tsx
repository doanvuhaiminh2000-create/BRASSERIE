import React from 'react';
import { cn } from '../../lib/utils';

export function SkeletonLoader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[var(--color-bg-surface)] border border-white/5", className)}
      {...props}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center w-full mb-8">
        <SkeletonLoader className="h-8 w-48" />
        <SkeletonLoader className="h-10 w-64 rounded-xl" />
      </div>

      <div className="flex gap-2 w-full max-w-sm mb-6">
        <SkeletonLoader className="h-10 flex-1 rounded-xl" />
        <SkeletonLoader className="h-10 flex-1 rounded-xl" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonLoader key={i} className="h-28 rounded-2xl" />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <SkeletonLoader className="h-[400px] lg:col-span-2 rounded-2xl" />
         <SkeletonLoader className="h-[400px] rounded-2xl" />
      </div>
    </div>
  );
}

export function AnalysisSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in">
      <SkeletonLoader className="h-10 w-[200px]" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonLoader key={i} className="h-24 rounded-xl" />)}
      </div>
      <SkeletonLoader className="h-[500px] rounded-2xl" />
    </div>
  );
}
