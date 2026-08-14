// Data milestones — the management practices captured per grower/season.
// Mirrors the "Update and Confirm Management Practices" list, minus
// Conservation Programs (not used in these projects).
//
// The Data pipeline step is a DERIVED rollup of these: it is DONE once every
// applicable practice is DONE. N/A practices are excluded from that test, so a
// grower without irrigation isn't blocked by it.

import type { ClientSeason, DataStatus, PracticeStatus } from "@prisma/client";

/** ClientSeason keys holding a practice status. */
export type PracticeKey =
  | "practicePlanting"
  | "practiceHarvest"
  | "practiceTillage"
  | "practiceFertilizer"
  | "practiceLiming"
  | "practiceCropProtection"
  | "practiceIrrigation"
  | "practiceCoverCropping"
  | "practiceSoilSampling"
  | "practiceAggregation";

export type Practice = { key: PracticeKey; label: string };

export const PRACTICES: Practice[] = [
  { key: "practicePlanting", label: "Planting" },
  { key: "practiceHarvest", label: "Harvest" },
  { key: "practiceTillage", label: "Tillage" },
  { key: "practiceFertilizer", label: "Fertilizer" },
  { key: "practiceLiming", label: "Liming" },
  { key: "practiceCropProtection", label: "Crop protection" },
  { key: "practiceIrrigation", label: "Irrigation" },
  { key: "practiceCoverCropping", label: "Cover cropping" },
  { key: "practiceSoilSampling", label: "Soil sampling" },
  { key: "practiceAggregation", label: "Aggregation" },
];

export const PRACTICE_KEYS = PRACTICES.map((p) => p.key);

/** The practice fields of a ClientSeason. */
export type PracticeInput = Pick<ClientSeason, PracticeKey>;

export type PracticeProgress = {
  /** Practices that count toward completion (everything not N/A). */
  applicable: number;
  done: number;
  inProgress: number;
  notStarted: number;
  /** N/A — excluded from the completion test. */
  notApplicable: number;
  /** Fraction 0..1 of applicable practices done (1 when none apply). */
  percentComplete: number;
};

export function getPracticeProgress(cs: PracticeInput): PracticeProgress {
  let done = 0;
  let inProgress = 0;
  let notStarted = 0;
  let notApplicable = 0;

  for (const key of PRACTICE_KEYS) {
    switch (cs[key]) {
      case "DONE":
        done += 1;
        break;
      case "IN_PROGRESS":
        inProgress += 1;
        break;
      case "N_A":
        notApplicable += 1;
        break;
      default:
        notStarted += 1;
    }
  }

  const applicable = done + inProgress + notStarted;
  return {
    applicable,
    done,
    inProgress,
    notStarted,
    notApplicable,
    percentComplete: applicable === 0 ? 1 : done / applicable,
  };
}

/**
 * Derive the Data pipeline status from the practices:
 *  - DONE when every applicable practice is DONE (or all are N/A)
 *  - NOT_STARTED when nothing has been touched
 *  - IN_PROGRESS otherwise
 */
export function deriveDataStatus(cs: PracticeInput): DataStatus {
  const p = getPracticeProgress(cs);
  if (p.applicable === 0 || p.done === p.applicable) return "DONE";
  if (p.done === 0 && p.inProgress === 0) return "NOT_STARTED";
  return "IN_PROGRESS";
}

/** Practices still blocking the Data step, in list order (for reports/UI). */
export function pendingPractices(cs: PracticeInput): Practice[] {
  return PRACTICES.filter(
    (p) => cs[p.key] !== "DONE" && cs[p.key] !== "N_A",
  );
}

export type { PracticeStatus };
