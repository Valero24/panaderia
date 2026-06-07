-- Add extended SEO content fields for public property pages.
ALTER TABLE "Property"
ADD COLUMN "seoKeywords" TEXT,
ADD COLUMN "seoContent" TEXT,
ADD COLUMN "nearbyAttractions" TEXT,
ADD COLUMN "locationDescription" TEXT,
ADD COLUMN "faq" JSONB;
