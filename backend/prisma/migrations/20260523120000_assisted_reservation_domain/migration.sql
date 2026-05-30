-- Add the advisor role without dropping existing role values.
CREATE TYPE "Role_new" AS ENUM ('USER', 'ADMIN', 'ADVISOR', 'SUPERADMIN');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- Keep existing pre-reservation data while moving to the assisted reservation workflow.
CREATE TYPE "PreReservationStatus_new" AS ENUM (
  'PENDING_ADVISOR',
  'ASSIGNED',
  'VALIDATING',
  'AVAILABLE',
  'UNAVAILABLE',
  'PAYMENT_PENDING',
  'PAID',
  'CONFIRMED',
  'CANCELLED'
);

ALTER TABLE "PreReservation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PreReservation" ALTER COLUMN "status" TYPE "PreReservationStatus_new" USING (
  CASE "status"::text
    WHEN 'PENDING' THEN 'PENDING_ADVISOR'
    WHEN 'ASSIGNED' THEN 'ASSIGNED'
    WHEN 'QUOTED' THEN 'AVAILABLE'
    WHEN 'CONFIRMED' THEN 'CONFIRMED'
    WHEN 'CLOSED' THEN 'CANCELLED'
    ELSE 'PENDING_ADVISOR'
  END::"PreReservationStatus_new"
);
ALTER TABLE "PreReservation" ALTER COLUMN "status" SET DEFAULT 'PENDING_ADVISOR';
DROP TYPE "PreReservationStatus";
ALTER TYPE "PreReservationStatus_new" RENAME TO "PreReservationStatus";

ALTER TABLE "Property" ADD COLUMN "icalUrl" TEXT;

ALTER TABLE "PreReservation" ADD COLUMN "customerPhone" TEXT;
ALTER TABLE "PreReservation" ADD COLUMN "paymentMethodPreferred" TEXT;
ALTER TABLE "PreReservation" ADD COLUMN "internalNotes" TEXT;
ALTER TABLE "PreReservation" ADD COLUMN "advisorNotes" TEXT;
ALTER TABLE "PreReservation" ADD COLUMN "discountAmount" DOUBLE PRECISION;
ALTER TABLE "PreReservation" ADD COLUMN "taxesAmount" DOUBLE PRECISION;
ALTER TABLE "PreReservation" ADD COLUMN "finalTotal" DOUBLE PRECISION;
