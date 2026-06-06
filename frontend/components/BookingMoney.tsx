"use client";

import type { Language } from "@/i18n";
import {
  convertFromCOP,
  getCurrencyByLanguage,
  type DisplayCurrency,
} from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/context/LanguageContext";

type BookingMoneyProps = {
  value?: number | null;
  language?: Language;
  className?: string;
  prefixClassName?: string;
  amountClassName?: string;
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

function formatBookingAmount(
  amountCop: number | null | undefined,
  language: Language,
  currency: DisplayCurrency
) {
  const value = convertFromCOP(amountCop, currency);

  return new Intl.NumberFormat(localeByLanguage[language] || "es-CO", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: currency === "COP" ? 0 : 2,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(Number(value || 0));
}

export default function BookingMoney({
  value,
  language,
  className,
  prefixClassName,
  amountClassName,
}: BookingMoneyProps) {
  const { language: contextLanguage } = useTranslation();
  const activeLanguage = language || contextLanguage;
  const currency = getCurrencyByLanguage(activeLanguage);
  const isApproximate = currency !== "COP";
  const amount = formatBookingAmount(value, activeLanguage, currency);

  return (
    <span
      className={cn(
        "inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5 leading-tight",
        className
      )}
    >
      {isApproximate && (
        <span className={cn("shrink-0 text-current", prefixClassName)}>
          {approximateLabelByLanguage[activeLanguage] || "Approx."}
        </span>
      )}
      <span className={cn("min-w-0 break-words text-current", amountClassName)}>
        {amount}
      </span>
    </span>
  );
}
