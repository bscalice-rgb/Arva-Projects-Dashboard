-- Feedback round 2:
-- 1. Merge the two QA/QC fields (NPKS fix + flags) into a single QA/QC status.
-- 2. Add the "Boundaries upload" pipeline step.
-- 3. Add Mill Groups (Group > Mill/Refinery hierarchy).

-- CreateEnum
CREATE TYPE "QaqcStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE');

-- ClientSeason: new columns
ALTER TABLE "ClientSeason" ADD COLUMN "boundariesStatus" "DataStatus" NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "ClientSeason" ADD COLUMN "qaqc" "QaqcStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- Map existing NPKS/flags state onto the single QA/QC status.
UPDATE "ClientSeason"
SET "qaqc" = CASE
  WHEN "qaqcNpks" = 'DONE' AND "qaqcFlags" IN ('RESOLVED', 'NONE') THEN 'DONE'::"QaqcStatus"
  WHEN "qaqcNpks" = 'DONE' OR "qaqcFlags" = 'RESOLVED' THEN 'IN_PROGRESS'::"QaqcStatus"
  ELSE 'NOT_STARTED'::"QaqcStatus"
END;

-- Drop the old QA/QC columns and enums.
ALTER TABLE "ClientSeason" DROP COLUMN "qaqcNpks";
ALTER TABLE "ClientSeason" DROP COLUMN "qaqcFlags";
DROP TYPE "QaqcNpks";
DROP TYPE "QaqcFlags";

-- CreateTable
CREATE TABLE "MillGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" "Country",
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MillGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MillGroup_userId_idx" ON "MillGroup"("userId");

-- Mill: link to group
ALTER TABLE "Mill" ADD COLUMN "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Mill_groupId_idx" ON "Mill"("groupId");

-- AddForeignKey
ALTER TABLE "MillGroup" ADD CONSTRAINT "MillGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mill" ADD CONSTRAINT "Mill_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MillGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
