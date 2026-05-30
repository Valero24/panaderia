ALTER TABLE "PreReservation" ADD COLUMN "customerCountry" TEXT;
ALTER TABLE "PreReservation" ADD COLUMN "specialRequests" TEXT;
ALTER TABLE "PreReservation" ADD COLUMN "selectedExtras" JSONB;
