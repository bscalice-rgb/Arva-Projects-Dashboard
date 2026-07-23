"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/stat-card";
import { SelectField } from "@/components/form-fields";
import {
  COUNTRY_LABELS,
  CROP_LABELS,
  COUNTRY_OPTIONS,
  CROP_OPTIONS,
} from "@/lib/enums";
import { PIPELINE_STAGES } from "@/lib/pipeline";
import { formatNumber, formatUsd, formatPercent } from "@/lib/utils";
import { computePayouts } from "@/lib/revenue-share";
import type { RevenueSharePayee } from "@prisma/client";
import { DollarSign, Sprout, Users, TrendingUp } from "lucide-react";
import type { DashClient, DashCp, DashShed } from "./dashboard-types";

type Dim = "cp" | "country" | "crop";
type Unit = "ac" | "ha";

export function DashboardClient({
  clients,
  cps,
  sheds,
  seasonLabel,
}: {
  clients: DashClient[];
  cps: DashCp[];
  sheds: DashShed[];
  seasonLabel: string;
}) {
  const [country, setCountry] = useState("");
  const [crop, setCrop] = useState("");
  const [cp, setCp] = useState("");
  const [dim, setDim] = useState<Dim>("cp");
  const [unit, setUnit] = useState<Unit>("ac");

  const cpOptions = useMemo(
    () =>
      Array.from(new Map(clients.map((c) => [c.cpKey, c.cpName])).entries()).map(
        ([value, label]) => ({ value, label }),
      ),
    [clients],
  );

  const filtered = useMemo(
    () =>
      clients.filter((c) => {
        if (country && c.country !== country) return false;
        if (crop && !c.crops.includes(crop as never)) return false;
        if (cp && c.cpKey !== cp) return false;
        return true;
      }),
    [clients, country, crop, cp],
  );

  const total = filtered.length;

  // ---- Funnel by current stage ----
  const funnel = useMemo(() => {
    const counts = new Array(PIPELINE_STAGES.length + 1).fill(0) as number[];
    for (const c of filtered) counts[c.stageIndex] += 1;
    const data = PIPELINE_STAGES.map((s, i) => ({
      name: s.shortLabel,
      count: counts[i],
      current: true,
    }));
    data.push({ name: "Complete", count: counts[PIPELINE_STAGES.length], current: false });
    return data;
  }, [filtered]);

  // ---- Needs attention ----
  const stuckBefore = (idx: number) =>
    filtered.filter((c) => c.stageIndex < idx).length;
  const beforeQaqc = stuckBefore(3);
  const beforeW8 = stuckBefore(6);
  const beforeContract = stuckBefore(7);
  const beforePayment = stuckBefore(10);

  const cpIncomplete = useMemo(() => {
    const map = new Map<string, { name: string; incomplete: number; total: number }>();
    for (const c of filtered) {
      if (!map.has(c.cpKey))
        map.set(c.cpKey, { name: c.cpName, incomplete: 0, total: 0 });
      const e = map.get(c.cpKey)!;
      e.total += 1;
      if (!c.isComplete) e.incomplete += 1;
    }
    return [...map.values()]
      .filter((e) => e.incomplete > 0)
      .sort((a, b) => b.incomplete - a.incomplete)
      .slice(0, 8);
  }, [filtered]);

  // ---- Volume roll-ups by dimension ----
  const volumeData = useMemo(() => {
    const map = new Map<
      string,
      { name: string; enrolled: number; delivered: number; tCO2e: number }
    >();
    for (const c of filtered) {
      // For the crop dimension a multi-crop grower is counted under each of its
      // crops (its area is not split per crop).
      const keys =
        dim === "cp"
          ? [c.cpName]
          : dim === "country"
            ? [COUNTRY_LABELS[c.country]]
            : c.crops.length
              ? c.crops.map((cr) => CROP_LABELS[cr])
              : ["—"];
      for (const key of keys) {
        if (!map.has(key))
          map.set(key, { name: key, enrolled: 0, delivered: 0, tCO2e: 0 });
        const e = map.get(key)!;
        e.enrolled += unit === "ac" ? c.enrolledAcres : c.enrolledHectares;
        e.delivered += unit === "ac" ? c.deliveredAcres : c.deliveredHectares;
        e.tCO2e += c.tCO2e;
      }
    }
    return [...map.values()].sort((a, b) => b.delivered - a.delivered);
  }, [filtered, dim, unit]);

  const totalEnrolled = filtered.reduce(
    (s, c) => s + (unit === "ac" ? c.enrolledAcres : c.enrolledHectares),
    0,
  );
  const totalDelivered = filtered.reduce(
    (s, c) => s + (unit === "ac" ? c.deliveredAcres : c.deliveredHectares),
    0,
  );
  const totalTco2e = filtered.reduce((s, c) => s + c.tCO2e, 0);

  // ---- Supply shed balance (filtered by country/crop/cp) ----
  const shedTotals = useMemo(() => {
    const relevant = sheds.filter((s) => {
      if (country && s.country !== country) return false;
      if (crop && s.crop !== crop) return false;
      if (cp && s.cpKey !== cp) return false;
      return true;
    });
    return relevant.reduce(
      (acc, s) => {
        acc.needed += unit === "ac" ? s.acresNeeded : s.hectaresNeeded;
        acc.loaded += unit === "ac" ? s.acresLoaded : s.hectaresLoaded;
        return acc;
      },
      { needed: 0, loaded: 0 },
    );
  }, [sheds, country, crop, cp, unit]);

  // ---- Financials ----
  const growerPayments = filtered.reduce((s, c) => s + c.amount, 0);
  const paid = filtered.filter((c) => c.paymentDone).reduce((s, c) => s + c.amount, 0);
  const outstanding = growerPayments - paid;

  const revShareTotal = useMemo(() => {
    // Grower-payment pool per CP from the filtered rows.
    const poolByCp = new Map<string, boolean>();
    const poolAmount = new Map<string, number>();
    for (const c of filtered) {
      poolByCp.set(c.cpKey, true);
      poolAmount.set(c.cpKey, (poolAmount.get(c.cpKey) ?? 0) + c.amount);
    }
    let total = 0;
    for (const cpRow of cps) {
      if (!poolByCp.has(cpRow.cpKey)) continue;
      const pool = poolAmount.get(cpRow.cpKey) ?? 0;
      const payees = cpRow.payees as unknown as RevenueSharePayee[];
      total += computePayouts(payees, pool).total;
    }
    return total;
  }, [filtered, cps]);

  // ---- Compliance snapshot ----
  const pct = (n: number) => (total > 0 ? n / total : 0);
  const w8Pct = pct(filtered.filter((c) => c.w8Complete).length);
  const contractPct = pct(filtered.filter((c) => c.contractComplete).length);
  const bankPct = pct(filtered.filter((c) => c.bankDetails).length);

  const relevantCps = useMemo(() => {
    const keys = new Set(filtered.map((c) => c.cpKey));
    return cps.filter((c) => c.cpKey !== "__direct__" && keys.has(c.cpKey));
  }, [filtered, cps]);
  const cpCompliant = relevantCps.filter(
    (c) => c.agreementSigned && c.w8Provided,
  ).length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          label=""
          value={country || undefined}
          onChange={setCountry}
          options={COUNTRY_OPTIONS}
          includeEmpty
          emptyLabel="All countries"
          placeholder="All countries"
        />
        <SelectField
          label=""
          value={crop || undefined}
          onChange={setCrop}
          options={CROP_OPTIONS}
          includeEmpty
          emptyLabel="All crops"
          placeholder="All crops"
        />
        <SelectField
          label=""
          value={cp || undefined}
          onChange={setCp}
          options={cpOptions}
          includeEmpty
          emptyLabel="All CP / Direct"
          placeholder="All CP / Direct"
        />
        <div className="flex items-center justify-end text-sm text-muted-foreground">
          {total} clients · {seasonLabel}
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Clients"
          value={formatNumber(total)}
          sub={`${filtered.filter((c) => c.isComplete).length} fully complete`}
          icon={Sprout}
        />
        <StatCard
          label={`Delivered (${unit})`}
          value={formatNumber(totalDelivered)}
          sub={`of ${formatNumber(totalEnrolled)} enrolled`}
          icon={TrendingUp}
        />
        <StatCard
          label="Grower payments"
          value={formatUsd(growerPayments)}
          sub={`${formatUsd(paid)} paid · ${formatUsd(outstanding)} outstanding`}
          icon={DollarSign}
        />
        <StatCard
          label="Rev-share payout"
          value={formatUsd(revShareTotal)}
          sub={`${relevantCps.length} CP(s) in view`}
          icon={Users}
        />
      </div>

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline funnel</CardTitle>
          <CardDescription>
            Growers by current (first incomplete) stage — where things pile up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartFrame>
            <BarChart data={funnel} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-30}
                textAnchor="end"
                height={70}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {funnel.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.current ? "hsl(var(--primary))" : "hsl(var(--success))"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartFrame>
        </CardContent>
      </Card>

      {/* Needs attention */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs attention</CardTitle>
            <CardDescription>Growers stalled before key milestones.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <MiniStat label="Before QA/QC" value={beforeQaqc} />
            <MiniStat label="Before W-8" value={beforeW8} />
            <MiniStat label="Before contract" value={beforeContract} />
            <MiniStat label="Before payment" value={beforePayment} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CPs with most incomplete clients</CardTitle>
          </CardHeader>
          <CardContent>
            {cpIncomplete.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing incomplete in view.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel Partner</TableHead>
                    <TableHead className="text-right">Incomplete</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cpIncomplete.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.incomplete}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {c.total}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Volume roll-ups */}
      <Card>
        <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Volume roll-ups</CardTitle>
            <CardDescription>
              Enrolled vs delivered, and balance vs supply-shed targets.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <ToggleGroup
              value={dim}
              onChange={(v) => setDim(v as Dim)}
              options={[
                { value: "cp", label: "By CP" },
                { value: "country", label: "By country" },
                { value: "crop", label: "By crop" },
              ]}
            />
            <ToggleGroup
              value={unit}
              onChange={(v) => setUnit(v as Unit)}
              options={[
                { value: "ac", label: "Acres" },
                { value: "ha", label: "Hectares" },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <MiniStat label={`Enrolled (${unit})`} value={formatNumber(totalEnrolled)} raw />
            <MiniStat label={`Delivered (${unit})`} value={formatNumber(totalDelivered)} raw />
            <MiniStat label="tCO₂e" value={formatNumber(totalTco2e, 1)} raw />
            <MiniStat
              label={`Shed balance (${unit})`}
              value={formatNumber(shedTotals.needed - shedTotals.loaded)}
              raw
            />
          </div>
          {shedTotals.needed > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  Supply shed loaded {formatNumber(shedTotals.loaded)} /{" "}
                  {formatNumber(shedTotals.needed)} needed
                </span>
                <span>
                  {formatPercent(
                    shedTotals.needed > 0 ? shedTotals.loaded / shedTotals.needed : 0,
                  )}
                </span>
              </div>
              <Progress
                value={Math.min(
                  shedTotals.needed > 0 ? (shedTotals.loaded / shedTotals.needed) * 100 : 0,
                  100,
                )}
              />
            </div>
          )}
          {volumeData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No volume data in view.</p>
          ) : (
            <ChartFrame>
              <BarChart data={volumeData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
                <Bar dataKey="enrolled" name="Enrolled" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delivered" name="Delivered" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartFrame>
          )}
        </CardContent>
      </Card>

      {/* Compliance snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <ComplianceMeter label="W-8 complete" pct={w8Pct} />
          <ComplianceMeter label="Contracts complete" pct={contractPct} />
          <ComplianceMeter label="Bank details on file" pct={bankPct} />
          <div>
            <p className="text-sm text-muted-foreground">CPs: agreement + W-8</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {cpCompliant}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {relevantCps.length}
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ChartFrame({ children }: { children: React.ReactElement }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          {p.name}: {formatNumber(p.value)}
        </p>
      ))}
    </div>
  );
}

function MiniStat({
  label,
  value,
  raw,
}: {
  label: string;
  value: number | string;
  raw?: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">
        {raw ? value : formatNumber(value as number)}
      </p>
    </div>
  );
}

function ComplianceMeter({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="text-sm font-medium tabular-nums">
          {formatPercent(pct)}
        </span>
      </div>
      <Progress value={Math.round(pct * 100)} className="mt-2" />
    </div>
  );
}

function ToggleGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-md border p-0.5">
      {options.map((o) => (
        <Button
          key={o.value}
          type="button"
          variant={value === o.value ? "secondary" : "ghost"}
          size="sm"
          className="h-8"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
