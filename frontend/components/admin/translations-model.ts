export const translationLanguages = ["en", "fr", "pt", "it"] as const;

export type TranslationLanguage = (typeof translationLanguages)[number];

export type TranslationValues = Record<string, string>;

export type TranslationMap = Partial<Record<TranslationLanguage, TranslationValues>>;

export type TranslationField = {
  key: string;
  label: string;
  type?: "input" | "textarea";
  baseValue?: string | null;
};

export const languageLabels: Record<TranslationLanguage, string> = {
  en: "English",
  fr: "Francés",
  pt: "Portugués",
  it: "Italiano",
};

export function normalizeTranslations(value: unknown): TranslationMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const source = value as Record<string, unknown>;
  const result: TranslationMap = {};

  for (const language of translationLanguages) {
    const languageValue = source[language];
    if (!languageValue || typeof languageValue !== "object" || Array.isArray(languageValue)) {
      continue;
    }

    const fields: TranslationValues = {};
    for (const [key, fieldValue] of Object.entries(languageValue as Record<string, unknown>)) {
      if (fieldValue === null || fieldValue === undefined) continue;
      const text = String(fieldValue).trim();
      if (text) {
        fields[key] = text;
      }
    }

    if (Object.keys(fields).length > 0) {
      result[language] = fields;
    }
  }

  return result;
}

export function updateTranslationField(
  translations: TranslationMap,
  language: TranslationLanguage,
  key: string,
  value: string
): TranslationMap {
  const next: TranslationMap = {
    ...translations,
    [language]: {
      ...(translations[language] || {}),
      [key]: value,
    },
  };

  return normalizeTranslations(next);
}
