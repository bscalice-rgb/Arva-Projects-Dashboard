import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/auth";

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim() || "admin@arvaintelligence.com";

/**
 * Ensure the admin owner row exists, then return its id. Called before any
 * mutation that stamps `userId`, so a fresh database (no seed run) works without
 * a foreign-key violation. Idempotent.
 */
export async function ensureAdminUser(): Promise<string> {
  const id = getCurrentUserId();
  await prisma.user.upsert({
    where: { id },
    update: {},
    create: { id, email: ADMIN_EMAIL, name: "Admin" },
  });
  return id;
}
