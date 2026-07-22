import type { Country, Crop } from "@prisma/client";

export function normalizeRegion(r: string | null | undefined): string {
  return (r ?? "").trim().toLowerCase();
}

type ShedKeyish = {
  channelPartnerId: string | null;
  crop: Crop;
  country: Country;
  region: string | null;
};

type ClientSeasonForMatch = {
  crop: Crop;
  deliveredAcres: number | null;
  deliveredHectares: number | null;
  client: {
    country: Country;
    region: string | null;
    orgNode: { channelPartnerId: string | null };
  };
};

/** Does a delivered client-season count toward this supply shed? */
export function matchesShed(
  shed: ShedKeyish,
  cs: ClientSeasonForMatch,
): boolean {
  return (
    (shed.channelPartnerId ?? null) ===
      (cs.client.orgNode.channelPartnerId ?? null) &&
    shed.crop === cs.crop &&
    shed.country === cs.client.country &&
    normalizeRegion(shed.region) === normalizeRegion(cs.client.region)
  );
}

export type ShedLoaded = { loadedAcres: number; loadedHectares: number };

/** Auto-roll-up loaded (delivered) area per supply shed. */
export function computeShedLoaded<T extends ShedKeyish & { id: string }>(
  sheds: T[],
  clientSeasons: ClientSeasonForMatch[],
): Map<string, ShedLoaded> {
  const map = new Map<string, ShedLoaded>();
  for (const shed of sheds) {
    let loadedAcres = 0;
    let loadedHectares = 0;
    for (const cs of clientSeasons) {
      if (matchesShed(shed, cs)) {
        loadedAcres += cs.deliveredAcres ?? 0;
        loadedHectares += cs.deliveredHectares ?? 0;
      }
    }
    map.set(shed.id, { loadedAcres, loadedHectares });
  }
  return map;
}
