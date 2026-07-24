import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { getSelectedSeason } from "@/lib/season";
import { COUNTRY_LABELS, CROP_LABELS } from "@/lib/enums";
import { clientSeasonInclude, toClientSeasonRow } from "../types";
import { ClientDetail } from "./client-detail";

export const dynamic = "force-dynamic";

const millLabel = (m: { name: string; group: { name: string } | null }) =>
  m.group ? `${m.group.name} — ${m.name}` : m.name;


export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const { season: seasonParam } = await searchParams;
  const userId = getCurrentUserId();

  const client = await prisma.client.findFirst({
    where: { id, userId },
    include: {
      orgNode: { include: { channelPartner: true } },
      mill: { include: { group: true } },
      regions: true,
      seasons: {
        include: {
          ...clientSeasonInclude,
          season: true,
          carriedForwardFrom: { include: { season: true } },
        },
        orderBy: { season: { year: "desc" } },
      },
    },
  });
  if (!client) notFound();

  const [channelPartners, mills, regions, selectedSeason] = await Promise.all([
    prisma.channelPartner.findMany({
      where: { userId },
      orderBy: { entityName: "asc" },
      select: { id: true, entityName: true },
    }),
    prisma.mill.findMany({
      where: { userId },
      orderBy: [{ group: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        crop: true,
        group: { select: { name: true } },
      },
    }),
    prisma.region.findMany({
      where: { userId },
      orderBy: [{ country: "asc" }, { name: "asc" }],
      select: { id: true, name: true, country: true },
    }),
    getSelectedSeason(),
  ]);

  const seasonLinks = client.seasons.map((cs) => ({
    seasonId: cs.seasonId,
    label: cs.season.label,
    clientSeasonId: cs.id,
  }));

  // Which season record to show: ?season=, else global selected, else newest record.
  const targetSeasonId =
    seasonParam ||
    (selectedSeason && client.seasons.some((s) => s.seasonId === selectedSeason.id)
      ? selectedSeason.id
      : null) ||
    selectedSeason?.id ||
    client.seasons[0]?.seasonId ||
    null;

  const activeCs = client.seasons.find((s) => s.seasonId === targetSeasonId);
  const activeSeasonLabel =
    activeCs?.season.label ??
    (selectedSeason?.id === targetSeasonId ? selectedSeason?.label : null) ??
    null;

  const record = activeCs ? toClientSeasonRow(activeCs) : null;

  const carriedForwardNote = activeCs?.carriedForwardFrom
    ? `Carried forward from ${activeCs.carriedForwardFrom.season.label}.`
    : null;

  return (
    <ClientDetail
      identity={{
        id: client.id,
        channelPartnerId: client.orgNode.channelPartnerId,
        name: client.name,
        legalEntity: client.legalEntity,
        country: client.country,
        defaultCrops: client.defaultCrops,
        millId: client.millId,
        regionIds: client.regions.map((r) => r.id),
      }}
      displayCountry={COUNTRY_LABELS[client.country]}
      orgNodeName={client.orgNode.name}
      orgNodeKind={client.orgNode.kind}
      channelPartnerName={client.orgNode.channelPartner?.entityName ?? null}
      millName={client.mill ? millLabel(client.mill) : null}
      cropsDisplay={client.defaultCrops.map((c) => CROP_LABELS[c]).join(", ")}
      regionsDisplay={client.regions.map((r) => r.name).join(", ")}
      channelPartners={channelPartners}
      mills={mills.map((m) => ({ id: m.id, name: millLabel(m), crop: m.crop }))}
      regions={regions}
      seasonLinks={seasonLinks}
      activeSeasonId={targetSeasonId}
      activeSeasonLabel={activeSeasonLabel}
      record={record}
      carriedForwardNote={carriedForwardNote}
    />
  );
}
