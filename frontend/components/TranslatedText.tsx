"use client";

import { TranslationKey } from "@/i18n";
import { useTranslation } from "@/context/LanguageContext";

export default function TranslatedText({
  k,
}: {
  k: TranslationKey;
}) {
  const { t } = useTranslation();

  return <>{t(k)}</>;
}
