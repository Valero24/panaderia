ALTER TABLE "Payment"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'STRIPE',
ADD COLUMN "wompiReference" TEXT,
ADD COLUMN "wompiPaymentLinkId" TEXT,
ADD COLUMN "wompiTransactionId" TEXT,
ADD COLUMN "paymentLinkUrl" TEXT,
ADD COLUMN "preReservationId" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Payment" ALTER COLUMN "stripePaymentIntentId" DROP NOT NULL;
ALTER TABLE "Payment" ALTER COLUMN "bookingId" DROP NOT NULL;

CREATE UNIQUE INDEX "Payment_wompiReference_key" ON "Payment"("wompiReference");
CREATE UNIQUE INDEX "Payment_wompiPaymentLinkId_key" ON "Payment"("wompiPaymentLinkId");
CREATE UNIQUE INDEX "Payment_wompiTransactionId_key" ON "Payment"("wompiTransactionId");
CREATE INDEX "Payment_preReservationId_idx" ON "Payment"("preReservationId");

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_preReservationId_fkey"
FOREIGN KEY ("preReservationId") REFERENCES "PreReservation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

