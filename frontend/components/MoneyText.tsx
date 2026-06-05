"use client";

import { useTranslation } from "@/context/LanguageContext";
import { formatMoneyByLanguage } from "@/lib/currency";

type MoneyTextProps = {
  value?: number | null;
};

export default function MoneyText({ value }: MoneyTextProps) {
  const { language } = useTranslation();

  return <>{formatMoneyByLanguage(value, language)}</>;
}
