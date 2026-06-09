-- CreateEnum
CREATE TYPE "BulkImportType" AS ENUM ('PROPERTY', 'EXPERIENCE', 'PACKAGE', 'DESTINATION', 'BLOG');

-- CreateEnum
CREATE TYPE "BulkImportStatus" AS ENUM ('DRAFT', 'UPLOADED', 'VALIDATING', 'VALIDATED', 'FAILED_VALIDATION', 'IMPORTING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "BulkImportJob" (
    "id" SERIAL NOT NULL,
    "type" "BulkImportType" NOT NULL,
    "status" "BulkImportStatus" NOT NULL DEFAULT 'DRAFT',
    "originalFileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "source" TEXT DEFAULT 'ADMIN_UPLOAD',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "createdRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "validationSummary" JSONB,
    "errorSummary" JSONB,
    "metadata" JSONB,
    "createdById" INTEGER,
    "createdByEmail" TEXT,
    "createdByRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BulkImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BulkImportJob_type_idx" ON "BulkImportJob"("type");

-- CreateIndex
CREATE INDEX "BulkImportJob_status_idx" ON "BulkImportJob"("status");

-- CreateIndex
CREATE INDEX "BulkImportJob_createdAt_idx" ON "BulkImportJob"("createdAt");

-- CreateIndex
CREATE INDEX "BulkImportJob_createdById_idx" ON "BulkImportJob"("createdById");

-- AddForeignKey
ALTER TABLE "BulkImportJob" ADD CONSTRAINT "BulkImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
