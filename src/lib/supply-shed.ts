import type { Country, Crop } from "@prisma/client";

type ShedKeyish = {
  channelPartnerId: string | null;
  /** Direct (no CP) allotments may pin a specific grower as the source. */
  clientId: string | null;
  crop: Crop;
  country: Country;
  regionId: string | null;
};

/**
 * A unit of a grower's area attributed to a single region (or null when a
 * multi-region grower hasn't broken its area down yet). Allotments roll up
 * from these, so a per-state allotment only counts that state's area.
 */
export type AreaUnit = {
  clientId: string;
  cpId: string | null;
  country: Country;
  crops: Crop[];
  regionId: string | null;
  enrolledAcres: number | null;
  enrolledHectares: number | null;
  deliveredAcres: number | null;
  deliveredHectares: number | null;
};

type ClientSeasonForAreas = {
  crops: Crop[];
  enrolledAcres: number | null;
  enrolledHectares: number | null;
  deliveredAcres: number | null;
  deliveredHectares: number | null;
  areas: {
    regionId: string;
    enrolledAcres: number | null;
    enrolledHectares: number | null;
    deliveredAcres: number | null;
    deliveredHectares: number | null;
  }[];
  client: {
    id: string;
    country: Country;
    regions: { id: string }[];
    orgNode: { channelPartnerId: string | null };
  };
};

/**
 * Turn client-season records into region-attributed area units:
 *  - if per-state rows exist, use them (each attributed to its region)
 *  - else if the grower has exactly one region, attribute its total there
 *  - else (multi-region, not yet split) leave it unattributed (regionId null)
 */
export function deriveAreaUnits(seasons: ClientSeasonForAreas[]): AreaUnit[] {
  const units: AreaUnit[] = [];
  for (const cs of seasons) {
    const base = {
      clientId: cs.client.id,
      cpId: cs.client.orgNode.channelPartnerId,
      country: cs.client.country,
      crops: cs.crops,
    };
    if (cs.areas.length > 0) {
      for (const a of cs.areas) {
        units.push({
          ...base,
          regionId: a.regionId,
          enrolledAcres: a.enrolledAcres,
          enrolledHectares: a.enrolledHectares,
          deliveredAcres: a.deliveredAcres,
          deliveredHectares: a.deliveredHectares,
        });
      }
    } else {
      const regionId =
        cs.client.regions.length === 1 ? cs.client.regions[0].id : null;
      units.push({
        ...base,
        regionId,
        enrolledAcres: cs.enrolledAcres,
        enrolledHectares: cs.enrolledHectares,
        deliveredAcres: cs.deliveredAcres,
        deliveredHectares: cs.deliveredHectares,
      });
    }
  }
  return units;
}

/** Does an area unit count toward this allotment (supply shed)? */
export function matchesShed(shed: ShedKeyish, u: AreaUnit): boolean {
  const cropMatch = u.crops.includes(shed.crop);
  const regionMatch =
    shed.regionId == null || u.regionId === shed.regionId;

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
        loadedAcres += u.deliveredAcres ?? 0;
        loadedHectares += u.deliveredHectares ?? 0;
        enrolledAcres += u.enrolledAcres ?? 0;
        enrolledHectares += u.enrolledHectares ?? 0;
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
