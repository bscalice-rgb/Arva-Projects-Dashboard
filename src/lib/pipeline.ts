// The grower execution pipeline (Section 6 of the spec).
// The ORDER is defined here in one place so it is easy to edit. Each stage has
// a predicate over the per-season record. "Current stage" = first incomplete step.
// This powers progress %, the dashboard funnel/bottleneck view, and (in V2) the
// deadline "required minimum stage" hook via `stageIndex`.

import type { ClientSeason } from "@prisma/client";

/** Fields of a ClientSeason the pipeline predicates read. */
export type PipelineInput = Pick<
  ClientSeason,
  | "legalEntitySetup"
  | "dataStatus"
  | "fieldRequested"
  | "qaqcNpks"
  | "qaqcFlags"
  | "fieldConfirmed"
  | "evidencing"
  | "ecc"
  | "eccLink"
  | "w8Type"
  | "w8InCropForce"
  | "w8MatchesLegalEntity"
  | "contractStatus"
  | "contractApprovedInCropForce"
  | "bankDetails"
  | "fields"
  | "tCO2e"
  | "deliveredAcres"
  | "deliveredHectares"
  | "amount"
  | "paymentDone"
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
    key: "legalEntitySetup",
    label: "Legal entity setup",
    shortLabel: "Legal entity",
    isComplete: (cs) => cs.legalEntitySetup,
  },
  {
    key: "dataUploaded",
    label: "Data uploaded",
    shortLabel: "Data",
    isComplete: (cs) => cs.dataStatus === "DONE",
  },
  {
    key: "fieldRequested",
    label: "Field requested",
    shortLabel: "Field req.",
    isComplete: (cs) => cs.fieldRequested,
  },
  {
    key: "qaqc",
    label: "QA/QC (NPKS fix + flags resolved)",
    shortLabel: "QA/QC",
    isComplete: (cs) =>
      cs.qaqcNpks === "DONE" &&
      (cs.qaqcFlags === "RESOLVED" || cs.qaqcFlags === "NONE"),
  },
  {
    key: "fieldConfirmed",
    label: "Field confirmed",
    shortLabel: "Field conf.",
    isComplete: (cs) => cs.fieldConfirmed,
  },
  {
    key: "evidence",
    label: "Evidence attached (ECC + ECC link)",
    shortLabel: "Evidence",
    isComplete: (cs) =>
      cs.evidencing === "ATTACHED" &&
      cs.ecc === "CONFIRMED" &&
      !!cs.eccLink &&
      cs.eccLink.trim().length > 0,
  },
  {
    key: "w8",
    label: "W-8 complete (type + in CropForce + matches legal entity)",
    shortLabel: "W-8",
    isComplete: (cs) =>
      cs.w8Type != null && cs.w8InCropForce && cs.w8MatchesLegalEntity,
  },
  {
    key: "contract",
    label: "Contract complete (signed + approved in CropForce)",
    shortLabel: "Contract",
    isComplete: (cs) =>
      cs.contractStatus === "SIGNED" && cs.contractApprovedInCropForce,
  },
  {
    key: "bankDetails",
    label: "Bank details on file",
    shortLabel: "Bank",
    isComplete: (cs) => cs.bankDetails,
  },
  {
    key: "resultsLoaded",
    label: "Results loaded (fields, tCO₂e, delivered area, amount)",
    shortLabel: "Results",
    isComplete: (cs) =>
      cs.fields != null &&
      cs.tCO2e != null &&
      (cs.deliveredAcres != null || cs.deliveredHectares != null) &&
      cs.amount != null,
  },
  {
    key: "payment",
    label: "Payment done",
    shortLabel: "Payment",
    isComplete: (cs) => cs.paymentDone,
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
