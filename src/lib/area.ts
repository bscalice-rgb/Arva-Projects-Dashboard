// Grower area, as one atomic unit per crop x state.
//
// Every area figure in the app — a grower's total, "all hectares of soybeans",
// "all hectares in Buenos Aires", "soybeans in Buenos Aires", an allotment's
// loaded volume — is a sum over these units. Group by whichever dimensions the
// KPI needs; the numbers always reconcile because they come from one source.
//
// Delivered area is NOT stored. A grower's area counts as delivered once its
// execution pipeline is complete, so delivery follows the pipeline rather than
// being tracked twice.

import type { Country, Crop } from "@prisma/client";
import { getPipelineStatus, type PipelineInput } from "@/lib/pipeline";

export type AreaUnit = {
  clientId: string;
  cpId: string | null;
  country: Country;
  /** Null only for legacy area that predates the crop x state grid. */
  crop: Crop | null;
  regionId: string | null;
  enrolledAcres: number;
  enrolledHectares: number;
  /** True once the grower's execution pipeline is complete. */
  delivered: boolean;
  /** Enrolled area if delivered, else 0. */
  deliveredAcres: number;
  deliveredHectares: number;
};

type AreaRow = {
  crop: Crop;
  regionId: string;
  enrolledAcres: number | null;
  enrolledHectares: number | null;
};

export type ClientSeasonForAreas = PipelineInput & {
  crops: Crop[];
  enrolledAcres: number | null;
  enrolledHectares: number | null;
  areas: AreaRow[];
  client: {
    id: string;
    country: Country;
    regions: { id: string }[];
    orgNode: { channelPartnerId: string | null };
  };
};

/**
 * Flatten grower-seasons into crop x state area units.
 *
 * Normally one unit per stored area row. The fallback covers legacy records
 * that never got broken down: their total is attributed when the crop and
 * region are unambiguous, and left unattributed otherwise (it still counts
 * toward grower and country totals, just not a specific crop or state).
 */
export function deriveAreaUnits(seasons: ClientSeasonForAreas[]): AreaUnit[] {
  const units: AreaUnit[] = [];

  for (const cs of seasons) {
    const delivered = getPipelineStatus(cs).isComplete;
    const base = {
      clientId: cs.client.id,
      cpId: cs.client.orgNode.channelPartnerId,
      country: cs.client.country,
      delivered,
    };

    const push = (
      crop: Crop | null,
      regionId: string | null,
      acres: number | null,
      hectares: number | null,
    ) => {
      const enrolledAcres = acres ?? 0;
      const enrolledHectares = hectares ?? 0;
      units.push({
        ...base,
        crop,
        regionId,
        enrolledAcres,
        enrolledHectares,
        deliveredAcres: delivered ? enrolledAcres : 0,
        deliveredHectares: delivered ? enrolledHectares : 0,
      });
    };

    if (cs.areas.length > 0) {
      for (const a of cs.areas) {
        push(a.crop, a.regionId, a.enrolledAcres, a.enrolledHectares);
      }
    } else if (cs.enrolledAcres != null || cs.enrolledHectares != null) {
      push(
        cs.crops.length === 1 ? cs.crops[0] : null,
        cs.client.regions.length === 1 ? cs.client.regions[0].id : null,
        cs.enrolledAcres,
        cs.enrolledHectares,
      );
    }
  }

  return units;
}

export type AreaTotals = {
  enrolledAcres: number;
  enrolledHectares: number;
  deliveredAcres: number;
  deliveredHectares: number;
};

export function emptyAreaTotals(): AreaTotals {
  return {
    enrolledAcres: 0,
    enrolledHectares: 0,
    deliveredAcres: 0,
    deliveredHectares: 0,
  };
}

export function sumAreas(units: AreaUnit[]): AreaTotals {
  const t = emptyAreaTotals();
  for (const u of units) {
    t.enrolledAcres += u.enrolledAcres;
    t.enrolledHectares += u.enrolledHectares;
    t.deliveredAcres += u.deliveredAcres;
    t.deliveredHectares += u.deliveredHectares;
  }
  return t;
}

/**
 * Group units by any key — the hierarchical roll-up.
 *   groupAreas(units, (u) => u.crop)                    // by crop
 *   groupAreas(units, (u) => u.regionId)                // by state
 *   groupAreas(units, (u) => `${u.crop}|${u.regionId}`) // by crop x state
 */
export function groupAreas<K>(
  units: AreaUnit[],
  keyFn: (u: AreaUnit) => K,
): Map<K, AreaTotals> {
  const map = new Map<K, AreaTotals>();
  for (const u of units) {
    const key = keyFn(u);
    let t = map.get(key);
    if (!t) {
      t = emptyAreaTotals();
      map.set(key, t);
    }
    t.enrolledAcres += u.enrolledAcres;
    t.enrolledHectares += u.enrolledHectares;
    t.deliveredAcres += u.deliveredAcres;
    t.deliveredHectares += u.deliveredHectares;
  }
  return map;
}

/** Delivered area for one grower-season: its enrolled area once complete. */
export function deliveredFor(
  cs: PipelineInput & {
    enrolledAcres: number | null;
    enrolledHectares: number | null;
  },
): { deliveredAcres: number; deliveredHectares: number } {
  const complete = getPipelineStatus(cs).isComplete;
  return {
    deliveredAcres: complete ? cs.enrolledAcres ?? 0 : 0,
    deliveredHectares: complete ? cs.enrolledHectares ?? 0 : 0,
  };
}
