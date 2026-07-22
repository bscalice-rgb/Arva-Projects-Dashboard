import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { MillsClient } from "./mills-client";

export const dynamic = "force-dynamic";

export default async function MillsPage() {
  const userId = getCurrentUserId();
  const mills = await prisma.mill.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { clients: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Mills / Refineries"
        description="Processing facilities for sugarcane and palm. Clients optionally link to one."
      />
      <MillsClient
        mills={mills.map((m) => ({
          id: m.id,
          name: m.name,
          type: m.type,
          crop: m.crop,
          country: m.country,
          region: m.region,
          notes: m.notes,
          clientCount: m._count.clients,
        }))}
      />
    </div>
  );
}
