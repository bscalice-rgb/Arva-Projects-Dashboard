import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { MillsClient } from "./mills-client";

export const dynamic = "force-dynamic";

export default async function MillsPage() {
  const userId = getCurrentUserId();
  const [mills, groups] = await Promise.all([
    prisma.mill.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: { _count: { select: { clients: true } } },
    }),
    prisma.millGroup.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: { _count: { select: { mills: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Mills / Refineries"
        description="Processing facilities for sugarcane and palm, optionally organized under a group (a company owning multiple mills). Clients optionally link to one."
      />
      <MillsClient
        mills={mills.map((m) => ({
          id: m.id,
          name: m.name,
          crop: m.crop,
          country: m.country,
          region: m.region,
          notes: m.notes,
          groupId: m.groupId,
          clientCount: m._count.clients,
        }))}
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          country: g.country,
          notes: g.notes,
          millCount: g._count.mills,
        }))}
      />
    </div>
  );
}
