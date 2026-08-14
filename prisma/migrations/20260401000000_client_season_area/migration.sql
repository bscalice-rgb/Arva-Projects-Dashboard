-- CreateTable
CREATE TABLE "ClientSeasonArea" (
    "id" TEXT NOT NULL,
    "clientSeasonId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "enrolledHectares" DOUBLE PRECISION,
    "enrolledAcres" DOUBLE PRECISION,
    "deliveredHectares" DOUBLE PRECISION,
    "deliveredAcres" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientSeasonArea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientSeasonArea_clientSeasonId_idx" ON "ClientSeasonArea"("clientSeasonId");

-- CreateIndex
CREATE INDEX "ClientSeasonArea_regionId_idx" ON "ClientSeasonArea"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSeasonArea_clientSeasonId_regionId_key" ON "ClientSeasonArea"("clientSeasonId", "regionId");

-- AddForeignKey
ALTER TABLE "ClientSeasonArea" ADD CONSTRAINT "ClientSeasonArea_clientSeasonId_fkey" FOREIGN KEY ("clientSeasonId") REFERENCES "ClientSeason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSeasonArea" ADD CONSTRAINT "ClientSeasonArea_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

