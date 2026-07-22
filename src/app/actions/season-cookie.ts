"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SEASON_COOKIE } from "@/lib/season";

export async function setSelectedSeason(seasonId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SEASON_COOKIE, seasonId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
