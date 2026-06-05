"use client";

import { useTranslation } from "@/context/LanguageContext";
import { getDynamicText, type TranslatableEntity } from "@/lib/dynamic-translations";

type TranslatedDynamicTextProps = {
  entity?: TranslatableEntity | null;
  field: string;
  fallback?: unknown;
};

export default function TranslatedDynamicText({
  entity,
  field,
  fallback,
}: TranslatedDynamicTextProps) {
  const { language } = useTranslation();

  return <>{getDynamicText(entity, field, language, fallback)}</>;
}
