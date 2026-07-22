"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EnumOption } from "@/lib/enums";

export function InlineBool({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-center">
      <Checkbox
        checked={value}
        disabled={disabled}
        onCheckedChange={(v) => onChange(v === true)}
      />
    </div>
  );
}

export function InlineEnum<T extends string>({
  value,
  onChange,
  options,
  includeEmpty,
  emptyLabel = "—",
  disabled,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  options: EnumOption<T>[];
  includeEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const EMPTY = "__none__";
  return (
    <Select
      value={value ? value : includeEmpty ? EMPTY : undefined}
      onValueChange={(v) => onChange(v === EMPTY ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 min-w-[120px] text-xs">
        <SelectValue placeholder={emptyLabel} />
      </SelectTrigger>
      <SelectContent>
        {includeEmpty && <SelectItem value={EMPTY}>{emptyLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
