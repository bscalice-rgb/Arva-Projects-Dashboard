import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { SeasonsClient } from "./seasons-client";

export const dynamic = "force-dynamic";

export default async function SeasonsPage() {
  const userId = getCurrentUserId();

  const seasons = await prisma.season.findMany({
    orderBy: { year: "desc" },
    include: {
      _count: {
        select: {
          clientSeasons: true,
          channelPartnerSeasons: true,
          supplySheds: true,
        },
      },
      clientSeasons: {
        where: { client: { userId } },
        select: { client: { select: { id: true, name: true } } },
        orderBy: { client: { name: "asc" } },
      },
      channelPartnerSeasons: {
        where: { channelPartner: { userId } },
        select: {
          channelPartner: { select: { id: true, entityName: true } },
        },
        orderBy: { channelPartner: { entityName: "asc" } },
      },
    },
  });

  const regions = await prisma.region.findMany({
    where: { userId },
    orderBy: [{ country: "asc" }, { name: "asc" }],
    select: { id: true, name: true, country: true },
  });

  const clientsBySeason: Record<string, { id: string; name: string }[]> = {};
  const cpsBySeason: Record<string, { id: string; name: string }[]> = {};
  for (const s of seasons) {
    clientsBySeason[s.id] = s.clientSeasons.map((cs) => ({
      id: cs.client.id,
      name: cs.client.name,
    }));
    cpsBySeason[s.id] = s.channelPartnerSeasons.map((cps) => ({
      id: cps.channelPartner.id,
      name: cps.channelPartner.entityName,
    }));
  }

  return (
    <div>
      <PageHeader
        title="Seasons"
        description="Program years and the carry-forward flow for reusing growers and CPs."
      />
      <SeasonsClient
        seasons={seasons.map((s) => ({
          id: s.id,
          year: s.year,
          label: s.label,
          isActive: s.isActive,
          clientCount: s._count.clientSeasons,
          cpCount: s._count.channelPartnerSeasons,
          shedCount: s._count.supplySheds,
        }))}
        clientsBySeason={clientsBySeason}
        cpsBySeason={cpsBySeason}
        regions={regions}
      />
    </div>
  );
}
