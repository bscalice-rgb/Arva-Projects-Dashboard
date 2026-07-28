-- Direct (no CP) allotments can be assigned straight to a grower: the acres
-- are sourced from that grower directly instead of through a Channel Partner.

ALTER TABLE "SupplyShed" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE INDEX "SupplyShed_clientId_idx" ON "SupplyShed"("clientId");

-- AddForeignKey
ALTER TABLE "SupplyShed" ADD CONSTRAINT "SupplyShed_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
