import type {
  Country,
  Crop,
  DataStatus,
  PracticeStatus,
  QaqcStatus,
  Evidencing,
  EccStatus,
  W8Type,
  ContractStatus,
  OrgNodeKind,
} from "@prisma/client";
import { deliveredFor } from "@/lib/area";

/** Fully serializable per-season row used by the table, detail and CSV. */
export type ClientSeasonRow = {
  id: string;
  clientId: string;
  clientName: string;
  legalEntity: string | null;
  orgNodeId: string;
  orgNodeName: string;
  orgNodeKind: OrgNodeKind;
  channelPartnerName: string | null;
  millName: string | null;
  country: Country;
  regionIds: string[];
  regionNames: string[];

  crops: Crop[];
  enrolledHectares: number | null;
  enrolledAcres: number | null;

  boundariesStatus: DataStatus;
  dataStatus: DataStatus;
  practicePlanting: PracticeStatus;
  practiceHarvest: PracticeStatus;
  practiceTillage: PracticeStatus;
  practiceFertilizer: PracticeStatus;
  practiceLiming: PracticeStatus;
  practiceCropProtection: PracticeStatus;
  practiceIrrigation: PracticeStatus;
  practiceCoverCropping: PracticeStatus;
  practiceSoilSampling: PracticeStatus;
  practiceAggregation: PracticeStatus;
  legalEntitySetup: boolean;
  fieldRequested: boolean;
  qaqc: QaqcStatus;
  fieldConfirmed: boolean;
  evidencing: Evidencing;
  ecc: EccStatus;
  eccLink: string | null;
  w8Type: W8Type | null;
  w8InCropForce: boolean;
  w8MatchesLegalEntity: boolean;
  contractStatus: ContractStatus;
  contractApprovedInCropForce: boolean;
  bankDetails: boolean;

  fields: number | null;
  tCO2e: number | null;
  // Derived, not stored: a grower's enrolled area counts as delivered once its
  // execution pipeline is complete.
  deliveredAcres: number;
  deliveredHectares: number;
  amount: number | null;
  paymentDone: boolean;

  comments: string | null;
};

// The Prisma query shape needed to build a ClientSeasonRow.
export const clientSeasonInclude = {
  client: {
    include: {
      orgNode: { include: { channelPartner: true } },
      mill: true,
      regions: true,
    },
  },
} as const;

type PrismaClientSeason = {
  id: string;
  clientId: string;
  crops: Crop[];
  enrolledHectares: number | null;
  enrolledAcres: number | null;
  boundariesStatus: DataStatus;
  dataStatus: DataStatus;
  practicePlanting: PracticeStatus;
  practiceHarvest: PracticeStatus;
  practiceTillage: PracticeStatus;
  practiceFertilizer: PracticeStatus;
  practiceLiming: PracticeStatus;
  practiceCropProtection: PracticeStatus;
  practiceIrrigation: PracticeStatus;
  practiceCoverCropping: PracticeStatus;
  practiceSoilSampling: PracticeStatus;
  practiceAggregation: PracticeStatus;
  legalEntitySetup: boolean;
  fieldRequested: boolean;
  qaqc: QaqcStatus;
  fieldConfirmed: boolean;
  evidencing: Evidencing;
  ecc: EccStatus;
  eccLink: string | null;
  w8Type: W8Type | null;
  w8InCropForce: boolean;
  w8MatchesLegalEntity: boolean;
  contractStatus: ContractStatus;
  contractApprovedInCropForce: boolean;
  bankDetails: boolean;
  fields: number | null;
  tCO2e: number | null;
  amount: number | null;
  paymentDone: boolean;
  comments: string | null;
  client: {
    id: string;
    name: string;
    legalEntity: string | null;
    country: Country;
    orgNodeId: string;
    orgNode: {
      id: string;
      name: string;
      kind: OrgNodeKind;
      channelPartner: { entityName: string } | null;
    };
    mill: { name: string } | null;
    regions: { id: string; name: string }[];
  };
};

export function toClientSeasonRow(cs: PrismaClientSeason): ClientSeasonRow {
  return {
    id: cs.id,
    clientId: cs.clientId,
    clientName: cs.client.name,
    legalEntity: cs.client.legalEntity,
    orgNodeId: cs.client.orgNodeId,
    orgNodeName: cs.client.orgNode.name,
    orgNodeKind: cs.client.orgNode.kind,
    channelPartnerName: cs.client.orgNode.channelPartner?.entityName ?? null,
    millName: cs.client.mill?.name ?? null,
    country: cs.client.country,
    regionIds: cs.client.regions.map((r) => r.id),
    regionNames: cs.client.regions.map((r) => r.name),
    crops: cs.crops,
    enrolledHectares: cs.enrolledHectares,
    enrolledAcres: cs.enrolledAcres,
    boundariesStatus: cs.boundariesStatus,
    dataStatus: cs.dataStatus,
    practicePlanting: cs.practicePlanting,
    practiceHarvest: cs.practiceHarvest,
    practiceTillage: cs.practiceTillage,
    practiceFertilizer: cs.practiceFertilizer,
    practiceLiming: cs.practiceLiming,
    practiceCropProtection: cs.practiceCropProtection,
    practiceIrrigation: cs.practiceIrrigation,
    practiceCoverCropping: cs.practiceCoverCropping,
    practiceSoilSampling: cs.practiceSoilSampling,
    practiceAggregation: cs.practiceAggregation,
    legalEntitySetup: cs.legalEntitySetup,
    fieldRequested: cs.fieldRequested,
    qaqc: cs.qaqc,
    fieldConfirmed: cs.fieldConfirmed,
    evidencing: cs.evidencing,
    ecc: cs.ecc,
    eccLink: cs.eccLink,
    w8Type: cs.w8Type,
    w8InCropForce: cs.w8InCropForce,
    w8MatchesLegalEntity: cs.w8MatchesLegalEntity,
    contractStatus: cs.contractStatus,
    contractApprovedInCropForce: cs.contractApprovedInCropForce,
    bankDetails: cs.bankDetails,
    fields: cs.fields,
    tCO2e: cs.tCO2e,
    ...deliveredFor(cs),
    amount: cs.amount,
    paymentDone: cs.paymentDone,
    comments: cs.comments,
  };
}
