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

  const [clientSeasons, orgNodes, mills, cps] = await Promise.all([
    prisma.clientSeason.findMany({
      where: { seasonId: season.id, client: { userId } },
      include: clientSeasonInclude,
      orderBy: { client: { name: "asc" } },
    }),
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
    prisma.channelPartner.findMany({
      where: { userId },
      orderBy: { entityName: "asc" },
      select: { entityName: true },
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
        orgNodes={orgNodes}
        mills={mills}
        channelPartnerNames={cps.map((c) => c.entityName)}
        seasonId={season.id}
        seasonLabel={season.label}
      />
    </div>
  );
}
