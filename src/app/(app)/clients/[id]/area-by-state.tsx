"use client";

import { useState, useTransition } from "react";
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
import { acresToHectares, hectaresToAcres, formatNumber } from "@/lib/utils";
import { setClientSeasonAreas } from "../actions";

type RegionRef = { id: string; name: string };
type AreaRow = {
  regionId: string;
  enrolledAcres: number | null;
  enrolledHectares: number | null;
  deliveredAcres: number | null;
  deliveredHectares: number | null;
};

type Cell = {
  enrolledAcres: string;
  enrolledHectares: string;
  deliveredAcres: string;
  deliveredHectares: string;
};

const s = (n: number | null | undefined) => (n == null ? "" : String(n));
const num = (v: string) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v));

export function AreaByState({
  clientSeasonId,
  regions,
  initialAreas,
}: {
  clientSeasonId: string;
  regions: RegionRef[];
  initialAreas: AreaRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [cells, setCells] = useState<Record<string, Cell>>(() => {
    const map: Record<string, Cell> = {};
    for (const r of regions) {
      const a = initialAreas.find((x) => x.regionId === r.id);
      map[r.id] = {
        enrolledAcres: s(a?.enrolledAcres),
        enrolledHectares: s(a?.enrolledHectares),
        deliveredAcres: s(a?.deliveredAcres),
        deliveredHectares: s(a?.deliveredHectares),
      };
    }
    return map;
  });

  function set(regionId: string, patch: Partial<Cell>) {
    setCells((c) => ({ ...c, [regionId]: { ...c[regionId], ...patch } }));
    setSavedAt(null);
  }

  // Linked acre/hectare edits.
  function onAcres(regionId: string, kind: "enrolled" | "delivered", v: string) {
    const n = num(v);
    const ha = n == null ? "" : s(acresToHectares(n));
    set(
      regionId,
      kind === "enrolled"
        ? { enrolledAcres: v, enrolledHectares: ha }
        : { deliveredAcres: v, deliveredHectares: ha },
    );
  }
  function onHectares(
    regionId: string,
    kind: "enrolled" | "delivered",
    v: string,
  ) {
    const n = num(v);
    const ac = n == null ? "" : s(hectaresToAcres(n));
    set(
      regionId,
      kind === "enrolled"
        ? { enrolledHectares: v, enrolledAcres: ac }
        : { deliveredHectares: v, deliveredAcres: ac },
    );
  }

  const totals = regions.reduce(
    (acc, r) => {
      const c = cells[r.id];
      acc.enrolledHa += num(c.enrolledHectares) ?? 0;
      acc.deliveredHa += num(c.deliveredHectares) ?? 0;
      return acc;
    },
    { enrolledHa: 0, deliveredHa: 0 },
  );

  function save() {
    setError(null);
    const rows = regions.map((r) => {
      const c = cells[r.id];
      return {
        regionId: r.id,
        enrolledAcres: num(c.enrolledAcres),
        enrolledHectares: num(c.enrolledHectares),
        deliveredAcres: num(c.deliveredAcres),
        deliveredHectares: num(c.deliveredHectares),
      };
    });
    startTransition(async () => {
      const res = await setClientSeasonAreas(clientSeasonId, rows);
      if (!res.ok) return setError(res.error);
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Area by state</CardTitle>
        <CardDescription>
          This grower has more than one region — enter enrolled and delivered
          area per state. The grower total is the sum, and each state&apos;s area
          counts toward its own allotment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">State / region</th>
                <th className="pb-2 pr-3 font-medium">Enrolled (ac)</th>
                <th className="pb-2 pr-3 font-medium">Enrolled (ha)</th>
                <th className="pb-2 pr-3 font-medium">Delivered (ac)</th>
                <th className="pb-2 font-medium">Delivered (ha)</th>
              </tr>
            </thead>
            <tbody>
              {regions.map((r) => {
                const c = cells[r.id];
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3">
                      <AreaInput
                        value={c.enrolledAcres}
                        onChange={(v) => onAcres(r.id, "enrolled", v)}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <AreaInput
                        value={c.enrolledHectares}
                        onChange={(v) => onHectares(r.id, "enrolled", v)}
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <AreaInput
                        value={c.deliveredAcres}
                        onChange={(v) => onAcres(r.id, "delivered", v)}
                      />
                    </td>
                    <td className="py-2">
                      <AreaInput
                        value={c.deliveredHectares}
                        onChange={(v) => onHectares(r.id, "delivered", v)}
                      />
                    </td>
                  </tr>
                );
              })}
              <tr className="font-medium">
                <td className="py-2 pr-3">Total</td>
                <td className="py-2 pr-3 text-muted-foreground">—</td>
                <td className="py-2 pr-3 tabular-nums">
                  {formatNumber(totals.enrolledHa)} ha
                </td>
                <td className="py-2 pr-3 text-muted-foreground">—</td>
                <td className="py-2 tabular-nums">
                  {formatNumber(totals.deliveredHa)} ha
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {savedAt && !error && <p className="text-sm text-success">Saved</p>}
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save area by state"}
          </Button>
        </div>
      </CardContent>
    </Card>
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
      className="h-8 w-24"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
