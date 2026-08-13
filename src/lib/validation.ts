import { z } from "zod";
import {
  OrgNodeKind,
  ChannelPartnerType,
  Country,
  Crop,
  DataStatus,
  QaqcStatus,
  Evidencing,
  EccStatus,
  W8Type,
  ContractStatus,
  RevSharePayeeType,
  RevShareBasis,
} from "@prisma/client";

/** Coerce form values into an optional number (empty/undefined -> null). */
export const optionalNumber = z.preprocess((v) => {
  if (v === "" || v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isNaN(n) ? null : n;
}, z.number().nullable());

/** Optional trimmed string (empty -> null). */
export const optionalString = z.preprocess((v) => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}, z.string().nullable());

export const nonEmptyString = z.string().trim().min(1, "Required");

// ---------------------------------------------------------------------------

export const orgNodeSchema = z
  .object({
    name: nonEmptyString,
    kind: z.nativeEnum(OrgNodeKind),
    country: z.nativeEnum(Country),
    channelPartnerId: optionalString,
  })
  .refine(
    (v) => v.kind !== OrgNodeKind.CHANNEL_PARTNER || !!v.channelPartnerId,
    {
      message: "Select the Channel Partner for a CP-kind Org Node.",
      path: ["channelPartnerId"],
    },
  );
export type OrgNodeInput = z.infer<typeof orgNodeSchema>;

export const channelPartnerSchema = z.object({
  entityName: nonEmptyString,
  mainContact: optionalString,
  type: z.nativeEnum(ChannelPartnerType),
  country: z.nativeEnum(Country),
  notes: optionalString,
});
export type ChannelPartnerInput = z.infer<typeof channelPartnerSchema>;

export const channelPartnerSeasonSchema = z.object({
  agreementSigned: z.boolean(),
  w8Provided: z.boolean(),
  bankDetails: z.boolean(),
  paymentDone: z.boolean(),
  agreementComments: optionalString,
});
export type ChannelPartnerSeasonInput = z.infer<
  typeof channelPartnerSeasonSchema
>;

export const revenueSharePayeeSchema = z.object({
  name: nonEmptyString,
  payeeType: z.nativeEnum(RevSharePayeeType),
  basis: z.nativeEnum(RevShareBasis),
  rate: z.preprocess((v) => {
    if (v === "" || v == null) return 0;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isNaN(n) ? 0 : n;
  }, z.number().min(0)),
  notes: optionalString,
});
export type RevenueSharePayeeInput = z.infer<typeof revenueSharePayeeSchema>;

export const millSchema = z.object({
  name: nonEmptyString,
  crop: z.nativeEnum(Crop),
  country: z.nativeEnum(Country),
  regionId: optionalString,
  groupId: optionalString,
  notes: optionalString,
});
export type MillInput = z.infer<typeof millSchema>;

export const millGroupSchema = z.object({
  name: nonEmptyString,
  country: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.nativeEnum(Country).nullable(),
  ),
  notes: optionalString,
});
export type MillGroupInput = z.infer<typeof millGroupSchema>;

export const regionSchema = z.object({
  country: z.nativeEnum(Country),
  name: nonEmptyString,
});
export type RegionInput = z.infer<typeof regionSchema>;

export const clientSchema = z.object({
  // Enrollment channel: a Channel Partner id, or null for a direct grower.
  channelPartnerId: optionalString,
  name: nonEmptyString,
  legalEntity: optionalString,
  country: z.nativeEnum(Country),
  defaultCrops: z.array(z.nativeEnum(Crop)).default([]),
  millId: optionalString,
  regionIds: z.array(z.string()).default([]),
  // Optional enrolled area for the current season, written to the season record
  // created alongside the grower (ignored on identity-only updates).
  enrolledAcres: optionalNumber,
  enrolledHectares: optionalNumber,
});
export type ClientInput = z.infer<typeof clientSchema>;

// Editable per-season fields (pipeline + outcomes). Identity is separate.
export const clientSeasonEditableSchema = z.object({
  crops: z.array(z.nativeEnum(Crop)).default([]),
  enrolledHectares: optionalNumber,
  enrolledAcres: optionalNumber,

  boundariesStatus: z.nativeEnum(DataStatus),
  dataStatus: z.nativeEnum(DataStatus),
  legalEntitySetup: z.boolean(),
  fieldRequested: z.boolean(),
  qaqc: z.nativeEnum(QaqcStatus),
  fieldConfirmed: z.boolean(),
  evidencing: z.nativeEnum(Evidencing),
  ecc: z.nativeEnum(EccStatus),
  eccLink: optionalString,
  w8Type: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.nativeEnum(W8Type).nullable(),
  ),
  w8InCropForce: z.boolean(),
  w8MatchesLegalEntity: z.boolean(),
  contractStatus: z.nativeEnum(ContractStatus),
  contractApprovedInCropForce: z.boolean(),
  bankDetails: z.boolean(),

  fields: optionalNumber,
  tCO2e: optionalNumber,
  deliveredAcres: optionalNumber,
  deliveredHectares: optionalNumber,
  amount: optionalNumber,
  paymentDone: z.boolean(),

  comments: optionalString,
});
export type ClientSeasonEditableInput = z.infer<
  typeof clientSeasonEditableSchema
>;

// Partial variant for inline single-field patches from the table.
export const clientSeasonPatchSchema = clientSeasonEditableSchema.partial();
export type ClientSeasonPatch = z.infer<typeof clientSeasonPatchSchema>;

export const supplyShedSchema = z.object({
  country: z.nativeEnum(Country),
  channelPartnerId: optionalString,
  // Direct (no CP) allotments may target a specific grower.
  clientId: optionalString,
  crop: z.nativeEnum(Crop),
  regionId: optionalString,
  acresNeeded: z.preprocess((v) => {
    if (v === "" || v == null) return 0;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isNaN(n) ? 0 : n;
  }, z.number().min(0)),
  hectaresNeeded: z.preprocess((v) => {
    if (v === "" || v == null) return 0;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isNaN(n) ? 0 : n;
  }, z.number().min(0)),
  enteredInCropForce: z.boolean(),
});
export type SupplyShedInput = z.infer<typeof supplyShedSchema>;

export const seasonSchema = z.object({
  year: z.preprocess(
    (v) => (typeof v === "string" ? Number(v) : v),
    z.number().int().min(2000).max(2100),
  ),
  label: nonEmptyString,
  isActive: z.boolean(),
});
export type SeasonInput = z.infer<typeof seasonSchema>;
