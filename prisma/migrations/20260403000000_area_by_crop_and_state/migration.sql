-- Grower area becomes one row per crop x state, and delivered area stops being
-- stored: it is derived from execution-pipeline completion instead.

-- ---------------------------------------------------------------------------
-- 1. Add the crop dimension to the per-state area rows.
-- ---------------------------------------------------------------------------
ALTER TABLE "ClientSeasonArea" ADD COLUMN "crop" "Crop";

-- Backfill: attribute each existing state row to the grower-season's first
-- crop. Single-crop growers land exactly right; multi-crop growers keep their
-- totals intact and can be re-split in the crop x state grid.
UPDATE "ClientSeasonArea" a
SET "crop" = cs."crops"[1]
FROM "ClientSeason" cs
WHERE a."clientSeasonId" = cs.id
  AND array_length(cs."crops", 1) >= 1;

-- Rows whose grower-season has no crop at all cannot be attributed.
DELETE FROM "ClientSeasonArea" WHERE "crop" IS NULL;

ALTER TABLE "ClientSeasonArea" ALTER COLUMN "crop" SET NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Lift single-region growers into the grid too: they stored their area as a
--    total on ClientSeason with no area row. Create the one row that total
--    represents, so nothing entered so far is lost.
-- ---------------------------------------------------------------------------
INSERT INTO "ClientSeasonArea" (
  "id", "clientSeasonId", "crop", "regionId",
  "enrolledHectares", "enrolledAcres", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  cs."id",
  cs."crops"[1],
  (SELECT r."B" FROM "_ClientRegions" r WHERE r."A" = cs."clientId" LIMIT 1),
  cs."enrolledHectares",
  cs."enrolledAcres",
  now(),
  now()
FROM "ClientSeason" cs
WHERE NOT EXISTS (
        SELECT 1 FROM "ClientSeasonArea" a WHERE a."clientSeasonId" = cs."id"
      )
  AND array_length(cs."crops", 1) >= 1
  AND (cs."enrolledHectares" IS NOT NULL OR cs."enrolledAcres" IS NOT NULL)
  -- exactly one region, so the attribution is unambiguous
  AND (SELECT count(*) FROM "_ClientRegions" r WHERE r."A" = cs."clientId") = 1;

-- ---------------------------------------------------------------------------
-- 3. Delivered area is derived from pipeline completion — drop the stored
--    columns on both the area rows and the grower-season.
-- ---------------------------------------------------------------------------
ALTER TABLE "ClientSeasonArea" DROP COLUMN "deliveredHectares";
ALTER TABLE "ClientSeasonArea" DROP COLUMN "deliveredAcres";
ALTER TABLE "ClientSeason" DROP COLUMN "deliveredHectares";
ALTER TABLE "ClientSeason" DROP COLUMN "deliveredAcres";

-- ---------------------------------------------------------------------------
-- 4. Re-key uniqueness on crop x state.
-- ---------------------------------------------------------------------------
DROP INDEX "ClientSeasonArea_clientSeasonId_regionId_key";
CREATE UNIQUE INDEX "ClientSeasonArea_clientSeasonId_crop_regionId_key"
  ON "ClientSeasonArea"("clientSeasonId", "crop", "regionId");
