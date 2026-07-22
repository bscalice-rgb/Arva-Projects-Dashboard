"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Target, Plus, Pencil, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import {
  SelectField,
  TextField,
  CheckboxField,
  LinkedAreaFields,
} from "@/components/form-fields";
import {
  CROP_OPTIONS,
  CROP_LABELS,
  COUNTRY_OPTIONS,
  COUNTRY_LABELS,
} from "@/lib/enums";
import { formatNumber } from "@/lib/utils";
import { toCsv, downloadCsv, type CsvColumn } from "@/lib/csv";
import type { Country, Crop } from "@prisma/client";
import {
  createSupplyShed,
  updateSupplyShed,
  deleteSupplyShed,
} from "./actions";

export type ShedRow = {
  id: string;
  country: Country;
  channelPartnerId: string | null;
  channelPartnerName: string | null;
  crop: Crop;
  region: string | null;
  acresNeeded: number;
  hectaresNeeded: number;
  acresLoaded: number;
  hectaresLoaded: number;
  enteredInCropForce: boolean;
};

type CpOption = { id: string; entityName: string };

const empty = {
  country: "" as Country | "",
  channelPartnerId: "",
  crop: "CORN" as Crop,
  region: "",
  acresNeeded: "",
  hectaresNeeded: "",
  enteredInCropForce: false,
};

export function SupplyShedsClient({
  rows,
  channelPartners,
  seasonId,
  seasonLabel,
}: {
  rows: ShedRow[];
  channelPartners: CpOption[];
  seasonId: string;
  seasonLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<"ac" | "ha">("ac");

  function openCreate() {
    setEditingId(null);
    setForm(empty);
    setError(null);
    setOpen(true);
  }
  function openEdit(r: ShedRow) {
    setEditingId(r.id);
    setForm({
      country: r.country,
      channelPartnerId: r.channelPartnerId ?? "",
      crop: r.crop,
      region: r.region ?? "",
      acresNeeded: String(r.acresNeeded),
      hectaresNeeded: String(r.hectaresNeeded),
      enteredInCropForce: r.enteredInCropForce,
    });
    setError(null);
    setOpen(true);
  }
  function submit() {
    setError(null);
    const payload = {
      country: form.country || undefined,
      channelPartnerId: form.channelPartnerId || null,
      crop: form.crop,
      region: form.region || null,
      acresNeeded: form.acresNeeded,
      hectaresNeeded: form.hectaresNeeded,
      enteredInCropForce: form.enteredInCropForce,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateSupplyShed(editingId, payload)
        : await createSupplyShed(seasonId, payload);
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }
  function onDelete(r: ShedRow) {
    if (!confirm("Delete this supply shed target?")) return;
    startTransition(async () => {
      const res = await deleteSupplyShed(r.id);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.needed += unit === "ac" ? r.acresNeeded : r.hectaresNeeded;
        acc.loaded += unit === "ac" ? r.acresLoaded : r.hectaresLoaded;
        return acc;
      },
      { needed: 0, loaded: 0 },
    );
  }, [rows, unit]);

  function exportCsv() {
    const cols: CsvColumn<ShedRow>[] = [
      { header: "Country", value: (r) => COUNTRY_LABELS[r.country] },
      {
        header: "Channel Partner",
        value: (r) => r.channelPartnerName ?? "Direct",
      },
      { header: "Crop", value: (r) => CROP_LABELS[r.crop] },
      { header: "Region", value: (r) => r.region },
      { header: "Acres needed", value: (r) => Math.round(r.acresNeeded) },
      { header: "Acres loaded", value: (r) => Math.round(r.acresLoaded) },
      {
        header: "Acres balance",
        value: (r) => Math.round(r.acresNeeded - r.acresLoaded),
      },
      { header: "Hectares needed", value: (r) => Math.round(r.hectaresNeeded) },
      { header: "Hectares loaded", value: (r) => Math.round(r.hectaresLoaded) },
      {
        header: "Hectares balance",
        value: (r) => Math.round(r.hectaresNeeded - r.hectaresLoaded),
      },
      { header: "In CropForce", value: (r) => (r.enteredInCropForce ? "Y" : "N") },
    ];
    downloadCsv(
      `supply-sheds-${seasonLabel.replace(/\s+/g, "-").toLowerCase()}.csv`,
      toCsv(rows, cols),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SelectField
            label=""
            value={unit}
            onChange={(v) => setUnit(v as "ac" | "ha")}
            options={[
              { value: "ac", label: "Acres" },
              { value: "ha", label: "Hectares" },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            {seasonLabel} · Needed {formatNumber(totals.needed)} · Loaded{" "}
            {formatNumber(totals.loaded)} · Balance{" "}
            {formatNumber(totals.needed - totals.loaded)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New target
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No supply shed targets"
          description="Define per-season area targets by Channel Partner × crop × country × region. Loaded volume rolls up automatically from delivered client area."
          action={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New target
            </Button>
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel Partner</TableHead>
                <TableHead>Crop</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Region</TableHead>
                <TableHead className="text-right">Needed</TableHead>
                <TableHead className="text-right">Loaded</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-[180px]">Progress</TableHead>
                <TableHead className="text-center">CF</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const needed = unit === "ac" ? r.acresNeeded : r.hectaresNeeded;
                const loaded = unit === "ac" ? r.acresLoaded : r.hectaresLoaded;
                const balance = needed - loaded;
                const pct = needed > 0 ? (loaded / needed) * 100 : 0;
                const over = balance < 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.channelPartnerName ?? (
                        <Badge variant="muted">Direct</Badge>
                      )}
                    </TableCell>
                    <TableCell>{CROP_LABELS[r.crop]}</TableCell>
                    <TableCell>{COUNTRY_LABELS[r.country]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.region ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(needed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(loaded)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        over ? "text-success" : ""
                      }`}
                    >
                      {formatNumber(balance)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress
                          value={Math.min(pct, 100)}
                          indicatorClassName={over ? "bg-success" : undefined}
                        />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {Math.round(pct)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.enteredInCropForce ? "✓" : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit supply shed target" : "New supply shed target"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <SelectField
              label="Channel Partner"
              value={form.channelPartnerId || undefined}
              onChange={(v) => setForm((f) => ({ ...f, channelPartnerId: v }))}
              options={channelPartners.map((cp) => ({
                value: cp.id,
                label: cp.entityName,
              }))}
              includeEmpty
              emptyLabel="Direct (no CP)"
            />
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Crop"
                value={form.crop}
                onChange={(v) => setForm((f) => ({ ...f, crop: v as Crop }))}
                options={CROP_OPTIONS}
              />
              <SelectField
                label="Country"
                required
                value={form.country || undefined}
                onChange={(v) =>
                  setForm((f) => ({ ...f, country: v as Country }))
                }
                options={COUNTRY_OPTIONS}
              />
            </div>
            <TextField
              label="Region / Province"
              value={form.region}
              onChange={(v) => setForm((f) => ({ ...f, region: v }))}
              placeholder="Match clients' region exactly"
            />
            <LinkedAreaFields
              label="Area needed (target)"
              acres={form.acresNeeded}
              hectares={form.hectaresNeeded}
              onAcres={(v) => setForm((f) => ({ ...f, acresNeeded: v }))}
              onHectares={(v) => setForm((f) => ({ ...f, hectaresNeeded: v }))}
            />
            <CheckboxField
              label="Entered in CropForce"
              checked={form.enteredInCropForce}
              onChange={(v) => setForm((f) => ({ ...f, enteredInCropForce: v }))}
            />
            <p className="text-xs text-muted-foreground">
              Loaded volume is computed automatically from the delivered area of
              matching client-season records.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
