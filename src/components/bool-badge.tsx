import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact yes/no indicator for compliance-style booleans. */
export function BoolBadge({
  value,
  yes = "Yes",
  no = "No",
}: {
  value: boolean;
  yes?: string;
  no?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        value
          ? "bg-success/15 text-success"
          : "bg-muted text-muted-foreground",
      )}
    >
      {value ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {value ? yes : no}
    </span>
  );
}
