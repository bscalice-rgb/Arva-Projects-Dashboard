import { ListPageSkeleton } from "@/components/page-skeleton";

// Shown instantly while any page under the app shell server-renders, so a
// click always gives immediate visual feedback instead of a frozen screen.
// Nested routes (clients/[id], channel-partners/[id], …) have their own
// loading files because this boundary doesn't re-trigger for navigations
// that only change a deeper segment.
export default function Loading() {
  return <ListPageSkeleton />;
}
