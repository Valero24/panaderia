-- AlterTable
ALTER TABLE "PreReservation" ADD COLUMN     "archiveReason" TEXT,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedById" INTEGER;

-- CreateIndex
CREATE INDEX "PreReservation_archivedAt_idx" ON "PreReservation"("archivedAt");
