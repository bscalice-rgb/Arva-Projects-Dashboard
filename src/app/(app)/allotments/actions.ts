"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ensureAdminUser } from "@/lib/user";
import { supplyShedSchema } from "@/lib/validation";
import { zodMessage, type ActionResult } from "@/lib/action-result";

export async function createSupplyShed(
  seasonId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = supplyShedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const d = parsed.data;
  await prisma.supplyShed.create({
    data: {
      seasonId,
      country: d.country,
      channelPartnerId: d.channelPartnerId,
      crop: d.crop,
      regionId: d.regionId,
      acresNeeded: d.acresNeeded,
      hectaresNeeded: d.hectaresNeeded,
      enteredInCropForce: d.enteredInCropForce,
      userId: await ensureAdminUser(),
    },
  });
  revalidatePath("/allotments");
  revalidatePath("/");
  return { ok: true };
}

export async function updateSupplyShed(
  id: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = supplyShedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: zodMessage(parsed.error) };
  const d = parsed.data;
  await prisma.supplyShed.update({
    where: { id },
    data: {
      country: d.country,
      channelPartnerId: d.channelPartnerId,
      crop: d.crop,
      regionId: d.regionId,
      acresNeeded: d.acresNeeded,
      hectaresNeeded: d.hectaresNeeded,
      enteredInCropForce: d.enteredInCropForce,
    },
  });
  revalidatePath("/allotments");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteSupplyShed(id: string): Promise<ActionResult> {
  await prisma.supplyShed.delete({ where: { id } });
  revalidatePath("/allotments");
  revalidatePath("/");
  return { ok: true };
}
