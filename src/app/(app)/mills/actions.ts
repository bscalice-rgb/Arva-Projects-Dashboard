"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureAdminUser } from "@/lib/user";
import { millSchema, millGroupSchema } from "@/lib/validation";
import { zodMessage, type ActionResult } from "@/lib/action-result";

// ---- Mill Groups (a company owning multiple mills / refineries) ----

export async function createMillGroup(input: unknown): Promise<ActionResult> {
  const parsed = millGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  await prisma.millGroup.create({
    data: { ...parsed.data, userId: await ensureAdminUser() },
  });
  revalidatePath("/mills");
  return { ok: true };
}

export async function updateMillGroup(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = millGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  await prisma.millGroup.update({ where: { id }, data: parsed.data });
  revalidatePath("/mills");
  revalidatePath("/clients");
  return { ok: true };
}

/** Deleting a group keeps its mills — they just become ungrouped. */
export async function deleteMillGroup(id: string): Promise<ActionResult> {
  await prisma.millGroup.delete({ where: { id } });
  revalidatePath("/mills");
  revalidatePath("/clients");
  return { ok: true };
}

export async function createMill(input: unknown): Promise<ActionResult> {
  const parsed = millSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  await prisma.mill.create({
    data: { ...parsed.data, userId: await ensureAdminUser() },
  });
  revalidatePath("/mills");
  revalidatePath("/clients");
  return { ok: true };
}

export async function updateMill(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = millSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  await prisma.mill.update({ where: { id }, data: parsed.data });
  revalidatePath("/mills");
  revalidatePath("/clients");
  return { ok: true };
}

export async function deleteMill(id: string): Promise<ActionResult> {
  const clientCount = await prisma.client.count({ where: { millId: id } });
  if (clientCount > 0) {
    return {
      ok: false,
      error: `Cannot delete: ${clientCount} client(s) link to this mill.`,
    };
  }
  await prisma.mill.delete({ where: { id } });
  revalidatePath("/mills");
  return { ok: true };
}
