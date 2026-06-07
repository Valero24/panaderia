ALTER TABLE "Experience"
ADD COLUMN "seoTitle" TEXT,
ADD COLUMN "seoDescription" TEXT,
ADD COLUMN "seoContent" TEXT,
ADD COLUMN "itinerary" TEXT,
ADD COLUMN "included" TEXT,
ADD COLUMN "notIncluded" TEXT,
ADD COLUMN "meetingPoint" TEXT,
ADD COLUMN "durationDescription" TEXT,
ADD COLUMN "schedule" TEXT,
ADD COLUMN "conditions" TEXT,
ADD COLUMN "faq" JSONB,
ADD COLUMN "experienceCategory" TEXT;
