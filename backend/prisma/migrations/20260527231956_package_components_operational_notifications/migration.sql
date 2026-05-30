-- CreateEnum
CREATE TYPE "OperationalNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "PackageComponent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "includes" TEXT,
    "excludes" TEXT,
    "conditions" TEXT,
    "duration" TEXT,
    "recommendations" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "packageId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OperationalNotification" (
    "id" SERIAL NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "OperationalNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "error" TEXT,
    "preReservationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "OperationalNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PackageComponent_packageId_idx" ON "PackageComponent"("packageId");

-- CreateIndex
CREATE INDEX "PackageComponent_active_idx" ON "PackageComponent"("active");

-- CreateIndex
CREATE INDEX "PackageComponent_sortOrder_idx" ON "PackageComponent"("sortOrder");

-- CreateIndex
CREATE INDEX "OperationalNotification_status_idx" ON "OperationalNotification"("status");

-- CreateIndex
CREATE INDEX "OperationalNotification_preReservationId_idx" ON "OperationalNotification"("preReservationId");

-- CreateIndex
CREATE INDEX "OperationalNotification_createdAt_idx" ON "OperationalNotification"("createdAt");

-- AddForeignKey
ALTER TABLE "PackageComponent" ADD CONSTRAINT "PackageComponent_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OperationalNotification" ADD CONSTRAINT "OperationalNotification_preReservationId_fkey" FOREIGN KEY ("preReservationId") REFERENCES "PreReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
