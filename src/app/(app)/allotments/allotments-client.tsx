"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  Download,
  ChevronsUpDown,
} from "lucide-react";
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
  clientId: string | null;
  clientName: string | null;
  crop: Crop;
  regionId: string | null;
  regionName: string | null;
  acresNeeded: number;
  hectaresNeeded: number;
  acresLoaded: number;
  hectaresLoaded: number;
  enteredInCropForce: boolean;
};

type CpOption = { id: string; entityName: string };
type GrowerOption = { id: string; name: string; country: Country };
type RegionOption = { id: string; name: string; country: Country };

const empty = {
  country: "" as Country | "",
  channelPartnerId: "",
  clientId: "",
  crop: "CORN" as Crop,
  regionId: "",
  acresNeeded: "",
  hectaresNeeded: "",
  enteredInCropForce: false,
};

const DIRECT = "__direct__";

type SortKey = "cp" | "crop" | "country" | "region";

export function AllotmentsClient({
  rows,
  channelPartners,
  directGrowers,
  regions,
  seasonId,
  seasonLabel,
}: {
  rows: ShedRow[];
  channelPartners: CpOption[];
  directGrowers: GrowerOption[];
  regions: RegionOption[];
  seasonId: string;
  seasonLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);
  const [unit, setUnit] = useState<"ac" | "ha">("ac");

  // Column filters + sort
  const [fCp, setFCp] = useState(""); // "", DIRECT, or CP name
  const [fCrop, setFCrop] = useState("");
  const [fCountry, setFCountry] = useState("");
  const [fRegion, setFRegion] = useState(""); // region name
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function openCreate() {
    setEditingId(null);
    setForm(empty);
    setError(null);
    setAddedCount(0);
    setOpen(true);
  }
  function openEdit(r: ShedRow) {
    setEditingId(r.id);
    setForm({
      country: r.country,
      channelPartnerId: r.channelPartnerId ?? "",
      clientId: r.clientId ?? "",
      crop: r.crop,
      regionId: r.regionId ?? "",
      acresNeeded: String(r.acresNeeded),
      hectaresNeeded: String(r.hectaresNeeded),
      enteredInCropForce: r.enteredInCropForce,
    });
    setError(null);
    setAddedCount(0);
    setOpen(true);
  }
  function submit(addAnother = false) {
    setError(null);
    const payload = {
      country: form.country || undefined,
      channelPartnerId: form.channelPartnerId || null,
      clientId: form.channelPartnerId ? null : form.clientId || null,
      crop: form.crop,
      regionId: form.regionId || null,
      acresNeeded: form.acresNeeded,
      hectaresNeeded: form.hectaresNeeded,
      enteredInCropForce: form.enteredInCropForce,
    };
    startTransition(async () => {
      const res = editingId
        ? await updateSupplyShed(editingId, payload)
        : await createSupplyShed(seasonId, payload);
      if (!res.ok) return setError(res.error);
      if (addAnother) {
        // Keep the targeting fields for fast batch entry; clear the volumes.
        setForm((f) => ({
          ...f,
          acresNeeded: "",
          hectaresNeeded: "",
          enteredInCropForce: false,
        }));
        setAddedCount((n) => n + 1);
        router.refresh();
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }
  function onDelete(r: ShedRow) {
    if (!confirm("Delete this allotment?")) return;
    startTransition(async () => {
      const res = await deleteSupplyShed(r.id);
      if (!res.ok) alert(res.error);
      else router.refresh();
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const cpDisplay = (r: ShedRow) =>
    r.channelPartnerName ?? (r.clientName ? `Direct · ${r.clientName}` : "Direct");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (fCp === DIRECT && r.channelPartnerName != null) return false;
      if (fCp && fCp !== DIRECT && r.channelPartnerName !== fCp) return false;
      if (fCrop && r.crop !== fCrop) return false;
      if (fCountry && r.country !== fCountry) return false;
      if (fRegion && (r.regionName ?? "—") !== fRegion) return false;
      return true;
    });
  }, [rows, fCp, fCrop, fCountry, fRegion]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const dir = sortDir === "asc" ? 1 : -1;
    const val = (r: ShedRow): string => {
      switch (sortKey) {
        case "cp":
          return cpDisplay(r).toLowerCase();
        case "crop":
          return CROP_LABELS[r.crop].toLowerCase();
        case "country":
          return COUNTRY_LABELS[r.country].toLowerCase();
        case "region":
          return (r.regionName ?? "").toLowerCase();
        default:
          return "";
      }
    };
    return [...filtered].sort((a, b) => val(a).localeCompare(val(b)) * dir);
  }, [filtered, sortKey, sortDir]);

  // Filter options derived from the data actually present.
  const cpFilterOptions = useMemo(() => {
    const names = [
      ...new Set(rows.map((r) => r.channelPartnerName).filter(Boolean)),
    ] as string[];
    return [
      { value: DIRECT, label: "Direct (no CP)" },
      ...names.sort().map((n) => ({ value: n, label: n })),
    ];
  }, [rows]);
  const regionFilterOptions = useMemo(() => {
    const names = [...new Set(rows.map((r) => r.regionName ?? "—"))];
    return names.sort().map((n) => ({ value: n, label: n }));
  }, [rows]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.needed += unit === "ac" ? r.acresNeeded : r.hectaresNeeded;
        acc.loaded += unit === "ac" ? r.acresLoaded : r.hectaresLoaded;
        return acc;
      },
      { needed: 0, loaded: 0 },
    );
  }, [filtered, unit]);

  function exportCsv() {
    const cols: CsvColumn<ShedRow>[] = [
      { header: "Country", value: (r) => COUNTRY_LABELS[r.country] },
      { header: "Channel Partner", value: (r) => cpDisplay(r) },
      { header: "Crop", value: (r) => CROP_LABELS[r.crop] },
      { header: "Region", value: (r) => r.regionName },
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
      `allotments-${seasonLabel.replace(/\s+/g, "-").toLowerCase()}.csv`,
      toCsv(sorted, cols),
    );
  }

  const isDirect = !form.channelPartnerId;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SelectField
          label=""
          value={fCp || undefined}
          onChange={setFCp}
          options={cpFilterOptions}
          includeEmpty
          emptyLabel="All CP / Direct"
          placeholder="All CP / Direct"
        />
        <SelectField
          label=""
          value={fCrop || undefined}
          onChange={setFCrop}
          options={CROP_OPTIONS}
          includeEmpty
          emptyLabel="All crops"
          placeholder="All crops"
        />
        <SelectField
          label=""
          value={fCountry || undefined}
          onChange={setFCountry}
          options={COUNTRY_OPTIONS}
          includeEmpty
          emptyLabel="All countries"
          placeholder="All countries"
        />
        <SelectField
          label=""
          value={fRegion || undefined}
          onChange={setFRegion}
          options={regionFilterOptions}
          includeEmpty
          emptyLabel="All regions"
          placeholder="All regions"
        />
        <SelectField
          label=""
          value={unit}
          onChange={(v) => setUnit(v as "ac" | "ha")}
          options={[
            { value: "ac", label: "Acres" },
            { value: "ha", label: "Hectares" },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {rows.length} · {seasonLabel} · Needed{" "}
          {formatNumber(totals.needed)} · Loaded {formatNumber(totals.loaded)} ·
          Balance {formatNumber(totals.needed - totals.loaded)}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!sorted.length}>
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
          title="No allotments yet"
          description="Define per-season area targets by Channel Partner × crop × country × region. Loaded volume rolls up automatically from delivered grower area."
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
                <TableHead>
                  <SortHead
                    label="Channel Partner"
                    active={sortKey === "cp"}
                    dir={sortDir}
                    onClick={() => toggleSort("cp")}
                  />
                </TableHead>
                <TableHead>
                  <SortHead
                    label="Crop"
                    active={sortKey === "crop"}
                    dir={sortDir}
                    onClick={() => toggleSort("crop")}
                  />
                </TableHead>
                <TableHead>
                  <SortHead
                    label="Country"
                    active={sortKey === "country"}
                    dir={sortDir}
                    onClick={() => toggleSort("country")}
                  />
                </TableHead>
                <TableHead>
                  <SortHead
                    label="Region"
                    active={sortKey === "region"}
                    dir={sortDir}
                    onClick={() => toggleSort("region")}
                  />
                </TableHead>
                <TableHead className="text-right">Needed</TableHead>
                <TableHead className="text-right">Loaded</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="w-[180px]">Progress</TableHead>
                <TableHead className="text-center">CF</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => {
                const needed = unit === "ac" ? r.acresNeeded : r.hectaresNeeded;
                const loaded = unit === "ac" ? r.acresLoaded : r.hectaresLoaded;
                const balance = needed - loaded;
                const pct = needed > 0 ? (loaded / needed) * 100 : 0;
                const over = balance < 0;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.channelPartnerName ?? (
                        <span className="flex items-center gap-1.5">
                          <Badge variant="muted">Direct</Badge>
                          {r.clientName && (
                            <span className="text-sm">{r.clientName}</span>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{CROP_LABELS[r.crop]}</TableCell>
                    <TableCell>{COUNTRY_LABELS[r.country]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.regionName ?? "—"}
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
              {editingId ? "Edit allotment" : "New allotment"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <SelectField
              label="Channel Partner"
              value={form.channelPartnerId || undefined}
              onChange={(v) =>
                setForm((f) => ({ ...f, channelPartnerId: v, clientId: "" }))
              }
              options={channelPartners.map((cp) => ({
                value: cp.id,
                label: cp.entityName,
              }))}
              includeEmpty
              emptyLabel="Direct (no CP)"
            />
            {isDirect && (
              <div>
                <SelectField
                  label="Grower (direct sourcing)"
                  value={form.clientId || undefined}
                  onChange={(v) => setForm((f) => ({ ...f, clientId: v }))}
                  options={directGrowers.map((g) => ({
                    value: g.id,
                    label: `${g.name} — ${COUNTRY_LABELS[g.country]}`,
                  }))}
                  includeEmpty
                  emptyLabel="Any direct grower"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Direct means the acres are sourced straight from the grower,
                  with no Channel Partner in between. Pick a grower to pin this
                  target to them, or leave as “Any direct grower”.
                </p>
              </div>
            )}
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
                  setForm((f) => ({
                    ...f,
                    country: v as Country,
                    regionId: "",
                  }))
                }
                options={COUNTRY_OPTIONS}
              />
            </div>
            <SelectField
              label="Region / state"
              value={form.regionId || undefined}
              onChange={(v) => setForm((f) => ({ ...f, regionId: v }))}
              includeEmpty
              emptyLabel="All regions in country"
              options={regions
                .filter((rg) => rg.country === form.country)
                .map((rg) => ({ value: rg.id, label: rg.name }))}
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
            {addedCount > 0 && !error && (
              <p className="text-sm text-success">
                {addedCount} allotment{addedCount === 1 ? "" : "s"} added — keep
                going or close.
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {addedCount > 0 ? "Done" : "Cancel"}
            </Button>
            {!editingId && (
              <Button
                variant="secondary"
                onClick={() => submit(true)}
                disabled={pending}
              >
                {pending ? "Saving…" : "Save & add another"}
              </Button>
            )}
            <Button onClick={() => submit(false)} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 hover:text-foreground ${
        active ? "text-foreground" : ""
      }`}
    >
      {label}
      <ChevronsUpDown className="h-3 w-3 opacity-60" />
      {active && (
        <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>
      )}
    </button>
  );
}
