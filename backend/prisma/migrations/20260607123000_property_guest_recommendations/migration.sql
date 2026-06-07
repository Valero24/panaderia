-- Add guest-facing recommendations for public property SEO content.
ALTER TABLE "Property"
ADD COLUMN "guestRecommendations" TEXT;
