ALTER TABLE "CompanySettings"
ADD COLUMN "baseCurrency" TEXT NOT NULL DEFAULT 'COP',
ADD COLUMN "enabledDisplayCurrencies" TEXT[] NOT NULL DEFAULT ARRAY['COP', 'USD', 'EUR', 'BRL']::TEXT[],
ADD COLUMN "defaultDisplayCurrency" TEXT NOT NULL DEFAULT 'COP',
ADD COLUMN "exchangeRateMode" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "exchangeRateSource" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "exchangeRateDate" TIMESTAMP(3),
ADD COLUMN "currencyConversionEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "exchangeRatesFromCOP" JSONB NOT NULL DEFAULT '{"COP":1,"USD":0.00025,"EUR":0.00023,"BRL":0.0014}';

UPDATE "CompanySettings"
SET
  "baseCurrency" = 'COP',
  "defaultCurrency" = 'COP',
  "defaultDisplayCurrency" = COALESCE(NULLIF("defaultCurrency", ''), 'COP'),
  "exchangeRateDate" = COALESCE("exchangeRateDate", NOW())
WHERE "id" = 1;
