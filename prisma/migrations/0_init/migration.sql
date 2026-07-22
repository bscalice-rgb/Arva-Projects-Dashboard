-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "OrgNodeKind" AS ENUM ('CHANNEL_PARTNER', 'DIRECT_GROWER');

-- CreateEnum
CREATE TYPE "ChannelPartnerType" AS ENUM ('CHANNEL_PARTNER', 'REFERRER');

-- CreateEnum
CREATE TYPE "Country" AS ENUM ('ARG', 'BRA', 'CHL', 'COL', 'IDN', 'MEX', 'AUS', 'PHL', 'USA', 'PRY', 'URY', 'BOL', 'PER', 'ECU', 'IND', 'THA', 'MYS', 'VNM', 'ZAF', 'OTHER');

-- CreateEnum
CREATE TYPE "Crop" AS ENUM ('CORN', 'SOYBEANS', 'CORN_SOYBEANS', 'SUGARCANE', 'AFRICAN_OIL_PALM', 'SUGARBEETS', 'WHEAT_BARLEY');

-- CreateEnum
CREATE TYPE "DataStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "QaqcNpks" AS ENUM ('NOT_DONE', 'DONE');

-- CreateEnum
CREATE TYPE "QaqcFlags" AS ENUM ('OPEN', 'RESOLVED', 'NONE');

-- CreateEnum
CREATE TYPE "Evidencing" AS ENUM ('NOT_ATTACHED', 'ATTACHED');

-- CreateEnum
CREATE TYPE "EccStatus" AS ENUM ('NOT_STARTED', 'PENDING', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "W8Type" AS ENUM ('W8BEN', 'W8BENE');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('NOT_SENT', 'SENT', 'SIGNED');

-- CreateEnum
CREATE TYPE "MillType" AS ENUM ('MILL', 'REFINERY');

-- CreateEnum
CREATE TYPE "RevSharePayeeType" AS ENUM ('CP', 'REFERRER');

-- CreateEnum
CREATE TYPE "RevShareBasis" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelPartner" (
    "id" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "mainContact" TEXT,
    "type" "ChannelPartnerType" NOT NULL DEFAULT 'CHANNEL_PARTNER',
    "country" "Country" NOT NULL,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgNode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "OrgNodeKind" NOT NULL,
    "country" "Country" NOT NULL,
    "channelPartnerId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "orgNodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalEntity" TEXT,
    "country" "Country" NOT NULL,
    "defaultCrop" "Crop" NOT NULL,
    "millId" TEXT,
    "region" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MillType" NOT NULL DEFAULT 'MILL',
    "crop" "Crop" NOT NULL,
    "country" "Country" NOT NULL,
    "region" TEXT,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelPartnerSeason" (
    "id" TEXT NOT NULL,
    "channelPartnerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
    "w8Provided" BOOLEAN NOT NULL DEFAULT false,
    "bankDetails" BOOLEAN NOT NULL DEFAULT false,
    "paymentDone" BOOLEAN NOT NULL DEFAULT false,
    "agreementComments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelPartnerSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueSharePayee" (
    "id" TEXT NOT NULL,
    "channelPartnerSeasonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payeeType" "RevSharePayeeType" NOT NULL DEFAULT 'CP',
    "basis" "RevShareBasis" NOT NULL DEFAULT 'PERCENTAGE',
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueSharePayee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSeason" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "crop" "Crop" NOT NULL,
    "enrolledHectares" DOUBLE PRECISION,
    "enrolledAcres" DOUBLE PRECISION,
    "legalEntitySetup" BOOLEAN NOT NULL DEFAULT false,
    "dataStatus" "DataStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "fieldRequested" BOOLEAN NOT NULL DEFAULT false,
    "qaqcNpks" "QaqcNpks" NOT NULL DEFAULT 'NOT_DONE',
    "qaqcFlags" "QaqcFlags" NOT NULL DEFAULT 'OPEN',
    "fieldConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "evidencing" "Evidencing" NOT NULL DEFAULT 'NOT_ATTACHED',
    "ecc" "EccStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "eccLink" TEXT,
    "w8Type" "W8Type",
    "w8InCropForce" BOOLEAN NOT NULL DEFAULT false,
    "w8MatchesLegalEntity" BOOLEAN NOT NULL DEFAULT false,
    "contractStatus" "ContractStatus" NOT NULL DEFAULT 'NOT_SENT',
    "contractApprovedInCropForce" BOOLEAN NOT NULL DEFAULT false,
    "bankDetails" BOOLEAN NOT NULL DEFAULT false,
    "fields" INTEGER,
    "tCO2e" DOUBLE PRECISION,
    "deliveredAcres" DOUBLE PRECISION,
    "deliveredHectares" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "paymentDone" BOOLEAN NOT NULL DEFAULT false,
    "comments" TEXT,
    "carriedForwardFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyShed" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "country" "Country" NOT NULL,
    "channelPartnerId" TEXT,
    "crop" "Crop" NOT NULL,
    "region" TEXT,
    "acresNeeded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hectaresNeeded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enteredInCropForce" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyShed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Season_year_key" ON "Season"("year");

-- CreateIndex
CREATE INDEX "ChannelPartner_userId_idx" ON "ChannelPartner"("userId");

-- CreateIndex
CREATE INDEX "OrgNode_channelPartnerId_idx" ON "OrgNode"("channelPartnerId");

-- CreateIndex
CREATE INDEX "OrgNode_userId_idx" ON "OrgNode"("userId");

-- CreateIndex
CREATE INDEX "Client_orgNodeId_idx" ON "Client"("orgNodeId");

-- CreateIndex
CREATE INDEX "Client_millId_idx" ON "Client"("millId");

-- CreateIndex
CREATE INDEX "Client_userId_idx" ON "Client"("userId");

-- CreateIndex
CREATE INDEX "Mill_userId_idx" ON "Mill"("userId");

-- CreateIndex
CREATE INDEX "ChannelPartnerSeason_seasonId_idx" ON "ChannelPartnerSeason"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelPartnerSeason_channelPartnerId_seasonId_key" ON "ChannelPartnerSeason"("channelPartnerId", "seasonId");

-- CreateIndex
CREATE INDEX "RevenueSharePayee_channelPartnerSeasonId_idx" ON "RevenueSharePayee"("channelPartnerSeasonId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSeason_carriedForwardFromId_key" ON "ClientSeason"("carriedForwardFromId");

-- CreateIndex
CREATE INDEX "ClientSeason_seasonId_idx" ON "ClientSeason"("seasonId");

-- CreateIndex
CREATE INDEX "ClientSeason_clientId_idx" ON "ClientSeason"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSeason_clientId_seasonId_key" ON "ClientSeason"("clientId", "seasonId");

-- CreateIndex
CREATE INDEX "SupplyShed_seasonId_idx" ON "SupplyShed"("seasonId");

-- CreateIndex
CREATE INDEX "SupplyShed_channelPartnerId_idx" ON "SupplyShed"("channelPartnerId");

-- AddForeignKey
ALTER TABLE "ChannelPartner" ADD CONSTRAINT "ChannelPartner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgNode" ADD CONSTRAINT "OrgNode_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "ChannelPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgNode" ADD CONSTRAINT "OrgNode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_orgNodeId_fkey" FOREIGN KEY ("orgNodeId") REFERENCES "OrgNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_millId_fkey" FOREIGN KEY ("millId") REFERENCES "Mill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mill" ADD CONSTRAINT "Mill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelPartnerSeason" ADD CONSTRAINT "ChannelPartnerSeason_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "ChannelPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelPartnerSeason" ADD CONSTRAINT "ChannelPartnerSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueSharePayee" ADD CONSTRAINT "RevenueSharePayee_channelPartnerSeasonId_fkey" FOREIGN KEY ("channelPartnerSeasonId") REFERENCES "ChannelPartnerSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSeason" ADD CONSTRAINT "ClientSeason_carriedForwardFromId_fkey" FOREIGN KEY ("carriedForwardFromId") REFERENCES "ClientSeason"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSeason" ADD CONSTRAINT "ClientSeason_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSeason" ADD CONSTRAINT "ClientSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyShed" ADD CONSTRAINT "SupplyShed_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyShed" ADD CONSTRAINT "SupplyShed_channelPartnerId_fkey" FOREIGN KEY ("channelPartnerId") REFERENCES "ChannelPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyShed" ADD CONSTRAINT "SupplyShed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

