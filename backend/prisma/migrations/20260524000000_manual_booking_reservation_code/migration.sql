ALTER TABLE "Booking"
ADD COLUMN "reservationCode" TEXT;

CREATE UNIQUE INDEX "Booking_reservationCode_key"
ON "Booking"("reservationCode");
