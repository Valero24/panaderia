-- AlterTable
ALTER TABLE "ExtraService" ADD COLUMN     "packageId" INTEGER;

-- CreateIndex
CREATE INDEX "ExtraService_packageId_idx" ON "ExtraService"("packageId");

-- AddForeignKey
ALTER TABLE "ExtraService" ADD CONSTRAINT "ExtraService_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
