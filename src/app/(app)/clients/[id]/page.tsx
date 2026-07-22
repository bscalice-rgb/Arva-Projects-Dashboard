import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { getSelectedSeason } from "@/lib/season";
import { COUNTRY_LABELS } from "@/lib/enums";
import { clientSeasonInclude, toClientSeasonRow } from "../types";
import { ClientDetail } from "./client-detail";

export const dynamic = "force-dynamic";

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
      mill: true,
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

  const [orgNodes, mills, selectedSeason] = await Promise.all([
    prisma.orgNode.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, country: true },
    }),
    prisma.mill.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, crop: true },
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
        orgNodeId: client.orgNodeId,
        name: client.name,
        legalEntity: client.legalEntity,
        country: client.country,
        defaultCrop: client.defaultCrop,
        millId: client.millId,
        region: client.region,
      }}
      displayCountry={COUNTRY_LABELS[client.country]}
      orgNodeName={client.orgNode.name}
      orgNodeKind={client.orgNode.kind}
      channelPartnerName={client.orgNode.channelPartner?.entityName ?? null}
      millName={client.mill?.name ?? null}
      orgNodes={orgNodes}
      mills={mills}
      seasonLinks={seasonLinks}
      activeSeasonId={targetSeasonId}
      activeSeasonLabel={activeSeasonLabel}
      record={record}
      carriedForwardNote={carriedForwardNote}
    />
  );
}
