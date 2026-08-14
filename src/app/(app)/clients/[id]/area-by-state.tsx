"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

/** One editable line: a specific crop + state pairing and its area. */
type Line = {
  uid: string;
  crop: Crop | "";
  regionId: string;
  acres: string;
  hectares: string;
};

const s = (n: number | null | undefined) => (n == null ? "" : String(n));
const num = (v: string) =>
  v === "" || Number.isNaN(Number(v)) ? null : Number(v);
let uidSeq = 0;
const nextUid = () => `line-${uidSeq++}`;

/**
 * Enrolled area for the specific crop x state combinations a grower actually
 * runs — combinations are added one by one, not every crop against every
 * state. Each line is the atomic unit behind the grower total, the per-crop
 * and per-state roll-ups, and each allotment's loaded volume.
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

  const [lines, setLines] = useState<Line[]>(() =>
    initialAreas.map((a) => ({
      uid: nextUid(),
      crop: a.crop,
      regionId: a.regionId,
      acres: s(a.enrolledAcres),
      hectares: s(a.enrolledHectares),
    })),
  );

  // Offer any crop/state already saved on a line, even if it was later removed
  // from the season's crops or the grower's regions — otherwise an existing
  // row would be unreadable and impossible to clean up.
  const cropOptions = useMemo(() => {
    const set = new Set<Crop>(crops);
    for (const a of initialAreas) set.add(a.crop);
    return [...set];
  }, [crops, initialAreas]);

  const regionOptions = useMemo(() => {
    const known = new Map(regions.map((r) => [r.id, r.name]));
    for (const a of initialAreas) {
      if (!known.has(a.regionId)) known.set(a.regionId, "(removed state)");
    }
    return [...known].map(([id, name]) => ({ id, name }));
  }, [regions, initialAreas]);

  function update(uid: string, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
    setSavedAt(null);
    setError(null);
  }
  function onAcres(uid: string, v: string) {
    const n = num(v);
    update(uid, { acres: v, hectares: n == null ? "" : s(acresToHectares(n)) });
  }
  function onHectares(uid: string, v: string) {
    const n = num(v);
    update(uid, { hectares: v, acres: n == null ? "" : s(hectaresToAcres(n)) });
  }
  function addLine() {
    setLines((ls) => [
      ...ls,
      {
        uid: nextUid(),
        crop: cropOptions.length === 1 ? cropOptions[0] : "",
        regionId: regionOptions.length === 1 ? regionOptions[0].id : "",
        acres: "",
        hectares: "",
      },
    ]);
    setSavedAt(null);
  }
  function removeLine(uid: string) {
    setLines((ls) => ls.filter((l) => l.uid !== uid));
    setSavedAt(null);
    setError(null);
  }

  // A combination may only appear once — the stored rows are keyed on it.
  const duplicateUids = useMemo(() => {
    const seen = new Map<string, string>();
    const dupes = new Set<string>();
    for (const l of lines) {
      if (!l.crop || !l.regionId) continue;
      const key = `${l.crop}|${l.regionId}`;
      const first = seen.get(key);
      if (first) {
        dupes.add(first);
        dupes.add(l.uid);
      } else {
        seen.set(key, l.uid);
      }
    }
    return dupes;
  }, [lines]);

  // Roll-ups: per crop, per state, and the grower total.
  const totals = useMemo(() => {
    const byCrop = new Map<string, number>();
    const byRegion = new Map<string, number>();
    let all = 0;
    for (const l of lines) {
      const ha = num(l.hectares) ?? 0;
      if (!ha) continue;
      if (l.crop) byCrop.set(l.crop, (byCrop.get(l.crop) ?? 0) + ha);
      if (l.regionId)
        byRegion.set(l.regionId, (byRegion.get(l.regionId) ?? 0) + ha);
      all += ha;
    }
    return { byCrop, byRegion, all };
  }, [lines]);

  const regionName = (id: string) =>
    regionOptions.find((r) => r.id === id)?.name ?? id;

  function save() {
    setError(null);
    if (duplicateUids.size > 0) {
      return setError(
        "The same crop + state appears more than once. Combine or remove the duplicate lines.",
      );
    }
    const incomplete = lines.some(
      (l) =>
        (!l.crop || !l.regionId) && (num(l.acres) != null || num(l.hectares) != null),
    );
    if (incomplete) {
      return setError("Pick both a crop and a state on every line with an area.");
    }
    const rows = lines
      .filter((l) => l.crop && l.regionId)
      .map((l) => ({
        crop: l.crop as Crop,
        regionId: l.regionId,
        enrolledAcres: num(l.acres),
        enrolledHectares: num(l.hectares),
      }));
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

  const canAdd = cropOptions.length > 0 && regionOptions.length > 0;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">
            Enrolled area by crop &amp; state
          </CardTitle>
          <CardDescription>
            Add only the crop + state combinations this grower actually runs.
            Totals roll up by crop, by state and for the grower, and each line
            feeds the matching allotment. Delivered area follows the execution
            pipeline — no separate entry.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={addLine} disabled={!canAdd}>
          <Plus className="h-4 w-4" /> Add combination
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canAdd ? (
          <p className="text-sm text-muted-foreground">
            {cropOptions.length === 0
              ? "Pick this season's crops above to enter area."
              : "This grower has no states yet — add them under Edit identity → Regions."}
          </p>
        ) : lines.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No crop × state combinations yet.
            </p>
            <Button size="sm" className="mt-3" onClick={addLine}>
              <Plus className="h-4 w-4" /> Add combination
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="w-[26%] pb-2 pr-3 font-medium">Crop</th>
                    <th className="w-[26%] pb-2 pr-3 font-medium">
                      State / region
                    </th>
                    <th className="pb-2 pr-3 font-medium">Enrolled (ac)</th>
                    <th className="pb-2 pr-3 font-medium">Enrolled (ha)</th>
                    <th className="w-[44px] pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => {
                    const dupe = duplicateUids.has(l.uid);
                    return (
                      <tr
                        key={l.uid}
                        className={`border-b last:border-0 ${
                          dupe ? "bg-destructive/5" : ""
                        }`}
                      >
                        <td className="py-2 pr-3">
                          <Select
                            value={l.crop}
                            onValueChange={(v) =>
                              update(l.uid, { crop: v as Crop })
                            }
                          >
                            <SelectTrigger
                              className={`h-8 ${dupe ? "border-destructive" : ""}`}
                            >
                              <SelectValue placeholder="Pick crop" />
                            </SelectTrigger>
                            <SelectContent>
                              {cropOptions.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {CROP_LABELS[c]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-3">
                          <Select
                            value={l.regionId}
                            onValueChange={(v) => update(l.uid, { regionId: v })}
                          >
                            <SelectTrigger
                              className={`h-8 ${dupe ? "border-destructive" : ""}`}
                            >
                              <SelectValue placeholder="Pick state" />
                            </SelectTrigger>
                            <SelectContent>
                              {regionOptions.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-3">
                          <AreaInput
                            value={l.acres}
                            onChange={(v) => onAcres(l.uid, v)}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <AreaInput
                            value={l.hectares}
                            onChange={(v) => onHectares(l.uid, v)}
                          />
                        </td>
                        <td className="py-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            title="Remove this combination"
                            onClick={() => removeLine(l.uid)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="border-t-2 font-semibold">
                    <td className="py-2 pr-3" colSpan={3}>
                      Grower total
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatNumber(totals.all)} ha
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>

            {(totals.byCrop.size > 1 || totals.byRegion.size > 1) && (
              <div className="grid gap-2 sm:grid-cols-2">
                {totals.byCrop.size > 1 && (
                  <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                    <span className="font-medium">By crop:</span>{" "}
                    {[...totals.byCrop]
                      .map(
                        ([c, ha]) =>
                          `${CROP_LABELS[c as Crop]} ${formatNumber(ha)} ha`,
                      )
                      .join(" · ")}
                  </div>
                )}
                {totals.byRegion.size > 1 && (
                  <div className="rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
                    <span className="font-medium">By state:</span>{" "}
                    {[...totals.byRegion]
                      .map(
                        ([id, ha]) => `${regionName(id)} ${formatNumber(ha)} ha`,
                      )
                      .join(" · ")}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-end gap-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {savedAt && !error && <p className="text-sm text-success">Saved</p>}
          <Button size="sm" onClick={save} disabled={pending || !canAdd}>
            {pending ? "Saving…" : "Save area"}
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
      className="h-8 w-28"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
