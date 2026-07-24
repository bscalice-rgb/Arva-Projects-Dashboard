// The grower execution pipeline.
// The ORDER is defined here in one place so it is easy to edit. Each stage has
// a predicate over the per-season record. "Current stage" = first incomplete step.
// This powers progress %, the dashboard funnel/bottleneck view, and (in V2) the
// deadline "required minimum stage" hook via `stageIndex`.
//
// Full order (per feedback): Boundaries upload > Data upload > Legal Entity
// Setup > Requested > QA/QC > Evidencing > ECC > Confirmed > W-8 >
// Contract & Bank Details. Outcomes (fields, tCO₂e, delivered area, amount)
// are contract results, not pipeline steps.

import type { ClientSeason } from "@prisma/client";

/** Fields of a ClientSeason the pipeline predicates read. */
export type PipelineInput = Pick<
  ClientSeason,
  | "boundariesStatus"
  | "dataStatus"
  | "legalEntitySetup"
  | "fieldRequested"
  | "qaqc"
  | "evidencing"
  | "ecc"
  | "fieldConfirmed"
  | "w8Type"
  | "w8InCropForce"
  | "w8MatchesLegalEntity"
  | "contractStatus"
  | "contractApprovedInCropForce"
  | "bankDetails"
>;

export type PipelineStage = {
  key: string;
  label: string;
  /** Short label for compact funnel/badges. */
  shortLabel: string;
  isComplete: (cs: PipelineInput) => boolean;
};

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    key: "boundaries",
    label: "Boundaries upload",
    shortLabel: "Boundaries",
    isComplete: (cs) => cs.boundariesStatus === "DONE",
  },
  {
    key: "dataUpload",
    label: "Data upload",
    shortLabel: "Data",
    isComplete: (cs) => cs.dataStatus === "DONE",
  },
  {
    key: "legalEntitySetup",
    label: "Legal entity setup",
    shortLabel: "Legal entity",
    isComplete: (cs) => cs.legalEntitySetup,
  },
  {
    key: "requested",
    label: "Requested",
    shortLabel: "Requested",
    isComplete: (cs) => cs.fieldRequested,
  },
  {
    key: "qaqc",
    label: "QA/QC",
    shortLabel: "QA/QC",
    isComplete: (cs) => cs.qaqc === "DONE",
  },
  {
    key: "evidencing",
    label: "Evidencing",
    shortLabel: "Evidencing",
    isComplete: (cs) => cs.evidencing === "ATTACHED",
  },
  {
    key: "ecc",
    label: "ECC",
    shortLabel: "ECC",
    isComplete: (cs) => cs.ecc === "CONFIRMED",
  },
  {
    key: "confirmed",
    label: "Confirmed",
    shortLabel: "Confirmed",
    isComplete: (cs) => cs.fieldConfirmed,
  },
  {
    key: "w8",
    label: "W-8 (type + in CropForce + matches legal entity)",
    shortLabel: "W-8",
    isComplete: (cs) =>
      cs.w8Type != null && cs.w8InCropForce && cs.w8MatchesLegalEntity,
  },
  {
    key: "contractBank",
    label: "Contract & bank details (signed + approved + bank on file)",
    shortLabel: "Contract & bank",
    isComplete: (cs) =>
      cs.contractStatus === "SIGNED" &&
      cs.contractApprovedInCropForce &&
      cs.bankDetails,
  },
];

export const PIPELINE_STAGE_COUNT = PIPELINE_STAGES.length;

export type PipelineStatus = {
  /** Index of the first incomplete stage (0-based). Equals stage count when fully done. */
  stageIndex: number;
  /** Human label of the current (first incomplete) stage, or "Complete". */
  currentStage: string;
  /** Short label of the current stage, or "Complete". */
  currentStageShort: string;
  /** Fraction 0..1 of leading completed stages. */
  percentComplete: number;
  /** Per-stage completion flags in order. */
  completed: boolean[];
  isComplete: boolean;
};

export function getPipelineStatus(cs: PipelineInput): PipelineStatus {
  const completed = PIPELINE_STAGES.map((s) => s.isComplete(cs));
  let stageIndex = completed.findIndex((c) => !c);
  if (stageIndex === -1) stageIndex = PIPELINE_STAGE_COUNT;

  const isComplete = stageIndex === PIPELINE_STAGE_COUNT;
  const stage = isComplete ? null : PIPELINE_STAGES[stageIndex];

  return {
    stageIndex,
    currentStage: stage ? stage.label : "Complete",
    currentStageShort: stage ? stage.shortLabel : "Complete",
    // Progress = leading completed steps / total (ordered checklist semantics).
    percentComplete: stageIndex / PIPELINE_STAGE_COUNT,
    completed,
    isComplete,
  };
}
