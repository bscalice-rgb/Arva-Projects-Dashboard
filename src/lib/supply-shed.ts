import type { Country, Crop } from "@prisma/client";
import type { AreaUnit } from "@/lib/area";

export { deriveAreaUnits } from "@/lib/area";
export type { AreaUnit } from "@/lib/area";

type ShedKeyish = {
  channelPartnerId: string | null;
  /** Direct (no CP) allotments may pin a specific grower as the source. */
  clientId: string | null;
  crop: Crop;
  country: Country;
  regionId: string | null;
};

/**
 * Does an area unit count toward this allotment (supply shed)?
 *
 * Units carry exactly one crop and one state, so an allotment for
 * "Soybeans in Buenos Aires" picks up only the soybean row for that state —
 * not the same grower's corn in another state.
 */
export function matchesShed(shed: ShedKeyish, u: AreaUnit): boolean {
  const cropMatch = u.crop === shed.crop;
  const regionMatch = shed.regionId == null || u.regionId === shed.regionId;

  // A grower-pinned (direct) allotment loads only from that grower.
  if (shed.clientId != null) {
    return u.clientId === shed.clientId && cropMatch && regionMatch;
  }
  const cpMatch = (shed.channelPartnerId ?? null) === (u.cpId ?? null);
  const countryMatch = shed.country === u.country;
  return cpMatch && cropMatch && countryMatch && regionMatch;
}

export type ShedLoaded = {
  loadedAcres: number;
  loadedHectares: number;
  enrolledAcres: number;
  enrolledHectares: number;
};

/** Auto-roll-up enrolled + delivered area per allotment from matching units. */
export function computeShedLoaded<T extends ShedKeyish & { id: string }>(
  sheds: T[],
  units: AreaUnit[],
): Map<string, ShedLoaded> {
  const map = new Map<string, ShedLoaded>();
  for (const shed of sheds) {
    let loadedAcres = 0;
    let loadedHectares = 0;
    let enrolledAcres = 0;
    let enrolledHectares = 0;
    for (const u of units) {
      if (matchesShed(shed, u)) {
        loadedAcres += u.deliveredAcres;
        loadedHectares += u.deliveredHectares;
        enrolledAcres += u.enrolledAcres;
        enrolledHectares += u.enrolledHectares;
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
