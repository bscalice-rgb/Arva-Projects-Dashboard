import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { PageHeader } from "@/components/page-header";
import { OrgNodesClient } from "./org-nodes-client";

export const dynamic = "force-dynamic";

export default async function OrgNodesPage() {
  const userId = getCurrentUserId();
  const [orgNodes, channelPartners] = await Promise.all([
    prisma.orgNode.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: {
        channelPartner: { select: { entityName: true } },
        _count: { select: { clients: true } },
      },
    }),
    prisma.channelPartner.findMany({
      where: { userId },
      orderBy: { entityName: "asc" },
      select: { id: true, entityName: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Org Nodes"
        description="Top-level CropForce repositories — each is a Channel Partner or a direct grower."
      />
      <OrgNodesClient
        orgNodes={orgNodes.map((n) => ({
          id: n.id,
          name: n.name,
          kind: n.kind,
          country: n.country,
          channelPartnerId: n.channelPartnerId,
          channelPartnerName: n.channelPartner?.entityName ?? null,
          clientCount: n._count.clients,
        }))}
        channelPartners={channelPartners}
      />
    </div>
  );
}
