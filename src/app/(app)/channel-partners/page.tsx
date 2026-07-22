import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { getSelectedSeason } from "@/lib/season";
import { getVolumeAggByChannelPartner, emptyAgg } from "@/lib/rollups";
import { computePayouts } from "@/lib/revenue-share";
import { PageHeader } from "@/components/page-header";
import { NoSeason } from "@/components/no-season";
import { CpListClient, type CpRow } from "./cp-list-client";

export const dynamic = "force-dynamic";

export default async function ChannelPartnersPage() {
  const userId = getCurrentUserId();
  const season = await getSelectedSeason();

  if (!season) {
    return (
      <div>
        <PageHeader title="Channel Partners" />
        <NoSeason />
      </div>
    );
  }

  const [cps, aggByCp] = await Promise.all([
    prisma.channelPartner.findMany({
      where: { userId },
      orderBy: { entityName: "asc" },
      include: {
        seasons: {
          where: { seasonId: season.id },
          include: { payees: true },
        },
      },
    }),
    getVolumeAggByChannelPartner(season.id, userId),
  ]);

  const rows: CpRow[] = cps.map((cp) => {
    const cs = cp.seasons[0];
    const agg = aggByCp.get(cp.id) ?? emptyAgg();
    const payout = cs
      ? computePayouts(cs.payees, agg.growerPayments).total
      : 0;
    return {
      id: cp.id,
      entityName: cp.entityName,
      mainContact: cp.mainContact,
      type: cp.type,
      country: cp.country,
      notes: cp.notes,
      hasSeason: !!cs,
      agreementSigned: cs?.agreementSigned ?? false,
      w8Provided: cs?.w8Provided ?? false,
      bankDetails: cs?.bankDetails ?? false,
      clientCount: agg.clientCount,
      deliveredAcres: agg.deliveredAcres,
      growerPayments: agg.growerPayments,
      revSharePayout: payout,
    };
  });

  return (
    <div>
      <PageHeader
        title="Channel Partners"
        description={`CPs and Referrers with per-season compliance, rolled-up volumes and revenue-share payout for ${season.label}.`}
      />
      <CpListClient rows={rows} seasonLabel={season.label} />
    </div>
  );
}
