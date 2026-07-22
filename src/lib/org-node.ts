import { prisma } from "@/lib/prisma";
import { ensureAdminUser } from "@/lib/user";
import type { Country } from "@prisma/client";

/**
 * Org Nodes are managed automatically, not created by hand:
 *  - a Channel Partner IS its own Org Node (kind CHANNEL_PARTNER)
 *  - a direct grower gets its own dedicated Org Node (kind DIRECT_GROWER)
 * These helpers keep that invariant so the UI only ever deals with CPs/growers.
 */

/** Get (or lazily create) the Org Node that represents a Channel Partner. */
export async function ensureCpOrgNode(channelPartnerId: string): Promise<string> {
  const existing = await prisma.orgNode.findFirst({
    where: { channelPartnerId, kind: "CHANNEL_PARTNER" },
  });
  if (existing) return existing.id;

  const cp = await prisma.channelPartner.findUnique({
    where: { id: channelPartnerId },
  });
  if (!cp) throw new Error("Channel Partner not found");

  const userId = await ensureAdminUser();
  const node = await prisma.orgNode.create({
    data: {
      name: cp.entityName,
      kind: "CHANNEL_PARTNER",
      country: cp.country,
      channelPartnerId,
      userId,
    },
  });
  return node.id;
}

/** Create a dedicated Org Node for a single direct grower. */
export async function createDirectOrgNode(
  name: string,
  country: Country,
): Promise<string> {
  const userId = await ensureAdminUser();
  const node = await prisma.orgNode.create({
    data: {
      name: `${name} (Direct)`,
      kind: "DIRECT_GROWER",
      country,
      userId,
    },
  });
  return node.id;
}

/**
 * Resolve the Org Node a client should belong to based on its enrollment
 * channel. For direct growers we reuse the client's existing direct node when
 * possible, otherwise create a fresh one.
 */
export async function resolveOrgNodeForClient(params: {
  channelPartnerId: string | null;
  name: string;
  country: Country;
  currentOrgNodeId?: string | null;
}): Promise<string> {
  const { channelPartnerId, name, country, currentOrgNodeId } = params;

  if (channelPartnerId) {
    return ensureCpOrgNode(channelPartnerId);
  }

  // Direct grower: reuse an existing dedicated direct node if this client owns one.
  if (currentOrgNodeId) {
    const current = await prisma.orgNode.findUnique({
      where: { id: currentOrgNodeId },
      include: { _count: { select: { clients: true } } },
    });
    if (
      current &&
      current.kind === "DIRECT_GROWER" &&
      current.channelPartnerId == null &&
      current._count.clients <= 1
    ) {
      await prisma.orgNode.update({
        where: { id: current.id },
        data: { name: `${name} (Direct)`, country },
      });
      return current.id;
    }
  }
  return createDirectOrgNode(name, country);
}

/** Delete a direct Org Node if it has been left with no clients. */
export async function cleanupOrphanDirectOrgNode(orgNodeId: string) {
  const node = await prisma.orgNode.findUnique({
    where: { id: orgNodeId },
    include: { _count: { select: { clients: true } } },
  });
  if (
    node &&
    node.kind === "DIRECT_GROWER" &&
    node.channelPartnerId == null &&
    node._count.clients === 0
  ) {
    await prisma.orgNode.delete({ where: { id: orgNodeId } });
  }
}
