-- Data milestones: the management practices actually tracked per grower/season.
-- (Conservation Programs is intentionally excluded — not used in these projects.)
-- ClientSeason.dataStatus becomes a derived rollup of these, so existing DONE
-- records are back-filled to DONE practices to preserve their pipeline stage.

-- CreateEnum
CREATE TYPE "PracticeStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE', 'N_A');

-- AlterTable
ALTER TABLE "ClientSeason"
  ADD COLUMN "practicePlanting"       "PracticeStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "practiceHarvest"        "PracticeStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "practiceTillage"        "PracticeStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "practiceFertilizer"     "PracticeStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "practiceLiming"         "PracticeStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "practiceCropProtection" "PracticeStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "practiceIrrigation"     "PracticeStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "practiceCoverCropping"  "PracticeStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "practiceSoilSampling"   "PracticeStatus" NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "practiceAggregation"    "PracticeStatus" NOT NULL DEFAULT 'NOT_STARTED';

-- Back-fill: a season already marked Data = DONE keeps that stage complete.
UPDATE "ClientSeason" SET
  "practicePlanting"       = 'DONE',
  "practiceHarvest"        = 'DONE',
  "practiceTillage"        = 'DONE',
  "practiceFertilizer"     = 'DONE',
  "practiceLiming"         = 'DONE',
  "practiceCropProtection" = 'DONE',
  "practiceIrrigation"     = 'DONE',
  "practiceCoverCropping"  = 'DONE',
  "practiceSoilSampling"   = 'DONE',
  "practiceAggregation"    = 'DONE'
WHERE "dataStatus" = 'DONE';

-- Partially-loaded seasons: mark practices in progress so the rollup matches.
UPDATE "ClientSeason" SET
  "practicePlanting"       = 'IN_PROGRESS',
  "practiceHarvest"        = 'IN_PROGRESS',
  "practiceTillage"        = 'IN_PROGRESS',
  "practiceFertilizer"     = 'IN_PROGRESS',
  "practiceLiming"         = 'IN_PROGRESS',
  "practiceCropProtection" = 'IN_PROGRESS',
  "practiceIrrigation"     = 'IN_PROGRESS',
  "practiceCoverCropping"  = 'IN_PROGRESS',
  "practiceSoilSampling"   = 'IN_PROGRESS',
  "practiceAggregation"    = 'IN_PROGRESS'
WHERE "dataStatus" = 'IN_PROGRESS';
