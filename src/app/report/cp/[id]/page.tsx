import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { getSelectedSeason } from "@/lib/season";
import type { PipelineInput } from "@/lib/pipeline";
import { computeShedLoaded } from "@/lib/supply-shed";
import { formatNumber } from "@/lib/utils";
import {
  normalizeLang,
  getReportDict,
  REPORT_LANGS,
} from "@/lib/report-i18n";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

// The progress checklist, grouped by category. One source of truth for the
// page-1 progress bars, the "what we need next" list and the page-2 detail.
// Labels are resolved per language via the report dictionary (keys here).
type ReportItemCs = PipelineInput & { paymentDone: boolean };
type ReportItem = { key: string; done: (cs: ReportItemCs) => boolean };
type ReportCategory = { key: string; items: ReportItem[] };

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    key: "data",
    items: [
      { key: "boundaries", done: (cs) => cs.boundariesStatus === "DONE" },
      { key: "data", done: (cs) => cs.dataStatus === "DONE" },
      { key: "qaqc", done: (cs) => cs.qaqc === "DONE" },
      { key: "evidencing", done: (cs) => cs.evidencing === "ATTACHED" },
    ],
  },
  {
    key: "enrollment",
    items: [
      { key: "legalEntity", done: (cs) => cs.legalEntitySetup },
      { key: "fieldRequested", done: (cs) => cs.fieldRequested },
      { key: "fieldConfirmed", done: (cs) => cs.fieldConfirmed },
    ],
  },
  {
    key: "contract",
    items: [
      {
        key: "w8",
        done: (cs) =>
          cs.w8Type != null && cs.w8InCropForce && cs.w8MatchesLegalEntity,
      },
      {
        key: "contract",
        done: (cs) =>
          cs.contractStatus === "SIGNED" && cs.contractApprovedInCropForce,
      },
      { key: "bank", done: (cs) => cs.bankDetails },
      { key: "payment", done: (cs) => cs.paymentDone },
    ],
  },
];

// Flat, ordered view (category order → item order) for "next step" logic.
const FLAT_ITEMS = REPORT_CATEGORIES.flatMap((c) =>
  c.items.map((it) => ({ ...it, categoryKey: c.key })),
);
const TOTAL_ITEMS = FLAT_ITEMS.length;

export default async function CpReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string; lang?: string }>;
}) {
  const { id } = await params;
  const { season: seasonParam, lang: langParam } = await searchParams;
  const userId = getCurrentUserId();

  const lang = normalizeLang(langParam);
  const t = getReportDict(lang);

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
                regions: { select: { id: true, name: true } },
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

  const total = clientSeasons.length;
  const enrolledHa = clientSeasons.reduce(
    (s, cs) => s + (cs.enrolledHectares ?? 0),
    0,
  );
  const deliveredHa = clientSeasons.reduce(
    (s, cs) => s + (cs.deliveredHectares ?? 0),
    0,
  );

  // Completion checks across the categorized checklist.
  const doneChecks = clientSeasons.reduce(
    (n, cs) => n + FLAT_ITEMS.filter((it) => it.done(cs)).length,
    0,
  );
  const avgPct =
    total > 0 ? Math.round((doneChecks / (total * TOTAL_ITEMS)) * 100) : 0;
  const completeCount = clientSeasons.filter((cs) =>
    FLAT_ITEMS.every((it) => it.done(cs)),
  ).length;

  // Page-1 progress bars, grouped by category (growers with each item done).
  const categoryProgress = REPORT_CATEGORIES.map((cat) => ({
    name: t.categories[cat.key],
    items: cat.items.map((it) => {
      const done = clientSeasons.filter((cs) => it.done(cs)).length;
      return {
        label: t.items[it.key],
        done,
        pct: total > 0 ? Math.round((done / total) * 100) : 0,
      };
    }),
  }));

  // "What we need next": group growers by their first incomplete checklist item.
  const nextCounts = new Map<
    number,
    { label: string; category: string; count: number }
  >();
  for (const cs of clientSeasons) {
    const idx = FLAT_ITEMS.findIndex((it) => !it.done(cs));
    if (idx === -1) continue; // fully complete
    const it = FLAT_ITEMS[idx];
    if (!nextCounts.has(idx))
      nextCounts.set(idx, {
        label: t.items[it.key],
        category: t.categories[it.categoryKey],
        count: 0,
      });
    nextCounts.get(idx)!.count += 1;
  }
  const nextStepRows = [...nextCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v);

  // CP's own outstanding compliance items.
  const cpTodos: string[] = [];
  if (!cpSeason?.agreementSigned) cpTodos.push(t.todoAgreement);
  if (!cpSeason?.w8Provided) cpTodos.push(t.todoW8);
  if (!cpSeason?.bankDetails) cpTodos.push(t.todoBank);

  // Allotment loaded roll-up.
  const csForMatch = clientSeasons.map((cs) => ({
    crops: cs.crops,
    deliveredAcres: cs.deliveredAcres,
    deliveredHectares: cs.deliveredHectares,
    enrolledAcres: cs.enrolledAcres,
    enrolledHectares: cs.enrolledHectares,
    client: {
      id: cs.client.id,
      country: cs.client.country,
      regionIds: cs.client.regions.map((r) => r.id),
      orgNode: { channelPartnerId: cs.client.orgNode.channelPartnerId },
    },
  }));
  const loaded = computeShedLoaded(sheds, csForMatch);
  const allotments = sheds.map((s) => {
    const l = loaded.get(s.id) ?? {
      loadedHectares: 0,
      enrolledHectares: 0,
    };
    const needed = s.hectaresNeeded;
    const enrolled = l.enrolledHectares;
    const delivered = l.loadedHectares;
    const enrolledPct =
      needed > 0 ? Math.round((enrolled / needed) * 100) : 0;
    const deliveredPct =
      needed > 0 ? Math.round((delivered / needed) * 100) : 0;
    const toEnroll = needed - enrolled;
    return {
      id: s.id,
      label: `${t.crop[s.crop]}${s.region ? ` · ${s.region.name}` : ""} · ${t.country[s.country]}`,
      needed,
      enrolled,
      delivered,
      enrolledPct,
      deliveredPct,
      toEnroll,
    };
  });

  // Page 2 — per-grower detail (each grower's items by category).
  const growerRows = clientSeasons.map((cs) => ({
    id: cs.id,
    name: cs.client.name,
    crops: cs.crops.map((c) => t.crop[c]).join(", ") || "—",
    regions: cs.client.regions.map((r) => r.name).join(", ") || "—",
    enrolledHa: cs.enrolledHectares,
    categories: REPORT_CATEGORIES.map((cat) => ({
      name: t.categories[cat.key],
      items: cat.items.map((it) => ({
        label: t.items[it.key],
        done: it.done(cs),
      })),
    })),
    doneCount: FLAT_ITEMS.filter((it) => it.done(cs)).length,
  }));

  const generated = new Date().toLocaleDateString(t.locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const nothingOutstanding =
    nextStepRows.length === 0 && cpTodos.length === 0 && total > 0;

  const baseHref = `/report/cp/${id}?season=${season?.id ?? ""}`;

  return (
    <div className="min-h-screen bg-muted/40 py-6">
      {/* Toolbar (not printed) */}
      <div className="no-print mx-auto mb-4 flex max-w-[800px] flex-wrap items-center justify-between gap-3 px-4">
        <Link
          href={`/channel-partners/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {t.backTo(cp.entityName)}
        </Link>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-md border p-0.5">
            {REPORT_LANGS.map((l) => (
              <Link
                key={l.code}
                href={`${baseHref}&lang=${l.code}`}
                title={l.label}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  l.code === lang
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {l.short}
              </Link>
            ))}
          </div>
          <PrintButton label={t.savePdf} />
        </div>
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
              {t.subtitle}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{cp.entityName}</div>
            <div className="text-muted-foreground">
              {season ? season.label : ""}
            </div>
            <div className="text-muted-foreground">
              {t.asOf} {generated}
            </div>
          </div>
        </div>

        {!season ? (
          <p className="mt-6 text-sm text-muted-foreground">{t.noSeason}</p>
        ) : (
          <>
            {/* Overall progress banner */}
            <div className="mt-5 rounded-lg border bg-secondary/40 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold">
                  {t.overallTitle}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t.growersComplete(completeCount, total)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${avgPct}%` }}
                  />
                </div>
                <span className="text-lg font-bold tabular-nums text-primary">
                  {avgPct}%
                </span>
              </div>
            </div>

            {/* KPIs */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Kpi label={t.kpiGrowers} value={formatNumber(total)} />
              <Kpi
                label={t.kpiEnrolled}
                value={`${formatNumber(enrolledHa)} ha`}
              />
              <Kpi
                label={t.kpiDelivered}
                value={`${formatNumber(deliveredHa)} ha`}
              />
            </div>

            {/* Pipeline progress — grouped by category */}
            <Section title={t.secPipeline}>
              {total === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.noGrowersYet}
                </p>
              ) : (
                <div className="space-y-3">
                  {categoryProgress.map((cat) => (
                    <div key={cat.name}>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                        {cat.name}
                      </div>
                      <div className="space-y-1.5">
                        {cat.items.map((st) => (
                          <div
                            key={st.label}
                            className="flex items-center gap-3"
                          >
                            <span className="w-28 shrink-0 text-xs text-muted-foreground">
                              {st.label}
                            </span>
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${st.pct}%` }}
                              />
                            </div>
                            <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                              {st.done}/{total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Allotment progress — enrolled now, delivered fills in later */}
            <Section title={t.secAllotment}>
              {allotments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.noAllotments}
                </p>
              ) : (
                <div className="space-y-3">
                  {allotments.map((a) => (
                    <div key={a.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{a.label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {t.enrolledLabel(
                            formatNumber(a.enrolled),
                            formatNumber(a.needed),
                            a.enrolledPct,
                          )}
                          {a.toEnroll > 0 && (
                            <> · {t.toEnroll(formatNumber(a.toEnroll))}</>
                          )}
                        </span>
                      </div>
                      {/* Track = target. Light fill = enrolled, solid = delivered. */}
                      <div className="relative mt-1 h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary/30"
                          style={{ width: `${Math.min(a.enrolledPct, 100)}%` }}
                        />
                        <div
                          className="absolute inset-y-0 left-0 bg-primary"
                          style={{ width: `${Math.min(a.deliveredPct, 100)}%` }}
                        />
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {t.deliveredNote(
                          formatNumber(a.delivered),
                          a.deliveredPct,
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* What we need next */}
            <Section title={t.secNext}>
              {total === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t.noGrowersPartner}
                </p>
              ) : nothingOutstanding ? (
                <p className="text-sm font-medium text-success">
                  {t.allComplete}
                </p>
              ) : (
                <div className="space-y-3">
                  {nextStepRows.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.growerNextSteps}
                      </div>
                      <ul className="space-y-1.5">
                        {nextStepRows.map((r) => (
                          <li
                            key={`${r.category}-${r.label}`}
                            className="flex items-center gap-3 text-sm"
                          >
                            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
                              {r.count}
                            </span>
                            <span>
                              {t.growersNext(r.count, r.label, r.category)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {cpTodos.length > 0 && (
                    <div>
                      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t.partnerTodos}
                      </div>
                      <ul className="space-y-1 text-sm">
                        {cpTodos.map((todo) => (
                          <li key={todo} className="flex items-center gap-2">
                            <X className="h-3.5 w-3.5 shrink-0 text-destructive" />
                            {todo}
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
                {t.compliance}
              </span>
              <ComplianceChip
                label={t.agreement}
                ok={!!cpSeason?.agreementSigned}
              />
              <ComplianceChip label={t.w8} ok={!!cpSeason?.w8Provided} />
              <ComplianceChip
                label={t.bankDetails}
                ok={!!cpSeason?.bankDetails}
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {t.confidential(cp.entityName, generated)}
            </p>

            {/* ---- Per-grower detail (flows sequentially; no forced page break) ---- */}
            {total > 0 && (
              <div className="mt-8 pt-2">
                <div className="mb-4 flex items-center justify-between border-b pb-3">
                  <div>
                    <div className="text-lg font-bold text-primary">
                      {t.growerDetail}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {cp.entityName} · {season.label}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t.legend}
                  </div>
                </div>

                <div className="space-y-3">
                  {growerRows.map((g) => (
                    <div
                      key={g.id}
                      className="break-inside-avoid rounded-md border p-3"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">{g.name}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {t.stepsDone(g.doneCount, TOTAL_ITEMS)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {g.crops} · {g.regions} ·{" "}
                        {g.enrolledHa != null
                          ? t.haEnrolled(formatNumber(g.enrolledHa))
                          : t.areaTbd}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-3">
                        {g.categories.map((cat) => (
                          <div key={cat.name}>
                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {cat.name}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {cat.items.map((it) => (
                                <ItemChip
                                  key={it.label}
                                  label={it.label}
                                  done={it.done}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ItemChip({ label, done }: { label: string; done: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] ${
        done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
      }`}
    >
      {done ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {label}
    </span>
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
