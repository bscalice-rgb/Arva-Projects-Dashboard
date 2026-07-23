import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { getSelectedSeason } from "@/lib/season";
import { PageHeader } from "@/components/page-header";
import { NoSeason } from "@/components/no-season";
import { ClientsTable } from "./clients-table";
import { clientSeasonInclude, toClientSeasonRow } from "./types";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const userId = getCurrentUserId();
  const season = await getSelectedSeason();

  if (!season) {
    return (
      <div>
        <PageHeader title="Clients / Growers" />
        <NoSeason />
      </div>
    );
  }

  const [clientSeasons, mills, cps, regions] = await Promise.all([
    prisma.clientSeason.findMany({
      where: { seasonId: season.id, client: { userId } },
      include: clientSeasonInclude,
      orderBy: { client: { name: "asc" } },
    }),
    prisma.mill.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, crop: true },
    }),
    prisma.channelPartner.findMany({
      where: { userId },
      orderBy: { entityName: "asc" },
      select: { id: true, entityName: true },
    }),
    prisma.region.findMany({
      where: { userId },
      orderBy: [{ country: "asc" }, { name: "asc" }],
      select: { id: true, name: true, country: true },
    }),
  ]);

  const rows = clientSeasons.map(toClientSeasonRow);

  return (
    <div>
      <PageHeader
        title="Clients / Growers"
        description={`Per-season enrollment pipeline for ${season.label}. Edit pipeline flags inline; click a client for full detail.`}
      />
      <ClientsTable
        rows={rows}
        channelPartners={cps}
        mills={mills}
        regions={regions}
        channelPartnerNames={cps.map((c) => c.entityName)}
        seasonId={season.id}
        seasonLabel={season.label}
      />
    </div>
  );
}
