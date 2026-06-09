ALTER TABLE "Property"
  ADD COLUMN IF NOT EXISTS "translationsMeta" JSONB;

ALTER TABLE "Experience"
  ADD COLUMN IF NOT EXISTS "translationsMeta" JSONB;

ALTER TABLE "Package"
  ADD COLUMN IF NOT EXISTS "translationsMeta" JSONB;

ALTER TABLE "Destination"
  ADD COLUMN IF NOT EXISTS "translationsMeta" JSONB;

ALTER TABLE "BlogPost"
  ADD COLUMN IF NOT EXISTS "translationsMeta" JSONB;
