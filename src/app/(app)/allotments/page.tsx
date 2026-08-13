import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { getSelectedSeason } from "@/lib/season";
import { computeShedLoaded } from "@/lib/supply-shed";
import { PageHeader } from "@/components/page-header";
import { NoSeason } from "@/components/no-season";
import { AllotmentsClient, type ShedRow } from "./allotments-client";

export const dynamic = "force-dynamic";

export default async function AllotmentsPage() {
  const userId = getCurrentUserId();
  const season = await getSelectedSeason();

  if (!season) {
    return (
      <div>
        <PageHeader title="Allotments" />
        <NoSeason />
      </div>
    );
  }

  const [sheds, clientSeasons, cps, directGrowers, regions] = await Promise.all([
    prisma.supplyShed.findMany({
      where: { seasonId: season.id, userId },
      include: {
        channelPartner: { select: { entityName: true } },
        client: { select: { name: true } },
        region: { select: { name: true } },
      },
      orderBy: [{ country: "asc" }, { crop: "asc" }],
    }),
    prisma.clientSeason.findMany({
      where: { seasonId: season.id, client: { userId } },
      select: {
        crops: true,
        deliveredAcres: true,
        deliveredHectares: true,
        client: {
          select: {
            id: true,
            country: true,
            regions: { select: { id: true } },
            orgNode: { select: { channelPartnerId: true } },
          },
        },
      },
    }),
    prisma.channelPartner.findMany({
      where: { userId },
      orderBy: { entityName: "asc" },
      select: { id: true, entityName: true },
    }),
    // Growers sourced directly (no CP intermediary) — assignable to Direct allotments.
    prisma.client.findMany({
      where: { userId, orgNode: { channelPartnerId: null } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, country: true },
    }),
    prisma.region.findMany({
      where: { userId },
      orderBy: [{ country: "asc" }, { name: "asc" }],
      select: { id: true, name: true, country: true },
    }),
  ]);

  // Reshape client-seasons for the matcher (regions -> regionIds).
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

  const rows: ShedRow[] = sheds.map((s) => {
    const l = loaded.get(s.id) ?? { loadedAcres: 0, loadedHectares: 0 };
    return {
      id: s.id,
      country: s.country,
      channelPartnerId: s.channelPartnerId,
      channelPartnerName: s.channelPartner?.entityName ?? null,
      clientId: s.clientId,
      clientName: s.client?.name ?? null,
      crop: s.crop,
      regionId: s.regionId,
      regionName: s.region?.name ?? null,
      acresNeeded: s.acresNeeded,
      hectaresNeeded: s.hectaresNeeded,
      acresLoaded: l.loadedAcres,
      hectaresLoaded: l.loadedHectares,
      enteredInCropForce: s.enteredInCropForce,
    };
  });

  return (
    <div>
      <PageHeader
        title="Allotments"
        description="Per-season area targets by CP × crop × country × region. Loaded rolls up from delivered grower area; balance can go negative (over-delivery)."
      />
      <AllotmentsClient
        rows={rows}
        channelPartners={cps}
        directGrowers={directGrowers}
        regions={regions}
        seasonId={season.id}
        seasonLabel={season.label}
      />
    </div>
  );
}
