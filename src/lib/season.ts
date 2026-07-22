import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { Season } from "@prisma/client";

const SEASON_COOKIE = "arva_season_id";

export async function getSeasons(): Promise<Season[]> {
  return prisma.season.findMany({ orderBy: { year: "desc" } });
}

export async function getActiveSeason(): Promise<Season | null> {
  const active = await prisma.season.findFirst({ where: { isActive: true } });
  if (active) return active;
  return prisma.season.findFirst({ orderBy: { year: "desc" } });
}

/**
 * The currently-selected season: cookie override if valid, else the active
 * season, else the most recent. Null only when no seasons exist yet.
 */
export async function getSelectedSeason(): Promise<Season | null> {
  const cookieStore = await cookies();
  const cookieId = cookieStore.get(SEASON_COOKIE)?.value;

  if (cookieId) {
    const fromCookie = await prisma.season.findUnique({
      where: { id: cookieId },
    });
    if (fromCookie) return fromCookie;
  }
  return getActiveSeason();
}

export { SEASON_COOKIE };
