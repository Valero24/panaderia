import { es } from "./es";
import { en } from "./en";
import { fr } from "./fr";
import { pt } from "./pt";
import { it } from "./it";

export type Language = "es" | "en" | "fr" | "pt" | "it";
type SpanishDictionary = typeof es;
export type TranslationKey = keyof SpanishDictionary;
export type TranslationDictionary = Record<TranslationKey, string>;

export const languages: {
  code: Language;
  label: string;
  name: string;
}[] = [
  { code: "es", label: "Español", name: "Español" },
  { code: "en", label: "English", name: "English" },
  { code: "fr", label: "Français", name: "Français" },
  { code: "pt", label: "Português", name: "Português" },
  { code: "it", label: "Italiano", name: "Italiano" },
];

export const dictionaries: Record<
  Language,
  Partial<TranslationDictionary>
> = {
  es,
  en,
  fr,
  pt,
  it,
};

export function translate(
  language: Language,
  key: TranslationKey | string
) {
  const dictionary = dictionaries[language] || es;

  return (
    dictionary[key as TranslationKey] ||
    es[key as TranslationKey] ||
    ""
  );
}
