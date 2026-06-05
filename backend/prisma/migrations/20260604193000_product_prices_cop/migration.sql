-- Make COP explicit for product and premium-service prices while preserving
-- legacy price fields used by the current admin and checkout flows.

ALTER TABLE "Property"
ADD COLUMN "priceCop" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "baseCurrency" TEXT NOT NULL DEFAULT 'COP';

UPDATE "Property"
SET "priceCop" = "pricePerNight",
    "baseCurrency" = 'COP'
WHERE "priceCop" = 0;

ALTER TABLE "Experience"
ADD COLUMN "priceCop" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "baseCurrency" TEXT NOT NULL DEFAULT 'COP';

UPDATE "Experience"
SET "priceCop" = "basePrice",
    "baseCurrency" = 'COP'
WHERE "priceCop" = 0;

ALTER TABLE "Package"
ADD COLUMN "priceCop" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "baseCurrency" TEXT NOT NULL DEFAULT 'COP';

UPDATE "Package"
SET "priceCop" = "basePrice",
    "baseCurrency" = 'COP'
WHERE "priceCop" = 0;

ALTER TABLE "PackageComponent"
ADD COLUMN "priceCop" DOUBLE PRECISION,
ADD COLUMN "baseCurrency" TEXT NOT NULL DEFAULT 'COP';

UPDATE "PackageComponent"
SET "baseCurrency" = 'COP';

ALTER TABLE "ExtraService"
ADD COLUMN "priceCop" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "baseCurrency" TEXT NOT NULL DEFAULT 'COP';

UPDATE "ExtraService"
SET "priceCop" = "price",
    "baseCurrency" = 'COP'
WHERE "priceCop" = 0;
