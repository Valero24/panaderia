-- Store the monetary snapshot used at checkout. COP remains the operational,
-- accounting and fiscal base; display currency is informational only.

ALTER TABLE "PreReservation"
ADD COLUMN "baseCurrency" TEXT NOT NULL DEFAULT 'COP',
ADD COLUMN "displayCurrency" TEXT NOT NULL DEFAULT 'COP',
ADD COLUMN "subtotalCop" DOUBLE PRECISION,
ADD COLUMN "taxCop" DOUBLE PRECISION,
ADD COLUMN "discountCop" DOUBLE PRECISION,
ADD COLUMN "totalCop" DOUBLE PRECISION,
ADD COLUMN "displaySubtotal" DOUBLE PRECISION,
ADD COLUMN "displayTotal" DOUBLE PRECISION,
ADD COLUMN "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN "exchangeRateSource" TEXT NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN "exchangeRateDate" TIMESTAMP(3),
ADD COLUMN "currencyNote" TEXT;

UPDATE "PreReservation"
SET
  "baseCurrency" = 'COP',
  "displayCurrency" = 'COP',
  "subtotalCop" = GREATEST(
    COALESCE("finalTotal", "totalEstimate", "totalPrice", 0)
      - COALESCE("taxesAmount", 0)
      + COALESCE("discountAmount", 0),
    0
  ),
  "taxCop" = COALESCE("taxesAmount", 0),
  "discountCop" = COALESCE("discountAmount", 0),
  "totalCop" = COALESCE("finalTotal", "totalEstimate", "totalPrice", 0),
  "displaySubtotal" = GREATEST(
    COALESCE("finalTotal", "totalEstimate", "totalPrice", 0)
      - COALESCE("taxesAmount", 0)
      + COALESCE("discountAmount", 0),
    0
  ),
  "displayTotal" = COALESCE("finalTotal", "totalEstimate", "totalPrice", 0),
  "exchangeRate" = 1,
  "exchangeRateSource" = 'LEGACY_COP',
  "exchangeRateDate" = NOW(),
  "currencyNote" = 'Registro histórico normalizado a COP.'
WHERE "totalCop" IS NULL;
