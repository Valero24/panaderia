ALTER TABLE "User"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deactivatedAt" TIMESTAMP(3);

ALTER TABLE "PreReservation"
ADD COLUMN "reassignmentHistory" JSONB,
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledById" INTEGER;

ALTER TABLE "Booking"
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancelledById" INTEGER;

CREATE TABLE "CompanySettings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "logoUrl" TEXT,
  "companyName" TEXT NOT NULL DEFAULT 'Cartagena Tailored Travel',
  "legalId" TEXT,
  "address" TEXT,
  "phones" TEXT,
  "email" TEXT,
  "policies" TEXT,
  "invoiceFooter" TEXT,
  "legalInfo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CompanySettings" ("id", "companyName")
VALUES (1, 'Cartagena Tailored Travel')
ON CONFLICT ("id") DO NOTHING;

