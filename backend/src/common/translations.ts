import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

export type DynamicTranslations = Record<string, Record<string, string>>;

const allowedLanguages = new Set(["en", "fr", "pt", "it"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
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

    const translatedFields: Record<string, string> = {};

    for (const [field, text] of Object.entries(fields)) {
      if (typeof text !== "string") {
        continue;
      }

      const trimmed = text.trim();

      if (trimmed) {
        translatedFields[field] = trimmed;
      }
    }

    if (Object.keys(translatedFields).length > 0) {
      normalized[language] = translatedFields;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : Prisma.JsonNull;
}
