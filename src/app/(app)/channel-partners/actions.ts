"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import {
  channelPartnerSchema,
  channelPartnerSeasonSchema,
  revenueSharePayeeSchema,
} from "@/lib/validation";
import { zodMessage, type ActionResult } from "@/lib/action-result";

export async function createChannelPartner(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = channelPartnerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const cp = await prisma.channelPartner.create({
    data: { ...parsed.data, userId: getCurrentUserId() },
  });
  revalidatePath("/channel-partners");
  revalidatePath("/org-nodes");
  return { ok: true, data: { id: cp.id } };
}

export async function updateChannelPartner(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = channelPartnerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  await prisma.channelPartner.update({ where: { id }, data: parsed.data });
  revalidatePath("/channel-partners");
  revalidatePath(`/channel-partners/${id}`);
  return { ok: true };
}

export async function deleteChannelPartner(id: string): Promise<ActionResult> {
  const orgNodeCount = await prisma.orgNode.count({
    where: { channelPartnerId: id },
  });
  if (orgNodeCount > 0) {
    return {
      ok: false,
      error: `Cannot delete: ${orgNodeCount} Org Node(s) link to this Channel Partner.`,
    };
  }
  await prisma.channelPartner.delete({ where: { id } });
  revalidatePath("/channel-partners");
  return { ok: true };
}

/** Create the per-season CP record if it doesn't exist. */
export async function ensureChannelPartnerSeason(
  channelPartnerId: string,
  seasonId: string,
): Promise<ActionResult> {
  await prisma.channelPartnerSeason.upsert({
    where: { channelPartnerId_seasonId: { channelPartnerId, seasonId } },
    update: {},
    create: { channelPartnerId, seasonId },
  });
  revalidatePath(`/channel-partners/${channelPartnerId}`);
  return { ok: true };
}

export async function updateChannelPartnerSeason(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = channelPartnerSeasonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const cps = await prisma.channelPartnerSeason.update({
    where: { id },
    data: parsed.data,
  });
  revalidatePath(`/channel-partners/${cps.channelPartnerId}`);
  revalidatePath("/channel-partners");
  revalidatePath("/");
  return { ok: true };
}

// ---- Revenue-share payees ----

export async function addPayee(
  channelPartnerSeasonId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = revenueSharePayeeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const cps = await prisma.channelPartnerSeason.findUnique({
    where: { id: channelPartnerSeasonId },
    select: { channelPartnerId: true },
  });
  await prisma.revenueSharePayee.create({
    data: { ...parsed.data, channelPartnerSeasonId },
  });
  if (cps) revalidatePath(`/channel-partners/${cps.channelPartnerId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function updatePayee(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = revenueSharePayeeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const payee = await prisma.revenueSharePayee.update({
    where: { id },
    data: parsed.data,
    include: { channelPartnerSeason: { select: { channelPartnerId: true } } },
  });
  revalidatePath(
    `/channel-partners/${payee.channelPartnerSeason.channelPartnerId}`,
  );
  revalidatePath("/");
  return { ok: true };
}

export async function deletePayee(id: string): Promise<ActionResult> {
  const payee = await prisma.revenueSharePayee.delete({
    where: { id },
    include: { channelPartnerSeason: { select: { channelPartnerId: true } } },
  });
  revalidatePath(
    `/channel-partners/${payee.channelPartnerSeason.channelPartnerId}`,
  );
  revalidatePath("/");
  return { ok: true };
}
