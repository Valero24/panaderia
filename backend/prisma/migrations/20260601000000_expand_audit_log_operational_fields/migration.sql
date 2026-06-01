ALTER TABLE "AuditLog"
ADD COLUMN "actorName" TEXT,
ADD COLUMN "message" TEXT,
ADD COLUMN "previousValue" JSONB,
ADD COLUMN "newValue" JSONB,
ADD COLUMN "ip" TEXT,
ADD COLUMN "userAgent" TEXT;

CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
