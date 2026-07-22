"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";
import { millSchema } from "@/lib/validation";
import { zodMessage, type ActionResult } from "@/lib/action-result";

export async function createMill(input: unknown): Promise<ActionResult> {
  const parsed = millSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  await prisma.mill.create({
    data: { ...parsed.data, userId: getCurrentUserId() },
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
