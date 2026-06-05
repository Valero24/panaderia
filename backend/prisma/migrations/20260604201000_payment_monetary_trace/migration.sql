-- Payment monetary traceability. COP is the operational and fiscal currency;
-- display values are informational snapshots only.

ALTER TABLE "Payment"
ALTER COLUMN "currency" SET DEFAULT 'COP',
ALTER COLUMN "provider" SET DEFAULT 'MANUAL';

ALTER TABLE "Payment"
ADD COLUMN "amountCop" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "displayCurrency" TEXT NOT NULL DEFAULT 'COP',
ADD COLUMN "displayAmount" DOUBLE PRECISION,
ADD COLUMN "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN "exchangeRateSource" TEXT NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN "exchangeRateDate" TIMESTAMP(3),
ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "paymentProvider" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "providerTransactionId" TEXT,
ADD COLUMN "providerReference" TEXT,
ADD COLUMN "providerStatus" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "rawProviderResponse" JSONB;

UPDATE "Payment"
SET
  "amountCop" = "amount",
  "currency" = 'COP',
  "displayCurrency" = 'COP',
  "displayAmount" = "amount",
  "exchangeRate" = 1,
  "exchangeRateSource" = 'LEGACY_COP',
  "exchangeRateDate" = NOW(),
  "paymentMethod" =
    CASE
      WHEN "provider" = 'WOMPI' THEN 'CARD'
      WHEN "provider" = 'STRIPE' THEN 'CARD'
      ELSE 'MANUAL'
    END,
  "paymentProvider" =
    CASE
      WHEN "provider" IS NULL OR "provider" = '' THEN 'MANUAL'
      ELSE "provider"
    END,
  "providerTransactionId" = COALESCE("wompiTransactionId", "stripePaymentIntentId"),
  "providerReference" = COALESCE("wompiReference", "wompiPaymentLinkId"),
  "providerStatus" = "status"::TEXT,
  "paidAt" =
    CASE
      WHEN "status" IN ('APPROVED', 'PAID') THEN "updatedAt"
      ELSE NULL
    END
WHERE "amountCop" = 0;
