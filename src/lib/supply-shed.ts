import type { Country, Crop } from "@prisma/client";

type ShedKeyish = {
  channelPartnerId: string | null;
  /** Direct (no CP) allotments may pin a specific grower as the source. */
  clientId: string | null;
  crop: Crop;
  country: Country;
  regionId: string | null;
};

type ClientSeasonForMatch = {
  crops: Crop[];
  deliveredAcres: number | null;
  deliveredHectares: number | null;
  // Optional: enrolled area, for early/mid-season progress before delivery.
  enrolledAcres?: number | null;
  enrolledHectares?: number | null;
  client: {
    id: string;
    country: Country;
    regionIds: string[];
    orgNode: { channelPartnerId: string | null };
  };
};

/** Does a delivered client-season count toward this allotment (supply shed)? */
export function matchesShed(
  shed: ShedKeyish,
  cs: ClientSeasonForMatch,
): boolean {
  // A grower-pinned (direct) allotment loads only from that grower.
  if (shed.clientId != null) {
    return cs.client.id === shed.clientId && cs.crops.includes(shed.crop);
  }
  const cpMatch =
    (shed.channelPartnerId ?? null) ===
    (cs.client.orgNode.channelPartnerId ?? null);
  const cropMatch = cs.crops.includes(shed.crop);
  const countryMatch = shed.country === cs.client.country;
  const regionMatch =
    shed.regionId == null || cs.client.regionIds.includes(shed.regionId);
  return cpMatch && cropMatch && countryMatch && regionMatch;
}

export type ShedLoaded = {
  /** Delivered (loaded) area — fills in late in the season. */
  loadedAcres: number;
  loadedHectares: number;
  /** Enrolled area — available early/mid-season for progress tracking. */
  enrolledAcres: number;
  enrolledHectares: number;
};

/** Auto-roll-up enrolled + delivered area per allotment from matching growers. */
export function computeShedLoaded<T extends ShedKeyish & { id: string }>(
  sheds: T[],
  clientSeasons: ClientSeasonForMatch[],
): Map<string, ShedLoaded> {
  const map = new Map<string, ShedLoaded>();
  for (const shed of sheds) {
    let loadedAcres = 0;
    let loadedHectares = 0;
    let enrolledAcres = 0;
    let enrolledHectares = 0;
    for (const cs of clientSeasons) {
      if (matchesShed(shed, cs)) {
        loadedAcres += cs.deliveredAcres ?? 0;
        loadedHectares += cs.deliveredHectares ?? 0;
        enrolledAcres += cs.enrolledAcres ?? 0;
        enrolledHectares += cs.enrolledHectares ?? 0;
      }
    }
    map.set(shed.id, {
      loadedAcres,
      loadedHectares,
      enrolledAcres,
      enrolledHectares,
    });
  }
  return map;
}
