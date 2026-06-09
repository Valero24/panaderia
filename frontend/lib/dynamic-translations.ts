import type { Language } from "@/i18n";
import { cleanPublicCopy } from "@/lib/public-copy";

export type DynamicTranslations = Partial<
  Record<Language, Record<string, unknown>>
>;

export type TranslatableEntity = {
  translations?: DynamicTranslations | null;
  translatedSlugs?: Partial<Record<Language, string | null>> | null;
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

function translatedTextOrEmpty(value: unknown) {
  const text = toSafeText(value);
  return text.includes("[object Object]") ? "" : text;
}

function hasUsableValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === "string") {
    return toSafeText(value).trim().length > 0;
  }

  if (typeof value === "number") {
    return true;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return false;

    return value.some((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return toSafeText(item).trim().length > 0;
      }

      if (item && typeof item === "object") {
        return Object.values(item).some(hasUsableValue);
      }

      return false;
    });
  }

  if (typeof value === "object") {
    return Object.values(value).some(hasUsableValue);
  }

  return false;
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
    if (hasUsableValue(translated)) {
      const translatedText = toSafeText(translated);
      if (translatedText.trim()) {
        return translatedText;
      }
    }
  }

  return toSafeText(baseValue);
}

export function getDynamicValue(
  entity: TranslatableEntity | null | undefined,
  field: string,
  language: Language,
  fallback?: unknown
) {
  const baseValue = fallback ?? entity?.[field];

  if (language !== "es") {
    const translated = entity?.translations?.[language]?.[field];
    if (hasUsableValue(translated)) {
      return translated;
    }
  }

  return baseValue;
}

export function getTranslatedField(
  entity: TranslatableEntity | null | undefined,
  field: string,
  language: Language,
  fallback?: unknown
) {
  const baseValue = fallback ?? entity?.[field];

  if (language !== "es") {
    const translated = entity?.translations?.[language]?.[field];

    if (hasUsableValue(translated)) {
      const translatedText = translatedTextOrEmpty(translated);
      if (translatedText.trim()) {
        return translatedText;
      }
    }
  }

  return translatedTextOrEmpty(baseValue);
}

export function hasDynamicText(
  entity: TranslatableEntity | null | undefined,
  field: string,
  language: Language,
  fallback?: unknown
) {
  return getDynamicText(entity, field, language, fallback).trim().length > 0;
}

export function getLocalizedSlug(
  entity: TranslatableEntity | null | undefined,
  language: Language,
  fallback?: unknown
) {
  const translatedSlugFromMap = entity?.translatedSlugs?.[language]?.trim();
  const translatedSlugFromTranslations = getDynamicValue(
    entity,
    "slug",
    language,
    fallback ?? entity?.slug
  );
  const translatedSlug =
    translatedSlugFromMap ||
    (typeof translatedSlugFromTranslations === "string"
      ? translatedSlugFromTranslations.trim()
      : "");
  const baseSlug =
    typeof (fallback ?? entity?.slug) === "string"
      ? String(fallback ?? entity?.slug).trim()
      : "";

  return translatedSlug || baseSlug;
}
