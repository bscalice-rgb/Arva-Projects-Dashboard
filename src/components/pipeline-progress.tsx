"use client";

import { getPipelineStatus, type PipelineInput } from "@/lib/pipeline";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PipelineProgress({
  cs,
  className,
}: {
  cs: PipelineInput;
  className?: string;
}) {
  const status = getPipelineStatus(cs);
  const pct = Math.round(status.percentComplete * 100);

  return (
    <div className={cn("min-w-[150px] space-y-1", className)}>
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant={status.isComplete ? "success" : "muted"}
          className="whitespace-nowrap"
        >
          {status.currentStageShort}
        </Badge>
        <span className="text-xs tabular-nums text-muted-foreground">
          {pct}%
        </span>
      </div>
      <Progress
        value={pct}
        indicatorClassName={status.isComplete ? "bg-success" : undefined}
      />
    </div>
  );
}
