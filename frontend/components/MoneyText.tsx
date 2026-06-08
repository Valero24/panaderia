"use client";

import { useTranslation } from "@/context/LanguageContext";
import { formatMoneyByLanguage } from "@/lib/currency";
import { cn } from "@/lib/utils";

type MoneyTextProps = {
  value?: number | null;
  className?: string;
};

export default function MoneyText({ value, className }: MoneyTextProps) {
  const { language } = useTranslation();

  return (
    <span className={cn("inline-block min-w-[7.5rem] tabular-nums", className)}>
      {formatMoneyByLanguage(value, language)}
    </span>
  );
}
