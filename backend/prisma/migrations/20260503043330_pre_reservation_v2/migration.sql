-- CreateEnum
CREATE TYPE "PreReservationStatus" AS ENUM ('PENDING', 'ASSIGNED', 'QUOTED', 'CONFIRMED', 'CLOSED');

-- CreateTable
CREATE TABLE "PreReservation" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "status" "PreReservationStatus" NOT NULL DEFAULT 'PENDING',
    "assignedToId" INTEGER,
    "totalEstimate" DOUBLE PRECISION DEFAULT 0,
    "source" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreReservation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PreReservation" ADD CONSTRAINT "PreReservation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
