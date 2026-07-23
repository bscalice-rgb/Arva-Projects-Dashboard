-- Multi-crop, managed regions, drop mill type. Ordered to be safe on existing data.
-- Note: crop/region values previously entered on growers are cleared (columns replaced).

-- 1. Drop the columns being removed or replaced (frees old enum values first).
ALTER TABLE "Client" DROP COLUMN IF EXISTS "defaultCrop";
ALTER TABLE "Client" DROP COLUMN IF EXISTS "region";
ALTER TABLE "ClientSeason" DROP COLUMN IF EXISTS "crop";
ALTER TABLE "SupplyShed" DROP COLUMN IF EXISTS "region";
ALTER TABLE "Mill" DROP COLUMN IF EXISTS "type";

-- 2. Remap any remaining Crop values that no longer exist to a valid value.
UPDATE "Mill" SET "crop" = 'CORN' WHERE "crop"::text IN ('CORN_SOYBEANS', 'WHEAT_BARLEY');
UPDATE "SupplyShed" SET "crop" = 'CORN' WHERE "crop"::text IN ('CORN_SOYBEANS', 'WHEAT_BARLEY');

-- 3. Swap the Crop enum to the new unique set (only Mill.crop & SupplyShed.crop use it now).
CREATE TYPE "Crop_new" AS ENUM ('CORN', 'SOYBEANS', 'SUGARCANE', 'AFRICAN_OIL_PALM', 'SUGARBEETS', 'WHEAT', 'BARLEY');
ALTER TABLE "Mill" ALTER COLUMN "crop" TYPE "Crop_new" USING ("crop"::text::"Crop_new");
ALTER TABLE "SupplyShed" ALTER COLUMN "crop" TYPE "Crop_new" USING ("crop"::text::"Crop_new");
ALTER TYPE "Crop" RENAME TO "Crop_old";
ALTER TYPE "Crop_new" RENAME TO "Crop";
DROP TYPE "Crop_old";

-- 4. Add the new multi-crop columns and the region link.
ALTER TABLE "Client" ADD COLUMN "defaultCrops" "Crop"[];
ALTER TABLE "ClientSeason" ADD COLUMN "crops" "Crop"[];
ALTER TABLE "SupplyShed" ADD COLUMN "regionId" TEXT;

-- 5. Drop the now-unused MillType enum.
DROP TYPE IF EXISTS "MillType";

-- 6. Region table + Client<->Region join.
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "country" "Country" NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_ClientRegions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ClientRegions_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "Region_userId_idx" ON "Region"("userId");
CREATE UNIQUE INDEX "Region_userId_country_name_key" ON "Region"("userId", "country", "name");
CREATE INDEX "_ClientRegions_B_index" ON "_ClientRegions"("B");
CREATE INDEX "SupplyShed_regionId_idx" ON "SupplyShed"("regionId");

ALTER TABLE "Region" ADD CONSTRAINT "Region_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplyShed" ADD CONSTRAINT "SupplyShed_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_ClientRegions" ADD CONSTRAINT "_ClientRegions_A_fkey" FOREIGN KEY ("A") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ClientRegions" ADD CONSTRAINT "_ClientRegions_B_fkey" FOREIGN KEY ("B") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;
