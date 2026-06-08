-- Add SEO-specific content fields for public travel package detail pages.
ALTER TABLE "Package"
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "seoContent" TEXT,
ADD COLUMN "faq" JSONB;
