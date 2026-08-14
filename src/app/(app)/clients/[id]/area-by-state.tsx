"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CROP_LABELS } from "@/lib/enums";
import { acresToHectares, hectaresToAcres, formatNumber } from "@/lib/utils";
import type { Crop } from "@prisma/client";
import { setClientSeasonAreas } from "../actions";

type RegionRef = { id: string; name: string };
export type AreaRow = {
  crop: Crop;
  regionId: string;
  enrolledAcres: number | null;
  enrolledHectares: number | null;
};

type Cell = { acres: string; hectares: string };

const s = (n: number | null | undefined) => (n == null ? "" : String(n));
const num = (v: string) =>
  v === "" || Number.isNaN(Number(v)) ? null : Number(v);
const cellKey = (crop: string, regionId: string) => `${crop}|${regionId}`;

/**
 * Enrolled area for every crop x state combination this grower runs.
 * These rows are the atomic unit behind every area figure — the grower total,
 * per-crop and per-state KPIs, and each allotment's roll-up.
 */
export function AreaByCropState({
  clientSeasonId,
  crops,
  regions,
  initialAreas,
  onSaved,
}: {
  clientSeasonId: string;
  crops: Crop[];
  regions: RegionRef[];
  initialAreas: AreaRow[];
  /** Reports the newly-saved grower totals so the Enrollment summary tracks. */
  onSaved?: (totals: { acres: number; hectares: number }) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [cells, setCells] = useState<Record<string, Cell>>(() => {
    const map: Record<string, Cell> = {};
    for (const a of initialAreas) {
      map[cellKey(a.crop, a.regionId)] = {
        acres: s(a.enrolledAcres),
        hectares: s(a.enrolledHectares),
      };
    }
    return map;
  });

  const get = (crop: string, regionId: string): Cell =>
    cells[cellKey(crop, regionId)] ?? { acres: "", hectares: "" };

  function onAcres(crop: string, regionId: string, v: string) {
    const n = num(v);
    setCells((c) => ({
      ...c,
      [cellKey(crop, regionId)]: {
        acres: v,
        hectares: n == null ? "" : s(acresToHectares(n)),
      },
    }));
    setSavedAt(null);
  }
  function onHectares(crop: string, regionId: string, v: string) {
    const n = num(v);
    setCells((c) => ({
      ...c,
      [cellKey(crop, regionId)]: {
        acres: n == null ? "" : s(hectaresToAcres(n)),
        hectares: v,
      },
    }));
    setSavedAt(null);
  }

  // Roll-ups: per crop, per state, and the grower total — all from the grid.
  const totals = useMemo(() => {
    const byCrop = new Map<string, number>();
    const byRegion = new Map<string, number>();
    let all = 0;
    for (const crop of crops) {
      for (const r of regions) {
        const ha = num(get(crop, r.id).hectares) ?? 0;
        if (!ha) continue;
        byCrop.set(crop, (byCrop.get(crop) ?? 0) + ha);
        byRegion.set(r.id, (byRegion.get(r.id) ?? 0) + ha);
        all += ha;
      }
    }
    return { byCrop, byRegion, all };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, crops, regions]);

  function save() {
    setError(null);
    const rows = crops.flatMap((crop) =>
      regions.map((r) => {
        const c = get(crop, r.id);
        return {
          crop,
          regionId: r.id,
          enrolledAcres: num(c.acres),
          enrolledHectares: num(c.hectares),
        };
      }),
    );
    startTransition(async () => {
      const res = await setClientSeasonAreas(clientSeasonId, rows);
      if (!res.ok) return setError(res.error);
      setSavedAt(Date.now());
      onSaved?.({
        acres: rows.reduce((n, r) => n + (r.enrolledAcres ?? 0), 0),
        hectares: rows.reduce((n, r) => n + (r.enrolledHectares ?? 0), 0),
      });
      router.refresh();
    });
  }

  if (crops.length === 0 || regions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enrolled area by crop &amp; state</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {crops.length === 0
              ? "Pick this season's crops above to enter area."
              : "This grower has no states yet — add them on the grower identity (Edit identity → Regions)."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Enrolled area by crop &amp; state
        </CardTitle>
        <CardDescription>
          One row per crop × state. Totals roll up by crop, by state and for the
          grower, and each row feeds the matching allotment. Delivered area
          follows the execution pipeline — no separate entry.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="w-[22%] pb-2 pr-3 font-medium">Crop</th>
                <th className="w-[28%] pb-2 pr-3 font-medium">State / region</th>
                <th className="pb-2 pr-3 font-medium">Enrolled (ac)</th>
                <th className="pb-2 font-medium">Enrolled (ha)</th>
              </tr>
            </thead>
            <tbody>
              {crops.map((crop) => (
                <FragmentRows
                  key={crop}
                  crop={crop}
                  regions={regions}
                  get={get}
                  onAcres={onAcres}
                  onHectares={onHectares}
                  subtotal={totals.byCrop.get(crop) ?? 0}
                  showSubtotal={crops.length > 1 && regions.length > 1}
                />
              ))}
              <tr className="border-t-2 font-semibold">
                <td className="py-2 pr-3" colSpan={3}>
                  Grower total
                </td>
                <td className="py-2 tabular-nums">
                  {formatNumber(totals.all)} ha
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {regions.length > 1 && (
          <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
            By state:{" "}
            {regions
              .map(
                (r) =>
                  `${r.name} ${formatNumber(totals.byRegion.get(r.id) ?? 0)} ha`,
              )
              .join(" · ")}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {savedAt && !error && <p className="text-sm text-success">Saved</p>}
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save area"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FragmentRows({
  crop,
  regions,
  get,
  onAcres,
  onHectares,
  subtotal,
  showSubtotal,
}: {
  crop: Crop;
  regions: RegionRef[];
  get: (crop: string, regionId: string) => Cell;
  onAcres: (crop: string, regionId: string, v: string) => void;
  onHectares: (crop: string, regionId: string, v: string) => void;
  subtotal: number;
  showSubtotal: boolean;
}) {
  return (
    <>
      {regions.map((r, i) => {
        const c = get(crop, r.id);
        return (
          <tr key={`${crop}-${r.id}`} className="border-b last:border-0">
            <td className="py-2 pr-3 font-medium">
              {i === 0 ? CROP_LABELS[crop] : ""}
            </td>
            <td className="py-2 pr-3">{r.name}</td>
            <td className="py-2 pr-3">
              <AreaInput
                value={c.acres}
                onChange={(v) => onAcres(crop, r.id, v)}
              />
            </td>
            <td className="py-2">
              <AreaInput
                value={c.hectares}
                onChange={(v) => onHectares(crop, r.id, v)}
              />
            </td>
          </tr>
        );
      })}
      {showSubtotal && (
        <tr className="border-b bg-muted/30 text-xs">
          <td className="py-1.5 pr-3" colSpan={3}>
            {CROP_LABELS[crop]} subtotal
          </td>
          <td className="py-1.5 tabular-nums">{formatNumber(subtotal)} ha</td>
        </tr>
      )}
    </>
  );
}

function AreaInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step="any"
      className="h-8 w-28"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
