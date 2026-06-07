-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Booking"
ADD COLUMN "reviewToken" TEXT,
ADD COLUMN "reviewTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "reviewRequestSentAt" TIMESTAMP(3),
ADD COLUMN "reviewSubmittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Review" (
  "id" SERIAL NOT NULL,
  "bookingId" INTEGER NOT NULL,
  "targetType" "BookingType" NOT NULL,
  "targetId" INTEGER NOT NULL,
  "customerName" TEXT,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "customerCountry" TEXT,
  "rating" INTEGER NOT NULL,
  "title" TEXT,
  "comment" TEXT NOT NULL,
  "categoryRatings" JSONB,
  "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "moderatedAt" TIMESTAMP(3),
  "moderatedById" INTEGER,
  "publicName" TEXT,
  "source" TEXT NOT NULL DEFAULT 'POST_SERVICE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_reviewToken_key" ON "Booking"("reviewToken");

-- CreateIndex
CREATE INDEX "Booking_reviewToken_idx" ON "Booking"("reviewToken");

-- CreateIndex
CREATE UNIQUE INDEX "Review_bookingId_key" ON "Review"("bookingId");

-- CreateIndex
CREATE INDEX "Review_targetType_targetId_idx" ON "Review"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- CreateIndex
CREATE INDEX "Review_submittedAt_idx" ON "Review"("submittedAt");

-- AddForeignKey
ALTER TABLE "Review"
ADD CONSTRAINT "Review_bookingId_fkey"
FOREIGN KEY ("bookingId") REFERENCES "Booking"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
