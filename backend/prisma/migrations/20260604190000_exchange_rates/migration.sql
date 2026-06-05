CREATE TABLE "ExchangeRate" (
  "id" TEXT NOT NULL,
  "fromCurrency" TEXT NOT NULL,
  "toCurrency" TEXT NOT NULL,
  "rate" DECIMAL(18,6) NOT NULL,
  "source" TEXT NOT NULL,
  "rateDate" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExchangeRate_fromCurrency_toCurrency_isActive_idx"
ON "ExchangeRate"("fromCurrency", "toCurrency", "isActive");

CREATE INDEX "ExchangeRate_rateDate_idx"
ON "ExchangeRate"("rateDate");

CREATE INDEX "ExchangeRate_createdAt_idx"
ON "ExchangeRate"("createdAt");

INSERT INTO "ExchangeRate" (
  "id",
  "fromCurrency",
  "toCurrency",
  "rate",
  "source",
  "rateDate",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES
  ('demo_usd_cop_20260604', 'USD', 'COP', 4000.000000, 'MANUAL', NOW(), true, NOW(), NOW()),
  ('demo_eur_cop_20260604', 'EUR', 'COP', 4300.000000, 'MANUAL', NOW(), true, NOW(), NOW()),
  ('demo_brl_cop_20260604', 'BRL', 'COP', 780.000000, 'MANUAL', NOW(), true, NOW(), NOW())
ON CONFLICT ("id") DO NOTHING;
