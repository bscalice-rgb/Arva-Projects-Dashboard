"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { seasonSchema, regionSchema } from "@/lib/validation";
import { zodMessage, type ActionResult } from "@/lib/action-result";
import { ensureAdminUser } from "@/lib/user";

// ---- Countries & Regions (managed list) ----

export async function createRegion(input: unknown): Promise<ActionResult> {
  const parsed = regionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const userId = await ensureAdminUser();
  const existing = await prisma.region.findFirst({
    where: { userId, country: parsed.data.country, name: parsed.data.name },
  });
  if (existing) {
    return { ok: false, error: "That region already exists for this country." };
  }
  await prisma.region.create({ data: { ...parsed.data, userId } });
  revalidatePath("/seasons");
  revalidatePath("/clients");
  revalidatePath("/allotments");
  return { ok: true };
}

export async function deleteRegion(id: string): Promise<ActionResult> {
  await prisma.region.delete({ where: { id } });
  revalidatePath("/seasons");
  revalidatePath("/clients");
  revalidatePath("/allotments");
  return { ok: true };
}

export async function createSeason(input: unknown): Promise<ActionResult> {
  const parsed = seasonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const d = parsed.data;

  const existing = await prisma.season.findUnique({ where: { year: d.year } });
  if (existing) {
    return { ok: false, error: `A season for ${d.year} already exists.` };
  }

  await prisma.$transaction(async (tx) => {
    if (d.isActive) {
      await tx.season.updateMany({ data: { isActive: false } });
    }
    await tx.season.create({
      data: { year: d.year, label: d.label, isActive: d.isActive },
    });
  });

  revalidatePath("/seasons");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateSeason(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = seasonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const d = parsed.data;

  const clash = await prisma.season.findFirst({
    where: { year: d.year, NOT: { id } },
  });
  if (clash) return { ok: false, error: `Year ${d.year} is already used.` };

  await prisma.$transaction(async (tx) => {
    if (d.isActive) {
      await tx.season.updateMany({
        where: { NOT: { id } },
        data: { isActive: false },
      });
    }
    await tx.season.update({
      where: { id },
      data: { year: d.year, label: d.label, isActive: d.isActive },
    });
  });

  revalidatePath("/seasons");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setActiveSeason(id: string): Promise<ActionResult> {
  await prisma.$transaction([
    prisma.season.updateMany({ data: { isActive: false } }),
    prisma.season.update({ where: { id }, data: { isActive: true } }),
  ]);
  revalidatePath("/seasons");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteSeason(id: string): Promise<ActionResult> {
  const [csCount, cpsCount, shedCount] = await Promise.all([
    prisma.clientSeason.count({ where: { seasonId: id } }),
    prisma.channelPartnerSeason.count({ where: { seasonId: id } }),
    prisma.supplyShed.count({ where: { seasonId: id } }),
  ]);
  if (csCount + cpsCount + shedCount > 0) {
    return {
      ok: false,
      error: `Cannot delete: season has ${csCount} client, ${cpsCount} CP and ${shedCount} supply-shed records. Remove them first.`,
    };
  }
  await prisma.season.delete({ where: { id } });
  revalidatePath("/seasons");
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Carry forward selected clients/CPs into a target season.
 * Stable identity is pre-filled by the existing Client/CP records. Only the W-8
 * status carries over; contract, pipeline, bank details, outcomes and payment
 * reset. A reference to the source record is retained (carriedForwardFromId).
 */
export async function carryForward(input: {
  sourceSeasonId: string;
  targetSeasonId: string;
  clientIds: string[];
  channelPartnerIds: string[];
}): Promise<ActionResult<{ clients: number; cps: number }>> {
  const { sourceSeasonId, targetSeasonId, clientIds, channelPartnerIds } =
    input;

  if (!targetSeasonId) return { ok: false, error: "Pick a target season." };
  if (sourceSeasonId === targetSeasonId) {
    return { ok: false, error: "Source and target seasons must differ." };
  }

  let clientsCreated = 0;
  let cpsCreated = 0;

  // ---- Clients ----
  for (const clientId of clientIds) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) continue;

    const source = await prisma.clientSeason.findUnique({
      where: { clientId_seasonId: { clientId, seasonId: sourceSeasonId } },
    });

    const already = await prisma.clientSeason.findUnique({
      where: { clientId_seasonId: { clientId, seasonId: targetSeasonId } },
    });
    if (already) continue;

    await prisma.clientSeason.create({
      data: {
        clientId,
        seasonId: targetSeasonId,
        crops: source?.crops ?? client.defaultCrops,
        // Only the W-8 carries over.
        w8Type: source?.w8Type ?? null,
        w8InCropForce: source?.w8InCropForce ?? false,
        w8MatchesLegalEntity: source?.w8MatchesLegalEntity ?? false,
        // Reference to last year's record for convenience.
        carriedForwardFromId: source?.id ?? null,
      },
    });
    clientsCreated += 1;
  }

  // ---- Channel Partners ----
  for (const channelPartnerId of channelPartnerIds) {
    const source = await prisma.channelPartnerSeason.findUnique({
      where: {
        channelPartnerId_seasonId: {
          channelPartnerId,
          seasonId: sourceSeasonId,
        },
      },
    });

    const already = await prisma.channelPartnerSeason.findUnique({
      where: {
        channelPartnerId_seasonId: {
          channelPartnerId,
          seasonId: targetSeasonId,
        },
      },
    });
    if (already) continue;

    await prisma.channelPartnerSeason.create({
      data: {
        channelPartnerId,
        seasonId: targetSeasonId,
        // Only W-8 carries; agreement/bank/payment reset. Rev-share resets.
        w8Provided: source?.w8Provided ?? false,
      },
    });
    cpsCreated += 1;
  }

  revalidatePath("/seasons");
  revalidatePath("/clients");
  revalidatePath("/channel-partners");
  revalidatePath("/", "layout");
  return { ok: true, data: { clients: clientsCreated, cps: cpsCreated } };
}
