import { Skeleton } from "@/components/ui/skeleton";

/** Instant fallback for list-style pages (header, filters, table, cards). */
export function ListPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      {/* Page header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Filter / action row */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Content block */}
      <div className="space-y-3 rounded-lg border p-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-10/12" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-9/12" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  );
}

/** Instant fallback for detail pages (back link, title, identity, sections). */
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      {/* Back link + title + actions */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-[170px]" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      {/* Identity card */}
      <div className="space-y-4 rounded-lg border p-4">
        <Skeleton className="h-5 w-24" />
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-2 rounded-lg border p-4 lg:col-span-2">
          <Skeleton className="h-5 w-64" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
        <div className="space-y-6">
          <Skeleton className="h-44" />
          <Skeleton className="h-56" />
        </div>
      </div>
    </div>
  );
}
