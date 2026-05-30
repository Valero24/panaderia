-- AlterTable
ALTER TABLE "ExtraService" ADD COLUMN     "experienceId" INTEGER,
ALTER COLUMN "propertyId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ExtraService_propertyId_idx" ON "ExtraService"("propertyId");

-- CreateIndex
CREATE INDEX "ExtraService_experienceId_idx" ON "ExtraService"("experienceId");

-- AddForeignKey
ALTER TABLE "ExtraService" ADD CONSTRAINT "ExtraService_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
