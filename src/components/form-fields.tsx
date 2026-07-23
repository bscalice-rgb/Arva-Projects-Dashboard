"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EnumOption } from "@/lib/enums";

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        inputMode="decimal"
        step={step ?? "any"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  includeEmpty,
  emptyLabel = "None",
  required,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  options: EnumOption<T>[];
  placeholder?: string;
  includeEmpty?: boolean;
  emptyLabel?: string;
  required?: boolean;
}) {
  const EMPTY = "__none__";
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Select
        value={value ? value : includeEmpty ? EMPTY : undefined}
        onValueChange={(v) => onChange(v === EMPTY ? "" : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
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
    </div>
  );
}

import { acresToHectares, hectaresToAcres } from "@/lib/utils";

/**
 * Linked acres/hectares inputs — typing in one auto-fills the other.
 * Either field can still be overridden manually afterwards.
 */
export function LinkedAreaFields({
  label,
  acres,
  hectares,
  onAcres,
  onHectares,
}: {
  label: string;
  acres: string;
  hectares: string;
  onAcres: (v: string) => void;
  onHectares: (v: string) => void;
}) {
  const toStr = (n: number | null) => (n == null ? "" : String(n));
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="Acres"
            value={acres}
            onChange={(e) => {
              const v = e.target.value;
              onAcres(v);
              const n = Number(v);
              onHectares(v === "" || Number.isNaN(n) ? "" : toStr(acresToHectares(n)));
            }}
          />
          <span className="mt-1 block text-xs text-muted-foreground">Acres</span>
        </div>
        <div>
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="Hectares"
            value={hectares}
            onChange={(e) => {
              const v = e.target.value;
              onHectares(v);
              const n = Number(v);
              onAcres(v === "" || Number.isNaN(n) ? "" : toStr(hectaresToAcres(n)));
            }}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Hectares
          </span>
        </div>
      </div>
    </div>
  );
}

/** Multi-select rendered as toggleable chips (good for small option sets). */
export function MultiSelectField<T extends string>({
  label,
  options,
  selected,
  onChange,
  required,
  emptyHint,
}: {
  label: string;
  options: EnumOption<T>[];
  selected: string[];
  onChange: (v: string[]) => void;
  required?: boolean;
  emptyHint?: string;
}) {
  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  }
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {emptyHint ?? "No options available."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const active = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-accent"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1.5">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}
