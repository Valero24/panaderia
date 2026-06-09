ALTER TYPE "TranslationEntityType" ADD VALUE IF NOT EXISTS 'BLOG';

ALTER TABLE "TranslationJob"
  ADD COLUMN IF NOT EXISTS "sourceLanguage" TEXT NOT NULL DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS "targetLanguages" JSONB NOT NULL DEFAULT '["en","fr","pt","it"]',
  ADD COLUMN IF NOT EXISTS "finishedAt" TIMESTAMP(3);

UPDATE "TranslationJob"
SET "finishedAt" = "completedAt"
WHERE "finishedAt" IS NULL
  AND "completedAt" IS NOT NULL;
