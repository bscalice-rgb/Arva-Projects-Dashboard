-- Mill region becomes a reference to the managed Region list (Seasons tab)
-- instead of free text. Existing text values are mapped onto a matching
-- managed region (same owner, same country, case-insensitive name) where one
-- exists; unmatched text is dropped.

ALTER TABLE "Mill" ADD COLUMN "regionId" TEXT;

UPDATE "Mill" m
SET "regionId" = r."id"
FROM "Region" r
WHERE m."region" IS NOT NULL
  AND lower(r."name") = lower(m."region")
  AND r."country" = m."country"
  AND (r."userId" = m."userId" OR (r."userId" IS NULL AND m."userId" IS NULL));

ALTER TABLE "Mill" DROP COLUMN "region";

-- CreateIndex
CREATE INDEX "Mill_regionId_idx" ON "Mill"("regionId");

-- AddForeignKey
ALTER TABLE "Mill" ADD CONSTRAINT "Mill_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
