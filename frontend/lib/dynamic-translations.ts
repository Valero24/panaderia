import type { Language } from "@/i18n";
import { cleanPublicCopy } from "@/lib/public-copy";

export type DynamicTranslations = Partial<
  Record<Language, Record<string, unknown>>
>;

export type TranslatableEntity = {
  translations?: DynamicTranslations | null;
  [key: string]: unknown;
};

function toSafeText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string" || typeof value === "number") {
    return cleanPublicCopy(String(value));
  }

  if (Array.isArray(value)) {
    return cleanPublicCopy(
      value
        .filter((item) => typeof item === "string" || typeof item === "number")
        .map((item) => String(item))
        .join("\n")
    );
  }

  return "";
}

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
      const translatedText = toSafeText(translated);
      if (translatedText.trim()) {
        return translatedText;
      }
    }
  }

  return toSafeText(baseValue);
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
