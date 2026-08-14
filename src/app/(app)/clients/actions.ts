"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureAdminUser } from "@/lib/user";
import {
  resolveOrgNodeForClient,
  cleanupOrphanDirectOrgNode,
} from "@/lib/org-node";
import {
  clientSchema,
  clientSeasonEditableSchema,
  clientSeasonPatchSchema,
  clientSeasonAreasSchema,
} from "@/lib/validation";
import { zodMessage, type ActionResult } from "@/lib/action-result";
import {
  deriveDataStatus,
  PRACTICE_KEYS,
  type PracticeKey,
} from "@/lib/practices";

/** Recompute a client-season's enrolled total from its crop x state area rows
 *  (total = sum of rows). Delivered is derived, never stored. */
async function syncTotalsFromAreas(clientSeasonId: string) {
  const areas = await prisma.clientSeasonArea.findMany({
    where: { clientSeasonId },
  });
  if (areas.length === 0) {
    await prisma.clientSeason.update({
      where: { id: clientSeasonId },
      data: { enrolledAcres: null, enrolledHectares: null },
    });
    return;
  }
  const sum = (pick: (a: (typeof areas)[number]) => number | null) =>
    areas.reduce((n, a) => n + (pick(a) ?? 0), 0);
  await prisma.clientSeason.update({
    where: { id: clientSeasonId },
    data: {
      enrolledAcres: sum((a) => a.enrolledAcres),
      enrolledHectares: sum((a) => a.enrolledHectares),
    },
  });
}

/** Replace the per-state area breakdown for a client-season and re-sum totals. */
export async function setClientSeasonAreas(
  clientSeasonId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = clientSeasonAreasSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };

  // Keep only rows that carry at least one value.
  const rows = parsed.data.filter(
    (a) => a.enrolledAcres != null || a.enrolledHectares != null,
  );

  // Each crop x state may appear once — the stored rows are keyed on it.
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${r.crop}|${r.regionId}`;
    if (seen.has(key)) {
      return {
        ok: false,
        error: "The same crop + state appears more than once.",
      };
    }
    seen.add(key);
  }

  const cs = await prisma.clientSeason.findUnique({
    where: { id: clientSeasonId },
    select: { clientId: true },
  });
  if (!cs) return { ok: false, error: "Season record not found." };

  await prisma.$transaction([
    prisma.clientSeasonArea.deleteMany({ where: { clientSeasonId } }),
    ...(rows.length > 0
      ? [
          prisma.clientSeasonArea.createMany({
            data: rows.map((a) => ({ ...a, clientSeasonId })),
          }),
        ]
      : []),
  ]);
  await syncTotalsFromAreas(clientSeasonId);

  revalidatePath("/clients");
  revalidatePath(`/clients/${cs.clientId}`);
  revalidatePath("/allotments");
  revalidatePath("/");
  return { ok: true };
}

/** Create a Client identity, and optionally its record for the given season. */
export async function createClient(
  input: unknown,
  seasonId?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const d = parsed.data;

  await ensureAdminUser();
  const orgNodeId = await resolveOrgNodeForClient({
    channelPartnerId: d.channelPartnerId,
    name: d.name,
    country: d.country,
  });

  const client = await prisma.client.create({
    data: {
      orgNodeId,
      name: d.name,
      legalEntity: d.legalEntity,
      country: d.country,
      defaultCrops: d.defaultCrops,
      millId: d.millId,
      regions: { connect: d.regionIds.map((rid) => ({ id: rid })) },
      userId: await ensureAdminUser(),
    },
  });

  if (seasonId) {
    await prisma.clientSeason.upsert({
      where: { clientId_seasonId: { clientId: client.id, seasonId } },
      update: {},
      create: {
        clientId: client.id,
        seasonId,
        crops: d.defaultCrops,
        enrolledAcres: d.enrolledAcres,
        enrolledHectares: d.enrolledHectares,
      },
    });
  }

  revalidatePath("/clients");
  revalidatePath("/channel-partners");
  return { ok: true, data: { id: client.id } };
}

export async function updateClient(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const d = parsed.data;

  const existing = await prisma.client.findUnique({
    where: { id },
    select: { orgNodeId: true },
  });
  const prevOrgNodeId = existing?.orgNodeId ?? null;

  const orgNodeId = await resolveOrgNodeForClient({
    channelPartnerId: d.channelPartnerId,
    name: d.name,
    country: d.country,
    currentOrgNodeId: prevOrgNodeId,
  });

  await prisma.client.update({
    where: { id },
    data: {
      orgNodeId,
      name: d.name,
      legalEntity: d.legalEntity,
      country: d.country,
      defaultCrops: d.defaultCrops,
      millId: d.millId,
      regions: { set: d.regionIds.map((rid) => ({ id: rid })) },
    },
  });

  // If the client moved off a dedicated direct node, clean it up.
  if (prevOrgNodeId && prevOrgNodeId !== orgNodeId) {
    await cleanupOrphanDirectOrgNode(prevOrgNodeId);
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/channel-partners");
  return { ok: true };
}

/** Permanently delete a grower and all of its per-season records. */
export async function deleteClient(id: string): Promise<ActionResult> {
  const client = await prisma.client.findUnique({
    where: { id },
    select: { orgNodeId: true },
  });
  if (!client) return { ok: false, error: "Grower not found." };
  await prisma.client.delete({ where: { id } });
  // If this was a direct grower with a dedicated node, remove the empty node.
  await cleanupOrphanDirectOrgNode(client.orgNodeId);
  revalidatePath("/clients");
  revalidatePath("/channel-partners");
  revalidatePath("/");
  return { ok: true };
}

/** Add an existing client to a season (create its per-season record). */
export async function addClientToSeason(
  clientId: string,
  seasonId: string,
): Promise<ActionResult> {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { ok: false, error: "Client not found." };
  await prisma.clientSeason.upsert({
    where: { clientId_seasonId: { clientId, seasonId } },
    update: {},
    create: { clientId, seasonId, crops: client.defaultCrops },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { ok: true };
}

export async function removeClientFromSeason(
  clientSeasonId: string,
): Promise<ActionResult> {
  await prisma.clientSeason.delete({ where: { id: clientSeasonId } });
  revalidatePath("/clients");
  return { ok: true };
}

/** Full save of the editable per-season fields (detail form). */
export async function saveClientSeason(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = clientSeasonEditableSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };

  const data = { ...parsed.data };
  // When crop x state area rows exist, the enrolled total is derived from them
  // — don't let the whole-grower form overwrite the summed total.
  const areaCount = await prisma.clientSeasonArea.count({
    where: { clientSeasonId: id },
  });
  if (areaCount > 0) {
    delete (data as Record<string, unknown>).enrolledAcres;
    delete (data as Record<string, unknown>).enrolledHectares;
  }

  // Data step is a rollup of the management practices, never set by hand.
  const cs = await prisma.clientSeason.update({
    where: { id },
    data: { ...data, dataStatus: deriveDataStatus(data) },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${cs.clientId}`);
  revalidatePath("/allotments");
  revalidatePath("/");
  return { ok: true };
}

/** Lightweight single/partial field patch (inline table editing). */
export async function patchClientSeason(
  id: string,
  patch: unknown,
): Promise<ActionResult> {
  const parsed = clientSeasonPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const data: Record<string, unknown> = { ...parsed.data };

  // A patch may touch only some practices — re-derive from the merged record.
  if (PRACTICE_KEYS.some((k) => k in data)) {
    const current = await prisma.clientSeason.findUnique({
      where: { id },
      select: Object.fromEntries(PRACTICE_KEYS.map((k) => [k, true])) as Record<
        PracticeKey,
        true
      >,
    });
    if (current) {
      data.dataStatus = deriveDataStatus({ ...current, ...parsed.data });
    }
  }

  const cs = await prisma.clientSeason.update({
    where: { id },
    data,
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${cs.clientId}`);
  revalidatePath("/allotments");
  revalidatePath("/");
  return { ok: true };
}
