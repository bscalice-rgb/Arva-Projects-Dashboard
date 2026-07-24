import { Skeleton } from "@/components/ui/skeleton";

// Shown instantly while any page under the app shell server-renders, so a
// click always gives immediate visual feedback instead of a frozen screen.
export default function Loading() {
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
