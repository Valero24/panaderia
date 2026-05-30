/*
  Warnings:

  - A unique constraint covering the columns `[preReservationId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('PROPERTY', 'EXPERIENCE', 'EXTRA', 'MANUAL');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "preReservationId" TEXT;

-- AlterTable
ALTER TABLE "PreReservation" ADD COLUMN     "overrideAvailability" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PreReservationItem" (
    "id" SERIAL NOT NULL,
    "type" "ItemType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "persons" INTEGER NOT NULL DEFAULT 1,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "referenceId" INTEGER,
    "propertyId" INTEGER,
    "extraServiceId" INTEGER,
    "preReservationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreReservationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT,
    "reference" TEXT,
    "wompiId" TEXT,
    "bookingId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_preReservationId_key" ON "Booking"("preReservationId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_preReservationId_fkey" FOREIGN KEY ("preReservationId") REFERENCES "PreReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreReservationItem" ADD CONSTRAINT "PreReservationItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreReservationItem" ADD CONSTRAINT "PreReservationItem_extraServiceId_fkey" FOREIGN KEY ("extraServiceId") REFERENCES "ExtraService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreReservationItem" ADD CONSTRAINT "PreReservationItem_preReservationId_fkey" FOREIGN KEY ("preReservationId") REFERENCES "PreReservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
