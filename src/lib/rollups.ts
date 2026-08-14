import { prisma } from "@/lib/prisma";
import { getPipelineStatus } from "@/lib/pipeline";
import { deliveredFor } from "@/lib/area";

export type VolumeAgg = {
  clientCount: number;
  enrolledAcres: number;
  enrolledHectares: number;
  deliveredAcres: number;
  deliveredHectares: number;
  tCO2e: number;
  fields: number;
  growerPayments: number; // sum of amount
  paidAmount: number; // sum of amount where paymentDone
  completeCount: number; // pipeline fully complete
};

export function emptyAgg(): VolumeAgg {
  return {
    clientCount: 0,
    enrolledAcres: 0,
    enrolledHectares: 0,
    deliveredAcres: 0,
    deliveredHectares: 0,
    tCO2e: 0,
    fields: 0,
    growerPayments: 0,
    paidAmount: 0,
    completeCount: 0,
  };
}

type CsForAgg = Parameters<typeof getPipelineStatus>[0] & {
  enrolledAcres: number | null;
  enrolledHectares: number | null;
  tCO2e: number | null;
  fields: number | null;
  amount: number | null;
  paymentDone: boolean;
};

export function addToAgg(agg: VolumeAgg, cs: CsForAgg) {
  agg.clientCount += 1;
  agg.enrolledAcres += cs.enrolledAcres ?? 0;
  agg.enrolledHectares += cs.enrolledHectares ?? 0;
  // Delivered follows pipeline completion rather than being tracked twice.
  const d = deliveredFor(cs);
  agg.deliveredAcres += d.deliveredAcres;
  agg.deliveredHectares += d.deliveredHectares;
  agg.tCO2e += cs.tCO2e ?? 0;
  agg.fields += cs.fields ?? 0;
  agg.growerPayments += cs.amount ?? 0;
  if (cs.paymentDone) agg.paidAmount += cs.amount ?? 0;
  if (getPipelineStatus(cs).isComplete) agg.completeCount += 1;
}

/**
 * Aggregate per-season client volumes keyed by the Channel Partner that owns
 * the client's Org Node. Direct growers are keyed under "__direct__".
 */
export async function getVolumeAggByChannelPartner(
  seasonId: string,
  userId: string,
): Promise<Map<string, VolumeAgg>> {
  const seasons = await prisma.clientSeason.findMany({
    where: { seasonId, client: { userId } },
    include: {
      client: {
        select: { orgNode: { select: { channelPartnerId: true } } },
      },
    },
  });

  const map = new Map<string, VolumeAgg>();
  for (const cs of seasons) {
    const key = cs.client.orgNode.channelPartnerId ?? "__direct__";
    if (!map.has(key)) map.set(key, emptyAgg());
    addToAgg(map.get(key)!, cs);
  }
  return map;
}
