CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

CREATE TYPE "EmailEntityType" AS ENUM ('PRERESERVATION', 'BOOKING', 'PAYMENT', 'REVIEW', 'SYSTEM');

CREATE TABLE "EmailLog" (
  "id" SERIAL NOT NULL,
  "to" TEXT NOT NULL,
  "cc" TEXT,
  "bcc" TEXT,
  "subject" TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL DEFAULT 'smtp',
  "entityType" "EmailEntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "preReservationId" TEXT,
  "bookingId" INTEGER,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailLog_templateKey_entityType_entityId_idx" ON "EmailLog"("templateKey", "entityType", "entityId");
CREATE INDEX "EmailLog_preReservationId_idx" ON "EmailLog"("preReservationId");
CREATE INDEX "EmailLog_bookingId_idx" ON "EmailLog"("bookingId");
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_preReservationId_fkey" FOREIGN KEY ("preReservationId") REFERENCES "PreReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
