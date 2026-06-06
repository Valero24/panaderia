import type { Language } from "@/i18n";
import { cleanPublicCopy } from "@/lib/public-copy";

export type DynamicTranslations = Partial<
  Record<Language, Record<string, unknown>>
>;

export type TranslatableEntity = {
  translations?: DynamicTranslations | null;
  [key: string]: unknown;
};

export function getDynamicText(
  entity: TranslatableEntity | null | undefined,
  field: string,
  language: Language,
  fallback?: unknown
) {
  const baseValue = fallback ?? entity?.[field];

  if (language !== "es") {
    const translated = entity?.translations?.[language]?.[field];
    if (translated !== null && translated !== undefined) {
      const translatedText = cleanPublicCopy(String(translated));
      if (translatedText.trim()) {
        return translatedText;
      }
    }
  }

  if (baseValue === null || baseValue === undefined) {
    return "";
  }

  return cleanPublicCopy(String(baseValue));
}

export function getTranslatedField(
  entity: TranslatableEntity | null | undefined,
  field: string,
  language: Language,
  fallback?: unknown
) {
  return getDynamicText(entity, field, language, fallback);
}

export function hasDynamicText(
  entity: TranslatableEntity | null | undefined,
  field: string,
  language: Language,
  fallback?: unknown
) {
  return getDynamicText(entity, field, language, fallback).trim().length > 0;
}
