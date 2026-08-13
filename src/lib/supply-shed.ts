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

export type ShedLoaded = { loadedAcres: number; loadedHectares: number };

/** Auto-roll-up loaded (delivered) area per allotment. */
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
