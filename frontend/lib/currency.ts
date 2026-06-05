import type { Language } from "@/i18n";

export type DisplayCurrency = "COP" | "USD" | "EUR" | "BRL";

const currencyByLanguage: Record<Language, DisplayCurrency> = {
  es: "COP",
  en: "USD",
  fr: "EUR",
  pt: "BRL",
  it: "EUR",
};

const exchangeRatesFromCOP: Record<DisplayCurrency, number> = {
  COP: 1,
  USD: 0.00025,
  EUR: 0.00023,
  BRL: 0.0014,
};

const approximateLabelByLanguage: Record<Language, string> = {
  es: "Aprox.",
  en: "Approx.",
  fr: "Env.",
  pt: "Aprox.",
  it: "Circa",
};

const localeByLanguage: Record<Language, string> = {
  es: "es-CO",
  en: "en-US",
  fr: "fr-FR",
  pt: "pt-BR",
  it: "it-IT",
};

export function getCurrencyByLanguage(language: Language): DisplayCurrency {
  return currencyByLanguage[language] || "COP";
}

export function getExchangeRateFromCOP(currency: DisplayCurrency): number {
  return exchangeRatesFromCOP[currency] || 1;
}

export function convertFromCOP(
  valueInCOP?: number | null,
  currency: DisplayCurrency = "COP"
) {
  return Number(valueInCOP || 0) * getExchangeRateFromCOP(currency);
}

export function formatCopMoney(valueInCOP?: number | null) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(Number(valueInCOP || 0));
}

export function formatDisplayMoney(
  value?: number | null,
  currency: DisplayCurrency = "COP",
  language: Language = "es"
) {
  return new Intl.NumberFormat(localeByLanguage[language] || "es-CO", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(Number(value || 0));
}

export function isApproximateCurrency(language: Language) {
  return getCurrencyByLanguage(language) !== "COP";
}

export function formatMoneyByLanguage(
  valueInCOP?: number | null,
  language: Language = "es"
) {
  const currency = getCurrencyByLanguage(language);
  const value = convertFromCOP(valueInCOP, currency);
  const formatted = formatDisplayMoney(value, currency, language);

  if (currency === "COP") {
    return formatted;
  }

  return `${approximateLabelByLanguage[language] || "Approx."} ${formatted}`;
}
