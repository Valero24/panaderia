-- Internal invoices are always fiscal/operational COP documents. Display
-- currency is stored only as an informational reference.

ALTER TABLE "Invoice"
ALTER COLUMN "currency" SET DEFAULT 'COP';

ALTER TABLE "Invoice"
ADD COLUMN "subtotalCop" DOUBLE PRECISION,
ADD COLUMN "taxCop" DOUBLE PRECISION,
ADD COLUMN "discountCop" DOUBLE PRECISION,
ADD COLUMN "totalCop" DOUBLE PRECISION,
ADD COLUMN "displayCurrency" TEXT NOT NULL DEFAULT 'COP',
ADD COLUMN "displayTotal" DOUBLE PRECISION,
ADD COLUMN "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN "exchangeRateSource" TEXT NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN "exchangeRateDate" TIMESTAMP(3);

UPDATE "Invoice"
SET
  "currency" = 'COP',
  "subtotalCop" = COALESCE("subtotal", 0),
  "taxCop" = COALESCE("taxes", 0),
  "discountCop" = COALESCE("discounts", 0),
  "totalCop" = COALESCE("total", 0),
  "displayCurrency" = 'COP',
  "displayTotal" = COALESCE("total", 0),
  "exchangeRate" = 1,
  "exchangeRateSource" = 'LEGACY_COP',
  "exchangeRateDate" = NOW()
WHERE "totalCop" IS NULL;
