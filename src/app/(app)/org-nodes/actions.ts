"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureAdminUser } from "@/lib/user";
import { orgNodeSchema } from "@/lib/validation";
import { zodMessage, type ActionResult } from "@/lib/action-result";

export async function createOrgNode(input: unknown): Promise<ActionResult> {
  const parsed = orgNodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const d = parsed.data;

  await prisma.orgNode.create({
    data: {
      name: d.name,
      kind: d.kind,
      country: d.country,
      channelPartnerId:
        d.kind === "CHANNEL_PARTNER" ? d.channelPartnerId : null,
      userId: await ensureAdminUser(),
    },
  });
  revalidatePath("/org-nodes");
  revalidatePath("/clients");
  return { ok: true };
}

export async function updateOrgNode(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = orgNodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const d = parsed.data;

  await prisma.orgNode.update({
    where: { id },
    data: {
      name: d.name,
      kind: d.kind,
      country: d.country,
      channelPartnerId:
        d.kind === "CHANNEL_PARTNER" ? d.channelPartnerId : null,
    },
  });
  revalidatePath("/org-nodes");
  revalidatePath("/clients");
  return { ok: true };
}

export async function deleteOrgNode(id: string): Promise<ActionResult> {
  const clientCount = await prisma.client.count({ where: { orgNodeId: id } });
  if (clientCount > 0) {
    return {
      ok: false,
      error: `Cannot delete: ${clientCount} client(s) belong to this Org Node.`,
    };
  }
  await prisma.orgNode.delete({ where: { id } });
  revalidatePath("/org-nodes");
  return { ok: true };
}
