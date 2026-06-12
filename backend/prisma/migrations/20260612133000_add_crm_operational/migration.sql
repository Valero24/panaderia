CREATE TYPE "LeadSource" AS ENUM (
  'WEBSITE',
  'WHATSAPP',
  'EMAIL',
  'PHONE',
  'INSTAGRAM',
  'FACEBOOK',
  'REFERRAL',
  'MANUAL',
  'OTHER'
);

CREATE TYPE "LeadStatus" AS ENUM (
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL_SENT',
  'NEGOTIATION',
  'RESERVED',
  'LOST',
  'ARCHIVED'
);

CREATE TYPE "LeadPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

CREATE TYPE "LeadActivityType" AS ENUM (
  'CALL',
  'WHATSAPP',
  'EMAIL',
  'NOTE',
  'FOLLOW_UP',
  'PROPOSAL',
  'STATUS_CHANGE',
  'BOOKING_CREATED',
  'LOST_REASON',
  'TASK'
);

CREATE TYPE "LeadTaskStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'CANCELLED',
  'OVERDUE'
);

CREATE TABLE "Lead" (
  "id" SERIAL NOT NULL,
  "fullName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "country" TEXT,
  "city" TEXT,
  "preferredLanguage" TEXT DEFAULT 'es',
  "source" "LeadSource" NOT NULL DEFAULT 'WEBSITE',
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
  "assignedAdvisorId" INTEGER,
  "interestedProductType" "BookingType",
  "interestedProductId" INTEGER,
  "travelStartDate" TIMESTAMP(3),
  "travelEndDate" TIMESTAMP(3),
  "guests" INTEGER,
  "budget" DECIMAL(12,2),
  "message" TEXT,
  "notes" TEXT,
  "nextFollowUpAt" TIMESTAMP(3),
  "lastContactedAt" TIMESTAMP(3),
  "convertedBookingId" INTEGER,
  "lostReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadActivity" (
  "id" SERIAL NOT NULL,
  "leadId" INTEGER NOT NULL,
  "type" "LeadActivityType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "createdById" INTEGER,
  "scheduledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadTask" (
  "id" SERIAL NOT NULL,
  "leadId" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueAt" TIMESTAMP(3),
  "status" "LeadTaskStatus" NOT NULL DEFAULT 'PENDING',
  "assignedToId" INTEGER,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LeadTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Lead_convertedBookingId_key" ON "Lead"("convertedBookingId");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_source_idx" ON "Lead"("source");
CREATE INDEX "Lead_priority_idx" ON "Lead"("priority");
CREATE INDEX "Lead_assignedAdvisorId_idx" ON "Lead"("assignedAdvisorId");
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");
CREATE INDEX "Lead_interestedProductType_interestedProductId_idx" ON "Lead"("interestedProductType", "interestedProductId");
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

CREATE INDEX "LeadActivity_leadId_idx" ON "LeadActivity"("leadId");
CREATE INDEX "LeadActivity_type_idx" ON "LeadActivity"("type");
CREATE INDEX "LeadActivity_createdById_idx" ON "LeadActivity"("createdById");
CREATE INDEX "LeadActivity_scheduledAt_idx" ON "LeadActivity"("scheduledAt");
CREATE INDEX "LeadActivity_createdAt_idx" ON "LeadActivity"("createdAt");

CREATE INDEX "LeadTask_leadId_idx" ON "LeadTask"("leadId");
CREATE INDEX "LeadTask_assignedToId_idx" ON "LeadTask"("assignedToId");
CREATE INDEX "LeadTask_status_idx" ON "LeadTask"("status");
CREATE INDEX "LeadTask_dueAt_idx" ON "LeadTask"("dueAt");
CREATE INDEX "LeadTask_createdAt_idx" ON "LeadTask"("createdAt");

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_assignedAdvisorId_fkey"
  FOREIGN KEY ("assignedAdvisorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_convertedBookingId_fkey"
  FOREIGN KEY ("convertedBookingId") REFERENCES "Booking"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadActivity"
  ADD CONSTRAINT "LeadActivity_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadActivity"
  ADD CONSTRAINT "LeadActivity_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadTask"
  ADD CONSTRAINT "LeadTask_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadTask"
  ADD CONSTRAINT "LeadTask_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
