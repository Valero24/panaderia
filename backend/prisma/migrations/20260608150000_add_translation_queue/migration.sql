-- CreateEnum
CREATE TYPE "TranslationStatus" AS ENUM ('NOT_REQUESTED', 'PENDING_TRANSLATION', 'TRANSLATING', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "TranslationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TranslationEntityType" AS ENUM ('PROPERTY', 'EXPERIENCE', 'PACKAGE', 'DESTINATION', 'BLOG_POST');

-- AlterTable
ALTER TABLE "Property"
ADD COLUMN "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN "translationError" TEXT,
ADD COLUMN "translationRequestedAt" TIMESTAMP(3),
ADD COLUMN "translationCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Experience"
ADD COLUMN "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN "translationError" TEXT,
ADD COLUMN "translationRequestedAt" TIMESTAMP(3),
ADD COLUMN "translationCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Package"
ADD COLUMN "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN "translationError" TEXT,
ADD COLUMN "translationRequestedAt" TIMESTAMP(3),
ADD COLUMN "translationCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Destination"
ADD COLUMN "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN "translationError" TEXT,
ADD COLUMN "translationRequestedAt" TIMESTAMP(3),
ADD COLUMN "translationCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BlogPost"
ADD COLUMN "translationStatus" "TranslationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN "translationError" TEXT,
ADD COLUMN "translationRequestedAt" TIMESTAMP(3),
ADD COLUMN "translationCompletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "TranslationJob" (
    "id" SERIAL NOT NULL,
    "entityType" "TranslationEntityType" NOT NULL,
    "entityId" INTEGER NOT NULL,
    "status" "TranslationJobStatus" NOT NULL DEFAULT 'PENDING',
    "fields" JSONB,
    "sourceSnapshot" JSONB NOT NULL,
    "overwrite" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranslationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranslationJob_entityType_entityId_idx" ON "TranslationJob"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "TranslationJob_status_idx" ON "TranslationJob"("status");

-- CreateIndex
CREATE INDEX "TranslationJob_createdAt_idx" ON "TranslationJob"("createdAt");
