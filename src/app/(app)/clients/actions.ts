"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureAdminUser } from "@/lib/user";
import {
  clientSchema,
  clientSeasonEditableSchema,
  clientSeasonPatchSchema,
} from "@/lib/validation";
import { zodMessage, type ActionResult } from "@/lib/action-result";

/** Create a Client identity, and optionally its record for the given season. */
export async function createClient(
  input: unknown,
  seasonId?: string,
): Promise<ActionResult<{ id: string }>> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const d = parsed.data;

  const client = await prisma.client.create({
    data: {
      orgNodeId: d.orgNodeId,
      name: d.name,
      legalEntity: d.legalEntity,
      country: d.country,
      defaultCrop: d.defaultCrop,
      millId: d.millId,
      region: d.region,
      userId: await ensureAdminUser(),
    },
  });

  if (seasonId) {
    await prisma.clientSeason.upsert({
      where: { clientId_seasonId: { clientId: client.id, seasonId } },
      update: {},
      create: { clientId: client.id, seasonId, crop: d.defaultCrop },
    });
  }

  revalidatePath("/clients");
  revalidatePath("/org-nodes");
  return { ok: true, data: { id: client.id } };
}

export async function updateClient(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const d = parsed.data;
  await prisma.client.update({
    where: { id },
    data: {
      orgNodeId: d.orgNodeId,
      name: d.name,
      legalEntity: d.legalEntity,
      country: d.country,
      defaultCrop: d.defaultCrop,
      millId: d.millId,
      region: d.region,
    },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { ok: true };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
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
    create: { clientId, seasonId, crop: client.defaultCrop },
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
  const cs = await prisma.clientSeason.update({
    where: { id },
    data: parsed.data,
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${cs.clientId}`);
  revalidatePath("/supply-sheds");
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
  const cs = await prisma.clientSeason.update({
    where: { id },
    data: parsed.data,
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${cs.clientId}`);
  revalidatePath("/supply-sheds");
  revalidatePath("/");
  return { ok: true };
}
