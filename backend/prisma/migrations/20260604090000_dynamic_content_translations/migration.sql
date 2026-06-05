-- Add optional JSON translation maps for admin-created public content.
-- Existing Spanish fields remain the required source of truth and fallback.

ALTER TABLE "Property" ADD COLUMN "translations" JSONB;
ALTER TABLE "Experience" ADD COLUMN "translations" JSONB;
ALTER TABLE "Package" ADD COLUMN "translations" JSONB;
ALTER TABLE "PackageComponent" ADD COLUMN "translations" JSONB;
ALTER TABLE "ExtraService" ADD COLUMN "translations" JSONB;
ALTER TABLE "ProductFeature" ADD COLUMN "translations" JSONB;
