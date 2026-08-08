import React from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type PageSkeletonVariant = 'checklist' | 'dashboard' | 'workspace';

interface PageSkeletonProps {
  variant: PageSkeletonVariant;
  className?: string;
}

function HeaderSkeleton() {
  return (
    <div className="grid gap-3">
      <Skeleton className="h-3 w-20 rounded-full" />
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}

function ListRowSkeleton() {
  return (
    <div className="grid gap-2 border-b border-border p-4 last:border-b-0 sm:grid-cols-[2.5rem_minmax(0,1fr)]">
      <Skeleton className="h-4 w-6 rounded-md" />
      <div className="grid gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-full max-w-sm" />
      </div>
    </div>
  );
}

export function PageSkeleton({ variant, className }: PageSkeletonProps) {
  switch (variant) {
    case 'checklist':
      return (
        <section
          aria-busy="true"
          aria-label="Loading"
          className={cn('mx-auto grid w-full max-w-3xl gap-8', className)}
        >
          <HeaderSkeleton />
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <ListRowSkeleton />
            <ListRowSkeleton />
            <ListRowSkeleton />
            <ListRowSkeleton />
          </div>
        </section>
      );
    case 'dashboard':
      return (
        <section
          aria-busy="true"
          aria-label="Loading"
          className={cn('mx-auto grid w-full max-w-5xl gap-8', className)}
        >
          <HeaderSkeleton />
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="-m-px grid grid-cols-2 sm:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  className={cn(
                    'grid gap-2 border border-border bg-card p-4',
                    index === 4 && 'max-sm:col-span-2'
                  )}
                  key={index}
                >
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-12" />
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
            <div className="grid gap-3 border-b border-border p-4 sm:flex sm:gap-4">
              <Skeleton className="h-4 w-16 sm:w-28" />
              <div className="grid min-w-0 flex-1 gap-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
            <div className="grid gap-2 p-4 sm:flex sm:gap-4">
              <Skeleton className="h-4 w-16 sm:w-28" />
              <div className="grid min-w-0 flex-1 gap-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-full max-w-md" />
              </div>
            </div>
          </div>
        </section>
      );
    case 'workspace':
      return (
        <section aria-busy="true" aria-label="Loading" className={cn('grid gap-6', className)}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <HeaderSkeleton />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="grid gap-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
            <Skeleton className="hidden h-80 w-full lg:block" />
          </div>
        </section>
      );
    default: {
      const _exhaustive: never = variant;
      return _exhaustive;
    }
  }
}
