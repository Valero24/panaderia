ALTER TABLE "BlogPost"
ADD COLUMN "relatedDestinationSlugs" JSONB,
ADD COLUMN "relatedPropertySlugs" JSONB,
ADD COLUMN "relatedExperienceSlugs" JSONB,
ADD COLUMN "relatedPackageSlugs" JSONB;
