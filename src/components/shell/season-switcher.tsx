"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSelectedSeason } from "@/app/actions/season-cookie";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Season } from "@prisma/client";
import { CalendarRange, Loader2 } from "lucide-react";

export function SeasonSwitcher({
  seasons,
  selectedId,
}: {
  seasons: Pick<Season, "id" | "year" | "label" | "isActive">[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (seasons.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <CalendarRange className="h-4 w-4 text-muted-foreground" />
      )}
      <Select
        value={selectedId ?? undefined}
        onValueChange={(value) => {
          startTransition(async () => {
            await setSelectedSeason(value);
            router.refresh();
          });
        }}
        disabled={pending}
      >
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue placeholder="Select season" />
        </SelectTrigger>
        <SelectContent>
          {seasons.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
              {s.isActive ? " • active" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
