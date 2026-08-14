// Human-readable labels + option lists for every schema enum.
// Single source of truth for select dropdowns and display formatting.

import {
  OrgNodeKind,
  ChannelPartnerType,
  Country,
  Crop,
  DataStatus,
  QaqcStatus,
  PracticeStatus,
  Evidencing,
  EccStatus,
  W8Type,
  ContractStatus,
  RevSharePayeeType,
  RevShareBasis,
} from "@prisma/client";

export type EnumOption<T extends string> = { value: T; label: string };

function opts<T extends string>(record: Record<T, string>): EnumOption<T>[] {
  return (Object.keys(record) as T[]).map((value) => ({
    value,
    label: record[value],
  }));
}

export const ORG_NODE_KIND_LABELS: Record<OrgNodeKind, string> = {
  CHANNEL_PARTNER: "Channel Partner",
  DIRECT_GROWER: "Direct Grower",
};

export const CHANNEL_PARTNER_TYPE_LABELS: Record<ChannelPartnerType, string> = {
  CHANNEL_PARTNER: "Channel Partner",
  REFERRER: "Referrer",
};

export const COUNTRY_LABELS: Record<Country, string> = {
  ARG: "Argentina",
  BRA: "Brazil",
  CHL: "Chile",
  COL: "Colombia",
  IDN: "Indonesia",
  MEX: "Mexico",
  AUS: "Australia",
  PHL: "Philippines",
  USA: "United States",
  PRY: "Paraguay",
  URY: "Uruguay",
  BOL: "Bolivia",
  PER: "Peru",
  ECU: "Ecuador",
  IND: "India",
  THA: "Thailand",
  MYS: "Malaysia",
  VNM: "Vietnam",
  ZAF: "South Africa",
  OTHER: "Other",
};

export const CROP_LABELS: Record<Crop, string> = {
  CORN: "Corn",
  SOYBEANS: "Soybeans",
  SUGARCANE: "Sugarcane",
  AFRICAN_OIL_PALM: "African Oil Palm",
  SUGARBEETS: "Sugarbeets",
  WHEAT: "Wheat",
  BARLEY: "Barley",
};

/** Crops that require a mill/refinery link. */
export const MILL_CROPS: Crop[] = ["SUGARCANE", "AFRICAN_OIL_PALM"];

export const DATA_STATUS_LABELS: Record<DataStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const QAQC_STATUS_LABELS: Record<QaqcStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export const PRACTICE_STATUS_LABELS: Record<PracticeStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  N_A: "N/A",
};

export const EVIDENCING_LABELS: Record<Evidencing, string> = {
  NOT_ATTACHED: "Not attached",
  ATTACHED: "Attached",
};

export const ECC_STATUS_LABELS: Record<EccStatus, string> = {
  NOT_STARTED: "Not started",
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
};

export const W8_TYPE_LABELS: Record<W8Type, string> = {
  W8BEN: "W-8BEN",
  W8BENE: "W-8BEN-E",
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  NOT_SENT: "Not sent",
  SENT: "Sent",
  SIGNED: "Signed",
};

export const REV_SHARE_PAYEE_TYPE_LABELS: Record<RevSharePayeeType, string> = {
  CP: "Channel Partner",
  REFERRER: "Referrer",
};

export const REV_SHARE_BASIS_LABELS: Record<RevShareBasis, string> = {
  PERCENTAGE: "Percentage of grower payments",
  FIXED_AMOUNT: "Fixed amount (USD)",
};

// Option lists for <Select> components.
export const ORG_NODE_KIND_OPTIONS = opts(ORG_NODE_KIND_LABELS);
export const CHANNEL_PARTNER_TYPE_OPTIONS = opts(CHANNEL_PARTNER_TYPE_LABELS);
export const COUNTRY_OPTIONS = opts(COUNTRY_LABELS);
export const CROP_OPTIONS = opts(CROP_LABELS);
export const DATA_STATUS_OPTIONS = opts(DATA_STATUS_LABELS);
export const QAQC_STATUS_OPTIONS = opts(QAQC_STATUS_LABELS);
export const PRACTICE_STATUS_OPTIONS = opts(PRACTICE_STATUS_LABELS);
export const EVIDENCING_OPTIONS = opts(EVIDENCING_LABELS);
export const ECC_STATUS_OPTIONS = opts(ECC_STATUS_LABELS);
export const W8_TYPE_OPTIONS = opts(W8_TYPE_LABELS);
export const CONTRACT_STATUS_OPTIONS = opts(CONTRACT_STATUS_LABELS);
export const REV_SHARE_PAYEE_TYPE_OPTIONS = opts(REV_SHARE_PAYEE_TYPE_LABELS);
export const REV_SHARE_BASIS_OPTIONS = opts(REV_SHARE_BASIS_LABELS);
