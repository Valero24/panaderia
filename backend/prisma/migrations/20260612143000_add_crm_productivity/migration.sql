CREATE TYPE "ReminderType" AS ENUM ('IN_APP', 'EMAIL', 'WHATSAPP_MANUAL');
CREATE TYPE "CrmTemplateChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'NOTE');
CREATE TYPE "CrmNotificationType" AS ENUM (
  'CRM_TASK_DUE',
  'CRM_TASK_OVERDUE',
  'CRM_LEAD_ASSIGNED',
  'CRM_LEAD_NO_FOLLOWUP',
  'CRM_LEAD_URGENT'
);

ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "priorityScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "healthStatus" TEXT DEFAULT 'GREEN',
  ADD COLUMN IF NOT EXISTS "healthUpdatedAt" TIMESTAMP(3);

ALTER TABLE "LeadTask"
  ADD COLUMN IF NOT EXISTS "reminderAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reminderType" "ReminderType" NOT NULL DEFAULT 'IN_APP';

CREATE INDEX IF NOT EXISTS "LeadTask_reminderAt_idx" ON "LeadTask"("reminderAt");

CREATE TABLE "CrmMessageTemplate" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "channel" "CrmTemplateChannel" NOT NULL,
  "content" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CrmMessageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmMessageTemplate_channel_idx" ON "CrmMessageTemplate"("channel");
CREATE INDEX "CrmMessageTemplate_isActive_idx" ON "CrmMessageTemplate"("isActive");

CREATE TABLE "CrmNotification" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "type" "CrmNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "entityType" TEXT,
  "entityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CrmNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmNotification_userId_readAt_idx" ON "CrmNotification"("userId", "readAt");
CREATE INDEX "CrmNotification_type_idx" ON "CrmNotification"("type");
CREATE INDEX "CrmNotification_createdAt_idx" ON "CrmNotification"("createdAt");

ALTER TABLE "CrmNotification"
  ADD CONSTRAINT "CrmNotification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
