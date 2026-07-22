import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { getSelectedSeason } from "@/lib/season";
import { computeShedLoaded } from "@/lib/supply-shed";
import { PageHeader } from "@/components/page-header";
import { NoSeason } from "@/components/no-season";
import { SupplyShedsClient, type ShedRow } from "./supply-sheds-client";

export const dynamic = "force-dynamic";

export default async function SupplyShedsPage() {
  const userId = getCurrentUserId();
  const season = await getSelectedSeason();

  if (!season) {
    return (
      <div>
        <PageHeader title="Supply Sheds" />
        <NoSeason />
      </div>
    );
  }

  const [sheds, clientSeasons, cps] = await Promise.all([
    prisma.supplyShed.findMany({
      where: { seasonId: season.id, userId },
      include: { channelPartner: { select: { entityName: true } } },
      orderBy: [{ country: "asc" }, { crop: "asc" }],
    }),
    prisma.clientSeason.findMany({
      where: { seasonId: season.id, client: { userId } },
      select: {
        crop: true,
        deliveredAcres: true,
        deliveredHectares: true,
        client: {
          select: {
            country: true,
            region: true,
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
  ]);

  const loaded = computeShedLoaded(sheds, clientSeasons);

  const rows: ShedRow[] = sheds.map((s) => {
    const l = loaded.get(s.id) ?? { loadedAcres: 0, loadedHectares: 0 };
    return {
      id: s.id,
      country: s.country,
      channelPartnerId: s.channelPartnerId,
      channelPartnerName: s.channelPartner?.entityName ?? null,
      crop: s.crop,
      region: s.region,
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
        title="Supply Sheds"
        description="Per-season area targets by CP × crop × country × region. Loaded rolls up from delivered client area; balance can go negative (over-delivery)."
      />
      <SupplyShedsClient
        rows={rows}
        channelPartners={cps}
        seasonId={season.id}
        seasonLabel={season.label}
      />
    </div>
  );
}
