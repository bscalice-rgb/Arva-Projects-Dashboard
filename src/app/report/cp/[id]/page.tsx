import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { getSelectedSeason } from "@/lib/season";
import {
  getPipelineStatus,
  PIPELINE_STAGE_COUNT,
} from "@/lib/pipeline";
import { computeShedLoaded } from "@/lib/supply-shed";
import { COUNTRY_LABELS, CROP_LABELS } from "@/lib/enums";
import { formatNumber } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export default async function CpReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const { season: seasonParam } = await searchParams;
  const userId = getCurrentUserId();

  const cp = await prisma.channelPartner.findFirst({ where: { id, userId } });
  if (!cp) notFound();

  const season = seasonParam
    ? await prisma.season.findUnique({ where: { id: seasonParam } })
    : await getSelectedSeason();

  const [clientSeasons, cpSeason, sheds] = season
    ? await Promise.all([
        prisma.clientSeason.findMany({
          where: {
            seasonId: season.id,
            client: { orgNode: { channelPartnerId: id } },
          },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                country: true,
                regions: { select: { id: true } },
                orgNode: { select: { channelPartnerId: true } },
              },
            },
          },
          orderBy: { client: { name: "asc" } },
        }),
        prisma.channelPartnerSeason.findUnique({
          where: {
            channelPartnerId_seasonId: {
              channelPartnerId: id,
              seasonId: season.id,
            },
          },
        }),
        prisma.supplyShed.findMany({
          where: { seasonId: season.id, channelPartnerId: id },
          include: { region: { select: { name: true } } },
          orderBy: [{ crop: "asc" }],
        }),
      ])
    : [[], null, []];

  // Pipeline status per grower.
  const withStatus = clientSeasons.map((cs) => ({
    cs,
    status: getPipelineStatus(cs),
  }));
  const total = withStatus.length;
  const completeCount = withStatus.filter((w) => w.status.isComplete).length;
  const enrolledHa = clientSeasons.reduce(
    (s, cs) => s + (cs.enrolledHectares ?? 0),
    0,
  );
  const deliveredHa = clientSeasons.reduce(
    (s, cs) => s + (cs.deliveredHectares ?? 0),
    0,
  );
  const avgPct =
    total > 0
      ? Math.round(
          (withStatus.reduce((s, w) => s + w.status.stageIndex, 0) /
            (total * PIPELINE_STAGE_COUNT)) *
            100,
        )
      : 0;

  // "What we need next": growers grouped by their current (first incomplete) stage,
  // ordered by pipeline position so the earliest blockers come first.
  const nextSteps = new Map<number, { label: string; count: number }>();
  for (const w of withStatus) {
    if (w.status.isComplete) continue;
    const key = w.status.stageIndex;
    if (!nextSteps.has(key))
      nextSteps.set(key, { label: w.status.currentStage, count: 0 });
    nextSteps.get(key)!.count += 1;
  }
  const nextStepRows = [...nextSteps.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);

  // CP's own outstanding compliance items.
  const cpTodos: string[] = [];
  if (!cpSeason?.agreementSigned) cpTodos.push("Sign the CP agreement");
  if (!cpSeason?.w8Provided) cpTodos.push("Provide the CP W-8");
  if (!cpSeason?.bankDetails) cpTodos.push("Provide bank details");

  // Allotment loaded roll-up.
  const csForMatch = clientSeasons.map((cs) => ({
    crops: cs.crops,
    deliveredAcres: cs.deliveredAcres,
    deliveredHectares: cs.deliveredHectares,
    client: {
      id: cs.client.id,
      country: cs.client.country,
      regionIds: cs.client.regions.map((r) => r.id),
      orgNode: { channelPartnerId: cs.client.orgNode.channelPartnerId },
    },
  }));
  const loaded = computeShedLoaded(sheds, csForMatch);
  const allotments = sheds.map((s) => {
    const l = loaded.get(s.id) ?? { loadedAcres: 0, loadedHectares: 0 };
    const needed = s.hectaresNeeded;
    const balance = needed - l.loadedHectares;
    const pct = needed > 0 ? Math.round((l.loadedHectares / needed) * 100) : 0;
    return {
      id: s.id,
      label: `${CROP_LABELS[s.crop]}${s.region ? ` · ${s.region.name}` : ""} · ${COUNTRY_LABELS[s.country]}`,
      needed,
      loaded: l.loadedHectares,
      balance,
      pct,
    };
  });

  const generated = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const nothingOutstanding =
    nextStepRows.length === 0 && cpTodos.length === 0 && total > 0;

  return (
    <div className="min-h-screen bg-muted/40 py-6">
      {/* Toolbar (not printed) */}
      <div className="no-print mx-auto mb-4 flex max-w-[800px] items-center justify-between px-4">
        <Link
          href={`/channel-partners/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to {cp.entityName}
        </Link>
        <PrintButton />
      </div>

      {/* The printable page */}
      <div className="print-exact mx-auto max-w-[800px] bg-white p-8 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/arva-logo-dark.png"
              alt="Arva"
              className="h-9 w-auto"
            />
            <div className="mt-2 text-sm text-muted-foreground">
              Scope-3 Program — Partner Progress Report
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{cp.entityName}</div>
            <div className="text-muted-foreground">
              {season ? season.label : "No season"}
            </div>
            <div className="text-muted-foreground">as of {generated}</div>
          </div>
        </div>

        {!season ? (
          <p className="mt-6 text-sm text-muted-foreground">
            No program year is set up yet.
          </p>
        ) : (
          <>
            {/* KPIs */}
            <div className="mt-5 grid grid-cols-4 gap-3">
              <Kpi label="Growers enrolled" value={formatNumber(total)} />
              <Kpi
                label="Growers complete"
                value={`${completeCount} / ${total}`}
                sub={`${avgPct}% overall progress`}
              />
              <Kpi
                label="Enrolled area"
                value={`${formatNumber(enrolledHa)} ha`}
              />
              <Kpi
                label="Delivered area"
                value={`${formatNumber(deliveredHa)} ha`}
              />
            </div>

            {/* Allotment progress */}
            <Section title="Allotment progress (hectares)">
              {allotments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No allotments set for this partner.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {allotments.map((a) => (
                    <div key={a.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{a.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatNumber(a.loaded)} / {formatNumber(a.needed)} ha
                          {" · "}
                          <span
                            className={
                              a.balance < 0
                                ? "text-success"
                                : "text-foreground"
                            }
                          >
                            {a.balance < 0 ? "+" : ""}
                            {formatNumber(Math.abs(a.balance))}{" "}
                            {a.balance < 0 ? "over" : "to go"}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(a.pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* What we need next */}
            <Section title="What we need next — focus here">
              {total === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No growers enrolled for this partner yet.
                </p>
              ) : nothingOutstanding ? (
                <p className="text-sm font-medium text-success">
                  All growers are complete — nothing outstanding. 🎉
                </p>
              ) : (
                <div className="space-y-3">
                  {nextStepRows.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Grower next steps
                      </div>
                      <ul className="space-y-1.5">
                        {nextStepRows.map((r) => (
                          <li
                            key={r.label}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
                              {r.count}
                            </span>
                            <span>
                              grower{r.count === 1 ? "" : "s"} — next:{" "}
                              <span className="font-medium">{r.label}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {cpTodos.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Partner to-dos
                      </div>
                      <ul className="space-y-1 text-sm">
                        {cpTodos.map((t) => (
                          <li key={t} className="flex items-center gap-2">
                            <X className="h-3.5 w-3.5 shrink-0 text-destructive" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </Section>

            {/* Footer: compliance + confidentiality */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-4 text-xs">
              <span className="font-semibold text-muted-foreground">
                Partner compliance:
              </span>
              <ComplianceChip label="Agreement" ok={!!cpSeason?.agreementSigned} />
              <ComplianceChip label="W-8" ok={!!cpSeason?.w8Provided} />
              <ComplianceChip label="Bank details" ok={!!cpSeason?.bankDetails} />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Confidential — prepared by Arva Intelligence for {cp.entityName}.
              Figures reflect program data as of {generated}.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">
        {title}
      </h2>
      {children}
    </div>
  );
}

function ComplianceChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
        ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
      }`}
    >
      {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
  );
}
