import type { Country, Crop } from "@prisma/client";

export type DashClient = {
  clientId: string;
  clientName: string;
  country: Country;
  crop: Crop;
  cpKey: string; // channelPartnerId or "__direct__"
  cpName: string; // CP entity name or "Direct"
  stageIndex: number;
  isComplete: boolean;
  currentStageShort: string;
  enrolledAcres: number;
  enrolledHectares: number;
  deliveredAcres: number;
  deliveredHectares: number;
  tCO2e: number;
  amount: number;
  paymentDone: boolean;
  w8Complete: boolean;
  contractComplete: boolean;
  bankDetails: boolean;
};

export type DashPayee = { basis: "PERCENTAGE" | "FIXED_AMOUNT"; rate: number };

export type DashCp = {
  cpKey: string;
  cpName: string;
  hasSeason: boolean;
  agreementSigned: boolean;
  w8Provided: boolean;
  payees: DashPayee[];
};

export type DashShed = {
  cpKey: string;
  crop: Crop;
  country: Country;
  acresNeeded: number;
  hectaresNeeded: number;
  acresLoaded: number;
  hectaresLoaded: number;
};
