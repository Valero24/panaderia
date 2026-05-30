/*
  Warnings:

  - The values [MANUAL,BOOKING,MAINTENANCE] on the enum `AvailabilitySource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `externalReference` on the `AvailabilityBlock` table. All the data in the column will be lost.
  - You are about to drop the column `preReservationId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `propertyId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `reference` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `wompiId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `isLocked` on the `PreReservation` table. All the data in the column will be lost.
  - You are about to drop the column `overrideAvailability` on the `PreReservation` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `PreReservation` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `PreReservation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `PreReservation` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `PreReservationItem` table. All the data in the column will be lost.
  - You are about to drop the column `extraServiceId` on the `PreReservationItem` table. All the data in the column will be lost.
  - You are about to drop the column `persons` on the `PreReservationItem` table. All the data in the column will be lost.
  - You are about to drop the column `propertyId` on the `PreReservationItem` table. All the data in the column will be lost.
  - You are about to drop the column `active` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `featured` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `PropertyImage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[stripePaymentIntentId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `referenceId` to the `AvailabilityBlock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `AvailabilityBlock` table without a default value. This is not possible if the table is not empty.
  - Added the required column `referenceId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stripePaymentIntentId` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `PreReservationItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `referenceId` on table `PreReservationItem` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `area` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Added the required column `city` to the `Property` table without a default value. This is not possible if the table is not empty.
  - Made the column `cleaningFee` on table `Property` required. This step will fail if there are existing NULL values in that column.
  - Made the column `serviceFee` on table `Property` required. This step will fail if there are existing NULL values in that column.
  - Made the column `taxes` on table `Property` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('PROPERTY', 'EXPERIENCE', 'PACKAGE');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FEATURED', 'MAINTENANCE', 'ARCHIVED');

-- AlterEnum
BEGIN;
CREATE TYPE "AvailabilitySource_new" AS ENUM ('SYSTEM', 'ADMIN', 'AIRBNB', 'STRIPE');
ALTER TABLE "AvailabilityBlock" ALTER COLUMN "source" TYPE "AvailabilitySource_new" USING ("source"::text::"AvailabilitySource_new");
ALTER TYPE "AvailabilitySource" RENAME TO "AvailabilitySource_old";
ALTER TYPE "AvailabilitySource_new" RENAME TO "AvailabilitySource";
DROP TYPE "AvailabilitySource_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "AvailabilityBlock" DROP CONSTRAINT "AvailabilityBlock_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_preReservationId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "ExtraService" DROP CONSTRAINT "ExtraService_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "PreReservationItem" DROP CONSTRAINT "PreReservationItem_extraServiceId_fkey";

-- DropForeignKey
ALTER TABLE "PreReservationItem" DROP CONSTRAINT "PreReservationItem_propertyId_fkey";

-- DropIndex
DROP INDEX "Booking_preReservationId_key";

-- AlterTable
ALTER TABLE "AvailabilityBlock" DROP COLUMN "externalReference",
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "referenceId" INTEGER NOT NULL,
ADD COLUMN     "type" "BookingType" NOT NULL,
ALTER COLUMN "propertyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "preReservationId",
DROP COLUMN "propertyId",
ADD COLUMN     "guests" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "referenceId" INTEGER NOT NULL,
ADD COLUMN     "type" "BookingType" NOT NULL,
ALTER COLUMN "checkOut" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "currency",
DROP COLUMN "method",
DROP COLUMN "reference",
DROP COLUMN "wompiId",
ADD COLUMN     "stripePaymentIntentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "PreReservation" DROP COLUMN "isLocked",
DROP COLUMN "overrideAvailability",
DROP COLUMN "phone",
DROP COLUMN "source",
DROP COLUMN "updatedAt",
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "totalEstimate" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PreReservationItem" DROP COLUMN "description",
DROP COLUMN "extraServiceId",
DROP COLUMN "persons",
DROP COLUMN "propertyId",
ADD COLUMN     "guests" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "type",
ADD COLUMN     "type" "BookingType" NOT NULL,
ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "unitPrice" DROP NOT NULL,
ALTER COLUMN "totalPrice" DROP NOT NULL,
ALTER COLUMN "referenceId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "active",
DROP COLUMN "featured",
DROP COLUMN "features",
DROP COLUMN "location",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "allowsChildren" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowsEvents" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowsSmoking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "area" TEXT NOT NULL,
ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "city" TEXT NOT NULL,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT,
ADD COLUMN     "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "cleaningFee" SET NOT NULL,
ALTER COLUMN "cleaningFee" SET DEFAULT 0,
ALTER COLUMN "serviceFee" SET NOT NULL,
ALTER COLUMN "serviceFee" SET DEFAULT 0,
ALTER COLUMN "taxes" SET NOT NULL,
ALTER COLUMN "taxes" SET DEFAULT 0,
ALTER COLUMN "bedrooms" SET DEFAULT 1,
ALTER COLUMN "bathrooms" SET DEFAULT 1,
ALTER COLUMN "basePrice" DROP DEFAULT,
ALTER COLUMN "maxCapacity" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PropertyImage" DROP COLUMN "createdAt",
ALTER COLUMN "sortOrder" DROP NOT NULL,
ALTER COLUMN "sortOrder" DROP DEFAULT;

-- DropEnum
DROP TYPE "ItemType";

-- CreateTable
CREATE TABLE "PropertyFeature" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "propertyId" INTEGER NOT NULL,

    CONSTRAINT "PropertyFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailabilityBlock_type_referenceId_idx" ON "AvailabilityBlock"("type", "referenceId");

-- CreateIndex
CREATE INDEX "AvailabilityBlock_startDate_endDate_idx" ON "AvailabilityBlock"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Booking_type_referenceId_idx" ON "Booking"("type", "referenceId");

-- CreateIndex
CREATE INDEX "Booking_checkIn_checkOut_idx" ON "Booking"("checkIn", "checkOut");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "PreReservation_checkIn_checkOut_idx" ON "PreReservation"("checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "PreReservationItem_type_referenceId_idx" ON "PreReservationItem"("type", "referenceId");

-- AddForeignKey
ALTER TABLE "PropertyFeature" ADD CONSTRAINT "PropertyFeature_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraService" ADD CONSTRAINT "ExtraService_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilityBlock" ADD CONSTRAINT "AvailabilityBlock_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
