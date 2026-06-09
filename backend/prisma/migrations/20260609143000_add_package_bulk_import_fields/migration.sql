ALTER TABLE "Package"
ADD COLUMN "minPeople" INTEGER,
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PackageComponent"
ADD COLUMN "componentType" TEXT,
ADD COLUMN "day" INTEGER;

CREATE INDEX "Package_isFeatured_idx" ON "Package"("isFeatured");
