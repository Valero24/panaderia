ALTER TYPE "ReviewStatus" ADD VALUE IF NOT EXISTS 'HIDDEN';

ALTER TABLE "Review"
ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Review_featured_idx" ON "Review"("featured");
