/**
 * Skeleton loader components for Heritage.
 * Use instead of LoadingSpinner when content has a known shape.
 */

import { cn } from "@/lib/utils";

// ─── Base pulse block ─────────────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-heritage-sand/60",
        className
      )}
    />
  );
}

// ─── Card skeleton ────────────────────────────────────────────────────────────

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-heritage-sand bg-heritage-white p-5 space-y-3 shadow-[0_2px_12px_rgba(74,55,40,0.04)]">
      <Skeleton className="h-5 w-40" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
}

// ─── Person card skeleton ─────────────────────────────────────────────────────

export function PersonCardSkeleton() {
  return (
    <div className="rounded-xl border border-heritage-sand bg-heritage-white p-4 flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full shrink-0" />
    </div>
  );
}

// ─── Table row skeleton ───────────────────────────────────────────────────────

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-heritage-sand/40">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={`h-4 ${i === 0 ? "w-28" : i === cols - 1 ? "w-12" : "w-20"}`} />
        </td>
      ))}
    </tr>
  );
}

// ─── Media grid skeleton ──────────────────────────────────────────────────────

export function MediaGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="break-inside-avoid">
          <Skeleton className={`rounded-xl ${i % 3 === 0 ? "aspect-square" : i % 3 === 1 ? "aspect-[3/4]" : "aspect-[4/3]"}`} />
        </div>
      ))}
    </div>
  );
}

// ─── Stat card skeleton ───────────────────────────────────────────────────────

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-heritage-sand bg-heritage-white p-5 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

// ─── Timeline skeleton ────────────────────────────────────────────────────────

export function TimelineSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4 pl-4 border-l-2 border-heritage-sand">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-1.5 ml-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
      ))}
    </div>
  );
}
