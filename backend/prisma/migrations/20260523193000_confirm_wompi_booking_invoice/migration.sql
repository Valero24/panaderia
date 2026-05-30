ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'APPROVED';

ALTER TABLE "Booking"
ADD COLUMN "preReservationId" TEXT,
ADD COLUMN "productName" TEXT,
ADD COLUMN "adults" INTEGER,
ADD COLUMN "children" INTEGER,
ADD COLUMN "infants" INTEGER,
ADD COLUMN "taxesAmount" DOUBLE PRECISION,
ADD COLUMN "discountAmount" DOUBLE PRECISION,
ADD COLUMN "selectedExtras" JSONB,
ADD COLUMN "customerName" TEXT,
ADD COLUMN "customerEmail" TEXT,
ADD COLUMN "customerPhone" TEXT,
ADD COLUMN "advisorId" INTEGER,
ADD COLUMN "advisorName" TEXT,
ADD COLUMN "paymentMethod" TEXT,
ADD COLUMN "invoicePath" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Booking_preReservationId_key" ON "Booking"("preReservationId");
CREATE INDEX "Booking_preReservationId_idx" ON "Booking"("preReservationId");

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_preReservationId_fkey"
FOREIGN KEY ("preReservationId") REFERENCES "PreReservation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

