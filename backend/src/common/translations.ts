import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

export type DynamicTranslations = Record<string, Record<string, Prisma.InputJsonValue>>;
export type DynamicTranslationsMeta = Record<
  string,
  {
    manual?: boolean;
    updatedAt?: string;
  }
>;

const allowedLanguages = new Set(["en", "fr", "pt", "it"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function cleanText(value: string) {
  return value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = cleanText(value);
    return trimmed ? trimmed : undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => normalizeJsonValue(item))
      .filter((item): item is Prisma.InputJsonValue => item !== undefined);

    return normalized.length > 0 ? normalized : undefined;
  }

  if (isPlainObject(value)) {
    const normalized: Record<string, Prisma.InputJsonValue> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      const normalizedValue = normalizeJsonValue(nestedValue);

      if (normalizedValue !== undefined) {
        normalized[key] = normalizedValue;
      }
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
  }

  return undefined;
}

export function normalizeTranslations(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return Prisma.JsonNull;
  }

  if (!isPlainObject(value)) {
    throw new BadRequestException("Formato de traducciones invalido");
  }

  const normalized: DynamicTranslations = {};

  for (const [language, fields] of Object.entries(value)) {
    if (!allowedLanguages.has(language)) {
      continue;
    }

    if (!isPlainObject(fields)) {
      throw new BadRequestException(
        `Traducciones invalidas para idioma ${language}`
      );
    }

    const translatedFields: Record<string, Prisma.InputJsonValue> = {};

    for (const [field, text] of Object.entries(fields)) {
      const normalizedValue = normalizeJsonValue(text);

      if (normalizedValue !== undefined) {
        translatedFields[field] = normalizedValue;
      }
    }

    if (Object.keys(translatedFields).length > 0) {
      normalized[language] = translatedFields;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : Prisma.JsonNull;
}

export function normalizeTranslationsMeta(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return Prisma.JsonNull;

  if (!isPlainObject(value)) {
    throw new BadRequestException("Formato de metadata de traducciones invalido");
  }

  const normalized: DynamicTranslationsMeta = {};

  for (const [language, meta] of Object.entries(value)) {
    if (!allowedLanguages.has(language) || !isPlainObject(meta)) {
      continue;
    }

    normalized[language] = {
      manual: Boolean(meta.manual),
      updatedAt:
        typeof meta.updatedAt === "string" && meta.updatedAt.trim()
          ? meta.updatedAt.trim()
          : undefined,
    };
  }

  return Object.keys(normalized).length > 0 ? normalized : Prisma.JsonNull;
}

export function markManualTranslationLocales(
  manualTranslations: unknown,
  existingMeta?: unknown
) {
  const base = isPlainObject(existingMeta) ? { ...existingMeta } : {};
  const now = new Date().toISOString();

  if (!isPlainObject(manualTranslations)) {
    return normalizeTranslationsMeta(base);
  }

  for (const [language, fields] of Object.entries(manualTranslations)) {
    if (!allowedLanguages.has(language) || !isPlainObject(fields)) {
      continue;
    }

    const hasManualContent = Object.values(fields).some(
      (value) => normalizeJsonValue(value) !== undefined
    );

    if (hasManualContent) {
      base[language] = {
        ...(isPlainObject(base[language]) ? base[language] : {}),
        manual: true,
        updatedAt: now,
      };
    }
  }

  return normalizeTranslationsMeta(base);
}
