import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export function NoSeason() {
  return (
    <EmptyState
      icon={CalendarRange}
      title="No program year yet"
      description="Create a season to start tracking growers, channel partners and supply sheds."
      action={
        <Button asChild>
          <Link href="/seasons">Create a season</Link>
        </Button>
      }
    />
  );
}
